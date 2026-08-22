import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ProcessControlError,
  runProcess,
  type ProcessRunRequest,
} from "../src/process.js";

const temporaryDirectories: string[] = [];

function request(
  argv: readonly string[],
  overrides: Partial<ProcessRunRequest> = {},
): ProcessRunRequest {
  return {
    file: process.execPath,
    argv,
    cwd: process.cwd(),
    timeout_ms: 5_000,
    termination_grace_ms: 100,
    capture_cap_bytes: 64 * 1024,
    ...overrides,
  };
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("T021 process control", () => {
  it("preserves argv literally without a shell command surface", async () => {
    const literalArgs = [
      "hello world",
      "semi;colon",
      "$(touch should-not-run)",
      "a&b|c>d<e",
      "%TEMP%",
      "^caret",
      'quote"inside',
      "single'quote",
      "C:\\Program Files\\Ascout\\fixture.js",
      "--literal=*.ts",
    ];
    const script = "process.stdout.write(JSON.stringify(process.argv.slice(1)))";

    const result = await runProcess(request(["-e", script, ...literalArgs]));

    expect(result.outcome).toBe("exited");
    expect(result.exit_code).toBe(0);
    expect(result.timed_out).toBe(false);
    expect(result.cleanup_complete).toBe(true);
    expect(JSON.parse(result.stdout.bytes.toString("utf8"))).toEqual(literalArgs);
    expect(result.stderr.observed_bytes).toBe(0);
    expect(result).not.toHaveProperty("argv");
    expect(result).not.toHaveProperty("command_string");
  });

  it("captures stdout/stderr by bytes and keeps draining after the cap", async () => {
    const script = [
      "process.stdout.write(Buffer.from([0x41,0xe2,0x82,0xac,0x42,0x43]));",
      "process.stderr.write(Buffer.from([0x00,0xff,0x01,0x02,0x03]));",
    ].join("");

    const result = await runProcess(request(["-e", script], { capture_cap_bytes: 4 }));

    expect(result.outcome).toBe("exited");
    expect([...result.stdout.bytes]).toEqual([0x41, 0xe2, 0x82, 0xac]);
    expect(result.stdout.captured_bytes).toBe(4);
    expect(result.stdout.observed_bytes).toBe(6);
    expect(result.stdout.truncated).toBe(true);
    expect([...result.stderr.bytes]).toEqual([0x00, 0xff, 0x01, 0x02]);
    expect(result.stderr.captured_bytes).toBe(4);
    expect(result.stderr.observed_bytes).toBe(5);
    expect(result.stderr.truncated).toBe(true);
  });

  it("supports a zero-byte capture cap while still observing drained output", async () => {
    const result = await runProcess(request(
      ["-e", "process.stdout.write('discarded')"],
      { capture_cap_bytes: 0 },
    ));

    expect(result.outcome).toBe("exited");
    expect(result.stdout.bytes.length).toBe(0);
    expect(result.stdout.captured_bytes).toBe(0);
    expect(result.stdout.observed_bytes).toBe(Buffer.byteLength("discarded"));
    expect(result.stdout.truncated).toBe(true);
  });

  it("keeps nonzero repository-command exit distinct from process-control error", async () => {
    const result = await runProcess(request(["-e", "process.exit(7)"]));

    expect(result.outcome).toBe("exited");
    expect(result.exit_code).toBe(7);
    expect(result.timed_out).toBe(false);
    expect(result.cleanup_complete).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("normalizes command launch failure as process-control error output", async () => {
    const result = await runProcess(request([], {
      file: `ascout-command-that-does-not-exist-${process.pid}`,
    }));

    expect(result.outcome).toBe("error");
    expect(result.exit_code).toBeNull();
    expect(result.timed_out).toBe(false);
    expect(result.cleanup_complete).toBe(true);
    expect(result.error?.message.length).toBeGreaterThan(0);
  });

  it("times out and completes platform-appropriate tree cleanup", async () => {
    const result = await runProcess(request(
      ["-e", "setInterval(() => {}, 1000)"],
      { timeout_ms: 100, termination_grace_ms: 50 },
    ));

    expect(result.outcome).toBe("timed_out");
    expect(result.timed_out).toBe(true);
    expect(result.cleanup_complete).toBe(true);
    expect(result.termination_target).toBe(
      process.platform === "win32" ? "native_process_tree" : "process_group",
    );
  });

  it("retains process-tree ownership even with a one-millisecond task timeout", async () => {
    const directory = mkdtempSync(join(tmpdir(), "ascout-t021-fast-timeout-"));
    temporaryDirectories.push(directory);
    const marker = join(directory, "escaped-after-timeout.txt");
    const script = [
      "const fs = require('node:fs');",
      `setTimeout(() => fs.writeFileSync(${JSON.stringify(marker)}, 'leaked'), 800);`,
      "setInterval(() => {}, 1000);",
    ].join("");

    const result = await runProcess(request(
      ["-e", script],
      { cwd: directory, timeout_ms: 1, termination_grace_ms: 0 },
    ));

    expect(result.outcome).toBe("timed_out");
    expect(result.timed_out).toBe(true);
    expect(result.cleanup_complete).toBe(true);
    await sleep(1_000);
    expect(existsSync(marker)).toBe(false);
  });

  it.skipIf(process.platform === "win32")(
    "kills descendants in the dedicated POSIX process group on timeout",
    async () => {
      const directory = mkdtempSync(join(tmpdir(), "ascout-t021-tree-"));
      temporaryDirectories.push(directory);
      const marker = join(directory, "descendant-survived.txt");
      const descendantScript = [
        "const fs = require('node:fs');",
        `setTimeout(() => fs.writeFileSync(${JSON.stringify(marker)}, 'leaked'), 500);`,
        "setInterval(() => {}, 1000);",
      ].join("");
      const parentScript = [
        "const { spawn } = require('node:child_process');",
        `spawn(process.execPath, ['-e', ${JSON.stringify(descendantScript)}], { stdio: 'ignore' });`,
        "setInterval(() => {}, 1000);",
      ].join("");

      const result = await runProcess(request(
        ["-e", parentScript],
        { cwd: directory, timeout_ms: 100, termination_grace_ms: 50 },
      ));

      expect(result.outcome).toBe("timed_out");
      expect(result.cleanup_complete).toBe(true);
      await sleep(700);
      expect(existsSync(marker)).toBe(false);
    },
  );

  it("fails closed on invalid launch/capture/timeout inputs", async () => {
    const invalidRequests = [
      request([], { file: "" }),
      request([], { file: "bad\0file" }),
      request(["bad\0arg"]),
      request([], { cwd: "" }),
      request([], { timeout_ms: 0 }),
      request([], { termination_grace_ms: -1 }),
      request([], { capture_cap_bytes: -1 }),
      request([], { capture_cap_bytes: 1.5 }),
    ];

    for (const invalid of invalidRequests) {
      await expect(runProcess(invalid)).rejects.toBeInstanceOf(ProcessControlError);
    }
  });
});
