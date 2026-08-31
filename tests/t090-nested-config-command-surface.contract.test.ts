import { describe, expect, it } from "vitest";

import {
  classifyCommandSurfaces,
  discoverProjectFromFiles,
  type DiscoveryFileMap,
} from "../src/discovery.js";
import { decideRunAdmissions } from "../src/check.js";

const NESTED_JEST_CONFIG = "scripts/jest/jest.config.cjs";

function nestedJestFiles(extra: DiscoveryFileMap = {}): DiscoveryFileMap {
  return {
    "package.json": JSON.stringify({
      name: "t090-nested-authority",
      private: true,
      devDependencies: { jest: "30.4.2" },
    }),
    "node_modules/.bin/jest": "",
    "node_modules/.bin/jest.cmd": "",
    [NESTED_JEST_CONFIG]: "",
    ...extra,
  };
}

describe("T090 nested runner-config command authority", () => {
  it("promotes the selected nested config into production test authority without changing normal admission", () => {
    const discovery = discoverProjectFromFiles(nestedJestFiles());
    const surfaces = classifyCommandSurfaces(discovery);

    expect(discovery.tools.jest.configPaths).toEqual([NESTED_JEST_CONFIG]);
    expect(surfaces.test.authorityPaths).toContain("package.json");
    expect(surfaces.test.authorityPaths).toContain(NESTED_JEST_CONFIG);

    const decisions = decideRunAdmissions(discovery, [{ path: "src/used.js" }]);
    expect(decisions.test).toMatchObject({
      commandSurfaceChanged: false,
      changedAuthorityPaths: [],
      executionAdmission: "normal",
      launchAllowed: true,
      refusal: null,
    });
  });

  it("refuses a changed selected nested config by default and records its exact authority path", () => {
    const discovery = discoverProjectFromFiles(nestedJestFiles());
    const decisions = decideRunAdmissions(discovery, [
      { path: "src/used.js" },
      { path: NESTED_JEST_CONFIG },
    ]);

    expect(decisions.test).toMatchObject({
      commandSurfaceChanged: true,
      changedAuthorityPaths: [NESTED_JEST_CONFIG],
      executionAdmission: "refused_changed_surface",
      launchAllowed: false,
      refusal: {
        status: "NOT_RUN",
        reasonCode: "command_surface_changed",
      },
    });
    expect(decisions.test.refusal?.reasonText.length).toBeGreaterThan(0);
  });

  it("admits the same changed nested config only when the current invocation explicitly allows it", () => {
    const discovery = discoverProjectFromFiles(nestedJestFiles());
    const changed = [{ path: NESTED_JEST_CONFIG }] as const;

    const admitted = decideRunAdmissions(discovery, changed, {
      allowChangedCommandSurface: true,
    });
    const nextOrdinary = decideRunAdmissions(discovery, changed);

    expect(admitted.test).toMatchObject({
      commandSurfaceChanged: true,
      changedAuthorityPaths: [NESTED_JEST_CONFIG],
      executionAdmission: "explicit_changed_surface_override",
      launchAllowed: true,
      refusal: null,
    });
    expect(nextOrdinary.test).toMatchObject({
      commandSurfaceChanged: true,
      changedAuthorityPaths: [NESTED_JEST_CONFIG],
      executionAdmission: "refused_changed_surface",
      launchAllowed: false,
      refusal: { reasonCode: "command_surface_changed" },
    });
  });

  it("does not promote an irrelevant nested config when an existing root config is effective", () => {
    const discovery = discoverProjectFromFiles(nestedJestFiles({
      "jest.config.cjs": "",
    }));
    const surfaces = classifyCommandSurfaces(discovery);

    expect(discovery.tools.jest.configPaths).toEqual(["jest.config.cjs"]);
    expect(surfaces.test.authorityPaths).toContain("jest.config.cjs");
    expect(surfaces.test.authorityPaths).not.toContain(NESTED_JEST_CONFIG);

    const decisions = decideRunAdmissions(discovery, [
      { path: "src/used.js" },
      { path: NESTED_JEST_CONFIG },
    ]);
    expect(decisions.test).toMatchObject({
      commandSurfaceChanged: false,
      changedAuthorityPaths: [],
      executionAdmission: "normal",
      launchAllowed: true,
    });
  });
});
