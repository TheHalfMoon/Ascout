import { execFileSync } from "node:child_process";
import { lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { SelfVerificationIntegrityError, reconstructSelfVerificationSubject } from "../benchmarks/self-verify.mjs";

const ownedRoots: Array<{ root: string; canonical: string; dev: number; ino: number }> = [];
const quotedPath = "two words [x] ü.txt";

function git(root: string, args: readonly string[]): string {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

interface Fixture {
  root: string;
  base: string;
  head: string;
}

function commit(root: string, message: string): string {
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", message]);
  return git(root, ["rev-parse", "HEAD"]);
}

function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "ascout-t027-"));
  const identity = lstatSync(root);
  ownedRoots.push({ root, canonical: realpathSync(root), dev: identity.dev, ino: identity.ino });
  git(root, ["init", "-q"]);
  git(root, ["config", "--local", "user.name", "Ascout T027"]);
  git(root, ["config", "--local", "user.email", ["t027", "example.invalid"].join("@")]);
  git(root, ["config", "--local", "commit.gpgSign", "false"]);
  git(root, ["config", "--local", "core.autocrlf", "false"]);
  const hooks = join(root, ".git", "empty-hooks");
  mkdirSync(hooks);
  git(root, ["config", "--local", "core.hooksPath", hooks]);
  const excludes = join(root, ".git", "empty-excludes");
  const attributes = join(root, ".git", "empty-attributes");
  writeFileSync(excludes, "");
  writeFileSync(attributes, "");
  git(root, ["config", "--local", "core.excludesFile", excludes]);
  git(root, ["config", "--local", "core.attributesFile", attributes]);
  writeFileSync(join(root, ".gitignore"), "dist/\nnode_modules/\n.ascout/\n");
  writeFileSync(join(root, "tracked.txt"), "base\n");
  writeFileSync(join(root, quotedPath), "quoted base\n");
  const base = commit(root, "base");
  writeFileSync(join(root, "tracked.txt"), "head\n");
  return { root, base, head: commit(root, "head") };
}

function reconstruct(subject: Fixture) {
  return reconstructSelfVerificationSubject({
    repositoryRoot: subject.root,
    eventBaseSha: subject.base,
    headSha: subject.head,
  });
}

async function rejectsWithoutReconstruction(subject: Fixture, code: string): Promise<void> {
  await expect(reconstruct(subject)).rejects.toSatisfy((error: unknown) => {
    expect(error).toBeInstanceOf(SelfVerificationIntegrityError);
    expect((error as SelfVerificationIntegrityError).code).toBe(code);
    return true;
  });
  expect(git(subject.root, ["rev-parse", "HEAD"])).toBe(subject.head);
}

function withSubmodule(): Fixture {
  const subject = fixture();
  const nested = fixture();
  git(subject.root, ["-c", "protocol.file.allow=always", "submodule", "add", "-q", nested.root, "nested"]);
  git(subject.root, ["config", "--local", "diff.ignoreSubmodules", "untracked"]);
  return { ...subject, head: commit(subject.root, "head with local submodule") };
}

afterEach(() => {
  for (const owned of ownedRoots.splice(0).reverse()) {
    const current = lstatSync(owned.root);
    if (resolve(dirname(owned.root)) !== resolve(tmpdir()) || current.isSymbolicLink()
      || current.dev !== owned.dev || current.ino !== owned.ino || realpathSync(owned.root) !== owned.canonical) {
      throw new Error("Refusing cleanup of a replaced or unowned fixture root");
    }
    rmSync(owned.root, { recursive: true, force: true });
  }
});

describe("native exact-head clean-state observations", () => {
  it("preserves tracked contamination precedence when nonignored untracked content also exists", async () => {
    const subject = fixture();
    writeFileSync(join(subject.root, "tracked.txt"), "tracked drift\n");
    writeFileSync(join(subject.root, "untracked.txt"), "untracked\n");
    await rejectsWithoutReconstruction(subject, "tracked_contamination");
  }, 30_000);

  it("finds quoted nonignored untracked paths despite status display preferences", async () => {
    const subject = fixture();
    git(subject.root, ["config", "--local", "status.showUntrackedFiles", "no"]);
    git(subject.root, ["config", "--local", "color.ui", "always"]);
    writeFileSync(join(subject.root, "new words [x] ü.txt"), "untracked\n");
    await rejectsWithoutReconstruction(subject, "untracked_contamination");
  }, 30_000);

  it("rejects tracked changes in quoted paths without interpreting filename content as status", async () => {
    const subject = fixture();
    git(subject.root, ["config", "--local", "core.quotePath", "false"]);
    writeFileSync(join(subject.root, quotedPath), "quoted drift\n");
    await rejectsWithoutReconstruction(subject, "tracked_contamination");
  }, 30_000);

  it.each(["--assume-unchanged", "--skip-worktree"])("retains %s while detecting another tracked change", async (flag) => {
    const subject = fixture();
    git(subject.root, ["update-index", flag, "--", "tracked.txt"]);
    const indexFlags = git(subject.root, ["ls-files", "-v", "--", "tracked.txt"]);
    writeFileSync(join(subject.root, quotedPath), "other tracked drift\n");
    await rejectsWithoutReconstruction(subject, "tracked_contamination");
    expect(git(subject.root, ["ls-files", "-v", "--", "tracked.txt"])).toBe(indexFlags);
  }, 30_000);

  it("retains native diff treatment of a submodule containing only untracked files", async () => {
    const subject = withSubmodule();
    writeFileSync(join(subject.root, "nested", "untracked.txt"), "nested untracked\n");
    git(subject.root, ["diff", "--quiet", "--"]);
    const targetTree = git(subject.root, ["write-tree"]);
    await expect(reconstruct(subject)).resolves.toMatchObject({ mergeBaseSha: subject.base, headTreeSha: targetTree });
    expect(git(subject.root, ["rev-parse", "HEAD"])).toBe(subject.base);
    expect(git(subject.root, ["write-tree"])).toBe(targetTree);
  }, 30_000);

  it("rejects tracked submodule edits under the same native ignore configuration", async () => {
    const subject = withSubmodule();
    writeFileSync(join(subject.root, "nested", "tracked.txt"), "nested tracked drift\n");
    await rejectsWithoutReconstruction(subject, "tracked_contamination");
  }, 30_000);
});
