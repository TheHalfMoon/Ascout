import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  validatePublicationRequestV1,
  type PublicationAuthorizationV1,
} from "../src/assurance/publication/github-publication-adapter.js";
import {
  buildPublicationIntentV1,
  type PublicationIntentInputV1,
  type PublicationIntentV1,
} from "../src/assurance/publication/publication-intent.js";

function hex64(seed: string): string {
  return createHash("sha256").update(seed, "utf8").digest("hex");
}

const HEAD = "f".repeat(40);
const AUTHORITY = hex64("t08/authority");

function intentInput(): PublicationIntentInputV1 {
  return {
    target: {
      repository_identity: "repo:example",
      kind: "PULL_REQUEST",
      number: 536,
      comment_identity: null,
    },
    source_head: HEAD,
    payload_digest: hex64("t08/payload"),
    classification: "PUBLIC",
    redaction: { redacted: false, redacted_fields: [] },
    authority_identity: AUTHORITY,
    idempotency_identity: hex64("t08/idempotency"),
    attempt_identity: hex64("t08/attempt"),
    generation_evidence: "generation:8",
  };
}

function authorization(): PublicationAuthorizationV1 {
  return {
    authority_identity: AUTHORITY,
    network_permitted: true,
    provider_permitted: true,
    egress_permitted: true,
  };
}

function intent(): PublicationIntentV1 {
  const built = buildPublicationIntentV1(intentInput());
  if (built === null) {
    throw new Error("fixture intent must build");
  }
  return built;
}

describe("UA-P04-T08 GitHub publication adapter", () => {
  it("binds exact target head and comment identities", () => {
    const decision = validatePublicationRequestV1(
      intent(),
      true,
      "CURRENT",
      authorization(),
    );
    expect(decision.accepted).toBe(true);
    expect(decision.descriptor?.target.number).toBe(536);
    expect(decision.descriptor?.source_head).toBe(HEAD);
    expect(decision.descriptor?.network_call_made).toBe(false);
  });

  it("refuses without redaction permission", () => {
    const decision = validatePublicationRequestV1(
      intent(),
      false,
      "CURRENT",
      authorization(),
    );
    expect(decision.accepted).toBe(false);
    expect(decision.descriptor).toBeNull();
  });

  it("refuses stale or unknown evidence", () => {
    expect(
      validatePublicationRequestV1(intent(), true, "STALE", authorization())
        .accepted,
    ).toBe(false);
    expect(
      validatePublicationRequestV1(intent(), true, "UNKNOWN", authorization())
        .accepted,
    ).toBe(false);
  });

  it("refuses authority mismatch or incomplete authority", () => {
    expect(
      validatePublicationRequestV1(
        intent(),
        true,
        "CURRENT",
        { ...authorization(), authority_identity: hex64("t08/other") },
      ).accepted,
    ).toBe(false);
    expect(
      validatePublicationRequestV1(
        intent(),
        true,
        "CURRENT",
        { ...authorization(), network_permitted: false },
      ).accepted,
    ).toBe(false);
    expect(
      validatePublicationRequestV1(
        intent(),
        true,
        "CURRENT",
        { ...authorization(), egress_permitted: false },
      ).accepted,
    ).toBe(false);
  });

  it("never performs a network call", () => {
    const decision = validatePublicationRequestV1(
      intent(),
      true,
      "CURRENT",
      authorization(),
    );
    expect(decision.descriptor?.network_call_made).toBe(false);
  });

  it("keeps descriptors deterministic", () => {
    const first = validatePublicationRequestV1(
      intent(),
      true,
      "CURRENT",
      authorization(),
    );
    const second = validatePublicationRequestV1(
      intent(),
      true,
      "CURRENT",
      authorization(),
    );
    expect(first).toEqual(second);
  });
});
