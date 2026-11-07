import { isDeepStrictEqual } from "node:util";

import { ENGINE_PROFILE_HARD_CAPS_V1, ENGINE_PROTOCOL_V1 } from "./engine-profile-v1.js";

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const GIT_OBJECT_ID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const MAX_CAPABILITIES = 64;
const MAX_OBSERVATIONS = 4_096;
const MAX_DIAGNOSTICS = 256;
const MAX_TEXT_LENGTH = 512;
const MAX_PATH_LENGTH = 4_096;

export const ENGINE_ENVELOPE_EXECUTION_STATES_V1 = ["COMPLETED", "PARTIAL", "FAILED"] as const;
export const ENGINE_ENVELOPE_CAPABILITY_STATES_V1 = ["EXECUTED", "NOT_RUN", "INCOMPLETE"] as const;
export const ENGINE_ENVELOPE_COVERAGE_STATES_V1 = ["COMPLETE", "PARTIAL", "NONE"] as const;

export interface EngineEnvelopeEngineV1 {
  readonly id: string;
  readonly version: string;
  readonly build: string;
}

export interface EngineEnvelopeSourceV1 {
  readonly head_sha: string;
  readonly tree_digest: string;
}

export interface EngineEnvelopeExecutionV1 {
  readonly state: (typeof ENGINE_ENVELOPE_EXECUTION_STATES_V1)[number];
  readonly started_at_epoch_ms: number;
  readonly ended_at_epoch_ms: number;
}

export interface EngineEnvelopeCapabilityV1 {
  readonly id: string;
  readonly state: (typeof ENGINE_ENVELOPE_CAPABILITY_STATES_V1)[number];
  readonly coverage: (typeof ENGINE_ENVELOPE_COVERAGE_STATES_V1)[number];
}

export interface EngineEnvelopeLocationV1 {
  readonly path: string;
  readonly start_line: number;
  readonly end_line: number;
}

export interface EngineEnvelopeObservationV1 {
  readonly observation_id: string;
  readonly capability_id: string;
  readonly rule_id: string;
  readonly location: EngineEnvelopeLocationV1 | null;
  readonly message: string;
}

export interface EngineEnvelopeDiagnosticV1 {
  readonly code: string;
  readonly message: string;
}

export interface EngineEnvelopeV1 {
  readonly protocol: typeof ENGINE_PROTOCOL_V1;
  readonly request_id: string;
  readonly engine: EngineEnvelopeEngineV1;
  readonly profile_sha256: string;
  readonly source: EngineEnvelopeSourceV1;
  readonly execution: EngineEnvelopeExecutionV1;
  readonly capabilities: readonly EngineEnvelopeCapabilityV1[];
  readonly observations: readonly EngineEnvelopeObservationV1[];
  readonly diagnostics: readonly EngineEnvelopeDiagnosticV1[];
}

export type EngineEnvelopeErrorCodeV1 = "INVALID_ENVELOPE" | "REQUEST_ID_MISMATCH";

/** Messages name fields only. Engine output is untrusted and never repeated here. */
export class EngineEnvelopeError extends Error {
  readonly code: EngineEnvelopeErrorCodeV1;

  constructor(code: EngineEnvelopeErrorCodeV1, message: string) {
    super(message);
    this.name = "EngineEnvelopeError";
    this.code = code;
  }
}

function invalid(message: string): never {
  throw new EngineEnvelopeError("INVALID_ENVELOPE", message);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid(field + " must be an object");
  }
  return value as Record<string, unknown>;
}

function requireExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  field: string,
): void {
  if (!isDeepStrictEqual(Object.keys(record).sort(), [...expected].sort())) {
    invalid(field + " contains missing or unknown fields");
  }
}

function requireArray(value: unknown, maximum: number, field: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length > maximum) {
    invalid(field + " must contain at most " + maximum + " items");
  }
  return value;
}

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    invalid(field + " must be a bounded opaque identifier");
  }
  return value;
}

function requirePattern(value: unknown, pattern: RegExp, field: string): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    invalid(field + " has an invalid form");
  }
  return value;
}

function requireOneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (!allowed.includes(value as T)) invalid(field + " is not an allowed value");
  return value as T;
}

function requireEpochMs(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    invalid(field + " must be a non-negative safe integer");
  }
  return value as number;
}

function requireLine(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    invalid(field + " must be a positive safe integer");
  }
  return value as number;
}

function requireMessage(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_TEXT_LENGTH ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    invalid(field + " must be bounded single-line text");
  }
  return value;
}

function requireRelativePath(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_PATH_LENGTH ||
    /[\u0000-\u001f\u007f\\:]/u.test(value) ||
    value.startsWith("/") ||
    value.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    invalid(field + " must be a normalized relative path");
  }
  return value;
}

function parseEngine(value: unknown): EngineEnvelopeEngineV1 {
  const record = requireRecord(value, "engine");
  requireExactKeys(record, ["id", "version", "build"], "engine");
  return {
    id: requireOpaqueId(record.id, "engine.id"),
    version: requireOpaqueId(record.version, "engine.version"),
    build: requireOpaqueId(record.build, "engine.build"),
  };
}

function parseSource(value: unknown): EngineEnvelopeSourceV1 {
  const record = requireRecord(value, "source");
  requireExactKeys(record, ["head_sha", "tree_digest"], "source");
  return {
    head_sha: requirePattern(record.head_sha, GIT_OBJECT_ID, "source.head_sha"),
    tree_digest: requirePattern(record.tree_digest, SHA256_HEX, "source.tree_digest"),
  };
}

function parseExecution(value: unknown): EngineEnvelopeExecutionV1 {
  const record = requireRecord(value, "execution");
  requireExactKeys(record, ["state", "started_at_epoch_ms", "ended_at_epoch_ms"], "execution");
  const started = requireEpochMs(record.started_at_epoch_ms, "execution.started_at_epoch_ms");
  const ended = requireEpochMs(record.ended_at_epoch_ms, "execution.ended_at_epoch_ms");
  if (ended < started) invalid("execution.ended_at_epoch_ms precedes the start");
  return {
    state: requireOneOf(record.state, ENGINE_ENVELOPE_EXECUTION_STATES_V1, "execution.state"),
    started_at_epoch_ms: started,
    ended_at_epoch_ms: ended,
  };
}

function parseCapability(value: unknown, index: number): EngineEnvelopeCapabilityV1 {
  const field = "capabilities[" + index + "]";
  const record = requireRecord(value, field);
  requireExactKeys(record, ["id", "state", "coverage"], field);
  return {
    id: requireOpaqueId(record.id, field + ".id"),
    state: requireOneOf(record.state, ENGINE_ENVELOPE_CAPABILITY_STATES_V1, field + ".state"),
    coverage: requireOneOf(
      record.coverage,
      ENGINE_ENVELOPE_COVERAGE_STATES_V1,
      field + ".coverage",
    ),
  };
}

function parseLocation(value: unknown, field: string): EngineEnvelopeLocationV1 | null {
  if (value === null) return null;
  const record = requireRecord(value, field);
  requireExactKeys(record, ["path", "start_line", "end_line"], field);
  const startLine = requireLine(record.start_line, field + ".start_line");
  const endLine = requireLine(record.end_line, field + ".end_line");
  if (endLine < startLine) invalid(field + ".end_line precedes the start");
  return {
    path: requireRelativePath(record.path, field + ".path"),
    start_line: startLine,
    end_line: endLine,
  };
}

function parseObservation(value: unknown, index: number): EngineEnvelopeObservationV1 {
  const field = "observations[" + index + "]";
  const record = requireRecord(value, field);
  requireExactKeys(
    record,
    ["observation_id", "capability_id", "rule_id", "location", "message"],
    field,
  );
  return {
    observation_id: requireOpaqueId(record.observation_id, field + ".observation_id"),
    capability_id: requireOpaqueId(record.capability_id, field + ".capability_id"),
    rule_id: requireOpaqueId(record.rule_id, field + ".rule_id"),
    location: parseLocation(record.location, field + ".location"),
    message: requireMessage(record.message, field + ".message"),
  };
}

function parseDiagnostic(value: unknown, index: number): EngineEnvelopeDiagnosticV1 {
  const field = "diagnostics[" + index + "]";
  const record = requireRecord(value, field);
  requireExactKeys(record, ["code", "message"], field);
  return {
    code: requireOpaqueId(record.code, field + ".code"),
    message: requireMessage(record.message, field + ".message"),
  };
}

function requireUnique(values: readonly string[], field: string): void {
  if (new Set(values).size !== values.length) invalid(field + " must be unique");
}

export function parseEngineEnvelopeV1(
  input: Uint8Array,
  expectedRequestId: string,
): EngineEnvelopeV1 {
  if (!(input instanceof Uint8Array)) invalid("envelope must be bytes");
  if (input.byteLength > ENGINE_PROFILE_HARD_CAPS_V1.max_stdout_bytes) {
    invalid("envelope exceeds the output cap");
  }

  let parsed: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(input);
    parsed = JSON.parse(text);
  } catch {
    invalid("envelope must be UTF-8 JSON");
  }

  const record = requireRecord(parsed, "envelope");
  requireExactKeys(
    record,
    [
      "protocol",
      "request_id",
      "engine",
      "profile_sha256",
      "source",
      "execution",
      "capabilities",
      "observations",
      "diagnostics",
    ],
    "envelope",
  );
  if (record.protocol !== ENGINE_PROTOCOL_V1) {
    invalid("envelope protocol must equal " + ENGINE_PROTOCOL_V1);
  }
  const requestId = requireOpaqueId(record.request_id, "request_id");
  if (requestId !== expectedRequestId) {
    throw new EngineEnvelopeError(
      "REQUEST_ID_MISMATCH",
      "envelope request_id does not match the request",
    );
  }

  const capabilities = requireArray(record.capabilities, MAX_CAPABILITIES, "capabilities").map(
    parseCapability,
  );
  requireUnique(capabilities.map((capability) => capability.id), "capabilities ids");

  const observations = requireArray(record.observations, MAX_OBSERVATIONS, "observations").map(
    parseObservation,
  );
  requireUnique(
    observations.map((observation) => observation.observation_id),
    "observation ids",
  );
  const capabilityIds = new Set(capabilities.map((capability) => capability.id));
  for (const observation of observations) {
    if (!capabilityIds.has(observation.capability_id)) {
      invalid("observation names a capability the envelope does not report");
    }
  }

  return {
    protocol: ENGINE_PROTOCOL_V1,
    request_id: requestId,
    engine: parseEngine(record.engine),
    profile_sha256: requirePattern(record.profile_sha256, SHA256_HEX, "profile_sha256"),
    source: parseSource(record.source),
    execution: parseExecution(record.execution),
    capabilities,
    observations,
    diagnostics: requireArray(record.diagnostics, MAX_DIAGNOSTICS, "diagnostics").map(
      parseDiagnostic,
    ),
  };
}
