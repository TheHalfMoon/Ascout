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
import { normalizeLcovLineCoverage } from "./coverage/lcov.js";
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
  type ReceiptV1,
  type SelectionV1,
  type SourceStateV1,
  type TaskResultV1,
  type TestChangeV1,
} from "./receipt/model.js";
import { planESLintTask } from "./tools/eslint.js";
import { planPytestBasicTask } from "./tools/pytest.js";
import { planTypeScriptTask } from "./tools/typescript.js";
import { planVitestTask, type PlannedVitestTask, type VitestTaskPlan } from "./tools/vitest.js";

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

/** Selection totals remain unknown until T057/T061 final selection accounting; disclose rather than invent them. */
export const SELECTION_COUNTS_NOT_OBSERVED_LIMITATION = "selection_counts_not_observed";

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

function toChangedFileV1(file: GitChangedFile): ChangedFileV1 {
  return {
    path: file.path,
    ...(file.previous_path === undefined ? {} : { previous_path: file.previous_path }),
    change_kind: file.change_kind,
    line_semantics: file.line_semantics,
    changed_new_line_ranges: file.changed_new_line_ranges,
    // Factual test/snapshot/command-surface classification is a later task;
    // these facts stay honestly absent rather than inferred.
    is_test_file: false,
    is_snapshot: false,
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
  // Changed-line exercise proof arrives with US2; until then the receipt keeps
  // the exercise section empty, which forces materially_incomplete and exit 4.
  return {
    changed_executable_lines: 0,
    exercised_lines: 0,
    not_exercised_lines: 0,
    unresolved_lines: 0,
    changed_files_with_zero_exercised_lines: 0,
    records: [],
  };
}

function baseSelection(testPlan: VitestTaskPlan): SelectionV1 {
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
  return {
    mode: "native_related",
    initial_scope: scope,
    selected_test_count: null,
    deselected_test_count: null,
    total_test_count: null,
    widened: false,
    widen_triggers: [],
    passes: [
      {
        ordinal: 1,
        mode: "native_related",
        scope,
        trigger: null,
        selected_test_count: null,
        deselected_test_count: null,
        total_test_count: null,
      },
    ],
    limitations,
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

interface ExecutePlannedTaskOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly toolName?: string;
  readonly toolVersion?: string;
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

  const stdoutPersisted = persistCapture(
    runId, taskId, 1, rawPath, `${taskId}-stdout.log`,
    result.stdout.bytes, result.stdout.truncated, secrets,
  );
  const stderrPersisted = persistCapture(
    runId, taskId, 2, rawPath, `${taskId}-stderr.log`,
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
): ExecutedTask {
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
): Promise<ExecutedTask> {
  mkdirSync(join(rawPath, "test"), { recursive: true });
  const executionOptions: ExecutePlannedTaskOptions = {
    env: { ...process.env, CI: "1" },
    toolName: "vitest",
    ...(plan.toolVersion === null ? {} : { toolVersion: plan.toolVersion }),
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

  if (executed.task.status === "ERROR") return executed;
  if (plan.machineResultPath === null || plan.lcovPath === null) return withVitestEvidenceError(executed, []);

  const generated: PersistedTextArtifact[] = [];
  try {
    const machine = persistGeneratedTextArtifact(
      runId,
      "test",
      3,
      runPath,
      runRelativeArtifactPath(runId, plan.machineResultPath),
      "test.vitest-results",
      "test_result_json",
      "test_result",
      secrets,
    );
    generated.push(machine);
    if (!validVitestMachineResult(machine.text)) return withVitestEvidenceError(executed, generated);

    const coverage = persistGeneratedTextArtifact(
      runId,
      "test",
      4,
      runPath,
      runRelativeArtifactPath(runId, plan.lcovPath),
      "test.lcov",
      "coverage_lcov",
      "coverage",
      secrets,
    );
    generated.push(coverage);
    if (normalizeLcovLineCoverage(coverage.text, repositoryRoot).outcome !== "resolved") {
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
 * discover → load config → observe source start → compare working tree → plan
 * → decide admissions → execute admitted planned tasks with capture caps →
 * observe source end → build and internally validate the receipt.
 */
export async function runCheck(
  repositoryRoot: string,
  options: CheckRunOptions = {},
): Promise<CheckOutcome> {
  const lock = await acquireRunLock(repositoryRoot);
  try {
    const { root, files, discovery } = collectDiscoveredProject(repositoryRoot);
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

      const vitestPlan = planVitestTask({
        repositoryRoot: root,
        runId,
        config,
        discovery,
        files,
        changedFiles: gitComparison.changed_files,
      });
      const plans: Record<SemanticTaskType, NormalizedPlan> = {
        typecheck: normalizePlan(planTypeScriptTask({ config, discovery, files })),
        lint: normalizePlan(planESLintTask({
          config,
          discovery,
          files,
          changedFiles: gitComparison.changed_files,
        })),
        test: normalizePlan(vitestPlan),
        pytestBasic: normalizePlan(planPytestBasicTask({ config, discovery, files })),
      };

      const policy: RedactionPolicy = {
        recognized_names: [],
        configured_names: [...(config.redactEnv ?? [])],
        minimum_value_bytes: MIN_SECRET_VALUE_BYTES,
      };
      const secrets = selectedSecretValues(process.env as RedactionEnv, policy);

      const tasks: TaskResultV1[] = [];
      const evidence: EvidenceV1[] = [];
      const artifacts: ArtifactV1[] = [];

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

        const executed = task === "test"
          ? await executeVitestTask(
              root,
              runId,
              runDir.run_path,
              runDir.raw_path,
              vitestPlan as PlannedVitestTask,
              decision,
              secrets,
              taskTimeoutMs(config, task),
            )
          : await executePlannedTask(
              root,
              runId,
              runDir.raw_path,
              task,
              plan as NormalizedPlan & { state: "planned" },
              decision,
              secrets,
              taskTimeoutMs(config, task),
            );
        tasks.push(executed.task);
        evidence.push(...executed.evidence);
        artifacts.push(...executed.artifacts);
      }

      const sourceEnd = composeSourceState(root);

      const receipt = buildReceipt({
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
        selection: baseSelection(vitestPlan),
        tasks,
        exercise: emptyExercise(),
        testChanges: [] satisfies readonly TestChangeV1[],
        findings: [],
        evidence,
        artifacts,
      });
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
