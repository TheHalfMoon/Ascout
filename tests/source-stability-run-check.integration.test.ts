import { chmodSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";

function run(root: string, file: string, argv: readonly string[]): void {
  const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
}

function initializeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-t062-source-stability-"));
  mkdirSync(join(root, "src"), { recursive: true });
  cpSync(resolve("node_modules"), join(root, "node_modules"), { recursive: true });
  const binRoot = join(root, "node_modules", ".bin");
  rmSync(binRoot, { recursive: true, force: true });
  mkdirSync(binRoot, { recursive: true });

  const vitestShim = join(binRoot, "vitest");
  writeFileSync(vitestShim, `#!/usr/bin/env node
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
fs.writeFileSync(outputPath, JSON.stringify({ numTotalTests: 1, testResults: [{ name: "a.test.js" }] }));
fs.writeFileSync(path.join(coverageDirectory, "lcov.info"), "SF:src/a.js\\nDA:1,1\\nend_of_record\\n");
fs.writeFileSync(path.join(process.cwd(), "src", "a.js"), "export const a = 12;\\n");
`);
  chmodSync(vitestShim, 0o755);
  writeFileSync(join(binRoot, "vitest.cmd"), "@echo off\r\nnode \"%~dp0vitest\" %*\r\n");

  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
  writeFileSync(join(root, "package.json"), JSON.stringify({
    name: "t062-source-stability-fixture",
    private: true,
    type: "module",
    devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" },
  }));
  writeFileSync(join(root, "vitest.config.mjs"), "export default { test: { globals: true } };\n");
  writeFileSync(join(root, "src", "a.js"), "export const a = 1;\n");

  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.name", "Ascout T062 Fixture"]);
  run(root, "git", ["config", "user.email", "t062@example.invalid"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["commit", "-qm", "baseline"]);

  writeFileSync(join(root, "src", "a.js"), "export const a = 11;\n");
  return root;
}

describe("T062 runCheck source stability finalization", () => {
  it("rehashes source at the end and reports drift independently from completeness", async () => {
    const root = initializeFixture();
    try {
      const receipt = (await runCheck(root)).receipt;

      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
      expect(receipt.source.end).not.toBeNull();
      expect(receipt.source.start.repository_id).toBe(receipt.source.end!.repository_id);
      expect(receipt.source.start.tree_digest).not.toBe(receipt.source.end!.tree_digest);
      expect(receipt.source.start.unstaged_changed_count).toBe(1);
      expect(receipt.source.end!.unstaged_changed_count).toBe(1);
      expect(receipt.stability).toBe("tree_drifted");

      const testTask = receipt.tasks.find((task) => task.task_type === "test");
      expect(testTask?.status).toBe("PASS");
      expect(receipt.exercise).toMatchObject({
        changed_executable_lines: 1,
        exercised_lines: 1,
        not_exercised_lines: 0,
        unresolved_lines: 0,
      });
      expect(receipt.summary.completeness).toBe("complete");
      expect(receipt.summary.exit_code).toBe(3);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
});
