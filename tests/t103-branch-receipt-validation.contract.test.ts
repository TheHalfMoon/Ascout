import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

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

const BRANCH_FIELDS = [
  "branch_records",
  "exercised_branches",
  "not_exercised_branches",
  "unresolved_branches",
  "changed_files_with_zero_exercised_branches",
] as const;

type BranchField = (typeof BRANCH_FIELDS)[number];
type MutableExercise = Record<string, unknown>;
type Schema = Record<string, any>;

const PARTIAL_BRANCH_FIELD_SETS: readonly (readonly BranchField[])[] = Array.from(
  { length: (1 << BRANCH_FIELDS.length) - 2 },
  (_, index) => {
    const mask = index + 1;
    return BRANCH_FIELDS.filter((_, fieldIndex) => (mask & (1 << fieldIndex)) !== 0);
  },
);

function baseReceipt(line = 10): ReceiptV1 {
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
          changed_new_line_ranges: [[line, line]],
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
    changed_code: { changed_file_count: 1, changed_text_line_count: 1 },
    exercise: {
      changed_executable_lines: 1,
      exercised_lines: 1,
      not_exercised_lines: 0,
      unresolved_lines: 0,
      changed_files_with_zero_exercised_lines: 0,
      records: [
        {
          path: "src/a.ts",
          line,
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

function exercisedBranch(line = 10, branchId = "0"): BranchRecordV1 {
  return {
    path: "src/a.ts",
    line,
    block_id: "0",
    branch_id: branchId,
    taken: 1,
    state: "EXERCISED",
  };
}

function withBranches(
  records: readonly BranchRecordV1[],
  options: { readonly line?: number; readonly extraEligiblePath?: boolean } = {},
): ReceiptV1 {
  const line = options.line ?? 10;
  const base = baseReceipt(line);
  const changedFiles = options.extraEligiblePath
    ? [
        ...base.comparison.changed_files,
        {
          path: "src/no-branch.ts",
          change_kind: "modified" as const,
          line_semantics: "text" as const,
          changed_new_line_ranges: [[20, 20]] as const,
          is_test_file: false,
          is_snapshot: false,
          is_command_surface: false,
        },
      ]
    : base.comparison.changed_files;

  const exercisedBranches = records.filter(({ state }) => state === "EXERCISED").length;
  const notExercisedBranches = records.filter(({ state }) => state === "NOT_EXERCISED").length;
  const unresolvedBranches = records.filter(({ state }) => state === "UNRESOLVED").length;
  const eligiblePaths = new Map(changedFiles.map((file) => [file.path, [] as BranchRecordV1[]]));
  for (const record of records) eligiblePaths.get(record.path)?.push(record);
  const zeroBranchPaths = [...eligiblePaths.values()]
    .filter((pathRecords) => !pathRecords.some(({ state }) => state === "EXERCISED"))
    .length;

  const provisional: ReceiptV1 = {
    ...base,
    comparison: { ...base.comparison, changed_files: changedFiles },
    changed_code: {
      changed_file_count: changedFiles.length,
      changed_text_line_count: changedFiles.length,
    },
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

function partialBranchReceipt(fields: readonly BranchField[]): ReceiptV1 {
  const receipt = structuredClone(baseReceipt()) as ReceiptV1;
  const exercise = receipt.exercise as unknown as MutableExercise;
  const values: Record<BranchField, unknown> = {
    branch_records: [],
    exercised_branches: 0,
    not_exercised_branches: 1,
    unresolved_branches: 1,
    changed_files_with_zero_exercised_branches: 0,
  };
  for (const field of fields) exercise[field] = values[field];
  return receipt;
}

describe("T103 strict optional branch receipt contract", () => {
  it("keeps the legacy all-five-absent receipt valid and unchanged", () => {
    const receipt = baseReceipt();
    for (const field of BRANCH_FIELDS) expect((receipt.exercise as any)[field]).toBeUndefined();
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(validateReceiptJsonSchema(receipt)).toEqual({ valid: true, issues: [] });
    expect(deriveReceiptCompleteness(receipt)).toBe("complete");
    expect(decideReceiptExitCode(receipt)).toBe(0);
  });

  it("rejects all 30 partial branch-group subsets semantically and by JSON Schema", () => {
    expect(PARTIAL_BRANCH_FIELD_SETS).toHaveLength(30);
    for (const fields of PARTIAL_BRANCH_FIELD_SETS) {
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.length).toBeLessThan(BRANCH_FIELDS.length);
      const receipt = partialBranchReceipt(fields);
      expect(issueCodes(receipt)).toContain("exercise_branch_group_partial");
      expect(validateReceiptJsonSchema(receipt).valid).toBe(false);
    }
  });

  it.each(["not_exercised_branches", "unresolved_branches"] as const)(
    "keeps a partial material branch gap from %s materially incomplete with exit 4",
    (field) => {
      const receipt = partialBranchReceipt([field]);
      expect(deriveReceiptCompleteness(receipt)).toBe("materially_incomplete");
      expect(decideReceiptExitCode(receipt)).toBe(4);
    },
  );

  it("makes a branch-only gap materially incomplete with exit 4 without changing line evidence", () => {
    const receipt = withBranches([
      exercisedBranch(),
      { ...exercisedBranch(10, "1"), taken: 0, state: "NOT_EXERCISED" },
    ]);
    expect(receipt.exercise.records).toEqual(baseReceipt().exercise.records);
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(validateReceiptJsonSchema(receipt)).toEqual({ valid: true, issues: [] });
    expect(receipt.summary).toMatchObject({ completeness: "materially_incomplete", exit_code: 4 });
  });

  it("accepts the safe-integer upper bounds for line and taken", () => {
    const line = Number.MAX_SAFE_INTEGER;
    const receipt = withBranches([
      { ...exercisedBranch(line), taken: Number.MAX_SAFE_INTEGER },
    ], { line });
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(validateReceiptJsonSchema(receipt)).toEqual({ valid: true, issues: [] });
  });

  it("rejects branch line values below 1 or above the safe-integer maximum", () => {
    const below = withBranches([{ ...exercisedBranch(), line: 0 }]);
    expect(issueCodes(below)).toContain("invalid_exercise_branch_line");
    expect(validateReceiptJsonSchema(below).valid).toBe(false);

    const above = withBranches([{ ...exercisedBranch(), line: Number.MAX_SAFE_INTEGER + 1 }]);
    expect(issueCodes(above)).toContain("invalid_exercise_branch_line");
    expect(validateReceiptJsonSchema(above).valid).toBe(false);
  });

  it("rejects unsafe or negative taken values while accepting null for unresolved", () => {
    const unsafe = withBranches([{ ...exercisedBranch(), taken: Number.MAX_SAFE_INTEGER + 1 }]);
    expect(issueCodes(unsafe)).toContain("invalid_exercise_branch_taken");
    expect(validateReceiptJsonSchema(unsafe).valid).toBe(false);

    const negative = withBranches([{ ...exercisedBranch(), taken: -1 }]);
    expect(issueCodes(negative)).toContain("invalid_exercise_branch_taken");
    expect(validateReceiptJsonSchema(negative).valid).toBe(false);

    const unresolved = withBranches([{
      ...exercisedBranch(),
      taken: null,
      state: "UNRESOLVED",
      reason: "LCOV branch taken count is unknown",
    }]);
    expect(validateReceiptSemantics(unresolved)).toEqual({ valid: true, issues: [] });
    expect(validateReceiptJsonSchema(unresolved)).toEqual({ valid: true, issues: [] });
  });

  it("enforces state/taken/reason consistency at semantic and schema layers", () => {
    for (const record of [
      { ...exercisedBranch(), taken: 0 },
      { ...exercisedBranch(), reason: "must not exist" },
      { ...exercisedBranch(), taken: 0, state: "NOT_EXERCISED" as const, reason: "must not exist" },
      { ...exercisedBranch(), taken: null, state: "UNRESOLVED" as const },
    ]) {
      const receipt = withBranches([record]);
      expect(validateReceiptSemantics(receipt).valid).toBe(false);
      expect(validateReceiptJsonSchema(receipt).valid).toBe(false);
    }
  });

  it("requires non-empty tuple identifiers, unique tuple identities, containment, and deterministic ordering", () => {
    expect(issueCodes(withBranches([{ ...exercisedBranch(), block_id: "" }]))).toContain("invalid_exercise_branch_identity");
    expect(issueCodes(withBranches([exercisedBranch(), exercisedBranch()]))).toContain("duplicate_exercise_branch");
    expect(issueCodes(withBranches([{ ...exercisedBranch(), line: 11 }]))).toContain("exercise_branch_outside_changed_scope");

    const unsorted = withBranches([exercisedBranch(10, "2"), exercisedBranch(10, "1")]);
    expect(issueCodes(unsorted)).toContain("exercise_branch_order");
  });

  it("checks branch summary counts exactly", () => {
    const valid = withBranches([exercisedBranch()]);
    const mismatched: ReceiptV1 = {
      ...valid,
      exercise: { ...valid.exercise, exercised_branches: 2 },
    };
    expect(issueCodes(mismatched)).toContain("exercise_branch_summary_mismatch");
  });

  it("counts eligible changed-range files with no branch tuple as zero-exercised-branch files", () => {
    const receipt = withBranches([exercisedBranch()], { extraEligiblePath: true });
    expect(receipt.exercise.changed_files_with_zero_exercised_branches).toBe(1);
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(validateReceiptJsonSchema(receipt)).toEqual({ valid: true, issues: [] });
  });

  it("preserves deterministic branch serialization", () => {
    const receipt = withBranches([exercisedBranch(10, "0"), exercisedBranch(10, "1")]);
    expect(renderReceiptJson(receipt)).toBe(renderReceiptJson(structuredClone(receipt)));
  });

  it("keeps schema version 1.0 and expresses the branch group only additively", () => {
    const schema = JSON.parse(readFileSync(fileURLToPath(RECEIPT_SCHEMA_URL), "utf8")) as Schema;
    expect(schema.properties.schema_version).toEqual({ const: "1.0" });
    expect(schema.$defs.branchRecord.properties.line.maximum).toBe(Number.MAX_SAFE_INTEGER);
    expect(schema.$defs.branchRecord.properties.taken.maximum).toBe(Number.MAX_SAFE_INTEGER);
    for (const field of BRANCH_FIELDS) {
      expect(schema.$defs.exercise.properties[field]).toBeDefined();
      expect(schema.$defs.exercise.required).not.toContain(field);
    }
    expect(schema.$defs.exercise.allOf).toHaveLength(BRANCH_FIELDS.length);
  });
});