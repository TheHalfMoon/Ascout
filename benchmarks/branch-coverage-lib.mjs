import { posix, win32 } from "node:path";

const REASON_SOURCE_UNMAPPABLE = "source path cannot be mapped inside the repository";
const REASON_MALFORMED_BRANCH = "LCOV branch record is malformed";
const REASON_MALFORMED_SOURCE = "LCOV source record is malformed";
const REASON_INVALID_TAKEN = "LCOV branch taken count is invalid";
const REASON_INCOMPLETE_RECORD = "LCOV source record is incomplete";
const REASON_NO_BRANCH_DATA = "no usable branch coverage records";

const UNSIGNED_DECIMAL = /^\d+$/u;
const WINDOWS_ABSOLUTE = /^(?:[A-Za-z]:[\\/]|\\\\)/u;
const URI_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/u;

function unresolved(reason) {
  return { outcome: "unresolved", observations: null, reason };
}

function isContainedRelativePath(path) {
  return (
    path.length > 0 &&
    path !== "." &&
    path !== ".." &&
    !path.startsWith("../") &&
    !posix.isAbsolute(path) &&
    !WINDOWS_ABSOLUTE.test(path)
  );
}

function canonicalRepositoryPath(path) {
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

function mapSourcePath(repositoryRoot, sourcePath) {
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

function parsePositiveSafeInteger(token) {
  if (!UNSIGNED_DECIMAL.test(token)) return null;
  const value = Number(token);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function parseNonnegativeSafeInteger(token) {
  if (!UNSIGNED_DECIMAL.test(token)) return null;
  const value = Number(token);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function compareText(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function identityKey(path, line, blockId, branchId) {
  return JSON.stringify([path, line, blockId, branchId]);
}

function addObservation(observations, path, line, blockId, branchId, taken) {
  const key = identityKey(path, line, blockId, branchId);
  const existing = observations.get(key);

  if (taken === null) {
    observations.set(key, {
      path,
      line,
      block_id: blockId,
      branch_id: branchId,
      taken: null,
      unresolved: true,
    });
    return true;
  }

  if (existing?.unresolved === true) return true;
  const next = (existing?.taken ?? 0) + taken;
  if (!Number.isSafeInteger(next) || next < 0) return false;

  observations.set(key, {
    path,
    line,
    block_id: blockId,
    branch_id: branchId,
    taken: next,
    unresolved: false,
  });
  return true;
}

function stateFor(taken) {
  if (taken === null) return "BRANCH_UNRESOLVED";
  return taken > 0 ? "BRANCH_EXERCISED" : "BRANCH_NOT_EXERCISED";
}

export function normalizeLcovBranchCoverage(input, repositoryRoot) {
  const observations = new Map();
  let currentSource = null;

  for (const rawLine of input.split(/\r?\n/u)) {
    if (rawLine.startsWith("SF:")) {
      if (currentSource !== null) return unresolved(REASON_INCOMPLETE_RECORD);
      const mapped = mapSourcePath(repositoryRoot, rawLine.slice(3));
      if (mapped === null) return unresolved(REASON_SOURCE_UNMAPPABLE);
      currentSource = mapped;
      continue;
    }

    if (rawLine === "end_of_record") {
      if (currentSource === null) return unresolved(REASON_MALFORMED_SOURCE);
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
    .map((observation) => {
      const taken = observation.unresolved ? null : observation.taken;
      return {
        path: observation.path,
        line: observation.line,
        block_id: observation.block_id,
        branch_id: observation.branch_id,
        taken,
        state: stateFor(taken),
        ...(taken === null ? { reason: "LCOV branch taken count is unknown" } : {}),
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

export const __test = { compareText, mapSourcePath, stateFor };
