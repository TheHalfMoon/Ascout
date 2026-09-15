/**
 * Spec 016 P016-08: bounded trace/artifact ingestion.
 *
 * This module ingests Playwright trace/screenshot/log artifact
 * references into Ascout evidence discipline without duplicating
 * Trace Viewer: only a closed set of claim-needed fact kinds may be
 * extracted, raw artifacts stay in ignored/bounded storage behind
 * portable refs, retention is a coded bounded policy, and
 * redaction/truncation state — including honestly declared
 * unsupported redaction — travels visibly with every fact.
 *
 * Authority rules enforced here:
 *
 * - only `trace`, `screenshot`, `console-log`, and `network-log`
 *   artifacts are ingestible fact sources, each mapped to a closed
 *   fact-kind set; snapshot artifacts stay raw refs in this wedge;
 * - every ingested fact carries fixed `trace-derived` provenance and
 *   can never be mistaken for direct Ascout execution evidence;
 * - trace facts never override Ascout evidence: corroboration marks
 *   each fact `corroborated`, `trace-only`, or `conflict`, and
 *   conflicts resolve to Ascout evidence with the conflict recorded;
 * - retention is bounded by count, bytes, and age, evaluated
 *   deterministically (oldest-first, id tie-break);
 * - redaction state is explicit per fact: `redacted`,
 *   `not-sensitive`, or `redaction-unsupported` (a visible
 *   limitation, never a silent claim);
 * - ingestion binds one session and one source; cross-tree input is
 *   rejected, never merged.
 */

import { createHash } from "node:crypto";
import type {
  BrowserArtifactKind,
  BrowserArtifactRef,
} from "./executor.js";

export type TraceFactKind =
  | "trace-action"
  | "trace-console"
  | "trace-network"
  | "trace-screenshot"
  | "trace-error";

export type TraceRedactionState =
  | "redacted"
  | "not-sensitive"
  | "redaction-unsupported";

export type TraceCorroborationStatus =
  | "corroborated"
  | "trace-only"
  | "conflict";

export interface IngestedTraceFact {
  readonly fact_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly artifact_id: string;
  readonly fact_kind: TraceFactKind;
  readonly claim_key: string;
  readonly summary: string;
  readonly redaction: TraceRedactionState;
  readonly provenance: "trace-derived";
}

export interface TraceIngestion {
  readonly ingestion_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly artifact_ids: readonly string[];
  readonly facts: readonly IngestedTraceFact[];
}

export interface RetentionPolicy {
  readonly policy_id: string;
  readonly max_artifacts: number;
  readonly max_total_bytes: number;
  readonly max_age_ms: number;
}

export interface RetainedArtifact {
  readonly artifact_id: string;
  readonly byte_size: number;
  readonly captured_at_ms: number;
}

export interface RetentionDecision {
  readonly retained: readonly string[];
  readonly expired: readonly string[];
  readonly evicted_by_count: readonly string[];
  readonly evicted_by_bytes: readonly string[];
  readonly retained_bytes: number;
}

export interface AscoutEvidenceClaim {
  readonly evidence_id: string;
  readonly claim_key: string;
  readonly claim_value: string;
}

export interface TraceCorroboration {
  readonly fact_id: string;
  readonly status: TraceCorroborationStatus;
  readonly ascout_evidence_id: string | null;
  readonly note: string;
}

export const TRACE_KIND_REJECTED = "E_TRACE_KIND_REJECTED";
export const TRACE_BINDING_MISMATCH = "E_TRACE_BINDING_MISMATCH";
export const TRACE_RETENTION_INVALID = "E_TRACE_RETENTION_INVALID";

const TRACE_FACT_KINDS: readonly TraceFactKind[] = [
  "trace-action",
  "trace-console",
  "trace-network",
  "trace-screenshot",
  "trace-error",
];

const TRACE_REDACTION_STATES: readonly TraceRedactionState[] = [
  "redacted",
  "not-sensitive",
  "redaction-unsupported",
];

/**
 * Closed fact-source map. Kinds absent here (dom-snapshot,
 * accessibility-snapshot) are not ingestible in this wedge: their
 * artifacts remain raw refs and ingestion throws.
 */
const INGESTIBLE_FACT_KINDS: Readonly<
  Record<string, readonly TraceFactKind[]>
> = {
  "console-log": ["trace-console"],
  "network-log": ["trace-network"],
  screenshot: ["trace-screenshot"],
  trace: ["trace-action", "trace-error", "trace-screenshot"],
};

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

function requireSecretFree(value: string, field: string): void {
  for (const marker of SECRET_MARKERS) {
    if (marker.test(value)) {
      throw new TypeError(`${field} must not contain raw secrets`);
    }
  }
}

function requireId(value: string, field: string): void {
  if (value.length === 0 || !/^\S+$/.test(value)) {
    throw new TypeError(`${field} must be a non-empty canonical id`);
  }
  requireSecretFree(value, field);
}

function requireSingleLine(value: string, field: string): void {
  if (value.length === 0 || /[\r\n]/.test(value)) {
    throw new TypeError(`${field} must be non-empty single-line text`);
  }
  requireSecretFree(value, field);
}

function requireTraceFactKind(value: string): TraceFactKind {
  const found = TRACE_FACT_KINDS.find((entry) => entry === value);
  if (found === undefined) {
    throw new TypeError(`unknown trace fact kind: ${value}`);
  }
  return found;
}

function requireRedactionState(value: string): TraceRedactionState {
  const found = TRACE_REDACTION_STATES.find((entry) => entry === value);
  if (found === undefined) {
    throw new TypeError(`unknown trace redaction state: ${value}`);
  }
  return found;
}

/**
 * Declares a bounded retention policy: every bound is a positive
 * integer, so unbounded retention cannot be expressed.
 */
export function createRetentionPolicy(input: {
  readonly policy_id: string;
  readonly max_artifacts: number;
  readonly max_total_bytes: number;
  readonly max_age_ms: number;
}): RetentionPolicy {
  requireId(input.policy_id, "policy_id");
  for (const [field, value] of [
    ["max_artifacts", input.max_artifacts],
    ["max_total_bytes", input.max_total_bytes],
    ["max_age_ms", input.max_age_ms],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new TypeError(
        `${TRACE_RETENTION_INVALID}: ${field} must be a positive integer`,
      );
    }
  }
  return {
    max_age_ms: input.max_age_ms,
    max_artifacts: input.max_artifacts,
    max_total_bytes: input.max_total_bytes,
    policy_id: input.policy_id,
  };
}

/**
 * Evaluates retention deterministically: artifacts older than
 * max_age_ms expire first, then oldest-first eviction enforces the
 * count bound, then the byte bound (artifact-id tie-breaks keep the
 * decision stable). Unknown sizes are forbidden — every retained
 * artifact must declare a byte size.
 */
export function evaluateRetention(
  policy: RetentionPolicy,
  artifacts: readonly RetainedArtifact[],
  now_ms: number,
): RetentionDecision {
  if (!Number.isSafeInteger(now_ms) || now_ms < 0) {
    throw new TypeError("now_ms must be a non-negative integer");
  }
  const seen = new Set<string>();
  for (const artifact of artifacts) {
    requireId(artifact.artifact_id, "retained artifact_id");
    if (seen.has(artifact.artifact_id)) {
      throw new TypeError(
        `duplicate retained artifact: ${artifact.artifact_id}`,
      );
    }
    seen.add(artifact.artifact_id);
    if (
      !Number.isSafeInteger(artifact.byte_size) ||
      artifact.byte_size < 0
    ) {
      throw new TypeError("retained byte_size must be a non-negative integer");
    }
    if (
      !Number.isSafeInteger(artifact.captured_at_ms) ||
      artifact.captured_at_ms < 0
    ) {
      throw new TypeError(
        "retained captured_at_ms must be a non-negative integer",
      );
    }
  }
  const expired: string[] = [];
  const candidates = artifacts.filter((artifact) => {
    if (now_ms - artifact.captured_at_ms > policy.max_age_ms) {
      expired.push(artifact.artifact_id);
      return false;
    }
    return true;
  });
  candidates.sort(
    (left, right) =>
      left.captured_at_ms - right.captured_at_ms ||
      compareText(left.artifact_id, right.artifact_id),
  );
  const evicted_by_count: string[] = [];
  while (candidates.length > policy.max_artifacts) {
    const evicted = candidates.shift();
    if (evicted !== undefined) {
      evicted_by_count.push(evicted.artifact_id);
    }
  }
  const evicted_by_bytes: string[] = [];
  let retained_bytes = candidates.reduce(
    (total, artifact) => total + artifact.byte_size,
    0,
  );
  while (retained_bytes > policy.max_total_bytes && candidates.length > 0) {
    const evicted = candidates.shift();
    if (evicted === undefined) {
      break;
    }
    evicted_by_bytes.push(evicted.artifact_id);
    retained_bytes -= evicted.byte_size;
  }
  return {
    evicted_by_bytes,
    evicted_by_count,
    expired: expired.sort(compareText),
    retained: candidates.map((artifact) => artifact.artifact_id),
    retained_bytes,
  };
}

/**
 * Ingests one trace fact from an artifact ref. The artifact kind
 * must allow the fact kind per the closed fact-source map;
 * snapshot artifacts and unmapped combinations throw instead of
 * silently widening ingestion. Facts bind the artifact's session
 * and source.
 */
export function ingestTraceFact(
  artifact: BrowserArtifactRef,
  input: {
    readonly fact_id: string;
    readonly fact_kind: string;
    readonly claim_key: string;
    readonly summary: string;
    readonly redaction: string;
  },
): IngestedTraceFact {
  requireId(input.fact_id, "fact_id");
  const fact_kind = requireTraceFactKind(input.fact_kind);
  requireId(input.claim_key, "claim_key");
  requireSingleLine(input.summary, "trace fact summary");
  const redaction = requireRedactionState(input.redaction);
  const allowed: readonly TraceFactKind[] | undefined =
    INGESTIBLE_FACT_KINDS[artifact.kind as BrowserArtifactKind];
  if (allowed === undefined || !allowed.includes(fact_kind)) {
    throw new TypeError(
      `${TRACE_KIND_REJECTED}: ${input.fact_kind} cannot be ingested from ${artifact.kind} artifact ${artifact.artifact_id}`,
    );
  }
  return {
    artifact_id: artifact.artifact_id,
    claim_key: input.claim_key,
    fact_id: input.fact_id,
    fact_kind,
    provenance: "trace-derived",
    redaction,
    session_id: artifact.session_id,
    source_identity: artifact.source_identity,
    summary: input.summary,
  };
}

/**
 * Assembles an ingestion record: facts must bind one session and one
 * source, reference known artifacts, and carry unique fact ids.
 * Cross-tree input is rejected, never merged.
 */
export function assembleTraceIngestion(input: {
  readonly ingestion_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly artifacts: readonly BrowserArtifactRef[];
  readonly facts: readonly IngestedTraceFact[];
}): TraceIngestion {
  requireId(input.ingestion_id, "ingestion_id");
  requireId(input.session_id, "session_id");
  requireId(input.source_identity, "source_identity");
  const artifactIds = new Set<string>();
  for (const artifact of input.artifacts) {
    if (
      artifact.session_id !== input.session_id ||
      artifact.source_identity !== input.source_identity
    ) {
      throw new TypeError(
        `${TRACE_BINDING_MISMATCH}: artifact ${artifact.artifact_id} binds a different session or source`,
      );
    }
    artifactIds.add(artifact.artifact_id);
  }
  const factIds = new Set<string>();
  for (const fact of input.facts) {
    if (
      fact.session_id !== input.session_id ||
      fact.source_identity !== input.source_identity
    ) {
      throw new TypeError(
        `${TRACE_BINDING_MISMATCH}: fact ${fact.fact_id} binds a different session or source`,
      );
    }
    if (!artifactIds.has(fact.artifact_id)) {
      throw new TypeError(
        `trace fact ${fact.fact_id} references unknown artifact ${fact.artifact_id}`,
      );
    }
    if (factIds.has(fact.fact_id)) {
      throw new TypeError(`duplicate trace fact: ${fact.fact_id}`);
    }
    factIds.add(fact.fact_id);
  }
  return {
    artifact_ids: [...artifactIds].sort(compareText),
    facts: [...input.facts],
    ingestion_id: input.ingestion_id,
    session_id: input.session_id,
    source_identity: input.source_identity,
  };
}

/**
 * Corroborates ingested facts against Ascout execution evidence.
 * Matching is exact on claim_key: a trace fact whose key matches an
 * Ascout claim whose value equals the fact summary is corroborated;
 * a matching key with a different value is a conflict that resolves
 * to Ascout evidence (recorded, never overriding); an unmatched key
 * stays trace-only and is never promoted to evidence. Trace facts
 * therefore cannot override, upgrade, or substitute Ascout claims.
 */
export function corroborateWithTrace(
  ascout_claims: readonly AscoutEvidenceClaim[],
  facts: readonly IngestedTraceFact[],
): readonly TraceCorroboration[] {
  const claims = new Map<string, AscoutEvidenceClaim>();
  for (const claim of ascout_claims) {
    requireId(claim.evidence_id, "ascout evidence_id");
    requireId(claim.claim_key, "ascout claim_key");
    requireSingleLine(claim.claim_value, "ascout claim_value");
    if (!claims.has(claim.claim_key)) {
      claims.set(claim.claim_key, claim);
    }
  }
  const results: TraceCorroboration[] = facts.map((fact) => {
    const match = claims.get(fact.claim_key);
    if (match === undefined) {
      return {
        ascout_evidence_id: null,
        fact_id: fact.fact_id,
        note: `trace-only: no Ascout claim for ${fact.claim_key}; fact stays advisory`,
        status: "trace-only",
      } as const;
    }
    if (match.claim_value === fact.summary) {
      return {
        ascout_evidence_id: match.evidence_id,
        fact_id: fact.fact_id,
        note: `corroborated by ${match.evidence_id}; Ascout evidence remains authoritative`,
        status: "corroborated",
      } as const;
    }
    return {
      ascout_evidence_id: match.evidence_id,
      fact_id: fact.fact_id,
      note: `conflict: Ascout claim ${match.evidence_id} wins over trace fact; trace value recorded, not applied`,
      status: "conflict",
    } as const;
  });
  return results.sort((left, right) => compareText(left.fact_id, right.fact_id));
}

function factToJsonValue(fact: IngestedTraceFact): unknown {
  return {
    artifact_id: fact.artifact_id,
    claim_key: fact.claim_key,
    fact_id: fact.fact_id,
    fact_kind: fact.fact_kind,
    provenance: fact.provenance,
    redaction: fact.redaction,
    session_id: fact.session_id,
    source_identity: fact.source_identity,
    summary: fact.summary,
  };
}

/** Deterministic fact serialization with fixed key order. */
export function traceFactToJson(fact: IngestedTraceFact): string {
  return JSON.stringify(factToJsonValue(fact));
}

function ingestionToJsonValue(ingestion: TraceIngestion): unknown {
  return {
    artifact_ids: [...ingestion.artifact_ids],
    facts: ingestion.facts.map(factToJsonValue),
    ingestion_id: ingestion.ingestion_id,
    session_id: ingestion.session_id,
    source_identity: ingestion.source_identity,
  };
}

/** Deterministic ingestion serialization with fixed key order. */
export function traceIngestionToJson(ingestion: TraceIngestion): string {
  return JSON.stringify(ingestionToJsonValue(ingestion));
}

/** Stable sha256 digest over the canonical ingestion serialization. */
export function traceIngestionDigest(ingestion: TraceIngestion): string {
  return createHash("sha256")
    .update(traceIngestionToJson(ingestion), "utf8")
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

function parseIngestedFact(entry: Record<string, unknown>): IngestedTraceFact {
  const fact_kind = requireTraceFactKind(readString(entry, "fact_kind"));
  const redaction = requireRedactionState(readString(entry, "redaction"));
  const fact_id = readString(entry, "fact_id");
  const claim_key = readString(entry, "claim_key");
  const summary = readString(entry, "summary");
  const artifact_id = readString(entry, "artifact_id");
  const session_id = readString(entry, "session_id");
  const source_identity = readString(entry, "source_identity");
  requireId(fact_id, "fact_id");
  requireId(claim_key, "claim_key");
  requireSingleLine(summary, "trace fact summary");
  requireId(artifact_id, "artifact_id");
  requireId(session_id, "session_id");
  requireId(source_identity, "source_identity");
  if (readString(entry, "provenance") !== "trace-derived") {
    throw new TypeError("trace fact provenance must be trace-derived");
  }
  return {
    artifact_id,
    claim_key,
    fact_id,
    fact_kind,
    provenance: "trace-derived",
    redaction,
    session_id,
    source_identity,
    summary,
  };
}

/** Strict fact parsing with full revalidation; malformed input fails closed. */
export function traceFactFromJson(raw: string): IngestedTraceFact {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("trace fact JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("trace fact JSON must be an object");
  }
  return parseIngestedFact(parsed);
}

/**
 * Strict ingestion parsing with full revalidation: binding, known
 * artifacts, and fact-id uniqueness rerun, so a serialized
 * ingestion that violates integrity cannot parse.
 */
export function traceIngestionFromJson(raw: string): TraceIngestion {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("trace ingestion JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("trace ingestion JSON must be an object");
  }
  const ingestion_id = readString(parsed, "ingestion_id");
  const session_id = readString(parsed, "session_id");
  const source_identity = readString(parsed, "source_identity");
  requireId(ingestion_id, "ingestion_id");
  requireId(session_id, "session_id");
  requireId(source_identity, "source_identity");
  const artifact_ids = readStringArray(parsed, "artifact_ids");
  const seenArtifacts = new Set<string>();
  for (const artifact_id of artifact_ids) {
    requireId(artifact_id, "artifact_id");
    if (seenArtifacts.has(artifact_id)) {
      throw new TypeError(`duplicate ingestion artifact: ${artifact_id}`);
    }
    seenArtifacts.add(artifact_id);
  }
  const facts = readRecordArray(parsed, "facts").map(parseIngestedFact);
  const factIds = new Set<string>();
  for (const fact of facts) {
    if (
      fact.session_id !== session_id ||
      fact.source_identity !== source_identity
    ) {
      throw new TypeError(
        `${TRACE_BINDING_MISMATCH}: fact ${fact.fact_id} binds a different session or source`,
      );
    }
    if (!seenArtifacts.has(fact.artifact_id)) {
      throw new TypeError(
        `trace fact ${fact.fact_id} references unknown artifact ${fact.artifact_id}`,
      );
    }
    if (factIds.has(fact.fact_id)) {
      throw new TypeError(`duplicate trace fact: ${fact.fact_id}`);
    }
    factIds.add(fact.fact_id);
  }
  return {
    artifact_ids: [...seenArtifacts].sort(compareText),
    facts,
    ingestion_id,
    session_id,
    source_identity,
  };
}
