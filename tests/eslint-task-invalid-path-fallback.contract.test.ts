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

describe("T036 invalid changed-path fallback", () => {
  const files = {
    "package.json": JSON.stringify({
      name: "fixture",
      private: true,
      packageManager: "npm@11.0.0",
      scripts: { lint: "eslint ." },
    }),
  };

  it("does not let a package lint script bypass a noncanonical changed-file path", () => {
    expect(planESLintTask({
      config: parseConfigV1({ version: 1 }),
      discovery: discoverProjectFromFiles(files),
      files,
      changedFiles: [changed("src//app.ts")],
    })).toMatchObject({
      state: "not_run",
      argv: [],
      commandSource: null,
      reasonCode: "changed_path_invalid",
    });
  });

  it("rejects NUL bytes before they can reach local or package-script argv", () => {
    expect(planESLintTask({
      config: parseConfigV1({ version: 1 }),
      discovery: discoverProjectFromFiles(files),
      files,
      changedFiles: [changed("src/app\0.ts")],
    })).toMatchObject({
      state: "not_run",
      argv: [],
      commandSource: null,
      reasonCode: "changed_path_invalid",
    });
  });
});
