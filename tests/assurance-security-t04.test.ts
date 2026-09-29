import { describe, expect, it } from "vitest";

import {
  assertSentrdelObservationInvariantsV1,
  containsExternalAttestationV1,
  containsSecretMaterialV1,
  coverageLossIsCleanV1,
  externalSuccessIsAssurancePassV1,
  normalizeSentrdelEvidenceSetV1,
  normalizeSentrdelEvidenceV1,
  normalizationExecutesRuntimeV1,
  normalizationRequiresNetworkV1,
  normalizationUsesClockV1,
  normalizationUsesRandomnessV1,
  observationIsClaimAssessmentV1,
  observationIsFindingV1,
  observationIsGlobalCleanV1,
  observationVerifiesRemediationV1,
  omittedClassIsPassV1,
  SENTRDEL_EVIDENCE_KNOWN_LIMITATIONS,
  SENTRDEL_EVIDENCE_SECRET_SHAPES,
  SENTRDEL_EXTERNAL_ATTESTATION_TOKENS,
  SENTRDEL_NORMALIZATION_PHASE_AUTHORITY,
  SENTRDEL_NORMALIZATION_SCHEMA_VERSION,
  SENTRDEL_OBSERVATION_AUTHORITIES,
  SENTRDEL_OBSERVATION_COVERAGE_STATES,
  validateSentrdelExternalEvidenceV1,
  type SentrdelExternalEvidenceV1,
} from "../src/assurance/security/sentrdel-evidence-normalization.js";
import { SENTRDEL_ENGINE_ID } from "../src/assurance/security/sentrdel-engine-boundary.js";
import {
  SENTRDEL_PINNED_REVISION,
  SENTRDEL_PINNED_TREE,
  SENTRDEL_PIN_REF,
} from "../src/assurance/security/sentrdel-source-pin.js";

const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const HEAD_A = "1".repeat(40);
const HEAD_B = "2".repeat(40);

function validEvidence(
  overrides: Partial<SentrdelExternalEvidenceV1> = {},
): SentrdelExternalEvidenceV1 {
  return {
    schema_version: 1,
    request_id: "request:t04-acceptance-001",
    attempt_id: "attempt:t04-001",
    claim_class: "STRUCTURAL_OBSERVATION",
    engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE,
    engine_version: "0.0.0",
    source_head: HEAD_A,
    capability_id: "sast-structural",
    execution_state: "EXECUTED",
    rule_id: "rule:t04-eval-order",
    location: { path: "src/app.ts", start_line: 12, end_line: 18 },
    raw_evidence_ref: "raw:sentrdel-evidence-001",
    raw_evidence_digest: DIGEST_A,
    coverage_state: "PARTIAL",
    scanned_scope: ["src/app.ts"],
    unscanned_scope: ["vendor/third-party"],
    unknown_states: ["PARSER_UNSUPPORTED"],
    limitations: ["T04 normalization only; no finding promotion"],
    provenance: {
      state: "COMPLETE",
      producer_id: "producer:sentrdel-review",
      producer_version: "0.0.0",
      collector_ref: "collector:t04-001",
      rule_set_ref: "ruleset:sentrdel-v1",
    },
    effect_facts: "E0_READ_ONLY_ANALYSIS",
    network_facts: "NO_NETWORK",
    egress_facts: "NO_EGRESS",
    reproduction_ref: "repro:t04-001",
    ...overrides,
  } as SentrdelExternalEvidenceV1;
}

function normalized(
  overrides: Partial<SentrdelExternalEvidenceV1> = {},
) {
  const observation = normalizeSentrdelEvidenceV1(validEvidence(overrides));
  expect(observation).toBeDefined();
  return observation!;
}

describe("UA-P06-T04 Sentrdel evidence normalization", () => {
  it("versions the normalization schema and binds the phase authority", () => {
    expect(SENTRDEL_NORMALIZATION_SCHEMA_VERSION).toBe(1);
    expect(SENTRDEL_NORMALIZATION_PHASE_AUTHORITY).toBe("UA-P06-T04");
    expect(normalized().schema_version).toBe(1);
    expect(normalized().phase_authority).toBe("UA-P06-T04");
    const bad = validateSentrdelExternalEvidenceV1(
      validEvidence({ schema_version: 2 as never }),
    );
    expect(bad.valid).toBe(false);
  });

  it("preserves the exact donor source and pin binding", () => {
    const observation = normalized();
    expect(observation.engine_pin).toBe(SENTRDEL_PINNED_REVISION);
    expect(observation.engine_pin).toBe(
      "f5747319a50831ef7cee983d253c0ca5503c9a64",
    );
    expect(observation.engine_tree).toBe(SENTRDEL_PINNED_TREE);
    expect(observation.engine_pin_ref).toBe(SENTRDEL_PIN_REF);
    expect(observation.engine_id).toBe("engine:sentrdel");
    expect(observation.source_head).toBe(HEAD_A);
    expect(observation.raw_evidence.digest).toBe(DIGEST_A);
  });

  it("keeps normalized evidence observation-only", () => {
    const observation = normalized();
    expect(SENTRDEL_OBSERVATION_AUTHORITIES).toEqual(["OBSERVATION_ONLY"]);
    expect(observation.authority).toBe("OBSERVATION_ONLY");
    expect(observation.assurance_effect).toBe("NONE");
    expect(assertSentrdelObservationInvariantsV1(observation).ok).toBe(true);
  });

  it("never turns EXECUTED into an assurance PASS", () => {
    expect(externalSuccessIsAssurancePassV1()).toBe(false);
    const observation = normalized({ execution_state: "EXECUTED" });
    expect(observation.execution_state).toBe("EXECUTED");
    expect(observation.assurance_effect).toBe("NONE");
    expect(observation.authority).toBe("OBSERVATION_ONLY");
    expect(JSON.stringify(observation)).not.toMatch(/"PASS"/u);
  });

  it("rejects an external PASS-like token instead of accepting self-attestation", () => {
    expect(containsExternalAttestationV1("overall result: PASS")).toBe(true);
    expect(
      containsExternalAttestationV1("repository is SECURE and VERIFIED"),
    ).toBe(true);
    for (const token of SENTRDEL_EXTERNAL_ATTESTATION_TOKENS) {
      expect(containsExternalAttestationV1(`status ${token} here`)).toBe(true);
    }
    const attested = validateSentrdelExternalEvidenceV1(
      validEvidence({ limitations: ["engine reports overall PASS"] }),
    );
    expect(attested.valid).toBe(false);
    expect(attested.reasons).toContain(
      "external evidence must never self-attest",
    );
    expect(
      normalizeSentrdelEvidenceV1(
        validEvidence({ limitations: ["engine reports overall PASS"] }),
      ),
    ).toBeUndefined();
  });

  it("fails closed on malformed external results", () => {
    expect(validateSentrdelExternalEvidenceV1(null).valid).toBe(false);
    expect(validateSentrdelExternalEvidenceV1("not-an-object").valid).toBe(false);
    expect(
      validateSentrdelExternalEvidenceV1({ schema_version: 1 }).valid,
    ).toBe(false);
    expect(
      normalizeSentrdelEvidenceV1({ schema_version: 1 }),
    ).toBeUndefined();
    const nonObjectLocation = validateSentrdelExternalEvidenceV1(
      validEvidence({ location: "src/app.ts" as never }),
    );
    expect(nonObjectLocation.valid).toBe(false);
    const badLine = validateSentrdelExternalEvidenceV1(
      validEvidence({
        location: { path: "src/app.ts", start_line: 20, end_line: 4 },
      }),
    );
    expect(badLine.valid).toBe(false);
  });

  it("fails closed on unsupported fields where an exact schema is required", () => {
    const smuggled = validateSentrdelExternalEvidenceV1({
      ...validEvidence(),
      finding: { id: "finding:smuggled" },
    });
    expect(smuggled.valid).toBe(false);
    expect(smuggled.reasons).toContain(
      "external evidence contains missing or unsupported fields",
    );
    const withAssurance = validateSentrdelExternalEvidenceV1({
      ...validEvidence(),
      assurance: { verdict: "PASS" },
    });
    expect(withAssurance.valid).toBe(false);
  });

  it("fails closed on a mismatched request identity", () => {
    const missingId = validateSentrdelExternalEvidenceV1(
      validEvidence({ request_id: "" }),
    );
    expect(missingId.valid).toBe(false);
    expect(missingId.reasons).toContain(
      "request_id must be a bounded opaque identifier",
    );
    const badAttempt = validateSentrdelExternalEvidenceV1(
      validEvidence({ attempt_id: "attempt with spaces" }),
    );
    expect(badAttempt.valid).toBe(false);
  });

  it("fails closed on a mismatched source head", () => {
    const bad = validateSentrdelExternalEvidenceV1(
      validEvidence({ source_head: "HEAD_A" }),
    );
    expect(bad.valid).toBe(false);
    expect(bad.reasons).toContain(
      "source_head must be a 40 character lowercase hex sha",
    );
  });

  it("fails closed on a version or pin mismatch", () => {
    const wrongPin = validateSentrdelExternalEvidenceV1(
      validEvidence({ engine_pin: "0".repeat(40) }),
    );
    expect(wrongPin.valid).toBe(false);
    expect(wrongPin.reasons).toContain(
      "engine pin must equal the live-verified Sentrdel pin",
    );
    const wrongTree = validateSentrdelExternalEvidenceV1(
      validEvidence({ engine_tree: "0".repeat(40) }),
    );
    expect(wrongTree.valid).toBe(false);
    const wrongVersion = validateSentrdelExternalEvidenceV1(
      validEvidence({ engine_version: "9.9.9" }),
    );
    expect(wrongVersion.valid).toBe(false);
    expect(wrongVersion.reasons).toContain(
      "engine version must equal the pinned Sentrdel version",
    );
  });

  it("fails closed on an unknown capability", () => {
    const unknown = validateSentrdelExternalEvidenceV1(
      validEvidence({ capability_id: "quantum-audit" as never }),
    );
    expect(unknown.valid).toBe(false);
    expect(
      unknown.reasons.some((reason) => reason.includes("unknown or unexecutable capability")),
    ).toBe(true);
  });

  it("fails closed on a malformed rule identity or provenance", () => {
    const missingRule = validateSentrdelExternalEvidenceV1(
      validEvidence({ rule_id: null }),
    );
    expect(missingRule.valid).toBe(false);
    expect(
      missingRule.reasons.some((reason) =>
        reason.includes("requires a pinned rule identity"),
      ),
    ).toBe(true);
    const absentProvenance = validateSentrdelExternalEvidenceV1(
      validEvidence({
        provenance: {
          state: "ABSENT",
          producer_id: null,
          producer_version: null,
          collector_ref: null,
          rule_set_ref: null,
        },
      }),
    );
    expect(absentProvenance.valid).toBe(false);
    expect(
      absentProvenance.reasons.some((reason) =>
        reason.includes("requires resolvable provenance"),
      ),
    ).toBe(true);
    const incompleteProvenance = validateSentrdelExternalEvidenceV1(
      validEvidence({
        provenance: {
          state: "COMPLETE",
          producer_id: "producer:sentrdel-review",
          producer_version: null,
          collector_ref: null,
          rule_set_ref: null,
        },
      }),
    );
    expect(incompleteProvenance.valid).toBe(false);
  });

  it("fails closed on a malformed digest", () => {
    for (const digest of ["", "abc", "z".repeat(64), "A".repeat(64)]) {
      const result = validateSentrdelExternalEvidenceV1(
        validEvidence({ raw_evidence_digest: digest }),
      );
      expect(result.valid).toBe(false);
    }
  });

  it("fails closed on contradictory coverage data", () => {
    const contradiction = validateSentrdelExternalEvidenceV1(
      validEvidence({
        coverage_state: "COMPLETE_WITHIN_STATED_SCOPE",
        unknown_states: ["PARSER_UNSUPPORTED"],
      }),
    );
    expect(contradiction.valid).toBe(false);
    expect(
      contradiction.reasons.some((reason) => reason.includes("contradicts")),
    ).toBe(true);
    const emptyUnknown = validateSentrdelExternalEvidenceV1(
      validEvidence({ coverage_state: "UNKNOWN", unknown_states: [] }),
    );
    expect(emptyUnknown.valid).toBe(false);
    const emptyUnscanned = validateSentrdelExternalEvidenceV1(
      validEvidence({ coverage_state: "UNSCANNED", unscanned_scope: [] }),
    );
    expect(emptyUnscanned.valid).toBe(false);
  });

  it("rejects duplicate evidence identities and duplicate list entries", () => {
    const duplicateIdentity = normalizeSentrdelEvidenceSetV1([
      validEvidence(),
      validEvidence(),
    ]);
    expect(duplicateIdentity.ok).toBe(false);
    expect(duplicateIdentity.observations).toHaveLength(0);
    expect(
      duplicateIdentity.reasons.some((reason) =>
        reason.includes("duplicate evidence identity"),
      ),
    ).toBe(true);
    const duplicateUnknowns = validateSentrdelExternalEvidenceV1(
      validEvidence({
        unknown_states: ["PARSER_UNSUPPORTED", "PARSER_UNSUPPORTED"],
      }),
    );
    expect(duplicateUnknowns.valid).toBe(false);
    expect(
      duplicateUnknowns.reasons.some((reason) =>
        reason.includes("must not contain duplicates"),
      ),
    ).toBe(true);
  });

  it("preserves UNKNOWN states and limitations", () => {
    const observation = normalized();
    expect(observation.unknown_states).toEqual(["PARSER_UNSUPPORTED"]);
    expect(observation.limitations).toEqual([
      "T04 normalization only; no finding promotion",
    ]);
    expect(observation.limitations.length).toBeGreaterThan(0);
    const rich = normalized({
      unknown_states: ["PARSER_UNSUPPORTED", "PERMISSION_DENIED", "TIMEOUT"],
      limitations: ["bounded engine", "no exploitability verdict"],
    });
    expect(rich.unknown_states).toEqual([
      "PARSER_UNSUPPORTED",
      "PERMISSION_DENIED",
      "TIMEOUT",
    ]);
    expect(rich.coverage.unknown_states).toEqual(rich.unknown_states);
  });

  it("rejects an unknown state the capability never declares", () => {
    const undeclared = validateSentrdelExternalEvidenceV1(
      validEvidence({ unknown_states: ["REACHABILITY_NOT_COMPUTED"] }),
    );
    expect(undeclared.valid).toBe(false);
    expect(
      undeclared.reasons.some((reason) =>
        reason.includes("is not declared by capability"),
      ),
    ).toBe(true);
  });

  it("keeps missing producer information explicitly unresolved", () => {
    const observation = normalized({
      claim_class: "DEPENDENCY_OBSERVATION",
      capability_id: "dependency-delta",
      unknown_states: ["REACHABILITY_NOT_COMPUTED"],
      rule_id: null,
      location: null,
      provenance: {
        state: "UNRESOLVED",
        producer_id: null,
        producer_version: null,
        collector_ref: null,
        rule_set_ref: null,
      },
    });
    expect(observation.provenance.state).toBe("UNRESOLVED");
    expect(observation.provenance.producer_id).toBeNull();
    expect(observation.provenance.rule_set_ref).toBeNull();
    expect(observation.rule_id).toBeNull();
    expect(observation.rule_resolution).toBe("ABSENT");
    expect(observation.location.state).toBe("ABSENT");
    expect(observation.location.path).toBeNull();
  });

  it("never lets partial coverage become clean", () => {
    expect(coverageLossIsCleanV1()).toBe(false);
    expect(SENTRDEL_OBSERVATION_COVERAGE_STATES).not.toContain("CLEAN" as never);
    expect(SENTRDEL_OBSERVATION_COVERAGE_STATES).not.toContain("TOTAL" as never);
    const observation = normalized({ coverage_state: "PARTIAL" });
    expect(observation.coverage.state).toBe("PARTIAL");
    expect(observation.coverage.is_total).toBe(false);
    expect(observation.coverage.unscanned_is_clean).toBe(false);
    expect(observation.coverage.unscanned_scope).toEqual(["vendor/third-party"]);
    expect(observation.global_clean_claimed).toBe(false);
    const unscanned = normalized({
      coverage_state: "UNSCANNED",
      unknown_states: [],
      unscanned_scope: ["legacy/vendor"],
      scanned_scope: [],
    });
    expect(unscanned.coverage.state).toBe("UNSCANNED");
    expect(unscanned.coverage.is_total).toBe(false);
    expect(unscanned.coverage.unscanned_is_clean).toBe(false);
  });

  it("keeps an omitted capability class from becoming a pass", () => {
    expect(omittedClassIsPassV1()).toBe(false);
    const observation = normalized();
    expect(observation.capability_id).toBe("sast-structural");
    expect(
      observation.capability_status === "CHARACTERIZED" ||
        observation.capability_status === "NOT_CHARACTERIZED" ||
        observation.capability_status === "UNSUPPORTED",
    ).toBe(true);
    expect(
      SENTRDEL_EVIDENCE_KNOWN_LIMITATIONS.some((entry) =>
        entry.includes("never PASS"),
      ),
    ).toBe(true);
  });

  it("never persists secret content and detects every pinned secret shape", () => {
    const secrets = [
      "ghp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      "AKIAIOSFODNN7EXAMPLE",
      "-----BEGIN RSA PRIVATE KEY-----",
      "-----BEGIN PRIVATE KEY-----",
      "-----BEGIN OPENSSH PRIVATE KEY-----",
      "Authorization: Bearer abcdefghijklmnopqrstuvwxyz012345",
    ];
    for (const secret of secrets) {
      expect(containsSecretMaterialV1(secret)).toBe(true);
    }
    expect(containsSecretMaterialV1("src/app.ts")).toBe(false);
    for (const secret of secrets) {
      const result = validateSentrdelExternalEvidenceV1(
        validEvidence({ raw_evidence_ref: secret }),
      );
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain(
        "external evidence must not carry raw secret material",
      );
    }
    const observation = normalized();
    expect(observation.raw_evidence.content_persisted).toBe(false);
    expect(observation.raw_evidence.digest).toBe(DIGEST_A);
    expect(JSON.stringify(observation)).not.toMatch(/ghp_|AKIA|PRIVATE KEY/u);
  });

  it("keeps the T04 secret shape set aligned with the canonical T03 set", () => {
    expect(SENTRDEL_EVIDENCE_SECRET_SHAPES).toHaveLength(4);
    const t03Shapes = [0, 1, 2];
    for (const index of t03Shapes) {
      expect(SENTRDEL_EVIDENCE_SECRET_SHAPES[index]!.source).toBe(
        ["ghp_[A-Za-z0-9]{36}", "AKIA[0-9A-Z]{16}", "-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"][index],
      );
    }
  });

  it("produces deterministic canonical ordering", () => {
    const unordered = validEvidence({
      unknown_states: ["TIMEOUT", "FILE_SKIPPED_OVERSIZE", "PERMISSION_DENIED"],
      scanned_scope: ["src/z.ts", "src/a.ts", "src/m.ts"],
      limitations: ["second limitation", "first limitation"],
    });
    const first = normalizeSentrdelEvidenceV1(unordered);
    const second = normalizeSentrdelEvidenceV1({
      ...unordered,
      unknown_states: ["PERMISSION_DENIED", "TIMEOUT", "FILE_SKIPPED_OVERSIZE"],
      scanned_scope: ["src/m.ts", "src/z.ts", "src/a.ts"],
      limitations: ["first limitation", "second limitation"],
    });
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first!.observation_id).toBe(second!.observation_id);
    expect(first!.unknown_states).toEqual([
      "FILE_SKIPPED_OVERSIZE",
      "PERMISSION_DENIED",
      "TIMEOUT",
    ]);
    expect(first!.coverage.scanned_scope).toEqual([
      "src/a.ts",
      "src/m.ts",
      "src/z.ts",
    ]);
    expect(first!.limitations).toEqual([
      "first limitation",
      "second limitation",
    ]);
  });

  it("orders a normalized set deterministically and independently of input order", () => {
    const a = validEvidence();
    const b = validEvidence({
      raw_evidence_digest: DIGEST_B,
      source_head: HEAD_B,
      location: { path: "src/other.ts", start_line: 3, end_line: 3 },
    });
    const forward = normalizeSentrdelEvidenceSetV1([a, b]);
    const reverse = normalizeSentrdelEvidenceSetV1([b, a]);
    expect(forward.ok).toBe(true);
    expect(reverse.ok).toBe(true);
    expect(JSON.stringify(forward)).toBe(JSON.stringify(reverse));
    expect(forward.observations.map((o) => o.observation_id)).toEqual(
      reverse.observations.map((o) => o.observation_id),
    );
    const ids = forward.observations.map((o) => o.observation_id);
    expect(ids).toEqual([...ids].sort());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns immutable normalized output", () => {
    const observation = normalized();
    expect(Object.isFrozen(observation)).toBe(true);
    expect(Object.isFrozen(observation.coverage)).toBe(true);
    expect(Object.isFrozen(observation.provenance)).toBe(true);
    expect(Object.isFrozen(observation.location)).toBe(true);
    expect(Object.isFrozen(observation.raw_evidence)).toBe(true);
    expect(Object.isFrozen(observation.unknown_states)).toBe(true);
    expect(Object.isFrozen(observation.limitations)).toBe(true);
    expect(Object.isFrozen(observation.unsupported_scope)).toBe(true);
    const set = normalizeSentrdelEvidenceSetV1([validEvidence()]);
    expect(Object.isFrozen(set)).toBe(true);
    expect(Object.isFrozen(set.observations)).toBe(true);
    expect(() => {
      (observation as unknown as Record<string, unknown>)["authority"] = "FINDING";
    }).toThrow();
  });

  it("emits no Finding and no ClaimAssessment from any external result", () => {
    expect(observationIsFindingV1()).toBe(false);
    expect(observationIsClaimAssessmentV1()).toBe(false);
    expect(observationIsGlobalCleanV1()).toBe(false);
    expect(observationVerifiesRemediationV1()).toBe(false);
    const cases = [
      { capability_id: "sast-structural", unknown_states: ["PARSER_UNSUPPORTED"] },
      { capability_id: "secrets-changed", unknown_states: ["PERMISSION_DENIED"] },
    ] as const;
    for (const testCase of cases) {
      const observation = normalized(testCase);
      expect(observation.finding_emitted).toBe(false);
      expect(observation.claim_assessment_emitted).toBe(false);
      expect(observation.remediation_verified).toBe(false);
      expect(JSON.stringify(observation)).not.toMatch(
        /"claim_assessment":/u,
      );
      const record = observation as unknown as Record<string, unknown>;
      expect(record["finding"]).toBeUndefined();
      expect(record["claim_assessment"]).toBeUndefined();
      expect(assertSentrdelObservationInvariantsV1(observation).ok).toBe(true);
    }
  });

  it("rejects an external result that tries to carry a Finding or assurance", () => {
    const withFinding = validateSentrdelExternalEvidenceV1({
      ...validEvidence(),
      finding: { id: "finding:smuggled" },
    });
    expect(withFinding.valid).toBe(false);
    const withClaim = validateSentrdelExternalEvidenceV1({
      ...validEvidence(),
      claim_assessment: { state: "SUPPORTED" },
    });
    expect(withClaim.valid).toBe(false);
    const withAssurance = validateSentrdelExternalEvidenceV1({
      ...validEvidence(),
      assurance: { verdict: "PASS" },
    });
    expect(withAssurance.valid).toBe(false);
  });

  it("keeps unsupported scope explicit on every observation", () => {
    const cases = [
      { capability_id: "sast-structural", unknown_states: ["PARSER_UNSUPPORTED"] },
      { capability_id: "dependency-delta", unknown_states: ["REACHABILITY_NOT_COMPUTED"] },
      { capability_id: "github-actions", unknown_states: ["PERMISSION_DENIED"] },
    ] as const;
    for (const testCase of cases) {
      const observation = normalized(testCase);
      expect(observation.unsupported_scope.length).toBeGreaterThan(0);
      expect(observation.unsupported_scope).not.toMatch(/^clean$/iu);
      expect(observation.global_clean_claimed).toBe(false);
    }
  });

  it("keeps effect, network, and egress facts inside the canonical ceiling", () => {
    for (const field of ["effect_facts", "network_facts", "egress_facts"] as const) {
      const widened = validateSentrdelExternalEvidenceV1(
        validEvidence({ [field]: "E9_NETWORK_AND_EFFECT" as never }),
      );
      expect(widened.valid).toBe(false);
    }
    const observation = normalized();
    expect(observation.effect_facts).toBe("E0_READ_ONLY_ANALYSIS");
    expect(observation.network_facts).toBe("NO_NETWORK");
    expect(observation.egress_facts).toBe("NO_EGRESS");
  });

  it("performs no runtime execution and no network access", () => {
    expect(normalizationExecutesRuntimeV1()).toBe(false);
    expect(normalizationRequiresNetworkV1()).toBe(false);
    expect(normalizationUsesClockV1()).toBe(false);
    expect(normalizationUsesRandomnessV1()).toBe(false);
    const before = JSON.stringify(validEvidence());
    for (let index = 0; index < 5; index += 1) {
      normalizeSentrdelEvidenceV1(validEvidence());
      normalizeSentrdelEvidenceSetV1([validEvidence()]);
    }
    expect(JSON.stringify(validEvidence())).toBe(before);
  });

  it("keeps absence and malformed execution states non-passing", () => {
    for (const executionState of [
      "NOT_RUN",
      "INCOMPLETE",
      "TIMEOUT",
      "MALFORMED_OUTPUT",
      "UNAVAILABLE",
      "VERSION_MISMATCH",
      "DENIED_BY_POLICY",
    ] as const) {
      const observation = normalized({ execution_state: executionState });
      expect(observation.execution_state).toBe(executionState);
      expect(observation.assurance_effect).toBe("NONE");
      expect(observation.authority).toBe("OBSERVATION_ONLY");
      expect(observation.finding_emitted).toBe(false);
    }
    const unknownState = validateSentrdelExternalEvidenceV1(
      validEvidence({ execution_state: "SUCCEEDED" as never }),
    );
    expect(unknownState.valid).toBe(false);
  });

  it("bounds the evidence set and rejects non-array input", () => {
    expect(normalizeSentrdelEvidenceSetV1("not-an-array" as never).ok).toBe(false);
    const empty = normalizeSentrdelEvidenceSetV1([]);
    expect(empty.ok).toBe(true);
    expect(empty.observations).toHaveLength(0);
    const oversized = normalizeSentrdelEvidenceSetV1(
      Array.from({ length: 513 }, () => validEvidence()),
    );
    expect(oversized.ok).toBe(false);
  });

  it("keeps an optional reproduction reference without promoting it", () => {
    const withRepro = normalized();
    expect(withRepro.reproduction_ref).toBe("repro:t04-001");
    expect(withRepro.remediation_verified).toBe(false);
    const withoutRepro = normalized({ reproduction_ref: null });
    expect(withoutRepro.reproduction_ref).toBeNull();
    const badRepro = validateSentrdelExternalEvidenceV1(
      validEvidence({ reproduction_ref: "repro with spaces" }),
    );
    expect(badRepro.valid).toBe(false);
  });

  it("declares its limitations and never claims totality", () => {
    for (const entry of SENTRDEL_EVIDENCE_KNOWN_LIMITATIONS) {
      expect(entry.length).toBeGreaterThan(0);
    }
    expect(SENTRDEL_EVIDENCE_KNOWN_LIMITATIONS.length).toBeGreaterThanOrEqual(10);
    const observation = normalized();
    expect(observation.coverage.is_total).toBe(false);
    expect(observation.coverage.unscanned_is_clean).toBe(false);
    expect(observation.coverage.scanned_scope).toEqual(["src/app.ts"]);
  });
});
