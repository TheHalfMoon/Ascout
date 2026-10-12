import { describe, expect, it } from "vitest";
import {
  SENTRDEL_REMEDIATION_STATES,
  assessSentrdelRemediationV1,
} from "../src/assurance/security/sentrdel-remediation-retest.js";
import { normalizeSentrdelEvidenceV1 } from "../src/assurance/security/sentrdel-evidence-normalization.js";
import { SENTRDEL_ENGINE_ID } from "../src/assurance/security/sentrdel-engine-boundary.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "../src/assurance/security/sentrdel-source-pin.js";

const BEFORE = "1".repeat(40);
const AFTER = "2".repeat(40);

/** Real T04 observations, not stand-ins. */
function observation(overrides: Record<string, unknown> = {}) {
  return normalizeSentrdelEvidenceV1({
    schema_version: 1, request_id: "request:before", attempt_id: "attempt:1", claim_class: "STRUCTURAL_OBSERVATION",
    engine_id: SENTRDEL_ENGINE_ID, engine_pin: SENTRDEL_PINNED_REVISION, engine_tree: SENTRDEL_PINNED_TREE,
    engine_version: "0.0.0", source_head: BEFORE, capability_id: "sast-structural", execution_state: "EXECUTED",
    rule_id: "rule:eval-order", location: { path: "src/app.ts", start_line: 12, end_line: 18 },
    raw_evidence_ref: "raw:t13", raw_evidence_digest: "a".repeat(64), coverage_state: "PARTIAL",
    scanned_scope: ["src/app.ts"], unscanned_scope: ["vendor"], unknown_states: ["PARSER_UNSUPPORTED"], limitations: ["t13"],
    provenance: { state: "COMPLETE", producer_id: "producer:sentrdel", producer_version: "0.0.0",
      collector_ref: "collector:t13", rule_set_ref: "ruleset:v1" },
    effect_facts: "E0_READ_ONLY_ANALYSIS", network_facts: "NO_NETWORK", egress_facts: "NO_EGRESS",
    reproduction_ref: null, ...overrides,
  } as Parameters<typeof normalizeSentrdelEvidenceV1>[0]);
}

const retestObservation = (overrides: Record<string, unknown> = {}) =>
  observation({ source_head: AFTER, request_id: "request:retest", raw_evidence_digest: "b".repeat(64), ...overrides });
const fix = (overrides: Record<string, unknown> = {}) => ({ schema_version: 1, fix_ref: "pr:42", fix_head: AFTER, ...overrides });
const run = (overrides: Record<string, unknown> = {}) => ({
  schema_version: 1, source_head: AFTER, request_id: "request:retest", attempt_id: "attempt:1", capability_id: "sast-structural",
  execution_state: "EXECUTED", coverage_state: "COMPLETE_WITHIN_STATED_SCOPE", scanned_scope: ["src"], unknown_states: [],
  evidence_ref: "evidence:retest", evidence_digest: "c".repeat(64), ...overrides,
});

describe("UA-P06-T13 remediation/retest lifecycle", () => {
  it("keeps a fix without new evidence open", () => {
    const result = assessSentrdelRemediationV1(observation(), fix(), null, null);
    expect(result).toMatchObject({ state: "OPEN_FIX_UNVERIFIED", lifecycle_open: true, retest_supports_fix: false,
      remediation_verified: false, finding_emitted: false, assurance_effect: "NONE", retest_evidence_ref: null });
    expect(SENTRDEL_REMEDIATION_STATES).not.toContain("VERIFIED");
  });

  it("keeps it open when the retest re-observes the same rule at the same path", () => {
    const again = retestObservation();
    const result = assessSentrdelRemediationV1(observation(), fix(), run(), [again, retestObservation({ rule_id: "rule:other" })]);
    expect(result.state).toBe("OPEN_STILL_OBSERVED");
    expect(result.reobserved_observation_ids).toEqual([again.observation_id]);
    expect(result.lifecycle_open).toBe(true);
  });

  it("keeps it open when the retest is incomplete, naming every reason", () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ execution_state: "TIMEOUT" }, "RETEST_NOT_EXECUTED"],
      [{ coverage_state: "PARTIAL" }, "RETEST_COVERAGE_NOT_COMPLETE"],
      [{ unknown_states: ["PARSER_UNSUPPORTED"] }, "RETEST_REPORTED_UNKNOWN_STATES"],
      [{ scanned_scope: ["lib", "src/app.tsx", "sr"] }, "ORIGINAL_LOCATION_NOT_IN_RETEST_SCOPE"],
    ];
    for (const [change, reason] of cases) {
      const result = assessSentrdelRemediationV1(observation(), fix(), run(change), []);
      expect(result.state, reason).toBe("OPEN_RETEST_INCOMPLETE");
      expect(result.incomplete_reasons, reason).toEqual([reason]);
      expect(result.retest_supports_fix).toBe(false);
    }
    const noRule = observation({ claim_class: "DEPENDENCY_OBSERVATION", capability_id: "dependency-delta", rule_id: null,
      location: { path: "package-lock.json", start_line: null, end_line: null }, scanned_scope: ["package-lock.json"],
      unknown_states: ["REACHABILITY_NOT_COMPUTED"] });
    expect(assessSentrdelRemediationV1(noRule, fix(), run({ capability_id: "dependency-delta", scanned_scope: ["package-lock.json"] }), [])
      .incomplete_reasons).toEqual(["ORIGINAL_HAS_NO_STABLE_RULE_IDENTITY"]);
  });

  it("lets only a complete, in-scope, non-reobserving retest support the fix, without verifying it", () => {
    for (const scope of [["src"], ["src/app.ts"]]) {
      const result = assessSentrdelRemediationV1(observation(), fix(), run({ scanned_scope: scope }),
        [retestObservation({ rule_id: "rule:other" }), retestObservation({ location: { path: "src/other.ts", start_line: 1, end_line: 2 },
          raw_evidence_digest: "d".repeat(64) })]);
      expect(result).toMatchObject({ state: "RETEST_NOT_REOBSERVED", lifecycle_open: false, retest_supports_fix: true,
        remediation_verified: false, assurance_effect: "NONE", retest_evidence_ref: "evidence:retest" });
    }
  });

  it("is deterministic and bound to the fix and the retest evidence", () => {
    const first = assessSentrdelRemediationV1(observation(), fix(), run(), []);
    expect(assessSentrdelRemediationV1(observation(), fix(), run(), [])).toEqual(first);
    expect(assessSentrdelRemediationV1(observation(), fix(), run({ evidence_digest: "e".repeat(64) }), []).assessment_id)
      .not.toBe(first.assessment_id);
    expect(assessSentrdelRemediationV1(observation(), fix({ fix_ref: "pr:43" }), run(), []).assessment_id).not.toBe(first.assessment_id);
    expect(Object.isFrozen(first) && Object.isFrozen(first.incomplete_reasons)).toBe(true);
  });

  it("refuses retests that are not bound to the fix, and promoted or malformed input", () => {
    const refuse = (args: [unknown, unknown, unknown, unknown], name: string) =>
      expect(() => assessSentrdelRemediationV1(...args), name).toThrow(TypeError);
    const o = observation();
    refuse([o, fix({ fix_head: BEFORE }), null, null], "fix at the observed revision");
    refuse([o, fix(), run({ source_head: "3".repeat(40) }), []], "retest at another head");
    refuse([o, fix(), run({ capability_id: "secrets-changed" }), []], "retest with another capability");
    refuse([o, fix(), run(), [observation()]], "retest observation from the old head");
    refuse([o, fix(), run(), [retestObservation({ attempt_id: "attempt:9" })]], "retest observation from another attempt");
    const otherCapability = retestObservation({ claim_class: "SECRET_SHAPE_OBSERVATION", capability_id: "secrets-changed",
      rule_id: "rule:secret-shape", unknown_states: ["TIMEOUT"] });
    expect(otherCapability, "real T04 secrets observation").toBeTypeOf("object");
    refuse([o, fix(), run(), [otherCapability]], "retest observation from another capability");
    refuse([o, fix(), run(), null], "run without observations");
    refuse([o, fix(), null, []], "observations without run");
    refuse([o, fix({ verified: true }), null, null], "extra fix key");
    refuse([o, fix(), run({ status: "PASS" }), []], "extra run key");
    refuse([o, fix(), run({ coverage_state: "TOTAL" }), []], "invented coverage");
    refuse([o, fix({ fix_ref: "AKIA" + "Q".repeat(16) }), null, null], "secret fix ref");
    refuse([{ ...o, remediation_verified: true }, fix(), null, null], "promoted original");
    refuse([o, fix(), run(), [{ ...retestObservation(), finding_emitted: true }]], "promoted retest observation");
    let calls = 0;
    const accessor = { ...o };
    Object.defineProperty(accessor, "rule_id", { enumerable: true, get: () => { calls += 1; return "rule:eval-order"; } });
    refuse([accessor, fix(), null, null], "accessor original");
    expect(calls).toBe(0);
  });
});
