import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { discoverProjectFromFiles, type DiscoveryFileMap } from "../src/discovery.js";
import type { GitChangedFile } from "../src/git.js";
import {
  decidePreRunWidening,
  initialSelection,
  preRunPlanningChangedFiles,
} from "../src/selection.js";
import { planJestTask } from "../src/tools/jest.js";
import { planVitestTask } from "../src/tools/vitest.js";

function changed(
  path: string,
  changeKind: GitChangedFile["change_kind"] = "modified",
  previousPath?: string,
): GitChangedFile {
  return {
    path,
    ...(previousPath === undefined ? {} : { previous_path: previousPath }),
    change_kind: changeKind,
    line_semantics: changeKind === "deleted" ? "deleted_only" : "text",
    changed_new_line_ranges: changeKind === "deleted" ? [] : [[1, 1]],
  };
}

function rootFiles(runner: "vitest" | "jest", extra: DiscoveryFileMap = {}): DiscoveryFileMap {
  return {
    "package.json": JSON.stringify({ private: true, devDependencies: { [runner]: "1.0.0" } }),
    [`node_modules/.bin/${runner}`]: "",
    [`node_modules/.bin/${runner}.cmd`]: "",
    [`${runner}.config.mjs`]: "",
    ...extra,
  };
}

function packageScopedFiles(runner: "vitest" | "jest"): DiscoveryFileMap {
  return {
    "package.json": JSON.stringify({ private: true, workspaces: ["packages/*"] }),
    "packages/a/package.json": JSON.stringify({
      private: true,
      devDependencies: { [runner]: "1.0.0" },
    }),
    [`packages/a/node_modules/.bin/${runner}`]: "",
    [`packages/a/node_modules/.bin/${runner}.cmd`]: "",
    [`packages/a/${runner}.config.mjs`]: "",
  };
}

function writePackage(root: string, path: string, name: string, version: string): void {
  const absolute = join(root, ...path.split("/"));
  mkdirSync(join(absolute, ".."), { recursive: true });
  writeFileSync(absolute, JSON.stringify({ name, version }));
}

function fixtureRoot(runner: "vitest" | "jest", packageRoot = ""): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-t053-"));
  const prefix = packageRoot === "" ? "" : `${packageRoot}/`;
  if (runner === "vitest") {
    writePackage(root, `${prefix}node_modules/vitest/package.json`, "vitest", "4.1.10");
    writePackage(root, `${prefix}node_modules/@vitest/coverage-v8/package.json`, "@vitest/coverage-v8", "4.1.10");
  } else {
    writePackage(root, `${prefix}node_modules/jest/package.json`, "jest", "30.4.2");
  }
  return root;
}

describe("T053 pre-run conservative widening", () => {
  it("keeps an ordinary production source-only change on one native related pass", () => {
    const files = rootFiles("vitest");
    const discovery = discoverProjectFromFiles(files);
    const widening = decidePreRunWidening(discovery, [changed("src/used.ts")]);

    expect(widening).toEqual({ widened: false, triggers: [], riskPaths: [] });
  });

  it.each([
    ["package manifest", changed("package.json"), "dependency_surface_changed"],
    ["lockfile", changed("package-lock.json"), "package_manager_surface_changed"],
    ["package-scoped lockfile", changed("packages/a/package-lock.json"), "package_manager_surface_changed"],
    ["package-scoped manager config", changed("packages/a/.npmrc"), "package_manager_surface_changed"],
    ["compiler config", changed("tsconfig.json"), "compiler_surface_changed"],
    ["test config", changed("vitest.config.mjs"), "test_surface_changed"],
    ["changed test", changed("tests/unit.test.ts"), "test_surface_changed"],
    ["deleted source", changed("src/removed.ts", "deleted"), "path_relation_risk"],
    ["renamed source", changed("src/new.ts", "renamed", "src/old.ts"), "path_relation_risk"],
  ] as const)("widens before execution for a %s", (_label, file, trigger) => {
    const files = rootFiles("vitest", { "tsconfig.json": "{}" });
    const discovery = discoverProjectFromFiles(files);
    const widening = decidePreRunWidening(discovery, [file]);

    expect(widening.widened).toBe(true);
    expect(widening.triggers).toContain(trigger);
    expect(widening.riskPaths).toContain(file.path);
  });

  it("treats the discovered workspace declaration as a workspace widening surface", () => {
    const files = rootFiles("vitest", {
      "package.json": JSON.stringify({
        private: true,
        workspaces: ["packages/*"],
        devDependencies: { vitest: "4.1.10" },
      }),
      "packages/a/package.json": JSON.stringify({ private: true, devDependencies: { vitest: "4.1.10" } }),
    });
    const discovery = discoverProjectFromFiles(files);
    const widening = decidePreRunWidening(discovery, [changed("package.json")]);

    expect(widening.triggers).toContain("workspace_surface_changed");
    expect(widening.riskPaths).toEqual(["package.json"]);
  });

  it("plans one full Vitest pass for a pre-run lockfile risk instead of a related pass", () => {
    const root = fixtureRoot("vitest");
    try {
      const files = rootFiles("vitest", { "package-lock.json": "" });
      const discovery = discoverProjectFromFiles(files);
      const changedFiles = [changed("package-lock.json")];
      const widening = decidePreRunWidening(discovery, changedFiles);
      const plan = planVitestTask({
        repositoryRoot: root,
        runId: "run-053-vitest",
        config: { version: 1 },
        discovery,
        files,
        changedFiles: preRunPlanningChangedFiles(changedFiles, widening),
        selectionMode: widening.widened ? "full" : "native_related",
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.selectionMode).toBe("full");
      expect(plan.selectedPaths).toEqual([]);
      expect(plan.argv).not.toContain("related");
      expect(plan.argv).toContain("--run");

      const selection = initialSelection(plan, widening);
      expect(selection).toMatchObject({
        mode: "full",
        widened: true,
        widen_triggers: ["package_manager_surface_changed"],
      });
      expect(selection.passes).toHaveLength(1);
      expect(selection.passes[0]).toMatchObject({ ordinal: 1, mode: "full", trigger: "package_manager_surface_changed" });
      expect(selection.limitations).toContain("unsafe_selection");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each(["vitest", "jest"] as const)(
    "keeps mixed risk/non-risk changes scoped to the affected package for %s",
    (runner) => {
      const root = fixtureRoot(runner, "packages/a");
      try {
        const files = packageScopedFiles(runner);
        const discovery = discoverProjectFromFiles(files);
        const changedFiles = [
          changed("packages/a/package-lock.json"),
          changed("README.md"),
        ];
        const widening = decidePreRunWidening(discovery, changedFiles);
        const planningFiles = preRunPlanningChangedFiles(changedFiles, widening);

        expect(widening).toMatchObject({
          widened: true,
          triggers: ["package_manager_surface_changed"],
          riskPaths: ["packages/a/package-lock.json"],
        });
        expect(planningFiles.map(({ path }) => path)).toEqual(["packages/a/package-lock.json"]);

        const plan = runner === "vitest"
          ? planVitestTask({
              repositoryRoot: root,
              runId: "run-053-mixed-vitest",
              config: { version: 1 },
              discovery,
              files,
              changedFiles: planningFiles,
              selectionMode: "full",
            })
          : planJestTask({
              repositoryRoot: root,
              runId: "run-053-mixed-jest",
              config: { version: 1 },
              discovery,
              files,
              changedFiles: planningFiles,
              selectionMode: "full",
            });

        expect(plan.state).toBe("planned");
        if (plan.state !== "planned") return;
        expect(plan.selectionMode).toBe("full");
        expect(plan.workingDirectory).toBe("packages/a");
        expect(plan.selectedPaths).toEqual([]);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

  it("does not record a widening pass when changed command-surface admission refuses test launch", () => {
    const root = fixtureRoot("vitest");
    try {
      const files = rootFiles("vitest");
      const discovery = discoverProjectFromFiles(files);
      const changedFiles = [changed("vitest.config.mjs")];
      const widening = decidePreRunWidening(discovery, changedFiles);
      const plan = planVitestTask({
        repositoryRoot: root,
        runId: "run-053-refused",
        config: { version: 1 },
        discovery,
        files,
        changedFiles: preRunPlanningChangedFiles(changedFiles, widening),
        selectionMode: "full",
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      const selection = initialSelection(plan, widening, false);
      expect(selection.mode).toBe("full");
      expect(selection.widened).toBe(false);
      expect(selection.widen_triggers).toEqual([]);
      expect(selection.passes).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("plans one full Jest pass for a changed test instead of --findRelatedTests", () => {
    const root = fixtureRoot("jest");
    try {
      const files = rootFiles("jest");
      const discovery = discoverProjectFromFiles(files);
      const changedFiles = [changed("tests/unit.test.ts")];
      const widening = decidePreRunWidening(discovery, changedFiles);
      const plan = planJestTask({
        repositoryRoot: root,
        runId: "run-053-jest",
        config: { version: 1 },
        discovery,
        files,
        changedFiles: preRunPlanningChangedFiles(changedFiles, widening),
        selectionMode: widening.widened ? "full" : "native_related",
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.selectionMode).toBe("full");
      expect(plan.selectedPaths).toEqual([]);
      expect(plan.argv).not.toContain("--findRelatedTests");
      expect(plan.argv).toContain("--ci");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
