export const REVIEW_PROFILE_SCHEMA_VERSION = 1 as const;

export const REVIEW_SCOPE_KINDS = [
  "diff",
  "pr",
  "workspace",
  "spec",
  "correctness",
] as const;

export type ReviewScopeKindV1 = (typeof REVIEW_SCOPE_KINDS)[number];

export const REVIEW_EXECUTION_LOCATIONS = [
  "LOCAL_ONLY",
  "USER_REMOTE",
  "EXTERNAL_PROVIDER",
] as const;

export type ReviewExecutionLocationV1 =
  (typeof REVIEW_EXECUTION_LOCATIONS)[number];

export const REVIEW_USER_COST_CLASSES = [
  "ZERO",
  "USER_FUNDED_EXPLICIT",
] as const;

export type ReviewUserCostClassV1 = (typeof REVIEW_USER_COST_CLASSES)[number];

export const REVIEW_EGRESS_CLASSES = [
  "NONE",
  "LOOPBACK_ONLY",
  "USER_OWNED_TARGETS",
  "PROVIDER_SPECIFIC",
] as const;

export type ReviewEgressClassV1 = (typeof REVIEW_EGRESS_CLASSES)[number];

export const REVIEW_NETWORK_POLICIES = [
  "DENY_ALL",
  "LOCALHOST_ONLY",
  "USER_OWNED_NETWORK_TARGETS",
  "ALLOWLIST",
  "PROVIDER_SPECIFIC",
  "UNRESTRICTED_EXPLICIT",
] as const;

export type ReviewNetworkPolicyV1 = (typeof REVIEW_NETWORK_POLICIES)[number];

export const REVIEW_ARTIFACT_SENSITIVITIES = [
  "PUBLIC",
  "INTERNAL",
  "SENSITIVE",
] as const;

export type ReviewArtifactSensitivityV1 =
  (typeof REVIEW_ARTIFACT_SENSITIVITIES)[number];

export interface ReviewSupplementaryMetadataV1 {
  readonly execution_location: ReviewExecutionLocationV1;
  readonly operator_cost_class: "ZERO";
  readonly user_cost_class: ReviewUserCostClassV1;
  readonly egress_class: ReviewEgressClassV1;
  readonly network_policy: ReviewNetworkPolicyV1;
  readonly credential_required: boolean;
  readonly hardware_class: string;
  readonly artifact_sensitivity: ReviewArtifactSensitivityV1;
  readonly offline_capable: boolean;
  readonly isolation_required: boolean;
  readonly provider_identity: string | null;
}

export interface ReviewProfileV1 {
  readonly schema_version: 1;
  readonly profile_id: string;
  readonly scope_kind: ReviewScopeKindV1;
  readonly scope_ref: string;
  readonly target_id: string;
  readonly metadata: ReviewSupplementaryMetadataV1;
}

export interface ReviewProfileCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const HARDWARE_CLASS = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;

function isOpaque(value: unknown): value is string {
  return typeof value === "string" && OPAQUE_ID.test(value);
}

export function createReviewProfileV1(input: {
  readonly profile_id: string;
  readonly scope_kind: ReviewScopeKindV1;
  readonly scope_ref: string;
  readonly target_id: string;
  readonly metadata?: Partial<ReviewSupplementaryMetadataV1>;
}): ReviewProfileV1 {
  const metadata: ReviewSupplementaryMetadataV1 = {
    execution_location: "LOCAL_ONLY",
    operator_cost_class: "ZERO",
    user_cost_class: "ZERO",
    egress_class: "NONE",
    network_policy: "DENY_ALL",
    credential_required: false,
    hardware_class: "CPU_ONLY",
    artifact_sensitivity: "INTERNAL",
    offline_capable: false,
    isolation_required: false,
    provider_identity: null,
    ...input.metadata,
  };
  return Object.freeze({
    schema_version: REVIEW_PROFILE_SCHEMA_VERSION,
    profile_id: input.profile_id,
    scope_kind: input.scope_kind,
    scope_ref: input.scope_ref,
    target_id: input.target_id,
    metadata: Object.freeze({ ...metadata }),
  });
}

export function assertReviewProfileV1(
  profile: ReviewProfileV1,
): ReviewProfileCheckV1 {
  const reasons: string[] = [];
  if (profile.schema_version !== REVIEW_PROFILE_SCHEMA_VERSION) {
    reasons.push("schema version mismatch");
  }
  if (!isOpaque(profile.profile_id)) {
    reasons.push("profile id invalid");
  }
  if (
    !(REVIEW_SCOPE_KINDS as readonly string[]).includes(profile.scope_kind)
  ) {
    reasons.push("scope kind invalid");
  }
  if (!isOpaque(profile.scope_ref)) {
    reasons.push("scope ref invalid");
  }
  if (!isOpaque(profile.target_id)) {
    reasons.push("target id invalid");
  }
  const metadata = profile.metadata;
  if (
    !(REVIEW_EXECUTION_LOCATIONS as readonly string[]).includes(
      metadata.execution_location,
    )
  ) {
    reasons.push("execution location invalid");
  }
  if (metadata.operator_cost_class !== "ZERO") {
    reasons.push("operator cost must be ZERO");
  }
  if (
    !(REVIEW_USER_COST_CLASSES as readonly string[]).includes(
      metadata.user_cost_class,
    )
  ) {
    reasons.push("user cost class invalid");
  }
  if (
    !(REVIEW_EGRESS_CLASSES as readonly string[]).includes(metadata.egress_class)
  ) {
    reasons.push("egress class invalid");
  }
  if (
    !(REVIEW_NETWORK_POLICIES as readonly string[]).includes(
      metadata.network_policy,
    )
  ) {
    reasons.push("network policy invalid");
  }
  if (!HARDWARE_CLASS.test(metadata.hardware_class)) {
    reasons.push("hardware class invalid");
  }
  if (
    !(REVIEW_ARTIFACT_SENSITIVITIES as readonly string[]).includes(
      metadata.artifact_sensitivity,
    )
  ) {
    reasons.push("artifact sensitivity invalid");
  }
  if (
    metadata.execution_location !== "LOCAL_ONLY" &&
    metadata.provider_identity === null &&
    metadata.egress_class === "PROVIDER_SPECIFIC"
  ) {
    reasons.push("provider egress without provider identity");
  }
  if (
    metadata.network_policy === "DENY_ALL" &&
    metadata.egress_class !== "NONE"
  ) {
    reasons.push("deny-all network with non-none egress");
  }
  if (
    metadata.network_policy === "LOCALHOST_ONLY" &&
    metadata.egress_class !== "NONE" &&
    metadata.egress_class !== "LOOPBACK_ONLY"
  ) {
    reasons.push("localhost-only network with non-loopback egress");
  }
  if (
    metadata.execution_location === "EXTERNAL_PROVIDER" &&
    (metadata.provider_identity === null ||
      metadata.user_cost_class !== "USER_FUNDED_EXPLICIT")
  ) {
    reasons.push("external provider without explicit funded identity");
  }
  if (
    metadata.provider_identity !== null &&
    !isOpaque(metadata.provider_identity)
  ) {
    reasons.push("provider identity invalid");
  }
  return { ok: reasons.length === 0, reasons };
}
