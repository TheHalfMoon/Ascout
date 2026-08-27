import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import type { Dirent } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export const FIXED_SEMANTIC_TASKS = ["typecheck", "lint", "test", "pytestBasic"] as const;

export type SemanticTaskType = (typeof FIXED_SEMANTIC_TASKS)[number];
export type PackageManager = "npm" | "pnpm" | "yarn";
export type WorkspaceKind = "single" | "basic";
export type JsTestRunner = "vitest" | "jest";
export type DiscoveryFileMap = Readonly<Record<string, string>>;

export type DiscoveryResolution<T extends string> =
  | { readonly state: "resolved"; readonly value: T; readonly sourcePaths: readonly string[] }
  | {
      readonly state: "absent";
      readonly reasonCode: string;
      readonly reasonText: string;
      readonly sourcePaths: readonly string[];
    }
  | {
      readonly state: "ambiguous";
      readonly candidates: readonly T[];
      readonly reasonCode: string;
      readonly reasonText: string;
      readonly sourcePaths: readonly string[];
    }
  | {
      readonly state: "unsupported";
      readonly reasonCode: string;
      readonly reasonText: string;
      readonly sourcePaths: readonly string[];
    };

export interface WorkspaceDiscovery {
  readonly state: "resolved" | "unsupported";
  readonly kind: WorkspaceKind | null;
  readonly patterns: readonly string[];
  readonly packageJsonPaths: readonly string[];
  readonly sourcePaths: readonly string[];
  readonly reasonCode: string | null;
  readonly reasonText: string | null;
}

export interface LocalNodeToolDiscovery {
  readonly packageName: "typescript" | "eslint" | "vitest" | "jest";
  readonly binName: "tsc" | "eslint" | "vitest" | "jest";
  readonly declarationPaths: readonly string[];
  readonly localExecutablePaths: readonly string[];
  readonly configPaths: readonly string[];
}

export interface PackageScriptAuthority {
  readonly typecheck: readonly string[];
  readonly lint: readonly string[];
  readonly test: readonly string[];
}

export interface ProjectDiscovery {
  readonly semanticTasks: readonly SemanticTaskType[];
  readonly packageManager: DiscoveryResolution<PackageManager>;
  readonly workspace: WorkspaceDiscovery;
  readonly packageScriptAuthority: PackageScriptAuthority;
  readonly jsTestRunner: DiscoveryResolution<JsTestRunner>;
  readonly pytestBasic: DiscoveryResolution<"pytestBasic">;
  readonly tools: {
    readonly typescript: LocalNodeToolDiscovery;
    readonly eslint: LocalNodeToolDiscovery;
    readonly vitest: LocalNodeToolDiscovery;
    readonly jest: LocalNodeToolDiscovery;
  };
}

export type DiscoveryErrorCode =
  | "invalid_discovery_path"
  | "invalid_package_json"
  | "invalid_repository_root"
  | "repository_read_error";

export class DiscoveryError extends Error {
  readonly code: DiscoveryErrorCode;
  readonly sourcePath: string | null;

  constructor(code: DiscoveryErrorCode, message: string, sourcePath: string | null = null) {
    super(message);
    this.name = "DiscoveryError";
    this.code = code;
    this.sourcePath = sourcePath;
  }
}

type JsonRecord = Record<string, unknown>;
interface PackageManifest {
  readonly path: string;
  readonly value: JsonRecord;
  readonly invalid: boolean;
}

const PACKAGE_MANAGER = /^(npm|pnpm|yarn)@[0-9]+\.[0-9]+\.[0-9]+$/;
const LOCKFILE_MANAGER = {
  "package-lock.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
} as const;
const TOOL_METADATA = {
  typescript: { packageName: "typescript", binName: "tsc" },
  eslint: { packageName: "eslint", binName: "eslint" },
  vitest: { packageName: "vitest", binName: "vitest" },
  jest: { packageName: "jest", binName: "jest" },
} as const;
const EXECUTABLE_SUFFIXES = ["", ".cmd", ".exe", ".ps1"] as const;
const SIMPLE_WORKSPACE_STAR = /^([^*?\[\]{}]+)\/\*$/;
const CANONICAL_PATH =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?!.+\/[.]{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/;
const MAX_DISCOVERY_FILE_BYTES = 1024 * 1024;
const MAX_DISCOVERY_ENTRIES = 20_000;
const CONTENT_REQUIRED_NAMES = new Set([
  "package.json",
  "pnpm-workspace.yaml",
  "pyproject.toml",
  "setup.cfg",
  "tox.ini",
]);

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort(compareStrings);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertPath(path: string): void {
  if (!CANONICAL_PATH.test(path)) {
    throw new DiscoveryError(
      "invalid_discovery_path",
      `discovery path must already be canonical repository-relative data: ${JSON.stringify(path)}`,
      path,
    );
  }
}

function normalizeFiles(files: DiscoveryFileMap): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    assertPath(path);
    result[path] = content;
  }
  return result;
}

function manifests(files: Readonly<Record<string, string>>): readonly PackageManifest[] {
  return Object.entries(files)
    .filter(([path]) => path === "package.json" || path.endsWith("/package.json"))
    .map(([path, raw]) => {
      let value: unknown;
      try {
        value = JSON.parse(raw) as unknown;
      } catch {
        if (path === "package.json") {
          throw new DiscoveryError("invalid_package_json", `invalid JSON in ${path}`, path);
        }
        return { path, value: {}, invalid: true };
      }
      if (!isRecord(value)) {
        if (path === "package.json") {
          throw new DiscoveryError("invalid_package_json", `${path} must contain a JSON object`, path);
        }
        return { path, value: {}, invalid: true };
      }
      return { path, value, invalid: false };
    })
    .sort((left, right) => compareStrings(left.path, right.path));
}

function dependencyNames(manifest: PackageManifest): ReadonlySet<string> {
  const result = new Set<string>();
  for (const key of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"] as const) {
    const section = manifest.value[key];
    if (!isRecord(section)) continue;
    for (const name of Object.keys(section)) result.add(name);
  }
  return result;
}

function scriptOwnerPaths(
  allManifests: readonly PackageManifest[],
  scriptName: "typecheck" | "lint" | "test",
): readonly string[] {
  return allManifests
    .filter((manifest) => {
      const scripts = manifest.value.scripts;
      return isRecord(scripts) && Object.prototype.hasOwnProperty.call(scripts, scriptName);
    })
    .map(({ path }) => path)
    .sort(compareStrings);
}

function discoverPackageScriptAuthority(
  allManifests: readonly PackageManifest[],
): PackageScriptAuthority {
  return {
    typecheck: scriptOwnerPaths(allManifests, "typecheck"),
    lint: scriptOwnerPaths(allManifests, "lint"),
    test: scriptOwnerPaths(allManifests, "test"),
  };
}

function discoverPackageManager(
  files: Readonly<Record<string, string>>,
  root: PackageManifest | undefined,
): DiscoveryResolution<PackageManager> {
  const declared = root?.value.packageManager;
  if (declared !== undefined) {
    if (typeof declared !== "string" || PACKAGE_MANAGER.exec(declared) === null) {
      return {
        state: "unsupported",
        reasonCode: "package_manager_declaration_invalid",
        reasonText: "Root packageManager must be npm, pnpm, or yarn with an exact x.y.z version.",
        sourcePaths: ["package.json"],
      };
    }
    return {
      state: "resolved",
      value: PACKAGE_MANAGER.exec(declared)![1] as PackageManager,
      sourcePaths: ["package.json"],
    };
  }

  const lockfiles = Object.entries(LOCKFILE_MANAGER)
    .filter(([path]) => files[path] !== undefined)
    .map(([path, manager]) => ({ path, manager }));
  if (lockfiles.length === 0) {
    return {
      state: "absent",
      reasonCode: "package_manager_not_discovered",
      reasonText: "No supported root packageManager declaration or recognized lockfile was found.",
      sourcePaths: [],
    };
  }
  if (lockfiles.length > 1) {
    return {
      state: "ambiguous",
      candidates: sortedUnique(lockfiles.map(({ manager }) => manager)) as readonly PackageManager[],
      reasonCode: "package_manager_ambiguous",
      reasonText: "Multiple recognized root lockfiles are present without a packageManager declaration.",
      sourcePaths: sortedUnique(lockfiles.map(({ path }) => path)),
    };
  }
  return {
    state: "resolved",
    value: lockfiles[0]!.manager,
    sourcePaths: [lockfiles[0]!.path],
  };
}

function packageWorkspacePatterns(root: PackageManifest | undefined): readonly string[] | null {
  const value = root?.value.workspaces;
  if (value === undefined) return null;
  if (Array.isArray(value)) {
    return value.every((item) => typeof item === "string" && item.length > 0)
      ? sortedUnique(value as readonly string[])
      : [];
  }
  if (isRecord(value) && Array.isArray(value.packages)) {
    return value.packages.every((item) => typeof item === "string" && item.length > 0)
      ? sortedUnique(value.packages as readonly string[])
      : [];
  }
  return [];
}

function pnpmWorkspacePatterns(raw: string): readonly string[] | null {
  const result: string[] = [];
  let packagesSeen = false;
  for (const line of raw.split(/\r?\n/u)) {
    if (line.trimStart().startsWith("#")) continue;
    const cleaned = line.replace(/\s+#.*$/u, "").trimEnd();
    if (cleaned.trim().length === 0) continue;
    if (!packagesSeen) {
      if (cleaned.trim() !== "packages:") return null;
      packagesSeen = true;
      continue;
    }
    const match = /^\s*-\s*(?:"([^"]+)"|'([^']+)'|([^\s]+))\s*$/u.exec(cleaned);
    const pattern = match?.[1] ?? match?.[2] ?? match?.[3];
    if (pattern === undefined || pattern.length === 0) return null;
    result.push(pattern);
  }
  return packagesSeen ? sortedUnique(result) : null;
}

function workspacePatternSupported(pattern: string): boolean {
  if (!pattern.includes("*") && !/[?\[\]{}]/u.test(pattern)) {
    return CANONICAL_PATH.test(pattern);
  }
  const prefix = SIMPLE_WORKSPACE_STAR.exec(pattern)?.[1];
  return prefix !== undefined && CANONICAL_PATH.test(prefix);
}

function workspacePatternMatches(path: string, pattern: string): boolean {
  if (!path.endsWith("/package.json")) return false;
  const directory = path.slice(0, -"/package.json".length);
  if (!pattern.includes("*")) return directory === pattern;
  const prefix = SIMPLE_WORKSPACE_STAR.exec(pattern)?.[1];
  if (prefix === undefined || !directory.startsWith(`${prefix}/`)) return false;
  const remainder = directory.slice(prefix.length + 1);
  return remainder.length > 0 && !remainder.includes("/");
}

function discoverWorkspace(
  files: Readonly<Record<string, string>>,
  allManifests: readonly PackageManifest[],
  root: PackageManifest | undefined,
): WorkspaceDiscovery {
  let patterns = packageWorkspacePatterns(root);
  let sourcePaths: readonly string[] = patterns === null ? [] : ["package.json"];

  if (patterns === null && files["pnpm-workspace.yaml"] !== undefined) {
    patterns = pnpmWorkspacePatterns(files["pnpm-workspace.yaml"]);
    sourcePaths = ["pnpm-workspace.yaml"];
    if (patterns === null) {
      return {
        state: "unsupported",
        kind: null,
        patterns: [],
        packageJsonPaths: root === undefined ? [] : ["package.json"],
        sourcePaths,
        reasonCode: "workspace_declaration_unsupported",
        reasonText: "pnpm-workspace.yaml exceeds the supported basic packages-list grammar.",
      };
    }
  }

  if (patterns === null) {
    return {
      state: "resolved",
      kind: "single",
      patterns: [],
      packageJsonPaths: root === undefined ? [] : ["package.json"],
      sourcePaths: [],
      reasonCode: null,
      reasonText: null,
    };
  }

  if (patterns.length === 0 || patterns.some((pattern) => !workspacePatternSupported(pattern))) {
    return {
      state: "unsupported",
      kind: null,
      patterns,
      packageJsonPaths: root === undefined ? [] : ["package.json"],
      sourcePaths,
      reasonCode: "workspace_declaration_unsupported",
      reasonText: "Basic workspace discovery supports canonical literal paths and one-segment trailing /* patterns only.",
    };
  }

  const nested = allManifests
    .map(({ path }) => path)
    .filter((path) => path !== "package.json")
    .filter((path) => patterns!.some((pattern) => workspacePatternMatches(path, pattern)));

  return {
    state: "resolved",
    kind: "basic",
    patterns,
    packageJsonPaths: sortedUnique([...(root === undefined ? [] : ["package.json"]), ...nested]),
    sourcePaths,
    reasonCode: null,
    reasonText: null,
  };
}

function discoverRunner(allManifests: readonly PackageManifest[]): DiscoveryResolution<JsTestRunner> {
  const sources: Record<JsTestRunner, string[]> = { vitest: [], jest: [] };
  for (const manifest of allManifests) {
    const dependencies = dependencyNames(manifest);
    for (const runner of ["vitest", "jest"] as const) {
      if (dependencies.has(runner)) sources[runner].push(manifest.path);
    }
  }
  const candidates = (["vitest", "jest"] as const).filter((runner) => sources[runner].length > 0);
  if (candidates.length === 0) {
    return {
      state: "absent",
      reasonCode: "js_test_runner_not_discovered",
      reasonText: "No supported project-declared Vitest or Jest runner was found.",
      sourcePaths: [],
    };
  }
  if (candidates.length > 1) {
    return {
      state: "ambiguous",
      candidates: [...candidates].sort(compareStrings),
      reasonCode: "js_test_runner_ambiguous",
      reasonText: "Both Vitest and Jest are declared in the discovered project scope.",
      sourcePaths: sortedUnique(candidates.flatMap((runner) => sources[runner])),
    };
  }
  const value = candidates[0]!;
  return { state: "resolved", value, sourcePaths: sortedUnique(sources[value]) };
}

function basename(path: string): string {
  const index = path.lastIndexOf("/");
  return index < 0 ? path : path.slice(index + 1);
}

function dirname(path: string): string {
  const index = path.lastIndexOf("/");
  return index < 0 ? "" : path.slice(0, index);
}

function scopeRoots(workspace: WorkspaceDiscovery): readonly string[] {
  if (workspace.packageJsonPaths.length === 0) return [""];
  return sortedUnique(
    workspace.packageJsonPaths.map((path) =>
      path === "package.json" ? "" : path.slice(0, -"/package.json".length),
    ),
  );
}

function configPaths(
  files: Readonly<Record<string, string>>,
  tool: keyof typeof TOOL_METADATA,
  allManifests: readonly PackageManifest[],
  roots: readonly string[],
): readonly string[] {
  const result = Object.keys(files).filter((path) => {
    if (!roots.includes(dirname(path))) return false;
    const name = basename(path);
    if (tool === "typescript") return /^tsconfig(?:\.[^/]+)?\.json$/u.test(name);
    if (tool === "eslint") {
      return /^eslint\.config\.(?:js|mjs|cjs|ts|mts|cts)$/u.test(name) ||
        /^\.eslintrc(?:\.(?:js|cjs|json|yaml|yml))?$/u.test(name);
    }
    if (tool === "vitest") return /^vitest\.config\.(?:js|mjs|cjs|ts|mts|cts)$/u.test(name);
    return /^jest\.config\.(?:js|mjs|cjs|ts|json)$/u.test(name);
  });
  if (tool === "jest") {
    for (const manifest of allManifests) {
      if (Object.prototype.hasOwnProperty.call(manifest.value, "jest")) result.push(manifest.path);
    }
  }
  return sortedUnique(result);
}

function executablePaths(
  files: Readonly<Record<string, string>>,
  binName: string,
  roots: readonly string[],
): readonly string[] {
  const result: string[] = [];
  for (const root of roots) {
    const prefix = root === "" ? "" : `${root}/`;
    for (const suffix of EXECUTABLE_SUFFIXES) {
      const path = `${prefix}node_modules/.bin/${binName}${suffix}`;
      if (files[path] !== undefined) result.push(path);
    }
  }
  return sortedUnique(result);
}

function discoverNodeTool(
  files: Readonly<Record<string, string>>,
  allManifests: readonly PackageManifest[],
  tool: keyof typeof TOOL_METADATA,
  roots: readonly string[],
): LocalNodeToolDiscovery {
  const metadata = TOOL_METADATA[tool];
  return {
    packageName: metadata.packageName,
    binName: metadata.binName,
    declarationPaths: allManifests
      .filter((manifest) => dependencyNames(manifest).has(metadata.packageName))
      .map(({ path }) => path)
      .sort(compareStrings),
    localExecutablePaths: executablePaths(files, metadata.binName, roots),
    configPaths: configPaths(files, tool, allManifests, roots),
  };
}

function discoverPytest(
  files: Readonly<Record<string, string>>,
  roots: readonly string[],
): DiscoveryResolution<"pytestBasic"> {
  const sourcePaths = sortedUnique(
    Object.entries(files)
      .filter(([path, content]) => {
        if (!roots.includes(dirname(path))) return false;
        const name = basename(path);
        return (
          name === "pytest.ini" ||
          (name === "pyproject.toml" && /^\s*\[tool\.pytest\.ini_options\]\s*$/mu.test(content)) ||
          (name === "setup.cfg" && /^\s*\[tool:pytest\]\s*$/mu.test(content)) ||
          (name === "tox.ini" && /^\s*\[pytest\]\s*$/mu.test(content))
        );
      })
      .map(([path]) => path),
  );
  if (sourcePaths.length === 0) {
    return {
      state: "absent",
      reasonCode: "pytest_basic_not_discovered",
      reasonText: "No clearly configured basic pytest project was found.",
      sourcePaths: [],
    };
  }
  if (sourcePaths.length > 1) {
    return {
      state: "ambiguous",
      candidates: ["pytestBasic"],
      reasonCode: "pytest_config_ambiguous",
      reasonText: "Multiple applicable pytest configuration files were discovered.",
      sourcePaths,
    };
  }
  return { state: "resolved", value: "pytestBasic", sourcePaths };
}

export function discoverProjectFromFiles(files: DiscoveryFileMap): ProjectDiscovery {
  const normalized = normalizeFiles(files);
  const allManifests = manifests(normalized);
  const root = allManifests.find(({ path }) => path === "package.json");
  const workspace = discoverWorkspace(normalized, allManifests, root);
  const packageJsonPaths = new Set(workspace.packageJsonPaths);
  const scopedManifests = allManifests.filter(({ path }) => packageJsonPaths.has(path));
  const invalidScopedManifest = scopedManifests.find(({ invalid }) => invalid);
  if (invalidScopedManifest !== undefined) {
    throw new DiscoveryError(
      "invalid_package_json",
      `invalid JSON in ${invalidScopedManifest.path}`,
      invalidScopedManifest.path,
    );
  }
  const roots = scopeRoots(workspace);

  return {
    semanticTasks: FIXED_SEMANTIC_TASKS,
    packageManager: discoverPackageManager(normalized, root),
    workspace,
    packageScriptAuthority: discoverPackageScriptAuthority(scopedManifests),
    jsTestRunner: discoverRunner(scopedManifests),
    pytestBasic: discoverPytest(normalized, roots),
    tools: {
      typescript: discoverNodeTool(normalized, scopedManifests, "typescript", roots),
      eslint: discoverNodeTool(normalized, scopedManifests, "eslint", roots),
      vitest: discoverNodeTool(normalized, scopedManifests, "vitest", roots),
      jest: discoverNodeTool(normalized, scopedManifests, "jest", roots),
    },
  };
}

const ASCOUT_CONFIG_PATH = "ascout.config.json";

export interface ChangedPathView {
  readonly path: string;
  readonly previous_path?: string;
}

export interface TaskCommandAuthority {
  readonly taskType: SemanticTaskType;
  readonly authorityPaths: readonly string[];
  readonly effectivePytestConfig: string | null;
}

export type TaskAuthoritySurfaces = Readonly<Record<SemanticTaskType, TaskCommandAuthority>>;

export interface CommandSurfaceClassifyOptions {
  readonly ascoutConfigPath?: string | null;
  readonly tasks?: Readonly<Partial<Record<SemanticTaskType, {
    readonly enabled?: boolean;
    readonly command?: readonly string[];
    readonly timeoutMs?: number;
    readonly disabledReason?: string;
  }>>> | null;
}

function configuredTaskSet(
  tasks: CommandSurfaceClassifyOptions["tasks"],
): ReadonlySet<SemanticTaskType> {
  if (tasks === undefined || tasks === null) return new Set();
  const result = new Set<SemanticTaskType>();
  for (const key of FIXED_SEMANTIC_TASKS) {
    const value = tasks[key];
    if (value === undefined || value === null) continue;
    if (
      value.command !== undefined ||
      value.enabled !== undefined ||
      value.timeoutMs !== undefined ||
      value.disabledReason !== undefined
    ) {
      result.add(key);
    }
  }
  return result;
}

function overriddenTaskSet(
  tasks: CommandSurfaceClassifyOptions["tasks"],
): ReadonlySet<SemanticTaskType> {
  if (tasks === undefined || tasks === null) return new Set();
  const result = new Set<SemanticTaskType>();
  for (const key of FIXED_SEMANTIC_TASKS) {
    const value = tasks[key];
    if (value?.command !== undefined) result.add(key);
  }
  return result;
}

function packageScriptOwners(
  discovery: ProjectDiscovery,
  task: SemanticTaskType,
): readonly string[] {
  switch (task) {
    case "typecheck":
      return discovery.packageScriptAuthority.typecheck;
    case "lint":
      return discovery.packageScriptAuthority.lint;
    case "test":
      return discovery.packageScriptAuthority.test;
    case "pytestBasic":
      return [];
  }
}

function testRunnerDeclarationPaths(discovery: ProjectDiscovery): readonly string[] {
  if (discovery.jsTestRunner.state === "resolved") {
    return discovery.tools[discovery.jsTestRunner.value].declarationPaths;
  }
  if (discovery.jsTestRunner.state === "ambiguous") {
    return sortedUnique([
      ...discovery.tools.vitest.declarationPaths,
      ...discovery.tools.jest.declarationPaths,
    ]);
  }
  return [];
}

function baseAuthorityPaths(
  discovery: ProjectDiscovery,
  task: SemanticTaskType,
): readonly string[] {
  switch (task) {
    case "typecheck":
      return sortedUnique([
        ...packageScriptOwners(discovery, "typecheck"),
        ...discovery.tools.typescript.declarationPaths,
        ...discovery.tools.typescript.configPaths,
      ]);
    case "lint":
      return sortedUnique([
        ...packageScriptOwners(discovery, "lint"),
        ...discovery.tools.eslint.declarationPaths,
        ...discovery.tools.eslint.configPaths,
      ]);
    case "test": {
      const runnerConfigs = discovery.jsTestRunner.state === "resolved"
        ? discovery.tools[discovery.jsTestRunner.value].configPaths
        : [];
      return sortedUnique([
        ...packageScriptOwners(discovery, "test"),
        ...testRunnerDeclarationPaths(discovery),
        ...runnerConfigs,
      ]);
    }
    case "pytestBasic": {
      const configs = discovery.pytestBasic.state === "resolved"
        ? discovery.pytestBasic.sourcePaths
        : [];
      return sortedUnique(configs);
    }
  }
}

export function classifyCommandSurfaces(
  discovery: ProjectDiscovery,
  options: CommandSurfaceClassifyOptions = {},
): TaskAuthoritySurfaces {
  const ascoutPath = options.ascoutConfigPath ?? ASCOUT_CONFIG_PATH;
  const configured = configuredTaskSet(options.tasks);
  const overridden = overriddenTaskSet(options.tasks);
  const result: Record<SemanticTaskType, TaskCommandAuthority> = {
    typecheck: { taskType: "typecheck", authorityPaths: [], effectivePytestConfig: null },
    lint: { taskType: "lint", authorityPaths: [], effectivePytestConfig: null },
    test: { taskType: "test", authorityPaths: [], effectivePytestConfig: null },
    pytestBasic: { taskType: "pytestBasic", authorityPaths: [], effectivePytestConfig: null },
  };

  for (const task of FIXED_SEMANTIC_TASKS) {
    let authorityPaths: readonly string[];
    if (overridden.has(task)) {
      authorityPaths = [ascoutPath];
    } else {
      const withBase = baseAuthorityPaths(discovery, task);
      const withAscout = configured.has(task)
        ? sortedUnique([...withBase, ascoutPath])
        : withBase;
      authorityPaths = withAscout;
    }

    let effectivePytestConfig: string | null = null;
    if (task === "pytestBasic" && discovery.pytestBasic.state === "resolved") {
      effectivePytestConfig = discovery.pytestBasic.sourcePaths[0] ?? null;
      if (effectivePytestConfig !== null && !authorityPaths.includes(effectivePytestConfig)) {
        authorityPaths = sortedUnique([...authorityPaths, effectivePytestConfig]);
      }
    }

    result[task] = {
      taskType: task,
      authorityPaths,
      effectivePytestConfig,
    };
  }

  return result;
}

export function intersectChangedAuthorityPaths(
  authorityPaths: readonly string[],
  changedFiles: readonly ChangedPathView[],
): readonly string[] {
  const authorities = new Set(authorityPaths);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const file of changedFiles) {
    for (const candidate of [file.path, file.previous_path]) {
      if (candidate === undefined || candidate.length === 0) continue;
      if (!authorities.has(candidate) || seen.has(candidate)) continue;
      seen.add(candidate);
      result.push(candidate);
    }
  }
  return result.sort(compareStrings);
}

function repositoryPath(root: string, absolutePath: string): string {
  const native = relative(root, absolutePath);
  const path = sep === "/" ? native : native.split(sep).join("/");
  assertPath(path);
  return path;
}

function containedByRoot(root: string, realPath: string): boolean {
  const candidate = relative(root, realPath);
  return candidate === "" || (!isAbsolute(candidate) && candidate !== ".." && !candidate.startsWith(`..${sep}`));
}

function realPathWithinRoot(root: string, absolutePath: string, sourcePath: string): string {
  let realPath: string;
  try {
    realPath = realpathSync(absolutePath);
  } catch {
    throw new DiscoveryError("repository_read_error", `unable to resolve ${sourcePath}`, sourcePath);
  }
  if (!containedByRoot(root, realPath)) {
    throw new DiscoveryError(
      "repository_read_error",
      `discovery path resolves outside the repository: ${sourcePath}`,
      sourcePath,
    );
  }
  return realPath;
}

function readBoundedText(root: string, absolutePath: string, sourcePath: string): string {
  const realPath = realPathWithinRoot(root, absolutePath, sourcePath);
  let size: number;
  try {
    size = statSync(realPath).size;
  } catch {
    throw new DiscoveryError("repository_read_error", `unable to inspect ${sourcePath}`, sourcePath);
  }
  if (size > MAX_DISCOVERY_FILE_BYTES) {
    throw new DiscoveryError(
      "repository_read_error",
      `discovery metadata exceeds ${MAX_DISCOVERY_FILE_BYTES} bytes: ${sourcePath}`,
      sourcePath,
    );
  }
  try {
    return readFileSync(realPath, "utf8");
  } catch {
    throw new DiscoveryError("repository_read_error", `unable to read ${sourcePath}`, sourcePath);
  }
}

function collectFiles(root: string): DiscoveryFileMap {
  const result: Record<string, string> = {};
  const ignoredDirectories = new Set([".git", ".ascout"]);
  const knownNames = new Set([
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "pnpm-workspace.yaml",
    "pytest.ini",
    "pyproject.toml",
    "setup.cfg",
    "tox.ini",
  ]);
  let seenEntries = 0;

  function noteEntry(): void {
    seenEntries += 1;
    if (seenEntries > MAX_DISCOVERY_ENTRIES) {
      throw new DiscoveryError(
        "repository_read_error",
        `discovery entry limit exceeded (${MAX_DISCOVERY_ENTRIES})`,
      );
    }
  }

  function relevantName(name: string): boolean {
    return (
      knownNames.has(name) ||
      /^tsconfig(?:\.[^/]+)?\.json$/u.test(name) ||
      /^eslint\.config\.(?:js|mjs|cjs|ts|mts|cts)$/u.test(name) ||
      /^\.eslintrc(?:\.(?:js|cjs|json|yaml|yml))?$/u.test(name) ||
      /^vitest\.config\.(?:js|mjs|cjs|ts|mts|cts)$/u.test(name) ||
      /^jest\.config\.(?:js|mjs|cjs|ts|json)$/u.test(name)
    );
  }

  function addExecutable(absolute: string): void {
    if (!existsSync(absolute)) return;
    const sourcePath = repositoryPath(root, absolute);
    const realPath = realPathWithinRoot(root, absolute, sourcePath);
    try {
      if (!statSync(realPath).isFile()) return;
    } catch {
      throw new DiscoveryError("repository_read_error", `unable to inspect ${sourcePath}`, sourcePath);
    }
    result[sourcePath] = "";
  }

  function visit(directory: string): void {
    let entries: readonly Dirent[];
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      throw new DiscoveryError("repository_read_error", "unable to inspect repository for discovery");
    }

    for (const entry of entries) {
      noteEntry();
      if (entry.isDirectory()) {
        if (ignoredDirectories.has(entry.name)) continue;
        if (entry.name === "node_modules") {
          const bin = join(directory, entry.name, ".bin");
          if (!existsSync(bin)) continue;
          for (const metadata of Object.values(TOOL_METADATA)) {
            for (const suffix of EXECUTABLE_SUFFIXES) {
              addExecutable(join(bin, `${metadata.binName}${suffix}`));
            }
          }
          continue;
        }
        visit(join(directory, entry.name));
        continue;
      }
      if (!entry.isFile() && !entry.isSymbolicLink()) continue;
      if (!relevantName(entry.name)) continue;

      const absolute = join(directory, entry.name);
      const sourcePath = repositoryPath(root, absolute);
      if (entry.isSymbolicLink()) {
        realPathWithinRoot(root, absolute, sourcePath);
      }
      result[sourcePath] = CONTENT_REQUIRED_NAMES.has(entry.name)
        ? readBoundedText(root, absolute, sourcePath)
        : "";
    }
  }

  visit(root);
  return result;
}

export interface DiscoveredProject {
  readonly root: string;
  readonly files: DiscoveryFileMap;
  readonly discovery: ProjectDiscovery;
}

export function collectDiscoveredProject(repositoryRoot: string): DiscoveredProject {
  const requestedRoot = resolve(repositoryRoot);
  let root: string;
  try {
    root = realpathSync(requestedRoot);
    if (!statSync(root).isDirectory()) {
      throw new DiscoveryError("invalid_repository_root", "repository root must be an existing directory");
    }
  } catch (error) {
    if (error instanceof DiscoveryError) throw error;
    throw new DiscoveryError("invalid_repository_root", "repository root must be an existing directory");
  }
  const files = collectFiles(root);
  return { root, files, discovery: discoverProjectFromFiles(files) };
}

export function discoverProject(repositoryRoot: string): ProjectDiscovery {
  return collectDiscoveredProject(repositoryRoot).discovery;
}
