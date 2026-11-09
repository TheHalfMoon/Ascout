import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";
import { writePackageNodeCommandShim } from "./helpers/native-command-shim.js";

const NAME = `line one${String.fromCharCode(10)}line two`;

function run(root: string, file: string, argv: readonly string[]): void {
  const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
}

describe("check with a failing test whose name holds a line break", () => {
  it("reports the failure instead of aborting", async () => {
    const root = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-test-name-break-")));
    try {
      mkdirSync(join(root, "src"), { recursive: true });
      mkdirSync(join(root, "tests"), { recursive: true });
      mkdirSync(join(root, "node_modules", "vitest"), { recursive: true });
      mkdirSync(join(root, "node_modules", "@vitest", "coverage-v8"), { recursive: true });
      mkdirSync(join(root, "node_modules", "fake-runner"), { recursive: true });
      writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
      writeFileSync(join(root, "package.json"), JSON.stringify({
        name: "test-name-break-fixture",
        private: true,
        type: "module",
        devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" },
      }));
      writeFileSync(join(root, "node_modules", "vitest", "package.json"), JSON.stringify({ name: "vitest", version: "4.1.10" }));
      writeFileSync(join(root, "node_modules", "@vitest", "coverage-v8", "package.json"), JSON.stringify({ name: "@vitest/coverage-v8", version: "4.1.10" }));
      const testFile = join(root, "tests", "used.test.js");
      const results = JSON.stringify({ testResults: [{ name: testFile, assertionResults: [{ fullName: NAME, status: "failed" }] }] });
      const lcov = ["SF:src/used.js", "DA:1,1", "end_of_record", ""].join(String.fromCharCode(10));
      const fakeRunner = [
        'import { mkdirSync, writeFileSync } from "node:fs";',
        'import { dirname } from "node:path";',
        'const output = process.argv.find((arg) => arg.startsWith("--outputFile="))?.slice("--outputFile=".length);',
        'const coverageDir = process.argv.find((arg) => arg.startsWith("--coverage.reportsDirectory="))?.slice("--coverage.reportsDirectory=".length);',
        "if (!output) process.exit(64);",
        "mkdirSync(dirname(output), { recursive: true });",
        `writeFileSync(output, ${JSON.stringify(results)});`,
        `if (coverageDir) { mkdirSync(coverageDir, { recursive: true }); writeFileSync(coverageDir + "/lcov.info", ${JSON.stringify(lcov)}); }`,
        "process.exit(1);",
      ].join("\n");
      writeFileSync(join(root, "node_modules", "fake-runner", "index.mjs"), `${fakeRunner}\n`);
      writePackageNodeCommandShim(join(root, "node_modules", ".bin"), "vitest", "../fake-runner/index.mjs");
      writeFileSync(join(root, "src", "used.js"), "export function used() { return 2; }\n");
      writeFileSync(testFile, "test('x', () => {});\n");
      run(root, "git", ["init", "-q"]);
      run(root, "git", ["config", "user.name", "Ascout Name Fixture"]);
      run(root, "git", ["config", "user.email", "name@example.invalid"]);
      run(root, "git", ["add", "."]);
      run(root, "git", ["commit", "-qm", "baseline"]);
      writeFileSync(join(root, "src", "used.js"), "export function used() { return 1 + 1; }\n");

      const { receipt } = await runCheck(root);
      expect(receipt.tasks.find(({ task_id }) => task_id === "test")).toMatchObject({ status: "FAIL" });
      expect(receipt.findings).toEqual([expect.objectContaining({ rule_or_test_id: NAME })]);
      if (process.platform === "win32") {
        // The rerun is skipped, so only the first observation counts.
        expect(receipt.findings[0]).toMatchObject({ reproduced: "unknown", observations: { runs: 1, failures: 1 } });
      }
      expect(receipt.summary).toMatchObject({ exit_code: 1 });
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
});
