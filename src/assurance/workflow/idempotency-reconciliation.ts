export const IDEMPOTENCY_SCHEMA_VERSION = 1 as const;

export const EFFECT_OUTCOMES = [
  "UNKNOWN",
  "SUCCEEDED",
  "FAILED",
] as const;

export type EffectOutcomeV1 = (typeof EFFECT_OUTCOMES)[number];

export interface IdempotencyRecordV1 {
  readonly schema_version: 1;
  readonly idempotency_identity: string;
  readonly recorded_outcome: EffectOutcomeV1;
  readonly attempt_identities: readonly string[];
  readonly reconciled: boolean;
  readonly reconcile_evidence: string | null;
}

export interface RetryDecisionV1 {
  readonly schema_version: 1;
  readonly permitted: boolean;
  readonly re_execute: boolean;
  readonly duplicate: boolean;
  readonly reasons: readonly string[];
}

const HEX64 = /^[a-f0-9]{64}$/u;

export function buildIdempotencyRecordV1(
  idempotencyIdentity: string,
  attemptIdentity: string,
  outcome: EffectOutcomeV1,
): IdempotencyRecordV1 | null {
  if (!HEX64.test(idempotencyIdentity)) {
    return null;
  }
  if (!HEX64.test(attemptIdentity)) {
    return null;
  }
  return {
    schema_version: IDEMPOTENCY_SCHEMA_VERSION,
    idempotency_identity: idempotencyIdentity,
    recorded_outcome: outcome,
    attempt_identities: Object.freeze([attemptIdentity]),
    reconciled: outcome !== "UNKNOWN",
    reconcile_evidence: null,
  };
}

export function requestRetryV1(
  record: IdempotencyRecordV1,
  attemptIdentity: string,
): RetryDecisionV1 {
  const base = {
    schema_version: IDEMPOTENCY_SCHEMA_VERSION,
  } as const;
  if (!HEX64.test(attemptIdentity)) {
    return {
      ...base,
      permitted: false,
      re_execute: false,
      duplicate: false,
      reasons: Object.freeze(["attempt identity is invalid"]),
    };
  }
  if (record.recorded_outcome === "UNKNOWN") {
    return {
      ...base,
      permitted: false,
      re_execute: false,
      duplicate: false,
      reasons: Object.freeze([
        "unknown outcome requires reconciliation before retry",
      ]),
    };
  }
  if (record.recorded_outcome === "SUCCEEDED") {
    return {
      ...base,
      permitted: true,
      re_execute: false,
      duplicate: true,
      reasons: Object.freeze([
        "effect already recorded; replay without re-execution",
      ]),
    };
  }
  return {
    ...base,
    permitted: true,
    re_execute: true,
    duplicate: false,
    reasons: Object.freeze(["recorded failure permits a new attempt"]),
  };
}

export interface ReconcileDecisionV1 {
  readonly schema_version: 1;
  readonly reconciled: boolean;
  readonly record: IdempotencyRecordV1 | null;
  readonly reasons: readonly string[];
}

export function reconcileUnknownV1(
  record: IdempotencyRecordV1,
  observedOutcome: EffectOutcomeV1,
  evidence: string,
): ReconcileDecisionV1 {
  const base = {
    schema_version: IDEMPOTENCY_SCHEMA_VERSION,
  } as const;
  if (record.recorded_outcome !== "UNKNOWN") {
    return {
      ...base,
      reconciled: false,
      record: null,
      reasons: Object.freeze(["record is not unknown; nothing to reconcile"]),
    };
  }
  if (observedOutcome === "UNKNOWN") {
    return {
      ...base,
      reconciled: false,
      record: null,
      reasons: Object.freeze(["reconciliation cannot record unknown"]),
    };
  }
  if (evidence.length === 0) {
    return {
      ...base,
      reconciled: false,
      record: null,
      reasons: Object.freeze(["reconciliation requires evidence"]),
    };
  }
  return {
    ...base,
    reconciled: true,
    record: {
      ...record,
      recorded_outcome: observedOutcome,
      reconciled: true,
      reconcile_evidence: evidence,
    },
    reasons: Object.freeze([]),
  };
}
