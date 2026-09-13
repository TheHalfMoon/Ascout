/**
 * Spec 015 first-wedge slice 9: defect report with reproduction evidence
 * plus regression obligation recording.
 *
 * Turns a classified reproduction into an accountable defect record and
 * then into a standing test obligation so the defect stays guarded after
 * repair. The report preserves the reproduction status honestly: an
 * observed-only failure is reportable but never upgraded, and only a
 * reproduced or minimized failure carries confirmed repeatability into
 * the defect. Recording a regression obligation never closes the
 * defect by itself; it opens a TestObligation with defect provenance
 * that later verification must cover.
 */

import {
  createFailureSignature,
  reproductionReportFromJson,
  reproductionReportToJson,
} from "./reproduction.js";
import type {
  FailureSignature,
  ReproductionReport,
} from "./reproduction.js";
import { createTestObligation } from "./obligation.js";
import type { Oracle, TestObligation } from "./obligation.js";

export type DefectStatus = "open" | "regression-recorded";

export interface DefectReport {
  readonly id: string;
  readonly signature: FailureSignature;
  readonly reproduction: ReproductionReport;
  readonly obligation_ids: readonly string[];
  readonly reported_by: string;
  readonly status: DefectStatus;
  readonly regression_obligation_id: string | null;
}

const DEFECT_STATUSES: readonly DefectStatus[] = [
  "open",
  "regression-recorded",
];

function requireNonEmptyId(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(`${field} must be non-empty`);
  }
}

function requireNonEmptyText(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(`${field} must be non-empty`);
  }
}

function requireStringArray(
  value: readonly string[],
  field: string,
): void {
  for (const entry of value) {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new TypeError(`${field} must contain only non-empty strings`);
    }
  }
}

function requireBoundReproduction(
  signature: FailureSignature,
  reproduction: ReproductionReport,
): void {
  if (
    reproduction.test_id !== signature.test_id ||
    reproduction.source_id !== signature.source_id
  ) {
    throw new TypeError("reproduction binds to another test or source");
  }
}

export function createDefectReport(input: {
  readonly id: string;
  readonly signature: FailureSignature;
  readonly reproduction: ReproductionReport;
  readonly obligation_ids?: readonly string[];
  readonly reported_by: string;
}): DefectReport {
  requireNonEmptyId(input.id, "defect id");
  requireBoundReproduction(input.signature, input.reproduction);
  const obligationIds = input.obligation_ids ?? [];
  requireStringArray(obligationIds, "obligation_ids");
  requireNonEmptyText(input.reported_by, "reported_by");
  return {
    id: input.id,
    obligation_ids: [...obligationIds],
    regression_obligation_id: null,
    reported_by: input.reported_by,
    reproduction: input.reproduction,
    signature: input.signature,
    status: "open",
  };
}

/**
 * Opens a standing regression obligation with defect provenance for a
 * repaired defect. Forward-only: a defect records exactly one
 * regression obligation, and recording never marks anything covered.
 */
export function recordRegressionObligation(
  defect: DefectReport,
  input: {
    readonly id: string;
    readonly behavior: string;
    readonly oracle: Oracle;
  },
): { defect: DefectReport; obligation: TestObligation } {
  if (defect.status !== "open") {
    throw new TypeError("regression is already recorded for this defect");
  }
  requireNonEmptyId(input.id, "obligation id");
  const obligation = createTestObligation({
    behavior: input.behavior,
    id: input.id,
    oracle: input.oracle,
    requirement_ids: [`defect:${defect.id}`],
    risk_ids: ["risk:regression"],
  });
  return {
    defect: {
      ...defect,
      regression_obligation_id: obligation.id,
      status: "regression-recorded",
    },
    obligation,
  };
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
    if (typeof entry !== "string") {
      throw new TypeError(`${field} must contain only strings`);
    }
    result.push(entry);
  }
  return result;
}

/** Deterministic serialization with fixed key order for stable digests. */
export function defectReportToJson(defect: DefectReport): string {
  if (!DEFECT_STATUSES.includes(defect.status)) {
    throw new TypeError(`unknown defect status: ${defect.status}`);
  }
  if (defect.status === "open" && defect.regression_obligation_id !== null) {
    throw new TypeError("an open defect names no regression obligation");
  }
  if (
    defect.status === "regression-recorded" &&
    (defect.regression_obligation_id === null ||
      defect.regression_obligation_id.length === 0)
  ) {
    throw new TypeError("a recorded defect names its regression obligation");
  }
  return JSON.stringify({
    failure_signature: {
      failure_class: defect.signature.failure_class,
      source_id: defect.signature.source_id,
      test_id: defect.signature.test_id,
    },
    id: defect.id,
    obligation_ids: [...defect.obligation_ids],
    regression_obligation_id: defect.regression_obligation_id,
    reported_by: defect.reported_by,
    reproduction: JSON.parse(
      reproductionReportToJson(defect.reproduction),
    ) as unknown,
    status: defect.status,
  });
}

export function defectReportFromJson(raw: string): DefectReport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("defect JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("defect JSON must be an object");
  }
  const signatureRaw = parsed.failure_signature;
  if (!isRecord(signatureRaw)) {
    throw new TypeError("defect.failure_signature must be an object");
  }
  const signature = createFailureSignature({
    failure_class: readStringOrNull(signatureRaw, "failure_class"),
    source_id: readString(signatureRaw, "source_id"),
    test_id: readString(signatureRaw, "test_id"),
  });
  const reproductionRaw = parsed.reproduction;
  if (!isRecord(reproductionRaw)) {
    throw new TypeError("defect.reproduction must be an object");
  }
  const reproduction = reproductionReportFromJson(
    JSON.stringify(reproductionRaw),
  );
  const status = readString(parsed, "status");
  if (status !== "open" && status !== "regression-recorded") {
    throw new TypeError(`unknown defect status: ${status}`);
  }
  const defect = createDefectReport({
    id: readString(parsed, "id"),
    obligation_ids: readStringArray(parsed, "obligation_ids"),
    reported_by: readString(parsed, "reported_by"),
    reproduction,
    signature,
  });
  if (status === "open") {
    if (readStringOrNull(parsed, "regression_obligation_id") !== null) {
      throw new TypeError("an open defect names no regression obligation");
    }
    return defect;
  }
  const regressionId = readStringOrNull(parsed, "regression_obligation_id");
  if (regressionId === null || regressionId.length === 0) {
    throw new TypeError("a recorded defect names its regression obligation");
  }
  return {
    ...defect,
    regression_obligation_id: regressionId,
    status: "regression-recorded",
  };
}
