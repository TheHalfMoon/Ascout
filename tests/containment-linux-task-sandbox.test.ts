import { execFile, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { LinuxFsHostV1 } from "../src/assurance/containment/linux-fs-sandbox.js";
import { LINUX_SELF_TEST_EXPECTED, SANDBOX_HOME, gitReachRefusalV1, linuxTaskSandboxArgvV1, nodeBindsV1, prepareLinuxTaskSandboxV1, type LinuxTaskSandboxDepsV1, type LinuxTaskSandboxV1 } from "../src/assurance/containment/linux-task-sandbox.js";

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

const REPO = "/home/u/src/repo";
const RESULTS = `${REPO}/.ascout/runs/r1/raw/test`;
const PLAN = { bwrap: "/usr/bin/bwrap", workspace: REPO, nodeBinds: [{ kind: "bind" as const, path: "/opt/node/bin/node" }, { kind: "symlink" as const, path: "/opt/node/bin/npx", target: "../lib/node_modules/npm/bin/npx-cli.js" }, { kind: "bind" as const, path: "/opt/node/lib/node_modules/npm" }], gitDir: `${REPO}/.git` };
const HOST = fakeHost(["/usr/bin/bwrap", "/bin", "/lib"], { "/bin": "usr/bin", "/lib": "usr/lib" });

describe("the Node entry points", () => {
  it("are not bound when Node lives in a system folder", () => {
    expect(nodeBindsV1("/usr/bin/node", HOST)).toEqual([]);
    expect(nodeBindsV1("/bin/node", HOST)).toEqual([]);
  });

  it("are only node and the package managers, bound read-only, with their symlinks recreated as they are", () => {
    const host = fakeHost(["/opt/node/bin/node", "/opt/node/bin/npx", "/opt/node/lib/node_modules/npm", "/opt/node/etc/npmrc"], { "/opt/node/bin/npx": "../lib/node_modules/npm/bin/npx-cli.js" });
    expect(nodeBindsV1("/opt/node/bin/node", host)).toEqual([
      { kind: "bind", path: "/opt/node/bin/node" },
      { kind: "symlink", path: "/opt/node/bin/npx", target: "../lib/node_modules/npm/bin/npx-cli.js" },
      { kind: "bind", path: "/opt/node/lib/node_modules/npm" },
    ]);
  });

  it("always include the running binary, and may sit inside the home folder, but never be it or contain it", () => {
    expect(nodeBindsV1("/home/u/.nvm/versions/node/v22/bin/node", fakeHost([]))).toEqual([{ kind: "bind", path: "/home/u/.nvm/versions/node/v22/bin/node" }]);
    expect(() => nodeBindsV1("/home/u/bin/node", HOST)).toThrow(/home\/u/u);
    expect(() => nodeBindsV1("/opt/bin/node", HOST)).toThrow(/\/opt/u);
    expect(() => nodeBindsV1("node", HOST)).toThrow(/absolute/u);
  });
});

describe("the task sandbox command line", () => {
  const argv = linuxTaskSandboxArgvV1(PLAN, "/opt/node/bin/npx", ["vitest", "run"], `${REPO}/pkg`, [RESULTS], HOST);
  const at = (flag: string, value: string) => argv.findIndex((item, index) => item === flag && argv[index + 1] === value);

  it("isolates the network, keeps .git read-only, hides .ascout but this run's result folders, drops capabilities, and starts in the task's folder", () => {
    expect(argv).toContain("--unshare-net");
    expect(at("--ro-bind", `${REPO}/.git`)).toBeGreaterThan(at("--bind", REPO));
    expect(at("--tmpfs", `${REPO}/.ascout`)).toBeGreaterThan(at("--bind", REPO));
    expect(at("--bind", RESULTS)).toBeGreaterThan(at("--tmpfs", `${REPO}/.ascout`));
    expect(argv.slice(argv.indexOf("--setenv"), argv.indexOf("--setenv") + 3)).toEqual(["--setenv", "HOME", SANDBOX_HOME]);
    expect(argv.slice(argv.indexOf("--cap-drop"), argv.indexOf("--cap-drop") + 2)).toEqual(["--cap-drop", "ALL"]);
    expect(argv[argv.lastIndexOf("--chdir") + 1]).toBe(`${REPO}/pkg`);
    expect(argv.slice(argv.indexOf("--"))).toEqual(["--", "/opt/node/bin/npx", "vitest", "run"]);
  });

  it("binds Node's entry points after the fresh /tmp, recreating symlinks, and nothing else of its folder", () => {
    expect(at("--ro-bind", "/opt/node/bin/node")).toBeGreaterThan(argv.indexOf("/tmp"));
    expect(argv.slice(at("--symlink", "../lib/node_modules/npm/bin/npx-cli.js"), at("--symlink", "../lib/node_modules/npm/bin/npx-cli.js") + 3)).toEqual(["--symlink", "../lib/node_modules/npm/bin/npx-cli.js", "/opt/node/bin/npx"]);
    expect(argv).not.toContain("/opt/node");
  });

  it("binds no .git when there is none", () => {
    expect(linuxTaskSandboxArgvV1({ ...PLAN, nodeBinds: [], gitDir: null }, "/usr/bin/python3", [], REPO, [], HOST)).not.toContain(`${REPO}/.git`);
  });

  it("refuses a command found on PATH, a starting folder outside the repository, and a result folder outside .ascout", () => {
    expect(() => linuxTaskSandboxArgvV1(PLAN, "npx", [], REPO, [], HOST)).toThrow(/absolute path/u);
    for (const cwd of ["/home/u/src/other", `${REPO}/../other`, "/home/u/src/repository"]) expect(() => linuxTaskSandboxArgvV1(PLAN, "/usr/bin/true", [], cwd, [], HOST)).toThrow(/inside the repository/u);
    for (const dir of [`${REPO}/src`, `${REPO}/.ascout`, `${REPO}/.ascout/../src`, "/tmp/x"]) expect(() => linuxTaskSandboxArgvV1(PLAN, "/usr/bin/true", [], REPO, [dir], HOST)).toThrow(/inside \.ascout/u);
  });
});

describe("preparing the task sandbox", () => {
  const present = ["/usr/bin/bwrap", `${REPO}/.git`, `${REPO}/.git/HEAD`];
  const deps = (overrides: Partial<LinuxTaskSandboxDepsV1> = {}): LinuxTaskSandboxDepsV1 => ({
    platform: "linux",
    host: fakeHost(present),
    exec: async () => JSON.stringify(LINUX_SELF_TEST_EXPECTED),
    execPath: "/opt/node/bin/node",
    loopbackPort: async () => null,
    readText: () => "[core]\n\tbare = false\n",
    ...overrides,
  });

  it("refuses a .git whose hooks folder is a link or whose configuration includes other files", async () => {
    const withHooks = fakeHost([...present, `${REPO}/.git/hooks`], { [`${REPO}/.git/hooks`]: "../hooks" });
    expect(await prepareLinuxTaskSandboxV1(REPO, deps({ host: withHooks }))).toMatchObject({ refused: expect.stringMatching(/hooks is a link/u) });
    for (const config of ["[include]\n\tpath = ../conf\n", "  [includeIf \"gitdir:/x/\"]\n\tpath = y\n", "[INCLUDE]\npath=z\n"]) {
      expect(await prepareLinuxTaskSandboxV1(REPO, deps({ readText: () => config })), config).toMatchObject({ refused: expect.stringMatching(/includes other files/u) });
    }
    expect(gitReachRefusalV1(`${REPO}/.git`, fakeHost([`${REPO}/.git/hooks`]), () => null)).toBeNull();
    expect(gitReachRefusalV1(`${REPO}/.git`, fakeHost([]), () => "[core]\n[remote \"origin\"]\n\turl = x\n")).toBeNull();
  });

  it("refuses off Linux, without bubblewrap, for a refused repository or Node folder", async () => {
    expect(await prepareLinuxTaskSandboxV1(REPO, deps({ platform: "darwin" }))).toEqual({ refused: "the bubblewrap task sandbox is Linux only" });
    expect(await prepareLinuxTaskSandboxV1(REPO, deps({ host: fakeHost([]) }))).toEqual({ refused: "bubblewrap is not installed at /usr/bin/bwrap or /bin/bwrap" });
    expect(await prepareLinuxTaskSandboxV1("/home", deps())).toMatchObject({ refused: expect.stringMatching(/may not be or contain/u) });
    expect(await prepareLinuxTaskSandboxV1(REPO, deps({ execPath: "/home/u/bin/node" }))).toMatchObject({ refused: expect.stringMatching(/Node install folder/u) });
  });

  it("refuses a worktree's .git file, a linked .git, and a repository with submodules", async () => {
    expect(await prepareLinuxTaskSandboxV1(REPO, deps({ host: fakeHost(["/usr/bin/bwrap", `${REPO}/.git`]) }))).toMatchObject({ refused: expect.stringMatching(/not a real folder/u) });
    expect(await prepareLinuxTaskSandboxV1(REPO, deps({ host: fakeHost(present, { [`${REPO}/.git`]: "/elsewhere" }) }))).toMatchObject({ refused: expect.stringMatching(/not a real folder/u) });
    expect(await prepareLinuxTaskSandboxV1(REPO, deps({ host: fakeHost(present, {}, { [`${REPO}/.git`]: "/elsewhere/.git" }) }))).toMatchObject({ refused: expect.stringMatching(/not a real folder/u) });
    expect(await prepareLinuxTaskSandboxV1(REPO, deps({ host: fakeHost([...present, `${REPO}/.gitmodules`]) }))).toMatchObject({ refused: expect.stringMatching(/submodules/u) });
  });

  it("refuses unless the self-test, run in the real task configuration, reports every expected denial", async () => {
    expect(await prepareLinuxTaskSandboxV1(REPO, deps({ exec: async () => "" }))).toMatchObject({ refused: expect.stringMatching(/did not start/u) });
    for (const key of Object.keys(LINUX_SELF_TEST_EXPECTED)) {
      const broken = { ...LINUX_SELF_TEST_EXPECTED, [key]: "allowed-instead" };
      expect(await prepareLinuxTaskSandboxV1(REPO, deps({ exec: async () => JSON.stringify(broken) })), key).toMatchObject({ refused: expect.stringMatching(/self-test did not hold/u) });
    }
  });

  it("runs the self-test through the task command line, with a real result folder and a host loopback port", async () => {
    const calls: { file: string; argv: readonly string[] }[] = [];
    let closed = false;
    await prepareLinuxTaskSandboxV1(REPO, deps({
      exec: async (file, argv) => { calls.push({ file, argv }); return JSON.stringify(LINUX_SELF_TEST_EXPECTED); },
      loopbackPort: async () => ({ port: 4242, close: () => { closed = true; } }),
    }));
    expect(calls).toHaveLength(1);
    expect(calls[0]!.file).toBe("/usr/bin/bwrap");
    expect(calls[0]!.argv).toContain("--unshare-net");
    expect(calls[0]!.argv).toContain("/tmp/selftest/repo/.ascout/runs/selftest/raw/test");
    expect(calls[0]!.argv.join(" ")).toContain("4242");
    expect(closed).toBe(true);
  });

  it("refuses when a path can't be resolved, instead of throwing", async () => {
    const host = { ...fakeHost(["/usr/bin/bwrap"]), realpath: () => { throw new Error("ENOENT: no such file"); } };
    expect(await prepareLinuxTaskSandboxV1(REPO, deps({ host }))).toEqual({ refused: "ENOENT: no such file" });
  });

  it("wraps a command through bubblewrap, with the result folders it is given", async () => {
    const made = await prepareLinuxTaskSandboxV1(REPO, deps());
    if (!("sandbox" in made)) throw new Error(made.refused);
    expect(made.sandbox.mechanism).toBe("linux-bubblewrap");
    const wrapped = made.sandbox.wrap("/usr/bin/python3", ["-m", "pytest"], REPO, [RESULTS]);
    expect(wrapped.file).toBe("/usr/bin/bwrap");
    expect(wrapped.argv).toContain(`${REPO}/.git`);
    expect(wrapped.argv).toContain(RESULTS);
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
    mkdirSync(join(ws, ".ascout", "runs", "r1", "raw", "test"), { recursive: true });
    writeFileSync(join(ws, ".ascout", "earlier-evidence"), "evidence");
    writeFileSync(join(ws, ".git", "config"), "[core]\n");
    writeFileSync(join(ws, ".git", "HEAD"), "ref: refs/heads/main\n");
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
    const { file, argv } = sandbox === null ? { file: node, argv: ["-e", script] } : sandbox.wrap(node, ["-e", script], cwd, [join(cwd.split("/ws")[0]!, "ws", ".ascout", "runs", "r1", "raw", "test")]);
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

  it("sees no earlier evidence in .ascout, but can write this run's result folder", async (ctx) => {
    const t = await setUp();
    if (t === null) return ctx.skip();
    try {
      expect(await run(t.sandbox, t.ws, attempt(`require("fs").readFileSync(".ascout/earlier-evidence"); r = "read"`))).toBe("ENOENT");
      expect(await run(t.sandbox, t.ws, attempt(`require("fs").writeFileSync(".ascout/planted", "x")`))).toBe("allowed");
      // The write landed on the sandbox's own empty .ascout, never the host's.
      expect(existsSync(join(t.ws, ".ascout", "planted"))).toBe(false);
      expect(await run(t.sandbox, t.ws, attempt(`require("fs").writeFileSync(".ascout/runs/r1/raw/test/results.json", "{}")`))).toBe("allowed");
      expect(readFileSync(join(t.ws, ".ascout", "runs", "r1", "raw", "test", "results.json"), "utf8")).toBe("{}");
      expect(await run(null, t.ws, attempt(`require("fs").readFileSync(".ascout/earlier-evidence"); r = "read"`))).toBe("read");
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
      const late = (marker: string) => `require("child_process").spawn(process.execPath, ["-e", "setTimeout(() => require('fs').writeFileSync('${marker}', 'x'), 1500)"], { detached: true, stdio: "ignore" }).unref(); process.stdout.write("started")`;
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
