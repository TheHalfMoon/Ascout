import { describe, expect, it } from "vitest";
import {
  classifyCommandSurfaces,
  discoverProjectFromFiles,
  intersectChangedAuthorityPaths,
  type ChangedPathView,
  type CommandSurfaceClassifyOptions,
  type DiscoveryFileMap,
  type TaskAuthoritySurfaces,
} from "../src/discovery.js";

function classify(
  files: DiscoveryFileMap,
  options: CommandSurfaceClassifyOptions = {},
): TaskAuthoritySurfaces {
  const discovery = discoverProjectFromFiles(files);
  return classifyCommandSurfaces(discovery, options);
}

const PYTEST_CONFIG_FORMS = ["pytest.ini", "pyproject.toml", "setup.cfg", "tox.ini"] as const;

function pytestContent(configName: string): string {
  const section = configName === "pyproject.toml"
    ? "[tool.pytest.ini_options]"
    : configName === "setup.cfg"
      ? "[tool:pytest]"
      : "[pytest]";
  return `${section}\naddopts = -q\n`;
}

describe("T038 command-surface classification in src/discovery.ts", () => {
  it("classifies typecheck authority using the workspace package.json owner and discovered tsconfig paths", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "fixture",
        scripts: { typecheck: "tsc -p tsconfig.json --noEmit" },
        devDependencies: { typescript: "6.0.3" },
      }),
      "tsconfig.json": JSON.stringify({ compilerOptions: { strict: true } }),
      "src/index.ts": "export const value = 1;\n",
      "node_modules/.bin/tsc": "",
    };

    const surfaces = classify(files);

    expect(surfaces.typecheck.taskType).toBe("typecheck");
    expect(surfaces.typecheck.authorityPaths).toContain("package.json");
    expect(surfaces.typecheck.authorityPaths).toContain("tsconfig.json");
    expect(surfaces.typecheck.authorityPaths).not.toContain("src/index.ts");
    expect(surfaces.typecheck.effectivePytestConfig).toBeNull();
  });

  it("classifies lint authority using workspace package.json and discovered eslint configs", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "fixture",
        scripts: { lint: "eslint ." },
        devDependencies: { eslint: "10.0.0" },
      }),
      "eslint.config.js": "export default [{ files: [\"**/*.ts\"] }];\n",
      "src/index.ts": "export const value = 1;\n",
      "node_modules/.bin/eslint": "",
    };

    const surfaces = classify(files);

    expect(surfaces.lint.taskType).toBe("lint");
    expect(surfaces.lint.authorityPaths).toContain("package.json");
    expect(surfaces.lint.authorityPaths).toContain("eslint.config.js");
    expect(surfaces.lint.authorityPaths).not.toContain("src/index.ts");
    expect(surfaces.lint.effectivePytestConfig).toBeNull();
  });

  it("classifies test authority using vitest configs when the runner is resolved", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "fixture",
        scripts: { test: "vitest run" },
        devDependencies: { vitest: "4.1.10" },
      }),
      "vitest.config.ts": "export default { test: { environment: \"node\" } };\n",
      "src/index.ts": "export const changed = true;\n",
      "node_modules/.bin/vitest": "",
    };

    const surfaces = classify(files);

    expect(surfaces.test.taskType).toBe("test");
    expect(surfaces.test.authorityPaths).toContain("package.json");
    expect(surfaces.test.authorityPaths).toContain("vitest.config.ts");
    expect(surfaces.test.authorityPaths).not.toContain("src/index.ts");
  });

  it("classifies test authority using jest configs when the runner is resolved", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "fixture",
        scripts: { test: "jest" },
        devDependencies: { jest: "30.0.0" },
      }),
      "jest.config.ts": "export default { testEnvironment: \"node\" };\n",
      "src/index.ts": "export const changed = true;\n",
      "node_modules/.bin/jest": "",
    };

    const surfaces = classify(files);

    expect(surfaces.test.taskType).toBe("test");
    expect(surfaces.test.authorityPaths).toContain("package.json");
    expect(surfaces.test.authorityPaths).toContain("jest.config.ts");
  });

  it.each(PYTEST_CONFIG_FORMS)(
    "classifies pytestBasic authority using the effective %s config only when resolved",
    (configName) => {
      const files: DiscoveryFileMap = {
        [configName]: pytestContent(configName),
        "tests/test_example.py": "def test_example():\n    assert True\n",
      };

      const surfaces = classify(files);

      expect(surfaces.pytestBasic.taskType).toBe("pytestBasic");
      expect(surfaces.pytestBasic.authorityPaths).toEqual([configName]);
      expect(surfaces.pytestBasic.effectivePytestConfig).toBe(configName);
    },
  );

  it("does not include non-effective pytest config paths that are outside discovered authority", () => {
    const files: DiscoveryFileMap = {
      "pyproject.toml": pytestContent("pyproject.toml"),
      "examples/pytest.ini": pytestContent("pytest.ini"),
      "tests/test_example.py": "def test_example():\n    assert True\n",
    };

    const surfaces = classify(files);

    expect(surfaces.pytestBasic.effectivePytestConfig).toBe("pyproject.toml");
    expect(surfaces.pytestBasic.authorityPaths).toEqual(["pyproject.toml"]);
    expect(surfaces.pytestBasic.authorityPaths).not.toContain("examples/pytest.ini");
  });

  it("returns empty pytestBasic authority when no pytestBasic discovery exists", () => {
    const files: DiscoveryFileMap = {
      "package.json": JSON.stringify({ name: "fixture" }),
      "src/index.ts": "export const value = 1;\n",
    };

    const surfaces = classify(files);

    expect(surfaces.pytestBasic.authorityPaths).toEqual([]);
    expect(surfaces.pytestBasic.effectivePytestConfig).toBeNull();
  });

  it("replaces the entire task authority with ascout.config.json when an explicit command override is configured", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "fixture",
        scripts: { lint: "eslint ." },
        devDependencies: { eslint: "10.0.0" },
      }),
      "eslint.config.js": "export default [];\n",
      "node_modules/.bin/eslint": "",
    };

    const surfaces = classify(files, {
      tasks: { lint: { command: ["eslint", "src"] } },
    });

    expect(surfaces.lint.authorityPaths).toEqual(["ascout.config.json"]);
    expect(surfaces.lint.authorityPaths).not.toContain("package.json");
    expect(surfaces.lint.authorityPaths).not.toContain("eslint.config.js");

    const typecheckSurfaces = surfaces.typecheck;
    expect(typecheckSurfaces.authorityPaths).not.toContain("ascout.config.json");
  });

  it("includes ascout.config.json alongside base authority when the task is configured (but not overridden)", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "fixture",
        devDependencies: { typescript: "6.0.3" },
      }),
      "tsconfig.json": JSON.stringify({ compilerOptions: { strict: true } }),
      "node_modules/.bin/tsc": "",
    };

    const surfaces = classify(files, {
      tasks: { typecheck: { enabled: false, disabledReason: "not now" } },
    });

    expect(surfaces.typecheck.authorityPaths).toContain("ascout.config.json");
    expect(surfaces.typecheck.authorityPaths).toContain("package.json");
    expect(surfaces.typecheck.authorityPaths).toContain("tsconfig.json");
  });

  it("does not resolve TypeScript extends links beyond paths already exposed by discovery", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "fixture",
        devDependencies: { typescript: "6.0.3" },
      }),
      "tsconfig.json": JSON.stringify({
        extends: "./config/tsconfig.base.json",
        include: ["src"],
      }),
      "config/tsconfig.base.json": JSON.stringify({ compilerOptions: { strict: true } }),
      "src/index.ts": "export const value = 1;\n",
      "node_modules/.bin/tsc": "",
    };

    const surfaces = classify(files);

    expect(surfaces.typecheck.authorityPaths).toContain("tsconfig.json");
    expect(surfaces.typecheck.authorityPaths).not.toContain("config/tsconfig.base.json");
  });
});

describe("T038 changed-path intersection in src/discovery.ts", () => {
  it("returns the sorted intersection between authority paths and changed current paths", () => {
    const authorities = ["package.json", "tsconfig.json"];
    const changed: readonly ChangedPathView[] = [
      { path: "tsconfig.json" },
      { path: "src/index.ts" },
    ];

    expect(intersectChangedAuthorityPaths(authorities, changed)).toEqual(["tsconfig.json"]);
  });

  it("considers previous_path when an authority path is renamed away", () => {
    const authorities = ["eslint.config.js"];
    const changed: readonly ChangedPathView[] = [
      { path: "eslint.config.mjs", previous_path: "eslint.config.js" },
    ];

    expect(intersectChangedAuthorityPaths(authorities, changed)).toEqual(["eslint.config.js"]);
  });

  it("considers current path when a rename lands on an authority target", () => {
    const authorities = ["eslint.config.js"];
    const changed: readonly ChangedPathView[] = [
      { path: "eslint.config.js", previous_path: "legacy-eslint.mjs" },
    ];

    expect(intersectChangedAuthorityPaths(authorities, changed)).toEqual(["eslint.config.js"]);
  });

  it("returns empty for unrelated source-only changes", () => {
    const authorities = ["package.json", "vitest.config.ts"];
    const changed: readonly ChangedPathView[] = [
      { path: "src/index.ts" },
      { path: "tests/unit.test.ts" },
    ];

    expect(intersectChangedAuthorityPaths(authorities, changed)).toEqual([]);
  });

  it("deduplicates overlapping authority hits and ignores empty previous paths", () => {
    const authorities = ["ascout.config.json", "package.json"];
    const changed: readonly ChangedPathView[] = [
      { path: "ascout.config.json", previous_path: "ascout.config.json" },
      { path: "package.json" },
      { path: "package.json" },
    ];

    expect(intersectChangedAuthorityPaths(authorities, changed)).toEqual([
      "ascout.config.json",
      "package.json",
    ]);
  });
});
