import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, isAbsolute, join, relative } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  GitIdentityError,
  readGitHeadState,
  readTreeDigestV1,
  trustedGitExecutable,
} from "../src/git.js";

const ORIGINAL_PATH = process.env.PATH ?? "";
const GIT_NAME = process.platform === "win32" ? "git.exe" : "git";

let base: string;
let repo: string;
let head: string;
let plantedMarker: string;

/** A planted file named git. It fails on Windows and also leaves a marker on POSIX. */
function plantGit(directory: string): void {
  mkdirSync(directory, { recursive: true });
  if (process.platform === "win32") {
    // Only a real .exe can be selected. Node rejects Git's arguments, so a planted
    // binary that ran would make the read fail instead of returning HEAD.
    copyFileSync(process.execPath, join(directory, "git.exe"));
    return;
  }
  const path = join(directory, "git");
  writeFileSync(path, `#!/bin/sh\necho planted > "${plantedMarker}"\nexit 1\n`);
  chmodSync(path, 0o755);
}

beforeAll(() => {
  base = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-git-path-")));
  repo = join(base, "repo");
  plantedMarker = join(base, "planted.txt");
  const run = (...args: string[]) => {
    const result = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr);
    return result.stdout.trim();
  };
  mkdirSync(repo);
  run("init", "-q");
  writeFileSync(join(repo, "a.txt"), "a\n");
  run("add", "a.txt");
  run("-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-q", "--no-gpg-sign", "-m", "x");
  head = run("rev-parse", "HEAD");
  plantGit(join(repo, "tools"));
  plantGit(repo);
  // The planted files are local to the fixture and must not move the tree digest test.
  writeFileSync(join(repo, ".git", "info", "exclude"), "tools/\n..bin/\ngit\ngit.exe\n");
}, 60_000);

afterEach(() => {
  process.env.PATH = ORIGINAL_PATH;
});

afterAll(() => {
  process.env.PATH = ORIGINAL_PATH;
  rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe("Git executable resolution", () => {
  it.each<[string, () => string]>([
    ["the repository root", () => repo],
    ["a repository subdirectory", () => join(repo, "tools")],
    ["a dot entry", () => "."],
    ["an empty entry", () => ""],
    ["a relative entry", () => "tools"],
  ])("skips %s on PATH and still finds real Git", (_label, entry) => {
    // From the repository, these relative forms all name a directory holding a planted Git.
    const previous = process.cwd();
    process.chdir(repo);
    try {
      process.env.PATH = entry() + delimiter + ORIGINAL_PATH;
      const selected = trustedGitExecutable(repo);
      expect(selected).not.toBeNull();
      expect(isAbsolute(selected as string)).toBe(true);
      expect(relative(repo, selected as string).startsWith("..")).toBe(true);
      expect(readGitHeadState(repo).head_sha).toBe(head);
      expect(readTreeDigestV1(repo).tree_digest).toMatch(/^[a-f0-9]{64}$/u);
      expect(existsSync(plantedMarker)).toBe(false);
    } finally {
      process.chdir(previous);
    }
  });

  it("reports Git as unavailable when only a planted Git is on PATH", () => {
    process.env.PATH = [repo, join(repo, "tools"), "."].join(delimiter);
    expect(trustedGitExecutable(repo)).toBeNull();
    expect(() => readGitHeadState(repo)).toThrow(GitIdentityError);
    expect(existsSync(plantedMarker)).toBe(false);
  });

  it("skips the repository's copy and selects the next Git outside it", () => {
    const outside = join(base, "outside-bin");
    plantGit(outside);
    process.env.PATH = [repo, outside, ORIGINAL_PATH].join(delimiter);
    expect(trustedGitExecutable(repo)).toBe(join(outside, GIT_NAME));
  });

  it("treats a directory whose name only starts with two dots as inside the repository", () => {
    const dotted = join(repo, "..bin");
    plantGit(dotted);
    process.env.PATH = [dotted, ORIGINAL_PATH].join(delimiter);
    const selected = trustedGitExecutable(repo);
    expect(selected).not.toBeNull();
    expect(selected).not.toBe(join(dotted, GIT_NAME));
  });

  it.skipIf(process.platform === "win32")("skips a link outside the repository that leads back in", () => {
    const linkDirectory = join(base, "link-bin");
    mkdirSync(linkDirectory);
    symlinkSync(join(repo, GIT_NAME), join(linkDirectory, GIT_NAME));
    process.env.PATH = [linkDirectory, ORIGINAL_PATH].join(delimiter);
    const selected = trustedGitExecutable(repo);
    expect(selected).not.toBeNull();
    expect(selected).not.toBe(join(linkDirectory, GIT_NAME));
  });

  it.skipIf(process.platform === "win32")("skips a repository entry whose Git points out of the repository", () => {
    const linked = join(repo, "linked");
    mkdirSync(linked);
    const target = join(base, "chosen-by-repository");
    plantGit(target);
    symlinkSync(join(target, GIT_NAME), join(linked, GIT_NAME));
    writeFileSync(join(repo, ".git", "info", "exclude"), "tools/\n..bin/\nlinked/\ngit\ngit.exe\n");
    process.env.PATH = [linked, ORIGINAL_PATH].join(delimiter);
    const selected = trustedGitExecutable(repo);
    expect(selected).not.toBeNull();
    expect(selected).not.toBe(join(linked, GIT_NAME));
  });

  it.skipIf(process.platform === "win32")("searches a default path when PATH is unset", () => {
    delete process.env.PATH;
    expect(trustedGitExecutable(repo)).not.toBeNull();
  });
});
