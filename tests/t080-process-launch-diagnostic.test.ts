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
    "samples taskkill results for cross-spawn targets with production lifecycle listeners",
    async () => {
      const systemRoot = process.env.SystemRoot;
      if (systemRoot === undefined) throw new Error("T080 diagnostic: SystemRoot is undefined");
      const taskkillPath = pathWin32.join(systemRoot, "System32", "taskkill.exe");
      const observations: Array<{
        readonly status: number | null;
        readonly errorCode?: string;
        readonly childExitCode: number | null;
        readonly childSignal: NodeJS.Signals | null;
      }> = [];

      for (let iteration = 0; iteration < 12; iteration += 1) {
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
        child.stdout?.on("data", () => undefined);
        child.stdout?.on("error", () => undefined);
        child.stderr?.on("data", () => undefined);
        child.stderr?.on("error", () => undefined);
        child.on("error", () => undefined);
        const close = closeObservation(child);
        await waitForSpawn(child);
        const pid = child.pid;
        if (pid === undefined) throw new Error("T080 diagnostic: cross-spawn child PID is undefined");
        await sleep(100);

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
        observations.push({
          status: result.status,
          ...(errorCode === undefined ? {} : { errorCode }),
          childExitCode: closed.exitCode,
          childSignal: closed.signal,
        });
      }

      throw new Error(`T080 taskkill sample: ${JSON.stringify(observations)}`);
    },
  );

  it.skipIf(process.platform === "win32")(
    "samples one-millisecond timeout outcomes on POSIX",
    async () => {
      const observations = [];
      for (let iteration = 0; iteration < 12; iteration += 1) {
        observations.push(await runProcess({
          file: process.execPath,
          argv: ["-e", "setInterval(() => {}, 1000)"],
          cwd: process.cwd(),
          timeout_ms: 1,
          termination_grace_ms: 0,
          capture_cap_bytes: 64 * 1024,
        }));
      }
      throw new Error(`T080 one-millisecond sample: ${JSON.stringify(observations)}`);
    },
  );
});
