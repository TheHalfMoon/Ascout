import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { acquireRunLock } from "../src/lock.js";

const POSIX = process.platform !== "win32";

let scratch: string;
let project: string;
let outside: string;
const startingDirectory = process.cwd();

beforeEach(() => {
  scratch = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-linked-paths-")));
  project = join(scratch, "project");
  outside = join(scratch, "outside");
  mkdirSync(project);
  mkdirSync(outside);
});

afterEach(() => {
  process.chdir(startingDirectory);
  vi.restoreAllMocks();
  rmSync(scratch, { recursive: true, force: true });
});

async function runInit(): Promise<number> {
  process.chdir(project);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.resetModules();
  const { runCli } = await import("../src/cli.js");
  return runCli(["init"]);
}

describe("ascout init with linked files", () => {
  it.skipIf(!POSIX)("does not write through a symlinked .gitignore", async () => {
    writeFileSync(join(outside, "notes.txt"), "keep me\n");
    symlinkSync(join(outside, "notes.txt"), join(project, ".gitignore"));
    expect(await runInit()).toBe(2);
    expect(readFileSync(join(outside, "notes.txt"), "utf8")).toBe("keep me\n");
  });

  it.skipIf(!POSIX)("does not create the target of a dangling ascout.config.json link", async () => {
    symlinkSync(join(outside, "created.json"), join(project, "ascout.config.json"));
    expect(await runInit()).toBe(2);
    expect(existsSync(join(outside, "created.json"))).toBe(false);
  });

  it("still creates both files in an empty project", async () => {
    expect(await runInit()).toBe(0);
    expect(readdirSync(project).sort()).toEqual([".gitignore", "ascout.config.json"]);
  });
});

function linkDirectory(target: string, path: string): void {
  // A junction needs no special rights on Windows; POSIX uses a directory symlink.
  symlinkSync(target, path, POSIX ? "dir" : "junction");
}

describe("acquireRunLock with a linked .ascout", () => {
  it("refuses a .ascout that links elsewhere and writes nothing there", async () => {
    linkDirectory(outside, join(project, ".ascout"));
    await expect(acquireRunLock(project)).rejects.toMatchObject({ code: "run_lock_unverifiable" });
    expect(readdirSync(outside)).toEqual([]);
  });

  it("refuses a dangling .ascout link without creating its target", async () => {
    const missing = join(scratch, "missing");
    linkDirectory(missing, join(project, ".ascout"));
    await expect(acquireRunLock(project)).rejects.toMatchObject({ code: "run_lock_unverifiable" });
    expect(existsSync(missing)).toBe(false);
  });

  it("still takes the lock with a real .ascout directory", async () => {
    const handle = await acquireRunLock(project);
    await handle.release();
  });
});
