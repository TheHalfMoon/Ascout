import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";
import { writeNodeCommandShim } from "./helpers/native-command-shim.js";

function run(root: string, file: string, argv: readonly string[]): void {
  const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
}

function initializeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-t061-selection-"));
  mkdirSync(join(root, "src"), { recursive: true });
  cpSync(resolve("node_modules"), join(root, "node_modules"), { recursive: true });
  const binRoot = join(root, "node_modules", ".bin");
  rmSync(binRoot, { recursive: true, force: true });
  writeNodeCommandShim(
    binRoot,
    "vitest",
    `const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
const outputArg = args.find((arg) => arg.startsWith("--outputFile="));
const coverageArg = args.find((arg) => arg.startsWith("--coverage.reportsDirectory="));
if (!outputArg || !coverageArg) process.exit(2);
const outputPath = outputArg.slice("--outputFile=".length);
const coverageDirectory = coverageArg.slice("--coverage.reportsDirectory=".length);
const related = args.includes("related");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(coverageDirectory, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify({ numTotalTests: related ? 1 : 2, testResults: related ? [{ name: "narrow.test.js" }] : [{ name: "narrow.test.js" }, { name: "other.test.js" }] }));
const paths = related ? ["src/a.js"] : ["src/a.js", "src/b.js"];
fs.writeFileSync(path.join(coverageDirectory, "lcov.info"), paths.map((source) => "SF:" + source + "\\nDA:1,1\\nend_of_record\\n").join(""));
`,
  );
  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "t061-selection-fixture", private: true, type: "module", devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" } }));
  writeFileSync(join(root, "vitest.config.mjs"), "export default { test: { globals: true } };\n");
  writeFileSync(join(root, "src", "a.js"), "export const a = 1;\n");
  writeFileSync(join(root, "src", "b.js"), "export const b = 2;\n");
  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.name", "Ascout T061 Fixture"]);
  run(root, "git", ["config", "user.email", "t061@example.invalid"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["commit", "-qm", "baseline"]);
  writeFileSync(join(root, "src", "a.js"), "export const a = 11;\n");
  writeFileSync(join(root, "src", "b.js"), "export const b = 22;\n");
  return root;
}

describe("T061 runCheck SelectionAccount finalization", () => {
  it("uses the one bounded full pass to close related-pass counts without guessing", async () => {
    const root = initializeFixture();
    try {
      const receipt = (await runCheck(root)).receipt;
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
      expect(receipt.selection).toEqual({
        mode: "full",
        initial_scope: { kind: "repository", path: null },
        selected_test_count: 2,
        deselected_test_count: 0,
        total_test_count: 2,
        widened: true,
        widen_triggers: ["post_run_exercise_gap"],
        passes: [
          { ordinal: 1, mode: "native_related", scope: { kind: "repository", path: null }, trigger: null, selected_test_count: 1, deselected_test_count: 1, total_test_count: 2 },
          { ordinal: 2, mode: "full", scope: { kind: "repository", path: null }, trigger: "post_run_exercise_gap", selected_test_count: 2, deselected_test_count: 0, total_test_count: 2 },
        ],
        limitations: [],
      });
      expect(receipt.selection.passes).toHaveLength(2);
      expect(receipt.summary.completeness).toBe("complete");
      expect(receipt.summary.exit_code).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
});
