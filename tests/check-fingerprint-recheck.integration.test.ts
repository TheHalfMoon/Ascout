import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it, vi } from "vitest";

const writer = vi.hoisted(() => ({ afterDiscovery: null as (() => void) | null }));

vi.mock("../src/discovery.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/discovery.js")>();
  return {
    ...actual,
    // Stands in for a concurrent writer that changes the tree just after discovery reads it.
    collectDiscoveredProject: (root: string) => {
      const project = actual.collectDiscoveredProject(root);
      writer.afterDiscovery?.();
      return project;
    },
  };
});

const { runCheck } = await import("../src/check.js");

function git(root: string, argv: readonly string[]): void {
  const result = spawnSync("git", argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${argv.join(" ")} failed: ${result.stderr}`);
}

function repository(): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-fingerprint-recheck-"));
  writeFileSync(join(root, ".gitignore"), ".ascout/\n");
  writeFileSync(join(root, "notes.txt"), "baseline\n");
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Ascout Fingerprint Fixture"]);
  git(root, ["config", "user.email", "fingerprint@example.invalid"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-qm", "baseline"]);
  return root;
}

afterEach(() => {
  writer.afterDiscovery = null;
});

describe("check fingerprint recheck", () => {
  it("stops when the tree changes while check reads its inputs", async () => {
    const root = repository();
    try {
      writer.afterDiscovery = () => writeFileSync(join(root, "notes.txt"), "changed mid-read\n");
      await expect(runCheck(root)).rejects.toThrow(/changed while check was reading/u);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  it("runs normally when nothing changes", async () => {
    const root = repository();
    try {
      const { receipt } = await runCheck(root);
      expect(receipt.stability).toBe("stable");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});
