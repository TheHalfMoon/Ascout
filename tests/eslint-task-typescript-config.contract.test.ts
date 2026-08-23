import { describe, expect, it } from "vitest";

import { parseConfigV1 } from "../src/config.js";
import { discoverProjectFromFiles } from "../src/discovery.js";
import type { GitChangedFile } from "../src/git.js";
import { planESLintTask } from "../src/tools/eslint.js";

function changed(path: string): GitChangedFile {
  return {
    path,
    change_kind: "modified",
    line_semantics: "text",
    changed_new_line_ranges: [[1, 1]],
  };
}

describe("T036 TypeScript ESLint config handling", () => {
  it("does not invent the additional runtime setup required by eslint.config.ts", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "fixture",
        private: true,
        devDependencies: { eslint: "10.0.0" },
      }),
      "eslint.config.ts": "",
      "node_modules/.bin/eslint": "virtual executable",
    };

    expect(planESLintTask({
      config: parseConfigV1({ version: 1 }),
      discovery: discoverProjectFromFiles(files),
      files,
      changedFiles: [changed("src/app.ts")],
    })).toMatchObject({
      state: "not_run",
      authorizedBy: "repo_config",
      sourcePath: "eslint.config.ts",
      argv: [],
      commandSource: null,
      reasonCode: "config_unsupported",
    });
  });

  it("reports TypeScript config unsupported before a missing local executable", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "fixture",
        private: true,
        devDependencies: { eslint: "10.0.0" },
      }),
      "eslint.config.ts": "",
    };

    expect(planESLintTask({
      config: parseConfigV1({ version: 1 }),
      discovery: discoverProjectFromFiles(files),
      files,
      changedFiles: [changed("src/app.ts")],
    })).toMatchObject({
      state: "not_run",
      authorizedBy: "repo_config",
      sourcePath: "eslint.config.ts",
      argv: [],
      commandSource: null,
      reasonCode: "config_unsupported",
    });
  });

  it("allows a repository lint script to own TypeScript-config runtime setup", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "fixture",
        private: true,
        packageManager: "npm@11.0.0",
        scripts: { lint: "eslint ." },
        devDependencies: { eslint: "10.0.0", jiti: "2.2.0" },
      }),
      "eslint.config.ts": "",
      "node_modules/.bin/eslint": "virtual executable",
    };

    expect(planESLintTask({
      config: parseConfigV1({ version: 1 }),
      discovery: discoverProjectFromFiles(files),
      files,
      changedFiles: [changed("src/app.ts")],
    })).toMatchObject({
      state: "planned",
      authorizedBy: "repo_config",
      sourcePath: "package.json",
      argv: ["npm", "run", "lint"],
      commandSource: "package_script",
      executionScope: "project_script",
    });
  });
});
