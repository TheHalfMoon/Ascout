import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";
import { writeNodeCommandShim } from "./helpers/native-command-shim.js";

const require = createRequire(import.meta.url);
const vitestCli = resolve(dirname(require.resolve("vitest/package.json")), "vitest.mjs");
const fixtureFiles = {
  ".gitignore": ".ascout/\nnode_modules/\n",
  "package.json": JSON.stringify({ private: true, type: "module", devDependencies: { vitest: "4.1.11", "@vitest/coverage-v8": "4.1.11" } }),
  "vitest.config.mjs": "export default { test: { globals: true, maxWorkers: 1, fileParallelism: false } };\n",
  "data/input.json": '{"allowed":true}\n',
  "src/stable.js": "export function stable() { return 1; }\n",
  "tests/stable.test.js": 'import { stable } from "../src/stable.js";\ntest("stable source", () => expect(stable()).toBe(1));\n',
  "tests/data.test.js": 'import { readFileSync } from "node:fs";\ntest("runtime data contract", () => expect(JSON.parse(readFileSync(new URL("../data/input.json", import.meta.url), "utf8")).allowed).toBe(true));\n',
};

function retain(name: string, value: string): void {
  const output = process.env["ASCOUT_E02_EVIDENCE"];
  if (output === undefined) return;
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, name), value);
}

function native(root: string, label: string, args: readonly string[]) {
  const argv = [vitestCli, ...args, "--run", "--passWithNoTests", "--reporter=json", `--outputFile=.ascout/${label}.json`];
  const result = spawnSync(process.execPath, argv, { cwd: root, encoding: "utf8", env: { ...process.env, CI: "1" }, timeout: 15_000 });
  retain(`${label}.stdout.txt`, result.stdout ?? "");
  retain(`${label}.stderr.txt`, result.stderr ?? "");
  retain(`${label}.command.json`, JSON.stringify({ cwd: root, argv: [process.execPath, ...argv], exit: result.status, signal: result.signal, error: result.error?.message ?? null }, null, 2));
  expect(result.error).toBeUndefined();
  const text = readFileSync(join(root, ".ascout", `${label}.json`), "utf8");
  retain(`${label}.results.json`, text);
  return { exit: result.status, report: JSON.parse(text) as { numTotalTests: number; numFailedTests: number; testResults: { name: string }[] } };
}

function initialize(files: Readonly<Record<string, string>>): string {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-e02-native-")));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  // Only identity metadata is copied; the owned shim reuses the installed CLI.
  for (const name of ["vitest", "@vitest/coverage-v8"]) {
    const target = join(root, "node_modules", name, "package.json");
    mkdirSync(dirname(target), { recursive: true });
    cpSync(require.resolve(`${name}/package.json`), target);
  }
  writeNodeCommandShim(join(root, "node_modules", ".bin"), "vitest", `import(${JSON.stringify(pathToFileURL(vitestCli).href)});\n`);
  for (const args of [["init", "-q"], ["config", "user.name", "Ascout E02 Fixture"], ["config", "user.email", "e02@example.invalid"], ["add", "."], ["commit", "-qm", "baseline"]]) {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  }
  return root;
}

describe("REA-E02 native runtime-data fallback", () => {
  it("catches a seeded data failure with full native execution and an observed full runCheck pass", async () => {
    const root = initialize(fixtureFiles);
    try {
      const working = native(root, "working-full", []);
      expect(working.exit).toBe(0);
      expect(working.report).toMatchObject({ numTotalTests: 2, numFailedTests: 0 });

      writeFileSync(join(root, "data/input.json"), '{"allowed":false}\n');
      retain("fixture.json", JSON.stringify({ files: fixtureFiles, mutation: { path: "data/input.json", text: '{"allowed":false}\n', sha256: createHash("sha256").update(readFileSync(join(root, "data/input.json"))).digest("hex") }, sha256: Object.fromEntries(Object.entries(fixtureFiles).map(([path, text]) => [path, createHash("sha256").update(text).digest("hex")])) }, null, 2));
      const related = native(root, "mutated-related", ["related", "data/input.json"]);
      expect(related.exit).toBe(0);
      expect(related.report).toMatchObject({ numTotalTests: 0, numFailedTests: 0 });
      const full = native(root, "mutated-full", []);
      expect(full.exit).toBe(1);
      expect(full.report).toMatchObject({ numTotalTests: 2, numFailedTests: 1 });

      const receipt = (await runCheck(root)).receipt;
      retain("receipt.json", JSON.stringify(receipt, null, 2));
      const output = process.env["ASCOUT_E02_EVIDENCE"];
      if (output !== undefined) {
        cpSync(join(root, ".ascout", "runs", receipt.run.run_id), join(output, "runCheck"), { recursive: true });
      }
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
      expect(receipt.source.start).toEqual(receipt.source.end);
      expect(receipt.comparison.changed_files.map(({ path }) => path)).toEqual(["data/input.json"]);
      expect(receipt.selection).toMatchObject({
        mode: "full", widened: true, widen_triggers: ["non_source_relation_risk"],
        selected_test_count: 2, deselected_test_count: 0, total_test_count: 2,
        passes: [{ ordinal: 1, mode: "full", trigger: "non_source_relation_risk", selected_test_count: 2, deselected_test_count: 0, total_test_count: 2 }],
      });
      expect(receipt.selection.passes).toHaveLength(1);
      expect(receipt.tasks.find(({ task_id }) => task_id === "test")).toMatchObject({ status: "FAIL", exit_code: 1, execution_admission: "normal" });
      expect(receipt.summary.exit_code).not.toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, process.platform === "win32" ? 120_000 : 60_000);

  it("catches a changed root source failure when package data also requires widening", async () => {
    const files: Record<string, string> = {
      ...fixtureFiles,
      "package.json": JSON.stringify({ private: true, type: "module", workspaces: ["packages/*"], devDependencies: { vitest: "4.1.11", "@vitest/coverage-v8": "4.1.11" } }),
      "packages/a/package.json": JSON.stringify({ private: true, type: "module", devDependencies: { vitest: "4.1.11" } }),
      "packages/a/data/input.json": '{"allowed":true}\n',
      "packages/a/tests/data.test.js": `import { test, expect } from ${JSON.stringify(pathToFileURL(resolve(dirname(vitestCli), "dist/index.js")).href)};\nimport { readFileSync } from "node:fs";\ntest("package data", () => expect(JSON.parse(readFileSync(new URL("../data/input.json", import.meta.url), "utf8")).allowed).toBe(true));\n`,
    };
    delete files["data/input.json"];
    delete files["tests/data.test.js"];
    const root = initialize(files);
    try {
      const working = native(root, "cross-working-full", []);
      expect(working.exit).toBe(0);
      expect(working.report).toMatchObject({ numTotalTests: 2, numFailedTests: 0 });
      const mutations = { "src/stable.js": "export function stable() { return 2; }\n", "packages/a/data/input.json": '{"allowed":true,"changed":1}\n' };
      for (const [path, text] of Object.entries(mutations)) writeFileSync(join(root, path), text);
      retain("cross-fixture.json", JSON.stringify({ files, mutations, sha256: Object.fromEntries(Object.entries({ ...files, ...mutations }).map(([path, text]) => [path, createHash("sha256").update(text).digest("hex")])) }, null, 2));
      const packageOnly = native(join(root, "packages/a"), "cross-mutated-package-only", []);
      expect(packageOnly.exit).toBe(0);
      expect(packageOnly.report).toMatchObject({ numTotalTests: 1, numFailedTests: 0 });
      const full = native(root, "cross-mutated-full", []);
      expect(full.exit).toBe(1);
      expect(full.report).toMatchObject({ numTotalTests: 2, numFailedTests: 1 });
      const receipt = (await runCheck(root)).receipt;
      retain("cross-receipt.json", JSON.stringify(receipt, null, 2));
      const output = process.env["ASCOUT_E02_EVIDENCE"];
      if (output !== undefined) cpSync(join(root, ".ascout", "runs", receipt.run.run_id), join(output, "cross-runCheck"), { recursive: true });
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
      expect(receipt.source.start).toEqual(receipt.source.end);
      expect(receipt.selection).toMatchObject({ mode: "full", initial_scope: { kind: "repository", path: null }, selected_test_count: 2, deselected_test_count: 0, total_test_count: 2, widened: true, widen_triggers: ["non_source_relation_risk"] });
      expect(receipt.selection.passes).toHaveLength(1);
      expect(receipt.tasks.find(({ task_id }) => task_id === "test")).toMatchObject({ status: "FAIL", exit_code: 1, execution_admission: "normal" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, process.platform === "win32" ? 120_000 : 60_000);
});
