import { closeSync, linkSync, mkdirSync, mkdtempSync, openSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { realLoopbackPortV1 as linuxRealLoopbackPort } from "../src/assurance/containment/linux-task-sandbox.js";
import { realLoopbackPortV1 as macosRealLoopbackPort } from "../src/assurance/containment/macos-task-sandbox.js";
import {
  LINUX_SANDBOX_NOTICE,
  MACOS_SANDBOX_NOTICE,
  prepareTaskSandboxV1,
  type TaskSandboxDepsV1,
} from "../src/assurance/containment/task-sandbox.js";
import {
  isBoundSingleFileV1,
  isSafeGeneratedArtifactStat,
  jestSelectedNoTest,
  openManagedGeneratedArtifact,
  readBoundedFdBytesV1,
  readSafeBoundedArtifactTextV1,
  vitestSelectedNoTest,
} from "../src/check.js";
import { buildCheckContainmentOptions, logTaskContainmentNotice, runWithOptionalTaskSandbox } from "../src/cli.js";

function depsFor(
  platform: NodeJS.Platform,
  overrides: Partial<Omit<TaskSandboxDepsV1, "platform">> = {},
): TaskSandboxDepsV1 {
  return {
    platform,
    prepareLinux: vi.fn(async () => ({ refused: "linux unused" })),
    prepareMacos: vi.fn(async () => ({ refused: "macos unused" })),
    ...overrides,
  };
}

describe("OS task sandbox dispatcher (prepareTaskSandboxV1)", () => {
  it("dispatches linux to bubblewrap with T1 notice and propagates refusals", async () => {
    const wrap = vi.fn(() => ({ file: "/usr/bin/bwrap", argv: [] }));
    const ok = await prepareTaskSandboxV1("/repo", depsFor("linux", {
      prepareLinux: async () => ({ sandbox: { mechanism: "linux-bubblewrap", wrap } }),
    }));
    expect("sandbox" in ok).toBe(true);
    if ("sandbox" in ok) {
      expect(ok.sandbox.mechanism).toBe("linux-bubblewrap");
      expect(ok.sandbox.tier).toBe("T1");
      expect(ok.sandbox.notice).toBe(LINUX_SANDBOX_NOTICE);
      expect(ok.sandbox.wrap).toBe(wrap);
    }

    const refused = await prepareTaskSandboxV1("/repo", depsFor("linux", {
      prepareLinux: async () => ({ refused: "bwrap missing" }),
    }));
    expect(refused).toEqual({ refused: "bwrap missing" });
  });

  it("dispatches darwin to sandbox-exec with T1 notice, dispose hook, and propagates refusals", async () => {
    const wrap = vi.fn(() => ({ file: "/usr/bin/sandbox-exec", argv: [] }));
    const dispose = vi.fn();
    const ok = await prepareTaskSandboxV1("/repo", depsFor("darwin", {
      prepareMacos: async () => ({ sandbox: { mechanism: "macos-sandbox-exec", wrap, dispose } }),
    }));
    expect("sandbox" in ok).toBe(true);
    if ("sandbox" in ok) {
      expect(ok.sandbox.mechanism).toBe("macos-sandbox-exec");
      expect(ok.sandbox.tier).toBe("T1");
      expect(ok.sandbox.notice).toBe(MACOS_SANDBOX_NOTICE);
      expect(ok.sandbox.wrap).toBe(wrap);
      await ok.sandbox.dispose?.();
      expect(dispose).toHaveBeenCalledTimes(1);
    }

    const refused = await prepareTaskSandboxV1("/repo", depsFor("darwin", {
      prepareMacos: async () => ({ refused: "sandbox-exec missing" }),
    }));
    expect(refused).toEqual({ refused: "sandbox-exec missing" });
  });

  it("refuses win32 (until AppContainer wiring) and unsupported platforms without fallback", async () => {
    const win = await prepareTaskSandboxV1("C:\\repo", depsFor("win32"));
    expect(win).toEqual({ refused: "the Windows AppContainer task sandbox is not yet wired into --sandbox" });

    const other = await prepareTaskSandboxV1("/repo", depsFor("freebsd"));
    expect(other).toEqual({ refused: "no task sandbox is available for platform freebsd" });

    // Direct call using default realDeps against a non-existent path refuses cleanly on every OS.
    const defaultResult = await prepareTaskSandboxV1(join(tmpdir(), `ascout-missing-${Date.now()}`));
    expect("refused" in defaultResult).toBe(true);
  });

  it("manages optional sandbox lifecycle, disposal on throw, containment options, and notices", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const disabled = await runWithOptionalTaskSandbox(false, "check", "/repo", async (sb) => {
        expect(sb).toBeUndefined();
        return 42;
      });
      expect(disabled).toEqual({ ok: true, value: 42, notice: null });

      const refused = await runWithOptionalTaskSandbox(
        true,
        "test",
        "/repo",
        async () => 1,
        async () => ({ refused: "sandbox unavailable" }),
      );
      expect(refused).toEqual({ ok: false });
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("ascout test --sandbox refused: sandbox unavailable"));

      const dispose = vi.fn(async () => undefined);
      const wrap = vi.fn(() => ({ file: "/usr/bin/sandbox-exec", argv: [] }));
      const sandbox = { mechanism: "macos-sandbox-exec", tier: "T1" as const, notice: MACOS_SANDBOX_NOTICE, wrap, dispose };
      const linuxSandboxNoDispose = { mechanism: "linux-bubblewrap", tier: "T1" as const, notice: LINUX_SANDBOX_NOTICE, wrap };

      const linuxOk = await runWithOptionalTaskSandbox(
        true,
        "check",
        "/repo",
        async (sb) => {
          expect(sb).toBe(linuxSandboxNoDispose);
          return "linux-done";
        },
        async () => ({ sandbox: linuxSandboxNoDispose }),
      );
      expect(linuxOk).toEqual({ ok: true, value: "linux-done", notice: LINUX_SANDBOX_NOTICE });

      const ok = await runWithOptionalTaskSandbox(
        true,
        "test",
        "/repo",
        async (sb) => {
          expect(sb).toBe(sandbox);
          return "done";
        },
        async () => ({ sandbox }),
      );
      expect(ok).toEqual({ ok: true, value: "done", notice: MACOS_SANDBOX_NOTICE });
      expect(dispose).toHaveBeenCalledTimes(1);

      await expect(
        runWithOptionalTaskSandbox(
          true,
          "check",
          "/repo",
          async () => {
            throw new Error("boom");
          },
          async () => ({ sandbox }),
        ),
      ).rejects.toThrow("boom");
      expect(dispose).toHaveBeenCalledTimes(2);

      // If run throws AND dispose throws, the primary run error must still propagate intact.
      const failingDispose = vi.fn(async () => {
        throw new Error("cleanup failed");
      });
      await expect(
        runWithOptionalTaskSandbox(
          true,
          "check",
          "/repo",
          async () => {
            throw new Error("primary security error");
          },
          async () => ({ sandbox: { ...sandbox, dispose: failingDispose } }),
        ),
      ).rejects.toThrow("primary security error");
      expect(failingDispose).toHaveBeenCalledTimes(1);

      const env = { PATH: "/usr/bin" };
      expect(buildCheckContainmentOptions(undefined, undefined)).toEqual({});
      expect(buildCheckContainmentOptions(env, sandbox)).toEqual({ taskEnvironment: env, taskSandbox: sandbox });

      errSpy.mockClear();
      logTaskContainmentNotice(MACOS_SANDBOX_NOTICE, true);
      expect(errSpy).toHaveBeenCalledWith(MACOS_SANDBOX_NOTICE);
      errSpy.mockClear();
      logTaskContainmentNotice(null, true);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("--clean-env"));
      errSpy.mockClear();
      logTaskContainmentNotice(null, false);
      expect(errSpy).not.toHaveBeenCalled();
    } finally {
      errSpy.mockRestore();
    }
  });

  it("validates generated artifact stats, safe bounded reads, and loopback self-test servers cleanly", async () => {
    expect(isSafeGeneratedArtifactStat({ isFile: () => true, nlink: 1n, size: 100n }, 100)).toBe(true);
    expect(isSafeGeneratedArtifactStat({ isFile: () => false, nlink: 1n, size: 100n }, 100)).toBe(false);
    expect(isSafeGeneratedArtifactStat({ isFile: () => true, nlink: 2n, size: 100n }, 100)).toBe(false);
    expect(isSafeGeneratedArtifactStat({ isFile: () => true, nlink: 1n, size: 101n }, 100)).toBe(false);

    const okOpened = { isFile: () => true, dev: 1n, ino: 2n, nlink: 1n, size: 10n };
    const okCurrent = { dev: 1n, ino: 2n, nlink: 1n };
    expect(isBoundSingleFileV1({ expectedPath: "/a/b", realPath: "/a/b", opened: okOpened, current: okCurrent, maxBytes: 100 })).toBe(true);
    expect(isBoundSingleFileV1({ expectedPath: "/a/b", realPath: "/c/d", opened: okOpened, current: okCurrent, maxBytes: 100 })).toBe(false);
    expect(isBoundSingleFileV1({ expectedPath: "/a/b", realPath: "/a/b", opened: okOpened, current: { dev: 9n, ino: 2n, nlink: 1n }, maxBytes: 100 })).toBe(false);
    expect(isBoundSingleFileV1({ expectedPath: "/a/b", realPath: "/a/b", opened: okOpened, current: { dev: 1n, ino: 9n, nlink: 1n }, maxBytes: 100 })).toBe(false);
    expect(isBoundSingleFileV1({ expectedPath: "/a/b", realPath: "/a/b", opened: okOpened, current: { dev: 1n, ino: 2n, nlink: 2n }, maxBytes: 100 })).toBe(false);

    const dir = mkdtempSync(join(tmpdir(), "ascout-safe-read-"));
    try {
      const okFile = join(dir, "ok.txt");
      writeFileSync(okFile, "hello");
      expect(readSafeBoundedArtifactTextV1(dir, "ok.txt", 32)).toEqual({ kind: "ok", text: "hello" });
      expect(readSafeBoundedArtifactTextV1(dir, "missing.txt", 32)).toEqual({ kind: "missing" });
      expect(readSafeBoundedArtifactTextV1(dir, "ok.txt", 2)).toEqual({ kind: "unsafe" });
      expect(readSafeBoundedArtifactTextV1(dir, "ok.txt", 32, () => null)).toEqual({ kind: "unsafe" });

      // Hard-linked file fails single-link verification.
      const extraLink = join(dir, "extra.txt");
      linkSync(okFile, extraLink);
      expect(readSafeBoundedArtifactTextV1(dir, "ok.txt", 32)).toEqual({ kind: "unsafe" });
      rmSync(extraLink);

      // readBoundedFdBytesV1 returns null when descriptor exceeds maxBytes.
      const fd = openSync(okFile, "r");
      try {
        expect(readBoundedFdBytesV1(fd, 2)).toBeNull();
        expect(readBoundedFdBytesV1(fd, 10)?.toString("utf8")).toBe("hello");
      } finally {
        closeSync(fd);
      }

      // Opening a directory returns unsafe (EPERM on Windows, !isFile on POSIX); symlink hits ELOOP on POSIX.
      const subDir = join(dir, "sub");
      mkdirSync(subDir);
      expect(readSafeBoundedArtifactTextV1(dir, "sub", 32)).toEqual({ kind: "unsafe" });
      if (process.platform !== "win32") {
        symlinkSync(okFile, join(dir, "sym.txt"));
        expect(readSafeBoundedArtifactTextV1(dir, "sym.txt", 32)).toEqual({ kind: "unsafe" });
      }

      // openManagedGeneratedArtifact rethrows non-ELOOP open errors (e.g. ENOENT).
      expect(() => openManagedGeneratedArtifact(dir, "missing.json")).toThrow();

      // vitestSelectedNoTest and jestSelectedNoTest use readSafeBoundedArtifactTextV1 cleanly.
      const runId = "run-safe-1";
      expect(vitestSelectedNoTest(runId, dir, { machineResultPath: "bad/path.json" })).toBe(false);
      expect(vitestSelectedNoTest(runId, dir, { machineResultPath: `.ascout/runs/${runId}/missing.json` })).toBe(true);
      expect(vitestSelectedNoTest(runId, dir, { machineResultPath: `.ascout/runs/${runId}/sub` })).toBe(false);
      writeFileSync(join(dir, "vitest-zero.json"), JSON.stringify({ numTotalTests: 0, testResults: [] }));
      expect(vitestSelectedNoTest(runId, dir, { machineResultPath: `.ascout/runs/${runId}/vitest-zero.json` })).toBe(true);

      expect(jestSelectedNoTest(runId, dir, { machineResultPath: `.ascout/runs/${runId}/missing.json` })).toBe(false);
      writeFileSync(
        join(dir, "jest-zero.json"),
        JSON.stringify({ numTotalTests: 0, numTotalTestSuites: 0, numFailedTestSuites: 0, numRuntimeErrorTestSuites: 0, testResults: [] }),
      );
      expect(jestSelectedNoTest(runId, dir, { machineResultPath: `.ascout/runs/${runId}/jest-zero.json` })).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }

    for (const startServer of [linuxRealLoopbackPort, macosRealLoopbackPort]) {
      const loopback = await startServer();
      expect(loopback).not.toBeNull();
      try {
        const received = await new Promise<string>((resolve, reject) => {
          const client = createConnection(loopback!.port, "127.0.0.1");
          let text = "";
          client.setEncoding("utf8");
          client.on("data", (chunk) => { text += chunk; });
          client.on("end", () => resolve(text));
          client.on("error", reject);
        });
        expect(received).toBe("host");
      } finally {
        loopback?.close();
      }
    }
  });
});
