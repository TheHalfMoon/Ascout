import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildChangedLineExercise } from "../src/exercise.js";
import {
  decideReceiptExitCode,
  deriveReceiptCompleteness,
  validateReceiptSemantics,
  type BranchRecordV1,
  type ReceiptV1,
} from "../src/receipt/model.js";
import { renderReceiptJson, validateReceiptJsonSchema } from "../src/receipt/json.js";

const RECEIPT_SCHEMA_URL = new URL(
  "../specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json",
  import.meta.url,
);

type Schema = Record<string, any>;

function baseReceipt(): ReceiptV1 {
  const head = "a".repeat(40);
  const tree = "b".repeat(64);
  const source = {
    repository_id: `remote:${"c".repeat(64)}`,
    repository_id_kind: "remote" as const,
    portable: true,
    head_sha: head,
    detached: false,
    shallow: false,
    tree_digest_version: 1 as const,
    tree_digest: tree,
    tracked_index_entry_count: 1,
    unstaged_changed_count: 1,
    included_untracked_count: 0,
  };

  return {
    schema_version: "1.0",
    run: {
      run_id: "run-t103",
      ascout_version: "0.1.0-m1",
      started_at: "2026-09-02T00:00:00.000Z",
      finished_at: "2026-09-02T00:00:01.000Z",
      config_digest: "d".repeat(64),
    },
    source: { start: source, end: { ...source } },
    comparison: {
      kind: "working_tree_vs_head",
      base_ref: head,
      includes_staged: true,
      includes_unstaged: true,
      includes_untracked_nonignored: true,
      changed_files: [
        {
          path: "src/a.ts",
          change_kind: "modified",
          line_semantics: "text",
          changed_new_line_ranges: [[10, 10]],
          is_test_file: false,
          is_snapshot: false,
          is_command_surface: false,
        },
      ],
    },
    selection: {
      mode: "native_related",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: 1,
      deselected_test_count: 0,
      total_test_count: 1,
      widened: false,
      widen_triggers: [],
      passes: [
        {
          ordinal: 1,
          mode: "native_related",
          scope: { kind: "repository", path: null },
          trigger: null,
          selected_test_count: 1,
          deselected_test_count: 0,
          total_test_count: 1,
        },
      ],
      limitations: [],
    },
    tasks: [
      {
        task_id: "test",
        task_type: "test",
        authorized_by: "discovery",
        source_path: "package.json",
        argv: ["vitest", "related", "src/a.ts", "--run"],
        argv_redacted: false,
        tool_name: "vitest",
        tool_version: "4.1.10",
        command_surface_changed: false,
        changed_authority_paths: [],
        execution_admission: "normal",
        status: "PASS",
        reason_code: null,
        reason_text: null,
        exit_code: 0,
        started_at: "2026-09-02T00:00:00.000Z",
        finished_at: "2026-09-02T00:00:01.000Z",
        duration_ms: 1000,
        observations: { runs: 1, failures: 0 },
        cache_state: "not_applicable",
        selected_test_count: 1,
        deselected_test_count: 0,
        evidence_ids: ["coverage-1"],
        artifact_refs: [],
        output_truncated: false,
      },
    ],
    changed_code: {
      changed_file_count: 1,
      changed_text_line_count: 1,
    },
    exercise: {
      changed_executable_lines: 1,
      exercised_lines: 1,
      not_exercised_lines: 0,
      unresolved_lines: 0,
      changed_files_with_zero_exercised_lines: 0,
      records: [
        {
          path: "src/a.ts",
          line: 10,
          state: "EXERCISED",
          execution_count: 1,
          source_task_ids: ["test"],
        },
      ],
    },
    test_changes: [],
    findings: [],
    evidence: [
      {
        evidence_id: "coverage-1",
        run_id: "run-t103",
        task_id: "test",
        sequence: 1,
        kind: "coverage",
        sha256: "e".repeat(64),
        artifact_id: null,
        redacted: false,
        truncated: false,
      },
    ],
    artifacts: [],
    stability: "stable",
    summary: {
      task_status_counts: {
        PASS: 1,
        FAIL: 0,
        FLAKY: 0,
        BLOCKED: 0,
        ERROR: 0,
        NOT_APPLICABLE: 0,
        NOT_RUN: 0,
      },
      finding_count: 0,
      completeness: "complete",
      exit_code: 0,
    },
  };
}

function withBranches(records: readonly BranchRecordV1[]): ReceiptV1 {
  const exercisedBranches = records.filter(({ state }) => state === "EXERCISED").length;
  const notExercisedBranches = records.filter(({ state }) => state === "NOT_EXERCISED").length;
  const unresolvedBranches = records.filter(({ state }) => state === "UNRESOLVED").length;
  const byPath = new Map<string, BranchRecordV1[]>();
  for (const record of records) {
    const pathRecords = byPath.get(record.path) ?? [];
    pathRecords.push(record);
    byPath.set(record.path, pathRecords);
  }
  const zeroBranchPaths = [...byPath.values()]
    .filter((pathRecords) => !pathRecords.some(({ state }) => state === "EXERCISED"))
    .length;

  const base = baseReceipt();
  const provisional: ReceiptV1 = {
    ...base,
    exercise: {
      ...base.exercise,
      branch_records: records,
      exercised_branches: exercisedBranches,
      not_exercised_branches: notExercisedBranches,
      unresolved_branches: unresolvedBranches,
      changed_files_with_zero_exercised_branches: zeroBranchPaths,
    },
  };
  const completeness = deriveReceiptCompleteness(provisional);
  return {
    ...provisional,
    summary: {
      ...provisional.summary,
      completeness,
      exit_code: decideReceiptExitCode(provisional),
    },
  };
}

function issueCodes(receipt: ReceiptV1): string[] {
  return validateReceiptSemantics(receipt).issues.map(({ code }) => code);
}

const exercisedBranch: BranchRecordV1 = {
  path: "src/a.ts",
  line: 10,
  block_id: "0",
  branch_id: "0",
  taken: 1,
  state: "EXERCISED",
};

const missedBranch: BranchRecordV1 = {
  path: "src/a.ts",
  line: 10,
  block_id: "0",
  branch_id: "1",
  taken: 0,
  state: "NOT_EXERCISED",
};

describe("T103 optional branch receipt contract", () => {
  it("keeps legacy line-only receipts valid with branch fields absent", () => {
    const receipt = baseReceipt();
    expect(receipt.exercise.branch_records).toBeUndefined();
    expect(receipt.exercise.exercised_branches).toBeUndefined();
    expect(receipt.exercise.not_exercised_branches).toBeUndefined();
    expect(receipt.exercise.unresolved_branches).toBeUndefined();
    expect(receipt.exercise.changed_files_with_zero_exercised_branches).toBeUndefined();
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(validateReceiptJsonSchema(receipt)).toEqual({ valid: true, issues: [] });
    expect(deriveReceiptCompleteness(receipt)).toBe("complete");
    expect(decideReceiptExitCode(receipt)).toBe(0);
  });

  it("makes a branch-only gap materially incomplete with exit 4 while preserving the EXERCISED line", () => {
    const receipt = withBranches([exercisedBranch, missedBranch]);
    expect(receipt.exercise.records).toEqual(baseReceipt().exercise.records);
    expect(receipt.exercise).toMatchObject({
      exercised_branches: 1,
      not_exercised_branches: 1,
      unresolved_branches: 0,
      changed_files_with_zero_exercised_branches: 0,
    });
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(validateReceiptJsonSchema(receipt)).toEqual({ valid: true, issues: [] });
    expect(receipt.summary.completeness).toBe("materially_incomplete");
    expect(receipt.summary.exit_code).toBe(4);
  });

  it("does not manufacture a branch gap when every changed branch is exercised", () => {
    const receipt = withBranches([
      exercisedBranch,
      { ...exercisedBranch, branch_id: "1", taken: 2 },
    ]);
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(receipt.summary.completeness).toBe("complete");
    expect(receipt.summary.exit_code).toBe(0);
  });

  it("keeps unknown branch observations unresolved and materially incomplete", () => {
    const receipt = withBranches([
      {
        path: "src/a.ts",
        line: 10,
        block_id: "0",
        branch_id: "2",
        taken: null,
        state: "UNRESOLVED",
        reason: "LCOV branch taken count is unknown",
      },
    ]);
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(receipt.exercise.unresolved_branches).toBe(1);
    expect(receipt.summary.completeness).toBe("materially_incomplete");
    expect(receipt.summary.exit_code).toBe(4);
  });

  it("rejects state/taken mismatches, unsafe taken values, and missing unresolved reasons", () => {
    const exercisedAtZero = withBranches([{ ...exercisedBranch, taken: 0 }]);
    expect(issueCodes(exercisedAtZero)).toContain("exercise_branch_state_taken");

    const unsafe = withBranches([{ ...exercisedBranch, taken: Number.MAX_SAFE_INTEGER + 1 }]);
    expect(issueCodes(unsafe)).toContain("invalid_exercise_branch_taken");

    const unresolvedWithoutReason = withBranches([
      {
        path: "src/a.ts",
        line: 10,
        block_id: "0",
        branch_id: "3",
        taken: null,
        state: "UNRESOLVED",
      },
    ]);
    expect(issueCodes(unresolvedWithoutReason)).toContain("exercise_branch_state_taken");
  });

  it("rejects duplicate tuple identities, empty tuple IDs, and branches outside changed scope", () => {
    const duplicate = withBranches([exercisedBranch, { ...exercisedBranch }]);
    expect(issueCodes(duplicate)).toContain("duplicate_exercise_branch");

    const emptyBlock = withBranches([{ ...exercisedBranch, block_id: "" }]);
    expect(issueCodes(emptyBlock)).toContain("invalid_exercise_branch_identity");

    const outside = withBranches([{ ...exercisedBranch, line: 11 }]);
    expect(issueCodes(outside)).toContain("exercise_branch_outside_changed_scope");
  });

  it("validates canonical branch paths and branch summary counts", () => {
    const noncanonical = withBranches([{ ...exercisedBranch, path: "../src/a.ts" }]);
    expect(issueCodes(noncanonical)).toContain("noncanonical_original_path");

    const valid = withBranches([exercisedBranch]);
    const mismatched: ReceiptV1 = {
      ...valid,
      exercise: {
        ...valid.exercise,
        exercised_branches: 9,
      },
    };
    expect(issueCodes(mismatched)).toContain("exercise_branch_summary_mismatch");
  });

  it("keeps branch record serialization deterministic through the existing JSON renderer", () => {
    const built = buildChangedLineExercise(
      [
        {
          path: "src/a.ts",
          change_kind: "modified",
          line_semantics: "text",
          changed_new_line_ranges: [[10, 10]],
        },
      ],
      [{ path: "src/a.ts", line: 10, count: 1, instrumented: true }],
      "test",
      [
        { ...missedBranch, branch_id: "9" },
        { ...exercisedBranch, branch_id: "1" },
        { ...exercisedBranch, branch_id: "0" },
      ],
    );
    const receipt = withBranches(built.branch_records);
    expect(receipt.exercise.branch_records?.map(({ branch_id }) => branch_id)).toEqual(["0", "1", "9"]);
    expect(renderReceiptJson(receipt)).toBe(renderReceiptJson(structuredClone(receipt)));
  });

  it("extends the strict receipt-v1 schema additively without making branch fields required", () => {
    const schema = JSON.parse(readFileSync(fileURLToPath(RECEIPT_SCHEMA_URL), "utf8")) as Schema;
    expect(schema.properties.schema_version).toEqual({ const: "1.0" });
    expect(schema.$defs.exercise.required).toEqual([
      "changed_executable_lines",
      "exercised_lines",
      "not_exercised_lines",
      "unresolved_lines",
      "changed_files_with_zero_exercised_lines",
      "records",
    ]);
    expect(schema.$defs.exercise.properties.branch_records).toEqual({
      type: "array",
      items: { $ref: "#/$defs/branchRecord" },
    });
    expect(schema.$defs.branchRecord.properties.path).toEqual({
      $ref: "#/$defs/canonicalRelativePath",
    });
    expect(schema.$defs.branchRecord.required).toEqual([
      "path",
      "line",
      "block_id",
      "branch_id",
      "taken",
      "state",
    ]);
    for (const key of [
      "branch_records",
      "exercised_branches",
      "not_exercised_branches",
      "unresolved_branches",
      "changed_files_with_zero_exercised_branches",
    ]) {
      expect(schema.$defs.exercise.required).not.toContain(key);
    }
  });
});
