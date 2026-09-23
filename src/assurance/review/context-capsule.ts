export const CONTEXT_CAPSULE_SCHEMA_VERSION = 1 as const;
export const MAX_CAPSULE_BYTES = 524288 as const;
export const MAX_CAPSULE_SECTIONS = 64 as const;

export const CONTEXT_SECTION_KINDS = [
  "source",
  "spec",
  "test",
  "architecture",
] as const;

export type ContextSectionKindV1 = (typeof CONTEXT_SECTION_KINDS)[number];

export interface ContextSectionV1 {
  readonly kind: ContextSectionKindV1;
  readonly ref: string;
  readonly digest_sha256: string;
  readonly byte_size: number;
  readonly truncated: boolean;
  readonly truncated_from_bytes: number | null;
}

export interface ContextProvenanceV1 {
  readonly source_identity: string;
  readonly collector_identity: string;
  readonly head_sha: string;
}

export interface ReviewContextCapsuleV1 {
  readonly schema_version: 1;
  readonly capsule_id: string;
  readonly profile_id: string;
  readonly target_id: string;
  readonly sections: readonly ContextSectionV1[];
  readonly total_bytes: number;
  readonly provenance: ContextProvenanceV1;
}

export interface ContextCapsuleCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const GIT_SHA_HEX = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;

function isOpaque(value: unknown): value is string {
  return typeof value === "string" && OPAQUE_ID.test(value);
}

export function createReviewContextCapsuleV1(input: {
  readonly capsule_id: string;
  readonly profile_id: string;
  readonly target_id: string;
  readonly sections: readonly ContextSectionV1[];
  readonly provenance: ContextProvenanceV1;
}): ReviewContextCapsuleV1 {
  const total_bytes = input.sections.reduce(
    (sum, section) => sum + section.byte_size,
    0,
  );
  return Object.freeze({
    schema_version: CONTEXT_CAPSULE_SCHEMA_VERSION,
    capsule_id: input.capsule_id,
    profile_id: input.profile_id,
    target_id: input.target_id,
    sections: Object.freeze([...input.sections]),
    total_bytes,
    provenance: Object.freeze({ ...input.provenance }),
  });
}

export function assertReviewContextCapsuleV1(
  capsule: ReviewContextCapsuleV1,
): ContextCapsuleCheckV1 {
  const reasons: string[] = [];
  if (capsule.schema_version !== CONTEXT_CAPSULE_SCHEMA_VERSION) {
    reasons.push("schema version mismatch");
  }
  if (!isOpaque(capsule.capsule_id)) {
    reasons.push("capsule id invalid");
  }
  if (!isOpaque(capsule.profile_id)) {
    reasons.push("profile id invalid");
  }
  if (!isOpaque(capsule.target_id)) {
    reasons.push("target id invalid");
  }
  if (!Array.isArray(capsule.sections)) {
    reasons.push("sections not a list");
    return { ok: false, reasons };
  }
  if (capsule.sections.length === 0) {
    reasons.push("sections empty");
  }
  if (capsule.sections.length > MAX_CAPSULE_SECTIONS) {
    reasons.push("too many sections");
  }
  let accounted = 0;
  for (const section of capsule.sections) {
    if (
      !(CONTEXT_SECTION_KINDS as readonly string[]).includes(section.kind)
    ) {
      reasons.push("section kind invalid");
    }
    if (!isOpaque(section.ref)) {
      reasons.push("section ref invalid");
    }
    if (!SHA256_HEX.test(section.digest_sha256)) {
      reasons.push("section digest invalid");
    }
    if (
      !Number.isInteger(section.byte_size) ||
      section.byte_size < 0
    ) {
      reasons.push("section byte size unbounded");
    }
    if (section.truncated) {
      if (
        section.truncated_from_bytes === null ||
        !Number.isInteger(section.truncated_from_bytes) ||
        section.truncated_from_bytes <= section.byte_size
      ) {
        reasons.push("truncation without explicit source size");
      }
    } else if (section.truncated_from_bytes !== null) {
      reasons.push("untruncated section carries truncation size");
    }
    accounted +=
      Number.isInteger(section.byte_size) && section.byte_size >= 0
        ? section.byte_size
        : 0;
  }
  if (accounted !== capsule.total_bytes) {
    reasons.push("total bytes mismatch");
  }
  if (capsule.total_bytes > MAX_CAPSULE_BYTES) {
    reasons.push("capsule oversize");
  }
  const provenance = capsule.provenance;
  if (!isOpaque(provenance.source_identity)) {
    reasons.push("source identity invalid");
  }
  if (!isOpaque(provenance.collector_identity)) {
    reasons.push("collector identity invalid");
  }
  if (!GIT_SHA_HEX.test(provenance.head_sha)) {
    reasons.push("head sha invalid");
  }
  return { ok: reasons.length === 0, reasons };
}
