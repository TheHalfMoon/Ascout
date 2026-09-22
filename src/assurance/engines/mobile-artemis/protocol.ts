import { isDeepStrictEqual } from "node:util";

import { parseMobileEffect, type MobileEffect } from "./effects.js";

export const MOBILE_ARTEMIS_PROTOCOL_VERSION = 1 as const;

export const MOBILE_COMPLETION_STATES = [
  "PASS",
  "FAIL",
  "BLOCKED",
  "INCOMPLETE",
  "INCONCLUSIVE",
  "REFUSED",
  "ERROR",
  "NOT_RUN",
  "STALE",
  "UNKNOWN",
] as const;

export type MobileCompletionState =
  (typeof MOBILE_COMPLETION_STATES)[number];

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const GIT_SHA_HEX = /^[a-f0-9]{40}$/u;

export type MobileNegotiationResult =
  | { readonly status: "NEGOTIATED"; readonly version: 1 }
  | {
      readonly status: "REFUSED";
      readonly reason: "EMPTY_OFFER" | "UNKNOWN_PROTOCOL_VERSION";
    };

export function negotiateMobileProtocolV1(
  offered: readonly number[],
): MobileNegotiationResult {
  if (offered.length === 0) {
    return { status: "REFUSED", reason: "EMPTY_OFFER" };
  }
  for (const version of offered) {
    if (version === MOBILE_ARTEMIS_PROTOCOL_VERSION) {
      return { status: "NEGOTIATED", version: 1 };
    }
  }
  return { status: "REFUSED", reason: "UNKNOWN_PROTOCOL_VERSION" };
}

export interface MobileBindingExpectationV1 {
  readonly donor_sha: string;
  readonly protocol_version: number;
  readonly descriptor_digest: string;
}

export interface MobileBindingActualV1 {
  readonly donor_sha: string;
  readonly protocol_version: number;
  readonly descriptor_digest: string;
}

export type MobileFreshnessResult =
  | { readonly status: "FRESH" }
  | {
      readonly status: "STALE";
      readonly reason:
        | "STALE_DONOR_SHA"
        | "STALE_PROTOCOL_VERSION"
        | "STALE_DESCRIPTOR_DIGEST";
    };

export function assertFreshMobileBindingV1(
  expected: MobileBindingExpectationV1,
  actual: MobileBindingActualV1,
): MobileFreshnessResult {
  if (actual.donor_sha !== expected.donor_sha) {
    return { status: "STALE", reason: "STALE_DONOR_SHA" };
  }
  if (actual.protocol_version !== expected.protocol_version) {
    return { status: "STALE", reason: "STALE_PROTOCOL_VERSION" };
  }
  if (actual.descriptor_digest !== expected.descriptor_digest) {
    return { status: "STALE", reason: "STALE_DESCRIPTOR_DIGEST" };
  }
  return { status: "FRESH" };
}

export interface MobileRequestContextInputV1 {
  readonly run_id: string;
  readonly source_digest: string;
  readonly engine_descriptor_digest: string;
  readonly donor_sha: string;
}

export interface MobileRequestContextV1 {
  readonly protocol_version: 1;
  readonly run_id: string;
  readonly source_digest: string;
  readonly engine_descriptor_digest: string;
  readonly donor_sha: string;
}

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be an opaque id");
  }
  return value;
}

function requireSha256(value: unknown, field: string): string {
  if (typeof value !== "string" || !SHA256_HEX.test(value)) {
    throw new TypeError(field + " must be sha256 hex");
  }
  return value;
}

function requireGitSha(value: unknown, field: string): string {
  if (typeof value !== "string" || !GIT_SHA_HEX.test(value)) {
    throw new TypeError(field + " must be a 40-char git sha");
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function bindMobileRequestContextV1(
  input: MobileRequestContextInputV1,
): MobileRequestContextV1 {
  return deepFreeze({
    protocol_version: MOBILE_ARTEMIS_PROTOCOL_VERSION,
    run_id: requireOpaqueId(input.run_id, "run_id"),
    source_digest: requireSha256(input.source_digest, "source_digest"),
    engine_descriptor_digest: requireSha256(
      input.engine_descriptor_digest,
      "engine_descriptor_digest",
    ),
    donor_sha: requireGitSha(input.donor_sha, "donor_sha"),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  field: string,
): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (!isDeepStrictEqual(actual, wanted)) {
    throw new TypeError(field + " must contain exactly the contract keys");
  }
}

function requireProtocolVersion(value: unknown, field: string): 1 {
  if (value !== MOBILE_ARTEMIS_PROTOCOL_VERSION) {
    throw new TypeError(field + " must be protocol version 1");
  }
  return 1;
}

function requireNonNegativeInteger(value: unknown, field: string): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 1000000
  ) {
    throw new TypeError(field + " must be a bounded non-negative integer");
  }
  return value;
}

export interface MobileRequestBudgetsV1 {
  readonly max_steps: number;
  readonly max_seconds: number;
}

export interface MobileRequestV1 {
  readonly protocol_version: 1;
  readonly request_id: string;
  readonly effect: MobileEffect;
  readonly action: string;
  readonly budgets: MobileRequestBudgetsV1;
  readonly context: MobileRequestContextV1;
}

export type MobileParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string };

export function parseMobileRequestV1(value: unknown): MobileParseResult<MobileRequestV1> {
  try {
    if (!isRecord(value)) throw new TypeError("request must be an object");
    requireExactKeys(
      value,
      ["protocol_version", "request_id", "effect", "action", "budgets", "context"],
      "request",
    );
    const protocol_version = requireProtocolVersion(
      value["protocol_version"],
      "request.protocol_version",
    );
    const request_id = requireOpaqueId(value["request_id"], "request.request_id");
    const effect = parseMobileEffect(value["effect"]);
    if (effect === null) throw new TypeError("request.effect is unknown");
    const action = requireOpaqueId(value["action"], "request.action");
    const budgetsRaw = value["budgets"];
    if (!isRecord(budgetsRaw)) throw new TypeError("request.budgets must be an object");
    requireExactKeys(budgetsRaw, ["max_steps", "max_seconds"], "request.budgets");
    const budgets: MobileRequestBudgetsV1 = {
      max_steps: requireNonNegativeInteger(budgetsRaw["max_steps"], "request.budgets.max_steps"),
      max_seconds: requireNonNegativeInteger(budgetsRaw["max_seconds"], "request.budgets.max_seconds"),
    };
    const context = bindMobileRequestContextV1(
      value["context"] as MobileRequestContextInputV1,
    );
    return {
      ok: true,
      value: deepFreeze({ protocol_version, request_id, effect, action, budgets, context }),
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "request rejected",
    };
  }
}

export interface MobileResultV1 {
  readonly protocol_version: 1;
  readonly request_id: string;
  readonly completion_state: MobileCompletionState;
  readonly attempted_actions: readonly string[];
  readonly blocked_actions: readonly string[];
}

function requireStringArray(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(field + " must be an array");
  const out: string[] = [];
  if (value.length > 1024) throw new TypeError(field + " exceeds item bound");
  for (const entry of value) {
    out.push(requireOpaqueId(entry, field + "[]"));
  }
  return out;
}

function requireCompletionState(value: unknown, field: string): MobileCompletionState {
  if (
    typeof value !== "string" ||
    !(MOBILE_COMPLETION_STATES as readonly string[]).includes(value)
  ) {
    throw new TypeError(field + " must be a canonical completion state");
  }
  return value as MobileCompletionState;
}

export function parseMobileResultV1(value: unknown): MobileParseResult<MobileResultV1> {
  try {
    if (!isRecord(value)) throw new TypeError("result must be an object");
    requireExactKeys(
      value,
      ["protocol_version", "request_id", "completion_state", "attempted_actions", "blocked_actions"],
      "result",
    );
    const result: MobileResultV1 = {
      protocol_version: requireProtocolVersion(value["protocol_version"], "result.protocol_version"),
      request_id: requireOpaqueId(value["request_id"], "result.request_id"),
      completion_state: requireCompletionState(value["completion_state"], "result.completion_state"),
      attempted_actions: requireStringArray(value["attempted_actions"], "result.attempted_actions"),
      blocked_actions: requireStringArray(value["blocked_actions"], "result.blocked_actions"),
    };
    return { ok: true, value: deepFreeze(result) };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "result rejected",
    };
  }
}
