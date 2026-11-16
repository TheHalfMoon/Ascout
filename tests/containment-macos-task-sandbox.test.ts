import { execFile, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { LinuxFsHostV1 } from "../src/assurance/containment/linux-fs-sandbox.js";
import { SANDBOX_EXEC } from "../src/assurance/containment/macos-fs-sandbox.js";
import { MACOS_SELF_TEST_EXPECTED, macosNodeReadsV1, macosTaskSandboxArgvV1, macosTaskSandboxProfileV1, prepareMacosTaskSandboxV1, type MacosTaskSandboxDepsV1, type MacosTaskSandboxV1 } from "../src/assurance/containment/macos-task-sandbox.js";

// FD-4 T1 on macOS: the sandbox-exec profile for `check` tasks. The native tests pair each denial with
// a control that shows the same probe detects the capability without the sandbox.

const REPO = "/Users/u/src/repo";
const RESULTS = `${REPO}/.ascout/runs/r1/raw/test`;
const PLAN = { workspace: REPO, privateDir: "/private/var/folders/xy/T/ascout-1", home: "/Users/u", nodeReads: ["/opt/homebrew/Cellar/node/22/bin/node", "/opt/homebrew/Cellar/node/22/lib/node_modules/npm"], gitDir: `${REPO}/.git` };

describe("the macOS task profile", () => {
  const lines = macosTaskSandboxProfileV1(PLAN, [RESULTS]).trim().split("\n");

  it("denies launchd jobs, hard links and clones, other processes' details, and devices but the few tools need", () => {
    for (const rule of ["(deny job-creation)", "(deny mach-register)", "(deny mach-priv*)", "(deny file-link)", "(deny file-clone)", "(deny process-info*)", "(allow process-info* (target self))", '(deny sysctl-read (sysctl-name-prefix "kern.procargs"))', '(deny file-read-data file-write* (subpath "/dev"))']) expect(lines, rule).toContain(rule);
    const devices = lines.find((line) => line.startsWith("(allow file-read-data file-write-data (literal \"/dev/null\")"))!;
    expect(lines.indexOf(devices)).toBeGreaterThan(lines.indexOf('(deny file-read-data file-write* (subpath "/dev"))'));
    expect(devices).not.toContain("ttys");
  });

  it("denies data reads, writes, services, network, and outside signals, then opens the repository, the private folder, and Node's entry points", () => {
    expect(lines.slice(0, 2)).toEqual(["(version 1)", "(allow default)"]);
    expect(lines).toContain("(deny network*)");
    expect(lines).toContain("(deny mach-lookup)");
    expect(lines.filter((line) => line.includes("signal"))).toEqual(["(deny signal)", "(allow signal (target self))", "(allow signal (target children))"]);
    expect(lines.indexOf(`(allow file-read-data file-write* (subpath "${REPO}") (subpath "/private/var/folders/xy/T/ascout-1"))`)).toBeGreaterThan(lines.indexOf("(deny file-write*)"));
    expect(lines).toContain('(allow file-read-data (subpath "/opt/homebrew/Cellar/node/22/bin/node") (subpath "/opt/homebrew/Cellar/node/22/lib/node_modules/npm"))');
  });

  it("keeps .git read-only and .ascout closed but this run's result folders, each after the repository allow", () => {
    const repoAllow = lines.findIndex((line) => line.startsWith("(allow file-read-data file-write*"));
    const git = lines.indexOf(`(deny file-write* (subpath "${REPO}/.git"))`);
    const evidence = lines.indexOf(`(deny file-read-data file-write* (subpath "${REPO}/.ascout"))`);
    const results = lines.indexOf(`(allow file-read-data file-write* (subpath "${RESULTS}"))`);
    expect(git).toBeGreaterThan(repoAllow);
    expect(evidence).toBeGreaterThan(repoAllow);
    expect(results).toBeGreaterThan(evidence);
  });

  it("has no .git rule without a .git folder or a results rule without result folders, and refuses unsafe input", () => {
    const bare = macosTaskSandboxProfileV1({ ...PLAN, gitDir: null });
    // Without a .git folder, creating one is still denied.
    expect(bare).toContain(`(deny file-write* (subpath "${REPO}/.git"))`);
    expect(bare).not.toContain(".ascout/runs");
    expect(() => macosTaskSandboxProfileV1({ ...PLAN, workspace: "/Users" })).toThrow();
    expect(() => macosTaskSandboxProfileV1({ ...PLAN, privateDir: '/tmp/a"b' })).toThrow(/private folder/u);
    expect(() => macosTaskSandboxProfileV1({ ...PLAN, nodeReads: ["relative"] })).toThrow(/Node entry point/u);
    for (const dir of [`${REPO}/src`, `${REPO}/.ascout`, `${REPO}/.ascout/../src`]) expect(() => macosTaskSandboxProfileV1(PLAN, [dir])).toThrow(/inside \.ascout/u);
  });

  it("runs the command through /usr/bin/env with HOME and TMPDIR set to the private folder, and refuses a PATH command or an outside folder", () => {
    const argv = macosTaskSandboxArgvV1(PLAN, "/opt/homebrew/bin/npx", ["vitest"], `${REPO}/pkg`, [RESULTS]);
    expect(argv[0]).toBe("-p");
    expect(argv[1]).toContain(RESULTS);
    expect(argv.slice(2)).toEqual(["/usr/bin/env", "HOME=/private/var/folders/xy/T/ascout-1", "TMPDIR=/private/var/folders/xy/T/ascout-1/", "/opt/homebrew/bin/npx", "vitest"]);
    expect(() => macosTaskSandboxArgvV1(PLAN, "npx", [], REPO)).toThrow(/absolute path/u);
    expect(() => macosTaskSandboxArgvV1(PLAN, "/usr/bin/true", [], "/Users/u/src/repository")).toThrow(/inside the repository/u);
  });
});

describe("Node's entry points on macOS", () => {
  const host = (present: readonly string[], realpaths: Record<string, string> = {}): LinuxFsHostV1 => ({ exists: (path) => present.includes(path), symlinkTarget: () => null, realpath: (path) => realpaths[path] ?? path, home: () => "/Users/u", makeTempDir: () => "/t", makeDir: () => undefined, writeFile: () => undefined, removeDir: () => undefined });

  it("are the binary and the package managers that exist, resolved, and never a folder that holds the home folder", () => {
    expect(macosNodeReadsV1("/opt/homebrew/Cellar/node/22/bin/node", host(["/opt/homebrew/Cellar/node/22/bin/npx", "/opt/homebrew/Cellar/node/22/lib/node_modules/npm"], { "/opt/homebrew/Cellar/node/22/bin/npx": "/opt/homebrew/Cellar/node/22/lib/node_modules/npm/bin/npx-cli.js" }))).toEqual([
      "/opt/homebrew/Cellar/node/22/bin/node",
      "/opt/homebrew/Cellar/node/22/lib/node_modules/npm/bin/npx-cli.js",
      "/opt/homebrew/Cellar/node/22/lib/node_modules/npm",
    ]);
    expect(() => macosNodeReadsV1("/Users/u/bin/node", host([]))).toThrow(/expose the home folder/u);
    expect(() => macosNodeReadsV1("node", host([]))).toThrow(/absolute/u);
  });
});

describe("preparing the macOS task sandbox", () => {
  const removed: string[] = [];
  const present = [SANDBOX_EXEC, `${REPO}/.git`, `${REPO}/.git/HEAD`];
  const host = (files: readonly string[], links: Record<string, string> = {}, home = "/Users/u"): LinuxFsHostV1 => ({
    exists: (path) => files.includes(path),
    symlinkTarget: (path) => links[path] ?? null,
    realpath: (path) => path,
    home: () => home,
    makeTempDir: () => "/private/var/folders/xy/T/ascout-1",
    makeDir: () => undefined,
    writeFile: () => undefined,
    removeDir: (path) => removed.push(path),
  });
  // What the task itself reports; launchdJob is judged from outside, by the host.
  const { launchdJob: _judgedOutside, ...reported } = MACOS_SELF_TEST_EXPECTED;
  const deps = (overrides: Partial<MacosTaskSandboxDepsV1> = {}): MacosTaskSandboxDepsV1 => ({
    platform: "darwin",
    host: host(present),
    exec: async () => "",
    execBoth: async (file) => ({ stdout: file === "/bin/ps" ? "PID ... ASCOUT_SELFTEST_CANARY_ABC=visible" : JSON.stringify(reported), stderr: "" }),
    spawnCanaryHolder: () => ({ pid: 777, close: () => undefined }),
    execPath: "/opt/homebrew/Cellar/node/22/bin/node",
    loopbackPort: async () => ({ port: 4242, close: () => undefined }),
    randomName: () => "abc",
    launchdWaitMs: 0,
    ...overrides,
  });

  it("refuses off macOS, without sandbox-exec, for a refused workspace, and for a Node folder that would expose the home folder", async () => {
    expect(await prepareMacosTaskSandboxV1(REPO, deps({ platform: "linux" }))).toEqual({ refused: "the sandbox-exec task sandbox is macOS only" });
    expect(await prepareMacosTaskSandboxV1(REPO, deps({ host: host([]) }))).toEqual({ refused: `sandbox-exec is not installed at ${SANDBOX_EXEC}` });
    expect(await prepareMacosTaskSandboxV1("/Users", deps())).toMatchObject({ refused: expect.any(String) });
    expect(await prepareMacosTaskSandboxV1(REPO, deps({ execPath: "/Users/u/bin/node" }))).toMatchObject({ refused: expect.stringMatching(/expose the home folder/u) });
  });

  it("refuses a repository without .git, and a Node install inside the repository", async () => {
    expect(await prepareMacosTaskSandboxV1(REPO, deps({ host: host([SANDBOX_EXEC]) }))).toMatchObject({ refused: expect.stringMatching(/no \.git folder/u) });
    expect(await prepareMacosTaskSandboxV1(REPO, deps({ execPath: `${REPO}/tools/node/bin/node` }))).toMatchObject({ refused: expect.stringMatching(/Node install folder is inside the repository/u) });
  });

  it("refuses a worktree's .git file, a linked .git, and submodules", async () => {
    expect(await prepareMacosTaskSandboxV1(REPO, deps({ host: host([SANDBOX_EXEC, `${REPO}/.git`]) }))).toMatchObject({ refused: expect.stringMatching(/not a real folder/u) });
    expect(await prepareMacosTaskSandboxV1(REPO, deps({ host: host(present, { [`${REPO}/.git`]: "/x" }) }))).toMatchObject({ refused: expect.stringMatching(/not a real folder/u) });
    expect(await prepareMacosTaskSandboxV1(REPO, deps({ host: host([...present, `${REPO}/.gitmodules`]) }))).toMatchObject({ refused: expect.stringMatching(/submodules/u) });
  });

  it("refuses unless the self-test, run in the real task configuration, reports every expected denial, and removes the private folder then", async () => {
    const control = "ASCOUT_SELFTEST_CANARY_ABC=visible";
    expect(await prepareMacosTaskSandboxV1(REPO, deps({ execBoth: async (file) => (file === "/bin/ps" ? { stdout: control, stderr: "" } : { stdout: "", stderr: "sandbox-exec: unbound variable" }) }))).toEqual({ refused: "the sandbox-exec task sandbox did not start (sandbox-exec: unbound variable)" });
    expect(await prepareMacosTaskSandboxV1(REPO, deps({ execBoth: async (file) => (file === "/bin/ps" ? { stdout: control, stderr: "" } : { stdout: "", stderr: "" }) }))).toEqual({ refused: "the sandbox-exec task sandbox did not start" });
    // Without a control that can see the canary, "hidden" would prove nothing.
    expect(await prepareMacosTaskSandboxV1(REPO, deps({ execBoth: async (file) => ({ stdout: file === "/bin/ps" ? "" : JSON.stringify(reported), stderr: "" }) }))).toMatchObject({ refused: expect.stringMatching(/control could not read another process's environment/u) });
    expect(await prepareMacosTaskSandboxV1(REPO, deps({ loopbackPort: async () => null }))).toMatchObject({ refused: expect.stringMatching(/could not bind a host loopback port/u) });
    for (const key of Object.keys(reported)) {
      removed.length = 0;
      const broken = { ...reported, [key]: "something-else" };
      expect(await prepareMacosTaskSandboxV1(REPO, deps({ execBoth: async (file) => ({ stdout: file === "/bin/ps" ? "ASCOUT_SELFTEST_CANARY_ABC" : JSON.stringify(broken), stderr: "" }) })), key).toMatchObject({ refused: expect.stringMatching(/self-test did not hold/u) });
      expect(removed).toContain("/private/var/folders/xy/T/ascout-1");
    }
  });

  it("runs the self-test through sandbox-exec with a real result folder and a host loopback port", async () => {
    const calls: (readonly string[])[] = [];
    let closed = false;
    let holderClosed = false;
    await prepareMacosTaskSandboxV1(REPO, deps({ execBoth: async (file, argv) => { if (file === "/bin/ps") return { stdout: "ASCOUT_SELFTEST_CANARY_ABC", stderr: "" }; calls.push(argv); return { stdout: JSON.stringify(reported), stderr: "" }; }, loopbackPort: async () => ({ port: 4242, close: () => { closed = true; } }), spawnCanaryHolder: () => ({ pid: 777, close: () => { holderClosed = true; } }) }));
    expect(holderClosed).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.join(" ")).toContain('"-p", "777"');
    expect(calls[0]![1]).toContain("/private/var/folders/xy/T/ascout-1/repo/.ascout/runs/selftest/raw/test");
    expect(calls[0]!.join(" ")).toContain("4242");
    expect(closed).toBe(true);
  });

  it("refuses when launchd ran the job the task submitted, judged by its marker outside the sandbox, and removes that job", async () => {
    const calls: (readonly string[])[] = [];
    const escaped = host([...present, "/private/var/folders/xy/T/ascout-1/launchd-job-ran"]);
    expect(await prepareMacosTaskSandboxV1(REPO, deps({ host: escaped, execBoth: async (file, argv) => { calls.push([file, ...argv]); return { stdout: file === "/bin/ps" ? "ASCOUT_SELFTEST_CANARY_ABC" : JSON.stringify(reported), stderr: "" }; } }))).toMatchObject({ refused: expect.stringMatching(/"launchdJob":"ran"/u) });
    expect(calls.at(-1)).toEqual(["/bin/launchctl", "remove", "ascout.selftest.abc"]);
  });

  it("refuses when a path can't be resolved, instead of throwing", async () => {
    const base = host(present);
    expect(await prepareMacosTaskSandboxV1(REPO, deps({ host: { ...base, realpath: () => { throw new Error("ENOENT"); } } }))).toEqual({ refused: "ENOENT" });
  });

  it("wraps a command through sandbox-exec with the result folders it is given, and removes the private folder on dispose", async () => {
    const made = await prepareMacosTaskSandboxV1(REPO, deps());
    if (!("sandbox" in made)) throw new Error(made.refused);
    const wrapped = made.sandbox.wrap("/usr/bin/true", [], REPO, [RESULTS]);
    expect(wrapped.file).toBe(SANDBOX_EXEC);
    expect(wrapped.argv[1]).toContain(`(deny file-write* (subpath "${REPO}/.git"))`);
    expect(wrapped.argv[1]).toContain(RESULTS);
    removed.length = 0;
    made.sandbox.dispose();
    expect(removed).toEqual(["/private/var/folders/xy/T/ascout-1"]);
  });
});

// Native evidence. CI sets ASCOUT_REQUIRE_MACOS_SANDBOX=1 on macOS.
describe.runIf(process.platform === "darwin")("native: a check task inside the macOS task sandbox", () => {
  const node = realpathSync(process.execPath);

  async function setUp(): Promise<{ root: string; ws: string; outside: string; sandbox: MacosTaskSandboxV1 } | null> {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "ascout-t1-macos-")));
    const ws = join(root, "ws");
    mkdirSync(join(ws, ".git"), { recursive: true });
    writeFileSync(join(ws, ".git", "config"), "[core]\n");
    writeFileSync(join(ws, ".git", "HEAD"), "ref: refs/heads/main\n");
    mkdirSync(join(ws, ".ascout", "runs", "r1", "raw", "test"), { recursive: true });
    writeFileSync(join(ws, ".ascout", "earlier-evidence"), "evidence");
    const outside = join(root, "outside.txt");
    writeFileSync(outside, "host secret");
    const made = await prepareMacosTaskSandboxV1(ws);
    if ("refused" in made) {
      rmSync(root, { recursive: true, force: true });
      if (process.env.ASCOUT_REQUIRE_MACOS_SANDBOX === "1") throw new Error(`the task sandbox is required here but refused: ${made.refused}`);
      return null;
    }
    return { root, ws, outside, sandbox: made.sandbox };
  }

  function run(sandbox: MacosTaskSandboxV1 | null, cwd: string, script: string, env: NodeJS.ProcessEnv = { PATH: "/usr/bin:/bin" }): Promise<string> {
    const { file, argv } = sandbox === null ? { file: node, argv: ["-e", script] } : sandbox.wrap(node, ["-e", script], cwd, [join(cwd, ".ascout", "runs", "r1", "raw", "test")]);
    return new Promise((resolve) => execFile(file, [...argv], { cwd, env, encoding: "utf8", timeout: 20_000 }, (_error, stdout) => resolve(stdout)));
  }

  const attempt = (body: string) => `let r = "allowed"; try { ${body} } catch (e) { r = e.code || String(e); } process.stdout.write(r)`;
  const done = (t: { root: string; sandbox: MacosTaskSandboxV1 }) => {
    t.sandbox.dispose();
    rmSync(t.root, { recursive: true, force: true });
  };

  it("writes inside the repository and its private folder, but not into .git", async (ctx) => {
    const t = await setUp();
    if (t === null) return ctx.skip();
    try {
      expect(await run(t.sandbox, t.ws, attempt(`require("fs").writeFileSync("out.txt", "ok")`))).toBe("allowed");
      expect(await run(t.sandbox, t.ws, attempt(`require("fs").writeFileSync(require("path").join(process.env.TMPDIR, "t"), "ok")`))).toBe("allowed");
      expect(await run(t.sandbox, t.ws, attempt(`require("fs").appendFileSync(".git/config", "[core]\\n\\tfsmonitor = evil\\n")`))).toBe("EPERM");
      expect(readFileSync(join(t.ws, ".git", "config"), "utf8")).toBe("[core]\n");
    } finally {
      done(t);
    }
  }, 60_000);

  it("can't read earlier evidence in .ascout, but can write this run's result folder", async (ctx) => {
    const t = await setUp();
    if (t === null) return ctx.skip();
    try {
      expect(await run(t.sandbox, t.ws, attempt(`require("fs").readFileSync(".ascout/earlier-evidence"); r = "read"`))).toBe("EPERM");
      expect(await run(t.sandbox, t.ws, attempt(`require("fs").writeFileSync(".ascout/planted", "x")`))).toBe("EPERM");
      expect(await run(t.sandbox, t.ws, attempt(`require("fs").writeFileSync(".ascout/runs/r1/raw/test/results.json", "{}")`))).toBe("allowed");
      expect(readFileSync(join(t.ws, ".ascout", "runs", "r1", "raw", "test", "results.json"), "utf8")).toBe("{}");
      expect(await run(null, t.ws, attempt(`require("fs").readFileSync(".ascout/earlier-evidence"); r = "read"`))).toBe("read");
    } finally {
      done(t);
    }
  }, 60_000);

  it("can't read a host data file outside the repository directly, through a symlink, or through ..", async (ctx) => {
    const t = await setUp();
    if (t === null) return ctx.skip();
    try {
      symlinkSync(t.outside, join(t.ws, "link"));
      const read = (path: string) => attempt(`require("fs").readFileSync(${JSON.stringify(path)}, "utf8"); r = "read"`);
      for (const path of [t.outside, join(t.ws, "link"), `${t.ws}/../outside.txt`]) {
        expect(await run(t.sandbox, t.ws, read(path)), path).toBe("EPERM");
        expect(await run(null, t.ws, read(path)), path).toBe("read");
      }
    } finally {
      done(t);
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
      done(t);
    }
  }, 60_000);

  it("can't signal a process outside the sandbox, but can stop its own child, as test runners must", async (ctx) => {
    const t = await setUp();
    if (t === null) return ctx.skip();
    const target = spawn("/bin/sleep", ["60"], { stdio: "ignore" });
    try {
      const outsideKill = attempt(`process.kill(${target.pid}, "SIGTERM"); r = "signalled"`);
      const childKill = `const c = require("child_process").spawn("/bin/sleep", ["60"]); let r = "signalled"; try { process.kill(c.pid, "SIGTERM"); } catch (e) { r = e.code; } c.on("exit", (code, sig) => { process.stdout.write(r + ":" + sig); process.exit(0); }); setTimeout(() => { process.stdout.write(r + ":timeout"); c.kill("SIGKILL"); process.exit(0); }, 5000);`;
      expect(await run(t.sandbox, t.ws, outsideKill)).toBe("EPERM");
      expect(target.exitCode).toBeNull();
      expect(await run(t.sandbox, t.ws, childKill)).toBe("signalled:SIGTERM");
      // Control: outside the sandbox the same kill reaches the outside process.
      expect(await run(null, t.ws, outsideKill)).toBe("signalled");
    } finally {
      target.kill("SIGKILL");
      done(t);
    }
  }, 60_000);

  it("sees no variable it wasn't given and gets the private folder as HOME and TMPDIR", async (ctx) => {
    const t = await setUp();
    if (t === null) return ctx.skip();
    process.env.ASCOUT_T1_CANARY = "host-only";
    try {
      const probe = `process.stdout.write(JSON.stringify({ canary: process.env.ASCOUT_T1_CANARY ?? null, home: process.env.HOME, tmp: process.env.TMPDIR }))`;
      const inside = JSON.parse(await run(t.sandbox, t.ws, probe)) as { canary: string | null; home: string; tmp: string };
      expect(inside.canary).toBeNull();
      expect(inside.home).not.toBe(process.env.HOME);
      expect(inside.tmp).toBe(`${inside.home}/`);
      expect(existsSync(inside.home)).toBe(true);
      expect(JSON.parse(await run(null, t.ws, probe, { ...process.env })).canary).toBe("host-only");
    } finally {
      delete process.env.ASCOUT_T1_CANARY;
      done(t);
    }
  }, 60_000);

  it.runIf(process.env.ASCOUT_REQUIRE_MACOS_SANDBOX === "1")("control (CI only): without the sandbox, launchd does run a submitted job, so the self-test's refusal means something", async () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), "ascout-launchd-control-")));
    const label = `ascout.control.${process.pid}`;
    const marker = join(dir, "ran");
    try {
      spawnSync("/bin/launchctl", ["submit", "-l", label, "--", "/usr/bin/touch", marker]);
      for (let i = 0; i < 20 && !existsSync(marker); i += 1) await new Promise((resolve) => setTimeout(resolve, 250));
      expect(existsSync(marker)).toBe(true);
    } finally {
      spawnSync("/bin/launchctl", ["remove", label]);
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it("runs git read-only: a task can inspect the repository but not change its configuration", async (ctx) => {
    const t = await setUp();
    if (t === null) return ctx.skip();
    try {
      rmSync(join(t.ws, ".git"), { recursive: true, force: true });
      expect(spawnSync("git", ["init", "-q"], { cwd: t.ws }).status).toBe(0);
      t.sandbox.dispose();
      const made = await prepareMacosTaskSandboxV1(t.ws);
      if ("refused" in made) throw new Error(made.refused);
      t.sandbox = made.sandbox;
      const git = spawnSync("/usr/bin/which", ["git"], { encoding: "utf8" }).stdout.trim();
      const status = (args: string[]) => attempt(`const out = require("child_process").spawnSync(${JSON.stringify(git)}, ${JSON.stringify(args)}, { encoding: "utf8" }); r = out.status === 0 ? "ok" : "failed"`);
      expect(await run(t.sandbox, t.ws, status(["rev-parse", "--git-dir"]), { PATH: "/usr/bin:/bin:/opt/homebrew/bin" })).toBe("ok");
      expect(await run(t.sandbox, t.ws, status(["config", "core.fsmonitor", "evil"]), { PATH: "/usr/bin:/bin:/opt/homebrew/bin" })).toBe("failed");
      expect(spawnSync("git", ["config", "--get", "core.fsmonitor"], { cwd: t.ws }).status).not.toBe(0);
    } finally {
      done(t);
    }
  }, 60_000);
});
