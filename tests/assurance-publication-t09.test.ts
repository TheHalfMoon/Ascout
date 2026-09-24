import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  reconcilePublicationReceiptV1,
  recordPublicationReceiptV1,
  retryFromReceiptV1,
} from "../src/assurance/publication/publication-receipt.js";

function hex64(seed: string): string {
  return createHash("sha256").update(seed, "utf8").digest("hex");
}

const INTENT = hex64("t09/intent");
const EFFECT = hex64("t09/effect");
const ATTEMPT_1 = hex64("t09/attempt-1");
const ATTEMPT_2 = hex64("t09/attempt-2");

describe("UA-P04-T09 PublicationReceipt", () => {
  it("records success failure and unknown durably", () => {
    const success = recordPublicationReceiptV1({
      intent_identity: INTENT,
      effect_identity: EFFECT,
      outcome: "RECORDED_SUCCESS",
      attempt_identity: ATTEMPT_1,
    });
    expect(success?.outcome).toBe("RECORDED_SUCCESS");
    expect(success?.reconciliation).toBe("SETTLED");
    const unknown = recordPublicationReceiptV1({
      intent_identity: INTENT,
      effect_identity: EFFECT,
      outcome: "UNKNOWN",
      attempt_identity: ATTEMPT_1,
    });
    expect(unknown?.outcome).toBe("UNKNOWN");
    expect(unknown?.reconciliation).toBe("UNRECONCILED");
  });

  it("rejects malformed receipt inputs", () => {
    expect(
      recordPublicationReceiptV1({
        intent_identity: "bad",
        effect_identity: EFFECT,
        outcome: "RECORDED_SUCCESS",
        attempt_identity: ATTEMPT_1,
      }),
    ).toBeNull();
    expect(
      recordPublicationReceiptV1({
        intent_identity: INTENT,
        effect_identity: EFFECT,
        outcome: "RECORDED_SUCCESS",
        attempt_identity: "bad",
      }),
    ).toBeNull();
  });

  it("reconciles unknown receipts with evidence", () => {
    const unknown = recordPublicationReceiptV1({
      intent_identity: INTENT,
      effect_identity: EFFECT,
      outcome: "UNKNOWN",
      attempt_identity: ATTEMPT_1,
    });
    expect(unknown).not.toBeNull();
    if (unknown === null) {
      return;
    }
    const reconciled = reconcilePublicationReceiptV1(
      unknown,
      "RECORDED_SUCCESS",
      "evidence:9",
    );
    expect(reconciled.reconciled).toBe(true);
    expect(reconciled.receipt?.outcome).toBe("RECORDED_SUCCESS");
    expect(reconciled.receipt?.reconciliation).toBe("SETTLED");
  });

  it("refuses reconciliation without evidence or to unknown", () => {
    const unknown = recordPublicationReceiptV1({
      intent_identity: INTENT,
      effect_identity: EFFECT,
      outcome: "UNKNOWN",
      attempt_identity: ATTEMPT_1,
    });
    expect(unknown).not.toBeNull();
    if (unknown === null) {
      return;
    }
    expect(
      reconcilePublicationReceiptV1(unknown, "RECORDED_SUCCESS", "").reconciled,
    ).toBe(false);
    expect(
      reconcilePublicationReceiptV1(unknown, "UNKNOWN", "evidence:9").reconciled,
    ).toBe(false);
    const settled = recordPublicationReceiptV1({
      intent_identity: INTENT,
      effect_identity: EFFECT,
      outcome: "RECORDED_SUCCESS",
      attempt_identity: ATTEMPT_1,
    });
    expect(settled).not.toBeNull();
    if (settled === null) {
      return;
    }
    expect(
      reconcilePublicationReceiptV1(settled, "RECORDED_FAILURE", "evidence:9")
        .reconciled,
    ).toBe(false);
  });

  it("governs retry from receipts without duplicating effects", () => {
    const success = recordPublicationReceiptV1({
      intent_identity: INTENT,
      effect_identity: EFFECT,
      outcome: "RECORDED_SUCCESS",
      attempt_identity: ATTEMPT_1,
    });
    const unknown = recordPublicationReceiptV1({
      intent_identity: INTENT,
      effect_identity: EFFECT,
      outcome: "UNKNOWN",
      attempt_identity: ATTEMPT_1,
    });
    const failure = recordPublicationReceiptV1({
      intent_identity: INTENT,
      effect_identity: EFFECT,
      outcome: "RECORDED_FAILURE",
      attempt_identity: ATTEMPT_1,
    });
    expect(success).not.toBeNull();
    expect(unknown).not.toBeNull();
    expect(failure).not.toBeNull();
    if (success === null || unknown === null || failure === null) {
      return;
    }
    const replay = retryFromReceiptV1(success, ATTEMPT_2);
    expect(replay.permitted).toBe(true);
    expect(replay.re_execute).toBe(false);
    const blocked = retryFromReceiptV1(unknown, ATTEMPT_2);
    expect(blocked.permitted).toBe(false);
    const fresh = retryFromReceiptV1(failure, ATTEMPT_2);
    expect(fresh.permitted).toBe(true);
    expect(fresh.re_execute).toBe(true);
    expect(retryFromReceiptV1(success, "bad").permitted).toBe(false);
  });

  it("keeps receipts deterministic", () => {
    expect(
      recordPublicationReceiptV1({
        intent_identity: INTENT,
        effect_identity: EFFECT,
        outcome: "RECORDED_SUCCESS",
        attempt_identity: ATTEMPT_1,
      }),
    ).toEqual(
      recordPublicationReceiptV1({
        intent_identity: INTENT,
        effect_identity: EFFECT,
        outcome: "RECORDED_SUCCESS",
        attempt_identity: ATTEMPT_1,
      }),
    );
  });
});
