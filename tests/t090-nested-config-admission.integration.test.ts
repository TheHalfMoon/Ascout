import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";
import { writePackageNodeCommandShim } from "./helpers/native-command-shim.js";

const NESTED_CONFIG = "scripts/jest/jest.config.cjs";
const MARKER = "nested-config-loaded.marker";

function run(root: string, file: string, argv: readonly string[]): void {
  const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
}

function initializeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-t090-nested-admission-"));
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "tests"), { recursive: true });
  mkdirSync(join(root, "scripts", "jest"), { recursive: true });
  cpSync(resolve("node_modules"), join(root, "node_modules"), { recursive: true });

  const binRoot = join(root, "node_modules", ".bin");
  rmSync(binRoot, { recursive: true, force: true });
  writePackageNodeCommandShim(binRoot, "jest", "../jest/bin/jest.js");

  writeFileSync(join(root, ".gitignore"), `.ascout/\nnode_modules/\n${MARKER}\n`);
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "t090-nested-admission",
      private: true,
      devDependencies: { jest: "30.4.2" },
    }),
  );
  writeFileSync(
    join(root, ...NESTED_CONFIG.split("/")),
    [
      "const { writeFileSync } = require('node:fs');",
      "const { resolve } = require('node:path');",
      `writeFileSync(resolve(__dirname, '..', '..', '${MARKER}'), 'loaded\\n');`,
      "module.exports = { rootDir: '../..', testEnvironment: 'node' };",
      "",
    ].join("\n"),
  );
  writeFileSync(join(root, "src", "used.js"), "exports.used = function used() { return 2; };\n");
  writeFileSync(
    join(root, "tests", "used.test.js"),
    "const { used } = require('../src/used.js');\ntest('used', () => { expect(used()).toBe(2); });\n",
  );

  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.name", "Ascout T090 Fixture"]);
  run(root, "git", ["config", "user.email", "t090@example.invalid"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["commit", "-qm", "baseline"]);

  writeFileSync(join(root, "src", "used.js"), "exports.used = function used() { return 1 + 1; };\n");
  const configPath = join(root, ...NESTED_CONFIG.split("/"));
  const baselineConfig = [
    "const { writeFileSync } = require('node:fs');",
    "const { resolve } = require('node:path');",
    `writeFileSync(resolve(__dirname, '..', '..', '${MARKER}'), 'loaded\\n');`,
    "module.exports = { rootDir: '../..', testEnvironment: 'node' };",
    "// changed after baseline",
    "",
  ].join("\n");
  writeFileSync(configPath, baselineConfig);
  return root;
}

function testTask(receipt: Awaited<ReturnType<typeof runCheck>>["receipt"]) {
  const task = receipt.tasks.find((candidate) => candidate.task_type === "test");
  if (task === undefined) throw new Error("expected test task in receipt");
  return task;
}

describe("T090 runCheck nested-config admission", () => {
  it("refuses before config load, admits one invocation with receipt-visible authority, then refuses again", async () => {
    const root = initializeFixture();
    const markerPath = join(root, MARKER);
    try {
      const ordinaryBefore = await runCheck(root);
      expect(validateReceiptSemantics(ordinaryBefore.receipt)).toEqual({ valid: true, issues: [] });
      expect(existsSync(markerPath)).toBe(false);
      expect(testTask(ordinaryBefore.receipt)).toMatchObject({
        source_path: NESTED_CONFIG,
        command_surface_changed: true,
        changed_authority_paths: [NESTED_CONFIG],
        execution_admission: "refused_changed_surface",
        status: "NOT_RUN",
        reason_code: "command_surface_changed",
      });
      expect(testTask(ordinaryBefore.receipt).reason_text?.length).toBeGreaterThan(0);

      const admitted = await runCheck(root, { allowChangedCommandSurface: true });
      expect(validateReceiptSemantics(admitted.receipt)).toEqual({ valid: true, issues: [] });
      expect(existsSync(markerPath)).toBe(true);
      expect(testTask(admitted.receipt)).toMatchObject({
        source_path: NESTED_CONFIG,
        command_surface_changed: true,
        changed_authority_paths: [NESTED_CONFIG],
        execution_admission: "explicit_changed_surface_override",
        status: "PASS",
        reason_code: null,
        reason_text: null,
      });
      expect(testTask(admitted.receipt).argv).toContain("--config");
      expect(testTask(admitted.receipt).argv).toContain(NESTED_CONFIG);

      rmSync(markerPath, { force: true });
      const ordinaryAfter = await runCheck(root);
      expect(validateReceiptSemantics(ordinaryAfter.receipt)).toEqual({ valid: true, issues: [] });
      expect(existsSync(markerPath)).toBe(false);
      expect(testTask(ordinaryAfter.receipt)).toMatchObject({
        source_path: NESTED_CONFIG,
        command_surface_changed: true,
        changed_authority_paths: [NESTED_CONFIG],
        execution_admission: "refused_changed_surface",
        status: "NOT_RUN",
        reason_code: "command_surface_changed",
      });

      expect({
        changed: testTask(ordinaryAfter.receipt).command_surface_changed,
        paths: testTask(ordinaryAfter.receipt).changed_authority_paths,
        admission: testTask(ordinaryAfter.receipt).execution_admission,
        status: testTask(ordinaryAfter.receipt).status,
        reason: testTask(ordinaryAfter.receipt).reason_code,
      }).toEqual({
        changed: testTask(ordinaryBefore.receipt).command_surface_changed,
        paths: testTask(ordinaryBefore.receipt).changed_authority_paths,
        admission: testTask(ordinaryBefore.receipt).execution_admission,
        status: testTask(ordinaryBefore.receipt).status,
        reason: testTask(ordinaryBefore.receipt).reason_code,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 90_000);
});
