import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CAPABILITY_PROBE_IDS, runCapabilityProbesV1, type ProbeRunnerV1 } from "../src/assurance/containment/capability-probes.js";
import { currentContainmentV1 } from "../src/assurance/containment/containment-tier.js";
import type { LinuxFsHostV1 } from "../src/assurance/containment/linux-fs-sandbox.js";
import { allowlistedTaskEnvironmentV1 } from "../src/assurance/containment/task-environment.js";
import {
  APPCONTAINER_CLEANUP_SCRIPT,
  APPCONTAINER_SCRIPT,
  environmentBlockV1,
  realWindowsSandboxDepsV1,
  systemRootV1,
  windowsAppContainerProbeRunnerV1,
  windowsPowerShellPathV1,
  windowsWorkspaceRefusalV1,
  type WindowsSandboxDepsV1,
} from "../src/assurance/containment/windows-appcontainer-sandbox.js";

// FD-4 T1-FS and T1-NET on Windows, research only: nothing in Ascout runs tasks in this container, and
// the tier stays T0. The native tests below are the public, generic evidence; technique-level probes
// are kept in the private host spec.
const HOME = "C:\\Users\\u";
const ROOT = "C:\\Windows";

describe("the Windows building blocks", () => {
  it("finds the system folder, or falls back to its usual place", () => {
    expect(systemRootV1({ SystemRoot: "D:\\Win" })).toBe("D:\\Win");
    expect(systemRootV1({})).toBe("C:\\Windows");
  });

  it("takes Windows PowerShell from its fixed system location", () => {
    expect(windowsPowerShellPathV1("C:\\Windows")).toBe("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
  });

  it("builds a sorted, NUL-separated environment block and drops entries Windows can't hold", () => {
    expect(environmentBlockV1({ b: "2", A: "1", "=C:": "x", EMPTY: undefined, "": "y", BAD: "a\0b" })).toBe("A=1\0b=2\0\0");
    expect(environmentBlockV1({})).toBe("\0\0");
    expect(environmentBlockV1({ a: "1", A: "2" })).toBe("a=1\0A=2\0\0");
  });

  it("passes every input to PowerShell as an environment variable, never as script text", () => {
    for (const name of ["ASCOUT_AC_NAME", "ASCOUT_AC_WORKSPACE", "ASCOUT_AC_NODE", "ASCOUT_AC_STDOUT", "ASCOUT_AC_SCRIPTFILE", "ASCOUT_AC_TASK", "ASCOUT_AC_ENV", "ASCOUT_AC_NETWORK"]) {
      expect(APPCONTAINER_SCRIPT).toContain(`$env:${name}`);
    }
    // No network capabilities unless asked; the grant and the profile are always removed.
    expect(APPCONTAINER_SCRIPT).toContain("if ($env:ASCOUT_AC_NETWORK -eq 'shared') { $caps = @('S-1-15-3-1', 'S-1-15-3-3') }");
    expect(APPCONTAINER_SCRIPT).toMatch(/\} finally \{\n {2}foreach \(\$path in \$granted\)[^\n]*\/remove[^\n]*\n {2}if \(\[AscoutAc\]::DeleteAppContainerProfile\(\$name\) -ne 0\)/u);
    expect(APPCONTAINER_SCRIPT).toContain("Join-Path $env:SystemRoot 'System32\\icacls.exe'");
    // The task runs suspended into a kill-on-close job, inherits only its two handles, and the
    // workspace is recorded before the grant so a partial grant is still removed.
    expect(APPCONTAINER_SCRIPT).toContain("AssignProcessToJobObject(job, pi.hProcess)");
    expect(APPCONTAINER_SCRIPT).toContain("limits.Basic.LimitFlags = 0x2000;");
    expect(APPCONTAINER_SCRIPT).toContain("(IntPtr)0x00020002, handles");
    expect(APPCONTAINER_SCRIPT.indexOf("$granted += $workspace")).toBeLessThan(APPCONTAINER_SCRIPT.indexOf("& $icacls $workspace /grant"));
    expect(APPCONTAINER_CLEANUP_SCRIPT).toContain("DeleteAppContainerProfile($env:ASCOUT_AC_NAME)");
    expect(APPCONTAINER_CLEANUP_SCRIPT).toContain("$icacls = Join-Path $env:SystemRoot 'System32\\icacls.exe'");
    expect(APPCONTAINER_CLEANUP_SCRIPT).toContain("@($env:ASCOUT_AC_WORKSPACE, $env:ASCOUT_AC_NODE, $env:ASCOUT_AC_SCRIPTFILE)");
  });
});

describe("the Windows workspace", () => {
  it.each(["C:\\Users\\u\\src\\repo", "C:\\Users\\u\\AppData\\Local\\Temp\\ascout-probe-workspace-1", "D:\\a\\_temp\\ascout-probe-workspace-1", "C:\\build\\repo"])("may be %s", (workspace) => {
    expect(windowsWorkspaceRefusalV1(workspace, HOME, ROOT)).toBeNull();
  });

  it.each([
    ["src\\repo", "absolute, normalized"],
    ["C:/Users/u/repo", "absolute, normalized"],
    ["C:\\Users\\u\\..\\u\\repo", "absolute, normalized"],
    ['C:\\Users\\u\\a"b', "absolute, normalized"],
    ["\\\\server\\share\\repo", "absolute, normalized"],
    ["C:\\", "drive root"],
    ["C:\\Users", "be or contain C:\\Users\\u"],
    ["C:\\Users\\u", "be or contain C:\\Users\\u"],
    ["c:\\users\\U", "be or contain C:\\Users\\u"],
    ["C:\\Windows", "inside C:\\Windows"],
    ["C:\\Windows\\Temp\\x", "inside C:\\Windows"],
    ["C:\\Program Files\\App", "inside C:\\Program Files"],
    ["C:\\Program Files (x86)\\App", "inside C:\\Program Files (x86)"],
    ["C:\\ProgramData\\App", "inside C:\\ProgramData"],
    ["C:\\Users\\u\\AppData\\Roaming\\x", "inside C:\\Users\\u\\AppData"],
    ["C:\\Users\\u\\AppData\\Local\\Temp", "inside C:\\Users\\u\\AppData"],
    ["C:\\Users\\u\\.ssh", "inside C:\\Users\\u\\.ssh"],
    ["C:\\Users\\other\\repo", "another profile"],
    ["C:\\Users\\Public\\repo", "another profile"],
  ])("may not be %j", (workspace, reason) => {
    expect(windowsWorkspaceRefusalV1(workspace, HOME, ROOT)).toContain(reason);
  });
});

describe("the AppContainer probe runner", () => {
  function host(present: readonly string[], log: string[] = []): LinuxFsHostV1 {
    return {
      exists: (path) => present.includes(path),
      symlinkTarget: () => null,
      realpath: (path) => path,
      home: () => HOME,
      makeTempDir: () => `${HOME}\\AppData\\Local\\Temp\\t${log.filter((line) => line.startsWith("tmp")).length}`,
      makeDir: (path) => {
        log.push(`mkdir ${path}`);
      },
      writeFile: (path, text) => {
        log.push(`write ${path} ${text.length}`);
      },
      removeDir: (path) => {
        log.push(`rm ${path}`);
      },
    };
  }
  const POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
  const calls: { file: string; argv: readonly string[]; cwd: string; env: NodeJS.ProcessEnv }[] = [];
  const deps = (overrides: Partial<WindowsSandboxDepsV1> = {}, reply = "sandbox-ok", log: string[] = []): WindowsSandboxDepsV1 => ({
    platform: "win32",
    host: host([POWERSHELL, `${HOME}\\AppData\\Local\\Temp\\t0\\stdout.txt`], log),
    exec: async (file, argv, options) => {
      calls.push({ file, argv, ...options });
      return "";
    },
    execPath: "C:\\node\\node.exe",
    systemRoot: ROOT,
    readText: () => reply,
    randomName: () => "ascout.sandbox.test",
    startupEnv: { LOCALAPPDATA: "L", USERPROFILE: "U", TEMP: "T", TMP: "T", SECRET: "s" },
    taskTimeoutMs: 1000,
    ...overrides,
  });

  it("refuses off Windows and without Windows PowerShell, never running unsandboxed", async () => {
    calls.length = 0;
    expect(await windowsAppContainerProbeRunnerV1(deps({ platform: "linux" }))).toEqual({ refused: "the AppContainer sandbox is Windows only" });
    expect(await windowsAppContainerProbeRunnerV1(deps({ host: host([]) }))).toEqual({ refused: `Windows PowerShell is not installed at ${POWERSHELL}` });
    expect(calls).toEqual([]);
  });

  it("self-tests isolation with a marker beside an empty workspace, passing inputs only as environment variables", async () => {
    calls.length = 0;
    const log: string[] = [];
    await windowsAppContainerProbeRunnerV1(deps({}, "sandbox-ok", log));
    const call = calls[0]!;
    expect(call.file).toBe(POWERSHELL);
    expect(call.argv.slice(0, 5)).toEqual(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command"]);
    expect(call.argv[5]).toBe(APPCONTAINER_SCRIPT);
    expect(call.env).toMatchObject({ ASCOUT_AC_NAME: "ascout.sandbox.test", ASCOUT_AC_NODE: "C:\\node\\node.exe", ASCOUT_AC_NETWORK: "none", PATHEXT: ".COM;.EXE" });
    expect(String(call.env.ASCOUT_AC_WORKSPACE)).toMatch(/\\workspace$/u);
    const block = Buffer.from(String(call.env.ASCOUT_AC_ENV), "base64").toString("utf8");
    expect(block).toBe("LOCALAPPDATA=L\0SystemRoot=C:\\Windows\0TEMP=T\0TMP=T\0USERPROFILE=U\0\0");
    expect(block).not.toContain("SECRET");
    expect(log.some((line) => line.includes("outside-marker"))).toBe(true);
    expect(log.filter((line) => line.startsWith("rm ")).length).toBe(2);
  });

  it.each([
    ["escaped", "the AppContainer started but did not hide a file outside its workspace"],
    ["", "the AppContainer sandbox did not start (is PowerShell blocked by application control?)"],
  ])("refuses when the self-test prints %j", async (reply, refused) => {
    expect(await windowsAppContainerProbeRunnerV1(deps({}, reply))).toEqual({ refused });
  });

  it("reads no output when the task left none", async () => {
    const made = await windowsAppContainerProbeRunnerV1(deps({ host: host([POWERSHELL]) }));
    expect(made).toEqual({ refused: "the AppContainer sandbox did not start (is PowerShell blocked by application control?)" });
  });

  it("refuses a workspace it may not grant, and removes its folders when PowerShell fails", async () => {
    const made = await windowsAppContainerProbeRunnerV1(deps());
    if (!("runner" in made)) throw new Error("expected a runner");
    await expect(made.runner("s", { canaryPath: "c", writePath: "w", port: 1, envName: "X" }, {}, HOME)).rejects.toThrow(/may not be or contain/u);
    const log: string[] = [];
    await expect(windowsAppContainerProbeRunnerV1(deps({ exec: async () => { throw new Error("spawn failed"); } }, "", log))).rejects.toThrow("spawn failed");
    expect(log.filter((line) => line.startsWith("rm ")).length).toBe(2);
  });

  it("runs the probe with the task base64-encoded and the network as asked", async () => {
    calls.length = 0;
    const made = await windowsAppContainerProbeRunnerV1(deps(), "shared");
    if (!("runner" in made)) throw new Error("expected a runner");
    const task = { canaryPath: "C:\\o\\c", writePath: "C:\\o\\w", port: 1, envName: "X" };
    expect(await made.runner("script", task, { X: "1" }, "C:\\build\\ws")).toBe("sandbox-ok");
    // calls[0] and calls[1] are the self-test's run and its second cleanup.
    const call = calls[2]!;
    expect(call.env).toMatchObject({ ASCOUT_AC_WORKSPACE: "C:\\build\\ws", ASCOUT_AC_NETWORK: "shared", ASCOUT_AC_TIMEOUT_MS: "1000" });
    // The task script and its output live in the scratch folder, never in the workspace.
    expect(String(call.env.ASCOUT_AC_SCRIPTFILE)).toMatch(/^C:\\Users\\u\\AppData\\Local\\Temp\\t\d+\\task\.js$/u);
    expect(String(call.env.ASCOUT_AC_STDOUT)).toMatch(/^C:\\Users\\u\\AppData\\Local\\Temp\\t\d+\\stdout\.txt$/u);
    // The outer limit leaves time for PowerShell to kill the tree and clean up; then a second cleanup runs.
    expect(call.timeoutMs).toBe(61_000);
    expect(calls[3]!.argv.at(-1)).toBe(APPCONTAINER_CLEANUP_SCRIPT);
    expect(calls[3]!.env).toEqual(call.env);
    expect(Buffer.from(String(call.env.ASCOUT_AC_TASK), "base64").toString("utf8")).toBe(JSON.stringify(task));
    expect(Buffer.from(String(call.env.ASCOUT_AC_ENV), "base64").toString("utf8")).toBe("X=1\0\0");
  });
});

describe("the real Windows dependencies", () => {
  it("read files and make distinct container names, on any OS", () => {
    const dir = mkdtempSync(join(tmpdir(), "ascout-win-deps-"));
    try {
      writeFileSync(join(dir, "f.txt"), "text");
      expect(realWindowsSandboxDepsV1.readText(join(dir, "f.txt"))).toBe("text");
      expect(realWindowsSandboxDepsV1.host.realpath(join(dir, "f.txt")).toLowerCase().endsWith("f.txt")).toBe(true);
      const a = realWindowsSandboxDepsV1.randomName();
      expect(a).toMatch(/^ascout\.sandbox\.[a-z0-9]+$/u);
      expect(realWindowsSandboxDepsV1.randomName()).not.toBe(a);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// Native evidence. CI sets ASCOUT_REQUIRE_WINDOWS_SANDBOX=1 on Windows, so a container that can't start
// fails the run there instead of silently skipping.
// Each run starts PowerShell twice and compiles its Win32 bindings each time, which a busy CI runner
// can take minutes over, so these tests allow five.
describe.runIf(process.platform === "win32")("native capability probes in an AppContainer", () => {
  async function runner(network: "shared" | "none") {
    const made = await windowsAppContainerProbeRunnerV1(undefined, network);
    if ("refused" in made && process.env.ASCOUT_REQUIRE_WINDOWS_SANDBOX === "1") throw new Error(`the sandbox is required here but refused: ${made.refused}`);
    return made;
  }

  it("deny reading and writing outside the workspace and the host's loopback, even with network capabilities; the tier stays T0", async (ctx) => {
    const made = await runner("shared");
    if ("refused" in made) return ctx.skip();
    const report = await runCapabilityProbesV1("T1-FS-windows-appcontainer", made.runner);
    const expected: Record<string, string> = { read_outside_workspace: "DENIED", write_outside_workspace: "DENIED", loopback_network: "DENIED", environment_secret: "ALLOWED" };
    expect(report.results.map((result) => [result.id, result.verdict])).toEqual(CAPABILITY_PROBE_IDS.map((id) => [id, expected[id]]));
    expect(currentContainmentV1()).toMatchObject({ tier: "T0", filesystem_isolation: "NONE" });
  }, 300_000);

  it("with no network capabilities and an allowlisted environment, deny all four; the tier still stays T0", async (ctx) => {
    const made = await runner("none");
    if ("refused" in made) return ctx.skip();
    const isolated: ProbeRunnerV1 = (script, task, env, cwd) => made.runner(script, task, allowlistedTaskEnvironmentV1(env, process.platform), cwd);
    const report = await runCapabilityProbesV1("T1-FS+NET+ENV-windows-appcontainer", isolated);
    expect(report.results.map((result) => [result.id, result.verdict])).toEqual(CAPABILITY_PROBE_IDS.map((id) => [id, "DENIED"]));
    expect(report.all_denied).toBe(true);
    expect(currentContainmentV1()).toMatchObject({ tier: "T0", filesystem_isolation: "NONE", network_isolation: "NONE" });
  }, 300_000);
});
