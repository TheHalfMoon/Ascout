/**
 * UA-P06-T08 — Sentrdel SCA / dependency / SBOM normalization.
 *
 * Purpose: normalize bounded, untrusted Sentrdel `dependency-delta` output into
 * bounded Ascout DEPENDENCY OBSERVATIONS, and represent the `sbom` capability's
 * truthful ABSENCE as a first-class, bounded coverage gap.
 *
 * This task answers: "which pinned dependency delta was observed, at which
 * version, against which advisory corpus, with what advisory freshness, version
 * match, reachability, coverage, and provenance?"
 *
 * It must NEVER answer:
 *   - "is this dependency vulnerable?"
 *   - "is this dependency exploitable?"
 *   - "is this dependency reachable?"
 *   - "is this repository free of known vulnerabilities?"
 *   - "is this repository's dependency graph complete?"
 *   - "is this an SBOM?" (the capability is NOT_CHARACTERIZED at this pin)
 *
 * Central invariants:
 *   DEPENDENCY_OBSERVATION    != FINDING
 *   VERSION_MATCH             != VULNERABLE
 *   ADVISORY_STALE            != NO_KNOWN_VULNERABILITY
 *   DELTA_ONLY                != FULL_GRAPH
 *   REACHABILITY_NOT_COMPUTED != EXPLOITABLE
 *   SBOM_NOT_CHARACTERIZED    != INVENTORY_PROVEN
 *   SBOM_UNPROVEN             != CLEAN
 *   NO_MATCH_OVER_PARTIAL     != SECURE
 *   SECURITY_PASS             != SUPPORTED_CLAIM
 *   UNKNOWN                   != PASS
 *   UNSCANNED_SCOPE           != CLEAN
 *
 * SEVERITY: T08 does NOT derive canonical severity. `severity_state` is a
 * literal `NEVER_DERIVED` and `severity_value` is a literal `null`, exactly as
 * T06 and T07 do. `SEVERITY != NEVER_DERIVED` is deliberately NOT encoded,
 * because it is inconsistent with canonical T06/T07 behaviour. A source-reported
 * advisory severity is NOT converted into Ascout canonical severity; because no
 * authorized canonical field exists for it at this pin it is OMITTED rather than
 * inventing a new authority-bearing surface. Caller-supplied severity is a hard
 * rejection.
 *
 * Reused without forking from the canonical T01-T07 surfaces:
 *   - sentrdel-source-pin.ts                   (exact donor pin/tree/pin_ref)
 *   - sentrdel-engine-boundary.ts              (engine id and version)
 *   - sentrdel-capability-characterization.ts  (dependency-delta and sbom
 *                                               characterization, UNKNOWN tokens)
 *   - sentrdel-engine-adapter.ts               (execution states, ceilings,
 *                                               allowed capabilities)
 *   - sentrdel-evidence-normalization.ts       (claim classes, provenance and
 *                                               rule-id asymmetry, resolution
 *                                               states, guards)
 *   - sentrdel-coverage-mapping.ts             (coverage states, loss reasons,
 *                                               execution-state loss derivation)
 *
 * This module is pure: no execution, no network, no clock, no randomness, no
 * filesystem access, and no dependency on traversal order.
 */
import {
  buildSentrdelCapabilitiesV1,
  getSentrdelCapabilityV1,
  SENTRDEL_CAPABILITY_IDS,
  SENTRDEL_CAPABILITY_STATUSES,
  SENTRDEL_UNKNOWN_TOKENS,
} from "./sentrdel-capability-characterization.js";
import {
  SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES,
  SENTRDEL_ADAPTER_EFFECT_CEILINGS,
  SENTRDEL_ADAPTER_EGRESS_POLICIES,
  SENTRDEL_ADAPTER_EXECUTION_STATES,
  SENTRDEL_ADAPTER_NETWORK_POLICIES,
  type SentrdelAdapterEgressPolicyV1,
  type SentrdelAdapterEffectCeilingV1,
  type SentrdelAdapterExecutionStateV1,
  type SentrdelAdapterNetworkPolicyV1,
} from "./sentrdel-engine-adapter.js";
import {
  SENTRDEL_ENGINE_ID,
  SENTRDEL_ENGINE_VERSION,
} from "./sentrdel-engine-boundary.js";
import {
  assertSentrdelObservationInvariantsV1,
  containsExternalAttestationV1,
  containsSecretMaterialV1,
  SENTRDEL_CLAIM_CLASSES_REQUIRING_PROVENANCE,
  SENTRDEL_CLAIM_CLASSES_REQUIRING_RULE_ID,
  SENTRDEL_EXTERNAL_ATTESTATION_TOKENS,
  SENTRDEL_OBSERVATION_CLAIM_CLASSES,
  SENTRDEL_OBSERVATION_COVERAGE_STATES,
  SENTRDEL_OBSERVATION_RESOLUTION_STATES,
  SENTRDEL_PROVENANCE_STATES,
  type SentrdelNormalizedObservationV1,
  type SentrdelObservationClaimClassV1,
  type SentrdelObservationCoverageStateV1,
  type SentrdelObservationResolutionStateV1,
  type SentrdelProvenanceStateV1,
} from "./sentrdel-evidence-normalization.js";
import {
  SENTRDEL_AGGREGATE_COVERAGE_STATES,
  SENTRDEL_COVERAGE_LOSS_CANONICAL_TOKENS,
  SENTRDEL_COVERAGE_LOSS_REASONS,
  SENTRDEL_EXECUTION_STATE_LOSS_REASON,
  SENTRDEL_NON_PRODUCING_EXECUTION_STATES,
  type SentrdelAggregateCoverageStateV1,
  type SentrdelCoverageLossReasonV1,
} from "./sentrdel-coverage-mapping.js";
import {
  SENTRDEL_PINNED_REVISION,
  SENTRDEL_PINNED_TREE,
  SENTRDEL_PIN_REF,
} from "./sentrdel-source-pin.js";

export const SENTRDEL_SCA_SCHEMA_VERSION = 1 as const;

export const SENTRDEL_SCA_PHASE_AUTHORITY = "UA-P06-T08" as const;

/** The single SCA capability this task normalizes. */
export const SENTRDEL_SCA_CAPABILITY_ID = "dependency-delta" as const;

/**
 * The SBOM capability. It is characterized as NOT_CHARACTERIZED at this pin, so
 * it is never adapter-admitted and never executable. It is represented only by
 * a bounded coverage gap.
 */
export const SENTRDEL_SBOM_CAPABILITY_ID = "sbom" as const;

/** The canonical T04 claim class for a dependency observation. */
export const SENTRDEL_SCA_CLAIM_CLASS = "DEPENDENCY_OBSERVATION" as const;

/**
 * Authorities. There is deliberately no FINDING, CLAIM, PASS, CLEAN, or SECURE
 * member anywhere in this vocabulary.
 */
export const SENTRDEL_SCA_AUTHORITIES = [
  "DEPENDENCY_OBSERVATION_ONLY",
  "SBOM_COVERAGE_GAP_ONLY",
] as const;

export type SentrdelScaAuthorityV1 =
  (typeof SENTRDEL_SCA_AUTHORITIES)[number];

/**
 * Version match states. There is deliberately no VULNERABLE, AFFECTED, SAFE, or
 * CLEAN member: VERSION_MATCH != VULNERABLE, so the vocabulary itself cannot
 * express a vulnerability verdict.
 */
export const SENTRDEL_SCA_VERSION_MATCH_STATES = [
  "ADVISORY_VERSION_MATCH_OBSERVED",
  "NO_ADVISORY_MATCH_IN_STATED_SCOPE",
  "UNKNOWN",
] as const;

export type SentrdelScaVersionMatchStateV1 =
  (typeof SENTRDEL_SCA_VERSION_MATCH_STATES)[number];

/**
 * Advisory freshness states.
 *
 * STALE_ADVISORY_STATE and ADVISORY_CORPUS_UNAVAILABLE both bind the single
 * canonical T02 token ADVISORY_STALE_UNAVAILABLE. UNKNOWN freshness is mapped
 * conservatively onto the same token: an unproven corpus is never treated as
 * complete. ADVISORY_STALE != NO_KNOWN_VULNERABILITY.
 */
export const SENTRDEL_SCA_ADVISORY_FRESHNESS_STATES = [
  "ADVISORY_FRESHNESS_CONFIRMED",
  "STALE_ADVISORY_STATE",
  "ADVISORY_CORPUS_UNAVAILABLE",
  "UNKNOWN",
] as const;

export type SentrdelScaAdvisoryFreshnessStateV1 =
  (typeof SENTRDEL_SCA_ADVISORY_FRESHNESS_STATES)[number];

/** Freshness state -> canonical T02 UNKNOWN token. Never a parallel vocabulary. */
export const SENTRDEL_SCA_FRESHNESS_CANONICAL_TOKENS: Readonly<
  Record<SentrdelScaAdvisoryFreshnessStateV1, string | null>
> = Object.freeze({
  ADVISORY_FRESHNESS_CONFIRMED: null,
  STALE_ADVISORY_STATE: "ADVISORY_STALE_UNAVAILABLE",
  ADVISORY_CORPUS_UNAVAILABLE: "ADVISORY_STALE_UNAVAILABLE",
  UNKNOWN: "ADVISORY_STALE_UNAVAILABLE",
});

/**
 * Reachability states. There is deliberately no REACHABLE, NOT_REACHABLE, or
 * RUNTIME_AFFECTED member: at this pin reachability is never computed, so the
 * vocabulary cannot express a reachability verdict in either direction.
 */
export const SENTRDEL_SCA_REACHABILITY_STATES = [
  "REACHABILITY_NOT_COMPUTED",
  "UNKNOWN_REACHABILITY",
] as const;

export type SentrdelScaReachabilityStateV1 =
  (typeof SENTRDEL_SCA_REACHABILITY_STATES)[number];

/** Reachability state -> canonical T02 UNKNOWN token. */
export const SENTRDEL_SCA_REACHABILITY_CANONICAL_TOKENS: Readonly<
  Record<SentrdelScaReachabilityStateV1, string | null>
> = Object.freeze({
  REACHABILITY_NOT_COMPUTED: "REACHABILITY_NOT_COMPUTED",
  UNKNOWN_REACHABILITY: "REACHABILITY_NOT_COMPUTED",
});

/**
 * Dependency coverage. Exactly one member, structurally derived and never
 * caller-supplied: DELTA_ONLY != FULL_GRAPH.
 */
export const SENTRDEL_SCA_DELTA_COVERAGE_STATES = [
  "DELTA_ONLY_NOT_FULL_GRAPH",
] as const;

export type SentrdelScaDeltaCoverageStateV1 =
  (typeof SENTRDEL_SCA_DELTA_COVERAGE_STATES)[number];

/**
 * Ecosystems. Exactly the two lockfile ecosystems the pinned T02 capability
 * declares: `CARGO_AND_NPM_LOCKFILES_ONLY`. T08 adds no ecosystem.
 */
export const SENTRDEL_SCA_ECOSYSTEMS = ["CARGO", "NPM"] as const;

export type SentrdelScaEcosystemV1 = (typeof SENTRDEL_SCA_ECOSYSTEMS)[number];

/** The pinned lockfile basename per supported ecosystem. */
export const SENTRDEL_SCA_PINNED_LOCKFILES: Readonly<
  Record<SentrdelScaEcosystemV1, string>
> = Object.freeze({
  CARGO: "Cargo.lock",
  NPM: "package-lock.json",
});

/**
 * Severity states. Exactly one member, consistent with canonical T06/T07:
 * T08 does NOT derive severity.
 */
export const SENTRDEL_SCA_SEVERITY_STATES = ["NEVER_DERIVED"] as const;

export type SentrdelScaSeverityStateV1 =
  (typeof SENTRDEL_SCA_SEVERITY_STATES)[number];

/**
 * The single reason an SBOM gap exists at this pin. It is a constant, never a
 * caller choice, so an SBOM gap can never be given a fabricated cause.
 */
export const SENTRDEL_SBOM_GAP_REASON =
  "capability not characterized at pinned Sentrdel revision" as const;

/**
 * Escalation tokens. These are the words by which a caller or an engine would try
 * to promote a bounded dependency observation into a vulnerability,
 * reachability, exploitability, or safety verdict. They are rejected, never
 * recorded.
 */
export const SENTRDEL_SCA_ESCALATION_TOKENS = [
  "AFFECTED",
  "EXPLOITABLE",
  "EXPLOITABILITY",
  "NO_KNOWN_VULNERABILITIES",
  "NO_KNOWN_VULNERABILITY",
  "NO_VULNERABILITIES",
  "PROVEN_VULNERABLE",
  "REACHABLE",
  "RUNTIME_AFFECTED",
  "SAFE",
  "VULNERABILITY_FREE",
  "VULNERABLE",
] as const;

/**
 * The complete frozen T08 limitations.
 *
 * These are the machine-checkable statement of the T08 truth boundary. A
 * normalized dependency record that could contradict any of them cannot exist,
 * because the corresponding field is a literal type rather than a caller value.
 */
export const SENTRDEL_SCA_KNOWN_LIMITATIONS = [
  "A normalized dependency record is an observation of a bounded lockfile delta and is never a Finding.",
  "A normalized dependency record is never a ClaimAssessment, an assurance verdict, or a security PASS.",
  "DEPENDENCY_OBSERVATION != FINDING: a dependency delta is data, never an adjudication.",
  "VERSION_MATCH != VULNERABLE: an advisory version match is a bounded string comparison, never a vulnerability verdict.",
  "ADVISORY_STALE != NO_KNOWN_VULNERABILITY: a stale or unavailable advisory corpus yields UNKNOWN/INCOMPLETE, never a safety claim.",
  "DELTA_ONLY != FULL_GRAPH: dependency-delta is a bounded delta scope and is never a full dependency inventory.",
  "REACHABILITY_NOT_COMPUTED != EXPLOITABLE: reachability is never computed at this pin, in either direction.",
  "SBOM_NOT_CHARACTERIZED != INVENTORY_PROVEN: the sbom capability is not executable and proves no inventory.",
  "SBOM_UNPROVEN != CLEAN: an unproven inventory is never a clean inventory.",
  "NO_MATCH_OVER_PARTIAL != SECURE: zero advisory matches over partial coverage is never a secure claim.",
  "Severity is NEVER_DERIVED at T08; a source-reported advisory severity is omitted rather than converted into canonical severity.",
  "UNSCANNED_SCOPE != CLEAN: scope that was never scanned is recorded, never treated as clean.",
  "UNKNOWN != PASS: an unknown state blocks every stronger claim and is never aggregated away.",
  "SECURITY_PASS != SUPPORTED_CLAIM: a bounded delta observation supports no security claim.",
  "Provenance COMPLETE records where the observation came from, not that the engine is trustworthy.",
  "DEPENDENCY_OBSERVATION is not a T04 claim class requiring mandatory provenance or rule identity; ABSENT/UNRESOLVED provenance and a null rule_id are preserved explicitly and never invented or upgraded.",
  "Aggregate status is conservative and can never reach covered or total scope from a delta-only run.",
  "Normalization is pure: no execution, no network, no clock, no randomness, no filesystem access, no traversal order.",
] as const;

/** The complete frozen SBOM gap limitations. */
export const SENTRDEL_SBOM_KNOWN_LIMITATIONS = [
  "The sbom capability is NOT_CHARACTERIZED at the pinned Sentrdel revision and is never adapter-admitted.",
  "The sbom capability is never invoked, executed, or simulated at T08.",
  "SBOM_UNPROVEN != CLEAN: no SBOM record is ever a clean inventory or a proven absence of dependencies.",
  "The sbom gap is a bounded coverage gap, not a Finding, a ClaimAssessment, or an assurance verdict.",
  "Absence of SBOM findings is never evidence of an absent or complete inventory.",
  "An SBOM inventory remains unproven until a later authorized task and evidence genuinely prove it.",
  "This gap is derived only from the pinned T02 characterization; it is never a caller assertion.",
] as const;

/** Inventory states for the SBOM capability. There is no CLEAN or COMPLETE member. */
export const SENTRDEL_SBOM_INVENTORY_STATES = ["UNPROVEN"] as const;

export type SentrdelSbomInventoryStateV1 =
  (typeof SENTRDEL_SBOM_INVENTORY_STATES)[number];

/** SBOM scope claims. There is no COVERED, COMPLETE, CLEAN, or PASS member. */
export const SENTRDEL_SBOM_SCOPE_CLAIMS = ["UNAVAILABLE"] as const;

export type SentrdelSbomScopeClaimV1 =
  (typeof SENTRDEL_SBOM_SCOPE_CLAIMS)[number];

export interface SentrdelScaRuleIdentityV1 {
  /** null is admissible: T04 does not require a rule identity for this class. */
  readonly rule_id: string | null;
  readonly rule_resolution: SentrdelObservationResolutionStateV1;
  readonly rule_id_is_pinned: boolean;
  readonly rule_id_was_manufactured: false;
}

export interface SentrdelScaDependencyIdentityV1 {
  readonly ecosystem: SentrdelScaEcosystemV1;
  readonly package_name: string;
  readonly observed_version: string;
  readonly is_delta_only: true;
  readonly full_graph_claimed: false;
}

export interface SentrdelScaProvenanceV1 {
  readonly state: SentrdelProvenanceStateV1;
  readonly producer_id: string | null;
  readonly producer_version: string | null;
  readonly collector_ref: string | null;
  readonly provenance_was_manufactured: false;
}

export interface SentrdelScaAdvisoryV1 {
  /** The advisory identity as reported by the pinned source, or null. */
  readonly advisory_ref: string | null;
  /** The identity of the advisory corpus the lookup was made against. */
  readonly advisory_source_ref: string | null;
  readonly freshness_state: SentrdelScaAdvisoryFreshnessStateV1;
  readonly canonical_freshness_token: string | null;
  readonly version_match_state: SentrdelScaVersionMatchStateV1;
  /**
   * Source-reported advisory metadata is preserved as identity only. No
   * severity, exploitability, or reachability is converted or derived here.
   */
  readonly source_reported_severity_recorded: false;
  readonly source_reported_severity_is_canonical: false;
  readonly version_match_is_vulnerability_truth: false;
  readonly advisory_freshness_is_safety_evidence: false;
}

export interface SentrdelScaCoverageV1 {
  readonly observation_state: SentrdelObservationCoverageStateV1;
  readonly aggregate_state: SentrdelAggregateCoverageStateV1;
  readonly dependency_coverage: SentrdelScaDeltaCoverageStateV1;
  readonly unknown_states: readonly string[];
  readonly coverage_loss_reasons: readonly SentrdelCoverageLossReasonV1[];
  readonly is_total: false;
  readonly is_full_graph: false;
  readonly unscanned_is_clean: false;
  readonly unknown_is_pass: false;
  readonly zero_match_implies_clean: false;
  readonly all_dependencies_scanned: false;
  readonly repository_sca_complete: false;
}

/**
 * The bounded, immutable, deterministic normalized dependency record.
 *
 * Every negative field is a literal `false` type, `severity_state` is a literal
 * `NEVER_DERIVED`, `severity_value` is a literal `null`, dependency coverage is a
 * literal `DELTA_ONLY_NOT_FULL_GRAPH`, and there is no field capable of holding
 * a caller-supplied severity, exploitability, or reachability verdict. A
 * Finding, a ClaimAssessment, a vulnerability verdict, a full-graph claim, or a
 * repository-clean claim cannot be expressed at this authority level.
 */
export interface SentrdelScaObservationV1 {
  readonly schema_version: 1;
  readonly dependency_observation_id: string;
  readonly phase_authority: typeof SENTRDEL_SCA_PHASE_AUTHORITY;
  readonly request_id: string;
  readonly attempt_id: string;
  readonly engine_id: typeof SENTRDEL_ENGINE_ID;
  readonly engine_pin: typeof SENTRDEL_PINNED_REVISION;
  readonly engine_tree: typeof SENTRDEL_PINNED_TREE;
  readonly engine_pin_ref: typeof SENTRDEL_PIN_REF;
  readonly engine_version: string;
  readonly source_head: string;
  readonly capability_id: typeof SENTRDEL_SCA_CAPABILITY_ID;
  readonly capability_status: string;
  readonly claim_class: SentrdelObservationClaimClassV1;
  readonly execution_state: SentrdelAdapterExecutionStateV1;
  readonly identity: SentrdelScaDependencyIdentityV1;
  readonly manifest_ref: string;
  readonly reachability_state: SentrdelScaReachabilityStateV1;
  readonly canonical_reachability_token: string | null;
  readonly reachability_computed: false;
  readonly rule: SentrdelScaRuleIdentityV1;
  readonly advisory: SentrdelScaAdvisoryV1;
  readonly provenance: SentrdelScaProvenanceV1;
  readonly coverage: SentrdelScaCoverageV1;
  readonly evidence_ref: string;
  readonly evidence_digest: string;
  readonly evidence_content_persisted: false;
  readonly limitations: readonly string[];
  /**
   * A BEST-EFFORT lexical signal, not an authority grant and not a control.
   *
   * True means some caller-supplied persisted string matched a shape this module
   * associates with a promoted claim, even though this record's structural state
   * denies it. The name deliberately says "shaped text" rather than "claim
   * detected", because the measurement is imprecise in BOTH directions.
   *
   * The KNOWN RESIDUAL IMPRECISIONS, stated rather than left to be discovered:
   *   - A BARE COMMA does not begin a clause, so a prose denial can still mask a
   *     claim joined to it by one.
   *   - A COMMA-LESS coordinating conjunction ("graph is not resolved and inventory
   *     complete") is not a clause boundary either.
   *   - NEGATOR_PATTERN is broad, so a stray "only", "limited" or "partial" in a
   *     clause exempts that clause from the noun sweep.
   * Every one of these is confined to this field. Each leaves the string admitted
   * and unflagged, and none of them can promote anything, because the structural
   * negatives deny the claim on their own and caller text carries no authority.
   * Chasing any of them to zero is an unwinnable arms race, so they are accepted,
   * recorded, and bounded rather than hidden.
   *
   * Therefore NOTHING depends on this field. The load-bearing controls are the
   * literal-false structural negatives and the vocabulary-membership checks,
   * neither of which is lexical and neither of which can be evaded by wording. This
   * field exists so a downstream reader is not misled by prose, and both invariant
   * gates require it to agree with a recomputation so it can be neither hidden nor
   * manufactured.
   */
  readonly promoted_claim_shaped_text_present: boolean;
  readonly caller_text_is_authoritative: false;
  readonly severity_state: SentrdelScaSeverityStateV1;
  readonly severity_value: null;
  readonly effect_facts: SentrdelAdapterEffectCeilingV1;
  readonly network_facts: SentrdelAdapterNetworkPolicyV1;
  readonly egress_facts: SentrdelAdapterEgressPolicyV1;
  readonly authority: SentrdelScaAuthorityV1;
  readonly assurance_effect: "NONE";
  readonly finding_emitted: false;
  readonly claim_assessment_emitted: false;
  readonly dependency_observation_is_finding: false;
  readonly version_match_is_vulnerable: false;
  readonly version_match_is_exploitable: false;
  readonly advisory_stale_is_no_known_vulnerability: false;
  readonly delta_only_is_full_graph: false;
  readonly reachability_is_certain: false;
  readonly exploitability_derived: false;
  readonly remediation_derived: false;
  readonly inventory_complete: false;
  readonly global_clean_claimed: false;
  readonly repository_clean_claimed: false;
  readonly repository_sca_complete_claimed: false;
  readonly remediation_verified: false;
}

/**
 * Bounded, untrusted dependency-delta input. This is input, never truth.
 *
 * There is deliberately NO field that can carry a caller-supplied severity,
 * exploitability, reachability, trust, verdict, or full-graph claim. Those
 * routes are rejected as forbidden keys rather than merely ignored.
 */
export interface SentrdelScaInputV1 {
  readonly schema_version: 1;
  readonly request_id: string;
  readonly attempt_id: string;
  readonly source_head: string;
  readonly engine_id: string;
  readonly engine_pin: string;
  readonly engine_tree: string;
  readonly engine_version: string;
  readonly capability_id: string;
  readonly claim_class: string;
  readonly execution_state: string;
  readonly ecosystem: string;
  readonly package_name: string;
  readonly observed_version: string;
  readonly manifest_ref: string;
  readonly advisory_ref: string | null;
  readonly advisory_source_ref: string | null;
  readonly advisory_freshness_state: string;
  readonly version_match_state: string;
  readonly reachability_state: string;
  readonly rule_id: string | null;
  readonly provenance_state: string;
  readonly producer_id: string | null;
  readonly producer_version: string | null;
  readonly collector_ref: string | null;
  readonly coverage_state: string;
  readonly aggregate_coverage_state: string;
  readonly unknown_states: readonly string[];
  readonly coverage_loss_reasons: readonly string[];
  readonly evidence_ref: string;
  readonly evidence_digest: string;
  readonly limitations: readonly string[];
  readonly effect_facts: string;
  readonly network_facts: string;
  readonly egress_facts: string;
}

export interface SentrdelScaValidationV1 {
  readonly schema_version: 1;
  readonly valid: boolean;
  readonly reasons: readonly string[];
}

export interface SentrdelScaInvariantCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

/**
 * The bounded, immutable SBOM coverage gap.
 *
 * `execution_admitted`, `inventory_proven`, and `executed` are literal `false`
 * types; `inventory_state` is a literal `UNPROVEN`; and `scope_claim` is a
 * literal `UNAVAILABLE`. An SBOM gap therefore cannot be constructed into an
 * executed scan, a proven inventory, or a clean result, even by a caller.
 */
export interface SentrdelSbomGapV1 {
  readonly schema_version: 1;
  readonly phase_authority: typeof SENTRDEL_SCA_PHASE_AUTHORITY;
  readonly capability_id: typeof SENTRDEL_SBOM_CAPABILITY_ID;
  readonly capability_status: "NOT_CHARACTERIZED";
  readonly execution_admitted: false;
  readonly execution_state: "NOT_RUN";
  readonly executed: false;
  readonly inventory_state: SentrdelSbomInventoryStateV1;
  readonly inventory_proven: false;
  readonly coverage_state: SentrdelAggregateCoverageStateV1;
  readonly scope_claim: SentrdelSbomScopeClaimV1;
  readonly reason: typeof SENTRDEL_SBOM_GAP_REASON;
  readonly unknown_states: readonly string[];
  readonly coverage_loss_reasons: readonly SentrdelCoverageLossReasonV1[];
  readonly engine_id: typeof SENTRDEL_ENGINE_ID;
  readonly engine_pin: typeof SENTRDEL_PINNED_REVISION;
  readonly engine_tree: typeof SENTRDEL_PINNED_TREE;
  readonly engine_pin_ref: typeof SENTRDEL_PIN_REF;
  readonly limitations: readonly string[];
  /** See the dependency observation: a best-effort lexical signal, never a control. */
  readonly promoted_claim_shaped_text_present: boolean;
  readonly caller_text_is_authoritative: false;
  readonly authority: SentrdelScaAuthorityV1;
  readonly assurance_effect: "NONE";
  readonly finding_emitted: false;
  readonly claim_assessment_emitted: false;
  readonly execution_record_fabricated: false;
  readonly inventory_fabricated: false;
  readonly findings_observed: 0;
  readonly absence_is_clean: false;
  readonly inventory_complete: false;
  readonly global_clean_claimed: false;
  readonly repository_clean_claimed: false;
  readonly remediation_verified: false;
}

const GIT_SHA1_HEX = /^[a-f0-9]{40}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SOURCE_PATH = /^[A-Za-z0-9._-][A-Za-z0-9._\-/]{0,255}$/u;
/** A package name is a bounded, non-empty, path-free identifier. */
const PACKAGE_NAME = /^[A-Za-z0-9][A-Za-z0-9._@-]{0,127}$/u;
/**
 * An observed version is a bounded, non-empty opaque version token. It is NOT a
 * range, comparator expression, or free-form string: `>=1.0.0` and a blank
 * string are both rejected as malformed dependency identity.
 */
const OBSERVED_VERSION = /^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/u;
const MAX_LIMITATIONS = 32;
const MAX_UNKNOWN_STATES = 32;
const MAX_LOSS_REASONS = 32;
const MAX_OBSERVATIONS = 512;

/**
 * The caller-facing budget for its own limitations.
 *
 * Every emitted record also carries the whole frozen T08 truth boundary, so the
 * canonical cap of 32 applies to the CALLER's entries only. Validating the caller
 * array against the exported budget rather than against the raw cap is what makes
 * the constant describe the bound it claims to describe, instead of leaving a
 * caller to discover a "mysterious rejection" later.
 */
export const SENTRDEL_SCA_CALLER_LIMITATION_BUDGET =
  MAX_LIMITATIONS - SENTRDEL_SCA_KNOWN_LIMITATIONS.length;

/**
 * Build a separator-flexible alternation for a token vocabulary.
 *
 * A multi-word token such as `VULNERABILITY_FREE` or `NO_KNOWN_VULNERABILITY`
 * is written in the canonical vocabulary with underscores, but free text
 * reaches the same claim with hyphens or spaces ("vulnerability-free",
 * "no known vulnerabilities"). Matching the literal underscore form alone would
 * let the hyphenated spelling through verbatim, so each underscore inside a token
 * is compiled to a separator class.
 */
function separatorFlexibleTokens(tokens: readonly string[]): string {
  return tokens
    .map((token) => token.split("_").join("[_\\u2010-\\u2015 \\-]"))
    .join("|");
}

/**
 * A CLAIM-SHAPE sweep, which is deliberately not a spelling allowlist.
 *
 * Enumerating spellings cannot work: free text reaches the same claim in forms no
 * finite list anticipates ("all dependencies scanned", "full graph", "inventory
 * complete", "reachability computed", "unaffected", "zero risk"). Rather than
 * chase spellings, this rejects the SHAPE of a promoted assertion: a coverage or
 * safety NOUN that is asserted as a completed fact rather than negated.
 *
 * A claim is treated as negating, hedged, or descriptive when the same clause
 * carries a negator or an unknown/hedging marker. That is the fail-closed
 * direction: an honest limitation says what was NOT covered, and this permits
 * exactly that. A bare positive assertion of coverage or safety is rejected
 * because a T08 delta observation never earns one.
 */
const COVERAGE_SAFETY_NOUNS = [
  "inventory",
  "graph",
  "sbom",
  "reachability",
  "risk",
  "coverage",
  "scan",
  "scanned",
  "dependency graph",
  "dependency inventory",
  "credential",
  "credentials",
  "secret",
  "secrets",
  "breach",
  "compromise",
  "triage",
  "verification",
  "proof",
  "guarantee",
] as const;

/**
 * Promoted ADJECTIVES and fixed phrases.
 *
 * A noun sweep alone cannot catch a claim whose whole content is an adjective
 * ("unaffected", "trusted", "cleared") or a fixed idiom ("no advisories apply").
 * These are matched directly. A negated form ("not unaffected") is not a real
 * concern here: the structural negatives on the record remain literal-false, so
 * this list narrows the reader-facing text and never grants authority.
 */
const PROMOTED_ADJECTIVES = [
  "unaffected",
  "trusted",
  "cleared",
  "untainted",
  "complete",
  "comprehensive",
  "exhaustive",
  "total",
  "full",
  "unreachable",
  "unexploitable",
  "immutable",
  "authoritative",
] as const;

const PROMOTED_PHRASES = [
  "no advisories apply",
  "no advisory applies",
  "all dependencies",
  "everything is verified",
  "nothing to report",
  "all good",
  "zero findings",
  "no findings",
  "no issues",
  "as expected",
] as const;

/** Negators and hedges: these make a coverage or safety noun honest. */
const NEGATING_MARKERS = [
  "not",
  "no",
  "never",
  "none",
  "cannot",
  "can not",
  "without",
  "unproven",
  "unknown",
  "unavailable",
  "uncomputed",
  "not computed",
  "delta only",
  "delta-only",
  "partial",
  "partial only",
  "bounded",
  "limited",
  "unscanned",
  "not covered",
  "incomplete",
  "narrower",
  "only",
  "merely",
  "is not",
  "does not",
  "did not",
  "stale",
  "deferred",
  "unverified",
  "unresolved",
  "absent",
  "excluded",
  "ignored",
  "skipped",
  "out of scope",
] as const;

const NOUN_PATTERN = new RegExp(
  `(?<![A-Za-z0-9_])(?:${separatorFlexibleTokens(COVERAGE_SAFETY_NOUNS)})(?![A-Za-z0-9_])`,
  "iu",
);

const ADJECTIVE_PATTERN = new RegExp(
  `(?<![A-Za-z0-9_])(?:${separatorFlexibleTokens(PROMOTED_ADJECTIVES)})(?![A-Za-z0-9_])`,
  "iu",
);

const PHRASE_PATTERN = new RegExp(
  // Each phrase is compiled independently and then joined. These phrases contain
  // SPACES, so they must NOT be routed through `separatorFlexibleTokens` and then
  // split on "|": doing so would cut the phrases at that separator and corrupt the
  // alternation, producing a pattern that matches unintended text.
  PROMOTED_PHRASES.map(
    (phrase) => `(?<![A-Za-z0-9_])${phrase}(?![A-Za-z0-9_])`,
  ).join("|"),
  "iu",
);

const NEGATOR_PATTERN = new RegExp(
  `(?<![A-Za-z0-9_])(?:${separatorFlexibleTokens(NEGATING_MARKERS)})(?![A-Za-z0-9_])`,
  "iu",
);

const NO_KNOWN_VULNERABILITY_PATTERN = new RegExp(
  // A "no known ... vulnerabilit(y|ies)" claim is the canonical phrasing of
  // ADVISORY_STALE != NO_KNOWN_VULNERABILITY, and it is reachable in free text
  // with a short intervening noun ("no known dependency vulnerabilities").
  //
  // It is matched by STEM rather than by whole word, because the claim is
  // routinely abbreviated in exactly the forms a whole-word list misses:
  // "vulns", "cve-free", "vuln-free", "zero known vulnerabilities". Matching the
  // stem "vulnerab" catches every one of those. The intervening filler is
  // BOUNDED to a few word characters so an innocent "no" early in a sentence
  // cannot reach an unrelated "vulnerab" many words later. The stem covers both
  // the long and the abbreviated spellings ("vulnerability", "vulns", "vuln-free")
  // because a whole-word list misses the abbreviations, which are exactly the forms
  // a caller reaches for. The trailing check is a LOOKAHEAD ONLY: the stem is a
  // prefix of longer words, so a hard character boundary would reject the very
  // forms being matched.
  "(?<![A-Za-z0-9_])(?:no|zero|none|nil|never)(?![A-Za-z0-9_])[A-Za-z0-9_ -]{0,24}vuln?(?:erab)?",
  "iu",
);

/**
 * A CVE claim with no scope: "cve-free", "no cve", "no cves".
 *
 * A T08 delta observation can never prove the absence of a CVE across a
 * repository, so any unqualified CVE-absence claim is promoted by definition. Two
 * shapes are matched, because both are natural to write and neither implies any
 * evidence: a leading negator ("no cve", "zero cves") and a trailing "free" that
 * is separated rather than hyphen-joined ("cve free", "cve-free"). The separator
 * class admits a hyphen so the hyphen-joined form is caught too.
 */
const CVE_ABSENCE_PATTERN = new RegExp(
  "(?:(?<![A-Za-z0-9_])(?:no|zero|none|without)(?![A-Za-z0-9_])[A-Za-z0-9_\\u2010-\\u2015 -]{0,12}cves?(?![A-Za-z0-9_])(?![A-Za-z0-9_\\u2010-\\u2015 -]{0,16}(?:data|information|record|records|list|details|feed|source|database|available|present|reported))|(?<![A-Za-z0-9_])cves?[A-Za-z0-9_\\u2010-\\u2015 -]{0,4}free(?![A-Za-z0-9_]))",
  "iu",
);

/**
 * A "free of vulnerability" claim in either spelling: "vuln-free",
 * "vulnerability-free", "vuln free".
 *
 * Same reasoning as the CVE pattern: a T08 delta observation can never prove that
 * a dependency is free of a class of problem, so the claim is promoted by
 * construction and must not be admitted into a reader-facing record.
 */
const VULNERABILITY_FREE_PATTERN = new RegExp(
  "(?<![A-Za-z0-9_])vuln?(?:erabilit(?:y|ies))?[A-Za-z0-9_\\u2010-\\u2015 -]{0,4}free(?![A-Za-z0-9_])",
  "iu",
);

/**
 * True when a persisted string asserts a completed coverage or safety fact.
 *
 * Deliberately conservative in the SAFE direction only: it returns true (reject)
 * for a bare positive noun or adjective assertion, and false (permit) when a
 * negator or hedge is present anywhere in the same string. It is a lexical
 * narrowing of the caller-facing text, not an authority claim, so the record's
 * structural negatives remain the load-bearing control.
 */
export function assertsPromotedCoverageOrSafety(value: string): boolean {
  if (PHRASE_PATTERN.test(value)) {
    return true;
  }
  // A "no known vulnerabilities" claim is rejected on its own: it asserts an
  // ABSENCE of risk, which is precisely the ADVISORY_STALE !=
  // NO_KNOWN_VULNERABILITY violation, and a negator must not excuse it.
  if (
    NO_KNOWN_VULNERABILITY_PATTERN.test(value) ||
    CVE_ABSENCE_PATTERN.test(value) ||
    VULNERABILITY_FREE_PATTERN.test(value)
  ) {
    return true;
  }
  if (!NOUN_PATTERN.test(value) && !ADJECTIVE_PATTERN.test(value)) {
    return false;
  }
  return !NEGATOR_PATTERN.test(value);
}

const ESCALATION_PATTERN = new RegExp(
  // The boundary is an asymmetric non-word-character class rather than `\b`,
  // because `\b` requires a word character on BOTH sides: a hyphenated claim such
  // as "vulnerability-free" has a non-word character where the right-hand
  // boundary should be, so `\b` would not match and the claim would be accepted
  // verbatim. `(?<![A-Za-z0-9_])` / `(?![A-Za-z0-9_])` is the correct form.
  `(?<![A-Za-z0-9_])(?:${separatorFlexibleTokens(SENTRDEL_SCA_ESCALATION_TOKENS)})(?![A-Za-z0-9_])`,
  // Case-insensitive. `limitations` is unconstrained bounded text, so an
  // uppercase-only sweep would let "secure, safe" persist verbatim into a
  // reader-facing record while "SECURE, SAFE" was correctly rejected. This is a
  // T08-local change; the frozen T04 pattern is deliberately left untouched.
  "iu",
);

/**
 * A case-insensitive sweep over the CANONICAL T04 attestation vocabulary.
 *
 * The frozen T04 `containsExternalAttestationV1` helper matches uppercase tokens
 * only. That is correct for its own boundary but leaves a bypass at T08, where
 * `limitations` is free bounded text: a caller could write "the repository is
 * secure" or "this delta is clean" and persist it verbatim, because CLEAN and
 * SECURE are attestation words rather than T08 escalation tokens.
 *
 * This reuses the canonical T04 token list verbatim rather than inventing a
 * parallel vocabulary; only the boundary form, separator tolerance, and case
 * sensitivity are T08-local, and the frozen T04 helper is not modified.
 */
const ATTESTATION_PATTERN_CI = new RegExp(
  `(?<![A-Za-z0-9_])(?:${separatorFlexibleTokens(SENTRDEL_EXTERNAL_ATTESTATION_TOKENS)})(?![A-Za-z0-9_])`,
  "iu",
);

const CLAIM_CLASS_SET = new Set<string>(SENTRDEL_OBSERVATION_CLAIM_CLASSES);
const PROVENANCE_SET = new Set<string>(SENTRDEL_PROVENANCE_STATES);
const COVERAGE_STATE_SET = new Set<string>(SENTRDEL_OBSERVATION_COVERAGE_STATES);
const AGGREGATE_STATE_SET = new Set<string>(SENTRDEL_AGGREGATE_COVERAGE_STATES);
const VERSION_MATCH_SET = new Set<string>(SENTRDEL_SCA_VERSION_MATCH_STATES);
const FRESHNESS_SET = new Set<string>(SENTRDEL_SCA_ADVISORY_FRESHNESS_STATES);
const REACHABILITY_SET = new Set<string>(SENTRDEL_SCA_REACHABILITY_STATES);
const ECOSYSTEM_SET = new Set<string>(SENTRDEL_SCA_ECOSYSTEMS);
const LOSS_REASON_SET = new Set<string>(SENTRDEL_COVERAGE_LOSS_REASONS);
const EXECUTION_STATE_SET = new Set<string>(SENTRDEL_ADAPTER_EXECUTION_STATES);
const NON_PRODUCING_SET = new Set<string>(
  SENTRDEL_NON_PRODUCING_EXECUTION_STATES,
);
const CAPABILITY_ID_SET = new Set<string>(SENTRDEL_CAPABILITY_IDS);
const ALLOWED_CAPABILITY_SET = new Set<string>(
  SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES,
);
/**
 * The T04 asymmetry is read from the canonical sets, never hardcoded. Because
 * `DEPENDENCY_OBSERVATION` is absent from both canonical sets, a null rule_id
 * and ABSENT/UNRESOLVED provenance remain admissible here exactly as canonical
 * T04 permits. Imposing T06/T07's stricter rules would fork canonical semantics.
 */
const REQUIRES_RESOLVABLE_PROVENANCE = new Set<string>(
  SENTRDEL_CLAIM_CLASSES_REQUIRING_PROVENANCE,
);
const REQUIRES_RULE_ID = new Set<string>(
  SENTRDEL_CLAIM_CLASSES_REQUIRING_RULE_ID,
);

/**
 * Vocabulary membership sets used by the invariant gates.
 *
 * A gate that only checks that a negative says `false` is incomplete: a
 * hand-built or forged record can attach a promoted value to that same field and
 * still pass. These sets let each gate verify that every state value it carries
 * is an actual member of the canonical vocabulary that owns it, so an
 * out-of-vocabulary promotion is reported rather than ratified.
 */
const UNKNOWN_TOKEN_SET = new Set<string>(SENTRDEL_UNKNOWN_TOKENS);
const RESOLUTION_SET = new Set<string>(SENTRDEL_OBSERVATION_RESOLUTION_STATES);
const CAPABILITY_STATUS_SET = new Set<string>(SENTRDEL_CAPABILITY_STATUSES);

/**
 * Record a vocabulary-membership failure.
 *
 * `owner` names the canonical vocabulary that owns the field, so the reason
 * points at the source of truth rather than at T08.
 */
function requireMember(
  value: unknown,
  vocabulary: ReadonlySet<string>,
  field: string,
  reasons: string[],
): void {
  if (typeof value !== "string" || !vocabulary.has(value)) {
    reasons.push(`${field} must be a member of the canonical vocabulary`);
  }
}

const FROZEN_SCA_LIMITATION_SET: ReadonlySet<string> = new Set<string>(
  SENTRDEL_SCA_KNOWN_LIMITATIONS,
);
const FROZEN_SBOM_LIMITATION_SET: ReadonlySet<string> = new Set<string>(
  SENTRDEL_SBOM_KNOWN_LIMITATIONS,
);

const INPUT_KEYS = [
  "schema_version",
  "request_id",
  "attempt_id",
  "source_head",
  "engine_id",
  "engine_pin",
  "engine_tree",
  "engine_version",
  "capability_id",
  "claim_class",
  "execution_state",
  "ecosystem",
  "package_name",
  "observed_version",
  "manifest_ref",
  "advisory_ref",
  "advisory_source_ref",
  "advisory_freshness_state",
  "version_match_state",
  "reachability_state",
  "rule_id",
  "provenance_state",
  "producer_id",
  "producer_version",
  "collector_ref",
  "coverage_state",
  "aggregate_coverage_state",
  "unknown_states",
  "coverage_loss_reasons",
  "evidence_ref",
  "evidence_digest",
  "limitations",
  "effect_facts",
  "network_facts",
  "egress_facts",
] as const;

/**
 * Input keys that must never be present. These are the routes by which a caller
 * could try to smuggle in a canonical authority object, a caller-supplied trust,
 * severity, exploitability, or reachability verdict, a full-graph or inventory
 * claim, a hidden clean/pass result, or an SBOM execution. They are hard
 * rejections, not silently ignored fields.
 */
export const SENTRDEL_SCA_FORBIDDEN_INPUT_KEYS = [
  "advisory_severity",
  "all_dependencies_scanned",
  "assurance",
  "clean",
  "claim_assessment",
  "complete",
  "complete_inventory",
  "comprehensive_scan",
  "confidence",
  "confirmed_vulnerability",
  "cvss",
  "cvss_score",
  "exploit",
  "exploitability",
  "exploitable",
  "finding",
  "full_graph",
  "full_inventory",
  "global_clean",
  "impact",
  "is_vulnerable",
  "no_known_vulnerability",
  "pass",
  "provenance_trust",
  "reachable",
  "reachability",
  "reachability_computed",
  "remediation",
  "remediation_verified",
  "repository_clean",
  "repository_sca_complete",
  "risk",
  "safe",
  "sbom",
  "sbom_execution",
  "sbom_inventory",
  "sbom_record",
  "secure",
  "severity",
  "severity_state",
  "severity_value",
  "source_reported_severity",
  "totality",
  "trust",
  "trust_level",
  "unaffected",
  "verdict",
  "verified",
  "vulnerability",
  "vulnerable",
  "vulnerability_free",
] as const;

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...keys].sort();
  if (actual.length !== wanted.length) return false;
  return actual.every((key, index) => key === wanted[index]);
}

function isOpaqueId(value: unknown): value is string {
  return typeof value === "string" && OPAQUE_ID.test(value);
}

function isBoundedText(value: unknown): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= 512
  );
}

function isPositiveIntegerOrNull(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && (value as number) >= 1);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * The EFFECTIVE aggregate coverage state, derived rather than trusted.
 *
 * A caller may only reach `COVERED_WITHIN_STATED_SCOPE` when the observation
 * state itself is bounded-complete AND no unknown state remains. Because T08
 * always retains `REACHABILITY_NOT_COMPUTED` (reachability is never computed at
 * this pin), the unknown set is never empty, so a delta-only run can never
 * present as covered. This is the aggregation-level enforcement of
 * DELTA_ONLY != FULL_GRAPH and NO_MATCH_OVER_PARTIAL != SECURE.
 */
function effectiveAggregateState(
  aggregate: string,
  unknownStates: readonly string[],
): string {
  if (aggregate !== "COVERED_WITHIN_STATED_SCOPE") {
    return aggregate;
  }
  return unknownStates.length > 0 ? "PARTIALLY_COVERED" : "COVERED_WITHIN_STATED_SCOPE";
}

/** Canonical code-unit ordering, independent of locale and traversal order. */
function canonicalStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...values].sort(compareText));
}

/** Canonical loss-reason ordering, preserving the frozen T05 identity type. */
function canonicalLossReasons(
  values: readonly SentrdelCoverageLossReasonV1[],
): readonly SentrdelCoverageLossReasonV1[] {
  return Object.freeze([...values].sort(compareText));
}

function scanStrings(
  values: readonly unknown[],
  predicate: (value: string) => boolean,
  reason: string,
  reasons: string[],
): void {
  for (const value of values) {
    if (typeof value === "string" && predicate(value)) {
      reasons.push(reason);
      return;
    }
  }
}

function canonicalizeStringList(
  values: unknown,
  field: string,
  isValid: (value: unknown) => boolean,
  max: number,
  reasons: string[],
): readonly string[] {
  if (!Array.isArray(values)) {
    reasons.push(`${field} must be an array`);
    return Object.freeze([]);
  }
  if (values.length > max) {
    reasons.push(`${field} must contain at most ${max} entries`);
    return Object.freeze([]);
  }
  for (const value of values) {
    if (!isValid(value)) {
      reasons.push(`${field} entries must be bounded canonical tokens`);
      return Object.freeze([]);
    }
  }
  const ordered = [...(values as readonly string[])].sort(compareText);
  const seen = new Set<string>();
  for (const value of ordered) {
    if (seen.has(value)) {
      reasons.push(`${field} must not contain duplicates`);
      return Object.freeze([]);
    }
    seen.add(value);
  }
  return Object.freeze(ordered);
}

/**
 * Deterministic, dependency-free 128-bit digest. No clock, no randomness, no
 * host state: identical inputs always produce an identical derived identifier.
 */
const FNV_PRIME = 0x100000001b3n;
const FNV_MASK = 0xffffffffffffffffn;
const FNV_BASIS_A = 0xcbf29ce484222325n;
const FNV_BASIS_B = 0x84222325cbf29ce4n;

function fnv1a64(text: string, basis: bigint): string {
  let hash = basis;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    hash ^= BigInt(code & 0xff);
    hash = (hash * FNV_PRIME) & FNV_MASK;
    hash ^= BigInt((code >>> 8) & 0xff);
    hash = (hash * FNV_PRIME) & FNV_MASK;
  }
  return hash.toString(16).padStart(16, "0");
}

function canonicalDigestV1(text: string): string {
  return `${fnv1a64(text, FNV_BASIS_A)}${fnv1a64(text, FNV_BASIS_B)}`;
}

/**
 * Deterministic dependency observation identity. It binds the request, attempt,
 * engine pin, source head, dependency identity, manifest, advisory, and evidence
 * digest, so a record can never be silently reused across a different request,
 * engine, source position, or dependency.
 */
function dependencyObservationIdV1(input: SentrdelScaInputV1): string {
  return `dependency-observation:sentrdel:${canonicalDigestV1(
    [
      "sentrdel-dependency-observation-v1",
      input.request_id,
      input.attempt_id,
      input.capability_id,
      input.engine_pin,
      input.source_head,
      input.ecosystem,
      input.package_name,
      input.observed_version,
      input.manifest_ref,
      input.advisory_ref ?? "ADVISORY_ABSENT",
      input.advisory_freshness_state,
      input.version_match_state,
      input.rule_id ?? "RULE_ABSENT",
      input.evidence_digest,
    ].join("|"),
  )}`;
}

/**
 * Fail-closed validation of bounded dependency-delta input.
 *
 * Every defect yields a non-empty reason list; a caller must not emit a
 * normalized dependency record in that case, so malformed input can never look
 * like a successful or clean SCA scan.
 */
export function validateSentrdelScaInputV1(
  input: unknown,
): SentrdelScaValidationV1 {
  const reasons: string[] = [];

  if (!isRecord(input)) {
    return {
      schema_version: 1,
      valid: false,
      reasons: Object.freeze(["dependency input must be an object"]),
    };
  }

  if (!hasExactKeys(input, INPUT_KEYS)) {
    reasons.push("dependency input contains missing or unsupported fields");
  }

  // No canonical authority, caller-supplied trust, severity, exploitability,
  // reachability, full-graph, inventory, SBOM, or clean/pass claim may ride in.
  for (const forbidden of SENTRDEL_SCA_FORBIDDEN_INPUT_KEYS) {
    if (input[forbidden] !== undefined) {
      reasons.push(`dependency input must never carry ${forbidden}`);
    }
  }

  if (input["schema_version"] !== SENTRDEL_SCA_SCHEMA_VERSION) {
    reasons.push("dependency input schema version must be 1");
  }
  if (!isOpaqueId(input["request_id"])) {
    reasons.push("request_id must be a bounded opaque identifier");
  }
  if (!isOpaqueId(input["attempt_id"])) {
    reasons.push("attempt_id must be a bounded opaque identifier");
  }

  if (input["engine_id"] !== SENTRDEL_ENGINE_ID) {
    reasons.push("engine id must be engine:sentrdel");
  }
  if (input["engine_pin"] !== SENTRDEL_PINNED_REVISION) {
    reasons.push("engine pin must equal the live-verified Sentrdel pin");
  }
  if (input["engine_tree"] !== SENTRDEL_PINNED_TREE) {
    reasons.push("engine tree must equal the live-verified Sentrdel tree");
  }
  if (input["engine_version"] !== SENTRDEL_ENGINE_VERSION) {
    reasons.push("engine version must equal the pinned Sentrdel version");
  }
  if (
    typeof input["source_head"] !== "string" ||
    !GIT_SHA1_HEX.test(input["source_head"])
  ) {
    reasons.push("source_head must be a 40 character lowercase hex sha");
  }

  // Exactly one capability, and it must be the dependency-delta capability. The
  // sbom capability is refused here: at this pin it is NOT_CHARACTERIZED and is
  // never executed, so an SBOM input can never be normalized as a scan.
  const capabilityId = input["capability_id"];
  if (!CAPABILITY_ID_SET.has(capabilityId as string)) {
    reasons.push(`unknown capability identity rejected: ${String(capabilityId)}`);
  } else if (capabilityId === SENTRDEL_SBOM_CAPABILITY_ID) {
    reasons.push(
      "the sbom capability is NOT_CHARACTERIZED and is never normalized as a scan",
    );
  } else if (capabilityId !== SENTRDEL_SCA_CAPABILITY_ID) {
    reasons.push("T08 normalizes dependency-delta only");
  } else if (!ALLOWED_CAPABILITY_SET.has(capabilityId as string)) {
    reasons.push("the requested capability is not adapter-admitted at this pin");
  }

  const claimClass = input["claim_class"];
  if (!CLAIM_CLASS_SET.has(claimClass as string)) {
    reasons.push("claim class is unknown");
  } else if (claimClass !== SENTRDEL_SCA_CLAIM_CLASS) {
    reasons.push("T08 accepts DEPENDENCY_OBSERVATION only");
  }

  const executionState = input["execution_state"];
  if (!EXECUTION_STATE_SET.has(executionState as string)) {
    reasons.push("execution state is unknown");
  }
  if (!VERSION_MATCH_SET.has(input["version_match_state"] as string)) {
    reasons.push("version match state is unknown");
  }
  if (!FRESHNESS_SET.has(input["advisory_freshness_state"] as string)) {
    reasons.push("advisory freshness state is unknown");
  }
  if (!REACHABILITY_SET.has(input["reachability_state"] as string)) {
    reasons.push("reachability state is unknown");
  }
  if (!PROVENANCE_SET.has(input["provenance_state"] as string)) {
    reasons.push("provenance state is unknown");
  }
  if (!COVERAGE_STATE_SET.has(input["coverage_state"] as string)) {
    reasons.push("coverage state is unknown");
  }
  if (!AGGREGATE_STATE_SET.has(input["aggregate_coverage_state"] as string)) {
    reasons.push("aggregate coverage state is unknown");
  }
  if (!ECOSYSTEM_SET.has(input["ecosystem"] as string)) {
    reasons.push("ecosystem is outside the pinned capability vocabulary");
  }

  if (
    !SENTRDEL_ADAPTER_EFFECT_CEILINGS.includes(
      input["effect_facts"] as SentrdelAdapterEffectCeilingV1,
    )
  ) {
    reasons.push("effect facts exceed the canonical ceiling vocabulary");
  } else if (input["effect_facts"] !== "E0_READ_ONLY_ANALYSIS") {
    reasons.push("effect facts must remain E0_READ_ONLY_ANALYSIS in T08");
  }
  if (
    !SENTRDEL_ADAPTER_NETWORK_POLICIES.includes(
      input["network_facts"] as SentrdelAdapterNetworkPolicyV1,
    )
  ) {
    reasons.push("network facts are outside the canonical policy vocabulary");
  } else if (input["network_facts"] !== "NO_NETWORK") {
    reasons.push("network facts must remain NO_NETWORK in T08");
  }
  if (
    !SENTRDEL_ADAPTER_EGRESS_POLICIES.includes(
      input["egress_facts"] as SentrdelAdapterEgressPolicyV1,
    )
  ) {
    reasons.push("egress facts are outside the canonical policy vocabulary");
  } else if (input["egress_facts"] !== "NO_EGRESS") {
    reasons.push("egress facts must remain NO_EGRESS in T08");
  }

  // Dependency identity: preserved exactly, never widened or invented. A
  // malformed package name or version is a hard rejection, because a dependency
  // identity that cannot be parsed can never support a bounded observation.
  const packageName = input["package_name"];
  if (typeof packageName !== "string" || !PACKAGE_NAME.test(packageName)) {
    reasons.push("package_name must be a bounded dependency identifier");
  }
  const observedVersion = input["observed_version"];
  if (
    typeof observedVersion !== "string" ||
    !OBSERVED_VERSION.test(observedVersion)
  ) {
    reasons.push(
      "observed_version must be a bounded exact version token, not a range or blank",
    );
  }
  if (
    typeof observedVersion === "string" &&
    /[<>~^*|,\s]/u.test(observedVersion)
  ) {
    reasons.push("observed_version must not carry a range or comparator expression");
  }

  // The manifest must be the pinned lockfile for the declared ecosystem. The
  // pinned T02 capability supports CARGO_AND_NPM_LOCKFILES_ONLY, so any other
  // manifest is an unsupported-scope claim rather than a bounded observation.
  const manifestRef = input["manifest_ref"];
  if (typeof manifestRef !== "string" || !SOURCE_PATH.test(manifestRef)) {
    reasons.push("manifest_ref must be a bounded repository-relative path");
  } else if (ECOSYSTEM_SET.has(input["ecosystem"] as string)) {
    const ecosystem = input["ecosystem"] as keyof typeof SENTRDEL_SCA_PINNED_LOCKFILES;
    const pinnedLockfile = SENTRDEL_SCA_PINNED_LOCKFILES[ecosystem];
    if (
      !manifestRef.endsWith(`/${pinnedLockfile}`) &&
      manifestRef !== pinnedLockfile
    ) {
      reasons.push(
        `manifest_ref must be the pinned ${pinnedLockfile} lockfile for ${ecosystem}`,
      );
    }
  }

  // Advisory identity: preserved exactly, never invented. A reported match must
  // carry the advisory it matched; a non-match must not fabricate one.
  const advisoryRef = input["advisory_ref"];
  if (advisoryRef !== null && !isOpaqueId(advisoryRef)) {
    reasons.push("advisory_ref must be null or a bounded opaque identifier");
  }
  const advisorySourceRef = input["advisory_source_ref"];
  if (advisorySourceRef !== null && !isOpaqueId(advisorySourceRef)) {
    reasons.push("advisory_source_ref must be null or a bounded opaque identifier");
  }

  // Rule identity: preserved, never invented. T04 does not require a rule
  // identity for DEPENDENCY_OBSERVATION, so a null rule_id stays admissible.
  const ruleId = input["rule_id"];
  if (ruleId !== null && !isOpaqueId(ruleId)) {
    reasons.push("rule_id must be null or a bounded opaque identifier");
  }
  if (REQUIRES_RULE_ID.has(claimClass as string) && ruleId === null) {
    reasons.push("a dependency observation requires a pinned rule identity");
  }

  // Provenance: preserved exactly. A COMPLETE state requires every field, and an
  // ABSENT/UNRESOLVED state is preserved rather than being filled in. The
  // canonical T04 asymmetry is respected: DEPENDENCY_OBSERVATION is not in the
  // requiring-provenance set, so an unattributed delta stays admissible here.
  if (input["provenance_state"] === "COMPLETE") {
    for (const key of ["producer_id", "producer_version", "collector_ref"]) {
      if (input[key] === null) {
        reasons.push(`provenance ${key} is required when state is COMPLETE`);
      }
    }
  }
  for (const key of ["producer_id", "producer_version", "collector_ref"]) {
    const value = input[key];
    if (value !== null && !isOpaqueId(value)) {
      reasons.push(`provenance ${key} must be null or a bounded opaque identifier`);
    }
  }
  if (REQUIRES_RESOLVABLE_PROVENANCE.has(claimClass as string)) {
    if (
      input["provenance_state"] === "ABSENT" ||
      input["provenance_state"] === "UNRESOLVED"
    ) {
      reasons.push(
        `claim class ${String(claimClass)} requires resolvable provenance`,
      );
    }
  }

  if (!isOpaqueId(input["evidence_ref"])) {
    reasons.push("evidence_ref must be a bounded opaque identifier");
  }
  if (
    typeof input["evidence_digest"] !== "string" ||
    !SHA256_HEX.test(input["evidence_digest"])
  ) {
    reasons.push("evidence_digest must be a 64 character hex sha256");
  }

  const unknownStates = canonicalizeStringList(
    input["unknown_states"],
    "unknown_states",
    isOpaqueId,
    MAX_UNKNOWN_STATES,
    reasons,
  );
  const lossReasons = canonicalizeStringList(
    input["coverage_loss_reasons"],
    "coverage_loss_reasons",
    isOpaqueId,
    MAX_LOSS_REASONS,
    reasons,
  );
  for (const reason of lossReasons) {
    if (!LOSS_REASON_SET.has(reason)) {
      reasons.push(`coverage loss reason is not canonical: ${reason}`);
    }
  }
  const limitations = canonicalizeStringList(
    input["limitations"],
    "limitations",
    isBoundedText,
    SENTRDEL_SCA_CALLER_LIMITATION_BUDGET,
    reasons,
  );
  if (limitations.length === 0) {
    reasons.push("a normalized dependency observation must state explicit limitations");
  }

  // ---------------------------------------------------------------------
  // Contradiction guards. Each pair below is an impossible dependency state
  // and fails closed rather than being silently accepted.
  // ---------------------------------------------------------------------
  const versionMatchState = input["version_match_state"];
  const freshnessState = input["advisory_freshness_state"];
  const coverageState = input["coverage_state"];
  const aggregateState = input["aggregate_coverage_state"];
  const freshnessToken = SENTRDEL_SCA_FRESHNESS_CANONICAL_TOKENS[
    freshnessState as keyof typeof SENTRDEL_SCA_FRESHNESS_CANONICAL_TOKENS
  ];

  // ADVISORY_STALE != NO_KNOWN_VULNERABILITY. A zero-match observation over a
  // stale, unavailable, or unknown advisory corpus must carry the canonical
  // unknown token, so the record can never read as a safety claim. A confirmed
  // freshness state may not carry the stale token: that is a contradiction.
  if (
    freshnessToken !== null &&
    freshnessToken !== undefined &&
    !unknownStates.includes(freshnessToken)
  ) {
    reasons.push(
      `advisory freshness ${String(freshnessState)} must declare unknown token ${freshnessToken}`,
    );
  }
  if (freshnessState === "ADVISORY_FRESHNESS_CONFIRMED") {
    if (lossReasons.includes("STALE_ADVISORY_STATE")) {
      reasons.push(
        "confirmed advisory freshness contradicts the STALE_ADVISORY_STATE loss reason",
      );
    }
    if (unknownStates.includes("ADVISORY_STALE_UNAVAILABLE")) {
      reasons.push(
        "confirmed advisory freshness contradicts the ADVISORY_STALE_UNAVAILABLE unknown state",
      );
    }
  }
  // A stale or unavailable advisory corpus must be declared as a coverage loss,
  // because it destroys the completeness of the scope claim.
  if (
    freshnessState === "STALE_ADVISORY_STATE" &&
    !lossReasons.includes("STALE_ADVISORY_STATE")
  ) {
    reasons.push("a stale advisory corpus must declare the STALE_ADVISORY_STATE loss");
  }
  if (
    (freshnessState === "ADVISORY_CORPUS_UNAVAILABLE" ||
      freshnessState === "UNKNOWN") &&
    !lossReasons.includes("STALE_ADVISORY_STATE") &&
    !lossReasons.includes("ENGINE_UNAVAILABLE")
  ) {
    reasons.push(
      "an unavailable or unknown advisory corpus must declare a canonical coverage loss",
    );
  }
  // A reported advisory version match must carry the advisory it matched.
  // Without one, the "match" would be an invented reference.
  if (
    versionMatchState === "ADVISORY_VERSION_MATCH_OBSERVED" &&
    advisoryRef === null
  ) {
    reasons.push("an observed advisory version match must carry its advisory reference");
  }
  // A non-match must not fabricate an advisory reference, and an unknown match
  // state must not carry one either.
  if (
    (versionMatchState === "NO_ADVISORY_MATCH_IN_STATED_SCOPE" ||
      versionMatchState === "UNKNOWN") &&
    advisoryRef !== null
  ) {
    reasons.push(
      "a non-matching or unknown version match state must not carry an advisory reference",
    );
  }
  // NO_MATCH_OVER_PARTIAL != SECURE. A zero-match delta may never present as
  // covered scope. The guard tests the CALLER-SUPPLIED aggregate, not the derived
  // one: `effectiveAggregateState` deliberately downgrades a covered aggregate to
  // PARTIALLY_COVERED when unknowns survive, so testing the derived value would
  // make this guard permanently unsatisfiable and therefore decorative.
  if (
    versionMatchState === "NO_ADVISORY_MATCH_IN_STATED_SCOPE" &&
    aggregateState === "COVERED_WITHIN_STATED_SCOPE"
  ) {
    reasons.push(
      "a zero-match delta observation may not claim bounded-complete covered scope",
    );
  }
  // DELTA_ONLY != FULL_GRAPH, at the aggregation level. A covered aggregate that
  // still carries unknown states is a promotion, so it is rejected outright
  // rather than merely downgraded.
  if (
    aggregateState === "COVERED_WITHIN_STATED_SCOPE" &&
    unknownStates.length > 0
  ) {
    reasons.push(
      "a covered aggregate scope may never coexist with declared unknown states",
    );
  }
  if (aggregateState === "COVERED_WITHIN_STATED_SCOPE" && coverageState === "UNSCANNED") {
    reasons.push("covered aggregate scope contradicts unscanned coverage");
  }
  if (
    aggregateState === "COVERED_WITHIN_STATED_SCOPE" &&
    coverageState !== "COMPLETE_WITHIN_STATED_SCOPE"
  ) {
    reasons.push(
      "a covered aggregate scope requires a complete observation state within the stated scope",
    );
  }
  if (
    versionMatchState === "ADVISORY_VERSION_MATCH_OBSERVED" &&
    coverageState === "UNSCANNED"
  ) {
    reasons.push("an observed advisory version match contradicts unscanned coverage");
  }
  if (
    versionMatchState === "ADVISORY_VERSION_MATCH_OBSERVED" &&
    aggregateState === "NOT_COVERED"
  ) {
    reasons.push(
      "an observed advisory version match contradicts not-covered aggregate scope",
    );
  }

  // REACHABILITY_NOT_COMPUTED must stay explicit. The canonical token is
  // required in the unknown states so reachability can never disappear, and the
  // canonical loss is required so it can never be aggregated away.
  const reachabilityToken = SENTRDEL_SCA_REACHABILITY_CANONICAL_TOKENS[
    input["reachability_state"] as keyof typeof SENTRDEL_SCA_REACHABILITY_CANONICAL_TOKENS
  ];
  if (
    reachabilityToken !== null &&
    reachabilityToken !== undefined &&
    !unknownStates.includes(reachabilityToken)
  ) {
    reasons.push(
      `reachability state ${String(input["reachability_state"])} must declare unknown token ${reachabilityToken}`,
    );
  }
  if (!lossReasons.includes("UNKNOWN_REACHABILITY")) {
    reasons.push(
      "a T08 dependency observation must declare the UNKNOWN_REACHABILITY loss",
    );
  }
  // DELTA_ONLY != FULL_GRAPH. A covered aggregate over a delta scope may never be
  // paired with a zero-length unknown set, because reachability is never computed.
  if (
    aggregateState === "COVERED_WITHIN_STATED_SCOPE" &&
    unknownStates.length === 0
  ) {
    reasons.push(
      "a covered aggregate scope may never present a dependency observation with no unknown state",
    );
  }
  if (aggregateState === "COVERED_WITHIN_STATED_SCOPE" && coverageState === "UNSCANNED") {
    reasons.push("covered aggregate scope contradicts unscanned coverage");
  }
  if (
    coverageState === "COMPLETE_WITHIN_STATED_SCOPE" &&
    (unknownStates.length > 0 || lossReasons.length > 0)
  ) {
    reasons.push("bounded-complete coverage contradicts its unknown or loss data");
  }
  if (coverageState === "UNKNOWN" && unknownStates.length === 0) {
    reasons.push("UNKNOWN coverage requires at least one unknown state");
  }
  if (versionMatchState === "UNKNOWN" && unknownStates.length === 0) {
    reasons.push("an UNKNOWN version match state requires at least one unknown state");
  }

  // A dependency version may only be reported by a capability that actually
  // executed. AVAILABLE is the admitted-but-not-yet-run state and is equally
  // incapable of having produced a match.
  if (executionState !== "EXECUTED" && versionMatchState !== "UNKNOWN") {
    reasons.push(
      `execution state ${String(executionState)} produced no observation and may not report one`,
    );
  }
  if (NON_PRODUCING_SET.has(executionState as string)) {
    const requiredReason =
      SENTRDEL_EXECUTION_STATE_LOSS_REASON[executionState as string];
    if (requiredReason !== undefined && !lossReasons.includes(requiredReason)) {
      reasons.push(
        `execution state ${String(executionState)} must declare coverage loss ${requiredReason}`,
      );
    }
  }

  // Advisory, self-attestation, and escalation boundaries over every persisted
  // string. This is the last line of defence: even if a future field were added,
  // a pinned secret shape, an external self-attestation token, or a
  // vulnerability/exploitability/reachability/safety escalation token in any
  // persisted string is a hard rejection.
  const persistedStrings: unknown[] = [
    input["request_id"],
    input["attempt_id"],
    input["ecosystem"],
    packageName,
    observedVersion,
    manifestRef,
    advisoryRef,
    advisorySourceRef,
    freshnessState,
    versionMatchState,
    input["reachability_state"],
    ruleId,
    input["producer_id"],
    input["producer_version"],
    input["collector_ref"],
    input["evidence_ref"],
    input["evidence_digest"],
    ...unknownStates,
    ...lossReasons,
    ...limitations,
  ];
  scanStrings(
    persistedStrings,
    containsSecretMaterialV1,
    "dependency input must not carry secret material",
    reasons,
  );
  // Self-attestation and secret-shape detection remain HARD REJECTIONS, because
  // both are matched against a closed canonical vocabulary with no negator
  // exemption, and both are structurally incapable of appearing in an honest
  // limitation.
  //
  // Promoted coverage and safety ASSERTIONS, by contrast, are NOT rejected here.
  // That detection is inherently lexical, and a lexical predicate over free text
  // was measured to be unsound in BOTH directions: it admits paraphrases and
  // negation-evasions, and it rejects the module's own frozen boundary statements
  // and honest text such as "no cve data available". Every additional vocabulary
  // round traded one failure mode for the other.
  //
  // So caller text is admitted as DESCRIPTIVE metadata and the detection result is
  // DERIVED and RECORDED on the record as `promoted_claim_shaped_text_present`, where the
  // invariant gates verify it. Caller text therefore never grants authority: the
  // load-bearing controls are the literal-false structural negatives and the
  // vocabulary-membership checks, which are not lexical and cannot be evaded by
  // wording. A detected promoted claim is surfaced as a recorded fact for a
  // downstream reader, not silently trusted and not used to reject a scan.
  // CallER text only. The frozen boundary is subtracted rather than scanned,
  // because those statements are canonical text this module authors and several
  // of them deliberately NAME a claim in order to DENY it ("UNKNOWN != PASS").
  const callerText = limitations.filter(
    (limitation) => !FROZEN_SCA_LIMITATION_SET.has(limitation),
  );

  // Two CLOSED-VOCABULARY rejections, restored deliberately.
  //
  // The fuzzy prose inference (claim-shape nouns, adjectives, phrases) is an
  // advisory annotation only, because it was measured to be unsound. These two are
  // different in kind: each matches a FINITE canonical token list with no negator
  // exemption, so neither can misfire on honest prose. They therefore remain HARD
  // REJECTIONS, which is also what canonical T04 does and what T06 and T07 do.
  // Dropping them would have silently forked the frozen T04 boundary.
  scanStrings(
    callerText,
    containsExternalAttestationV1,
    "dependency input must never self-attest",
    reasons,
  );
  scanStrings(
    callerText,
    (value) => ESCALATION_PATTERN.test(value),
    "dependency input must not carry a vulnerability, exploitability, reachability, or safety claim",
    reasons,
  );

  return {
    schema_version: 1,
    valid: reasons.length === 0,
    reasons: Object.freeze([...new Set(reasons)].sort()),
  };
}

/**
 * A PROSE denial operator, which negates the clause it sits in.
 *
 * A canonical boundary statement is written as a denial: "no proof of
 * exploitability was produced", "clean corpus metadata is not evidence of safety".
 * Treating such text as a claim was a false annotation on an advisory field.
 *
 * The SYMBOLIC operators (`!=`, `!==`, `≠`, `<>`) are deliberately NOT members of
 * this pattern. They are handled by splitting, not by exemption: an operator denies
 * only what FOLLOWS it, whereas a clause-wide exemption also excuses whatever
 * precedes it. Folding them in here is what previously made the segment split
 * unreachable dead code.
 */
const PROSE_DENIAL_PATTERN = new RegExp(
  "(?<![A-Za-z0-9_])(?:is|are|was|were|does|do|did)(?![A-Za-z0-9_])[A-Za-z0-9_\\u2010-\\u2015 -]{0,6}(?<![A-Za-z0-9_])not(?![A-Za-z0-9_])|(?<![A-Za-z0-9_])no(?![A-Za-z0-9_])[A-Za-z0-9_\\u2010-\\u2015 -]{0,8}(?<![A-Za-z0-9_])proof(?![A-Za-z0-9_])|(?<![A-Za-z0-9_])not(?![A-Za-z0-9_])[A-Za-z0-9_\\u2010-\\u2015 -]{0,8}(?<![A-Za-z0-9_])evidence(?![A-Za-z0-9_])",
  "iu",
);

/** A symbolic denial operator. Whatever follows one is denied, not asserted. */
const SYMBOLIC_DENIAL_SPLIT = /(?:!==|!=|≠|<>)/u;

/**
 * Split a string into assertion clauses.
 *
 * A clause boundary is a sentence terminator, a semicolon, a dash, or a comma
 * followed by a coordinating conjunction that introduces a new assertion. A bare
 * comma is NOT a boundary, because it routinely joins a qualifier to its noun;
 * treating it as one would let a single trailing negator exempt every earlier
 * clause, which is exactly the evasion this split exists to prevent.
 */
function splitClauses(value: string): readonly string[] {
  return value
    // A dash of ANY kind is NOT a clause boundary, not just a plain hyphen. The
    // separator-flexible patterns deliberately admit en and em dashes, so treating
    // them as boundaries here would tear apart exactly the tokens those patterns
    // exist to catch, such as "cve-free" and "cve—free".
    //
    // `!` is a boundary only when it does NOT begin `!=`, because the `!` in a
    // canonical boundary statement like "ADVISORY_STALE != NO_KNOWN_VULNERABILITY"
    // is part of the denial operator, not a sentence terminator.
    .split(/[.;?\n]+|!(?!=)|,\s*(?:and|but|so|then|yet)\s+/u)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);
}

/**
 * Split a clause at its FIRST symbolic denial operator.
 *
 * Only the text BEFORE the operator is asserted; everything after it is the thing
 * being denied. That asymmetry is the whole point, and it is what makes a trailing
 * operator unable to smuggle a claim: "inventory is complete, this != a claim"
 * still asserts "inventory is complete" and is flagged, while the canonical
 * boundary statement "ADVISORY_STALE != NO_KNOWN_VULNERABILITY" asserts nothing
 * before its operator and is correctly read as a pure denial.
 */
function assertableTextBeforeDenialOperator(clause: string): string {
  const boundary = SYMBOLIC_DENIAL_SPLIT.exec(clause);
  return boundary === null ? clause : clause.slice(0, boundary.index);
}

/**
 * Derive whether any caller-supplied persisted string asserts a promoted claim.
 *
 * Negation is evaluated CLAUSE BY CLAUSE, never string-wide. A string-wide denial
 * test is itself an evasion: prefixing a denial ("repository is not vulnerable,
 * all dependencies scanned") suppressed the annotation for a bare promoted claim
 * in a different clause. A denial exempts only the clause it appears in, so a
 * canonical boundary statement is correctly read as a denial while a smuggled
 * claim beside it is still recorded.
 *
 * This is a RECORDED FACT, not an authority grant and not a rejection. It exists
 * so a downstream reader can see that a persisted string made a promoted
 * assertion even though the record's structural state denies it. It is advisory by
 * construction: the gates verify the field is internally consistent, and the
 * literal-false negatives remain the sole load-bearing control.
 */
export function detectPromotedClaimInStrings(
  values: readonly string[],
): boolean {
  return values.some((value) => {
    for (const clause of splitClauses(value)) {
      // A PROSE denial ("no proof of", "is not", "not evidence") negates the whole
      // clause it appears in, so the clause is exempt outright.
      if (PROSE_DENIAL_PATTERN.test(clause)) {
        continue;
      }
      // A SYMBOLIC denial operator is narrower: it negates only what FOLLOWS it.
      // Only the text before it is asserted, so a claim written before a trailing
      // operator is still recorded.
      const asserted = assertableTextBeforeDenialOperator(clause);
      if (PHRASE_PATTERN.test(asserted)) {
        return true;
      }
      if (
        NO_KNOWN_VULNERABILITY_PATTERN.test(asserted) ||
        CVE_ABSENCE_PATTERN.test(asserted) ||
        VULNERABILITY_FREE_PATTERN.test(asserted)
      ) {
        return true;
      }
      if (ESCALATION_PATTERN.test(asserted)) {
        return true;
      }
      if (ATTESTATION_PATTERN_CI.test(asserted) && !NEGATOR_PATTERN.test(asserted)) {
        return true;
      }
      if (assertsPromotedCoverageOrSafety(asserted)) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Normalize one bounded dependency-delta input into an immutable observation.
 *
 * Identity, manifest, advisory, freshness, version match, reachability, rule,
 * provenance, and coverage are carried through exactly as reported. The delta
 * coverage state, the canonical tokens, the severity state, and every negative
 * claim are DERIVED here — never supplied by a caller. Fails closed: on any
 * validation defect no record is produced, so malformed input can never look
 * like a clean SCA scan.
 */
export function normalizeSentrdelScaInputV1(
  input: unknown,
): SentrdelScaObservationV1 | undefined {
  const validation = validateSentrdelScaInputV1(input);
  if (!validation.valid) {
    return undefined;
  }
  const record = input as SentrdelScaInputV1;

  const capability = getSentrdelCapabilityV1(
    buildSentrdelCapabilitiesV1(),
    SENTRDEL_SCA_CAPABILITY_ID,
  );

  const freshnessState =
    record.advisory_freshness_state as SentrdelScaAdvisoryFreshnessStateV1;
  const freshnessToken = SENTRDEL_SCA_FRESHNESS_CANONICAL_TOKENS[freshnessState];
  const reachabilityState =
    record.reachability_state as SentrdelScaReachabilityStateV1;
  const reachabilityToken =
    SENTRDEL_SCA_REACHABILITY_CANONICAL_TOKENS[reachabilityState];

  const unknownStates = canonicalStrings(record.unknown_states);
  const aggregateState = effectiveAggregateState(
    record.aggregate_coverage_state,
    unknownStates,
  );

  // Dependency coverage is derived, never supplied: DELTA_ONLY_NOT_FULL_GRAPH is
  // the only member of the vocabulary, so no caller can widen it. The aggregate
  // state is likewise derived, so a caller cannot purchase a covered aggregate.
  const coverage: SentrdelScaCoverageV1 = Object.freeze({
    observation_state: record.coverage_state as SentrdelObservationCoverageStateV1,
    aggregate_state: aggregateState as SentrdelAggregateCoverageStateV1,
    dependency_coverage: "DELTA_ONLY_NOT_FULL_GRAPH",
    unknown_states: unknownStates,
    coverage_loss_reasons: canonicalLossReasons(
      record.coverage_loss_reasons as readonly SentrdelCoverageLossReasonV1[],
    ),
    is_total: false as const,
    is_full_graph: false as const,
    unscanned_is_clean: false as const,
    unknown_is_pass: false as const,
    zero_match_implies_clean: false as const,
    all_dependencies_scanned: false as const,
    repository_sca_complete: false as const,
  });

  const advisory: SentrdelScaAdvisoryV1 = Object.freeze({
    advisory_ref: record.advisory_ref,
    advisory_source_ref: record.advisory_source_ref,
    freshness_state: freshnessState,
    canonical_freshness_token: freshnessToken ?? null,
    version_match_state: record.version_match_state as SentrdelScaVersionMatchStateV1,
    // A source-reported advisory severity is deliberately OMITTED: no
    // authorized canonical field exists for it at this pin, so it is never
    // recorded, converted, or promoted into Ascout canonical severity.
    source_reported_severity_recorded: false as const,
    source_reported_severity_is_canonical: false as const,
    version_match_is_vulnerability_truth: false as const,
    advisory_freshness_is_safety_evidence: false as const,
  });

  const observation: SentrdelScaObservationV1 = {
    schema_version: 1,
    dependency_observation_id: dependencyObservationIdV1(record),
    phase_authority: SENTRDEL_SCA_PHASE_AUTHORITY,
    request_id: record.request_id,
    attempt_id: record.attempt_id,
    engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE,
    engine_pin_ref: SENTRDEL_PIN_REF,
    engine_version: SENTRDEL_ENGINE_VERSION,
    source_head: record.source_head,
    capability_id: SENTRDEL_SCA_CAPABILITY_ID,
    capability_status: capability?.status ?? "UNRESOLVED",
    claim_class: "DEPENDENCY_OBSERVATION",
    execution_state: record.execution_state as SentrdelAdapterExecutionStateV1,
    identity: Object.freeze({
      ecosystem: record.ecosystem as SentrdelScaEcosystemV1,
      package_name: record.package_name,
      observed_version: record.observed_version,
      is_delta_only: true as const,
      full_graph_claimed: false as const,
    }),
    manifest_ref: record.manifest_ref,
    reachability_state: reachabilityState,
    canonical_reachability_token: reachabilityToken ?? null,
    reachability_computed: false as const,
    rule: Object.freeze({
      rule_id: record.rule_id,
      rule_resolution: record.rule_id === null ? "ABSENT" : "PRESENT",
      rule_id_is_pinned: record.rule_id !== null,
      rule_id_was_manufactured: false as const,
    }),
    advisory,
    provenance: Object.freeze({
      state: record.provenance_state as SentrdelProvenanceStateV1,
      producer_id: record.producer_id,
      producer_version: record.producer_version,
      collector_ref: record.collector_ref,
      provenance_was_manufactured: false as const,
    }),
    coverage,
    evidence_ref: record.evidence_ref,
    evidence_digest: record.evidence_digest,
    evidence_content_persisted: false as const,
    // The frozen T08 truth boundary is ATTACHED to every record, not merely
    // declared alongside it. A caller may add its own bounded limitations, but
    // can never replace or dilute the canonical boundary statements, which is
    // what makes those statements load-bearing rather than decorative.
    limitations: canonicalStrings([
      ...SENTRDEL_SCA_KNOWN_LIMITATIONS,
      ...record.limitations,
    ]),
    // Only CALLER text is scanned. The frozen boundary above is canonical text
    // this module itself authors, and several of its statements name a claim in
    // order to DENY it ("UNKNOWN != PASS"), so scanning it would reject the very
    // boundary the record is required to carry.
    promoted_claim_shaped_text_present: detectPromotedClaimInStrings(
      canonicalStrings(record.limitations),
    ),
    caller_text_is_authoritative: false as const,
    severity_state: "NEVER_DERIVED",
    severity_value: null,
    effect_facts: "E0_READ_ONLY_ANALYSIS",
    network_facts: "NO_NETWORK",
    egress_facts: "NO_EGRESS",
    authority: "DEPENDENCY_OBSERVATION_ONLY",
    assurance_effect: "NONE" as const,
    finding_emitted: false as const,
    claim_assessment_emitted: false as const,
    dependency_observation_is_finding: false as const,
    version_match_is_vulnerable: false as const,
    version_match_is_exploitable: false as const,
    advisory_stale_is_no_known_vulnerability: false as const,
    delta_only_is_full_graph: false as const,
    reachability_is_certain: false as const,
    exploitability_derived: false as const,
    remediation_derived: false as const,
    inventory_complete: false as const,
    global_clean_claimed: false as const,
    repository_clean_claimed: false as const,
    repository_sca_complete_claimed: false as const,
    remediation_verified: false as const,
  };

  return deepFreeze(observation);
}

/**
 * Build the bounded SBOM coverage gap.
 *
 * The `sbom` capability is NOT_CHARACTERIZED at the pinned Sentrdel revision, so
 * it is NOT present in SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES and must never be
 * invoked, executed, or simulated. This function records that absence truthfully
 * as a first-class, claim-bearing coverage gap.
 *
 * It takes no caller input at all: the gap is derived purely from the pinned T02
 * characterization, so a caller cannot influence it, and therefore cannot make
 * the SBOM half of T08 look executed, complete, or clean. SBOM_NOT_CHARACTERIZED
 * != INVENTORY_PROVEN, and SBOM_UNPROVEN != CLEAN.
 */
export function buildSentrdelSbomGapV1(): SentrdelSbomGapV1 {
  const capability = getSentrdelCapabilityV1(
    buildSentrdelCapabilitiesV1(),
    SENTRDEL_SBOM_CAPABILITY_ID,
  );

  // The gap is emitted only when the pinned characterization actually says
  // NOT_CHARACTERIZED. If a future pin ever characterizes the capability, this
  // builder must stop claiming a gap rather than fabricate one.
  if (capability === undefined || capability.status !== "NOT_CHARACTERIZED") {
    throw new Error(
      "sentrdel sbom capability is no longer NOT_CHARACTERIZED at this pin",
    );
  }

  const gap: SentrdelSbomGapV1 = {
    schema_version: 1,
    phase_authority: SENTRDEL_SCA_PHASE_AUTHORITY,
    capability_id: SENTRDEL_SBOM_CAPABILITY_ID,
    capability_status: "NOT_CHARACTERIZED",
    execution_admitted: false as const,
    execution_state: "NOT_RUN" as const,
    executed: false as const,
    inventory_state: "UNPROVEN",
    inventory_proven: false as const,
    // Coverage uses the canonical T05 aggregate vocabulary. NOT_COVERED is used
    // because the capability produced no coverage at all; UNKNOWN remains
    // available in the vocabulary but is never claimed as a stronger state.
    coverage_state: "NOT_COVERED",
    scope_claim: "UNAVAILABLE",
    reason: SENTRDEL_SBOM_GAP_REASON,
    // The canonical T02 UNKNOWN tokens the pinned sbom capability itself
    // declares, so the gap reuses existing vocabulary rather than forking it.
    unknown_states: canonicalStrings([...capability.unknown_tokens]),
    // The canonical T05 loss for a NOT_RUN execution, bound to the canonical
    // T02 token ANALYZER_UNAVAILABLE through the frozen T05 mapping.
    coverage_loss_reasons: canonicalLossReasons(["ENGINE_UNAVAILABLE"]),
    engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE,
    engine_pin_ref: SENTRDEL_PIN_REF,
    limitations: canonicalStrings([...SENTRDEL_SBOM_KNOWN_LIMITATIONS]),
    // The gap authors its own limitations from the frozen boundary, so no caller
    // text is present and the recorded detection is derived from that boundary
    // alone, which is consistent by construction.
    promoted_claim_shaped_text_present: detectPromotedClaimInStrings(
      canonicalStrings([...SENTRDEL_SBOM_KNOWN_LIMITATIONS]).filter(
        (limitation) => !FROZEN_SBOM_LIMITATION_SET.has(limitation),
      ),
    ),
    caller_text_is_authoritative: false as const,
    authority: "SBOM_COVERAGE_GAP_ONLY",
    assurance_effect: "NONE" as const,
    finding_emitted: false as const,
    claim_assessment_emitted: false as const,
    execution_record_fabricated: false as const,
    inventory_fabricated: false as const,
    findings_observed: 0 as const,
    absence_is_clean: false as const,
    inventory_complete: false as const,
    global_clean_claimed: false as const,
    repository_clean_claimed: false as const,
    remediation_verified: false as const,
  };

  return deepFreeze(gap);
}

/**
 * The `sbom` capability is never adapter-admitted at this pin. This is the
 * structural fact that makes an SBOM execution record impossible, not a
 * convention a caller is asked to respect.
 */
export function sbomIsAdapterAdmittedV1(): boolean {
  return SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES.includes(
    SENTRDEL_SBOM_CAPABILITY_ID,
  );
}

/**
 * Cross-task consistency gate against a T04 normalized observation.
 *
 * T08 may only be admitted for an observation that is itself a valid T04 record,
 * targets `dependency-delta`, and binds the exact pin. Crucially, T08 does NOT
 * impose T06/T07's stricter structural rules: because DEPENDENCY_OBSERVATION is
 * absent from the canonical T04 requiring-provenance and requiring-rule-id
 * sets, an upstream record with a null rule_id or ABSENT/UNRESOLVED provenance
 * remains admissible here. Inventing provenance or a rule ID to satisfy a
 * stricter, forked rule would be a semantic fork of canonical T04.
 *
 * Returns the exact recorded reasons, or an empty list when compatible.
 */
export function checkScaUpstreamCompatibilityV1(
  observation: unknown,
): readonly string[] {
  const reasons: string[] = [];
  if (!isRecord(observation)) {
    return Object.freeze(["upstream observation must be an object"]);
  }
  const upstream = observation as unknown as SentrdelNormalizedObservationV1;
  if (upstream.schema_version !== 1) {
    reasons.push("upstream observation schema version must be 1");
  }
  if (upstream.phase_authority !== "UA-P06-T04") {
    reasons.push("upstream observation must come from the T04 boundary");
  }
  if (upstream.authority !== "OBSERVATION_ONLY") {
    reasons.push("upstream observation authority must be OBSERVATION_ONLY");
  }
  if (upstream.claim_class !== "DEPENDENCY_OBSERVATION") {
    reasons.push("T08 accepts a DEPENDENCY_OBSERVATION upstream only");
  }
  if (upstream.capability_id === SENTRDEL_SBOM_CAPABILITY_ID) {
    reasons.push("the sbom capability can never be an executable upstream record");
  } else if (upstream.capability_id !== SENTRDEL_SCA_CAPABILITY_ID) {
    reasons.push("upstream observation must target dependency-delta");
  }
  if (upstream.engine_pin !== SENTRDEL_PINNED_REVISION) {
    reasons.push("upstream observation must bind the exact Sentrdel pin");
  }
  // Provenance is read defensively: a partial upstream record must be reported,
  // never dereferenced into a thrown TypeError.
  const provenance = isRecord(upstream.provenance)
    ? upstream.provenance
    : undefined;
  if (provenance === undefined) {
    reasons.push("upstream observation must carry a provenance object");
  } else if (
    provenance["state"] === "COMPLETE" &&
    provenance["producer_id"] === null
  ) {
    reasons.push("COMPLETE provenance must carry a producer identity");
  }
  // The canonical T04 gate is itself fail-closed, so it is the authoritative
  // structural check; it is only invoked once the record is shaped correctly.
  //
  // That shape precondition is load-bearing, not defensive decoration: the T04
  // gate dereferences nested record members without null checks, so invoking it
  // against a partially-shaped record would throw a TypeError instead of
  // returning a fail-closed reason. A gate that crashes on hostile input is a
  // fail-OPEN gate. The required members are therefore verified up front.
  const requiredObjects = ["coverage", "raw_evidence", "provenance"] as const;
  const missingObjects = requiredObjects.filter(
    (key) => !isRecord(upstream[key as keyof typeof upstream]),
  );
  if (missingObjects.length > 0) {
    reasons.push(
      `upstream observation is missing required object members: ${missingObjects.join(", ")}`,
    );
  } else if (
    !Array.isArray(upstream.limitations) ||
    !Array.isArray(upstream.coverage.unknown_states) ||
    // `unsupported_scope` is a canonical T04 STRING, not an array. Asserting the
    // wrong shape here would reject every legitimately normalized upstream record,
    // which would make this gate broken rather than fail-closed.
    typeof upstream.unsupported_scope !== "string" ||
    upstream.unsupported_scope.length === 0
  ) {
    reasons.push(
      "upstream observation is missing required members for the T04 invariant gate",
    );
  } else {
    const upstreamCheck = assertSentrdelObservationInvariantsV1(upstream);
    for (const reason of upstreamCheck.reasons) {
      reasons.push(`upstream invariant failed: ${reason}`);
    }
  }
  return Object.freeze([...new Set(reasons)].sort(compareText));
}

/** The complete frozen T08 limitations, for exhaustive assertions. */
export const SENTRDEL_SCA_LIMITATION_COUNT =
  SENTRDEL_SCA_KNOWN_LIMITATIONS.length;

export interface SentrdelScaSetV1 {
  readonly schema_version: 1;
  readonly phase_authority: typeof SENTRDEL_SCA_PHASE_AUTHORITY;
  readonly authority: SentrdelScaAuthorityV1;
  readonly ok: boolean;
  readonly observations: readonly SentrdelScaObservationV1[];
  readonly sbom_gap: SentrdelSbomGapV1;
  readonly rejected_indices: readonly number[];
  readonly reasons: readonly string[];
  readonly matches_observed: number;
  readonly dependency_coverage: SentrdelScaDeltaCoverageStateV1;
  readonly zero_matches_implies_clean: false;
  readonly full_inventory_claimed: false;
  readonly no_known_vulnerability_claimed: false;
  readonly repository_clean_claimed: false;
  readonly repository_sca_complete: false;
}

function rejectedSet(
  reasons: readonly string[],
  rejected: readonly number[],
): SentrdelScaSetV1 {
  return deepFreeze({
    schema_version: 1 as const,
    phase_authority: SENTRDEL_SCA_PHASE_AUTHORITY,
    authority: "DEPENDENCY_OBSERVATION_ONLY" as const,
    ok: false,
    observations: Object.freeze([]),
    sbom_gap: buildSentrdelSbomGapV1(),
    rejected_indices: Object.freeze([...rejected]),
    reasons: Object.freeze([...reasons]),
    matches_observed: 0,
    dependency_coverage: "DELTA_ONLY_NOT_FULL_GRAPH" as const,
    zero_matches_implies_clean: false as const,
    full_inventory_claimed: false as const,
    no_known_vulnerability_claimed: false as const,
    repository_clean_claimed: false as const,
    repository_sca_complete: false as const,
  });
}

/**
 * Normalize a set of dependency-delta inputs into deterministically ordered,
 * observation-only records, alongside the truthful SBOM coverage gap.
 *
 * Fails closed as a unit: if any input is malformed or any observation identity
 * is duplicated, no observation is emitted at all, so a partial failure can never
 * read as a successful scan.
 *
 * The returned set carries `zero_matches_implies_clean: false`,
 * `full_inventory_claimed: false`, `no_known_vulnerability_claimed: false`,
 * `repository_clean_claimed: false`, and `repository_sca_complete: false` as
 * literal `false` types, and `dependency_coverage` as a literal
 * `DELTA_ONLY_NOT_FULL_GRAPH`, so an empty observation list can never be read as
 * a complete, vulnerability-free, repository-clean SCA run.
 */
export function normalizeSentrdelScaSetV1(
  inputs: readonly unknown[],
): SentrdelScaSetV1 {
  if (!Array.isArray(inputs)) {
    return rejectedSet(["dependency input set must be an array"], []);
  }
  if (inputs.length > MAX_OBSERVATIONS) {
    return rejectedSet(
      [`dependency input set must contain at most ${MAX_OBSERVATIONS} entries`],
      [],
    );
  }

  const reasons: string[] = [];
  const rejected: number[] = [];
  const normalized: SentrdelScaObservationV1[] = [];

  for (let index = 0; index < inputs.length; index += 1) {
    const validation = validateSentrdelScaInputV1(inputs[index]);
    if (!validation.valid) {
      rejected.push(index);
      for (const reason of validation.reasons) {
        reasons.push(`[${index}] ${reason}`);
      }
      continue;
    }
    const observation = normalizeSentrdelScaInputV1(inputs[index]);
    if (observation === undefined) {
      rejected.push(index);
      reasons.push(`[${index}] observation could not be normalized`);
      continue;
    }
    normalized.push(observation);
  }

  const seen = new Set<string>();
  for (const observation of normalized) {
    if (seen.has(observation.dependency_observation_id)) {
      reasons.push(
        `duplicate observation identity: ${observation.dependency_observation_id}`,
      );
    }
    seen.add(observation.dependency_observation_id);
  }

  if (reasons.length > 0) {
    return rejectedSet([...new Set(reasons)].sort(compareText), rejected);
  }

  const ordered = [...normalized].sort((left, right) =>
    compareText(left.dependency_observation_id, right.dependency_observation_id),
  );

  return deepFreeze({
    schema_version: 1,
    phase_authority: SENTRDEL_SCA_PHASE_AUTHORITY,
    authority: "DEPENDENCY_OBSERVATION_ONLY",
    ok: true,
    observations: Object.freeze(ordered),
    // The SBOM gap accompanies every T08 set, including an empty one: the
    // inventory is unproven regardless of how many dependency deltas were seen.
    sbom_gap: buildSentrdelSbomGapV1(),
    rejected_indices: Object.freeze([]),
    reasons: Object.freeze([]),
    matches_observed: ordered.filter(
      (observation) =>
        observation.advisory.version_match_state ===
        "ADVISORY_VERSION_MATCH_OBSERVED",
    ).length,
    dependency_coverage: "DELTA_ONLY_NOT_FULL_GRAPH" as const,
    zero_matches_implies_clean: false as const,
    full_inventory_claimed: false as const,
    no_known_vulnerability_claimed: false as const,
    repository_clean_claimed: false as const,
    repository_sca_complete: false as const,
  });
}

/**
 * Assert the T08 truth boundary on a normalized dependency observation.
 *
 * Every check here corresponds to a stated T08 invariant. This is a fail-closed
 * gate: a record that contradicts any invariant is reported, never accepted.
 */
export function assertSentrdelScaInvariantsV1(
  observation: SentrdelScaObservationV1,
): SentrdelScaInvariantCheckV1 {
  const reasons: string[] = [];
  if (observation.schema_version !== 1) {
    reasons.push("dependency observation schema version must be 1");
  }
  if (observation.phase_authority !== SENTRDEL_SCA_PHASE_AUTHORITY) {
    reasons.push("dependency phase authority must be UA-P06-T08");
  }
  if (observation.authority !== "DEPENDENCY_OBSERVATION_ONLY") {
    reasons.push("dependency authority must be DEPENDENCY_OBSERVATION_ONLY");
  }
  if (observation.capability_id !== SENTRDEL_SCA_CAPABILITY_ID) {
    reasons.push("T08 normalizes dependency-delta only");
  }
  if (observation.claim_class !== "DEPENDENCY_OBSERVATION") {
    reasons.push("T08 accepts DEPENDENCY_OBSERVATION only");
  }
  if (observation.engine_pin !== SENTRDEL_PINNED_REVISION) {
    reasons.push("dependency observation must bind the exact Sentrdel pin");
  }
  if (observation.engine_tree !== SENTRDEL_PINNED_TREE) {
    reasons.push("dependency observation must bind the exact Sentrdel tree");
  }
  if (observation.engine_pin_ref !== SENTRDEL_PIN_REF) {
    reasons.push("dependency observation must bind the exact Sentrdel pin ref");
  }
  if (observation.assurance_effect !== "NONE") {
    reasons.push("dependency normalization must have no assurance effect");
  }

  // Vocabulary membership. A negative saying `false` is not enough: a forged
  // record can attach an out-of-vocabulary PROMOTED value to the very field the
  // negative lives on, and a gate that only reads the boolean would ratify it.
  // Every state value below is checked against the canonical vocabulary that owns
  // it, so a promotion is reported rather than accepted.
  requireMember(observation.execution_state, EXECUTION_STATE_SET, "execution_state", reasons);
  requireMember(observation.capability_status, CAPABILITY_STATUS_SET, "capability_status", reasons);
  requireMember(observation.claim_class, CLAIM_CLASS_SET, "claim_class", reasons);
  requireMember(observation.authority, new Set<string>(SENTRDEL_SCA_AUTHORITIES), "authority", reasons);
  requireMember(observation.engine_id, new Set<string>([SENTRDEL_ENGINE_ID]), "engine_id", reasons);
  requireMember(observation.engine_version, new Set<string>([SENTRDEL_ENGINE_VERSION]), "engine_version", reasons);
  requireMember(observation.reachability_state, REACHABILITY_SET, "reachability_state", reasons);
  requireMember(observation.identity.ecosystem, ECOSYSTEM_SET, "identity.ecosystem", reasons);
  requireMember(observation.rule.rule_resolution, RESOLUTION_SET, "rule.rule_resolution", reasons);
  requireMember(observation.provenance.state, PROVENANCE_SET, "provenance.state", reasons);
  requireMember(observation.advisory.freshness_state, FRESHNESS_SET, "advisory.freshness_state", reasons);
  requireMember(observation.advisory.version_match_state, VERSION_MATCH_SET, "advisory.version_match_state", reasons);
  requireMember(observation.coverage.observation_state, COVERAGE_STATE_SET, "coverage.observation_state", reasons);
  requireMember(observation.coverage.aggregate_state, AGGREGATE_STATE_SET, "coverage.aggregate_state", reasons);
  requireMember(observation.coverage.dependency_coverage, new Set<string>(SENTRDEL_SCA_DELTA_COVERAGE_STATES), "coverage.dependency_coverage", reasons);
  requireMember(observation.severity_state, new Set<string>(SENTRDEL_SCA_SEVERITY_STATES), "severity_state", reasons);
  requireMember(observation.effect_facts, new Set<string>(["E0_READ_ONLY_ANALYSIS"]), "effect_facts", reasons);
  requireMember(observation.network_facts, new Set<string>(["NO_NETWORK"]), "network_facts", reasons);
  requireMember(observation.egress_facts, new Set<string>(["NO_EGRESS"]), "egress_facts", reasons);

  // The derived canonical tokens must be the ones their own state maps to, so a
  // forged token cannot announce a corpus or reachability conclusion the record
  // never earned.
  const expectedFreshnessToken =
    SENTRDEL_SCA_FRESHNESS_CANONICAL_TOKENS[observation.advisory.freshness_state];
  if (observation.advisory.canonical_freshness_token !== (expectedFreshnessToken ?? null)) {
    reasons.push(
      "the advisory canonical freshness token must be the one its freshness state maps to",
    );
  }
  const expectedReachabilityToken =
    SENTRDEL_SCA_REACHABILITY_CANONICAL_TOKENS[observation.reachability_state];
  if (observation.canonical_reachability_token !== (expectedReachabilityToken ?? null)) {
    reasons.push(
      "the canonical reachability token must be the one its reachability state maps to",
    );
  }

  // Carried token arrays must be members of the canonical vocabularies, and a
  // coverage loss must be one the canonical T05 mapping actually binds.
  for (const token of observation.coverage.unknown_states) {
    if (!UNKNOWN_TOKEN_SET.has(token)) {
      reasons.push(`unknown state is not a canonical UNKNOWN token: ${String(token)}`);
    }
  }
  for (const loss of observation.coverage.coverage_loss_reasons) {
    if (!LOSS_REASON_SET.has(loss)) {
      reasons.push(`coverage loss reason is not canonical: ${String(loss)}`);
    }
  }
  if (observation.finding_emitted) {
    reasons.push("DEPENDENCY_OBSERVATION != FINDING: a dependency record must never emit a Finding");
  }
  if (observation.claim_assessment_emitted) {
    reasons.push("dependency normalization must never emit a ClaimAssessment");
  }
  if (observation.dependency_observation_is_finding) {
    reasons.push("a dependency observation must never be a Finding");
  }

  // VERSION_MATCH != VULNERABLE.
  if (observation.version_match_is_vulnerable) {
    reasons.push("VERSION_MATCH != VULNERABLE: a version match must never be a vulnerability verdict");
  }
  if (observation.version_match_is_exploitable) {
    reasons.push("a version match must never be an exploitability verdict");
  }
  if (observation.advisory.version_match_is_vulnerability_truth) {
    reasons.push("a version match must never be vulnerability truth");
  }

  // ADVISORY_STALE != NO_KNOWN_VULNERABILITY.
  if (observation.advisory_stale_is_no_known_vulnerability) {
    reasons.push("ADVISORY_STALE != NO_KNOWN_VULNERABILITY: a stale corpus is never a safety claim");
  }
  if (observation.advisory.advisory_freshness_is_safety_evidence) {
    reasons.push("advisory freshness must never be treated as safety evidence");
  }
  const freshnessToken =
    SENTRDEL_SCA_FRESHNESS_CANONICAL_TOKENS[observation.advisory.freshness_state];
  if (
    freshnessToken !== null &&
    freshnessToken !== undefined &&
    !observation.coverage.unknown_states.includes(freshnessToken)
  ) {
    reasons.push(
      `a ${observation.advisory.freshness_state} corpus must retain the ${freshnessToken} unknown state`,
    );
  }

  // DELTA_ONLY != FULL_GRAPH.
  if (observation.coverage.dependency_coverage !== "DELTA_ONLY_NOT_FULL_GRAPH") {
    reasons.push("DELTA_ONLY != FULL_GRAPH: dependency coverage must remain delta-only");
  }
  if (observation.coverage.is_full_graph) {
    reasons.push("a delta observation must never claim a full dependency graph");
  }
  if (observation.coverage.is_total) {
    reasons.push("dependency coverage must never be total");
  }
  if (observation.coverage.all_dependencies_scanned) {
    reasons.push("a delta observation must never claim all dependencies were scanned");
  }
  if (observation.coverage.repository_sca_complete) {
    reasons.push("a delta observation must never claim a complete repository SCA");
  }
  if (observation.delta_only_is_full_graph) {
    reasons.push("a delta-only observation must never equal a full graph");
  }
  if (observation.identity.is_delta_only !== true) {
    reasons.push("dependency identity must remain delta-only");
  }
  if (observation.identity.full_graph_claimed) {
    reasons.push("dependency identity must never claim a full graph");
  }
  // The rule identity is preserved, never manufactured. A rule is either present
  // and pinned, or explicitly absent; the two must agree, so a hand-built record
  // cannot claim a pinned rule with no rule id.
  if (
    observation.rule.rule_id_is_pinned !==
    (observation.rule.rule_id !== null && observation.rule.rule_resolution === "PRESENT")
  ) {
    reasons.push(
      "a dependency observation must bind a pinned rule exactly when a rule identity is present",
    );
  }
  if (observation.rule.rule_resolution === "PRESENT" && observation.rule.rule_id === null) {
    reasons.push("a PRESENT rule resolution must carry a rule identity");
  }
  if (observation.rule.rule_resolution === "ABSENT" && observation.rule.rule_id !== null) {
    reasons.push("an ABSENT rule resolution must not carry a rule identity");
  }
  if (observation.inventory_complete) {
    reasons.push("dependency normalization must never prove a complete inventory");
  }
  if (observation.repository_sca_complete_claimed) {
    reasons.push("dependency normalization must never claim a complete repository SCA");
  }
  // DELTA_ONLY != FULL_GRAPH and NO_MATCH_OVER_PARTIAL != SECURE at the aggregation
  // level. A covered aggregate is only legitimate when the observation state is
  // bounded-complete AND no unknown state survives, so a record carrying both
  // `COVERED_WITHIN_STATED_SCOPE` and an unknown state is a promotion and must be
  // reported rather than ratified.
  if (observation.coverage.aggregate_state === "COVERED_WITHIN_STATED_SCOPE") {
    if (observation.coverage.unknown_states.length > 0) {
      reasons.push(
        "a covered aggregate scope may never coexist with declared unknown states",
      );
    }
    if (
      observation.coverage.observation_state !==
      "COMPLETE_WITHIN_STATED_SCOPE"
    ) {
      reasons.push(
        "a covered aggregate scope requires a complete observation state within the stated scope",
      );
    }
  }

  // REACHABILITY_NOT_COMPUTED != EXPLOITABLE.
  if (observation.reachability_computed) {
    reasons.push("REACHABILITY_NOT_COMPUTED: reachability must never be computed at this pin");
  }
  if (observation.reachability_is_certain) {
    reasons.push("reachability must never be reported as certain in either direction");
  }
  if (observation.exploitability_derived) {
    reasons.push("dependency normalization must never derive exploitability");
  }
  if (observation.remediation_derived) {
    reasons.push("dependency normalization must never derive a remediation");
  }
  if (observation.remediation_verified) {
    reasons.push("dependency normalization must never verify a remediation");
  }
  const reachabilityToken =
    SENTRDEL_SCA_REACHABILITY_CANONICAL_TOKENS[observation.reachability_state];
  if (
    reachabilityToken !== null &&
    reachabilityToken !== undefined &&
    !observation.coverage.unknown_states.includes(reachabilityToken)
  ) {
    reasons.push(
      `reachability state ${observation.reachability_state} must retain the ${reachabilityToken} unknown state`,
    );
  }
  if (!observation.coverage.coverage_loss_reasons.includes("UNKNOWN_REACHABILITY")) {
    reasons.push("a T08 dependency observation must retain the UNKNOWN_REACHABILITY loss");
  }

  // UNSCANNED_SCOPE != CLEAN, UNKNOWN != PASS, NO_MATCH_OVER_PARTIAL != SECURE.
  if (observation.coverage.unscanned_is_clean) {
    reasons.push("unscanned scope must never be clean");
  }
  if (observation.coverage.unknown_is_pass) {
    reasons.push("UNKNOWN must never be a pass");
  }
  if (observation.coverage.zero_match_implies_clean) {
    reasons.push("a zero-match observation must never imply a clean repository");
  }
  if (observation.global_clean_claimed) {
    reasons.push("dependency normalization must never claim a global clean");
  }
  if (observation.repository_clean_claimed) {
    reasons.push("dependency normalization must never claim a repository is clean");
  }

  // Severity is never derived at T08.
  if (observation.severity_state !== "NEVER_DERIVED") {
    reasons.push("severity must never be derived at T08");
  }
  if (observation.severity_value !== null) {
    reasons.push("severity value must remain null at T08");
  }
  if (observation.advisory.source_reported_severity_recorded) {
    reasons.push(
      "a source-reported advisory severity must be omitted, not recorded as canonical severity",
    );
  }
  if (observation.advisory.source_reported_severity_is_canonical) {
    reasons.push("a source-reported advisory severity must never become canonical severity");
  }

  // Provenance and rule identity are preserved, never manufactured.
  if (observation.provenance.provenance_was_manufactured) {
    reasons.push("provenance must never be manufactured");
  }
  if (observation.rule.rule_id_was_manufactured) {
    reasons.push("a rule identity must never be manufactured");
  }
  if (
    observation.provenance.state === "COMPLETE" &&
    observation.provenance.producer_id === null
  ) {
    reasons.push("COMPLETE provenance must carry a producer identity");
  }

  if (observation.evidence_content_persisted) {
    reasons.push("evidence content must never be persisted");
  }
  // Caller text is descriptive metadata and is NEVER authoritative. This is the
  // load-bearing consequence of the architectural decision to stop rejecting
  // lexical claim assertions: a caller cannot promote a record by wording, because
  // the text carries no authority at all and every structural negative is
  // literal-false.
  if (observation.caller_text_is_authoritative !== false) {
    reasons.push("caller text must never be authoritative");
  }
  // The recorded claim-detection fact must agree with the CALLER-supplied portion
  // of the limitations, so a record can neither hide nor manufacture it. The
  // frozen boundary is subtracted rather than scanned: those statements are
  // canonical text this module authors, and several of them deliberately NAME a
  // claim in order to DENY it ("UNKNOWN != PASS", "ADVISORY_STALE !=
  // NO_KNOWN_VULNERABILITY"), so scanning them would report every record as
  // containing a promoted claim.
  const callerLimitations = observation.limitations.filter(
    (limitation) => !FROZEN_SCA_LIMITATION_SET.has(limitation),
  );
  if (
    observation.promoted_claim_shaped_text_present !==
    detectPromotedClaimInStrings(callerLimitations)
  ) {
    reasons.push(
      "the recorded promoted-claim detection must match the persisted limitations",
    );
  }
  if (observation.limitations.length === 0) {
    reasons.push("a normalized dependency observation must state explicit limitations");
  }
  // The frozen T08 truth boundary must be present on the record itself. Without
  // this, a caller could ship a record carrying only its own vague limitation and
  // the canonical boundary would exist only in the source, which is decorative.
  for (const required of SENTRDEL_SCA_KNOWN_LIMITATIONS) {
    if (!observation.limitations.includes(required)) {
      reasons.push(
        "a normalized dependency observation must carry the frozen T08 truth boundary",
      );
      break;
    }
  }
  if (
    observation.execution_state !== "EXECUTED" &&
    observation.advisory.version_match_state !== "UNKNOWN"
  ) {
    reasons.push("a non-executing capability must never report an advisory match");
  }

  // A normalized dependency record must not carry any field capable of holding a
  // verdict, a trust claim, a severity, or a full-graph/inventory claim.
  //
  // This list deliberately names only members that are NOT part of the record's
  // own shape. The record's negative claims (`reachability_computed`,
  // `severity_value`, `inventory_complete`) are literal-typed and are asserted
  // explicitly above; listing them here as forbidden would make the gate fail on
  // every correctly normalized record, which would be a broken gate rather than
  // a fail-closed one.
  const record = observation as unknown as Record<string, unknown>;
  for (const forbidden of [
    "finding",
    "claim_assessment",
    "assurance",
    "verdict",
    "vulnerability",
    "exploitability",
    "reachability_verdict",
    "clean",
    "secure",
    "pass",
    "trust",
    "severity",
    "advisory_severity",
    "cvss",
    "safe",
    "affected",
    "remediation",
    "full_graph",
    "full_inventory",
    "all_dependencies",
    "repository_sca",
    "sbom_inventory",
    "sbom_execution",
    "value",
    "risk",
    "impact",
  ]) {
    if (record[forbidden] !== undefined) {
      reasons.push(`dependency observation must never carry ${forbidden}`);
    }
  }

  return { ok: reasons.length === 0, reasons: Object.freeze(reasons) };
}

/**
 * Assert the SBOM truth boundary on a coverage gap.
 *
 * This gate exists so that "SBOM_NOT_CHARACTERIZED cannot become executed" and
 * "an SBOM gap cannot become clean" are enforced structurally, not merely
 * documented. It is the T08 half that is proven by truthfully representing an
 * absence.
 */
export function assertSentrdelSbomInvariantsV1(
  gap: SentrdelSbomGapV1,
): SentrdelScaInvariantCheckV1 {
  const reasons: string[] = [];
  if (gap.schema_version !== 1) {
    reasons.push("sbom gap schema version must be 1");
  }
  if (gap.phase_authority !== SENTRDEL_SCA_PHASE_AUTHORITY) {
    reasons.push("sbom gap phase authority must be UA-P06-T08");
  }
  if (gap.authority !== "SBOM_COVERAGE_GAP_ONLY") {
    reasons.push("sbom gap authority must be SBOM_COVERAGE_GAP_ONLY");
  }
  if (gap.capability_id !== SENTRDEL_SBOM_CAPABILITY_ID) {
    reasons.push("the sbom gap must target the sbom capability");
  }
  if (gap.capability_status !== "NOT_CHARACTERIZED") {
    reasons.push("the sbom capability must remain NOT_CHARACTERIZED at this pin");
  }
  if (sbomIsAdapterAdmittedV1()) {
    reasons.push("the sbom capability must never be adapter-admitted at this pin");
  }
  if (gap.execution_admitted) {
    reasons.push("SBOM_NOT_CHARACTERIZED: the sbom capability is never execution-admitted");
  }
  if (gap.executed) {
    reasons.push("SBOM_NOT_CHARACTERIZED: the sbom capability is never executed");
  }
  if (gap.execution_state !== "NOT_RUN") {
    reasons.push("the sbom capability execution state must remain NOT_RUN");
  }
  if (gap.execution_record_fabricated) {
    reasons.push("an sbom execution record must never be fabricated");
  }
  if (gap.inventory_fabricated) {
    reasons.push("an sbom inventory must never be fabricated");
  }
  if (gap.inventory_proven) {
    reasons.push("SBOM_NOT_CHARACTERIZED != INVENTORY_PROVEN: the inventory is unproven");
  }
  if (gap.inventory_state !== "UNPROVEN") {
    reasons.push("the sbom inventory state must remain UNPROVEN");
  }
  if (gap.inventory_complete) {
    reasons.push("an sbom gap must never claim a complete inventory");
  }
  if (gap.scope_claim !== "UNAVAILABLE") {
    reasons.push("an sbom scope claim must remain UNAVAILABLE");
  }
  if (gap.coverage_state !== "NOT_COVERED" && gap.coverage_state !== "UNKNOWN") {
    reasons.push("the sbom gap coverage state must remain NOT_COVERED or UNKNOWN");
  }
  if (gap.reason !== SENTRDEL_SBOM_GAP_REASON) {
    reasons.push("the sbom gap reason must be the pinned not-characterized reason");
  }
  if (gap.absence_is_clean) {
    reasons.push("SBOM_UNPROVEN != CLEAN: the absence of sbom findings is never a clean result");
  }
  if (gap.findings_observed !== 0) {
    reasons.push("an sbom gap must never carry fabricated findings");
  }
  if (gap.global_clean_claimed) {
    reasons.push("an sbom gap must never claim a global clean");
  }
  if (gap.repository_clean_claimed) {
    reasons.push("an sbom gap must never claim a repository is clean");
  }
  // Every negative declared on this interface must be asserted here. An
  // unasserted negative is a decorative guard: the field is literal-false at the
  // type level, but this gate is the sole structural enforcement and is invoked on
  // objects whose shape is only compile-time checked.
  if (gap.remediation_verified) {
    reasons.push(
      "SBOM_NOT_CHARACTERIZED: the sbom gap must never claim a verified remediation",
    );
  }
  if (gap.assurance_effect !== "NONE") {
    reasons.push("an sbom gap must have no assurance effect");
  }
  if (gap.finding_emitted) {
    reasons.push("an sbom gap must never emit a Finding");
  }
  if (gap.claim_assessment_emitted) {
    reasons.push("an sbom gap must never emit a ClaimAssessment");
  }
  if (gap.engine_pin !== SENTRDEL_PINNED_REVISION) {
    reasons.push("the sbom gap must bind the exact Sentrdel pin");
  }
  if (gap.engine_tree !== SENTRDEL_PINNED_TREE) {
    reasons.push("the sbom gap must bind the exact Sentrdel tree");
  }
  if (gap.engine_pin_ref !== SENTRDEL_PIN_REF) {
    reasons.push("the sbom gap must bind the exact Sentrdel pin ref");
  }
  if (gap.limitations.length === 0) {
    reasons.push("an sbom gap must state explicit limitations");
  }
  // Same discipline as the observation gate: text is never authoritative, and the
  // recorded detection must agree with the CALLER-supplied portion. The gap
  // authors its own limitations entirely from the frozen boundary, so the caller
  // portion is empty and the derived value is false by construction.
  if (gap.caller_text_is_authoritative !== false) {
    reasons.push("caller text must never be authoritative");
  }
  const gapCallerLimitations = gap.limitations.filter(
    (limitation) => !FROZEN_SBOM_LIMITATION_SET.has(limitation),
  );
  if (
    gap.promoted_claim_shaped_text_present !==
    detectPromotedClaimInStrings(gapCallerLimitations)
  ) {
    reasons.push(
      "the recorded promoted-claim detection must match the persisted limitations",
    );
  }
  // The frozen SBOM boundary must be present on the gap itself, exactly as it is
  // on a dependency observation. Without this, a gap could carry only a caller
  // string such as "CLEAN" and the canonical boundary would exist only in source.
  for (const required of SENTRDEL_SBOM_KNOWN_LIMITATIONS) {
    if (!gap.limitations.includes(required)) {
      reasons.push("an sbom gap must carry the frozen SBOM truth boundary");
      break;
    }
  }
  // The gap's carried arrays must be members of the canonical vocabularies too.
  // Non-empty is not enough: an invented token is as unprovable as a promoted one.
  if (gap.unknown_states.length === 0) {
    reasons.push("an sbom gap must state the capability's unknown tokens");
  }
  for (const token of gap.unknown_states) {
    if (!UNKNOWN_TOKEN_SET.has(token)) {
      reasons.push(`unknown state is not a canonical UNKNOWN token: ${String(token)}`);
    }
  }
  if (gap.coverage_loss_reasons.length === 0) {
    reasons.push("an sbom gap must carry a canonical coverage loss");
  }
  for (const loss of gap.coverage_loss_reasons) {
    if (!LOSS_REASON_SET.has(loss)) {
      reasons.push(`coverage loss reason is not canonical: ${String(loss)}`);
    }
  }
  // Vocabulary membership, for the same reason as the observation gate.
  requireMember(gap.capability_status, new Set<string>(["NOT_CHARACTERIZED"]), "capability_status", reasons);
  requireMember(gap.capability_id, new Set<string>([SENTRDEL_SBOM_CAPABILITY_ID]), "capability_id", reasons);
  requireMember(gap.authority, new Set<string>(["SBOM_COVERAGE_GAP_ONLY"]), "authority", reasons);
  requireMember(gap.inventory_state, new Set<string>(SENTRDEL_SBOM_INVENTORY_STATES), "inventory_state", reasons);
  requireMember(gap.scope_claim, new Set<string>(SENTRDEL_SBOM_SCOPE_CLAIMS), "scope_claim", reasons);
  requireMember(gap.coverage_state, AGGREGATE_STATE_SET, "coverage_state", reasons);
  requireMember(gap.execution_state, new Set<string>(["NOT_RUN"]), "execution_state", reasons);
  requireMember(gap.assurance_effect, new Set<string>(["NONE"]), "assurance_effect", reasons);
  requireMember(gap.engine_id, new Set<string>([SENTRDEL_ENGINE_ID]), "engine_id", reasons);
  if (gap.engine_pin !== SENTRDEL_PINNED_REVISION) {
    reasons.push("the sbom gap must bind the exact Sentrdel pin");
  }
  if (gap.engine_tree !== SENTRDEL_PINNED_TREE) {
    reasons.push("the sbom gap must bind the exact Sentrdel tree");
  }
  if (gap.engine_pin_ref !== SENTRDEL_PIN_REF) {
    reasons.push("the sbom gap must bind the exact Sentrdel pin ref");
  }
  if (gap.reason !== SENTRDEL_SBOM_GAP_REASON) {
    reasons.push("the sbom gap reason must be the pinned not-characterized reason");
  }
  return { ok: reasons.length === 0, reasons: Object.freeze(reasons) };
}

/** A normalized dependency record is never a Finding. */
export function dependencyObservationIsFindingV1(): boolean {
  return false;
}

/** A normalized dependency record is never a ClaimAssessment. */
export function dependencyObservationIsClaimAssessmentV1(): boolean {
  return false;
}

/** An advisory version match is never a vulnerability verdict. */
export function versionMatchIsVulnerableV1(): boolean {
  return false;
}

/** An advisory version match is never an exploitability verdict. */
export function versionMatchIsExploitableV1(): boolean {
  return false;
}

/** A stale or unavailable advisory corpus is never a no-known-vulnerability claim. */
export function staleAdvisoryIsNoKnownVulnerabilityV1(): boolean {
  return false;
}

/** A dependency delta is never a full dependency graph. */
export function deltaOnlyIsFullGraphV1(): boolean {
  return false;
}

/** Reachability is never computed at this pin, so it is never certain. */
export function reachabilityIsComputedV1(): boolean {
  return false;
}

/** A reachability-not-computed state is never an exploitability verdict. */
export function reachabilityNotComputedIsExploitableV1(): boolean {
  return false;
}

/** Severity is never derived at T08. */
export function severityIsDerivedV1(): boolean {
  return false;
}

/** A zero-match delta observation is never a secure claim. */
export function zeroMatchesImpliesSecureV1(): boolean {
  return false;
}

/** A zero-match observation is never a clean repository claim. */
export function zeroMatchesImpliesCleanV1(): boolean {
  return false;
}

/** Dependency normalization never implies a global clean. */
export function dependencyImpliesGlobalCleanV1(): boolean {
  return false;
}

/** Dependency normalization never implies a full repository inventory. */
export function dependencyImpliesFullInventoryV1(): boolean {
  return false;
}

/** The sbom capability is never executed at T08. */
export function sbomIsExecutedV1(): boolean {
  return false;
}

/** An unproven sbom inventory is never a clean inventory. */
export function sbomUnprovenIsCleanV1(): boolean {
  return false;
}

/** Dependency normalization is pure: no execution, clock, randomness, or network. */
export function scaNormalizationExecutesRuntimeV1(): boolean {
  return false;
}

export function scaNormalizationUsesClockV1(): boolean {
  return false;
}

export function scaNormalizationUsesRandomnessV1(): boolean {
  return false;
}

export function scaNormalizationRequiresNetworkV1(): boolean {
  return false;
}

export function scaNormalizationAccessesFilesystemV1(): boolean {
  return false;
}

export function scaNormalizationSpawnsProcessV1(): boolean {
  return false;
}

/**
 * The T04 asymmetry is honoured: DEPENDENCY_OBSERVATION is not a claim class
 * requiring mandatory provenance or a mandatory rule identity. Exported for a
 * direct assertion, so a future edit that silently tightens these rules to match
 * T06/T07 would fail loudly rather than fork canonical semantics.
 */
export function dependencyObservationAsymmetryIsCanonicalV1(): boolean {
  // The canonical sets are narrow literal unions that deliberately do NOT contain
  // DEPENDENCY_OBSERVATION, so they are widened to string here purely for the
  // membership test. The assertion below is exactly "T04 does not require these
  // for a dependency observation".
  const requiringProvenance: readonly string[] =
    SENTRDEL_CLAIM_CLASSES_REQUIRING_PROVENANCE;
  const requiringRuleId: readonly string[] =
    SENTRDEL_CLAIM_CLASSES_REQUIRING_RULE_ID;
  return (
    !requiringProvenance.includes("DEPENDENCY_OBSERVATION") &&
    !requiringRuleId.includes("DEPENDENCY_OBSERVATION")
  );
}
