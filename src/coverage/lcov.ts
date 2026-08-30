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

const REASON_SOURCE_UNMAPPABLE = "source path cannot be mapped inside the repository";
const REASON_MALFORMED_LINE = "LCOV line record is malformed";
const REASON_INVALID_COUNT = "LCOV execution count is invalid";
const REASON_INCOMPLETE_RECORD = "LCOV source record is incomplete";
const REASON_NO_LINE_DATA = "no usable line coverage records";

const UNSIGNED_DECIMAL = /^\d+$/u;
const WINDOWS_ABSOLUTE = /^(?:[A-Za-z]:[\\/]|\\\\)/u;
const URI_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/u;

function unresolved(reason: string): UnresolvedLcovLineCoverage {
  return { outcome: "unresolved", count: null, reason };
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
    const root = win32.resolve(repositoryRoot);
    const resolvedSource = win32.isAbsolute(sourcePath)
      ? win32.resolve(sourcePath)
      : win32.resolve(root, sourcePath);
    const repositoryRelative = win32.relative(root, resolvedSource).replaceAll("\\", "/");
    if (!isContainedRelativePath(repositoryRelative)) return null;
    return canonicalRepositoryPath(repositoryRelative);
  }

  if (!posix.isAbsolute(repositoryRoot)) return null;
  const root = posix.resolve(repositoryRoot);
  const resolvedSource = posix.isAbsolute(sourcePath)
    ? posix.resolve(sourcePath)
    : posix.resolve(root, sourcePath);
  const repositoryRelative = posix.relative(root, resolvedSource);
  if (!isContainedRelativePath(repositoryRelative)) return null;
  return canonicalRepositoryPath(repositoryRelative);
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

export function normalizeLcovLineCoverage(input: string, repositoryRoot: string): LcovLineCoverageResult {
  const counts = new Map<string, Map<number, number>>();
  let currentSource: string | null = null;
  let currentRecordHadLineData = false;
  let sawCompleteSourceRecord = false;

  const lines = input.split(/\r?\n/u);
  for (const rawLine of lines) {
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
