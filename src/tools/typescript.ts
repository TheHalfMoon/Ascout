import type { ConfigV1 } from "../config.js";
import type {
  DiscoveryFileMap,
  PackageManager,
  ProjectDiscovery,
} from "../discovery.js";
import type { TaskResultV1 } from "../receipt/model.js";

export type TypeScriptCommandSource = "override" | "package_script" | "local_tsc";
export type TypeScriptAuthorizedBy = TaskResultV1["authorized_by"];

interface TypeScriptPlanBase {
  readonly taskType: "typecheck";
  readonly authorizedBy: TypeScriptAuthorizedBy;
  readonly sourcePath: string | null;
  readonly argv: readonly string[];
  readonly workingDirectory: string | null;
  readonly commandSource: TypeScriptCommandSource | null;
  readonly configPath: string | null;
}

export interface PlannedTypeScriptTask extends TypeScriptPlanBase {
  readonly state: "planned";
  readonly reasonCode: null;
  readonly reasonText: null;
}

export interface UnresolvedTypeScriptTask extends TypeScriptPlanBase {
  readonly state: "not_run";
  readonly reasonCode: string;
  readonly reasonText: string;
}

export interface NotApplicableTypeScriptTask extends TypeScriptPlanBase {
  readonly state: "not_applicable";
  readonly reasonCode: string | null;
  readonly reasonText: string | null;
}

export type TypeScriptTaskPlan =
  | PlannedTypeScriptTask
  | UnresolvedTypeScriptTask
  | NotApplicableTypeScriptTask;

export interface TypeScriptTaskPlanningInput {
  readonly config: ConfigV1;
  readonly discovery: ProjectDiscovery;
  readonly files: DiscoveryFileMap;
}

interface ScriptCandidate {
  readonly manifestPath: string;
  readonly workingDirectory: string | null;
}

type ScriptInspection =
  | { readonly state: "absent" }
  | { readonly state: "present"; readonly candidate: ScriptCandidate }
  | { readonly state: "invalid"; readonly manifestPath: string };

interface LocalTscGroup {
  readonly root: string;
  readonly executablePaths: readonly string[];
}

const ASCOUT_CONFIG_PATH = "ascout.config.json";
const TYPECHECK_SCRIPT = "typecheck";
const TSC_DISCOVERY_SUFFIXES = ["", ".cmd", ".exe", ".ps1"] as const;
const TSC_LAUNCH_SUFFIX_PRIORITY = ["", ".cmd", ".exe"] as const;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dirname(path: string): string {
  const index = path.lastIndexOf("/");
  return index < 0 ? "" : path.slice(0, index);
}

function packageDirectory(manifestPath: string): string | null {
  return manifestPath === "package.json" ? null : dirname(manifestPath);
}

function notRun(
  reasonCode: string,
  reasonText: string,
  authorizedBy: TypeScriptAuthorizedBy = "discovery",
  sourcePath: string | null = null,
): UnresolvedTypeScriptTask {
  return {
    state: "not_run",
    taskType: "typecheck",
    authorizedBy,
    sourcePath,
    argv: [],
    workingDirectory: null,
    commandSource: null,
    configPath: null,
    reasonCode,
    reasonText,
  };
}

function notApplicable(
  authorizedBy: TypeScriptAuthorizedBy = "discovery",
  sourcePath: string | null = null,
  reasonCode: string | null = null,
  reasonText: string | null = null,
): NotApplicableTypeScriptTask {
  return {
    state: "not_applicable",
    taskType: "typecheck",
    authorizedBy,
    sourcePath,
    argv: [],
    workingDirectory: null,
    commandSource: null,
    configPath: null,
    reasonCode,
    reasonText,
  };
}

function planned(
  authorizedBy: TypeScriptAuthorizedBy,
  sourcePath: string,
  argv: readonly string[],
  commandSource: TypeScriptCommandSource,
  workingDirectory: string | null,
  configPath: string | null,
): PlannedTypeScriptTask {
  return {
    state: "planned",
    taskType: "typecheck",
    authorizedBy,
    sourcePath,
    argv: [...argv],
    workingDirectory,
    commandSource,
    configPath,
    reasonCode: null,
    reasonText: null,
  };
}

function inspectTypecheckScript(files: DiscoveryFileMap, manifestPath: string): ScriptInspection {
  const raw = files[manifestPath];
  if (raw === undefined) return { state: "invalid", manifestPath };

  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return { state: "invalid", manifestPath };
  }
  if (!isRecord(value)) return { state: "invalid", manifestPath };

  const scripts = value.scripts;
  if (!isRecord(scripts) || !Object.prototype.hasOwnProperty.call(scripts, TYPECHECK_SCRIPT)) {
    return { state: "absent" };
  }
  const command = scripts[TYPECHECK_SCRIPT];
  if (typeof command !== "string" || command.length === 0) {
    return { state: "invalid", manifestPath };
  }
  return {
    state: "present",
    candidate: {
      manifestPath,
      workingDirectory: packageDirectory(manifestPath),
    },
  };
}

function resolveScriptCandidate(
  input: TypeScriptTaskPlanningInput,
): ScriptCandidate | UnresolvedTypeScriptTask | null {
  const manifestPaths = input.discovery.workspace.packageJsonPaths;
  const rootPath = manifestPaths.includes("package.json") ? "package.json" : null;

  if (rootPath !== null) {
    const root = inspectTypecheckScript(input.files, rootPath);
    if (root.state === "invalid") {
      return notRun(
        "typecheck_script_invalid",
        "The root package typecheck script must be a non-empty string.",
        "repo_config",
        root.manifestPath,
      );
    }
    if (root.state === "present") return root.candidate;
  }

  const candidates: ScriptCandidate[] = [];
  for (const manifestPath of manifestPaths) {
    if (manifestPath === "package.json") continue;
    const inspected = inspectTypecheckScript(input.files, manifestPath);
    if (inspected.state === "invalid") {
      return notRun(
        "typecheck_script_invalid",
        "A discovered workspace typecheck script must be a non-empty string.",
        "repo_config",
        inspected.manifestPath,
      );
    }
    if (inspected.state === "present") candidates.push(inspected.candidate);
  }

  if (candidates.length === 0) return null;
  if (candidates.length > 1) {
    return notRun(
      "typecheck_script_ambiguous",
      "Multiple workspace typecheck scripts were discovered without a root typecheck script.",
      "repo_config",
    );
  }
  return candidates[0]!;
}

function packageManagerArgv(manager: PackageManager): readonly string[] {
  return [manager, "run", TYPECHECK_SCRIPT];
}

function planScript(
  candidate: ScriptCandidate,
  discovery: ProjectDiscovery,
): PlannedTypeScriptTask | UnresolvedTypeScriptTask {
  const manager = discovery.packageManager;
  if (manager.state !== "resolved") {
    return notRun(manager.reasonCode, manager.reasonText, "repo_config", candidate.manifestPath);
  }
  return planned(
    "repo_config",
    candidate.manifestPath,
    packageManagerArgv(manager.value),
    "package_script",
    candidate.workingDirectory,
    null,
  );
}

function logicalTscRoot(path: string): string | null {
  for (const suffix of TSC_DISCOVERY_SUFFIXES) {
    const marker = `node_modules/.bin/tsc${suffix}`;
    if (!path.endsWith(marker)) continue;
    const prefix = path.slice(0, -marker.length);
    if (prefix === "") return "";
    if (!prefix.endsWith("/")) return null;
    return prefix.slice(0, -1);
  }
  return null;
}

function groupLocalTsc(paths: readonly string[]): readonly LocalTscGroup[] {
  const grouped = new Map<string, string[]>();
  for (const path of paths) {
    const root = logicalTscRoot(path);
    if (root === null) continue;
    const values = grouped.get(root) ?? [];
    values.push(path);
    grouped.set(root, values);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([root, executablePaths]) => ({ root, executablePaths }));
}

function executableSuffix(path: string): (typeof TSC_DISCOVERY_SUFFIXES)[number] | null {
  for (const suffix of TSC_DISCOVERY_SUFFIXES) {
    if (path.endsWith(`node_modules/.bin/tsc${suffix}`)) return suffix;
  }
  return null;
}

function preferredExecutable(paths: readonly string[]): string | null {
  for (const suffix of TSC_LAUNCH_SUFFIX_PRIORITY) {
    const candidate = paths.find((path) => executableSuffix(path) === suffix);
    if (candidate !== undefined) return candidate;
  }
  return null;
}

function configPathsForTsc(discovery: ProjectDiscovery, root: string): readonly string[] {
  const sameRoot = discovery.tools.typescript.configPaths.filter((path) => dirname(path) === root);
  if (root !== "") return sameRoot;
  return discovery.tools.typescript.configPaths;
}

function hasTypeScriptEvidence(input: TypeScriptTaskPlanningInput): boolean {
  const tool = input.discovery.tools.typescript;
  return (
    input.config.tasks?.typecheck?.enabled === true ||
    tool.declarationPaths.length > 0 ||
    tool.localExecutablePaths.length > 0 ||
    tool.configPaths.length > 0
  );
}

function planLocalTsc(input: TypeScriptTaskPlanningInput): TypeScriptTaskPlan {
  const groups = groupLocalTsc(input.discovery.tools.typescript.localExecutablePaths);
  if (groups.length === 0) {
    if (!hasTypeScriptEvidence(input)) return notApplicable();
    return notRun("tool_missing", "Project TypeScript is not installed.");
  }
  if (groups.length > 1) {
    return notRun(
      "tool_ambiguous",
      "Multiple project-local TypeScript executables were discovered; typecheck resolution is ambiguous.",
    );
  }

  const group = groups[0]!;
  const executable = preferredExecutable(group.executablePaths);
  if (executable === null) {
    return notRun(
      "tool_unsupported",
      "The discovered TypeScript installation exposes no directly launchable local tsc shim.",
    );
  }

  const configPaths = configPathsForTsc(input.discovery, group.root);
  if (configPaths.length === 0) {
    return notRun(
      "config_missing",
      "No TypeScript project configuration was found for safe typecheck discovery.",
    );
  }
  if (configPaths.length > 1) {
    return notRun(
      "config_ambiguous",
      "Multiple TypeScript project configurations apply to the discovered local tsc.",
    );
  }

  const configPath = configPaths[0]!;
  return planned(
    "discovery",
    configPath,
    [executable, "-p", configPath, "--noEmit"],
    "local_tsc",
    null,
    configPath,
  );
}

function invalidOverrideCommand(command: readonly string[]): boolean {
  return command.length === 0 || command[0]!.length === 0 || command.some((value) => value.includes("\0"));
}

export function planTypeScriptTask(input: TypeScriptTaskPlanningInput): TypeScriptTaskPlan {
  const override = input.config.tasks?.typecheck;
  if (override?.enabled === false) {
    return notApplicable(
      "user_config",
      ASCOUT_CONFIG_PATH,
      "disabled_by_config",
      override.disabledReason ?? "TypeScript task disabled by configuration.",
    );
  }

  if (override?.command !== undefined) {
    if (invalidOverrideCommand(override.command)) {
      return notRun(
        "override_command_invalid",
        "The configured TypeScript typecheck command must have a non-empty executable and contain no NUL bytes.",
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

  const script = resolveScriptCandidate(input);
  if (script !== null) {
    return "state" in script ? script : planScript(script, input.discovery);
  }

  return planLocalTsc(input);
}
