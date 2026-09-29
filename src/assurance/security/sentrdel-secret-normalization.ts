/**
 * UA-P06-T07 — Sentrdel secret-detection normalization.
 *
 * Purpose: normalize bounded, untrusted Sentrdel secret-detector output into
 * bounded Ascout SECRET SHAPE OBSERVATIONS with rule, location, provenance, and
 * coverage preserved exactly, and with redaction enforced before persistence.
 *
 * This task answers: "which secret detector rule matched which bounded source
 * region, with what redacted evidence, provenance, coverage, and confidence
 * limitations?"
 *
 * It must NEVER answer:
 *   - "is this credential valid?"
 *   - "is this secret exploitable?"
 *   - "was this repository clean?"
 *   - "is this confirmed a breach?"
 *
 * Central invariants:
 *   SECRET_OBSERVATION      != FINDING
 *   SECRET_MATCH            != CONFIRMED_CREDENTIAL
 *   SECRET_MATCH            != EXPLOITABLE_SECRET
 *   SECURITY_OBSERVATION    != FINDING
 *   SECURITY_PASS           != SUPPORTED_CLAIM
 *   PLAINTEXT_SECRET_IN_PERSISTED_ARTIFACT = FORBIDDEN
 *
 * Reused without forking from the canonical T01-T06 surfaces:
 *   - sentrdel-source-pin.ts                   (exact donor pin/tree/pin_ref)
 *   - sentrdel-engine-boundary.ts              (engine id and version)
 *   - sentrdel-capability-characterization.ts  (secrets-changed semantics)
 *   - sentrdel-engine-adapter.ts               (execution states, ceilings)
 *   - sentrdel-evidence-normalization.ts       (claim classes, provenance,
 *                                               resolution states, guards,
 *                                               canonical secret shapes)
 *   - sentrdel-coverage-mapping.ts             (coverage states and loss reasons)
 *
 * This module is pure: no execution, no network, no clock, no randomness, no
 * filesystem access, and no dependency on traversal order.
 */
import {
  buildSentrdelCapabilitiesV1,
  getSentrdelCapabilityV1,
  SENTRDEL_CAPABILITY_IDS,
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
  assertSentrdelObservationInvariantsV1,
  containsExternalAttestationV1,
  containsSecretMaterialV1,
  SENTRDEL_CLAIM_CLASSES_REQUIRING_PROVENANCE,
  SENTRDEL_CLAIM_CLASSES_REQUIRING_RULE_ID,
  SENTRDEL_EVIDENCE_SECRET_SHAPES,
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

export const SENTRDEL_SECRET_SCHEMA_VERSION = 1 as const;

export const SENTRDEL_SECRET_PHASE_AUTHORITY = "UA-P06-T07" as const;

/**
 * The single capability this task normalizes. T07 is secrets-only; SCA/SBOM,
 * IaC, and config normalization belong to T08 and T09.
 */
export const SENTRDEL_SECRET_CAPABILITY_ID = "secrets-changed" as const;

/**
 * The single admissible authority. A normalized secret record is an observation
 * of a bounded detector match, never a finding and never a credential claim.
 */
export const SENTRDEL_SECRET_AUTHORITIES = [
  "SECRET_SHAPE_OBSERVATION_ONLY",
] as const;

export type SentrdelSecretAuthorityV1 =
  (typeof SENTRDEL_SECRET_AUTHORITIES)[number];

/**
 * Secret match states. There is deliberately no VALID, ACTIVE, COMPROMISED,
 * EXPLOITABLE, or BREACH member: a detector match is a shape observation only.
 */
export const SENTRDEL_SECRET_MATCH_STATES = [
  "SECRET_SHAPE_OBSERVED",
  "NO_SHAPE_OBSERVED_IN_STATED_SCOPE",
  "UNKNOWN",
] as const;

export type SentrdelSecretMatchStateV1 =
  (typeof SENTRDEL_SECRET_MATCH_STATES)[number];

/**
 * Redaction states. There is exactly one admissible member: a normalized record
 * may only exist once the matched region has been redacted before persistence.
 * A record that still holds plaintext is not representable, let alone accepted.
 */
export const SENTRDEL_SECRET_REDACTION_STATES = [
  "REDACTED_BEFORE_PERSISTENCE",
] as const;

export type SentrdelSecretRedactionStateV1 =
  (typeof SENTRDEL_SECRET_REDACTION_STATES)[number];

/**
 * Validation states. There is exactly one member. Credential validation would
 * require network or provider access and is out of scope for T07, so there is no
 * state in which a credential is judged live, dead, or revoked.
 */
export const SENTRDEL_SECRET_VALIDATION_STATES = ["NOT_VALIDATED"] as const;

export type SentrdelSecretValidationStateV1 =
  (typeof SENTRDEL_SECRET_VALIDATION_STATES)[number];

/**
 * Confidence states. A bounded secret detector reports a pattern match against a
 * pinned rule set. It does not reason about entropy, liveness, or ownership.
 */
export const SENTRDEL_SECRET_CONFIDENCE_STATES = [
  "DETECTOR_PATTERN_MATCH_ONLY",
] as const;

export type SentrdelSecretConfidenceStateV1 =
  (typeof SENTRDEL_SECRET_CONFIDENCE_STATES)[number];

/**
 * Severity states. Ascout never derives a severity from a secret shape match at
 * T07: severity is a policy decision owned by a later authorized boundary.
 */
export const SENTRDEL_SECRET_SEVERITY_STATES = ["NEVER_DERIVED"] as const;

export type SentrdelSecretSeverityStateV1 =
  (typeof SENTRDEL_SECRET_SEVERITY_STATES)[number];

/**
 * Secret classes, derived from the canonical T04 pinned secret shapes in their
 * frozen order. A class is recorded only when the detector traced it to a shape
 * that actually matched; it is never guessed from a path or a file name.
 *
 * UNCLASSIFIED is the honest terminal state for a match whose shape the detector
 * did not identify.
 */
export const SENTRDEL_SECRET_CLASSES = [
  "GITHUB_PERSONAL_ACCESS_TOKEN",
  "AWS_ACCESS_KEY_ID",
  "PRIVATE_KEY_MATERIAL",
  "BEARER_TOKEN",
  "UNCLASSIFIED_SECRET_SHAPE",
] as const;

export type SentrdelSecretClassV1 = (typeof SENTRDEL_SECRET_CLASSES)[number];

/**
 * Exact positional binding between the canonical T04 secret shape set and the
 * secret-class vocabulary. The count is asserted equal at load so the two sets
 * can never drift apart silently: a new pinned shape without a class, or a class
 * without a shape, is a fail-closed defect rather than a quiet mismatch.
 */
const SECRET_CLASS_BY_SHAPE: readonly (SentrdelSecretClassV1 | null)[] =
  Object.freeze([
    "GITHUB_PERSONAL_ACCESS_TOKEN",
    "AWS_ACCESS_KEY_ID",
    "PRIVATE_KEY_MATERIAL",
    "BEARER_TOKEN",
  ]);

export const SENTRDEL_SECRET_KNOWN_LIMITATIONS = [
  "A normalized secret record is an observation of a bounded detector match and is never a Finding.",
  "A normalized secret record is never a ClaimAssessment, an assurance verdict, or a security PASS.",
  "SECRET_MATCH != CONFIRMED_CREDENTIAL: a matched detector rule is not proof of a working credential.",
  "SECRET_MATCH != EXPLOITABLE_SECRET: a matched shape says nothing about reachability or impact.",
  "PLAINTEXT_SECRET_IN_PERSISTED_ARTIFACT is forbidden; only bounded redacted metadata may persist.",
  "Credential validation is NOT_VALIDATED at T07; live validation would require network or provider access and is out of scope.",
  "No stable unkeyed value-only hash is produced; the redacted digest covers bounded metadata, never the secret value.",
  "A redacted digest is one-way metadata only and never implies credential validity.",
  "Severity is NEVER_DERIVED at T07; severity is a later authorized policy decision.",
  "Secret shape scope is bounded to the pinned T04 shape set and to changed bytes within the pinned capability limits.",
  "Historical scans and repository-wide secret history remain unproven and are never treated as clean.",
  "UNSCANNED_SCOPE != CLEAN: a zero-match scan over partial scope is never a repository-clean claim.",
  "UNKNOWN != PASS: an unknown scope blocks every stronger claim and is never aggregated away.",
  "Provenance COMPLETE records where the observation came from, not that the engine is trustworthy.",
  "A path label is an inert label at T07; it never becomes a filesystem, process, archive, or runtime target without the explicit effect-boundary containment gate.",
  "Normalization is pure: no execution, no network, no clock, no randomness, no filesystem access, no traversal order.",
] as const;

/**
 * Escalation vocabulary that must never appear in a persisted secret record.
 * These are the exact phrases by which an observation would be promoted into a
 * credential-validity, exploitability, or breach claim.
 */
export const SENTRDEL_SECRET_ESCALATION_TOKENS = [
  "ACTIVE_SECRET",
  "BREACH_CONFIRMED",
  "COMPROMISED",
  "CONFIRMED_BREACH",
  "CREDENTIAL_VALID",
  "EXPLOITABILITY",
  "EXPLOITABLE",
  "LEAK_CONFIRMED",
  "LEAKED",
  "PROVEN_CREDENTIAL",
  "VALID_CREDENTIAL",
] as const;

const ESCALATION_PATTERN = new RegExp(
  `\\b(?:${SENTRDEL_SECRET_ESCALATION_TOKENS.join("|")})\\b`,
  "u",
);

/**
 * Cross-cutting hardening observation, recorded rather than silently applied.
 *
 * A traversal-shaped bounded label such as `src/../../etc/passwd.ts` is accepted
 * by the canonical T04/T06 observation layers because those layers perform no
 * filesystem access and treat a path as an inert label. T07 does not change
 * those semantics. Instead this module records the observation and requires the
 * explicit containment gate below before any label becomes an effect-capable
 * path.
 */
export const SENTRDEL_SECRET_PATH_HARDENING_OBSERVATION = Object.freeze({
  observation_id: "hardening:sentrdel-path-traversal-label" as const,
  recorded_state: "RECORDED_NOT_SILENTLY_CHANGED" as const,
  label_semantics: "INERT_LABEL_ONLY" as const,
  canonical_layers_unchanged: Object.freeze([
    "UA-P06-T04",
    "UA-P06-T06",
  ]) as readonly string[],
  effect_capable_uses: Object.freeze([
    "filesystem_access",
    "process_argument",
    "archive_extraction",
    "workspace_lookup",
    "runtime_target",
  ]) as readonly string[],
  required_before_effect: "assertSentrdelSecretPathContainmentV1" as const,
  summary:
    "A traversal-shaped bounded path label is preserved verbatim as an inert label; it may not be converted into an effect-capable path without canonical containment validation at the effect boundary.",
});

/**
 * One pinned secret-detector rule identity, preserved exactly as the engine
 * reported it. A rule identity is never invented, completed, or normalized away.
 */
export interface SentrdelSecretRuleIdentityV1 {
  readonly rule_id: string;
  readonly rule_set_ref: string;
  readonly rule_resolution: SentrdelObservationResolutionStateV1;
  readonly rule_is_pinned: boolean;
}

/**
 * One bounded source region a secret rule matched, preserved exactly. `end_line`
 * never precedes `start_line`, and a region is never widened beyond what was
 * reported. `path` remains an inert label: it is never resolved, opened, or
 * normalized against a real filesystem anywhere in this module.
 */
export interface SentrdelSecretLocationV1 {
  readonly resolution: SentrdelObservationResolutionStateV1;
  readonly path: string | null;
  readonly start_line: number | null;
  readonly end_line: number | null;
  readonly label_is_inert: true;
  readonly path_traversal_shaped: boolean;
}

/**
 * Redacted evidence metadata. This is the ONLY description of the matched
 * region that may persist: a safe one-way digest over bounded metadata, an
 * optional source-traced class, and bounded length metadata. The matched value
 * itself is never represented, so it cannot be persisted.
 */
export interface SentrdelSecretRedactedEvidenceV1 {
  readonly redaction_state: SentrdelSecretRedactionStateV1;
  readonly redacted_digest: string;
  readonly digest_algorithm: "SHA256";
  readonly digest_is_one_way_metadata: true;
  readonly digest_implies_credential_validity: false;
  readonly digest_covers_secret_value: false;
  readonly secret_class: SentrdelSecretClassV1 | null;
  readonly secret_class_resolution: SentrdelObservationResolutionStateV1;
  readonly secret_class_is_source_traced: boolean;
  readonly matched_length: number | null;
  readonly plaintext_persisted: false;
}

/**
 * Producer provenance, preserved exactly. COMPLETE provenance records where the
 * observation came from; it never records that the engine itself is trusted.
 */
export interface SentrdelSecretProvenanceV1 {
  readonly state: SentrdelProvenanceStateV1;
  readonly producer_id: string | null;
  readonly producer_version: string | null;
  readonly collector_ref: string | null;
  readonly rule_set_ref: string | null;
}

/** Coverage as observed for this rule, carried through from T04/T05. */
export interface SentrdelSecretCoverageV1 {
  readonly observation_state: SentrdelObservationCoverageStateV1;
  readonly aggregate_state: SentrdelAggregateCoverageStateV1;
  readonly unknown_states: readonly string[];
  readonly coverage_loss_reasons: readonly SentrdelCoverageLossReasonV1[];
  readonly is_total: false;
  readonly unscanned_is_clean: false;
  readonly unknown_is_pass: false;
  readonly zero_match_implies_clean: false;
}

/**
 * The bounded, immutable, deterministic normalized secret record.
 *
 * Every negative field is a literal `false` type, `severity_state` is a literal
 * `NEVER_DERIVED`, `validation_state` is a literal `NOT_VALIDATED`, and there is
 * no field capable of holding a credential value. A Finding, a ClaimAssessment,
 * a severity, a pass, a validity verdict, or an exploitability verdict cannot be
 * expressed for a secret shape match at this authority level.
 */
export interface SentrdelSecretObservationV1 {
  readonly schema_version: 1;
  readonly secret_observation_id: string;
  readonly phase_authority: typeof SENTRDEL_SECRET_PHASE_AUTHORITY;
  readonly upstream_observation_id: string;
  readonly request_id: string;
  readonly attempt_id: string;
  readonly engine_id: typeof SENTRDEL_ENGINE_ID;
  readonly engine_pin: typeof SENTRDEL_PINNED_REVISION;
  readonly engine_tree: typeof SENTRDEL_PINNED_TREE;
  readonly engine_pin_ref: typeof SENTRDEL_PIN_REF;
  readonly engine_version: string;
  readonly source_head: string;
  readonly capability_id: typeof SENTRDEL_SECRET_CAPABILITY_ID;
  readonly capability_status: string;
  readonly claim_class: SentrdelObservationClaimClassV1;
  readonly execution_state: SentrdelAdapterExecutionStateV1;
  readonly match_state: SentrdelSecretMatchStateV1;
  readonly validation_state: SentrdelSecretValidationStateV1;
  readonly confidence_state: SentrdelSecretConfidenceStateV1;
  readonly severity_state: SentrdelSecretSeverityStateV1;
  readonly severity_value: null;
  readonly rule: SentrdelSecretRuleIdentityV1;
  readonly location: SentrdelSecretLocationV1;
  readonly redacted_evidence: SentrdelSecretRedactedEvidenceV1;
  readonly provenance: SentrdelSecretProvenanceV1;
  readonly coverage: SentrdelSecretCoverageV1;
  readonly evidence_ref: string;
  readonly evidence_digest: string;
  readonly evidence_content_persisted: false;
  readonly limitations: readonly string[];
  readonly effect_facts: SentrdelAdapterEffectCeilingV1;
  readonly network_facts: SentrdelAdapterNetworkPolicyV1;
  readonly egress_facts: SentrdelAdapterEgressPolicyV1;
  readonly authority: SentrdelSecretAuthorityV1;
  readonly assurance_effect: "NONE";
  readonly finding_emitted: false;
  readonly claim_assessment_emitted: false;
  readonly secret_match_is_confirmed_credential: false;
  readonly secret_match_is_exploitable: false;
  readonly secret_match_is_breach: false;
  readonly location_is_executable_proof: false;
  readonly provenance_implies_trust: false;
  readonly credential_validated: false;
  readonly provider_contacted: false;
  readonly network_validation_performed: false;
  readonly global_clean_claimed: false;
  readonly repository_clean_claimed: false;
  readonly remediation_verified: false;
}

/**
 * Bounded, untrusted secret-detector input. This is input, never truth.
 *
 * There is deliberately NO field that can carry a secret value. A caller cannot
 * pass a token, password, key body, bearer value, or raw credential here, so
 * plaintext cannot reach the normalized output even by accident.
 */
export interface SentrdelSecretInputV1 {
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
  readonly match_state: string;
  readonly validation_state: string;
  readonly confidence_state: string;
  readonly redaction_state: string;
  readonly rule_id: string | null;
  readonly rule_set_ref: string | null;
  readonly secret_class: string | null;
  readonly matched_length: number | null;
  readonly redacted_digest: string;
  readonly location_path: string | null;
  readonly location_start_line: number | null;
  readonly location_end_line: number | null;
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

export interface SentrdelSecretValidationV1 {
  readonly schema_version: 1;
  readonly valid: boolean;
  readonly reasons: readonly string[];
}

const GIT_SHA1_HEX = /^[a-f0-9]{40}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SOURCE_PATH = /^[A-Za-z0-9._-][A-Za-z0-9._\-/]{0,255}$/u;
const MAX_LIMITATIONS = 32;
const MAX_UNKNOWN_STATES = 32;
const MAX_LOSS_REASONS = 32;
const MAX_MATCHED_LENGTH = 1_048_576;
const MAX_OBSERVATIONS = 512;

const CLAIM_CLASS_SET = new Set<string>(SENTRDEL_OBSERVATION_CLAIM_CLASSES);
const MATCH_STATE_SET = new Set<string>(SENTRDEL_SECRET_MATCH_STATES);
const REDACTION_STATE_SET = new Set<string>(SENTRDEL_SECRET_REDACTION_STATES);
const VALIDATION_STATE_SET = new Set<string>(SENTRDEL_SECRET_VALIDATION_STATES);
const CONFIDENCE_STATE_SET = new Set<string>(SENTRDEL_SECRET_CONFIDENCE_STATES);
const SECRET_CLASS_SET = new Set<string>(SENTRDEL_SECRET_CLASSES);
const PROVENANCE_SET = new Set<string>(SENTRDEL_PROVENANCE_STATES);
const COVERAGE_STATE_SET = new Set<string>(SENTRDEL_OBSERVATION_COVERAGE_STATES);
const AGGREGATE_STATE_SET = new Set<string>(SENTRDEL_AGGREGATE_COVERAGE_STATES);
const RESOLUTION_SET = new Set<string>(SENTRDEL_OBSERVATION_RESOLUTION_STATES);
const REQUIRES_RESOLVABLE_PROVENANCE = new Set<string>(
  SENTRDEL_CLAIM_CLASSES_REQUIRING_PROVENANCE,
);
const REQUIRES_RULE_ID = new Set<string>(SENTRDEL_CLAIM_CLASSES_REQUIRING_RULE_ID);
const LOSS_REASON_SET = new Set<string>(SENTRDEL_COVERAGE_LOSS_REASONS);
const EXECUTION_STATE_SET = new Set<string>(SENTRDEL_ADAPTER_EXECUTION_STATES);
const NON_PRODUCING_SET = new Set<string>(
  SENTRDEL_NON_PRODUCING_EXECUTION_STATES,
);
const CAPABILITY_ID_SET = new Set<string>(SENTRDEL_CAPABILITY_IDS);

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
  "match_state",
  "validation_state",
  "confidence_state",
  "redaction_state",
  "rule_id",
  "rule_set_ref",
  "secret_class",
  "matched_length",
  "redacted_digest",
  "location_path",
  "location_start_line",
  "location_end_line",
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
 * Input keys that must never be present. These are the routes by which a
 * caller could try to smuggle a claim, a verdict, or — most importantly — an
 * actual secret value into a normalized record. The set covers caller-supplied
 * trust, severity, exploitability, validity, and breach claims alongside every
 * conventional raw-secret field name.
 */
export const SENTRDEL_SECRET_FORBIDDEN_INPUT_KEYS = [
  "active_secret",
  "assurance",
  "breach",
  "claim_assessment",
  "confidence",
  "credential",
  "credential_status",
  "credential_valid",
  "exploitability",
  "exploitable",
  "finding",
  "global_clean",
  "impact",
  "is_valid",
  "live_check",
  "match_value",
  "password",
  "plaintext",
  "private_key",
  "provider_check",
  "raw_secret",
  "reachability",
  "remediation_verified",
  "repository_clean",
  "secret",
  "secret_text",
  "secret_value",
  "severity",
  "severity_value",
  "token",
  "trust",
  "valid",
  "valid_credential",
  "validated",
  "value",
  "verdict",
  "vulnerability",
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

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Canonical code-unit ordering, independent of locale and traversal order. */
function canonicalStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...values].sort(compareText));
}

/**
 * Canonical loss-reason ordering. Validated input is already proven to be a
 * subset of the frozen T05 loss vocabulary, so the identity type is preserved
 * rather than widened to plain strings.
 */
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
 *
 * This digest is used only for derived IDENTIFIERS over already-redacted bounded
 * metadata. It is never computed over a secret value, and a digest is never a
 * substitute for redaction.
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
 * Deterministic secret observation identity. It binds the request, attempt,
 * engine pin, source head, rule identity, location, and the redacted digest, so a
 * record can never be silently reused across a different request, engine, or
 * source position, and never across a different matched region.
 */
function secretObservationIdV1(input: SentrdelSecretInputV1): string {
  return `secret-observation:sentrdel:${canonicalDigestV1(
    [
      "sentrdel-secret-observation-v1",
      input.request_id,
      input.attempt_id,
      input.capability_id,
      input.engine_pin,
      input.source_head,
      input.rule_id ?? "RULE_ABSENT",
      input.location_path ?? "LOCATION_ABSENT",
      String(input.location_start_line ?? "NA"),
      String(input.location_end_line ?? "NA"),
      input.secret_class ?? "CLASS_ABSENT",
      input.redacted_digest,
    ].join("|"),
  )}`;
}

/**
 * Derive the canonical resolution of a bounded source location.
 *
 * A location is PRESENT only when a path and both line bounds were produced.
 * Anything less stays explicitly PARTIAL or ABSENT rather than being invented
 * upward. The resolution is derived, never supplied by a caller.
 */
function deriveLocationResolution(
  path: string | null,
  startLine: number | null,
  endLine: number | null,
): SentrdelObservationResolutionStateV1 {
  if (path === null) {
    return "ABSENT";
  }
  if (isPositiveInteger(startLine) && isPositiveInteger(endLine)) {
    return "PRESENT";
  }
  return "PARTIAL";
}

/**
 * Detect a traversal-shaped path LABEL. This is a pure string inspection with no
 * filesystem access whatsoever; it records the shape so a later effect boundary
 * can refuse to act on it. The canonical T04/T06 label semantics are unchanged:
 * such a label is still accepted and preserved verbatim as an inert label.
 */
function isTraversalShapedLabel(path: string | null): boolean {
  if (path === null) {
    return false;
  }
  // A `..` path segment, either POSIX or Windows shaped. Checked as whole segments
  // so a legitimate file name such as `src/a..b.ts` is not a false positive.
  if (/(?:^|[\\/])\.\.(?:[\\/]|$)/u.test(path)) {
    return true;
  }
  return path.includes("\u0000");
}

/**
 * Derive a secret class from a detector finding, by testing a matched region
 * against the canonical T04 pinned secret shapes IN THEIR FROZEN ORDER.
 *
 * This helper is the ONLY place in T07 that inspects a secret-shaped value, and
 * it returns metadata only: a class label, a bounded length, and a shape index.
 * It can never return the value itself, so classification cannot leak plaintext.
 * The normalizer is deliberately NOT wired to it: callers supply a source-traced
 * class or none at all, so a class is never inferred at persistence time.
 */
export interface SentrdelSecretShapeClassificationV1 {
  readonly matched: boolean;
  readonly secret_class: SentrdelSecretClassV1 | null;
  readonly matched_length: number | null;
  readonly shape_index: number | null;
}

export function classifySentrdelSecretShapeV1(
  value: string,
): SentrdelSecretShapeClassificationV1 {
  if (typeof value !== "string" || value.length === 0) {
    return Object.freeze({
      matched: false,
      secret_class: null,
      matched_length: null,
      shape_index: null,
    });
  }
  for (let index = 0; index < SENTRDEL_EVIDENCE_SECRET_SHAPES.length; index += 1) {
    const shape = SENTRDEL_EVIDENCE_SECRET_SHAPES[index];
    if (shape !== undefined && shape.test(value)) {
      const derived = SECRET_CLASS_BY_SHAPE[index] ?? null;
      return Object.freeze({
        matched: true,
        secret_class: derived ?? "UNCLASSIFIED_SECRET_SHAPE",
        matched_length: value.length,
        shape_index: index,
      });
    }
  }
  return Object.freeze({
    matched: false,
    secret_class: null,
    matched_length: null,
    shape_index: null,
  });
}

/**
 * The effect-boundary containment gate.
 *
 * This is the ONLY sanctioned route by which a recorded path label may become an
 * effect-capable path (filesystem access, process argument, archive extraction,
 * workspace lookup, or runtime target). It resolves the label LEXICALLY against a
 * declared root and rejects any traversal, absolute escape, drive letter, UNC
 * prefix, or NUL byte BEFORE the effect occurs.
 *
 * It performs pure string resolution and no filesystem access of its own, so the
 * gate itself can never become an effect.
 */
export interface SentrdelSecretPathContainmentV1 {
  readonly ok: boolean;
  readonly label: string | null;
  readonly resolved_relative: string | null;
  readonly effect_allowed: boolean;
  readonly reasons: readonly string[];
}

const WINDOWS_DRIVE = /^[A-Za-z]:/u;
const UNC_PREFIX = /^\\\\/u;

export function assertSentrdelSecretPathContainmentV1(
  path: string | null,
  root_prefix: string,
): SentrdelSecretPathContainmentV1 {
  const reasons: string[] = [];
  if (path === null) {
    reasons.push("an effect-capable path requires a recorded path label");
  } else if (typeof path !== "string" || path.length === 0) {
    reasons.push("path label must be a non-empty string");
  }
  if (typeof root_prefix !== "string" || !SOURCE_PATH.test(root_prefix)) {
    reasons.push("root prefix must be a bounded repository-relative path");
  } else if (isTraversalShapedLabel(root_prefix)) {
    // A traversal-shaped ROOT would silently widen the containment boundary, so
    // it is refused outright rather than being used to resolve a label.
    reasons.push("root prefix must not contain a traversal segment");
  } else if (
    root_prefix
      .replace(/\\/gu, "/")
      .split("/")
      .filter((segment) => segment !== "" && segment !== ".")
      .length === 0
  ) {
    reasons.push("root prefix must name at least one path segment");
  }
  if (reasons.length > 0) {
    return Object.freeze({
      ok: false,
      label: typeof path === "string" ? path : null,
      resolved_relative: null,
      effect_allowed: false,
      reasons: Object.freeze([...new Set(reasons)].sort(compareText)),
    });
  }

  const normalizedRoot = root_prefix.replace(/\\/gu, "/").replace(/\/+$/u, "");
  const normalized = (path as string).replace(/\\/gu, "/");

  if (normalized.includes("\u0000")) {
    reasons.push("path label contains a NUL byte");
  }
  if (normalized.startsWith("/")) {
    reasons.push("absolute path labels may not become effect-capable paths");
  }
  if (WINDOWS_DRIVE.test(normalized)) {
    reasons.push("drive-qualified path labels may not become effect-capable paths");
  }
  if (UNC_PREFIX.test(path as string)) {
    reasons.push("UNC path labels may not become effect-capable paths");
  }

  // Lexical segment resolution. No `..` segment may escape the declared root.
  const segments: string[] = [];
  let escaped = false;
  for (const segment of normalized.split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (segments.length === 0) {
        escaped = true;
        break;
      }
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  if (escaped) {
    reasons.push("path traversal is rejected at the effect boundary");
  }
  if (segments.length === 0) {
    reasons.push("path label must resolve to at least one segment");
  }

  if (reasons.length > 0) {
    return Object.freeze({
      ok: false,
      label: path as string,
      resolved_relative: null,
      effect_allowed: false,
      reasons: Object.freeze([...new Set(reasons)].sort(compareText)),
    });
  }

  return Object.freeze({
    ok: true,
    label: path as string,
    resolved_relative: `${normalizedRoot}/${segments.join("/")}`,
    effect_allowed: true,
    reasons: Object.freeze([]),
  });
}

/**
 * Fail-closed validation of bounded secret-detector input.
 *
 * Every defect yields a non-empty reason list; a caller must not emit a
 * normalized secret record in that case, so malformed input can never look like
 * a successful, clean secret scan.
 */
export function validateSentrdelSecretInputV1(
  input: unknown,
): SentrdelSecretValidationV1 {
  const reasons: string[] = [];

  if (!isRecord(input)) {
    return {
      schema_version: 1,
      valid: false,
      reasons: Object.freeze(["secret input must be an object"]),
    };
  }

  if (!hasExactKeys(input, INPUT_KEYS)) {
    reasons.push("secret input contains missing or unsupported fields");
  }

  // No canonical authority, caller-supplied trust, severity, exploitability,
  // validity, or breach claim may ride in on a secret observation — and no raw
  // secret field name is admitted at all.
  for (const forbidden of SENTRDEL_SECRET_FORBIDDEN_INPUT_KEYS) {
    if (input[forbidden] !== undefined) {
      reasons.push(`secret input must never carry ${forbidden}`);
    }
  }

  if (input["schema_version"] !== SENTRDEL_SECRET_SCHEMA_VERSION) {
    reasons.push("secret input schema version must be 1");
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

  // Exactly one capability, and it must be the secrets capability. SCA, SBOM,
  // IaC, and SAST inputs are refused rather than reinterpreted.
  const capabilityId = input["capability_id"];
  if (!CAPABILITY_ID_SET.has(capabilityId as string)) {
    reasons.push(`unknown capability identity rejected: ${String(capabilityId)}`);
  } else if (capabilityId !== SENTRDEL_SECRET_CAPABILITY_ID) {
    reasons.push("T07 normalizes secrets-changed only");
  }

  const claimClass = input["claim_class"];
  if (!CLAIM_CLASS_SET.has(claimClass as string)) {
    reasons.push("claim class is unknown");
  } else if (claimClass !== "SECRET_SHAPE_OBSERVATION") {
    reasons.push("T07 accepts SECRET_SHAPE_OBSERVATION only");
  }

  const executionState = input["execution_state"];
  if (!EXECUTION_STATE_SET.has(executionState as string)) {
    reasons.push("execution state is unknown");
  }
  if (!MATCH_STATE_SET.has(input["match_state"] as string)) {
    reasons.push("match state is unknown");
  }
  if (!REDACTION_STATE_SET.has(input["redaction_state"] as string)) {
    reasons.push("redaction state is unknown");
  }
  if (!VALIDATION_STATE_SET.has(input["validation_state"] as string)) {
    reasons.push("validation state is unknown");
  } else if (input["validation_state"] !== "NOT_VALIDATED") {
    reasons.push("credential validation must remain NOT_VALIDATED in T07");
  }
  if (!CONFIDENCE_STATE_SET.has(input["confidence_state"] as string)) {
    reasons.push("confidence state is unknown");
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

  if (
    !SENTRDEL_ADAPTER_EFFECT_CEILINGS.includes(
      input["effect_facts"] as SentrdelAdapterEffectCeilingV1,
    )
  ) {
    reasons.push("effect facts exceed the canonical ceiling vocabulary");
  } else if (input["effect_facts"] !== "E0_READ_ONLY_ANALYSIS") {
    reasons.push("effect facts must remain E0_READ_ONLY_ANALYSIS in T07");
  }
  if (
    !SENTRDEL_ADAPTER_NETWORK_POLICIES.includes(
      input["network_facts"] as SentrdelAdapterNetworkPolicyV1,
    )
  ) {
    reasons.push("network facts are outside the canonical policy vocabulary");
  } else if (input["network_facts"] !== "NO_NETWORK") {
    reasons.push("network facts must remain NO_NETWORK in T07");
  }
  if (
    !SENTRDEL_ADAPTER_EGRESS_POLICIES.includes(
      input["egress_facts"] as SentrdelAdapterEgressPolicyV1,
    )
  ) {
    reasons.push("egress facts are outside the canonical policy vocabulary");
  } else if (input["egress_facts"] !== "NO_EGRESS") {
    reasons.push("egress facts must remain NO_EGRESS in T07");
  }

  // Rule identity: preserved, never invented. A secret shape observation always
  // requires a pinned rule identity and a rule set reference.
  const ruleId = input["rule_id"];
  if (REQUIRES_RULE_ID.has(claimClass as string) && ruleId === null) {
    reasons.push("a secret shape observation requires a pinned rule identity");
  } else if (ruleId !== null && !isOpaqueId(ruleId)) {
    reasons.push("rule_id must be null or a bounded opaque identifier");
  }
  const ruleSetRef = input["rule_set_ref"];
  if (ruleSetRef === null) {
    reasons.push("a secret shape observation requires a rule set reference");
  } else if (!isOpaqueId(ruleSetRef)) {
    reasons.push("rule_set_ref must be a bounded opaque identifier");
  }

  // Secret class: source-traced or explicitly absent. A class is never inferred
  // from a path or a file name at persistence time.
  const secretClass = input["secret_class"];
  if (secretClass !== null) {
    if (!SECRET_CLASS_SET.has(secretClass as string)) {
      reasons.push("secret class is outside the canonical vocabulary");
    } else if (secretClass === "UNCLASSIFIED_SECRET_SHAPE") {
      reasons.push(
        "UNCLASSIFIED_SECRET_SHAPE is a derived terminal state and may not be supplied",
      );
    }
  }
  const matchedLength = input["matched_length"];
  if (matchedLength !== null) {
    if (!isPositiveInteger(matchedLength)) {
      reasons.push("matched_length must be null or a positive integer");
    } else if ((matchedLength as number) > MAX_MATCHED_LENGTH) {
      reasons.push(`matched_length must not exceed ${MAX_MATCHED_LENGTH}`);
    }
  }

  // Redacted digest: bounded one-way metadata over already-redacted content. It
  // is a sha256-shaped opaque token here, never a value-derived hash of a secret.
  const redactedDigest = input["redacted_digest"];
  if (
    typeof redactedDigest !== "string" ||
    !SHA256_HEX.test(redactedDigest)
  ) {
    reasons.push("redacted_digest must be a 64 character hex sha256");
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
  if (redactedDigest === input["evidence_digest"]) {
    reasons.push(
      "redacted_digest and evidence_digest must not be the same token",
    );
  }

  // Location: preserved exactly, never widened or invented. Resolution is
  // derived, never supplied, so a caller cannot claim a precise location it did
  // not produce. A traversal-shaped label is accepted and preserved verbatim as
  // an inert label, exactly as the canonical T04/T06 layers do.
  const path = input["location_path"];
  if (path !== null && (typeof path !== "string" || !SOURCE_PATH.test(path))) {
    reasons.push("location path must be null or a bounded repository-relative path");
  }
  const startLine = input["location_start_line"];
  const endLine = input["location_end_line"];
  if (!isPositiveIntegerOrNull(startLine)) {
    reasons.push("location start_line must be null or a positive integer");
  }
  if (!isPositiveIntegerOrNull(endLine)) {
    reasons.push("location end_line must be null or a positive integer");
  }
  if (
    isPositiveInteger(startLine) &&
    isPositiveInteger(endLine) &&
    endLine < startLine
  ) {
    reasons.push("location end_line must not precede start_line");
  }
  const resolution = deriveLocationResolution(
    typeof path === "string" ? path : null,
    isPositiveInteger(startLine) ? startLine : null,
    isPositiveInteger(endLine) ? endLine : null,
  );
  if (!RESOLUTION_SET.has(resolution)) {
    reasons.push("derived location resolution is outside the canonical vocabulary");
  }

  // Provenance: preserved exactly. A COMPLETE state requires every field, and an
  // unresolved provenance is preserved rather than being filled in.
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
  // A secret shape observation requires resolvable provenance. This mirrors the
  // canonical T04 rule for SENTRDEL_CLAIM_CLASSES_REQUIRING_PROVENANCE: T07 must
  // not admit a record the upstream T04 boundary itself would reject, because an
  // unresolvable producer makes the observation unattributable.
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
    MAX_LIMITATIONS,
    reasons,
  );
  if (limitations.length === 0) {
    reasons.push("a normalized secret observation must state explicit limitations");
  }

  // Contradiction guards. Each pair is an impossible secret state and fails
  // closed rather than being silently accepted.
  const matchState = input["match_state"];
  const coverageState = input["coverage_state"];
  const aggregateState = input["aggregate_coverage_state"];

  if (matchState === "SECRET_SHAPE_OBSERVED" && ruleId === null) {
    reasons.push("an observed secret shape cannot exist without a pinned rule identity");
  }
  if (matchState === "SECRET_SHAPE_OBSERVED" && path === null) {
    reasons.push("an observed secret shape cannot exist without a preserved source location");
  }
  if (matchState === "SECRET_SHAPE_OBSERVED" && resolution === "ABSENT") {
    reasons.push("an observed secret shape requires a resolved source location");
  }
  if (matchState === "SECRET_SHAPE_OBSERVED" && !isPositiveInteger(startLine)) {
    reasons.push("an observed secret shape requires a start line position");
  }
  if (matchState === "SECRET_SHAPE_OBSERVED" && coverageState === "UNSCANNED") {
    reasons.push("an observed secret shape contradicts unscanned coverage");
  }
  if (matchState === "SECRET_SHAPE_OBSERVED" && aggregateState === "NOT_COVERED") {
    reasons.push("an observed secret shape contradicts not-covered aggregate scope");
  }
  if (
    matchState === "NO_SHAPE_OBSERVED_IN_STATED_SCOPE" &&
    coverageState === "UNSCANNED"
  ) {
    reasons.push("a not-observed shape contradicts unscanned coverage");
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

  // A secret shape may only be reported by a capability that actually executed.
  // The non-producing set covers explicit absence; AVAILABLE is the remaining
  // pre-execution state (admitted but not yet run), and it is equally incapable
  // of having produced a match.
  if (executionState !== "EXECUTED" && matchState !== "UNKNOWN") {
    reasons.push(
      `execution state ${String(executionState)} produced no match and may not report one`,
    );
  }

  // A non-producing execution state can never produce a match, and its omission
  // reason is carried deterministically rather than left to the caller.
  if (NON_PRODUCING_SET.has(executionState as string)) {
    const requiredReason =
      SENTRDEL_EXECUTION_STATE_LOSS_REASON[executionState as string];
    if (requiredReason !== undefined && !lossReasons.includes(requiredReason)) {
      reasons.push(
        `execution state ${String(executionState)} must declare coverage loss ${requiredReason}`,
      );
    }
  }

  // Secret and self-attestation boundaries over every persisted string. This is
  // the last line of defence: even if a future field were added, a pinned secret
  // shape or an escalation token in any persisted string is a hard rejection.
  const persistedStrings: unknown[] = [
    input["request_id"],
    input["attempt_id"],
    ruleId,
    ruleSetRef,
    secretClass,
    redactedDigest,
    path,
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
    "secret input must not carry secret material",
    reasons,
  );
  scanStrings(
    persistedStrings,
    containsExternalAttestationV1,
    "secret input must never self-attest",
    reasons,
  );
  scanStrings(
    persistedStrings,
    (value) => ESCALATION_PATTERN.test(value),
    "secret input must not carry a validity, exploitability, or breach claim",
    reasons,
  );

  return {
    schema_version: 1,
    valid: reasons.length === 0,
    reasons: Object.freeze([...new Set(reasons)].sort()),
  };
}

/**
 * Normalize one bounded secret-detector input into an immutable observation.
 *
 * Rule, location, provenance, and coverage are carried through exactly as
 * reported. Nothing is widened, completed, or invented, and no secret value is
 * accepted or produced. Fails closed: on any validation defect no record is
 * produced, so malformed input can never look like a clean secret scan.
 */
export function normalizeSentrdelSecretInputV1(
  input: unknown,
): SentrdelSecretObservationV1 | undefined {
  const validation = validateSentrdelSecretInputV1(input);
  if (!validation.valid) {
    return undefined;
  }
  const record = input as SentrdelSecretInputV1;

  const capability = getSentrdelCapabilityV1(
    buildSentrdelCapabilitiesV1(),
    SENTRDEL_SECRET_CAPABILITY_ID,
  );

  // A location is PRESENT only when a path and both line bounds were produced.
  // Anything less stays explicitly PARTIAL or ABSENT rather than being invented
  // upward. The resolution is derived here, never supplied by the caller.
  const resolution = deriveLocationResolution(
    record.location_path,
    record.location_start_line,
    record.location_end_line,
  );

  const rule: SentrdelSecretRuleIdentityV1 = Object.freeze({
    rule_id: record.rule_id as string,
    rule_set_ref: record.rule_set_ref as string,
    rule_resolution: record.rule_id === null ? "ABSENT" : "PRESENT",
    rule_is_pinned: true,
  });

  // The path stays an inert label. `path_traversal_shaped` records the shape for a
  // later effect boundary without changing the canonical T04/T06 label semantics.
  const location: SentrdelSecretLocationV1 = Object.freeze({
    resolution,
    path: record.location_path,
    start_line: record.location_start_line,
    end_line: record.location_end_line,
    label_is_inert: true as const,
    path_traversal_shaped: isTraversalShapedLabel(record.location_path),
  });

  // The only description of the matched region that persists. The class is
  // source-traced or explicitly absent; the digest is one-way metadata over
  // already-redacted content; the value itself is not representable.
  const redactedEvidence: SentrdelSecretRedactedEvidenceV1 = Object.freeze({
    redaction_state: "REDACTED_BEFORE_PERSISTENCE",
    redacted_digest: record.redacted_digest,
    digest_algorithm: "SHA256",
    digest_is_one_way_metadata: true as const,
    digest_implies_credential_validity: false as const,
    digest_covers_secret_value: false as const,
    secret_class:
      record.secret_class === null
        ? null
        : (record.secret_class as SentrdelSecretClassV1),
    secret_class_resolution: record.secret_class === null ? "ABSENT" : "PRESENT",
    secret_class_is_source_traced: record.secret_class !== null,
    matched_length: record.matched_length,
    plaintext_persisted: false as const,
  });

  const provenance: SentrdelSecretProvenanceV1 = Object.freeze({
    state: record.provenance_state as SentrdelProvenanceStateV1,
    producer_id: record.producer_id,
    producer_version: record.producer_version,
    collector_ref: record.collector_ref,
    rule_set_ref: record.rule_set_ref,
  });

  const coverage: SentrdelSecretCoverageV1 = Object.freeze({
    observation_state: record.coverage_state as SentrdelObservationCoverageStateV1,
    aggregate_state: record.aggregate_coverage_state as SentrdelAggregateCoverageStateV1,
    unknown_states: canonicalStrings(record.unknown_states),
    coverage_loss_reasons: canonicalLossReasons(
      record.coverage_loss_reasons as readonly SentrdelCoverageLossReasonV1[],
    ),
    is_total: false as const,
    unscanned_is_clean: false as const,
    unknown_is_pass: false as const,
    zero_match_implies_clean: false as const,
  });

  const observationId = secretObservationIdV1(record);
  const observation: SentrdelSecretObservationV1 = {
    schema_version: 1,
    secret_observation_id: observationId,
    phase_authority: SENTRDEL_SECRET_PHASE_AUTHORITY,
    upstream_observation_id: `observation:sentrdel:${canonicalDigestV1(
      observationId.slice("secret-observation:sentrdel:".length),
    )}`,
    request_id: record.request_id,
    attempt_id: record.attempt_id,
    engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE,
    engine_pin_ref: SENTRDEL_PIN_REF,
    engine_version: SENTRDEL_ENGINE_VERSION,
    source_head: record.source_head,
    capability_id: SENTRDEL_SECRET_CAPABILITY_ID,
    capability_status: capability?.status ?? "UNRESOLVED",
    claim_class: "SECRET_SHAPE_OBSERVATION",
    execution_state: record.execution_state as SentrdelAdapterExecutionStateV1,
    match_state: record.match_state as SentrdelSecretMatchStateV1,
    validation_state: "NOT_VALIDATED",
    confidence_state: "DETECTOR_PATTERN_MATCH_ONLY",
    severity_state: "NEVER_DERIVED",
    severity_value: null,
    rule,
    location,
    redacted_evidence: redactedEvidence,
    provenance,
    coverage,
    evidence_ref: record.evidence_ref,
    evidence_digest: record.evidence_digest,
    evidence_content_persisted: false as const,
    limitations: canonicalStrings(record.limitations),
    effect_facts: "E0_READ_ONLY_ANALYSIS",
    network_facts: "NO_NETWORK",
    egress_facts: "NO_EGRESS",
    authority: "SECRET_SHAPE_OBSERVATION_ONLY",
    assurance_effect: "NONE" as const,
    finding_emitted: false as const,
    claim_assessment_emitted: false as const,
    secret_match_is_confirmed_credential: false as const,
    secret_match_is_exploitable: false as const,
    secret_match_is_breach: false as const,
    location_is_executable_proof: false as const,
    provenance_implies_trust: false as const,
    credential_validated: false as const,
    provider_contacted: false as const,
    network_validation_performed: false as const,
    global_clean_claimed: false as const,
    repository_clean_claimed: false as const,
    remediation_verified: false as const,
  };

  return deepFreeze(observation);
}

/**
 * Cross-task consistency gate against a T04 normalized observation.
 *
 * T07 may only be admitted for an observation that is itself a valid T04
 * record, is a secret-shape claim class, targets `secrets-changed`, and carries
 * complete provenance. This keeps secret normalization from ever running on a
 * record the canonical T04 boundary would itself reject.
 *
 * Returns the exact recorded reasons, or an empty list when compatible.
 */
export function checkSecretUpstreamCompatibilityV1(
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
  if (upstream.claim_class !== "SECRET_SHAPE_OBSERVATION") {
    reasons.push("T07 accepts a SECRET_SHAPE_OBSERVATION upstream only");
  }
  if (upstream.capability_id !== SENTRDEL_SECRET_CAPABILITY_ID) {
    reasons.push("upstream observation must target secrets-changed");
  }
  if (upstream.engine_pin !== SENTRDEL_PINNED_REVISION) {
    reasons.push("upstream observation must bind the exact Sentrdel pin");
  }
  if (upstream.rule_id === null || upstream.rule_id === undefined) {
    reasons.push("a secret shape observation requires a pinned rule identity");
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
  // That shape precondition is load-bearing, not defensive decoration. The T04
  // gate dereferences nested record members (coverage, raw_evidence, provenance)
  // without null checks, so invoking it against a partially-shaped record would
  // throw a TypeError instead of returning a fail-closed reason. A gate that
  // crashes on hostile input is a fail-OPEN gate: the caller cannot distinguish
  // a crash from an approval, and a crash is trivially forced by omitting one
  // key. The required members are therefore verified up front, and a record
  // missing any of them is REPORTED rather than passed down.
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
    !Array.isArray(upstream.unsupported_scope) ||
    !Array.isArray(upstream.coverage.unknown_states)
  ) {
    reasons.push(
      "upstream observation is missing required array members for the T04 invariant gate",
    );
  } else if (
    upstream.claim_class === "SECRET_SHAPE_OBSERVATION" &&
    upstream.capability_id === SENTRDEL_SECRET_CAPABILITY_ID
  ) {
    const upstreamCheck = assertSentrdelObservationInvariantsV1(upstream);
    for (const reason of upstreamCheck.reasons) {
      reasons.push(`upstream invariant failed: ${reason}`);
    }
  }
  return Object.freeze([...new Set(reasons)].sort(compareText));
}

/** The complete frozen secret limitations, for exhaustive assertions. */
export const SENTRDEL_SECRET_LIMITATION_COUNT =
  SENTRDEL_SECRET_KNOWN_LIMITATIONS.length;

export interface SentrdelSecretSetV1 {
  readonly schema_version: 1;
  readonly phase_authority: typeof SENTRDEL_SECRET_PHASE_AUTHORITY;
  readonly authority: SentrdelSecretAuthorityV1;
  readonly ok: boolean;
  readonly observations: readonly SentrdelSecretObservationV1[];
  readonly rejected_indices: readonly number[];
  readonly reasons: readonly string[];
  readonly matches_observed: number;
  readonly zero_matches_implies_clean: false;
  readonly repository_clean_claimed: false;
}

function rejectedSet(
  reasons: readonly string[],
  rejected: readonly number[],
): SentrdelSecretSetV1 {
  return deepFreeze({
    schema_version: 1 as const,
    phase_authority: SENTRDEL_SECRET_PHASE_AUTHORITY,
    authority: "SECRET_SHAPE_OBSERVATION_ONLY" as const,
    ok: false,
    observations: Object.freeze([]),
    rejected_indices: Object.freeze([...rejected]),
    reasons: Object.freeze([...reasons]),
    matches_observed: 0,
    zero_matches_implies_clean: false as const,
    repository_clean_claimed: false as const,
  });
}

/**
 * Normalize a set of secret-detector inputs into deterministically ordered,
 * observation-only records.
 *
 * Fails closed as a unit: if any input is malformed or any observation identity
 * is duplicated, no observation is emitted at all, so a partial failure can never
 * read as a successful scan.
 *
 * The returned set carries `zero_matches_implies_clean: false` and
 * `repository_clean_claimed: false` as literal `false` types, so an empty
 * observation list over partial coverage cannot be read as a clean repository.
 */
export function normalizeSentrdelSecretSetV1(
  inputs: readonly unknown[],
): SentrdelSecretSetV1 {
  if (!Array.isArray(inputs)) {
    return rejectedSet(["secret input set must be an array"], []);
  }
  if (inputs.length > MAX_OBSERVATIONS) {
    return rejectedSet(
      [`secret input set must contain at most ${MAX_OBSERVATIONS} entries`],
      [],
    );
  }

  const reasons: string[] = [];
  const rejected: number[] = [];
  const normalized: SentrdelSecretObservationV1[] = [];

  for (let index = 0; index < inputs.length; index += 1) {
    const validation = validateSentrdelSecretInputV1(inputs[index]);
    if (!validation.valid) {
      rejected.push(index);
      for (const reason of validation.reasons) {
        reasons.push(`[${index}] ${reason}`);
      }
      continue;
    }
    const observation = normalizeSentrdelSecretInputV1(inputs[index]);
    if (observation === undefined) {
      rejected.push(index);
      reasons.push(`[${index}] observation could not be normalized`);
      continue;
    }
    normalized.push(observation);
  }

  const seen = new Set<string>();
  for (const observation of normalized) {
    if (seen.has(observation.secret_observation_id)) {
      reasons.push(
        `duplicate observation identity: ${observation.secret_observation_id}`,
      );
    }
    seen.add(observation.secret_observation_id);
  }

  if (reasons.length > 0) {
    return rejectedSet([...new Set(reasons)].sort(compareText), rejected);
  }

  const ordered = [...normalized].sort((left, right) =>
    compareText(left.secret_observation_id, right.secret_observation_id),
  );

  return deepFreeze({
    schema_version: 1,
    phase_authority: SENTRDEL_SECRET_PHASE_AUTHORITY,
    authority: "SECRET_SHAPE_OBSERVATION_ONLY",
    ok: true,
    observations: Object.freeze(ordered),
    rejected_indices: Object.freeze([]),
    reasons: Object.freeze([]),
    matches_observed: ordered.filter(
      (observation) => observation.match_state === "SECRET_SHAPE_OBSERVED",
    ).length,
    zero_matches_implies_clean: false as const,
    repository_clean_claimed: false as const,
  });
}

export interface SentrdelSecretInvariantCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

export function assertSentrdelSecretInvariantsV1(
  observation: SentrdelSecretObservationV1,
): SentrdelSecretInvariantCheckV1 {
  const reasons: string[] = [];
  if (observation.schema_version !== 1) {
    reasons.push("secret observation schema version must be 1");
  }
  if (observation.phase_authority !== SENTRDEL_SECRET_PHASE_AUTHORITY) {
    reasons.push("secret phase authority must be UA-P06-T07");
  }
  if (observation.authority !== "SECRET_SHAPE_OBSERVATION_ONLY") {
    reasons.push("secret authority must be SECRET_SHAPE_OBSERVATION_ONLY");
  }
  if (observation.capability_id !== SENTRDEL_SECRET_CAPABILITY_ID) {
    reasons.push("T07 normalizes secrets-changed only");
  }
  if (observation.claim_class !== "SECRET_SHAPE_OBSERVATION") {
    reasons.push("T07 accepts SECRET_SHAPE_OBSERVATION only");
  }
  if (observation.engine_pin !== SENTRDEL_PINNED_REVISION) {
    reasons.push("secret observation must bind the exact Sentrdel pin");
  }
  if (observation.engine_tree !== SENTRDEL_PINNED_TREE) {
    reasons.push("secret observation must bind the exact Sentrdel tree");
  }
  if (observation.engine_pin_ref !== SENTRDEL_PIN_REF) {
    reasons.push("secret observation must bind the exact Sentrdel pin ref");
  }
  if (observation.assurance_effect !== "NONE") {
    reasons.push("secret normalization must have no assurance effect");
  }
  if (observation.finding_emitted) {
    reasons.push("secret normalization must never emit a Finding");
  }
  if (observation.claim_assessment_emitted) {
    reasons.push("secret normalization must never emit a ClaimAssessment");
  }
  if (observation.secret_match_is_confirmed_credential) {
    reasons.push("a secret match must never equal a confirmed credential");
  }
  if (observation.secret_match_is_exploitable) {
    reasons.push("a secret match must never equal an exploitable secret");
  }
  if (observation.secret_match_is_breach) {
    reasons.push("a secret match must never equal a confirmed breach");
  }
  if (observation.location_is_executable_proof) {
    reasons.push("a location must never equal an executable proof");
  }
  if (observation.provenance_implies_trust) {
    reasons.push("provenance must never imply engine trust");
  }
  if (observation.credential_validated) {
    reasons.push("secret normalization must never validate a credential");
  }
  if (observation.provider_contacted) {
    reasons.push("secret normalization must never contact a provider");
  }
  if (observation.network_validation_performed) {
    reasons.push("secret normalization must never perform network validation");
  }
  if (observation.global_clean_claimed) {
    reasons.push("secret normalization must never claim a global clean");
  }
  if (observation.repository_clean_claimed) {
    reasons.push("secret normalization must never claim a repository is clean");
  }
  if (observation.remediation_verified) {
    reasons.push("secret normalization must never verify a remediation");
  }
  if (observation.validation_state !== "NOT_VALIDATED") {
    reasons.push("credential validation must remain NOT_VALIDATED at T07");
  }
  if (observation.confidence_state !== "DETECTOR_PATTERN_MATCH_ONLY") {
    reasons.push("confidence must remain detector pattern match only at T07");
  }
  if (observation.severity_state !== "NEVER_DERIVED") {
    reasons.push("severity must never be derived at T07");
  }
  if (observation.severity_value !== null) {
    reasons.push("severity value must remain null at T07");
  }

  if (observation.coverage.is_total) {
    reasons.push("secret coverage must never be total");
  }
  if (observation.coverage.unscanned_is_clean) {
    reasons.push("unscanned scope must never be clean");
  }
  if (observation.coverage.unknown_is_pass) {
    reasons.push("UNKNOWN must never be a pass");
  }
  if (observation.coverage.zero_match_implies_clean) {
    reasons.push("a zero-match scan must never imply a clean repository");
  }
  if (observation.evidence_content_persisted) {
    reasons.push("evidence content must never be persisted");
  }
  if (observation.redacted_evidence.plaintext_persisted) {
    reasons.push("plaintext secret material must never be persisted");
  }
  if (
    observation.redacted_evidence.redaction_state !==
    "REDACTED_BEFORE_PERSISTENCE"
  ) {
    reasons.push("a normalized secret record must be redacted before persistence");
  }
  if (!observation.redacted_evidence.digest_is_one_way_metadata) {
    reasons.push("a redacted digest must be recorded as one-way metadata");
  }
  if (observation.redacted_evidence.digest_implies_credential_validity) {
    reasons.push("a redacted digest must never imply credential validity");
  }
  if (observation.redacted_evidence.digest_covers_secret_value) {
    reasons.push("a redacted digest must never cover the secret value");
  }
  if (
    typeof observation.redacted_evidence.redacted_digest !== "string" ||
    !SHA256_HEX.test(observation.redacted_evidence.redacted_digest)
  ) {
    reasons.push("redacted digest must be a 64 character hex sha256");
  }
  if (
    observation.redacted_evidence.secret_class !== null &&
    !SECRET_CLASS_SET.has(observation.redacted_evidence.secret_class)
  ) {
    reasons.push("secret class is outside the canonical vocabulary");
  }
  if (observation.limitations.length === 0) {
    reasons.push("a normalized secret observation must state explicit limitations");
  }
  if (observation.rule.rule_is_pinned !== true) {
    reasons.push("a normalized secret observation must bind a pinned rule");
  }
  if (observation.location.label_is_inert !== true) {
    reasons.push("a recorded path must remain an inert label");
  }
  if (
    observation.match_state === "SECRET_SHAPE_OBSERVED" &&
    observation.location.path === null
  ) {
    reasons.push("an observed secret shape must carry a preserved source location");
  }
  if (
    observation.match_state === "SECRET_SHAPE_OBSERVED" &&
    observation.location.start_line === null
  ) {
    reasons.push("an observed secret shape must carry a start line position");
  }
  if (
    observation.match_state === "SECRET_SHAPE_OBSERVED" &&
    observation.coverage.observation_state === "UNSCANNED"
  ) {
    reasons.push("an observed secret shape must not sit on unscanned coverage");
  }
  if (
    observation.execution_state !== "EXECUTED" &&
    observation.match_state !== "UNKNOWN"
  ) {
    reasons.push("a non-executing capability must never report a match");
  }
  if (
    observation.provenance.state === "COMPLETE" &&
    observation.provenance.producer_id === null
  ) {
    reasons.push("COMPLETE provenance must carry a producer identity");
  }
  // A secret observation is unattributable without resolvable provenance,
  // matching the canonical T04 rule for its claim class.
  if (
    REQUIRES_RESOLVABLE_PROVENANCE.has(observation.claim_class) &&
    (observation.provenance.state === "ABSENT" ||
      observation.provenance.state === "UNRESOLVED")
  ) {
    reasons.push(
      `claim class ${observation.claim_class} requires resolvable provenance`,
    );
  }

  // A normalized secret record must not carry any field capable of holding a
  // credential value, and must not carry a claim it has no authority to make.
  const record = observation as unknown as Record<string, unknown>;
  for (const forbidden of [
    "finding",
    "claim_assessment",
    "assurance",
    "verdict",
    "vulnerability",
    "exploitability",
    "reachability",
    "clean",
    "secure",
    "pass",
    "breach",
    "credential",
    "token",
    "password",
    "private_key",
    "secret_value",
    "plaintext",
    "value",
    "valid",
    "active",
    "compromised",
    "impact",
    "severity",
  ]) {
    if (record[forbidden] !== undefined) {
      reasons.push(`secret observation must never carry ${forbidden}`);
    }
  }

  return { ok: reasons.length === 0, reasons: Object.freeze(reasons) };
}

/** A normalized secret record is never a Finding. */
export function secretObservationIsFindingV1(): boolean {
  return false;
}

/** A normalized secret record is never a ClaimAssessment. */
export function secretObservationIsClaimAssessmentV1(): boolean {
  return false;
}

/** A detector match is never a confirmed credential. */
export function secretMatchIsConfirmedCredentialV1(): boolean {
  return false;
}

/** A detector match is never an exploitable secret. */
export function secretMatchIsExploitableV1(): boolean {
  return false;
}

/** A detector match is never a confirmed breach. */
export function secretMatchIsBreachV1(): boolean {
  return false;
}

/** A location is never an executable proof. */
export function secretLocationIsExecutableProofV1(): boolean {
  return false;
}

/** Complete provenance never implies that the engine is trusted. */
export function secretProvenanceImpliesTrustV1(): boolean {
  return false;
}

/** Credential validation never occurs at T07. */
export function secretCredentialIsValidatedV1(): boolean {
  return false;
}

/** T07 never contacts a network or a provider. */
export function secretNormalizationRequiresNetworkV1(): boolean {
  return false;
}

export function secretNormalizationContactsProviderV1(): boolean {
  return false;
}

/** Severity is never derived at T07. */
export function secretSeverityIsDerivedV1(): boolean {
  return false;
}

/** A zero-match scan over partial coverage is never a repository-clean claim. */
export function zeroMatchesImpliesCleanV1(): boolean {
  return false;
}

/** Secret normalization never implies a global clean. */
export function secretImpliesGlobalCleanV1(): boolean {
  return false;
}

/** Secret normalization is pure: no execution, clock, randomness, or filesystem. */
export function secretNormalizationExecutesRuntimeV1(): boolean {
  return false;
}

export function secretNormalizationUsesClockV1(): boolean {
  return false;
}

export function secretNormalizationUsesRandomnessV1(): boolean {
  return false;
}

export function secretNormalizationAccessesFilesystemV1(): boolean {
  return false;
}

export function secretNormalizationSpawnsProcessV1(): boolean {
  return false;
}

/**
 * The shape/class vocabularies are positionally bound so the two canonical sets
 * can never silently drift apart. Exported for a direct assertion in tests.
 */
export function secretShapeVocabularyIsAlignedV1(): boolean {
  return (
    SECRET_CLASS_BY_SHAPE.length === SENTRDEL_EVIDENCE_SECRET_SHAPES.length &&
    SECRET_CLASS_BY_SHAPE.every(
      (value) => value === null || SECRET_CLASS_SET.has(value),
    )
  );
}
