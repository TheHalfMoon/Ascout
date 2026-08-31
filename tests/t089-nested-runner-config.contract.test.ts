import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { discoverProjectFromFiles, type DiscoveryFileMap } from "../src/discovery.js";
import type { GitChangedFile } from "../src/git.js";
import { planJestTask } from "../src/tools/jest.js";
import { planVitestTask } from "../src/tools/vitest.js";

function changed(path: string): GitChangedFile {
  return {
    path,
    change_kind: "modified",
    line_semantics: "text",
    changed_new_line_ranges: [{ start: 1, end: 1 }],
  };
}

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-t089-config-fidelity-"));
  mkdirSync(join(root, "node_modules", ".bin"), { recursive: true });
  mkdirSync(join(root, "node_modules", "jest"), { recursive: true });
  mkdirSync(join(root, "node_modules", "vitest"), { recursive: true });
  mkdirSync(join(root, "node_modules", "@vitest", "coverage-v8"), { recursive: true });
  for (const name of ["jest", "jest.cmd", "vitest", "vitest.cmd"] as const) {
    writeFileSync(join(root, "node_modules", ".bin", name), "");
  }
  writeFileSync(
    join(root, "node_modules", "jest", "package.json"),
    JSON.stringify({ name: "jest", version: "30.4.2" }),
  );
  writeFileSync(
    join(root, "node_modules", "vitest", "package.json"),
    JSON.stringify({ name: "vitest", version: "4.1.10" }),
  );
  writeFileSync(
    join(root, "node_modules", "@vitest", "coverage-v8", "package.json"),
    JSON.stringify({ name: "@vitest/coverage-v8", version: "4.1.10" }),
  );
  return realpathSync.native(root);
}

function jestFiles(extra: DiscoveryFileMap = {}): DiscoveryFileMap {
  return {
    "package.json": JSON.stringify({ private: true, devDependencies: { jest: "30.4.2" } }),
    "node_modules/.bin/jest": "",
    "node_modules/.bin/jest.cmd": "",
    ...extra,
  };
}

function vitestFiles(extra: DiscoveryFileMap = {}): DiscoveryFileMap {
  return {
    "package.json": JSON.stringify({
      private: true,
      devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" },
    }),
    "node_modules/.bin/vitest": "",
    "node_modules/.bin/vitest.cmd": "",
    ...extra,
  };
}

describe("T089 single-package nested runner config fidelity", () => {
  it("selects exactly one nested Jest config and emits it through the existing argv path", () => {
    const root = fixtureRoot();
    try {
      const files = jestFiles({ "scripts/jest/jest.config.js": "" });
      const discovery = discoverProjectFromFiles(files);
      expect(discovery.workspace).toMatchObject({ state: "resolved", kind: "single" });
      expect(discovery.tools.jest.configPaths).toEqual(["scripts/jest/jest.config.js"]);

      const plan = planJestTask({
        repositoryRoot: root,
        runId: "run-089-jest",
        config: { version: 1 },
        discovery,
        files,
        changedFiles: [changed("src/used.ts")],
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.workingDirectory).toBeNull();
      expect(plan.configPath).toBe("scripts/jest/jest.config.js");
      expect(plan.argv).toContain("--config");
      expect(plan.argv).toContain("scripts/jest/jest.config.js");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("selects exactly one nested Vitest config and emits it through the existing argv path", () => {
    const root = fixtureRoot();
    try {
      const files = vitestFiles({ "config/test/vitest.config.ts": "" });
      const discovery = discoverProjectFromFiles(files);
      expect(discovery.workspace).toMatchObject({ state: "resolved", kind: "single" });
      expect(discovery.tools.vitest.configPaths).toEqual(["config/test/vitest.config.ts"]);

      const plan = planVitestTask({
        repositoryRoot: root,
        runId: "run-089-vitest",
        config: { version: 1 },
        discovery,
        files,
        changedFiles: [changed("src/used.ts")],
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.workingDirectory).toBeNull();
      expect(plan.configPath).toBe("config/test/vitest.config.ts");
      expect(plan.argv).toContain("--config");
      expect(plan.argv).toContain("config/test/vitest.config.ts");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps root Jest config precedence and excludes nested candidates from effective authority", () => {
    const files = jestFiles({
      "jest.config.cjs": "",
      "scripts/jest/jest.config.js": "",
    });
    const discovery = discoverProjectFromFiles(files);
    expect(discovery.tools.jest.configPaths).toEqual(["jest.config.cjs"]);
  });

  it("keeps root Vitest config precedence and excludes nested candidates from effective authority", () => {
    const files = vitestFiles({
      "vitest.config.mjs": "",
      "config/vitest.config.ts": "",
    });
    const discovery = discoverProjectFromFiles(files);
    expect(discovery.tools.vitest.configPaths).toEqual(["vitest.config.mjs"]);
  });

  it("fails closed instead of choosing between multiple nested Jest configs", () => {
    const root = fixtureRoot();
    try {
      const files = jestFiles({
        "config/a/jest.config.js": "",
        "config/b/jest.config.ts": "",
      });
      const discovery = discoverProjectFromFiles(files);
      expect(discovery.tools.jest.configPaths).toEqual([
        "config/a/jest.config.js",
        "config/b/jest.config.ts",
      ]);

      const plan = planJestTask({
        repositoryRoot: root,
        runId: "run-089-jest-ambiguous",
        config: { version: 1 },
        discovery,
        files,
        changedFiles: [changed("src/used.ts")],
      });

      expect(plan).toMatchObject({ state: "not_run", reasonCode: "config_ambiguous" });
      expect(plan.argv).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails closed instead of choosing between multiple nested Vitest configs", () => {
    const root = fixtureRoot();
    try {
      const files = vitestFiles({
        "config/a/vitest.config.js": "",
        "config/b/vitest.config.ts": "",
      });
      const discovery = discoverProjectFromFiles(files);
      expect(discovery.tools.vitest.configPaths).toEqual([
        "config/a/vitest.config.js",
        "config/b/vitest.config.ts",
      ]);

      const plan = planVitestTask({
        repositoryRoot: root,
        runId: "run-089-vitest-ambiguous",
        config: { version: 1 },
        discovery,
        files,
        changedFiles: [changed("src/used.ts")],
      });

      expect(plan).toMatchObject({ state: "not_run", reasonCode: "config_ambiguous" });
      expect(plan.argv).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not enable nested fallback for a basic workspace", () => {
    const files: DiscoveryFileMap = {
      "package.json": JSON.stringify({ private: true, workspaces: ["packages/*"] }),
      "packages/a/package.json": JSON.stringify({ private: true, devDependencies: { jest: "30.4.2" } }),
      "node_modules/.bin/jest": "",
      "node_modules/.bin/jest.cmd": "",
      "packages/a/scripts/jest/jest.config.js": "",
    };
    const discovery = discoverProjectFromFiles(files);
    expect(discovery.workspace).toMatchObject({ state: "resolved", kind: "basic" });
    expect(discovery.tools.jest.configPaths).toEqual([]);
  });

  it("does not promote a nested config for a runner that the single-package root does not declare", () => {
    const files = vitestFiles({ "examples/demo/jest.config.js": "" });
    const discovery = discoverProjectFromFiles(files);
    expect(discovery.jsTestRunner).toMatchObject({ state: "resolved", value: "vitest" });
    expect(discovery.tools.jest.declarationPaths).toEqual([]);
    expect(discovery.tools.jest.configPaths).toEqual([]);
  });
});
