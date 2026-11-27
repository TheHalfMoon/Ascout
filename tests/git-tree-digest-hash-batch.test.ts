import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

// Counts every Git subcommand launched during tree-digest and working-tree comparison, while
// every call still runs real Git. A test may also rewrite one Git reply to exercise fail-closed
// guards that real Git never emits.
const gitSubcommands: string[] = [];
let rewrite: ((args: readonly string[], stdout: Buffer, status: number | null) => { stdout: Buffer; status: number | null } | null) | null = null;
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawnSync: ((command: string, args: readonly string[], options: object) => {
      if (typeof command === "string" && /(?:^|[\\/])git(?:\.exe)?$/u.test(command) && Array.isArray(args)) {
        const subcommand = args[args.lastIndexOf("-c") + 2];
        if (typeof subcommand === "string") gitSubcommands.push(subcommand);
      }
      const result = actual.spawnSync(command, args, options);
      const replaced = rewrite !== null && Array.isArray(args) && Buffer.isBuffer(result.stdout)
        ? rewrite(args, result.stdout, result.status)
        : null;
      return replaced === null ? result : { ...result, stdout: replaced.stdout, status: replaced.status };
    }) as typeof actual.spawnSync,
  };
});

const {
  openContainedRegularFile,
  readContainedWorktreeText,
  readGitHeadState,
  readTreeDigestV1,
  readUntrackedIgnoredPaths,
  readWorkingTreeComparison,
  worktreeMatchesCommitV1,
} = await import("../src/git.js");

const roots: string[] = [];
afterEach(() => {
  rewrite = null;
  gitSubcommands.length = 0;
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

function git(root: string, args: readonly string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1" },
  });
}

/** A committed repository whose files all look modified to Git; the first `changed` really are. */
function touchedRepository(files: number, changed: number): { root: string; head: string } {
  const root = mkdtempSync(join(tmpdir(), "ascout-hash-batch-"));
  roots.push(root);
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Ascout Test"]);
  git(root, ["config", "user.email", "ascout@example.invalid"]);
  git(root, ["config", "commit.gpgSign", "false"]);
  git(root, ["config", "core.autocrlf", "false"]);
  for (let index = 0; index < files; index += 1) writeFileSync(join(root, `f${index}.txt`), `base ${index}\n`);
  git(root, ["add", "--all"]);
  git(root, ["commit", "-q", "-m", "base"]);
  const head = git(root, ["rev-parse", "HEAD"]).trim();
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  for (let index = 0; index < files; index += 1) {
    writeFileSync(join(root, `f${index}.txt`), index < changed ? `changed ${index}\n` : `base ${index}\n`);
    utimesSync(join(root, `f${index}.txt`), future, future);
  }
  return { root, head };
}

describe("Issue #591 in-process worktree hashing and diffing (zero worktree-reading Git calls)", () => {
  it("hashes 20 touched regular files in-process without spawning hash-object or diff-files", () => {
    const { root, head } = touchedRepository(20, 5);
    gitSubcommands.length = 0;
    const digest = readTreeDigestV1(root);
    expect(digest.unstaged_changed_count).toBe(5);
    expect(gitSubcommands).not.toContain("hash-object");
    expect(gitSubcommands).not.toContain("diff-files");
    expect(gitSubcommands).not.toContain("diff");

    gitSubcommands.length = 0;
    const comparison = readWorkingTreeComparison(root, head);
    expect(comparison.changed_files).toHaveLength(5);
    expect(gitSubcommands).not.toContain("hash-object");
    expect(gitSubcommands).not.toContain("diff-files");
    expect(gitSubcommands).not.toContain("diff");

    gitSubcommands.length = 0;
    expect(worktreeMatchesCommitV1(root, head)).toBe(false);
    expect(gitSubcommands).not.toContain("diff");
    expect(gitSubcommands).not.toContain("diff-files");
    expect(gitSubcommands).not.toContain("hash-object");
  }, 30_000);

  it.each([
    ["malformed ls-tree record", "ls-tree", () => ({ stdout: Buffer.from("bad-record\0"), status: 0 }), "malformed commit tree entry"],
    ["submodule commit in ls-tree", "ls-tree", () => ({ stdout: Buffer.from(`160000 commit ${"a".repeat(40)}\tsm\0`), status: 0 }), "Git submodule"],
    ["cat-file parse failure", "cat-file", () => ({ stdout: Buffer.from("no-newline"), status: 0 }), "truncated header"],
    ["core config command error", "config", () => ({ stdout: Buffer.alloc(0), status: 2 }), "unable to read Git core worktree settings"],
    ["incomplete check-attr triples", "check-attr", () => ({ stdout: Buffer.from("f0.txt\0filter\0"), status: 0 }), "incomplete filter attributes"],
    ["unmerged index in working-tree comparison", "ls-files", (stdout: Buffer, args: readonly string[]) => (args.includes("--stage") ? { stdout: Buffer.from(`M 100644 ${"a".repeat(40)} 2\tf0.txt\0`), status: 0 } : null), "unmerged state"],
  ])("fails closed on %s", (_label, targetCmd, transform, message) => {
    const { root, head } = touchedRepository(2, 1);
    rewrite = (args, stdout) => args.includes(targetCmd) ? transform(stdout, args) : null;
    expect(() => readWorkingTreeComparison(root, head)).toThrow(message);
  }, 30_000);

  it("handles unstaged parent directory deletion (rm -rf dir) and directory-to-file replacement cleanly (HIGH-1)", () => {
    const { root } = touchedRepository(1, 0);
    mkdirSync(join(root, "sub", "deep"), { recursive: true });
    writeFileSync(join(root, "sub", "deep", "nested.txt"), "hello\n");
    git(root, ["add", "--all"]);
    git(root, ["commit", "-q", "-m", "nested"]);
    const head = git(root, ["rev-parse", "HEAD"]).trim();

    // Unstaged rm -rf sub
    rmSync(join(root, "sub"), { recursive: true, force: true });
    expect(readTreeDigestV1(root).unstaged_changed_count).toBe(1);
    expect(readWorkingTreeComparison(root, head).changed_files).toEqual([
      { path: "sub/deep/nested.txt", change_kind: "deleted", line_semantics: "deleted_only", changed_new_line_ranges: [] },
    ]);
    expect(worktreeMatchesCommitV1(root, head)).toBe(false);

    // Replace deleted directory with a regular file (ENOTDIR under naive lstat)
    writeFileSync(join(root, "sub"), "now a file\n");
    expect(readTreeDigestV1(root).unstaged_changed_count).toBe(1);
    const cmpWithFile = readWorkingTreeComparison(root, head);
    expect(cmpWithFile.changed_files.some((entry) => entry.path === "sub/deep/nested.txt" && entry.change_kind === "deleted")).toBe(true);
    expect(worktreeMatchesCommitV1(root, head)).toBe(false);
  }, 120_000);

  it("preserves committed CRLF under autocrlf, staged chmod under core.filemode=false, and core.symlinks=false", () => {
    const { root, head } = touchedRepository(2, 0);
    expect(worktreeMatchesCommitV1(root, "not-a-sha")).toBe(false);
    expect(worktreeMatchesCommitV1(root, head)).toBe(true);

    // Untracked file makes worktreeMatchesCommitV1 return false.
    writeFileSync(join(root, "extra.txt"), "x\n");
    expect(worktreeMatchesCommitV1(root, head)).toBe(false);
    unlinkSync(join(root, "extra.txt"));

    // Committed CRLF blob stays clean even when core.autocrlf=true (Git's has_cr_in_index guard).
    writeFileSync(join(root, "crlf.txt"), "a\r\nb\r\n");
    git(root, ["add", "crlf.txt"]);
    git(root, ["commit", "-q", "-m", "crlf-blob"]);
    const crlfHead = git(root, ["rev-parse", "HEAD"]).trim();
    git(root, ["config", "core.autocrlf", "true"]);
    expect(readTreeDigestV1(root).unstaged_changed_count).toBe(0);
    expect(readWorkingTreeComparison(root, crlfHead).changed_files).toEqual([]);
    expect(worktreeMatchesCommitV1(root, crlfHead)).toBe(true);
    git(root, ["config", "core.autocrlf", "false"]);

    // Staged --chmod=+x is detected even when core.filemode=false.
    git(root, ["config", "core.filemode", "false"]);
    git(root, ["update-index", "--chmod=+x", "f0.txt"]);
    expect(worktreeMatchesCommitV1(root, crlfHead)).toBe(false);
    expect(readWorkingTreeComparison(root, crlfHead).changed_files).toEqual([
      { path: "f0.txt", change_kind: "modified", line_semantics: "text", changed_new_line_ranges: [] },
    ]);
    git(root, ["commit", "-q", "-m", "exec"]);
    const execHead = git(root, ["rev-parse", "HEAD"]).trim();
    expect(worktreeMatchesCommitV1(root, execHead)).toBe(true);

    // core.symlinks=false treats regular file holding 120000 link target as matching symlink entry.
    const symOid = execFileSync("git", ["hash-object", "-w", "--stdin"], {
      cwd: root,
      input: "target-text",
      encoding: "utf8",
      windowsHide: true,
      env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1" },
    }).trim();
    git(root, ["update-index", "--add", "--cacheinfo", `120000,${symOid},sym-plain`]);
    writeFileSync(join(root, "sym-plain"), "target-text");
    git(root, ["commit", "-q", "-m", "sym-plain"]);
    const symPlainHead = git(root, ["rev-parse", "HEAD"]).trim();
    git(root, ["config", "core.symlinks", "false"]);
    expect(readTreeDigestV1(root).unstaged_changed_count).toBe(0);
    expect(worktreeMatchesCommitV1(root, symPlainHead)).toBe(true);
    git(root, ["config", "core.symlinks", "true"]);
  }, 120_000);

  it("handles renames, staged empty/ghost files, directory-over-file refusal, symlinks, and intermediate symlink containment", () => {
    const { root } = touchedRepository(2, 0);
    // Non-exact rename, exact binary rename, empty staged file, staged-add deleted, and worktreeMatchesCommitV1 mismatch cases.
    writeFileSync(join(root, "rename-src.txt"), "line1\nline2\nline3\nline4\n");
    writeFileSync(join(root, "bin-exact-old.dat"), Buffer.from([0, 1, 2, 3, 4]));
    writeFileSync(join(root, "bin-old.dat"), Buffer.from([0, 1, 2, 3]));
    git(root, ["add", "--all"]);
    git(root, ["commit", "-q", "-m", "rename-base"]);
    const renameBase = git(root, ["rev-parse", "HEAD"]).trim();

    // Equal index size, different path -> worktreeMatchesCommitV1 returns false (expected === undefined).
    git(root, ["mv", "f1.txt", "f1-renamed.txt"]);
    expect(worktreeMatchesCommitV1(root, renameBase)).toBe(false);
    git(root, ["mv", "f1-renamed.txt", "f1.txt"]);

    // Unmerged stage in worktreeMatchesCommitV1 returns false cleanly.
    rewrite = (args) => args.includes("--stage") ? { stdout: Buffer.from(`M 100644 ${"a".repeat(40)} 2\tf0.txt\0`), status: 0 } : null;
    expect(worktreeMatchesCommitV1(root, renameBase)).toBe(false);
    rewrite = null;

    git(root, ["rm", "-q", "f1.txt"]);
    git(root, ["mv", "rename-src.txt", "rename-dst.txt"]);
    writeFileSync(join(root, "rename-dst.txt"), "line1\nline2\nline3\nLINE4\n");
    git(root, ["mv", "bin-exact-old.dat", "bin-exact-new.dat"]);
    writeFileSync(join(root, "empty-staged.txt"), "");
    git(root, ["add", "empty-staged.txt"]);
    writeFileSync(join(root, "ghost.txt"), "ghost\n");
    git(root, ["add", "ghost.txt"]);
    unlinkSync(join(root, "ghost.txt"));
    unlinkSync(join(root, "bin-old.dat"));
    writeFileSync(join(root, "bin-new.dat"), Buffer.from([0, 9, 8, 7]));
    git(root, ["add", "bin-new.dat"]);

    const comparison = readWorkingTreeComparison(root, renameBase);
    const byPath = new Map(comparison.changed_files.map((item) => [item.path, item]));
    expect(byPath.get("rename-dst.txt")).toEqual({
      path: "rename-dst.txt",
      previous_path: "rename-src.txt",
      change_kind: "renamed",
      line_semantics: "text",
      changed_new_line_ranges: [[4, 4]],
    });
    expect(byPath.get("bin-exact-new.dat")).toEqual({
      path: "bin-exact-new.dat",
      previous_path: "bin-exact-old.dat",
      change_kind: "renamed",
      line_semantics: "binary_or_non_line",
      changed_new_line_ranges: [],
    });
    expect(byPath.get("empty-staged.txt")).toEqual({
      path: "empty-staged.txt",
      change_kind: "added",
      line_semantics: "text",
      changed_new_line_ranges: [],
    });
    expect(byPath.get("f1.txt")?.change_kind).toBe("deleted");
    expect(byPath.has("ghost.txt")).toBe(false);
    expect(byPath.get("bin-new.dat")?.line_semantics).toBe("binary_or_non_line");
    expect(worktreeMatchesCommitV1(root, renameBase)).toBe(false);

    // Tracked entry replaced by directory fails closed.
    unlinkSync(join(root, "f0.txt"));
    mkdirSync(join(root, "f0.txt"));
    expect(() => readTreeDigestV1(root)).toThrow("unsupported worktree entry type");
    rmSync(join(root, "f0.txt"), { recursive: true, force: true });
    git(root, ["reset", "-q", "--hard", renameBase]);

    if (process.platform !== "win32") {
      git(root, ["config", "core.filemode", "true"]);
      chmodSync(join(root, "f0.txt"), 0o755);
      symlinkSync("target-a", join(root, "sym-base"));
      symlinkSync("target-mv", join(root, "sym-old"));
      git(root, ["add", "--all"]);
      git(root, ["commit", "-q", "-m", "symlinks"]);
      const symHead = git(root, ["rev-parse", "HEAD"]).trim();

      unlinkSync(join(root, "sym-base"));
      symlinkSync("target-b", join(root, "sym-base"));
      git(root, ["mv", "sym-old", "sym-new"]);
      symlinkSync("target-added", join(root, "sym-added"));
      git(root, ["add", "sym-added"]);
      symlinkSync("target-untracked", join(root, "sym-untracked"));

      const symCmp = readWorkingTreeComparison(root, symHead);
      const symMap = new Map(symCmp.changed_files.map((item) => [item.path, item]));
      expect(symMap.get("sym-base")).toMatchObject({ change_kind: "modified", line_semantics: "binary_or_non_line" });
      expect(symMap.get("sym-new")).toMatchObject({ change_kind: "renamed", previous_path: "sym-old", line_semantics: "binary_or_non_line" });
      expect(symMap.get("sym-added")).toMatchObject({ change_kind: "added", line_semantics: "binary_or_non_line" });
      expect(symMap.get("sym-untracked")).toMatchObject({ change_kind: "untracked", line_semantics: "binary_or_non_line" });

      // Restore unstaged sym-base before committing real-dir so unstaged_changed_count starts at 0.
      git(root, ["checkout", "--", "sym-base"]);

      // Intermediate symlink traversal in resolveTrackedCandidatePath: in-repo, escaping, and dangling.
      mkdirSync(join(root, "real-dir"), { recursive: true });
      writeFileSync(join(root, "real-dir", "leaf.txt"), "leaf\n");
      git(root, ["add", "real-dir/leaf.txt"]);
      git(root, ["commit", "-q", "-m", "real-dir"]);
      const latestHead = git(root, ["rev-parse", "HEAD"]).trim();
      rmSync(join(root, "real-dir"), { recursive: true, force: true });
      mkdirSync(join(root, "alt-dir"), { recursive: true });
      writeFileSync(join(root, "alt-dir", "leaf.txt"), "leaf\n");
      symlinkSync("alt-dir", join(root, "real-dir"));
      expect(readTreeDigestV1(root).unstaged_changed_count).toBe(0);

      unlinkSync(join(root, "real-dir"));
      symlinkSync("/tmp", join(root, "real-dir"));
      expect(() => readTreeDigestV1(root)).toThrow("resolves outside repository root");

      unlinkSync(join(root, "real-dir"));
      symlinkSync("no-such-target", join(root, "real-dir"));
      expect(() => readTreeDigestV1(root)).toThrow("unable to resolve tree-digest parent path");
      unlinkSync(join(root, "real-dir"));
      // Symlink pointing to an in-repo regular file resolves as deleted (null) rather than ENOTDIR.
      symlinkSync("f0.txt", join(root, "real-dir"));
      expect(readTreeDigestV1(root).unstaged_changed_count).toBeGreaterThan(0);
      unlinkSync(join(root, "real-dir"));
      git(root, ["checkout", "--", "real-dir"]);

      // Untracked executable file exercises the 0o100n -> 100755 branch in untrackedWorktreeEntry.
      writeFileSync(join(root, "untracked-exec.sh"), "#!/bin/sh\necho hi\n");
      chmodSync(join(root, "untracked-exec.sh"), 0o755);
      expect(readTreeDigestV1(root).included_untracked_count).toBeGreaterThan(0);
      unlinkSync(join(root, "untracked-exec.sh"));

      // Symlink replaced by a regular file exercises type_changed in both tree-digest and comparison.
      unlinkSync(join(root, "sym-base"));
      writeFileSync(join(root, "sym-base"), "now-a-file\n");
      expect(readTreeDigestV1(root).unstaged_changed_count).toBeGreaterThan(0);
      const typeCmp = readWorkingTreeComparison(root, latestHead);
      expect(typeCmp.changed_files.find((item) => item.path === "sym-base")?.line_semantics).toBe("binary_or_non_line");
    }
  }, 120_000);

  it("covers readContainedWorktreeText caps, openContainedRegularFile consistency guards, filter gitattributes, and unmerged conflicts", () => {
    const { root } = touchedRepository(1, 0);
    const head = readGitHeadState(root);
    expect(head.detached).toBe(false);

    // readContainedWorktreeText within and above maxBytes, plus missing/non-regular failure.
    writeFileSync(join(root, "bounded.txt"), "0123456789\n");
    expect(readContainedWorktreeText(root, "bounded.txt", 32)).toBe("0123456789\n");
    expect(readContainedWorktreeText(root, "bounded.txt", 4)).toBeNull();
    expect(readContainedWorktreeText(root, "does-not-exist.txt", 32)).toBeNull();
    expect(() => openContainedRegularFile(root, "does-not-exist.txt")).toThrow("expected a regular file");
    expect(() => openContainedRegularFile(root, "bounded.txt", () => false)).toThrow("worktree entry changed or escaped");
    unlinkSync(join(root, "bounded.txt"));

    // Streaming untracked file analysis: >64 KiB multi-chunk text without trailing LF, empty file, and binary file.
    const bigUntracked = `${"line-data\n".repeat(7000)}tail-no-newline`;
    writeFileSync(join(root, "big-untracked.txt"), bigUntracked);
    writeFileSync(join(root, "empty-untracked.txt"), "");
    writeFileSync(join(root, "bin-untracked.bin"), Buffer.from([0x00, 0x01, 0x02]));
    const streamCmp = readWorkingTreeComparison(root, head.head_sha);
    const streamMap = new Map(streamCmp.changed_files.map((item) => [item.path, item]));
    expect(streamMap.get("big-untracked.txt")).toMatchObject({
      change_kind: "untracked",
      line_semantics: "text",
      changed_new_line_ranges: [[1, 7001]],
    });
    expect(streamMap.get("empty-untracked.txt")).toMatchObject({
      change_kind: "untracked",
      line_semantics: "text",
      changed_new_line_ranges: [],
    });
    expect(streamMap.get("bin-untracked.bin")).toMatchObject({
      change_kind: "untracked",
      line_semantics: "binary_or_non_line",
      changed_new_line_ranges: [],
    });
    unlinkSync(join(root, "big-untracked.txt"));
    unlinkSync(join(root, "empty-untracked.txt"));
    unlinkSync(join(root, "bin-untracked.bin"));

    // Ignored untracked discovery helper.
    writeFileSync(join(root, ".gitignore"), "ignored.log\n");
    writeFileSync(join(root, "ignored.log"), "secret\n");
    expect(readUntrackedIgnoredPaths(root, ["ignored.log"])).toContain("ignored.log");
    unlinkSync(join(root, "ignored.log"));
    unlinkSync(join(root, ".gitignore"));

    // Custom gitattributes filter fails closed.
    writeFileSync(join(root, ".gitattributes"), "*.dat filter=lfs\n");
    writeFileSync(join(root, "blob.dat"), "raw\n");
    git(root, ["add", ".gitattributes", "blob.dat"]);
    git(root, ["commit", "-q", "-m", "filter-attr"]);
    expect(() => readTreeDigestV1(root)).toThrow("has a Git filter attribute");
    git(root, ["reset", "-q", "--hard", head.head_sha]);

    // Unmerged index conflict (stage !== 0) makes worktreeMatchesCommitV1 return false.
    git(root, ["checkout", "-q", "-b", "branch-a"]);
    writeFileSync(join(root, "f0.txt"), "from-a\n");
    git(root, ["commit", "-q", "-am", "a"]);
    git(root, ["checkout", "-q", head.head_sha]);
    git(root, ["checkout", "-q", "-b", "branch-b"]);
    writeFileSync(join(root, "f0.txt"), "from-b\n");
    git(root, ["commit", "-q", "-am", "b"]);
    const bHead = git(root, ["rev-parse", "HEAD"]).trim();
    try {
      git(root, ["merge", "branch-a"]);
    } catch {
      // Expected merge conflict leaving stage 1/2/3 entries in the index.
    }
    expect(worktreeMatchesCommitV1(root, bHead)).toBe(false);
  }, 60_000);
});
