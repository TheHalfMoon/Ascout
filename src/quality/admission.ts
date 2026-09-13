/**
 * Spec 015 first-wedge slice 7: candidate admission decision.
 *
 * Composes the earlier gates into one explicit promotion decision: a
 * proposed candidate is admitted only when a deterministic-pass
 * stability report and a proven discrimination report both bind to the
 * same proposal and source tree, and a human records admission with an
 * accountable identity and reason. Anything less stays held with every
 * failed gate enumerated. There is deliberately no merge capability in
 * this module: admission records a decision, it never moves code, and
 * automatic promotion without explicit human admission is
 * unrepresentable.
 */

import type { CandidateProposal } from "./candidate.js";
import type { DiscriminationReport } from "./discrimination.js";
import type { StabilityReport } from "./stability.js";

export type AdmissionVerdict = "admitted" | "held";

export type AdmissionReason =
  | "proposal-rejected"
  | "stability-not-deterministic-pass"
  | "discrimination-unproven"
  | "human-admission-missing"
  | "stability-deterministic-pass"
  | "discrimination-proven"
  | "human-admitted";

export interface HumanAdmission {
  readonly admitted_by: string;
  readonly reason: string;
}

export interface AdmissionDecision {
  readonly verdict: AdmissionVerdict;
  readonly candidate_id: string;
  readonly source_id: string;
  readonly reasons: readonly string[];
  readonly admitted_by: string | null;
}

const VERDICTS: readonly AdmissionVerdict[] = ["admitted", "held"];

const HELD_ORDER: readonly AdmissionReason[] = [
  "proposal-rejected",
  "stability-not-deterministic-pass",
  "discrimination-unproven",
  "human-admission-missing",
];

const ADMITTED_REASONS: readonly AdmissionReason[] = [
  "stability-deterministic-pass",
  "discrimination-proven",
  "human-admitted",
];

function requireNonEmptyText(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(`${field} must be non-empty`);
  }
}

function requireAdmissionShape(admission: HumanAdmission): void {
  requireNonEmptyText(admission.admitted_by, "admitted_by");
  requireNonEmptyText(admission.reason, "admission reason");
}

/**
 * Binds one evidence report to the proposal. Conflicting positive
 * identities are cross-evidence contamination and throw; absent
 * (null) identities simply fail the gate and hold the candidate.
 */
function reportBinds(
  report: { candidate_id: string | null; source_id: string | null },
  proposal: CandidateProposal,
): boolean {
  if (
    (report.candidate_id !== null &&
      report.candidate_id !== proposal.id) ||
    (report.source_id !== null && report.source_id !== proposal.source_id)
  ) {
    throw new TypeError("evidence binds to another candidate or source");
  }
  return report.candidate_id !== null && report.source_id !== null;
}

/**
 * Decides admission for one proposal. All gates are evaluated so a
 * held decision enumerates every failed gate in fixed order; a
 * malformed human admission or contaminated evidence binding throws
 * instead of deciding.
 */
export function decideAdmission(input: {
  readonly proposal: CandidateProposal;
  readonly stability: StabilityReport;
  readonly discrimination: DiscriminationReport;
  readonly admission: HumanAdmission | null;
}): AdmissionDecision {
  if (input.admission !== null) {
    requireAdmissionShape(input.admission);
  }
  const stabilityBinds = reportBinds(input.stability, input.proposal);
  const discriminationBinds = reportBinds(
    input.discrimination,
    input.proposal,
  );

  const failures: AdmissionReason[] = [];
  if (input.proposal.status !== "proposed") {
    failures.push("proposal-rejected");
  }
  if (
    !stabilityBinds ||
    input.stability.verdict !== "deterministic-pass"
  ) {
    failures.push("stability-not-deterministic-pass");
  }
  if (!discriminationBinds || input.discrimination.verdict !== "proven") {
    failures.push("discrimination-unproven");
  }
  if (input.admission === null) {
    failures.push("human-admission-missing");
  }

  if (failures.length > 0) {
    return {
      admitted_by: null,
      candidate_id: input.proposal.id,
      reasons: failures.filter((reason) =>
        HELD_ORDER.includes(reason),
      ),
      source_id: input.proposal.source_id,
      verdict: "held",
    };
  }
  const admission = input.admission;
  if (admission === null) {
    throw new TypeError("admission must be present for an admitted decision");
  }
  return {
    admitted_by: admission.admitted_by,
    candidate_id: input.proposal.id,
    reasons: [...ADMITTED_REASONS],
    source_id: input.proposal.source_id,
    verdict: "admitted",
  };
}

/** Only an admitted decision may proceed toward a developer branch. */
export function isAdmitted(decision: AdmissionDecision): boolean {
  return decision.verdict === "admitted";
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

/** Deterministic serialization with fixed key order for stable digests. */
export function admissionDecisionToJson(
  decision: AdmissionDecision,
): string {
  if (!VERDICTS.includes(decision.verdict)) {
    throw new TypeError(`unknown admission verdict: ${decision.verdict}`);
  }
  requireNonEmptyText(decision.candidate_id, "candidate_id");
  requireNonEmptyText(decision.source_id, "source_id");
  if (decision.verdict === "admitted") {
    requireNonEmptyText(decision.admitted_by ?? "", "admitted_by");
  } else if (decision.admitted_by !== null) {
    throw new TypeError("a held decision carries no admitting identity");
  }
  return JSON.stringify({
    admitted_by: decision.admitted_by,
    candidate_id: decision.candidate_id,
    reasons: [...decision.reasons],
    source_id: decision.source_id,
    verdict: decision.verdict,
  });
}

export function admissionDecisionFromJson(
  raw: string,
): AdmissionDecision {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("admission JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("admission JSON must be an object");
  }
  const verdictRaw = parsed.verdict;
  if (
    typeof verdictRaw !== "string" ||
    !VERDICTS.includes(verdictRaw as AdmissionVerdict)
  ) {
    throw new TypeError(
      `unknown admission verdict: ${String(verdictRaw)}`,
    );
  }
  const decision: AdmissionDecision = {
    admitted_by: readStringOrNull(parsed, "admitted_by"),
    candidate_id: readString(parsed, "candidate_id"),
    reasons: readStringArray(parsed, "reasons"),
    source_id: readString(parsed, "source_id"),
    verdict: verdictRaw as AdmissionVerdict,
  };
  admissionDecisionToJson(decision);
  return decision;
}
