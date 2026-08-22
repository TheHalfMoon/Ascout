import { describe, expect, it } from "vitest";

import {
  UNSAFE_SELECTION_LIMITATION,
  decideReceiptExitCode,
  deriveReceiptCompleteness,
  validateReceiptSemantics,
  type ReceiptV1,
} from "../src/receipt/model.js";

function receiptFixture(): ReceiptV1 {
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
      run_id: "run-integrity",
      ascout_version: "0.0.0",
      started_at: "2026-08-22T20:00:00.000Z",
      finished_at: "2026-08-22T20:00:01.000Z",
      config_digest: "d".repeat(64),
    },
    source: { start: source, end: { ...source } },
    comparison: {
      kind: "working_tree_vs_head",
      base_ref: head,
      includes_staged: true,
      includes_unstaged: true,
      includes_untracked_nonignored: true,
      changed_files: [{
        path: "src/a.ts",
        change_kind: "modified",
        line_semantics: "text",
        changed_new_line_ranges: [[1, 1]],
        is_test_file: false,
        is_snapshot: false,
        is_command_surface: false,
      }],
    },
    selection: {
      mode: "full",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: 1,
      deselected_test_count: 0,
      total_test_count: 1,
      widened: false,
      widen_triggers: [],
      passes: [{
        ordinal: 1,
        mode: "full",
        scope: { kind: "repository", path: null },
        trigger: null,
        selected_test_count: 1,
        deselected_test_count: 0,
        total_test_count: 1,
      }],
      limitations: [],
    },
    tasks: [{
      task_id: "test-1",
      task_type: "test",
      authorized_by: "discovery",
      source_path: null,
      argv: ["vitest", "run"],
      argv_redacted: false,
      tool_name: "vitest",
      tool_version: "1.0.0",
      command_surface_changed: false,
      changed_authority_paths: [],
      execution_admission: "normal",
      status: "PASS",
      reason_code: null,
      reason_text: null,
      exit_code: 0,
      started_at: "2026-08-22T20:00:00.000Z",
      finished_at: "2026-08-22T20:00:01.000Z",
      duration_ms: 1000,
      observations: { runs: 1, failures: 0 },
      cache_state: "cold",
      evidence_ids: ["e1"],
      artifact_refs: ["a1"],
      output_truncated: false,
    }],
    changed_code: { changed_file_count: 1, changed_text_line_count: 1 },
    exercise: {
      changed_executable_lines: 1,
      exercised_lines: 1,
      not_exercised_lines: 0,
      unresolved_lines: 0,
      changed_files_with_zero_exercised_lines: 0,
      records: [{
        path: "src/a.ts",
        line: 1,
        state: "EXERCISED",
        execution_count: 1,
        source_task_ids: ["test-1"],
      }],
    },
    test_changes: [],
    findings: [],
    evidence: [{
      evidence_id: "e1",
      run_id: "run-integrity",
      task_id: "test-1",
      sequence: 1,
      kind: "test_result",
      sha256: "e".repeat(64),
      artifact_id: "a1",
      redacted: false,
      truncated: false,
    }],
    artifacts: [{
      artifact_id: "a1",
      task_id: "test-1",
      relative_run_path: "raw/test.txt",
      kind: "stdout",
      sha256: "f".repeat(64),
      byte_length: 1,
      redacted: false,
      truncated: false,
    }],
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

describe("T025 selection and comparison integrity repair", () => {
  it("makes explicitly unsafe selection materially incomplete instead of green", () => {
    const receipt = structuredClone(receiptFixture()) as ReceiptV1;
    (receipt.selection as { limitations: string[] }).limitations = [UNSAFE_SELECTION_LIMITATION];
    (receipt.summary as { completeness: "materially_incomplete"; exit_code: 4 }).completeness = "materially_incomplete";
    (receipt.summary as { exit_code: 4 }).exit_code = 4;

    expect(deriveReceiptCompleteness(receipt)).toBe("materially_incomplete");
    expect(decideReceiptExitCode(receipt)).toBe(4);
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
  });

  it("requires stability unknown when comparison binding is invalid", () => {
    const receipt = structuredClone(receiptFixture()) as ReceiptV1;
    (receipt.comparison as { base_ref: string }).base_ref = "9".repeat(40);

    const stableCodes = validateReceiptSemantics(receipt).issues.map((issue) => issue.code);
    expect(stableCodes).toContain("comparison_source_mismatch");
    expect(stableCodes).toContain("stability_mismatch");

    (receipt as { stability: "unknown" }).stability = "unknown";
    (receipt.summary as { completeness: "unknown_due_to_error"; exit_code: 2 }).completeness = "unknown_due_to_error";
    (receipt.summary as { exit_code: 2 }).exit_code = 2;

    const unknownCodes = validateReceiptSemantics(receipt).issues.map((issue) => issue.code);
    expect(unknownCodes).toContain("comparison_source_mismatch");
    expect(unknownCodes).not.toContain("stability_mismatch");
    expect(deriveReceiptCompleteness(receipt)).toBe("unknown_due_to_error");
    expect(decideReceiptExitCode(receipt)).toBe(2);
  });

  it("requires stability unknown when repository identity changes", () => {
    const receipt = structuredClone(receiptFixture()) as ReceiptV1;
    (receipt.source.end as { repository_id: string }).repository_id = `remote:${"9".repeat(64)}`;

    const stableCodes = validateReceiptSemantics(receipt).issues.map((issue) => issue.code);
    expect(stableCodes).toContain("source_repository_changed");
    expect(stableCodes).toContain("stability_mismatch");

    (receipt as { stability: "unknown" }).stability = "unknown";
    (receipt.summary as { completeness: "unknown_due_to_error"; exit_code: 2 }).completeness = "unknown_due_to_error";
    (receipt.summary as { exit_code: 2 }).exit_code = 2;

    const unknownCodes = validateReceiptSemantics(receipt).issues.map((issue) => issue.code);
    expect(unknownCodes).toContain("source_repository_changed");
    expect(unknownCodes).not.toContain("stability_mismatch");
    expect(deriveReceiptCompleteness(receipt)).toBe("unknown_due_to_error");
    expect(decideReceiptExitCode(receipt)).toBe(2);
  });
});
