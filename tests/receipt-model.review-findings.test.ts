import { describe, expect, it } from "vitest";

import { validateReceiptSemantics, type ReceiptV1 } from "../src/receipt/model.js";

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
      run_id: "run-review-findings",
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
        changed_new_line_ranges: [[1, 2]],
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
    changed_code: { changed_file_count: 1, changed_text_line_count: 2 },
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
      run_id: "run-review-findings",
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

function issueCodes(receipt: ReceiptV1): string[] {
  return validateReceiptSemantics(receipt).issues.map((issue) => issue.code);
}

describe("T025 exact-head review finding repairs", () => {
  it("rejects overlapping changed-line ranges before changed-line arithmetic", () => {
    const receipt = structuredClone(receiptFixture()) as ReceiptV1;
    const changed = receipt.comparison.changed_files[0] as unknown as {
      changed_new_line_ranges: Array<[number, number]>;
    };
    changed.changed_new_line_ranges = [[1, 2], [2, 3]];
    (receipt.changed_code as unknown as { changed_text_line_count: number }).changed_text_line_count = 4;

    const codes = issueCodes(receipt);
    expect(codes).toContain("changed_range_overlap");
    expect(codes).not.toContain("changed_text_line_count_mismatch");
  });

  it("rejects malformed config, evidence, and artifact SHA-256 values", () => {
    const receipt = structuredClone(receiptFixture()) as ReceiptV1;
    (receipt.run as unknown as { config_digest: string }).config_digest = "bad";
    (receipt.evidence[0] as unknown as { sha256: string }).sha256 = "BAD";
    (receipt.artifacts[0] as unknown as { sha256: string }).sha256 = "1234";

    const codes = issueCodes(receipt);
    expect(codes).toContain("invalid_config_digest");
    expect(codes).toContain("invalid_evidence_sha256");
    expect(codes).toContain("invalid_artifact_sha256");
  });

  it("requires EXERCISED records to cite executed test tasks", () => {
    const lint = structuredClone(receiptFixture()) as ReceiptV1;
    (lint.tasks[0] as unknown as { task_type: "lint" }).task_type = "lint";
    expect(issueCodes(lint)).toContain("exercise_source_task_not_executed_test");

    const notRun = structuredClone(receiptFixture()) as ReceiptV1;
    const task = notRun.tasks[0] as unknown as {
      status: "NOT_RUN";
      reason_code: string;
      reason_text: string;
      observations: { runs: number; failures: number };
    };
    task.status = "NOT_RUN";
    task.reason_code = "tool_missing";
    task.reason_text = "fixture";
    task.observations = { runs: 0, failures: 0 };
    expect(issueCodes(notRun)).toContain("exercise_source_task_not_executed_test");

    const noSource = structuredClone(receiptFixture()) as ReceiptV1;
    (noSource.exercise.records[0] as unknown as { source_task_ids: string[] }).source_task_ids = [];
    expect(issueCodes(noSource)).toContain("exercise_source_task_required");
  });
});
