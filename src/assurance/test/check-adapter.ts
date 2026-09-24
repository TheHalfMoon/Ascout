import type { TaskStatus } from "../../receipt/model.js";

import {
  getTestProfilePolicyV1,
  type TestProfile,
} from "./profile-policy.js";

export const CHECK_ADAPTER_SCHEMA_VERSION = 1 as const;

export const CHECK_TASK_STATUSES: readonly TaskStatus[] = [
  "PASS",
  "FAIL",
  "FLAKY",
  "BLOCKED",
  "ERROR",
  "NOT_APPLICABLE",
  "NOT_RUN",
] as const;

export const CHECK_ADAPTER_STRATEGY = "adapter-first" as const;

export const CHECK_ADAPTER_OBSERVATION_KIND = "TEST_OBSERVATION" as const;

export interface CheckAdapterInputV1 {
  readonly task_id: string;
  readonly status: TaskStatus;
  readonly reason_code: string | null;
  readonly reason_text: string | null;
  readonly profile: TestProfile;
}

export interface CheckAdapterObservationV1 {
  readonly schema_version: 1;
  readonly observation_kind: typeof CHECK_ADAPTER_OBSERVATION_KIND;
  readonly adapter_strategy: typeof CHECK_ADAPTER_STRATEGY;
  readonly scope: "TEST";
  readonly profile: TestProfile;
  readonly task_id: string;
  readonly source_status: TaskStatus;
  readonly observed_status: TaskStatus;
  readonly reason_code: string | null;
  readonly reason_text: string | null;
  readonly plan_visible_fields: readonly string[];
}

const PLAN_VISIBLE_FIELDS: readonly string[] = [
  "adapter_strategy",
  "observation_kind",
  "observed_status",
  "profile",
  "reason_code",
  "reason_text",
  "scope",
  "source_status",
  "task_id",
] as const;

function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    value === "PASS" ||
    value === "FAIL" ||
    value === "FLAKY" ||
    value === "BLOCKED" ||
    value === "ERROR" ||
    value === "NOT_APPLICABLE" ||
    value === "NOT_RUN"
  );
}

function requireReason(
  status: TaskStatus,
  reason_code: string | null,
  reason_text: string | null,
): void {
  if (status === "BLOCKED" || status === "ERROR" || status === "NOT_RUN") {
    if (reason_code === null || reason_code.length === 0) {
      throw new TypeError(status + " requires a non-empty reason_code");
    }
    if (reason_text === null || reason_text.length === 0) {
      throw new TypeError(status + " requires a non-empty reason_text");
    }
  }
}

export function adaptCheckTaskStatusV1(
  input: CheckAdapterInputV1,
): CheckAdapterObservationV1 {
  if (!isTaskStatus(input.status)) {
    throw new TypeError("Unknown check task status: " + String(input.status));
  }
  getTestProfilePolicyV1(input.profile);
  requireReason(input.status, input.reason_code, input.reason_text);
  return {
    schema_version: 1,
    observation_kind: CHECK_ADAPTER_OBSERVATION_KIND,
    adapter_strategy: CHECK_ADAPTER_STRATEGY,
    scope: "TEST",
    profile: input.profile,
    task_id: input.task_id,
    source_status: input.status,
    observed_status: input.status,
    reason_code: input.reason_code,
    reason_text: input.reason_text,
    plan_visible_fields: PLAN_VISIBLE_FIELDS,
  };
}

export function isCheckAdapterTerminalObservation(
  observation: CheckAdapterObservationV1,
): boolean {
  return (
    observation.observed_status === "FAIL" ||
    observation.observed_status === "FLAKY" ||
    observation.observed_status === "BLOCKED" ||
    observation.observed_status === "ERROR"
  );
}
