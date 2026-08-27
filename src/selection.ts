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
}

const ROOT_LOCKFILES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);
const PACKAGE_MANAGER_CONFIG_PATHS = new Set([
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

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function changedPathCandidates(file: GitChangedFile): readonly string[] {
  return file.previous_path === undefined ? [file.path] : [file.path, file.previous_path];
}

function anyCandidateIn(file: GitChangedFile, paths: ReadonlySet<string>): boolean {
  return changedPathCandidates(file).some((path) => paths.has(path));
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

function manifestPaths(discovery: ProjectDiscovery): ReadonlySet<string> {
  return new Set(discovery.workspace.packageJsonPaths);
}

/**
 * Decides only pre-run uncertainty. Post-run coverage relationship gaps and a
 * possible second pass are deliberately outside T053 and remain T054 work.
 */
export function decidePreRunWidening(
  discovery: ProjectDiscovery,
  changedFiles: readonly GitChangedFile[],
): PreRunWideningDecision {
  const triggers = new Set<PreRunWidenTrigger>();
  const manifests = manifestPaths(discovery);
  const workspaceSources = new Set(discovery.workspace.sourcePaths);
  const compilerConfigs = new Set(discovery.tools.typescript.configPaths);
  const runnerConfigs = currentRunnerConfigPaths(discovery);

  for (const file of changedFiles) {
    const candidates = changedPathCandidates(file);

    if (anyCandidateIn(file, manifests)) triggers.add("dependency_surface_changed");
    if (candidates.some((path) => ROOT_LOCKFILES.has(path) || PACKAGE_MANAGER_CONFIG_PATHS.has(path))) {
      triggers.add("package_manager_surface_changed");
    }
    if (anyCandidateIn(file, workspaceSources)) triggers.add("workspace_surface_changed");
    if (anyCandidateIn(file, compilerConfigs)) triggers.add("compiler_surface_changed");
    if (
      anyCandidateIn(file, runnerConfigs) ||
      candidates.some((path) => DEFAULT_JS_TEST_SURFACE.test(path) || SNAPSHOT_SURFACE.test(path))
    ) {
      triggers.add("test_surface_changed");
    }

    const productionJsPath = candidates.some(
      (path) => JS_TS_SOURCE.test(path) && !DEFAULT_JS_TEST_SURFACE.test(path),
    );
    if (
      productionJsPath &&
      (file.change_kind === "deleted" || file.change_kind === "renamed" || file.change_kind === "type_changed")
    ) {
      triggers.add("path_relation_risk");
    }

    if (
      file.line_semantics === "binary_or_non_line" &&
      !candidates.some((path) => SNAPSHOT_SURFACE.test(path))
    ) {
      triggers.add("non_source_relation_risk");
    }
  }

  const ordered = [...triggers].sort(compareStrings);
  return { widened: ordered.length > 0, triggers: ordered };
}

export function initialSelection(
  testPlan: VitestTaskPlan | JestTaskPlan,
  widening: PreRunWideningDecision,
): SelectionV1 {
  const limitations = [SELECTION_COUNTS_NOT_OBSERVED_LIMITATION, UNSAFE_SELECTION_LIMITATION] as const;
  if (testPlan.state !== "planned") {
    return {
      mode: "full",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: null,
      deselected_test_count: null,
      total_test_count: null,
      widened: false,
      widen_triggers: [],
      passes: [],
      limitations,
    };
  }

  const scope = testPlan.workingDirectory === null
    ? ({ kind: "repository", path: null } as const)
    : ({ kind: "package", path: testPlan.workingDirectory } as const);
  const mode = testPlan.selectionMode ?? "native_related";
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
