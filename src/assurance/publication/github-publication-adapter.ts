import { createHash } from "node:crypto";

import type {
  PublicationIntentV1,
  PublicationTargetV1,
} from "./publication-intent.js";
import type { WorkflowFreshnessStateV1 } from "../workflow/kodac-capability-characterization.js";

export const PUBLICATION_ADAPTER_SCHEMA_VERSION = 1 as const;

export interface PublicationAuthorizationV1 {
  readonly authority_identity: string;
  readonly network_permitted: boolean;
  readonly provider_permitted: boolean;
  readonly egress_permitted: boolean;
}

export interface EffectDescriptorV1 {
  readonly schema_version: 1;
  readonly effect_identity: string;
  readonly intent_identity: string;
  readonly target: PublicationTargetV1;
  readonly source_head: string;
  readonly payload_digest: string;
  readonly idempotency_identity: string;
  readonly attempt_identity: string;
  readonly network_call_made: false;
}

export interface AdapterDecisionV1 {
  readonly schema_version: 1;
  readonly accepted: boolean;
  readonly descriptor: EffectDescriptorV1 | null;
  readonly reasons: readonly string[];
}

const SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;

export function validatePublicationRequestV1(
  intent: PublicationIntentV1,
  redactionPermitted: boolean,
  freshness: WorkflowFreshnessStateV1,
  authorization: PublicationAuthorizationV1,
): AdapterDecisionV1 {
  const base = {
    schema_version: PUBLICATION_ADAPTER_SCHEMA_VERSION,
  } as const;
  if (intent.effect_performed) {
    return {
      ...base,
      accepted: false,
      descriptor: null,
      reasons: Object.freeze(["intent must not carry a performed effect"]),
    };
  }
  if (!redactionPermitted) {
    return {
      ...base,
      accepted: false,
      descriptor: null,
      reasons: Object.freeze(["redaction gate refused publication"]),
    };
  }
  if (freshness !== "CURRENT") {
    return {
      ...base,
      accepted: false,
      descriptor: null,
      reasons: Object.freeze(["stale or unknown evidence cannot publish"]),
    };
  }
  if (intent.authority_identity !== authorization.authority_identity) {
    return {
      ...base,
      accepted: false,
      descriptor: null,
      reasons: Object.freeze(["authority identity does not match intent"]),
    };
  }
  if (
    !authorization.network_permitted ||
    !authorization.provider_permitted ||
    !authorization.egress_permitted
  ) {
    return {
      ...base,
      accepted: false,
      descriptor: null,
      reasons: Object.freeze(["explicit effect authority is incomplete"]),
    };
  }
  if (!SHA.test(intent.authority_identity)) {
    return {
      ...base,
      accepted: false,
      descriptor: null,
      reasons: Object.freeze(["authority identity is malformed"]),
    };
  }
  const effectIdentity = createHash("sha256")
    .update(
      JSON.stringify({
        intent_identity: intent.intent_identity,
        target: intent.target,
        source_head: intent.source_head,
        payload_digest: intent.payload_digest,
        idempotency_identity: intent.idempotency_identity,
        attempt_identity: intent.attempt_identity,
      }),
      "utf8",
    )
    .digest("hex");
  return {
    ...base,
    accepted: true,
    descriptor: {
      schema_version: PUBLICATION_ADAPTER_SCHEMA_VERSION,
      effect_identity: effectIdentity,
      intent_identity: intent.intent_identity,
      target: intent.target,
      source_head: intent.source_head,
      payload_digest: intent.payload_digest,
      idempotency_identity: intent.idempotency_identity,
      attempt_identity: intent.attempt_identity,
      network_call_made: false,
    },
    reasons: Object.freeze([]),
  };
}
