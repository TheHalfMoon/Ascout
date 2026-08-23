import { describe, expect, it } from "vitest";

import { parseConfigV1 } from "../src/config.js";
import { discoverProjectFromFiles } from "../src/discovery.js";
import { planTypeScriptTask } from "../src/tools/typescript.js";

describe("T035 root-local tsc configuration ambiguity", () => {
  it("fails closed when a root-local tsc can reach both root and workspace TypeScript configs", () => {
    const files = {
      "package.json": JSON.stringify({
        name: "root",
        private: true,
        workspaces: ["packages/*"],
        devDependencies: { typescript: "6.0.0" },
      }),
      "tsconfig.json": "{}",
      "node_modules/.bin/tsc": "root executable",
      "packages/app/package.json": JSON.stringify({ name: "app" }),
      "packages/app/tsconfig.json": "{}",
    };

    const result = planTypeScriptTask({
      config: parseConfigV1({ version: 1 }),
      discovery: discoverProjectFromFiles(files),
      files,
    });

    expect(result).toMatchObject({
      state: "not_run",
      authorizedBy: "discovery",
      sourcePath: null,
      argv: [],
      commandSource: null,
      configPath: null,
      reasonCode: "config_ambiguous",
      reasonText: "Multiple TypeScript project configurations apply to the discovered local tsc.",
    });
  });
});
