import { describe, expect, it } from "vitest";

import type { LcovBranchPoint, LcovLinePoint } from "../src/coverage/lcov.js";
import type { GitChangedFile } from "../src/git.js";
import { buildBranchExercise, buildChangedLineExercise } from "../src/exercise.js";

function changed(
  path: string,
  ranges: readonly (readonly [number, number])[],
  overrides: Partial<GitChangedFile> = {},
): GitChangedFile {
  return {
    path,
    change_kind: "modified",
    line_semantics: "text",
    changed_new_line_ranges: ranges,
    ...overrides,
  };
}

function linePoint(path: string, line: number, count: number): LcovLinePoint {
  return { path, line, count };
}

function branch(
  path: string,
  line: number,
  overrides: Partial<LcovBranchPoint> = {},
): LcovBranchPoint {
  return {
    path,
    line,
    block_id: "0",
    branch_id: "0",
    taken: 1,
    state: "EXERCISED",
    ...overrides,
  };
}

describe("T102 branch exercise contracts", () => {
  it("identifies a branch-only gap while preserving the line-level exercised record", () => {
    const changedFiles = [changed("src/choice.ts", [[10, 10]])];
    const linePoints = [linePoint("src/choice.ts", 10, 3)];
    const branchPoints = [
      branch("src/choice.ts", 10, { branch_id: "0", taken: 3, state: "EXERCISED" }),
      branch("src/choice.ts", 10, { branch_id: "1", taken: 0, state: "NOT_EXERCISED" }),
    ];

    const exercise = buildChangedLineExercise(changedFiles, linePoints, "test", branchPoints);

    expect(exercise.records).toEqual([
      {
        path: "src/choice.ts",
        line: 10,
        state: "EXERCISED",
        execution_count: 3,
        source_task_ids: ["test"],
      },
    ]);
    expect(exercise).toMatchObject({
      exercised_lines: 1,
      not_exercised_lines: 0,
      unresolved_lines: 0,
      exercised_branches: 1,
      not_exercised_branches: 1,
      unresolved_branches: 0,
    });
  });

  it("keeps an exercised line record unchanged when its only branch is unresolved", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/unknown.ts", [[4, 4]])],
      [linePoint("src/unknown.ts", 4, 7)],
      "test",
      [branch("src/unknown.ts", 4, { taken: null, state: "UNRESOLVED" })],
    );

    expect(exercise.records).toEqual([
      {
        path: "src/unknown.ts",
        line: 4,
        state: "EXERCISED",
        execution_count: 7,
        source_task_ids: ["test"],
      },
    ]);
    expect(exercise.unresolved_branches).toBe(1);
  });

  it("keeps a not-exercised line record unchanged even when a branch is exercised", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/mismatch.ts", [[8, 8]])],
      [linePoint("src/mismatch.ts", 8, 0)],
      "test",
      [branch("src/mismatch.ts", 8, { taken: 2, state: "EXERCISED" })],
    );

    expect(exercise.records).toEqual([
      {
        path: "src/mismatch.ts",
        line: 8,
        state: "NOT_EXERCISED",
        execution_count: 0,
        source_task_ids: ["test"],
      },
    ]);
    expect(exercise.exercised_branches).toBe(1);
  });

  it("yields no branch gap when all changed branches are fully exercised", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/choice.ts", [[10, 10]])],
      [linePoint("src/choice.ts", 10, 1)],
      "test",
      [
        branch("src/choice.ts", 10, { branch_id: "0", taken: 1, state: "EXERCISED" }),
        branch("src/choice.ts", 10, { branch_id: "1", taken: 1, state: "EXERCISED" }),
      ],
    );

    expect(exercise).toMatchObject({
      exercised_branches: 2,
      not_exercised_branches: 0,
      unresolved_branches: 0,
    });
  });

  it("does not count branches outside changed ranges as changed-branch gaps", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/choice.ts", [[10, 10]])],
      [linePoint("src/choice.ts", 10, 1)],
      "test",
      [branch("src/choice.ts", 11, { branch_id: "0", taken: 0, state: "NOT_EXERCISED" })],
    );

    expect(exercise.branch_records).toHaveLength(0);
    expect(exercise).toMatchObject({
      exercised_branches: 0,
      not_exercised_branches: 0,
      unresolved_branches: 0,
    });
  });

  it("orders branch records deterministically by path, line, block_id, branch_id", () => {
    const exercise = buildBranchExercise(
      [changed("src/z.ts", [[1, 1]])],
      [
        branch("src/z.ts", 1, { block_id: "b", branch_id: "1", taken: 0, state: "NOT_EXERCISED" }),
        branch("src/z.ts", 1, { block_id: "a", branch_id: "0", taken: 1, state: "EXERCISED" }),
        branch("src/z.ts", 1, { block_id: "a", branch_id: "1", taken: 0, state: "NOT_EXERCISED" }),
      ],
      "test",
    );

    expect(exercise.branch_records).toEqual([
      {
        path: "src/z.ts",
        line: 1,
        block_id: "a",
        branch_id: "0",
        taken: 1,
        state: "EXERCISED",
      },
      {
        path: "src/z.ts",
        line: 1,
        block_id: "a",
        branch_id: "1",
        taken: 0,
        state: "NOT_EXERCISED",
      },
      {
        path: "src/z.ts",
        line: 1,
        block_id: "b",
        branch_id: "1",
        taken: 0,
        state: "NOT_EXERCISED",
      },
    ]);
  });

  it("preserves existing line exercise behavior when branchPoints are omitted", () => {
    const exercise = buildChangedLineExercise(
      [
        changed("src/a.ts", [[1, 4]]),
        changed("src/b.ts", [[10, 11]]),
        changed("README.md", [[1, 2]]),
        changed("tests/a.test.ts", [[1, 3]]),
        changed("src/types.d.ts", [[1, 2]]),
        changed("assets/logo.bin", [], { change_kind: "type_changed", line_semantics: "binary_or_non_line" }),
        changed("src/removed.ts", [], { change_kind: "deleted", line_semantics: "deleted_only" }),
      ],
      [
        { path: "src/a.ts", line: 1, count: 3, instrumented: true },
        { path: "src/a.ts", line: 2, count: 0, instrumented: true },
        { path: "src/a.ts", line: 9, count: 7, instrumented: true },
      ],
      "test",
    );

    expect(exercise.records).toEqual([
      {
        path: "src/a.ts",
        line: 1,
        state: "EXERCISED",
        execution_count: 3,
        source_task_ids: ["test"],
      },
      {
        path: "src/a.ts",
        line: 2,
        state: "NOT_EXERCISED",
        execution_count: 0,
        source_task_ids: ["test"],
      },
      {
        path: "src/b.ts",
        line: 10,
        state: "UNRESOLVED",
        execution_count: null,
        source_task_ids: ["test"],
        reason: "coverage_source_mapping_unresolved",
      },
      {
        path: "src/b.ts",
        line: 11,
        state: "UNRESOLVED",
        execution_count: null,
        source_task_ids: ["test"],
        reason: "coverage_source_mapping_unresolved",
      },
    ]);
    expect(exercise).toMatchObject({
      changed_executable_lines: 4,
      exercised_lines: 1,
      not_exercised_lines: 1,
      unresolved_lines: 2,
      changed_files_with_zero_exercised_lines: 1,
    });
  });

  it("preserves deterministic ordering for line-only input without branch points", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/z.ts", [[2, 2]]), changed("src/a.ts", [[1, 1]])],
      [
        { path: "src/z.ts", line: 2, count: 0, instrumented: true },
        { path: "src/a.ts", line: 1, count: 2, instrumented: true },
      ],
      "test",
    );

    expect(exercise.records.map(({ path, line }) => `${path}:${line}`)).toEqual([
      "src/a.ts:1",
      "src/z.ts:2",
    ]);
  });
});
