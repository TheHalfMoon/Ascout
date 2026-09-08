import { describe, expect, it } from "vitest";

import { validateReceiptJsonSchema } from "../src/receipt/json.js";
import {
  validateReceiptSemantics,
  type ReceiptV1,
} from "../src/receipt/model.js";

const REGISTRY_VERSION = "SPEC009-CASE-REGISTRY-V1" as const;

function lineControl(): ReceiptV1 {
  return {
    schema_version: "1.0",
    run: {
      run_id: "run-1",
      ascout_version: "0.1.0-m1",
      started_at: "2026-01-01T00:00:00.000Z",
      finished_at: "2026-01-01T00:00:03.000Z",
      config_digest: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    },
    source: {
      start: {
        repository_id: "remote:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        repository_id_kind: "remote",
        portable: true,
        head_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        detached: false,
        shallow: false,
        tree_digest_version: 1,
        tree_digest: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        tracked_index_entry_count: 1,
        unstaged_changed_count: 1,
        included_untracked_count: 0,
      },
      end: {
        repository_id: "remote:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        repository_id_kind: "remote",
        portable: true,
        head_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        detached: false,
        shallow: false,
        tree_digest_version: 1,
        tree_digest: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        tracked_index_entry_count: 1,
        unstaged_changed_count: 1,
        included_untracked_count: 0,
      },
    },
    comparison: {
      kind: "working_tree_vs_head",
      base_ref: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      includes_staged: true,
      includes_unstaged: true,
      includes_untracked_nonignored: true,
      changed_files: [{
        path: "src/example.ts",
        change_kind: "modified",
        line_semantics: "text",
        changed_new_line_ranges: [[10, 10]],
        is_test_file: false,
        is_snapshot: false,
        is_command_surface: false,
      }],
    },
    selection: {
      mode: "native_related",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: 1,
      deselected_test_count: 0,
      total_test_count: 1,
      widened: false,
      widen_triggers: [],
      passes: [{
        ordinal: 1,
        mode: "native_related",
        scope: { kind: "repository", path: null },
        trigger: null,
        selected_test_count: 1,
        deselected_test_count: 0,
        total_test_count: 1,
      }],
      limitations: [],
    },
    tasks: [{
      task_id: "task-test",
      task_type: "test",
      authorized_by: "discovery",
      source_path: "package.json",
      argv: ["vitest", "related", "src/example.ts", "--run"],
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
      started_at: "2026-01-01T00:00:01.000Z",
      finished_at: "2026-01-01T00:00:02.000Z",
      duration_ms: 1000,
      observations: { runs: 1, failures: 0 },
      cache_state: "not_applicable",
      selected_test_count: 1,
      deselected_test_count: 0,
      evidence_ids: ["e-test", "e-coverage"],
      artifact_refs: [],
      output_truncated: false,
    }],
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
      records: [{
        path: "src/example.ts",
        line: 10,
        state: "EXERCISED",
        execution_count: 1,
        source_task_ids: ["task-test"],
      }],
    },
    test_changes: [],
    findings: [],
    evidence: [{
      evidence_id: "e-test",
      run_id: "run-1",
      task_id: "task-test",
      sequence: 1,
      kind: "test_result",
      sha256: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      artifact_id: null,
      redacted: false,
      truncated: false,
    }, {
      evidence_id: "e-coverage",
      run_id: "run-1",
      task_id: "task-test",
      sequence: 2,
      kind: "coverage",
      sha256: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      artifact_id: null,
      redacted: false,
      truncated: false,
    }],
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

function branchControl(): ReceiptV1 {
  const receipt = structuredClone(lineControl());
  const exercise = receipt.exercise as unknown as {
    branch_records: Array<{
      path: string;
      line: number;
      block_id: string;
      branch_id: string;
      taken: number;
      state: "EXERCISED";
    }>;
    exercised_branches: number;
    not_exercised_branches: number;
    unresolved_branches: number;
    changed_files_with_zero_exercised_branches: number;
  };
  exercise.branch_records = [{
    path: "src/example.ts",
    line: 10,
    block_id: "block-1",
    branch_id: "branch-1",
    taken: 1,
    state: "EXERCISED",
  }, {
    path: "src/example.ts",
    line: 10,
    block_id: "block-1",
    branch_id: "branch-2",
    taken: 1,
    state: "EXERCISED",
  }];
  exercise.exercised_branches = 2;
  exercise.not_exercised_branches = 0;
  exercise.unresolved_branches = 0;
  exercise.changed_files_with_zero_exercised_branches = 0;
  return receipt;
}

type MutableReceipt = Record<string, any>;
type CaseLayer = "schema" | "semantic";
interface CorpusCase {
  readonly id: string;
  readonly source: "line" | "branch";
  readonly layer: CaseLayer;
  readonly requiredCodes: readonly string[];
  readonly mutate: (receipt: MutableReceipt) => void;
}

function mutable(receipt: ReceiptV1): MutableReceipt {
  return receipt as unknown as MutableReceipt;
}

const CASES: readonly CorpusCase[] = [
  {
    id: "schema-root-missing-summary",
    source: "line",
    layer: "schema",
    requiredCodes: [],
    mutate: (receipt) => { delete receipt.summary; },
  },
  {
    id: "schema-root-additional-property",
    source: "line",
    layer: "schema",
    requiredCodes: [],
    mutate: (receipt) => { receipt.unexpected = true; },
  },
  {
    id: "schema-version-invalid",
    source: "line",
    layer: "schema",
    requiredCodes: [],
    mutate: (receipt) => { receipt.schema_version = "2.0"; },
  },
  {
    id: "schema-changed-path-backslash",
    source: "line",
    layer: "schema",
    requiredCodes: [],
    mutate: (receipt) => { receipt.comparison.changed_files[0].path = "src\\example.ts"; },
  },
  {
    id: "schema-changed-range-zero-endpoint",
    source: "line",
    layer: "schema",
    requiredCodes: [],
    mutate: (receipt) => { receipt.comparison.changed_files[0].changed_new_line_ranges = [[0, 10]]; },
  },
  {
    id: "schema-task-invalid-status",
    source: "line",
    layer: "schema",
    requiredCodes: [],
    mutate: (receipt) => { receipt.tasks[0].status = "UNKNOWN"; },
  },
  {
    id: "schema-command-surface-normal-admission",
    source: "line",
    layer: "schema",
    requiredCodes: [],
    mutate: (receipt) => {
      receipt.tasks[0].command_surface_changed = true;
      receipt.tasks[0].changed_authority_paths = ["src/example.ts"];
    },
  },
  {
    id: "schema-exercised-record-zero-count",
    source: "line",
    layer: "schema",
    requiredCodes: [],
    mutate: (receipt) => { receipt.exercise.records[0].execution_count = 0; },
  },
  {
    id: "semantic-comparison-base-mismatch",
    source: "line",
    layer: "semantic",
    requiredCodes: ["comparison_source_mismatch"],
    mutate: (receipt) => { receipt.comparison.base_ref = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"; },
  },
  {
    id: "semantic-source-end-repository-mismatch",
    source: "line",
    layer: "semantic",
    requiredCodes: ["source_repository_changed"],
    mutate: (receipt) => {
      receipt.source.end.repository_id =
        "remote:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      receipt.stability = "unknown";
      receipt.summary.exit_code = 2;
    },
  },
  {
    id: "semantic-stable-with-missing-source-end",
    source: "line",
    layer: "semantic",
    requiredCodes: ["stability_mismatch"],
    mutate: (receipt) => { receipt.source.end = null; },
  },
  {
    id: "semantic-changed-range-inverted",
    source: "line",
    layer: "semantic",
    requiredCodes: ["changed_range_inverted"],
    mutate: (receipt) => { receipt.comparison.changed_files[0].changed_new_line_ranges = [[11, 10]]; },
  },
  {
    id: "semantic-changed-range-overlap",
    source: "line",
    layer: "semantic",
    requiredCodes: ["changed_range_overlap"],
    mutate: (receipt) => {
      receipt.comparison.changed_files[0].changed_new_line_ranges = [[10, 11], [11, 12]];
    },
  },
  {
    id: "semantic-deleted-line-semantics",
    source: "line",
    layer: "semantic",
    requiredCodes: ["deleted_line_semantics"],
    mutate: (receipt) => { receipt.comparison.changed_files[0].change_kind = "deleted"; },
  },
  {
    id: "semantic-nontext-ranges-present",
    source: "line",
    layer: "semantic",
    requiredCodes: ["nontext_changed_ranges"],
    mutate: (receipt) => {
      receipt.comparison.changed_files[0].line_semantics = "binary_or_non_line";
      receipt.changed_code.changed_text_line_count = 0;
    },
  },
  {
    id: "semantic-authority-path-not-in-comparison",
    source: "line",
    layer: "semantic",
    requiredCodes: ["changed_authority_path_not_in_comparison"],
    mutate: (receipt) => {
      receipt.tasks[0].command_surface_changed = true;
      receipt.tasks[0].changed_authority_paths = ["config/missing.json"];
      receipt.tasks[0].execution_admission = "explicit_changed_surface_override";
    },
  },
  {
    id: "semantic-command-surface-file-fact-mismatch",
    source: "line",
    layer: "semantic",
    requiredCodes: ["command_surface_file_fact_mismatch"],
    mutate: (receipt) => {
      receipt.tasks[0].command_surface_changed = true;
      receipt.tasks[0].changed_authority_paths = ["src/example.ts"];
      receipt.tasks[0].execution_admission = "explicit_changed_surface_override";
    },
  },
  {
    id: "semantic-run-timeline-reversed",
    source: "line",
    layer: "semantic",
    requiredCodes: ["run_timeline_reversed", "task_timeline_outside_run"],
    mutate: (receipt) => { receipt.run.finished_at = "2025-12-31T23:59:59.000Z"; },
  },
  {
    id: "semantic-executed-task-timing-missing",
    source: "line",
    layer: "semantic",
    requiredCodes: ["executed_task_timing_required"],
    mutate: (receipt) => {
      receipt.tasks[0].started_at = null;
      receipt.tasks[0].finished_at = null;
      receipt.tasks[0].duration_ms = null;
    },
  },
  {
    id: "semantic-task-timeline-outside-run",
    source: "line",
    layer: "semantic",
    requiredCodes: ["task_timeline_outside_run"],
    mutate: (receipt) => {
      receipt.tasks[0].started_at = "2025-12-31T23:59:59.000Z";
      receipt.tasks[0].duration_ms = 3000;
    },
  },
  {
    id: "semantic-task-duration-mismatch",
    source: "line",
    layer: "semantic",
    requiredCodes: ["task_duration_mismatch"],
    mutate: (receipt) => { receipt.tasks[0].duration_ms = 1001; },
  },
  {
    id: "semantic-observation-failures-exceed-runs",
    source: "line",
    layer: "semantic",
    requiredCodes: ["observation_failures_exceed_runs"],
    mutate: (receipt) => {
      receipt.tasks[0].status = "FAIL";
      receipt.tasks[0].observations = { runs: 1, failures: 2 };
      receipt.summary.task_status_counts.PASS = 0;
      receipt.summary.task_status_counts.FAIL = 1;
      receipt.summary.exit_code = 1;
    },
  },
  {
    id: "semantic-pass-with-failure-observation",
    source: "line",
    layer: "semantic",
    requiredCodes: ["pass_with_failure_observation"],
    mutate: (receipt) => { receipt.tasks[0].observations.failures = 1; },
  },
  {
    id: "semantic-fail-without-failure-observation",
    source: "line",
    layer: "semantic",
    requiredCodes: ["fail_without_failure_observation"],
    mutate: (receipt) => {
      receipt.tasks[0].status = "FAIL";
      receipt.summary.task_status_counts.PASS = 0;
      receipt.summary.task_status_counts.FAIL = 1;
      receipt.summary.exit_code = 1;
    },
  },
  {
    id: "semantic-selection-count-mismatch",
    source: "line",
    layer: "semantic",
    requiredCodes: ["selection_count_mismatch"],
    mutate: (receipt) => {
      receipt.selection.selected_test_count = 2;
      receipt.selection.deselected_test_count = 0;
      receipt.selection.total_test_count = 1;
    },
  },
  {
    id: "semantic-selection-unknown-without-limitation",
    source: "line",
    layer: "semantic",
    requiredCodes: ["selection_unknown_without_limitation"],
    mutate: (receipt) => { receipt.selection.selected_test_count = null; },
  },
  {
    id: "semantic-selection-widening-invariant",
    source: "line",
    layer: "semantic",
    requiredCodes: ["selection_widening_invariant"],
    mutate: (receipt) => { receipt.selection.widened = true; },
  },
  {
    id: "semantic-cross-run-evidence",
    source: "line",
    layer: "semantic",
    requiredCodes: ["cross_run_evidence"],
    mutate: (receipt) => {
      receipt.evidence[0].run_id = "run-other";
      receipt.tasks[0].evidence_ids = ["e-coverage"];
    },
  },
  {
    id: "semantic-dangling-task-evidence-ref",
    source: "line",
    layer: "semantic",
    requiredCodes: ["dangling_task_evidence_ref"],
    mutate: (receipt) => { receipt.tasks[0].evidence_ids = ["evidence-missing", "e-coverage"]; },
  },
  {
    id: "semantic-dangling-evidence-artifact-ref",
    source: "line",
    layer: "semantic",
    requiredCodes: ["dangling_evidence_artifact_ref"],
    mutate: (receipt) => { receipt.evidence[0].artifact_id = "artifact-missing"; },
  },
  {
    id: "semantic-dangling-task-artifact-ref",
    source: "line",
    layer: "semantic",
    requiredCodes: ["dangling_task_artifact_ref"],
    mutate: (receipt) => { receipt.tasks[0].artifact_refs = ["artifact-missing"]; },
  },
  {
    id: "semantic-evidence-unknown-task",
    source: "line",
    layer: "semantic",
    requiredCodes: ["dangling_evidence_task_ref"],
    mutate: (receipt) => {
      receipt.evidence[0].task_id = "task-missing";
      receipt.tasks[0].evidence_ids = ["e-coverage"];
    },
  },
  {
    id: "semantic-duplicate-evidence-id",
    source: "line",
    layer: "semantic",
    requiredCodes: ["duplicate_evidence_id"],
    mutate: (receipt) => {
      const appended = structuredClone(receipt.evidence[0]);
      appended.sequence = 3;
      receipt.evidence.push(appended);
    },
  },
  {
    id: "semantic-duplicate-evidence-logical-id",
    source: "line",
    layer: "semantic",
    requiredCodes: ["duplicate_evidence_logical_id"],
    mutate: (receipt) => {
      const appended = structuredClone(receipt.evidence[0]);
      appended.evidence_id = "e-test-duplicate";
      receipt.evidence.push(appended);
    },
  },
  {
    id: "semantic-exercise-line-outside-changed-scope",
    source: "line",
    layer: "semantic",
    requiredCodes: ["exercise_line_outside_changed_scope"],
    mutate: (receipt) => { receipt.exercise.records[0].line = 11; },
  },
  {
    id: "semantic-exercise-summary-mismatch",
    source: "line",
    layer: "semantic",
    requiredCodes: ["exercise_summary_mismatch"],
    mutate: (receipt) => { receipt.exercise.exercised_lines = 0; },
  },
  {
    id: "semantic-exercise-source-task-not-executed-test",
    source: "line",
    layer: "semantic",
    requiredCodes: ["exercise_source_task_not_executed_test"],
    mutate: (receipt) => { receipt.tasks[0].task_type = "lint"; },
  },
  {
    id: "semantic-exercise-source-task-missing-coverage-evidence",
    source: "line",
    layer: "semantic",
    requiredCodes: ["exercise_source_task_missing_coverage_evidence"],
    mutate: (receipt) => {
      receipt.evidence = receipt.evidence.filter((entry: { evidence_id: string }) => entry.evidence_id !== "e-coverage");
      receipt.tasks[0].evidence_ids = ["e-test"];
    },
  },
  {
    id: "semantic-task-status-count-mismatch",
    source: "line",
    layer: "semantic",
    requiredCodes: ["task_status_count_mismatch"],
    mutate: (receipt) => { receipt.summary.task_status_counts.PASS = 0; },
  },
  {
    id: "semantic-completeness-mismatch",
    source: "line",
    layer: "semantic",
    requiredCodes: ["completeness_mismatch"],
    mutate: (receipt) => { receipt.summary.completeness = "materially_incomplete"; },
  },
  {
    id: "semantic-clean-exit-with-material-gap",
    source: "line",
    layer: "semantic",
    requiredCodes: ["completeness_mismatch", "exit_code_mismatch"],
    mutate: (receipt) => {
      receipt.exercise.records[0].state = "NOT_EXERCISED";
      receipt.exercise.records[0].execution_count = 0;
      receipt.exercise.exercised_lines = 0;
      receipt.exercise.not_exercised_lines = 1;
      receipt.exercise.changed_files_with_zero_exercised_lines = 1;
    },
  },
  {
    id: "semantic-duplicate-branch-identity",
    source: "branch",
    layer: "semantic",
    requiredCodes: ["duplicate_exercise_branch"],
    mutate: (receipt) => {
      receipt.exercise.branch_records.push(structuredClone(receipt.exercise.branch_records[0]));
      receipt.exercise.exercised_branches = 3;
    },
  },
  {
    id: "semantic-branch-order",
    source: "branch",
    layer: "semantic",
    requiredCodes: ["exercise_branch_order"],
    mutate: (receipt) => {
      [receipt.exercise.branch_records[0], receipt.exercise.branch_records[1]] =
        [receipt.exercise.branch_records[1], receipt.exercise.branch_records[0]];
    },
  },
  {
    id: "semantic-branch-summary-mismatch",
    source: "branch",
    layer: "semantic",
    requiredCodes: ["exercise_branch_summary_mismatch"],
    mutate: (receipt) => { receipt.exercise.exercised_branches = 1; },
  },
] as const;

describe("T115 SPEC009-CASE-REGISTRY-V1 receipt adversarial corpus", () => {
  it("executes both controls and all frozen invalid cases exactly once with exact accounting", () => {
    const controls = [
      ["control-valid-line-receipt", lineControl()],
      ["control-valid-branch-receipt", branchControl()],
    ] as const;
    const baselineControlDeviations: string[] = [];
    const declaredCaseIds = CASES.map((entry) => entry.id);
    const executedCaseIds: string[] = [];
    const acceptedInvalidCaseIds: string[] = [];
    const candidateConstructionDeviations: string[] = [];

    for (const [id, receipt] of controls) {
      const schema = validateReceiptJsonSchema(receipt);
      if (!schema.valid) {
        baselineControlDeviations.push(`${id}:schema:${JSON.stringify(schema.issues)}`);
        continue;
      }

      const semantic = validateReceiptSemantics(receipt);
      if (!semantic.valid) {
        baselineControlDeviations.push(`${id}:semantic:${JSON.stringify(semantic.issues)}`);
      }
    }

    for (const entry of CASES) {
      const source = entry.source === "line" ? lineControl() : branchControl();
      const sourceBefore = structuredClone(source);
      const candidate = structuredClone(source);

      entry.mutate(mutable(candidate));
      executedCaseIds.push(entry.id);

      if (JSON.stringify(sourceBefore) !== JSON.stringify(source)) {
        candidateConstructionDeviations.push(`${entry.id}:source-mutated`);
      }

      const schema = validateReceiptJsonSchema(candidate);
      if (entry.layer === "schema") {
        if (schema.valid) acceptedInvalidCaseIds.push(entry.id);
        continue;
      }

      if (!schema.valid) {
        candidateConstructionDeviations.push(
          `${entry.id}:unexpected-schema-rejection:${JSON.stringify(schema.issues)}`,
        );
        continue;
      }

      const semantic = validateReceiptSemantics(candidate);
      if (semantic.valid) {
        acceptedInvalidCaseIds.push(entry.id);
        continue;
      }

      const observedCodes = new Set(semantic.issues.map((issue) => issue.code));
      for (const requiredCode of entry.requiredCodes) {
        if (!observedCodes.has(requiredCode)) {
          candidateConstructionDeviations.push(
            `${entry.id}:missing-required-code:${requiredCode}:${JSON.stringify(semantic.issues)}`,
          );
        }
      }
    }

    const skippedOrUnexecutedCaseIds = declaredCaseIds.filter((id) => !executedCaseIds.includes(id));
    const undeclaredQualificationCaseIds = executedCaseIds.filter((id) => !declaredCaseIds.includes(id));
    const schemaCaseCount = CASES.filter((entry) => entry.layer === "schema").length;
    const semanticCaseCount = CASES.filter((entry) => entry.layer === "semantic").length;
    const totalDeclaredExecutionCount = controls.length + CASES.length;
    const totalExecutedCount = controls.length + executedCaseIds.length;

    expect(new Set(declaredCaseIds).size).toBe(declaredCaseIds.length);
    expect(REGISTRY_VERSION).toBe("SPEC009-CASE-REGISTRY-V1");
    expect(controls).toHaveLength(2);
    expect(CASES).toHaveLength(44);
    expect(schemaCaseCount).toBe(8);
    expect(semanticCaseCount).toBe(36);
    expect(totalDeclaredExecutionCount).toBe(46);
    expect(totalExecutedCount).toBe(46);
    expect(acceptedInvalidCaseIds).toEqual([]);
    expect(skippedOrUnexecutedCaseIds).toEqual([]);
    expect(undeclaredQualificationCaseIds).toEqual([]);
    expect(baselineControlDeviations).toEqual([]);
    expect(candidateConstructionDeviations).toEqual([]);
  });
});
