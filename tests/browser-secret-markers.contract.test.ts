import { describe, expect, it } from "vitest";

import { createActionResponse } from "../src/browser/executor.js";
import { containsSecretMarker, redactSecretMarkers } from "../src/browser/secret-markers.js";

// Fake tokens are assembled at runtime so no scanner sees a token-shaped literal in this file.
const join = (...parts: readonly string[]): string => parts.join("");
const FAKE = {
  githubActions: join("gh", "s_", "a".repeat(36)),
  githubUser: join("gh", "u_", "b".repeat(36)),
  awsTemporary: join("AS", "IA", "C".repeat(16)),
  stripeLive: join("sk", "_live_", "d".repeat(24)),
  stripeRestricted: join("rk", "_test_", "e".repeat(24)),
  openaiProject: join("sk", "-proj-", "f".repeat(40)),
  anthropic: join("sk", "-ant-", "g".repeat(40)),
  npm: join("np", "m_", "h".repeat(36)),
  google: join("AI", "za", "i".repeat(35)),
  jwt: join("ey", "J", "j".repeat(20), ".", "k".repeat(20), ".", "l".repeat(20)),
  bearer: join("Bea", "rer ", "m".repeat(30)),
};

describe("browser secret markers", () => {
  it.each(Object.entries(FAKE))("recognizes a %s token", (_name, token) => {
    expect(containsSecretMarker(`value ${token} end`)).toBe(true);
  });

  it.each(["skip this", "sk-learn is a library", "Bearer token required", "eyJ is a JSON prefix", "npm_install"])(
    "leaves ordinary text %j alone",
    (text) => {
      expect(containsSecretMarker(text)).toBe(false);
    },
  );

  it("redacts every match in page text", () => {
    expect(redactSecretMarkers(`a ${FAKE.githubActions} b ${FAKE.jwt} c`)).toBe("a [REDACTED] b [REDACTED] c");
  });
});

describe("browser action errors", () => {
  it("redacts a secret that page text put in an error message", () => {
    const response = createActionResponse({
      request_id: "req-1",
      session_id: "session-001",
      source_identity: "a".repeat(64),
      status: "failed",
      duration_ms: 5,
      error: { code: "E_CONSOLE_ERROR", message: `401 for ${FAKE.githubActions}` },
      evidence_refs: [],
    });
    expect(response.error?.message).toBe("401 for [REDACTED]");
  });
});
