import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

function fixtureRoot(version = "30.4.2"): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-t052-jest-plan-"));
  mkdirSync(join(root, "node_modules", ".bin"), { recursive: true });
  mkdirSync(join(root, "node_modules", "jest"), { recursive: true });
  writeFileSync(join(root, "node_modules", ".bin", "jest"), "");
  writeFileSync(join(root, "node_modules", "jest", "package.json"), JSON.stringify({ name: "jest", version }));
  return root;
}

function rootFiles(): DiscoveryFileMap {
  return {
    "package.json": JSON.stringify({ private: true, devDependencies: { jest: "30.4.2" } }),
    "node_modules/.bin/jest": "",
    "jest.config.cjs": "",
  };
}

describe("T052 Jest task planner", () => {
  it("plans project-local native related Jest with JSON and LCOV under the current Ascout run", () => {
    const root = fixtureRoot();
    try {
      const files = rootFiles();
      const plan = planJestTask({
        repositoryRoot: root,
        runId: "run-052",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("src/used.js")],
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.workingDirectory).toBeNull();
      expect(plan.configPath).toBe("jest.config.cjs");
      expect(plan.toolVersion).toBe("30.4.2");
      expect(plan.selectionMode).toBe("native_related");
      expect(plan.selectedPaths).toEqual(["src/used.js"]);
      expect(plan.argv[0]).toBe("node_modules/.bin/jest");
      expect(plan.argv.slice(1, 3)).toEqual(["--findRelatedTests", "src/used.js"]);
      expect(plan.argv).toContain("--ci");
      expect(plan.argv).toContain("--json");
      expect(plan.argv).toContain("--outputFile=.ascout/runs/run-052/raw/test/jest-results.json");
      expect(plan.argv).toContain("--coverage");
      expect(plan.argv).toContain("--coverageDirectory=.ascout/runs/run-052/raw/test/coverage");
      expect(plan.argv).toContain("--coverageReporters=lcov");
      expect(plan.argv).toContain("--config");
      expect(plan.argv).toContain("jest.config.cjs");
      expect(plan.machineResultPath).toBe(".ascout/runs/run-052/raw/test/jest-results.json");
      expect(plan.lcovPath).toBe(".ascout/runs/run-052/raw/test/coverage/lcov.info");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses the most-specific declared workspace scope while allowing a hoisted local Jest", () => {
    const root = fixtureRoot();
    try {
      const files: DiscoveryFileMap = {
        "package.json": JSON.stringify({ private: true, workspaces: ["packages/*"] }),
        "packages/a/package.json": JSON.stringify({ private: true, devDependencies: { jest: "30.4.2" } }),
        "node_modules/.bin/jest": "",
        "packages/a/jest.config.cjs": "",
      };
      const plan = planJestTask({
        repositoryRoot: root,
        runId: "run-052",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("packages/a/src/used.js")],
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.workingDirectory).toBe("packages/a");
      expect(plan.configPath).toBe("packages/a/jest.config.cjs");
      expect(plan.argv[0]).toBe("../../node_modules/.bin/jest");
      expect(plan.argv.slice(1, 3)).toEqual(["--findRelatedTests", "src/used.js"]);
      expect(plan.argv).toContain("--outputFile=../../.ascout/runs/run-052/raw/test/jest-results.json");
      expect(plan.argv).toContain("--coverageDirectory=../../.ascout/runs/run-052/raw/test/coverage");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails closed when Jest is declared but no physical project-local executable/package can be verified", () => {
    const root = mkdtempSync(join(tmpdir(), "ascout-t052-jest-plan-"));
    try {
      const files = rootFiles();
      const plan = planJestTask({
        repositoryRoot: root,
        runId: "run-052",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("src/used.js")],
      });
      expect(plan).toMatchObject({ state: "not_run", reasonCode: "tool_unresolved" });
      expect(plan.argv).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not run an arbitrary configured test command without a machine/coverage contract", () => {
    const root = fixtureRoot();
    try {
      const files = rootFiles();
      const plan = planJestTask({
        repositoryRoot: root,
        runId: "run-052",
        config: { version: 1, tasks: { test: { command: ["custom-test"] } } },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("src/used.js")],
      });
      expect(plan).toMatchObject({
        state: "not_run",
        authorizedBy: "user_config",
        sourcePath: "ascout.config.json",
        reasonCode: "configured_test_command_machine_contract_unavailable",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails closed when no changed supported source path can be passed to findRelatedTests", () => {
    const root = fixtureRoot();
    try {
      const files = rootFiles();
      const plan = planJestTask({
        repositoryRoot: root,
        runId: "run-052",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("README.md")],
      });
      expect(plan).toMatchObject({ state: "not_run", reasonCode: "native_selection_unresolved" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("hands a resolved Vitest project back to the existing T051 integration", () => {
    const root = fixtureRoot();
    try {
      const files: DiscoveryFileMap = {
        "package.json": JSON.stringify({ private: true, devDependencies: { vitest: "4.1.10" } }),
        "node_modules/.bin/vitest": "",
        "vitest.config.mjs": "",
      };
      const plan = planJestTask({
        repositoryRoot: root,
        runId: "run-052",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("src/used.js")],
      });
      expect(plan).toMatchObject({ state: "not_applicable", reasonCode: "runner_not_jest" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
