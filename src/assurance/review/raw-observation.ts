export const RAW_OBSERVATION_SCHEMA_VERSION = 1 as const;
export const MAX_OBSERVATION_BODY_CHARS = 16384 as const;
export const MAX_OBSERVATION_LINE = 10000000 as const;

export const OBSERVATION_PRODUCER_CLASSES = [
  "MODEL",
  "RULE",
  "MIXED",
  "UNKNOWN",
] as const;

export type ObservationProducerClassV1 =
  (typeof OBSERVATION_PRODUCER_CLASSES)[number];

export const OBSERVATION_SEVERITY_HINTS = [
  "info",
  "minor",
  "major",
  "critical",
  "unknown",
] as const;

export type ObservationSeverityHintV1 =
  (typeof OBSERVATION_SEVERITY_HINTS)[number];

export interface ObservationLocationHintV1 {
  readonly path: string;
  readonly start_line: number | null;
  readonly end_line: number | null;
}

export interface ObservationExecutionBindingV1 {
  readonly engine_id: string;
  readonly binary_name: string;
  readonly observed_version: string;
  readonly profile_id: string;
  readonly capsule_id: string;
  readonly head_sha: string;
}

export interface RawReviewObservationV1 {
  readonly schema_version: 1;
  readonly authority: "NONE_UNTRUSTED";
  readonly observation_id: string;
  readonly producer_class: ObservationProducerClassV1;
  readonly severity_hint: ObservationSeverityHintV1;
  readonly category_hint: string;
  readonly body: string;
  readonly location_hint: ObservationLocationHintV1 | null;
  readonly rule_id: string | null;
  readonly confidence: number | null;
  readonly execution_binding: ObservationExecutionBindingV1;
}

export interface RawObservationCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const GIT_SHA_HEX = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const SAFE_RELATIVE_PATH =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?!.+\/[.]{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u;
const CATEGORY_HINT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;

function isOpaque(value: unknown): value is string {
  return typeof value === "string" && OPAQUE_ID.test(value);
}

function validLine(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_OBSERVATION_LINE
  );
}

export function assertRawReviewObservationV1(
  observation: RawReviewObservationV1,
): RawObservationCheckV1 {
  const reasons: string[] = [];
  if (observation.schema_version !== RAW_OBSERVATION_SCHEMA_VERSION) {
    reasons.push("schema version mismatch");
  }
  if (observation.authority !== "NONE_UNTRUSTED") {
    reasons.push("authority must be NONE_UNTRUSTED");
  }
  if (!isOpaque(observation.observation_id)) {
    reasons.push("observation id invalid");
  }
  if (
    !(OBSERVATION_PRODUCER_CLASSES as readonly string[]).includes(
      observation.producer_class,
    )
  ) {
    reasons.push("producer class invalid");
  }
  if (
    !(OBSERVATION_SEVERITY_HINTS as readonly string[]).includes(
      observation.severity_hint,
    )
  ) {
    reasons.push("severity hint invalid");
  }
  if (!CATEGORY_HINT.test(observation.category_hint)) {
    reasons.push("category hint invalid");
  }
  if (
    typeof observation.body !== "string" ||
    observation.body.length === 0 ||
    observation.body.length > MAX_OBSERVATION_BODY_CHARS
  ) {
    reasons.push("body out of bounds");
  }
  const location = observation.location_hint;
  if (location !== null) {
    if (!SAFE_RELATIVE_PATH.test(location.path)) {
      reasons.push("location path invalid");
    }
    if (location.start_line !== null && !validLine(location.start_line)) {
      reasons.push("start line invalid");
    }
    if (location.end_line !== null && !validLine(location.end_line)) {
      reasons.push("end line invalid");
    }
    if (
      location.start_line !== null &&
      location.end_line !== null &&
      location.end_line < location.start_line
    ) {
      reasons.push("line range inverted");
    }
  }
  if (observation.rule_id !== null && !isOpaque(observation.rule_id)) {
    reasons.push("rule id invalid");
  }
  if (
    observation.producer_class === "RULE" &&
    observation.rule_id === null
  ) {
    reasons.push("rule observation without rule id");
  }
  if (
    observation.confidence !== null &&
    (typeof observation.confidence !== "number" ||
      Number.isNaN(observation.confidence) ||
      observation.confidence < 0 ||
      observation.confidence > 1)
  ) {
    reasons.push("confidence out of range");
  }
  const binding = observation.execution_binding;
  if (!isOpaque(binding.engine_id)) {
    reasons.push("engine id invalid");
  }
  if (!isOpaque(binding.binary_name)) {
    reasons.push("binary name invalid");
  }
  if (!isOpaque(binding.profile_id)) {
    reasons.push("profile id invalid");
  }
  if (!isOpaque(binding.capsule_id)) {
    reasons.push("capsule id invalid");
  }
  if (typeof binding.observed_version !== "string" || binding.observed_version.length === 0) {
    reasons.push("observed version invalid");
  }
  if (!GIT_SHA_HEX.test(binding.head_sha)) {
    reasons.push("head sha invalid");
  }
  return { ok: reasons.length === 0, reasons };
}
