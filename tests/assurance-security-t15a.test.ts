import { describe, expect, it } from "vitest";
import {
  SENTRDEL_SECURITY_BENCHMARK_CLASSES,
  runSentrdelSecurityBenchmarkV1,
} from "../src/assurance/security/sentrdel-security-benchmark.js";

describe("UA-P06-T15A security benchmark v1 (T09–T14 contracts)", () => {
  const result = runSentrdelSecurityBenchmarkV1();

  it("matches every expected outcome and keeps every hard gate at zero", () => {
    const mismatches = result.cases.filter(c => !c.matched).map(c => `${c.id}: expected ${c.expected}, observed ${c.observed}`);
    expect(mismatches).toEqual([]);
    expect(result.all_cases_matched).toBe(true);
    expect(result.hard_gates_zero).toBe(true);
    expect(Object.values(result.hard_gates).every(value => value === 0)).toBe(true);
  });

  it("covers every benchmark class with at least one case", () => {
    const covered = new Set(result.cases.map(c => c.class));
    expect([...SENTRDEL_SECURITY_BENCHMARK_CLASSES].filter(cls => !covered.has(cls))).toEqual([]);
    expect(new Set(result.cases.map(c => c.id)).size).toBe(result.cases.length);
  });

  it("pins the expected outcome of every case so expectations cannot drift silently", () => {
    expect(Object.fromEntries(result.cases.map(c => [c.id, c.expected]))).toEqual({
      "regression.satisfied-to-violated": "REGRESSION",
      "safe.satisfied-unchanged": "UNCHANGED",
      "safe.violated-to-satisfied": "IMPROVEMENT",
      "coverage.timeout-not-unchanged": "COVERAGE_LOST",
      "coverage.generic-iac-not-run": "NOT_RUN/clean=false",
      "fp.sarif-is-inference": "INFERENCE/finding=false",
      "fp.export-review-only": "review/none",
      "sarif.conflict-both-inference": "2xINFERENCE/truth=false",
      "sarif.tampered-text-refused": "REFUSED",
      "iac.pull-request-target-observation": "CONFIG_OBSERVATION_ONLY/finding=false",
      "retest.fix-only-open": "OPEN_FIX_UNVERIFIED",
      "retest.still-observed": "OPEN_STILL_OBSERVED",
      "retest.not-reobserved-unverified": "RETEST_NOT_REOBSERVED/verified=false",
      "repro.linked-not-executed": "LINKED_NOT_EXECUTED/proven=false",
      "engine.missing-not-run-exit-1": "NOT_RUN/1",
    });
  });

  it("reports metrics from the actual runs", () => {
    expect(result.metrics).toEqual({
      invariant_regression_detection: "1/1",
      known_safe_false_positives: 0,
      coverage_loss_honesty: "2/2",
      external_engine_reconciliation: "2/2",
      remediation_retest_correctness: "3/3",
    });
  });

  it("is deterministic, frozen, and never a verdict", () => {
    expect(runSentrdelSecurityBenchmarkV1()).toEqual(result);
    expect(Object.isFrozen(result) && Object.isFrozen(result.cases) && Object.isFrozen(result.hard_gates)).toBe(true);
    expect(result).toMatchObject({ benchmark_is_security_verdict: false, assurance_effect: "NONE" });
  });
});
