import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";
import { SELECTION_COUNTS_NOT_OBSERVED_LIMITATION } from "../src/selection.js";

function run(root: string, file: string, argv: readonly string[]): void {
  const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
}

function initializeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-t054-jest-check-"));
  mkdirSync(join(root, "src"), { recursive: true });
  cpSync(resolve("node_modules"), join(root, "node_modules"), { recursive: true });

  const binRoot = join(root, "node_modules", ".bin");
  rmSync(binRoot, { recursive: true, force: true });
  mkdirSync(binRoot, { recursive: true });
  const jestShim = join(binRoot, "jest");
  writeFileSync(
    jestShim,
    `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
const outputArg = args.find((arg) => arg.startsWith("--outputFile="));
const coverageArg = args.find((arg) => arg.startsWith("--coverageDirectory="));
if (!outputArg || !coverageArg) process.exit(2);
const outputPath = outputArg.slice("--outputFile=".length);
const coverageDirectory = coverageArg.slice("--coverageDirectory=".length);
const related = args.includes("--findRelatedTests");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(coverageDirectory, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify({ success: true, testResults: [{ name: related ? "narrow.test.js" : "full.test.js" }] }));
const paths = related ? ["src/a.js"] : ["src/a.js", "src/b.js"];
const lcov = paths.map((source) => "SF:" + source + "\\nDA:1,1\\nend_of_record\\n").join("");
fs.writeFileSync(path.join(coverageDirectory, "lcov.info"), lcov);
process.stdout.write(related ? "narrow\\n" : "full\\n");
`,
  );
  chmodSync(jestShim, 0o755);

  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "t054-jest-check-fixture",
      private: true,
      type: "module",
      devDependencies: { jest: "30.4.2" },
    }),
  );
  writeFileSync(join(root, "jest.config.js"), "export default { testEnvironment: 'node' };\n");
  writeFileSync(join(root, "src", "a.js"), "export const a = 1;\n");
  writeFileSync(join(root, "src", "b.js"), "export const b = 2;\n");

  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.name", "Ascout T054 Jest Fixture"]);
  run(root, "git", ["config", "user.email", "t054-jest@example.invalid"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["commit", "-qm", "baseline"]);

  writeFileSync(join(root, "src", "a.js"), "export const a = 11;\n");
  writeFileSync(join(root, "src", "b.js"), "export const b = 22;\n");
  return root;
}

describe("T054 Jest runCheck bounded post-run widening", () => {
  it("runs exactly one full second pass when narrowed Jest LCOV misses a changed production source", async () => {
    const root = initializeFixture();
    try {
      const outcome = await runCheck(root);
      const receipt = outcome.receipt;

      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
      expect(receipt.selection).toMatchObject({
        mode: "full",
        widened: true,
        widen_triggers: ["post_run_exercise_gap"],
      });
      expect(receipt.selection.passes).toEqual([
        expect.objectContaining({ ordinal: 1, mode: "native_related", trigger: null }),
        expect.objectContaining({ ordinal: 2, mode: "full", trigger: "post_run_exercise_gap" }),
      ]);

      const task = receipt.tasks.find(({ task_type }) => task_type === "test");
      expect(task).toMatchObject({ status: "PASS", observations: { runs: 2, failures: 0 } });
      expect(task?.argv).not.toContain("--findRelatedTests");

      const evidenceSequences = receipt.evidence
        .filter(({ task_id }) => task_id === "test")
        .map(({ sequence }) => sequence);
      expect(evidenceSequences).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(new Set(receipt.evidence.map(({ evidence_id }) => evidence_id)).size).toBe(receipt.evidence.length);
      expect(new Set(receipt.artifacts.map(({ artifact_id }) => artifact_id)).size).toBe(receipt.artifacts.length);

      const firstMachine = receipt.artifacts.find(({ artifact_id }) => artifact_id === "test.jest-results");
      const secondMachine = receipt.artifacts.find(({ artifact_id }) => artifact_id === "test.pass-2.jest-results");
      const secondCoverage = receipt.artifacts.find(({ artifact_id }) => artifact_id === "test.pass-2.lcov");
      expect(firstMachine?.relative_run_path).toBe("raw/test/jest-results.json");
      expect(secondMachine?.relative_run_path).toBe("raw/test/pass-2/jest-results.json");
      expect(secondCoverage?.relative_run_path).toBe("raw/test/pass-2/coverage/lcov.info");
      expect(secondCoverage && existsSync(join(root, ".ascout", "runs", receipt.run.run_id, secondCoverage.relative_run_path))).toBe(true);
      expect(readFileSync(join(root, ".ascout", "runs", receipt.run.run_id, secondCoverage!.relative_run_path), "utf8")).toContain("SF:src/b.js");

      expect(receipt.selection.selected_test_count).toBeNull();
      expect(receipt.selection.deselected_test_count).toBeNull();
      expect(receipt.selection.total_test_count).toBeNull();
      expect(receipt.selection.limitations).toEqual([SELECTION_COUNTS_NOT_OBSERVED_LIMITATION]);
      expect(receipt.summary.completeness).toBe("complete");
      expect(receipt.summary.exit_code).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});
