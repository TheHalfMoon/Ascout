import { existsSync, readFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CAPABILITY_PROBE_IDS, runCapabilityProbesV1, type ProbeRunnerV1 } from "../src/assurance/containment/capability-probes.js";
import { allowlistedTaskEnvironmentV1 } from "../src/assurance/containment/task-environment.js";
import { currentContainmentV1 } from "../src/assurance/containment/containment-tier.js";
import {
  BWRAP_LOCATIONS,
  execFileTextV1,
  findBwrapV1,
  linuxFsSandboxArgsV1,
  linuxFsSandboxProbeRunnerV1,
  nodeBinaryToBindV1,
  realLinuxFsHostV1,
  workspaceRefusalV1,
  type LinuxFsHostV1,
  type LinuxFsSandboxDepsV1,
} from "../src/assurance/containment/linux-fs-sandbox.js";

// FD-4 phase T1-FS on Linux, research only: no Ascout command runs tasks in this sandbox yet, and the
// tier stays T0. The native test below is the public, generic evidence; technique-level probes are
// kept in the private host spec.

/** A fake host: `links` maps a path to its symlink target; everything listed in `present` exists. */
function host(present: readonly string[], links: Record<string, string> = {}, log: string[] = []): LinuxFsHostV1 {
  return {
    exists: (path) => present.includes(path),
    symlinkTarget: (path) => links[path] ?? null,
    realpath: (path) => path,
    home: () => "/home/u",
    makeTempDir: () => "/tmp/selftest",
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

const MERGED_USR = host(["/usr/bin/bwrap", "/bin", "/sbin", "/lib", "/lib64"], { "/bin": "usr/bin", "/sbin": "usr/sbin", "/lib": "usr/lib", "/lib64": "usr/lib64" });

describe("finding bubblewrap", () => {
  it("looks only at fixed system locations, never PATH", () => {
    expect(BWRAP_LOCATIONS).toEqual(["/usr/bin/bwrap", "/bin/bwrap"]);
    expect(findBwrapV1(host(["/bin/bwrap"]))).toBe("/bin/bwrap");
    expect(findBwrapV1(host(["/usr/bin/bwrap", "/bin/bwrap"]))).toBe("/usr/bin/bwrap");
    expect(findBwrapV1(host(["/usr/local/bin/bwrap"]))).toBeNull();
  });
});

describe("the Node binary to bind", () => {
  it.each([
    ["/usr/bin/node", null],
    ["/usr/local/bin/node", null],
    ["/bin/node", null],
    ["/opt/hostedtoolcache/node/24.1.0/x64/bin/node", "/opt/hostedtoolcache/node/24.1.0/x64/bin/node"],
    // Only the binary, never its folder: here the folder would be the whole home.
    ["/home/u/bin/node", "/home/u/bin/node"],
    ["/opt/bin/node", "/opt/bin/node"],
  ])("%s binds %s", (execPath, binary) => {
    expect(nodeBinaryToBindV1(execPath)).toBe(binary);
  });
});

describe("the workspace", () => {
  it.each([
    "/home/u/src/repo",
    "/tmp/ascout-probe-workspace-1",
    "/home/runner/work/_temp/ascout-probe-workspace-1",
    "/srv/build/repo",
    "/var/lib/ci/repo",
  ])("may be %s", (workspace) => {
    expect(workspaceRefusalV1(workspace, "/home/u")).toBeNull();
  });

  it.each([
    ["work/repo", "absolute, normalized"],
    ["/home/u/../u/repo", "absolute, normalized"],
    ["/home/u/repo/", "absolute, normalized"],
    ["/", "be or contain /"],
    ["/tmp", "be or contain /tmp"],
    ["/home", "be or contain /home"],
    ["/home/u", "be or contain /home/u"],
    ["/proc", "be or contain /proc"],
    ["/dev", "be or contain /dev"],
    ["/var", "be or contain /var"],
    ["/opt", "be or contain /opt"],
    ["/proc/self", "inside /proc"],
    ["/dev/shm/x", "inside /dev"],
    ["/run/user/1000", "inside /run"],
    ["/usr/local/src", "inside /usr"],
    ["/etc/app", "inside /etc"],
  ])("may not be %s", (workspace, reason) => {
    expect(workspaceRefusalV1(workspace, "/home/u")).toContain(reason);
  });

  it("may not contain the home folder, wherever it is", () => {
    expect(workspaceRefusalV1("/data", "/data/users/u")).toBe("the workspace may not be or contain /data/users/u");
  });
});

describe("the sandbox arguments", () => {
  const pairs = (args: readonly string[], flag: string) => args.flatMap((arg, index) => (arg === flag ? [args.slice(index + 1, index + 3).join(" ")] : []));

  it("start from an empty root: system folders read-only, a fresh /tmp, and only the workspace writable", () => {
    const args = linuxFsSandboxArgsV1("/work/repo", "/opt/node/bin/node", MERGED_USR);
    expect(pairs(args, "--ro-bind")).toEqual(["/usr /usr", "/etc /etc", "/opt/node/bin/node /opt/node/bin/node"]);
    expect(pairs(args, "--symlink")).toEqual(["usr/bin /bin", "usr/sbin /sbin", "usr/lib /lib", "usr/lib64 /lib64"]);
    expect(pairs(args, "--bind")).toEqual(["/work/repo /work/repo"]);
    expect(args.join(" ")).toContain("--proc /proc --dev /dev --tmpfs /tmp");
    expect(args.join(" ")).toContain("--chdir /work/repo");
    for (const flag of ["--unshare-pid", "--unshare-ipc", "--die-with-parent", "--new-session"]) expect(args).toContain(flag);
    // Network isolation is a later phase; this phase must not pretend to have it.
    expect(args).not.toContain("--unshare-net");
    expect(args).not.toContain("--unshare-all");
  });

  it("unshare the network only when asked: an empty namespace, never by default", () => {
    expect(linuxFsSandboxArgsV1("/work/repo", null, MERGED_USR, "none").at(-1)).toBe("--unshare-net");
    expect(linuxFsSandboxArgsV1("/work/repo", null, MERGED_USR, "shared")).not.toContain("--unshare-net");
  });

  it("binds the Node binary and the workspace after the fresh /tmp, so neither is hidden under it", () => {
    const args = linuxFsSandboxArgsV1("/tmp/ws", "/tmp/node/bin/node", MERGED_USR);
    const tmpfs = args.indexOf("--tmpfs");
    expect(args.indexOf("/tmp/node/bin/node")).toBeGreaterThan(tmpfs);
    expect(args.indexOf("--bind")).toBeGreaterThan(tmpfs);
  });

  it("binds real system folders read-only on hosts without merged-usr, and skips absent ones", () => {
    const args = linuxFsSandboxArgsV1("/work/repo", null, host(["/bin", "/lib"]));
    expect(pairs(args, "--ro-bind")).toEqual(["/usr /usr", "/etc /etc", "/bin /bin", "/lib /lib"]);
    expect(args).not.toContain("--symlink");
  });

  it("refuses a workspace the checks refuse, and a relative Node binary", () => {
    expect(() => linuxFsSandboxArgsV1("/home/u", null, MERGED_USR)).toThrow(/may not be or contain \/home\/u/u);
    expect(() => linuxFsSandboxArgsV1("/work/repo", "bin/node", MERGED_USR)).toThrow(/Node binary must be an absolute path/u);
  });
});

describe("the sandboxed probe runner", () => {
  const calls: { file: string; argv: readonly string[]; cwd: string; env: NodeJS.ProcessEnv }[] = [];
  const deps = (overrides: Partial<LinuxFsSandboxDepsV1> = {}, reply = "sandbox-ok", log: string[] = []): LinuxFsSandboxDepsV1 => ({
    platform: "linux",
    host: host(["/usr/bin/bwrap"], {}, log),
    execPath: "/opt/node/bin/node",
    exec: async (file, argv, options) => {
      calls.push({ file, argv, ...options });
      return reply;
    },
    ...overrides,
  });

  it("refuses off Linux and without bubblewrap, and never falls back to running unsandboxed", async () => {
    calls.length = 0;
    expect(await linuxFsSandboxProbeRunnerV1(deps({ platform: "darwin" }))).toEqual({ refused: "the bubblewrap sandbox is Linux only" });
    expect(await linuxFsSandboxProbeRunnerV1(deps({ host: host([]) }))).toEqual({ refused: "bubblewrap is not installed at /usr/bin/bwrap or /bin/bwrap" });
    expect(calls).toEqual([]);
  });

  it("self-tests isolation with a marker beside an empty workspace, then removes both", async () => {
    calls.length = 0;
    const log: string[] = [];
    await linuxFsSandboxProbeRunnerV1(deps({}, "sandbox-ok", log));
    expect(log).toEqual(["mkdir /tmp/selftest/workspace", "write /tmp/selftest/outside-marker", "rm /tmp/selftest"]);
    expect(calls[0]).toMatchObject({ file: "/usr/bin/bwrap", cwd: "/tmp/selftest/workspace", env: {} });
    expect(calls[0]!.argv.join(" ")).toContain("--bind /tmp/selftest/workspace /tmp/selftest/workspace");
    expect(calls[0]!.argv.at(-1)).toContain('existsSync("/tmp/selftest/outside-marker")');
  });

  it.each([
    ["escaped", "the bubblewrap sandbox started but did not hide a path outside its workspace"],
    ["", "the bubblewrap sandbox did not start (are unprivileged user namespaces allowed?)"],
  ])("refuses when the self-test prints %j, and still removes its folder", async (reply, refused) => {
    const log: string[] = [];
    expect(await linuxFsSandboxProbeRunnerV1(deps({}, reply, log))).toEqual({ refused });
    expect(log.at(-1)).toBe("rm /tmp/selftest");
  });

  it("removes the self-test folder even when the sandbox can't be run at all", async () => {
    const log: string[] = [];
    await expect(linuxFsSandboxProbeRunnerV1(deps({ exec: async () => { throw new Error("spawn failed"); } }, "", log))).rejects.toThrow("spawn failed");
    expect(log.at(-1)).toBe("rm /tmp/selftest");
  });

  it("runs the probe through bubblewrap with the workspace as its only writable folder", async () => {
    calls.length = 0;
    const made = await linuxFsSandboxProbeRunnerV1(deps());
    if (!("runner" in made)) throw new Error("expected a runner");
    const task = { canaryPath: "/tmp/o/c", writePath: "/tmp/o/w", port: 1, envName: "X" };
    expect(await made.runner("script", task, { X: "1" }, "/work/ws")).toBe("sandbox-ok");
    const call = calls[1]!;
    expect(call).toMatchObject({ file: "/usr/bin/bwrap", cwd: "/work/ws", env: { X: "1" } });
    expect(call.argv.slice(-5)).toEqual(["--", "/opt/node/bin/node", "-e", "script", JSON.stringify(task)]);
    expect(call.argv.join(" ")).toContain("--bind /work/ws /work/ws");
    expect(call.argv.join(" ")).toContain("--ro-bind /opt/node/bin/node /opt/node/bin/node");
    expect(call.argv).not.toContain("--setenv");
    expect(call.argv).not.toContain("--unshare-net");
  });

  it("isolates the network for the self-test and the probe when asked", async () => {
    calls.length = 0;
    const made = await linuxFsSandboxProbeRunnerV1(deps(), "none");
    if (!("runner" in made)) throw new Error("expected a runner");
    await made.runner("script", { canaryPath: "/tmp/o/c", writePath: "/tmp/o/w", port: 1, envName: "X" }, {}, "/work/ws");
    expect(calls.map((call) => call.argv.includes("--unshare-net"))).toEqual([true, true]);
  });
});

describe("the real host helpers", () => {
  it("read links, resolve paths, make and remove folders and files, and run a file, on any OS", async () => {
    const dir = realLinuxFsHostV1.makeTempDir();
    try {
      realLinuxFsHostV1.makeDir(join(dir, "real"));
      realLinuxFsHostV1.writeFile(join(dir, "real", "f"), "x");
      expect(readFileSync(join(dir, "real", "f"), "utf8")).toBe("x");
      expect(realLinuxFsHostV1.exists(join(dir, "real"))).toBe(true);
      expect(realLinuxFsHostV1.symlinkTarget(join(dir, "real"))).toBeNull();
      let linked = true;
      try {
        symlinkSync(join(dir, "real"), join(dir, "link"), "junction");
      } catch {
        linked = false; // Creating links can need a privilege on Windows.
      }
      if (linked) expect(realLinuxFsHostV1.symlinkTarget(join(dir, "link"))).toBeTruthy();
      expect(realLinuxFsHostV1.realpath(join(dir, "real")).toLowerCase().endsWith("real")).toBe(true);
      expect(realLinuxFsHostV1.home().length).toBeGreaterThan(0);
      expect(await execFileTextV1(process.execPath, ["-e", "process.stdout.write('hi'); process.exit(3)"], { cwd: dir, env: {} })).toBe("hi");
    } finally {
      realLinuxFsHostV1.removeDir(dir);
    }
    expect(existsSync(dir)).toBe(false);
  });
});

// Native evidence. CI sets ASCOUT_REQUIRE_LINUX_SANDBOX=1 on Linux, so a sandbox that can't start
// fails the run there instead of silently skipping. Elsewhere on Linux without bubblewrap, it passes
// without evidence.
describe.runIf(process.platform === "linux")("native capability probes inside the Linux filesystem sandbox", () => {
  it("deny reading and writing a sibling outside the workspace; network and environment stay allowed, so the tier stays T0", async () => {
    const made = await linuxFsSandboxProbeRunnerV1();
    if ("refused" in made) {
      if (process.env.ASCOUT_REQUIRE_LINUX_SANDBOX === "1") throw new Error(`the sandbox is required here but refused: ${made.refused}`);
      return;
    }
    const report = await runCapabilityProbesV1("T1-FS-linux-bwrap", made.runner);
    const expected: Record<string, string> = { read_outside_workspace: "DENIED", write_outside_workspace: "DENIED", loopback_network: "ALLOWED", environment_secret: "ALLOWED" };
    expect(report.results.map((result) => [result.id, result.verdict])).toEqual(CAPABILITY_PROBE_IDS.map((id) => [id, expected[id]]));
    expect(report.all_denied).toBe(false);
    expect(currentContainmentV1()).toMatchObject({ tier: "T0", filesystem_isolation: "NONE" });
  }, 60_000);

  it("with the network isolated and an allowlisted environment, deny all four capabilities; the tier still stays T0", async () => {
    const made = await linuxFsSandboxProbeRunnerV1(undefined, "none");
    if ("refused" in made) {
      if (process.env.ASCOUT_REQUIRE_LINUX_SANDBOX === "1") throw new Error(`the sandbox is required here but refused: ${made.refused}`);
      return;
    }
    const isolated: ProbeRunnerV1 = (script, task, env, cwd) => made.runner(script, task, allowlistedTaskEnvironmentV1(env, process.platform), cwd);
    const report = await runCapabilityProbesV1("T1-FS+NET+ENV-linux-bwrap", isolated);
    expect(report.results.map((result) => [result.id, result.verdict])).toEqual(CAPABILITY_PROBE_IDS.map((id) => [id, "DENIED"]));
    expect(report.all_denied).toBe(true);
    // Research evidence only: no T1 claim without an independent human security review.
    expect(currentContainmentV1()).toMatchObject({ tier: "T0", filesystem_isolation: "NONE", network_isolation: "NONE" });
  }, 60_000);
});
