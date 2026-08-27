import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

type ResolvedPoint = {
  readonly path: string;
  readonly line: number;
  readonly count: number;
  readonly instrumented: true;
};

type ResolvedExpectation = {
  readonly outcome: "resolved";
  readonly points: readonly ResolvedPoint[];
};

type UnresolvedExpectation = {
  readonly outcome: "unresolved";
  readonly count: null;
  readonly reason: string;
};

type LcovExpectation = ResolvedExpectation | UnresolvedExpectation;

type LcovFixtureCase = {
  readonly id: string;
  readonly purpose: string;
  readonly repoRoot: string;
  readonly input: string;
  readonly expected: LcovExpectation;
};

type LcovFixtureCatalog = {
  readonly version: 1;
  readonly cases: readonly LcovFixtureCase[];
};

type DaEntry = {
  readonly line: number;
  readonly count: number;
};

const FIXTURE_CATALOG_URL = new URL("./fixtures/lcov/cases.json", import.meta.url);

function loadCatalog(): LcovFixtureCatalog {
  return JSON.parse(readFileSync(FIXTURE_CATALOG_URL, "utf8")) as LcovFixtureCatalog;
}

function fixtureById(catalog: LcovFixtureCatalog, id: string): LcovFixtureCase {
  const fixture = catalog.cases.find((candidate) => candidate.id === id);
  expect(fixture, `missing LCOV fixture ${id}`).toBeDefined();
  return fixture!;
}

function parseWellFormedDaEntries(input: string): readonly DaEntry[] {
  return input
    .split(/\r?\n/)
    .map((line): DaEntry | null => {
      const match = /^DA:(\d+),(-?\d+)(?:,[^,\r\n]+)?$/.exec(line);
      if (match === null) {
        return null;
      }
      return {
        line: Number.parseInt(match[1]!, 10),
        count: Number.parseInt(match[2]!, 10),
      };
    })
    .filter((entry): entry is DaEntry => entry !== null);
}

function expectCanonicalRepositoryPath(path: string): void {
  expect(path.length).toBeGreaterThan(0);
  expect(path.startsWith("/")).toBe(false);
  expect(path).not.toMatch(/^[A-Za-z]:/);
  expect(path).not.toContain("\\");
  expect(path).not.toContain("//");
  expect(path.endsWith("/")).toBe(false);
  expect(path.split("/")).not.toContain(".");
  expect(path.split("/")).not.toContain("..");
}

describe("T044 LCOV fixture contract", () => {
  it("uses a versioned, unique, self-describing tests-first catalog", () => {
    const catalog = loadCatalog();

    expect(catalog.version).toBe(1);
    expect(catalog.cases.length).toBeGreaterThanOrEqual(10);

    const ids = catalog.cases.map((fixture) => fixture.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const fixture of catalog.cases) {
      expect(fixture.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(fixture.purpose.length).toBeGreaterThan(0);
      expect(fixture.repoRoot.startsWith("/")).toBe(true);
      expect(fixture.input.length).toBeGreaterThan(0);
    }
  });

  it("locks zero and positive DA counts without turning coverage into correctness", () => {
    const catalog = loadCatalog();
    const zero = fixtureById(catalog, "zero-count");
    const hit = fixtureById(catalog, "nonzero-count");

    expect(zero.expected).toEqual({
      outcome: "resolved",
      points: [{ path: "src/zero.ts", line: 4, count: 0, instrumented: true }],
    });
    expect(hit.expected).toEqual({
      outcome: "resolved",
      points: [{ path: "src/hit.ts", line: 8, count: 3, instrumented: true }],
    });

    expect(parseWellFormedDaEntries(zero.input)).toEqual([{ line: 4, count: 0 }]);
    expect(parseWellFormedDaEntries(hit.input)).toEqual([{ line: 8, count: 3 }]);
  });

  it("locks repeated matching DA records to additive execution counts", () => {
    const catalog = loadCatalog();
    const repeated = fixtureById(catalog, "repeated-line-across-records");
    const mixed = fixtureById(catalog, "repeated-hit-then-zero");

    const repeatedEntries = parseWellFormedDaEntries(repeated.input).filter((entry) => entry.line === 7);
    expect(repeatedEntries).toEqual([
      { line: 7, count: 2 },
      { line: 7, count: 3 },
    ]);
    expect(repeatedEntries.reduce((sum, entry) => sum + entry.count, 0)).toBe(5);
    expect(repeated.expected).toEqual({
      outcome: "resolved",
      points: [{ path: "src/repeated.ts", line: 7, count: 5, instrumented: true }],
    });

    const mixedEntries = parseWellFormedDaEntries(mixed.input).filter((entry) => entry.line === 11);
    expect(mixedEntries.reduce((sum, entry) => sum + entry.count, 0)).toBe(4);
    expect(mixed.expected).toEqual({
      outcome: "resolved",
      points: [{ path: "src/mixed.ts", line: 11, count: 4, instrumented: true }],
    });
  });

  it("requires resolved coverage points to be instrumented, nonnegative, and repository-relative", () => {
    const catalog = loadCatalog();

    for (const fixture of catalog.cases) {
      if (fixture.expected.outcome !== "resolved") {
        continue;
      }
      expect(fixture.expected.points.length).toBeGreaterThan(0);
      for (const point of fixture.expected.points) {
        expectCanonicalRepositoryPath(point.path);
        expect(Number.isInteger(point.line)).toBe(true);
        expect(point.line).toBeGreaterThan(0);
        expect(Number.isInteger(point.count)).toBe(true);
        expect(point.count).toBeGreaterThanOrEqual(0);
        expect(point.instrumented).toBe(true);
      }
    }
  });

  it("locks transient absolute-tool-path mapping without persisting absolute coverage paths", () => {
    const catalog = loadCatalog();
    const relative = fixtureById(catalog, "relative-source-path");
    const absoluteInside = fixtureById(catalog, "absolute-source-path-inside-repo");
    const outside = fixtureById(catalog, "source-path-outside-repo");

    expect(relative.input).toContain("SF:src/relative.ts");
    expect(relative.expected).toEqual({
      outcome: "resolved",
      points: [{ path: "src/relative.ts", line: 2, count: 1, instrumented: true }],
    });

    expect(absoluteInside.input).toContain("SF:/repo/src/absolute.ts");
    expect(absoluteInside.expected).toEqual({
      outcome: "resolved",
      points: [{ path: "src/absolute.ts", line: 5, count: 2, instrumented: true }],
    });

    expect(outside.input).toContain("SF:/outside/src/escape.ts");
    expect(outside.expected.outcome).toBe("unresolved");
  });

  it("keeps line-only normalization limited to DA records", () => {
    const catalog = loadCatalog();
    const fixture = fixtureById(catalog, "line-only-with-function-and-branch-noise");

    expect(fixture.input).toContain("FNDA:8,work");
    expect(fixture.input).toContain("BRDA:6,0,0,4");
    expect(parseWellFormedDaEntries(fixture.input)).toEqual([
      { line: 3, count: 8 },
      { line: 6, count: 4 },
    ]);
    expect(fixture.expected).toEqual({
      outcome: "resolved",
      points: [
        { path: "src/line-only.ts", line: 3, count: 8, instrumented: true },
        { path: "src/line-only.ts", line: 6, count: 4, instrumented: true },
      ],
    });
  });

  it("fails malformed or incomplete line coverage closed as unresolved", () => {
    const catalog = loadCatalog();
    const badLine = fixtureById(catalog, "malformed-da-line-number");
    const badCount = fixtureById(catalog, "malformed-negative-count");
    const truncated = fixtureById(catalog, "missing-record-terminator");

    expect(parseWellFormedDaEntries(badLine.input)).toHaveLength(0);
    expect(parseWellFormedDaEntries(badCount.input)).toEqual([{ line: 4, count: -1 }]);
    expect(truncated.input.trimEnd().endsWith("end_of_record")).toBe(false);

    for (const fixture of [badLine, badCount, truncated]) {
      expect(fixture.expected.outcome).toBe("unresolved");
      if (fixture.expected.outcome === "unresolved") {
        expect(fixture.expected.count).toBeNull();
        expect(fixture.expected.reason.length).toBeGreaterThan(0);
      }
    }
  });

  it("does not infer non-executable or zero-count truth from missing DA data", () => {
    const catalog = loadCatalog();
    const fixture = fixtureById(catalog, "no-line-data");

    expect(fixture.input).toContain("FNDA:1,work");
    expect(parseWellFormedDaEntries(fixture.input)).toHaveLength(0);
    expect(fixture.expected.outcome).toBe("unresolved");
    if (fixture.expected.outcome === "unresolved") {
      expect(fixture.expected.count).toBeNull();
      expect(fixture.expected.reason).toBe("no usable line coverage records");
    }
  });

  it("requires every unresolved fixture to preserve null count and a non-empty reason", () => {
    const catalog = loadCatalog();
    const unresolved = catalog.cases.filter((fixture) => fixture.expected.outcome === "unresolved");

    expect(unresolved.length).toBeGreaterThan(0);
    for (const fixture of unresolved) {
      if (fixture.expected.outcome === "unresolved") {
        expect(fixture.expected.count).toBeNull();
        expect(fixture.expected.reason.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
