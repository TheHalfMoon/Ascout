import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check.js";
import type { LcovLinePoint } from "../src/coverage/lcov.js";
import { buildChangedLineExercise, hasCoverageIgnoreHint } from "../src/exercise.js";
import { readContainedWorktreeText, type GitChangedFile } from "../src/git.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";
import { writePackageNodeCommandShim } from "./helpers/native-command-shim.js";

function changed(path: string, ranges: readonly (readonly [number, number])[]): GitChangedFile {
  return { path, change_kind: "modified", line_semantics: "text", changed_new_line_ranges: ranges };
}

function point(path: string, line: number, count: number): LcovLinePoint {
  return { path, line, count, instrumented: true };
}

const HINTED = "export const a = 1;\n/* v8 ignore next */\nexport function b() { return 2; }\nexport const c = 3;\n";
const PLAIN = "export const a = 1;\n// a note\nexport const c = 3;\n";

describe("hasCoverageIgnoreHint", () => {
  it.each([
    "/* v8 ignore next */",
    "/* v8 ignore next 3 */",
    "/* v8 ignore start */",
    "/* v8 ignore next -- @preserve */",
    "/* c8 ignore next */",
    "/* istanbul ignore next */",
    "/* istanbul ignore else */",
    "// v8 ignore next",
    "/* node:coverage ignore next */",
    "/* node:coverage disable */",
  ])("finds %j", (hint) => {
    expect(hasCoverageIgnoreHint(`const x = 1;\n${hint}\nconst y = 2;\n`)).toBe(true);
  });

  it.each(["const ignore = true;", "// v8ignore next", "// ignore the v8 engine", "istanbulIgnore()"])("finds nothing in %j", (text) => {
    expect(hasCoverageIgnoreHint(text)).toBe(false);
  });
});

describe("buildChangedLineExercise with changed source text", () => {
  it("marks changed lines without coverage UNRESOLVED in a file with an ignore hint", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/a.ts", [[1, 4]])],
      [point("src/a.ts", 1, 2), point("src/a.ts", 4, 0)],
      "test",
      undefined,
      () => HINTED,
    );
    expect(exercise.records).toEqual([
      { path: "src/a.ts", line: 1, state: "EXERCISED", execution_count: 2, source_task_ids: ["test"] },
      { path: "src/a.ts", line: 2, state: "UNRESOLVED", execution_count: null, source_task_ids: ["test"], reason: "coverage_ignore_hint_in_file" },
      { path: "src/a.ts", line: 3, state: "UNRESOLVED", execution_count: null, source_task_ids: ["test"], reason: "coverage_ignore_hint_in_file" },
      { path: "src/a.ts", line: 4, state: "NOT_EXERCISED", execution_count: 0, source_task_ids: ["test"] },
    ]);
    expect(exercise).toMatchObject({ changed_executable_lines: 4, exercised_lines: 1, not_exercised_lines: 1, unresolved_lines: 2 });
  });

  it("leaves changed lines without coverage unrecorded in a file with no hint", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/a.ts", [[1, 3]])],
      [point("src/a.ts", 1, 2), point("src/a.ts", 3, 1)],
      "test",
      undefined,
      () => PLAIN,
    );
    expect(exercise.records.map(({ line, state }) => [line, state])).toEqual([[1, "EXERCISED"], [3, "EXERCISED"]]);
    expect(exercise.unresolved_lines).toBe(0);
  });

  it("marks changed lines without coverage UNRESOLVED when the file can't be read", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/a.ts", [[1, 2]])],
      [point("src/a.ts", 1, 2)],
      "test",
      undefined,
      () => null,
    );
    expect(exercise.records[1]).toEqual({
      path: "src/a.ts", line: 2, state: "UNRESOLVED", execution_count: null, source_task_ids: ["test"], reason: "changed_source_unreadable",
    });
  });

  it("reads only changed production source that has coverage", () => {
    const read: string[] = [];
    buildChangedLineExercise(
      [
        changed("src/a.ts", [[1, 1]]),
        changed("src/uncovered.ts", [[1, 1]]),
        changed("tests/a.test.ts", [[1, 1]]),
        changed("src/types.d.ts", [[1, 1]]),
        changed("README.md", [[1, 1]]),
      ],
      [point("src/a.ts", 1, 1), point("tests/a.test.ts", 1, 1)],
      "test",
      undefined,
      (path) => {
        read.push(path);
        return PLAIN;
      },
    );
    expect(read).toEqual(["src/a.ts"]);
  });

  it("keeps the earlier result for a file with no coverage at all", () => {
    const exercise = buildChangedLineExercise([changed("src/a.ts", [[1, 1]])], [], "test", undefined, () => HINTED);
    expect(exercise.records).toEqual([
      { path: "src/a.ts", line: 1, state: "UNRESOLVED", execution_count: null, source_task_ids: ["test"], reason: "coverage_source_mapping_unresolved" },
    ]);
  });
});

describe("readContainedWorktreeText", () => {
  it("reads a regular file and returns null for anything it can't read safely", () => {
    const root = mkdtempSync(join(tmpdir(), "ascout-read-contained-"));
    try {
      mkdirSync(join(root, "src", "dir"), { recursive: true });
      writeFileSync(join(root, "src", "a.ts"), "export const a = 1;\n");
      expect(readContainedWorktreeText(root, "src/a.ts", 1024)).toBe("export const a = 1;\n");
      expect(readContainedWorktreeText(root, "src/a.ts", 5)).toBeNull();
      expect(readContainedWorktreeText(root, "src/missing.ts", 1024)).toBeNull();
      expect(readContainedWorktreeText(root, "src/dir", 1024)).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function run(root: string, file: string, argv: readonly string[]): void {
  const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
}

/**
 * A Vitest repository whose change replaces `src/used.js` with `changedSource`.
 * The stand-in runner passes and reports coverage for line 1 only, as V8 does
 * when the remaining changed lines are blank, comments, or under an ignore hint.
 */
function repository(changedSource: string): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-ignore-hint-"));
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "node_modules", "vitest"), { recursive: true });
  mkdirSync(join(root, "node_modules", "@vitest", "coverage-v8"), { recursive: true });
  mkdirSync(join(root, "node_modules", "fake-runner"), { recursive: true });
  writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
  writeFileSync(join(root, "package.json"), JSON.stringify({
    name: "ignore-hint-fixture",
    private: true,
    type: "module",
    devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" },
  }));
  writeFileSync(join(root, "node_modules", "vitest", "package.json"), JSON.stringify({ name: "vitest", version: "4.1.10" }));
  writeFileSync(join(root, "node_modules", "@vitest", "coverage-v8", "package.json"), JSON.stringify({ name: "@vitest/coverage-v8", version: "4.1.10" }));
  const fakeRunner = [
    'import { mkdirSync, writeFileSync } from "node:fs";',
    'import { dirname } from "node:path";',
    'const output = process.argv.find((arg) => arg.startsWith("--outputFile="))?.slice("--outputFile=".length);',
    'const coverageDir = process.argv.find((arg) => arg.startsWith("--coverage.reportsDirectory="))?.slice("--coverage.reportsDirectory=".length);',
    "if (!output || !coverageDir) process.exit(64);",
    "mkdirSync(dirname(output), { recursive: true });",
    "mkdirSync(coverageDir, { recursive: true });",
    'writeFileSync(output, JSON.stringify({ numTotalTests: 1, testResults: [] }));',
    'writeFileSync(coverageDir + "/lcov.info", "SF:src/used.js\\nDA:1,1\\nend_of_record\\n");',
  ].join("\n");
  writeFileSync(join(root, "node_modules", "fake-runner", "index.mjs"), `${fakeRunner}\n`);
  writePackageNodeCommandShim(join(root, "node_modules", ".bin"), "vitest", "../fake-runner/index.mjs");

  writeFileSync(join(root, "src", "used.js"), "export function used() { return 2; }\n");
  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.name", "Ascout Ignore Hint Fixture"]);
  run(root, "git", ["config", "user.email", "ignore-hint@example.invalid"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["commit", "-qm", "baseline"]);
  writeFileSync(join(root, "src", "used.js"), changedSource);
  return root;
}

describe("check with a coverage-ignore hint in changed source", () => {
  it("does not exit 0 when changed code sits under an ignore hint", async () => {
    const root = repository("export function used() { return 1 + 1; }\n/* v8 ignore next */\nexport function hidden() { return 3; }\n");
    try {
      const { receipt } = await runCheck(root);
      expect(receipt.exercise.records).toEqual([
        { path: "src/used.js", line: 1, state: "EXERCISED", execution_count: 1, source_task_ids: ["test"] },
        { path: "src/used.js", line: 2, state: "UNRESOLVED", execution_count: null, source_task_ids: ["test"], reason: "coverage_ignore_hint_in_file" },
        { path: "src/used.js", line: 3, state: "UNRESOLVED", execution_count: null, source_task_ids: ["test"], reason: "coverage_ignore_hint_in_file" },
      ]);
      expect(receipt.summary).toMatchObject({ completeness: "materially_incomplete", exit_code: 4 });
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);

  it("still exits 0 when the uncovered changed line is a plain comment", async () => {
    const root = repository("export function used() { return 1 + 1; }\n// a note\n");
    try {
      const { receipt } = await runCheck(root);
      expect(receipt.exercise.records).toEqual([
        { path: "src/used.js", line: 1, state: "EXERCISED", execution_count: 1, source_task_ids: ["test"] },
      ]);
      expect(receipt.summary).toMatchObject({ completeness: "complete", exit_code: 0 });
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);
});
