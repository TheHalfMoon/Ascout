import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it, vi } from "vitest";

import { jestSelectedNoTest, runCheck } from "../src/check.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";
import { POST_RUN_EXERCISE_GAP_TRIGGER } from "../src/selection.js";
import { writePackageNodeCommandShim } from "./helpers/native-command-shim.js";

// A changed JS file that no test imports makes `jest --findRelatedTests` find no test. Without
// --passWithNoTests, Jest exits 1 and, with piped output, exits before writing its machine result,
// so `check` reported an integrity error. The narrowed pass now passes --passWithNoTests: Jest exits
// 0 with a zero-test result and an empty LCOV file, and `check` widens to one full pass (which never
// gets the flag) and judges the task on it.
vi.setConfig({ testTimeout: 300_000 });

function run(root: string, file: string, argv: readonly string[]): void {
  const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
}

function commitThenChangeScript(root: string): void {
  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
  writeFileSync(join(root, "jest.config.cjs"), "module.exports = { testEnvironment: 'node' };\n");
  writeFileSync(join(root, "src", "used.js"), "exports.used = function used() { return 2; };\n");
  writeFileSync(join(root, "scripts", "release.js"), "exports.version = 1;\n");
  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.name", "Ascout Jest Empty Related Fixture"]);
  run(root, "git", ["config", "user.email", "jest-empty-related@example.invalid"]);
  run(root, "git", ["config", "commit.gpgsign", "false"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["commit", "-qm", "baseline"]);
  // Only one file changes, and no test relates to it.
  writeFileSync(join(root, "scripts", "release.js"), "exports.version = 2;\n");
}

/** A repository run by the real installed Jest 30.4.2. */
function realJestFixture(tests: "passing" | "failing" | "none"): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-jest-empty-related-"));
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "scripts"), { recursive: true });
  cpSync(resolve("node_modules"), join(root, "node_modules"), { recursive: true });
  const binRoot = join(root, "node_modules", ".bin");
  rmSync(binRoot, { recursive: true, force: true });
  writePackageNodeCommandShim(binRoot, "jest", "../jest/bin/jest.js");
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "jest-empty-related-fixture", private: true, devDependencies: { jest: "30.4.2" } }));
  if (tests !== "none") {
    mkdirSync(join(root, "tests"), { recursive: true });
    writeFileSync(
      join(root, "tests", "used.test.js"),
      `const { used } = require('../src/used.js');\ntest('used', () => { expect(used()).toBe(${tests === "passing" ? 2 : 3}); });\n`,
    );
  }
  commitThenChangeScript(root);
  return root;
}

/** related: what the narrowed pass does. The full pass always writes valid passing evidence. */
type FakeRelated = "zero" | "zero-exit-1" | "counted" | "suite-without-tests";

function fakeJestFixture(related: FakeRelated): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-jest-empty-related-fake-"));
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "node_modules", "jest"), { recursive: true });
  mkdirSync(join(root, "node_modules", "fake-jest"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "jest-empty-related-fake", private: true, devDependencies: { jest: "30.4.2" } }));
  writeFileSync(join(root, "node_modules", "jest", "package.json"), JSON.stringify({ name: "jest", version: "30.4.2" }));
  const zero = { numTotalTests: 0, numTotalTestSuites: 0, numFailedTestSuites: 0, numRuntimeErrorTestSuites: 0, success: true, testResults: [] };
  const fakeRunner = [
    'import { mkdirSync, writeFileSync } from "node:fs";',
    'import { dirname } from "node:path";',
    'const output = process.argv.find((arg) => arg.startsWith("--outputFile="))?.slice("--outputFile=".length);',
    'const coverageDir = process.argv.find((arg) => arg.startsWith("--coverageDirectory="))?.slice("--coverageDirectory=".length);',
    'if (!output || !coverageDir) process.exit(64);',
    'mkdirSync(dirname(output), { recursive: true });',
    'mkdirSync(coverageDir, { recursive: true });',
    'if (process.argv.includes("--findRelatedTests")) {',
    `  const related = ${JSON.stringify(related)};`,
    `  const zero = ${JSON.stringify(zero)};`,
    '  const result = related === "counted" ? { ...zero, numTotalTests: 2 } : related === "suite-without-tests" ? { ...zero, numTotalTestSuites: 1 } : zero;',
    '  writeFileSync(output, JSON.stringify(result));',
    '  writeFileSync(coverageDir + "/lcov.info", "");',
    '  process.exit(related === "zero-exit-1" ? 1 : 0);',
    '}',
    'writeFileSync(output, JSON.stringify({ success: true, numTotalTests: 1, testResults: [{ name: "tests/used.test.js" }] }));',
    'writeFileSync(coverageDir + "/lcov.info", "SF:src/used.js\\nDA:1,1\\nend_of_record\\nSF:scripts/release.js\\nDA:1,1\\nend_of_record\\n");',
  ].join("\n");
  writeFileSync(join(root, "node_modules", "fake-jest", "index.mjs"), `${fakeRunner}\n`);
  writePackageNodeCommandShim(join(root, "node_modules", ".bin"), "jest", "../fake-jest/index.mjs");
  commitThenChangeScript(root);
  return root;
}

async function check(root: string) {
  try {
    const { receipt } = await runCheck(root);
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    return { receipt, test: receipt.tasks.find((task) => task.task_id === "test")! };
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

describe("check: a narrowed real-Jest pass that selects no test", () => {
  it("widens to one full pass and judges the test task on it", async () => {
    const { receipt, test } = await check(realJestFixture("passing"));
    expect(test).toMatchObject({ status: "PASS", reason_code: null, exit_code: 0 });
    expect(receipt.selection.widened).toBe(true);
    expect(receipt.selection.widen_triggers).toEqual([POST_RUN_EXERCISE_GAP_TRIGGER]);
    expect(receipt.selection.passes.map((pass) => pass.mode)).toEqual(["native_related", "full"]);
    // The task's argv is the full pass's, which never passes with no tests.
    expect(test.argv).not.toContain("--findRelatedTests");
    expect(test.argv).not.toContain("--passWithNoTests");
    // No test exercises the changed script, so the run is complete only up to that gap.
    expect(receipt.summary.exit_code).toBe(4);
  });

  it("reports a failing full pass as FAIL, exit 1", async () => {
    const { receipt, test } = await check(realJestFixture("failing"));
    expect(["FAIL", "FLAKY"]).toContain(test.status);
    expect(receipt.selection.passes.map((pass) => pass.mode)).toEqual(["native_related", "full"]);
    expect(receipt.summary.exit_code).toBe(1);
  });

  it("never passes a project with no test at all: the full pass still fails closed", async () => {
    const { receipt, test } = await check(realJestFixture("none"));
    expect(test.status).not.toBe("PASS");
    expect(receipt.selection.passes.map((pass) => pass.mode)).toEqual(["native_related", "full"]);
    expect(receipt.summary.exit_code).not.toBe(0);
    expect(receipt.summary.exit_code).not.toBe(4);
  });
});

describe("check: guards on widening a narrowed Jest pass", () => {
  it("widens a zero-test result with empty LCOV and exit 0", async () => {
    const { receipt, test } = await check(fakeJestFixture("zero"));
    expect(test).toMatchObject({ status: "PASS", reason_code: null, exit_code: 0 });
    expect(receipt.selection.passes.map((pass) => pass.mode)).toEqual(["native_related", "full"]);
  });

  it("never widens a non-zero exit, even with a zero-test result", async () => {
    const { receipt, test } = await check(fakeJestFixture("zero-exit-1"));
    expect(test).toMatchObject({ status: "ERROR", reason_code: "jest_evidence_invalid", exit_code: 1 });
    expect(receipt.selection.passes).toHaveLength(1);
  });

  it("never widens a result that counts tests, even with empty coverage", async () => {
    const { receipt, test } = await check(fakeJestFixture("counted"));
    expect(test).toMatchObject({ status: "ERROR", reason_code: "jest_evidence_invalid", exit_code: 0 });
    expect(receipt.selection.passes).toHaveLength(1);
  });

  it("never widens a result that counts a suite, even with zero tests", async () => {
    const { receipt, test } = await check(fakeJestFixture("suite-without-tests"));
    expect(test).toMatchObject({ status: "ERROR", reason_code: "jest_evidence_invalid", exit_code: 0 });
    expect(receipt.selection.passes).toHaveLength(1);
  });
});

describe("jestSelectedNoTest", () => {
  const runId = "001794514710406-cb9579b26cab";
  const zero = { numTotalTests: 0, numTotalTestSuites: 0, numFailedTestSuites: 0, numRuntimeErrorTestSuites: 0, success: true, testResults: [] };

  it("is true only for a bounded regular file with a zero-test, zero-suite result", () => {
    const runPath = mkdtempSync(join(tmpdir(), "ascout-jest-zero-result-"));
    const plan = { machineResultPath: `.ascout/runs/${runId}/raw/test/jest-results.json` };
    const file = join(runPath, "raw", "test", "jest-results.json");
    try {
      expect(jestSelectedNoTest(runId, runPath, plan)).toBe(false); // absent
      mkdirSync(file, { recursive: true });
      expect(jestSelectedNoTest(runId, runPath, plan)).toBe(false); // a directory, not a file
      rmSync(file, { recursive: true });
      writeFileSync(file, JSON.stringify({ ...zero, pad: "x".repeat(1024 * 1024) }));
      expect(jestSelectedNoTest(runId, runPath, plan)).toBe(false); // oversized
      writeFileSync(file, JSON.stringify(zero));
      expect(jestSelectedNoTest(runId, runPath, plan)).toBe(true);
      for (const override of [
        { numTotalTests: 1 },
        { numTotalTestSuites: 1 },
        { numFailedTestSuites: 1 },
        { numRuntimeErrorTestSuites: 1 },
        { testResults: [{ name: "a.test.js" }] },
        { testResults: {} },
        { testResults: "" },
      ]) {
        writeFileSync(file, JSON.stringify({ ...zero, ...override }));
        expect(jestSelectedNoTest(runId, runPath, plan), JSON.stringify(override)).toBe(false);
      }
      const { numRuntimeErrorTestSuites: _omitted, ...missingCount } = zero;
      writeFileSync(file, JSON.stringify(missingCount));
      expect(jestSelectedNoTest(runId, runPath, plan)).toBe(false); // a count not reported
      for (const text of ["{not json", "[]", "null"]) {
        writeFileSync(file, text);
        expect(jestSelectedNoTest(runId, runPath, plan), text).toBe(false);
      }
    } finally {
      rmSync(runPath, { recursive: true, force: true });
    }
  });

  it("is false for a symbolic link, even to a zero-test result", (context) => {
    const runPath = mkdtempSync(join(tmpdir(), "ascout-jest-zero-link-"));
    const plan = { machineResultPath: `.ascout/runs/${runId}/raw/test/jest-results.json` };
    try {
      mkdirSync(join(runPath, "raw", "test"), { recursive: true });
      const target = join(runPath, "elsewhere.json");
      writeFileSync(target, JSON.stringify(zero));
      try {
        symlinkSync(target, join(runPath, "raw", "test", "jest-results.json"), "file");
      } catch (error) {
        // Creating a symbolic link needs a privilege some Windows accounts lack.
        if ((error as NodeJS.ErrnoException).code === "EPERM") return context.skip();
        throw error;
      }
      expect(jestSelectedNoTest(runId, runPath, plan)).toBe(false);
    } finally {
      rmSync(runPath, { recursive: true, force: true });
    }
  });

  it("is false when the plan has no machine-result path", () => {
    expect(jestSelectedNoTest(runId, tmpdir(), { machineResultPath: null })).toBe(false);
  });
});
