import { existsSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";

import { composeSourceState, loadConfig } from "./check.js";
import {
  classifyCommandSurfaces,
  collectDiscoveredProject,
  type CommandSurfaceClassifyOptions,
} from "./discovery.js";
import {
  readContainedWorktreeText,
  readStagedChangedPaths,
  readWorkingTreeComparison,
  refuseUnsupportedRepository,
} from "./git.js";
import { redactExactValues, selectedSecretValues } from "./redact.js";
import { readLocalReviewConfigV1 } from "./assurance/review/local-review-provider.js";
import { runLocalReviewV1 } from "./assurance/review/local-review-run.js";
import {
  defaultRemoteReviewDepsV1,
  readRemoteReviewConfigV2,
  runRemoteReviewV1,
  REMOTE_REVIEW_ENGINE_ID,
  type RemoteDisclosureV1,
  type RemoteReviewInputV1,
} from "./assurance/review/remote-review.js";
import { buildModelNotRunReportV1 } from "./assurance/review/local-review-run.js";
import { configuredGitleaksPathV1 } from "./assurance/security/security-gitleaks.js";
import {
  buildDelegatedTaskV1,
  exportDelegatedTaskV1,
  ingestDelegatedFindingsV1,
  type DelegatedIngestResultV1,
  type DelegatedSourceV1,
} from "./assurance/review/delegated-review.js";
import {
  buildEmptyReviewScopeV1,
  buildReviewAbsenceReportV1,
  buildReviewCommandReportV1,
  buildReviewDriftReportV1,
  defaultUnavailableExecutionV1,
  type ReviewChangeV1,
  type ReviewReportV1,
} from "./assurance/review/review-command.js";
import {
  buildSecurityCommandReportV1,
  type SecurityCommandReportV1,
} from "./assurance/security/security-command.js";
import { runSecurityGitleaksV1, type SecurityGitleaksOutcomeV1 } from "./assurance/security/security-gitleaks.js";
import { buildTestCommandReportV1, type TestCommandReportV1 } from "./assurance/test/test-plan-command.js";

/**
 * The commands as functions (E8 part zero). Each returns its report and exit code, or an error
 * message for exit 2. None writes to stdout or stderr, and none ends the process, so a caller
 * other than the CLI can use them. The CLI prints exactly what it printed before.
 */
export const OPERATIONAL_ERROR_EXIT_CODE = 2 as const;

export type CommandResultV1<R> =
  | { readonly kind: "report"; readonly report: R; readonly exit_code: number }
  | { readonly kind: "error"; readonly message: string; readonly exit_code: typeof OPERATIONAL_ERROR_EXIT_CODE };

function report<R>(value: R, exit_code: number): CommandResultV1<R> {
  return { kind: "report", report: value, exit_code };
}

function failure<R>(message: string): CommandResultV1<R> {
  return { kind: "error", message, exit_code: OPERATIONAL_ERROR_EXIT_CODE };
}

export function redactLocalPathFromError(error: unknown, repositoryRoot: string): string {
  let message = String(error);
  const candidates = new Set([repositoryRoot, resolve(repositoryRoot)]);
  // Errors carry the on-disk spelling from native realpath, which can differ in case from the
  // working directory the user typed on Windows.
  for (const resolveReal of [realpathSync, realpathSync.native]) {
    try {
      candidates.add(resolveReal(repositoryRoot));
    } catch {
      // A failing path may not have a resolvable real path; lexical candidates still apply.
    }
  }
  for (const candidate of [...candidates]) candidates.add(candidate.replaceAll("\\", "/"));
  // Windows paths ignore case, so a match must too.
  const flags = process.platform === "win32" ? "giu" : "gu";
  const longestFirst = [...candidates].filter((candidate) => candidate.length > 0).sort((a, b) => b.length - a.length);
  for (const candidate of longestFirst) {
    message = message.replace(new RegExp(candidate.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), flags), "<repository>");
  }
  return message;
}

export function collectReviewChanges(
  repositoryRoot: string,
  headSha: string,
  changedFiles: ReturnType<typeof readWorkingTreeComparison>["changed_files"],
): ReviewChangeV1[] {
  const changes: ReviewChangeV1[] = [];
  const seen = new Set<string>();
  const add = (change: ReviewChangeV1): void => {
    if (!seen.has(change.path)) {
      seen.add(change.path);
      changes.push(change);
    }
  };
  const toChange = (file: (typeof changedFiles)[number]): ReviewChangeV1 => ({
    path: file.path,
    change_kind: file.change_kind,
    ...(file.previous_path === undefined ? {} : { previous_path: file.previous_path }),
  });
  for (const file of changedFiles) {
    if (file.change_kind !== "untracked") add(toChange(file));
  }
  for (const file of changedFiles) {
    if (file.change_kind === "untracked") add(toChange(file));
  }
  const previousPaths = new Set(changes.flatMap((change) => change.previous_path ?? []));
  for (const staged of readStagedChangedPaths(repositoryRoot, headSha)) {
    if (!previousPaths.has(staged.path)) add(staged);
  }
  return changes;
}

export interface ReviewOptionsV1 {
  readonly localModel?: boolean;
  readonly signal?: AbortSignal;
  /** Tests only: where review-provider.json lives. The CLI and MCP never set it. */
  readonly configHome?: string | undefined;
}

/** `ascout review`. Refuses an unsupported repository, as the CLI always has. */
export async function computeReviewV1(
  repositoryRoot: string,
  options: ReviewOptionsV1 = {},
): Promise<CommandResultV1<ReviewReportV1>> {
  try {
    refuseUnsupportedRepository(repositoryRoot);
    const sourceState = composeSourceState(repositoryRoot);
    const comparison = readWorkingTreeComparison(repositoryRoot, sourceState.head_sha);
    const changes = collectReviewChanges(repositoryRoot, sourceState.head_sha, comparison.changed_files);
    const endState = composeSourceState(repositoryRoot);
    if (endState.head_sha !== sourceState.head_sha || endState.tree_digest !== sourceState.tree_digest) {
      const drift = buildReviewDriftReportV1(sourceState.repository_id, sourceState, endState);
      return report(drift, drift.exit_code);
    }
    if (options.localModel === true && changes.length > 0) {
      const secrets = selectedSecretValues(process.env, { recognized_names: [], configured_names: [], minimum_value_bytes: 8 });
      const result = await runLocalReviewV1({
        target_id: sourceState.repository_id,
        head_sha: sourceState.head_sha,
        config: readLocalReviewConfigV1(repositoryRoot, { configHome: options.configHome }),
        changed_files: comparison.changed_files,
        changes,
        readText: (path, maxBytes) => readContainedWorktreeText(repositoryRoot, path, maxBytes),
        redact: (text) => redactExactValues(text, secrets),
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      });
      if (result.kind === "error") return failure(result.message);
      // The model can take minutes; a source that changed meanwhile was not the source reviewed.
      const afterState = composeSourceState(repositoryRoot);
      if (afterState.head_sha !== sourceState.head_sha || afterState.tree_digest !== sourceState.tree_digest) {
        const drift = buildReviewDriftReportV1(sourceState.repository_id, sourceState, afterState);
        return report(drift, drift.exit_code);
      }
      return report(result.report, result.report.exit_code);
    }
    const files = changes.map((change) => change.path).sort();
    const commandReport = buildReviewCommandReportV1(
      files.length === 0
        ? buildEmptyReviewScopeV1(sourceState.repository_id, sourceState.head_sha)
        : buildReviewAbsenceReportV1(
            sourceState.repository_id,
            sourceState.head_sha,
            defaultUnavailableExecutionV1(sourceState.head_sha, "profile:review-default", "capsule:review-default"),
            [{ group_id: "group:working-tree", files }],
          ),
      changes,
    );
    return report(commandReport, commandReport.exit_code);
  } catch (error) {
    return failure(redactLocalPathFromError(error, repositoryRoot));
  }
}

export interface DelegatedExportReportV1 {
  readonly kind: "review_task_export";
  readonly assurance: "NONE";
  readonly outcome: "TASK_EXPORTED" | "NOTHING_TO_REVIEW";
  readonly exit_code: 0 | 4;
  readonly reason_text: string;
  readonly task_sha256: string | null;
  readonly reviewed_files: readonly string[];
}

/** The source a delegated task is built from, read the same way review reads it, with drift checked. */
function delegatedSourceV1(repositoryRoot: string):
  | { readonly kind: "source"; readonly source: DelegatedSourceV1; readonly changes: ReviewChangeV1[]; readonly target_id: string }
  | { readonly kind: "drift"; readonly report: ReturnType<typeof buildReviewDriftReportV1> } {
  refuseUnsupportedRepository(repositoryRoot);
  const sourceState = composeSourceState(repositoryRoot);
  const comparison = readWorkingTreeComparison(repositoryRoot, sourceState.head_sha);
  const changes = collectReviewChanges(repositoryRoot, sourceState.head_sha, comparison.changed_files);
  const endState = composeSourceState(repositoryRoot);
  if (endState.head_sha !== sourceState.head_sha || endState.tree_digest !== sourceState.tree_digest) {
    return { kind: "drift", report: buildReviewDriftReportV1(sourceState.repository_id, sourceState, endState) };
  }
  const secrets = selectedSecretValues(process.env, { recognized_names: [], configured_names: [], minimum_value_bytes: 8 });
  return {
    kind: "source",
    target_id: sourceState.repository_id,
    changes,
    source: {
      repository_id: sourceState.repository_id,
      head_sha: sourceState.head_sha,
      tree_digest: sourceState.tree_digest,
      changed_files: comparison.changed_files,
      readText: (path, maxBytes) => readContainedWorktreeText(repositoryRoot, path, maxBytes),
      redact: (text) => redactExactValues(text, secrets),
    },
  };
}

/**
 * `ascout review --export-task <path>` (E10d): writes the review task for the operator's own agent to
 * a new owner-only file outside the repository. Nothing is reviewed yet, so this is a non-assurance
 * operation: exit 0 when a task was written, 4 when no changed file has text lines to review.
 */
export function computeDelegatedExportV1(repositoryRoot: string, path: string): CommandResultV1<DelegatedExportReportV1 | ReturnType<typeof buildReviewDriftReportV1>> {
  try {
    const read = delegatedSourceV1(repositoryRoot);
    if (read.kind === "drift") return report(read.report, read.report.exit_code);
    const task = buildDelegatedTaskV1(read.source);
    if (task === null) {
      const none: DelegatedExportReportV1 = { kind: "review_task_export", assurance: "NONE", outcome: "NOTHING_TO_REVIEW", exit_code: 4, reason_text: "No changed file has text lines to review, so no task was written.", task_sha256: null, reviewed_files: [] };
      return report(none, 4);
    }
    exportDelegatedTaskV1(repositoryRoot, path, task);
    const exported: DelegatedExportReportV1 = {
      kind: "review_task_export",
      assurance: "NONE",
      outcome: "TASK_EXPORTED",
      exit_code: 0,
      reason_text: "The review task was written for your own agent. Nothing has been reviewed yet; ingest its findings with ascout review --ingest. Like review, it covers working-tree and index changes only, not committed changes or ignored files. On Windows the file is not restricted to its owner, so keep it out of shared folders.",
      task_sha256: task.task_sha256,
      reviewed_files: task.reviewed_files,
    };
    return report(exported, 0);
  } catch (error) {
    return failure(redactLocalPathFromError(error, repositoryRoot));
  }
}

/**
 * `ascout review --ingest <path>` (E10d): checks a findings file from the operator's agent against
 * the task the current source defines. Findings on changed lines exit 1, otherwise 4; source drift
 * since export exits 3; a file for another task, or any malformed file, exits 2.
 */
export function computeDelegatedIngestV1(repositoryRoot: string, path: string): CommandResultV1<Extract<DelegatedIngestResultV1, { kind: "review" }>["report"] | ReturnType<typeof buildReviewDriftReportV1>> {
  try {
    const read = delegatedSourceV1(repositoryRoot);
    if (read.kind === "drift") return report(read.report, read.report.exit_code);
    const result = ingestDelegatedFindingsV1({ repositoryRoot, path, source: read.source, target_id: read.target_id, changes: read.changes });
    if (result.kind === "error") return failure(redactLocalPathFromError(result.message, repositoryRoot));
    if (result.kind === "drift") {
      const drift = buildReviewDriftReportV1(
        read.target_id,
        result.exported,
        { head_sha: read.source.head_sha, tree_digest: read.source.tree_digest },
        "The source changed since this review task was exported, so the findings answer a different source.",
      );
      return report(drift, drift.exit_code);
    }
    return report(result.report, result.report.exit_code);
  } catch (error) {
    return failure(redactLocalPathFromError(error, repositoryRoot));
  }
}

export interface RemoteDryRunReportV1 {
  readonly kind: "remote_review_dry_run";
  readonly assurance: "NONE";
  readonly exit_code: 4;
  readonly reason_text: string;
  readonly disclosure: RemoteDisclosureV1;
  readonly payload: string;
}

export interface RemoteReviewOptionsV1 {
  readonly dryRun: boolean;
  readonly signal?: AbortSignal;
  /** Tests only: where review-remote.json lives. The CLI never sets it. */
  readonly configHome?: string | undefined;
  /** Tests only: replaces the terminal, the payload scan, DNS, and the network. The CLI never sets it. */
  readonly deps?: Pick<RemoteReviewInputV1, "confirm" | "scan" | "resolve" | "transport">;
}

/**
 * `ascout review --remote-model [--dry-run]` (E10c): an operator-paid model on a third-party API, off
 * by default. Every refusal before sending leaves the change unreviewed (exit 4); `--dry-run` shows
 * what would be sent and sends nothing (exit 4). Findings exit 1; nothing ever exits 0.
 */
export async function computeRemoteReviewV1(repositoryRoot: string, options: RemoteReviewOptionsV1): Promise<CommandResultV1<unknown>> {
  try {
    const read = delegatedSourceV1(repositoryRoot);
    if (read.kind === "drift") return report(read.report, read.report.exit_code);
    if (read.changes.length === 0) {
      const empty = buildReviewCommandReportV1(buildEmptyReviewScopeV1(read.target_id, read.source.head_sha), []);
      return report(empty, empty.exit_code);
    }
    const result = await runRemoteReviewV1({
      repositoryRoot,
      target_id: read.target_id,
      head_sha: read.source.head_sha,
      config: readRemoteReviewConfigV2(repositoryRoot, { configHome: options.configHome }),
      changed_files: read.source.changed_files,
      changes: read.changes,
      readText: read.source.readText,
      redact: read.source.redact,
      gitleaksPath: configuredGitleaksPathV1(),
      dryRun: options.dryRun,
      env: process.env,
      ...(options.signal === undefined ? {} : { signal: options.signal }),
      ...(options.deps ?? defaultRemoteReviewDepsV1(repositoryRoot, configuredGitleaksPathV1(), options.signal)),
    });
    if (result.kind === "error") return failure(result.message);
    if (result.kind === "dry_run") {
      const dry: RemoteDryRunReportV1 = {
        kind: "remote_review_dry_run",
        assurance: "NONE",
        exit_code: 4,
        reason_text: "Dry run: this is what would be sent. Nothing was sent, scanned, or reviewed.",
        disclosure: result.disclosure,
        payload: result.payload,
      };
      return report(dry, 4);
    }
    if (result.kind === "not_run") {
      const notRun = buildModelNotRunReportV1({
        target_id: read.target_id,
        head_sha: read.source.head_sha,
        changes: read.changes,
        status: "REFUSED",
        reasons: [result.reason],
        engine_id: REMOTE_REVIEW_ENGINE_ID,
        binary_name: "remote",
        resolved_path: result.disclosure?.host ?? "none",
      });
      return report(notRun, notRun.exit_code);
    }
    // A model can take minutes; a source that changed meanwhile was not the source reviewed.
    const after = composeSourceState(repositoryRoot);
    if (after.head_sha !== read.source.head_sha || after.tree_digest !== read.source.tree_digest) {
      const drift = buildReviewDriftReportV1(read.target_id, { head_sha: read.source.head_sha, tree_digest: read.source.tree_digest }, after);
      return report(drift, drift.exit_code);
    }
    return report(result.report, result.report.exit_code);
  } catch (error) {
    return failure(redactLocalPathFromError(error, repositoryRoot));
  }
}

export type SecurityReportV1 =
  | { readonly engine: "gitleaks"; readonly report: Exclude<SecurityGitleaksOutcomeV1, { kind: "error" }>["report"] }
  | { readonly engine: "none"; readonly report: SecurityCommandReportV1 };

/**
 * `ascout security`. With no Gitleaks path it reads nothing and runs nothing. A null root means
 * the working directory is gone, which counts as outside a repository.
 */
export async function computeSecurityV1(
  root: string | null,
  gitleaksPath: string | null,
  signal?: AbortSignal,
): Promise<CommandResultV1<SecurityReportV1>> {
  if (gitleaksPath === null) {
    const none = buildSecurityCommandReportV1();
    return report({ engine: "none", report: none }, none.exit_code);
  }
  const outcome = await runSecurityGitleaksV1(root, gitleaksPath, signal === undefined ? {} : { signal });
  if (outcome.kind === "error") return failure(outcome.message);
  return report({ engine: "gitleaks", report: outcome.report }, outcome.report.exit_code);
}

/** `ascout test --plan`: a non-assurance plan that reads no repository. */
export function computeTestPlanV1(profile: string): CommandResultV1<TestCommandReportV1> {
  const plan = buildTestCommandReportV1(profile, true);
  return report(plan, plan.exit_code);
}

export const DOCTOR_REPORT_SCHEMA_VERSION = 1 as const;
const DOCTOR_TASKS = ["typecheck", "lint", "pytestBasic", "test"] as const;
const CHANGE_KINDS = ["added", "modified", "deleted", "renamed", "type_changed", "untracked"] as const;

export interface DoctorReportV1 {
  readonly kind: "doctor";
  readonly schema_version: typeof DOCTOR_REPORT_SCHEMA_VERSION;
  readonly exit_code: 0;
  readonly repository: {
    readonly identity: string;
    readonly identity_kind: string;
    readonly portable: boolean;
    readonly config_source: "repository_config" | "built_in_defaults";
  };
  readonly project: {
    readonly workspace_kind: string | null;
    readonly package_manager: string;
    readonly js_test_runner: string;
    readonly pytest_basic: string;
  };
  readonly authority: Readonly<Record<(typeof DOCTOR_TASKS)[number], {
    readonly authority_path_count: number;
    readonly effective_pytest_config: "present" | "absent";
  }>>;
  readonly changed_files: {
    readonly count: number;
    readonly by_kind: Readonly<Partial<Record<(typeof CHANGE_KINDS)[number], number>>>;
  };
}

/** `ascout doctor`: a diagnostic. It runs no task. */
export function computeDoctorV1(repositoryRoot: string): CommandResultV1<DoctorReportV1> {
  try {
    refuseUnsupportedRepository(repositoryRoot);
    const { root, discovery } = collectDiscoveredProject(repositoryRoot);
    const { config } = loadConfig(root);
    const sourceState = composeSourceState(root);
    const changedFiles = readWorkingTreeComparison(root, sourceState.head_sha).changed_files;
    const classifyOptions: CommandSurfaceClassifyOptions = {
      ascoutConfigPath: "ascout.config.json",
      tasks: config.tasks ?? null,
    };
    const surfaces = classifyCommandSurfaces(discovery, classifyOptions);
    const byKind: Partial<Record<(typeof CHANGE_KINDS)[number], number>> = {};
    for (const file of changedFiles) {
      const kind = file.change_kind as (typeof CHANGE_KINDS)[number];
      byKind[kind] = (byKind[kind] ?? 0) + 1;
    }
    const resolved = (value: { state: string; value?: unknown; reasonCode?: unknown }): string =>
      String(value.state === "resolved" ? value.value : value.reasonCode);
    const authority = Object.fromEntries(DOCTOR_TASKS.map((task) => [task, {
      authority_path_count: surfaces[task].authorityPaths.length,
      effective_pytest_config: surfaces[task].effectivePytestConfig === null ? "absent" as const : "present" as const,
    }])) as DoctorReportV1["authority"];
    return report<DoctorReportV1>({
      kind: "doctor",
      schema_version: DOCTOR_REPORT_SCHEMA_VERSION,
      exit_code: 0,
      repository: {
        identity: sourceState.repository_id,
        identity_kind: sourceState.repository_id_kind,
        portable: sourceState.portable,
        config_source: existsSync(join(root, "ascout.config.json")) ? "repository_config" : "built_in_defaults",
      },
      project: {
        workspace_kind: discovery.workspace.kind,
        package_manager: resolved(discovery.packageManager),
        js_test_runner: resolved(discovery.jsTestRunner),
        pytest_basic: resolved(discovery.pytestBasic),
      },
      authority,
      changed_files: { count: changedFiles.length, by_kind: byKind },
    }, 0);
  } catch (error) {
    return failure(`Error during doctor: ${redactLocalPathFromError(error, repositoryRoot)}`);
  }
}

/** The doctor text, byte for byte what `ascout doctor` printed before it had a JSON form. */
export function renderDoctorTerminalV1(doctor: DoctorReportV1): string {
  const lines: string[] = [];
  lines.push("=== Doctor Output ===\n");
  lines.push(`Repository identity: ${doctor.repository.identity}`);
  lines.push(`Repository identity kind: ${doctor.repository.identity_kind}`);
  lines.push(`Portable identity: ${doctor.repository.portable}`);
  lines.push(`Config source: ${doctor.repository.config_source}`);
  lines.push("\n--- Discovered Project ---");
  lines.push(`Workspace kind: ${doctor.project.workspace_kind}`);
  lines.push(`Package manager: ${doctor.project.package_manager}`);
  lines.push(`Js test runner: ${doctor.project.js_test_runner}`);
  lines.push(`Pytest basic: ${doctor.project.pytest_basic}`);
  lines.push("\n--- Authority Classification ---");
  for (const task of DOCTOR_TASKS) {
    lines.push(`${task}:`);
    lines.push(`  authorityPathCount: ${doctor.authority[task].authority_path_count}`);
    lines.push(`  effectivePytestConfig: ${doctor.authority[task].effective_pytest_config}`);
  }
  lines.push("\n--- Changed Files ---");
  lines.push(`Count: ${doctor.changed_files.count}`);
  for (const kind of CHANGE_KINDS) {
    const count = doctor.changed_files.by_kind[kind] ?? 0;
    if (count > 0) lines.push(`  ${kind}: ${count}`);
  }
  return lines.join("\n");
}
