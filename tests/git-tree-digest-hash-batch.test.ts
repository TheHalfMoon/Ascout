import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

// Counts the hash-object processes the tree digest starts, while every call still runs real Git.
const hashObjectCalls: string[][] = [];
const hashObjectTimeouts: (number | undefined)[] = [];
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawnSync: ((command: string, args: readonly string[], options: object) => {
      if (Array.isArray(args) && args.includes("hash-object")) {
        hashObjectCalls.push([...args]);
        hashObjectTimeouts.push((options as { timeout?: number }).timeout);
      }
      return actual.spawnSync(command, args, options);
    }) as typeof actual.spawnSync,
  };
});

const { readTreeDigestV1 } = await import("../src/git.js");

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function git(root: string, args: readonly string[]): void {
  execFileSync("git", args, { cwd: root, windowsHide: true, env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1" } });
}

describe("tree digest hashing", () => {
  it("hashes every touched regular file in one git hash-object process per observation", () => {
    const root = mkdtempSync(join(tmpdir(), "ascout-hash-batch-"));
    roots.push(root);
    git(root, ["init", "-q"]);
    git(root, ["config", "user.name", "Ascout Test"]);
    git(root, ["config", "user.email", "ascout@example.invalid"]);
    git(root, ["config", "commit.gpgSign", "false"]);
    git(root, ["config", "core.autocrlf", "false"]);
    for (let index = 0; index < 20; index += 1) writeFileSync(join(root, `f${index}.txt`), `base ${index}\n`);
    git(root, ["add", "--all"]);
    git(root, ["commit", "-q", "-m", "base"]);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    for (let index = 0; index < 20; index += 1) {
      writeFileSync(join(root, `f${index}.txt`), index < 5 ? `changed ${index}\n` : `base ${index}\n`);
      utimesSync(join(root, `f${index}.txt`), future, future);
    }

    hashObjectCalls.length = 0;
    hashObjectTimeouts.length = 0;
    const digest = readTreeDigestV1(root);
    expect(digest.unstaged_changed_count).toBe(5);
    // The digest takes two complete observations and compares them. Before batching, each of the 20
    // stat-dirty files started its own hash-object process in each observation: 40 in all.
    expect(hashObjectCalls).toHaveLength(2);
    for (const call of hashObjectCalls) expect(call).toContain("--stdin-paths");
    // The batch keeps the budget the single-file calls had: 10 seconds per file.
    expect(hashObjectTimeouts).toEqual([200_000, 200_000]);
  }, 30_000);
});
