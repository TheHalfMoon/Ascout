import { posix as pathPosix, win32 as pathWin32 } from "node:path";
import { isDeepStrictEqual } from "node:util";

import { canonicalAssuranceSha256V1 } from "../contracts/canonical-serialization.js";

export const ENGINE_PROFILE_SCHEMA_V1 = "ascout-engine-profile/1" as const;
export const ENGINE_PROTOCOL_V1 = "ascout-engine/1" as const;

export const ENGINE_PROFILE_HARD_CAPS_V1 = Object.freeze({
  max_wall_ms: 60_000,
  max_stdout_bytes: 1_048_576,
  max_stderr_bytes: 262_144,
  max_input_bytes: 65_536,
  max_network_requests: 0,
});

export const ENGINE_OUTPUT_FORMATS_V1 = [ENGINE_PROTOCOL_V1, "gitleaks-json-v1"] as const;
export type EngineOutputFormatV1 = (typeof ENGINE_OUTPUT_FORMATS_V1)[number];

export const ENGINE_COVERAGE_MODES_V1 = ["explicit_changed_files", "whole_directory"] as const;

export const ENGINE_NATIVE_EXITS_V1 = ["CLEAN", "FINDINGS", "NO_INPUT", "ERROR"] as const;
export type EngineNativeExitV1 = (typeof ENGINE_NATIVE_EXITS_V1)[number];

export interface EngineProfileArtifactV1 {
  readonly source_url: string;
  readonly sha256: string;
  readonly license_spdx: string;
  readonly provenance_reference: string;
  readonly pinned_release_digest: string;
}

export interface EngineProfileBudgetV1 {
  readonly max_wall_ms: number;
  readonly max_stdout_bytes: number;
  readonly max_stderr_bytes: number;
  readonly max_input_bytes: number;
  readonly max_network_requests: 0;
}

export interface EngineProfileV1 {
  readonly schema: typeof ENGINE_PROFILE_SCHEMA_V1;
  readonly engine_id: string;
  readonly profile_id: string;
  readonly release_version: string;
  readonly platform: "win32" | "linux" | "darwin";
  readonly arch: "x64" | "arm64";
  readonly artifact: EngineProfileArtifactV1;
  readonly executable_absolute_path: string;
  readonly argv: readonly string[];
  readonly environment: Readonly<Record<string, string>>;
  readonly config_absolute_path: string;
  readonly config_sha256: string;
  readonly requested_capabilities: readonly string[];
  readonly native_exit_map: Readonly<Record<string, EngineNativeExitV1>>;
  /** The protocol itself, or a native format the broker decodes into an envelope. */
  readonly output_format: EngineOutputFormatV1;
  readonly coverage_mode: (typeof ENGINE_COVERAGE_MODES_V1)[number];
  readonly budget: EngineProfileBudgetV1;
  readonly source_egress: "DENY";
  readonly network: "DENY";
  readonly independence: "DETERMINISTIC_TOOL";
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const NATIVE_EXIT_CODE = /^(?:0|[1-9][0-9]{0,2})$/u;
const ENGINE_ENVIRONMENT_NAME = /^(?:LANG|LC_ALL|TZ|NO_COLOR|ASCOUT_ENGINE_[A-Z0-9_]{1,64})$/u;
const MAX_ARGV_ITEMS = 64;
const MAX_ARGUMENT_LENGTH = 4_096;
const MAX_ENVIRONMENT_ITEMS = 16;
const MAX_ENVIRONMENT_VALUE_LENGTH = 1_024;
const MAX_CAPABILITIES = 64;
const MAX_TEXT_LENGTH = 512;

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
  if (!isDeepStrictEqual(Object.keys(record).sort(), [...expected].sort())) {
    throw new TypeError(field + " contains missing or unknown fields");
  }
}

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be a bounded opaque identifier");
  }
  return value;
}

function requireSha256(value: unknown, field: string): string {
  if (typeof value !== "string" || !SHA256_HEX.test(value)) {
    throw new TypeError(field + " must be lowercase sha256");
  }
  return value;
}

function requireLiteral<T extends string>(value: unknown, expected: T, field: string): T {
  if (value !== expected) throw new TypeError(field + " must equal " + expected);
  return expected;
}

function requireOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (!allowed.includes(value as T)) {
    throw new TypeError(field + " is not an allowed value");
  }
  return value as T;
}

function requireBoundedText(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_TEXT_LENGTH ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new TypeError(field + " must be bounded single-line text");
  }
  return value;
}

function requireHttpsUrl(value: unknown, field: string): string {
  const text = requireBoundedText(value, field);
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    throw new TypeError(field + " must be an https URL");
  }
  if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") {
    throw new TypeError(field + " must be an https URL without credentials");
  }
  return text;
}

function requireCapAtMost(value: unknown, cap: number, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > cap) {
    throw new TypeError(field + " must be a positive integer no greater than " + cap);
  }
  return value as number;
}

/** Lexical rules only; the broker applies the canonical-path rule on the real file system. */
function requireFixedAbsolutePath(
  value: unknown,
  platform: EngineProfileV1["platform"],
  field: string,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_ARGUMENT_LENGTH ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new TypeError(field + " must be a bounded path");
  }
  if (platform === "win32") {
    // A drive letter excludes UNC, device, and drive-relative forms. A later
    // colon would address an alternate data stream.
    if (!/^[A-Za-z]:\\/u.test(value) || value.indexOf(":", 2) !== -1) {
      throw new TypeError(field + " must be an absolute local Windows path");
    }
    if (pathWin32.normalize(value) !== value) {
      throw new TypeError(field + " must be a normalized path");
    }
    return value;
  }
  if (!pathPosix.isAbsolute(value)) {
    throw new TypeError(field + " must be an absolute local path");
  }
  if (pathPosix.normalize(value) !== value) {
    throw new TypeError(field + " must be a normalized path");
  }
  return value;
}

function parseArgv(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_ARGV_ITEMS) {
    throw new TypeError("argv must contain at most " + MAX_ARGV_ITEMS + " items");
  }
  return value.map((argument, index) => {
    if (
      typeof argument !== "string" ||
      argument.length > MAX_ARGUMENT_LENGTH ||
      /[\u0000\r\n]/u.test(argument)
    ) {
      throw new TypeError("argv[" + index + "] must be a bounded single-line string");
    }
    return argument;
  });
}

function parseEnvironment(value: unknown): Readonly<Record<string, string>> {
  const record = requireRecord(value, "environment");
  const names = Object.keys(record).sort();
  if (names.length > MAX_ENVIRONMENT_ITEMS) {
    throw new TypeError("environment must contain at most " + MAX_ENVIRONMENT_ITEMS + " items");
  }
  const parsed: Record<string, string> = {};
  for (const name of names) {
    if (!ENGINE_ENVIRONMENT_NAME.test(name)) {
      throw new TypeError("environment contains a forbidden variable name");
    }
    const entry = record[name];
    if (
      typeof entry !== "string" ||
      entry.length > MAX_ENVIRONMENT_VALUE_LENGTH ||
      entry.includes("\0")
    ) {
      throw new TypeError("environment values must be bounded strings");
    }
    parsed[name] = entry;
  }
  return parsed;
}

function parseCapabilities(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CAPABILITIES) {
    throw new TypeError("requested_capabilities must contain 1 to " + MAX_CAPABILITIES + " items");
  }
  const parsed = value.map((entry, index) =>
    requireOpaqueId(entry, "requested_capabilities[" + index + "]"),
  );
  const canonical = [...new Set(parsed)].sort();
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError("requested_capabilities must be unique and canonically sorted");
  }
  return parsed;
}

function parseNativeExitMap(value: unknown): Readonly<Record<string, EngineNativeExitV1>> {
  const record = requireRecord(value, "native_exit_map");
  const codes = Object.keys(record).sort();
  if (codes.length === 0) throw new TypeError("native_exit_map must not be empty");
  const parsed: Record<string, EngineNativeExitV1> = {};
  for (const code of codes) {
    if (!NATIVE_EXIT_CODE.test(code) || Number(code) > 255) {
      throw new TypeError("native_exit_map keys must be exit codes from 0 to 255");
    }
    parsed[code] = requireOneOf(record[code], ENGINE_NATIVE_EXITS_V1, "native_exit_map value");
  }
  return parsed;
}

function parseArtifact(value: unknown): EngineProfileArtifactV1 {
  const record = requireRecord(value, "artifact");
  requireExactKeys(
    record,
    ["source_url", "sha256", "license_spdx", "provenance_reference", "pinned_release_digest"],
    "artifact",
  );
  return {
    source_url: requireHttpsUrl(record.source_url, "artifact.source_url"),
    sha256: requireSha256(record.sha256, "artifact.sha256"),
    license_spdx: requireBoundedText(record.license_spdx, "artifact.license_spdx"),
    provenance_reference: requireOpaqueId(
      record.provenance_reference,
      "artifact.provenance_reference",
    ),
    pinned_release_digest: requireSha256(
      record.pinned_release_digest,
      "artifact.pinned_release_digest",
    ),
  };
}

function parseBudget(value: unknown): EngineProfileBudgetV1 {
  const record = requireRecord(value, "budget");
  requireExactKeys(
    record,
    [
      "max_wall_ms",
      "max_stdout_bytes",
      "max_stderr_bytes",
      "max_input_bytes",
      "max_network_requests",
    ],
    "budget",
  );
  if (record.max_network_requests !== ENGINE_PROFILE_HARD_CAPS_V1.max_network_requests) {
    throw new TypeError("budget.max_network_requests must equal 0");
  }
  return {
    max_wall_ms: requireCapAtMost(
      record.max_wall_ms,
      ENGINE_PROFILE_HARD_CAPS_V1.max_wall_ms,
      "budget.max_wall_ms",
    ),
    max_stdout_bytes: requireCapAtMost(
      record.max_stdout_bytes,
      ENGINE_PROFILE_HARD_CAPS_V1.max_stdout_bytes,
      "budget.max_stdout_bytes",
    ),
    max_stderr_bytes: requireCapAtMost(
      record.max_stderr_bytes,
      ENGINE_PROFILE_HARD_CAPS_V1.max_stderr_bytes,
      "budget.max_stderr_bytes",
    ),
    max_input_bytes: requireCapAtMost(
      record.max_input_bytes,
      ENGINE_PROFILE_HARD_CAPS_V1.max_input_bytes,
      "budget.max_input_bytes",
    ),
    max_network_requests: 0,
  };
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

export function validateEngineProfileV1(input: unknown): EngineProfileV1 {
  const record = requireRecord(input, "engine profile");
  requireExactKeys(
    record,
    [
      "schema",
      "engine_id",
      "profile_id",
      "release_version",
      "platform",
      "arch",
      "artifact",
      "executable_absolute_path",
      "argv",
      "environment",
      "config_absolute_path",
      "config_sha256",
      "requested_capabilities",
      "native_exit_map",
      "output_format",
      "coverage_mode",
      "budget",
      "source_egress",
      "network",
      "independence",
    ],
    "engine profile",
  );

  const platform = requireOneOf(record.platform, ["win32", "linux", "darwin"] as const, "platform");
  const executable = requireFixedAbsolutePath(
    record.executable_absolute_path,
    platform,
    "executable_absolute_path",
  );
  // Windows can start only an .exe directly. Anything else would need a shell.
  if (platform === "win32" && !/\.exe$/iu.test(executable)) {
    throw new TypeError("executable_absolute_path must name an .exe file on Windows");
  }

  const argv = parseArgv(record.argv);
  const configPath = requireFixedAbsolutePath(
    record.config_absolute_path,
    platform,
    "config_absolute_path",
  );
  // A digest-checked configuration the engine never receives would check nothing.
  if (!argv.some((argument) => argument === configPath || argument.endsWith("=" + configPath))) {
    throw new TypeError("argv must pass config_absolute_path to the engine");
  }

  return deepFreeze<EngineProfileV1>({
    schema: requireLiteral(record.schema, ENGINE_PROFILE_SCHEMA_V1, "schema"),
    engine_id: requireOpaqueId(record.engine_id, "engine_id"),
    profile_id: requireOpaqueId(record.profile_id, "profile_id"),
    release_version: requireOpaqueId(record.release_version, "release_version"),
    platform,
    arch: requireOneOf(record.arch, ["x64", "arm64"] as const, "arch"),
    artifact: parseArtifact(record.artifact),
    executable_absolute_path: executable,
    argv,
    environment: parseEnvironment(record.environment),
    config_absolute_path: configPath,
    config_sha256: requireSha256(record.config_sha256, "config_sha256"),
    requested_capabilities: parseCapabilities(record.requested_capabilities),
    native_exit_map: parseNativeExitMap(record.native_exit_map),
    output_format: requireOneOf(record.output_format, ENGINE_OUTPUT_FORMATS_V1, "output_format"),
    coverage_mode: requireOneOf(record.coverage_mode, ENGINE_COVERAGE_MODES_V1, "coverage_mode"),
    budget: parseBudget(record.budget),
    source_egress: requireLiteral(record.source_egress, "DENY", "source_egress"),
    network: requireLiteral(record.network, "DENY", "network"),
    independence: requireLiteral(record.independence, "DETERMINISTIC_TOOL", "independence"),
  });
}

export function engineProfileSha256V1(profile: EngineProfileV1): string {
  return canonicalAssuranceSha256V1(profile);
}

/** The identity a qualification must name, so it covers what runs and not just a label. */
export function engineProfileQualificationIdentityV1(profile: EngineProfileV1): string {
  return "profile-sha256:" + engineProfileSha256V1(profile);
}
