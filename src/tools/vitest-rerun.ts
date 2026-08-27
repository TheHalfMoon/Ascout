import type { PlannedVitestTask } from "./vitest.js";

export type VitestRerunObservationOrdinal = 2 | 3;

export interface VitestExactFailingTestSelector {
  /** Canonical repository-relative test file path. */
  readonly path: string;
  /** Exact full test name as observed from the runner result. */
  readonly fullName: string;
}

export interface VitestTargetedRerunPlanningInput {
  readonly runId: string;
  readonly basePlan: PlannedVitestTask;
  readonly selector: VitestExactFailingTestSelector;
  /** Initial failure is observation 1; T063 permits only observations 2 and 3. */
  readonly observationOrdinal: number;
}

export interface PlannedVitestTargetedRerun {
  readonly state: "planned";
  readonly observationOrdinal: VitestRerunObservationOrdinal;
  readonly selector: VitestExactFailingTestSelector;
  readonly argv: readonly string[];
  readonly workingDirectory: string | null;
  readonly machineResultPath: string;
  readonly reasonCode: null;
  readonly reasonText: null;
}

export interface UnavailableVitestTargetedRerun {
  readonly state: "unavailable";
  readonly observationOrdinal: number;
  readonly selector: VitestExactFailingTestSelector;
  readonly argv: readonly string[];
  readonly workingDirectory: string | null;
  readonly machineResultPath: null;
  readonly reasonCode: string;
  readonly reasonText: string;
}

export type VitestTargetedRerunPlan = PlannedVitestTargetedRerun | UnavailableVitestTargetedRerun;

const CANONICAL_REPOSITORY_PATH =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?!.+\/[.]{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u;

function validRunId(runId: string): boolean {
  return /^[A-Za-z0-9._-]+$/u.test(runId) && runId !== "." && runId !== "..";
}

function pathWithinRoot(path: string, root: string): boolean {
  return root === "" || path.startsWith(`${root}/`);
}

function relativeFromRoot(root: string, path: string): string {
  if (root === "") return path;
  const from = root.split("/");
  const to = path.split("/");
  let common = 0;
  while (common < from.length && common < to.length && from[common] === to[common]) common += 1;
  return [...from.slice(common).map(() => ".."), ...to.slice(common)].join("/") || ".";
}

function positionalPathArg(path: string): string {
  return path.startsWith("-") ? `./${path}` : path;
}

function exactRegex(value: string): string {
  return `^${value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}(?![\\s\\S])`;
}

function unavailable(
  input: VitestTargetedRerunPlanningInput,
  reasonCode: string,
  reasonText: string,
): UnavailableVitestTargetedRerun {
  return {
    state: "unavailable",
    observationOrdinal: input.observationOrdinal,
    selector: input.selector,
    argv: [],
    workingDirectory: input.basePlan.workingDirectory,
    machineResultPath: null,
    reasonCode,
    reasonText,
  };
}

/**
 * Plans one exact Vitest failure observation without executing it.
 *
 * The initial failure is observation 1. Only observations 2 and 3 are
 * representable here, which caps T063 at two additional observations. The
 * caller may stop after observation 2 if it already has enough contradictory
 * evidence; T064 owns reproduction/flake normalization.
 */
export function planVitestTargetedRerun(input: VitestTargetedRerunPlanningInput): VitestTargetedRerunPlan {
  if (input.observationOrdinal !== 2 && input.observationOrdinal !== 3) {
    return unavailable(
      input,
      "targeted_rerun_observation_limit",
      "Vitest targeted reruns permit only observations 2 and 3 after the initial failing observation.",
    );
  }
  if (!validRunId(input.runId)) {
    return unavailable(input, "run_id_invalid", "Internal run identifier is not safe for targeted Vitest artifact paths.");
  }
  if (
    !CANONICAL_REPOSITORY_PATH.test(input.selector.path) ||
    input.selector.path.includes("\0")
  ) {
    return unavailable(
      input,
      "targeted_rerun_selector_unsafe",
      "Vitest targeted rerun requires a canonical repository-relative test file path.",
    );
  }
  if (input.selector.fullName.length === 0 || input.selector.fullName.includes("\0")) {
    return unavailable(
      input,
      "targeted_rerun_selector_unsafe",
      "Vitest targeted rerun requires a non-empty exact full test name without NUL characters.",
    );
  }

  const scopeRoot = input.basePlan.workingDirectory ?? "";
  if (!pathWithinRoot(input.selector.path, scopeRoot)) {
    return unavailable(
      input,
      "targeted_rerun_selector_outside_scope",
      "Vitest targeted rerun test path must remain inside the already-authorized package/workspace scope.",
    );
  }

  const executableArg = input.basePlan.argv[0];
  if (executableArg === undefined || executableArg.length === 0) {
    return unavailable(
      input,
      "targeted_rerun_base_plan_invalid",
      "Vitest targeted rerun requires the resolved executable from the already-authorized base plan.",
    );
  }

  const rerunIndex = input.observationOrdinal - 1;
  const machineResultPath = `.ascout/runs/${input.runId}/raw/test/rerun-${rerunIndex}/vitest-results.json`;
  const fileArg = positionalPathArg(relativeFromRoot(scopeRoot, input.selector.path));
  const machineResultArg = relativeFromRoot(scopeRoot, machineResultPath);
  const configArgs = input.basePlan.configPath === null
    ? []
    : ["--config", relativeFromRoot(scopeRoot, input.basePlan.configPath)];

  return {
    state: "planned",
    observationOrdinal: input.observationOrdinal,
    selector: input.selector,
    argv: [
      executableArg,
      fileArg,
      "--run",
      "--reporter=json",
      `--outputFile=${machineResultArg}`,
      "--testNamePattern",
      exactRegex(input.selector.fullName),
      ...configArgs,
    ],
    workingDirectory: input.basePlan.workingDirectory,
    machineResultPath,
    reasonCode: null,
    reasonText: null,
  };
}
