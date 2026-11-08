import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";
import { machineResultRecordsFailure } from "../src/test-result-outcome.js";
import { writePackageNodeCommandShim } from "./helpers/native-command-shim.js";

type Runner = "vitest" | "jest";

const LCOV = "SF:src/used.js\nDA:1,1\nend_of_record\n";

const PASSING: Record<Runner, object> = {
  vitest: { numTotalTests: 1, numFailedTests: 0, success: true, testResults: [{ name: "tests/used.test.js", status: "passed", assertionResults: [{ fullName: "used", status: "passed" }] }] },
  jest: { success: true, numTotalTests: 1, numFailedTests: 0, testResults: [{ name: "tests/used.test.js", status: "passed", assertionResults: [{ fullName: "used", status: "passed" }] }] },
};

const FAILING: Record<Runner, object> = {
  vitest: { numTotalTests: 1, numFailedTests: 1, success: false, testResults: [{ name: "tests/used.test.js", status: "failed", assertionResults: [{ fullName: "used", status: "failed" }] }] },
  jest: { success: false, numTotalTests: 1, numFailedTests: 1, testResults: [{ name: "tests/used.test.js", status: "failed", assertionResults: [{ fullName: "used", status: "failed" }] }] },
};

function run(root: string, file: string, argv: readonly string[]): void {
  const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
}

/** A repository whose test runner writes the given results, then exits with the given code. */
function repository(runner: Runner, results: object, exitCode: number): string {
  const root = mkdtempSync(join(tmpdir(), `ascout-exit-contradicts-${runner}-`));
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "node_modules", "fake-runner"), { recursive: true });
  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");

  if (runner === "vitest") {
    mkdirSync(join(root, "node_modules", "vitest"), { recursive: true });
    mkdirSync(join(root, "node_modules", "@vitest", "coverage-v8"), { recursive: true });
    writeFileSync(join(root, "package.json"), JSON.stringify({
      name: "exit-contradicts-vitest",
      private: true,
      type: "module",
      devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" },
    }));
    writeFileSync(join(root, "node_modules", "vitest", "package.json"), JSON.stringify({ name: "vitest", version: "4.1.10" }));
    writeFileSync(join(root, "node_modules", "@vitest", "coverage-v8", "package.json"), JSON.stringify({ name: "@vitest/coverage-v8", version: "4.1.10" }));
  } else {
    mkdirSync(join(root, "node_modules", "jest"), { recursive: true });
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "exit-contradicts-jest", private: true, devDependencies: { jest: "30.4.2" } }));
    writeFileSync(join(root, "jest.config.cjs"), "module.exports = { testEnvironment: 'node' };\n");
    writeFileSync(join(root, "node_modules", "jest", "package.json"), JSON.stringify({ name: "jest", version: "30.4.2" }));
  }

  const coverageFlag = runner === "vitest" ? "--coverage.reportsDirectory=" : "--coverageDirectory=";
  const fakeRunner = [
    'import { mkdirSync, writeFileSync } from "node:fs";',
    'import { dirname } from "node:path";',
    'const output = process.argv.find((arg) => arg.startsWith("--outputFile="))?.slice("--outputFile=".length);',
    `const coverageDir = process.argv.find((arg) => arg.startsWith(${JSON.stringify(coverageFlag)}))?.slice(${coverageFlag.length});`,
    "if (!output || !coverageDir) process.exit(64);",
    "mkdirSync(dirname(output), { recursive: true });",
    "mkdirSync(coverageDir, { recursive: true });",
    `writeFileSync(output, ${JSON.stringify(JSON.stringify(results))});`,
    `writeFileSync(coverageDir + "/lcov.info", ${JSON.stringify(LCOV)});`,
    `process.exit(${exitCode});`,
  ].join("\n");
  writeFileSync(join(root, "node_modules", "fake-runner", "index.mjs"), `${fakeRunner}\n`);
  writePackageNodeCommandShim(join(root, "node_modules", ".bin"), runner, "../fake-runner/index.mjs");

  const source = runner === "vitest" ? "export function used() { return 2; }\n" : "exports.used = function used() { return 2; };\n";
  writeFileSync(join(root, "src", "used.js"), source);
  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.name", "Ascout Exit Fixture"]);
  run(root, "git", ["config", "user.email", "exit@example.invalid"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["commit", "-qm", "baseline"]);
  writeFileSync(join(root, "src", "used.js"), source.replace("return 2", "return 1 + 1"));
  return root;
}

describe("machineResultRecordsFailure", () => {
  it.each([
    ["a Vitest result with no failure fields", { numTotalTests: 1, testResults: [] }],
    ["a passing Jest result", PASSING.jest],
    ["skipped and todo tests only", { success: true, testResults: [{ name: "t", status: "passed", assertionResults: [{ status: "pending" }, { status: "todo" }, { status: "skipped" }] }] }],
    ["zero failure counts", { success: true, numFailedTests: 0, numFailedTestSuites: 0, numRuntimeErrorTestSuites: 0, testResults: [] }],
  ])("finds no failure in %s", (_label, result) => {
    expect(machineResultRecordsFailure(JSON.stringify(result))).toBe(false);
  });

  it.each([
    ["success false", { success: false, testResults: [] }],
    ["a failed test count", { numFailedTests: 1, testResults: [] }],
    ["a failed suite count", { numFailedTestSuites: 1, testResults: [] }],
    ["a suite that errored at runtime", { numRuntimeErrorTestSuites: 1, testResults: [] }],
    ["an interrupted run", { wasInterrupted: true, testResults: [] }],
    ["a failed suite with no assertions", { testResults: [{ name: "t", status: "failed", assertionResults: [] }] }],
    ["one failed assertion among passes", { testResults: [{ name: "t", status: "passed", assertionResults: [{ status: "passed" }, { status: "failed" }] }] }],
  ])("finds a failure in %s", (_label, result) => {
    expect(machineResultRecordsFailure(JSON.stringify(result))).toBe(true);
  });

  it.each(["not json", "[]", "null", "3"])("treats %j as a failure", (text) => {
    expect(machineResultRecordsFailure(text)).toBe(true);
  });
});

describe("check when the test runner's exit code contradicts its results", () => {
  it.each(["vitest", "jest"] as const)("does not pass %s when it exits 0 but records a failure", async (runner) => {
    const root = repository(runner, FAILING[runner], 0);
    try {
      const { receipt } = await runCheck(root);
      const testTask = receipt.tasks.find(({ task_type }) => task_type === "test");
      expect(testTask).toMatchObject({ status: "ERROR", reason_code: "test_exit_contradicts_results", exit_code: 0 });
      expect(receipt.summary).toMatchObject({ completeness: "unknown_due_to_error", exit_code: 2 });
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);

  it.each(["vitest", "jest"] as const)("still passes %s when it exits 0 and records no failure", async (runner) => {
    const root = repository(runner, PASSING[runner], 0);
    try {
      const { receipt } = await runCheck(root);
      const testTask = receipt.tasks.find(({ task_type }) => task_type === "test");
      expect(testTask).toMatchObject({ status: "PASS", reason_code: null });
      expect(receipt.summary).toMatchObject({ completeness: "complete", exit_code: 0 });
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);
});
