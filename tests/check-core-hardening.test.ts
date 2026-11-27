import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  combineTestPasses,
  maybeAppendWideningPass,
  replaceEmptyRelatedPass,
  runCheck,
  taskDidExecuteV1,
} from "../src/check.js";
import { ASCOUT_PACKAGE_VERSION } from "../src/version.js";

const roots: string[] = [];
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_TERMINAL_PROMPT: "0",
};

function git(root: string, argv: readonly string[]): void {
  execFileSync("git", [...argv], { cwd: root, env: GIT_ENV, windowsHide: true, stdio: "pipe" });
}

function makeRepo(config: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-core-hardening-"));
  roots.push(root);
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Ascout Test"]);
  git(root, ["config", "user.email", "ascout@example.invalid"]);
  git(root, ["config", "commit.gpgsign", "false"]);
  git(root, ["config", "core.autocrlf", "false"]);
  writeFileSync(join(root, ".gitignore"), ".ascout/\n");
  writeFileSync(join(root, "ascout.config.json"), JSON.stringify(config, null, 2));
  writeFileSync(join(root, "index.js"), "export const x = 1;\n");
  git(root, ["add", "--all"]);
  git(root, ["commit", "-q", "-m", "base"]);
  return root;
}

afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe("PR 1 core hardening (version, refuseUnsupportedRepository, budgetMs, terminationGraceMs)", () => {
  it("aligns ASCOUT_PACKAGE_VERSION and receipt.run.ascout_version with package.json and respects non-exhausted budgetMs", async () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, "..", "package.json"), "utf8")) as { version: string };
    expect(ASCOUT_PACKAGE_VERSION).toBe(pkg.version);

    const root = makeRepo({
      version: 1,
      budgetMs: 60_000,
      timeouts: { terminationGraceMs: 250 },
      tasks: {
        typecheck: { command: [process.execPath, "-e", "process.exit(0)"] },
      },
    });
    const { receipt } = await runCheck(root);
    expect(receipt.run.ascout_version).toBe(pkg.version);
    expect(receipt.tasks.find((task) => task.task_id === "typecheck")?.status).toBe("PASS");

    // Also exercise default non-budgeted runCheck path without custom terminationGraceMs.
    const defaultRoot = makeRepo({
      version: 1,
      tasks: {
        typecheck: { command: [process.execPath, "-e", "process.exit(0)"] },
      },
    });
    const defaultRun = await runCheck(defaultRoot);
    expect(defaultRun.receipt.tasks.find((task) => task.task_id === "typecheck")?.status).toBe("PASS");
  }, 60_000);

  it("refuses running runCheck from a repository subdirectory without leaving .ascout/ behind", async () => {
    const root = makeRepo({ version: 1 });
    const sub = join(root, "nested");
    mkdirSync(sub);
    await expect(runCheck(sub)).rejects.toThrow(/must run from the repository root/u);
    expect(existsSync(join(sub, ".ascout"))).toBe(false);
  }, 60_000);

  it("enforces exhausted run budgetMs across planned tasks and clears selection.passes for budget-skipped test", async () => {
    const root = makeRepo({
      version: 1,
      budgetMs: 1,
      timeouts: { terminationGraceMs: 200 },
      tasks: {
        typecheck: { command: [process.execPath, "-e", "setTimeout(() => process.exit(0), 250)"] },
        lint: { command: [process.execPath, "-e", "process.exit(0)"] },
      },
    });
    // Also register a discovered Vitest package so test is planned and budget-skipped cleanly.
    mkdirSync(join(root, "node_modules", ".bin"), { recursive: true });
    mkdirSync(join(root, "node_modules", "vitest"), { recursive: true });
    mkdirSync(join(root, "node_modules", "@vitest", "coverage-v8"), { recursive: true });
    writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
    writeFileSync(join(root, "package.json"), JSON.stringify({
      name: "budget-fixture",
      version: "1.0.0",
      scripts: { test: "vitest run" },
      devDependencies: { vitest: "4.0.0", "@vitest/coverage-v8": "4.0.0" },
    }));
    writeFileSync(join(root, "node_modules", "vitest", "package.json"), JSON.stringify({ name: "vitest", version: "4.0.0" }));
    writeFileSync(join(root, "node_modules", "@vitest", "coverage-v8", "package.json"), JSON.stringify({ name: "@vitest/coverage-v8", version: "4.0.0" }));
    writeFileSync(join(root, "node_modules", ".bin", process.platform === "win32" ? "vitest.cmd" : "vitest"), "exit 0\n");
    git(root, ["add", ".gitignore", "package.json"]);
    git(root, ["commit", "-q", "-m", "add-vitest"]);
    writeFileSync(join(root, "index.js"), "export const x = 2;\n");
    // Also change a non-JS file so pre-run widening fires; budget skip must still reset widening cleanly.
    writeFileSync(join(root, "README.md"), "# changed\n");

    const { receipt } = await runCheck(root);
    const lint = receipt.tasks.find((task) => task.task_id === "lint");
    const test = receipt.tasks.find((task) => task.task_id === "test");
    expect(lint?.status).toBe("NOT_RUN");
    expect(lint?.reason_code).toBe("run_budget_exhausted");
    expect(test?.status).toBe("NOT_RUN");
    expect(test?.reason_code).toBe("run_budget_exhausted");
    expect(receipt.selection.widened).toBe(false);
    expect(receipt.selection.widen_triggers).toEqual([]);
    expect(receipt.selection.passes).toEqual([]);
  }, 60_000);

  it("treats a budget-exhausted pass 2 in combineTestPasses as ERROR with preserved pass-1 finish timestamp", () => {
    const baseTask = {
      task_id: "test",
      task_type: "test" as const,
      authorized_by: "discovery" as const,
      source_path: "package.json",
      argv: ["vitest"],
      argv_redacted: false,
      tool_name: "vitest",
      tool_version: "4.0.0",
      command_surface_changed: false,
      changed_authority_paths: [],
      execution_admission: "normal" as const,
      exit_code: 0,
      started_at: "2026-11-27T00:00:00.000Z",
      finished_at: "2026-11-27T00:00:01.000Z",
      duration_ms: 1000,
      observations: { runs: 1, failures: 0 },
      cache_state: "not_applicable" as const,
      evidence_ids: [],
      artifact_refs: [],
      output_truncated: false,
    };
    const combined = combineTestPasses(
      {
        task: { ...baseTask, status: "PASS", reason_code: null, reason_text: null },
        evidence: [],
        artifacts: [],
        coveragePoints: [],
        branchPoints: null,
        selectedTestCounts: [1],
        machineResults: [],
      },
      {
        task: {
          ...baseTask,
          tool_name: null,
          tool_version: null,
          status: "NOT_RUN",
          reason_code: "run_budget_exhausted",
          reason_text: "Task was not launched because the configured run budgetMs was exhausted.",
          exit_code: null,
          started_at: null,
          finished_at: null,
          duration_ms: null,
          observations: { runs: 0, failures: 0 },
        },
        evidence: [],
        artifacts: [],
        coveragePoints: null,
        branchPoints: null,
        selectedTestCounts: [null],
        machineResults: [],
      },
    );
    expect(combined.task.status).toBe("ERROR");
    expect(combined.task.reason_code).toBe("run_budget_exhausted");
    expect(combined.task.finished_at).toBe("2026-11-27T00:00:01.000Z");
    expect(combined.task.duration_ms).toBe(1000);

    expect(taskDidExecuteV1("PASS")).toBe(true);
    expect(taskDidExecuteV1("FAIL")).toBe(true);
    expect(taskDidExecuteV1("ERROR")).toBe(false);
    expect(taskDidExecuteV1("NOT_RUN")).toBe(false);

    const firstErrored = combineTestPasses(
      {
        task: { ...baseTask, status: "ERROR", reason_code: "vitest_evidence_invalid", reason_text: "bad pass 1" },
        evidence: [],
        artifacts: [],
        coveragePoints: null,
        branchPoints: null,
        selectedTestCounts: [null],
        machineResults: [],
      },
      {
        task: { ...baseTask, status: "PASS", reason_code: null, reason_text: null },
        evidence: [],
        artifacts: [],
        coveragePoints: [],
        branchPoints: null,
        selectedTestCounts: [1],
        machineResults: [],
      },
    );
    expect(firstErrored.task.status).toBe("ERROR");
    expect(firstErrored.task.reason_code).toBe("vitest_evidence_invalid");
    expect(combined.task.tool_name).toBe("vitest");

    // replaceEmptyRelatedPass handles both normal pass 2 and budget-exhausted NOT_RUN pass 2.
    const emptyReplacedPass = replaceEmptyRelatedPass(
      {
        task: { ...baseTask, status: "ERROR", reason_code: "vitest_evidence_invalid", reason_text: "empty" },
        evidence: [],
        artifacts: [],
        coveragePoints: null,
        branchPoints: null,
        selectedTestCounts: [0],
        machineResults: [],
      },
      {
        task: { ...baseTask, status: "PASS", finished_at: "2026-11-27T00:00:02.000Z", reason_code: null, reason_text: null },
        evidence: [],
        artifacts: [],
        coveragePoints: [],
        branchPoints: null,
        selectedTestCounts: [1],
        machineResults: [],
      },
    );
    expect(emptyReplacedPass.task.status).toBe("PASS");
    expect(emptyReplacedPass.task.duration_ms).toBe(2000);

    const emptyReplacedSkipped = replaceEmptyRelatedPass(
      {
        task: { ...baseTask, status: "ERROR", reason_code: "vitest_evidence_invalid", reason_text: "empty" },
        evidence: [],
        artifacts: [],
        coveragePoints: null,
        branchPoints: null,
        selectedTestCounts: [0],
        machineResults: [],
      },
      {
        task: {
          ...baseTask,
          tool_name: null,
          tool_version: null,
          status: "NOT_RUN",
          reason_code: "run_budget_exhausted",
          reason_text: "budget exhausted",
          exit_code: null,
          started_at: null,
          finished_at: null,
          duration_ms: null,
          observations: { runs: 0, failures: 0 },
        },
        evidence: [],
        artifacts: [],
        coveragePoints: null,
        branchPoints: null,
        selectedTestCounts: [null],
        machineResults: [],
      },
    );
    expect(emptyReplacedSkipped.task.status).toBe("ERROR");
    expect(emptyReplacedSkipped.task.tool_name).toBe("vitest");
    expect(emptyReplacedSkipped.task.tool_version).toBe("4.0.0");
    expect(emptyReplacedSkipped.task.finished_at).toBe("2026-11-27T00:00:01.000Z");
    expect(emptyReplacedSkipped.task.duration_ms).toBe(1000);

    // maybeAppendWideningPass skips appending a pass when pass 2 was NOT_RUN.
    const baseSelection = {
      mode: "native_related" as const,
      initial_scope: { kind: "repository" as const, path: null },
      selected_test_count: 1,
      deselected_test_count: 0,
      total_test_count: 1,
      widened: false,
      widen_triggers: [] as string[],
      passes: [
        {
          ordinal: 1 as const,
          mode: "native_related" as const,
          scope: { kind: "repository" as const, path: null },
          trigger: null,
          selected_test_count: 1,
          deselected_test_count: 0,
          total_test_count: 1,
        },
      ],
      limitations: [] as string[],
    };
    expect(maybeAppendWideningPass(baseSelection, "NOT_RUN", ".").passes).toHaveLength(1);
    expect(maybeAppendWideningPass(baseSelection, "PASS", ".").passes).toHaveLength(2);
  });

  it("handles non-executed targeted flake rerun cleanly when cancelled during rerun", async () => {
    const root = makeRepo({
      version: 1,
      timeouts: { terminationGraceMs: 200 },
    });
    mkdirSync(join(root, "node_modules", ".bin"), { recursive: true });
    mkdirSync(join(root, "node_modules", "vitest"), { recursive: true });
    mkdirSync(join(root, "node_modules", "@vitest", "coverage-v8"), { recursive: true });
    writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\nrerun-started\n");
    writeFileSync(join(root, "package.json"), JSON.stringify({
      name: "flake-budget-fixture",
      version: "1.0.0",
      scripts: { test: "vitest run" },
      devDependencies: { vitest: "4.0.0", "@vitest/coverage-v8": "4.0.0" },
    }));
    writeFileSync(join(root, "node_modules", "vitest", "package.json"), JSON.stringify({ name: "vitest", version: "4.0.0" }));
    writeFileSync(join(root, "node_modules", "@vitest", "coverage-v8", "package.json"), JSON.stringify({ name: "@vitest/coverage-v8", version: "4.0.0" }));
    const marker = join(root, "rerun-started");
    const stubScript = join(root, "fake-vitest-fail.cjs");
    writeFileSync(stubScript, `
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
const outArg = args.find((a) => a.startsWith("--outputFile="));
const covArg = args.find((a) => a.startsWith("--coverage.reportsDirectory="));
if (!covArg) {
  fs.writeFileSync(${JSON.stringify(marker)}, "started");
  setTimeout(() => process.exit(1), 30000);
} else {
  if (outArg) {
    const outPath = outArg.slice("--outputFile=".length);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify({
      success: false,
      numTotalTests: 1,
      numPassedTests: 0,
      numFailedTests: 1,
      testResults: [{
        name: path.join(process.cwd(), "index.test.js"),
        status: "failed",
        assertionResults: [{ fullName: "adds numbers", title: "adds numbers", status: "failed", failureMessages: ["boom"] }],
      }],
    }));
  }
  const covDir = covArg.slice("--coverage.reportsDirectory=".length);
  fs.mkdirSync(covDir, { recursive: true });
  fs.writeFileSync(path.join(covDir, "lcov.info"), "SF:index.js\\nDA:1,1\\nLF:1\\nLH:1\\nend_of_record\\n");
  process.exit(1);
}
`);
    if (process.platform === "win32") {
      writeFileSync(join(root, "node_modules", ".bin", "vitest.cmd"), `@echo off\r\n"${process.execPath}" "${stubScript}" %*\r\n`);
    } else {
      writeFileSync(join(root, "node_modules", ".bin", "vitest"), `#!/bin/sh\nexec "${process.execPath}" "${stubScript}" "$@"\n`, { mode: 0o755 });
    }
    git(root, ["add", ".gitignore", "package.json", "fake-vitest-fail.cjs"]);
    git(root, ["commit", "-q", "-m", "add-failing-vitest"]);
    writeFileSync(join(root, "index.js"), "export const x = 4;\n");

    const controller = new AbortController();
    const timer = setInterval(() => {
      if (existsSync(marker)) {
        clearInterval(timer);
        controller.abort();
      }
    }, 25);
    try {
      const { receipt } = await runCheck(root, { signal: controller.signal });
      const test = receipt.tasks.find((task) => task.task_id === "test");
      expect(test?.status).toBe("FAIL");
      expect(existsSync(marker)).toBe(true);
    } finally {
      clearInterval(timer);
    }
  }, 60_000);

  it("enforces exhausted run budgetMs on a planned Jest test task", async () => {
    const root = makeRepo({
      version: 1,
      budgetMs: 1,
      tasks: {
        typecheck: { command: [process.execPath, "-e", "setTimeout(() => process.exit(0), 250)"] },
      },
    });
    mkdirSync(join(root, "node_modules", ".bin"), { recursive: true });
    mkdirSync(join(root, "node_modules", "jest"), { recursive: true });
    writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
    writeFileSync(join(root, "package.json"), JSON.stringify({
      name: "jest-budget-fixture",
      version: "1.0.0",
      scripts: { test: "jest" },
      devDependencies: { jest: "29.7.0" },
    }));
    writeFileSync(join(root, "node_modules", "jest", "package.json"), JSON.stringify({ name: "jest", version: "29.7.0" }));
    writeFileSync(join(root, "node_modules", ".bin", process.platform === "win32" ? "jest.cmd" : "jest"), "exit 0\n");
    git(root, ["add", ".gitignore", "package.json"]);
    git(root, ["commit", "-q", "-m", "add-jest"]);
    writeFileSync(join(root, "index.js"), "export const x = 3;\n");

    const { receipt } = await runCheck(root);
    const test = receipt.tasks.find((task) => task.task_id === "test");
    expect(test?.status).toBe("NOT_RUN");
    expect(test?.reason_code).toBe("run_budget_exhausted");
    expect(receipt.selection.passes).toEqual([]);
  }, 60_000);
});
