import { describe, expect, it } from "vitest";

import type { LcovBranchPoint, LcovLinePoint } from "../src/coverage/lcov.js";
import type { GitChangedFile } from "../src/git.js";
import { buildChangedLineExercise } from "../src/exercise.js";

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
  return { path, line, count, instrumented: true };
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
    state: "BRANCH_EXERCISED",
    ...overrides,
  };
}

describe("T102 branch exercise contracts", () => {
  it("identifies a branch-only gap while preserving the line-level exercised record", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/choice.ts", [[10, 10]])],
      [linePoint("src/choice.ts", 10, 3)],
      "test",
      [
        branch("src/choice.ts", 10, { branch_id: "0", taken: 3, state: "BRANCH_EXERCISED" }),
        branch("src/choice.ts", 10, { branch_id: "1", taken: 0, state: "BRANCH_NOT_EXERCISED" }),
      ],
    );

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
      changed_files_with_zero_exercised_branches: 0,
    });
    expect(exercise.branch_records.map(({ state }) => state)).toEqual(["EXERCISED", "NOT_EXERCISED"]);
  });

  it("keeps an exercised line record unchanged while an unknown branch remains unresolved", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/unknown.ts", [[4, 4]])],
      [linePoint("src/unknown.ts", 4, 7)],
      "test",
      [
        branch("src/unknown.ts", 4, {
          taken: null,
          state: "BRANCH_UNRESOLVED",
          reason: "LCOV branch taken count is unknown",
        }),
      ],
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
    expect(exercise.branch_records).toEqual([
      {
        path: "src/unknown.ts",
        line: 4,
        block_id: "0",
        branch_id: "0",
        taken: null,
        state: "UNRESOLVED",
        reason: "LCOV branch taken count is unknown",
      },
    ]);
    expect(exercise.unresolved_branches).toBe(1);
    expect(exercise.changed_files_with_zero_exercised_branches).toBe(1);
  });

  it("keeps a not-exercised line record unchanged even when a branch is exercised", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/mismatch.ts", [[8, 8]])],
      [linePoint("src/mismatch.ts", 8, 0)],
      "test",
      [branch("src/mismatch.ts", 8, { taken: 2, state: "BRANCH_EXERCISED" })],
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
    expect(exercise.changed_files_with_zero_exercised_branches).toBe(0);
  });

  it("yields no branch gap when all changed branches are fully exercised", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/choice.ts", [[10, 10]])],
      [linePoint("src/choice.ts", 10, 1)],
      "test",
      [
        branch("src/choice.ts", 10, { branch_id: "0", taken: 1 }),
        branch("src/choice.ts", 10, { branch_id: "1", taken: 2 }),
      ],
    );

    expect(exercise).toMatchObject({
      exercised_branches: 2,
      not_exercised_branches: 0,
      unresolved_branches: 0,
      changed_files_with_zero_exercised_branches: 0,
    });
  });

  it("excludes outside-range branches while still counting the changed file as having zero exercised changed branches", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/choice.ts", [[10, 10]])],
      [linePoint("src/choice.ts", 10, 1)],
      "test",
      [branch("src/choice.ts", 11, { taken: 0, state: "BRANCH_NOT_EXERCISED" })],
    );

    expect(exercise.branch_records).toHaveLength(0);
    expect(exercise).toMatchObject({
      exercised_branches: 0,
      not_exercised_branches: 0,
      unresolved_branches: 0,
      changed_files_with_zero_exercised_branches: 1,
    });
  });

  it("orders branch records deterministically by path, line, block_id, branch_id", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/z.ts", [[1, 1]]), changed("src/a.ts", [[2, 2]])],
      [linePoint("src/z.ts", 1, 1), linePoint("src/a.ts", 2, 1)],
      "test",
      [
        branch("src/z.ts", 1, { block_id: "b", branch_id: "1", taken: 0, state: "BRANCH_NOT_EXERCISED" }),
        branch("src/z.ts", 1, { block_id: "a", branch_id: "1", taken: 0, state: "BRANCH_NOT_EXERCISED" }),
        branch("src/a.ts", 2, { block_id: "z", branch_id: "9", taken: 1 }),
        branch("src/z.ts", 1, { block_id: "a", branch_id: "0", taken: 1 }),
      ],
    );

    expect(exercise.branch_records.map(({ path, line, block_id, branch_id }) =>
      `${path}:${line}:${block_id}:${branch_id}`,
    )).toEqual([
      "src/a.ts:2:z:9",
      "src/z.ts:1:a:0",
      "src/z.ts:1:a:1",
      "src/z.ts:1:b:1",
    ]);
  });

  it("counts every changed-range file with no exercised branch record, including a file with no branch tuple", () => {
    const exercise = buildChangedLineExercise(
      [
        changed("src/a.ts", [[1, 2]]),
        changed("src/b.ts", [[3, 3]]),
        changed("src/c.ts", [[4, 4]]),
      ],
      [
        linePoint("src/a.ts", 1, 1),
        linePoint("src/b.ts", 3, 1),
        linePoint("src/c.ts", 4, 1),
      ],
      "test",
      [
        branch("src/a.ts", 1, { taken: 0, state: "BRANCH_NOT_EXERCISED" }),
        branch("src/a.ts", 2, { branch_id: "1", taken: null, state: "BRANCH_UNRESOLVED" }),
        branch("src/b.ts", 3, { taken: 2, state: "BRANCH_EXERCISED" }),
      ],
    );

    expect(exercise.changed_files_with_zero_exercised_branches).toBe(2);
  });

  it("preserves existing line exercise behavior when branch observations are omitted", () => {
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
        linePoint("src/a.ts", 1, 3),
        linePoint("src/a.ts", 2, 0),
        linePoint("src/a.ts", 9, 7),
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
      exercised_branches: 0,
      not_exercised_branches: 0,
      unresolved_branches: 0,
      changed_files_with_zero_exercised_branches: 0,
      branch_records: [],
    });
  });
});
