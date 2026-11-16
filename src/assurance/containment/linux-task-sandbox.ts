import { posix } from "node:path";

import { findBwrapV1, linuxFsSandboxArgsV1, linuxFsSandboxProbeRunnerV1, realLinuxFsHostV1, workspaceRefusalV1, execFileTextV1, type ExecFileTextV1, type LinuxFsHostV1 } from "./linux-fs-sandbox.js";

/**
 * FD-4 T1 on Linux: the bubblewrap sandbox applied to a `check` task, rather than to a probe.
 *
 * What a task gets:
 * - the repository as its only writable host folder, except `.git`, which is bound read-only so a
 *   task can't plant hooks or configuration that later run on the host;
 * - system folders and the Node install folder, read-only;
 * - a fresh /tmp and a fresh home folder (HOME=/tmp/home), both gone when it ends;
 * - its own empty network namespace (no host loopback, no other hosts, no abstract sockets);
 * - its own PID, IPC, and UTS namespaces, a new session, no capabilities, and death with its parent;
 * - only the environment it is given (the caller passes the allowlisted one).
 *
 * The command must already be an absolute path resolved outside the repository: bubblewrap would
 * otherwise search the task's PATH, which a repository can influence.
 *
 * Known limits:
 * - the repository's own files stay writable, and the user may later run them on the host;
 * - a Unix socket that a host process created inside the repository can be reached;
 * - there is no memory or CPU limit beyond Ascout's timeout and output caps;
 * - system files under /usr and /etc stay readable.
 */

export const SANDBOX_HOME = "/tmp/home";

/**
 * The Node install folder to bind read-only, or null when Node lives in a system folder already
 * visible. It is the folder two levels above the resolved binary (…/bin/node), and is refused when it
 * is a protected host location, the home folder, or an ancestor of either.
 */
export function nodePrefixToBindV1(execPath: string, home: string): string | null {
  if (!posix.isAbsolute(execPath)) throw new Error(`the Node binary must be an absolute path: ${JSON.stringify(execPath)}`);
  if (["/usr/", "/bin/", "/sbin/"].some((prefix) => execPath.startsWith(prefix))) return null;
  const prefix = posix.dirname(posix.dirname(execPath));
  const refusal = workspaceRefusalV1(prefix, home);
  if (refusal !== null) throw new Error(`the Node install folder can't be bound read-only (${refusal}): ${JSON.stringify(prefix)}`);
  return prefix;
}

export interface LinuxTaskSandboxPlanV1 {
  readonly bwrap: string;
  readonly workspace: string;
  readonly nodePrefix: string | null;
  /** The repository's .git folder when it is a folder, bound read-only over the writable workspace. */
  readonly gitDir: string | null;
}

const within = (path: string, parent: string): boolean => path === parent || path.startsWith(`${parent}/`);

/** The bubblewrap command line that runs `file argv` under the task sandbox, starting in `cwd`. */
export function linuxTaskSandboxArgvV1(plan: LinuxTaskSandboxPlanV1, file: string, argv: readonly string[], cwd: string, host: LinuxFsHostV1 = realLinuxFsHostV1): string[] {
  if (!posix.isAbsolute(file)) throw new Error(`a sandboxed command must be an absolute path resolved outside the repository: ${JSON.stringify(file)}`);
  if (posix.normalize(cwd) !== cwd || !within(cwd, plan.workspace)) throw new Error(`a sandboxed task must start inside the repository: ${JSON.stringify(cwd)}`);
  const args = linuxFsSandboxArgsV1(plan.workspace, null, host, "none");
  if (plan.nodePrefix !== null) args.push("--ro-bind", plan.nodePrefix, plan.nodePrefix);
  if (plan.gitDir !== null) args.push("--ro-bind", plan.gitDir, plan.gitDir);
  args.push("--dir", SANDBOX_HOME, "--setenv", "HOME", SANDBOX_HOME, "--cap-drop", "ALL", "--chdir", cwd);
  return [...args, "--", file, ...argv];
}

export interface LinuxTaskSandboxV1 {
  /** The command that runs `file argv` inside the sandbox; the environment is passed unchanged. */
  readonly wrap: (file: string, argv: readonly string[], cwd: string) => { readonly file: string; readonly argv: readonly string[] };
  readonly mechanism: "linux-bubblewrap";
}

export interface LinuxTaskSandboxDepsV1 {
  readonly platform: NodeJS.Platform;
  readonly host: LinuxFsHostV1;
  readonly exec: ExecFileTextV1;
  readonly execPath: string;
}

const realDeps: LinuxTaskSandboxDepsV1 = { platform: process.platform, host: realLinuxFsHostV1, exec: execFileTextV1, execPath: process.execPath };

/**
 * The task sandbox for `workspace`, or why it can't be used. It refuses, never falls back to running
 * unsandboxed: not Linux, no bubblewrap at a fixed location, a refused workspace or Node folder, or a
 * failing isolation self-test (with the network isolated).
 */
export async function prepareLinuxTaskSandboxV1(workspace: string, deps: LinuxTaskSandboxDepsV1 = realDeps): Promise<{ sandbox: LinuxTaskSandboxV1 } | { refused: string }> {
  if (deps.platform !== "linux") return { refused: "the bubblewrap task sandbox is Linux only" };
  const bwrap = findBwrapV1(deps.host);
  if (bwrap === null) return { refused: "bubblewrap is not installed at /usr/bin/bwrap or /bin/bwrap" };
  let plan: LinuxTaskSandboxPlanV1;
  try {
    const home = deps.host.realpath(deps.host.home());
    const root = deps.host.realpath(workspace);
    const refusal = workspaceRefusalV1(root, home);
    if (refusal !== null) return { refused: `${refusal}: ${JSON.stringify(root)}` };
    const gitPath = posix.join(root, ".git");
    const gitDir = deps.host.exists(gitPath) && deps.host.symlinkTarget(gitPath) === null ? gitPath : null;
    plan = { bwrap, workspace: root, nodePrefix: nodePrefixToBindV1(deps.host.realpath(deps.execPath), home), gitDir };
  } catch (error) {
    return { refused: error instanceof Error ? error.message : String(error) };
  }
  const selfTest = await linuxFsSandboxProbeRunnerV1(deps, "none");
  if ("refused" in selfTest) return { refused: selfTest.refused };
  return {
    sandbox: {
      mechanism: "linux-bubblewrap",
      wrap: (file, argv, cwd) => ({ file: bwrap, argv: linuxTaskSandboxArgvV1(plan, file, argv, cwd, deps.host) }),
    },
  };
}
