import type { LcovBranchPoint, LcovLinePoint } from "./coverage/lcov.js";
import type { GitChangedFile } from "./git.js";
import type { ExerciseRecordV1, ExerciseV1 } from "./receipt/model.js";

const JS_TS_SOURCE = /\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$/u;
const TYPESCRIPT_DECLARATION_SOURCE = /\.d\.(?:ts|mts|cts)$/u;
const DEFAULT_JS_TEST_SURFACE =
  /(?:^|\/)(?:__tests__\/.*\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)|[^/]+\.(test|spec)\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx))$/u;
const VITEST_CONFIG_NAME = /^vitest\.config\.(?:js|mjs|cjs|ts|mts|cts)$/u;
const JEST_CONFIG_NAME = /^jest\.config\.(?:js|mjs|cjs|ts|json)$/u;
const COVERAGE_SOURCE_MAPPING_UNRESOLVED = "coverage_source_mapping_unresolved" as const;
const BRANCH_EVIDENCE_UNRESOLVED = "changed branch evidence is unresolved" as const;

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
  branchPoints?: readonly LcovBranchPoint[],
): ExerciseV1 & BranchExerciseV1 {
  const pointsByPath = new Map<string, LcovLinePoint[]>();
  for (const point of coveragePoints) {
    const points = pointsByPath.get(point.path) ?? [];
    points.push(point);
    pointsByPath.set(point.path, points);
  }

  const branchPointsByPath = branchPoints === undefined
    ? new Map<string, readonly LcovBranchPoint[]>()
    : (() => {
        const map = new Map<string, LcovBranchPoint[]>();
        for (const point of branchPoints) {
          const points = map.get(point.path) ?? [];
          points.push(point);
          map.set(point.path, points);
        }
        return map;
      })();

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

    const branchPointsForFile = branchPointsByPath.get(file.path);
    const changedRanges = file.changed_new_line_ranges;

    for (const point of points) {
      if (!lineInRanges(point.line, changedRanges)) continue;

      if (branchPointsForFile !== undefined) {
        const branchesForLine = branchPointsForFile.filter((bp) => bp.line === point.line);
        if (branchesForLine.length > 0) {
          const hasExercised = branchesForLine.some((bp) => bp.state === "EXERCISED");
          const hasUnresolved = branchesForLine.some((bp) => bp.state === "UNRESOLVED");
          records.push({
            path: file.path,
            line: point.line,
            state: hasExercised ? "EXERCISED" : hasUnresolved ? "UNRESOLVED" : "NOT_EXERCISED",
            execution_count: hasExercised ? Math.max(...branchesForLine.filter((bp) => bp.state === "EXERCISED").map((bp) => bp.taken ?? 0)) : null,
            source_task_ids: [sourceTaskId],
          });
          continue;
        }
      }

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

  const branchExercise = branchPoints === undefined
    ? {
        exercised_branches: 0,
        not_exercised_branches: 0,
        unresolved_branches: 0,
        changed_files_with_zero_exercised_branches: 0,
        branch_records: [],
      } as BranchExerciseV1
    : buildBranchExercise(changedFiles, branchPoints, sourceTaskId);

  return {
    changed_executable_lines: records.length,
    exercised_lines: exercisedLines,
    not_exercised_lines: notExercisedLines,
    unresolved_lines: unresolvedLines,
    changed_files_with_zero_exercised_lines: changedFilesWithZeroExercisedLines,
    records,
    ...branchExercise,
  };
}

function buildChangedRangeMap(
  changedFiles: readonly GitChangedFile[],
): Map<string, readonly (readonly [number, number])[]> {
  const rangesByPath = new Map<string, readonly (readonly [number, number])[]>();
  for (const file of changedFiles) {
    if (
      file.change_kind === "deleted" ||
      file.line_semantics !== "text" ||
      file.changed_new_line_ranges.length === 0
    ) {
      continue;
    }
    const sorted = [...file.changed_new_line_ranges].sort(([aStart], [bStart]) => aStart - bStart);
    rangesByPath.set(file.path, sorted);
  }
  return rangesByPath;
}

export interface BranchRecordV1 {
  readonly path: string;
  readonly line: number;
  readonly block_id: string;
  readonly branch_id: string;
  readonly taken: number | null;
  readonly state: "EXERCISED" | "NOT_EXERCISED" | "UNRESOLVED";
  readonly reason?: string;
}

export interface BranchExerciseV1 {
  readonly exercised_branches: number;
  readonly not_exercised_branches: number;
  readonly unresolved_branches: number;
  readonly changed_files_with_zero_exercised_branches: number;
  readonly branch_records: readonly BranchRecordV1[];
}

export function buildBranchExercise(
  changedFiles: readonly GitChangedFile[],
  branchPoints: readonly LcovBranchPoint[],
  sourceTaskId: string,
): BranchExerciseV1 {
  const pointsByPath = new Map<string, LcovBranchPoint[]>();
  for (const point of branchPoints) {
    const points = pointsByPath.get(point.path) ?? [];
    points.push(point);
    pointsByPath.set(point.path, points);
  }

  const changedRanges = buildChangedRangeMap(changedFiles);
  const records: BranchRecordV1[] = [];
  for (const file of changedFiles) {
    const ranges = changedRanges.get(file.path);
    if (ranges === undefined || ranges.length === 0) continue;

    const points = pointsByPath.get(file.path);
    if (points === undefined || points.length === 0) {
      continue;
    }

    for (const point of points) {
      if (!lineInRanges(point.line, ranges)) continue;
      const resolvedReason = point.state === "UNRESOLVED" ? BRANCH_EVIDENCE_UNRESOLVED : undefined;
      records.push({
        path: point.path,
        line: point.line,
        block_id: point.block_id,
        branch_id: point.branch_id,
        taken: point.taken,
        state: point.state,
        ...(resolvedReason === undefined ? {} : { reason: resolvedReason }),
      });
    }
  }

  records.sort(
    (left, right) =>
      compareStrings(left.path, right.path) ||
      left.line - right.line ||
      compareStrings(left.block_id, right.block_id) ||
      compareStrings(left.branch_id, right.branch_id),
  );

  const exercisedBranches = records.filter(({ state }) => state === "EXERCISED").length;
  const notExercisedBranches = records.filter(({ state }) => state === "NOT_EXERCISED").length;
  const unresolvedBranches = records.filter(({ state }) => state === "UNRESOLVED").length;
  const recordsByPath = new Map<string, BranchRecordV1[]>();
  for (const record of records) {
    const pathRecords = recordsByPath.get(record.path) ?? [];
    pathRecords.push(record);
    recordsByPath.set(record.path, pathRecords);
  }
  const changedFilesWithZeroExercisedBranches = [...recordsByPath.values()]
    .filter((pathRecords) => !pathRecords.some(({ state }) => state === "EXERCISED"))
    .length;

  return {
    exercised_branches: exercisedBranches,
    not_exercised_branches: notExercisedBranches,
    unresolved_branches: unresolvedBranches,
    changed_files_with_zero_exercised_branches: changedFilesWithZeroExercisedBranches,
    branch_records: records,
  };
}
