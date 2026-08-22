import { describe, expect, it } from "vitest";

type ChangeKind = "added" | "modified" | "deleted" | "renamed" | "type_changed" | "untracked";
type LineSemantics = "text" | "binary_or_non_line" | "deleted_only";
type LineRange = readonly [number, number];

interface ChangedFileContract {
  readonly path: string;
  readonly previous_path?: string;
  readonly change_kind: ChangeKind;
  readonly line_semantics: LineSemantics;
  readonly changed_new_line_ranges: readonly LineRange[];
}

interface GitDiffFixture {
  readonly path: string;
  readonly previousPath?: string;
  readonly changeKind: ChangeKind;
  readonly patch?: string;
  readonly binary?: boolean;
  readonly untrackedText?: string;
}

const SHA1_HEAD = "0123456789abcdef0123456789abcdef01234567";
const SHA256_HEAD = "0123456789abcdef".repeat(4);

function resolveHeadObjectId(stdout: string): string {
  const withoutTerminalNewline = stdout.endsWith("\r\n")
    ? stdout.slice(0, -2)
    : stdout.endsWith("\n")
      ? stdout.slice(0, -1)
      : stdout;

  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(withoutTerminalNewline)) {
    throw new Error("HEAD must resolve to one full lowercase Git object ID");
  }

  return withoutTerminalNewline;
}

function changedNewLineRangesFromZeroContextPatch(patch: string): readonly LineRange[] {
  const ranges: LineRange[] = [];
  const hunkHeader = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@(?: .*)?$/gm;

  for (const match of patch.matchAll(hunkHeader)) {
    const start = Number(match[1]);
    const count = match[2] === undefined ? 1 : Number(match[2]);

    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(count) || count < 0) {
      throw new Error("invalid Git zero-context hunk");
    }
    if (count === 0) continue;
    if (start < 1) throw new Error("positive changed new-line ranges require start >= 1");

    const end = start + count - 1;
    if (!Number.isSafeInteger(end) || start > end) {
      throw new Error("invalid changed new-line range");
    }
    ranges.push([start, end]);
  }

  return ranges;
}

function countTextLines(text: string): number {
  if (text.length === 0) return 0;
  const pieces = text.split("\n");
  if (pieces.at(-1) === "") pieces.pop();
  return pieces.length;
}

function normalizeGitDiffFixture(fixture: GitDiffFixture): ChangedFileContract {
  if (fixture.changeKind === "renamed" && fixture.previousPath === undefined) {
    throw new Error("renamed change requires previous path");
  }
  if (fixture.changeKind !== "renamed" && fixture.previousPath !== undefined) {
    throw new Error("non-rename change cannot carry previous path");
  }

  if (fixture.changeKind === "deleted") {
    return {
      path: fixture.path,
      change_kind: "deleted",
      line_semantics: "deleted_only",
      changed_new_line_ranges: [],
    };
  }

  if (fixture.binary === true || fixture.changeKind === "type_changed") {
    const base = {
      path: fixture.path,
      change_kind: fixture.changeKind,
      line_semantics: "binary_or_non_line" as const,
      changed_new_line_ranges: [],
    };
    return fixture.changeKind === "renamed"
      ? { ...base, previous_path: fixture.previousPath! }
      : base;
  }

  const ranges = fixture.changeKind === "untracked"
    ? (() => {
        const lineCount = countTextLines(fixture.untrackedText ?? "");
        return lineCount === 0 ? [] : [[1, lineCount] as const];
      })()
    : changedNewLineRangesFromZeroContextPatch(fixture.patch ?? "");

  const base = {
    path: fixture.path,
    change_kind: fixture.changeKind,
    line_semantics: "text" as const,
    changed_new_line_ranges: ranges,
  };
  return fixture.changeKind === "renamed"
    ? { ...base, previous_path: fixture.previousPath! }
    : base;
}

function expectOnlyPositiveOrderedRanges(changed: ChangedFileContract): void {
  for (const [start, end] of changed.changed_new_line_ranges) {
    expect(Number.isInteger(start)).toBe(true);
    expect(Number.isInteger(end)).toBe(true);
    expect(start).toBeGreaterThanOrEqual(1);
    expect(end).toBeGreaterThanOrEqual(start);
  }
}

describe("T011 Git diff contract", () => {
  it("binds working-tree comparison to the full resolved HEAD object ID", () => {
    for (const oid of [SHA1_HEAD, SHA256_HEAD]) {
      const resolved = resolveHeadObjectId(`${oid}\n`);
      expect(resolved).toBe(oid);
      expect({ sourceStartHeadSha: resolved, comparisonBaseRef: resolved }).toEqual({
        sourceStartHeadSha: oid,
        comparisonBaseRef: oid,
      });
    }

    for (const invalid of ["HEAD\n", "0123456\n", `${SHA1_HEAD.toUpperCase()}\n`, `${SHA1_HEAD} extra\n`]) {
      expect(() => resolveHeadObjectId(invalid)).toThrow();
    }
  });

  it("derives positive new-line ranges from zero-context add and modify hunks", () => {
    const added = normalizeGitDiffFixture({
      path: "src/added.ts",
      changeKind: "added",
      patch: "@@ -0,0 +1,3 @@\n+one\n+two\n+three\n",
    });
    const modified = normalizeGitDiffFixture({
      path: "src/modified.ts",
      changeKind: "modified",
      patch: [
        "@@ -2 +2,2 @@",
        "-old",
        "+new-a",
        "+new-b",
        "@@ -8,2 +9 @@",
        "-x",
        "-y",
        "+z",
        "",
      ].join("\n"),
    });

    expect(added).toEqual({
      path: "src/added.ts",
      change_kind: "added",
      line_semantics: "text",
      changed_new_line_ranges: [[1, 3]],
    });
    expect(modified.changed_new_line_ranges).toEqual([[2, 3], [9, 9]]);
    expectOnlyPositiveOrderedRanges(added);
    expectOnlyPositiveOrderedRanges(modified);
  });

  it("keeps deletion file-level with deleted-only line semantics", () => {
    const deleted = normalizeGitDiffFixture({
      path: "src/deleted.ts",
      changeKind: "deleted",
      patch: "@@ -1,4 +0,0 @@\n-old\n-lines\n-only\n-here\n",
    });

    expect(deleted).toEqual({
      path: "src/deleted.ts",
      change_kind: "deleted",
      line_semantics: "deleted_only",
      changed_new_line_ranges: [],
    });
  });

  it("preserves rename old/new path identity without inventing changed lines", () => {
    const renamed = normalizeGitDiffFixture({
      path: "src/new-name.ts",
      previousPath: "src/old-name.ts",
      changeKind: "renamed",
      patch: "",
    });

    expect(renamed).toEqual({
      path: "src/new-name.ts",
      previous_path: "src/old-name.ts",
      change_kind: "renamed",
      line_semantics: "text",
      changed_new_line_ranges: [],
    });
    expect(() => normalizeGitDiffFixture({ path: "new.ts", changeKind: "renamed" })).toThrow();
    expect(() => normalizeGitDiffFixture({
      path: "same.ts",
      previousPath: "old.ts",
      changeKind: "modified",
    })).toThrow();
  });

  it("keeps type changes and binary inputs file-level only", () => {
    const typeChanged = normalizeGitDiffFixture({
      path: "assets/link",
      changeKind: "type_changed",
      patch: "@@ -1 +1 @@\n-old\n+new\n",
    });
    const binary = normalizeGitDiffFixture({
      path: "assets/logo.bin",
      changeKind: "modified",
      binary: true,
      patch: "Binary files a/assets/logo.bin and b/assets/logo.bin differ\n",
    });

    expect(typeChanged).toEqual({
      path: "assets/link",
      change_kind: "type_changed",
      line_semantics: "binary_or_non_line",
      changed_new_line_ranges: [],
    });
    expect(binary).toEqual({
      path: "assets/logo.bin",
      change_kind: "modified",
      line_semantics: "binary_or_non_line",
      changed_new_line_ranges: [],
    });
  });

  it("treats nonignored untracked text as wholly changed by new-line range", () => {
    const untracked = normalizeGitDiffFixture({
      path: "notes/new.txt",
      changeKind: "untracked",
      untrackedText: "alpha\nbeta\ngamma\n",
    });
    const emptyUntracked = normalizeGitDiffFixture({
      path: "notes/empty.txt",
      changeKind: "untracked",
      untrackedText: "",
    });

    expect(untracked).toEqual({
      path: "notes/new.txt",
      change_kind: "untracked",
      line_semantics: "text",
      changed_new_line_ranges: [[1, 3]],
    });
    expect(emptyUntracked.changed_new_line_ranges).toEqual([]);
    expectOnlyPositiveOrderedRanges(untracked);
  });

  it("never emits inverted or nonpositive ranges from deletion-only hunks", () => {
    const patch = [
      "@@ -4,2 +4,0 @@",
      "-deleted-a",
      "-deleted-b",
      "@@ -10 +8,2 @@",
      "-old",
      "+new-a",
      "+new-b",
      "",
    ].join("\n");

    const ranges = changedNewLineRangesFromZeroContextPatch(patch);
    expect(ranges).toEqual([[8, 9]]);
    for (const [start, end] of ranges) {
      expect(start).toBeGreaterThanOrEqual(1);
      expect(end).toBeGreaterThanOrEqual(start);
    }
  });
});
