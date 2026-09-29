import { describe, expect, it } from "vitest";

import {
  assertsPromotedCoverageOrSafety,
  assertSentrdelSbomInvariantsV1,
  detectPromotedClaimInStrings,
  assertSentrdelScaInvariantsV1,
  buildSentrdelSbomGapV1,
  checkScaUpstreamCompatibilityV1,
  deltaOnlyIsFullGraphV1,
  dependencyImpliesFullInventoryV1,
  dependencyImpliesGlobalCleanV1,
  dependencyObservationAsymmetryIsCanonicalV1,
  dependencyObservationIsClaimAssessmentV1,
  dependencyObservationIsFindingV1,
  normalizeSentrdelScaInputV1,
  normalizeSentrdelScaSetV1,
  reachabilityIsComputedV1,
  reachabilityNotComputedIsExploitableV1,
  staleAdvisoryIsNoKnownVulnerabilityV1,
  sbomIsAdapterAdmittedV1,
  sbomIsExecutedV1,
  sbomUnprovenIsCleanV1,
  scaNormalizationAccessesFilesystemV1,
  scaNormalizationExecutesRuntimeV1,
  scaNormalizationRequiresNetworkV1,
  scaNormalizationSpawnsProcessV1,
  scaNormalizationUsesClockV1,
  scaNormalizationUsesRandomnessV1,
  severityIsDerivedV1,
  validateSentrdelScaInputV1,
  versionMatchIsExploitableV1,
  versionMatchIsVulnerableV1,
  zeroMatchesImpliesCleanV1,
  zeroMatchesImpliesSecureV1,
  SENTRDEL_SCA_ADVISORY_FRESHNESS_STATES,
  SENTRDEL_SCA_AUTHORITIES,
  SENTRDEL_SCA_CALLER_LIMITATION_BUDGET,
  SENTRDEL_SCA_CAPABILITY_ID,
  SENTRDEL_SCA_CLAIM_CLASS,
  SENTRDEL_SCA_DELTA_COVERAGE_STATES,
  SENTRDEL_SCA_ECOSYSTEMS,
  SENTRDEL_SCA_ESCALATION_TOKENS,
  SENTRDEL_SCA_FORBIDDEN_INPUT_KEYS,
  SENTRDEL_SCA_KNOWN_LIMITATIONS,
  SENTRDEL_SCA_LIMITATION_COUNT,
  SENTRDEL_SCA_PHASE_AUTHORITY,
  SENTRDEL_SCA_REACHABILITY_STATES,
  SENTRDEL_SCA_SCHEMA_VERSION,
  SENTRDEL_SCA_SEVERITY_STATES,
  SENTRDEL_SCA_VERSION_MATCH_STATES,
  SENTRDEL_SBOM_CAPABILITY_ID,
  SENTRDEL_SBOM_GAP_REASON,
  SENTRDEL_SBOM_INVENTORY_STATES,
  SENTRDEL_SBOM_KNOWN_LIMITATIONS,
  SENTRDEL_SBOM_SCOPE_CLAIMS,
  type SentrdelScaInputV1,
  type SentrdelScaObservationV1,
} from "../src/assurance/security/sentrdel-dependency-normalization.js";
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
  SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES,
} from "../src/assurance/security/sentrdel-engine-adapter.js";
import {
  SENTRDEL_CLAIM_CLASSES_REQUIRING_PROVENANCE,
  SENTRDEL_CLAIM_CLASSES_REQUIRING_RULE_ID,
  SENTRDEL_OBSERVATION_CLAIM_CLASSES,
  normalizeSentrdelEvidenceV1,
} from "../src/assurance/security/sentrdel-evidence-normalization.js";
import {
  SENTRDEL_COVERAGE_LOSS_CANONICAL_TOKENS,
  SENTRDEL_COVERAGE_LOSS_REASONS,
} from "../src/assurance/security/sentrdel-coverage-mapping.js";
import {
  buildSentrdelCapabilitiesV1,
  getSentrdelCapabilityV1,
  SENTRDEL_CAPABILITY_IDS,
  SENTRDEL_UNKNOWN_TOKENS,
} from "../src/assurance/security/sentrdel-capability-characterization.js";

const HEAD_A = "1".repeat(40);
const HEAD_B = "2".repeat(40);
const EVIDENCE_DIGEST_A = "b".repeat(64);
const EVIDENCE_DIGEST_B = "c".repeat(64);

/**
 * A fully valid, canonical dependency-delta input. Every adversarial test derives
 * from this baseline by overriding exactly one field, so each probe isolates a
 * single fail-closed path.
 *
 * The baseline is a matching advisory over a confirmed-fresh corpus, partial
 * coverage, and reachability explicitly not computed.
 */
function input(
  overrides: Partial<SentrdelScaInputV1> = {},
): SentrdelScaInputV1 {
  return {
    schema_version: 1,
    request_id: "request:t08-acceptance-001",
    attempt_id: "attempt:t08-001",
    source_head: HEAD_A,
    engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE,
    engine_version: SENTRDEL_ENGINE_VERSION,
    capability_id: SENTRDEL_SCA_CAPABILITY_ID,
    claim_class: SENTRDEL_SCA_CLAIM_CLASS,
    execution_state: "EXECUTED",
    ecosystem: "CARGO",
    package_name: "serde",
    observed_version: "1.0.190",
    manifest_ref: "Cargo.lock",
    advisory_ref: "advisory:synthetic-0001",
    advisory_source_ref: "advisory-corpus:synthetic-osv",
    advisory_freshness_state: "ADVISORY_FRESHNESS_CONFIRMED",
    version_match_state: "ADVISORY_VERSION_MATCH_OBSERVED",
    reachability_state: "REACHABILITY_NOT_COMPUTED",
    rule_id: "rule:t08-dependency-delta",
    provenance_state: "COMPLETE",
    producer_id: "producer:sentrdel-review",
    producer_version: SENTRDEL_ENGINE_VERSION,
    collector_ref: "collector:t08-001",
    coverage_state: "PARTIAL",
    aggregate_coverage_state: "PARTIALLY_COVERED",
    unknown_states: ["REACHABILITY_NOT_COMPUTED"],
    coverage_loss_reasons: ["UNKNOWN_REACHABILITY"],
    evidence_ref: "evidence:sentrdel-dependency-001",
    evidence_digest: EVIDENCE_DIGEST_A,
    limitations: ["T08 bounded Cargo and npm lockfile delta matching only"],
    effect_facts: "E0_READ_ONLY_ANALYSIS",
    network_facts: "NO_NETWORK",
    egress_facts: "NO_EGRESS",
    ...overrides,
  } as SentrdelScaInputV1;
}

function normalized(
  overrides: Partial<SentrdelScaInputV1> = {},
): SentrdelScaObservationV1 {
  const observation = normalizeSentrdelScaInputV1(input(overrides));
  expect(observation).toBeDefined();
  return observation!;
}

describe("UA-P06-T08 Sentrdel SCA / dependency / SBOM normalization", () => {
  it("versions the schema and binds the phase authority", () => {
    expect(SENTRDEL_SCA_SCHEMA_VERSION).toBe(1);
    expect(SENTRDEL_SCA_PHASE_AUTHORITY).toBe("UA-P06-T08");
    expect(SENTRDEL_SCA_AUTHORITIES).toEqual([
      "DEPENDENCY_OBSERVATION_ONLY",
      "SBOM_COVERAGE_GAP_ONLY",
    ]);
    const observation = normalized();
    expect(observation.schema_version).toBe(1);
    expect(observation.phase_authority).toBe("UA-P06-T08");
    expect(observation.authority).toBe("DEPENDENCY_OBSERVATION_ONLY");
    expect(
      validateSentrdelScaInputV1(input({ schema_version: 2 as never })).valid,
    ).toBe(false);
    // The authorities vocabulary must not be able to express a promoted state.
    for (const authority of SENTRDEL_SCA_AUTHORITIES) {
      expect(authority).not.toMatch(/PASS|CLEAN|SECURE|FINDING|VERDICT/u);
    }
  });

  it("reuses canonical vocabularies rather than forking them", () => {
    // The capability identities are the canonical T02 identities.
    expect(SENTRDEL_CAPABILITY_IDS).toContain(SENTRDEL_SCA_CAPABILITY_ID);
    expect(SENTRDEL_CAPABILITY_IDS).toContain(SENTRDEL_SBOM_CAPABILITY_ID);
    // The claim class is the canonical T04 identity.
    expect(SENTRDEL_OBSERVATION_CLAIM_CLASSES).toContain(
      SENTRDEL_SCA_CLAIM_CLASS,
    );
    // The coverage loss vocabulary is the canonical T05 vocabulary.
    expect(SENTRDEL_COVERAGE_LOSS_REASONS).toContain("UNKNOWN_REACHABILITY");
    expect(SENTRDEL_COVERAGE_LOSS_REASONS).toContain("STALE_ADVISORY_STATE");
    // The canonical T05 reason -> T02 token mapping is reused, not re-invented.
    expect(SENTRDEL_COVERAGE_LOSS_CANONICAL_TOKENS.UNKNOWN_REACHABILITY).toBe(
      "REACHABILITY_NOT_COMPUTED",
    );
    expect(SENTRDEL_COVERAGE_LOSS_CANONICAL_TOKENS.STALE_ADVISORY_STATE).toBe(
      "ADVISORY_STALE_UNAVAILABLE",
    );
    // Both canonical tokens T08 binds must exist in the T02 UNKNOWN vocabulary.
    expect(SENTRDEL_UNKNOWN_TOKENS).toContain("REACHABILITY_NOT_COMPUTED");
    expect(SENTRDEL_UNKNOWN_TOKENS).toContain("ADVISORY_STALE_UNAVAILABLE");
    expect(SENTRDEL_SCA_KNOWN_LIMITATIONS.length).toBe(
      SENTRDEL_SCA_LIMITATION_COUNT,
    );
    // No T08 vocabulary may express a promoted state.
    for (const vocabulary of [
      SENTRDEL_SCA_VERSION_MATCH_STATES,
      SENTRDEL_SCA_ADVISORY_FRESHNESS_STATES,
      SENTRDEL_SCA_REACHABILITY_STATES,
      SENTRDEL_SCA_DELTA_COVERAGE_STATES,
      SENTRDEL_SCA_SEVERITY_STATES,
      SENTRDEL_SBOM_INVENTORY_STATES,
      SENTRDEL_SBOM_SCOPE_CLAIMS,
    ]) {
      for (const member of vocabulary) {
        expect(member).not.toMatch(/^(PASS|CLEAN|SECURE|VULNERABLE|AFFECTED|EXPLOITABLE|REACHABLE|SAFE|VERIFIED)$/u);
      }
    }
  });

  it("1. accepts only the dependency-delta capability", () => {
    expect(normalized().capability_id).toBe("dependency-delta");
    for (const other of SENTRDEL_CAPABILITY_IDS) {
      if (other === SENTRDEL_SCA_CAPABILITY_ID) continue;
      const result = validateSentrdelScaInputV1(input({ capability_id: other }));
      expect(result.valid).toBe(false);
    }
    const unknown = validateSentrdelScaInputV1(
      input({ capability_id: "capability:invented" }),
    );
    expect(unknown.valid).toBe(false);
    expect(unknown.reasons.join(" ")).toContain("unknown capability identity");
  });

  it("2. a stale advisory corpus plus zero matches is never a safety claim", () => {
    // ADVISORY_STALE != NO_KNOWN_VULNERABILITY. A zero-match observation over a
    // stale corpus is admissible ONLY when it carries the canonical unknown token
    // and the canonical stale loss reason.
    const observation = normalized({
      advisory_freshness_state: "STALE_ADVISORY_STATE",
      version_match_state: "NO_ADVISORY_MATCH_IN_STATED_SCOPE",
      advisory_ref: null,
      unknown_states: [
        "ADVISORY_STALE_UNAVAILABLE",
        "REACHABILITY_NOT_COMPUTED",
      ],
      coverage_loss_reasons: ["STALE_ADVISORY_STATE", "UNKNOWN_REACHABILITY"],
    });
    expect(observation.advisory.freshness_state).toBe("STALE_ADVISORY_STATE");
    expect(observation.advisory.canonical_freshness_token).toBe(
      "ADVISORY_STALE_UNAVAILABLE",
    );
    expect(observation.coverage.unknown_states).toContain(
      "ADVISORY_STALE_UNAVAILABLE",
    );
    expect(observation.coverage.coverage_loss_reasons).toContain(
      "STALE_ADVISORY_STATE",
    );
    expect(observation.advisory_stale_is_no_known_vulnerability).toBe(false);
    expect(observation.repository_clean_claimed).toBe(false);
    expect(observation.coverage.zero_match_implies_clean).toBe(false);
    expect(staleAdvisoryIsNoKnownVulnerabilityV1()).toBe(false);
    expect(assertSentrdelScaInvariantsV1(observation).ok).toBe(true);

    // Dropping the canonical unknown token is rejected: the corpus would then
    // silently read as fresh.
    const missingToken = validateSentrdelScaInputV1(
      input({
        advisory_freshness_state: "STALE_ADVISORY_STATE",
        version_match_state: "NO_ADVISORY_MATCH_IN_STATED_SCOPE",
        advisory_ref: null,
        unknown_states: ["REACHABILITY_NOT_COMPUTED"],
        coverage_loss_reasons: [
          "STALE_ADVISORY_STATE",
          "UNKNOWN_REACHABILITY",
        ],
      }),
    );
    expect(missingToken.valid).toBe(false);
    expect(missingToken.reasons.join(" ")).toContain(
      "must declare unknown token ADVISORY_STALE_UNAVAILABLE",
    );
  });

  it("3. an unavailable advisory corpus plus zero matches is never a safety claim", () => {
    const observation = normalized({
      advisory_freshness_state: "ADVISORY_CORPUS_UNAVAILABLE",
      version_match_state: "NO_ADVISORY_MATCH_IN_STATED_SCOPE",
      advisory_ref: null,
      unknown_states: [
        "ADVISORY_STALE_UNAVAILABLE",
        "REACHABILITY_NOT_COMPUTED",
      ],
      coverage_loss_reasons: ["STALE_ADVISORY_STATE", "UNKNOWN_REACHABILITY"],
    });
    expect(observation.advisory.canonical_freshness_token).toBe(
      "ADVISORY_STALE_UNAVAILABLE",
    );
    expect(observation.coverage.unknown_states).toContain(
      "ADVISORY_STALE_UNAVAILABLE",
    );
    // An unavailable corpus with no declared coverage loss is rejected.
    const noLoss = validateSentrdelScaInputV1(
      input({
        advisory_freshness_state: "ADVISORY_CORPUS_UNAVAILABLE",
        version_match_state: "NO_ADVISORY_MATCH_IN_STATED_SCOPE",
        advisory_ref: null,
        unknown_states: [
          "ADVISORY_STALE_UNAVAILABLE",
          "REACHABILITY_NOT_COMPUTED",
        ],
        coverage_loss_reasons: ["UNKNOWN_REACHABILITY"],
      }),
    );
    expect(noLoss.valid).toBe(false);
    expect(noLoss.reasons.join(" ")).toContain(
      "must declare a canonical coverage loss",
    );
  });

  it("4. a matching advisory plus unknown reachability stays unknown", () => {
    // REACHABILITY_NOT_COMPUTED != EXPLOITABLE. The match is real; reachability
    // is still not computed, and the record must not convert one into the other.
    const observation = normalized({
      reachability_state: "UNKNOWN_REACHABILITY",
    });
    expect(observation.advisory.version_match_state).toBe(
      "ADVISORY_VERSION_MATCH_OBSERVED",
    );
    expect(observation.reachability_state).toBe("UNKNOWN_REACHABILITY");
    expect(observation.canonical_reachability_token).toBe(
      "REACHABILITY_NOT_COMPUTED",
    );
    expect(observation.reachability_computed).toBe(false);
    expect(observation.reachability_is_certain).toBe(false);
    expect(observation.exploitability_derived).toBe(false);
    expect(observation.version_match_is_exploitable).toBe(false);
    expect(observation.coverage.unknown_states).toContain(
      "REACHABILITY_NOT_COMPUTED",
    );
    expect(observation.coverage.coverage_loss_reasons).toContain(
      "UNKNOWN_REACHABILITY",
    );
    expect(versionMatchIsExploitableV1()).toBe(false);
    expect(reachabilityNotComputedIsExploitableV1()).toBe(false);
    expect(assertSentrdelScaInvariantsV1(observation).ok).toBe(true);

    // Stripping the canonical reachability token is rejected outright.
    const stripped = validateSentrdelScaInputV1(input({ unknown_states: [] }));
    expect(stripped.valid).toBe(false);
    expect(stripped.reasons.join(" ")).toContain(
      "must declare unknown token REACHABILITY_NOT_COMPUTED",
    );
    // Removing the canonical reachability loss is rejected outright.
    const noLoss = validateSentrdelScaInputV1(
      input({ coverage_loss_reasons: [] }),
    );
    expect(noLoss.valid).toBe(false);
    expect(noLoss.reasons.join(" ")).toContain(
      "must declare the UNKNOWN_REACHABILITY loss",
    );
  });

  it("5. a zero advisory match over partial coverage is never secure", () => {
    // NO_MATCH_OVER_PARTIAL != SECURE.
    const observation = normalized({
      version_match_state: "NO_ADVISORY_MATCH_IN_STATED_SCOPE",
      advisory_ref: null,
    });
    expect(observation.coverage.observation_state).toBe("PARTIAL");
    expect(observation.coverage.zero_match_implies_clean).toBe(false);
    expect(observation.repository_clean_claimed).toBe(false);
    expect(zeroMatchesImpliesSecureV1()).toBe(false);
    expect(zeroMatchesImpliesCleanV1()).toBe(false);

    // Claiming bounded-complete covered scope over a zero-match delta is rejected.
    const overclaim = validateSentrdelScaInputV1(
      input({
        version_match_state: "NO_ADVISORY_MATCH_IN_STATED_SCOPE",
        advisory_ref: null,
        coverage_state: "COMPLETE_WITHIN_STATED_SCOPE",
        aggregate_coverage_state: "COVERED_WITHIN_STATED_SCOPE",
        unknown_states: [],
        coverage_loss_reasons: [],
      }),
    );
    expect(overclaim.valid).toBe(false);
  });

  it("6. a delta-only result can never claim a full graph", () => {
    // DELTA_ONLY != FULL_GRAPH. The coverage state is derived and has exactly one
    // member, so it is structurally impossible to widen.
    expect(SENTRDEL_SCA_DELTA_COVERAGE_STATES).toEqual([
      "DELTA_ONLY_NOT_FULL_GRAPH",
    ]);
    const observation = normalized();
    expect(observation.coverage.dependency_coverage).toBe(
      "DELTA_ONLY_NOT_FULL_GRAPH",
    );
    expect(observation.identity.is_delta_only).toBe(true);
    expect(observation.identity.full_graph_claimed).toBe(false);
    expect(observation.coverage.is_full_graph).toBe(false);
    expect(observation.coverage.is_total).toBe(false);
    expect(observation.coverage.all_dependencies_scanned).toBe(false);
    expect(observation.coverage.repository_sca_complete).toBe(false);
    expect(observation.delta_only_is_full_graph).toBe(false);
    expect(observation.inventory_complete).toBe(false);
    expect(deltaOnlyIsFullGraphV1()).toBe(false);
    expect(dependencyImpliesFullInventoryV1()).toBe(false);

    // Every full-graph / inventory claim route is a forbidden input key.
    for (const key of [
      "full_graph",
      "full_inventory",
      "all_dependencies_scanned",
      "repository_sca_complete",
      "complete_inventory",
      "comprehensive_scan",
      "totality",
    ]) {
      const result = validateSentrdelScaInputV1({
        ...input(),
        [key]: true,
      } as unknown);
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain(
        `dependency input must never carry ${key}`,
      );
    }
  });

  it("7. a malformed dependency version is rejected", () => {
    for (const version of [
      "",
      "   ",
      ">=1.0.0",
      "<2.0.0",
      "^1.0.0",
      "~1.0",
      "1.0.0 || 2.0.0",
      "1.0.0 2.0.0",
      "1.0.0;rm -rf /",
      "not a version",
      "*",
      "1".repeat(65),
    ]) {
      const result = validateSentrdelScaInputV1(
        input({ observed_version: version }),
      );
      expect(result.valid).toBe(false);
    }
    // A well-formed exact version remains admissible.
    expect(
      validateSentrdelScaInputV1(input({ observed_version: "1.0.190" })).valid,
    ).toBe(true);
    // A malformed package name is rejected too.
    for (const name of ["", " ", "serde/../evil", "a".repeat(129)]) {
      expect(
        validateSentrdelScaInputV1(input({ package_name: name })).valid,
      ).toBe(false);
    }
  });

  it("8. a null rule id on DEPENDENCY_OBSERVATION is admissible", () => {
    // The canonical T04 asymmetry: DEPENDENCY_OBSERVATION is not in the
    // requiring-rule-id set, so a null rule_id must remain admissible. T08 must
    // NOT impose T06/T07's stricter structural rule.
    expect(
      (SENTRDEL_CLAIM_CLASSES_REQUIRING_RULE_ID as readonly string[]).includes(
        SENTRDEL_SCA_CLAIM_CLASS,
      ),
    ).toBe(false);
    expect(dependencyObservationAsymmetryIsCanonicalV1()).toBe(true);

    const observation = normalized({ rule_id: null });
    expect(observation.rule.rule_id).toBeNull();
    expect(observation.rule.rule_resolution).toBe("ABSENT");
    expect(observation.rule.rule_id_is_pinned).toBe(false);
    expect(observation.rule.rule_id_was_manufactured).toBe(false);
    // The normalizer must never invent a rule identity to satisfy a stricter rule.
    expect(observation.rule.rule_id).not.toBe("rule:t08-dependency-delta");
    expect(assertSentrdelScaInvariantsV1(observation).ok).toBe(true);

    // A non-null rule id is still preserved exactly when supplied.
    const withRule = normalized();
    expect(withRule.rule.rule_id).toBe("rule:t08-dependency-delta");
    expect(withRule.rule.rule_resolution).toBe("PRESENT");
    expect(withRule.rule.rule_id_is_pinned).toBe(true);
  });

  it("9. ABSENT and UNRESOLVED provenance on DEPENDENCY_OBSERVATION are admissible", () => {
    // The canonical T04 asymmetry, again: no mandatory producer provenance for a
    // dependency observation. The unresolved state must be preserved explicitly,
    // never upgraded into trusted provenance.
    expect(
      (
        SENTRDEL_CLAIM_CLASSES_REQUIRING_PROVENANCE as readonly string[]
      ).includes(SENTRDEL_SCA_CLAIM_CLASS),
    ).toBe(false);

    for (const state of ["ABSENT", "UNRESOLVED"] as const) {
      const observation = normalized({
        provenance_state: state,
        producer_id: null,
        producer_version: null,
        collector_ref: null,
        rule_id: null,
      });
      expect(observation.provenance.state).toBe(state);
      expect(observation.provenance.producer_id).toBeNull();
      expect(observation.provenance.provenance_was_manufactured).toBe(false);
      expect(assertSentrdelScaInvariantsV1(observation).ok).toBe(true);
    }

    // COMPLETE provenance must still carry every field, and must never be
    // upgraded into a trust claim.
    const incomplete = validateSentrdelScaInputV1(
      input({ provenance_state: "COMPLETE", producer_id: null }),
    );
    expect(incomplete.valid).toBe(false);
    expect(incomplete.reasons.join(" ")).toContain(
      "provenance producer_id is required when state is COMPLETE",
    );
    const complete = normalized();
    expect(complete.provenance.state).toBe("COMPLETE");
    expect(complete.provenance.producer_id).toBe("producer:sentrdel-review");

    // Caller-supplied trust is a forbidden key.
    for (const key of ["trust", "trust_level", "provenance_trust"]) {
      const result = validateSentrdelScaInputV1({
        ...input(),
        [key]: "TRUSTED",
      } as unknown);
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain(
        `dependency input must never carry ${key}`,
      );
    }
  });

  it("10. duplicate dependency observations are a fail-closed set error", () => {
    const set = normalizeSentrdelScaSetV1([input(), input()]);
    expect(set.ok).toBe(false);
    expect(set.observations).toHaveLength(0);
    expect(set.reasons.join(" ")).toContain("duplicate observation identity");
    // Even a rejected set never claims an inventory, a clean run, or a pass.
    expect(set.zero_matches_implies_clean).toBe(false);
    expect(set.full_inventory_claimed).toBe(false);
    expect(set.no_known_vulnerability_claimed).toBe(false);
    expect(set.repository_sca_complete).toBe(false);
    // The SBOM gap is still truthfully reported even on a rejected set.
    expect(set.sbom_gap.inventory_proven).toBe(false);

    // Two genuinely distinct dependencies normalize into two ordered records.
    const distinct = normalizeSentrdelScaSetV1([
      input({ package_name: "serde" }),
      input({
        package_name: "tokio",
        observed_version: "1.35.0",
        evidence_digest: EVIDENCE_DIGEST_B,
        request_id: "request:t08-acceptance-002",
      }),
    ]);
    expect(distinct.ok).toBe(true);
    expect(distinct.observations).toHaveLength(2);
    expect(distinct.matches_observed).toBe(2);
    expect(distinct.dependency_coverage).toBe("DELTA_ONLY_NOT_FULL_GRAPH");
  });

  it("11. conflicting advisory freshness is rejected", () => {
    // Confirmed freshness may not coexist with a stale loss reason...
    const staleLoss = validateSentrdelScaInputV1(
      input({
        advisory_freshness_state: "ADVISORY_FRESHNESS_CONFIRMED",
        coverage_loss_reasons: ["STALE_ADVISORY_STATE", "UNKNOWN_REACHABILITY"],
      }),
    );
    expect(staleLoss.valid).toBe(false);
    expect(staleLoss.reasons.join(" ")).toContain(
      "confirmed advisory freshness contradicts",
    );

    // ...nor with the stale unknown token.
    const staleToken = validateSentrdelScaInputV1(
      input({
        advisory_freshness_state: "ADVISORY_FRESHNESS_CONFIRMED",
        unknown_states: [
          "ADVISORY_STALE_UNAVAILABLE",
          "REACHABILITY_NOT_COMPUTED",
        ],
      }),
    );
    expect(staleToken.valid).toBe(false);
    expect(staleToken.reasons.join(" ")).toContain(
      "confirmed advisory freshness contradicts",
    );

    // A stale corpus must declare its own loss reason.
    const staleNoLoss = validateSentrdelScaInputV1(
      input({
        advisory_freshness_state: "STALE_ADVISORY_STATE",
        coverage_loss_reasons: ["UNKNOWN_REACHABILITY"],
        unknown_states: [
          "ADVISORY_STALE_UNAVAILABLE",
          "REACHABILITY_NOT_COMPUTED",
        ],
      }),
    );
    expect(staleNoLoss.valid).toBe(false);
    expect(staleNoLoss.reasons.join(" ")).toContain(
      "must declare the STALE_ADVISORY_STATE loss",
    );

    // A reported match must carry the advisory it matched.
    const matchNoRef = validateSentrdelScaInputV1(input({ advisory_ref: null }));
    expect(matchNoRef.valid).toBe(false);
    expect(matchNoRef.reasons.join(" ")).toContain(
      "must carry its advisory reference",
    );

    // A non-match must never fabricate an advisory reference.
    const noMatchWithRef = validateSentrdelScaInputV1(
      input({
        version_match_state: "NO_ADVISORY_MATCH_IN_STATED_SCOPE",
        advisory_ref: "advisory:synthetic-0001",
      }),
    );
    expect(noMatchWithRef.valid).toBe(false);
    expect(noMatchWithRef.reasons.join(" ")).toContain(
      "must not carry an advisory reference",
    );
  });

  it("12. caller-supplied severity is rejected and never derived", () => {
    // T08 does NOT derive canonical severity. Consistent with canonical T06/T07,
    // severity_state is NEVER_DERIVED and severity_value is null.
    expect(SENTRDEL_SCA_SEVERITY_STATES).toEqual(["NEVER_DERIVED"]);
    const observation = normalized();
    expect(observation.severity_state).toBe("NEVER_DERIVED");
    expect(observation.severity_value).toBeNull();
    expect(observation.advisory.source_reported_severity_recorded).toBe(false);
    expect(observation.advisory.source_reported_severity_is_canonical).toBe(false);
    expect(severityIsDerivedV1()).toBe(false);
    // The record carries NO caller-derived severity surface. `severity_value` is
    // the canonical literal `null`; every other severity-bearing member is absent.
    const record = observation as unknown as Record<string, unknown>;
    expect(record["severity_value"]).toBeNull();
    for (const key of [
      "severity",
      "cvss",
      "cvss_score",
      "risk",
      "advisory_severity",
      "source_reported_severity",
    ]) {
      expect(record[key]).toBeUndefined();
    }

    // Every caller route to a severity is a hard rejection.
    for (const key of [
      "severity",
      "severity_value",
      "severity_state",
      "advisory_severity",
      "source_reported_severity",
      "cvss",
      "cvss_score",
      "risk",
      "impact",
      "confidence",
    ]) {
      const result = validateSentrdelScaInputV1({
        ...input(),
        [key]: "HIGH",
      } as unknown);
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain(
        `dependency input must never carry ${key}`,
      );
    }

    // A source-reported severity smuggled through an ordinary string is RECORDED
    // as a promoted claim rather than silently trusted. It is never converted into
    // canonical severity, and it never blocks the scan.
    const smuggled = validateSentrdelScaInputV1(
      input({ limitations: ["advisory reports VULNERABLE"] }),
    );
    expect(smuggled.valid).toBe(true);
    const smuggledObservation = normalized({
      limitations: ["advisory reports VULNERABLE"],
    });
    expect(smuggledObservation.promoted_claim_detected).toBe(true);
    expect(smuggledObservation.severity_value).toBeNull();
    expect(smuggledObservation.severity_state).toBe("NEVER_DERIVED");
    expect(smuggledObservation.advisory.source_reported_severity_recorded).toBe(
      false,
    );
    expect(smuggledObservation.caller_text_is_authoritative).toBe(false);
  });

  it("13. caller-supplied exploitability is rejected", () => {
    for (const key of ["exploitability", "exploitable", "exploit", "impact"]) {
      const result = validateSentrdelScaInputV1({
        ...input(),
        [key]: "EXPLOITABLE",
      } as unknown);
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain(
        `dependency input must never carry ${key}`,
      );
    }
    const observation = normalized();
    expect(observation.exploitability_derived).toBe(false);
    expect(observation.version_match_is_exploitable).toBe(false);
    expect(versionMatchIsExploitableV1()).toBe(false);
  });

  it("14. caller-supplied reachability certainty is rejected", () => {
    for (const key of ["reachability", "reachable", "reachability_computed"]) {
      const result = validateSentrdelScaInputV1({
        ...input(),
        [key]: "REACHABLE",
      } as unknown);
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain(
        `dependency input must never carry ${key}`,
      );
    }
    // The reachability vocabulary itself cannot express a certainty verdict.
    expect(SENTRDEL_SCA_REACHABILITY_STATES).toEqual([
      "REACHABILITY_NOT_COMPUTED",
      "UNKNOWN_REACHABILITY",
    ]);
    for (const state of SENTRDEL_SCA_REACHABILITY_STATES) {
      expect(state).not.toMatch(/^(REACHABLE|NOT_REACHABLE|AFFECTED)$/u);
    }
    // Any invented reachability state is rejected as unknown.
    expect(
      validateSentrdelScaInputV1(input({ reachability_state: "REACHABLE" }))
        .valid,
    ).toBe(false);
    const observation = normalized();
    expect(observation.reachability_computed).toBe(false);
    expect(observation.reachability_is_certain).toBe(false);
    expect(reachabilityIsComputedV1()).toBe(false);
  });

  it("15. external PASS, CLEAN, and SECURE vocabulary is rejected", () => {
    for (const key of [
      "pass",
      "clean",
      "secure",
      "global_clean",
      "repository_clean",
      "verdict",
      "assurance",
      "finding",
      "claim_assessment",
      "verified",
      "safe",
      "unaffected",
    ]) {
      const result = validateSentrdelScaInputV1({
        ...input(),
        [key]: true,
      } as unknown);
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain(
        `dependency input must never carry ${key}`,
      );
    }
    // A self-attestation token smuggled into a limitation string is RECORDED as a
    // promoted claim rather than silently trusted, and it never promotes the
    // record: every structural negative still denies it.
    for (const token of ["PASS", "CLEAN", "SECURE", "NO_VULNERABILITIES"]) {
      const observation = normalized({ limitations: [`scan result ${token}`] });
      expect(observation.promoted_claim_detected).toBe(true);
      expect(observation.caller_text_is_authoritative).toBe(false);
      expect(observation.global_clean_claimed).toBe(false);
      expect(observation.assurance_effect).toBe("NONE");
      expect(observation.finding_emitted).toBe(false);
      expect(observation.claim_assessment_emitted).toBe(false);
      expect(assertSentrdelScaInvariantsV1(observation).ok).toBe(true);
    }
    const observation = normalized();
    expect(observation.global_clean_claimed).toBe(false);
    expect(observation.repository_clean_claimed).toBe(false);
    expect(observation.assurance_effect).toBe("NONE");
    expect(observation.finding_emitted).toBe(false);
    expect(observation.claim_assessment_emitted).toBe(false);
    expect(dependencyObservationIsFindingV1()).toBe(false);
    expect(dependencyObservationIsClaimAssessmentV1()).toBe(false);
    expect(dependencyImpliesGlobalCleanV1()).toBe(false);
  });

  it("represents the NOT_CHARACTERIZED sbom capability as a truthful gap", () => {
    // The pinned T02 characterization is the only source of truth for the gap.
    const capability = getSentrdelCapabilityV1(
      buildSentrdelCapabilitiesV1(),
      SENTRDEL_SBOM_CAPABILITY_ID,
    );
    expect(capability?.status).toBe("NOT_CHARACTERIZED");
    // SBOM_NOT_CHARACTERIZED: the capability is NOT adapter-admitted.
    expect(SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES).not.toContain(
      SENTRDEL_SBOM_CAPABILITY_ID,
    );
    expect(sbomIsAdapterAdmittedV1()).toBe(false);
    // dependency-delta IS admitted, so T08 is normalizing a real capability.
    expect(SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES).toContain(
      SENTRDEL_SCA_CAPABILITY_ID,
    );

    const gap = buildSentrdelSbomGapV1();
    expect(gap.schema_version).toBe(1);
    expect(gap.phase_authority).toBe("UA-P06-T08");
    expect(gap.authority).toBe("SBOM_COVERAGE_GAP_ONLY");
    expect(gap.capability_id).toBe("sbom");
    expect(gap.capability_status).toBe("NOT_CHARACTERIZED");
    expect(gap.execution_admitted).toBe(false);
    expect(gap.executed).toBe(false);
    expect(gap.execution_state).toBe("NOT_RUN");
    expect(gap.inventory_state).toBe("UNPROVEN");
    expect(gap.inventory_proven).toBe(false);
    expect(gap.inventory_complete).toBe(false);
    expect(gap.scope_claim).toBe("UNAVAILABLE");
    expect(gap.coverage_state).toBe("NOT_COVERED");
    expect(gap.reason).toBe(SENTRDEL_SBOM_GAP_REASON);
    expect(gap.reason).toBe(
      "capability not characterized at pinned Sentrdel revision",
    );
    expect(gap.findings_observed).toBe(0);
    expect(gap.absence_is_clean).toBe(false);
    expect(gap.global_clean_claimed).toBe(false);
    expect(gap.repository_clean_claimed).toBe(false);
    expect(gap.execution_record_fabricated).toBe(false);
    expect(gap.inventory_fabricated).toBe(false);
    // SBOM_UNPROVEN != CLEAN: absence of findings is never a clean result.
    expect(sbomUnprovenIsCleanV1()).toBe(false);
    expect(sbomIsExecutedV1()).toBe(false);
    expect(assertSentrdelSbomInvariantsV1(gap).ok).toBe(true);

    // The gap reuses the canonical T02 UNKNOWN tokens the capability declares,
    // and the canonical T05 loss for a NOT_RUN execution.
    for (const token of gap.unknown_states) {
      expect(SENTRDEL_UNKNOWN_TOKENS).toContain(token);
    }
    expect(gap.unknown_states).toContain("ANALYZER_UNAVAILABLE");
    expect(gap.coverage_loss_reasons).toContain("ENGINE_UNAVAILABLE");
    expect(SENTRDEL_COVERAGE_LOSS_CANONICAL_TOKENS.ENGINE_UNAVAILABLE).toBe(
      "ANALYZER_UNAVAILABLE",
    );
    expect(gap.limitations.length).toBe(SENTRDEL_SBOM_KNOWN_LIMITATIONS.length);
  });

  it("rejects any attempt to normalize or execute the sbom capability", () => {
    // An sbom-capability input is refused outright: the capability is not
    // characterizable, so it can never become an executable scan.
    const result = validateSentrdelScaInputV1(
      input({ capability_id: SENTRDEL_SBOM_CAPABILITY_ID }),
    );
    expect(result.valid).toBe(false);
    expect(result.reasons.join(" ")).toContain(
      "the sbom capability is NOT_CHARACTERIZED and is never normalized as a scan",
    );
    expect(normalizeSentrdelScaInputV1(
      input({ capability_id: SENTRDEL_SBOM_CAPABILITY_ID }),
    )).toBeUndefined();

    // An sbom execution/inventory record is a forbidden input key.
    for (const key of [
      "sbom",
      "sbom_execution",
      "sbom_inventory",
      "sbom_record",
    ]) {
      const rejected = validateSentrdelScaInputV1({
        ...input(),
        [key]: {},
      } as unknown);
      expect(rejected.valid).toBe(false);
      expect(rejected.reasons.join(" ")).toContain(
        `dependency input must never carry ${key}`,
      );
    }

    // The gap builder takes no input, so a caller cannot influence it at all.
    expect(buildSentrdelSbomGapV1).toHaveLength(0);
    const first = buildSentrdelSbomGapV1();
    const second = buildSentrdelSbomGapV1();
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it("binds the exact engine pin, tree, pin ref, and source head", () => {
    const observation = normalized();
    expect(observation.engine_id).toBe(SENTRDEL_ENGINE_ID);
    expect(observation.engine_pin).toBe(SENTRDEL_PINNED_REVISION);
    expect(observation.engine_tree).toBe(SENTRDEL_PINNED_TREE);
    expect(observation.engine_pin_ref).toBe(SENTRDEL_PIN_REF);
    expect(observation.source_head).toBe(HEAD_A);
    expect(observation.effect_facts).toBe("E0_READ_ONLY_ANALYSIS");
    expect(observation.network_facts).toBe("NO_NETWORK");
    expect(observation.egress_facts).toBe("NO_EGRESS");

    // Wrong pin, tree, version, or engine identity is a hard rejection. A
    // different but well-formed source head is NOT a defect: it is a different
    // analysed revision, so it is admissible and must produce a distinct identity.
    for (const override of [
      { engine_pin: "0".repeat(40) },
      { engine_tree: "0".repeat(40) },
      { engine_version: "9.9.9-not-the-pin" },
      { engine_id: "engine:invented" },
      { source_head: "not-a-sha" },
      { source_head: "1".repeat(39) },
    ]) {
      expect(validateSentrdelScaInputV1(input(override)).valid).toBe(false);
    }
    expect(validateSentrdelScaInputV1(input({ source_head: HEAD_B })).valid).toBe(
      true,
    );
    // The observation identity must differ across source heads and attempts.
    expect(normalized().dependency_observation_id).not.toBe(
      normalized({ source_head: HEAD_B }).dependency_observation_id,
    );
    expect(normalized().dependency_observation_id).not.toBe(
      normalized({ attempt_id: "attempt:t08-002" }).dependency_observation_id,
    );
  });

  it("binds the manifest to the pinned lockfile per ecosystem", () => {
    // The pinned T02 capability supports CARGO_AND_NPM_LOCKFILES_ONLY.
    expect(SENTRDEL_SCA_ECOSYSTEMS).toEqual(["CARGO", "NPM"]);
    expect(
      validateSentrdelScaInputV1(
        input({ ecosystem: "NPM", manifest_ref: "package-lock.json" }),
      ).valid,
    ).toBe(true);
    // A cross-ecosystem manifest is an unsupported-scope claim.
    expect(
      validateSentrdelScaInputV1(
        input({ ecosystem: "CARGO", manifest_ref: "package-lock.json" }),
      ).valid,
    ).toBe(false);
    // An ecosystem outside the pinned capability is rejected.
    expect(
      validateSentrdelScaInputV1(
        input({ ecosystem: "PYPI", manifest_ref: "poetry.lock" }),
      ).valid,
    ).toBe(false);
    // A non-lockfile manifest is rejected.
    expect(
      validateSentrdelScaInputV1(
        input({ manifest_ref: "Cargo.toml" }),
      ).valid,
    ).toBe(false);
  });

  it("keeps a non-producing execution state from reporting an observation", () => {
    // A timeout, unavailable engine, or malformed output may only be UNKNOWN.
    for (const state of [
      "TIMEOUT",
      "UNAVAILABLE",
      "NOT_RUN",
      "MALFORMED_OUTPUT",
      "INCOMPLETE",
      "AVAILABLE",
    ] as const) {
      const matching = validateSentrdelScaInputV1(
        input({ execution_state: state }),
      );
      expect(matching.valid).toBe(false);
      expect(matching.reasons.join(" ")).toContain(
        "produced no observation and may not report one",
      );
    }
    // An UNKNOWN observation over a non-producing state requires the canonical
    // execution-state loss reason and the canonical unknown tokens. A timeout
    // also means the advisory lookup never completed, so the corpus state must be
    // UNKNOWN rather than silently CONFIRMED.
    const unknown = validateSentrdelScaInputV1(
      input({
        execution_state: "TIMEOUT",
        version_match_state: "UNKNOWN",
        advisory_ref: null,
        advisory_freshness_state: "UNKNOWN",
        coverage_state: "UNKNOWN",
        aggregate_coverage_state: "UNKNOWN",
        unknown_states: [
          "ADVISORY_STALE_UNAVAILABLE",
          "REACHABILITY_NOT_COMPUTED",
          "TIMEOUT",
        ],
        coverage_loss_reasons: [
          "STALE_ADVISORY_STATE",
          "TIMEOUT",
          "UNKNOWN_REACHABILITY",
        ],
      }),
    );
    expect(unknown.valid).toBe(true);
    // Dropping the derived execution-state loss is rejected.
    const noLoss = validateSentrdelScaInputV1(
      input({
        execution_state: "TIMEOUT",
        version_match_state: "UNKNOWN",
        advisory_ref: null,
        advisory_freshness_state: "UNKNOWN",
        coverage_state: "UNKNOWN",
        aggregate_coverage_state: "UNKNOWN",
        unknown_states: [
          "ADVISORY_STALE_UNAVAILABLE",
          "REACHABILITY_NOT_COMPUTED",
          "TIMEOUT",
        ],
        coverage_loss_reasons: ["STALE_ADVISORY_STATE", "UNKNOWN_REACHABILITY"],
      }),
    );
    expect(noLoss.valid).toBe(false);
    expect(noLoss.reasons.join(" ")).toContain(
      "must declare coverage loss TIMEOUT",
    );
  });

  it("admits a canonical T04 dependency observation and rejects others", () => {
    // Build a real T04 DEPENDENCY_OBSERVATION, then gate it through T08.
    const upstreamEvidence = {
      schema_version: 1,
      request_id: "request:t08-upstream-001",
      attempt_id: "attempt:t08-upstream-001",
      claim_class: SENTRDEL_SCA_CLAIM_CLASS,
      engine_id: SENTRDEL_ENGINE_ID,
      engine_pin: SENTRDEL_PINNED_REVISION,
      engine_tree: SENTRDEL_PINNED_TREE,
      engine_version: SENTRDEL_ENGINE_VERSION,
      source_head: HEAD_A,
      capability_id: SENTRDEL_SCA_CAPABILITY_ID,
      execution_state: "EXECUTED",
      rule_id: null,
      // A dependency observation is a manifest-level record with no source line,
      // so the canonical T04 location is explicitly null rather than fabricated.
      location: null,
      raw_evidence_ref: "evidence:sentrdel-upstream-001",
      raw_evidence_digest: EVIDENCE_DIGEST_A,
      coverage_state: "PARTIAL",
      scanned_scope: [],
      unscanned_scope: ["transitive-graph"],
      unknown_states: ["REACHABILITY_NOT_COMPUTED", "ADVISORY_STALE_UNAVAILABLE"],
      limitations: ["T04 bounded dependency delta observation"],
      provenance: {
        state: "ABSENT",
        producer_id: null,
        producer_version: null,
        collector_ref: null,
        rule_set_ref: null,
      },
      effect_facts: "E0_READ_ONLY_ANALYSIS",
      network_facts: "NO_NETWORK",
      egress_facts: "NO_EGRESS",
      reproduction_ref: null,
    };
    const upstream = normalizeSentrdelEvidenceV1(upstreamEvidence);
    expect(upstream).toBeDefined();
    // The T04 asymmetry is genuine upstream too: a null rule id and ABSENT
    // provenance normalize fine, and T08 must not reject them.
    expect(upstream?.rule_id).toBeNull();
    expect(upstream?.provenance.state).toBe("ABSENT");
    expect(checkScaUpstreamCompatibilityV1(upstream)).toEqual([]);

    // A non-object, a wrong claim class, and a wrong capability are rejected.
    expect(checkScaUpstreamCompatibilityV1(null).length).toBeGreaterThan(0);
    expect(
      checkScaUpstreamCompatibilityV1({
        ...upstream,
        claim_class: "CONFIG_OBSERVATION",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      checkScaUpstreamCompatibilityV1({
        ...upstream,
        capability_id: "sast-structural",
      }).length,
    ).toBeGreaterThan(0);
    // The sbom capability can never be an executable upstream record.
    expect(
      checkScaUpstreamCompatibilityV1({
        ...upstream,
        capability_id: SENTRDEL_SBOM_CAPABILITY_ID,
      }).join(" "),
    ).toContain("can never be an executable upstream record");
    // A wrong pin is rejected.
    expect(
      checkScaUpstreamCompatibilityV1({
        ...upstream,
        engine_pin: "0".repeat(40),
      }).join(" "),
    ).toContain("must bind the exact Sentrdel pin");

    // A partially-shaped record must be REPORTED, never crash the gate. A gate
    // that throws on hostile input is a fail-OPEN gate.
    expect(() => checkScaUpstreamCompatibilityV1({})).not.toThrow();
    expect(checkScaUpstreamCompatibilityV1({ schema_version: 1 }).join(" ")).toContain(
      "missing required object members",
    );
  });

  it("rejects secret material entering persisted metadata", () => {
    // SYNTHETIC, NON-LIVE values. These are not valid tokens for any provider,
    // they were never issued, and they grant nothing.
    const synthetic = [
      "ghp_SYNTHETICNOTAREAL0000000000000000000000000a",
      "AKIASYNTHETICNOTAREAL0",
      "Bearer SYNTHETICNOTAREALtokenvalue0",
      "-----BEGIN PRIVATE KEY-----",
    ];
    for (const value of synthetic) {
      const result = validateSentrdelScaInputV1(
        input({ limitations: [`observed evidence ${value}`] }),
      );
      expect(result.valid).toBe(false);
      expect(result.reasons.join(" ")).toContain(
        "dependency input must not carry secret material",
      );
    }
    // A secret in an evidence reference is caught as well.
    expect(
      validateSentrdelScaInputV1(
        input({ evidence_ref: "ghp_SYNTHETICNOTAREAL0000000000000000000000000a" }),
      ).valid,
    ).toBe(false);
  });

  it("is deterministic, ordered, immutable, and free of runtime effects", () => {
    // Deterministic: identical inputs produce identical output.
    expect(normalizeSentrdelScaInputV1(input())).toEqual(
      normalizeSentrdelScaInputV1(input()),
    );
    // Ordering is independent of input order.
    const a = input({ package_name: "aaa" });
    const b = input({
      package_name: "zzz",
      request_id: "request:t08-acceptance-003",
    });
    const forward = normalizeSentrdelScaSetV1([a, b]);
    const reverse = normalizeSentrdelScaSetV1([b, a]);
    expect(forward.ok).toBe(true);
    expect(reverse.ok).toBe(true);
    expect(forward.observations).toEqual(reverse.observations);
    // The emitted record is deeply frozen.
    const observation = normalized();
    expect(Object.isFrozen(observation)).toBe(true);
    expect(Object.isFrozen(observation.coverage)).toBe(true);
    expect(Object.isFrozen(observation.advisory)).toBe(true);
    expect(Object.isFrozen(observation.identity)).toBe(true);
    // Unknown states and limitations are canonically ordered.
    expect(observation.coverage.unknown_states).toEqual(
      [...observation.coverage.unknown_states].sort(),
    );
    expect(observation.limitations).toEqual([...observation.limitations].sort());

    // Purity: no execution, clock, randomness, network, filesystem, or process.
    expect(scaNormalizationExecutesRuntimeV1()).toBe(false);
    expect(scaNormalizationUsesClockV1()).toBe(false);
    expect(scaNormalizationUsesRandomnessV1()).toBe(false);
    expect(scaNormalizationRequiresNetworkV1()).toBe(false);
    expect(scaNormalizationAccessesFilesystemV1()).toBe(false);
    expect(scaNormalizationSpawnsProcessV1()).toBe(false);
  });

  it("keeps the emitted record free of any promoted claim", () => {
    // The canonical T08 truth boundary, asserted field by field.
    const observation = normalized();
    expect(assertSentrdelScaInvariantsV1(observation).ok).toBe(true);
    for (const flag of [
      "finding_emitted",
      "claim_assessment_emitted",
      "dependency_observation_is_finding",
      "version_match_is_vulnerable",
      "version_match_is_exploitable",
      "advisory_stale_is_no_known_vulnerability",
      "delta_only_is_full_graph",
      "reachability_is_certain",
      "exploitability_derived",
      "remediation_derived",
      "inventory_complete",
      "global_clean_claimed",
      "repository_clean_claimed",
      "repository_sca_complete_claimed",
      "remediation_verified",
    ] as const) {
      expect(observation[flag]).toBe(false);
    }
    expect(observation.advisory.version_match_is_vulnerability_truth).toBe(false);
    expect(observation.advisory.advisory_freshness_is_safety_evidence).toBe(false);
    expect(observation.assurance_effect).toBe("NONE");
    expect(observation.evidence_content_persisted).toBe(false);
    expect(observation.coverage.unscanned_is_clean).toBe(false);
    expect(observation.coverage.unknown_is_pass).toBe(false);

    // A mutated record that violates an invariant is caught by the gate, so the
    // invariant surface is load-bearing rather than decorative.
    const mutated = {
      ...observation,
      coverage: { ...observation.coverage, is_full_graph: true },
    } as unknown as SentrdelScaObservationV1;
    const check = assertSentrdelScaInvariantsV1(mutated);
    expect(check.ok).toBe(false);
    expect(check.reasons.join(" ")).toContain(
      "must never claim a full dependency graph",
    );

    const mutatedSbom = { ...buildSentrdelSbomGapV1(), executed: true } as never;
    const sbomCheck = assertSentrdelSbomInvariantsV1(mutatedSbom);
    expect(sbomCheck.ok).toBe(false);
    expect(sbomCheck.reasons.join(" ")).toContain("is never executed");

    // The forbidden-key set is non-empty and covers the mandated routes.
    expect(SENTRDEL_SCA_FORBIDDEN_INPUT_KEYS.length).toBeGreaterThan(0);
    for (const key of [
      "severity",
      "exploitability",
      "reachability",
      "trust",
      "full_graph",
      "repository_clean",
      "sbom",
    ]) {
      expect(SENTRDEL_SCA_FORBIDDEN_INPUT_KEYS as readonly string[]).toContain(
        key,
      );
    }
    // The escalation vocabulary covers the promoted verdicts that matter.
    for (const token of [
      "VULNERABLE",
      "EXPLOITABLE",
      "REACHABLE",
      "SAFE",
      "NO_KNOWN_VULNERABILITY",
    ]) {
      expect(SENTRDEL_SCA_ESCALATION_TOKENS as readonly string[]).toContain(
        token,
      );
    }
  });

  it("regression: a caller cannot purchase a covered aggregate over a delta", () => {
    // Found by the exact-head Jev review. A zero-match observation paired with
    // coverage_state PARTIAL and aggregate COVERED_WITHIN_STATED_SCOPE previously
    // passed both the zero-match guard and the aggregate guard, and the invariant
    // gate then ratified the promotion. That is the aggregation-level violation of
    // NO_MATCH_OVER_PARTIAL != SECURE and DELTA_ONLY != FULL_GRAPH.
    const promotion = validateSentrdelScaInputV1(
      input({
        version_match_state: "NO_ADVISORY_MATCH_IN_STATED_SCOPE",
        advisory_ref: null,
        coverage_state: "PARTIAL",
        aggregate_coverage_state: "COVERED_WITHIN_STATED_SCOPE",
      }),
    );
    expect(promotion.valid).toBe(false);
    expect(promotion.reasons.join(" ")).toContain(
      "a zero-match delta observation may not claim bounded-complete covered scope",
    );

    // The same promotion attempted on a MATCHING advisory is also refused: a
    // covered aggregate may never coexist with surviving unknown states, and T08
    // always retains the reachability token.
    const matchedPromotion = validateSentrdelScaInputV1(
      input({
        coverage_state: "PARTIAL",
        aggregate_coverage_state: "COVERED_WITHIN_STATED_SCOPE",
      }),
    );
    expect(matchedPromotion.valid).toBe(false);
    expect(matchedPromotion.reasons.join(" ")).toContain(
      "a covered aggregate scope may never coexist with declared unknown states",
    );

    // The emitted record never carries a covered aggregate for a delta run.
    const emitted = normalized({
      version_match_state: "NO_ADVISORY_MATCH_IN_STATED_SCOPE",
      advisory_ref: null,
    });
    expect(emitted.coverage.aggregate_state).toBe("PARTIALLY_COVERED");

    // The invariant gate independently refuses a hand-built covered record, so it
    // can no longer ratify a promotion it is supposed to reject.
    const forged = {
      ...normalized(),
      coverage: {
        ...normalized().coverage,
        aggregate_state: "COVERED_WITHIN_STATED_SCOPE",
      },
    } as unknown as SentrdelScaObservationV1;
    const check = assertSentrdelScaInvariantsV1(forged);
    expect(check.ok).toBe(false);
    expect(check.reasons.join(" ")).toContain(
      "a covered aggregate scope may never coexist with declared unknown states",
    );
  });

  it("regression: the frozen T08 boundary is attached to every record", () => {
    // Found by the exact-head Jev review. SENTRDEL_SCA_KNOWN_LIMITATIONS declared
    // the truth boundary but was never emitted, so a record could carry only a
    // single vague caller limitation and the boundary was decorative.
    const observation = normalized({
      limitations: ["bounded delta only"],
    });
    // The caller's own limitation is preserved...
    expect(observation.limitations).toContain("bounded delta only");
    // ...and the whole frozen boundary travels with it.
    for (const required of SENTRDEL_SCA_KNOWN_LIMITATIONS) {
      expect(observation.limitations).toContain(required);
    }
    expect(observation.limitations.length).toBeGreaterThan(
      SENTRDEL_SCA_KNOWN_LIMITATIONS.length,
    );
    // A record that has had the boundary stripped is reported by the gate.
    const stripped = {
      ...observation,
      limitations: ["bounded delta only"],
    } as unknown as SentrdelScaObservationV1;
    const check = assertSentrdelScaInvariantsV1(stripped);
    expect(check.ok).toBe(false);
    expect(check.reasons.join(" ")).toContain(
      "must carry the frozen T08 truth boundary",
    );
  });

  it("regression: no declared negative on either gate is unasserted", () => {
    // Found by the exact-head T08 reviews. An invariant negative that the gate
    // never reads is a decorative guard: it is literal-false at the type level,
    // but the gate is the only structural enforcement and is invoked on objects
    // whose shape is only compile-time checked. This test enumerates every boolean
    // member of a real record of each kind, flips it to true, and requires the
    // corresponding gate to report it.
    function collectBooleans(
      value: unknown,
      prefix: string,
      acc: string[],
      depth: number,
    ): void {
      if (depth > 1 || typeof value !== "object" || value === null) return;
      for (const [key, member] of Object.entries(value as Record<string, unknown>)) {
        if (typeof member === "boolean") {
          acc.push(`${prefix}${key}`);
        } else {
          collectBooleans(member, `${prefix}${key}.`, acc, depth + 1);
        }
      }
    }
    function setPath(target: Record<string, unknown>, path: string, next: unknown): void {
      const parts = path.split(".");
      let cursor = target;
      for (let index = 0; index < parts.length - 1; index += 1) {
        cursor = cursor[parts[index] as string] as Record<string, unknown>;
      }
      cursor[parts[parts.length - 1] as string] = next;
    }
    function readPath(source: unknown, path: string): boolean {
      let cursor = source as Record<string, unknown>;
      for (const part of path.split(".")) {
        cursor = cursor[part] as Record<string, unknown>;
      }
      return cursor as unknown as boolean;
    }

    // The SBOM gap: every negative must be load-bearing. Each boolean is flipped
    // to the OPPOSITE of its real value, so a positive assertion such as
    // `is_delta_only: true` is exercised by turning it false, not true.
    const gap = buildSentrdelSbomGapV1();
    const gapBooleans: string[] = [];
    collectBooleans(gap, "", gapBooleans, 0);
    expect(gapBooleans.length).toBeGreaterThan(0);
    for (const path of gapBooleans) {
      const mutated = structuredClone(gap) as Record<string, unknown>;
      setPath(mutated, path, !readPath(gap, path));
      expect(
        assertSentrdelSbomInvariantsV1(mutated as never).ok,
        `flipping ${path} on the sbom gap must be reported`,
      ).toBe(false);
    }

    // The dependency observation: every boolean must be load-bearing too. The
    // recorded promoted-claim fact is EXCLUDED here because it is a derived FACT
    // rather than a negative; it has its own dedicated test, which flips it in
    // both directions and requires the gate to report the inconsistency.
    const observation = normalized();
    const observationBooleans: string[] = [];
    collectBooleans(observation, "", observationBooleans, 0);
    expect(observationBooleans.length).toBeGreaterThan(0);
    for (const path of observationBooleans) {
      if (path === "promoted_claim_detected") {
        continue;
      }
      const mutated = structuredClone(observation) as Record<string, unknown>;
      setPath(mutated, path, !readPath(observation, path));
      expect(
        assertSentrdelScaInvariantsV1(mutated as never).ok,
        `flipping ${path} on the dependency observation must be reported`,
      ).toBe(false);
    }
  });

  it("states the caller limitation budget after the frozen boundary is attached", () => {
    // Found by the exact-head Jev re-review. Attaching the frozen boundary to
    // every record silently reduced the caller-facing limitation budget, which
    // was undocumented. The remaining budget is now explicit.
    expect(SENTRDEL_SCA_CALLER_LIMITATION_BUDGET).toBe(
      32 - SENTRDEL_SCA_KNOWN_LIMITATIONS.length,
    );
    expect(SENTRDEL_SCA_CALLER_LIMITATION_BUDGET).toBeGreaterThan(0);
    // A caller may still supply its own limitations up to the stated budget.
    const many = Array.from(
      { length: SENTRDEL_SCA_CALLER_LIMITATION_BUDGET },
      (_unused, index) => `caller limitation ${String(index)}`,
    );
    const observation = normalized({ limitations: many });
    expect(observation.limitations.length).toBe(
      SENTRDEL_SCA_KNOWN_LIMITATIONS.length + many.length,
    );
    // Exceeding the canonical cap is still a hard rejection.
    expect(
      validateSentrdelScaInputV1(
        input({
          limitations: Array.from(
            { length: 33 },
            (_unused, index) => `caller limitation ${String(index)}`,
          ),
        }),
      ).valid,
    ).toBe(false);
  });

  it("regression: caller text is recorded and never authoritative", () => {
    // Found by the exact-head T08 Jev review. A lexical rejection sweep over free
    // text was measured to be unsound in BOTH directions: it admitted paraphrases
    // and negation-evasions, and it rejected the module's OWN frozen boundary
    // statements and honest text such as "no cve data available". Every additional
    // vocabulary round traded one failure mode for the other.
    //
    // The architectural fix is that caller text no longer carries authority at all.
    // A promoted assertion is RECORDED as a derived fact, and the load-bearing
    // controls are the literal-false structural negatives plus the vocabulary
    // membership checks, neither of which is lexical.
    for (const claim of [
      "all dependencies scanned",
      "full graph",
      "complete inventory",
      "reachability computed",
      "unreachable",
      "complete sbom",
      "inventory complete",
      "unaffected",
      "trusted",
      "zero risk",
      "cleared",
      "no advisories apply",
      "no known dependency vulnerabilities",
      "full inventory",
      "total coverage",
      "all good",
      "zero findings",
      "no issues",
      "comprehensive scan",
      "exhaustive coverage",
      "no vulns",
      "cve-free",
      "vuln-free",
      "vulnerability free",
      "zero known vulnerabilities",
      "no vulns in the delta",
      "cve free",
      "risk eliminated",
      "breach ruled out",
      "proof provided",
      "guarantee given",
      "graph resolved",
      "inventory proven",
      "all dependencies verified",
      "complete dependency graph",
      "not affected but all dependencies scanned",
      "coverage is unknown. all good",
      "secrets exposed check complete",
    ]) {
      // The text is admitted, and the promoted assertion is RECORDED on it.
      expect(
        detectPromotedClaimInStrings([claim]),
        `"${claim}" must be detected as a promoted claim`,
      ).toBe(true);
      const observation = normalized({ limitations: [claim] });
      expect(observation.promoted_claim_detected).toBe(true);
      // Recording it grants nothing: every structural negative still denies it.
      expect(observation.caller_text_is_authoritative).toBe(false);
      expect(observation.global_clean_claimed).toBe(false);
      expect(observation.repository_clean_claimed).toBe(false);
      expect(observation.inventory_complete).toBe(false);
      expect(observation.coverage.repository_sca_complete).toBe(false);
      expect(assertSentrdelScaInvariantsV1(observation).ok).toBe(true);
    }
    // Honest text is admitted, is NOT flagged, and is never authoritative.
    for (const honest of [
      "Cargo lockfile delta only; no transitive graph",
      "advisory corpus is stale",
      "serde 1.0.190 observed in Cargo.lock",
      "reachability not computed at this pin",
      "clean corpus metadata is not evidence of safety",
      "inventory is unproven",
      "no full graph is claimed",
      "scan is delta only",
      "risk is not assessed",
      "graph is not resolved",
      "sbom is unavailable",
      "coverage is partial",
      "no advisory data was available",
      "no cve data available",
      "credentials are not validated",
      "no secrets were persisted",
      "transitive graph not resolved",
      "secrets-changed delta only",
    ]) {
      expect(
        detectPromotedClaimInStrings([honest]),
        `"${honest}" must not be flagged as a promoted claim`,
      ).toBe(false);
      const observation = normalized({ limitations: [honest] });
      expect(observation.promoted_claim_detected).toBe(false);
      expect(assertSentrdelScaInvariantsV1(observation).ok).toBe(true);
    }
    // The module's OWN frozen boundary is not flagged, because it names claims in
    // order to deny them. A default record therefore carries no detected claim.
    const plain = normalized();
    expect(plain.promoted_claim_detected).toBe(false);
    expect(plain.caller_text_is_authoritative).toBe(false);
    // A record cannot hide or manufacture the fact: the gate recomputes it.
    expect(
      assertSentrdelScaInvariantsV1({
        ...plain,
        promoted_claim_detected: true,
      } as never).ok,
    ).toBe(false);
    expect(
      assertSentrdelScaInvariantsV1({
        ...normalized({ limitations: ["all dependencies scanned"] }),
        promoted_claim_detected: false,
      } as never).ok,
    ).toBe(false);
    // Nor can it claim its own text is authoritative.
    expect(
      assertSentrdelScaInvariantsV1({
        ...plain,
        caller_text_is_authoritative: true,
      } as never).ok,
    ).toBe(false);
    expect(
      assertSentrdelSbomInvariantsV1({
        ...buildSentrdelSbomGapV1(),
        caller_text_is_authoritative: true,
      } as never).ok,
    ).toBe(false);
  });

  it("regression: both gates verify vocabulary membership, not only negatives", () => {
    // Found by the exact-head T08 Jev re-review. A gate that only checks a
    // negative says `false` still ratifies a record that attaches an
    // out-of-vocabulary PROMOTED value to that same field. Both gates now verify
    // every state value is a member of the canonical vocabulary that owns it.
    const observation = normalized();
    for (const [field, value] of [
      ["reachability_state", "REACHABLE"],
      ["reachability_state", "NOT_REACHABLE"],
      ["reachability_state", "REACHABILITY_COMPUTED"],
      ["capability_status", "COMPLETE"],
      ["network_facts", "NETWORK_REQUIRED"],
      ["effect_facts", "E1"],
      ["egress_facts", "EGRESS_ALLOWED"],
    ] as const) {
      const mutated = { ...observation, [field]: value };
      expect(
        assertSentrdelScaInvariantsV1(mutated as never).ok,
        `${field}=${String(value)} must be reported`,
      ).toBe(false);
    }
    // Nested advisory and coverage values are checked too.
    for (const [field, value] of [
      ["version_match_state", "VULNERABLE"],
      ["version_match_state", "SAFE"],
      ["freshness_state", "ADVISORY_CORPUS_COMPLETE"],
    ] as const) {
      const mutated = {
        ...observation,
        advisory: { ...observation.advisory, [field]: value },
      };
      expect(
        assertSentrdelScaInvariantsV1(mutated as never).ok,
        `advisory.${field}=${value} must be reported`,
      ).toBe(false);
    }
    for (const [field, value] of [
      ["observation_state", "COMPLETE_WITHIN_STATED_SCOPE_TOTAL"],
      ["aggregate_state", "TOTALLY_COVERED"],
    ] as const) {
      const mutated = {
        ...observation,
        coverage: { ...observation.coverage, [field]: value },
      };
      expect(
        assertSentrdelScaInvariantsV1(mutated as never).ok,
        `coverage.${field}=${value} must be reported`,
      ).toBe(false);
    }
    // A forged canonical token must not announce a conclusion the record never
    // earned, and a non-canonical token or loss reason is reported.
    expect(
      assertSentrdelScaInvariantsV1({
        ...observation,
        canonical_reachability_token: "REACHABLE",
      } as never).ok,
    ).toBe(false);
    expect(
      assertSentrdelScaInvariantsV1({
        ...observation,
        coverage: {
          ...observation.coverage,
          unknown_states: ["NOT_A_CANONICAL_TOKEN"],
        },
      } as never).ok,
    ).toBe(false);
    expect(
      assertSentrdelScaInvariantsV1({
        ...observation,
        coverage: {
          ...observation.coverage,
          coverage_loss_reasons: ["NOT_A_CANONICAL_LOSS"],
        },
      } as never).ok,
    ).toBe(false);

    // The SBOM gap gate applies the same discipline.
    const gap = buildSentrdelSbomGapV1();
    for (const [field, value] of [
      ["coverage_state", "TOTALLY_COVERED"],
      ["scope_claim", "COVERED"],
      ["inventory_state", "COMPLETE"],
    ] as const) {
      expect(
        assertSentrdelSbomInvariantsV1({ ...gap, [field]: value } as never).ok,
        `gap ${field}=${value} must be reported`,
      ).toBe(false);
    }
    // A gap whose frozen boundary has been replaced is reported.
    expect(
      assertSentrdelSbomInvariantsV1({ ...gap, limitations: ["CLEAN"] } as never)
        .ok,
    ).toBe(false);
    // A gap carrying an invented token or loss reason is reported.
    expect(
      assertSentrdelSbomInvariantsV1({
        ...gap,
        unknown_states: ["NOT_A_CANONICAL_TOKEN"],
      } as never).ok,
    ).toBe(false);
    expect(
      assertSentrdelSbomInvariantsV1({
        ...gap,
        coverage_loss_reasons: ["NOT_A_CANONICAL_LOSS"],
      } as never).ok,
    ).toBe(false);
  });
});
