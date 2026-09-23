import { describe, expect, it } from "vitest";

import {
  assertReviewCoverageInputV1,
  computeReviewCoverageV1,
  isReviewFullyCoveredV1,
  type ReviewCoverageInputV1,
} from "../src/assurance/review/coverage-accounting.js";

function input(
  overrides: Partial<ReviewCoverageInputV1> = {},
): ReviewCoverageInputV1 {
  return {
    target_id: "target:t07",
    head_sha: "e".repeat(40),
    groups: [
      { group_id: "group:api", files: ["src/api/a.ts", "src/api/b.ts"] },
      { group_id: "group:ui", files: ["src/ui/c.ts"] },
    ],
    reviewed_files: ["src/api/a.ts", "src/api/b.ts", "src/ui/c.ts"],
    ...overrides,
  };
}

describe("UA-P03-T07 coverage accounting", () => {
  it("marks fully reviewed scope complete with explicit partitions", () => {
    const coverage = computeReviewCoverageV1(input());
    expect(coverage.complete).toBe(true);
    expect(coverage.unreviewed_files).toEqual([]);
    expect(coverage.reviewed_files).toEqual([
      "src/api/a.ts",
      "src/api/b.ts",
      "src/ui/c.ts",
    ]);
    expect(coverage.groups.map((group) => group.state)).toEqual([
      "FULLY_REVIEWED",
      "FULLY_REVIEWED",
    ]);
    expect(coverage.reasons).toEqual([]);
    expect(isReviewFullyCoveredV1(coverage)).toBe(true);
  });

  it("keeps partial and unreviewed scope explicitly visible, never clean", () => {
    const coverage = computeReviewCoverageV1(
      input({ reviewed_files: ["src/api/a.ts"] }),
    );
    expect(coverage.complete).toBe(false);
    expect(coverage.reviewed_files).toEqual(["src/api/a.ts"]);
    expect(coverage.unreviewed_files).toEqual([
      "src/api/b.ts",
      "src/ui/c.ts",
    ]);
    const byId = Object.fromEntries(
      coverage.groups.map((group) => [group.group_id, group]),
    );
    expect(byId["group:api"].state).toBe("PARTIALLY_REVIEWED");
    expect(byId["group:api"].unreviewed_files).toEqual(["src/api/b.ts"]);
    expect(byId["group:ui"].state).toBe("UNREVIEWED");
    expect(byId["group:ui"].unreviewed_files).toEqual(["src/ui/c.ts"]);
    expect(coverage.reasons.length).toBeGreaterThan(0);
    expect(isReviewFullyCoveredV1(coverage)).toBe(false);
  });

  it("marks empty review as fully unreviewed without implying clean", () => {
    const coverage = computeReviewCoverageV1(input({ reviewed_files: [] }));
    expect(coverage.complete).toBe(false);
    expect(coverage.reviewed_files).toEqual([]);
    expect(coverage.unreviewed_files).toEqual([
      "src/api/a.ts",
      "src/api/b.ts",
      "src/ui/c.ts",
    ]);
    for (const group of coverage.groups) {
      expect(group.state).toBe("UNREVIEWED");
    }
    expect(isReviewFullyCoveredV1(coverage)).toBe(false);
  });

  it("rejects reviewed files outside declared scope", () => {
    const bad = input({ reviewed_files: ["src/ghost.ts"] });
    const check = assertReviewCoverageInputV1(bad);
    expect(check.ok).toBe(false);
    expect(check.reasons.join("; ")).toMatch(/outside declared scope/u);
    expect(() => computeReviewCoverageV1(bad)).toThrow(TypeError);
  });

  it("rejects malformed scope with explicit reasons", () => {
    const duplicateGroup = input({
      groups: [
        { group_id: "group:api", files: ["src/api/a.ts"] },
        { group_id: "group:api", files: ["src/api/b.ts"] },
      ],
      reviewed_files: ["src/api/a.ts"],
    });
    expect(assertReviewCoverageInputV1(duplicateGroup).ok).toBe(false);
    expect(() => computeReviewCoverageV1(duplicateGroup)).toThrow(TypeError);

    const badHead = input({ head_sha: "not-a-sha" });
    expect(assertReviewCoverageInputV1(badHead).ok).toBe(false);

    const emptyGroups = input({ groups: [] });
    expect(assertReviewCoverageInputV1(emptyGroups).ok).toBe(false);
  });

  it("orders output canonically regardless of input order", () => {
    const first = computeReviewCoverageV1(
      input({
        groups: [
          { group_id: "group:ui", files: ["src/ui/c.ts"] },
          { group_id: "group:api", files: ["src/api/b.ts", "src/api/a.ts"] },
        ],
        reviewed_files: ["src/ui/c.ts", "src/api/a.ts"],
      }),
    );
    const second = computeReviewCoverageV1(
      input({
        groups: [
          { group_id: "group:api", files: ["src/api/a.ts", "src/api/b.ts"] },
          { group_id: "group:ui", files: ["src/ui/c.ts"] },
        ],
        reviewed_files: ["src/api/a.ts", "src/ui/c.ts"],
      }),
    );
    expect(first).toEqual(second);
  });
});
