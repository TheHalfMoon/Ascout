import type { ProjectDiscovery } from "./discovery.js";
import type { GitChangedFile } from "./git.js";
import {
  UNSAFE_SELECTION_LIMITATION,
  type SelectionV1,
} from "./receipt/model.js";
import type { JestTaskPlan } from "./tools/jest.js";
import type { VitestTaskPlan } from "./tools/vitest.js";

export const SELECTION_COUNTS_NOT_OBSERVED_LIMITATION = "selection_counts_not_observed" as const;

export type PreRunWidenTrigger =
  | "dependency_surface_changed"
  | "package_manager_surface_changed"
  | "compiler_surface_changed"
  | "path_relation_risk"
  | "test_surface_changed"
  | "workspace_surface_changed"
  | "non_source_relation_risk";

export interface PreRunWideningDecision {
  readonly widened: boolean;
  readonly triggers: readonly PreRunWidenTrigger[];
  readonly riskPaths: readonly string[];
}

const LOCKFILE_NAMES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);
const PACKAGE_MANAGER_CONFIG_NAMES = new Set([
  ".npmrc",
  ".yarnrc",
  ".yarnrc.yml",
  ".pnpmfile.cjs",
  "pnpmfile.cjs",
]);
const JS_TS_SOURCE = /\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$/u;
const DEFAULT_JS_TEST_SURFACE =
  /(?:^|\/)(?:__tests__\/.*\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)|[^/]+\.(?:test|spec)\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx))$/u;
const SNAPSHOT_SURFACE = /(?:^|\/)__snapshots__\/.*\.snap$/u;
const TYPESCRIPT_CONFIG_NAME = /^tsconfig(?:\.[^/]+)?\.json$/u;
const VITEST_CONFIG_NAME = /^vitest\.config\.(?:js|mjs|cjs|ts|mts|cts)$/u;
const JEST_CONFIG_NAME = /^jest\.config\.(?:js|mjs|cjs|ts|json)$/u;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function basename(path: string): string {
  const index = path.lastIndexOf("/");
  return index < 0 ? path : path.slice(index + 1);
}

function changedPathCandidates(file: GitChangedFile): readonly string[] {
  return file.previous_path === undefined ? [file.path] : [file.path, file.previous_path];
}

function isPackageManifest(path: string): boolean {
  return path === "package.json" || path.endsWith("/package.json");
}

function isPackageManagerSurface(path: string): boolean {
  const name = basename(path);
  return LOCKFILE_NAMES.has(name) || PACKAGE_MANAGER_CONFIG_NAMES.has(name);
}

function isCompilerConfig(path: string): boolean {
  return TYPESCRIPT_CONFIG_NAME.test(basename(path));
}

function isRunnerConfig(path: string): boolean {
  const name = basename(path);
  return VITEST_CONFIG_NAME.test(name) || JEST_CONFIG_NAME.test(name);
}

function currentRunnerConfigPaths(discovery: ProjectDiscovery): ReadonlySet<string> {
  if (discovery.jsTestRunner.state === "resolved") {
    return new Set(discovery.tools[discovery.jsTestRunner.value].configPaths);
  }
  return new Set([
    ...discovery.tools.vitest.configPaths,
    ...discovery.tools.jest.configPaths,
  ]);
}

function addRisk(
  triggers: Set<PreRunWidenTrigger>,
  riskPaths: Set<string>,
  trigger: PreRunWidenTrigger,
  paths: readonly string[],
): void {
  if (paths.length === 0) return;
  triggers.add(trigger);
  for (const path of paths) riskPaths.add(path);
}

/**
 * Decides only pre-run uncertainty. Path grammar for manifests, supported
 * package-manager files, and JS test/compiler configs is exact by basename or
 * discovery identity so deletion cannot erase a formerly relation-bearing
 * surface from the decision. Risk-bearing paths are retained so full-scope
 * planning is not distorted by unrelated changed files. Post-run coverage gaps
 * remain T054 work.
 */
export function decidePreRunWidening(
  discovery: ProjectDiscovery,
  changedFiles: readonly GitChangedFile[],
): PreRunWideningDecision {
  const triggers = new Set<PreRunWidenTrigger>();
  const riskPaths = new Set<string>();
  const workspaceSources = new Set(discovery.workspace.sourcePaths);
  const compilerConfigs = new Set(discovery.tools.typescript.configPaths);
  const runnerConfigs = currentRunnerConfigPaths(discovery);

  for (const file of changedFiles) {
    const candidates = changedPathCandidates(file);

    addRisk(
      triggers,
      riskPaths,
      "dependency_surface_changed",
      candidates.filter(isPackageManifest),
    );
    addRisk(
      triggers,
      riskPaths,
      "package_manager_surface_changed",
      candidates.filter(isPackageManagerSurface),
    );
    addRisk(
      triggers,
      riskPaths,
      "workspace_surface_changed",
      candidates.filter((path) => workspaceSources.has(path) || path === "pnpm-workspace.yaml"),
    );
    addRisk(
      triggers,
      riskPaths,
      "compiler_surface_changed",
      candidates.filter((path) => compilerConfigs.has(path) || isCompilerConfig(path)),
    );
    addRisk(
      triggers,
      riskPaths,
      "test_surface_changed",
      candidates.filter(
        (path) => runnerConfigs.has(path) || isRunnerConfig(path) || DEFAULT_JS_TEST_SURFACE.test(path) || SNAPSHOT_SURFACE.test(path),
      ),
    );

    if (file.change_kind === "deleted" || file.change_kind === "renamed" || file.change_kind === "type_changed") {
      addRisk(
        triggers,
        riskPaths,
        "path_relation_risk",
        candidates.filter(
          (path) => JS_TS_SOURCE.test(path) && !DEFAULT_JS_TEST_SURFACE.test(path) && !isRunnerConfig(path),
        ),
      );
    }

    if (file.line_semantics === "binary_or_non_line") {
      addRisk(
        triggers,
        riskPaths,
        "non_source_relation_risk",
        candidates.filter((path) => !SNAPSHOT_SURFACE.test(path)),
      );
    }
  }

  const orderedTriggers = [...triggers].sort(compareStrings);
  const orderedRiskPaths = [...riskPaths].sort(compareStrings);
  return {
    widened: orderedTriggers.length > 0,
    triggers: orderedTriggers,
    riskPaths: orderedRiskPaths,
  };
}

export function initialSelection(
  testPlan: VitestTaskPlan | JestTaskPlan,
  widening: PreRunWideningDecision,
  launchAllowed = true,
): SelectionV1 {
  const limitations = [SELECTION_COUNTS_NOT_OBSERVED_LIMITATION, UNSAFE_SELECTION_LIMITATION] as const;
  const scope = testPlan.state === "planned" && testPlan.workingDirectory !== null
    ? ({ kind: "package", path: testPlan.workingDirectory } as const)
    : ({ kind: "repository", path: null } as const);
  const mode = testPlan.state === "planned" ? (testPlan.selectionMode ?? "native_related") : "full";

  if (testPlan.state !== "planned" || !launchAllowed) {
    return {
      mode,
      initial_scope: scope,
      selected_test_count: null,
      deselected_test_count: null,
      total_test_count: null,
      widened: false,
      widen_triggers: [],
      passes: [],
      limitations,
    };
  }

  const widened = widening.widened && mode === "full";
  const triggers = widened ? [...widening.triggers] : [];

  return {
    mode,
    initial_scope: scope,
    selected_test_count: null,
    deselected_test_count: null,
    total_test_count: null,
    widened,
    widen_triggers: triggers,
    passes: [
      {
        ordinal: 1,
        mode,
        scope,
        trigger: widened ? triggers[0]! : null,
        selected_test_count: null,
        deselected_test_count: null,
        total_test_count: null,
      },
    ],
    limitations,
  };
}
