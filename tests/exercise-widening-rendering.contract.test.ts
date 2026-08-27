import { describe, expect, it } from "vitest";

import { buildReceipt, renderTerminalSummary } from "../src/receipt/build.js";
import { renderReceiptJson } from "../src/receipt/json.js";
import type { ReceiptV1, SourceStateV1 } from "../src/receipt/model.js";

function sourceState(): SourceStateV1 {
  return {
    repository_id: `local:${"a".repeat(64)}`,
    repository_id_kind: "local_only",
    portable: false,
    head_sha: "b".repeat(40),
    detached: false,
    shallow: false,
    tree_digest_version: 1,
    tree_digest: "c".repeat(64),
    tracked_index_entry_count: 1,
    unstaged_changed_count: 1,
    included_untracked_count: 0,
  };
}

function gapReceipt(): ReceiptV1 {
  const source = sourceState();
  return buildReceipt({
    run: {
      run_id: "run-t056-render",
      ascout_version: "0.1.0-m1",
      started_at: "2026-08-27T10:00:00.000Z",
      finished_at: "2026-08-27T10:00:02.000Z",
      config_digest: "d".repeat(64),
    },
    sourceStart: source,
    sourceEnd: { ...source },
    comparison: {
      kind: "working_tree_vs_head",
      base_ref: source.head_sha,
      includes_staged: true,
      includes_unstaged: true,
      includes_untracked_nonignored: true,
      changed_files: [{
        path: "src/a.ts",
        change_kind: "modified",
        line_semantics: "text",
        changed_new_line_ranges: [[1, 3]],
        is_test_file: false,
        is_snapshot: false,
        is_command_surface: false,
      }],
    },
    selection: {
      mode: "full",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: null,
      deselected_test_count: null,
      total_test_count: null,
      widened: true,
      widen_triggers: ["post_run_exercise_gap"],
      passes: [
        {
          ordinal: 1,
          mode: "native_related",
          scope: { kind: "repository", path: null },
          trigger: null,
          selected_test_count: null,
          deselected_test_count: null,
          total_test_count: null,
        },
        {
          ordinal: 2,
          mode: "full",
          scope: { kind: "repository", path: null },
          trigger: "post_run_exercise_gap",
          selected_test_count: null,
          deselected_test_count: null,
          total_test_count: null,
        },
      ],
      limitations: ["selection_counts_not_observed"],
    },
    tasks: [{
      task_id: "test",
      task_type: "test",
      authorized_by: "discovery",
      source_path: "package.json",
      argv: ["vitest", "run"],
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
      started_at: "2026-08-27T10:00:00.000Z",
      finished_at: "2026-08-27T10:00:02.000Z",
      duration_ms: 2000,
      observations: { runs: 2, failures: 0 },
      cache_state: "not_applicable",
      evidence_ids: ["test.e1"],
      artifact_refs: [],
      output_truncated: false,
    }],
    exercise: {
      changed_executable_lines: 3,
      exercised_lines: 1,
      not_exercised_lines: 1,
      unresolved_lines: 1,
      changed_files_with_zero_exercised_lines: 0,
      records: [
        {
          path: "src/a.ts",
          line: 1,
          state: "EXERCISED",
          execution_count: 2,
          source_task_ids: ["test"],
        },
        {
          path: "src/a.ts",
          line: 2,
          state: "NOT_EXERCISED",
          execution_count: 0,
          source_task_ids: ["test"],
        },
        {
          path: "src/a.ts",
          line: 3,
          state: "UNRESOLVED",
          execution_count: null,
          source_task_ids: ["test"],
          reason: "coverage_source_mapping_unresolved",
        },
      ],
    },
    testChanges: [],
    findings: [],
    evidence: [{
      evidence_id: "test.e1",
      run_id: "run-t056-render",
      task_id: "test",
      sequence: 1,
      kind: "coverage",
      sha256: "e".repeat(64),
      artifact_id: null,
      redacted: false,
      truncated: false,
    }],
    artifacts: [],
  });
}

describe("T056 exercise/widening/completeness rendering", () => {
  it("surfaces bounded selection passes and exercise gaps in the terminal while preserving exit 4", () => {
    const receipt = gapReceipt();
    const summary = renderTerminalSummary(receipt);

    expect(receipt.summary).toMatchObject({
      completeness: "materially_incomplete",
      exit_code: 4,
    });
    expect(summary).toContain(
      "selection: mode=full initial=repository widened=true passes=2 triggers=post_run_exercise_gap",
    );
    expect(summary).toContain("pass 1: mode=native_related scope=repository trigger=none");
    expect(summary).toContain("pass 2: mode=full scope=repository trigger=post_run_exercise_gap");
    expect(summary).toContain(
      "exercise: changed_executable=3 exercised=1 not_exercised=1 unresolved=1 zero_exercised_files=0",
    );
    expect(summary).toContain("completeness=materially_incomplete exit=4 findings=0");
    expect(summary.split("\n").length).toBeLessThan(30);
  });

  it("renders the same widening, exercise, completeness, and exit truth in JSON", () => {
    const receipt = gapReceipt();
    const json = JSON.parse(renderReceiptJson(receipt)) as ReceiptV1;

    expect(json.selection).toEqual(receipt.selection);
    expect(json.exercise).toEqual(receipt.exercise);
    expect(json.summary).toEqual(receipt.summary);
    expect(json.summary.exit_code).toBe(4);
    expect(json.summary.completeness).toBe("materially_incomplete");
  });
});
