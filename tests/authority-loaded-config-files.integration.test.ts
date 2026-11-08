import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { classifyCommandSurfaces, discoverProjectFromFiles } from "../src/discovery.js";
import { writePackageNodeCommandShim } from "./helpers/native-command-shim.js";

function manifest(value: object): string {
  return JSON.stringify(value);
}

describe("loaded configuration files join the authority paths", () => {
  it("adds vite.config and vitest.workspace to a Vitest test task", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": manifest({ devDependencies: { vitest: "4.1.10" } }),
      "vite.config.ts": "",
      "vitest.workspace.ts": "",
      "babel.config.js": "",
    });
    const test = classifyCommandSurfaces(discovery).test.authorityPaths;
    expect(test).toContain("vite.config.ts");
    expect(test).toContain("vitest.workspace.ts");
    expect(test).not.toContain("babel.config.js");
  });

  it("adds Babel configuration to a Jest test task", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": manifest({ devDependencies: { jest: "30.4.2" } }),
      "babel.config.js": "",
      ".babelrc": "",
      "vite.config.ts": "",
    });
    const test = classifyCommandSurfaces(discovery).test.authorityPaths;
    expect(test).toEqual(expect.arrayContaining([".babelrc", "babel.config.js"]));
    expect(test).not.toContain("vite.config.ts");
  });

  it("adds package-manager configuration only to tasks run as package scripts", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": manifest({ scripts: { test: "vitest run" }, devDependencies: { vitest: "4.1.10", typescript: "5.9.3" } }),
      ".npmrc": "",
      ".yarnrc.yml": "",
      "tsconfig.json": "{}",
    });
    const surfaces = classifyCommandSurfaces(discovery);
    expect(surfaces.test.authorityPaths).toEqual(expect.arrayContaining([".npmrc", ".yarnrc.yml"]));
    expect(surfaces.typecheck.authorityPaths).not.toContain(".npmrc");
  });

  it("adds .pytest.ini to the pytest task", () => {
    const discovery = discoverProjectFromFiles({
      "pyproject.toml": "[tool.pytest.ini_options]\n",
      ".pytest.ini": "[pytest]\n",
    });
    expect(classifyCommandSurfaces(discovery).pytestBasic.authorityPaths).toEqual([".pytest.ini", "pyproject.toml"]);
  });

  it("ignores loaded configuration outside the repository root and package roots", () => {
    const discovery = discoverProjectFromFiles({
      "package.json": manifest({ devDependencies: { vitest: "4.1.10" } }),
      "docs/vite.config.ts": "",
    });
    expect(classifyCommandSurfaces(discovery).test.authorityPaths).not.toContain("docs/vite.config.ts");
  });

  it("keeps the earlier authority when discovery has no loaded configuration field", () => {
    const discovery = discoverProjectFromFiles({ "package.json": manifest({ devDependencies: { vitest: "4.1.10" } }) });
    const { loadedConfigPaths: _omitted, ...withoutField } = discovery;
    expect(classifyCommandSurfaces(withoutField).test.authorityPaths).toEqual(classifyCommandSurfaces(discovery).test.authorityPaths);
  });
});

function run(root: string, file: string, argv: readonly string[]): void {
  const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
}

describe("check with a new file Vitest loads", () => {
  it("refuses the test task when vite.config.ts is added", async () => {
    const root = mkdtempSync(join(tmpdir(), "ascout-loaded-config-"));
    try {
      mkdirSync(join(root, "src"), { recursive: true });
      mkdirSync(join(root, "node_modules", "vitest"), { recursive: true });
      mkdirSync(join(root, "node_modules", "@vitest", "coverage-v8"), { recursive: true });
      mkdirSync(join(root, "node_modules", "fake-runner"), { recursive: true });
      writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
      writeFileSync(join(root, "package.json"), manifest({
        name: "loaded-config-fixture",
        private: true,
        type: "module",
        devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" },
      }));
      writeFileSync(join(root, "node_modules", "vitest", "package.json"), manifest({ name: "vitest", version: "4.1.10" }));
      writeFileSync(join(root, "node_modules", "@vitest", "coverage-v8", "package.json"), manifest({ name: "@vitest/coverage-v8", version: "4.1.10" }));
      writeFileSync(join(root, "node_modules", "fake-runner", "index.mjs"), "process.exit(0);\n");
      writePackageNodeCommandShim(join(root, "node_modules", ".bin"), "vitest", "../fake-runner/index.mjs");
      writeFileSync(join(root, "src", "used.js"), "export function used() { return 2; }\n");
      run(root, "git", ["init", "-q"]);
      run(root, "git", ["config", "user.name", "Ascout Loaded Config Fixture"]);
      run(root, "git", ["config", "user.email", "loaded-config@example.invalid"]);
      run(root, "git", ["add", "."]);
      run(root, "git", ["commit", "-qm", "baseline"]);
      writeFileSync(join(root, "vite.config.ts"), "export default {};\n");

      const { receipt } = await runCheck(root);
      expect(receipt.tasks.find(({ task_id }) => task_id === "test")).toMatchObject({
        status: "NOT_RUN",
        execution_admission: "refused_changed_surface",
        changed_authority_paths: ["vite.config.ts"],
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});
