import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

// init's .gitignore handling must never read or write through a link swapped in after its check.
// Real races can't be timed in a test, so each failure is injected into the fs calls init makes.
type Fault = "ino-changed" | "not-a-file" | "lstat-denied" | "rename-fails" | null;
let fault: Fault = null;
let gitignoreLstats = 0;
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const isGitignore = (path: unknown) => typeof path === "string" && path.endsWith(".gitignore");
  return {
    ...actual,
    lstatSync: ((path: string, options?: object) => {
      // The first lstat is init's link check; deny the second, the one the descriptor read relies on.
      if (isGitignore(path)) gitignoreLstats += 1;
      if (fault === "lstat-denied" && isGitignore(path) && gitignoreLstats >= 2) {
        throw Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" });
      }
      return actual.lstatSync(path, options as never);
    }) as typeof actual.lstatSync,
    fstatSync: ((descriptor: number, options?: object) => {
      const stats = actual.fstatSync(descriptor, options as never);
      if (fault === "ino-changed") return Object.assign(Object.create(Object.getPrototypeOf(stats)), stats, { ino: -1 });
      if (fault === "not-a-file") return Object.assign(Object.create(Object.getPrototypeOf(stats)), stats, { isFile: () => false });
      return stats;
    }) as typeof actual.fstatSync,
    renameSync: ((from: string, to: string) => {
      if (fault === "rename-fails" && isGitignore(to)) throw Object.assign(new Error("EPERM: rename refused"), { code: "EPERM" });
      return actual.renameSync(from, to);
    }) as typeof actual.renameSync,
  };
});

const { runCli } = await import("../src/cli.js");

const originalCwd = process.cwd();
const roots: string[] = [];
afterEach(() => {
  fault = null;
  gitignoreLstats = 0;
  process.chdir(originalCwd);
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function repositoryWithGitignore(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "ascout-init-race-")));
  roots.push(root);
  execFileSync("git", ["init", "-q"], { cwd: root, windowsHide: true });
  writeFileSync(join(root, ".gitignore"), "dist\n");
  process.chdir(root);
  return root;
}

function quiet(): () => string {
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  return () => [...stderr.mock.calls.map((call) => String(call[0])), ...consoleError.mock.calls.flat().map(String)].join("\n");
}

describe("ascout init and a .gitignore that changes under it", () => {
  it.each([
    ["the opened file is not the one the check saw", "ino-changed" as const],
    ["the opened file is not a regular file", "not-a-file" as const],
  ])("refuses when %s, and leaves .gitignore untouched", async (_label, injected) => {
    const root = repositoryWithGitignore();
    const stderr = quiet();
    fault = injected;
    expect(await runCli(["init"])).toBe(2);
    expect(stderr()).toContain(".gitignore changed while init was reading it");
    expect(readFileSync(join(root, ".gitignore"), "utf8")).toBe("dist\n");
  });

  it("reports an unreadable .gitignore as an error instead of treating it as absent", async () => {
    const root = repositoryWithGitignore();
    const stderr = quiet();
    gitignoreLstats = 0;
    fault = "lstat-denied";
    expect(await runCli(["init"])).toBe(2);
    expect(stderr()).toContain("EACCES");
    expect(readFileSync(join(root, ".gitignore"), "utf8")).toBe("dist\n");
  });

  it("removes its temporary file when the rename fails", async () => {
    const root = repositoryWithGitignore();
    quiet();
    fault = "rename-fails";
    expect(await runCli(["init"])).toBe(2);
    expect(readFileSync(join(root, ".gitignore"), "utf8")).toBe("dist\n");
    expect(readdirSync(root).filter((name) => name.startsWith(".gitignore."))).toEqual([]);
  });
});
