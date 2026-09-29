/**
 * UA-P06-T04 — Sentrdel external evidence normalization.
 *
 * Central invariant: EXTERNAL OUTPUT NEVER SELF-ATTESTS.
 *
 * This module normalizes bounded, untrusted Sentrdel output into bounded Ascout
 * SECURITY OBSERVATIONS. A normalized observation records what an external
 * engine reported; it never asserts anything about the repository.
 *
 * Reused without forking from the canonical T01-T03 surfaces:
 *   - sentrdel-source-pin.ts                  (exact donor pin/tree/pin_ref)
 *   - sentrdel-capability-characterization.ts (capability set, UNKNOWN vocabulary)
 *   - sentrdel-engine-adapter.ts              (execution states, effect ceilings,
 *                                             network/egress policies, allowed capabilities)
 *
 * A normalized observation is NEVER:
 *   - a canonical Finding
 *   - a canonical ClaimAssessment
 *   - an assurance PASS
 *   - a global security clean
 *   - a verified remediation
 *
 * Finding promotion belongs to a later policy/validation boundary.
 */
import {
  buildSentrdelCapabilitiesV1,
  getSentrdelCapabilityV1,
  SENTRDEL_CAPABILITY_IDS,
  type SentrdelCapabilityIdV1,
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
  SENTRDEL_PINNED_REVISION,
  SENTRDEL_PINNED_TREE,
  SENTRDEL_PIN_REF,
} from "./sentrdel-source-pin.js";

export const SENTRDEL_NORMALIZATION_SCHEMA_VERSION = 1 as const;

export const SENTRDEL_NORMALIZATION_PHASE_AUTHORITY = "UA-P06-T04" as const;

/**
 * The single admissible authority for normalized external security evidence.
 * There is deliberately no other member: no FINDING, no CLAIM, no PASS.
 */
export const SENTRDEL_OBSERVATION_AUTHORITIES = ["OBSERVATION_ONLY"] as const;

export type SentrdelObservationAuthorityV1 =
  (typeof SENTRDEL_OBSERVATION_AUTHORITIES)[number];

/**
 * Coverage states. There is deliberately no CLEAN, TOTAL, or PASS member:
 * UNSCANNED_SCOPE != CLEAN, so partial coverage can never be promoted.
 */
export const SENTRDEL_OBSERVATION_COVERAGE_STATES = [
  "COMPLETE_WITHIN_STATED_SCOPE",
  "PARTIAL",
  "UNSCANNED",
  "UNKNOWN",
] as const;

export type SentrdelObservationCoverageStateV1 =
  (typeof SENTRDEL_OBSERVATION_COVERAGE_STATES)[number];

export const SENTRDEL_OBSERVATION_CLAIM_CLASSES = [
  "STRUCTURAL_OBSERVATION",
  "SECRET_SHAPE_OBSERVATION",
  "CONFIG_OBSERVATION",
  "DEPENDENCY_OBSERVATION",
] as const;

export type SentrdelObservationClaimClassV1 =
  (typeof SENTRDEL_OBSERVATION_CLAIM_CLASSES)[number];

/**
 * Claim classes that cannot be recorded at all without producer provenance.
 * Classes absent from this set may legitimately carry ABSENT/UNRESOLVED
 * provenance, which is preserved explicitly rather than invented.
 */
export const SENTRDEL_CLAIM_CLASSES_REQUIRING_PROVENANCE = [
  "STRUCTURAL_OBSERVATION",
  "SECRET_SHAPE_OBSERVATION",
  "CONFIG_OBSERVATION",
] as const;

/**
 * Claim classes that cannot be recorded at all without a pinned rule identity.
 */
export const SENTRDEL_CLAIM_CLASSES_REQUIRING_RULE_ID = [
  "STRUCTURAL_OBSERVATION",
  "SECRET_SHAPE_OBSERVATION",
  "CONFIG_OBSERVATION",
] as const;

export const SENTRDEL_PROVENANCE_STATES = [
  "COMPLETE",
  "PARTIAL",
  "ABSENT",
  "UNRESOLVED",
] as const;

export type SentrdelProvenanceStateV1 =
  (typeof SENTRDEL_PROVENANCE_STATES)[number];

/**
 * Explicit resolution vocabulary for missing producer information. Values are
 * never manufactured: absent data stays ABSENT or UNRESOLVED.
 */
export const SENTRDEL_OBSERVATION_RESOLUTION_STATES = [
  "PRESENT",
  "PARTIAL",
  "ABSENT",
  "UNRESOLVED",
] as const;

export type SentrdelObservationResolutionStateV1 =
  (typeof SENTRDEL_OBSERVATION_RESOLUTION_STATES)[number];

/**
 * External self-attestation vocabulary. An engine emitting any of these tokens
 * is rejected rather than persisted: EXTERNAL OUTPUT NEVER SELF-ATTESTS.
 */
export const SENTRDEL_EXTERNAL_ATTESTATION_TOKENS = [
  "CLEAN",
  "COMPLIANT",
  "NO_ISSUES",
  "NO_VULNERABILITIES",
  "PASS",
  "PASSED",
  "REMEDIATED",
  "SECURE",
  "SUPPORTED",
  "VERIFIED",
] as const;

/**
 * Secret shapes. T04 handles raw external evidence bodies, which the T03
 * adapter envelope never carried, so the guard lives at this boundary. The
 * shape set is pinned by tests against the canonical T03 set to prevent drift.
 */
export const SENTRDEL_EVIDENCE_SECRET_SHAPES = [
  /ghp_[A-Za-z0-9]{36}/u,
  /AKIA[0-9A-Z]{16}/u,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/u,
] as const;

export const SENTRDEL_EVIDENCE_KNOWN_LIMITATIONS = [
  "A normalized observation is a record of external output and is never a Finding.",
  "A normalized observation is never a ClaimAssessment and never an assurance PASS.",
  "execution_state EXECUTED means the engine ran, not that the repository is secure.",
  "Coverage COMPLETE_WITHIN_STATED_SCOPE is bounded to the stated scope and is never a global clean.",
  "Unscanned scope is recorded explicitly and is never treated as clean.",
  "Unknown states and limitations are preserved after canonical ordering.",
  "Absence, timeout, or malformed output yields NOT_RUN, INCOMPLETE, or MALFORMED_OUTPUT, never PASS.",
  "External self-attestation tokens are rejected, never recorded.",
  "Raw secret material is never copied into a normalized observation.",
  "Finding promotion is out of scope for T04 and belongs to a later policy boundary.",
  "Normalization is pure: no process execution, no network, no clock, no randomness.",
] as const;

export interface SentrdelExternalLocationV1 {
  readonly path: string;
  readonly start_line: number | null;
  readonly end_line: number | null;
}

export interface SentrdelExternalProvenanceV1 {
  readonly state: SentrdelProvenanceStateV1;
  readonly producer_id: string | null;
  readonly producer_version: string | null;
  readonly collector_ref: string | null;
  readonly rule_set_ref: string | null;
}

/**
 * Bounded, untrusted external Sentrdel output. This is input, never truth.
 */
export interface SentrdelExternalEvidenceV1 {
  readonly schema_version: number;
  readonly request_id: string;
  readonly attempt_id: string;
  readonly claim_class: SentrdelObservationClaimClassV1;
  readonly engine_id: string;
  readonly engine_pin: string;
  readonly engine_tree: string;
  readonly engine_version: string;
  readonly source_head: string;
  readonly capability_id: SentrdelCapabilityIdV1;
  readonly execution_state: SentrdelAdapterExecutionStateV1;
  readonly rule_id: string | null;
  readonly location: SentrdelExternalLocationV1 | null;
  readonly raw_evidence_ref: string;
  readonly raw_evidence_digest: string;
  readonly coverage_state: SentrdelObservationCoverageStateV1;
  readonly scanned_scope: readonly string[];
  readonly unscanned_scope: readonly string[];
  readonly unknown_states: readonly string[];
  readonly limitations: readonly string[];
  readonly provenance: SentrdelExternalProvenanceV1;
  readonly effect_facts: SentrdelAdapterEffectCeilingV1;
  readonly network_facts: SentrdelAdapterNetworkPolicyV1;
  readonly egress_facts: SentrdelAdapterEgressPolicyV1;
  readonly reproduction_ref: string | null;
}

export interface SentrdelNormalizedLocationV1 {
  readonly state: SentrdelObservationResolutionStateV1;
  readonly path: string | null;
  readonly start_line: number | null;
  readonly end_line: number | null;
}

export interface SentrdelNormalizedProvenanceV1 {
  readonly state: SentrdelProvenanceStateV1;
  readonly producer_id: string | null;
  readonly producer_version: string | null;
  readonly collector_ref: string | null;
  readonly rule_set_ref: string | null;
}

export interface SentrdelNormalizedRawEvidenceV1 {
  readonly ref: string;
  readonly digest: string;
  readonly content_persisted: false;
}

export interface SentrdelNormalizedCoverageV1 {
  readonly state: SentrdelObservationCoverageStateV1;
  readonly scanned_scope: readonly string[];
  readonly unscanned_scope: readonly string[];
  readonly unknown_states: readonly string[];
  readonly is_total: false;
  readonly unscanned_is_clean: false;
}

/**
 * A bounded, immutable, deterministic Ascout SECURITY OBSERVATION derived
 * from external Sentrdel output. It carries no Finding, no ClaimAssessment,
 * no assurance verdict, and no claim about repository-wide cleanliness.
 */
export interface SentrdelNormalizedObservationV1 {
  readonly schema_version: 1;
  readonly observation_id: string;
  readonly phase_authority: typeof SENTRDEL_NORMALIZATION_PHASE_AUTHORITY;
  readonly request_id: string;
  readonly attempt_id: string;
  readonly claim_class: SentrdelObservationClaimClassV1;
  readonly engine_id: typeof SENTRDEL_ENGINE_ID;
  readonly engine_pin: typeof SENTRDEL_PINNED_REVISION;
  readonly engine_tree: typeof SENTRDEL_PINNED_TREE;
  readonly engine_pin_ref: typeof SENTRDEL_PIN_REF;
  readonly engine_version: string;
  readonly source_head: string;
  readonly capability_id: SentrdelCapabilityIdV1;
  readonly capability_status: string;
  readonly execution_state: SentrdelAdapterExecutionStateV1;
  readonly rule_id: string | null;
  readonly rule_resolution: SentrdelObservationResolutionStateV1;
  readonly location: SentrdelNormalizedLocationV1;
  readonly raw_evidence: SentrdelNormalizedRawEvidenceV1;
  readonly coverage: SentrdelNormalizedCoverageV1;
  readonly unknown_states: readonly string[];
  readonly limitations: readonly string[];
  readonly provenance: SentrdelNormalizedProvenanceV1;
  readonly effect_facts: SentrdelAdapterEffectCeilingV1;
  readonly network_facts: SentrdelAdapterNetworkPolicyV1;
  readonly egress_facts: SentrdelAdapterEgressPolicyV1;
  readonly reproduction_ref: string | null;
  readonly unsupported_scope: string;
  readonly authority: SentrdelObservationAuthorityV1;
  readonly assurance_effect: "NONE";
  readonly finding_emitted: false;
  readonly claim_assessment_emitted: false;
  readonly global_clean_claimed: false;
  readonly remediation_verified: false;
}

export interface SentrdelEvidenceValidationV1 {
  readonly schema_version: 1;
  readonly valid: boolean;
  readonly reasons: readonly string[];
}

export interface SentrdelNormalizationRejectionV1 {
  readonly input_index: number;
  readonly reasons: readonly string[];
}

export interface SentrdelNormalizationSetV1 {
  readonly schema_version: 1;
  readonly phase_authority: typeof SENTRDEL_NORMALIZATION_PHASE_AUTHORITY;
  readonly authority: SentrdelObservationAuthorityV1;
  readonly ok: boolean;
  readonly observations: readonly SentrdelNormalizedObservationV1[];
  readonly rejected: readonly SentrdelNormalizationRejectionV1[];
  readonly reasons: readonly string[];
}

const GIT_SHA1_HEX = /^[a-f0-9]{40}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SOURCE_PATH = /^[A-Za-z0-9._-][A-Za-z0-9._\-/]{0,255}$/u;

const ATTESTATION_PATTERN = new RegExp(
  `\\b(?:${SENTRDEL_EXTERNAL_ATTESTATION_TOKENS.join("|")})\\b`,
  "u",
);

const ALLOWED_CAPABILITY_SET = new Set<string>(
  SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES,
);

const CLAIM_CLASS_SET = new Set<string>(SENTRDEL_OBSERVATION_CLAIM_CLASSES);

const REQUIRES_PROVENANCE = new Set<string>(
  SENTRDEL_CLAIM_CLASSES_REQUIRING_PROVENANCE,
);

const REQUIRES_RULE_ID = new Set<string>(SENTRDEL_CLAIM_CLASSES_REQUIRING_RULE_ID);

const EXTERNAL_EVIDENCE_KEYS = [
  "schema_version",
  "request_id",
  "attempt_id",
  "claim_class",
  "engine_id",
  "engine_pin",
  "engine_tree",
  "engine_version",
  "source_head",
  "capability_id",
  "execution_state",
  "rule_id",
  "location",
  "raw_evidence_ref",
  "raw_evidence_digest",
  "coverage_state",
  "scanned_scope",
  "unscanned_scope",
  "unknown_states",
  "limitations",
  "provenance",
  "effect_facts",
  "network_facts",
  "egress_facts",
  "reproduction_ref",
] as const;

const LOCATION_KEYS = ["path", "start_line", "end_line"] as const;

const PROVENANCE_KEYS = [
  "state",
  "producer_id",
  "producer_version",
  "collector_ref",
  "rule_set_ref",
] as const;

const MAX_SCOPE_ENTRIES = 64;
const MAX_UNKNOWN_STATES = 32;
const MAX_LIMITATIONS = 32;
const MAX_OBSERVATIONS = 512;

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
  return typeof value === "string" && value.trim().length > 0 && value.length <= 512;
}

function isPositiveIntegerOrNull(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && (value as number) >= 1);
}

/** Secret detection over a single string. True on any pinned shape. */
export function containsSecretMaterialV1(value: string): boolean {
  return SENTRDEL_EVIDENCE_SECRET_SHAPES.some((shape) => shape.test(value));
}

/**
 * External self-attestation detection. A bare attestation token anywhere in
 * external output is a fail-closed condition, never a recorded fact.
 */
export function containsExternalAttestationV1(value: string): boolean {
  return ATTESTATION_PATTERN.test(value);
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

/**
 * Canonical ordering. Sorting is locale-independent (code-unit order) so the
 * result never depends on the host locale or filesystem traversal order.
 * Duplicates are a fail-closed condition, never silently deduplicated.
 */
function canonicalizeList(
  values: readonly unknown[],
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

function capabilityUnknownTokenSet(
  capabilityId: SentrdelCapabilityIdV1,
): ReadonlySet<string> {
  const capability = getSentrdelCapabilityV1(
    buildSentrdelCapabilitiesV1(),
    capabilityId,
  );
  return new Set<string>(capability?.unknown_tokens ?? []);
}

function validateProvenance(provenance: unknown, reasons: string[]): void {
  if (!isRecord(provenance)) {
    reasons.push("provenance must be an object");
    return;
  }
  if (!hasExactKeys(provenance, PROVENANCE_KEYS)) {
    reasons.push("provenance contains missing or unknown fields");
    return;
  }
  if (!SENTRDEL_PROVENANCE_STATES.includes(provenance["state"] as never)) {
    reasons.push("provenance state is unknown");
  }
  const optional = [
    "producer_id",
    "producer_version",
    "collector_ref",
    "rule_set_ref",
  ] as const;
  for (const key of optional) {
    const value = provenance[key];
    if (value !== null && !isOpaqueId(value)) {
      reasons.push(`provenance ${key} must be null or a bounded opaque identifier`);
    }
  }
  if (provenance["state"] === "COMPLETE") {
    for (const key of optional) {
      if (provenance[key] === null) {
        reasons.push(`provenance ${key} is required when state is COMPLETE`);
      }
    }
  }
}

function validateLocation(location: unknown, reasons: string[]): void {
  if (location === null) {
    return;
  }
  if (!isRecord(location)) {
    reasons.push("location must be an object or null");
    return;
  }
  if (!hasExactKeys(location, LOCATION_KEYS)) {
    reasons.push("location contains missing or unknown fields");
    return;
  }
  const path = location["path"];
  if (typeof path !== "string" || !SOURCE_PATH.test(path)) {
    reasons.push("location path must be a bounded repository-relative path");
  }
  const start = location["start_line"];
  const end = location["end_line"];
  if (!isPositiveIntegerOrNull(start)) {
    reasons.push("location start_line must be null or a positive integer");
  }
  if (!isPositiveIntegerOrNull(end)) {
    reasons.push("location end_line must be null or a positive integer");
  }
  if (typeof start === "number" && typeof end === "number" && end < start) {
    reasons.push("location end_line must not precede start_line");
  }
}

/**
 * Deterministic, dependency-free 128-bit digest over the canonical observation
 * identity. No clock, no randomness, no host-dependent state: identical inputs
 * always produce an identical derived identifier.
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

function observationIdentityV1(evidence: SentrdelExternalEvidenceV1): string {
  const location = evidence.location;
  return [
    "sentrdel-evidence-observation-v1",
    evidence.request_id,
    evidence.attempt_id,
    evidence.claim_class,
    evidence.engine_pin,
    evidence.source_head,
    evidence.capability_id,
    evidence.rule_id ?? "RULE_ABSENT",
    location === null
      ? "LOCATION_ABSENT"
      : `${location.path}:${location.start_line ?? "NA"}:${location.end_line ?? "NA"}`,
    evidence.raw_evidence_digest,
  ].join("|");
}

function observationIdV1(evidence: SentrdelExternalEvidenceV1): string {
  return `observation:sentrdel:${canonicalDigestV1(observationIdentityV1(evidence))}`;
}

/**
 * Fail-closed validation of bounded external Sentrdel output. Any defect yields
 * a non-empty reason list; callers must not emit an observation in that case.
 */
export function validateSentrdelExternalEvidenceV1(
  evidence: unknown,
): SentrdelEvidenceValidationV1 {
  const reasons: string[] = [];

  if (!isRecord(evidence)) {
    return {
      schema_version: 1,
      valid: false,
      reasons: Object.freeze(["external evidence must be an object"]),
    };
  }

  if (!hasExactKeys(evidence, EXTERNAL_EVIDENCE_KEYS)) {
    reasons.push("external evidence contains missing or unsupported fields");
  }

  // An exact schema is required: canonical authority objects may never ride in.
  if (evidence["finding"] !== undefined) {
    reasons.push("external evidence must never carry a canonical Finding");
  }
  if (evidence["claim_assessment"] !== undefined) {
    reasons.push("external evidence must never carry a ClaimAssessment");
  }
  if (evidence["assurance"] !== undefined) {
    reasons.push("external evidence must never carry an assurance verdict");
  }

  if (evidence["schema_version"] !== SENTRDEL_NORMALIZATION_SCHEMA_VERSION) {
    reasons.push("external evidence schema version must be 1");
  }

  if (!isOpaqueId(evidence["request_id"])) {
    reasons.push("request_id must be a bounded opaque identifier");
  }
  if (!isOpaqueId(evidence["attempt_id"])) {
    reasons.push("attempt_id must be a bounded opaque identifier");
  }

  if (!CLAIM_CLASS_SET.has(evidence["claim_class"] as string)) {
    reasons.push("claim class is unknown");
  }
  const claimClass = evidence["claim_class"] as string;

  if (evidence["engine_id"] !== SENTRDEL_ENGINE_ID) {
    reasons.push("engine id must be engine:sentrdel");
  }
  if (evidence["engine_pin"] !== SENTRDEL_PINNED_REVISION) {
    reasons.push("engine pin must equal the live-verified Sentrdel pin");
  }
  if (evidence["engine_tree"] !== SENTRDEL_PINNED_TREE) {
    reasons.push("engine tree must equal the live-verified Sentrdel tree");
  }
  if (!isOpaqueId(evidence["engine_version"])) {
    reasons.push("engine version must be a bounded opaque identifier");
  } else if (evidence["engine_version"] !== SENTRDEL_ENGINE_VERSION) {
    reasons.push("engine version must equal the pinned Sentrdel version");
  }
  if (
    typeof evidence["source_head"] !== "string" ||
    !GIT_SHA1_HEX.test(evidence["source_head"])
  ) {
    reasons.push("source_head must be a 40 character lowercase hex sha");
  }

  const capabilityId = evidence["capability_id"] as string;
  if (!ALLOWED_CAPABILITY_SET.has(capabilityId)) {
    reasons.push(`unknown or unexecutable capability rejected: ${capabilityId}`);
  }

  if (
    !SENTRDEL_ADAPTER_EXECUTION_STATES.includes(
      evidence["execution_state"] as SentrdelAdapterExecutionStateV1,
    )
  ) {
    reasons.push("execution state is unknown");
  }

  const ruleId = evidence["rule_id"];
  if (ruleId !== null && !isOpaqueId(ruleId)) {
    reasons.push("rule_id must be null or a bounded opaque identifier");
  } else if (ruleId === null && REQUIRES_RULE_ID.has(claimClass)) {
    reasons.push(`claim class ${claimClass} requires a pinned rule identity`);
  }

  validateLocation(evidence["location"], reasons);

  if (!isOpaqueId(evidence["raw_evidence_ref"])) {
    reasons.push("raw_evidence_ref must be a bounded opaque identifier");
  }
  if (
    typeof evidence["raw_evidence_digest"] !== "string" ||
    !SHA256_HEX.test(evidence["raw_evidence_digest"])
  ) {
    reasons.push("raw_evidence_digest must be a 64 character hex sha256");
  }

  if (
    !SENTRDEL_OBSERVATION_COVERAGE_STATES.includes(
      evidence["coverage_state"] as SentrdelObservationCoverageStateV1,
    )
  ) {
    reasons.push("coverage state is unknown");
  }

  const scanned = canonicalizeList(
    evidence["scanned_scope"] as readonly unknown[],
    "scanned_scope",
    isBoundedText,
    MAX_SCOPE_ENTRIES,
    reasons,
  );
  const unscanned = canonicalizeList(
    evidence["unscanned_scope"] as readonly unknown[],
    "unscanned_scope",
    isBoundedText,
    MAX_SCOPE_ENTRIES,
    reasons,
  );
  const unknowns = canonicalizeList(
    evidence["unknown_states"] as readonly unknown[],
    "unknown_states",
    isOpaqueId,
    MAX_UNKNOWN_STATES,
    reasons,
  );
  canonicalizeList(
    evidence["limitations"] as readonly unknown[],
    "limitations",
    isBoundedText,
    MAX_LIMITATIONS,
    reasons,
  );

  // UNKNOWN states must be states the pinned capability actually declares.
  if (ALLOWED_CAPABILITY_SET.has(capabilityId)) {
    const declared = capabilityUnknownTokenSet(capabilityId as SentrdelCapabilityIdV1);
    for (const token of unknowns) {
      if (!declared.has(token)) {
        reasons.push(
          `unknown state is not declared by capability ${capabilityId}: ${token}`,
        );
        break;
      }
    }
  }

  // Contradictory coverage data fails closed: a bounded-complete scope may not
  // simultaneously declare unknown states or unscanned scope.
  if (
    evidence["coverage_state"] === "COMPLETE_WITHIN_STATED_SCOPE" &&
    (unknowns.length > 0 || unscanned.length > 0)
  ) {
    reasons.push("coverage state contradicts its unknown or unscanned scope data");
  }
  if (unknowns.length === 0 && evidence["coverage_state"] === "UNKNOWN") {
    reasons.push("coverage state UNKNOWN requires at least one unknown state");
  }
  if (unscanned.length === 0 && evidence["coverage_state"] === "UNSCANNED") {
    reasons.push("coverage state UNSCANNED requires explicit unscanned scope");
  }

  validateProvenance(evidence["provenance"], reasons);
  const provenance = isRecord(evidence["provenance"])
    ? evidence["provenance"]
    : undefined;
  if (
    REQUIRES_PROVENANCE.has(claimClass) &&
    provenance !== undefined &&
    (provenance["state"] === "ABSENT" || provenance["state"] === "UNRESOLVED")
  ) {
    reasons.push(`claim class ${claimClass} requires resolvable provenance`);
  }

  if (
    !SENTRDEL_ADAPTER_EFFECT_CEILINGS.includes(
      evidence["effect_facts"] as SentrdelAdapterEffectCeilingV1,
    )
  ) {
    reasons.push("effect facts exceed the canonical ceiling vocabulary");
  } else if (evidence["effect_facts"] !== "E0_READ_ONLY_ANALYSIS") {
    reasons.push("effect facts must remain E0_READ_ONLY_ANALYSIS in T04");
  }
  if (
    !SENTRDEL_ADAPTER_NETWORK_POLICIES.includes(
      evidence["network_facts"] as SentrdelAdapterNetworkPolicyV1,
    )
  ) {
    reasons.push("network facts are outside the canonical policy vocabulary");
  } else if (evidence["network_facts"] !== "NO_NETWORK") {
    reasons.push("network facts must remain NO_NETWORK in T04");
  }
  if (
    !SENTRDEL_ADAPTER_EGRESS_POLICIES.includes(
      evidence["egress_facts"] as SentrdelAdapterEgressPolicyV1,
    )
  ) {
    reasons.push("egress facts are outside the canonical policy vocabulary");
  } else if (evidence["egress_facts"] !== "NO_EGRESS") {
    reasons.push("egress facts must remain NO_EGRESS in T04");
  }

  const reproduction = evidence["reproduction_ref"];
  if (reproduction !== null && !isOpaqueId(reproduction)) {
    reasons.push("reproduction_ref must be null or a bounded opaque reference");
  }

  // Secret boundary: no raw secret material may enter a normalized observation.
  const provenanceField = (key: string): unknown =>
    provenance === undefined ? null : provenance[key];

  const locationPath =
    evidence["location"] === null || !isRecord(evidence["location"])
      ? null
      : evidence["location"]["path"];

  const secretBearing: unknown[] = [
    evidence["request_id"],
    evidence["attempt_id"],
    evidence["raw_evidence_ref"],
    ...(Array.isArray(evidence["scanned_scope"]) ? evidence["scanned_scope"] : []),
    ...(Array.isArray(evidence["unscanned_scope"]) ? evidence["unscanned_scope"] : []),
    ...(Array.isArray(evidence["unknown_states"]) ? evidence["unknown_states"] : []),
    ...(Array.isArray(evidence["limitations"]) ? evidence["limitations"] : []),
    ruleId,
    reproduction,
    locationPath,
    provenanceField("producer_id"),
    provenanceField("producer_version"),
    provenanceField("collector_ref"),
    provenanceField("rule_set_ref"),
  ];
  scanStrings(
    secretBearing,
    containsSecretMaterialV1,
    "external evidence must not carry raw secret material",
    reasons,
  );

  // Self-attestation boundary: the engine may not vouch for its own output.
  scanStrings(
    [...secretBearing, evidence["engine_version"], evidence["coverage_state"]],
    containsExternalAttestationV1,
    "external evidence must never self-attest",
    reasons,
  );

  return {
    schema_version: 1,
    valid: reasons.length === 0,
    reasons: Object.freeze([...new Set(reasons)]),
  };
}

function normalizeLocation(
  location: SentrdelExternalLocationV1 | null,
): SentrdelNormalizedLocationV1 {
  if (location === null) {
    return Object.freeze({
      state: "ABSENT" as const,
      path: null,
      start_line: null,
      end_line: null,
    });
  }
  const start = location.start_line;
  const end = location.end_line;
  const hasPath = location.path.length > 0;
  const hasBothLines = start !== null && end !== null;
  // A location is only PRESENT when a path and both line bounds were produced.
  // Anything less stays explicitly PARTIAL rather than being invented upward.
  let state: SentrdelObservationResolutionStateV1 = "PARTIAL";
  if (!hasPath) {
    state = "ABSENT";
  } else if (hasBothLines) {
    state = "PRESENT";
  }
  return Object.freeze({
    state,
    path: hasPath ? location.path : null,
    start_line: start,
    end_line: end,
  });
}

function normalizeProvenance(
  provenance: SentrdelExternalProvenanceV1,
): SentrdelNormalizedProvenanceV1 {
  return Object.freeze({
    state: provenance.state,
    producer_id: provenance.producer_id,
    producer_version: provenance.producer_version,
    collector_ref: provenance.collector_ref,
    rule_set_ref: provenance.rule_set_ref,
  });
}

function canonicalStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...values].sort());
}

/**
 * Normalize one bounded external result into an immutable Ascout security
 * observation. Fails closed: on any validation defect no observation is
 * produced, so malformed input can never look successful.
 */
export function normalizeSentrdelEvidenceV1(
  evidence: unknown,
): SentrdelNormalizedObservationV1 | undefined {
  const validation = validateSentrdelExternalEvidenceV1(evidence);
  if (!validation.valid) {
    return undefined;
  }
  const input = evidence as SentrdelExternalEvidenceV1;

  const capability = getSentrdelCapabilityV1(
    buildSentrdelCapabilitiesV1(),
    input.capability_id,
  );

  const unknownStates = canonicalStrings(input.unknown_states);
  const limitations = canonicalStrings(input.limitations);

  const coverage: SentrdelNormalizedCoverageV1 = Object.freeze({
    state: input.coverage_state,
    scanned_scope: canonicalStrings(input.scanned_scope),
    unscanned_scope: canonicalStrings(input.unscanned_scope),
    unknown_states: unknownStates,
    is_total: false,
    unscanned_is_clean: false,
  });

  const observation: SentrdelNormalizedObservationV1 = {
    schema_version: 1,
    observation_id: observationIdV1(input),
    phase_authority: SENTRDEL_NORMALIZATION_PHASE_AUTHORITY,
    request_id: input.request_id,
    attempt_id: input.attempt_id,
    claim_class: input.claim_class,
    engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE,
    engine_pin_ref: SENTRDEL_PIN_REF,
    engine_version: input.engine_version,
    source_head: input.source_head,
    capability_id: input.capability_id,
    capability_status: capability?.status ?? "UNRESOLVED",
    execution_state: input.execution_state,
    rule_id: input.rule_id,
    rule_resolution: input.rule_id === null ? "ABSENT" : "PRESENT",
    location: normalizeLocation(input.location),
    raw_evidence: Object.freeze({
      ref: input.raw_evidence_ref,
      digest: input.raw_evidence_digest,
      content_persisted: false as const,
    }),
    coverage,
    unknown_states: unknownStates,
    limitations,
    provenance: normalizeProvenance(input.provenance),
    effect_facts: input.effect_facts,
    network_facts: input.network_facts,
    egress_facts: input.egress_facts,
    reproduction_ref: input.reproduction_ref,
    unsupported_scope: capability?.unsupported_scope ?? "UNRESOLVED_AT_PIN",
    authority: "OBSERVATION_ONLY",
    assurance_effect: "NONE",
    finding_emitted: false,
    claim_assessment_emitted: false,
    global_clean_claimed: false,
    remediation_verified: false,
  };

  return deepFreeze(observation);
}

function rejectedSet(
  reasons: readonly string[],
  rejected: readonly SentrdelNormalizationRejectionV1[],
): SentrdelNormalizationSetV1 {
  return deepFreeze({
    schema_version: 1,
    phase_authority: SENTRDEL_NORMALIZATION_PHASE_AUTHORITY,
    authority: "OBSERVATION_ONLY",
    ok: false,
    observations: Object.freeze([]),
    rejected: Object.freeze([...rejected]),
    reasons: Object.freeze([...reasons]),
  });
}

/**
 * Normalize a set of external results into deterministically ordered,
 * observation-only records. Fails closed as a unit: if any input is malformed
 * or any evidence identity is duplicated, no observation is emitted at all.
 */
export function normalizeSentrdelEvidenceSetV1(
  inputs: readonly unknown[],
): SentrdelNormalizationSetV1 {
  const reasons: string[] = [];
  const rejected: SentrdelNormalizationRejectionV1[] = [];

  if (!Array.isArray(inputs)) {
    return rejectedSet(["evidence set must be an array"], rejected);
  }
  if (inputs.length > MAX_OBSERVATIONS) {
    return rejectedSet(
      [`evidence set must contain at most ${MAX_OBSERVATIONS} entries`],
      rejected,
    );
  }

  const normalized: SentrdelNormalizedObservationV1[] = [];
  for (let index = 0; index < inputs.length; index += 1) {
    const validation = validateSentrdelExternalEvidenceV1(inputs[index]);
    if (!validation.valid) {
      rejected.push(
        Object.freeze({ input_index: index, reasons: validation.reasons }),
      );
      for (const reason of validation.reasons) {
        reasons.push(`[${index}] ${reason}`);
      }
      continue;
    }
    const observation = normalizeSentrdelEvidenceV1(inputs[index]);
    if (observation === undefined) {
      rejected.push(
        Object.freeze({
          input_index: index,
          reasons: Object.freeze(["observation could not be normalized"]),
        }),
      );
      reasons.push(`[${index}] observation could not be normalized`);
      continue;
    }
    normalized.push(observation);
  }

  const seen = new Set<string>();
  for (const observation of normalized) {
    if (seen.has(observation.observation_id)) {
      reasons.push(`duplicate evidence identity: ${observation.observation_id}`);
    }
    seen.add(observation.observation_id);
  }

  if (reasons.length > 0) {
    return rejectedSet([...new Set(reasons)].sort(), rejected);
  }

  const ordered = [...normalized].sort((left, right) =>
    left.observation_id < right.observation_id
      ? -1
      : left.observation_id > right.observation_id
        ? 1
        : 0,
  );

  return deepFreeze({
    schema_version: 1,
    phase_authority: SENTRDEL_NORMALIZATION_PHASE_AUTHORITY,
    authority: "OBSERVATION_ONLY",
    ok: true,
    observations: Object.freeze(ordered),
    rejected: Object.freeze(rejected),
    reasons: Object.freeze([]),
  });
}

export interface SentrdelObservationInvariantCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

/**
 * Re-assert the T04 invariants against an already normalized observation.
 * Useful as a defensive gate at any later consumer boundary.
 */
export function assertSentrdelObservationInvariantsV1(
  observation: SentrdelNormalizedObservationV1,
): SentrdelObservationInvariantCheckV1 {
  const reasons: string[] = [];
  if (observation.schema_version !== 1) {
    reasons.push("observation schema version must be 1");
  }
  if (observation.phase_authority !== SENTRDEL_NORMALIZATION_PHASE_AUTHORITY) {
    reasons.push("observation phase authority must be UA-P06-T04");
  }
  if (observation.authority !== "OBSERVATION_ONLY") {
    reasons.push("normalized evidence authority must be OBSERVATION_ONLY");
  }
  if (observation.engine_pin !== SENTRDEL_PINNED_REVISION) {
    reasons.push("observation must bind the exact Sentrdel pin");
  }
  if (observation.engine_tree !== SENTRDEL_PINNED_TREE) {
    reasons.push("observation must bind the exact Sentrdel tree");
  }
  if (observation.engine_pin_ref !== SENTRDEL_PIN_REF) {
    reasons.push("observation must bind the exact Sentrdel pin ref");
  }
  if (observation.assurance_effect !== "NONE") {
    reasons.push("normalized evidence must have no assurance effect");
  }
  if (observation.finding_emitted) {
    reasons.push("normalized evidence must never emit a Finding");
  }
  if (observation.claim_assessment_emitted) {
    reasons.push("normalized evidence must never emit a ClaimAssessment");
  }
  if (observation.global_clean_claimed) {
    reasons.push("normalized evidence must never claim a global clean");
  }
  if (observation.remediation_verified) {
    reasons.push("normalized evidence must never verify a remediation");
  }
  if (observation.coverage.is_total) {
    reasons.push("coverage must never be total");
  }
  if (observation.coverage.unscanned_is_clean) {
    reasons.push("unscanned scope must never be clean");
  }
  if (observation.raw_evidence.content_persisted) {
    reasons.push("raw evidence content must never be persisted");
  }
  if (
    observation.coverage.state === "PARTIAL" &&
    observation.coverage.unknown_states.length === 0
  ) {
    reasons.push("partial coverage must retain its unknown states");
  }
  if (observation.limitations.length === 0) {
    reasons.push("normalized observations must carry explicit limitations");
  }
  if (observation.unsupported_scope.length === 0) {
    reasons.push("normalized observations must keep unsupported scope explicit");
  }
  const record = observation as unknown as Record<string, unknown>;
  for (const forbidden of [
    "finding",
    "claim_assessment",
    "assurance",
    "verdict",
    "remediation_status",
  ]) {
    if (record[forbidden] !== undefined) {
      reasons.push(`normalized observation must never carry ${forbidden}`);
    }
  }
  return { ok: reasons.length === 0, reasons: Object.freeze(reasons) };
}

/** Engine success is an execution fact, never an assurance verdict. */
export function externalSuccessIsAssurancePassV1(): boolean {
  return false;
}

/** A normalized observation is never a canonical Finding. */
export function observationIsFindingV1(): boolean {
  return false;
}

/** A normalized observation is never a canonical ClaimAssessment. */
export function observationIsClaimAssessmentV1(): boolean {
  return false;
}

/** Normalized evidence can never establish repository-wide cleanliness. */
export function observationIsGlobalCleanV1(): boolean {
  return false;
}

/** Normalized evidence can never verify a remediation. */
export function observationVerifiesRemediationV1(): boolean {
  return false;
}

/** Partial or unscanned coverage is never promotable to clean. */
export function coverageLossIsCleanV1(): boolean {
  return false;
}

/** An omitted capability class is never a pass. */
export function omittedClassIsPassV1(): boolean {
  return false;
}

/** Normalization is pure: no execution, network, clock, or randomness. */
export function normalizationExecutesRuntimeV1(): boolean {
  return false;
}

export function normalizationRequiresNetworkV1(): boolean {
  return false;
}

export function normalizationUsesClockV1(): boolean {
  return false;
}

export function normalizationUsesRandomnessV1(): boolean {
  return false;
}

/** The complete canonical capability vocabulary, for exhaustive assertions. */
export const SENTRDEL_EVIDENCE_CAPABILITY_IDS: readonly SentrdelCapabilityIdV1[] =
  Object.freeze([...SENTRDEL_CAPABILITY_IDS].sort());
