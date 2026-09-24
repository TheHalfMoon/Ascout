import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  buildPublicationIntentV1,
  isEffectPerformedV1,
  type PublicationIntentInputV1,
} from "../src/assurance/publication/publication-intent.js";

function hex64(seed: string): string {
  return createHash("sha256").update(seed, "utf8").digest("hex");
}

const HEAD = "e".repeat(40);

function validInput(): PublicationIntentInputV1 {
  return {
    target: {
      repository_identity: "repo:example",
      kind: "PULL_REQUEST",
      number: 528,
      comment_identity: null,
    },
    source_head: HEAD,
    payload_digest: hex64("t06/payload"),
    classification: "INTERNAL",
    redaction: { redacted: true, redacted_fields: ["token"] },
    authority_identity: hex64("t06/authority"),
    idempotency_identity: hex64("t06/idempotency"),
    attempt_identity: hex64("t06/attempt"),
    generation_evidence: "generation:1",
  };
}

describe("UA-P04-T06 PublicationIntent", () => {
  it("binds every required identity without performing the effect", () => {
    const intent = buildPublicationIntentV1(validInput());
    expect(intent).not.toBeNull();
    expect(intent?.effect_performed).toBe(false);
    expect(isEffectPerformedV1(intent!)).toBe(false);
    expect(intent?.source_head).toBe(HEAD);
    expect(intent?.generation_evidence).toBe("generation:1");
  });

  it("rejects malformed targets", () => {
    expect(
      buildPublicationIntentV1({
        ...validInput(),
        target: {
          repository_identity: "",
          kind: "ISSUE",
          number: 1,
          comment_identity: null,
        },
      }),
    ).toBeNull();
    expect(
      buildPublicationIntentV1({
        ...validInput(),
        target: {
          repository_identity: "repo:example",
          kind: "COMMENT",
          number: 1,
          comment_identity: null,
        },
      }),
    ).toBeNull();
    expect(
      buildPublicationIntentV1({
        ...validInput(),
        target: {
          repository_identity: "repo:example",
          kind: "ISSUE",
          number: 0,
          comment_identity: null,
        },
      }),
    ).toBeNull();
  });

  it("rejects malformed identities and empty generation evidence", () => {
    expect(
      buildPublicationIntentV1({ ...validInput(), source_head: "bad" }),
    ).toBeNull();
    expect(
      buildPublicationIntentV1({ ...validInput(), payload_digest: "bad" }),
    ).toBeNull();
    expect(
      buildPublicationIntentV1({ ...validInput(), generation_evidence: "" }),
    ).toBeNull();
  });

  it("keeps generation separate from the effect", () => {
    const first = buildPublicationIntentV1(validInput());
    const second = buildPublicationIntentV1({
      ...validInput(),
      generation_evidence: "generation:2",
    });
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first?.intent_identity).not.toBe(second?.intent_identity);
    expect(isEffectPerformedV1(first!)).toBe(false);
    expect(isEffectPerformedV1(second!)).toBe(false);
  });

  it("computes stable intent identities", () => {
    expect(buildPublicationIntentV1(validInput())).toEqual(
      buildPublicationIntentV1(validInput()),
    );
  });
});
