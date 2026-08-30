import { createRequire } from "node:module";
import { describe, it } from "vitest";

import { runProcess } from "../src/process.js";

interface CrossSpawnSyncObservation {
  readonly file: string;
  readonly argv: readonly string[];
  readonly status: number | null;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

interface CrossSpawnLike {
  sync(
    file: string,
    argv: readonly string[],
    options: import("node:child_process").SpawnSyncOptions,
  ): {
    readonly status: number | null;
    readonly error?: Error;
  };
}

const require = createRequire(import.meta.url);
const crossSpawn = require("cross-spawn") as CrossSpawnLike;

describe("T080 process cleanup diagnostics", () => {
  it.skipIf(process.platform !== "win32")(
    "records the actual taskkill result invoked by runProcess",
    async () => {
      const observations: CrossSpawnSyncObservation[] = [];
      const originalSync = crossSpawn.sync;
      crossSpawn.sync = (file, argv, options) => {
        const result = originalSync(file, argv, options);
        const errorCode = (result.error as NodeJS.ErrnoException | undefined)?.code;
        observations.push({
          file,
          argv: [...argv],
          status: result.status,
          ...(errorCode === undefined ? {} : { errorCode }),
          ...(result.error?.message === undefined ? {} : { errorMessage: result.error.message }),
        });
        return result;
      };

      try {
        const result = await runProcess({
          file: process.execPath,
          argv: ["-e", "setInterval(() => {}, 1000)"],
          cwd: process.cwd(),
          timeout_ms: 100,
          termination_grace_ms: 50,
          capture_cap_bytes: 64 * 1024,
        });
        throw new Error(`T080 internal Windows cleanup: ${JSON.stringify({ result, observations })}`);
      } finally {
        crossSpawn.sync = originalSync;
      }
    },
  );

  it.skipIf(process.platform === "win32")(
    "records the actual process-group signals and probes invoked by runProcess",
    async () => {
      const observations: Array<{
        readonly pid: number;
        readonly signal?: string | number;
        readonly outcome: "success" | "error";
        readonly errorCode?: string;
      }> = [];
      const originalKill = process.kill;
      const wrappedKill: typeof process.kill = (pid, signal) => {
        try {
          const result = originalKill(pid, signal);
          observations.push({ pid, ...(signal === undefined ? {} : { signal }), outcome: "success" });
          return result;
        } catch (error) {
          const errorCode = (error as NodeJS.ErrnoException).code;
          observations.push({
            pid,
            ...(signal === undefined ? {} : { signal }),
            outcome: "error",
            ...(typeof errorCode === "string" ? { errorCode } : {}),
          });
          throw error;
        }
      };
      process.kill = wrappedKill;

      try {
        const result = await runProcess({
          file: process.execPath,
          argv: ["-e", "setInterval(() => {}, 1000)"],
          cwd: process.cwd(),
          timeout_ms: 1,
          termination_grace_ms: 0,
          capture_cap_bytes: 64 * 1024,
        });
        throw new Error(`T080 internal POSIX cleanup: ${JSON.stringify({ result, observations })}`);
      } finally {
        process.kill = originalKill;
      }
    },
  );
});
