import { execFileSync } from "node:child_process";
import { lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { SelfVerificationIntegrityError, reconstructSelfVerificationSubject } from "../benchmarks/self-verify.mjs";

const ownedRoots: Array<{ root: string; canonical: string; dev: number; ino: number }> = [];
const quotedPath = "two words [x] ü.txt";
const gitRoutingVariables = [
  "GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_CONFIG", "GIT_CONFIG_PARAMETERS", "GIT_SHALLOW_FILE",
] as const;

function requireFixtureEnvironment(): void {
  const present: string[] = gitRoutingVariables.filter((name) => process.env[name] !== undefined);
  if (process.env.GIT_CONFIG_COUNT !== undefined && process.env.GIT_CONFIG_COUNT !== "0") {
    present.push("GIT_CONFIG_COUNT");
  }
  if (present.length > 0) throw new Error(`fixture_git_routing_environment: ${present.join(", ")}`);
}

function fixtureMetadata(owned: typeof ownedRoots[number]): Record<string, unknown> {
  const inspect = (path: string): Record<string, unknown> => {
    try {
      const value = lstatSync(path);
      return { state: "OBSERVED", directory: value.isDirectory(), file: value.isFile(), symlink: value.isSymbolicLink(), dev: value.dev, ino: value.ino, bytes: value.size };
    } catch (error) {
      return { state: "UNAVAILABLE", code: (error as NodeJS.ErrnoException).code ?? null };
    }
  };
  const root = inspect(owned.root);
  const result: Record<string, unknown> = { initial: owned, root };
  const sameRoot = root.directory === true && root.symlink === false && root.dev === owned.dev && root.ino === owned.ino;
  if (!sameRoot || realpathSync(owned.root) !== owned.canonical) return result;
  const gitDirectory = join(owned.root, ".git");
  const metadata = inspect(gitDirectory);
  result.git = metadata;
  if (metadata.directory !== true || metadata.symlink !== false || realpathSync(gitDirectory) !== join(owned.canonical, ".git")) return result;
  result.entries = Object.fromEntries(["HEAD", "config", "index", "objects", "refs", "commondir"].map((name) => [name, inspect(join(gitDirectory, name))]));
  return result;
}

function git(root: string, args: readonly string[]): string {
  requireFixtureEnvironment();
  const owned = ownedRoots.find((entry) => entry.root === root);
  if (!owned) throw new Error("Refusing Git operation outside a registered fixture");
  const current = lstatSync(root);
  if (!current.isDirectory() || current.isSymbolicLink() || current.dev !== owned.dev || current.ino !== owned.ino || realpathSync(root) !== owned.canonical) {
    throw new Error("Refusing Git operation in a replaced fixture root");
  }
  if (args[0] !== "init") {
    const gitDirectory = join(root, ".git");
    const metadata = lstatSync(gitDirectory);
    if (!metadata.isDirectory() || metadata.isSymbolicLink() || realpathSync(gitDirectory) !== join(owned.canonical, ".git")) {
      throw new Error("Refusing Git operation outside the owned fixture metadata directory");
    }
  }
  const argv = ["-C", root, "--git-dir", join(root, ".git"), "--work-tree", root, ...args];
  try {
    return execFileSync("git", argv, {
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    try {
      const native = error as Error & { status?: number; signal?: string; code?: string };
      console.error("ASCOUT_T027_FIXTURE_GIT_FAILURE", JSON.stringify({
        argv, native_status: native.status ?? null, native_signal: native.signal ?? null,
        native_error_code: native.code ?? null, fixture: fixtureMetadata(owned),
      }));
    } catch {
      // Diagnostic failure must not replace the original native error.
    }
    throw error;
  }
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
  requireFixtureEnvironment();
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
  requireFixtureEnvironment();
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

afterEach(({ task }) => {
  const roots = ownedRoots.splice(0).reverse();
  if (task.result?.state === "fail") {
    for (const owned of roots) {
      try {
        console.error("ASCOUT_T027_RETAINED_FAILED_FIXTURE", JSON.stringify(fixtureMetadata(owned)));
      } catch {
        // Retain the root even when its metadata cannot be reported.
      }
    }
    return;
  }
  for (const owned of roots) {
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
    const status = git(subject.root, ["status", "--porcelain=v1", "--untracked-files=all", "--ignored=no"]);
    expect(status.split(/\r?\n/u).some((line) => !line.startsWith("?? ") && line.endsWith("nested"))).toBe(true);
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
