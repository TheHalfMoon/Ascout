import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import {
  classifyCommandSurfaces,
  discoverProjectFromFiles,
} from "../src/discovery.js";
import type { GitChangedFile } from "../src/git.js";
import { planESLintTask } from "../src/tools/eslint.js";

const temporaryDirectories: string[] = [];
const originalSecret = process.env.ASCOUT_PR41_SECRET;
const NULL_GIT_CONFIG = process.platform === "win32" ? "NUL" : "/dev/null";
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: NULL_GIT_CONFIG,
  GIT_CONFIG_SYSTEM: NULL_GIT_CONFIG,
  GIT_TERMINAL_PROMPT: "0",
};

function git(repositoryRoot: string, argv: readonly string[]): string {
  return execFileSync("git", [...argv], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: GIT_ENV,
    windowsHide: true,
  });
}

function makeRepository(): string {
  const repositoryRoot = mkdtempSync(join(tmpdir(), "ascout-pr41-"));
  temporaryDirectories.push(repositoryRoot);
  git(repositoryRoot, ["init", "-q"]);
  git(repositoryRoot, ["config", "user.name", "Ascout Test"]);
  git(repositoryRoot, ["config", "user.email", "ascout@example.invalid"]);
  git(repositoryRoot, ["config", "commit.gpgsign", "false"]);
  git(repositoryRoot, ["config", "core.autocrlf", "false"]);
  writeFileSync(join(repositoryRoot, ".gitignore"), ".ascout/\n", "utf8");
  return repositoryRoot;
}

function commitAll(repositoryRoot: string, message = "base"): void {
  git(repositoryRoot, ["add", "--all"]);
  git(repositoryRoot, ["commit", "-q", "-m", message]);
}

function changed(path: string): GitChangedFile {
  return {
    path,
    change_kind: "modified",
    line_semantics: "text",
    changed_new_line_ranges: [[1, 1]],
  };
}

function packageJson(value: Record<string, unknown>): string {
  return JSON.stringify(value);
}

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.ASCOUT_PR41_SECRET;
  } else {
    process.env.ASCOUT_PR41_SECRET = originalSecret;
  }
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("PR #41 P0 discovery regressions", () => {
  it("does not fabricate a root package manifest in a package-less repository", () => {
    const discovery = discoverProjectFromFiles({
      "pyproject.toml": "[tool.pytest.ini_options]\naddopts = '-q'\n",
      "examples/demo/package.json": packageJson({
        name: "demo",
        scripts: { lint: "eslint ." },
      }),
      "examples/demo/eslint.config.js": "export default [];\n",
    });

    expect(discovery.workspace).toMatchObject({
      state: "resolved",
      kind: "single",
      packageJsonPaths: [],
    });
    expect(discovery.packageManager.state).toBe("absent");
    expect(discovery.tools.eslint.declarationPaths).toEqual([]);
    expect(discovery.tools.eslint.configPaths).toEqual([]);
    expect(discovery.packageScriptAuthority.lint).toEqual([]);
  });

  it("keeps undeclared nested packages outside a single-package repository scope", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": packageJson({
        name: "root",
        devDependencies: { eslint: "10.0.0" },
      }),
      "eslint.config.js": "export default [];\n",
      "examples/demo/package.json": packageJson({
        name: "demo",
        scripts: { lint: "eslint ." },
        devDependencies: { eslint: "10.0.0" },
      }),
      "examples/demo/eslint.config.js": "export default [];\n",
    });

    expect(discovery.workspace.packageJsonPaths).toEqual(["package.json"]);
    expect(discovery.tools.eslint.declarationPaths).toEqual(["package.json"]);
    expect(discovery.tools.eslint.configPaths).toEqual(["eslint.config.js"]);
    expect(discovery.packageScriptAuthority.lint).toEqual([]);
  });

  it("treats only manifests that actually define or declare task authority as command surfaces", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": packageJson({
        name: "root",
        workspaces: ["packages/*"],
      }),
      "packages/app/package.json": packageJson({
        name: "app",
        scripts: { lint: "eslint ." },
      }),
      "packages/docs/package.json": packageJson({ name: "docs" }),
    });
    const surfaces = classifyCommandSurfaces(discovery);

    expect(discovery.packageScriptAuthority.lint).toEqual(["packages/app/package.json"]);
    expect(surfaces.lint.authorityPaths).toContain("packages/app/package.json");
    expect(surfaces.lint.authorityPaths).not.toContain("packages/docs/package.json");
  });
});

describe("PR #41 P0 ESLint scope regression", () => {
  it("does not use an unrelated workspace lint script to resolve multi-config ambiguity", () => {
    const files = {
      "package.json": packageJson({
        name: "root",
        private: true,
        packageManager: "npm@11.0.0",
        workspaces: ["packages/*"],
        devDependencies: { eslint: "10.0.0" },
      }),
      "packages/app/package.json": packageJson({ name: "app" }),
      "packages/other/package.json": packageJson({
        name: "other",
        scripts: { lint: "eslint ." },
      }),
      "packages/app/eslint.config.js": "export default [];\n",
      "packages/other/eslint.config.js": "export default [];\n",
      "node_modules/.bin/eslint": "virtual executable",
    };

    const plan = planESLintTask({
      config: { version: 1 },
      discovery: discoverProjectFromFiles(files),
      files,
      changedFiles: [changed("packages/app/src/app.ts")],
    });

    expect(plan).toMatchObject({
      state: "not_run",
      argv: [],
      reasonCode: "config_ambiguous",
    });
    expect(plan.sourcePath).not.toBe("packages/other/package.json");
  });
});

describe("PR #41 P0 receipt integrity regressions", () => {
  it("redacts selected secret values from admission-refused argv", async () => {
    const repositoryRoot = makeRepository();
    const secret = "pr41-super-secret-value";
    process.env.ASCOUT_PR41_SECRET = secret;

    writeFileSync(
      join(repositoryRoot, "ascout.config.json"),
      JSON.stringify({ version: 1 }, null, 2),
      "utf8",
    );
    commitAll(repositoryRoot);

    writeFileSync(
      join(repositoryRoot, "ascout.config.json"),
      JSON.stringify({
        version: 1,
        redactEnv: ["ASCOUT_PR41_SECRET"],
        tasks: {
          lint: { command: ["must-not-launch", secret] },
        },
      }, null, 2),
      "utf8",
    );

    const outcome = await runCheck(repositoryRoot);
    const lint = outcome.receipt.tasks.find(({ task_type }) => task_type === "lint");

    expect(lint).toBeDefined();
    expect(lint).toMatchObject({
      status: "NOT_RUN",
      execution_admission: "refused_changed_surface",
      argv_redacted: true,
    });
    expect(lint!.argv.join("\n")).not.toContain(secret);
    expect(lint!.argv).toEqual(["must-not-launch", ""]);
  });

  it("marks changed authority files as command surfaces in the same receipt", async () => {
    const repositoryRoot = makeRepository();
    writeFileSync(
      join(repositoryRoot, "package.json"),
      packageJson({
        name: "fixture",
        private: true,
        packageManager: "npm@11.0.0",
        scripts: { lint: "eslint ." },
      }),
      "utf8",
    );
    commitAll(repositoryRoot);

    writeFileSync(
      join(repositoryRoot, "package.json"),
      packageJson({
        name: "fixture",
        private: true,
        version: "1.0.1",
        packageManager: "npm@11.0.0",
        scripts: { lint: "eslint ." },
      }),
      "utf8",
    );

    const outcome = await runCheck(repositoryRoot);
    const changedPackage = outcome.receipt.comparison.changed_files.find(
      ({ path }) => path === "package.json",
    );
    const lint = outcome.receipt.tasks.find(({ task_type }) => task_type === "lint");

    expect(changedPackage).toMatchObject({
      path: "package.json",
      is_command_surface: true,
    });
    expect(lint).toMatchObject({
      status: "NOT_RUN",
      command_surface_changed: true,
      changed_authority_paths: ["package.json"],
      execution_admission: "refused_changed_surface",
    });
  });

  it("marks redacted output as redacted without fabricating truncation", async () => {
    const repositoryRoot = makeRepository();
    const secret = "pr41-output-secret-value";
    process.env.ASCOUT_PR41_SECRET = secret;

    writeFileSync(
      join(repositoryRoot, "ascout.config.json"),
      JSON.stringify({ version: 1 }, null, 2),
      "utf8",
    );
    commitAll(repositoryRoot);

    writeFileSync(
      join(repositoryRoot, "ascout.config.json"),
      JSON.stringify({
        version: 1,
        redactEnv: ["ASCOUT_PR41_SECRET"],
        tasks: {
          lint: {
            command: [
              process.execPath,
              "-e",
              "process.stdout.write(process.env.ASCOUT_PR41_SECRET ?? '')",
            ],
          },
        },
      }, null, 2),
      "utf8",
    );

    const outcome = await runCheck(repositoryRoot, { allowChangedCommandSurface: true });
    const lint = outcome.receipt.tasks.find(({ task_type }) => task_type === "lint");
    const stdout = outcome.receipt.artifacts.find(
      ({ task_id, relative_run_path }) =>
        task_id === "lint" && relative_run_path === "raw/lint-stdout.log",
    );
    const stdoutEvidence = outcome.receipt.evidence.find(
      ({ artifact_id }) => artifact_id === stdout?.artifact_id,
    );

    expect(lint?.status).toBe("PASS");
    expect(lint?.output_truncated).toBe(false);
    expect(stdout).toMatchObject({
      redacted: true,
      truncated: false,
      byte_length: 0,
    });
    expect(stdoutEvidence).toMatchObject({
      redacted: true,
      truncated: false,
    });
  });

  it("binds run.started_at before an executed task starts", async () => {
    const repositoryRoot = makeRepository();
    writeFileSync(
      join(repositoryRoot, "ascout.config.json"),
      JSON.stringify({ version: 1 }, null, 2),
      "utf8",
    );
    commitAll(repositoryRoot);

    writeFileSync(
      join(repositoryRoot, "ascout.config.json"),
      JSON.stringify({
        version: 1,
        tasks: {
          lint: { command: [process.execPath, "-e", "process.exit(0)"] },
        },
      }, null, 2),
      "utf8",
    );

    const outcome = await runCheck(repositoryRoot, { allowChangedCommandSurface: true });
    const lint = outcome.receipt.tasks.find(({ task_type }) => task_type === "lint");

    expect(lint?.status).toBe("PASS");
    expect(lint?.started_at).not.toBeNull();
    expect(Date.parse(outcome.receipt.run.started_at)).toBeLessThanOrEqual(
      Date.parse(lint!.started_at!),
    );
  });
});
