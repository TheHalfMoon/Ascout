import { describe, expect, it } from "vitest";

import {
  EngineEnvelopeError,
  parseEngineEnvelopeV1,
} from "../src/assurance/engines/engine-envelope-v1.js";
import { ENGINE_PROFILE_HARD_CAPS_V1 } from "../src/assurance/engines/engine-profile-v1.js";

const REQUEST_ID = "request:1";

function valid(): Record<string, unknown> {
  return {
    protocol: "ascout-engine/1",
    request_id: REQUEST_ID,
    engine: { id: "engine:fixture", version: "1.0.0", build: "build:1" },
    profile_sha256: "a".repeat(64),
    source: { head_sha: "b".repeat(40), tree_digest: "c".repeat(64) },
    execution: { state: "COMPLETED", started_at_epoch_ms: 1, ended_at_epoch_ms: 2 },
    capabilities: [{ id: "capability:a", state: "EXECUTED", coverage: "COMPLETE" }],
    observations: [
      {
        observation_id: "observation:1",
        capability_id: "capability:a",
        rule_id: "rule:1",
        location: { path: "src/a.ts", start_line: 1, end_line: 2 },
        message: "A rule matched.",
      },
    ],
    diagnostics: [{ code: "note:1", message: "Finished." }],
  };
}

function encode(value: unknown): Uint8Array {
  return Buffer.from(JSON.stringify(value), "utf8");
}

function errorCode(input: Uint8Array): string {
  try {
    parseEngineEnvelopeV1(input, REQUEST_ID);
  } catch (error) {
    if (error instanceof EngineEnvelopeError) return error.code;
    throw error;
  }
  return "PARSED";
}

function observationWith(fields: Record<string, unknown>): Record<string, unknown> {
  const observations = valid().observations as Record<string, unknown>[];
  return { ...valid(), observations: [{ ...observations[0], ...fields }] };
}

describe("parseEngineEnvelopeV1", () => {
  it("parses a valid envelope", () => {
    const envelope = parseEngineEnvelopeV1(encode(valid()), REQUEST_ID);
    expect(envelope.observations[0]?.location?.path).toBe("src/a.ts");
    expect(envelope.execution.state).toBe("COMPLETED");
  });

  it("names a wrong request ID separately", () => {
    expect(errorCode(encode({ ...valid(), request_id: "request:2" }))).toBe("REQUEST_ID_MISMATCH");
  });

  it.each([
    ["empty input", Buffer.alloc(0)],
    ["invalid UTF-8", Buffer.from([0xff, 0xfe, 0x7b, 0x7d])],
    ["a byte order mark", Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), encode(valid())])],
    ["text around the JSON", Buffer.from("note\n" + JSON.stringify(valid()), "utf8")],
    ["an array", encode([valid()])],
    ["null", encode(null)],
  ])("refuses %s", (_label, input) => {
    expect(errorCode(input)).toBe("INVALID_ENVELOPE");
  });

  it("refuses input larger than the output cap", () => {
    const input = Buffer.alloc(ENGINE_PROFILE_HARD_CAPS_V1.max_stdout_bytes + 1, 0x20);
    expect(errorCode(input)).toBe("INVALID_ENVELOPE");
  });

  it.each([
    ["an extra top-level field", { ...valid(), verdict: "PASS" }],
    ["a raw Secret field", observationWith({ Secret: "value" })],
    ["a wrong protocol", { ...valid(), protocol: "ascout-engine/2" }],
    ["an unknown execution state", { ...valid(), execution: { state: "OK", started_at_epoch_ms: 1, ended_at_epoch_ms: 2 } }],
    ["reversed timestamps", { ...valid(), execution: { state: "COMPLETED", started_at_epoch_ms: 3, ended_at_epoch_ms: 2 } }],
    ["a short head", { ...valid(), source: { head_sha: "b".repeat(39), tree_digest: "c".repeat(64) } }],
    ["an uppercase digest", { ...valid(), profile_sha256: "A".repeat(64) }],
    ["an unknown capability state", { ...valid(), capabilities: [{ id: "capability:a", state: "PASS", coverage: "COMPLETE" }] }],
    ["a duplicate capability", { ...valid(), capabilities: [
      { id: "capability:a", state: "EXECUTED", coverage: "COMPLETE" },
      { id: "capability:a", state: "EXECUTED", coverage: "COMPLETE" },
    ] }],
    ["an observation for an unreported capability", observationWith({ capability_id: "capability:b" })],
    ["a multi-line message", observationWith({ message: "one\ntwo" })],
    ["an oversized message", observationWith({ message: "x".repeat(513) })],
    ["reversed lines", observationWith({ location: { path: "a", start_line: 3, end_line: 2 } })],
    ["line zero", observationWith({ location: { path: "a", start_line: 0, end_line: 2 } })],
  ])("refuses %s", (_label, value) => {
    expect(errorCode(encode(value))).toBe("INVALID_ENVELOPE");
  });

  it.each([
    "/etc/passwd",
    "../outside",
    "src/../../outside",
    "src//a.ts",
    "./a.ts",
    "C:/Windows/a.ts",
    "src\\a.ts",
    "//server/share",
    "a\nb",
    "",
  ])("refuses the location path %j", (path) => {
    const value = observationWith({ location: { path, start_line: 1, end_line: 1 } });
    expect(errorCode(encode(value))).toBe("INVALID_ENVELOPE");
  });

  it("refuses duplicate observation IDs", () => {
    const observations = valid().observations as unknown[];
    const value = { ...valid(), observations: [observations[0], observations[0]] };
    expect(errorCode(encode(value))).toBe("INVALID_ENVELOPE");
  });

  it("does not repeat engine output in its error message", () => {
    const marker = "ENGINE_OUTPUT_MARKER";
    expect(() =>
      parseEngineEnvelopeV1(Buffer.from(`{"${marker}":"${marker}"}`), REQUEST_ID),
    ).toThrow(EngineEnvelopeError);
    try {
      parseEngineEnvelopeV1(Buffer.from(`{"${marker}":"${marker}"}`), REQUEST_ID);
    } catch (error) {
      expect((error as Error).message).not.toContain(marker);
    }
  });
});
