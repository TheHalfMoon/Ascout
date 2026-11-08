import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { ReceiptV1, TaskStatus } from "../src/receipt/model.js";

const checkControl = vi.hoisted(() => ({
  receipt: null as unknown,
  calls: 0,
  args: [] as unknown[][],
  throws: false,
}));

vi.mock("../src/check.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/check.js")>();
  return {
    ...actual,
    runCheck: async (...args: unknown[]) => {
      checkControl.calls += 1;
      checkControl.args.push(args);
      if (checkControl.throws) throw new Error("check failed at " + String(args[0]));
      return { receipt: checkControl.receipt, terminalSummary: "check summary" };
    },
  };
});

import { runCli } from "../src/cli.js";
import {
  buildTestNotRunReportV2,
  testRunResultFromReceiptV1,
} from "../src/assurance/test/test-run-command.js";

const HEAD = "a".repeat(40);
const TREE = "b".repeat(64);

/** The receipt fields the test command reads. The rest of a real receipt is not needed here. */
function receipt(
  exitCode: 0 | 1 | 2 | 3 | 4,
  statuses: readonly TaskStatus[] = ["PASS"],
  taskType: "test" | "typecheck" = "test",
): ReceiptV1 {
  const counts = { PASS: 0, FAIL: 0, FLAKY: 0, BLOCKED: 0, ERROR: 0, NOT_APPLICABLE: 0, NOT_RUN: 0 };
  for (const status of statuses) counts[status] += 1;
  return {
    schema_version: "1.0",
    run: { run_id: "run:fake" },
    source: { start: { head_sha: HEAD, tree_digest: TREE }, end: null },
    tasks: statuses.map((status, index) => ({ task_id: "task" + index, task_type: taskType, status, reason_code: null })),
    summary: {
      exit_code: exitCode,
      completeness: exitCode === 0 ? "complete" : "materially_incomplete",
      finding_count: statuses.filter((status) => status === "FAIL").length,
      task_status_counts: counts,
    },
  } as unknown as ReceiptV1;
}

describe("testRunResultFromReceiptV1", () => {
  it.each([
    ["STANDARD", 0, 0, "COMPLETE", "CHECK_COMPLETE"],
    ["STANDARD", 1, 1, "FINDINGS", "CHECK_FINDINGS"],
    ["STANDARD", 3, 3, "SOURCE_DRIFT", "SOURCE_DRIFT"],
    ["STANDARD", 4, 4, "INCOMPLETE", "CHECK_INCOMPLETE"],
    // DEEP and RELEASE also need engines that never run, so a clean check is not enough.
    ["DEEP", 0, 4, "INCOMPLETE", "REQUIRED_ENGINE_NOT_RUN"],
    ["RELEASE", 0, 4, "INCOMPLETE", "REQUIRED_ENGINE_NOT_RUN"],
    // A07 precedence: a finding (1) and drift (3) beat incomplete work (4).
    ["DEEP", 1, 1, "FINDINGS", "CHECK_FINDINGS"],
    ["RELEASE", 3, 3, "SOURCE_DRIFT", "SOURCE_DRIFT"],
    ["DEEP", 4, 4, "INCOMPLETE", "CHECK_INCOMPLETE"],
    ["DEEP", 3, 3, "SOURCE_DRIFT", "SOURCE_DRIFT"],
    ["RELEASE", 1, 1, "FINDINGS", "CHECK_FINDINGS"],
    ["RELEASE", 4, 4, "INCOMPLETE", "CHECK_INCOMPLETE"],
  ] as const)("maps %s with check exit %i to exit %i (%s)", (profile, checkExit, exit, outcome, reason) => {
    const result = testRunResultFromReceiptV1(profile, receipt(checkExit));
    expect(result.kind).toBe("report");
    if (result.kind !== "report") return;
    expect([result.report.exit_code, result.report.outcome, result.report.reason_code]).toEqual([exit, outcome, reason]);
    expect(result.report.check?.exit_code).toBe(checkExit);
  });

  it.each(["STANDARD", "DEEP", "RELEASE"] as const)("turns a check error into exit 2 with no report (%s)", (profile) => {
    const result = testRunResultFromReceiptV1(profile, receipt(2, ["ERROR"]));
    expect(result.kind).toBe("error");
    if (result.kind === "error") expect(result.message).toContain(".ascout/runs/run:fake/receipt.json");
  });

  it("exits 4 when check completes without running any test task", () => {
    const result = testRunResultFromReceiptV1("STANDARD", receipt(0, ["PASS"], "typecheck"));
    expect(result.kind === "report" && [result.report.exit_code, result.report.reason_code]).toEqual([4, "NO_TEST_EXECUTED"]);
  });

  it.each([
    [0, 4, "NO_TEST_EXECUTED"],
    [3, 0, "CHECK_COMPLETE"],
    [null, 0, "CHECK_COMPLETE"],
  ] as const)("with %s selected tests, a passing test task exits %i (%s)", (selected, exit, reason) => {
    // Vitest runs with --passWithNoTests, so zero selected tests means none ran.
    const base = receipt(0, ["PASS"], "test");
    const withSelection = { ...base, selection: { selected_test_count: selected } } as unknown as ReceiptV1;
    const result = testRunResultFromReceiptV1("STANDARD", withSelection);
    expect(result.kind === "report" && [result.report.exit_code, result.report.reason_code]).toEqual([exit, reason]);
  });

  it("keeps the missing engines visible on a finding", () => {
    const result = testRunResultFromReceiptV1("DEEP", receipt(1, ["FAIL"]));
    expect(result.kind === "report" && result.report.not_run.length).toBe(3);
  });

  it("says the plan's effects are not enforced", () => {
    const result = testRunResultFromReceiptV1("STANDARD", receipt(0));
    expect(result.kind === "report" && result.report.effects_enforced).toBe(false);
  });

  it("lists exactly the engines each profile requires but cannot run", () => {
    const deep = testRunResultFromReceiptV1("DEEP", receipt(0));
    const release = testRunResultFromReceiptV1("RELEASE", receipt(0));
    const standard = testRunResultFromReceiptV1("STANDARD", receipt(0));
    const names = (result: typeof deep) => (result.kind === "report" ? result.report.not_run.map((item) => item.capability) : []);
    expect(names(standard)).toEqual([]);
    expect(names(deep)).toEqual(["mutation", "property-fuzz", "browser"]);
    expect(names(release)).toEqual(["mutation", "property-fuzz", "browser", "contract", "performance-recovery"]);
  });

  it("counts only tasks that executed", () => {
    const result = testRunResultFromReceiptV1("STANDARD", receipt(1, ["PASS", "FAIL", "FLAKY", "NOT_RUN", "NOT_APPLICABLE", "BLOCKED"]));
    expect(result.kind === "report" && result.report.executed_count).toBe(3);
  });

  it("keeps check's per-task statuses and source in the report", () => {
    const result = testRunResultFromReceiptV1("STANDARD", receipt(1, ["PASS", "FAIL"]));
    if (result.kind !== "report") throw new Error("expected a report");
    expect(result.report.check?.tasks.map((task) => task.status)).toEqual(["PASS", "FAIL"]);
    expect(result.report.check?.source_start).toEqual({ head_sha: HEAD, tree_digest: TREE });
  });
});

describe("buildTestNotRunReportV2", () => {
  it("reports QUICK as having no qualified engine", () => {
    const report = buildTestNotRunReportV2("QUICK", "ENGINE_NOT_QUALIFIED");
    expect([report.outcome, report.exit_code, report.executed_count, report.check]).toEqual(["NOT_RUN", 4, 0, null]);
    expect(report.not_run.map((item) => item.capability)).toEqual(["quick-tests"]);
  });

  it("lists check as not run outside a repository", () => {
    const report = buildTestNotRunReportV2("STANDARD", "NO_REPOSITORY");
    expect(report.not_run).toEqual([expect.objectContaining({ capability: "check", reason_code: "NO_REPOSITORY" })]);
  });
});

describe("ascout test running check", { timeout: 60_000 }, () => {
  const originalCwd = process.cwd();
  let repo: string;

  beforeAll(() => {
    repo = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-test-run-")));
    for (const args of [["init", "-q"], ["config", "user.name", "t"], ["config", "user.email", "t@example.invalid"], ["config", "commit.gpgsign", "false"]]) {
      spawnSync("git", args, { cwd: repo });
    }
    writeFileSync(join(repo, "a.txt"), "a\n");
    spawnSync("git", ["add", "."], { cwd: repo });
    spawnSync("git", ["commit", "-qm", "x"], { cwd: repo });
    process.chdir(repo);
  });

  afterAll(() => process.chdir(originalCwd));

  afterEach(() => {
    vi.restoreAllMocks();
    checkControl.calls = 0;
    checkControl.args = [];
    checkControl.throws = false;
  });

  function captured() {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    return {
      stdout,
      stderr,
      json: () => JSON.parse(stdout.mock.calls.map((call) => String(call[0])).join("")),
    };
  }

  it("exits 0 with the check result when check completes and STANDARD needs nothing else", async () => {
    checkControl.receipt = receipt(0);
    const out = captured();
    expect(await runCli(["test", "--format", "json"])).toBe(0);
    expect(checkControl.calls).toBe(1);
    // check runs over this repository with no admission override, and can be cancelled.
    expect(checkControl.args).toEqual([[process.cwd(), { signal: expect.any(AbortSignal) }]]);
    expect(out.json()).toMatchObject({ schema_version: 2, outcome: "COMPLETE", exit_code: 0, executed_count: 1 });
  });

  it("exits 1 for a check failure, even under DEEP's missing engines", async () => {
    checkControl.receipt = receipt(1, ["FAIL"]);
    const out = captured();
    expect(await runCli(["test", "--profile", "deep", "--format", "json"])).toBe(1);
    const report = out.json();
    expect(report).toMatchObject({ outcome: "FINDINGS", exit_code: 1 });
    expect(report.not_run.map((item: { capability: string }) => item.capability)).toEqual(["mutation", "property-fuzz", "browser"]);
  });

  it("exits 2 with stdout empty when check reports an error", async () => {
    checkControl.receipt = receipt(2, ["ERROR"]);
    const out = captured();
    expect(await runCli(["test", "--format", "json"])).toBe(2);
    expect(out.stdout).not.toHaveBeenCalled();
    expect(out.stderr.mock.calls.flat().map(String).join("\n")).toContain("check reported an error");
  });

  it("exits 2 with stdout empty and no path when check throws", async () => {
    checkControl.throws = true;
    const out = captured();
    expect(await runCli(["test", "--format", "json"])).toBe(2);
    expect(out.stdout).not.toHaveBeenCalled();
    expect(out.stderr.mock.calls.flat().map(String).join("\n")).not.toContain(repo);
  });

  it("exits 2 from a repository subdirectory without running check", async () => {
    mkdirSync(join(repo, "sub"), { recursive: true });
    process.chdir(join(repo, "sub"));
    try {
      captured();
      expect(await runCli(["test", "--format", "json"])).toBe(2);
      expect(checkControl.calls).toBe(0);
    } finally {
      process.chdir(repo);
    }
  });

  it("exits 2, not NO_REPOSITORY, when Git fails inside something that looks like a repository", async () => {
    const broken = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-test-broken-")));
    writeFileSync(join(broken, ".git"), "not a gitdir pointer\n");
    process.chdir(broken);
    try {
      captured();
      expect(await runCli(["test", "--format", "json"])).toBe(2);
      expect(checkControl.calls).toBe(0);
    } finally {
      process.chdir(repo);
    }
  });

  it("never runs check for QUICK", async () => {
    checkControl.receipt = receipt(0);
    const out = captured();
    expect(await runCli(["test", "--profile", "quick", "--format", "json"])).toBe(4);
    expect(checkControl.calls).toBe(0);
    expect(out.json()).toMatchObject({ outcome: "NOT_RUN", reason_code: "ENGINE_NOT_QUALIFIED" });
  });

  it("never runs check for --plan", async () => {
    checkControl.receipt = receipt(0);
    captured();
    expect(await runCli(["test", "--plan"])).toBe(0);
    expect(checkControl.calls).toBe(0);
  });

  it("shows check's task statuses and the plan in terminal output", async () => {
    checkControl.receipt = receipt(1, ["PASS", "FAIL"]);
    const out = captured();
    expect(await runCli(["test"])).toBe(1);
    const text = out.stderr.mock.calls.flat().map(String).join("\n");
    expect(text).toContain("=== Ascout Test (FINDINGS) ===");
    expect(text).toContain("task1: FAIL");
    expect(text).toContain("max_wall_time_ms: 300000");
    expect(out.stdout).not.toHaveBeenCalled();
  });
});
