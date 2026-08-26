import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
const NULL_GIT_CONFIG = process.platform === "win32" ? "NUL" : "/dev/null";
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: NULL_GIT_CONFIG,
  GIT_CONFIG_SYSTEM: NULL_GIT_CONFIG,
  GIT_TERMINAL_PROMPT: "0",
};

function git(repositoryRoot: string, argv: readonly string[]): string {
  return execFileSync("git", [...argv], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: GIT_ENV,
    windowsHide: true,
  });
}

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

  it("keeps init limited to config plus .gitignore and does not pre-create runtime state", async () => {
    const emptyProject = mkdtempSync(join(tmpdir(), "ascout-t043-"));
    temporaryDirectories.push(emptyProject);
    process.chdir(emptyProject);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.resetModules();
    const { runCli } = await import("../src/cli.js");
    const exitCode = await runCli(["init"]);

    expect(exitCode).toBe(0);
    expect(readdirSync(emptyProject).sort()).toEqual([".gitignore", "ascout.config.json"]);
    expect(readFileSync(join(emptyProject, "ascout.config.json"), "utf8")).toBe(
      JSON.stringify({ version: 1 }, null, 2),
    );
    expect(readFileSync(join(emptyProject, ".gitignore"), "utf8")).toBe(".ascout/");
  });

  it("keeps doctor output opaque to local paths and configured command secrets", async () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "ascout-t042-"));
    temporaryDirectories.push(repositoryRoot);
    process.chdir(repositoryRoot);

    git(repositoryRoot, ["init", "-q"]);
    git(repositoryRoot, ["config", "user.name", "Ascout Test"]);
    git(repositoryRoot, ["config", "user.email", "ascout@example.invalid"]);
    git(repositoryRoot, ["config", "commit.gpgsign", "false"]);
    git(repositoryRoot, ["config", "core.autocrlf", "false"]);

    const secret = "doctor-must-not-render-this-secret";
    writeFileSync(
      join(repositoryRoot, "ascout.config.json"),
      JSON.stringify({
        version: 1,
        tasks: {
          lint: { command: ["custom-lint", "--token", secret] },
        },
      }),
      "utf8",
    );
    writeFileSync(join(repositoryRoot, "tracked.txt"), "base\n", "utf8");
    git(repositoryRoot, ["add", "--all"]);
    git(repositoryRoot, ["commit", "-q", "-m", "base"]);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.resetModules();
    const { runCli } = await import("../src/cli.js");
    const exitCode = await runCli(["doctor"]);
    const output = errorSpy.mock.calls.flat().map(String).join("\n");

    expect(exitCode).toBe(0);
    expect(output).toContain("Repository identity: local:");
    expect(output).toContain("Config source: ascout.config.json");
    expect(output).not.toContain(repositoryRoot);
    expect(output).not.toContain(secret);
  });
});
