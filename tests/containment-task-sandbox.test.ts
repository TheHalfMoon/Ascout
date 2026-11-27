import { createConnection } from "node:net";
import { describe, expect, it, vi } from "vitest";
import { realLoopbackPortV1 as linuxRealLoopbackPort } from "../src/assurance/containment/linux-task-sandbox.js";
import { realLoopbackPortV1 as macosRealLoopbackPort } from "../src/assurance/containment/macos-task-sandbox.js";
import {
  LINUX_SANDBOX_NOTICE,
  MACOS_SANDBOX_NOTICE,
  prepareTaskSandboxV1,
  type TaskSandboxDepsV1,
} from "../src/assurance/containment/task-sandbox.js";
import { isSafeGeneratedArtifactStat } from "../src/check.js";
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

  it("validates generated artifact stats and exercises loopback self-test servers cleanly", async () => {
    expect(isSafeGeneratedArtifactStat({ isFile: () => true, nlink: 1n, size: 100n }, 100)).toBe(true);
    expect(isSafeGeneratedArtifactStat({ isFile: () => false, nlink: 1n, size: 100n }, 100)).toBe(false);
    expect(isSafeGeneratedArtifactStat({ isFile: () => true, nlink: 2n, size: 100n }, 100)).toBe(false);
    expect(isSafeGeneratedArtifactStat({ isFile: () => true, nlink: 1n, size: 101n }, 100)).toBe(false);

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
