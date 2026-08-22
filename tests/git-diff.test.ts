import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  GitIdentityError,
  readWorkingTreeComparison,
  type GitChangedFile,
} from "../src/git.js";

const temporaryDirectories: string[] = [];
const NULL_GIT_CONFIG = process.platform === "win32" ? "NUL" : "/dev/null";
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: NULL_GIT_CONFIG,
  GIT_CONFIG_SYSTEM: NULL_GIT_CONFIG,
  GIT_TERMINAL_PROMPT: "0",
};

function git(repositoryRoot: string, argv: readonly string[]): string {
  return execFileSync("git", [...argv], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: GIT_ENV,
    windowsHide: true,
  });
}

function makeRepository(): string {
  const repositoryRoot = mkdtempSync(join(tmpdir(), "ascout-t020-"));
  temporaryDirectories.push(repositoryRoot);
  git(repositoryRoot, ["init", "-q"]);
  git(repositoryRoot, ["config", "user.name", "Ascout Test"]);
  git(repositoryRoot, ["config", "user.email", "ascout@example.invalid"]);
  git(repositoryRoot, ["config", "commit.gpgsign", "false"]);
  git(repositoryRoot, ["config", "core.autocrlf", "false"]);
  git(repositoryRoot, ["config", "core.excludesFile", join(repositoryRoot, ".empty-excludes")]);
  git(repositoryRoot, ["config", "core.attributesFile", join(repositoryRoot, ".empty-attributes")]);
  git(repositoryRoot, ["config", "core.hooksPath", join(repositoryRoot, ".empty-hooks")]);
  writeFileSync(join(repositoryRoot, ".empty-excludes"), "");
  writeFileSync(join(repositoryRoot, ".empty-attributes"), "");
  mkdirSync(join(repositoryRoot, ".empty-hooks"));
  return repositoryRoot;
}

function commitAll(repositoryRoot: string, message = "base"): string {
  git(repositoryRoot, ["add", "--all"]);
  git(repositoryRoot, ["commit", "-q", "-m", message]);
  return git(repositoryRoot, ["rev-parse", "HEAD"]).trim();
}

function byPath(changed: readonly GitChangedFile[]): Map<string, GitChangedFile> {
  return new Map(changed.map((entry) => [entry.path, entry]));
}

function expectPositiveOrderedRanges(entry: GitChangedFile): void {
  for (const [start, end] of entry.changed_new_line_ranges) {
    expect(Number.isInteger(start)).toBe(true);
    expect(Number.isInteger(end)).toBe(true);
    expect(start).toBeGreaterThanOrEqual(1);
    expect(end).toBeGreaterThanOrEqual(start);
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("T020 working-tree changed scope", () => {
  it("returns an exact clean comparison bound to source-start HEAD", () => {
    const repositoryRoot = makeRepository();
    writeFileSync(join(repositoryRoot, "tracked.txt"), "base\n");
    const head = commitAll(repositoryRoot);

    expect(readWorkingTreeComparison(repositoryRoot, head)).toEqual({
      kind: "working_tree_vs_head",
      base_ref: head,
      includes_staged: true,
      includes_unstaged: true,
      includes_untracked_nonignored: true,
      changed_files: [],
    });
  });

  it("covers tracked add/modify/delete/rename plus nonignored untracked scope", () => {
    const repositoryRoot = makeRepository();
    mkdirSync(join(repositoryRoot, "src"));
    writeFileSync(join(repositoryRoot, ".gitignore"), "ignored.txt\n");
    writeFileSync(join(repositoryRoot, "src", "modified.txt"), "one\ntwo\nthree\n");
    writeFileSync(join(repositoryRoot, "deleted.txt"), "gone\n");
    writeFileSync(join(repositoryRoot, "rename-old.txt"), "alpha\nbeta\n");
    writeFileSync(join(repositoryRoot, "binary.dat"), Buffer.from([1, 0, 2, 3]));
    const head = commitAll(repositoryRoot);

    writeFileSync(join(repositoryRoot, "src", "modified.txt"), "one\nTWO\nTHREE\n");
    writeFileSync(join(repositoryRoot, "added.txt"), "a\nb\n");
    git(repositoryRoot, ["add", "added.txt"]);
    rmSync(join(repositoryRoot, "deleted.txt"));
    git(repositoryRoot, ["mv", "rename-old.txt", "rename-new.txt"]);
    writeFileSync(join(repositoryRoot, "binary.dat"), Buffer.from([1, 0, 8, 9]));
    mkdirSync(join(repositoryRoot, "notes"));
    writeFileSync(join(repositoryRoot, "notes", "new.txt"), "alpha\nbeta\ngamma");
    writeFileSync(join(repositoryRoot, "notes", "empty.txt"), "");
    writeFileSync(join(repositoryRoot, "notes", "binary.bin"), Buffer.from([9, 0, 8]));
    writeFileSync(join(repositoryRoot, "ignored.txt"), "ignored\n");
    mkdirSync(join(repositoryRoot, ".ascout"));
    writeFileSync(join(repositoryRoot, ".ascout", "runtime.json"), "{}\n");

    const comparison = readWorkingTreeComparison(repositoryRoot, head);
    const changed = byPath(comparison.changed_files);

    expect(comparison.base_ref).toBe(head);
    expect(changed.get("added.txt")).toEqual({
      path: "added.txt",
      change_kind: "added",
      line_semantics: "text",
      changed_new_line_ranges: [[1, 2]],
    });
    expect(changed.get("src/modified.txt")?.changed_new_line_ranges).toEqual([[2, 3]]);
    expect(changed.get("deleted.txt")).toEqual({
      path: "deleted.txt",
      change_kind: "deleted",
      line_semantics: "deleted_only",
      changed_new_line_ranges: [],
    });
    expect(changed.get("rename-new.txt")).toEqual({
      path: "rename-new.txt",
      previous_path: "rename-old.txt",
      change_kind: "renamed",
      line_semantics: "text",
      changed_new_line_ranges: [],
    });
    expect(changed.get("binary.dat")?.line_semantics).toBe("binary_or_non_line");
    expect(changed.get("binary.dat")?.changed_new_line_ranges).toEqual([]);
    expect(changed.get("notes/new.txt")?.changed_new_line_ranges).toEqual([[1, 3]]);
    expect(changed.get("notes/empty.txt")?.changed_new_line_ranges).toEqual([]);
    expect(changed.get("notes/binary.bin")?.line_semantics).toBe("binary_or_non_line");
    expect(changed.has("ignored.txt")).toBe(false);
    expect([...changed.keys()].some((path) => path === ".ascout" || path.startsWith(".ascout/"))).toBe(false);

    for (const entry of comparison.changed_files) expectPositiveOrderedRanges(entry);
  });

  it("preserves leading U+FEFF in untracked path identity", () => {
    const repositoryRoot = makeRepository();
    writeFileSync(join(repositoryRoot, "tracked.txt"), "base\n");
    const head = commitAll(repositoryRoot);
    const plainName = "name.txt";
    const bomName = "\uFEFFname.txt";

    writeFileSync(join(repositoryRoot, plainName), "plain\n");
    writeFileSync(join(repositoryRoot, bomName), "bom\n");
    const changed = byPath(readWorkingTreeComparison(repositoryRoot, head).changed_files);

    expect(changed.has(plainName)).toBe(true);
    expect(changed.has(bomName)).toBe(true);
    expect(changed.size).toBe(2);
  });

  it("rejects a comparison base that is not the exact source-start HEAD", () => {
    const repositoryRoot = makeRepository();
    writeFileSync(join(repositoryRoot, "tracked.txt"), "base\n");
    const firstHead = commitAll(repositoryRoot, "first");
    writeFileSync(join(repositoryRoot, "tracked.txt"), "next\n");
    const secondHead = commitAll(repositoryRoot, "second");
    expect(secondHead).not.toBe(firstHead);

    expect(() => readWorkingTreeComparison(repositoryRoot, firstHead)).toThrowError(
      expect.objectContaining<Partial<GitIdentityError>>({ code: "git_metadata_error" }),
    );
    expect(() => readWorkingTreeComparison(repositoryRoot, "HEAD")).toThrowError(
      expect.objectContaining<Partial<GitIdentityError>>({ code: "invalid_head_identity" }),
    );
  });

  it.skipIf(process.platform === "win32")(
    "keeps mode/type-only changes file-level without invented line ranges",
    () => {
      const repositoryRoot = makeRepository();
      writeFileSync(join(repositoryRoot, "mode.sh"), "echo ok\n", { mode: 0o644 });
      writeFileSync(join(repositoryRoot, "kind"), "file\n");
      const head = commitAll(repositoryRoot);

      chmodSync(join(repositoryRoot, "mode.sh"), 0o755);
      rmSync(join(repositoryRoot, "kind"));
      symlinkSync("target", join(repositoryRoot, "kind"));

      const changed = byPath(readWorkingTreeComparison(repositoryRoot, head).changed_files);
      expect(changed.get("mode.sh")?.change_kind).toBe("modified");
      expect(changed.get("mode.sh")?.changed_new_line_ranges).toEqual([]);
      expect(changed.get("kind")).toEqual({
        path: "kind",
        change_kind: "type_changed",
        line_semantics: "binary_or_non_line",
        changed_new_line_ranges: [],
      });
    },
  );
});
