import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

type FixtureCatalog = {
  readonly version: 1;
  readonly related: {
    readonly changedSource: string;
    readonly expectedTestBasenames: readonly string[];
    readonly selectionMode: "native_related";
  };
  readonly configWidening: {
    readonly changedPath: string;
    readonly expectedTestBasenames: readonly string[];
    readonly trigger: "vitest_config_changed";
    readonly widenedMode: "full";
    readonly forbiddenNarrowArgs: readonly ["related", "--changed"];
  };
  readonly artifacts: {
    readonly jsonResult: string;
    readonly coverageDirectory: string;
    readonly lcov: string;
  };
  readonly requiredRunArgs: readonly string[];
  readonly coverageArgs: readonly string[];
};

type VitestJsonReport = {
  readonly testResults?: readonly {
    readonly name?: string;
  }[];
};

const FIXTURE_CATALOG_URL = new URL("./fixtures/vitest/cases.json", import.meta.url);
const require = createRequire(import.meta.url);
const vitestPackagePath = require.resolve("vitest/package.json");
const vitestCliPath = resolve(dirname(vitestPackagePath), "vitest.mjs");

function loadCatalog(): FixtureCatalog {
  return JSON.parse(readFileSync(FIXTURE_CATALOG_URL, "utf8")) as FixtureCatalog;
}

function runCommand(cwd: string, executable: string, args: readonly string[]): string {
  const result = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `command failed: ${executable} ${args.join(" ")}`,
        `status=${String(result.status)}`,
        `stdout=${result.stdout}`,
        `stderr=${result.stderr}`,
      ].join("\n"),
    );
  }
  return result.stdout;
}

function initializeFixtureRepository(): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-t045-vitest-"));
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "tests"), { recursive: true });
  mkdirSync(join(root, ".ascout", "runs", "t045", "raw", "test"), { recursive: true });

  writeFileSync(join(root, ".gitignore"), ".ascout/\n");
  writeFileSync(join(root, "package.json"), "{\n  \"name\": \"t045-vitest-fixture\",\n  \"private\": true,\n  \"type\": \"module\"\n}\n");
  writeFileSync(join(root, "vitest.config.mjs"), "export default { test: { globals: true } };\n");
  writeFileSync(join(root, "src", "used.js"), "export function used() { return 2; }\n");
  writeFileSync(join(root, "src", "unused.js"), "export function unused() { return 3; }\n");
  writeFileSync(
    join(root, "tests", "used.test.js"),
    'import { used } from "../src/used.js";\ntest("used", () => { expect(used()).toBe(2); });\n',
  );
  writeFileSync(
    join(root, "tests", "unused.test.js"),
    'import { unused } from "../src/unused.js";\ntest("unused", () => { expect(unused()).toBe(3); });\n',
  );

  runCommand(root, "git", ["init", "-q"]);
  runCommand(root, "git", ["config", "user.name", "Ascout T045 Fixture"]);
  runCommand(root, "git", ["config", "user.email", "t045@example.invalid"]);
  runCommand(root, "git", ["add", "."]);
  runCommand(root, "git", ["commit", "-qm", "baseline"]);

  return root;
}

function readTestBasenames(jsonPath: string): readonly string[] {
  const report = JSON.parse(readFileSync(jsonPath, "utf8")) as VitestJsonReport;
  return (report.testResults ?? [])
    .map((result) => result.name)
    .filter((name): name is string => typeof name === "string")
    .map((name) => basename(name))
    .sort();
}

function expectAscoutRelativePath(path: string): void {
  expect(path.startsWith(".ascout/")).toBe(true);
  expect(path.startsWith("/")).toBe(false);
  expect(path).not.toContain("\\");
  expect(path).not.toContain("//");
  expect(path.split("/")).not.toContain("..");
}

describe("T045 Vitest fixture/integration contract", () => {
  it("locks non-watch JSON and LCOV artifact arguments under .ascout/", () => {
    const catalog = loadCatalog();

    expect(catalog.version).toBe(1);
    expect(catalog.related.selectionMode).toBe("native_related");
    expect(catalog.configWidening.trigger).toBe("vitest_config_changed");
    expect(catalog.configWidening.widenedMode).toBe("full");
    expect(catalog.configWidening.forbiddenNarrowArgs).toEqual(["related", "--changed"]);
    expect(catalog.requiredRunArgs).toContain("--run");
    expect(catalog.requiredRunArgs).toContain("--reporter=json");
    expect(catalog.coverageArgs).toContain("--coverage.enabled=true");
    expect(catalog.coverageArgs).toContain("--coverage.reporter=lcov");
    expect(catalog.coverageArgs).toContain(
      `--coverage.reportsDirectory=${catalog.artifacts.coverageDirectory}`,
    );

    for (const path of [catalog.artifacts.jsonResult, catalog.artifacts.coverageDirectory, catalog.artifacts.lcov]) {
      expectAscoutRelativePath(path);
    }
    expect(catalog.artifacts.lcov).toBe(`${catalog.artifacts.coverageDirectory}/lcov.info`);
    expect(catalog.artifacts.coverageDirectory).not.toBe("coverage");
  });

  it("uses project-local Vitest related selection and writes machine JSON under .ascout/", () => {
    const catalog = loadCatalog();
    const root = initializeFixtureRepository();

    try {
      expect(existsSync(vitestCliPath)).toBe(true);
      const jsonPath = join(root, ...catalog.artifacts.jsonResult.split("/"));
      runCommand(root, process.execPath, [
        vitestCliPath,
        "related",
        catalog.related.changedSource,
        "--run",
        "--reporter=json",
        `--outputFile=${catalog.artifacts.jsonResult}`,
      ]);

      expect(existsSync(jsonPath)).toBe(true);
      expect(readTestBasenames(jsonPath)).toEqual([...catalog.related.expectedTestBasenames].sort());
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("widens to a full non-watch run when Vitest config changes", () => {
    const catalog = loadCatalog();
    const root = initializeFixtureRepository();

    try {
      const configPath = join(root, catalog.configWidening.changedPath);
      writeFileSync(configPath, `${readFileSync(configPath, "utf8")}\n// changed config requires full Ascout widening\n`);

      const widenedArgs = [
        vitestCliPath,
        "--run",
        "--reporter=json",
        `--outputFile=${catalog.artifacts.jsonResult}`,
      ] as const;
      for (const forbidden of catalog.configWidening.forbiddenNarrowArgs) {
        expect(widenedArgs).not.toContain(forbidden);
      }

      const jsonPath = join(root, ...catalog.artifacts.jsonResult.split("/"));
      runCommand(root, process.execPath, widenedArgs);

      expect(existsSync(jsonPath)).toBe(true);
      expect(readTestBasenames(jsonPath)).toEqual([...catalog.configWidening.expectedTestBasenames].sort());
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
