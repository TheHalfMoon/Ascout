import { isDeepStrictEqual } from "node:util";

import {
  assertSameAssuranceTargetV1,
  parseAssuranceTargetV1,
  type AssuranceTargetV1,
} from "./target.js";

export const ASSURANCE_INTENT_SCHEMA_VERSION = 1 as const;

export const ASSURANCE_PROFILES = [
  "LIVE",
  "QUICK",
  "STANDARD",
  "WORKSPACE",
  "DEEP",
  "ADVERSARIAL",
  "RELEASE",
] as const;

export const ASSURANCE_SCOPES = [
  "REVIEW",
  "TEST",
  "SECURITY",
  "CYBER",
  "ASSURE",
  "REALITY",
] as const;

export const ASSURANCE_EFFECT_CLASSES = [
  "E0_READ_ONLY_ANALYSIS",
  "E1_LOCAL_DETERMINISTIC_PROCESS",
  "E2_LOCAL_WRITE_ARTIFACT_ONLY",
  "E3_ISOLATED_LOCAL_EXECUTION",
  "E4_BROWSER_OR_APP_INTERACTION",
  "E5_AUTHORIZED_NETWORK_READ",
  "E6_AUTHORIZED_EXTERNAL_SIDE_EFFECT",
  "E7_ACTIVE_SECURITY_VALIDATION",
] as const;

export const ASSURANCE_SURFACE_KINDS = [
  "TERMINAL",
  "JSON",
  "MCP",
  "IDE",
  "CI",
  "GITHUB",
] as const;

export type AssuranceProfile = (typeof ASSURANCE_PROFILES)[number];
export type AssuranceScope = (typeof ASSURANCE_SCOPES)[number];
export type AssuranceEffectClass = (typeof ASSURANCE_EFFECT_CLASSES)[number];
export type AssuranceSurfaceKind = (typeof ASSURANCE_SURFACE_KINDS)[number];

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const CLAIM_ID = /^[A-Z][A-Z0-9_]{0,63}$/u;
const SELECTOR =
  /^([a-z][a-z0-9_-]{0,31}):([A-Za-z0-9._@*?/-]{1,223})$/u;

const MAX_CONSTRAINTS = 128;

export interface AssuranceIntentConstraintsV1 {
  readonly include: readonly string[];
  readonly exclude: readonly string[];
}

export interface AssuranceIntentBudgetV1 {
  readonly max_wall_time_ms: number | null;
  readonly max_concurrency: number;
  readonly max_engine_runs: number;
  readonly max_artifact_bytes: number | null;
  readonly max_network_requests: number | null;
  readonly max_network_egress_bytes: number | null;
  readonly max_model_tokens: number | null;
  readonly max_cost_microunits: number | null;
}

export interface AssuranceSurfaceProvenanceV1 {
  readonly surface_kind: AssuranceSurfaceKind;
  readonly surface_request_id: string | null;
}

export interface AssuranceIntentV1 {
  readonly schema_version: 1;
  readonly intent_id: string;
  readonly requested_claim: string;
  readonly profile: AssuranceProfile;
  readonly scope: AssuranceScope;
  readonly constraints: AssuranceIntentConstraintsV1;
  readonly maximum_effect_class: AssuranceEffectClass;
  readonly budget: AssuranceIntentBudgetV1;
  readonly target: AssuranceTargetV1;
  readonly surface_provenance: AssuranceSurfaceProvenanceV1;
}

export interface AssuranceIntentInputV1 {
  readonly intent_id: string;
  readonly requested_claim: string;
  readonly profile: AssuranceProfile;
  readonly scope: AssuranceScope;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly maximum_effect_class: AssuranceEffectClass;
  readonly budget: AssuranceIntentBudgetV1;
  readonly target: AssuranceTargetV1;
  readonly surface_provenance: AssuranceSurfaceProvenanceV1;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(field + " must be an object");
  return value;
}

function requireExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  field: string,
): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (!isDeepStrictEqual(actual, wanted)) {
    throw new TypeError(field + " contains missing or unknown fields");
  }
}

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be a bounded opaque identifier");
  }
  return value;
}

function requireNullableOpaqueId(value: unknown, field: string): string | null {
  return value === null ? null : requireOpaqueId(value, field);
}

function requireClaimId(value: unknown): string {
  if (typeof value !== "string" || !CLAIM_ID.test(value)) {
    throw new TypeError("requested_claim must be an uppercase bounded claim identifier");
  }
  return value;
}

function requireEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new TypeError(field + " is invalid or unsupported");
  }
  return value as T[number];
}

function requireSafeInteger(
  value: unknown,
  field: string,
  minimum: number,
): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new TypeError(field + " must be a safe integer >= " + minimum);
  }
  return value as number;
}

function requireNullableSafeInteger(
  value: unknown,
  field: string,
  minimum: number,
): number | null {
  return value === null ? null : requireSafeInteger(value, field, minimum);
}

function requireSelector(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new TypeError(field + " contains an invalid scope selector");
  }
  const match = SELECTOR.exec(value);
  if (match === null) {
    throw new TypeError(field + " contains an invalid scope selector");
  }
  const selectorValue = match[2]!;
  if (
    selectorValue.startsWith("/") ||
    selectorValue.includes("\\") ||
    selectorValue.split("/").includes("..")
  ) {
    throw new TypeError(field + " contains an invalid scope selector");
  }
  return value;
}
function normalizeSelectors(values: readonly string[], field: string): readonly string[] {
  if (!Array.isArray(values) || values.length > MAX_CONSTRAINTS) {
    throw new TypeError(field + " must contain at most " + MAX_CONSTRAINTS + " selectors");
  }
  const parsed = values.map((value, index) =>
    requireSelector(value, field + "[" + index + "]"),
  );
  return [...new Set(parsed)].sort();
}

function parseCanonicalSelectors(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_CONSTRAINTS) {
    throw new TypeError(field + " must contain at most " + MAX_CONSTRAINTS + " selectors");
  }
  const parsed = value.map((item, index) =>
    requireSelector(item, field + "[" + index + "]"),
  );
  const canonical = [...new Set(parsed)].sort();
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError(field + " must be unique and canonically sorted");
  }
  return parsed;
}

function parseConstraints(value: unknown): AssuranceIntentConstraintsV1 {
  const record = requireRecord(value, "constraints");
  requireExactKeys(record, ["include", "exclude"], "constraints");

  const include = parseCanonicalSelectors(record.include, "constraints.include");
  const exclude = parseCanonicalSelectors(record.exclude, "constraints.exclude");
  const excluded = new Set(exclude);
  const conflict = include.find((selector) => excluded.has(selector));
  if (conflict !== undefined) {
    throw new TypeError("constraints include/exclude conflict: " + conflict);
  }
  return { include, exclude };
}

function parseBudget(value: unknown): AssuranceIntentBudgetV1 {
  const record = requireRecord(value, "budget");
  requireExactKeys(record, [
    "max_wall_time_ms",
    "max_concurrency",
    "max_engine_runs",
    "max_artifact_bytes",
    "max_network_requests",
    "max_network_egress_bytes",
    "max_model_tokens",
    "max_cost_microunits",
  ], "budget");

  return {
    max_wall_time_ms: requireNullableSafeInteger(
      record.max_wall_time_ms,
      "budget.max_wall_time_ms",
      1,
    ),
    max_concurrency: requireSafeInteger(
      record.max_concurrency,
      "budget.max_concurrency",
      1,
    ),
    max_engine_runs: requireSafeInteger(
      record.max_engine_runs,
      "budget.max_engine_runs",
      1,
    ),
    max_artifact_bytes: requireNullableSafeInteger(
      record.max_artifact_bytes,
      "budget.max_artifact_bytes",
      0,
    ),
    max_network_requests: requireNullableSafeInteger(
      record.max_network_requests,
      "budget.max_network_requests",
      0,
    ),
    max_network_egress_bytes: requireNullableSafeInteger(
      record.max_network_egress_bytes,
      "budget.max_network_egress_bytes",
      0,
    ),
    max_model_tokens: requireNullableSafeInteger(
      record.max_model_tokens,
      "budget.max_model_tokens",
      0,
    ),
    max_cost_microunits: requireNullableSafeInteger(
      record.max_cost_microunits,
      "budget.max_cost_microunits",
      0,
    ),
  };
}
function parseSurfaceProvenance(value: unknown): AssuranceSurfaceProvenanceV1 {
  const record = requireRecord(value, "surface_provenance");
  requireExactKeys(
    record,
    ["surface_kind", "surface_request_id"],
    "surface_provenance",
  );
  return {
    surface_kind: requireEnum(
      record.surface_kind,
      ASSURANCE_SURFACE_KINDS,
      "surface_provenance.surface_kind",
    ),
    surface_request_id: requireNullableOpaqueId(
      record.surface_request_id,
      "surface_provenance.surface_request_id",
    ),
  };
}

export function parseAssuranceIntentV1(value: unknown): AssuranceIntentV1 {
  const record = requireRecord(value, "assurance intent");
  requireExactKeys(record, [
    "schema_version",
    "intent_id",
    "requested_claim",
    "profile",
    "scope",
    "constraints",
    "maximum_effect_class",
    "budget",
    "target",
    "surface_provenance",
  ], "assurance intent");

  if (record.schema_version !== ASSURANCE_INTENT_SCHEMA_VERSION) {
    throw new TypeError("assurance intent schema_version must equal 1");
  }

  return {
    schema_version: ASSURANCE_INTENT_SCHEMA_VERSION,
    intent_id: requireOpaqueId(record.intent_id, "intent_id"),
    requested_claim: requireClaimId(record.requested_claim),
    profile: requireEnum(record.profile, ASSURANCE_PROFILES, "profile"),
    scope: requireEnum(record.scope, ASSURANCE_SCOPES, "scope"),
    constraints: parseConstraints(record.constraints),
    maximum_effect_class: requireEnum(
      record.maximum_effect_class,
      ASSURANCE_EFFECT_CLASSES,
      "maximum_effect_class",
    ),
    budget: parseBudget(record.budget),
    target: parseAssuranceTargetV1(record.target),
    surface_provenance: parseSurfaceProvenance(record.surface_provenance),
  };
}

export function createAssuranceIntentV1(input: AssuranceIntentInputV1): AssuranceIntentV1 {
  const include = normalizeSelectors(input.include, "include");
  const exclude = normalizeSelectors(input.exclude, "exclude");
  const excluded = new Set(exclude);
  const conflict = include.find((selector) => excluded.has(selector));
  if (conflict !== undefined) {
    throw new TypeError("constraints include/exclude conflict: " + conflict);
  }

  return parseAssuranceIntentV1({
    schema_version: ASSURANCE_INTENT_SCHEMA_VERSION,
    intent_id: input.intent_id,
    requested_claim: input.requested_claim,
    profile: input.profile,
    scope: input.scope,
    constraints: { include, exclude },
    maximum_effect_class: input.maximum_effect_class,
    budget: input.budget,
    target: input.target,
    surface_provenance: input.surface_provenance,
  });
}

export function assertAssuranceIntentTargetV1(
  intent: unknown,
  target: unknown,
): void {
  const parsedIntent = parseAssuranceIntentV1(intent);
  assertSameAssuranceTargetV1(parsedIntent.target, target);
}
