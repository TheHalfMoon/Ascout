import type { RawReviewObservationV1 } from "./raw-observation.js";

export const LOCATION_VALIDATOR_SCHEMA_VERSION = 1 as const;

export const LOCATION_STATES = [
  "VALID",
  "NO_LOCATION",
  "STALE_HEAD",
  "HALLUCINATED_PATH",
  "LINE_OUT_OF_RANGE",
  "LINES_UNVERIFIED",
] as const;

export type LocationStateV1 = (typeof LOCATION_STATES)[number];

export interface LocationValidationContextV1 {
  readonly expected_head_sha: string;
  readonly known_files: readonly string[];
  readonly file_line_counts: Readonly<Record<string, number>> | null;
}

export interface LocationValidationV1 {
  readonly schema_version: 1;
  readonly observation_id: string;
  readonly state: LocationStateV1;
  readonly reasons: readonly string[];
}

const GIT_SHA_HEX = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;

export function validateObservationLocationV1(
  observation: RawReviewObservationV1,
  context: LocationValidationContextV1,
): LocationValidationV1 {
  const base = {
    schema_version: LOCATION_VALIDATOR_SCHEMA_VERSION,
    observation_id: observation.observation_id,
  } as const;
  if (!GIT_SHA_HEX.test(context.expected_head_sha)) {
    return {
      ...base,
      state: "STALE_HEAD",
      reasons: Object.freeze(["expected head invalid"]),
    };
  }
  const location = observation.location_hint;
  if (location === null) {
    return {
      ...base,
      state: "NO_LOCATION",
      reasons: Object.freeze(["observation carries no location"]),
    };
  }
  if (observation.execution_binding.head_sha !== context.expected_head_sha) {
    return {
      ...base,
      state: "STALE_HEAD",
      reasons: Object.freeze(["observation head is not the expected head"]),
    };
  }
  if (!context.known_files.includes(location.path)) {
    return {
      ...base,
      state: "HALLUCINATED_PATH",
      reasons: Object.freeze(["path not in known file inventory"]),
    };
  }
  if (context.file_line_counts === null) {
    if (location.start_line === null && location.end_line === null) {
      return { ...base, state: "VALID", reasons: Object.freeze([]) };
    }
    return {
      ...base,
      state: "LINES_UNVERIFIED",
      reasons: Object.freeze(["line counts unavailable for range check"]),
    };
  }
  const line_count = context.file_line_counts[location.path];
  if (
    line_count === undefined ||
    !Number.isInteger(line_count) ||
    line_count < 0
  ) {
    return {
      ...base,
      state: "LINES_UNVERIFIED",
      reasons: Object.freeze(["no line count for known path"]),
    };
  }
  if (
    (location.start_line !== null && location.start_line > line_count) ||
    (location.end_line !== null && location.end_line > line_count)
  ) {
    return {
      ...base,
      state: "LINE_OUT_OF_RANGE",
      reasons: Object.freeze(["line exceeds known file length"]),
    };
  }
  return { ...base, state: "VALID", reasons: Object.freeze([]) };
}

export function isPromotableLocationV1(
  validation: LocationValidationV1,
): boolean {
  return validation.state === "VALID";
}
