import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { normalizeLcovLineCoverage, type LcovLineCoverageResult } from "../src/coverage/lcov.js";

type LcovFixtureCase = {
  readonly id: string;
  readonly repoRoot: string;
  readonly input: string;
  readonly expected: LcovLineCoverageResult;
};

type LcovFixtureCatalog = {
  readonly version: 1;
  readonly cases: readonly LcovFixtureCase[];
};

const FIXTURE_CATALOG_URL = new URL("./fixtures/lcov/cases.json", import.meta.url);

function loadCatalog(): LcovFixtureCatalog {
  return JSON.parse(readFileSync(FIXTURE_CATALOG_URL, "utf8")) as LcovFixtureCatalog;
}

describe("T050 strict line-only LCOV normalization", () => {
  it("matches every canonical T044 fixture exactly", () => {
    const catalog = loadCatalog();

    for (const fixture of catalog.cases) {
      expect(normalizeLcovLineCoverage(fixture.input, fixture.repoRoot), fixture.id).toEqual(fixture.expected);
    }
  });

  it("sorts normalized points deterministically by repository path and line", () => {
    const input = [
      "SF:/repo/src/z.ts",
      "DA:9,1",
      "DA:2,3",
      "end_of_record",
      "SF:/repo/src/a.ts",
      "DA:7,4",
      "end_of_record",
      "",
    ].join("\n");

    expect(normalizeLcovLineCoverage(input, "/repo")).toEqual({
      outcome: "resolved",
      points: [
        { path: "src/a.ts", line: 7, count: 4, instrumented: true },
        { path: "src/z.ts", line: 2, count: 3, instrumented: true },
        { path: "src/z.ts", line: 9, count: 1, instrumented: true },
      ],
    });
  });

  it("fails closed on repository-relative source traversal or URI-like source paths", () => {
    for (const sourcePath of ["../outside.ts", "file:src/a.ts", "https://example.test/a.ts"]) {
      expect(normalizeLcovLineCoverage(`SF:${sourcePath}\nDA:1,1\nend_of_record\n`, "/repo")).toEqual({
        outcome: "unresolved",
        count: null,
        reason: "source path cannot be mapped inside the repository",
      });
    }
  });

  it("maps transient Windows absolute source paths without persisting host separators", () => {
    expect(
      normalizeLcovLineCoverage(
        "SF:C:\\repo\\src\\windows.ts\nDA:3,2\nend_of_record\n",
        "C:\\repo",
      ),
    ).toEqual({
      outcome: "resolved",
      points: [{ path: "src/windows.ts", line: 3, count: 2, instrumented: true }],
    });
  });

  it("accepts decimal line tokens with leading zeros and a non-empty optional checksum", () => {
    expect(normalizeLcovLineCoverage("SF:/repo/src/checksum.ts\nDA:004,2,abc123\nend_of_record\n", "/repo")).toEqual({
      outcome: "resolved",
      points: [{ path: "src/checksum.ts", line: 4, count: 2, instrumented: true }],
    });
  });

  it("fails closed when any completed source record lacks usable DA line data", () => {
    const input = [
      "SF:/repo/src/covered.ts",
      "DA:1,1",
      "end_of_record",
      "SF:/repo/src/ambiguous.ts",
      "FN:2,work",
      "FNDA:1,work",
      "end_of_record",
      "",
    ].join("\n");

    expect(normalizeLcovLineCoverage(input, "/repo")).toEqual({
      outcome: "unresolved",
      count: null,
      reason: "no usable line coverage records",
    });
  });

  it("fails closed on an empty optional checksum instead of repairing malformed DA input", () => {
    expect(normalizeLcovLineCoverage("SF:/repo/src/checksum.ts\nDA:4,2,\nend_of_record\n", "/repo")).toEqual({
      outcome: "unresolved",
      count: null,
      reason: "LCOV line record is malformed",
    });
  });

  it("fails closed when repeated counts overflow the safe integer range", () => {
    const input = [
      "SF:/repo/src/overflow.ts",
      `DA:1,${Number.MAX_SAFE_INTEGER}`,
      "end_of_record",
      "SF:/repo/src/overflow.ts",
      "DA:1,1",
      "end_of_record",
      "",
    ].join("\n");

    expect(normalizeLcovLineCoverage(input, "/repo")).toEqual({
      outcome: "unresolved",
      count: null,
      reason: "LCOV execution count is invalid",
    });
  });
});
