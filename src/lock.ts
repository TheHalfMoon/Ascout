import { randomBytes } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
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
    // Cleanup is best-effort here; the caller still fails closed on publication/recovery errors.
  }
}

async function publishOwner(lockPath: string, owner: RunLockOwner): Promise<boolean> {
  let handle: FileHandle | null = null;
  let created = false;
  try {
    handle = await open(lockPath, "wx", 0o600);
    created = true;
    await handle.writeFile(encodeOwner(owner), { encoding: "utf8" });
    await handle.sync();
    await handle.close();
    handle = null;
    return true;
  } catch (error) {
    if (!created && nodeErrorCode(error) === "EEXIST") return false;

    await closeHandle(handle);
    handle = null;
    if (created) {
      try {
        await unlink(lockPath);
      } catch {
        // A failed publication that cannot be cleaned up remains fail-closed.
      }
    }
    throw lockError("run_lock_io", "failed to publish run lock", error);
  } finally {
    await closeHandle(handle);
  }
}

async function readLockState(lockPath: string): Promise<LockState> {
  let raw: string;
  try {
    raw = await readFile(lockPath, { encoding: "utf8" });
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return { kind: "missing" };
    throw lockError("run_lock_io", "failed to read run lock", error);
  }

  const owner = parseOwner(raw);
  return owner === null
    ? { kind: "invalid" }
    : { kind: "owner", owner };
}

async function acquireRecoveryGuard(recoveryPath: string): Promise<FileHandle | null> {
  try {
    return await open(recoveryPath, "wx", 0o600);
  } catch (error) {
    if (nodeErrorCode(error) === "EEXIST") return null;
    throw lockError("run_lock_io", "failed to acquire run-lock recovery guard", error);
  }
}

async function removeRecoveryGuard(recoveryPath: string, handle: FileHandle): Promise<void> {
  await closeHandle(handle);
  try {
    await unlink(recoveryPath);
  } catch (error) {
    if (nodeErrorCode(error) !== "ENOENT") {
      throw lockError("run_lock_io", "failed to remove run-lock recovery guard", error);
    }
  }
}

async function recoverDeadOwner(
  lockPath: string,
  recoveryPath: string,
  observedOwner: RunLockOwner,
): Promise<"retry" | "recovered"> {
  const recoveryHandle = await acquireRecoveryGuard(recoveryPath);
  if (recoveryHandle === null) {
    throw lockError(
      "run_lock_recovery_busy",
      "run lock has a dead owner but another recovery is already in progress",
    );
  }

  let recoveryError: unknown;
  try {
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
  } catch (error) {
    recoveryError = error;
    throw error;
  } finally {
    try {
      await removeRecoveryGuard(recoveryPath, recoveryHandle);
    } catch (error) {
      if (recoveryError === undefined) throw error;
    }
  }
}

async function releaseOwnedLock(lockPath: string, owner: RunLockOwner): Promise<void> {
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

export async function acquireRunLock(repositoryRoot: string): Promise<RunLockHandle> {
  if (repositoryRoot.length === 0 || repositoryRoot.includes("\0")) {
    throw lockError("run_lock_unverifiable", "repository root must be a non-empty path without NUL");
  }

  const canonicalRoot = resolve(repositoryRoot);
  const lockDirectory = join(canonicalRoot, LOCK_DIRECTORY);
  const lockPath = join(lockDirectory, LOCK_FILENAME);
  const recoveryPath = join(lockDirectory, RECOVERY_FILENAME);
  const owner = newOwner();

  try {
    await mkdir(lockDirectory, { recursive: true });
  } catch (error) {
    throw lockError("run_lock_io", "failed to create Ascout runtime directory", error);
  }

  for (let attempt = 0; attempt < MAX_ACQUIRE_ATTEMPTS; attempt += 1) {
    if (await publishOwner(lockPath, owner)) {
      let released = false;
      return {
        owner_pid: owner.pid,
        async release(): Promise<void> {
          if (released) return;
          await releaseOwnedLock(lockPath, owner);
          released = true;
        },
      };
    }

    const state = await readLockState(lockPath);
    if (state.kind === "missing") continue;
    if (state.kind === "invalid") {
      throw lockError(
        "run_lock_unverifiable",
        "existing .ascout/run.lock has no verifiable owner; refusing recovery",
      );
    }
    if (!ownerIsDefinitelyDead(state.owner.pid)) {
      throw lockError("run_lock_held", "another Ascout run owns .ascout/run.lock");
    }

    const recovery = await recoverDeadOwner(lockPath, recoveryPath, state.owner);
    if (recovery === "recovered") continue;
  }

  throw lockError("run_lock_held", "could not acquire run lock after bounded recovery retries");
}
