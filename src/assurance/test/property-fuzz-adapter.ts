export const PROPERTY_FUZZ_ADAPTER_SCHEMA_VERSION = 1 as const;
export const PROPERTY_FUZZ_ADAPTER_KINDS = ["property", "fuzz"] as const;
export const EXTERNAL_RUNNER_STATUSES = [
  "PASS",
  "FAIL",
  "ERROR",
  "UNAVAILABLE",
  "NOT_RUN",
] as const;

export type PropertyFuzzAdapterKindV1 =
  (typeof PROPERTY_FUZZ_ADAPTER_KINDS)[number];
export type ExternalRunnerStatusV1 =
  (typeof EXTERNAL_RUNNER_STATUSES)[number];

export interface ExternalPropertyFuzzOutputV1 {
  readonly schema_version: typeof PROPERTY_FUZZ_ADAPTER_SCHEMA_VERSION;
  readonly adapter_id: string;
  readonly kind: PropertyFuzzAdapterKindV1;
  readonly source_identity: string;
  readonly head_sha: string;
  readonly status: ExternalRunnerStatusV1;
  readonly property_ref: string;
  readonly seed_ref: string | null;
  readonly observed_case_count: number;
  readonly result_digest: string;
  readonly counterexamples: readonly string[];
  readonly effect_requirements: readonly string[];
  readonly limitations: readonly string[];
}

export interface NormalizedPropertyFuzzObservationV1 {
  readonly schema_version: typeof PROPERTY_FUZZ_ADAPTER_SCHEMA_VERSION;
  readonly scope: "TEST";
  readonly strategy: "OBSERVATION_ONLY";
  readonly authority: "NONE_UNTRUSTED";
  readonly canonical_status: "UNTRUSTED_OBSERVATION";
  readonly adapter_id: string;
  readonly kind: PropertyFuzzAdapterKindV1;
  readonly source_identity: string;
  readonly head_sha: string;
  readonly source_status: ExternalRunnerStatusV1;
  readonly property_ref: string;
  readonly seed_ref: string | null;
  readonly observed_case_count: number;
  readonly result_digest: string;
  readonly counterexamples: readonly string[];
  readonly effect_requirements: readonly string[];
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
  "property_ref",
  "seed_ref",
  "observed_case_count",
  "result_digest",
  "counterexamples",
  "effect_requirements",
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

function requireKind(value: string): PropertyFuzzAdapterKindV1 {
  if (!PROPERTY_FUZZ_ADAPTER_KINDS.includes(value as PropertyFuzzAdapterKindV1)) {
    throw new TypeError("kind is unsupported");
  }
  return value as PropertyFuzzAdapterKindV1;
}

function requireStatus(value: string): ExternalRunnerStatusV1 {
  if (!EXTERNAL_RUNNER_STATUSES.includes(value as ExternalRunnerStatusV1)) {
    throw new TypeError("status is unsupported");
  }
  return value as ExternalRunnerStatusV1;
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

export function normalizeExternalPropertyFuzzOutputV1(
  input: ExternalPropertyFuzzOutputV1,
): NormalizedPropertyFuzzObservationV1 {
  if (input.schema_version !== PROPERTY_FUZZ_ADAPTER_SCHEMA_VERSION) {
    throw new TypeError("schema_version is unsupported");
  }
  requireIdentifier(input.adapter_id, "adapter_id");
  const kind = requireKind(input.kind);
  requireIdentifier(input.source_identity, "source_identity");
  if (!SHA_PATTERN.test(input.head_sha)) {
    throw new TypeError("head_sha must be a full lowercase Git object id");
  }
  const status = requireStatus(input.status);
  requireText(input.property_ref, "property_ref");
  if (input.seed_ref !== null) {
    requireText(input.seed_ref, "seed_ref");
  }
  if (kind === "fuzz" && input.seed_ref === null) {
    throw new TypeError("fuzz output requires seed_ref");
  }
  if (!Number.isSafeInteger(input.observed_case_count) || input.observed_case_count < 0) {
    throw new TypeError("observed_case_count must be a nonnegative safe integer");
  }
  if (!DIGEST_PATTERN.test(input.result_digest)) {
    throw new TypeError("result_digest must be a lowercase SHA-256 digest");
  }
  const counterexamples = canonicalEntries(input.counterexamples, "counterexample");
  if (status === "FAIL" && counterexamples.length === 0) {
    throw new TypeError("failing property or fuzz output requires explicit counterexamples");
  }
  const effectRequirements = canonicalEntries(input.effect_requirements, "effect_requirement");
  const limitations = canonicalEntries(input.limitations, "limitation");
  const blockingReasons: string[] = [];
  if (status !== "PASS") {
    blockingReasons.push("external-runner:" + status.toLowerCase());
  }
  if (input.observed_case_count === 0) {
    blockingReasons.push("external-runner:no-cases");
  }
  for (const counterexample of counterexamples) {
    blockingReasons.push("external-runner:counterexample:" + counterexample);
  }
  for (const limitation of limitations) {
    blockingReasons.push("external-runner:limitation:" + limitation);
  }
  return Object.freeze({
    schema_version: PROPERTY_FUZZ_ADAPTER_SCHEMA_VERSION,
    scope: "TEST" as const,
    strategy: "OBSERVATION_ONLY" as const,
    authority: "NONE_UNTRUSTED" as const,
    canonical_status: "UNTRUSTED_OBSERVATION" as const,
    adapter_id: input.adapter_id,
    kind,
    source_identity: input.source_identity,
    head_sha: input.head_sha,
    source_status: status,
    property_ref: input.property_ref,
    seed_ref: input.seed_ref,
    observed_case_count: input.observed_case_count,
    result_digest: input.result_digest,
    counterexamples: Object.freeze([...counterexamples]),
    effect_requirements: Object.freeze([...effectRequirements]),
    limitations: Object.freeze([...limitations]),
    blocking_reasons: Object.freeze([...new Set(blockingReasons)].sort()),
    plan_visible_fields: Object.freeze([...PLAN_VISIBLE_FIELDS]),
  });
}
