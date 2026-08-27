import { describe, expect, it } from "vitest";

import {
  validateReceiptSemantics,
  type ExerciseRecordV1,
  type ReceiptV1,
} from "../src/receipt/model.js";

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
    tracked_index_entry_count: 4,
    unstaged_changed_count: 4,
    included_untracked_count: 0,
  };

  return {
    schema_version: "1.0",
    run: {
      run_id: "run-t047",
      ascout_version: "0.0.0",
      started_at: "2026-08-27T04:10:00.000Z",
      finished_at: "2026-08-27T04:10:01.000Z",
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
          changed_new_line_ranges: [[10, 12]],
          is_test_file: false,
          is_snapshot: false,
          is_command_surface: false,
        },
        {
          path: "src/b.ts",
          change_kind: "modified",
          line_semantics: "text",
          changed_new_line_ranges: [[20, 21]],
          is_test_file: false,
          is_snapshot: false,
          is_command_surface: false,
        },
        {
          path: "assets/logo.bin",
          change_kind: "type_changed",
          line_semantics: "binary_or_non_line",
          changed_new_line_ranges: [],
          is_test_file: false,
          is_snapshot: false,
          is_command_surface: false,
        },
        {
          path: "src/removed.ts",
          change_kind: "deleted",
          line_semantics: "deleted_only",
          changed_new_line_ranges: [],
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
        task_id: "test-1",
        task_type: "test",
        authorized_by: "discovery",
        source_path: "package.json",
        argv: ["vitest", "related", "src/a.ts", "src/b.ts", "--run"],
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
        started_at: "2026-08-27T04:10:00.000Z",
        finished_at: "2026-08-27T04:10:01.000Z",
        duration_ms: 1000,
        observations: { runs: 1, failures: 0 },
        cache_state: "cold",
        selected_test_count: 1,
        deselected_test_count: 0,
        evidence_ids: ["coverage-1"],
        artifact_refs: [],
        output_truncated: false,
      },
    ],
    changed_code: {
      changed_file_count: 4,
      changed_text_line_count: 5,
    },
    exercise: {
      changed_executable_lines: 5,
      exercised_lines: 2,
      not_exercised_lines: 2,
      unresolved_lines: 1,
      changed_files_with_zero_exercised_lines: 1,
      records: [
        {
          path: "src/a.ts",
          line: 10,
          state: "EXERCISED",
          execution_count: 2,
          source_task_ids: ["test-1"],
        },
        {
          path: "src/a.ts",
          line: 11,
          state: "NOT_EXERCISED",
          execution_count: 0,
          source_task_ids: ["test-1"],
        },
        {
          path: "src/a.ts",
          line: 12,
          state: "EXERCISED",
          execution_count: 1,
          source_task_ids: ["test-1"],
        },
        {
          path: "src/b.ts",
          line: 20,
          state: "NOT_EXERCISED",
          execution_count: 0,
          source_task_ids: ["test-1"],
        },
        {
          path: "src/b.ts",
          line: 21,
          state: "UNRESOLVED",
          execution_count: null,
          source_task_ids: ["test-1"],
          reason: "coverage_source_mapping_unresolved",
        },
      ],
    },
    test_changes: [],
    findings: [],
    evidence: [
      {
        evidence_id: "coverage-1",
        run_id: "run-t047",
        task_id: "test-1",
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
      completeness: "materially_incomplete",
      exit_code: 4,
    },
  };
}

function issueCodes(receipt: ReceiptV1): string[] {
  return validateReceiptSemantics(receipt).issues.map(({ code }) => code);
}

function mutableRecord(receipt: ReceiptV1, index: number): ExerciseRecordV1 & {
  state: ExerciseRecordV1["state"];
  execution_count: number | null;
  source_task_ids: string[];
  reason?: string;
  line: number;
  path: string;
} {
  return receipt.exercise.records[index] as ExerciseRecordV1 & {
    state: ExerciseRecordV1["state"];
    execution_count: number | null;
    source_task_ids: string[];
    reason?: string;
    line: number;
    path: string;
  };
}

describe("T047 exercise semantic contract", () => {
  it("accepts mixed EXERCISED, NOT_EXERCISED, and UNRESOLVED changed executable lines", () => {
    const receipt = baseReceipt();
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(receipt.exercise).toMatchObject({
      changed_executable_lines: 5,
      exercised_lines: 2,
      not_exercised_lines: 2,
      unresolved_lines: 1,
      changed_files_with_zero_exercised_lines: 1,
    });
  });

  it.each([
    ["EXERCISED count zero", 0, 0],
    ["EXERCISED count null", 0, null],
    ["NOT_EXERCISED count positive", 1, 3],
    ["NOT_EXERCISED count null", 1, null],
  ] as const)("rejects %s", (_name, recordIndex, executionCount) => {
    const receipt = structuredClone(baseReceipt()) as ReceiptV1;
    mutableRecord(receipt, recordIndex).execution_count = executionCount;
    expect(issueCodes(receipt)).toContain("exercise_state_count");
  });

  it("requires UNRESOLVED to carry null count and a non-empty reason", () => {
    const nonNull = structuredClone(baseReceipt()) as ReceiptV1;
    mutableRecord(nonNull, 4).execution_count = 0;
    expect(issueCodes(nonNull)).toContain("exercise_state_count");

    const noReason = structuredClone(baseReceipt()) as ReceiptV1;
    mutableRecord(noReason, 4).reason = "";
    expect(issueCodes(noReason)).toContain("exercise_state_count");
  });

  it("binds EXERCISED claims to an executed test task that owns current-run coverage evidence", () => {
    const wrongTaskType = structuredClone(baseReceipt()) as ReceiptV1;
    (wrongTaskType.tasks[0] as unknown as { task_type: "lint" }).task_type = "lint";
    expect(issueCodes(wrongTaskType)).toContain("exercise_source_task_not_executed_test");

    const noCoverage = structuredClone(baseReceipt()) as ReceiptV1;
    (noCoverage.evidence[0] as unknown as { kind: "process_result" }).kind = "process_result";
    expect(issueCodes(noCoverage)).toContain("exercise_source_task_missing_coverage_evidence");
  });

  it("rejects exercise lines outside the changed new-line ranges and duplicate line identities", () => {
    const outside = structuredClone(baseReceipt()) as ReceiptV1;
    mutableRecord(outside, 0).line = 9;
    expect(issueCodes(outside)).toContain("exercise_line_outside_changed_scope");

    const duplicate = structuredClone(baseReceipt()) as ReceiptV1;
    mutableRecord(duplicate, 1).line = 10;
    expect(issueCodes(duplicate)).toContain("duplicate_exercise_line");
  });

  it("excludes binary/type-changed and deleted-only files from line exercise records", () => {
    const receipt = baseReceipt();
    expect(receipt.comparison.changed_files.find(({ path }) => path === "assets/logo.bin")).toMatchObject({
      line_semantics: "binary_or_non_line",
      changed_new_line_ranges: [],
    });
    expect(receipt.comparison.changed_files.find(({ path }) => path === "src/removed.ts")).toMatchObject({
      line_semantics: "deleted_only",
      changed_new_line_ranges: [],
    });
    expect(receipt.exercise.records.some(({ path }) => path === "assets/logo.bin" || path === "src/removed.ts")).toBe(false);
    expect(validateReceiptSemantics(receipt).valid).toBe(true);

    const invalid = structuredClone(baseReceipt()) as ReceiptV1;
    const records = invalid.exercise.records as ExerciseRecordV1[];
    records.push({
      path: "assets/logo.bin",
      line: 1,
      state: "NOT_EXERCISED",
      execution_count: 0,
      source_task_ids: ["test-1"],
    });
    (invalid.exercise as unknown as {
      changed_executable_lines: number;
      not_exercised_lines: number;
      changed_files_with_zero_exercised_lines: number;
    }).changed_executable_lines = 6;
    (invalid.exercise as unknown as { not_exercised_lines: number }).not_exercised_lines = 3;
    (invalid.exercise as unknown as { changed_files_with_zero_exercised_lines: number }).changed_files_with_zero_exercised_lines = 2;
    expect(issueCodes(invalid)).toContain("exercise_line_outside_changed_scope");
  });

  it("counts only files with no EXERCISED record as zero-exercised files", () => {
    const receipt = structuredClone(baseReceipt()) as ReceiptV1;
    (receipt.exercise as unknown as { changed_files_with_zero_exercised_lines: number }).changed_files_with_zero_exercised_lines = 0;
    expect(issueCodes(receipt)).toContain("exercise_summary_mismatch");

    const valid = baseReceipt();
    const exercisedPaths = new Set(valid.exercise.records.filter(({ state }) => state === "EXERCISED").map(({ path }) => path));
    expect([...new Set(valid.exercise.records.map(({ path }) => path))].filter((path) => !exercisedPaths.has(path))).toEqual(["src/b.ts"]);
    expect(valid.exercise.changed_files_with_zero_exercised_lines).toBe(1);
  });
});
