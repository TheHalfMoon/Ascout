import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it, vi } from "vitest";

import { runCheck } from "../src/check.js";
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
type PassBehavior = "nothing" | "valid" | "malformed" | "fail-nothing";

function fixture(related: PassBehavior, full: PassBehavior): string {
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
if (behavior === "malformed") { fs.writeFileSync(outputPath, "{not json"); process.exit(0); }
fs.writeFileSync(outputPath, JSON.stringify({ testResults: [{ name: "full.test.js" }] }));
const lcov = ["src/a.js", "scripts/release.mjs"].map((source) => "SF:" + source + "\\nDA:1,1\\nend_of_record\\n").join("");
fs.writeFileSync(path.join(coverageDirectory, "lcov.info"), lcov);
process.stdout.write("full\\n");
`,
  );
  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "empty-related-fixture", private: true, type: "module", devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" } }));
  writeFileSync(join(root, "vitest.config.mjs"), "export default { test: { globals: true } };\n");
  writeFileSync(join(root, "src", "a.js"), "export const a = 1;\n");
  writeFileSync(join(root, "scripts", "release.mjs"), "export const version = 1;\n");
  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.name", "Ascout Empty Related Fixture"]);
  run(root, "git", ["config", "user.email", "empty-related@example.invalid"]);
  run(root, "git", ["config", "commit.gpgsign", "false"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["commit", "-qm", "baseline"]);
  // Only the script changes: no test relates to it.
  writeFileSync(join(root, "scripts", "release.mjs"), "export const version = 2;\n");
  return root;
}

async function check(related: PassBehavior, full: PassBehavior) {
  const root = fixture(related, full);
  try {
    const { receipt } = await runCheck(root);
    expect(validateReceiptSemantics(receipt).valid).toBe(true);
    return { receipt, test: receipt.tasks.find((task) => task.task_id === "test")! };
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

describe("check: a narrowed Vitest pass that selects no test", () => {
  it("widens to one full pass, and judges the test task on that pass", async () => {
    const { receipt, test } = await check("nothing", "valid");
    expect(test.status).toBe("PASS");
    expect(test.reason_code).toBeNull();
    expect(receipt.selection.widened).toBe(true);
    expect(receipt.selection.widen_triggers).toEqual([POST_RUN_EXERCISE_GAP_TRIGGER]);
    expect(receipt.selection.passes.map((pass) => pass.mode)).toEqual(["native_related", "full"]);
    expect(receipt.summary.exit_code).not.toBe(2);
  });

  it("stays ERROR when the full pass also leaves no evidence", async () => {
    const { receipt, test } = await check("nothing", "nothing");
    expect(test).toMatchObject({ status: "ERROR", reason_code: "vitest_evidence_invalid" });
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
});
