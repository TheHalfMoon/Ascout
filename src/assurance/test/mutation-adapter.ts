export const MUTATION_ADAPTER_SCHEMA_VERSION = 1 as const;
export const MUTATION_ADAPTER_KINDS = ["mutation"] as const;
export const EXTERNAL_RUNNER_STATUSES = [
  "PASS",
  "FAIL",
  "ERROR",
  "UNAVAILABLE",
  "NOT_RUN",
] as const;

export type MutationAdapterKindV1 =
  (typeof MUTATION_ADAPTER_KINDS)[number];
export type ExternalRunnerStatusV1 =
  (typeof EXTERNAL_RUNNER_STATUSES)[number];

export interface ExternalMutationOutputV1 {
  readonly schema_version: typeof MUTATION_ADAPTER_SCHEMA_VERSION;
  readonly adapter_id: string;
  readonly kind: MutationAdapterKindV1;
  readonly source_identity: string;
  readonly head_sha: string;
  readonly status: ExternalRunnerStatusV1;
  readonly mutation_ref: string;
  readonly attempted_count: number;
  readonly killed_count: number;
  readonly survived_count: number;
  readonly survived_mutants: readonly string[];
  readonly result_digest: string;
  readonly limitations: readonly string[];
}

export interface NormalizedMutationObservationV1 {
  readonly schema_version: typeof MUTATION_ADAPTER_SCHEMA_VERSION;
  readonly scope: "TEST";
  readonly strategy: "OBSERVATION_ONLY";
  readonly authority: "NONE_UNTRUSTED";
  readonly canonical_status: "UNTRUSTED_OBSERVATION";
  readonly adapter_id: string;
  readonly kind: MutationAdapterKindV1;
  readonly source_identity: string;
  readonly head_sha: string;
  readonly source_status: ExternalRunnerStatusV1;
  readonly mutation_ref: string;
  readonly attempted_count: number;
  readonly killed_count: number;
  readonly survived_count: number;
  readonly survived_mutants: readonly string[];
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
  "mutation_ref",
  "attempted_count",
  "killed_count",
  "survived_count",
  "survived_mutants",
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

function requireKind(value: string): MutationAdapterKindV1 {
  if (!MUTATION_ADAPTER_KINDS.includes(value as MutationAdapterKindV1)) {
    throw new TypeError("kind is unsupported");
  }
  return value as MutationAdapterKindV1;
}

function requireStatus(value: string): ExternalRunnerStatusV1 {
  if (!EXTERNAL_RUNNER_STATUSES.includes(value as ExternalRunnerStatusV1)) {
    throw new TypeError("status is unsupported");
  }
  return value as ExternalRunnerStatusV1;
}

function requireCount(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(field + " must be a nonnegative safe integer");
  }
}

function canonicalEntries(values: readonly string[], field: string): readonly string[] {
  for (const value of values) {
    requireText(value, field);
  }
  if (new Set(values).size !== values.length) {
    throw new TypeError(field + " must contain unique entries");
  }
  return [...values].sort();
}

export function normalizeExternalMutationOutputV1(
  input: ExternalMutationOutputV1,
): NormalizedMutationObservationV1 {
  if (input.schema_version !== MUTATION_ADAPTER_SCHEMA_VERSION) {
    throw new TypeError("schema_version is unsupported");
  }
  requireIdentifier(input.adapter_id, "adapter_id");
  const kind = requireKind(input.kind);
  requireIdentifier(input.source_identity, "source_identity");
  if (!SHA_PATTERN.test(input.head_sha)) {
    throw new TypeError("head_sha must be a full lowercase Git object id");
  }
  const status = requireStatus(input.status);
  requireText(input.mutation_ref, "mutation_ref");
  requireCount(input.attempted_count, "attempted_count");
  requireCount(input.killed_count, "killed_count");
  requireCount(input.survived_count, "survived_count");
  if (input.killed_count + input.survived_count > input.attempted_count) {
    throw new TypeError("mutant accounting is incoherent");
  }
  const survivedMutants = canonicalEntries(input.survived_mutants, "survived_mutant");
  if (survivedMutants.length !== input.survived_count) {
    throw new TypeError("survived mutants must be explicitly listed");
  }
  if (!DIGEST_PATTERN.test(input.result_digest)) {
    throw new TypeError("result_digest must be a lowercase SHA-256 digest");
  }
  const limitations = canonicalEntries(input.limitations, "limitation");
  const blockingReasons: string[] = [];
  if (status !== "PASS") {
    blockingReasons.push("external-runner:" + status.toLowerCase());
  }
  if (input.attempted_count === 0) {
    blockingReasons.push("external-runner:no-mutants");
  }
  if (input.survived_count > 0) {
    blockingReasons.push("external-runner:survived-mutants");
  }
  for (const mutant of survivedMutants) {
    blockingReasons.push("external-runner:survived:" + mutant);
  }
  for (const limitation of limitations) {
    blockingReasons.push("external-runner:limitation:" + limitation);
  }
  return Object.freeze({
    schema_version: MUTATION_ADAPTER_SCHEMA_VERSION,
    scope: "TEST" as const,
    strategy: "OBSERVATION_ONLY" as const,
    authority: "NONE_UNTRUSTED" as const,
    canonical_status: "UNTRUSTED_OBSERVATION" as const,
    adapter_id: input.adapter_id,
    kind,
    source_identity: input.source_identity,
    head_sha: input.head_sha,
    source_status: status,
    mutation_ref: input.mutation_ref,
    attempted_count: input.attempted_count,
    killed_count: input.killed_count,
    survived_count: input.survived_count,
    survived_mutants: Object.freeze([...survivedMutants]),
    result_digest: input.result_digest,
    limitations: Object.freeze([...limitations]),
    blocking_reasons: Object.freeze([...new Set(blockingReasons)].sort()),
    plan_visible_fields: Object.freeze([...PLAN_VISIBLE_FIELDS]),
  });
}
