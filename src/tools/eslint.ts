import type { ConfigV1 } from "../config.js";
import type {
  DiscoveryFileMap,
  PackageManager,
  ProjectDiscovery,
} from "../discovery.js";
import type { GitChangedFile } from "../git.js";
import type { TaskResultV1 } from "../receipt/model.js";

export type ESLintCommandSource = "override" | "package_script" | "local_eslint";
export type ESLintExecutionScope = "configured_override" | "project_script" | "changed_files";
export type ESLintAuthorizedBy = TaskResultV1["authorized_by"];

interface ESLintPlanBase {
  readonly taskType: "lint";
  readonly authorizedBy: ESLintAuthorizedBy;
  readonly sourcePath: string | null;
  readonly argv: readonly string[];
  readonly workingDirectory: string | null;
  readonly commandSource: ESLintCommandSource | null;
  readonly configPath: string | null;
  readonly executionScope: ESLintExecutionScope | null;
  readonly scopeRoot: string | null;
  readonly selectedPaths: readonly string[];
  readonly scopeDisclosure: string | null;
}

export interface PlannedESLintTask extends ESLintPlanBase {
  readonly state: "planned";
  readonly reasonCode: null;
  readonly reasonText: null;
}

export interface UnresolvedESLintTask extends ESLintPlanBase {
  readonly state: "not_run";
  readonly reasonCode: string;
  readonly reasonText: string;
}

export interface NotApplicableESLintTask extends ESLintPlanBase {
  readonly state: "not_applicable";
  readonly reasonCode: string | null;
  readonly reasonText: string | null;
}

export type ESLintTaskPlan = PlannedESLintTask | UnresolvedESLintTask | NotApplicableESLintTask;

export interface ESLintTaskPlanningInput {
  readonly config: ConfigV1;
  readonly discovery: ProjectDiscovery;
  readonly files: DiscoveryFileMap;
  readonly changedFiles: readonly GitChangedFile[];
}

interface ScriptCandidate {
  readonly manifestPath: string;
  readonly workingDirectory: string | null;
}

type ScriptInspection =
  | { readonly state: "absent" }
  | { readonly state: "present"; readonly candidate: ScriptCandidate }
  | { readonly state: "invalid"; readonly manifestPath: string };

interface LocalESLintGroup {
  readonly root: string;
  readonly executablePaths: readonly string[];
}

const ASCOUT_CONFIG_PATH = "ascout.config.json";
const LINT_SCRIPT = "lint";
const ESLINT_DISCOVERY_SUFFIXES = ["", ".cmd", ".exe", ".ps1"] as const;
const ESLINT_LAUNCH_SUFFIX_PRIORITY = ["", ".cmd", ".exe"] as const;
const LINTABLE_SOURCE = /\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$/u;
const DIRECT_FLAT_ESLINT_CONFIG = /^eslint\.config\.(?:js|mjs|cjs)$/u;
const CANONICAL_REPOSITORY_PATH =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?!.+\/[.]{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort(compareStrings);
}

function dirname(path: string): string {
  const index = path.lastIndexOf("/");
  return index < 0 ? "" : path.slice(0, index);
}

function basename(path: string): string {
  const index = path.lastIndexOf("/");
  return index < 0 ? path : path.slice(index + 1);
}

function relativeFromRoot(root: string, path: string): string {
  if (root === "") return path;
  const from = root.split("/");
  const to = path.split("/");
  let common = 0;
  while (common < from.length && common < to.length && from[common] === to[common]) common += 1;
  return [...from.slice(common).map(() => ".."), ...to.slice(common)].join("/") || ".";
}

function packageDirectory(manifestPath: string): string | null {
  return manifestPath === "package.json" ? null : dirname(manifestPath);
}

function notRun(
  reasonCode: string,
  reasonText: string,
  authorizedBy: ESLintAuthorizedBy = "discovery",
  sourcePath: string | null = null,
): UnresolvedESLintTask {
  return {
    state: "not_run",
    taskType: "lint",
    authorizedBy,
    sourcePath,
    argv: [],
    workingDirectory: null,
    commandSource: null,
    configPath: null,
    executionScope: null,
    scopeRoot: null,
    selectedPaths: [],
    scopeDisclosure: null,
    reasonCode,
    reasonText,
  };
}

function notApplicable(
  authorizedBy: ESLintAuthorizedBy = "discovery",
  sourcePath: string | null = null,
  reasonCode: string | null = null,
  reasonText: string | null = null,
): NotApplicableESLintTask {
  return {
    state: "not_applicable",
    taskType: "lint",
    authorizedBy,
    sourcePath,
    argv: [],
    workingDirectory: null,
    commandSource: null,
    configPath: null,
    executionScope: null,
    scopeRoot: null,
    selectedPaths: [],
    scopeDisclosure: null,
    reasonCode,
    reasonText,
  };
}

function planned(
  authorizedBy: ESLintAuthorizedBy,
  sourcePath: string,
  argv: readonly string[],
  commandSource: ESLintCommandSource,
  workingDirectory: string | null,
  configPath: string | null,
  executionScope: ESLintExecutionScope,
  scopeRoot: string | null,
  selectedPaths: readonly string[],
  scopeDisclosure: string,
): PlannedESLintTask {
  return {
    state: "planned",
    taskType: "lint",
    authorizedBy,
    sourcePath,
    argv: [...argv],
    workingDirectory,
    commandSource,
    configPath,
    executionScope,
    scopeRoot,
    selectedPaths: [...selectedPaths],
    scopeDisclosure,
    reasonCode: null,
    reasonText: null,
  };
}

function invalidOverrideCommand(command: readonly string[]): boolean {
  return command.length === 0 || command[0]!.length === 0 || command.some((value) => value.includes("\0"));
}

function inspectLintScript(files: DiscoveryFileMap, manifestPath: string): ScriptInspection {
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
  if (!isRecord(scripts) || !Object.prototype.hasOwnProperty.call(scripts, LINT_SCRIPT)) {
    return { state: "absent" };
  }
  const command = scripts[LINT_SCRIPT];
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
  input: ESLintTaskPlanningInput,
): ScriptCandidate | UnresolvedESLintTask | null {
  const manifestPaths = input.discovery.workspace.packageJsonPaths;
  const rootPath = manifestPaths.includes("package.json") ? "package.json" : null;

  if (rootPath !== null) {
    const root = inspectLintScript(input.files, rootPath);
    if (root.state === "invalid") {
      return notRun(
        "lint_script_invalid",
        "The root package lint script must be a non-empty string.",
        "repo_config",
        root.manifestPath,
      );
    }
    if (root.state === "present") return root.candidate;
  }

  const candidates: ScriptCandidate[] = [];
  for (const manifestPath of manifestPaths) {
    if (manifestPath === "package.json") continue;
    const inspected = inspectLintScript(input.files, manifestPath);
    if (inspected.state === "invalid") {
      return notRun(
        "lint_script_invalid",
        "A discovered workspace lint script must be a non-empty string.",
        "repo_config",
        inspected.manifestPath,
      );
    }
    if (inspected.state === "present") candidates.push(inspected.candidate);
  }

  if (candidates.length === 0) return null;
  if (candidates.length > 1) {
    return notRun(
      "lint_script_ambiguous",
      "Multiple workspace lint scripts were discovered without a root lint script.",
      "repo_config",
    );
  }
  return candidates[0]!;
}

function packageManagerArgv(manager: PackageManager): readonly string[] {
  return [manager, "run", LINT_SCRIPT];
}

function planScript(
  candidate: ScriptCandidate,
  discovery: ProjectDiscovery,
): PlannedESLintTask | UnresolvedESLintTask {
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
    "project_script",
    candidate.workingDirectory,
    [],
    "The repository-defined lint script is not narrowed by T036 and may inspect a broader package or workspace scope than the changed files.",
  );
}

function logicalESLintRoot(path: string): string | null {
  for (const suffix of ESLINT_DISCOVERY_SUFFIXES) {
    const marker = `node_modules/.bin/eslint${suffix}`;
    if (!path.endsWith(marker)) continue;
    const prefix = path.slice(0, -marker.length);
    if (prefix === "") return "";
    if (!prefix.endsWith("/")) return null;
    return prefix.slice(0, -1);
  }
  return null;
}

function groupLocalESLint(paths: readonly string[]): readonly LocalESLintGroup[] {
  const grouped = new Map<string, string[]>();
  for (const path of paths) {
    const root = logicalESLintRoot(path);
    if (root === null) continue;
    const values = grouped.get(root) ?? [];
    values.push(path);
    grouped.set(root, values);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([root, executablePaths]) => ({ root, executablePaths }));
}

function executableSuffix(path: string): (typeof ESLINT_DISCOVERY_SUFFIXES)[number] | null {
  for (const suffix of ESLINT_DISCOVERY_SUFFIXES) {
    if (path.endsWith(`node_modules/.bin/eslint${suffix}`)) return suffix;
  }
  return null;
}

function preferredExecutable(paths: readonly string[]): string | null {
  for (const suffix of ESLINT_LAUNCH_SUFFIX_PRIORITY) {
    const candidate = paths.find((path) => executableSuffix(path) === suffix);
    if (candidate !== undefined) return candidate;
  }
  return null;
}

function pathWithinRoot(path: string, root: string): boolean {
  return root === "" || path.startsWith(`${root}/`);
}

function changedLintablePaths(changedFiles: readonly GitChangedFile[]): readonly string[] | UnresolvedESLintTask {
  for (const file of changedFiles) {
    if (!CANONICAL_REPOSITORY_PATH.test(file.path)) {
      return notRun(
        "changed_path_invalid",
        "Changed-file paths supplied to ESLint planning must already be canonical repository-relative paths.",
      );
    }
  }

  return sortedUnique(
    changedFiles
      .filter(({ change_kind }) => change_kind !== "deleted")
      .filter(({ line_semantics }) => line_semantics === "text")
      .map(({ path }) => path)
      .filter((path) => LINTABLE_SOURCE.test(path)),
  );
}

function planLocalChangedFiles(input: ESLintTaskPlanningInput): PlannedESLintTask | UnresolvedESLintTask | null {
  const tool = input.discovery.tools.eslint;
  const changedPaths = changedLintablePaths(input.changedFiles);
  if (!Array.isArray(changedPaths)) return changedPaths;
  if (changedPaths.length === 0) return null;

  if (tool.configPaths.length === 0) {
    const localEvidence =
      input.config.tasks?.lint?.enabled === true ||
      tool.declarationPaths.length > 0 ||
      tool.localExecutablePaths.length > 0;
    if (!localEvidence) return null;
    return notRun(
      "config_missing",
      "No ESLint project configuration was found for safe changed-file lint planning.",
    );
  }
  if (tool.configPaths.length > 1) {
    return notRun(
      "config_ambiguous",
      "Multiple ESLint configuration files were discovered; T036 cannot prove one safe changed-file invocation.",
    );
  }

  const groups = groupLocalESLint(tool.localExecutablePaths);
  if (groups.length === 0) {
    return notRun("tool_missing", "Project ESLint is not installed.");
  }
  if (groups.length > 1) {
    return notRun(
      "tool_ambiguous",
      "Multiple project-local ESLint executable roots were discovered; lint resolution is ambiguous.",
    );
  }

  const group = groups[0]!;
  const executable = preferredExecutable(group.executablePaths);
  if (executable === null) {
    return notRun(
      "tool_unsupported",
      "The discovered ESLint installation exposes no directly launchable local eslint shim.",
    );
  }

  const configPath = tool.configPaths[0]!;
  if (!DIRECT_FLAT_ESLINT_CONFIG.test(basename(configPath))) {
    return notRun(
      "config_unsupported",
      "Direct changed-file ESLint planning requires directly loadable eslint.config.js/.mjs/.cjs; legacy .eslintrc* and TypeScript flat configs require a repository lint script or explicit override.",
      "repo_config",
      configPath,
    );
  }

  const configRoot = dirname(configPath);
  if (group.root !== "" && group.root !== configRoot) {
    return notRun(
      "tool_scope_ambiguous",
      "The only project-local ESLint executable is outside both the repository root and the selected config root.",
    );
  }

  const selectedPaths = changedPaths.filter((path) => pathWithinRoot(path, configRoot));
  if (selectedPaths.length === 0) return null;
  if (selectedPaths.length !== changedPaths.length) {
    return notRun(
      "lint_scope_ambiguous",
      "The only discovered ESLint config does not cover every changed supported JavaScript/TypeScript file.",
    );
  }

  const workingDirectory = configRoot === "" ? null : configRoot;
  const executableArg = relativeFromRoot(configRoot, executable);
  const configArg = relativeFromRoot(configRoot, configPath);
  const selectedArgs = selectedPaths.map((path) => relativeFromRoot(configRoot, path));

  return planned(
    "discovery",
    configPath,
    [executableArg, "--config", configArg, "--", ...selectedArgs],
    "local_eslint",
    workingDirectory,
    configPath,
    "changed_files",
    configRoot === "" ? null : configRoot,
    selectedPaths,
    "T036 narrowed ESLint to the changed supported JavaScript/TypeScript files listed in selectedPaths; workspace config execution is rooted at scopeRoot so relative config patterns retain repository semantics.",
  );
}

function hasESLintEvidence(input: ESLintTaskPlanningInput): boolean {
  const tool = input.discovery.tools.eslint;
  return (
    input.config.tasks?.lint?.enabled === true ||
    tool.declarationPaths.length > 0 ||
    tool.localExecutablePaths.length > 0 ||
    tool.configPaths.length > 0
  );
}

export function planESLintTask(input: ESLintTaskPlanningInput): ESLintTaskPlan {
  const override = input.config.tasks?.lint;
  if (override?.enabled === false) {
    return notApplicable(
      "user_config",
      ASCOUT_CONFIG_PATH,
      "disabled_by_config",
      override.disabledReason ?? "ESLint task disabled by configuration.",
    );
  }

  if (override?.command !== undefined) {
    if (invalidOverrideCommand(override.command)) {
      return notRun(
        "override_command_invalid",
        "The configured lint command must have a non-empty executable and contain no NUL bytes.",
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
      "configured_override",
      null,
      [],
      "The lint command is explicitly user-configured; T036 does not infer or narrow its execution scope.",
    );
  }

  const local = planLocalChangedFiles(input);
  if (local?.state === "planned") return local;
  if (local?.state === "not_run" && local.reasonCode === "changed_path_invalid") return local;

  const script = resolveScriptCandidate(input);
  if (script !== null) {
    if ("state" in script) {
      if (local !== null) return local;
      return script;
    }
    return planScript(script, input.discovery);
  }

  if (local !== null) return local;
  if (!hasESLintEvidence(input)) return notApplicable();

  return notApplicable(
    "discovery",
    null,
    "no_changed_supported_files",
    "ESLint is present, but no changed supported JavaScript/TypeScript files are safely applicable and no lint script is available.",
  );
}
