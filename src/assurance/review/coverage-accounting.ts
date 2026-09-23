export const COVERAGE_ACCOUNTING_SCHEMA_VERSION = 1 as const;

export const GROUP_COVERAGE_STATES = [
  "FULLY_REVIEWED",
  "PARTIALLY_REVIEWED",
  "UNREVIEWED",
] as const;

export type GroupCoverageStateV1 = (typeof GROUP_COVERAGE_STATES)[number];

export interface CoverageGroupV1 {
  readonly group_id: string;
  readonly files: readonly string[];
}

export interface ReviewCoverageInputV1 {
  readonly target_id: string;
  readonly head_sha: string;
  readonly groups: readonly CoverageGroupV1[];
  readonly reviewed_files: readonly string[];
}

export interface GroupCoverageV1 {
  readonly group_id: string;
  readonly state: GroupCoverageStateV1;
  readonly reviewed_files: readonly string[];
  readonly unreviewed_files: readonly string[];
}

export interface ReviewCoverageV1 {
  readonly schema_version: 1;
  readonly target_id: string;
  readonly head_sha: string;
  readonly reviewed_files: readonly string[];
  readonly unreviewed_files: readonly string[];
  readonly groups: readonly GroupCoverageV1[];
  readonly complete: boolean;
  readonly reasons: readonly string[];
}

export interface ReviewCoverageCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const GIT_SHA_HEX = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const SAFE_RELATIVE_PATH =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?!.+\/[.]{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u;

function isOpaque(value: unknown): value is string {
  return typeof value === "string" && OPAQUE_ID.test(value);
}

function canonicalStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

export function assertReviewCoverageInputV1(
  input: ReviewCoverageInputV1,
): ReviewCoverageCheckV1 {
  const reasons: string[] = [];
  if (!isOpaque(input.target_id)) {
    reasons.push("target id invalid");
  }
  if (
    typeof input.head_sha !== "string" ||
    !GIT_SHA_HEX.test(input.head_sha)
  ) {
    reasons.push("head sha invalid");
  }
  if (!Array.isArray(input.groups) || input.groups.length === 0) {
    reasons.push("groups empty");
  }
  if (!Array.isArray(input.reviewed_files)) {
    reasons.push("reviewed files not a list");
    return { ok: false, reasons };
  }
  const seenGroups = new Set<string>();
  const inventory = new Set<string>();
  if (Array.isArray(input.groups)) {
    for (const group of input.groups) {
      if (!isOpaque(group.group_id)) {
        reasons.push("group id invalid");
        continue;
      }
      if (seenGroups.has(group.group_id)) {
        reasons.push("duplicate group id: " + group.group_id);
        continue;
      }
      seenGroups.add(group.group_id);
      if (!Array.isArray(group.files) || group.files.length === 0) {
        reasons.push("group files empty: " + group.group_id);
        continue;
      }
      const seenFiles = new Set<string>();
      for (const file of group.files) {
        if (typeof file !== "string" || !SAFE_RELATIVE_PATH.test(file)) {
          reasons.push("group file path invalid: " + group.group_id);
          break;
        }
        if (seenFiles.has(file)) {
          reasons.push(
            "duplicate file in group: " + group.group_id + ":" + file,
          );
          break;
        }
        seenFiles.add(file);
        inventory.add(file);
      }
    }
  }
  const seenReviewed = new Set<string>();
  for (const file of input.reviewed_files) {
    if (typeof file !== "string" || !SAFE_RELATIVE_PATH.test(file)) {
      reasons.push("reviewed file path invalid");
      break;
    }
    if (seenReviewed.has(file)) {
      reasons.push("duplicate reviewed file: " + file);
      break;
    }
    seenReviewed.add(file);
  }
  if (reasons.length === 0) {
    for (const file of seenReviewed) {
      if (!inventory.has(file)) {
        reasons.push("reviewed file outside declared scope: " + file);
        break;
      }
    }
  }
  return { ok: reasons.length === 0, reasons };
}

export function computeReviewCoverageV1(
  input: ReviewCoverageInputV1,
): ReviewCoverageV1 {
  const check = assertReviewCoverageInputV1(input);
  if (!check.ok) {
    throw new TypeError(
      "invalid review coverage input: " + check.reasons.join("; "),
    );
  }
  const reviewed = new Set<string>(input.reviewed_files);
  const allFiles = new Set<string>();
  for (const group of input.groups) {
    for (const file of group.files) {
      allFiles.add(file);
    }
  }
  const reviewedFiles = canonicalStrings(
    [...allFiles].filter((file) => reviewed.has(file)),
  );
  const unreviewedFiles = canonicalStrings(
    [...allFiles].filter((file) => !reviewed.has(file)),
  );
  const groups: GroupCoverageV1[] = [...input.groups]
    .sort((a, b) => (a.group_id < b.group_id ? -1 : a.group_id > b.group_id ? 1 : 0))
    .map((group) => {
      const groupReviewed = canonicalStrings(
        group.files.filter((file) => reviewed.has(file)),
      );
      const groupUnreviewed = canonicalStrings(
        group.files.filter((file) => !reviewed.has(file)),
      );
      const state: GroupCoverageStateV1 =
        groupUnreviewed.length === 0
          ? "FULLY_REVIEWED"
          : groupReviewed.length === 0
            ? "UNREVIEWED"
            : "PARTIALLY_REVIEWED";
      return Object.freeze({
        group_id: group.group_id,
        state,
        reviewed_files: groupReviewed,
        unreviewed_files: groupUnreviewed,
      });
    });
  const complete = unreviewedFiles.length === 0;
  const reasons: readonly string[] = complete
    ? Object.freeze([])
    : Object.freeze([
        ...groups
          .filter((group) => group.state !== "FULLY_REVIEWED")
          .map(
            (group) =>
              "group " +
              group.group_id +
              " is " +
              group.state +
              ": " +
              group.unreviewed_files.length +
              " file(s) unreviewed",
          ),
        "scope incomplete: " + unreviewedFiles.length + " file(s) unreviewed",
      ]);
  return Object.freeze({
    schema_version: COVERAGE_ACCOUNTING_SCHEMA_VERSION,
    target_id: input.target_id,
    head_sha: input.head_sha,
    reviewed_files: reviewedFiles,
    unreviewed_files: unreviewedFiles,
    groups: Object.freeze(groups),
    complete,
    reasons,
  });
}

export function isReviewFullyCoveredV1(coverage: ReviewCoverageV1): boolean {
  return coverage.complete === true && coverage.unreviewed_files.length === 0;
}
