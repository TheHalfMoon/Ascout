import { posix, win32 } from "node:path";

export interface LcovLinePoint {
  readonly path: string;
  readonly line: number;
  readonly count: number;
  readonly instrumented: true;
}

export interface ResolvedLcovLineCoverage {
  readonly outcome: "resolved";
  readonly points: readonly LcovLinePoint[];
}

export interface UnresolvedLcovLineCoverage {
  readonly outcome: "unresolved";
  readonly count: null;
  readonly reason: string;
}

export type LcovLineCoverageResult = ResolvedLcovLineCoverage | UnresolvedLcovLineCoverage;

export interface LcovBranchPoint {
  readonly path: string;
  readonly line: number;
  readonly block_id: string;
  readonly branch_id: string;
  readonly taken: number | null;
  readonly state: "EXERCISED" | "NOT_EXERCISED" | "UNRESOLVED";
  readonly reason?: string;
}

export interface ResolvedLcovBranchCoverage {
  readonly outcome: "resolved";
  readonly observations: readonly LcovBranchPoint[];
}

export interface UnresolvedLcovBranchCoverage {
  readonly outcome: "unresolved";
  readonly count: null;
  readonly observations: null;
  readonly reason: string;
}

export type LcovBranchCoverageResult = ResolvedLcovBranchCoverage | UnresolvedLcovBranchCoverage;

const REASON_SOURCE_UNMAPPABLE = "source path cannot be mapped inside the repository";
const REASON_MALFORMED_LINE = "LCOV line record is malformed";
const REASON_INVALID_COUNT = "LCOV execution count is invalid";
const REASON_INCOMPLETE_RECORD = "LCOV source record is incomplete";
const REASON_NO_LINE_DATA = "no usable line coverage records";
const REASON_MALFORMED_BRANCH = "LCOV branch record is malformed";
const REASON_INVALID_TAKEN = "LCOV branch taken count is invalid";
const REASON_NO_BRANCH_DATA = "no usable branch coverage records";
const REASON_MALFORMED_SOURCE = "LCOV source record is malformed";

const UNSIGNED_DECIMAL = /^\d+$/u;
const WINDOWS_ABSOLUTE = /^(?:[A-Za-z]:[\\/]|\\\\)/u;
const URI_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/u;

function unresolvedLine(reason: string): UnresolvedLcovLineCoverage {
  return { outcome: "unresolved", count: null, reason };
}

function unresolvedBranch(reason: string): UnresolvedLcovBranchCoverage {
  return { outcome: "unresolved", count: null, observations: null, reason };
}

function isContainedRelativePath(path: string): boolean {
  return (
    path.length > 0 &&
    path !== "." &&
    path !== ".." &&
    !path.startsWith("../") &&
    !posix.isAbsolute(path) &&
    !WINDOWS_ABSOLUTE.test(path)
  );
}

function canonicalRepositoryPath(path: string): string | null {
  const canonical = path.replaceAll("\\", "/");
  if (
    canonical.length === 0 ||
    canonical.startsWith("/") ||
    /^[A-Za-z]:/u.test(canonical) ||
    URI_SCHEME.test(canonical) ||
    canonical.endsWith("/") ||
    canonical.includes("//")
  ) {
    return null;
  }

  const segments = canonical.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return null;
  }
  return canonical;
}

function mapSourcePath(repositoryRoot: string, sourcePath: string): string | null {
  if (repositoryRoot.length === 0 || sourcePath.length === 0) return null;

  const windowsStyle = WINDOWS_ABSOLUTE.test(repositoryRoot) || WINDOWS_ABSOLUTE.test(sourcePath);
  if (windowsStyle) {
    if (!win32.isAbsolute(repositoryRoot)) return null;
    const candidate = win32.isAbsolute(sourcePath)
      ? win32.relative(win32.resolve(repositoryRoot), win32.resolve(sourcePath))
      : sourcePath;
    const repositoryRelative = candidate.replaceAll("\\", "/");
    if (!isContainedRelativePath(repositoryRelative)) return null;
    return canonicalRepositoryPath(repositoryRelative);
  }

  if (!posix.isAbsolute(repositoryRoot)) return null;
  const candidate = posix.isAbsolute(sourcePath)
    ? posix.relative(posix.resolve(repositoryRoot), posix.resolve(sourcePath))
    : sourcePath;
  if (!isContainedRelativePath(candidate)) return null;
  return canonicalRepositoryPath(candidate);
}

function parsePositiveSafeInteger(token: string): number | null {
  if (!UNSIGNED_DECIMAL.test(token)) return null;
  const value = Number(token);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function parseNonnegativeSafeInteger(token: string): number | null {
  if (!UNSIGNED_DECIMAL.test(token)) return null;
  const value = Number(token);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function addCount(
  counts: Map<string, Map<number, number>>,
  path: string,
  line: number,
  count: number,
): boolean {
  const lines = counts.get(path) ?? new Map<number, number>();
  const next = (lines.get(line) ?? 0) + count;
  if (!Number.isSafeInteger(next) || next < 0) return false;
  lines.set(line, next);
  counts.set(path, lines);
  return true;
}

function compareText(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function normalizeLcovLineCoverage(input: string, repositoryRoot: string): LcovLineCoverageResult {
  const counts = new Map<string, Map<number, number>>();
  let currentSource: string | null = null;
  let currentRecordHadLineData = false;
  let sawCompleteSourceRecord = false;

  const lines = input.split(/\r?\n/u);
  for (const rawLine of lines) {
    if (rawLine.startsWith("SF:")) {
      if (currentSource !== null) return unresolvedLine(REASON_INCOMPLETE_RECORD);
      const mapped = mapSourcePath(repositoryRoot, rawLine.slice(3));
      if (mapped === null) return unresolvedLine(REASON_SOURCE_UNMAPPABLE);
      currentSource = mapped;
      currentRecordHadLineData = false;
      continue;
    }

    if (rawLine === "end_of_record") {
      if (currentSource === null) continue;
      if (!currentRecordHadLineData) return unresolvedLine(REASON_NO_LINE_DATA);
      sawCompleteSourceRecord = true;
      currentSource = null;
      currentRecordHadLineData = false;
      continue;
    }

    if (!rawLine.startsWith("DA:")) continue;
    if (currentSource === null) return unresolvedLine(REASON_MALFORMED_LINE);

    const fields = rawLine.slice(3).split(",");
    if (
      fields.length < 2 ||
      fields.length > 3 ||
      fields[0] === undefined ||
      fields[1] === undefined ||
      (fields.length === 3 && fields[2]?.length === 0)
    ) {
      return unresolvedLine(REASON_MALFORMED_LINE);
    }

    const line = parsePositiveSafeInteger(fields[0]);
    if (line === null) return unresolvedLine(REASON_MALFORMED_LINE);

    const count = parseNonnegativeSafeInteger(fields[1]);
    if (count === null) return unresolvedLine(REASON_INVALID_COUNT);

    if (!addCount(counts, currentSource, line, count)) return unresolvedLine(REASON_INVALID_COUNT);
    currentRecordHadLineData = true;
  }

  if (currentSource !== null) return unresolvedLine(REASON_INCOMPLETE_RECORD);
  if (!sawCompleteSourceRecord || counts.size === 0) return unresolvedLine(REASON_NO_LINE_DATA);

  const points: LcovLinePoint[] = [];
  for (const path of [...counts.keys()].sort()) {
    const linesForPath = counts.get(path)!;
    for (const line of [...linesForPath.keys()].sort((left, right) => left - right)) {
      points.push({
        path,
        line,
        count: linesForPath.get(line)!,
        instrumented: true,
      });
    }
  }

  return { outcome: "resolved", points };
}

export function normalizeLcovBranchCoverage(input: string, repositoryRoot: string): LcovBranchCoverageResult {
  const observations = new Map<string, { path: string; line: number; block_id: string; branch_id: string; taken: number | null; unresolved: boolean }>();
  let currentSource: string | null = null;

  const lines = input.split(/\r?\n/u);
  for (const rawLine of lines) {
    if (rawLine.startsWith("SF:")) {
      if (currentSource !== null) return unresolvedBranch(REASON_INCOMPLETE_RECORD);
      const mapped = mapSourcePath(repositoryRoot, rawLine.slice(3));
      if (mapped === null) return unresolvedBranch(REASON_SOURCE_UNMAPPABLE);
      currentSource = mapped;
      continue;
    }

    if (rawLine === "end_of_record") {
      if (currentSource === null) return unresolvedBranch(REASON_MALFORMED_SOURCE);
      currentSource = null;
      continue;
    }

    if (!rawLine.startsWith("BRDA:")) continue;
    if (currentSource === null) return unresolvedBranch(REASON_MALFORMED_BRANCH);

    const fields = rawLine.slice(5).split(",");
    if (
      fields.length !== 4 ||
      fields[0] === undefined ||
      fields[1] === undefined ||
      fields[2] === undefined ||
      fields[3] === undefined ||
      fields[1].length === 0 ||
      fields[2].length === 0
    ) {
      return unresolvedBranch(REASON_MALFORMED_BRANCH);
    }

    const line = parsePositiveSafeInteger(fields[0]);
    if (line === null) return unresolvedBranch(REASON_MALFORMED_BRANCH);

    const taken = fields[3] === "-" ? null : parseNonnegativeSafeInteger(fields[3]);
    if (fields[3] !== "-" && taken === null) return unresolvedBranch(REASON_INVALID_TAKEN);

    const key = `${currentSource}\0${line}\0${fields[1]}\0${fields[2]}`;
    const existing = observations.get(key);
    if (taken === null) {
      observations.set(key, {
        path: currentSource,
        line,
        block_id: fields[1],
        branch_id: fields[2],
        taken: null,
        unresolved: true,
      });
      continue;
    }

    if (existing?.unresolved === true) continue;
    const next = (existing?.taken ?? 0) + taken;
    if (!Number.isSafeInteger(next) || next < 0) return unresolvedBranch(REASON_INVALID_TAKEN);

    observations.set(key, {
      path: currentSource,
      line,
      block_id: fields[1],
      branch_id: fields[2],
      taken: next,
      unresolved: false,
    });
  }

  if (currentSource !== null) return unresolvedBranch(REASON_INCOMPLETE_RECORD);
  if (observations.size === 0) return unresolvedBranch(REASON_NO_BRANCH_DATA);

  const normalized: LcovBranchPoint[] = [...observations.values()]
    .map((observation): LcovBranchPoint => {
      const taken = observation.unresolved ? null : observation.taken;
      return {
        path: observation.path,
        line: observation.line,
        block_id: observation.block_id,
        branch_id: observation.branch_id,
        taken,
        state: taken === null ? "UNRESOLVED" : taken > 0 ? "EXERCISED" : "NOT_EXERCISED",
        reason: taken === null ? "LCOV branch taken count is unknown" : undefined,
      };
    })
    .sort(
      (left, right) =>
        compareText(left.path, right.path) ||
        left.line - right.line ||
        compareText(left.block_id, right.block_id) ||
        compareText(left.branch_id, right.branch_id),
    );

  return { outcome: "resolved", observations: normalized };
}
