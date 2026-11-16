import { posix } from "node:path";

import { execFileTextV1, realLinuxFsHostV1, type ExecFileTextV1, type LinuxFsHostV1 } from "./linux-fs-sandbox.js";
import { SANDBOX_EXEC, UNREADABLE_DATA_TREES, macosFsSandboxProbeRunnerV1, macosWorkspaceRefusalV1 } from "./macos-fs-sandbox.js";

/**
 * FD-4 T1 on macOS: the `sandbox-exec` profile applied to a `check` task, rather than to a probe.
 *
 * What a task gets:
 * - the repository as its only writable host folder, except `.git`, which stays read-only so a task
 *   can't plant hooks or configuration that later run on the host;
 * - a private temporary folder, which is also its home folder (HOME and TMPDIR), removed after the run;
 * - no reads under the folders where user and temporary data lives, except the repository, the
 *   private folder, and the Node install folder;
 * - no network, no system-service lookups, and no signals to any process but itself and its own
 *   descendants;
 * - only the environment it is given, plus HOME and TMPDIR.
 *
 * Programs it starts inherit the same sandbox, so starting them is allowed, including binaries and
 * native addons inside the repository, which test tools need.
 *
 * `sandbox-exec` is deprecated by Apple and its profile language is undocumented.
 *
 * Known limits:
 * - system files outside the data folders stay readable;
 * - the repository's own files stay writable, and the user may later run them on the host;
 * - there is no process namespace, so a descendant that detaches can outlive the task (it stays
 *   sandboxed);
 * - there is no memory or CPU limit beyond Ascout's timeout and output caps.
 */

/** A path that can go into a sandbox profile as a string literal. */
const PROFILE_SAFE = /^\/[^"\\\u0000-\u001f\u007f]*$/u;

export interface MacosTaskSandboxPlanV1 {
  readonly workspace: string;
  /** The private folder used as HOME and TMPDIR. */
  readonly privateDir: string;
  readonly home: string;
  /** The Node install folder, readable even when it lies under a data folder. */
  readonly nodePrefix: string;
  readonly gitDir: string | null;
}

/** The sandbox profile for a task. Later rules win, so the allows follow the denies they narrow. */
export function macosTaskSandboxProfileV1(plan: MacosTaskSandboxPlanV1): string {
  const refusal = macosWorkspaceRefusalV1(plan.workspace, plan.home);
  if (refusal !== null) throw new Error(`${refusal}: ${JSON.stringify(plan.workspace)}`);
  for (const [name, path] of [["private folder", plan.privateDir], ["Node install folder", plan.nodePrefix], ["home folder", plan.home], [".git folder", plan.gitDir ?? "/"]] as const) {
    if (!PROFILE_SAFE.test(path)) throw new Error(`the ${name} path can't go into a sandbox profile: ${JSON.stringify(path)}`);
  }
  const lines = [
    "(version 1)",
    "(allow default)",
    `(deny file-read-data ${[...UNREADABLE_DATA_TREES, plan.home].map((tree) => `(subpath "${tree}")`).join(" ")})`,
    "(deny file-write*)",
    "(deny mach-lookup)",
    "(deny network*)",
    "(deny signal)",
    "(allow signal (target self))",
    "(allow signal (target children))",
    `(allow file-read-data (subpath "${plan.nodePrefix}"))`,
    `(allow file-read-data file-write* (subpath "${plan.workspace}") (subpath "${plan.privateDir}"))`,
    '(allow file-write-data (literal "/dev/null") (literal "/dev/tty"))',
  ];
  if (plan.gitDir !== null) lines.push(`(deny file-write* (subpath "${plan.gitDir}"))`);
  return `${lines.join("\n")}\n`;
}

const within = (path: string, parent: string): boolean => path === parent || path.startsWith(`${parent}/`);

/** The command line that runs `file argv` under the task profile, with HOME and TMPDIR set. */
export function macosTaskSandboxArgvV1(plan: MacosTaskSandboxPlanV1, file: string, argv: readonly string[], cwd: string): string[] {
  if (!posix.isAbsolute(file)) throw new Error(`a sandboxed command must be an absolute path resolved outside the repository: ${JSON.stringify(file)}`);
  if (posix.normalize(cwd) !== cwd || !within(cwd, plan.workspace)) throw new Error(`a sandboxed task must start inside the repository: ${JSON.stringify(cwd)}`);
  return ["-p", macosTaskSandboxProfileV1(plan), "/usr/bin/env", `HOME=${plan.privateDir}`, `TMPDIR=${plan.privateDir}/`, file, ...argv];
}

export interface MacosTaskSandboxV1 {
  readonly mechanism: "macos-sandbox-exec";
  readonly wrap: (file: string, argv: readonly string[], cwd: string) => { readonly file: string; readonly argv: readonly string[] };
  /** Removes the private folder; call once every task has finished. */
  readonly dispose: () => void;
}

export interface MacosTaskSandboxDepsV1 {
  readonly platform: NodeJS.Platform;
  readonly host: LinuxFsHostV1;
  readonly exec: ExecFileTextV1;
  readonly execPath: string;
}

const realDeps: MacosTaskSandboxDepsV1 = { platform: process.platform, host: realLinuxFsHostV1, exec: execFileTextV1, execPath: process.execPath };

/**
 * The task sandbox for `workspace`, or why it can't be used. It refuses, never falls back to running
 * unsandboxed: not macOS, no `sandbox-exec`, a refused workspace, or a failing isolation self-test.
 */
export async function prepareMacosTaskSandboxV1(workspace: string, deps: MacosTaskSandboxDepsV1 = realDeps): Promise<{ sandbox: MacosTaskSandboxV1 } | { refused: string }> {
  if (deps.platform !== "darwin") return { refused: "the sandbox-exec task sandbox is macOS only" };
  if (!deps.host.exists(SANDBOX_EXEC)) return { refused: `sandbox-exec is not installed at ${SANDBOX_EXEC}` };
  const selfTest = await macosFsSandboxProbeRunnerV1(deps, "none");
  if ("refused" in selfTest) return { refused: selfTest.refused };
  let privateDir: string | null = null;
  try {
    const home = deps.host.realpath(deps.host.home());
    const root = deps.host.realpath(workspace);
    const refusal = macosWorkspaceRefusalV1(root, home);
    if (refusal !== null) return { refused: `${refusal}: ${JSON.stringify(root)}` };
    const execPath = deps.host.realpath(deps.execPath);
    const gitPath = posix.join(root, ".git");
    privateDir = deps.host.realpath(deps.host.makeTempDir());
    const nodePrefix = posix.dirname(posix.dirname(execPath));
    // Reading the Node folder must never open up the home folder or a parent of it.
    if (within(home, nodePrefix)) throw new Error(`the Node install folder would expose the home folder: ${JSON.stringify(nodePrefix)}`);
    const plan: MacosTaskSandboxPlanV1 = {
      workspace: root,
      privateDir,
      home,
      nodePrefix,
      gitDir: deps.host.exists(gitPath) && deps.host.symlinkTarget(gitPath) === null ? gitPath : null,
    };
    macosTaskSandboxProfileV1(plan);
    const dir = privateDir;
    return {
      sandbox: {
        mechanism: "macos-sandbox-exec",
        wrap: (file, argv, cwd) => ({ file: SANDBOX_EXEC, argv: macosTaskSandboxArgvV1(plan, file, argv, cwd) }),
        dispose: () => deps.host.removeDir(dir),
      },
    };
  } catch (error) {
    if (privateDir !== null) deps.host.removeDir(privateDir);
    return { refused: error instanceof Error ? error.message : String(error) };
  }
}
