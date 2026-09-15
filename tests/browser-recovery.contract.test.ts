import { describe, expect, it } from "vitest";
import {
  appendRecoveryAttempt,
  createRecoveryAttempt,
  createRecoveryBudget,
  createRecoveryHistory,
  evaluateRecoveryVerdict,
  measureRecoveryHistoryErasure,
  RECOVERY_BINDING_MISMATCH,
  RECOVERY_BUDGET_EXHAUSTED,
  RECOVERY_HISTORY_ERASURE,
  RECOVERY_HISTORY_GAP,
  RECOVERY_SEMANTIC_BLOCKED,
  recoveryAttemptFromJson,
  recoveryAttemptToJson,
  recoveryBudgetRemaining,
  recoveryHistoryDigest,
  recoveryHistoryFromJson,
  recoveryHistoryToJson,
  verifyRecoveryHistoryIntact,
} from "../src/browser/recovery.js";
import type { RecoveryHistory } from "../src/browser/recovery.js";

const SESSION = "session-p1607";
const SOURCE = "source-p1607";
const BUDGET = "budget-p1607";

function budget(max_attempts = 3) {
  return createRecoveryBudget({
    budget_id: BUDGET,
    max_attempts,
    session_id: SESSION,
    source_identity: SOURCE,
  });
}

function history(max_attempts = 3): RecoveryHistory {
  return createRecoveryHistory({
    budget: budget(max_attempts),
    history_id: "history-p1607",
    session_id: SESSION,
    source_identity: SOURCE,
  });
}

function attempt(overrides: {
  readonly attempt_index?: number;
  readonly recovery_id?: string;
  readonly recovery_class?: string;
  readonly outcome?: string;
  readonly obligation_ref?: string | null;
  readonly budget_id?: string;
  readonly session_id?: string;
  readonly source_identity?: string;
} = {}) {
  return createRecoveryAttempt({
    attempt_index: overrides.attempt_index ?? 0,
    budget_id: overrides.budget_id ?? BUDGET,
    corrective_action: "re-resolve checkout button by accessible name",
    evidence_refs: ["ev-attempt-0"],
    obligation_ref: overrides.obligation_ref ?? null,
    outcome: overrides.outcome ?? "recovered",
    recovery_class: overrides.recovery_class ?? "resolver_recovery",
    recovery_id: overrides.recovery_id ?? "rec-0",
    session_id: overrides.session_id ?? SESSION,
    source_identity: overrides.source_identity ?? SOURCE,
    trigger_attempt_index: 2,
    trigger_error_code: "E_LOCATOR_AMBIGUOUS",
    trigger_error_message: "two buttons named Place order",
  });
}

describe("spec016 p016-07 recovery semantics", () => {
  it("validates retry budgets as positive integers", () => {
    expect(budget(2).max_attempts).toBe(2);
    expect(() => budget(0)).toThrow(TypeError);
    expect(() => budget(-1)).toThrow(TypeError);
    expect(() => budget(1.5)).toThrow(TypeError);
    expect(() =>
      createRecoveryBudget({
        budget_id: "",
        max_attempts: 1,
        session_id: SESSION,
        source_identity: SOURCE,
      }),
    ).toThrow(TypeError);
  });

  it("binds histories to one session, source, and budget", () => {
    const owned = history();
    expect(owned.attempts).toHaveLength(0);
    expect(recoveryBudgetRemaining(owned)).toBe(3);
    const foreign = createRecoveryBudget({
      budget_id: "other-budget",
      max_attempts: 1,
      session_id: "other-session",
      source_identity: SOURCE,
    });
    expect(() =>
      createRecoveryHistory({
        budget: foreign,
        history_id: "history-x",
        session_id: SESSION,
        source_identity: SOURCE,
      }),
    ).toThrow(RECOVERY_BINDING_MISMATCH);
  });

  it("requires the original failure trigger on every attempt", () => {
    expect(attempt().trigger_error_code).toBe("E_LOCATOR_AMBIGUOUS");
    expect(() =>
      createRecoveryAttempt({
        ...attempt(),
        attempt_index: 0,
        evidence_refs: [],
        obligation_ref: null,
        trigger_error_code: "",
      }),
    ).toThrow(TypeError);
    expect(() =>
      createRecoveryAttempt({
        ...attempt(),
        attempt_index: 0,
        evidence_refs: [],
        obligation_ref: null,
        trigger_error_message: "",
      }),
    ).toThrow(TypeError);
    expect(() =>
      createRecoveryAttempt({
        ...attempt(),
        attempt_index: 0,
        evidence_refs: [],
        obligation_ref: null,
        trigger_attempt_index: -1,
      }),
    ).toThrow(TypeError);
    expect(() =>
      createRecoveryAttempt({
        ...attempt(),
        attempt_index: 0,
        corrective_action: "",
        evidence_refs: [],
        obligation_ref: null,
      }),
    ).toThrow(TypeError);
  });

  it("rejects unknown classes and outcomes", () => {
    expect(() => attempt({ recovery_class: "ai_heal" })).toThrow(TypeError);
    expect(() => attempt({ outcome: "healed" })).toThrow(TypeError);
  });

  it("requires obligation refs exactly for semantic recovery", () => {
    const semantic = attempt({
      obligation_ref: "obligation-checkout-flow",
      recovery_class: "semantic_recovery",
      recovery_id: "rec-sem",
    });
    expect(semantic.obligation_ref).toBe("obligation-checkout-flow");
    expect(() =>
      attempt({ recovery_class: "semantic_recovery", recovery_id: "rec-bad" }),
    ).toThrow(TypeError);
    expect(() =>
      attempt({
        obligation_ref: "obligation-x",
        recovery_class: "resolver_recovery",
        recovery_id: "rec-bad",
      }),
    ).toThrow(TypeError);
    expect(() =>
      attempt({
        obligation_ref: "obligation-x",
        recovery_class: "execution_recovery",
        recovery_id: "rec-bad",
      }),
    ).toThrow(TypeError);
  });

  it("appends in order and rejects gaps, reorder, and binding drift", () => {
    let owned = history();
    owned = appendRecoveryAttempt(owned, attempt({ attempt_index: 0 }));
    owned = appendRecoveryAttempt(
      owned,
      attempt({
        attempt_index: 1,
        recovery_class: "execution_recovery",
        recovery_id: "rec-1",
      }),
    );
    expect(owned.attempts).toHaveLength(2);
    expect(recoveryBudgetRemaining(owned)).toBe(1);
    expect(() =>
      appendRecoveryAttempt(owned, attempt({ attempt_index: 3 })),
    ).toThrow(RECOVERY_HISTORY_GAP);
    expect(() =>
      appendRecoveryAttempt(owned, attempt({ attempt_index: 1 })),
    ).toThrow(RECOVERY_HISTORY_GAP);
    expect(() =>
      appendRecoveryAttempt(
        owned,
        attempt({ attempt_index: 2, session_id: "other-session" }),
      ),
    ).toThrow(RECOVERY_BINDING_MISMATCH);
    expect(() =>
      appendRecoveryAttempt(
        owned,
        attempt({ attempt_index: 2, source_identity: "other-source" }),
      ),
    ).toThrow(RECOVERY_BINDING_MISMATCH);
    expect(() =>
      appendRecoveryAttempt(
        owned,
        attempt({ attempt_index: 2, budget_id: "other-budget" }),
      ),
    ).toThrow(RECOVERY_BINDING_MISMATCH);
  });

  it("throws on budget exhaustion instead of extending the budget", () => {
    let owned = history(1);
    owned = appendRecoveryAttempt(owned, attempt({ attempt_index: 0 }));
    expect(recoveryBudgetRemaining(owned)).toBe(0);
    expect(() =>
      appendRecoveryAttempt(
        owned,
        attempt({ attempt_index: 1, recovery_id: "rec-extra" }),
      ),
    ).toThrow(RECOVERY_BUDGET_EXHAUSTED);
  });

  it("measures zero erasure for intact histories only", () => {
    const empty = history();
    expect(measureRecoveryHistoryErasure(empty)).toBe(RECOVERY_HISTORY_ERASURE);
    expect(RECOVERY_HISTORY_ERASURE).toBe(0);
    expect(() => verifyRecoveryHistoryIntact(empty)).not.toThrow();
    let owned = history();
    owned = appendRecoveryAttempt(owned, attempt({ attempt_index: 0 }));
    owned = appendRecoveryAttempt(
      owned,
      attempt({ attempt_index: 1, recovery_id: "rec-1" }),
    );
    expect(measureRecoveryHistoryErasure(owned)).toBe(0);
    const gapped: RecoveryHistory = {
      ...owned,
      attempts: [
        owned.attempts[0]!,
        { ...owned.attempts[1]!, attempt_index: 7 },
      ],
    };
    expect(measureRecoveryHistoryErasure(gapped)).toBeGreaterThan(0);
    expect(() => verifyRecoveryHistoryIntact(gapped)).toThrow(
      RECOVERY_HISTORY_GAP,
    );
    const truncated: RecoveryHistory = {
      ...owned,
      attempts: [owned.attempts[1]!],
    };
    expect(measureRecoveryHistoryErasure(truncated)).toBeGreaterThan(0);
    expect(() => verifyRecoveryHistoryIntact(truncated)).toThrow(
      RECOVERY_HISTORY_GAP,
    );
  });

  it("yields clean only for empty histories", () => {
    const facts = evaluateRecoveryVerdict(history(), []);
    expect(facts.verdict).toBe("clean");
    expect(facts.attempt_count).toBe(0);
    expect(facts.blocking_reasons).toHaveLength(0);
    expect(facts.original_failures).toHaveLength(0);
  });

  it("yields pass_with_recovery for recovered histories, never clean", () => {
    let owned = history();
    owned = appendRecoveryAttempt(owned, attempt({ attempt_index: 0 }));
    const facts = evaluateRecoveryVerdict(owned, []);
    expect(facts.verdict).toBe("pass_with_recovery");
    expect(facts.attempt_count).toBe(1);
    expect(facts.recovered_count).toBe(1);
    expect(facts.failed_count).toBe(0);
    expect(facts.blocking_reasons).toHaveLength(0);
    expect(facts.original_failures).toEqual([
      {
        attempt_index: 0,
        recovery_class: "resolver_recovery",
        trigger_attempt_index: 2,
        trigger_error_code: "E_LOCATOR_AMBIGUOUS",
      },
    ]);
    expect(facts.history_digest).toBe(recoveryHistoryDigest(owned));
  });

  it("forces failed verdicts on failed outcomes", () => {
    let owned = history();
    owned = appendRecoveryAttempt(owned, attempt({ attempt_index: 0 }));
    owned = appendRecoveryAttempt(
      owned,
      attempt({
        attempt_index: 1,
        outcome: "failed",
        recovery_class: "execution_recovery",
        recovery_id: "rec-1",
      }),
    );
    const facts = evaluateRecoveryVerdict(owned, []);
    expect(facts.verdict).toBe("failed");
    expect(facts.failed_count).toBe(1);
    expect(
      facts.blocking_reasons.some((reason) =>
        reason.includes("E_LOCATOR_AMBIGUOUS"),
      ),
    ).toBe(true);
  });

  it("blocks ordinary PASS on semantic recovery until revalidated", () => {
    let owned = history();
    owned = appendRecoveryAttempt(
      owned,
      attempt({
        attempt_index: 0,
        obligation_ref: "obligation-checkout-flow",
        recovery_class: "semantic_recovery",
      }),
    );
    const blocked = evaluateRecoveryVerdict(owned, []);
    expect(blocked.verdict).toBe("blocked");
    expect(blocked.semantic_pending).toEqual(["obligation-checkout-flow"]);
    expect(
      blocked.blocking_reasons.some((reason) =>
        reason.includes(RECOVERY_SEMANTIC_BLOCKED),
      ),
    ).toBe(true);
    expect(blocked.recovered_count).toBe(1);
    const revalidated = evaluateRecoveryVerdict(owned, [
      "obligation-checkout-flow",
    ]);
    expect(revalidated.verdict).toBe("pass_with_recovery");
    expect(revalidated.semantic_pending).toHaveLength(0);
    expect(revalidated.blocking_reasons).toHaveLength(0);
    const wrongObligation = evaluateRecoveryVerdict(owned, ["obligation-other"]);
    expect(wrongObligation.verdict).toBe("blocked");
  });

  it("forces blocked verdicts on blocked outcomes", () => {
    let owned = history();
    owned = appendRecoveryAttempt(
      owned,
      attempt({
        attempt_index: 0,
        outcome: "blocked",
        recovery_class: "execution_recovery",
      }),
    );
    const facts = evaluateRecoveryVerdict(owned, []);
    expect(facts.verdict).toBe("blocked");
    expect(facts.blocked_count).toBe(1);
    expect(facts.blocking_reasons).toHaveLength(1);
  });

  it("rejects secrets in recovery text", () => {
    expect(() =>
      createRecoveryAttempt({
        ...attempt(),
        attempt_index: 0,
        corrective_action: "retry with ghp_abcdefghijklmnopqrstuvwxyz1234",
        evidence_refs: [],
        obligation_ref: null,
      }),
    ).toThrow(TypeError);
  });

  it("round-trips attempts and histories with strict revalidation", () => {
    const first = attempt({ attempt_index: 0 });
    const attemptJson = recoveryAttemptToJson(first);
    expect(recoveryAttemptFromJson(attemptJson)).toEqual(first);
    let owned = history();
    owned = appendRecoveryAttempt(owned, first);
    owned = appendRecoveryAttempt(
      owned,
      attempt({
        attempt_index: 1,
        obligation_ref: "obligation-checkout-flow",
        outcome: "blocked",
        recovery_class: "semantic_recovery",
        recovery_id: "rec-1",
      }),
    );
    const json = recoveryHistoryToJson(owned);
    const parsed = recoveryHistoryFromJson(json);
    expect(parsed).toEqual(owned);
    expect(recoveryHistoryDigest(parsed)).toBe(recoveryHistoryDigest(owned));
    expect(recoveryHistoryToJson(parsed)).toBe(json);
    expect(() => recoveryHistoryFromJson("not json")).toThrow(TypeError);
    expect(() => recoveryHistoryFromJson("[]")).toThrow(TypeError);
    expect(() => recoveryAttemptFromJson("{}")).toThrow(TypeError);
    const tampered = JSON.parse(json) as Record<string, unknown>;
    const entries = tampered.attempts as Record<string, unknown>[];
    entries[1]!.attempt_index = 9;
    expect(() =>
      recoveryHistoryFromJson(JSON.stringify(tampered)),
    ).toThrow(RECOVERY_HISTORY_GAP);
    const overBudget = JSON.parse(json) as Record<string, unknown>;
    (overBudget.budget as Record<string, unknown>).max_attempts = 1;
    expect(() =>
      recoveryHistoryFromJson(JSON.stringify(overBudget)),
    ).toThrow(RECOVERY_BUDGET_EXHAUSTED);
  });

  it("produces stable digests and deterministic verdicts", () => {
    const left = appendRecoveryAttempt(
      history(),
      attempt({ attempt_index: 0 }),
    );
    const right = appendRecoveryAttempt(
      history(),
      attempt({ attempt_index: 0 }),
    );
    expect(recoveryHistoryDigest(left)).toBe(recoveryHistoryDigest(right));
    expect(evaluateRecoveryVerdict(left, [])).toEqual(
      evaluateRecoveryVerdict(right, []),
    );
    expect(recoveryHistoryToJson(left)).toBe(recoveryHistoryToJson(right));
  });

  it("keeps recovery codes disjoint from locator codes", () => {
    for (const code of [
      RECOVERY_BUDGET_EXHAUSTED,
      RECOVERY_HISTORY_GAP,
      RECOVERY_SEMANTIC_BLOCKED,
      RECOVERY_BINDING_MISMATCH,
    ]) {
      expect(code.startsWith("E_RECOVERY_")).toBe(true);
      expect(code.startsWith("E_LOCATOR_")).toBe(false);
    }
  });
});
