/**
 * UA-P06-T10 — security invariant regression between a trusted base and a candidate.
 *
 * Applies the frozen transition table of the pinned Sentrdel
 * `crates/sentrdel-review/src/regression/model.rs` (FROZEN_INVARIANT_TRANSITIONS)
 * to two untrusted invariant-evaluation snapshots. This module compares; it does
 * not evaluate invariants, emit findings, verify remediation, or claim that a
 * candidate is clean. Every uncertain input stays uncertain in the output.
 */
import { createHash } from "node:crypto";
import { snapshotSentrdelObservationDataV1 } from "./sentrdel-observation-snapshot.js";
import { SENTRDEL_UNKNOWN_TOKENS } from "./sentrdel-capability-characterization.js";
import { SENTRDEL_ENGINE_ID, SENTRDEL_ENGINE_VERSION } from "./sentrdel-engine-boundary.js";
import { containsSecretMaterialV1, containsExternalAttestationV1 } from "./sentrdel-evidence-normalization.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "./sentrdel-source-pin.js";

export const SENTRDEL_REGRESSION_AUTHORITY = "UA-P06-T10" as const;
export const SENTRDEL_REGRESSION_DONOR_PATH = "crates/sentrdel-review/src/regression/model.rs" as const;
export const SENTRDEL_REGRESSION_MAX_EVALUATIONS = 64 as const;
export const SENTRDEL_EVALUATION_STATES = ["SATISFIED", "VIOLATED", "UNKNOWN", "NOT_APPLICABLE"] as const;
export const SENTRDEL_REGRESSION_COVERAGE_STATES = [
  "COVERED", "PARTIAL", "UNSUPPORTED", "UNAVAILABLE", "FAILED", "TIMED_OUT", "SKIPPED_BY_POLICY",
] as const;
/** No PASS, CLEAN, or VERIFIED member: a comparison cannot express a promoted state. */
export const SENTRDEL_DELTA_DISPOSITIONS = [
  "REGRESSION", "IMPROVEMENT", "UNCHANGED", "UNKNOWN", "COVERAGE_LOST", "COVERAGE_GAINED",
] as const;
export type SentrdelEvaluationStateV1 = (typeof SENTRDEL_EVALUATION_STATES)[number];
export type SentrdelDeltaDispositionV1 = (typeof SENTRDEL_DELTA_DISPOSITIONS)[number];
type Reason =
  | "INVARIANT_STATE_WEAKENED" | "INVARIANT_STATE_IMPROVED" | "INVARIANT_STATE_UNCHANGED"
  | "CANDIDATE_COVERAGE_DEGRADED" | "CANDIDATE_COVERAGE_GAINED" | "INVARIANT_DEFINITION_CONFLICT"
  | "INVARIANT_REQUIREMENT_REMOVED" | "SEMANTIC_OBJECT_ADDED" | "SEMANTIC_CONTINUITY_UNPROVEN";

/**
 * Donor transitions, each resolved to one disposition. Where the donor admits
 * two (COVERAGE_LOST or UNKNOWN; COVERAGE_GAINED or UNKNOWN), the coverage
 * disposition is chosen because it names what changed without asserting more.
 */
export const SENTRDEL_REGRESSION_TRANSITIONS: Readonly<Record<string, readonly [SentrdelDeltaDispositionV1, Reason]>> =
  Object.freeze({
    "SATISFIED>VIOLATED": Object.freeze(["REGRESSION", "INVARIANT_STATE_WEAKENED"] as const),
    "VIOLATED>SATISFIED": Object.freeze(["IMPROVEMENT", "INVARIANT_STATE_IMPROVED"] as const),
    "SATISFIED>SATISFIED": Object.freeze(["UNCHANGED", "INVARIANT_STATE_UNCHANGED"] as const),
    "VIOLATED>VIOLATED": Object.freeze(["UNCHANGED", "INVARIANT_STATE_UNCHANGED"] as const),
    "SATISFIED>UNKNOWN": Object.freeze(["COVERAGE_LOST", "CANDIDATE_COVERAGE_DEGRADED"] as const),
    "VIOLATED>UNKNOWN": Object.freeze(["COVERAGE_LOST", "CANDIDATE_COVERAGE_DEGRADED"] as const),
    "UNKNOWN>SATISFIED": Object.freeze(["COVERAGE_GAINED", "CANDIDATE_COVERAGE_GAINED"] as const),
    "UNKNOWN>VIOLATED": Object.freeze(["COVERAGE_GAINED", "CANDIDATE_COVERAGE_GAINED"] as const),
  });

interface Evaluation {
  readonly invariant_id: string;
  readonly definition_digest: string;
  readonly state: SentrdelEvaluationStateV1;
  readonly coverage_state: (typeof SENTRDEL_REGRESSION_COVERAGE_STATES)[number];
  readonly unknown_tokens: readonly string[];
}
interface Side {
  readonly role: "TRUSTED_BASE" | "CANDIDATE";
  readonly source_head: string;
  readonly request_id: string;
  readonly attempt_id: string;
  readonly producer_id: string;
  readonly evidence_ref: string;
  readonly evidence_digest: string;
  readonly evaluations: readonly Evaluation[];
}

export interface SentrdelRegressionRecordV1 {
  readonly invariant_id: string;
  readonly pair_presence: "MATCHED" | "BASE_ONLY" | "CANDIDATE_ONLY";
  readonly continuity_basis: "EXACT_STABLE_ID" | "UNMATCHED";
  readonly base_state: string;
  readonly candidate_state: string;
  readonly base_coverage: string;
  readonly candidate_coverage: string;
  readonly disposition: SentrdelDeltaDispositionV1;
  readonly reason_code: Reason;
  readonly remediation_verified: false;
  readonly finding_emitted: false;
}

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SIDE_KEYS = [
  "schema_version", "role", "source_head", "request_id", "attempt_id", "engine_id", "engine_pin",
  "engine_tree", "engine_version", "producer_id", "evidence_ref", "evidence_digest", "evaluations",
];
const EVALUATION_KEYS = ["invariant_id", "definition_digest", "state", "coverage_state", "unknown_tokens"];
const TOKENS = new Set<string>(SENTRDEL_UNKNOWN_TOKENS);

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const own = Object.keys(value);
  return own.length === keys.length && own.every(key => keys.includes(key));
}

function fail(message: string): never {
  throw new TypeError(`invalid invariant regression input: ${message}`);
}

function readSide(raw: unknown, role: Side["role"]): Side {
  const value = snapshotSentrdelObservationDataV1(raw);
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(`${role} must be a record`);
  const side = value as Record<string, unknown>;
  if (!exactKeys(side, SIDE_KEYS)) fail(`${role} keys must match the bounded schema`);
  const pinned: Record<string, unknown> = {
    schema_version: 1, role, engine_id: SENTRDEL_ENGINE_ID, engine_pin: SENTRDEL_PINNED_REVISION,
    engine_tree: SENTRDEL_PINNED_TREE, engine_version: SENTRDEL_ENGINE_VERSION,
  };
  for (const [key, expected] of Object.entries(pinned)) {
    if (side[key] !== expected) fail(`${role} ${key} does not match the pinned boundary`);
  }
  for (const key of ["request_id", "attempt_id", "producer_id", "evidence_ref"]) {
    if (typeof side[key] !== "string" || !ID.test(side[key])) fail(`${role} ${key} is invalid`);
  }
  if (typeof side["source_head"] !== "string" || !SHA1.test(side["source_head"])) fail(`${role} source_head`);
  if (typeof side["evidence_digest"] !== "string" || !SHA256.test(side["evidence_digest"])) fail(`${role} evidence_digest`);
  for (const item of Object.values(side)) {
    if (typeof item === "string" && (containsSecretMaterialV1(item) || containsExternalAttestationV1(item))) {
      fail(`${role} strings may not contain secrets or self-attestation`);
    }
  }
  const evaluations = side["evaluations"];
  if (!Array.isArray(evaluations) || evaluations.length > SENTRDEL_REGRESSION_MAX_EVALUATIONS) {
    fail(`${role} evaluations must be a bounded array`);
  }
  const seen = new Set<string>();
  for (const entry of evaluations as unknown[]) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) fail(`${role} evaluation record`);
    const e = entry as Record<string, unknown>;
    if (!exactKeys(e, EVALUATION_KEYS)) fail(`${role} evaluation keys`);
    if (typeof e["invariant_id"] !== "string" || !ID.test(e["invariant_id"])) fail(`${role} invariant_id`);
    if (seen.has(e["invariant_id"])) fail(`${role} repeats invariant ${e["invariant_id"]}`);
    seen.add(e["invariant_id"]);
    if (typeof e["definition_digest"] !== "string" || !SHA256.test(e["definition_digest"])) fail(`${role} definition_digest`);
    if (!(SENTRDEL_EVALUATION_STATES as readonly unknown[]).includes(e["state"])) fail(`${role} state`);
    if (!(SENTRDEL_REGRESSION_COVERAGE_STATES as readonly unknown[]).includes(e["coverage_state"])) fail(`${role} coverage_state`);
    const tokens = e["unknown_tokens"];
    if (!Array.isArray(tokens) || tokens.length > 8 || new Set(tokens).size !== tokens.length ||
        tokens.some(token => typeof token !== "string" || !TOKENS.has(token))) fail(`${role} unknown_tokens`);
    // Complete coverage cannot carry an unknown result or an unknown reason.
    if (e["coverage_state"] === "COVERED" && (e["state"] === "UNKNOWN" || tokens.length > 0)) {
      fail(`${role} complete coverage contradicts an unknown result`);
    }
  }
  return side as unknown as Side;
}

/** Incomplete coverage makes a reported state unknowable for comparison. */
function effective(evaluation: Evaluation): SentrdelEvaluationStateV1 {
  return evaluation.coverage_state === "COVERED" ? evaluation.state : "UNKNOWN";
}

function classify(base: Evaluation | undefined, candidate: Evaluation | undefined): readonly [SentrdelDeltaDispositionV1, Reason] {
  if (candidate === undefined) return ["COVERAGE_LOST", "INVARIANT_REQUIREMENT_REMOVED"];
  if (base === undefined) return ["COVERAGE_GAINED", "SEMANTIC_OBJECT_ADDED"];
  if (base.definition_digest !== candidate.definition_digest) return ["UNKNOWN", "INVARIANT_DEFINITION_CONFLICT"];
  return SENTRDEL_REGRESSION_TRANSITIONS[`${effective(base)}>${effective(candidate)}`] ??
    ["UNKNOWN", "SEMANTIC_CONTINUITY_UNPROVEN"];
}

export function compareSentrdelInvariantRegressionV1(trustedBase: unknown, candidate: unknown) {
  const base = readSide(trustedBase, "TRUSTED_BASE");
  const cand = readSide(candidate, "CANDIDATE");
  if (base.source_head === cand.source_head) fail("trusted base and candidate must be distinct revisions");
  if (base.request_id !== cand.request_id || base.attempt_id !== cand.attempt_id) {
    fail("trusted base and candidate must belong to one comparison request and attempt");
  }
  if (base.evidence_ref === cand.evidence_ref && base.evidence_digest !== cand.evidence_digest) {
    fail("one evidence reference cannot carry conflicting digests");
  }
  const baseById = new Map(base.evaluations.map(e => [e.invariant_id, e]));
  const candById = new Map(cand.evaluations.map(e => [e.invariant_id, e]));
  // UTF-16 code-unit order: deterministic across host locales and ICU versions.
  const ids = [...new Set([...baseById.keys(), ...candById.keys()])].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (ids.length === 0) fail("a comparison needs at least one invariant evaluation");
  const records: SentrdelRegressionRecordV1[] = ids.map(id => {
    const b = baseById.get(id);
    const c = candById.get(id);
    const [disposition, reason_code] = classify(b, c);
    return Object.freeze({
      invariant_id: id,
      pair_presence: b === undefined ? "CANDIDATE_ONLY" : c === undefined ? "BASE_ONLY" : "MATCHED",
      continuity_basis: b !== undefined && c !== undefined ? "EXACT_STABLE_ID" : "UNMATCHED",
      base_state: b?.state ?? "ABSENT", candidate_state: c?.state ?? "ABSENT",
      base_coverage: b?.coverage_state ?? "ABSENT", candidate_coverage: c?.coverage_state ?? "ABSENT",
      disposition, reason_code, remediation_verified: false, finding_emitted: false,
    } as const);
  });
  const counts = Object.fromEntries(SENTRDEL_DELTA_DISPOSITIONS.map(d => [d, records.filter(r => r.disposition === d).length]));
  const sideRef = (s: Side) => Object.freeze({
    source_head: s.source_head, producer_id: s.producer_id, evidence_ref: s.evidence_ref, evidence_digest: s.evidence_digest,
  });
  const digest = createHash("sha256").update(JSON.stringify([
    SENTRDEL_REGRESSION_AUTHORITY, base.request_id, base.attempt_id, SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE,
    sideRef(base), sideRef(cand), records,
  ]), "utf8").digest("hex");
  return Object.freeze({
    schema_version: 1 as const,
    phase_authority: SENTRDEL_REGRESSION_AUTHORITY,
    comparison_id: `invariant-regression:sentrdel:${digest}`,
    request_id: base.request_id, attempt_id: base.attempt_id,
    engine_pin: SENTRDEL_PINNED_REVISION, engine_tree: SENTRDEL_PINNED_TREE,
    trusted_base: sideRef(base), candidate: sideRef(cand),
    records: Object.freeze(records),
    disposition_counts: Object.freeze(counts),
    uncertain_records: records.filter(r => ["UNKNOWN", "COVERAGE_LOST", "COVERAGE_GAINED"].includes(r.disposition)).length,
    authority: "COMPARISON_ONLY" as const,
    assurance_effect: "NONE" as const,
    findings_emitted: false as const,
    remediation_verified: false as const,
    regression_free_claimed: false as const,
    candidate_clean_claimed: false as const,
    comparison_total: false as const,
  });
}
