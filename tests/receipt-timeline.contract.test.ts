import { describe, expect, it } from "vitest";

import { buildReceipt } from "../src/receipt/build.js";
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
      run_id: "run-timeline",
      ascout_version: "0.1.0-m1",
      started_at: "2026-08-27T00:00:00.000Z",
      finished_at: "2026-08-27T00:00:01.000Z",
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
      task_id: "lint",
      task_type: "lint",
      authorized_by: "discovery",
      source_path: null,
      argv: ["eslint", "src/a.ts"],
      argv_redacted: false,
      tool_name: "eslint",
      tool_version: null,
      command_surface_changed: false,
      changed_authority_paths: [],
      execution_admission: "normal",
      status: "PASS",
      reason_code: null,
      reason_text: null,
      exit_code: 0,
      started_at: "2026-08-27T00:00:00.100Z",
      finished_at: "2026-08-27T00:00:00.200Z",
      duration_ms: 100,
      observations: { runs: 1, failures: 0 },
      cache_state: "not_applicable",
      evidence_ids: ["e1"],
      artifact_refs: ["a1"],
      output_truncated: false,
    }],
    changed_code: { changed_file_count: 1, changed_text_line_count: 1 },
    exercise: {
      changed_executable_lines: 0,
      exercised_lines: 0,
      not_exercised_lines: 0,
      unresolved_lines: 0,
      changed_files_with_zero_exercised_lines: 0,
      records: [],
    },
    test_changes: [],
    findings: [],
    evidence: [{
      evidence_id: "e1",
      run_id: "run-timeline",
      task_id: "lint",
      sequence: 1,
      kind: "process_result",
      sha256: "e".repeat(64),
      artifact_id: "a1",
      redacted: false,
      truncated: false,
    }],
    artifacts: [{
      artifact_id: "a1",
      task_id: "lint",
      relative_run_path: "raw/lint.txt",
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

describe("receipt execution timeline semantic validation", () => {
  it("accepts an internally consistent run/task timeline", () => {
    expect(validateReceiptSemantics(receiptFixture())).toEqual({ valid: true, issues: [] });
  });

  it("rejects a run that finishes before it starts", () => {
    const receipt = receiptFixture();
    (receipt.run as { finished_at: string }).finished_at = "2026-08-26T23:59:59.999Z";
    expect(issueCodes(receipt)).toContain("run_timeline_reversed");
  });

  it("rejects task intervals outside the run interval", () => {
    const before = receiptFixture();
    (before.tasks[0] as { started_at: string }).started_at = "2026-08-26T23:59:59.999Z";
    expect(issueCodes(before)).toContain("task_timeline_outside_run");

    const after = receiptFixture();
    (after.tasks[0] as { finished_at: string }).finished_at = "2026-08-27T00:00:01.001Z";
    expect(issueCodes(after)).toContain("task_timeline_outside_run");
  });

  it("rejects a task that finishes before it starts", () => {
    const receipt = receiptFixture();
    (receipt.tasks[0] as { finished_at: string }).finished_at = "2026-08-27T00:00:00.050Z";
    expect(issueCodes(receipt)).toContain("task_timeline_reversed");
  });

  it("rejects partial or missing timing for executed outcomes", () => {
    const partial = receiptFixture();
    (partial.tasks[0] as { duration_ms: number | null }).duration_ms = null;
    expect(issueCodes(partial)).toContain("task_timing_shape");

    const absent = receiptFixture();
    const task = absent.tasks[0] as {
      started_at: string | null;
      finished_at: string | null;
      duration_ms: number | null;
    };
    task.started_at = null;
    task.finished_at = null;
    task.duration_ms = null;
    expect(issueCodes(absent)).toContain("executed_task_timing_required");
  });

  it("rejects duration that conflicts with persisted timestamps", () => {
    const receipt = receiptFixture();
    (receipt.tasks[0] as { duration_ms: number }).duration_ms = 99;
    expect(issueCodes(receipt)).toContain("task_duration_mismatch");
  });

  it("preserves contradictory task timing so semantic validation can reject it", () => {
    const receipt = receiptFixture();
    const task = { ...receipt.tasks[0]!, duration_ms: 999 };
    const built = buildReceipt({
      run: receipt.run,
      sourceStart: receipt.source.start,
      sourceEnd: receipt.source.end,
      comparison: receipt.comparison,
      selection: receipt.selection,
      tasks: [task],
      exercise: receipt.exercise,
      testChanges: receipt.test_changes,
      findings: receipt.findings,
      evidence: receipt.evidence,
      artifacts: receipt.artifacts,
    });

    expect(built.tasks[0]?.duration_ms).toBe(999);
    expect(issueCodes(built)).toContain("task_duration_mismatch");
  });
});
