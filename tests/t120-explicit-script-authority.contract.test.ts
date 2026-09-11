import { describe, expect, it } from "vitest";

import {
  classifyCommandSurfaces,
  discoverProjectFromFiles,
  intersectChangedAuthorityPaths,
  type DiscoveryFileMap,
} from "../src/discovery.js";
import type { GitChangedFile } from "../src/git.js";
import { planJestTask } from "../src/tools/jest.js";
import { planVitestTask } from "../src/tools/vitest.js";

const AMBIGUOUS_BASE = {
  state: "ambiguous",
  candidates: ["jest", "vitest"],
  reasonCode: "js_test_runner_ambiguous",
  reasonText: "Both Vitest and Jest are declared in the discovered project scope.",
  sourcePaths: ["package.json"],
} as const;

function rootFiles(scripts: unknown, extraDev: Record<string, string> = {}): DiscoveryFileMap {
  const manifest: Record<string, unknown> = {
    private: true,
    devDependencies: { vitest: "4.1.10", jest: "30.4.2", ...extraDev },
  };
  if (scripts !== undefined) manifest["scripts"] = scripts;
  return {
    "package.json": JSON.stringify(manifest),
  };
}

function changed(path: string): GitChangedFile {
  return {
    path,
    change_kind: "modified",
    line_semantics: "text",
    changed_new_line_ranges: [[1, 1]],
  };
}

describe("T120 explicit test-script runner authority", () => {
  it("resolves vitest from the exact root script when both runners share the root manifest", () => {
    const discovery = discoverProjectFromFiles(rootFiles({ test: "vitest run" }));
    expect(discovery.jsTestRunner).toEqual({
      state: "resolved",
      value: "vitest",
      sourcePaths: ["package.json"],
    });
  });

  it("resolves jest from the exact root script when both runners share the root manifest", () => {
    const discovery = discoverProjectFromFiles(rootFiles({ test: "jest" }));
    expect(discovery.jsTestRunner).toEqual({
      state: "resolved",
      value: "jest",
      sourcePaths: ["package.json"],
    });
  });

  it.each([
    ["missing scripts object", undefined],
    ["missing test key", {}],
    ["non-string test", 42],
    ["null test", null],
    ["object test", { run: "vitest run" }],
    ["array test", ["vitest run"]],
    ["empty string", ""],
    ["whitespace-only string", "   "],
    ["leading-padded allowlist", " vitest run"],
    ["trailing-padded allowlist", "vitest run "],
    ["padded jest", " jest "],
    ["case variant", "VITEST RUN"],
    ["case variant jest", "Jest"],
    ["double-quoted allowlist", "\"vitest run\""],
    ["single-quoted allowlist", "'vitest run'"],
    ["chained composite", "vitest run && jest"],
    ["sequenced composite", "vitest run; jest"],
    ["fallback composite", "vitest run || jest"],
    ["piped composite", "vitest run | jest"],
    ["command substitution", "$(vitest run)"],
    ["backtick substitution", "`vitest run`"],
    ["environment expansion", "$npm_package_scripts_test"],
    ["argument expansion", "vitest $ARGS"],
    ["redirection", "vitest run > out.txt"],
    ["glob", "vitest run *"],
    ["npx indirection", "npx vitest run"],
    ["npm indirection", "npm run vitest run"],
    ["yarn indirection", "yarn vitest run"],
    ["pnpm indirection", "pnpm vitest run"],
    ["node wrapper", "node ./node_modules/.bin/vitest run"],
    ["npx jest", "npx jest"],
    ["yarn jest", "yarn jest"],
    ["relative path invocation", "./node_modules/.bin/vitest run"],
    ["absolute path invocation", "/usr/bin/jest"],
    ["parent traversal invocation", "../bin/jest"],
    ["flagged vitest", "vitest run --coverage"],
    ["alternate vitest verb", "vitest --run"],
    ["flagged jest", "jest --ci"],
    ["json flagged jest", "jest --json"],
    ["unsupported runner", "mocha"],
    ["unsupported runner ava", "ava"],
    ["unsupported runner tap", "tap"],
    ["unsupported harness", "playwright test"],
    ["unsafe newline", "vitest run\njest"],
  ])("preserves byte-identical ambiguous behavior for %s", (_label, test) => {
    const scripts = test === undefined ? undefined : { test };
    const discovery = discoverProjectFromFiles(rootFiles(scripts));
    expect(discovery.jsTestRunner).toEqual({ ...AMBIGUOUS_BASE });
  });

  it("preserves nested-declaration ambiguous provenance when the root script is allowlisted", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": JSON.stringify({
        private: true,
        workspaces: ["packages/*"],
        scripts: { test: "vitest run" },
        devDependencies: { vitest: "4.1.10" },
      }),
      "packages/app/package.json": JSON.stringify({
        private: true,
        devDependencies: { jest: "30.4.2" },
      }),
    });
    expect(discovery.jsTestRunner).toEqual({
      state: "ambiguous",
      candidates: ["jest", "vitest"],
      reasonCode: "js_test_runner_ambiguous",
      reasonText: "Both Vitest and Jest are declared in the discovered project scope.",
      sourcePaths: ["package.json", "packages/app/package.json"],
    });
  });

  it("preserves a single declared runner when the script names the other runner", () => {
    const vitestOnly = discoverProjectFromFiles({
      "package.json": JSON.stringify({
        private: true,
        scripts: { test: "jest" },
        devDependencies: { vitest: "4.1.10" },
      }),
    });
    expect(vitestOnly.jsTestRunner).toEqual({
      state: "resolved",
      value: "vitest",
      sourcePaths: ["package.json"],
    });
    const jestOnly = discoverProjectFromFiles({
      "package.json": JSON.stringify({
        private: true,
        scripts: { test: "vitest run" },
        devDependencies: { jest: "30.4.2" },
      }),
    });
    expect(jestOnly.jsTestRunner).toEqual({
      state: "resolved",
      value: "jest",
      sourcePaths: ["package.json"],
    });
  });

  it("preserves absent runner state when no runner is declared", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": JSON.stringify({
        private: true,
        scripts: { test: "vitest run" },
      }),
    });
    expect(discovery.jsTestRunner).toEqual({
      state: "absent",
      reasonCode: "js_test_runner_not_discovered",
      reasonText: "No supported project-declared Vitest or Jest runner was found.",
      sourcePaths: [],
    });
  });

  it("lets a newly resolved vitest input proceed past runner gating", () => {
    const files: DiscoveryFileMap = {
      ...rootFiles(
        { test: "vitest run" },
        { "@vitest/coverage-v8": "4.1.10" },
      ),
      "vitest.config.mjs": "",
      "node_modules/.bin/vitest": "",
      "node_modules/vitest/package.json": JSON.stringify({ name: "vitest", version: "4.1.10" }),
      "node_modules/@vitest/coverage-v8/package.json": JSON.stringify({
        name: "@vitest/coverage-v8",
        version: "4.1.10",
      }),
    };
    const plan = planVitestTask({
      repositoryRoot: "/repo",
      runId: "run-t120",
      config: { version: 1 },
      discovery: discoverProjectFromFiles(files),
      files,
      changedFiles: [changed("src/used.ts")],
    });
    // Runner gating passed: the planner reached a precise downstream reason
    // instead of stopping at js_test_runner_ambiguous.
    expect(plan).toMatchObject({
      state: "not_run",
      reasonCode: "tool_or_coverage_provider_unresolved",
    });
  });

  it("reports runner_not_jest for the jest planner on a vitest-resolved input", () => {
    const files = rootFiles({ test: "vitest run" });
    const plan = planJestTask({
      repositoryRoot: "/repo",
      runId: "run-t120",
      config: { version: 1 },
      discovery: discoverProjectFromFiles(files),
      files,
      changedFiles: [changed("src/used.ts")],
    });
    expect(plan).toMatchObject({ state: "not_applicable", reasonCode: "runner_not_jest" });
  });

  it("still surfaces js_test_runner_ambiguous to both planners for non-allowlisted scripts", () => {
    const files = rootFiles({ test: "npx vitest run" });
    const discovery = discoverProjectFromFiles(files);
    expect(discovery.jsTestRunner).toEqual({ ...AMBIGUOUS_BASE });
    const vitestPlan = planVitestTask({
      repositoryRoot: "/repo",
      runId: "run-t120",
      config: { version: 1 },
      discovery,
      files,
      changedFiles: [changed("src/used.ts")],
    });
    expect(vitestPlan).toMatchObject({ state: "not_run", reasonCode: "js_test_runner_ambiguous" });
    const jestPlan = planJestTask({
      repositoryRoot: "/repo",
      runId: "run-t120",
      config: { version: 1 },
      discovery,
      files,
      changedFiles: [changed("src/used.ts")],
    });
    expect(jestPlan).toMatchObject({ state: "not_run", reasonCode: "js_test_runner_ambiguous" });
  });

  it("keeps root package.json in the changed test authority for newly resolved runners", () => {
    const files = rootFiles({ test: "vitest run" });
    const discovery = discoverProjectFromFiles(files);
    expect(discovery.jsTestRunner.state).toBe("resolved");
    const surfaces = classifyCommandSurfaces(discovery, {});
    expect(surfaces.test.authorityPaths).toContain("package.json");
    const changedAuthority = intersectChangedAuthorityPaths(surfaces.test.authorityPaths, [
      { path: "package.json" },
    ]);
    expect(changedAuthority).toContain("package.json");
  });
});
