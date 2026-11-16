import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runCheck, sandboxResultLink, type CheckTaskSandboxV1 } from "../src/check.js";
import { CliUsageError, parseCliArgs, runCli } from "../src/cli.js";
import { runProcess } from "../src/process.js";

const prepare = vi.hoisted(() => vi.fn());
vi.mock("../src/assurance/containment/linux-task-sandbox.js", () => ({ prepareLinuxTaskSandboxV1: prepare }));

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
const run = require("node:child_process").spawnSync(file, args, { stdio: "inherit", cwd });
process.exit(run.status ?? 1);
`);
  return { log, sandbox: { mechanism: "recording", wrap: (file, argv, cwd) => ({ file: process.execPath, argv: [wrapper, log, cwd, file, ...argv] }) } };
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
  it("parses for check only, once, with --pass-env, and needs no --clean-env", () => {
    expect(parseCliArgs(["check", "--sandbox"])).toMatchObject({ command: "check", sandbox: true });
    expect(parseCliArgs(["check", "--sandbox", "--pass-env", "DATABASE_URL", "--format", "json"])).toMatchObject({ sandbox: true, passEnv: ["DATABASE_URL"], format: "json" });
    expect(parseCliArgs(["check"])).not.toHaveProperty("sandbox");
    for (const argv of [["test", "--sandbox"], ["review", "--sandbox"], ["pr-evidence", "--sandbox"], ["check", "--sandbox", "--sandbox"], ["check", "--pass-env", "A"]]) {
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

describe("the result-folder link check", () => {
  it("finds a link at any depth, ignores missing folders, and passes plain files and folders", () => {
    const dir = scratch();
    const results = join(dir, "test");
    mkdirSync(join(results, "deep", "er"), { recursive: true });
    writeFileSync(join(results, "deep", "er", "results.json"), "{}");
    expect(sandboxResultLink([results, join(dir, "missing")])).toBeNull();
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
  it("stops the run before reading through the link", async () => {
    const dir = scratch();
    const target = join(dir, "host-file.txt");
    writeFileSync(target, "host file");
    const { sandbox } = recordingSandbox(dir);
    let plantedLink = false;
    const planting: CheckTaskSandboxV1 = {
      mechanism: "planting",
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
    const { root } = repository(dir, [process.execPath]);
    const planted = await runCheck(root, { taskSandbox: planting }).then(() => "finished", (error: Error) => error.message);
    // A run that finished is acceptable only when the link could not be planted at all.
    expect(planted === "finished").toBe(!plantedLink);
    if (!plantedLink) return;
    expect(planted).toMatch(/a sandboxed task left a link at .*pass-2; Ascout won't read or write through it/u);
    expect(readFileSync(target, "utf8")).toBe("host file");
  });
});

describe("a task launched while a sandboxed run is in progress", () => {
  it("fails without starting when it has lost its sandbox, instead of running unsandboxed", async () => {
    const dir = scratch();
    const slow = join(dir, "slow.cjs");
    writeFileSync(slow, `setTimeout(() => process.exit(0), 3000);\n`);
    const held: CheckTaskSandboxV1 = { mechanism: "slow", wrap: (_file, _argv) => ({ file: process.execPath, argv: [slow] }) };
    mkdirSync(join(dir, "a"));
    mkdirSync(join(dir, "b"));
    const first = repository(join(dir, "a"), [process.execPath]);
    const second = repository(join(dir, "b"), [process.execPath]);
    const sandboxed = runCheck(first.root, { taskSandbox: held });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const unsandboxed = await runCheck(second.root).then(() => "ran", (error: Error) => error.message);
    await sandboxed;
    expect(unsandboxed).toBe("a sandboxed run lost its sandbox before launching a task; nothing was started");
    expect(existsSync(second.seen)).toBe(false);
    // Once the sandboxed run is over, a plain run works again.
    await runCheck(second.root);
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

  it("runs every task through the sandbox with the allowlisted environment, and says the tier is still T0", async () => {
    vi.stubEnv("ASCOUT_SANDBOX_PROBE_SECRET", "s3cret");
    vi.stubEnv("ASCOUT_SANDBOX_PASSED", "fine");
    const dir = scratch();
    const { sandbox, log } = recordingSandbox(dir);
    const { root, seen } = repository(dir, [process.execPath]);
    prepare.mockResolvedValue({ sandbox });
    const { stderr } = await inRepo(root, ["check", "--sandbox", "--pass-env", "ASCOUT_SANDBOX_PASSED"]);
    expect(launches(log)).toHaveLength(1);
    const names = (JSON.parse(readFileSync(seen, "utf8")) as string[]).map((name) => name.toUpperCase());
    expect(names).not.toContain("ASCOUT_SANDBOX_PROBE_SECRET");
    expect(names).toContain("ASCOUT_SANDBOX_PASSED");
    expect(stderr).toContain("containment tier T1 on Linux, internally qualified under Amendment A09");
    expect(stderr).not.toContain("--clean-env");
    expect(stderr).toContain("not externally certified or human-audited");
    expect(stderr).toContain("Ascout still supports only repositories you trust");
    for (const limit of ["files stay writable", "Unix socket", "/usr and /etc stay readable", "no seccomp filter", "no CPU or memory limit", "race the sandbox's teardown"]) expect(stderr, limit).toContain(limit);
  });

  it("is not prepared, and nothing is wrapped, without the flag", async () => {
    const dir = scratch();
    const { root, seen } = repository(dir, [process.execPath]);
    await inRepo(root, ["check"]);
    expect(prepare).not.toHaveBeenCalled();
    expect(existsSync(seen)).toBe(true);
  });
});
