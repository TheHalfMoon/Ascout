import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Amendment A07 section 5.4: exits proved through the compiled CLI as a real child process.
// Project CI runs tests before its build step, so this compiles its own copy.
const PROJECT_ROOT = resolve(__dirname, "..");
const OUT_DIR = join(PROJECT_ROOT, "node_modules", ".cache", "ascout-a07-cli");
const CLI = join(OUT_DIR, "cli.js");
const CASE_TIMEOUT_MS = 300_000;
const SCOPE_STATEMENT = "committed changes and ignored files were not considered";
const POSIX = process.platform !== "win32";

const temporaryRoots: string[] = [];

interface CliResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

function cli(cwd: string, args: readonly string[], nodeArgs: readonly string[] = []): CliResult {
  // The A07 security rows describe the command without an engine, so the opt-in is cleared.
  const env = { ...process.env };
  delete env.ASCOUT_GITLEAKS_PATH;
  const result = spawnSync(process.execPath, [...nodeArgs, CLI, ...args], {
    cwd,
    env,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error !== undefined) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(join(realpathSync(tmpdir()), prefix));
  temporaryRoots.push(directory);
  return directory;
}

function git(root: string, ...args: readonly string[]): void {
  const result = spawnSync("git", [...args], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
}

function repository(): string {
  const root = temporaryDirectory("ascout-a07-repo-");
  git(root, "init", "-q");
  git(root, "config", "user.name", "Ascout A07");
  git(root, "config", "user.email", "a07@example.invalid");
  git(root, "config", "commit.gpgsign", "false");
  mkdirSync(join(root, "sub"));
  mkdirSync(join(root, "other"));
  writeFileSync(join(root, "a.txt"), "base\n");
  writeFileSync(join(root, "b.txt"), "base\n");
  writeFileSync(join(root, "sub", "keep.txt"), "base\n");
  writeFileSync(join(root, "other", "keep.txt"), "base\n");
  writeFileSync(join(root, ".gitignore"), "ignored.txt\n");
  git(root, "add", ".");
  git(root, "commit", "-qm", "baseline");
  return root;
}

interface ReviewJson {
  readonly kind: string;
  readonly outcome: string;
  readonly exit_code: number;
  readonly reason_code: string;
  readonly reason_text: string;
  readonly executed_count: number;
  readonly considered: string;
  readonly comparison: { readonly kind: string; readonly base_ref: string };
  readonly reasons?: readonly string[];
  readonly absence?: {
    readonly complete: boolean;
    readonly reasons: readonly string[];
    readonly unreviewed_files: readonly string[];
  };
  readonly unreviewed_changes: readonly {
    readonly path: string;
    readonly change_kind: string;
    readonly previous_path?: string;
  }[];
}

function expectReview(root: string): ReviewJson {
  const json = cli(root, ["review", "--format", "json"]);
  expect(json.status, json.stderr).toBe(4);
  const report = JSON.parse(json.stdout) as ReviewJson;
  expect(report).toMatchObject({
    outcome: "NOT_RUN",
    exit_code: 4,
    reason_code: "ENGINE_NOT_EXECUTED",
    executed_count: 0,
    considered: "working_tree_and_index_only",
  });
  expect(report.comparison.kind).toBe("working_tree_vs_head");
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim();
  expect(report.comparison.base_ref).toBe(head);
  expect(report.reason_text).toContain(SCOPE_STATEMENT);
  expect(report.absence?.reasons ?? report.reasons).toContain(SCOPE_STATEMENT);

  const terminal = cli(root, ["review"]);
  expect(terminal.status).toBe(4);
  expect(terminal.stdout).toBe("");
  expect(terminal.stderr).toContain("NOT_RUN");
  expect(terminal.stderr).toContain(SCOPE_STATEMENT);
  expect(terminal.stderr).toContain("exit code: 4");
  expect(terminal.stderr).toContain("considered: working_tree_and_index_only");
  expect(terminal.stderr).toContain(report.reason_text);
  for (const change of report.unreviewed_changes) {
    expect(terminal.stderr).toContain(change.path);
    if (change.previous_path !== undefined) {
      expect(terminal.stderr).toContain(`from ${change.previous_path}`);
    }
  }
  return report;
}

function changedPaths(report: ReviewJson): readonly string[] {
  return report.unreviewed_changes.map((change) => change.path);
}

function expectOperationalErrorInBothFormats(cwd: string, command: string): void {
  for (const args of [[command, "--format", "json"], [command]]) {
    expectOperationalError(cli(cwd, args));
  }
}

function expectOperationalError(result: CliResult): void {
  expect(result.status, result.stderr).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.stderr.length).toBeGreaterThan(0);
}

beforeAll(() => {
  rmSync(OUT_DIR, { recursive: true, force: true });
  const compile = spawnSync(
    process.execPath,
    [join(PROJECT_ROOT, "node_modules", "typescript", "bin", "tsc"), "-p", join(PROJECT_ROOT, "tsconfig.json"), "--outDir", OUT_DIR],
    { cwd: PROJECT_ROOT, encoding: "utf8" },
  );
  expect(compile.status, compile.stdout + compile.stderr).toBe(0);
  writeFileSync(join(OUT_DIR, "package.json"), JSON.stringify({ type: "module" }));
}, CASE_TIMEOUT_MS);

afterAll(() => {
  rmSync(OUT_DIR, { recursive: true, force: true });
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("A07 review exits through the compiled CLI", { timeout: CASE_TIMEOUT_MS }, () => {
  it("exits 4 on a clean tree, including with unpushed commits and ignored-only changes", () => {
    const root = repository();
    const clean = expectReview(root);
    expect(clean.kind).toBe("empty");
    expect(clean.unreviewed_changes).toEqual([]);
    expect(clean.reasons?.join(" ")).not.toContain("no changed files");
    expect(clean.reasons).toContain("the working tree matches HEAD, apart from .ascout/");

    writeFileSync(join(root, "a.txt"), "committed\n");
    git(root, "commit", "-qam", "unreviewed work");
    expect(expectReview(root).kind).toBe("empty");

    writeFileSync(join(root, "ignored.txt"), "ignored\n");
    expect(expectReview(root).unreviewed_changes).toEqual([]);
  });

  it("exits 4 and lists every path for a dirty tree with unpushed commits", () => {
    const root = repository();
    writeFileSync(join(root, "b.txt"), "committed\n");
    git(root, "commit", "-qam", "unreviewed work");
    writeFileSync(join(root, "a.txt"), "changed\n");
    const report = expectReview(root);
    expect(report.absence?.complete).toBe(false);
    expect(changedPaths(report)).toEqual(["a.txt"]);
  });

  it("lists deleted paths for an edit plus deletion, and for deletions only", () => {
    const mixed = repository();
    writeFileSync(join(mixed, "a.txt"), "changed\n");
    unlinkSync(join(mixed, "b.txt"));
    const mixedReport = expectReview(mixed);
    expect([...changedPaths(mixedReport)].sort()).toEqual(["a.txt", "b.txt"]);
    expect([...(mixedReport.absence?.unreviewed_files ?? [])].sort()).toEqual(["a.txt", "b.txt"]);

    const onlyDeleted = repository();
    unlinkSync(join(onlyDeleted, "b.txt"));
    const deletedReport = expectReview(onlyDeleted);
    expect(deletedReport.kind).toBe("absence");
    expect(deletedReport.unreviewed_changes).toEqual([{ path: "b.txt", change_kind: "deleted" }]);
  });

  it("reports one entry with both paths for git mv", () => {
    const root = repository();
    git(root, "mv", "a.txt", "moved.txt");
    const report = expectReview(root);
    expect(report.unreviewed_changes).toEqual([
      { path: "moved.txt", change_kind: "renamed", previous_path: "a.txt" },
    ]);
  });

  it("reports one entry for git rm --cached with the file on disk", () => {
    const root = repository();
    git(root, "rm", "-q", "--cached", "a.txt");
    expect(expectReview(root).unreviewed_changes).toEqual([{ path: "a.txt", change_kind: "deleted" }]);
  });

  it("orders entries as tracked, then untracked, then staged-only", () => {
    const root = repository();
    writeFileSync(join(root, "a.txt"), "staged\n");
    git(root, "add", "a.txt");
    writeFileSync(join(root, "a.txt"), "base\n");
    writeFileSync(join(root, "b.txt"), "changed\n");
    writeFileSync(join(root, "0-new.txt"), "new\n");
    expect(expectReview(root).unreviewed_changes).toEqual([
      { path: "b.txt", change_kind: "modified" },
      { path: "0-new.txt", change_kind: "untracked" },
      { path: "a.txt", change_kind: "modified" },
    ]);
  });

  it("lists untracked-only and ordinary staged changes", () => {
    const untracked = repository();
    writeFileSync(join(untracked, "new.txt"), "new\n");
    expect(changedPaths(expectReview(untracked))).toEqual(["new.txt"]);

    const staged = repository();
    writeFileSync(join(staged, "a.txt"), "staged\n");
    git(staged, "add", "a.txt");
    expect(changedPaths(expectReview(staged))).toEqual(["a.txt"]);
  });

  it("lists staged changes the working tree no longer shows", () => {
    const restored = repository();
    writeFileSync(join(restored, "a.txt"), "staged\n");
    git(restored, "add", "a.txt");
    writeFileSync(join(restored, "a.txt"), "base\n");
    const restoredReport = expectReview(restored);
    expect(restoredReport.kind).toBe("absence");
    expect(changedPaths(restoredReport)).toContain("a.txt");

    const removed = repository();
    writeFileSync(join(removed, "staged-new.txt"), "new\n");
    git(removed, "add", "staged-new.txt");
    unlinkSync(join(removed, "staged-new.txt"));
    expect(changedPaths(expectReview(removed))).toContain("staged-new.txt");
  });

  it("lists binary changes, and mode-only changes where the platform has them", () => {
    const binary = repository();
    writeFileSync(join(binary, "a.txt"), Buffer.from([0, 1, 2, 0, 255]));
    expect(changedPaths(expectReview(binary))).toEqual(["a.txt"]);

    const stagedMode = repository();
    git(stagedMode, "update-index", "--chmod=+x", "a.txt");
    expect(changedPaths(expectReview(stagedMode))).toContain("a.txt");

    if (POSIX) {
      const mode = repository();
      chmodSync(join(mode, "a.txt"), 0o755);
      expect(changedPaths(expectReview(mode))).toEqual(["a.txt"]);
    }
  });

  it("lists both paths of an unstaged move", () => {
    const root = repository();
    writeFileSync(join(root, "moved.txt"), "base\n");
    unlinkSync(join(root, "a.txt"));
    expect([...changedPaths(expectReview(root))].sort()).toEqual(["a.txt", "moved.txt"]);
  });

  it.skipIf(!POSIX)("does not let a path forge terminal report lines", () => {
    const root = repository();
    writeFileSync(join(root, "x\noutcome: PASS"), "new\n");
    const result = cli(root, ["review"]);
    expect([2, 4]).toContain(result.status);
    expect(result.stderr.split("\n")).not.toContain("outcome: PASS");
  });

  it("exits 2 from a subdirectory for tracked and untracked changes inside and outside it", () => {
    const setups: readonly ((root: string) => void)[] = [
      (root) => writeFileSync(join(root, "a.txt"), "changed\n"),
      (root) => writeFileSync(join(root, "other", "new.txt"), "new\n"),
      (root) => writeFileSync(join(root, "sub", "keep.txt"), "changed\n"),
      (root) => writeFileSync(join(root, "sub", "new.txt"), "new\n"),
    ];
    for (const setup of setups) {
      const root = repository();
      setup(root);
      for (const args of [["review", "--format", "json"], ["review"]]) {
        const result = cli(join(root, "sub"), args);
        expectOperationalError(result);
        expect(result.stderr).toContain("must run from the repository root");
        expect(result.stderr).not.toContain(root);
      }
    }
  });

  it("runs the subdirectory check before any other Git read", () => {
    const root = temporaryDirectory("ascout-a07-unborn-");
    git(root, "init", "-q");
    mkdirSync(join(root, "sub"));
    for (const command of ["review", "check"]) {
      const result = cli(join(root, "sub"), [command]);
      expectOperationalError(result);
      expect(result.stderr).toContain("must run from the repository root");
    }
  });

  it("exits 2 on an unborn HEAD instead of reporting empty", () => {
    const root = temporaryDirectory("ascout-a07-unborn-");
    git(root, "init", "-q");
    expectOperationalErrorInBothFormats(root, "review");
  });
});

describe("A07 test and security exits through the compiled CLI", { timeout: CASE_TIMEOUT_MS }, () => {
  const inputs: readonly (readonly string[])[] = [
    [],
    ["--profile", "quick"],
    ["--profile", "standard"],
    ["--profile", "deep"],
    ["--profile", "release"],
  ];

  it("exits 4 for test and 0 for test --plan, inside and outside a repository", () => {
    const inside = repository();
    for (const cwd of [inside, temporaryDirectory("ascout-a07-norepo-")]) {
      for (const input of inputs) {
        const json = cli(cwd, ["test", ...input, "--format", "json"]);
        expect(json.status, json.stderr).toBe(4);
        const report = JSON.parse(json.stdout) as { profile: string; reason_text: string };
        if (cwd !== inside || report.profile === "QUICK") {
          // Nothing ran: QUICK has no qualified engine, and outside a repository check can't run.
          expect(report).toMatchObject({
            outcome: "NOT_RUN",
            exit_code: 4,
            // QUICK never looks for a repository, so its reason is the same everywhere.
            reason_code: report.profile === "QUICK" ? "ENGINE_NOT_QUALIFIED" : "NO_REPOSITORY",
            executed_count: 0,
          });
          expect(report.reason_text).toContain(`required by the ${report.profile} profile did not run`);
        } else {
          // check ran on a repository with no applicable tasks, so its result is incomplete.
          expect(report).toMatchObject({
            outcome: "INCOMPLETE",
            exit_code: 4,
            reason_code: "CHECK_INCOMPLETE",
            check: { exit_code: 4 },
          });
        }
        const terminal = cli(cwd, ["test", ...input]);
        expect(terminal.status, terminal.stderr).toBe(4);
        expect(terminal.stderr).toContain(report.reason_text);

        const planJson = cli(cwd, ["test", "--plan", ...input, "--format", "json"]);
        expect(planJson.status).toBe(0);
        expect(JSON.parse(planJson.stdout)).toMatchObject({
          outcome: "NON_ASSURANCE_PLAN",
          exit_code: 0,
          reason_code: "PLAN_ONLY",
          executed_count: 0,
        });
        expect(planJson.stdout).not.toMatch(/\bPASS(ED)?\b/u);
        expect(planJson.stdout).toContain("not a test result");
        const planTerminal = cli(cwd, ["test", "--plan", ...input]);
        expect(planTerminal.status).toBe(0);
        expect(planTerminal.stderr).toContain("NON_ASSURANCE_PLAN");
      }
    }
  });

  it("exits 2 for --plan on another command or repeated, and for other usage errors", () => {
    const cwd = temporaryDirectory("ascout-a07-usage-");
    for (const args of [
      ["review", "--plan"],
      ["security", "--plan"],
      ["check", "--plan"],
      ["doctor", "--plan"],
      ["init", "--plan"],
      ["test", "--plan", "--plan"],
      [],
      ["unknown"],
    ]) {
      const result = cli(cwd, args);
      expect(result.status, args.join(" ")).toBe(2);
      expect(result.stderr).toContain("Usage:");
    }
  });

  it("exits 4 for security inside and outside a repository", () => {
    for (const cwd of [repository(), temporaryDirectory("ascout-a07-norepo-")]) {
      const json = cli(cwd, ["security", "--format", "json"]);
      expect(json.status).toBe(4);
      const report = JSON.parse(json.stdout) as { reason_text: string };
      expect(report).toMatchObject({
        outcome: "NOT_RUN",
        exit_code: 4,
        reason_code: "ENGINE_NOT_EXECUTED_IN_UA_P06",
        executed_count: 0,
      });
      expect(report.reason_text.length).toBeGreaterThan(0);
      const terminal = cli(cwd, ["security"]);
      expect(terminal.status).toBe(4);
      expect(terminal.stderr).toContain("NOT_RUN");
    }
  });
});

describe("A07 operational errors through the compiled CLI", { timeout: CASE_TIMEOUT_MS }, () => {
  it("exits 2 outside a repository for check, review, and doctor", () => {
    const cwd = temporaryDirectory("ascout-a07-norepo-");
    for (const args of [["check", "--format", "json"], ["review", "--format", "json"], ["review"], ["doctor"]]) {
      const result = cli(cwd, args);
      expectOperationalError(result);
      expect(result.stderr).not.toContain(cwd);
    }
  });

  it("exits 2 for check from a subdirectory with an untracked file outside it, with no receipt", () => {
    const root = repository();
    writeFileSync(join(root, "other", "new.txt"), "new\n");
    const result = cli(join(root, "sub"), ["check", "--format", "json"]);
    expectOperationalError(result);
    expect(result.stderr).toContain("must run from the repository root");
    expect(existsSync(join(root, ".ascout"))).toBe(false);
    expect(existsSync(join(root, "sub", ".ascout"))).toBe(false);
  });

  it("prints usage for --help, -h, and help, and the package version for --version, on stdout with exit 0", () => {
    const cwd = temporaryDirectory("ascout-a07-help-");
    for (const flag of ["--help", "-h", "help"]) {
      const result = cli(cwd, [flag]);
      expect(result.status, flag).toBe(0);
      expect(result.stdout, flag).toContain("Usage:");
      expect(result.stdout, flag).toContain("ascout --help | --version");
      expect(result.stderr, flag).toBe("");
    }
    const version = cli(cwd, ["--version"]);
    expect(version.status).toBe(0);
    expect(version.stdout).toBe(`${(JSON.parse(readFileSync(resolve("package.json"), "utf8")) as { version: string }).version}\n`);
  });

  it("treats help and version as usage errors anywhere but the sole argument", () => {
    const cwd = temporaryDirectory("ascout-a07-help-");
    for (const args of [["--help", "check"], ["check", "--help"], ["--version", "x"], ["-v"], ["--HELP"]]) {
      const result = cli(cwd, args);
      expect(result.status, args.join(" ")).toBe(2);
      expect(result.stdout, args.join(" ")).toBe("");
    }
  });

  it("keeps doctor and init success at exit 0", () => {
    expect(cli(repository(), ["doctor"]).status).toBe(0);
    expect(cli(temporaryDirectory("ascout-a07-init-"), ["init"]).status).toBe(0);
  });

  it.skipIf(!POSIX)("exits 2 from a deleted working directory, while test and security keep their exits", () => {
    for (const [args, expected] of [
      [["init"], 2],
      [["doctor"], 2],
      [["check"], 2],
      [["review"], 2],
      [["test"], 4],
      [["test", "--plan"], 0],
      [["security"], 4],
    ] as const) {
      const parent = temporaryDirectory("ascout-a07-gone-");
      const script = [
        `mkdir gone && cd gone && rmdir ../gone`,
        `"$0" "$1" ${args.join(" ")}`,
        `echo "status=$?"`,
      ].join("; ");
      const result = spawnSync("sh", ["-c", script, process.execPath, CLI], { cwd: parent, encoding: "utf8" });
      expect(result.error).toBeUndefined();
      expect(result.stdout, `${args.join(" ")}: ${result.stderr}`).toContain(`status=${expected}`);
      expect(result.stderr.length, args.join(" ")).toBeGreaterThan(0);
    }
  });
});

function closedPipeStatus(args: readonly string[], stream: "stdout" | "stderr"): Promise<number | null> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd: temporaryDirectory("ascout-a07-pipe-"),
      stdio: ["ignore", "pipe", "pipe"],
    });
    child[stream].destroy();
    child.on("error", reject);
    child.on("close", (status) => resolvePromise(status));
  });
}

describe("A07 stream and process faults through the compiled CLI", { timeout: CASE_TIMEOUT_MS }, () => {
  it("exits 2 when stdout is a closed pipe", async () => {
    expect(await closedPipeStatus(["security", "--format", "json"], "stdout")).toBe(2);
  });

  it("exits 2 when stderr is a closed pipe and terminal output is the only result", async () => {
    expect(await closedPipeStatus(["security"], "stderr")).toBe(2);
  });

  function faultModule(source: string): string {
    const path = join(temporaryDirectory("ascout-a07-fault-"), "fault.mjs");
    writeFileSync(path, source);
    return path;
  }

  // Each fault fires while a result is pending, so a stale handler would let
  // that result, including exit 0 from test --plan, overwrite the error.
  const AFTER_RESULT = `
    const write = process.stdout.write.bind(process.stdout);
    process.stdout.write = (...args) => {
      process.stdout.write = write;
      FAULT;
      return write(...args);
    };
  `;

  it.each([
    ["an uncaught exception", `setImmediate(() => { throw new Error("a07 fault"); })`],
    ["an unhandled rejection", `void Promise.reject(new Error("a07 fault"))`],
  ])("exits 2 on %s, overriding a pending exit 0", (_label, fault) => {
    const module = faultModule(AFTER_RESULT.replace("FAULT", fault));
    const url = new URL(`file:///${module.replaceAll("\\", "/").replace(/^\/+/u, "")}`).href;
    const result = cli(temporaryDirectory("ascout-a07-run-"), ["test", "--plan", "--format", "json"], ["--import", url]);
    expect(result.status, result.stderr).toBe(2);
    expect(result.stderr).toContain("a07 fault");
  });

  it("does not let a pending exit 0 overwrite a fault that fired first", () => {
    const module = faultModule(`
      const then = Promise.prototype.then;
      Promise.prototype.then = function (onFulfilled, onRejected) {
        if (typeof onFulfilled === "function" && String(onFulfilled).includes("process.exitCode")) {
          setImmediate(() => { throw new Error("a07 early fault"); });
          return then.call(
            this,
            (value) => new Promise((resolve) => setTimeout(() => resolve(onFulfilled(value)), 200)),
            onRejected,
          );
        }
        return then.call(this, onFulfilled, onRejected);
      };
    `);
    const url = new URL(`file:///${module.replaceAll("\\", "/").replace(/^\/+/u, "")}`).href;
    const result = cli(temporaryDirectory("ascout-a07-run-"), ["test", "--plan"], ["--import", url]);
    expect(result.status, result.stderr).toBe(2);
    expect(result.stderr).toContain("a07 early fault");
  });

  it("exits 2 on a fault during an in-flight check", () => {
    const module = faultModule(`
      import { existsSync } from "node:fs";
      const timer = setInterval(() => {
        if (process.listenerCount("uncaughtException") > 0 && existsSync(".ascout")) {
          clearInterval(timer);
          throw new Error("a07 in-flight fault");
        }
      }, 1);
    `);
    const url = new URL(`file:///${module.replaceAll("\\", "/").replace(/^\/+/u, "")}`).href;
    const result = cli(repository(), ["check", "--format", "json"], ["--import", url]);
    expect(result.status, result.stderr).toBe(2);
    expect(result.stderr).toContain("a07 in-flight fault");
  });

  it("exits 2 through the entry-point handler, with a redacted error and empty stdout", () => {
    const module = faultModule(`
      process.on("unhandledRejection", () => process.stderr.write("REJECTION_HANDLER_USED\\n"));
      const then = Promise.prototype.then;
      Promise.prototype.then = function (onFulfilled, onRejected) {
        const assignsResult = typeof onFulfilled === "function" && String(onFulfilled).includes("process.exitCode");
        return then.call(
          this,
          assignsResult ? () => { throw new Error("a07 entry fault in " + process.cwd()); } : onFulfilled,
          onRejected,
        );
      };
    `);
    const url = new URL(`file:///${module.replaceAll("\\", "/").replace(/^\/+/u, "")}`).href;
    const cwd = temporaryDirectory("ascout-a07-run-");
    const result = cli(cwd, ["test", "--plan"], ["--import", url]);
    expect(result.status, result.stderr).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("a07 entry fault");
    expect(result.stderr).toContain("<repository>");
    expect(result.stderr).not.toContain(cwd);
    expect(result.stderr).not.toContain("REJECTION_HANDLER_USED");
  });
});

function shellQuoteForPowerShell(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function powerShellExecutable(): string {
  for (const candidate of ["pwsh", "powershell"]) {
    if (spawnSync(candidate, ["-NoProfile", "-Command", "exit 0"], { encoding: "utf8" }).status === 0) {
      return candidate;
    }
  }
  throw new Error("Neither pwsh nor Windows PowerShell is available.");
}

describe("A07 exits as shells observe them", { timeout: CASE_TIMEOUT_MS }, () => {
  const expected = [
    [["test", "--plan"], 0],
    [["security"], 4],
    [["test"], 4],
    [["unknown"], 2],
  ] as const;

  it.skipIf(!POSIX)("reports each exit through POSIX $?", () => {
    for (const [args, status] of expected) {
      const script = `"$0" "$1" ${args.join(" ")}; echo "status=$?"`;
      const result = spawnSync("sh", ["-c", script, process.execPath, CLI], {
        cwd: temporaryDirectory("ascout-a07-sh-"),
        encoding: "utf8",
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`status=${status}`);
    }
  });

  it.skipIf(POSIX)("reports each exit through PowerShell $LASTEXITCODE and $?", () => {
    const shell = powerShellExecutable();
    for (const [args, status] of expected) {
      const command = `& ${shellQuoteForPowerShell(process.execPath)} ${shellQuoteForPowerShell(CLI)} ${args.join(" ")} 2>$null | Out-Null; $ok = $?; Write-Output "status=$LASTEXITCODE ok=$ok"`;
      const result = spawnSync(shell, ["-NoProfile", "-Command", command], {
        cwd: temporaryDirectory("ascout-a07-ps-"),
        encoding: "utf8",
      });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain(`status=${status}`);
      expect(result.stdout).toContain(`ok=${status === 0 ? "True" : "False"}`);
    }
  });
});
