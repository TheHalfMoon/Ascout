import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { normalizeLcovBranchCoverage } from "../benchmarks/branch-coverage-lib.mjs";

type BranchFixtureCase = {
  readonly id: string;
  readonly repoRoot: string;
  readonly input: string;
  readonly expected: unknown;
};

type BranchFixtureCatalog = {
  readonly version: 1;
  readonly cases: readonly BranchFixtureCase[];
};

const FIXTURE_CATALOG_URL = new URL("../benchmarks/fixtures/branch-exercise/cases.json", import.meta.url);

function loadCatalog(): BranchFixtureCatalog {
  return JSON.parse(readFileSync(FIXTURE_CATALOG_URL, "utf8")) as BranchFixtureCatalog;
}

describe("T093 benchmark-only LCOV branch normalization", () => {
  it("matches every deterministic qualification fixture exactly", () => {
    const catalog = loadCatalog();

    expect(catalog.version).toBe(1);
    for (const fixture of catalog.cases) {
      expect(normalizeLcovBranchCoverage(fixture.input, fixture.repoRoot), fixture.id).toEqual(fixture.expected);
    }
  });

  it("fails closed when BRDA appears outside a source record", () => {
    expect(normalizeLcovBranchCoverage("BRDA:1,0,0,1\n", "/repo")).toEqual({
      outcome: "unresolved",
      observations: null,
      reason: "LCOV branch record is malformed",
    });
  });

  it("fails closed when a second SF record begins before the first ends", () => {
    const input = "SF:/repo/src/a.ts\nBRDA:1,0,0,1\nSF:/repo/src/b.ts\nBRDA:2,0,0,1\nend_of_record\n";
    expect(normalizeLcovBranchCoverage(input, "/repo")).toEqual({
      outcome: "unresolved",
      observations: null,
      reason: "LCOV source record is incomplete",
    });
  });

  it("does not invent branch evidence when an LCOV input has no usable BRDA records", () => {
    expect(normalizeLcovBranchCoverage("SF:/repo/src/line-only.ts\nDA:1,1\nend_of_record\n", "/repo")).toEqual({
      outcome: "unresolved",
      observations: null,
      reason: "no usable branch coverage records",
    });
  });

  it("rejects invalid taken tokens instead of coercing them", () => {
    for (const taken of ["-1", "1.5", "NaN", "9007199254740992"]) {
      expect(
        normalizeLcovBranchCoverage(`SF:/repo/src/taken.ts\nBRDA:1,0,0,${taken}\nend_of_record\n`, "/repo"),
        taken,
      ).toEqual({
        outcome: "unresolved",
        observations: null,
        reason: "LCOV branch taken count is invalid",
      });
    }
  });

  it("treats block and branch identifiers as opaque non-empty lexical tokens", () => {
    expect(
      normalizeLcovBranchCoverage(
        "SF:/repo/src/opaque.ts\nBRDA:1,10,z,1\nBRDA:1,2,a,1\nend_of_record\n",
        "/repo",
      ),
    ).toEqual({
      outcome: "resolved",
      observations: [
        { path: "src/opaque.ts", line: 1, block_id: "10", branch_id: "z", taken: 1, state: "BRANCH_EXERCISED" },
        { path: "src/opaque.ts", line: 1, block_id: "2", branch_id: "a", taken: 1, state: "BRANCH_EXERCISED" },
      ],
    });
  });

  it("orders opaque Unicode identifiers by deterministic UTF-16 code units instead of locale collation", () => {
    expect(
      normalizeLcovBranchCoverage(
        "SF:/repo/src/unicode.ts\nBRDA:1,ä,0,1\nBRDA:1,z,0,1\nend_of_record\n",
        "/repo",
      ),
    ).toEqual({
      outcome: "resolved",
      observations: [
        { path: "src/unicode.ts", line: 1, block_id: "z", branch_id: "0", taken: 1, state: "BRANCH_EXERCISED" },
        { path: "src/unicode.ts", line: 1, block_id: "ä", branch_id: "0", taken: 1, state: "BRANCH_EXERCISED" },
      ],
    });
  });

  it("rejects empty block or branch identifiers", () => {
    for (const record of ["BRDA:1,,0,1", "BRDA:1,0,,1"]) {
      expect(normalizeLcovBranchCoverage(`SF:/repo/src/empty.ts\n${record}\nend_of_record\n`, "/repo")).toEqual({
        outcome: "unresolved",
        observations: null,
        reason: "LCOV branch record is malformed",
      });
    }
  });
});
