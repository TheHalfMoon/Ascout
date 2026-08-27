import type { LcovLinePoint } from "./coverage/lcov.js";
import type { ProjectDiscovery } from "./discovery.js";
import type { GitChangedFile } from "./git.js";
import {
  UNSAFE_SELECTION_LIMITATION,
  type SelectionV1,
} from "./receipt/model.js";
import type { JestTaskPlan } from "./tools/jest.js";
import type { VitestTaskPlan } from "./tools/vitest.js";

export const SELECTION_COUNTS_NOT_OBSERVED_LIMITATION = "selection_counts_not_observed" as const;
export const POST_RUN_EXERCISE_GAP_TRIGGER = "post_run_exercise_gap" as const;

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

export interface PostRunWideningDecision {
  readonly widened: boolean;
  readonly trigger: typeof POST_RUN_EXERCISE_GAP_TRIGGER | null;
  readonly relationGapPaths: readonly string[];
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
const TYPESCRIPT_DECLARATION_SOURCE = /\.d\.(?:ts|mts|cts)$/u;
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

function isChangedProductionSource(file: GitChangedFile): boolean {
  return (
    file.change_kind !== "deleted" &&
    file.line_semantics === "text" &&
    JS_TS_SOURCE.test(file.path) &&
    !TYPESCRIPT_DECLARATION_SOURCE.test(file.path) &&
    !DEFAULT_JS_TEST_SURFACE.test(file.path) &&
    !isRunnerConfig(file.path)
  );
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

/**
 * Produces planner-only changed-file carriers for the paths that actually
 * caused pre-run widening. Receipt comparison facts and admission decisions
 * continue to use the complete changed-file set.
 */
export function preRunPlanningChangedFiles(
  changedFiles: readonly GitChangedFile[],
  widening: PreRunWideningDecision,
): readonly GitChangedFile[] {
  if (!widening.widened) return changedFiles;

  const owners = new Map<string, GitChangedFile>();
  for (const file of changedFiles) {
    owners.set(file.path, file);
    if (file.previous_path !== undefined) owners.set(file.previous_path, file);
  }

  return widening.riskPaths.map((path) => {
    const source = owners.get(path);
    if (source === undefined) {
      throw new Error(`pre-run widening risk path has no changed-file owner: ${path}`);
    }
    return {
      path,
      change_kind: source.change_kind,
      line_semantics: source.line_semantics,
      changed_new_line_ranges: source.path === path ? source.changed_new_line_ranges : [],
    };
  });
}

/**
 * T054 is intentionally file-relation only. A changed production source needs
 * at least one normalized LCOV point before narrowed selection can be treated
 * as having a usable coverage relationship. A zero execution count is still a
 * usable relationship; T055 owns changed-line exercise/count semantics.
 */
export function decidePostRunWidening(
  changedFiles: readonly GitChangedFile[],
  firstPassMode: "native_related" | "full",
  coveragePoints: readonly LcovLinePoint[],
): PostRunWideningDecision {
  if (firstPassMode !== "native_related") {
    return { widened: false, trigger: null, relationGapPaths: [] };
  }

  const coveredPaths = new Set(coveragePoints.map(({ path }) => path));
  const relationGapPaths = changedFiles
    .filter(isChangedProductionSource)
    .map(({ path }) => path)
    .filter((path) => !coveredPaths.has(path));
  const ordered = [...new Set(relationGapPaths)].sort(compareStrings);

  return ordered.length === 0
    ? { widened: false, trigger: null, relationGapPaths: [] }
    : { widened: true, trigger: POST_RUN_EXERCISE_GAP_TRIGGER, relationGapPaths: ordered };
}

/** Planner-only carriers for T054 relation-gap paths; source comparison truth remains unchanged. */
export function postRunPlanningChangedFiles(
  changedFiles: readonly GitChangedFile[],
  widening: PostRunWideningDecision,
): readonly GitChangedFile[] {
  if (!widening.widened) return [];
  const owners = new Map(changedFiles.map((file) => [file.path, file] as const));
  return widening.relationGapPaths.map((path) => {
    const source = owners.get(path);
    if (source === undefined) {
      throw new Error(`post-run widening relation-gap path has no changed-file owner: ${path}`);
    }
    return {
      path,
      change_kind: source.change_kind,
      line_semantics: source.line_semantics,
      changed_new_line_ranges: source.changed_new_line_ranges,
    };
  });
}

/**
 * Records the one permitted T054 second pass only after that full pass actually
 * launches. Calling this on an already widened/two-pass selection is a no-op,
 * which keeps recursive widening impossible by construction.
 */
export function withPostRunWideningPass(
  selection: SelectionV1,
  workingDirectory: string | null,
): SelectionV1 {
  if (
    selection.widened ||
    selection.mode !== "native_related" ||
    selection.passes.length !== 1
  ) {
    return selection;
  }

  const scope = workingDirectory === null || workingDirectory === ""
    ? ({ kind: "repository", path: null } as const)
    : ({ kind: "package", path: workingDirectory } as const);

  return {
    ...selection,
    mode: "full",
    widened: true,
    widen_triggers: [POST_RUN_EXERCISE_GAP_TRIGGER],
    passes: [
      selection.passes[0]!,
      {
        ordinal: 2,
        mode: "full",
        scope,
        trigger: POST_RUN_EXERCISE_GAP_TRIGGER,
        selected_test_count: null,
        deselected_test_count: null,
        total_test_count: null,
      },
    ],
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
