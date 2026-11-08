import { Buffer } from "node:buffer";

export type RedactionEnv = Readonly<Record<string, string | undefined>>;

export const M1_RECOGNIZED_SECRET_ENV_NAMES = [
  "GITHUB_TOKEN",
  "GH_TOKEN",
  "NPM_TOKEN",
  "NODE_AUTH_TOKEN",
] as const;

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
    ...M1_RECOGNIZED_SECRET_ENV_NAMES,
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

/** A cut tail this long that starts a secret is removed; shorter ones reveal too little to matter. */
const MIN_REDACTED_TAIL_CHARS = 4;

/**
 * Removes every selected secret. Removing one can join the text around it into another
 * occurrence, so removal repeats until none remains; each pass shortens the text, so it ends.
 */
export function redactExactValues(
  value: string,
  secrets: readonly string[],
): string {
  for (const secret of secrets) {
    if (secret.length === 0) {
      throw new TypeError("secret values must be non-empty");
    }
  }
  let redacted = value;
  while (secrets.some((secret) => redacted.includes(secret))) {
    for (const secret of secrets) redacted = redacted.replaceAll(secret, "");
  }
  return redacted;
}

/**
 * For output cut at a capture cap: removes a tail that begins a selected secret, which exact
 * matching can't see because the rest of the secret was cut off.
 */
export function redactCutTail(
  value: string,
  secrets: readonly string[],
): { readonly text: string; readonly redacted: boolean } {
  let longest = 0;
  for (const secret of secrets) {
    for (let length = Math.min(secret.length - 1, value.length); length >= MIN_REDACTED_TAIL_CHARS; length -= 1) {
      if (value.endsWith(secret.slice(0, length))) {
        longest = Math.max(longest, length);
        break;
      }
    }
  }
  return longest === 0
    ? { text: value, redacted: false }
    : { text: value.slice(0, value.length - longest), redacted: true };
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
