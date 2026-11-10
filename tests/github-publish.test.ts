import { createServer, type Server } from "node:http";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { apiOriginV1, isTrustedActorV1, publishPrEvidenceV1, type PublishInputV1 } from "../src/github/publish.js";
import { SUMMARY_COMMENT_MARKER, buildPrEvidenceV1, stateForExitCode, type PrCheckV1 } from "../src/github/pr-evidence.js";

const HEAD = "a".repeat(40);
const scratch = realpathSync(mkdtempSync(join(tmpdir(), "ascout-publish-")));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const check = (id: PrCheckV1["id"], exit: PrCheckV1["exit_code"]): PrCheckV1 => ({ id, exit_code: exit, state: stateForExitCode(exit), outcome: "X", reason: "r" });
function writeBundle(name: string, exit: PrCheckV1["exit_code"], headSha = HEAD): string {
  const path = join(scratch, name);
  writeFileSync(path, JSON.stringify(buildPrEvidenceV1({ ascout_version: "0.2.0", head_sha: headSha, checks: [check("review", exit), check("security", exit), check("test", exit)], findings: [] })));
  return path;
}

interface FakeState {
  prHead: string;
  headRepo: string;
  author: string;
  base: string;
  extraPulls: number;
  comments: { id: number; user: { login: string }; body: string }[];
  requests: { method: string; url: string; body: unknown }[];
}

let server: Server;
let origin: string;
let state: FakeState;

beforeAll(async () => {
  server = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk: Buffer) => { raw += chunk.toString("utf8"); });
    request.on("end", () => {
      const body = raw === "" ? null : JSON.parse(raw);
      state.requests.push({ method: request.method!, url: request.url!, body });
      const url = new URL(request.url!, "http://x");
      const send = (status: number, value: unknown) => { response.statusCode = status; response.end(JSON.stringify(value)); };
      if (request.method === "GET" && url.pathname === "/repos/o/r/pulls") {
        const pr = { number: 7, state: "open", user: { login: state.author }, base: { ref: state.base }, head: { sha: state.prHead, repo: { full_name: state.headRepo } } };
        return send(200, [pr, ...Array.from({ length: state.extraPulls }, (_, i) => ({ ...pr, number: 8 + i }))]);
      }
      if (request.method === "GET" && url.pathname === "/repos/o/r/pulls/7") {
        return send(200, { number: 7, state: "open", user: { login: state.author }, base: { ref: state.base }, head: { sha: state.prHead, repo: { full_name: state.headRepo } } });
      }
      if (request.method === "POST" && url.pathname === "/repos/o/r/check-runs") return send(201, { id: 99 });
      if (request.method === "GET" && url.pathname === "/repos/o/r/issues/7/comments") return send(200, state.comments);
      if (request.method === "POST" && url.pathname === "/repos/o/r/issues/7/comments") {
        state.comments.push({ id: 500 + state.comments.length, user: { login: "github-actions[bot]" }, body: (body as { body: string }).body });
        return send(201, {});
      }
      if (request.method === "PATCH" && url.pathname.startsWith("/repos/o/r/issues/comments/")) return send(200, {});
      return send(404, {});
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(() => undefined);
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function input(overrides: Partial<PublishInputV1> = {}): PublishInputV1 {
  state = state ?? { prHead: HEAD, headRepo: "o/r", author: "maintainer", base: "main", extraPulls: 0, comments: [], requests: [] };
  return {
    bundlePath: writeBundle("b.json", 4),
    repository: "o/r",
    headSha: HEAD,
    headRepository: "o/r",
    headBranch: "feature",
    detailsUrl: "https://github.com/o/r/actions/runs/1",
    token: "test-token",
    apiUrl: origin,
    botLogin: "github-actions[bot]",
    triggeringActor: "maintainer",
    trustedActors: ["maintainer"],
    requiredBase: "main",
    ...overrides,
  };
}

const reset = (overrides: Partial<FakeState> = {}) => { state = { prHead: HEAD, headRepo: "o/r", author: "maintainer", base: "main", extraPulls: 0, comments: [], requests: [], ...overrides }; };
const checkRunBody = () => state.requests.find((r) => r.url === "/repos/o/r/check-runs")!.body as Record<string, unknown>;
const writes = () => state.requests.filter((r) => r.method !== "GET");

describe("publishing PR evidence", () => {
  it("posts one check run on the trusted head, then updates the same summary comment instead of adding another", async () => {
    reset();
    const first = await publishPrEvidenceV1(input());
    expect(first).toMatchObject({ kind: "published", pr: 7, conclusion: "action_required", comment: "created" });
    const run = state.requests.find((r) => r.url === "/repos/o/r/check-runs")!.body as Record<string, unknown>;
    expect(run).toMatchObject({ name: "Ascout verification", head_sha: HEAD, status: "completed", conclusion: "action_required", details_url: "https://github.com/o/r/actions/runs/1" });
    const second = await publishPrEvidenceV1(input());
    expect(second).toMatchObject({ kind: "published", comment: "updated" });
    expect(state.comments).toHaveLength(1);
    expect(state.requests.some((r) => r.method === "PATCH")).toBe(true);
  });

  it("does not adopt a marker comment written by someone else", async () => {
    reset({ comments: [{ id: 1, user: { login: "attacker" }, body: `${SUMMARY_COMMENT_MARKER}\nfake` }] });
    expect(await publishPrEvidenceV1(input())).toMatchObject({ kind: "published", comment: "created" });
    expect(state.requests.some((r) => r.method === "PATCH")).toBe(false);
  });

  it("publishes nothing when the PR head moved after collection", async () => {
    reset({ prHead: "c".repeat(40) });
    expect(await publishPrEvidenceV1(input())).toEqual({ kind: "stale", pr: 7, current_head: "c".repeat(40) });
    expect(writes()).toEqual([]);
  });

  it("caps a fork PR's claimed pass at action_required", async () => {
    reset({ headRepo: "attacker/r" });
    const outcome = await publishPrEvidenceV1(input({ headRepository: "attacker/r", bundlePath: writeBundle("pass.json", 0) }));
    expect(outcome).toMatchObject({ kind: "published", conclusion: "action_required" });
  });

  it("passes a same-repository PR whose every check completed", async () => {
    reset();
    expect(await publishPrEvidenceV1(input({ bundlePath: writeBundle("pass2.json", 0) }))).toMatchObject({ kind: "published", conclusion: "success" });
  });

  it("refuses, with no writes, a bundle that names another commit", async () => {
    reset();
    expect(await publishPrEvidenceV1(input({ bundlePath: writeBundle("other.json", 0, "b".repeat(40)) }))).toMatchObject({ kind: "refused" });
    expect(writes()).toEqual([]);
  });

  it("refuses, with no network at all, an invalid bundle or invalid context", async () => {
    reset();
    const bad = join(scratch, "bad.json");
    writeFileSync(bad, "{not json");
    expect(await publishPrEvidenceV1(input({ bundlePath: bad }))).toMatchObject({ kind: "refused" });
    expect(await publishPrEvidenceV1(input({ headSha: "main" }))).toMatchObject({ kind: "refused" });
    expect(await publishPrEvidenceV1(input({ repository: "o/r; rm -rf /" }))).toMatchObject({ kind: "refused" });
    expect(await publishPrEvidenceV1(input({ detailsUrl: "http://evil.example/" }))).toMatchObject({ kind: "refused" });
    expect(state.requests).toEqual([]);
  });

  it("refuses when no open PR matches the trusted head repository", async () => {
    reset({ headRepo: "someone/else" });
    expect(await publishPrEvidenceV1(input())).toMatchObject({ kind: "refused", reason: expect.stringContaining("no open pull request") });
    expect(writes()).toEqual([]);
  });

  it("talks only to an https API origin, or loopback http for tests", () => {
    expect(apiOriginV1("https://api.github.com")).toBe("https://api.github.com");
    expect(apiOriginV1("https://ghe.example.com/api/v3/")).toBe("https://ghe.example.com/api/v3");
    expect(() => apiOriginV1("http://api.github.com")).toThrow();
    expect(() => apiOriginV1("https://user:pw@api.github.com")).toThrow();
    expect(() => apiOriginV1("https://api.github.com/?x=1")).toThrow();
  });

  it("only an allowlisted maintainer's same-repository PR to the protected base can pass, under the real check name", async () => {
    reset();
    expect(await publishPrEvidenceV1(input({ bundlePath: writeBundle("t1.json", 0) }))).toMatchObject({ conclusion: "success" });
    expect(checkRunBody().name).toBe("Ascout verification");
  });

  it.each([
    ["an author who is not on the list", { author: "contributor" }, {}],
    ["a triggering actor who is not on the list", {}, { triggeringActor: "contributor" }],
    ["a bot, even if listed", { author: "dependabot[bot]" }, { trustedActors: ["maintainer", "dependabot[bot]"] }],
    ["an empty allowlist", {}, { trustedActors: [] }],
    ["a PR to another base, via the event's PR number", { base: "release" }, { prNumber: 7 }],
  ])("publishes a claimed pass from %s as untrusted: action_required, under a separate check name", async (_label, fake, overrides) => {
    reset(fake as Partial<FakeState>);
    const outcome = await publishPrEvidenceV1(input({ bundlePath: writeBundle("t2.json", 0), ...(overrides as Partial<PublishInputV1>) }));
    expect(outcome).toMatchObject({ kind: "published", conclusion: "action_required" });
    expect(checkRunBody().name).toBe("Ascout verification (untrusted)");
  });

  it("refuses when several open PRs share the head branch, rather than annotating the wrong one", async () => {
    reset({ extraPulls: 1 });
    expect(await publishPrEvidenceV1(input())).toMatchObject({ kind: "refused", reason: expect.stringContaining("more than one") });
    expect(writes()).toEqual([]);
  });

  it("uses the event's PR number when GitHub provides it", async () => {
    reset();
    await publishPrEvidenceV1(input({ prNumber: 7 }));
    expect(state.requests.some((r) => r.url === "/repos/o/r/pulls/7")).toBe(true);
    expect(state.requests.some((r) => r.url.startsWith("/repos/o/r/pulls?"))).toBe(false);
  });

  it("recognizes maintainers case-insensitively and never a bot", () => {
    expect(isTrustedActorV1("Maintainer", ["maintainer"])).toBe(true);
    expect(isTrustedActorV1("renovate[bot]", ["renovate[bot]"])).toBe(false);
    expect(isTrustedActorV1("", ["x"])).toBe(false);
  });
});
