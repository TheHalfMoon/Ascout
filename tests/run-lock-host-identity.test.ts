import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { acquireRunLock } from "../src/lock.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ascout-lock-host-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function lockFile(): string {
  return join(root, ".ascout", "run.lock");
}

async function exitedPid(): Promise<number> {
  const child = spawn(process.execPath, ["-e", "process.exit(0)"], { stdio: "ignore", windowsHide: true });
  const pid = child.pid;
  if (pid === undefined) throw new Error("fixture child did not expose a PID");
  await once(child, "close");
  return pid;
}

/** This host's identity, as a lock taken here records it. */
async function thisHost(): Promise<string> {
  const handle = await acquireRunLock(root);
  const host = (JSON.parse(readFileSync(lockFile(), "utf8")) as { host: string }).host;
  await handle.release();
  return host;
}

function writeOwner(owner: object): string {
  mkdirSync(join(root, ".ascout"), { recursive: true });
  const text = `${JSON.stringify(owner)}\n`;
  writeFileSync(lockFile(), text);
  return text;
}

describe("run lock host identity", () => {
  it("never takes over a lock from another host or PID namespace, even with a dead PID", async () => {
    const original = writeOwner({ version: 2, host: "f".repeat(32), pid: await exitedPid(), token: "1".repeat(32) });
    await expect(acquireRunLock(root)).rejects.toMatchObject({
      code: "run_lock_held",
      message: expect.stringContaining("another host or PID namespace"),
    });
    expect(readFileSync(lockFile(), "utf8")).toBe(original);
  });

  it("still recovers a dead owner from this host", async () => {
    const host = await thisHost();
    writeOwner({ version: 2, host, pid: await exitedPid(), token: "2".repeat(32) });
    const handle = await acquireRunLock(root);
    expect(JSON.parse(readFileSync(lockFile(), "utf8"))).toMatchObject({ version: 2, host, pid: process.pid });
    await handle.release();
  });

  it("still recovers a dead owner recorded by an older Ascout without a host", async () => {
    writeOwner({ version: 1, pid: await exitedPid(), token: "3".repeat(32) });
    const handle = await acquireRunLock(root);
    await handle.release();
  });

  it("treats a malformed host as an unverifiable owner", async () => {
    writeOwner({ version: 2, host: "not-a-digest", pid: process.pid, token: "4".repeat(32) });
    await expect(acquireRunLock(root)).rejects.toMatchObject({ code: "run_lock_unverifiable" });
  });
});
