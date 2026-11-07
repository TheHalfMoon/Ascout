/**
 * Whether a review provider may run, decided before any provider is contacted.
 *
 * Fail closed: no configured provider is NOT_RUN, and every provider the founder has not
 * authorized, that costs money, or that sends source off this machine is BLOCKED. A provider
 * that may run is only ever advisory. AI review never counts as human R1, and it can claim
 * model independence only when its model family differs from the author's. The existing
 * independence policy accepts a different context alone; this decision does not.
 */
import { assertReviewProfileV1, createReviewProfileV1, type ReviewSupplementaryMetadataV1 } from "./review-profile.js";

export const REVIEW_PROVIDER_DECISION_SCHEMA_VERSION = 1 as const;

export interface ReviewProviderCandidateV1 {
  readonly provider_identity: string;
  readonly model_family: string;
  readonly metadata: Omit<ReviewSupplementaryMetadataV1, "provider_identity" | "operator_cost_class">;
  /** True only from an explicit founder authorization, never from configuration a repository can supply. */
  readonly authorized_by_founder: boolean;
}

export interface ReviewProviderPolicyV1 {
  /** The model family that wrote the change under review. */
  readonly author_model_family: string;
  /** Paid inference. Not authorized today. */
  readonly allow_paid: false;
  /** Sending source off this machine. Not authorized today. */
  readonly allow_source_egress: false;
}

export const REVIEW_PROVIDER_STATES = ["RUNNABLE_ADVISORY", "NOT_RUN", "BLOCKED"] as const;
export type ReviewProviderStateV1 = (typeof REVIEW_PROVIDER_STATES)[number];

export interface ReviewProviderDecisionV1 {
  readonly schema_version: typeof REVIEW_PROVIDER_DECISION_SCHEMA_VERSION;
  readonly state: ReviewProviderStateV1;
  readonly reason_codes: readonly string[];
  readonly provider_identity: string | null;
  /** INDEPENDENT_MODEL only for a different model family; never a human review. */
  readonly independence: "INDEPENDENT_MODEL" | "SAME_MODEL_FAMILY" | "NOT_APPLICABLE";
  readonly satisfies_human_r1: false;
}

const MODEL_FAMILY = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
const LOCAL_EGRESS: ReadonlySet<string> = new Set(["NONE", "LOOPBACK_ONLY"]);

function decision(
  state: ReviewProviderStateV1,
  reasonCodes: readonly string[],
  providerIdentity: string | null,
  independence: ReviewProviderDecisionV1["independence"],
): ReviewProviderDecisionV1 {
  return Object.freeze({
    schema_version: REVIEW_PROVIDER_DECISION_SCHEMA_VERSION,
    state,
    reason_codes: Object.freeze([...reasonCodes]),
    provider_identity: providerIdentity,
    independence,
    satisfies_human_r1: false,
  });
}

export function decideReviewProviderV1(
  candidate: ReviewProviderCandidateV1 | null,
  policy: ReviewProviderPolicyV1,
): ReviewProviderDecisionV1 {
  if (candidate === null) return decision("NOT_RUN", ["NO_PROVIDER_CONFIGURED"], null, "NOT_APPLICABLE");

  const profile = createReviewProfileV1({
    profile_id: "profile:review-provider-decision",
    scope_kind: "diff",
    scope_ref: "scope:working-tree",
    target_id: "target:working-tree",
    metadata: { ...candidate.metadata, provider_identity: candidate.provider_identity },
  });
  const shape = assertReviewProfileV1(profile);
  if (!shape.ok || !MODEL_FAMILY.test(candidate.model_family) || !MODEL_FAMILY.test(policy.author_model_family)) {
    return decision("BLOCKED", ["INVALID_PROVIDER_DESCRIPTION"], null, "NOT_APPLICABLE");
  }

  // Every applicable refusal is reported, so the caller sees all that would need authorizing.
  const reasons: string[] = [];
  if (candidate.authorized_by_founder !== true) reasons.push("PROVIDER_NOT_AUTHORIZED");
  if (candidate.metadata.user_cost_class !== "ZERO" && !policy.allow_paid) reasons.push("PAID_PROVIDER_NOT_AUTHORIZED");
  const sendsSource =
    candidate.metadata.execution_location !== "LOCAL_ONLY" || !LOCAL_EGRESS.has(candidate.metadata.egress_class);
  if (sendsSource && !policy.allow_source_egress) reasons.push("SOURCE_EGRESS_NOT_AUTHORIZED");
  if (candidate.metadata.credential_required) reasons.push("CREDENTIAL_REQUIRED");

  const independence = candidate.model_family === policy.author_model_family ? "SAME_MODEL_FAMILY" : "INDEPENDENT_MODEL";
  if (reasons.length > 0) return decision("BLOCKED", reasons, profile.metadata.provider_identity, independence);
  return decision(
    "RUNNABLE_ADVISORY",
    independence === "SAME_MODEL_FAMILY" ? ["ADVISORY_SAME_MODEL_FAMILY"] : ["ADVISORY_ONLY"],
    profile.metadata.provider_identity,
    independence,
  );
}

/** The policy in force today: no paid inference and no source egress have been authorized. */
export function currentReviewProviderPolicyV1(authorModelFamily: string): ReviewProviderPolicyV1 {
  return Object.freeze({ author_model_family: authorModelFamily, allow_paid: false, allow_source_egress: false });
}
