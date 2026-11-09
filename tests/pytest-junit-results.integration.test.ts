import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";
import { junitResultRecordsFailure } from "../src/test-result-outcome.js";
import { writeNodeCommandShim } from "./helpers/native-command-shim.js";

const CLEAN = '<?xml version="1.0"?><testsuites><testsuite name="pytest" errors="0" failures="0" skipped="0" tests="2"><testcase name="a"/><testcase name="b"/></testsuite></testsuites>';
const FAILING = '<?xml version="1.0"?><testsuites><testsuite name="pytest" errors="0" failures="1" skipped="0" tests="2"><testcase name="a"/><testcase name="b"><failure message="boom"/></testcase></testsuite></testsuites>';

describe("junitResultRecordsFailure", () => {
  it("finds no failure in a clean report", () => {
    expect(junitResultRecordsFailure(CLEAN)).toBe(false);
  });

  it.each([
    ["a failure count", FAILING],
    ["an error count", CLEAN.replace('errors="0"', 'errors="1"')],
    ["a failure element with zero counts", CLEAN.replace('<testcase name="b"/>', '<testcase name="b"><failure/></testcase>')],
    ["an error element with zero counts", CLEAN.replace('<testcase name="b"/>', '<testcase name="b"><error/></testcase>')],
    ["a suite with no failure count", CLEAN.replace(' failures="0"', "")],
    ["no test suite at all", '<?xml version="1.0"?><testsuites/>'],
    ["not XML", "garbage"],
  ])("finds a failure in %s", (_label, xml) => {
    expect(junitResultRecordsFailure(xml)).toBe(true);
  });
});

function git(root: string, argv: readonly string[]): void {
  const result = spawnSync("git", argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${argv.join(" ")} failed: ${result.stderr}`);
}

const savedPath = process.env.PATH;
const scratches: string[] = [];

afterEach(() => {
  if (savedPath === undefined) delete process.env.PATH;
  else process.env.PATH = savedPath;
  for (const dir of scratches.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A pytest repository whose stand-in pytest exits 0 and writes `report`, or no report when null. */
async function checkWithReport(report: string | null): Promise<Awaited<ReturnType<typeof runCheck>>> {
  const scratch = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-pytest-junit-")));
  scratches.push(scratch);
  const root = join(scratch, "repo");
  const bin = join(scratch, "bin");
  mkdirSync(root);
  writeNodeCommandShim(bin, "pytest", [
    'const fs = require("node:fs");',
    'const path = require("node:path");',
    'const arg = process.argv.find((value) => value.startsWith("--junitxml="));',
    `const report = ${JSON.stringify(report)};`,
    "if (arg && report !== null) {",
    '  const target = arg.slice("--junitxml=".length);',
    "  fs.mkdirSync(path.dirname(target), { recursive: true });",
    "  fs.writeFileSync(target, report);",
    "}",
    "process.exit(0);",
  ].join("\n"));
  process.env.PATH = [bin, savedPath ?? ""].join(delimiter);
  writeFileSync(join(root, ".gitignore"), ".ascout/\n");
  writeFileSync(join(root, "pytest.ini"), "[pytest]\n");
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Ascout Pytest Fixture"]);
  git(root, ["config", "user.email", "pytest@example.invalid"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-qm", "baseline"]);
  return runCheck(root);
}

describe("check with pytest's JUnit report", () => {
  it("does not pass pytest when it exits 0 but its report records a failure", async () => {
    const { receipt } = await checkWithReport(FAILING);
    expect(receipt.tasks.find(({ task_id }) => task_id === "pytestBasic")).toMatchObject({ status: "ERROR", reason_code: "test_exit_contradicts_results" });
    expect(receipt.summary.exit_code).toBe(2);
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
  }, 30_000);

  it("does not pass pytest when it exits 0 without writing a report", async () => {
    const { receipt } = await checkWithReport(null);
    expect(receipt.tasks.find(({ task_id }) => task_id === "pytestBasic")).toMatchObject({ status: "ERROR", reason_code: "pytest_results_missing" });
  }, 30_000);

  it("still passes pytest when its report is clean", async () => {
    const { receipt } = await checkWithReport(CLEAN);
    const task = receipt.tasks.find(({ task_id }) => task_id === "pytestBasic");
    expect(task).toMatchObject({ status: "PASS" });
    // The report path is repository-relative, so no absolute path reaches the receipt.
    expect(task?.argv.some((arg) => arg.startsWith("--junitxml=.ascout/runs/"))).toBe(true);
  }, 30_000);
});
