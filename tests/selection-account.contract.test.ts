import { describe, expect, it } from "vitest";

import { buildReceipt } from "../src/receipt/build.js";
import {
  validateReceiptSemantics,
  type ReceiptV1,
  type SelectionPassV1,
  type SelectionV1,
  type SourceStateV1,
  type TaskResultV1,
} from "../src/receipt/model.js";

const SELECTION_COUNTS_NOT_OBSERVED = "selection_counts_not_observed";

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

function passingTestTask(): TaskResultV1 {
  return {
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
    started_at: "2026-08-27T10:20:00.000Z",
    finished_at: "2026-08-27T10:20:01.000Z",
    duration_ms: 1_000,
    observations: { runs: 1, failures: 0 },
    cache_state: "not_applicable",
    evidence_ids: [],
    artifact_refs: [],
    output_truncated: false,
  };
}

function knownPass(overrides: Partial<SelectionPassV1> = {}): SelectionPassV1 {
  return {
    ordinal: 1,
    mode: "native_related",
    scope: { kind: "repository", path: null },
    trigger: null,
    selected_test_count: 2,
    deselected_test_count: 3,
    total_test_count: 5,
    ...overrides,
  };
}

function knownSelection(overrides: Partial<SelectionV1> = {}): SelectionV1 {
  return {
    mode: "native_related",
    initial_scope: { kind: "repository", path: null },
    selected_test_count: 2,
    deselected_test_count: 3,
    total_test_count: 5,
    widened: false,
    widen_triggers: [],
    passes: [knownPass()],
    limitations: [],
    ...overrides,
  };
}

function receiptWithSelection(selection: SelectionV1): ReceiptV1 {
  const source = sourceState();
  return buildReceipt({
    run: {
      run_id: "run-t057-selection",
      ascout_version: "0.1.0-m1",
      started_at: "2026-08-27T10:20:00.000Z",
      finished_at: "2026-08-27T10:20:01.000Z",
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
        path: "README.md",
        change_kind: "modified",
        line_semantics: "text",
        changed_new_line_ranges: [[1, 1]],
        is_test_file: false,
        is_snapshot: false,
        is_command_surface: false,
      }],
    },
    selection,
    tasks: [passingTestTask()],
    exercise: {
      changed_executable_lines: 0,
      exercised_lines: 0,
      not_exercised_lines: 0,
      unresolved_lines: 0,
      changed_files_with_zero_exercised_lines: 0,
      records: [],
    },
    testChanges: [],
    findings: [],
    evidence: [],
    artifacts: [],
  });
}

function issueCodes(receipt: ReceiptV1): readonly string[] {
  return validateReceiptSemantics(receipt).issues.map((issue) => issue.code);
}

describe("T057 strict selection scopes and passes", () => {
  it("accepts canonical repository and package scopes", () => {
    const repositoryReceipt = receiptWithSelection(knownSelection());
    expect(validateReceiptSemantics(repositoryReceipt)).toEqual({ valid: true, issues: [] });

    const packageScope = { kind: "package" as const, path: "packages/app" };
    const packageReceipt = receiptWithSelection(knownSelection({
      initial_scope: packageScope,
      passes: [knownPass({ scope: packageScope })],
    }));
    expect(validateReceiptSemantics(packageReceipt)).toEqual({ valid: true, issues: [] });
  });

  it("rejects invalid repository/package path pairings on the initial scope", () => {
    const repositoryPath = receiptWithSelection(knownSelection({
      initial_scope: { kind: "repository", path: "packages/app" },
    }));
    expect(issueCodes(repositoryPath)).toContain("repository_scope_path");

    const missingPackagePath = receiptWithSelection(knownSelection({
      initial_scope: { kind: "package", path: null },
    }));
    expect(issueCodes(missingPackagePath)).toContain("package_scope_path");
  });

  it("enforces the same repository/package path rules on every selection pass", () => {
    const repositoryPath = receiptWithSelection(knownSelection({
      passes: [knownPass({
        scope: { kind: "repository", path: "packages/app" },
      })],
    }));
    expect(issueCodes(repositoryPath)).toContain("repository_scope_path");

    const missingPackagePath = receiptWithSelection(knownSelection({
      passes: [knownPass({
        scope: { kind: "package", path: null },
      })],
    }));
    expect(issueCodes(missingPackagePath)).toContain("package_scope_path");
  });

  it("rejects more than two passes and non-contiguous ordinals", () => {
    const threePasses = receiptWithSelection(knownSelection({
      mode: "full",
      widened: true,
      widen_triggers: ["post_run_exercise_gap"],
      passes: [
        knownPass(),
        knownPass({ ordinal: 2, mode: "full", trigger: "post_run_exercise_gap" }),
        knownPass({ ordinal: 3, mode: "full", trigger: "post_run_exercise_gap" }),
      ],
    }));
    expect(issueCodes(threePasses)).toContain("selection_pass_limit");

    const skippedOrdinal = receiptWithSelection(knownSelection({
      passes: [knownPass({ ordinal: 2 })],
    }));
    expect(issueCodes(skippedOrdinal)).toContain("selection_pass_ordinal");
  });

  it("keeps widening records bounded and structurally explicit", () => {
    const missingTrigger = receiptWithSelection(knownSelection({
      mode: "full",
      widened: true,
      passes: [knownPass({ mode: "full" })],
    }));
    expect(issueCodes(missingTrigger)).toContain("selection_widening_invariant");

    const hiddenSecondPass = receiptWithSelection(knownSelection({
      passes: [knownPass(), knownPass({ ordinal: 2, mode: "full" })],
    }));
    expect(issueCodes(hiddenSecondPass)).toContain("selection_widening_invariant");

    const noTestTaskWithPass = receiptWithSelection(knownSelection({
      mode: "no_test_task",
    }));
    expect(issueCodes(noTestTaskWithPass)).toContain("no_test_task_has_passes");
  });
});

describe("T057 known/null selection counts and limitations", () => {
  it("accepts known counts only when selected plus deselected equals total", () => {
    const valid = receiptWithSelection(knownSelection());
    expect(validateReceiptSemantics(valid).valid).toBe(true);

    const rootMismatch = receiptWithSelection(knownSelection({ total_test_count: 6 }));
    expect(issueCodes(rootMismatch)).toContain("selection_count_mismatch");

    const passMismatch = receiptWithSelection(knownSelection({
      passes: [knownPass({ total_test_count: 6 })],
    }));
    expect(issueCodes(passMismatch)).toContain("selection_count_mismatch");
  });

  it("requires a disclosed limitation when root selection counts are unknown", () => {
    const disclosed = receiptWithSelection(knownSelection({
      selected_test_count: null,
      deselected_test_count: null,
      total_test_count: null,
      limitations: [SELECTION_COUNTS_NOT_OBSERVED],
    }));
    expect(validateReceiptSemantics(disclosed)).toEqual({ valid: true, issues: [] });

    const undisclosed = receiptWithSelection(knownSelection({
      selected_test_count: null,
      deselected_test_count: null,
      total_test_count: null,
      limitations: [],
    }));
    expect(issueCodes(undisclosed)).toContain("selection_unknown_without_limitation");
  });

  it("requires a disclosed limitation for unknown pass counts even when root counts are fully known", () => {
    const unknownPass = knownPass({
      selected_test_count: null,
      deselected_test_count: null,
      total_test_count: null,
    });
    const disclosed = receiptWithSelection(knownSelection({
      passes: [unknownPass],
      limitations: [SELECTION_COUNTS_NOT_OBSERVED],
    }));
    expect(validateReceiptSemantics(disclosed)).toEqual({ valid: true, issues: [] });

    const undisclosed = receiptWithSelection(knownSelection({
      passes: [unknownPass],
      limitations: [],
    }));
    expect(undisclosed.selection).toMatchObject({
      selected_test_count: 2,
      deselected_test_count: 3,
      total_test_count: 5,
    });
    expect(issueCodes(undisclosed)).toContain("selection_unknown_without_limitation");
  });

  it("rejects negative observed counts instead of repairing or guessing them", () => {
    const invalid = receiptWithSelection(knownSelection({ selected_test_count: -1 }));
    expect(issueCodes(invalid)).toContain("selection_count_shape");
  });
});

describe("T057 valid deselection is selection truth, not task omission", () => {
  it("keeps an executed test task PASS when some discovered tests are validly deselected", () => {
    const receipt = receiptWithSelection(knownSelection({
      selected_test_count: 2,
      deselected_test_count: 3,
      total_test_count: 5,
      passes: [knownPass({
        selected_test_count: 2,
        deselected_test_count: 3,
        total_test_count: 5,
      })],
    }));

    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(receipt.tasks[0]).toMatchObject({
      task_type: "test",
      status: "PASS",
      observations: { runs: 1, failures: 0 },
    });
    expect(receipt.summary.task_status_counts.NOT_RUN).toBe(0);
    expect(receipt.summary.completeness).toBe("complete");
    expect(receipt.summary.exit_code).toBe(0);
    expect(receipt.selection).toMatchObject({
      selected_test_count: 2,
      deselected_test_count: 3,
      total_test_count: 5,
    });
  });
});
