import { createHash, randomBytes } from "node:crypto";
import { type BigIntStats, closeSync, fstatSync, fsyncSync, ftruncateSync, mkdirSync, openSync, readFileSync, readSync, realpathSync, statSync, writeFileSync, writeSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  FIXED_SEMANTIC_TASKS,
  classifyCommandSurfaces,
  collectDiscoveredProject,
  intersectChangedAuthorityPaths,
  type ChangedPathView,
  type CommandSurfaceClassifyOptions,
  type ProjectDiscovery,
  type SemanticTaskType,
} from "./discovery.js";
import { configDigestV1, parseConfigV1Json, type ConfigV1 } from "./config.js";
import { normalizeLcovLineCoverage, normalizeLcovBranchCoverage, type LcovLinePoint, type LcovBranchPoint } from "./coverage/lcov.js";
import { buildChangedLineExercise } from "./exercise.js";
import { observeEnvironment } from "./environment.js";
import {
  readGitHeadState,
  readTreeDigestV1,
  readWorkingTreeComparison,
  resolveRepositoryIdentity,
  type GitChangedFile,
} from "./git.js";
import { acquireRunLock } from "./lock.js";
import { runProcess } from "./process.js";
import {
  redactExactValues,
  redactPersistedArgv,
  selectedSecretValues,
  type RedactionEnv,
  type RedactionPolicy,
} from "./redact.js";
import { createRunDirectory } from "./run.js";
import { buildReceipt, renderTerminalSummary } from "./receipt/build.js";
import { renderReceiptJson } from "./receipt/json.js";
import {
  UNSAFE_SELECTION_LIMITATION,
  validateReceiptSemantics,
  type ArtifactV1,
  type ChangedFileV1,
  type ComparisonV1,
  type EvidenceV1,
  type ExecutionAdmission,
  type ExerciseV1,
  type FindingV1,
  type ReceiptV1,
  type SelectionV1,
  type SourceStateV1,
  type TaskResultV1,
  type TestChangeV1,
} from "./receipt/model.js";
import {
  decidePostRunWidening,
  decidePreRunWidening,
  initialSelection,
  postRunPlanningChangedFiles,
  preRunPlanningChangedFiles,
  SELECTION_COUNTS_NOT_OBSERVED_LIMITATION,
  withPostRunWideningPass,
} from "./selection.js";
import {
  buildNormalizedTestFinding,
  failingTestIdentities,
  normalizedAggregateTestStatus,
  observationsForIdentity,
  parseTestAssertionObservations,
  type FailingTestIdentity,
  type TestAssertionObservation,
} from "./test-reproduction.js";
import { planESLintTask } from "./tools/eslint.js";
import { planJestTargetedRerun } from "./tools/jest-rerun.js";
import { planJestTask, type JestTaskPlan, type PlannedJestTask } from "./tools/jest.js";
import { planPytestBasicTask } from "./tools/pytest.js";
import { planTypeScriptTask } from "./tools/typescript.js";
import { planVitestTargetedRerun } from "./tools/vitest-rerun.js";
import { planVitestTask, type PlannedVitestTask, type VitestTaskPlan } from "./tools/vitest.js";

export { SELECTION_COUNTS_NOT_OBSERVED_LIMITATION } from "./selection.js";

export const COMMAND_SURFACE_CHANGED_REASON_CODE = "command_surface_changed";
export const COMMAND_SURFACE_CHANGED_REASON_TEXT =
  "effective command or configuration authority changed in this invocation";

/**
 * Refusal descriptor for an applicable task whose effective command surface
 * changed in this invocation. Admission refusals are always NOT_RUN results:
 * admission itself never produces BLOCKED. BLOCKED is reserved for genuine
 * validity dependencies determined outside admission.
 */
export interface AdmissionRefusal {
  readonly status: "NOT_RUN";
  readonly reasonCode: typeof COMMAND_SURFACE_CHANGED_REASON_CODE;
  readonly reasonText: string;
}

export interface TaskAdmissionDecision {
  readonly taskType: SemanticTaskType;
  readonly commandSurfaceChanged: boolean;
  readonly changedAuthorityPaths: readonly string[];
  readonly executionAdmission: ExecutionAdmission;
  /** False means the task process must not launch for this task in this run. */
  readonly launchAllowed: boolean;
  readonly refusal: AdmissionRefusal | null;
}

export type RunAdmissionDecisions = Readonly<Record<SemanticTaskType, TaskAdmissionDecision>>;

export interface RunAdmissionOptions extends CommandSurfaceClassifyOptions {
  /**
   * Per-invocation explicit human admission supplied on the command line only.
   * It is never persisted as a trust grant and must not be supplied by agent
   * automation.
   */
  readonly allowChangedCommandSurface?: boolean;
}

function emptyDecision(taskType: SemanticTaskType): TaskAdmissionDecision {
  return {
    taskType,
    commandSurfaceChanged: false,
    changedAuthorityPaths: [],
    executionAdmission: "normal",
    launchAllowed: true,
    refusal: null,
  };
}

export function decideTaskAdmission(
  taskType: SemanticTaskType,
  authorityPaths: readonly string[],
  changedFiles: readonly ChangedPathView[],
  allowChangedCommandSurface: boolean,
): TaskAdmissionDecision {
  const changedAuthorityPaths = intersectChangedAuthorityPaths(authorityPaths, changedFiles);

  if (changedAuthorityPaths.length === 0) {
    return emptyDecision(taskType);
  }

  if (allowChangedCommandSurface) {
    return {
      taskType,
      commandSurfaceChanged: true,
      changedAuthorityPaths,
      executionAdmission: "explicit_changed_surface_override",
      launchAllowed: true,
      refusal: null,
    };
  }

  return {
    taskType,
    commandSurfaceChanged: true,
    changedAuthorityPaths,
    executionAdmission: "refused_changed_surface",
    launchAllowed: false,
    refusal: {
      status: "NOT_RUN",
      reasonCode: COMMAND_SURFACE_CHANGED_REASON_CODE,
      reasonText: COMMAND_SURFACE_CHANGED_REASON_TEXT,
    },
  };
}

/**
 * Computes the per-run admission decision for each fixed semantic task.
 *
 * Tasks are independent by default: each decision is derived only from that
 * task's own effective authority paths, so one task's refusal never blocks or
 * alters another task's admission. No admission outcome is BLOCKED.
 */
export function decideRunAdmissions(
  discovery: ProjectDiscovery,
  changedFiles: readonly ChangedPathView[],
  options: RunAdmissionOptions = {},
): RunAdmissionDecisions {
  const { allowChangedCommandSurface = false, ...classifyOptions } = options;
  const surfaces = classifyCommandSurfaces(discovery, classifyOptions);
  const result = {} as Record<SemanticTaskType, TaskAdmissionDecision>;

  for (const task of FIXED_SEMANTIC_TASKS) {
    result[task] = decideTaskAdmission(
      task,
      surfaces[task].authorityPaths,
      changedFiles,
      allowChangedCommandSurface,
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// T041 — `ascout check` pipeline wiring
// ---------------------------------------------------------------------------

const ASCOUT_CONFIG_PATH = "ascout.config.json";
const MAX_CONFIG_BYTES = 1024 * 1024;
const DEFAULT_TASK_TIMEOUT_MS = 600_000;
const DEFAULT_TERMINATION_GRACE_MS = 5_000;
const TASK_CAPTURE_CAP_BYTES = 8 * 1024 * 1024;
const MIN_SECRET_VALUE_BYTES = 8;
const LCOV_NO_BRANCH_DATA_REASON = "no usable branch coverage records";

export interface CheckRunOptions {
  /**
   * Per-invocation explicit human admission from the command line. It is never
   * persisted, never read from configuration or environment, and never supplied
   * by agent automation.
   */
  readonly allowChangedCommandSurface?: boolean;
}

export interface CheckOutcome {
  readonly receipt: ReceiptV1;
  readonly terminalSummary: string;
}

interface NormalizedPlan {
  readonly state: "planned" | "not_run" | "not_applicable";
  readonly authorizedBy: TaskResultV1["authorized_by"];
  readonly sourcePath: string | null;
  readonly argv: readonly string[];
  readonly workingDirectory: string | null;
  readonly reasonCode: string | null;
  readonly reasonText: string | null;
}

function normalizePlan(plan: unknown): NormalizedPlan {
  const candidate = plan as {
    state: NormalizedPlan["state"];
    authorizedBy: NormalizedPlan["authorizedBy"];
    sourcePath: string | null;
    argv: readonly string[];
    workingDirectory: string | null;
    reasonCode: string | null;
    reasonText: string | null;
  };
  return {
    state: candidate.state,
    authorizedBy: candidate.authorizedBy,
    sourcePath: candidate.sourcePath,
    argv: [...candidate.argv],
    workingDirectory: candidate.workingDirectory,
    reasonCode: candidate.reasonCode,
    reasonText: candidate.reasonText,
  };
}

function generateRunId(): string {
  // Zero-padded epoch prefix keeps lexical run-id order aligned with creation
  // order so completed-run retention prunes oldest first.
  return `${String(Date.now()).padStart(15, "0")}-${randomBytes(6).toString("hex")}`;
}

export function composeSourceState(repositoryRoot: string): SourceStateV1 {
  const identity = resolveRepositoryIdentity(repositoryRoot);
  const head = readGitHeadState(repositoryRoot);
  const tree = readTreeDigestV1(repositoryRoot);
  return {
    repository_id: identity.repository_id,
    repository_id_kind: identity.repository_id_kind,
    portable: identity.portable,
    head_sha: head.head_sha,
    detached: head.detached,
    shallow: head.shallow,
    tree_digest_version: tree.tree_digest_version,
    tree_digest: tree.tree_digest,
    tracked_index_entry_count: tree.tracked_index_entry_count,
    unstaged_changed_count: tree.unstaged_changed_count,
    included_untracked_count: tree.included_untracked_count,
  };
}

export interface VerificationAssetClassification {
  readonly isTestFile: boolean;
  readonly isSnapshot: boolean;
}

const JAVASCRIPT_TEST_FILE = /\.(?:test|spec)\.(?:[cm]?[jt]s|[jt]sx)$/u;
const PYTHON_TEST_FILE = /^(?:test_.+|.+_test)\.py$/u;

export function classifyVerificationAssetPath(path: string): VerificationAssetClassification {
  const segments = path.split("/");
  const fileName = segments[segments.length - 1] ?? "";
  const isSnapshot = segments.includes("__snapshots__") && fileName.endsWith(".snap");
  const isTestFile = !isSnapshot && (
    JAVASCRIPT_TEST_FILE.test(fileName) ||
    PYTHON_TEST_FILE.test(fileName)
  );
  return { isTestFile, isSnapshot };
}

export function deriveTestChanges(changedFiles: readonly GitChangedFile[]): readonly TestChangeV1[] {
  const facts: TestChangeV1[] = [];
  for (const file of changedFiles) {
    const current = classifyVerificationAssetPath(file.path);
    const previous = file.change_kind === "renamed" && file.previous_path !== undefined
      ? classifyVerificationAssetPath(file.previous_path)
      : null;

    if (current.isTestFile) {
      facts.push({
        kind: file.change_kind === "deleted" ? "test_file_deleted" : "test_file_changed",
        path: file.path,
        source: "git_diff",
      });
    } else if (previous?.isTestFile === true) {
      facts.push({
        kind: "test_file_deleted",
        path: file.previous_path!,
        source: "git_diff",
      });
    }

    if (current.isSnapshot && file.change_kind !== "untracked") {
      facts.push({
        kind: file.change_kind === "deleted" ? "snapshot_deleted" : "snapshot_changed",
        path: file.path,
        source: "git_diff",
      });
    } else if (previous?.isSnapshot === true) {
      facts.push({
        kind: "snapshot_deleted",
        path: file.previous_path!,
        source: "git_diff",
      });
    }
  }
  return facts;
}

function toChangedFileV1(file: GitChangedFile): ChangedFileV1 {
  const classification = classifyVerificationAssetPath(file.path);
  return {
    path: file.path,
    ...(file.previous_path === undefined ? {} : { previous_path: file.previous_path }),
    change_kind: file.change_kind,
    line_semantics: file.line_semantics,
    changed_new_line_ranges: file.changed_new_line_ranges,
    is_test_file: classification.isTestFile,
    is_snapshot: classification.isSnapshot,
    // T038 admission uses effective authority paths directly. This field remains
    // untouched here because T068 owns only factual test/snapshot classification.
    is_command_surface: false,
  };
}

export function loadConfig(repositoryRoot: string): { config: ConfigV1; digest: string } {
  const path = join(repositoryRoot, ASCOUT_CONFIG_PATH);
  let raw: Buffer;
  try {
    raw = readFileSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const config: ConfigV1 = { version: 1 };
      return { config, digest: configDigestV1(config) };
    }
    throw error;
  }
  if (raw.byteLength > MAX_CONFIG_BYTES) {
    throw new Error(`${ASCOUT_CONFIG_PATH} exceeds ${MAX_CONFIG_BYTES} bytes`);
  }

  const config = parseConfigV1Json(raw.toString("utf8"));
  return { config, digest: configDigestV1(config) };
}

function taskTimeoutMs(config: ConfigV1, task: SemanticTaskType): number {
  return config.tasks?.[task]?.timeoutMs ?? config.timeouts?.defaultTaskMs ?? DEFAULT_TASK_TIMEOUT_MS;
}

function workingDirectoryPath(repositoryRoot: string, workingDirectory: string | null): string {
  if (workingDirectory === null || workingDirectory === "") return repositoryRoot;
  return resolve(repositoryRoot, ...workingDirectory.split("/"));
}

function emptyExercise(): ExerciseV1 {
  // No usable normalized test coverage means T055 has no trustworthy line
  // intersection input. Task/selection/error semantics still keep the run
  // incomplete without inventing exercise evidence.
  return {
    changed_executable_lines: 0,
    exercised_lines: 0,
    not_exercised_lines: 0,
    unresolved_lines: 0,
    changed_files_with_zero_exercised_lines: 0,
    records: [],
  };
}

interface PersistedCapture {
  readonly artifact: ArtifactV1;
  readonly evidence: EvidenceV1;
}

function persistCapture(
  runId: string,
  taskId: SemanticTaskType,
  sequence: number,
  rawPath: string,
  fileName: string,
  bytes: Buffer,
  truncated: boolean,
  secrets: readonly string[],
): PersistedCapture {
  const rawText = bytes.toString("utf8");
  const text = redactExactValues(rawText, secrets);
  const persisted = Buffer.from(text, "utf8");
  const capturePath = join(rawPath, fileName);
  let captureFd: number | null = null;
  try {
    captureFd = openSync(capturePath, "wx", 0o600);
    writeFileSync(captureFd, persisted);
  } finally {
    if (captureFd !== null) closeSync(captureFd);
  }

  const sha256 = createSha256(persisted);
  const artifactId = `${taskId}.${fileName}`;
  const redacted = secrets.some((secret) => rawText.includes(secret));

  return {
    artifact: {
      artifact_id: artifactId,
      task_id: taskId,
      relative_run_path: `raw/${fileName}`,
      kind: "process_output",
      sha256,
      byte_length: persisted.byteLength,
      redacted,
      truncated,
    },
    evidence: {
      evidence_id: `${taskId}.e${sequence}`,
      run_id: runId,
      task_id: taskId,
      sequence,
      kind: "process_result",
      sha256,
      artifact_id: artifactId,
      redacted,
      truncated,
    },
  };
}

function createSha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

interface ExecutedTask {
  readonly task: TaskResultV1;
  readonly evidence: readonly EvidenceV1[];
  readonly artifacts: readonly ArtifactV1[];
}

interface TestMachineResultRecord {
  readonly runner: "vitest" | "jest";
  readonly text: string;
  readonly evidenceId: string;
  readonly basePlan: PlannedVitestTask | PlannedJestTask;
}

interface ExecutedTestTask extends ExecutedTask {
  readonly coveragePoints: readonly LcovLinePoint[] | null;
  readonly branchPoints: readonly LcovBranchPoint[] | null;
  readonly selectedTestCounts: readonly (number | null)[];
  readonly machineResults: readonly TestMachineResultRecord[];
}

interface ExecutePlannedTaskOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly toolName?: string;
  readonly toolVersion?: string;
  readonly captureFilePrefix?: string;
  readonly evidenceSequenceStart?: number;
}

async function executePlannedTask(
  repositoryRoot: string,
  runId: string,
  rawPath: string,
  taskId: SemanticTaskType,
  plan: NormalizedPlan & { state: "planned" },
  decision: TaskAdmissionDecision,
  secrets: readonly string[],
  timeoutMs: number,
  options: ExecutePlannedTaskOptions = {},
): Promise<ExecutedTask> {
  const startedMs = Date.now();
  const startedAt = new Date(startedMs).toISOString();
  const result = await runProcess({
    file: plan.argv[0]!,
    argv: plan.argv.slice(1),
    cwd: workingDirectoryPath(repositoryRoot, plan.workingDirectory),
    ...(options.env === undefined ? {} : { env: options.env }),
    timeout_ms: timeoutMs,
    termination_grace_ms: DEFAULT_TERMINATION_GRACE_MS,
    capture_cap_bytes: TASK_CAPTURE_CAP_BYTES,
  });
  const finishedMs = Date.now();
  const finishedAt = new Date(finishedMs).toISOString();
  const durationMs = finishedMs - startedMs;

  const captureFilePrefix = options.captureFilePrefix ?? taskId;
  const evidenceSequenceStart = options.evidenceSequenceStart ?? 1;
  const stdoutPersisted = persistCapture(
    runId, taskId, evidenceSequenceStart, rawPath, `${captureFilePrefix}-stdout.log`,
    result.stdout.bytes, result.stdout.truncated, secrets,
  );
  const stderrPersisted = persistCapture(
    runId, taskId, evidenceSequenceStart + 1, rawPath, `${captureFilePrefix}-stderr.log`,
    result.stderr.bytes, result.stderr.truncated, secrets,
  );

  const persistedArgv = redactPersistedArgv(plan.argv, secrets);
  const argvRedacted = persistedArgv.some((value, index) => value !== plan.argv[index]);

  let status: TaskResultV1["status"];
  let reasonCode: string | null = null;
  let reasonText: string | null = null;
  let failures = 0;

  if (result.outcome === "exited" && result.exit_code === 0 && result.signal === null) {
    status = "PASS";
  } else if (result.outcome === "exited" && result.exit_code !== null && result.signal === null) {
    status = "FAIL";
    failures = 1;
  } else if (result.timed_out) {
    status = "ERROR";
    reasonCode = "task_timeout";
    reasonText = `Task exceeded its ${timeoutMs} ms budget and its process tree was terminated.`;
  } else if (result.signal !== null) {
    status = "ERROR";
    reasonCode = "process_signalled";
    reasonText = `The task process terminated on signal ${result.signal}.`;
  } else {
    status = "ERROR";
    reasonCode = "process_error";
    reasonText = result.error?.message ?? "The task process failed without a recorded exit code.";
  }

  return {
    task: {
      task_id: taskId,
      task_type: taskId,
      authorized_by: plan.authorizedBy,
      source_path: plan.sourcePath,
      argv: [...persistedArgv],
      argv_redacted: argvRedacted,
      tool_name: options.toolName ?? null,
      tool_version: options.toolVersion ?? null,
      command_surface_changed: decision.commandSurfaceChanged,
      changed_authority_paths: [...decision.changedAuthorityPaths],
      execution_admission: decision.executionAdmission,
      status,
      reason_code: reasonCode,
      reason_text: reasonText,
      exit_code: result.exit_code,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_ms: durationMs,
      observations: { runs: 1, failures },
      cache_state: "not_applicable",
      evidence_ids: [stdoutPersisted.evidence.evidence_id, stderrPersisted.evidence.evidence_id],
      artifact_refs: [stdoutPersisted.artifact.artifact_id, stderrPersisted.artifact.artifact_id],
      output_truncated: result.stdout.truncated || result.stderr.truncated,
    },
    evidence: [stdoutPersisted.evidence, stderrPersisted.evidence],
    artifacts: [stdoutPersisted.artifact, stderrPersisted.artifact],
  };
}


const CANONICAL_RUN_RELATIVE_PATH =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?!.+\/[.]{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u;

interface PersistedTextArtifact extends PersistedCapture {
  readonly text: string;
}

function runRelativeArtifactPath(runId: string, repositoryPath: string): string {
  const prefix = `.ascout/runs/${runId}/`;
  if (!repositoryPath.startsWith(prefix)) {
    throw new Error("Vitest artifact path escaped the current Ascout run.");
  }
  const relativePath = repositoryPath.slice(prefix.length);
  if (!CANONICAL_RUN_RELATIVE_PATH.test(relativePath)) {
    throw new Error("Vitest artifact path is not a canonical run-relative path.");
  }
  return relativePath;
}

function samePhysicalFile(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function assertSafeManagedDescriptor(info: BigIntStats): void {
  if (!info.isFile() || info.nlink !== 1n) {
    throw new Error("generated artifact must be a single-link physical file");
  }
}

function readBoundedDescriptor(fd: number): Buffer {
  const buffer = Buffer.alloc(TASK_CAPTURE_CAP_BYTES + 1);
  let offset = 0;
  while (offset < buffer.length) {
    const bytesRead = readSync(fd, buffer, offset, buffer.length - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  if (offset > TASK_CAPTURE_CAP_BYTES) {
    throw new Error("Vitest generated artifact exceeds the evidence size budget.");
  }
  return buffer.subarray(0, offset);
}

export interface ManagedGeneratedArtifactHandle {
  readonly expectedPath: string;
  readBounded(): Buffer;
  replace(contents: Buffer): void;
  assertStillBound(): void;
  close(): void;
}

export function openManagedGeneratedArtifact(
  runPath: string,
  relativeRunPath: string,
): ManagedGeneratedArtifactHandle {
  if (!CANONICAL_RUN_RELATIVE_PATH.test(relativeRunPath)) {
    throw new Error("generated artifact path is not canonical run-relative data");
  }

  const realRunPath = realpathSync(runPath);
  const expectedPath = resolve(realRunPath, ...relativeRunPath.split("/"));
  const fd = openSync(expectedPath, "r+");
  let closed = false;

  const descriptorInfo = (): BigIntStats => {
    if (closed) throw new Error("generated artifact descriptor is already closed");
    const info = fstatSync(fd, { bigint: true });
    assertSafeManagedDescriptor(info);
    return info;
  };

  const assertStillBound = (): void => {
    const opened = descriptorInfo();
    const realArtifactPath = realpathSync(expectedPath);
    if (realArtifactPath !== expectedPath) {
      throw new Error("generated artifact does not resolve to its exact managed run path");
    }
    const current = statSync(expectedPath, { bigint: true });
    if (!samePhysicalFile(opened, current) || current.nlink !== 1n) {
      throw new Error("generated artifact path no longer identifies the opened managed file");
    }
  };

  try {
    assertStillBound();
  } catch (error) {
    closeSync(fd);
    closed = true;
    throw error;
  }

  const readBounded = (): Buffer => {
    const before = descriptorInfo();
    if (before.size > BigInt(TASK_CAPTURE_CAP_BYTES)) {
      throw new Error("Vitest generated artifact exceeds the evidence size budget.");
    }
    const bytes = readBoundedDescriptor(fd);
    const after = descriptorInfo();
    if (
      !samePhysicalFile(before, after) ||
      before.size !== after.size ||
      after.size !== BigInt(bytes.byteLength) ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs
    ) {
      throw new Error("Vitest generated artifact changed while evidence was being captured.");
    }
    return bytes;
  };

  const replaceContents = (contents: Buffer): void => {
    if (contents.byteLength > TASK_CAPTURE_CAP_BYTES) {
      throw new Error("Vitest generated artifact exceeds the evidence size budget.");
    }
    descriptorInfo();
    ftruncateSync(fd, 0);
    let offset = 0;
    while (offset < contents.byteLength) {
      const written = writeSync(fd, contents, offset, contents.byteLength - offset, offset);
      if (written <= 0) throw new Error("failed to rewrite generated artifact through its bound descriptor");
      offset += written;
    }
    ftruncateSync(fd, contents.byteLength);
    fsyncSync(fd);
    const confirmed = readBounded();
    if (!confirmed.equals(contents)) {
      throw new Error("generated artifact rewrite could not be verified through its bound descriptor");
    }
  };

  return {
    expectedPath,
    readBounded,
    replace: replaceContents,
    assertStillBound,
    close(): void {
      if (closed) return;
      closeSync(fd);
      closed = true;
    },
  };
}

function persistGeneratedTextArtifact(
  runId: string,
  taskId: SemanticTaskType,
  sequence: number,
  runPath: string,
  relativeRunPath: string,
  artifactId: string,
  artifactKind: string,
  evidenceKind: EvidenceV1["kind"],
  secrets: readonly string[],
): PersistedTextArtifact {
  const handle = openManagedGeneratedArtifact(runPath, relativeRunPath);
  try {
    const raw = handle.readBounded();
    const rawText = raw.toString("utf8");
    const text = redactExactValues(rawText, secrets);
    const persisted = Buffer.from(text, "utf8");
    if (!persisted.equals(raw)) handle.replace(persisted);
    handle.assertStillBound();
    const sha256 = createSha256(persisted);
    const redacted = secrets.some((secret) => rawText.includes(secret));
    return {
      text,
      artifact: {
        artifact_id: artifactId,
        task_id: taskId,
        relative_run_path: relativeRunPath,
        kind: artifactKind,
        sha256,
        byte_length: persisted.byteLength,
        redacted,
        truncated: false,
      },
      evidence: {
        evidence_id: `${taskId}.e${sequence}`,
        run_id: runId,
        task_id: taskId,
        sequence,
        kind: evidenceKind,
        sha256,
        artifact_id: artifactId,
        redacted,
        truncated: false,
      },
    };
  } finally {
    handle.close();
  }
}

function observedSelectedTestCount(text: string): number | null {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const count = (value as { readonly numTotalTests?: unknown }).numTotalTests;
  return typeof count === "number" && Number.isInteger(count) && count >= 0 ? count : null;
}

function sameSelectionScope(
  left: SelectionV1["initial_scope"],
  right: SelectionV1["initial_scope"],
): boolean {
  return left.kind === right.kind && left.path === right.path;
}

function hasUnknownSelectionCounts(selection: SelectionV1): boolean {
  if (
    selection.selected_test_count === null ||
    selection.deselected_test_count === null ||
    selection.total_test_count === null
  ) return true;
  return selection.passes.some((pass) =>
    pass.selected_test_count === null ||
    pass.deselected_test_count === null ||
    pass.total_test_count === null
  );
}

/**
 * Finalizes only observed SelectionAccount facts after valid test execution.
 * Native-related runs expose the selected count when reported without guessing
 * the unobserved universe. A full pass is its own observed universe, so
 * selected=total and deselected=0. If a related first pass and a full second
 * pass share scope, the full pass closes the first-pass total/deselection
 * equation. Unknown counts stay null with an explicit limitation.
 */
export function finalizeSelectionAccount(
  selection: SelectionV1,
  passSelectedCounts: readonly (number | null)[],
  executedSafely: boolean,
): SelectionV1 {
  if (!executedSafely || selection.passes.length === 0) return selection;
  if (selection.passes.length > 2 || passSelectedCounts.length > 2) {
    throw new Error("SelectionAccount finalization permits at most two passes");
  }

  const passes: Array<SelectionV1["passes"][number]> = selection.passes.map((pass, index) => {
    const selected = passSelectedCounts[index] ?? null;
    return pass.mode === "full" && selected !== null
      ? { ...pass, selected_test_count: selected, deselected_test_count: 0, total_test_count: selected }
      : { ...pass, selected_test_count: selected, deselected_test_count: null, total_test_count: null };
  });

  if (
    passes.length === 2 &&
    passes[0]!.mode !== "full" &&
    passes[1]!.mode === "full" &&
    sameSelectionScope(passes[0]!.scope, passes[1]!.scope) &&
    passes[0]!.selected_test_count !== null &&
    passes[1]!.total_test_count !== null &&
    passes[0]!.selected_test_count <= passes[1]!.total_test_count
  ) {
    const total = passes[1]!.total_test_count;
    const selected = passes[0]!.selected_test_count;
    passes[0] = { ...passes[0]!, selected_test_count: selected, deselected_test_count: total - selected, total_test_count: total };
  }

  const finalPass = passes[passes.length - 1]!;
  const finalized: SelectionV1 = {
    ...selection,
    selected_test_count: finalPass.selected_test_count,
    deselected_test_count: finalPass.deselected_test_count,
    total_test_count: finalPass.total_test_count,
    passes,
    limitations: selection.limitations.filter((limitation) =>
      limitation !== UNSAFE_SELECTION_LIMITATION &&
      limitation !== SELECTION_COUNTS_NOT_OBSERVED_LIMITATION
    ),
  };

  return hasUnknownSelectionCounts(finalized)
    ? { ...finalized, limitations: [...finalized.limitations, SELECTION_COUNTS_NOT_OBSERVED_LIMITATION] }
    : finalized;
}

function validVitestMachineResult(text: string): boolean {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return false;
  }
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Array.isArray((value as { readonly testResults?: unknown }).testResults);
}

function withVitestEvidenceError(
  executed: ExecutedTask,
  generated: readonly PersistedTextArtifact[],
): ExecutedTestTask {
  return {
    task: {
      ...executed.task,
      status: "ERROR",
      reason_code: "vitest_evidence_invalid",
      reason_text: "Vitest did not produce bounded, parseable machine-result and LCOV evidence inside the current Ascout run.",
      evidence_ids: [...executed.task.evidence_ids, ...generated.map(({ evidence }) => evidence.evidence_id)],
      artifact_refs: [...executed.task.artifact_refs, ...generated.map(({ artifact }) => artifact.artifact_id)],
    },
    evidence: [...executed.evidence, ...generated.map(({ evidence }) => evidence)],
    artifacts: [...executed.artifacts, ...generated.map(({ artifact }) => artifact)],
    coveragePoints: null,
    branchPoints: null,
    selectedTestCounts: [null],
    machineResults: [],
  };
}

async function executeVitestTask(
  repositoryRoot: string,
  runId: string,
  runPath: string,
  rawPath: string,
  plan: PlannedVitestTask,
  decision: TaskAdmissionDecision,
  secrets: readonly string[],
  timeoutMs: number,
  passOrdinal: 1 | 2 = 1,
): Promise<ExecutedTestTask> {
  mkdirSync(
    passOrdinal === 1 ? join(rawPath, "test") : join(rawPath, "test", "pass-2"),
    { recursive: true },
  );
  const executionOptions: ExecutePlannedTaskOptions = {
    env: { ...process.env, CI: "1" },
    toolName: "vitest",
    ...(plan.toolVersion === null ? {} : { toolVersion: plan.toolVersion }),
    captureFilePrefix: passOrdinal === 1 ? "test" : "test-pass-2",
    evidenceSequenceStart: passOrdinal === 1 ? 1 : 5,
  };
  const executed = await executePlannedTask(
    repositoryRoot,
    runId,
    rawPath,
    "test",
    normalizePlan(plan) as NormalizedPlan & { state: "planned" },
    decision,
    secrets,
    timeoutMs,
    executionOptions,
  );

  if (executed.task.status === "ERROR") return { ...executed, coveragePoints: null, branchPoints: null, selectedTestCounts: [null], machineResults: [] };
  if (plan.machineResultPath === null || plan.lcovPath === null) return withVitestEvidenceError(executed, []);

  const generated: PersistedTextArtifact[] = [];
  const generatedSequenceStart = passOrdinal === 1 ? 3 : 7;
  const artifactPrefix = passOrdinal === 1 ? "test" : "test.pass-2";
  let coveragePoints: readonly LcovLinePoint[] | null = null;
  let branchPoints: readonly LcovBranchPoint[] | null = null;
  let selectedTestCount: number | null = null;
  let machineResult: TestMachineResultRecord | null = null;
  try {
    const machine = persistGeneratedTextArtifact(
      runId,
      "test",
      generatedSequenceStart,
      runPath,
      runRelativeArtifactPath(runId, plan.machineResultPath),
      `${artifactPrefix}.vitest-results`,
      "test_result_json",
      "test_result",
      secrets,
    );
    generated.push(machine);
    if (!validVitestMachineResult(machine.text)) return withVitestEvidenceError(executed, generated);
    selectedTestCount = observedSelectedTestCount(machine.text);
    machineResult = { runner: "vitest", text: machine.text, evidenceId: machine.evidence.evidence_id, basePlan: plan };

    const coverage = persistGeneratedTextArtifact(
      runId,
      "test",
      generatedSequenceStart + 1,
      runPath,
      runRelativeArtifactPath(runId, plan.lcovPath),
      `${artifactPrefix}.lcov`,
      "coverage_lcov",
      "coverage",
      secrets,
    );
    generated.push(coverage);
    const lineNormalized = normalizeLcovLineCoverage(coverage.text, repositoryRoot);
    if (lineNormalized.outcome !== "resolved") return withVitestEvidenceError(executed, generated);
    coveragePoints = lineNormalized.points;
    const branchNormalized = normalizeLcovBranchCoverage(coverage.text, repositoryRoot);
    if (branchNormalized.outcome === "resolved") {
      branchPoints = branchNormalized.observations;
    } else if (branchNormalized.reason === LCOV_NO_BRANCH_DATA_REASON) {
      branchPoints = null;
    } else {
      return withVitestEvidenceError(executed, generated);
    }
  } catch {
    return withVitestEvidenceError(executed, generated);
  }

  return {
    task: {
      ...executed.task,
      evidence_ids: [...executed.task.evidence_ids, ...generated.map(({ evidence }) => evidence.evidence_id)],
      artifact_refs: [...executed.task.artifact_refs, ...generated.map(({ artifact }) => artifact.artifact_id)],
    },
    evidence: [...executed.evidence, ...generated.map(({ evidence }) => evidence)],
    artifacts: [...executed.artifacts, ...generated.map(({ artifact }) => artifact)],
    coveragePoints,
    branchPoints,
    selectedTestCounts: [selectedTestCount],
    machineResults: machineResult === null ? [] : [machineResult],
  };
}


function validJestMachineResult(text: string): boolean {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return false;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as { readonly success?: unknown; readonly testResults?: unknown };
  if (typeof candidate.success !== "boolean" || !Array.isArray(candidate.testResults)) return false;
  return candidate.testResults.every((suite) => {
    if (typeof suite !== "object" || suite === null || Array.isArray(suite)) return false;
    const formatted = suite as { readonly name?: unknown };
    return typeof formatted.name === "string" && formatted.name.length > 0;
  });
}

function withJestEvidenceError(
  executed: ExecutedTask,
  generated: readonly PersistedTextArtifact[],
): ExecutedTestTask {
  return {
    task: {
      ...executed.task,
      status: "ERROR",
      reason_code: "jest_evidence_invalid",
      reason_text: "Jest did not produce bounded, parseable machine-result and LCOV evidence inside the current Ascout run.",
      evidence_ids: [...executed.task.evidence_ids, ...generated.map(({ evidence }) => evidence.evidence_id)],
      artifact_refs: [...executed.task.artifact_refs, ...generated.map(({ artifact }) => artifact.artifact_id)],
    },
    evidence: [...executed.evidence, ...generated.map(({ evidence }) => evidence)],
    artifacts: [...executed.artifacts, ...generated.map(({ artifact }) => artifact)],
    coveragePoints: null,
    branchPoints: null,
    selectedTestCounts: [null],
    machineResults: [],
  };
}

async function executeJestTask(
  repositoryRoot: string,
  runId: string,
  runPath: string,
  rawPath: string,
  plan: PlannedJestTask,
  decision: TaskAdmissionDecision,
  secrets: readonly string[],
  timeoutMs: number,
  passOrdinal: 1 | 2 = 1,
): Promise<ExecutedTestTask> {
  mkdirSync(
    passOrdinal === 1 ? join(rawPath, "test") : join(rawPath, "test", "pass-2"),
    { recursive: true },
  );
  const executionOptions: ExecutePlannedTaskOptions = {
    env: { ...process.env, CI: "1" },
    toolName: "jest",
    ...(plan.toolVersion === null ? {} : { toolVersion: plan.toolVersion }),
    captureFilePrefix: passOrdinal === 1 ? "test" : "test-pass-2",
    evidenceSequenceStart: passOrdinal === 1 ? 1 : 5,
  };
  const executed = await executePlannedTask(
    repositoryRoot,
    runId,
    rawPath,
    "test",
    normalizePlan(plan) as NormalizedPlan & { state: "planned" },
    decision,
    secrets,
    timeoutMs,
    executionOptions,
  );

  if (executed.task.status === "ERROR") return { ...executed, coveragePoints: null, branchPoints: null, selectedTestCounts: [null], machineResults: [] };
  if (plan.machineResultPath === null || plan.lcovPath === null) return withJestEvidenceError(executed, []);

  const generated: PersistedTextArtifact[] = [];
  const generatedSequenceStart = passOrdinal === 1 ? 3 : 7;
  const artifactPrefix = passOrdinal === 1 ? "test" : "test.pass-2";
  let coveragePoints: readonly LcovLinePoint[] | null = null;
  let branchPoints: readonly LcovBranchPoint[] | null = null;
  let selectedTestCount: number | null = null;
  let machineResult: TestMachineResultRecord | null = null;
  try {
    const machine = persistGeneratedTextArtifact(
      runId,
      "test",
      generatedSequenceStart,
      runPath,
      runRelativeArtifactPath(runId, plan.machineResultPath),
      `${artifactPrefix}.jest-results`,
      "test_result_json",
      "test_result",
      secrets,
    );
    generated.push(machine);
    if (!validJestMachineResult(machine.text)) return withJestEvidenceError(executed, generated);
    selectedTestCount = observedSelectedTestCount(machine.text);
    machineResult = { runner: "jest", text: machine.text, evidenceId: machine.evidence.evidence_id, basePlan: plan };

    const coverage = persistGeneratedTextArtifact(
      runId,
      "test",
      generatedSequenceStart + 1,
      runPath,
      runRelativeArtifactPath(runId, plan.lcovPath),
      `${artifactPrefix}.lcov`,
      "coverage_lcov",
      "coverage",
      secrets,
    );
    generated.push(coverage);
    const lineNormalized = normalizeLcovLineCoverage(coverage.text, repositoryRoot);
    if (lineNormalized.outcome !== "resolved") return withJestEvidenceError(executed, generated);
    coveragePoints = lineNormalized.points;
    const branchNormalized = normalizeLcovBranchCoverage(coverage.text, repositoryRoot);
    if (branchNormalized.outcome === "resolved") {
      branchPoints = branchNormalized.observations;
    } else if (branchNormalized.reason === LCOV_NO_BRANCH_DATA_REASON) {
      branchPoints = null;
    } else {
      return withJestEvidenceError(executed, generated);
    }
  } catch {
    return withJestEvidenceError(executed, generated);
  }

  return {
    task: {
      ...executed.task,
      evidence_ids: [...executed.task.evidence_ids, ...generated.map(({ evidence }) => evidence.evidence_id)],
      artifact_refs: [...executed.task.artifact_refs, ...generated.map(({ artifact }) => artifact.artifact_id)],
    },
    evidence: [...executed.evidence, ...generated.map(({ evidence }) => evidence)],
    artifacts: [...executed.artifacts, ...generated.map(({ artifact }) => artifact)],
    coveragePoints,
    branchPoints,
    selectedTestCounts: [selectedTestCount],
    machineResults: machineResult === null ? [] : [machineResult],
  };
}

function combineTestPasses(first: ExecutedTestTask, second: ExecutedTestTask): ExecutedTestTask {
  const firstStatus = first.task.status;
  const secondStatus = second.task.status;
  const status: TaskResultV1["status"] =
    firstStatus === "ERROR" || secondStatus === "ERROR"
      ? "ERROR"
      : firstStatus === "FAIL" || secondStatus === "FAIL"
        ? "FAIL"
        : "PASS";
  const errorTask = secondStatus === "ERROR" ? second.task : first.task;
  const failingExitCode = [second.task.exit_code, first.task.exit_code]
    .find((value) => value !== null && value !== 0) ?? null;
  const startedAt = first.task.started_at!;
  const finishedAt = second.task.finished_at!;

  return {
    task: {
      ...second.task,
      status,
      reason_code: status === "ERROR" ? errorTask.reason_code : null,
      reason_text: status === "ERROR" ? errorTask.reason_text : null,
      exit_code: status === "PASS" ? 0 : status === "FAIL" ? failingExitCode : errorTask.exit_code,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_ms: Date.parse(finishedAt) - Date.parse(startedAt),
      observations: {
        runs: first.task.observations.runs + second.task.observations.runs,
        failures: first.task.observations.failures + second.task.observations.failures,
      },
      evidence_ids: [...first.task.evidence_ids, ...second.task.evidence_ids],
      artifact_refs: [...first.task.artifact_refs, ...second.task.artifact_refs],
      output_truncated: first.task.output_truncated || second.task.output_truncated,
    },
    evidence: [...first.evidence, ...second.evidence],
    artifacts: [...first.artifacts, ...second.artifacts],
    coveragePoints: second.coveragePoints,
    branchPoints: second.branchPoints,
    selectedTestCounts: [...first.selectedTestCounts, ...second.selectedTestCounts],
    machineResults: [...first.machineResults, ...second.machineResults],
  };
}

interface TargetedObservationExecution {
  readonly observation: TestAssertionObservation | null;
  readonly evidence: readonly EvidenceV1[];
  readonly artifacts: readonly ArtifactV1[];
  readonly finishedAt: string | null;
  readonly outputTruncated: boolean;
}

async function executeTargetedTestObservation(
  repositoryRoot: string,
  runId: string,
  runPath: string,
  rawPath: string,
  runner: "vitest" | "jest",
  basePlan: PlannedVitestTask | PlannedJestTask,
  identity: FailingTestIdentity,
  observationOrdinal: 2 | 3,
  decision: TaskAdmissionDecision,
  secrets: readonly string[],
  timeoutMs: number,
): Promise<TargetedObservationExecution> {
  const targeted = runner === "jest"
    ? planJestTargetedRerun({
        runId,
        basePlan: basePlan as PlannedJestTask,
        selector: identity,
        observationOrdinal,
      })
    : planVitestTargetedRerun({
        runId,
        basePlan: basePlan as PlannedVitestTask,
        selector: identity,
        observationOrdinal,
      });
  if (targeted.state !== "planned") {
    return { observation: null, evidence: [], artifacts: [], finishedAt: null, outputTruncated: false };
  }

  const rerunIndex = observationOrdinal - 1;
  mkdirSync(join(rawPath, "test", `rerun-${rerunIndex}`), { recursive: true });
  const baseNormalized = normalizePlan(basePlan);
  if (baseNormalized.state !== "planned") {
    return { observation: null, evidence: [], artifacts: [], finishedAt: null, outputTruncated: false };
  }
  const normalizedPlan: NormalizedPlan & { state: "planned" } = {
    ...baseNormalized,
    state: "planned",
    argv: [...targeted.argv],
    workingDirectory: targeted.workingDirectory,
    reasonCode: null,
    reasonText: null,
  };
  const sequenceStart = observationOrdinal === 2 ? 9 : 12;
  const executed = await executePlannedTask(
    repositoryRoot,
    runId,
    rawPath,
    "test",
    normalizedPlan,
    decision,
    secrets,
    timeoutMs,
    {
      env: { ...process.env, CI: "1" },
      toolName: runner,
      ...(basePlan.toolVersion === null ? {} : { toolVersion: basePlan.toolVersion }),
      captureFilePrefix: `test-rerun-${rerunIndex}`,
      evidenceSequenceStart: sequenceStart,
    },
  );
  const evidence = [...executed.evidence];
  const artifacts = [...executed.artifacts];
  const finishedAt = executed.task.finished_at;
  if (executed.task.status === "ERROR") {
    return { observation: null, evidence, artifacts, finishedAt, outputTruncated: executed.task.output_truncated };
  }

  try {
    const machine = persistGeneratedTextArtifact(
      runId,
      "test",
      sequenceStart + 2,
      runPath,
      runRelativeArtifactPath(runId, targeted.machineResultPath),
      `test.rerun-${rerunIndex}.${runner}-results`,
      "test_result_json",
      "test_result",
      secrets,
    );
    evidence.push(machine.evidence);
    artifacts.push(machine.artifact);
    const machineResultValid = runner === "jest"
      ? validJestMachineResult(machine.text)
      : validVitestMachineResult(machine.text);
    if (!machineResultValid) {
      return { observation: null, evidence, artifacts, finishedAt, outputTruncated: executed.task.output_truncated };
    }
    const matches = parseTestAssertionObservations(
      repositoryRoot,
      machine.text,
      machine.evidence.evidence_id,
    ).filter((observation) =>
      observation.path === identity.path && observation.fullName === identity.fullName
    );
    if (matches.length != 1) {
      return { observation: null, evidence, artifacts, finishedAt, outputTruncated: executed.task.output_truncated };
    }
    const observation = matches[0]!;
    const expectedStatus = observation.outcome === "failed" ? "FAIL" : "PASS";
    if (executed.task.status !== expectedStatus) {
      return { observation: null, evidence, artifacts, finishedAt, outputTruncated: executed.task.output_truncated };
    }
    return { observation, evidence, artifacts, finishedAt, outputTruncated: executed.task.output_truncated };
  } catch {
    return { observation: null, evidence, artifacts, finishedAt, outputTruncated: executed.task.output_truncated };
  }
}

interface NormalizedFailedTestExecution {
  readonly executed: ExecutedTestTask;
  readonly findings: readonly FindingV1[];
}

async function normalizeFailedTestExecution(
  repositoryRoot: string,
  runId: string,
  runPath: string,
  rawPath: string,
  executed: ExecutedTestTask,
  decision: TaskAdmissionDecision,
  secrets: readonly string[],
  timeoutMs: number,
): Promise<NormalizedFailedTestExecution> {
  if (executed.task.status !== "FAIL" || executed.machineResults.length === 0) {
    return { executed, findings: [] };
  }

  const baselineObservations = executed.machineResults.flatMap((record) =>
    parseTestAssertionObservations(repositoryRoot, record.text, record.evidenceId)
  );
  const identities = failingTestIdentities(baselineObservations);
  if (identities.length === 0) return { executed, findings: [] };

  const allObservations = [...baselineObservations];
  const extraEvidence: EvidenceV1[] = [];
  const extraArtifacts: ArtifactV1[] = [];
  let taskRuns = executed.task.observations.runs;
  let taskFailures = executed.task.observations.failures;
  let taskFinishedAt = executed.task.finished_at;
  let outputTruncated = executed.task.output_truncated;

  // T063 owns exactly two global extra observation slots. Use them for one
  // deterministic exact failure identity; other failures remain unknown unless
  // normal selection passes already observed them.
  const targetIdentity = identities[0]!;
  const origin = executed.machineResults.find((record) =>
    parseTestAssertionObservations(repositoryRoot, record.text, record.evidenceId).some((observation) =>
      observation.path === targetIdentity.path &&
      observation.fullName === targetIdentity.fullName &&
      observation.outcome === "failed"
    )
  );

  if (origin !== undefined) {
    let targetObservations = observationsForIdentity(allObservations, targetIdentity);
    while (
      targetObservations.length < 3 &&
      targetObservations.length > 0 &&
      targetObservations.every((observation) => observation.outcome === "failed")
    ) {
      const observationOrdinal = (targetObservations.length + 1) as 2 | 3;
      const targeted = await executeTargetedTestObservation(
        repositoryRoot,
        runId,
        runPath,
        rawPath,
        origin.runner,
        origin.basePlan,
        targetIdentity,
        observationOrdinal,
        decision,
        secrets,
        timeoutMs,
      );
      extraEvidence.push(...targeted.evidence);
      extraArtifacts.push(...targeted.artifacts);
      outputTruncated ||= targeted.outputTruncated;
      if (targeted.finishedAt !== null) taskFinishedAt = targeted.finishedAt;
      if (targeted.observation === null) break;
      allObservations.push(targeted.observation);
      taskRuns += 1;
      if (targeted.observation.outcome === "failed") taskFailures += 1;
      targetObservations = observationsForIdentity(allObservations, targetIdentity);
    }
  }

  const findings = identities.map((identity, index) =>
    buildNormalizedTestFinding(
      index,
      executed.machineResults[0]!.runner,
      identity,
      observationsForIdentity(allObservations, identity),
    )
  );
  const status = normalizedAggregateTestStatus(findings);
  const startedAt = executed.task.started_at;
  const durationMs = startedAt !== null && taskFinishedAt !== null
    ? Date.parse(taskFinishedAt) - Date.parse(startedAt)
    : executed.task.duration_ms;

  return {
    executed: {
      ...executed,
      task: {
        ...executed.task,
        status,
        finished_at: taskFinishedAt,
        duration_ms: durationMs,
        observations: { runs: taskRuns, failures: taskFailures },
        evidence_ids: [...executed.task.evidence_ids, ...extraEvidence.map(({ evidence_id }) => evidence_id)],
        artifact_refs: [...executed.task.artifact_refs, ...extraArtifacts.map(({ artifact_id }) => artifact_id)],
        output_truncated: outputTruncated,
      },
      evidence: [...executed.evidence, ...extraEvidence],
      artifacts: [...executed.artifacts, ...extraArtifacts],
    },
    findings,
  };
}

function nonExecutedTask(
  taskId: SemanticTaskType,
  decision: TaskAdmissionDecision,
  plan: NormalizedPlan | null,
  status: Extract<TaskResultV1["status"], "NOT_RUN" | "NOT_APPLICABLE">,
  reasonCode: string | null,
  reasonText: string | null,
  secrets: readonly string[],
): ExecutedTask {
  const persistedArgv = plan !== null ? redactPersistedArgv(plan.argv, secrets) : [];
  const argvRedacted = plan !== null &&
    persistedArgv.some((value, index) => value !== plan.argv[index]);

  return {
    task: {
      task_id: taskId,
      task_type: taskId,
      authorized_by: plan?.authorizedBy ?? "discovery",
      source_path: plan?.sourcePath ?? null,
      argv: [...persistedArgv],
      argv_redacted: argvRedacted,
      tool_name: null,
      tool_version: null,
      command_surface_changed: decision.commandSurfaceChanged,
      changed_authority_paths: [...decision.changedAuthorityPaths],
      execution_admission: decision.executionAdmission,
      status,
      reason_code: reasonCode,
      reason_text: reasonText,
      exit_code: null,
      started_at: null,
      finished_at: null,
      duration_ms: null,
      observations: { runs: 0, failures: 0 },
      cache_state: "not_applicable",
      evidence_ids: [],
      artifact_refs: [],
      output_truncated: false,
    },
    evidence: [],
    artifacts: [],
  };
}

function assertSemanticallyValid(receipt: ReceiptV1): void {
  const validation = validateReceiptSemantics(receipt);
  if (!validation.valid) {
    const details = validation.issues
      .map((issue) => `${issue.code} at ${issue.path}: ${issue.message}`)
      .join("; ");
    throw new Error(`internally generated receipt failed semantic validation: ${details}`);
  }
}

/**
 * Runs one bounded, source-bound `ascout check` invocation under the run lock:
 * discover → observe environment → load config → observe source start → compare
 * working tree → plan → decide admissions → execute admitted planned tasks with
 * capture caps → observe source end → build and internally validate the receipt.
 */
export async function runCheck(
  repositoryRoot: string,
  options: CheckRunOptions = {},
): Promise<CheckOutcome> {
  const lock = await acquireRunLock(repositoryRoot);
  try {
    const { root, files, discovery } = collectDiscoveredProject(repositoryRoot);
    const environment = observeEnvironment(root, files, discovery);
    const { config, digest } = loadConfig(root);
    const runId = generateRunId();
    const runDir = await createRunDirectory(root, runId);

    try {
      const runStartedAt = new Date().toISOString();
      const sourceStart = composeSourceState(root);
      const gitComparison = readWorkingTreeComparison(root, sourceStart.head_sha);
      const comparison: ComparisonV1 = {
        kind: gitComparison.kind,
        base_ref: gitComparison.base_ref,
        includes_staged: true,
        includes_unstaged: true,
        includes_untracked_nonignored: true,
        changed_files: gitComparison.changed_files.map(toChangedFileV1),
      };

      const decisions = decideRunAdmissions(discovery, gitComparison.changed_files, {
        allowChangedCommandSurface: options.allowChangedCommandSurface === true,
        ascoutConfigPath: ASCOUT_CONFIG_PATH,
        tasks: config.tasks ?? null,
      });
      const preRunWidening = decidePreRunWidening(discovery, gitComparison.changed_files);
      const selectionMode = preRunWidening.widened ? "full" as const : "native_related" as const;
      const testPlanningChangedFiles = preRunPlanningChangedFiles(
        gitComparison.changed_files,
        preRunWidening,
      );

      const vitestPlan = planVitestTask({
        repositoryRoot: root,
        runId,
        config,
        discovery,
        files,
        changedFiles: testPlanningChangedFiles,
        selectionMode,
      });
      const jestPlan = planJestTask({
        repositoryRoot: root,
        runId,
        config,
        discovery,
        files,
        changedFiles: testPlanningChangedFiles,
        selectionMode,
      });
      const testPlan: VitestTaskPlan | JestTaskPlan =
        discovery.jsTestRunner.state === "resolved" && discovery.jsTestRunner.value === "jest"
          ? jestPlan
          : vitestPlan;
      const plans: Record<SemanticTaskType, NormalizedPlan> = {
        typecheck: normalizePlan(planTypeScriptTask({ config, discovery, files })),
        lint: normalizePlan(planESLintTask({
          config,
          discovery,
          files,
          changedFiles: gitComparison.changed_files,
        })),
        test: normalizePlan(testPlan),
        pytestBasic: normalizePlan(planPytestBasicTask({ config, discovery, files })),
      };

      const policy: RedactionPolicy = {
        recognized_names: [],
        configured_names: [...(config.redactEnv ?? [])],
        minimum_value_bytes: MIN_SECRET_VALUE_BYTES,
      };
      const secrets = selectedSecretValues(process.env as RedactionEnv, policy);
      let selection = initialSelection(testPlan, preRunWidening, decisions.test.launchAllowed);

      const tasks: TaskResultV1[] = [];
      const evidence: EvidenceV1[] = [];
      const artifacts: ArtifactV1[] = [];
      const findings: FindingV1[] = [];
      let exerciseCoveragePoints: readonly LcovLinePoint[] | null = null;
      let exerciseBranchPoints: readonly LcovBranchPoint[] | null = null;

      for (const task of FIXED_SEMANTIC_TASKS) {
        const decision = decisions[task];

        if (!decision.launchAllowed) {
          // Refusals are decided before any process launch for the task.
          const refused = nonExecutedTask(
            task,
            decision,
            plans[task],
            "NOT_RUN",
            decision.refusal!.reasonCode,
            decision.refusal!.reasonText,
            secrets,
          );
          tasks.push(refused.task);
          continue;
        }

        const plan = plans[task];
        if (plan.state === "not_applicable") {
          const notApplicable = nonExecutedTask(
            task,
            decision,
            plan,
            "NOT_APPLICABLE",
            plan.reasonCode,
            plan.reasonText,
            secrets,
          );
          tasks.push(notApplicable.task);
          continue;
        }
        if (plan.state === "not_run") {
          const notRun = nonExecutedTask(
            task,
            decision,
            plan,
            "NOT_RUN",
            plan.reasonCode,
            plan.reasonText,
            secrets,
          );
          tasks.push(notRun.task);
          continue;
        }

        let executed: ExecutedTask;
        if (task === "test") {
          const firstExecuted: ExecutedTestTask =
            discovery.jsTestRunner.state === "resolved" && discovery.jsTestRunner.value === "jest"
              ? await executeJestTask(
                  root,
                  runId,
                  runDir.run_path,
                  runDir.raw_path,
                  testPlan as PlannedJestTask,
                  decision,
                  secrets,
                  taskTimeoutMs(config, task),
                )
              : await executeVitestTask(
                  root,
                  runId,
                  runDir.run_path,
                  runDir.raw_path,
                  testPlan as PlannedVitestTask,
                  decision,
                  secrets,
                  taskTimeoutMs(config, task),
                );
          let finalExecuted = firstExecuted;

          if (
            (firstExecuted.task.status === "PASS" || firstExecuted.task.status === "FAIL") &&
            firstExecuted.coveragePoints !== null &&
            testPlan.state === "planned" &&
            testPlan.selectionMode === "native_related"
          ) {
            const postRunWidening = decidePostRunWidening(
              gitComparison.changed_files,
              "native_related",
              firstExecuted.coveragePoints,
            );
            if (postRunWidening.widened) {
              const postRunChangedFiles = postRunPlanningChangedFiles(
                gitComparison.changed_files,
                postRunWidening,
              );

              if (discovery.jsTestRunner.state === "resolved" && discovery.jsTestRunner.value === "jest") {
                const widerPlan = planJestTask({
                  repositoryRoot: root,
                  runId,
                  config,
                  discovery,
                  files,
                  changedFiles: postRunChangedFiles,
                  selectionMode: "full",
                  artifactPassOrdinal: 2,
                });
                if (widerPlan.state === "planned") {
                  const secondExecuted = await executeJestTask(
                    root,
                    runId,
                    runDir.run_path,
                    runDir.raw_path,
                    widerPlan,
                    decision,
                    secrets,
                    taskTimeoutMs(config, task),
                    2,
                  );
                  finalExecuted = combineTestPasses(firstExecuted, secondExecuted);
                  selection = withPostRunWideningPass(selection, widerPlan.workingDirectory);
                }
              } else {
                const widerPlan = planVitestTask({
                  repositoryRoot: root,
                  runId,
                  config,
                  discovery,
                  files,
                  changedFiles: postRunChangedFiles,
                  selectionMode: "full",
                  artifactPassOrdinal: 2,
                });
                if (widerPlan.state === "planned") {
                  const secondExecuted = await executeVitestTask(
                    root,
                    runId,
                    runDir.run_path,
                    runDir.raw_path,
                    widerPlan,
                    decision,
                    secrets,
                    taskTimeoutMs(config, task),
                    2,
                  );
                  finalExecuted = combineTestPasses(firstExecuted, secondExecuted);
                  selection = withPostRunWideningPass(selection, widerPlan.workingDirectory);
                }
              }
            }
          }
          selection = finalizeSelectionAccount(
            selection,
            finalExecuted.selectedTestCounts,
            (finalExecuted.task.status === "PASS" || finalExecuted.task.status === "FAIL") &&
              finalExecuted.coveragePoints !== null,
          );
          const normalizedTestExecution = await normalizeFailedTestExecution(
            root,
            runId,
            runDir.run_path,
            runDir.raw_path,
            finalExecuted,
            decision,
            secrets,
            taskTimeoutMs(config, task),
          );
          finalExecuted = normalizedTestExecution.executed;
          findings.push(...normalizedTestExecution.findings);
          exerciseCoveragePoints = finalExecuted.coveragePoints;
          exerciseBranchPoints = finalExecuted.branchPoints;
          executed = finalExecuted;
        } else {
          executed = await executePlannedTask(
            root,
            runId,
            runDir.raw_path,
            task,
            plan as NormalizedPlan & { state: "planned" },
            decision,
            secrets,
            taskTimeoutMs(config, task),
          );
        }
        tasks.push(executed.task);
        evidence.push(...executed.evidence);
        artifacts.push(...executed.artifacts);
      }

      const fullExercise = exerciseCoveragePoints === null
        ? emptyExercise()
        : exerciseBranchPoints === null
          ? buildChangedLineExercise(
              gitComparison.changed_files,
              exerciseCoveragePoints,
              "test",
            )
          : buildChangedLineExercise(
              gitComparison.changed_files,
              exerciseCoveragePoints,
              "test",
              exerciseBranchPoints,
            );
      const exercise: ExerciseV1 = {
        changed_executable_lines: fullExercise.changed_executable_lines,
        exercised_lines: fullExercise.exercised_lines,
        not_exercised_lines: fullExercise.not_exercised_lines,
        unresolved_lines: fullExercise.unresolved_lines,
        changed_files_with_zero_exercised_lines: fullExercise.changed_files_with_zero_exercised_lines,
        records: fullExercise.records,
        ...(exerciseCoveragePoints !== null && exerciseBranchPoints !== null
          ? {
              branch_records: fullExercise.branch_records,
              exercised_branches: fullExercise.exercised_branches,
              not_exercised_branches: fullExercise.not_exercised_branches,
              unresolved_branches: fullExercise.unresolved_branches,
              changed_files_with_zero_exercised_branches: fullExercise.changed_files_with_zero_exercised_branches,
            }
          : {}),
      };
      const sourceEnd = composeSourceState(root);

      const receipt: ReceiptV1 = {
        ...buildReceipt({
          run: {
            run_id: runId,
            ascout_version: ascoutVersion(),
            started_at: runStartedAt,
            finished_at: new Date().toISOString(),
            config_digest: digest,
          },
          sourceStart,
          sourceEnd,
          comparison,
          selection,
          tasks,
          exercise,
          testChanges: deriveTestChanges(gitComparison.changed_files),
          findings,
          evidence,
          artifacts,
        }),
        environment,
      };
      assertSemanticallyValid(receipt);

      writeFileSync(join(runDir.run_path, "receipt.json"), renderReceiptJson(receipt));

      return { receipt, terminalSummary: renderTerminalSummary(receipt) };
    } finally {
      await runDir.complete();
    }
  } finally {
    await lock.release();
  }
}

function ascoutVersion(): string {
  return "0.1.0-m1";
}
