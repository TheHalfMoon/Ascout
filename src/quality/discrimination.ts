/**
 * Spec 015 first-wedge slice 6: discrimination proof evaluation.
 *
 * A generated test merely passing is not proof that it is useful.
 * Admission requires discrimination evidence: the candidate must detect
 * a meaningful defect through a mutant kill, a controlled revert, a
 * known or withheld defect, a property violation, a differential
 * mismatch, or independent oracle evidence. This module classifies such
 * evidence without executing anything: contradictory results on the
 * identical target poison that pair instead of counting as proof, mixed
 * source or candidate identities fail closed, and anything short of a
 * clean positive detection leaves the candidate a proposal.
 */

export type DiscriminationKind =
  | "mutant-killed"
  | "controlled-revert-detected"
  | "known-defect-detected"
  | "withheld-detected"
  | "property-violated"
  | "differential-mismatch"
  | "independent-oracle";

export interface DiscriminationEvidence {
  readonly candidate_id: string;
  readonly source_id: string;
  readonly kind: DiscriminationKind;
  readonly target_id: string;
  readonly detected: boolean;
  readonly detail: string | null;
}

export type DiscriminationVerdict = "proven" | "unproven" | "not-run";

export interface DiscriminationReport {
  readonly verdict: DiscriminationVerdict;
  readonly candidate_id: string | null;
  readonly source_id: string | null;
  readonly trials: number;
  readonly detections: number;
  readonly contradicted_pairs: number;
  readonly tried_kinds: readonly string[];
  readonly proven_kinds: readonly string[];
}

const KINDS: readonly DiscriminationKind[] = [
  "mutant-killed",
  "controlled-revert-detected",
  "known-defect-detected",
  "withheld-detected",
  "property-violated",
  "differential-mismatch",
  "independent-oracle",
];

const VERDICTS: readonly DiscriminationVerdict[] = [
  "proven",
  "unproven",
  "not-run",
];

function requireNonEmptyId(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(`${field} must be non-empty`);
  }
}

function requireEvidenceShape(evidence: DiscriminationEvidence): void {
  requireNonEmptyId(evidence.candidate_id, "candidate_id");
  requireNonEmptyId(evidence.source_id, "source_id");
  if (!KINDS.includes(evidence.kind)) {
    throw new TypeError(`unknown discrimination kind: ${evidence.kind}`);
  }
  requireNonEmptyId(evidence.target_id, "target_id");
  if (typeof evidence.detected !== "boolean") {
    throw new TypeError("detected must be a boolean");
  }
  if (evidence.detail !== null && evidence.detail.length === 0) {
    throw new TypeError("detail must be null or non-empty");
  }
}

export function createDiscriminationEvidence(input: {
  readonly candidate_id: string;
  readonly source_id: string;
  readonly kind: DiscriminationKind;
  readonly target_id: string;
  readonly detected: boolean;
  readonly detail: string | null;
}): DiscriminationEvidence {
  const evidence: DiscriminationEvidence = {
    candidate_id: input.candidate_id,
    detail: input.detail,
    detected: input.detected,
    kind: input.kind,
    source_id: input.source_id,
    target_id: input.target_id,
  };
  requireEvidenceShape(evidence);
  return evidence;
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

/**
 * Classifies discrimination evidence for one exact candidate on one
 * exact source tree. Deterministic and side-effect free. A clean
 * positive pair (same kind and target detected with no miss on that
 * pair) proves usefulness; a pair with both a detection and a miss is
 * contradicted and proves nothing. Empty evidence is not-run, never
 * proven.
 */
export function evaluateDiscrimination(input: {
  readonly evidence: readonly DiscriminationEvidence[];
}): DiscriminationReport {
  const items = [...input.evidence];
  if (items.length === 0) {
    return {
      candidate_id: null,
      contradicted_pairs: 0,
      detections: 0,
      proven_kinds: [],
      source_id: null,
      trials: 0,
      tried_kinds: [],
      verdict: "not-run",
    };
  }
  const first = items[0];
  if (first === undefined) {
    throw new TypeError("evidence must contain a first entry");
  }
  requireEvidenceShape(first);

  let detections = 0;
  const triedKinds: string[] = [];
  const pairDetected = new Map<string, boolean>();
  const pairMissed = new Map<string, boolean>();
  const pairKind = new Map<string, string>();

  const record = (evidence: DiscriminationEvidence): void => {
    triedKinds.push(evidence.kind);
    const pair = JSON.stringify([evidence.kind, evidence.target_id]);
    pairKind.set(pair, evidence.kind);
    if (evidence.detected) {
      detections += 1;
      pairDetected.set(pair, true);
    } else {
      pairMissed.set(pair, true);
    }
  };

  record(first);
  for (let index = 1; index < items.length; index += 1) {
    const evidence = items[index];
    if (evidence === undefined) {
      throw new TypeError(`missing evidence at index ${index}`);
    }
    requireEvidenceShape(evidence);
    if (
      evidence.candidate_id !== first.candidate_id ||
      evidence.source_id !== first.source_id
    ) {
      throw new TypeError(
        "evidence spans more than one candidate or source",
      );
    }
    record(evidence);
  }

  const provenKinds: string[] = [];
  let contradictedPairs = 0;
  for (const [pair, kind] of pairKind) {
    const hit = pairDetected.get(pair) === true;
    const miss = pairMissed.get(pair) === true;
    if (hit && miss) {
      contradictedPairs += 1;
    } else if (hit) {
      provenKinds.push(kind);
    }
  }

  return {
    candidate_id: first.candidate_id,
    contradicted_pairs: contradictedPairs,
    detections,
    proven_kinds: sortedUnique(provenKinds),
    source_id: first.source_id,
    trials: items.length,
    tried_kinds: sortedUnique(triedKinds),
    verdict: provenKinds.length > 0 ? "proven" : "unproven",
  };
}

/** Only a proven report may support admission in a later slice. */
export function isDiscriminationProven(
  report: DiscriminationReport,
): boolean {
  return report.verdict === "proven";
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
export function discriminationReportToJson(
  report: DiscriminationReport,
): string {
  if (!VERDICTS.includes(report.verdict)) {
    throw new TypeError(
      `unknown discrimination verdict: ${report.verdict}`,
    );
  }
  if (report.verdict === "not-run") {
    if (
      report.candidate_id !== null ||
      report.source_id !== null ||
      report.trials !== 0 ||
      report.detections !== 0 ||
      report.contradicted_pairs !== 0 ||
      report.tried_kinds.length !== 0 ||
      report.proven_kinds.length !== 0
    ) {
      throw new TypeError("a not-run report carries no bound evidence");
    }
  } else {
    requireNonEmptyId(report.candidate_id ?? "", "candidate_id");
    requireNonEmptyId(report.source_id ?? "", "source_id");
    if (report.trials <= 0) {
      throw new TypeError("an evaluated report must carry trials");
    }
  }
  if (report.detections > report.trials) {
    throw new TypeError("detections cannot exceed trials");
  }
  return JSON.stringify({
    candidate_id: report.candidate_id,
    contradicted_pairs: report.contradicted_pairs,
    detections: report.detections,
    proven_kinds: [...report.proven_kinds],
    source_id: report.source_id,
    trials: report.trials,
    tried_kinds: [...report.tried_kinds],
    verdict: report.verdict,
  });
}

export function discriminationReportFromJson(
  raw: string,
): DiscriminationReport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("discrimination JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("discrimination JSON must be an object");
  }
  const verdictRaw = parsed.verdict;
  if (
    typeof verdictRaw !== "string" ||
    !VERDICTS.includes(verdictRaw as DiscriminationVerdict)
  ) {
    throw new TypeError(`unknown discrimination verdict: ${String(verdictRaw)}`);
  }
  const triedKinds = readStringArray(parsed, "tried_kinds");
  const provenKinds = readStringArray(parsed, "proven_kinds");
  for (const kind of [...triedKinds, ...provenKinds]) {
    if (!KINDS.includes(kind as DiscriminationKind)) {
      throw new TypeError(`unknown discrimination kind: ${kind}`);
    }
  }
  const report: DiscriminationReport = {
    candidate_id: readStringOrNull(parsed, "candidate_id"),
    contradicted_pairs: readCount(parsed, "contradicted_pairs"),
    detections: readCount(parsed, "detections"),
    proven_kinds: provenKinds,
    source_id: readStringOrNull(parsed, "source_id"),
    trials: readCount(parsed, "trials"),
    tried_kinds: triedKinds,
    verdict: verdictRaw as DiscriminationVerdict,
  };
  discriminationReportToJson(report);
  return report;
}
