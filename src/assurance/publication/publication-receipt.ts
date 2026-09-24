import { createHash } from "node:crypto";

export const PUBLICATION_RECEIPT_SCHEMA_VERSION = 1 as const;

export const RECEIPT_OUTCOMES = [
  "RECORDED_SUCCESS",
  "RECORDED_FAILURE",
  "UNKNOWN",
] as const;

export type ReceiptOutcomeV1 = (typeof RECEIPT_OUTCOMES)[number];

export const RECONCILIATION_STATES = [
  "SETTLED",
  "RECONCILING",
  "UNRECONCILED",
] as const;

export type ReconciliationStateV1 = (typeof RECONCILIATION_STATES)[number];

export interface PublicationReceiptV1 {
  readonly schema_version: 1;
  readonly receipt_identity: string;
  readonly intent_identity: string;
  readonly effect_identity: string;
  readonly outcome: ReceiptOutcomeV1;
  readonly attempt_identities: readonly string[];
  readonly reconcile_evidence: string | null;
  readonly reconciliation: ReconciliationStateV1;
}

const SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;

export interface ReceiptInputV1 {
  readonly intent_identity: string;
  readonly effect_identity: string;
  readonly outcome: ReceiptOutcomeV1;
  readonly attempt_identity: string;
}

export function recordPublicationReceiptV1(
  input: ReceiptInputV1,
): PublicationReceiptV1 | null {
  if (!SHA.test(input.intent_identity)) {
    return null;
  }
  if (!SHA.test(input.effect_identity)) {
    return null;
  }
  if (!SHA.test(input.attempt_identity)) {
    return null;
  }
  const receiptIdentity = createHash("sha256")
    .update(
      JSON.stringify({
        intent_identity: input.intent_identity,
        effect_identity: input.effect_identity,
        outcome: input.outcome,
        attempt_identity: input.attempt_identity,
      }),
      "utf8",
    )
    .digest("hex");
  return {
    schema_version: PUBLICATION_RECEIPT_SCHEMA_VERSION,
    receipt_identity: receiptIdentity,
    intent_identity: input.intent_identity,
    effect_identity: input.effect_identity,
    outcome: input.outcome,
    attempt_identities: Object.freeze([input.attempt_identity]),
    reconcile_evidence: null,
    reconciliation:
      input.outcome === "UNKNOWN" ? "UNRECONCILED" : "SETTLED",
  };
}

export interface ReceiptReconcileV1 {
  readonly schema_version: 1;
  readonly reconciled: boolean;
  readonly receipt: PublicationReceiptV1 | null;
  readonly reasons: readonly string[];
}

export function reconcilePublicationReceiptV1(
  receipt: PublicationReceiptV1,
  observedOutcome: ReceiptOutcomeV1,
  evidence: string,
): ReceiptReconcileV1 {
  const base = {
    schema_version: PUBLICATION_RECEIPT_SCHEMA_VERSION,
  } as const;
  if (receipt.outcome !== "UNKNOWN") {
    return {
      ...base,
      reconciled: false,
      receipt: null,
      reasons: Object.freeze(["receipt is not unknown; nothing to reconcile"]),
    };
  }
  if (observedOutcome === "UNKNOWN") {
    return {
      ...base,
      reconciled: false,
      receipt: null,
      reasons: Object.freeze(["reconciliation cannot record unknown"]),
    };
  }
  if (evidence.length === 0) {
    return {
      ...base,
      reconciled: false,
      receipt: null,
      reasons: Object.freeze(["reconciliation requires evidence"]),
    };
  }
  return {
    ...base,
    reconciled: true,
    receipt: {
      ...receipt,
      outcome: observedOutcome,
      reconcile_evidence: evidence,
      reconciliation: "SETTLED",
    },
    reasons: Object.freeze([]),
  };
}

export interface ReceiptRetryV1 {
  readonly schema_version: 1;
  readonly permitted: boolean;
  readonly re_execute: boolean;
  readonly reasons: readonly string[];
}

export function retryFromReceiptV1(
  receipt: PublicationReceiptV1,
  attemptIdentity: string,
): ReceiptRetryV1 {
  const base = {
    schema_version: PUBLICATION_RECEIPT_SCHEMA_VERSION,
  } as const;
  if (!SHA.test(attemptIdentity)) {
    return {
      ...base,
      permitted: false,
      re_execute: false,
      reasons: Object.freeze(["attempt identity is invalid"]),
    };
  }
  if (receipt.outcome === "UNKNOWN") {
    return {
      ...base,
      permitted: false,
      re_execute: false,
      reasons: Object.freeze([
        "unknown receipt requires reconciliation before retry",
      ]),
    };
  }
  if (receipt.outcome === "RECORDED_SUCCESS") {
    return {
      ...base,
      permitted: true,
      re_execute: false,
      reasons: Object.freeze(["recorded success replays without re-execution"]),
    };
  }
  return {
    ...base,
    permitted: true,
    re_execute: true,
    reasons: Object.freeze(["recorded failure permits a new attempt"]),
  };
}
