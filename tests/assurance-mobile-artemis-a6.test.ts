import { describe, expect, it } from "vitest";

import { canonicalAssuranceSha256V1 } from "../src/assurance/contracts/canonical-serialization.js";
import {
  admitFlashRunV1,
  advanceFlashStepV1,
  buildFlashReplayPlanV1,
  cancelFlashRunV1,
  compressFlashHistoryV1,
  finishFlashRunV1,
  FLASH_DEFAULT_CEILINGS,
  isFlashTerminalV1,
  startFlashRunV1,
  type FlashRunStateV1,
} from "../src/assurance/engines/mobile-artemis/flash.js";

function admittedRun() {
  const admitted = admitFlashRunV1("run:flash-1", { ...FLASH_DEFAULT_CEILINGS }, FLASH_DEFAULT_CEILINGS);
  expect(admitted.ok).toBe(true);
  if (!admitted.ok) throw new Error("fixture refused");
  const started = startFlashRunV1(admitted.value);
  expect(started.ok).toBe(true);
  if (!started.ok) throw new Error("fixture refused");
  return started.value;
}

describe("ARTEMIS-A6 ceiling admission", () => {
  it("admits requests within admission and refuses the rest", () => {
    expect(
      admitFlashRunV1("run:flash-1", { ...FLASH_DEFAULT_CEILINGS }, FLASH_DEFAULT_CEILINGS).ok,
    ).toBe(true);
    const over = admitFlashRunV1(
      "run:flash-2",
      { ...FLASH_DEFAULT_CEILINGS, max_steps: 26 },
      FLASH_DEFAULT_CEILINGS,
    );
    expect(over.ok).toBe(false);
    expect(
      admitFlashRunV1("run:flash-3", { ...FLASH_DEFAULT_CEILINGS, max_steps: 0 }, FLASH_DEFAULT_CEILINGS).ok,
    ).toBe(false);
    expect(
      admitFlashRunV1("run:flash-4", { ...FLASH_DEFAULT_CEILINGS, max_steps: 201 }, FLASH_DEFAULT_CEILINGS).ok,
    ).toBe(false);
    expect(
      admitFlashRunV1("not an id!!!", { ...FLASH_DEFAULT_CEILINGS }, FLASH_DEFAULT_CEILINGS).ok,
    ).toBe(false);
  });

  it("starts once and rejects double starts", () => {
    const admitted = admitFlashRunV1("run:flash-1", { ...FLASH_DEFAULT_CEILINGS }, FLASH_DEFAULT_CEILINGS);
    expect(admitted.ok).toBe(true);
    if (!admitted.ok) return;
    expect(startFlashRunV1(admitted.value).ok).toBe(true);
    const started = startFlashRunV1(admitted.value);
    expect(started.ok).toBe(true);
    if (started.ok) {
      expect(startFlashRunV1(started.value).ok).toBe(false);
    }
  });
});

describe("ARTEMIS-A6 bounded stepping", () => {
  it("exhausts steps, time, tokens, and artifacts deterministically", () => {
    let state: FlashRunStateV1 = admittedRun();
    for (let index = 0; index < 25; index += 1) {
      const next = advanceFlashStepV1(state, { tokens: 10, artifacts: 0, elapsed_ms: 100 });
      expect(next.ok).toBe(true);
      if (next.ok) state = next.value;
    }
    expect(state.status).toBe("RUNNING");
    expect(state.step_count).toBe(25);
    const exhausted = advanceFlashStepV1(state, { tokens: 10, artifacts: 0, elapsed_ms: 100 });
    expect(exhausted.ok).toBe(true);
    if (exhausted.ok) expect(exhausted.value.status).toBe("EXHAUSTED_STEPS");

    const timed = advanceFlashStepV1(admittedRun(), { tokens: 0, artifacts: 0, elapsed_ms: 300001 });
    expect(timed.ok).toBe(true);
    if (timed.ok) expect(timed.value.status).toBe("EXHAUSTED_TIME");

    const tokened = advanceFlashStepV1(admittedRun(), { tokens: 32001, artifacts: 0, elapsed_ms: 0 });
    expect(tokened.ok).toBe(true);
    if (tokened.ok) expect(tokened.value.status).toBe("EXHAUSTED_TOKENS");

    const artifacted = advanceFlashStepV1(admittedRun(), { tokens: 0, artifacts: 17, elapsed_ms: 0 });
    expect(artifacted.ok).toBe(true);
    if (artifacted.ok) expect(artifacted.value.status).toBe("EXHAUSTED_ARTIFACTS");

    expect(advanceFlashStepV1(admittedRun(), { tokens: -1, artifacts: 0, elapsed_ms: 0 }).ok).toBe(false);
  });

  it("finishes, cancels, and freezes terminals", () => {
    const done = finishFlashRunV1(admittedRun(), "COMPLETED");
    expect(done.ok).toBe(true);
    if (done.ok) {
      expect(done.value.status).toBe("COMPLETED");
      expect(isFlashTerminalV1(done.value.status)).toBe(true);
      expect(advanceFlashStepV1(done.value, { tokens: 0, artifacts: 0, elapsed_ms: 0 }).ok).toBe(false);
      expect(cancelFlashRunV1(done.value, "late").ok).toBe(false);
    }
    const cancelled = cancelFlashRunV1(admittedRun(), "operator stop");
    expect(cancelled.ok).toBe(true);
    if (cancelled.ok) {
      expect(cancelled.value.status).toBe("CANCELLED");
      expect(cancelled.value.cancel_reason).toBe("operator stop");
    }
    expect(cancelFlashRunV1(admittedRun(), "").ok).toBe(false);
    expect(isFlashTerminalV1("RUNNING")).toBe(false);
    expect(isFlashTerminalV1("READY")).toBe(false);
  });
});

describe("ARTEMIS-A6 history compression and replay", () => {
  it("keeps the tail and digests the dropped prefix", () => {
    const entries = Array.from({ length: 10 }, (_, index) => ({
      step: index,
      kind: "observe",
      summary: "step " + index,
    }));
    const compressed = compressFlashHistoryV1(entries, 3);
    expect(compressed.ok).toBe(true);
    if (!compressed.ok) return;
    expect(compressed.value.kept.map((entry) => entry.step)).toEqual([7, 8, 9]);
    expect(compressed.value.compressed_entries).toBe(7);
    expect(compressed.value.compressed_digest).toBe(
      canonicalAssuranceSha256V1(entries.slice(0, 7)),
    );

    const untouched = compressFlashHistoryV1(entries, 10);
    expect(untouched.ok).toBe(true);
    if (untouched.ok) {
      expect(untouched.value.compressed_entries).toBe(0);
      expect(untouched.value.compressed_digest).toBe("");
    }
    expect(compressFlashHistoryV1([{ wrong: 1 }], 3).ok).toBe(false);
  });

  it("builds replay plans over recorded ranges only", () => {
    const entries = [
      { step: 0, kind: "observe", summary: "s0" },
      { step: 1, kind: "act", summary: "s1" },
      { step: 2, kind: "observe", summary: "s2" },
    ];
    const plan = buildFlashReplayPlanV1("run:flash-1", entries, 1);
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.value.replay_id).toBe("run:flash-1:replay:1");
      expect(plan.value.steps.map((entry) => entry.step)).toEqual([1, 2]);
    }
    expect(buildFlashReplayPlanV1("run:flash-1", entries, 9).ok).toBe(false);
    expect(buildFlashReplayPlanV1("run:flash-1", entries, -1).ok).toBe(false);
  });
});
