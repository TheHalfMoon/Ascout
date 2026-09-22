import { READ_ONLY_ADB_COMMANDS } from "./evidence.js";

export const NETWORK_MODES = [
  "DENY_ALL",
  "DEVICE_ONLY",
  "LOCALHOST_ONLY",
  "ALLOWLIST",
  "UNRESTRICTED_EXPLICIT",
] as const;

export type NetworkMode = (typeof NETWORK_MODES)[number];

export interface NetworkPolicyV1 {
  readonly mode: NetworkMode;
  readonly allowlisted_hosts: readonly string[];
  readonly justification: string;
}

export type PolicyResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string };

const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$|^(localhost|\d{1,3}(\.\d{1,3}){3})$/u;

export function parseNetworkPolicyV1(policy: unknown): PolicyResult<NetworkPolicyV1> {
  try {
    if (typeof policy !== "object" || policy === null || Array.isArray(policy)) {
      throw new TypeError("network policy must be an object");
    }
    const record = policy as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (
      keys.length !== 3 ||
      keys[0] !== "allowlisted_hosts" ||
      keys[1] !== "justification" ||
      keys[2] !== "mode"
    ) {
      throw new TypeError("network policy must contain exactly mode, allowlisted_hosts, justification");
    }
    if (
      typeof record["mode"] !== "string" ||
      !(NETWORK_MODES as readonly string[]).includes(record["mode"])
    ) {
      throw new TypeError("network mode unknown");
    }
    const mode = record["mode"] as NetworkMode;
    if (!Array.isArray(record["allowlisted_hosts"]) || (record["allowlisted_hosts"] as unknown[]).length > 64) {
      throw new TypeError("allowlisted_hosts must be an array of at most 64 hosts");
    }
    const hosts: string[] = [];
    for (const host of record["allowlisted_hosts"] as unknown[]) {
      if (typeof host !== "string" || !HOSTNAME_PATTERN.test(host)) {
        throw new TypeError("allowlisted host rejected");
      }
      hosts.push(host);
    }
    if (typeof record["justification"] !== "string") {
      throw new TypeError("justification must be a string");
    }
    const justification = record["justification"] as string;
    if (mode === "ALLOWLIST" && hosts.length === 0) {
      throw new TypeError("ALLOWLIST requires at least one host");
    }
    if (mode === "UNRESTRICTED_EXPLICIT") {
      if (justification.length < 1 || justification.length > 512) {
        throw new TypeError("UNRESTRICTED_EXPLICIT requires a 1..512 char justification");
      }
    }
    return { ok: true, value: { mode, allowlisted_hosts: hosts, justification } };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "network policy refused",
    };
  }
}

export const PROVIDER_MODES = ["DENY_ALL", "LOCAL_ONLY", "ALLOWLIST"] as const;

export type ProviderMode = (typeof PROVIDER_MODES)[number];

export interface ProviderPolicyV1 {
  readonly mode: ProviderMode;
  readonly allowlisted_models: readonly string[];
  readonly screenshot_upload: boolean;
  readonly retention_days: number;
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

export function parseProviderPolicyV1(policy: unknown): PolicyResult<ProviderPolicyV1> {
  try {
    if (typeof policy !== "object" || policy === null || Array.isArray(policy)) {
      throw new TypeError("provider policy must be an object");
    }
    const record = policy as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (
      keys.length !== 4 ||
      keys[0] !== "allowlisted_models" ||
      keys[1] !== "mode" ||
      keys[2] !== "retention_days" ||
      keys[3] !== "screenshot_upload"
    ) {
      throw new TypeError("provider policy must contain exactly mode, allowlisted_models, screenshot_upload, retention_days");
    }
    if (
      typeof record["mode"] !== "string" ||
      !(PROVIDER_MODES as readonly string[]).includes(record["mode"])
    ) {
      throw new TypeError("provider mode unknown");
    }
    const mode = record["mode"] as ProviderMode;
    if (!Array.isArray(record["allowlisted_models"]) || (record["allowlisted_models"] as unknown[]).length > 64) {
      throw new TypeError("allowlisted_models must be an array of at most 64 models");
    }
    const models: string[] = [];
    for (const model of record["allowlisted_models"] as unknown[]) {
      if (typeof model !== "string" || !OPAQUE_ID.test(model)) {
        throw new TypeError("allowlisted model rejected");
      }
      models.push(model);
    }
    if (mode === "ALLOWLIST" && models.length === 0) {
      throw new TypeError("ALLOWLIST requires at least one model");
    }
    if (typeof record["screenshot_upload"] !== "boolean") {
      throw new TypeError("screenshot_upload must be an explicit boolean");
    }
    if (
      typeof record["retention_days"] !== "number" ||
      !Number.isInteger(record["retention_days"]) ||
      (record["retention_days"] as number) < 1 ||
      (record["retention_days"] as number) > 365
    ) {
      throw new TypeError("retention_days must be an integer 1..365");
    }
    return {
      ok: true,
      value: {
        mode,
        allowlisted_models: models,
        screenshot_upload: record["screenshot_upload"] as boolean,
        retention_days: record["retention_days"] as number,
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "provider policy refused",
    };
  }
}

export const DONOR_TELEMETRY_DEFAULT = "OFF" as const;

export type TelemetryAudit =
  | { readonly ok: true; readonly value: "TELEMETRY_OFF" }
  | { readonly ok: false; readonly reason: string };

const TELEMETRY_FLAGS = [
  "telemetry_enabled",
  "posthog_enabled",
  "crash_reporting",
  "analytics_enabled",
  "metrics_upload",
] as const;

export function assertDonorTelemetryOffV1(config: unknown): TelemetryAudit {
  try {
    if (typeof config !== "object" || config === null || Array.isArray(config)) {
      throw new TypeError("donor config must be an object");
    }
    const record = config as Record<string, unknown>;
    const offending: string[] = [];
    for (const flag of TELEMETRY_FLAGS) {
      const entry = record[flag];
      if (entry === undefined) continue;
      if (entry !== false) offending.push(flag);
    }
    if (offending.length > 0) {
      throw new TypeError("donor telemetry enabled by " + offending.join(","));
    }
    return { ok: true, value: "TELEMETRY_OFF" };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "telemetry audit refused",
    };
  }
}

export type AdbVerdict =
  | { readonly verdict: "PERMITTED_READ" }
  | { readonly verdict: "PERMITTED_INPUT" }
  | { readonly verdict: "REFUSED"; readonly reason: string };

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => entry === right[index]);
}

const READ_ARGV: readonly (readonly string[])[] = [
  READ_ONLY_ADB_COMMANDS.DEVICE_PROPERTIES,
  READ_ONLY_ADB_COMMANDS.WINDOW_STATE,
  READ_ONLY_ADB_COMMANDS.PACKAGE_STATE,
  READ_ONLY_ADB_COMMANDS.SCREENSHOT_STDOUT,
  READ_ONLY_ADB_COMMANDS.LOGCAT_DUMP,
];

const PACKAGE_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/u;
const INTEGER_PATTERN = /^-?\d+$/u;

export function classifyAdbArgvV1(argv: readonly unknown[]): AdbVerdict {
  if (argv.length < 2 || argv.length > 12) {
    return { verdict: "REFUSED", reason: "argv length out of range" };
  }
  const parts: string[] = [];
  for (const part of argv) {
    if (typeof part !== "string" || part.length === 0 || part.length > 1024) {
      return { verdict: "REFUSED", reason: "argv part rejected" };
    }
    parts.push(part);
  }
  const head = parts[0] as string;
  if (head !== "adb") return { verdict: "REFUSED", reason: "not an adb invocation" };
  const rest = parts.slice(1);
  for (const read of READ_ARGV) {
    if (arraysEqual(rest, read)) return { verdict: "PERMITTED_READ" };
  }
  if (
    rest.length === 4 &&
    rest[0] === "shell" &&
    rest[1] === "dumpsys" &&
    rest[2] === "package" &&
    PACKAGE_PATTERN.test(rest[3] as string)
  ) {
    return { verdict: "PERMITTED_READ" };
  }
  if (
    rest.length === 5 &&
    rest[0] === "shell" &&
    rest[1] === "input" &&
    rest[2] === "tap" &&
    INTEGER_PATTERN.test(rest[3] as string) &&
    INTEGER_PATTERN.test(rest[4] as string)
  ) {
    return { verdict: "PERMITTED_INPUT" };
  }
  if (
    rest.length === 4 &&
    rest[0] === "shell" &&
    rest[1] === "input" &&
    rest[2] === "text"
  ) {
    return { verdict: "PERMITTED_INPUT" };
  }
  if (
    rest.length === 8 &&
    rest[0] === "shell" &&
    rest[1] === "input" &&
    rest[2] === "swipe" &&
    INTEGER_PATTERN.test(rest[3] as string) &&
    INTEGER_PATTERN.test(rest[4] as string) &&
    INTEGER_PATTERN.test(rest[5] as string) &&
    INTEGER_PATTERN.test(rest[6] as string) &&
    INTEGER_PATTERN.test(rest[7] as string)
  ) {
    return { verdict: "PERMITTED_INPUT" };
  }
  if (
    rest.length === 4 &&
    rest[0] === "shell" &&
    rest[1] === "input" &&
    rest[2] === "keyevent" &&
    (rest[3] === "KEYCODE_BACK" || rest[3] === "KEYCODE_HOME")
  ) {
    return { verdict: "PERMITTED_INPUT" };
  }
  if (
    rest.length === 7 &&
    rest[0] === "shell" &&
    rest[1] === "monkey" &&
    rest[2] === "-p" &&
    PACKAGE_PATTERN.test(rest[3] as string) &&
    rest[4] === "-c" &&
    rest[5] === "android.intent.category.LAUNCHER" &&
    rest[6] === "1"
  ) {
    return { verdict: "PERMITTED_INPUT" };
  }
  return { verdict: "REFUSED", reason: "argv outside the permitted catalog" };
}

export function assertSafeArtifactPathV1(path: unknown): string {
  if (typeof path !== "string" || path.length < 1 || path.length > 1024) {
    throw new TypeError("artifact path must be 1..1024 chars");
  }
  if (
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("..") ||
    path.includes("~") ||
    path.includes("\0") ||
    /^[A-Za-z]:/u.test(path)
  ) {
    throw new TypeError("artifact path must be a contained relative path");
  }
  return path;
}

export const UNTRUSTED_MAX_CHARS = 1048576 as const;

export interface SanitizedV1 {
  readonly text: string;
  readonly truncated: boolean;
}

export function sanitizeUntrustedOutputV1(input: unknown): SanitizedV1 {
  if (typeof input !== "string") {
    throw new TypeError("untrusted output must be a string");
  }
  if (input.includes("\0")) {
    throw new TypeError("untrusted output contains NUL");
  }
  let text = input;
  let truncated = false;
  if (text.length > UNTRUSTED_MAX_CHARS) {
    text = text.slice(0, UNTRUSTED_MAX_CHARS);
    truncated = true;
  }
  let out = "";
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code === 10 || code === 13 || code === 9) {
      out += text[index] as string;
    } else if (code < 32 || code === 127) {
      continue;
    } else {
      out += text[index] as string;
    }
  }
  return { text: out, truncated };
}
