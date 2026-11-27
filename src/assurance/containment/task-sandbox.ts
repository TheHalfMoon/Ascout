import type { CheckTaskSandboxV1 } from "../../check.js";
import { prepareLinuxTaskSandboxV1, type LinuxTaskSandboxV1 } from "./linux-task-sandbox.js";
import { prepareMacosTaskSandboxV1, type MacosTaskSandboxV1 } from "./macos-task-sandbox.js";
import {
  prepareWindowsTaskSandboxV1,
  type WindowsTaskSandboxDepsV1,
  type WindowsTaskSandboxOptionsV1,
  type WindowsTaskSandboxV1,
} from "./windows-task-sandbox.js";

/**
 * Notice printed after a Linux bubblewrap sandboxed run. Passed Amendment A09 independent AI review
 * (PR #789) with native Ubuntu CI evidence; not externally certified or human-audited.
 */
export const LINUX_SANDBOX_NOTICE =
  "Every task in this run was confined to the Linux bubblewrap sandbox (--sandbox): containment tier T1 on Linux, internally qualified under Amendment A09 (independent AI security review; not externally certified or human-audited). They could write only the repository (not its .git, with .ascout hidden) and this run's task result folders, with no network and an allowlisted environment. Limits: the repository's own files stay writable; a Unix socket a host process placed inside the repository can be reached; /usr and /etc stay readable; there is no seccomp filter (the session keyring is shared) and no CPU or memory limit; after a timeout, the result-folder check can race the sandbox's teardown. Ascout still supports only repositories you trust.";

/**
 * Notice printed after a macOS sandbox-exec sandboxed run. Qualified as containment tier T1 on
 * macOS under Amendment A09 (PR #791 sandbox implementation + PR #796 CLI/sealing wiring and native
 * macOS 15 CI evidence; not externally certified or human-audited).
 */
export const MACOS_SANDBOX_NOTICE =
  "Every task in this run was confined to the macOS sandbox-exec sandbox (--sandbox): containment tier T1 on macOS, internally qualified under Amendment A09 (independent AI security review; not externally certified or human-audited). They could write only the repository (not its .git, with .ascout data unreadable/unwritable) and this run's task result folders, with no network, no Mach/launchd access, and an allowlisted environment; Ascout seals task artifacts into host-only storage after capture. Limits: Apple deprecates sandbox-exec; the repository's own files stay writable; file metadata inside .ascout (names, sizes, mtimes) and system files outside protected data trees stay readable; there is no PID namespace (detached descendants remain sandboxed and could modify task result folders during the brief window before sealing) and no CPU or memory limit. Ascout still supports only repositories you trust.";

/**
 * Notice printed after a Windows AppContainer sandboxed run. Qualified as containment tier T1 on
 * Windows under Amendment A09 (PR #792 AppContainer foundation + Windows AppContainer CLI wiring,
 * hard-link refusal, allowlisted env inside launcher, crash-recovery ACL ledger, Node-side
 * revocation, and native Windows 2025 CI evidence; not externally certified or human-audited).
 */
export const WINDOWS_SANDBOX_NOTICE =
  "Every task in this run was confined to the Windows AppContainer sandbox (--sandbox): containment tier T1 on Windows, internally qualified under Amendment A09 (independent AI security review; not externally certified or human-audited). They could write only the repository (excluding .git, .ascout, reparse points, and hard-linked files) and this run's task result folders (revoked from Node after each task), with no network, a kill-on-close job object, and an allowlisted environment built inside the launcher; Ascout seals task artifacts into host-only storage after capture. Limits: whatever every AppContainer may read (Windows, Program Files, open ACLs) stays readable; the repository's own files stay writable; a folder created at the repository root isn't granted; Node runs with --preserve-symlinks and fs.realpathSync fails; Node child processes started with pipes can hang inside an AppContainer (runners that spawn piped workers fail rather than running unsandboxed); there is no CPU or memory limit; setup requires write access to the Node install entry points' ACLs. Ascout still supports only repositories you trust.";

export interface PreparedTaskSandboxV1 extends CheckTaskSandboxV1 {
  readonly notice: string;
}

export interface TaskSandboxDepsV1 {
  readonly platform: NodeJS.Platform;
  readonly prepareLinux: (workspace: string) => Promise<{ sandbox: LinuxTaskSandboxV1 } | { refused: string }>;
  readonly prepareMacos: (workspace: string) => Promise<{ sandbox: MacosTaskSandboxV1 } | { refused: string }>;
  readonly prepareWindows: (
    workspace: string,
    deps?: WindowsTaskSandboxDepsV1,
    options?: WindowsTaskSandboxOptionsV1,
  ) => Promise<{ sandbox: WindowsTaskSandboxV1 } | { refused: string }>;
}

const realDeps: TaskSandboxDepsV1 = {
  platform: process.platform,
  prepareLinux: prepareLinuxTaskSandboxV1,
  prepareMacos: prepareMacosTaskSandboxV1,
  prepareWindows: prepareWindowsTaskSandboxV1,
};

/**
 * Prepares the native OS task sandbox for `workspace`, or returns why `--sandbox` was refused.
 * Never falls back to unsandboxed execution.
 */
export async function prepareTaskSandboxV1(
  workspace: string,
  deps: TaskSandboxDepsV1 = realDeps,
  options: WindowsTaskSandboxOptionsV1 = {},
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
    const prepared = await deps.prepareWindows(workspace, undefined, options);
    if ("refused" in prepared) return prepared;
    return {
      sandbox: {
        mechanism: prepared.sandbox.mechanism,
        tier: "T1",
        notice: WINDOWS_SANDBOX_NOTICE,
        wrap: prepared.sandbox.wrap,
        afterTask: prepared.sandbox.afterTask,
        dispose: prepared.sandbox.dispose,
      },
    };
  }
  return {
    refused: `no task sandbox is available for platform ${deps.platform}`,
  };
}
