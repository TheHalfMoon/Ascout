import { describe, expect, it } from "vitest";

import { CAPABILITY_PROBE_IDS, runCapabilityProbesV1, type ProbeRunnerV1 } from "../src/assurance/containment/capability-probes.js";
import { currentContainmentV1 } from "../src/assurance/containment/containment-tier.js";
import type { LinuxFsHostV1 } from "../src/assurance/containment/linux-fs-sandbox.js";
import { SANDBOX_EXEC, macosFsSandboxProbeRunnerV1, macosSandboxProfileV1, macosWorkspaceRefusalV1, type MacosFsSandboxDepsV1 } from "../src/assurance/containment/macos-fs-sandbox.js";
import { allowlistedTaskEnvironmentV1 } from "../src/assurance/containment/task-environment.js";

// FD-4 T1-FS and T1-NET on macOS, research only: nothing in Ascout runs tasks under this, and the tier
// stays T0. The native tests below are the public, generic evidence; technique-level probes are kept
// in the private host spec.
const HOME = "/Users/u";

describe("the macOS workspace", () => {
  it.each(["/Users/u/src/repo", "/Users/runner/work/_temp/ascout-probe-workspace-1", "/private/var/folders/xx/yy/T/ascout-probe-workspace-1", "/opt/build/repo", "/Users/u/Library-notes/repo"])("may be %s", (workspace) => {
    expect(macosWorkspaceRefusalV1(workspace, HOME)).toBeNull();
  });

  it.each([
    ['/Users/u/a"b', "can't hold"],
    ["/Users/u/a\\b", "can't hold"],
    ["/Users/u/a\nb", "can't hold"],
    ["Users/u/repo", "absolute, normalized"],
    ["/Users/u/../u/repo", "absolute, normalized"],
    ["/Users/u/repo/", "absolute, normalized"],
    ["/", "be or contain /"],
    ["/Users", "be or contain /Users"],
    ["/Users/u", "be or contain /Users/u"],
    ["/private/tmp", "be or contain /private/tmp"],
    ["/private/var", "be or contain /private/var"],
    ["/Volumes", "be or contain /Volumes"],
    ["/System/Library/x", "inside /System"],
    ["/usr/local/src", "inside /usr"],
    ["/private/etc/app", "inside /private/etc"],
    ["/Applications/X.app", "inside /Applications"],
    ["/private/var/folders/xx", "inside /private/var"],
    ["/private/var/folders/xx/yy/T", "inside /private/var"],
    ["/private/var/db/x", "inside /private/var"],
    ["/Users/u/.ssh", "inside /Users/u/.ssh"],
    ["/Users/u/.config/app", "inside /Users/u/.config"],
    ["/Users/u/Library", "inside /Users/u/Library"],
    ["/Users/u/Library/Keychains", "inside /Users/u/Library"],
  ])("may not be %j", (workspace, reason) => {
    expect(macosWorkspaceRefusalV1(workspace, HOME)).toContain(reason);
  });

  it("may not contain the home folder, wherever it is", () => {
    expect(macosWorkspaceRefusalV1("/data", "/data/users/u")).toBe("the workspace may not be or contain /data/users/u");
  });
});

describe("the sandbox profile", () => {
  it("denies writes, user-data reads, starting programs, system services, foreign code, and signals to others; then allows Node and the workspace", () => {
    const profile = macosSandboxProfileV1("/Users/u/src/repo", "/opt/node/bin/node", HOME);
    expect(profile.trim().split("\n")).toEqual([
      "(version 1)",
      "(allow default)",
      '(deny file-read-data (subpath "/Users") (subpath "/Volumes") (subpath "/private/tmp") (subpath "/private/var/tmp") (subpath "/private/var/folders") (subpath "/private/var/root") (subpath "/Users/u"))',
      "(deny file-write*)",
      "(deny process-exec*)",
      "(deny mach-lookup)",
      "(deny file-map-executable)",
      "(deny signal (target others))",
      '(allow process-exec* (literal "/opt/node/bin/node"))',
      '(allow file-map-executable (subpath "/System") (subpath "/usr/lib") (subpath "/usr/libexec") (subpath "/Library/Apple") (subpath "/private/var/db/dyld") (literal "/opt/node/bin/node"))',
      '(allow file-read-data (literal "/opt/node/bin/node"))',
      '(allow file-read-data file-write* (subpath "/Users/u/src/repo"))',
      '(allow file-write-data (literal "/dev/null") (literal "/dev/tty"))',
    ]);
    // Later rules win in a sandbox profile, so the allows must come after the denies.
    expect(profile.indexOf("(allow file-read-data file-write*")).toBeGreaterThan(profile.indexOf("(deny file-write*)"));
    expect(profile).not.toContain("network");
    // No later rule allows signals, so the deny stands.
    expect(profile).not.toMatch(/\(allow[^\n]*signal/u);
  });

  it("denies the network only when asked", () => {
    expect(macosSandboxProfileV1("/Users/u/src/repo", "/opt/node/bin/node", HOME, "none").trim().split("\n").at(-1)).toBe("(deny network*)");
  });

  it("refuses a refused workspace or a Node path a profile can't hold", () => {
    expect(() => macosSandboxProfileV1("/Users/u", "/opt/node", HOME)).toThrow(/may not be or contain \/Users\/u/u);
    expect(() => macosSandboxProfileV1("/Users/u/r", "node", HOME)).toThrow(/Node binary path/u);
    expect(() => macosSandboxProfileV1("/Users/u/r", '/opt/"x', HOME)).toThrow(/Node binary path/u);
    expect(() => macosSandboxProfileV1("/data/r", "/opt/node", '/a")) (allow file-read-data (subpath "/Users')).toThrow(/home folder path/u);
    expect(() => macosSandboxProfileV1("/Users/u/r", "/Users/u/r/bin/node", HOME)).toThrow(/Node binary may not be inside the workspace/u);
  });
});

describe("the macOS probe runner", () => {
  function host(present: readonly string[], log: string[] = []): LinuxFsHostV1 {
    return {
      exists: (path) => present.includes(path),
      symlinkTarget: () => null,
      realpath: (path) => path,
      home: () => HOME,
      makeTempDir: () => "/private/var/folders/xx/yy/T/selftest",
      makeDir: (path) => {
        log.push(`mkdir ${path}`);
      },
      writeFile: (path) => {
        log.push(`write ${path}`);
      },
      removeDir: (path) => {
        log.push(`rm ${path}`);
      },
    };
  }
  const calls: { file: string; argv: readonly string[]; cwd: string; env: NodeJS.ProcessEnv }[] = [];
  const deps = (overrides: Partial<MacosFsSandboxDepsV1> = {}, reply = "sandbox-ok", log: string[] = []): MacosFsSandboxDepsV1 => ({
    platform: "darwin",
    host: host([SANDBOX_EXEC], log),
    execPath: "/opt/node/bin/node",
    exec: async (file, argv, options) => {
      calls.push({ file, argv, ...options });
      return reply;
    },
    ...overrides,
  });

  it("refuses off macOS and without sandbox-exec, never running unsandboxed", async () => {
    calls.length = 0;
    expect(await macosFsSandboxProbeRunnerV1(deps({ platform: "linux" }))).toEqual({ refused: "the sandbox-exec sandbox is macOS only" });
    expect(await macosFsSandboxProbeRunnerV1(deps({ host: host([]) }))).toEqual({ refused: "sandbox-exec is not installed at /usr/bin/sandbox-exec" });
    expect(calls).toEqual([]);
  });

  it("self-tests isolation with a marker beside an empty workspace, then removes both", async () => {
    calls.length = 0;
    const log: string[] = [];
    await macosFsSandboxProbeRunnerV1(deps({}, "sandbox-ok", log));
    expect(log).toEqual(["mkdir /private/var/folders/xx/yy/T/selftest/workspace", "write /private/var/folders/xx/yy/T/selftest/outside-marker", "rm /private/var/folders/xx/yy/T/selftest"]);
    expect(calls[0]).toMatchObject({ file: SANDBOX_EXEC, cwd: "/private/var/folders/xx/yy/T/selftest/workspace", env: {} });
    expect(calls[0]!.argv[0]).toBe("-p");
    expect(calls[0]!.argv[1]).toContain('(subpath "/private/var/folders/xx/yy/T/selftest/workspace")');
    expect(calls[0]!.argv.at(-1)).toContain('readFileSync("/private/var/folders/xx/yy/T/selftest/outside-marker")');
  });

  it.each([
    ["escaped", "the sandbox-exec sandbox started but did not hide a file outside its workspace"],
    ["", "the sandbox-exec sandbox did not start"],
  ])("refuses when the self-test prints %j, and still removes its folder", async (reply, refused) => {
    const log: string[] = [];
    expect(await macosFsSandboxProbeRunnerV1(deps({}, reply, log))).toEqual({ refused });
    expect(log.at(-1)).toBe("rm /private/var/folders/xx/yy/T/selftest");
  });

  it("removes the self-test folder even when sandbox-exec can't be run", async () => {
    const log: string[] = [];
    await expect(macosFsSandboxProbeRunnerV1(deps({ exec: async () => { throw new Error("spawn failed"); } }, "", log))).rejects.toThrow("spawn failed");
    expect(log.at(-1)).toBe("rm /private/var/folders/xx/yy/T/selftest");
  });

  it("runs the probe under the profile for its own workspace, with the network denied only when asked", async () => {
    calls.length = 0;
    const made = await macosFsSandboxProbeRunnerV1(deps(), "none");
    if (!("runner" in made)) throw new Error("expected a runner");
    const task = { canaryPath: "/o/c", writePath: "/o/w", port: 1, envName: "X" };
    expect(await made.runner("script", task, { X: "1" }, "/Users/u/ws")).toBe("sandbox-ok");
    const call = calls[1]!;
    expect(call).toMatchObject({ file: SANDBOX_EXEC, cwd: "/Users/u/ws", env: { X: "1" } });
    expect(call.argv[1]).toContain('(subpath "/Users/u/ws")');
    expect(call.argv[1]).toContain("(deny network*)");
    expect(call.argv.slice(2)).toEqual(["/opt/node/bin/node", "-e", "script", JSON.stringify(task)]);
  });
});

// Native evidence. CI sets ASCOUT_REQUIRE_MACOS_SANDBOX=1 on macOS, so a sandbox that can't start
// fails the run there instead of silently skipping.
describe.runIf(process.platform === "darwin")("native capability probes under sandbox-exec", () => {
  async function runner(network: "shared" | "none") {
    const made = await macosFsSandboxProbeRunnerV1(undefined, network);
    if ("refused" in made && process.env.ASCOUT_REQUIRE_MACOS_SANDBOX === "1") {
      // Say why: rerun the self-test's shape and report what sandbox-exec and Node printed.
      const { mkdtempSync, realpathSync, rmSync } = await import("node:fs");
      const { tmpdir, homedir } = await import("node:os");
      const { spawnSync } = await import("node:child_process");
      const workspace = realpathSync(mkdtempSync(`${tmpdir()}/ascout-sandbox-diag-`));
      try {
        const profile = macosSandboxProfileV1(workspace, realpathSync(process.execPath), realpathSync(homedir()), network);
        // Try narrower profiles too, so one CI run shows which rule stops Node.
        const node = realpathSync(process.execPath);
        const without = (rule: string) => profile.split("\n").filter((line) => !line.startsWith(rule)).join("\n");
        const variants: Record<string, string> = {
          full: profile,
          noMachDeny: without("(deny mach-lookup)"),
          noMapExecDeny: without("(deny file-map-executable)"),
          noExecDeny: without("(deny process-exec*)"),
        };
        const results = Object.entries(variants).map(([name, text]) => {
          const run = spawnSync(SANDBOX_EXEC, ["-p", text, node, "-e", "process.stdout.write('ok')"], { cwd: workspace, env: {}, encoding: "utf8" });
          return `${name}: status ${run.status} signal ${run.signal} stdout ${JSON.stringify(run.stdout)} stderr ${JSON.stringify(run.stderr.slice(0, 600))}`;
        });
        throw new Error(`the sandbox is required here but refused: ${made.refused}; node ${node}; workspace ${workspace}; ${results.join(" | ")}`);
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    }
    return made;
  }

  it("deny reading and writing a sibling outside the workspace; network and environment stay allowed; the tier stays T0", async (ctx) => {
    const made = await runner("shared");
    if ("refused" in made) return ctx.skip();
    const report = await runCapabilityProbesV1("T1-FS-macos-sandbox-exec", made.runner);
    const expected: Record<string, string> = { read_outside_workspace: "DENIED", write_outside_workspace: "DENIED", loopback_network: "ALLOWED", environment_secret: "ALLOWED" };
    expect(report.results.map((result) => [result.id, result.verdict])).toEqual(CAPABILITY_PROBE_IDS.map((id) => [id, expected[id]]));
    expect(currentContainmentV1()).toMatchObject({ tier: "T0", filesystem_isolation: "NONE" });
  }, 60_000);

  it("with the network denied and an allowlisted environment, deny all four; the tier still stays T0", async (ctx) => {
    const made = await runner("none");
    if ("refused" in made) return ctx.skip();
    const isolated: ProbeRunnerV1 = (script, task, env, cwd) => made.runner(script, task, allowlistedTaskEnvironmentV1(env, process.platform), cwd);
    const report = await runCapabilityProbesV1("T1-FS+NET+ENV-macos-sandbox-exec", isolated);
    expect(report.results.map((result) => [result.id, result.verdict])).toEqual(CAPABILITY_PROBE_IDS.map((id) => [id, "DENIED"]));
    expect(report.all_denied).toBe(true);
    expect(currentContainmentV1()).toMatchObject({ tier: "T0", filesystem_isolation: "NONE", network_isolation: "NONE" });
  }, 60_000);

  it("deny starting any other program, so work can't be handed to one outside the sandbox", async (ctx) => {
    const made = await runner("shared");
    if ("refused" in made) return ctx.skip();
    const script = `const r = require("node:child_process").spawnSync("/usr/bin/true"); process.stdout.write(JSON.stringify({ status: r.status, error: r.error ? r.error.code : null }))`;
    const { mkdtempSync, realpathSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const workspace = realpathSync(mkdtempSync(`${tmpdir()}/ascout-sandbox-exec-`));
    try {
      const out = JSON.parse(await made.runner(script, { canaryPath: "/x", writePath: "/x", port: 1, envName: "X" }, {}, workspace)) as { status: number | null; error: string | null };
      expect(out.status === 0 && out.error === null).toBe(false);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  }, 60_000);

  it("deny signalling a process outside the sandbox, which the same profile without that rule can signal", async (ctx) => {
    const made = await runner("shared");
    if ("refused" in made) return ctx.skip();
    const { mkdtempSync, realpathSync, rmSync } = await import("node:fs");
    const { tmpdir, homedir } = await import("node:os");
    const { spawn, spawnSync } = await import("node:child_process");
    const workspace = realpathSync(mkdtempSync(`${tmpdir()}/ascout-sandbox-signal-`));
    const target = spawn("/bin/sleep", ["60"], { stdio: "ignore" });
    const exited = new Promise<NodeJS.Signals | null>((resolve) => target.once("exit", (_code, signal) => resolve(signal)));
    try {
      const pid = target.pid as number;
      const script = `let r = "signalled"; try { process.kill(${pid}, "SIGTERM"); } catch (e) { r = e.code; } process.stdout.write(r)`;
      const out = await made.runner(script, { canaryPath: "/x", writePath: "/x", port: 1, envName: "X" }, {}, workspace);
      expect(out).toBe("EPERM");
      expect(target.exitCode).toBeNull();
      expect(target.signalCode).toBeNull();
      // Positive control: the same profile without the signal rule lets the task stop the process.
      const node = realpathSync(process.execPath);
      const profile = macosSandboxProfileV1(workspace, node, realpathSync(homedir()));
      const without = profile.split("\n").filter((line) => line !== "(deny signal (target others))").join("\n");
      expect(without).not.toContain("signal");
      const control = spawnSync(SANDBOX_EXEC, ["-p", without, node, "-e", script], { cwd: workspace, env: {}, encoding: "utf8", timeout: 20_000 });
      expect(control.stdout).toBe("signalled");
      expect(await exited).toBe("SIGTERM");
    } finally {
      target.kill("SIGKILL");
      rmSync(workspace, { recursive: true, force: true });
    }
  }, 60_000);
});
