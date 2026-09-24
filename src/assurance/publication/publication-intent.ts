import { createHash } from "node:crypto";

export const PUBLICATION_INTENT_SCHEMA_VERSION = 1 as const;

export const PUBLICATION_TARGET_KINDS = [
  "ISSUE",
  "PULL_REQUEST",
  "COMMENT",
] as const;

export type PublicationTargetKindV1 =
  (typeof PUBLICATION_TARGET_KINDS)[number];

export const ARTIFACT_CLASSIFICATIONS = [
  "PUBLIC",
  "INTERNAL",
  "SENSITIVE",
] as const;

export type ArtifactClassificationV1 =
  (typeof ARTIFACT_CLASSIFICATIONS)[number];

export interface PublicationTargetV1 {
  readonly repository_identity: string;
  readonly kind: PublicationTargetKindV1;
  readonly number: number;
  readonly comment_identity: string | null;
}

export interface RedactionDecisionV1 {
  readonly redacted: boolean;
  readonly redacted_fields: readonly string[];
}

export interface PublicationIntentInputV1 {
  readonly target: PublicationTargetV1;
  readonly source_head: string;
  readonly payload_digest: string;
  readonly classification: ArtifactClassificationV1;
  readonly redaction: RedactionDecisionV1;
  readonly authority_identity: string;
  readonly idempotency_identity: string;
  readonly attempt_identity: string;
  readonly generation_evidence: string;
}

export interface PublicationIntentV1 {
  readonly schema_version: 1;
  readonly intent_identity: string;
  readonly target: PublicationTargetV1;
  readonly source_head: string;
  readonly payload_digest: string;
  readonly classification: ArtifactClassificationV1;
  readonly redaction: RedactionDecisionV1;
  readonly authority_identity: string;
  readonly idempotency_identity: string;
  readonly attempt_identity: string;
  readonly generation_evidence: string;
  readonly effect_performed: false;
}

const SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;

function isValidTarget(target: PublicationTargetV1): boolean {
  if (target.repository_identity.length === 0) {
    return false;
  }
  if (!Number.isInteger(target.number) || target.number <= 0) {
    return false;
  }
  if (target.kind === "COMMENT") {
    return (
      target.comment_identity !== null && target.comment_identity.length > 0
    );
  }
  return target.comment_identity === null;
}

export function buildPublicationIntentV1(
  input: PublicationIntentInputV1,
): PublicationIntentV1 | null {
  if (!isValidTarget(input.target)) {
    return null;
  }
  if (!SHA.test(input.source_head)) {
    return null;
  }
  if (!SHA.test(input.payload_digest)) {
    return null;
  }
  if (!SHA.test(input.authority_identity)) {
    return null;
  }
  if (!SHA.test(input.idempotency_identity)) {
    return null;
  }
  if (!SHA.test(input.attempt_identity)) {
    return null;
  }
  if (input.generation_evidence.length === 0) {
    return null;
  }
  const canonical = JSON.stringify({
    target: input.target,
    source_head: input.source_head,
    payload_digest: input.payload_digest,
    classification: input.classification,
    redaction: input.redaction,
    authority_identity: input.authority_identity,
    idempotency_identity: input.idempotency_identity,
    attempt_identity: input.attempt_identity,
    generation_evidence: input.generation_evidence,
  });
  return {
    schema_version: PUBLICATION_INTENT_SCHEMA_VERSION,
    intent_identity: createHash("sha256").update(canonical, "utf8").digest("hex"),
    target: input.target,
    source_head: input.source_head,
    payload_digest: input.payload_digest,
    classification: input.classification,
    redaction: input.redaction,
    authority_identity: input.authority_identity,
    idempotency_identity: input.idempotency_identity,
    attempt_identity: input.attempt_identity,
    generation_evidence: input.generation_evidence,
    effect_performed: false,
  };
}

export function isEffectPerformedV1(intent: PublicationIntentV1): boolean {
  return intent.effect_performed;
}
