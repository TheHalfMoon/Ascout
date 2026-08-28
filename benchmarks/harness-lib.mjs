import { createHash } from "node:crypto";
import { isAbsolute, normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const FORBIDDEN_METACHARS = new Set(["|", "&", ";", "<", ">", "`", "$", "(", ")", "\n", "\r", "\0"]);
const MEMBERSHIP_PROXY = fileURLToPath(new URL("./membership-proxy.mjs", import.meta.url));
const SELECTION_COMMAND_PATTERNS = {
  targeted: /targeted[^`;]{0,120}command = `([^`]+)`/,
  full: /project-native full-suite\/reference command = `([^`]+)`/,
  plain: /plain-project[^`;]{0,120}comparator = `([^`]+)`/,
  related: /runner-native related selector = `([^`]+)`/,
};
const GAP_TARGETED_PATTERN = /Pinned T075 targeted oracle command: `([^`]+)`\./;
const GAP_REFERENCE_PATTERN = /Pinned project-native reference command: `([^`]+)`\./;

export class BenchmarkHarnessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "BenchmarkHarnessError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new BenchmarkHarnessError(code, message);
}

export function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

function tokenizeRestricted(command) {
  if (typeof command !== "string" || command.length === 0) {
    fail("invalid_command", "command must be a non-empty string");
  }
  if (command.includes("\0") || command.includes("\n") || command.includes("\r")) {
    fail("invalid_command", "command must be one logical line without NUL");
  }

  const tokens = [];
  let current = "";
  let quote = null;
  let escaped = false;

  const push = () => {
    if (current.length === 0) return;
    tokens.push(current);
    current = "";
  };

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    if (escaped) {
      if (char === "\n" || char === "\r") fail("invalid_command", "escaped newlines are forbidden");
      current += char;
      escaped = false;
      continue;
    }
    if (quote === "single") {
      if (char === "'") quote = null;
      else current += char;
      continue;
    }
    if (quote === "double") {
      if (char === '"') {
        quote = null;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "$" || char === "`" || char === "\n" || char === "\r") {
        fail("invalid_command", "shell interpolation syntax is forbidden");
      } else {
        current += char;
      }
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "'") {
      quote = "single";
      continue;
    }
    if (char === '"') {
      quote = "double";
      continue;
    }
    if (/\s/.test(char)) {
      push();
      continue;
    }
    if (FORBIDDEN_METACHARS.has(char)) {
      fail("invalid_command", `shell metacharacter ${JSON.stringify(char)} is forbidden`);
    }
    current += char;
  }

  if (escaped || quote !== null) fail("invalid_command", "unterminated escape or quote");
  push();
  if (tokens.length === 0) fail("invalid_command", "command produced no tokens");
  return tokens;
}

export function parseRestrictedCommand(command) {
  const tokens = tokenizeRestricted(command);
  const env = {};
  while (tokens.length > 1) {
    const candidate = tokens[0];
    const equal = candidate.indexOf("=");
    if (equal <= 0) break;
    const name = candidate.slice(0, equal);
    if (!ENV_NAME.test(name)) break;
    const value = candidate.slice(equal + 1);
    if (value.includes("\0")) fail("invalid_command", "environment value contains NUL");
    env[name] = value;
    tokens.shift();
  }
  const file = tokens.shift();
  if (!file) fail("invalid_command", "command is missing an executable");
  if (file.includes("/") && !file.startsWith("./node_modules/.bin/")) {
    fail("invalid_command", `path-like executable is not an approved project-local binary: ${file}`);
  }
  return { file, argv: tokens, env };
}

export function extractSelectionCommands(caseRecord) {
  if (caseRecord?.case_class !== "selection") fail("invalid_case", "selection command extraction requires a selection case");
  const procedure = caseRecord?.oracle?.specification?.ground_truth_procedure;
  if (!Array.isArray(procedure)) fail("invalid_case", "selection ground_truth_procedure is missing");
  const extractOne = (label, pattern) => {
    const matches = procedure.map((line) => pattern.exec(line)).filter(Boolean);
    if (matches.length !== 1) {
      fail("invalid_case", `selection case ${caseRecord.case_id} must contain exactly one explicit ${label} command label`);
    }
    return matches[0][1];
  };
  const result = {
    targeted: extractOne("targeted", SELECTION_COMMAND_PATTERNS.targeted),
    full: extractOne("full-suite/reference", SELECTION_COMMAND_PATTERNS.full),
    plain: extractOne("plain-project comparator", SELECTION_COMMAND_PATTERNS.plain),
    related: extractOne("runner-native related", SELECTION_COMMAND_PATTERNS.related),
  };
  for (const value of Object.values(result)) parseRestrictedCommand(value);
  return result;
}

export function extractGapCommands(caseRecord) {
  if (caseRecord?.case_class !== "gap") fail("invalid_case", "gap command extraction requires a gap case");
  const procedure = caseRecord?.oracle?.specification?.ground_truth_procedure;
  const coverage = caseRecord?.oracle?.specification?.coverage_oracle;
  if (!Array.isArray(procedure) || coverage === undefined) fail("invalid_case", "gap oracle specification is incomplete");
  const targetedMatches = procedure.map((line) => GAP_TARGETED_PATTERN.exec(line)).filter(Boolean);
  if (targetedMatches.length !== 1) {
    fail("invalid_case", `gap case ${caseRecord.case_id} must contain exactly one explicit targeted oracle command`);
  }
  const referenceMatches = procedure.map((line) => GAP_REFERENCE_PATTERN.exec(line)).filter(Boolean);
  if (referenceMatches.length > 1) {
    fail("invalid_case", `gap case ${caseRecord.case_id} must not contain more than one explicit project-native test reference`);
  }
  const targeted = targetedMatches[0][1];
  const reference = referenceMatches.length === 1 ? referenceMatches[0][1] : null;
  const fullCoverage = coverage.full_test_coverage_command;
  const nativeCoverage = coverage.project_native_reference_command;
  for (const value of [targeted, fullCoverage, nativeCoverage]) parseRestrictedCommand(value);
  if (reference !== null) parseRestrictedCommand(reference);
  if (coverage.freeze_before_ascout !== true) fail("invalid_case", "gap coverage oracle must freeze before Ascout");
  if (coverage?.artifact?.format !== "lcov") fail("invalid_case", "gap coverage artifact must be LCOV");
  if (coverage?.artifact_digest_algorithm !== "sha256") fail("invalid_case", "gap coverage artifact must use SHA-256");
  return { targeted, reference, fullCoverage, nativeCoverage, artifact: coverage.artifact.path };
}

export function frozenInstallCommand(runtime) {
  if (!runtime || typeof runtime !== "object") fail("invalid_case", "runtime is missing");
  switch (runtime.package_manager) {
    case "npm":
      return { file: "npm", argv: ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], env: {} };
    case "pnpm":
      return { file: "pnpm", argv: ["install", "--frozen-lockfile", "--ignore-scripts"], env: {} };
    case "yarn":
      return { file: "yarn", argv: ["install", "--frozen-lockfile", "--ignore-scripts", "--non-interactive"], env: {} };
    default:
      fail("invalid_case", `unsupported package manager: ${String(runtime.package_manager)}`);
  }
}

export function sanitizedDonorEnvironment({ pathValue, home, temp, commandEnv = {} }) {
  for (const [name, value] of Object.entries(commandEnv)) {
    if (!ENV_NAME.test(name) || typeof value !== "string" || value.includes("\0")) {
      fail("invalid_environment", `invalid command environment entry: ${name}`);
    }
  }
  return {
    PATH: pathValue,
    HOME: home,
    TMPDIR: temp,
    TMP: temp,
    TEMP: temp,
    CI: "true",
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    npm_config_audit: "false",
    npm_config_fund: "false",
    npm_config_update_notifier: "false",
    ...commandEnv,
  };
}

export function assertControllerSecretsAbsent(env) {
  const forbidden = [
    /^GITHUB_TOKEN$/i,
    /^GH_TOKEN$/i,
    /TOKEN$/i,
    /SECRET/i,
    /PASSWORD/i,
    /^AWS_/i,
    /^AZURE_/i,
    /^GOOGLE_/i,
    /^OPENAI_/i,
    /^ANTHROPIC_/i,
    /^NPM_TOKEN$/i,
    /^NODE_AUTH_TOKEN$/i,
  ];
  const leaked = Object.keys(env).filter((name) => forbidden.some((pattern) => pattern.test(name)));
  if (leaked.length > 0) fail("secret_leakage", `donor environment contains forbidden names: ${leaked.sort().join(", ")}`);
}

function canonicalRepoPath(path) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function pathMatchesReviewed(sourcePath, reviewedPaths) {
  const source = canonicalRepoPath(sourcePath);
  return reviewedPaths.some((path) => {
    const expected = canonicalRepoPath(path);
    return source === expected || source.endsWith(`/${expected}`);
  });
}

export function membershipProofCommand(commandText, kind, outputFile) {
  if (kind !== "vitest" && kind !== "jest") fail("invalid_command", `unsupported membership-proof runner: ${String(kind)}`);
  if (typeof outputFile !== "string" || !isAbsolute(outputFile)) fail("invalid_path", "membership proof output must be an absolute path");
  const parsed = parseRestrictedCommand(commandText);
  if (parsed.env.NODE_OPTIONS !== undefined) fail("invalid_command", "reviewed command must not control NODE_OPTIONS during membership proof");
  for (const name of ["ASCOUT_MEMBERSHIP_KIND", "ASCOUT_MEMBERSHIP_OUTPUT", "ASCOUT_MEMBERSHIP_INSTRUMENTED"]) {
    if (parsed.env[name] !== undefined) fail("invalid_command", `reviewed command must not control ${name}`);
  }
  if (parsed.argv.some((value) => value === "--json" || value === "--reporter" || value.startsWith("--reporter=") || value === "--outputFile" || value.startsWith("--outputFile="))) {
    fail("invalid_command", "reviewed command already controls reporter or output-file authority");
  }
  return {
    file: process.execPath,
    argv: [MEMBERSHIP_PROXY, "--kind", kind, "--output", outputFile, "--", parsed.file, ...parsed.argv],
    env: parsed.env,
  };
}

export function proveRunnerMembership(report, regressionTestIds, regressionTestPaths) {
  if (!report || typeof report !== "object" || !Array.isArray(report.testResults)) {
    fail("oracle_membership", "runner membership report is missing testResults");
  }
  if (!Array.isArray(regressionTestIds) || regressionTestIds.length === 0 || regressionTestIds.some((value) => typeof value !== "string" || value.trim().length === 0)) {
    fail("oracle_membership", "reviewed regression_test_ids are invalid");
  }
  if (!Array.isArray(regressionTestPaths) || regressionTestPaths.length === 0 || regressionTestPaths.some((value) => typeof value !== "string" || value.length === 0)) {
    fail("oracle_membership", "reviewed regression test paths are invalid");
  }

  const executedNames = new Set();
  let matchedReviewedFile = false;
  for (const result of report.testResults) {
    if (!result || typeof result !== "object" || typeof result.name !== "string") continue;
    if (!pathMatchesReviewed(result.name, regressionTestPaths)) continue;
    matchedReviewedFile = true;
    if (!Array.isArray(result.assertionResults)) continue;
    for (const assertion of result.assertionResults) {
      if (!assertion || typeof assertion !== "object") continue;
      if (assertion.status !== "passed" && assertion.status !== "failed") continue;
      for (const field of [assertion.title, assertion.fullName]) {
        if (typeof field === "string" && field.trim().length > 0) executedNames.add(field.trim());
      }
    }
  }
  if (!matchedReviewedFile) fail("oracle_membership", "runner membership report contains no reviewed regression-test path");
  return regressionTestIds.every((id) => executedNames.has(id.trim()));
}

export function classifyLcov(lcovText, reviewedLines) {
  if (typeof lcovText !== "string") fail("invalid_lcov", "LCOV input must be text");
  if (!Array.isArray(reviewedLines) || reviewedLines.length === 0) fail("invalid_lcov", "reviewed changed-line set is empty");

  const records = [];
  let current = null;
  for (const rawLine of lcovText.split(/\r?\n/)) {
    if (rawLine.startsWith("SF:")) {
      if (current !== null) fail("invalid_lcov", "nested SF record without end_of_record");
      current = { source: rawLine.slice(3), hits: new Map() };
    } else if (rawLine.startsWith("DA:")) {
      if (current === null) fail("invalid_lcov", "DA record appears before SF");
      const match = /^DA:(\d+),(\d+)(?:,[^,]+)?$/.exec(rawLine);
      if (!match) fail("invalid_lcov", `invalid DA record: ${rawLine}`);
      const line = Number(match[1]);
      const hits = Number(match[2]);
      if (!Number.isSafeInteger(line) || line < 1 || !Number.isSafeInteger(hits) || hits < 0) {
        fail("invalid_lcov", `out-of-range DA record: ${rawLine}`);
      }
      if (current.hits.has(line)) fail("invalid_lcov", `duplicate DA line ${line} for ${current.source}`);
      current.hits.set(line, hits);
    } else if (rawLine === "end_of_record") {
      if (current === null) fail("invalid_lcov", "end_of_record without SF");
      records.push(current);
      current = null;
    }
  }
  if (current !== null) fail("invalid_lcov", "unterminated SF record");

  const results = [];
  for (const item of reviewedLines) {
    const expected = canonicalRepoPath(item.path);
    const matches = records.filter((record) => {
      const source = canonicalRepoPath(record.source);
      return source === expected || source.endsWith(`/${expected}`);
    });
    if (matches.length !== 1) {
      results.push({ path: item.path, line: item.line, classification: "UNRESOLVED", hits: null, reason: matches.length === 0 ? "source_missing" : "source_ambiguous" });
      continue;
    }
    const hits = matches[0].hits.get(item.line);
    if (hits === undefined) {
      results.push({ path: item.path, line: item.line, classification: "UNRESOLVED", hits: null, reason: "line_missing" });
    } else if (hits === 0) {
      results.push({ path: item.path, line: item.line, classification: "NOT_EXERCISED", hits, reason: null });
    } else {
      results.push({ path: item.path, line: item.line, classification: "EXERCISED", hits, reason: null });
    }
  }
  return results;
}

export function assertPathInside(root, candidate) {
  if (typeof root !== "string" || typeof candidate !== "string" || root.length === 0 || candidate.length === 0) {
    fail("invalid_path", "root and candidate must be non-empty strings");
  }
  if (!isAbsolute(root) || !isAbsolute(candidate)) fail("invalid_path", "root and candidate must be absolute");
  const rel = relative(normalize(root), normalize(candidate));
  if (rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))) return;
  fail("path_escape", `path escapes controller root: ${candidate}`);
}

export function validateReplayCase(caseRecord) {
  if (!caseRecord || typeof caseRecord !== "object") fail("invalid_case", "case must be an object");
  if (caseRecord.lifecycle_state !== "CASE_REVIEWED") fail("invalid_case", `${caseRecord.case_id} is not CASE_REVIEWED`);
  if (caseRecord.oracle?.observation !== null) fail("invalid_case", `${caseRecord.case_id} already has an oracle observation`);
  if (caseRecord.reconstruction?.derived_identity?.expected_digest !== null) fail("invalid_case", `${caseRecord.case_id} has a pre-observed derived identity`);
  if (!Array.isArray(caseRecord.paths?.production) || caseRecord.paths.production.length === 0) fail("invalid_case", "production path set is empty");
  if (!Array.isArray(caseRecord.paths?.regression_tests) || caseRecord.paths.regression_tests.length === 0) fail("invalid_case", "regression test path set is empty");
  if (!Array.isArray(caseRecord.oracle?.specification?.regression_test_ids) || caseRecord.oracle.specification.regression_test_ids.length === 0) {
    fail("invalid_case", "regression_test_ids is empty");
  }
  if (caseRecord.case_class === "selection") extractSelectionCommands(caseRecord);
  else if (caseRecord.case_class === "gap") extractGapCommands(caseRecord);
  else fail("invalid_case", `unknown case class: ${String(caseRecord.case_class)}`);
  frozenInstallCommand(caseRecord.runtime);
  return true;
}

export function stableObservationProjection(observation) {
  return {
    reconstruction: observation.reconstruction,
    pre_fix_oracle: observation.pre_fix_oracle,
    fixed_oracle: observation.fixed_oracle,
    full_reference: observation.full_reference,
    related: observation.related,
    ascout: observation.ascout,
    gap_coverage: observation.gap_coverage ?? null,
  };
}

export function observationsDeterministic(observations) {
  if (!Array.isArray(observations) || observations.length < 2) return "unknown";
  const projections = observations.map((value) => canonicalJson(stableObservationProjection(value)));
  return projections.every((value) => value === projections[0]) ? "deterministic" : "nondeterministic";
}
