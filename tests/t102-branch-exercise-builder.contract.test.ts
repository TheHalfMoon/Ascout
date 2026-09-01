import { describe, expect, it } from "vitest";

import {
  type BranchExerciseV1,
  buildBranchExercise,
} from "../src/exercise.js";

function changed(
  path: string,
  ranges: readonly (readonly [number, number])[],
  overrides: { readonly change_kind?: "modified" | "deleted" | "type_changed"; readonly line_semantics?: "text" | "binary_or_non_line" | "deleted_only" } = {},
) {
  return {
    path,
    change_kind: "modified" as const,
    line_semantics: "text" as const,
    changed_new_line_ranges: ranges,
    ...overrides,
  };
}

function branchPoint(
  path: string,
  line: number,
  state: "EXERCISED" | "NOT_EXERCISED" | "UNRESOLVED",
  taken: number | null = state === "EXERCISED" ? 2 : state === "NOT_EXERCISED" ? 0 : null,
  block_id = "0",
  branch_id = "0",
): LcovBranchPoint {
  return { path, line, block_id, branch_id, taken, state };
}

describe("T102 branch exercise builder", () => {
  it("produces additive branch fields on exercised changed lines", () => {
    const result = buildBranchExercise(
      [changed("src/alpha.ts", [[10, 12]])],
      [branchPoint("src/alpha.ts", 10, "EXERCISED"), branchPoint("src/alpha.ts", 11, "NOT_EXERCISED"), branchPoint("src/alpha.ts", 12, "UNRESOLVED", null)],
      "test",
    );

    expect(result).toMatchObject({
      exercised_branches: 1,
      not_exercised_branches: 1,
      unresolved_branches: 1,
      changed_files_with_zero_exercised_branches: 0,
    });
    expect(result.branch_records).toHaveLength(3);
    expect(result.branch_records[0]).toMatchObject({ path: "src/alpha.ts", line: 10, state: "EXERCISED", taken: 2 });
    expect(result.branch_records[1]).toMatchObject({ path: "src/alpha.ts", line: 11, state: "NOT_EXERCISED", taken: 0 });
    expect(result.branch_records[2]).toMatchObject({ path: "src/alpha.ts", line: 12, state: "UNRESOLVED", taken: null, reason: "changed branch evidence is unresolved" });
  });

  it("returns zeroed aggregate fields when no branch records intersect changed ranges", () => {
    const result = buildBranchExercise(
      [changed("src/beta.ts", [[1, 3]])],
      [],
      "test",
    );

    expect(result).toMatchObject({
      exercised_branches: 0,
      not_exercised_branches: 0,
      unresolved_branches: 0,
      changed_files_with_zero_exercised_branches: 0,
      branch_records: [],
    });
  });

  it("filters branch points to changed-file owned ranges", () => {
    const result = buildBranchExercise(
      [changed("src/gamma.ts", [[20, 22]])],
      [branchPoint("src/gamma.ts", 10, "EXERCISED"), branchPoint("src/gamma.ts", 20, "EXERCISED"), branchPoint("src/gamma.ts", 30, "EXERCISED")],
      "test",
    );

    expect(result.branch_records).toHaveLength(1);
    expect(result.branch_records[0]).toMatchObject({ path: "src/gamma.ts", line: 20 });
  });

  it("preserves deterministic branch tuple ordering", () => {
    const result = buildBranchExercise(
      [changed("src/delta.ts", [[1, 1]])],
      [
        branchPoint("src/delta.ts", 1, "EXERCISED", 2, "1", "1"),
        branchPoint("src/delta.ts", 1, "EXERCISED", 2, "0", "0"),
      ],
      "test",
    );

    expect(result.branch_records.map((r) => `${r.block_id}:${r.branch_id}`)).toEqual(["0:0", "1:1"]);
  });

  it("is deterministic for repeated input ordering", () => {
    const first = buildBranchExercise(
      [changed("src/epsilon.ts", [[5, 5]])],
      [branchPoint("src/epsilon.ts", 5, "NOT_EXERCISED", 0)],
      "test",
    );
    const second = buildBranchExercise(
      [changed("src/epsilon.ts", [[5, 5]])],
      [branchPoint("src/epsilon.ts", 5, "NOT_EXERCISED", 0)],
      "test",
    );

    expect(first.branch_records).toEqual(second.branch_records);
  });

  it("does not invent branch records for deleted or non-text files", () => {
    const result = buildBranchExercise(
      [changed("src/removed.ts", [], { change_kind: "deleted", line_semantics: "deleted_only" }), changed("logo.bin", [], { line_semantics: "binary_or_non_line" })],
      [branchPoint("src/removed.ts", 1, "EXERCISED"), branchPoint("logo.bin", 1, "EXERCISED")],
      "test",
    );

    expect(result.branch_records).toHaveLength(0);
  });

  it("marks changed files without exercised branches as zero-exercised", () => {
    const result = buildBranchExercise(
      [changed("src/zeta.ts", [[1, 2]])],
      [branchPoint("src/zeta.ts", 1, "NOT_EXERCISED", 0), branchPoint("src/zeta.ts", 2, "UNRESOLVED", null)],
      "test",
    );

    expect(result.changed_files_with_zero_exercised_branches).toBe(1);
    expect(result.exercised_branches).toBe(0);
  });
});
