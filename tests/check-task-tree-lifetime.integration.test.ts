import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { runCheck, taskStatusFromProcess } from "../src/check.js";

const POSIX = process.platform !== "win32";

const base = { outcome: "exited", exit_code: 0, signal: null, timed_out: false, cleanup_complete: true } as const;

describe("taskStatusFromProcess", () => {
  it("passes only a clean exit", () => {
    expect(taskStatusFromProcess(base, 1000)).toMatchObject({ status: "PASS", reasonCode: null });
    expect(taskStatusFromProcess({ ...base, exit_code: 1 }, 1000)).toMatchObject({ status: "FAIL", failures: 1 });
  });

  it("says a timed-out tree was terminated only when cleanup completed", () => {
    expect(taskStatusFromProcess({ ...base, outcome: "timed_out", exit_code: null, timed_out: true }, 1000))
      .toMatchObject({ status: "ERROR", reasonCode: "task_timeout" });
    const incomplete = taskStatusFromProcess({ ...base, outcome: "error", exit_code: null, timed_out: true, cleanup_complete: false }, 1000);
    expect(incomplete).toMatchObject({ status: "ERROR", reasonCode: "task_timeout_cleanup_incomplete" });
    expect(incomplete.reasonText).not.toContain("was terminated");
  });

  it("never passes a tree escape, even with exit code 0", () => {
    expect(taskStatusFromProcess({ ...base, outcome: "tree_escape" }, 1000)).toMatchObject({ status: "ERROR", reasonCode: "task_tree_escape" });
  });
});

function git(root: string, argv: readonly string[]): void {
  const result = spawnSync("git", argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${argv.join(" ")} failed: ${result.stderr}`);
}

/**
 * A repository whose typecheck command starts a descendant, then exits 0. A detached descendant
 * escapes the Windows job that would otherwise end it with the root, and starts its own POSIX
 * session; a non-detached one stays in the root's process group.
 */
function repository(stdio: "inherit" | "ignore", detached: boolean): string {
  const root = mkdtempSync(join(tmpdir(), "ascout-tree-lifetime-"));
  const script = [
    "const { spawn } = require('node:child_process');",
    `const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 5000)'], { stdio: '${stdio}', detached: ${detached}, cwd: require('node:os').tmpdir() });`,
    "child.unref();",
  ].join(" ");
  writeFileSync(join(root, ".gitignore"), ".ascout/\n");
  writeFileSync(join(root, "ascout.config.json"), JSON.stringify({ version: 1, tasks: { typecheck: { command: [process.execPath, "-e", script] } } }));
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Ascout Tree Fixture"]);
  git(root, ["config", "user.email", "tree@example.invalid"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-qm", "baseline"]);
  return root;
}

describe("check with a task that leaves a descendant running", () => {
  it("does not pass a task whose descendant keeps its output pipes open", async () => {
    const root = repository("inherit", true);
    try {
      const { receipt } = await runCheck(root);
      const task = receipt.tasks.find(({ task_id }) => task_id === "typecheck");
      expect(task?.status).toBe("ERROR");
      // A detached descendant leaves the Windows job and the POSIX process group, so no platform
      // can stop it: the task reports that cleanup did not complete.
      expect(task?.reason_code).toBe("process_error");
      expect(task?.reason_text).toContain("cleanup did not complete");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  it.skipIf(!POSIX)("does not pass a task whose descendant detached its output", async () => {
    const root = repository("ignore", false);
    try {
      const { receipt } = await runCheck(root);
      expect(receipt.tasks.find(({ task_id }) => task_id === "typecheck")).toMatchObject({ status: "ERROR", reason_code: "task_tree_escape" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});
