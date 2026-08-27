import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { discoverProjectFromFiles, type DiscoveryFileMap } from "../src/discovery.js";
import type { GitChangedFile } from "../src/git.js";
import { decidePreRunWidening, initialSelection } from "../src/selection.js";
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
    [`${runner}.config.mjs`]: "",
    ...extra,
  };
}

function writePackage(root: string, path: string, name: string, version: string): void {
  const absolute = join(root, ...path.split("/"));
  mkdirSync(join(absolute, ".."), { recursive: true });
  writeFileSync(absolute, JSON.stringify({ name, version }));
}

function fixtureRoot(runner: "vitest" | "jest"): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-t053-"));
  if (runner === "vitest") {
    writePackage(root, "node_modules/vitest/package.json", "vitest", "4.1.10");
    writePackage(root, "node_modules/@vitest/coverage-v8/package.json", "@vitest/coverage-v8", "4.1.10");
  } else {
    writePackage(root, "node_modules/jest/package.json", "jest", "30.4.2");
  }
  return root;
}

describe("T053 pre-run conservative widening", () => {
  it("keeps an ordinary production source-only change on one native related pass", () => {
    const files = rootFiles("vitest");
    const discovery = discoverProjectFromFiles(files);
    const widening = decidePreRunWidening(discovery, [changed("src/used.ts")]);

    expect(widening).toEqual({ widened: false, triggers: [] });
  });

  it.each([
    ["package manifest", changed("package.json"), "dependency_surface_changed"],
    ["lockfile", changed("package-lock.json"), "package_manager_surface_changed"],
    ["compiler config", changed("tsconfig.json"), "compiler_surface_changed"],
    ["test config", changed("vitest.config.mjs"), "test_surface_changed"],
    ["changed test", changed("tests/unit.test.ts"), "test_surface_changed"],
    ["deleted source", changed("src/removed.ts", "deleted"), "path_relation_risk"],
    ["renamed source", changed("src/new.ts", "renamed", "src/old.ts"), "path_relation_risk"],
  ])("widens before execution for a %s", (_label, file, trigger) => {
    const files = rootFiles("vitest", { "tsconfig.json": "{}" });
    const discovery = discoverProjectFromFiles(files);
    const widening = decidePreRunWidening(discovery, [file]);

    expect(widening.widened).toBe(true);
    expect(widening.triggers).toContain(trigger);
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

    expect(decidePreRunWidening(discovery, [changed("package.json")]).triggers)
      .toContain("workspace_surface_changed");
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
        changedFiles,
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
        changedFiles,
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
