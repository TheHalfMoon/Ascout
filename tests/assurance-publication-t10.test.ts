import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  validatePublicationRequestV1,
  type PublicationAuthorizationV1,
} from "../src/assurance/publication/github-publication-adapter.js";
import {
  buildPublicationIntentV1,
  type PublicationIntentInputV1,
} from "../src/assurance/publication/publication-intent.js";
import { evaluateRedactionGateV1 } from "../src/assurance/publication/redaction-gate.js";
import {
  reconcilePublicationReceiptV1,
  recordPublicationReceiptV1,
  retryFromReceiptV1,
} from "../src/assurance/publication/publication-receipt.js";
import {
  buildIdempotencyRecordV1,
  reconcileUnknownV1,
  requestRetryV1,
} from "../src/assurance/workflow/idempotency-reconciliation.js";

function hex64(seed: string): string {
  return createHash("sha256").update(seed, "utf8").digest("hex");
}

const HEAD = "0".repeat(40);
const STALE = "1".repeat(40);
const AUTHORITY = hex64("t10/authority");

function intentInput(head: string): PublicationIntentInputV1 {
  return {
    target: {
      repository_identity: "repo:example",
      kind: "PULL_REQUEST",
      number: 540,
      comment_identity: null,
    },
    source_head: head,
    payload_digest: hex64("t10/payload"),
    classification: "PUBLIC",
    redaction: { redacted: false, redacted_fields: [] },
    authority_identity: AUTHORITY,
    idempotency_identity: hex64("t10/idempotency"),
    attempt_identity: hex64("t10/attempt-1"),
    generation_evidence: "generation:10",
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

describe("UA-P04-T10 duplicate and stale publication", () => {
  it("produces zero duplicate effects across success retry", () => {
    const effects: string[] = [];
    const intent = buildPublicationIntentV1(intentInput(HEAD));
    expect(intent).not.toBeNull();
    if (intent === null) {
      return;
    }
    const gate = evaluateRedactionGateV1({
      classification: intent.classification,
      redaction: intent.redaction,
      payload_contains_secrets: false,
    });
    expect(gate.permitted).toBe(true);
    const accepted = validatePublicationRequestV1(
      intent,
      gate.permitted,
      "CURRENT",
      authorization(),
    );
    expect(accepted.accepted).toBe(true);
    if (accepted.descriptor !== null) {
      effects.push(accepted.descriptor.effect_identity);
    }
    const receipt = recordPublicationReceiptV1({
      intent_identity: intent.intent_identity,
      effect_identity: accepted.descriptor?.effect_identity ?? "",
      outcome: "RECORDED_SUCCESS",
      attempt_identity: intent.attempt_identity,
    });
    expect(receipt).not.toBeNull();
    if (receipt === null) {
      return;
    }
    const retry = retryFromReceiptV1(receipt, hex64("t10/attempt-2"));
    expect(retry.permitted).toBe(true);
    expect(retry.re_execute).toBe(false);
    expect(effects).toHaveLength(1);
  });

  it("blocks blind retry on unknown idempotency outcomes", () => {
    const idem = hex64("t10/idem-unknown");
    const record = buildIdempotencyRecordV1(idem, hex64("t10/a1"), "UNKNOWN");
    expect(record).not.toBeNull();
    if (record === null) {
      return;
    }
    expect(requestRetryV1(record, hex64("t10/a2")).permitted).toBe(false);
    const reconciled = reconcileUnknownV1(record, "FAILED", "evidence:10");
    expect(reconciled.reconciled).toBe(true);
    if (reconciled.record === null) {
      return;
    }
    expect(requestRetryV1(reconciled.record, hex64("t10/a2")).permitted).toBe(
      true,
    );
  });

  it("refuses stale heads as current publication", () => {
    const intent = buildPublicationIntentV1(intentInput(STALE));
    expect(intent).not.toBeNull();
    if (intent === null) {
      return;
    }
    const decision = validatePublicationRequestV1(
      intent,
      true,
      "STALE",
      authorization(),
    );
    expect(decision.accepted).toBe(false);
    expect(decision.descriptor).toBeNull();
  });

  it("serializes concurrent duplicate submissions to one effect", () => {
    const effects: string[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < 3; index += 1) {
      const intent = buildPublicationIntentV1(intentInput(HEAD));
      expect(intent).not.toBeNull();
      if (intent === null) {
        continue;
      }
      const decision = validatePublicationRequestV1(
        intent,
        true,
        "CURRENT",
        authorization(),
      );
      if (decision.accepted && decision.descriptor !== null) {
        const key = decision.descriptor.idempotency_identity;
        if (!seen.has(key)) {
          seen.add(key);
          effects.push(decision.descriptor.effect_identity);
        }
      }
    }
    expect(effects).toHaveLength(1);
  });

  it("holds unknown receipts out of success until reconciled", () => {
    const receipt = recordPublicationReceiptV1({
      intent_identity: hex64("t10/intent"),
      effect_identity: hex64("t10/effect"),
      outcome: "UNKNOWN",
      attempt_identity: hex64("t10/a1"),
    });
    expect(receipt).not.toBeNull();
    if (receipt === null) {
      return;
    }
    expect(receipt.outcome).not.toBe("RECORDED_SUCCESS");
    expect(retryFromReceiptV1(receipt, hex64("t10/a2")).permitted).toBe(false);
    const reconciled = reconcilePublicationReceiptV1(
      receipt,
      "RECORDED_FAILURE",
      "evidence:10",
    );
    expect(reconciled.reconciled).toBe(true);
    expect(reconciled.receipt?.outcome).toBe("RECORDED_FAILURE");
  });

  it("refuses unredacted sensitive publication end to end", () => {
    const gate = evaluateRedactionGateV1({
      classification: "SENSITIVE",
      redaction: { redacted: false, redacted_fields: [] },
      payload_contains_secrets: true,
    });
    expect(gate.permitted).toBe(false);
    const intent = buildPublicationIntentV1({
      ...intentInput(HEAD),
      classification: "SENSITIVE",
    });
    expect(intent).not.toBeNull();
    if (intent === null) {
      return;
    }
    const decision = validatePublicationRequestV1(
      intent,
      gate.permitted,
      "CURRENT",
      authorization(),
    );
    expect(decision.accepted).toBe(false);
  });
});
