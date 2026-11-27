import { execFileSync } from "node:child_process";
import { closeSync, linkSync, mkdirSync, mkdtempSync, openSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { realLoopbackPortV1 as linuxRealLoopbackPort } from "../src/assurance/containment/linux-task-sandbox.js";
import { realLoopbackPortV1 as macosRealLoopbackPort } from "../src/assurance/containment/macos-task-sandbox.js";
import {
  LINUX_SANDBOX_NOTICE,
  MACOS_SANDBOX_NOTICE,
  WINDOWS_SANDBOX_NOTICE,
  prepareTaskSandboxV1,
  type TaskSandboxDepsV1,
} from "../src/assurance/containment/task-sandbox.js";
import {
  TaskSandboxRefusedError,
  isBoundSingleFileV1,
  isSafeGeneratedArtifactStat,
  jestSelectedNoTest,
  openManagedGeneratedArtifact,
  readBoundedFdBytesV1,
  readSafeBoundedArtifactTextV1,
  runCheck,
  vitestSelectedNoTest,
} from "../src/check.js";
import { buildCheckContainmentOptions, logTaskContainmentNotice, runWithOptionalTaskSandbox } from "../src/cli.js";
import { acquireRunLock } from "../src/lock.js";

function depsFor(
  platform: NodeJS.Platform,
  overrides: Partial<Omit<TaskSandboxDepsV1, "platform">> = {},
): TaskSandboxDepsV1 {
  return {
    platform,
    prepareLinux: vi.fn(async () => ({ refused: "linux unused" })),
    prepareMacos: vi.fn(async () => ({ refused: "macos unused" })),
    prepareWindows: vi.fn(async () => ({ refused: "windows unused" })),
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

  it("dispatches win32 to AppContainer with T1 notice, afterTask, dispose, passEnv, and refuses unsupported platforms without fallback", async () => {
    const wrap = vi.fn(() => ({ file: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", argv: [] }));
    const afterTask = vi.fn(async () => undefined);
    const dispose = vi.fn(async () => undefined);
    const prepareWindows = vi.fn(async () => ({
      sandbox: { mechanism: "windows-appcontainer" as const, wrap, afterTask, dispose },
    }));
    const winOk = await prepareTaskSandboxV1(
      "C:\\repo",
      depsFor("win32", { prepareWindows }),
      { passEnv: ["CUSTOM_TOKEN"] },
    );
    expect("sandbox" in winOk).toBe(true);
    expect(prepareWindows).toHaveBeenCalledWith("C:\\repo", undefined, { passEnv: ["CUSTOM_TOKEN"] });
    if ("sandbox" in winOk) {
      expect(winOk.sandbox.mechanism).toBe("windows-appcontainer");
      expect(winOk.sandbox.tier).toBe("T1");
      expect(winOk.sandbox.notice).toBe(WINDOWS_SANDBOX_NOTICE);
      expect(winOk.sandbox.wrap).toBe(wrap);
      await winOk.sandbox.afterTask?.(["C:\\repo\\.ascout\\runs\\r1\\raw\\test"]);
      expect(afterTask).toHaveBeenCalledTimes(1);
      await winOk.sandbox.dispose?.();
      expect(dispose).toHaveBeenCalledTimes(1);
    }

    const winRefused = await prepareTaskSandboxV1(
      "C:\\repo",
      depsFor("win32", { prepareWindows: async () => ({ refused: "AppContainer unavailable" }) }),
    );
    expect(winRefused).toEqual({ refused: "AppContainer unavailable" });

    const other = await prepareTaskSandboxV1("/repo", depsFor("freebsd"));
    expect(other).toEqual({ refused: "no task sandbox is available for platform freebsd" });

    // Direct call using default realDeps against a non-existent path refuses cleanly on every OS.
    const defaultResult = await prepareTaskSandboxV1(join(tmpdir(), `ascout-missing-${Date.now()}`));
    expect("refused" in defaultResult).toBe(true);
  });

  it("manages optional sandbox lifecycle under run.lock, disposal on throw, containment options, and notices", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const disabled = await runWithOptionalTaskSandbox(false, "check", "/repo", async (prepareCb) => {
        expect(prepareCb).toBeUndefined();
        return 42;
      });
      expect(disabled).toEqual({ ok: true, value: 42, notice: null });

      const refusedPrepare = vi.fn(async () => ({ refused: "sandbox unavailable" }));
      const refused = await runWithOptionalTaskSandbox(
        true,
        "test",
        "/repo",
        async (prepareCb) => {
          const outcome = await prepareCb!("/repo");
          if ("refused" in outcome) throw new TaskSandboxRefusedError(outcome.refused);
          return 1;
        },
        refusedPrepare,
      );
      expect(refused).toEqual({ ok: false });
      expect(refusedPrepare).toHaveBeenCalledWith("/repo");
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("ascout test --sandbox refused: sandbox unavailable"));

      const dispose = vi.fn(async () => undefined);
      const wrap = vi.fn(() => ({ file: "/usr/bin/sandbox-exec", argv: [] }));
      const sandbox = { mechanism: "macos-sandbox-exec", tier: "T1" as const, notice: MACOS_SANDBOX_NOTICE, wrap, dispose };
      const linuxSandboxNoDispose = { mechanism: "linux-bubblewrap", tier: "T1" as const, notice: LINUX_SANDBOX_NOTICE, wrap };

      const linuxPrepare = vi.fn(async () => ({ sandbox: linuxSandboxNoDispose }));
      const linuxOk = await runWithOptionalTaskSandbox(
        true,
        "check",
        "/repo",
        async (prepareCb) => {
          const outcome = await prepareCb!("/repo");
          expect(outcome).toEqual({ sandbox: linuxSandboxNoDispose });
          return "linux-done";
        },
        linuxPrepare,
      );
      expect(linuxOk).toEqual({ ok: true, value: "linux-done", notice: LINUX_SANDBOX_NOTICE });
      expect(linuxPrepare).toHaveBeenCalledWith("/repo");

      const passEnvPrepare = vi.fn(async () => ({ sandbox }));
      const withPassEnv = await runWithOptionalTaskSandbox(
        true,
        "test",
        "/repo",
        async (prepareCb) => {
          const outcome = await prepareCb!("/repo");
          expect(outcome).toEqual({ sandbox });
          return "done";
        },
        passEnvPrepare,
        ["EXTRA_FLAG"],
      );
      expect(withPassEnv).toEqual({ ok: true, value: "done", notice: MACOS_SANDBOX_NOTICE });
      expect(passEnvPrepare).toHaveBeenCalledWith("/repo", undefined, { passEnv: ["EXTRA_FLAG"] });

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

      // Verify runCheck acquires .ascout/run.lock BEFORE calling prepareTaskSandbox, disposes on
      // success and failure (preserving the primary error even if dispose throws), and skips
      // prepareTaskSandbox when the lock is already held by another run.
      const repo = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-lock-sb-")));
      try {
        const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, stdio: "ignore" });
        git("init", "-q");
        git("config", "user.name", "t");
        git("config", "user.email", "t@example.invalid");
        git("config", "commit.gpgsign", "false");
        writeFileSync(join(repo, "a.txt"), "ok\n");
        git("add", ".");
        git("commit", "-qm", "init");

        const held = await acquireRunLock(repo);
        const neverCalled = vi.fn(async () => ({ sandbox }));
        try {
          await expect(runCheck(repo, { prepareTaskSandbox: neverCalled })).rejects.toThrow(/run\.lock/u);
          expect(neverCalled).not.toHaveBeenCalled();
        } finally {
          await held.release();
        }

        // Refused prepareTaskSandbox throws TaskSandboxRefusedError and releases the lock.
        await expect(
          runCheck(repo, { prepareTaskSandbox: async () => ({ refused: "denied under lock" }) }),
        ).rejects.toThrow(TaskSandboxRefusedError);

        // Accepted sandbox with no dispose completes cleanly.
        const okLinux = await runCheck(repo, {
          prepareTaskSandbox: async () => ({ sandbox: linuxSandboxNoDispose }),
        });
        expect(okLinux.receipt.summary.exit_code).toBe(4);

        // Accepted sandbox with dispose calls dispose after body finishes.
        const okDispose = vi.fn(async () => undefined);
        await runCheck(repo, {
          prepareTaskSandbox: async () => ({ sandbox: { ...sandbox, dispose: okDispose } }),
        });
        expect(okDispose).toHaveBeenCalledTimes(1);

        // Body failure disposes sandbox and preserves primary error even when dispose throws.
        writeFileSync(join(repo, "ascout.config.json"), "{invalid json");
        const failDisposeOk = vi.fn(async () => undefined);
        await expect(
          runCheck(repo, {
            prepareTaskSandbox: async () => ({ sandbox: { ...sandbox, dispose: failDisposeOk } }),
          }),
        ).rejects.toThrow();
        expect(failDisposeOk).toHaveBeenCalledTimes(1);

        const failDisposeThrow = vi.fn(async () => {
          throw new Error("dispose exploded");
        });
        await expect(
          runCheck(repo, {
            prepareTaskSandbox: async () => ({ sandbox: { ...sandbox, dispose: failDisposeThrow } }),
          }),
        ).rejects.toThrow(/ascout\.config\.json|JSON/iu);
        expect(failDisposeThrow).toHaveBeenCalledTimes(1);
      } finally {
        rmSync(repo, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      }

      const env = { PATH: "/usr/bin" };
      const prepareCb = async () => ({ sandbox });
      expect(buildCheckContainmentOptions(undefined, undefined)).toEqual({});
      expect(buildCheckContainmentOptions(env, prepareCb)).toEqual({ taskEnvironment: env, prepareTaskSandbox: prepareCb });

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
  }, 120_000);

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
