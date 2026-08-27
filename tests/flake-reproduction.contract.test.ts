import { describe, expect, it } from "vitest";

import { buildReceipt } from "../src/receipt/build.js";
import {
  validateReceiptSemantics,
  type EvidenceV1,
  type FindingV1,
  type ReceiptV1,
  type SourceStateV1,
  type TaskResultV1,
  type TaskStatus,
} from "../src/receipt/model.js";

interface FlakeFixtureOptions {
  readonly status: TaskStatus;
  readonly runs: number;
  readonly failures: number;
  readonly determinismClass: FindingV1["determinism_class"];
  readonly reproduced: FindingV1["reproduced"];
  readonly rerunError?: boolean;
}

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

function taskFor(options: FlakeFixtureOptions): TaskResultV1 {
  return {
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
    status: options.status,
    reason_code: null,
    reason_text: null,
    exit_code: 1,
    started_at: "2026-08-27T10:40:00.000Z",
    finished_at: "2026-08-27T10:40:01.000Z",
    duration_ms: 1_000,
    observations: { runs: options.runs, failures: options.failures },
    cache_state: "cold",
    selected_test_count: 1,
    deselected_test_count: 0,
    evidence_ids: options.rerunError ? ["test-result", "rerun-warning"] : ["test-result"],
    artifact_refs: [],
    output_truncated: false,
  };
}

function evidenceFor(options: FlakeFixtureOptions): EvidenceV1[] {
  const evidence: EvidenceV1[] = [{
    evidence_id: "test-result",
    run_id: "run-t059-flake",
    task_id: "test-1",
    sequence: 1,
    kind: "test_result",
    sha256: "d".repeat(64),
    artifact_id: null,
    redacted: false,
    truncated: false,
  }];
  if (options.rerunError) {
    evidence.push({
      evidence_id: "rerun-warning",
      run_id: "run-t059-flake",
      task_id: "test-1",
      sequence: 2,
      kind: "warning",
      sha256: "e".repeat(64),
      artifact_id: null,
      redacted: false,
      truncated: false,
    });
  }
  return evidence;
}

function receiptFor(options: FlakeFixtureOptions): ReceiptV1 {
  const source = sourceState();
  const finding: FindingV1 = {
    finding_id: "finding-1",
    task_id: "test-1",
    producer: "vitest",
    rule_or_test_id: "src/a.test.ts > fails",
    message: "expected value to match",
    path: "src/a.test.ts",
    line_start: 10,
    line_end: 10,
    severity: "medium",
    in_changed_lines: null,
    introduced_by_change: "unknown",
    determinism_class: options.determinismClass,
    observations: { runs: options.runs, failures: options.failures },
    reproduced: options.reproduced,
    fingerprint_version: null,
    fingerprint: null,
    evidence_ids: options.rerunError ? ["test-result", "rerun-warning"] : ["test-result"],
  };

  return buildReceipt({
    run: {
      run_id: "run-t059-flake",
      ascout_version: "0.1.0-m1",
      started_at: "2026-08-27T10:40:00.000Z",
      finished_at: "2026-08-27T10:40:01.000Z",
      config_digest: "f".repeat(64),
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
        changed_new_line_ranges: [[1, 1]],
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
    tasks: [taskFor(options)],
    exercise: {
      changed_executable_lines: 0,
      exercised_lines: 0,
      not_exercised_lines: 0,
      unresolved_lines: 0,
      changed_files_with_zero_exercised_lines: 0,
      records: [],
    },
    testChanges: [],
    findings: [finding],
    evidence: evidenceFor(options),
    artifacts: [],
  });
}

function issueCodes(receipt: ReceiptV1): readonly string[] {
  return validateReceiptSemantics(receipt).issues.map((issue) => issue.code);
}

describe("T059 flake and reproduction contract", () => {
  it("keeps one valid failing observation as unknown reproduction", () => {
    const receipt = receiptFor({
      status: "FAIL",
      runs: 1,
      failures: 1,
      determinismClass: "unknown",
      reproduced: "unknown",
    });

    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(receipt.tasks[0]).toMatchObject({
      status: "FAIL",
      observations: { runs: 1, failures: 1 },
    });
    expect(receipt.findings[0]).toMatchObject({
      determinism_class: "unknown",
      observations: { runs: 1, failures: 1 },
      reproduced: "unknown",
      introduced_by_change: "unknown",
    });
    expect(receipt.summary.exit_code).toBe(1);
  });

  it("records repeated consistent failures as reproduced true without calling the task flaky", () => {
    const receipt = receiptFor({
      status: "FAIL",
      runs: 3,
      failures: 3,
      determinismClass: "deterministic",
      reproduced: true,
    });

    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(receipt.tasks[0]).toMatchObject({
      status: "FAIL",
      observations: { runs: 3, failures: 3 },
    });
    expect(receipt.findings[0]).toMatchObject({
      determinism_class: "deterministic",
      observations: { runs: 3, failures: 3 },
      reproduced: true,
    });
  });

  it("represents contradictory pass/fail observations as FLAKY with stable-failure reproduction false", () => {
    const receipt = receiptFor({
      status: "FLAKY",
      runs: 3,
      failures: 2,
      determinismClass: "nondeterministic",
      reproduced: false,
    });

    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(receipt.tasks[0]).toMatchObject({
      status: "FLAKY",
      observations: { runs: 3, failures: 2 },
    });
    expect(receipt.findings[0]).toMatchObject({
      determinism_class: "nondeterministic",
      observations: { runs: 3, failures: 2 },
      reproduced: false,
    });
    expect(receipt.summary.exit_code).toBe(1);
  });

  it("rejects a FLAKY task label when all valid observations fail consistently", () => {
    const receipt = receiptFor({
      status: "FLAKY",
      runs: 3,
      failures: 3,
      determinismClass: "deterministic",
      reproduced: true,
    });

    expect(issueCodes(receipt)).toContain("flake_observation_invariant");
  });

  it("rejects non-unknown reproduction after only one valid failing observation", () => {
    for (const reproduced of [true, false, "not_applicable"] as const) {
      const receipt = receiptFor({
        status: "FAIL",
        runs: 1,
        failures: 1,
        determinismClass: "unknown",
        reproduced,
      });

      expect(issueCodes(receipt), String(reproduced)).toContain("finding_reproduction_invariant");
    }
  });

  it("rejects non-true reproduction for repeated consistent test failures", () => {
    for (const reproduced of [false, "unknown", "not_applicable"] as const) {
      const receipt = receiptFor({
        status: "FAIL",
        runs: 3,
        failures: 3,
        determinismClass: "deterministic",
        reproduced,
      });

      expect(issueCodes(receipt), String(reproduced)).toContain("finding_reproduction_invariant");
    }
  });

  it("allows a contradictory finding under aggregate FAIL when another finding fails consistently", () => {
    const receipt = receiptFor({
      status: "FAIL",
      runs: 3,
      failures: 3,
      determinismClass: "deterministic",
      reproduced: true,
    });
    const stableFinding = receipt.findings[0]!;
    const flakyFinding: FindingV1 = {
      ...stableFinding,
      finding_id: "finding-2",
      rule_or_test_id: "src/a.test.ts > flakes",
      message: "intermittent mismatch",
      determinism_class: "nondeterministic",
      observations: { runs: 3, failures: 2 },
      reproduced: false,
    };
    (receipt.findings as FindingV1[]).push(flakyFinding);
    (receipt.summary as { finding_count: number }).finding_count = 2;

    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(receipt.tasks[0]).toMatchObject({
      status: "FAIL",
      observations: { runs: 3, failures: 3 },
    });
    expect(receipt.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        finding_id: "finding-1",
        observations: { runs: 3, failures: 3 },
        reproduced: true,
      }),
      expect.objectContaining({
        finding_id: "finding-2",
        observations: { runs: 3, failures: 2 },
        reproduced: false,
        determinism_class: "nondeterministic",
      }),
    ]));
  });

  it("rejects contradictory observations that claim stable reproduction", () => {
    for (const reproduced of [true, "unknown", "not_applicable"] as const) {
      const receipt = receiptFor({
        status: "FLAKY",
        runs: 3,
        failures: 2,
        determinismClass: "nondeterministic",
        reproduced,
      });

      expect(issueCodes(receipt), String(reproduced)).toContain("finding_reproduction_invariant");
    }
  });

  it("rejects contradictory observations without nondeterministic classification", () => {
    for (const determinismClass of ["deterministic", "unknown"] as const) {
      const receipt = receiptFor({
        status: "FLAKY",
        runs: 3,
        failures: 2,
        determinismClass,
        reproduced: false,
      });

      expect(issueCodes(receipt), determinismClass).toContain("finding_determinism_invariant");
    }
  });

  it("keeps reproduction unknown when a rerun errors before a valid second observation", () => {
    const receipt = receiptFor({
      status: "FAIL",
      runs: 1,
      failures: 1,
      determinismClass: "unknown",
      reproduced: "unknown",
      rerunError: true,
    });

    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(receipt.tasks[0]).toMatchObject({
      status: "FAIL",
      observations: { runs: 1, failures: 1 },
      evidence_ids: ["test-result", "rerun-warning"],
    });
    expect(receipt.findings[0]).toMatchObject({
      reproduced: "unknown",
      determinism_class: "unknown",
      observations: { runs: 1, failures: 1 },
    });
    expect(receipt.evidence[1]).toMatchObject({
      evidence_id: "rerun-warning",
      kind: "warning",
      task_id: "test-1",
    });
  });

  it("rejects introduced_by_change claims without comparative proof", () => {
    for (const introducedByChange of [true, false] as const) {
      const receipt = receiptFor({
        status: "FAIL",
        runs: 1,
        failures: 1,
        determinismClass: "unknown",
        reproduced: "unknown",
      });
      (receipt.findings[0] as { introduced_by_change: boolean | "unknown" }).introduced_by_change = introducedByChange;
      expect(issueCodes(receipt), String(introducedByChange)).toContain("finding_causation_unproven");
    }
  });

});
