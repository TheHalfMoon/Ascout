import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CONFIG_SCHEMA_URL = new URL(
  "../specs/001-changed-code-verification-receipt/contracts/ascout-config-v1.schema.json",
  import.meta.url,
);

interface JsonSchemaNode {
  readonly [key: string]: unknown;
}

function loadConfigSchema(): JsonSchemaNode {
  return JSON.parse(readFileSync(fileURLToPath(CONFIG_SCHEMA_URL), "utf8")) as JsonSchemaNode;
}

function propertyKeys(value: unknown): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }

  return Object.keys(value).sort();
}

function collectPropertyNames(value: unknown, names: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectPropertyNames(item, names);
    }
    return names;
  }

  if (typeof value !== "object" || value === null) {
    return names;
  }

  const record = value as Record<string, unknown>;
  const properties = record.properties;
  if (typeof properties === "object" && properties !== null && !Array.isArray(properties)) {
    for (const key of Object.keys(properties)) {
      names.add(key);
    }
  }

  for (const child of Object.values(record)) {
    collectPropertyNames(child, names);
  }

  return names;
}

describe("T008 config v1 contract", () => {
  it("locks the root contract and fixed semantic task keys", () => {
    const schema = loadConfigSchema() as Record<string, any>;

    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(schema.$id).toBe("urn:ascout:config:v1");
    expect(schema.type).toBe("object");
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(["version"]);
    expect(schema.properties.version).toEqual({ const: 1 });
    expect(propertyKeys(schema.properties)).toEqual([
      "budgetMs",
      "redactEnv",
      "tasks",
      "timeouts",
      "version",
    ]);

    expect(schema.properties.tasks.type).toBe("object");
    expect(schema.properties.tasks.additionalProperties).toBe(false);
    expect(propertyKeys(schema.properties.tasks.properties)).toEqual([
      "lint",
      "pytestBasic",
      "test",
      "typecheck",
    ]);

    for (const taskKey of ["typecheck", "lint", "test", "pytestBasic"]) {
      expect(schema.properties.tasks.properties[taskKey]).toEqual({
        $ref: "#/$defs/taskOverride",
      });
    }
  });

  it("rejects arbitrary workflow/prerequisite fields and exposes no persistent admission or trust setting", () => {
    const schema = loadConfigSchema() as Record<string, any>;
    const override = schema.$defs.taskOverride;

    expect(override.type).toBe("object");
    expect(override.additionalProperties).toBe(false);
    expect(propertyKeys(override.properties)).toEqual([
      "command",
      "disabledReason",
      "enabled",
      "timeoutMs",
    ]);

    for (const forbidden of [
      "workflow",
      "workflows",
      "prerequisite",
      "prerequisites",
      "dependsOn",
      "admission",
      "allowChangedCommandSurface",
      "trust",
      "trusted",
    ]) {
      expect(collectPropertyNames(schema).has(forbidden)).toBe(false);
    }
  });

  it("requires a reason when a task is explicitly disabled", () => {
    const schema = loadConfigSchema() as Record<string, any>;
    const override = schema.$defs.taskOverride;

    expect(override.properties.enabled).toEqual({ type: "boolean", default: true });
    expect(override.properties.disabledReason).toEqual({ type: "string", minLength: 1 });
    expect(override.allOf).toEqual([
      {
        if: {
          properties: { enabled: { const: false } },
          required: ["enabled"],
        },
        then: {
          required: ["disabledReason"],
        },
      },
    ]);
  });

  it("locks argv override, timeout, budget, and redaction shapes", () => {
    const schema = loadConfigSchema() as Record<string, any>;
    const override = schema.$defs.taskOverride;

    expect(override.properties.command).toEqual({
      type: "array",
      items: { type: "string" },
      minItems: 1,
    });
    expect(override.properties.timeoutMs).toEqual({ type: "integer", minimum: 1 });

    expect(schema.properties.timeouts).toEqual({
      type: "object",
      additionalProperties: false,
      properties: {
        defaultTaskMs: { type: "integer", minimum: 1 },
        terminationGraceMs: { type: "integer", minimum: 0 },
      },
    });
    expect(schema.properties.budgetMs).toEqual({
      type: ["integer", "null"],
      minimum: 1,
    });
    expect(schema.properties.redactEnv).toEqual({
      type: "array",
      items: { type: "string", minLength: 1 },
      uniqueItems: true,
      default: [],
    });
  });
});
