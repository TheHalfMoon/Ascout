import { describe, expect, it } from "vitest";

import { evaluateRedactionGateV1 } from "../src/assurance/publication/redaction-gate.js";

describe("UA-P04-T07 redaction and classification gate", () => {
  it("permits public evidence without redaction", () => {
    const decision = evaluateRedactionGateV1({
      classification: "PUBLIC",
      redaction: { redacted: false, redacted_fields: [] },
      payload_contains_secrets: false,
    });
    expect(decision.permitted).toBe(true);
  });

  it("refuses sensitive evidence without redaction", () => {
    const decision = evaluateRedactionGateV1({
      classification: "SENSITIVE",
      redaction: { redacted: false, redacted_fields: [] },
      payload_contains_secrets: false,
    });
    expect(decision.permitted).toBe(false);
  });

  it("refuses secret-bearing payloads without redaction", () => {
    const decision = evaluateRedactionGateV1({
      classification: "INTERNAL",
      redaction: { redacted: false, redacted_fields: [] },
      payload_contains_secrets: true,
    });
    expect(decision.permitted).toBe(false);
  });

  it("permits redacted sensitive payloads", () => {
    const decision = evaluateRedactionGateV1({
      classification: "SENSITIVE",
      redaction: { redacted: true, redacted_fields: ["token"] },
      payload_contains_secrets: true,
    });
    expect(decision.permitted).toBe(true);
  });

  it("refuses empty redaction claims", () => {
    const decision = evaluateRedactionGateV1({
      classification: "INTERNAL",
      redaction: { redacted: true, redacted_fields: [] },
      payload_contains_secrets: false,
    });
    expect(decision.permitted).toBe(false);
  });

  it("keeps gate decisions deterministic", () => {
    const input = {
      classification: "SENSITIVE" as const,
      redaction: { redacted: true, redacted_fields: ["token"] },
      payload_contains_secrets: true,
    };
    expect(evaluateRedactionGateV1(input)).toEqual(
      evaluateRedactionGateV1(input),
    );
  });
});
