import { describe, expect, it } from "vitest";
import {
  CONFIG_V1_TASK_KEYS,
  ConfigValidationError,
  configDigestV1,
  parseConfigV1,
  parseConfigV1Json,
} from "../src/config.js";

function expectConfigError(value: unknown, expectedPath: string): void {
  try {
    parseConfigV1(value);
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigValidationError);
    expect((error as ConfigValidationError).path).toBe(expectedPath);
    return;
  }

  throw new Error("expected config validation to fail");
}

describe("T017 config v1 parser and digest", () => {
  it("accepts the minimal config and exactly the four fixed task keys", () => {
    expect(CONFIG_V1_TASK_KEYS).toEqual(["typecheck", "lint", "test", "pytestBasic"]);
    expect(parseConfigV1({ version: 1 })).toEqual({ version: 1 });

    expect(
      parseConfigV1({
        version: 1,
        tasks: {
          typecheck: {},
          lint: { command: ["npm", "run", "lint"], timeoutMs: 10_000 },
          test: { enabled: false, disabledReason: "not configured for this package" },
          pytestBasic: { enabled: true },
        },
        timeouts: { defaultTaskMs: 60_000, terminationGraceMs: 0 },
        budgetMs: null,
        redactEnv: ["TOKEN", "API_KEY"],
      }),
    ).toEqual({
      version: 1,
      tasks: {
        typecheck: {},
        lint: { command: ["npm", "run", "lint"], timeoutMs: 10_000 },
        test: { enabled: false, disabledReason: "not configured for this package" },
        pytestBasic: { enabled: true },
      },
      timeouts: { defaultTaskMs: 60_000, terminationGraceMs: 0 },
      budgetMs: null,
      redactEnv: ["TOKEN", "API_KEY"],
    });
  });

  it("rejects arbitrary root, task, prerequisite/workflow, and persistent admission/trust properties", () => {
    expectConfigError({ version: 1, workflow: [] }, "$.workflow");
    expectConfigError({ version: 1, admission: true }, "$.admission");
    expectConfigError({ version: 1, allowChangedCommandSurface: true }, "$.allowChangedCommandSurface");
    expectConfigError({ version: 1, trust: true }, "$.trust");
    expectConfigError({ version: 1, tasks: { build: {} } }, "$.tasks.build");
    expectConfigError(
      { version: 1, tasks: { test: { prerequisite: "typecheck" } } },
      "$.tasks.test.prerequisite",
    );
    expectConfigError(
      { version: 1, tasks: { test: { dependsOn: ["typecheck"] } } },
      "$.tasks.test.dependsOn",
    );
  });

  it("enforces disabled reason, argv override, timeout, budget, and redaction constraints", () => {
    expectConfigError({ version: 1, tasks: { test: { enabled: false } } }, "$.tasks.test.disabledReason");
    expectConfigError(
      { version: 1, tasks: { test: { enabled: false, disabledReason: "" } } },
      "$.tasks.test.disabledReason",
    );
    expectConfigError({ version: 1, tasks: { lint: { command: [] } } }, "$.tasks.lint.command");
    expectConfigError(
      { version: 1, tasks: { lint: { command: ["eslint", 1] } } },
      "$.tasks.lint.command[1]",
    );
    expect(parseConfigV1({ version: 1, tasks: { lint: { command: [""] } } })).toEqual({
      version: 1,
      tasks: { lint: { command: [""] } },
    });

    expectConfigError({ version: 1, tasks: { lint: { timeoutMs: 0 } } }, "$.tasks.lint.timeoutMs");
    expectConfigError({ version: 1, timeouts: { defaultTaskMs: 0 } }, "$.timeouts.defaultTaskMs");
    expectConfigError({ version: 1, timeouts: { terminationGraceMs: -1 } }, "$.timeouts.terminationGraceMs");
    expectConfigError({ version: 1, budgetMs: 0 }, "$.budgetMs");
    expectConfigError({ version: 1, redactEnv: [""] }, "$.redactEnv[0]");
    expectConfigError({ version: 1, redactEnv: ["TOKEN", "TOKEN"] }, "$.redactEnv");
  });

  it("rejects malformed JSON and non-object roots fail closed", () => {
    expect(() => parseConfigV1Json('{"version":')).toThrow(ConfigValidationError);
    expectConfigError(null, "$");
    expectConfigError([], "$");
    expectConfigError({ version: 2 }, "$.version");
  });

  it("produces a lowercase SHA-256 digest stable across JSON formatting and object key order", () => {
    const left = parseConfigV1Json(`{
      "version": 1,
      "tasks": {
        "test": { "timeoutMs": 1000, "command": ["npm", "test"] }
      },
      "redactEnv": ["TOKEN"]
    }`);
    const right = parseConfigV1({
      redactEnv: ["TOKEN"],
      tasks: { test: { command: ["npm", "test"], timeoutMs: 1000 } },
      version: 1,
    });

    const leftDigest = configDigestV1(left);
    const rightDigest = configDigestV1(right);

    expect(leftDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(leftDigest).toBe(rightDigest);
    expect(leftDigest).not.toBe(
      configDigestV1({
        version: 1,
        tasks: { test: { command: ["npm", "test"], timeoutMs: 1001 } },
        redactEnv: ["TOKEN"],
      }),
    );
  });

  it("refuses to digest a config candidate that fails validation", () => {
    expect(() => configDigestV1({ version: 1, admission: true })).toThrow(
      ConfigValidationError,
    );
  });
});
