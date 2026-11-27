import type { CheckTaskSandboxV1 } from "../../check.js";
import { prepareLinuxTaskSandboxV1, type LinuxTaskSandboxV1 } from "./linux-task-sandbox.js";
import { prepareMacosTaskSandboxV1, type MacosTaskSandboxV1 } from "./macos-task-sandbox.js";

/**
 * Notice printed after a Linux bubblewrap sandboxed run. Passed Amendment A09 independent AI review
 * (PR #789) with native Ubuntu CI evidence; not externally certified or human-audited.
 */
export const LINUX_SANDBOX_NOTICE =
  "Every task in this run was confined to the Linux bubblewrap sandbox (--sandbox): containment tier T1 on Linux, internally qualified under Amendment A09 (independent AI security review; not externally certified or human-audited). They could write only the repository (not its .git, with .ascout hidden) and this run's task result folders, with no network and an allowlisted environment. Limits: the repository's own files stay writable; a Unix socket a host process placed inside the repository can be reached; /usr and /etc stay readable; there is no seccomp filter (the session keyring is shared) and no CPU or memory limit; after a timeout, the result-folder check can race the sandbox's teardown. Ascout still supports only repositories you trust.";

/**
 * Notice printed after a macOS sandbox-exec sandboxed run. Passed Amendment A09 independent AI
 * review (PR #791) with native macOS 15 CI evidence; not externally certified or human-audited.
 */
export const MACOS_SANDBOX_NOTICE =
  "Every task in this run was confined to the macOS sandbox-exec sandbox (--sandbox): containment tier T1 on macOS, internally qualified under Amendment A09 (independent AI security review; not externally certified or human-audited). They could write only the repository (not its .git, with .ascout unreadable/unwritable) and this run's task result folders, with no network, no Mach/launchd access, and an allowlisted environment; Ascout seals task artifacts into host-only storage after capture. Limits: Apple deprecates sandbox-exec; the repository's own files stay writable; system files outside protected data trees stay readable; there is no PID namespace (detached descendants remain sandboxed) and no CPU or memory limit. Ascout still supports only repositories you trust.";

export interface PreparedTaskSandboxV1 extends CheckTaskSandboxV1 {
  readonly notice: string;
}

export interface TaskSandboxDepsV1 {
  readonly platform: NodeJS.Platform;
  readonly prepareLinux: (workspace: string) => Promise<{ sandbox: LinuxTaskSandboxV1 } | { refused: string }>;
  readonly prepareMacos: (workspace: string) => Promise<{ sandbox: MacosTaskSandboxV1 } | { refused: string }>;
}

const realDeps: TaskSandboxDepsV1 = {
  platform: process.platform,
  prepareLinux: prepareLinuxTaskSandboxV1,
  prepareMacos: prepareMacosTaskSandboxV1,
};

/**
 * Prepares the native OS task sandbox for `workspace`, or returns why `--sandbox` was refused.
 * Never falls back to unsandboxed execution.
 */
export async function prepareTaskSandboxV1(
  workspace: string,
  deps: TaskSandboxDepsV1 = realDeps,
): Promise<{ sandbox: PreparedTaskSandboxV1 } | { refused: string }> {
  if (deps.platform === "linux") {
    const prepared = await deps.prepareLinux(workspace);
    if ("refused" in prepared) return prepared;
    return {
      sandbox: {
        mechanism: prepared.sandbox.mechanism,
        tier: "T1",
        notice: LINUX_SANDBOX_NOTICE,
        wrap: prepared.sandbox.wrap,
      },
    };
  }
  if (deps.platform === "darwin") {
    const prepared = await deps.prepareMacos(workspace);
    if ("refused" in prepared) return prepared;
    return {
      sandbox: {
        mechanism: prepared.sandbox.mechanism,
        tier: "T1",
        notice: MACOS_SANDBOX_NOTICE,
        wrap: prepared.sandbox.wrap,
        dispose: prepared.sandbox.dispose,
      },
    };
  }
  if (deps.platform === "win32") {
    return {
      refused: "the Windows AppContainer task sandbox is not yet wired into --sandbox",
    };
  }
  return {
    refused: `no task sandbox is available for platform ${deps.platform}`,
  };
}
