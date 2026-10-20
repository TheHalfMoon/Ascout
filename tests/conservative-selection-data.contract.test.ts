import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { discoverProjectFromFiles, type DiscoveryFileMap } from "../src/discovery.js";
import type { GitChangedFile } from "../src/git.js";
import { decidePreRunWidening, initialSelection, preRunPlanningChangedFiles } from "../src/selection.js";
import { planJestTask } from "../src/tools/jest.js";
import { planPytestBasicTask } from "../src/tools/pytest.js";
import { planVitestTask } from "../src/tools/vitest.js";

function changed(path: string, kind: GitChangedFile["change_kind"] = "modified", previousPath?: string): GitChangedFile {
  return {
    path,
    ...(previousPath === undefined ? {} : { previous_path: previousPath }),
    change_kind: kind,
    line_semantics: kind === "deleted" ? "deleted_only" : "text",
    changed_new_line_ranges: kind === "deleted" ? [] : [[1, 1]],
  };
}

function filesFor(runner: "vitest" | "jest"): DiscoveryFileMap {
  return {
    "package.json": JSON.stringify({ private: true, devDependencies: { [runner]: "4.1.11" } }),
    [`node_modules/.bin/${runner}`]: "",
    [`node_modules/.bin/${runner}.cmd`]: "",
    [`${runner}.config.mjs`]: "",
    "pytest.ini": "[pytest]\ntestpaths = tests\n",
  };
}

describe("REA-E02 unknown non-source relations", () => {
  it.each(["data/prices.json", "fixtures/input.csv", "templates/message.html", "styles/theme.css", "README.md", "LICENSE", "requirements.txt", "src/model.py"])(
    "widens text input %s without assuming the native relation graph knows it",
    (path) => {
      const discovery = discoverProjectFromFiles(filesFor("vitest"));
      expect(decidePreRunWidening(discovery, [changed(path)])).toEqual({
        widened: true,
        triggers: ["non_source_relation_risk"],
        riskPaths: [path],
      });
    },
  );

  it.each(["added", "deleted", "type_changed"] as const)("widens a %s data path", (kind) => {
    const discovery = discoverProjectFromFiles(filesFor("vitest"));
    expect(decidePreRunWidening(discovery, [changed("data/input.json", kind)])).toEqual({
      widened: true, triggers: ["non_source_relation_risk"], riskPaths: ["data/input.json"],
    });
  });

  it.each([
    ["data/new.json", "data/old.json", ["data/new.json", "data/old.json"]],
    ["src/new.ts", "data/old.json", ["data/old.json", "src/new.ts"]],
    ["data/new.json", "src/old.ts", ["data/new.json", "src/old.ts"]],
  ] as const)("retains both relation risks for a rename from %s to %s", (path, previous, risks) => {
    const discovery = discoverProjectFromFiles(filesFor("vitest"));
    const changedFiles = [changed(path, "renamed", previous)];
    const decision = decidePreRunWidening(discovery, changedFiles);
    expect(decision.widened).toBe(true);
    expect(decision.triggers).toContain("non_source_relation_risk");
    expect(decision.riskPaths).toEqual(risks);
    expect(preRunPlanningChangedFiles(changedFiles, decision).map(({ path }) => path)).toEqual(risks);
  });

  it.each(["src/a.js", "src/a.mjs", "src/a.cjs", "src/a.jsx", "src/a.ts", "src/a.mts", "src/a.cts", "src/a.tsx"])(
    "preserves native related selection for recognized source %s",
    (path) => expect(decidePreRunWidening(discoverProjectFromFiles(filesFor("vitest")), [changed(path)])).toEqual({
      widened: false, triggers: [], riskPaths: [],
    }),
  );

  it.each([
    ["package.json", "dependency_surface_changed"],
    ["package-lock.json", "package_manager_surface_changed"],
    ["pnpm-workspace.yaml", "workspace_surface_changed"],
    ["tsconfig.json", "compiler_surface_changed"],
    ["vitest.config.mjs", "test_surface_changed"],
    ["jest.config.json", "test_surface_changed"],
    ["tests/a.test.ts", "test_surface_changed"],
    ["tests/__snapshots__/a.snap", "test_surface_changed"],
  ] as const)("keeps the existing specific trigger for %s", (path, trigger) => {
    expect(decidePreRunWidening(discoverProjectFromFiles(filesFor("vitest")), [changed(path)])).toEqual({
      widened: true, triggers: [trigger], riskPaths: [path],
    });
  });

  it("preserves binary risk and snapshot-specific handling", () => {
    const discovery = discoverProjectFromFiles(filesFor("vitest"));
    const binary = { ...changed("assets/logo.png"), line_semantics: "binary_or_non_line" as const, changed_new_line_ranges: [] };
    expect(decidePreRunWidening(discovery, [binary])).toEqual({
      widened: true, triggers: ["non_source_relation_risk"], riskPaths: ["assets/logo.png"],
    });
    expect(decidePreRunWidening(discovery, [{ ...binary, path: "tests/__snapshots__/a.snap" }])).toEqual({
      widened: true, triggers: ["test_surface_changed"], riskPaths: ["tests/__snapshots__/a.snap"],
    });
  });

  it.each(["vitest", "jest"] as const)("plans and accounts for one full %s pass for mixed source/data changes", (runner) => {
    const root = mkdtempSync(join(tmpdir(), "ascout-e02-plan-"));
    try {
      for (const name of runner === "vitest" ? ["vitest", "@vitest/coverage-v8"] : ["jest"]) {
        const path = join(root, "node_modules", name, "package.json");
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, JSON.stringify({ name, version: "4.1.11" }));
      }
      const files = filesFor(runner);
      const discovery = discoverProjectFromFiles(files);
      const changedFiles = [changed("src/a.ts"), changed("data/prices.json")];
      const widening = decidePreRunWidening(discovery, changedFiles);
      const planningFiles = preRunPlanningChangedFiles(changedFiles, widening);
      expect(planningFiles.map(({ path }) => path)).toEqual(["data/prices.json", "src/a.ts"]);
      const input = { repositoryRoot: root, runId: "e02", config: { version: 1 as const }, discovery, files, changedFiles: planningFiles, selectionMode: widening.widened ? "full" as const : "native_related" as const };
      const plan = runner === "vitest" ? planVitestTask(input) : planJestTask(input);
      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.selectionMode).toBe("full");
      expect(plan.argv).not.toContain("related");
      expect(plan.argv).not.toContain("--findRelatedTests");
      expect(plan.selectedPaths).toEqual([]);
      expect(initialSelection(plan, widening)).toMatchObject({
        mode: "full", widened: true, widen_triggers: ["non_source_relation_risk"],
        selected_test_count: null, deselected_test_count: null, total_test_count: null,
        passes: [{ ordinal: 1, mode: "full", trigger: "non_source_relation_risk" }],
      });
      expect(initialSelection(plan, widening, false)).toMatchObject({ widened: false, widen_triggers: [], passes: [] });
      expect(planPytestBasicTask({ config: { version: 1 }, discovery, files })).toMatchObject({ state: "planned", argv: ["pytest"] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each([
    ["vitest", "src/used.ts", true],
    ["jest", "src/used.ts", true],
    ["vitest", "packages/b/src/used.ts", true],
    ["jest", "packages/b/src/used.ts", true],
    ["vitest", "src/used.ts", false],
    ["jest", "src/used.ts", false],
  ] as const)("preserves cross-scope %s source %s when root runner declaration is %s", (runner, source, rootRunner) => {
    const root = mkdtempSync(join(tmpdir(), "ascout-e02-cross-scope-"));
    try {
      for (const name of runner === "vitest" ? ["vitest", "@vitest/coverage-v8"] : ["jest"]) {
        const path = join(root, "node_modules", name, "package.json");
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, JSON.stringify({ name, version: "4.1.11" }));
      }
      const files = {
        ...filesFor(runner),
        "package.json": JSON.stringify({ private: true, workspaces: ["packages/*"], ...(rootRunner ? { devDependencies: { [runner]: "4.1.11" } } : {}) }),
        "packages/a/package.json": JSON.stringify({ private: true, devDependencies: { [runner]: "4.1.11" } }),
      };
      const discovery = discoverProjectFromFiles(files);
      const changedFiles = [changed("packages/a/data/input.json"), changed(source)];
      const widening = decidePreRunWidening(discovery, changedFiles);
      expect(widening.riskPaths).toEqual(["packages/a/data/input.json"]);
      const planningFiles = preRunPlanningChangedFiles(changedFiles, widening);
      expect(planningFiles.map(({ path }) => path)).toEqual(["packages/a/data/input.json", source].sort());
      const input = { repositoryRoot: root, runId: "e02-cross-scope", config: { version: 1 as const }, discovery, files, changedFiles: planningFiles, selectionMode: "full" as const };
      const plan = runner === "vitest" ? planVitestTask(input) : planJestTask(input);
      if (rootRunner) {
        expect(plan).toMatchObject({ state: "planned", selectionMode: "full", workingDirectory: null, configPath: `${runner}.config.mjs` });
      } else {
        expect(plan).toMatchObject({ state: "not_run", reasonCode: "test_scope_ambiguous" });
        expect(initialSelection(plan, widening)).toMatchObject({ passes: [], selected_test_count: null });
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
