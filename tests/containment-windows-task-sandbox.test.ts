import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, win32 } from "node:path";

import { describe, expect, it } from "vitest";

import { WINDOWS_SELF_TEST_EXPECTED, prepareWindowsTaskSandboxV1, quoteWindowsArgV1, windowsCommandLineV1, type WindowsTaskSandboxDepsV1, type WindowsTaskSandboxV1 } from "../src/assurance/containment/windows-task-sandbox.js";

// FD-4 T1 on Windows: an AppContainer for `check` tasks. The native tests run only where CI requires
// the Windows sandbox (ASCOUT_REQUIRE_WINDOWS_SANDBOX=1): they create containers and change access
// lists on disposable folders, which must not happen on a developer's own machine.

describe("Windows command lines", () => {
  it("quote each argument so it reads back unchanged", () => {
    expect(quoteWindowsArgV1("plain")).toBe("plain");
    expect(quoteWindowsArgV1("")).toBe('""');
    expect(quoteWindowsArgV1("a b")).toBe('"a b"');
    expect(quoteWindowsArgV1('say "hi"')).toBe('"say \\"hi\\""');
    expect(quoteWindowsArgV1("C:\\dir with space\\")).toBe('"C:\\dir with space\\\\"');
    expect(quoteWindowsArgV1('a\\"b')).toBe('"a\\\\\\"b"');
  });

  it.runIf(process.platform === "win32")("round-trip through a real Windows process", () => {
    const args = ["plain", "", "a b", 'say "hi"', "C:\\dir with space\\", 'a\\"b', "tab\there", "back\\\\slash"];
    const line = [process.execPath, "-e", "process.stdout.write(JSON.stringify(process.argv.slice(1)))", ...args].map(quoteWindowsArgV1).join(" ");
    const run = spawnSync(process.execPath, [], { windowsVerbatimArguments: true, argv0: line, encoding: "utf8", shell: false, ...{ } });
    // spawnSync can't take a raw command line, so check through cmd /c with verbatim arguments instead.
    const viaCmd = spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `"${line}"`], { windowsVerbatimArguments: true, encoding: "utf8" });
    expect(run.error).toBeUndefined();
    expect(JSON.parse(viaCmd.stdout)).toEqual(args);
  });

  it("run npm's and npx's shims from the Node folder as node.exe on npm's own script, and nothing else that way", () => {
    expect(windowsCommandLineV1("C:\\nodejs\\npm.cmd", ["run", "a b"], "C:\\nodejs")).toEqual({ app: "C:\\nodejs\\node.exe", commandLine: 'C:\\nodejs\\node.exe --preserve-symlinks --preserve-symlinks-main C:\\nodejs\\node_modules\\npm\\bin\\npm-cli.js run "a b"' });
    expect(windowsCommandLineV1("C:\\nodejs\\NPX.CMD", ["vitest"], "C:\\NodeJS").commandLine).toBe("C:\\NodeJS\\node.exe --preserve-symlinks --preserve-symlinks-main C:\\NodeJS\\node_modules\\npm\\bin\\npx-cli.js vitest");
    // An npm.cmd anywhere else (say, inside the repository) is not treated as npm's shim.
    expect(windowsCommandLineV1("C:\\repo\\npm.cmd", [], "C:\\nodejs").app).not.toBe("C:\\nodejs\\node.exe");
    expect(windowsCommandLineV1("C:\\nodejs\\npm.cmd", []).app).not.toBe("C:\\nodejs\\node.exe");
  });

  it("run an executable directly and a batch file through cmd.exe, and refuse a PATH command", () => {
    expect(windowsCommandLineV1("C:\\Program Files\\nodejs\\node.exe", ["-e", "x y"])).toEqual({ app: "C:\\Program Files\\nodejs\\node.exe", commandLine: '"C:\\Program Files\\nodejs\\node.exe" -e "x y"' });
    expect(() => windowsCommandLineV1("npx", [])).toThrow(/absolute path/u);
  });

  it.runIf(process.platform === "win32")("send a batch file through cmd.exe, escaped as cross-spawn escapes it", () => {
    const dir = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-wincmd-")));
    try {
      const shim = join(dir, "tool.cmd");
      writeFileSync(shim, "@echo off\r\necho %*\r\n");
      const { app, commandLine } = windowsCommandLineV1(shim, ["a b", "c"]);
      expect(win32.basename(app).toLowerCase()).toBe("cmd.exe");
      expect(commandLine).toMatch(/\/d \/s \/c /u);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("preparing the Windows task sandbox", () => {
  const removed: string[] = [];
  const made: string[] = [];
  const runs: { file: string; argv: readonly string[]; env: NodeJS.ProcessEnv }[] = [];
  const REPO = "C:\\src\\repo";
  // The probe runner's own self-test reads its output file, which the fake reports as present.
  const present = (path: string) => path.endsWith("powershell.exe") || path.endsWith("stdout.txt") || [`${REPO}\\.git`, `${REPO}\\.git\\HEAD`, "C:\\Program Files\\nodejs\\npm.cmd", "C:\\Program Files\\nodejs\\node_modules\\npm"].includes(path);
  const deps = (overrides: Partial<WindowsTaskSandboxDepsV1> = {}, opts: { setupOut?: string; selfTest?: string; exists?: (path: string) => boolean } = {}): WindowsTaskSandboxDepsV1 => ({
    platform: "win32",
    host: {
      exists: opts.exists ?? present,
      symlinkTarget: () => null,
      realpath: (path) => path,
      home: () => "C:\\Users\\u",
      makeTempDir: () => "C:\\Users\\u\\AppData\\Local\\Temp\\ascout-1",
      makeDir: (path) => made.push(path),
      writeFile: () => undefined,
      removeDir: (path) => removed.push(path),
    },
    exec: async (file, argv, options) => {
      runs.push({ file, argv, env: options.env });
      const script = argv.at(-1) ?? "";
      if (script.includes("AscoutAcSetup")) return opts.setupOut ?? "C:\\Users\\u\\AppData\\Local\\Packages\\ascout.sandbox.x\\AC";
      if (argv.includes("-File")) return opts.selfTest ?? JSON.stringify(WINDOWS_SELF_TEST_EXPECTED);
      return "";
    },
    execPath: "C:\\Program Files\\nodejs\\node.exe",
    systemRoot: "C:\\Windows",
    readText: () => "sandbox-ok",
    randomName: () => "ascout.sandbox.x",
    startupEnv: {},
    taskTimeoutMs: 1000,
    loopbackPort: async () => null,
    execBoth: async (file, argv, options) => {
      runs.push({ file, argv, env: options.env });
      return { stdout: opts.selfTest ?? JSON.stringify(WINDOWS_SELF_TEST_EXPECTED), stderr: opts.selfTest === "" ? "Add-Type failed" : "" };
    },
    ...overrides,
  });
  const cleanups = () => runs.filter((run) => (run.argv.at(-1) ?? "").includes("AscoutAcTaskCleanup"));

  it("refuses off Windows, without PowerShell, for a refused repository or Node folder", async () => {
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({ platform: "linux" }))).toEqual({ refused: "the AppContainer task sandbox is Windows only" });
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({}, { exists: () => false }))).toMatchObject({ refused: expect.stringMatching(/PowerShell/u) });
    expect(await prepareWindowsTaskSandboxV1("C:\\", deps())).toMatchObject({ refused: expect.stringMatching(/drive root/u) });
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({ execPath: "C:\\node.exe" }))).toMatchObject({ refused: expect.stringMatching(/Node install folder/u) });
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({ execPath: "C:\\Users\\node.exe" }))).toMatchObject({ refused: expect.stringMatching(/Node install folder/u) });
  });

  it("refuses a worktree's .git file and a repository with submodules", async () => {
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({}, { exists: (path) => path.endsWith("powershell.exe") || path.endsWith("stdout.txt") || path === `${REPO}\\.git` }))).toMatchObject({ refused: expect.stringMatching(/not a real folder/u) });
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({}, { exists: (path) => present(path) || path === `${REPO}\\.gitmodules` }))).toMatchObject({ refused: expect.stringMatching(/submodules/u) });
  });

  it("cleans up and refuses when setup fails or the self-test in the real container does not hold", async () => {
    runs.length = 0;
    removed.length = 0;
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({}, { setupOut: "" }))).toEqual({ refused: "the AppContainer for tasks could not be created and granted" });
    expect(cleanups()).toHaveLength(1);
    expect(removed).toContain("C:\\Users\\u\\AppData\\Local\\Temp\\ascout-1");
    for (const key of Object.keys(WINDOWS_SELF_TEST_EXPECTED)) {
      runs.length = 0;
      const broken = JSON.stringify({ ...WINDOWS_SELF_TEST_EXPECTED, [key]: "something-else" });
      expect(await prepareWindowsTaskSandboxV1(REPO, deps({}, { selfTest: broken })), key).toMatchObject({ refused: expect.stringMatching(/self-test did not hold/u) });
      expect(cleanups()).toHaveLength(1);
    }
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({}, { selfTest: "" }))).toEqual({ refused: "the AppContainer task sandbox did not start (Add-Type failed)" });
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({ execBoth: async () => ({ stdout: "", stderr: "" }) }))).toEqual({ refused: "the AppContainer task sandbox did not start" });
  });

  it("refuses when a path can't be resolved, instead of throwing", async () => {
    const base = deps();
    expect(await prepareWindowsTaskSandboxV1(REPO, { ...base, host: { ...base.host, realpath: () => { throw new Error("ENOENT"); } } })).toEqual({ refused: "ENOENT" });
  });

  it("closes .ascout and grants only Node's entry points at setup, runs the self-test through the run script with a loopback port, and wraps tasks with their result folders", async () => {
    runs.length = 0;
    made.length = 0;
    let closed = false;
    const prepared = await prepareWindowsTaskSandboxV1(REPO, deps({ loopbackPort: async () => ({ port: 4242, close: () => { closed = true; } }) }));
    if (!("sandbox" in prepared)) throw new Error(prepared.refused);
    const setup = runs.find((run) => (run.argv.at(-1) ?? "").includes("AscoutAcSetup"))!;
    expect(setup.env).toMatchObject({ ASCOUT_AC_WORKSPACE: REPO, ASCOUT_AC_GITDIR: `${REPO}\\.git`, ASCOUT_AC_EVIDENCE: `${REPO}\\.ascout`, ASCOUT_AC_NODEFOLDER: "C:\\Program Files\\nodejs", ASCOUT_AC_NODEFILES: "C:\\Program Files\\nodejs\\node.exe|C:\\Program Files\\nodejs\\npm.cmd", ASCOUT_AC_NODEDIRS: "C:\\Program Files\\nodejs\\node_modules\\npm" });
    expect(made).toContain(`${REPO}\\.ascout`);
    const selfTest = runs.find((run) => run.argv.includes("-File"))!;
    expect(Buffer.from(selfTest.argv.at(-1)!, "base64").toString()).toMatch(/\\\.ascout\\selftest-ascout\.sandbox\.x\\raw\\test$/u);
    expect(Buffer.from(selfTest.argv[8]!, "base64").toString()).toContain("4242");
    expect(closed).toBe(true);
    const results = `${REPO}\\.ascout\\runs\\r1\\raw\\test`;
    const wrapped = prepared.sandbox.wrap("C:\\Program Files\\nodejs\\node.exe", ["-e", "x"], `${REPO}\\pkg`, [results]);
    expect(wrapped.file).toBe("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
    expect(wrapped.argv.slice(0, 6)).toEqual(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", "C:\\Users\\u\\AppData\\Local\\Temp\\ascout-1\\run-task.ps1"]);
    const [name, app64, cmd64, cwd64, acDir, writable64] = wrapped.argv.slice(6);
    expect(name).toBe("ascout.sandbox.x");
    expect(Buffer.from(app64!, "base64").toString()).toBe("C:\\Program Files\\nodejs\\node.exe");
    expect(Buffer.from(cmd64!, "base64").toString()).toBe('"C:\\Program Files\\nodejs\\node.exe" -e x');
    expect(Buffer.from(cwd64!, "base64").toString()).toBe(`${REPO}\\pkg`);
    expect(acDir).toBe("C:\\Users\\u\\AppData\\Local\\Packages\\ascout.sandbox.x\\AC");
    expect(Buffer.from(writable64!, "base64").toString()).toBe(results);
    expect(() => prepared.sandbox.wrap("C:\\x.exe", [], "C:\\src\\repository", [])).toThrow(/inside the repository/u);
    for (const dir of [`${REPO}\\src`, `${REPO}\\.ascout`, `${REPO}\\.ascout\\a|b`]) expect(() => prepared.sandbox.wrap("C:\\x.exe", [], REPO, [dir])).toThrow(/inside \.ascout/u);
    runs.length = 0;
    removed.length = 0;
    await prepared.sandbox.dispose();
    expect(cleanups()).toHaveLength(1);
    expect(cleanups()[0]!.env.ASCOUT_AC_PATHS).toBe([REPO, `${REPO}\\.git`, `${REPO}\\.ascout`, "C:\\Program Files\\nodejs", "C:\\Program Files\\nodejs\\node.exe", "C:\\Program Files\\nodejs\\npm.cmd", "C:\\Program Files\\nodejs\\node_modules\\npm"].join("|"));
    expect(removed).toEqual(["C:\\Users\\u\\AppData\\Local\\Temp\\ascout-1"]);
  });
});

describe.runIf(process.platform === "win32" && process.env.ASCOUT_REQUIRE_WINDOWS_SANDBOX === "1")("native: a check task inside the Windows task sandbox (CI only)", () => {
  const node = realpathSync.native(process.execPath);

  async function setUp(): Promise<{ root: string; ws: string; outside: string; sandbox: WindowsTaskSandboxV1 }> {
    const root = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-t1-win-")));
    const ws = join(root, "ws");
    mkdirSync(join(ws, ".git"), { recursive: true });
    writeFileSync(join(ws, ".git", "config"), "[core]\n");
    writeFileSync(join(ws, ".git", "HEAD"), "ref: refs/heads/main\n");
    const outside = join(root, "outside.txt");
    writeFileSync(outside, "host secret");
    const made = await prepareWindowsTaskSandboxV1(ws);
    if ("refused" in made) throw new Error(`the task sandbox is required here but refused: ${made.refused}`);
    return { root, ws, outside, sandbox: made.sandbox };
  }

  // The wrapped command is started directly, as the Linux and macOS native tests do: runProcess has
  // no wrap hook on this branch, so passing one there would silently run the task unsandboxed.
  async function run(sandbox: WindowsTaskSandboxV1 | null, cwd: string, file: string, argv: readonly string[], env: NodeJS.ProcessEnv = { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH }, writable: readonly string[] = []) {
    const launch = sandbox === null ? { file, argv } : sandbox.wrap(file, argv, cwd, writable);
    return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
      const child = spawn(launch.file, [...launch.argv], { cwd, env, windowsHide: true });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
      child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
      child.on("close", (code) => resolve({ code, stdout, stderr }));
    });
  }

  const script = (body: string) => ["-e", `let r = "allowed"; try { ${body} } catch (e) { r = e.code || String(e); } process.stdout.write(r)`];

  it("reports what a sandboxed task sees (diagnostic, always passes)", async () => {
    const t = await setUp();
    try {
      const probe = await run(t.sandbox, t.ws, node, ["-e", `const fs = require("fs"); let outside = "allowed"; try { fs.readFileSync(${JSON.stringify(t.outside)}); } catch (e) { outside = e.code; } process.stdout.write(JSON.stringify({ cwd: process.cwd(), temp: process.env.TEMP, envKeys: Object.keys(process.env).sort(), outside, gitConfig: (() => { try { fs.appendFileSync(".git\\\\config", ""); return "allowed"; } catch (e) { return e.code; } })() }))`]);
      console.log(`T1-WINDOWS-DIAGNOSTIC ${JSON.stringify(probe)}`);
    } finally {
      await t.sandbox.dispose();
      rmSync(t.root, { recursive: true, force: true });
    }
  }, 600_000);

  it("keeps the repository writable but .git, outside files, and host loopback out of reach; the controls reach all of them", async () => {
    const t = await setUp();
    const server = createServer((socket) => socket.end("hi"));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;
    try {
      expect((await run(t.sandbox, t.ws, node, script(`require("fs").writeFileSync("out.txt", "ok")`))).stdout).toBe("allowed");
      expect(readFileSync(join(t.ws, "out.txt"), "utf8")).toBe("ok");
      expect((await run(t.sandbox, t.ws, node, script(`require("fs").appendFileSync(".git\\\\config", "x")`))).stdout).toBe("EPERM");
      expect(readFileSync(join(t.ws, ".git", "config"), "utf8")).toBe("[core]\n");
      const read = script(`require("fs").readFileSync(${JSON.stringify(t.outside)}); r = "read"`);
      expect((await run(t.sandbox, t.ws, node, read)).stdout).toBe("EPERM");
      expect((await run(null, t.ws, node, read)).stdout).toBe("read");
      const connect = ["-e", `const s = require("net").connect(${port}, "127.0.0.1"); s.on("data", () => { process.stdout.write("connected"); process.exit(0); }); s.on("error", (e) => { process.stdout.write(e.code); process.exit(0); });`];
      expect((await run(t.sandbox, t.ws, node, connect)).stdout).not.toBe("connected");
      expect((await run(null, t.ws, node, connect)).stdout).toBe("connected");
    } finally {
      server.close();
      await t.sandbox.dispose();
      rmSync(t.root, { recursive: true, force: true });
    }
  }, 600_000);

  it("can't read earlier evidence in .ascout, but can write the result folder it is given, for that task only", async () => {
    const t = await setUp();
    try {
      const results = join(t.ws, ".ascout", "runs", "r1", "raw", "test");
      mkdirSync(results, { recursive: true });
      writeFileSync(join(t.ws, ".ascout", "earlier-evidence"), "evidence");
      // Forward slashes: inside this script a backslash would start a JavaScript escape.
      const readEvidence = script(`require("fs").readFileSync(".ascout/earlier-evidence"); r = "read"`);
      const writeResults = script(`require("fs").writeFileSync(${JSON.stringify(join(results, "results.json"))}, "{}")`);
      // The container can't even look inside .ascout, so Windows may report the file as absent.
      expect(["EPERM", "ENOENT"]).toContain((await run(t.sandbox, t.ws, node, readEvidence)).stdout);
      expect((await run(t.sandbox, t.ws, node, writeResults, undefined, [results])).stdout).toBe("allowed");
      expect(readFileSync(join(results, "results.json"), "utf8")).toBe("{}");
      // The grant lasted for that task only.
      expect((await run(t.sandbox, t.ws, node, writeResults)).stdout).toBe("EPERM");
      expect((await run(null, t.ws, node, readEvidence)).stdout).toBe("read");
    } finally {
      await t.sandbox.dispose();
      rmSync(t.root, { recursive: true, force: true });
    }
  }, 600_000);

  it("passes exit codes and separate output streams, gives the container's own temp folder, and drops what it wasn't given", async () => {
    const t = await setUp();
    process.env.ASCOUT_T1_CANARY = "host-only";
    try {
      const streams = await run(t.sandbox, t.ws, node, ["-e", "process.stdout.write('out'); process.stderr.write('err'); process.exit(7)"]);
      expect(streams).toMatchObject({ code: 7, stdout: "out", stderr: "err" });
      const probe = await run(t.sandbox, t.ws, node, ["-e", "process.stdout.write(JSON.stringify({ canary: process.env.ASCOUT_T1_CANARY ?? null, temp: process.env.TEMP, writable: (() => { try { require('fs').writeFileSync(require('path').join(process.env.TEMP, 't'), 'x'); return true; } catch { return false; } })() }))"]);
      const seen = JSON.parse(probe.stdout) as { canary: string | null; temp: string; writable: boolean };
      expect(seen.canary).toBeNull();
      expect(seen.temp).toMatch(/\\Packages\\ascout\.sandbox\.[a-z0-9]+\\AC\\Temp$/iu);
      expect(seen.writable).toBe(true);
    } finally {
      delete process.env.ASCOUT_T1_CANARY;
      await t.sandbox.dispose();
      rmSync(t.root, { recursive: true, force: true });
    }
  }, 600_000);

  it("reports whether Node scripts run inside the container (diagnostic, always passes)", async () => {
    const t = await setUp();
    try {
      writeFileSync(join(t.ws, "hello.js"), "process.stdout.write('script-ran')");
      for (const [label, argv] of [
        ["script", [join(t.ws, "hello.js")]],
        ["script-preserve", ["--preserve-symlinks", "--preserve-symlinks-main", join(t.ws, "hello.js")]],
        ["realpath-js", ["-e", "try { process.stdout.write(require('fs').realpathSync('.')) } catch (e) { process.stdout.write(e.code) }"]],
        ["realpath-native", ["-e", "try { process.stdout.write(require('fs').realpathSync.native('.')) } catch (e) { process.stdout.write(e.code) }"]],
      ] as const) {
        const result = await run(t.sandbox, t.ws, node, argv);
        console.log(`T1-WINDOWS-NODE ${label} ${JSON.stringify({ code: result.code, stdout: result.stdout.slice(0, 200), stderr: result.stderr.slice(0, 200) })}`);
      }
    } finally {
      await t.sandbox.dispose();
      rmSync(t.root, { recursive: true, force: true });
    }
  }, 600_000);

  it("runs a batch-file tool, and leaves no descendant running after the task ends", async () => {
    const t = await setUp();
    try {
      const npm = win32.join(win32.dirname(node), "npm.cmd");
      if (existsSync(npm)) {
        const version = await run(t.sandbox, t.ws, npm, ["--version"]);
        expect(version.stdout.trim(), JSON.stringify(version)).toMatch(/^\d+\.\d+\.\d+$/u);
      }
      // The job may refuse the detached child outright (it can't break away), or the child may start;
      // either way it must not outlive the task.
      const late = (marker: string) => ["-e", `let c; try { c = require("child_process").spawn(process.execPath, ["-e", "setTimeout(() => require('fs').writeFileSync('${marker.replaceAll("\\", "\\\\\\\\")}', 'x'), 1500)"], { detached: true, stdio: "ignore" }); } catch (e) { process.stdout.write("refused:" + e.code); process.exit(0); } c.on("error", (e) => process.stdout.write("refused:" + e.code)); c.on("spawn", () => { c.unref(); process.stdout.write("started"); }); setTimeout(() => process.exit(0), 500);`];
      // An ordinary child, as test runners start, still works inside the container.
      const child = await run(t.sandbox, t.ws, node, ["-e", `process.stdout.write(require("child_process").spawnSync(process.execPath, ["-e", "process.stdout.write('child-ran')"], { encoding: "utf8" }).stdout)`]);
      expect(child.stdout, JSON.stringify(child)).toBe("child-ran");
      const started = await run(t.sandbox, t.ws, node, late(join(t.ws, "late-inside")));
      expect(started.stdout, JSON.stringify(started)).toMatch(/^(started|refused:\w+)$/u);
      await new Promise((resolve) => setTimeout(resolve, 3500));
      expect(existsSync(join(t.ws, "late-inside"))).toBe(false);
    } finally {
      await t.sandbox.dispose();
      rmSync(t.root, { recursive: true, force: true });
    }
  }, 600_000);
});
