import type {
  ArtifactClassificationV1,
  RedactionDecisionV1,
} from "./publication-intent.js";

export const REDACTION_GATE_SCHEMA_VERSION = 1 as const;

export interface RedactionGateInputV1 {
  readonly classification: ArtifactClassificationV1;
  readonly redaction: RedactionDecisionV1;
  readonly payload_contains_secrets: boolean;
}

export interface RedactionGateDecisionV1 {
  readonly schema_version: 1;
  readonly permitted: boolean;
  readonly reasons: readonly string[];
}

export function evaluateRedactionGateV1(
  input: RedactionGateInputV1,
): RedactionGateDecisionV1 {
  const base = {
    schema_version: REDACTION_GATE_SCHEMA_VERSION,
  } as const;
  if (input.payload_contains_secrets && !input.redaction.redacted) {
    return {
      ...base,
      permitted: false,
      reasons: Object.freeze([
        "secret-bearing payload requires redaction",
      ]),
    };
  }
  if (input.classification === "SENSITIVE" && !input.redaction.redacted) {
    return {
      ...base,
      permitted: false,
      reasons: Object.freeze([
        "sensitive evidence cannot publish without redaction",
      ]),
    };
  }
  if (
    input.redaction.redacted &&
    input.redaction.redacted_fields.length === 0
  ) {
    return {
      ...base,
      permitted: false,
      reasons: Object.freeze([
        "redaction must name at least one redacted field",
      ]),
    };
  }
  if (input.classification === "SENSITIVE" && input.payload_contains_secrets) {
    return {
      ...base,
      permitted: true,
      reasons: Object.freeze(["sensitive payload redacted before publication"]),
    };
  }
  return {
    ...base,
    permitted: true,
    reasons: Object.freeze([]),
  };
}
