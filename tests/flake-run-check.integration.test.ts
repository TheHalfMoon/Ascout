import { chmodSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";

type Runner = "vitest" | "jest";
type Scenario = "flaky" | "stable" | "rerun-error";

function run(root: string, file: string, argv: readonly string[]): void {
  const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
}

function runnerShim(): string {
  return `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
const valueAfter = (name) => {
  const exact = args.indexOf(name);
  if (exact >= 0) return args[exact + 1] ?? null;
  const prefix = name + "=";
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
};
const outputFile = valueAfter("--outputFile");
const coverageDirectory = valueAfter("--coverage.reportsDirectory") || valueAfter("--coverageDirectory");
if (!outputFile) process.exit(2);
const scenario = fs.readFileSync(path.join(process.cwd(), "t064-scenario.txt"), "utf8").trim();
const counterPath = path.join(process.cwd(), ".ascout", "t064-observation-counter");
fs.mkdirSync(path.dirname(counterPath), { recursive: true });
let ordinal = 1;
if (fs.existsSync(counterPath)) ordinal = Number(fs.readFileSync(counterPath, "utf8")) + 1;
fs.writeFileSync(counterPath, String(ordinal));
const isTargeted = args.includes("--testNamePattern");
if (scenario === "rerun-error" && isTargeted && ordinal === 2) process.exit(2);
const failed = scenario === "flaky" ? ordinal < 3 : true;
const result = {
  success: !failed,
  numTotalTests: 1,
  testResults: [{
    name: path.join(process.cwd(), "tests", "a.test.js"),
    status: failed ? "failed" : "passed",
    assertionResults: [{
      fullName: "suite exact failure",
      title: "exact failure",
      status: failed ? "failed" : "passed",
      failureMessages: failed ? ["expected exact failure"] : [],
    }],
  }],
};
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(result));
if (coverageDirectory) {
  fs.mkdirSync(coverageDirectory, { recursive: true });
  fs.writeFileSync(path.join(coverageDirectory, "lcov.info"), "SF:src/a.js\\nDA:1,1\\nend_of_record\\n");
}
process.exit(failed ? 1 : 0);
`;
}

function initializeFixture(runner: Runner, scenario: Scenario): string {
  const root = mkdtempSync(join(tmpdir(), `ascout-t064-${runner}-${scenario}-`));
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "tests"), { recursive: true });
  cpSync(resolve("node_modules"), join(root, "node_modules"), { recursive: true });
  const binRoot = join(root, "node_modules", ".bin");
  rmSync(binRoot, { recursive: true, force: true });
  mkdirSync(binRoot, { recursive: true });
  const executable = join(binRoot, runner);
  writeFileSync(executable, runnerShim());
  chmodSync(executable, 0o755);

  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
  writeFileSync(join(root, "t064-scenario.txt"), `${scenario}\n`);
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: `t064-${runner}-fixture`,
      private: true,
      type: "module",
      devDependencies: runner === "vitest"
        ? { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" }
        : { jest: "30.4.2" },
    }),
  );
  if (runner === "vitest") {
    writeFileSync(join(root, "vitest.config.mjs"), "export default { test: { globals: true } };\n");
  } else {
    writeFileSync(join(root, "jest.config.mjs"), "export default { testEnvironment: 'node' };\n");
  }
  writeFileSync(join(root, "src", "a.js"), "export const a = 1;\n");
  writeFileSync(join(root, "tests", "a.test.js"), "test('suite exact failure', () => {});\n");

  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.name", "Ascout T064 Fixture"]);
  run(root, "git", ["config", "user.email", "t064@example.invalid"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["commit", "-qm", "baseline"]);
  writeFileSync(join(root, "src", "a.js"), "export const a = 1 + 0;\n");
  return root;
}

async function checkFixture(runner: Runner, scenario: Scenario) {
  const root = initializeFixture(runner, scenario);
  try {
    const receipt = (await runCheck(root)).receipt;
    expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    expect(receipt.stability).toBe("stable");
    expect(receipt.summary.exit_code).toBe(1);
    expect(receipt.findings).toHaveLength(1);
    expect(receipt.findings[0]).toMatchObject({
      task_id: "test",
      producer: runner,
      rule_or_test_id: "suite exact failure",
      path: "tests/a.test.js",
      introduced_by_change: "unknown",
    });
    return receipt;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("T064 runCheck reproduction and flake normalization", () => {
  for (const runner of ["vitest", "jest"] as const) {
    it(`${runner}: converts contradictory exact observations into FLAKY`, async () => {
      const receipt = await checkFixture(runner, "flaky");
      expect(receipt.tasks.find((task) => task.task_type === "test")).toMatchObject({
        status: "FLAKY",
        observations: { runs: 3, failures: 2 },
      });
      expect(receipt.findings[0]).toMatchObject({
        determinism_class: "nondeterministic",
        observations: { runs: 3, failures: 2 },
        reproduced: false,
      });
      expect(receipt.artifacts.some((artifact) => artifact.relative_run_path.includes("rerun-1"))).toBe(true);
      expect(receipt.artifacts.some((artifact) => artifact.relative_run_path.includes("rerun-2"))).toBe(true);
    }, 30_000);

    it(`${runner}: keeps repeated exact failures as FAIL with reproduced=true`, async () => {
      const receipt = await checkFixture(runner, "stable");
      expect(receipt.tasks.find((task) => task.task_type === "test")).toMatchObject({
        status: "FAIL",
        observations: { runs: 3, failures: 3 },
      });
      expect(receipt.findings[0]).toMatchObject({
        determinism_class: "deterministic",
        observations: { runs: 3, failures: 3 },
        reproduced: true,
      });
    }, 30_000);

    it(`${runner}: keeps reproduction unknown when the first targeted rerun is not a valid observation`, async () => {
      const receipt = await checkFixture(runner, "rerun-error");
      expect(receipt.tasks.find((task) => task.task_type === "test")).toMatchObject({
        status: "FAIL",
        observations: { runs: 1, failures: 1 },
      });
      expect(receipt.findings[0]).toMatchObject({
        determinism_class: "unknown",
        observations: { runs: 1, failures: 1 },
        reproduced: "unknown",
      });
      expect(receipt.artifacts.some((artifact) => artifact.relative_run_path.includes("rerun-2"))).toBe(false);
    }, 30_000);
  }
});
