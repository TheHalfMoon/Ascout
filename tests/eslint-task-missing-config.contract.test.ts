import { describe, expect, it } from "vitest";

import { parseConfigV1 } from "../src/config.js";
import { discoverProjectFromFiles } from "../src/discovery.js";
import type { GitChangedFile } from "../src/git.js";
import { planESLintTask } from "../src/tools/eslint.js";

const changed: GitChangedFile = {
  path: "src/app.ts",
  change_kind: "modified",
  line_semantics: "text",
  changed_new_line_ranges: [[1, 1]],
};

describe("T036 missing ESLint config", () => {
  it("returns config_missing when ESLint is declared and a supported file changed", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "fixture",
        private: true,
        devDependencies: { eslint: "10.0.0" },
      }),
      "node_modules/.bin/eslint": "virtual executable",
    };

    expect(planESLintTask({
      config: parseConfigV1({ version: 1 }),
      discovery: discoverProjectFromFiles(files),
      files,
      changedFiles: [changed],
    })).toMatchObject({
      state: "not_run",
      argv: [],
      reasonCode: "config_missing",
      reasonText: "No ESLint project configuration was found for safe changed-file lint planning.",
    });
  });

  it("still allows a repository lint script to own config discovery when present", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "fixture",
        private: true,
        packageManager: "npm@11.0.0",
        scripts: { lint: "eslint ." },
        devDependencies: { eslint: "10.0.0" },
      }),
      "node_modules/.bin/eslint": "virtual executable",
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
