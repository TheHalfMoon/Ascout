import { describe, expect, it } from "vitest";

import {
  planJestTargetedRerun,
  type JestExactFailingTestSelector,
} from "../src/tools/jest-rerun.js";
import type { PlannedJestTask } from "../src/tools/jest.js";
import {
  planVitestTargetedRerun,
  type VitestExactFailingTestSelector,
} from "../src/tools/vitest-rerun.js";
import type { PlannedVitestTask } from "../src/tools/vitest.js";

function vitestPlan(workspace = false): PlannedVitestTask {
  return {
    state: "planned",
    taskType: "test",
    authorizedBy: "discovery",
    sourcePath: workspace ? "packages/a/vitest.config.mjs" : "vitest.config.mjs",
    argv: [workspace ? "../../node_modules/.bin/vitest" : "node_modules/.bin/vitest", "related", "src/a.ts"],
    workingDirectory: workspace ? "packages/a" : null,
    configPath: workspace ? "packages/a/vitest.config.mjs" : "vitest.config.mjs",
    selectionMode: "native_related",
    selectedPaths: [workspace ? "packages/a/src/a.ts" : "src/a.ts"],
    machineResultPath: ".ascout/runs/base/raw/test/vitest-results.json",
    coverageDirectoryPath: ".ascout/runs/base/raw/test/coverage",
    lcovPath: ".ascout/runs/base/raw/test/coverage/lcov.info",
    coverageProvider: "v8",
    toolVersion: "4.1.10",
    reasonCode: null,
    reasonText: null,
  };
}

function jestPlan(workspace = false): PlannedJestTask {
  return {
    state: "planned",
    taskType: "test",
    authorizedBy: "discovery",
    sourcePath: workspace ? "packages/a/jest.config.mjs" : "jest.config.mjs",
    argv: [workspace ? "../../node_modules/.bin/jest" : "node_modules/.bin/jest", "--findRelatedTests", "src/a.ts"],
    workingDirectory: workspace ? "packages/a" : null,
    configPath: workspace ? "packages/a/jest.config.mjs" : "jest.config.mjs",
    selectionMode: "native_related",
    selectedPaths: [workspace ? "packages/a/src/a.ts" : "src/a.ts"],
    machineResultPath: ".ascout/runs/base/raw/test/jest-results.json",
    coverageDirectoryPath: ".ascout/runs/base/raw/test/coverage",
    lcovPath: ".ascout/runs/base/raw/test/coverage/lcov.info",
    toolVersion: "30.0.0",
    reasonCode: null,
    reasonText: null,
  };
}

const VITEST_SELECTOR: VitestExactFailingTestSelector = {
  path: "tests/math.test.ts",
  fullName: "math [edge] adds (a+b)?",
};

const JEST_SELECTOR: JestExactFailingTestSelector = {
  path: "tests/math.test.ts",
  fullName: "math [edge] adds (a+b)?",
};

describe("T063 exact failing-test targeted rerun helpers", () => {
  it("plans one exact Vitest observation with regex-escaped full name and no coverage/widening", () => {
    const plan = planVitestTargetedRerun({
      runId: "run-063",
      basePlan: vitestPlan(),
      selector: VITEST_SELECTOR,
      observationOrdinal: 2,
    });

    expect(plan).toEqual({
      state: "planned",
      observationOrdinal: 2,
      selector: VITEST_SELECTOR,
      argv: [
        "node_modules/.bin/vitest",
        "tests/math.test.ts",
        "--run",
        "--reporter=json",
        "--outputFile=.ascout/runs/run-063/raw/test/rerun-1/vitest-results.json",
        "--testNamePattern",
        "^math \\[edge\\] adds \\(a\\+b\\)\\?(?![\\s\\S])",
        "--config",
        "vitest.config.mjs",
      ],
      workingDirectory: null,
      machineResultPath: ".ascout/runs/run-063/raw/test/rerun-1/vitest-results.json",
      reasonCode: null,
      reasonText: null,
    });
    expect(plan.argv).not.toContain("related");
    expect(plan.argv.some((arg) => arg.includes("coverage"))).toBe(false);
    expect(plan.argv).not.toContain("--passWithNoTests");
  });

  it("keeps Vitest observation 3 inside the authorized workspace and a separate artifact", () => {
    const selector: VitestExactFailingTestSelector = {
      path: "packages/a/tests/a.test.ts",
      fullName: "a suite exact failure",
    };
    const plan = planVitestTargetedRerun({
      runId: "run-063",
      basePlan: vitestPlan(true),
      selector,
      observationOrdinal: 3,
    });

    expect(plan.state).toBe("planned");
    if (plan.state !== "planned") return;
    expect(plan.argv).toEqual([
      "../../node_modules/.bin/vitest",
      "tests/a.test.ts",
      "--run",
      "--reporter=json",
      "--outputFile=../../.ascout/runs/run-063/raw/test/rerun-2/vitest-results.json",
      "--testNamePattern",
      "^a suite exact failure(?![\\s\\S])",
      "--config",
      "vitest.config.mjs",
    ]);
    expect(plan.machineResultPath).toBe(".ascout/runs/run-063/raw/test/rerun-2/vitest-results.json");
  });

  it("keeps option-like Vitest test paths positional", () => {
    const plan = planVitestTargetedRerun({
      runId: "run-063",
      basePlan: vitestPlan(),
      selector: { path: "--odd.test.ts", fullName: "odd" },
      observationOrdinal: 2,
    });

    expect(plan.state).toBe("planned");
    if (plan.state !== "planned") return;
    expect(plan.argv[1]).toBe("./--odd.test.ts");
  });

  it("plans one exact Jest observation with exact path and regex-escaped full name", () => {
    const plan = planJestTargetedRerun({
      runId: "run-063",
      basePlan: jestPlan(),
      selector: JEST_SELECTOR,
      observationOrdinal: 2,
    });

    expect(plan).toEqual({
      state: "planned",
      observationOrdinal: 2,
      selector: JEST_SELECTOR,
      argv: [
        "node_modules/.bin/jest",
        "--runTestsByPath",
        "tests/math.test.ts",
        "--testNamePattern",
        "^math \\[edge\\] adds \\(a\\+b\\)\\?(?![\\s\\S])",
        "--ci",
        "--json",
        "--outputFile=.ascout/runs/run-063/raw/test/rerun-1/jest-results.json",
        "--config",
        "jest.config.mjs",
      ],
      workingDirectory: null,
      machineResultPath: ".ascout/runs/run-063/raw/test/rerun-1/jest-results.json",
      reasonCode: null,
      reasonText: null,
    });
    expect(plan.argv).not.toContain("--findRelatedTests");
    expect(plan.argv.some((arg) => arg.includes("coverage"))).toBe(false);
    expect(plan.argv).not.toContain("--passWithNoTests");
  });

  it("keeps Jest observation 3 inside the authorized workspace and a separate artifact", () => {
    const selector: JestExactFailingTestSelector = {
      path: "packages/a/tests/a.test.ts",
      fullName: "a suite exact failure",
    };
    const plan = planJestTargetedRerun({
      runId: "run-063",
      basePlan: jestPlan(true),
      selector,
      observationOrdinal: 3,
    });

    expect(plan.state).toBe("planned");
    if (plan.state !== "planned") return;
    expect(plan.argv).toEqual([
      "../../node_modules/.bin/jest",
      "--runTestsByPath",
      "tests/a.test.ts",
      "--testNamePattern",
      "^a suite exact failure(?![\\s\\S])",
      "--ci",
      "--json",
      "--outputFile=../../.ascout/runs/run-063/raw/test/rerun-2/jest-results.json",
      "--config",
      "jest.config.mjs",
    ]);
    expect(plan.machineResultPath).toBe(".ascout/runs/run-063/raw/test/rerun-2/jest-results.json");
  });

  it("keeps option-like Jest test paths positional after --runTestsByPath", () => {
    const plan = planJestTargetedRerun({
      runId: "run-063",
      basePlan: jestPlan(),
      selector: { path: "--odd.test.ts", fullName: "odd" },
      observationOrdinal: 2,
    });

    expect(plan.state).toBe("planned");
    if (plan.state !== "planned") return;
    expect(plan.argv.slice(1, 3)).toEqual(["--runTestsByPath", "./--odd.test.ts"]);
  });

  it("uses absolute-end semantics for names that differ only by a final line terminator", () => {
    const vitest = planVitestTargetedRerun({
      runId: "run-063",
      basePlan: vitestPlan(),
      selector: { path: "tests/a.test.ts", fullName: "foo" },
      observationOrdinal: 2,
    });
    expect(vitest.state).toBe("planned");
    if (vitest.state !== "planned") return;
    const vitestPattern = vitest.argv[vitest.argv.indexOf("--testNamePattern") + 1];
    expect(vitestPattern).toBeDefined();
    expect(new RegExp(vitestPattern!).test("foo")).toBe(true);
    expect(new RegExp(vitestPattern!).test("foo\n")).toBe(false);

    const jest = planJestTargetedRerun({
      runId: "run-063",
      basePlan: jestPlan(),
      selector: { path: "tests/a.test.ts", fullName: "foo" },
      observationOrdinal: 2,
    });
    expect(jest.state).toBe("planned");
    if (jest.state !== "planned") return;
    const jestPattern = jest.argv[jest.argv.indexOf("--testNamePattern") + 1];
    expect(jestPattern).toBeDefined();
    expect(new RegExp(jestPattern!).test("foo")).toBe(true);
    expect(new RegExp(jestPattern!).test("foo\n")).toBe(false);
  });

  it("refuses any third extra observation for both runners", () => {
    for (const observationOrdinal of [1, 4]) {
      expect(planVitestTargetedRerun({
        runId: "run-063",
        basePlan: vitestPlan(),
        selector: VITEST_SELECTOR,
        observationOrdinal,
      })).toMatchObject({
        state: "unavailable",
        reasonCode: "targeted_rerun_observation_limit",
        argv: [],
        machineResultPath: null,
      });
      expect(planJestTargetedRerun({
        runId: "run-063",
        basePlan: jestPlan(),
        selector: JEST_SELECTOR,
        observationOrdinal,
      })).toMatchObject({
        state: "unavailable",
        reasonCode: "targeted_rerun_observation_limit",
        argv: [],
        machineResultPath: null,
      });
    }
  });

  it("fails closed on noncanonical or out-of-scope exact selectors", () => {
    expect(planVitestTargetedRerun({
      runId: "run-063",
      basePlan: vitestPlan(),
      selector: { path: "../tests/a.test.ts", fullName: "a" },
      observationOrdinal: 2,
    })).toMatchObject({ state: "unavailable", reasonCode: "targeted_rerun_selector_unsafe" });

    expect(planJestTargetedRerun({
      runId: "run-063",
      basePlan: jestPlan(true),
      selector: { path: "packages/b/tests/a.test.ts", fullName: "a" },
      observationOrdinal: 2,
    })).toMatchObject({ state: "unavailable", reasonCode: "targeted_rerun_selector_outside_scope" });
  });

  it("fails closed when an exact full test name is unavailable", () => {
    expect(planVitestTargetedRerun({
      runId: "run-063",
      basePlan: vitestPlan(),
      selector: { path: "tests/a.test.ts", fullName: "" },
      observationOrdinal: 2,
    })).toMatchObject({ state: "unavailable", reasonCode: "targeted_rerun_selector_unsafe" });

    expect(planJestTargetedRerun({
      runId: "run-063",
      basePlan: jestPlan(),
      selector: { path: "tests/a.test.ts", fullName: "bad\0name" },
      observationOrdinal: 2,
    })).toMatchObject({ state: "unavailable", reasonCode: "targeted_rerun_selector_unsafe" });
  });
});
