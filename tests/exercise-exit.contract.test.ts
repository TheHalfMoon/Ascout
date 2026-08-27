import { describe, expect, it } from "vitest";

import {
  decideReceiptExitCode,
  deriveReceiptCompleteness,
  validateReceiptSemantics,
  type ExerciseRecordV1,
  type ReceiptV1,
} from "../src/receipt/model.js";

type ExerciseState = ExerciseRecordV1["state"];

function receiptWithExerciseState(state: ExerciseState): ReceiptV1 {
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

  const exerciseRecord: ExerciseRecordV1 =
    state === "EXERCISED"
      ? {
          path: "src/a.ts",
          line: 10,
          state,
          execution_count: 1,
          source_task_ids: ["test-1"],
        }
      : state === "NOT_EXERCISED"
        ? {
            path: "src/a.ts",
            line: 10,
            state,
            execution_count: 0,
            source_task_ids: ["test-1"],
          }
        : {
            path: "src/a.ts",
            line: 10,
            state,
            execution_count: null,
            source_task_ids: ["test-1"],
            reason: "coverage_source_mapping_unresolved",
          };

  const gap = state !== "EXERCISED";

  return {
    schema_version: "1.0",
    run: {
      run_id: "run-t049",
      ascout_version: "0.0.0",
      started_at: "2026-08-27T04:25:00.000Z",
      finished_at: "2026-08-27T04:25:01.000Z",
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
        task_id: "test-1",
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
        started_at: "2026-08-27T04:25:00.000Z",
        finished_at: "2026-08-27T04:25:01.000Z",
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
      changed_file_count: 1,
      changed_text_line_count: 1,
    },
    exercise: {
      changed_executable_lines: 1,
      exercised_lines: state === "EXERCISED" ? 1 : 0,
      not_exercised_lines: state === "NOT_EXERCISED" ? 1 : 0,
      unresolved_lines: state === "UNRESOLVED" ? 1 : 0,
      changed_files_with_zero_exercised_lines: gap ? 1 : 0,
      records: [exerciseRecord],
    },
    test_changes: [],
    findings: [],
    evidence: [
      {
        evidence_id: "coverage-1",
        run_id: "run-t049",
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
      completeness: gap ? "materially_incomplete" : "complete",
      exit_code: gap ? 4 : 0,
    },
  };
}

function issueCodes(receipt: ReceiptV1): string[] {
  return validateReceiptSemantics(receipt).issues.map(({ code }) => code);
}

describe("T049 exercise gap exit contract", () => {
  it("returns stable exit 4 when selected tests PASS but a changed executable line is NOT_EXERCISED", () => {
    const receipt = receiptWithExerciseState("NOT_EXERCISED");

    expect(receipt.stability).toBe("stable");
    expect(receipt.tasks[0]).toMatchObject({ status: "PASS", exit_code: 0 });
    expect(deriveReceiptCompleteness(receipt)).toBe("materially_incomplete");
    expect(decideReceiptExitCode(receipt)).toBe(4);
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
  });

  it("returns stable exit 4 when selected tests PASS but a changed executable line remains UNRESOLVED", () => {
    const receipt = receiptWithExerciseState("UNRESOLVED");

    expect(receipt.stability).toBe("stable");
    expect(receipt.tasks[0]).toMatchObject({ status: "PASS", exit_code: 0 });
    expect(deriveReceiptCompleteness(receipt)).toBe("materially_incomplete");
    expect(decideReceiptExitCode(receipt)).toBe(4);
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
  });

  it("rejects a green receipt summary that attempts to hide a remaining exercise gap", () => {
    const receipt = structuredClone(receiptWithExerciseState("NOT_EXERCISED")) as ReceiptV1;
    (receipt.summary as unknown as { completeness: "complete" }).completeness = "complete";
    (receipt.summary as unknown as { exit_code: 0 }).exit_code = 0;

    const codes = issueCodes(receipt);
    expect(codes).toContain("completeness_mismatch");
    expect(codes).toContain("exit_code_mismatch");
    expect(decideReceiptExitCode(receipt)).toBe(4);
  });

  it("allows exit 0 only when the stable PASS receipt has no remaining exercise gap", () => {
    const receipt = receiptWithExerciseState("EXERCISED");

    expect(deriveReceiptCompleteness(receipt)).toBe("complete");
    expect(decideReceiptExitCode(receipt)).toBe(0);
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
  });
});
