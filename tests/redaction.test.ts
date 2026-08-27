import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import {
  M1_RECOGNIZED_SECRET_ENV_NAMES,
  redactExactValues,
  redactPersistedArgv,
  redactThenTruncate,
  selectedSecretValues,
  truncateUtf8,
  type RedactionPolicy,
} from "../src/redact.js";

function policy(overrides: Partial<RedactionPolicy> = {}): RedactionPolicy {
  return {
    recognized_names: ["GITHUB_TOKEN", "SERVICE_API_KEY", "AWS_SECRET_ACCESS_KEY"],
    configured_names: [],
    minimum_value_bytes: 4,
    ...overrides,
  };
}

describe("T023 redaction", () => {
  it("always applies the canonical M1 recognized secret-name baseline", () => {
    expect(M1_RECOGNIZED_SECRET_ENV_NAMES).toEqual([
      "GITHUB_TOKEN",
      "GH_TOKEN",
      "NPM_TOKEN",
      "NODE_AUTH_TOKEN",
    ]);

    const secrets = selectedSecretValues(
      {
        GITHUB_TOKEN: "github-secret-value",
        GH_TOKEN: "gh-secret-value",
        NPM_TOKEN: "npm-secret-value",
        NODE_AUTH_TOKEN: "node-auth-secret-value",
        ORDINARY_SETTING: "visible-setting",
      },
      policy({ recognized_names: [] }),
    );

    expect(new Set(secrets)).toEqual(new Set([
      "github-secret-value",
      "gh-secret-value",
      "npm-secret-value",
      "node-auth-secret-value",
    ]));
    expect(secrets).not.toContain("visible-setting");
  });

  it("selects recognized and configured secret values without selecting ordinary env values", () => {
    const secrets = selectedSecretValues(
      {
        GITHUB_TOKEN: "secret-value-123",
        CUSTOM_DEPLOY_SECRET: "custom-secret-value",
        ORDINARY_SETTING: "visible-setting",
      },
      policy({ configured_names: ["CUSTOM_DEPLOY_SECRET"] }),
    );

    expect(secrets).toEqual(["custom-secret-value", "secret-value-123"]);
  });

  it("redacts every occurrence of selected values from captured output", () => {
    const secrets = selectedSecretValues(
      {
        GITHUB_TOKEN: "secret-value-123",
        SERVICE_API_KEY: "service-secret-456",
      },
      policy(),
    );

    const redacted = redactExactValues(
      [
        "token=secret-value-123",
        "again secret-value-123",
        "service=service-secret-456",
        "ordinary=visible-setting",
      ].join("\n"),
      secrets,
    );

    expect(redacted).toContain("token=");
    expect(redacted).toContain("again ");
    expect(redacted).toContain("service=");
    expect(redacted).toContain("ordinary=visible-setting");
    expect(redacted).not.toContain("secret-value-123");
    expect(redacted).not.toContain("service-secret-456");
  });

  it("redacts persisted argv without mutating the raw launch argv", () => {
    const secrets = selectedSecretValues(
      { SERVICE_API_KEY: "service-secret-456" },
      policy(),
    );
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
      "",
      "--header=Authorization: Bearer ",
    ]);
    expect(persistedArgv).not.toBe(rawArgv);
    expect(rawArgv[3]).toBe("service-secret-456");
    expect(JSON.stringify(persistedArgv)).not.toContain("service-secret-456");
  });

  it("protects ordinary text from unsafe replacement of short selected env values", () => {
    const secrets = selectedSecretValues(
      {
        GITHUB_TOKEN: "abc",
        SERVICE_API_KEY: "abcd",
      },
      policy({ minimum_value_bytes: 4 }),
    );

    expect(secrets).toEqual(["abcd"]);
    expect(redactExactValues("abc stays visible; abcd is secret", secrets)).toBe(
      "abc stays visible;  is secret",
    );
  });

  it("keeps the short-value threshold explicit policy rather than a module default", () => {
    const env = { GITHUB_TOKEN: "12345" };

    expect(
      selectedSecretValues(env, policy({ minimum_value_bytes: 6 })),
    ).toEqual([]);
    expect(
      selectedSecretValues(env, policy({ minimum_value_bytes: 5 })),
    ).toEqual(["12345"]);
  });

  it("ignores missing and empty selected env values", () => {
    expect(
      selectedSecretValues(
        { GITHUB_TOKEN: "", CUSTOM_SECRET: undefined },
        policy({ configured_names: ["CUSTOM_SECRET"] }),
      ),
    ).toEqual([]);
  });

  it("deduplicates equal values and orders longer overlapping secrets first", () => {
    const secrets = selectedSecretValues(
      {
        GITHUB_TOKEN: "secret-value",
        SERVICE_API_KEY: "secret-value-with-suffix",
        CUSTOM_SECRET: "secret-value",
      },
      policy({ configured_names: ["CUSTOM_SECRET"] }),
    );

    expect(secrets).toEqual(["secret-value-with-suffix", "secret-value"]);
    expect(
      redactExactValues(
        "prefix secret-value-with-suffix | secret-value suffix",
        secrets,
      ),
    ).toBe("prefix  |  suffix");
  });

  it("redacts before bounded persistence truncation", () => {
    const secret = "super-secret-value";
    const secrets = selectedSecretValues({ GITHUB_TOKEN: secret }, policy());
    const persisted = redactThenTruncate(
      `prefix ${secret} suffix ${"x".repeat(64)}`,
      secrets,
      32,
    );

    expect(persisted.truncated).toBe(true);
    expect(persisted.byte_length).toBeLessThanOrEqual(32);
    expect(Buffer.byteLength(persisted.text, "utf8")).toBe(
      persisted.byte_length,
    );
    expect(persisted.text).not.toContain(secret);
  });

  it("truncates UTF-8 only at code-point boundaries", () => {
    expect(truncateUtf8("αβγδεζηθ", 9)).toEqual({
      text: "αβγδ",
      byte_length: 8,
      truncated: true,
    });
    expect(truncateUtf8("αβγδεζηθ", 9).text).not.toContain("�");
  });

  it("does not claim truncation when redacted output fits the byte bound", () => {
    const secrets = selectedSecretValues(
      { GITHUB_TOKEN: "secret-value-123" },
      policy(),
    );
    const persisted = redactThenTruncate(
      "token=secret-value-123",
      secrets,
      64,
    );

    expect(persisted).toEqual({
      text: "token=",
      byte_length: 6,
      truncated: false,
    });
  });

  it("fails closed on invalid policy, secret values, and truncation bounds", () => {
    expect(() =>
      selectedSecretValues({}, policy({ minimum_value_bytes: 0 })),
    ).toThrow();
    expect(() =>
      selectedSecretValues({}, policy({ configured_names: [""] })),
    ).toThrow();
    expect(() => redactExactValues("abc", [""])).toThrow();
    expect(() => truncateUtf8("abc", -1)).toThrow();
    expect(() => truncateUtf8("abc", Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });
});
