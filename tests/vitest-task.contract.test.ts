import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { discoverProjectFromFiles, type DiscoveryFileMap } from "../src/discovery.js";
import type { GitChangedFile } from "../src/git.js";
import { planVitestTask } from "../src/tools/vitest.js";

function changed(path: string): GitChangedFile {
  return {
    path,
    change_kind: "modified",
    line_semantics: "text",
    changed_new_line_ranges: [[1, 1]],
  };
}

function writeInstalledPackage(root: string, path: string, name: string, version = "4.1.10"): void {
  const absolute = join(root, ...path.split("/"));
  mkdirSync(join(absolute, ".."), { recursive: true });
  writeFileSync(absolute, JSON.stringify({ name, version }));
}

function fixtureRoot(withCoverage = true): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-t051-plan-"));
  writeInstalledPackage(root, "node_modules/vitest/package.json", "vitest");
  if (withCoverage) {
    writeInstalledPackage(root, "node_modules/@vitest/coverage-v8/package.json", "@vitest/coverage-v8");
  }
  return root;
}

function rootFiles(extra: DiscoveryFileMap = {}): DiscoveryFileMap {
  return {
    "package.json": JSON.stringify({
      private: true,
      devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" },
    }),
    "node_modules/.bin/vitest": "",
    "vitest.config.mjs": "",
    ...extra,
  };
}

describe("T051 project-local Vitest planning", () => {
  it("plans native related selection with non-watch JSON and LCOV under the Ascout run", () => {
    const root = fixtureRoot();
    try {
      const files = rootFiles();
      const plan = planVitestTask({
        repositoryRoot: root,
        runId: "run-051",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("src/used.ts")],
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.workingDirectory).toBeNull();
      expect(plan.selectionMode).toBe("native_related");
      expect(plan.selectedPaths).toEqual(["src/used.ts"]);
      expect(plan.configPath).toBe("vitest.config.mjs");
      expect(plan.coverageProvider).toBe("v8");
      expect(plan.toolVersion).toBe("4.1.10");
      expect(plan.machineResultPath).toBe(".ascout/runs/run-051/raw/test/vitest-results.json");
      expect(plan.lcovPath).toBe(".ascout/runs/run-051/raw/test/coverage/lcov.info");
      expect(plan.argv).toEqual([
        "node_modules/.bin/vitest",
        "related",
        "src/used.ts",
        "--run",
        "--passWithNoTests",
        "--reporter=json",
        "--outputFile=.ascout/runs/run-051/raw/test/vitest-results.json",
        "--coverage.enabled=true",
        "--coverage.provider=v8",
        "--coverage.reporter=lcov",
        "--coverage.reportsDirectory=.ascout/runs/run-051/raw/test/coverage",
        "--coverage.reportOnFailure=true",
        "--config",
        "vitest.config.mjs",
      ]);
      expect(plan.argv).not.toContain("npx");
      expect(plan.argv).not.toContain("npm");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails closed instead of allowing Vitest to auto-install a missing coverage provider", () => {
    const root = fixtureRoot(false);
    try {
      const files = rootFiles();
      const plan = planVitestTask({
        repositoryRoot: root,
        runId: "run-051",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("src/used.ts")],
      });

      expect(plan).toMatchObject({
        state: "not_run",
        reasonCode: "tool_or_coverage_provider_unresolved",
      });
      expect(plan.argv).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses the most-specific declared workspace scope while allowing a hoisted local Vitest", () => {
    const root = fixtureRoot();
    try {
      const files: DiscoveryFileMap = {
        "package.json": JSON.stringify({
          private: true,
          workspaces: ["packages/*"],
          devDependencies: { vitest: "4.1.10" },
        }),
        "packages/a/package.json": JSON.stringify({
          private: true,
          devDependencies: { vitest: "4.1.10" },
        }),
        "node_modules/.bin/vitest": "",
        "packages/a/vitest.config.mjs": "",
      };
      const plan = planVitestTask({
        repositoryRoot: root,
        runId: "run-051",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("packages/a/src/used.ts")],
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.workingDirectory).toBe("packages/a");
      expect(plan.configPath).toBe("packages/a/vitest.config.mjs");
      expect(plan.argv[0]).toBe("../../node_modules/.bin/vitest");
      expect(plan.argv.slice(1, 3)).toEqual(["related", "src/used.ts"]);
      expect(plan.argv).toContain("--outputFile=../../.ascout/runs/run-051/raw/test/vitest-results.json");
      expect(plan.argv).toContain("--coverage.reportsDirectory=../../.ascout/runs/run-051/raw/test/coverage");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not run an arbitrary configured test command without a machine/coverage contract", () => {
    const root = fixtureRoot();
    try {
      const files = rootFiles();
      const plan = planVitestTask({
        repositoryRoot: root,
        runId: "run-051",
        config: { version: 1, tasks: { test: { command: ["custom-test"] } } },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("src/used.ts")],
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

  it("fails closed when no changed supported source path can be passed to native related selection", () => {
    const root = fixtureRoot();
    try {
      const files = rootFiles();
      const plan = planVitestTask({
        repositoryRoot: root,
        runId: "run-051",
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

  it("leaves Jest projects for T052 rather than guessing a Vitest command", () => {
    const root = fixtureRoot();
    try {
      const files: DiscoveryFileMap = {
        "package.json": JSON.stringify({ private: true, devDependencies: { jest: "30.0.0" } }),
        "node_modules/.bin/jest": "",
      };
      const plan = planVitestTask({
        repositoryRoot: root,
        runId: "run-051",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("src/used.ts")],
      });

      expect(plan).toMatchObject({ state: "not_applicable", reasonCode: "runner_not_vitest" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("keeps option-like changed Vitest paths positional instead of letting them become CLI options", () => {
    const root = fixtureRoot();
    try {
      const files = rootFiles();
      const plan = planVitestTask({
        repositoryRoot: root,
        runId: "run-051",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("--config=other.ts")],
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.selectedPaths).toEqual(["--config=other.ts"]);
      expect(plan.argv.slice(1, 3)).toEqual(["related", "./--config=other.ts"]);
      expect(plan.argv).not.toContain("--config=other.ts");
      expect(plan.argv).toContain("--config");
      expect(plan.argv).toContain("vitest.config.mjs");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("prefers the npm .cmd Vitest launcher on Windows when both shim forms are present", () => {
    const root = fixtureRoot();
    try {
      const files = rootFiles({ "node_modules/.bin/vitest.cmd": "" });
      const plan = planVitestTask({
        repositoryRoot: root,
        runId: "run-051",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("src/used.ts")],
        platform: "win32",
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.argv[0]).toBe("node_modules/.bin/vitest.cmd");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
