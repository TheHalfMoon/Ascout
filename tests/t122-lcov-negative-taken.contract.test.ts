import { describe, expect, it } from "vitest";

import {
  normalizeLcovBranchCoverage,
  normalizeLcovLineCoverage,
} from "../src/coverage/lcov.js";

const ROOT = "/repo";

function record(lines: readonly string[]): string {
  return ["SF:/repo/src/target.ts", ...lines, "end_of_record"].join("\n");
}

describe("T122 LCOV negative branch-taken fidelity", () => {
  it("keeps exact dash as unknown", () => {
    expect(
      normalizeLcovBranchCoverage(record(["BRDA:10,0,0,-"]), ROOT),
    ).toEqual({
      outcome: "resolved",
      observations: [
        {
          path: "src/target.ts",
          line: 10,
          block_id: "0",
          branch_id: "0",
          taken: null,
          state: "BRANCH_UNRESOLVED",
          reason: "LCOV branch taken count is unknown",
        },
      ],
    });
  });

  it.each([["-0"], ["-1"], ["-4"]])("maps signed-negative taken %s to unknown", (taken) => {
    expect(
      normalizeLcovBranchCoverage(record([`BRDA:10,0,0,${taken}`]), ROOT),
    ).toEqual({
      outcome: "resolved",
      observations: [
        {
          path: "src/target.ts",
          line: 10,
          block_id: "0",
          branch_id: "0",
          taken: null,
          state: "BRANCH_UNRESOLVED",
          reason: "LCOV branch taken count is unknown",
        },
      ],
    });
  });

  it("normalizes the measured negative record inside a realistic record", () => {
    const result = normalizeLcovBranchCoverage(
      record(["DA:1628,1", "BRDA:1628,166,1,-4", "BRDA:1628,166,2,3"]),
      ROOT,
    );
    expect(result).toEqual({
      outcome: "resolved",
      observations: [
        {
          path: "src/target.ts",
          line: 1628,
          block_id: "166",
          branch_id: "1",
          taken: null,
          state: "BRANCH_UNRESOLVED",
          reason: "LCOV branch taken count is unknown",
        },
        {
          path: "src/target.ts",
          line: 1628,
          block_id: "166",
          branch_id: "2",
          taken: 3,
          state: "BRANCH_EXERCISED",
        },
      ],
    });
  });

  it.each([
    ["plus-prefixed", "+4"],
    ["decimal", "1.5"],
    ["not-a-number", "NaN"],
    ["infinite", "Infinity"],
    ["hexadecimal", "0x10"],
    ["empty", ""],
    ["leading-space", " 4"],
    ["trailing-space", "4 "],
    ["double-minus", "--4"],
    ["spaced-minus", "- 4"],
  ])("keeps %s taken shape as invalid", (_label, taken) => {
    expect(
      normalizeLcovBranchCoverage(record([`BRDA:10,0,0,${taken}`]), ROOT),
    ).toEqual({
      outcome: "unresolved",
      observations: null,
      reason: "LCOV branch taken count is invalid",
    });
  });

  it.each([
    ["wrong field count", "BRDA:10,0,0"],
    ["empty block id", "BRDA:10,,0,1"],
    ["empty branch id", "BRDA:10,0,,1"],
    ["zero line", "BRDA:0,0,0,1"],
  ])("keeps %s as malformed branch", (_label, line) => {
    const result = normalizeLcovBranchCoverage(record([line]), ROOT);
    expect(result.outcome).toBe("unresolved");
    if (result.outcome !== "unresolved") return;
    expect(result.reason).toBe("LCOV branch record is malformed");
  });

  it("lets unknown poison numeric repeats regardless of order", () => {
    const negativeFirst = normalizeLcovBranchCoverage(
      record(["BRDA:10,0,0,-4", "BRDA:10,0,0,5"]),
      ROOT,
    );
    expect(negativeFirst).toMatchObject({ outcome: "resolved" });
    if (negativeFirst.outcome !== "resolved") return;
    expect(negativeFirst.observations).toHaveLength(1);
    expect(negativeFirst.observations[0]).toMatchObject({
      taken: null,
      state: "BRANCH_UNRESOLVED",
    });

    const numericFirst = normalizeLcovBranchCoverage(
      record(["BRDA:10,0,0,5", "BRDA:10,0,0,-4"]),
      ROOT,
    );
    expect(numericFirst).toEqual(negativeFirst);
  });

  it("aggregates numeric-only repeats identically to before", () => {
    expect(
      normalizeLcovBranchCoverage(record(["BRDA:10,0,0,2", "BRDA:10,0,0,3"]), ROOT),
    ).toMatchObject({
      outcome: "resolved",
      observations: [{ taken: 5, state: "BRANCH_EXERCISED" }],
    });
  });

  it("still rejects negative DA execution counts", () => {
    expect(
      normalizeLcovLineCoverage(record(["DA:10,-1"]), ROOT),
    ).toEqual({
      outcome: "unresolved",
      count: null,
      reason: "LCOV execution count is invalid",
    });
  });
});
