import { describe, expect, it } from "vitest";

type OwnerProbe =
  | { readonly state: "alive"; readonly pid: number }
  | { readonly state: "dead"; readonly pid: number }
  | { readonly state: "unknown"; readonly pid: number; readonly reason: string }
  | { readonly state: "error"; readonly pid: number; readonly reason: string };

type LockDecision =
  | {
      readonly action: "acquire";
      readonly reason: "no_existing_lock";
      readonly remove_existing_lock: false;
    }
  | {
      readonly action: "refuse";
      readonly reason:
        | "live_owner"
        | "owner_state_unverified"
        | "probe_owner_mismatch";
      readonly remove_existing_lock: false;
    }
  | {
      readonly action: "recover_then_acquire";
      readonly reason: "verified_dead_owner";
      readonly remove_existing_lock: true;
    };

interface LockSnapshot {
  readonly owner_pid: number;
}

function validPid(pid: number): boolean {
  return Number.isSafeInteger(pid) && pid > 0;
}

function decideRunLock(
  lock: LockSnapshot | null,
  probe: OwnerProbe | null,
): LockDecision {
  if (lock === null) {
    return {
      action: "acquire",
      reason: "no_existing_lock",
      remove_existing_lock: false,
    };
  }

  if (!validPid(lock.owner_pid)) {
    return {
      action: "refuse",
      reason: "owner_state_unverified",
      remove_existing_lock: false,
    };
  }

  if (probe === null || !validPid(probe.pid)) {
    return {
      action: "refuse",
      reason: "owner_state_unverified",
      remove_existing_lock: false,
    };
  }

  if (probe.pid !== lock.owner_pid) {
    return {
      action: "refuse",
      reason: "probe_owner_mismatch",
      remove_existing_lock: false,
    };
  }

  if (probe.state === "alive") {
    return {
      action: "refuse",
      reason: "live_owner",
      remove_existing_lock: false,
    };
  }

  if (probe.state === "dead") {
    return {
      action: "recover_then_acquire",
      reason: "verified_dead_owner",
      remove_existing_lock: true,
    };
  }

  return {
    action: "refuse",
    reason: "owner_state_unverified",
    remove_existing_lock: false,
  };
}

function expectNoRecovery(decision: LockDecision): void {
  expect(decision.remove_existing_lock).toBe(false);
  expect(decision.action).not.toBe("recover_then_acquire");
}

describe("T014 run-lock contract", () => {
  it("acquires when no run lock exists", () => {
    expect(decideRunLock(null, null)).toEqual({
      action: "acquire",
      reason: "no_existing_lock",
      remove_existing_lock: false,
    });
  });

  it("refuses a concurrent check when the observed lock owner is alive", () => {
    const decision = decideRunLock(
      { owner_pid: 4242 },
      { state: "alive", pid: 4242 },
    );

    expect(decision).toEqual({
      action: "refuse",
      reason: "live_owner",
      remove_existing_lock: false,
    });
    expectNoRecovery(decision);
  });

  it("recovers only after the exact observed owner is verified dead", () => {
    const decision = decideRunLock(
      { owner_pid: 4242 },
      { state: "dead", pid: 4242 },
    );

    expect(decision).toEqual({
      action: "recover_then_acquire",
      reason: "verified_dead_owner",
      remove_existing_lock: true,
    });
  });

  it("does not treat unknown owner state as dead-owner proof", () => {
    const decision = decideRunLock(
      { owner_pid: 4242 },
      { state: "unknown", pid: 4242, reason: "platform probe inconclusive" },
    );

    expect(decision).toEqual({
      action: "refuse",
      reason: "owner_state_unverified",
      remove_existing_lock: false,
    });
    expectNoRecovery(decision);
  });

  it("fails closed when owner liveness probing errors", () => {
    const decision = decideRunLock(
      { owner_pid: 4242 },
      { state: "error", pid: 4242, reason: "permission denied" },
    );

    expect(decision).toEqual({
      action: "refuse",
      reason: "owner_state_unverified",
      remove_existing_lock: false,
    });
    expectNoRecovery(decision);
  });

  it("rejects dead-owner evidence for a different PID", () => {
    const decision = decideRunLock(
      { owner_pid: 4242 },
      { state: "dead", pid: 5151 },
    );

    expect(decision).toEqual({
      action: "refuse",
      reason: "probe_owner_mismatch",
      remove_existing_lock: false,
    });
    expectNoRecovery(decision);
  });

  it("does not recover from missing or invalid owner evidence", () => {
    const missingProbe = decideRunLock({ owner_pid: 4242 }, null);
    const invalidLockPid = decideRunLock(
      { owner_pid: 0 },
      { state: "dead", pid: 0 },
    );
    const invalidProbePid = decideRunLock(
      { owner_pid: 4242 },
      { state: "dead", pid: -1 },
    );

    for (const decision of [missingProbe, invalidLockPid, invalidProbePid]) {
      expect(decision).toEqual({
        action: "refuse",
        reason: "owner_state_unverified",
        remove_existing_lock: false,
      });
      expectNoRecovery(decision);
    }
  });

  it("makes verified-dead the only state that permits stale-lock removal", () => {
    const lock = { owner_pid: 7777 } as const;
    const probes: readonly OwnerProbe[] = [
      { state: "alive", pid: 7777 },
      { state: "dead", pid: 7777 },
      { state: "unknown", pid: 7777, reason: "inconclusive" },
      { state: "error", pid: 7777, reason: "probe failed" },
    ];

    const decisions = probes.map((probe) => decideRunLock(lock, probe));
    const recoveryDecisions = decisions.filter((decision) => decision.remove_existing_lock);

    expect(recoveryDecisions).toEqual([
      {
        action: "recover_then_acquire",
        reason: "verified_dead_owner",
        remove_existing_lock: true,
      },
    ]);
  });
});
