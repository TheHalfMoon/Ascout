/**
 * Spec 016 P016-07: recovery evidence semantics.
 *
 * This module owns the recovery evidence model that must exist before
 * any autonomous recovery: three explicit classes (`resolver_recovery`,
 * `execution_recovery`, `semantic_recovery`), append-only attempt
 * histories with visible retry budgets, preserved original failures,
 * and verdict facts that can never collapse a recovered run into an
 * ordinary clean PASS.
 *
 * Authority rules enforced here:
 *
 * - recovery history is append-only: indexes continue without gaps,
 *   duplicates, or reordering, and every attempt binds one session,
 *   one source, and one retry budget;
 * - the original failure (trigger attempt, code, message) is required
 *   on every recovery attempt and is preserved in verdict facts;
 * - retry budgets are declared upfront and visible: remaining budget
 *   is computed data, and appending past exhaustion throws;
 * - semantic recovery requires an obligation ref and blocks ordinary
 *   PASS until that obligation is revalidated — automatic green is
 *   forbidden and `pass_with_recovery` never implies clean;
 * - history erasure is an explicit integrity condition:
 *   `measureRecoveryHistoryErasure` must equal
 *   `RECOVERY_HISTORY_ERASURE` (0) for an intact history;
 * - verdicts are structured facts (`clean`, `pass_with_recovery`,
 *   `blocked`, `failed`) that never reuse or weaken the
 *   constitutional task-status vocabulary.
 *
 * No autonomous recovery agent lives here (P016-16): this slice
 * records recovery evidence and integrates it into verdicts.
 */

import { createHash } from "node:crypto";

export type RecoveryClass =
  | "resolver_recovery"
  | "execution_recovery"
  | "semantic_recovery";

export type RecoveryOutcome = "recovered" | "failed" | "blocked";

export type BrowserRecoveryVerdict =
  | "clean"
  | "pass_with_recovery"
  | "blocked"
  | "failed";

export interface RecoveryBudget {
  readonly budget_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly max_attempts: number;
}

export interface RecoveryAttempt {
  readonly attempt_index: number;
  readonly recovery_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly budget_id: string;
  readonly recovery_class: RecoveryClass;
  readonly trigger_attempt_index: number;
  readonly trigger_error_code: string;
  readonly trigger_error_message: string;
  readonly corrective_action: string;
  readonly outcome: RecoveryOutcome;
  readonly obligation_ref: string | null;
  readonly evidence_refs: readonly string[];
}

export interface RecoveryHistory {
  readonly history_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly budget: RecoveryBudget;
  readonly attempts: readonly RecoveryAttempt[];
}

export interface RecoveryOriginalFailure {
  readonly attempt_index: number;
  readonly recovery_class: RecoveryClass;
  readonly trigger_attempt_index: number;
  readonly trigger_error_code: string;
}

export interface RecoveryVerdictFacts {
  readonly verdict: BrowserRecoveryVerdict;
  readonly history_digest: string;
  readonly attempt_count: number;
  readonly recovered_count: number;
  readonly failed_count: number;
  readonly blocked_count: number;
  readonly semantic_pending: readonly string[];
  readonly original_failures: readonly RecoveryOriginalFailure[];
  readonly blocking_reasons: readonly string[];
}

export const RECOVERY_BUDGET_EXHAUSTED = "E_RECOVERY_BUDGET_EXHAUSTED";
export const RECOVERY_HISTORY_GAP = "E_RECOVERY_HISTORY_GAP";
export const RECOVERY_SEMANTIC_BLOCKED = "E_RECOVERY_SEMANTIC_BLOCKED";
export const RECOVERY_BINDING_MISMATCH = "E_RECOVERY_BINDING_MISMATCH";

/**
 * Explicit integrity condition: an intact recovery history measures
 * zero erasure. Any gap, reorder, or truncation measures nonzero.
 */
export const RECOVERY_HISTORY_ERASURE = 0;

const RECOVERY_CLASSES: readonly RecoveryClass[] = [
  "resolver_recovery",
  "execution_recovery",
  "semantic_recovery",
];

const RECOVERY_OUTCOMES: readonly RecoveryOutcome[] = [
  "recovered",
  "failed",
  "blocked",
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

function requireRecoveryClass(value: string): RecoveryClass {
  const found = RECOVERY_CLASSES.find((entry) => entry === value);
  if (found === undefined) {
    throw new TypeError(`unknown recovery class: ${value}`);
  }
  return found;
}

function requireRecoveryOutcome(value: string): RecoveryOutcome {
  const found = RECOVERY_OUTCOMES.find((entry) => entry === value);
  if (found === undefined) {
    throw new TypeError(`unknown recovery outcome: ${value}`);
  }
  return found;
}

/**
 * Declares a retry budget before any recovery attempt. The budget is
 * fixed and visible: remaining attempts are computed from history
 * length, never renegotiated.
 */
export function createRecoveryBudget(input: {
  readonly budget_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly max_attempts: number;
}): RecoveryBudget {
  requireId(input.budget_id, "budget_id");
  requireId(input.session_id, "session_id");
  requireId(input.source_identity, "source_identity");
  if (
    !Number.isSafeInteger(input.max_attempts) ||
    input.max_attempts < 1
  ) {
    throw new TypeError("max_attempts must be a positive integer");
  }
  return {
    budget_id: input.budget_id,
    max_attempts: input.max_attempts,
    session_id: input.session_id,
    source_identity: input.source_identity,
  };
}

/**
 * Creates an empty history bound to one session, one source, and one
 * budget. Budget, session, and source must already agree.
 */
export function createRecoveryHistory(input: {
  readonly history_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly budget: RecoveryBudget;
}): RecoveryHistory {
  requireId(input.history_id, "history_id");
  requireId(input.session_id, "session_id");
  requireId(input.source_identity, "source_identity");
  if (
    input.budget.session_id !== input.session_id ||
    input.budget.source_identity !== input.source_identity
  ) {
    throw new TypeError(
      `${RECOVERY_BINDING_MISMATCH}: budget binds a different session or source`,
    );
  }
  return {
    attempts: [],
    budget: input.budget,
    history_id: input.history_id,
    session_id: input.session_id,
    source_identity: input.source_identity,
  };
}

/**
 * Records one recovery attempt. The original failure trigger is
 * mandatory: recovery without a preserved failure is rejected.
 * `semantic_recovery` requires an obligation ref (the obligation that
 * must be revalidated before ordinary PASS); other classes must not
 * carry one, so semantic blocking can never be implied or diluted.
 */
export function createRecoveryAttempt(input: {
  readonly attempt_index: number;
  readonly recovery_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly budget_id: string;
  readonly recovery_class: string;
  readonly trigger_attempt_index: number;
  readonly trigger_error_code: string;
  readonly trigger_error_message: string;
  readonly corrective_action: string;
  readonly outcome: string;
  readonly obligation_ref: string | null;
  readonly evidence_refs: readonly string[];
}): RecoveryAttempt {
  if (!Number.isSafeInteger(input.attempt_index) || input.attempt_index < 0) {
    throw new TypeError("attempt_index must be a non-negative integer");
  }
  requireId(input.recovery_id, "recovery_id");
  requireId(input.session_id, "session_id");
  requireId(input.source_identity, "source_identity");
  requireId(input.budget_id, "budget_id");
  const recovery_class = requireRecoveryClass(input.recovery_class);
  if (
    !Number.isSafeInteger(input.trigger_attempt_index) ||
    input.trigger_attempt_index < 0
  ) {
    throw new TypeError(
      "trigger_attempt_index must be a non-negative integer",
    );
  }
  requireSingleLine(input.trigger_error_code, "trigger error code");
  requireSingleLine(input.trigger_error_message, "trigger error message");
  requireSingleLine(input.corrective_action, "corrective action");
  const outcome = requireRecoveryOutcome(input.outcome);
  if (recovery_class === "semantic_recovery") {
    if (input.obligation_ref === null) {
      throw new TypeError(
        "semantic_recovery requires an obligation_ref for revalidation",
      );
    }
    requireId(input.obligation_ref, "obligation_ref");
  } else if (input.obligation_ref !== null) {
    throw new TypeError(
      `only semantic_recovery carries an obligation_ref, not ${recovery_class}`,
    );
  }
  const seen = new Set<string>();
  const evidence_refs: string[] = [];
  for (const ref of input.evidence_refs) {
    requireId(ref, "evidence ref");
    if (!seen.has(ref)) {
      seen.add(ref);
      evidence_refs.push(ref);
    }
  }
  evidence_refs.sort(compareText);
  return {
    attempt_index: input.attempt_index,
    budget_id: input.budget_id,
    corrective_action: input.corrective_action,
    evidence_refs,
    obligation_ref: input.obligation_ref,
    outcome,
    recovery_class,
    recovery_id: input.recovery_id,
    session_id: input.session_id,
    source_identity: input.source_identity,
    trigger_attempt_index: input.trigger_attempt_index,
    trigger_error_code: input.trigger_error_code,
    trigger_error_message: input.trigger_error_message,
  };
}

/**
 * Appends an attempt to a history. Indexes must continue the sequence
 * without gaps, duplicates, or reordering; session, source, and
 * budget must match; appending past budget exhaustion throws instead
 * of silently extending the budget.
 */
export function appendRecoveryAttempt(
  history: RecoveryHistory,
  attempt: RecoveryAttempt,
): RecoveryHistory {
  if (attempt.attempt_index !== history.attempts.length) {
    throw new TypeError(
      `${RECOVERY_HISTORY_GAP}: attempt index ${attempt.attempt_index} breaks history order (expected ${history.attempts.length})`,
    );
  }
  if (
    attempt.session_id !== history.session_id ||
    attempt.source_identity !== history.source_identity ||
    attempt.budget_id !== history.budget.budget_id
  ) {
    throw new TypeError(
      `${RECOVERY_BINDING_MISMATCH}: attempt binds a different session, source, or budget`,
    );
  }
  if (history.attempts.length >= history.budget.max_attempts) {
    throw new TypeError(
      `${RECOVERY_BUDGET_EXHAUSTED}: budget ${history.budget.budget_id} allows ${history.budget.max_attempts} attempts`,
    );
  }
  return {
    attempts: [...history.attempts, attempt],
    budget: history.budget,
    history_id: history.history_id,
    session_id: history.session_id,
    source_identity: history.source_identity,
  };
}

/** Visible remaining retry budget for a history. */
export function recoveryBudgetRemaining(history: RecoveryHistory): number {
  return history.budget.max_attempts - history.attempts.length;
}

/**
 * Measures history erasure: missing, duplicated, or reordered
 * indexes. An intact append-only history measures exactly
 * `RECOVERY_HISTORY_ERASURE` (0); anything else is nonzero.
 */
export function measureRecoveryHistoryErasure(
  history: RecoveryHistory,
): number {
  let erasure = 0;
  const seen = new Set<number>();
  history.attempts.forEach((attempt, position) => {
    if (attempt.attempt_index !== position || seen.has(attempt.attempt_index)) {
      erasure += 1;
    }
    seen.add(attempt.attempt_index);
  });
  return erasure;
}

/**
 * Verifies append-only integrity: throws unless erasure measures
 * exactly `RECOVERY_HISTORY_ERASURE` (0).
 */
export function verifyRecoveryHistoryIntact(history: RecoveryHistory): void {
  const erasure = measureRecoveryHistoryErasure(history);
  if (erasure !== RECOVERY_HISTORY_ERASURE) {
    throw new TypeError(
      `${RECOVERY_HISTORY_GAP}: recovery history erasure ${erasure} violates integrity condition ${RECOVERY_HISTORY_ERASURE}`,
    );
  }
}

/**
 * Evaluates verdict facts for a history. Rules:
 *
 * - any `failed` outcome forces `failed`;
 * - any `blocked` outcome or any semantic recovery whose obligation
 *   is not revalidated forces `blocked` with
 *   `E_RECOVERY_SEMANTIC_BLOCKED` reasons;
 * - a nonempty history with no failure or blocker yields
 *   `pass_with_recovery` — never `clean`;
 * - only an empty history yields `clean`.
 *
 * Original failures and per-class facts travel with the verdict, so
 * no final-state-only collapse is possible. The verdict vocabulary
 * is browser-scoped and never reuses task-status words.
 */
export function evaluateRecoveryVerdict(
  history: RecoveryHistory,
  revalidated_obligations: readonly string[],
): RecoveryVerdictFacts {
  verifyRecoveryHistoryIntact(history);
  const revalidated = new Set<string>();
  for (const ref of revalidated_obligations) {
    requireId(ref, "revalidated obligation ref");
    revalidated.add(ref);
  }
  let recovered_count = 0;
  let failed_count = 0;
  let blocked_count = 0;
  const pending_set = new Set<string>();
  const reasons: string[] = [];
  const original_failures: RecoveryOriginalFailure[] = history.attempts.map(
    (attempt) => ({
      attempt_index: attempt.attempt_index,
      recovery_class: attempt.recovery_class,
      trigger_attempt_index: attempt.trigger_attempt_index,
      trigger_error_code: attempt.trigger_error_code,
    }),
  );
  for (const attempt of history.attempts) {
    if (attempt.outcome === "recovered") {
      recovered_count += 1;
    } else if (attempt.outcome === "failed") {
      failed_count += 1;
      reasons.push(
        `recovery ${attempt.attempt_index} failed (${attempt.recovery_class} after attempt ${attempt.trigger_attempt_index} ${attempt.trigger_error_code})`,
      );
    } else {
      blocked_count += 1;
      reasons.push(
        `recovery ${attempt.attempt_index} blocked (${attempt.recovery_class}: ${attempt.corrective_action})`,
      );
    }
    if (
      attempt.recovery_class === "semantic_recovery" &&
      attempt.obligation_ref !== null &&
      !revalidated.has(attempt.obligation_ref)
    ) {
      pending_set.add(attempt.obligation_ref);
      reasons.push(
        `${RECOVERY_SEMANTIC_BLOCKED}: obligation ${attempt.obligation_ref} requires revalidation before ordinary PASS`,
      );
    }
  }
  const semantic_pending = [...pending_set].sort(compareText);
  let verdict: BrowserRecoveryVerdict;
  if (failed_count > 0) {
    verdict = "failed";
  } else if (blocked_count > 0 || semantic_pending.length > 0) {
    verdict = "blocked";
  } else if (history.attempts.length > 0) {
    verdict = "pass_with_recovery";
  } else {
    verdict = "clean";
  }
  return {
    attempt_count: history.attempts.length,
    blocked_count,
    blocking_reasons: reasons.sort(compareText),
    failed_count,
    history_digest: recoveryHistoryDigest(history),
    original_failures,
    recovered_count,
    semantic_pending,
    verdict,
  };
}

function attemptToJsonValue(attempt: RecoveryAttempt): unknown {
  return {
    attempt_index: attempt.attempt_index,
    budget_id: attempt.budget_id,
    corrective_action: attempt.corrective_action,
    evidence_refs: [...attempt.evidence_refs],
    obligation_ref: attempt.obligation_ref,
    outcome: attempt.outcome,
    recovery_class: attempt.recovery_class,
    recovery_id: attempt.recovery_id,
    session_id: attempt.session_id,
    source_identity: attempt.source_identity,
    trigger_attempt_index: attempt.trigger_attempt_index,
    trigger_error_code: attempt.trigger_error_code,
    trigger_error_message: attempt.trigger_error_message,
  };
}

/** Deterministic attempt serialization with fixed key order. */
export function recoveryAttemptToJson(attempt: RecoveryAttempt): string {
  return JSON.stringify(attemptToJsonValue(attempt));
}

function historyToJsonValue(history: RecoveryHistory): unknown {
  return {
    attempts: history.attempts.map(attemptToJsonValue),
    budget: {
      budget_id: history.budget.budget_id,
      max_attempts: history.budget.max_attempts,
      session_id: history.budget.session_id,
      source_identity: history.budget.source_identity,
    },
    history_id: history.history_id,
    session_id: history.session_id,
    source_identity: history.source_identity,
  };
}

/** Deterministic history serialization with fixed key order. */
export function recoveryHistoryToJson(history: RecoveryHistory): string {
  return JSON.stringify(historyToJsonValue(history));
}

/** Stable sha256 digest over the canonical history serialization. */
export function recoveryHistoryDigest(history: RecoveryHistory): string {
  return createHash("sha256")
    .update(recoveryHistoryToJson(history), "utf8")
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

function readNumber(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value !== "number") {
    throw new TypeError(`${field} must be a number`);
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

function parseRecoveryBudget(entry: Record<string, unknown>): RecoveryBudget {
  return createRecoveryBudget({
    budget_id: readString(entry, "budget_id"),
    max_attempts: readNumber(entry, "max_attempts"),
    session_id: readString(entry, "session_id"),
    source_identity: readString(entry, "source_identity"),
  });
}

function parseRecoveryAttempt(entry: Record<string, unknown>): RecoveryAttempt {
  return createRecoveryAttempt({
    attempt_index: readNumber(entry, "attempt_index"),
    budget_id: readString(entry, "budget_id"),
    corrective_action: readString(entry, "corrective_action"),
    evidence_refs: readStringArray(entry, "evidence_refs"),
    obligation_ref: readNullableString(entry, "obligation_ref"),
    outcome: readString(entry, "outcome"),
    recovery_class: readString(entry, "recovery_class"),
    recovery_id: readString(entry, "recovery_id"),
    session_id: readString(entry, "session_id"),
    source_identity: readString(entry, "source_identity"),
    trigger_attempt_index: readNumber(entry, "trigger_attempt_index"),
    trigger_error_code: readString(entry, "trigger_error_code"),
    trigger_error_message: readString(entry, "trigger_error_message"),
  });
}

/** Strict attempt parsing with full revalidation; malformed input fails closed. */
export function recoveryAttemptFromJson(raw: string): RecoveryAttempt {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("recovery attempt JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("recovery attempt JSON must be an object");
  }
  return parseRecoveryAttempt(parsed);
}

/**
 * Strict history parsing with full revalidation: every factory and
 * the append gate (order, binding, budget capacity) rerun, so a
 * serialized history that violates integrity cannot parse.
 */
export function recoveryHistoryFromJson(raw: string): RecoveryHistory {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("recovery history JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("recovery history JSON must be an object");
  }
  const budget = parseRecoveryBudget(readRecord(parsed, "budget"));
  let history = createRecoveryHistory({
    budget,
    history_id: readString(parsed, "history_id"),
    session_id: readString(parsed, "session_id"),
    source_identity: readString(parsed, "source_identity"),
  });
  for (const entry of readRecordArray(parsed, "attempts")) {
    history = appendRecoveryAttempt(history, parseRecoveryAttempt(entry));
  }
  verifyRecoveryHistoryIntact(history);
  return history;
}
