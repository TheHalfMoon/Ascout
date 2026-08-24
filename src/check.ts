import {
  FIXED_SEMANTIC_TASKS,
  classifyCommandSurfaces,
  intersectChangedAuthorityPaths,
  type ChangedPathView,
  type CommandSurfaceClassifyOptions,
  type ProjectDiscovery,
  type SemanticTaskType,
} from "./discovery.js";
import type { ExecutionAdmission } from "./receipt/model.js";

export const COMMAND_SURFACE_CHANGED_REASON_CODE = "command_surface_changed";
export const COMMAND_SURFACE_CHANGED_REASON_TEXT =
  "effective command or configuration authority changed in this invocation";

/**
 * Refusal descriptor for an applicable task whose effective command surface
 * changed in this invocation. Admission refusals are always NOT_RUN results:
 * admission itself never produces BLOCKED. BLOCKED is reserved for genuine
 * validity dependencies determined outside admission.
 */
export interface AdmissionRefusal {
  readonly status: "NOT_RUN";
  readonly reasonCode: typeof COMMAND_SURFACE_CHANGED_REASON_CODE;
  readonly reasonText: string;
}

export interface TaskAdmissionDecision {
  readonly taskType: SemanticTaskType;
  readonly commandSurfaceChanged: boolean;
  readonly changedAuthorityPaths: readonly string[];
  readonly executionAdmission: ExecutionAdmission;
  /** False means the task process must not launch for this task in this run. */
  readonly launchAllowed: boolean;
  readonly refusal: AdmissionRefusal | null;
}

export type RunAdmissionDecisions = Readonly<Record<SemanticTaskType, TaskAdmissionDecision>>;

export interface RunAdmissionOptions extends CommandSurfaceClassifyOptions {
  /**
   * Per-invocation explicit human admission supplied on the command line only.
   * It is never persisted as a trust grant and must not be supplied by agent
   * automation.
   */
  readonly allowChangedCommandSurface?: boolean;
}

function emptyDecision(taskType: SemanticTaskType): TaskAdmissionDecision {
  return {
    taskType,
    commandSurfaceChanged: false,
    changedAuthorityPaths: [],
    executionAdmission: "normal",
    launchAllowed: true,
    refusal: null,
  };
}

export function decideTaskAdmission(
  taskType: SemanticTaskType,
  authorityPaths: readonly string[],
  changedFiles: readonly ChangedPathView[],
  allowChangedCommandSurface: boolean,
): TaskAdmissionDecision {
  const changedAuthorityPaths = intersectChangedAuthorityPaths(authorityPaths, changedFiles);

  if (changedAuthorityPaths.length === 0) {
    return emptyDecision(taskType);
  }

  if (allowChangedCommandSurface) {
    return {
      taskType,
      commandSurfaceChanged: true,
      changedAuthorityPaths,
      executionAdmission: "explicit_changed_surface_override",
      launchAllowed: true,
      refusal: null,
    };
  }

  return {
    taskType,
    commandSurfaceChanged: true,
    changedAuthorityPaths,
    executionAdmission: "refused_changed_surface",
    launchAllowed: false,
    refusal: {
      status: "NOT_RUN",
      reasonCode: COMMAND_SURFACE_CHANGED_REASON_CODE,
      reasonText: COMMAND_SURFACE_CHANGED_REASON_TEXT,
    },
  };
}

/**
 * Computes the per-run admission decision for each fixed semantic task.
 *
 * Tasks are independent by default: each decision is derived only from that
 * task's own effective authority paths, so one task's refusal never blocks or
 * alters another task's admission. No admission outcome is BLOCKED.
 */
export function decideRunAdmissions(
  discovery: ProjectDiscovery,
  changedFiles: readonly ChangedPathView[],
  options: RunAdmissionOptions = {},
): RunAdmissionDecisions {
  const { allowChangedCommandSurface = false, ...classifyOptions } = options;
  const surfaces = classifyCommandSurfaces(discovery, classifyOptions);
  const result = {} as Record<SemanticTaskType, TaskAdmissionDecision>;

  for (const task of FIXED_SEMANTIC_TASKS) {
    result[task] = decideTaskAdmission(
      task,
      surfaces[task].authorityPaths,
      changedFiles,
      allowChangedCommandSurface,
    );
  }

  return result;
}
