import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname as nativeDirname, isAbsolute, relative, resolve, sep } from "node:path";

import type { ConfigV1 } from "../config.js";
import type { DiscoveryFileMap, ProjectDiscovery } from "../discovery.js";
import type { GitChangedFile } from "../git.js";
import type { TaskResultV1 } from "../receipt/model.js";

export type VitestAuthorizedBy = TaskResultV1["authorized_by"];
export type VitestCoverageProvider = "v8" | "istanbul";
export type VitestSelectionMode = "native_related" | "full";

interface VitestPlanBase {
  readonly taskType: "test";
  readonly authorizedBy: VitestAuthorizedBy;
  readonly sourcePath: string | null;
  readonly argv: readonly string[];
  readonly workingDirectory: string | null;
  readonly configPath: string | null;
  readonly selectionMode: VitestSelectionMode | null;
  readonly selectedPaths: readonly string[];
  readonly machineResultPath: string | null;
  readonly coverageDirectoryPath: string | null;
  readonly lcovPath: string | null;
  readonly coverageProvider: VitestCoverageProvider | null;
  readonly toolVersion: string | null;
}

export interface PlannedVitestTask extends VitestPlanBase {
  readonly state: "planned";
  readonly reasonCode: null;
  readonly reasonText: null;
}

export interface UnresolvedVitestTask extends VitestPlanBase {
  readonly state: "not_run";
  readonly reasonCode: string;
  readonly reasonText: string;
}

export interface NotApplicableVitestTask extends VitestPlanBase {
  readonly state: "not_applicable";
  readonly reasonCode: string | null;
  readonly reasonText: string | null;
}

export type VitestTaskPlan = PlannedVitestTask | UnresolvedVitestTask | NotApplicableVitestTask;

export interface VitestTaskPlanningInput {
  readonly repositoryRoot: string;
  readonly runId: string;
  readonly config: ConfigV1;
  readonly discovery: ProjectDiscovery;
  readonly files: DiscoveryFileMap;
  readonly changedFiles: readonly GitChangedFile[];
  readonly selectionMode?: VitestSelectionMode;
  /** Keeps T054 second-pass machine/coverage evidence physically separate. */
  readonly artifactPassOrdinal?: 1 | 2;
  readonly platform?: NodeJS.Platform;
}

interface LocalExecutableGroup {
  readonly root: string;
  readonly executablePaths: readonly string[];
}

interface InstalledVitest {
  readonly executablePath: string;
  readonly installRoot: string;
  readonly version: string;
  readonly coverageProvider: VitestCoverageProvider;
}

type JsonRecord = Record<string, unknown>;

const ASCOUT_CONFIG_PATH = "ascout.config.json";
const VITEST_EXECUTABLE_SUFFIXES = ["", ".cmd", ".exe", ".ps1"] as const;
const JS_TS_SOURCE = /\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$/u;
const CANONICAL_REPOSITORY_PATH =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?!.+\/[.]{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u;

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

function packageRoot(manifestPath: string): string {
  return manifestPath === "package.json" ? "" : dirname(manifestPath);
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

function emptyBase(
  authorizedBy: VitestAuthorizedBy = "discovery",
  sourcePath: string | null = null,
): Omit<VitestPlanBase, "taskType" | "authorizedBy" | "sourcePath"> & {
  readonly taskType: "test";
  readonly authorizedBy: VitestAuthorizedBy;
  readonly sourcePath: string | null;
} {
  return {
    taskType: "test",
    authorizedBy,
    sourcePath,
    argv: [],
    workingDirectory: null,
    configPath: null,
    selectionMode: null,
    selectedPaths: [],
    machineResultPath: null,
    coverageDirectoryPath: null,
    lcovPath: null,
    coverageProvider: null,
    toolVersion: null,
  };
}

function notRun(
  reasonCode: string,
  reasonText: string,
  authorizedBy: VitestAuthorizedBy = "discovery",
  sourcePath: string | null = null,
): UnresolvedVitestTask {
  return {
    ...emptyBase(authorizedBy, sourcePath),
    state: "not_run",
    reasonCode,
    reasonText,
  };
}

function notApplicable(
  authorizedBy: VitestAuthorizedBy = "discovery",
  sourcePath: string | null = null,
  reasonCode: string | null = null,
  reasonText: string | null = null,
): NotApplicableVitestTask {
  return {
    ...emptyBase(authorizedBy, sourcePath),
    state: "not_applicable",
    reasonCode,
    reasonText,
  };
}

function logicalVitestRoot(path: string): string | null {
  for (const suffix of VITEST_EXECUTABLE_SUFFIXES) {
    const marker = `node_modules/.bin/vitest${suffix}`;
    if (!path.endsWith(marker)) continue;
    let prefix = path.slice(0, -marker.length);
    if (prefix.endsWith("/")) prefix = prefix.slice(0, -1);
    return prefix;
  }
  return null;
}

function groupLocalExecutables(paths: readonly string[]): readonly LocalExecutableGroup[] {
  const groups = new Map<string, string[]>();
  for (const path of paths) {
    const root = logicalVitestRoot(path);
    if (root === null) continue;
    const values = groups.get(root) ?? [];
    values.push(path);
    groups.set(root, values);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([root, executablePaths]) => ({ root, executablePaths: sortedUnique(executablePaths) }));
}

function executableSuffix(path: string): (typeof VITEST_EXECUTABLE_SUFFIXES)[number] | null {
  for (const suffix of VITEST_EXECUTABLE_SUFFIXES) {
    if (path.endsWith(`node_modules/.bin/vitest${suffix}`)) return suffix;
  }
  return null;
}

function launchSuffixPriority(platform: NodeJS.Platform): readonly (typeof VITEST_EXECUTABLE_SUFFIXES)[number][] {
  return platform === "win32" ? [".cmd", ".exe"] : ["", ".exe"];
}

function preferredExecutable(paths: readonly string[], platform: NodeJS.Platform): string | null {
  for (const suffix of launchSuffixPriority(platform)) {
    const candidate = paths.find((path) => executableSuffix(path) === suffix);
    if (candidate !== undefined) return candidate;
  }
  return null;
}

function validChangedPath(path: string): boolean {
  return !path.includes("\0") && CANONICAL_REPOSITORY_PATH.test(path);
}

function changedSourcePaths(changedFiles: readonly GitChangedFile[]): readonly string[] | UnresolvedVitestTask {
  for (const file of changedFiles) {
    if (!validChangedPath(file.path)) {
      return notRun(
        "changed_path_invalid",
        "Changed-file paths supplied to Vitest planning must already be canonical repository-relative paths.",
      );
    }
  }

  return sortedUnique(
    changedFiles
      .filter(({ change_kind }) => change_kind !== "deleted")
      .filter(({ line_semantics }) => line_semantics === "text")
      .map(({ path }) => path)
      .filter((path) => JS_TS_SOURCE.test(path)),
  );
}

function changedScopePaths(changedFiles: readonly GitChangedFile[]): readonly string[] | UnresolvedVitestTask {
  const result: string[] = [];
  for (const file of changedFiles) {
    for (const candidate of [file.path, file.previous_path]) {
      if (candidate === undefined) continue;
      if (!validChangedPath(candidate)) {
        return notRun(
          "changed_path_invalid",
          "Changed-file paths supplied to Vitest planning must already be canonical repository-relative paths.",
        );
      }
      result.push(candidate);
    }
  }
  return sortedUnique(result);
}

function chooseScopeRoot(
  declarationPaths: readonly string[],
  changedPaths: readonly string[],
): string | null {
  const candidates = sortedUnique(
    declarationPaths
      .map(packageRoot)
      .filter((root) => changedPaths.every((path) => pathWithinRoot(path, root))),
  );
  if (candidates.length === 0) return null;
  return [...candidates].sort((left, right) => right.length - left.length || compareStrings(left, right))[0]!;
}

function containedByRepository(repositoryRoot: string, absolutePath: string): boolean {
  const candidate = relative(repositoryRoot, absolutePath);
  return candidate === "" || (!isAbsolute(candidate) && candidate !== ".." && !candidate.startsWith(`..${sep}`));
}

function readInstalledPackageVersion(
  repositoryRoot: string,
  repositoryPath: string,
  expectedName: string,
): string | null {
  const absolute = resolve(repositoryRoot, ...repositoryPath.split("/"));
  if (!existsSync(absolute)) return null;

  let real: string;
  try {
    real = realpathSync(absolute);
    if (!containedByRepository(repositoryRoot, real) || !statSync(real).isFile()) return null;
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(real, "utf8")) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.name !== expectedName || typeof parsed.version !== "string" || parsed.version.length === 0) {
    return null;
  }
  return parsed.version;
}

function installedCoverageProvider(
  repositoryRoot: string,
  installRoot: string,
): VitestCoverageProvider | null {
  const roots = sortedUnique([installRoot, ""]);
  for (const root of roots) {
    const prefix = root === "" ? "" : `${root}/`;
    if (
      readInstalledPackageVersion(
        repositoryRoot,
        `${prefix}node_modules/@vitest/coverage-v8/package.json`,
        "@vitest/coverage-v8",
      ) !== null
    ) {
      return "v8";
    }
    if (
      readInstalledPackageVersion(
        repositoryRoot,
        `${prefix}node_modules/@vitest/coverage-istanbul/package.json`,
        "@vitest/coverage-istanbul",
      ) !== null
    ) {
      return "istanbul";
    }
  }
  return null;
}

function resolveInstalledVitest(
  repositoryRoot: string,
  scopeRoot: string,
  executablePaths: readonly string[],
  platform: NodeJS.Platform,
): InstalledVitest | null {
  const groups = groupLocalExecutables(executablePaths);
  const exact = groups.find((group) => group.root === scopeRoot);
  const hoisted = groups.find((group) => group.root === "");
  const group = exact ?? hoisted;
  if (group === undefined) return null;

  const executablePath = preferredExecutable(group.executablePaths, platform);
  if (executablePath === null) return null;

  const prefix = group.root === "" ? "" : `${group.root}/`;
  const version = readInstalledPackageVersion(
    repositoryRoot,
    `${prefix}node_modules/vitest/package.json`,
    "vitest",
  );
  if (version === null) return null;

  const coverageProvider = installedCoverageProvider(repositoryRoot, group.root);
  if (coverageProvider === null) return null;

  return {
    executablePath,
    installRoot: group.root,
    version,
    coverageProvider,
  };
}

function configAtScope(configPaths: readonly string[], scopeRoot: string): string | null | "ambiguous" {
  const matching = configPaths.filter((path) => dirname(path) === scopeRoot);
  if (matching.length > 1) return "ambiguous";
  return matching[0] ?? null;
}

function assertRunId(runId: string): boolean {
  return /^[A-Za-z0-9._-]+$/u.test(runId) && runId !== "." && runId !== "..";
}

export function planVitestTask(input: VitestTaskPlanningInput): VitestTaskPlan {
  const override = input.config.tasks?.test;
  if (override?.enabled === false) {
    return notApplicable(
      "user_config",
      ASCOUT_CONFIG_PATH,
      "disabled_by_config",
      override.disabledReason ?? "test task disabled by configuration.",
    );
  }
  if (override?.command !== undefined) {
    return notRun(
      "configured_test_command_machine_contract_unavailable",
      "T051 cannot infer trusted machine-result and LCOV artifact contracts for an arbitrary configured test command.",
      "user_config",
      ASCOUT_CONFIG_PATH,
    );
  }

  const runner = input.discovery.jsTestRunner;
  if (runner.state === "absent") return notApplicable();
  if (runner.state === "ambiguous" || runner.state === "unsupported") {
    return notRun(runner.reasonCode, runner.reasonText, "discovery", runner.sourcePaths[0] ?? null);
  }
  if (runner.value !== "vitest") {
    return notApplicable(
      "discovery",
      runner.sourcePaths[0] ?? null,
      "runner_not_vitest",
      "The discovered JavaScript test runner is not Vitest; Jest integration is handled separately.",
    );
  }

  const selectionMode = input.selectionMode ?? "native_related";
  const changedPathsOrError = selectionMode === "full"
    ? changedScopePaths(input.changedFiles)
    : changedSourcePaths(input.changedFiles);
  if ("state" in changedPathsOrError) return changedPathsOrError;
  const changedPaths = changedPathsOrError;
  if (changedPaths.length === 0) {
    return notRun(
      selectionMode === "full" ? "full_scope_unresolved" : "native_selection_unresolved",
      selectionMode === "full"
        ? "No changed repository path is available to determine a safe full Vitest package/workspace scope."
        : "No changed supported JavaScript/TypeScript source path is available for confident native Vitest related selection.",
      "discovery",
      runner.sourcePaths[0] ?? null,
    );
  }

  const scopeRoot = chooseScopeRoot(input.discovery.tools.vitest.declarationPaths, changedPaths);
  if (scopeRoot === null) {
    return notRun(
      "test_scope_ambiguous",
      selectionMode === "full"
        ? "No single declared Vitest package/workspace scope safely contains every changed relation-risk path."
        : "No single declared Vitest package scope safely contains every changed supported source path.",
      "discovery",
      runner.sourcePaths[0] ?? null,
    );
  }

  const configPath = configAtScope(input.discovery.tools.vitest.configPaths, scopeRoot);
  if (configPath === "ambiguous") {
    return notRun(
      "config_ambiguous",
      "Multiple Vitest configuration files exist at the selected package scope.",
      "repo_config",
      packageRoot(scopeRoot === "" ? "package.json" : `${scopeRoot}/package.json") || "package.json",
    );
  }

  const installed = resolveInstalledVitest(
    input.repositoryRoot,
    scopeRoot,
    input.discovery.tools.vitest.localExecutablePaths,
    input.platform ?? process.platform,
  );
  if (installed === null) {
    return notRun(
      "tool_or_coverage_provider_unresolved",
      "Project-local Vitest plus an installed local v8 or Istanbul coverage provider are required; Ascout will not install either implicitly.",
      "discovery",
      configPath ?? runner.sourcePaths[0] ?? null,
    );
  }

  if (!assertRunId(input.runId)) {
    return notRun("run_id_invalid", "Internal run identifier is not safe for Vitest artifact paths.");
  }

  const artifactPassOrdinal = input.artifactPassOrdinal ?? 1;
  const artifactBase = artifactPassOrdinal === 1
    ? `.ascout/runs/${input.runId}/raw/test`
    : `.ascout/runs/${input.runId}/raw/test/pass-2`;
  const machineResultPath = `${artifactBase}/vitest-results.json`;
  const coverageDirectoryPath = `${artifactBase}/coverage`;
  const lcovPath = `${coverageDirectoryPath}/lcov.info`;
  const workingDirectory = scopeRoot === "" ? null : scopeRoot;
  const executableArg = relativeFromRoot(scopeRoot, installed.executablePath);
  const selectedArgs = selectionMode === "native_related"
    ? changedPaths.map((path) => positionalPathArg(relativeFromRoot(scopeRoot, path)))
    : [];
  const selectionArgs = selectionMode === "native_related" ? ["related", ...selectedArgs] : [];
  const machineResultArg = relativeFromRoot(scopeRoot, machineResultPath);
  const coverageDirectoryArg = relativeFromRoot(scopeRoot, coverageDirectoryPath);
  const configArgs = configPath === null ? [] : ["--config", relativeFromRoot(scopeRoot, configPath)];

  return {
    state: "planned",
    taskType: "test",
    authorizedBy: "discovery",
    sourcePath: configPath ?? runner.sourcePaths[0] ?? null,
    argv: [
      executableArg,
      ...selectionArgs,
      "--run",
      "--passWithNoTests",
      "--reporter=json",
      `--outputFile=${machineResultArg}`,
      "--coverage.enabled=true",
      `--coverage.provider=${installed.coverageProvider}`,
      "--coverage.reporter=lcov",
      `--coverage.reportsDirectory=${coverageDirectoryArg}`,
      "--coverage.reportOnFailure=true",
      ...configArgs,
    ],
    workingDirectory,
    configPath,
    selectionMode,
    selectedPaths: selectionMode === "native_related" ? changedPaths : [],
    machineResultPath,
    coverageDirectoryPath,
    lcovPath,
    coverageProvider: installed.coverageProvider,
    toolVersion: installed.version,
    reasonCode: null,
    reasonText: null,
  };
}