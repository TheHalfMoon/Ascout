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

describe("T036 legacy ESLint config handling", () => {
  it("does not invent a direct changed-file invocation for legacy .eslintrc config", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "fixture",
        private: true,
        devDependencies: { eslint: "9.0.0" },
      }),
      ".eslintrc.json": "",
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
      sourcePath: ".eslintrc.json",
      argv: [],
      commandSource: null,
      reasonCode: "config_unsupported",
    });
  });

  it("allows a repository lint script to own legacy-config execution semantics", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "fixture",
        private: true,
        packageManager: "npm@11.0.0",
        scripts: { lint: "ESLINT_USE_FLAT_CONFIG=false eslint ." },
        devDependencies: { eslint: "9.0.0" },
      }),
      ".eslintrc.json": "",
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
