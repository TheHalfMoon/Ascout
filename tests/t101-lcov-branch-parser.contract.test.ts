import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  normalizeLcovBranchCoverage,
  normalizeLcovLineCoverage,
  type LcovBranchCoverageResult,
} from "../src/coverage/lcov.js";

type BranchFixtureCase = {
  readonly id: string;
  readonly purpose: string;
  readonly repoRoot: string;
  readonly input: string;
  readonly expected: LcovBranchCoverageResult;
};

type BranchFixtureCatalog = {
  readonly version: 1;
  readonly cases: readonly BranchFixtureCase[];
};

const FIXTURE_CATALOG_URL = new URL("./fixtures/lcov/branch-cases.json", import.meta.url);

function loadCatalog(): BranchFixtureCatalog {
  return JSON.parse(readFileSync(FIXTURE_CATALOG_URL, "utf8")) as BranchFixtureCatalog;
}

describe("T101 LCOV branch parser contracts", () => {
  it("matches every deterministic branch fixture exactly", () => {
    const catalog = loadCatalog();

    expect(catalog.version).toBe(1);
    for (const fixture of catalog.cases) {
      expect(normalizeLcovBranchCoverage(fixture.input, fixture.repoRoot), fixture.id).toEqual(
        fixture.expected,
      );
    }
  });

  it("uses the canonical BRANCH_* state domain for normalized observations", () => {
    const input = [
      "SF:/repo/src/states.ts",
      "BRDA:10,0,0,2",
      "BRDA:10,0,1,0",
      "BRDA:10,0,2,-",
      "end_of_record",
    ].join("\n");

    expect(normalizeLcovBranchCoverage(input, "/repo")).toEqual({
      outcome: "resolved",
      observations: [
        {
          path: "src/states.ts",
          line: 10,
          block_id: "0",
          branch_id: "0",
          taken: 2,
          state: "BRANCH_EXERCISED",
        },
        {
          path: "src/states.ts",
          line: 10,
          block_id: "0",
          branch_id: "1",
          taken: 0,
          state: "BRANCH_NOT_EXERCISED",
        },
        {
          path: "src/states.ts",
          line: 10,
          block_id: "0",
          branch_id: "2",
          taken: null,
          state: "BRANCH_UNRESOLVED",
          reason: "LCOV branch taken count is unknown",
        },
      ],
    });
  });

  it("parses exact BRDA four-field records with repository-safe SF mapping", () => {
    const input = [
      "SF:/repo/src/choice.ts",
      "BRDA:10,0,0,1",
      "BRDA:10,0,1,0",
      "end_of_record",
    ].join("\n");

    expect(normalizeLcovBranchCoverage(input, "/repo")).toEqual({
      outcome: "resolved",
      observations: [
        {
          path: "src/choice.ts",
          line: 10,
          block_id: "0",
          branch_id: "0",
          taken: 1,
          state: "BRANCH_EXERCISED",
        },
        {
          path: "src/choice.ts",
          line: 10,
          block_id: "0",
          branch_id: "1",
          taken: 0,
          state: "BRANCH_NOT_EXERCISED",
        },
      ],
    });
  });

  it("keeps an unknown taken observation unresolved even after later numeric evidence", () => {
    const input = [
      "SF:/repo/src/sticky.ts",
      "BRDA:5,block,branch,-",
      "end_of_record",
      "SF:/repo/src/sticky.ts",
      "BRDA:5,block,branch,1",
      "end_of_record",
    ].join("\n");

    expect(normalizeLcovBranchCoverage(input, "/repo")).toEqual({
      outcome: "resolved",
      observations: [
        {
          path: "src/sticky.ts",
          line: 5,
          block_id: "block",
          branch_id: "branch",
          taken: null,
          state: "BRANCH_UNRESOLVED",
          reason: "LCOV branch taken count is unknown",
        },
      ],
    });
  });

  it("aggregates repeated numeric observations for the same tuple identity by safe addition", () => {
    const input = [
      "SF:/repo/src/repeat.ts",
      "BRDA:3,block,branch,2",
      "end_of_record",
      "SF:/repo/src/repeat.ts",
      "BRDA:3,block,branch,3",
      "end_of_record",
    ].join("\n");

    expect(normalizeLcovBranchCoverage(input, "/repo")).toEqual({
      outcome: "resolved",
      observations: [
        {
          path: "src/repeat.ts",
          line: 3,
          block_id: "block",
          branch_id: "branch",
          taken: 5,
          state: "BRANCH_EXERCISED",
        },
      ],
    });
  });

  it("orders branch observations by path, line, block_id, branch_id using stable code-unit order", () => {
    const input = [
      "SF:/repo/src/z.ts",
      "BRDA:2,a,1,1",
      "BRDA:1,ä,0,1",
      "BRDA:1,z,1,1",
      "BRDA:1,z,0,1",
      "end_of_record",
      "SF:/repo/src/a.ts",
      "BRDA:9,0,0,1",
      "end_of_record",
    ].join("\n");

    const result = normalizeLcovBranchCoverage(input, "/repo");
    expect(result.outcome).toBe("resolved");
    if (result.outcome !== "resolved") throw new Error(result.reason);
    expect(result.observations.map(({ path, line, block_id, branch_id }) => [path, line, block_id, branch_id])).toEqual([
      ["src/a.ts", 9, "0", "0"],
      ["src/z.ts", 1, "z", "0"],
      ["src/z.ts", 1, "z", "1"],
      ["src/z.ts", 1, "ä", "0"],
      ["src/z.ts", 2, "a", "1"],
    ]);
  });

  it("fails closed when BRDA structure or source-record structure is malformed", () => {
    const cases = [
      ["BRDA:1,0,0,1\n", "LCOV branch record is malformed"],
      ["end_of_record\n", "LCOV source record is malformed"],
      ["SF:/repo/src/a.ts\nBRDA:1,0,0,1\nSF:/repo/src/b.ts\n", "LCOV source record is incomplete"],
      ["SF:/repo/src/a.ts\nBRDA:1,0,0\nend_of_record\n", "LCOV branch record is malformed"],
      ["SF:/repo/src/a.ts\nBRDA:1,,0,1\nend_of_record\n", "LCOV branch record is malformed"],
      ["SF:/repo/src/a.ts\nBRDA:1,0,,1\nend_of_record\n", "LCOV branch record is malformed"],
    ] as const;

    for (const [input, reason] of cases) {
      expect(normalizeLcovBranchCoverage(input, "/repo")).toEqual({
        outcome: "unresolved",
        observations: null,
        reason,
      });
    }
  });

  it("rejects invalid taken tokens instead of coercing them", () => {
    for (const taken of ["-1", "1.5", "NaN", "9007199254740992"]) {
      expect(
        normalizeLcovBranchCoverage(
          `SF:/repo/src/taken.ts\nBRDA:1,0,0,${taken}\nend_of_record\n`,
          "/repo",
        ),
        taken,
      ).toEqual({
        outcome: "unresolved",
        observations: null,
        reason: "LCOV branch taken count is invalid",
      });
    }
  });

  it("fails closed when repeated valid branch counts overflow the safe integer range", () => {
    const input = [
      "SF:/repo/src/overflow.ts",
      `BRDA:1,0,0,${Number.MAX_SAFE_INTEGER}`,
      "end_of_record",
      "SF:/repo/src/overflow.ts",
      "BRDA:1,0,0,1",
      "end_of_record",
    ].join("\n");

    expect(normalizeLcovBranchCoverage(input, "/repo")).toEqual({
      outcome: "unresolved",
      observations: null,
      reason: "LCOV branch taken count is invalid",
    });
  });

  it("maps transient Windows absolute source paths without persisting host separators", () => {
    const input = [
      "SF:C:\\repo\\src\\windows.ts",
      "BRDA:3,0,0,1",
      "end_of_record",
    ].join("\n");

    expect(normalizeLcovBranchCoverage(input, "C:\\repo")).toEqual({
      outcome: "resolved",
      observations: [
        {
          path: "src/windows.ts",
          line: 3,
          block_id: "0",
          branch_id: "0",
          taken: 1,
          state: "BRANCH_EXERCISED",
        },
      ],
    });
  });

  it("fails closed on repository traversal, outside absolute paths, or URI-like source paths", () => {
    for (const sourcePath of [
      "../outside.ts",
      "/outside/src/a.ts",
      "file:src/a.ts",
      "https://example.test/a.ts",
    ]) {
      expect(
        normalizeLcovBranchCoverage(`SF:${sourcePath}\nBRDA:1,0,0,1\nend_of_record\n`, "/repo"),
        sourcePath,
      ).toEqual({
        outcome: "unresolved",
        observations: null,
        reason: "source path cannot be mapped inside the repository",
      });
    }
  });

  it("does not invent branch evidence when LCOV has no usable BRDA records", () => {
    expect(
      normalizeLcovBranchCoverage("SF:/repo/src/line-only.ts\nDA:1,1\nend_of_record\n", "/repo"),
    ).toEqual({
      outcome: "unresolved",
      observations: null,
      reason: "no usable branch coverage records",
    });
  });

  it("leaves existing line parsing behavior unchanged when branch records are present", () => {
    const input = [
      "SF:/repo/src/mixed.ts",
      "DA:3,8",
      "DA:6,4",
      "BRDA:6,0,0,1",
      "BRDA:6,0,1,0",
      "end_of_record",
    ].join("\n");

    expect(normalizeLcovLineCoverage(input, "/repo")).toEqual({
      outcome: "resolved",
      points: [
        { path: "src/mixed.ts", line: 3, count: 8, instrumented: true },
        { path: "src/mixed.ts", line: 6, count: 4, instrumented: true },
      ],
    });
  });
});
