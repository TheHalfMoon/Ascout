import { describe, expect, it } from "vitest";

import type { LcovLinePoint } from "../src/coverage/lcov.js";
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

function point(path: string, line: number, count: number): LcovLinePoint {
  return { path, line, count, instrumented: true };
}

describe("T055 changed executable exercise intersection", () => {
  it("intersects only instrumented changed lines and preserves strict execution counts", () => {
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
        point("src/a.ts", 1, 3),
        point("src/a.ts", 2, 0),
        point("src/a.ts", 9, 7),
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

  it("does not invent executable records for changed lines absent from an otherwise related LCOV file", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/a.ts", [[5, 7]])],
      [point("src/a.ts", 5, 1), point("src/a.ts", 9, 1)],
      "test",
    );

    expect(exercise.records).toEqual([
      {
        path: "src/a.ts",
        line: 5,
        state: "EXERCISED",
        execution_count: 1,
        source_task_ids: ["test"],
      },
    ]);
    expect(exercise.changed_executable_lines).toBe(1);
    expect(exercise.unresolved_lines).toBe(0);
  });

  it("is deterministic for repeated input points and changed-file ordering", () => {
    const exercise = buildChangedLineExercise(
      [changed("src/z.ts", [[2, 2]]), changed("src/a.ts", [[1, 1]])],
      [point("src/z.ts", 2, 0), point("src/a.ts", 1, 2)],
      "test",
    );

    expect(exercise.records.map(({ path, line }) => `${path}:${line}`)).toEqual(["src/a.ts:1", "src/z.ts:2"]);
  });
});
