import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  evaluateBranchExerciseCase,
  evaluateBranchExerciseCatalog,
  serializeBranchExerciseQualification,
} from "../benchmarks/branch-exercise-qualification.mjs";

type QualificationFixture = {
  readonly id: string;
  readonly purpose: string;
  readonly repoRoot: string;
  readonly input: string;
  readonly expected: unknown;
  readonly qualification: {
    readonly changedRanges: readonly { readonly path: string; readonly start: number; readonly end: number }[];
    readonly lineConclusion: "LINE_EXERCISED" | "LINE_NOT_EXERCISED" | "LINE_UNRESOLVED";
    readonly expectedOutcome: "BRANCH_ONLY_GAP" | "NO_BRANCH_ONLY_GAP" | "UNRESOLVED" | "FAIL_CLOSED";
    readonly expectedBranchOnlyGap: boolean;
  };
};

type QualificationCatalog = {
  readonly version: 1;
  readonly cases: readonly QualificationFixture[];
};

const FIXTURE_CATALOG_URL = new URL("../benchmarks/fixtures/branch-exercise/cases.json", import.meta.url);

function loadCatalog(): QualificationCatalog {
  return JSON.parse(readFileSync(FIXTURE_CATALOG_URL, "utf8")) as QualificationCatalog;
}

describe("T094 line-vs-branch qualification", () => {
  it("matches the declared qualification outcome for every fixture", () => {
    const catalog = loadCatalog();

    for (const fixture of catalog.cases) {
      const result = evaluateBranchExerciseCase(fixture);
      expect(result.outcome, fixture.id).toBe(fixture.qualification.expectedOutcome);
      expect(result.branch_only_gap, fixture.id).toBe(fixture.qualification.expectedBranchOnlyGap);
      expect(result.line_conclusion, fixture.id).toBe(fixture.qualification.lineConclusion);
    }
  });

  it("identifies a branch-only gap only when the declared changed line is exercised", () => {
    const fixture = loadCatalog().cases.find((entry) => entry.id === "branch-only-gap-shape");
    expect(fixture).toBeDefined();

    const exercised = evaluateBranchExerciseCase(fixture!);
    expect(exercised.outcome).toBe("BRANCH_ONLY_GAP");
    expect(exercised.branch_only_gap).toBe(true);

    const lineNotExercised = evaluateBranchExerciseCase({
      ...fixture!,
      id: "line-not-exercised-control",
      qualification: { ...fixture!.qualification, lineConclusion: "LINE_NOT_EXERCISED" },
    });
    expect(lineNotExercised.outcome).toBe("NO_BRANCH_ONLY_GAP");
    expect(lineNotExercised.branch_only_gap).toBe(false);
  });

  it("produces no false gap for the fully-exercised control", () => {
    const fixture = loadCatalog().cases.find((entry) => entry.id === "fully-exercised-shape");
    expect(fixture).toBeDefined();
    expect(evaluateBranchExerciseCase(fixture!)).toMatchObject({
      outcome: "NO_BRANCH_ONLY_GAP",
      branch_only_gap: false,
    });
  });

  it("keeps unknown changed branch evidence unresolved", () => {
    const fixture = loadCatalog().cases.find((entry) => entry.id === "unknown-remains-unresolved");
    expect(fixture).toBeDefined();
    expect(evaluateBranchExerciseCase(fixture!)).toMatchObject({
      outcome: "UNRESOLVED",
      branch_only_gap: false,
      reason: "changed branch evidence is unresolved",
    });
  });

  it("does not count a not-exercised branch outside the declared changed ranges", () => {
    const fixture = loadCatalog().cases.find((entry) => entry.id === "deterministic-tuple-order");
    expect(fixture).toBeDefined();

    const result = evaluateBranchExerciseCase(fixture!);
    expect(result.outcome).toBe("NO_BRANCH_ONLY_GAP");
    expect(result.branch_only_gap).toBe(false);
    expect(result.changed_branch_observations).toHaveLength(2);
    expect(result.ignored_branch_observations).toContainEqual({
      path: "src/z.ts",
      line: 9,
      block_id: "2",
      branch_id: "b",
      taken: 0,
      state: "BRANCH_NOT_EXERCISED",
    });
  });

  it("fails closed for malformed and repository-unmappable controls", () => {
    const catalog = loadCatalog();
    for (const id of ["malformed-branch-record", "outside-repository-source"]) {
      const fixture = catalog.cases.find((entry) => entry.id === id);
      expect(fixture).toBeDefined();
      expect(evaluateBranchExerciseCase(fixture!)).toMatchObject({
        outcome: "FAIL_CLOSED",
        branch_only_gap: false,
      });
    }
  });

  it("orders cases and serializes semantic output deterministically", () => {
    const catalog = loadCatalog();
    const forward = evaluateBranchExerciseCatalog(catalog);
    const reversed = evaluateBranchExerciseCatalog({ ...catalog, cases: [...catalog.cases].reverse() });

    expect(reversed).toEqual(forward);
    expect(serializeBranchExerciseQualification(reversed)).toBe(
      serializeBranchExerciseQualification(forward),
    );

    const ids = forward.cases.map((entry) => entry.case_id);
    expect(ids).toEqual([...ids].sort((left, right) => (left === right ? 0 : left < right ? -1 : 1)));
  });

  it("rejects invalid changed ranges and duplicate case identities", () => {
    const fixture = loadCatalog().cases[0]!;

    expect(() =>
      evaluateBranchExerciseCase({
        ...fixture,
        qualification: {
          ...fixture.qualification,
          changedRanges: [{ path: "../escape.ts", start: 1, end: 1 }],
        },
      }),
    ).toThrow("qualification changed range is invalid");

    expect(() =>
      evaluateBranchExerciseCatalog({
        version: 1,
        cases: [fixture, { ...fixture }],
      }),
    ).toThrow("qualification case id is duplicated");
  });
});
