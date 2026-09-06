import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import {
  T113_QUALIFIED_REPLAY_INPUTS,
  gitBlobSha1,
  validateControllerIdentity,
  validateQualifiedReplayContract,
  validateT111ManifestCompatibility,
} from "../benchmarks/metrics.mjs";
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

const T112_REPLAY_GZIP_BASE64 = [
  "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",
].join("");

function exactT112ReplayFixture() {
  const replayBytes = gunzipSync(Buffer.from(T112_REPLAY_GZIP_BASE64, "base64"));
  return { replayBytes, replay: JSON.parse(replayBytes.toString("utf8")) };
}

describe("T113 qualified replay admission", () => {
  it("pins the two and only two authorized replay identities", () => {
    expect(Object.keys(T113_QUALIFIED_REPLAY_INPUTS).sort()).toEqual([
      "immer-draftmap-iterator-compatibility",
      "jotai-splitatom-identical-write",
    ]);
  });

  it("binds controller identity to replay and manifest runtime exactly", () => {
    const caseRecord = { runtime: { node_version: "24.15.0", package_manager: "yarn", package_manager_version: "1.22.22" } };
    const replay = { evidence: { platform: { os: "linux", arch: "x64" }, toolchain: { node: "24.15.0", package_manager: "yarn", package_manager_version: "1.22.22" } } };
    const actual = { os: "linux", arch: "x64", node: "24.15.0", package_manager: "yarn", package_manager_version: "1.22.22" };
    expect(validateControllerIdentity(caseRecord, replay, actual)).toBe(true);
    expect(() => validateControllerIdentity(caseRecord, replay, { ...actual, arch: "arm64" })).toThrow(/controller architecture mismatch/);
    expect(() => validateControllerIdentity({ runtime: { ...caseRecord.runtime, package_manager_version: "1.22.21" } }, replay, actual)).toThrow(/manifest package manager version mismatch/);
  });

  it("computes Git blob identity over exact historical bytes", () => {
    expect(gitBlobSha1(Buffer.from("hello\n", "utf8"))).toBe("ce013625030ba8dba906f756967f9e9ca394464a");
  });

  it("accepts only complete canonical equality for the bounded revision-12-to-13 compatibility proof", () => {
    const historicalCase = {
      case_id: "jotai-splitatom-identical-write",
      case_revision: 1,
      runtime: { node_version: "24.15.0", package_manager: "yarn", package_manager_version: "1.22.22" },
      paths: { production: ["src/a.ts"], regression_tests: ["tests/a.test.ts"] },
      oracle: { specification: { ground_truth_procedure: ["exact"] } },
    };
    const historicalManifest = { manifest_revision: 12, cases: [historicalCase] };
    const historicalManifestBytes = Buffer.from(JSON.stringify(historicalManifest), "utf8");
    const frozen = {
      case_id: historicalCase.case_id,
      case_revision: 1,
      replay_manifest_revision: 12,
      current_manifest_revision: 13,
      historical_manifest_blob: gitBlobSha1(historicalManifestBytes),
    };
    const currentCase = structuredClone(historicalCase);
    const currentManifest = { manifest_revision: 13, cases: [currentCase] };
    expect(validateT111ManifestCompatibility({ historicalManifestBytes, historicalManifest, currentManifest, currentCase, frozen })).toBe(true);
    const changed = structuredClone(currentCase);
    changed.oracle.specification.ground_truth_procedure = ["changed"];
    expect(() => validateT111ManifestCompatibility({ historicalManifestBytes, historicalManifest, currentManifest, currentCase: changed, frozen })).toThrow(/not canonically identical/);
  });

  it("fails closed before accepting an unauthorized case or wrong replay bytes", () => {
    expect(() => validateQualifiedReplayContract({
      replayBytes: Buffer.from("{}"), replay: {}, caseRecord: { case_id: "not-authorized", case_revision: 1 },
      manifest: { manifest_revision: 13 }, repetitions: 2, provenance: {},
    })).toThrow(/not authorized/);
    const frozen = T113_QUALIFIED_REPLAY_INPUTS["immer-draftmap-iterator-compatibility"];
    const caseRecord = { case_id: frozen.case_id, case_revision: frozen.case_revision, runtime: { node_version: "24.15.0", package_manager: "yarn", package_manager_version: "1.22.22" } };
    expect(() => validateQualifiedReplayContract({
      replayBytes: Buffer.from("{}"), replay: {}, caseRecord, manifest: { manifest_revision: 13 }, repetitions: 2,
      provenance: { source_commit: frozen.source_commit, workflow_run_id: frozen.workflow_run_id, workflow_run_attempt: 1, artifact_id: frozen.artifact_id },
    })).toThrow(/qualified replay file SHA-256 mismatch/);
  });

  it("accepts the exact frozen T112 replay bytes with exact provenance", () => {
    const { replayBytes, replay } = exactT112ReplayFixture();
    const manifest = JSON.parse(readFileSync(new URL("../benchmarks/manifest.json", import.meta.url), "utf8"));
    const caseRecord = manifest.cases.find((candidate: { case_id: string }) => candidate.case_id === "immer-draftmap-iterator-compatibility");
    expect(caseRecord).toBeDefined();
    const frozen = T113_QUALIFIED_REPLAY_INPUTS["immer-draftmap-iterator-compatibility"];
    expect(validateQualifiedReplayContract({
      replayBytes, replay, caseRecord, manifest, repetitions: 2,
      provenance: { source_commit: frozen.source_commit, workflow_run_id: frozen.workflow_run_id, workflow_run_attempt: frozen.workflow_run_attempt, artifact_id: frozen.artifact_id },
    })).toEqual(frozen);
  });

  it("rejects ambiguous qualified-input CLI combinations before reading any benchmark input", () => {
    const metricsScript = fileURLToPath(new URL("../benchmarks/metrics.mjs", import.meta.url));
    const aggregate = spawnSync(process.execPath, [metricsScript, "--aggregate-input", "missing.json", "--t075-input", "missing-replay.json"], { encoding: "utf8" });
    expect(aggregate.status).toBe(1);
    expect(aggregate.stderr).toMatch(/aggregate mode cannot be combined/);
    const retryAttempt = spawnSync(process.execPath, [
      metricsScript, "--case", "x", "--run-id", "x", "--t075-input", "missing-replay.json",
      "--t075-source-commit", "a".repeat(40), "--t075-workflow-run-id", "1", "--t075-workflow-run-attempt", "2", "--t075-artifact-id", "1",
    ], { encoding: "utf8" });
    expect(retryAttempt.status).toBe(1);
    expect(retryAttempt.stderr).toMatch(/requires --t075-workflow-run-attempt 1/);
  });
});
