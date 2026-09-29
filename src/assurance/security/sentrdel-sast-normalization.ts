/**
 * UA-P06-T06 â€” Sentrdel SAST normalization.
 *
 * Purpose: normalize bounded, untrusted Sentrdel SAST output into bounded Ascout
 * STRUCTURAL OBSERVATIONS with rule, location, and provenance preserved exactly.
 *
 * This task answers: "which pinned rules matched which bounded source regions,
 * with what provenance, and with what coverage limits?"
 *
 * It must NEVER answer:
 *   - "is this code secure?"
 *   - "is this code exploitable?"
 *   - "is this code reachable?"
 *   - "how severe is this?"
 *
 * Central invariants:
 *   SECURITY_OBSERVATION != FINDING
 *   SECURITY_PASS        != SUPPORTED_CLAIM
 *   RULE_MATCH           != VULNERABILITY
 *   LOCATION             != EXECUTABLE_PROOF
 *   PROVENANCE_COMPLETE  != TRUSTED_ENGINE
 *   SEVERITY             != NEVER_DERIVED
 *
 * Reused without forking from the canonical T01-T05 surfaces:
 *   - sentrdel-source-pin.ts                   (exact donor pin/tree/pin_ref)
 *   - sentrdel-engine-boundary.ts              (engine id and version)
 *   - sentrdel-capability-characterization.ts  (sast-structural semantics)
 *   - sentrdel-engine-adapter.ts               (execution states, ceilings)
 *   - sentrdel-evidence-normalization.ts       (claim classes, provenance,
 *                                               resolution states, guards)
 *   - sentrdel-coverage-mapping.ts             (coverage state and loss reasons)
 *
 * This module is pure: no execution, no network, no clock, no randomness, and no
 * dependency on filesystem traversal order.
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
  SENTRDEL_OBSERVATION_CLAIM_CLASSES,
  SENTRDEL_OBSERVATION_RESOLUTION_STATES,
  SENTRDEL_OBSERVATION_COVERAGE_STATES,
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


export const SENTRDEL_SAST_SCHEMA_VERSION = 1 as const;

export const SENTRDEL_SAST_PHASE_AUTHORITY = "UA-P06-T06" as const;

/**
 * The single capability this task normalizes. T06 is SAST-only; secrets, SCA,
 * SBOM, and IaC normalization belong to T07, T08, and T09.
 */
export const SENTRDEL_SAST_CAPABILITY_ID = "sast-structural" as const;

/**
 * The single admissible authority. A normalized SAST record is an observation of
 * a bounded structural match, never a finding and never a claim assessment.
 */
export const SENTRDEL_SAST_AUTHORITIES = ["STRUCTURAL_OBSERVATION_ONLY"] as const;

export type SentrdelSastAuthorityV1 =
  (typeof SENTRDEL_SAST_AUTHORITIES)[number];

/**
 * SAST rule match states. There is deliberately no EXPLOITABLE, VULNERABLE,
 * RISKY, or CONFIRMED member: a structural match is a match, nothing more.
 */
export const SENTRDEL_SAST_MATCH_STATES = [
  "RULE_MATCHED",
  "RULE_NOT_MATCHED_IN_STATED_SCOPE",
  "UNKNOWN",
] as const;

export type SentrdelSastMatchStateV1 =
  (typeof SENTRDEL_SAST_MATCH_STATES)[number];

/**
 * Severity states. Ascout never derives a severity from a structural match at
 * T06: severity is a policy decision owned by a later authorized boundary.
 */
export const SENTRDEL_SAST_SEVERITY_STATES = ["NEVER_DERIVED"] as const;

export type SentrdelSastSeverityStateV1 =
  (typeof SENTRDEL_SAST_SEVERITY_STATES)[number];

/**
 * The language coverage the pinned `sast-structural` capability actually has.
 * Anything outside JavaScript and TypeScript is explicit unsupported scope and
 * is never silently accepted.
 */
export const SENTRDEL_SAST_SUPPORTED_LANGUAGES = [
  "javascript",
  "typescript",
] as const;

export type SentrdelSastSupportedLanguageV1 =
  (typeof SENTRDEL_SAST_SUPPORTED_LANGUAGES)[number];

/** Bounded file extensions the pinned capability claims at this pin. */
export const SENTRDEL_SAST_SUPPORTED_EXTENSIONS = [
  "cjs",
  "cts",
  "js",
  "jsx",
  "mjs",
  "mts",
  "ts",
  "tsx",
] as const;

export type SentrdelSastSupportedExtensionV1 =
  (typeof SENTRDEL_SAST_SUPPORTED_EXTENSIONS)[number];

export const SENTRDEL_SAST_KNOWN_LIMITATIONS = [
  "A normalized SAST record is an observation of a bounded structural match and is never a Finding.",
  "A normalized SAST record is never a ClaimAssessment, an assurance verdict, or a security PASS.",
  "RULE_MATCH != VULNERABILITY: a matched pinned rule is not proof of an exploitable defect.",
  "LOCATION != EXECUTABLE_PROOF: a file and line position is not proof that code executes.",
  "PROVENANCE_COMPLETE != TRUSTED_ENGINE: complete provenance records where an observation came from, not that the engine is trustworthy.",
  "SEVERITY is NEVER_DERIVED at T06; severity is a later authorized policy decision.",
  "Only JavaScript and TypeScript are covered at this pin; every other language is explicit unsupported scope.",
  "Dynamic grammars, repository-provided rules, and semantic conclusions are unsupported at this pin.",
  "Coverage state and coverage-loss reasons are carried through unchanged from the T05 mapping; T06 never improves coverage.",
  "A NOT_RUN, TIMEOUT, or MALFORMED_OUTPUT execution state yields explicit omission and never a pass.",
  "Observation identity is derived deterministically, so identical inputs produce identical records.",
  "Normalization is pure: no execution, no network, no clock, no randomness, no traversal order.",
] as const;

/**
 * One pinned SAST rule identity, preserved exactly as the engine reported it.
 * A rule identity is never invented, completed, or normalized away.
 */
export interface SentrdelSastRuleIdentityV1 {
  readonly rule_id: string;
  readonly rule_set_ref: string;
  readonly rule_resolution: SentrdelObservationResolutionStateV1;
  readonly rule_is_pinned: boolean;
}

/**
 * One bounded source region a rule matched, preserved exactly. `end_line` never
 * precedes `start_line`, and a region is never widened beyond what was reported.
 */
export interface SentrdelSastLocationV1 {
  readonly resolution: SentrdelObservationResolutionStateV1;
  readonly path: string | null;
  readonly start_line: number | null;
  readonly end_line: number | null;
  readonly language: SentrdelSastSupportedLanguageV1 | null;
  readonly language_support:
    | "SUPPORTED"
    | "UNSUPPORTED"
    | "INDETERMINATE";
  readonly file_extension: string | null;
}

/**
 * Producer provenance, preserved exactly. COMPLETE provenance records where the
 * observation came from; it never records that the engine itself is trusted.
 */
export interface SentrdelSastProvenanceV1 {
  readonly state: SentrdelProvenanceStateV1;
  readonly producer_id: string | null;
  readonly producer_version: string | null;
  readonly collector_ref: string | null;
  readonly rule_set_ref: string | null;
}

/** Coverage as observed for this specific rule, carried through from T04/T05. */
export interface SentrdelSastCoverageV1 {
  readonly observation_state: SentrdelObservationCoverageStateV1;
  readonly aggregate_state: SentrdelAggregateCoverageStateV1;
  readonly unknown_states: readonly string[];
  readonly coverage_loss_reasons: readonly SentrdelCoverageLossReasonV1[];
  readonly is_total: false;
  readonly unscanned_is_clean: false;
  readonly unknown_is_pass: false;
}

/**
 * The bounded, immutable, deterministic normalized SAST record.
 *
 * Every negative field is a literal `false` type and `severity_state` is a
 * literal `NEVER_DERIVED`, so a finding, a claim, a severity, or a pass cannot
 * be expressed for a structural match at this authority level.
 */
export interface SentrdelSastObservationV1 {
  readonly schema_version: 1;
  readonly sast_observation_id: string;
  readonly phase_authority: typeof SENTRDEL_SAST_PHASE_AUTHORITY;
  readonly upstream_observation_id: string;
  readonly request_id: string;
  readonly attempt_id: string;
  readonly engine_id: typeof SENTRDEL_ENGINE_ID;
  readonly engine_pin: typeof SENTRDEL_PINNED_REVISION;
  readonly engine_tree: typeof SENTRDEL_PINNED_TREE;
  readonly engine_pin_ref: typeof SENTRDEL_PIN_REF;
  readonly engine_version: string;
  readonly source_head: string;
  readonly capability_id: typeof SENTRDEL_SAST_CAPABILITY_ID;
  readonly capability_status: string;
  readonly claim_class: SentrdelObservationClaimClassV1;
  readonly execution_state: SentrdelAdapterExecutionStateV1;
  readonly match_state: SentrdelSastMatchStateV1;
  readonly severity_state: SentrdelSastSeverityStateV1;
  readonly severity_value: null;
  readonly rule: SentrdelSastRuleIdentityV1;
  readonly location: SentrdelSastLocationV1;
  readonly provenance: SentrdelSastProvenanceV1;
  readonly coverage: SentrdelSastCoverageV1;
  readonly raw_evidence_ref: string;
  readonly raw_evidence_digest: string;
  readonly raw_evidence_content_persisted: false;
  readonly limitations: readonly string[];
  readonly effect_facts: SentrdelAdapterEffectCeilingV1;
  readonly network_facts: SentrdelAdapterNetworkPolicyV1;
  readonly egress_facts: SentrdelAdapterEgressPolicyV1;
  readonly authority: SentrdelSastAuthorityV1;
  readonly assurance_effect: "NONE";
  readonly finding_emitted: false;
  readonly claim_assessment_emitted: false;
  readonly rule_match_is_vulnerability: false;
  readonly location_is_executable_proof: false;
  readonly provenance_implies_trust: false;
  readonly global_clean_claimed: false;
  readonly remediation_verified: false;
}

/** Bounded, untrusted SAST input. This is input, never truth. */
export interface SentrdelSastInputV1 {
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
  readonly rule_id: string | null;
  readonly rule_set_ref: string | null;
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
  readonly raw_evidence_ref: string;
  readonly raw_evidence_digest: string;
  readonly limitations: readonly string[];
  readonly effect_facts: string;
  readonly network_facts: string;
  readonly egress_facts: string;
}

export interface SentrdelSastValidationV1 {
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
const MAX_OBSERVATIONS = 512;

const CLAIM_CLASS_SET = new Set<string>(SENTRDEL_OBSERVATION_CLAIM_CLASSES);
const MATCH_STATE_SET = new Set<string>(SENTRDEL_SAST_MATCH_STATES);
const PROVENANCE_SET = new Set<string>(SENTRDEL_PROVENANCE_STATES);
const COVERAGE_STATE_SET = new Set<string>(SENTRDEL_OBSERVATION_COVERAGE_STATES);
const AGGREGATE_STATE_SET = new Set<string>(SENTRDEL_AGGREGATE_COVERAGE_STATES);
const RESOLUTION_SET = new Set<string>(SENTRDEL_OBSERVATION_RESOLUTION_STATES);
const LOSS_REASON_SET = new Set<string>(SENTRDEL_COVERAGE_LOSS_REASONS);
const EXECUTION_STATE_SET = new Set<string>(SENTRDEL_ADAPTER_EXECUTION_STATES);
const NON_PRODUCING_SET = new Set<string>(
  SENTRDEL_NON_PRODUCING_EXECUTION_STATES,
);
const SUPPORTED_EXTENSION_SET = new Set<string>(
  SENTRDEL_SAST_SUPPORTED_EXTENSIONS,
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
  "rule_id",
  "rule_set_ref",
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
  "raw_evidence_ref",
  "raw_evidence_digest",
  "limitations",
  "effect_facts",
  "network_facts",
  "egress_facts",
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

/** Canonical code-unit ordering, independent of locale and traversal order. */
function canonicalStrings(values: readonly string[]): readonly string[] {
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
 * Deterministic SAST observation identity. It binds the request, attempt,
 * engine pin, source head, rule identity, and location, so a record can never be
 * silently reused across a different request, engine, or source position.
 */
function sastObservationIdV1(input: SentrdelSastInputV1): string {
  return `sast-observation:sentrdel:${canonicalDigestV1(
    [
      "sentrdel-sast-observation-v1",
      input.request_id,
      input.attempt_id,
      input.capability_id,
      input.engine_pin,
      input.source_head,
      input.rule_id ?? "RULE_ABSENT",
      input.location_path ?? "LOCATION_ABSENT",
      String(input.location_start_line ?? "NA"),
      String(input.location_end_line ?? "NA"),
      input.raw_evidence_digest,
    ].join("|"),
  )}`;
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

/**
 * Deterministic language resolution from a bounded path extension.
 *
 * The pinned capability supports JavaScript and TypeScript only. An extension
 * outside that set is explicit UNSUPPORTED rather than a silent accept, and a
 * path with no usable extension is INDETERMINATE rather than a guess.
 */
function resolveLanguage(
  path: string | null,
): {
  readonly language: SentrdelSastSupportedLanguageV1 | null;
  readonly support: SentrdelSastLocationV1["language_support"];
  readonly extension: string | null;
} {
  if (path === null) {
    return {
      language: null,
      support: "INDETERMINATE",
      extension: null,
    };
  }
  const separator = path.lastIndexOf(".");
  if (separator < 0 || separator === path.length - 1) {
    return { language: null, support: "INDETERMINATE", extension: null };
  }
  const extension = path.slice(separator + 1).toLowerCase();
  if (!SUPPORTED_EXTENSION_SET.has(extension)) {
    return {
      language: null,
      support: "UNSUPPORTED",
      extension,
    };
  }
  const language: SentrdelSastSupportedLanguageV1 =
    extension === "js" ||
    extension === "jsx" ||
    extension === "mjs" ||
    extension === "cjs"
      ? "javascript"
      : "typescript";
  return { language, support: "SUPPORTED", extension };
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1;
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
 * Fail-closed validation of bounded SAST input.
 *
 * Every defect yields a non-empty reason list; a caller must not emit a
 * normalized SAST record in that case, so malformed input can never look like a
 * successful structural observation.
 */
export function validateSentrdelSastInputV1(
  input: unknown,
): SentrdelSastValidationV1 {
  const reasons: string[] = [];

  if (!isRecord(input)) {
    return {
      schema_version: 1,
      valid: false,
      reasons: Object.freeze(["SAST input must be an object"]),
    };
  }

  if (!hasExactKeys(input, INPUT_KEYS)) {
    reasons.push("SAST input contains missing or unsupported fields");
  }

  // No canonical authority may ride in on a security observation.
  for (const forbidden of [
    "finding",
    "claim_assessment",
    "assurance",
    "verdict",
    "severity",
    "severity_value",
    "global_clean",
  ]) {
    if (input[forbidden] !== undefined) {
      reasons.push(`SAST input must never carry ${forbidden}`);
    }
  }

  if (input["schema_version"] !== SENTRDEL_SAST_SCHEMA_VERSION) {
    reasons.push("SAST input schema version must be 1");
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

  const capabilityId = input["capability_id"];
  if (!CAPABILITY_ID_SET.has(capabilityId as string)) {
    reasons.push(`unknown capability identity rejected: ${String(capabilityId)}`);
  } else if (capabilityId !== SENTRDEL_SAST_CAPABILITY_ID) {
    reasons.push("T06 normalizes sast-structural only");
  }

  const claimClass = input["claim_class"];
  if (!CLAIM_CLASS_SET.has(claimClass as string)) {
    reasons.push("claim class is unknown");
  } else if (claimClass !== "STRUCTURAL_OBSERVATION") {
    reasons.push("T06 accepts STRUCTURAL_OBSERVATION only");
  }

  const executionState = input["execution_state"];
  if (!EXECUTION_STATE_SET.has(executionState as string)) {
    reasons.push("execution state is unknown");
  }
  if (!MATCH_STATE_SET.has(input["match_state"] as string)) {
    reasons.push("match state is unknown");
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
    reasons.push("effect facts must remain E0_READ_ONLY_ANALYSIS in T06");
  }
  if (
    !SENTRDEL_ADAPTER_NETWORK_POLICIES.includes(
      input["network_facts"] as SentrdelAdapterNetworkPolicyV1,
    )
  ) {
    reasons.push("network facts are outside the canonical policy vocabulary");
  } else if (input["network_facts"] !== "NO_NETWORK") {
    reasons.push("network facts must remain NO_NETWORK in T06");
  }
  if (
    !SENTRDEL_ADAPTER_EGRESS_POLICIES.includes(
      input["egress_facts"] as SentrdelAdapterEgressPolicyV1,
    )
  ) {
    reasons.push("egress facts are outside the canonical policy vocabulary");
  } else if (input["egress_facts"] !== "NO_EGRESS") {
    reasons.push("egress facts must remain NO_EGRESS in T06");
  }

  // Rule identity: preserved, never invented. A structural observation always
  // requires a pinned rule identity and a rule set reference.
  const ruleId = input["rule_id"];
  if (ruleId === null) {
    reasons.push("a structural SAST observation requires a pinned rule identity");
  } else if (!isOpaqueId(ruleId)) {
    reasons.push("rule_id must be a bounded opaque identifier");
  }
  const ruleSetRef = input["rule_set_ref"];
  if (ruleSetRef === null) {
    reasons.push("a structural SAST observation requires a rule set reference");
  } else if (!isOpaqueId(ruleSetRef)) {
    reasons.push("rule_set_ref must be a bounded opaque identifier");
  }

  // Location: preserved exactly, never widened or invented. Resolution is
  // derived, never supplied, so a caller cannot claim a precise location it did
  // not produce.
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
  // A path with only one line bound is a partially resolved location, which the
  // canonical resolution vocabulary already represents.
  const resolution = deriveLocationResolution(
    typeof path === "string" ? path : null,
    isPositiveInteger(startLine) ? startLine : null,
    isPositiveInteger(endLine) ? endLine : null,
  );
  if (!RESOLUTION_SET.has(resolution)) {
    reasons.push("derived location resolution is outside the canonical vocabulary");
  }
  if (input["match_state"] === "RULE_MATCHED" && resolution === "ABSENT") {
    reasons.push("a matched rule requires a resolved source location");
  }
  // A match needs a start position. A start line with no end line is a
  // legitimate PARTIAL resolution, because an engine may report the opening
  // position of a match without a bounded closing position.
  if (input["match_state"] === "RULE_MATCHED" && !isPositiveInteger(startLine)) {
    reasons.push("a matched rule requires a start line position");
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
    reasons.push("a normalized SAST observation must state explicit limitations");
  }

  if (!isOpaqueId(input["raw_evidence_ref"])) {
    reasons.push("raw_evidence_ref must be a bounded opaque identifier");
  }
  if (
    typeof input["raw_evidence_digest"] !== "string" ||
    !SHA256_HEX.test(input["raw_evidence_digest"])
  ) {
    reasons.push("raw_evidence_digest must be a 64 character hex sha256");
  }

  // Contradiction guards. Each pair is an impossible SAST state and fails closed.
  if (input["match_state"] === "RULE_MATCHED" && ruleId === null) {
    reasons.push("a matched rule cannot exist without a pinned rule identity");
  }
  if (input["match_state"] === "RULE_MATCHED" && path === null) {
    reasons.push("a matched rule cannot exist without a preserved source location");
  }
  if (
    input["match_state"] === "RULE_MATCHED" &&
    input["coverage_state"] === "UNSCANNED"
  ) {
    reasons.push("a matched rule contradicts unscanned coverage");
  }
  if (
    input["match_state"] === "RULE_MATCHED" &&
    input["aggregate_coverage_state"] === "NOT_COVERED"
  ) {
    reasons.push("a matched rule contradicts not-covered aggregate scope");
  }
  if (
    input["match_state"] === "RULE_NOT_MATCHED_IN_STATED_SCOPE" &&
    input["coverage_state"] === "UNSCANNED"
  ) {
    reasons.push("a not-matched rule contradicts unscanned coverage");
  }
  if (
    input["coverage_state"] === "COMPLETE_WITHIN_STATED_SCOPE" &&
    (unknownStates.length > 0 || lossReasons.length > 0)
  ) {
    reasons.push("bounded-complete coverage contradicts its unknown or loss data");
  }
  if (input["coverage_state"] === "UNKNOWN" && unknownStates.length === 0) {
    reasons.push("UNKNOWN coverage requires at least one unknown state");
  }

  // A non-producing execution state can never produce a match, and its omission
  // reason is carried deterministically rather than left to the caller.
  if (NON_PRODUCING_SET.has(executionState as string)) {
    if (input["match_state"] !== "UNKNOWN") {
      reasons.push(
        `execution state ${String(executionState)} produced no match and may not report one`,
      );
    }
    const requiredReason =
      SENTRDEL_EXECUTION_STATE_LOSS_REASON[executionState as string];
    if (requiredReason !== undefined && !lossReasons.includes(requiredReason)) {
      reasons.push(
        `execution state ${String(executionState)} must declare coverage loss ${requiredReason}`,
      );
    }
  }

  // Unsupported language is explicit: this capability is JavaScript and
  // TypeScript only, so it may never claim a match on another extension.
  if (path !== null && typeof path === "string" && SOURCE_PATH.test(path)) {
    const resolved = resolveLanguage(path);
    if (
      resolved.support === "UNSUPPORTED" &&
      input["match_state"] === "RULE_MATCHED"
    ) {
      reasons.push(
        `a structural match is not claimable for unsupported extension ${String(resolved.extension)}`,
      );
    }
  }

  // Secret and self-attestation boundaries over every persisted string.
  const persistedStrings: unknown[] = [
    input["request_id"],
    input["attempt_id"],
    ruleId,
    ruleSetRef,
    path,
    input["producer_id"],
    input["producer_version"],
    input["collector_ref"],
    input["raw_evidence_ref"],
    ...unknownStates,
    ...lossReasons,
    ...limitations,
  ];
  scanStrings(
    persistedStrings,
    containsSecretMaterialV1,
    "SAST input must not carry secret material",
    reasons,
  );
  scanStrings(
    persistedStrings,
    containsExternalAttestationV1,
    "SAST input must never self-attest",
    reasons,
  );

  return {
    schema_version: 1,
    valid: reasons.length === 0,
    reasons: Object.freeze([...new Set(reasons)].sort()),
  };
}

/**
 * Normalize one bounded SAST input into an immutable structural observation.
 *
 * Rule, location, and provenance are carried through exactly as reported. Nothing
 * is widened, completed, or invented. Fails closed: on any validation defect no
 * record is produced, so malformed input can never look like a clean scan.
 */
export function normalizeSentrdelSastInputV1(
  input: unknown,
): SentrdelSastObservationV1 | undefined {
  const validation = validateSentrdelSastInputV1(input);
  if (!validation.valid) {
    return undefined;
  }
  const record = input as SentrdelSastInputV1;

  const capability = getSentrdelCapabilityV1(
    buildSentrdelCapabilitiesV1(),
    SENTRDEL_SAST_CAPABILITY_ID,
  );
  const path = record.location_path;
  const resolved = resolveLanguage(path);

  // A location is PRESENT only when a path and both line bounds were produced.
  // Anything less stays explicitly PARTIAL or ABSENT rather than being invented
  // upward. The resolution is derived here, never supplied by the caller.
  const resolution = deriveLocationResolution(
    path,
    record.location_start_line,
    record.location_end_line,
  );

  const rule: SentrdelSastRuleIdentityV1 = Object.freeze({
    rule_id: record.rule_id as string,
    rule_set_ref: record.rule_set_ref as string,
    rule_resolution: record.rule_id === null ? "ABSENT" : "PRESENT",
    rule_is_pinned: true,
  });

  const location: SentrdelSastLocationV1 = Object.freeze({
    resolution,
    path,
    start_line: record.location_start_line,
    end_line: record.location_end_line,
    language: resolved.language,
    language_support: resolved.support,
    file_extension: resolved.extension,
  });

  const provenance: SentrdelSastProvenanceV1 = Object.freeze({
    state: record.provenance_state as SentrdelProvenanceStateV1,
    producer_id: record.producer_id,
    producer_version: record.producer_version,
    collector_ref: record.collector_ref,
    rule_set_ref: record.rule_set_ref,
  });

  const coverage: SentrdelSastCoverageV1 = Object.freeze({
    observation_state: record.coverage_state as SentrdelObservationCoverageStateV1,
    aggregate_state: record
      .aggregate_coverage_state as SentrdelAggregateCoverageStateV1,
    unknown_states: canonicalStrings(record.unknown_states),
    coverage_loss_reasons: canonicalLossReasons(
      record.coverage_loss_reasons as readonly SentrdelCoverageLossReasonV1[],
    ),
    is_total: false as const,
    unscanned_is_clean: false as const,
    unknown_is_pass: false as const,
  });

  const observation: SentrdelSastObservationV1 = {
    schema_version: 1,
    sast_observation_id: sastObservationIdV1(record),
    phase_authority: SENTRDEL_SAST_PHASE_AUTHORITY,
    upstream_observation_id: `observation:sentrdel:${canonicalDigestV1(
      sastObservationIdV1(record).slice("sast-observation:sentrdel:".length),
    )}`,
    request_id: record.request_id,
    attempt_id: record.attempt_id,
    engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE,
    engine_pin_ref: SENTRDEL_PIN_REF,
    engine_version: SENTRDEL_ENGINE_VERSION,
    source_head: record.source_head,
    capability_id: SENTRDEL_SAST_CAPABILITY_ID,
    capability_status: capability?.status ?? "UNRESOLVED",
    claim_class: "STRUCTURAL_OBSERVATION",
    execution_state: record.execution_state as SentrdelAdapterExecutionStateV1,
    match_state: record.match_state as SentrdelSastMatchStateV1,
    severity_state: "NEVER_DERIVED",
    severity_value: null,
    rule,
    location,
    provenance,
    coverage,
    raw_evidence_ref: record.raw_evidence_ref,
    raw_evidence_digest: record.raw_evidence_digest,
    raw_evidence_content_persisted: false as const,
    limitations: canonicalStrings(record.limitations),
    effect_facts: "E0_READ_ONLY_ANALYSIS",
    network_facts: "NO_NETWORK",
    egress_facts: "NO_EGRESS",
    authority: "STRUCTURAL_OBSERVATION_ONLY",
    assurance_effect: "NONE" as const,
    finding_emitted: false as const,
    claim_assessment_emitted: false as const,
    rule_match_is_vulnerability: false as const,
    location_is_executable_proof: false as const,
    provenance_implies_trust: false as const,
    global_clean_claimed: false as const,
    remediation_verified: false as const,
  };

  return deepFreeze(observation);
}

/**
 * Cross-task consistency gate against a T04 normalized observation.
 *
 * T06 may only be admitted for an observation that is itself a valid T04
 * record, is a structural claim class, targets `sast-structural`, and carries
 * complete provenance. This keeps SAST normalization from ever running on a
 * record the canonical T04 boundary would itself reject.
 *
 * Returns the exact recorded reasons, or an empty list when compatible.
 */
export function checkSastUpstreamCompatibilityV1(
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
  if (upstream.claim_class !== "STRUCTURAL_OBSERVATION") {
    reasons.push("T06 accepts a STRUCTURAL_OBSERVATION upstream only");
  }
  if (upstream.capability_id !== SENTRDEL_SAST_CAPABILITY_ID) {
    reasons.push("upstream observation must target sast-structural");
  }
  if (upstream.engine_pin !== SENTRDEL_PINNED_REVISION) {
    reasons.push("upstream observation must bind the exact Sentrdel pin");
  }
  if (upstream.rule_id === null || upstream.rule_id === undefined) {
    reasons.push("a structural SAST observation requires a pinned rule identity");
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
  if (
    provenance !== undefined &&
    upstream.claim_class === "STRUCTURAL_OBSERVATION" &&
    upstream.capability_id === SENTRDEL_SAST_CAPABILITY_ID
  ) {
    const upstreamCheck = assertSentrdelObservationInvariantsV1(upstream);
    for (const reason of upstreamCheck.reasons) {
      reasons.push(`upstream invariant failed: ${reason}`);
    }
  }
  return Object.freeze([...new Set(reasons)].sort(compareText));
}

/** The complete frozen SAST limitations, for exhaustive assertions. */
export const SENTRDEL_SAST_LIMITATION_COUNT = SENTRDEL_SAST_KNOWN_LIMITATIONS.length;

export interface SentrdelSastSetV1 {
  readonly schema_version: 1;
  readonly phase_authority: typeof SENTRDEL_SAST_PHASE_AUTHORITY;
  readonly authority: SentrdelSastAuthorityV1;
  readonly ok: boolean;
  readonly observations: readonly SentrdelSastObservationV1[];
  readonly rejected_indices: readonly number[];
  readonly reasons: readonly string[];
}

function rejectedSet(
  reasons: readonly string[],
  rejected: readonly number[],
): SentrdelSastSetV1 {
  return deepFreeze({
    schema_version: 1 as const,
    phase_authority: SENTRDEL_SAST_PHASE_AUTHORITY,
    authority: "STRUCTURAL_OBSERVATION_ONLY" as const,
    ok: false,
    observations: Object.freeze([]),
    rejected_indices: Object.freeze([...rejected]),
    reasons: Object.freeze([...reasons]),
  });
}

/**
 * Normalize a set of SAST inputs into deterministically ordered,
 * observation-only records.
 *
 * Fails closed as a unit: if any input is malformed or any observation identity
 * is duplicated, no observation is emitted at all, so a partial failure can never
 * read as a successful scan.
 */
export function normalizeSentrdelSastSetV1(
  inputs: readonly unknown[],
): SentrdelSastSetV1 {
  if (!Array.isArray(inputs)) {
    return rejectedSet(["SAST input set must be an array"], []);
  }
  if (inputs.length > MAX_OBSERVATIONS) {
    return rejectedSet(
      [`SAST input set must contain at most ${MAX_OBSERVATIONS} entries`],
      [],
    );
  }

  const reasons: string[] = [];
  const rejected: number[] = [];
  const normalized: SentrdelSastObservationV1[] = [];

  for (let index = 0; index < inputs.length; index += 1) {
    const validation = validateSentrdelSastInputV1(inputs[index]);
    if (!validation.valid) {
      rejected.push(index);
      for (const reason of validation.reasons) {
        reasons.push(`[${index}] ${reason}`);
      }
      continue;
    }
    const observation = normalizeSentrdelSastInputV1(inputs[index]);
    if (observation === undefined) {
      rejected.push(index);
      reasons.push(`[${index}] observation could not be normalized`);
      continue;
    }
    normalized.push(observation);
  }

  const seen = new Set<string>();
  for (const observation of normalized) {
    if (seen.has(observation.sast_observation_id)) {
      reasons.push(
        `duplicate observation identity: ${observation.sast_observation_id}`,
      );
    }
    seen.add(observation.sast_observation_id);
  }

  if (reasons.length > 0) {
    return rejectedSet([...new Set(reasons)].sort(compareText), rejected);
  }

  const ordered = [...normalized].sort((left, right) =>
    compareText(left.sast_observation_id, right.sast_observation_id),
  );

  return deepFreeze({
    schema_version: 1,
    phase_authority: SENTRDEL_SAST_PHASE_AUTHORITY,
    authority: "STRUCTURAL_OBSERVATION_ONLY",
    ok: true,
    observations: Object.freeze(ordered),
    rejected_indices: Object.freeze([]),
    reasons: Object.freeze([]),
  });
}

export interface SentrdelSastInvariantCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

/**
 * Re-assert the T06 invariants against an already normalized SAST record. A
 * defensive gate for any later consumer boundary.
 */
export function assertSentrdelSastInvariantsV1(
  observation: SentrdelSastObservationV1,
): SentrdelSastInvariantCheckV1 {
  const reasons: string[] = [];
  if (observation.schema_version !== 1) {
    reasons.push("SAST observation schema version must be 1");
  }
  if (observation.phase_authority !== SENTRDEL_SAST_PHASE_AUTHORITY) {
    reasons.push("SAST phase authority must be UA-P06-T06");
  }
  if (observation.authority !== "STRUCTURAL_OBSERVATION_ONLY") {
    reasons.push("SAST authority must be STRUCTURAL_OBSERVATION_ONLY");
  }
  if (observation.capability_id !== SENTRDEL_SAST_CAPABILITY_ID) {
    reasons.push("T06 normalizes sast-structural only");
  }
  if (observation.claim_class !== "STRUCTURAL_OBSERVATION") {
    reasons.push("T06 accepts STRUCTURAL_OBSERVATION only");
  }
  if (observation.engine_pin !== SENTRDEL_PINNED_REVISION) {
    reasons.push("SAST observation must bind the exact Sentrdel pin");
  }
  if (observation.engine_tree !== SENTRDEL_PINNED_TREE) {
    reasons.push("SAST observation must bind the exact Sentrdel tree");
  }
  if (observation.engine_pin_ref !== SENTRDEL_PIN_REF) {
    reasons.push("SAST observation must bind the exact Sentrdel pin ref");
  }
  if (observation.assurance_effect !== "NONE") {
    reasons.push("SAST normalization must have no assurance effect");
  }
  if (observation.finding_emitted) {
    reasons.push("SAST normalization must never emit a Finding");
  }
  if (observation.claim_assessment_emitted) {
    reasons.push("SAST normalization must never emit a ClaimAssessment");
  }
  if (observation.rule_match_is_vulnerability) {
    reasons.push("a rule match must never equal a vulnerability claim");
  }
  if (observation.location_is_executable_proof) {
    reasons.push("a location must never equal an executable proof");
  }
  if (observation.provenance_implies_trust) {
    reasons.push("provenance must never imply engine trust");
  }
  if (observation.global_clean_claimed) {
    reasons.push("SAST normalization must never claim a global clean");
  }
  if (observation.remediation_verified) {
    reasons.push("SAST normalization must never verify a remediation");
  }
  if (observation.severity_state !== "NEVER_DERIVED") {
    reasons.push("severity must never be derived at T06");
  }
  if (observation.severity_value !== null) {
    reasons.push("severity value must remain null at T06");
  }
  if (observation.coverage.is_total) {
    reasons.push("SAST coverage must never be total");
  }
  if (observation.coverage.unscanned_is_clean) {
    reasons.push("unscanned scope must never be clean");
  }
  if (observation.coverage.unknown_is_pass) {
    reasons.push("UNKNOWN must never be a pass");
  }
  if (observation.raw_evidence_content_persisted) {
    reasons.push("raw evidence content must never be persisted");
  }
  if (observation.limitations.length === 0) {
    reasons.push("a normalized SAST observation must state explicit limitations");
  }
  if (observation.rule.rule_is_pinned !== true) {
    reasons.push("a normalized SAST observation must bind a pinned rule");
  }
  if (
    observation.match_state === "RULE_MATCHED" &&
    observation.location.path === null
  ) {
    reasons.push("a matched rule must carry a preserved source location");
  }
  if (
    observation.match_state === "RULE_MATCHED" &&
    observation.location.start_line === null
  ) {
    reasons.push("a matched rule must carry a start line position");
  }
  if (
    observation.match_state === "RULE_MATCHED" &&
    observation.location.language_support === "UNSUPPORTED"
  ) {
    reasons.push("a matched rule must not sit on an unsupported language");
  }
  if (
    observation.execution_state !== "EXECUTED" &&
    observation.match_state === "RULE_MATCHED"
  ) {
    reasons.push("a non-executing engine must never report a match");
  }
  if (
    observation.provenance.state === "COMPLETE" &&
    observation.provenance.producer_id === null
  ) {
    reasons.push("COMPLETE provenance must carry a producer identity");
  }

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
  ]) {
    if (record[forbidden] !== undefined) {
      reasons.push(`SAST observation must never carry ${forbidden}`);
    }
  }

  return { ok: reasons.length === 0, reasons: Object.freeze(reasons) };
}

/** A normalized SAST record is never a Finding. */
export function sastObservationIsFindingV1(): boolean {
  return false;
}

/** A normalized SAST record is never a ClaimAssessment. */
export function sastObservationIsClaimAssessmentV1(): boolean {
  return false;
}

/** A rule match is never a vulnerability claim. */
export function ruleMatchIsVulnerabilityV1(): boolean {
  return false;
}

/** A location is never an executable proof. */
export function locationIsExecutableProofV1(): boolean {
  return false;
}

/** Complete provenance never implies that the engine is trusted. */
export function provenanceImpliesTrustV1(): boolean {
  return false;
}

/** Severity is never derived at T06. */
export function severityIsDerivedV1(): boolean {
  return false;
}

/** SAST normalization never implies a global clean. */
export function sastImpliesGlobalCleanV1(): boolean {
  return false;
}

/** SAST normalization is pure: no execution, network, clock, or randomness. */
export function sastNormalizationExecutesRuntimeV1(): boolean {
  return false;
}

export function sastNormalizationRequiresNetworkV1(): boolean {
  return false;
}

export function sastNormalizationUsesClockV1(): boolean {
  return false;
}

export function sastNormalizationUsesRandomnessV1(): boolean {
  return false;
}
