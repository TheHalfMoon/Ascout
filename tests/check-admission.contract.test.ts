import { describe, expect, it } from "vitest";
import { decideRunAdmissions, decideTaskAdmission } from "../src/check.js";
import {
  discoverProjectFromFiles,
  type ChangedPathView,
  type DiscoveryFileMap,
} from "../src/discovery.js";

const FULL_PROJECT: DiscoveryFileMap = {
  "package.json": JSON.stringify({
    name: "fixture",
    scripts: {
      typecheck: "tsc -p tsconfig.json --noEmit",
      lint: "eslint .",
      test: "vitest run",
    },
    devDependencies: { typescript: "6.0.3", eslint: "10.0.0", vitest: "4.1.10" },
  }),
  "tsconfig.json": JSON.stringify({ compilerOptions: { strict: true } }),
  "eslint.config.js": "export default [{ files: [\"**/*.ts\"] }];\n",
  "vitest.config.ts": "export default {};\n",
  "pyproject.toml": "[tool.pytest.ini_options]\naddopts = -q\n",
  "src/index.ts": "export const value = 1;\n",
  "node_modules/.bin/tsc": "",
  "node_modules/.bin/eslint": "",
  "node_modules/.bin/vitest": "",
};

function runDecisions(changedFiles: readonly ChangedPathView[], allowOverride = false) {
  const discovery = discoverProjectFromFiles(FULL_PROJECT);
  return decideRunAdmissions(discovery, changedFiles, { allowChangedCommandSurface: allowOverride });
}

function changed(path: string): ChangedPathView[] {
  return [{ path }];
}

describe("T039 per-run admission decision in src/check.ts", () => {
  it("refuses an affected task by default before launch with canonical refusal fields", () => {
    const decisions = runDecisions(changed("vitest.config.ts"));

    expect(decisions.test).toMatchObject({
      commandSurfaceChanged: true,
      changedAuthorityPaths: ["vitest.config.ts"],
      executionAdmission: "refused_changed_surface",
      launchAllowed: false,
    });
    expect(decisions.test.refusal).toEqual({
      status: "NOT_RUN",
      reasonCode: "command_surface_changed",
      reasonText: "effective command or configuration authority changed in this invocation",
    });
  });

  it("permits an affected task to launch only for the invocation supplying the explicit override", () => {
    const decisions = runDecisions(changed("vitest.config.ts"), true);

    expect(decisions.test.executionAdmission).toBe("explicit_changed_surface_override");
    expect(decisions.test.launchAllowed).toBe(true);
    expect(decisions.test.refusal).toBeNull();
    expect(decisions.test.changedAuthorityPaths).toEqual(["vitest.config.ts"]);
  });

  it("does not persist the override across invocations", () => {
    const before = runDecisions(changed("vitest.config.ts"));
    const during = runDecisions(changed("vitest.config.ts"), true);
    const after = runDecisions(changed("vitest.config.ts"));

    expect(before.test.launchAllowed).toBe(false);
    expect(during.test.launchAllowed).toBe(true);
    expect(after).toEqual(before);
  });

  it("keeps unaffected tasks normal even when the override flag was supplied", () => {
    const decisions = runDecisions(changed("src/index.ts"), true);

    for (const task of ["typecheck", "lint", "test", "pytestBasic"] as const) {
      expect(decisions[task]).toMatchObject({
        commandSurfaceChanged: false,
        changedAuthorityPaths: [],
        executionAdmission: "normal",
        launchAllowed: true,
        refusal: null,
      });
    }
  });

  it("keeps fixed tasks independent by default when their authorities do not intersect the diff", () => {
    const decisions = runDecisions(changed("vitest.config.ts"));

    expect(decisions.test.executionAdmission).toBe("refused_changed_surface");
    expect(decisions.typecheck.executionAdmission).toBe("normal");
    expect(decisions.lint.executionAdmission).toBe("normal");
    expect(decisions.pytestBasic.executionAdmission).toBe("normal");
    expect(decisions.typecheck.launchAllowed).toBe(true);
    expect(decisions.lint.launchAllowed).toBe(true);
  });

  it("never emits BLOCKED from admission; refusals are always NOT_RUN results", () => {
    const decisions = runDecisions([
      { path: "tsconfig.json" },
      { path: "eslint.config.js" },
      { path: "vitest.config.ts" },
      { path: "pyproject.toml" },
      { path: "package.json" },
    ]);

    for (const task of ["typecheck", "lint", "test", "pytestBasic"] as const) {
      const decision = decisions[task];
      if (!decision.commandSurfaceChanged) continue;
      expect(decision.refusal?.status).toBe("NOT_RUN");
      expect(decision.refusal?.reasonCode.length).toBeGreaterThan(0);
      expect(decision.refusal?.reasonText.length).toBeGreaterThan(0);
    }

    expect(decisions.typecheck.refusal).not.toBeNull();
    expect(decisions.lint.refusal).not.toBeNull();
    expect(decisions.test.refusal).not.toBeNull();
    expect(decisions.pytestBasic.refusal).not.toBeNull();
  });

  it("uses each task's effective authority so an effective pytest config change refuses pytestBasic alone", () => {
    const decisions = runDecisions(changed("pyproject.toml"));

    expect(decisions.pytestBasic.changedAuthorityPaths).toEqual(["pyproject.toml"]);
    expect(decisions.pytestBasic.executionAdmission).toBe("refused_changed_surface");
    expect(decisions.typecheck.executionAdmission).toBe("normal");
    expect(decisions.lint.executionAdmission).toBe("normal");
    expect(decisions.test.executionAdmission).toBe("normal");
  });

  it("treats a changed package.json as authority for every script-backed task at once", () => {
    const decisions = runDecisions(changed("package.json"));

    expect(decisions.typecheck.changedAuthorityPaths).toContain("package.json");
    expect(decisions.lint.changedAuthorityPaths).toContain("package.json");
    expect(decisions.test.changedAuthorityPaths).toContain("package.json");
    expect(decisions.pytestBasic.executionAdmission).toBe("normal");
  });

  it("honors an explicit command override by moving authority to ascout.config.json only", () => {
    const discovery = discoverProjectFromFiles(FULL_PROJECT);
    const decisions = decideRunAdmissions(discovery, changed("tsconfig.json"), {
      tasks: { typecheck: { command: ["npx", "tsc", "--noEmit"] } },
    });

    expect(decisions.typecheck.executionAdmission).toBe("normal");

    const ascoutChanged = decideRunAdmissions(discovery, changed("ascout.config.json"), {
      tasks: { typecheck: { command: ["npx", "tsc", "--noEmit"] } },
    });
    expect(ascoutChanged.typecheck.executionAdmission).toBe("refused_changed_surface");
    expect(ascoutChanged.typecheck.changedAuthorityPaths).toEqual(["ascout.config.json"]);
  });

  it("considers previous_path so renamed authority files still intersect", () => {
    const decision = decideTaskAdmission(
      "test",
      ["package.json", "vitest.config.ts"],
      [{ path: "vitest.config.new.ts", previous_path: "vitest.config.ts" }],
      false,
    );

    expect(decision.changedAuthorityPaths).toEqual(["vitest.config.ts"]);
    expect(decision.executionAdmission).toBe("refused_changed_surface");
  });

  it("deduplicates disclosed changed authority paths", () => {
    const decision = decideTaskAdmission(
      "test",
      ["package.json", "vitest.config.ts"],
      [
        { path: "vitest.config.ts" },
        { path: "vitest.config.ts" },
        { path: "docs/notes.md" },
      ],
      false,
    );

    expect(decision.changedAuthorityPaths).toEqual(["vitest.config.ts"]);
    expect(new Set(decision.changedAuthorityPaths).size).toBe(decision.changedAuthorityPaths.length);
  });

  it("returns normal admission for every fixed task when nothing relevant changed", () => {
    const decisions = runDecisions([]);

    for (const task of ["typecheck", "lint", "test", "pytestBasic"] as const) {
      expect(decisions[task].executionAdmission).toBe("normal");
      expect(decisions[task].launchAllowed).toBe(true);
    }
  });
});
