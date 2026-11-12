import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it, vi } from "vitest";

import { emptyRelatedWideningPlanV1, runCheck, vitestSelectedNoTest } from "../src/check.js";
import type { GitChangedFile } from "../src/git.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";
import { POST_RUN_EXERCISE_GAP_TRIGGER } from "../src/selection.js";
import { writeNodeCommandShim } from "./helpers/native-command-shim.js";

// A changed JS file that no test imports (for example a release script) makes `vitest related` find
// no test: it exits 0 and writes no machine result. That is a selection that observed nothing, so
// `check` widens to one full pass and judges the task on it, instead of reporting an integrity
// error. A full pass without evidence, malformed evidence, or a failing exit never widen this way.
vi.setConfig({ testTimeout: 300_000 });

function run(root: string, file: string, argv: readonly string[]): void {
  const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
}

/** related: what the narrowed pass does; full: what the full pass does. */
type PassBehavior = "nothing" | "zero" | "zero-but-counted" | "valid" | "malformed" | "fail-nothing" | "fail" | "hidden-failure" | "json-no-lcov";

function fixture(related: PassBehavior, full: PassBehavior, changed: "script" | "declaration" = "script"): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-empty-related-"));
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "scripts"), { recursive: true });
  cpSync(resolve("node_modules"), join(root, "node_modules"), { recursive: true });
  const binRoot = join(root, "node_modules", ".bin");
  rmSync(binRoot, { recursive: true, force: true });
  writeNodeCommandShim(
    binRoot,
    "vitest",
    `const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
const behavior = args.includes("related") ? ${JSON.stringify(related)} : ${JSON.stringify(full)};
const outputArg = args.find((arg) => arg.startsWith("--outputFile="));
const coverageArg = args.find((arg) => arg.startsWith("--coverage.reportsDirectory="));
if (!outputArg || !coverageArg) process.exit(2);
const outputPath = outputArg.slice("--outputFile=".length);
const coverageDirectory = coverageArg.slice("--coverage.reportsDirectory=".length);
if (behavior === "nothing") { process.stdout.write("No test files found, exiting with code 0\\n"); process.exit(0); }
if (behavior === "fail-nothing") { process.stdout.write("boom\\n"); process.exit(1); }
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(coverageDirectory, { recursive: true });
// What real Vitest writes when related selection finds no test: a zero-test result and an empty LCOV.
if (behavior === "zero") { fs.writeFileSync(outputPath, JSON.stringify({ numTotalTestSuites: 0, numTotalTests: 0, success: true, testResults: [] })); fs.writeFileSync(path.join(coverageDirectory, "lcov.info"), ""); process.exit(0); }
// A result claiming tests ran, with empty coverage: not an empty selection, so no widening.
if (behavior === "zero-but-counted") { fs.writeFileSync(outputPath, JSON.stringify({ numTotalTests: 3, success: true, testResults: [] })); fs.writeFileSync(path.join(coverageDirectory, "lcov.info"), ""); process.exit(0); }
if (behavior === "malformed") { fs.writeFileSync(outputPath, "{not json"); process.exit(0); }
const failing = behavior === "fail" || behavior === "hidden-failure";
const result = failing
  ? { success: false, numFailedTests: 1, numFailedTestSuites: 1, testResults: [{ name: "full.test.js", status: "failed", assertionResults: [{ fullName: "release works", status: "failed" }] }] }
  : { testResults: [{ name: "full.test.js" }] };
fs.writeFileSync(outputPath, JSON.stringify(result));
if (behavior === "json-no-lcov") process.exit(0);
const lcov = ["src/a.js", "scripts/release.mjs"].map((source) => "SF:" + source + "\\nDA:1,1\\nend_of_record\\n").join("");
fs.writeFileSync(path.join(coverageDirectory, "lcov.info"), lcov);
process.stdout.write("full\\n");
process.exit(behavior === "fail" ? 1 : 0);
`,
  );
  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "empty-related-fixture", private: true, type: "module", devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" } }));
  writeFileSync(join(root, "vitest.config.mjs"), "export default { test: { globals: true } };\n");
  writeFileSync(join(root, "src", "a.js"), "export const a = 1;\n");
  writeFileSync(join(root, "scripts", "release.mjs"), "export const version = 1;\n");
  writeFileSync(join(root, "src", "types.d.ts"), "export type A = 1;\n");
  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.name", "Ascout Empty Related Fixture"]);
  run(root, "git", ["config", "user.email", "empty-related@example.invalid"]);
  run(root, "git", ["config", "commit.gpgsign", "false"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["commit", "-qm", "baseline"]);
  // Only one file changes, and no test relates to it.
  if (changed === "script") writeFileSync(join(root, "scripts", "release.mjs"), "export const version = 2;\n");
  else writeFileSync(join(root, "src", "types.d.ts"), "export type A = 2;\n");
  return root;
}

async function check(related: PassBehavior, full: PassBehavior, changed: "script" | "declaration" = "script") {
  const root = fixture(related, full, changed);
  try {
    const { receipt } = await runCheck(root);
    expect(validateReceiptSemantics(receipt).valid).toBe(true);
    return { receipt, test: receipt.tasks.find((task) => task.task_id === "test")! };
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

describe("check: a narrowed Vitest pass that selects no test", () => {
  it("widens what real Vitest writes for an empty selection: a zero-test result and empty LCOV", async () => {
    const { receipt, test } = await check("zero", "valid");
    expect(test).toMatchObject({ status: "PASS", reason_code: null, exit_code: 0 });
    expect(receipt.selection.passes.map((pass) => pass.mode)).toEqual(["native_related", "full"]);
    expect(receipt.selection.widen_triggers).toEqual([POST_RUN_EXERCISE_GAP_TRIGGER]);
  });

  it("never widens a result that counts tests, even with empty coverage", async () => {
    const { receipt, test } = await check("zero-but-counted", "valid");
    expect(test).toMatchObject({ status: "ERROR", reason_code: "vitest_evidence_invalid" });
    expect(receipt.selection.passes).toHaveLength(1);
  });

  it("widens to one full pass, and judges the test task on that pass", async () => {
    const { receipt, test } = await check("nothing", "valid");
    expect(test.status).toBe("PASS");
    expect(test.reason_code).toBeNull();
    expect(test.exit_code).toBe(0);
    expect(receipt.selection.widened).toBe(true);
    expect(receipt.selection.widen_triggers).toEqual([POST_RUN_EXERCISE_GAP_TRIGGER]);
    expect(receipt.selection.passes.map((pass) => pass.mode)).toEqual(["native_related", "full"]);
    // The empty narrowed pass stays on record: its captured output is among the task's evidence.
    expect(test.evidence_ids.length).toBeGreaterThan(2);
    expect([0, 4]).toContain(receipt.summary.exit_code);
  });

  it("stays ERROR when the full pass also leaves no evidence", async () => {
    const { receipt, test } = await check("nothing", "nothing");
    expect(test).toMatchObject({ status: "ERROR", reason_code: "vitest_evidence_invalid" });
    // The widening did run; its full pass also had no evidence.
    expect(receipt.selection.passes.map((pass) => pass.mode)).toEqual(["native_related", "full"]);
    expect(receipt.summary.exit_code).toBe(2);
  });

  it("never widens on malformed evidence", async () => {
    const { receipt, test } = await check("malformed", "valid");
    expect(test).toMatchObject({ status: "ERROR", reason_code: "vitest_evidence_invalid" });
    expect(receipt.selection.passes).toHaveLength(1);
  });

  it("never widens when the narrowed pass exits non-zero without evidence", async () => {
    const { receipt, test } = await check("fail-nothing", "valid");
    expect(test.status).toBe("ERROR");
    expect(receipt.selection.passes).toHaveLength(1);
  });

  it("reports a failing full pass as FAIL, exit 1", async () => {
    const { receipt, test } = await check("nothing", "fail");
    expect(["FAIL", "FLAKY"]).toContain(test.status);
    expect(receipt.selection.passes.map((pass) => pass.mode)).toEqual(["native_related", "full"]);
    expect(receipt.summary.exit_code).toBe(1);
  });

  it("keeps the hidden-failure rule on the full pass: exit 0 with a recorded failure is ERROR", async () => {
    const { receipt, test } = await check("nothing", "hidden-failure");
    expect(test).toMatchObject({ status: "ERROR", reason_code: "test_exit_contradicts_results" });
    expect(receipt.summary.exit_code).toBe(2);
  });

  it("never widens when the machine result is present but LCOV is missing", async () => {
    const { receipt, test } = await check("json-no-lcov", "valid");
    expect(test).toMatchObject({ status: "ERROR", reason_code: "vitest_evidence_invalid" });
    expect(receipt.selection.passes).toHaveLength(1);
  });

  it("does not widen when only a declaration file changed, and fails safe as ERROR", async () => {
    const { receipt, test } = await check("nothing", "valid", "declaration");
    expect(test).toMatchObject({ status: "ERROR", reason_code: "vitest_evidence_invalid" });
    expect(receipt.selection.passes).toHaveLength(1);
  });
});

describe("the empty-related widening helpers", () => {
  const changed = (path: string): GitChangedFile => ({ path, change_kind: "modified", line_semantics: "text", changed_new_line_ranges: [[1, 1]] }) as unknown as GitChangedFile;

  it("plans no full pass without a changed production source, or when the full pass can't be planned", () => {
    const planned = { state: "planned" } as never;
    const notRun = { state: "not_run" } as never;
    expect(emptyRelatedWideningPlanV1([changed("src/types.d.ts")], () => planned)).toBeNull();
    expect(emptyRelatedWideningPlanV1([changed("scripts/release.mjs")], () => notRun)).toBeNull();
    const seen: string[][] = [];
    expect(emptyRelatedWideningPlanV1([changed("scripts/release.mjs")], (files) => { seen.push(files.map((file) => file.path)); return planned; })).toBe(planned);
    expect(seen).toEqual([["scripts/release.mjs"]]);
  });

  it("never calls a machine result absent when the plan has no machine-result path", () => {
    expect(vitestSelectedNoTest("001-abc", tmpdir(), { machineResultPath: null })).toBe(false);
  });
});
