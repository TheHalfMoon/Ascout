export const PERFORMANCE_RECOVERY_ADAPTER_SCHEMA_VERSION = 1 as const;
export const PERFORMANCE_RECOVERY_ADAPTER_KINDS = [
  "performance",
  "recovery",
] as const;
export const EXTERNAL_RUNNER_STATUSES = [
  "PASS",
  "FAIL",
  "ERROR",
  "UNAVAILABLE",
  "NOT_RUN",
] as const;

export type PerformanceRecoveryAdapterKindV1 =
  (typeof PERFORMANCE_RECOVERY_ADAPTER_KINDS)[number];
export type ExternalRunnerStatusV1 =
  (typeof EXTERNAL_RUNNER_STATUSES)[number];

export interface ExternalPerformanceRecoveryOutputV1 {
  readonly schema_version: typeof PERFORMANCE_RECOVERY_ADAPTER_SCHEMA_VERSION;
  readonly adapter_id: string;
  readonly kind: PerformanceRecoveryAdapterKindV1;
  readonly source_identity: string;
  readonly head_sha: string;
  readonly status: ExternalRunnerStatusV1;
  readonly suite_ref: string;
  readonly metric_ref: string | null;
  readonly recovery_ref: string | null;
  readonly observed_case_count: number;
  readonly budget_ms: number;
  readonly elapsed_ms: number;
  readonly omitted_classes: readonly string[];
  readonly result_digest: string;
  readonly limitations: readonly string[];
}

export interface NormalizedPerformanceRecoveryObservationV1 {
  readonly schema_version: typeof PERFORMANCE_RECOVERY_ADAPTER_SCHEMA_VERSION;
  readonly scope: "TEST";
  readonly strategy: "OBSERVATION_ONLY";
  readonly authority: "NONE_UNTRUSTED";
  readonly canonical_status: "UNTRUSTED_OBSERVATION";
  readonly adapter_id: string;
  readonly kind: PerformanceRecoveryAdapterKindV1;
  readonly source_identity: string;
  readonly head_sha: string;
  readonly source_status: ExternalRunnerStatusV1;
  readonly suite_ref: string;
  readonly metric_ref: string | null;
  readonly recovery_ref: string | null;
  readonly observed_case_count: number;
  readonly budget_ms: number;
  readonly elapsed_ms: number;
  readonly omitted_classes: readonly string[];
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
  "suite_ref",
  "metric_ref",
  "recovery_ref",
  "observed_case_count",
  "budget_ms",
  "elapsed_ms",
  "omitted_classes",
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

function requireKind(value: string): PerformanceRecoveryAdapterKindV1 {
  if (
    !PERFORMANCE_RECOVERY_ADAPTER_KINDS.includes(
      value as PerformanceRecoveryAdapterKindV1,
    )
  ) {
    throw new TypeError("kind is unsupported");
  }
  return value as PerformanceRecoveryAdapterKindV1;
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

export function normalizeExternalPerformanceRecoveryOutputV1(
  input: ExternalPerformanceRecoveryOutputV1,
): NormalizedPerformanceRecoveryObservationV1 {
  if (input.schema_version !== PERFORMANCE_RECOVERY_ADAPTER_SCHEMA_VERSION) {
    throw new TypeError("schema_version is unsupported");
  }
  requireIdentifier(input.adapter_id, "adapter_id");
  const kind = requireKind(input.kind);
  requireIdentifier(input.source_identity, "source_identity");
  if (!SHA_PATTERN.test(input.head_sha)) {
    throw new TypeError("head_sha must be a full lowercase Git object id");
  }
  const status = requireStatus(input.status);
  requireText(input.suite_ref, "suite_ref");
  if (input.metric_ref !== null) {
    requireText(input.metric_ref, "metric_ref");
  }
  if (input.recovery_ref !== null) {
    requireText(input.recovery_ref, "recovery_ref");
  }
  if (kind === "performance" && input.metric_ref === null) {
    throw new TypeError("performance output requires metric_ref");
  }
  if (kind === "recovery" && input.recovery_ref === null) {
    throw new TypeError("recovery output requires recovery_ref");
  }
  requireCount(input.observed_case_count, "observed_case_count");
  requireCount(input.budget_ms, "budget_ms");
  requireCount(input.elapsed_ms, "elapsed_ms");
  const omittedClasses = canonicalEntries(input.omitted_classes, "omitted_class");
  if (!DIGEST_PATTERN.test(input.result_digest)) {
    throw new TypeError("result_digest must be a lowercase SHA-256 digest");
  }
  const limitations = canonicalEntries(input.limitations, "limitation");
  const blockingReasons: string[] = [];
  if (status !== "PASS") {
    blockingReasons.push("external-runner:" + status.toLowerCase());
  }
  if (input.observed_case_count === 0) {
    blockingReasons.push("external-runner:no-cases");
  }
  if (input.elapsed_ms > input.budget_ms) {
    blockingReasons.push("external-runner:budget-exceeded");
  }
  for (const omitted of omittedClasses) {
    blockingReasons.push("external-runner:omitted:" + omitted);
  }
  for (const limitation of limitations) {
    blockingReasons.push("external-runner:limitation:" + limitation);
  }
  return Object.freeze({
    schema_version: PERFORMANCE_RECOVERY_ADAPTER_SCHEMA_VERSION,
    scope: "TEST" as const,
    strategy: "OBSERVATION_ONLY" as const,
    authority: "NONE_UNTRUSTED" as const,
    canonical_status: "UNTRUSTED_OBSERVATION" as const,
    adapter_id: input.adapter_id,
    kind,
    source_identity: input.source_identity,
    head_sha: input.head_sha,
    source_status: status,
    suite_ref: input.suite_ref,
    metric_ref: input.metric_ref,
    recovery_ref: input.recovery_ref,
    observed_case_count: input.observed_case_count,
    budget_ms: input.budget_ms,
    elapsed_ms: input.elapsed_ms,
    omitted_classes: Object.freeze([...omittedClasses]),
    result_digest: input.result_digest,
    limitations: Object.freeze([...limitations]),
    blocking_reasons: Object.freeze([...new Set(blockingReasons)].sort()),
    plan_visible_fields: Object.freeze([...PLAN_VISIBLE_FIELDS]),
  });
}
