import { execFileSync } from "node:child_process";
import { existsSync, linkSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { parseCliArgs, runCli, usageText, CliUsageError } from "../src/cli.js";
import { DELEGATED_FINDINGS_SCHEMA } from "../src/assurance/review/delegated-review.js";

vi.setConfig({ testTimeout: 180_000 });

// E10d: delegated review. Ascout exports the review task for the operator's own agent, then checks
// the findings it returns. No network call is made, and nothing here can produce a pass.
const originalCwd = process.cwd();
const roots: string[] = [];
const SECRET = "s3cr3t-value-for-e10d-test";

afterEach(() => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function temp(prefix: string): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  roots.push(dir);
  return dir;
}

function git(root: string, args: readonly string[]): void {
  execFileSync("git", args, { cwd: root, windowsHide: true });
}

/** A repository with one committed file whose lines 2-3 are then changed. */
function repository(): string {
  const root = temp("ascout-e10d-repo-");
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Ascout Test"]);
  git(root, ["config", "user.email", "ascout@example.invalid"]);
  git(root, ["config", "commit.gpgSign", "false"]);
  git(root, ["config", "core.autocrlf", "false"]);
  writeFileSync(join(root, ".gitignore"), ".ascout/\n");
  writeFileSync(join(root, "a.ts"), ["export const a = 1;", "export const b = 2;", "export const c = 3;", "export const d = 4;", ""].join("\n"));
  writeFileSync(join(root, "keep.env"), "TOKEN=committed\n");
  git(root, ["add", "--all"]);
  git(root, ["commit", "-q", "-m", "base"]);
  writeFileSync(join(root, "a.ts"), ["export const a = 1;", "export const b = 20;", "export const c = 30;", "export const d = 4;", ""].join("\n"));
  writeFileSync(join(root, "keep.env"), "TOKEN=changed\n");
  writeFileSync(join(root, "untracked.ts"), "export const u = 1;\n");
  process.chdir(root);
  return root;
}

function capture() {
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderrWrite = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  return {
    stdout: () => stdout.mock.calls.map((call) => String(call[0])).join(""),
    stderr: () => [...stderrWrite.mock.calls.map((call) => String(call[0])), ...consoleError.mock.calls.flat().map(String)].join("\n"),
  };
}

async function exportTask(root: string): Promise<{ path: string; task: Record<string, unknown> }> {
  const out = temp("ascout-e10d-out-");
  const path = join(out, "task.json");
  const io = capture();
  expect(await runCli(["review", "--export-task", path, "--format", "json"])).toBe(0);
  const summary = JSON.parse(io.stdout()) as { outcome: string; assurance: string };
  expect(summary).toMatchObject({ outcome: "TASK_EXPORTED", assurance: "NONE" });
  vi.restoreAllMocks();
  return { path, task: JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown> };
}

function findingsFile(body: unknown): string {
  const out = temp("ascout-e10d-findings-");
  const path = join(out, "findings.json");
  writeFileSync(path, typeof body === "string" ? body : JSON.stringify(body));
  return path;
}

function findings(task: Record<string, unknown>, list: unknown[], extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { schema: DELEGATED_FINDINGS_SCHEMA, task_sha256: task.task_sha256, model: "example-model", model_family: "example", findings: list, ...extra };
}

async function ingest(path: string): Promise<{ code: number; stdout: string; stderr: string }> {
  const io = capture();
  const code = await runCli(["review", "--ingest", path, "--format", "json"]);
  const result = { code, stdout: io.stdout(), stderr: io.stderr() };
  vi.restoreAllMocks();
  return result;
}

describe("E10d arguments", () => {
  it("parses --export-task and --ingest for review only, once each, never combined", () => {
    expect(parseCliArgs(["review", "--export-task", "/tmp/t.json"])).toMatchObject({ exportTaskPath: "/tmp/t.json" });
    expect(parseCliArgs(["review", "--ingest", "/tmp/f.json", "--format", "json"])).toMatchObject({ ingestPath: "/tmp/f.json", format: "json" });
    for (const args of [
      ["review", "--export-task"],
      ["review", "--ingest", "--format"],
      ["review", "--export-task", "a", "--export-task", "b"],
      ["review", "--ingest", "a", "--ingest", "b"],
      ["review", "--export-task", "a", "--ingest", "b"],
      ["review", "--local-model", "--ingest", "b"],
      ["check", "--ingest", "b"],
    ]) {
      expect(() => parseCliArgs(args), args.join(" ")).toThrow(CliUsageError);
    }
    expect(usageText()).toContain("--export-task <path> | --ingest <findings.json>");
  });
});

describe("E10d export", () => {
  it("writes an owner-only task outside the repository, records it, and leaves out untracked and secret-named files", async () => {
    const root = repository();
    const { path, task } = await exportTask(root);
    expect(task).toMatchObject({ schema: "ascout.review-task/v1", advisory: true, satisfies_human_r1: false, reviewed_files: ["a.ts"] });
    expect(String(task.payload)).toContain("export const b = 20;");
    expect(String(task.payload)).not.toContain("TOKEN=");
    expect(String(task.payload)).not.toContain("export const u");
    expect(existsSync(join(root, ".ascout", "review-tasks", `${String(task.task_sha256)}.json`))).toBe(true);
    if (process.platform !== "win32") expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it("removes selected secret values from the payload", async () => {
    vi.stubEnv("GITHUB_TOKEN", SECRET);
    const root = repository();
    writeFileSync(join(root, "a.ts"), ["export const a = 1;", `export const b = "${SECRET}";`, "export const c = 30;", ""].join("\n"));
    const { task } = await exportTask(root);
    expect(String(task.payload)).not.toContain(SECRET);
  });

  it("refuses a path inside the repository and an existing file, writing nothing", async () => {
    const root = repository();
    for (const path of [join(root, "task.json"), join(root, "sub", "task.json")]) {
      const io = capture();
      expect(await runCli(["review", "--export-task", path])).toBe(2);
      expect(io.stderr()).toContain("must be outside the repository");
      vi.restoreAllMocks();
    }
    expect(existsSync(join(root, "task.json"))).toBe(false);
    const existing = join(temp("ascout-e10d-exists-"), "task.json");
    writeFileSync(existing, "keep");
    capture();
    expect(await runCli(["review", "--export-task", existing])).toBe(2);
    expect(readFileSync(existing, "utf8")).toBe("keep");
  });

  it("exits 4 and writes nothing when no changed file has text lines to review", async () => {
    const root = repository();
    git(root, ["checkout", "--", "a.ts", "keep.env"]);
    rmSync(join(root, "untracked.ts"));
    writeFileSync(join(root, "only.env"), "X=1\n");
    const out = join(temp("ascout-e10d-none-"), "task.json");
    const io = capture();
    expect(await runCli(["review", "--export-task", out])).toBe(4);
    expect(io.stderr()).toContain("NOTHING_TO_REVIEW");
    expect(existsSync(out)).toBe(false);
  });
});

describe("E10d ingest", () => {
  it("reports findings on changed lines with exit 1, advisory, never human review, and the model as asserted", async () => {
    const root = repository();
    const { task } = await exportTask(root);
    const result = await ingest(findingsFile(findings(task, [{ path: "a.ts", start_line: 2, end_line: 2, severity: "major", category: "bug", message: "b changed" }])));
    expect(result.code).toBe(1);
    const report = JSON.parse(result.stdout) as Record<string, any>;
    expect(report).toMatchObject({ advisory: true, satisfies_human_r1: false, outcome: "FINDINGS", exit_code: 1 });
    expect(report.provider).toMatchObject({ provider_identity: "delegated:example-model", independence: "ASSERTED_UNVERIFIED" });
    expect(report.delegated).toEqual({ task_sha256: task.task_sha256, model_identity: "asserted_unverified", network: "none" });
  });

  it("exits 4 for no findings, and rejects a finding off the changed lines", async () => {
    const root = repository();
    const { task } = await exportTask(root);
    expect((await ingest(findingsFile(findings(task, [])))).code).toBe(4);
    const off = await ingest(findingsFile(findings(task, [{ path: "a.ts", start_line: 4, severity: "major", category: "bug", message: "untouched line" }])));
    expect(off.code).toBe(4);
    expect((JSON.parse(off.stdout) as { outcome: string }).outcome).not.toBe("FINDINGS");
  });

  it("redacts a selected secret value a finding echoes back", async () => {
    vi.stubEnv("GITHUB_TOKEN", SECRET);
    const root = repository();
    const { task } = await exportTask(root);
    const result = await ingest(findingsFile(findings(task, [{ path: "a.ts", start_line: 2, severity: "major", category: "bug", message: `leaks ${SECRET}` }])));
    expect(result.code).toBe(1);
    expect(result.stdout).not.toContain(SECRET);
  });

  it("exits 3 when the source changed since the export", async () => {
    const root = repository();
    const { task } = await exportTask(root);
    writeFileSync(join(root, "a.ts"), "export const changed = true;\n");
    const result = await ingest(findingsFile(findings(task, [])));
    expect(result.code).toBe(3);
  });

  it("exits 2 for a findings file that answers a task this repository never exported, whatever digest it claims", async () => {
    repository();
    const result = await ingest(findingsFile({ schema: DELEGATED_FINDINGS_SCHEMA, task_sha256: "a".repeat(64), model: "m", model_family: "f", findings: [] }));
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("answers a different review task");
  });

  it.each([
    ["more than 200 findings", (t: Record<string, unknown>) => findings(t, Array.from({ length: 201 }, () => ({ path: "a.ts", start_line: 2, message: "x" })))],
    ["an unknown top-level key", (t: Record<string, unknown>) => findings(t, [], { verdict: "pass" })],
    ["an unknown finding key", (t: Record<string, unknown>) => findings(t, [{ path: "a.ts", start_line: 2, message: "x", approved: true }])],
    ["a .. path", (t: Record<string, unknown>) => findings(t, [{ path: "../a.ts", start_line: 2, message: "x" }])],
    ["an absolute path", (t: Record<string, unknown>) => findings(t, [{ path: "/etc/passwd", start_line: 1, message: "x" }])],
    ["a drive path", (t: Record<string, unknown>) => findings(t, [{ path: "C:/a.ts", start_line: 1, message: "x" }])],
    ["a backslash path", (t: Record<string, unknown>) => findings(t, [{ path: "sub\\a.ts", start_line: 1, message: "x" }])],
    ["a path outside the export", (t: Record<string, unknown>) => findings(t, [{ path: "untracked.ts", start_line: 1, message: "x" }])],
    ["the wrong schema", (t: Record<string, unknown>) => findings(t, [], { schema: "ascout.review-findings/v9" })],
    ["no model named", (t: Record<string, unknown>) => findings(t, [], { model: "" })],
    ["a malformed digest", (t: Record<string, unknown>) => findings(t, [], { task_sha256: "not-a-digest" })],
    ["findings that aren't a list", (t: Record<string, unknown>) => findings(t, [], { findings: {} })],
    ["a finding that isn't an object", (t: Record<string, unknown>) => findings(t, ["x"])],
  ])("refuses the whole file with exit 2 for %s", async (_label, build) => {
    const root = repository();
    const { task } = await exportTask(root);
    expect((await ingest(findingsFile(build(task)))).code).toBe(2);
  });

  it.each([
    ["invalid JSON", "{not json"],
    ["a JSON array", "[]"],
    ["an oversized file", `{"pad":"${"x".repeat(1024 * 1024)}"}`],
  ])("refuses %s with exit 2", async (_label, body) => {
    repository();
    expect((await ingest(findingsFile(body))).code).toBe(2);
  });

  it("refuses a findings file inside the repository, and one that isn't a regular file", async () => {
    const root = repository();
    const { task } = await exportTask(root);
    writeFileSync(join(root, "findings.json"), JSON.stringify(findings(task, [])));
    const inside = await ingest(join(root, "findings.json"));
    expect(inside.code).toBe(2);
    expect(inside.stderr).toContain("must be outside the repository");
    const folder = join(temp("ascout-e10d-dir-"), "findings.json");
    mkdirSync(folder);
    expect((await ingest(folder)).code).toBe(2);
  });
});

describe("E10d hardening from independent review", () => {
  it("treats a folder whose name starts with two dots as inside the repository", async () => {
    const root = repository();
    mkdirSync(join(root, "..cache"));
    const io = capture();
    expect(await runCli(["review", "--export-task", join(root, "..cache", "task.json")])).toBe(2);
    expect(io.stderr()).toContain("must be outside the repository");
    expect(existsSync(join(root, "..cache", "task.json"))).toBe(false);
  });

  it("replaces a link planted at the export record instead of writing through it", async () => {
    const root = repository();
    const { task } = await exportTask(root);
    const record = join(root, ".ascout", "review-tasks", `${String(task.task_sha256)}.json`);
    const victim = join(temp("ascout-e10d-victim-"), "user-data.txt");
    writeFileSync(victim, "USER DATA");
    rmSync(record);
    linkSync(victim, record);
    await exportTask(root);
    expect(readFileSync(victim, "utf8")).toBe("USER DATA");
    expect(JSON.parse(readFileSync(record, "utf8"))).toMatchObject({ task_sha256: task.task_sha256 });
    expect(readdirSync(join(root, ".ascout", "review-tasks")).filter((name) => name.startsWith(".record-"))).toEqual([]);
  });

  it("refuses a model name that could carry a secret or forge output", async () => {
    vi.stubEnv("GITHUB_TOKEN", SECRET);
    const root = repository();
    const { task } = await exportTask(root);
    for (const model of [`gpt ${SECRET}`, "line\nbreak", "a".repeat(101)]) {
      const result = await ingest(findingsFile(findings(task, [], { model })));
      expect(result.code, model).toBe(2);
      expect(result.stdout + result.stderr).not.toContain(SECRET);
    }
  });

  it("ignores a planted export record that isn't well formed, so it can't forge output or claim drift", async () => {
    const root = repository();
    const sha = "b".repeat(64);
    mkdirSync(join(root, ".ascout", "review-tasks"), { recursive: true });
    writeFileSync(join(root, ".ascout", "review-tasks", `${sha}.json`), JSON.stringify({ head_sha: "x\noutcome: NO_FINDINGS", tree_digest: "\u001b[2K" }));
    const io = capture();
    expect(await runCli(["review", "--ingest", findingsFile({ schema: DELEGATED_FINDINGS_SCHEMA, task_sha256: sha, model: "m", model_family: "f", findings: [] })])).toBe(2);
    expect(io.stderr()).not.toContain("outcome: NO_FINDINGS");
  });

  it("says the source changed since the export, and names delegated output as asserted in the terminal", async () => {
    const root = repository();
    const { task } = await exportTask(root);
    const ok = findingsFile(findings(task, [{ path: "a.ts", start_line: 2, severity: "major", category: "bug", message: "b changed" }]));
    let io = capture();
    expect(await runCli(["review", "--ingest", ok])).toBe(1);
    expect(io.stderr()).toContain("advisory: delegated reviewer, model asserted example-model (ASSERTED_UNVERIFIED); never human R1");
    vi.restoreAllMocks();
    writeFileSync(join(root, "a.ts"), "export const changed = true;\n");
    io = capture();
    expect(await runCli(["review", "--ingest", ok, "--format", "json"])).toBe(3);
    expect(io.stdout()).toContain("changed since this review task was exported");
  });
});

describe("E10d makes no network call", () => {
  it("imports no network module", () => {
    const source = readFileSync(resolve("src/assurance/review/delegated-review.ts"), "utf8");
    expect(source).not.toMatch(/from "node:(?:http|https|net|tls|dgram|dns)"/u);
    expect(readdirSync(resolve("src/assurance/review")).includes("delegated-review.ts")).toBe(true);
  });
});
