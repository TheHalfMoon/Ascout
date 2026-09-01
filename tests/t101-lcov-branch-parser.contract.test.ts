import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  LcovBranchCoverageResult,
  normalizeLcovBranchCoverage,
  type LcovBranchPoint,
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

  it("parses BRDA four-field records with repository-safe SF mapping", () => {
    const input = [
      "SF:/repo/src/choice.ts",
      "BRDA:10,0,0,1",
      "BRDA:10,0,1,0",
      "end_of_record",
    ].join("\n");

    expect(normalizeLcovBranchCoverage(input, "/repo")).toEqual({
      outcome: "resolved",
      observations: [
        { path: "src/choice.ts", line: 10, block_id: "0", branch_id: "0", taken: 1, state: "EXERCISED" },
        { path: "src/choice.ts", line: 10, block_id: "0", branch_id: "1", taken: 0, state: "NOT_EXERCISED" },
      ],
    });
  });

  it("interprets unknown taken token '-' as unresolved branch", () => {
    const input = [
      "SF:/repo/src/unknown.ts",
      "BRDA:4,b,0,-",
      "end_of_record",
    ].join("\n");

    const result = normalizeLcovBranchCoverage(input, "/repo");
    expect(result).toEqual({
      outcome: "resolved",
      observations: [
        {
          path: "src/unknown.ts",
          line: 4,
          block_id: "b",
          branch_id: "0",
          taken: null,
          state: "UNRESOLVED",
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
          state: "EXERCISED",
        },
      ],
    });
  });

  it("keeps an unresolved observation unresolved even after a later numeric observation for the same identity", () => {
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
          state: "UNRESOLVED",
          reason: "LCOV branch taken count is unknown",
        },
      ],
    });
  });

  it("orders branch observations deterministically by path, line, block_id, branch_id", () => {
    const input = [
      "SF:/repo/src/z.ts",
      "BRDA:1,ä,0,1",
      "BRDA:1,z,0,1",
      "end_of_record",
    ].join("\n");

    expect(normalizeLcovBranchCoverage(input, "/repo")).toEqual({
      outcome: "resolved",
      observations: [
        { path: "src/z.ts", line: 1, block_id: "z", branch_id: "0", taken: 1, state: "EXERCISED" },
        { path: "src/z.ts", line: 1, block_id: "ä", branch_id: "0", taken: 1, state: "EXERCISED" },
      ],
    });
  });

  it("fails closed when a BRDA record appears outside an open source record", () => {
    expect(normalizeLcovBranchCoverage("BRDA:1,0,0,1\n", "/repo")).toEqual({
      outcome: "unresolved",
      count: null,
      observations: null,
      reason: "LCOV branch record is malformed",
    });
  });

  it("fails closed when end_of_record appears without an open source record", () => {
    expect(
      normalizeLcovBranchCoverage(
        "end_of_record\nSF:/repo/src/later.ts\nBRDA:1,0,0,1\nend_of_record\n",
        "/repo",
      ),
    ).toEqual({
      outcome: "unresolved",
      count: null,
      observations: null,
      reason: "LCOV source record is malformed",
    });
  });

  it("fails closed when a second SF record begins before the first ends", () => {
    const input = "SF:/repo/src/a.ts\nBRDA:1,0,0,1\nSF:/repo/src/b.ts\nBRDA:2,0,0,1\nend_of_record\n";
    expect(normalizeLcovBranchCoverage(input, "/repo")).toEqual({
      outcome: "unresolved",
      count: null,
      observations: null,
      reason: "LCOV source record is incomplete",
    });
  });

  it("rejects invalid taken tokens instead of coercing them", () => {
    for (const taken of ["-1", "1.5", "NaN", "9007199254740992"]) {
      expect(
        normalizeLcovBranchCoverage(`SF:/repo/src/taken.ts\nBRDA:1,0,0,${taken}\nend_of_record\n`, "/repo"),
        taken,
      ).toEqual({
        outcome: "unresolved",
        count: null,
        observations: null,
        reason: "LCOV branch taken count is invalid",
      });
    }
  });

  it("rejects empty block or branch identifiers", () => {
    for (const record of ["BRDA:1,,0,1", "BRDA:1,0,,1"]) {
      expect(
        normalizeLcovBranchCoverage(`SF:/repo/src/empty.ts\n${record}\nend_of_record\n`, "/repo"),
      ).toEqual({
        outcome: "unresolved",
        count: null,
        observations: null,
        reason: "LCOV branch record is malformed",
      });
    }
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
        { path: "src/windows.ts", line: 3, block_id: "0", branch_id: "0", taken: 1, state: "EXERCISED" },
      ],
    });
  });

  it("fails closed on repository-relative source traversal or URI-like source paths", () => {
    for (const sourcePath of ["../outside.ts", "file:src/a.ts", "https://example.test/a.ts"]) {
      expect(
        normalizeLcovBranchCoverage(`SF:${sourcePath}\nBRDA:1,0,0,1\nend_of_record\n`, "/repo"),
      ).toEqual({
        outcome: "unresolved",
        count: null,
        observations: null,
        reason: "source path cannot be mapped inside the repository",
      });
    }
  });

  it("fails closed when repeated branch counts overflow the safe integer range", () => {
    const input = [
      "SF:/repo/src/overflow.ts",
      `BRDA:1,0,0,${Number.MAX_SAFE_INTEGER}`,
      "end_of_record",
      "SF:/repo/src/overflow.ts",
      "BRDA:1,0,0,1",
      "end_of_record",
      "",
    ].join("\n");

    expect(normalizeLcovBranchCoverage(input, "/repo")).toEqual({
      outcome: "unresolved",
      count: null,
      observations: null,
      reason: "LCOV branch taken count is invalid",
    });
  });

  it("does not invent branch evidence when an LCOV input has no usable BRDA records", () => {
    expect(
      normalizeLcovBranchCoverage("SF:/repo/src/line-only.ts\nDA:1,1\nend_of_record\n", "/repo"),
    ).toEqual({
      outcome: "unresolved",
      count: null,
      observations: null,
      reason: "no usable branch coverage records",
    });
  });

  it("does not alter existing line parsing behavior when branch records are present", () => {
    const input = [
      "SF:/repo/src/mixed.ts",
      "DA:3,8",
      "DA:6,4",
      "BRDA:6,0,0,1",
      "BRDA:6,0,1,0",
      "end_of_record",
    ].join("\n");

    const lineResult = normalizeLcovLineCoverage(input, "/repo");
    expect(lineResult).toEqual({
      outcome: "resolved",
      points: [
        { path: "src/mixed.ts", line: 3, count: 8, instrumented: true },
        { path: "src/mixed.ts", line: 6, count: 4, instrumented: true },
      ],
    });
  });
});
