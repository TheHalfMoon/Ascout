import { describe, expect, it } from "vitest";
import {
  changedNewLineRangesFromBytes,
  isBinaryBytes,
  isConsistentOpenedWorktreeFile,
  matchFuzzyRenames,
  normalizeCrlfToLf,
  parseCatFileBatchOutput,
  parseGitBoolean,
  parseGitCoreWorktreeConfig,
  renameSimilarityScore,
  shouldNormalizeWorktreeEol,
  splitLinesForDiff,
} from "../src/git-diff.js";

describe("in-process Git diff and normalization helpers (Issue #591)", () => {
  it("parses Git boolean values and falls back on unknown strings", () => {
    for (const truthy of ["", "true", "TRUE", "yes", "on", "1"]) {
      expect(parseGitBoolean(truthy, false)).toBe(true);
    }
    for (const falsy of ["false", "FALSE", "no", "off", "0"]) {
      expect(parseGitBoolean(falsy, true)).toBe(false);
    }
    expect(parseGitBoolean("maybe", true)).toBe(true);
    expect(parseGitBoolean("maybe", false)).toBe(false);
  });

  it("detects binary bytes using Git's 8000-byte NUL prefix rule", () => {
    expect(isBinaryBytes(Buffer.alloc(0))).toBe(false);
    expect(isBinaryBytes(Buffer.from("plain utf8 text\n"))).toBe(false);
    expect(isBinaryBytes(Buffer.from([0x00]))).toBe(true);
    const nulAtBoundary = Buffer.alloc(8001, 0x61);
    nulAtBoundary[7999] = 0x00;
    expect(isBinaryBytes(nulAtBoundary)).toBe(true);
    const nulAfterBoundary = Buffer.alloc(8005, 0x61);
    nulAfterBoundary[8000] = 0x00;
    expect(isBinaryBytes(nulAfterBoundary)).toBe(false);
  });

  it("matches Git's worktree EOL normalization decision", () => {
    expect(shouldNormalizeWorktreeEol("unset", "lf", "true")).toBe(false);
    expect(shouldNormalizeWorktreeEol("set", "unspecified", "false")).toBe(true);
    expect(shouldNormalizeWorktreeEol("auto", "unspecified", "false")).toBe(true);
    expect(shouldNormalizeWorktreeEol("unspecified", "lf", "false")).toBe(true);
    expect(shouldNormalizeWorktreeEol("unspecified", "crlf", "false")).toBe(true);
    expect(shouldNormalizeWorktreeEol("unspecified", "unspecified", "true")).toBe(true);
    expect(shouldNormalizeWorktreeEol("unspecified", "unspecified", "yes")).toBe(true);
    expect(shouldNormalizeWorktreeEol("unspecified", "unspecified", "input")).toBe(true);
    expect(shouldNormalizeWorktreeEol("unspecified", "unspecified", "false")).toBe(false);
    expect(shouldNormalizeWorktreeEol("unspecified", "unspecified", "0")).toBe(false);
  });

  it("normalizes CRLF to LF with zero allocation on clean buffers", () => {
    const lfOnly = Buffer.from("one\ntwo\n");
    expect(normalizeCrlfToLf(lfOnly)).toBe(lfOnly);

    const loneCr = Buffer.from("one\rtwo\r");
    expect(normalizeCrlfToLf(loneCr)).toBe(loneCr);

    const mixed = Buffer.from("one\r\ntwo\rthree\r\nfour\r");
    expect(normalizeCrlfToLf(mixed).toString("utf8")).toBe("one\ntwo\rthree\nfour\r");
  });

  it("splits text into exact diff lines preserving trailing newline state", () => {
    expect(splitLinesForDiff(Buffer.alloc(0))).toEqual([]);
    expect(splitLinesForDiff(Buffer.from("a\nb\n"))).toEqual(["a\n", "b\n"]);
    expect(splitLinesForDiff(Buffer.from("a\nb"))).toEqual(["a\n", "b"]);
  });

  it("computes exact changed new-line ranges across additions, deletions, replacements, and large-diff fallback", () => {
    expect(changedNewLineRangesFromBytes(Buffer.from("a\nb\n"), Buffer.from("a\nb\n"))).toEqual([]);
    expect(changedNewLineRangesFromBytes(Buffer.from("a\nb\n"), Buffer.from("a\n"))).toEqual([]);
    expect(changedNewLineRangesFromBytes(Buffer.from("a\nDEL1\nb\nDEL2\nc\n"), Buffer.from("a\nb\nc\n"))).toEqual([]);
    expect(changedNewLineRangesFromBytes(Buffer.from(""), Buffer.from("a\nb\n"))).toEqual([[1, 2]]);
    expect(changedNewLineRangesFromBytes(Buffer.from("a\nb\nc\n"), Buffer.from("a\nB\nc\n"))).toEqual([[2, 2]]);
    expect(
      changedNewLineRangesFromBytes(
        Buffer.from("1\n2\n3\n4\n5\n"),
        Buffer.from("0\n1\n2\n3b\n4\n5\n6\n7\n"),
      ),
    ).toEqual([[1, 1], [4, 4], [7, 8]]);
    expect(
      changedNewLineRangesFromBytes(
        Buffer.from("alpha\nbeta\ngamma\ndelta\n"),
        Buffer.from("alpha\ngamma\nEPSILON\n"),
      ),
    ).toEqual([[3, 3]]);

    // Exceeds MAX_MYERS_EDIT_DISTANCE (1024): conservatively reports the differing new-line window.
    const largeOld = Buffer.from(Array.from({ length: 700 }, (_, i) => `old-${i}\n`).join(""));
    const largeNew = Buffer.from(Array.from({ length: 700 }, (_, i) => `new-${i}\n`).join(""));
    expect(changedNewLineRangesFromBytes(largeOld, largeNew)).toEqual([[1, 700]]);
  });

  it("scores rename similarity deterministically with empty, 2x size ratio, and duplicate-line accounting", () => {
    expect(renameSimilarityScore(Buffer.alloc(0), Buffer.from("a\n"))).toBe(0);
    expect(renameSimilarityScore(Buffer.from("a\n"), Buffer.alloc(0))).toBe(0);
    const exact = Buffer.from("alpha\nbeta\n");
    expect(renameSimilarityScore(exact, Buffer.from("alpha\nbeta\n"))).toBe(100);
    expect(renameSimilarityScore(Buffer.from("short\n"), Buffer.from("much longer text line\n"))).toBe(0);
    expect(renameSimilarityScore(Buffer.from("a\n"), Buffer.from("z\n"))).toBe(0);
    // Exercises duplicate lines in both oldBytes and newBytes (including non-nullish oldCounts lookup).
    expect(renameSimilarityScore(Buffer.from("dup\ndup\nother\n"), Buffer.from("dup\ndup\nfinal\n"))).toBe(57);
    expect(renameSimilarityScore(Buffer.from("line1\nline2\nline3\n"), Buffer.from("line1\nline2\nchanged\n"))).toBeGreaterThanOrEqual(50);
  });

  it("parses core.autocrlf, core.filemode, core.symlinks, bare booleans, and unknown keys", () => {
    expect(parseGitCoreWorktreeConfig("")).toEqual({ autocrlf: "false", fileMode: true, symlinks: true });
    expect(parseGitCoreWorktreeConfig("core.autocrlf\ncore.filemode off\ncore.symlinks 0\ncore.other 1\n")).toEqual({
      autocrlf: "true",
      fileMode: false,
      symlinks: false,
    });
  });

  it("verifies pre/post-open file identity consistency across every mismatch condition", () => {
    const base = {
      contained: true,
      beforeDev: 1n,
      beforeIno: 10n,
      openedIsFile: true,
      openedDev: 1n,
      openedIno: 10n,
      afterDev: 1n,
      afterIno: 10n,
    };
    expect(isConsistentOpenedWorktreeFile(base)).toBe(true);
    expect(isConsistentOpenedWorktreeFile({ ...base, openedIsFile: false })).toBe(false);
    expect(isConsistentOpenedWorktreeFile({ ...base, contained: false })).toBe(false);
    expect(isConsistentOpenedWorktreeFile({ ...base, openedDev: 2n })).toBe(false);
    expect(isConsistentOpenedWorktreeFile({ ...base, openedIno: 11n })).toBe(false);
    expect(isConsistentOpenedWorktreeFile({ ...base, afterDev: 2n })).toBe(false);
    expect(isConsistentOpenedWorktreeFile({ ...base, afterIno: 11n })).toBe(false);
  });

  it("parses cat-file --batch output and rejects every malformed frame", () => {
    const oid = "a".repeat(40);
    const ok = parseCatFileBatchOutput(Buffer.from(`${oid} blob 5\nhello\n`), [oid]);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.blobs.get(oid)?.toString("utf8")).toBe("hello");

    expect(parseCatFileBatchOutput(Buffer.from("no-newline"), [oid]).ok).toBe(false);
    expect(parseCatFileBatchOutput(Buffer.from(`${oid} missing\n`), [oid]).ok).toBe(false);
    expect(parseCatFileBatchOutput(Buffer.from(`${"b".repeat(40)} blob 5\nhello\n`), [oid]).ok).toBe(false);
    expect(parseCatFileBatchOutput(Buffer.from(`${oid} tree 5\nhello\n`), [oid]).ok).toBe(false);
    expect(parseCatFileBatchOutput(Buffer.from(`${oid} blob NaN\nhello\n`), [oid]).ok).toBe(false);
    expect(parseCatFileBatchOutput(Buffer.from(`${oid} blob -1\nhello\n`), [oid]).ok).toBe(false);
    expect(parseCatFileBatchOutput(Buffer.from(`${oid} blob 5\nhi\n`), [oid]).ok).toBe(false);
    expect(parseCatFileBatchOutput(Buffer.from(`${oid} blob 5\nhelloX`), [oid]).ok).toBe(false);
    expect(parseCatFileBatchOutput(Buffer.from(`${oid} blob 5\nhello\nextra`), [oid]).ok).toBe(false);
  });

  it("matches fuzzy renames deterministically with tie-breakers, binary skipping, conflict resolution, and matrix cap", () => {
    expect(matchFuzzyRenames([], [{ path: "a", bytes: Buffer.from("x\n") }])).toEqual([]);
    expect(matchFuzzyRenames([{ path: "a", bytes: Buffer.from("x\n") }], [])).toEqual([]);
    expect(
      matchFuzzyRenames(
        [{ path: "a", bytes: Buffer.from("x\n") }, { path: "b", bytes: Buffer.from("y\n") }],
        [{ path: "c", bytes: Buffer.from("x\n") }],
        1,
      ),
    ).toEqual([]);

    const shared = Buffer.from("line1\nline2\nline3\nline4\n");
    const close = Buffer.from("line1\nline2\nline3\nLINE4\n");
    const farther = Buffer.from("line1\nline2\nLINE3\nLINE4\n");
    const binary = Buffer.from([0, 1, 2, 3]);
    const unrelated = Buffer.from("zzzzzzzzzzzzzzzzzzzz\n");
    const matches = matchFuzzyRenames(
      [
        { path: "bin.dat", bytes: binary },
        { path: "b.txt", bytes: shared },
        { path: "a.txt", bytes: shared },
      ],
      [
        { path: "bin2.dat", bytes: binary },
        { path: "unrel.txt", bytes: unrelated },
        { path: "y.txt", bytes: close },
        { path: "x.txt", bytes: close },
        { path: "z.txt", bytes: farther },
      ],
    );
    expect(matches).toEqual([
      { oldPath: "a.txt", newPath: "x.txt" },
      { oldPath: "b.txt", newPath: "y.txt" },
    ]);
  });
});
