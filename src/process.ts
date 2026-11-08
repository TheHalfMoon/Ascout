import {
  spawn,
  type ChildProcess,
  type SpawnOptions,
  type SpawnSyncOptions,
} from "node:child_process";
import { createRequire } from "node:module";
import { win32 as pathWin32 } from "node:path";

import { trustedCommandExecutable } from "./git.js";

export type ProcessOutcome =
  | "exited"
  | "timed_out"
  | "error"
  | "cancelled"
  | "capture_limit"
  | "tree_escape";
export type ProcessTerminationTarget = "process_group" | "native_process_tree";

export interface ProcessCapture {
  readonly bytes: Buffer;
  readonly captured_bytes: number;
  readonly observed_bytes: number;
  readonly truncated: boolean;
}

export interface ProcessRunRequest {
  readonly file: string;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly timeout_ms: number;
  readonly termination_grace_ms: number;
  readonly capture_cap_bytes: number;
  /** Starts file exactly as named. On Windows cross-spawn would otherwise read it and may use cmd.exe. */
  readonly exact_executable?: boolean;
  /** Replaces capture_cap_bytes for stderr. */
  readonly stderr_capture_cap_bytes?: number;
  /** Written to the child's stdin, which is then closed. Stdin is ignored when omitted. */
  readonly stdin_bytes?: Uint8Array;
  /** Stops the owned tree on abort, with outcome "cancelled". */
  readonly signal?: AbortSignal;
  /** Stops the owned tree when a stream passes its cap, with outcome "capture_limit". */
  readonly stop_on_capture_limit?: boolean;
  /** Stops any descendant seen to outlive the root, with outcome "tree_escape". */
  readonly require_tree_exit?: boolean;
  /**
   * Resolves a bare `file` through PATH entries outside this repository root before launch,
   * so no lookup searches the working directory. Unresolved, nothing starts.
   */
  readonly resolve_bare_file_outside?: string;
}

function isBareCommand(file: string): boolean {
  return !file.includes("/") && !file.includes("\\");
}

export interface ProcessErrorDetail {
  readonly code?: string;
  readonly message: string;
}

export interface ProcessRunResult {
  readonly outcome: ProcessOutcome;
  readonly exit_code: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly timed_out: boolean;
  readonly cleanup_complete: boolean;
  readonly termination_target: ProcessTerminationTarget;
  readonly stdout: ProcessCapture;
  readonly stderr: ProcessCapture;
  readonly error?: ProcessErrorDetail;
}

export class ProcessControlError extends Error {
  readonly code = "invalid_process_request";

  constructor(message: string) {
    super(message);
    this.name = "ProcessControlError";
  }
}

interface CrossSpawnLike {
  (
    file: string,
    argv: readonly string[],
    options: SpawnOptions,
  ): ChildProcess;
  sync(
    file: string,
    argv: readonly string[],
    options: SpawnSyncOptions,
  ): {
    readonly status: number | null;
    readonly error?: Error | null;
  };
}

interface MutableCapture {
  readonly chunks: Buffer[];
  captured_bytes: number;
  observed_bytes: number;
  truncated: boolean;
}

interface CloseObservation {
  readonly exit_code: number | null;
  readonly signal: NodeJS.Signals | null;
}

type LaunchObservation =
  | { readonly kind: "spawned" }
  | { readonly kind: "error"; readonly error: Error };

type StopReason = "cancelled" | "capture_limit" | "tree_escape";

type TimedObservation =
  | { readonly kind: "timeout" }
  | { readonly kind: "closed"; readonly close: CloseObservation }
  | { readonly kind: "control_error"; readonly error: Error }
  | { readonly kind: "stopped"; readonly reason: StopReason };

type GroupSignalResult = "sent" | "gone" | "error";

const require = createRequire(import.meta.url);
const crossSpawn = require("cross-spawn") as CrossSpawnLike;

const PROCESS_GROUP_POLL_MS = 20;
const FORCEFUL_PROCESS_GROUP_WAIT_MS = 1_000;
const POST_TERMINATION_CLOSE_WAIT_MS = 1_000;
const WINDOWS_TREE_KILL_TIMEOUT_MS = 5_000;
// After the root exits, its streams should end once the pipe buffers drain. Output
// restarts this wait, so a slow drain is not mistaken for a descendant holding the pipes.
const ROOT_EXIT_DRAIN_WAIT_MS = 1_000;
const ROOT_EXIT_GROUP_WAIT_MS = 250;

function requireNonEmptyNoNul(value: string, field: string): void {
  if (value.length === 0) {
    throw new ProcessControlError(`${field} must be non-empty`);
  }
  if (value.includes("\0")) {
    throw new ProcessControlError(`${field} must not contain NUL`);
  }
}

function containsWindowsCommandSeparator(value: string): boolean {
  return value.includes("\r") || value.includes("\n");
}

function requireIntegerAtLeast(value: number, minimum: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new ProcessControlError(`${field} must be a safe integer >= ${minimum}`);
  }
}

function validateRequest(request: ProcessRunRequest): void {
  requireNonEmptyNoNul(request.file, "file");
  requireNonEmptyNoNul(request.cwd, "cwd");
  requireIntegerAtLeast(request.timeout_ms, 1, "timeout_ms");
  requireIntegerAtLeast(request.termination_grace_ms, 0, "termination_grace_ms");
  requireIntegerAtLeast(request.capture_cap_bytes, 0, "capture_cap_bytes");
  if (request.stderr_capture_cap_bytes !== undefined) {
    requireIntegerAtLeast(request.stderr_capture_cap_bytes, 0, "stderr_capture_cap_bytes");
  }
  if (request.stdin_bytes !== undefined && !(request.stdin_bytes instanceof Uint8Array)) {
    throw new ProcessControlError("stdin_bytes must be a Uint8Array");
  }

  if (process.platform === "win32" && containsWindowsCommandSeparator(request.file)) {
    throw new ProcessControlError("file must not contain CR or LF on Windows");
  }

  for (let index = 0; index < request.argv.length; index += 1) {
    const value = request.argv[index];
    if (typeof value !== "string") {
      throw new ProcessControlError(`argv[${index}] must be a string`);
    }
    if (value.includes("\0")) {
      throw new ProcessControlError(`argv[${index}] must not contain NUL`);
    }
    if (process.platform === "win32" && containsWindowsCommandSeparator(value)) {
      throw new ProcessControlError(`argv[${index}] must not contain CR or LF on Windows`);
    }
  }
}

function terminationTarget(): ProcessTerminationTarget {
  return process.platform === "win32" ? "native_process_tree" : "process_group";
}

function newMutableCapture(): MutableCapture {
  return {
    chunks: [],
    captured_bytes: 0,
    observed_bytes: 0,
    truncated: false,
  };
}

function observeCapture(
  capture: MutableCapture,
  chunk: Buffer,
  capBytes: number,
): void {
  const observedBytes = capture.observed_bytes + chunk.length;
  if (!Number.isSafeInteger(observedBytes)) {
    capture.observed_bytes = Number.MAX_SAFE_INTEGER;
    capture.truncated = true;
    return;
  }
  capture.observed_bytes = observedBytes;

  const remaining = capBytes - capture.captured_bytes;
  if (remaining <= 0) {
    if (chunk.length > 0) capture.truncated = true;
    return;
  }

  const piece = chunk.subarray(0, Math.min(remaining, chunk.length));
  if (piece.length > 0) {
    capture.chunks.push(Buffer.from(piece));
    capture.captured_bytes += piece.length;
  }
  if (piece.length < chunk.length) capture.truncated = true;
}

function finalizeCapture(capture: MutableCapture): ProcessCapture {
  return {
    bytes: Buffer.concat(capture.chunks, capture.captured_bytes),
    captured_bytes: capture.captured_bytes,
    observed_bytes: capture.observed_bytes,
    truncated: capture.truncated || capture.observed_bytes > capture.captured_bytes,
  };
}

function emptyCapture(): ProcessCapture {
  return {
    bytes: Buffer.alloc(0),
    captured_bytes: 0,
    observed_bytes: 0,
    truncated: false,
  };
}

function processErrorDetail(error: Error): ProcessErrorDetail {
  const code = (error as NodeJS.ErrnoException).code;
  return typeof code === "string"
    ? { code, message: error.message }
    : { message: error.message };
}

function processErrorCode(error: Error): string | undefined {
  const code = (error as NodeJS.ErrnoException).code;
  return typeof code === "string" ? code : undefined;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function processGroupExists(processGroupId: number): boolean | null {
  try {
    process.kill(-processGroupId, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return false;
    return null;
  }
}

function signalProcessGroup(processGroupId: number, signal: NodeJS.Signals): GroupSignalResult {
  try {
    process.kill(-processGroupId, signal);
    return "sent";
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return "gone";
    return "error";
  }
}

async function waitForProcessGroupGone(
  processGroupId: number,
  waitMs: number,
): Promise<boolean> {
  const deadline = Date.now() + waitMs;
  while (true) {
    const exists = processGroupExists(processGroupId);
    if (exists === false) return true;

    const remaining = deadline - Date.now();
    if (remaining <= 0) return false;
    await sleep(Math.min(PROCESS_GROUP_POLL_MS, remaining));
  }
}

async function terminatePosixProcessGroup(
  processGroupId: number,
  graceMs: number,
): Promise<boolean> {
  const graceful = signalProcessGroup(processGroupId, "SIGTERM");
  if (graceful === "gone") return true;
  if (graceful === "error") return false;

  // A just-signaled process group can transiently return EPERM to the signal-0 probe on
  // macOS while the group is collapsing. Keep that state fail-closed, but allow one bounded
  // polling interval even when caller grace is zero before escalating to SIGKILL.
  if (await waitForProcessGroupGone(processGroupId, Math.max(graceMs, PROCESS_GROUP_POLL_MS))) {
    return true;
  }

  const forceful = signalProcessGroup(processGroupId, "SIGKILL");
  if (forceful === "gone") return true;
  if (forceful === "error") return false;

  return waitForProcessGroupGone(processGroupId, FORCEFUL_PROCESS_GROUP_WAIT_MS);
}

function windowsTaskkillPath(): string | null {
  const systemRoot = process.env.SystemRoot;
  if (
    systemRoot === undefined ||
    systemRoot.length === 0 ||
    systemRoot.includes("\0") ||
    !pathWin32.isAbsolute(systemRoot) ||
    systemRoot.startsWith("\\\\")
  ) {
    return null;
  }
  return pathWin32.join(systemRoot, "System32", "taskkill.exe");
}

function terminateWindowsProcessTree(rootPid: number): boolean {
  const taskkillPath = windowsTaskkillPath();
  if (taskkillPath === null) return false;

  const result = crossSpawn.sync(
    taskkillPath,
    ["/PID", String(rootPid), "/T", "/F"],
    {
      shell: false,
      windowsHide: true,
      stdio: "ignore",
      timeout: WINDOWS_TREE_KILL_TIMEOUT_MS,
    },
  );

  // cross-spawn@7.0.6 normalizes a successful sync call to error=null. Absence of a
  // spawn/control error is therefore null or undefined. taskkill may also return 128 when
  // /T /F wins an already-gone race; all other statuses remain fail-closed.
  return (
    (result.error === undefined || result.error === null) &&
    (result.status === 0 || result.status === 128)
  );
}

async function terminateProcessTree(rootPid: number, graceMs: number): Promise<boolean> {
  if (!Number.isSafeInteger(rootPid) || rootPid <= 0) return false;
  if (process.platform === "win32") {
    return terminateWindowsProcessTree(rootPid);
  }
  return terminatePosixProcessGroup(rootPid, graceMs);
}

function closeWithin(
  closePromise: Promise<CloseObservation>,
  waitMs: number,
): Promise<CloseObservation | null> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, waitMs);

    void closePromise.then((close) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(close);
    });
  });
}

function spawnOptions(request: ProcessRunRequest): SpawnOptions {
  return {
    cwd: request.cwd,
    shell: false,
    detached: process.platform !== "win32",
    windowsHide: true,
    stdio: [request.stdin_bytes === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    ...(request.env === undefined ? {} : { env: { ...request.env } }),
  };
}

function errorResult(
  target: ProcessTerminationTarget,
  error: Error,
  stdout: ProcessCapture,
  stderr: ProcessCapture,
  timedOut: boolean,
  cleanupComplete: boolean,
  close: CloseObservation | null = null,
): ProcessRunResult {
  return {
    outcome: "error",
    exit_code: close?.exit_code ?? null,
    signal: close?.signal ?? null,
    timed_out: timedOut,
    cleanup_complete: cleanupComplete,
    termination_target: target,
    stdout,
    stderr,
    error: processErrorDetail(error),
  };
}

export async function runProcess(request: ProcessRunRequest): Promise<ProcessRunResult> {
  validateRequest(request);
  const target = terminationTarget();
  const stdoutCapture = newMutableCapture();
  const stderrCapture = newMutableCapture();
  const stderrCapBytes = request.stderr_capture_cap_bytes ?? request.capture_cap_bytes;

  if (request.signal?.aborted === true) {
    return {
      outcome: "cancelled",
      exit_code: null,
      signal: null,
      timed_out: false,
      cleanup_complete: true,
      termination_target: target,
      stdout: emptyCapture(),
      stderr: emptyCapture(),
    };
  }

  let file = request.file;
  if (request.resolve_bare_file_outside !== undefined && isBareCommand(file)) {
    const resolved = trustedCommandExecutable(request.resolve_bare_file_outside, file);
    if (resolved === null) {
      const error = Object.assign(new Error(`no ${file} executable found on PATH outside the repository`), { code: "ENOENT" });
      return errorResult(target, error, emptyCapture(), emptyCapture(), false, true);
    }
    file = resolved;
  }

  let child: ChildProcess;
  try {
    child = request.exact_executable === true
      ? spawn(file, [...request.argv], spawnOptions(request))
      : crossSpawn(file, [...request.argv], spawnOptions(request));
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error("process launch threw a non-Error value");
    return errorResult(target, normalized, emptyCapture(), emptyCapture(), false, true);
  }

  if (child.stdout === null || child.stderr === null) {
    const error = new Error("process launch did not provide piped stdout/stderr");
    const pid = child.pid;
    const cleanupComplete = pid === undefined
      ? false
      : await terminateProcessTree(pid, request.termination_grace_ms);
    return errorResult(target, error, emptyCapture(), emptyCapture(), false, cleanupComplete);
  }

  let runtimeError: Error | null = null;
  let preTimeoutRuntimeError: Error | null = null;
  let timeoutObserved = false;
  let resolveRuntimeError: ((observation: TimedObservation) => void) | null = null;
  const runtimeErrorPromise = new Promise<TimedObservation>((resolve) => {
    resolveRuntimeError = resolve;
  });
  const recordRuntimeError = (error: Error): void => {
    if (runtimeError !== null) return;
    runtimeError = error;
    if (timeoutObserved) return;
    preTimeoutRuntimeError = error;
    resolveRuntimeError?.({ kind: "control_error", error });
  };

  let resolveStop: ((observation: TimedObservation) => void) | null = null;
  const stopPromise = new Promise<TimedObservation>((resolve) => {
    resolveStop = resolve;
  });
  const requestStop = (reason: StopReason): void => {
    timeoutObserved = true;
    resolveStop?.({ kind: "stopped", reason });
  };

  let drainTimer: NodeJS.Timeout | null = null;
  let settled = false;
  const armDrainTimer = (): void => {
    if (drainTimer !== null) clearTimeout(drainTimer);
    if (settled) return;
    drainTimer = setTimeout(() => requestStop("tree_escape"), ROOT_EXIT_DRAIN_WAIT_MS);
  };
  const clearDrainTimer = (): void => {
    if (drainTimer !== null) clearTimeout(drainTimer);
  };
  // Always tracked: on Windows a timeout must not taskkill an exited root's PID, which may be reused.
  let rootExited = false;
  child.once("exit", () => {
    rootExited = true;
    if (request.require_tree_exit === true) armDrainTimer();
  });
  const observeOutput = (capture: MutableCapture, chunk: Buffer, capBytes: number): void => {
    observeCapture(capture, chunk, capBytes);
    if (request.stop_on_capture_limit === true && capture.truncated) {
      requestStop("capture_limit");
    }
    if (rootExited && request.require_tree_exit === true) armDrainTimer();
  };

  child.stdout.on("data", (chunk: Buffer) => {
    observeOutput(stdoutCapture, chunk, request.capture_cap_bytes);
  });
  child.stdout.on("error", recordRuntimeError);
  child.stderr.on("data", (chunk: Buffer) => {
    observeOutput(stderrCapture, chunk, stderrCapBytes);
  });
  child.stderr.on("error", recordRuntimeError);

  if (request.stdin_bytes !== undefined) {
    // A child may exit without reading its input, so a broken pipe here is not a failure.
    child.stdin?.on("error", () => {});
    child.stdin?.end(Buffer.from(request.stdin_bytes));
  }
  // A descendant holding these pipes would otherwise keep this process alive after we return.
  const releasePipes = (): void => {
    child.stdin?.destroy();
    child.stdout?.destroy();
    child.stderr?.destroy();
  };

  let launchResolved = false;
  const launchPromise = new Promise<LaunchObservation>((resolve) => {
    child.once("spawn", () => {
      if (launchResolved) return;
      launchResolved = true;
      resolve({ kind: "spawned" });
    });
    child.on("error", (error: Error) => {
      recordRuntimeError(error);
      if (launchResolved) return;
      launchResolved = true;
      resolve({ kind: "error", error });
    });
  });

  const closePromise = new Promise<CloseObservation>((resolve) => {
    child.once("close", (exitCode, signal) => {
      resolve({
        exit_code: exitCode,
        signal,
      });
    });
  });

  // Establish process ownership before the task timeout begins. Node guarantees a successful
  // spawn emits `spawn` before other process lifecycle events; a failed launch emits `error`.
  // This removes the unsafe state where a timeout could fire before a PID exists and a process
  // could appear after runProcess had already returned without tree cleanup.
  const launch = await launchPromise;
  if (launch.kind === "error") {
    return errorResult(
      target,
      launch.error,
      finalizeCapture(stdoutCapture),
      finalizeCapture(stderrCapture),
      false,
      true,
    );
  }

  const rootPid = child.pid;
  if (rootPid === undefined || !Number.isSafeInteger(rootPid) || rootPid <= 0) {
    return errorResult(
      target,
      new Error("spawned process did not expose a valid PID for tree control"),
      finalizeCapture(stdoutCapture),
      finalizeCapture(stderrCapture),
      false,
      false,
    );
  }

  let timeoutHandle: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<TimedObservation>((resolve) => {
    timeoutHandle = setTimeout(() => {
      timeoutObserved = true;
      resolve({ kind: "timeout" });
    }, request.timeout_ms);
  });

  // Windows may have reused the PID of a root that exited, so taskkill could hit a stranger's
  // tree. Nothing can walk the orphaned tree anyway, so only the pipes closing can confirm it.
  const terminateOwnedTree = async (): Promise<boolean> =>
    rootExited && target === "native_process_tree"
      ? true
      : terminateProcessTree(rootPid, request.termination_grace_ms);

  const signal = request.signal;
  const onAbort = (): void => requestStop("cancelled");
  signal?.addEventListener("abort", onAbort, { once: true });
  if (signal?.aborted === true) onAbort();

  const completion = await Promise.race([
    closePromise.then((close): TimedObservation => ({ kind: "closed", close })),
    timeoutPromise,
    runtimeErrorPromise,
    stopPromise,
  ]);
  if (timeoutHandle !== null) clearTimeout(timeoutHandle);
  signal?.removeEventListener("abort", onAbort);
  settled = true;
  clearDrainTimer();

  if (completion.kind === "closed") {
    // Streams can close while a descendant that dropped them still runs in the group.
    if (
      request.require_tree_exit === true &&
      target === "process_group" &&
      preTimeoutRuntimeError === null &&
      !(await waitForProcessGroupGone(rootPid, ROOT_EXIT_GROUP_WAIT_MS))
    ) {
      const groupGone = await terminateProcessTree(rootPid, request.termination_grace_ms);
      return {
        outcome: groupGone ? "tree_escape" : "error",
        exit_code: completion.close.exit_code,
        signal: completion.close.signal,
        timed_out: false,
        cleanup_complete: groupGone,
        termination_target: target,
        stdout: finalizeCapture(stdoutCapture),
        stderr: finalizeCapture(stderrCapture),
        ...(groupGone
          ? {}
          : { error: { message: "process group outlived its root and could not be stopped" } }),
      };
    }
    if (preTimeoutRuntimeError !== null) {
      return errorResult(
        target,
        preTimeoutRuntimeError,
        finalizeCapture(stdoutCapture),
        finalizeCapture(stderrCapture),
        false,
        true,
        completion.close,
      );
    }
    return {
      outcome: "exited",
      exit_code: completion.close.exit_code,
      signal: completion.close.signal,
      timed_out: false,
      cleanup_complete: true,
      termination_target: target,
      stdout: finalizeCapture(stdoutCapture),
      stderr: finalizeCapture(stderrCapture),
    };
  }

  if (completion.kind === "control_error") {
    if (processErrorCode(completion.error) === "ENOENT") {
      const close = await closeWithin(closePromise, POST_TERMINATION_CLOSE_WAIT_MS);
      if (close !== null) {
        return errorResult(
          target,
          completion.error,
          finalizeCapture(stdoutCapture),
          finalizeCapture(stderrCapture),
          false,
          true,
        );
      }
    }

    const cleanupComplete = await terminateOwnedTree();
    const close = await closeWithin(closePromise, POST_TERMINATION_CLOSE_WAIT_MS);
    if (close === null) releasePipes();
    return errorResult(
      target,
      completion.error,
      finalizeCapture(stdoutCapture),
      finalizeCapture(stderrCapture),
      false,
      cleanupComplete && close !== null,
      close,
    );
  }

  const timedOut = completion.kind === "timeout";
  const cleanupComplete = await terminateOwnedTree();
  const close = await closeWithin(closePromise, POST_TERMINATION_CLOSE_WAIT_MS);
  if (close === null) releasePipes();

  if (!cleanupComplete || close === null || preTimeoutRuntimeError !== null) {
    return errorResult(
      target,
      preTimeoutRuntimeError ??
        new Error(`process ${timedOut ? "timeout" : "stop"} cleanup did not complete`),
      finalizeCapture(stdoutCapture),
      finalizeCapture(stderrCapture),
      timedOut,
      cleanupComplete && close !== null,
      close,
    );
  }

  return {
    outcome: timedOut ? "timed_out" : completion.reason,
    exit_code: close.exit_code,
    signal: close.signal,
    timed_out: timedOut,
    cleanup_complete: true,
    termination_target: target,
    stdout: finalizeCapture(stdoutCapture),
    stderr: finalizeCapture(stderrCapture),
  };
}