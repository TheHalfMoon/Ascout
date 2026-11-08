import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runCheck, taskStatusFromProcess } from "../src/check.js";
import { withRunCancellation } from "../src/cli.js";
import { validateReceiptSemantics } from "../src/receipt/model.js";

function git(root: string, argv: readonly string[]): void {
  const result = spawnSync("git", argv, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${argv.join(" ")} failed: ${result.stderr}`);
}

/** Writes `started` at once and `finished` after a few seconds, unless it is stopped first. */
function sleeper(started: string, finished: string): readonly string[] {
  return [process.execPath, "-e", [
    `require("node:fs").writeFileSync(${JSON.stringify(started)}, "")`,
    `setTimeout(() => require("node:fs").writeFileSync(${JSON.stringify(finished)}, ""), 4000)`,
  ].join(";")];
}

function repository(): { root: string; markers: string } {
  const scratch = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-cancel-")));
  const root = join(scratch, "repo");
  const markers = join(scratch, "markers");
  for (const dir of [root, markers]) spawnSync(process.execPath, ["-e", `require("node:fs").mkdirSync(${JSON.stringify(dir)})`]);
  writeFileSync(join(root, ".gitignore"), ".ascout/\n");
  writeFileSync(join(root, "ascout.config.json"), JSON.stringify({
    version: 1,
    tasks: {
      typecheck: { command: sleeper(join(markers, "typecheck-started"), join(markers, "typecheck-finished")) },
      lint: { command: sleeper(join(markers, "lint-started"), join(markers, "lint-finished")) },
    },
  }));
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Ascout Cancel Fixture"]);
  git(root, ["config", "user.email", "cancel@example.invalid"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-qm", "baseline"]);
  return { root, markers };
}

const cleanup: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of cleanup.splice(0)) rmSync(join(dir, ".."), { recursive: true, force: true });
});

describe("taskStatusFromProcess with a cancelled run", () => {
  it("records a cancelled task as ERROR task_cancelled", () => {
    expect(taskStatusFromProcess({ outcome: "cancelled", exit_code: null, signal: null, timed_out: false, cleanup_complete: true }, 1000))
      .toMatchObject({ status: "ERROR", reasonCode: "task_cancelled" });
  });
});

describe("runCheck cancellation", () => {
  it("stops the running task and starts no other", async () => {
    const { root, markers } = repository();
    cleanup.push(root);
    const controller = new AbortController();
    const watcher = setInterval(() => {
      if (existsSync(join(markers, "typecheck-started")) || existsSync(join(markers, "lint-started"))) controller.abort();
    }, 50);
    try {
      const { receipt } = await runCheck(root, { signal: controller.signal });
      const statuses = receipt.tasks.filter(({ task_id }) => task_id === "typecheck" || task_id === "lint");
      expect(statuses.map(({ status, reason_code }) => [status, reason_code])).toEqual([
        ["ERROR", "task_cancelled"],
        ["ERROR", "task_cancelled"],
      ]);
      expect(receipt.summary.exit_code).toBe(2);
      expect(validateReceiptSemantics(receipt)).toEqual({ valid: true, issues: [] });
      // Only the first task started, and it was stopped before it finished.
      const started = ["typecheck-started", "lint-started"].filter((name) => existsSync(join(markers, name)));
      expect(started).toHaveLength(1);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      expect(existsSync(join(markers, "typecheck-finished")) || existsSync(join(markers, "lint-finished"))).toBe(false);
    } finally {
      clearInterval(watcher);
    }
  }, 60_000);

  it("starts nothing when the run is already cancelled", async () => {
    const { root, markers } = repository();
    cleanup.push(root);
    const controller = new AbortController();
    controller.abort();
    const { receipt } = await runCheck(root, { signal: controller.signal });
    expect(receipt.tasks.filter(({ reason_code }) => reason_code === "task_cancelled").length).toBeGreaterThanOrEqual(2);
    expect(existsSync(join(markers, "typecheck-started")) || existsSync(join(markers, "lint-started"))).toBe(false);
  }, 30_000);
});

describe("withRunCancellation", () => {
  it("cancels on the first signal, exits on the second, and removes its handlers", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const before = process.listenerCount("SIGINT");
    let aborted = false;
    await withRunCancellation(async (signal) => {
      process.emit("SIGINT");
      aborted = signal.aborted;
      process.emit("SIGTERM");
    });
    expect(aborted).toBe(true);
    expect(exit).toHaveBeenCalledWith(2);
    expect(process.listenerCount("SIGINT")).toBe(before);
  });
});
