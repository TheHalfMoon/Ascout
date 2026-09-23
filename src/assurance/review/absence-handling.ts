import type {
  ReviewExecutionResultV1,
  ReviewExecutionStatusV1,
} from "../engines/review/opencode-review-adapter.js";
import type { CoverageGroupV1 } from "./coverage-accounting.js";

export const ABSENCE_HANDLING_SCHEMA_VERSION = 1 as const;

export const ABSENCE_OUTCOMES = ["NOT_RUN", "INCOMPLETE"] as const;

export type ReviewAbsenceOutcomeV1 =
  (typeof ABSENCE_OUTCOMES)[number];

export const ABSENCE_STATUSES: readonly ReviewExecutionStatusV1[] = [
  "UNAVAILABLE",
  "NOT_QUALIFIED",
  "TIMEOUT",
  "ERROR",
  "REFUSED",
];

export interface ReviewAbsenceRecordV1 {
  readonly schema_version: 1;
  readonly execution_status: ReviewExecutionStatusV1;
  readonly outcome: ReviewAbsenceOutcomeV1;
  readonly reasons: readonly string[];
  readonly unreviewed_files: readonly string[];
  readonly unreviewed_groups: readonly string[];
  readonly complete: false;
  readonly execution_identity: ReviewExecutionResultV1["execution_identity"];
}

export interface ReviewAbsenceCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SAFE_RELATIVE_PATH =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?!.+\/[.]{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u;

export function assertReviewAbsenceInputV1(
  result: ReviewExecutionResultV1,
  groups: readonly CoverageGroupV1[],
): ReviewAbsenceCheckV1 {
  const reasons: string[] = [];
  if (
    typeof result !== "object" ||
    result === null ||
    result.schema_version !== 1
  ) {
    reasons.push("execution result schema invalid");
    return { ok: false, reasons };
  }
  if (
    !(ABSENCE_STATUSES as readonly string[]).includes(result.status)
  ) {
    reasons.push(
      "not an absence outcome: status " + String(result.status),
    );
  }
  if (!Array.isArray(result.reasons)) {
    reasons.push("execution reasons not a list");
  }
  if (
    typeof result.execution_identity !== "object" ||
    result.execution_identity === null
  ) {
    reasons.push("execution identity missing");
  }
  if (!Array.isArray(groups) || groups.length === 0) {
    reasons.push("groups empty");
    return { ok: reasons.length === 0, reasons };
  }
  const seen = new Set<string>();
  for (const group of groups) {
    if (
      typeof group.group_id !== "string" ||
      !OPAQUE_ID.test(group.group_id)
    ) {
      reasons.push("group id invalid");
      break;
    }
    if (seen.has(group.group_id)) {
      reasons.push("duplicate group id: " + group.group_id);
      break;
    }
    seen.add(group.group_id);
    if (!Array.isArray(group.files) || group.files.length === 0) {
      reasons.push("group files empty: " + group.group_id);
      break;
    }
    for (const file of group.files) {
      if (typeof file !== "string" || !SAFE_RELATIVE_PATH.test(file)) {
        reasons.push("group file path invalid: " + group.group_id);
        break;
      }
    }
  }
  return { ok: reasons.length === 0, reasons };
}

export function mapReviewAbsenceV1(
  result: ReviewExecutionResultV1,
  groups: readonly CoverageGroupV1[],
): ReviewAbsenceRecordV1 {
  const check = assertReviewAbsenceInputV1(result, groups);
  if (!check.ok) {
    throw new TypeError(
      "invalid absence input: " + check.reasons.join("; "),
    );
  }
  const outcome: ReviewAbsenceOutcomeV1 =
    result.status === "TIMEOUT" || result.status === "ERROR"
      ? "INCOMPLETE"
      : "NOT_RUN";
  const files = new Set<string>();
  for (const group of groups) {
    for (const file of group.files) {
      files.add(file);
    }
  }
  const unreviewedFiles = Object.freeze([...files].sort());
  const unreviewedGroups = Object.freeze(
    [...groups]
      .map((group) => group.group_id)
      .sort(),
  );
  const reasonText =
    outcome === "INCOMPLETE"
      ? "review execution " +
        result.status +
        ": started but produced no review; scope INCOMPLETE, never clean"
      : "review execution " +
        result.status +
        ": review never ran; scope NOT_RUN, never clean";
  return Object.freeze({
    schema_version: ABSENCE_HANDLING_SCHEMA_VERSION,
    execution_status: result.status,
    outcome,
    reasons: Object.freeze([
      reasonText,
      ...result.reasons.map((reason) => "engine: " + reason),
    ]),
    unreviewed_files: unreviewedFiles,
    unreviewed_groups: unreviewedGroups,
    complete: false as const,
    execution_identity: Object.freeze({ ...result.execution_identity }),
  });
}
