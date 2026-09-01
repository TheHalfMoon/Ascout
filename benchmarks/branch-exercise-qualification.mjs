import { normalizeLcovBranchCoverage } from "./branch-coverage-lib.mjs";

const VALID_LINE_CONCLUSIONS = new Set([
  "LINE_EXERCISED",
  "LINE_NOT_EXERCISED",
  "LINE_UNRESOLVED",
]);

function compareText(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function validateChangedRange(range) {
  if (
    range === null ||
    typeof range !== "object" ||
    typeof range.path !== "string" ||
    range.path.length === 0 ||
    range.path.startsWith("/") ||
    range.path.includes("\\") ||
    range.path.split("/").some((segment) => segment.length === 0 || segment === "." || segment === "..") ||
    !Number.isSafeInteger(range.start) ||
    !Number.isSafeInteger(range.end) ||
    range.start <= 0 ||
    range.end < range.start
  ) {
    throw new TypeError("qualification changed range is invalid");
  }

  return { path: range.path, start: range.start, end: range.end };
}

function normalizeChangedRanges(ranges) {
  if (!Array.isArray(ranges) || ranges.length === 0) {
    throw new TypeError("qualification changed ranges are required");
  }

  return ranges.map(validateChangedRange).sort(
    (left, right) =>
      compareText(left.path, right.path) ||
      left.start - right.start ||
      left.end - right.end,
  );
}

function isChangedObservation(observation, changedRanges) {
  return changedRanges.some(
    (range) =>
      range.path === observation.path &&
      observation.line >= range.start &&
      observation.line <= range.end,
  );
}

function validateFixture(fixture) {
  if (
    fixture === null ||
    typeof fixture !== "object" ||
    typeof fixture.id !== "string" ||
    fixture.id.length === 0 ||
    typeof fixture.repoRoot !== "string" ||
    typeof fixture.input !== "string" ||
    fixture.qualification === null ||
    typeof fixture.qualification !== "object"
  ) {
    throw new TypeError("qualification fixture is invalid");
  }

  const { lineConclusion } = fixture.qualification;
  if (!VALID_LINE_CONCLUSIONS.has(lineConclusion)) {
    throw new TypeError("qualification line conclusion is invalid");
  }

  return {
    caseId: fixture.id,
    lineConclusion,
    changedRanges: normalizeChangedRanges(fixture.qualification.changedRanges),
  };
}

export function evaluateBranchExerciseCase(fixture) {
  const { caseId, lineConclusion, changedRanges } = validateFixture(fixture);
  const normalized = normalizeLcovBranchCoverage(fixture.input, fixture.repoRoot);

  if (normalized.outcome !== "resolved") {
    return {
      case_id: caseId,
      line_conclusion: lineConclusion,
      changed_ranges: changedRanges,
      outcome: "FAIL_CLOSED",
      branch_only_gap: false,
      changed_branch_observations: null,
      ignored_branch_observations: null,
      reason: normalized.reason,
    };
  }

  const changedBranchObservations = [];
  const ignoredBranchObservations = [];
  for (const observation of normalized.observations) {
    (isChangedObservation(observation, changedRanges)
      ? changedBranchObservations
      : ignoredBranchObservations
    ).push(observation);
  }

  if (lineConclusion === "LINE_UNRESOLVED") {
    return {
      case_id: caseId,
      line_conclusion: lineConclusion,
      changed_ranges: changedRanges,
      outcome: "UNRESOLVED",
      branch_only_gap: false,
      changed_branch_observations: changedBranchObservations,
      ignored_branch_observations: ignoredBranchObservations,
      reason: "line exercise conclusion is unresolved",
    };
  }

  if (changedBranchObservations.length === 0) {
    return {
      case_id: caseId,
      line_conclusion: lineConclusion,
      changed_ranges: changedRanges,
      outcome: "UNRESOLVED",
      branch_only_gap: false,
      changed_branch_observations: changedBranchObservations,
      ignored_branch_observations: ignoredBranchObservations,
      reason: "no branch observations intersect changed ranges",
    };
  }

  if (changedBranchObservations.some((observation) => observation.state === "BRANCH_UNRESOLVED")) {
    return {
      case_id: caseId,
      line_conclusion: lineConclusion,
      changed_ranges: changedRanges,
      outcome: "UNRESOLVED",
      branch_only_gap: false,
      changed_branch_observations: changedBranchObservations,
      ignored_branch_observations: ignoredBranchObservations,
      reason: "changed branch evidence is unresolved",
    };
  }

  const branchOnlyGap =
    lineConclusion === "LINE_EXERCISED" &&
    changedBranchObservations.some((observation) => observation.state === "BRANCH_NOT_EXERCISED");

  return {
    case_id: caseId,
    line_conclusion: lineConclusion,
    changed_ranges: changedRanges,
    outcome: branchOnlyGap ? "BRANCH_ONLY_GAP" : "NO_BRANCH_ONLY_GAP",
    branch_only_gap: branchOnlyGap,
    changed_branch_observations: changedBranchObservations,
    ignored_branch_observations: ignoredBranchObservations,
  };
}

export function evaluateBranchExerciseCatalog(catalog) {
  if (catalog === null || typeof catalog !== "object" || catalog.version !== 1 || !Array.isArray(catalog.cases)) {
    throw new TypeError("qualification fixture catalog is invalid");
  }

  const seen = new Set();
  const cases = catalog.cases.map((fixture) => {
    if (seen.has(fixture.id)) {
      throw new TypeError("qualification case id is duplicated");
    }
    seen.add(fixture.id);
    return evaluateBranchExerciseCase(fixture);
  });

  cases.sort((left, right) => compareText(left.case_id, right.case_id));
  return { version: 1, cases };
}

export function serializeBranchExerciseQualification(result) {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export const __test = { compareText, isChangedObservation, normalizeChangedRanges };
