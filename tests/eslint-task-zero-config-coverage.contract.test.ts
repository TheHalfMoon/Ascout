import { describe, expect, it } from "vitest";

import { parseConfigV1 } from "../src/config.js";
import { discoverProjectFromFiles } from "../src/discovery.js";
import type { GitChangedFile } from "../src/git.js";
import { planESLintTask } from "../src/tools/eslint.js";

const changed: GitChangedFile = {
  path: "src/root.ts",
  change_kind: "modified",
  line_semantics: "text",
  changed_new_line_ranges: [[1, 1]],
};

describe("T036 zero config coverage", () => {
  it("does not report N/A when the sole workspace config covers none of the changed supported files", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "root",
        private: true,
        workspaces: ["packages/*"],
        devDependencies: { eslint: "10.0.0" },
      }),
      "packages/app/package.json": JSON.stringify({ name: "app" }),
      "packages/app/eslint.config.js": "",
      "node_modules/.bin/eslint": "root-hoisted executable",
    };

    expect(planESLintTask({
      config: parseConfigV1({ version: 1 }),
      discovery: discoverProjectFromFiles(files),
      files,
      changedFiles: [changed],
    })).toMatchObject({
      state: "not_run",
      argv: [],
      commandSource: null,
      reasonCode: "lint_scope_ambiguous",
      reasonText: "The only discovered ESLint config does not cover the changed supported JavaScript/TypeScript files.",
    });
  });

  it("still allows a repository lint script to own broader scope when present", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "root",
        private: true,
        packageManager: "npm@11.0.0",
        workspaces: ["packages/*"],
        scripts: { lint: "eslint ." },
        devDependencies: { eslint: "10.0.0" },
      }),
      "packages/app/package.json": JSON.stringify({ name: "app" }),
      "packages/app/eslint.config.js": "",
      "node_modules/.bin/eslint": "root-hoisted executable",
    };

    expect(planESLintTask({
      config: parseConfigV1({ version: 1 }),
      discovery: discoverProjectFromFiles(files),
      files,
      changedFiles: [changed],
    })).toMatchObject({
      state: "planned",
      argv: ["npm", "run", "lint"],
      commandSource: "package_script",
      executionScope: "project_script",
    });
  });
});
