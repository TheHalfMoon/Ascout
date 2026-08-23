import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

type PackageManagerExpectation = "npm" | "pnpm" | "yarn" | "ambiguous" | null;
type WorkspaceExpectation = "single" | "basic";
type JsTestRunnerExpectation = "vitest" | "jest" | "ambiguous" | null;

interface DiscoveryFixtureExpectation {
  readonly packageManager: PackageManagerExpectation;
  readonly workspace: WorkspaceExpectation;
  readonly jsTestRunner: JsTestRunnerExpectation;
  readonly pytestBasic: boolean;
  readonly pytestConfig?: string;
}

interface DiscoveryFixtureCase {
  readonly id: string;
  readonly purpose: string;
  readonly files: Readonly<Record<string, string>>;
  readonly expected: DiscoveryFixtureExpectation;
}

interface DiscoveryFixtureCatalog {
  readonly version: 1;
  readonly cases: readonly DiscoveryFixtureCase[];
}

const FIXTURE_CATALOG_URL = new URL("./fixtures/discovery/cases.json", import.meta.url);
const RECOGNIZED_LOCKFILES = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"] as const;
const LOCKFILE_MANAGER: Readonly<Record<(typeof RECOGNIZED_LOCKFILES)[number], "npm" | "pnpm" | "yarn">> = {
  "package-lock.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
};
const PACKAGE_MANAGER_DECLARATION = /^(npm|pnpm|yarn)@[0-9]+\.[0-9]+\.[0-9]+$/;
const SUPPORTED_JS_RUNNERS = new Set(["vitest", "jest"]);

function loadCatalog(): DiscoveryFixtureCatalog {
  return JSON.parse(readFileSync(FIXTURE_CATALOG_URL, "utf8")) as DiscoveryFixtureCatalog;
}

function packageJson(fixture: DiscoveryFixtureCase): Record<string, unknown> | undefined {
  const raw = fixture.files["package.json"];
  return raw === undefined ? undefined : JSON.parse(raw) as Record<string, unknown>;
}

function devDependencyNames(fixture: DiscoveryFixtureCase): ReadonlySet<string> {
  const pkg = packageJson(fixture);
  const devDependencies = pkg?.devDependencies;
  if (typeof devDependencies !== "object" || devDependencies === null || Array.isArray(devDependencies)) {
    return new Set();
  }
  return new Set(Object.keys(devDependencies));
}

describe("T027 discovery fixture contract", () => {
  it("uses a versioned, unique, self-describing fixture catalog", () => {
    const catalog = loadCatalog();
    expect(catalog.version).toBe(1);
    expect(catalog.cases.length).toBeGreaterThan(0);

    const ids = catalog.cases.map((fixture) => fixture.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const fixture of catalog.cases) {
      expect(fixture.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(fixture.purpose.length).toBeGreaterThan(0);
      expect(Object.keys(fixture.files).length).toBeGreaterThan(0);
    }
  });

  it("covers valid root packageManager declarations for every supported JS package manager", () => {
    const catalog = loadCatalog();
    for (const manager of ["npm", "pnpm", "yarn"] as const) {
      const fixture = catalog.cases.find((candidate) => candidate.id === `explicit-${manager}`);
      expect(fixture).toBeDefined();
      expect(fixture?.expected.packageManager).toBe(manager);
      const declaration = packageJson(fixture!)?.packageManager;
      expect(declaration).toMatch(PACKAGE_MANAGER_DECLARATION);
      expect(PACKAGE_MANAGER_DECLARATION.exec(String(declaration))?.[1]).toBe(manager);
      expect(PACKAGE_MANAGER_DECLARATION.test(`${String(declaration)}garbage`)).toBe(false);

      const lockfiles = RECOGNIZED_LOCKFILES.filter((path) => path in fixture!.files);
      expect(lockfiles).toHaveLength(1);
      expect(LOCKFILE_MANAGER[lockfiles[0]!]).not.toBe(manager);
    }
  });

  it("covers unambiguous lockfile fallback and multiple-lockfile ambiguity", () => {
    const catalog = loadCatalog();
    for (const manager of ["npm", "pnpm", "yarn"] as const) {
      const fixture = catalog.cases.find((candidate) => candidate.id === `lockfile-only-${manager}`);
      expect(fixture).toBeDefined();
      expect(packageJson(fixture!)?.packageManager).toBeUndefined();
      expect(fixture?.expected.packageManager).toBe(manager);
      const lockfiles = RECOGNIZED_LOCKFILES.filter((path) => path in fixture!.files);
      expect(lockfiles).toHaveLength(1);
      expect(LOCKFILE_MANAGER[lockfiles[0]!]).toBe(manager);
    }

    const ambiguous = catalog.cases.find((candidate) => candidate.id === "ambiguous-lockfiles");
    expect(ambiguous).toBeDefined();
    expect(packageJson(ambiguous!)?.packageManager).toBeUndefined();
    expect(RECOGNIZED_LOCKFILES.filter((path) => path in ambiguous!.files).length).toBeGreaterThan(1);
    expect(ambiguous?.expected.packageManager).toBe("ambiguous");
  });

  it("distinguishes one basic workspace from a single-package fixture", () => {
    const catalog = loadCatalog();
    const single = catalog.cases.find((candidate) => candidate.id === "single-basic-vitest");
    const workspace = catalog.cases.find((candidate) => candidate.id === "basic-workspace-jest");

    expect(single?.expected.workspace).toBe("single");
    expect(packageJson(single!)?.workspaces).toBeUndefined();

    expect(workspace?.expected.workspace).toBe("basic");
    expect(packageJson(workspace!)?.workspaces).toEqual(["packages/*"]);
    expect(workspace?.files["packages/app/package.json"]).toBeDefined();
  });

  it("covers each supported JS test runner and explicit ambiguous-runner failure", () => {
    const catalog = loadCatalog();
    const vitest = catalog.cases.find((candidate) => candidate.id === "single-basic-vitest");
    const jest = catalog.cases.find((candidate) => candidate.id === "basic-workspace-jest");
    const ambiguous = catalog.cases.find((candidate) => candidate.id === "ambiguous-vitest-jest");

    expect(vitest?.expected.jsTestRunner).toBe("vitest");
    expect(devDependencyNames(vitest!).has("vitest")).toBe(true);
    expect(devDependencyNames(vitest!).has("jest")).toBe(false);

    expect(jest?.expected.jsTestRunner).toBe("jest");
    expect(devDependencyNames(jest!).has("jest")).toBe(true);
    expect(devDependencyNames(jest!).has("vitest")).toBe(false);

    expect(ambiguous?.expected.jsTestRunner).toBe("ambiguous");
    expect([...devDependencyNames(ambiguous!)].filter((name) => SUPPORTED_JS_RUNNERS.has(name))).toEqual([
      "jest",
      "vitest",
    ]);
  });

  it("keeps clearly configured pytestBasic separate from JS runner discovery", () => {
    const catalog = loadCatalog();
    const pytest = catalog.cases.find((candidate) => candidate.id === "pytest-basic-clear");

    expect(pytest?.expected.pytestBasic).toBe(true);
    expect(pytest?.expected.pytestConfig).toBe("pyproject.toml");
    expect(pytest?.files["pyproject.toml"]).toContain("[tool.pytest.ini_options]");
    expect(pytest?.expected.jsTestRunner).toBeNull();
  });

  it("does not classify unsupported JS runners as supported discovery", () => {
    const catalog = loadCatalog();
    const unsupported = catalog.cases.find((candidate) => candidate.id === "unsupported-mocha-only");

    expect(devDependencyNames(unsupported!).has("mocha")).toBe(true);
    expect([...devDependencyNames(unsupported!)].some((name) => SUPPORTED_JS_RUNNERS.has(name))).toBe(false);
    expect(unsupported?.expected.jsTestRunner).toBeNull();
  });
});
