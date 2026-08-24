import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseConfigV1, type ConfigV1 } from "../src/config.js";
import {
  discoverProjectFromFiles,
  type DiscoveryFileMap,
} from "../src/discovery.js";
import {
  planPytestBasicTask,
  type PytestTaskPlan,
} from "../src/tools/pytest.js";

function plan(
  files: DiscoveryFileMap,
  config: ConfigV1 = parseConfigV1({ version: 1 }),
): PytestTaskPlan {
  return planPytestBasicTask({
    config,
    discovery: discoverProjectFromFiles(files),
    files,
  });
}

function packageJson(value: Record<string, unknown>): string {
  return JSON.stringify(value);
}

function configuredPackage(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: "fixture",
    private: true,
    packageManager: "npm@11.0.0",
    ...extra,
  };
}

describe("T037 pytestBasic task planning", () => {
  it("uses explicit Ascout command override before discovery", () => {
    const files = {
      "package.json": packageJson(configuredPackage()),
      "pytest.ini": "[pytest]",
    };
    const config = parseConfigV1({
      version: 1,
      tasks: { pytestBasic: { command: ["custom-pytest", "-xvs"] } },
    });

    expect(plan(files, config)).toEqual({
      state: "planned",
      taskType: "pytestBasic",
      authorizedBy: "user_config",
      sourcePath: "ascout.config.json",
      argv: ["custom-pytest", "-xvs"],
      workingDirectory: null,
      commandSource: "override",
      effectivePytestConfigPath: null,
      reasonCode: null,
      reasonText: null,
    });
  });

  it("rejects pytestBasic command overrides that process control cannot safely accept", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", private: true }),
    };
    const invalidCommands = [
      [""],
      ["custom-pytest\0", "-xvs"],
    ] as const;

    for (const command of invalidCommands) {
      const config = parseConfigV1({
        version: 1,
        tasks: { pytestBasic: { command } },
      });

      expect(plan(files, config)).toMatchObject({
        state: "not_run",
        authorizedBy: "user_config",
        sourcePath: "ascout.config.json",
        argv: [],
        commandSource: null,
        reasonCode: "override_command_invalid",
      });
    }
  });

  it("treats an explicit disable as stronger than every command source", () => {
    const files = {
      "package.json": packageJson(configuredPackage()),
      "pytest.ini": "[pytest]",
    };
    const config = parseConfigV1({
      version: 1,
      tasks: {
        pytestBasic: {
          enabled: false,
          disabledReason: "Python tests are handled in CI only",
          command: ["must-not-run"],
        },
      },
    });

    expect(plan(files, config)).toMatchObject({
      state: "not_applicable",
      authorizedBy: "user_config",
      sourcePath: "ascout.config.json",
      argv: [],
      commandSource: null,
      reasonCode: "disabled_by_config",
      reasonText: "Python tests are handled in CI only",
    });
  });

  it("plans basic pytest with a resolved pytest.ini config source", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", private: true }),
      "pytest.ini": "[pytest]\ntestpaths = tests",
    };

    expect(plan(files)).toEqual({
      state: "planned",
      taskType: "pytestBasic",
      authorizedBy: "discovery",
      sourcePath: "pytest.ini",
      argv: ["pytest"],
      workingDirectory: null,
      commandSource: "discovery",
      effectivePytestConfigPath: "pytest.ini",
      reasonCode: null,
      reasonText: null,
    });
  });

  it("reports the effective pyproject.toml config source when [tool.pytest.ini_options] is present", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", private: true }),
      "pyproject.toml": "[tool.pytest.ini_options]\ntestpaths = [\"tests\"]\n",
    };

    expect(plan(files)).toMatchObject({
      state: "planned",
      sourcePath: "pyproject.toml",
      argv: ["pytest"],
      commandSource: "discovery",
      effectivePytestConfigPath: "pyproject.toml",
    });
  });

  it("reports the effective setup.cfg config source when [tool:pytest] is present", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", private: true }),
      "setup.cfg": "[tool:pytest]\ntestpaths = tests\n",
    };

    expect(plan(files)).toMatchObject({
      state: "planned",
      sourcePath: "setup.cfg",
      argv: ["pytest"],
      commandSource: "discovery",
      effectivePytestConfigPath: "setup.cfg",
    });
  });

  it("reports the effective tox.ini config source when [pytest] section is present", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", private: true }),
      "tox.ini": "[pytest]\ntestpaths = tests\n",
    };

    expect(plan(files)).toMatchObject({
      state: "planned",
      sourcePath: "tox.ini",
      argv: ["pytest"],
      commandSource: "discovery",
      effectivePytestConfigPath: "tox.ini",
    });
  });

  it("is NOT_APPLICABLE when no pytest configuration is discovered", () => {
    const files = {
      "package.json": packageJson({ name: "plain-js", private: true }),
    };

    expect(plan(files)).toEqual({
      state: "not_applicable",
      taskType: "pytestBasic",
      authorizedBy: "discovery",
      sourcePath: null,
      argv: [],
      workingDirectory: null,
      commandSource: null,
      effectivePytestConfigPath: null,
      reasonCode: null,
      reasonText: null,
    });
  });

  it("fails closed on multiple pytest configurations without choosing one arbitrarily", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", private: true }),
      "pytest.ini": "[pytest]",
      "pyproject.toml": "[tool.pytest.ini_options]\n",
    };

    expect(plan(files)).toMatchObject({
      state: "not_run",
      authorizedBy: "discovery",
      argv: [],
      commandSource: null,
      effectivePytestConfigPath: null,
      reasonCode: "pytest_config_ambiguous",
      reasonText: "Multiple applicable pytest configuration files were discovered.",
    });
  });

  it("does not invent npx, a Python package manager, pip install, venv, uv, or poetry execution", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", private: true }),
      "pytest.ini": "[pytest]",
    };

    const result = plan(files);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("npx");
    expect(serialized).not.toContain("pip");
    expect(serialized).not.toContain("poetry");
    expect(serialized).not.toContain("uv");
    expect(serialized).not.toContain("venv");
    expect(serialized).not.toContain("conda");
    expect(serialized).not.toContain("install");
    expect(result.argv).toEqual(["pytest"]);
  });

  it("exposes no Python environment selection, creation, or discovery architecture", () => {
    const source = readFileSync(new URL("../src/tools/pytest.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/venv|virtualenv|conda|\.venv|uv\b|poetry|pipenv/u);
    expect(source).not.toMatch(/pythonPath|pythonExecutable|envPath|environment/u);
    expect(source).not.toMatch(/version.*python|python.*version|sys\.version/u);
  });

  it("exposes no coverage, affected-test selection, or changed-line exercise architecture", () => {
    const source = readFileSync(new URL("../src/tools/pytest.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/coverage|lcov|testmon|affected|changed.*line|exercise|not_exercised|unresolved/u);
    expect(source).not.toContain("--cov");
    expect(source).not.toContain("pytest-cov");
  });

  it("keeps T037 planning pure and outside T038+ command admission/classification", () => {
    const source = readFileSync(new URL("../src/tools/pytest.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/child_process|cross-spawn|spawn\(|exec\(/u);
    expect(source).not.toContain("allow-changed-command-surface");
    expect(source).not.toMatch(/command_surface_changed|execution_admission|changed_authority_paths/u);
    expect(source).not.toMatch(/typecheck|lint|vitest|jest/u);
  });
});
