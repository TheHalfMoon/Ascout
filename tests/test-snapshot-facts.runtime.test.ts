import { describe, expect, it } from "vitest";

import {
  classifyVerificationAssetPath,
  deriveTestChanges,
} from "../src/check.js";
import type { GitChangedFile } from "../src/git.js";

function changedFile(
  path: string,
  changeKind: GitChangedFile["change_kind"],
  previousPath?: string,
): GitChangedFile {
  return {
    path,
    ...(previousPath === undefined ? {} : { previous_path: previousPath }),
    change_kind: changeKind,
    line_semantics: changeKind === "deleted" ? "deleted_only" : "text",
    changed_new_line_ranges: changeKind === "deleted" ? [] : [[1, 1]],
  };
}

describe("T068 factual test/snapshot diff classification", () => {
  it("classifies conventional JavaScript/TypeScript and pytest files conservatively", () => {
    expect(classifyVerificationAssetPath("tests/unit/example.test.ts")).toEqual({
      isTestFile: true,
      isSnapshot: false,
    });
    expect(classifyVerificationAssetPath("packages/ui/button.spec.tsx")).toEqual({
      isTestFile: true,
      isSnapshot: false,
    });
    expect(classifyVerificationAssetPath("python/test_example.py")).toEqual({
      isTestFile: true,
      isSnapshot: false,
    });
    expect(classifyVerificationAssetPath("python/example_test.py")).toEqual({
      isTestFile: true,
      isSnapshot: false,
    });
    expect(classifyVerificationAssetPath("tests/helpers.ts")).toEqual({
      isTestFile: false,
      isSnapshot: false,
    });
  });

  it("recognizes Jest/Vitest snapshot paths without treating them as test files", () => {
    expect(classifyVerificationAssetPath("tests/__snapshots__/example.test.ts.snap")).toEqual({
      isTestFile: false,
      isSnapshot: true,
    });
    expect(classifyVerificationAssetPath("fixtures/example.snap")).toEqual({
      isTestFile: false,
      isSnapshot: false,
    });
  });

  it("derives exactly the four canonical Git facts without semantic inference", () => {
    expect(deriveTestChanges([
      changedFile("tests/unit/example.test.ts", "modified"),
      changedFile("tests/legacy/removed.spec.js", "deleted"),
      changedFile("tests/__snapshots__/example.test.ts.snap", "modified"),
      changedFile("tests/__snapshots__/removed.test.ts.snap", "deleted"),
      changedFile("src/index.ts", "modified"),
    ])).toEqual([
      { kind: "test_file_changed", path: "tests/unit/example.test.ts", source: "git_diff" },
      { kind: "test_file_deleted", path: "tests/legacy/removed.spec.js", source: "git_diff" },
      { kind: "snapshot_changed", path: "tests/__snapshots__/example.test.ts.snap", source: "git_diff" },
      { kind: "snapshot_deleted", path: "tests/__snapshots__/removed.test.ts.snap", source: "git_diff" },
    ]);
  });

  it("preserves deletion truth when a verification asset is renamed out of its category", () => {
    expect(deriveTestChanges([
      changedFile("src/example.ts", "renamed", "tests/example.test.ts"),
      changedFile("fixtures/example.txt", "renamed", "tests/__snapshots__/example.test.ts.snap"),
    ])).toEqual([
      { kind: "test_file_deleted", path: "tests/example.test.ts", source: "git_diff" },
      { kind: "snapshot_deleted", path: "tests/__snapshots__/example.test.ts.snap", source: "git_diff" },
    ]);
  });

  it("reports a verification asset renamed into its category as changed at the current path", () => {
    expect(deriveTestChanges([
      changedFile("tests/example.test.ts", "renamed", "src/example.ts"),
      changedFile("tests/__snapshots__/example.test.ts.snap", "renamed", "fixtures/example.txt"),
    ])).toEqual([
      { kind: "test_file_changed", path: "tests/example.test.ts", source: "git_diff" },
      { kind: "snapshot_changed", path: "tests/__snapshots__/example.test.ts.snap", source: "git_diff" },
    ]);
  });

  it("reports untracked test files as changed but not untracked snapshots as tracked facts", () => {
    expect(deriveTestChanges([
      changedFile("tests/new.test.ts", "untracked"),
      changedFile("tests/__snapshots__/new.test.ts.snap", "untracked"),
    ])).toEqual([
      { kind: "test_file_changed", path: "tests/new.test.ts", source: "git_diff" },
    ]);
  });
});
