import { describe, expect, it } from "vitest";

import type { LcovBranchPoint, LcovLinePoint } from "../src/coverage/lcov.js";
import type { GitChangedFile } from "../src/git.js";
import { buildChangedLineExercise, buildBranchExercise, type BranchExerciseV1 } from "../src/exercise.js";

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

function linePoint(
  path: string,
  line: number,
  count: number,
): LcovLinePoint {
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

describe("T102 branch exercise builder contracts", () => {
  it("identifies a branch-only gap when the changed line is line-exercised and at least one changed branch is not exercised", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/choice.ts", [[10, 10]])],
      [linePoint("src/choice.ts", 10, 3)],
      "test",
      [branch("src/choice.ts", 10, { branch_id: "0", taken: 3, state: "EXERCISED" }), branch("src/choice.ts", 10, { branch_id: "1", taken: 0, state: "NOT_EXERCISED" })],
    );

    expect(exercise).toMatchObject({
      exercised_lines: 1,
      not_exercised_lines: 0,
      unresolved_lines: 0,
      exercised_branches: 1,
      not_exercised_branches: 1,
      unresolved_branches: 0,
    });
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

  it("keeps unknown branches unresolved", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/choice.ts", [[10, 10]])],
      [linePoint("src/choice.ts", 10, 1)],
      "test",
      [branch("src/choice.ts", 10, { branch_id: "0", taken: null, state: "UNRESOLVED", reason: "LCOV branch taken count is unknown" })],
    );

    expect(exercise).toMatchObject({
      unresolved_branches: 1,
      exercised_branches: 0,
      not_exercised_branches: 0,
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
    const exercise = buildChangedLineExercise(
      [changed("src/z.ts", [[1, 1]])],
      [linePoint("src/z.ts", 1, 1)],
      "test",
      [
        branch("src/z.ts", 1, { block_id: "b", branch_id: "1", taken: 0, state: "NOT_EXERCISED" }),
        branch("src/z.ts", 1, { block_id: "a", branch_id: "0", taken: 1, state: "EXERCISED" }),
        branch("src/z.ts", 1, { block_id: "a", branch_id: "1", taken: 0, state: "NOT_EXERCISED" }),
      ],
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

describe("T102 buildBranchExercise contracts", () => {
  it("produces an empty branch exercise when no changed range contains a branch point", () => {
    const result = buildBranchExercise(
      [changed("src/choice.ts", [[10, 10]])],
      [branch("src/choice.ts", 11, { branch_id: "0", taken: 0, state: "NOT_EXERCISED" })],
      "test",
    );

    expect(result).toEqual<BranchExerciseV1>({
      exercised_branches: 0,
      not_exercised_branches: 0,
      unresolved_branches: 0,
      changed_files_with_zero_exercised_branches: 0,
      branch_records: [],
    });
  });

  it("marks UNRESOLVED branch evidence with the unresolved reason", () => {
    const result = buildBranchExercise(
      [changed("src/choice.ts", [[10, 10]])],
      [branch("src/choice.ts", 10, { branch_id: "0", taken: null, state: "UNRESOLVED" })],
      "test",
    );

    expect(result.branch_records).toEqual([
      {
        path: "src/choice.ts",
        line: 10,
        block_id: "0",
        branch_id: "0",
        taken: null,
        state: "UNRESOLVED",
        reason: "changed branch evidence is unresolved",
      },
    ]);
  });
});
