import { createHash } from "node:crypto";

export const CONFIG_V1_TASK_KEYS = [
  "typecheck",
  "lint",
  "test",
  "pytestBasic",
] as const;

export type ConfigV1TaskKey = (typeof CONFIG_V1_TASK_KEYS)[number];

export interface ConfigV1TaskOverride {
  readonly enabled?: boolean;
  readonly disabledReason?: string;
  readonly command?: readonly string[];
  readonly timeoutMs?: number;
}

export interface ConfigV1Timeouts {
  readonly defaultTaskMs?: number;
  readonly terminationGraceMs?: number;
}

export type ConfigV1Tasks = Readonly<
  Partial<Record<ConfigV1TaskKey, ConfigV1TaskOverride>>
>;

export interface ConfigV1 {
  readonly version: 1;
  readonly tasks?: ConfigV1Tasks;
  readonly timeouts?: ConfigV1Timeouts;
  readonly budgetMs?: number | null;
  readonly redactEnv?: readonly string[];
}

export class ConfigValidationError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "ConfigValidationError";
    this.path = path;
  }
}

type JsonRecord = Record<string, unknown>;

const ROOT_KEYS = new Set(["version", "tasks", "timeouts", "budgetMs", "redactEnv"]);
const TASK_KEYS = new Set<string>(CONFIG_V1_TASK_KEYS);
const TASK_OVERRIDE_KEYS = new Set(["enabled", "disabledReason", "command", "timeoutMs"]);
const TIMEOUT_KEYS = new Set(["defaultTaskMs", "terminationGraceMs"]);

function fail(path: string, message: string): never {
  throw new ConfigValidationError(path, message);
}

function isPlainRecord(value: unknown): value is JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireRecord(value: unknown, path: string): JsonRecord {
  if (!isPlainRecord(value)) {
    return fail(path, "must be a JSON object");
  }
  return value;
}

function rejectUnknownKeys(record: JsonRecord, allowed: ReadonlySet<string>, path: string): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      fail(`${path}.${key}`, "unknown property");
    }
  }
}

function hasOwn(record: JsonRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function requireIntegerAtLeast(value: unknown, minimum: number, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) {
    return fail(path, `must be an integer >= ${minimum}`);
  }
  return value;
}

function requireNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    return fail(path, "must be a non-empty string");
  }
  return value;
}

function parseCommand(value: unknown, path: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    return fail(path, "must be a non-empty argv array");
  }

  return value.map((item, index) => {
    if (typeof item !== "string") {
      return fail(`${path}[${index}]`, "must be a string");
    }
    return item;
  });
}

function parseTaskOverride(value: unknown, path: string): ConfigV1TaskOverride {
  const record = requireRecord(value, path);
  rejectUnknownKeys(record, TASK_OVERRIDE_KEYS, path);

  const result: {
    enabled?: boolean;
    disabledReason?: string;
    command?: readonly string[];
    timeoutMs?: number;
  } = {};

  if (hasOwn(record, "enabled")) {
    if (typeof record.enabled !== "boolean") {
      fail(`${path}.enabled`, "must be a boolean");
    }
    result.enabled = record.enabled;
  }

  if (hasOwn(record, "disabledReason")) {
    result.disabledReason = requireNonEmptyString(record.disabledReason, `${path}.disabledReason`);
  }

  if (record.enabled === false && !hasOwn(record, "disabledReason")) {
    fail(`${path}.disabledReason`, "is required when enabled is false");
  }

  if (hasOwn(record, "command")) {
    result.command = parseCommand(record.command, `${path}.command`);
  }

  if (hasOwn(record, "timeoutMs")) {
    result.timeoutMs = requireIntegerAtLeast(record.timeoutMs, 1, `${path}.timeoutMs`);
  }

  return result;
}

function parseTasks(value: unknown, path: string): ConfigV1Tasks {
  const record = requireRecord(value, path);
  rejectUnknownKeys(record, TASK_KEYS, path);

  const result: Partial<Record<ConfigV1TaskKey, ConfigV1TaskOverride>> = {};
  for (const taskKey of CONFIG_V1_TASK_KEYS) {
    if (hasOwn(record, taskKey)) {
      result[taskKey] = parseTaskOverride(record[taskKey], `${path}.${taskKey}`);
    }
  }
  return result;
}

function parseTimeouts(value: unknown, path: string): ConfigV1Timeouts {
  const record = requireRecord(value, path);
  rejectUnknownKeys(record, TIMEOUT_KEYS, path);

  const result: { defaultTaskMs?: number; terminationGraceMs?: number } = {};
  if (hasOwn(record, "defaultTaskMs")) {
    result.defaultTaskMs = requireIntegerAtLeast(record.defaultTaskMs, 1, `${path}.defaultTaskMs`);
  }
  if (hasOwn(record, "terminationGraceMs")) {
    result.terminationGraceMs = requireIntegerAtLeast(
      record.terminationGraceMs,
      0,
      `${path}.terminationGraceMs`,
    );
  }
  return result;
}

function parseRedactEnv(value: unknown, path: string): readonly string[] {
  if (!Array.isArray(value)) {
    return fail(path, "must be an array");
  }

  const result = value.map((item, index) => requireNonEmptyString(item, `${path}[${index}]`));
  if (new Set(result).size !== result.length) {
    fail(path, "must contain unique names");
  }
  return result;
}

export function parseConfigV1(value: unknown): ConfigV1 {
  const record = requireRecord(value, "$");
  rejectUnknownKeys(record, ROOT_KEYS, "$");

  if (!hasOwn(record, "version") || record.version !== 1) {
    fail("$.version", "must equal 1");
  }

  const result: {
    version: 1;
    tasks?: ConfigV1Tasks;
    timeouts?: ConfigV1Timeouts;
    budgetMs?: number | null;
    redactEnv?: readonly string[];
  } = { version: 1 };

  if (hasOwn(record, "tasks")) {
    result.tasks = parseTasks(record.tasks, "$.tasks");
  }
  if (hasOwn(record, "timeouts")) {
    result.timeouts = parseTimeouts(record.timeouts, "$.timeouts");
  }
  if (hasOwn(record, "budgetMs")) {
    if (record.budgetMs === null) {
      result.budgetMs = null;
    } else {
      result.budgetMs = requireIntegerAtLeast(record.budgetMs, 1, "$.budgetMs");
    }
  }
  if (hasOwn(record, "redactEnv")) {
    result.redactEnv = parseRedactEnv(record.redactEnv, "$.redactEnv");
  }

  return result;
}

export function parseConfigV1Json(json: string): ConfigV1 {
  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch {
    return fail("$", "must be valid JSON");
  }
  return parseConfigV1(value);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  if (isPlainRecord(value)) {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    return `{${entries.join(",")}}`;
  }

  return fail("$", "contains a non-JSON value");
}

export function configDigestV1(value: unknown): string {
  const validated = parseConfigV1(value);
  return createHash("sha256").update(canonicalJson(validated), "utf8").digest("hex");
}
