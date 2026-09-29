import { describe, expect, it } from "vitest";

import {
  assertSentrdelSastInvariantsV1,
  checkSastUpstreamCompatibilityV1,
  locationIsExecutableProofV1,
  normalizeSentrdelSastInputV1,
  normalizeSentrdelSastSetV1,
  provenanceImpliesTrustV1,
  ruleMatchIsVulnerabilityV1,
  sastImpliesGlobalCleanV1,
  sastNormalizationExecutesRuntimeV1,
  sastNormalizationRequiresNetworkV1,
  sastNormalizationUsesClockV1,
  sastNormalizationUsesRandomnessV1,
  sastObservationIsClaimAssessmentV1,
  sastObservationIsFindingV1,
  severityIsDerivedV1,
  SENTRDEL_SAST_AUTHORITIES,
  SENTRDEL_SAST_CAPABILITY_ID,
  SENTRDEL_SAST_KNOWN_LIMITATIONS,
  SENTRDEL_SAST_LIMITATION_COUNT,
  SENTRDEL_SAST_MATCH_STATES,
  SENTRDEL_SAST_PHASE_AUTHORITY,
  SENTRDEL_SAST_SCHEMA_VERSION,
  SENTRDEL_SAST_SEVERITY_STATES,
  SENTRDEL_SAST_SUPPORTED_EXTENSIONS,
  SENTRDEL_SAST_SUPPORTED_LANGUAGES,
  validateSentrdelSastInputV1,
  type SentrdelSastInputV1,
  type SentrdelSastObservationV1,
} from "../src/assurance/security/sentrdel-sast-normalization.js";
import { SENTRDEL_ENGINE_ID } from "../src/assurance/security/sentrdel-engine-boundary.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PIN_REF } from "../src/assurance/security/sentrdel-source-pin.js";
import { SENTRDEL_OBSERVATION_CLAIM_CLASSES } from "../src/assurance/security/sentrdel-evidence-normalization.js";
import { SENTRDEL_COVERAGE_LOSS_REASONS } from "../src/assurance/security/sentrdel-coverage-mapping.js";
import { SENTRDEL_ENGINE_VERSION } from "../src/assurance/security/sentrdel-engine-boundary.js";

const HEAD_A = "1".repeat(40);
const HEAD_B = "2".repeat(40);
const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);

function input(
  overrides: Partial<SentrdelSastInputV1> = {},
): SentrdelSastInputV1 {
  return {
    schema_version: 1,
    request_id: "request:t06-acceptance-001",
    attempt_id: "attempt:t06-001",
    source_head: HEAD_A,
    engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: "0d70de477fa403a416a8cff5576498e4c59a1689",
    engine_version: SENTRDEL_ENGINE_VERSION,
    capability_id: SENTRDEL_SAST_CAPABILITY_ID,
    claim_class: "STRUCTURAL_OBSERVATION",
    execution_state: "EXECUTED",
    match_state: "RULE_MATCHED",
    rule_id: "rule:t06-eval-order",
    rule_set_ref: "ruleset:sentrdel-v1",
    location_path: "src/app.ts",
    location_start_line: 12,
    location_end_line: 18,
    provenance_state: "COMPLETE",
    producer_id: "producer:sentrdel-review",
    producer_version: "0.0.0",
    collector_ref: "collector:t06-001",
    coverage_state: "PARTIAL",
    aggregate_coverage_state: "PARTIALLY_COVERED",
    unknown_states: ["PARSER_UNSUPPORTED"],
    coverage_loss_reasons: ["UNSUPPORTED_LANGUAGE"],
    raw_evidence_ref: "raw:sentrdel-sast-001",
    raw_evidence_digest: DIGEST_A,
    limitations: ["T06 bounded structural matching only"],
    effect_facts: "E0_READ_ONLY_ANALYSIS",
    network_facts: "NO_NETWORK",
    egress_facts: "NO_EGRESS",
    ...overrides,
  } as SentrdelSastInputV1;
}

function normalized(
  overrides: Partial<SentrdelSastInputV1> = {},
): SentrdelSastObservationV1 {
  const observation = normalizeSentrdelSastInputV1(input(overrides));
  expect(observation).toBeDefined();
  return observation!;
}

describe("UA-P06-T06 Sentrdel SAST normalization", () => {
  it("versions the schema and binds the phase authority", () => {
    expect(SENTRDEL_SAST_SCHEMA_VERSION).toBe(1);
    expect(SENTRDEL_SAST_PHASE_AUTHORITY).toBe("UA-P06-T06");
    const observation = normalized();
    expect(observation.schema_version).toBe(1);
    expect(observation.phase_authority).toBe("UA-P06-T06");
    expect(observation.authority).toBe("STRUCTURAL_OBSERVATION_ONLY");
    expect(SENTRDEL_SAST_AUTHORITIES).toEqual(["STRUCTURAL_OBSERVATION_ONLY"]);
    expect(validateSentrdelSastInputV1(input({ schema_version: 2 as never })).valid).toBe(
      false,
    );
  });

  it("1. preserves the pinned rule identity exactly", () => {
    const observation = normalized();
    expect(observation.rule.rule_id).toBe("rule:t06-eval-order");
    expect(observation.rule.rule_set_ref).toBe("ruleset:sentrdel-v1");
    expect(observation.rule.rule_resolution).toBe("PRESENT");
    expect(observation.rule.rule_is_pinned).toBe(true);
    // An absent rule identity is never invented.
    const missing = validateSentrdelSastInputV1(input({ rule_id: null }));
    expect(missing.valid).toBe(false);
    expect(missing.reasons.join(" ")).toContain("requires a pinned rule identity");
  });

  it("2. preserves the source location exactly", () => {
    const observation = normalized();
    expect(observation.location.path).toBe("src/app.ts");
    expect(observation.location.start_line).toBe(12);
    expect(observation.location.end_line).toBe(18);
    expect(observation.location.resolution).toBe("PRESENT");
    expect(observation.location.language).toBe("typescript");
    expect(observation.location.language_support).toBe("SUPPORTED");
    expect(observation.location.file_extension).toBe("ts");
    // A location is never widened or completed beyond what was reported.
    const partial = normalized({ location_end_line: null });
    expect(partial.location.resolution).toBe("PARTIAL");
    expect(partial.location.end_line).toBeNull();
  });

  it("3. preserves producer provenance exactly", () => {
    const observation = normalized();
    expect(observation.provenance.state).toBe("COMPLETE");
    expect(observation.provenance.producer_id).toBe("producer:sentrdel-review");
    expect(observation.provenance.producer_version).toBe("0.0.0");
    expect(observation.provenance.collector_ref).toBe("collector:t06-001");
    expect(observation.provenance.rule_set_ref).toBe("ruleset:sentrdel-v1");
    // COMPLETE provenance never implies the engine is trusted.
    expect(observation.provenance_implies_trust).toBe(false);
    expect(provenanceImpliesTrustV1()).toBe(false);
  });

  it("3b. never fabricates provenance to reach COMPLETE", () => {
    const incomplete = validateSentrdelSastInputV1(
      input({ provenance_state: "COMPLETE", producer_id: null }),
    );
    expect(incomplete.valid).toBe(false);
    expect(incomplete.reasons.join(" ")).toContain(
      "producer_id is required when state is COMPLETE",
    );
  });

  it("4. keeps a rule match distinct from a vulnerability", () => {
    const observation = normalized();
    expect(observation.match_state).toBe("RULE_MATCHED");
    expect(observation.rule_match_is_vulnerability).toBe(false);
    expect(ruleMatchIsVulnerabilityV1()).toBe(false);
    expect(observation.severity_state).toBe("NEVER_DERIVED");
    expect(observation.severity_value).toBeNull();
    expect(severityIsDerivedV1()).toBe(false);
    expect(locationIsExecutableProofV1()).toBe(false);
    expect(SENTRDEL_SAST_SEVERITY_STATES).toEqual(["NEVER_DERIVED"]);
    // The match vocabulary cannot express an exploitability verdict.
    for (const value of SENTRDEL_SAST_MATCH_STATES) {
      expect(value).not.toBe("VULNERABLE");
      expect(value).not.toBe("EXPLOITABLE");
      expect(value).not.toBe("CONFIRMED");
    }
  });

  it("4b. keeps a location distinct from an executable proof", () => {
    const observation = normalized();
    expect(observation.location_is_executable_proof).toBe(false);
    const record = observation as unknown as Record<string, unknown>;
    for (const forbidden of [
      "exploitable",
      "exploitability",
      "reachability",
      "reachable",
    ]) {
      expect(record[forbidden]).toBeUndefined();
    }
  });

  it("5. rejects a match on an unsupported language", () => {
    const validation = validateSentrdelSastInputV1(
      input({ location_path: "src/main.go" }),
    );
    expect(validation.valid).toBe(false);
    expect(validation.reasons.join(" ")).toContain("not claimable for unsupported");
    expect(normalizeSentrdelSastInputV1(input({ location_path: "src/main.go" }))).toBeUndefined();
  });

  it("5b. keeps unsupported scope explicit rather than guessing", () => {
    const observation = normalized({
      match_state: "RULE_NOT_MATCHED_IN_STATED_SCOPE",
      location_path: "src/main.go",
      coverage_state: "PARTIAL",
    });
    expect(observation.match_state).toBe("RULE_NOT_MATCHED_IN_STATED_SCOPE");
    expect(observation.location.language_support).toBe("UNSUPPORTED");
    expect(observation.location.language).toBeNull();
    expect(observation.location.file_extension).toBe("go");
    // An unsupported language is explicit, never upgraded to a covered claim.
    expect(observation.coverage.is_total).toBe(false);
    expect(assertSentrdelSastInvariantsV1(observation).ok).toBe(true);
  });

  it("5c. treats an unextended path as indeterminate, not as a guess", () => {
    const observation = normalized({
      match_state: "RULE_NOT_MATCHED_IN_STATED_SCOPE",
      location_path: "src/Makefile",
    });
    expect(observation.location.language_support).toBe("INDETERMINATE");
    expect(observation.location.file_extension).toBeNull();
  });

  it("6. never lets NOT_RUN become a pass", () => {
    const observation = normalized({
      execution_state: "NOT_RUN",
      match_state: "UNKNOWN",
      coverage_state: "UNSCANNED",
      aggregate_coverage_state: "NOT_COVERED",
      unknown_states: ["ANALYZER_UNAVAILABLE"],
      coverage_loss_reasons: ["ENGINE_UNAVAILABLE"],
      limitations: ["T06 engine was not executed"],
    });
    expect(observation.match_state).toBe("UNKNOWN");
    expect(observation.coverage.is_total).toBe(false);
    expect(observation.coverage.unscanned_is_clean).toBe(false);
    expect(observation.coverage.unknown_is_pass).toBe(false);
    expect(observation.global_clean_claimed).toBe(false);
    expect(assertSentrdelSastInvariantsV1(observation).ok).toBe(true);
  });

  it("6b. rejects a non-producing state that claims a match", () => {
    for (const [state, reason] of [
      ["NOT_RUN", "ENGINE_UNAVAILABLE"],
      ["TIMEOUT", "TIMEOUT"],
      ["MALFORMED_OUTPUT", "MALFORMED_OUTPUT"],
      ["UNAVAILABLE", "ENGINE_UNAVAILABLE"],
      ["VERSION_MISMATCH", "VERSION_MISMATCH"],
    ] as const) {
      const validation = validateSentrdelSastInputV1(
        input({ execution_state: state, coverage_loss_reasons: [reason] }),
      );
      expect(validation.valid, state).toBe(false);
      expect(validation.reasons.join(" "), state).toContain("may not report one");
    }
  });

  it("7. keeps partial coverage partial and never total", () => {
    const observation = normalized();
    expect(observation.coverage.observation_state).toBe("PARTIAL");
    expect(observation.coverage.aggregate_state).toBe("PARTIALLY_COVERED");
    expect(observation.coverage.is_total).toBe(false);
    expect(observation.coverage.coverage_loss_reasons).toEqual([
      "UNSUPPORTED_LANGUAGE",
    ]);
    expect(observation.coverage.unknown_states).toEqual(["PARSER_UNSUPPORTED"]);
  });

  it("8. carries UNKNOWN coverage through without resolving it", () => {
    const observation = normalized({
      match_state: "UNKNOWN",
      coverage_state: "UNKNOWN",
      aggregate_coverage_state: "UNKNOWN",
      unknown_states: ["PARSER_UNSUPPORTED"],
      coverage_loss_reasons: ["UNSUPPORTED_LANGUAGE"],
    });
    expect(observation.coverage.observation_state).toBe("UNKNOWN");
    expect(observation.coverage.unknown_is_pass).toBe(false);
    expect(observation.match_state).toBe("UNKNOWN");
  });

  it("9. rejects a contradiction between coverage and a match", () => {
    const unscannedMatch = validateSentrdelSastInputV1(
      input({ coverage_state: "UNSCANNED" }),
    );
    expect(unscannedMatch.valid).toBe(false);
    expect(unscannedMatch.reasons.join(" ")).toContain(
      "a matched rule contradicts unscanned coverage",
    );
    const notCoveredMatch = validateSentrdelSastInputV1(
      input({ aggregate_coverage_state: "NOT_COVERED" }),
    );
    expect(notCoveredMatch.valid).toBe(false);
    expect(notCoveredMatch.reasons.join(" ")).toContain(
      "contradicts not-covered aggregate scope",
    );
  });

  it("10. rejects duplicate observation identities in a set", () => {
    const set = normalizeSentrdelSastSetV1([input(), input()]);
    expect(set.ok).toBe(false);
    expect(set.observations).toEqual([]);
    expect(set.reasons.join(" ")).toContain("duplicate observation identity");
  });

  it("10b. fails the whole set closed when one input is malformed", () => {
    const set = normalizeSentrdelSastSetV1([input(), input({ engine_pin: "0".repeat(40) })]);
    expect(set.ok).toBe(false);
    expect(set.observations).toEqual([]);
    expect(set.rejected_indices).toEqual([1]);
  });

  it("10c. orders a set deterministically and preserves each record", () => {
    const first = input({
      location_path: "src/a.ts",
      raw_evidence_digest: DIGEST_A,
    });
    const second = input({
      location_path: "src/b.ts",
      raw_evidence_digest: DIGEST_B,
    });
    const forward = normalizeSentrdelSastSetV1([first, second]);
    const reversed = normalizeSentrdelSastSetV1([second, first]);
    expect(forward.ok).toBe(true);
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(forward));
    const ids = forward.observations.map((record) => record.sast_observation_id);
    expect([...ids].sort()).toEqual(ids);
  });

  it("11. produces identical output for identical input", () => {
    const a = normalized();
    const b = normalized();
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(a.rule)).toBe(true);
    expect(Object.isFrozen(a.location)).toBe(true);
    expect(Object.isFrozen(a.provenance)).toBe(true);
    expect(Object.isFrozen(a.coverage)).toBe(true);
  });

  it("12. emits no Finding and no ClaimAssessment", () => {
    const observation = normalized();
    expect(observation.finding_emitted).toBe(false);
    expect(observation.claim_assessment_emitted).toBe(false);
    expect(observation.assurance_effect).toBe("NONE");
    expect(sastObservationIsFindingV1()).toBe(false);
    expect(sastObservationIsClaimAssessmentV1()).toBe(false);
    const record = observation as unknown as Record<string, unknown>;
    for (const forbidden of [
      "finding",
      "claim_assessment",
      "assurance",
      "verdict",
      "claim",
    ]) {
      expect(record[forbidden]).toBeUndefined();
    }
  });

  it("13. never lets a global clean field become true", () => {
    const observation = normalized();
    expect(observation.global_clean_claimed).toBe(false);
    expect(observation.remediation_verified).toBe(false);
    expect(sastImpliesGlobalCleanV1()).toBe(false);
    const tampered = {
      ...observation,
      global_clean_claimed: true,
    } as unknown as SentrdelSastObservationV1;
    const check = assertSentrdelSastInvariantsV1(tampered);
    expect(check.ok).toBe(false);
    expect(check.reasons.join(" ")).toContain("must never claim a global clean");
  });

  it("13b. catches a consumer that forces a severity or a vulnerability", () => {
    const observation = normalized();
    const forcedSeverity = {
      ...observation,
      severity_state: "HIGH",
      severity_value: 8,
    } as unknown as SentrdelSastObservationV1;
    expect(assertSentrdelSastInvariantsV1(forcedSeverity).reasons.join(" ")).toContain(
      "severity must never be derived",
    );
    const forcedVulnerability = {
      ...observation,
      rule_match_is_vulnerability: true,
    } as unknown as SentrdelSastObservationV1;
    expect(
      assertSentrdelSastInvariantsV1(forcedVulnerability).reasons.join(" "),
    ).toContain("rule match must never equal a vulnerability claim");
  });

  it("14. rejects an input that smuggles authority", () => {
    for (const forbidden of [
      "finding",
      "claim_assessment",
      "assurance",
      "verdict",
      "severity",
      "severity_value",
      "global_clean",
    ]) {
      const smuggled = { ...input(), [forbidden]: "PASS" } as unknown;
      const validation = validateSentrdelSastInputV1(smuggled);
      expect(validation.valid, forbidden).toBe(false);
      expect(validation.reasons.join(" ")).toContain(
        `SAST input must never carry ${forbidden}`,
      );
    }
  });

  it("15. has no runtime, network, clock, or randomness dependency", () => {
    expect(sastNormalizationExecutesRuntimeV1()).toBe(false);
    expect(sastNormalizationRequiresNetworkV1()).toBe(false);
    expect(sastNormalizationUsesClockV1()).toBe(false);
    expect(sastNormalizationUsesRandomnessV1()).toBe(false);
    const observation = normalized();
    expect(observation.effect_facts).toBe("E0_READ_ONLY_ANALYSIS");
    expect(observation.network_facts).toBe("NO_NETWORK");
    expect(observation.egress_facts).toBe("NO_EGRESS");
    expect(normalizeSentrdelSastInputV1({ schema_version: 1 })).toBeUndefined();
  });

  it("16. keeps the exact source and pin binding", () => {
    const observation = normalized();
    expect(observation.engine_id).toBe("engine:sentrdel");
    expect(observation.engine_pin).toBe(SENTRDEL_PINNED_REVISION);
    expect(observation.engine_pin).toBe("f5747319a50831ef7cee983d253c0ca5503c9a64");
    expect(observation.engine_pin_ref).toBe(SENTRDEL_PIN_REF);
    expect(observation.source_head).toBe(HEAD_A);
    const wrongBindings: ReadonlyArray<[string, Partial<SentrdelSastInputV1>]> = [
      ["engine id", { engine_id: "engine:other" }],
      ["engine pin", { engine_pin: "0".repeat(40) }],
      ["engine tree", { engine_tree: "0".repeat(40) }],
      ["engine version", { engine_version: "9.9.9" }],
      ["source head", { source_head: "not-a-sha" }],
    ];
    for (const [label, overrides] of wrongBindings) {
      expect(validateSentrdelSastInputV1(input(overrides)).valid, label).toBe(false);
    }
  });

  it("17. accepts only the sast-structural capability and structural claim class", () => {
    const otherCapability = validateSentrdelSastInputV1(
      input({ capability_id: "secrets-changed" }),
    );
    expect(otherCapability.valid).toBe(false);
    expect(otherCapability.reasons.join(" ")).toContain(
      "T06 normalizes sast-structural only",
    );
    const otherClass = validateSentrdelSastInputV1(
      input({ claim_class: "SECRET_SHAPE_OBSERVATION" }),
    );
    expect(otherClass.valid).toBe(false);
    expect(otherClass.reasons.join(" ")).toContain(
      "T06 accepts STRUCTURAL_OBSERVATION only",
    );
    const unknown = validateSentrdelSastInputV1(
      input({ capability_id: "capability:not-real" }),
    );
    expect(unknown.valid).toBe(false);
    expect(unknown.reasons.join(" ")).toContain("unknown capability identity");
  });

  it("18. rejects a self-attesting or secret-bearing record", () => {
    const attesting = validateSentrdelSastInputV1(
      input({ limitations: ["This code is SECURE"] }),
    );
    expect(attesting.valid).toBe(false);
    expect(attesting.reasons.join(" ")).toContain("must never self-attest");
    const secretBearing = validateSentrdelSastInputV1(
      input({
        location_path: "config/keys.ts",
        limitations: ["saw AKIAIOSFODNN7EXAMPLE while scanning"],
      }),
    );
    expect(secretBearing.valid).toBe(false);
    expect(secretBearing.reasons.join(" ")).toContain("must not carry secret material");
  });

  it("19. refuses an upstream observation the T04 boundary rejects", () => {
    // A well-formed T04 record is compatible.
    expect(checkSastUpstreamCompatibilityV1(undefined).length).toBeGreaterThan(0);
    const wrongAuthority = {
      schema_version: 1,
      phase_authority: "UA-P06-T04",
      authority: "ASSURANCE_PASS",
    };
    const reasons = checkSastUpstreamCompatibilityV1(wrongAuthority);
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.join(" ")).toContain("authority must be OBSERVATION_ONLY");
  });

  it("20. exposes the frozen SAST vocabularies and limitations", () => {
    expect(SENTRDEL_SAST_SUPPORTED_LANGUAGES).toEqual(["javascript", "typescript"]);
    expect(SENTRDEL_SAST_SUPPORTED_EXTENSIONS).toEqual([
      "cjs",
      "cts",
      "js",
      "jsx",
      "mjs",
      "mts",
      "ts",
      "tsx",
    ]);
    expect(SENTRDEL_SAST_MATCH_STATES).toEqual([
      "RULE_MATCHED",
      "RULE_NOT_MATCHED_IN_STATED_SCOPE",
      "UNKNOWN",
    ]);
    expect(SENTRDEL_SAST_LIMITATION_COUNT).toBe(
      SENTRDEL_SAST_KNOWN_LIMITATIONS.length,
    );
    expect(SENTRDEL_SAST_LIMITATION_COUNT).toBeGreaterThanOrEqual(10);
    expect(SENTRDEL_SAST_CAPABILITY_ID).toBe("sast-structural");
    expect(SENTRDEL_OBSERVATION_CLAIM_CLASSES).toContain("STRUCTURAL_OBSERVATION");
    expect(SENTRDEL_COVERAGE_LOSS_REASONS).toContain("UNSUPPORTED_LANGUAGE");
  });

  it("21. resolves every supported extension to a supported language", () => {
    for (const extension of SENTRDEL_SAST_SUPPORTED_EXTENSIONS) {
      const observation = normalized({
        location_path: `src/file.${extension}`,
      });
      expect(observation.location.language_support, extension).toBe("SUPPORTED");
      expect(
        SENTRDEL_SAST_SUPPORTED_LANGUAGES,
        extension,
      ).toContain(observation.location.language!);
      expect(observation.location.file_extension).toBe(extension);
    }
  });

  it("22. keeps a second source head binding exact", () => {
    const other = normalized({
      source_head: HEAD_B,
      request_id: "request:t06-acceptance-002",
      raw_evidence_digest: DIGEST_B,
    });
    expect(other.source_head).toBe(HEAD_B);
    expect(other.engine_pin).toBe(SENTRDEL_PINNED_REVISION);
    expect(other.sast_observation_id).not.toBe(normalized().sast_observation_id);
  });

  it("22. keeps a second source head binding exact", () => {
    const other = normalized({
      source_head: HEAD_B,
      request_id: "request:t06-acceptance-002",
      raw_evidence_digest: DIGEST_B,
    });
    expect(other.source_head).toBe(HEAD_B);
    expect(other.engine_pin).toBe(SENTRDEL_PINNED_REVISION);
    expect(other.sast_observation_id).not.toBe(normalized().sast_observation_id);
  });

  it("19. requires resolvable provenance for a structural claim class", () => {
    // This mirrors the canonical T04 rule: an unattributable structural
    // observation must not be admitted by T06.
    for (const state of ["UNRESOLVED", "ABSENT"]) {
      const validation = validateSentrdelSastInputV1(
        input({
          provenance_state: state,
          producer_id: null,
          producer_version: null,
          collector_ref: null,
        }),
      );
      expect(validation.valid, state).toBe(false);
      expect(validation.reasons.join(" "), state).toContain(
        "requires resolvable provenance",
      );
      expect(
        normalizeSentrdelSastInputV1(
          input({
            provenance_state: state,
            producer_id: null,
            producer_version: null,
            collector_ref: null,
          }),
        ),
        state,
      ).toBeUndefined();
    }
    // PARTIAL provenance remains admissible: it is resolvable but incomplete.
    const partial = validateSentrdelSastInputV1(
      input({ provenance_state: "PARTIAL", collector_ref: null }),
    );
    expect(partial.valid).toBe(true);
  });

  it("19b. refuses a match from a capability that never executed", () => {
    // AVAILABLE means admitted but not yet run, so it cannot have matched.
    const available = validateSentrdelSastInputV1(
      input({ execution_state: "AVAILABLE" }),
    );
    expect(available.valid).toBe(false);
    expect(available.reasons.join(" ")).toContain("may not report one");
    expect(
      normalizeSentrdelSastInputV1(input({ execution_state: "AVAILABLE" })),
    ).toBeUndefined();
    // The same rule holds for every non-executed state.
    for (const state of [
      "AVAILABLE",
      "UNAVAILABLE",
      "NOT_QUALIFIED",
      "NOT_RUN",
      "INCOMPLETE",
      "TIMEOUT",
      "MALFORMED_OUTPUT",
      "ENGINE_ERROR",
      "VERSION_MISMATCH",
      "DENIED_BY_POLICY",
    ]) {
      const validation = validateSentrdelSastInputV1(
        input({ execution_state: state, coverage_loss_reasons: [] }),
      );
      expect(validation.valid, state).toBe(false);
      expect(validation.reasons.join(" "), state).toContain("may not report one");
    }
  });

  it("19c. catches a tampered record that reports a match without executing", () => {
    const observation = normalized();
    const tampered = {
      ...observation,
      execution_state: "AVAILABLE",
    } as unknown as SentrdelSastObservationV1;
    const check = assertSentrdelSastInvariantsV1(tampered);
    expect(check.ok).toBe(false);
    expect(check.reasons.join(" ")).toContain(
      "non-executing capability must never report a match",
    );
  });

  it("19d. never throws on a partial or malformed record", () => {
    for (const malformed of [null, undefined, {}, [], "text", 42, true]) {
      expect(() => checkSastUpstreamCompatibilityV1(malformed)).not.toThrow();
      expect(() => validateSentrdelSastInputV1(malformed)).not.toThrow();
      expect(() => normalizeSentrdelSastInputV1(malformed)).not.toThrow();
    }
    expect(() => normalizeSentrdelSastSetV1(undefined as never)).not.toThrow();
  });
});
