export const CONTRACT_ADAPTER_SCHEMA_VERSION = 1 as const;
export const CONTRACT_ADAPTER_KINDS = ["contract", "schema"] as const;
export const EXTERNAL_RUNNER_STATUSES = [
  "PASS",
  "FAIL",
  "ERROR",
  "UNAVAILABLE",
  "NOT_RUN",
] as const;

export type ContractAdapterKindV1 =
  (typeof CONTRACT_ADAPTER_KINDS)[number];
export type ExternalRunnerStatusV1 =
  (typeof EXTERNAL_RUNNER_STATUSES)[number];

export interface ExternalRunnerContractOutputV1 {
  readonly schema_version: typeof CONTRACT_ADAPTER_SCHEMA_VERSION;
  readonly adapter_id: string;
  readonly kind: ContractAdapterKindV1;
  readonly source_identity: string;
  readonly head_sha: string;
  readonly status: ExternalRunnerStatusV1;
  readonly contract_ref: string;
  readonly schema_ref: string | null;
  readonly observed_case_count: number;
  readonly result_digest: string;
  readonly limitations: readonly string[];
}

export interface NormalizedContractObservationV1 {
  readonly schema_version: typeof CONTRACT_ADAPTER_SCHEMA_VERSION;
  readonly scope: "TEST";
  readonly strategy: "OBSERVATION_ONLY";
  readonly authority: "NONE_UNTRUSTED";
  readonly canonical_status: "UNTRUSTED_OBSERVATION";
  readonly adapter_id: string;
  readonly kind: ContractAdapterKindV1;
  readonly source_identity: string;
  readonly head_sha: string;
  readonly source_status: ExternalRunnerStatusV1;
  readonly contract_ref: string;
  readonly schema_ref: string | null;
  readonly observed_case_count: number;
  readonly result_digest: string;
  readonly limitations: readonly string[];
  readonly blocking_reasons: readonly string[];
  readonly plan_visible_fields: readonly string[];
}

const PLAN_VISIBLE_FIELDS: readonly string[] = Object.freeze([
  "schema_version",
  "scope",
  "strategy",
  "authority",
  "canonical_status",
  "adapter_id",
  "kind",
  "source_identity",
  "head_sha",
  "source_status",
  "contract_ref",
  "schema_ref",
  "observed_case_count",
  "result_digest",
  "limitations",
  "blocking_reasons",
]);

const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

function requireText(value: string, field: string): void {
  if (
    value.length === 0 ||
    value.length > 512 ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    throw new TypeError(field + " must be bounded printable text");
  }
}

function requireIdentifier(value: string, field: string): void {
  requireText(value, field);
  if (!/^[A-Za-z0-9._:/-]+$/u.test(value)) {
    throw new TypeError(field + " contains unsupported characters");
  }
}

function requireKind(value: string): ContractAdapterKindV1 {
  if (!CONTRACT_ADAPTER_KINDS.includes(value as ContractAdapterKindV1)) {
    throw new TypeError("kind is unsupported");
  }
  return value as ContractAdapterKindV1;
}

function requireStatus(value: string): ExternalRunnerStatusV1 {
  if (!EXTERNAL_RUNNER_STATUSES.includes(value as ExternalRunnerStatusV1)) {
    throw new TypeError("status is unsupported");
  }
  return value as ExternalRunnerStatusV1;
}

function canonicalLimitations(values: readonly string[]): readonly string[] {
  for (const value of values) {
    requireText(value, "limitation");
  }
  if (new Set(values).size !== values.length) {
    throw new TypeError("limitations must contain unique entries");
  }
  return [...values].sort();
}

export function normalizeExternalRunnerContractOutputV1(
  input: ExternalRunnerContractOutputV1,
): NormalizedContractObservationV1 {
  if (input.schema_version !== CONTRACT_ADAPTER_SCHEMA_VERSION) {
    throw new TypeError("schema_version is unsupported");
  }
  requireIdentifier(input.adapter_id, "adapter_id");
  const kind = requireKind(input.kind);
  requireIdentifier(input.source_identity, "source_identity");
  if (!SHA_PATTERN.test(input.head_sha)) {
    throw new TypeError("head_sha must be a full lowercase Git object id");
  }
  const status = requireStatus(input.status);
  requireText(input.contract_ref, "contract_ref");
  if (input.schema_ref !== null) {
    requireText(input.schema_ref, "schema_ref");
  }
  if (kind === "schema" && input.schema_ref === null) {
    throw new TypeError("schema output requires schema_ref");
  }
  if (!Number.isSafeInteger(input.observed_case_count) || input.observed_case_count < 0) {
    throw new TypeError("observed_case_count must be a nonnegative safe integer");
  }
  if (!DIGEST_PATTERN.test(input.result_digest)) {
    throw new TypeError("result_digest must be a lowercase SHA-256 digest");
  }
  const limitations = canonicalLimitations(input.limitations);
  const blockingReasons: string[] = [];
  if (status !== "PASS") {
    blockingReasons.push("external-runner:" + status.toLowerCase());
  }
  if (input.observed_case_count === 0) {
    blockingReasons.push("external-runner:no-cases");
  }
  for (const limitation of limitations) {
    blockingReasons.push("external-runner:limitation:" + limitation);
  }
  return Object.freeze({
    schema_version: CONTRACT_ADAPTER_SCHEMA_VERSION,
    scope: "TEST" as const,
    strategy: "OBSERVATION_ONLY" as const,
    authority: "NONE_UNTRUSTED" as const,
    canonical_status: "UNTRUSTED_OBSERVATION" as const,
    adapter_id: input.adapter_id,
    kind,
    source_identity: input.source_identity,
    head_sha: input.head_sha,
    source_status: status,
    contract_ref: input.contract_ref,
    schema_ref: input.schema_ref,
    observed_case_count: input.observed_case_count,
    result_digest: input.result_digest,
    limitations: Object.freeze([...limitations]),
    blocking_reasons: Object.freeze([...new Set(blockingReasons)].sort()),
    plan_visible_fields: Object.freeze([...PLAN_VISIBLE_FIELDS]),
  });
}
