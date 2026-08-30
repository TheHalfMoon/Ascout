import { createRequire } from "node:module";
import { win32 as pathWin32 } from "node:path";
import { describe, it } from "vitest";

import { runProcess } from "../src/process.js";

interface CrossSpawnLike {
  (
    file: string,
    argv: readonly string[],
    options: {
      readonly cwd: string;
      readonly shell: false;
      readonly detached: false;
      readonly windowsHide: true;
      readonly stdio: readonly ["ignore", "pipe", "pipe"];
    },
  ): import("node:child_process").ChildProcess;
  sync(
    file: string,
    argv: readonly string[],
    options: {
      readonly shell: false;
      readonly windowsHide: true;
      readonly stdio: "ignore";
      readonly timeout: number;
    },
  ): {
    readonly status: number | null;
    readonly error?: Error;
  };
}

const require = createRequire(import.meta.url);
const crossSpawn = require("cross-spawn") as CrossSpawnLike;

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function waitForSpawn(child: import("node:child_process").ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
}

function closeObservation(child: import("node:child_process").ChildProcess): Promise<{
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
}> {
  return new Promise((resolve) => {
    child.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
  });
}

describe("T080 process launch diagnostics", () => {
  it.skipIf(process.platform !== "win32")(
    "reports taskkill result for a cross-spawn target after the production timeout interval",
    async () => {
      const child = crossSpawn(
        process.execPath,
        ["-e", "setInterval(() => {}, 1000)"],
        {
          cwd: process.cwd(),
          shell: false,
          detached: false,
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      const close = closeObservation(child);
      await waitForSpawn(child);
      const pid = child.pid;
      if (pid === undefined) throw new Error("T080 diagnostic: cross-spawn child PID is undefined");
      await sleep(100);

      const systemRoot = process.env.SystemRoot;
      if (systemRoot === undefined) throw new Error("T080 diagnostic: SystemRoot is undefined");
      const taskkillPath = pathWin32.join(systemRoot, "System32", "taskkill.exe");
      const result = crossSpawn.sync(
        taskkillPath,
        ["/PID", String(pid), "/T", "/F"],
        {
          shell: false,
          windowsHide: true,
          stdio: "ignore",
          timeout: 5_000,
        },
      );
      const closed = await close;
      const errorCode = (result.error as NodeJS.ErrnoException | undefined)?.code;
      throw new Error(`T080 cross-spawn taskkill diagnostic: ${JSON.stringify({
        status: result.status,
        errorCode,
        errorMessage: result.error?.message,
        childExitCode: closed.exitCode,
        childSignal: closed.signal,
      })}`);
    },
  );

  it.skipIf(process.platform === "win32")(
    "reports the full one-millisecond timeout result on POSIX",
    async () => {
      const result = await runProcess({
        file: process.execPath,
        argv: ["-e", "setInterval(() => {}, 1000)"],
        cwd: process.cwd(),
        timeout_ms: 1,
        termination_grace_ms: 0,
        capture_cap_bytes: 64 * 1024,
      });
      throw new Error(`T080 one-millisecond diagnostic: ${JSON.stringify(result)}`);
    },
  );
});
