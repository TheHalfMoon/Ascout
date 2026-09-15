/**
 * Spec 016 P016-03: internal BrowserExecutor contract types.
 *
 * This module defines the execution contract between Ascout's verification
 * intelligence and any browser substrate WITHOUT coupling callers to
 * Playwright APIs: session/environment identity, action and assertion
 * request/response envelopes, artifact references, and a bounded
 * timeout/cancellation contract.
 *
 * This module launches no browser, imports no browser automation library,
 * and constructs no shell commands. Statuses, timeouts, and cancellation
 * are pure data plus fail-closed predicates; the first Playwright-backed
 * implementation arrives in P016-04. There is intentionally no plugin
 * registry, loader, or dynamic capability surface here.
 */

import type { IntentActionKind, IntentConditionKind } from "./intent.js";

export const DEFAULT_ACTION_TIMEOUT_MS = 30000;
export const MAX_ACTION_TIMEOUT_MS = 120000;

export type BrowserEngineName = "chromium";

export type BrowserActionStatus =
  | "ok"
  | "timeout"
  | "refused"
  | "failed";

export type BrowserAssertionStatus =
  | "passed"
  | "failed"
  | "timeout"
  | "unavailable";

export type BrowserArtifactKind =
  | "screenshot"
  | "trace"
  | "console-log"
  | "network-log"
  | "dom-snapshot"
  | "accessibility-snapshot";

export interface BrowserEngineIdentity {
  readonly name: BrowserEngineName;
  readonly version: string;
  readonly channel: string;
}

export interface BrowserEnvironmentIdentity {
  readonly os: string;
  readonly arch: string;
  readonly runtime: string;
  readonly runtime_version: string;
}

export interface BrowserSessionIdentity {
  readonly session_id: string;
  readonly source_identity: string;
  readonly engine: BrowserEngineIdentity;
  readonly environment: BrowserEnvironmentIdentity;
  readonly application_origin: string;
  readonly browser_profile: string;
}

export interface BrowserActionRequest {
  readonly request_id: string;
  readonly session_id: string;
  readonly kind: IntentActionKind;
  readonly target: string;
  readonly value: string | null;
  readonly timeout_ms: number;
}

export interface BrowserActionError {
  readonly code: string;
  readonly message: string;
}

export interface BrowserActionResponse {
  readonly request_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly status: BrowserActionStatus;
  readonly duration_ms: number;
  readonly error: BrowserActionError | null;
  readonly evidence_refs: readonly string[];
}

export interface BrowserAssertionRequest {
  readonly request_id: string;
  readonly session_id: string;
  readonly kind: IntentConditionKind;
  readonly statement: string;
  readonly timeout_ms: number;
}

export interface BrowserAssertionResponse {
  readonly request_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly status: BrowserAssertionStatus;
  readonly duration_ms: number;
  readonly error: BrowserActionError | null;
  readonly evidence_refs: readonly string[];
  readonly oracle_ref: string | null;
}

export interface BrowserArtifactRef {
  readonly artifact_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly kind: BrowserArtifactKind;
  readonly digest: string | null;
  readonly uri: string | null;
  readonly byte_size: number | null;
  readonly redacted: boolean;
}

export interface CancellationState {
  readonly cancelled: boolean;
}

const ACTION_STATUSES: readonly BrowserActionStatus[] = [
  "ok",
  "timeout",
  "refused",
  "failed",
];

const ASSERTION_STATUSES: readonly BrowserAssertionStatus[] = [
  "passed",
  "failed",
  "timeout",
  "unavailable",
];

const ARTIFACT_KINDS: readonly BrowserArtifactKind[] = [
  "screenshot",
  "trace",
  "console-log",
  "network-log",
  "dom-snapshot",
  "accessibility-snapshot",
];

const ACTION_KINDS: readonly IntentActionKind[] = [
  "navigate",
  "click",
  "fill",
  "type",
  "press",
  "select",
  "wait_for_navigation",
  "assert",
];

const CONDITION_KINDS: readonly IntentConditionKind[] = [
  "dom",
  "accessibility",
  "network",
  "console",
  "state",
  "visual",
  "model",
  "human",
];

function requireId(value: string, field: string): void {
  if (value.length === 0 || !/^\S+$/.test(value)) {
    throw new TypeError(`${field} must be a non-empty canonical id`);
  }
}

function requireSingleLine(value: string, field: string): void {
  if (value.length === 0 || /[\r\n]/.test(value)) {
    throw new TypeError(`${field} must be non-empty single-line text`);
  }
}

function requireHttpOrigin(value: string, field: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError(`${field} must be an explicit http(s) origin`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError(`${field} must be an explicit http(s) origin`);
  }
  if (parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "") {
    throw new TypeError(`${field} must be a bare origin without path or query`);
  }
}

function requireTimeoutMs(value: number): void {
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > MAX_ACTION_TIMEOUT_MS
  ) {
    throw new TypeError(
      `timeout_ms must be an integer within 1..${MAX_ACTION_TIMEOUT_MS}`,
    );
  }
}

function requireDurationMs(value: number): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError("duration_ms must be a finite non-negative number");
  }
}

function canonicalizeRefs(values: readonly string[], field: string): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    requireId(value, `${field} ref`);
    seen.add(value);
  }
  return [...seen].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}

function looksLikeFilesystemAbsolutePath(value: string): boolean {
  return (
    /^[A-Za-z]:[\\/]/.test(value) ||
    /^\\\\/.test(value) ||
    /^~([\\/]|$)/.test(value) ||
    /^file:/i.test(value) ||
    /(^|\/)\.\.(\/|$)/.test(value)
  );
}

function requireActionKind(value: string): IntentActionKind {
  const found = ACTION_KINDS.find((kind) => kind === value);
  if (found === undefined) {
    throw new TypeError(`unknown browser action kind: ${value}`);
  }
  return found;
}

function requireConditionKind(value: string): IntentConditionKind {
  const found = CONDITION_KINDS.find((kind) => kind === value);
  if (found === undefined) {
    throw new TypeError(`unknown browser condition kind: ${value}`);
  }
  return found;
}

function requireActionStatus(value: string): BrowserActionStatus {
  const found = ACTION_STATUSES.find((status) => status === value);
  if (found === undefined) {
    throw new TypeError(`unknown browser action status: ${value}`);
  }
  return found;
}

function requireAssertionStatus(value: string): BrowserAssertionStatus {
  const found = ASSERTION_STATUSES.find((status) => status === value);
  if (found === undefined) {
    throw new TypeError(`unknown browser assertion status: ${value}`);
  }
  return found;
}

function requireArtifactKind(value: string): BrowserArtifactKind {
  const found = ARTIFACT_KINDS.find((kind) => kind === value);
  if (found === undefined) {
    throw new TypeError(`unknown browser artifact kind: ${value}`);
  }
  return found;
}

function createError(input: {
  readonly code: string;
  readonly message: string;
}): BrowserActionError {
  requireId(input.code, "error code");
  requireSingleLine(input.message, "error message");
  return { code: input.code, message: input.message };
}

/**
 * Creates a validated browser session identity. The engine declaration is
 * closed to `chromium` for the deterministic first wedge; unknown engines
 * fail closed so a new engine requires an explicit contract decision.
 */
export function createSessionIdentity(input: {
  readonly session_id: string;
  readonly source_identity: string;
  readonly engine: {
    readonly name: string;
    readonly version: string;
    readonly channel: string;
  };
  readonly environment: {
    readonly os: string;
    readonly arch: string;
    readonly runtime: string;
    readonly runtime_version: string;
  };
  readonly application_origin: string;
  readonly browser_profile: string;
}): BrowserSessionIdentity {
  requireId(input.session_id, "session_id");
  requireId(input.source_identity, "source_identity");
  if (input.engine.name !== "chromium") {
    throw new TypeError(
      `unknown browser engine (first wedge supports chromium): ${input.engine.name}`,
    );
  }
  requireSingleLine(input.engine.version, "engine version");
  requireSingleLine(input.engine.channel, "engine channel");
  requireSingleLine(input.environment.os, "environment os");
  requireSingleLine(input.environment.arch, "environment arch");
  requireSingleLine(input.environment.runtime, "environment runtime");
  requireSingleLine(input.environment.runtime_version, "runtime version");
  requireHttpOrigin(input.application_origin, "application_origin");
  requireSingleLine(input.browser_profile, "browser_profile");
  return {
    application_origin: input.application_origin,
    browser_profile: input.browser_profile,
    engine: {
      channel: input.engine.channel,
      name: "chromium",
      version: input.engine.version,
    },
    environment: {
      arch: input.environment.arch,
      os: input.environment.os,
      runtime: input.environment.runtime,
      runtime_version: input.environment.runtime_version,
    },
    session_id: input.session_id,
    source_identity: input.source_identity,
  };
}

export function createActionRequest(input: {
  readonly request_id: string;
  readonly session_id: string;
  readonly kind: string;
  readonly target: string;
  readonly value: string | null;
  readonly timeout_ms: number;
}): BrowserActionRequest {
  requireId(input.request_id, "request_id");
  requireId(input.session_id, "session_id");
  const kind = requireActionKind(input.kind);
  requireSingleLine(input.target, "action target");
  if (input.value !== null) {
    requireSingleLine(input.value, "action value");
  }
  requireTimeoutMs(input.timeout_ms);
  return {
    kind,
    request_id: input.request_id,
    session_id: input.session_id,
    target: input.target,
    timeout_ms: input.timeout_ms,
    value: input.value,
  };
}

export function createActionResponse(input: {
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
}): BrowserActionResponse {
  requireId(input.request_id, "request_id");
  requireId(input.session_id, "session_id");
  requireId(input.source_identity, "source_identity");
  const status = requireActionStatus(input.status);
  requireDurationMs(input.duration_ms);
  if (status === "ok" && input.error !== null) {
    throw new TypeError("a successful action carries no error");
  }
  if (status !== "ok" && input.error === null) {
    throw new TypeError("a non-ok action names its error");
  }
  return {
    duration_ms: input.duration_ms,
    error: input.error === null ? null : createError(input.error),
    evidence_refs: canonicalizeRefs(input.evidence_refs, "evidence"),
    request_id: input.request_id,
    session_id: input.session_id,
    source_identity: input.source_identity,
    status,
  };
}

export function createAssertionRequest(input: {
  readonly request_id: string;
  readonly session_id: string;
  readonly kind: string;
  readonly statement: string;
  readonly timeout_ms: number;
}): BrowserAssertionRequest {
  requireId(input.request_id, "request_id");
  requireId(input.session_id, "session_id");
  const kind = requireConditionKind(input.kind);
  requireSingleLine(input.statement, "assertion statement");
  requireTimeoutMs(input.timeout_ms);
  return {
    kind,
    request_id: input.request_id,
    session_id: input.session_id,
    statement: input.statement,
    timeout_ms: input.timeout_ms,
  };
}

export function createAssertionResponse(input: {
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
  readonly oracle_ref: string | null;
}): BrowserAssertionResponse {
  requireId(input.request_id, "request_id");
  requireId(input.session_id, "session_id");
  requireId(input.source_identity, "source_identity");
  const status = requireAssertionStatus(input.status);
  requireDurationMs(input.duration_ms);
  if (status === "passed" && input.error !== null) {
    throw new TypeError("a passed assertion carries no error");
  }
  if (status !== "passed" && input.error === null) {
    throw new TypeError("a non-passed assertion names its error");
  }
  if (input.oracle_ref !== null) {
    requireId(input.oracle_ref, "oracle_ref");
  }
  return {
    duration_ms: input.duration_ms,
    error: input.error === null ? null : createError(input.error),
    evidence_refs: canonicalizeRefs(input.evidence_refs, "evidence"),
    oracle_ref: input.oracle_ref,
    request_id: input.request_id,
    session_id: input.session_id,
    source_identity: input.source_identity,
    status,
  };
}

export function createArtifactRef(input: {
  readonly artifact_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly kind: string;
  readonly digest: string | null;
  readonly uri: string | null;
  readonly byte_size: number | null;
  readonly redacted: boolean;
}): BrowserArtifactRef {
  requireId(input.artifact_id, "artifact_id");
  requireId(input.session_id, "session_id");
  requireId(input.source_identity, "source_identity");
  const kind = requireArtifactKind(input.kind);
  if (input.digest !== null && !/^[0-9a-f]+$/.test(input.digest)) {
    throw new TypeError("artifact digest must be lowercase hex or null");
  }
  if (input.uri !== null) {
    requireSingleLine(input.uri, "artifact uri");
    if (
      input.uri.startsWith("/") ||
      input.uri.includes("\\") ||
      looksLikeFilesystemAbsolutePath(input.uri)
    ) {
      throw new TypeError(
        "artifact uri must be a portable relative ref or URL, never a filesystem-absolute or machine-local path",
      );
    }
  }
  if (
    input.byte_size !== null &&
    (!Number.isSafeInteger(input.byte_size) || input.byte_size < 0)
  ) {
    throw new TypeError("artifact byte_size must be a non-negative integer");
  }
  if (typeof input.redacted !== "boolean") {
    throw new TypeError("artifact redacted must be a boolean");
  }
  return {
    artifact_id: input.artifact_id,
    byte_size: input.byte_size,
    digest: input.digest,
    kind,
    redacted: input.redacted,
    session_id: input.session_id,
    source_identity: input.source_identity,
    uri: input.uri,
  };
}

/**
 * Requires a response to bind to its session: session id and source
 * identity must both match. Cross-session or cross-tree responses throw
 * instead of leaking across boundaries.
 */
export function requireBoundResponse(
  response:
    | Pick<BrowserActionResponse, "session_id" | "source_identity">
    | Pick<BrowserAssertionResponse, "session_id" | "source_identity">,
  session: Pick<BrowserSessionIdentity, "session_id" | "source_identity">,
): void {
  if (
    response.session_id !== session.session_id ||
    response.source_identity !== session.source_identity
  ) {
    throw new TypeError("response is not bound to this session");
  }
}

export function requireBoundArtifact(
  artifact: Pick<BrowserArtifactRef, "session_id" | "source_identity">,
  session: Pick<BrowserSessionIdentity, "session_id" | "source_identity">,
): void {
  if (
    artifact.session_id !== session.session_id ||
    artifact.source_identity !== session.source_identity
  ) {
    throw new TypeError("artifact is not bound to this session");
  }
}

/** A fresh cancellation state: not cancelled. States are immutable values. */
export function activeCancellation(): CancellationState {
  return { cancelled: false };
}

/** Returns the cancelled successor of a state; the input is untouched. */
export function cancelState(_state: CancellationState): CancellationState {
  return { cancelled: true };
}

/** Pure deadline predicate over explicit millisecond readings (no clock). */
export function deadlineExceeded(
  started_ms: number,
  now_ms: number,
  timeout_ms: number,
): boolean {
  requireTimeoutMs(timeout_ms);
  if (!Number.isFinite(started_ms) || !Number.isFinite(now_ms)) {
    throw new TypeError("deadline readings must be finite numbers");
  }
  return now_ms - started_ms >= timeout_ms;
}

/** Remaining budget in milliseconds, clamped at zero. */
export function remainingMs(
  started_ms: number,
  now_ms: number,
  timeout_ms: number,
): number {
  requireTimeoutMs(timeout_ms);
  if (!Number.isFinite(started_ms) || !Number.isFinite(now_ms)) {
    throw new TypeError("deadline readings must be finite numbers");
  }
  return Math.max(0, timeout_ms - (now_ms - started_ms));
}

function errorToJson(error: BrowserActionError): unknown {
  return { code: error.code, message: error.message };
}

/** Deterministic serialization with fixed key order for stable digests. */
export function sessionToJson(session: BrowserSessionIdentity): string {
  return JSON.stringify({
    application_origin: session.application_origin,
    browser_profile: session.browser_profile,
    engine: {
      channel: session.engine.channel,
      name: session.engine.name,
      version: session.engine.version,
    },
    environment: {
      arch: session.environment.arch,
      os: session.environment.os,
      runtime: session.environment.runtime,
      runtime_version: session.environment.runtime_version,
    },
    session_id: session.session_id,
    source_identity: session.source_identity,
  });
}

export function actionRequestToJson(request: BrowserActionRequest): string {
  return JSON.stringify({
    kind: request.kind,
    request_id: request.request_id,
    session_id: request.session_id,
    target: request.target,
    timeout_ms: request.timeout_ms,
    value: request.value,
  });
}

export function actionResponseToJson(response: BrowserActionResponse): string {
  return JSON.stringify({
    duration_ms: response.duration_ms,
    error: response.error === null ? null : errorToJson(response.error),
    evidence_refs: [...response.evidence_refs],
    request_id: response.request_id,
    session_id: response.session_id,
    source_identity: response.source_identity,
    status: response.status,
  });
}

export function assertionRequestToJson(
  request: BrowserAssertionRequest,
): string {
  return JSON.stringify({
    kind: request.kind,
    request_id: request.request_id,
    session_id: request.session_id,
    statement: request.statement,
    timeout_ms: request.timeout_ms,
  });
}

export function assertionResponseToJson(
  response: BrowserAssertionResponse,
): string {
  return JSON.stringify({
    duration_ms: response.duration_ms,
    error: response.error === null ? null : errorToJson(response.error),
    evidence_refs: [...response.evidence_refs],
    oracle_ref: response.oracle_ref,
    request_id: response.request_id,
    session_id: response.session_id,
    source_identity: response.source_identity,
    status: response.status,
  });
}

export function artifactToJson(artifact: BrowserArtifactRef): string {
  return JSON.stringify({
    artifact_id: artifact.artifact_id,
    byte_size: artifact.byte_size,
    digest: artifact.digest,
    kind: artifact.kind,
    redacted: artifact.redacted,
    session_id: artifact.session_id,
    source_identity: artifact.source_identity,
    uri: artifact.uri,
  });
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

function readError(
  record: Record<string, unknown>,
  field: string,
): { readonly code: string; readonly message: string } | null {
  const value = record[field];
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    throw new TypeError(`${field} must be an object or null`);
  }
  return { code: readString(value, "code"), message: readString(value, "message") };
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

/** Strict parsers below revalidate every field; malformed input fails closed. */

export function sessionFromJson(raw: string): BrowserSessionIdentity {
  const parsed = parseJsonObject(raw, "session");
  const engine = readRecord(parsed, "engine");
  const environment = readRecord(parsed, "environment");
  return createSessionIdentity({
    application_origin: readString(parsed, "application_origin"),
    browser_profile: readString(parsed, "browser_profile"),
    engine: {
      channel: readString(engine, "channel"),
      name: readString(engine, "name"),
      version: readString(engine, "version"),
    },
    environment: {
      arch: readString(environment, "arch"),
      os: readString(environment, "os"),
      runtime: readString(environment, "runtime"),
      runtime_version: readString(environment, "runtime_version"),
    },
    session_id: readString(parsed, "session_id"),
    source_identity: readString(parsed, "source_identity"),
  });
}

export function actionRequestFromJson(raw: string): BrowserActionRequest {
  const parsed = parseJsonObject(raw, "action request");
  return createActionRequest({
    kind: readString(parsed, "kind"),
    request_id: readString(parsed, "request_id"),
    session_id: readString(parsed, "session_id"),
    target: readString(parsed, "target"),
    timeout_ms: readNumber(parsed, "timeout_ms"),
    value: readNullableString(parsed, "value"),
  });
}

export function actionResponseFromJson(raw: string): BrowserActionResponse {
  const parsed = parseJsonObject(raw, "action response");
  return createActionResponse({
    duration_ms: readNumber(parsed, "duration_ms"),
    error: readError(parsed, "error"),
    evidence_refs: readStringArray(parsed, "evidence_refs"),
    request_id: readString(parsed, "request_id"),
    session_id: readString(parsed, "session_id"),
    source_identity: readString(parsed, "source_identity"),
    status: readString(parsed, "status"),
  });
}

export function assertionRequestFromJson(raw: string): BrowserAssertionRequest {
  const parsed = parseJsonObject(raw, "assertion request");
  return createAssertionRequest({
    kind: readString(parsed, "kind"),
    request_id: readString(parsed, "request_id"),
    session_id: readString(parsed, "session_id"),
    statement: readString(parsed, "statement"),
    timeout_ms: readNumber(parsed, "timeout_ms"),
  });
}

export function assertionResponseFromJson(
  raw: string,
): BrowserAssertionResponse {
  const parsed = parseJsonObject(raw, "assertion response");
  return createAssertionResponse({
    duration_ms: readNumber(parsed, "duration_ms"),
    error: readError(parsed, "error"),
    evidence_refs: readStringArray(parsed, "evidence_refs"),
    oracle_ref: readNullableString(parsed, "oracle_ref"),
    request_id: readString(parsed, "request_id"),
    session_id: readString(parsed, "session_id"),
    source_identity: readString(parsed, "source_identity"),
    status: readString(parsed, "status"),
  });
}

export function artifactFromJson(raw: string): BrowserArtifactRef {
  const parsed = parseJsonObject(raw, "artifact");
  return createArtifactRef({
    artifact_id: readString(parsed, "artifact_id"),
    byte_size: readNullableNumber(parsed, "byte_size"),
    digest: readNullableString(parsed, "digest"),
    kind: readString(parsed, "kind"),
    redacted: readBoolean(parsed, "redacted"),
    session_id: readString(parsed, "session_id"),
    source_identity: readString(parsed, "source_identity"),
    uri: readNullableString(parsed, "uri"),
  });
}
