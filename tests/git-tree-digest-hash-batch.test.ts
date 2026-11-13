import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

// Counts the hash-object processes the tree digest starts, while every call still runs real Git.
// A test may also replace one Git reply, to show how the digest treats output real Git never gives.
const hashObjectCalls: string[][] = [];
const hashObjectTimeouts: (number | undefined)[] = [];
let rewrite: ((args: readonly string[], stdout: Buffer) => Buffer | null) | null = null;
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawnSync: ((command: string, args: readonly string[], options: object) => {
      if (Array.isArray(args) && args.includes("hash-object")) {
        hashObjectCalls.push([...args]);
        hashObjectTimeouts.push((options as { timeout?: number }).timeout);
      }
      const result = actual.spawnSync(command, args, options);
      const replaced = rewrite !== null && Array.isArray(args) && Buffer.isBuffer(result.stdout) ? rewrite(args, result.stdout) : null;
      return replaced === null ? result : { ...result, stdout: replaced };
    }) as typeof actual.spawnSync,
  };
});

const { readTreeDigestV1 } = await import("../src/git.js");

const roots: string[] = [];
afterEach(() => {
  rewrite = null;
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function git(root: string, args: readonly string[]): void {
  execFileSync("git", args, { cwd: root, windowsHide: true, env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1" } });
}

/** A committed repository whose files all look modified to Git; the first `changed` really are. */
function touchedRepository(files: number, changed: number): string {
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
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  for (let index = 0; index < files; index += 1) {
    writeFileSync(join(root, `f${index}.txt`), index < changed ? `changed ${index}\n` : `base ${index}\n`);
    utimesSync(join(root, `f${index}.txt`), future, future);
  }
  return root;
}

describe("tree digest hashing", () => {
  it("hashes every touched regular file in one git hash-object process per observation", () => {
    const root = touchedRepository(20, 5);
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

  it.each([
    ["one object ID too few", (stdout: string) => stdout.split("\n").slice(1).join("\n"), "unexpected number of worktree object IDs"],
    ["no trailing newline", (stdout: string) => stdout.replace(/\n$/u, ""), "unexpected number of worktree object IDs"],
    ["an object ID that isn't hex", (stdout: string) => stdout.replace(/^[0-9a-f]{40}/u, "z".repeat(40)), "invalid worktree object ID for f0.txt"],
    ["an object ID of the wrong length", (stdout: string) => stdout.replace(/^[0-9a-f]{40}/u, "a".repeat(64)), "invalid worktree object ID for f0.txt"],
  ])("fails closed on %s from the batch", (_label, change, message) => {
    const root = touchedRepository(3, 1);
    rewrite = (args, stdout) => args.includes("--stdin-paths") ? Buffer.from(change(stdout.toString("utf8")), "utf8") : null;
    expect(() => readTreeDigestV1(root)).toThrow(message);
  }, 30_000);

  it("refuses a diff-files status the digest does not know, before hashing anything", () => {
    const root = touchedRepository(2, 1);
    rewrite = (args, stdout) => args.includes("diff-files") ? Buffer.from(stdout.toString("latin1").replace(/ M\0/u, " X\0"), "latin1") : null;
    hashObjectCalls.length = 0;
    expect(() => readTreeDigestV1(root)).toThrow("unsupported unstaged Git status for tree digest at f0.txt: X");
    expect(hashObjectCalls).toHaveLength(0);
  }, 30_000);
});
