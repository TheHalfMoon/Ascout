import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";
import { buildNormalizedTestFinding, normalizedAggregateTestStatus, parseTestAssertionObservations } from "../src/test-reproduction.js";
import { writePackageNodeCommandShim } from "./helpers/native-command-shim.js";

function results(assertions: readonly { fullName: string; status: string }[], name = "/repo/tests/a.test.js"): string {
  return JSON.stringify({ testResults: [{ name, assertionResults: assertions }] });
}

describe("parseTestAssertionObservations with duplicate test names", () => {
  it("counts same-named tests in one file as one ambiguous observation, failed if any failed", () => {
    const observations = parseTestAssertionObservations("/repo", results([
      { fullName: "works", status: "passed" },
      { fullName: "works", status: "failed" },
      { fullName: "other", status: "passed" },
    ]), "e1");
    expect(observations).toEqual([
      { path: "tests/a.test.js", fullName: "works", outcome: "failed", evidenceId: "e1", ambiguous: true },
      { path: "tests/a.test.js", fullName: "other", outcome: "passed", evidenceId: "e1" },
    ]);
  });

  it("keeps a failure that comes before a passing duplicate", () => {
    const [observation] = parseTestAssertionObservations("/repo", results([
      { fullName: "works", status: "failed" },
      { fullName: "works", status: "passed" },
    ]), "e1");
    expect(observation).toMatchObject({ outcome: "failed", ambiguous: true });
  });

  it("keeps two passing duplicates as passed", () => {
    const [observation] = parseTestAssertionObservations("/repo", results([
      { fullName: "works", status: "passed" },
      { fullName: "works", status: "passed" },
    ]), "e1");
    expect(observation).toMatchObject({ outcome: "passed", ambiguous: true });
  });

  it("keeps the same name in different files apart", () => {
    const text = JSON.stringify({ testResults: [
      { name: "/repo/tests/a.test.js", assertionResults: [{ fullName: "works", status: "failed" }] },
      { name: "/repo/tests/b.test.js", assertionResults: [{ fullName: "works", status: "passed" }] },
    ] });
    expect(parseTestAssertionObservations("/repo", text, "e1").map(({ path, ambiguous }) => [path, ambiguous])).toEqual([
      ["tests/a.test.js", undefined],
      ["tests/b.test.js", undefined],
    ]);
  });
});

describe("buildNormalizedTestFinding with an ambiguous identity", () => {
  const identity = { path: "tests/a.test.js", fullName: "works" };

  it("never claims reproduction from runs it can't attribute", () => {
    const finding = buildNormalizedTestFinding(0, "vitest", identity, [
      { ...identity, outcome: "failed", evidenceId: "e1", ambiguous: true },
      { ...identity, outcome: "failed", evidenceId: "e2", ambiguous: true },
    ]);
    // The receipt allows an unknown reproduction only for a single failing observation.
    expect(finding).toMatchObject({ reproduced: "unknown", determinism_class: "unknown", observations: { runs: 1, failures: 1 } });
    expect(normalizedAggregateTestStatus([finding])).toBe("FAIL");
  });

  it("is never FLAKY, even when its runs disagree", () => {
    const finding = buildNormalizedTestFinding(0, "vitest", identity, [
      { ...identity, outcome: "failed", evidenceId: "e1", ambiguous: true },
      { ...identity, outcome: "passed", evidenceId: "e2", ambiguous: true },
    ]);
    expect(normalizedAggregateTestStatus([finding])).toBe("FAIL");
  });
});

function run(root: string, file: string, argv: readonly string[]): void {
  const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
}

describe("check with two same-named tests, one failing", () => {
  it("reports the failure instead of an invalid receipt", async () => {
    // The runner reports the long path; Windows runners give tmpdir() as an 8.3 short path.
    const root = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-duplicate-names-")));
    try {
      mkdirSync(join(root, "src"), { recursive: true });
      mkdirSync(join(root, "tests"), { recursive: true });
      mkdirSync(join(root, "node_modules", "vitest"), { recursive: true });
      mkdirSync(join(root, "node_modules", "@vitest", "coverage-v8"), { recursive: true });
      mkdirSync(join(root, "node_modules", "fake-runner"), { recursive: true });
      writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
      writeFileSync(join(root, "package.json"), JSON.stringify({
        name: "duplicate-names-fixture",
        private: true,
        type: "module",
        devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" },
      }));
      writeFileSync(join(root, "node_modules", "vitest", "package.json"), JSON.stringify({ name: "vitest", version: "4.1.10" }));
      writeFileSync(join(root, "node_modules", "@vitest", "coverage-v8", "package.json"), JSON.stringify({ name: "@vitest/coverage-v8", version: "4.1.10" }));
      const testFile = join(root, "tests", "used.test.js");
      const fakeRunner = [
        'import { mkdirSync, writeFileSync } from "node:fs";',
        'import { dirname } from "node:path";',
        'const output = process.argv.find((arg) => arg.startsWith("--outputFile="))?.slice("--outputFile=".length);',
        'const coverageDir = process.argv.find((arg) => arg.startsWith("--coverage.reportsDirectory="))?.slice("--coverage.reportsDirectory=".length);',
        "if (!output) process.exit(64);",
        "mkdirSync(dirname(output), { recursive: true });",
        `writeFileSync(output, ${JSON.stringify(results([{ fullName: "works", status: "passed" }, { fullName: "works", status: "failed" }], testFile))});`,
        'if (coverageDir) { mkdirSync(coverageDir, { recursive: true }); writeFileSync(coverageDir + "/lcov.info", "SF:src/used.js\\nDA:1,1\\nend_of_record\\n"); }',
        "process.exit(1);",
      ].join("\n");
      writeFileSync(join(root, "node_modules", "fake-runner", "index.mjs"), `${fakeRunner}\n`);
      writePackageNodeCommandShim(join(root, "node_modules", ".bin"), "vitest", "../fake-runner/index.mjs");
      writeFileSync(join(root, "src", "used.js"), "export function used() { return 2; }\n");
      writeFileSync(testFile, "test('works', () => {});\n");
      run(root, "git", ["init", "-q"]);
      run(root, "git", ["config", "user.name", "Ascout Duplicate Fixture"]);
      run(root, "git", ["config", "user.email", "duplicate@example.invalid"]);
      run(root, "git", ["add", "."]);
      run(root, "git", ["commit", "-qm", "baseline"]);
      writeFileSync(join(root, "src", "used.js"), "export function used() { return 1 + 1; }\n");

      const { receipt } = await runCheck(root);
      // No targeted rerun: it couldn't tell the two tests apart.
      expect(receipt.tasks.find(({ task_id }) => task_id === "test")).toMatchObject({ status: "FAIL", observations: { runs: 1, failures: 1 } });
      expect(receipt.findings).toEqual([expect.objectContaining({ rule_or_test_id: "works", reproduced: "unknown", determinism_class: "unknown" })]);
      expect(receipt.summary).toMatchObject({ exit_code: 1 });
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
});
