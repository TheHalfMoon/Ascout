import { randomBytes } from "node:crypto";
import {
  link,
  mkdir,
  open,
  realpath,
  stat,
  unlink,
  type FileHandle,
} from "node:fs/promises";
import { join, resolve } from "node:path";

export type RunLockErrorCode =
  | "run_lock_held"
  | "run_lock_unverifiable"
  | "run_lock_recovery_busy"
  | "run_lock_ownership_lost"
  | "run_lock_io";

export class RunLockError extends Error {
  readonly code: RunLockErrorCode;

  constructor(code: RunLockErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RunLockError";
    this.code = code;
  }
}

interface RunLockOwner {
  readonly version: 1;
  readonly pid: number;
  readonly token: string;
}

type LockState =
  | { readonly kind: "missing" }
  | { readonly kind: "invalid" }
  | { readonly kind: "owner"; readonly owner: RunLockOwner };

export interface RunLockHandle {
  readonly owner_pid: number;
  release(): Promise<void>;
}

const LOCK_DIRECTORY = ".ascout";
const LOCK_FILENAME = "run.lock";
const RECOVERY_FILENAME = "run.lock.recovery";
const OWNER_TOKEN_BYTES = 16;
const TEMP_TOKEN_BYTES = 8;
const MAX_LOCK_BYTES = 4 * 1024;
const MAX_ACQUIRE_ATTEMPTS = 4;

function nodeErrorCode(error: unknown): string | undefined {
  return error instanceof Error
    ? (error as NodeJS.ErrnoException).code
    : undefined;
}

function lockError(
  code: RunLockErrorCode,
  message: string,
  cause?: unknown,
): RunLockError {
  return cause === undefined
    ? new RunLockError(code, message)
    : new RunLockError(code, message, { cause });
}

function newOwner(): RunLockOwner {
  return {
    version: 1,
    pid: process.pid,
    token: randomBytes(OWNER_TOKEN_BYTES).toString("hex"),
  };
}

function encodeOwner(owner: RunLockOwner): string {
  return `${JSON.stringify(owner)}\n`;
}

function parseOwner(raw: string): RunLockOwner | null {
  if (Buffer.byteLength(raw, "utf8") > MAX_LOCK_BYTES) return null;

  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return null;
  }

  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }

  const record = candidate as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (
    keys.length !== 3 ||
    keys[0] !== "pid" ||
    keys[1] !== "token" ||
    keys[2] !== "version"
  ) {
    return null;
  }

  if (record.version !== 1) return null;
  if (!Number.isSafeInteger(record.pid) || (record.pid as number) <= 0) return null;
  if (typeof record.token !== "string" || !/^[0-9a-f]{32}$/.test(record.token)) {
    return null;
  }

  return {
    version: 1,
    pid: record.pid as number,
    token: record.token,
  };
}

function sameOwner(left: RunLockOwner, right: RunLockOwner): boolean {
  return left.version === right.version && left.pid === right.pid && left.token === right.token;
}

function ownerIsDefinitelyDead(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return nodeErrorCode(error) === "ESRCH";
  }
}

async function closeHandle(handle: FileHandle | null): Promise<void> {
  if (handle === null) return;
  try {
    await handle.close();
  } catch {
    // Cleanup is best-effort here; callers still fail closed on lock-integrity errors.
  }
}

async function removeBestEffort(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // Temporary publication debris never represents active lock ownership.
  }
}

async function publishOwner(lockPath: string, owner: RunLockOwner): Promise<boolean> {
  const temporaryToken = randomBytes(TEMP_TOKEN_BYTES).toString("hex");
  const temporaryPath = `${lockPath}.${owner.token}.${temporaryToken}.tmp`;
  let handle: FileHandle | null = null;
  try {
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(encodeOwner(owner), { encoding: "utf8" });
    await handle.sync();
    await handle.close();
    handle = null;

    try {
      await link(temporaryPath, lockPath);
      return true;
    } catch (error) {
      if (nodeErrorCode(error) === "EEXIST") return false;
      throw lockError("run_lock_io", "failed to publish lock owner atomically", error);
    }
  } catch (error) {
    if (error instanceof RunLockError) throw error;
    throw lockError("run_lock_io", "failed to prepare lock owner record", error);
  } finally {
    await closeHandle(handle);
    await removeBestEffort(temporaryPath);
  }
}

async function readLockState(lockPath: string): Promise<LockState> {
  let handle: FileHandle;
  try {
    handle = await open(lockPath, "r");
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return { kind: "missing" };
    throw lockError("run_lock_io", "failed to open lock owner", error);
  }

  const buffer = Buffer.allocUnsafe(MAX_LOCK_BYTES + 1);
  let totalBytes = 0;
  try {
    while (totalBytes < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        totalBytes,
        buffer.length - totalBytes,
        totalBytes,
      );
      if (bytesRead === 0) break;
      totalBytes += bytesRead;
    }
  } catch (error) {
    throw lockError("run_lock_io", "failed to read lock owner", error);
  } finally {
    await closeHandle(handle);
  }

  if (totalBytes > MAX_LOCK_BYTES) return { kind: "invalid" };
  const owner = parseOwner(buffer.toString("utf8", 0, totalBytes));
  return owner === null
    ? { kind: "invalid" }
    : { kind: "owner", owner };
}

async function acquireMutationGuard(recoveryPath: string): Promise<RunLockOwner> {
  const owner = newOwner();

  for (let attempt = 0; attempt < MAX_ACQUIRE_ATTEMPTS; attempt += 1) {
    if (await publishOwner(recoveryPath, owner)) return owner;

    const state = await readLockState(recoveryPath);
    if (state.kind === "missing") continue;
    if (state.kind === "invalid") {
      throw lockError(
        "run_lock_unverifiable",
        "run-lock mutation guard has no verifiable owner; refusing mutation",
      );
    }

    if (ownerIsDefinitelyDead(state.owner.pid)) {
      throw lockError(
        "run_lock_recovery_busy",
        "stale run-lock mutation guard blocks automatic mutation; refusing unsafe takeover",
      );
    }

    throw lockError(
      "run_lock_recovery_busy",
      "another live process owns the run-lock mutation guard",
    );
  }

  throw lockError("run_lock_recovery_busy", "could not acquire run-lock mutation guard");
}

async function removeMutationGuard(
  recoveryPath: string,
  recoveryOwner: RunLockOwner,
): Promise<void> {
  const state = await readLockState(recoveryPath);
  if (state.kind === "missing") return;
  if (state.kind !== "owner" || !sameOwner(state.owner, recoveryOwner)) {
    throw lockError(
      "run_lock_io",
      "run-lock mutation guard ownership changed; refusing to remove it",
    );
  }

  try {
    await unlink(recoveryPath);
  } catch (error) {
    if (nodeErrorCode(error) !== "ENOENT") {
      throw lockError("run_lock_io", "failed to remove run-lock mutation guard", error);
    }
  }
}

async function cleanupGuardAfterOperationFailure(
  recoveryPath: string,
  recoveryOwner: RunLockOwner,
  operationError: unknown,
): Promise<never> {
  await removeMutationGuard(recoveryPath, recoveryOwner);
  throw operationError;
}

async function recoverDeadOwnerUnderGuard(
  lockPath: string,
  observedOwner: RunLockOwner,
): Promise<"retry" | "recovered"> {
  const state = await readLockState(lockPath);
  if (state.kind === "missing") return "retry";
  if (state.kind === "invalid") {
    throw lockError(
      "run_lock_unverifiable",
      "run lock changed to an unverifiable owner during recovery",
    );
  }
  if (!sameOwner(state.owner, observedOwner)) return "retry";
  if (!ownerIsDefinitelyDead(state.owner.pid)) {
    throw lockError("run_lock_held", "run lock owner is still alive or cannot be proven dead");
  }

  try {
    await unlink(lockPath);
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return "retry";
    throw lockError("run_lock_io", "failed to remove verified dead-owner run lock", error);
  }
  return "recovered";
}

async function acquireMainLockUnderGuard(
  lockPath: string,
  owner: RunLockOwner,
): Promise<"acquired" | "retry"> {
  const state = await readLockState(lockPath);

  if (state.kind === "missing") {
    return (await publishOwner(lockPath, owner)) ? "acquired" : "retry";
  }
  if (state.kind === "invalid") {
    throw lockError(
      "run_lock_unverifiable",
      "existing .ascout/run.lock has no verifiable owner; refusing recovery",
    );
  }
  if (!ownerIsDefinitelyDead(state.owner.pid)) {
    throw lockError("run_lock_held", "another Ascout run owns .ascout/run.lock");
  }

  const recovery = await recoverDeadOwnerUnderGuard(lockPath, state.owner);
  if (recovery !== "recovered") return "retry";
  return (await publishOwner(lockPath, owner)) ? "acquired" : "retry";
}

async function removeOwnedMainLockBestEffort(
  lockPath: string,
  owner: RunLockOwner,
): Promise<void> {
  try {
    const state = await readLockState(lockPath);
    if (state.kind !== "owner" || !sameOwner(state.owner, owner)) return;
    await unlink(lockPath);
  } catch {
    // A failed rollback leaves the repository fail-closed behind a live or unverifiable lock.
  }
}

async function acquireMainLockAttempt(
  lockPath: string,
  recoveryPath: string,
  owner: RunLockOwner,
): Promise<"acquired" | "retry"> {
  const mutationOwner = await acquireMutationGuard(recoveryPath);

  let outcome: "acquired" | "retry";
  try {
    outcome = await acquireMainLockUnderGuard(lockPath, owner);
  } catch (error) {
    return cleanupGuardAfterOperationFailure(recoveryPath, mutationOwner, error);
  }

  try {
    await removeMutationGuard(recoveryPath, mutationOwner);
  } catch (cleanupError) {
    if (outcome === "acquired") {
      await removeOwnedMainLockBestEffort(lockPath, owner);
    }
    try {
      await removeMutationGuard(recoveryPath, mutationOwner);
    } catch {
      // Preserve the first cleanup failure; a surviving guard keeps later mutation fail-closed.
    }
    throw cleanupError;
  }

  return outcome;
}

async function releaseOwnedLockUnderGuard(
  lockPath: string,
  owner: RunLockOwner,
): Promise<void> {
  const state = await readLockState(lockPath);
  if (state.kind !== "owner" || !sameOwner(state.owner, owner)) {
    throw lockError(
      "run_lock_ownership_lost",
      "run lock no longer belongs to this handle; refusing to remove it",
    );
  }

  try {
    await unlink(lockPath);
  } catch (error) {
    throw lockError("run_lock_io", "failed to release run lock", error);
  }
}

async function releaseOwnedLock(
  lockPath: string,
  recoveryPath: string,
  owner: RunLockOwner,
): Promise<void> {
  const mutationOwner = await acquireMutationGuard(recoveryPath);
  try {
    await releaseOwnedLockUnderGuard(lockPath, owner);
  } catch (error) {
    return cleanupGuardAfterOperationFailure(recoveryPath, mutationOwner, error);
  }

  await removeMutationGuard(recoveryPath, mutationOwner);
}

export async function acquireRunLock(repositoryRoot: string): Promise<RunLockHandle> {
  if (repositoryRoot.length === 0 || repositoryRoot.includes("\0")) {
    throw lockError("run_lock_unverifiable", "repository root must be a non-empty path without NUL");
  }

  let canonicalRoot: string;
  try {
    canonicalRoot = await realpath(resolve(repositoryRoot));
    const rootStats = await stat(canonicalRoot);
    if (!rootStats.isDirectory()) {
      throw lockError("run_lock_unverifiable", "repository root is not a directory");
    }
  } catch (error) {
    if (error instanceof RunLockError) throw error;
    throw lockError(
      "run_lock_unverifiable",
      "repository root is not an existing resolvable directory",
      error,
    );
  }

  const lockDirectory = join(canonicalRoot, LOCK_DIRECTORY);
  const lockPath = join(lockDirectory, LOCK_FILENAME);
  const recoveryPath = join(lockDirectory, RECOVERY_FILENAME);
  const owner = newOwner();

  try {
    await mkdir(lockDirectory, { recursive: true });
  } catch (error) {
    throw lockError("run_lock_io", "failed to create Ascout runtime directory", error);
  }

  let released = false;
  let releaseInFlight: Promise<void> | null = null;

  for (let attempt = 0; attempt < MAX_ACQUIRE_ATTEMPTS; attempt += 1) {
    const outcome = await acquireMainLockAttempt(lockPath, recoveryPath, owner);
    if (outcome !== "acquired") continue;

    return {
      owner_pid: owner.pid,
      async release(): Promise<void> {
        if (released) return;
        if (releaseInFlight === null) {
          releaseInFlight = releaseOwnedLock(lockPath, recoveryPath, owner)
            .then(() => {
              released = true;
            })
            .finally(() => {
              releaseInFlight = null;
            });
        }
        await releaseInFlight;
      },
    };
  }

  throw lockError("run_lock_held", "could not acquire run lock after bounded retries");
}
