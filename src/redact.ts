import { Buffer } from "node:buffer";

export type RedactionEnv = Readonly<Record<string, string | undefined>>;

export interface RedactionPolicy {
  readonly recognized_names: readonly string[];
  readonly configured_names: readonly string[];
  readonly minimum_value_bytes: number;
}

export interface TruncatedText {
  readonly text: string;
  readonly byte_length: number;
  readonly truncated: boolean;
}

function validatePolicy(policy: RedactionPolicy): void {
  if (
    !Number.isSafeInteger(policy.minimum_value_bytes) ||
    policy.minimum_value_bytes < 1
  ) {
    throw new TypeError("minimum_value_bytes must be a positive safe integer");
  }

  for (const name of [...policy.recognized_names, ...policy.configured_names]) {
    if (name.length === 0) {
      throw new TypeError("redaction env names must be non-empty");
    }
  }
}

function compareSecretValues(left: string, right: string): number {
  const byteDifference =
    Buffer.byteLength(right, "utf8") - Buffer.byteLength(left, "utf8");
  if (byteDifference !== 0) return byteDifference;
  return left < right ? -1 : left > right ? 1 : 0;
}

export function selectedSecretValues(
  env: RedactionEnv,
  policy: RedactionPolicy,
): readonly string[] {
  validatePolicy(policy);

  const names = new Set([
    ...policy.recognized_names,
    ...policy.configured_names,
  ]);
  const values = new Set<string>();

  for (const name of names) {
    const value = env[name];
    if (value === undefined || value.length === 0) continue;
    if (Buffer.byteLength(value, "utf8") < policy.minimum_value_bytes) continue;
    values.add(value);
  }

  return [...values].sort(compareSecretValues);
}

export function redactExactValues(
  value: string,
  secrets: readonly string[],
): string {
  let redacted = value;
  for (const secret of secrets) {
    if (secret.length === 0) {
      throw new TypeError("secret values must be non-empty");
    }
    redacted = redacted.replaceAll(secret, "");
  }
  return redacted;
}

export function redactPersistedArgv(
  argv: readonly string[],
  secrets: readonly string[],
): readonly string[] {
  return argv.map((argument) => redactExactValues(argument, secrets));
}

export function truncateUtf8(value: string, maxBytes: number): TruncatedText {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new TypeError("maxBytes must be a non-negative safe integer");
  }

  const observedBytes = Buffer.byteLength(value, "utf8");
  if (observedBytes <= maxBytes) {
    return {
      text: value,
      byte_length: observedBytes,
      truncated: false,
    };
  }

  let text = "";
  let byteLength = 0;
  for (const codePoint of value) {
    const nextBytes = Buffer.byteLength(codePoint, "utf8");
    if (byteLength + nextBytes > maxBytes) break;
    text += codePoint;
    byteLength += nextBytes;
  }

  return {
    text,
    byte_length: byteLength,
    truncated: true,
  };
}

export function redactThenTruncate(
  value: string,
  secrets: readonly string[],
  maxBytes: number,
): TruncatedText {
  return truncateUtf8(redactExactValues(value, secrets), maxBytes);
}
