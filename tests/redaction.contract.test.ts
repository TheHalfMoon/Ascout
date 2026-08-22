import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";

const REDACTION = "[REDACTED]";

type Env = Readonly<Record<string, string | undefined>>;

interface RedactionPolicy {
  readonly recognized_names: readonly string[];
  readonly configured_names: readonly string[];
  readonly minimum_value_bytes: number;
}

interface TruncatedText {
  readonly text: string;
  readonly byte_length: number;
  readonly truncated: boolean;
}

function validatePolicy(policy: RedactionPolicy): void {
  if (!Number.isSafeInteger(policy.minimum_value_bytes) || policy.minimum_value_bytes < 1) {
    throw new Error("minimum_value_bytes must be a positive safe integer");
  }

  for (const name of [...policy.recognized_names, ...policy.configured_names]) {
    if (name.length === 0) throw new Error("redaction env names must be non-empty");
  }
}

function selectedSecretValues(env: Env, policy: RedactionPolicy): readonly string[] {
  validatePolicy(policy);

  const names = new Set([...policy.recognized_names, ...policy.configured_names]);
  const values = new Set<string>();

  for (const name of names) {
    const value = env[name];
    if (value === undefined || value.length === 0) continue;
    if (Buffer.byteLength(value, "utf8") < policy.minimum_value_bytes) continue;
    values.add(value);
  }

  return [...values].sort((left, right) => {
    const byteDifference = Buffer.byteLength(right, "utf8") - Buffer.byteLength(left, "utf8");
    return byteDifference !== 0 ? byteDifference : left.localeCompare(right);
  });
}

function redactExactValues(value: string, secrets: readonly string[]): string {
  let redacted = value;
  for (const secret of secrets) {
    redacted = redacted.replaceAll(secret, REDACTION);
  }
  return redacted;
}

function redactPersistedArgv(argv: readonly string[], secrets: readonly string[]): readonly string[] {
  return argv.map((argument) => redactExactValues(argument, secrets));
}

function truncateUtf8(value: string, maxBytes: number): TruncatedText {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new Error("maxBytes must be a non-negative safe integer");
  }

  const observedBytes = Buffer.byteLength(value, "utf8");
  if (observedBytes <= maxBytes) {
    return { text: value, byte_length: observedBytes, truncated: false };
  }

  let output = "";
  let byteLength = 0;
  for (const codePoint of value) {
    const nextBytes = Buffer.byteLength(codePoint, "utf8");
    if (byteLength + nextBytes > maxBytes) break;
    output += codePoint;
    byteLength += nextBytes;
  }

  return { text: output, byte_length: byteLength, truncated: true };
}

function redactThenTruncate(
  value: string,
  secrets: readonly string[],
  maxBytes: number,
): TruncatedText {
  return truncateUtf8(redactExactValues(value, secrets), maxBytes);
}

function policy(overrides: Partial<RedactionPolicy> = {}): RedactionPolicy {
  return {
    recognized_names: ["GITHUB_TOKEN", "SERVICE_API_KEY", "AWS_SECRET_ACCESS_KEY"],
    configured_names: [],
    minimum_value_bytes: 4,
    ...overrides,
  };
}

describe("T015 redaction contract", () => {
  it("redacts exact recognized secret-bearing env values from captured output", () => {
    const env: Env = {
      GITHUB_TOKEN: "secret-value-123",
      SERVICE_API_KEY: "service-secret-456",
      ORDINARY_SETTING: "visible-setting",
    };
    const secrets = selectedSecretValues(env, policy());
    const output = [
      "token=secret-value-123",
      "again secret-value-123",
      "service=service-secret-456",
      "ordinary=visible-setting",
    ].join("\n");

    const redacted = redactExactValues(output, secrets);

    expect(redacted).toContain(`token=${REDACTION}`);
    expect(redacted).toContain(`again ${REDACTION}`);
    expect(redacted).toContain(`service=${REDACTION}`);
    expect(redacted).toContain("ordinary=visible-setting");
    expect(redacted).not.toContain("secret-value-123");
    expect(redacted).not.toContain("service-secret-456");
  });

  it("honors user-configured redactEnv names without treating every env value as secret", () => {
    const env: Env = {
      CUSTOM_DEPLOY_SECRET: "custom-secret-value",
      UNLISTED_VALUE: "unlisted-visible-value",
    };
    const secrets = selectedSecretValues(
      env,
      policy({ configured_names: ["CUSTOM_DEPLOY_SECRET"] }),
    );

    expect(secrets).toEqual(["custom-secret-value"]);
    expect(redactExactValues(
      "custom=custom-secret-value other=unlisted-visible-value",
      secrets,
    )).toBe(`custom=${REDACTION} other=unlisted-visible-value`);
  });

  it("redacts persisted/rendered argv while leaving the raw launch argv input untouched", () => {
    const env: Env = { SERVICE_API_KEY: "service-secret-456" };
    const secrets = selectedSecretValues(env, policy());
    const rawArgv = [
      "node",
      "tool.js",
      "--token",
      "service-secret-456",
      "--header=Authorization: Bearer service-secret-456",
    ] as const;

    const persistedArgv = redactPersistedArgv(rawArgv, secrets);

    expect(persistedArgv).toEqual([
      "node",
      "tool.js",
      "--token",
      REDACTION,
      `--header=Authorization: Bearer ${REDACTION}`,
    ]);
    expect(persistedArgv).not.toBe(rawArgv);
    expect(rawArgv[3]).toBe("service-secret-456");
    expect(rawArgv[4]).toContain("service-secret-456");
    expect(JSON.stringify(persistedArgv)).not.toContain("service-secret-456");
  });

  it("protects against unsafe global replacement of short selected env values", () => {
    const env: Env = {
      GITHUB_TOKEN: "abc",
      SERVICE_API_KEY: "abcd",
    };
    const secrets = selectedSecretValues(env, policy({ minimum_value_bytes: 4 }));

    expect(secrets).toEqual(["abcd"]);

    const text = "abc appears as ordinary text; abcd is the selected secret";
    const redacted = redactExactValues(text, secrets);
    expect(redacted).toBe(`abc appears as ordinary text; ${REDACTION} is the selected secret`);
  });

  it("expresses short-value protection as policy without freezing an undocumented product threshold", () => {
    const env: Env = { GITHUB_TOKEN: "12345" };

    expect(selectedSecretValues(env, policy({ minimum_value_bytes: 6 }))).toEqual([]);
    expect(selectedSecretValues(env, policy({ minimum_value_bytes: 5 }))).toEqual(["12345"]);
  });

  it("ignores missing and empty selected env values instead of creating empty-string redactors", () => {
    const env: Env = {
      GITHUB_TOKEN: "",
      CUSTOM_SECRET: undefined,
    };
    const secrets = selectedSecretValues(
      env,
      policy({ configured_names: ["CUSTOM_SECRET"] }),
    );

    expect(secrets).toEqual([]);
    expect(redactExactValues("unchanged output", secrets)).toBe("unchanged output");
  });

  it("deduplicates equal secret values and processes longer overlapping values first", () => {
    const env: Env = {
      GITHUB_TOKEN: "secret-value",
      SERVICE_API_KEY: "secret-value-with-suffix",
      CUSTOM_SECRET: "secret-value",
    };
    const secrets = selectedSecretValues(
      env,
      policy({ configured_names: ["CUSTOM_SECRET"] }),
    );

    expect(secrets).toEqual(["secret-value-with-suffix", "secret-value"]);
    expect(redactExactValues(
      "secret-value-with-suffix | secret-value",
      secrets,
    )).toBe(`${REDACTION} | ${REDACTION}`);
  });

  it("redacts before bounded persistence truncation so a complete known secret is never stored", () => {
    const secret = "super-secret-value";
    const env: Env = { GITHUB_TOKEN: secret };
    const secrets = selectedSecretValues(env, policy());
    const raw = `prefix ${secret} suffix ${"x".repeat(64)}`;

    const persisted = redactThenTruncate(raw, secrets, 32);

    expect(persisted.truncated).toBe(true);
    expect(persisted.byte_length).toBeLessThanOrEqual(32);
    expect(Buffer.byteLength(persisted.text, "utf8")).toBe(persisted.byte_length);
    expect(persisted.text).not.toContain(secret);
    expect(persisted.text).toContain(REDACTION);
  });

  it("keeps truncation explicit and byte-safe for multibyte output", () => {
    const persisted = redactThenTruncate("αβγδεζηθ", [], 9);

    expect(persisted).toEqual({
      text: "αβγδ",
      byte_length: 8,
      truncated: true,
    });
    expect(persisted.text).not.toContain("�");
  });

  it("does not claim truncation when redacted output fits the bound", () => {
    const env: Env = { GITHUB_TOKEN: "secret-value-123" };
    const secrets = selectedSecretValues(env, policy());
    const persisted = redactThenTruncate("token=secret-value-123", secrets, 64);

    expect(persisted).toEqual({
      text: `token=${REDACTION}`,
      byte_length: Buffer.byteLength(`token=${REDACTION}`, "utf8"),
      truncated: false,
    });
  });

  it("fails closed on invalid policy and truncation bounds", () => {
    expect(() => selectedSecretValues({}, policy({ minimum_value_bytes: 0 }))).toThrow();
    expect(() => selectedSecretValues({}, policy({ configured_names: [""] }))).toThrow();
    expect(() => truncateUtf8("abc", -1)).toThrow();
    expect(() => truncateUtf8("abc", Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });
});
