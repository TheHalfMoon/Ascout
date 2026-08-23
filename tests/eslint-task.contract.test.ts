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
  it("uses explicit override before discovered commands", () => {
    const files = {
      "package.json": packageJson(npmPackage({
        scripts: { lint: "eslint ." },
        devDependencies: { eslint: "10.0.0" },
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

  it("rejects invalid override argv", () => {
    const files = { "package.json": packageJson({ name: "fixture" }) };
    for (const command of [[""], ["custom-lint\0", "--strict"]] as const) {
      const config = parseConfigV1({ version: 1, tasks: { lint: { command } } });
      expect(plan(files, [changed("src/app.ts")], config)).toMatchObject({
        state: "not_run",
        authorizedBy: "user_config",
        argv: [],
        reasonCode: "override_command_invalid",
      });
    }
  });

  it("treats explicit disable as stronger than override and discovery", () => {
    const files = {
      "package.json": packageJson(npmPackage({ scripts: { lint: "eslint ." } })),
    };
    const config = parseConfigV1({
      version: 1,
      tasks: {
        lint: {
          enabled: false,
          disabledReason: "lint is handled elsewhere",
          command: ["must-not-run"],
        },
      },
    });

    expect(plan(files, [changed("src/app.ts")], config)).toMatchObject({
      state: "not_applicable",
      authorizedBy: "user_config",
      argv: [],
      reasonCode: "disabled_by_config",
      reasonText: "lint is handled elsewhere",
    });
  });

  it("prefers safe root changed-file ESLint over a broader root lint script", () => {
    const files = {
      "package.json": packageJson(npmPackage({
        scripts: { lint: "eslint ." },
        devDependencies: { eslint: "10.0.0" },
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
      scopeDisclosure: "T036 narrowed ESLint to the changed supported JavaScript/TypeScript files listed in selectedPaths; workspace config execution is rooted at scopeRoot so relative config patterns retain repository semantics.",
      reasonCode: null,
      reasonText: null,
    });
  });

  it("roots a workspace config invocation at the workspace so config patterns keep their meaning", () => {
    const files = {
      "package.json": packageJson({
        name: "root",
        workspaces: ["packages/*"],
        devDependencies: { eslint: "10.0.0" },
      }),
      "packages/app/package.json": packageJson({ name: "app" }),
      "packages/app/eslint.config.js": "",
      "node_modules/.bin/eslint": "root-hoisted executable",
    };

    expect(plan(files, [changed("packages/app/src/app.ts")])).toMatchObject({
      state: "planned",
      sourcePath: "packages/app/eslint.config.js",
      workingDirectory: "packages/app",
      argv: [
        "../../node_modules/.bin/eslint",
        "--config",
        "eslint.config.js",
        "--",
        "src/app.ts",
      ],
      commandSource: "local_eslint",
      configPath: "packages/app/eslint.config.js",
      executionScope: "changed_files",
      scopeRoot: "packages/app",
      selectedPaths: ["packages/app/src/app.ts"],
    });
  });

  it("uses a same-workspace local ESLint without parent traversal", () => {
    const files = {
      "package.json": packageJson({ name: "root", workspaces: ["packages/*"] }),
      "packages/app/package.json": packageJson({
        name: "app",
        devDependencies: { eslint: "10.0.0" },
      }),
      "packages/app/eslint.config.mjs": "",
      "packages/app/node_modules/.bin/eslint": "workspace executable",
    };

    expect(plan(files, [changed("packages/app/src/app.ts")])).toMatchObject({
      state: "planned",
      workingDirectory: "packages/app",
      argv: ["node_modules/.bin/eslint", "--config", "eslint.config.mjs", "--", "src/app.ts"],
      scopeRoot: "packages/app",
    });
  });

  it("refuses an executable that belongs to an unrelated workspace", () => {
    const files = {
      "package.json": packageJson({ name: "root", workspaces: ["packages/*"] }),
      "packages/app/package.json": packageJson({ name: "app" }),
      "packages/other/package.json": packageJson({ name: "other", devDependencies: { eslint: "10.0.0" } }),
      "packages/app/eslint.config.js": "",
      "packages/other/node_modules/.bin/eslint": "other executable",
    };

    expect(plan(files, [changed("packages/app/src/app.ts")])).toMatchObject({
      state: "not_run",
      argv: [],
      reasonCode: "tool_scope_ambiguous",
    });
  });

  it("inserts -- before changed paths and sorts them deterministically", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", devDependencies: { eslint: "10.0.0" } }),
      "eslint.config.cjs": "",
      "node_modules/.bin/eslint": "virtual executable",
    };

    expect(plan(files, [changed("z.ts"), changed("--fix.js")])).toMatchObject({
      state: "planned",
      argv: ["node_modules/.bin/eslint", "--config", "eslint.config.cjs", "--", "--fix.js", "z.ts"],
      selectedPaths: ["--fix.js", "z.ts"],
    });
  });

  it("does not pass deleted or non-text changed files to local ESLint", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", devDependencies: { eslint: "10.0.0" } }),
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

  it("falls back to a root project lint script with broader-scope disclosure", () => {
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

  it("uses one workspace lint script with workspace scope when no root script exists", () => {
    const files = {
      "package.json": packageJson(npmPackage({ workspaces: ["packages/*"] })),
      "packages/app/package.json": packageJson({ name: "app", scripts: { lint: "eslint ." } }),
    };

    expect(plan(files, [changed("README.md")])).toMatchObject({
      state: "planned",
      sourcePath: "packages/app/package.json",
      argv: ["npm", "run", "lint"],
      workingDirectory: "packages/app",
      executionScope: "project_script",
      scopeRoot: "packages/app",
    });
  });

  it("fails closed on multiple workspace lint scripts", () => {
    const files = {
      "package.json": packageJson(npmPackage({ workspaces: ["packages/*"] })),
      "packages/a/package.json": packageJson({ name: "a", scripts: { lint: "eslint ." } }),
      "packages/b/package.json": packageJson({ name: "b", scripts: { lint: "eslint ." } }),
    };

    expect(plan(files, [changed("README.md")])).toMatchObject({
      state: "not_run",
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
      sourcePath: "package.json",
      argv: [],
      reasonCode: "package_manager_ambiguous",
    });
  });

  it("fails closed on multiple configs when no script owns broader semantics", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", devDependencies: { eslint: "10.0.0" } }),
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

  it("uses the repository lint script when local config selection is ambiguous", () => {
    const files = {
      "package.json": packageJson(npmPackage({
        scripts: { lint: "eslint ." },
        devDependencies: { eslint: "10.0.0" },
      })),
      "eslint.config.js": "",
      "packages/app/eslint.config.js": "",
      "node_modules/.bin/eslint": "virtual executable",
    };

    expect(plan(files, [changed("src/app.ts")])).toMatchObject({
      state: "planned",
      argv: ["npm", "run", "lint"],
      commandSource: "package_script",
      executionScope: "project_script",
    });
  });

  it("fails closed instead of partially linting changed supported files outside the sole config root", () => {
    const files = {
      "package.json": packageJson({
        name: "root",
        workspaces: ["packages/*"],
        devDependencies: { eslint: "10.0.0" },
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

  it("fails closed on multiple logical project-local ESLint roots", () => {
    const files = {
      "package.json": packageJson({ name: "root", workspaces: ["packages/*"] }),
      "packages/app/package.json": packageJson({ name: "app" }),
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

  it("does not treat a PowerShell-only shim as directly launchable", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", devDependencies: { eslint: "10.0.0" } }),
      "eslint.config.js": "",
      "node_modules/.bin/eslint.ps1": "PowerShell shim only",
    };

    expect(plan(files, [changed("src/app.ts")])).toMatchObject({
      state: "not_run",
      argv: [],
      reasonCode: "tool_unsupported",
    });
  });

  it("reports configured ESLint without a local executable as tool_missing", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", devDependencies: { eslint: "10.0.0" } }),
      "eslint.config.js": "",
    };

    expect(plan(files, [changed("src/app.ts")])).toMatchObject({
      state: "not_run",
      argv: [],
      reasonCode: "tool_missing",
    });
  });

  it("is NOT_APPLICABLE with no ESLint evidence", () => {
    const files = { "package.json": packageJson({ name: "plain-js", private: true }) };
    expect(plan(files, [changed("src/app.js")])).toMatchObject({
      state: "not_applicable",
      argv: [],
      reasonCode: null,
    });
  });

  it("is NOT_APPLICABLE when ESLint exists but no changed supported file or lint script applies", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", devDependencies: { eslint: "10.0.0" } }),
      "eslint.config.js": "",
      "node_modules/.bin/eslint": "virtual executable",
    };

    expect(plan(files, [changed("README.md")])).toMatchObject({
      state: "not_applicable",
      argv: [],
      reasonCode: "no_changed_supported_files",
    });
  });

  it("keeps T036 planning pure and outside classification/admission", () => {
    const source = readFileSync(new URL("../src/tools/eslint.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/child_process|cross-spawn|spawn\(|exec\(/u);
    expect(source).not.toMatch(/installDependency|npm\s+install|pnpm\s+install|yarn\s+add|\bnpx\b/u);
    expect(source).not.toContain("allow-changed-command-surface");
    expect(source).not.toMatch(/command_surface_changed|execution_admission/u);
    expect(source).not.toMatch(/vitest|jest|pytest/u);
  });
});
