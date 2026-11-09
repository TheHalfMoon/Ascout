import { describe, expect, it } from "vitest";

import { normalizeLcovBranchCoverage, normalizeLcovLineCoverage } from "../src/coverage/lcov.js";

function lcov(source: string): string {
  return [`SF:${source}`, "DA:1,1", "BRDA:1,0,0,1", "end_of_record", ""].join("\n");
}

function linePaths(source: string, root: string, base: string | null): readonly string[] | string {
  const result = normalizeLcovLineCoverage(lcov(source), root, base);
  return result.outcome === "resolved" ? result.points.map(({ path }) => path) : result.reason;
}

describe("LCOV source paths in a package-scoped run", () => {
  it("resolves a relative path from the package the runner ran in", () => {
    expect(linePaths("src/foo.ts", "/repo", "packages/a")).toEqual(["packages/a/src/foo.ts"]);
  });

  it("resolves a path that leaves the package but stays in the repository", () => {
    expect(linePaths("../shared/x.ts", "/repo", "packages/a")).toEqual(["packages/shared/x.ts"]);
  });

  it("still refuses a path that leaves the repository", () => {
    expect(typeof linePaths("../../../outside.ts", "/repo", "packages/a")).toBe("string");
  });

  it("leaves absolute paths and repository-root runs unchanged", () => {
    expect(linePaths("/repo/packages/a/src/foo.ts", "/repo", "packages/a")).toEqual(["packages/a/src/foo.ts"]);
    expect(linePaths("src/foo.ts", "/repo", null)).toEqual(["src/foo.ts"]);
  });

  it("resolves Windows-style relative paths from the package too", () => {
    expect(linePaths("src\\foo.ts", "C:\\repo", "packages/a")).toEqual(["packages/a/src/foo.ts"]);
  });

  it("maps branch records the same way", () => {
    const result = normalizeLcovBranchCoverage(lcov("src/foo.ts"), "/repo", "packages/a");
    expect(result.outcome === "resolved" && result.observations.map(({ path }) => path)).toEqual(["packages/a/src/foo.ts"]);
  });
});
