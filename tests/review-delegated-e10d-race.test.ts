import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 180_000 });

// Races can't be timed in a test, so each one is injected: a findings file that is swapped or grows
// after its checks, and source that changes while Ascout reads it.
type Fault = "swapped" | "grows" | null;
let fault: Fault = null;
let driftOnSecondRead = false;
let sourceReads = 0;

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const isFindings = (path: unknown) => typeof path === "string" && path.endsWith("findings.json");
  return {
    ...actual,
    lstatSync: ((path: string, options?: object) => {
      const stats = actual.lstatSync(path, options as never);
      // "grows": the file reports a tiny size to every check, then reads past the cap.
      if (fault === "grows" && isFindings(path) && stats !== undefined) return Object.assign(Object.create(Object.getPrototypeOf(stats)), stats, { size: 10n });
      return stats;
    }) as typeof actual.lstatSync,
    fstatSync: ((descriptor: number, options?: object) => {
      const stats = actual.fstatSync(descriptor, options as never);
      if (fault === "swapped") return Object.assign(Object.create(Object.getPrototypeOf(stats)), stats, { ino: -1n });
      if (fault === "grows") return Object.assign(Object.create(Object.getPrototypeOf(stats)), stats, { size: 10n });
      return stats;
    }) as typeof actual.fstatSync,
  };
});

vi.mock("../src/check.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/check.js")>();
  return {
    ...actual,
    composeSourceState: (root: string) => {
      const state = actual.composeSourceState(root);
      sourceReads += 1;
      // The second of the two reads that bracket the change listing sees a different tree.
      return driftOnSecondRead && sourceReads % 2 === 0 ? { ...state, tree_digest: "f".repeat(64) } : state;
    },
  };
});

const { runCli } = await import("../src/cli.js");
const { DELEGATED_FINDINGS_SCHEMA } = await import("../src/assurance/review/delegated-review.js");

const originalCwd = process.cwd();
const roots: string[] = [];
afterEach(() => {
  fault = null;
  driftOnSecondRead = false;
  sourceReads = 0;
  process.chdir(originalCwd);
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function temp(prefix: string): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  roots.push(dir);
  return dir;
}

function repository(): string {
  const root = temp("ascout-e10d-race-");
  const git = (args: string[]) => execFileSync("git", args, { cwd: root, windowsHide: true });
  git(["init", "-q"]);
  git(["config", "user.name", "Ascout Test"]);
  git(["config", "user.email", "ascout@example.invalid"]);
  git(["config", "commit.gpgSign", "false"]);
  writeFileSync(join(root, "a.ts"), "export const a = 1;\n");
  git(["add", "--all"]);
  git(["commit", "-q", "-m", "base"]);
  writeFileSync(join(root, "a.ts"), "export const a = 2;\n");
  process.chdir(root);
  return root;
}

function quiet() {
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  return {
    stdout: () => stdout.mock.calls.map((call) => String(call[0])).join(""),
    stderr: () => [...stderr.mock.calls.map((call) => String(call[0])), ...consoleError.mock.calls.flat().map(String)].join("\n"),
  };
}

function findingsFile(body: string): string {
  const path = join(temp("ascout-e10d-race-out-"), "findings.json");
  writeFileSync(path, body);
  return path;
}

describe("E10d under injected races", () => {
  it("refuses a findings file swapped after its check", async () => {
    repository();
    const path = findingsFile(JSON.stringify({ schema: DELEGATED_FINDINGS_SCHEMA, task_sha256: "a".repeat(64), model: "m", model_family: "f", findings: [] }));
    const io = quiet();
    fault = "swapped";
    expect(await runCli(["review", "--ingest", path])).toBe(2);
    expect(io.stderr()).toContain("changed while it was being read");
  });

  it("stops reading a findings file that grows past 1 MiB after its checks", async () => {
    repository();
    const path = findingsFile(`{"pad":"${"x".repeat(1024 * 1024 + 10)}"}`);
    const io = quiet();
    fault = "grows";
    expect(await runCli(["review", "--ingest", path])).toBe(2);
    expect(io.stderr()).toContain("larger than 1 MiB");
  });

  it("reports source drift when the source changes while export reads it", async () => {
    repository();
    const io = quiet();
    driftOnSecondRead = true;
    expect(await runCli(["review", "--export-task", join(temp("ascout-e10d-race-task-"), "task.json")])).toBe(3);
    expect(io.stderr()).toContain("SOURCE_DRIFT");
  });

  it("reports source drift when the source changes while ingest reads it", async () => {
    repository();
    const path = findingsFile(JSON.stringify({ schema: DELEGATED_FINDINGS_SCHEMA, task_sha256: "a".repeat(64), model: "m", model_family: "f", findings: [] }));
    quiet();
    driftOnSecondRead = true;
    expect(await runCli(["review", "--ingest", path, "--format", "json"])).toBe(3);
  });
});
