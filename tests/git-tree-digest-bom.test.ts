import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readTreeDigestV1 } from "../src/git.js";

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
  const repositoryRoot = mkdtempSync(join(tmpdir(), "ascout-t019-bom-"));
  temporaryDirectories.push(repositoryRoot);
  git(repositoryRoot, ["init", "-q"]);
  git(repositoryRoot, ["config", "user.name", "Ascout Test"]);
  git(repositoryRoot, ["config", "user.email", "ascout@example.invalid"]);
  git(repositoryRoot, ["config", "commit.gpgsign", "false"]);
  return repositoryRoot;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("T019 UTF-8 Git pathname preservation", () => {
  it("keeps a leading U+FEFF distinct from the same pathname without it", () => {
    const repositoryRoot = makeRepository();
    const plainName = "name.txt";
    const bomName = "\uFEFFname.txt";

    writeFileSync(join(repositoryRoot, plainName), "same-base\n");
    writeFileSync(join(repositoryRoot, bomName), "same-base\n");
    git(repositoryRoot, ["add", "--all"]);
    git(repositoryRoot, ["commit", "-q", "-m", "base"]);

    const clean = readTreeDigestV1(repositoryRoot);
    expect(clean.tracked_index_entry_count).toBe(2);
    expect(clean.unstaged_changed_count).toBe(0);

    writeFileSync(join(repositoryRoot, bomName), "changed-bom-path\n");
    const changed = readTreeDigestV1(repositoryRoot);
    expect(changed.unstaged_changed_count).toBe(1);
    expect(changed.tree_digest).not.toBe(clean.tree_digest);
  });
});
