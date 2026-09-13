/**
 * Spec 015 first-wedge slice 4: candidate test proposal model.
 *
 * A generated test is a proposal, never verification evidence by itself.
 * This module records proposal identity (which obligation it targets, which
 * exact source tree it was written against, which oracle provenance it
 * carries, and which model or template produced it) as deterministic
 * serializable data plus fail-closed predicates. It executes nothing,
 * writes to no worktree, and grants no admission: a proposal merely
 * passing is not proof of usefulness, and promotion requires stability
 * proof, discrimination proof, and explicit human admission in later
 * slices. Advisory-oracle proposals are recordable but stay proposals.
 */

import { createOracle } from "./obligation.js";
import type {
  Oracle,
  OracleClass,
  OracleIndependence,
} from "./obligation.js";

export type CandidateStatus = "proposed" | "rejected";

export interface CandidateProposal {
  readonly id: string;
  readonly obligation_id: string;
  readonly source_id: string;
  readonly test_file: string;
  readonly test_name: string;
  readonly body: string;
  readonly oracle: Oracle;
  readonly generated_by: string;
  readonly status: CandidateStatus;
  readonly evidence_ids: readonly string[];
  readonly rejection_reason: string | null;
}

const CANDIDATE_STATUSES: readonly CandidateStatus[] = [
  "proposed",
  "rejected",
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

/**
 * Test files are repo-relative canonical paths with forward slashes.
 * Absolute paths, drive letters, backslashes, and dot segments are
 * refused so a proposal can never escape its target tree by spelling.
 */
function requireRepoRelativePath(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(`${field} must be non-empty`);
  }
  if (value.includes("\\")) {
    throw new TypeError(`${field} must use forward slashes`);
  }
  if (value.startsWith("/")) {
    throw new TypeError(`${field} must be repo-relative`);
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value)) {
    throw new TypeError(`${field} must be repo-relative`);
  }
  for (const segment of value.split("/")) {
    if (segment.length === 0 || segment === "." || segment === "..") {
      throw new TypeError(`${field} must be a canonical repo-relative path`);
    }
  }
}

export function createCandidateProposal(input: {
  readonly id: string;
  readonly obligation_id: string;
  readonly source_id: string;
  readonly test_file: string;
  readonly test_name: string;
  readonly body: string;
  readonly oracle: Oracle;
  readonly generated_by: string;
}): CandidateProposal {
  requireNonEmptyId(input.id, "candidate id");
  requireNonEmptyId(input.obligation_id, "obligation_id");
  requireNonEmptyId(input.source_id, "source_id");
  requireRepoRelativePath(input.test_file, "test_file");
  requireNonEmptyText(input.test_name, "test_name");
  requireNonEmptyText(input.body, "body");
  requireNonEmptyText(input.generated_by, "generated_by");
  return {
    body: input.body,
    evidence_ids: [],
    generated_by: input.generated_by,
    id: input.id,
    obligation_id: input.obligation_id,
    oracle: input.oracle,
    rejection_reason: null,
    source_id: input.source_id,
    status: "proposed",
    test_file: input.test_file,
    test_name: input.test_name,
  };
}

/**
 * Forward-only rejection with an accountable reason. A rejected proposal
 * stays rejected: re-proposing the same content requires a new proposal
 * id, so history is never rewritten.
 */
export function rejectCandidateProposal(
  proposal: CandidateProposal,
  reason: string,
): CandidateProposal {
  if (proposal.status !== "proposed") {
    throw new TypeError("only a proposed candidate may be rejected");
  }
  requireNonEmptyText(reason, "rejection reason");
  return { ...proposal, rejection_reason: reason, status: "rejected" };
}

export function attachCandidateEvidence(
  proposal: CandidateProposal,
  evidenceIds: readonly string[],
): CandidateProposal {
  requireStringArray(evidenceIds, "attached evidence_ids");
  return {
    ...proposal,
    evidence_ids: [...proposal.evidence_ids, ...evidenceIds],
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
export function candidateProposalToJson(
  proposal: CandidateProposal,
): string {
  if (!CANDIDATE_STATUSES.includes(proposal.status)) {
    throw new TypeError(`unknown candidate status: ${proposal.status}`);
  }
  if (proposal.status === "proposed" && proposal.rejection_reason !== null) {
    throw new TypeError("a proposed candidate carries no rejection reason");
  }
  if (
    proposal.status === "rejected" &&
    (proposal.rejection_reason === null ||
      proposal.rejection_reason.length === 0)
  ) {
    throw new TypeError("a rejected candidate carries a rejection reason");
  }
  return JSON.stringify({
    body: proposal.body,
    evidence_ids: [...proposal.evidence_ids],
    generated_by: proposal.generated_by,
    id: proposal.id,
    obligation_id: proposal.obligation_id,
    oracle: {
      calibrated: proposal.oracle.calibrated,
      class: proposal.oracle.class,
      description: proposal.oracle.description,
      id: proposal.oracle.id,
      independence: proposal.oracle.independence,
      provenance: proposal.oracle.provenance,
    },
    rejection_reason: proposal.rejection_reason,
    source_id: proposal.source_id,
    status: proposal.status,
    test_file: proposal.test_file,
    test_name: proposal.test_name,
  });
}

export function candidateProposalFromJson(
  raw: string,
): CandidateProposal {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("candidate JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("candidate JSON must be an object");
  }
  const oracleRaw = parsed.oracle;
  if (!isRecord(oracleRaw)) {
    throw new TypeError("candidate.oracle must be an object");
  }
  const calibratedRaw = oracleRaw.calibrated;
  if (typeof calibratedRaw !== "boolean") {
    throw new TypeError("candidate.oracle.calibrated must be a boolean");
  }
  const oracle = createOracle({
    calibrated: calibratedRaw,
    class: readString(oracleRaw, "class") as OracleClass,
    description: readString(oracleRaw, "description"),
    id: readString(oracleRaw, "id"),
    independence: readString(oracleRaw, "independence") as OracleIndependence,
    provenance: readString(oracleRaw, "provenance"),
  });
  const status = readString(parsed, "status");
  if (status !== "proposed" && status !== "rejected") {
    throw new TypeError(`unknown candidate status: ${status}`);
  }
  const proposal = createCandidateProposal({
    body: readString(parsed, "body"),
    generated_by: readString(parsed, "generated_by"),
    id: readString(parsed, "id"),
    obligation_id: readString(parsed, "obligation_id"),
    oracle,
    source_id: readString(parsed, "source_id"),
    test_file: readString(parsed, "test_file"),
    test_name: readString(parsed, "test_name"),
  });
  const withEvidence = attachCandidateEvidence(
    proposal,
    readStringArray(parsed, "evidence_ids"),
  );
  const rejectionReason = readStringOrNull(parsed, "rejection_reason");
  if (status === "proposed") {
    if (rejectionReason !== null) {
      throw new TypeError("a proposed candidate carries no rejection reason");
    }
    return withEvidence;
  }
  if (rejectionReason === null || rejectionReason.length === 0) {
    throw new TypeError("a rejected candidate carries a rejection reason");
  }
  return rejectCandidateProposal(withEvidence, rejectionReason);
}
