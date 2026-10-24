import { describe, expect, it } from "vitest";
import { createTextAssertionRequest } from "../src/browser/executor.js";

const request = {
  expected_text: " exact\ntext ",
  kind: "exact_text" as const,
  request_id: "req-text",
  session_id: "session-text",
  source_identity: "tree:fixture-text",
  target: "result",
  timeout_ms: 1000,
};

describe("REA-E04 literal text assertion request", () => {
  it("preserves literal text including empty strings, whitespace and code", () => {
    expect(createTextAssertionRequest(request)).toEqual(request);
    for (const expected_text of ["", "  ", "${process.exit(1)}", "/ready/i"]) {
      expect(createTextAssertionRequest({ ...request, expected_text }).expected_text)
        .toBe(expected_text);
    }
  });

  it("rejects malformed, unsupported and unbounded intent", () => {
    for (const patch of [
      { kind: "contains" }, { request_id: "" }, { session_id: "other session" },
      { source_identity: "" }, { target: "" }, { target: "x\ny" },
      { target: "x".repeat(4097) }, { expected_text: "x".repeat(65537) },
      { expected_text: null }, { expected_text: 1 }, { target: null },
      { timeout_ms: 0 }, { timeout_ms: 120001 }, { timeout_ms: NaN },
      { timeout_ms: Infinity }, { timeout_ms: 1.5 }, { request_id: 1 },
    ]) {
      expect(() => createTextAssertionRequest({ ...request, ...patch } as never))
        .toThrow(TypeError);
    }
  });
});
