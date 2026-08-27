import type { ConfigV1 } from "../config.js";
import type {
  DiscoveryFileMap,
  ProjectDiscovery,
} from "../discovery.js";
import type { TaskResultV1 } from "../receipt/model.js";

export type PytestCommandSource = "override" | "discovery";
export type PytestAuthorizedBy = TaskResultV1["authorized_by"];

interface PytestPlanBase {
  readonly taskType: "pytestBasic";
  readonly authorizedBy: PytestAuthorizedBy;
  readonly sourcePath: string | null;
  readonly argv: readonly string[];
  readonly workingDirectory: string | null;
  readonly commandSource: PytestCommandSource | null;
  readonly effectivePytestConfigPath: string | null;
}

export interface PlannedPytestTask extends PytestPlanBase {
  readonly state: "planned";
  readonly reasonCode: null;
  readonly reasonText: null;
}

export interface UnresolvedPytestTask extends PytestPlanBase {
  readonly state: "not_run";
  readonly reasonCode: string;
  readonly reasonText: string;
}

export interface NotApplicablePytestTask extends PytestPlanBase {
  readonly state: "not_applicable";
  readonly reasonCode: string | null;
  readonly reasonText: string | null;
}

export type PytestTaskPlan =
  | PlannedPytestTask
  | UnresolvedPytestTask
  | NotApplicablePytestTask;

export interface PytestTaskPlanningInput {
  readonly config: ConfigV1;
  readonly discovery: ProjectDiscovery;
  readonly files: DiscoveryFileMap;
}

const ASCOUT_CONFIG_PATH = "ascout.config.json";

function notRun(
  reasonCode: string,
  reasonText: string,
  authorizedBy: PytestAuthorizedBy = "discovery",
  sourcePath: string | null = null,
): UnresolvedPytestTask {
  return {
    state: "not_run",
    taskType: "pytestBasic",
    authorizedBy,
    sourcePath,
    argv: [],
    workingDirectory: null,
    commandSource: null,
    effectivePytestConfigPath: null,
    reasonCode,
    reasonText,
  };
}

function notApplicable(
  authorizedBy: PytestAuthorizedBy = "discovery",
  sourcePath: string | null = null,
  reasonCode: string | null = null,
  reasonText: string | null = null,
): NotApplicablePytestTask {
  return {
    state: "not_applicable",
    taskType: "pytestBasic",
    authorizedBy,
    sourcePath,
    argv: [],
    workingDirectory: null,
    commandSource: null,
    effectivePytestConfigPath: null,
    reasonCode,
    reasonText,
  };
}

function planned(
  authorizedBy: PytestAuthorizedBy,
  sourcePath: string,
  argv: readonly string[],
  commandSource: PytestCommandSource,
  workingDirectory: string | null,
  effectivePytestConfigPath: string | null,
): PlannedPytestTask {
  return {
    state: "planned",
    taskType: "pytestBasic",
    authorizedBy,
    sourcePath,
    argv: [...argv],
    workingDirectory,
    commandSource,
    effectivePytestConfigPath,
    reasonCode: null,
    reasonText: null,
  };
}

function invalidOverrideCommand(command: readonly string[]): boolean {
  return command.length === 0 || command[0]!.length === 0 || command.some((value) => value.includes("\0"));
}

export function planPytestBasicTask(input: PytestTaskPlanningInput): PytestTaskPlan {
  const override = input.config.tasks?.pytestBasic;
  if (override?.enabled === false) {
    return notApplicable(
      "user_config",
      ASCOUT_CONFIG_PATH,
      "disabled_by_config",
      override.disabledReason ?? "pytestBasic task disabled by configuration.",
    );
  }

  if (override?.command !== undefined) {
    if (invalidOverrideCommand(override.command)) {
      return notRun(
        "override_command_invalid",
        "The configured pytestBasic command must have a non-empty executable and contain no NUL bytes.",
        "user_config",
        ASCOUT_CONFIG_PATH,
      );
    }
    return planned(
      "user_config",
      ASCOUT_CONFIG_PATH,
      override.command,
      "override",
      null,
      null,
    );
  }

  const discovery = input.discovery.pytestBasic;
  switch (discovery.state) {
    case "resolved": {
      const sourcePath = discovery.sourcePaths[0] ?? null;
      return planned(
        "discovery",
        sourcePath ?? "pytestBasic",
        ["pytest"],
        "discovery",
        null,
        sourcePath,
      );
    }
    case "ambiguous": {
      return notRun(
        discovery.reasonCode,
        discovery.reasonText,
        "discovery",
      );
    }
    case "unsupported": {
      return notRun(
        discovery.reasonCode,
        discovery.reasonText,
        "discovery",
      );
    }
    case "absent":
    default: {
      return notApplicable();
    }
  }
}
