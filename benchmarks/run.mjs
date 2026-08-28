#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import {
  BenchmarkHarnessError,
  assertControllerSecretsAbsent,
  assertPathInside,
  canonicalJson,
  classifyLcov,
  extractGapCommands,
  extractSelectionCommands,
  frozenInstallCommand,
  membershipProofCommand,
  observationsDeterministic,
  parseRestrictedCommand,
  proveReviewedAssertionStatus,
  proveRunnerMembership,
  sanitizedDonorEnvironment,
  sha256Bytes,
  validateReplayCase,
} from "./harness-lib.mjs";

const CAPTURE_CAP_BYTES = 32 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const INSTALL_TIMEOUT_MS = 20 * 60 * 1000;
const CLONE_TIMEOUT_MS = 15 * 60 * 1000;
const CLEAN_RUNTIME_PREFIXES = ["node_modules/", ".ascout/", "coverage/"];
const SETUP_ERROR_PATTERNS = [
  /command not found/i,
  /cannot find module/i,
  /err_module_not_found/i,
  /no test files found/i,
  /failed to load config/i,
  /could not resolve/i,
];

function fail(code, message) {
  throw new BenchmarkHarnessError(code, message);
}

function parseArgs(argv) {
  const result = {
    caseId: null,
    manifest: resolve("benchmarks/manifest.json"),
    ascoutRoot: resolve("."),
    output: null,
    runId: null,
    repetitions: 2,
    planOnly: false,
    keepTemp: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      const value = argv[index];
      if (!value) fail("usage", `${arg} requires a value`);
      return value;
    };
    if (arg === "--case") result.caseId = next();
    else if (arg === "--manifest") result.manifest = resolve(next());
    else if (arg === "--ascout-root") result.ascoutRoot = resolve(next());
    else if (arg === "--output") result.output = resolve(next());
    else if (arg === "--run-id") result.runId = next();
    else if (arg === "--repetitions") result.repetitions = Number(next());
    else if (arg === "--plan") result.planOnly = true;
    else if (arg === "--keep-temp") result.keepTemp = true;
    else fail("usage", `unknown argument: ${arg}`);
  }
  if (!result.caseId) fail("usage", "--case is required");
  if (!Number.isSafeInteger(result.repetitions) || result.repetitions < 2 || result.repetitions > 3) {
    fail("usage", "--repetitions must be 2 or 3");
  }
  if (!result.planOnly && !result.runId) fail("usage", "--run-id is required for executable replay");
  return result;
}

function appendCapture(state, chunk) {
  state.observed += chunk.length;
  const remaining = CAPTURE_CAP_BYTES - state.captured;
  if (remaining <= 0) {
    state.truncated = true;
    return;
  }
  const piece = chunk.subarray(0, Math.min(remaining, chunk.length));
  state.chunks.push(Buffer.from(piece));
  state.captured += piece.length;
  if (piece.length !== chunk.length) state.truncated = true;
}

async function terminateTree(child) {
  if (!child.pid) return false;
  if (process.platform === "win32") {
    child.kill("SIGKILL");
    return true;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {}
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {}
  return true;
}

async function runBounded({ file, argv, cwd, env, timeoutMs = DEFAULT_TIMEOUT_MS, input = null }) {
  if (typeof file !== "string" || file.length === 0 || !Array.isArray(argv)) fail("process", "invalid process request");
  const stdout = { chunks: [], captured: 0, observed: 0, truncated: false };
  const stderr = { chunks: [], captured: 0, observed: 0, truncated: false };
  const child = spawn(file, argv, {
    cwd,
    env,
    shell: false,
    detached: process.platform !== "win32",
    windowsHide: true,
    stdio: [input === null ? "ignore" : "pipe", "pipe", "pipe"],
  });
  if (input !== null) {
    child.stdin.end(input);
  }
  child.stdout.on("data", (chunk) => appendCapture(stdout, chunk));
  child.stderr.on("data", (chunk) => appendCapture(stderr, chunk));
  const result = await new Promise((resolvePromise) => {
    let settled = false;
    const timer = setTimeout(async () => {
      if (settled) return;
      settled = true;
      await terminateTree(child);
      resolvePromise({ outcome: "timed_out", exitCode: null, signal: null });
    }, timeoutMs);
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ outcome: "error", exitCode: null, signal: null, error });
    });
    child.once("close", (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ outcome: "exited", exitCode, signal });
    });
  });
  return {
    ...result,
    stdout: Buffer.concat(stdout.chunks, stdout.captured),
    stderr: Buffer.concat(stderr.chunks, stderr.captured),
    stdoutTruncated: stdout.truncated,
    stderrTruncated: stderr.truncated,
  };
}

function outputDigest(result) {
  return {
    exit_code: result.exitCode,
    outcome: result.outcome,
    stdout_sha256: sha256Bytes(result.stdout),
    stderr_sha256: sha256Bytes(result.stderr),
    stdout_truncated: result.stdoutTruncated,
    stderr_truncated: result.stderrTruncated,
  };
}

function textOutput(result) {
  return `${result.stdout.toString("utf8")}\n${result.stderr.toString("utf8")}`;
}

function requireExited(result, label) {
  if (result.outcome !== "exited") fail("process", `${label} did not exit normally (${result.outcome})`);
  if (result.stdoutTruncated || result.stderrTruncated) fail("process", `${label} output exceeded capture cap`);
}

function shortNxDir(root) {
  return join(tmpdir(), `a75-nx-${sha256Bytes(Buffer.from(root, "utf8")).slice(0, 16)}`);
}

function runtimeEnvironment(root, commandEnv = {}) {
  const pathValue = process.env.PATH;
  if (!pathValue) fail("environment", "controller PATH is unavailable");
  const home = join(root, "home");
  const temp = join(root, "tmp");
  const env = sanitizedDonorEnvironment({ pathValue, home, temp, commandEnv });
  Object.assign(env, {
    XDG_CACHE_HOME: join(root, "cache", "xdg"),
    npm_config_cache: join(root, "cache", "npm"),
    COREPACK_HOME: join(root, "cache", "corepack"),
    NX_SOCKET_DIR: shortNxDir(root),
  });
  assertControllerSecretsAbsent(env);
  return env;
}

async function ensureRuntimeDirs(root) {
  await Promise.all([
    mkdir(join(root, "home"), { recursive: true }),
    mkdir(join(root, "tmp"), { recursive: true }),
    mkdir(join(root, "cache", "xdg"), { recursive: true }),
    mkdir(join(root, "cache", "npm"), { recursive: true }),
    mkdir(join(root, "cache", "corepack"), { recursive: true }),
    mkdir(shortNxDir(root), { recursive: true }),
  ]);
}

async function runGit(repo, args, env, options = {}) {
  const argv = repo === null ? args : ["-C", repo, ...args];
  const result = await runBounded({ file: "git", argv, cwd: repo ?? process.cwd(), env, timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS, input: options.input ?? null });
  requireExited(result, `git ${args[0] ?? ""}`);
  if (!options.allowFailure && result.exitCode !== 0) {
    fail("git", `git ${args.join(" ")} failed: ${result.stderr.toString("utf8").trim()}`);
  }
  return result;
}

async function gitText(repo, args, env) {
  const result = await runGit(repo, args, env);
  return result.stdout.toString("utf8").trim();
}

async function objectExists(repo, objectSpec, env) {
  const result = await runGit(repo, ["cat-file", "-e", objectSpec], env, { allowFailure: true });
  return result.exitCode === 0;
}

async function objectBytes(repo, objectSpec, env) {
  const result = await runGit(repo, ["cat-file", "blob", objectSpec], env);
  return result.stdout;
}

async function writeObjectPath(repo, commit, path, env) {
  const absolute = resolve(repo, path);
  assertPathInside(repo, absolute);
  await mkdir(dirname(absolute), { recursive: true });
  const bytes = await objectBytes(repo, `${commit}:${path}`, env);
  await writeFile(absolute, bytes);
}

async function restorePath(repo, commit, path, env) {
  if (await objectExists(repo, `${commit}:${path}`, env)) {
    await runGit(repo, ["restore", `--source=${commit}`, "--staged", "--worktree", "--", path], env);
  } else {
    await runGit(repo, ["rm", "-f", "--ignore-unmatch", "--", path], env);
  }
}

async function changedPaths(repo, env) {
  const unstaged = (await gitText(repo, ["diff", "--name-only", "--no-renames"], env)).split("\n").filter(Boolean);
  const staged = (await gitText(repo, ["diff", "--cached", "--name-only", "--no-renames"], env)).split("\n").filter(Boolean);
  const untracked = (await gitText(repo, ["ls-files", "--others", "--exclude-standard"], env)).split("\n").filter(Boolean);
  return { unstaged: [...new Set(unstaged)].sort(), staged: [...new Set(staged)].sort(), untracked: [...new Set(untracked)].sort() };
}

function unexpectedUntracked(paths) {
  return paths.filter((path) => !CLEAN_RUNTIME_PREFIXES.some((prefix) => path === prefix.slice(0, -1) || path.startsWith(prefix)));
}

async function assertMeasuredState(repo, expectedProduction, env) {
  const state = await changedPaths(repo, env);
  const expected = [...expectedProduction].sort();
  if (canonicalJson(state.unstaged) !== canonicalJson(expected)) {
    fail("binding_integrity", `measured unstaged path set mismatch: expected ${expected.join(",")}, observed ${state.unstaged.join(",")}`);
  }
  if (state.staged.length !== 0) fail("binding_integrity", `measured repository has staged changes: ${state.staged.join(",")}`);
  const unexpected = unexpectedUntracked(state.untracked);
  if (unexpected.length !== 0) fail("binding_integrity", `measured repository has unexpected untracked paths: ${unexpected.join(",")}`);
}

async function assertCleanSource(repo, env) {
  const state = await changedPaths(repo, env);
  if (state.unstaged.length !== 0 || state.staged.length !== 0 || unexpectedUntracked(state.untracked).length !== 0) {
    fail("binding_integrity", `repository source is not clean: ${canonicalJson(state).trim()}`);
  }
}

async function verifyGitIdentities(caseRecord, cacheRepo, env) {
  for (const role of ["base", "fix", "oracle"]) {
    const revision = caseRecord.git[role];
    const type = await gitText(cacheRepo, ["cat-file", "-t", revision.commit_id], env);
    if (type !== "commit") fail("identity", `${caseRecord.case_id} ${role} is not a commit`);
    const tree = await gitText(cacheRepo, ["rev-parse", `${revision.commit_id}^{tree}`], env);
    if (tree !== revision.tree_id) fail("identity", `${caseRecord.case_id} ${role} tree mismatch`);
    const parentLine = await gitText(cacheRepo, ["rev-list", "--parents", "-n", "1", revision.commit_id], env);
    const parents = parentLine.split(/\s+/).slice(1);
    if (canonicalJson(parents) !== canonicalJson(revision.required_parent_ids)) {
      fail("identity", `${caseRecord.case_id} ${role} parent identity mismatch`);
    }
  }
  const baseToFix = await gitText(cacheRepo, ["diff", "--name-only", "--no-renames", caseRecord.git.base.commit_id, caseRecord.git.fix.commit_id], env);
  const changed = baseToFix.split("\n").filter(Boolean).sort();
  for (const path of [...caseRecord.paths.production, ...caseRecord.paths.regression_tests]) {
    if (!changed.includes(path)) fail("identity", `reviewed path ${path} is not changed between base and fix`);
  }
  if (caseRecord.case_class === "selection") {
    const ancillary = caseRecord.reconstruction.ancillary_review;
    const expectedAncillary = changed.filter((path) => !caseRecord.paths.production.includes(path) && !caseRecord.paths.regression_tests.includes(path));
    if (canonicalJson(expectedAncillary) !== canonicalJson([...ancillary.changed_paths].sort())) fail("binding_integrity", "selection ancillary changed-path set drifted");
    const classified = [...ancillary.preserved_allowlist, ...ancillary.excluded_from_derived_baseline].sort();
    if (canonicalJson(classified) !== canonicalJson(expectedAncillary)) fail("binding_integrity", "selection ancillary classification is not exhaustive");
  }
}

async function verifyPinnedBytes(caseRecord, cacheRepo, env) {
  for (const role of ["base", "fix", "oracle"]) {
    const commit = caseRecord.git[role].commit_id;
    for (const evidence of caseRecord.licensing[role].evidence) {
      const blob = await gitText(cacheRepo, ["rev-parse", `${commit}:${evidence.path}`], env);
      if (blob !== evidence.blob_id) fail("license", `${role} license blob mismatch for ${evidence.path}`);
      const bytes = await objectBytes(cacheRepo, `${commit}:${evidence.path}`, env);
      if (sha256Bytes(bytes) !== evidence.sha256) fail("license", `${role} license digest mismatch for ${evidence.path}`);
    }
  }
  const lockCommit = caseRecord.case_class === "selection" ? caseRecord.git.fix.commit_id : caseRecord.git.base.commit_id;
  const lock = caseRecord.runtime.lockfile;
  const blob = await gitText(cacheRepo, ["rev-parse", `${lockCommit}:${lock.path}`], env);
  if (blob !== lock.blob_id) fail("lockfile", `lockfile blob mismatch for ${lock.path}`);
  const bytes = await objectBytes(cacheRepo, `${lockCommit}:${lock.path}`, env);
  if (sha256Bytes(bytes) !== lock.sha256) fail("lockfile", `lockfile digest mismatch for ${lock.path}`);
}

async function cloneAcquisition(caseRecord, controllerRoot) {
  const cacheRepo = join(controllerRoot, "acquisition.git");
  const env = runtimeEnvironment(controllerRoot);
  const result = await runBounded({
    file: "git",
    argv: ["clone", "--mirror", "--no-tags", caseRecord.upstream.canonical_url, cacheRepo],
    cwd: controllerRoot,
    env,
    timeoutMs: CLONE_TIMEOUT_MS,
  });
  requireExited(result, "acquisition clone");
  if (result.exitCode !== 0) fail("acquisition", `upstream clone failed: ${result.stderr.toString("utf8").trim()}`);
  await verifyGitIdentities(caseRecord, cacheRepo, env);
  await verifyPinnedBytes(caseRecord, cacheRepo, env);
  return cacheRepo;
}

async function cloneIsolated(cacheRepo, destination, root, canonicalUrl) {
  const env = runtimeEnvironment(root);
  const result = await runBounded({
    file: "git",
    argv: ["clone", "--no-local", "--no-checkout", "--no-tags", cacheRepo, destination],
    cwd: root,
    env,
    timeoutMs: CLONE_TIMEOUT_MS,
  });
  requireExited(result, "isolated clone");
  if (result.exitCode !== 0) fail("acquisition", `isolated clone failed: ${result.stderr.toString("utf8").trim()}`);
  await runGit(destination, ["remote", "set-url", "origin", canonicalUrl], env);
  const isolatedOrigin = await gitText(destination, ["remote", "get-url", "origin"], env);
  if (isolatedOrigin !== canonicalUrl) {
    fail("binding_integrity", `isolated clone origin mismatch: expected ${canonicalUrl}, observed ${isolatedOrigin}`);
  }
  await runGit(destination, ["config", "core.hooksPath", "/dev/null"], env);
  await runGit(destination, ["config", "submodule.recurse", "false"], env);
  await runGit(destination, ["config", "commit.gpgsign", "false"], env);
  return destination;
}

async function checkoutExact(repo, commit, env) {
  await runGit(repo, ["checkout", "--detach", "--force", commit], env);
  const head = await gitText(repo, ["rev-parse", "HEAD"], env);
  if (head !== commit) fail("identity", `checkout head mismatch: ${head} != ${commit}`);
}

async function verifyToolchain(caseRecord, root, cwd) {
  const expectedNode = caseRecord.runtime.node_version.replace(/^v/, "");
  const actualNode = process.version.replace(/^v/, "");
  if (actualNode !== expectedNode) fail("toolchain", `Node mismatch: expected ${expectedNode}, observed ${actualNode}`);
  const env = runtimeEnvironment(root);
  const pm = caseRecord.runtime.package_manager;
  const result = await runBounded({ file: pm, argv: ["--version"], cwd, env, timeoutMs: 60_000 });
  requireExited(result, `${pm} --version`);
  if (result.exitCode !== 0) fail("toolchain", `${pm} --version failed`);
  const actual = result.stdout.toString("utf8").trim();
  if (actual !== caseRecord.runtime.package_manager_version) fail("toolchain", `${pm} mismatch: expected ${caseRecord.runtime.package_manager_version}, observed ${actual}`);
  return { node: actualNode, package_manager: pm, package_manager_version: actual };
}

async function verifyLockfileWorkingBytes(caseRecord, repo) {
  const lock = caseRecord.runtime.lockfile;
  const absolute = resolve(repo, lock.path);
  assertPathInside(repo, absolute);
  const bytes = await readFile(absolute);
  if (sha256Bytes(bytes) !== lock.sha256) fail("lockfile", `working lockfile digest mismatch for ${lock.path}`);
}

async function installDependencies(caseRecord, repo, root) {
  const env = runtimeEnvironment(root);
  await verifyLockfileWorkingBytes(caseRecord, repo);
  const command = frozenInstallCommand(caseRecord.runtime);
  const result = await runBounded({ file: command.file, argv: command.argv, cwd: repo, env: { ...env, ...command.env }, timeoutMs: INSTALL_TIMEOUT_MS });
  requireExited(result, "frozen dependency install");
  if (result.exitCode !== 0) fail("dependency_reconstruction", `frozen install failed: ${result.stderr.toString("utf8").slice(-4000)}`);
  await verifyLockfileWorkingBytes(caseRecord, repo);
  await assertCleanSource(repo, env);
  return outputDigest(result);
}

function syntheticPayload(caseRecord, tree) {
  const synthetic = caseRecord.reconstruction.synthetic_head;
  const template = synthetic.payload_template_utf8;
  if (sha256Bytes(Buffer.from(template, "utf8")) !== synthetic.payload_template_sha256) fail("reconstruction", "synthetic commit template digest mismatch");
  return template
    .replaceAll("{derived_tree_id}", tree)
    .replaceAll("{base_commit_id}", caseRecord.git.base.commit_id);
}

async function materializeSelection(caseRecord, cacheRepo, root, name, withFix) {
  const repo = join(root, name);
  await cloneIsolated(cacheRepo, repo, root, caseRecord.upstream.canonical_url);
  const env = runtimeEnvironment(root);
  await checkoutExact(repo, caseRecord.git.fix.commit_id, env);
  for (const path of caseRecord.paths.production) await restorePath(repo, caseRecord.git.base.commit_id, path, env);
  for (const path of caseRecord.reconstruction.ancillary_review.excluded_from_derived_baseline) await restorePath(repo, caseRecord.git.base.commit_id, path, env);
  const tree = await gitText(repo, ["write-tree"], env);
  const payload = syntheticPayload(caseRecord, tree);
  const commitResult = await runGit(repo, ["hash-object", "-t", "commit", "-w", "--stdin"], env, { input: Buffer.from(payload, "utf8") });
  const syntheticCommit = commitResult.stdout.toString("utf8").trim();
  await checkoutExact(repo, syntheticCommit, env);
  await assertCleanSource(repo, env);
  const install = await installDependencies(caseRecord, repo, root);
  if (withFix) {
    for (const path of caseRecord.paths.production) await writeObjectPath(repo, caseRecord.git.fix.commit_id, path, env);
    await assertMeasuredState(repo, caseRecord.paths.production, env);
  }
  return { repo, tree, syntheticCommit, install };
}

async function computeWorktreeTree(repo, productionPaths, root) {
  const env = runtimeEnvironment(root);
  const indexPath = join(root, `index-${randomUUID()}`);
  const realIndex = join(repo, ".git", "index");
  try {
    await copyFile(realIndex, indexPath);
  } catch {
    await runGit(repo, ["read-tree", "HEAD"], { ...env, GIT_INDEX_FILE: indexPath });
  }
  const indexEnv = { ...env, GIT_INDEX_FILE: indexPath };
  await runGit(repo, ["add", "--", ...productionPaths], indexEnv);
  const tree = await gitText(repo, ["write-tree"], indexEnv);
  await rm(indexPath, { force: true });
  return tree;
}

async function materializeGap(caseRecord, cacheRepo, root, name, { productionFix, regressionPatch }) {
  const repo = join(root, name);
  await cloneIsolated(cacheRepo, repo, root, caseRecord.upstream.canonical_url);
  const env = runtimeEnvironment(root);
  await checkoutExact(repo, caseRecord.git.base.commit_id, env);
  const install = await installDependencies(caseRecord, repo, root);
  if (regressionPatch) {
    for (const path of caseRecord.paths.regression_tests) await writeObjectPath(repo, caseRecord.git.fix.commit_id, path, env);
  }
  if (productionFix) {
    for (const path of caseRecord.paths.production) await writeObjectPath(repo, caseRecord.git.fix.commit_id, path, env);
  }
  if (productionFix && !regressionPatch) await assertMeasuredState(repo, caseRecord.paths.production, env);
  const tree = productionFix && !regressionPatch ? await computeWorktreeTree(repo, caseRecord.paths.production, root) : null;
  return { repo, tree, install };
}

function runnerKind(caseRecord) {
  const text = caseRecord.case_class === "selection"
    ? extractSelectionCommands(caseRecord).related
    : extractGapCommands(caseRecord).targeted;
  if (/jest/i.test(text)) return "jest";
  if (/vitest/i.test(text)) return "vitest";
  const joined = caseRecord.paths.regression_tests.join(" ");
  if (/jest/i.test(joined)) return "jest";
  return "vitest";
}

function rejectSetupFailure(output, label) {
  const match = SETUP_ERROR_PATTERNS.find((pattern) => pattern.test(output));
  if (match) fail("oracle_setup", `${label} contains setup/runner failure evidence matching ${match}`);
}

async function runMembershipProof(caseRecord, repo, root, commandText, expectedExitCode, label) {
  const proofPath = join(root, "membership-proofs", `${randomUUID()}.json`);
  assertPathInside(root, proofPath);
  await mkdir(dirname(proofPath), { recursive: true });
  const variant = membershipProofCommand(commandText, runnerKind(caseRecord), proofPath);
  const envBase = runtimeEnvironment(root);
  const proofEnv = { ...envBase, ...variant.env };
  assertControllerSecretsAbsent(proofEnv);
  const proof = await runBounded({ file: variant.file, argv: variant.argv, cwd: repo, env: proofEnv });
  requireExited(proof, `${label} membership proof`);
  rejectSetupFailure(textOutput(proof), `${label} membership proof`);
  if (proof.exitCode !== expectedExitCode) fail("oracle", `${label} reporter-only proof changed exit behavior`);

  let reportStat;
  try {
    reportStat = await stat(proofPath);
  } catch {
    const boundedOutput = textOutput(proof).slice(0, 2000);
    fail("oracle_membership", `${label} membership proof did not produce its external JSON report (exit ${proof.exitCode}); output=${boundedOutput}`);
  }
  if (!reportStat.isFile() || reportStat.size <= 0 || reportStat.size > CAPTURE_CAP_BYTES) {
    fail("oracle_membership", `${label} membership proof JSON report has an invalid size`);
  }
  const reportBytes = await readFile(proofPath);
  let report;
  try {
    report = JSON.parse(reportBytes.toString("utf8"));
  } catch {
    fail("oracle_membership", `${label} membership proof JSON report is not valid JSON`);
  }
  const membership = proveRunnerMembership(
    report,
    caseRecord.oracle.specification.regression_test_ids,
    caseRecord.paths.regression_tests,
  );
  const reviewed_status = {
    passed: proveReviewedAssertionStatus(
      report,
      caseRecord.oracle.specification.regression_test_ids,
      caseRecord.paths.regression_tests,
      "passed",
    ),
    failed: proveReviewedAssertionStatus(
      report,
      caseRecord.oracle.specification.regression_test_ids,
      caseRecord.paths.regression_tests,
      "failed",
    ),
  };
  return {
    membership,
    reviewed_status,
    evidence: {
      ...outputDigest(proof),
      report_sha256: sha256Bytes(reportBytes),
      report_bytes: reportBytes.length,
      evidence_kind: "runner-json-assertion-results",
    },
  };
}

async function runReviewed(caseRecord, repo, root, commandText, expected, label, expectedPaths) {
  const envBase = runtimeEnvironment(root);
  const parsed = parseRestrictedCommand(commandText);
  const env = { ...envBase, ...parsed.env };
  assertControllerSecretsAbsent(env);
  await assertMeasuredState(repo, expectedPaths, envBase);
  const exact = await runBounded({ file: parsed.file, argv: parsed.argv, cwd: repo, env });
  requireExited(exact, label);
  const exactText = textOutput(exact);
  rejectSetupFailure(exactText, label);
  const proof = await runMembershipProof(caseRecord, repo, root, commandText, exact.exitCode, label);
  if (!proof.membership) fail("oracle_membership", `${label} did not prove all reviewed regression_test_ids executed`);
  const expectedStatus = expected === "pass" ? "passed" : "failed";
  if (proof.reviewed_status[expectedStatus] !== true) {
    fail("oracle", `${label} did not prove every reviewed regression_test_id was ${expectedStatus}`);
  }
  await assertMeasuredState(repo, expectedPaths, envBase);
  return {
    status: expected === "pass" ? "passed" : "failed_as_expected",
    membership_proven: true,
    reviewed_assertion_status: expectedStatus,
    command_exit_code: exact.exitCode,
    exact: outputDigest(exact),
    proof: proof.evidence,
  };
}

async function runComparator(caseRecord, repo, root, commandText, label, requireMembership) {
  const envBase = runtimeEnvironment(root);
  await assertMeasuredState(repo, caseRecord.paths.production, envBase);
  const parsed = parseRestrictedCommand(commandText);
  const env = { ...envBase, ...parsed.env };
  const exact = await runBounded({ file: parsed.file, argv: parsed.argv, cwd: repo, env });
  requireExited(exact, label);
  const exactText = textOutput(exact);
  rejectSetupFailure(exactText, label);
  const proof = requireMembership
    ? await runMembershipProof(caseRecord, repo, root, commandText, exact.exitCode, label)
    : null;
  if (requireMembership && !proof.membership) fail("oracle_membership", `${label} did not prove oracle membership`);
  await assertMeasuredState(repo, caseRecord.paths.production, envBase);
  return {
    status: exact.exitCode === 0 ? "passed" : "failed",
    exit_code: exact.exitCode,
    oracle_membership: requireMembership ? true : null,
    exact: outputDigest(exact),
    proof: proof?.evidence ?? null,
  };
}

async function runAscout(caseRecord, repo, root, ascoutRoot) {
  const env = runtimeEnvironment(root);
  await assertMeasuredState(repo, caseRecord.paths.production, env);
  const cli = resolve(ascoutRoot, "dist/cli.js");
  const result = await runBounded({ file: process.execPath, argv: [cli, "check", "--format", "json"], cwd: repo, env, timeoutMs: DEFAULT_TIMEOUT_MS });
  requireExited(result, "Ascout comparator");
  let receipt;
  const stdoutText = result.stdout.toString("utf8");
  try {
    receipt = JSON.parse(stdoutText);
  } catch {
    const stderrText = result.stderr.toString("utf8").slice(0, 1000);
    fail("ascout", `Ascout JSON receipt could not be parsed (exit ${result.exitCode}); stdout=${stdoutText.slice(0, 1000)} stderr=${stderrText}`);
  }
  await assertMeasuredState(repo, caseRecord.paths.production, env);
  return {
    exit_code: result.exitCode,
    completeness: receipt?.summary?.completeness ?? receipt?.completeness ?? null,
    source_stability: receipt?.stability ?? receipt?.source?.stability ?? receipt?.source_stability ?? null,
    source: {
      repository_id: receipt?.source?.start?.repository_id ?? null,
      repository_id_kind: receipt?.source?.start?.repository_id_kind ?? null,
      portable: receipt?.source?.start?.portable ?? null,
      head_sha: receipt?.source?.start?.head_sha ?? null,
    },
    exercise: receipt?.exercise ?? null,
    selection: receipt?.selection ?? null,
    tasks: Array.isArray(receipt?.tasks)
      ? receipt.tasks.map((task) => ({
          task_id: task.task_id,
          task_type: task.task_type,
          status: task.status,
          reason_code: task.reason_code,
          exit_code: task.exit_code,
          command_surface_changed: task.command_surface_changed,
          changed_authority_paths: task.changed_authority_paths,
          execution_admission: task.execution_admission,
          observations: task.observations,
          cache_state: task.cache_state,
          selected_test_count: task.selected_test_count ?? null,
          deselected_test_count: task.deselected_test_count ?? null,
          output_truncated: task.output_truncated,
        }))
      : [],
    receipt_sha256: sha256Bytes(result.stdout),
  };
}

async function runSelectionObservation(caseRecord, cacheRepo, root, ascoutRoot) {
  const pre = await materializeSelection(caseRecord, cacheRepo, root, "oracle-pre", false);
  const fixed = await materializeSelection(caseRecord, cacheRepo, root, "measured", true);
  if (pre.tree !== fixed.tree || pre.syntheticCommit !== fixed.syntheticCommit) fail("reconstruction", "selection reconstruction identity differs across oracle/measured materialization");
  const commands = extractSelectionCommands(caseRecord);
  const preOracle = await runReviewed(caseRecord, pre.repo, root, commands.targeted, "fail", "pre-fix oracle", []);
  const fixedOracle = await runReviewed(caseRecord, fixed.repo, root, commands.targeted, "pass", "measured fixed oracle", caseRecord.paths.production);
  const full = await runComparator(caseRecord, fixed.repo, root, commands.full, "project-native full suite", true);
  const plain = await runComparator(caseRecord, fixed.repo, root, commands.plain, "plain project test", false);
  const related = await runComparator(caseRecord, fixed.repo, root, commands.related, "runner-native related selector", true);
  const ascout = await runAscout(caseRecord, fixed.repo, root, ascoutRoot);
  return {
    reconstruction: { derived_tree: fixed.tree, synthetic_head: fixed.syntheticCommit },
    pre_fix_oracle: { status: preOracle.status, membership_proven: preOracle.membership_proven },
    fixed_oracle: { status: fixedOracle.status, membership_proven: fixedOracle.membership_proven },
    full_reference: { status: full.status, oracle_membership: full.oracle_membership },
    plain: { status: plain.status },
    related: { status: related.status, oracle_membership: related.oracle_membership },
    ascout,
    gap_coverage: null,
    evidence: { preOracle, fixedOracle, full, plain, related, installs: { pre: pre.install, measured: fixed.install } },
  };
}

async function runGapObservation(caseRecord, cacheRepo, root, ascoutRoot) {
  const pre = await materializeGap(caseRecord, cacheRepo, root, "oracle-pre", { productionFix: false, regressionPatch: true });
  const fixed = await materializeGap(caseRecord, cacheRepo, root, "oracle-fixed", { productionFix: true, regressionPatch: true });
  const measured = await materializeGap(caseRecord, cacheRepo, root, "measured", { productionFix: true, regressionPatch: false });
  const commands = extractGapCommands(caseRecord);
  const preOracle = await runReviewed(caseRecord, pre.repo, root, commands.targeted, "fail", "gap pre-fix oracle", caseRecord.paths.regression_tests);
  const fixedOracle = await runReviewed(caseRecord, fixed.repo, root, commands.targeted, "pass", "gap fixed oracle", [...caseRecord.paths.production, ...caseRecord.paths.regression_tests]);
  const env = runtimeEnvironment(root);
  await assertMeasuredState(measured.repo, caseRecord.paths.production, env);
  const coverageCommand = parseRestrictedCommand(commands.fullCoverage);
  const coverageRun = await runBounded({ file: coverageCommand.file, argv: coverageCommand.argv, cwd: measured.repo, env: { ...env, ...coverageCommand.env }, timeoutMs: DEFAULT_TIMEOUT_MS });
  requireExited(coverageRun, "gap full coverage oracle");
  rejectSetupFailure(textOutput(coverageRun), "gap full coverage oracle");
  await assertMeasuredState(measured.repo, caseRecord.paths.production, env);
  const artifactPath = resolve(measured.repo, commands.artifact);
  assertPathInside(measured.repo, artifactPath);
  let artifactBytes;
  try {
    artifactBytes = await readFile(artifactPath);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail("coverage_oracle", `full coverage command completed without required LCOV artifact ${commands.artifact}: ${detail}`);
  }
  const classifications = classifyLcov(artifactBytes.toString("utf8"), caseRecord.oracle.specification.gap_changed_executable_lines);
  const frozenCoverage = { artifact_sha256: sha256Bytes(artifactBytes), classifications };
  const nativeCoverage = await runComparator(caseRecord, measured.repo, root, commands.nativeCoverage, "project-native coverage reference", false);
  const ascout = await runAscout(caseRecord, measured.repo, root, ascoutRoot);
  return {
    reconstruction: { derived_tree: measured.tree, synthetic_head: null },
    pre_fix_oracle: { status: preOracle.status, membership_proven: preOracle.membership_proven },
    fixed_oracle: { status: fixedOracle.status, membership_proven: fixedOracle.membership_proven },
    full_reference: { status: coverageRun.exitCode === 0 ? "passed" : "failed" },
    plain: commands.reference === null ? null : await runComparator(caseRecord, measured.repo, root, commands.reference, "project-native test reference", false),
    related: { status: "not_applicable" },
    ascout,
    gap_coverage: frozenCoverage,
    evidence: { preOracle, fixedOracle, coverage: outputDigest(coverageRun), nativeCoverage, installs: { pre: pre.install, fixed: fixed.install, measured: measured.install } },
  };
}

function stableObservation(observation) {
  const semanticAscout = observation.ascout === null
    ? null
    : {
        exit_code: observation.ascout.exit_code,
        completeness: observation.ascout.completeness,
        source_stability: observation.ascout.source_stability,
        source: observation.ascout.source,
        selection: observation.ascout.selection,
        exercise: observation.ascout.exercise,
        tasks: observation.ascout.tasks,
      };
  return {
    reconstruction: observation.reconstruction,
    pre_fix_oracle: observation.pre_fix_oracle,
    fixed_oracle: observation.fixed_oracle,
    full_reference: observation.full_reference,
    related: observation.related,
    ascout: semanticAscout,
    gap_coverage: observation.gap_coverage,
  };
}

function assertCrossObservationIdentity(observations, caseRecord) {
  const trees = [...new Set(observations.map((item) => item.reconstruction.derived_tree))];
  if (trees.length !== 1) fail("reconstruction", `${caseRecord.case_id} derived tree is not repeatable`);
  if (caseRecord.case_class === "selection") {
    const heads = [...new Set(observations.map((item) => item.reconstruction.synthetic_head))];
    if (heads.length !== 1) fail("reconstruction", `${caseRecord.case_id} synthetic HEAD is not repeatable`);
  }
  return { derivedTree: trees[0], syntheticHead: observations[0].reconstruction.synthetic_head };
}

async function executeCase(caseRecord, options) {
  if (process.platform !== "linux") fail("platform", "T075 executable replay is currently authorized only on Linux; T079 owns cross-platform hardening");
  const controllerRoot = await mkdtemp(join(tmpdir(), `ascout-t075-${caseRecord.case_id}-`));
  const runtimeRoots = [controllerRoot];
  try {
    await ensureRuntimeDirs(controllerRoot);
    const toolchain = await verifyToolchain(caseRecord, controllerRoot, options.ascoutRoot);
    const cacheRepo = await cloneAcquisition(caseRecord, controllerRoot);
    const observations = [];
    for (let index = 0; index < options.repetitions; index += 1) {
      const observationRoot = join(controllerRoot, `observation-${index + 1}`);
      runtimeRoots.push(observationRoot);
      await ensureRuntimeDirs(observationRoot);
      const observation = caseRecord.case_class === "selection"
        ? await runSelectionObservation(caseRecord, cacheRepo, observationRoot, options.ascoutRoot)
        : await runGapObservation(caseRecord, cacheRepo, observationRoot, options.ascoutRoot);
      observations.push(observation);
    }
    const identity = assertCrossObservationIdentity(observations, caseRecord);
    const deterministic = observationsDeterministic(observations.map(stableObservation));
    if (deterministic !== "deterministic") fail("oracle_flake", `${caseRecord.case_id} observations are ${deterministic}`);
    const evidence = {
      schema_version: 1,
      case_id: caseRecord.case_id,
      case_revision: caseRecord.case_revision,
      manifest_revision: options.manifestRevision,
      t075_run_id: options.runId,
      network: {
        enforcement: "not_enforced",
        capability: "runner network available for public acquisition and dependency reconstruction",
        isolation_claimed: false,
      },
      platform: { os: process.platform, arch: process.arch },
      toolchain,
      observation_key: {
        case_revision: caseRecord.case_revision,
        derived_tree: identity.derivedTree,
        synthetic_head: identity.syntheticHead,
        node: toolchain.node,
        package_manager: `${toolchain.package_manager}@${toolchain.package_manager_version}`,
        cache_class: "fresh-observation-root",
      },
      valid_observation_count: observations.length,
      determinism: deterministic,
      observations,
    };
    const evidenceText = canonicalJson(evidence);
    const result = {
      status: "BENCHMARK_ACTIVE",
      case_id: caseRecord.case_id,
      case_revision: caseRecord.case_revision,
      lifecycle_state: "BENCHMARK_ACTIVE",
      derived_identity: identity.derivedTree,
      synthetic_head: identity.syntheticHead,
      t075_run_id: options.runId,
      valid_observation_count: observations.length,
      evidence_sha256: sha256Bytes(Buffer.from(evidenceText, "utf8")),
      evidence,
    };
    if (options.output) {
      await mkdir(dirname(options.output), { recursive: true });
      await writeFile(options.output, canonicalJson(result));
    }
    process.stdout.write(canonicalJson(result));
    if (options.keepTemp) process.stderr.write(`T075_TEMP_ROOT=${controllerRoot}\n`);
    return;
  } finally {
    await Promise.all(runtimeRoots.map((runtimeRoot) => rm(shortNxDir(runtimeRoot), { recursive: true, force: true })));
    if (!options.keepTemp) await rm(controllerRoot, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(await readFile(options.manifest, "utf8"));
  const caseRecord = manifest.cases.find((item) => item.case_id === options.caseId);
  if (!caseRecord) fail("usage", `case not found: ${options.caseId}`);
  validateReplayCase(caseRecord);
  if (options.planOnly) {
    const commands = caseRecord.case_class === "selection" ? extractSelectionCommands(caseRecord) : extractGapCommands(caseRecord);
    process.stdout.write(canonicalJson({
      case_id: caseRecord.case_id,
      case_revision: caseRecord.case_revision,
      lifecycle_state: caseRecord.lifecycle_state,
      runtime: caseRecord.runtime,
      commands,
      isolation: {
        ephemeral_per_case: true,
        separate_oracle_and_measured_repositories: true,
        donor_environment_allowlisted: true,
        git_hooks_disabled: true,
        submodules_not_initialized: true,
        bounded_processes: true,
        network_enforcement: "not_enforced",
        canonical_acquisition_cache_shared_with_measured_commands: false,
      },
    }));
    return;
  }
  await stat(resolve(options.ascoutRoot, "dist/cli.js"));
  await executeCase(caseRecord, { ...options, manifestRevision: manifest.manifest_revision });
}

main().catch((error) => {
  if (error instanceof BenchmarkHarnessError) {
    process.stderr.write(`${error.code}: ${error.message}\n`);
    process.exitCode = 2;
    return;
  }
  process.stderr.write(`${error?.stack ?? String(error)}\n`);
  process.exitCode = 1;
});
