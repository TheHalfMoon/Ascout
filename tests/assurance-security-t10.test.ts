import { describe, expect, it } from "vitest";
import {
  SENTRDEL_REGRESSION_TRANSITIONS,
  compareSentrdelInvariantRegressionV1,
} from "../src/assurance/security/sentrdel-invariant-regression.js";
import { SENTRDEL_ENGINE_ID, SENTRDEL_ENGINE_VERSION } from "../src/assurance/security/sentrdel-engine-boundary.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "../src/assurance/security/sentrdel-source-pin.js";

const DEF = "d".repeat(64);

function evaluation(id: string, state: string, coverage = "COVERED", extra: Record<string, unknown> = {}) {
  return { invariant_id: id, definition_digest: DEF, state, coverage_state: coverage,
    unknown_tokens: coverage === "COVERED" ? [] : ["TIMEOUT"], ...extra };
}

function side(role: string, evaluations: unknown[], extra: Record<string, unknown> = {}) {
  return {
    schema_version: 1, role, source_head: (role === "TRUSTED_BASE" ? "a" : "b").repeat(40),
    request_id: "request:t10", attempt_id: "attempt:1", engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION, engine_tree: SENTRDEL_PINNED_TREE,
    engine_version: SENTRDEL_ENGINE_VERSION, producer_id: "producer:sentrdel",
    evidence_ref: `evidence:${role.toLowerCase()}`, evidence_digest: (role === "TRUSTED_BASE" ? "1" : "2").repeat(64),
    evaluations, ...extra,
  };
}

function compare(base: unknown[], candidate: unknown[]) {
  return compareSentrdelInvariantRegressionV1(side("TRUSTED_BASE", base), side("CANDIDATE", candidate));
}

function one(base: unknown, candidate: unknown) {
  const records = compare(base ? [base] : [], candidate ? [candidate] : []).records;
  expect(records).toHaveLength(1);
  return records[0]!;
}

describe("UA-P06-T10 trusted-base invariant regression", () => {
  it("transcribes every pinned donor transition and nothing more", () => {
    expect(Object.keys(SENTRDEL_REGRESSION_TRANSITIONS).sort()).toEqual([
      "SATISFIED>SATISFIED", "SATISFIED>UNKNOWN", "SATISFIED>VIOLATED", "UNKNOWN>SATISFIED",
      "UNKNOWN>VIOLATED", "VIOLATED>SATISFIED", "VIOLATED>UNKNOWN", "VIOLATED>VIOLATED",
    ]);
    const cases: Array<[string, string, string]> = [
      ["SATISFIED", "VIOLATED", "REGRESSION"], ["VIOLATED", "SATISFIED", "IMPROVEMENT"],
      ["SATISFIED", "SATISFIED", "UNCHANGED"], ["VIOLATED", "VIOLATED", "UNCHANGED"],
    ];
    for (const [b, c, disposition] of cases) {
      const record = one(evaluation("inv:a", b), evaluation("inv:a", c));
      expect(record.disposition, `${b}>${c}`).toBe(disposition);
      expect(record.continuity_basis).toBe("EXACT_STABLE_ID");
      expect(record.remediation_verified).toBe(false);
      expect(record.finding_emitted).toBe(false);
    }
  });

  it("never lets incomplete candidate coverage look unchanged or improved", () => {
    for (const coverage of ["PARTIAL", "UNSUPPORTED", "UNAVAILABLE", "FAILED", "TIMED_OUT", "SKIPPED_BY_POLICY"]) {
      for (const base of ["SATISFIED", "VIOLATED"]) {
        const satisfied = one(evaluation("inv:a", base), evaluation("inv:a", "SATISFIED", coverage));
        expect(satisfied.disposition, `${base}>${coverage}`).toBe("COVERAGE_LOST");
        expect(satisfied.reason_code).toBe("CANDIDATE_COVERAGE_DEGRADED");
      }
    }
    const unknown = one(evaluation("inv:a", "VIOLATED"), evaluation("inv:a", "UNKNOWN", "PARTIAL"));
    expect(unknown.disposition).toBe("COVERAGE_LOST");
  });

  it("reports coverage gained from an uncertain base without calling it an improvement", () => {
    const gained = one(evaluation("inv:a", "VIOLATED", "TIMED_OUT"), evaluation("inv:a", "SATISFIED"));
    expect(gained.disposition).toBe("COVERAGE_GAINED");
    expect(gained.reason_code).toBe("CANDIDATE_COVERAGE_GAINED");
  });

  it("keeps unknown, not-applicable and redefined invariants unknown", () => {
    expect(one(evaluation("inv:a", "UNKNOWN", "PARTIAL"), evaluation("inv:a", "UNKNOWN", "FAILED")).disposition).toBe("UNKNOWN");
    expect(one(evaluation("inv:a", "NOT_APPLICABLE"), evaluation("inv:a", "NOT_APPLICABLE")).disposition).toBe("UNKNOWN");
    expect(one(evaluation("inv:a", "SATISFIED"), evaluation("inv:a", "NOT_APPLICABLE")).disposition).toBe("UNKNOWN");
    const redefined = one(evaluation("inv:a", "SATISFIED"), evaluation("inv:a", "SATISFIED", "COVERED", { definition_digest: "e".repeat(64) }));
    expect(redefined.disposition).toBe("UNKNOWN");
    expect(redefined.reason_code).toBe("INVARIANT_DEFINITION_CONFLICT");
  });

  it("treats a removed invariant as lost coverage and a new one as unmatched", () => {
    const removed = one(evaluation("inv:a", "SATISFIED"), undefined);
    expect([removed.pair_presence, removed.disposition, removed.reason_code])
      .toEqual(["BASE_ONLY", "COVERAGE_LOST", "INVARIANT_REQUIREMENT_REMOVED"]);
    expect(removed.candidate_state).toBe("ABSENT");
    const added = one(undefined, evaluation("inv:a", "VIOLATED"));
    expect([added.pair_presence, added.continuity_basis, added.disposition])
      .toEqual(["CANDIDATE_ONLY", "UNMATCHED", "COVERAGE_GAINED"]);
    expect(added.candidate_state).toBe("VIOLATED");
  });

  it("is deterministic, order independent, frozen, and never promotes a claim", () => {
    const base = [evaluation("inv:b", "SATISFIED"), evaluation("inv:a", "SATISFIED")];
    const candidate = [evaluation("inv:a", "SATISFIED"), evaluation("inv:b", "SATISFIED")];
    const first = compare(base, candidate);
    expect(compare([...base].reverse(), [...candidate].reverse())).toEqual(first);
    expect(first.records.map(r => r.invariant_id)).toEqual(["inv:a", "inv:b"]);
    expect(first.disposition_counts).toMatchObject({ UNCHANGED: 2, REGRESSION: 0 });
    expect(first.uncertain_records).toBe(0);
    expect(Object.isFrozen(first) && Object.isFrozen(first.records) && Object.isFrozen(first.records[0])).toBe(true);
    for (const flag of ["findings_emitted", "remediation_verified", "regression_free_claimed", "candidate_clean_claimed", "comparison_total"] as const) {
      expect(first[flag], flag).toBe(false);
    }
    expect(first.assurance_effect).toBe("NONE");
    expect(JSON.stringify(first)).not.toMatch(/"(PASS|CLEAN|VERIFIED|SECURE)"/u);
    expect(compare(base, [evaluation("inv:a", "VIOLATED"), evaluation("inv:b", "SATISFIED")]).comparison_id)
      .not.toBe(first.comparison_id);
  });

  it("refuses incomparable, unpinned, contradictory, and escalating input", () => {
    const ok = [evaluation("inv:a", "SATISFIED")];
    const refuse = (base: unknown, candidate: unknown, name: string) =>
      expect(() => compareSentrdelInvariantRegressionV1(base, candidate), name).toThrow(TypeError);
    refuse(side("TRUSTED_BASE", ok), side("CANDIDATE", ok, { source_head: "a".repeat(40) }), "same revision");
    refuse(side("TRUSTED_BASE", ok), side("CANDIDATE", ok, { attempt_id: "attempt:2" }), "cross attempt");
    refuse(side("TRUSTED_BASE", ok), side("CANDIDATE", ok, { request_id: "request:other" }), "cross request");
    refuse(side("CANDIDATE", ok), side("TRUSTED_BASE", ok), "swapped roles");
    refuse(side("TRUSTED_BASE", ok), side("CANDIDATE", ok, { evidence_ref: "evidence:trusted_base" }), "conflicting digest");
    refuse(side("TRUSTED_BASE", []), side("CANDIDATE", []), "nothing to compare");
    const sideChanges: Array<[string, Record<string, unknown>]> = [
      ["engine pin", { engine_pin: "0".repeat(40) }], ["engine tree", { engine_tree: "0".repeat(40) }],
      ["engine version", { engine_version: "99.0.0" }], ["schema", { schema_version: 2 }],
      ["bad head", { source_head: "123" }], ["bad digest", { evidence_digest: "123" }],
      ["verdict key", { verdict: "PASS" }], ["secret", { producer_id: "ghp_" + "x".repeat(36) }],
      ["too many", { evaluations: Array.from({ length: 65 }, (_, i) => evaluation(`inv:${i}`, "SATISFIED")) }],
    ];
    for (const [name, change] of sideChanges) refuse(side("TRUSTED_BASE", ok, change), side("CANDIDATE", ok), name);
    const evaluationChanges: Array<[string, unknown]> = [
      ["covered unknown", evaluation("inv:a", "UNKNOWN", "COVERED")],
      ["covered with reason", evaluation("inv:a", "SATISFIED", "COVERED", { unknown_tokens: ["TIMEOUT"] })],
      ["invented token", evaluation("inv:a", "SATISFIED", "PARTIAL", { unknown_tokens: ["CLEAN"] })],
      ["invented state", evaluation("inv:a", "PASS")], ["invented coverage", evaluation("inv:a", "SATISFIED", "TOTAL")],
      ["bad definition", evaluation("inv:a", "SATISFIED", "COVERED", { definition_digest: "x" })],
      ["extra key", evaluation("inv:a", "SATISFIED", "COVERED", { severity: "critical" })],
      ["non-string invariant id", evaluation("inv:a", "SATISFIED", "COVERED", { invariant_id: 7 })],
    ];
    for (const [name, bad] of evaluationChanges) refuse(side("TRUSTED_BASE", ok), side("CANDIDATE", [bad]), name);
    refuse(side("TRUSTED_BASE", [ok[0], ok[0]]), side("CANDIDATE", ok), "shared reference");
    refuse(side("TRUSTED_BASE", [evaluation("inv:a", "SATISFIED"), evaluation("inv:a", "VIOLATED")]), side("CANDIDATE", ok), "repeated invariant");
  });

  it("never runs getters on untrusted input", () => {
    let calls = 0;
    const tricky = side("CANDIDATE", [evaluation("inv:a", "SATISFIED")]);
    Object.defineProperty(tricky, "source_head", { enumerable: true, get: () => { calls += 1; return "b".repeat(40); } });
    expect(() => compareSentrdelInvariantRegressionV1(side("TRUSTED_BASE", [evaluation("inv:a", "SATISFIED")]), tricky)).toThrow(TypeError);
    expect(calls).toBe(0);
  });
});
