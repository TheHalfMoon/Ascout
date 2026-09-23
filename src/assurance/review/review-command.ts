import {
  REVIEW_ADAPTER_ENGINE_ID,
  type ReviewExecutionResultV1,
  type ReviewExecutionStatusV1,
} from "../engines/review/opencode-review-adapter.js";
import {
  mapReviewAbsenceV1,
  type ReviewAbsenceRecordV1,
} from "./absence-handling.js";
import {
  correlateReviewRecordsV1,
  type CorrelationClusterV1,
} from "./dedup-correlation.js";
import {
  assertReviewCoverageInputV1,
  computeReviewCoverageV1,
  type CoverageGroupV1,
  type ReviewCoverageInputV1,
  type ReviewCoverageV1,
} from "./coverage-accounting.js";
import {
  assertNormalizableReviewV1,
  normalizeReviewBatchV1,
  type NormalizedReviewRecordV1,
} from "./finding-normalization.js";
import type { LocationValidationV1 } from "./location-validator.js";
import type { RawReviewObservationV1 } from "./raw-observation.js";

export const REVIEW_COMMAND_SCHEMA_VERSION = 1 as const;

export const REVIEW_REPORT_KINDS = ["review", "absence", "empty"] as const;

export type ReviewReportKindV1 = (typeof REVIEW_REPORT_KINDS)[number];

export interface ReviewReportEntryV1 {
  readonly observation: RawReviewObservationV1;
  readonly validation: LocationValidationV1;
}

export interface ReviewReportInputV1 {
  readonly target_id: string;
  readonly head_sha: string;
  readonly profile_id: string;
  readonly capsule_id: string;
  readonly groups: readonly CoverageGroupV1[];
  readonly reviewed_files: readonly string[];
  readonly entries: readonly ReviewReportEntryV1[];
}

export interface ReviewCountsV1 {
  readonly observations: number;
  readonly promotable: number;
  readonly clusters: number;
  readonly complete: boolean;
}

export interface FullReviewReportV1 {
  readonly kind: "review";
  readonly schema_version: 1;
  readonly target_id: string;
  readonly head_sha: string;
  readonly profile_id: string;
  readonly capsule_id: string;
  readonly coverage: ReviewCoverageV1;
  readonly records: readonly NormalizedReviewRecordV1[];
  readonly clusters: readonly CorrelationClusterV1[];
  readonly counts: ReviewCountsV1;
}

export interface AbsenceReviewReportV1 {
  readonly kind: "absence";
  readonly schema_version: 1;
  readonly target_id: string;
  readonly head_sha: string;
  readonly absence: ReviewAbsenceRecordV1;
}

export interface EmptyReviewReportV1 {
  readonly kind: "empty";
  readonly schema_version: 1;
  readonly target_id: string;
  readonly head_sha: string;
  readonly outcome: "NOT_RUN";
  readonly reasons: readonly string[];
}

export type ReviewReportV1 =
  | FullReviewReportV1
  | AbsenceReviewReportV1
  | EmptyReviewReportV1;

export interface ReviewCommandCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const GIT_SHA_HEX = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;

function assertReportIdentity(
  target_id: string,
  head_sha: string,
  profile_id: string,
  capsule_id: string,
): string[] {
  const reasons: string[] = [];
  if (typeof target_id !== "string" || !OPAQUE_ID.test(target_id)) {
    reasons.push("target id invalid");
  }
  if (typeof head_sha !== "string" || !GIT_SHA_HEX.test(head_sha)) {
    reasons.push("head sha invalid");
  }
  if (typeof profile_id !== "string" || !OPAQUE_ID.test(profile_id)) {
    reasons.push("profile id invalid");
  }
  if (typeof capsule_id !== "string" || !OPAQUE_ID.test(capsule_id)) {
    reasons.push("capsule id invalid");
  }
  return reasons;
}

export function assertReviewReportInputV1(
  input: ReviewReportInputV1,
): ReviewCommandCheckV1 {
  const reasons: string[] = assertReportIdentity(
    input.target_id,
    input.head_sha,
    input.profile_id,
    input.capsule_id,
  );
  const coverageInput: ReviewCoverageInputV1 = {
    target_id: input.target_id,
    head_sha: input.head_sha,
    groups: input.groups,
    reviewed_files: input.reviewed_files,
  };
  const coverageCheck = assertReviewCoverageInputV1(coverageInput);
  if (!coverageCheck.ok) {
    reasons.push("coverage input invalid: " + coverageCheck.reasons.join("; "));
  }
  if (!Array.isArray(input.entries)) {
    reasons.push("entries not a list");
    return { ok: false, reasons };
  }
  for (const entry of input.entries) {
    const entryCheck = assertNormalizableReviewV1(
      entry.observation,
      entry.validation,
    );
    if (!entryCheck.ok) {
      reasons.push(
        "entry invalid: " + entryCheck.reasons.join("; "),
      );
      break;
    }
  }
  return { ok: reasons.length === 0, reasons };
}

export function buildReviewReportV1(
  input: ReviewReportInputV1,
): FullReviewReportV1 {
  const check = assertReviewReportInputV1(input);
  if (!check.ok) {
    throw new TypeError(
      "invalid review report input: " + check.reasons.join("; "),
    );
  }
  const coverage = computeReviewCoverageV1({
    target_id: input.target_id,
    head_sha: input.head_sha,
    groups: input.groups,
    reviewed_files: input.reviewed_files,
  });
  const records = normalizeReviewBatchV1(input.entries);
  const correlation = correlateReviewRecordsV1(records);
  const promotable = records.filter((record) => record.promotable).length;
  return Object.freeze({
    kind: "review" as const,
    schema_version: REVIEW_COMMAND_SCHEMA_VERSION,
    target_id: input.target_id,
    head_sha: input.head_sha,
    profile_id: input.profile_id,
    capsule_id: input.capsule_id,
    coverage,
    records,
    clusters: correlation.clusters,
    counts: Object.freeze({
      observations: records.length,
      promotable,
      clusters: correlation.cluster_count,
      complete: coverage.complete,
    }),
  });
}

export function defaultUnavailableExecutionV1(
  head_sha: string,
  profile_id: string,
  capsule_id: string,
): ReviewExecutionResultV1 {
  return {
    schema_version: 1,
    status: "UNAVAILABLE" as ReviewExecutionStatusV1,
    exit_code: null,
    raw_stdout: null,
    stderr_excerpt: null,
    duration_ms: null,
    timed_out: false,
    reasons: Object.freeze([
      "no qualified review engine available for default read-only invocation",
      "live provider invocation requires an explicitly user-authorized provider path",
    ]),
    execution_identity: Object.freeze({
      engine_id: REVIEW_ADAPTER_ENGINE_ID,
      binary_name: "open-code-review",
      observed_version: null,
      resolved_path: "unresolved",
      profile_id,
      capsule_id,
      head_sha,
      argv: Object.freeze([]),
    }),
  };
}

export function buildReviewAbsenceReportV1(
  target_id: string,
  head_sha: string,
  result: ReviewExecutionResultV1,
  groups: readonly CoverageGroupV1[],
): AbsenceReviewReportV1 {
  const identityReasons = assertReportIdentity(
    target_id,
    head_sha,
    result.execution_identity.profile_id,
    result.execution_identity.capsule_id,
  );
  if (identityReasons.length > 0) {
    throw new TypeError(
      "invalid absence report identity: " + identityReasons.join("; "),
    );
  }
  return Object.freeze({
    kind: "absence" as const,
    schema_version: REVIEW_COMMAND_SCHEMA_VERSION,
    target_id,
    head_sha,
    absence: mapReviewAbsenceV1(result, groups),
  });
}

export function buildEmptyReviewScopeV1(
  target_id: string,
  head_sha: string,
): EmptyReviewReportV1 {
  const identityReasons = assertReportIdentity(
    target_id,
    head_sha,
    "profile:review-default",
    "capsule:review-default",
  );
  if (identityReasons.length > 0) {
    throw new TypeError(
      "invalid empty scope identity: " + identityReasons.join("; "),
    );
  }
  return Object.freeze({
    kind: "empty" as const,
    schema_version: REVIEW_COMMAND_SCHEMA_VERSION,
    target_id,
    head_sha,
    outcome: "NOT_RUN" as const,
    reasons: Object.freeze(["empty scope: no changed files under review"]),
  });
}

export function renderReviewJsonV1(report: ReviewReportV1): string {
  return JSON.stringify(report, null, 2) + "\n";
}

export function renderReviewTerminalV1(report: ReviewReportV1): string {
  const lines: string[] = [];
  lines.push("=== Ascout Review (read-only) ===");
  lines.push(`target: ${report.target_id}`);
  lines.push(`head: ${report.head_sha}`);
  if (report.kind === "review") {
    lines.push(`profile: ${report.profile_id}`);
    lines.push(`observations: ${report.counts.observations}`);
    lines.push(`promotable: ${report.counts.promotable}`);
    lines.push(`clusters: ${report.counts.clusters}`);
    lines.push(`coverage complete: ${String(report.counts.complete)}`);
    lines.push(`reviewed files: ${report.coverage.reviewed_files.length}`);
    lines.push(`unreviewed files: ${report.coverage.unreviewed_files.length}`);
    for (const file of report.coverage.unreviewed_files) {
      lines.push(`  unreviewed: ${file}`);
    }
    for (const group of report.coverage.groups) {
      lines.push(`  group ${group.group_id}: ${group.state}`);
    }
  } else if (report.kind === "absence") {
    lines.push(`outcome: ${report.absence.outcome}`);
    for (const reason of report.absence.reasons) {
      lines.push(`reason: ${reason}`);
    }
    lines.push(`unreviewed files: ${report.absence.unreviewed_files.length}`);
    for (const file of report.absence.unreviewed_files) {
      lines.push(`  unreviewed: ${file}`);
    }
  } else {
    lines.push(`outcome: ${report.outcome}`);
    for (const reason of report.reasons) {
      lines.push(`reason: ${reason}`);
    }
  }
  return lines.join("\n") + "\n";
}
