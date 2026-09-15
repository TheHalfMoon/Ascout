import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  acceptCaseResult,
  assembleBenchmarkReport,
  BENCHMARK_CASE_REJECTED,
  BENCHMARK_MANIFEST_REJECTED,
  benchmarkReportDigest,
  benchmarkReportToJson,
  createCaseResult,
  detectMissingSteps,
  evaluateIntegrityGates,
  gatesAllZero,
  parseBenchmarkManifest,
  SEMANTIC_DRIFT_DETECTED,
} from "../src/browser/benchmark.js";
import type { BenchmarkCaseResult } from "../src/browser/benchmark.js";

const SOURCE = "source-p1609";
const MANIFEST_URL = new URL(
  "../benchmarks/browser/manifest.json",
  import.meta.url,
);

function result(
  overrides: Partial<BenchmarkCaseResult> & { readonly case_id: string },
): BenchmarkCaseResult {
  return createCaseResult({
    cache_pass_grants: 0,
    case_revision: 1,
    cross_tree_records: 0,
    drift_marker: null,
    failed_attempts_visible: 0,
    oracle: "clean",
    owned_outputs: [],
    recovery_attempts_visible: 0,
    recovery_history_erasure: 0,
    semantic_unrevalidated: false,
    session_id: "session-p1609",
    source_identity: SOURCE,
    unbound_records: 0,
    uncalibrated_model_passes: 0,
    verdict: "clean",
    ...overrides,
  });
}

function zeroGates() {
  return {
    cache_authority_escalation: 0,
    cross_tree_evidence_leakage: 0,
    fabricated_pass: 0,
    hidden_applicable_not_run: 0,
    recovery_history_erasure: 0,
    secret_leakage_from_ascout_owned_artifacts: 0,
    silent_semantic_heal: 0,
    source_binding_violation: 0,
    unqualified_model_only_pass: 0,
  };
}

describe("spec016 p016-09 benchmark evaluation", () => {
  it("validates case results with closed vocabularies", () => {
    expect(result({ case_id: "happy-path" }).oracle).toBe("clean");
    expect(() =>
      result({ case_id: "x", oracle: "mostly-clean" }),
    ).toThrow(BENCHMARK_CASE_REJECTED);
    expect(() =>
      result({ case_id: "x", verdict: "healed" }),
    ).toThrow(BENCHMARK_CASE_REJECTED);
    expect(() =>
      result({ case_id: "x", failed_attempts_visible: -1 }),
    ).toThrow(BENCHMARK_CASE_REJECTED);
    expect(() =>
      result({ case_id: "x", case_revision: 0 }),
    ).toThrow(BENCHMARK_CASE_REJECTED);
    expect(() =>
      result({ case_id: "x", drift_marker: "DRIFT_MAYBE" }),
    ).toThrow(BENCHMARK_CASE_REJECTED);
    expect(
      result({ case_id: "x", drift_marker: SEMANTIC_DRIFT_DETECTED })
        .drift_marker,
    ).toBe("SEMANTIC_DRIFT_DETECTED");
  });

  it("detects missing and unexpected flow steps", () => {
    const drift = detectMissingSteps(
      ["cart", "review", "submit"],
      ["cart", "submit"],
    );
    expect(drift.drift).toBe(true);
    expect(drift.marker).toBe(SEMANTIC_DRIFT_DETECTED);
    expect(drift.missing).toEqual(["review"]);
    expect(drift.unexpected).toEqual([]);
    const extra = detectMissingSteps(["cart"], ["cart", "upsell"]);
    expect(extra.drift).toBe(true);
    expect(extra.unexpected).toEqual(["upsell"]);
    const exact = detectMissingSteps(["cart", "submit"], ["submit", "cart"]);
    expect(exact.drift).toBe(false);
    expect(exact.marker).toBeNull();
    expect(() => detectMissingSteps([], ["cart"])).toThrow(TypeError);
  });

  it("counts fabricated passes on defect and drift oracles", () => {
    const gates = evaluateIntegrityGates(
      [
        result({
          case_id: "a",
          oracle: "defect_detected",
          verdict: "clean",
        }),
        result({
          case_id: "b",
          oracle: "semantic_drift",
          verdict: "pass_with_recovery",
        }),
        result({
          case_id: "c",
          oracle: "defect_detected",
          verdict: "failed",
        }),
      ],
      ["a", "b", "c"],
    );
    expect(gates.fabricated_pass).toBe(2);
    expect(gates.hidden_applicable_not_run).toBe(0);
  });

  it("counts hidden applicable cases and rejects duplicates", () => {
    const gates = evaluateIntegrityGates([result({ case_id: "a" })], [
      "a",
      "b",
    ]);
    expect(gates.hidden_applicable_not_run).toBe(1);
    expect(() =>
      evaluateIntegrityGates(
        [result({ case_id: "a" }), result({ case_id: "a" })],
        ["a"],
      ),
    ).toThrow(TypeError);
  });

  it("sums measurement gates and scans owned outputs", () => {
    const gates = evaluateIntegrityGates(
      [
        result({
          cache_pass_grants: 2,
          case_id: "a",
          cross_tree_records: 1,
          owned_outputs: ["attempt ok", "value ghp_synthetic0123456789abcdef"],
          recovery_history_erasure: 3,
          semantic_unrevalidated: true,
          unbound_records: 1,
          uncalibrated_model_passes: 1,
          verdict: "clean",
        }),
      ],
      ["a"],
    );
    expect(gates.cross_tree_evidence_leakage).toBe(1);
    expect(gates.source_binding_violation).toBe(1);
    expect(gates.silent_semantic_heal).toBe(1);
    expect(gates.cache_authority_escalation).toBe(2);
    expect(gates.secret_leakage_from_ascout_owned_artifacts).toBe(1);
    expect(gates.unqualified_model_only_pass).toBe(1);
    expect(gates.recovery_history_erasure).toBe(1);
    const healedBlocked = evaluateIntegrityGates(
      [
        result({
          case_id: "a",
          oracle: "semantic_drift",
          semantic_unrevalidated: true,
          verdict: "blocked",
        }),
      ],
      ["a"],
    );
    expect(healedBlocked.silent_semantic_heal).toBe(0);
  });

  it("accepts results per oracle with enumerated reasons", () => {
    expect(acceptCaseResult(result({ case_id: "a" }))).toEqual([]);
    expect(
      acceptCaseResult(
        result({ case_id: "a", oracle: "defect_detected", verdict: "failed" }),
      ),
    ).toEqual([]);
    expect(
      acceptCaseResult(
        result({ case_id: "a", oracle: "defect_detected", verdict: "clean" }),
      ),
    ).toHaveLength(1);
    expect(
      acceptCaseResult(result({ case_id: "a", verdict: "failed" })),
    ).toHaveLength(1);
    const recovery = acceptCaseResult(
      result({
        case_id: "a",
        failed_attempts_visible: 1,
        oracle: "recovery_visible",
        recovery_attempts_visible: 1,
        verdict: "pass_with_recovery",
      }),
    );
    expect(recovery).toEqual([]);
    expect(
      acceptCaseResult(
        result({
          case_id: "a",
          oracle: "recovery_visible",
          verdict: "pass_with_recovery",
        }),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      acceptCaseResult(
        result({
          case_id: "a",
          oracle: "recovery_visible",
          verdict: "clean",
        }),
      ).length,
    ).toBeGreaterThan(0);
    const drift = acceptCaseResult(
      result({
        case_id: "a",
        drift_marker: SEMANTIC_DRIFT_DETECTED,
        oracle: "semantic_drift",
        verdict: "semantic_drift_detected",
      }),
    );
    expect(drift).toEqual([]);
    expect(
      acceptCaseResult(
        result({
          case_id: "a",
          oracle: "semantic_drift",
          verdict: "semantic_drift_detected",
        }),
      ),
    ).toHaveLength(1);
  });

  it("qualifies reports only on zero gates and zero reasons", () => {
    const manifest = parseBenchmarkManifest(
      readFileSync(MANIFEST_URL, "utf8"),
    );
    const happy = assembleBenchmarkReport({
      manifest: { ...manifest, cases: [{ case_id: "a", case_revision: 1, fixture: null, oracle: "clean" }] },
      report_id: "report-1",
      results: [result({ case_id: "a" })],
      source_identity: SOURCE,
    });
    expect(happy.gates).toEqual(zeroGates());
    expect(gatesAllZero(happy.gates)).toBe(true);
    expect(happy.acceptance_reasons).toEqual([]);
    expect(happy.qualifies).toBe(true);
    expect(happy.defect_recall).toBeNull();
    const bad = assembleBenchmarkReport({
      manifest: { ...manifest, cases: [{ case_id: "a", case_revision: 1, fixture: null, oracle: "defect_detected" }] },
      report_id: "report-2",
      results: [
        result({ case_id: "a", oracle: "defect_detected", verdict: "clean" }),
      ],
      source_identity: SOURCE,
    });
    expect(bad.qualifies).toBe(false);
    expect(bad.defect_recall).toBe(0);
    expect(bad.gates.fabricated_pass).toBe(1);
    expect(() =>
      assembleBenchmarkReport({
        manifest,
        report_id: "report-3",
        results: [
          result({ case_id: "a", source_identity: "other-source" }),
        ],
        source_identity: SOURCE,
      }),
    ).toThrow(BENCHMARK_CASE_REJECTED);
  });

  it("qualifies a realistic all-detected v1 run", () => {
    const manifest = parseBenchmarkManifest(
      readFileSync(MANIFEST_URL, "utf8"),
    );
    const report = assembleBenchmarkReport({
      manifest,
      report_id: "report-realistic",
      results: [
        result({ case_id: "happy-path" }),
        result({
          case_id: "locator-rename-equivalent",
          failed_attempts_visible: 1,
          oracle: "recovery_visible",
          recovery_attempts_visible: 1,
          verdict: "pass_with_recovery",
        }),
        result({
          case_id: "ambiguous-locator",
          oracle: "defect_detected",
          verdict: "failed",
        }),
        result({
          case_id: "transient-overlay",
          failed_attempts_visible: 1,
          oracle: "recovery_visible",
          recovery_attempts_visible: 1,
          verdict: "pass_with_recovery",
        }),
        result({
          case_id: "slow-navigation",
          failed_attempts_visible: 1,
          oracle: "recovery_visible",
          recovery_attempts_visible: 1,
          verdict: "pass_with_recovery",
        }),
        result({
          case_id: "console-error-green-ui",
          oracle: "defect_detected",
          verdict: "failed",
        }),
        result({
          case_id: "duplicate-submit",
          oracle: "defect_detected",
          verdict: "failed",
        }),
        result({
          case_id: "missing-required-step",
          drift_marker: SEMANTIC_DRIFT_DETECTED,
          oracle: "semantic_drift",
          verdict: "semantic_drift_detected",
        }),
        result({
          case_id: "source-tree-mismatch",
          oracle: "defect_detected",
          verdict: "blocked",
        }),
        result({ case_id: "sensitive-input" }),
      ],
      source_identity: SOURCE,
    });
    expect(report.gates).toEqual(zeroGates());
    expect(report.acceptance_reasons).toEqual([]);
    expect(report.defect_recall).toBe(1);
    expect(report.qualifies).toBe(true);
  });

  it("serializes reports deterministically", () => {
    const manifest = {
      cases: [
        {
          case_id: "a",
          case_revision: 1,
          fixture: null,
          oracle: "clean" as const,
        },
      ],
      manifest_id: "m",
      manifest_revision: 1,
    };
    const left = assembleBenchmarkReport({
      manifest,
      report_id: "report-1",
      results: [result({ case_id: "a" })],
      source_identity: SOURCE,
    });
    const right = assembleBenchmarkReport({
      manifest,
      report_id: "report-1",
      results: [result({ case_id: "a" })],
      source_identity: SOURCE,
    });
    expect(benchmarkReportToJson(left)).toBe(benchmarkReportToJson(right));
    expect(benchmarkReportDigest(left)).toBe(benchmarkReportDigest(right));
    expect(benchmarkReportDigest(left)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("validates the frozen v1 manifest with ten cases", () => {
    const manifest = parseBenchmarkManifest(
      readFileSync(MANIFEST_URL, "utf8"),
    );
    expect(manifest.manifest_id).toBe("ascout-browser-benchmark-v1");
    expect(manifest.manifest_revision).toBe(1);
    expect(manifest.cases).toHaveLength(10);
    const oracles = new Map(
      manifest.cases.map((entry) => [entry.case_id, entry.oracle]),
    );
    expect([...oracles.entries()]).toEqual([
      ["happy-path", "clean"],
      ["locator-rename-equivalent", "recovery_visible"],
      ["ambiguous-locator", "defect_detected"],
      ["transient-overlay", "recovery_visible"],
      ["slow-navigation", "recovery_visible"],
      ["console-error-green-ui", "defect_detected"],
      ["duplicate-submit", "defect_detected"],
      ["missing-required-step", "semantic_drift"],
      ["source-tree-mismatch", "defect_detected"],
      ["sensitive-input", "clean"],
    ]);
  });

  it("rejects malformed manifests", () => {
    expect(() => parseBenchmarkManifest("not json")).toThrow(
      BENCHMARK_MANIFEST_REJECTED,
    );
    expect(() => parseBenchmarkManifest("[]")).toThrow(
      BENCHMARK_MANIFEST_REJECTED,
    );
    expect(() =>
      parseBenchmarkManifest(
        JSON.stringify({ cases: [], manifest_id: "m", manifest_revision: 1 }),
      ),
    ).toThrow(BENCHMARK_MANIFEST_REJECTED);
    const good = JSON.parse(readFileSync(MANIFEST_URL, "utf8")) as Record<
      string,
      unknown
    >;
    const dup = {
      ...good,
      cases: [
        ...(good.cases as unknown[]),
        (good.cases as Record<string, unknown>[])[0],
      ],
    };
    expect(() =>
      parseBenchmarkManifest(JSON.stringify(dup)),
    ).toThrow(BENCHMARK_MANIFEST_REJECTED);
    const badOracle = JSON.parse(JSON.stringify(good)) as Record<
      string,
      unknown
    >;
    (badOracle.cases as Record<string, unknown>[])[0]!.oracle = "maybe";
    expect(() =>
      parseBenchmarkManifest(JSON.stringify(badOracle)),
    ).toThrow(BENCHMARK_CASE_REJECTED);
    const badFixture = JSON.parse(JSON.stringify(good)) as Record<
      string,
      unknown
    >;
    (badFixture.cases as Record<string, unknown>[])[0]!.fixture =
      "/etc/passwd";
    expect(() =>
      parseBenchmarkManifest(JSON.stringify(badFixture)),
    ).toThrow(BENCHMARK_MANIFEST_REJECTED);
  });
});
