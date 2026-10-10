import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { hardenedGitArgs, hardenedGitEnv } from "../src/git-process.js";

describe("constrained Git subprocess settings", () => {
  it("applies security overrides before every requested subcommand", () => {
    const args = hardenedGitArgs(["status", "--porcelain"]);
    expect(args.slice(-2)).toEqual(["status", "--porcelain"]);
    expect(args).toContain("core.fsmonitor=false");
    expect(args).toContain("maintenance.auto=false");
    expect(args).toContain("submodule.recurse=false");
    expect(args).toContain("gc.auto=0");
    expect(args).toContain("diff.external=");
    expect(args.some((part) => part.startsWith("core.hooksPath="))).toBe(true);

    for (let index = 0; index < args.length - 2; index += 2) {
      expect(args[index]).toBe("-c");
    }
  });

  it("strips Git-specific inherited process authority", () => {
    const env = hardenedGitEnv({
      PATH: "fixture-path",
      SystemRoot: "fixture-root",
      GIT_DIR: "different-repository",
      GIT_WORK_TREE: "different-worktree",
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "core.fsmonitor",
      GIT_CONFIG_VALUE_0: "true",
      GIT_TRACE: "trace.log",
      git_ssh_command: "unexpected",
    });
    expect(env.PATH).toBe("fixture-path");
    expect(env.SystemRoot).toBe("fixture-root");
    expect(env.GIT_DIR).toBeUndefined();
    expect(env.GIT_WORK_TREE).toBeUndefined();
    expect(env.GIT_CONFIG_COUNT).toBeUndefined();
    expect(env.GIT_CONFIG_KEY_0).toBeUndefined();
    expect(env.GIT_CONFIG_VALUE_0).toBeUndefined();
    expect(env.GIT_TRACE).toBeUndefined();
    expect(env.git_ssh_command).toBeUndefined();
    expect(env.GIT_TERMINAL_PROMPT).toBe("0");
    expect(env.GIT_CONFIG_NOSYSTEM).toBe("1");
    expect(env.GIT_OPTIONAL_LOCKS).toBe("0");
  });

  it("overrides an injected monitor setting when Git itself reads configuration", () => {
    const stdout = execFileSync(
      "git",
      hardenedGitArgs(["config", "--get", "core.fsmonitor"]),
      {
        encoding: "utf8",
        env: hardenedGitEnv({
          ...process.env,
          GIT_CONFIG_COUNT: "1",
          GIT_CONFIG_KEY_0: "core.fsmonitor",
          GIT_CONFIG_VALUE_0: "true",
        }),
        timeout: 10_000,
        windowsHide: true,
      },
    );
    expect(stdout.trim()).toBe("false");
  });

  it("produces fresh arguments and does not mutate caller input", () => {
    const command = Object.freeze(["rev-parse", "HEAD"] as const);
    const first = hardenedGitArgs(command);
    const second = hardenedGitArgs(command);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(command).toEqual(["rev-parse", "HEAD"]);
  });
});
