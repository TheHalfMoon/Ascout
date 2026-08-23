import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

import {
  validateReceiptSemantics,
  type ReceiptSemanticIssue,
  type ReceiptV1,
} from "./model.js";

type JsonRecord = Record<string, unknown>;
type JsonSchema = Record<string, unknown>;
type JsonSchemaType = "array" | "boolean" | "integer" | "null" | "number" | "object" | "string";

export interface ReceiptSchemaIssue {
  readonly path: string;
  readonly keyword: string;
  readonly message: string;
}

export interface ReceiptSchemaValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ReceiptSchemaIssue[];
}

export type ReceiptContractLayer = "schema" | "semantic";

export class ReceiptContractValidationError extends Error {
  readonly layer: ReceiptContractLayer;
  readonly schemaIssues: readonly ReceiptSchemaIssue[];
  readonly semanticIssues: readonly ReceiptSemanticIssue[];

  constructor(
    layer: ReceiptContractLayer,
    schemaIssues: readonly ReceiptSchemaIssue[] = [],
    semanticIssues: readonly ReceiptSemanticIssue[] = [],
  ) {
    const count = layer === "schema" ? schemaIssues.length : semanticIssues.length;
    super(`receipt ${layer} validation failed with ${count} issue${count === 1 ? "" : "s"}`);
    this.name = "ReceiptContractValidationError";
    this.layer = layer;
    this.schemaIssues = schemaIssues;
    this.semanticIssues = semanticIssues;
  }
}

const RECEIPT_SCHEMA_URL = new URL(
  "../../specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json",
  import.meta.url,
);
const DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema";
const RECEIPT_SCHEMA_ID = "urn:ascout:receipt:v1";
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/;


function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isValidRfc3339DateTime(value: string): boolean {
  const match = DATE_TIME.exec(value);
  if (match === null) return false;

  const year = Number(match[1]!);
  const month = Number(match[2]!);
  const day = Number(match[3]!);
  const hour = Number(match[4]!);
  const minute = Number(match[5]!);
  const second = Number(match[6]!);
  const offsetHour = match[8] === undefined ? 0 : Number(match[8]);
  const offsetMinute = match[9] === undefined ? 0 : Number(match[9]);

  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 60) return false;
  if (offsetHour > 23 || offsetMinute > 59) return false;

  const monthLengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
  const maxDay = monthLengths[month - 1]!;
  return day >= 1 && day <= maxDay;
}

const SUPPORTED_SCHEMA_KEYWORDS = new Set([
  "$comment",
  "$defs",
  "$id",
  "$ref",
  "$schema",
  "additionalProperties",
  "allOf",
  "const",
  "else",
  "enum",
  "format",
  "if",
  "items",
  "maxItems",
  "maxLength",
  "maximum",
  "minItems",
  "minLength",
  "minimum",
  "not",
  "oneOf",
  "pattern",
  "prefixItems",
  "properties",
  "required",
  "then",
  "title",
  "type",
  "uniqueItems",
]);

let cachedSchema: JsonSchema | undefined;

function isPlainRecord(value: unknown): value is JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function schemaRecord(value: unknown, path: string): JsonSchema {
  if (!isPlainRecord(value)) throw new Error(`${path}: schema must be an object`);
  return value;
}

function schemaArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path}: schema keyword must be an array`);
  return value;
}

function isJsonSchemaType(value: unknown): value is JsonSchemaType {
  return value === "array" || value === "boolean" || value === "integer" || value === "null" ||
    value === "number" || value === "object" || value === "string";
}

function parseTypes(value: unknown, path = "type"): readonly JsonSchemaType[] {
  const raw = Array.isArray(value) ? value : [value];
  if (raw.length === 0 || raw.some((item) => !isJsonSchemaType(item))) {
    throw new Error(`${path}: unsupported JSON Schema type ${JSON.stringify(value)}`);
  }
  if (new Set(raw).size !== raw.length) {
    throw new Error(`${path}: JSON Schema type entries must be unique`);
  }
  return raw;
}

function assertSupportedSchema(schema: JsonSchema, path: string): void {
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED_SCHEMA_KEYWORDS.has(key)) {
      throw new Error(`${path}: unsupported JSON Schema keyword ${JSON.stringify(key)}`);
    }
  }

  if (schema.type !== undefined) parseTypes(schema.type, `${path}.type`);
  if (schema.additionalProperties !== undefined && typeof schema.additionalProperties !== "boolean") {
    throw new Error(`${path}.additionalProperties: only boolean additionalProperties is supported`);
  }

  if (schema.properties !== undefined) {
    const properties = schemaRecord(schema.properties, `${path}.properties`);
    for (const [name, child] of Object.entries(properties)) {
      assertSupportedSchema(schemaRecord(child, `${path}.properties.${name}`), `${path}.properties.${name}`);
    }
  }

  if (schema.$defs !== undefined) {
    const definitions = schemaRecord(schema.$defs, `${path}.$defs`);
    for (const [name, child] of Object.entries(definitions)) {
      assertSupportedSchema(schemaRecord(child, `${path}.$defs.${name}`), `${path}.$defs.${name}`);
    }
  }

  if (schema.items !== undefined && typeof schema.items !== "boolean") {
    assertSupportedSchema(schemaRecord(schema.items, `${path}.items`), `${path}.items`);
  }

  if (schema.prefixItems !== undefined) {
    for (const [index, child] of schemaArray(schema.prefixItems, `${path}.prefixItems`).entries()) {
      assertSupportedSchema(schemaRecord(child, `${path}.prefixItems[${index}]`), `${path}.prefixItems[${index}]`);
    }
  }

  for (const keyword of ["allOf", "oneOf"] as const) {
    if (schema[keyword] === undefined) continue;
    for (const [index, child] of schemaArray(schema[keyword], `${path}.${keyword}`).entries()) {
      assertSupportedSchema(schemaRecord(child, `${path}.${keyword}[${index}]`), `${path}.${keyword}[${index}]`);
    }
  }

  for (const keyword of ["if", "then", "else", "not"] as const) {
    if (schema[keyword] !== undefined) {
      assertSupportedSchema(schemaRecord(schema[keyword], `${path}.${keyword}`), `${path}.${keyword}`);
    }
  }
}

function loadReceiptSchema(): JsonSchema {
  if (cachedSchema !== undefined) return cachedSchema;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(RECEIPT_SCHEMA_URL, "utf8")) as unknown;
  } catch (error) {
    throw new Error(`failed to load receipt v1 JSON Schema: ${error instanceof Error ? error.message : String(error)}`);
  }

  const schema = schemaRecord(parsed, "$schema");
  if (schema.$schema !== DRAFT_2020_12) {
    throw new Error(`receipt schema must declare ${DRAFT_2020_12}`);
  }
  if (schema.$id !== RECEIPT_SCHEMA_ID) {
    throw new Error(`receipt schema id must equal ${RECEIPT_SCHEMA_ID}`);
  }
  assertSupportedSchema(schema, "$schema");
  cachedSchema = schema;
  return schema;
}

function addSchemaIssue(
  issues: ReceiptSchemaIssue[],
  path: string,
  keyword: string,
  message: string,
): void {
  issues.push({ path, keyword, message });
}

function joinPath(path: string, key: string | number): string {
  if (typeof key === "number") return `${path}[${key}]`;
  if (/^[A-Za-z_$][A-Za-z0-9_$-]*$/.test(key)) return `${path}.${key}`;
  return `${path}[${JSON.stringify(key)}]`;
}

function matchesType(value: unknown, type: JsonSchemaType): boolean {
  switch (type) {
    case "array": return Array.isArray(value);
    case "boolean": return typeof value === "boolean";
    case "integer": return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
    case "null": return value === null;
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "object": return isPlainRecord(value);
    case "string": return typeof value === "string";
  }
}

function resolveLocalRef(root: JsonSchema, ref: string): JsonSchema {
  if (!ref.startsWith("#/")) throw new Error(`unsupported non-local JSON Schema ref: ${ref}`);
  let current: unknown = root;
  for (const encoded of ref.slice(2).split("/")) {
    const segment = encoded.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!isPlainRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      throw new Error(`unresolvable JSON Schema ref: ${ref}`);
    }
    current = current[segment];
  }
  return schemaRecord(current, ref);
}

function isValidAgainst(value: unknown, schema: JsonSchema, root: JsonSchema): boolean {
  const issues: ReceiptSchemaIssue[] = [];
  validateAgainstSchema(value, schema, root, "$", issues);
  return issues.length === 0;
}

function validateAgainstSchema(
  value: unknown,
  schema: JsonSchema,
  root: JsonSchema,
  path: string,
  issues: ReceiptSchemaIssue[],
): void {
  if (typeof schema.$ref === "string") {
    validateAgainstSchema(value, resolveLocalRef(root, schema.$ref), root, path, issues);
  }

  if (schema.type !== undefined) {
    const types = parseTypes(schema.type);
    if (!types.some((type) => matchesType(value, type))) {
      addSchemaIssue(issues, path, "type", `must match JSON Schema type ${JSON.stringify(schema.type)}`);
      return;
    }
  }

  if (Object.prototype.hasOwnProperty.call(schema, "const") && !isDeepStrictEqual(value, schema.const)) {
    addSchemaIssue(issues, path, "const", `must equal ${JSON.stringify(schema.const)}`);
  }

  if (schema.enum !== undefined) {
    const values = schemaArray(schema.enum, "enum");
    if (!values.some((candidate) => isDeepStrictEqual(candidate, value))) {
      addSchemaIssue(issues, path, "enum", "must equal one of the allowed values");
    }
  }

  if (schema.allOf !== undefined) {
    for (const child of schemaArray(schema.allOf, "allOf")) {
      validateAgainstSchema(value, schemaRecord(child, "allOf[]"), root, path, issues);
    }
  }

  if (schema.oneOf !== undefined) {
    let matched = 0;
    for (const child of schemaArray(schema.oneOf, "oneOf")) {
      if (isValidAgainst(value, schemaRecord(child, "oneOf[]"), root)) matched += 1;
    }
    if (matched !== 1) {
      addSchemaIssue(issues, path, "oneOf", `must match exactly one schema branch; matched ${matched}`);
    }
  }

  if (schema.not !== undefined && isValidAgainst(value, schemaRecord(schema.not, "not"), root)) {
    addSchemaIssue(issues, path, "not", "must not match the forbidden schema");
  }

  if (schema.if !== undefined) {
    const condition = isValidAgainst(value, schemaRecord(schema.if, "if"), root);
    if (condition && schema.then !== undefined) {
      validateAgainstSchema(value, schemaRecord(schema.then, "then"), root, path, issues);
    } else if (!condition && schema.else !== undefined) {
      validateAgainstSchema(value, schemaRecord(schema.else, "else"), root, path, issues);
    }
  }

  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      addSchemaIssue(issues, path, "minLength", `must contain at least ${schema.minLength} characters`);
    }
    if (typeof schema.maxLength === "number" && value.length > schema.maxLength) {
      addSchemaIssue(issues, path, "maxLength", `must contain at most ${schema.maxLength} characters`);
    }
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern).test(value)) {
      addSchemaIssue(issues, path, "pattern", "must match the required pattern");
    }
    if (schema.format === "date-time" && !isValidRfc3339DateTime(value)) {
      addSchemaIssue(issues, path, "format", "must be a valid RFC 3339 date-time");
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      addSchemaIssue(issues, path, "minimum", `must be >= ${schema.minimum}`);
    }
    if (typeof schema.maximum === "number" && value > schema.maximum) {
      addSchemaIssue(issues, path, "maximum", `must be <= ${schema.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      addSchemaIssue(issues, path, "minItems", `must contain at least ${schema.minItems} items`);
    }
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
      addSchemaIssue(issues, path, "maxItems", `must contain at most ${schema.maxItems} items`);
    }
    if (schema.uniqueItems === true) {
      for (let left = 0; left < value.length; left += 1) {
        for (let right = left + 1; right < value.length; right += 1) {
          if (isDeepStrictEqual(value[left], value[right])) {
            addSchemaIssue(issues, joinPath(path, right), "uniqueItems", `duplicates item at index ${left}`);
            left = value.length;
            break;
          }
        }
      }
    }

    const prefixes = schema.prefixItems === undefined ? [] : schemaArray(schema.prefixItems, "prefixItems");
    for (let index = 0; index < Math.min(prefixes.length, value.length); index += 1) {
      validateAgainstSchema(value[index], schemaRecord(prefixes[index], `prefixItems[${index}]`), root, joinPath(path, index), issues);
    }

    if (schema.items === false) {
      if (value.length > prefixes.length) {
        addSchemaIssue(issues, joinPath(path, prefixes.length), "items", "additional array items are forbidden");
      }
    } else if (schema.items !== undefined && schema.items !== true) {
      const itemSchema = schemaRecord(schema.items, "items");
      for (let index = prefixes.length; index < value.length; index += 1) {
        validateAgainstSchema(value[index], itemSchema, root, joinPath(path, index), issues);
      }
    }
  }

  if (isPlainRecord(value)) {
    const properties = schema.properties === undefined ? {} : schemaRecord(schema.properties, "properties");
    if (schema.required !== undefined) {
      for (const key of schemaArray(schema.required, "required")) {
        if (typeof key === "string" && !Object.prototype.hasOwnProperty.call(value, key)) {
          addSchemaIssue(issues, joinPath(path, key), "required", "required property is missing");
        }
      }
    }

    for (const [key, child] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        validateAgainstSchema(value[key], schemaRecord(child, `properties.${key}`), root, joinPath(path, key), issues);
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) {
          addSchemaIssue(issues, joinPath(path, key), "additionalProperties", "unknown property is forbidden");
        }
      }
    }
  }
}

export function validateReceiptJsonSchema(value: unknown): ReceiptSchemaValidationResult {
  const schema = loadReceiptSchema();
  const issues: ReceiptSchemaIssue[] = [];
  validateAgainstSchema(value, schema, schema, "$", issues);
  return { valid: issues.length === 0, issues };
}

export function validateReceiptForAcceptance(value: unknown): ReceiptV1 {
  const schema = validateReceiptJsonSchema(value);
  if (!schema.valid) {
    throw new ReceiptContractValidationError("schema", schema.issues);
  }

  const receipt = value as ReceiptV1;
  const semantic = validateReceiptSemantics(receipt);
  if (!semantic.valid) {
    throw new ReceiptContractValidationError("semantic", [], semantic.issues);
  }
  return receipt;
}

export function renderReceiptJson(value: unknown): string {
  const receipt = validateReceiptForAcceptance(value);
  return `${JSON.stringify(receipt, null, 2)}\n`;
}
