import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { normalizeLcovLineCoverage } from "../src/coverage/lcov.js";
import { UNSAFE_SELECTION_LIMITATION, validateReceiptSemantics } from "../src/receipt/model.js";
import { SELECTION_COUNTS_NOT_OBSERVED_LIMITATION } from "../src/selection.js";
import { writePackageNodeCommandShim } from "./helpers/native-command-shim.js";

function run(root: string, file: string, argv: readonly string[]): void {
  const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
}

function initializeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-t051-check-"));
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "tests"), { recursive: true });
  cpSync(resolve("node_modules"), join(root, "node_modules"), { recursive: true });
  const binRoot = join(root, "node_modules", ".bin");
  rmSync(binRoot, { recursive: true, force: true });
  writePackageNodeCommandShim(binRoot, "vitest", "../vitest/vitest.mjs");
  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "t051-vitest-check-fixture",
      private: true,
      type: "module",
      devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" },
    }),
  );
  writeFileSync(join(root, "vitest.config.mjs"), "export default { test: { globals: true } };\n");
  writeFileSync(join(root, "src", "used.js"), "export function used() { return 2; }\n");
  writeFileSync(join(root, "src", "unused.js"), "export function unused() { return 3; }\n");
  writeFileSync(
    join(root, "tests", "used.test.js"),
    'import { used } from "../src/used.js";\ntest("used", () => { expect(used()).toBe(2); });\n',
  );
  writeFileSync(
    join(root, "tests", "unused.test.js"),
    'import { unused } from "../src/unused.js";\ntest("unused", () => { expect(unused()).toBe(3); });\n',
  );
  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.name", "Ascout T051 Fixture"]);
  run(root, "git", ["config", "user.email", "t051@example.invalid"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["commit", "-qm", "baseline"]);
  writeFileSync(join(root, "src", "used.js"), "export function used() { return 1 + 1; }\n");
  return root;
}

type ControlledLcovMode =
  | "absent"
  | "resolved_gap"
  | "malformed"
  | "path_unsafe"
  | "incomplete"
  | "invalid_taken";

const FAIL_CLOSED_MODES = ["malformed", "path_unsafe", "incomplete", "invalid_taken"] as const;

function controlledLcov(mode: ControlledLcovMode): string {
  switch (mode) {
    case "absent":
      return "SF:src/used.js\nDA:1,1\nend_of_record\n";
    case "resolved_gap":
      return "SF:src/used.js\nDA:1,1\nBRDA:1,0,0,1\nBRDA:1,0,1,0\nend_of_record\n";
    case "malformed":
      return "SF:src/used.js\nDA:1,1\nBRDA:1,0,0\nend_of_record\n";
    case "path_unsafe":
      return "SF:../outside.js\nDA:1,1\nBRDA:1,0,0,1\nend_of_record\n";
    case "incomplete":
      return "SF:src/used.js\nDA:1,1\nBRDA:1,0,0,1\n";
    case "invalid_taken":
      return "SF:src/used.js\nDA:1,1\nBRDA:1,0,0,invalid\nend_of_record\n";
  }
}

function initializeControlledBranchFixture(mode: ControlledLcovMode): string {
  const root = mkdtempSync(join(tmpdir(), `ascout-t103-vitest-${mode}-`));
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "node_modules", "vitest"), { recursive: true });
  mkdirSync(join(root, "node_modules", "@vitest", "coverage-v8"), { recursive: true });
  mkdirSync(join(root, "node_modules", "fake-vitest"), { recursive: true });

  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: `t103-vitest-${mode}`,
      private: true,
      type: "module",
      devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" },
    }),
  );
  writeFileSync(
    join(root, "node_modules", "vitest", "package.json"),
    JSON.stringify({ name: "vitest", version: "4.1.10" }),
  );
  writeFileSync(
    join(root, "node_modules", "@vitest", "coverage-v8", "package.json"),
    JSON.stringify({ name: "@vitest/coverage-v8", version: "4.1.10" }),
  );

  const fakeRunner = [
    'import { mkdirSync, writeFileSync } from "node:fs";',
    'import { dirname } from "node:path";',
    'const output = process.argv.find((arg) => arg.startsWith("--outputFile="))?.slice("--outputFile=".length);',
    'const coverageDir = process.argv.find((arg) => arg.startsWith("--coverage.reportsDirectory="))?.slice("--coverage.reportsDirectory=".length);',
    'if (!output || !coverageDir) process.exit(64);',
    'mkdirSync(dirname(output), { recursive: true });',
    'mkdirSync(coverageDir, { recursive: true });',
    'writeFileSync(output, JSON.stringify({ numTotalTests: 1, testResults: [] }));',
    `writeFileSync(coverageDir + "/lcov.info", ${JSON.stringify(controlledLcov(mode))});`,
  ].join("\n");
  writeFileSync(join(root, "node_modules", "fake-vitest", "index.mjs"), `${fakeRunner}\n`);
  writePackageNodeCommandShim(join(root, "node_modules", ".bin"), "vitest", "../fake-vitest/index.mjs");

  writeFileSync(join(root, "src", "used.js"), "export function used() { return 2; }\n");
  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.name", "Ascout T103 Fixture"]);
  run(root, "git", ["config", "user.email", "t103@example.invalid"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["commit", "-qm", "baseline"]);
  writeFileSync(join(root, "src", "used.js"), "export function used() { return 1 + 1; }\n");
  return root;
}

describe("T051 runCheck Vitest integration", () => {
  it("runs project-local related Vitest and binds JSON plus LCOV while remaining fail-closed before widening/exercise", async () => {
    const root = initializeFixture();
    try {
      const outcome = await runCheck(root);
      const receipt = outcome.receipt;
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
      expect(receipt.stability).toBe("stable");
      expect(receipt.selection.mode).toBe("native_related");
      expect(receipt.selection.passes).toHaveLength(1);
      expect(receipt.selection.limitations).not.toContain(UNSAFE_SELECTION_LIMITATION);
      expect(receipt.selection.limitations).toContain(SELECTION_COUNTS_NOT_OBSERVED_LIMITATION);
      expect(receipt.selection.selected_test_count).toBe(1);
      expect(receipt.selection.deselected_test_count).toBeNull();
      expect(receipt.selection.total_test_count).toBeNull();
      expect(receipt.summary.completeness).toBe("complete");
      expect(receipt.summary.exit_code).toBe(0);

      const task = receipt.tasks.find((candidate) => candidate.task_type === "test");
      expect(task).toMatchObject({
        status: "PASS",
        tool_name: "vitest",
        tool_version: "4.1.10",
        execution_admission: "normal",
      });
      expect(task?.argv).toContain("related");
      expect(task?.argv).toContain("src/used.js");
      expect(task?.argv).not.toContain("src/unused.js");

      const testEvidence = receipt.evidence.filter((item) => item.task_id === "test");
      expect(testEvidence.some((item) => item.kind === "test_result")).toBe(true);
      expect(testEvidence.some((item) => item.kind === "coverage")).toBe(true);

      const resultArtifact = receipt.artifacts.find((artifact) => artifact.artifact_id === "test.vitest-results");
      const coverageArtifact = receipt.artifacts.find((artifact) => artifact.artifact_id === "test.lcov");
      expect(resultArtifact?.relative_run_path).toBe("raw/test/vitest-results.json");
      expect(coverageArtifact?.relative_run_path).toBe("raw/test/coverage/lcov.info");
      expect(resultArtifact && existsSync(join(root, ".ascout", "runs", receipt.run.run_id, resultArtifact.relative_run_path))).toBe(true);
      expect(coverageArtifact && existsSync(join(root, ".ascout", "runs", receipt.run.run_id, coverageArtifact.relative_run_path))).toBe(true);

      const resultJson = JSON.parse(
        readFileSync(join(root, ".ascout", "runs", receipt.run.run_id, resultArtifact!.relative_run_path), "utf8"),
      ) as { testResults?: readonly { name?: string }[] };
      const selectedFiles = (resultJson.testResults ?? []).map(({ name }) => name === undefined ? "" : basename(name));
      expect(selectedFiles).toContain("used.test.js");
      expect(selectedFiles).not.toContain("unused.test.js");

      const lcovText = readFileSync(
        join(root, ".ascout", "runs", receipt.run.run_id, coverageArtifact!.relative_run_path),
        "utf8",
      );
      const normalized = normalizeLcovLineCoverage(lcovText, root);
      expect(normalized.outcome).toBe("resolved");
      if (normalized.outcome === "resolved") {
        expect(normalized.points.some((point) => point.path === "src/used.js" && point.count > 0)).toBe(true);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
});

describe("T103 runCheck Vitest branch receipt integration", () => {
  it("keeps optional branch fields absent when LCOV has genuine line-only coverage", async () => {
    const root = initializeControlledBranchFixture("absent");
    try {
      const { receipt } = await runCheck(root);
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
      expect(receipt.exercise.records).toEqual([
        {
          path: "src/used.js",
          line: 1,
          state: "EXERCISED",
          execution_count: 1,
          source_task_ids: ["test"],
        },
      ]);
      expect(receipt.exercise.branch_records).toBeUndefined();
      expect(receipt.exercise.exercised_branches).toBeUndefined();
      expect(receipt.exercise.not_exercised_branches).toBeUndefined();
      expect(receipt.exercise.unresolved_branches).toBeUndefined();
      expect(receipt.exercise.changed_files_with_zero_exercised_branches).toBeUndefined();
      expect(receipt.summary).toMatchObject({ completeness: "complete", exit_code: 0 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);

  it("publishes resolved branch evidence and makes a branch-only miss exit 4", async () => {
    const root = initializeControlledBranchFixture("resolved_gap");
    try {
      const { receipt } = await runCheck(root);
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
      expect(receipt.exercise.records).toEqual([
        {
          path: "src/used.js",
          line: 1,
          state: "EXERCISED",
          execution_count: 1,
          source_task_ids: ["test"],
        },
      ]);
      expect(receipt.exercise.branch_records).toEqual([
        {
          path: "src/used.js",
          line: 1,
          block_id: "0",
          branch_id: "0",
          taken: 1,
          state: "EXERCISED",
        },
        {
          path: "src/used.js",
          line: 1,
          block_id: "0",
          branch_id: "1",
          taken: 0,
          state: "NOT_EXERCISED",
        },
      ]);
      expect(receipt.exercise).toMatchObject({
        exercised_branches: 1,
        not_exercised_branches: 1,
        unresolved_branches: 0,
        changed_files_with_zero_exercised_branches: 0,
      });
      expect(receipt.summary).toMatchObject({ completeness: "materially_incomplete", exit_code: 4 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);

  it.each(FAIL_CLOSED_MODES)("fails closed for %s branch normalization instead of manufacturing empty evidence", async (mode) => {
    const root = initializeControlledBranchFixture(mode);
    try {
      const { receipt } = await runCheck(root);
      const testTask = receipt.tasks.find(({ task_type }) => task_type === "test");
      expect(testTask).toMatchObject({ status: "ERROR", reason_code: "vitest_evidence_invalid" });
      expect(receipt.exercise.branch_records).toBeUndefined();
      expect(receipt.exercise.exercised_branches).toBeUndefined();
      expect(receipt.exercise.not_exercised_branches).toBeUndefined();
      expect(receipt.exercise.unresolved_branches).toBeUndefined();
      expect(receipt.exercise.changed_files_with_zero_exercised_branches).toBeUndefined();
      expect(receipt.summary).toMatchObject({ completeness: "unknown_due_to_error", exit_code: 2 });
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);
});
