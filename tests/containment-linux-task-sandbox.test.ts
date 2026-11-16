import { execFile, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { LinuxFsHostV1 } from "../src/assurance/containment/linux-fs-sandbox.js";
import { SANDBOX_HOME, linuxTaskSandboxArgvV1, nodePrefixToBindV1, prepareLinuxTaskSandboxV1, type LinuxTaskSandboxDepsV1, type LinuxTaskSandboxV1 } from "../src/assurance/containment/linux-task-sandbox.js";

// FD-4 T1 on Linux: the bubblewrap sandbox for `check` tasks. The native tests at the end are the
// evidence; each pairs a denial with a control showing the same probe detects the capability without
// the sandbox. Synthetic, disposable folders only.

function fakeHost(present: readonly string[], links: Record<string, string> = {}, realpaths: Record<string, string> = {}): LinuxFsHostV1 {
  return {
    exists: (path) => present.includes(path),
    symlinkTarget: (path) => links[path] ?? null,
    realpath: (path) => realpaths[path] ?? path,
    home: () => "/home/u",
    makeTempDir: () => "/tmp/selftest",
    makeDir: () => undefined,
    writeFile: () => undefined,
    removeDir: () => undefined,
  };
}

const PLAN = { bwrap: "/usr/bin/bwrap", workspace: "/home/u/src/repo", nodePrefix: "/opt/node", gitDir: "/home/u/src/repo/.git" };
const HOST = fakeHost(["/usr/bin/bwrap", "/bin", "/lib"], { "/bin": "usr/bin", "/lib": "usr/lib" });

describe("the Node install folder", () => {
  it("is not bound when Node lives in a system folder", () => {
    expect(nodePrefixToBindV1("/usr/bin/node", "/home/u")).toBeNull();
    expect(nodePrefixToBindV1("/bin/node", "/home/u")).toBeNull();
  });

  it("is the folder two levels above the binary, which may sit inside the home folder", () => {
    expect(nodePrefixToBindV1("/opt/hostedtoolcache/node/22.1.0/x64/bin/node", "/home/u")).toBe("/opt/hostedtoolcache/node/22.1.0/x64");
    expect(nodePrefixToBindV1("/home/u/.nvm/versions/node/v22.1.0/bin/node", "/home/u")).toBe("/home/u/.nvm/versions/node/v22.1.0");
  });

  it("is refused when it is the home folder, a protected location, or relative", () => {
    expect(() => nodePrefixToBindV1("/home/u/bin/node", "/home/u")).toThrow(/home\/u/u);
    expect(() => nodePrefixToBindV1("/opt/bin/node", "/home/u")).toThrow(/\/opt/u);
    expect(() => nodePrefixToBindV1("node", "/home/u")).toThrow(/absolute/u);
  });
});

describe("the task sandbox command line", () => {
  it("isolates the network, binds .git read-only after the writable repository, drops capabilities, and starts in the task's folder", () => {
    const argv = linuxTaskSandboxArgvV1(PLAN, "/opt/node/bin/npx", ["vitest", "run"], "/home/u/src/repo/pkg", HOST);
    const at = (flag: string, value: string) => argv.findIndex((item, index) => item === flag && argv[index + 1] === value);
    expect(argv).toContain("--unshare-net");
    expect(at("--bind", "/home/u/src/repo")).toBeGreaterThan(-1);
    expect(at("--ro-bind", "/home/u/src/repo/.git")).toBeGreaterThan(at("--bind", "/home/u/src/repo"));
    expect(at("--ro-bind", "/opt/node")).toBeGreaterThan(argv.indexOf("/tmp"));
    expect(argv.slice(argv.indexOf("--setenv"), argv.indexOf("--setenv") + 3)).toEqual(["--setenv", "HOME", SANDBOX_HOME]);
    expect(argv.slice(argv.indexOf("--cap-drop"), argv.indexOf("--cap-drop") + 2)).toEqual(["--cap-drop", "ALL"]);
    // The last --chdir wins, and the command follows the separator unchanged.
    expect(argv[argv.lastIndexOf("--chdir") + 1]).toBe("/home/u/src/repo/pkg");
    expect(argv.slice(argv.indexOf("--"))).toEqual(["--", "/opt/node/bin/npx", "vitest", "run"]);
  });

  it("binds neither a Node folder nor .git when there is none", () => {
    const argv = linuxTaskSandboxArgvV1({ ...PLAN, nodePrefix: null, gitDir: null }, "/usr/bin/python3", ["-m", "pytest"], PLAN.workspace, HOST);
    expect(argv).not.toContain("/opt/node");
    expect(argv).not.toContain("/home/u/src/repo/.git");
  });

  it("refuses a command found on PATH, and a starting folder outside the repository", () => {
    expect(() => linuxTaskSandboxArgvV1(PLAN, "npx", [], PLAN.workspace, HOST)).toThrow(/absolute path/u);
    expect(() => linuxTaskSandboxArgvV1(PLAN, "/usr/bin/true", [], "/home/u/src/other", HOST)).toThrow(/inside the repository/u);
    expect(() => linuxTaskSandboxArgvV1(PLAN, "/usr/bin/true", [], "/home/u/src/repo/../other", HOST)).toThrow(/inside the repository/u);
    expect(() => linuxTaskSandboxArgvV1(PLAN, "/usr/bin/true", [], "/home/u/src/repository", HOST)).toThrow(/inside the repository/u);
  });
});

describe("preparing the task sandbox", () => {
  const deps = (overrides: Partial<LinuxTaskSandboxDepsV1> = {}): LinuxTaskSandboxDepsV1 => ({
    platform: "linux",
    host: fakeHost(["/usr/bin/bwrap", "/home/u/src/repo/.git"]),
    exec: async () => "sandbox-ok",
    execPath: "/opt/node/bin/node",
    ...overrides,
  });

  it("refuses off Linux, without bubblewrap, for a refused repository or Node folder, and when the self-test fails", async () => {
    expect(await prepareLinuxTaskSandboxV1("/home/u/src/repo", deps({ platform: "darwin" }))).toEqual({ refused: "the bubblewrap task sandbox is Linux only" });
    expect(await prepareLinuxTaskSandboxV1("/home/u/src/repo", deps({ host: fakeHost([]) }))).toEqual({ refused: "bubblewrap is not installed at /usr/bin/bwrap or /bin/bwrap" });
    expect(await prepareLinuxTaskSandboxV1("/home", deps())).toMatchObject({ refused: expect.stringMatching(/may not be or contain/u) });
    expect(await prepareLinuxTaskSandboxV1("/home/u/src/repo", deps({ execPath: "/home/u/bin/node" }))).toMatchObject({ refused: expect.stringMatching(/Node install folder/u) });
    expect(await prepareLinuxTaskSandboxV1("/home/u/src/repo", deps({ exec: async () => "" }))).toMatchObject({ refused: expect.stringMatching(/did not start/u) });
    expect(await prepareLinuxTaskSandboxV1("/home/u/src/repo", deps({ exec: async () => "escaped" }))).toMatchObject({ refused: expect.stringMatching(/did not hide/u) });
  });

  it("refuses when a path can't be resolved, instead of throwing", async () => {
    const host = { ...fakeHost(["/usr/bin/bwrap"]), realpath: () => { throw new Error("ENOENT: no such file"); } };
    expect(await prepareLinuxTaskSandboxV1("/home/u/src/repo", deps({ host }))).toEqual({ refused: "ENOENT: no such file" });
  });

  it("wraps a command through bubblewrap, binding .git read-only only when it is a real folder", async () => {
    const made = await prepareLinuxTaskSandboxV1("/home/u/src/repo", deps());
    if (!("sandbox" in made)) throw new Error(made.refused);
    expect(made.sandbox.mechanism).toBe("linux-bubblewrap");
    const wrapped = made.sandbox.wrap("/usr/bin/python3", ["-m", "pytest"], "/home/u/src/repo");
    expect(wrapped.file).toBe("/usr/bin/bwrap");
    expect(wrapped.argv).toContain("/home/u/src/repo/.git");
    const linked = await prepareLinuxTaskSandboxV1("/home/u/src/repo", deps({ host: fakeHost(["/usr/bin/bwrap", "/home/u/src/repo/.git"], { "/home/u/src/repo/.git": "/elsewhere" }) }));
    if (!("sandbox" in linked)) throw new Error(linked.refused);
    expect(linked.sandbox.wrap("/usr/bin/true", [], "/home/u/src/repo").argv).not.toContain("/home/u/src/repo/.git");
  });
});

// Native evidence. CI sets ASCOUT_REQUIRE_LINUX_SANDBOX=1 on Linux, so a sandbox that can't start
// fails the run there instead of silently skipping.
describe.runIf(process.platform === "linux")("native: a check task inside the Linux task sandbox", () => {
  const node = realpathSync(process.execPath);

  async function setUp(): Promise<{ root: string; ws: string; outside: string; sandbox: LinuxTaskSandboxV1 } | null> {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "ascout-t1-linux-")));
    const ws = join(root, "ws");
    mkdirSync(join(ws, ".git"), { recursive: true });
    mkdirSync(join(ws, "sub"));
    writeFileSync(join(ws, ".git", "config"), "[core]\n");
    const outside = join(root, "outside.txt");
    writeFileSync(outside, "host secret");
    const made = await prepareLinuxTaskSandboxV1(ws);
    if ("refused" in made) {
      rmSync(root, { recursive: true, force: true });
      if (process.env.ASCOUT_REQUIRE_LINUX_SANDBOX === "1") throw new Error(`the task sandbox is required here but refused: ${made.refused}`);
      return null;
    }
    return { root, ws, outside, sandbox: made.sandbox };
  }

  function run(sandbox: LinuxTaskSandboxV1 | null, cwd: string, script: string, env: NodeJS.ProcessEnv = { PATH: "/usr/bin:/bin" }): Promise<string> {
    const { file, argv } = sandbox === null ? { file: node, argv: ["-e", script] } : sandbox.wrap(node, ["-e", script], cwd);
    return new Promise((resolve) => execFile(file, [...argv], { cwd, env, encoding: "utf8", timeout: 20_000 }, (_error, stdout) => resolve(stdout)));
  }

  const attempt = (body: string) => `let r = "allowed"; try { ${body} } catch (e) { r = e.code || String(e); } process.stdout.write(r)`;

  it("writes inside the repository, but not into .git", async (ctx) => {
    const t = await setUp();
    if (t === null) return ctx.skip();
    try {
      expect(await run(t.sandbox, t.ws, attempt(`require("fs").writeFileSync("out.txt", "ok")`))).toBe("allowed");
      expect(readFileSync(join(t.ws, "out.txt"), "utf8")).toBe("ok");
      expect(await run(t.sandbox, t.ws, attempt(`require("fs").appendFileSync(".git/config", "[core]\\n\\tfsmonitor = evil\\n")`))).toBe("EROFS");
      expect(await run(t.sandbox, t.ws, attempt(`require("fs").writeFileSync(".git/hooks-post-checkout", "x")`))).toBe("EROFS");
      expect(readFileSync(join(t.ws, ".git", "config"), "utf8")).toBe("[core]\n");
      // Control: the same append works outside the sandbox.
      appendFileSync(join(t.ws, ".git", "config"), "");
    } finally {
      rmSync(t.root, { recursive: true, force: true });
    }
  }, 60_000);

  it("can't read a host file outside the repository directly, through a symlink, or through ..", async (ctx) => {
    const t = await setUp();
    if (t === null) return ctx.skip();
    try {
      symlinkSync(t.outside, join(t.ws, "link"));
      const read = (path: string) => attempt(`require("fs").readFileSync(${JSON.stringify(path)}, "utf8"); r = "read"`);
      expect(await run(t.sandbox, t.ws, read(t.outside))).toBe("ENOENT");
      expect(await run(t.sandbox, t.ws, read(join(t.ws, "link")))).toBe("ENOENT");
      expect(await run(t.sandbox, t.ws, read(`${t.ws}/../outside.txt`))).toBe("ENOENT");
      // Control: the same three reads succeed outside the sandbox.
      for (const path of [t.outside, join(t.ws, "link"), `${t.ws}/../outside.txt`]) expect(await run(null, t.ws, read(path))).toBe("read");
    } finally {
      rmSync(t.root, { recursive: true, force: true });
    }
  }, 60_000);

  it("can't reach a host loopback service", async (ctx) => {
    const t = await setUp();
    if (t === null) return ctx.skip();
    const server = createServer((socket) => socket.end("hello"));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;
    const connect = `const s = require("net").connect(${port}, "127.0.0.1"); s.on("data", () => { process.stdout.write("connected"); process.exit(0); }); s.on("error", (e) => { process.stdout.write(e.code); process.exit(0); });`;
    try {
      expect(await run(t.sandbox, t.ws, connect)).not.toBe("connected");
      expect(await run(null, t.ws, connect)).toBe("connected");
    } finally {
      server.close();
      rmSync(t.root, { recursive: true, force: true });
    }
  }, 60_000);

  it("sees no host process, no variable it wasn't given, a fresh home, and no capabilities", async (ctx) => {
    const t = await setUp();
    if (t === null) return ctx.skip();
    process.env.ASCOUT_T1_CANARY = "host-only";
    try {
      const probe = `const fs = require("fs"); process.stdout.write(JSON.stringify({
        hostPid: fs.existsSync("/proc/${process.pid}/environ"),
        canary: process.env.ASCOUT_T1_CANARY ?? null,
        home: process.env.HOME,
        capEff: (fs.readFileSync("/proc/self/status", "utf8").match(/^CapEff:\\s*(\\S+)/m) || [])[1],
        cwd: process.cwd(),
      }))`;
      const inside = JSON.parse(await run(t.sandbox, join(t.ws, "sub"), probe, { PATH: "/usr/bin:/bin" })) as Record<string, unknown>;
      expect(inside).toEqual({ hostPid: false, canary: null, home: SANDBOX_HOME, capEff: "0000000000000000", cwd: join(t.ws, "sub") });
      // Control: outside, the same probe sees this process and the variable when it is passed.
      const outside = JSON.parse(await run(null, t.ws, probe, { ...process.env })) as Record<string, unknown>;
      expect(outside.hostPid).toBe(true);
      expect(outside.canary).toBe("host-only");
    } finally {
      delete process.env.ASCOUT_T1_CANARY;
      rmSync(t.root, { recursive: true, force: true });
    }
  }, 60_000);

  it("leaves no descendant running after the task exits", async (ctx) => {
    const t = await setUp();
    if (t === null) return ctx.skip();
    try {
      const late = (marker: string) => `require("child_process").spawn(process.execPath, ["-e", "setTimeout(() => require('fs').writeFileSync(${JSON.stringify(marker)}, 'x'), 1500)"], { detached: true, stdio: "ignore" }).unref(); process.stdout.write("started")`;
      expect(await run(t.sandbox, t.ws, late(join(t.ws, "late-inside")))).toBe("started");
      expect(await run(null, t.ws, late(join(t.ws, "late-control")))).toBe("started");
      await new Promise((resolve) => setTimeout(resolve, 3500));
      expect(existsSync(join(t.ws, "late-inside"))).toBe(false);
      // Control: the same detached child, started outside the sandbox, outlives its parent.
      expect(existsSync(join(t.ws, "late-control"))).toBe(true);
    } finally {
      rmSync(t.root, { recursive: true, force: true });
    }
  }, 60_000);

  it("runs a real tool chain: git is readable, so a task can inspect but not change the repository's history", async (ctx) => {
    const t = await setUp();
    if (t === null) return ctx.skip();
    try {
      rmSync(join(t.ws, ".git"), { recursive: true, force: true });
      expect(spawnSync("git", ["init", "-q"], { cwd: t.ws }).status).toBe(0);
      const made = await prepareLinuxTaskSandboxV1(t.ws);
      if ("refused" in made) throw new Error(made.refused);
      const status = (args: string[]) => attempt(`const out = require("child_process").spawnSync("/usr/bin/git", ${JSON.stringify(args)}, { encoding: "utf8" }); r = out.status === 0 ? "ok" : "failed"`);
      expect(await run(made.sandbox, t.ws, status(["rev-parse", "--git-dir"]))).toBe("ok");
      expect(await run(made.sandbox, t.ws, status(["config", "core.fsmonitor", "evil"]))).toBe("failed");
      expect(spawnSync("git", ["config", "--get", "core.fsmonitor"], { cwd: t.ws }).status).not.toBe(0);
    } finally {
      rmSync(t.root, { recursive: true, force: true });
    }
  }, 60_000);
});
