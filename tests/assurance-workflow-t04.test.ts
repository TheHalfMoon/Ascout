import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  buildIdempotencyRecordV1,
  reconcileUnknownV1,
  requestRetryV1,
} from "../src/assurance/workflow/idempotency-reconciliation.js";

function hex64(seed: string): string {
  return createHash("sha256").update(seed, "utf8").digest("hex");
}

const IDEM = hex64("t04/idempotency");
const ATTEMPT_1 = hex64("t04/attempt-1");
const ATTEMPT_2 = hex64("t04/attempt-2");

describe("UA-P04-T04 idempotency and reconciliation", () => {
  it("rejects malformed record construction", () => {
    expect(buildIdempotencyRecordV1("short", ATTEMPT_1, "UNKNOWN")).toBeNull();
    expect(buildIdempotencyRecordV1(IDEM, "short", "UNKNOWN")).toBeNull();
  });

  it("blocks blind retry on unknown outcome", () => {
    const record = buildIdempotencyRecordV1(IDEM, ATTEMPT_1, "UNKNOWN");
    expect(record).not.toBeNull();
    if (record === null) {
      return;
    }
    expect(record.reconciled).toBe(false);
    const decision = requestRetryV1(record, ATTEMPT_2);
    expect(decision.permitted).toBe(false);
    expect(decision.re_execute).toBe(false);
    expect(decision.duplicate).toBe(false);
  });

  it("reconciles unknown before permitting retry", () => {
    const record = buildIdempotencyRecordV1(IDEM, ATTEMPT_1, "UNKNOWN");
    expect(record).not.toBeNull();
    if (record === null) {
      return;
    }
    const reconciled = reconcileUnknownV1(record, "FAILED", "evidence:1");
    expect(reconciled.reconciled).toBe(true);
    expect(reconciled.record?.recorded_outcome).toBe("FAILED");
    expect(reconciled.record?.reconcile_evidence).toBe("evidence:1");
    if (reconciled.record === null) {
      return;
    }
    const decision = requestRetryV1(reconciled.record, ATTEMPT_2);
    expect(decision.permitted).toBe(true);
    expect(decision.re_execute).toBe(true);
    expect(decision.duplicate).toBe(false);
  });

  it("replays success without duplicate side effect", () => {
    const record = buildIdempotencyRecordV1(IDEM, ATTEMPT_1, "SUCCEEDED");
    expect(record).not.toBeNull();
    if (record === null) {
      return;
    }
    const decision = requestRetryV1(record, ATTEMPT_2);
    expect(decision.permitted).toBe(true);
    expect(decision.re_execute).toBe(false);
    expect(decision.duplicate).toBe(true);
  });

  it("refuses reconciliation without evidence or to unknown", () => {
    const record = buildIdempotencyRecordV1(IDEM, ATTEMPT_1, "UNKNOWN");
    expect(record).not.toBeNull();
    if (record === null) {
      return;
    }
    expect(reconcileUnknownV1(record, "SUCCEEDED", "").reconciled).toBe(false);
    expect(
      reconcileUnknownV1(record, "UNKNOWN", "evidence:1").reconciled,
    ).toBe(false);
    const settled = buildIdempotencyRecordV1(IDEM, ATTEMPT_1, "SUCCEEDED");
    expect(settled).not.toBeNull();
    if (settled === null) {
      return;
    }
    expect(
      reconcileUnknownV1(settled, "FAILED", "evidence:1").reconciled,
    ).toBe(false);
  });

  it("rejects invalid retry attempts", () => {
    const record = buildIdempotencyRecordV1(IDEM, ATTEMPT_1, "FAILED");
    expect(record).not.toBeNull();
    if (record === null) {
      return;
    }
    const decision = requestRetryV1(record, "bad");
    expect(decision.permitted).toBe(false);
    const allowed = requestRetryV1(record, ATTEMPT_2);
    expect(allowed.permitted).toBe(true);
    expect(allowed.re_execute).toBe(true);
  });

  it("keeps decisions deterministic", () => {
    const record = buildIdempotencyRecordV1(IDEM, ATTEMPT_1, "UNKNOWN");
    expect(record).not.toBeNull();
    if (record === null) {
      return;
    }
    expect(requestRetryV1(record, ATTEMPT_2)).toEqual(
      requestRetryV1(record, ATTEMPT_2),
    );
  });
});
