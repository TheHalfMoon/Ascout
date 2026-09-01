import { posix, win32 } from "node:path";

export interface LcovLinePoint {
  readonly path: string;
  readonly line: number;
  readonly count: number;
  readonly instrumented: true;
}

export interface LcovBranchPoint {
  readonly path: string;
  readonly line: number;
  readonly block_id: string;
  readonly branch_id: string;
  readonly taken: number | null;
  readonly state: "BRANCH_EXERCISED" | "BRANCH_NOT_EXERCISED" | "BRANCH_UNRESOLVED";
  readonly reason?: string;
}

export interface ResolvedLcovLineCoverage {
  readonly outcome: "resolved";
  readonly points: readonly LcovLinePoint[];
}

export interface ResolvedLcovBranchCoverage {
  readonly outcome: "resolved";
  readonly observations: readonly LcovBranchPoint[];
}

export interface UnresolvedLcovCoverage {
  readonly outcome: "unresolved";
  readonly count: null;
  readonly observations?: null;
  readonly reason: string;
}

export type LcovLineCoverageResult = ResolvedLcovLineCoverage | UnresolvedLcovCoverage;
export type LcovBranchCoverageResult = ResolvedLcovBranchCoverage | UnresolvedLcovCoverage;

const REASON_SOURCE_UNMAPPABLE = "source path cannot be mapped inside the repository";
const REASON_MALFORMED_LINE = "LCOV line record is malformed";
const REASON_INVALID_COUNT = "LCOV execution count is invalid";
const REASON_INCOMPLETE_RECORD = "LCOV source record is incomplete";
const REASON_NO_LINE_DATA = "no usable line coverage records";
const REASON_NO_BRANCH_DATA = "no usable branch coverage records";
const REASON_MALFORMED_BRANCH = "LCOV branch record is malformed";
const REASON_INVALID_TAKEN = "LCOV branch taken count is invalid";

const UNSIGNED_DECIMAL = /^\d+$/u;
const WINDOWS_ABSOLUTE = /^(?:[A-Za-z]:[\\/]|\\)/u;
const URI_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/u;

function unresolved(reason: string, overrides: { observations?: null } = {}): UnresolvedLcovCoverage {
  return { outcome: "unresolved", count: null, reason, ...overrides };
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

function compareText(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
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

function addObservation(
  observations: Map<string, LcovBranchPoint>,
  path: string,
  line: number,
  blockId: string,
  branchId: string,
  taken: number | null,
): boolean {
  const key = `${JSON.stringify(path)}:${line}:${JSON.stringify(blockId)}:${JSON.stringify(branchId)}`;
  const existing = observations.get(key);

  if (taken === null) {
    observations.set(key, {
      path,
      line,
      block_id: blockId,
      branch_id: branchId,
      taken: null,
      state: "BRANCH_UNRESOLVED",
      reason: "LCOV branch taken count is unknown",
    });
    return true;
  }

  if (existing?.state === "BRANCH_UNRESOLVED") return true;
  const next = (existing?.taken ?? 0) + taken;
  if (!Number.isSafeInteger(next) || next < 0) return false;

  observations.set(key, {
    path,
    line,
    block_id: blockId,
    branch_id: branchId,
    taken: next,
    state: next > 0 ? "BRANCH_EXERCISED" : "BRANCH_NOT_EXERCISED",
  });
  return true;
}

export function normalizeLcovLineCoverage(input: string, repositoryRoot: string): LcovLineCoverageResult {
  const counts = new Map<string, Map<number, number>>();
  let currentSource: string | null = null;
  let currentRecordHadLineData = false;
  let sawCompleteSourceRecord = false;

  for (const rawLine of input.split(/\r?\n/u)) {
    if (rawLine.startsWith("SF:")) {
      if (currentSource !== null) return unresolved(REASON_INCOMPLETE_RECORD);
      const mapped = mapSourcePath(repositoryRoot, rawLine.slice(3));
      if (mapped === null) return unresolved(REASON_SOURCE_UNMAPPABLE);
      currentSource = mapped;
      currentRecordHadLineData = false;
      continue;
    }

    if (rawLine === "end_of_record") {
      if (currentSource === null) continue;
      if (!currentRecordHadLineData) return unresolved(REASON_NO_LINE_DATA);
      sawCompleteSourceRecord = true;
      currentSource = null;
      currentRecordHadLineData = false;
      continue;
    }

    if (!rawLine.startsWith("DA:")) continue;
    if (currentSource === null) return unresolved(REASON_MALFORMED_LINE);

    const fields = rawLine.slice(3).split(",");
    if (
      fields.length < 2 ||
      fields.length > 3 ||
      fields[0] === undefined ||
      fields[1] === undefined ||
      (fields.length === 3 && fields[2]?.length === 0)
    ) {
      return unresolved(REASON_MALFORMED_LINE);
    }

    const line = parsePositiveSafeInteger(fields[0]);
    if (line === null) return unresolved(REASON_MALFORMED_LINE);

    const count = parseNonnegativeSafeInteger(fields[1]);
    if (count === null) return unresolved(REASON_INVALID_COUNT);

    if (!addCount(counts, currentSource, line, count)) return unresolved(REASON_INVALID_COUNT);
    currentRecordHadLineData = true;
  }

  if (currentSource !== null) return unresolved(REASON_INCOMPLETE_RECORD);
  if (!sawCompleteSourceRecord || counts.size === 0) return unresolved(REASON_NO_LINE_DATA);

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
  const observations = new Map<string, LcovBranchPoint>();
  let currentSource: string | null = null;
  let sawCompleteSourceRecord = false;

  for (const rawLine of input.split(/\r?\n/u)) {
    if (rawLine.startsWith("SF:")) {
      if (currentSource !== null) return unresolved(REASON_INCOMPLETE_RECORD);
      const mapped = mapSourcePath(repositoryRoot, rawLine.slice(3));
      if (mapped === null) return unresolved(REASON_SOURCE_UNMAPPABLE);
      currentSource = mapped;
      continue;
    }

    if (rawLine === "end_of_record") {
      if (currentSource === null) continue;
      sawCompleteSourceRecord = true;
      currentSource = null;
      continue;
    }

    if (!rawLine.startsWith("BRDA:")) continue;
    if (currentSource === null) return unresolved(REASON_MALFORMED_BRANCH);

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
      return unresolved(REASON_MALFORMED_BRANCH);
    }

    const line = parsePositiveSafeInteger(fields[0]);
    if (line === null) return unresolved(REASON_MALFORMED_BRANCH);

    const taken = fields[3] === "-" ? null : parseNonnegativeSafeInteger(fields[3]);
    if (fields[3] !== "-" && taken === null) return unresolved(REASON_INVALID_TAKEN);

    if (!addObservation(observations, currentSource, line, fields[1], fields[2], taken)) {
      return unresolved(REASON_INVALID_TAKEN);
    }
  }

  if (currentSource !== null) return unresolved(REASON_INCOMPLETE_RECORD);
  if (observations.size === 0) return unresolved(REASON_NO_BRANCH_DATA);

  const normalized = [...observations.values()]
    .sort(
      (left, right) =>
        compareText(left.path, right.path) ||
        left.line - right.line ||
        compareText(left.block_id, right.block_id) ||
        compareText(left.branch_id, right.branch_id),
    );

  return { outcome: "resolved", observations: normalized };
}

export const __test = {
  compareText,
  mapSourcePath,
  stateFor: (taken: number | null): "BRANCH_UNRESOLVED" | "BRANCH_EXERCISED" | "BRANCH_NOT_EXERCISED" =>
    taken === null ? "BRANCH_UNRESOLVED" : taken > 0 ? "BRANCH_EXERCISED" : "BRANCH_NOT_EXERCISED",
};
