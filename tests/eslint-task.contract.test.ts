import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseConfigV1, type ConfigV1 } from "../src/config.js";
import {
  discoverProjectFromFiles,
  type DiscoveryFileMap,
} from "../src/discovery.js";
import type { GitChangedFile } from "../src/git.js";
import {
  planESLintTask,
  type ESLintTaskPlan,
} from "../src/tools/eslint.js";

function changed(
  path: string,
  change_kind: GitChangedFile["change_kind"] = "modified",
  line_semantics: GitChangedFile["line_semantics"] = "text",
): GitChangedFile {
  return {
    path,
    change_kind,
    line_semantics,
    changed_new_line_ranges: line_semantics === "text" && change_kind !== "deleted" ? [[1, 1]] : [],
  };
}

function plan(
  files: DiscoveryFileMap,
  changedFiles: readonly GitChangedFile[],
  config: ConfigV1 = parseConfigV1({ version: 1 }),
): ESLintTaskPlan {
  return planESLintTask({
    config,
    discovery: discoverProjectFromFiles(files),
    files,
    changedFiles,
  });
}

function packageJson(value: Record<string, unknown>): string {
  return JSON.stringify(value);
}

function npmPackage(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "fixture",
    private: true,
    packageManager: "npm@11.0.0",
    ...extra,
  };
}

describe("T036 ESLint task planning", () => {
  it("uses an explicit lint command override before local ESLint or package-script discovery", () => {
    const files = {
      "package.json": packageJson(npmPackage({
        scripts: { lint: "eslint ." },
        devDependencies: { eslint: "9.0.0" },
      })),
      "eslint.config.js": "",
      "node_modules/.bin/eslint": "virtual executable",
    };
    const config = parseConfigV1({
      version: 1,
      tasks: { lint: { command: ["custom-lint", "--strict"] } },
    });

    expect(plan(files, [changed("src/app.ts")], config)).toEqual({
      state: "planned",
      taskType: "lint",
      authorizedBy: "user_config",
      sourcePath: "ascout.config.json",
      argv: ["custom-lint", "--strict"],
      workingDirectory: null,
      commandSource: "override",
      configPath: null,
      executionScope: "configured_override",
      scopeRoot: null,
      selectedPaths: [],
      scopeDisclosure: "The lint command is explicitly user-configured; T036 does not infer or narrow its execution scope.",
      reasonCode: null,
      reasonText: null,
    });
  });

  it("rejects invalid override argv before any later execution layer", () => {
    const files = { "package.json": packageJson({ name: "fixture" }) };
    for (const command of [[""], ["custom-lint\0", "--strict"]] as const) {
      const config = parseConfigV1({ version: 1, tasks: { lint: { command } } });
      expect(plan(files, [changed("src/app.ts")], config)).toMatchObject({
        state: "not_run",
        authorizedBy: "user_config",
        sourcePath: "ascout.config.json",
        argv: [],
        reasonCode: "override_command_invalid",
      });
    }
  });

  it("treats explicit lint disable as stronger than every command source", () => {
    const files = {
      "package.json": packageJson(npmPackage({
        scripts: { lint: "eslint ." },
        devDependencies: { eslint: "9.0.0" },
      })),
      "eslint.config.js": "",
      "node_modules/.bin/eslint": "virtual executable",
    };
    const config = parseConfigV1({
      version: 1,
      tasks: {
        lint: {
          enabled: false,
          disabledReason: "lint is handled by a generated external gate",
          command: ["must-not-run"],
        },
      },
    });

    expect(plan(files, [changed("src/app.ts")], config)).toMatchObject({
      state: "not_applicable",
      authorizedBy: "user_config",
      sourcePath: "ascout.config.json",
      argv: [],
      reasonCode: "disabled_by_config",
      reasonText: "lint is handled by a generated external gate",
    });
  });

  it("prefers a safe changed-file local ESLint invocation over a broader root lint script", () => {
    const files = {
      "package.json": packageJson(npmPackage({
        scripts: { lint: "eslint ." },
        devDependencies: { eslint: "9.0.0" },
      })),
      "eslint.config.js": "",
      "node_modules/.bin/eslint": "virtual executable",
      "node_modules/.bin/eslint.cmd": "virtual Windows shim",
      "node_modules/.bin/eslint.ps1": "virtual PowerShell shim",
    };

    expect(plan(files, [changed("src/z.ts"), changed("src/a.js")])).toEqual({
      state: "planned",
      taskType: "lint",
      authorizedBy: "discovery",
      sourcePath: "eslint.config.js",
      argv: [
        "node_modules/.bin/eslint",
        "--config",
        "eslint.config.js",
        "--",
        "src/a.js",
        "src/z.ts",
      ],
      workingDirectory: null,
      commandSource: "local_eslint",
      configPath: "eslint.config.js",
      executionScope: "changed_files",
      scopeRoot: null,
      selectedPaths: ["src/a.js", "src/z.ts"],
      scopeDisclosure: "T036 narrowed ESLint to the changed supported JavaScript/TypeScript files listed in selectedPaths.",
      reasonCode: null,
      reasonText: null,
    });
  });

  it("uses -- before changed paths so a dash-leading filename cannot become an ESLint option", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", devDependencies: { eslint: "9.0.0" } }),
      "eslint.config.js": "",
      "node_modules/.bin/eslint": "virtual executable",
    };

    expect(plan(files, [changed("--fix.js")])).toMatchObject({
      state: "planned",
      argv: ["node_modules/.bin/eslint", "--config", "eslint.config.js", "--", "--fix.js"],
      selectedPaths: ["--fix.js"],
    });
  });

  it("does not pass deleted or non-text changed files to local ESLint", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", devDependencies: { eslint: "9.0.0" } }),
      "eslint.config.js": "",
      "node_modules/.bin/eslint": "virtual executable",
    };

    expect(plan(files, [
      changed("src/live.ts"),
      changed("src/deleted.ts", "deleted", "deleted_only"),
      changed("src/binary.js", "modified", "binary_or_non_line"),
    ])).toMatchObject({
      state: "planned",
      selectedPaths: ["src/live.ts"],
      argv: ["node_modules/.bin/eslint", "--config", "eslint.config.js", "--", "src/live.ts"],
    });
  });

  it("falls back to a root project lint script when no safe changed-file local invocation exists", () => {
    const files = {
      "package.json": packageJson(npmPackage({ scripts: { lint: "eslint ." } })),
    };

    expect(plan(files, [changed("README.md")])).toEqual({
      state: "planned",
      taskType: "lint",
      authorizedBy: "repo_config",
      sourcePath: "package.json",
      argv: ["npm", "run", "lint"],
      workingDirectory: null,
      commandSource: "package_script",
      configPath: null,
      executionScope: "project_script",
      scopeRoot: null,
      selectedPaths: [],
      scopeDisclosure: "The repository-defined lint script is not narrowed by T036 and may inspect a broader package or workspace scope than the changed files.",
      reasonCode: null,
      reasonText: null,
    });
  });

  it("uses one workspace lint script with an explicit workspace scope root when no root script exists", () => {
    const files = {
      "package.json": packageJson(npmPackage({ workspaces: ["packages/*"] })),
      "packages/app/package.json": packageJson({ name: "app", scripts: { lint: "eslint ." } }),
    };

    expect(plan(files, [changed("README.md")])).toMatchObject({
      state: "planned",
      authorizedBy: "repo_config",
      sourcePath: "packages/app/package.json",
      argv: ["npm", "run", "lint"],
      workingDirectory: "packages/app",
      commandSource: "package_script",
      executionScope: "project_script",
      scopeRoot: "packages/app",
      selectedPaths: [],
    });
  });

  it("fails closed when multiple workspace lint scripts exist and no safe local changed-file plan exists", () => {
    const files = {
      "package.json": packageJson(npmPackage({ workspaces: ["packages/*"] })),
      "packages/a/package.json": packageJson({ name: "a", scripts: { lint: "eslint ." } }),
      "packages/b/package.json": packageJson({ name: "b", scripts: { lint: "eslint ." } }),
    };

    expect(plan(files, [changed("README.md")])).toMatchObject({
      state: "not_run",
      authorizedBy: "repo_config",
      argv: [],
      reasonCode: "lint_script_ambiguous",
    });
  });

  it("refuses a package lint script when package-manager discovery is ambiguous", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", scripts: { lint: "eslint ." } }),
      "package-lock.json": "",
      "yarn.lock": "",
    };

    expect(plan(files, [changed("README.md")])).toMatchObject({
      state: "not_run",
      authorizedBy: "repo_config",
      sourcePath: "package.json",
      argv: [],
      reasonCode: "package_manager_ambiguous",
    });
  });

  it("fails closed on multiple ESLint configs when no package script can safely own the broader scope", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", devDependencies: { eslint: "9.0.0" } }),
      "eslint.config.js": "",
      ".eslintrc.json": "",
      "node_modules/.bin/eslint": "virtual executable",
    };

    expect(plan(files, [changed("src/app.ts")])).toMatchObject({
      state: "not_run",
      argv: [],
      reasonCode: "config_ambiguous",
    });
  });

  it("uses a project lint script as the broader fallback when local config selection is ambiguous", () => {
    const files = {
      "package.json": packageJson(npmPackage({
        scripts: { lint: "eslint ." },
        devDependencies: { eslint: "9.0.0" },
      })),
      "eslint.config.js": "",
      ".eslintrc.json": "",
      "node_modules/.bin/eslint": "virtual executable",
    };

    expect(plan(files, [changed("src/app.ts")])).toMatchObject({
      state: "planned",
      commandSource: "package_script",
      executionScope: "project_script",
      argv: ["npm", "run", "lint"],
    });
  });

  it("allows one root-local ESLint executable with one workspace config when every selected path is under that config root", () => {
    const files = {
      "package.json": packageJson({
        name: "root",
        workspaces: ["packages/*"],
        devDependencies: { eslint: "9.0.0" },
      }),
      "packages/app/package.json": packageJson({ name: "app" }),
      "packages/app/eslint.config.js": "",
      "node_modules/.bin/eslint": "virtual executable",
    };

    expect(plan(files, [changed("packages/app/src/app.ts")])).toMatchObject({
      state: "planned",
      sourcePath: "packages/app/eslint.config.js",
      argv: [
        "node_modules/.bin/eslint",
        "--config",
        "packages/app/eslint.config.js",
        "--",
        "packages/app/src/app.ts",
      ],
      executionScope: "changed_files",
      scopeRoot: "packages/app",
      selectedPaths: ["packages/app/src/app.ts"],
    });
  });

  it("fails closed rather than partially linting when the sole config covers only some changed supported files", () => {
    const files = {
      "package.json": packageJson({
        name: "root",
        workspaces: ["packages/*"],
        devDependencies: { eslint: "9.0.0" },
      }),
      "packages/app/package.json": packageJson({ name: "app" }),
      "packages/app/eslint.config.js": "",
      "node_modules/.bin/eslint": "virtual executable",
    };

    expect(plan(files, [changed("packages/app/src/app.ts"), changed("src/root.ts")])).toMatchObject({
      state: "not_run",
      argv: [],
      reasonCode: "lint_scope_ambiguous",
    });
  });

  it("fails closed on multiple logical project-local ESLint roots when no project script is available", () => {
    const files = {
      "package.json": packageJson({
        name: "root",
        workspaces: ["packages/*"],
        devDependencies: { eslint: "9.0.0" },
      }),
      "packages/app/package.json": packageJson({ name: "app", devDependencies: { eslint: "9.0.0" } }),
      "eslint.config.js": "",
      "node_modules/.bin/eslint": "root executable",
      "packages/app/node_modules/.bin/eslint": "workspace executable",
    };

    expect(plan(files, [changed("src/root.ts")])).toMatchObject({
      state: "not_run",
      argv: [],
      reasonCode: "tool_ambiguous",
    });
  });

  it("does not treat a PowerShell-only ESLint shim as directly launchable", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", devDependencies: { eslint: "9.0.0" } }),
      "eslint.config.js": "",
      "node_modules/.bin/eslint.ps1": "PowerShell shim only",
    };

    expect(plan(files, [changed("src/app.ts")])).toMatchObject({
      state: "not_run",
      argv: [],
      reasonCode: "tool_unsupported",
    });
  });

  it("reports configured ESLint with no project-local executable as tool_missing", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", devDependencies: { eslint: "9.0.0" } }),
      "eslint.config.js": "",
    };

    expect(plan(files, [changed("src/app.ts")])).toMatchObject({
      state: "not_run",
      argv: [],
      reasonCode: "tool_missing",
      reasonText: "Project ESLint is not installed.",
    });
  });

  it("is NOT_APPLICABLE when there is no lint override, script, ESLint declaration, local tool, or config", () => {
    const files = { "package.json": packageJson({ name: "plain-js", private: true }) };

    expect(plan(files, [changed("src/app.js")])).toEqual({
      state: "not_applicable",
      taskType: "lint",
      authorizedBy: "discovery",
      sourcePath: null,
      argv: [],
      workingDirectory: null,
      commandSource: null,
      configPath: null,
      executionScope: null,
      scopeRoot: null,
      selectedPaths: [],
      scopeDisclosure: null,
      reasonCode: null,
      reasonText: null,
    });
  });

  it("is NOT_APPLICABLE with disclosure when ESLint exists but no changed supported file is safely applicable", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", devDependencies: { eslint: "9.0.0" } }),
      "eslint.config.js": "",
      "node_modules/.bin/eslint": "virtual executable",
    };

    expect(plan(files, [changed("README.md")])).toMatchObject({
      state: "not_applicable",
      argv: [],
      reasonCode: "no_changed_supported_files",
      reasonText: "ESLint is present, but no changed supported JavaScript/TypeScript files are safely applicable and no lint script is available.",
    });
  });

  it("rejects noncanonical changed-file paths instead of placing them in argv", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", devDependencies: { eslint: "9.0.0" } }),
      "eslint.config.js": "",
      "node_modules/.bin/eslint": "virtual executable",
    };

    expect(plan(files, [changed("src//app.ts")])).toMatchObject({
      state: "not_run",
      argv: [],
      reasonCode: "changed_path_invalid",
    });
  });

  it("keeps T036 planning pure and outside command-surface classification/admission", () => {
    const source = readFileSync(new URL("../src/tools/eslint.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/child_process|cross-spawn|spawn\(|exec\(/u);
    expect(source).not.toMatch(/installDependency|npm\s+install|pnpm\s+install|yarn\s+add|\bnpx\b/u);
    expect(source).not.toContain("allow-changed-command-surface");
    expect(source).not.toMatch(/command_surface_changed|execution_admission/u);
    expect(source).not.toMatch(/vitest|jest|pytest/u);
  });
});
