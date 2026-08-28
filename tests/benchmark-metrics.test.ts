import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { aggregateBenchmarkMetrics, computeCaseMetrics } from "../benchmarks/metrics-lib.mjs";

function baselineId(metric: string, comparator: string, cacheClass = "-"): string {
  return createHash("sha256").update(`${metric}:${comparator}:${cacheClass}`).digest("hex");
}

function baseline(metric: string, comparator: string, cacheClass?: "cold" | "warm") {
  return {
    baseline_id: baselineId(metric, comparator, cacheClass),
    metric,
    comparator,
    ...(cacheClass === undefined ? {} : { cache_class: cacheClass }),
    case_revision: 1,
    source_state: "tree-1",
    environment: { os: "linux", node: "24.15.0", package_manager: "npm@11.12.1" },
    command: comparator,
    process_limits: { timeout_ms: 900000 },
    dependency_install_included: false,
    cache_contract: cacheClass === undefined ? null : { dependency_tree: "retained", runner_cache: cacheClass === "cold" ? "cleared" : "retained" },
  };
}

function selectionBaselines() {
  const result = [];
  for (const comparator of ["full", "plain", "related", "ascout"]) {
    result.push(baseline("selection_recall", comparator));
    result.push(baseline("false_pass", comparator));
    result.push(baseline("timing", comparator, "cold"));
    result.push(baseline("timing", comparator, "warm"));
    result.push(baseline("determinism", comparator, "cold"));
    result.push(baseline("determinism", comparator, "warm"));
  }
  result.push(baseline("drift_detection", "ascout"));
  result.push(baseline("flake_classification_behavior", "ascout"));
  return result;
}

function gapBaselines() {
  const result = [
    baseline("false_pass", "ascout"),
    baseline("gap_classification_accuracy", "ascout"),
    baseline("unresolved_rate", "ascout"),
    baseline("drift_detection", "ascout"),
    baseline("flake_classification_behavior", "ascout"),
  ];
  for (const comparator of ["ascout"]) {
    result.push(baseline("timing", comparator, "cold"));
    result.push(baseline("timing", comparator, "warm"));
    result.push(baseline("determinism", comparator, "cold"));
    result.push(baseline("determinism", comparator, "warm"));
  }
  return result;
}

function externalRun(observed: string[], durationMs: number, cleanSuccess = true) {
  return {
    status: cleanSuccess ? "passed" : "failed",
    exit_code: cleanSuccess ? 0 : 1,
    clean_success: cleanSuccess,
    membership_available: true,
    oracle_test_ids_observed: observed,
    duration_ms: durationMs,
    source_stability: "stable",
    reported_source_stability: null,
  };
}

function ascoutRun(observed: string[], durationMs: number, exerciseRecords: unknown[] = [], findings: unknown[] = []) {
  return {
    status: "passed",
    exit_code: 0,
    clean_success: true,
    membership_available: true,
    oracle_test_ids_observed: observed,
    duration_ms: durationMs,
    source_stability: "stable",
    reported_source_stability: "stable",
    completeness: "complete",
    selection: {
      mode: "native_related",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: null,
      deselected_test_count: null,
      total_test_count: null,
      widened: false,
      widen_triggers: [],
      passes: [],
      limitations: ["counts unavailable in fixture"],
    },
    tasks: [{ task_id: "test", task_type: "test", status: "PASS", cache_state: "unknown", observations: { runs: 1, failures: 0 } }],
    exercise: {
      changed_executable_lines: exerciseRecords.length,
      exercised_lines: 0,
      not_exercised_lines: 0,
      unresolved_lines: 0,
      records: exerciseRecords,
    },
    findings,
  };
}

function selectionInput(relatedObserved: string[]) {
  const comparators = {
    full: { cold: externalRun(["oracle A", "oracle B"], 100), warm: externalRun(["oracle A", "oracle B"], 80) },
    plain: { cold: externalRun(["oracle A"], 90), warm: externalRun(["oracle A"], 70) },
    related: { cold: externalRun(relatedObserved, 60), warm: externalRun(relatedObserved, 40) },
    ascout: { cold: ascoutRun(relatedObserved, 50), warm: ascoutRun(relatedObserved, 30) },
  };
  return {
    case_id: "selection-case",
    case_revision: 1,
    case_class: "selection" as const,
    oracle_test_ids: ["oracle A", "oracle B"],
    gap_oracle: null,
    baselines: selectionBaselines(),
    observations: [{ comparators }, { comparators: structuredClone(comparators) }],
  };
}

describe("T076 benchmark metrics", () => {
  it("computes frozen-oracle selection recall and exposes false PASS without using selected-count as recall", () => {
    const metrics = computeCaseMetrics(selectionInput(["oracle A"]));
    expect(metrics.selection_recall?.full).toMatchObject({ available: true, numerator: 2, denominator: 2, recall: 1 });
    expect(metrics.selection_recall?.related).toMatchObject({ available: true, numerator: 1, denominator: 2, recall: 0.5 });
    expect(metrics.selection_recall?.related.baseline_id).toHaveLength(64);
    expect(metrics.false_pass.find((item) => item.comparator === "related")).toMatchObject({ available: true, false_pass: true, material_oracle_omission: true });
  });

  it("keeps plain recall and false-PASS unavailable without membership evidence", () => {
    const input = selectionInput(["oracle A", "oracle B"]);
    for (const observation of input.observations) {
      for (const cacheClass of ["cold", "warm"] as const) {
        observation.comparators.plain[cacheClass].membership_available = false;
        observation.comparators.plain[cacheClass].oracle_test_ids_observed = [];
      }
    }
    const metrics = computeCaseMetrics(input);
    expect(metrics.selection_recall?.plain).toMatchObject({ available: false, numerator: null, recall: null });
    expect(metrics.false_pass.find((item) => item.comparator === "plain")).toMatchObject({ available: false, false_pass: null, clean_success: null });
  });

  it("makes recall unavailable when repeated membership evidence is contradictory", () => {
    const input = selectionInput(["oracle A"]);
    input.observations[1]!.comparators.related.cold.oracle_test_ids_observed = ["oracle A", "oracle B"];
    const metrics = computeCaseMetrics(input);
    expect(metrics.selection_recall?.related).toMatchObject({ available: false, recall: null });
    expect(metrics.determinism.find((item) => item.comparator === "related" && item.cache_class === "cold")?.classification).toBe("nondeterministic");
  });

  it("computes gap accuracy over independently resolved lines and publishes unresolved rate separately", () => {
    const records = [
      { path: "src/a.ts", line: 10, state: "EXERCISED" },
      { path: "src/a.ts", line: 11, state: "UNRESOLVED" },
    ];
    const comparators = { ascout: { cold: ascoutRun([], 50, records), warm: ascoutRun([], 30, records) } };
    const input = {
      case_id: "gap-case",
      case_revision: 1,
      case_class: "gap" as const,
      oracle_test_ids: [],
      gap_oracle: [
        { path: "src/a.ts", line: 10, classification: "EXERCISED" },
        { path: "src/a.ts", line: 11, classification: "NOT_EXERCISED" },
        { path: "src/a.ts", line: 12, classification: "UNRESOLVED" },
      ],
      baselines: gapBaselines(),
      observations: [{ comparators }, { comparators: structuredClone(comparators) }],
    };
    const metrics = computeCaseMetrics(input);
    expect(metrics.gap_classification).toMatchObject({ available: true, numerator_correct: 1, denominator: 2, accuracy: 0.5, unresolved_numerator: 1, unresolved_rate: 0.5, oracle_excluded_unresolved: 1 });
    expect(metrics.gap_classification?.accuracy_baseline_id).toHaveLength(64);
    expect(metrics.false_pass[0]).toMatchObject({ available: true, false_pass: true });
  });

  it("does not invent flake accuracy when no repeated-observation finding domain exists", () => {
    const metrics = computeCaseMetrics(selectionInput(["oracle A", "oracle B"]));
    expect(metrics.flake_classification_behavior).toMatchObject({ available: false, accuracy: null, evaluated_finding_count: 0 });
  });

  it("evaluates flake classification behavior from raw runs/failures when the domain exists", () => {
    const input = selectionInput(["oracle A", "oracle B"]);
    const finding = { finding_id: "test.f1", determinism_class: "nondeterministic", reproduced: false, observations: { runs: 2, failures: 1 } };
    for (const observation of input.observations) observation.comparators.ascout.cold.findings = [finding];
    const metrics = computeCaseMetrics(input);
    expect(metrics.flake_classification_behavior).toMatchObject({ available: true, evaluated_finding_count: 2, correct_count: 2, accuracy: 1 });
  });

  it("rejects incomplete metric baseline declarations before calculating", () => {
    const input = selectionInput(["oracle A", "oracle B"]);
    input.baselines = input.baselines.filter((item) => !(item.metric === "selection_recall" && item.comparator === "related"));
    expect(() => computeCaseMetrics(input)).toThrow(/exactly one baseline for selection_recall\/related/);
  });

  it("aggregates timings only under identical baseline declarations", () => {
    const input = selectionInput(["oracle A", "oracle B"]);
    const metrics = computeCaseMetrics(input);
    const caseResult = {
      status: "BENCHMARK_METRICS_READY",
      task: "T076",
      case_id: input.case_id,
      case_revision: input.case_revision,
      t075_evidence_sha256: "a".repeat(64),
      baselines: input.baselines,
      observations: input.observations,
      metrics,
    };
    const aggregate = aggregateBenchmarkMetrics([caseResult]);
    expect(aggregate.metrics.selection_recall.related).toMatchObject({ numerator: 2, denominator: 2, recall: 1 });
    const relatedCold = aggregate.metrics.timing.find((item) => item.baseline.comparator === "related" && item.baseline.cache_class === "cold");
    expect(relatedCold).toMatchObject({ sample_count: 2, arithmetic_mean_ms: 60 });
    expect(relatedCold?.baseline_id).toHaveLength(64);
  });
});
