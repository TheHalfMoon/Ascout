import { describe, expect, it } from "vitest";

import {
  evaluateProCheckpointsV1,
  parseProIncidentV1,
  planProRunV1,
  recommendProRecoveryV1,
  summarizeProPlanV1,
  verifyFinalGoalV1,
} from "../src/assurance/engines/mobile-artemis/pro.js";

const TAP = { kind: "TAP", args: { x: 10, y: 20 } };

function plannerOutput() {
  return {
    plan_id: "plan:pro-1",
    goal: "Open the app and observe the home screen",
    steps: [
      { step_id: "s1", role: "OPERATOR", action: TAP, checkpoint_after: false },
      { step_id: "s2", role: "CHECKER", action: TAP, checkpoint_after: true },
    ],
  };
}

describe("ARTEMIS-A7 planner output as evidence input", () => {
  it("validates planner JSON into typed plans and refuses the rest", () => {
    const planned = planProRunV1(plannerOutput(), 10);
    expect(planned.ok).toBe(true);
    if (planned.ok) {
      expect(planned.value.plan_id).toBe("plan:pro-1");
      expect(planned.value.steps).toHaveLength(2);
    }
    expect(planProRunV1({ ...plannerOutput(), extra: 1 }, 10).ok).toBe(false);
    expect(
      planProRunV1(
        { ...plannerOutput(), steps: [{ step_id: "s1", role: "ORACLE", action: TAP, checkpoint_after: false }] },
        10,
      ).ok,
    ).toBe(false);
    expect(
      planProRunV1(
        { ...plannerOutput(), steps: [{ step_id: "s1", role: "OPERATOR", action: { kind: "FLY", args: {} }, checkpoint_after: false }] },
        10,
      ).ok,
    ).toBe(false);
    expect(planProRunV1(plannerOutput(), 1).ok).toBe(false);
    expect(planProRunV1(null, 10).ok).toBe(false);
    expect(
      planProRunV1(
        {
          ...plannerOutput(),
          steps: [
            { step_id: "s1", role: "OPERATOR", action: TAP, checkpoint_after: false },
            { step_id: "s1", role: "OPERATOR", action: TAP, checkpoint_after: false },
          ],
        },
        10,
      ).ok,
    ).toBe(false);
  });
});

describe("ARTEMIS-A7 checkpoints and final-goal verification", () => {
  it("evaluates checkpoint states and verifies only complete goals", () => {
    const planned = planProRunV1(plannerOutput(), 10);
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;

    const pending = evaluateProCheckpointsV1(planned.value, []);
    expect(pending.overall).toBe("PENDING");
    expect(verifyFinalGoalV1(planned.value, pending)).toEqual({
      verdict: "UNVERIFIED",
      reason: "checkpoints pending",
    });

    const satisfied = evaluateProCheckpointsV1(planned.value, [
      { step_id: "s2", satisfied: true },
    ]);
    expect(satisfied.overall).toBe("ALL_SATISFIED");
    expect(verifyFinalGoalV1(planned.value, satisfied)).toEqual({
      verdict: "VERIFIED",
    });

    const violated = evaluateProCheckpointsV1(planned.value, [
      { step_id: "s2", satisfied: false },
    ]);
    expect(violated.overall).toBe("REQUIRED_VIOLATED");
    expect(verifyFinalGoalV1(planned.value, violated)).toEqual({
      verdict: "UNVERIFIED",
      reason: "required checkpoint violated",
    });

    const noCheckpoints = planProRunV1(
      {
        plan_id: "plan:pro-2",
        goal: "Observe only",
        steps: [{ step_id: "s1", role: "OPERATOR", action: TAP, checkpoint_after: false }],
      },
      10,
    );
    expect(noCheckpoints.ok).toBe(true);
    if (noCheckpoints.ok) {
      const evaluation = evaluateProCheckpointsV1(noCheckpoints.value, []);
      expect(verifyFinalGoalV1(noCheckpoints.value, evaluation)).toEqual({
        verdict: "UNVERIFIED",
        reason: "plan declares no checkpoint",
      });
    }
  });
});

describe("ARTEMIS-A7 bounded incident recovery", () => {
  it("retries boundedly, skips to checkpoints, and aborts on exhaustion", () => {
    expect(
      recommendProRecoveryV1({ incident_id: "in:1", kind: "ACTION_FAILED", step_id: "s1", attempts_used: 0 }),
    ).toEqual({ decision: "RETRY_STEP" });
    expect(
      recommendProRecoveryV1({ incident_id: "in:1", kind: "ACTION_FAILED", step_id: "s1", attempts_used: 3 }),
    ).toEqual({ decision: "ABORT_RUN", reason: "recovery attempts exhausted" });
    expect(
      recommendProRecoveryV1({ incident_id: "in:2", kind: "CHECKPOINT_VIOLATED", step_id: "s2", attempts_used: 0 }),
    ).toEqual({ decision: "SKIP_TO_CHECKPOINT" });
    expect(
      recommendProRecoveryV1({ incident_id: "in:3", kind: "BUDGET_EXHAUSTED", step_id: "s1", attempts_used: 0 }),
    ).toEqual({ decision: "ABORT_RUN", reason: "budget exhausted" });
    expect(
      recommendProRecoveryV1({ incident_id: "in:4", kind: "PROTOCOL_STALE", step_id: "s1", attempts_used: 0 }),
    ).toEqual({ decision: "ABORT_RUN", reason: "protocol stale" });
    expect(
      recommendProRecoveryV1({ incident_id: "in:5", kind: "MYSTERY", step_id: "s1", attempts_used: 0 }),
    ).toEqual({
      decision: "ABORT_RUN",
      reason: "incident kind must be ACTION_FAILED, CHECKPOINT_VIOLATED, BUDGET_EXHAUSTED, or PROTOCOL_STALE",
    });
  });

  it("validates incidents with exact keys before deciding", () => {
    const parsed = parseProIncidentV1({ incident_id: "in:1", kind: "ACTION_FAILED", step_id: "s1", attempts_used: 0 });
    expect(parsed.ok).toBe(true);
    expect(parseProIncidentV1({ incident_id: "in:1", kind: "ACTION_FAILED", step_id: "s1" }).ok).toBe(false);
    expect(parseProIncidentV1(null).ok).toBe(false);
    expect(
      recommendProRecoveryV1({ incident_id: "in:1", kind: "ACTION_FAILED", step_id: "s1", attempts_used: 0, extra: 1 }),
    ).toEqual({
      decision: "ABORT_RUN",
      reason: "incident must contain exactly incident_id, kind, step_id, attempts_used",
    });
  });
});

describe("ARTEMIS-A7 living-plan evidence mapping", () => {
  it("summarizes plans into frozen evidence", () => {
    const planned = planProRunV1(plannerOutput(), 10);
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    const summary = summarizeProPlanV1(planned.value);
    expect(summary).toEqual({
      plan_id: "plan:pro-1",
      goal: "Open the app and observe the home screen",
      step_count: 2,
      checkpoint_count: 1,
      roles_used: ["OPERATOR", "CHECKER"],
    });
    expect(Object.isFrozen(summary)).toBe(true);
  });
});
