import {
  accountReviewDiagnosticsV1,
  type DiagnosticAccountingV1,
  type DiagnosticBatchInputV1,
} from "./diagnostic-accounting.js";
import type { ReviewCoverageV1 } from "./coverage-accounting.js";
import {
  LOCATION_STATES,
  type LocationStateV1,
  type LocationValidationV1,
} from "./location-validator.js";
import {
  assertRawReviewObservationV1,
  type RawReviewObservationV1,
} from "./raw-observation.js";

export const FINDING_NORMALIZATION_SCHEMA_VERSION = 1 as const;

export interface NormalizedProvenanceV1 {
  readonly producer_class: string;
  readonly rule_id: string | null;
  readonly engine_id: string;
  readonly binary_name: string;
  readonly observed_version: string;
  readonly profile_id: string;
  readonly capsule_id: string;
  readonly head_sha: string;
}

export interface NormalizedReviewRecordV1 {
  readonly schema_version: 1;
  readonly record_id: string;
  readonly observation: RawReviewObservationV1;
  readonly location_state: LocationStateV1;
  readonly location_reasons: readonly string[];
  readonly promotable: boolean;
  readonly provenance: NormalizedProvenanceV1;
}

export interface FindingNormalizationCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

export function assertNormalizableReviewV1(
  observation: RawReviewObservationV1,
  validation: LocationValidationV1,
): FindingNormalizationCheckV1 {
  const reasons: string[] = [];
  const observationCheck = assertRawReviewObservationV1(observation);
  if (!observationCheck.ok) {
    reasons.push(
      "observation shape invalid: " + observationCheck.reasons.join("; "),
    );
  }
  if (!(LOCATION_STATES as readonly string[]).includes(validation.state)) {
    reasons.push("location state invalid");
  }
  if (validation.observation_id !== observation.observation_id) {
    reasons.push("location validation bound to a different observation");
  }
  if (!Array.isArray(validation.reasons)) {
    reasons.push("location reasons not a list");
  }
  return { ok: reasons.length === 0, reasons };
}

export function normalizeReviewFindingV1(
  observation: RawReviewObservationV1,
  validation: LocationValidationV1,
): NormalizedReviewRecordV1 {
  const check = assertNormalizableReviewV1(observation, validation);
  if (!check.ok) {
    throw new TypeError(
      "invalid finding normalization input: " + check.reasons.join("; "),
    );
  }
  const binding = observation.execution_binding;
  return Object.freeze({
    schema_version: FINDING_NORMALIZATION_SCHEMA_VERSION,
    record_id: observation.observation_id,
    observation: Object.freeze({
      ...observation,
      location_hint:
        observation.location_hint === null
          ? null
          : Object.freeze({ ...observation.location_hint }),
      execution_binding: Object.freeze({ ...binding }),
    }),
    location_state: validation.state,
    location_reasons: Object.freeze([...validation.reasons]),
    promotable: validation.state === "VALID",
    provenance: Object.freeze({
      producer_class: observation.producer_class,
      rule_id: observation.rule_id,
      engine_id: binding.engine_id,
      binary_name: binding.binary_name,
      observed_version: binding.observed_version,
      profile_id: binding.profile_id,
      capsule_id: binding.capsule_id,
      head_sha: binding.head_sha,
    }),
  });
}

export function normalizeReviewBatchV1(
  entries: readonly {
    readonly observation: RawReviewObservationV1;
    readonly validation: LocationValidationV1;
  }[],
): readonly NormalizedReviewRecordV1[] {
  return Object.freeze(
    entries.map((entry) =>
      normalizeReviewFindingV1(entry.observation, entry.validation),
    ),
  );
}

/** Additive loss accounting; the existing batch-return contract is unchanged. */
export function normalizeReviewBatchWithAccountingV1(input: DiagnosticBatchInputV1): {
  readonly records: readonly NormalizedReviewRecordV1[];
  readonly coverage: ReviewCoverageV1;
  readonly accounting: DiagnosticAccountingV1;
} {
  const prepared = accountReviewDiagnosticsV1(input);
  return Object.freeze({
    records: normalizeReviewBatchV1(prepared.entries),
    coverage: prepared.coverage,
    accounting: prepared.accounting,
  });
}
