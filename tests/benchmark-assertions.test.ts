import { describe, expect, it } from "vitest";

import { aggregateBenchmarkAssertions, evaluateCaseAssertions } from "../benchmarks/assertions-lib.mjs";

function integrity(runId = "run-1", canonicalExitCode = 0) {
  return {
    semantic_valid: true,
    semantic_issues: [],
    run_id: runId,
    evidence_run_ids: [runId, runId],
    source_binding: {
      start_head_sha: "a".repeat(40),
      comparison_base_ref: "a".repeat(40),
      start_tree_digest: "b".repeat(64),
      end_tree_digest: "b".repeat(64),
    },
    canonical_exit_code: canonicalExitCode,
  };
}

function exercise(notExercised = 0, unresolved = 0) {
  return {
    changed_executable_lines: notExercised + unresolved,
    exercised_lines: 0,
    not_exercised_lines: notExercised,
    unresolved_lines: unresolved,
    changed_files_with_zero_exercised_lines: notExercised + unresolved > 0 ? 1 : 0,
    records: [],
  };
}

function ascoutRun({
  runId = "run-1",
  exitCode = 0,
  canonicalExitCode = exitCode,
  notExercised = 0,
  unresolved = 0,
  sourceStability = "stable",
}: {
  runId?: string;
  exitCode?: number;
  canonicalExitCode?: number;
  notExercised?: number;
  unresolved?: number;
  sourceStability?: "stable" | "tree_drifted";
} = {}) {
  return {
    exit_code: exitCode,
    source_stability: sourceStability,
    exercise: exercise(notExercised, unresolved),
    integrity: integrity(runId, canonicalExitCode),
  };
}

function caseInput(run = ascoutRun()) {
  return {
    task: "T076",
    status: "BENCHMARK_METRICS_READY",
    case_id: "case-1",
    case_revision: 1,
    t075_evidence_sha256: "c".repeat(64),
    observations: [
      { comparators: { ascout: { cold: structuredClone(run), warm: structuredClone(run) } } },
      { comparators: { ascout: { cold: structuredClone(run), warm: structuredClone(run) } } },
    ],
  };
}

describe("T077 benchmark absolute assertions", () => {
  it("satisfies all absolute assertions when canonical binding is valid and no material gap returns clean", () => {
    const result = evaluateCaseAssertions(caseInput());
    expect(result.status).toBe("ABSOLUTE_ASSERTIONS_SATISFIED");
    expect(result.evaluated_run_count).toBe(4);
    expect(result.assertions).toEqual({
      cross_tree_evidence_leakage: { required_count: 0, observed_count: 0 },
      binding_integrity_violations: { required_count: 0, observed_count: 0 },
      stable_material_gap_exit_zero: { required_count: 0, observed_count: 0 },
      stable_material_gap_wrong_exit_without_higher_precedence: { required_count: 0, observed_count: 0 },
    });
  });

  it("counts current-run evidence that claims another run as cross-tree leakage", () => {
    const input = caseInput();
    input.observations[0]!.comparators.ascout.cold.integrity.evidence_run_ids = ["run-1", "other-run"];
    const result = evaluateCaseAssertions(input);
    expect(result.status).toBe("ABSOLUTE_ASSERTIONS_VIOLATED");
    expect(result.assertions.cross_tree_evidence_leakage.observed_count).toBe(1);
  });

  it("counts canonical semantic-validator issues as binding-integrity violations", () => {
    const input = caseInput();
    const target = input.observations[0]!.comparators.ascout.cold.integrity;
    target.semantic_valid = false;
    target.semantic_issues = [{ code: "comparison_source_mismatch", path: "comparison.base_ref" }];
    target.canonical_exit_code = null as unknown as number;
    const result = evaluateCaseAssertions(input);
    expect(result.status).toBe("ABSOLUTE_ASSERTIONS_VIOLATED");
    expect(result.assertions.binding_integrity_violations.observed_count).toBe(1);
  });

  it.each([
    { label: "NOT_EXERCISED", notExercised: 1, unresolved: 0 },
    { label: "UNRESOLVED", notExercised: 0, unresolved: 1 },
  ])("rejects a stable material $label gap returning exit 0", ({ notExercised, unresolved }) => {
    const result = evaluateCaseAssertions(caseInput(ascoutRun({ exitCode: 0, canonicalExitCode: 4, notExercised, unresolved })));
    expect(result.status).toBe("ABSOLUTE_ASSERTIONS_VIOLATED");
    expect(result.assertions.stable_material_gap_exit_zero.observed_count).toBe(4);
    expect(result.assertions.stable_material_gap_wrong_exit_without_higher_precedence.observed_count).toBe(4);
  });

  it("accepts stable material gaps mapped to canonical exit 4", () => {
    const result = evaluateCaseAssertions(caseInput(ascoutRun({ exitCode: 4, canonicalExitCode: 4, notExercised: 1 })));
    expect(result.status).toBe("ABSOLUTE_ASSERTIONS_SATISFIED");
    expect(result.assertions.stable_material_gap_exit_zero.observed_count).toBe(0);
    expect(result.assertions.stable_material_gap_wrong_exit_without_higher_precedence.observed_count).toBe(0);
  });

  it("does not demand exit 4 when the canonical decision records a higher-precedence exit", () => {
    const result = evaluateCaseAssertions(caseInput(ascoutRun({ exitCode: 1, canonicalExitCode: 1, notExercised: 1 })));
    expect(result.status).toBe("ABSOLUTE_ASSERTIONS_SATISFIED");
    expect(result.assertions.stable_material_gap_wrong_exit_without_higher_precedence.observed_count).toBe(0);
  });

  it("fails closed when canonical receipt integrity evidence is missing", () => {
    const input = caseInput();
    delete (input.observations[0]!.comparators.ascout.cold as { integrity?: unknown }).integrity;
    expect(() => evaluateCaseAssertions(input)).toThrow(/missing canonical receipt integrity evidence/);
  });

  it("aggregates absolute counts without hiding a violating case", () => {
    const clean = evaluateCaseAssertions(caseInput());
    const violatingInput = caseInput(ascoutRun({ exitCode: 0, canonicalExitCode: 4, unresolved: 1 }));
    violatingInput.case_id = "case-2";
    const violating = evaluateCaseAssertions(violatingInput);
    const aggregate = aggregateBenchmarkAssertions([clean, violating]);
    expect(aggregate.status).toBe("ABSOLUTE_ASSERTIONS_VIOLATED");
    expect(aggregate.case_set).toEqual(["case-1", "case-2"]);
    expect(aggregate.evaluated_run_count).toBe(8);
    expect(aggregate.assertions.stable_material_gap_exit_zero.observed_count).toBe(4);
  });

  it("rejects duplicate case identities during aggregation", () => {
    const result = evaluateCaseAssertions(caseInput());
    expect(() => aggregateBenchmarkAssertions([result, structuredClone(result)])).toThrow(/duplicate or invalid T077 case id/);
  });
});
