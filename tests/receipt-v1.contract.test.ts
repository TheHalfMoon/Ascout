import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const RECEIPT_SCHEMA_URL = new URL(
  "../specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json",
  import.meta.url,
);
const CONFIG_SCHEMA_URL = new URL(
  "../specs/001-changed-code-verification-receipt/contracts/ascout-config-v1.schema.json",
  import.meta.url,
);

type Schema = Record<string, any>;

function loadJson(url: URL): Schema {
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8")) as Schema;
}

function propertyKeys(value: unknown): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }

  return Object.keys(value).sort();
}

function conditionFor(
  variants: Schema[],
  property: string,
  expected: string | boolean,
): Schema {
  const match = variants.find(
    (variant) => variant.if?.properties?.[property]?.const === expected,
  );
  expect(match, `missing conditional for ${property}=${String(expected)}`).toBeDefined();
  return match as Schema;
}

function expectRef(value: unknown, ref: string): void {
  expect(value).toEqual({ $ref: ref });
}

describe("T009 receipt v1 contract", () => {
  it("locks receipt identity, root evidence, and the closed root surface", () => {
    const schema = loadJson(RECEIPT_SCHEMA_URL);

    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(schema.$id).toBe("urn:ascout:receipt:v1");
    expect(schema.type).toBe("object");
    expect(schema.additionalProperties).toBe(false);
    expect(schema.patternProperties).toBeUndefined();
    expect(schema.properties.schema_version).toEqual({ const: "1.0" });
    expect(schema.required).toEqual([
      "schema_version",
      "run",
      "source",
      "comparison",
      "selection",
      "tasks",
      "changed_code",
      "exercise",
      "test_changes",
      "findings",
      "evidence",
      "artifacts",
      "stability",
      "summary",
    ]);
    expect(schema.properties.evidence).toEqual({
      type: "array",
      items: { $ref: "#/$defs/evidence" },
    });
    expect(schema.properties.stability).toEqual({
      enum: ["stable", "tree_drifted", "unknown"],
    });
  });

  it("keeps config and receipt task identifiers exactly in parity", () => {
    const receipt = loadJson(RECEIPT_SCHEMA_URL);
    const config = loadJson(CONFIG_SCHEMA_URL);

    const configTaskKeys = propertyKeys(config.properties.tasks.properties);
    const receiptTaskTypes = [...receipt.$defs.task.properties.task_type.enum].sort();

    expect(configTaskKeys).toEqual(["lint", "pytestBasic", "test", "typecheck"]);
    expect(receiptTaskTypes).toEqual(configTaskKeys);
  });

  it("locks privacy-safe source IDs and full Git object ID shapes", () => {
    const schema = loadJson(RECEIPT_SCHEMA_URL);
    const sourceState = schema.$defs.sourceState;

    expect(schema.$defs.sha256).toEqual({
      type: "string",
      pattern: "^[a-f0-9]{64}$",
    });
    expect(schema.$defs.gitObjectId).toEqual({
      type: "string",
      pattern: "^(?:[a-f0-9]{40}|[a-f0-9]{64})$",
    });
    expectRef(sourceState.properties.head_sha, "#/$defs/gitObjectId");
    expectRef(schema.$defs.comparison.properties.base_ref, "#/$defs/gitObjectId");

    const localRule = conditionFor(sourceState.allOf, "repository_id_kind", "local_only");
    expect(localRule.then.properties.repository_id).toEqual({
      type: "string",
      pattern: "^local:[a-f0-9]{64}$",
    });
    expect(localRule.then.properties.portable).toEqual({ const: false });

    const remoteRule = conditionFor(sourceState.allOf, "repository_id_kind", "remote");
    expect(remoteRule.then.properties.repository_id).toEqual({
      type: "string",
      pattern: "^remote:[a-f0-9]{64}$",
    });
    expect(remoteRule.then.properties.portable).toEqual({ const: true });
  });

  it("rejects noncanonical persisted path spellings at the schema boundary", () => {
    const schema = loadJson(RECEIPT_SCHEMA_URL);
    const pathPattern = new RegExp(schema.$defs.canonicalRelativePath.pattern as string);

    for (const valid of [
      "src/file.ts",
      "packages/api/src/index.ts",
      ".ascout-artifacts/log.txt",
    ]) {
      expect(pathPattern.test(valid), valid).toBe(true);
    }

    for (const invalid of [
      "/src/file.ts",
      "C:/src/file.ts",
      "C:\\src\\file.ts",
      "\\\\server\\share\\file.ts",
      "file:///src/file.ts",
      "https://example.invalid/src/file.ts",
      "src\\file.ts",
      ".",
      "..",
      "./src/file.ts",
      "src/../file.ts",
      "src/./file.ts",
      "src//file.ts",
      "src/",
    ]) {
      expect(pathPattern.test(invalid), invalid).toBe(false);
    }
  });

  it("binds every persisted path-bearing field to the canonical relative-path definitions", () => {
    const schema = loadJson(RECEIPT_SCHEMA_URL);
    const defs = schema.$defs;

    expectRef(defs.changedFile.properties.path, "#/$defs/canonicalRelativePath");
    expectRef(defs.changedFile.properties.previous_path, "#/$defs/canonicalRelativePath");
    expectRef(defs.scope.properties.path, "#/$defs/nullableCanonicalRelativePath");
    expectRef(defs.task.properties.source_path, "#/$defs/nullableCanonicalRelativePath");
    expectRef(defs.task.properties.changed_authority_paths.items, "#/$defs/canonicalRelativePath");
    expectRef(defs.exerciseRecord.properties.path, "#/$defs/canonicalRelativePath");
    expectRef(defs.testChange.properties.path, "#/$defs/canonicalRelativePath");
    expectRef(defs.testChange.properties.previous_path, "#/$defs/canonicalRelativePath");
    expectRef(defs.finding.properties.path, "#/$defs/nullableCanonicalRelativePath");
    expectRef(defs.artifact.properties.relative_run_path, "#/$defs/canonicalRelativePath");
  });

  it("locks changed-line ranges and rename identity", () => {
    const schema = loadJson(RECEIPT_SCHEMA_URL);
    const lineRange = schema.$defs.lineRange;
    const changedFile = schema.$defs.changedFile;

    expect(lineRange.prefixItems).toEqual([
      { type: "integer", minimum: 1 },
      { type: "integer", minimum: 1 },
    ]);
    expect(lineRange.items).toBe(false);
    expect(lineRange.minItems).toBe(2);
    expect(lineRange.maxItems).toBe(2);
    expect(lineRange.$comment).toContain("start <= end");
    expect(changedFile.properties.changed_new_line_ranges).toEqual({
      type: "array",
      items: { $ref: "#/$defs/lineRange" },
    });

    expect(changedFile.allOf).toEqual([
      {
        if: {
          properties: { change_kind: { const: "renamed" } },
          required: ["change_kind"],
        },
        then: { required: ["previous_path"] },
        else: { not: { required: ["previous_path"] } },
      },
    ]);
  });

  it("locks fixed task, status, selection, and evidence/artifact reference shapes", () => {
    const schema = loadJson(RECEIPT_SCHEMA_URL);
    const task = schema.$defs.task;
    const selection = schema.$defs.selection;
    const selectionPass = schema.$defs.selectionPass;

    expect(task.properties.authorized_by.enum).toEqual([
      "user_config",
      "repo_config",
      "discovery",
    ]);
    expect(task.properties.execution_admission.enum).toEqual([
      "normal",
      "refused_changed_surface",
      "explicit_changed_surface_override",
    ]);
    expect(task.properties.status.enum).toEqual([
      "PASS",
      "FAIL",
      "FLAKY",
      "BLOCKED",
      "ERROR",
      "NOT_APPLICABLE",
      "NOT_RUN",
    ]);
    expect(task.properties.evidence_ids.uniqueItems).toBe(true);
    expect(task.properties.artifact_refs.uniqueItems).toBe(true);

    expect(selection.properties.mode.enum).toEqual([
      "full",
      "native_related",
      "native_changed",
      "configured",
      "no_test_task",
    ]);
    expect(selection.properties.passes.maxItems).toBe(2);
    expect(selectionPass.properties.ordinal).toEqual({
      type: "integer",
      minimum: 1,
      maximum: 2,
    });
    expect(selectionPass.properties.mode.enum).toEqual([
      "full",
      "native_related",
      "native_changed",
      "configured",
    ]);

    expect(schema.$defs.evidence.required).toEqual([
      "evidence_id",
      "run_id",
      "task_id",
      "sequence",
      "kind",
      "sha256",
      "artifact_id",
      "redacted",
      "truncated",
    ]);
    expect(schema.$defs.evidence.properties.sequence).toEqual({
      type: "integer",
      minimum: 1,
    });
    expect(schema.$defs.artifact.required).toEqual([
      "artifact_id",
      "relative_run_path",
      "kind",
      "sha256",
      "byte_length",
      "redacted",
      "truncated",
    ]);
  });

  it("locks reason, admission, and exercise state/count/reason conditionals", () => {
    const schema = loadJson(RECEIPT_SCHEMA_URL);
    const task = schema.$defs.task;

    const reasonRule = task.allOf[0];
    expect(reasonRule.if.properties.status.enum).toEqual(["NOT_RUN", "BLOCKED", "ERROR"]);
    expect(reasonRule.then.required).toEqual(["reason_code", "reason_text"]);
    expect(reasonRule.then.properties.reason_code).toEqual({ type: "string", minLength: 1 });
    expect(reasonRule.then.properties.reason_text).toEqual({ type: "string", minLength: 1 });

    const refused = conditionFor(task.allOf, "execution_admission", "refused_changed_surface");
    expect(refused.then.properties.command_surface_changed).toEqual({ const: true });
    expect(refused.then.properties.changed_authority_paths).toEqual({ minItems: 1 });
    expect(refused.then.properties.status).toEqual({ const: "NOT_RUN" });
    expect(refused.then.properties.reason_code).toEqual({ const: "command_surface_changed" });

    const overridden = conditionFor(
      task.allOf,
      "execution_admission",
      "explicit_changed_surface_override",
    );
    expect(overridden.then.properties.command_surface_changed).toEqual({ const: true });
    expect(overridden.then.properties.changed_authority_paths).toEqual({ minItems: 1 });

    const unchanged = conditionFor(task.allOf, "command_surface_changed", false);
    expect(unchanged.then.properties.execution_admission).toEqual({ const: "normal" });
    expect(unchanged.then.properties.changed_authority_paths).toEqual({ maxItems: 0 });

    const changed = conditionFor(task.allOf, "command_surface_changed", true);
    expect(changed.then.properties.execution_admission).toEqual({
      enum: ["refused_changed_surface", "explicit_changed_surface_override"],
    });
    expect(changed.then.properties.changed_authority_paths).toEqual({ minItems: 1 });

    const exerciseRecord = schema.$defs.exerciseRecord;
    const unresolved = conditionFor(exerciseRecord.allOf, "state", "UNRESOLVED");
    expect(unresolved.then.properties.execution_count).toEqual({ type: "null" });
    expect(unresolved.then.required).toEqual(["reason"]);

    const exercised = conditionFor(exerciseRecord.allOf, "state", "EXERCISED");
    expect(exercised.then.properties.execution_count).toEqual({
      type: "integer",
      minimum: 1,
    });

    const notExercised = conditionFor(exerciseRecord.allOf, "state", "NOT_EXERCISED");
    expect(notExercised.then.properties.execution_count).toEqual({ const: 0 });
  });

  it("locks aggregate summary and exit-code surface", () => {
    const schema = loadJson(RECEIPT_SCHEMA_URL);

    expect(propertyKeys(schema.$defs.taskStatusCounts.properties)).toEqual([
      "BLOCKED",
      "ERROR",
      "FAIL",
      "FLAKY",
      "NOT_APPLICABLE",
      "NOT_RUN",
      "PASS",
    ]);
    expect(schema.$defs.summary.properties.completeness).toEqual({
      enum: ["complete", "materially_incomplete", "unknown_due_to_error"],
    });
    expect(schema.$defs.summary.properties.exit_code).toEqual({ enum: [0, 1, 2, 3, 4] });
    expect(schema.$defs.finding.properties.fingerprint_version).toEqual({
      $ref: "#/$defs/fingerprintVersion",
    });
    expect(schema.$defs.finding.properties.fingerprint).toEqual({
      oneOf: [{ $ref: "#/$defs/sha256" }, { type: "null" }],
    });
  });
});
