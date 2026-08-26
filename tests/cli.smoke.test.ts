import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const ADMISSION_FLAG = "--allow-changed-command-surface";
const ENV_KEYS = [
  "ASCOUT_AGENT",
  "ASCOUT_ALLOW_CHANGED_COMMAND_SURFACE",
  "ASCOUT_CONFIG",
  "ASCOUT_TOKEN",
  "GH_TOKEN",
  "GITHUB_TOKEN",
  "NPM_TOKEN",
] as const;

const originalCwd = process.cwd();
const originalEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
const temporaryDirectories: string[] = [];

afterEach(() => {
  process.chdir(originalCwd);

  for (const key of ENV_KEYS) {
    const originalValue = originalEnv.get(key);
    if (originalValue === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalValue;
    }
  }

  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }

  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("T007 CLI startup smoke", () => {
  it("starts without network, account credentials, or project config", async () => {
    const emptyProject = mkdtempSync(join(tmpdir(), "ascout-t007-"));
    temporaryDirectories.push(emptyProject);
    process.chdir(emptyProject);

    for (const key of ENV_KEYS) {
      delete process.env[key];
    }

    const fetchSpy = vi.fn(() => {
      throw new Error("network access attempted during CLI startup");
    });
    vi.stubGlobal("fetch", fetchSpy);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.resetModules();
    const { runCli } = await import("../src/cli.js");
    const exitCode = await runCli(["doctor"]);

    expect(typeof exitCode).toBe("number");
    expect(exitCode).not.toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(readdirSync(emptyProject)).toEqual([]);
  });

  it("does not infer changed-command admission from agent or environment context", async () => {
    process.env.ASCOUT_AGENT = "1";
    process.env.ASCOUT_ALLOW_CHANGED_COMMAND_SURFACE = "1";
    process.env.ASCOUT_TOKEN = "present-but-irrelevant";
    process.env.GITHUB_TOKEN = "present-but-irrelevant";

    vi.resetModules();
    const { parseCliArgs } = await import("../src/cli.js");

    expect(parseCliArgs(["check"])).toEqual({
      command: "check",
      allowChangedCommandSurface: false,
    });

    expect(parseCliArgs(["check", ADMISSION_FLAG])).toEqual({
      command: "check",
      allowChangedCommandSurface: true,
    });
  });
});
