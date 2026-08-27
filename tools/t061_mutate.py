from pathlib import Path
from textwrap import dedent


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 anchor, found {count}")
    return text.replace(old, new, 1)


check = Path("src/check.ts")
text = check.read_text()

text = replace_once(
    text,
    '''import {
  validateReceiptSemantics,
  type ArtifactV1,
  type ChangedFileV1,
  type ComparisonV1,
  type EvidenceV1,
  type ExecutionAdmission,
  type ExerciseV1,
  type ReceiptV1,
  type SourceStateV1,
  type TaskResultV1,
  type TestChangeV1,
} from "./receipt/model.js";''',
    '''import {
  UNSAFE_SELECTION_LIMITATION,
  validateReceiptSemantics,
  type ArtifactV1,
  type ChangedFileV1,
  type ComparisonV1,
  type EvidenceV1,
  type ExecutionAdmission,
  type ExerciseV1,
  type ReceiptV1,
  type SelectionV1,
  type SourceStateV1,
  type TaskResultV1,
  type TestChangeV1,
} from "./receipt/model.js";''',
    "model import",
)

text = replace_once(
    text,
    '''  decidePostRunWidening,
  decidePreRunWidening,
  initialSelection,
  postRunPlanningChangedFiles,
  preRunPlanningChangedFiles,
  withPostRunWideningPass,
} from "./selection.js";''',
    '''  decidePostRunWidening,
  decidePreRunWidening,
  initialSelection,
  postRunPlanningChangedFiles,
  preRunPlanningChangedFiles,
  SELECTION_COUNTS_NOT_OBSERVED_LIMITATION,
  withPostRunWideningPass,
} from "./selection.js";''',
    "selection import",
)

text = replace_once(
    text,
    '''interface ExecutedTestTask extends ExecutedTask {
  readonly coveragePoints: readonly LcovLinePoint[] | null;
}''',
    '''interface ExecutedTestTask extends ExecutedTask {
  readonly coveragePoints: readonly LcovLinePoint[] | null;
  readonly selectedTestCounts: readonly (number | null)[];
}''',
    "ExecutedTestTask",
)

helper = '''function observedSelectedTestCount(text: string): number | null {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const count = (value as { readonly numTotalTests?: unknown }).numTotalTests;
  return typeof count === "number" && Number.isInteger(count) && count >= 0 ? count : null;
}

function sameSelectionScope(
  left: SelectionV1["initial_scope"],
  right: SelectionV1["initial_scope"],
): boolean {
  return left.kind === right.kind && left.path === right.path;
}

function hasUnknownSelectionCounts(selection: SelectionV1): boolean {
  if (
    selection.selected_test_count === null ||
    selection.deselected_test_count === null ||
    selection.total_test_count === null
  ) return true;
  return selection.passes.some((pass) =>
    pass.selected_test_count === null ||
    pass.deselected_test_count === null ||
    pass.total_test_count === null
  );
}

/**
 * Finalizes only observed SelectionAccount facts after valid test execution.
 * Native-related runs expose the selected count when reported without guessing
 * the unobserved universe. A full pass is its own observed universe, so
 * selected=total and deselected=0. If a related first pass and a full second
 * pass share scope, the full pass closes the first-pass total/deselection
 * equation. Unknown counts stay null with an explicit limitation.
 */
export function finalizeSelectionAccount(
  selection: SelectionV1,
  passSelectedCounts: readonly (number | null)[],
  executedSafely: boolean,
): SelectionV1 {
  if (!executedSafely || selection.passes.length === 0) return selection;
  if (selection.passes.length > 2 || passSelectedCounts.length > 2) {
    throw new Error("SelectionAccount finalization permits at most two passes");
  }

  const passes = selection.passes.map((pass, index) => {
    const selected = passSelectedCounts[index] ?? null;
    return pass.mode === "full" && selected !== null
      ? { ...pass, selected_test_count: selected, deselected_test_count: 0, total_test_count: selected }
      : { ...pass, selected_test_count: selected, deselected_test_count: null, total_test_count: null };
  });

  if (
    passes.length === 2 &&
    passes[0]!.mode !== "full" &&
    passes[1]!.mode === "full" &&
    sameSelectionScope(passes[0]!.scope, passes[1]!.scope) &&
    passes[0]!.selected_test_count !== null &&
    passes[1]!.total_test_count !== null &&
    passes[0]!.selected_test_count <= passes[1]!.total_test_count
  ) {
    const total = passes[1]!.total_test_count;
    const selected = passes[0]!.selected_test_count;
    passes[0] = { ...passes[0]!, deselected_test_count: total - selected, total_test_count: total };
  }

  const finalPass = passes[passes.length - 1]!;
  const finalized: SelectionV1 = {
    ...selection,
    selected_test_count: finalPass.selected_test_count,
    deselected_test_count: finalPass.deselected_test_count,
    total_test_count: finalPass.total_test_count,
    passes,
    limitations: selection.limitations.filter((limitation) =>
      limitation !== UNSAFE_SELECTION_LIMITATION &&
      limitation !== SELECTION_COUNTS_NOT_OBSERVED_LIMITATION
    ),
  };

  return hasUnknownSelectionCounts(finalized)
    ? { ...finalized, limitations: [...finalized.limitations, SELECTION_COUNTS_NOT_OBSERVED_LIMITATION] }
    : finalized;
}

'''
text = replace_once(
    text,
    'function validVitestMachineResult(text: string): boolean {\n',
    helper + 'function validVitestMachineResult(text: string): boolean {\n',
    "finalizer insertion",
)

early = 'if (executed.task.status === "ERROR") return { ...executed, coveragePoints: null };'
if text.count(early) != 2:
    raise SystemExit(f"early error returns: expected 2, found {text.count(early)}")
text = text.replace(
    early,
    'if (executed.task.status === "ERROR") return { ...executed, coveragePoints: null, selectedTestCounts: [null] };',
)

error_tail = '''    artifacts: [...executed.artifacts, ...generated.map(({ artifact }) => artifact)],
    coveragePoints: null,
  };'''
if text.count(error_tail) != 2:
    raise SystemExit(f"evidence error tails: expected 2, found {text.count(error_tail)}")
text = text.replace(
    error_tail,
    '''    artifacts: [...executed.artifacts, ...generated.map(({ artifact }) => artifact)],
    coveragePoints: null,
    selectedTestCounts: [null],
  };''',
)

text = replace_once(
    text,
    '''    generated.push(machine);
    if (!validVitestMachineResult(machine.text)) return withVitestEvidenceError(executed, generated);

    const coverage = persistGeneratedTextArtifact(''',
    '''    generated.push(machine);
    if (!validVitestMachineResult(machine.text)) return withVitestEvidenceError(executed, generated);
    const selectedTestCount = observedSelectedTestCount(machine.text);

    const coverage = persistGeneratedTextArtifact(''',
    "Vitest count",
)

text = replace_once(
    text,
    '''    artifacts: [...executed.artifacts, ...generated.map(({ artifact }) => artifact)],
    coveragePoints,
  };
}


function validJestMachineResult''',
    '''    artifacts: [...executed.artifacts, ...generated.map(({ artifact }) => artifact)],
    coveragePoints,
    selectedTestCounts: [selectedTestCount],
  };
}


function validJestMachineResult''',
    "Vitest success return",
)

text = replace_once(
    text,
    '''    generated.push(machine);
    if (!validJestMachineResult(machine.text)) return withJestEvidenceError(executed, generated);

    const coverage = persistGeneratedTextArtifact(''',
    '''    generated.push(machine);
    if (!validJestMachineResult(machine.text)) return withJestEvidenceError(executed, generated);
    const selectedTestCount = observedSelectedTestCount(machine.text);

    const coverage = persistGeneratedTextArtifact(''',
    "Jest count",
)

text = replace_once(
    text,
    '''    artifacts: [...executed.artifacts, ...generated.map(({ artifact }) => artifact)],
    coveragePoints,
  };
}

function combineTestPasses''',
    '''    artifacts: [...executed.artifacts, ...generated.map(({ artifact }) => artifact)],
    coveragePoints,
    selectedTestCounts: [selectedTestCount],
  };
}

function combineTestPasses''',
    "Jest success return",
)

text = replace_once(
    text,
    '''    artifacts: [...first.artifacts, ...second.artifacts],
    coveragePoints: second.coveragePoints,
  };''',
    '''    artifacts: [...first.artifacts, ...second.artifacts],
    coveragePoints: second.coveragePoints,
    selectedTestCounts: [...first.selectedTestCounts, ...second.selectedTestCounts],
  };''',
    "combined counts",
)

text = replace_once(
    text,
    '''          exerciseCoveragePoints = finalExecuted.coveragePoints;
          executed = finalExecuted;''',
    '''          selection = finalizeSelectionAccount(
            selection,
            finalExecuted.selectedTestCounts,
            (finalExecuted.task.status === "PASS" || finalExecuted.task.status === "FAIL") &&
              finalExecuted.coveragePoints !== null,
          );
          exerciseCoveragePoints = finalExecuted.coveragePoints;
          executed = finalExecuted;''',
    "runCheck finalization",
)
check.write_text(text)

for filename in ["tests/vitest-check.integration.test.ts", "tests/jest-check.integration.test.ts"]:
    path = Path(filename)
    t = path.read_text()
    import_line = 'import { UNSAFE_SELECTION_LIMITATION, validateReceiptSemantics } from "../src/receipt/model.js";'
    if t.count(import_line) != 1:
        raise SystemExit(f"model import count in {filename}: {t.count(import_line)}")
    t = t.replace(
        import_line,
        import_line + '\nimport { SELECTION_COUNTS_NOT_OBSERVED_LIMITATION } from "../src/selection.js";',
        1,
    )
    unsafe = 'expect(receipt.selection.limitations).toContain(UNSAFE_SELECTION_LIMITATION);'
    if t.count(unsafe) != 1:
        raise SystemExit(f"unsafe expectation count in {filename}: {t.count(unsafe)}")
    t = t.replace(
        unsafe,
        '''expect(receipt.selection.limitations).not.toContain(UNSAFE_SELECTION_LIMITATION);
      expect(receipt.selection.limitations).toContain(SELECTION_COUNTS_NOT_OBSERVED_LIMITATION);
      expect(receipt.selection.selected_test_count).toBe(1);
      expect(receipt.selection.deselected_test_count).toBeNull();
      expect(receipt.selection.total_test_count).toBeNull();''',
        1,
    )
    summary = '''expect(receipt.summary.completeness).toBe("materially_incomplete");
      expect(receipt.summary.exit_code).toBe(4);'''
    if t.count(summary) != 1:
        raise SystemExit(f"summary expectation count in {filename}: {t.count(summary)}")
    t = t.replace(
        summary,
        '''expect(receipt.summary.completeness).toBe("complete");
      expect(receipt.summary.exit_code).toBe(0);''',
        1,
    )
    path.write_text(t)

for filename in [
    "tests/post-run-widening-run-check.integration.test.ts",
    "tests/post-run-widening-jest-run-check.integration.test.ts",
]:
    path = Path(filename)
    t = path.read_text()
    marker = 'import { validateReceiptSemantics } from "../src/receipt/model.js";'
    if t.count(marker) != 1:
        raise SystemExit(f"model import count in {filename}: {t.count(marker)}")
    t = t.replace(
        marker,
        marker + '\nimport { SELECTION_COUNTS_NOT_OBSERVED_LIMITATION } from "../src/selection.js";',
        1,
    )
    summary = '''expect(receipt.summary.completeness).toBe("materially_incomplete");
      expect(receipt.summary.exit_code).toBe(4);'''
    if t.count(summary) != 1:
        raise SystemExit(f"post-run summary count in {filename}: {t.count(summary)}")
    t = t.replace(
        summary,
        '''expect(receipt.selection.selected_test_count).toBeNull();
      expect(receipt.selection.deselected_test_count).toBeNull();
      expect(receipt.selection.total_test_count).toBeNull();
      expect(receipt.selection.limitations).toEqual([SELECTION_COUNTS_NOT_OBSERVED_LIMITATION]);
      expect(receipt.summary.completeness).toBe("complete");
      expect(receipt.summary.exit_code).toBe(0);''',
        1,
    )
    path.write_text(t)

Path("tests/selection-account-run-check.integration.test.ts").write_text(dedent(r'''
    import { chmodSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
    import { tmpdir } from "node:os";
    import { join, resolve } from "node:path";
    import { spawnSync } from "node:child_process";

    import { describe, expect, it } from "vitest";

    import { runCheck } from "../src/check.js";
    import { validateReceiptSemantics } from "../src/receipt/model.js";

    function run(root: string, file: string, argv: readonly string[]): void {
      const result = spawnSync(file, argv, { cwd: root, encoding: "utf8" });
      if (result.status !== 0) throw new Error(`${file} ${argv.join(" ")} failed: ${result.stderr || result.stdout}`);
    }

    function initializeFixture(): string {
      const root = mkdtempSync(join(tmpdir(), "ascout-t061-selection-"));
      mkdirSync(join(root, "src"), { recursive: true });
      cpSync(resolve("node_modules"), join(root, "node_modules"), { recursive: true });
      const binRoot = join(root, "node_modules", ".bin");
      rmSync(binRoot, { recursive: true, force: true });
      mkdirSync(binRoot, { recursive: true });
      const vitestShim = join(binRoot, "vitest");
      writeFileSync(vitestShim, `#!/usr/bin/env node
    const fs = require("node:fs");
    const path = require("node:path");
    const args = process.argv.slice(2);
    const outputArg = args.find((arg) => arg.startsWith("--outputFile="));
    const coverageArg = args.find((arg) => arg.startsWith("--coverage.reportsDirectory="));
    if (!outputArg || !coverageArg) process.exit(2);
    const outputPath = outputArg.slice("--outputFile=".length);
    const coverageDirectory = coverageArg.slice("--coverage.reportsDirectory=".length);
    const related = args.includes("related");
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.mkdirSync(coverageDirectory, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({ numTotalTests: related ? 1 : 2, testResults: related ? [{ name: "narrow.test.js" }] : [{ name: "narrow.test.js" }, { name: "other.test.js" }] }));
    const paths = related ? ["src/a.js"] : ["src/a.js", "src/b.js"];
    fs.writeFileSync(path.join(coverageDirectory, "lcov.info"), paths.map((source) => "SF:" + source + "\\nDA:1,1\\nend_of_record\\n").join(""));
    `);
      chmodSync(vitestShim, 0o755);
      writeFileSync(join(root, ".gitignore"), ".ascout/\nnode_modules/\n");
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "t061-selection-fixture", private: true, type: "module", devDependencies: { vitest: "4.1.10", "@vitest/coverage-v8": "4.1.10" } }));
      writeFileSync(join(root, "vitest.config.mjs"), "export default { test: { globals: true } };\n");
      writeFileSync(join(root, "src", "a.js"), "export const a = 1;\n");
      writeFileSync(join(root, "src", "b.js"), "export const b = 2;\n");
      run(root, "git", ["init", "-q"]);
      run(root, "git", ["config", "user.name", "Ascout T061 Fixture"]);
      run(root, "git", ["config", "user.email", "t061@example.invalid"]);
      run(root, "git", ["add", "."]);
      run(root, "git", ["commit", "-qm", "baseline"]);
      writeFileSync(join(root, "src", "a.js"), "export const a = 11;\n");
      writeFileSync(join(root, "src", "b.js"), "export const b = 22;\n");
      return root;
    }

    describe("T061 runCheck SelectionAccount finalization", () => {
      it("uses the one bounded full pass to close related-pass counts without guessing", async () => {
        const root = initializeFixture();
        try {
          const receipt = (await runCheck(root)).receipt;
          expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
          expect(receipt.selection).toEqual({
            mode: "full",
            initial_scope: { kind: "repository", path: null },
            selected_test_count: 2,
            deselected_test_count: 0,
            total_test_count: 2,
            widened: true,
            widen_triggers: ["post_run_exercise_gap"],
            passes: [
              { ordinal: 1, mode: "native_related", scope: { kind: "repository", path: null }, trigger: null, selected_test_count: 1, deselected_test_count: 1, total_test_count: 2 },
              { ordinal: 2, mode: "full", scope: { kind: "repository", path: null }, trigger: "post_run_exercise_gap", selected_test_count: 2, deselected_test_count: 0, total_test_count: 2 },
            ],
            limitations: [],
          });
          expect(receipt.selection.passes).toHaveLength(2);
          expect(receipt.summary.completeness).toBe("complete");
          expect(receipt.summary.exit_code).toBe(0);
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      }, 30_000);
    });
''').lstrip())
