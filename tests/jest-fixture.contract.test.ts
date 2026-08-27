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
  readonly success: boolean;
  readonly startTime: number;
  readonly numTotalTestSuites: number;
  readonly numPassedTestSuites: number;
  readonly numFailedTestSuites: number;
  readonly numRuntimeErrorTestSuites: number;
  readonly numTotalTests: number;
  readonly numPassedTests: number;
  readonly numFailedTests: number;
  readonly numPendingTests: number;
  readonly numTodoTests: number;
  readonly openHandles: readonly unknown[];
  readonly testResults: readonly {
    readonly numFailingTests: number;
    readonly numPassingTests: number;
    readonly numPendingTests: number;
    readonly testResults: readonly {
      readonly title: string;
      readonly status: "failed" | "pending" | "passed";
      readonly ancestorTitles: readonly string[];
      readonly failureMessages: readonly string[];
      readonly numPassingAsserts: number;
      readonly location: {
        readonly line: number;
        readonly column: number;
      };
      readonly duration: number | null;
      readonly startAt: number | null;
    }[];
    readonly perfStats: {
      readonly start: number;
      readonly end: number;
      readonly runtime: number;
      readonly slow: boolean;
      readonly loadTestEnvironmentStart: number;
      readonly loadTestEnvironmentEnd: number;
      readonly setupFilesStart: number;
      readonly setupFilesEnd: number;
      readonly setupAfterEnvStart: number;
      readonly setupAfterEnvEnd: number;
    };
    readonly testFilePath: string;
    readonly coverage: Readonly<Record<string, unknown>>;
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
  return result.testResults.map(({ testFilePath }) => `tests/${basename(testFilePath)}`).sort();
}

function expectSuccessfulMachineResult(result: JestJsonResult): void {
  expect(result.success).toBe(true);
  expect(Number.isInteger(result.startTime)).toBe(true);
  expect(result.numFailedTestSuites).toBe(0);
  expect(result.numRuntimeErrorTestSuites).toBe(0);
  expect(result.numFailedTests).toBe(0);
  expect(result.numPendingTests).toBe(0);
  expect(result.numTodoTests).toBe(0);
  expect(result.openHandles).toEqual([]);
  expect(result.numPassedTestSuites).toBe(result.numTotalTestSuites);
  expect(result.numPassedTests).toBe(result.numTotalTests);
  expect(result.testResults).toHaveLength(result.numTotalTestSuites);

  let observedTests = 0;
  for (const suite of result.testResults) {
    expect(suite.numFailingTests).toBe(0);
    expect(suite.numPendingTests).toBe(0);
    expect(suite.numPassingTests).toBe(suite.testResults.length);
    expect(suite.perfStats.start).toBeLessThanOrEqual(suite.perfStats.end);
    expect(suite.perfStats.runtime).toBe(suite.perfStats.end - suite.perfStats.start);
    expect(suite.perfStats.slow).toBe(false);
    expect(suite.perfStats.loadTestEnvironmentStart).toBeGreaterThanOrEqual(suite.perfStats.start);
    expect(suite.perfStats.loadTestEnvironmentEnd).toBeGreaterThanOrEqual(suite.perfStats.loadTestEnvironmentStart);
    expect(suite.perfStats.setupFilesStart).toBeGreaterThanOrEqual(suite.perfStats.loadTestEnvironmentEnd);
    expect(suite.perfStats.setupFilesEnd).toBeGreaterThanOrEqual(suite.perfStats.setupFilesStart);
    expect(suite.perfStats.setupAfterEnvStart).toBeGreaterThanOrEqual(suite.perfStats.setupFilesEnd);
    expect(suite.perfStats.setupAfterEnvEnd).toBeGreaterThanOrEqual(suite.perfStats.setupAfterEnvStart);
    expect(suite.perfStats.setupAfterEnvEnd).toBeLessThanOrEqual(suite.perfStats.end);
    expect(suite.testFilePath.startsWith("/")).toBe(true);
    expect(typeof suite.coverage).toBe("object");
    observedTests += suite.testResults.length;

    for (const assertion of suite.testResults) {
      expect(assertion.status).toBe("passed");
      expect(assertion.title.length).toBeGreaterThan(0);
      expect(assertion.failureMessages).toEqual([]);
      expect(assertion.numPassingAsserts).toBeGreaterThan(0);
      expect(assertion.location.line).toBeGreaterThan(0);
      expect(assertion.location.column).toBeGreaterThan(0);
      expect(assertion.duration).not.toBeNull();
      expect(assertion.startAt).not.toBeNull();
      expect(assertion.duration!).toBeGreaterThanOrEqual(0);
      expect(assertion.startAt!).toBeGreaterThanOrEqual(suite.perfStats.start);
      expect(assertion.startAt!).toBeLessThanOrEqual(suite.perfStats.end);
    }
  }
  expect(observedTests).toBe(result.numTotalTests);
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

  it("locks the documented Jest 30 related-test machine-result shape", () => {
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

  it("locks the documented Jest 30 full-run machine-result shape after widening", () => {
    const catalog = loadJson<JestCaseCatalog>(CASES_URL);
    const result = loadJson<JestJsonResult>(FULL_RESULTS_URL);

    expectSuccessfulMachineResult(result);
    expect(testPaths(result)).toEqual([...catalog.configWidening.expectedTestPaths].sort());
  });
});
