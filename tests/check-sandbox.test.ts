import { spawnSync } from "node:child_process";
import { existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { LINUX_SANDBOX_NOTICE } from "../src/assurance/containment/task-sandbox.js";
import { runCheck, sandboxResultFoldersForTask, sandboxResultLink, type CheckTaskSandboxV1 } from "../src/check.js";
import { CliUsageError, parseCliArgs, runCli } from "../src/cli.js";
import { runProcess } from "../src/process.js";
import { writeNodeCommandShim } from "./helpers/native-command-shim.js";

const prepare = vi.hoisted(() => vi.fn());
vi.mock("../src/assurance/containment/task-sandbox.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/assurance/containment/task-sandbox.js")>();
  return { ...actual, prepareTaskSandboxV1: prepare };
});

vi.setConfig({ testTimeout: 180_000 });

// `check --sandbox` (FD-4 T1): every task command goes through the OS sandbox, or nothing runs. These
// tests use a recording wrapper in place of the OS sandbox, on every OS; the native Linux evidence is
// in check-sandbox-native.test.ts.

const scratches: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  prepare.mockReset();
  for (const dir of scratches.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function scratch(): string {
  const dir = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-check-sandbox-")));
  scratches.push(dir);
  return dir;
}

/** A launcher that records each command it is asked to run, then runs it. */
function recordingSandbox(dir: string): { sandbox: CheckTaskSandboxV1; log: string } {
  const log = join(dir, "launches.jsonl");
  const wrapper = join(dir, "wrapper.cjs");
  writeFileSync(wrapper, `const [log, cwd, file, ...args] = process.argv.slice(2);
require("node:fs").appendFileSync(log, JSON.stringify({ file, args, cwd }) + "\\n");
const run = require("node:child_process").spawnSync(file, args, { stdio: "inherit", cwd, shell: process.platform === "win32" && /\\.(?:cmd|bat)$/iu.test(file) });
process.exit(run.status ?? 1);
`);
  return { log, sandbox: { mechanism: "recording", notice: LINUX_SANDBOX_NOTICE, wrap: (file, argv, cwd) => ({ file: process.execPath, argv: [wrapper, log, cwd, file, ...argv] }) } };
}

const launches = (log: string): { file: string; args: string[]; cwd: string }[] => readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line) as { file: string; args: string[]; cwd: string });

function git(root: string, argv: readonly string[]): void {
  const result = spawnSync("git", argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${argv.join(" ")} failed: ${result.stderr}`);
}

/** A repository whose typecheck task records the environment names it saw. */
function repository(dir: string, command: readonly string[]): { root: string; seen: string } {
  const root = join(dir, "repo");
  const seen = join(dir, "seen.json");
  mkdirSync(root);
  writeFileSync(join(root, ".gitignore"), ".ascout/\n");
  writeFileSync(join(root, "ascout.config.json"), JSON.stringify({ version: 1, tasks: { typecheck: { command: [...command, "-e", `require("node:fs").writeFileSync(${JSON.stringify(seen)}, JSON.stringify(Object.keys(process.env)))`] } } }));
  for (const argv of [["init", "-q"], ["config", "user.name", "Ascout Sandbox Fixture"], ["config", "user.email", "sandbox@example.invalid"], ["config", "commit.gpgsign", "false"], ["add", "."], ["commit", "-qm", "baseline"]]) git(root, argv);
  return { root, seen };
}

describe("the --sandbox flag", () => {
  it("parses for check and test, once, with --pass-env, and needs no --clean-env", () => {
    expect(parseCliArgs(["check", "--sandbox"])).toMatchObject({ command: "check", sandbox: true });
    expect(parseCliArgs(["check", "--sandbox", "--pass-env", "DATABASE_URL", "--format", "json"])).toMatchObject({ sandbox: true, passEnv: ["DATABASE_URL"], format: "json" });
    expect(parseCliArgs(["test", "--sandbox"])).toMatchObject({ command: "test", sandbox: true });
    expect(parseCliArgs(["test", "--profile", "standard", "--sandbox", "--pass-env", "CI"])).toMatchObject({ command: "test", sandbox: true, passEnv: ["CI"] });
    expect(parseCliArgs(["check"])).not.toHaveProperty("sandbox");
    for (const argv of [["test", "--plan", "--sandbox"], ["review", "--sandbox"], ["pr-evidence", "--sandbox"], ["check", "--sandbox", "--sandbox"], ["test", "--sandbox", "--sandbox"], ["check", "--pass-env", "A"]]) {
      expect(() => parseCliArgs(argv), argv.join(" ")).toThrow(CliUsageError);
    }
  });
});

describe("a sandbox launcher in runProcess", () => {
  const base = { timeout_ms: 20_000, termination_grace_ms: 100, capture_cap_bytes: 65_536 };

  it("gets the command resolved outside the repository, as an absolute path, and its launcher runs instead", async () => {
    const dir = scratch();
    const seen: string[] = [];
    const result = await runProcess({
      ...base,
      file: "node",
      argv: ["--version"],
      cwd: dir,
      resolve_bare_file_outside: dir,
      wrap: (file, argv) => {
        seen.push(file, ...argv);
        return { file: process.execPath, argv: ["-e", "process.stdout.write('launched')"] };
      },
    });
    expect(Buffer.from(result.stdout.bytes).toString()).toBe("launched");
    expect(seen[0]).toMatch(/node(\.exe)?$/iu);
    expect(seen[0]).not.toBe("node");
    expect(seen.slice(1)).toEqual(["--version"]);
  });

  it("gets a relative command resolved against the working folder", async () => {
    const dir = scratch();
    let got = "";
    await runProcess({ ...base, file: "./tool", argv: [], cwd: dir, wrap: (file) => { got = file; return { file: process.execPath, argv: ["-e", ""] }; } });
    expect(got).toBe(join(dir, "tool"));
  });

  it("starts nothing when the launcher throws, or when the bare command can't be resolved", async () => {
    const dir = scratch();
    const marker = join(dir, "ran");
    const thrown = await runProcess({ ...base, file: process.execPath, argv: ["-e", `require("fs").writeFileSync(${JSON.stringify(marker)}, "x")`], cwd: dir, wrap: () => { throw new Error("sandbox refused"); } });
    expect(thrown.outcome).toBe("error");
    expect(thrown.error?.message).toBe("sandbox refused");
    let called = false;
    const missing = await runProcess({ ...base, file: "ascout-no-such-command", argv: [], cwd: dir, resolve_bare_file_outside: dir, wrap: () => { called = true; return { file: process.execPath, argv: [] }; } });
    expect(missing.outcome).toBe("error");
    expect(called).toBe(false);
    expect(existsSync(marker)).toBe(false);
  });
});

describe("check with a task sandbox", () => {
  it("launches every task through it, with the command resolved outside the repository and the task's folder", async () => {
    const dir = scratch();
    const { sandbox, log } = recordingSandbox(dir);
    const { root, seen } = repository(dir, ["node"]);
    const { receipt } = await runCheck(root, { taskSandbox: sandbox });
    const runs = launches(log);
    expect(runs).toHaveLength(1);
    expect(runs[0]!.file).toMatch(/node(\.exe)?$/iu);
    expect(runs[0]!.file).not.toBe("node");
    expect(runs[0]!.cwd).toBe(root);
    expect(existsSync(seen)).toBe(true);
    expect(receipt.tasks.find((task) => task.task_id === "typecheck")?.status).toBe("PASS");
    // The receipt records the task's own command, never the launcher.
    expect(receipt.tasks.find((task) => task.task_id === "typecheck")?.argv[0]).toBe("node");
  });
});

describe("least-privilege result folders and result-folder entry check", () => {
  it("grants writable result folders only to test and pytestBasic tasks", () => {
    expect(sandboxResultFoldersForTask("/run/raw", "typecheck")).toEqual([]);
    expect(sandboxResultFoldersForTask("/run/raw", "lint")).toEqual([]);
    expect(sandboxResultFoldersForTask("/run/raw", "test")).toEqual([join("/run/raw", "test")]);
    expect(sandboxResultFoldersForTask("/run/raw", "pytestBasic")).toEqual([join("/run/raw", "pytest")]);
  });

  it("finds a symlink, hard link, or socket at any depth, ignores missing folders, and passes plain files and folders", async () => {
    const dir = scratch();
    const results = join(dir, "test");
    mkdirSync(join(results, "deep", "er"), { recursive: true });
    const plainFile = join(results, "deep", "er", "results.json");
    writeFileSync(plainFile, "{}");
    expect(sandboxResultLink([results, join(dir, "missing")])).toBeNull();

    const outside = join(dir, "outside.txt");
    writeFileSync(outside, "host");
    const hardlink = join(results, "deep", "hardlinked.txt");
    linkSync(outside, hardlink);
    expect(sandboxResultLink([results])).toBe(hardlink);
    rmSync(hardlink);

    if (process.platform !== "win32") {
      const sockPath = join(results, "deep", "rogue.sock");
      const server = createServer();
      await new Promise<void>((resolve) => server.listen(sockPath, resolve));
      try {
        expect(sandboxResultLink([results])).toBe(sockPath);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
      rmSync(sockPath, { force: true });
    }

    const link = join(results, "deep", "er", "coverage");
    try {
      symlinkSync(dir, link, "junction");
    } catch {
      return;
    }
    expect(sandboxResultLink([results])).toBe(link);
  });
});

describe("check with a sandboxed task that plants a link in its result folder", () => {
  it("stops the run before reading through the link and invokes afterTask", async () => {
    const dir = scratch();
    const target = join(dir, "host-file.txt");
    writeFileSync(target, "host file");
    const { sandbox } = recordingSandbox(dir);
    let plantedLink = false;
    const afterTask = vi.fn();
    const planting: CheckTaskSandboxV1 = {
      mechanism: "planting",
      afterTask,
      wrap: (file, argv, cwd, writable) => {
        try {
          symlinkSync(dir, join(writable[0]!, "pass-2"), "junction");
          plantedLink = true;
        } catch {
          // Without link rights the wrapper can't plant one; the check below then has nothing to find.
        }
        return sandbox.wrap(file, argv, cwd, writable);
      },
    };
    const root = join(dir, "repo");
    mkdirSync(root);
    writeFileSync(join(root, ".gitignore"), ".ascout/\n");
    writeFileSync(join(root, "ascout.config.json"), JSON.stringify({
      version: 1,
      tasks: { pytestBasic: { command: [process.execPath, "-e", "process.exit(0)"] } },
    }));
    for (const argv of [["init", "-q"], ["config", "user.name", "Ascout Sandbox Fixture"], ["config", "user.email", "sandbox@example.invalid"], ["config", "commit.gpgsign", "false"], ["add", "."], ["commit", "-qm", "baseline"]]) git(root, argv);
    const planted = await runCheck(root, { taskSandbox: planting }).then(() => "finished", (error: Error) => error.message);
    expect(afterTask).toHaveBeenCalledTimes(1);
    expect(planted === "finished").toBe(!plantedLink);
    if (!plantedLink) return;
    expect(planted).toMatch(/a sandboxed task left a link at .*pass-2; Ascout won't read or write through it/u);
    expect(readFileSync(target, "utf8")).toBe("host file");
  });
});

describe("concurrent sandboxed and unsandboxed check runs", () => {
  it("keeps each run isolated via AsyncLocalStorage without cross-run interference", async () => {
    const dir = scratch();
    const slow = join(dir, "slow.cjs");
    writeFileSync(slow, `setTimeout(() => process.exit(0), 500);\n`);
    const wrapped: string[] = [];
    const held: CheckTaskSandboxV1 = {
      mechanism: "slow",
      wrap: (file, _argv, _cwd, writable) => {
        wrapped.push(file);
        expect(writable).toEqual([]);
        return { file: process.execPath, argv: [slow] };
      },
    };
    mkdirSync(join(dir, "a"));
    mkdirSync(join(dir, "b"));
    const first = repository(join(dir, "a"), [process.execPath]);
    const second = repository(join(dir, "b"), [process.execPath]);
    const [firstOutcome, secondOutcome] = await Promise.all([
      runCheck(first.root, { taskSandbox: held }),
      runCheck(second.root),
    ]);
    expect(wrapped).toHaveLength(1);
    expect(firstOutcome.receipt.tasks.find((task) => task.task_id === "typecheck")?.status).toBe("PASS");
    expect(secondOutcome.receipt.tasks.find((task) => task.task_id === "typecheck")?.status).toBe("PASS");
    expect(existsSync(second.seen)).toBe(true);
  });
});

describe("check --sandbox from the command line", () => {
  async function inRepo(root: string, argv: readonly string[]): Promise<{ code: number; stderr: string }> {
    const previous = process.cwd();
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    process.chdir(root);
    try {
      return { code: await runCli(argv), stderr: stderr.mock.calls.flat().join("\n") };
    } finally {
      process.chdir(previous);
    }
  }

  it("refuses with exit 2 and runs nothing when the sandbox can't be prepared", async () => {
    const dir = scratch();
    const { root, seen } = repository(dir, [process.execPath]);
    prepare.mockResolvedValue({ refused: "the bubblewrap task sandbox is Linux only" });
    const { code, stderr } = await inRepo(root, ["check", "--sandbox"]);
    expect(code).toBe(2);
    expect(stderr).toContain("ascout check --sandbox refused: the bubblewrap task sandbox is Linux only. Nothing ran");
    expect(existsSync(seen)).toBe(false);
    expect(prepare).toHaveBeenCalledWith(root);
  });

  it("runs every task through the sandbox with the allowlisted environment, disposes it, and prints its notice", async () => {
    vi.stubEnv("ASCOUT_SANDBOX_PROBE_SECRET", "s3cret");
    vi.stubEnv("ASCOUT_SANDBOX_PASSED", "fine");
    const dir = scratch();
    const { sandbox, log } = recordingSandbox(dir);
    const dispose = vi.fn();
    const { root, seen } = repository(dir, [process.execPath]);
    prepare.mockResolvedValue({ sandbox: { ...sandbox, dispose } });
    const { stderr } = await inRepo(root, ["check", "--sandbox", "--pass-env", "ASCOUT_SANDBOX_PASSED"]);
    expect(launches(log)).toHaveLength(1);
    expect(dispose).toHaveBeenCalledTimes(1);
    const names = (JSON.parse(readFileSync(seen, "utf8")) as string[]).map((name) => name.toUpperCase());
    expect(names).not.toContain("ASCOUT_SANDBOX_PROBE_SECRET");
    expect(names).toContain("ASCOUT_SANDBOX_PASSED");
    expect(stderr).toContain("containment tier T1 on Linux, internally qualified under Amendment A09");
    expect(stderr).not.toContain("--clean-env");
    expect(stderr).toContain("not externally certified or human-audited");
    expect(stderr).toContain("Ascout still supports only repositories you trust");
    for (const limit of ["files stay writable", "Unix socket", "/usr and /etc stay readable", "no seccomp filter", "no CPU or memory limit", "race the sandbox's teardown"]) expect(stderr, limit).toContain(limit);
  });

  it("supports ascout test --sandbox, refuses cleanly on failure, and disposes after execution", async () => {
    const dir = scratch();
    const { root, seen } = repository(dir, [process.execPath]);
    prepare.mockResolvedValue({ refused: "sandbox unavailable" });
    const refused = await inRepo(root, ["test", "--sandbox"]);
    expect(refused.code).toBe(2);
    expect(refused.stderr).toContain("ascout test --sandbox refused: sandbox unavailable. Nothing ran");
    expect(existsSync(seen)).toBe(false);

    const { sandbox, log } = recordingSandbox(dir);
    const dispose = vi.fn();
    prepare.mockResolvedValue({ sandbox: { ...sandbox, notice: "CUSTOM SANDBOX NOTICE", dispose } });
    const ran = await inRepo(root, ["test", "--sandbox", "--format", "json"]);
    expect(ran.code).toBe(4);
    expect(launches(log)).toHaveLength(1);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(ran.stderr).toContain("CUSTOM SANDBOX NOTICE");
  });

  it("seals sandboxed Vitest generated artifacts into host-only raw/sealed/ and verifies pytest JUnit via single-open descriptor", async () => {
    const dir = scratch();
    const { sandbox } = recordingSandbox(dir);
    const root = join(dir, "repo");
    mkdirSync(join(root, "src"), { recursive: true });
    mkdirSync(join(root, "node_modules", ".bin"), { recursive: true });
    mkdirSync(join(root, "node_modules", "vitest"), { recursive: true });
    mkdirSync(join(root, "node_modules", "@vitest", "coverage-v8"), { recursive: true });
    writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
    writeFileSync(join(root, "package.json"), JSON.stringify({
      name: "sealed-fixture",
      version: "1.0.0",
      scripts: { test: "vitest run" },
      devDependencies: { vitest: "4.0.0", "@vitest/coverage-v8": "4.0.0" },
    }));
    writeFileSync(join(root, "node_modules", "vitest", "package.json"), JSON.stringify({ name: "vitest", version: "4.0.0" }));
    writeFileSync(join(root, "node_modules", "@vitest", "coverage-v8", "package.json"), JSON.stringify({ name: "@vitest/coverage-v8", version: "4.0.0" }));
    const stubScript = join(dir, "fake-vitest.cjs");
    writeFileSync(stubScript, `
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
const outArg = args.find((a) => a.startsWith("--outputFile="));
const covArg = args.find((a) => a.startsWith("--coverage.reportsDirectory="));
if (outArg) {
  const outPath = outArg.slice("--outputFile=".length);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ success: true, numTotalTests: 1, numPassedTests: 1, numFailedTests: 0, testResults: [] }));
}
if (covArg) {
  const covDir = covArg.slice("--coverage.reportsDirectory=".length);
  fs.mkdirSync(covDir, { recursive: true });
  fs.writeFileSync(path.join(covDir, "lcov.info"), "SF:src/a.js\\nDA:1,1\\nLF:1\\nLH:1\\nend_of_record\\n");
}
process.exit(0);
`);
    if (process.platform === "win32") {
      writeFileSync(join(root, "node_modules", ".bin", "vitest.cmd"), `@echo off\r\n"${process.execPath}" "${stubScript}" %*\r\n`);
    } else {
      writeFileSync(join(root, "node_modules", ".bin", "vitest"), `#!/bin/sh\nexec "${process.execPath}" "${stubScript}" "$@"\n`, { mode: 0o755 });
    }
    writeFileSync(join(root, "src", "a.js"), "export const a = 1;\n");
    writeFileSync(join(root, "pytest.ini"), "[pytest]\n");
    writeFileSync(join(root, "test_sample.py"), "def test_ok(): pass\n");
    const bin = join(dir, "bin");
    writeNodeCommandShim(bin, "pytest", [
      'const fs = require("node:fs");',
      'const path = require("node:path");',
      'const arg = process.argv.find((a) => a.startsWith("--junitxml="));',
      'if (arg) {',
      '  const target = arg.slice("--junitxml=".length);',
      '  fs.mkdirSync(path.dirname(target), { recursive: true });',
      '  fs.writeFileSync(target, \'<?xml version="1.0"?><testsuites><testsuite name="pytest" errors="0" failures="0" skipped="0" tests="1"><testcase name="ok"/></testsuite></testsuites>\');',
      '}',
      'process.exit(0);',
    ].join("\n"));
    const savedPath = process.env.PATH;
    process.env.PATH = [bin, savedPath ?? ""].join(delimiter);
    try {
      for (const argv of [["init", "-q"], ["config", "user.name", "Ascout Sandbox Fixture"], ["config", "user.email", "sandbox@example.invalid"], ["config", "commit.gpgsign", "false"], ["add", "."], ["commit", "-qm", "baseline"]]) git(root, argv);
      writeFileSync(join(root, "src", "a.js"), "export const a = 2;\n");

      const { receipt } = await runCheck(root, { taskSandbox: sandbox });
      const sealed = receipt.artifacts.filter((a) => a.relative_run_path.startsWith("raw/sealed/"));
      expect(sealed.length).toBeGreaterThanOrEqual(2);
      for (const artifact of sealed) {
        expect(existsSync(join(root, ".ascout", "runs", receipt.run.run_id, ...artifact.relative_run_path.split("/")))).toBe(true);
      }
      const pytestTask = receipt.tasks.find((t) => t.task_id === "pytestBasic");
      expect(pytestTask?.authorized_by).toBe("discovery");
      expect(pytestTask?.argv.some((arg) => arg.startsWith("--junitxml="))).toBe(true);
      expect(pytestTask?.status).toBe("PASS");
    } finally {
      if (savedPath === undefined) delete process.env.PATH;
      else process.env.PATH = savedPath;
    }
  });

  it("is not prepared, and nothing is wrapped, without the flag", async () => {
    const dir = scratch();
    const { root, seen } = repository(dir, [process.execPath]);
    await inRepo(root, ["check"]);
    expect(prepare).not.toHaveBeenCalled();
    expect(existsSync(seen)).toBe(true);
  });
});
