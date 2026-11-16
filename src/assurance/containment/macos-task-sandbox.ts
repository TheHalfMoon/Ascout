import { createServer } from "node:net";
import { posix } from "node:path";

import { execFileTextV1, realLinuxFsHostV1, type ExecFileTextV1, type LinuxFsHostV1 } from "./linux-fs-sandbox.js";
import { SANDBOX_EXEC, UNREADABLE_DATA_TREES, macosWorkspaceRefusalV1 } from "./macos-fs-sandbox.js";

/**
 * FD-4 T1 on macOS: a `sandbox-exec` profile applied to a `check` task.
 *
 * What a task gets:
 * - **Filesystem:**
 *   - the repository as a writable folder, except two parts. `.git` stays read-only, so a task can't
 *     plant hooks or configuration that later run on the host. `.ascout` is unreadable and
 *     unwritable, apart from the result folders it is given; after the task, Ascout refuses to read
 *     those if they contain a link (see check.ts);
 *   - a private temporary folder, which is also its home folder (HOME and TMPDIR), removed after the
 *     run;
 *   - no reads under the folders where user and temporary data lives, except the repository, the
 *     private folder, and the Node and package-manager entry points.
 * - **Network and services:** no network and no system-service lookups.
 * - **Signals:** to no process but itself and its own children.
 * - **Environment:** only the environment it is given, plus HOME and TMPDIR.
 *
 * It refuses a repository whose `.git` is not a real folder (a worktree's gitfile could be repointed),
 * and a repository with submodules.
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

const NODE_BIN_ENTRIES = ["node", "npm", "npx", "corepack", "pnpm", "pnpx", "yarn", "yarnpkg"] as const;
const NODE_LIB_ENTRIES = ["npm", "corepack", "pnpm", "yarn"] as const;

const within = (path: string, parent: string): boolean => path === parent || path.startsWith(`${parent}/`);

export interface MacosTaskSandboxPlanV1 {
  readonly workspace: string;
  /** The private folder used as HOME and TMPDIR. */
  readonly privateDir: string;
  readonly home: string;
  /** The Node and package-manager entry points (resolved), readable even under a data folder. */
  readonly nodeReads: readonly string[];
  readonly gitDir: string | null;
}

/**
 * The resolved Node and package-manager entry points from the Node install folder (two levels above
 * the binary). Refused when that folder is the home folder or a parent of it.
 */
export function macosNodeReadsV1(execPath: string, host: LinuxFsHostV1): string[] {
  if (!posix.isAbsolute(execPath)) throw new Error(`the Node binary must be an absolute path: ${JSON.stringify(execPath)}`);
  const prefix = posix.dirname(posix.dirname(execPath));
  if (within(host.realpath(host.home()), prefix)) throw new Error(`the Node install folder would expose the home folder: ${JSON.stringify(prefix)}`);
  const reads = new Set<string>([execPath]);
  for (const entry of [...NODE_BIN_ENTRIES.map((name) => posix.join(prefix, "bin", name)), ...NODE_LIB_ENTRIES.map((name) => posix.join(prefix, "lib", "node_modules", name))]) {
    if (host.exists(entry)) reads.add(host.realpath(entry));
  }
  return [...reads];
}

/**
 * The sandbox profile for a task. Later rules win, so each allow follows the deny it narrows, and the
 * .git and .ascout denies follow the repository allow. Each folder in `writable` must lie inside
 * .ascout.
 */
export function macosTaskSandboxProfileV1(plan: MacosTaskSandboxPlanV1, writable: readonly string[] = []): string {
  const refusal = macosWorkspaceRefusalV1(plan.workspace, plan.home);
  if (refusal !== null) throw new Error(`${refusal}: ${JSON.stringify(plan.workspace)}`);
  const evidence = posix.join(plan.workspace, ".ascout");
  for (const dir of writable) {
    if (posix.normalize(dir) !== dir || !dir.startsWith(`${evidence}/`)) throw new Error(`a sandboxed result folder must lie inside .ascout: ${JSON.stringify(dir)}`);
  }
  for (const [name, path] of [["private folder", plan.privateDir], ["home folder", plan.home], [".git folder", plan.gitDir ?? "/"], ...plan.nodeReads.map((read) => ["Node entry point", read] as const), ...writable.map((dir) => ["result folder", dir] as const)] as const) {
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
    `(allow file-read-data ${plan.nodeReads.map((read) => `(subpath "${read}")`).join(" ")})`,
    `(allow file-read-data file-write* (subpath "${plan.workspace}") (subpath "${plan.privateDir}"))`,
    '(allow file-write-data (literal "/dev/null") (literal "/dev/tty"))',
  ];
  if (plan.gitDir !== null) lines.push(`(deny file-write* (subpath "${plan.gitDir}"))`);
  lines.push(`(deny file-read* file-write* (subpath "${evidence}"))`);
  if (writable.length > 0) lines.push(`(allow file-read* file-write* ${writable.map((dir) => `(subpath "${dir}")`).join(" ")})`);
  return `${lines.join("\n")}\n`;
}

/** The command line that runs `file argv` under the task profile, with HOME and TMPDIR set. */
export function macosTaskSandboxArgvV1(plan: MacosTaskSandboxPlanV1, file: string, argv: readonly string[], cwd: string, writable: readonly string[] = []): string[] {
  if (!posix.isAbsolute(file)) throw new Error(`a sandboxed command must be an absolute path resolved outside the repository: ${JSON.stringify(file)}`);
  if (posix.normalize(cwd) !== cwd || !within(cwd, plan.workspace)) throw new Error(`a sandboxed task must start inside the repository: ${JSON.stringify(cwd)}`);
  return ["-p", macosTaskSandboxProfileV1(plan, writable), "/usr/bin/env", `HOME=${plan.privateDir}`, `TMPDIR=${plan.privateDir}/`, file, ...argv];
}

export interface MacosTaskSandboxV1 {
  readonly mechanism: "macos-sandbox-exec";
  readonly wrap: (file: string, argv: readonly string[], cwd: string, writable: readonly string[]) => { readonly file: string; readonly argv: readonly string[] };
  /** Removes the private folder; call once every task has finished. */
  readonly dispose: () => void;
}

export interface MacosTaskSandboxDepsV1 {
  readonly platform: NodeJS.Platform;
  readonly host: LinuxFsHostV1;
  readonly exec: ExecFileTextV1;
  readonly execPath: string;
  /** A host loopback port nothing inside the sandbox may reach, for the self-test; null to skip it. */
  readonly loopbackPort: () => Promise<{ port: number; close: () => void } | null>;
}

const realLoopback = (): Promise<{ port: number; close: () => void } | null> => new Promise((resolve) => {
  const server = createServer((socket) => socket.end("host"));
  server.once("error", () => resolve(null));
  server.listen(0, "127.0.0.1", () => resolve({ port: (server.address() as { port: number }).port, close: () => server.close() }));
});

const realDeps: MacosTaskSandboxDepsV1 = { platform: process.platform, host: realLinuxFsHostV1, exec: execFileTextV1, execPath: process.execPath, loopbackPort: realLoopback };

/** What the self-test task must report, in the exact configuration tasks run in. */
export const MACOS_SELF_TEST_EXPECTED = { outside: "EPERM", git: "EPERM", evidence: "EPERM", results: "allowed", loopback: "denied" } as const;

/**
 * The task sandbox for `workspace`, or why it can't be used. It refuses, never falls back to running
 * unsandboxed: not macOS, no `sandbox-exec`, a refused repository or Node folder, a worktree or
 * submodules, or a self-test that does not report every expected denial.
 */
export async function prepareMacosTaskSandboxV1(workspace: string, deps: MacosTaskSandboxDepsV1 = realDeps): Promise<{ sandbox: MacosTaskSandboxV1 } | { refused: string }> {
  if (deps.platform !== "darwin") return { refused: "the sandbox-exec task sandbox is macOS only" };
  if (!deps.host.exists(SANDBOX_EXEC)) return { refused: `sandbox-exec is not installed at ${SANDBOX_EXEC}` };
  let privateDir: string | null = null;
  try {
    const home = deps.host.realpath(deps.host.home());
    const root = deps.host.realpath(workspace);
    const refusal = macosWorkspaceRefusalV1(root, home);
    if (refusal !== null) return { refused: `${refusal}: ${JSON.stringify(root)}` };
    const gitPath = posix.join(root, ".git");
    // A worktree's .git is a file, so .git/HEAD can't exist under it.
    if (deps.host.exists(gitPath) && (deps.host.symlinkTarget(gitPath) !== null || deps.host.realpath(gitPath) !== gitPath || !deps.host.exists(posix.join(gitPath, "HEAD")))) {
      return { refused: "the repository's .git is not a real folder (a worktree or a link), which --sandbox can't protect" };
    }
    if (deps.host.exists(posix.join(root, ".gitmodules"))) return { refused: "the repository has submodules, whose .git files --sandbox can't protect" };
    const nodeReads = macosNodeReadsV1(deps.host.realpath(deps.execPath), deps.host);
    privateDir = deps.host.realpath(deps.host.makeTempDir());
    const plan: MacosTaskSandboxPlanV1 = { workspace: root, privateDir, home, nodeReads, gitDir: deps.host.exists(gitPath) ? gitPath : null };
    macosTaskSandboxProfileV1(plan);
    const failed = await selfTest(plan, deps);
    if (failed !== null) {
      deps.host.removeDir(privateDir);
      return { refused: failed };
    }
    const dir = privateDir;
    return {
      sandbox: {
        mechanism: "macos-sandbox-exec",
        wrap: (file, argv, cwd, writable) => ({ file: SANDBOX_EXEC, argv: macosTaskSandboxArgvV1(plan, file, argv, cwd, writable) }),
        dispose: () => deps.host.removeDir(dir),
      },
    };
  } catch (error) {
    if (privateDir !== null) deps.host.removeDir(privateDir);
    return { refused: error instanceof Error ? error.message : String(error) };
  }
}

/** Runs a probe through the exact task configuration in a disposable repository-shaped folder. */
async function selfTest(plan: MacosTaskSandboxPlanV1, deps: MacosTaskSandboxDepsV1): Promise<string | null> {
  const root = deps.host.realpath(deps.host.makeTempDir());
  const loopback = await deps.loopbackPort();
  try {
    const ws = posix.join(root, "repo");
    const results = posix.join(ws, ".ascout", "runs", "selftest", "raw", "test");
    const marker = posix.join(root, "outside-marker");
    for (const dir of [ws, posix.join(ws, ".git"), posix.join(ws, ".ascout"), posix.join(ws, ".ascout", "runs"), posix.join(ws, ".ascout", "runs", "selftest"), posix.join(ws, ".ascout", "runs", "selftest", "raw"), results]) deps.host.makeDir(dir);
    deps.host.writeFile(marker, "outside");
    deps.host.writeFile(posix.join(ws, ".ascout", "earlier-evidence"), "evidence");
    const testPlan: MacosTaskSandboxPlanV1 = { ...plan, workspace: ws, gitDir: posix.join(ws, ".git") };
    const script = `
const fs = require("node:fs");
const attempt = (fn) => { try { fn(); return "allowed"; } catch (e) { return e.code || String(e); } };
const out = {
  outside: attempt(() => fs.readFileSync(${JSON.stringify(marker)})),
  git: attempt(() => fs.writeFileSync(".git/config", "x")),
  evidence: attempt(() => fs.readFileSync(".ascout/earlier-evidence")),
  results: attempt(() => fs.writeFileSync(${JSON.stringify(posix.join(results, "probe"))}, "x")),
};
const finish = (r) => { out.loopback = r; process.stdout.write(JSON.stringify(out)); process.exit(0); };
${loopback === null ? 'finish("denied");' : `const s = require("node:net").connect(${loopback.port}, "127.0.0.1"); s.on("data", () => finish("allowed")); s.on("error", () => finish("denied")); setTimeout(() => finish("denied"), 3000);`}
`;
    const output = await deps.exec(SANDBOX_EXEC, macosTaskSandboxArgvV1(testPlan, deps.host.realpath(deps.execPath), ["-e", script], ws, [results]), { cwd: ws, env: {} });
    let seen: unknown;
    try {
      seen = JSON.parse(output);
    } catch {
      return "the sandbox-exec task sandbox did not start";
    }
    if (JSON.stringify(seen) !== JSON.stringify(MACOS_SELF_TEST_EXPECTED)) return `the sandbox-exec task sandbox started but its self-test did not hold: ${JSON.stringify(seen)}`;
    return null;
  } finally {
    loopback?.close();
    deps.host.removeDir(root);
  }
}
