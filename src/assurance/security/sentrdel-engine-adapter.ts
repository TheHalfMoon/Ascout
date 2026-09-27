import {
  SENTRDEL_ENGINE_ID,
  SENTRDEL_ENGINE_VERSION,
  SENTRDEL_IMPLEMENTATION_ID,
  SENTRDEL_SOURCE_IDENTITY,
} from "./sentrdel-engine-boundary.js";
import {
  buildSentrdelCapabilitiesV1,
  type SentrdelCapabilityIdV1,
} from "./sentrdel-capability-characterization.js";
import {
  SENTRDEL_PINNED_REVISION,
  SENTRDEL_PINNED_TREE,
} from "./sentrdel-source-pin.js";

export const SENTRDEL_ADAPTER_REQUEST_SCHEMA_VERSION = 1 as const;
export const SENTRDEL_ADAPTER_RESPONSE_SCHEMA_VERSION = 1 as const;

export const SENTRDEL_ADAPTER_PHASE_AUTHORITY = "UA-P06-T03" as const;

export const SENTRDEL_ADAPTER_EXECUTION_STATES = [
  "AVAILABLE",
  "EXECUTED",
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

export type SentrdelAdapterExecutionStateV1 =
  (typeof SENTRDEL_ADAPTER_EXECUTION_STATES)[number];

export const SENTRDEL_ADAPTER_NETWORK_POLICIES = ["NO_NETWORK"] as const;

export type SentrdelAdapterNetworkPolicyV1 =
  (typeof SENTRDEL_ADAPTER_NETWORK_POLICIES)[number];

export const SENTRDEL_ADAPTER_EGRESS_POLICIES = ["NO_EGRESS"] as const;

export type SentrdelAdapterEgressPolicyV1 =
  (typeof SENTRDEL_ADAPTER_EGRESS_POLICIES)[number];

export const SENTRDEL_ADAPTER_EFFECT_CEILINGS = [
  "E0_READ_ONLY_ANALYSIS",
] as const;

export type SentrdelAdapterEffectCeilingV1 =
  (typeof SENTRDEL_ADAPTER_EFFECT_CEILINGS)[number];

function characterizedCapabilityIds(): readonly SentrdelCapabilityIdV1[] {
  const ids: SentrdelCapabilityIdV1[] = [];
  for (const capability of buildSentrdelCapabilitiesV1()) {
    if (capability.status === "CHARACTERIZED") {
      ids.push(capability.id);
    }
  }
  return Object.freeze([...ids].sort());
}

export const SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES: readonly SentrdelCapabilityIdV1[] =
  characterizedCapabilityIds();

const ALLOWED_CAPABILITY_SET = new Set<string>(
  SENTRDEL_ADAPTER_ALLOWED_CAPABILITIES,
);

export interface SentrdelAdapterRequestV1 {
  readonly schema_version: 1;
  readonly request_id: string;
  readonly source_kind: string;
  readonly source_head: string;
  readonly requested_capabilities: readonly SentrdelCapabilityIdV1[];
  readonly effect_ceiling: SentrdelAdapterEffectCeilingV1;
  readonly network_policy: SentrdelAdapterNetworkPolicyV1;
  readonly data_egress_policy: SentrdelAdapterEgressPolicyV1;
  readonly engine_id: typeof SENTRDEL_ENGINE_ID;
  readonly engine_pin_expected: typeof SENTRDEL_PINNED_REVISION;
  readonly engine_tree_expected: typeof SENTRDEL_PINNED_TREE;
  readonly engine_version_expected: typeof SENTRDEL_ENGINE_VERSION;
  readonly input_refs: readonly string[];
  readonly attempt_id: string;
}

export interface SentrdelAdapterResponseV1 {
  readonly schema_version: 1;
  readonly request_id: string;
  readonly engine_id: typeof SENTRDEL_ENGINE_ID;
  readonly engine_version_actual: string;
  readonly engine_pin_actual: string;
  readonly capability: SentrdelCapabilityIdV1;
  readonly execution_state: SentrdelAdapterExecutionStateV1;
  readonly source_binding: string;
  readonly occurrence_ref: string;
  readonly raw_result_digest: string;
  readonly coverage_state: string;
  readonly unknown_tokens: readonly string[];
  readonly limitations: readonly string[];
  readonly effect_fact: SentrdelAdapterEffectCeilingV1;
  readonly network_fact: SentrdelAdapterNetworkPolicyV1;
  readonly egress_fact: SentrdelAdapterEgressPolicyV1;
  readonly exit_outcome: string;
  readonly adapter_errors: readonly string[];
}

export interface SentrdelAdapterAuthorityV1 {
  readonly explicit_request: boolean;
  readonly phase_authority: string;
  readonly engine_admitted: boolean;
  readonly qualified: boolean;
  readonly effect_within_ceiling: boolean;
  readonly network_permitted: boolean;
  readonly egress_permitted: boolean;
}

export interface SentrdelAdapterDecisionV1 {
  readonly permitted: boolean;
  readonly execution_state:
    | "AVAILABLE"
    | "NOT_QUALIFIED"
    | "DENIED_BY_POLICY"
    | "VERSION_MISMATCH";
  readonly reasons: readonly string[];
}

const GIT_SHA1_HEX = /^[a-f0-9]{40}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const OPAQUE_ID =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SECRET_SHAPES = [
  /ghp_[A-Za-z0-9]{36}/u,
  /AKIA[0-9A-Z]{16}/u,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
];

function isOpaqueId(value: unknown): value is string {
  return typeof value === "string" && OPAQUE_ID.test(value);
}

function containsSecretMaterial(value: string): boolean {
  return SECRET_SHAPES.some((shape) => shape.test(value));
}

function scanForSecrets(values: readonly string[]): string | undefined {
  for (const value of values) {
    if (containsSecretMaterial(value)) {
      return value.slice(0, 24);
    }
  }
  return undefined;
}

function requireSortedUnique(
  values: readonly string[],
  field: string,
  reasons: string[],
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      reasons.push(`${field} must not contain duplicates`);
      return;
    }
    seen.add(value);
  }
  const ordered = [...values].sort();
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] !== ordered[index]) {
      reasons.push(`${field} must be canonically ordered`);
      return;
    }
  }
}

export interface SentrdelAdapterValidationV1 {
  readonly valid: boolean;
  readonly reasons: readonly string[];
}

const REQUEST_KEYS = [
  "schema_version",
  "request_id",
  "source_kind",
  "source_head",
  "requested_capabilities",
  "effect_ceiling",
  "network_policy",
  "data_egress_policy",
  "engine_id",
  "engine_pin_expected",
  "engine_tree_expected",
  "engine_version_expected",
  "input_refs",
  "attempt_id",
] as const;

const RESPONSE_KEYS = [
  "schema_version",
  "request_id",
  "engine_id",
  "engine_version_actual",
  "engine_pin_actual",
  "capability",
  "execution_state",
  "source_binding",
  "occurrence_ref",
  "raw_result_digest",
  "coverage_state",
  "unknown_tokens",
  "limitations",
  "effect_fact",
  "network_fact",
  "egress_fact",
  "exit_outcome",
  "adapter_errors",
] as const;

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...keys].sort();
  if (actual.length !== wanted.length) return false;
  return actual.every((key, index) => key === wanted[index]);
}

export function validateSentrdelAdapterRequestV1(
  request: SentrdelAdapterRequestV1,
): SentrdelAdapterValidationV1 {
  const reasons: string[] = [];
  const record = request as unknown as Record<string, unknown>;
  if (!hasExactKeys(record, REQUEST_KEYS)) {
    reasons.push("request contains missing or unknown fields");
  }
  if (request.schema_version !== 1) {
    reasons.push("request schema version must be 1");
  }
  if (!isOpaqueId(request.request_id)) {
    reasons.push("request_id must be a bounded opaque identifier");
  }
  if (!isOpaqueId(request.source_kind)) {
    reasons.push("source_kind must be a bounded opaque identifier");
  }
  if (
    typeof request.source_head !== "string" ||
    !GIT_SHA1_HEX.test(request.source_head)
  ) {
    reasons.push("source_head must be a 40 character lowercase hex sha");
  }
  if (
    !Array.isArray(request.requested_capabilities) ||
    request.requested_capabilities.length === 0 ||
    request.requested_capabilities.length > 10
  ) {
    reasons.push("requested_capabilities must list 1 to 10 capabilities");
  } else {
    for (const id of request.requested_capabilities) {
      if (!ALLOWED_CAPABILITY_SET.has(id)) {
        reasons.push(`unknown or unexecutable capability rejected: ${id}`);
      }
    }
    requireSortedUnique(
      [...request.requested_capabilities],
      "requested_capabilities",
      reasons,
    );
  }
  if (request.effect_ceiling !== "E0_READ_ONLY_ANALYSIS") {
    reasons.push("effect ceiling must remain E0_READ_ONLY_ANALYSIS in T03");
  }
  if (request.network_policy !== "NO_NETWORK") {
    reasons.push("network policy must remain NO_NETWORK in T03");
  }
  if (request.data_egress_policy !== "NO_EGRESS") {
    reasons.push("data egress policy must remain NO_EGRESS in T03");
  }
  if (request.engine_id !== SENTRDEL_ENGINE_ID) {
    reasons.push("engine id must be engine:sentrdel");
  }
  if (request.engine_pin_expected !== SENTRDEL_PINNED_REVISION) {
    reasons.push("engine pin expectation must equal the T01 pin");
  }
  if (request.engine_tree_expected !== SENTRDEL_PINNED_TREE) {
    reasons.push("engine tree expectation must equal the T01 tree");
  }
  if (request.engine_version_expected !== SENTRDEL_ENGINE_VERSION) {
    reasons.push("engine version expectation must be 0.0.0");
  }
  if (
    !Array.isArray(request.input_refs) ||
    request.input_refs.length > 256
  ) {
    reasons.push("input_refs must contain at most 256 entries");
  } else {
    for (const ref of request.input_refs) {
      if (!isOpaqueId(ref)) {
        reasons.push("input_refs must be bounded opaque identifiers");
        break;
      }
    }
    requireSortedUnique([...request.input_refs], "input_refs", reasons);
  }
  if (!isOpaqueId(request.attempt_id)) {
    reasons.push("attempt_id must be a bounded opaque identifier");
  }
  const secret = scanForSecrets([
    request.request_id,
    request.source_kind,
    request.source_head,
    request.attempt_id,
    ...request.input_refs,
  ]);
  if (secret !== undefined) {
    reasons.push("request must not persist secret material");
  }
  return { valid: reasons.length === 0, reasons: Object.freeze(reasons) };
}

export function validateSentrdelAdapterResponseV1(
  response: SentrdelAdapterResponseV1,
): SentrdelAdapterValidationV1 {
  const reasons: string[] = [];
  const record = response as unknown as Record<string, unknown>;
  if (!hasExactKeys(record, RESPONSE_KEYS)) {
    reasons.push("response contains missing or unknown fields");
  }
  if (response.schema_version !== 1) {
    reasons.push("response schema version must be 1");
  }
  if (!isOpaqueId(response.request_id)) {
    reasons.push("request_id must be a bounded opaque identifier");
  }
  if (response.engine_id !== SENTRDEL_ENGINE_ID) {
    reasons.push("engine id must be engine:sentrdel");
  }
  if (!isOpaqueId(response.engine_version_actual)) {
    reasons.push("actual engine version must be a bounded opaque identifier");
  }
  if (
    typeof response.engine_pin_actual !== "string" ||
    !GIT_SHA1_HEX.test(response.engine_pin_actual)
  ) {
    reasons.push("actual engine pin must be a 40 character hex sha");
  }
  if (!ALLOWED_CAPABILITY_SET.has(response.capability)) {
    reasons.push(`unknown or unexecutable capability rejected: ${response.capability}`);
  }
  if (
    !SENTRDEL_ADAPTER_EXECUTION_STATES.includes(response.execution_state)
  ) {
    reasons.push("execution state is unknown");
  }
  if (
    typeof response.source_binding !== "string" ||
    !GIT_SHA1_HEX.test(response.source_binding)
  ) {
    reasons.push("source binding must be a 40 character hex sha");
  }
  if (!isOpaqueId(response.occurrence_ref)) {
    reasons.push("occurrence ref must be a bounded opaque identifier");
  }
  if (
    typeof response.raw_result_digest !== "string" ||
    !SHA256_HEX.test(response.raw_result_digest)
  ) {
    reasons.push("raw result digest must be a 64 character hex sha256");
  }
  if (!isOpaqueId(response.coverage_state)) {
    reasons.push("coverage state must be a bounded opaque identifier");
  }
  if (response.unknown_tokens.length > 32) {
    reasons.push("unknown tokens must contain at most 32 entries");
  }
  if (response.limitations.length > 32) {
    reasons.push("limitations must contain at most 32 entries");
  }
  if (response.effect_fact !== "E0_READ_ONLY_ANALYSIS") {
    reasons.push("effect fact must remain E0_READ_ONLY_ANALYSIS in T03");
  }
  if (response.network_fact !== "NO_NETWORK") {
    reasons.push("network fact must remain NO_NETWORK in T03");
  }
  if (response.egress_fact !== "NO_EGRESS") {
    reasons.push("egress fact must remain NO_EGRESS in T03");
  }
  if (!isOpaqueId(response.exit_outcome)) {
    reasons.push("exit outcome must be a bounded opaque identifier");
  }
  if (response.adapter_errors.length > 32) {
    reasons.push("adapter errors must contain at most 32 entries");
  }
  const leaked = (response as unknown as Record<string, unknown>)["finding"];
  if (leaked !== undefined) {
    reasons.push("response must never carry a canonical Finding");
  }
  const claimed = (response as unknown as Record<string, unknown>)[
    "claim_assessment"
  ];
  if (claimed !== undefined) {
    reasons.push("response must never carry a ClaimAssessment");
  }
  const secret = scanForSecrets([
    response.request_id,
    response.occurrence_ref,
    response.exit_outcome,
    ...response.adapter_errors,
  ]);
  if (secret !== undefined) {
    reasons.push("response must not persist secret material");
  }
  return { valid: reasons.length === 0, reasons: Object.freeze(reasons) };
}

export function evaluateAdapterAuthorityV1(
  request: SentrdelAdapterRequestV1,
  authority: SentrdelAdapterAuthorityV1,
): SentrdelAdapterDecisionV1 {
  const reasons: string[] = [];
  if (!authority.explicit_request) {
    reasons.push("explicit request is absent");
  }
  if (authority.phase_authority !== SENTRDEL_ADAPTER_PHASE_AUTHORITY) {
    reasons.push("phase authority must be UA-P06-T03");
  }
  if (!authority.engine_admitted) {
    reasons.push("engine is not admitted");
  }
  if (!authority.qualified) {
    reasons.push("engine is not qualified");
  }
  if (!authority.effect_within_ceiling) {
    reasons.push("effect exceeds the E0 ceiling");
  }
  if (!authority.network_permitted) {
    reasons.push("network is not permitted");
  }
  if (!authority.egress_permitted) {
    reasons.push("data egress is not permitted");
  }
  const requestCheck = validateSentrdelAdapterRequestV1(request);
  if (!requestCheck.valid) {
    return {
      permitted: false,
      execution_state: "DENIED_BY_POLICY",
      reasons: Object.freeze([...reasons, ...requestCheck.reasons]),
    };
  }
  if (reasons.length > 0) {
    const missingQualification = !authority.qualified || !authority.engine_admitted;
    return {
      permitted: false,
      execution_state: missingQualification
        ? "NOT_QUALIFIED"
        : "DENIED_BY_POLICY",
      reasons: Object.freeze(reasons),
    };
  }
  return {
    permitted: true,
    execution_state: "AVAILABLE",
    reasons: Object.freeze([]),
  };
}

export function resolveMissingEngineV1(
  reason_code: string,
  reason_text: string,
): {
  readonly execution_state: "NOT_RUN";
  readonly reason_code: string;
  readonly reason_text: string;
} {
  const code = reason_code.trim();
  const text = reason_text.trim();
  if (code.length === 0 || text.length === 0) {
    return Object.freeze({
      execution_state: "NOT_RUN" as const,
      reason_code: "sentrdel_unavailable",
      reason_text: "Sentrdel engine is unavailable and no security ran.",
    });
  }
  return Object.freeze({
    execution_state: "NOT_RUN" as const,
    reason_code: code,
    reason_text: text,
  });
}

export function isVersionMismatchV1(
  request: SentrdelAdapterRequestV1,
  actual_pin: string,
  actual_version: string,
): boolean {
  return (
    actual_pin !== request.engine_pin_expected ||
    actual_version !== request.engine_version_expected
  );
}

export function externalSuccessIsAssurancePassV1(): boolean {
  return false;
}

export function responseCarriesFindingV1(
  response: SentrdelAdapterResponseV1,
): boolean {
  const record = response as unknown as Record<string, unknown>;
  return record["finding"] !== undefined || record["claim_assessment"] !== undefined;
}

export function adapterIdentityV1(): {
  readonly engine_id: typeof SENTRDEL_ENGINE_ID;
  readonly implementation_id: typeof SENTRDEL_IMPLEMENTATION_ID;
  readonly source_identity: typeof SENTRDEL_SOURCE_IDENTITY;
  readonly version: typeof SENTRDEL_ENGINE_VERSION;
  readonly pin: typeof SENTRDEL_PINNED_REVISION;
} {
  return Object.freeze({
    engine_id: SENTRDEL_ENGINE_ID,
    implementation_id: SENTRDEL_IMPLEMENTATION_ID,
    source_identity: SENTRDEL_SOURCE_IDENTITY,
    version: SENTRDEL_ENGINE_VERSION,
    pin: SENTRDEL_PINNED_REVISION,
  });
}
