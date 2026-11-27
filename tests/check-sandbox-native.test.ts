import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runCli } from "../src/cli.js";

vi.setConfig({ testTimeout: 180_000 });

// `ascout check --sandbox` with the real OS sandbox. On Linux, macOS, and Windows (CI sets
// ASCOUT_REQUIRE_{LINUX,MACOS,WINDOWS}_SANDBOX=1) a hostile typecheck task tries to escape and
// records what happened; a plain `check` of the same repository is the control. On unwired
// platforms, the command must refuse and run nothing.

const scratches: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of scratches.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

function git(root: string, argv: readonly string[]): void {
  const result = spawnSync("git", argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${argv.join(" ")} failed: ${result.stderr}`);
}

/** A repository whose typecheck task attempts three escapes and writes what each one returned. */
function hostileRepository(port: number): { root: string; canary: string } {
  const dir = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-check-sandbox-native-")));
  scratches.push(dir);
  const root = join(dir, "repo");
  const canary = join(dir, "host-secret.txt");
  writeFileSync(canary, "host secret");
  mkdirSync(root);
  // Single line (no CR/LF) so Windows process validation accepts argv across all platforms.
  const task = [
    'const fs = require("node:fs");',
    'const attempt = (fn) => { try { fn(); return "allowed"; } catch (e) { return e.code || String(e); } };',
    `const out = { readOutside: attempt(() => fs.readFileSync(${JSON.stringify(canary)})), writeGit: attempt(() => fs.appendFileSync(".git/config", "")), writeRepo: attempt(() => fs.writeFileSync("written.txt", "ok")) };`,
    `const s = require("node:net").connect(${port}, "127.0.0.1");`,
    'const done = (r) => { out.loopback = r; fs.writeFileSync("result.json", JSON.stringify(out)); process.exit(0); };',
    's.on("connect", () => done("allowed"));',
    's.on("error", (e) => done(e.code));',
    'setTimeout(() => done("timeout"), 5000);',
  ].join(" ");
  writeFileSync(join(root, ".gitignore"), ".ascout/\nresult.json\nwritten.txt\n");
  writeFileSync(join(root, "ascout.config.json"), JSON.stringify({ version: 1, tasks: { typecheck: { command: ["node", "-e", task] } } }));
  for (const argv of [["init", "-q"], ["config", "user.name", "Ascout Sandbox Fixture"], ["config", "user.email", "sandbox@example.invalid"], ["config", "commit.gpgsign", "false"], ["add", "."], ["commit", "-qm", "baseline"]]) git(root, argv);
  return { root, canary };
}

async function checkIn(root: string, argv: readonly string[]): Promise<{ code: number; stderr: string }> {
  const previous = process.cwd();
  const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  process.chdir(root);
  try {
    return { code: await runCli(argv), stderr: stderr.mock.calls.flat().join("\n") };
  } finally {
    process.chdir(previous);
    stderr.mockRestore();
  }
}

/** A repository whose pytestBasic task plants a link to a host file in its writable result folder. */
function linkPlantingRepository(): { root: string; canary: string } {
  const dir = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-check-sandbox-link-")));
  scratches.push(dir);
  const root = join(dir, "repo");
  const canary = join(dir, "host-file.txt");
  writeFileSync(canary, "host file");
  mkdirSync(root);
  const task = `
const fs = require("node:fs");
const run = fs.readdirSync(".ascout/runs")[0];
fs.symlinkSync(${JSON.stringify(canary)}, ".ascout/runs/" + run + "/raw/pytest/pytest-results.xml");
`;
  writeFileSync(join(root, ".gitignore"), ".ascout/\n");
  writeFileSync(join(root, "ascout.config.json"), JSON.stringify({ version: 1, tasks: { pytestBasic: { command: ["node", "-e", task] } } }));
  for (const argv of [["init", "-q"], ["config", "user.name", "Ascout Sandbox Fixture"], ["config", "user.email", "sandbox@example.invalid"], ["config", "commit.gpgsign", "false"], ["add", "."], ["commit", "-qm", "baseline"]]) git(root, argv);
  return { root, canary };
}

describe("ascout check --sandbox with the real OS sandbox", () => {
  it.runIf(process.platform === "linux")("on Linux, stops the run when a task plants a link in its result folder, before Ascout touches it", async (ctx) => {
    const { root, canary } = linkPlantingRepository();
    const { code, stderr } = await checkIn(root, ["check", "--sandbox"]);
    if (code === 2 && stderr.includes("--sandbox refused")) {
      if (process.env.ASCOUT_REQUIRE_LINUX_SANDBOX === "1") throw new Error(`the sandbox is required here but refused: ${stderr}`);
      return ctx.skip();
    }
    expect(code).toBe(2);
    expect(stderr).toMatch(/a sandboxed task left a link at .*raw[\/]pytest/u);
    expect(readFileSync(canary, "utf8")).toBe("host file");
  });

  it.runIf(process.platform !== "linux" && process.platform !== "darwin" && process.platform !== "win32")("refuses on unwired platforms and runs nothing", async () => {
    const { root } = hostileRepository(1);
    const { code, stderr } = await checkIn(root, ["check", "--sandbox"]);
    expect(code).toBe(2);
    expect(stderr).toContain("ascout check --sandbox refused:");
    expect(stderr).toContain("Nothing ran");
    expect(existsSync(join(root, "result.json"))).toBe(false);
  });

  it.runIf(process.platform === "linux")("on Linux, denies every escape the same task makes freely under a plain check", async (ctx) => {
    const server = createServer((socket) => { socket.on("error", Boolean); socket.end(); });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const { root } = hostileRepository((server.address() as { port: number }).port);
      const sandboxed = await checkIn(root, ["check", "--sandbox"]);
      if (sandboxed.code === 2 && sandboxed.stderr.includes("--sandbox refused")) {
        if (process.env.ASCOUT_REQUIRE_LINUX_SANDBOX === "1") throw new Error(`the sandbox is required here but refused: ${sandboxed.stderr}`);
        return ctx.skip();
      }
      expect(JSON.parse(readFileSync(join(root, "result.json"), "utf8"))).toEqual({ readOutside: "ENOENT", writeGit: "EROFS", writeRepo: "allowed", loopback: expect.not.stringMatching(/^allowed$/u) });
      expect(sandboxed.stderr).toContain("containment tier T1 on Linux, internally qualified under Amendment A09");
      // Control: the same task under a plain check reaches all three.
      rmSync(join(root, "result.json"));
      await checkIn(root, ["check"]);
      expect(JSON.parse(readFileSync(join(root, "result.json"), "utf8"))).toEqual({ readOutside: "allowed", writeGit: "allowed", writeRepo: "allowed", loopback: "allowed" });
    } finally {
      server.close();
    }
  });

  it.runIf(process.platform === "darwin")("on macOS, denies every escape via sandbox-exec that a plain check allows", async (ctx) => {
    const server = createServer((socket) => { socket.on("error", Boolean); socket.end(); });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const { root } = hostileRepository((server.address() as { port: number }).port);
      const sandboxed = await checkIn(root, ["check", "--sandbox"]);
      if (sandboxed.code === 2 && sandboxed.stderr.includes("--sandbox refused")) {
        if (process.env.ASCOUT_REQUIRE_MACOS_SANDBOX === "1") throw new Error(`the macOS sandbox is required here but refused: ${sandboxed.stderr}`);
        return ctx.skip();
      }
      expect(sandboxed.code).not.toBe(2);
      expect(JSON.parse(readFileSync(join(root, "result.json"), "utf8"))).toEqual({
        readOutside: "EPERM",
        writeGit: "EPERM",
        writeRepo: "allowed",
        loopback: expect.not.stringMatching(/^allowed$/u),
      });
      expect(sandboxed.stderr).toContain("containment tier T1 on macOS, internally qualified under Amendment A09");
      // Control: the same task under a plain check reaches all three.
      rmSync(join(root, "result.json"));
      await checkIn(root, ["check"]);
      expect(JSON.parse(readFileSync(join(root, "result.json"), "utf8"))).toEqual({ readOutside: "allowed", writeGit: "allowed", writeRepo: "allowed", loopback: "allowed" });
    } finally {
      server.close();
    }
  });

  it.runIf(process.platform === "win32" && process.env.ASCOUT_REQUIRE_WINDOWS_SANDBOX === "1")("on Windows, denies every escape via AppContainer that a plain check allows", async () => {
    const server = createServer((socket) => { socket.on("error", Boolean); socket.end(); });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const { root } = hostileRepository((server.address() as { port: number }).port);
      const sandboxed = await checkIn(root, ["check", "--sandbox"]);
      if (sandboxed.code === 2 && sandboxed.stderr.includes("--sandbox refused")) {
        throw new Error(`the Windows sandbox is required here but refused: ${sandboxed.stderr}`);
      }
      expect(sandboxed.code, sandboxed.stderr).not.toBe(2);
      expect(JSON.parse(readFileSync(join(root, "result.json"), "utf8"))).toEqual({
        readOutside: "EPERM",
        writeGit: "EPERM",
        writeRepo: "allowed",
        loopback: expect.not.stringMatching(/^allowed$/u),
      });
      expect(sandboxed.stderr).toContain("containment tier T1 on Windows, internally qualified under Amendment A09");
      // Control: the same task under a plain check reaches all three.
      rmSync(join(root, "result.json"));
      await checkIn(root, ["check"]);
      expect(JSON.parse(readFileSync(join(root, "result.json"), "utf8"))).toEqual({ readOutside: "allowed", writeGit: "allowed", writeRepo: "allowed", loopback: "allowed" });
    } finally {
      server.close();
    }
  }, 600_000);
});
