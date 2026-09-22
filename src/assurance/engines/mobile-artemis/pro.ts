import {
  parseMobileActionV1,
  type MobileActionArgsV1,
} from "./actions.js";

export const PRO_ROLES = ["PLANNER", "OPERATOR", "CHECKER"] as const;

export type ProRole = (typeof PRO_ROLES)[number];

export const PRO_PLAN_MAX_STEPS = 128 as const;
export const PRO_RECOVERY_MAX_ATTEMPTS = 3 as const;

export interface ProPlanStepV1 {
  readonly step_id: string;
  readonly role: ProRole;
  readonly action: MobileActionArgsV1;
  readonly checkpoint_after: boolean;
}

export interface ProPlanV1 {
  readonly plan_id: string;
  readonly goal: string;
  readonly steps: readonly ProPlanStepV1[];
}

export type ProPlanResult =
  | { readonly ok: true; readonly value: ProPlanV1 }
  | { readonly ok: false; readonly reason: string };

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be an opaque id");
  }
  return value;
}

function requireGoal(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 2048) {
    throw new TypeError("goal must be 1..2048 chars");
  }
  return value;
}

export function planProRunV1(plannerOutput: unknown, maxSteps: number): ProPlanResult {
  try {
    if (
      typeof plannerOutput !== "object" ||
      plannerOutput === null ||
      Array.isArray(plannerOutput)
    ) {
      throw new TypeError("planner output must be an object");
    }
    const record = plannerOutput as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (keys.length !== 3 || keys[0] !== "goal" || keys[1] !== "plan_id" || keys[2] !== "steps") {
      throw new TypeError("planner output must contain exactly plan_id, goal, steps");
    }
    if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 1000000) {
      throw new TypeError("maxSteps must be a bounded positive integer");
    }
    const plan_id = requireOpaqueId(record["plan_id"], "plan_id");
    const goal = requireGoal(record["goal"]);
    if (!Array.isArray(record["steps"])) throw new TypeError("steps must be an array");
    const rawSteps = record["steps"] as unknown[];
    if (rawSteps.length === 0) throw new TypeError("plan must not be empty");
    if (rawSteps.length > PRO_PLAN_MAX_STEPS) {
      throw new TypeError("plan exceeds 128 steps");
    }
    if (rawSteps.length > maxSteps) {
      throw new TypeError("plan exceeds the admitted step budget");
    }
    const steps: ProPlanStepV1[] = [];
    const seen = new Set<string>();
    for (const raw of rawSteps) {
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        throw new TypeError("plan step must be an object");
      }
      const step = raw as Record<string, unknown>;
      const stepKeys = Object.keys(step).sort();
      if (
        stepKeys.length !== 4 ||
        stepKeys[0] !== "action" ||
        stepKeys[1] !== "checkpoint_after" ||
        stepKeys[2] !== "role" ||
        stepKeys[3] !== "step_id"
      ) {
        throw new TypeError("plan step must contain exactly step_id, role, action, checkpoint_after");
      }
      const step_id = requireOpaqueId(step["step_id"], "step_id");
      if (seen.has(step_id)) throw new TypeError("duplicate step_id");
      seen.add(step_id);
      if (typeof step["role"] !== "string" || !(PRO_ROLES as readonly string[]).includes(step["role"])) {
        throw new TypeError("plan step role must be PLANNER, OPERATOR, or CHECKER");
      }
      if (typeof step["checkpoint_after"] !== "boolean") {
        throw new TypeError("checkpoint_after must be boolean");
      }
      const action = parseMobileActionV1(step["action"]);
      if (!action.ok) throw new TypeError("plan step action rejected: " + action.reason);
      steps.push({
        step_id,
        role: step["role"] as ProRole,
        action: action.value,
        checkpoint_after: step["checkpoint_after"] as boolean,
      });
    }
    return { ok: true, value: { plan_id, goal, steps } };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "pro plan refused",
    };
  }
}

export type ProCheckpointStatus = "PENDING" | "SATISFIED" | "VIOLATED";

export interface ProCheckpointResultV1 {
  readonly step_id: string;
  readonly status: ProCheckpointStatus;
  readonly required: boolean;
}

export interface ProCheckpointEvaluationV1 {
  readonly checkpoints: readonly ProCheckpointResultV1[];
  readonly overall: "ALL_SATISFIED" | "REQUIRED_VIOLATED" | "PENDING";
}

export function evaluateProCheckpointsV1(
  plan: ProPlanV1,
  observations: readonly { readonly step_id: string; readonly satisfied: boolean }[],
): ProCheckpointEvaluationV1 {
  const observed = new Map<string, boolean>();
  for (const observation of observations) {
    if (typeof observation.step_id === "string" && typeof observation.satisfied === "boolean") {
      observed.set(observation.step_id, observation.satisfied);
    }
  }
  const checkpoints: ProCheckpointResultV1[] = [];
  let overall: ProCheckpointEvaluationV1["overall"] = "ALL_SATISFIED";
  for (const step of plan.steps) {
    if (!step.checkpoint_after) continue;
    const seen = observed.get(step.step_id);
    const status: ProCheckpointStatus =
      seen === undefined ? "PENDING" : seen ? "SATISFIED" : "VIOLATED";
    const required = step.role !== "PLANNER";
    checkpoints.push({ step_id: step.step_id, status, required });
    if (status === "PENDING" && overall === "ALL_SATISFIED") overall = "PENDING";
    if (status === "VIOLATED" && required) overall = "REQUIRED_VIOLATED";
  }
  return { checkpoints, overall };
}

export type FinalGoalVerdict =
  | { readonly verdict: "VERIFIED" }
  | { readonly verdict: "UNVERIFIED"; readonly reason: string };

export function verifyFinalGoalV1(
  plan: ProPlanV1,
  evaluation: ProCheckpointEvaluationV1,
): FinalGoalVerdict {
  if (evaluation.overall === "REQUIRED_VIOLATED") {
    return { verdict: "UNVERIFIED", reason: "required checkpoint violated" };
  }
  if (evaluation.overall === "PENDING") {
    return { verdict: "UNVERIFIED", reason: "checkpoints pending" };
  }
  const goalSteps = plan.steps.filter((step) => step.checkpoint_after);
  if (goalSteps.length === 0) {
    return { verdict: "UNVERIFIED", reason: "plan declares no checkpoint" };
  }
  return { verdict: "VERIFIED" };
}

export type ProIncidentKind =
  | "ACTION_FAILED"
  | "CHECKPOINT_VIOLATED"
  | "BUDGET_EXHAUSTED"
  | "PROTOCOL_STALE";

export interface ProIncidentV1 {
  readonly incident_id: string;
  readonly kind: ProIncidentKind;
  readonly step_id: string;
  readonly attempts_used: number;
}

export type ProRecovery =
  | { readonly decision: "RETRY_STEP" }
  | { readonly decision: "SKIP_TO_CHECKPOINT" }
  | { readonly decision: "ABORT_RUN"; readonly reason: string };

const INCIDENT_KINDS: readonly string[] = [
  "ACTION_FAILED",
  "CHECKPOINT_VIOLATED",
  "BUDGET_EXHAUSTED",
  "PROTOCOL_STALE",
];

export function recommendProRecoveryV1(incident: {
  readonly incident_id: unknown;
  readonly kind: unknown;
  readonly step_id: unknown;
  readonly attempts_used: unknown;
}): ProRecovery {
  if (typeof incident.incident_id !== "string" || !OPAQUE_ID.test(incident.incident_id)) {
    return { decision: "ABORT_RUN", reason: "incident identity invalid" };
  }
  if (typeof incident.kind !== "string" || !INCIDENT_KINDS.includes(incident.kind)) {
    return { decision: "ABORT_RUN", reason: "incident kind unknown" };
  }
  if (typeof incident.step_id !== "string" || !OPAQUE_ID.test(incident.step_id)) {
    return { decision: "ABORT_RUN", reason: "incident step invalid" };
  }
  if (
    typeof incident.attempts_used !== "number" ||
    !Number.isInteger(incident.attempts_used) ||
    incident.attempts_used < 0
  ) {
    return { decision: "ABORT_RUN", reason: "attempt count invalid" };
  }
  if (incident.kind === "BUDGET_EXHAUSTED" || incident.kind === "PROTOCOL_STALE") {
    return {
      decision: "ABORT_RUN",
      reason: incident.kind === "BUDGET_EXHAUSTED" ? "budget exhausted" : "protocol stale",
    };
  }
  if (incident.attempts_used >= PRO_RECOVERY_MAX_ATTEMPTS) {
    return { decision: "ABORT_RUN", reason: "recovery attempts exhausted" };
  }
  if (incident.kind === "CHECKPOINT_VIOLATED") {
    return { decision: "SKIP_TO_CHECKPOINT" };
  }
  return { decision: "RETRY_STEP" };
}

export interface ProPlanSummaryV1 {
  readonly plan_id: string;
  readonly goal: string;
  readonly step_count: number;
  readonly checkpoint_count: number;
  readonly roles_used: readonly ProRole[];
}

export function summarizeProPlanV1(plan: ProPlanV1): ProPlanSummaryV1 {
  const roles: ProRole[] = [];
  for (const role of PRO_ROLES) {
    if (plan.steps.some((step) => step.role === role)) roles.push(role);
  }
  return Object.freeze({
    plan_id: plan.plan_id,
    goal: plan.goal,
    step_count: plan.steps.length,
    checkpoint_count: plan.steps.filter((step) => step.checkpoint_after).length,
    roles_used: roles,
  });
}
