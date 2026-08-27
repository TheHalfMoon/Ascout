import { describe, expect, it } from "vitest";

import type { GitChangedFile } from "../src/git.js";
import { validateReceiptSemantics, type ReceiptV1, type SelectionV1 } from "../src/receipt/model.js";
import {
  decidePostRunWidening,
  postRunPlanningChangedFiles,
  withPostRunWideningPass,
} from "../src/selection.js";

function twoPassReceipt(): ReceiptV1 {
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
      run_id: "run-t048",
      ascout_version: "0.0.0",
      started_at: "2026-08-27T04:20:00.000Z",
      finished_at: "2026-08-27T04:20:02.000Z",
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
      mode: "full",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: 2,
      deselected_test_count: 0,
      total_test_count: 2,
      widened: true,
      widen_triggers: ["post_run_exercise_gap"],
      passes: [
        {
          ordinal: 1,
          mode: "native_related",
          scope: { kind: "repository", path: null },
          trigger: null,
          selected_test_count: 1,
          deselected_test_count: 1,
          total_test_count: 2,
        },
        {
          ordinal: 2,
          mode: "full",
          scope: { kind: "repository", path: null },
          trigger: "post_run_exercise_gap",
          selected_test_count: 2,
          deselected_test_count: 0,
          total_test_count: 2,
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
        argv: ["vitest", "--run"],
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
        started_at: "2026-08-27T04:20:00.000Z",
        finished_at: "2026-08-27T04:20:02.000Z",
        duration_ms: 2000,
        observations: { runs: 2, failures: 0 },
        cache_state: "cold",
        selected_test_count: 2,
        deselected_test_count: 0,
        evidence_ids: ["coverage-1", "coverage-2"],
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
      exercised_lines: 0,
      not_exercised_lines: 0,
      unresolved_lines: 1,
      changed_files_with_zero_exercised_lines: 1,
      records: [
        {
          path: "src/a.ts",
          line: 10,
          state: "UNRESOLVED",
          execution_count: null,
          source_task_ids: ["test-1"],
          reason: "wider_pass_still_insufficient",
        },
      ],
    },
    test_changes: [],
    findings: [],
    evidence: [
      {
        evidence_id: "coverage-1",
        run_id: "run-t048",
        task_id: "test-1",
        sequence: 1,
        kind: "coverage",
        sha256: "e".repeat(64),
        artifact_id: null,
        redacted: false,
        truncated: false,
      },
      {
        evidence_id: "coverage-2",
        run_id: "run-t048",
        task_id: "test-1",
        sequence: 2,
        kind: "coverage",
        sha256: "f".repeat(64),
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

function changed(path: string): GitChangedFile {
  return {
    path,
    change_kind: "modified",
    line_semantics: "text",
    changed_new_line_ranges: [[1, 1]],
  };
}

function onePassSelection(): SelectionV1 {
  return {
    mode: "native_related",
    initial_scope: { kind: "package", path: "packages/a" },
    selected_test_count: null,
    deselected_test_count: null,
    total_test_count: null,
    widened: false,
    widen_triggers: [],
    passes: [
      {
        ordinal: 1,
        mode: "native_related",
        scope: { kind: "package", path: "packages/a" },
        trigger: null,
        selected_test_count: null,
        deselected_test_count: null,
        total_test_count: null,
      },
    ],
    limitations: ["selection_counts_not_observed", "unsafe_selection"],
  };
}

describe("T048 bounded post-run widening integration contract", () => {
  it("accepts one post-run wider pass while preserving an unresolved gap that the wider pass cannot prove", () => {
    const receipt = twoPassReceipt();

    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(receipt.selection.widened).toBe(true);
    expect(receipt.selection.widen_triggers).toEqual(["post_run_exercise_gap"]);
    expect(receipt.selection.passes).toHaveLength(2);
    expect(receipt.selection.passes[0]).toMatchObject({
      ordinal: 1,
      mode: "native_related",
      trigger: null,
    });
    expect(receipt.selection.passes[1]).toMatchObject({
      ordinal: 2,
      mode: "full",
      trigger: "post_run_exercise_gap",
    });
    expect(receipt.exercise.records).toEqual([
      expect.objectContaining({
        state: "UNRESOLVED",
        execution_count: null,
        reason: "wider_pass_still_insufficient",
      }),
    ]);
  });

  it("rejects a recursive third pass after the single bounded post-run widening pass", () => {
    const receipt = structuredClone(twoPassReceipt()) as ReceiptV1;
    const passes = receipt.selection.passes as Array<ReceiptV1["selection"]["passes"][number]>;
    passes.push({
      ordinal: 3,
      mode: "full",
      scope: { kind: "repository", path: null },
      trigger: "post_run_exercise_gap",
      selected_test_count: 2,
      deselected_test_count: 0,
      total_test_count: 2,
    });

    expect(issueCodes(receipt)).toContain("selection_pass_limit");
  });

  it("requires a widened selection with two passes to disclose a widening trigger", () => {
    const receipt = structuredClone(twoPassReceipt()) as ReceiptV1;
    (receipt.selection as unknown as { widen_triggers: string[] }).widen_triggers = [];

    expect(issueCodes(receipt)).toContain("selection_widening_invariant");
  });

  it("rejects recording a second pass while claiming the selection was not widened", () => {
    const receipt = structuredClone(twoPassReceipt()) as ReceiptV1;
    (receipt.selection as unknown as { widened: boolean }).widened = false;

    expect(issueCodes(receipt)).toContain("selection_widening_invariant");
  });
});

describe("T054 post-run coverage-relation decision", () => {
  it("widens once when narrowed coverage has no usable relationship for one changed production source", () => {
    const files = [changed("packages/a/src/covered.ts"), changed("packages/a/src/missing.ts"), changed("README.md")];
    const decision = decidePostRunWidening(files, "native_related", [
      { path: "packages/a/src/covered.ts", line: 1, count: 0, instrumented: true },
    ]);

    expect(decision).toEqual({
      widened: true,
      trigger: "post_run_exercise_gap",
      relationGapPaths: ["packages/a/src/missing.ts"],
    });
    expect(postRunPlanningChangedFiles(files, decision).map(({ path }) => path)).toEqual([
      "packages/a/src/missing.ts",
    ]);
  });

  it("treats a zero-count LCOV point as a usable relationship and leaves line exercise to T055", () => {
    const files = [changed("src/a.ts")];
    expect(decidePostRunWidening(files, "native_related", [
      { path: "src/a.ts", line: 1, count: 0, instrumented: true },
    ])).toEqual({ widened: false, trigger: null, relationGapPaths: [] });
  });

  it("never recursively widens an initial full pass", () => {
    const files = [changed("src/a.ts")];
    expect(decidePostRunWidening(files, "full", [])).toEqual({
      widened: false,
      trigger: null,
      relationGapPaths: [],
    });
  });

  it("ignores changed tests and non-production files when deciding the coverage relationship", () => {
    const files = [changed("tests/a.test.ts"), changed("README.md")];
    expect(decidePostRunWidening(files, "native_related", [])).toEqual({
      widened: false,
      trigger: null,
      relationGapPaths: [],
    });
  });

  it("records exactly one full second pass and refuses to append a third", () => {
    const widened = withPostRunWideningPass(onePassSelection(), "packages/a");
    expect(widened).toMatchObject({
      mode: "full",
      widened: true,
      widen_triggers: ["post_run_exercise_gap"],
    });
    expect(widened.passes).toEqual([
      expect.objectContaining({ ordinal: 1, mode: "native_related", trigger: null }),
      expect.objectContaining({
        ordinal: 2,
        mode: "full",
        scope: { kind: "package", path: "packages/a" },
        trigger: "post_run_exercise_gap",
      }),
    ]);
    expect(withPostRunWideningPass(widened, "packages/a")).toEqual(widened);
  });
});
