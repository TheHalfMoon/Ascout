import { execFile, spawn } from "node:child_process";
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
 * - there is no memory or CPU limit beyond Ascout's timeout and output caps;
 * - file metadata inside `.ascout` (whether a guessed name exists, its size and times) stays visible;
 *   its contents and folder listings do not;
 * - a descendant that detaches can keep running after the task and change the result folders after
 *   Ascout checked them; check.ts must not trust them on macOS beyond that check.
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
    // launchd would otherwise accept a job from the task and run it outside the sandbox.
    "(deny job-creation)",
    "(deny mach-register)",
    "(deny mach-priv*)",
    "(deny network*)",
    "(deny signal)",
    "(allow signal (target self))",
    "(allow signal (target children))",
    // Hard links and clones would let a protected file be reached under a name inside the repository.
    "(deny file-link)",
    "(deny file-clone)",
    // Other processes' arguments and environments (ps -E) stay unreadable.
    "(deny process-info*)",
    "(allow process-info* (target self))",
    '(deny sysctl-read (sysctl-name-prefix "kern.procargs"))',
    `(allow file-read-data ${plan.nodeReads.map((read) => `(subpath "${read}")`).join(" ")})`,
    `(allow file-read-data file-write* (subpath "${plan.workspace}") (subpath "${plan.privateDir}"))`,
    // Devices are closed except the few tools need, so the user's terminals can't be read.
    '(deny file-read-data file-write* (subpath "/dev"))',
    '(allow file-read-data file-write-data (literal "/dev/null") (literal "/dev/zero") (literal "/dev/random") (literal "/dev/urandom") (literal "/dev/tty") (literal "/dev/dtracehelper") (subpath "/dev/fd"))',
  ];
  // Always, so a task can't create a .git, with hooks, where there was none.
  lines.push(`(deny file-write* (subpath "${plan.gitDir ?? posix.join(plan.workspace, ".git")}"))`);
  // The same operations the repository rule allows: sandbox-exec let that specific file-read-data allow
  // win over a broader file-read* deny (macOS CI, 2026-11-16).
  lines.push(`(deny file-read-data file-write* (subpath "${evidence}"))`);
  if (writable.length > 0) lines.push(`(allow file-read-data file-write* ${writable.map((dir) => `(subpath "${dir}")`).join(" ")})`);
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
  /** A host loopback port nothing inside the sandbox may reach, for the self-test; null when none can be bound. */
  readonly loopbackPort: () => Promise<{ port: number; close: () => void } | null>;
  /** Runs a file and returns both output streams, so a failed self-test can say why. */
  readonly execBoth: (file: string, argv: readonly string[], options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs?: number }) => Promise<{ stdout: string; stderr: string }>;
  /** A random suffix for the self-test's probe names. */
  readonly randomName: () => string;
  /** How long the self-test watches for launchd to run a submitted job before judging that it didn't. */
  readonly launchdWaitMs: number;
  /** Starts a host process, outside the sandbox, whose starting environment holds `name`. */
  readonly spawnCanaryHolder: (name: string) => { pid: number; close: () => void };
}

export const realSpawnCanaryHolderV1: MacosTaskSandboxDepsV1["spawnCanaryHolder"] = (name) => {
  const child = spawn("/bin/sleep", ["60"], { env: { [name]: "visible" }, stdio: "ignore" });
  // A failed start leaves pid -1, which makes the control miss the canary, so the sandbox refuses.
  child.on("error", () => undefined);
  return { pid: child.pid ?? -1, close: () => { try { child.kill("SIGKILL"); } catch { /* it never started */ } } };
};

export const realExecBothV1: MacosTaskSandboxDepsV1["execBoth"] = (file, argv, { cwd, env, timeoutMs = 20_000 }) => new Promise((resolve) => {
  execFile(file, [...argv], { cwd, env, encoding: "utf8", timeout: timeoutMs }, (_error, stdout, stderr) => resolve({ stdout, stderr }));
});

export const realLoopbackPortV1 = (): Promise<{ port: number; close: () => void } | null> => new Promise((resolve) => {
  const server = createServer((socket) => socket.end("host"));
  server.once("error", () => resolve(null));
  server.listen(0, "127.0.0.1", () => resolve({ port: (server.address() as { port: number }).port, close: () => server.close() }));
});

const realDeps: MacosTaskSandboxDepsV1 = { platform: process.platform, host: realLinuxFsHostV1, exec: execFileTextV1, execPath: process.execPath, loopbackPort: realLoopbackPortV1, execBoth: realExecBothV1, randomName: () => Math.random().toString(36).slice(2, 12), launchdWaitMs: 5000, spawnCanaryHolder: realSpawnCanaryHolderV1 };

/** What the self-test task must report, in the exact configuration tasks run in. */
export const MACOS_SELF_TEST_EXPECTED = { outside: "EPERM", git: "EPERM", evidence: "EPERM", caseEvidence: "EPERM", firmlink: "EPERM", results: "allowed", link: "EPERM", linkOutside: "EPERM", otherEnvironment: "hidden", loopback: "denied", launchdJob: "refused" } as const;

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
    // Without one, a task could create ".GIT" on a case-insensitive volume, which the deny would miss.
    if (!deps.host.exists(gitPath)) return { refused: "the repository has no .git folder, which --sandbox needs in order to protect it" };
    const nodeReads = macosNodeReadsV1(deps.host.realpath(deps.execPath), deps.host);
    // The task could otherwise replace the Node or package-manager files the host runs next.
    if (nodeReads.some((read) => within(read, root))) return { refused: "the Node install folder is inside the repository, where a task could change it" };
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
  if (loopback === null) {
    deps.host.removeDir(root);
    return "the self-test could not bind a host loopback port to prove the network is denied";
  }
  const suffix = deps.randomName();
  const canaryName = `ASCOUT_SELFTEST_CANARY_${suffix.toUpperCase()}`;
  const label = `ascout.selftest.${suffix}`;
  const jobMarker = posix.join(root, "launchd-job-ran");
  // A process outside the sandbox that started with the canary in its environment.
  const holder = deps.spawnCanaryHolder(canaryName);
  try {
    // Control: outside the sandbox, ps -E does see the canary, so "hidden" inside means something.
    const control = await deps.execBoth("/bin/ps", ["-E", "-ww", "-p", String(holder.pid)], { cwd: root, env: {} });
    if (!control.stdout.includes(canaryName)) return "the self-test's control could not read another process's environment, so it can't prove the sandbox hides it";
    const ws = posix.join(root, "repo");
    const results = posix.join(ws, ".ascout", "runs", "selftest", "raw", "test");
    const marker = posix.join(root, "outside-marker");
    for (const dir of [ws, posix.join(ws, ".git"), posix.join(ws, ".ascout"), posix.join(ws, ".ascout", "runs"), posix.join(ws, ".ascout", "runs", "selftest"), posix.join(ws, ".ascout", "runs", "selftest", "raw"), results]) deps.host.makeDir(dir);
    deps.host.writeFile(marker, "outside");
    deps.host.writeFile(posix.join(ws, ".git", "config"), "[core]\n");
    deps.host.writeFile(posix.join(ws, ".ascout", "earlier-evidence"), "evidence");
    const testPlan: MacosTaskSandboxPlanV1 = { ...plan, workspace: ws, gitDir: posix.join(ws, ".git") };
    const script = `
const fs = require("node:fs");
const cp = require("node:child_process");
const attempt = (fn) => { try { fn(); return "allowed"; } catch (e) { return e.code || String(e); } };
const out = {
  outside: attempt(() => fs.readFileSync(${JSON.stringify(marker)})),
  git: attempt(() => fs.writeFileSync(".git/config", "x")),
  evidence: attempt(() => fs.readFileSync(".ascout/earlier-evidence")),
  caseEvidence: attempt(() => fs.readFileSync(".ASCOUT/earlier-evidence")),
  firmlink: attempt(() => fs.readFileSync(${JSON.stringify(`/System/Volumes/Data${marker}`)})),
  results: attempt(() => fs.writeFileSync(${JSON.stringify(posix.join(results, "probe"))}, "x")),
  link: attempt(() => fs.linkSync(".git/config", "linked-config")),
  linkOutside: attempt(() => fs.linkSync(${JSON.stringify(marker)}, "linked-outside")),
  otherEnvironment: (() => { const ps = cp.spawnSync("/bin/ps", ["-E", "-ww", "-p", ${JSON.stringify(String(holder.pid))}], { encoding: "utf8" }); return (ps.stdout || "").includes(${JSON.stringify(canaryName)}) ? "visible" : "hidden"; })(),
};
cp.spawnSync("/bin/launchctl", ["submit", "-l", ${JSON.stringify(label)}, "--", "/usr/bin/touch", ${JSON.stringify(jobMarker)}]);
const finish = (r) => { out.loopback = r; process.stdout.write(JSON.stringify(out)); process.exit(0); };
const s = require("node:net").connect(${loopback.port}, "127.0.0.1"); s.on("data", () => finish("allowed")); s.on("error", () => finish("denied")); setTimeout(() => finish("denied"), 3000);
`;
    const { stdout: output, stderr } = await deps.execBoth(SANDBOX_EXEC, macosTaskSandboxArgvV1(testPlan, deps.host.realpath(deps.execPath), ["-e", script], ws, [results]), { cwd: ws, env: {} });
    let seen: Record<string, unknown>;
    try {
      seen = JSON.parse(output) as Record<string, unknown>;
    } catch {
      const detail = `${output}\n${stderr}`.replace(/\s+/gu, " ").trim().slice(-600);
      return `the sandbox-exec task sandbox did not start${detail === "" ? "" : ` (${detail})`}`;
    }
    // Whether launchd ran the job is judged from outside: its marker must never appear, watched for the
    // whole wait (as long as the native control allows launchd to run a job).
    for (let waited = 0; waited < deps.launchdWaitMs && !deps.host.exists(jobMarker); waited += 250) await new Promise((resolve) => setTimeout(resolve, 250));
    seen.launchdJob = deps.host.exists(jobMarker) ? "ran" : "refused";
    // The holder must still be visible from outside, so "hidden" inside wasn't a dead or missing process.
    const after = await deps.execBoth("/bin/ps", ["-E", "-ww", "-p", String(holder.pid)], { cwd: root, env: {} });
    if (!after.stdout.includes(canaryName)) return "the self-test's control lost sight of the canary process, so its result proves nothing";
    if (JSON.stringify(seen) !== JSON.stringify(MACOS_SELF_TEST_EXPECTED)) return `the sandbox-exec task sandbox started but its self-test did not hold: ${JSON.stringify(seen)}`;
    return null;
  } finally {
    holder.close();
    loopback.close();
    // Only if the escape worked is there a job to remove; removing a missing label does nothing.
    if (deps.host.exists(jobMarker)) await deps.execBoth("/bin/launchctl", ["remove", label], { cwd: root, env: {} });
    deps.host.removeDir(root);
  }
}
