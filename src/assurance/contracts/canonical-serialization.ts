import { createHash } from "node:crypto";
import { types } from "node:util";

export const ASSURANCE_CANONICAL_SERIALIZATION_VERSION = 1 as const;

type JsonPrimitive = null | boolean | string | number;
export type AssuranceCanonicalJsonValueV1 =
  | JsonPrimitive
  | readonly AssuranceCanonicalJsonValueV1[]
  | { readonly [key: string]: AssuranceCanonicalJsonValueV1 };

function fail(path: string, reason: string): never {
  throw new TypeError(
    "canonical assurance serialization rejected " + path + ": " + reason,
  );
}

function jsonString(value: string): string {
  const encoded = JSON.stringify(value);
  if (typeof encoded !== "string") {
    throw new TypeError("JSON string encoding failed");
  }
  return encoded;
}

function numberString(value: number, path: string): string {
  if (!Number.isFinite(value)) {
    return fail(path, "number must be finite");
  }

  const normalized = Object.is(value, -0) ? 0 : value;
  const encoded = JSON.stringify(normalized);
  if (typeof encoded !== "string") {
    return fail(path, "number is not JSON-serializable");
  }
  return encoded;
}

function compareUtf8(left: string, right: string): number {
  return Buffer.compare(
    Buffer.from(left, "utf8"),
    Buffer.from(right, "utf8"),
  );
}

function requireArrayShape(value: readonly unknown[], path: string): void {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    fail(path, "array must use the canonical Array prototype");
  }

  const ownKeys = Reflect.ownKeys(value);
  const expectedKeys = new Set<string>(["length"]);

  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    expectedKeys.add(key);

    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      fail(path, "sparse arrays are unsupported");
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      fail(path + "[" + index + "]", "array items must be enumerable data properties");
    }
  }

  if (ownKeys.length !== expectedKeys.size) {
    fail(path, "arrays cannot contain extra or symbol properties");
  }

  for (const key of ownKeys) {
    if (typeof key !== "string" || !expectedKeys.has(key)) {
      fail(path, "arrays cannot contain extra or symbol properties");
    }
  }
}

function requirePlainObjectShape(
  value: Record<string, unknown>,
  path: string,
): readonly string[] {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(path, "object must be a plain object");
  }

  const ownKeys = Reflect.ownKeys(value);
  const stringKeys: string[] = [];

  for (const key of ownKeys) {
    if (typeof key !== "string") {
      fail(path, "symbol-keyed properties are unsupported");
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      fail(
        path + "." + key,
        "object properties must be enumerable data properties",
      );
    }

    stringKeys.push(key);
  }

  stringKeys.sort(compareUtf8);
  return stringKeys;
}

function serializeValue(
  value: unknown,
  path: string,
  stack: Set<object>,
): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "string":
      return jsonString(value);
    case "number":
      return numberString(value, path);
    case "undefined":
      return fail(path, "undefined is not a JSON value");
    case "function":
      return fail(path, "functions are not JSON values");
    case "symbol":
      return fail(path, "symbols are not JSON values");
    case "bigint":
      return fail(path, "bigints are not JSON values");
    case "object":
      break;
    default:
      return fail(path, "unsupported value type");
  }

  const objectValue = value as object;
  if (types.isProxy(objectValue)) {
    return fail(path, "Proxy values are unsupported");
  }
  if (stack.has(objectValue)) {
    return fail(path, "cyclic object graphs are unsupported");
  }

  stack.add(objectValue);
  try {
    if (Array.isArray(value)) {
      requireArrayShape(value, path);
      const entries: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        entries.push(
          serializeValue(value[index], path + "[" + index + "]", stack),
        );
      }
      return "[" + entries.join(",") + "]";
    }

    const record = value as Record<string, unknown>;
    const keys = requirePlainObjectShape(record, path);
    const entries = keys.map(
      (key) =>
        jsonString(key) +
        ":" +
        serializeValue(record[key], path + "." + key, stack),
    );
    return "{" + entries.join(",") + "}";
  } finally {
    stack.delete(objectValue);
  }
}

export function canonicalAssuranceJsonV1(value: unknown): string {
  return serializeValue(value, "$", new Set<object>());
}

export function canonicalAssuranceBytesV1(value: unknown): Uint8Array {
  return Buffer.from(canonicalAssuranceJsonV1(value), "utf8");
}

export function canonicalAssuranceSha256V1(value: unknown): string {
  return createHash("sha256")
    .update(canonicalAssuranceBytesV1(value))
    .digest("hex");
}
