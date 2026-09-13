/**
 * Spec 015 first-wedge slice 3: bounded-rerun stability classification.
 *
 * Evaluates a sequence of execution observations for one exact candidate
 * against one exact source tree and classifies stability without executing
 * anything, reading repository state, or manufacturing PASS. A failure
 * followed by a pass is contradictory evidence (flaky), never a
 * deterministic pass: reruns characterize stability; they do not erase
 * history and they never convert a failure to PASS by repetition.
 *
 * Binding rules: every observation in one evaluation must belong to the
 * same exact source tree, candidate, and test. Mixing observations from
 * unrelated source trees or candidates is cross-tree contamination and
 * fails closed. Environment fingerprints may differ across observations;
 * that is exactly what separates flaky (contradiction under one
 * environment) from environment-sensitive (consistent divergence across
 * materially different environments).
 */

export type StabilityOutcome = "pass" | "fail" | "unavailable";

export type StabilityVerdict =
  | "deterministic-pass"
  | "deterministic-fail"
  | "flaky"
  | "environment-sensitive"
  | "unavailable"
  | "not-run"
  | "insufficient-evidence";

export interface StabilityObservation {
  readonly run_index: number;
  readonly source_id: string;
  readonly candidate_id: string;
  readonly test_id: string;
  readonly environment_id: string;
  readonly outcome: StabilityOutcome;
  readonly failure_class: string | null;
  readonly duration_ms: number | null;
}

export interface StabilityReport {
  readonly verdict: StabilityVerdict;
  readonly source_id: string | null;
  readonly candidate_id: string | null;
  readonly test_id: string | null;
  readonly runs: number;
  readonly passes: number;
  readonly failures: number;
  readonly unavailable: number;
  readonly environments: readonly string[];
  readonly required_runs: number;
  readonly max_runs: number;
}

const OUTCOMES: readonly StabilityOutcome[] = ["pass", "fail", "unavailable"];

const VERDICTS: readonly StabilityVerdict[] = [
  "deterministic-pass",
  "deterministic-fail",
  "flaky",
  "environment-sensitive",
  "unavailable",
  "not-run",
  "insufficient-evidence",
];

function requireNonEmptyId(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(`${field} must be non-empty`);
  }
}

function requireRerunBounds(requiredRuns: number, maxRuns: number): void {
  if (!Number.isInteger(requiredRuns) || requiredRuns < 2) {
    throw new TypeError("required_runs must be an integer >= 2");
  }
  if (!Number.isInteger(maxRuns) || maxRuns < requiredRuns) {
    throw new TypeError("max_runs must be an integer >= required_runs");
  }
}

function requireObservationShape(observation: StabilityObservation): void {
  if (!Number.isInteger(observation.run_index) || observation.run_index < 0) {
    throw new TypeError("run_index must be an integer >= 0");
  }
  requireNonEmptyId(observation.source_id, "source_id");
  requireNonEmptyId(observation.candidate_id, "candidate_id");
  requireNonEmptyId(observation.test_id, "test_id");
  requireNonEmptyId(observation.environment_id, "environment_id");
  if (!OUTCOMES.includes(observation.outcome)) {
    throw new TypeError(`unknown stability outcome: ${observation.outcome}`);
  }
  if (observation.outcome === "fail") {
    if (
      observation.failure_class !== null &&
      observation.failure_class.length === 0
    ) {
      throw new TypeError("failure_class must be null or non-empty");
    }
  } else if (observation.failure_class !== null) {
    throw new TypeError("only a fail observation may carry failure_class");
  }
  if (observation.outcome === "unavailable") {
    if (observation.duration_ms !== null) {
      throw new TypeError("an unavailable observation carries no duration");
    }
  } else if (
    observation.duration_ms !== null &&
    (!Number.isFinite(observation.duration_ms) ||
      observation.duration_ms < 0)
  ) {
    throw new TypeError("duration_ms must be null or a finite number >= 0");
  }
}

/**
 * Records one execution observation. Sequence-level invariants (dense
 * run_index order, single source/candidate/test identity, rerun bound)
 * are enforced by evaluateStability, not here.
 */
export function createStabilityObservation(input: {
  readonly run_index: number;
  readonly source_id: string;
  readonly candidate_id: string;
  readonly test_id: string;
  readonly environment_id: string;
  readonly outcome: StabilityOutcome;
  readonly failure_class: string | null;
  readonly duration_ms: number | null;
}): StabilityObservation {
  const observation: StabilityObservation = {
    candidate_id: input.candidate_id,
    duration_ms: input.duration_ms,
    environment_id: input.environment_id,
    failure_class: input.failure_class,
    outcome: input.outcome,
    run_index: input.run_index,
    source_id: input.source_id,
    test_id: input.test_id,
  };
  requireObservationShape(observation);
  return observation;
}

interface EnvironmentGroup {
  passes: number;
  failures: number;
  failureClasses: (string | null)[];
}

function distinctFailureClasses(classes: readonly (string | null)[]): number {
  const distinct: (string | null)[] = [];
  for (const entry of classes) {
    if (!distinct.some((known) => known === entry)) {
      distinct.push(entry);
    }
  }
  return distinct.length;
}

function buildReport(input: {
  readonly verdict: StabilityVerdict;
  readonly source_id: string | null;
  readonly candidate_id: string | null;
  readonly test_id: string | null;
  readonly runs: number;
  readonly passes: number;
  readonly failures: number;
  readonly unavailable: number;
  readonly environments: readonly string[];
  readonly required_runs: number;
  readonly max_runs: number;
}): StabilityReport {
  return {
    candidate_id: input.candidate_id,
    environments: [...input.environments],
    failures: input.failures,
    max_runs: input.max_runs,
    passes: input.passes,
    required_runs: input.required_runs,
    runs: input.runs,
    source_id: input.source_id,
    test_id: input.test_id,
    unavailable: input.unavailable,
    verdict: input.verdict,
  };
}

/**
 * Classifies stability for one exact candidate on one exact source tree.
 * Deterministic: the same observation sequence always yields the same
 * report. Fail-closed: mixed identities, gapped run indexes, unknown
 * outcomes, and observations beyond max_runs raise TypeError instead of
 * producing a verdict. Unavailable observations are preserved in the
 * report counts but never count as valid stability evidence.
 */
export function evaluateStability(input: {
  readonly observations: readonly StabilityObservation[];
  readonly required_runs: number;
  readonly max_runs: number;
}): StabilityReport {
  requireRerunBounds(input.required_runs, input.max_runs);
  const observations = [...input.observations];
  if (observations.length === 0) {
    return buildReport({
      candidate_id: null,
      environments: [],
      failures: 0,
      max_runs: input.max_runs,
      passes: 0,
      required_runs: input.required_runs,
      runs: 0,
      source_id: null,
      test_id: null,
      unavailable: 0,
      verdict: "not-run",
    });
  }
  if (observations.length > input.max_runs) {
    throw new TypeError(
      `observations exceed max_runs (${observations.length} > ${input.max_runs})`,
    );
  }

  const first = observations[0];
  if (first === undefined) {
    throw new TypeError("observations must contain a first entry");
  }
  requireObservationShape(first);
  if (first.run_index !== 0) {
    throw new TypeError("run_index must start at 0 and stay dense in order");
  }

  const environments = new Set<string>([first.environment_id]);
  let passes = 0;
  let failures = 0;
  let unavailableCount = 0;
  const byEnvironment = new Map<string, EnvironmentGroup>();
  const recordValid = (observation: StabilityObservation): void => {
    let group = byEnvironment.get(observation.environment_id);
    if (group === undefined) {
      group = { failureClasses: [], failures: 0, passes: 0 };
      byEnvironment.set(observation.environment_id, group);
    }
    if (observation.outcome === "pass") {
      group.passes += 1;
    } else {
      group.failures += 1;
      group.failureClasses.push(observation.failure_class);
    }
  };
  if (first.outcome === "pass") {
    passes += 1;
    recordValid(first);
  } else if (first.outcome === "fail") {
    failures += 1;
    recordValid(first);
  } else {
    unavailableCount += 1;
  }

  for (let index = 1; index < observations.length; index += 1) {
    const observation = observations[index];
    if (observation === undefined) {
      throw new TypeError(`missing observation at run_index ${index}`);
    }
    requireObservationShape(observation);
    if (observation.run_index !== index) {
      throw new TypeError(
        `run_index must be dense in order (expected ${index})`,
      );
    }
    if (
      observation.source_id !== first.source_id ||
      observation.candidate_id !== first.candidate_id ||
      observation.test_id !== first.test_id
    ) {
      throw new TypeError(
        "observations span more than one source, candidate, or test",
      );
    }
    environments.add(observation.environment_id);
    if (observation.outcome === "pass") {
      passes += 1;
      recordValid(observation);
    } else if (observation.outcome === "fail") {
      failures += 1;
      recordValid(observation);
    } else {
      unavailableCount += 1;
    }
  }

  const orderedEnvironments = [...environments].sort();
  const valid = passes + failures;
  const base = {
    candidate_id: first.candidate_id,
    environments: orderedEnvironments,
    failures,
    max_runs: input.max_runs,
    passes,
    required_runs: input.required_runs,
    runs: observations.length,
    source_id: first.source_id,
    test_id: first.test_id,
    unavailable: unavailableCount,
  };

  if (valid === 0) {
    return buildReport({ ...base, verdict: "unavailable" });
  }
  if (valid < 2) {
    return buildReport({ ...base, verdict: "insufficient-evidence" });
  }
  for (const group of byEnvironment.values()) {
    if (group.passes > 0 && group.failures > 0) {
      return buildReport({ ...base, verdict: "flaky" });
    }
    if (distinctFailureClasses(group.failureClasses) > 1) {
      return buildReport({ ...base, verdict: "flaky" });
    }
  }
  const allFailureClasses: (string | null)[] = [];
  for (const group of byEnvironment.values()) {
    allFailureClasses.push(...group.failureClasses);
  }
  if (distinctFailureClasses(allFailureClasses) > 1) {
    return buildReport({ ...base, verdict: "flaky" });
  }
  if (valid < input.required_runs) {
    return buildReport({ ...base, verdict: "insufficient-evidence" });
  }
  const environmentOutcomes = new Set<string>();
  for (const group of byEnvironment.values()) {
    environmentOutcomes.add(group.failures > 0 ? "fail" : "pass");
  }
  if (environmentOutcomes.has("pass") && environmentOutcomes.has("fail")) {
    return buildReport({ ...base, verdict: "environment-sensitive" });
  }
  if (failures > 0) {
    return buildReport({ ...base, verdict: "deterministic-fail" });
  }
  return buildReport({ ...base, verdict: "deterministic-pass" });
}

/** Deterministic stability in either direction: repeated pass or repeated fail. */
export function isDeterministicStability(report: StabilityReport): boolean {
  return (
    report.verdict === "deterministic-pass" ||
    report.verdict === "deterministic-fail"
  );
}

/** Only a deterministic pass may later proceed toward discrimination proof. */
export function isStablePass(report: StabilityReport): boolean {
  return report.verdict === "deterministic-pass";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringOrNull(
  record: Record<string, unknown>,
  field: string,
): string | null {
  const value = record[field];
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new TypeError(`${field} must be a string or null`);
  }
  return value;
}

function readCount(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new TypeError(`${field} must be an integer >= 0`);
  }
  return value as number;
}

function readStringArray(
  record: Record<string, unknown>,
  field: string,
): string[] {
  const value = record[field];
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new TypeError(`${field} must contain only non-empty strings`);
    }
    result.push(entry);
  }
  return result;
}

/** Deterministic serialization with fixed key order for stable digests. */
export function stabilityReportToJson(report: StabilityReport): string {
  if (!VERDICTS.includes(report.verdict)) {
    throw new TypeError(`unknown stability verdict: ${report.verdict}`);
  }
  if (report.verdict === "not-run") {
    if (
      report.source_id !== null ||
      report.candidate_id !== null ||
      report.test_id !== null ||
      report.runs !== 0 ||
      report.passes !== 0 ||
      report.failures !== 0 ||
      report.unavailable !== 0 ||
      report.environments.length !== 0
    ) {
      throw new TypeError("a not-run report carries no bound evidence");
    }
  } else {
    requireNonEmptyId(report.source_id ?? "", "source_id");
    requireNonEmptyId(report.candidate_id ?? "", "candidate_id");
    requireNonEmptyId(report.test_id ?? "", "test_id");
    if (report.runs <= 0) {
      throw new TypeError("an evaluated report must carry observations");
    }
  }
  if (
    report.passes + report.failures + report.unavailable !==
    report.runs
  ) {
    throw new TypeError("report counts must sum to runs");
  }
  requireRerunBounds(report.required_runs, report.max_runs);
  return JSON.stringify({
    candidate_id: report.candidate_id,
    environments: [...report.environments],
    failures: report.failures,
    max_runs: report.max_runs,
    passes: report.passes,
    required_runs: report.required_runs,
    runs: report.runs,
    source_id: report.source_id,
    test_id: report.test_id,
    unavailable: report.unavailable,
    verdict: report.verdict,
  });
}

export function stabilityReportFromJson(raw: string): StabilityReport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("stability JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("stability JSON must be an object");
  }
  const verdictRaw = parsed.verdict;
  if (typeof verdictRaw !== "string" || !VERDICTS.includes(verdictRaw as StabilityVerdict)) {
    throw new TypeError(`unknown stability verdict: ${String(verdictRaw)}`);
  }
  const verdict = verdictRaw as StabilityVerdict;
  const environments = readStringArray(parsed, "environments");
  if (new Set(environments).size !== environments.length) {
    throw new TypeError("environments must be unique");
  }
  const sortedEnvironments = [...environments].sort();
  for (let index = 0; index < environments.length; index += 1) {
    if (environments[index] !== sortedEnvironments[index]) {
      throw new TypeError("environments must be sorted");
    }
  }
  const report: StabilityReport = {
    candidate_id: readStringOrNull(parsed, "candidate_id"),
    environments,
    failures: readCount(parsed, "failures"),
    max_runs: readCount(parsed, "max_runs"),
    passes: readCount(parsed, "passes"),
    required_runs: readCount(parsed, "required_runs"),
    runs: readCount(parsed, "runs"),
    source_id: readStringOrNull(parsed, "source_id"),
    test_id: readStringOrNull(parsed, "test_id"),
    unavailable: readCount(parsed, "unavailable"),
    verdict,
  };
  stabilityReportToJson(report);
  return report;
}
