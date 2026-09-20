import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  ASSURANCE_CANONICAL_SERIALIZATION_VERSION,
  canonicalAssuranceBytesV1,
  canonicalAssuranceJsonV1,
  canonicalAssuranceSha256V1,
} from "../src/assurance/contracts/canonical-serialization.js";

describe("UA-P01-T15 canonical assurance serialization", () => {
  it("freezes serialization version 1", () => {
    expect(ASSURANCE_CANONICAL_SERIALIZATION_VERSION).toBe(1);
  });

  it("serializes identical semantic objects to identical canonical bytes", () => {
    const first = {
      b: 2,
      a: 1,
      nested: {
        z: true,
        c: null,
      },
    };
    const second = {
      nested: {
        c: null,
        z: true,
      },
      a: 1,
      b: 2,
    };

    expect(canonicalAssuranceJsonV1(first)).toBe(
      '{"a":1,"b":2,"nested":{"c":null,"z":true}}',
    );
    expect(canonicalAssuranceJsonV1(second)).toBe(
      canonicalAssuranceJsonV1(first),
    );
    expect(Buffer.from(canonicalAssuranceBytesV1(second))).toEqual(
      Buffer.from(canonicalAssuranceBytesV1(first)),
    );
    expect(canonicalAssuranceSha256V1(second)).toBe(
      canonicalAssuranceSha256V1(first),
    );
  });

  it("locks an exact SHA-256 golden over canonical UTF-8 bytes", () => {
    const value = { b: 2, a: 1 };
    const text = canonicalAssuranceJsonV1(value);
    const bytes = canonicalAssuranceBytesV1(value);

    expect(text).toBe('{"a":1,"b":2}');
    expect(Buffer.from(bytes).toString("utf8")).toBe(text);
    expect(canonicalAssuranceSha256V1(value)).toBe(
      "43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777",
    );
    expect(canonicalAssuranceSha256V1(value)).toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
  });

  it("sorts object keys by UTF-8 bytes instead of locale collation", () => {
    const value = {
      "é": 4,
      "ä": 3,
      z: 2,
      a: 1,
    };

    expect(canonicalAssuranceJsonV1(value)).toBe(
      '{"a":1,"z":2,"ä":3,"é":4}',
    );
  });

  it("preserves array order as semantic", () => {
    expect(canonicalAssuranceJsonV1(["b", "a"])).toBe('["b","a"]');
    expect(canonicalAssuranceJsonV1(["a", "b"])).toBe('["a","b"]');
    expect(canonicalAssuranceSha256V1(["b", "a"])).not.toBe(
      canonicalAssuranceSha256V1(["a", "b"]),
    );
  });

  it("canonicalizes negative zero to JSON numeric zero", () => {
    expect(canonicalAssuranceJsonV1(-0)).toBe("0");
    expect(canonicalAssuranceJsonV1({ value: -0 })).toBe('{"value":0}');
    expect(canonicalAssuranceSha256V1(-0)).toBe(
      canonicalAssuranceSha256V1(0),
    );
  });

  it("accepts repeated acyclic references by semantic value", () => {
    const shared = { x: 1 };
    const value = {
      first: shared,
      second: shared,
    };

    expect(canonicalAssuranceJsonV1(value)).toBe(
      '{"first":{"x":1},"second":{"x":1}}',
    );
  });

  it("accepts null-prototype plain JSON objects", () => {
    const value = Object.create(null) as Record<string, unknown>;
    value.b = 2;
    value.a = 1;

    expect(canonicalAssuranceJsonV1(value)).toBe('{"a":1,"b":2}');
  });

  it("rejects non-finite numbers", () => {
    for (const value of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(() => canonicalAssuranceJsonV1(value)).toThrow(
        "number must be finite",
      );
    }
  });

  it("rejects primitive values outside JSON", () => {
    const values: unknown[] = [
      undefined,
      1n,
      Symbol("x"),
      () => 1,
    ];

    for (const value of values) {
      expect(() => canonicalAssuranceJsonV1(value)).toThrow(
        "canonical assurance serialization rejected",
      );
    }
  });

  it("rejects sparse arrays", () => {
    const sparse = new Array(2);
    sparse[1] = "value";

    expect(() => canonicalAssuranceJsonV1(sparse)).toThrow(
      "sparse arrays are unsupported",
    );
  });

  it("rejects arrays with extra, symbol, or exotic prototype state", () => {
    const extra = [1, 2] as number[] & { extra?: number };
    extra.extra = 3;
    expect(() => canonicalAssuranceJsonV1(extra)).toThrow(
      "arrays cannot contain extra or symbol properties",
    );

    const symbolKey = Symbol("hidden");
    const withSymbol = [1, 2] as unknown[] & Record<symbol, unknown>;
    withSymbol[symbolKey] = 3;
    expect(() => canonicalAssuranceJsonV1(withSymbol)).toThrow(
      "arrays cannot contain extra or symbol properties",
    );

    class CustomArray<T> extends Array<T> {}
    expect(() => canonicalAssuranceJsonV1(new CustomArray(1, 2))).toThrow(
      "array must use the canonical Array prototype",
    );
  });

  it("rejects non-plain object instances", () => {
    class Example {
      readonly value = 1;
    }

    const values: unknown[] = [
      new Date(0),
      new Map([["a", 1]]),
      new Set([1]),
      /x/u,
      new Uint8Array([1, 2]),
      new Example(),
    ];

    for (const value of values) {
      expect(() => canonicalAssuranceJsonV1(value)).toThrow(
        "object must be a plain object",
      );
    }
  });

  it("rejects symbol-keyed and non-enumerable object properties", () => {
    const symbolKey = Symbol("hidden");
    const withSymbol: Record<string | symbol, unknown> = { a: 1 };
    withSymbol[symbolKey] = 2;

    expect(() => canonicalAssuranceJsonV1(withSymbol)).toThrow(
      "symbol-keyed properties are unsupported",
    );

    const nonEnumerable = { a: 1 };
    Object.defineProperty(nonEnumerable, "hidden", {
      value: 2,
      enumerable: false,
    });

    expect(() => canonicalAssuranceJsonV1(nonEnumerable)).toThrow(
      "object properties must be enumerable data properties",
    );
  });

  it("rejects accessors without invoking them", () => {
    let getterCalls = 0;
    const value: Record<string, unknown> = {};
    Object.defineProperty(value, "secret", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "should-not-run";
      },
    });

    expect(() => canonicalAssuranceJsonV1(value)).toThrow(
      "object properties must be enumerable data properties",
    );
    expect(getterCalls).toBe(0);
  });

  it("does not execute toJSON and rejects it as a non-JSON function value", () => {
    let calls = 0;
    const value = {
      a: 1,
      toJSON() {
        calls += 1;
        return { forged: true };
      },
    };

    expect(() => canonicalAssuranceJsonV1(value)).toThrow(
      "functions are not JSON values",
    );
    expect(calls).toBe(0);
  });

  it("rejects Proxy values before invoking object traps", () => {
    let trapCalls = 0;
    const proxy = new Proxy(
      { a: 1 },
      {
        ownKeys(target) {
          trapCalls += 1;
          return Reflect.ownKeys(target);
        },
        getPrototypeOf(target) {
          trapCalls += 1;
          return Reflect.getPrototypeOf(target);
        },
      },
    );

    expect(() => canonicalAssuranceJsonV1(proxy)).toThrow(
      "Proxy values are unsupported",
    );
    expect(trapCalls).toBe(0);
  });

  it("rejects cyclic objects and arrays", () => {
    const objectCycle: Record<string, unknown> = {};
    objectCycle.self = objectCycle;

    const arrayCycle: unknown[] = [];
    arrayCycle.push(arrayCycle);

    expect(() => canonicalAssuranceJsonV1(objectCycle)).toThrow(
      "cyclic object graphs are unsupported",
    );
    expect(() => canonicalAssuranceJsonV1(arrayCycle)).toThrow(
      "cyclic object graphs are unsupported",
    );
  });

  it("rejects nested unsupported values instead of omitting or nulling them", () => {
    expect(() =>
      canonicalAssuranceJsonV1({
        keep: 1,
        omit: undefined,
      }),
    ).toThrow("undefined is not a JSON value");

    expect(() => canonicalAssuranceJsonV1([1, Number.NaN])).toThrow(
      "number must be finite",
    );
  });

  it("emits no formatting whitespace", () => {
    const text = canonicalAssuranceJsonV1({
      b: [true, false, null],
      a: { d: "x", c: 1 },
    });

    expect(text).toBe(
      '{"a":{"c":1,"d":"x"},"b":[true,false,null]}',
    );
    expect(text).not.toContain("\n");
    expect(text).not.toContain("\t");
  });
});
