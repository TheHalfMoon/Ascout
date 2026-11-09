import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runCli } from "../src/cli.js";
import { writePackageNodeCommandShim } from "./helpers/native-command-shim.js";

// `ascout test` over real repositories, with nothing replaced: check discovers the project,
// admits and runs its test command, and builds a receipt. The test runner is a small script
// standing in for Vitest, so each run's result is fixed. That makes the passing, failing,
// incomplete, and error cases reproducible on every platform.

type RunnerMode = "pass" | "fail" | "branch_gap" | "malformed_coverage";

function runnerSource(mode: RunnerMode): string {
  const lcov =
    mode === "branch_gap"
      ? "SF:src/used.js\nDA:1,1\nBRDA:1,0,0,1\nBRDA:1,0,1,0\nend_of_record\n"
      : mode === "malformed_coverage"
        ? "SF:src/used.js\nDA:1,1\nBRDA:1,0,0\nend_of_record\n"
        : "SF:src/used.js\nDA:1,1\nend_of_record\n";
  const failed = mode === "fail";
  const results = {
    numTotalTests: 1,
    numPassedTests: failed ? 0 : 1,
    numFailedTests: failed ? 1 : 0,
    success: !failed,
    testResults: [
      {
        name: "tests/used.test.js",
        status: failed ? "failed" : "passed",
        assertionResults: [{ title: "used", fullName: "used", status: failed ? "failed" : "passed" }],
      },
    ],
  };
  return [
    'import { mkdirSync, writeFileSync } from "node:fs";',
    'import { dirname } from "node:path";',
    'const output = process.argv.find((arg) => arg.startsWith("--outputFile="))?.slice("--outputFile=".length);',
    'const coverageDir = process.argv.find((arg) => arg.startsWith("--coverage.reportsDirectory="))?.slice("--coverage.reportsDirectory=".length);',
    "if (!output || !coverageDir) process.exit(64);",
    "mkdirSync(dirname(output), { recursive: true });",
    "mkdirSync(coverageDir, { recursive: true });",
    `writeFileSync(output, ${JSON.stringify(JSON.stringify(results))});`,
    `writeFileSync(coverageDir + "/lcov.info", ${JSON.stringify(lcov)});`,
    `process.exit(${failed ? 1 : 0});`,
  ].join("\n");
}

const roots: string[] = [];

function git(root: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
}

/** A committed project with one changed source file, so check has changed code to exercise. */
function repository(mode: RunnerMode): string {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), `ascout-test-real-${mode}-`)));
  roots.push(root);
  mkdirSync(join(root, "src"));
  mkdirSync(join(root, "node_modules", "vitest"), { recursive: true });
  mkdirSync(join(root, "node_modules", "@vitest", "coverage-v8"), { recursive: true });
  mkdirSync(join(root, "node_modules", "fixture-runner"), { recursive: true });
  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: `ascout-test-real-${mode}`,
      private: true,
      type: "module",
      devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" },
    }),
  );
  writeFileSync(join(root, "node_modules", "vitest", "package.json"), JSON.stringify({ name: "vitest", version: "4.1.10" }));
  writeFileSync(
    join(root, "node_modules", "@vitest", "coverage-v8", "package.json"),
    JSON.stringify({ name: "@vitest/coverage-v8", version: "4.1.10" }),
  );
  writeFileSync(join(root, "node_modules", "fixture-runner", "index.mjs"), runnerSource(mode) + "\n");
  writePackageNodeCommandShim(join(root, "node_modules", ".bin"), "vitest", "../fixture-runner/index.mjs");
  writeFileSync(join(root, "src", "used.js"), "export function used() { return 2; }\n");
  git(root, "init", "-q");
  git(root, "config", "user.name", "Ascout fixture");
  git(root, "config", "user.email", "fixture@example.invalid");
  git(root, "config", "commit.gpgsign", "false");
  git(root, "add", ".");
  git(root, "commit", "-qm", "baseline");
  writeFileSync(join(root, "src", "used.js"), "export function used() { return 1 + 1; }\n");
  return root;
}

/** A TypeScript project whose typecheck passes and which has no test runner at all. */
function typecheckOnlyRepository(changed: boolean): string {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-test-real-typecheck-")));
  roots.push(root);
  mkdirSync(join(root, "src"));
  mkdirSync(join(root, "node_modules", "typescript"), { recursive: true });
  mkdirSync(join(root, "node_modules", "fixture-tsc"), { recursive: true });
  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "ascout-test-real-typecheck", private: true, type: "module", devDependencies: { typescript: "5.9.3" } }),
  );
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ compilerOptions: { noEmit: true, allowJs: true }, include: ["src"] }));
  writeFileSync(join(root, "node_modules", "typescript", "package.json"), JSON.stringify({ name: "typescript", version: "5.9.3" }));
  // Stands in for tsc: a clean typecheck prints nothing and exits 0.
  writeFileSync(join(root, "node_modules", "fixture-tsc", "index.mjs"), "process.exit(0);\n");
  writePackageNodeCommandShim(join(root, "node_modules", ".bin"), "tsc", "../fixture-tsc/index.mjs");
  writeFileSync(join(root, "src", "used.ts"), "export const used = 2;\n");
  git(root, "init", "-q");
  git(root, "config", "user.name", "Ascout fixture");
  git(root, "config", "user.email", "fixture@example.invalid");
  git(root, "config", "commit.gpgsign", "false");
  git(root, "add", ".");
  git(root, "commit", "-qm", "baseline");
  if (changed) writeFileSync(join(root, "src", "used.ts"), "export const used = 1 + 1;\n");
  return root;
}

const originalCwd = process.cwd();

afterEach(() => {
  vi.restoreAllMocks();
  process.chdir(originalCwd);
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

async function test(root: string, ...args: string[]) {
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
  process.chdir(root);
  const exit = await runCli(["test", ...args, "--format", "json"]);
  const out = stdout.mock.calls.map((call) => String(call[0])).join("");
  const err = stderr.mock.calls.flat().map(String).join("\n");
  vi.restoreAllMocks();
  return { exit, report: out.length > 0 ? JSON.parse(out) : null, stdout: out, stderr: err };
}

describe("ascout test over real repositories", { timeout: 180_000 }, () => {
  it("exits 0 when check runs a test that passes and exercises the changed code", async () => {
    const root = repository("pass");
    const result = await test(root);
    expect(result.exit, result.stderr).toBe(0);
    expect(result.report).toMatchObject({ outcome: "COMPLETE", reason_code: "CHECK_COMPLETE", exit_code: 0, executed_count: 1 });
    expect(result.report.check.tasks).toContainEqual(expect.objectContaining({ task_id: "test", status: "PASS" }));
    // The result is bound to this repository's commit, and its receipt is on disk.
    expect(result.report.check.source_start.head_sha).toBe(git(root, "rev-parse", "HEAD"));
    expect(existsSync(join(root, ".ascout", "runs", result.report.check.run_id, "receipt.json"))).toBe(true);
    const receipt = JSON.parse(readFileSync(join(root, ".ascout", "runs", result.report.check.run_id, "receipt.json"), "utf8"));
    expect(receipt.summary.exit_code).toBe(result.report.check.exit_code);
  });

  it("exits 1 when the test fails", async () => {
    const root = repository("fail");
    const result = await test(root);
    expect(result.exit, result.stderr).toBe(1);
    expect(result.report).toMatchObject({ outcome: "FINDINGS", exit_code: 1 });
    expect(result.report.check.tasks).toContainEqual(expect.objectContaining({ task_id: "test", status: "FAIL" }));
  });

  it("exits 4 when a changed branch is never exercised", async () => {
    const root = repository("branch_gap");
    const result = await test(root);
    expect(result.exit, result.stderr).toBe(4);
    expect(result.report).toMatchObject({ outcome: "INCOMPLETE", reason_code: "CHECK_INCOMPLETE" });
  });

  it("exits 2 with stdout empty when the runner's coverage is malformed", async () => {
    const root = repository("malformed_coverage");
    const result = await test(root);
    expect(result.exit).toBe(2);
    expect(result.stdout).toBe("");
    const receiptPath = /\.ascout\/runs\/([^/]+)\/receipt\.json/u.exec(result.stderr);
    expect(receiptPath, result.stderr).not.toBeNull();
    expect(existsSync(join(root, ".ascout", "runs", receiptPath![1]!, "receipt.json"))).toBe(true);
  });

  it("exits 4 under DEEP when check passes, because DEEP's other engines never ran", async () => {
    const root = repository("pass");
    const result = await test(root, "--profile", "deep");
    expect(result.exit, result.stderr).toBe(4);
    expect(result.report).toMatchObject({ outcome: "INCOMPLETE", reason_code: "REQUIRED_ENGINE_NOT_RUN" });
    expect(result.report.check.exit_code).toBe(0);
  });

  it("exits 1 under DEEP when the test fails, with the missing engines still listed", async () => {
    const root = repository("fail");
    const result = await test(root, "--profile", "deep");
    expect(result.exit, result.stderr).toBe(1);
    expect(result.report.not_run.length).toBeGreaterThan(0);
  });

  it("exits 4 when only a typecheck ran over changed code, because check found it unexercised", async () => {
    const root = typecheckOnlyRepository(true);
    const result = await test(root);
    expect(result.report?.check?.exit_code, JSON.stringify(result.report?.check)).toBe(4);
    expect(result.report.check.tasks).toContainEqual(expect.objectContaining({ task_id: "typecheck", status: "PASS" }));
    expect(result.exit).toBe(4);
    expect(result.report).toMatchObject({ outcome: "INCOMPLETE", reason_code: "CHECK_INCOMPLETE" });
  });

  it("reports a clean tree with only a typecheck as incomplete, never as a passing test", async () => {
    const root = typecheckOnlyRepository(false);
    const result = await test(root);
    // check itself reports a run with no test as incomplete, even on a clean tree. The
    // NO_TEST_EXECUTED rule in test-run-command is a second guard behind this one.
    expect(result.exit, JSON.stringify(result.report?.check)).toBe(4);
    expect(result.report.check.exit_code).toBe(4);
    expect(result.report).toMatchObject({ outcome: "INCOMPLETE", reason_code: "CHECK_INCOMPLETE" });
  });
});
