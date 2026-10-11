/**
 * UA-P06-T13 — remediation/retest lifecycle.
 *
 * A fix without new evidence stays open (FIX_WITHOUT_RETEST != VERIFIED). A
 * claimed fix for a UA-P06-T04 observation can only move toward closure with a
 * retest executed at the fix head whose complete, unknown-free coverage
 * includes the original location and which does not re-observe the same rule
 * at the same path. Even then the result is supporting evidence, never a
 * verified remediation or an assurance claim. The pinned Sentrdel donor has no
 * retest lifecycle; this contract is Ascout-native.
 */
import { createHash } from "node:crypto";
import { snapshotSentrdelObservationDataV1 } from "./sentrdel-observation-snapshot.js";
import { SENTRDEL_OBSERVATION_COVERAGE_STATES } from "./sentrdel-evidence-normalization.js";
import {
  assertNonPromotedObservationV1, readOwnDataV1, readOwnListV1, readSafeIdV1,
} from "./sentrdel-observation-read.js";

export const SENTRDEL_REMEDIATION_AUTHORITY = "UA-P06-T13" as const;
export const SENTRDEL_RETEST_MAX_OBSERVATIONS = 4_096 as const;
/** No VERIFIED, FIXED, or CLOSED member: a retest can support a fix, never verify it. */
export const SENTRDEL_REMEDIATION_STATES = [
  "OPEN_FIX_UNVERIFIED", "OPEN_STILL_OBSERVED", "OPEN_RETEST_INCOMPLETE", "RETEST_NOT_REOBSERVED",
] as const;
export type SentrdelRemediationStateV1 = (typeof SENTRDEL_REMEDIATION_STATES)[number];

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const FIX_KEYS = ["schema_version", "fix_ref", "fix_head"];
const RUN_KEYS = ["schema_version", "source_head", "request_id", "attempt_id", "capability_id", "execution_state",
  "coverage_state", "scanned_scope", "unknown_states", "evidence_ref", "evidence_digest"];

function fail(reason: string): never {
  throw new TypeError(`invalid remediation retest: ${reason}`);
}

interface Identity {
  readonly observation_id: string;
  readonly source_head: string;
  readonly request_id: string;
  readonly attempt_id: string;
  readonly capability_id: string;
  readonly rule_id: string | null;
  readonly path: string | null;
}

function readObservation(raw: unknown, what: string): Identity {
  assertNonPromotedObservationV1(raw, fail);
  const head = readOwnDataV1(raw, "source_head", fail);
  if (typeof head !== "string" || !SHA1.test(head)) fail(`${what} source_head is invalid`);
  const rule = readOwnDataV1(raw, "rule_id", fail);
  const path = readOwnDataV1(readOwnDataV1(raw, "location", fail), "path", fail);
  return {
    observation_id: readSafeIdV1(readOwnDataV1(raw, "observation_id", fail), `${what} observation_id`, fail),
    source_head: head,
    request_id: readSafeIdV1(readOwnDataV1(raw, "request_id", fail), `${what} request_id`, fail),
    attempt_id: readSafeIdV1(readOwnDataV1(raw, "attempt_id", fail), `${what} attempt_id`, fail),
    capability_id: readSafeIdV1(readOwnDataV1(raw, "capability_id", fail), `${what} capability_id`, fail),
    rule_id: rule === null ? null : readSafeIdV1(rule, `${what} rule_id`, fail),
    path: path === null ? null : readSafeIdV1(path, `${what} path`, fail),
  };
}

function record(raw: unknown, keys: readonly string[], what: string): Record<string, unknown> {
  const value = snapshotSentrdelObservationDataV1(raw);
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(`${what} must be a record`);
  const own = Object.keys(value);
  if (own.length !== keys.length || !own.every(key => keys.includes(key))) fail(`${what} keys must match the bounded schema`);
  if ((value as Record<string, unknown>)["schema_version"] !== 1) fail(`${what} schema_version must be 1`);
  return value as Record<string, unknown>;
}

function stringList(value: unknown, what: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) fail(`${what} must be a string array`);
  return (value as string[]).map(item => readSafeIdV1(item, what, fail));
}

/** A scanned-scope entry covers a path when it names it or one of its parent directories. */
function inScope(path: string, scope: readonly string[]): boolean {
  return scope.some(entry => entry === path || path.startsWith(`${entry}/`));
}

/**
 * `retestRun` and `retestObservations` are both null when no retest exists.
 * An empty observation list with a run means the retest re-observed nothing.
 */
export function assessSentrdelRemediationV1(
  original: unknown, fix: unknown, retestRun: unknown, retestObservations: unknown,
) {
  const origin = readObservation(original, "original");
  const claim = record(fix, FIX_KEYS, "fix");
  const fixRef = readSafeIdV1(claim["fix_ref"], "fix_ref", fail);
  const fixHead = claim["fix_head"];
  if (typeof fixHead !== "string" || !SHA1.test(fixHead)) fail("fix_head must be a Git SHA-1");
  if (fixHead === origin.source_head) fail("a fix must be a different revision from the observed one");

  let state: SentrdelRemediationStateV1 = "OPEN_FIX_UNVERIFIED";
  const reasons: string[] = [];
  let run: Record<string, unknown> | null = null;
  let matches: string[] = [];
  if ((retestRun === null) !== (retestObservations === null)) fail("a retest needs both its run and its observations");
  if (retestRun !== null) {
    run = record(retestRun, RUN_KEYS, "retest run");
    if (run["source_head"] !== fixHead) fail("the retest must run at the fix head");
    if (run["capability_id"] !== origin.capability_id) fail("the retest must use the original capability");
    const requestId = readSafeIdV1(run["request_id"], "retest request_id", fail);
    const attemptId = readSafeIdV1(run["attempt_id"], "retest attempt_id", fail);
    readSafeIdV1(run["evidence_ref"], "retest evidence_ref", fail);
    if (typeof run["evidence_digest"] !== "string" || !SHA256.test(run["evidence_digest"])) fail("retest evidence_digest");
    if (!(SENTRDEL_OBSERVATION_COVERAGE_STATES as readonly unknown[]).includes(run["coverage_state"])) fail("retest coverage_state");
    const scope = stringList(run["scanned_scope"], "retest scanned_scope");
    const unknown = stringList(run["unknown_states"], "retest unknown_states");
    const observed = readOwnListV1(retestObservations, "retest observations", SENTRDEL_RETEST_MAX_OBSERVATIONS, fail)
      .map(item => readObservation(item, "retest"));
    for (const item of observed) {
      if (item.source_head !== fixHead || item.request_id !== requestId || item.attempt_id !== attemptId ||
          item.capability_id !== origin.capability_id) fail("retest observations must come from the retest run");
    }
    matches = observed.filter(item => origin.rule_id !== null && item.rule_id === origin.rule_id && item.path === origin.path)
      .map(item => item.observation_id).sort();
    if (run["execution_state"] !== "EXECUTED") reasons.push("RETEST_NOT_EXECUTED");
    if (run["coverage_state"] !== "COMPLETE_WITHIN_STATED_SCOPE") reasons.push("RETEST_COVERAGE_NOT_COMPLETE");
    if (unknown.length > 0) reasons.push("RETEST_REPORTED_UNKNOWN_STATES");
    if (origin.rule_id === null) reasons.push("ORIGINAL_HAS_NO_STABLE_RULE_IDENTITY");
    if (origin.path === null || !inScope(origin.path, scope)) reasons.push("ORIGINAL_LOCATION_NOT_IN_RETEST_SCOPE");
    if (matches.length > 0) {
      state = "OPEN_STILL_OBSERVED";
    } else if (reasons.length > 0) {
      state = "OPEN_RETEST_INCOMPLETE";
    } else {
      state = "RETEST_NOT_REOBSERVED";
    }
  }
  const evidenceRef = run === null ? null : run["evidence_ref"] as string;
  const evidenceDigest = run === null ? null : run["evidence_digest"] as string;
  const digest = createHash("sha256").update(JSON.stringify([
    SENTRDEL_REMEDIATION_AUTHORITY, origin.observation_id, fixRef, fixHead, state, reasons, matches, evidenceRef, evidenceDigest,
  ]), "utf8").digest("hex");
  return Object.freeze({
    schema_version: 1 as const,
    phase_authority: SENTRDEL_REMEDIATION_AUTHORITY,
    assessment_id: `remediation-retest:${digest}`,
    observation_id: origin.observation_id,
    observed_head: origin.source_head,
    fix_ref: fixRef,
    fix_head: fixHead,
    state,
    lifecycle_open: state !== "RETEST_NOT_REOBSERVED",
    incomplete_reasons: Object.freeze([...reasons]),
    reobserved_observation_ids: Object.freeze(matches),
    retest_evidence_ref: evidenceRef,
    retest_evidence_digest: evidenceDigest,
    retest_supports_fix: state === "RETEST_NOT_REOBSERVED",
    remediation_verified: false as const,
    finding_emitted: false as const,
    assurance_effect: "NONE" as const,
  });
}
