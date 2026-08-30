import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { win32 as pathWin32 } from "node:path";
import { describe, expect, it } from "vitest";

import { runProcess } from "../src/process.js";

interface CrossSpawnSyncLike {
  sync(
    file: string,
    argv: readonly string[],
    options: {
      readonly shell: false;
      readonly windowsHide: true;
      readonly stdio: "pipe";
      readonly timeout: number;
      readonly encoding: "utf8";
    },
  ): {
    readonly status: number | null;
    readonly stdout?: string | Buffer | null;
    readonly stderr?: string | Buffer | null;
    readonly error?: Error;
  };
}

const require = createRequire(import.meta.url);
const crossSpawn = require("cross-spawn") as CrossSpawnSyncLike;

function waitForSpawn(child: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
}

function waitForClose(child: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolve) => {
    child.once("close", () => resolve());
  });
}

describe("T080 Windows timeout diagnostic", () => {
  it.skipIf(process.platform !== "win32")(
    "reports the exact timeout cleanup result",
    async () => {
      const result = await runProcess({
        file: process.execPath,
        argv: ["-e", "setInterval(() => {}, 1000)"],
        cwd: process.cwd(),
        timeout_ms: 100,
        termination_grace_ms: 50,
        capture_cap_bytes: 64 * 1024,
      });

      if (result.outcome !== "timed_out") {
        throw new Error(`T080 runProcess diagnostic: ${JSON.stringify(result)}`);
      }
      expect(result.cleanup_complete).toBe(true);
    },
  );

  it.skipIf(process.platform !== "win32")(
    "reports the exact native taskkill result",
    async () => {
      const systemRoot = process.env.SystemRoot;
      if (systemRoot === undefined) throw new Error("T080 diagnostic: SystemRoot is undefined");
      const taskkillPath = pathWin32.join(systemRoot, "System32", "taskkill.exe");
      const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
        windowsHide: true,
        stdio: "ignore",
      });
      await waitForSpawn(child);
      const pid = child.pid;
      if (pid === undefined) throw new Error("T080 diagnostic: child PID is undefined");

      const result = crossSpawn.sync(
        taskkillPath,
        ["/PID", String(pid), "/T", "/F"],
        {
          shell: false,
          windowsHide: true,
          stdio: "pipe",
          timeout: 5_000,
          encoding: "utf8",
        },
      );
      await waitForClose(child);

      const errorCode = (result.error as NodeJS.ErrnoException | undefined)?.code;
      throw new Error(`T080 taskkill diagnostic: ${JSON.stringify({
        status: result.status,
        errorCode,
        errorMessage: result.error?.message,
        stdout: result.stdout?.toString(),
        stderr: result.stderr?.toString(),
      })}`);
    },
  );
});
