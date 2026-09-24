import type { KodacRetryClassV1 } from "./kodac-capability-characterization.js";
import { assessFreshnessV1 } from "./freshness-engine.js";

export const STAGE_ATTEMPT_SCHEMA_VERSION = 1 as const;

export const STAGE_STATES = [
  "PENDING",
  "IN_PROGRESS",
  "BLOCKED",
  "SUCCEEDED",
  "FAILED",
  "INCOMPLETE",
] as const;

export type StageStateV1 = (typeof STAGE_STATES)[number];

export interface AttemptRecordV1 {
  readonly attempt_number: number;
  readonly attempt_identity: string;
  readonly idempotency_identity: string;
  readonly retry_class: KodacRetryClassV1;
  readonly state: StageStateV1;
  readonly detail: string;
}

export interface StageRecordV1 {
  readonly stage_key: string;
  readonly state: StageStateV1;
  readonly attempts: readonly AttemptRecordV1[];
}

export interface WorkflowRunV1 {
  readonly schema_version: 1;
  readonly run_identity: string;
  readonly subject_head: string;
  readonly policy_identity: string;
  readonly stages: readonly StageRecordV1[];
}

export interface ResumeDecisionV1 {
  readonly schema_version: 1;
  readonly run_identity: string;
  readonly preserved_incomplete: readonly string[];
  readonly preserved_terminal: readonly string[];
  readonly revalidation_required: boolean;
  readonly reasons: readonly string[];
}

const HEX64 = /^[a-f0-9]{64}$/u;
const SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;

function isTerminalState(state: StageStateV1): boolean {
  return state === "SUCCEEDED" || state === "FAILED";
}

function validateStageKey(stageKey: string): boolean {
  return stageKey.length > 0 && stageKey.length <= 1024;
}

export function buildWorkflowRunV1(
  runIdentity: string,
  subjectHead: string,
  policyIdentity: string,
  stageKeys: readonly string[],
): WorkflowRunV1 | null {
  if (!HEX64.test(runIdentity)) {
    return null;
  }
  if (!SHA.test(subjectHead)) {
    return null;
  }
  if (!HEX64.test(policyIdentity)) {
    return null;
  }
  const seen = new Set<string>();
  for (const key of stageKeys) {
    if (!validateStageKey(key) || seen.has(key)) {
      return null;
    }
    seen.add(key);
  }
  return {
    schema_version: STAGE_ATTEMPT_SCHEMA_VERSION,
    run_identity: runIdentity,
    subject_head: subjectHead,
    policy_identity: policyIdentity,
    stages: Object.freeze(
      stageKeys.map((stageKey) => ({
        stage_key: stageKey,
        state: "PENDING" as StageStateV1,
        attempts: Object.freeze([]) as readonly AttemptRecordV1[],
      })),
    ),
  };
}

export function resumeWorkflowRunV1(
  run: WorkflowRunV1,
  expectedHead: string,
  expectedPolicyIdentity: string,
): ResumeDecisionV1 {
  const base = {
    schema_version: STAGE_ATTEMPT_SCHEMA_VERSION,
    run_identity: run.run_identity,
  } as const;
  const freshness = assessFreshnessV1(
    run.run_identity,
    run.subject_head,
    expectedHead,
  );
  const policyChanged = run.policy_identity !== expectedPolicyIdentity;
  const preservedIncomplete: string[] = [];
  const preservedTerminal: string[] = [];
  for (const stage of run.stages) {
    if (isTerminalState(stage.state)) {
      preservedTerminal.push(stage.stage_key);
    } else {
      preservedIncomplete.push(stage.stage_key);
    }
  }
  if (freshness.state !== "CURRENT" || policyChanged) {
    const reasons: string[] = [];
    if (freshness.state !== "CURRENT") {
      reasons.push("subject head requires revalidation");
    }
    if (policyChanged) {
      reasons.push("policy identity requires revalidation");
    }
    return {
      ...base,
      preserved_incomplete: Object.freeze(preservedIncomplete),
      preserved_terminal: Object.freeze(preservedTerminal),
      revalidation_required: true,
      reasons: Object.freeze(reasons),
    };
  }
  return {
    ...base,
    preserved_incomplete: Object.freeze(preservedIncomplete),
    preserved_terminal: Object.freeze(preservedTerminal),
    revalidation_required: preservedIncomplete.length > 0,
    reasons: Object.freeze(
      preservedIncomplete.length > 0 ? ["incomplete work preserved"] : [],
    ),
  };
}

export interface CrashRecoveryV1 {
  readonly schema_version: 1;
  readonly recovered: boolean;
  readonly run: WorkflowRunV1 | null;
  readonly reasons: readonly string[];
}

function isStageState(value: unknown): value is StageStateV1 {
  return (
    typeof value === "string" &&
    (STAGE_STATES as readonly string[]).includes(value)
  );
}

function isAttemptRecord(value: unknown): value is AttemptRecordV1 {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record["attempt_number"] === "number" &&
    (record["attempt_number"] as number) >= 1 &&
    typeof record["attempt_identity"] === "string" &&
    HEX64.test(record["attempt_identity"] as string) &&
    typeof record["idempotency_identity"] === "string" &&
    HEX64.test(record["idempotency_identity"] as string) &&
    typeof record["retry_class"] === "string" &&
    isStageState(record["state"]) &&
    typeof record["detail"] === "string"
  );
}

export function recoverWorkflowRunV1(serialized: string): CrashRecoveryV1 {
  const base = {
    schema_version: STAGE_ATTEMPT_SCHEMA_VERSION,
  } as const;
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    return {
      ...base,
      recovered: false,
      run: null,
      reasons: Object.freeze(["snapshot is not valid JSON"]),
    };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return {
      ...base,
      recovered: false,
      run: null,
      reasons: Object.freeze(["snapshot is not an object"]),
    };
  }
  const record = parsed as Record<string, unknown>;
  if (record["schema_version"] !== 1) {
    return {
      ...base,
      recovered: false,
      run: null,
      reasons: Object.freeze(["unsupported snapshot schema version"]),
    };
  }
  if (
    typeof record["run_identity"] !== "string" ||
    !HEX64.test(record["run_identity"] as string)
  ) {
    return {
      ...base,
      recovered: false,
      run: null,
      reasons: Object.freeze(["run identity is invalid"]),
    };
  }
  if (
    typeof record["subject_head"] !== "string" ||
    !SHA.test(record["subject_head"] as string)
  ) {
    return {
      ...base,
      recovered: false,
      run: null,
      reasons: Object.freeze(["subject head is invalid"]),
    };
  }
  if (
    typeof record["policy_identity"] !== "string" ||
    !HEX64.test(record["policy_identity"] as string)
  ) {
    return {
      ...base,
      recovered: false,
      run: null,
      reasons: Object.freeze(["policy identity is invalid"]),
    };
  }
  if (!Array.isArray(record["stages"])) {
    return {
      ...base,
      recovered: false,
      run: null,
      reasons: Object.freeze(["stages are invalid"]),
    };
  }
  const stages: StageRecordV1[] = [];
  for (const entry of record["stages"] as unknown[]) {
    if (typeof entry !== "object" || entry === null) {
      return {
        ...base,
        recovered: false,
        run: null,
        reasons: Object.freeze(["stage entry is invalid"]),
      };
    }
    const stage = entry as Record<string, unknown>;
    if (
      typeof stage["stage_key"] !== "string" ||
      !validateStageKey(stage["stage_key"] as string)
    ) {
      return {
        ...base,
        recovered: false,
        run: null,
        reasons: Object.freeze(["stage key is invalid"]),
      };
    }
    if (!isStageState(stage["state"])) {
      return {
        ...base,
        recovered: false,
        run: null,
        reasons: Object.freeze(["stage state is invalid"]),
      };
    }
    if (!Array.isArray(stage["attempts"])) {
      return {
        ...base,
        recovered: false,
        run: null,
        reasons: Object.freeze(["stage attempts are invalid"]),
      };
    }
    const attempts: AttemptRecordV1[] = [];
    for (const attempt of stage["attempts"] as unknown[]) {
      if (!isAttemptRecord(attempt)) {
        return {
          ...base,
          recovered: false,
          run: null,
          reasons: Object.freeze(["attempt record is invalid"]),
        };
      }
      attempts.push(attempt);
    }
    stages.push({
      stage_key: stage["stage_key"] as string,
      state: stage["state"] as StageStateV1,
      attempts: Object.freeze(attempts),
    });
  }
  return {
    ...base,
    recovered: true,
    run: {
      schema_version: STAGE_ATTEMPT_SCHEMA_VERSION,
      run_identity: record["run_identity"] as string,
      subject_head: record["subject_head"] as string,
      policy_identity: record["policy_identity"] as string,
      stages: Object.freeze(stages),
    },
    reasons: Object.freeze([]),
  };
}
