import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_COMPLETED_RUN_RETENTION,
  createRunDirectory,
  pruneCompletedRuns,
} from "../src/run.js";

const cleanupRoots = new Set<string>();

async function temporaryDirectory(prefix = "ascout-run-"): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  cleanupRoots.add(path);
  return path;
}

async function readManifest(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
}

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(
    [...cleanupRoots].map(async (path) => {
      await rm(path, { recursive: true, force: true });
      cleanupRoots.delete(path);
    }),
  );
});

describe("T024 run directory lifecycle", () => {
  it("creates one active run directory with manifest, active marker, and raw directory", async () => {
    const root = await temporaryDirectory();
    const canonicalRoot = await realpath(root);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T19:10:00.000Z"));

    const handle = await createRunDirectory(root, "run-001");

    expect(handle.run_id).toBe("run-001");
    expect(handle.run_path).toBe(join(canonicalRoot, ".ascout", "runs", "run-001"));
    expect(handle.raw_path).toBe(join(handle.run_path, "raw"));
    expect(handle.manifest_path).toBe(join(handle.run_path, "manifest.json"));

    expect((await lstat(handle.run_path)).isDirectory()).toBe(true);
    expect((await lstat(handle.raw_path)).isDirectory()).toBe(true);
    expect((await lstat(join(handle.run_path, ".active"))).isFile()).toBe(true);
    expect(await readManifest(handle.manifest_path)).toEqual({
      version: 1,
      run_id: "run-001",
      state: "active",
      started_at: "2026-08-22T19:10:00.000Z",
      completed_at: null,
    });
  });

  it("completes a run before retention and removes only its active marker", async () => {
    const root = await temporaryDirectory();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T19:10:00.000Z"));
    const handle = await createRunDirectory(root, "run-002");

    vi.setSystemTime(new Date("2026-08-22T19:11:00.000Z"));
    const retention = await handle.complete();

    expect(await exists(join(handle.run_path, ".active"))).toBe(false);
    expect((await lstat(handle.raw_path)).isDirectory()).toBe(true);
    expect(await readManifest(handle.manifest_path)).toEqual({
      version: 1,
      run_id: "run-002",
      state: "completed",
      started_at: "2026-08-22T19:10:00.000Z",
      completed_at: "2026-08-22T19:11:00.000Z",
    });
    expect(retention.removed_run_ids).toEqual([]);
    expect(retention.retained_completed_run_ids).toEqual(["run-002"]);
  });

  it("shares concurrent completion and permits safe sequential completion retry", async () => {
    const root = await temporaryDirectory();
    const handle = await createRunDirectory(root, "run-idempotent");

    const first = handle.complete();
    const second = handle.complete();
    expect(second).toBe(first);
    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(secondResult).toEqual(firstResult);

    await expect(handle.complete()).resolves.toMatchObject({
      removed_run_ids: [],
      retained_completed_run_ids: ["run-idempotent"],
    });
    expect(await exists(join(handle.run_path, ".active"))).toBe(false);
  });

  it("enforces the default 20-completed-run bound while preserving an active run", async () => {
    const root = await temporaryDirectory();
    vi.useFakeTimers();

    for (let index = 0; index < DEFAULT_COMPLETED_RUN_RETENTION + 2; index += 1) {
      vi.setSystemTime(new Date(Date.UTC(2026, 7, 22, 19, 0, index)));
      const runId = `completed-${String(index).padStart(2, "0")}`;
      const handle = await createRunDirectory(root, runId);
      await handle.complete();
    }

    vi.setSystemTime(new Date("2026-08-22T20:00:00.000Z"));
    const active = await createRunDirectory(root, "active-current");
    const result = await pruneCompletedRuns(root);
    const entries = (await readdir(join(await realpath(root), ".ascout", "runs"))).sort();

    expect(entries).toHaveLength(DEFAULT_COMPLETED_RUN_RETENTION + 1);
    expect(entries).toContain("active-current");
    expect(entries).not.toContain("completed-00");
    expect(entries).not.toContain("completed-01");
    expect(result.removed_run_ids).toEqual([]);
    expect(result.retained_completed_run_ids).toHaveLength(DEFAULT_COMPLETED_RUN_RETENTION);
    expect(result.preserved_run_ids).toContain("active-current");
    expect(await exists(join(active.run_path, ".active"))).toBe(true);
    expect((await readManifest(active.manifest_path)).state).toBe("active");
  });

  it("never removes a run carrying an active marker even if its manifest is forged completed", async () => {
    const root = await temporaryDirectory();
    const handle = await createRunDirectory(root, "marker-wins");
    const started = (await readManifest(handle.manifest_path)).started_at;

    await writeFile(
      handle.manifest_path,
      `${JSON.stringify({
        version: 1,
        run_id: "marker-wins",
        state: "completed",
        started_at: started,
        completed_at: "2026-08-22T19:12:00.000Z",
      })}\n`,
      "utf8",
    );

    const result = await pruneCompletedRuns(root, 0);

    expect(result.removed_run_ids).toEqual([]);
    expect(result.preserved_run_ids).toContain("marker-wins");
    expect(await exists(handle.run_path)).toBe(true);
    expect(await exists(join(handle.run_path, ".active"))).toBe(true);
  });

  it("preserves malformed and oversized run manifests instead of guessing they are completed", async () => {
    const root = await temporaryDirectory();
    const runs = join(root, ".ascout", "runs");
    await mkdir(join(runs, "malformed"), { recursive: true });
    await mkdir(join(runs, "oversized"));
    await writeFile(join(runs, "malformed", "manifest.json"), "{not-json", "utf8");
    await writeFile(
      join(runs, "oversized", "manifest.json"),
      "x".repeat(16 * 1024 + 1),
      "utf8",
    );

    const result = await pruneCompletedRuns(root, 0);

    expect(result.removed_run_ids).toEqual([]);
    expect(result.preserved_run_ids).toEqual(["malformed", "oversized"]);
    expect(await exists(join(runs, "malformed"))).toBe(true);
    expect(await exists(join(runs, "oversized"))).toBe(true);
  });

  it("rejects duplicate and path-escaping run identifiers without modifying the existing run", async () => {
    const root = await temporaryDirectory();
    const first = await createRunDirectory(root, "same-run");

    await expect(createRunDirectory(root, "same-run")).rejects.toMatchObject({
      code: "run_directory_exists",
    });

    for (const invalidRunId of ["", ".", "..", "../escape", "a/b", "a\\b", "nul\0id"]) {
      await expect(createRunDirectory(root, invalidRunId)).rejects.toMatchObject({
        code: "run_directory_invalid",
      });
    }

    expect((await readManifest(first.manifest_path)).state).toBe("active");
  });

  it("canonicalizes physical repository identity so aliases share one run namespace", async () => {
    const parent = await temporaryDirectory();
    const physical = join(parent, "physical");
    const alias = join(parent, "alias");
    await mkdir(physical);
    await symlink(
      physical,
      alias,
      process.platform === "win32" ? "junction" : "dir",
    );

    const first = await createRunDirectory(physical, "same-physical-run");
    await expect(createRunDirectory(alias, "same-physical-run")).rejects.toMatchObject({
      code: "run_directory_exists",
    });

    expect(await exists(join(alias, ".ascout", "runs", "same-physical-run"))).toBe(true);
    expect((await readManifest(first.manifest_path)).state).toBe("active");
  });

  it("fails closed if .ascout is a symlink or junction instead of writing outside the repository", async () => {
    const parent = await temporaryDirectory();
    const root = join(parent, "repo");
    const outside = join(parent, "outside");
    await mkdir(root);
    await mkdir(outside);
    await symlink(
      outside,
      join(root, ".ascout"),
      process.platform === "win32" ? "junction" : "dir",
    );

    await expect(createRunDirectory(root, "must-not-escape")).rejects.toMatchObject({
      code: "run_directory_unverifiable",
    });
    expect(await exists(join(outside, "runs"))).toBe(false);
  });

  it("rejects missing repository roots and invalid retention bounds without creating paths", async () => {
    const root = await temporaryDirectory();
    const missing = join(root, "missing", "nested");

    await expect(createRunDirectory(missing, "run")).rejects.toMatchObject({
      code: "run_directory_unverifiable",
    });
    expect(await exists(missing)).toBe(false);

    await expect(pruneCompletedRuns(root, -1)).rejects.toMatchObject({
      code: "run_directory_invalid",
    });
    await expect(
      pruneCompletedRuns(root, Number.MAX_SAFE_INTEGER + 1),
    ).rejects.toMatchObject({
      code: "run_directory_invalid",
    });
  });
});
