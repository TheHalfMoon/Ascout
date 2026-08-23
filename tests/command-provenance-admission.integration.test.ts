import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

type TaskId = "typecheck" | "lint" | "test" | "pytestBasic";
type ExecutionAdmission = "normal" | "refused_changed_surface";
type TaskStatus = "NOT_RUN" | null;
type ReasonCode = "command_surface_changed" | null;

interface AdmissionExpectation {
  readonly command_surface_changed: boolean;
  readonly changed_authority_paths: readonly string[];
  readonly execution_admission: ExecutionAdmission;
  readonly launch_allowed: boolean;
  readonly status: TaskStatus;
  readonly reason_code: ReasonCode;
  readonly effective_pytest_config: string | null;
}

interface AdmissionFixtureCase {
  readonly id: string;
  readonly purpose: string;
  readonly task: TaskId;
  readonly files: Readonly<Record<string, string>>;
  readonly effectiveAuthorityPaths: readonly string[];
  readonly changedPaths: readonly string[];
  readonly executionLoadPaths: readonly string[];
  readonly expected: AdmissionExpectation;
}

interface AdmissionFixtureCatalog {
  readonly version: 1;
  readonly cases: readonly AdmissionFixtureCase[];
}

interface AdmissionDecision {
  readonly command_surface_changed: boolean;
  readonly changed_authority_paths: readonly string[];
  readonly execution_admission: ExecutionAdmission;
  readonly launch_allowed: boolean;
  readonly status?: "NOT_RUN";
  readonly reason_code?: "command_surface_changed";
  readonly reason_text?: string;
}

interface ExecutionProbes {
  loadAuthority(path: string): void;
  launchProcess(): void;
}

const FIXTURE_CATALOG_URL = new URL("./fixtures/admission/cases.json", import.meta.url);
const PYTEST_CONFIG_FORMS = ["pytest.ini", "pyproject.toml", "setup.cfg", "tox.ini"] as const;

function loadCatalog(): AdmissionFixtureCatalog {
  return JSON.parse(readFileSync(FIXTURE_CATALOG_URL, "utf8")) as AdmissionFixtureCatalog;
}

function effectiveAuthorityIntersection(
  effectiveAuthorityPaths: readonly string[],
  changedPaths: readonly string[],
): readonly string[] {
  const changed = new Set(changedPaths);
  const seen = new Set<string>();
  const intersection: string[] = [];

  for (const path of effectiveAuthorityPaths) {
    if (!changed.has(path) || seen.has(path)) continue;
    seen.add(path);
    intersection.push(path);
  }

  return intersection;
}

function runAdmissionGate(
  fixture: AdmissionFixtureCase,
  probes: ExecutionProbes,
): AdmissionDecision {
  const changedAuthorityPaths = effectiveAuthorityIntersection(
    fixture.effectiveAuthorityPaths,
    fixture.changedPaths,
  );

  if (changedAuthorityPaths.length > 0) {
    return {
      command_surface_changed: true,
      changed_authority_paths: changedAuthorityPaths,
      execution_admission: "refused_changed_surface",
      launch_allowed: false,
      status: "NOT_RUN",
      reason_code: "command_surface_changed",
      reason_text: "effective command or configuration authority changed in this invocation",
    };
  }

  for (const path of fixture.executionLoadPaths) probes.loadAuthority(path);
  probes.launchProcess();

  return {
    command_surface_changed: false,
    changed_authority_paths: [],
    execution_admission: "normal",
    launch_allowed: true,
  };
}

function findCase(catalog: AdmissionFixtureCatalog, id: string): AdmissionFixtureCase {
  const fixture = catalog.cases.find((candidate) => candidate.id === id);
  expect(fixture).toBeDefined();
  return fixture!;
}

function parseJsonFile(fixture: AdmissionFixtureCase, path: string): Record<string, unknown> {
  const raw = fixture.files[path];
  expect(raw).toBeDefined();
  return JSON.parse(raw!) as Record<string, unknown>;
}

function pytestMarker(path: (typeof PYTEST_CONFIG_FORMS)[number]): string {
  return path === "pyproject.toml"
    ? "[tool.pytest.ini_options]"
    : path === "setup.cfg"
      ? "[tool:pytest]"
      : "[pytest]";
}

function expectedAdmissionFields(
  expected: AdmissionExpectation,
): Omit<AdmissionDecision, "reason_text"> {
  const {
    effective_pytest_config: _effectivePytestConfig,
    status,
    reason_code: reasonCode,
    ...base
  } = expected;

  if (status === null && reasonCode === null) return base;
  if (status === "NOT_RUN" && reasonCode === "command_surface_changed") {
    return { ...base, status, reason_code: reasonCode };
  }

  throw new Error("fixture refusal fields must both be present or both be null");
}

describe("T028 command-provenance/admission integration matrix", () => {
  it("uses a versioned concrete matrix whose authority and changed paths exist in each virtual repository", () => {
    const catalog = loadCatalog();
    expect(catalog.version).toBe(1);
    expect(catalog.cases.length).toBeGreaterThan(0);

    const ids = catalog.cases.map((fixture) => fixture.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const fixture of catalog.cases) {
      expect(fixture.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(fixture.purpose.length).toBeGreaterThan(0);
      expect(Object.keys(fixture.files).length).toBeGreaterThan(0);
      for (const path of fixture.effectiveAuthorityPaths) expect(fixture.files[path]).toBeDefined();
      for (const path of fixture.changedPaths) expect(fixture.files[path]).toBeDefined();
      for (const path of fixture.executionLoadPaths) {
        expect(fixture.effectiveAuthorityPaths).toContain(path);
        expect(fixture.files[path]).toBeDefined();
      }
    }
  });

  it("binds expected changed authority paths to the exact effective-path intersection", () => {
    const catalog = loadCatalog();

    for (const fixture of catalog.cases) {
      const intersection = effectiveAuthorityIntersection(
        fixture.effectiveAuthorityPaths,
        fixture.changedPaths,
      );
      expect(intersection).toEqual(fixture.expected.changed_authority_paths);
      expect(intersection.length > 0).toBe(fixture.expected.command_surface_changed);
    }
  });

  it("covers package script and Ascout argv-override authority as concrete changed command surfaces", () => {
    const catalog = loadCatalog();
    const packageScript = findCase(catalog, "package-script-typecheck-changed");
    const ascoutOverride = findCase(catalog, "ascout-override-lint-changed");

    const packageJson = parseJsonFile(packageScript, "package.json");
    expect(packageJson.scripts).toMatchObject({ typecheck: "tsc -p tsconfig.json --noEmit" });
    expect(packageScript.expected.changed_authority_paths).toEqual(["package.json"]);

    const ascoutConfig = parseJsonFile(ascoutOverride, "ascout.config.json");
    expect(ascoutConfig).toMatchObject({
      version: 1,
      tasks: { lint: { argv: ["eslint", "src"] } },
    });
    expect(ascoutOverride.expected.changed_authority_paths).toEqual(["ascout.config.json"]);
  });

  it("covers effective TypeScript root and extends sources plus ESLint, Vitest, and Jest configs", () => {
    const catalog = loadCatalog();
    const configCases = [
      "typescript-root-config-changed",
      "typescript-extends-config-changed",
      "eslint-config-changed",
      "vitest-config-changed",
      "jest-config-changed",
    ] as const;

    for (const id of configCases) {
      const fixture = findCase(catalog, id);
      expect(fixture.expected.command_surface_changed).toBe(true);
      expect(fixture.expected.changed_authority_paths).toHaveLength(1);
      expect(fixture.executionLoadPaths.length).toBeGreaterThan(0);
      expect(fixture.executionLoadPaths).toContain(fixture.expected.changed_authority_paths[0]);
    }

    const extendsCase = findCase(catalog, "typescript-extends-config-changed");
    const tsconfig = parseJsonFile(extendsCase, "tsconfig.json");
    expect(tsconfig.extends).toBe("./config/tsconfig.base.json");
    expect(extendsCase.effectiveAuthorityPaths).toContain("config/tsconfig.base.json");
  });

  it("covers every applicable pytestBasic config form and marks only the config used by the invocation as authority", () => {
    const catalog = loadCatalog();

    for (const configPath of PYTEST_CONFIG_FORMS) {
      const fixture = findCase(catalog, `pytest-${configPath.replaceAll(".", "-")}-changed`);
      expect(fixture.task).toBe("pytestBasic");
      expect(fixture.expected.effective_pytest_config).toBe(configPath);
      expect(fixture.effectiveAuthorityPaths).toEqual([configPath]);
      expect(fixture.changedPaths).toContain(configPath);
      expect(fixture.files[configPath]).toContain(pytestMarker(configPath));
    }

    const nonEffective = findCase(catalog, "pytest-non-effective-config-changed");
    expect(nonEffective.expected.effective_pytest_config).toBe("pyproject.toml");
    expect(nonEffective.effectiveAuthorityPaths).toEqual(["pyproject.toml"]);
    expect(nonEffective.changedPaths).toEqual(["examples/pytest.ini"]);
    expect(nonEffective.expected.command_surface_changed).toBe(false);
  });

  it("refuses every affected task before execution-time authority load or process launch", () => {
    const catalog = loadCatalog();
    const affected = catalog.cases.filter((fixture) => fixture.expected.command_surface_changed);
    expect(affected.length).toBeGreaterThan(0);

    for (const fixture of affected) {
      let authorityLoads = 0;
      let processLaunches = 0;
      const decision = runAdmissionGate(fixture, {
        loadAuthority: () => {
          authorityLoads += 1;
          throw new Error(`execution-time authority load must not occur for ${fixture.id}`);
        },
        launchProcess: () => {
          processLaunches += 1;
          throw new Error(`process launch must not occur for ${fixture.id}`);
        },
      });

      expect(decision).toMatchObject(expectedAdmissionFields(fixture.expected));
      expect(decision.reason_text?.length).toBeGreaterThan(0);
      expect(authorityLoads).toBe(0);
      expect(processLaunches).toBe(0);
    }
  });

  it("does not manufacture refusal for unrelated or non-effective changed paths", () => {
    const catalog = loadCatalog();
    const normalCases = catalog.cases.filter((fixture) => !fixture.expected.command_surface_changed);
    expect(normalCases.length).toBeGreaterThanOrEqual(2);

    for (const fixture of normalCases) {
      const loaded: string[] = [];
      let processLaunches = 0;
      const decision = runAdmissionGate(fixture, {
        loadAuthority: (path) => loaded.push(path),
        launchProcess: () => {
          processLaunches += 1;
        },
      });

      expect(decision).toMatchObject(expectedAdmissionFields(fixture.expected));
      expect("status" in decision).toBe(false);
      expect("reason_code" in decision).toBe(false);
      expect("reason_text" in decision).toBe(false);
      expect(loaded).toEqual(fixture.executionLoadPaths);
      expect(processLaunches).toBe(1);
    }
  });
});
