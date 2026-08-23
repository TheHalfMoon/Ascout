import { describe, expect, it } from "vitest";

import {
  decideReceiptExitCode,
  deriveReceiptCompleteness,
  validateReceiptSemantics,
  type Completeness,
  type ReceiptExitCode,
  type ReceiptV1,
  type TaskResultV1,
  type TaskStatus,
} from "../src/receipt/model.js";

const STATUS_UNDER_TEST = ["FAIL", "ERROR", "BLOCKED", "NOT_APPLICABLE", "NOT_RUN"] as const satisfies readonly TaskStatus[];

function baselineTask(): TaskResultV1 {
  return {
    task_id: "lint-baseline",
    task_type: "lint",
    authorized_by: "discovery",
    source_path: null,
    argv: ["eslint", "src/a.ts"],
    argv_redacted: false,
    tool_name: "eslint",
    tool_version: "1.0.0",
    command_surface_changed: false,
    changed_authority_paths: [],
    execution_admission: "normal",
    status: "PASS",
    reason_code: null,
    reason_text: null,
    exit_code: 0,
    started_at: "2026-08-23T06:00:00.000Z",
    finished_at: "2026-08-23T06:00:01.000Z",
    duration_ms: 1000,
    observations: { runs: 1, failures: 0 },
    cache_state: "cold",
    evidence_ids: [],
    artifact_refs: [],
    output_truncated: false,
  };
}

function statusTask(status: (typeof STATUS_UNDER_TEST)[number]): TaskResultV1 {
  const common = {
    task_id: "typecheck-status",
    task_type: "typecheck" as const,
    authorized_by: "discovery" as const,
    source_path: null,
    argv_redacted: false,
    command_surface_changed: false,
    changed_authority_paths: [] as const,
    execution_admission: "normal" as const,
    evidence_ids: [] as const,
    artifact_refs: [] as const,
    output_truncated: false,
  };

  if (status === "FAIL") {
    return {
      ...common,
      argv: ["tsc", "--noEmit"],
      tool_name: "tsc",
      tool_version: "6.0.0",
      status,
      reason_code: null,
      reason_text: null,
      exit_code: 2,
      started_at: "2026-08-23T06:00:00.000Z",
      finished_at: "2026-08-23T06:00:01.000Z",
      duration_ms: 1000,
      observations: { runs: 1, failures: 1 },
      cache_state: "cold",
    };
  }

  if (status === "ERROR") {
    return {
      ...common,
      argv: ["tsc", "--noEmit"],
      tool_name: "tsc",
      tool_version: "6.0.0",
      status,
      reason_code: "execution_error",
      reason_text: "TypeScript execution could not be interpreted reliably.",
      exit_code: 2,
      started_at: "2026-08-23T06:00:00.000Z",
      finished_at: "2026-08-23T06:00:01.000Z",
      duration_ms: 1000,
      observations: { runs: 0, failures: 0 },
      cache_state: "cold",
    };
  }

  if (status === "BLOCKED") {
    return {
      ...common,
      argv: [],
      tool_name: null,
      tool_version: null,
      status,
      reason_code: "prerequisite_blocked",
      reason_text: "A genuine internal validity prerequisite prevented execution.",
      exit_code: null,
      started_at: null,
      finished_at: null,
      duration_ms: null,
      observations: { runs: 0, failures: 0 },
      cache_state: "not_applicable",
    };
  }

  if (status === "NOT_RUN") {
    return {
      ...common,
      argv: [],
      tool_name: null,
      tool_version: null,
      status,
      reason_code: "tool_missing",
      reason_text: "The applicable task could not execute because its tool is unavailable.",
      exit_code: null,
      started_at: null,
      finished_at: null,
      duration_ms: null,
      observations: { runs: 0, failures: 0 },
      cache_state: "not_applicable",
    };
  }

  return {
    ...common,
    argv: [],
    tool_name: null,
    tool_version: null,
    status: "NOT_APPLICABLE",
    reason_code: null,
    reason_text: null,
    exit_code: null,
    started_at: null,
    finished_at: null,
    duration_ms: null,
    observations: { runs: 0, failures: 0 },
    cache_state: "not_applicable",
  };
}

function baseReceipt(tasks: readonly TaskResultV1[] = [baselineTask()]): ReceiptV1 {
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

  const receipt: ReceiptV1 = {
    schema_version: "1.0",
    run: {
      run_id: "run-status-contract",
      ascout_version: "0.0.0",
      started_at: "2026-08-23T06:00:00.000Z",
      finished_at: "2026-08-23T06:00:01.000Z",
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
      mode: "no_test_task",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: null,
      deselected_test_count: null,
      total_test_count: null,
      widened: false,
      widen_triggers: [],
      passes: [],
      limitations: ["no test task participates in this status fixture"],
    },
    tasks,
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
    evidence: [],
    artifacts: [],
    stability: "stable",
    summary: {
      task_status_counts: {
        PASS: 0,
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

  synchronizeSummary(receipt);
  return receipt;
}

function synchronizeSummary(receipt: ReceiptV1): void {
  const counts = {
    PASS: 0,
    FAIL: 0,
    FLAKY: 0,
    BLOCKED: 0,
    ERROR: 0,
    NOT_APPLICABLE: 0,
    NOT_RUN: 0,
  };
  for (const task of receipt.tasks) counts[task.status] += 1;

  (receipt.summary as unknown as {
    task_status_counts: typeof counts;
    completeness: Completeness;
    exit_code: ReceiptExitCode;
  }).task_status_counts = counts;
  (receipt.summary as unknown as { completeness: Completeness }).completeness = deriveReceiptCompleteness(receipt);
  (receipt.summary as unknown as { exit_code: ReceiptExitCode }).exit_code = decideReceiptExitCode(receipt);
}

function issueCodes(receipt: ReceiptV1): readonly string[] {
  return validateReceiptSemantics(receipt).issues.map((issue) => issue.code);
}

describe("T032 task-status contract", () => {
  it("keeps FAIL, ERROR, BLOCKED, N/A, and NOT_RUN semantically distinct", () => {
    const expectations: Readonly<Record<(typeof STATUS_UNDER_TEST)[number], {
      readonly completeness: Completeness;
      readonly exitCode: ReceiptExitCode;
    }>> = {
      FAIL: { completeness: "complete", exitCode: 1 },
      ERROR: { completeness: "unknown_due_to_error", exitCode: 2 },
      BLOCKED: { completeness: "materially_incomplete", exitCode: 4 },
      NOT_APPLICABLE: { completeness: "complete", exitCode: 0 },
      NOT_RUN: { completeness: "materially_incomplete", exitCode: 4 },
    };

    expect(new Set(STATUS_UNDER_TEST).size).toBe(STATUS_UNDER_TEST.length);

    for (const status of STATUS_UNDER_TEST) {
      const receipt = baseReceipt([baselineTask(), statusTask(status)]);
      const result = validateReceiptSemantics(receipt);

      expect(result, status).toEqual({ valid: true, issues: [] });
      expect(receipt.tasks[1]?.status).toBe(status);
      expect(deriveReceiptCompleteness(receipt), status).toBe(expectations[status].completeness);
      expect(decideReceiptExitCode(receipt), status).toBe(expectations[status].exitCode);
      expect(receipt.summary.task_status_counts[status], status).toBe(1);
    }
  });

  it.each(["ERROR", "BLOCKED", "NOT_RUN"] as const)(
    "%s requires non-empty machine and human reasons",
    (status) => {
      for (const field of ["reason_code", "reason_text"] as const) {
        const receipt = baseReceipt([baselineTask(), statusTask(status)]);
        (receipt.tasks[1] as unknown as Record<typeof field, string | null>)[field] = "";

        expect(issueCodes(receipt), `${status}.${field}`).toContain("task_reason_required");
      }
    },
  );

  it("does not require refusal reasons for FAIL or semantic N/A", () => {
    for (const status of ["FAIL", "NOT_APPLICABLE"] as const) {
      const receipt = baseReceipt([baselineTask(), statusTask(status)]);
      expect(receipt.tasks[1]?.reason_code).toBeNull();
      expect(receipt.tasks[1]?.reason_text).toBeNull();
      expect(issueCodes(receipt), status).not.toContain("task_reason_required");
    }
  });

  it("preserves valid deselection as SelectionAccount data while the executed test task remains PASS", () => {
    const testTask: TaskResultV1 = {
      ...baselineTask(),
      task_id: "test-selected",
      task_type: "test",
      argv: ["vitest", "--run", "src/a.test.ts"],
      tool_name: "vitest",
      selected_test_count: 2,
      deselected_test_count: 8,
    };
    const receipt = baseReceipt([baselineTask(), testTask]);
    (receipt.selection as unknown as ReceiptV1["selection"]) = {
      mode: "native_related",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: 2,
      deselected_test_count: 8,
      total_test_count: 10,
      widened: false,
      widen_triggers: [],
      passes: [{
        ordinal: 1,
        mode: "native_related",
        scope: { kind: "repository", path: null },
        trigger: null,
        selected_test_count: 2,
        deselected_test_count: 8,
        total_test_count: 10,
      }],
      limitations: [],
    };
    synchronizeSummary(receipt);

    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(receipt.tasks[1]?.status).toBe("PASS");
    expect(receipt.tasks[1]?.selected_test_count).toBe(2);
    expect(receipt.tasks[1]?.deselected_test_count).toBe(8);
    expect(receipt.selection).toMatchObject({
      selected_test_count: 2,
      deselected_test_count: 8,
      total_test_count: 10,
    });
    expect(receipt.summary.task_status_counts.PASS).toBe(2);
    expect(receipt.summary.task_status_counts.NOT_RUN).toBe(0);
    expect(deriveReceiptCompleteness(receipt)).toBe("complete");
    expect(decideReceiptExitCode(receipt)).toBe(0);
  });
});
