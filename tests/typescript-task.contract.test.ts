import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseConfigV1, type ConfigV1 } from "../src/config.js";
import {
  discoverProjectFromFiles,
  type DiscoveryFileMap,
} from "../src/discovery.js";
import {
  planTypeScriptTask,
  type TypeScriptTaskPlan,
} from "../src/tools/typescript.js";

interface MissingCapabilityCase {
  readonly id: string;
  readonly files: Readonly<Record<string, string>>;
  readonly expected: {
    readonly status: "NOT_RUN";
    readonly reason_code: string;
    readonly reason_text: string;
  };
}

interface MissingCapabilityCatalog {
  readonly cases: readonly MissingCapabilityCase[];
}

const MISSING_CAPABILITY_URL = new URL(
  "./fixtures/missing-capability/cases.json",
  import.meta.url,
);

function plan(
  files: DiscoveryFileMap,
  config: ConfigV1 = parseConfigV1({ version: 1 }),
): TypeScriptTaskPlan {
  return planTypeScriptTask({
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

describe("T035 TypeScript task planning", () => {
  it("uses explicit Ascout command override before ambiguous package-manager/script/local-tsc discovery", () => {
    const files = {
      "package.json": packageJson({
        name: "fixture",
        scripts: { typecheck: "tsc -p tsconfig.json --noEmit" },
        devDependencies: { typescript: "6.0.0" },
      }),
      "package-lock.json": "",
      "yarn.lock": "",
      "tsconfig.json": "{}",
      "node_modules/.bin/tsc": "virtual executable",
    };
    const config = parseConfigV1({
      version: 1,
      tasks: { typecheck: { command: ["custom-typecheck", "--strict"] } },
    });

    expect(plan(files, config)).toEqual({
      state: "planned",
      taskType: "typecheck",
      authorizedBy: "user_config",
      sourcePath: "ascout.config.json",
      argv: ["custom-typecheck", "--strict"],
      workingDirectory: null,
      commandSource: "override",
      configPath: null,
      reasonCode: null,
      reasonText: null,
    });
  });

  it("rejects TypeScript command overrides that process control cannot safely accept", () => {
    const files = {
      "package.json": packageJson({ name: "fixture", private: true }),
    };
    const invalidCommands = [
      [""],
      ["custom-typecheck\0", "--strict"],
    ] as const;

    for (const command of invalidCommands) {
      const config = parseConfigV1({
        version: 1,
        tasks: { typecheck: { command } },
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
      "package.json": packageJson(configuredPackage({
        scripts: { typecheck: "tsc --noEmit" },
        devDependencies: { typescript: "6.0.0" },
      })),
      "tsconfig.json": "{}",
      "node_modules/.bin/tsc": "virtual executable",
    };
    const config = parseConfigV1({
      version: 1,
      tasks: {
        typecheck: {
          enabled: false,
          disabledReason: "generated sources are checked elsewhere",
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
      reasonText: "generated sources are checked elsewhere",
    });
  });

  it("uses a root typecheck script before local tsc and launches it through the resolved package manager", () => {
    const files = {
      "package.json": packageJson(configuredPackage({
        scripts: { typecheck: "tsc -p tsconfig.json --noEmit" },
        devDependencies: { typescript: "6.0.0" },
      })),
      "tsconfig.json": "{}",
      "node_modules/.bin/tsc": "virtual executable",
    };

    expect(plan(files)).toEqual({
      state: "planned",
      taskType: "typecheck",
      authorizedBy: "repo_config",
      sourcePath: "package.json",
      argv: ["npm", "run", "typecheck"],
      workingDirectory: null,
      commandSource: "package_script",
      configPath: null,
      reasonCode: null,
      reasonText: null,
    });
  });

  it("uses one workspace typecheck script with its package working directory when no root script exists", () => {
    const files = {
      "package.json": packageJson(configuredPackage({ workspaces: ["packages/*"] })),
      "packages/app/package.json": packageJson({
        name: "app",
        scripts: { typecheck: "tsc --noEmit" },
      }),
    };

    expect(plan(files)).toMatchObject({
      state: "planned",
      authorizedBy: "repo_config",
      sourcePath: "packages/app/package.json",
      argv: ["npm", "run", "typecheck"],
      workingDirectory: "packages/app",
      commandSource: "package_script",
    });
  });

  it("prefers a root typecheck script over workspace scripts rather than inventing workspace orchestration", () => {
    const files = {
      "package.json": packageJson(configuredPackage({
        workspaces: ["packages/*"],
        scripts: { typecheck: "tsc -b --noEmit" },
      })),
      "packages/app/package.json": packageJson({
        name: "app",
        scripts: { typecheck: "tsc --noEmit" },
      }),
    };

    expect(plan(files)).toMatchObject({
      state: "planned",
      sourcePath: "package.json",
      workingDirectory: null,
      commandSource: "package_script",
    });
  });

  it("fails closed when multiple workspace scripts exist without a root typecheck script", () => {
    const files = {
      "package.json": packageJson(configuredPackage({ workspaces: ["packages/*"] })),
      "packages/a/package.json": packageJson({ name: "a", scripts: { typecheck: "tsc --noEmit" } }),
      "packages/b/package.json": packageJson({ name: "b", scripts: { typecheck: "tsc --noEmit" } }),
    };

    expect(plan(files)).toMatchObject({
      state: "not_run",
      authorizedBy: "repo_config",
      argv: [],
      reasonCode: "typecheck_script_ambiguous",
    });
  });

  it("does not launch a package script when package-manager discovery is ambiguous", () => {
    const files = {
      "package.json": packageJson({
        name: "fixture",
        scripts: { typecheck: "tsc --noEmit" },
      }),
      "package-lock.json": "",
      "yarn.lock": "",
    };

    expect(plan(files)).toMatchObject({
      state: "not_run",
      authorizedBy: "repo_config",
      sourcePath: "package.json",
      argv: [],
      reasonCode: "package_manager_ambiguous",
    });
  });

  it("falls back to one logical project-local tsc plus one same-scope TypeScript config", () => {
    const files = {
      "package.json": packageJson({
        name: "fixture",
        private: true,
        devDependencies: { typescript: "6.0.0" },
      }),
      "tsconfig.json": "{}",
      "node_modules/.bin/tsc": "virtual executable",
      "node_modules/.bin/tsc.cmd": "virtual Windows shim",
      "node_modules/.bin/tsc.ps1": "virtual PowerShell shim",
    };

    expect(plan(files)).toEqual({
      state: "planned",
      taskType: "typecheck",
      authorizedBy: "discovery",
      sourcePath: "tsconfig.json",
      argv: ["node_modules/.bin/tsc", "-p", "tsconfig.json", "--noEmit"],
      workingDirectory: null,
      commandSource: "local_tsc",
      configPath: "tsconfig.json",
      reasonCode: null,
      reasonText: null,
    });
  });

  it("pairs a workspace-local tsc only with a config in that same workspace root", () => {
    const files = {
      "package.json": packageJson({ name: "root", workspaces: ["packages/*"] }),
      "packages/app/package.json": packageJson({
        name: "app",
        devDependencies: { typescript: "6.0.0" },
      }),
      "packages/app/tsconfig.json": "{}",
      "packages/app/node_modules/.bin/tsc": "virtual executable",
    };

    expect(plan(files)).toMatchObject({
      state: "planned",
      sourcePath: "packages/app/tsconfig.json",
      argv: [
        "packages/app/node_modules/.bin/tsc",
        "-p",
        "packages/app/tsconfig.json",
        "--noEmit",
      ],
      commandSource: "local_tsc",
      configPath: "packages/app/tsconfig.json",
    });
  });

  it("allows one root-hoisted local tsc to use the only discovered workspace TypeScript config", () => {
    const files = {
      "package.json": packageJson({
        name: "root",
        workspaces: ["packages/*"],
        devDependencies: { typescript: "6.0.0" },
      }),
      "node_modules/.bin/tsc": "hoisted executable",
      "packages/app/package.json": packageJson({ name: "app" }),
      "packages/app/tsconfig.json": "{}",
    };

    expect(plan(files)).toMatchObject({
      state: "planned",
      sourcePath: "packages/app/tsconfig.json",
      argv: ["node_modules/.bin/tsc", "-p", "packages/app/tsconfig.json", "--noEmit"],
      commandSource: "local_tsc",
    });
  });

  it("does not treat a PowerShell-only shim as directly launchable local tsc", () => {
    const files = {
      "package.json": packageJson({
        name: "fixture",
        devDependencies: { typescript: "6.0.0" },
      }),
      "tsconfig.json": "{}",
      "node_modules/.bin/tsc.ps1": "PowerShell shim only",
    };

    expect(plan(files)).toMatchObject({
      state: "not_run",
      argv: [],
      reasonCode: "tool_unsupported",
    });
  });

  it("binds the T031 missing-config fixture to production T035 planning", () => {
    const catalog = JSON.parse(readFileSync(MISSING_CAPABILITY_URL, "utf8")) as MissingCapabilityCatalog;
    const fixture = catalog.cases.find(({ id }) => id === "typecheck-missing-project-config")!;

    const result = plan(fixture.files);
    expect(result).toMatchObject({
      state: "not_run",
      argv: [],
      commandSource: null,
      reasonCode: fixture.expected.reason_code,
      reasonText: fixture.expected.reason_text,
    });
    expect(result.argv).not.toContain("npx");
  });

  it("reports a missing local TypeScript tool without inventing npx, a global tsc, or an install command", () => {
    const files = {
      "package.json": packageJson({
        name: "fixture",
        devDependencies: { typescript: "6.0.0" },
      }),
      "tsconfig.json": "{}",
    };

    const result = plan(files);
    expect(result).toMatchObject({
      state: "not_run",
      argv: [],
      reasonCode: "tool_missing",
      reasonText: "Project TypeScript is not installed.",
    });
    expect(JSON.stringify(result)).not.toContain("npx");
    expect(result.argv).toEqual([]);
  });

  it("fails closed on multiple logical local tsc roots", () => {
    const files = {
      "package.json": packageJson({
        name: "root",
        workspaces: ["packages/*"],
        devDependencies: { typescript: "6.0.0" },
      }),
      "tsconfig.json": "{}",
      "node_modules/.bin/tsc": "root executable",
      "packages/app/package.json": packageJson({
        name: "app",
        devDependencies: { typescript: "6.0.0" },
      }),
      "packages/app/tsconfig.json": "{}",
      "packages/app/node_modules/.bin/tsc": "workspace executable",
    };

    expect(plan(files)).toMatchObject({
      state: "not_run",
      argv: [],
      reasonCode: "tool_ambiguous",
    });
  });

  it("fails closed on multiple same-scope TypeScript configs for local tsc fallback", () => {
    const files = {
      "package.json": packageJson({
        name: "fixture",
        devDependencies: { typescript: "6.0.0" },
      }),
      "tsconfig.json": "{}",
      "tsconfig.build.json": "{}",
      "node_modules/.bin/tsc": "virtual executable",
    };

    expect(plan(files)).toMatchObject({
      state: "not_run",
      argv: [],
      reasonCode: "config_ambiguous",
    });
  });

  it("is NOT_APPLICABLE when no override, script, TypeScript declaration, config, or local tsc exists", () => {
    const files = {
      "package.json": packageJson({ name: "plain-js", private: true }),
    };

    expect(plan(files)).toEqual({
      state: "not_applicable",
      taskType: "typecheck",
      authorizedBy: "discovery",
      sourcePath: null,
      argv: [],
      workingDirectory: null,
      commandSource: null,
      configPath: null,
      reasonCode: null,
      reasonText: null,
    });
  });

  it("keeps T035 planning pure and within TypeScript scope", () => {
    const source = readFileSync(new URL("../src/tools/typescript.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/child_process|cross-spawn|spawn\(|exec\(/u);
    expect(source).not.toMatch(/installDependency|npm\s+install|pnpm\s+install|yarn\s+add|\bnpx\b/u);
    expect(source).not.toMatch(/eslint|vitest|jest|pytest/u);
    expect(source).not.toContain("allow-changed-command-surface");
  });
});
