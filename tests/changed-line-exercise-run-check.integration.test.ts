import { chmodSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";

function run(root: string, file: string, argv: readonly string[]): void {
  const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
}

function initializeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-t055-check-"));
  mkdirSync(join(root, "src"), { recursive: true });
  cpSync(resolve("node_modules"), join(root, "node_modules"), { recursive: true });

  const binRoot = join(root, "node_modules", ".bin");
  rmSync(binRoot, { recursive: true, force: true });
  mkdirSync(binRoot, { recursive: true });
  const vitestShim = join(binRoot, "vitest");
  writeFileSync(
    vitestShim,
    `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
const outputArg = args.find((arg) => arg.startsWith("--outputFile="));
const coverageArg = args.find((arg) => arg.startsWith("--coverage.reportsDirectory="));
if (!outputArg || !coverageArg) process.exit(2);
const outputPath = outputArg.slice("--outputFile=".length);
const coverageDirectory = coverageArg.slice("--coverage.reportsDirectory=".length);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(coverageDirectory, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify({ testResults: [{ name: "exercise.test.js" }] }));
fs.writeFileSync(path.join(coverageDirectory, "lcov.info"), "SF:src/a.js\\nDA:1,1\\nDA:2,0\\nend_of_record\\n");
`,
  );
  chmodSync(vitestShim, 0o755);

  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "t055-exercise-check-fixture",
      private: true,
      type: "module",
      devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" },
    }),
  );
  writeFileSync(join(root, "vitest.config.mjs"), "export default { test: { globals: true } };\n");
  writeFileSync(join(root, "src", "a.js"), "export const covered = 1;\nexport const missed = 2;\n");
  writeFileSync(join(root, "src", "b.js"), "export const unmapped = 3;\n");

  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.name", "Ascout T055 Fixture"]);
  run(root, "git", ["config", "user.email", "t055@example.invalid"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["commit", "-qm", "baseline"]);

  writeFileSync(join(root, "src", "a.js"), "export const covered = 11;\nexport const missed = 22;\n");
  writeFileSync(join(root, "src", "b.js"), "export const unmapped = 33;\n");
  return root;
}

describe("T055 runCheck changed-line exercise", () => {
  it("emits exercised, not-exercised, and unresolved changed executable lines from final coverage", async () => {
    const root = initializeFixture();
    try {
      const receipt = (await runCheck(root)).receipt;

      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
      expect(receipt.selection).toMatchObject({ mode: "full", widened: true });
      expect(receipt.selection.passes).toHaveLength(2);
      expect(receipt.tasks.find(({ task_type }) => task_type === "test")).toMatchObject({
        status: "PASS",
        observations: { runs: 2, failures: 0 },
      });

      expect(receipt.exercise.records).toEqual([
        {
          path: "src/a.js",
          line: 1,
          state: "EXERCISED",
          execution_count: 1,
          source_task_ids: ["test"],
        },
        {
          path: "src/a.js",
          line: 2,
          state: "NOT_EXERCISED",
          execution_count: 0,
          source_task_ids: ["test"],
        },
        {
          path: "src/b.js",
          line: 1,
          state: "UNRESOLVED",
          execution_count: null,
          source_task_ids: ["test"],
          reason: "coverage_source_mapping_unresolved",
        },
      ]);
      expect(receipt.exercise).toMatchObject({
        changed_executable_lines: 3,
        exercised_lines: 1,
        not_exercised_lines: 1,
        unresolved_lines: 1,
        changed_files_with_zero_exercised_lines: 1,
      });
      expect(receipt.summary.completeness).toBe("materially_incomplete");
      expect(receipt.summary.exit_code).toBe(4);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});
