import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";
import { writePackageNodeCommandShim } from "./helpers/native-command-shim.js";

// Istanbul writes an empty record for a file with no statements, such as a types-only module.
const LCOV = "SF:src/used.js\nDA:1,1\nend_of_record\nSF:src/types.js\nend_of_record\n";

function run(root: string, file: string, argv: readonly string[]): void {
  const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
}

/** A Vitest repository whose stand-in runner passes and reports LCOV with an empty record. */
function repository(changes: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-lcov-empty-record-"));
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "node_modules", "vitest"), { recursive: true });
  mkdirSync(join(root, "node_modules", "@vitest", "coverage-v8"), { recursive: true });
  mkdirSync(join(root, "node_modules", "fake-runner"), { recursive: true });
  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
  writeFileSync(join(root, "package.json"), JSON.stringify({
    name: "lcov-empty-record-fixture",
    private: true,
    type: "module",
    devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" },
  }));
  writeFileSync(join(root, "node_modules", "vitest", "package.json"), JSON.stringify({ name: "vitest", version: "4.1.10" }));
  writeFileSync(join(root, "node_modules", "@vitest", "coverage-v8", "package.json"), JSON.stringify({ name: "@vitest/coverage-v8", version: "4.1.10" }));
  const fakeRunner = [
    'import { mkdirSync, writeFileSync } from "node:fs";',
    'import { dirname } from "node:path";',
    'const output = process.argv.find((arg) => arg.startsWith("--outputFile="))?.slice("--outputFile=".length);',
    'const coverageDir = process.argv.find((arg) => arg.startsWith("--coverage.reportsDirectory="))?.slice("--coverage.reportsDirectory=".length);',
    "if (!output || !coverageDir) process.exit(64);",
    "mkdirSync(dirname(output), { recursive: true });",
    "mkdirSync(coverageDir, { recursive: true });",
    'writeFileSync(output, JSON.stringify({ numTotalTests: 1, testResults: [] }));',
    `writeFileSync(coverageDir + "/lcov.info", ${JSON.stringify(LCOV)});`,
  ].join("\n");
  writeFileSync(join(root, "node_modules", "fake-runner", "index.mjs"), `${fakeRunner}\n`);
  writePackageNodeCommandShim(join(root, "node_modules", ".bin"), "vitest", "../fake-runner/index.mjs");

  writeFileSync(join(root, "src", "used.js"), "export function used() { return 2; }\n");
  writeFileSync(join(root, "src", "types.js"), "// types only\n");
  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.name", "Ascout LCOV Fixture"]);
  run(root, "git", ["config", "user.email", "lcov@example.invalid"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["commit", "-qm", "baseline"]);
  for (const [path, content] of Object.entries(changes)) writeFileSync(join(root, path), content);
  return root;
}

describe("check when coverage holds a record with no line data", () => {
  it("keeps the run's evidence instead of erroring", async () => {
    const root = repository({ "src/used.js": "export function used() { return 1 + 1; }\n" });
    try {
      const { receipt } = await runCheck(root);
      expect(receipt.tasks.find(({ task_id }) => task_id === "test")).toMatchObject({ status: "PASS" });
      expect(receipt.exercise.records).toEqual([
        { path: "src/used.js", line: 1, state: "EXERCISED", execution_count: 1, source_task_ids: ["test"] },
      ]);
      expect(receipt.summary).toMatchObject({ completeness: "complete", exit_code: 0 });
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  it("still leaves a changed file without line data unresolved", async () => {
    const root = repository({ "src/types.js": "// types only, edited\n" });
    try {
      const { receipt } = await runCheck(root);
      expect(receipt.exercise.records).toEqual([
        { path: "src/types.js", line: 1, state: "UNRESOLVED", execution_count: null, source_task_ids: ["test"], reason: "coverage_source_mapping_unresolved" },
      ]);
      expect(receipt.summary).toMatchObject({ exit_code: 4 });
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});
