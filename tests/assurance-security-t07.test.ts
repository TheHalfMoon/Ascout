import { describe, expect, it } from "vitest";

import {
  assertSentrdelSecretInvariantsV1,
  assertSentrdelSecretPathContainmentV1,
  checkSecretUpstreamCompatibilityV1,
  classifySentrdelSecretShapeV1,
  normalizeSentrdelSecretInputV1,
  normalizeSentrdelSecretSetV1,
  SENTRDEL_SECRET_AUTHORITIES,
  SENTRDEL_SECRET_CAPABILITY_ID,
  SENTRDEL_SECRET_CLASSES,
  SENTRDEL_SECRET_CONFIDENCE_STATES,
  SENTRDEL_SECRET_ESCALATION_TOKENS,
  SENTRDEL_SECRET_FORBIDDEN_INPUT_KEYS,
  SENTRDEL_SECRET_KNOWN_LIMITATIONS,
  SENTRDEL_SECRET_LIMITATION_COUNT,
  SENTRDEL_SECRET_MATCH_STATES,
  SENTRDEL_SECRET_PATH_HARDENING_OBSERVATION,
  SENTRDEL_SECRET_PHASE_AUTHORITY,
  SENTRDEL_SECRET_REDACTION_STATES,
  SENTRDEL_SECRET_SCHEMA_VERSION,
  SENTRDEL_SECRET_SEVERITY_STATES,
  SENTRDEL_SECRET_VALIDATION_STATES,
  secretCredentialIsValidatedV1,
  secretImpliesGlobalCleanV1,
  secretLocationIsExecutableProofV1,
  secretMatchIsBreachV1,
  secretMatchIsConfirmedCredentialV1,
  secretMatchIsExploitableV1,
  secretNormalizationAccessesFilesystemV1,
  secretNormalizationContactsProviderV1,
  secretNormalizationExecutesRuntimeV1,
  secretNormalizationRequiresNetworkV1,
  secretNormalizationSpawnsProcessV1,
  secretNormalizationUsesClockV1,
  secretNormalizationUsesRandomnessV1,
  secretObservationIsClaimAssessmentV1,
  secretObservationIsFindingV1,
  secretProvenanceImpliesTrustV1,
  secretSeverityIsDerivedV1,
  secretShapeVocabularyIsAlignedV1,
  validateSentrdelSecretInputV1,
  zeroMatchesImpliesCleanV1,
  type SentrdelSecretInputV1,
  type SentrdelSecretObservationV1,
} from "../src/assurance/security/sentrdel-secret-normalization.js";
import {
  SENTRDEL_ENGINE_ID,
  SENTRDEL_ENGINE_VERSION,
} from "../src/assurance/security/sentrdel-engine-boundary.js";
import {
  SENTRDEL_PINNED_REVISION,
  SENTRDEL_PINNED_TREE,
  SENTRDEL_PIN_REF,
} from "../src/assurance/security/sentrdel-source-pin.js";
import {
  containsSecretMaterialV1,
  SENTRDEL_CLAIM_CLASSES_REQUIRING_PROVENANCE,
  SENTRDEL_EVIDENCE_SECRET_SHAPES,
  SENTRDEL_OBSERVATION_CLAIM_CLASSES,
} from "../src/assurance/security/sentrdel-evidence-normalization.js";
import { SENTRDEL_COVERAGE_LOSS_REASONS } from "../src/assurance/security/sentrdel-coverage-mapping.js";
import { SENTRDEL_CAPABILITY_IDS } from "../src/assurance/security/sentrdel-capability-characterization.js";

const HEAD_A = "1".repeat(40);
const HEAD_B = "2".repeat(40);
const REDACTED_DIGEST_A = "a".repeat(64);
const EVIDENCE_DIGEST_A = "b".repeat(64);

/**
 * SYNTHETIC, NON-LIVE secret fixtures.
 *
 * Every value below is constructed specifically to trip the pinned detector
 * shapes while being unmistakably fake. The prefix `SYNTHETIC_NOT_A_REAL_`
 * inside each body guarantees no usable credential exists: these are not valid
 * tokens for any provider, they were not issued, and they grant nothing. They
 * exist only inside this test process and are never written to a fixture file.
 */
const SYNTHETIC_GHP =
  "ghp_SYNTHETICNOTAREAL0000000000000000000000000a";
const SYNTHETIC_AKIA = "AKIASYNTHETICNOTAREAL0";
const SYNTHETIC_BEARER = "Bearer SYNTHETICNOTAREALtokenvalue0";
const SYNTHETIC_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----";

const ALL_SYNTHETIC_VALUES = [
  SYNTHETIC_GHP,
  SYNTHETIC_AKIA,
  SYNTHETIC_BEARER,
  SYNTHETIC_PRIVATE_KEY,
];

function input(
  overrides: Partial<SentrdelSecretInputV1> = {},
): SentrdelSecretInputV1 {
  return {
    schema_version: 1,
    request_id: "request:t07-acceptance-001",
    attempt_id: "attempt:t07-001",
    source_head: HEAD_A,
    engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE,
    engine_version: SENTRDEL_ENGINE_VERSION,
    capability_id: SENTRDEL_SECRET_CAPABILITY_ID,
    claim_class: "SECRET_SHAPE_OBSERVATION",
    execution_state: "EXECUTED",
    match_state: "SECRET_SHAPE_OBSERVED",
    validation_state: "NOT_VALIDATED",
    confidence_state: "DETECTOR_PATTERN_MATCH_ONLY",
    redaction_state: "REDACTED_BEFORE_PERSISTENCE",
    rule_id: "rule:t07-secret-shape",
    rule_set_ref: "ruleset:sentrdel-v1",
    secret_class: "GITHUB_PERSONAL_ACCESS_TOKEN",
    matched_length: 40,
    redacted_digest: REDACTED_DIGEST_A,
    location_path: "config/settings.ts",
    location_start_line: 4,
    location_end_line: 4,
    provenance_state: "COMPLETE",
    producer_id: "producer:sentrdel-review",
    producer_version: SENTRDEL_ENGINE_VERSION,
    collector_ref: "collector:t07-001",
    coverage_state: "PARTIAL",
    aggregate_coverage_state: "PARTIALLY_COVERED",
    unknown_states: ["TIMEOUT"],
    coverage_loss_reasons: ["UNSCANNED_PATH"],
    evidence_ref: "evidence:sentrdel-secret-001",
    evidence_digest: EVIDENCE_DIGEST_A,
    limitations: ["T07 bounded changed-byte secret shape matching only"],
    effect_facts: "E0_READ_ONLY_ANALYSIS",
    network_facts: "NO_NETWORK",
    egress_facts: "NO_EGRESS",
    ...overrides,
  } as SentrdelSecretInputV1;
}

function normalized(
  overrides: Partial<SentrdelSecretInputV1> = {},
): SentrdelSecretObservationV1 {
  const observation = normalizeSentrdelSecretInputV1(input(overrides));
  expect(observation).toBeDefined();
  return observation!;
}

describe("UA-P06-T07 Sentrdel secret normalization", () => {
  it("versions the schema and binds the phase authority", () => {
    expect(SENTRDEL_SECRET_SCHEMA_VERSION).toBe(1);
    expect(SENTRDEL_SECRET_PHASE_AUTHORITY).toBe("UA-P06-T07");
    expect(SENTRDEL_SECRET_AUTHORITIES).toEqual([
      "SECRET_SHAPE_OBSERVATION_ONLY",
    ]);
    const observation = normalized();
    expect(observation.schema_version).toBe(1);
    expect(observation.phase_authority).toBe("UA-P06-T07");
    expect(observation.authority).toBe("SECRET_SHAPE_OBSERVATION_ONLY");
    expect(
      validateSentrdelSecretInputV1(input({ schema_version: 2 as never })).valid,
    ).toBe(false);
  });

  it("reuses canonical vocabularies rather than forking them", () => {
    // The capability is the canonical T02 identity, not a T07 invention.
    expect(SENTRDEL_CAPABILITY_IDS).toContain(SENTRDEL_SECRET_CAPABILITY_ID);
    // The claim class is the canonical T04 identity, not a T07 invention.
    expect(SENTRDEL_OBSERVATION_CLAIM_CLASSES).toContain(
      "SECRET_SHAPE_OBSERVATION",
    );
    // A secret observation is gated by the canonical T04 provenance rule.
    expect(SENTRDEL_CLAIM_CLASSES_REQUIRING_PROVENANCE).toContain(
      "SECRET_SHAPE_OBSERVATION",
    );
    // The secret shape set is the canonical T04 set, in its frozen order.
    expect(SENTRDEL_EVIDENCE_SECRET_SHAPES.length).toBe(4);
    expect(secretShapeVocabularyIsAlignedV1()).toBe(true);
    // The coverage loss vocabulary is the canonical T05 vocabulary.
    expect(SENTRDEL_COVERAGE_LOSS_REASONS).toContain("UNSCANNED_PATH");
    expect(SENTRDEL_SECRET_KNOWN_LIMITATIONS.length).toBe(
      SENTRDEL_SECRET_LIMITATION_COUNT,
    );
  });

  it("1. accepts only the secrets capability", () => {
    expect(normalized().capability_id).toBe("secrets-changed");
    for (const other of SENTRDEL_CAPABILITY_IDS) {
      if (other === SENTRDEL_SECRET_CAPABILITY_ID) continue;
      const result = validateSentrdelSecretInputV1(
        input({ capability_id: other }),
      );
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain(
        "T07 normalizes secrets-changed only",
      );
    }
    const unknown = validateSentrdelSecretInputV1(
      input({ capability_id: "capability:invented" }),
    );
    expect(unknown.valid).toBe(false);
    expect(unknown.reasons.join(" ")).toContain("unknown capability identity");
  });

  it("rejects a non-secret claim class", () => {
    for (const claimClass of [
      "STRUCTURAL_OBSERVATION",
      "CONFIG_OBSERVATION",
      "DEPENDENCY_OBSERVATION",
    ]) {
      const result = validateSentrdelSecretInputV1(input({ claim_class: claimClass }));
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain(
        "T07 accepts SECRET_SHAPE_OBSERVATION only",
      );
    }
  });

  it("2. a synthetic secret shape produces a bounded observation", () => {
    // The synthetic fixture genuinely trips the pinned detector shape.
    expect(containsSecretMaterialV1(SYNTHETIC_GHP)).toBe(true);
    const classification = classifySentrdelSecretShapeV1(SYNTHETIC_GHP);
    expect(classification.matched).toBe(true);
    expect(classification.secret_class).toBe("GITHUB_PERSONAL_ACCESS_TOKEN");
    expect(classification.matched_length).toBe(SYNTHETIC_GHP.length);

    const observation = normalized();
    expect(observation.match_state).toBe("SECRET_SHAPE_OBSERVED");
    expect(observation.confidence_state).toBe("DETECTOR_PATTERN_MATCH_ONLY");
    // Classification yields metadata only, never the value.
    expect(Object.values(classification)).not.toContain(SYNTHETIC_GHP);
  });

  it("3 and 4. no raw secret plaintext appears in normalized or serialized output", () => {
    const observation = normalized({ matched_length: SYNTHETIC_GHP.length });
    const serialized = JSON.stringify(observation);
    for (const synthetic of ALL_SYNTHETIC_VALUES) {
      expect(serialized).not.toContain(synthetic);
    }
    // The distinctive synthetic bodies are absent too, not just the prefixes.
    expect(serialized).not.toContain("SYNTHETICNOTAREAL");
    expect(serialized).not.toContain("SYNTHETIC_GHP");
    expect(observation.redacted_evidence.plaintext_persisted).toBe(false);
    expect(observation.evidence_content_persisted).toBe(false);
  });

  it("rejects a caller that smuggles a secret value in through any field", () => {
    for (const field of [
      "secret_value",
      "token",
      "password",
      "private_key",
      "raw_secret",
      "plaintext",
      "credential",
    ]) {
      const smuggled = { ...input(), [field]: SYNTHETIC_GHP } as Record<
        string,
        unknown
      >;
      const result = validateSentrdelSecretInputV1(smuggled);
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain(`must never carry ${field}`);
    }
    // The forbidden set is exhaustive over the obvious smuggling routes.
    expect(SENTRDEL_SECRET_FORBIDDEN_INPUT_KEYS).toContain("secret_value");
    expect(SENTRDEL_SECRET_FORBIDDEN_INPUT_KEYS).toContain("severity");
    expect(SENTRDEL_SECRET_FORBIDDEN_INPUT_KEYS).toContain("trust");
  });

  it("rejects a secret shape appearing in an otherwise valid persisted string", () => {
    const result = validateSentrdelSecretInputV1(
      input({ limitations: [`leaked ${SYNTHETIC_GHP} into the tree`] }),
    );
    expect(result.valid).toBe(false);
    expect(result.reasons.join(" ")).toContain("must not carry secret material");
  });


  it("5. preserves the rule identity exactly", () => {
    const observation = normalized();
    expect(observation.rule.rule_id).toBe("rule:t07-secret-shape");
    expect(observation.rule.rule_set_ref).toBe("ruleset:sentrdel-v1");
    expect(observation.rule.rule_resolution).toBe("PRESENT");
    expect(observation.rule.rule_is_pinned).toBe(true);
    const missing = validateSentrdelSecretInputV1(input({ rule_id: null }));
    expect(missing.valid).toBe(false);
    expect(missing.reasons.join(" ")).toContain(
      "requires a pinned rule identity",
    );
    const malformed = validateSentrdelSecretInputV1(
      input({ rule_id: "rule:has spaces" }),
    );
    expect(malformed.valid).toBe(false);
  });

  it("6. preserves the location conservatively", () => {
    const observation = normalized();
    expect(observation.location.path).toBe("config/settings.ts");
    expect(observation.location.start_line).toBe(4);
    expect(observation.location.end_line).toBe(4);
    expect(observation.location.resolution).toBe("PRESENT");
    // A path with no end line stays PARTIAL; it is never widened upward.
    const partial = normalized({ location_end_line: null });
    expect(partial.location.resolution).toBe("PARTIAL");
    expect(partial.location.end_line).toBeNull();
    // A missing path stays ABSENT; a match may not claim it.
    const absent = validateSentrdelSecretInputV1(input({ location_path: null }));
    expect(absent.valid).toBe(false);
    // Line inversion is refused rather than silently swapped.
    const inverted = validateSentrdelSecretInputV1(
      input({ location_start_line: 20, location_end_line: 5 }),
    );
    expect(inverted.valid).toBe(false);
    expect(inverted.reasons.join(" ")).toContain("must not precede start_line");
    // A path containing characters outside the canonical SOURCE_PATH grammar is
    // refused outright. A traversal-shaped path is NOT refused here: canonical
    // T04/T06 semantics accept it as an inert label, and T07 preserves that
    // behaviour exactly. Rejection happens at the effect boundary instead.
    const malformed = validateSentrdelSecretInputV1(
      input({ location_path: "config/setting file.ts" }),
    );
    expect(malformed.valid).toBe(false);
    expect(malformed.reasons.join(" ")).toContain(
      "location path must be null or a bounded repository-relative path",
    );
    const absolute = validateSentrdelSecretInputV1(
      input({ location_path: "/etc/passwd" }),
    );
    expect(absolute.valid).toBe(false);
  });

  it("7. preserves provenance exactly and refuses unresolved attribution", () => {
    const observation = normalized();
    expect(observation.provenance.state).toBe("COMPLETE");
    expect(observation.provenance.producer_id).toBe("producer:sentrdel-review");
    expect(observation.provenance.producer_version).toBe(SENTRDEL_ENGINE_VERSION);
    expect(observation.provenance.collector_ref).toBe("collector:t07-001");
    expect(observation.provenance.rule_set_ref).toBe("ruleset:sentrdel-v1");

    // COMPLETE provenance must actually carry every field.
    const incomplete = validateSentrdelSecretInputV1(
      input({ provenance_state: "COMPLETE", producer_id: null }),
    );
    expect(incomplete.valid).toBe(false);
    expect(incomplete.reasons.join(" ")).toContain(
      "producer_id is required when state is COMPLETE",
    );
    // A secret observation is unattributable without resolvable provenance.
    for (const state of ["ABSENT", "UNRESOLVED"] as const) {
      const result = validateSentrdelSecretInputV1(
        input({ provenance_state: state }),
      );
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain(
        "requires resolvable provenance",
      );
    }
  });

  it("8. rejects a match reported by a non-EXECUTED capability", () => {
    for (const state of [
      "AVAILABLE",
      "UNAVAILABLE",
      "NOT_QUALIFIED",
      "VERSION_MISMATCH",
      "DENIED_BY_POLICY",
      "NOT_RUN",
      "INCOMPLETE",
      "TIMEOUT",
      "MALFORMED_OUTPUT",
      "ENGINE_ERROR",
    ]) {
      const result = validateSentrdelSecretInputV1(
        input({ execution_state: state }),
      );
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain("produced no match");
    }
    // A non-producing state paired with UNKNOWN match state is admissible.
    const honest = validateSentrdelSecretInputV1(
      input({
        execution_state: "TIMEOUT",
        match_state: "UNKNOWN",
        coverage_loss_reasons: ["TIMEOUT"],
      }),
    );
    expect(honest.valid).toBe(true);
  });


  it("9. rejects a wrong engine pin", () => {
    const result = validateSentrdelSecretInputV1(
      input({ engine_pin: "0".repeat(40) }),
    );
    expect(result.valid).toBe(false);
    expect(result.reasons.join(" ")).toContain("engine pin must equal");
    const observation = normalized();
    expect(observation.engine_pin).toBe(SENTRDEL_PINNED_REVISION);
    expect(observation.engine_tree).toBe(SENTRDEL_PINNED_TREE);
    expect(observation.engine_pin_ref).toBe(SENTRDEL_PIN_REF);
  });

  it("10. rejects a wrong source binding", () => {
    const badTree = validateSentrdelSecretInputV1(
      input({ engine_tree: "0".repeat(40) }),
    );
    expect(badTree.valid).toBe(false);
    expect(badTree.reasons.join(" ")).toContain("engine tree must equal");
    const badHead = validateSentrdelSecretInputV1(
      input({ source_head: "NOT-A-SHA" }),
    );
    expect(badHead.valid).toBe(false);
    const badEngine = validateSentrdelSecretInputV1(
      input({ engine_id: "engine:other" }),
    );
    expect(badEngine.valid).toBe(false);
    // A different but well-formed head is accepted and bound, not normalized away.
    const rebound = normalized({ source_head: HEAD_B });
    expect(rebound.source_head).toBe(HEAD_B);
    expect(rebound.secret_observation_id).not.toBe(
      normalized().secret_observation_id,
    );
  });

  it("11. rejects a duplicate observation identity", () => {
    const set = normalizeSentrdelSecretSetV1([input(), input()]);
    expect(set.ok).toBe(false);
    expect(set.observations).toHaveLength(0);
    expect(set.reasons.join(" ")).toContain("duplicate observation identity");
    // Two genuinely different regions are not duplicates.
    const distinct = normalizeSentrdelSecretSetV1([
      input(),
      input({ location_start_line: 99, location_end_line: 99 }),
    ]);
    expect(distinct.ok).toBe(true);
    expect(distinct.observations).toHaveLength(2);
  });

  it("12. rejects unsupported self-attestation", () => {
    for (const token of ["CLEAN", "PASS", "SECURE", "VERIFIED", "REMEDIATED"]) {
      const result = validateSentrdelSecretInputV1(
        input({ limitations: [`scan reported ${token} for this rule`] }),
      );
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain("must never self-attest");
    }
  });

  it("13. makes no credential validity claim, at any layer", () => {
    expect(secretMatchIsConfirmedCredentialV1()).toBe(false);
    expect(secretCredentialIsValidatedV1()).toBe(false);
    expect(SENTRDEL_SECRET_VALIDATION_STATES).toEqual(["NOT_VALIDATED"]);
    const observation = normalized();
    expect(observation.validation_state).toBe("NOT_VALIDATED");
    expect(observation.credential_validated).toBe(false);
    // The vocabulary is a single negated state: it can express "not validated"
    // and nothing else. No member asserts a positive verdict.
    for (const state of SENTRDEL_SECRET_VALIDATION_STATES) {
      expect(state).toMatch(/^NOT_/u);
      expect(state).not.toMatch(/^(?!(?:NOT_))/u);
      expect(state).not.toMatch(/^(?:LIVE|ACTIVE|REVOKED|EXPIRED|CONFIRMED)/u);
      // A positive validity verdict is unreachable: every such state is refused.
      expect(
        validateSentrdelSecretInputV1(input({ validation_state: state })).valid,
      ).toBe(true);
    }
    // A caller asserting validation is rejected at the gate.
    const result = validateSentrdelSecretInputV1(
      input({ validation_state: "CREDENTIAL_VALID" }),
    );
    expect(result.valid).toBe(false);
    expect(result.reasons.join(" ")).toContain("validation state is unknown");
  });

  it("14. makes no exploitability claim, at any layer", () => {
    expect(secretMatchIsExploitableV1()).toBe(false);
    expect(secretMatchIsBreachV1()).toBe(false);
    const observation = normalized();
    expect(observation.secret_match_is_exploitable).toBe(false);
    expect(observation.secret_match_is_breach).toBe(false);
    // The match-state vocabulary has no exploitability or breach member.
    for (const state of SENTRDEL_SECRET_MATCH_STATES) {
      expect(state).not.toMatch(
        /EXPLOIT|BREACH|COMPROMIS|VALID|ACTIVE|LEAK/iu,
      );
    }
    // An escalation phrase in any persisted string is a hard rejection.
    for (const token of SENTRDEL_SECRET_ESCALATION_TOKENS) {
      const result = validateSentrdelSecretInputV1(
        input({ limitations: [`observed value is ${token}`] }),
      );
      expect(result.valid).toBe(false);
    }
  });

  it("15. derives no severity unless canonically authorized", () => {
    expect(secretSeverityIsDerivedV1()).toBe(false);
    expect(SENTRDEL_SECRET_SEVERITY_STATES).toEqual(["NEVER_DERIVED"]);
    const observation = normalized();
    expect(observation.severity_state).toBe("NEVER_DERIVED");
    expect(observation.severity_value).toBeNull();
    // A caller-supplied severity field is refused outright.
    for (const field of ["severity", "severity_value"]) {
      const result = validateSentrdelSecretInputV1({
        ...input(),
        [field]: "CRITICAL",
      });
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain(`must never carry ${field}`);
    }
  });


  it("16. a zero-match scan over partial coverage is never a clean claim", () => {
    expect(zeroMatchesImpliesCleanV1()).toBe(false);
    expect(secretImpliesGlobalCleanV1()).toBe(false);
    // A partial-coverage, zero-match scan is admissible as an observation.
    const quiet = normalizeSentrdelSecretInputV1(
      input({
        match_state: "NO_SHAPE_OBSERVED_IN_STATED_SCOPE",
        coverage_state: "PARTIAL",
        aggregate_coverage_state: "PARTIALLY_COVERED",
        secret_class: null,
        matched_length: null,
      }),
    );
    expect(quiet).toBeDefined();
    expect(quiet!.match_state).toBe("NO_SHAPE_OBSERVED_IN_STATED_SCOPE");
    // The record still refuses every clean-shaped claim, at type and value level.
    expect(quiet!.repository_clean_claimed).toBe(false);
    expect(quiet!.global_clean_claimed).toBe(false);
    expect(quiet!.coverage.zero_match_implies_clean).toBe(false);
    expect(quiet!.coverage.is_total).toBe(false);
    // An empty observation set carries the same refusal.
    const empty = normalizeSentrdelSecretSetV1([]);
    expect(empty.ok).toBe(true);
    expect(empty.observations).toHaveLength(0);
    expect(empty.matches_observed).toBe(0);
    expect(empty.zero_matches_implies_clean).toBe(false);
    expect(empty.repository_clean_claimed).toBe(false);
    // A caller asserting a clean repository is rejected.
    const result = validateSentrdelSecretInputV1({
      ...input(),
      repository_clean: true,
    });
    expect(result.valid).toBe(false);
    expect(result.reasons.join(" ")).toContain("must never carry repository_clean");
  });

  it("refuses a match outside covered scope and contradictory coverage", () => {
    const unscanned = validateSentrdelSecretInputV1(
      input({ coverage_state: "UNSCANNED" }),
    );
    expect(unscanned.valid).toBe(false);
    expect(unscanned.reasons.join(" ")).toContain(
      "contradicts unscanned coverage",
    );
    const notCovered = validateSentrdelSecretInputV1(
      input({ aggregate_coverage_state: "NOT_COVERED" }),
    );
    expect(notCovered.valid).toBe(false);
    expect(notCovered.reasons.join(" ")).toContain("contradicts not-covered");
    // A not-observed shape on unscanned coverage is equally contradictory.
    const quietUnscanned = validateSentrdelSecretInputV1(
      input({
        match_state: "NO_SHAPE_OBSERVED_IN_STATED_SCOPE",
        coverage_state: "UNSCANNED",
      }),
    );
    expect(quietUnscanned.valid).toBe(false);
    // Bounded-complete coverage may not carry unknown or loss data.
    const contradictory = validateSentrdelSecretInputV1(
      input({ coverage_state: "COMPLETE_WITHIN_STATED_SCOPE" }),
    );
    expect(contradictory.valid).toBe(false);
    expect(contradictory.reasons.join(" ")).toContain("bounded-complete coverage");
    // A non-canonical loss reason is refused.
    const inventedLoss = validateSentrdelSecretInputV1(
      input({ coverage_loss_reasons: ["MADE_UP_REASON"] }),
    );
    expect(inventedLoss.valid).toBe(false);
    expect(inventedLoss.reasons.join(" ")).toContain("is not canonical");
  });

  it("17. keeps UNKNOWN explicit", () => {
    // UNKNOWN coverage must name at least one unknown state.
    const bare = validateSentrdelSecretInputV1(
      input({ coverage_state: "UNKNOWN", unknown_states: [] }),
    );
    expect(bare.valid).toBe(false);
    expect(bare.reasons.join(" ")).toContain(
      "UNKNOWN coverage requires at least one unknown state",
    );
    const explicit = normalized({ coverage_state: "UNKNOWN" });
    expect(explicit.coverage.observation_state).toBe("UNKNOWN");
    expect(explicit.coverage.unknown_states).toEqual(["TIMEOUT"]);
    expect(explicit.coverage.unknown_is_pass).toBe(false);
    // The set of unknown states survives canonical ordering.
    const ordered = normalized({
      unknown_states: ["VERSION_MISMATCH", "TIMEOUT"],
    });
    expect(ordered.coverage.unknown_states).toEqual([
      "TIMEOUT",
      "VERSION_MISMATCH",
    ]);
    // Duplicates are refused rather than silently collapsing a real distinction.
    const duplicated = validateSentrdelSecretInputV1(
      input({ unknown_states: ["TIMEOUT", "TIMEOUT"] }),
    );
    expect(duplicated.valid).toBe(false);
    expect(duplicated.reasons.join(" ")).toContain("must not contain duplicates");
  });


  it("18. produces deterministic ordering and identity", () => {
    const first = normalizeSentrdelSecretSetV1([
      input(),
      input({ location_start_line: 99, location_end_line: 99 }),
    ]);
    const second = normalizeSentrdelSecretSetV1([
      input({ location_start_line: 99, location_end_line: 99 }),
      input(),
    ]);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(first.observations.map((o) => o.secret_observation_id)).toEqual(
      second.observations.map((o) => o.secret_observation_id),
    );
    // The same input always yields byte-identical output.
    expect(JSON.stringify(normalized())).toBe(JSON.stringify(normalized()));
    // Ordering is by derived identity, independent of insertion order.
    const ids = first.observations.map((o) => o.secret_observation_id);
    expect(ids).toEqual([...ids].sort());
  });

  it("19. produces deeply immutable output", () => {
    const observation = normalized();
    expect(Object.isFrozen(observation)).toBe(true);
    expect(Object.isFrozen(observation.rule)).toBe(true);
    expect(Object.isFrozen(observation.location)).toBe(true);
    expect(Object.isFrozen(observation.redacted_evidence)).toBe(true);
    expect(Object.isFrozen(observation.provenance)).toBe(true);
    expect(Object.isFrozen(observation.coverage)).toBe(true);
    expect(Object.isFrozen(observation.coverage.unknown_states)).toBe(true);
    expect(Object.isFrozen(observation.coverage.coverage_loss_reasons)).toBe(true);
    expect(Object.isFrozen(observation.limitations)).toBe(true);
    expect(() => {
      (observation as unknown as Record<string, unknown>)["match_state"] =
        "TAMPERED";
    }).toThrow();
    // A tampered copy is caught by the defensive invariant gate.
    const tampered = {
      ...observation,
      credential_validated: true,
    } as unknown as SentrdelSecretObservationV1;
    const check = assertSentrdelSecretInvariantsV1(tampered);
    expect(check.ok).toBe(false);
    expect(check.reasons.join(" ")).toContain("must never validate a credential");
  });

  it("20. has no filesystem, network, or process side effects", () => {
    expect(secretNormalizationExecutesRuntimeV1()).toBe(false);
    expect(secretNormalizationRequiresNetworkV1()).toBe(false);
    expect(secretNormalizationContactsProviderV1()).toBe(false);
    expect(secretNormalizationAccessesFilesystemV1()).toBe(false);
    expect(secretNormalizationSpawnsProcessV1()).toBe(false);
    expect(secretNormalizationUsesClockV1()).toBe(false);
    expect(secretNormalizationUsesRandomnessV1()).toBe(false);
    const observation = normalized();
    expect(observation.effect_facts).toBe("E0_READ_ONLY_ANALYSIS");
    expect(observation.network_facts).toBe("NO_NETWORK");
    expect(observation.egress_facts).toBe("NO_EGRESS");
    expect(observation.provider_contacted).toBe(false);
    expect(observation.network_validation_performed).toBe(false);
    // The path label is inert: it is recorded, never opened.
    expect(observation.location.label_is_inert).toBe(true);
    // A non-read-only or networked effect claim is refused.
    for (const override of [
      { effect_facts: "E2_WRITE" },
      { network_facts: "NETWORK_ALLOWED" },
      { egress_facts: "EGRESS_ALLOWED" },
    ]) {
      const result = validateSentrdelSecretInputV1(input(override as never));
      expect(result.valid).toBe(false);
    }
  });

  it("records a valid observation as fully conformant", () => {
    expect(assertSentrdelSecretInvariantsV1(normalized())).toEqual({
      ok: true,
      reasons: [],
    });
  });
});


describe("UA-P06-T07 adversarial probes", () => {
  it("probe: the redaction boundary cannot be bypassed by state coercion", () => {
    // Every non-canonical redaction state is refused, including a plausible
    // attempt to claim a record is "redacted" with an unrecognized token.
    for (const state of ["PLAINTEXT", "NOT_REDACTED", "REDACTED", "UNKNOWN", ""]) {
      const result = validateSentrdelSecretInputV1(
        input({ redaction_state: state }),
      );
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain("redaction state is unknown");
    }
    // The only admissible state is the one frozen constant.
    expect(SENTRDEL_SECRET_REDACTION_STATES).toEqual([
      "REDACTED_BEFORE_PERSISTENCE",
    ]);
    const observation = normalized();
    expect(observation.redacted_evidence.redaction_state).toBe(
      "REDACTED_BEFORE_PERSISTENCE",
    );
  });

  it("probe: an invalid digest is rejected, not silently accepted", () => {
    for (const digest of [
      "not-hex",
      "A".repeat(64),
      "a".repeat(63),
      "a".repeat(65),
      "",
      "g".repeat(64),
    ]) {
      const result = validateSentrdelSecretInputV1(
        input({ redacted_digest: digest }),
      );
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain("redacted_digest must be");
    }
    // An evidence digest identical to the redacted digest would mean the same
    // token is doing two jobs; that is refused.
    const collision = validateSentrdelSecretInputV1(
      input({
        redacted_digest: REDACTED_DIGEST_A,
        evidence_digest: REDACTED_DIGEST_A,
      }),
    );
    expect(collision.valid).toBe(false);
    expect(collision.reasons.join(" ")).toContain("must not be the same token");
  });

  it("probe: a digest can never be laundered into a validity claim", () => {
    const observation = normalized();
    expect(observation.redacted_evidence.digest_is_one_way_metadata).toBe(true);
    expect(
      observation.redacted_evidence.digest_implies_credential_validity,
    ).toBe(false);
    expect(observation.redacted_evidence.digest_covers_secret_value).toBe(false);
    // Tampering with any of those in a copy is caught by the invariant gate.
    for (const override of [
      { digest_implies_credential_validity: true },
      { digest_covers_secret_value: true },
      { digest_is_one_way_metadata: false },
      { plaintext_persisted: true },
      { redaction_state: "PLAINTEXT" },
    ]) {
      const tampered = {
        ...observation,
        redacted_evidence: { ...observation.redacted_evidence, ...override },
      } as unknown as SentrdelSecretObservationV1;
      expect(assertSentrdelSecretInvariantsV1(tampered).ok).toBe(false);
    }
  });

  it("probe: secret-shape filtering cannot be widened by an untraced class", () => {
    // An invented class is refused.
    const invented = validateSentrdelSecretInputV1(
      input({ secret_class: "ROOT_CREDENTIAL" }),
    );
    expect(invented.valid).toBe(false);
    expect(invented.reasons.join(" ")).toContain(
      "outside the canonical vocabulary",
    );
    // The derived terminal class may not be supplied as if source-traced.
    const derived = validateSentrdelSecretInputV1(
      input({ secret_class: "UNCLASSIFIED_SECRET_SHAPE" }),
    );
    expect(derived.valid).toBe(false);
    // A class of null stays explicitly absent rather than being invented.
    const untraced = normalized({ secret_class: null });
    expect(untraced.redacted_evidence.secret_class).toBeNull();
    expect(untraced.redacted_evidence.secret_class_resolution).toBe("ABSENT");
    expect(untraced.redacted_evidence.secret_class_is_source_traced).toBe(false);
  });


  it("probe: matched-length metadata cannot become a side channel", () => {
    // A length is bounded metadata, and an absurd length is refused.
    expect(
      validateSentrdelSecretInputV1(input({ matched_length: 9_999_999_999 }))
        .valid,
    ).toBe(false);
    expect(
      validateSentrdelSecretInputV1(input({ matched_length: -5 })).valid,
    ).toBe(false);
    expect(
      validateSentrdelSecretInputV1(input({ matched_length: 1.5 })).valid,
    ).toBe(false);
    // The length survives as a number, never as the value itself.
    const observation = normalized({ matched_length: 40 });
    expect(observation.redacted_evidence.matched_length).toBe(40);
    expect(typeof observation.redacted_evidence.matched_length).toBe("number");
  });

  it("probe: the provenance gate cannot be circumvented via a weaker state", () => {
    // PARTIAL provenance is admissible; ABSENT and UNRESOLVED are not.
    expect(
      validateSentrdelSecretInputV1(input({ provenance_state: "PARTIAL" }))
        .valid,
    ).toBe(true);
    for (const state of ["ABSENT", "UNRESOLVED"] as const) {
      const result = validateSentrdelSecretInputV1(
        input({ provenance_state: state }),
      );
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain("requires resolvable provenance");
    }
    // A non-object upstream record is reported, not dereferenced into a throw.
    expect(checkSecretUpstreamCompatibilityV1(null)).toEqual([
      "upstream observation must be an object",
    ]);
    expect(() => checkSecretUpstreamCompatibilityV1({})).not.toThrow();
    expect(checkSecretUpstreamCompatibilityV1({}).length).toBeGreaterThan(0);
  });

  it("probe: the upstream T04 compatibility gate refuses an incompatible record", () => {
    const base = {
      schema_version: 1,
      phase_authority: "UA-P06-T04",
      authority: "OBSERVATION_ONLY",
      claim_class: "SECRET_SHAPE_OBSERVATION",
      capability_id: SENTRDEL_SECRET_CAPABILITY_ID,
      engine_pin: SENTRDEL_PINNED_REVISION,
      rule_id: "rule:t07-secret-shape",
      provenance: {
        state: "COMPLETE",
        producer_id: "producer:sentrdel-review",
        producer_version: SENTRDEL_ENGINE_VERSION,
        collector_ref: "collector:t07-001",
        rule_set_ref: "ruleset:sentrdel-v1",
      },
    };
    // A SAST upstream is refused: T07 admits no structural observation.
    expect(
      checkSecretUpstreamCompatibilityV1({
        ...base,
        claim_class: "STRUCTURAL_OBSERVATION",
      }).join(" "),
    ).toContain("T07 accepts a SECRET_SHAPE_OBSERVATION upstream only");
    // A wrong pin is refused.
    expect(
      checkSecretUpstreamCompatibilityV1({
        ...base,
        engine_pin: "0".repeat(40),
      }).join(" "),
    ).toContain("must bind the exact Sentrdel pin");
    // A wrong phase authority is refused.
    expect(
      checkSecretUpstreamCompatibilityV1({
        ...base,
        phase_authority: "UA-P06-T06",
      }).join(" "),
    ).toContain("must come from the T04 boundary");
    // A missing rule identity is refused.
    expect(
      checkSecretUpstreamCompatibilityV1({ ...base, rule_id: null }).join(" "),
    ).toContain("requires a pinned rule identity");
    // A missing provenance object is reported rather than dereferenced.
    expect(
      checkSecretUpstreamCompatibilityV1({
        ...base,
        provenance: null,
      }).join(" "),
    ).toContain("must carry a provenance object");
    // A partially-shaped upstream record is REPORTED, never crashed on. The
    // canonical T04 gate dereferences nested members unguarded, so T07 verifies
    // the shape first: a gate that throws on hostile input is fail-open.
    for (const partial of [
      { ...base, coverage: undefined },
      { ...base, raw_evidence: undefined },
      { ...base, limitations: undefined },
      { ...base, unsupported_scope: undefined },
      { coverage: undefined },
    ]) {
      const reasons = checkSecretUpstreamCompatibilityV1(partial);
      expect(Array.isArray(reasons)).toBe(true);
      expect(reasons.length).toBeGreaterThan(0);
    }
    // A fully shaped upstream record reaches the T04 gate without throwing.
    const complete = {
      ...base,
      engine_tree: SENTRDEL_PINNED_TREE,
      engine_pin_ref: SENTRDEL_PIN_REF,
      assurance_effect: "NONE",
      finding_emitted: false,
      claim_assessment_emitted: false,
      global_clean_claimed: false,
      remediation_verified: false,
      coverage: {
        state: "PARTIAL",
        is_total: false,
        unscanned_is_clean: false,
        unknown_states: ["TIMEOUT"],
      },
      raw_evidence: { content_persisted: false },
      limitations: ["bounded changed-byte scope"],
      unsupported_scope: ["historical scans remain unproven"],
    };
    expect(() => checkSecretUpstreamCompatibilityV1(complete)).not.toThrow();
  });

  it("probe: the execution-state gate cannot be bypassed by an invented state", () => {
    for (const state of ["EXECUTED_SUCCESSFULLY", "ran", "DONE", "COMPLETE", ""]) {
      const result = validateSentrdelSecretInputV1(
        input({ execution_state: state }),
      );
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain("execution state is unknown");
    }
    // A non-producing state must declare its own canonical loss reason.
    const missingLoss = validateSentrdelSecretInputV1(
      input({
        execution_state: "TIMEOUT",
        match_state: "UNKNOWN",
        coverage_loss_reasons: ["UNSCANNED_PATH"],
      }),
    );
    expect(missingLoss.valid).toBe(false);
    expect(missingLoss.reasons.join(" ")).toContain(
      "must declare coverage loss TIMEOUT",
    );
  });


  it("probe: the coverage gate cannot be bypassed by promoting aggregate scope", () => {
    for (const aggregate of [
      "COVERED_WITHIN_STATED_SCOPE",
      "PARTIALLY_COVERED",
    ] as const) {
      expect(
        validateSentrdelSecretInputV1(
          input({ aggregate_coverage_state: aggregate }),
        ).valid,
      ).toBe(true);
    }
    // NOT_COVERED can never host a match.
    expect(
      validateSentrdelSecretInputV1(
        input({ aggregate_coverage_state: "NOT_COVERED" }),
      ).valid,
    ).toBe(false);
    // An invented aggregate state is refused.
    expect(
      validateSentrdelSecretInputV1(
        input({ aggregate_coverage_state: "FULLY_COVERED" }),
      ).valid,
    ).toBe(false);
  });

  it("probe: duplicate handling cannot be evaded by reordering", () => {
    const duplicate = input();
    for (const ordering of [
      [duplicate, duplicate],
      [duplicate, duplicate, duplicate],
    ]) {
      const set = normalizeSentrdelSecretSetV1(ordering);
      expect(set.ok).toBe(false);
      expect(set.observations).toHaveLength(0);
      expect(set.reasons.join(" ")).toContain("duplicate observation identity");
    }
    // A set that is not an array fails closed.
    expect(normalizeSentrdelSecretSetV1(null as never).ok).toBe(false);
    // An oversized set fails closed rather than truncating silently.
    const oversized = normalizeSentrdelSecretSetV1(
      Array.from({ length: 513 }, () => input()),
    );
    expect(oversized.ok).toBe(false);
    expect(oversized.reasons.join(" ")).toContain("at most 512 entries");
  });

  it("probe: a single malformed member fails the whole set closed", () => {
    const set = normalizeSentrdelSecretSetV1([
      input(),
      input({ engine_pin: "0".repeat(40) }),
    ]);
    expect(set.ok).toBe(false);
    expect(set.observations).toHaveLength(0);
    expect(set.rejected_indices).toEqual([1]);
    expect(set.reasons.join(" ")).toContain("[1]");
  });

  it("probe: a non-object or empty input fails closed", () => {
    for (const value of [null, undefined, 42, "string", [], true]) {
      const result = validateSentrdelSecretInputV1(value);
      expect(result.valid).toBe(false);
      expect(result.reasons).toEqual(["secret input must be an object"]);
      expect(normalizeSentrdelSecretInputV1(value)).toBeUndefined();
    }
  });

  it("probe: extra unknown keys cannot ride along unnoticed", () => {
    const extra = { ...input(), unexpected_field: "value" } as Record<
      string,
      unknown
    >;
    const result = validateSentrdelSecretInputV1(extra);
    expect(result.valid).toBe(false);
    expect(result.reasons.join(" ")).toContain("missing or unsupported fields");
  });
});


describe("UA-P06-T07 path hardening and effect boundary", () => {
  it("records the cross-cutting traversal observation without forking it", () => {
    const observation = SENTRDEL_SECRET_PATH_HARDENING_OBSERVATION;
    expect(observation.recorded_state).toBe("RECORDED_NOT_SILENTLY_CHANGED");
    expect(observation.label_semantics).toBe("INERT_LABEL_ONLY");
    // T04 and T06 semantics are explicitly left untouched by T07.
    expect(observation.canonical_layers_unchanged).toEqual([
      "UA-P06-T04",
      "UA-P06-T06",
    ]);
    expect(observation.effect_capable_uses).toEqual([
      "filesystem_access",
      "process_argument",
      "archive_extraction",
      "workspace_lookup",
      "runtime_target",
    ]);
    expect(observation.required_before_effect).toBe(
      "assertSentrdelSecretPathContainmentV1",
    );
  });

  it("preserves a traversal-shaped label verbatim as an inert label", () => {
    // The canonical SOURCE_PATH grammar accepts this label, and T07 does not
    // change that: the label is preserved exactly, flagged, and never opened.
    const traversal = "src/../../etc/passwd.ts";
    const result = validateSentrdelSecretInputV1(input({ location_path: traversal }));
    expect(result.valid).toBe(true);
    const observation = normalized({ location_path: traversal });
    expect(observation.location.path).toBe(traversal);
    expect(observation.location.path_traversal_shaped).toBe(true);
    expect(observation.location.label_is_inert).toBe(true);
    // A normal label is not flagged, so the flag carries real information.
    const ordinary = normalized();
    expect(ordinary.location.path_traversal_shaped).toBe(false);
    // A file name containing dots is not a false positive.
    const dotted = normalized({ location_path: "src/a..b.ts" });
    expect(dotted.location.path_traversal_shaped).toBe(false);
  });

  it("rejects path traversal at the effect boundary, before any effect", () => {
    // A contained relative path is admitted and resolved under the declared root.
    const ok = assertSentrdelSecretPathContainmentV1("src/app.ts", "root");
    expect(ok.ok).toBe(true);
    expect(ok.effect_allowed).toBe(true);
    expect(ok.resolved_relative).toBe("root/src/app.ts");

    // Every traversal escape is refused.
    for (const label of [
      "src/../../etc/passwd.ts",
      "../outside.ts",
      "src/../../../etc/shadow",
      "..\\..\\windows\\system32",
    ]) {
      const gate = assertSentrdelSecretPathContainmentV1(label, "root");
      expect(gate.ok).toBe(false);
      expect(gate.effect_allowed).toBe(false);
      expect(gate.resolved_relative).toBeNull();
      expect(gate.reasons.join(" ")).toContain(
        "path traversal is rejected at the effect boundary",
      );
    }
  });

  it("rejects absolute, drive-qualified, UNC, and NUL labels at the effect boundary", () => {
    for (const label of ["/etc/passwd", "C:/windows/system32", "C:\\windows"]) {
      const gate = assertSentrdelSecretPathContainmentV1(label, "root");
      expect(gate.ok).toBe(false);
      expect(gate.effect_allowed).toBe(false);
    }
    expect(
      assertSentrdelSecretPathContainmentV1("src/a\u0000b.ts", "root").ok,
    ).toBe(false);
    // A missing label cannot become an effect-capable path.
    const missing = assertSentrdelSecretPathContainmentV1(null, "root");
    expect(missing.ok).toBe(false);
    expect(missing.reasons.join(" ")).toContain(
      "an effect-capable path requires a recorded path label",
    );
  });

  it("refuses a malformed root prefix and a label resolving to nothing", () => {
    expect(assertSentrdelSecretPathContainmentV1("src/a.ts", "").ok).toBe(false);
    // A traversal-shaped ROOT would silently widen the containment boundary, so
    // it is refused rather than being used to resolve a contained label.
    for (const root of ["../..", "src/../..", "..", "src/.."]) {
      const gate = assertSentrdelSecretPathContainmentV1("src/a.ts", root);
      expect(gate.ok).toBe(false);
      expect(gate.effect_allowed).toBe(false);
      expect(gate.resolved_relative).toBeNull();
    }
    // A root naming no segment is refused.
    expect(assertSentrdelSecretPathContainmentV1("src/a.ts", ".").ok).toBe(false);
    // A label resolving to nothing is refused.
    expect(assertSentrdelSecretPathContainmentV1("./", "root").ok).toBe(false);
    // The gate itself never performs filesystem access, so it cannot be an effect.
    expect(secretNormalizationAccessesFilesystemV1()).toBe(false);
    // The gate is immutable and deterministic.
    const first = assertSentrdelSecretPathContainmentV1("src/a.ts", "root");
    expect(Object.isFrozen(first)).toBe(true);
    expect(JSON.stringify(first)).toBe(
      JSON.stringify(assertSentrdelSecretPathContainmentV1("src/a.ts", "root")),
    );
  });
});

