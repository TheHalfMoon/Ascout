/**
 * Spec 016 P016-09: synthetic browser benchmark evaluation.
 *
 * This module evaluates Ascout-owned synthetic benchmark cases
 * against frozen oracles and computes the nine canonical integrity
 * gates. It executes nothing itself: the integration test drives
 * fixture pages through the pinned adapter plus the P016-05/06/07/08
 * evidence modules, then this module judges the recorded results.
 *
 * Authority rules enforced here:
 *
 * - oracles are frozen per case (`clean`, `defect_detected`,
 *   `recovery_visible`, `semantic_drift`); evaluation never rewrites
 *   an oracle to match an observation;
 * - pass-class verdicts on defect/drift oracles count
 *   `fabricated_pass` — detection failures are gates, not metrics;
 * - recovery oracles require visible failed attempts AND visible
 *   recovery attempts; invisible recovery is a failed acceptance;
 * - semantic-drift oracles require the `SEMANTIC_DRIFT_DETECTED`
 *   marker plus a drift verdict; anything else fails acceptance;
 * - manifest-listed cases without results count
 *   `hidden_applicable_not_run` — omission can never qualify;
 * - cache/model authority grants are measured fields: this wedge
 *   carries no cache and no models, so honest results carry zero,
 *   and any future grant counts immediately;
 * - Ascout-owned normalized outputs are scanned for secret markers;
 *   any match counts `secret_leakage_from_ascout_owned_artifacts`;
 * - gates are counts that must all be zero; the report carries the
 *   counts, the acceptance reasons, and a defect-recall metric that
 *   can never override a gate failure.
 */

import { createHash } from "node:crypto";

export type BenchmarkOracle =
  | "clean"
  | "defect_detected"
  | "recovery_visible"
  | "semantic_drift";

export type BenchmarkCaseVerdict =
  | "clean"
  | "pass_with_recovery"
  | "blocked"
  | "failed"
  | "semantic_drift_detected";

export interface BenchmarkCaseResult {
  readonly case_id: string;
  readonly case_revision: number;
  readonly session_id: string;
  readonly source_identity: string;
  readonly oracle: BenchmarkOracle;
  readonly verdict: BenchmarkCaseVerdict;
  readonly failed_attempts_visible: number;
  readonly recovery_attempts_visible: number;
  readonly recovery_history_erasure: number;
  readonly semantic_unrevalidated: boolean;
  readonly cross_tree_records: number;
  readonly unbound_records: number;
  readonly cache_pass_grants: number;
  readonly owned_outputs: readonly string[];
  readonly uncalibrated_model_passes: number;
  readonly drift_marker: string | null;
}

export interface IntegrityGateCounts {
  readonly fabricated_pass: number;
  readonly hidden_applicable_not_run: number;
  readonly cross_tree_evidence_leakage: number;
  readonly source_binding_violation: number;
  readonly silent_semantic_heal: number;
  readonly cache_authority_escalation: number;
  readonly secret_leakage_from_ascout_owned_artifacts: number;
  readonly unqualified_model_only_pass: number;
  readonly recovery_history_erasure: number;
}

export interface BenchmarkReport {
  readonly report_id: string;
  readonly source_identity: string;
  readonly manifest_id: string;
  readonly manifest_revision: number;
  readonly results: readonly BenchmarkCaseResult[];
  readonly gates: IntegrityGateCounts;
  readonly acceptance_reasons: readonly string[];
  readonly defect_recall: number | null;
  readonly qualifies: boolean;
}

export interface MissingStepsDecision {
  readonly drift: boolean;
  readonly marker: string | null;
  readonly missing: readonly string[];
  readonly unexpected: readonly string[];
}

export interface ManifestCase {
  readonly case_id: string;
  readonly case_revision: number;
  readonly oracle: BenchmarkOracle;
  readonly fixture: string | null;
}

export interface BenchmarkManifest {
  readonly manifest_id: string;
  readonly manifest_revision: number;
  readonly cases: readonly ManifestCase[];
}

export const SEMANTIC_DRIFT_DETECTED = "SEMANTIC_DRIFT_DETECTED";
export const BENCHMARK_CASE_REJECTED = "E_BENCHMARK_CASE_REJECTED";
export const BENCHMARK_MANIFEST_REJECTED = "E_BENCHMARK_MANIFEST_REJECTED";

const BENCHMARK_ORACLES: readonly BenchmarkOracle[] = [
  "clean",
  "defect_detected",
  "recovery_visible",
  "semantic_drift",
];

const BENCHMARK_VERDICTS: readonly BenchmarkCaseVerdict[] = [
  "clean",
  "pass_with_recovery",
  "blocked",
  "failed",
  "semantic_drift_detected",
];

const PASS_CLASS_VERDICTS: readonly BenchmarkCaseVerdict[] = [
  "clean",
  "pass_with_recovery",
];

const DETECTED_VERDICTS: readonly BenchmarkCaseVerdict[] = [
  "blocked",
  "failed",
  "semantic_drift_detected",
];

const SECRET_MARKERS: readonly RegExp[] = [
  /\bghp_[A-Za-z0-9]{20,}/,
  /\bgho_[A-Za-z0-9]{20,}/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
  /\bsk-(live|test)-[A-Za-z0-9]{10,}/,
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/,
];

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function requireId(value: string, field: string): void {
  if (value.length === 0 || !/^\S+$/.test(value)) {
    throw new TypeError(`${field} must be a non-empty canonical id`);
  }
}

function requireOracle(value: string): BenchmarkOracle {
  const found = BENCHMARK_ORACLES.find((entry) => entry === value);
  if (found === undefined) {
    throw new TypeError(
      `${BENCHMARK_CASE_REJECTED}: unknown benchmark oracle: ${value}`,
    );
  }
  return found;
}

function requireVerdict(value: string): BenchmarkCaseVerdict {
  const found = BENCHMARK_VERDICTS.find((entry) => entry === value);
  if (found === undefined) {
    throw new TypeError(
      `${BENCHMARK_CASE_REJECTED}: unknown benchmark verdict: ${value}`,
    );
  }
  return found;
}

function requireCount(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(
      `${BENCHMARK_CASE_REJECTED}: ${field} must be a non-negative integer`,
    );
  }
}

/**
 * Records one executed case result. Counts must be non-negative
 * integers, the drift marker must be null or exactly
 * `SEMANTIC_DRIFT_DETECTED`, and owned outputs must be strings
 * (their secret scan happens at gate evaluation, honestly counting
 * whatever is present).
 */
export function createCaseResult(input: {
  readonly case_id: string;
  readonly case_revision: number;
  readonly session_id: string;
  readonly source_identity: string;
  readonly oracle: string;
  readonly verdict: string;
  readonly failed_attempts_visible: number;
  readonly recovery_attempts_visible: number;
  readonly recovery_history_erasure: number;
  readonly semantic_unrevalidated: boolean;
  readonly cross_tree_records: number;
  readonly unbound_records: number;
  readonly cache_pass_grants: number;
  readonly owned_outputs: readonly string[];
  readonly uncalibrated_model_passes: number;
  readonly drift_marker: string | null;
}): BenchmarkCaseResult {
  requireId(input.case_id, "case_id");
  requireId(input.session_id, "session_id");
  requireId(input.source_identity, "source_identity");
  if (!Number.isSafeInteger(input.case_revision) || input.case_revision < 1) {
    throw new TypeError(
      `${BENCHMARK_CASE_REJECTED}: case_revision must be a positive integer`,
    );
  }
  const oracle = requireOracle(input.oracle);
  const verdict = requireVerdict(input.verdict);
  requireCount(input.failed_attempts_visible, "failed_attempts_visible");
  requireCount(input.recovery_attempts_visible, "recovery_attempts_visible");
  requireCount(input.recovery_history_erasure, "recovery_history_erasure");
  requireCount(input.cross_tree_records, "cross_tree_records");
  requireCount(input.unbound_records, "unbound_records");
  requireCount(input.cache_pass_grants, "cache_pass_grants");
  requireCount(input.uncalibrated_model_passes, "uncalibrated_model_passes");
  if (typeof input.semantic_unrevalidated !== "boolean") {
    throw new TypeError(
      `${BENCHMARK_CASE_REJECTED}: semantic_unrevalidated must be a boolean`,
    );
  }
  for (const output of input.owned_outputs) {
    if (typeof output !== "string") {
      throw new TypeError(
        `${BENCHMARK_CASE_REJECTED}: owned outputs must be strings`,
      );
    }
  }
  if (
    input.drift_marker !== null &&
    input.drift_marker !== SEMANTIC_DRIFT_DETECTED
  ) {
    throw new TypeError(
      `${BENCHMARK_CASE_REJECTED}: drift marker must be null or ${SEMANTIC_DRIFT_DETECTED}`,
    );
  }
  return {
    cache_pass_grants: input.cache_pass_grants,
    case_id: input.case_id,
    case_revision: input.case_revision,
    cross_tree_records: input.cross_tree_records,
    drift_marker: input.drift_marker,
    failed_attempts_visible: input.failed_attempts_visible,
    oracle,
    owned_outputs: [...input.owned_outputs],
    recovery_attempts_visible: input.recovery_attempts_visible,
    recovery_history_erasure: input.recovery_history_erasure,
    semantic_unrevalidated: input.semantic_unrevalidated,
    session_id: input.session_id,
    source_identity: input.source_identity,
    unbound_records: input.unbound_records,
    uncalibrated_model_passes: input.uncalibrated_model_passes,
    verdict,
  };
}

/**
 * Compares required flow steps against observed steps. Missing or
 * unexpected steps both constitute semantic drift and surface the
 * `SEMANTIC_DRIFT_DETECTED` marker; exact agreement yields null.
 */
export function detectMissingSteps(
  required_steps: readonly string[],
  observed_steps: readonly string[],
): MissingStepsDecision {
  if (required_steps.length === 0) {
    throw new TypeError("required steps must be non-empty");
  }
  for (const step of [...required_steps, ...observed_steps]) {
    requireId(step, "flow step");
  }
  const observed = new Set(observed_steps);
  const required = new Set(required_steps);
  const missing = required_steps.filter((step) => !observed.has(step));
  const unexpected = observed_steps.filter((step) => !required.has(step));
  const drift = missing.length > 0 || unexpected.length > 0;
  return {
    drift,
    marker: drift ? SEMANTIC_DRIFT_DETECTED : null,
    missing: [...missing].sort(compareText),
    unexpected: [...unexpected].sort(compareText),
  };
}

function countSecretOutputs(outputs: readonly string[]): number {
  let leaked = 0;
  for (const output of outputs) {
    if (SECRET_MARKERS.some((marker) => marker.test(output))) {
      leaked += 1;
    }
  }
  return leaked;
}

/**
 * Computes the nine canonical integrity gates over executed results
 * plus the manifest-required case list. Pass-class verdicts on
 * defect/drift oracles count fabricated_pass; unrevalidated
 * semantic recovery under a pass-class verdict counts
 * silent_semantic_heal; required cases without results count
 * hidden_applicable_not_run; measurement fields sum directly.
 */
export function evaluateIntegrityGates(
  results: readonly BenchmarkCaseResult[],
  required_case_ids: readonly string[],
): IntegrityGateCounts {
  const seen = new Set<string>();
  for (const result of results) {
    if (seen.has(result.case_id)) {
      throw new TypeError(`duplicate benchmark result: ${result.case_id}`);
    }
    seen.add(result.case_id);
  }
  let fabricated_pass = 0;
  let cross_tree_evidence_leakage = 0;
  let source_binding_violation = 0;
  let silent_semantic_heal = 0;
  let cache_authority_escalation = 0;
  let secret_leakage_from_ascout_owned_artifacts = 0;
  let unqualified_model_only_pass = 0;
  let recovery_history_erasure = 0;
  for (const result of results) {
    const passClass = (PASS_CLASS_VERDICTS as readonly string[]).includes(
      result.verdict,
    );
    if (
      passClass &&
      (result.oracle === "defect_detected" ||
        result.oracle === "semantic_drift")
    ) {
      fabricated_pass += 1;
    }
    if (result.semantic_unrevalidated && passClass) {
      silent_semantic_heal += 1;
    }
    cross_tree_evidence_leakage += result.cross_tree_records;
    source_binding_violation += result.unbound_records;
    cache_authority_escalation += result.cache_pass_grants;
    secret_leakage_from_ascout_owned_artifacts += countSecretOutputs(
      result.owned_outputs,
    );
    unqualified_model_only_pass += result.uncalibrated_model_passes;
    if (result.recovery_history_erasure !== 0) {
      recovery_history_erasure += 1;
    }
  }
  const required = new Set(required_case_ids);
  let hidden_applicable_not_run = 0;
  for (const case_id of required) {
    if (!seen.has(case_id)) {
      hidden_applicable_not_run += 1;
    }
  }
  return {
    cache_authority_escalation,
    cross_tree_evidence_leakage,
    fabricated_pass,
    hidden_applicable_not_run,
    recovery_history_erasure,
    secret_leakage_from_ascout_owned_artifacts,
    silent_semantic_heal,
    source_binding_violation,
    unqualified_model_only_pass,
  };
}

/**
 * Checks one result against its oracle beyond gate counting: clean
 * oracles require exactly clean verdicts; defect oracles require
 * detected verdicts; recovery oracles require visible failed AND
 * recovery attempts; drift oracles require the drift marker plus a
 * drift verdict. Returns reasons (empty means accepted).
 */
export function acceptCaseResult(
  result: BenchmarkCaseResult,
): readonly string[] {
  const reasons: string[] = [];
  const detected = (DETECTED_VERDICTS as readonly string[]).includes(
    result.verdict,
  );
  if (result.oracle === "clean" && result.verdict !== "clean") {
    reasons.push(`${result.case_id}: clean oracle requires a clean verdict`);
  }
  if (result.oracle === "defect_detected" && !detected) {
    reasons.push(`${result.case_id}: defect oracle requires a detected verdict`);
  }
  if (result.oracle === "recovery_visible") {
    if (result.failed_attempts_visible < 1) {
      reasons.push(`${result.case_id}: recovery oracle hides failed attempts`);
    }
    if (result.recovery_attempts_visible < 1) {
      reasons.push(
        `${result.case_id}: recovery oracle hides recovery attempts`,
      );
    }
    if (
      result.verdict !== "pass_with_recovery" &&
      result.verdict !== "blocked" &&
      result.verdict !== "failed"
    ) {
      reasons.push(
        `${result.case_id}: recovery oracle forbids an ordinary clean verdict`,
      );
    }
  }
  if (result.oracle === "semantic_drift") {
    if (result.drift_marker !== SEMANTIC_DRIFT_DETECTED) {
      reasons.push(`${result.case_id}: drift oracle hides the drift marker`);
    }
    if (result.verdict !== "semantic_drift_detected") {
      reasons.push(`${result.case_id}: drift oracle requires a drift verdict`);
    }
  }
  return reasons.sort(compareText);
}

/** True only when every gate is zero. */
export function gatesAllZero(gates: IntegrityGateCounts): boolean {
  return (
    gates.fabricated_pass === 0 &&
    gates.hidden_applicable_not_run === 0 &&
    gates.cross_tree_evidence_leakage === 0 &&
    gates.source_binding_violation === 0 &&
    gates.silent_semantic_heal === 0 &&
    gates.cache_authority_escalation === 0 &&
    gates.secret_leakage_from_ascout_owned_artifacts === 0 &&
    gates.unqualified_model_only_pass === 0 &&
    gates.recovery_history_erasure === 0
  );
}

function defectRecall(
  results: readonly BenchmarkCaseResult[],
): number | null {
  const defectCases = results.filter(
    (result) =>
      result.oracle === "defect_detected" || result.oracle === "semantic_drift",
  );
  if (defectCases.length === 0) {
    return null;
  }
  const detected = defectCases.filter((result) =>
    (DETECTED_VERDICTS as readonly string[]).includes(result.verdict),
  ).length;
  return detected / defectCases.length;
}

/**
 * Assembles the benchmark report: results bind one source, gates
 * evaluate over the manifest-required list, acceptance reasons
 * enumerate, and `qualifies` requires zero gates AND zero reasons.
 * Defect recall is informational and can never override a gate.
 */
export function assembleBenchmarkReport(input: {
  readonly report_id: string;
  readonly source_identity: string;
  readonly manifest: BenchmarkManifest;
  readonly results: readonly BenchmarkCaseResult[];
}): BenchmarkReport {
  requireId(input.report_id, "report_id");
  requireId(input.source_identity, "source_identity");
  const required_case_ids = input.manifest.cases.map((entry) => entry.case_id);
  for (const result of input.results) {
    if (result.source_identity !== input.source_identity) {
      throw new TypeError(
        `${BENCHMARK_CASE_REJECTED}: result ${result.case_id} binds a different source`,
      );
    }
  }
  const gates = evaluateIntegrityGates(input.results, required_case_ids);
  const acceptance_reasons = input.results
    .flatMap(acceptCaseResult)
    .sort(compareText);
  const qualifies = gatesAllZero(gates) && acceptance_reasons.length === 0;
  return {
    acceptance_reasons,
    defect_recall: defectRecall(input.results),
    gates,
    manifest_id: input.manifest.manifest_id,
    manifest_revision: input.manifest.manifest_revision,
    qualifies,
    report_id: input.report_id,
    results: [...input.results],
    source_identity: input.source_identity,
  };
}

function reportToJsonValue(report: BenchmarkReport): unknown {
  return {
    acceptance_reasons: [...report.acceptance_reasons],
    defect_recall: report.defect_recall,
    gates: {
      cache_authority_escalation: report.gates.cache_authority_escalation,
      cross_tree_evidence_leakage: report.gates.cross_tree_evidence_leakage,
      fabricated_pass: report.gates.fabricated_pass,
      hidden_applicable_not_run: report.gates.hidden_applicable_not_run,
      recovery_history_erasure: report.gates.recovery_history_erasure,
      secret_leakage_from_ascout_owned_artifacts:
        report.gates.secret_leakage_from_ascout_owned_artifacts,
      silent_semantic_heal: report.gates.silent_semantic_heal,
      source_binding_violation: report.gates.source_binding_violation,
      unqualified_model_only_pass:
        report.gates.unqualified_model_only_pass,
    },
    manifest_id: report.manifest_id,
    manifest_revision: report.manifest_revision,
    qualifies: report.qualifies,
    report_id: report.report_id,
    results: report.results.map((result) => ({
      cache_pass_grants: result.cache_pass_grants,
      case_id: result.case_id,
      case_revision: result.case_revision,
      cross_tree_records: result.cross_tree_records,
      drift_marker: result.drift_marker,
      failed_attempts_visible: result.failed_attempts_visible,
      oracle: result.oracle,
      owned_outputs: [...result.owned_outputs],
      recovery_attempts_visible: result.recovery_attempts_visible,
      recovery_history_erasure: result.recovery_history_erasure,
      semantic_unrevalidated: result.semantic_unrevalidated,
      session_id: result.session_id,
      source_identity: result.source_identity,
      unbound_records: result.unbound_records,
      uncalibrated_model_passes: result.uncalibrated_model_passes,
      verdict: result.verdict,
    })),
    source_identity: report.source_identity,
  };
}

/** Deterministic report serialization with fixed key order. */
export function benchmarkReportToJson(report: BenchmarkReport): string {
  return JSON.stringify(reportToJsonValue(report));
}

/** Stable sha256 digest over the canonical report serialization. */
export function benchmarkReportDigest(report: BenchmarkReport): string {
  return createHash("sha256")
    .update(benchmarkReportToJson(report), "utf8")
    .digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string") {
    throw new TypeError(`${field} must be a string`);
  }
  return value;
}

function readNullableString(
  record: Record<string, unknown>,
  field: string,
): string | null {
  const value = record[field];
  if (value !== null && typeof value !== "string") {
    throw new TypeError(`${field} must be a string or null`);
  }
  return value;
}

function readNumber(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value !== "number") {
    throw new TypeError(`${field} must be a number`);
  }
  return value;
}

function readBoolean(record: Record<string, unknown>, field: string): boolean {
  const value = record[field];
  if (typeof value !== "boolean") {
    throw new TypeError(`${field} must be a boolean`);
  }
  return value;
}

function readStringArray(
  record: Record<string, unknown>,
  field: string,
): string[] {
  const value = record[field];
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  const items: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      throw new TypeError(`${field} must contain only strings`);
    }
    items.push(entry);
  }
  return items;
}

function readRecordArray(
  record: Record<string, unknown>,
  field: string,
): Record<string, unknown>[] {
  const value = record[field];
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  const items: Record<string, unknown>[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      throw new TypeError(`${field} must contain only objects`);
    }
    items.push(entry);
  }
  return items;
}

function parseCaseResult(entry: Record<string, unknown>): BenchmarkCaseResult {
  return createCaseResult({
    cache_pass_grants: readNumber(entry, "cache_pass_grants"),
    case_id: readString(entry, "case_id"),
    case_revision: readNumber(entry, "case_revision"),
    cross_tree_records: readNumber(entry, "cross_tree_records"),
    drift_marker: readNullableString(entry, "drift_marker"),
    failed_attempts_visible: readNumber(entry, "failed_attempts_visible"),
    oracle: readString(entry, "oracle"),
    owned_outputs: readStringArray(entry, "owned_outputs"),
    recovery_attempts_visible: readNumber(
      entry,
      "recovery_attempts_visible",
    ),
    recovery_history_erasure: readNumber(entry, "recovery_history_erasure"),
    semantic_unrevalidated: readBoolean(entry, "semantic_unrevalidated"),
    session_id: readString(entry, "session_id"),
    source_identity: readString(entry, "source_identity"),
    unbound_records: readNumber(entry, "unbound_records"),
    uncalibrated_model_passes: readNumber(entry, "uncalibrated_model_passes"),
    verdict: readString(entry, "verdict"),
  });
}

/**
 * Strict manifest parsing with full revalidation: manifest shape,
 * unique case ids, known oracles, and positive revisions. Fixture
 * refs must be canonical relative paths or null (assembly-level
 * cases); anything else throws.
 */
export function parseBenchmarkManifest(raw: string): BenchmarkManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError(
      `${BENCHMARK_MANIFEST_REJECTED}: manifest JSON must be parseable`,
    );
  }
  if (!isRecord(parsed)) {
    throw new TypeError(
      `${BENCHMARK_MANIFEST_REJECTED}: manifest JSON must be an object`,
    );
  }
  const manifest_id = readString(parsed, "manifest_id");
  const manifest_revision = readNumber(parsed, "manifest_revision");
  requireId(manifest_id, "manifest_id");
  if (!Number.isSafeInteger(manifest_revision) || manifest_revision < 1) {
    throw new TypeError(
      `${BENCHMARK_MANIFEST_REJECTED}: manifest_revision must be a positive integer`,
    );
  }
  const entries = readRecordArray(parsed, "cases");
  if (entries.length === 0) {
    throw new TypeError(
      `${BENCHMARK_MANIFEST_REJECTED}: manifest must list at least one case`,
    );
  }
  const seen = new Set<string>();
  const cases: ManifestCase[] = entries.map((entry) => {
    const case_id = readString(entry, "case_id");
    const case_revision = readNumber(entry, "case_revision");
    const oracle = requireOracle(readString(entry, "oracle"));
    const fixtureValue = entry.fixture;
    if (fixtureValue !== null && typeof fixtureValue !== "string") {
      throw new TypeError(
        `${BENCHMARK_MANIFEST_REJECTED}: fixture must be a string or null`,
      );
    }
    requireId(case_id, "case_id");
    if (!Number.isSafeInteger(case_revision) || case_revision < 1) {
      throw new TypeError(
        `${BENCHMARK_MANIFEST_REJECTED}: case_revision must be a positive integer`,
      );
    }
    if (fixtureValue !== null) {
      if (
        fixtureValue.length === 0 ||
        fixtureValue.startsWith("/") ||
        fixtureValue.includes("\\") ||
        fixtureValue.includes("..")
      ) {
        throw new TypeError(
          `${BENCHMARK_MANIFEST_REJECTED}: fixture must be a portable relative ref`,
        );
      }
    }
    if (seen.has(case_id)) {
      throw new TypeError(
        `${BENCHMARK_MANIFEST_REJECTED}: duplicate manifest case: ${case_id}`,
      );
    }
    seen.add(case_id);
    return { case_id, case_revision, fixture: fixtureValue, oracle };
  });
  return { cases, manifest_id, manifest_revision };
}
