import { describe, expect, it } from "vitest";

import { DiscoveryError, discoverProjectFromFiles } from "../src/discovery.js";

describe("T034 declared-scope manifest parsing", () => {
  it("ignores malformed package manifests outside the declared root/workspace scope", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": JSON.stringify({
        name: "root",
        private: true,
        packageManager: "pnpm@10.15.0",
        devDependencies: { vitest: "4.1.10" },
      }),
      "examples/demo/package.json": "{ malformed",
      "examples/demo/jest.config.js": "export default {};\n",
      "examples/demo/node_modules/.bin/jest": "",
    });

    expect(discovery.workspace).toMatchObject({
      state: "resolved",
      kind: "single",
      packageJsonPaths: ["package.json"],
    });
    expect(discovery.packageManager).toMatchObject({
      state: "resolved",
      value: "pnpm",
      sourcePaths: ["package.json"],
    });
    expect(discovery.jsTestRunner).toEqual({
      state: "resolved",
      value: "vitest",
      sourcePaths: ["package.json"],
    });
    expect(discovery.tools.jest).toEqual({
      packageName: "jest",
      binName: "jest",
      declarationPaths: [],
      localExecutablePaths: [],
      configPaths: [],
    });
  });

  it("still fails closed when a malformed package manifest belongs to a declared workspace", () => {
    expect(() => discoverProjectFromFiles({
      "package.json": JSON.stringify({
        name: "root",
        private: true,
        workspaces: ["packages/*"],
      }),
      "packages/app/package.json": "{ malformed",
    })).toThrow(DiscoveryError);

    try {
      discoverProjectFromFiles({
        "package.json": JSON.stringify({
          name: "root",
          private: true,
          workspaces: ["packages/*"],
        }),
        "packages/app/package.json": "{ malformed",
      });
      throw new Error("expected declared malformed workspace manifest to fail closed");
    } catch (error) {
      expect(error).toBeInstanceOf(DiscoveryError);
      expect(error).toMatchObject({
        code: "invalid_package_json",
        sourcePath: "packages/app/package.json",
      });
    }
  });
});
