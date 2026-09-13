/**
 * Spec 015 first-wedge slice 8: failure reproduction and minimization
 * evidence.
 *
 * Evolves a captured failure toward confirmed causal evidence without
 * executing anything: an observed failure becomes reproduced only
 * through bounded repeated equivalent failures on the same test and
 * source tree (the Slice 3 deterministic-fail gate), and minimized
 * only when a strictly smaller reproducer preserves the signature.
 * Observed fact stays separated from confirmed repeatability:
 * a failure class seen once is observed, never reproduced, and a
 * reproducer that no longer fails (or no longer shows the signature)
 * counts for nothing. Failure-class equivalence across the
 * signature-to-rerun boundary is caller-attested: reproduction trusts a
 * deterministic-fail on the same test and source, whose own gate
 * already required a uniform failure class within the reruns.
 */

import type { StabilityReport } from "./stability.js";

export type ReproductionStatus =
  | "minimized"
  | "reproduced"
  | "observed"
  | "unresolved";

export interface FailureSignature {
  readonly test_id: string;
  readonly source_id: string;
  readonly failure_class: string | null;
}

export interface MinimizationClaim {
  readonly reproducer_id: string;
  readonly source_id: string;
  readonly original_bytes: number;
  readonly minimized_bytes: number;
  readonly signature_preserved: boolean;
  readonly reproduces: boolean;
}

export interface ReproductionReport {
  readonly status: ReproductionStatus;
  readonly test_id: string;
  readonly source_id: string;
  readonly failure_class: string | null;
  readonly reproducer_ids: readonly string[];
  readonly minimization_ratio: number | null;
}

const STATUSES: readonly ReproductionStatus[] = [
  "minimized",
  "reproduced",
  "observed",
  "unresolved",
];

function requireNonEmptyId(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(`${field} must be non-empty`);
  }
}

function requirePositiveInt(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive integer`);
  }
}

export function createFailureSignature(input: {
  readonly test_id: string;
  readonly source_id: string;
  readonly failure_class: string | null;
}): FailureSignature {
  requireNonEmptyId(input.test_id, "test_id");
  requireNonEmptyId(input.source_id, "source_id");
  if (input.failure_class !== null && input.failure_class.length === 0) {
    throw new TypeError("failure_class must be null or non-empty");
  }
  return {
    failure_class: input.failure_class,
    source_id: input.source_id,
    test_id: input.test_id,
  };
}

export function createMinimizationClaim(input: {
  readonly reproducer_id: string;
  readonly source_id: string;
  readonly original_bytes: number;
  readonly minimized_bytes: number;
  readonly signature_preserved: boolean;
  readonly reproduces: boolean;
}): MinimizationClaim {
  requireNonEmptyId(input.reproducer_id, "reproducer_id");
  requireNonEmptyId(input.source_id, "source_id");
  requirePositiveInt(input.original_bytes, "original_bytes");
  requirePositiveInt(input.minimized_bytes, "minimized_bytes");
  if (input.minimized_bytes > input.original_bytes) {
    throw new TypeError("minimized_bytes cannot exceed original_bytes");
  }
  if (typeof input.signature_preserved !== "boolean") {
    throw new TypeError("signature_preserved must be a boolean");
  }
  if (typeof input.reproduces !== "boolean") {
    throw new TypeError("reproduces must be a boolean");
  }
  return {
    minimized_bytes: input.minimized_bytes,
    original_bytes: input.original_bytes,
    reproducer_id: input.reproducer_id,
    reproduces: input.reproduces,
    signature_preserved: input.signature_preserved,
    source_id: input.source_id,
  };
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

/**
 * Classifies reproduction for one failure signature. A provided
 * stability report must bind to the same test and source; conflicting
 * positive identities throw, while absent (null) identities count as
 * no rerun evidence. Minimization claims from another source tree
 * throw.
 */
export function evaluateReproduction(input: {
  readonly signature: FailureSignature;
  readonly stability: StabilityReport | null;
  readonly minimizations: readonly MinimizationClaim[];
}): ReproductionReport {
  for (const claim of input.minimizations) {
    if (claim.source_id !== input.signature.source_id) {
      throw new TypeError("minimization spans another source tree");
    }
  }
  let repeated = false;
  if (input.stability !== null) {
    const stability = input.stability;
    if (
      (stability.test_id !== null &&
        stability.test_id !== input.signature.test_id) ||
      (stability.source_id !== null &&
        stability.source_id !== input.signature.source_id)
    ) {
      throw new TypeError("stability binds to another test or source");
    }
    repeated =
      stability.test_id !== null &&
      stability.source_id !== null &&
      stability.verdict === "deterministic-fail";
  }

  const valid = input.minimizations.filter(
    (claim) => claim.reproduces && claim.signature_preserved,
  );
  const ratios = valid.map(
    (claim) => claim.minimized_bytes / claim.original_bytes,
  );
  const minimizationRatio =
    ratios.length > 0
      ? (ratios.reduce((min, ratio) => (ratio < min ? ratio : min), 1) as number)
      : null;

  let status: ReproductionStatus;
  if (
    repeated &&
    valid.length > 0 &&
    (minimizationRatio as number) < 1
  ) {
    status = "minimized";
  } else if (repeated) {
    status = "reproduced";
  } else if (input.signature.failure_class !== null) {
    status = "observed";
  } else {
    status = "unresolved";
  }

  return {
    failure_class: input.signature.failure_class,
    minimization_ratio: minimizationRatio,
    reproducer_ids: sortedUnique(valid.map((claim) => claim.reproducer_id)),
    source_id: input.signature.source_id,
    status,
    test_id: input.signature.test_id,
  };
}

/** Minimized and reproduced failures carry confirmed repeatability. */
export function isFailureReproduced(report: ReproductionReport): boolean {
  return report.status === "reproduced" || report.status === "minimized";
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

function readRatio(
  record: Record<string, unknown>,
  field: string,
): number | null {
  const value = record[field];
  if (value === null) return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > 1
  ) {
    throw new TypeError(`${field} must be null or within (0, 1]`);
  }
  return value;
}

/** Deterministic serialization with fixed key order for stable digests. */
export function reproductionReportToJson(
  report: ReproductionReport,
): string {
  if (!STATUSES.includes(report.status)) {
    throw new TypeError(`unknown reproduction status: ${report.status}`);
  }
  requireNonEmptyId(report.test_id, "test_id");
  requireNonEmptyId(report.source_id, "source_id");
  if (
    report.failure_class !== null &&
    report.failure_class.length === 0
  ) {
    throw new TypeError("failure_class must be null or non-empty");
  }
  if (report.status === "minimized") {
    if (report.reproducer_ids.length === 0) {
      throw new TypeError("a minimized report names its reproducers");
    }
    if (report.minimization_ratio === null) {
      throw new TypeError("a minimized report carries its ratio");
    }
  }
  return JSON.stringify({
    failure_class: report.failure_class,
    minimization_ratio: report.minimization_ratio,
    reproducer_ids: [...report.reproducer_ids],
    source_id: report.source_id,
    status: report.status,
    test_id: report.test_id,
  });
}

export function reproductionReportFromJson(
  raw: string,
): ReproductionReport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("reproduction JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("reproduction JSON must be an object");
  }
  const statusRaw = parsed.status;
  if (
    typeof statusRaw !== "string" ||
    !STATUSES.includes(statusRaw as ReproductionStatus)
  ) {
    throw new TypeError(`unknown reproduction status: ${String(statusRaw)}`);
  }
  const report: ReproductionReport = {
    failure_class: readStringOrNull(parsed, "failure_class"),
    minimization_ratio: readRatio(parsed, "minimization_ratio"),
    reproducer_ids: readStringArray(parsed, "reproducer_ids"),
    source_id: readString(parsed, "source_id"),
    status: statusRaw as ReproductionStatus,
    test_id: readString(parsed, "test_id"),
  };
  reproductionReportToJson(report);
  return report;
}
