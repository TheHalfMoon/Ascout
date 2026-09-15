/**
 * Spec 016 P016-02: deterministic IntentTest domain types and validators.
 *
 * IntentTest is Ascout's portable verification-intent representation above
 * Playwright code and above free-form natural-language prompts. It binds a
 * goal to requirement/obligation/risk provenance, preconditions, actions,
 * expected outcomes, oracle policy, recovery policy, and target surface.
 *
 * This module proposes structure only. It executes nothing, launches no
 * browser, and manufactures no PASS: natural-language text stays data, an
 * intent without a bound obligation fails closed, conditions without oracle
 * policy stay advisory, and unknown enums/versions fail closed. Oracle
 * policy entries carried here are references only; they do not constitute
 * browser oracle evidence (P016-05 owns concrete oracle records).
 */

import { createHash } from "node:crypto";

export const INTENT_VERSION = 1;

export const MAX_RECOVERY_ACTIONS = 10;
export const MAX_RETRY_ATTEMPTS = 5;

export type IntentActionKind =
  | "navigate"
  | "click"
  | "fill"
  | "type"
  | "press"
  | "select"
  | "wait_for_navigation"
  | "assert";

export type IntentConditionKind =
  | "dom"
  | "accessibility"
  | "network"
  | "console"
  | "state"
  | "visual"
  | "model"
  | "human";

export type IntentOracleClass =
  | "dom"
  | "accessibility"
  | "network"
  | "console"
  | "state"
  | "visual"
  | "model"
  | "human";

export type IntentPolicyScope =
  | "precondition"
  | "action"
  | "expected_outcome";

export type IntentProvenanceOrigin =
  | "human_authored"
  | "requirement_compiled"
  | "agent_proposed"
  | "imported_playwright"
  | "imported_donor_format";

export type IntentTargetSurface = "web";

export interface IntentAction {
  readonly kind: IntentActionKind;
  readonly target: string;
  readonly value: string | null;
}

export interface IntentCondition {
  readonly kind: IntentConditionKind;
  readonly statement: string;
}

export interface IntentOraclePolicy {
  readonly scope: IntentPolicyScope;
  readonly index: number;
  readonly oracle: IntentOracleClass;
  readonly required: boolean;
}

export interface IntentRecoveryPolicy {
  readonly allow_resolver_recovery: boolean;
  readonly allow_execution_recovery: boolean;
  readonly allow_semantic_recovery: boolean;
  readonly max_recovery_actions: number;
  readonly max_retry_attempts: number;
}

export interface IntentTarget {
  readonly surface: IntentTargetSurface;
  readonly application_origin: string;
  readonly browser_profile: string;
}

export interface IntentProvenance {
  readonly origin: IntentProvenanceOrigin;
  readonly artifact_ref: string | null;
}

export interface IntentTest {
  readonly version: 1;
  readonly intent_id: string;
  readonly requirement_refs: readonly string[];
  readonly obligation_refs: readonly string[];
  readonly risk_refs: readonly string[];
  readonly goal: string;
  readonly preconditions: readonly IntentCondition[];
  readonly actions: readonly IntentAction[];
  readonly expected_outcomes: readonly IntentCondition[];
  readonly oracle_policy: readonly IntentOraclePolicy[];
  readonly recovery_policy: IntentRecoveryPolicy;
  readonly target_surface: IntentTarget;
  readonly source_identity: string;
  readonly provenance: IntentProvenance;
}

export interface IntentPolicyRef {
  readonly scope: IntentPolicyScope;
  readonly index: number;
}

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

const ORACLE_CLASSES: readonly IntentOracleClass[] = [
  "dom",
  "accessibility",
  "network",
  "console",
  "state",
  "visual",
  "model",
  "human",
];

const POLICY_SCOPES: readonly IntentPolicyScope[] = [
  "precondition",
  "action",
  "expected_outcome",
];

const PROVENANCE_ORIGINS: readonly IntentProvenanceOrigin[] = [
  "human_authored",
  "requirement_compiled",
  "agent_proposed",
  "imported_playwright",
  "imported_donor_format",
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

function requireGoal(value: string): void {
  if (value.trim().length === 0) {
    throw new TypeError("goal must be non-empty");
  }
  requireSecretFree(value, "goal");
}

function requireSourceIdentity(value: string): void {
  if (value.length === 0 || !/^\S+$/.test(value)) {
    throw new TypeError("source_identity must be an exact non-empty identity");
  }
  requireSecretFree(value, "source_identity");
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
  requireSecretFree(value, field);
}

function requireNavigateTarget(value: string): void {
  requireSingleLine(value, "navigate target");
  if (/^https?:\/\/\S+$/.test(value)) {
    return;
  }
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !looksLikeFilesystemAbsolutePath(value) &&
    !value.includes("\\") &&
    !/\s/.test(value)
  ) {
    return;
  }
  throw new TypeError(
    "navigate target must be an https? URL or an origin-relative web path",
  );
}

function canonicalizeRefs(values: readonly string[], field: string): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    requireId(value, `${field} ref`);
    seen.add(value);
  }
  return [...seen].sort(compareText);
}

function requireActionKind(value: string): IntentActionKind {
  const found = ACTION_KINDS.find((kind) => kind === value);
  if (found === undefined) {
    throw new TypeError(`unknown intent action kind: ${value}`);
  }
  return found;
}

function requireConditionKind(value: string): IntentConditionKind {
  const found = CONDITION_KINDS.find((kind) => kind === value);
  if (found === undefined) {
    throw new TypeError(`unknown intent condition kind: ${value}`);
  }
  return found;
}

function requireOracleClass(value: string): IntentOracleClass {
  const found = ORACLE_CLASSES.find((oracle) => oracle === value);
  if (found === undefined) {
    throw new TypeError(`unknown intent oracle class: ${value}`);
  }
  return found;
}

function requirePolicyScope(value: string): IntentPolicyScope {
  const found = POLICY_SCOPES.find((scope) => scope === value);
  if (found === undefined) {
    throw new TypeError(`unknown oracle policy scope: ${value}`);
  }
  return found;
}

function scopeRank(scope: IntentPolicyScope): number {
  const rank = POLICY_SCOPES.indexOf(scope);
  if (rank < 0) {
    throw new TypeError(`unknown oracle policy scope: ${scope}`);
  }
  return rank;
}

function requireProvenanceOrigin(value: string): IntentProvenanceOrigin {
  const found = PROVENANCE_ORIGINS.find((origin) => origin === value);
  if (found === undefined) {
    throw new TypeError(`unknown intent provenance origin: ${value}`);
  }
  return found;
}

function requireRecoveryBudget(value: number, field: string, max: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) {
    throw new TypeError(`${field} must be an integer within 0..${max}`);
  }
}

function createAction(input: {
  readonly kind: string;
  readonly target: string;
  readonly value: string | null;
}): IntentAction {
  const kind = requireActionKind(input.kind);
  if (kind === "navigate") {
    requireNavigateTarget(input.target);
  } else {
    requireSingleLine(input.target, "action target");
  }
  if (input.value !== null) {
    requireSingleLine(input.value, "action value");
  }
  return { kind, target: input.target, value: input.value };
}

function createCondition(input: {
  readonly kind: string;
  readonly statement: string;
}): IntentCondition {
  const kind = requireConditionKind(input.kind);
  requireSingleLine(input.statement, "condition statement");
  return { kind, statement: input.statement };
}

function createPolicy(
  input: {
    readonly scope: string;
    readonly index: number;
    readonly oracle: string;
    readonly required: boolean;
  },
  counts: Record<IntentPolicyScope, number>,
): IntentOraclePolicy {
  const scope = requirePolicyScope(input.scope);
  if (
    !Number.isSafeInteger(input.index) ||
    input.index < 0 ||
    input.index >= counts[scope]
  ) {
    throw new TypeError("oracle policy index must reference an existing entry");
  }
  if (typeof input.required !== "boolean") {
    throw new TypeError("oracle policy required must be a boolean");
  }
  return {
    index: input.index,
    oracle: requireOracleClass(input.oracle),
    required: input.required,
    scope,
  };
}

function comparePolicy(
  left: IntentOraclePolicy,
  right: IntentOraclePolicy,
): number {
  return (
    scopeRank(left.scope) - scopeRank(right.scope) ||
    left.index - right.index ||
    compareText(left.oracle, right.oracle) ||
    Number(left.required) - Number(right.required)
  );
}

function createRecoveryPolicy(input: {
  readonly allow_resolver_recovery: boolean;
  readonly allow_execution_recovery: boolean;
  readonly allow_semantic_recovery: boolean;
  readonly max_recovery_actions: number;
  readonly max_retry_attempts: number;
}): IntentRecoveryPolicy {
  for (const [field, value] of [
    ["allow_resolver_recovery", input.allow_resolver_recovery],
    ["allow_execution_recovery", input.allow_execution_recovery],
    ["allow_semantic_recovery", input.allow_semantic_recovery],
  ] as const) {
    if (typeof value !== "boolean") {
      throw new TypeError(`${field} must be a boolean`);
    }
  }
  requireRecoveryBudget(
    input.max_recovery_actions,
    "max_recovery_actions",
    MAX_RECOVERY_ACTIONS,
  );
  requireRecoveryBudget(
    input.max_retry_attempts,
    "max_retry_attempts",
    MAX_RETRY_ATTEMPTS,
  );
  return {
    allow_execution_recovery: input.allow_execution_recovery,
    allow_resolver_recovery: input.allow_resolver_recovery,
    allow_semantic_recovery: input.allow_semantic_recovery,
    max_recovery_actions: input.max_recovery_actions,
    max_retry_attempts: input.max_retry_attempts,
  };
}

function createTarget(input: {
  readonly surface: string;
  readonly application_origin: string;
  readonly browser_profile: string;
}): IntentTarget {
  if (input.surface !== "web") {
    throw new TypeError(`unknown intent target surface: ${input.surface}`);
  }
  requireHttpOrigin(input.application_origin, "application_origin");
  requireSingleLine(input.browser_profile, "browser_profile");
  return {
    application_origin: input.application_origin,
    browser_profile: input.browser_profile,
    surface: "web",
  };
}

function createProvenance(input: {
  readonly origin: string;
  readonly artifact_ref: string | null;
}): IntentProvenance {
  const origin = requireProvenanceOrigin(input.origin);
  if (input.artifact_ref !== null) {
    requireSingleLine(input.artifact_ref, "artifact_ref");
    if (looksLikeFilesystemAbsolutePath(input.artifact_ref)) {
      throw new TypeError("artifact_ref must not be an absolute filesystem path");
    }
  }
  return { artifact_ref: input.artifact_ref, origin };
}

/**
 * The most conservative recovery posture: no recovery class allowed and zero
 * budget. Slices that permit recovery must say so explicitly per intent.
 */
export function conservativeRecoveryPolicy(): IntentRecoveryPolicy {
  return {
    allow_execution_recovery: false,
    allow_resolver_recovery: false,
    allow_semantic_recovery: false,
    max_recovery_actions: 0,
    max_retry_attempts: 0,
  };
}

/**
 * Creates a validated IntentTest. Every obligation ref must resolve against
 * the known obligation id set; dangling refs fail closed. Ref arrays are
 * deduplicated and sorted; oracle policy is canonically ordered; actions,
 * preconditions, and expected outcomes keep author order because order is
 * semantic. At least one action, one expected outcome, and one bound
 * obligation are required: an intent that does nothing, expects nothing, or
 * binds no obligation cannot satisfy the no-green-by-omission contract.
 */
export function createIntentTest(
  input: {
    readonly intent_id: string;
    readonly requirement_refs: readonly string[];
    readonly obligation_refs: readonly string[];
    readonly risk_refs: readonly string[];
    readonly goal: string;
    readonly preconditions: readonly {
      readonly kind: string;
      readonly statement: string;
    }[];
    readonly actions: readonly {
      readonly kind: string;
      readonly target: string;
      readonly value: string | null;
    }[];
    readonly expected_outcomes: readonly {
      readonly kind: string;
      readonly statement: string;
    }[];
    readonly oracle_policy: readonly {
      readonly scope: string;
      readonly index: number;
      readonly oracle: string;
      readonly required: boolean;
    }[];
    readonly recovery_policy: {
      readonly allow_resolver_recovery: boolean;
      readonly allow_execution_recovery: boolean;
      readonly allow_semantic_recovery: boolean;
      readonly max_recovery_actions: number;
      readonly max_retry_attempts: number;
    };
    readonly target_surface: {
      readonly surface: string;
      readonly application_origin: string;
      readonly browser_profile: string;
    };
    readonly source_identity: string;
    readonly provenance: {
      readonly origin: string;
      readonly artifact_ref: string | null;
    };
  },
  known_obligation_ids: readonly string[],
): IntentTest {
  requireId(input.intent_id, "intent_id");
  requireGoal(input.goal);
  requireSourceIdentity(input.source_identity);
  const requirement_refs = canonicalizeRefs(
    input.requirement_refs,
    "requirement",
  );
  const obligation_refs = canonicalizeRefs(input.obligation_refs, "obligation");
  const risk_refs = canonicalizeRefs(input.risk_refs, "risk");
  if (obligation_refs.length === 0) {
    throw new TypeError("intent must bind at least one obligation");
  }
  const known = new Set(known_obligation_ids);
  for (const ref of obligation_refs) {
    if (!known.has(ref)) {
      throw new TypeError(`dangling obligation ref: ${ref}`);
    }
  }
  if (input.actions.length === 0) {
    throw new TypeError("intent must declare at least one action");
  }
  if (input.expected_outcomes.length === 0) {
    throw new TypeError("intent must declare at least one expected outcome");
  }
  const preconditions = input.preconditions.map(createCondition);
  const actions = input.actions.map(createAction);
  const expected_outcomes = input.expected_outcomes.map(createCondition);
  const counts: Record<IntentPolicyScope, number> = {
    action: actions.length,
    expected_outcome: expected_outcomes.length,
    precondition: preconditions.length,
  };
  const oracle_policy = input.oracle_policy
    .map((entry) => createPolicy(entry, counts))
    .sort(comparePolicy);
  return {
    actions,
    expected_outcomes,
    goal: input.goal,
    intent_id: input.intent_id,
    obligation_refs,
    oracle_policy,
    preconditions,
    provenance: createProvenance(input.provenance),
    recovery_policy: createRecoveryPolicy(input.recovery_policy),
    requirement_refs,
    risk_refs,
    source_identity: input.source_identity,
    target_surface: createTarget(input.target_surface),
    version: INTENT_VERSION,
  };
}

/**
 * Reports preconditions, actions, and expected outcomes that carry no oracle
 * policy entry. Uncovered entries stay advisory: this predicate reports data
 * and grants no authority.
 */
export function uncoveredConditions(intent: IntentTest): readonly IntentPolicyRef[] {
  const covered = new Set(
    intent.oracle_policy.map((entry) => `${entry.scope}:${entry.index}`),
  );
  const refs: IntentPolicyRef[] = [];
  const scopes: readonly (readonly [IntentPolicyScope, number])[] = [
    ["precondition", intent.preconditions.length],
    ["action", intent.actions.length],
    ["expected_outcome", intent.expected_outcomes.length],
  ];
  for (const [scope, count] of scopes) {
    for (let index = 0; index < count; index += 1) {
      if (!covered.has(`${scope}:${index}`)) {
        refs.push({ index, scope });
      }
    }
  }
  return refs.sort(
    (left, right) =>
      scopeRank(left.scope) - scopeRank(right.scope) || left.index - right.index,
  );
}

function actionToJson(action: IntentAction): unknown {
  return { kind: action.kind, target: action.target, value: action.value };
}

function conditionToJson(condition: IntentCondition): unknown {
  return { kind: condition.kind, statement: condition.statement };
}

function policyToJson(policy: IntentOraclePolicy): unknown {
  return {
    index: policy.index,
    oracle: policy.oracle,
    required: policy.required,
    scope: policy.scope,
  };
}

/** Deterministic serialization with fixed key order for stable digests. */
export function intentToJson(intent: IntentTest): string {
  if (intent.version !== INTENT_VERSION) {
    throw new TypeError(`unknown intent version: ${intent.version}`);
  }
  return JSON.stringify({
    actions: intent.actions.map(actionToJson),
    expected_outcomes: intent.expected_outcomes.map(conditionToJson),
    goal: intent.goal,
    intent_id: intent.intent_id,
    obligation_refs: [...intent.obligation_refs],
    oracle_policy: [...intent.oracle_policy]
      .sort(comparePolicy)
      .map(policyToJson),
    preconditions: intent.preconditions.map(conditionToJson),
    provenance: {
      artifact_ref: intent.provenance.artifact_ref,
      origin: intent.provenance.origin,
    },
    recovery_policy: {
      allow_execution_recovery: intent.recovery_policy.allow_execution_recovery,
      allow_resolver_recovery: intent.recovery_policy.allow_resolver_recovery,
      allow_semantic_recovery: intent.recovery_policy.allow_semantic_recovery,
      max_recovery_actions: intent.recovery_policy.max_recovery_actions,
      max_retry_attempts: intent.recovery_policy.max_retry_attempts,
    },
    requirement_refs: [...intent.requirement_refs],
    risk_refs: [...intent.risk_refs],
    source_identity: intent.source_identity,
    target_surface: {
      application_origin: intent.target_surface.application_origin,
      browser_profile: intent.target_surface.browser_profile,
      surface: intent.target_surface.surface,
    },
    version: intent.version,
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

function readRecord(record: Record<string, unknown>, field: string): Record<string, unknown> {
  const value = record[field];
  if (!isRecord(value)) {
    throw new TypeError(`${field} must be an object`);
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

/**
 * Strict JSON parsing with full revalidation. Unknown versions, unknown
 * enums, malformed shapes, and dangling obligation refs all fail closed.
 */
export function intentFromJson(
  raw: string,
  known_obligation_ids: readonly string[],
): IntentTest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("intent JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("intent JSON must be an object");
  }
  if (parsed.version !== INTENT_VERSION) {
    throw new TypeError(`unknown intent version: ${String(parsed.version)}`);
  }
  const recovery = readRecord(parsed, "recovery_policy");
  const target = readRecord(parsed, "target_surface");
  const provenance = readRecord(parsed, "provenance");
  return createIntentTest(
    {
      actions: readRecordArray(parsed, "actions").map((entry) => ({
        kind: readString(entry, "kind"),
        target: readString(entry, "target"),
        value: readNullableString(entry, "value"),
      })),
      expected_outcomes: readRecordArray(parsed, "expected_outcomes").map(
        (entry) => ({
          kind: readString(entry, "kind"),
          statement: readString(entry, "statement"),
        }),
      ),
      goal: readString(parsed, "goal"),
      intent_id: readString(parsed, "intent_id"),
      obligation_refs: readStringArray(parsed, "obligation_refs"),
      oracle_policy: readRecordArray(parsed, "oracle_policy").map((entry) => ({
        index: readNumber(entry, "index"),
        oracle: readString(entry, "oracle"),
        required: readBoolean(entry, "required"),
        scope: readString(entry, "scope"),
      })),
      preconditions: readRecordArray(parsed, "preconditions").map((entry) => ({
        kind: readString(entry, "kind"),
        statement: readString(entry, "statement"),
      })),
      provenance: {
        artifact_ref: readNullableString(provenance, "artifact_ref"),
        origin: readString(provenance, "origin"),
      },
      recovery_policy: {
        allow_execution_recovery: readBoolean(
          recovery,
          "allow_execution_recovery",
        ),
        allow_resolver_recovery: readBoolean(
          recovery,
          "allow_resolver_recovery",
        ),
        allow_semantic_recovery: readBoolean(recovery, "allow_semantic_recovery"),
        max_recovery_actions: readNumber(recovery, "max_recovery_actions"),
        max_retry_attempts: readNumber(recovery, "max_retry_attempts"),
      },
      requirement_refs: readStringArray(parsed, "requirement_refs"),
      risk_refs: readStringArray(parsed, "risk_refs"),
      source_identity: readString(parsed, "source_identity"),
      target_surface: {
        application_origin: readString(target, "application_origin"),
        browser_profile: readString(target, "browser_profile"),
        surface: readString(target, "surface"),
      },
    },
    known_obligation_ids,
  );
}

/** Stable sha256 digest over the canonical serialization. */
export function intentDigest(intent: IntentTest): string {
  return createHash("sha256").update(intentToJson(intent), "utf8").digest("hex");
}
