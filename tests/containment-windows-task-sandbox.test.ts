import { spawn, spawnSync } from "node:child_process";
import { existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, win32 } from "node:path";

import { describe, expect, it } from "vitest";

import {
  WINDOWS_SELF_TEST_EXPECTED,
  findRepositoryHardLinkV1,
  parsePendingCleanupLedgerV1,
  prepareWindowsTaskSandboxV1,
  realExecBothV1,
  realLoopbackPortV1,
  realLstatPathV1,
  realRemoveFileV1,
  quoteWindowsArgV1,
  windowsCommandLineV1,
  windowsGitReachRefusalV1,
  type WindowsTaskSandboxDepsV1,
  type WindowsTaskSandboxV1,
} from "../src/assurance/containment/windows-task-sandbox.js";

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

describe("the real helpers the Windows task sandbox uses", () => {
  it("run a file and return both output streams", async () => {
    expect(await realExecBothV1(process.execPath, ["-e", "process.stdout.write('o'); process.stderr.write('e')"], { cwd: process.cwd(), env: {}, timeoutMs: 20_000 })).toEqual({ stdout: "o", stderr: "e" });
  });

  it("open a host loopback port, serve a connection without crashing on reset, and close it", async () => {
    const loopback = await realLoopbackPortV1();
    if (loopback === null) throw new Error("no loopback port");
    expect(loopback.port).toBeGreaterThan(0);
    const { connect } = await import("node:net");
    const received = await new Promise<string>((resolve, reject) => {
      const client = connect(loopback.port, "127.0.0.1");
      let data = "";
      client.on("data", (chunk: Buffer) => { data += chunk.toString(); });
      client.on("end", () => resolve(data));
      client.on("error", reject);
    });
    expect(received).toBe("host");
    loopback.close();
  });

  it("detects repository hard links while skipping .git, .ascout, and symlinks, parses cleanup ledgers, and removes files", () => {
    const root = mkdtempSync(join(tmpdir(), "ascout-hardlink-"));
    try {
      const ws = join(root, "ws");
      const outside = join(root, "outside.txt");
      writeFileSync(outside, "secret");
      mkdirSync(join(ws, ".git"), { recursive: true });
      mkdirSync(join(ws, ".ascout"), { recursive: true });
      mkdirSync(join(ws, "src"), { recursive: true });
      writeFileSync(join(ws, "README.md"), "ok\n");
      writeFileSync(join(ws, "src", "index.ts"), "export const a = 1;\n");
      // Hard links inside .git and .ascout are ignored because those directories are never granted.
      linkSync(outside, join(ws, ".git", "linked"));
      linkSync(outside, join(ws, ".ascout", "linked"));
      // Symlinks/junctions are skipped because they are never granted or traversed.
      symlinkSync(join(ws, "src"), join(ws, "src-link"), process.platform === "win32" ? "junction" : "dir");
      expect(findRepositoryHardLinkV1(ws)).toBeNull();

      // A hard link inside the repository tree is detected and reported by relative path.
      linkSync(outside, join(ws, "src", "escaped.txt"));
      expect(findRepositoryHardLinkV1(ws)).toBe("src/escaped.txt");

      const tempFile = join(root, "ledger.json");
      writeFileSync(tempFile, "{}");
      expect(existsSync(tempFile)).toBe(true);
      expect(realLstatPathV1(tempFile)).toMatchObject({ isSymbolicLink: false, isDirectory: false, isFile: true, nlink: 1n });
      realRemoveFileV1(tempFile);
      expect(existsSync(tempFile)).toBe(false);
      expect(realLstatPathV1(tempFile)).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }

    const wsWin = "C:\\repo";
    const nodeWin = "C:\\Program Files\\nodejs";
    expect(
      parsePendingCleanupLedgerV1(
        '{"name":"ascout.sandbox.ac1","workspace":"C:\\\\repo","paths":["C:\\\\repo","C:\\\\Program Files\\\\nodejs\\\\node.exe"]}',
        wsWin,
        nodeWin,
      ),
    ).toEqual({
      name: "ascout.sandbox.ac1",
      workspace: "C:\\repo",
      paths: ["C:\\repo", "C:\\Program Files\\nodejs\\node.exe"],
    });
    expect(parsePendingCleanupLedgerV1("{bad json", wsWin, nodeWin)).toBeNull();
    expect(parsePendingCleanupLedgerV1("42", wsWin, nodeWin)).toBeNull();
    expect(parsePendingCleanupLedgerV1("null", wsWin, nodeWin)).toBeNull();
    expect(parsePendingCleanupLedgerV1("{}", wsWin, nodeWin)).toBeNull();
    expect(parsePendingCleanupLedgerV1('{"name":"evil.name","workspace":"C:\\\\repo","paths":[]}', wsWin, nodeWin)).toBeNull();
    expect(parsePendingCleanupLedgerV1('{"name":"ascout.sandbox.ac1"}', wsWin, nodeWin)).toBeNull();
    expect(parsePendingCleanupLedgerV1('{"name":"ascout.sandbox.ac1","workspace":"C:\\\\other","paths":[]}', wsWin, nodeWin)).toBeNull();
    expect(parsePendingCleanupLedgerV1('{"name":"ascout.sandbox.ac1","workspace":"C:\\\\repo","paths":"bad"}', wsWin, nodeWin)).toBeNull();
    expect(parsePendingCleanupLedgerV1('{"name":"ascout.sandbox.ac1","workspace":"C:\\\\repo","paths":["C:\\\\Windows\\\\System32"]}', wsWin, nodeWin)).toBeNull();
    expect(parsePendingCleanupLedgerV1('{"name":"ascout.sandbox.ac1","workspace":"C:\\\\repo","paths":["C:\\\\repo\\\\..\\\\Windows"]}', wsWin, nodeWin)).toBeNull();
    expect(parsePendingCleanupLedgerV1('{"name":"ascout.sandbox.ac1","workspace":"C:\\\\repo","paths":["C:\\\\repo/sub"]}', wsWin, nodeWin)).toBeNull();
    expect(parsePendingCleanupLedgerV1('{"name":"ascout.sandbox.ac1","workspace":"C:\\\\repo","paths":["C:\\\\repo|evil"]}', wsWin, nodeWin)).toBeNull();
    expect(parsePendingCleanupLedgerV1('{"name":"ascout.sandbox.ac1","workspace":"C:\\\\repo","paths":[42]}', wsWin, nodeWin)).toBeNull();

    // windowsGitReachRefusalV1 matches Linux/macOS .git reach refusals and tolerates missing entries (ENOENT) while failing closed on other errors.
    expect(windowsGitReachRefusalV1("C:\\repo\\.git", { symlinkTarget: (p) => (p.endsWith("\\hooks") ? "C:\\repo\\h" : null), exists: () => false }, () => "")).toMatch(/hooks is a link/u);
    expect(windowsGitReachRefusalV1("C:\\repo\\.git", { symlinkTarget: (p) => (p.endsWith("\\config") ? "C:\\repo\\c" : null), exists: () => false }, () => "")).toMatch(/config is a link/u);
    expect(windowsGitReachRefusalV1("C:\\repo\\.git", { symlinkTarget: () => null, exists: () => true }, () => "[include]\n  path = ../x")).toMatch(/includes other files/u);
    expect(windowsGitReachRefusalV1("C:\\repo\\.git", { symlinkTarget: () => null, exists: () => true }, () => "[core]\n  bare = false\n")).toBeNull();
    expect(windowsGitReachRefusalV1("C:\\repo\\.git", { symlinkTarget: () => { const err = new Error("missing") as NodeJS.ErrnoException; err.code = "ENOENT"; throw err; }, exists: () => false }, () => "")).toBeNull();
    expect(() => windowsGitReachRefusalV1("C:\\repo\\.git", { symlinkTarget: () => { const err = new Error("denied") as NodeJS.ErrnoException; err.code = "EACCES"; throw err; }, exists: () => false }, () => "")).toThrow(/denied/u);
  });
});

describe("preparing the Windows task sandbox", () => {
  const removed: string[] = [];
  const removedFiles: string[] = [];
  const written: Record<string, string> = {};
  const made: string[] = [];
  const runs: { file: string; argv: readonly string[]; env: NodeJS.ProcessEnv }[] = [];
  const REPO = "C:\\src\\repo";
  // The probe runner's own self-test reads its output file, which the fake reports as present.
  const present = (path: string) => path.endsWith("powershell.exe") || path.endsWith("stdout.txt") || [`${REPO}\\.git`, `${REPO}\\.git\\HEAD`, "C:\\Program Files\\nodejs\\npm.cmd", "C:\\Program Files\\nodejs\\node_modules\\npm"].includes(path);
  const deps = (
    overrides: Partial<WindowsTaskSandboxDepsV1> = {},
    opts: { setupOut?: string; selfTest?: string; cleanupOut?: string; revokeOut?: string; exists?: (path: string) => boolean } = {},
  ): WindowsTaskSandboxDepsV1 => {
    const existsFn = opts.exists ?? present;
    return {
      platform: "win32",
      host: {
        exists: existsFn,
        symlinkTarget: () => null,
        realpath: (path) => path,
        home: () => "C:\\Users\\u",
        makeTempDir: () => "C:\\Users\\u\\AppData\\Local\\Temp\\ascout-1",
        makeDir: (path) => made.push(path),
        writeFile: (path, content) => { written[path] = content; },
        removeDir: (path) => removed.push(path),
      },
      exec: async (file, argv, options) => {
        runs.push({ file, argv, env: options.env });
        const script = argv.at(-1) ?? "";
        if (script.includes("AscoutAcSetup")) return opts.setupOut ?? "C:\\Users\\u\\AppData\\Local\\Packages\\ascout.sandbox.x\\AC";
        if (script.includes("AscoutAcTaskCleanup")) return opts.cleanupOut ?? "ASCOUT_CLEANUP_OK";
        if (script.includes("AscoutAcTaskRevoke")) return opts.revokeOut ?? "ASCOUT_REVOKE_OK";
        if (argv.includes("-File")) return opts.selfTest ?? JSON.stringify(WINDOWS_SELF_TEST_EXPECTED);
        return "";
      },
      execPath: "C:\\Program Files\\nodejs\\node.exe",
      systemRoot: "C:\\Windows",
      readText: () => "sandbox-ok",
      randomName: () => "ascout.sandbox.x",
      startupEnv: {},
      taskTimeoutMs: 1000,
      loopbackPort: async () => ({ port: 4242, close: () => undefined }),
      execBoth: async (file, argv, options) => {
        runs.push({ file, argv, env: options.env });
        return { stdout: opts.selfTest ?? JSON.stringify(WINDOWS_SELF_TEST_EXPECTED), stderr: opts.selfTest === "" ? "Add-Type failed" : "" };
      },
      findHardLink: () => null,
      lstatPath: (path) => {
        if (!existsFn(path)) return null;
        const isDir = path === `${REPO}\\.ascout`;
        return { isSymbolicLink: false, isDirectory: isDir, isFile: !isDir, nlink: 1n };
      },
      removeFile: (path) => { removedFiles.push(path); },
      ...overrides,
    };
  };
  const cleanups = () => runs.filter((run) => (run.argv.at(-1) ?? "").includes("AscoutAcTaskCleanup"));
  const revokes = () => runs.filter((run) => (run.argv.at(-1) ?? "").includes("AscoutAcTaskRevoke"));

  it("refuses off Windows, without PowerShell, invalid --pass-env, hard links, .git reach, bad .ascout, or a refused repository or Node folder", async () => {
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({ platform: "linux" }))).toEqual({ refused: "the AppContainer task sandbox is Windows only" });
    // Default deps parameter exercised safely on every platform (Linux/macOS refuse platform, Windows refuses invalid --pass-env).
    const withDefaultDeps = await prepareWindowsTaskSandboxV1(REPO, undefined, { passEnv: ["BAD NAME"] });
    expect("refused" in withDefaultDeps).toBe(true);
    expect(await prepareWindowsTaskSandboxV1(REPO, deps(), { passEnv: ["BAD NAME"] })).toMatchObject({ refused: expect.stringMatching(/--pass-env/u) });
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({}, { exists: () => false }))).toMatchObject({ refused: expect.stringMatching(/PowerShell/u) });
    expect(await prepareWindowsTaskSandboxV1("C:\\", deps())).toMatchObject({ refused: expect.stringMatching(/drive root/u) });
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({ execPath: "C:\\node.exe" }))).toMatchObject({ refused: expect.stringMatching(/Node install folder/u) });
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({ execPath: "C:\\Users\\node.exe" }))).toMatchObject({ refused: expect.stringMatching(/Node install folder/u) });
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({ execPath: `${REPO}\\bin\\node.exe` }))).toMatchObject({ refused: expect.stringMatching(/Node install folder/u) });
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({ findHardLink: () => "src/link.txt" }))).toMatchObject({ refused: expect.stringMatching(/hard-linked file/u) });
    expect(
      await prepareWindowsTaskSandboxV1(
        REPO,
        deps(
          { readText: (p) => (p === `${REPO}\\.git\\config` ? "[include]\npath = ../x" : "sandbox-ok") },
          { exists: (p) => present(p) || p === `${REPO}\\.git\\config` },
        ),
      ),
    ).toMatchObject({ refused: expect.stringMatching(/includes other files/u) });
    expect(
      await prepareWindowsTaskSandboxV1(
        REPO,
        deps({
          lstatPath: (p) => (p === `${REPO}\\.ascout` ? { isSymbolicLink: true, isDirectory: true, isFile: false, nlink: 1n } : null),
        }),
      ),
    ).toMatchObject({ refused: expect.stringMatching(/\.ascout is not a real folder/u) });
    expect(
      await prepareWindowsTaskSandboxV1(
        REPO,
        deps({
          lstatPath: (p) => (p === `${REPO}\\.ascout` ? { isSymbolicLink: false, isDirectory: false, isFile: true, nlink: 1n } : null),
        }),
      ),
    ).toMatchObject({ refused: expect.stringMatching(/\.ascout is not a real folder/u) });
    const baseForRealpath = deps({
      lstatPath: (p) => (p === `${REPO}\\.ascout` ? { isSymbolicLink: false, isDirectory: true, isFile: false, nlink: 1n } : null),
    });
    expect(
      await prepareWindowsTaskSandboxV1(REPO, {
        ...baseForRealpath,
        host: { ...baseForRealpath.host, realpath: (p) => (p === `${REPO}\\.ascout` ? "C:\\elsewhere\\.ascout" : p) },
      }),
    ).toMatchObject({ refused: expect.stringMatching(/\.ascout is not a real folder/u) });
    // Dangling symlink ledger (exists() returns false, lstatPath() catches it!) and non-file / hard-linked ledger.
    expect(
      await prepareWindowsTaskSandboxV1(
        REPO,
        deps({
          lstatPath: (p) => (p === `${REPO}\\.ascout\\pending-acl-cleanup.json` ? { isSymbolicLink: true, isDirectory: false, isFile: false, nlink: 1n } : null),
        }),
      ),
    ).toMatchObject({ refused: expect.stringMatching(/plain single-link file/u) });
    expect(
      await prepareWindowsTaskSandboxV1(
        REPO,
        deps({
          lstatPath: (p) => (p === `${REPO}\\.ascout\\pending-acl-cleanup.json` ? { isSymbolicLink: false, isDirectory: true, isFile: false, nlink: 1n } : null),
        }),
      ),
    ).toMatchObject({ refused: expect.stringMatching(/plain single-link file/u) });
    expect(
      await prepareWindowsTaskSandboxV1(
        REPO,
        deps({
          lstatPath: (p) => (p === `${REPO}\\.ascout\\pending-acl-cleanup.json` ? { isSymbolicLink: false, isDirectory: false, isFile: true, nlink: 2n } : null),
        }),
      ),
    ).toMatchObject({ refused: expect.stringMatching(/plain single-link file/u) });
  });

  it("refuses a worktree's .git file and a repository with submodules", async () => {
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({}, { exists: (path) => path.endsWith("powershell.exe") || path.endsWith("stdout.txt") || path === `${REPO}\\.git` }))).toMatchObject({ refused: expect.stringMatching(/not a real folder/u) });
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({}, { exists: (path) => present(path) || path === `${REPO}\\.gitmodules` }))).toMatchObject({ refused: expect.stringMatching(/submodules/u) });
  });

  it("cleans up and refuses when setup fails, loopback port is unavailable, or the self-test in the real container does not hold", async () => {
    runs.length = 0;
    removed.length = 0;
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({}, { setupOut: "" }))).toEqual({ refused: "the AppContainer for tasks could not be created and granted" });
    expect(cleanups()).toHaveLength(1);
    expect(removed).toContain("C:\\Users\\u\\AppData\\Local\\Temp\\ascout-1");

    runs.length = 0;
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({ loopbackPort: async () => null }))).toMatchObject({ refused: expect.stringMatching(/loopback probe port/u) });
    expect(cleanups()).toHaveLength(1);

    for (const key of Object.keys(WINDOWS_SELF_TEST_EXPECTED)) {
      runs.length = 0;
      const broken = JSON.stringify({ ...WINDOWS_SELF_TEST_EXPECTED, [key]: "something-else" });
      expect(await prepareWindowsTaskSandboxV1(REPO, deps({}, { selfTest: broken })), key).toMatchObject({ refused: expect.stringMatching(/self-test did not hold/u) });
      expect(cleanups()).toHaveLength(1);
    }
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({}, { selfTest: "" }))).toEqual({ refused: "the AppContainer task sandbox did not start (Add-Type failed)" });
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({ execBoth: async () => ({ stdout: "", stderr: "" }) }))).toEqual({ refused: "the AppContainer task sandbox did not start" });

    // If afterTask throws inside selfTest's finally, selftest folder is still removed, dispose() runs, and prepare refuses cleanly.
    runs.length = 0;
    removed.length = 0;
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({}, { revokeOut: "" }))).toMatchObject({
      refused: expect.stringMatching(/revoke task result-folder/u),
    });
    expect(cleanups()).toHaveLength(1);
    expect(removed.some((p) => p.includes("selftest-"))).toBe(true);
    expect(removed).toContain("C:\\Users\\u\\AppData\\Local\\Temp\\ascout-1");
  });

  it("replays stale crash-recovery ACL cleanup ledgers (failing closed if replay fails, discarding corrupt ones)", async () => {
    const ledgerPath = `${REPO}\\.ascout\\pending-acl-cleanup.json`;
    runs.length = 0;
    removedFiles.length = 0;
    const validLedger = JSON.stringify({ name: "ascout.sandbox.stale", workspace: REPO, paths: [REPO, `${REPO}\\.ascout\\runs\\old`] });
    const withValid = await prepareWindowsTaskSandboxV1(
      REPO,
      deps(
        { readText: (path) => (path === ledgerPath ? validLedger : "sandbox-ok") },
        { exists: (path) => present(path) || path === `${REPO}\\.ascout` || path === ledgerPath },
      ),
    );
    expect("sandbox" in withValid).toBe(true);
    expect(cleanups()).toHaveLength(1);
    expect(cleanups()[0]!.env).toMatchObject({
      ASCOUT_AC_NAME: "ascout.sandbox.stale",
      ASCOUT_AC_WORKSPACE: REPO,
      ASCOUT_AC_PATHS: `${REPO}|${REPO}\\.ascout\\runs\\old`,
    });
    expect(removedFiles).toContain(ledgerPath);

    // If stale ledger cleanup fails, refuse and leave the ledger on disk for retry.
    runs.length = 0;
    removedFiles.length = 0;
    const failedReplay = await prepareWindowsTaskSandboxV1(
      REPO,
      deps(
        { readText: (path) => (path === ledgerPath ? validLedger : "sandbox-ok") },
        { exists: (path) => present(path) || path === `${REPO}\\.ascout` || path === ledgerPath, cleanupOut: "" },
      ),
    );
    expect(failedReplay).toMatchObject({ refused: expect.stringMatching(/orphaned ACL grants/u) });
    expect(removedFiles).not.toContain(ledgerPath);

    // Unreadable ledger cleans up scratch and refuses instead of throwing.
    removed.length = 0;
    const unreadableLedger = await prepareWindowsTaskSandboxV1(
      REPO,
      deps(
        { readText: (path) => { if (path === ledgerPath) throw new Error("EACCES"); return "sandbox-ok"; } },
        { exists: (path) => present(path) || path === `${REPO}\\.ascout` || path === ledgerPath },
      ),
    );
    expect(unreadableLedger).toEqual({ refused: "EACCES" });
    expect(removed).toContain("C:\\Users\\u\\AppData\\Local\\Temp\\ascout-1");

    runs.length = 0;
    removedFiles.length = 0;
    const withCorrupt = await prepareWindowsTaskSandboxV1(
      REPO,
      deps(
        { readText: (path) => (path === ledgerPath ? "corrupt" : "sandbox-ok") },
        { exists: (path) => present(path) || path === `${REPO}\\.ascout` || path === ledgerPath },
      ),
    );
    expect("sandbox" in withCorrupt).toBe(true);
    expect(cleanups()).toHaveLength(0);
    expect(removedFiles).toContain(ledgerPath);
  });

  it("refuses when a path can't be resolved, instead of throwing, whatever was thrown", async () => {
    const base = deps();
    expect(await prepareWindowsTaskSandboxV1(REPO, { ...base, host: { ...base.host, realpath: () => { throw new Error("ENOENT"); } } })).toEqual({ refused: "ENOENT" });
    expect(await prepareWindowsTaskSandboxV1(REPO, { ...base, host: { ...base.host, realpath: () => { throw "not an Error"; } } })).toEqual({ refused: "not an Error" });
  });

  it("refuses when the AppContainer probe runner's own self-test fails", async () => {
    expect(await prepareWindowsTaskSandboxV1(REPO, deps({ readText: () => "" }))).toMatchObject({ refused: expect.stringMatching(/did not start/u) });
  });

  it("works for a folder without .git, and reuses an existing .ascout", async () => {
    runs.length = 0;
    made.length = 0;
    const exists = (path: string) => (present(path) && !path.startsWith(`${REPO}\\.git`)) || path === `${REPO}\\.ascout`;
    const prepared = await prepareWindowsTaskSandboxV1(REPO, deps({}, { exists }));
    if (!("sandbox" in prepared)) throw new Error(prepared.refused);
    const setup = runs.find((run) => (run.argv.at(-1) ?? "").includes("AscoutAcSetup"))!;
    expect(setup.env.ASCOUT_AC_GITDIR).toBe("");
    expect(setup.env.ASCOUT_AC_PATHS).not.toContain(".git");
    expect(made).not.toContain(`${REPO}\\.ascout`);
  });

  it("closes .ascout, grants Node entry points, passes allowlisted env + --pass-env, enforces revoke/cleanup sentinels, and cleans up ledger on dispose", async () => {
    runs.length = 0;
    made.length = 0;
    removedFiles.length = 0;
    let closed = false;
    let failNextRevoke = false;
    let failNextCleanup = false;
    const baseDeps = deps(
      { loopbackPort: async () => ({ port: 4242, close: () => { closed = true; } }) },
      {},
    );
    const prepared = await prepareWindowsTaskSandboxV1(
      REPO,
      {
        ...baseDeps,
        exec: async (file, argv, options) => {
          const script = argv.at(-1) ?? "";
          if (script.includes("AscoutAcTaskRevoke") && failNextRevoke) {
            runs.push({ file, argv, env: options.env });
            return "";
          }
          if (script.includes("AscoutAcTaskCleanup") && failNextCleanup) {
            runs.push({ file, argv, env: options.env });
            return "";
          }
          return baseDeps.exec(file, argv, options);
        },
      },
      { passEnv: ["CUSTOM_API_FLAG"] },
    );
    if (!("sandbox" in prepared)) throw new Error(prepared.refused);
    const setup = runs.find((run) => (run.argv.at(-1) ?? "").includes("AscoutAcSetup"))!;
    expect(setup.env).toMatchObject({ ASCOUT_AC_WORKSPACE: REPO, ASCOUT_AC_GITDIR: `${REPO}\\.git`, ASCOUT_AC_EVIDENCE: `${REPO}\\.ascout`, ASCOUT_AC_NODEFOLDER: "C:\\Program Files\\nodejs", ASCOUT_AC_NODEFILES: "C:\\Program Files\\nodejs\\node.exe|C:\\Program Files\\nodejs\\npm.cmd", ASCOUT_AC_NODEDIRS: "C:\\Program Files\\nodejs\\node_modules\\npm" });
    expect(made).toContain(`${REPO}\\.ascout`);
    const selfTest = runs.find((run) => run.argv.includes("-File"))!;
    expect(Buffer.from(selfTest.argv[11]!, "base64").toString()).toMatch(/\\\.ascout\\selftest-ascout\.sandbox\.x\\raw\\test$/u);
    expect(Buffer.from(selfTest.argv[8]!, "base64").toString()).toContain("4242");
    expect(Object.keys(selfTest.env).some((k) => k.startsWith("ASCOUT_SELFTEST_CANARY_"))).toBe(true);
    expect(closed).toBe(true);
    expect(revokes()).toHaveLength(1);

    const results = `${REPO}\\.ascout\\runs\\r1\\raw\\test`;
    const wrappedNoWritable = prepared.sandbox.wrap("C:\\Program Files\\nodejs\\node.exe", ["-e", "x"], `${REPO}\\pkg`, []);
    expect(Buffer.from(wrappedNoWritable.argv[11]!, "base64").toString()).toBe("");
    const wrapped = prepared.sandbox.wrap("C:\\Program Files\\nodejs\\node.exe", ["-e", "x"], `${REPO}\\pkg`, [results]);
    expect(wrapped.file).toBe("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
    expect(wrapped.argv.slice(0, 6)).toEqual(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", "C:\\Users\\u\\AppData\\Local\\Temp\\ascout-1\\run-task.ps1"]);
    const [name, app64, cmd64, cwd64, acDir, writable64, allow64] = wrapped.argv.slice(6);
    expect(name).toBe("ascout.sandbox.x");
    expect(Buffer.from(app64!, "base64").toString()).toBe("C:\\Program Files\\nodejs\\node.exe");
    expect(Buffer.from(cmd64!, "base64").toString()).toBe('"C:\\Program Files\\nodejs\\node.exe" -e x');
    expect(Buffer.from(cwd64!, "base64").toString()).toBe(`${REPO}\\pkg`);
    expect(acDir).toBe("C:\\Users\\u\\AppData\\Local\\Packages\\ascout.sandbox.x\\AC");
    expect(Buffer.from(writable64!, "base64").toString()).toBe(results);
    const allowedList = Buffer.from(allow64!, "base64").toString().split("|");
    expect(allowedList).toContain("SystemRoot");
    expect(allowedList).toContain("CI");
    expect(allowedList).toContain("CUSTOM_API_FLAG");
    expect(JSON.parse(written[`${REPO}\\.ascout\\pending-acl-cleanup.json`]!).paths).toContain(results);
    expect(() => prepared.sandbox.wrap("C:\\x.exe", [], "C:\\src\\repository", [])).toThrow(/inside the repository/u);
    expect(() => prepared.sandbox.wrap("C:\\x.exe", [], `${REPO}\\..\\other`, [])).toThrow(/inside the repository/u);
    expect(() => prepared.sandbox.wrap("C:\\x.exe", [], `${REPO}/pkg`, [])).toThrow(/inside the repository/u);
    for (const dir of [`${REPO}\\src`, `${REPO}\\.ascout`, `${REPO}\\.ascout\\a|b`, `${REPO}\\.ascout/raw`, `${REPO}\\.ascout\\a\\..\\b`]) expect(() => prepared.sandbox.wrap("C:\\x.exe", [], REPO, [dir])).toThrow(/inside \.ascout/u);

    runs.length = 0;
    await prepared.sandbox.afterTask([]);
    expect(revokes()).toHaveLength(0);

    // Unconfirmed revoke throws and keeps result dir in ledger/granted set.
    failNextRevoke = true;
    await expect(prepared.sandbox.afterTask([results])).rejects.toThrow(/revoke task result-folder/u);
    failNextRevoke = false;

    runs.length = 0;
    await prepared.sandbox.afterTask([results]);
    expect(revokes()).toHaveLength(1);
    expect(revokes()[0]!.env.ASCOUT_AC_WRITABLE).toBe(results);

    // Unconfirmed dispose cleanup leaves ledger intact on disk for next-run recovery.
    removedFiles.length = 0;
    failNextCleanup = true;
    await prepared.sandbox.dispose();
    expect(removedFiles).not.toContain(`${REPO}\\.ascout\\pending-acl-cleanup.json`);
    failNextCleanup = false;

    runs.length = 0;
    removed.length = 0;
    removedFiles.length = 0;
    await prepared.sandbox.dispose();
    expect(cleanups()).toHaveLength(1);
    expect(cleanups()[0]!.env.ASCOUT_AC_PATHS).toBe([REPO, `${REPO}\\.git`, `${REPO}\\.ascout`, "C:\\Program Files\\nodejs", "C:\\Program Files\\nodejs\\node.exe", "C:\\Program Files\\nodejs\\npm.cmd", "C:\\Program Files\\nodejs\\node_modules\\npm"].join("|"));
    expect(removedFiles).toContain(`${REPO}\\.ascout\\pending-acl-cleanup.json`);
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

  // The wrapped command is started directly, matching the Linux and macOS native tests so each
  // assertion isolates the sandbox wrapper itself from higher-level runner orchestration.
  async function run(sandbox: WindowsTaskSandboxV1 | null, cwd: string, file: string, argv: readonly string[], env: NodeJS.ProcessEnv = { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH }, writable: readonly string[] = []) {
    const launch = sandbox === null ? { file, argv } : sandbox.wrap(file, argv, cwd, writable);
    return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
      // Bounded, so a hang inside the container shows up as a result instead of a test timeout.
      const child = spawn(launch.file, [...launch.argv], { cwd, env, windowsHide: true, timeout: 120_000 });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
      child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
      child.on("close", (code, signal) => resolve({ code, stdout: signal === null ? stdout : `${stdout}[killed:${signal}]`, stderr }));
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
    const server = createServer((socket) => {
      socket.on("error", () => undefined);
      socket.end("hi");
    });
    server.on("error", () => undefined);
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

  it("builds an allowlisted environment inside run-task.ps1, dropping unlisted canaries even when passed directly to PowerShell while forwarding --pass-env", async () => {
    const root = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-t1-env-")));
    const ws = join(root, "ws");
    mkdirSync(join(ws, ".git"), { recursive: true });
    writeFileSync(join(ws, ".git", "HEAD"), "ref: refs/heads/main\n");
    const made = await prepareWindowsTaskSandboxV1(ws, undefined, { passEnv: ["ASCOUT_T1_ALLOWED"] });
    if ("refused" in made) throw new Error(`the task sandbox is required here but refused: ${made.refused}`);
    try {
      const env = {
        SystemRoot: process.env.SystemRoot,
        PATH: process.env.PATH,
        ASCOUT_T1_CANARY: "secret-passed-to-powershell",
        ASCOUT_T1_ALLOWED: "operator-approved",
      };
      const streams = await run(made.sandbox, ws, node, ["-e", "process.stdout.write('out'); process.stderr.write('err'); process.exit(7)"], env);
      expect(streams).toMatchObject({ code: 7, stdout: "out", stderr: "err" });
      const probe = await run(
        made.sandbox,
        ws,
        node,
        ["-e", "process.stdout.write(JSON.stringify({ canary: process.env.ASCOUT_T1_CANARY ?? null, allowed: process.env.ASCOUT_T1_ALLOWED ?? null, ci: process.env.CI ?? null, temp: process.env.TEMP, writable: (() => { try { require('fs').writeFileSync(require('path').join(process.env.TEMP, 't'), 'x'); return true; } catch { return false; } })() }))"],
        env,
      );
      const seen = JSON.parse(probe.stdout) as { canary: string | null; allowed: string | null; ci: string | null; temp: string; writable: boolean };
      expect(seen.canary).toBeNull();
      expect(seen.allowed).toBe("operator-approved");
      expect(seen.ci).toBe("1");
      expect(seen.temp).toMatch(/\\Packages\\ascout\.sandbox\.[a-z0-9]+\\AC\\Temp$/iu);
      expect(seen.writable).toBe(true);
    } finally {
      await made.sandbox.dispose();
      rmSync(root, { recursive: true, force: true });
    }
  }, 600_000);

  it("refuses hard links in the repository and does not propagate ACL grants through nested NTFS junctions (with host control)", async () => {
    const root = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-t1-link-")));
    try {
      const ws = join(root, "ws");
      const outsideDir = join(root, "outside-dir");
      mkdirSync(join(ws, ".git"), { recursive: true });
      writeFileSync(join(ws, ".git", "HEAD"), "ref: refs/heads/main\n");
      mkdirSync(join(ws, "sub"), { recursive: true });
      mkdirSync(outsideDir, { recursive: true });
      const outsideSecret = join(outsideDir, "secret.txt");
      writeFileSync(outsideSecret, "junction-secret");

      // 1. Hard-link refusal check.
      const hardLink = join(ws, "sub", "hard.txt");
      linkSync(outsideSecret, hardLink);
      try {
        const refused = await prepareWindowsTaskSandboxV1(ws);
        expect(refused).toMatchObject({ refused: expect.stringMatching(/hard-linked/u) });
      } finally {
        rmSync(hardLink, { force: true });
      }

      // 2. Nested NTFS junction inside a top-level folder (ws/sub/escape -> outsideDir) must NOT inherit the container's ACL grant.
      const junction = join(ws, "sub", "escape");
      symlinkSync(outsideDir, junction, "junction");
      const made = await prepareWindowsTaskSandboxV1(ws);
      if ("refused" in made) throw new Error(`the task sandbox is required here but refused: ${made.refused}`);
      try {
        const readViaJunction = script(`require("fs").readFileSync("sub/escape/secret.txt"); r = "read"`);
        const writeViaJunction = script(`require("fs").writeFileSync("sub/escape/pwn.txt", "x")`);
        expect((await run(null, ws, node, readViaJunction)).stdout).toBe("read");
        expect((await run(made.sandbox, ws, node, readViaJunction)).stdout).toBe("EPERM");
        expect((await run(made.sandbox, ws, node, writeViaJunction)).stdout).toBe("EPERM");
        expect(existsSync(join(outsideDir, "pwn.txt"))).toBe(false);
      } finally {
        await made.sandbox.dispose();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
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
    const started0 = Date.now();
    const step = (label: string) => console.log(`T1-WINDOWS-STEP ${label} ${Math.round((Date.now() - started0) / 1000)}s`);
    const t = await setUp();
    step("setup");
    try {
      const npm = win32.join(win32.dirname(node), "npm.cmd");
      if (existsSync(npm)) {
        const version = await run(t.sandbox, t.ws, npm, ["--version"]);
        step(`npm ${JSON.stringify(version).slice(0, 300)}`);
        expect(version.stdout.trim(), JSON.stringify(version)).toMatch(/^\d+\.\d+\.\d+$/u);
      }
      // The job may refuse the detached child outright (it can't break away), or the child may start;
      // either way it must not outlive the task.
      const late = (marker: string) => ["-e", `let c; try { c = require("child_process").spawn(process.execPath, ["-e", "setTimeout(() => require('fs').writeFileSync('${marker.replaceAll("\\", "\\\\\\\\")}', 'x'), 1500)"], { detached: true, stdio: "ignore" }); } catch (e) { process.stdout.write("refused:" + e.code); process.exit(0); } c.on("error", (e) => process.stdout.write("refused:" + e.code)); c.on("spawn", () => { c.unref(); process.stdout.write("started"); }); setTimeout(() => process.exit(0), 500);`];
      // Control: unsandboxed detached child outlives parent and writes late-control.
      const control = await run(null, t.ws, node, late(join(t.ws, "late-control")));
      expect(control.stdout, JSON.stringify(control)).toBe("started");
      await new Promise((resolve) => setTimeout(resolve, 3500));
      expect(existsSync(join(t.ws, "late-control"))).toBe(true);

      // Sandboxed: kill-on-close Job Object terminates the detached child before it can write late-inside.
      const started = await run(t.sandbox, t.ws, node, late(join(t.ws, "late-inside")));
      expect(started.stdout, JSON.stringify(started)).toMatch(/^(started|refused:\w+)$/u);
      await new Promise((resolve) => setTimeout(resolve, 3500));
      expect(existsSync(join(t.ws, "late-inside"))).toBe(false);

      // Node-side afterTask revokes a leaked result-folder grant even when PowerShell is killed mid-task
      // (positive control proves the grant stayed active before afterTask, then EPERM after afterTask).
      const results = join(t.ws, ".ascout", "runs", "r2", "raw", "test");
      mkdirSync(results, { recursive: true });
      const launch = t.sandbox.wrap(node, ["-e", "process.stdout.write('READY\\n'); setTimeout(() => {}, 60000);"], t.ws, [results]);
      await new Promise<void>((resolve, reject) => {
        const killer = spawn(launch.file, [...launch.argv], {
          cwd: t.ws,
          env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH },
          windowsHide: true,
        });
        let seen = "";
        let stderr = "";
        let killed = false;
        const timer = setTimeout(() => {
          if (killer.pid !== undefined) spawnSync("taskkill", ["/PID", String(killer.pid), "/T", "/F"], { windowsHide: true });
          reject(new Error(`timed out waiting for READY; stdout=${seen}; stderr=${stderr}`));
        }, 60_000);
        killer.on("error", (err) => {
          clearTimeout(timer);
          reject(err);
        });
        killer.stdout.on("data", (chunk: Buffer) => {
          seen += chunk.toString();
          if (!killed && seen.includes("READY") && killer.pid !== undefined) {
            killed = true;
            spawnSync("taskkill", ["/PID", String(killer.pid), "/T", "/F"], { windowsHide: true });
          }
        });
        killer.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });
        killer.on("close", () => {
          clearTimeout(timer);
          resolve();
        });
      });
      // Positive control: because run-task.ps1 was killed before its finally block, the container still holds Modify on results.
      expect((await run(t.sandbox, t.ws, node, script(`require("fs").writeFileSync(${JSON.stringify(join(results, "before.json"))}, "{}")`))).stdout).toBe("allowed");
      // Action under test: Node-side afterTask revokes the grant independently of run-task.ps1.
      await t.sandbox.afterTask([results]);
      expect((await run(t.sandbox, t.ws, node, script(`require("fs").writeFileSync(${JSON.stringify(join(results, "after.json"))}, "{}")`))).stdout).toBe("EPERM");
    } finally {
      await t.sandbox.dispose();
      rmSync(t.root, { recursive: true, force: true });
    }
  }, 1_200_000);
});
