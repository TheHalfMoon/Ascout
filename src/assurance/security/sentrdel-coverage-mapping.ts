/**
 * UA-P06-T05 â€” Sentrdel observation coverage loss and UNKNOWN mapping.
 *
 * Central question this task answers:
 *   "What did the engine actually cover, what did it not cover, and what remains
 *    unknown?"
 *
 * It must NEVER answer "is the repository globally secure?".
 *
 * Central invariants enforced here:
 *   UNSCANNED_SCOPE        != CLEAN
 *   UNKNOWN                != PASS
 *   PARTIAL_COVERAGE       != TOTAL_COVERAGE
 *   OMITTED_CLASS          != PASS
 *   SECURITY_OBSERVATION   != FINDING
 *   SECURITY_PASS          != SUPPORTED_CLAIM
 *
 * Reused without forking from the canonical T01-T04 surfaces:
 *   - sentrdel-source-pin.ts                   (exact donor pin/tree/pin_ref)
 *   - sentrdel-engine-boundary.ts              (engine id, engine version)
 *   - sentrdel-capability-characterization.ts  (capability set, UNKNOWN tokens)
 *   - sentrdel-engine-adapter.ts               (execution states, effect ceilings)
 *   - sentrdel-evidence-normalization.ts       (secret and self-attestation
 *                                               guards)
 *
 * This module is pure: no process execution, no network, no clock, no randomness,
 * no filesystem traversal. Identical canonical inputs always produce an identical
 * report.
 */
import {
  buildSentrdelCapabilitiesV1,
  getSentrdelCapabilityV1,
  SENTRDEL_CAPABILITY_IDS,
  SENTRDEL_UNKNOWN_TOKENS,
  type SentrdelCapabilityIdV1,
  type SentrdelUnknownTokenV1,
} from "./sentrdel-capability-characterization.js";
import {
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
  containsExternalAttestationV1,
  containsSecretMaterialV1,
} from "./sentrdel-evidence-normalization.js";
import {
  SENTRDEL_PINNED_REVISION,
  SENTRDEL_PINNED_TREE,
  SENTRDEL_PIN_REF,
} from "./sentrdel-source-pin.js";

export const SENTRDEL_COVERAGE_SCHEMA_VERSION = 1 as const;

export const SENTRDEL_COVERAGE_PHASE_AUTHORITY = "UA-P06-T05" as const;

/**
 * The single admissible authority of this task. There is deliberately no other
 * member: coverage mapping is a truth-boundary record, never a verdict.
 */
export const SENTRDEL_COVERAGE_AUTHORITIES = ["COVERAGE_MAPPING_ONLY"] as const;

export type SentrdelCoverageAuthorityV1 =
  (typeof SENTRDEL_COVERAGE_AUTHORITIES)[number];

/**
 * Scope unit states. There is deliberately no CLEAN, SECURE, PASS, or TOTAL
 * member: UNSCANNED_SCOPE != CLEAN, so the vocabulary itself cannot express a
 * promoted state.
 */
export const SENTRDEL_SCOPE_UNIT_STATES = [
  "COVERED",
  "PARTIALLY_COVERED",
  "UNSUPPORTED",
  "UNSCANNED",
  "UNKNOWN",
] as const;

export type SentrdelScopeUnitStateV1 =
  (typeof SENTRDEL_SCOPE_UNIT_STATES)[number];

export const SENTRDEL_SCOPE_PARSER_STATES = [
  "PARSER_SUPPORTED",
  "PARSER_UNSUPPORTED",
  "NOT_APPLICABLE",
] as const;

export type SentrdelScopeParserStateV1 =
  (typeof SENTRDEL_SCOPE_PARSER_STATES)[number];

export const SENTRDEL_SCOPE_EVIDENCE_STATES = [
  "EVIDENCE_PRODUCED",
  "EVIDENCE_MISSING",
  "NOT_APPLICABLE",
] as const;

export type SentrdelScopeEvidenceStateV1 =
  (typeof SENTRDEL_SCOPE_EVIDENCE_STATES)[number];

/**
 * Aggregate coverage states, ordered conservatively from worst to best. The
 * aggregate is derived, never supplied, and a single UNKNOWN anywhere forces the
 * aggregate down to UNKNOWN so UNKNOWN can never disappear in aggregation.
 */
export const SENTRDEL_AGGREGATE_COVERAGE_STATES = [
  "UNKNOWN",
  "NOT_COVERED",
  "PARTIALLY_COVERED",
  "COVERED_WITHIN_STATED_SCOPE",
] as const;

export type SentrdelAggregateCoverageStateV1 =
  (typeof SENTRDEL_AGGREGATE_COVERAGE_STATES)[number];

/**
 * Coverage loss reasons. Every loss is reason-bearing: there is no bare
 * "not covered" state without a cause.
 *
 * Each reason binds to the canonical T02 UNKNOWN token carrying the same meaning
 * wherever one exists, so T05 does not create a parallel UNKNOWN vocabulary. A
 * reason whose canonical token is `null` has no exact T02 equivalent and is
 * recorded as T05-native rather than silently mapped onto a neighbour.
 */
export const SENTRDEL_COVERAGE_LOSS_REASONS = [
  "UNSUPPORTED_INPUT",
  "UNSUPPORTED_LANGUAGE",
  "UNSUPPORTED_MANIFEST",
  "UNSUPPORTED_FORMAT",
  "UNSCANNED_PATH",
  "ENGINE_UNAVAILABLE",
  "ENGINE_NOT_QUALIFIED",
  "VERSION_MISMATCH",
  "POLICY_DENIED",
  "TIMEOUT",
  "MALFORMED_OUTPUT",
  "PARSER_FAILURE",
  "MISSING_PROVENANCE",
  "UNKNOWN_REACHABILITY",
  "STALE_ADVISORY_STATE",
] as const;

export type SentrdelCoverageLossReasonV1 =
  (typeof SENTRDEL_COVERAGE_LOSS_REASONS)[number];

/**
 * Reason -> canonical T02 UNKNOWN token. `null` means the reason has no exact
 * canonical equivalent; T05 keeps its own meaning instead of overloading a
 * neighbouring token.
 */
export const SENTRDEL_COVERAGE_LOSS_CANONICAL_TOKENS: Readonly<
  Record<SentrdelCoverageLossReasonV1, SentrdelUnknownTokenV1 | null>
> = Object.freeze({
  UNSUPPORTED_INPUT: "PARSER_UNSUPPORTED",
  UNSUPPORTED_LANGUAGE: "PARSER_UNSUPPORTED",
  UNSUPPORTED_MANIFEST: "MANIFEST_UNSUPPORTED",
  UNSUPPORTED_FORMAT: "PARSER_UNSUPPORTED",
  UNSCANNED_PATH: null,
  ENGINE_UNAVAILABLE: "ANALYZER_UNAVAILABLE",
  ENGINE_NOT_QUALIFIED: null,
  VERSION_MISMATCH: "VERSION_MISMATCH",
  POLICY_DENIED: "PERMISSION_DENIED",
  TIMEOUT: "TIMEOUT",
  MALFORMED_OUTPUT: "MALFORMED_OUTPUT",
  PARSER_FAILURE: null,
  MISSING_PROVENANCE: null,
  UNKNOWN_REACHABILITY: "REACHABILITY_NOT_COMPUTED",
  STALE_ADVISORY_STATE: "ADVISORY_STALE_UNAVAILABLE",
});

/**
 * The claim a given loss destroys. Deliberately bounded: a coverage loss either
 * removes a specific scope claim, removes the totality claim, or leaves the
 * record as observation scope only. There is no value meaning "no impact".
 */
export const SENTRDEL_COVERAGE_CLAIM_IMPACTS = [
  "SCOPE_CLAIM_UNAVAILABLE",
  "TOTALITY_CLAIM_UNAVAILABLE",
  "OBSERVATION_SCOPE_ONLY",
] as const;

export type SentrdelCoverageClaimImpactV1 =
  (typeof SENTRDEL_COVERAGE_CLAIM_IMPACTS)[number];

const CLAIM_IMPACT_BY_REASON: Readonly<
  Record<SentrdelCoverageLossReasonV1, SentrdelCoverageClaimImpactV1>
> = Object.freeze({
  UNSUPPORTED_INPUT: "SCOPE_CLAIM_UNAVAILABLE",
  UNSUPPORTED_LANGUAGE: "SCOPE_CLAIM_UNAVAILABLE",
  UNSUPPORTED_MANIFEST: "SCOPE_CLAIM_UNAVAILABLE",
  UNSUPPORTED_FORMAT: "SCOPE_CLAIM_UNAVAILABLE",
  UNSCANNED_PATH: "SCOPE_CLAIM_UNAVAILABLE",
  ENGINE_UNAVAILABLE: "TOTALITY_CLAIM_UNAVAILABLE",
  ENGINE_NOT_QUALIFIED: "TOTALITY_CLAIM_UNAVAILABLE",
  VERSION_MISMATCH: "TOTALITY_CLAIM_UNAVAILABLE",
  POLICY_DENIED: "TOTALITY_CLAIM_UNAVAILABLE",
  TIMEOUT: "SCOPE_CLAIM_UNAVAILABLE",
  MALFORMED_OUTPUT: "SCOPE_CLAIM_UNAVAILABLE",
  PARSER_FAILURE: "SCOPE_CLAIM_UNAVAILABLE",
  MISSING_PROVENANCE: "SCOPE_CLAIM_UNAVAILABLE",
  UNKNOWN_REACHABILITY: "SCOPE_CLAIM_UNAVAILABLE",
  STALE_ADVISORY_STATE: "SCOPE_CLAIM_UNAVAILABLE",
});

/**
 * Whether recovery or retest is possible. A loss that cannot be recovered at
 * this pin stays explicit forever rather than being scheduled away.
 */
export const SENTRDEL_COVERAGE_RECOVERY_STATES = [
  "RETEST_POSSIBLE",
  "RETEST_REQUIRES_ENGINE",
  "RETEST_REQUIRES_POLICY_AUTHORIZATION",
  "RECOVERY_NOT_POSSIBLE",
] as const;

export type SentrdelCoverageRecoveryStateV1 =
  (typeof SENTRDEL_COVERAGE_RECOVERY_STATES)[number];

const RECOVERY_BY_REASON: Readonly<
  Record<SentrdelCoverageLossReasonV1, SentrdelCoverageRecoveryStateV1>
> = Object.freeze({
  UNSUPPORTED_INPUT: "RECOVERY_NOT_POSSIBLE",
  UNSUPPORTED_LANGUAGE: "RECOVERY_NOT_POSSIBLE",
  UNSUPPORTED_MANIFEST: "RECOVERY_NOT_POSSIBLE",
  UNSUPPORTED_FORMAT: "RECOVERY_NOT_POSSIBLE",
  UNSCANNED_PATH: "RECOVERY_NOT_POSSIBLE",
  ENGINE_UNAVAILABLE: "RETEST_REQUIRES_ENGINE",
  ENGINE_NOT_QUALIFIED: "RETEST_REQUIRES_ENGINE",
  VERSION_MISMATCH: "RETEST_REQUIRES_ENGINE",
  POLICY_DENIED: "RETEST_REQUIRES_POLICY_AUTHORIZATION",
  TIMEOUT: "RETEST_POSSIBLE",
  MALFORMED_OUTPUT: "RETEST_REQUIRES_ENGINE",
  PARSER_FAILURE: "RETEST_REQUIRES_ENGINE",
  MISSING_PROVENANCE: "RETEST_POSSIBLE",
  UNKNOWN_REACHABILITY: "RECOVERY_NOT_POSSIBLE",
  STALE_ADVISORY_STATE: "RECOVERY_NOT_POSSIBLE",
});

/**
 * Execution states that mean "the engine produced no coverage for this
 * capability". A capability in one of these states may never present a COVERED
 * scope unit, and always carries an explicit coverage loss.
 */
export const SENTRDEL_NON_PRODUCING_EXECUTION_STATES = [
  "UNAVAILABLE",
  "NOT_QUALIFIED",
  "VERSION_MISMATCH",
  "DENIED_BY_POLICY",
  "NOT_RUN",
  "INCOMPLETE",
  "TIMEOUT",
  "MALFORMED_OUTPUT",
  "ENGINE_ERROR",
] as const;

const NON_PRODUCING_SET = new Set<string>(
  SENTRDEL_NON_PRODUCING_EXECUTION_STATES,
);

/**
 * The coverage loss each non-producing execution state must carry. This is a
 * deterministic derivation, never a caller choice: a timeout can only ever be
 * TIMEOUT, and a version mismatch can only ever be VERSION_MISMATCH.
 */
export const SENTRDEL_EXECUTION_STATE_LOSS_REASON: Readonly<
  Record<string, SentrdelCoverageLossReasonV1>
> = Object.freeze({
  UNAVAILABLE: "ENGINE_UNAVAILABLE",
  NOT_QUALIFIED: "ENGINE_NOT_QUALIFIED",
  VERSION_MISMATCH: "VERSION_MISMATCH",
  DENIED_BY_POLICY: "POLICY_DENIED",
  NOT_RUN: "ENGINE_UNAVAILABLE",
  INCOMPLETE: "ENGINE_UNAVAILABLE",
  TIMEOUT: "TIMEOUT",
  MALFORMED_OUTPUT: "MALFORMED_OUTPUT",
  ENGINE_ERROR: "PARSER_FAILURE",
});

export const SENTRDEL_COVERAGE_KNOWN_LIMITATIONS = [
  "A coverage mapping answers what was covered, what was not covered, and what is unknown; it never answers whether a repository is secure.",
  "UNSCANNED_SCOPE != CLEAN: an unscanned scope unit is recorded, never treated as clean.",
  "UNKNOWN != PASS: an unknown scope unit blocks every stronger claim and is never aggregated away.",
  "PARTIAL_COVERAGE != TOTAL_COVERAGE: a partially covered capability is never promoted to covered.",
  "OMITTED_CLASS != PASS: a requested capability that was not run is explicit coverage loss, never a pass.",
  "A non-producing execution state must carry its own canonical coverage loss reason.",
  "Coverage losses are reason-bearing and always name a capability, an affected scope, a claim impact, and a recovery state.",
  "totality_claim_available is a literal false type: totality is structurally unclaimable from coverage mapping.",
  "Aggregate coverage is conservative: a single UNKNOWN anywhere forces the aggregate to UNKNOWN.",
  "Coverage loss reason codes bind to the canonical T02 UNKNOWN tokens wherever an exact equivalent exists.",
  "The engine reporting no observations inside covered scope says nothing about scope outside that coverage.",
  "Coverage mapping emits no Finding, no ClaimAssessment, and no assurance verdict.",
  "Coverage mapping is pure: no execution, no network, no clock, no randomness, no traversal order.",
] as const;

/** One scope unit under one capability. State is single-valued by construction. */
export interface SentrdelScopeUnitV1 {
  readonly unit_ref: string;
  readonly state: SentrdelScopeUnitStateV1;
  readonly parser_state: SentrdelScopeParserStateV1;
  readonly evidence_state: SentrdelScopeEvidenceStateV1;
}

/** One declared coverage loss before derivation. */
export interface SentrdelCoverageLossInputV1 {
  readonly scope_ref: string;
  readonly reason: SentrdelCoverageLossReasonV1;
  readonly reason_detail: string;
  readonly evidence_refs: readonly string[];
}

/** One fully derived, immutable, deterministic coverage loss. */
export interface SentrdelCoverageLossV1 {
  readonly loss_id: string;
  readonly capability_id: SentrdelCapabilityIdV1;
  readonly scope_ref: string;
  readonly reason: SentrdelCoverageLossReasonV1;
  readonly reason_detail: string;
  readonly canonical_unknown_token: SentrdelUnknownTokenV1 | null;
  readonly canonical_token_declared_by_capability: boolean;
  readonly evidence_refs: readonly string[];
  readonly claim_impact: SentrdelCoverageClaimImpactV1;
  readonly recovery: SentrdelCoverageRecoveryStateV1;
}

/** The explicit, multidimensional coverage record for one capability. */
export interface SentrdelCapabilityCoverageV1 {
  readonly capability_id: SentrdelCapabilityIdV1;
  readonly capability_status: string;
  readonly requested: boolean;
  readonly executed: boolean;
  readonly execution_state: SentrdelAdapterExecutionStateV1;
  readonly coverage_state: SentrdelAggregateCoverageStateV1;
  readonly scope_units: readonly SentrdelScopeUnitV1[];
  readonly scanned_units: readonly string[];
  readonly partially_covered_units: readonly string[];
  readonly unscanned_units: readonly string[];
  readonly unsupported_units: readonly string[];
  readonly unknown_units: readonly string[];
  readonly parser_supported_inputs: readonly string[];
  readonly parser_unsupported_inputs: readonly string[];
  readonly evidence_producing_scope: readonly string[];
  readonly evidence_missing_scope: readonly string[];
  readonly supported_scope: string;
  readonly unsupported_scope: string;
  readonly unknown_reasons: readonly string[];
  readonly coverage_limitations: readonly string[];
  readonly coverage_losses: readonly SentrdelCoverageLossV1[];
  readonly evidence_refs: readonly string[];
  readonly is_fully_covered: boolean;
  readonly unscanned_is_clean: false;
  readonly unknown_is_pass: false;
  readonly omitted_is_pass: false;
}

/** Deterministic effect statements for the three blocking absence conditions. */
export const SENTRDEL_COVERAGE_ABSENCE_EFFECTS = [
  "NONE",
  "COVERAGE_OMITTED_EXPLICIT",
  "COVERAGE_REDUCED_TO_UNKNOWN",
] as const;

export type SentrdelCoverageAbsenceEffectV1 =
  (typeof SENTRDEL_COVERAGE_ABSENCE_EFFECTS)[number];

/**
 * The bounded, immutable, deterministic coverage report.
 *
 * `totality_claim_available`, `global_clean_claimed`, `unscanned_is_clean`,
 * `unknown_is_pass`, and `partial_is_total` are literal `false` types. Global
 * cleanliness is therefore structurally impossible to express, not merely
 * discouraged.
 */
export interface SentrdelCoverageReportV1 {
  readonly schema_version: 1;
  readonly phase_authority: typeof SENTRDEL_COVERAGE_PHASE_AUTHORITY;
  readonly authority: SentrdelCoverageAuthorityV1;
  readonly request_id: string;
  readonly attempt_id: string;
  readonly source_head: string;
  readonly engine_id: typeof SENTRDEL_ENGINE_ID;
  readonly engine_pin: typeof SENTRDEL_PINNED_REVISION;
  readonly engine_tree: typeof SENTRDEL_PINNED_TREE;
  readonly engine_pin_ref: typeof SENTRDEL_PIN_REF;
  readonly engine_version: typeof SENTRDEL_ENGINE_VERSION;
  readonly requested_capabilities: readonly SentrdelCapabilityIdV1[];
  readonly executed_capabilities: readonly SentrdelCapabilityIdV1[];
  readonly not_executed_capabilities: readonly SentrdelCapabilityIdV1[];
  readonly capability_coverage: readonly SentrdelCapabilityCoverageV1[];
  readonly coverage_losses: readonly SentrdelCoverageLossV1[];
  readonly unknown_reasons: readonly string[];
  readonly coverage_limitations: readonly string[];
  readonly execution_incomplete: boolean;
  readonly version_mismatch_effect: SentrdelCoverageAbsenceEffectV1;
  readonly denied_policy_effect: SentrdelCoverageAbsenceEffectV1;
  readonly unavailable_engine_effect: SentrdelCoverageAbsenceEffectV1;
  readonly aggregate_coverage_state: SentrdelAggregateCoverageStateV1;
  readonly aggregate_is_conservative: true;
  readonly observation_refs: readonly string[];
  readonly effect_facts: SentrdelAdapterEffectCeilingV1;
  readonly network_facts: SentrdelAdapterNetworkPolicyV1;
  readonly egress_facts: SentrdelAdapterEgressPolicyV1;
  readonly totality_claim_available: false;
  readonly global_clean_claimed: false;
  readonly unscanned_is_clean: false;
  readonly unknown_is_pass: false;
  readonly partial_is_total: false;
  readonly omitted_class_is_pass: false;
  readonly security_pass_is_supported_claim: false;
  readonly security_observation_is_finding: false;
  readonly finding_emitted: false;
  readonly claim_assessment_emitted: false;
  readonly assurance_effect: "NONE";
}

/** One capability run as supplied by a caller. Input, never truth. */
export interface SentrdelCapabilityRunInputV1 {
  readonly capability_id: string;
  readonly execution_state: string;
  readonly scope_units: readonly SentrdelScopeUnitV1[];
  readonly coverage_losses: readonly SentrdelCoverageLossInputV1[];
  readonly coverage_limitations: readonly string[];
  readonly evidence_refs: readonly string[];
}

/** Bounded, untrusted coverage input. This is input, never truth. */
export interface SentrdelCoverageRequestV1 {
  readonly schema_version: 1;
  readonly request_id: string;
  readonly attempt_id: string;
  readonly source_head: string;
  readonly engine_id: string;
  readonly engine_pin: string;
  readonly engine_tree: string;
  readonly engine_version: string;
  readonly requested_capabilities: readonly string[];
  readonly runs: readonly SentrdelCapabilityRunInputV1[];
  readonly effect_facts: string;
  readonly network_facts: string;
  readonly egress_facts: string;
}

export interface SentrdelCoverageValidationV1 {
  readonly schema_version: 1;
  readonly valid: boolean;
  readonly reasons: readonly string[];
}

const GIT_SHA1_HEX = /^[a-f0-9]{40}$/u;
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const MAX_SCOPE_UNITS = 128;
const MAX_LOSSES = 64;
const MAX_EVIDENCE_REFS = 32;
const MAX_LIMITATIONS = 32;
const MAX_RUNS = 16;

const CAPABILITY_ID_SET = new Set<string>(SENTRDEL_CAPABILITY_IDS);
const LOSS_REASON_SET = new Set<string>(SENTRDEL_COVERAGE_LOSS_REASONS);
const SCOPE_STATE_SET = new Set<string>(SENTRDEL_SCOPE_UNIT_STATES);
const PARSER_STATE_SET = new Set<string>(SENTRDEL_SCOPE_PARSER_STATES);
const EVIDENCE_STATE_SET = new Set<string>(SENTRDEL_SCOPE_EVIDENCE_STATES);
const UNKNOWN_TOKEN_SET = new Set<string>(SENTRDEL_UNKNOWN_TOKENS);

const REQUEST_KEYS = [
  "schema_version",
  "request_id",
  "attempt_id",
  "source_head",
  "engine_id",
  "engine_pin",
  "engine_tree",
  "engine_version",
  "requested_capabilities",
  "runs",
  "effect_facts",
  "network_facts",
  "egress_facts",
] as const;

const RUN_KEYS = [
  "capability_id",
  "execution_state",
  "scope_units",
  "coverage_losses",
  "coverage_limitations",
  "evidence_refs",
] as const;

const SCOPE_UNIT_KEYS = [
  "unit_ref",
  "state",
  "parser_state",
  "evidence_state",
] as const;

const LOSS_KEYS = [
  "scope_ref",
  "reason",
  "reason_detail",
  "evidence_refs",
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

/**
 * Canonical code-unit ordering. Never locale-dependent, never traversal
 * dependent.
 */
function canonicalStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...values].sort());
}

/**
 * Capability-identity ordering. Validated input is already proven to be a subset
 * of the frozen T02 capability vocabulary, so the identity type is preserved
 * rather than widened to plain strings.
 */
function canonicalCapabilities(
  values: readonly SentrdelCapabilityIdV1[],
): readonly SentrdelCapabilityIdV1[] {
  return Object.freeze([...values].sort(compareText));
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
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

function lossIdV1(
  requestId: string,
  capabilityId: string,
  loss: SentrdelCoverageLossInputV1,
): string {
  return `loss:sentrdel:${canonicalDigestV1(
    [
      "sentrdel-coverage-loss-v1",
      requestId,
      capabilityId,
      loss.scope_ref,
      loss.reason,
    ].join("|"),
  )}`;
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
  const ordered = [...(values as readonly string[])].sort();
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

function capabilityDeclaredTokens(
  capabilityId: SentrdelCapabilityIdV1,
): ReadonlySet<string> {
  const capability = getSentrdelCapabilityV1(
    buildSentrdelCapabilitiesV1(),
    capabilityId,
  );
  return new Set<string>(capability?.unknown_tokens ?? []);
}

/**
 * Deterministic capability coverage derivation.
 *
 * Conservative by construction:
 *   - a single UNKNOWN scope unit forces the capability to UNKNOWN
 *   - a single uncovered or unsupported unit forces the capability below covered
 *   - a capability with no scope unit at all is NOT_COVERED, never covered
 */
function deriveCapabilityCoverageState(
  units: readonly SentrdelScopeUnitV1[],
): SentrdelAggregateCoverageStateV1 {
  if (units.length === 0) {
    return "NOT_COVERED";
  }
  let unknown = false;
  let uncovered = false;
  let partial = false;
  for (const unit of units) {
    if (unit.state === "UNKNOWN") {
      unknown = true;
    } else if (unit.state === "UNSCANNED" || unit.state === "UNSUPPORTED") {
      uncovered = true;
    } else if (unit.state === "PARTIALLY_COVERED") {
      partial = true;
    }
  }
  if (unknown) return "UNKNOWN";
  if (uncovered) return "NOT_COVERED";
  if (partial) return "PARTIALLY_COVERED";
  return "COVERED_WITHIN_STATED_SCOPE";
}

function projectUnits(
  units: readonly SentrdelScopeUnitV1[],
  state: SentrdelScopeUnitStateV1,
): readonly string[] {
  return canonicalStrings(
    units.filter((unit) => unit.state === state).map((unit) => unit.unit_ref),
  );
}

function projectParser(
  units: readonly SentrdelScopeUnitV1[],
  state: SentrdelScopeParserStateV1,
): readonly string[] {
  return canonicalStrings(
    units
      .filter((unit) => unit.parser_state === state)
      .map((unit) => unit.unit_ref),
  );
}

/**
 * Validates scope units and their multidimensional states. Every contradictory
 * combination fails closed rather than resolving optimistically.
 */
function validateScopeUnits(
  units: unknown,
  field: string,
  reasons: string[],
): readonly SentrdelScopeUnitV1[] {
  if (!Array.isArray(units)) {
    reasons.push(`${field} must be an array`);
    return Object.freeze([]);
  }
  if (units.length > MAX_SCOPE_UNITS) {
    reasons.push(`${field} must contain at most ${MAX_SCOPE_UNITS} entries`);
    return Object.freeze([]);
  }
  const validated: SentrdelScopeUnitV1[] = [];
  const seen = new Set<string>();
  for (const candidate of units) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, SCOPE_UNIT_KEYS)) {
      reasons.push(`${field} entries must carry exactly the canonical scope keys`);
      return Object.freeze([]);
    }
    const unitRef = candidate["unit_ref"];
    if (!isOpaqueId(unitRef)) {
      reasons.push(`${field} unit_ref must be a bounded opaque identifier`);
      return Object.freeze([]);
    }
    if (seen.has(unitRef)) {
      reasons.push(`${field} contains a duplicate scope unit: ${unitRef}`);
      return Object.freeze([]);
    }
    seen.add(unitRef);
    const state = candidate["state"];
    const parserState = candidate["parser_state"];
    const evidenceState = candidate["evidence_state"];
    if (!SCOPE_STATE_SET.has(state as string)) {
      reasons.push(`${field} scope state is unknown for ${unitRef}`);
      return Object.freeze([]);
    }
    if (!PARSER_STATE_SET.has(parserState as string)) {
      reasons.push(`${field} parser state is unknown for ${unitRef}`);
      return Object.freeze([]);
    }
    if (!EVIDENCE_STATE_SET.has(evidenceState as string)) {
      reasons.push(`${field} evidence state is unknown for ${unitRef}`);
      return Object.freeze([]);
    }
    if (state === "COVERED" && parserState === "PARSER_UNSUPPORTED") {
      reasons.push(`${field} ${unitRef} is covered and parser-unsupported at once`);
    }
    if (state === "COVERED" && evidenceState === "EVIDENCE_MISSING") {
      reasons.push(`${field} ${unitRef} is covered and evidence-missing at once`);
    }
    if (state === "UNSUPPORTED" && parserState === "PARSER_SUPPORTED") {
      reasons.push(`${field} ${unitRef} is unsupported yet parser-supported at once`);
    }
    if (state === "UNKNOWN" && evidenceState === "EVIDENCE_PRODUCED") {
      reasons.push(`${field} ${unitRef} is unknown yet already produced evidence`);
    }
    if (
      (state === "UNSCANNED" || state === "UNSUPPORTED") &&
      evidenceState === "EVIDENCE_PRODUCED"
    ) {
      reasons.push(
        `${field} ${unitRef} is not covered yet already produced evidence`,
      );
    }
    validated.push(
      Object.freeze({
        unit_ref: unitRef,
        state: state as SentrdelScopeUnitStateV1,
        parser_state: parserState as SentrdelScopeParserStateV1,
        evidence_state: evidenceState as SentrdelScopeEvidenceStateV1,
      }),
    );
  }
  return Object.freeze(validated);
}


function projectEvidence(
  units: readonly SentrdelScopeUnitV1[],
  state: SentrdelScopeEvidenceStateV1,
): readonly string[] {
  return canonicalStrings(
    units
      .filter((unit) => unit.evidence_state === state)
      .map((unit) => unit.unit_ref),
  );
}

function validateCoverageLosses(
  losses: unknown,
  field: string,
  reasons: string[],
): readonly SentrdelCoverageLossInputV1[] {
  if (!Array.isArray(losses)) {
    reasons.push(`${field} must be an array`);
    return Object.freeze([]);
  }
  if (losses.length > MAX_LOSSES) {
    reasons.push(`${field} must contain at most ${MAX_LOSSES} entries`);
    return Object.freeze([]);
  }
  const validated: SentrdelCoverageLossInputV1[] = [];
  for (const candidate of losses) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, LOSS_KEYS)) {
      reasons.push(`${field} entries must carry exactly the canonical loss keys`);
      return Object.freeze([]);
    }
    const scopeRef = candidate["scope_ref"];
    const reason = candidate["reason"];
    const reasonDetail = candidate["reason_detail"];
    if (!isOpaqueId(scopeRef)) {
      reasons.push(`${field} scope_ref must be a bounded opaque identifier`);
      return Object.freeze([]);
    }
    if (!LOSS_REASON_SET.has(reason as string)) {
      reasons.push(`${field} reason is not canonical: ${String(reason)}`);
      return Object.freeze([]);
    }
    if (!isBoundedText(reasonDetail)) {
      reasons.push(`${field} reason_detail must be bounded non-empty text`);
      return Object.freeze([]);
    }
    const before = reasons.length;
    const evidenceRefs = canonicalizeStringList(
      candidate["evidence_refs"],
      `${field} evidence_refs`,
      isOpaqueId,
      MAX_EVIDENCE_REFS,
      reasons,
    );
    if (reasons.length > before) {
      return Object.freeze([]);
    }
    validated.push(
      Object.freeze({
        scope_ref: scopeRef,
        reason: reason as SentrdelCoverageLossReasonV1,
        reason_detail: reasonDetail,
        evidence_refs: evidenceRefs,
      }),
    );
  }
  return Object.freeze(validated);
}

/**
 * Fail-closed validation of bounded coverage input. Any defect yields a non-empty
 * reason list; a caller must not emit a coverage report in that case.
 */
export function validateSentrdelCoverageRequestV1(
  request: unknown,
): SentrdelCoverageValidationV1 {
  const reasons: string[] = [];

  if (!isRecord(request)) {
    return {
      schema_version: 1,
      valid: false,
      reasons: Object.freeze(["coverage request must be an object"]),
    };
  }

  if (!hasExactKeys(request, REQUEST_KEYS)) {
    reasons.push("coverage request contains missing or unsupported fields");
  }

  for (const forbidden of [
    "finding",
    "claim_assessment",
    "assurance",
    "verdict",
    "global_clean",
    "totality_claim",
  ]) {
    if (request[forbidden] !== undefined) {
      reasons.push(`coverage request must never carry ${forbidden}`);
    }
  }

  if (request["schema_version"] !== SENTRDEL_COVERAGE_SCHEMA_VERSION) {
    reasons.push("coverage request schema version must be 1");
  }
  if (!isOpaqueId(request["request_id"])) {
    reasons.push("request_id must be a bounded opaque identifier");
  }
  if (!isOpaqueId(request["attempt_id"])) {
    reasons.push("attempt_id must be a bounded opaque identifier");
  }

  if (request["engine_id"] !== SENTRDEL_ENGINE_ID) {
    reasons.push("engine id must be engine:sentrdel");
  }
  if (request["engine_pin"] !== SENTRDEL_PINNED_REVISION) {
    reasons.push("engine pin must equal the live-verified Sentrdel pin");
  }
  if (request["engine_tree"] !== SENTRDEL_PINNED_TREE) {
    reasons.push("engine tree must equal the live-verified Sentrdel tree");
  }
  if (request["engine_version"] !== SENTRDEL_ENGINE_VERSION) {
    reasons.push("engine version must equal the pinned Sentrdel version");
  }
  if (
    typeof request["source_head"] !== "string" ||
    !GIT_SHA1_HEX.test(request["source_head"])
  ) {
    reasons.push("source_head must be a 40 character lowercase hex sha");
  }

  const requested = canonicalizeStringList(
    request["requested_capabilities"],
    "requested_capabilities",
    isOpaqueId,
    SENTRDEL_CAPABILITY_IDS.length,
    reasons,
  );
  for (const capabilityId of requested) {
    if (!CAPABILITY_ID_SET.has(capabilityId)) {
      reasons.push(`unknown capability identity rejected: ${capabilityId}`);
    }
  }

  if (
    !SENTRDEL_ADAPTER_EFFECT_CEILINGS.includes(
      request["effect_facts"] as SentrdelAdapterEffectCeilingV1,
    )
  ) {
    reasons.push("effect facts exceed the canonical ceiling vocabulary");
  } else if (request["effect_facts"] !== "E0_READ_ONLY_ANALYSIS") {
    reasons.push("effect facts must remain E0_READ_ONLY_ANALYSIS in T05");
  }
  if (
    !SENTRDEL_ADAPTER_NETWORK_POLICIES.includes(
      request["network_facts"] as SentrdelAdapterNetworkPolicyV1,
    )
  ) {
    reasons.push("network facts are outside the canonical policy vocabulary");
  } else if (request["network_facts"] !== "NO_NETWORK") {
    reasons.push("network facts must remain NO_NETWORK in T05");
  }
  if (
    !SENTRDEL_ADAPTER_EGRESS_POLICIES.includes(
      request["egress_facts"] as SentrdelAdapterEgressPolicyV1,
    )
  ) {
    reasons.push("egress facts are outside the canonical policy vocabulary");
  } else if (request["egress_facts"] !== "NO_EGRESS") {
    reasons.push("egress facts must remain NO_EGRESS in T05");
  }

  const runs = request["runs"];
  if (!Array.isArray(runs)) {
    reasons.push("runs must be an array");
  } else if (runs.length > MAX_RUNS) {
    reasons.push(`runs must contain at most ${MAX_RUNS} entries`);
  } else {
    validateRuns(runs, requested, reasons);
  }

  return {
    schema_version: 1,
    valid: reasons.length === 0,
    reasons: Object.freeze([...new Set(reasons)]),
  };
}

function validateRuns(
  runs: readonly unknown[],
  requested: readonly string[],
  reasons: string[],
): void {
  const seenCapability = new Set<string>();
  for (const run of runs) {
    if (!isRecord(run) || !hasExactKeys(run, RUN_KEYS)) {
      reasons.push("run entries must carry exactly the canonical run keys");
      return;
    }
    const capabilityId = run["capability_id"];
    if (!CAPABILITY_ID_SET.has(capabilityId as string)) {
      reasons.push(`unknown capability identity rejected: ${String(capabilityId)}`);
      return;
    }
    if (seenCapability.has(capabilityId as string)) {
      reasons.push(`duplicate run for capability: ${String(capabilityId)}`);
      return;
    }
    seenCapability.add(capabilityId as string);
    if (!requested.includes(capabilityId as string)) {
      reasons.push(
        `run capability is not in requested_capabilities: ${String(capabilityId)}`,
      );
      return;
    }
    const executionState = run["execution_state"];
    if (
      !SENTRDEL_ADAPTER_EXECUTION_STATES.includes(
        executionState as SentrdelAdapterExecutionStateV1,
      )
    ) {
      reasons.push(`execution state is unknown: ${String(executionState)}`);
      return;
    }

    const units = validateScopeUnits(run["scope_units"], "scope_units", reasons);
    const losses = validateCoverageLosses(
      run["coverage_losses"],
      "coverage_losses",
      reasons,
    );
    const limitations = canonicalizeStringList(
      run["coverage_limitations"],
      "coverage_limitations",
      isBoundedText,
      MAX_LIMITATIONS,
      reasons,
    );
    const evidenceRefs = canonicalizeStringList(
      run["evidence_refs"],
      "run evidence_refs",
      isOpaqueId,
      MAX_EVIDENCE_REFS,
      reasons,
    );
    if (reasons.length > 0) {
      return;
    }

    validateRunSemantics(
      capabilityId as SentrdelCapabilityIdV1,
      executionState as string,
      units,
      losses,
      limitations,
      evidenceRefs,
      reasons,
    );
    if (reasons.length > 0) {
      return;
    }
  }
}

/**
 * Semantic validation of one capability run.
 *
 * This is where the central invariants become load-bearing:
 *   - a non-producing execution state must carry its own canonical loss reason
 *   - a non-producing execution state may never present covered scope or evidence
 *   - a duplicate coverage-loss identity fails closed
 *   - a declared loss must name a scope that exists
 *   - a non-covered scope unit must be reason-bearing, never an unexplained gap
 *   - no persisted reason, scope, or reference may carry secrets or attestation
 */
function validateRunSemantics(
  capabilityId: SentrdelCapabilityIdV1,
  executionState: string,
  units: readonly SentrdelScopeUnitV1[],
  losses: readonly SentrdelCoverageLossInputV1[],
  limitations: readonly string[],
  evidenceRefs: readonly string[],
  reasons: string[],
): void {
  // Deterministic, non-optional loss derivation: a non-producing execution
  // state must carry exactly its own canonical reason.
  if (NON_PRODUCING_SET.has(executionState)) {
    const requiredReason = SENTRDEL_EXECUTION_STATE_LOSS_REASON[executionState];
    const declared = new Set(losses.map((loss) => loss.reason));
    if (requiredReason !== undefined && !declared.has(requiredReason)) {
      reasons.push(
        `execution state ${executionState} must declare coverage loss ${requiredReason}`,
      );
    }
    for (const loss of losses) {
      if (
        loss.scope_ref === "capability" &&
        requiredReason !== undefined &&
        loss.reason !== requiredReason
      ) {
        reasons.push(
          `execution state ${executionState} may only declare ${requiredReason} at capability scope`,
        );
      }
    }
    if (units.some((unit) => unit.state === "COVERED")) {
      reasons.push(
        `execution state ${executionState} produced no coverage and may not report covered scope`,
      );
    }
    if (projectEvidence(units, "EVIDENCE_PRODUCED").length > 0) {
      reasons.push(`execution state ${executionState} produced no evidence`);
    }
  }

  // Duplicate coverage-loss identity is a fail-closed condition, never a
  // silently deduplicated set.
  const lossIdentities = new Set<string>();
  for (const loss of losses) {
    const identity = `${loss.scope_ref}|${loss.reason}`;
    if (lossIdentities.has(identity)) {
      reasons.push(`duplicate coverage loss identity: ${loss.scope_ref}|${loss.reason}`);
    }
    lossIdentities.add(identity);
  }

  const unitRefs = new Set<string>(units.map((unit) => unit.unit_ref));
  const declaredTokens = capabilityDeclaredTokens(capabilityId);
  for (const loss of losses) {
    if (loss.scope_ref !== "capability" && !unitRefs.has(loss.scope_ref)) {
      reasons.push(`coverage loss names an unknown scope reference: ${loss.scope_ref}`);
    }
    const canonical = SENTRDEL_COVERAGE_LOSS_CANONICAL_TOKENS[loss.reason];
    if (canonical !== null && canonical !== undefined) {
      if (!UNKNOWN_TOKEN_SET.has(canonical)) {
        reasons.push(
          `coverage loss reason ${loss.reason} binds an unknown canonical token`,
        );
      }
      // A scope-attributed loss may only cite a reason the pinned capability
      // itself declares. A capability-scope loss is exempt: engine absence is an
      // execution condition, not an in-capability parser condition, and the T02
      // vocabulary need not enumerate it per capability.
      if (loss.scope_ref !== "capability" && !declaredTokens.has(canonical)) {
        reasons.push(
          `capability ${capabilityId} does not declare coverage loss reason ${loss.reason}`,
        );
      }
    }
  }

  // A non-covered scope unit must be reason-bearing. UNKNOWN units are exempt
  // only because UNKNOWN is already an explicit non-claim, never a gap. A
  // capability-scope loss is also exempt: it is the declared reason for the
  // whole capability, so demanding a redundant per-unit reason would only invite
  // duplicate identities.
  const hasCapabilityScopeLoss = losses.some(
    (candidate) => candidate.scope_ref === "capability",
  );
  for (const unit of units) {
    if (unit.state === "COVERED" || unit.state === "UNKNOWN") {
      continue;
    }
    if (!losses.some((loss) => loss.scope_ref === unit.unit_ref)) {
      if (hasCapabilityScopeLoss) {
        continue;
      }
      reasons.push(
        `scope unit ${unit.unit_ref} is ${unit.state} without a coverage loss reason`,
      );
    }
  }

  // Secret and self-attestation boundaries over every persisted string.
  const persistedStrings: unknown[] = [
    ...units.map((unit) => unit.unit_ref),
    ...losses.flatMap((loss) => [
      loss.scope_ref,
      loss.reason,
      loss.reason_detail,
      ...loss.evidence_refs,
    ]),
    ...limitations,
    ...evidenceRefs,
  ];
  scanStrings(
    persistedStrings,
    containsSecretMaterialV1,
    "coverage request must not carry secret material",
    reasons,
  );
  scanStrings(
    [...persistedStrings, executionState],
    containsExternalAttestationV1,
    "coverage request must never self-attest",
    reasons,
  );

  // A coverage record must always state its own limitations.
  if (limitations.length === 0) {
    reasons.push(`capability ${capabilityId} must state explicit coverage limitations`);
  }
}

function deriveLoss(
  requestId: string,
  capabilityId: SentrdelCapabilityIdV1,
  loss: SentrdelCoverageLossInputV1,
): SentrdelCoverageLossV1 {
  const canonical = SENTRDEL_COVERAGE_LOSS_CANONICAL_TOKENS[loss.reason];
  const declaredTokens = capabilityDeclaredTokens(capabilityId);
  return Object.freeze({
    loss_id: lossIdV1(requestId, capabilityId, loss),
    capability_id: capabilityId,
    scope_ref: loss.scope_ref,
    reason: loss.reason,
    reason_detail: loss.reason_detail,
    canonical_unknown_token: canonical ?? null,
    canonical_token_declared_by_capability:
      canonical !== null &&
      canonical !== undefined &&
      declaredTokens.has(canonical),
    evidence_refs: loss.evidence_refs,
    claim_impact: CLAIM_IMPACT_BY_REASON[loss.reason],
    recovery: RECOVERY_BY_REASON[loss.reason],
  });
}

/**
 * Deterministic conservative aggregation.
 *
 * The aggregate never ranks above the worst capability present, and an empty run
 * set is NOT_COVERED rather than clean. A single UNKNOWN anywhere forces the
 * whole aggregate to UNKNOWN so UNKNOWN can never disappear in aggregation.
 */
function aggregateCoverage(
  coverage: readonly SentrdelCapabilityCoverageV1[],
): SentrdelAggregateCoverageStateV1 {
  if (coverage.length === 0) {
    return "NOT_COVERED";
  }
  let aggregate: SentrdelAggregateCoverageStateV1 =
    "COVERED_WITHIN_STATED_SCOPE";
  for (const record of coverage) {
    if (record.coverage_state === "UNKNOWN") {
      return "UNKNOWN";
    }
    if (record.coverage_state === "NOT_COVERED") {
      aggregate = "NOT_COVERED";
    } else if (
      record.coverage_state === "PARTIALLY_COVERED" &&
      aggregate === "COVERED_WITHIN_STATED_SCOPE"
    ) {
      aggregate = "PARTIALLY_COVERED";
    }
  }
  return aggregate;
}

/**
 * Map validated coverage input into a deterministic, observation-only coverage
 * report. Fails closed: on any validation defect no report is produced, so
 * malformed input can never look like successful coverage.
 */
export function mapSentrdelCoverageV1(
  request: unknown,
): SentrdelCoverageReportV1 | undefined {
  const validation = validateSentrdelCoverageRequestV1(request);
  if (!validation.valid) {
    return undefined;
  }
  const input = request as SentrdelCoverageRequestV1;

  const capabilityCoverage: SentrdelCapabilityCoverageV1[] = [];
  const allLosses: SentrdelCoverageLossV1[] = [];
  const allUnknownReasons: string[] = [];
  const allLimitations: string[] = [];
  const allObservationRefs: string[] = [];
  const executed: SentrdelCapabilityIdV1[] = [];
  const notExecuted: SentrdelCapabilityIdV1[] = [];
  let versionMismatchEffect: SentrdelCoverageAbsenceEffectV1 = "NONE";
  let deniedPolicyEffect: SentrdelCoverageAbsenceEffectV1 = "NONE";
  let unavailableEngineEffect: SentrdelCoverageAbsenceEffectV1 = "NONE";
  let executionIncomplete = false;

  for (const run of input.runs) {
    const capabilityId = run.capability_id as SentrdelCapabilityIdV1;
    const executionState = run.execution_state as SentrdelAdapterExecutionStateV1;
    const units = [...run.scope_units].sort((left, right) =>
      compareText(left.unit_ref, right.unit_ref),
    );
    const orderedLosses = run.coverage_losses
      .map((loss) => deriveLoss(input.request_id, capabilityId, loss))
      .sort((left, right) => compareText(left.loss_id, right.loss_id));
    const coverageState = deriveCapabilityCoverageState(units);
    const produced = executionState === "EXECUTED";

    if (produced) {
      executed.push(capabilityId);
    } else {
      notExecuted.push(capabilityId);
      executionIncomplete = true;
    }

    if (executionState === "VERSION_MISMATCH") {
      versionMismatchEffect = "COVERAGE_REDUCED_TO_UNKNOWN";
    }
    if (executionState === "DENIED_BY_POLICY") {
      deniedPolicyEffect = "COVERAGE_OMITTED_EXPLICIT";
    }
    if (
      executionState === "UNAVAILABLE" ||
      executionState === "NOT_RUN" ||
      executionState === "NOT_QUALIFIED" ||
      executionState === "ENGINE_ERROR"
    ) {
      unavailableEngineEffect = "COVERAGE_OMITTED_EXPLICIT";
    }

    const capability = getSentrdelCapabilityV1(
      buildSentrdelCapabilitiesV1(),
      capabilityId,
    );
    const unknownReasons = canonicalStrings(
      orderedLosses.flatMap((loss) => [
        loss.reason,
        ...(loss.canonical_unknown_token === null
          ? []
          : [loss.canonical_unknown_token]),
      ]),
    );

    allLosses.push(...orderedLosses);
    allUnknownReasons.push(...unknownReasons);
    allLimitations.push(...run.coverage_limitations);
    allObservationRefs.push(...run.evidence_refs);

    capabilityCoverage.push(
      Object.freeze({
        capability_id: capabilityId,
        capability_status: capability?.status ?? "UNRESOLVED",
        requested: true,
        executed: produced,
        execution_state: executionState,
        coverage_state: coverageState,
        scope_units: Object.freeze(units),
        scanned_units: projectUnits(units, "COVERED"),
        partially_covered_units: projectUnits(units, "PARTIALLY_COVERED"),
        unscanned_units: projectUnits(units, "UNSCANNED"),
        unsupported_units: projectUnits(units, "UNSUPPORTED"),
        unknown_units: projectUnits(units, "UNKNOWN"),
        parser_supported_inputs: projectParser(units, "PARSER_SUPPORTED"),
        parser_unsupported_inputs: projectParser(units, "PARSER_UNSUPPORTED"),
        evidence_producing_scope: projectEvidence(units, "EVIDENCE_PRODUCED"),
        evidence_missing_scope: projectEvidence(units, "EVIDENCE_MISSING"),
        supported_scope: capability?.supported_scope ?? "UNRESOLVED_AT_PIN",
        unsupported_scope: capability?.unsupported_scope ?? "UNRESOLVED_AT_PIN",
        unknown_reasons: unknownReasons,
        coverage_limitations: canonicalStrings(run.coverage_limitations),
        coverage_losses: Object.freeze(orderedLosses),
        evidence_refs: canonicalStrings(run.evidence_refs),
        is_fully_covered:
          produced &&
          coverageState === "COVERED_WITHIN_STATED_SCOPE" &&
          units.length > 0,
        unscanned_is_clean: false as const,
        unknown_is_pass: false as const,
        omitted_is_pass: false as const,
      }),
    );
  }

  const orderedCoverage = [...capabilityCoverage].sort((left, right) =>
    compareText(left.capability_id, right.capability_id),
  );
  const orderedLosses = [...allLosses].sort((left, right) =>
    compareText(left.loss_id, right.loss_id),
  );

  const report: SentrdelCoverageReportV1 = {
    schema_version: 1,
    phase_authority: SENTRDEL_COVERAGE_PHASE_AUTHORITY,
    authority: "COVERAGE_MAPPING_ONLY",
    request_id: input.request_id,
    attempt_id: input.attempt_id,
    source_head: input.source_head,
    engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE,
    engine_pin_ref: SENTRDEL_PIN_REF,
    engine_version: SENTRDEL_ENGINE_VERSION,
    requested_capabilities: canonicalCapabilities(
      input.requested_capabilities as readonly SentrdelCapabilityIdV1[],
    ),
    executed_capabilities: canonicalCapabilities(executed),
    not_executed_capabilities: canonicalCapabilities(notExecuted),
    capability_coverage: Object.freeze(orderedCoverage),
    coverage_losses: Object.freeze(orderedLosses),
    unknown_reasons: canonicalStrings(allUnknownReasons),
    coverage_limitations: canonicalStrings(allLimitations),
    execution_incomplete: executionIncomplete,
    version_mismatch_effect: versionMismatchEffect,
    denied_policy_effect: deniedPolicyEffect,
    unavailable_engine_effect: unavailableEngineEffect,
    aggregate_coverage_state: aggregateCoverage(orderedCoverage),
    aggregate_is_conservative: true as const,
    observation_refs: canonicalStrings(allObservationRefs),
    effect_facts: "E0_READ_ONLY_ANALYSIS",
    network_facts: "NO_NETWORK",
    egress_facts: "NO_EGRESS",
    totality_claim_available: false as const,
    global_clean_claimed: false as const,
    unscanned_is_clean: false as const,
    unknown_is_pass: false as const,
    partial_is_total: false as const,
    omitted_class_is_pass: false as const,
    security_pass_is_supported_claim: false as const,
    security_observation_is_finding: false as const,
    finding_emitted: false as const,
    claim_assessment_emitted: false as const,
    assurance_effect: "NONE" as const,
  };

  return deepFreeze(report);
}

export interface SentrdelCoverageInvariantCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

/**
 * Re-assert the T05 invariants against an already derived coverage report. A
 * defensive gate for any later consumer boundary.
 */
export function assertSentrdelCoverageInvariantsV1(
  report: SentrdelCoverageReportV1,
): SentrdelCoverageInvariantCheckV1 {
  const reasons: string[] = [];
  if (report.schema_version !== 1) {
    reasons.push("coverage report schema version must be 1");
  }
  if (report.phase_authority !== SENTRDEL_COVERAGE_PHASE_AUTHORITY) {
    reasons.push("coverage phase authority must be UA-P06-T05");
  }
  if (report.authority !== "COVERAGE_MAPPING_ONLY") {
    reasons.push("coverage report authority must be COVERAGE_MAPPING_ONLY");
  }
  if (report.engine_pin !== SENTRDEL_PINNED_REVISION) {
    reasons.push("coverage report must bind the exact Sentrdel pin");
  }
  if (report.engine_tree !== SENTRDEL_PINNED_TREE) {
    reasons.push("coverage report must bind the exact Sentrdel tree");
  }
  if (report.engine_pin_ref !== SENTRDEL_PIN_REF) {
    reasons.push("coverage report must bind the exact Sentrdel pin ref");
  }
  if (report.totality_claim_available) {
    reasons.push("totality must never be claimable from coverage mapping");
  }
  if (report.global_clean_claimed) {
    reasons.push("coverage must never claim a global clean");
  }
  if (report.unscanned_is_clean) {
    reasons.push("unscanned scope must never be clean");
  }
  if (report.unknown_is_pass) {
    reasons.push("UNKNOWN must never be a pass");
  }
  if (report.partial_is_total) {
    reasons.push("partial coverage must never be total coverage");
  }
  if (report.omitted_class_is_pass) {
    reasons.push("an omitted class must never be a pass");
  }
  if (report.security_pass_is_supported_claim) {
    reasons.push("a security pass must never be a supported claim");
  }
  if (report.security_observation_is_finding) {
    reasons.push("a security observation must never be a finding");
  }
  if (report.finding_emitted) {
    reasons.push("coverage mapping must never emit a Finding");
  }
  if (report.claim_assessment_emitted) {
    reasons.push("coverage mapping must never emit a ClaimAssessment");
  }
  if (report.assurance_effect !== "NONE") {
    reasons.push("coverage mapping must have no assurance effect");
  }
  if (report.effect_facts !== "E0_READ_ONLY_ANALYSIS") {
    reasons.push("effect facts must remain E0_READ_ONLY_ANALYSIS in T05");
  }
  if (report.network_facts !== "NO_NETWORK") {
    reasons.push("network facts must remain NO_NETWORK in T05");
  }
  if (report.egress_facts !== "NO_EGRESS") {
    reasons.push("egress facts must remain NO_EGRESS in T05");
  }

  for (const record of report.capability_coverage) {
    if (record.coverage_state === "COVERED_WITHIN_STATED_SCOPE") {
      if (record.unscanned_units.length > 0) {
        reasons.push(`${record.capability_id} cannot be covered with unscanned units`);
      }
      if (record.unknown_units.length > 0) {
        reasons.push(`${record.capability_id} cannot be covered with unknown units`);
      }
      if (!record.executed) {
        reasons.push(
          `${record.capability_id} cannot be covered when it was not executed`,
        );
      }
    }
    if (record.unscanned_units.length > 0 && record.is_fully_covered) {
      reasons.push(
        `${record.capability_id} cannot be fully covered with unscanned units`,
      );
    }
    if (record.unknown_units.length > 0 && record.is_fully_covered) {
      reasons.push(
        `${record.capability_id} cannot be fully covered with unknown units`,
      );
    }
    if (
      record.coverage_state === "NOT_COVERED" &&
      record.coverage_losses.length === 0
    ) {
      reasons.push(
        `${record.capability_id} is not covered without an explicit coverage loss`,
      );
    }
    if (!record.executed && record.evidence_producing_scope.length > 0) {
      reasons.push(
        `${record.capability_id} did not execute and may not produce evidence`,
      );
    }
    if (record.coverage_limitations.length === 0) {
      reasons.push(`${record.capability_id} must carry explicit coverage limitations`);
    }
  }

  // UNKNOWN must survive aggregation: every capability-level unknown reason is
  // present in the report-level aggregate.
  for (const record of report.capability_coverage) {
    for (const reason of record.unknown_reasons) {
      if (!report.unknown_reasons.includes(reason)) {
        reasons.push(`unknown reason ${reason} disappeared during aggregation`);
      }
    }
  }

  // Every loss is reason-bearing and fully identified.
  for (const loss of report.coverage_losses) {
    if (loss.reason === undefined || loss.reason === null) {
      reasons.push("every coverage loss must be reason-bearing");
    }
    if (loss.claim_impact === undefined) {
      reasons.push("every coverage loss must state a claim impact");
    }
    if (loss.recovery === undefined) {
      reasons.push("every coverage loss must state a recovery state");
    }
    if (loss.scope_ref === undefined || loss.scope_ref === null) {
      reasons.push("every coverage loss must name an affected scope");
    }
  }

  // Conservative aggregate: never better than the worst capability present.
  const states = report.capability_coverage.map((record) => record.coverage_state);
  if (states.includes("UNKNOWN") && report.aggregate_coverage_state !== "UNKNOWN") {
    reasons.push("an UNKNOWN capability must force the aggregate to UNKNOWN");
  }
  if (
    states.includes("NOT_COVERED") &&
    report.aggregate_coverage_state === "COVERED_WITHIN_STATED_SCOPE"
  ) {
    reasons.push("a NOT_COVERED capability must block a covered aggregate");
  }
  if (
    report.not_executed_capabilities.length > 0 &&
    report.aggregate_coverage_state === "COVERED_WITHIN_STATED_SCOPE"
  ) {
    reasons.push("a capability that was not run must block a covered aggregate");
  }

  const record = report as unknown as Record<string, unknown>;
  for (const forbidden of [
    "finding",
    "claim_assessment",
    "assurance",
    "verdict",
    "clean",
    "secure",
    "pass",
  ]) {
    if (record[forbidden] !== undefined) {
      reasons.push(`coverage report must never carry ${forbidden}`);
    }
  }

  return { ok: reasons.length === 0, reasons: Object.freeze(reasons) };
}

/** Coverage mapping is never a global clean. */
export function coverageMappingIsGlobalCleanV1(): boolean {
  return false;
}

/** A coverage loss is never resolved by CLEAN, SECURE, PASS, or TOTAL. */
export function coverageLossResolvesCleanV1(): boolean {
  return false;
}

/** UNKNOWN never becomes a pass. */
export function unknownBecomesPassV1(): boolean {
  return false;
}

/** An unexecuted capability never becomes a pass. */
export function notRunBecomesPassV1(): boolean {
  return false;
}

/** A timeout never becomes a pass. */
export function timeoutBecomesPassV1(): boolean {
  return false;
}

/** Malformed output never becomes clean. */
export function malformedOutputBecomesCleanV1(): boolean {
  return false;
}

/** Partial coverage never becomes total coverage. */
export function partialBecomesTotalV1(): boolean {
  return false;
}

/** An unsupported scope never becomes a covered scope. */
export function unsupportedBecomesCoveredV1(): boolean {
  return false;
}

/** Coverage mapping emits no Finding and no ClaimAssessment. */
export function coverageMappingEmitsAuthorityV1(): boolean {
  return false;
}

/** Coverage mapping is pure: no execution, network, clock, or randomness. */
export function coverageMappingExecutesRuntimeV1(): boolean {
  return false;
}

export function coverageMappingRequiresNetworkV1(): boolean {
  return false;
}

export function coverageMappingUsesClockV1(): boolean {
  return false;
}

export function coverageMappingUsesRandomnessV1(): boolean {
  return false;
}

/** The complete canonical coverage-loss vocabulary, for exhaustive assertions. */
export const SENTRDEL_COVERAGE_LOSS_REASON_IDS: readonly SentrdelCoverageLossReasonV1[] =
  Object.freeze([...SENTRDEL_COVERAGE_LOSS_REASONS].sort());
