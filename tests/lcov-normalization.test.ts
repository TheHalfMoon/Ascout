import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { normalizeLcovLineCoverage, normalizeLcovBranchCoverage } from "../src/coverage/lcov.js";
import { buildChangedBranchExercise } from "../src/exercise.js";
import type { GitChangedFile } from "../src/git.js";
import type { LcovBranchCoverageResult } from "../src/coverage/lcov.js";

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

describe("T101 strict branch-only LCOV normalization", () => {
  it("resolves branch records into normalized observations", () => {
    const input = [
      "SF:/repo/src/branch.ts",
      "BRDA:1,0,0,1",
      "BRDA:1,1,0,0",
      "end_of_record",
      "",
    ].join("\n");

    expect(normalizeLcovBranchCoverage(input, "/repo")).toEqual({
      outcome: "resolved",
      observations: [
        { path: "src/branch.ts", line: 1, block_id: "0", branch_id: "0", taken: 1, state: "BRANCH_EXERCISED" },
        { path: "src/branch.ts", line: 1, block_id: "1", branch_id: "0", taken: 0, state: "BRANCH_NOT_EXERCISED" },
      ],
    });
  });

  it("accumulates repeated branch records into additive taken counts", () => {
    const input = [
      "SF:/repo/src/branch.ts",
      "BRDA:1,0,0,1",
      "BRDA:1,0,0,2",
      "end_of_record",
      "",
    ].join("\n");

    expect(normalizeLcovBranchCoverage(input, "/repo")).toEqual({
      outcome: "resolved",
      observations: [
        { path: "src/branch.ts", line: 1, block_id: "0", branch_id: "0", taken: 3, state: "BRANCH_EXERCISED" },
      ],
    });
  });

  it("marks unresolved branch records with null taken and reason", () => {
    expect(normalizeLcovBranchCoverage("SF:/repo/src/branch.ts\nBRDA:1,0,0,-\nend_of_record\n", "/repo")).toEqual({
      outcome: "resolved",
      observations: [
        { path: "src/branch.ts", line: 1, block_id: "0", branch_id: "0", taken: null, state: "BRANCH_UNRESOLVED", reason: "LCOV branch taken count is unknown" },
      ],
    });
  });

  it("preserves line normalization behavior alongside branch normalization", () => {
    const input = [
      "SF:/repo/src/mixed.ts",
      "DA:3,1",
      "BRDA:4,0,0,1",
      "end_of_record",
      "",
    ].join("\n");

    expect(normalizeLcovLineCoverage(input, "/repo")).toEqual({
      outcome: "resolved",
      points: [{ path: "src/mixed.ts", line: 3, count: 1, instrumented: true }],
    });

    expect(normalizeLcovBranchCoverage(input, "/repo")).toEqual({
      outcome: "resolved",
      observations: [
        { path: "src/mixed.ts", line: 4, block_id: "0", branch_id: "0", taken: 1, state: "BRANCH_EXERCISED" },
      ],
    });
  });
});

describe("T102 branch exercise builder", () => {
  const changed: GitChangedFile = {
    path: "src/app.ts",
    change_kind: "modified",
    line_semantics: "text",
    changed_new_line_ranges: [
      [10, 12],
      [20, 22],
    ],
  };

  it("builds exercised/not-exercised records from intersecting branch observations", () => {
    const observations: LcovBranchPoint[] = [
      { path: "src/app.ts", line: 10, block_id: "0", branch_id: "0", taken: 1, state: "BRANCH_EXERCISED" },
      { path: "src/app.ts", line: 20, block_id: "0", branch_id: "0", taken: 0, state: "BRANCH_NOT_EXERCISED" },
    ];

    const exercise = buildChangedBranchExercise([changed], observations, "t055");
    expect(exercise).toEqual({
      changed_executable_lines: 2,
      exercised_lines: 1,
      not_exercised_lines: 1,
      unresolved_lines: 0,
      changed_files_with_zero_exercised_lines: 0,
      branch_not_exercised_lines: 1,
      records: [
        { path: "src/app.ts", line: 10, state: "EXERCISED", execution_count: 1, source_task_ids: ["t055"], branch: true },
        { path: "src/app.ts", line: 20, state: "NOT_EXERCISED", execution_count: 0, source_task_ids: ["t055"], branch: true },
      ],
    });
  });

  it("produces branch-only unresolved records when observations are outside changed ranges", () => {
    const observations: LcovBranchPoint[] = [
      { path: "src/app.ts", line: 5, block_id: "0", branch_id: "0", taken: 1, state: "BRANCH_EXERCISED" },
    ];

    const exercise = buildChangedBranchExercise([changed], observations, "t055");
    expect(exercise.records).toHaveLength(6);
    expect(exercise.records.every((record) => record.state === "UNRESOLVED")).toBe(true);
  });

  it("preserves unchanged line exercise behavior for unchanged files", () => {
    const observations: LcovBranchPoint[] = [
      { path: "src/other.ts", line: 1, block_id: "0", branch_id: "0", taken: 1, state: "BRANCH_EXERCISED" },
    ];

    const exercise = buildChangedBranchExercise([changed], observations, "t055");
    expect(exercise.changed_executable_lines).toBe(6);
    expect(exercise.exercised_lines).toBe(0);
  });
});
