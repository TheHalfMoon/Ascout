import { describe, expect, it } from "vitest";

import {
  decideReceiptExitCode,
  deriveReceiptCompleteness,
  validateReceiptSemantics,
  type ReceiptV1,
  type TaskStatus,
} from "../src/receipt/model.js";

function validReceipt(): ReceiptV1 {
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
    tracked_index_entry_count: 2,
    unstaged_changed_count: 1,
    included_untracked_count: 0,
  };

  return {
    schema_version: "1.0",
    run: {
      run_id: "run-1",
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
      ],
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
      limitations: ["no test task selected in this fixture"],
    },
    tasks: [
      {
        task_id: "lint-1",
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
        started_at: "2026-08-22T20:00:00.000Z",
        finished_at: "2026-08-22T20:00:01.000Z",
        duration_ms: 1000,
        observations: { runs: 1, failures: 0 },
        cache_state: "cold",
        evidence_ids: ["e1"],
        artifact_refs: ["a1"],
        output_truncated: false,
      },
    ],
    changed_code: { changed_file_count: 1, changed_text_line_count: 3 },
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
    evidence: [
      {
        evidence_id: "e1",
        run_id: "run-1",
        task_id: "lint-1",
        sequence: 1,
        kind: "process_result",
        sha256: "e".repeat(64),
        artifact_id: "a1",
        redacted: true,
        truncated: false,
      },
    ],
    artifacts: [
      {
        artifact_id: "a1",
        task_id: "lint-1",
        relative_run_path: "raw/lint.txt",
        kind: "stdout",
        sha256: "f".repeat(64),
        byte_length: 10,
        redacted: true,
        truncated: false,
      },
    ],
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

function replaceTaskStatus(receipt: ReceiptV1, status: TaskStatus): void {
  const task = receipt.tasks[0] as unknown as {
    status: TaskStatus;
    reason_code: string | null;
    reason_text: string | null;
    argv: string[];
    tool_name: string | null;
    tool_version: string | null;
    exit_code: number | null;
    started_at: string | null;
    finished_at: string | null;
    duration_ms: number | null;
  };
  task.status = status;
  if (status === "NOT_RUN" || status === "BLOCKED") {
    task.reason_code = status === "NOT_RUN" ? "tool_missing" : "prerequisite_blocked";
    task.reason_text = "fixture reason";
    task.argv = [];
    task.tool_name = null;
    task.tool_version = null;
    task.exit_code = null;
    task.started_at = null;
    task.finished_at = null;
    task.duration_ms = null;
  }
}

describe("T025 receipt semantic model", () => {
  it("accepts one internally consistent receipt", () => {
    const result = validateReceiptSemantics(validReceipt());
    expect(result).toEqual({ valid: true, issues: [] });
  });

  it("requires full exact source/comparison Git identity", () => {
    const abbreviated = structuredClone(validReceipt()) as ReceiptV1;
    (abbreviated.source.start as { head_sha: string }).head_sha = "a".repeat(12);
    expect(issueCodes(abbreviated)).toContain("invalid_git_object_id");

    const mismatch = structuredClone(validReceipt()) as ReceiptV1;
    (mismatch.comparison as { base_ref: string }).base_ref = "b".repeat(40);
    expect(issueCodes(mismatch)).toContain("comparison_source_mismatch");
  });

  it("rejects original path spellings instead of repairing them", () => {
    for (const invalid of [
      "/src/a.ts",
      "C:/repo/src/a.ts",
      "\\\\server\\share\\a.ts",
      "file:///src/a.ts",
      "src\\a.ts",
      "./src/a.ts",
      "src/../a.ts",
      "src//a.ts",
      "src/",
    ]) {
      const receipt = structuredClone(validReceipt()) as ReceiptV1;
      (receipt.comparison.changed_files[0] as { path: string }).path = invalid;
      expect(issueCodes(receipt), invalid).toContain("noncanonical_original_path");
    }
  });

  it("rejects inverted changed-line ranges before changed-line arithmetic", () => {
    const receipt = structuredClone(validReceipt()) as ReceiptV1;
    (receipt.comparison.changed_files[0] as unknown as { changed_new_line_ranges: [number, number][] })
      .changed_new_line_ranges = [[10, 1]];
    (receipt.changed_code as { changed_text_line_count: number }).changed_text_line_count = 999;

    const codes = issueCodes(receipt);
    expect(codes).toContain("changed_range_inverted");
    expect(codes).not.toContain("changed_text_line_count_mismatch");
  });

  it("enforces rename, admission, reason, and non-executed runtime invariants", () => {
    const rename = structuredClone(validReceipt()) as ReceiptV1;
    (rename.comparison.changed_files[0] as { change_kind: "renamed"; previous_path?: string }).change_kind = "renamed";
    expect(issueCodes(rename)).toContain("rename_previous_path_required");

    const admission = structuredClone(validReceipt()) as ReceiptV1;
    const task = admission.tasks[0] as unknown as {
      command_surface_changed: boolean;
      changed_authority_paths: string[];
      execution_admission: "normal" | "refused_changed_surface" | "explicit_changed_surface_override";
      status: TaskStatus;
      reason_code: string | null;
      reason_text: string | null;
      argv: string[];
      tool_name: string | null;
      tool_version: string | null;
      exit_code: number | null;
      started_at: string | null;
      finished_at: string | null;
      duration_ms: number | null;
    };
    task.command_surface_changed = true;
    task.changed_authority_paths = ["package.json"];
    task.execution_admission = "refused_changed_surface";
    task.status = "NOT_RUN";
    task.reason_code = "command_surface_changed";
    task.reason_text = "changed command authority";
    task.argv = [];
    task.tool_name = null;
    task.tool_version = null;
    task.exit_code = null;
    task.started_at = null;
    task.finished_at = null;
    task.duration_ms = null;
    (admission.summary as { completeness: "materially_incomplete"; exit_code: 4 }).completeness = "materially_incomplete";
    (admission.summary as { exit_code: 4 }).exit_code = 4;
    (admission.summary.task_status_counts as { PASS: number; NOT_RUN: number }).PASS = 0;
    (admission.summary.task_status_counts as { PASS: number; NOT_RUN: number }).NOT_RUN = 1;
    expect(validateReceiptSemantics(admission).valid).toBe(true);
  });

  it("requires unique current-run task/evidence/artifact references", () => {
    const crossRun = structuredClone(validReceipt()) as ReceiptV1;
    (crossRun.evidence[0] as { run_id: string }).run_id = "other-run";
    expect(issueCodes(crossRun)).toContain("cross_run_evidence");

    const dangling = structuredClone(validReceipt()) as ReceiptV1;
    (dangling.tasks[0] as unknown as { evidence_ids: string[] }).evidence_ids = ["missing"];
    expect(issueCodes(dangling)).toContain("dangling_task_evidence_ref");

    const duplicateLogical = structuredClone(validReceipt()) as ReceiptV1;
    (duplicateLogical.evidence as unknown as Array<ReceiptV1["evidence"][number]>).push({
      ...duplicateLogical.evidence[0]!,
      evidence_id: "e2",
    });
    expect(issueCodes(duplicateLogical)).toContain("duplicate_evidence_logical_id");
  });

  it("enforces exercise state/count/reason and aggregate consistency", () => {
    const receipt = structuredClone(validReceipt()) as ReceiptV1;
    (receipt.exercise as {
      changed_executable_lines: number;
      exercised_lines: number;
      not_exercised_lines: number;
      unresolved_lines: number;
      changed_files_with_zero_exercised_lines: number;
      records: Array<{
        path: string;
        line: number;
        state: "UNRESOLVED";
        execution_count: null;
        source_task_ids: string[];
        reason?: string;
      }>;
    }).records = [{
      path: "src/a.ts",
      line: 10,
      state: "UNRESOLVED",
      execution_count: null,
      source_task_ids: ["lint-1"],
    }];
    expect(issueCodes(receipt)).toContain("exercise_state_count");
  });

  it("allows optional weak fingerprint metadata but rejects malformed persisted digests", () => {
    const receipt = structuredClone(validReceipt()) as ReceiptV1;
    (receipt.findings as unknown as Array<ReceiptV1["findings"][number]>).push({
      finding_id: "f1",
      task_id: "lint-1",
      producer: "eslint",
      message: "x",
      severity: "medium",
      in_changed_lines: true,
      introduced_by_change: "unknown",
      determinism_class: "deterministic",
      observations: { runs: 1, failures: 1 },
      reproduced: "unknown",
      fingerprint_version: null,
      fingerprint: "not-a-digest",
      evidence_ids: ["e1"],
    });
    expect(issueCodes(receipt)).toContain("fingerprint_invalid");
  });

  it("derives completeness independently from findings and applies exit precedence 2 > 3 > 1 > 4 > 0", () => {
    const clean = validReceipt();
    expect(deriveReceiptCompleteness(clean)).toBe("complete");
    expect(decideReceiptExitCode(clean)).toBe(0);

    const incomplete = structuredClone(clean) as ReceiptV1;
    replaceTaskStatus(incomplete, "NOT_RUN");
    expect(deriveReceiptCompleteness(incomplete)).toBe("materially_incomplete");
    expect(decideReceiptExitCode(incomplete)).toBe(4);

    const finding = structuredClone(clean) as ReceiptV1;
    replaceTaskStatus(finding, "FAIL");
    expect(deriveReceiptCompleteness(finding)).toBe("complete");
    expect(decideReceiptExitCode(finding)).toBe(1);

    const drift = structuredClone(finding) as ReceiptV1;
    (drift.source.end as { tree_digest: string }).tree_digest = "9".repeat(64);
    (drift as { stability: "tree_drifted" }).stability = "tree_drifted";
    expect(decideReceiptExitCode(drift)).toBe(3);

    const error = structuredClone(drift) as ReceiptV1;
    const task = error.tasks[0] as {
      status: TaskStatus;
      reason_code: string | null;
      reason_text: string | null;
    };
    task.status = "ERROR";
    task.reason_code = "task_execution_error";
    task.reason_text = "fixture error";
    expect(deriveReceiptCompleteness(error)).toBe("unknown_due_to_error");
    expect(decideReceiptExitCode(error)).toBe(2);
  });
});
