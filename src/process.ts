import {
  type ChildProcess,
  type SpawnOptions,
  type SpawnSyncOptions,
} from "node:child_process";
import { createRequire } from "node:module";
import { win32 as pathWin32 } from "node:path";

export type ProcessOutcome = "exited" | "timed_out" | "error";
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
    readonly error?: Error;
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

type TimedObservation =
  | { readonly kind: "timeout" }
  | { readonly kind: "closed"; readonly close: CloseObservation }
  | { readonly kind: "control_error"; readonly error: Error };

type GroupSignalResult = "sent" | "gone" | "error";

const require = createRequire(import.meta.url);
const crossSpawn = require("cross-spawn") as CrossSpawnLike;

const PROCESS_GROUP_POLL_MS = 20;
const FORCEFUL_PROCESS_GROUP_WAIT_MS = 1_000;
const POST_TERMINATION_CLOSE_WAIT_MS = 1_000;
const WINDOWS_TREE_KILL_TIMEOUT_MS = 5_000;

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
    if (exists === null) return false;

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

  if (await waitForProcessGroupGone(processGroupId, graceMs)) return true;

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

  // taskkill may return 128 when /T /F wins a race with a process that has already
  // disappeared. With no spawn/control error, both 0 and 128 mean there is no
  // remaining target for this tree-termination attempt; all other statuses fail closed.
  return result.error === undefined && (result.status === 0 || result.status === 128);
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
    stdio: ["ignore", "pipe", "pipe"],
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

  let child: ChildProcess;
  try {
    child = crossSpawn(request.file, [...request.argv], spawnOptions(request));
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

  child.stdout.on("data", (chunk: Buffer) => {
    observeCapture(stdoutCapture, chunk, request.capture_cap_bytes);
  });
  child.stdout.on("error", recordRuntimeError);
  child.stderr.on("data", (chunk: Buffer) => {
    observeCapture(stderrCapture, chunk, request.capture_cap_bytes);
  });
  child.stderr.on("error", recordRuntimeError);

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

  const completion = await Promise.race([
    closePromise.then((close): TimedObservation => ({ kind: "closed", close })),
    timeoutPromise,
    runtimeErrorPromise,
  ]);
  if (timeoutHandle !== null) clearTimeout(timeoutHandle);

  if (completion.kind === "closed") {
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

    const cleanupComplete = await terminateProcessTree(rootPid, request.termination_grace_ms);
    const close = await closeWithin(closePromise, POST_TERMINATION_CLOSE_WAIT_MS);
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

  const cleanupComplete = await terminateProcessTree(rootPid, request.termination_grace_ms);
  const close = await closeWithin(closePromise, POST_TERMINATION_CLOSE_WAIT_MS);

  if (!cleanupComplete || close === null || preTimeoutRuntimeError !== null) {
    return errorResult(
      target,
      preTimeoutRuntimeError ?? new Error("process timeout cleanup did not complete"),
      finalizeCapture(stdoutCapture),
      finalizeCapture(stderrCapture),
      true,
      cleanupComplete && close !== null,
      close,
    );
  }

  return {
    outcome: "timed_out",
    exit_code: close.exit_code,
    signal: close.signal,
    timed_out: true,
    cleanup_complete: true,
    termination_target: target,
    stdout: finalizeCapture(stdoutCapture),
    stderr: finalizeCapture(stderrCapture),
  };
}