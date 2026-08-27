import { describe, expect, it } from "vitest";

import {
  decideReceiptExitCode,
  deriveReceiptCompleteness,
  validateReceiptSemantics,
  type Completeness,
  type FindingV1,
  type ReceiptExitCode,
  type ReceiptV1,
  type TaskStatus,
} from "../src/receipt/model.js";

interface OutcomeCase {
  readonly gap?: boolean;
  readonly finding?: boolean;
  readonly drift?: boolean;
  readonly error?: boolean;
  readonly expectedExit: ReceiptExitCode;
  readonly expectedCompleteness: Completeness;
}

function receiptFor(outcome: OutcomeCase): ReceiptV1 {
  const head = "a".repeat(40);
  const startTree = "b".repeat(64);
  const endTree = outcome.drift ? "c".repeat(64) : startTree;
  const taskStatus: TaskStatus = outcome.error ? "ERROR" : outcome.finding ? "FAIL" : "PASS";
  const taskFailures = outcome.error || outcome.finding ? 1 : 0;
  const gap = outcome.gap === true;

  const finding: FindingV1 = {
    finding_id: "finding-1",
    task_id: "test-1",
    producer: "vitest",
    rule_or_test_id: "src/a.test.ts > changed behavior",
    message: "expected true to be false",
    path: "src/a.test.ts",
    line_start: 10,
    line_end: 10,
    severity: "medium",
    in_changed_lines: null,
    introduced_by_change: "unknown",
    determinism_class: "unknown",
    observations: { runs: 1, failures: 1 },
    reproduced: "unknown",
    evidence_ids: ["result-1"],
  };

  return {
    schema_version: "1.0",
    run: {
      run_id: "run-t060",
      ascout_version: "0.0.0",
      started_at: "2026-08-27T11:30:00.000Z",
      finished_at: "2026-08-27T11:30:01.000Z",
      config_digest: "d".repeat(64),
    },
    source: {
      start: {
        repository_id: `remote:${"e".repeat(64)}`,
        repository_id_kind: "remote",
        portable: true,
        head_sha: head,
        detached: false,
        shallow: false,
        tree_digest_version: 1,
        tree_digest: startTree,
        tracked_index_entry_count: 2,
        unstaged_changed_count: 1,
        included_untracked_count: 0,
      },
      end: {
        repository_id: `remote:${"e".repeat(64)}`,
        repository_id_kind: "remote",
        portable: true,
        head_sha: head,
        detached: false,
        shallow: false,
        tree_digest_version: 1,
        tree_digest: endTree,
        tracked_index_entry_count: 2,
        unstaged_changed_count: 1,
        included_untracked_count: 0,
      },
    },
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
        status: taskStatus,
        reason_code: outcome.error ? "task_execution_error" : null,
        reason_text: outcome.error ? "synthetic T060 task execution error" : null,
        exit_code: outcome.error ? 2 : outcome.finding ? 1 : 0,
        started_at: "2026-08-27T11:30:00.000Z",
        finished_at: "2026-08-27T11:30:01.000Z",
        duration_ms: 1000,
        observations: { runs: 1, failures: taskFailures },
        cache_state: "cold",
        selected_test_count: 1,
        deselected_test_count: 0,
        evidence_ids: ["result-1", "coverage-1"],
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
      exercised_lines: gap ? 0 : 1,
      not_exercised_lines: gap ? 1 : 0,
      unresolved_lines: 0,
      changed_files_with_zero_exercised_lines: gap ? 1 : 0,
      records: [
        gap
          ? {
              path: "src/a.ts",
              line: 10,
              state: "NOT_EXERCISED",
              execution_count: 0,
              source_task_ids: ["test-1"],
            }
          : {
              path: "src/a.ts",
              line: 10,
              state: "EXERCISED",
              execution_count: 1,
              source_task_ids: ["test-1"],
            },
      ],
    },
    test_changes: [],
    findings: outcome.finding ? [finding] : [],
    evidence: [
      {
        evidence_id: "result-1",
        run_id: "run-t060",
        task_id: "test-1",
        sequence: 1,
        kind: "test_result",
        sha256: "f".repeat(64),
        artifact_id: null,
        redacted: false,
        truncated: false,
      },
      {
        evidence_id: "coverage-1",
        run_id: "run-t060",
        task_id: "test-1",
        sequence: 2,
        kind: "coverage",
        sha256: "1".repeat(64),
        artifact_id: null,
        redacted: false,
        truncated: false,
      },
    ],
    artifacts: [],
    stability: outcome.drift ? "tree_drifted" : "stable",
    summary: {
      task_status_counts: {
        PASS: taskStatus === "PASS" ? 1 : 0,
        FAIL: taskStatus === "FAIL" ? 1 : 0,
        FLAKY: 0,
        BLOCKED: 0,
        ERROR: taskStatus === "ERROR" ? 1 : 0,
        NOT_APPLICABLE: 0,
        NOT_RUN: 0,
      },
      finding_count: outcome.finding ? 1 : 0,
      completeness: outcome.expectedCompleteness,
      exit_code: outcome.expectedExit,
    },
  };
}

const matrix: readonly [string, OutcomeCase][] = [
  [
    "returns 0 for a stable complete clean outcome",
    { expectedExit: 0, expectedCompleteness: "complete" },
  ],
  [
    "returns 4 for a stable material gap",
    { gap: true, expectedExit: 4, expectedCompleteness: "materially_incomplete" },
  ],
  [
    "returns 1 when a repository finding and material gap occur together",
    { gap: true, finding: true, expectedExit: 1, expectedCompleteness: "materially_incomplete" },
  ],
  [
    "returns 3 when tree drift, a repository finding, and a material gap occur together",
    {
      gap: true,
      finding: true,
      drift: true,
      expectedExit: 3,
      expectedCompleteness: "materially_incomplete",
    },
  ],
  [
    "returns 2 when an internal task error, tree drift, a finding, and a gap occur together",
    {
      gap: true,
      finding: true,
      drift: true,
      error: true,
      expectedExit: 2,
      expectedCompleteness: "unknown_due_to_error",
    },
  ],
];

describe("T060 simultaneous exit-precedence contract", () => {
  for (const [name, outcome] of matrix) {
    it(name, () => {
      const receipt = receiptFor(outcome);

      expect(deriveReceiptCompleteness(receipt)).toBe(outcome.expectedCompleteness);
      expect(decideReceiptExitCode(receipt)).toBe(outcome.expectedExit);
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    });
  }

  it("locks the canonical precedence order 2 > 3 > 1 > 4 > 0", () => {
    expect(matrix.map(([, outcome]) => outcome.expectedExit)).toEqual([0, 4, 1, 3, 2]);
  });
});
