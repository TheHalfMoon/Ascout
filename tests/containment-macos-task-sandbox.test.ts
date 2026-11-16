import { execFile, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { LinuxFsHostV1 } from "../src/assurance/containment/linux-fs-sandbox.js";
import { SANDBOX_EXEC } from "../src/assurance/containment/macos-fs-sandbox.js";
import { macosTaskSandboxArgvV1, macosTaskSandboxProfileV1, prepareMacosTaskSandboxV1, type MacosTaskSandboxDepsV1, type MacosTaskSandboxV1 } from "../src/assurance/containment/macos-task-sandbox.js";

// FD-4 T1 on macOS: the sandbox-exec profile for `check` tasks. The native tests pair each denial with
// a control that shows the same probe detects the capability without the sandbox.

const PLAN = { workspace: "/Users/u/src/repo", privateDir: "/private/var/folders/xy/T/ascout-1", home: "/Users/u", nodePrefix: "/opt/homebrew/Cellar/node/22", gitDir: "/Users/u/src/repo/.git" };

describe("the macOS task profile", () => {
  it("denies data reads, writes, services, network, and outside signals, then opens only the repository, the private folder, and Node; .git stays read-only", () => {
    const lines = macosTaskSandboxProfileV1(PLAN).trim().split("\n");
    expect(lines.slice(0, 2)).toEqual(["(version 1)", "(allow default)"]);
    expect(lines).toContain("(deny network*)");
    expect(lines).toContain("(deny mach-lookup)");
    expect(lines.filter((line) => line.includes("signal"))).toEqual(["(deny signal)", "(allow signal (target self))", "(allow signal (target children))"]);
    const open = lines.indexOf('(allow file-read-data file-write* (subpath "/Users/u/src/repo") (subpath "/private/var/folders/xy/T/ascout-1"))');
    expect(open).toBeGreaterThan(lines.indexOf("(deny file-write*)"));
    // Later rules win: the .git deny must come after the repository allow.
    expect(lines.at(-1)).toBe('(deny file-write* (subpath "/Users/u/src/repo/.git"))');
    expect(lines).toContain('(allow file-read-data (subpath "/opt/homebrew/Cellar/node/22"))');
  });

  it("has no .git rule when there is no .git folder, and refuses a refused workspace or an unsafe path", () => {
    expect(macosTaskSandboxProfileV1({ ...PLAN, gitDir: null })).not.toContain(".git");
    expect(() => macosTaskSandboxProfileV1({ ...PLAN, workspace: "/Users" })).toThrow();
    expect(() => macosTaskSandboxProfileV1({ ...PLAN, privateDir: '/tmp/a"b' })).toThrow(/private folder/u);
    expect(() => macosTaskSandboxProfileV1({ ...PLAN, nodePrefix: "relative" })).toThrow(/Node install folder/u);
  });

  it("runs the command through /usr/bin/env with HOME and TMPDIR set to the private folder, and refuses a PATH command or an outside folder", () => {
    const argv = macosTaskSandboxArgvV1(PLAN, "/opt/homebrew/bin/npx", ["vitest"], "/Users/u/src/repo/pkg");
    expect(argv[0]).toBe("-p");
    expect(argv.slice(2)).toEqual(["/usr/bin/env", "HOME=/private/var/folders/xy/T/ascout-1", "TMPDIR=/private/var/folders/xy/T/ascout-1/", "/opt/homebrew/bin/npx", "vitest"]);
    expect(() => macosTaskSandboxArgvV1(PLAN, "npx", [], PLAN.workspace)).toThrow(/absolute path/u);
    expect(() => macosTaskSandboxArgvV1(PLAN, "/usr/bin/true", [], "/Users/u/src/repository")).toThrow(/inside the repository/u);
  });
});

describe("preparing the macOS task sandbox", () => {
  const removed: string[] = [];
  const host = (present: readonly string[], links: Record<string, string> = {}, home = "/Users/u"): LinuxFsHostV1 => ({
    exists: (path) => present.includes(path),
    symlinkTarget: (path) => links[path] ?? null,
    realpath: (path) => path,
    home: () => home,
    makeTempDir: () => "/private/var/folders/xy/T/ascout-1",
    makeDir: () => undefined,
    writeFile: () => undefined,
    removeDir: (path) => removed.push(path),
  });
  const deps = (overrides: Partial<MacosTaskSandboxDepsV1> = {}): MacosTaskSandboxDepsV1 => ({ platform: "darwin", host: host([SANDBOX_EXEC, "/Users/u/src/repo/.git"]), exec: async () => "sandbox-ok", execPath: "/opt/homebrew/Cellar/node/22/bin/node", ...overrides });

  it("refuses off macOS, without sandbox-exec, when the self-test fails, for a refused workspace, and for a Node folder that would expose the home folder", async () => {
    expect(await prepareMacosTaskSandboxV1("/Users/u/src/repo", deps({ platform: "linux" }))).toEqual({ refused: "the sandbox-exec task sandbox is macOS only" });
    expect(await prepareMacosTaskSandboxV1("/Users/u/src/repo", deps({ host: host([]) }))).toEqual({ refused: `sandbox-exec is not installed at ${SANDBOX_EXEC}` });
    expect(await prepareMacosTaskSandboxV1("/Users/u/src/repo", deps({ exec: async () => "" }))).toMatchObject({ refused: expect.stringMatching(/did not start/u) });
    expect(await prepareMacosTaskSandboxV1("/Users", deps())).toMatchObject({ refused: expect.any(String) });
    removed.length = 0;
    expect(await prepareMacosTaskSandboxV1("/Users/u/src/repo", deps({ execPath: "/Users/u/bin/node" }))).toMatchObject({ refused: expect.stringMatching(/expose the home folder/u) });
    // The self-test removes its own folder first; the private folder is removed after the refusal.
    expect(removed.at(-1)).toBe("/private/var/folders/xy/T/ascout-1");
  });

  it("wraps a command through sandbox-exec, protects .git only when it is a real folder, and removes the private folder on dispose", async () => {
    const made = await prepareMacosTaskSandboxV1("/Users/u/src/repo", deps());
    if (!("sandbox" in made)) throw new Error(made.refused);
    const wrapped = made.sandbox.wrap("/usr/bin/true", [], "/Users/u/src/repo");
    expect(wrapped.file).toBe(SANDBOX_EXEC);
    expect(wrapped.argv[1]).toContain('(deny file-write* (subpath "/Users/u/src/repo/.git"))');
    removed.length = 0;
    made.sandbox.dispose();
    expect(removed).toEqual(["/private/var/folders/xy/T/ascout-1"]);
    const linked = await prepareMacosTaskSandboxV1("/Users/u/src/repo", deps({ host: host([SANDBOX_EXEC, "/Users/u/src/repo/.git"], { "/Users/u/src/repo/.git": "/x" }) }));
    if (!("sandbox" in linked)) throw new Error(linked.refused);
    expect(linked.sandbox.wrap("/usr/bin/true", [], "/Users/u/src/repo").argv[1]).not.toContain(".git");
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
    const { file, argv } = sandbox === null ? { file: node, argv: ["-e", script] } : sandbox.wrap(node, ["-e", script], cwd);
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
      expect(await run(null, t.ws, outsideKill)).toBe("allowed");
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
