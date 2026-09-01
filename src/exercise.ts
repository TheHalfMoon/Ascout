import type { LcovLinePoint, LcovBranchPoint } from "./coverage/lcov.js";
import type { GitChangedFile } from "./git.js";
import type { ExerciseRecordV1, ExerciseV1 } from "./receipt/model.js";

const JS_TS_SOURCE = /\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$/u;
const TYPESCRIPT_DECLARATION_SOURCE = /\.d\.(?:ts|mts|cts)$/u;
const DEFAULT_JS_TEST_SURFACE =
  /(?:^|\/)(?:__tests__\/.*\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)|[^/]+\.(?:test|spec)\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx))$/u;
const VITEST_CONFIG_NAME = /^vitest\.config\.(?:js|mjs|cjs|ts|mts|cts)$/u;
const JEST_CONFIG_NAME = /^jest\.config\.(?:js|mjs|cjs|ts|json)$/u;
const COVERAGE_SOURCE_MAPPING_UNRESOLVED = "coverage_source_mapping_unresolved" as const;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function basename(path: string): string {
  const index = path.lastIndexOf("/");
  return index < 0 ? path : path.slice(index + 1);
}

function isRunnerConfig(path: string): boolean {
  const name = basename(path);
  return VITEST_CONFIG_NAME.test(name) || JEST_CONFIG_NAME.test(name);
}

function isChangedProductionSource(file: GitChangedFile): boolean {
  return (
    file.change_kind !== "deleted" &&
    file.line_semantics === "text" &&
    JS_TS_SOURCE.test(file.path) &&
    !TYPESCRIPT_DECLARATION_SOURCE.test(file.path) &&
    !DEFAULT_JS_TEST_SURFACE.test(file.path) &&
    !isRunnerConfig(file.path)
  );
}

function lineInRanges(line: number, ranges: readonly (readonly [number, number])[]): boolean {
  return ranges.some(([start, end]) => start <= line && line <= end);
}

function unresolvedRecords(file: GitChangedFile, sourceTaskId: string): ExerciseRecordV1[] {
  const records: ExerciseRecordV1[] = [];
  for (const [start, end] of file.changed_new_line_ranges) {
    for (let line = start; line <= end; line += 1) {
      records.push({
        path: file.path,
        line,
        state: "UNRESOLVED",
        execution_count: null,
        source_task_ids: [sourceTaskId],
        reason: COVERAGE_SOURCE_MAPPING_UNRESOLVED,
      });
    }
  }
  return records;
}

function changedRangesContainLine(
  ranges: readonly (readonly [number, number])[],
  line: number,
): boolean {
  return ranges.some(([start, end]) => start <= line && line <= end);
}

function buildChangedBranchExerciseRecord(
  observation: LcovBranchPoint,
  changedRanges: readonly (readonly [number, number])[],
  sourceTaskId: string,
): ExerciseRecordV1 | null {
  if (!changedRangesContainLine(changedRanges, observation.line)) return null;

  let state: ExerciseRecordV1["state"];
  let execution_count: number | null;
  if (observation.state === "BRANCH_EXERCISED") {
    state = "EXERCISED";
    execution_count = observation.taken;
  } else if (observation.state === "BRANCH_NOT_EXERCISED") {
    state = "NOT_EXERCISED";
    execution_count = 0;
  } else {
    state = "UNRESOLVED";
    execution_count = null;
  }

  return {
    path: observation.path,
    line: observation.line,
    state,
    execution_count,
    source_task_ids: [sourceTaskId],
    branch: true,
    ...(state === "UNRESOLVED" && observation.reason !== undefined ? { reason: observation.reason } : {}),
  };
}

export function buildChangedBranchExercise(
  changedFiles: readonly GitChangedFile[],
  branchObservations: readonly LcovBranchPoint[],
  sourceTaskId: string,
): ExerciseV1 {
  const observationsByPath = new Map<string, LcovBranchPoint[]>();
  for (const observation of branchObservations) {
    const existing = observationsByPath.get(observation.path) ?? [];
    existing.push(observation);
    observationsByPath.set(observation.path, existing);
  }

  const records: ExerciseRecordV1[] = [];
  for (const file of changedFiles) {
    if (
      file.change_kind === "deleted" ||
      file.line_semantics !== "text" ||
      file.changed_new_line_ranges.length === 0
    ) {
      continue;
    }

    const observations = observationsByPath.get(file.path);
    if (observations === undefined || observations.length === 0) {
      if (isChangedProductionSource(file)) records.push(...unresolvedRecords(file, sourceTaskId));
      continue;
    }

    let added = 0;
    for (const observation of observations) {
      if (!changedRangesContainLine(file.changed_new_line_ranges, observation.line)) continue;
      const record = buildChangedBranchExerciseRecord(observation, file.changed_new_line_ranges, sourceTaskId);
      if (record !== null) {
        records.push(record);
        added += 1;
      }
    }

    if (added === 0 && isChangedProductionSource(file)) {
      records.push(...unresolvedRecords(file, sourceTaskId));
    }
  }

  records.sort((left, right) => compareStrings(left.path, right.path) || left.line - right.line);

  const exercisedLines = records.filter(({ state }) => state === "EXERCISED").length;
  const notExercisedLines = records.filter(({ state }) => state === "NOT_EXERCISED").length;
  const unresolvedLines = records.filter(({ state }) => state === "UNRESOLVED").length;
  const branchNotExercisedLines = records.filter(({ branch, state }) => branch === true && state === "NOT_EXERCISED").length;
  const branchUnresolvedLines = records.filter(({ branch, state }) => branch === true && state === "UNRESOLVED").length;
  const recordsByPath = new Map<string, ExerciseRecordV1[]>();
  for (const record of records) {
    const pathRecords = recordsByPath.get(record.path) ?? [];
    pathRecords.push(record);
    recordsByPath.set(record.path, pathRecords);
  }
  const changedFilesWithZeroExercisedLines = [...recordsByPath.values()]
    .filter((pathRecords) => !pathRecords.some(({ state }) => state === "EXERCISED"))
    .length;

  return {
    changed_executable_lines: records.length,
    exercised_lines: exercisedLines,
    not_exercised_lines: notExercisedLines,
    unresolved_lines: unresolvedLines,
    changed_files_with_zero_exercised_lines: changedFilesWithZeroExercisedLines,
    ...(branchNotExercisedLines > 0 ? { branch_not_exercised_lines: branchNotExercisedLines } : {}),
    ...(branchUnresolvedLines > 0 ? { branch_unresolved_lines: branchUnresolvedLines } : {}),
    records,
  };
}

/**
 * Intersects normalized current-run LCOV with changed new-line ranges.
 *
 * LCOV DA points define the executable/instrumentable line set for a source
 * that has a usable coverage relationship. Changed lines absent from that set
 * are not invented as executable. If a changed production source has no LCOV
 * relationship at all after permitted selection/widening, its changed text
 * lines remain UNRESOLVED rather than being silently omitted or assigned zero.
 */
export function buildChangedLineExercise(
  changedFiles: readonly GitChangedFile[],
  coveragePoints: readonly LcovLinePoint[],
  sourceTaskId: string,
): ExerciseV1 {
  const pointsByPath = new Map<string, LcovLinePoint[]>();
  for (const point of coveragePoints) {
    const points = pointsByPath.get(point.path) ?? [];
    points.push(point);
    pointsByPath.set(point.path, points);
  }

  const records: ExerciseRecordV1[] = [];
  for (const file of changedFiles) {
    if (
      file.change_kind === "deleted" ||
      file.line_semantics !== "text" ||
      file.changed_new_line_ranges.length === 0
    ) {
      continue;
    }

    const points = pointsByPath.get(file.path);
    if (points === undefined || points.length === 0) {
      if (isChangedProductionSource(file)) records.push(...unresolvedRecords(file, sourceTaskId));
      continue;
    }

    for (const point of points) {
      if (!lineInRanges(point.line, file.changed_new_line_ranges)) continue;
      records.push({
        path: file.path,
        line: point.line,
        state: point.count > 0 ? "EXERCISED" : "NOT_EXERCISED",
        execution_count: point.count,
        source_task_ids: [sourceTaskId],
      });
    }
  }

  records.sort((left, right) => compareStrings(left.path, right.path) || left.line - right.line);

  const exercisedLines = records.filter(({ state }) => state === "EXERCISED").length;
  const notExercisedLines = records.filter(({ state }) => state === "NOT_EXERCISED").length;
  const unresolvedLines = records.filter(({ state }) => state === "UNRESOLVED").length;
  const recordsByPath = new Map<string, ExerciseRecordV1[]>();
  for (const record of records) {
    const pathRecords = recordsByPath.get(record.path) ?? [];
    pathRecords.push(record);
    recordsByPath.set(record.path, pathRecords);
  }
  const changedFilesWithZeroExercisedLines = [...recordsByPath.values()]
    .filter((pathRecords) => !pathRecords.some(({ state }) => state === "EXERCISED"))
    .length;

  return {
    changed_executable_lines: records.length,
    exercised_lines: exercisedLines,
    not_exercised_lines: notExercisedLines,
    unresolved_lines: unresolvedLines,
    changed_files_with_zero_exercised_lines: changedFilesWithZeroExercisedLines,
    records,
  };
}
