import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { discoverProjectFromFiles, type DiscoveryFileMap } from "../src/discovery.js";
import type { GitChangedFile } from "../src/git.js";
import { planJestTask } from "../src/tools/jest.js";

function changed(path: string): GitChangedFile {
  return {
    path,
    change_kind: "modified",
    line_semantics: "text",
    changed_new_line_ranges: [{ start: 1, end: 1 }],
  };
}

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-t091-pnpm-settings-"));
  mkdirSync(join(root, "node_modules", ".bin"), { recursive: true });
  mkdirSync(join(root, "node_modules", "jest"), { recursive: true });
  writeFileSync(join(root, "node_modules", ".bin", "jest"), "");
  writeFileSync(
    join(root, "node_modules", "jest", "package.json"),
    JSON.stringify({ name: "jest", version: "30.4.2" }),
  );
  return realpathSync.native(root);
}

function settingsOnlyFiles(): DiscoveryFileMap {
  return {
    "package.json": JSON.stringify({
      name: "react-hook-form",
      private: true,
      devDependencies: { jest: "30.4.2" },
    }),
    "pnpm-workspace.yaml": [
      "allowBuilds:",
      "  '@swc/core': false",
      "  esbuild: false",
      "  unrs-resolver: false",
      "",
    ].join("\n"),
    "app/package.json": JSON.stringify({ name: "react-hook-form-app", private: true }),
    "scripts/jest/jest.config.js": "module.exports = {};\n",
    "node_modules/.bin/jest": "",
  };
}

describe("T091 pnpm settings-only single-package fidelity", () => {
  it("does not promote a settings-only pnpm-workspace file into workspace ownership", () => {
    const files = settingsOnlyFiles();
    const discovery = discoverProjectFromFiles(files);

    expect(discovery.workspace).toEqual({
      state: "resolved",
      kind: "single",
      patterns: [],
      packageJsonPaths: ["package.json"],
      sourcePaths: [],
      reasonCode: null,
      reasonText: null,
    });
    expect(discovery.tools.jest.configPaths).toEqual(["scripts/jest/jest.config.js"]);
  });

  it("passes the nested Jest config through the existing argv for the pinned RHF repository shape", () => {
    const root = fixtureRoot();
    try {
      const files = settingsOnlyFiles();
      const discovery = discoverProjectFromFiles(files);
      const plan = planJestTask({
        repositoryRoot: root,
        runId: "run-091-rhf",
        config: { version: 1 },
        discovery,
        files,
        changedFiles: [changed("src/logic/validateField.ts")],
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.workingDirectory).toBeNull();
      expect(plan.configPath).toBe("scripts/jest/jest.config.js");
      expect(plan.argv).toContain("--findRelatedTests");
      expect(plan.argv).toContain("src/logic/validateField.ts");
      const configIndex = plan.argv.indexOf("--config");
      expect(configIndex).toBeGreaterThanOrEqual(0);
      expect(plan.argv[configIndex + 1]).toBe("scripts/jest/jest.config.js");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("still fails closed when a packages declaration exists but exceeds the supported grammar", () => {
    const files: DiscoveryFileMap = {
      ...settingsOnlyFiles(),
      "pnpm-workspace.yaml": [
        "allowBuilds:",
        "  '@swc/core': false",
        "packages:",
        "  - packages/*",
        "",
      ].join("\n"),
      "packages/a/package.json": JSON.stringify({ name: "a", private: true }),
    };
    const discovery = discoverProjectFromFiles(files);

    expect(discovery.workspace).toMatchObject({
      state: "unsupported",
      kind: null,
      reasonCode: "workspace_declaration_unsupported",
      sourcePaths: ["pnpm-workspace.yaml"],
    });
    expect(discovery.tools.jest.configPaths).toEqual([]);
  });

  it.each([
    ['"packages":', "double-quoted"],
    ["'packages':", "single-quoted"],
  ])("fails closed for a %s workspace key instead of treating it as settings-only (%s)", (packagesKey) => {
    const files: DiscoveryFileMap = {
      ...settingsOnlyFiles(),
      "pnpm-workspace.yaml": [packagesKey, "  - packages/*", ""].join("\n"),
      "packages/a/package.json": JSON.stringify({ name: "a", private: true }),
    };
    const discovery = discoverProjectFromFiles(files);

    expect(discovery.workspace).toMatchObject({
      state: "unsupported",
      kind: null,
      reasonCode: "workspace_declaration_unsupported",
      sourcePaths: ["pnpm-workspace.yaml"],
    });
    expect(discovery.tools.jest.configPaths).toEqual([]);
  });
});
