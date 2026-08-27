import { readFileSync } from "node:fs";
import { basename } from "node:path";

import { describe, expect, it } from "vitest";

type JestCaseCatalog = {
  readonly version: 1;
  readonly related: {
    readonly changedSources: readonly string[];
    readonly selectionMode: "native_related";
    readonly args: readonly string[];
    readonly expectedTestPaths: readonly string[];
  };
  readonly configWidening: {
    readonly changedPath: string;
    readonly trigger: "jest_config_changed";
    readonly widenedMode: "full";
    readonly args: readonly string[];
    readonly forbiddenNarrowArgs: readonly string[];
    readonly expectedTestPaths: readonly string[];
  };
  readonly artifacts: {
    readonly jsonResult: string;
    readonly coverageDirectory: string;
    readonly lcov: string;
  };
};

type JestJsonResult = {
  readonly numFailedTestSuites: number;
  readonly numFailedTests: number;
  readonly numPassedTestSuites: number;
  readonly numPassedTests: number;
  readonly numTotalTestSuites: number;
  readonly numTotalTests: number;
  readonly success: boolean;
  readonly wasInterrupted: boolean;
  readonly testResults: readonly {
    readonly name: string;
    readonly status: string;
    readonly assertionResults: readonly {
      readonly fullName: string;
      readonly status: string;
      readonly title: string;
    }[];
  }[];
};

const CASES_URL = new URL("./fixtures/jest/cases.json", import.meta.url);
const RELATED_RESULTS_URL = new URL("./fixtures/jest/related-results.json", import.meta.url);
const FULL_RESULTS_URL = new URL("./fixtures/jest/full-results.json", import.meta.url);

function loadJson<T>(url: URL): T {
  return JSON.parse(readFileSync(url, "utf8")) as T;
}

function expectAscoutRelativePath(path: string): void {
  expect(path.startsWith(".ascout/")).toBe(true);
  expect(path.startsWith("/")).toBe(false);
  expect(path).not.toContain("\\");
  expect(path).not.toContain("//");
  expect(path.split("/")).not.toContain("..");
}

function expectSafeJestArgs(args: readonly string[]): void {
  const forbiddenLaunchers = new Set(["npx", "npm", "pnpm", "yarn", "bun", "install", "exec"]);
  for (const arg of args) {
    expect(forbiddenLaunchers.has(arg)).toBe(false);
    expect(arg).not.toContain("&&");
    expect(arg).not.toContain("||");
    expect(arg).not.toContain(";");
  }
}

function testPaths(result: JestJsonResult): readonly string[] {
  return result.testResults.map(({ name }) => `tests/${basename(name)}`).sort();
}

function expectSuccessfulMachineResult(result: JestJsonResult): void {
  expect(result.success).toBe(true);
  expect(result.wasInterrupted).toBe(false);
  expect(result.numFailedTestSuites).toBe(0);
  expect(result.numFailedTests).toBe(0);
  expect(result.numPassedTestSuites).toBe(result.numTotalTestSuites);
  expect(result.numPassedTests).toBe(result.numTotalTests);
  expect(result.testResults).toHaveLength(result.numTotalTestSuites);
  for (const testResult of result.testResults) {
    expect(testResult.status).toBe("passed");
    expect(testResult.assertionResults.length).toBeGreaterThan(0);
    for (const assertion of testResult.assertionResults) {
      expect(assertion.status).toBe("passed");
      expect(assertion.fullName.length).toBeGreaterThan(0);
      expect(assertion.title.length).toBeGreaterThan(0);
    }
  }
}

describe("T046 Jest fixture/integration contract", () => {
  it("locks native findRelatedTests, machine JSON, and LCOV arguments", () => {
    const catalog = loadJson<JestCaseCatalog>(CASES_URL);
    const { args } = catalog.related;

    expect(catalog.version).toBe(1);
    expect(catalog.related.selectionMode).toBe("native_related");
    expect(args[0]).toBe("--findRelatedTests");
    expect(args.slice(1, 1 + catalog.related.changedSources.length)).toEqual(catalog.related.changedSources);
    expect(args).toContain("--ci");
    expect(args).toContain("--json");
    expect(args).toContain(`--outputFile=${catalog.artifacts.jsonResult}`);
    expect(args).toContain("--coverage");
    expect(args).toContain(`--coverageDirectory=${catalog.artifacts.coverageDirectory}`);
    expect(args).toContain("--coverageReporters=lcov");
    expectSafeJestArgs(args);

    for (const path of [catalog.artifacts.jsonResult, catalog.artifacts.coverageDirectory, catalog.artifacts.lcov]) {
      expectAscoutRelativePath(path);
    }
    expect(catalog.artifacts.lcov).toBe(`${catalog.artifacts.coverageDirectory}/lcov.info`);
  });

  it("locks the expected related-test machine-result shape", () => {
    const catalog = loadJson<JestCaseCatalog>(CASES_URL);
    const result = loadJson<JestJsonResult>(RELATED_RESULTS_URL);

    expectSuccessfulMachineResult(result);
    expect(testPaths(result)).toEqual([...catalog.related.expectedTestPaths].sort());
  });

  it("widens a changed Jest config to a full command with no related narrowing", () => {
    const catalog = loadJson<JestCaseCatalog>(CASES_URL);
    const { args } = catalog.configWidening;

    expect(catalog.configWidening.changedPath).toBe("jest.config.cjs");
    expect(catalog.configWidening.trigger).toBe("jest_config_changed");
    expect(catalog.configWidening.widenedMode).toBe("full");
    for (const forbidden of catalog.configWidening.forbiddenNarrowArgs) {
      expect(args).not.toContain(forbidden);
    }
    expect(args).toContain("--ci");
    expect(args).toContain("--json");
    expect(args).toContain(`--outputFile=${catalog.artifacts.jsonResult}`);
    expect(args).toContain("--coverage");
    expect(args).toContain(`--coverageDirectory=${catalog.artifacts.coverageDirectory}`);
    expect(args).toContain("--coverageReporters=lcov");
    expectSafeJestArgs(args);
  });

  it("locks the expected full-run machine-result shape after widening", () => {
    const catalog = loadJson<JestCaseCatalog>(CASES_URL);
    const result = loadJson<JestJsonResult>(FULL_RESULTS_URL);

    expectSuccessfulMachineResult(result);
    expect(testPaths(result)).toEqual([...catalog.configWidening.expectedTestPaths].sort());
  });
});
