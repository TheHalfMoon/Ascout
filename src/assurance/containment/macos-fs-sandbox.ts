import { posix } from "node:path";

import type { ProbeRunnerV1 } from "./capability-probes.js";
import { execFileTextV1, realLinuxFsHostV1, type ExecFileTextV1, type LinuxFsHostV1, type SandboxNetworkV1 } from "./linux-fs-sandbox.js";

/**
 * FD-4 phase T1-FS (and the T1-NET option), macOS, research (founder decision 2026-11-13: research and
 * implementation, not certification). A sandbox profile for the system's `sandbox-exec`:
 * - direct file writes are denied everywhere except the workspace;
 * - direct file reads are denied under the trees where user and temporary data lives
 *   (UNREADABLE_DATA_TREES and the home folder), except the workspace and the Node binary;
 * - starting any program other than Node is denied, so a task can't hand work to a program running
 *   outside the sandbox (open, launchctl, osascript, defaults, security);
 * - looking up system services is denied, so a task can't ask a daemon to read or write for it;
 * - executable code may be mapped only from system locations and the Node binary, so a native addon
 *   written into the workspace can't be loaded;
 * - the profile denies sending signals to any process other than itself, so a task can't stop or
 *   disrupt the user's other processes (CI checks a same-user process outside the sandbox). This also
 *   stops a task signalling its own children or process group, which tools that kill timed-out child
 *   processes rely on; wiring the runner into `check` would have to account for that.
 * System files, extended attributes, and file metadata elsewhere stay readable. With `network: "none"`,
 * network access is denied too.
 *
 * `sandbox-exec` is deprecated by Apple and its profile language is undocumented, so this is research
 * evidence only. Nothing in Ascout runs tasks through it, the containment tier stays T0
 * (containment-tier.ts), and a macOS claim needs an independent human security review. Technique-level
 * probes are kept in the private host spec.
 */

/** `sandbox-exec` is looked up only here, never on PATH. */
export const SANDBOX_EXEC = "/usr/bin/sandbox-exec";

/**
 * Where user and temporary data lives: reads are denied under these, except the workspace and the
 * Node binary. System files elsewhere stay readable, as they are to every user. (A default-deny read
 * policy stopped the dynamic loader before Node started; macOS CI showed it, 2026-11-15.)
 */
export const UNREADABLE_DATA_TREES = ["/Users", "/Volumes", "/private/tmp", "/private/var/tmp", "/private/var/folders", "/private/var/root"] as const;

/** Where executable code may be mapped from, besides the Node binary: the OS and its libraries. */
const EXECUTABLE_TREES = ["/System", "/usr/lib", "/usr/libexec", "/Library/Apple", "/private/var/db/dyld"] as const;

/** A path that can go into a sandbox profile as a string literal. */
const PROFILE_SAFE = /^\/[^"\\\u0000-\u001f\u007f]*$/u;

/** Host locations a workspace may be neither, nor contain. */
const PROTECTED_LOCATIONS = ["/", "/Users", "/System", "/Library", "/Applications", "/Volumes", "/private", "/private/var", "/private/tmp", "/private/etc", "/usr", "/bin", "/sbin", "/dev", "/opt", "/cores"] as const;

/** Trees a workspace may not lie inside. */
const FORBIDDEN_PARENTS = ["/System", "/Library", "/Applications", "/usr", "/bin", "/sbin", "/dev", "/private/etc"] as const;

/** Per-user temporary folders live four levels below this; anything shallower holds every user's. */
const TEMP_ROOT = "/private/var/folders";

const inside = (path: string, parent: string): boolean => parent === "/" || path.startsWith(`${parent}/`);

/**
 * Why `workspace` can't be the sandbox's writable folder, or null when it can. Paths go into the
 * profile as string literals, so a quote, backslash, or control character is refused outright.
 */
export function macosWorkspaceRefusalV1(workspace: string, home: string): string | null {
  if (/["\\\u0000-\u001f\u007f]/u.test(workspace)) return "the workspace path has a character a sandbox profile can't hold";
  if (!posix.isAbsolute(workspace) || posix.normalize(workspace) !== workspace || (workspace !== "/" && workspace.endsWith("/"))) return "the workspace must be an absolute, normalized path";
  for (const location of [...PROTECTED_LOCATIONS, home]) {
    if (workspace === location || inside(location, workspace)) return `the workspace may not be or contain ${location}`;
  }
  for (const parent of FORBIDDEN_PARENTS) {
    if (inside(workspace, parent)) return `the workspace may not be inside ${parent}`;
  }
  if (inside(workspace, "/private/var") && !(inside(workspace, TEMP_ROOT) && workspace.slice(TEMP_ROOT.length + 1).split("/").length > 3)) {
    return "the workspace may not be inside /private/var, except deep inside a per-user temporary folder";
  }
  if (inside(workspace, home)) {
    const first = workspace.slice(home.length + 1).split("/")[0]!;
    if (first.startsWith(".") || first === "Library") return `the workspace may not be inside ${home}/${first}`;
  }
  return null;
}

/** The sandbox profile for `workspace` (already resolved, so /private/var rather than /var). */
export function macosSandboxProfileV1(workspace: string, nodeBinary: string, home: string, network: SandboxNetworkV1 = "shared"): string {
  const refusal = macosWorkspaceRefusalV1(workspace, home);
  if (refusal !== null) throw new Error(`${refusal}: ${JSON.stringify(workspace)}`);
  if (!PROFILE_SAFE.test(nodeBinary)) throw new Error(`the Node binary path can't go into a sandbox profile: ${JSON.stringify(nodeBinary)}`);
  if (!PROFILE_SAFE.test(home)) throw new Error(`the home folder path can't go into a sandbox profile: ${JSON.stringify(home)}`);
  if (inside(nodeBinary, workspace)) throw new Error("the Node binary may not be inside the workspace, where the task could change it");
  const lines = [
    "(version 1)",
    "(allow default)",
    `(deny file-read-data ${[...UNREADABLE_DATA_TREES, home].map((tree) => `(subpath "${tree}")`).join(" ")})`,
    "(deny file-write*)",
    "(deny process-exec*)",
    "(deny mach-lookup)",
    "(deny file-map-executable)",
    "(deny signal (target others))",
    `(allow process-exec* (literal "${nodeBinary}"))`,
    `(allow file-map-executable ${EXECUTABLE_TREES.map((tree) => `(subpath "${tree}")`).join(" ")} (literal "${nodeBinary}"))`,
    `(allow file-read-data (literal "${nodeBinary}"))`,
    `(allow file-read-data file-write* (subpath "${workspace}"))`,
    '(allow file-write-data (literal "/dev/null") (literal "/dev/tty"))',
  ];
  if (network === "none") lines.push("(deny network*)");
  return `${lines.join("\n")}\n`;
}

export interface MacosFsSandboxDepsV1 {
  readonly platform: NodeJS.Platform;
  readonly host: LinuxFsHostV1;
  readonly exec: ExecFileTextV1;
  readonly execPath: string;
}

const realDeps: MacosFsSandboxDepsV1 = { platform: process.platform, host: realLinuxFsHostV1, exec: execFileTextV1, execPath: process.execPath };

/**
 * A probe runner that runs the capability probe under `sandbox-exec`, or the reason it can't. It
 * refuses, never falls back to running unsandboxed: not macOS, no `sandbox-exec`, or a self-test that
 * fails. The self-test checks isolation: a marker beside an empty workspace must be unreadable inside.
 */
export async function macosFsSandboxProbeRunnerV1(deps: MacosFsSandboxDepsV1 = realDeps, network: SandboxNetworkV1 = "shared"): Promise<{ runner: ProbeRunnerV1 } | { refused: string }> {
  if (deps.platform !== "darwin") return { refused: "the sandbox-exec sandbox is macOS only" };
  if (!deps.host.exists(SANDBOX_EXEC)) return { refused: `sandbox-exec is not installed at ${SANDBOX_EXEC}` };
  const execPath = deps.host.realpath(deps.execPath);
  const home = deps.host.realpath(deps.host.home());
  const runInside = (workspace: string, argv: readonly string[], env: NodeJS.ProcessEnv): Promise<string> =>
    deps.exec(SANDBOX_EXEC, ["-p", macosSandboxProfileV1(workspace, execPath, home, network), execPath, ...argv], { cwd: workspace, env });
  const root = deps.host.realpath(deps.host.makeTempDir());
  let result: string;
  try {
    const workspace = posix.join(root, "workspace");
    const marker = posix.join(root, "outside-marker");
    deps.host.makeDir(workspace);
    deps.host.writeFile(marker, "outside");
    const script = `let r = "sandbox-ok"; try { require("node:fs").readFileSync(${JSON.stringify(marker)}); r = "escaped"; } catch {} process.stdout.write(r)`;
    result = await runInside(workspace, ["-e", script], {});
  } finally {
    deps.host.removeDir(root);
  }
  if (result === "escaped") return { refused: "the sandbox-exec sandbox started but did not hide a file outside its workspace" };
  if (result !== "sandbox-ok") return { refused: "the sandbox-exec sandbox did not start" };
  return { runner: (script, task, env, cwd) => runInside(deps.host.realpath(cwd), ["-e", script, JSON.stringify(task)], env) };
}
