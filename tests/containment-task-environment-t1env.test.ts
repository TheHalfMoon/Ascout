import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { CAPABILITY_PROBE_IDS, runCapabilityProbesV1, type ProbeRunnerV1 } from "../src/assurance/containment/capability-probes.js";
import { currentContainmentV1 } from "../src/assurance/containment/containment-tier.js";
import { allowlistedTaskEnvNamesV1, allowlistedTaskEnvironmentV1, testRunnerEnvironmentV1 } from "../src/assurance/containment/task-environment.js";
import { runCheck } from "../src/check.js";
import { CliUsageError, parseCliArgs, runCli } from "../src/cli.js";
import { writeNodeCommandShim } from "./helpers/native-command-shim.js";

vi.setConfig({ testTimeout: 180_000 });

// FD-4 phase T1-ENV: `check --clean-env` gives every task an allowlisted environment. It removes one
// capability, reading the caller's environment, and claims nothing else: the tier stays T0.
describe("the allowlisted task environment", () => {
  const source = { PATH: "/bin", HOME: "/home/u", GITHUB_TOKEN: "ghs_secret", AWS_SECRET_ACCESS_KEY: "aws", NODE_OPTIONS: "--require x", DATABASE_URL: "pg://", EMPTY: undefined };

  it("keeps only what tools need to start, plus CI=1, and drops every credential", () => {
    expect(allowlistedTaskEnvironmentV1(source, "linux")).toEqual({ PATH: "/bin", HOME: "/home/u", CI: "1" });
  });

  it("passes through only the names the operator names, and only when they are set", () => {
    expect(allowlistedTaskEnvironmentV1(source, "linux", ["DATABASE_URL", "EMPTY", "MISSING"])).toEqual({ PATH: "/bin", HOME: "/home/u", DATABASE_URL: "pg://", CI: "1" });
  });

  it("matches names exactly on POSIX and without case on Windows, keeping the caller's spelling", () => {
    const mixed = { Path: "C:\\bin", systemroot: "C:\\Windows", TEMP: "C:\\t", Secret: "s", database_url: "pg://" };
    expect(allowlistedTaskEnvironmentV1(mixed, "win32", ["DATABASE_URL"])).toEqual({ Path: "C:\\bin", systemroot: "C:\\Windows", TEMP: "C:\\t", database_url: "pg://", CI: "1" });
    expect(allowlistedTaskEnvironmentV1(mixed, "linux", ["DATABASE_URL"])).toEqual({ TEMP: "C:\\t", CI: "1" });
  });

  it("adds Windows system names only on Windows", () => {
    expect(allowlistedTaskEnvNamesV1("win32")).toContain("SystemRoot");
    expect(allowlistedTaskEnvNamesV1("darwin")).not.toContain("SystemRoot");
  });

  it("sets CI once on Windows, whatever spelling was passed", () => {
    expect(allowlistedTaskEnvironmentV1({ ci: "0", Path: "C:\\bin" }, "win32", ["ci"])).toEqual({ Path: "C:\\bin", CI: "1" });
    expect(allowlistedTaskEnvironmentV1({ ci: "0", CI: "0" }, "linux", ["ci", "CI"])).toEqual({ ci: "0", CI: "1" });
  });

  it.each(["", "1ABC", "A-B", "A=B", "A B", "x".repeat(129), "__proto__"])("refuses %j as a name to pass", (name) => {
    expect(() => allowlistedTaskEnvironmentV1(source, "linux", [name])).toThrow(/not an environment variable name/u);
  });

  it("gives test runners the allowlisted environment when there is one, else the caller's, always with CI=1", () => {
    expect(testRunnerEnvironmentV1({ PATH: "/bin" }, source)).toEqual({ PATH: "/bin", CI: "1" });
    expect(testRunnerEnvironmentV1(undefined, { A: "1", CI: "0" })).toEqual({ A: "1", CI: "1" });
  });
});

describe("native capability probes under the allowlisted environment", () => {
  it("deny the environment secret and nothing else: files and network stay reachable, so the tier stays T0", async () => {
    const { t0ProbeRunnerV1 } = await import("../src/assurance/containment/capability-probes.js");
    const allowlisted: ProbeRunnerV1 = (script, task, env, cwd) => t0ProbeRunnerV1(script, task, allowlistedTaskEnvironmentV1(env, process.platform), cwd);
    const report = await runCapabilityProbesV1("T1-ENV", allowlisted);
    expect(report.results.map((result) => [result.id, result.verdict])).toEqual(CAPABILITY_PROBE_IDS.map((id) => [id, id === "environment_secret" ? "DENIED" : "ALLOWED"]));
    expect(report.all_denied).toBe(false);
    expect(currentContainmentV1()).toMatchObject({ tier: "T0", filesystem_isolation: "NONE", network_isolation: "NONE" });
  }, 60_000);
});

function git(root: string, argv: readonly string[]): void {
  const result = spawnSync("git", argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${argv.join(" ")} failed: ${result.stderr}`);
}

const scratches: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const dir of scratches.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A repository whose typecheck task records which environment names it saw. */
function repository(): { root: string; seen: string } {
  const scratch = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-t1env-")));
  scratches.push(scratch);
  const root = join(scratch, "repo");
  const seen = join(scratch, "seen.json");
  spawnSync(process.execPath, ["-e", `require("node:fs").mkdirSync(${JSON.stringify(root)})`]);
  writeFileSync(join(root, ".gitignore"), ".ascout/\n");
  writeFileSync(join(root, "ascout.config.json"), JSON.stringify({
    version: 1,
    tasks: { typecheck: { command: [process.execPath, "-e", `require("node:fs").writeFileSync(${JSON.stringify(seen)}, JSON.stringify(Object.keys(process.env)))`] } },
  }));
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Ascout T1-ENV Fixture"]);
  git(root, ["config", "user.email", "t1env@example.invalid"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-qm", "baseline"]);
  return { root, seen };
}

const names = (path: string): string[] => (JSON.parse(readFileSync(path, "utf8")) as string[]).map((name) => name.toUpperCase());

describe("check with an allowlisted task environment", () => {
  it("gives tasks the caller's whole environment by default, as T0 always has", async () => {
    vi.stubEnv("ASCOUT_T1ENV_PROBE_SECRET", "s3cret");
    const { root, seen } = repository();
    const previous = process.cwd();
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.chdir(root);
    try {
      await runCli(["check"]);
    } finally {
      process.chdir(previous);
    }
    expect(names(seen)).toContain("ASCOUT_T1ENV_PROBE_SECRET");
    expect(stderr.mock.calls.flat().join("\n")).not.toContain("--clean-env");
  });

  it("keeps the caller's secrets from every task when asked, and passes through only named variables", async () => {
    vi.stubEnv("ASCOUT_T1ENV_PROBE_SECRET", "s3cret");
    vi.stubEnv("ASCOUT_T1ENV_PASSED", "fine");
    const { root, seen } = repository();
    await runCheck(root, { taskEnvironment: allowlistedTaskEnvironmentV1(process.env, process.platform, ["ASCOUT_T1ENV_PASSED"]) });
    const got = names(seen);
    expect(got).not.toContain("ASCOUT_T1ENV_PROBE_SECRET");
    expect(got).toContain("ASCOUT_T1ENV_PASSED");
    expect(got).toContain("PATH");
  });

  it("runs from the command line with --clean-env and says the tier is still T0", async () => {
    vi.stubEnv("ASCOUT_T1ENV_PROBE_SECRET", "s3cret");
    const { root, seen } = repository();
    const previous = process.cwd();
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.chdir(root);
    try {
      await runCli(["check", "--clean-env"]);
    } finally {
      process.chdir(previous);
    }
    expect(names(seen)).not.toContain("ASCOUT_T1ENV_PROBE_SECRET");
    expect(stderr.mock.calls.flat().join("\n")).toContain("Containment is still T0");
  });
});

/** A Vitest repository whose runner records the environment names each pass saw. */
function vitestRepository(): { root: string; seen: string } {
  const scratch = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-t1env-vitest-")));
  scratches.push(scratch);
  const root = join(scratch, "repo");
  const seen = join(scratch, "seen.json");
  mkdirSync(join(root, "src"), { recursive: true });
  cpSync(resolve("node_modules"), join(root, "node_modules"), { recursive: true });
  const binRoot = join(root, "node_modules", ".bin");
  rmSync(binRoot, { recursive: true, force: true });
  writeNodeCommandShim(binRoot, "vitest", `const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
fs.writeFileSync(${JSON.stringify(seen)}, JSON.stringify(Object.keys(process.env)));
const outputPath = args.find((arg) => arg.startsWith("--outputFile=")).slice("--outputFile=".length);
const coverageDirectory = args.find((arg) => arg.startsWith("--coverage.reportsDirectory=")).slice("--coverage.reportsDirectory=".length);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(coverageDirectory, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify({ testResults: [{ name: "a.test.js" }] }));
fs.writeFileSync(path.join(coverageDirectory, "lcov.info"), "SF:src/a.js\\nDA:1,1\\nend_of_record\\n");
process.exit(0);
`);
  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "t1env-fixture", private: true, type: "module", devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" } }));
  writeFileSync(join(root, "vitest.config.mjs"), "export default { test: { globals: true } };\n");
  writeFileSync(join(root, "src", "a.js"), "export const a = 1;\n");
  for (const argv of [["init", "-q"], ["config", "user.name", "Ascout T1-ENV Fixture"], ["config", "user.email", "t1env@example.invalid"], ["config", "commit.gpgsign", "false"], ["add", "."], ["commit", "-qm", "baseline"]]) git(root, argv);
  writeFileSync(join(root, "src", "a.js"), "export const a = 2;\n");
  return { root, seen };
}

describe("the test runner under --clean-env", () => {
  it("runs Vitest without the caller's secrets, with CI=1", async () => {
    vi.stubEnv("ASCOUT_T1ENV_PROBE_SECRET", "s3cret");
    const { root, seen } = vitestRepository();
    const { receipt } = await runCheck(root, { taskEnvironment: allowlistedTaskEnvironmentV1(process.env, process.platform) });
    expect(receipt.tasks.some((task) => task.task_id === "test")).toBe(true);
    const got = names(seen);
    expect(got).not.toContain("ASCOUT_T1ENV_PROBE_SECRET");
    expect(got).toContain("CI");
  }, 300_000);
});

describe("every task launch in check", () => {
  it("goes through one place, so the allowlisted environment can't be bypassed by a new call site", () => {
    const source = readFileSync(resolve("src/check.ts"), "utf8");
    expect(source.match(/\brunProcess\(/gu)).toHaveLength(1);
    expect(source).not.toMatch(/\.\.\.process\.env/u);
  });
});

describe("the --clean-env and --pass-env flags", () => {
  it("parse for check only, once, with valid names, and --pass-env needs --clean-env", () => {
    expect(parseCliArgs(["check", "--clean-env", "--pass-env", "A_B", "--pass-env", "C"])).toMatchObject({ command: "check", cleanEnv: true, passEnv: ["A_B", "C"] });
    expect(parseCliArgs(["check"])).not.toHaveProperty("cleanEnv");
    expect(parseCliArgs(["check", "--clean-env", "--format", "json"])).toMatchObject({ cleanEnv: true, format: "json" });
    for (const argv of [
      ["review", "--clean-env"],
      ["check", "--clean-env", "--clean-env"],
      ["check", "--pass-env", "A"],
      ["check", "--clean-env", "--pass-env"],
      ["check", "--clean-env", "--pass-env", "A-B"],
      ["test", "--pass-env", "A"],
    ]) {
      expect(() => parseCliArgs(argv), argv.join(" ")).toThrow(CliUsageError);
    }
  });
});
