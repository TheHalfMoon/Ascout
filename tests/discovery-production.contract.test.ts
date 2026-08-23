import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  FIXED_SEMANTIC_TASKS,
  DiscoveryError,
  discoverProjectFromFiles,
  type DiscoveryResolution,
  type JsTestRunner,
  type PackageManager,
} from "../src/discovery.js";

type ExpectedPackageManager = PackageManager | "ambiguous" | null;
type ExpectedRunner = JsTestRunner | "ambiguous" | null;

interface FixtureExpectation {
  readonly packageManager: ExpectedPackageManager;
  readonly workspace: "single" | "basic";
  readonly jsTestRunner: ExpectedRunner;
  readonly pytestBasic: boolean;
  readonly pytestConfig?: string;
}

interface FixtureCase {
  readonly id: string;
  readonly files: Readonly<Record<string, string>>;
  readonly expected: FixtureExpectation;
}

interface FixtureCatalog {
  readonly version: 1;
  readonly cases: readonly FixtureCase[];
}

const FIXTURE_CATALOG_URL = new URL("./fixtures/discovery/cases.json", import.meta.url);

function loadCatalog(): FixtureCatalog {
  return JSON.parse(readFileSync(FIXTURE_CATALOG_URL, "utf8")) as FixtureCatalog;
}

function expectedValue<T extends string>(
  resolution: DiscoveryResolution<T>,
): T | "ambiguous" | null {
  if (resolution.state === "resolved") return resolution.value;
  if (resolution.state === "ambiguous") return "ambiguous";
  return null;
}

describe("T034 production discovery", () => {
  it("binds every T027 fixture to the production discovery API", () => {
    for (const fixture of loadCatalog().cases) {
      const discovery = discoverProjectFromFiles(fixture.files);

      expect(discovery.semanticTasks, fixture.id).toEqual(FIXED_SEMANTIC_TASKS);
      expect(expectedValue(discovery.packageManager), fixture.id).toBe(
        fixture.expected.packageManager,
      );
      expect(discovery.workspace.state, fixture.id).toBe("resolved");
      expect(discovery.workspace.kind, fixture.id).toBe(fixture.expected.workspace);
      expect(expectedValue(discovery.jsTestRunner), fixture.id).toBe(
        fixture.expected.jsTestRunner,
      );
      expect(discovery.pytestBasic.state === "resolved", fixture.id).toBe(
        fixture.expected.pytestBasic,
      );

      if (fixture.expected.pytestConfig !== undefined) {
        expect(discovery.pytestBasic, fixture.id).toMatchObject({
          state: "resolved",
          value: "pytestBasic",
          sourcePaths: [fixture.expected.pytestConfig],
        });
      }
    }
  });

  it("gives a valid root packageManager declaration precedence over conflicting lockfiles", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": JSON.stringify({
        name: "fixture",
        private: true,
        packageManager: "pnpm@10.15.0",
      }),
      "package-lock.json": "{}",
      "yarn.lock": "",
    });

    expect(discovery.packageManager).toEqual({
      state: "resolved",
      value: "pnpm",
      sourcePaths: ["package.json"],
    });
  });

  it("fails closed on invalid packageManager declarations instead of falling back to a lockfile", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": JSON.stringify({
        name: "fixture",
        private: true,
        packageManager: "pnpm@latest",
      }),
      "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    });

    expect(discovery.packageManager).toEqual({
      state: "unsupported",
      reasonCode: "package_manager_declaration_invalid",
      reasonText: expect.any(String),
      sourcePaths: ["package.json"],
    });
  });

  it("fails closed and exposes every source when lockfiles or supported JS runners are ambiguous", () => {
    const manager = discoverProjectFromFiles({
      "package.json": JSON.stringify({ name: "fixture", private: true }),
      "package-lock.json": "{}",
      "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    }).packageManager;
    expect(manager).toMatchObject({
      state: "ambiguous",
      candidates: ["npm", "pnpm"],
      sourcePaths: ["package-lock.json", "pnpm-lock.yaml"],
    });

    const runner = discoverProjectFromFiles({
      "package.json": JSON.stringify({
        name: "fixture",
        private: true,
        devDependencies: { jest: "30.0.0", vitest: "4.1.10" },
      }),
    }).jsTestRunner;
    expect(runner).toMatchObject({
      state: "ambiguous",
      candidates: ["jest", "vitest"],
      sourcePaths: ["package.json"],
    });
  });

  it("discovers only fixed semantic tasks and does not turn arbitrary scripts into tasks", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": JSON.stringify({
        name: "fixture",
        private: true,
        scripts: {
          build: "vite build",
          deploy: "echo deploy",
          "custom-verifier": "echo custom",
        },
      }),
    });

    expect(discovery.semanticTasks).toEqual([
      "typecheck",
      "lint",
      "test",
      "pytestBasic",
    ]);
    expect(discovery.semanticTasks).not.toContain("build");
    expect(discovery.semanticTasks).not.toContain("deploy");
    expect(discovery.semanticTasks).not.toContain("custom-verifier");
  });

  it("keeps declaration, local executable, and config facts separate for later task planners", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": JSON.stringify({
        name: "fixture",
        private: true,
        devDependencies: {
          typescript: "6.0.0",
          vitest: "4.1.10",
        },
      }),
      "node_modules/.bin/tsc": "",
      "node_modules/.bin/vitest.cmd": "",
      "tsconfig.json": "{}",
      "vitest.config.ts": "export default {};\n",
    });

    expect(discovery.tools.typescript).toEqual({
      packageName: "typescript",
      binName: "tsc",
      declarationPaths: ["package.json"],
      localExecutablePaths: ["node_modules/.bin/tsc"],
      configPaths: ["tsconfig.json"],
    });
    expect(discovery.tools.vitest).toEqual({
      packageName: "vitest",
      binName: "vitest",
      declarationPaths: ["package.json"],
      localExecutablePaths: ["node_modules/.bin/vitest.cmd"],
      configPaths: ["vitest.config.ts"],
    });
  });

  it("supports basic package.json and pnpm workspace declarations without inventing a workflow graph", () => {
    const packageWorkspace = discoverProjectFromFiles({
      "package.json": JSON.stringify({
        name: "root",
        private: true,
        workspaces: ["packages/*"],
      }),
      "packages/app/package.json": JSON.stringify({ name: "app", private: true }),
      "packages/lib/package.json": JSON.stringify({ name: "lib", private: true }),
    }).workspace;
    expect(packageWorkspace).toMatchObject({
      state: "resolved",
      kind: "basic",
      patterns: ["packages/*"],
      packageJsonPaths: [
        "package.json",
        "packages/app/package.json",
        "packages/lib/package.json",
      ],
      sourcePaths: ["package.json"],
    });

    const pnpmWorkspace = discoverProjectFromFiles({
      "package.json": JSON.stringify({ name: "root", private: true }),
      "pnpm-workspace.yaml": "packages:\n  - 'apps/*'\n",
      "apps/web/package.json": JSON.stringify({ name: "web", private: true }),
    }).workspace;
    expect(pnpmWorkspace).toMatchObject({
      state: "resolved",
      kind: "basic",
      patterns: ["apps/*"],
      packageJsonPaths: ["package.json", "apps/web/package.json"],
      sourcePaths: ["pnpm-workspace.yaml"],
    });
  });

  it("fails closed on workspace grammar beyond the bounded basic M1 surface", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": JSON.stringify({
        name: "root",
        private: true,
        workspaces: ["packages/**"],
      }),
    });

    expect(discovery.workspace).toMatchObject({
      state: "unsupported",
      kind: null,
      reasonCode: "workspace_declaration_unsupported",
    });
  });

  it("ignores undeclared nested packages outside the declared project/workspace scope", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": JSON.stringify({
        name: "root",
        private: true,
        devDependencies: { vitest: "4.1.10" },
      }),
      "examples/demo/package.json": JSON.stringify({
        name: "demo",
        private: true,
        devDependencies: { jest: "30.0.0" },
      }),
      "examples/demo/jest.config.js": "export default {};\n",
      "examples/demo/node_modules/.bin/jest": "",
    });

    expect(discovery.jsTestRunner).toEqual({
      state: "resolved",
      value: "vitest",
      sourcePaths: ["package.json"],
    });
    expect(discovery.tools.jest.declarationPaths).toEqual([]);
    expect(discovery.tools.jest.localExecutablePaths).toEqual([]);
    expect(discovery.tools.jest.configPaths).toEqual([]);
  });

  it("treats unsupported JS runners as absent rather than relabeling them", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": JSON.stringify({
        name: "fixture",
        private: true,
        devDependencies: { mocha: "11.7.1" },
      }),
    });

    expect(discovery.jsTestRunner.state).toBe("absent");
    expect(discovery.tools.vitest.declarationPaths).toEqual([]);
    expect(discovery.tools.jest.declarationPaths).toEqual([]);
  });

  it("keeps configured pytestBasic independent from JS runner discovery and fails closed on multiple configs", () => {
    const clear = discoverProjectFromFiles({
      "pyproject.toml": "[tool.pytest.ini_options]\ntestpaths = ['tests']\n",
    });
    expect(clear.pytestBasic).toEqual({
      state: "resolved",
      value: "pytestBasic",
      sourcePaths: ["pyproject.toml"],
    });
    expect(clear.jsTestRunner.state).toBe("absent");

    const ambiguous = discoverProjectFromFiles({
      "pytest.ini": "[pytest]\n",
      "pyproject.toml": "[tool.pytest.ini_options]\n",
    });
    expect(ambiguous.pytestBasic).toMatchObject({
      state: "ambiguous",
      candidates: ["pytestBasic"],
      sourcePaths: ["pyproject.toml", "pytest.ini"],
    });
  });

  it("rejects malformed package JSON and noncanonical virtual paths before discovery", () => {
    expect(() => discoverProjectFromFiles({ "package.json": "{" })).toThrow(DiscoveryError);
    expect(() => discoverProjectFromFiles({ "src//package.json": "{}" })).toThrow(
      "discovery path must already be canonical repository-relative data",
    );
    expect(() => discoverProjectFromFiles({ "src\\package.json": "{}" })).toThrow(
      "discovery path must already be canonical repository-relative data",
    );
  });
});
