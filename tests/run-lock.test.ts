import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  acquireRunLock,
  RunLockError,
  type RunLockHandle,
} from "../src/lock.js";

const temporaryDirectories: string[] = [];

function temporaryRepository(): string {
  const directory = mkdtempSync(join(tmpdir(), "ascout-t022-lock-"));
  temporaryDirectories.push(directory);
  return directory;
}

function lockPath(repositoryRoot: string): string {
  return join(repositoryRoot, ".ascout", "run.lock");
}

function recoveryPath(repositoryRoot: string): string {
  return join(repositoryRoot, ".ascout", "run.lock.recovery");
}

function ownerRecord(pid: number, token: string): string {
  return `${JSON.stringify({ version: 1, pid, token })}\n`;
}

function writeOwner(repositoryRoot: string, pid: number, token = "0".repeat(32)): void {
  mkdirSync(join(repositoryRoot, ".ascout"), { recursive: true });
  writeFileSync(lockPath(repositoryRoot), ownerRecord(pid, token), "utf8");
}

async function definitelyExitedPid(): Promise<number> {
  const child = spawn(process.execPath, ["-e", "process.exit(0)"], {
    stdio: "ignore",
    windowsHide: true,
  });
  const pid = child.pid;
  if (pid === undefined) throw new Error("fixture child did not expose a PID");
  await once(child, "close");
  return pid;
}

function fulfilledHandle(
  result: PromiseSettledResult<RunLockHandle>,
): RunLockHandle | null {
  return result.status === "fulfilled" ? result.value : null;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("T022 run lock", () => {
  it("publishes one complete atomic owner when acquisitions race", async () => {
    const repositoryRoot = temporaryRepository();

    const results = await Promise.allSettled([
      acquireRunLock(repositoryRoot),
      acquireRunLock(repositoryRoot),
    ]);

    const handles = results
      .map(fulfilledHandle)
      .filter((handle): handle is RunLockHandle => handle !== null);
    const rejections = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    expect(handles).toHaveLength(1);
    expect(rejections).toHaveLength(1);
    expect(rejections[0]?.reason).toBeInstanceOf(RunLockError);
    expect((rejections[0]?.reason as RunLockError).code).toBe("run_lock_held");

    const persisted = JSON.parse(readFileSync(lockPath(repositoryRoot), "utf8")) as {
      version: number;
      pid: number;
      token: string;
    };
    expect(persisted.version).toBe(1);
    expect(persisted.pid).toBe(process.pid);
    expect(persisted.token).toMatch(/^[0-9a-f]{32}$/);

    await handles[0]?.release();
    expect(existsSync(lockPath(repositoryRoot))).toBe(false);
  });

  it("refuses a second acquisition while the verified owner is live", async () => {
    const repositoryRoot = temporaryRepository();
    const first = await acquireRunLock(repositoryRoot);

    await expect(acquireRunLock(repositoryRoot)).rejects.toMatchObject({
      code: "run_lock_held",
    });
    expect(existsSync(lockPath(repositoryRoot))).toBe(true);

    await first.release();
  });

  it("recovers only after the persisted owner is definitely dead", async () => {
    const repositoryRoot = temporaryRepository();
    const deadPid = await definitelyExitedPid();
    writeOwner(repositoryRoot, deadPid, "1".repeat(32));

    const recovered = await acquireRunLock(repositoryRoot);
    const persisted = JSON.parse(readFileSync(lockPath(repositoryRoot), "utf8")) as {
      version: number;
      pid: number;
      token: string;
    };

    expect(persisted.version).toBe(1);
    expect(persisted.pid).toBe(process.pid);
    expect(persisted.token).not.toBe("1".repeat(32));
    expect(existsSync(recoveryPath(repositoryRoot))).toBe(false);

    await recovered.release();
  });

  it("recovers a recovery guard only when that guard owner is also definitely dead", async () => {
    const repositoryRoot = temporaryRepository();
    const deadPid = await definitelyExitedPid();
    writeOwner(repositoryRoot, deadPid, "2".repeat(32));
    writeFileSync(
      recoveryPath(repositoryRoot),
      ownerRecord(deadPid, "3".repeat(32)),
      "utf8",
    );

    const recovered = await acquireRunLock(repositoryRoot);

    expect(existsSync(recoveryPath(repositoryRoot))).toBe(false);
    const persisted = JSON.parse(readFileSync(lockPath(repositoryRoot), "utf8")) as {
      pid: number;
      token: string;
    };
    expect(persisted.pid).toBe(process.pid);
    expect(persisted.token).not.toBe("2".repeat(32));

    await recovered.release();
  });

  it("does not steal dead-owner recovery from a live recovery-guard owner", async () => {
    const repositoryRoot = temporaryRepository();
    const deadPid = await definitelyExitedPid();
    writeOwner(repositoryRoot, deadPid, "4".repeat(32));
    const liveGuard = ownerRecord(process.pid, "5".repeat(32));
    writeFileSync(recoveryPath(repositoryRoot), liveGuard, "utf8");

    await expect(acquireRunLock(repositoryRoot)).rejects.toMatchObject({
      code: "run_lock_recovery_busy",
    });
    expect(readFileSync(lockPath(repositoryRoot), "utf8")).toBe(
      ownerRecord(deadPid, "4".repeat(32)),
    );
    expect(readFileSync(recoveryPath(repositoryRoot), "utf8")).toBe(liveGuard);
  });

  it("fails closed on an unverifiable existing lock without deleting it", async () => {
    const repositoryRoot = temporaryRepository();
    mkdirSync(join(repositoryRoot, ".ascout"), { recursive: true });
    const malformed = "{not-json\n";
    writeFileSync(lockPath(repositoryRoot), malformed, "utf8");

    await expect(acquireRunLock(repositoryRoot)).rejects.toMatchObject({
      code: "run_lock_unverifiable",
    });
    expect(readFileSync(lockPath(repositoryRoot), "utf8")).toBe(malformed);
  });

  it("refuses to release a lock whose ownership token changed", async () => {
    const repositoryRoot = temporaryRepository();
    const handle = await acquireRunLock(repositoryRoot);
    const replacement = ownerRecord(process.pid, "f".repeat(32));
    writeFileSync(lockPath(repositoryRoot), replacement, "utf8");

    await expect(handle.release()).rejects.toMatchObject({
      code: "run_lock_ownership_lost",
    });
    expect(readFileSync(lockPath(repositoryRoot), "utf8")).toBe(replacement);
  });

  it("makes release idempotent after successful ownership release", async () => {
    const repositoryRoot = temporaryRepository();
    const handle = await acquireRunLock(repositoryRoot);

    await handle.release();
    await handle.release();

    expect(existsSync(lockPath(repositoryRoot))).toBe(false);
  });

  it("rejects invalid repository-root input before touching runtime state", async () => {
    await expect(acquireRunLock("")).rejects.toMatchObject({
      code: "run_lock_unverifiable",
    });
    await expect(acquireRunLock("bad\0root")).rejects.toMatchObject({
      code: "run_lock_unverifiable",
    });
  });
});
