import {
  getTestProfilePolicyV1,
  type TestProfile,
} from "./profile-policy.js";
import type { CheckAdapterObservationV1 } from "./check-adapter.js";

export const COVERAGE_PROJECTION_SCHEMA_VERSION = 1 as const;

export const COVERAGE_ADAPTER_STRATEGY = "adapter-first" as const;

export type ChangedExerciseState =
  | "EXERCISED"
  | "NOT_EXERCISED"
  | "UNRESOLVED";

export interface DeselectedTestV1 {
  readonly task_id: string;
  readonly reason_code: string;
  readonly reason_text: string;
}

export interface ChangedLineExerciseV1 {
  readonly line_id: string;
  readonly state: ChangedExerciseState;
  readonly reason: string | null;
}

export interface TestCoverageProjectionV1 {
  readonly schema_version: 1;
  readonly scope: "TEST";
  readonly profile: TestProfile;
  readonly adapter_strategy: typeof COVERAGE_ADAPTER_STRATEGY;
  readonly selected_count: number;
  readonly deselected_count: number;
  readonly selected_task_ids: readonly string[];
  readonly deselected: readonly DeselectedTestV1[];
  readonly exercised_count: number;
  readonly not_exercised_count: number;
  readonly unresolved_count: number;
  readonly changed_exercise: readonly ChangedLineExerciseV1[];
  readonly unknown_limitations: readonly string[];
  readonly plan_visible_fields: readonly string[];
}

export interface TestCoverageProjectionInputV1 {
  readonly profile: TestProfile;
  readonly selected: readonly CheckAdapterObservationV1[];
  readonly deselected: readonly DeselectedTestV1[];
  readonly changed_lines: readonly ChangedLineExerciseV1[];
  readonly unknown_limitations: readonly string[];
}

const PLAN_VISIBLE_FIELDS: readonly string[] = [
  "adapter_strategy",
  "changed_exercise",
  "deselected",
  "deselected_count",
  "exercised_count",
  "not_exercised_count",
  "profile",
  "scope",
  "selected_count",
  "selected_task_ids",
  "unknown_limitations",
  "unresolved_count",
] as const;

function requireNonEmpty(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(field + " must be non-empty");
  }
}

function requireUniqueSorted(values: readonly string[], field: string): void {
  const sorted = [...values].sort();
  const unique = [...new Set(sorted)];
  if (unique.length !== values.length) {
    throw new TypeError(field + " must contain unique entries");
  }
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] !== sorted[index]) {
      throw new TypeError(field + " must be canonically sorted");
    }
  }
}

export function projectTestCoverageV1(
  input: TestCoverageProjectionInputV1,
): TestCoverageProjectionV1 {
  getTestProfilePolicyV1(input.profile);
  const selectedIds = input.selected.map((entry) => entry.task_id);
  for (const id of selectedIds) {
    requireNonEmpty(id, "selected task_id");
  }
  requireUniqueSorted(selectedIds, "selected task_ids");
  const deselectedIds = input.deselected.map((entry) => entry.task_id);
  for (const entry of input.deselected) {
    requireNonEmpty(entry.task_id, "deselected task_id");
    requireNonEmpty(entry.reason_code, "deselected reason_code");
    requireNonEmpty(entry.reason_text, "deselected reason_text");
  }
  requireUniqueSorted(deselectedIds, "deselected task_ids");
  const selectedSet = new Set(selectedIds);
  for (const id of deselectedIds) {
    if (selectedSet.has(id)) {
      throw new TypeError("selected and deselected overlap: " + id);
    }
  }
  const lineIds = input.changed_lines.map((entry) => entry.line_id);
  for (const entry of input.changed_lines) {
    requireNonEmpty(entry.line_id, "changed line_id");
    if (
      entry.state !== "EXERCISED" &&
      entry.state !== "NOT_EXERCISED" &&
      entry.state !== "UNRESOLVED"
    ) {
      throw new TypeError("Unknown changed exercise state: " + entry.state);
    }
    if (entry.state !== "EXERCISED") {
      if (entry.reason === null || entry.reason.length === 0) {
        throw new TypeError(entry.state + " requires a non-empty reason");
      }
    }
  }
  requireUniqueSorted(lineIds, "changed line_ids");
  for (const limitation of input.unknown_limitations) {
    requireNonEmpty(limitation, "unknown_limitation");
  }
  requireUniqueSorted(
    input.unknown_limitations,
    "unknown_limitations",
  );
  let exercised = 0;
  let notExercised = 0;
  let unresolved = 0;
  for (const entry of input.changed_lines) {
    if (entry.state === "EXERCISED") {
      exercised += 1;
    } else if (entry.state === "NOT_EXERCISED") {
      notExercised += 1;
    } else {
      unresolved += 1;
    }
  }
  return {
    schema_version: 1,
    scope: "TEST",
    profile: input.profile,
    adapter_strategy: COVERAGE_ADAPTER_STRATEGY,
    selected_count: selectedIds.length,
    deselected_count: deselectedIds.length,
    selected_task_ids: [...selectedIds].sort(),
    deselected: [...input.deselected].sort((a, b) =>
      a.task_id < b.task_id ? -1 : a.task_id > b.task_id ? 1 : 0,
    ),
    exercised_count: exercised,
    not_exercised_count: notExercised,
    unresolved_count: unresolved,
    changed_exercise: [...input.changed_lines].sort((a, b) =>
      a.line_id < b.line_id ? -1 : a.line_id > b.line_id ? 1 : 0,
    ),
    unknown_limitations: [...input.unknown_limitations].sort(),
    plan_visible_fields: PLAN_VISIBLE_FIELDS,
  };
}
