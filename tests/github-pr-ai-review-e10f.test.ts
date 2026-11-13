import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AI_REVIEW_COMMENT_MARKER,
  AI_REVIEW_COMMENT_MAX_CHARS,
  AI_REVIEW_SCHEMA,
  aiReviewCommentV1,
  describeRemoteRefusalV1,
  publishPrAiReviewV1,
  readAiReviewArtifactV1,
  runPrAiPublishMainV1,
  runPrAiReviewMainV1,
  runPrAiReviewV1,
  type AiReviewArtifactV1,
  type PrAiReviewInputV1,
} from "../src/github/pr-ai-review.js";
import { CliUsageError, parseCliArgs, runCli } from "../src/cli.js";

vi.setConfig({ testTimeout: 180_000 });

// E10f: AI review in pull requests, optional and advisory. Job 1 decides trust from GitHub's API
// and sends nothing for an untrusted PR; job 2 validates the artifact and only ever comments. The
// GitHub API, DNS, the payload scan, and the network are recorders here; nothing connects anywhere.
const KEY = "sk-e10f-test-key";
const roots: string[] = [];
const originalCwd = process.cwd();
afterEach(() => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function temp(prefix: string): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  roots.push(dir);
  return dir;
}

/** A checkout as the AI job prepares it: HEAD at the merge base, the working tree at the PR head. */
function checkout(): { root: string; head: string } {
  const root = temp("ascout-e10f-");
  const git = (args: string[]) => execFileSync("git", args, { cwd: root, windowsHide: true, encoding: "utf8" }).trim();
  git(["init", "-q"]);
  git(["config", "user.name", "Ascout Test"]);
  git(["config", "user.email", "ascout@example.invalid"]);
  git(["config", "commit.gpgSign", "false"]);
  git(["config", "core.autocrlf", "false"]);
  writeFileSync(join(root, "a.ts"), "export const a = 1;\nexport const b = 2;\n");
  git(["add", "--all"]);
  git(["commit", "-q", "-m", "base"]);
  const base = git(["rev-parse", "HEAD"]);
  writeFileSync(join(root, "a.ts"), "export const a = 1;\nexport const b = 20;\n");
  git(["commit", "-q", "-am", "pr"]);
  const head = git(["rev-parse", "HEAD"]);
  git(["reset", "-q", "--soft", base]);
  return { root, head };
}

interface Api { calls: { method: string; url: string; body: unknown }[]; fetch: typeof fetch }

function api(pull: Record<string, unknown>, comments: { id: number; user: { login: string } | null; body: string | null }[][] = [[]], failGet = false, huge = false): Api {
  const calls: Api["calls"] = [];
  let page = 0;
  const fetchImpl = (async (url: string, init: { method: string; body?: string }) => {
    calls.push({ method: init.method, url, body: init.body === undefined ? undefined : JSON.parse(init.body) });
    if (failGet) return new Response("nope", { status: 500 });
    if (huge) return new Response("x".repeat(4 * 1024 * 1024 + 1), { status: 200 });
    if (url.includes("/comments?")) return new Response(JSON.stringify(comments[page++] ?? []), { status: 200 });
    if (init.method === "GET") return new Response(JSON.stringify(pull), { status: 200 });
    return new Response(init.method === "POST" ? JSON.stringify({ id: 9 }) : "", { status: 200 });
  }) as unknown as typeof fetch;
  return { calls, fetch: fetchImpl };
}

const pull = (head: string, overrides: Record<string, unknown> = {}) => ({
  number: 7, state: "open", user: { login: "TheHalfMoon" }, base: { ref: "main" }, head: { sha: head, repo: { full_name: "o/r" } }, ...overrides,
});

function input(root: string, head: string, overrides: Partial<PrAiReviewInputV1> = {}, deps: Partial<PrAiReviewInputV1["deps"]> = {}): { input: PrAiReviewInputV1; sent: unknown[] } {
  const sent: unknown[] = [];
  return {
    sent,
    input: {
      repository: "o/r", prNumber: 7, headSha: head, headRepository: "o/r", requiredBase: "main",
      triggeringActor: "TheHalfMoon", trustedActors: ["TheHalfMoon"], token: "ghs_read", apiUrl: "https://api.github.com", root,
      endpoint: "https://api.example-provider.com/v1", model: "m", modelFamily: "example", credential: KEY, gitleaksPath: null,
      ...overrides,
      deps: {
        fetch: api(pull(head)).fetch,
        scan: async () => ({ kind: "clean" }),
        resolve: async () => [{ address: "93.184.216.34", family: 4 }],
        transport: async (exchange) => {
          sent.push(exchange);
          return { status: 200, text: JSON.stringify({ choices: [{ message: { content: JSON.stringify({ findings: [{ path: "a.ts", start_line: 2, severity: "major", category: "bug", message: "b changed" }] }) } }] }) };
        },
        ...deps,
      },
    },
  };
}

describe("job 1: pr-ai-review", () => {
  it("reviews a trusted maintainer's PR: findings on changed lines, the key sent only to the provider", async () => {
    const { root, head } = checkout();
    const { input: run, sent } = input(root, head);
    const result = await runPrAiReviewV1(run);
    expect(result.kind).toBe("artifact");
    const artifact = (result as { artifact: AiReviewArtifactV1 }).artifact;
    expect(artifact).toMatchObject({ schema: AI_REVIEW_SCHEMA, head_sha: head, pr: 7, outcome: "FINDINGS", advisory: true, satisfies_human_r1: false, host: "api.example-provider.com" });
    expect(artifact.findings).toEqual([{ path: "a.ts", start_line: 2, end_line: 2, severity: "major", category: "bug", message: "b changed" }]);
    expect(artifact.payload_sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect((sent[0] as { headers: Record<string, string> }).headers.authorization).toBe(`Bearer ${KEY}`);
    expect(JSON.stringify(artifact)).not.toContain(KEY);
  });

  it("keeps no host history: nothing is read from or written to the current folder, the PR's checkout", async () => {
    const { root, head } = checkout();
    const cwd = temp("ascout-e10f-cwd-");
    process.chdir(cwd);
    writeFileSync(join(cwd, "review-remote-history.json"), JSON.stringify({ planted: "evil.example" }));
    expect((await runPrAiReviewV1(input(root, head).input)).kind).toBe("artifact");
    expect(JSON.parse(readFileSync(join(cwd, "review-remote-history.json"), "utf8"))).toEqual({ planted: "evil.example" });
    rmSync(join(cwd, "review-remote-history.json"));
    await runPrAiReviewV1(input(root, head).input);
    expect(existsSync(join(cwd, "review-remote-history.json"))).toBe(false);
  });

  it.each([
    ["a fork", { headRepository: "fork/r" }, {}],
    ["a PR whose head repository differs", {}, { head: { sha: "", repo: { full_name: "fork/r" } } }],
    ["another base", {}, { base: { ref: "release" } }],
    ["an untrusted triggering actor", { triggeringActor: "stranger" }, {}],
    ["an untrusted author", {}, { user: { login: "stranger" } }],
    ["a bot author", { trustedActors: ["TheHalfMoon", "dependabot[bot]"] }, { user: { login: "dependabot[bot]" } }],
    ["no author", {}, { user: null }],
  ])("sends nothing for %s", async (_label, overrides, pullOverrides) => {
    const { root, head } = checkout();
    const p = pull(head, pullOverrides as Record<string, unknown>);
    if ((p.head as { sha: string }).sha === "") (p.head as { sha: string }).sha = head;
    const { input: run, sent } = input(root, head, overrides, { fetch: api(p).fetch });
    const result = await runPrAiReviewV1(run);
    expect(result).toMatchObject({ kind: "artifact", artifact: { outcome: "NOT_RUN", findings: [] } });
    expect(sent).toEqual([]);
  });

  it("sends nothing for a closed PR, reports a moved head as stale, and an API failure as an error", async () => {
    const { root, head } = checkout();
    expect(await runPrAiReviewV1(input(root, head, {}, { fetch: api(pull(head, { state: "closed" })).fetch }).input)).toMatchObject({ artifact: { outcome: "NOT_RUN" } });
    expect(await runPrAiReviewV1(input(root, head, {}, { fetch: api(pull("b".repeat(40))).fetch }).input)).toEqual({ kind: "stale", current_head: "b".repeat(40) });
    expect(await runPrAiReviewV1(input(root, head, {}, { fetch: api(pull(head), [[]], true).fetch }).input)).toMatchObject({ kind: "error" });
  });

  it.each([
    ["a head that isn't a commit ID", { headSha: "nope" }],
    ["a bad model name", { model: "bad model" }],
    ["a bad model family", { modelFamily: "" }],
    ["an http endpoint", { endpoint: "http://api.example.com/v1" }],
  ])("refuses %s as an error", async (_label, overrides) => {
    const { root, head } = checkout();
    expect(await runPrAiReviewV1(input(root, head, overrides).input)).toMatchObject({ kind: "error" });
  });

  it("reports NOT_RUN without the key, and an error when the checkout isn't the PR head", async () => {
    const { root, head } = checkout();
    expect(await runPrAiReviewV1(input(root, head, { credential: "" }).input)).toMatchObject({ artifact: { outcome: "NOT_RUN" } });
    writeFileSync(join(root, "a.ts"), "tampered\n");
    expect(await runPrAiReviewV1(input(root, head).input)).toMatchObject({ kind: "error", message: expect.stringContaining("does not hold exactly") });
  });

  it("passes on every remote refusal as NOT_RUN, and reports NO_FINDINGS", async () => {
    const { root, head } = checkout();
    expect(await runPrAiReviewV1(input(root, head, {}, { scan: async () => ({ kind: "hits", files: ["a.ts"] }) }).input)).toMatchObject({ artifact: { outcome: "NOT_RUN", reason: expect.stringContaining("a.ts") } });
    const none = { status: 200, text: JSON.stringify({ choices: [{ message: { content: "{\"findings\":[]}" } }] }) };
    expect(await runPrAiReviewV1(input(root, head, {}, { transport: async () => none }).input)).toMatchObject({ artifact: { outcome: "NO_FINDINGS", findings: [] } });
  });
});

const valid = (head: string, overrides: Record<string, unknown> = {}) => ({
  schema: AI_REVIEW_SCHEMA, head_sha: head, pr: 7, outcome: "FINDINGS", reason: "r", model: "m", model_family: "f", host: "api.example.com",
  payload_sha256: "a".repeat(64), advisory: true, satisfies_human_r1: false,
  findings: [{ path: "a.ts", start_line: 2, end_line: 2, severity: "major", category: "bug", message: "b changed" }], ...overrides,
});

function artifactFile(body: unknown): string {
  const path = join(temp("ascout-e10f-art-"), "ascout-ai-review.json");
  writeFileSync(path, typeof body === "string" ? body : JSON.stringify(body));
  return path;
}

describe("job 1 edges", () => {
  it("refuses an oversized GitHub reply, and passes a cancellation signal through", async () => {
    const { root, head } = checkout();
    expect(await runPrAiReviewV1(input(root, head, {}, { fetch: api(pull(head), [[]], false, true).fetch }).input)).toMatchObject({ kind: "error", message: expect.stringContaining("too large") });
    expect(await runPrAiReviewV1(input(root, head, { signal: new AbortController().signal }).input)).toMatchObject({ kind: "artifact" });
  });

  it("describes every kind of remote refusal", () => {
    expect(describeRemoteRefusalV1({ kind: "not_run", reason: "no terminal" })).toBe("no terminal");
    expect(describeRemoteRefusalV1({ kind: "error", message: "bad config" })).toBe("bad config");
    expect(describeRemoteRefusalV1({ kind: "dry_run" })).toBe("remote review did not run (dry_run)");
  });
});

describe("the artifact reader", () => {
  const head = "c".repeat(40);
  it("accepts a valid artifact", () => {
    expect(readAiReviewArtifactV1(artifactFile(valid(head)), head)).toMatchObject({ outcome: "FINDINGS" });
    expect(readAiReviewArtifactV1(artifactFile(valid(head, { outcome: "NOT_RUN", findings: [], payload_sha256: null })), head)).toMatchObject({ outcome: "NOT_RUN" });
  });

  it.each([
    ["another commit", valid("d".repeat(40))],
    ["an unknown key", valid(head, { verdict: "pass" })],
    ["the wrong schema", valid(head, { schema: "x" })],
    ["no PR number", valid(head, { pr: 0 })],
    ["an unknown outcome", valid(head, { outcome: "PASS" })],
    ["a long reason", valid(head, { reason: "x".repeat(501) })],
    ["a bad model", valid(head, { model: "bad model" })],
    ["a bad host", valid(head, { host: "Evil Host" })],
    ["a bad payload digest", valid(head, { payload_sha256: "x" })],
    ["a claim of human review", valid(head, { satisfies_human_r1: true })],
    ["no advisory flag", valid(head, { advisory: false })],
    ["findings that aren't a list", valid(head, { findings: {} })],
    ["too many findings", valid(head, { findings: Array.from({ length: 201 }, () => valid(head).findings[0]) })],
    ["findings under NO_FINDINGS", valid(head, { outcome: "NO_FINDINGS" })],
    ["a finding that isn't an object", valid(head, { findings: ["x"] })],
    ["an unknown finding key", valid(head, { findings: [{ ...valid(head).findings[0], approve: true }] })],
    ["a .. path", valid(head, { findings: [{ ...valid(head).findings[0], path: "../a.ts" }] })],
    ["an absolute path", valid(head, { findings: [{ ...valid(head).findings[0], path: "/etc/passwd" }] })],
    ["lines in the wrong order", valid(head, { findings: [{ ...valid(head).findings[0], start_line: 3, end_line: 2 }] })],
    ["an unknown severity", valid(head, { findings: [{ ...valid(head).findings[0], severity: "blocker" }] })],
    ["a bad category", valid(head, { findings: [{ ...valid(head).findings[0], category: "Bad Category" }] })],
    ["an empty message", valid(head, { findings: [{ ...valid(head).findings[0], message: "" }] })],
    ["invalid JSON", "{nope"],
    ["a JSON array", "[]"],
    ["an oversized file", `{"pad":"${"x".repeat(1024 * 1024)}"}`],
  ])("refuses %s", (_label, body) => {
    expect(() => readAiReviewArtifactV1(artifactFile(body), head)).toThrow();
  });

  it("refuses a folder in place of the artifact", () => {
    const dir = join(temp("ascout-e10f-dir-"), "ascout-ai-review.json");
    mkdirSync(dir);
    expect(() => readAiReviewArtifactV1(dir, head)).toThrow("not a regular file");
  });
});

describe("the advisory comment", () => {
  it("says it is advisory, never human review, and can't change the check", () => {
    const body = aiReviewCommentV1(valid("c".repeat(40)) as unknown as AiReviewArtifactV1);
    expect(body.startsWith(AI_REVIEW_COMMENT_MARKER)).toBe(true);
    expect(body).toContain("advisory");
    expect(body).toContain("not a human review");
    expect(body).toContain("never changes the **Ascout verification** check");
  });

  it("has no findings table when nothing was found", () => {
    const body = aiReviewCommentV1(valid("c".repeat(40), { outcome: "NOT_RUN", findings: [], payload_sha256: null }) as unknown as AiReviewArtifactV1);
    expect(body).toContain("Outcome: **NOT_RUN**");
    expect(body).not.toContain("| File |");
  });

  it("puts all model text in code spans, so GitHub renders no HTML, link, mention, or issue reference", () => {
    const message = "<img src=x> @org/team #12 https://evil.example/login www.evil.example [click](https://x) ``break`` out \\| --- |";
    const body = aiReviewCommentV1(valid("c".repeat(40), { reason: "see @octocat at https://evil.example", findings: [{ path: "a.ts", start_line: 1, end_line: 1, severity: "major", category: "bug", message }] }) as unknown as AiReviewArtifactV1);
    const row = body.split("\n").find((line) => line.startsWith("| `a.ts`"))!;
    // Four cells: every pipe inside a cell is escaped and a backslash can't unescape one.
    expect(row.replace(/\\\\/gu, "").replace(/\\\|/gu, "").split("|").length).toBe(6);
    // The message stays one code span: backticks can't close it.
    const cell = row.slice(row.lastIndexOf(" | `") + 3);
    expect(cell.startsWith("`") && cell.endsWith("` |")).toBe(true);
    expect(cell.slice(1, -3)).not.toContain("`");
    expect(cell).toContain("@org/team #12 https://evil.example/login");
    expect(body).toContain("Outcome: **FINDINGS**. `see @octocat at https://evil.example`");
  });

  it("shows (none) for empty model text", () => {
    const body = aiReviewCommentV1(valid("c".repeat(40), { reason: "  " }) as unknown as AiReviewArtifactV1);
    expect(body).toContain("Outcome: **FINDINGS**. (none)");
  });

  it("stays under GitHub's comment limit and counts the findings it leaves out", () => {
    const findings = Array.from({ length: 200 }, (_, index) => ({ path: "a.ts", start_line: index + 1, end_line: index + 1, severity: "major", category: "bug", message: "|".repeat(2000) }));
    const body = aiReviewCommentV1(valid("c".repeat(40), { findings }) as unknown as AiReviewArtifactV1);
    expect(body.length).toBeLessThanOrEqual(AI_REVIEW_COMMENT_MAX_CHARS);
    expect(body).toMatch(/\n\d+ more findings are not shown, to keep this comment within GitHub's size limit\.\n/u);
    expect(body.endsWith(`Reviewed commit ${"c".repeat(40)}.`)).toBe(true);
  });
});

describe("job 2: pr-ai-publish", () => {
  const head = "c".repeat(40);
  const base = (path: string, fetchImpl: typeof fetch) => ({ repository: "o/r", prNumber: 7, headSha: head, artifactPath: path, token: "ghs_write", apiUrl: "https://api.github.com", botLogin: "github-actions[bot]", fetch: fetchImpl });

  it("creates one advisory comment and never touches a check run", async () => {
    const recorder = api(pull(head));
    expect(await publishPrAiReviewV1(base(artifactFile(valid(head)), recorder.fetch))).toEqual({ kind: "commented", comment: "created" });
    expect(recorder.calls.some((call) => call.url.includes("check-runs"))).toBe(false);
    expect(recorder.calls.at(-1)).toMatchObject({ method: "POST" });
  });

  it("updates its own comment, ignoring the same marker from someone else, across pages", async () => {
    const others = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, user: i === 0 ? null : { login: "someone" }, body: i === 1 ? null : `${AI_REVIEW_COMMENT_MARKER} fake` }));
    others.push({ id: 101, user: { login: "github-actions[bot]" }, body: null });
    const recorder = api(pull(head), [others, [{ id: 500, user: { login: "github-actions[bot]" }, body: `${AI_REVIEW_COMMENT_MARKER}\nold` }]]);
    expect(await publishPrAiReviewV1(base(artifactFile(valid(head)), recorder.fetch))).toEqual({ kind: "commented", comment: "updated" });
    expect(recorder.calls.at(-1)).toMatchObject({ method: "PATCH", url: expect.stringContaining("/issues/comments/500") });
  });

  it("refuses a bad artifact or one for another PR, and reports a moved head as stale", async () => {
    expect(await publishPrAiReviewV1(base(artifactFile("{nope"), api(pull(head)).fetch))).toMatchObject({ kind: "refused" });
    expect(await publishPrAiReviewV1(base(artifactFile(valid(head, { pr: 8 })), api(pull(head)).fetch))).toMatchObject({ kind: "refused" });
    expect(await publishPrAiReviewV1(base(artifactFile(valid(head)), api(pull("d".repeat(40))).fetch))).toEqual({ kind: "stale", current_head: "d".repeat(40) });
  });
});

describe("the command runners", () => {
  const env = (head: string, out: string) => ({
    GITHUB_REPOSITORY: "o/r", GITHUB_TOKEN: "ghs", ASCOUT_PR_NUMBER: "7", ASCOUT_PR_HEAD_SHA: head, ASCOUT_PR_HEAD_REPOSITORY: "o/r",
    ASCOUT_PR_REQUIRED_BASE: "main", ASCOUT_PR_TRIGGERING_ACTOR: "TheHalfMoon", ASCOUT_PR_TRUSTED_ACTORS: "TheHalfMoon, ",
    ASCOUT_AI_ENDPOINT: "https://api.example-provider.com/v1", ASCOUT_AI_MODEL: "m", ASCOUT_AI_MODEL_FAMILY: "f", ASCOUT_AI_OUTPUT: out, ASCOUT_AI_API_KEY: KEY,
  });
  const io = (vars: Record<string, string | undefined>, cwd: string, fetchImpl: typeof fetch, lines: string[], extra: object = {}) => ({
    env: vars, cwd, out: (line: string) => lines.push(`out:${line}`), err: (line: string) => lines.push(`err:${line}`),
    deps: {
      fetch: fetchImpl,
      scan: async () => ({ kind: "clean" as const }),
      resolve: async () => [{ address: "93.184.216.34", family: 4 }],
      transport: async () => ({ status: 200, text: JSON.stringify({ choices: [{ message: { content: "{\"findings\":[]}" } }] }) }),
      ...extra,
    },
  });

  it("pr-ai-review writes the artifact and exits 1 for findings, 4 otherwise, 3 when stale, and 2 on errors", async () => {
    const { root, head } = checkout();
    const out = join(temp("ascout-e10f-out-"), "a.json");
    const lines: string[] = [];
    const transport = async () => ({ status: 200, text: JSON.stringify({ choices: [{ message: { content: JSON.stringify({ findings: [{ path: "a.ts", start_line: 2, severity: "major", category: "bug", message: "x" }] }) } }] }) });
    expect(await runPrAiReviewMainV1([], io(env(head, out), root, api(pull(head)).fetch, lines, { transport }))).toBe(1);
    expect(JSON.parse(readFileSync(out, "utf8"))).toMatchObject({ outcome: "FINDINGS" });
    expect(await runPrAiReviewMainV1([], io(env(head, out), root, api(pull(head)).fetch, lines, { transport }))).toBe(2); // won't overwrite
    const out2 = join(temp("ascout-e10f-out-"), "b.json");
    expect(await runPrAiReviewMainV1([], io({ ...env(head, out2), ASCOUT_AI_API_KEY: undefined }, root, api(pull(head)).fetch, lines))).toBe(4);
    expect(await runPrAiReviewMainV1([], io(env(head, join(temp("ascout-e10f-out-"), "c.json")), root, api(pull("b".repeat(40))).fetch, lines))).toBe(3);
    expect(await runPrAiReviewMainV1([], io({ ...env(head, out), ASCOUT_AI_ENDPOINT: "http://x" }, root, api(pull(head)).fetch, lines))).toBe(2);
    expect(await runPrAiReviewMainV1(["extra"], io(env(head, out), root, api(pull(head)).fetch, lines))).toBe(2);
    expect(await runPrAiReviewMainV1([], io({ ...env(head, out), GITHUB_TOKEN: "" }, root, api(pull(head)).fetch, lines))).toBe(2);
    expect(await runPrAiReviewMainV1([], io({ ...env(head, out), ASCOUT_PR_NUMBER: "x" }, root, api(pull(head)).fetch, lines))).toBe(2);
    const throwing = (async () => { throw new Error("network down"); }) as unknown as typeof fetch;
    expect(await runPrAiReviewMainV1([], io(env(head, join(temp("ascout-e10f-out-"), "d.json")), root, throwing, lines))).toBe(2);
    // A failure the review itself can't turn into a result (here: no Git repository to read) is an error.
    expect(await runPrAiReviewMainV1([], io(env(head, join(temp("ascout-e10f-out-"), "e.json")), temp("ascout-e10f-norepo-"), api(pull(head)).fetch, lines))).toBe(2);
    // With no test dependencies, the real ones are used; an invalid endpoint stops before any network.
    expect(await runPrAiReviewMainV1([], { env: { ...env(head, join(temp("ascout-e10f-out-"), "f.json")), ASCOUT_AI_ENDPOINT: "http://x" }, cwd: root, out: () => undefined, err: () => undefined })).toBe(2);
    expect(lines.join("\n")).not.toContain(KEY);
  });

  it("pr-ai-publish exits 0 once it comments, 3 when stale, and 2 for a refused artifact or bad input", async () => {
    const head = "c".repeat(40);
    const lines: string[] = [];
    const vars = { GITHUB_REPOSITORY: "o/r", GITHUB_TOKEN: "ghs", ASCOUT_PR_NUMBER: "7", ASCOUT_PR_HEAD_SHA: head };
    const file = artifactFile(valid(head));
    expect(await runPrAiPublishMainV1([file], io(vars, ".", api(pull(head)).fetch, lines))).toBe(0);
    expect(await runPrAiPublishMainV1([file], io(vars, ".", api(pull("d".repeat(40))).fetch, lines))).toBe(3);
    expect(await runPrAiPublishMainV1([artifactFile("{nope")], io(vars, ".", api(pull(head)).fetch, lines))).toBe(2);
    expect(await runPrAiPublishMainV1([], io(vars, ".", api(pull(head)).fetch, lines))).toBe(2);
    expect(await runPrAiPublishMainV1([file], io({ ...vars, GITHUB_TOKEN: "" }, ".", api(pull(head)).fetch, lines))).toBe(2);
    expect(await runPrAiPublishMainV1([file], io({ ...vars, ASCOUT_PR_NUMBER: "-1" }, ".", api(pull(head)).fetch, lines))).toBe(2);
    expect(await runPrAiPublishMainV1([file], io(vars, ".", api(pull(head), [[]], true).fetch, lines))).toBe(2);
    // With no test dependencies, the real fetch is used; a refused artifact stops before any request.
    expect(await runPrAiPublishMainV1([artifactFile("{nope")], { env: vars, cwd: ".", out: () => undefined, err: () => undefined })).toBe(2);
  });

  it("parses both commands and routes them from the command line", async () => {
    expect(parseCliArgs(["pr-ai-review"])).toMatchObject({ command: "pr-ai-review" });
    expect(parseCliArgs(["pr-ai-publish", "f.json"])).toMatchObject({ command: "pr-ai-publish", bundlePath: "f.json" });
    expect(() => parseCliArgs(["pr-ai-review", "x"])).toThrow(CliUsageError);
    expect(() => parseCliArgs(["pr-ai-publish"])).toThrow(CliUsageError);
    expect(() => parseCliArgs(["pr-ai-publish", "--help"])).toThrow(CliUsageError);
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const saved = { ...process.env };
    for (const name of ["GITHUB_REPOSITORY", "GITHUB_TOKEN", "ASCOUT_PR_NUMBER"]) delete process.env[name];
    try {
      expect(await runCli(["pr-ai-review"])).toBe(2);
      expect(await runCli(["pr-ai-publish", "f.json"])).toBe(2);
    } finally {
      Object.assign(process.env, saved);
    }
  });
});

describe("the AI review workflow template", () => {
  const text = readFileSync(resolve("docs/examples/ascout-pr-ai-review.yml"), "utf8").replaceAll("\r\n", "\n");
  const job = (name: string) => {
    const start = text.indexOf(`\n  ${name}:\n`);
    const rest = text.slice(start + 1);
    const next = rest.slice(1).search(/\n {2}[a-z]+:\n/u);
    return next === -1 ? rest : rest.slice(0, next + 1);
  };

  it("runs only on workflow_run, so the default branch's copy always runs", () => {
    expect(text).toMatch(/^on:\n {2}workflow_run:/mu);
    expect(text).not.toMatch(/pull_request_target|toJSON\(\s*secrets\s*\)|secrets:\s*inherit/u);
  });

  it("keeps the model key in the read-only job and the write token in the job without the key", () => {
    const ai = job("ai");
    const comment = job("comment");
    expect(ai).toContain("secrets.ASCOUT_AI_API_KEY");
    expect(ai).not.toMatch(/: write/u);
    expect(ai).toContain("persist-credentials: false");
    expect(comment).toContain("pull-requests: write");
    expect(comment).not.toContain("secrets.");
    expect(text.match(/secrets\./gu)).toHaveLength(1);
  });

  it("never creates or edits a check run", () => {
    expect(text).not.toMatch(/checks:\s*write/u);
  });

  it("takes the key only from its environment, in a job that runs only for the collect workflow's same-repository PRs", () => {
    const ai = job("ai");
    expect(ai).toContain("    environment: ascout-ai-review\n");
    expect(ai).toContain("github.event.workflow_run.event == 'pull_request'");
    expect(ai).toContain("github.event.workflow_run.path == '.github/workflows/ascout-pr-collect.yml'");
    expect(ai).toContain("github.event.workflow_run.head_repository.full_name == github.repository");
    expect(ai).toContain("ref: ${{ github.event.workflow_run.head_sha }}");
  });

  it("grants only read access at the top and in the AI job", () => {
    const top = text.slice(0, text.indexOf("\njobs:"));
    expect(top).toMatch(/\npermissions:\n {2}contents: read\n/u);
    expect(top).not.toMatch(/write/u);
    expect(job("ai")).toMatch(/\n {4}permissions:\n {6}contents: read\n {6}pull-requests: read\n {4}steps:/u);
  });

  it("interpolates no expression into a script, stops on any failed command, and runs nothing from the checkout", () => {
    const scripts = [...text.matchAll(/\n( +)run: \|\n((?:\1 {2}.*\n|\n)*)/gu)].map((match) => match[2]!);
    const oneLine = [...text.matchAll(/\n +run: (?!\|)(.*)/gu)].map((match) => match[1]!);
    expect(scripts.length).toBeGreaterThan(2);
    for (const script of [...scripts, ...oneLine]) expect(script).not.toContain("${{");
    for (const script of scripts) expect(script).toMatch(/^ *set -euo pipefail\n/u);
    const ai = job("ai");
    expect(ai).not.toMatch(/npm (ci|test|run)|npx |\.\/|actions\/cache|yarn|pnpm/u);
    expect(ai.match(/npm install/gu)).toHaveLength(1);
    expect(ai).toContain('cd "$RUNNER_TEMP/ascout/package" && npm install --omit=dev --ignore-scripts');
  });

  it("the docs make the environment's default-branch-only rule a required step", () => {
    const docs = readFileSync(resolve("docs/GITHUB_INTEGRATION.md"), "utf8").replaceAll("\r\n", "\n");
    expect(docs).toMatch(/\*\*Required:\*\* restrict the environment's deployment branches to the default branch only/u);
    expect(text).toContain("# - REQUIRED: restrict that environment's deployment branches to your default branch only");
  });
});
