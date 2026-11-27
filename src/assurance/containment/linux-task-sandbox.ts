import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { posix } from "node:path";

import { execFileTextV1, findBwrapV1, linuxFsSandboxArgsV1, realLinuxFsHostV1, workspaceRefusalV1, type ExecFileTextV1, type LinuxFsHostV1 } from "./linux-fs-sandbox.js";

/**
 * FD-4 T1 on Linux: the bubblewrap sandbox applied to a `check` task.
 *
 * What a task gets:
 * - **Filesystem:**
 *   - the repository as a writable folder, except two parts. `.git` is bound read-only, so a task
 *     can't plant hooks or configuration that later run on the host. `.ascout` is hidden, so it can't
 *     touch the evidence Ascout writes or reads, apart from the result folders it is given;
 *   - the result folders Ascout names for the task, writable. After the task, Ascout refuses to read
 *     them if they contain a link (see check.ts);
 *   - system folders, and only the Node and package-manager entry points from the Node install
 *     folder, read-only;
 *   - a fresh /tmp and a fresh home folder (HOME=/tmp/home), both gone when it ends.
 * - **Network:** its own empty network namespace: no host loopback, no other hosts, no abstract sockets.
 * - **Processes:** its own PID, IPC and UTS namespaces, a new session, no capabilities, and death with
 *   its parent.
 * - **Environment:** only the environment it is given (the caller passes the allowlisted one).
 *
 * It refuses a repository whose `.git` is not a real folder (a worktree's gitfile could be repointed),
 * and a repository with submodules (their gitfiles are inside the writable tree).
 *
 * The command must already be an absolute path resolved outside the repository: bubblewrap would
 * otherwise search the task's PATH, which a repository can influence.
 *
 * It also refuses a `.git` whose hooks folder is a link or whose configuration includes other files,
 * since either could point into the writable tree.
 *
 * Known limits:
 * - the repository's own files stay writable, and the user may later run them on the host,
 *   including a `.git` planted in a subfolder;
 * - when a task is stopped on timeout or cancellation, its namespace dies asynchronously, so the
 *   result-folder link check can run a moment before the last process exits. Results of a stopped
 *   task are never read;
 * - a Unix socket a host process created inside the repository can be reached;
 * - there is no seccomp filter, so the task shares the caller's session keyring and may create
 *   nested user namespaces;
 * - there is no memory or CPU limit beyond Ascout's timeout and output caps;
 * - system files under /usr and /etc stay readable.
 */

export const SANDBOX_HOME = "/tmp/home";

/** Entry points bound from the Node install folder; nothing else in it (an npmrc, say) is visible. */
const NODE_BIN_ENTRIES = ["node", "npm", "npx", "corepack", "pnpm", "pnpx", "yarn", "yarnpkg"] as const;
const NODE_LIB_ENTRIES = ["npm", "corepack", "pnpm", "yarn"] as const;

/** How to make one Node entry point visible: a read-only bind, or a symlink recreated as it is. */
export type NodeBindV1 = { readonly kind: "bind"; readonly path: string } | { readonly kind: "symlink"; readonly path: string; readonly target: string };

const within = (path: string, parent: string): boolean => path === parent || path.startsWith(`${parent}/`);

/**
 * What to bind from the Node install folder (two levels above the resolved binary), or nothing when
 * Node lives in a system folder already visible. Refused when the install folder is a protected host
 * location, the home folder, or an ancestor of either.
 */
export function nodeBindsV1(execPath: string, host: LinuxFsHostV1): NodeBindV1[] {
  if (!posix.isAbsolute(execPath)) throw new Error(`the Node binary must be an absolute path: ${JSON.stringify(execPath)}`);
  if (["/usr/", "/bin/", "/sbin/"].some((prefix) => execPath.startsWith(prefix))) return [];
  const prefix = posix.dirname(posix.dirname(execPath));
  const refusal = workspaceRefusalV1(prefix, host.realpath(host.home()));
  if (refusal !== null) throw new Error(`the Node install folder can't be used (${refusal}): ${JSON.stringify(prefix)}`);
  const binds: NodeBindV1[] = [];
  for (const entry of [...NODE_BIN_ENTRIES.map((name) => posix.join(prefix, "bin", name)), ...NODE_LIB_ENTRIES.map((name) => posix.join(prefix, "lib", "node_modules", name))]) {
    if (!host.exists(entry)) continue;
    const target = host.symlinkTarget(entry);
    binds.push(target === null ? { kind: "bind", path: entry } : { kind: "symlink", path: entry, target });
  }
  if (!binds.some((bind) => bind.path === execPath)) binds.unshift({ kind: "bind", path: execPath });
  return binds;
}

export interface LinuxTaskSandboxPlanV1 {
  readonly bwrap: string;
  readonly workspace: string;
  readonly nodeBinds: readonly NodeBindV1[];
  /** The repository's .git folder, bound read-only over the writable workspace. */
  readonly gitDir: string | null;
}

/**
 * The bubblewrap command line that runs `file argv` under the task sandbox, starting in `cwd`. Each
 * folder in `writable` must lie inside the repository's `.ascout`, which is otherwise hidden.
 */
export function linuxTaskSandboxArgvV1(plan: LinuxTaskSandboxPlanV1, file: string, argv: readonly string[], cwd: string, writable: readonly string[], host: LinuxFsHostV1 = realLinuxFsHostV1): string[] {
  if (!posix.isAbsolute(file)) throw new Error(`a sandboxed command must be an absolute path resolved outside the repository: ${JSON.stringify(file)}`);
  if (posix.normalize(cwd) !== cwd || !within(cwd, plan.workspace)) throw new Error(`a sandboxed task must start inside the repository: ${JSON.stringify(cwd)}`);
  const evidence = posix.join(plan.workspace, ".ascout");
  for (const dir of writable) {
    if (posix.normalize(dir) !== dir || !dir.startsWith(`${evidence}/`)) throw new Error(`a sandboxed result folder must lie inside .ascout: ${JSON.stringify(dir)}`);
  }
  const args = linuxFsSandboxArgsV1(plan.workspace, null, host, "none");
  for (const bind of plan.nodeBinds) {
    if (bind.kind === "bind") args.push("--ro-bind", bind.path, bind.path);
    else args.push("--symlink", bind.target, bind.path);
  }
  if (plan.gitDir !== null) args.push("--ro-bind", plan.gitDir, plan.gitDir);
  args.push("--tmpfs", evidence);
  for (const dir of writable) args.push("--bind", dir, dir);
  args.push("--dir", SANDBOX_HOME, "--setenv", "HOME", SANDBOX_HOME, "--cap-drop", "ALL", "--chdir", cwd);
  return [...args, "--", file, ...argv];
}

export interface LinuxTaskSandboxV1 {
  /** The command that runs `file argv` inside the sandbox; the environment is passed unchanged. */
  readonly wrap: (file: string, argv: readonly string[], cwd: string, writable: readonly string[]) => { readonly file: string; readonly argv: readonly string[] };
  readonly mechanism: "linux-bubblewrap";
}

export interface LinuxTaskSandboxDepsV1 {
  readonly platform: NodeJS.Platform;
  readonly host: LinuxFsHostV1;
  readonly exec: ExecFileTextV1;
  readonly execPath: string;
  /** A host loopback port nothing inside the sandbox may reach, for the self-test; null to skip it. */
  readonly loopbackPort: () => Promise<{ port: number; close: () => void } | null>;
  /** A file's text, or null when it can't be read. */
  readonly readText: (path: string) => string | null;
}

export const realReadTextV1 = (path: string): string | null => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
};

/**
 * Why `.git` would let the writable tree reach Git's own settings, or null: a hooks folder that is a
 * link, or a configuration include, either of which can point into the repository the task writes.
 */
function linkTarget(host: Pick<LinuxFsHostV1, "symlinkTarget">, path: string): string | null {
  try {
    return host.symlinkTarget(path);
  } catch {
    return null;
  }
}

export function gitReachRefusalV1(gitDir: string, host: Pick<LinuxFsHostV1, "symlinkTarget" | "exists">, readText: (path: string) => string | null): string | null {
  // symlinkTarget reads the link itself, so a link to a path that doesn't exist yet is caught too.
  for (const name of ["hooks", "config"]) {
    if (linkTarget(host, posix.join(gitDir, name)) !== null) return `the repository's .git/${name} is a link, which could point into the writable tree`;
  }
  // Git starts a section at any "[", even after another header on the same line.
  if (/(^|\])\s*\[\s*include(if\b|\s*\])/imu.test(readText(posix.join(gitDir, "config")) ?? "")) return "the repository's Git configuration includes other files, which could lie in the writable tree";
  return null;
}

export const realLoopbackPortV1 = (): Promise<{ port: number; close: () => void } | null> => new Promise((resolve) => {
  const server = createServer((socket) => { socket.on("error", Boolean); socket.end("host"); });
  server.once("error", () => resolve(null));
  server.listen(0, "127.0.0.1", () => resolve({ port: (server.address() as { port: number }).port, close: () => server.close() }));
});

const realDeps: LinuxTaskSandboxDepsV1 = { platform: process.platform, host: realLinuxFsHostV1, exec: execFileTextV1, execPath: process.execPath, loopbackPort: realLoopbackPortV1, readText: realReadTextV1 };

/** What the self-test task must report, in the exact configuration tasks run in. */
export const LINUX_SELF_TEST_EXPECTED = { outside: false, git: "EROFS", evidence: false, results: "allowed", capEff: "0000000000000000", loopback: "denied" } as const;

/**
 * The task sandbox for `workspace`, or why it can't be used. It refuses, never falls back to running
 * unsandboxed: not Linux, no bubblewrap at a fixed location, a refused repository or Node folder, a
 * worktree or submodules, or a self-test that does not report every expected denial.
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
    // A worktree's .git is a file, so .git/HEAD can't exist under it.
    if (deps.host.exists(gitPath) && (deps.host.symlinkTarget(gitPath) !== null || deps.host.realpath(gitPath) !== gitPath || !deps.host.exists(posix.join(gitPath, "HEAD")))) {
      return { refused: "the repository's .git is not a real folder (a worktree or a link), which --sandbox can't protect" };
    }
    if (deps.host.exists(posix.join(root, ".gitmodules"))) return { refused: "the repository has submodules, whose .git files --sandbox can't protect" };
    if (deps.host.exists(gitPath)) {
      const reach = gitReachRefusalV1(gitPath, deps.host, deps.readText);
      if (reach !== null) return { refused: reach };
    }
    plan = { bwrap, workspace: root, nodeBinds: nodeBindsV1(deps.host.realpath(deps.execPath), deps.host), gitDir: deps.host.exists(gitPath) ? gitPath : null };
  } catch (error) {
    return { refused: error instanceof Error ? error.message : String(error) };
  }
  const failed = await selfTest(plan, deps);
  if (failed !== null) return { refused: failed };
  return {
    sandbox: {
      mechanism: "linux-bubblewrap",
      wrap: (file, argv, cwd, writable) => ({ file: bwrap, argv: linuxTaskSandboxArgvV1(plan, file, argv, cwd, writable, deps.host) }),
    },
  };
}

/**
 * Runs a probe through the exact task configuration, in a disposable repository-shaped folder, and
 * returns why the sandbox can't be used, or null when every expected denial held.
 */
async function selfTest(plan: LinuxTaskSandboxPlanV1, deps: LinuxTaskSandboxDepsV1): Promise<string | null> {
  const root = deps.host.realpath(deps.host.makeTempDir());
  const loopback = await deps.loopbackPort();
  try {
    const ws = posix.join(root, "repo");
    const results = posix.join(ws, ".ascout", "runs", "selftest", "raw", "test");
    const marker = posix.join(root, "outside-marker");
    for (const dir of [ws, posix.join(ws, ".git"), posix.join(ws, ".ascout"), posix.join(ws, ".ascout", "runs"), posix.join(ws, ".ascout", "runs", "selftest"), posix.join(ws, ".ascout", "runs", "selftest", "raw"), results]) deps.host.makeDir(dir);
    deps.host.writeFile(marker, "outside");
    deps.host.writeFile(posix.join(ws, ".ascout", "earlier-evidence"), "evidence");
    const testPlan: LinuxTaskSandboxPlanV1 = { ...plan, workspace: ws, gitDir: posix.join(ws, ".git") };
    const script = `
const fs = require("node:fs");
const attempt = (fn) => { try { fn(); return "allowed"; } catch (e) { return e.code || String(e); } };
const out = {
  outside: fs.existsSync(${JSON.stringify(marker)}),
  git: attempt(() => fs.writeFileSync(".git/config", "x")),
  evidence: fs.existsSync(".ascout/earlier-evidence"),
  results: attempt(() => fs.writeFileSync(${JSON.stringify(posix.join(results, "probe"))}, "x")),
  capEff: (fs.readFileSync("/proc/self/status", "utf8").match(/^CapEff:\\s*(\\S+)/m) || [])[1],
};
const finish = (r) => { out.loopback = r; process.stdout.write(JSON.stringify(out)); process.exit(0); };
${loopback === null ? 'finish("denied");' : `const s = require("node:net").connect(${loopback.port}, "127.0.0.1"); s.on("data", () => finish("allowed")); s.on("error", () => finish("denied")); setTimeout(() => finish("denied"), 3000);`}
`;
    const output = await deps.exec(plan.bwrap, linuxTaskSandboxArgvV1(testPlan, deps.host.realpath(deps.execPath), ["-e", script], ws, [results], deps.host), { cwd: ws, env: {} });
    let seen: unknown;
    try {
      seen = JSON.parse(output);
    } catch {
      return "the bubblewrap task sandbox did not start (are unprivileged user namespaces allowed?)";
    }
    if (JSON.stringify(seen) !== JSON.stringify(LINUX_SELF_TEST_EXPECTED)) return `the bubblewrap task sandbox started but its self-test did not hold: ${JSON.stringify(seen)}`;
    return null;
  } finally {
    loopback?.close();
    deps.host.removeDir(root);
  }
}
