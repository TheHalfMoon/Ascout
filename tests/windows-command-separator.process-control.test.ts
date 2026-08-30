import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  ProcessControlError,
  runProcess,
  type ProcessRunRequest,
} from "../src/process.js";
import { writeNodeCommandShim } from "./helpers/native-command-shim.js";

const temporaryDirectories: string[] = [];

function request(
  file: string,
  argv: readonly string[],
  cwd: string,
): ProcessRunRequest {
  return {
    file,
    argv,
    cwd,
    timeout_ms: 5_000,
    termination_grace_ms: 100,
    capture_cap_bytes: 64 * 1024,
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("T080 Windows command-separator boundary", () => {
  it.skipIf(process.platform !== "win32")(
    "rejects CR and LF argv independently before a native command shim launches",
    async () => {
      for (const [label, separator] of [["CR", "\r"], ["LF", "\n"]] as const) {
        const directory = mkdtempSync(join(tmpdir(), `ascout-t080-${label.toLowerCase()}-argv-`));
        temporaryDirectories.push(directory);
        const marker = join(directory, "shim-launched.txt");
        const shim = writeNodeCommandShim(
          join(directory, "node_modules", ".bin"),
          "must-not-launch",
          `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'launched')`,
        );

        await expect(runProcess(request(
          shim,
          [`safe${separator}echo injected`],
          directory,
        ))).rejects.toBeInstanceOf(ProcessControlError);
        expect(existsSync(marker)).toBe(false);
      }
    },
  );

  it.skipIf(process.platform !== "win32")(
    "rejects CR and LF command paths independently before a native command shim launches",
    async () => {
      for (const [label, separator] of [["CR", "\r"], ["LF", "\n"]] as const) {
        const directory = mkdtempSync(join(tmpdir(), `ascout-t080-${label.toLowerCase()}-file-`));
        temporaryDirectories.push(directory);
        const marker = join(directory, "shim-launched.txt");
        const shim = writeNodeCommandShim(
          join(directory, "node_modules", ".bin"),
          "must-not-launch",
          `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'launched')`,
        );

        await expect(runProcess(request(
          `${shim}${separator}suffix`,
          [],
          directory,
        ))).rejects.toBeInstanceOf(ProcessControlError);
        expect(existsSync(marker)).toBe(false);
      }
    },
  );
});
