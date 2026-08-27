import { describe, expect, it } from "vitest";

import {
  buildNormalizedTestFinding,
  failingTestIdentities,
  normalizeTestReproduction,
  normalizedAggregateTestStatus,
  observationsForIdentity,
  parseTestAssertionObservations,
} from "../src/test-reproduction.js";

describe("T064 reproduction normalization", () => {
  it("normalizes one, repeated, and contradictory valid observations", () => {
    expect(normalizeTestReproduction(["failed"])).toEqual({
      runs: 1,
      failures: 1,
      reproduced: "unknown",
      determinismClass: "unknown",
      flaky: false,
    });
    expect(normalizeTestReproduction(["failed", "failed", "failed"])).toEqual({
      runs: 3,
      failures: 3,
      reproduced: true,
      determinismClass: "deterministic",
      flaky: false,
    });
    expect(normalizeTestReproduction(["failed", "failed", "passed"])).toEqual({
      runs: 3,
      failures: 2,
      reproduced: false,
      determinismClass: "nondeterministic",
      flaky: true,
    });
  });

  it("parses exact Jest-compatible Vitest/Jest assertion identities without inventing unsupported states", () => {
    const text = JSON.stringify({
      testResults: [{
        name: "/repo/tests/a.test.ts",
        assertionResults: [
          { fullName: "suite fails", status: "failed" },
          { fullName: "suite passes", status: "passed" },
          { fullName: "suite skips", status: "skipped" },
          { title: "missing full name", status: "failed" },
        ],
      }],
    });

    expect(parseTestAssertionObservations("/repo", text, "test.e3")).toEqual([
      { path: "tests/a.test.ts", fullName: "suite fails", outcome: "failed", evidenceId: "test.e3" },
      { path: "tests/a.test.ts", fullName: "suite passes", outcome: "passed", evidenceId: "test.e3" },
    ]);
  });

  it("fails closed on machine paths outside the repository", () => {
    const text = JSON.stringify({
      testResults: [{
        name: "/other/tests/a.test.ts",
        assertionResults: [{ fullName: "outside", status: "failed" }],
      }],
    });
    expect(parseTestAssertionObservations("/repo", text, "test.e3")).toEqual([]);
  });

  it("builds M1 findings with unknown causation and evidence-bound normalized observations", () => {
    const observations = [
      { path: "tests/a.test.ts", fullName: "suite fails", outcome: "failed" as const, evidenceId: "test.e3" },
      { path: "tests/a.test.ts", fullName: "suite fails", outcome: "failed" as const, evidenceId: "test.e11" },
      { path: "tests/a.test.ts", fullName: "suite fails", outcome: "passed" as const, evidenceId: "test.e14" },
    ];
    const identity = failingTestIdentities(observations)[0]!;
    expect(observationsForIdentity(observations, identity)).toEqual(observations);
    const finding = buildNormalizedTestFinding(0, "vitest", identity, observations);

    expect(finding).toMatchObject({
      finding_id: "test.finding.1",
      task_id: "test",
      producer: "vitest",
      rule_or_test_id: "suite fails",
      path: "tests/a.test.ts",
      introduced_by_change: "unknown",
      determinism_class: "nondeterministic",
      observations: { runs: 3, failures: 2 },
      reproduced: false,
      evidence_ids: ["test.e3", "test.e11", "test.e14"],
    });
  });

  it("keeps aggregate FAIL while any finding remains stable or unknown", () => {
    const flaky = buildNormalizedTestFinding(0, "jest", { path: "tests/a.test.ts", fullName: "flakes" }, [
      { path: "tests/a.test.ts", fullName: "flakes", outcome: "failed", evidenceId: "e1" },
      { path: "tests/a.test.ts", fullName: "flakes", outcome: "passed", evidenceId: "e2" },
    ]);
    const stable = buildNormalizedTestFinding(1, "jest", { path: "tests/a.test.ts", fullName: "fails" }, [
      { path: "tests/a.test.ts", fullName: "fails", outcome: "failed", evidenceId: "e1" },
      { path: "tests/a.test.ts", fullName: "fails", outcome: "failed", evidenceId: "e3" },
    ]);
    const unknown = buildNormalizedTestFinding(2, "jest", { path: "tests/a.test.ts", fullName: "unknown" }, [
      { path: "tests/a.test.ts", fullName: "unknown", outcome: "failed", evidenceId: "e1" },
    ]);

    expect(normalizedAggregateTestStatus([flaky])).toBe("FLAKY");
    expect(normalizedAggregateTestStatus([flaky, stable])).toBe("FAIL");
    expect(normalizedAggregateTestStatus([flaky, unknown])).toBe("FAIL");
  });
});
