import { execFile } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readlinkSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, posix } from "node:path";

import type { ProbeRunnerV1 } from "./capability-probes.js";

/**
 * FD-4 phase T1-FS, Linux, research (founder decision 2026-11-13: research and implementation, not
 * certification). A filesystem sandbox built with bubblewrap: the sandbox's root starts empty, and only
 * the system folders and the Node binary (read-only), a fresh /tmp, and the workspace (read-write)
 * exist inside it. The workspace is the only host location a task can write; /tmp and /dev/shm are
 * fresh and vanish with the sandbox. A new PID namespace hides other processes. The network is shared,
 * including local sockets: network isolation is a later phase.
 *
 * Nothing in Ascout runs tasks through this yet, and the containment tier stays T0
 * (containment-tier.ts). A T1 claim for Linux needs native evidence and an independent human security
 * review. The host-specific design and its technique-level probes are kept privately, as the T0 spec
 * requires; this module holds only the generic mechanism.
 */

/** bubblewrap is looked up only here, never on PATH, which a repository can influence. */
export const BWRAP_LOCATIONS = ["/usr/bin/bwrap", "/bin/bwrap"] as const;

/** Top-level system folders, recreated as symlinks on merged-usr hosts, otherwise bound read-only. */
const SYSTEM_ROOTS = ["/bin", "/sbin", "/lib", "/lib32", "/lib64"] as const;

/** Folders whose Node binary is already visible inside the sandbox. */
const VISIBLE_SYSTEM_PREFIXES = ["/usr/", "/bin/", "/sbin/"] as const;

/**
 * Host locations a workspace may be neither, nor contain: binding any of them read-write would hand
 * the task host state (the real /tmp, the home folder, devices, system files).
 */
const PROTECTED_LOCATIONS = ["/", "/tmp", "/var/tmp", "/proc", "/dev", "/run", "/sys", "/home", "/root", "/usr", "/etc", "/var", "/boot", "/opt", "/srv", "/mnt", "/media", ...SYSTEM_ROOTS] as const;

/** Trees a workspace may not lie inside: kernel views, runtime sockets, and read-only system files. */
const FORBIDDEN_PARENTS = ["/proc", "/dev", "/run", "/sys", "/usr", "/etc", "/boot"] as const;

export interface LinuxFsHostV1 {
  readonly exists: (path: string) => boolean;
  /** The symlink's target, or null when the path is not a symlink. */
  readonly symlinkTarget: (path: string) => string | null;
  readonly realpath: (path: string) => string;
  readonly home: () => string;
  /** A new empty folder for the sandbox self-test, what goes in it, and its removal. */
  readonly makeTempDir: () => string;
  readonly makeDir: (path: string) => void;
  readonly writeFile: (path: string, text: string) => void;
  readonly removeDir: (path: string) => void;
}

export const realLinuxFsHostV1: LinuxFsHostV1 = {
  exists: existsSync,
  symlinkTarget: (path) => (lstatSync(path).isSymbolicLink() ? readlinkSync(path) : null),
  realpath: (path) => realpathSync(path),
  home: homedir,
  makeTempDir: () => mkdtempSync(join(tmpdir(), "ascout-sandbox-selftest-")),
  makeDir: (path) => mkdirSync(path),
  writeFile: (path, text) => writeFileSync(path, text),
  removeDir: (path) => rmSync(path, { recursive: true, force: true }),
};

/** The fixed bubblewrap location on this host, or null. */
export function findBwrapV1(host: Pick<LinuxFsHostV1, "exists"> = realLinuxFsHostV1): string | null {
  return BWRAP_LOCATIONS.find((path) => host.exists(path)) ?? null;
}

/**
 * The Node binary to bind read-only, when it isn't already visible inside the sandbox. Only the
 * binary: its install folder can be the home folder (`~/bin/node`) or a broad tree like `/opt`.
 */
export function nodeBinaryToBindV1(execPath: string): string | null {
  return VISIBLE_SYSTEM_PREFIXES.some((prefix) => execPath.startsWith(prefix)) ? null : execPath;
}

const inside = (path: string, parent: string): boolean => parent === "/" || path.startsWith(`${parent}/`);

/**
 * Why `workspace` can't be the sandbox's writable folder, or null when it can. It must be an absolute,
 * already-resolved path (a symlinked workspace would bind the link's target), not a protected host
 * location or an ancestor of one or of the home folder, and not inside a kernel or system tree.
 */
export function workspaceRefusalV1(workspace: string, home: string): string | null {
  if (!posix.isAbsolute(workspace) || posix.normalize(workspace) !== workspace || (workspace !== "/" && workspace.endsWith("/"))) return "the workspace must be an absolute, normalized path";
  for (const location of [...PROTECTED_LOCATIONS, home]) {
    if (workspace === location || inside(location, workspace)) return `the workspace may not be or contain ${location}`;
  }
  for (const parent of FORBIDDEN_PARENTS) {
    if (inside(workspace, parent)) return `the workspace may not be inside ${parent}`;
  }
  return null;
}

/**
 * The bubblewrap arguments for a sandbox whose only writable host location is `workspace`. Throws when
 * the workspace is refused (see workspaceRefusalV1) or the Node binary isn't an absolute path.
 */
export function linuxFsSandboxArgsV1(workspace: string, nodeBinary: string | null, host: LinuxFsHostV1 = realLinuxFsHostV1): string[] {
  const refusal = workspaceRefusalV1(workspace, host.home());
  if (refusal !== null) throw new Error(`${refusal}: ${JSON.stringify(workspace)}`);
  if (nodeBinary !== null && !posix.isAbsolute(nodeBinary)) throw new Error(`the Node binary must be an absolute path: ${JSON.stringify(nodeBinary)}`);
  const args = ["--ro-bind", "/usr", "/usr", "--ro-bind", "/etc", "/etc"];
  for (const root of SYSTEM_ROOTS) {
    if (!host.exists(root)) continue;
    const target = host.symlinkTarget(root);
    if (target === null) args.push("--ro-bind", root, root);
    else args.push("--symlink", target, root);
  }
  args.push("--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp");
  // After the fresh /tmp, so a Node binary or a workspace under /tmp stays visible.
  if (nodeBinary !== null) args.push("--ro-bind", nodeBinary, nodeBinary);
  args.push(
    "--bind", workspace, workspace,
    "--chdir", workspace,
    "--unshare-user-try", "--unshare-pid", "--unshare-ipc", "--unshare-uts", "--unshare-cgroup-try",
    "--die-with-parent", "--new-session",
  );
  return args;
}

/** Runs a file and returns its standard output, whatever its exit status. */
export type ExecFileTextV1 = (file: string, argv: readonly string[], options: { cwd: string; env: NodeJS.ProcessEnv }) => Promise<string>;

export const execFileTextV1: ExecFileTextV1 = (file, argv, options) => new Promise((resolveRun) => {
  execFile(file, [...argv], { ...options, encoding: "utf8", timeout: 20_000, windowsHide: true }, (_error, stdout) => resolveRun(stdout));
});

export interface LinuxFsSandboxDepsV1 {
  readonly platform: NodeJS.Platform;
  readonly host: LinuxFsHostV1;
  readonly exec: ExecFileTextV1;
  readonly execPath: string;
}

const realDeps: LinuxFsSandboxDepsV1 = { platform: process.platform, host: realLinuxFsHostV1, exec: execFileTextV1, execPath: process.execPath };

/**
 * A probe runner that runs the capability probe inside the sandbox, or the reason it can't. It
 * refuses, never falls back to running unsandboxed: not Linux, no bubblewrap at a fixed location, or a
 * self-test that fails. The self-test checks isolation, not just startup: a marker beside its workspace
 * must be invisible from inside.
 */
export async function linuxFsSandboxProbeRunnerV1(deps: LinuxFsSandboxDepsV1 = realDeps): Promise<{ runner: ProbeRunnerV1 } | { refused: string }> {
  if (deps.platform !== "linux") return { refused: "the bubblewrap sandbox is Linux only" };
  const bwrap = findBwrapV1(deps.host);
  if (bwrap === null) return { refused: `bubblewrap is not installed at ${BWRAP_LOCATIONS.join(" or ")}` };
  const execPath = deps.host.realpath(deps.execPath);
  const nodeBinary = nodeBinaryToBindV1(execPath);
  // bubblewrap itself starts with exactly the task's environment: its own process is visible inside
  // the sandbox, so anything it holds the task can read. Nothing is passed with --setenv.
  const runInside = (workspace: string, argv: readonly string[], env: NodeJS.ProcessEnv): Promise<string> =>
    deps.exec(bwrap, [...linuxFsSandboxArgsV1(workspace, nodeBinary, deps.host), "--", execPath, ...argv], { cwd: workspace, env });
  const root = deps.host.realpath(deps.host.makeTempDir());
  let result: string;
  try {
    const workspace = posix.join(root, "workspace");
    const marker = posix.join(root, "outside-marker");
    deps.host.makeDir(workspace);
    deps.host.writeFile(marker, "outside");
    result = await runInside(workspace, ["-e", `process.stdout.write(require("node:fs").existsSync(${JSON.stringify(marker)}) ? "escaped" : "sandbox-ok")`], {});
  } finally {
    deps.host.removeDir(root);
  }
  if (result === "escaped") return { refused: "the bubblewrap sandbox started but did not hide a path outside its workspace" };
  if (result !== "sandbox-ok") return { refused: "the bubblewrap sandbox did not start (are unprivileged user namespaces allowed?)" };
  return { runner: (script, task, env, cwd) => runInside(deps.host.realpath(cwd), ["-e", script, JSON.stringify(task)], env) };
}
