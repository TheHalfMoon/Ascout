import { describe, expect, it } from "vitest";
import { runSentrdelDataSecurityBenchmarkV1 } from "../src/assurance/security/sentrdel-security-benchmark-data.js";

describe("UA-P06-T15B security benchmark v1 (T07 secrets, T08 dependency reachability)", () => {
  const result = runSentrdelDataSecurityBenchmarkV1();

  it("matches every expected outcome and keeps every hard gate at zero", () => {
    expect(result.cases.filter(c => !c.matched).map(c => `${c.id}: expected ${c.expected}, observed ${c.observed}`)).toEqual([]);
    expect(result.all_cases_matched).toBe(true);
    expect(result.hard_gates).toEqual({
      secret_plaintext_in_persisted_artifact: 0, reachability_verdict_accepted: 0, unredacted_secret_accepted: 0,
    });
    expect(result.hard_gates_zero).toBe(true);
  });

  it("pins every expected outcome, covering reachability unknown, true, and false", () => {
    expect(Object.fromEntries(result.cases.map(c => [c.id, c.expected]))).toEqual({
      "secret.redacted-observation": "ACCEPTED/plaintext=false",
      "secret.plaintext-in-input-refused": "REFUSED",
      "reach.unknown-preserved": "ACCEPTED/REACHABILITY_NOT_COMPUTED",
      "reach.true-claim-refused": "REFUSED",
      "reach.false-claim-refused": "REFUSED",
      "dependency.version-match-not-finding": "finding=false",
    });
  });

  it("never contains the synthetic secret body in its own output and is never a verdict", () => {
    expect(JSON.stringify(result)).not.toContain("SYNTHETICNOTAREALBENCHMARK");
    expect(runSentrdelDataSecurityBenchmarkV1()).toEqual(result);
    expect(result).toMatchObject({ benchmark_is_security_verdict: false, assurance_effect: "NONE" });
  });
});
