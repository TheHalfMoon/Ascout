/**
 * Spec 016 P016-05: browser evidence binding and oracle-record authority.
 *
 * This module emits Ascout-owned evidence for browser execution and owns
 * the first concrete acceptance surface for `REQ-ORACLE-MESH`. It records
 * action attempts in order (failures preserved), DOM/accessibility facts,
 * privacy-bounded network metadata, console/page-error records, artifact
 * references, and explicit oracle records — then assembles them into
 * source-bound bundles with drift checks and blocking-reason enumeration.
 *
 * Authority rules enforced here:
 *
 * - deterministic oracle kinds may gate only with independent provenance;
 * - model/human oracle kinds are advisory-only and can never silently
 *   acquire deterministic PASS authority;
 * - model oracles require an explicit calibration state;
 * - circular or unresolved oracle independence fails closed;
 * - malformed, dangling, duplicate, or contradictory oracle records throw;
 * - cross-tree evidence is rejected at assembly, never merged;
 * - network evidence stores method/origin/path only (no query, fragment,
 *   credentials, headers, or bodies) and rejects anything richer;
 * - free-text evidence rejects unambiguous raw secret markers;
 * - blocking reasons are enumerated, never averaged into a score.
 */

import { createHash } from "node:crypto";
import {
  createActionResponse,
  createArtifactRef,
  createAssertionResponse,
} from "./executor.js";
import type {
  BrowserArtifactRef,
  BrowserAssertionResponse,
} from "./executor.js";

export type BrowserOracleKind =
  | "dom_deterministic"
  | "accessibility_deterministic"
  | "network_deterministic"
  | "console_error_deterministic"
  | "page_error_deterministic"
  | "application_state_deterministic"
  | "visual_golden_deterministic"
  | "visual_semantic_model"
  | "semantic_model"
  | "human";

export type BrowserOracleAuthority = "gating" | "advisory";

export type BrowserOracleIndependence =
  | "independent"
  | "implementation_derived"
  | "unresolved";

export type BrowserEvidenceType =
  | "action-attempt"
  | "dom-fact"
  | "accessibility-fact"
  | "network-record"
  | "console-record"
  | "artifact-ref"
  | "state-observation";

export interface BrowserOracleProvenance {
  readonly origin: string;
  readonly detail: string | null;
}

export interface BrowserOracleRecord {
  readonly oracle_id: string;
  readonly oracle_kind: BrowserOracleKind;
  readonly producer: string;
  readonly version: string;
  readonly provenance: BrowserOracleProvenance;
  readonly independence_class: BrowserOracleIndependence;
  readonly calibration_state: string | null;
  readonly authority: BrowserOracleAuthority;
  readonly required_evidence_types: readonly BrowserEvidenceType[];
  readonly source_identity: string;
}

export interface BrowserActionAttempt {
  readonly attempt_index: number;
  readonly request_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly kind: string;
  readonly target: string;
  readonly status: string;
  readonly duration_ms: number;
  readonly error_code: string | null;
  readonly error_message: string | null;
  readonly evidence_refs: readonly string[];
}

export type BrowserDomProperty =
  | "text"
  | "value"
  | "visible"
  | "count"
  | "enabled"
  | "checked";

export interface BrowserDomFact {
  readonly fact_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly subject: string;
  readonly property: BrowserDomProperty;
  readonly observation: string;
}

export interface BrowserAccessibilityFact {
  readonly fact_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly role: string;
  readonly name: string;
  readonly property: BrowserDomProperty;
  readonly observation: string;
}

export interface BrowserNetworkRecord {
  readonly record_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly method: string;
  readonly origin: string;
  readonly path: string;
  readonly response_status: number | null;
  readonly request_count: number;
}

export type BrowserConsoleStream = "console-error" | "page-error";

export interface BrowserConsoleRecord {
  readonly record_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly stream: BrowserConsoleStream;
  readonly message: string;
  readonly count: number;
}

export interface BrowserEvidenceBundle {
  readonly bundle_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly intent_digest: string | null;
  readonly attempts: readonly BrowserActionAttempt[];
  readonly dom_facts: readonly BrowserDomFact[];
  readonly accessibility_facts: readonly BrowserAccessibilityFact[];
  readonly network_records: readonly BrowserNetworkRecord[];
  readonly console_records: readonly BrowserConsoleRecord[];
  readonly artifacts: readonly BrowserArtifactRef[];
  readonly assertions: readonly BrowserAssertionResponse[];
  readonly oracle_records: readonly BrowserOracleRecord[];
}

const ORACLE_KINDS: readonly BrowserOracleKind[] = [
  "dom_deterministic",
  "accessibility_deterministic",
  "network_deterministic",
  "console_error_deterministic",
  "page_error_deterministic",
  "application_state_deterministic",
  "visual_golden_deterministic",
  "visual_semantic_model",
  "semantic_model",
  "human",
];

const DETERMINISTIC_ORACLE_KINDS: readonly BrowserOracleKind[] = [
  "dom_deterministic",
  "accessibility_deterministic",
  "network_deterministic",
  "console_error_deterministic",
  "page_error_deterministic",
  "application_state_deterministic",
  "visual_golden_deterministic",
];

const MODEL_ORACLE_KINDS: readonly BrowserOracleKind[] = [
  "visual_semantic_model",
  "semantic_model",
];

const ORACLE_AUTHORITIES: readonly BrowserOracleAuthority[] = [
  "gating",
  "advisory",
];

const ORACLE_INDEPENDENCE: readonly BrowserOracleIndependence[] = [
  "independent",
  "implementation_derived",
  "unresolved",
];

const EVIDENCE_TYPES: readonly BrowserEvidenceType[] = [
  "action-attempt",
  "dom-fact",
  "accessibility-fact",
  "network-record",
  "console-record",
  "artifact-ref",
  "state-observation",
];

const DOM_PROPERTIES: readonly BrowserDomProperty[] = [
  "text",
  "value",
  "visible",
  "count",
  "enabled",
  "checked",
];

const CONSOLE_STREAMS: readonly BrowserConsoleStream[] = [
  "console-error",
  "page-error",
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

function requireEvidenceText(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(`${field} must be non-empty`);
  }
  requireSecretFree(value, field);
}

function requireOracleKind(value: string): BrowserOracleKind {
  const found = ORACLE_KINDS.find((kind) => kind === value);
  if (found === undefined) {
    throw new TypeError(`unknown browser oracle kind: ${value}`);
  }
  return found;
}

function requireOracleAuthority(value: string): BrowserOracleAuthority {
  const found = ORACLE_AUTHORITIES.find((authority) => authority === value);
  if (found === undefined) {
    throw new TypeError(`unknown browser oracle authority: ${value}`);
  }
  return found;
}

function requireOracleIndependence(value: string): BrowserOracleIndependence {
  const found = ORACLE_INDEPENDENCE.find((entry) => entry === value);
  if (found === undefined) {
    throw new TypeError(`unknown browser oracle independence class: ${value}`);
  }
  return found;
}

function requireEvidenceType(value: string): BrowserEvidenceType {
  const found = EVIDENCE_TYPES.find((entry) => entry === value);
  if (found === undefined) {
    throw new TypeError(`unknown browser evidence type: ${value}`);
  }
  return found;
}

function requireDomProperty(value: string): BrowserDomProperty {
  const found = DOM_PROPERTIES.find((entry) => entry === value);
  if (found === undefined) {
    throw new TypeError(`unknown browser fact property: ${value}`);
  }
  return found;
}

function requireConsoleStream(value: string): BrowserConsoleStream {
  const found = CONSOLE_STREAMS.find((entry) => entry === value);
  if (found === undefined) {
    throw new TypeError(`unknown browser console stream: ${value}`);
  }
  return found;
}

/**
 * Creates a validated oracle record. Gating authority requires a
 * deterministic kind with independent provenance and fails closed
 * otherwise; model and human kinds are advisory-only; model kinds
 * require an explicit calibration state. Contradictory combinations
 * throw instead of silently downgrading.
 */
export function createOracleRecord(input: {
  readonly oracle_id: string;
  readonly oracle_kind: string;
  readonly producer: string;
  readonly version: string;
  readonly provenance: {
    readonly origin: string;
    readonly detail: string | null;
  };
  readonly independence_class: string;
  readonly calibration_state: string | null;
  readonly authority: string;
  readonly required_evidence_types: readonly string[];
  readonly source_identity: string;
}): BrowserOracleRecord {
  requireId(input.oracle_id, "oracle_id");
  const oracle_kind = requireOracleKind(input.oracle_kind);
  requireSingleLine(input.producer, "oracle producer");
  requireSingleLine(input.version, "oracle version");
  requireSingleLine(input.provenance.origin, "oracle provenance origin");
  if (input.provenance.detail !== null) {
    requireSingleLine(input.provenance.detail, "oracle provenance detail");
  }
  const independence_class = requireOracleIndependence(
    input.independence_class,
  );
  const authority = requireOracleAuthority(input.authority);
  requireId(input.source_identity, "source_identity");
  if (input.calibration_state !== null) {
    requireSingleLine(input.calibration_state, "calibration state");
  }
  const isDeterministic = (
    DETERMINISTIC_ORACLE_KINDS as readonly string[]
  ).includes(oracle_kind);
  const isModel = (MODEL_ORACLE_KINDS as readonly string[]).includes(
    oracle_kind,
  );
  if (!isDeterministic && authority === "gating") {
    throw new TypeError(
      `oracle kind ${oracle_kind} cannot carry gating authority`,
    );
  }
  if (
    authority === "gating" &&
    (independence_class === "implementation_derived" ||
      independence_class === "unresolved")
  ) {
    throw new TypeError(
      "gating oracles require independent provenance, not derived or unresolved independence",
    );
  }
  if (isModel && input.calibration_state === null) {
    throw new TypeError("model oracles require an explicit calibration state");
  }
  const seen = new Set<string>();
  const required_evidence_types: BrowserEvidenceType[] = [];
  for (const entry of input.required_evidence_types) {
    const validated = requireEvidenceType(entry);
    if (!seen.has(validated)) {
      seen.add(validated);
      required_evidence_types.push(validated);
    }
  }
  required_evidence_types.sort(compareText);
  return {
    authority,
    calibration_state: input.calibration_state,
    independence_class,
    oracle_id: input.oracle_id,
    oracle_kind,
    producer: input.producer,
    provenance: {
      detail: input.provenance.detail,
      origin: input.provenance.origin,
    },
    required_evidence_types,
    source_identity: input.source_identity,
    version: input.version,
  };
}

/**
 * Records one action attempt from an adapter response. Attempts are
 * append-only data: failures are preserved with their codes, never
 * dropped or rewritten.
 */
export function recordActionAttempt(
  attempt_index: number,
  request: { readonly kind: string; readonly target: string },
  response: {
    readonly request_id: string;
    readonly session_id: string;
    readonly source_identity: string;
    readonly status: string;
    readonly duration_ms: number;
    readonly error: {
      readonly code: string;
      readonly message: string;
    } | null;
    readonly evidence_refs: readonly string[];
  },
): BrowserActionAttempt {
  if (!Number.isSafeInteger(attempt_index) || attempt_index < 0) {
    throw new TypeError("attempt_index must be a non-negative integer");
  }
  requireSingleLine(request.kind, "attempt kind");
  requireEvidenceText(request.target, "attempt target");
  const validated = createActionResponse({
    duration_ms: response.duration_ms,
    error:
      response.error === null
        ? null
        : { code: response.error.code, message: response.error.message },
    evidence_refs: [...response.evidence_refs],
    request_id: response.request_id,
    session_id: response.session_id,
    source_identity: response.source_identity,
    status: response.status,
  });
  return {
    attempt_index,
    duration_ms: validated.duration_ms,
    error_code: validated.error === null ? null : validated.error.code,
    error_message: validated.error === null ? null : validated.error.message,
    evidence_refs: [...validated.evidence_refs],
    kind: request.kind,
    request_id: validated.request_id,
    session_id: validated.session_id,
    source_identity: validated.source_identity,
    status: validated.status,
    target: request.target,
  };
}

/**
 * Appends an attempt to an ordered log. Indexes must continue the
 * sequence without gaps, duplicates, or reordering, and every attempt
 * must bind the same session and source.
 */
export function appendAttempt(
  log: readonly BrowserActionAttempt[],
  attempt: BrowserActionAttempt,
): readonly BrowserActionAttempt[] {
  if (attempt.attempt_index !== log.length) {
    throw new TypeError(
      `attempt index ${attempt.attempt_index} breaks log order (expected ${log.length})`,
    );
  }
  const first = log[0];
  if (
    first !== undefined &&
    (attempt.session_id !== first.session_id ||
      attempt.source_identity !== first.source_identity)
  ) {
    throw new TypeError("attempt log mixes sessions or sources");
  }
  return [...log, attempt];
}

export function createDomFact(input: {
  readonly fact_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly subject: string;
  readonly property: string;
  readonly observation: string;
}): BrowserDomFact {
  requireId(input.fact_id, "fact_id");
  requireId(input.session_id, "session_id");
  requireId(input.source_identity, "source_identity");
  requireSingleLine(input.subject, "fact subject");
  const property = requireDomProperty(input.property);
  requireEvidenceText(input.observation, "fact observation");
  return {
    fact_id: input.fact_id,
    observation: input.observation,
    property,
    session_id: input.session_id,
    source_identity: input.source_identity,
    subject: input.subject,
  };
}

export function createAccessibilityFact(input: {
  readonly fact_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly role: string;
  readonly name: string;
  readonly property: string;
  readonly observation: string;
}): BrowserAccessibilityFact {
  requireId(input.fact_id, "fact_id");
  requireId(input.session_id, "session_id");
  requireId(input.source_identity, "source_identity");
  requireSingleLine(input.role, "accessible role");
  requireSingleLine(input.name, "accessible name");
  const property = requireDomProperty(input.property);
  requireEvidenceText(input.observation, "fact observation");
  return {
    fact_id: input.fact_id,
    name: input.name,
    observation: input.observation,
    property,
    role: input.role,
    session_id: input.session_id,
    source_identity: input.source_identity,
  };
}

const HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

/**
 * Records network metadata under the explicit wedge privacy policy:
 * method, bare origin, and path only. Query strings, fragments,
 * credentials, headers, and bodies are rejected — a record carrying
 * them throws instead of persisting them.
 */
export function createNetworkRecord(input: {
  readonly record_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly method: string;
  readonly url: string;
  readonly response_status: number | null;
  readonly request_count: number;
}): BrowserNetworkRecord {
  requireId(input.record_id, "record_id");
  requireId(input.session_id, "session_id");
  requireId(input.source_identity, "source_identity");
  if (!HTTP_METHODS.has(input.method)) {
    throw new TypeError(`unsupported network method: ${input.method}`);
  }
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    throw new TypeError("network url must be parseable");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError("network url must be http(s)");
  }
  if (
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new TypeError(
      "network records exclude credentials, query strings, and fragments",
    );
  }
  requireSecretFree(parsed.pathname, "network path");
  if (
    input.response_status !== null &&
    (!Number.isSafeInteger(input.response_status) ||
      input.response_status < 100 ||
      input.response_status > 599)
  ) {
    throw new TypeError("response_status must be null or an HTTP status");
  }
  if (!Number.isSafeInteger(input.request_count) || input.request_count < 1) {
    throw new TypeError("request_count must be a positive integer");
  }
  return {
    method: input.method,
    origin: parsed.origin,
    path: parsed.pathname,
    record_id: input.record_id,
    request_count: input.request_count,
    response_status: input.response_status,
    session_id: input.session_id,
    source_identity: input.source_identity,
  };
}

export function createConsoleRecord(input: {
  readonly record_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly stream: string;
  readonly message: string;
  readonly count: number;
}): BrowserConsoleRecord {
  requireId(input.record_id, "record_id");
  requireId(input.session_id, "session_id");
  requireId(input.source_identity, "source_identity");
  const stream = requireConsoleStream(input.stream);
  requireEvidenceText(input.message, "console message");
  if (!Number.isSafeInteger(input.count) || input.count < 1) {
    throw new TypeError("console count must be a positive integer");
  }
  return {
    count: input.count,
    message: input.message,
    record_id: input.record_id,
    session_id: input.session_id,
    source_identity: input.source_identity,
    stream,
  };
}

/**
 * Attaches an oracle reference to an assertion response, revalidating the
 * envelope. Every browser assertion must reference an explicit oracle
 * record before bundle assembly accepts it.
 */
export function attachOracleRef(
  response: BrowserAssertionResponse,
  oracle_id: string,
): BrowserAssertionResponse {
  requireId(oracle_id, "oracle_ref");
  return createAssertionResponse({
    duration_ms: response.duration_ms,
    error:
      response.error === null
        ? null
        : { code: response.error.code, message: response.error.message },
    evidence_refs: [...response.evidence_refs],
    oracle_ref: oracle_id,
    request_id: response.request_id,
    session_id: response.session_id,
    source_identity: response.source_identity,
    status: response.status,
  });
}

/**
 * Assembles a validated evidence bundle. Every record must bind one
 * session and one source (cross-tree input is rejected, never merged),
 * attempts must arrive in index order, oracle ids must be unique, and
 * every assertion must reference an oracle record present in the bundle.
 */
export function assembleEvidenceBundle(input: {
  readonly bundle_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly intent_digest: string | null;
  readonly attempts: readonly BrowserActionAttempt[];
  readonly dom_facts: readonly BrowserDomFact[];
  readonly accessibility_facts: readonly BrowserAccessibilityFact[];
  readonly network_records: readonly BrowserNetworkRecord[];
  readonly console_records: readonly BrowserConsoleRecord[];
  readonly artifacts: readonly BrowserArtifactRef[];
  readonly assertions: readonly BrowserAssertionResponse[];
  readonly oracle_records: readonly BrowserOracleRecord[];
}): BrowserEvidenceBundle {
  requireId(input.bundle_id, "bundle_id");
  requireId(input.session_id, "session_id");
  requireId(input.source_identity, "source_identity");
  if (input.intent_digest !== null) {
    requireId(input.intent_digest, "intent_digest");
  }
  const carriers: readonly { readonly source_identity: string }[] = [
    ...input.attempts,
    ...input.dom_facts,
    ...input.accessibility_facts,
    ...input.network_records,
    ...input.console_records,
    ...input.artifacts,
    ...input.assertions,
    ...input.oracle_records,
  ];
  for (const record of carriers) {
    if (record.source_identity !== input.source_identity) {
      throw new TypeError("cross-tree evidence bundle rejected");
    }
  }
  const sessionCarriers: readonly { readonly session_id: string }[] = [
    ...input.attempts,
    ...input.dom_facts,
    ...input.accessibility_facts,
    ...input.network_records,
    ...input.console_records,
    ...input.artifacts,
    ...input.assertions,
  ];
  for (const record of sessionCarriers) {
    if (record.session_id !== input.session_id) {
      throw new TypeError("cross-session evidence bundle rejected");
    }
  }
  input.attempts.forEach((attempt, position) => {
    if (attempt.attempt_index !== position) {
      throw new TypeError("attempt log order violated at assembly");
    }
  });
  const oracleIds = new Set<string>();
  for (const record of input.oracle_records) {
    if (oracleIds.has(record.oracle_id)) {
      throw new TypeError(`duplicate oracle record: ${record.oracle_id}`);
    }
    oracleIds.add(record.oracle_id);
  }
  for (const assertion of input.assertions) {
    if (assertion.oracle_ref === null) {
      throw new TypeError("assertion without an oracle record rejected");
    }
    if (!oracleIds.has(assertion.oracle_ref)) {
      throw new TypeError(`dangling oracle ref: ${assertion.oracle_ref}`);
    }
  }
  return {
    accessibility_facts: [...input.accessibility_facts],
    artifacts: [...input.artifacts],
    assertions: [...input.assertions],
    attempts: [...input.attempts],
    bundle_id: input.bundle_id,
    console_records: [...input.console_records],
    dom_facts: [...input.dom_facts],
    intent_digest: input.intent_digest,
    network_records: [...input.network_records],
    oracle_records: [...input.oracle_records],
    session_id: input.session_id,
    source_identity: input.source_identity,
  };
}

/**
 * Compares bundle source against a current source identity. Drift is
 * reported as data; callers must block verdicts on drift, never average
 * across it.
 */
export function checkSourceDrift(
  bundle: BrowserEvidenceBundle,
  current_source_identity: string,
): "match" | "drift" {
  return bundle.source_identity === current_source_identity
    ? "match"
    : "drift";
}

function evidenceTypePresent(
  bundle: BrowserEvidenceBundle,
  type: BrowserEvidenceType,
): boolean {
  switch (type) {
    case "action-attempt":
      return bundle.attempts.length > 0;
    case "dom-fact":
      return bundle.dom_facts.length > 0;
    case "accessibility-fact":
      return bundle.accessibility_facts.length > 0;
    case "network-record":
      return bundle.network_records.length > 0;
    case "console-record":
      return bundle.console_records.length > 0;
    case "artifact-ref":
      return bundle.artifacts.length > 0;
    case "state-observation":
      return bundle.dom_facts.length + bundle.accessibility_facts.length > 0;
  }
}

/**
 * Enumerates blocking reasons for a bundle: source drift, non-ok
 * attempts, non-passed assertions, and oracle records whose required
 * evidence types are absent. Reasons are listed, never scored; an empty
 * list means nothing in this bundle blocks, not that release is approved.
 */
export function collectBlockingReasons(
  bundle: BrowserEvidenceBundle,
  current_source_identity: string,
): readonly string[] {
  const reasons: string[] = [];
  if (checkSourceDrift(bundle, current_source_identity) === "drift") {
    reasons.push(
      `source drift: bundle ${bundle.source_identity} vs current ${current_source_identity}`,
    );
  }
  for (const attempt of bundle.attempts) {
    if (attempt.status !== "ok") {
      reasons.push(
        `attempt ${attempt.attempt_index} ${attempt.status}: ${attempt.error_code ?? "unknown"}`,
      );
    }
  }
  for (const assertion of bundle.assertions) {
    if (assertion.status !== "passed") {
      reasons.push(
        `assertion ${assertion.request_id} ${assertion.status}: ${assertion.error?.code ?? "unknown"}`,
      );
    }
  }
  for (const record of bundle.oracle_records) {
    for (const type of record.required_evidence_types) {
      if (!evidenceTypePresent(bundle, type)) {
        reasons.push(`oracle ${record.oracle_id} missing ${type}`);
      }
    }
  }
  return reasons.sort(compareText);
}

function oracleToJson(record: BrowserOracleRecord): unknown {
  return {
    authority: record.authority,
    calibration_state: record.calibration_state,
    independence_class: record.independence_class,
    oracle_id: record.oracle_id,
    oracle_kind: record.oracle_kind,
    producer: record.producer,
    provenance: {
      detail: record.provenance.detail,
      origin: record.provenance.origin,
    },
    required_evidence_types: [...record.required_evidence_types],
    source_identity: record.source_identity,
    version: record.version,
  };
}

/** Deterministic oracle serialization with fixed key order. */
export function oracleRecordToJson(record: BrowserOracleRecord): string {
  return JSON.stringify(oracleToJson(record));
}

function bundleToJsonValue(bundle: BrowserEvidenceBundle): unknown {
  return {
    accessibility_facts: bundle.accessibility_facts.map((fact) => ({
      fact_id: fact.fact_id,
      name: fact.name,
      observation: fact.observation,
      property: fact.property,
      role: fact.role,
      session_id: fact.session_id,
      source_identity: fact.source_identity,
    })),
    artifacts: bundle.artifacts.map((artifact) => ({
      artifact_id: artifact.artifact_id,
      byte_size: artifact.byte_size,
      digest: artifact.digest,
      kind: artifact.kind,
      redacted: artifact.redacted,
      session_id: artifact.session_id,
      source_identity: artifact.source_identity,
      uri: artifact.uri,
    })),
    assertions: bundle.assertions.map((assertion) => ({
      duration_ms: assertion.duration_ms,
      error:
        assertion.error === null
          ? null
          : { code: assertion.error.code, message: assertion.error.message },
      evidence_refs: [...assertion.evidence_refs],
      oracle_ref: assertion.oracle_ref,
      request_id: assertion.request_id,
      session_id: assertion.session_id,
      source_identity: assertion.source_identity,
      status: assertion.status,
    })),
    attempts: bundle.attempts.map((attempt) => ({
      attempt_index: attempt.attempt_index,
      duration_ms: attempt.duration_ms,
      error_code: attempt.error_code,
      error_message: attempt.error_message,
      evidence_refs: [...attempt.evidence_refs],
      kind: attempt.kind,
      request_id: attempt.request_id,
      session_id: attempt.session_id,
      source_identity: attempt.source_identity,
      status: attempt.status,
      target: attempt.target,
    })),
    bundle_id: bundle.bundle_id,
    console_records: bundle.console_records.map((record) => ({
      count: record.count,
      message: record.message,
      record_id: record.record_id,
      session_id: record.session_id,
      source_identity: record.source_identity,
      stream: record.stream,
    })),
    dom_facts: bundle.dom_facts.map((fact) => ({
      fact_id: fact.fact_id,
      observation: fact.observation,
      property: fact.property,
      session_id: fact.session_id,
      source_identity: fact.source_identity,
      subject: fact.subject,
    })),
    intent_digest: bundle.intent_digest,
    network_records: bundle.network_records.map((record) => ({
      method: record.method,
      origin: record.origin,
      path: record.path,
      record_id: record.record_id,
      request_count: record.request_count,
      response_status: record.response_status,
      session_id: record.session_id,
      source_identity: record.source_identity,
    })),
    oracle_records: bundle.oracle_records.map(oracleToJson),
    session_id: bundle.session_id,
    source_identity: bundle.source_identity,
  };
}

/** Deterministic bundle serialization with fixed key order. */
export function evidenceBundleToJson(bundle: BrowserEvidenceBundle): string {
  return JSON.stringify(bundleToJsonValue(bundle));
}

/** Stable sha256 digest over the canonical bundle serialization. */
export function evidenceBundleDigest(bundle: BrowserEvidenceBundle): string {
  return createHash("sha256")
    .update(evidenceBundleToJson(bundle), "utf8")
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

function readNullableNumber(
  record: Record<string, unknown>,
  field: string,
): number | null {
  const value = record[field];
  if (value !== null && typeof value !== "number") {
    throw new TypeError(`${field} must be a number or null`);
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

function readRecord(
  record: Record<string, unknown>,
  field: string,
): Record<string, unknown> {
  const value = record[field];
  if (!isRecord(value)) {
    throw new TypeError(`${field} must be an object`);
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

function parseOracleRecord(entry: Record<string, unknown>): BrowserOracleRecord {
  const provenance = readRecord(entry, "provenance");
  return createOracleRecord({
    authority: readString(entry, "authority"),
    calibration_state: readNullableString(entry, "calibration_state"),
    independence_class: readString(entry, "independence_class"),
    oracle_id: readString(entry, "oracle_id"),
    oracle_kind: readString(entry, "oracle_kind"),
    producer: readString(entry, "producer"),
    provenance: {
      detail: readNullableString(provenance, "detail"),
      origin: readString(provenance, "origin"),
    },
    required_evidence_types: readStringArray(entry, "required_evidence_types"),
    source_identity: readString(entry, "source_identity"),
    version: readString(entry, "version"),
  });
}

/** Strict oracle parsing with full revalidation; malformed input fails closed. */
export function oracleRecordFromJson(raw: string): BrowserOracleRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("oracle JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("oracle JSON must be an object");
  }
  return parseOracleRecord(parsed);
}

function parseJsonObject(raw: string, what: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError(`${what} JSON must be parseable`);
  }
  if (!isRecord(parsed)) {
    throw new TypeError(`${what} JSON must be an object`);
  }
  return parsed;
}

/**
 * Strict bundle parsing with full revalidation: every factory and the
 * assembly gate (order, uniqueness, binding, cross-tree rejection) rerun.
 */
export function evidenceBundleFromJson(raw: string): BrowserEvidenceBundle {
  const parsed = parseJsonObject(raw, "evidence bundle");
  const attempts: BrowserActionAttempt[] = readRecordArray(
    parsed,
    "attempts",
  ).map((entry, position) => {
    const attempt_index = readNumber(entry, "attempt_index");
    if (attempt_index !== position) {
      throw new TypeError("attempt log order violated at parse");
    }
    return recordActionAttempt(
      attempt_index,
      {
        kind: readString(entry, "kind"),
        target: readString(entry, "target"),
      },
      {
        duration_ms: readNumber(entry, "duration_ms"),
        error: readNullableString(entry, "error_code") === null ? null : {
          code: readString(entry, "error_code"),
          message: readString(entry, "error_message"),
        },
        evidence_refs: readStringArray(entry, "evidence_refs"),
        request_id: readString(entry, "request_id"),
        session_id: readString(entry, "session_id"),
        source_identity: readString(entry, "source_identity"),
        status: readString(entry, "status"),
      },
    );
  });
  return assembleEvidenceBundle({
    accessibility_facts: readRecordArray(parsed, "accessibility_facts").map(
      (entry) =>
        createAccessibilityFact({
          fact_id: readString(entry, "fact_id"),
          name: readString(entry, "name"),
          observation: readString(entry, "observation"),
          property: readString(entry, "property"),
          role: readString(entry, "role"),
          session_id: readString(entry, "session_id"),
          source_identity: readString(entry, "source_identity"),
        }),
    ),
    artifacts: readRecordArray(parsed, "artifacts").map((entry) =>
      createArtifactRef({
        artifact_id: readString(entry, "artifact_id"),
        byte_size: readNullableNumber(entry, "byte_size"),
        digest: readNullableString(entry, "digest"),
        kind: readString(entry, "kind"),
        redacted: readBoolean(entry, "redacted"),
        session_id: readString(entry, "session_id"),
        source_identity: readString(entry, "source_identity"),
        uri: readNullableString(entry, "uri"),
      }),
    ),
    assertions: readRecordArray(parsed, "assertions").map((entry) => {
      const errorEntry = entry.error;
      return createAssertionResponse({
        duration_ms: readNumber(entry, "duration_ms"),
        error:
          errorEntry === null
            ? null
            : (() => {
                if (!isRecord(errorEntry)) {
                  throw new TypeError("assertion error must be an object");
                }
                return {
                  code: readString(errorEntry, "code"),
                  message: readString(errorEntry, "message"),
                };
              })(),
        evidence_refs: readStringArray(entry, "evidence_refs"),
        oracle_ref: readNullableString(entry, "oracle_ref"),
        request_id: readString(entry, "request_id"),
        session_id: readString(entry, "session_id"),
        source_identity: readString(entry, "source_identity"),
        status: readString(entry, "status"),
      });
    }),
    attempts,
    bundle_id: readString(parsed, "bundle_id"),
    console_records: readRecordArray(parsed, "console_records").map((entry) =>
      createConsoleRecord({
        count: readNumber(entry, "count"),
        message: readString(entry, "message"),
        record_id: readString(entry, "record_id"),
        session_id: readString(entry, "session_id"),
        source_identity: readString(entry, "source_identity"),
        stream: readString(entry, "stream"),
      }),
    ),
    dom_facts: readRecordArray(parsed, "dom_facts").map((entry) =>
      createDomFact({
        fact_id: readString(entry, "fact_id"),
        observation: readString(entry, "observation"),
        property: readString(entry, "property"),
        session_id: readString(entry, "session_id"),
        source_identity: readString(entry, "source_identity"),
        subject: readString(entry, "subject"),
      }),
    ),
    intent_digest: readNullableString(parsed, "intent_digest"),
    network_records: readRecordArray(parsed, "network_records").map((entry) =>
      createNetworkRecord({
        method: readString(entry, "method"),
        record_id: readString(entry, "record_id"),
        request_count: readNumber(entry, "request_count"),
        response_status: readNullableNumber(entry, "response_status"),
        session_id: readString(entry, "session_id"),
        source_identity: readString(entry, "source_identity"),
        url: `${readString(entry, "origin")}${readString(entry, "path")}`,
      }),
    ),
    oracle_records: readRecordArray(parsed, "oracle_records").map(
      parseOracleRecord,
    ),
    session_id: readString(parsed, "session_id"),
    source_identity: readString(parsed, "source_identity"),
  });
}
