import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, relative } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { GitIdentityError, readGitHeadState, readTreeDigestV1 } from "../src/git.js";

const ORIGINAL_PATH = process.env.PATH ?? "";

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
  base = realpathSync(mkdtempSync(join(tmpdir(), "ascout-git-path-")));
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
  writeFileSync(join(repo, ".git", "info", "exclude"), "tools/\ngit\ngit.exe\n");
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
    ["a relative entry", () => relative(process.cwd(), join(repo, "tools"))],
  ])("skips %s on PATH and still finds real Git", (_label, entry) => {
    process.env.PATH = entry() + delimiter + ORIGINAL_PATH;
    expect(readGitHeadState(repo).head_sha).toBe(head);
    expect(readTreeDigestV1(repo).tree_digest).toMatch(/^[a-f0-9]{64}$/u);
    expect(existsSync(plantedMarker)).toBe(false);
  });

  it("reports Git as unavailable when only a planted Git is on PATH", () => {
    process.env.PATH = [repo, join(repo, "tools"), "."].join(delimiter);
    expect(() => readGitHeadState(repo)).toThrow(GitIdentityError);
    expect(existsSync(plantedMarker)).toBe(false);
  });

  it("skips the repository's copy and selects the next Git outside it", () => {
    const outside = join(base, "outside-bin");
    plantGit(outside);
    process.env.PATH = [repo, outside, ORIGINAL_PATH].join(delimiter);
    // The outside directory is the user's own authority, so it wins over later entries.
    // What matters here is that the repository's copy was skipped to reach it.
    expect(() => readGitHeadState(repo)).toThrow(GitIdentityError);
    if (process.platform !== "win32") {
      expect(existsSync(plantedMarker)).toBe(true);
      rmSync(plantedMarker, { force: true });
    }
  });
});
