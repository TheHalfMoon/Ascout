#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertControllerSecretsAbsent,
  assertPathInside,
  canonicalJson,
  extractGapCommands,
  extractSelectionCommands,
  membershipProofCommand,
  parseRestrictedCommand,
  proveRunnerMembership,
  sanitizedDonorEnvironment,
  sha256Bytes,
  validateReplayCase,
} from "./harness-lib.mjs";
import { aggregateBenchmarkMetrics, computeCaseMetrics } from "./metrics-lib.mjs";

const CAPTURE_CAP_BYTES = 32 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const T075_TIMEOUT_MS = 70 * 60 * 1000;
const MANAGED_RUNNER_CACHE_PATHS = [".nx/cache", ".nx/workspace-data", ".cache", "node_modules/.cache"];
const METRIC_NX_DIRS = new Set();
const SAFE_ID = /^[A-Za-z0-9._-]+$/u;

export const T113_QUALIFIED_REPLAY_INPUTS = Object.freeze({
  "jotai-splitatom-identical-write": Object.freeze({
    case_id: "jotai-splitatom-identical-write",
    case_revision: 1,
    source_commit: "2955969c16a456c44da8dd4c1e31f8ad3fa6f9a4",
    workflow_run_id: "33991920845",
    workflow_run_attempt: 1,
    artifact_id: "9976936986",
    replay_sha256: "337cb9ca7680d5b5e33e5bf518268983df19af149c6f64812af4eef4a21f4c44",
    evidence_sha256: "a688937286b974788b0477b305c5fd1c315c8b580cbd17cf3f9b85d067616d5d",
    t075_run_id: "spec008-33991920845-1-jotai-splitatom-identical-write",
    replay_manifest_revision: 12,
    current_manifest_revision: 13,
    historical_manifest_blob: "ec4e9edde7bcf635063e23ee612cbad20712de6d",
    derived_identity: "00eabc7a7635b2f1f1d1d9e98a4ff5ae946c4175",
    synthetic_head: "a34238a0a43ac87745acd38a5d7bb4dadbcd08fc",
    platform: Object.freeze({ os: "linux", arch: "x64" }),
    toolchain: Object.freeze({ node: "24.15.0", package_manager: "yarn", package_manager_version: "1.22.22" }),
    valid_observations: 2,
  }),
  "immer-draftmap-iterator-compatibility": Object.freeze({
    case_id: "immer-draftmap-iterator-compatibility",
    case_revision: 2,
    source_commit: "256461e455b38e18a4ca06209184e0ddef274057",
    workflow_run_id: "34036997231",
    workflow_run_attempt: 1,
    artifact_id: "9990519748",
    replay_sha256: "2bb89f50cef7cf38f5e3b1fe53d191c03cd78f3a3a294770d323746a095d433d",
    evidence_sha256: "9d8195c6cfef34f2a004e6c7152536ba7a023f0865b0ed0a3173e0b7e127ce7f",
    t075_run_id: "spec008-34036997231-1-immer-draftmap-iterator-compatibility",
    replay_manifest_revision: 13,
    current_manifest_revision: 13,
    historical_manifest_blob: null,
    derived_identity: "557cb04b07c04ec09eff6bb3ee7f3280781f3c8b",
    synthetic_head: "22c8c3bec56034d0d8f7ad277e60ba2580a3b6a7",
    platform: Object.freeze({ os: "linux", arch: "x64" }),
    toolchain: Object.freeze({ node: "24.15.0", package_manager: "yarn", package_manager_version: "1.22.22" }),
    valid_observations: 2,
  }),
});

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function parseArgs(argv) {
  const result = {
    caseId: null,
    manifest: resolve("benchmarks/manifest.json"),
    ascoutRoot: resolve("."),
    output: null,
    runId: null,
    repetitions: 2,
    aggregateInputs: [],
    t075Input: null,
    t075HistoricalManifest: null,
    t075SourceCommit: null,
    t075WorkflowRunId: null,
    t075WorkflowRunAttempt: null,
    t075ArtifactId: null,
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
    else if (arg === "--aggregate-input") result.aggregateInputs.push(resolve(next()));
    else if (arg === "--t075-input") result.t075Input = resolve(next());
    else if (arg === "--t075-historical-manifest") result.t075HistoricalManifest = resolve(next());
    else if (arg === "--t075-source-commit") result.t075SourceCommit = next();
    else if (arg === "--t075-workflow-run-id") result.t075WorkflowRunId = next();
    else if (arg === "--t075-workflow-run-attempt") result.t075WorkflowRunAttempt = Number(next());
    else if (arg === "--t075-artifact-id") result.t075ArtifactId = next();
    else fail("usage", `unknown argument: ${arg}`);
  }
  const qualifiedFields = [
    result.t075Input,
    result.t075HistoricalManifest,
    result.t075SourceCommit,
    result.t075WorkflowRunId,
    result.t075WorkflowRunAttempt,
    result.t075ArtifactId,
  ];
  if (result.aggregateInputs.length > 0) {
    if (result.caseId !== null || result.runId !== null || qualifiedFields.some((value) => value !== null)) {
      fail("usage", "aggregate mode cannot be combined with --case, --run-id, or qualified T075 input arguments");
    }
    return result;
  }
  if (!result.caseId) fail("usage", "--case is required");
  if (!result.runId || !SAFE_ID.test(result.runId)) fail("usage", "--run-id must be a safe non-empty identifier");
  if (!Number.isSafeInteger(result.repetitions) || result.repetitions < 2 || result.repetitions > 3) fail("usage", "--repetitions must be 2 or 3");
  if (result.t075Input !== null) {
    if (!result.t075SourceCommit || !/^[a-f0-9]{40}$/u.test(result.t075SourceCommit)) fail("usage", "qualified T075 input requires a full lowercase --t075-source-commit");
    if (!result.t075WorkflowRunId || !/^\d+$/u.test(result.t075WorkflowRunId)) fail("usage", "qualified T075 input requires numeric --t075-workflow-run-id");
    if (result.t075WorkflowRunAttempt !== 1) fail("usage", "qualified T075 input requires --t075-workflow-run-attempt 1");
    if (!result.t075ArtifactId || !/^\d+$/u.test(result.t075ArtifactId)) fail("usage", "qualified T075 input requires numeric --t075-artifact-id");
  } else if (qualifiedFields.slice(1).some((value) => value !== null)) {
    fail("usage", "qualified T075 provenance arguments require --t075-input");
  }
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
  if (!child.pid) return;
  if (process.platform === "win32") {
    child.kill("SIGKILL");
    return;
  }
  try { process.kill(-child.pid, "SIGTERM"); } catch {}
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  try { process.kill(-child.pid, "SIGKILL"); } catch {}
}

async function runProcess({ file, argv, cwd, env, timeoutMs = DEFAULT_TIMEOUT_MS, input = null }) {
  const stdout = { chunks: [], captured: 0, observed: 0, truncated: false };
  const stderr = { chunks: [], captured: 0, observed: 0, truncated: false };
  const started = process.hrtime.bigint();
  const child = spawn(file, argv, {
    cwd,
    env,
    shell: false,
    detached: process.platform !== "win32",
    windowsHide: true,
    stdio: [input === null ? "ignore" : "pipe", "pipe", "pipe"],
  });
  if (input !== null) child.stdin.end(input);
  child.stdout.on("data", (chunk) => appendCapture(stdout, chunk));
  child.stderr.on("data", (chunk) => appendCapture(stderr, chunk));
  const result = await new Promise((resolvePromise) => {
    let settled = false;
    const timer = setTimeout(async () => {
      if (settled) return;
      settled = true;
      await terminateTree(child);
      resolvePromise({ outcome: "timed_out", exitCode: null, signal: null, error: null });
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
      resolvePromise({ outcome: "exited", exitCode, signal, error: null });
    });
  });
  return {
    ...result,
    durationMs: Number(process.hrtime.bigint() - started) / 1_000_000,
    stdout: Buffer.concat(stdout.chunks, stdout.captured),
    stderr: Buffer.concat(stderr.chunks, stderr.captured),
    stdoutTruncated: stdout.truncated,
    stderrTruncated: stderr.truncated,
  };
}

function requireExited(result, label) {
  if (result.outcome !== "exited") {
    const detail = result.error instanceof Error ? `: ${result.error.message}` : "";
    fail("process", `${label} did not exit normally (${result.outcome})${detail}`);
  }
  if (result.stdoutTruncated || result.stderrTruncated) fail("process", `${label} output exceeded capture cap`);
}

function outputDigest(result) {
  return {
    outcome: result.outcome,
    exit_code: result.exitCode,
    stdout_sha256: sha256Bytes(result.stdout),
    stderr_sha256: sha256Bytes(result.stderr),
    stdout_truncated: result.stdoutTruncated,
    stderr_truncated: result.stderrTruncated,
  };
}

function metricNxDir(root) {
  const digest = sha256Bytes(Buffer.from(root, "utf8")).slice(0, 16);
  const path = join(tmpdir(), `a76-nx-${digest}`);
  METRIC_NX_DIRS.add(path);
  return path;
}

async function ensureRuntimeDirs(root) {
  await Promise.all([
    mkdir(join(root, "home"), { recursive: true }),
    mkdir(join(root, "tmp"), { recursive: true }),
    mkdir(join(root, "cache", "xdg"), { recursive: true }),
    mkdir(join(root, "cache", "npm"), { recursive: true }),
    mkdir(join(root, "cache", "corepack"), { recursive: true }),
    mkdir(metricNxDir(root), { recursive: true }),
  ]);
}

async function runtimeEnvironment(root, commandEnv = {}) {
  await ensureRuntimeDirs(root);
  const pathValue = process.env.PATH;
  if (!pathValue) fail("environment", "controller PATH is unavailable");
  const env = sanitizedDonorEnvironment({
    pathValue,
    home: join(root, "home"),
    temp: join(root, "tmp"),
    commandEnv,
  });
  Object.assign(env, {
    XDG_CACHE_HOME: join(root, "cache", "xdg"),
    npm_config_cache: join(root, "cache", "npm"),
    COREPACK_HOME: join(root, "cache", "corepack"),
    NX_SOCKET_DIR: metricNxDir(root),
  });
  assertControllerSecretsAbsent(env);
  return env;
}

async function runGit(repo, args, env, { allowFailure = false, input = null } = {}) {
  const result = await runProcess({ file: "git", argv: ["-C", repo, ...args], cwd: repo, env, input });
  requireExited(result, `git ${args[0] ?? ""}`);
  if (!allowFailure && result.exitCode !== 0) fail("git", `git ${args.join(" ")} failed: ${result.stderr.toString("utf8").trim()}`);
  return result;
}

function filterMetricRuntimeUntrackedStatus(statusBytes) {
  if (!Buffer.isBuffer(statusBytes)) fail("binding_integrity", "source-state status must be a Buffer");
  if (statusBytes.length === 0) return Buffer.alloc(0);
  if (statusBytes[statusBytes.length - 1] !== 0) fail("binding_integrity", "source-state status must be NUL-terminated");
  const prefixes = [Buffer.from("?? .ascout", "utf8"), Buffer.from("?? coverage", "utf8")];
  const kept = [];
  let start = 0;
  for (let index = 0; index < statusBytes.length; index += 1) {
    if (statusBytes[index] !== 0) continue;
    const record = statusBytes.subarray(start, index);
    start = index + 1;
    const runtime = prefixes.some((prefix) =>
      record.length >= prefix.length &&
      record.subarray(0, prefix.length).equals(prefix) &&
      (record.length === prefix.length || record[prefix.length] === 0x2f)
    );
    if (runtime) continue;
    kept.push(record, Buffer.from([0]));
  }
  return Buffer.concat(kept);
}

async function sourceStateDigest(repo, env) {
  const status = await runGit(repo, ["status", "--porcelain=v1", "-z", "--untracked-files=all"], env);
  const sourceStatus = filterMetricRuntimeUntrackedStatus(status.stdout);
  const unstaged = await runGit(repo, ["diff", "--binary", "--no-ext-diff", "HEAD", "--"], env);
  const staged = await runGit(repo, ["diff", "--cached", "--binary", "--no-ext-diff", "HEAD", "--"], env);
  return sha256Bytes(Buffer.concat([
    Buffer.from("status\0", "utf8"), sourceStatus,
    Buffer.from("\0unstaged\0", "utf8"), unstaged.stdout,
    Buffer.from("\0staged\0", "utf8"), staged.stdout,
  ]));
}

async function measuredHeadSha(repo, env) {
  const result = await runGit(repo, ["rev-parse", "--verify", "HEAD^{commit}"], env);
  const value = result.stdout.toString("utf8").trim();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value)) fail("binding_integrity", "measured HEAD is not a full lowercase Git object ID");
  return value;
}

async function measuredTreeDigest(repo, ascoutRoot) {
  const moduleUrl = pathToFileURL(resolve(ascoutRoot, "dist/git.js")).href;
  const gitModule = await import(moduleUrl);
  if (typeof gitModule.readTreeDigestV1 !== "function") fail("binding_integrity", "canonical tree-digest primitive is unavailable");
  const observed = gitModule.readTreeDigestV1(repo);
  if (observed?.tree_digest_version !== 1 || typeof observed.tree_digest !== "string" || !/^[a-f0-9]{64}$/u.test(observed.tree_digest)) {
    fail("binding_integrity", "measured canonical tree digest is unavailable");
  }
  return observed.tree_digest;
}

async function assertMeasuredPaths(caseRecord, repo, env) {
  const unstaged = (await runGit(repo, ["diff", "--name-only", "--no-renames", "HEAD", "--"], env)).stdout.toString("utf8").trim().split("\n").filter(Boolean).sort();
  const staged = (await runGit(repo, ["diff", "--cached", "--name-only", "--no-renames", "HEAD", "--"], env)).stdout.toString("utf8").trim().split("\n").filter(Boolean);
  const expected = [...caseRecord.paths.production].sort();
  if (canonicalJson(unstaged) !== canonicalJson(expected)) fail("binding_integrity", `measured path set mismatch: expected ${expected.join(",")}, observed ${unstaged.join(",")}`);
  if (staged.length !== 0) fail("binding_integrity", `measured repository has staged changes: ${staged.join(",")}`);
}

async function clearCanonicalRuntimePath(repo, root, relativePath) {
  const absolute = resolve(repo, relativePath);
  assertPathInside(repo, absolute);
  let exists = false;
  try {
    await stat(absolute);
    exists = true;
  } catch {}
  if (!exists) return;
  const env = await runtimeEnvironment(root);
  const tracked = await runGit(repo, ["ls-files", "--error-unmatch", "--", relativePath], env, { allowFailure: true });
  if (tracked.exitCode === 0) fail("binding_integrity", `canonical benchmark runtime path is tracked by donor repository: ${relativePath}`);
  await rm(absolute, { recursive: true, force: true });
}

async function restoreMeasuredSource(caseRecord, repo, root, { preserveRuntime = false } = {}) {
  const env = await runtimeEnvironment(root);
  await runGit(repo, ["reset", "--hard", "HEAD"], env);
  const cleanArgs = preserveRuntime
    ? ["clean", "-fd", "-e", ".ascout", "-e", "coverage"]
    : ["clean", "-fd"];
  await runGit(repo, cleanArgs, env);
  if (!preserveRuntime) {
    await clearCanonicalRuntimePath(repo, root, ".ascout");
    await clearCanonicalRuntimePath(repo, root, "coverage");
  }
  for (const productionPath of caseRecord.paths.production) {
    await runGit(repo, ["restore", `--source=${caseRecord.git.fix.commit_id}`, "--worktree", "--", productionPath], env);
  }
  await assertMeasuredPaths(caseRecord, repo, env);
  return sourceStateDigest(repo, env);
}

async function clearIgnoredPath(repo, root, relativePath) {
  const absolute = resolve(repo, relativePath);
  assertPathInside(repo, absolute);
  let exists = false;
  try {
    await stat(absolute);
    exists = true;
  } catch {}
  if (!exists) return;
  const env = await runtimeEnvironment(root);
  const ignored = await runGit(repo, ["check-ignore", "-q", "--", relativePath], env, { allowFailure: true });
  if (ignored.exitCode !== 0) fail("binding_integrity", `metric cache path is not ignored by donor repository: ${relativePath}`);
  await rm(absolute, { recursive: true, force: true });
}

async function clearColdCaches(repo, root, includeAscout) {
  for (const path of MANAGED_RUNNER_CACHE_PATHS) await clearIgnoredPath(repo, root, path);
  await clearCanonicalRuntimePath(repo, root, "coverage");
  if (includeAscout) await clearCanonicalRuntimePath(repo, root, ".ascout");
  await rm(join(root, "cache", "xdg"), { recursive: true, force: true });
  await rm(metricNxDir(root), { recursive: true, force: true });
  await Promise.all([
    mkdir(join(root, "cache", "xdg"), { recursive: true }),
    mkdir(metricNxDir(root), { recursive: true }),
  ]);
}

async function runExactCommand(commandText, repo, root, label) {
  const parsed = parseRestrictedCommand(commandText);
  const env = await runtimeEnvironment(root, parsed.env);
  const result = await runProcess({ file: parsed.file, argv: parsed.argv, cwd: repo, env });
  requireExited(result, label);
  return result;
}

function runProjection(result, sourceStability) {
  return {
    status: result.exitCode === 0 ? "passed" : "failed",
    exit_code: result.exitCode,
    clean_success: result.exitCode === 0,
    duration_ms: result.durationMs,
    source_stability: sourceStability,
    exact: outputDigest(result),
  };
}

async function timedCommandPair(caseRecord, repo, root, commandText, label) {
  const baselineDigest = await restoreMeasuredSource(caseRecord, repo, root);
  await clearColdCaches(repo, root, false);
  const coldStart = await sourceStateDigest(repo, await runtimeEnvironment(root));
  if (coldStart !== baselineDigest) fail("binding_integrity", `${label} cold source state does not match restored baseline`);
  const coldResult = await runExactCommand(commandText, repo, root, `${label} cold`);
  const coldEnd = await sourceStateDigest(repo, await runtimeEnvironment(root));
  const coldStability = coldStart === coldEnd ? "stable" : "tree_drifted";

  const warmBaseline = await restoreMeasuredSource(caseRecord, repo, root, { preserveRuntime: true });
  if (warmBaseline !== baselineDigest) fail("binding_integrity", `${label} warm source restoration changed baseline identity`);
  const warmResult = await runExactCommand(commandText, repo, root, `${label} warm`);
  const warmEnd = await sourceStateDigest(repo, await runtimeEnvironment(root));
  const warmStability = warmBaseline === warmEnd ? "stable" : "tree_drifted";

  return { cold: runProjection(coldResult, coldStability), warm: runProjection(warmResult, warmStability) };
}

function canonicalRepoPath(path) {
  return String(path).replaceAll("\\", "/").replace(/^\.\//u, "");
}

function pathMatchesReviewed(sourcePath, reviewedPaths) {
  const source = canonicalRepoPath(sourcePath);
  return reviewedPaths.some((path) => {
    const expected = canonicalRepoPath(path);
    return source === expected || source.endsWith(`/${expected}`);
  });
}

function assertionNames(assertion) {
  const names = new Set();
  for (const field of [assertion?.title, assertion?.fullName]) {
    if (typeof field === "string" && field.trim().length > 0) names.add(field.trim());
  }
  if (Array.isArray(assertion?.ancestorTitles) && typeof assertion?.title === "string") {
    const ancestors = assertion.ancestorTitles.map((value) => typeof value === "string" ? value.trim() : null);
    const title = assertion.title.trim();
    if (ancestors.length > 0 && ancestors.every((value) => value !== null && value.length > 0) && title.length > 0) names.add([...ancestors, title].join(" > "));
  }
  return names;
}

function isVitestTypecheckPseudoAssertion(result, assertion, regressionTestIds, regressionTestPaths) {
  if (!result || typeof result.name !== "string" || !assertion || typeof assertion !== "object") return false;
  if (!Array.isArray(assertion.ancestorTitles) || assertion.ancestorTitles.length !== 1) return false;
  if (typeof assertion.title !== "string" || typeof assertion.fullName !== "string") return false;
  const title = assertion.title.trim();
  if (!regressionTestIds.some((id) => id.trim() === title)) return false;
  const rawAncestor = assertion.ancestorTitles[0];
  if (typeof rawAncestor !== "string") return false;
  const ancestor = canonicalRepoPath(rawAncestor.trim());
  if (!ancestor.includes("/") || assertion.fullName.trim() !== `${rawAncestor.trim()} ${title}`) return false;
  return regressionTestPaths.some((path) => {
    const reviewed = canonicalRepoPath(path);
    return pathMatchesReviewed(result.name, [path]) && (reviewed === ancestor || reviewed.endsWith(`/${ancestor}`));
  });
}

function observedOracleTestIds(report, regressionTestIds, regressionTestPaths) {
  if (!report || typeof report !== "object" || !Array.isArray(report.testResults)) fail("oracle_membership", "runner report is missing testResults");
  const observed = new Set();
  for (const result of report.testResults) {
    if (!result || typeof result !== "object" || typeof result.name !== "string" || !pathMatchesReviewed(result.name, regressionTestPaths)) continue;
    if (!Array.isArray(result.assertionResults)) continue;
    for (const assertion of result.assertionResults) {
      if (!assertion || typeof assertion !== "object") continue;
      if (assertion.status !== "passed" && assertion.status !== "failed") continue;
      if (isVitestTypecheckPseudoAssertion(result, assertion, regressionTestIds, regressionTestPaths)) continue;
      const names = assertionNames(assertion);
      for (const id of regressionTestIds) if (names.has(id.trim())) observed.add(id.trim());
    }
  }
  return [...observed].sort();
}

function runnerKind(caseRecord) {
  const command = caseRecord.case_class === "selection"
    ? extractSelectionCommands(caseRecord).related
    : extractGapCommands(caseRecord).targeted;
  if (/jest/iu.test(command)) return "jest";
  if (/vitest/iu.test(command)) return "vitest";
  return caseRecord.paths.regression_tests.some((path) => /jest/iu.test(path)) ? "jest" : "vitest";
}

async function collectProofReports(proofPath) {
  const proofDir = dirname(proofPath);
  const proofBase = basename(proofPath);
  const paths = [];
  try {
    const info = await stat(proofPath);
    if (info.isFile()) paths.push(proofPath);
  } catch {}
  for (const entry of await readdir(proofDir)) {
    if (entry.startsWith(`${proofBase}.`) && entry.endsWith(".json")) paths.push(join(proofDir, entry));
  }
  const unique = [...new Set(paths)].sort();
  if (unique.length === 0) fail("oracle_membership", "membership audit did not produce a runner JSON report");
  const reports = [];
  let bytesTotal = 0;
  for (const path of unique) {
    const info = await stat(path);
    if (!info.isFile() || info.size <= 0 || info.size > CAPTURE_CAP_BYTES) fail("oracle_membership", "membership report size is invalid");
    bytesTotal += info.size;
    if (bytesTotal > CAPTURE_CAP_BYTES) fail("oracle_membership", "aggregate membership report exceeds capture cap");
    const parsed = JSON.parse((await readFile(path)).toString("utf8"));
    if (!Array.isArray(parsed?.testResults)) fail("oracle_membership", "membership report is missing testResults");
    reports.push(parsed);
  }
  return { report: { testResults: reports.flatMap((item) => item.testResults) }, reportCount: unique.length, bytesTotal };
}

async function membershipAudit(caseRecord, repo, root, commandText, expectedExitCode, label) {
  await restoreMeasuredSource(caseRecord, repo, root);
  const proofPath = join(root, "t076-membership", `${randomUUID()}.json`);
  await mkdir(dirname(proofPath), { recursive: true });
  const variant = membershipProofCommand(commandText, runnerKind(caseRecord), proofPath);
  const env = await runtimeEnvironment(root, variant.env);
  const proof = await runProcess({ file: variant.file, argv: variant.argv, cwd: repo, env });
  requireExited(proof, `${label} membership audit`);
  if (proof.exitCode !== expectedExitCode) fail("oracle_membership", `${label} membership instrumentation changed exit behavior`);
  const collected = await collectProofReports(proofPath);
  const observed = observedOracleTestIds(collected.report, caseRecord.oracle.specification.regression_test_ids, caseRecord.paths.regression_tests);
  return {
    membership_available: true,
    oracle_test_ids_observed: observed,
    oracle_membership: proveRunnerMembership(collected.report, caseRecord.oracle.specification.regression_test_ids, caseRecord.paths.regression_tests),
    evidence: {
      report_sha256: sha256Bytes(Buffer.from(canonicalJson(collected.report), "utf8")),
      report_count: collected.reportCount,
      report_bytes: collected.bytesTotal,
      exact: outputDigest(proof),
    },
  };
}

function benchmarkSelectionAccount(mode, membership, selectorIdentity) {
  const limitation = "selected/deselected counts are not exposed by this project-native benchmark comparator";
  return {
    selector_identity: selectorIdentity,
    mode,
    initial_scope: { kind: "repository", path: null },
    selected_test_count: null,
    deselected_test_count: null,
    total_test_count: null,
    widened: false,
    widen_triggers: [],
    passes: [{ ordinal: 1, mode, scope: { kind: "repository", path: null }, trigger: null, selected_test_count: null, deselected_test_count: null, total_test_count: null }],
    limitations: [limitation],
    oracle_membership: membership.oracle_membership,
    oracle_test_ids_observed: membership.oracle_test_ids_observed,
  };
}

async function externalComparator(caseRecord, repo, root, commandText, label, mode, auditMembership) {
  const timed = await timedCommandPair(caseRecord, repo, root, commandText, label);
  if (!auditMembership) return timed;
  const membership = await membershipAudit(caseRecord, repo, root, commandText, timed.cold.exit_code, label);
  for (const cacheClass of ["cold", "warm"]) {
    Object.assign(timed[cacheClass], membership, { selection: benchmarkSelectionAccount(mode, membership, label) });
  }
  return timed;
}

async function auditReceiptArtifacts(repo, receipt) {
  if (!receipt?.run?.run_id || !Array.isArray(receipt?.artifacts)) fail("artifact_integrity", "Ascout receipt artifact inventory is unavailable");
  if (!SAFE_ID.test(receipt.run.run_id)) fail("artifact_integrity", "Ascout receipt run id is not safe for artifact lookup");
  const runRoot = resolve(repo, ".ascout", "runs", receipt.run.run_id);
  const seen = new Set();
  const verified = [];
  for (const artifact of receipt.artifacts) {
    if (typeof artifact?.artifact_id !== "string" || artifact.artifact_id.length === 0 || seen.has(artifact.artifact_id)) {
      fail("artifact_integrity", "Ascout receipt artifact identity is invalid or duplicated");
    }
    seen.add(artifact.artifact_id);
    if (typeof artifact.relative_run_path !== "string" || !Number.isSafeInteger(artifact.byte_length) || artifact.byte_length < 0 || typeof artifact.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(artifact.sha256)) {
      fail("artifact_integrity", `Ascout receipt artifact metadata is invalid: ${artifact.artifact_id}`);
    }
    const path = resolve(runRoot, artifact.relative_run_path);
    assertPathInside(runRoot, path);
    const info = await stat(path);
    if (!info.isFile() || info.size !== artifact.byte_length) fail("artifact_integrity", `Ascout artifact size mismatch: ${artifact.artifact_id}`);
    const bytes = await readFile(path);
    if (sha256Bytes(bytes) !== artifact.sha256) fail("artifact_integrity", `Ascout artifact digest mismatch: ${artifact.artifact_id}`);
    verified.push({ artifact_id: artifact.artifact_id, relative_run_path: artifact.relative_run_path, sha256: artifact.sha256, byte_length: artifact.byte_length });
  }
  return { verified: true, artifact_count: verified.length, artifacts: verified };
}

async function auditReceiptMachineResults(caseRecord, repo, receipt) {
  const testTask = Array.isArray(receipt?.tasks) ? receipt.tasks.find((task) => task.task_type === "test") : null;
  if (!testTask || !Array.isArray(testTask.artifact_refs) || !receipt?.run?.run_id || !Array.isArray(receipt?.artifacts)) {
    return { membership_available: false, oracle_test_ids_observed: [], oracle_membership: null, evidence: [] };
  }
  if (!SAFE_ID.test(receipt.run.run_id)) fail("artifact_integrity", "Ascout receipt run id is not safe for artifact lookup");
  const runRoot = resolve(repo, ".ascout", "runs", receipt.run.run_id);
  const artifacts = [];
  const reports = [];
  for (const artifactId of testTask.artifact_refs) {
    const artifact = receipt.artifacts.find((candidate) => candidate.artifact_id === artifactId);
    if (!artifact || typeof artifact.relative_run_path !== "string") continue;
    if (!/(?:^|\/)raw\/test\/(?:pass-2\/)?(?:vitest|jest)-results\.json$/u.test(artifact.relative_run_path)) continue;
    const path = resolve(runRoot, artifact.relative_run_path);
    assertPathInside(runRoot, path);
    const info = await stat(path);
    if (!info.isFile() || info.size !== artifact.byte_length || info.size <= 0 || info.size > CAPTURE_CAP_BYTES) fail("artifact_integrity", `Ascout machine-result artifact size mismatch: ${artifact.artifact_id}`);
    const bytes = await readFile(path);
    if (sha256Bytes(bytes) !== artifact.sha256) fail("artifact_integrity", `Ascout machine-result artifact digest mismatch: ${artifact.artifact_id}`);
    const parsed = JSON.parse(bytes.toString("utf8"));
    if (!Array.isArray(parsed?.testResults)) fail("artifact_integrity", `Ascout machine-result artifact is missing testResults: ${artifact.artifact_id}`);
    reports.push(parsed);
    artifacts.push({ artifact_id: artifact.artifact_id, relative_run_path: artifact.relative_run_path, sha256: artifact.sha256, byte_length: artifact.byte_length });
  }
  if (reports.length === 0) return { membership_available: false, oracle_test_ids_observed: [], oracle_membership: null, evidence: [] };
  const report = { testResults: reports.flatMap((item) => item.testResults) };
  const observed = observedOracleTestIds(report, caseRecord.oracle.specification.regression_test_ids, caseRecord.paths.regression_tests);
  return {
    membership_available: true,
    oracle_test_ids_observed: observed,
    oracle_membership: proveRunnerMembership(report, caseRecord.oracle.specification.regression_test_ids, caseRecord.paths.regression_tests),
    evidence: artifacts,
  };
}

function projectReceipt(receipt) {
  return {
    completeness: receipt?.summary?.completeness ?? null,
    reported_source_stability: receipt?.stability ?? null,
    selection: receipt?.selection ?? null,
    exercise: receipt?.exercise ?? null,
    tasks: Array.isArray(receipt?.tasks) ? receipt.tasks.map((task) => ({
      task_id: task.task_id,
      task_type: task.task_type,
      status: task.status,
      reason_code: task.reason_code,
      exit_code: task.exit_code,
      duration_ms: task.duration_ms,
      observations: task.observations,
      cache_state: task.cache_state,
      selected_test_count: task.selected_test_count ?? null,
      deselected_test_count: task.deselected_test_count ?? null,
      command_surface_changed: task.command_surface_changed,
      execution_admission: task.execution_admission,
    })) : [],
    findings: Array.isArray(receipt?.findings) ? receipt.findings.map((finding) => ({
      finding_id: finding.finding_id,
      task_id: finding.task_id,
      determinism_class: finding.determinism_class,
      observations: finding.observations,
      reproduced: finding.reproduced,
    })) : [],
  };
}

async function projectReceiptIntegrity(receipt, ascoutRoot) {
  const moduleUrl = pathToFileURL(resolve(ascoutRoot, "dist/receipt/model.js")).href;
  const receiptModel = await import(moduleUrl);
  if (typeof receiptModel.validateReceiptSemantics !== "function" || typeof receiptModel.decideReceiptExitCode !== "function") {
    fail("binding_integrity", "canonical receipt semantic validator exports are unavailable");
  }
  const validation = receiptModel.validateReceiptSemantics(receipt);
  return {
    semantic_valid: validation.valid,
    semantic_issues: validation.issues.map((issue) => ({ code: issue.code, path: issue.path })),
    run_id: receipt?.run?.run_id ?? null,
    evidence_run_ids: Array.isArray(receipt?.evidence) ? receipt.evidence.map((item) => item.run_id) : [],
    source_binding: {
      start_repository_id: receipt?.source?.start?.repository_id ?? null,
      end_repository_id: receipt?.source?.end?.repository_id ?? null,
      start_head_sha: receipt?.source?.start?.head_sha ?? null,
      end_head_sha: receipt?.source?.end?.head_sha ?? null,
      comparison_base_ref: receipt?.comparison?.base_ref ?? null,
      start_tree_digest: receipt?.source?.start?.tree_digest ?? null,
      end_tree_digest: receipt?.source?.end?.tree_digest ?? null,
    },
    canonical_exit_code: validation.valid ? receiptModel.decideReceiptExitCode(receipt) : null,
  };
}

async function runAscoutOnce(caseRecord, repo, root, ascoutRoot, label) {
  const env = await runtimeEnvironment(root);
  const sourceStart = await sourceStateDigest(repo, env);
  const measuredHeadStart = await measuredHeadSha(repo, env);
  const measuredTreeStart = await measuredTreeDigest(repo, ascoutRoot);
  const cli = resolve(ascoutRoot, "dist/cli.js");
  const result = await runProcess({ file: process.execPath, argv: [cli, "check", "--format", "json"], cwd: repo, env });
  requireExited(result, label);
  let receipt;
  try { receipt = JSON.parse(result.stdout.toString("utf8")); } catch { fail("ascout", `${label} did not produce parseable JSON`); }
  if (receipt?.summary?.exit_code !== result.exitCode) fail("ascout", `${label} process exit does not match receipt summary exit`);
  const sourceEnd = await sourceStateDigest(repo, env);
  const measuredHeadEnd = await measuredHeadSha(repo, env);
  const measuredTreeEnd = await measuredTreeDigest(repo, ascoutRoot);
  const projection = projectReceipt(receipt);
  const integrity = await projectReceiptIntegrity(receipt, ascoutRoot);
  const artifactBinding = await auditReceiptArtifacts(repo, receipt);
  const receiptChangedPaths = Array.isArray(receipt?.comparison?.changed_files)
    ? receipt.comparison.changed_files.map((item) => item?.path).filter((value) => typeof value === "string").sort()
    : [];
  const membership = caseRecord.case_class === "selection"
    ? await auditReceiptMachineResults(caseRecord, repo, receipt)
    : { membership_available: false, oracle_test_ids_observed: [], oracle_membership: null, evidence: [] };
  return {
    status: result.exitCode === 0 ? "passed" : "failed",
    exit_code: result.exitCode,
    clean_success: result.exitCode === 0 && receipt?.summary?.exit_code === 0 && receipt?.summary?.completeness === "complete",
    duration_ms: result.durationMs,
    source_stability: sourceStart === sourceEnd ? "stable" : "tree_drifted",
    reported_source_stability: projection.reported_source_stability,
    integrity,
    binding: {
      measured_head_start: measuredHeadStart,
      measured_head_end: measuredHeadEnd,
      measured_tree_start_digest: measuredTreeStart,
      measured_tree_end_digest: measuredTreeEnd,
      independent_source_start_digest: sourceStart,
      independent_source_end_digest: sourceEnd,
      receipt_start_head_sha: integrity.source_binding.start_head_sha,
      receipt_end_head_sha: integrity.source_binding.end_head_sha,
      receipt_comparison_base_ref: integrity.source_binding.comparison_base_ref,
      receipt_start_tree_digest: integrity.source_binding.start_tree_digest,
      receipt_end_tree_digest: integrity.source_binding.end_tree_digest,
      measured_paths: [...caseRecord.paths.production].sort(),
      receipt_changed_paths: receiptChangedPaths,
      artifact_binding_verified: artifactBinding.verified,
      artifact_count: artifactBinding.artifact_count,
    },
    membership_available: membership.membership_available,
    oracle_test_ids_observed: membership.oracle_test_ids_observed,
    oracle_membership: membership.oracle_membership,
    membership_evidence: membership.evidence,
    selection: projection.selection,
    exercise: projection.exercise,
    tasks: projection.tasks,
    findings: projection.findings,
    completeness: projection.completeness,
    ascout_version: receipt?.run?.ascout_version ?? null,
    receipt_sha256: sha256Bytes(result.stdout),
    exact: outputDigest(result),
  };
}

async function ascoutComparator(caseRecord, repo, root, ascoutRoot) {
  const baselineDigest = await restoreMeasuredSource(caseRecord, repo, root);
  await clearColdCaches(repo, root, true);
  const coldStart = await sourceStateDigest(repo, await runtimeEnvironment(root));
  if (coldStart !== baselineDigest) fail("binding_integrity", "Ascout cold source state does not match restored baseline");
  const cold = await runAscoutOnce(caseRecord, repo, root, ascoutRoot, "Ascout cold comparator");
  const warmBaseline = await restoreMeasuredSource(caseRecord, repo, root, { preserveRuntime: true });
  if (warmBaseline !== baselineDigest) fail("binding_integrity", "Ascout warm source restoration changed baseline identity");
  const warm = await runAscoutOnce(caseRecord, repo, root, ascoutRoot, "Ascout warm comparator");
  return { cold, warm };
}

function withBaselineId(declaration) {
  return { baseline_id: sha256Bytes(Buffer.from(canonicalJson(declaration), "utf8")), ...declaration };
}

function commonBaseline(caseRecord, t075, metric, comparator) {
  return {
    schema_version: 1,
    metric,
    case_id: caseRecord.case_id,
    case_revision: caseRecord.case_revision,
    manifest_revision: t075.evidence.manifest_revision,
    comparator,
    source_state: { derived_tree: t075.derived_identity, synthetic_head: t075.synthetic_head },
    environment: {
      os: t075.evidence.platform.os,
      arch: t075.evidence.platform.arch,
      node: t075.evidence.toolchain.node,
      package_manager: `${t075.evidence.toolchain.package_manager}@${t075.evidence.toolchain.package_manager_version}`,
    },
    reference_evidence_sha256: t075.evidence_sha256,
  };
}

function timingBaseline(caseRecord, t075, comparator, cacheClass, command) {
  return withBaselineId({
    ...commonBaseline(caseRecord, t075, "timing", comparator),
    cache_class: cacheClass,
    command,
    process_limits: { timeout_ms: DEFAULT_TIMEOUT_MS, capture_cap_bytes: CAPTURE_CAP_BYTES },
    dependency_install_included: false,
    cache_contract: cacheClass === "cold"
      ? {
          dependency_tree: "retained from frozen T075 dependency reconstruction",
          package_manager_cache: "retained; dependency installation is excluded from comparator timing",
          managed_runner_cache_paths: [...MANAGED_RUNNER_CACHE_PATHS],
          managed_runner_cache_state: "cleared before comparator",
          xdg_cache: "cleared before comparator",
          nx_socket_state: "fresh short controller path",
          ascout_run_artifacts: comparator === "ascout" ? "absent before comparator" : "not_applicable",
          coverage_runtime_artifacts: "absent before comparator",
          other_project_caches: "not asserted absent and never pooled with a different declaration",
        }
      : {
          dependency_tree: "retained from frozen T075 dependency reconstruction",
          package_manager_cache: "retained; dependency installation is excluded from comparator timing",
          managed_runner_cache_paths: [...MANAGED_RUNNER_CACHE_PATHS],
          managed_runner_cache_state: "retained from immediately preceding cold comparator",
          xdg_cache: "retained from immediately preceding cold comparator",
          nx_socket_state: "retained from immediately preceding cold comparator",
          ascout_run_artifacts: comparator === "ascout" ? "retained from immediately preceding cold comparator" : "not_applicable",
          coverage_runtime_artifacts: "retained from immediately preceding cold comparator when produced",
          other_project_caches: "same declared lineage as paired cold comparator",
        },
  });
}

function determinismBaseline(caseRecord, t075, comparator, cacheClass, command) {
  return withBaselineId({
    ...commonBaseline(caseRecord, t075, "determinism", comparator),
    cache_class: cacheClass,
    command,
    observation_key: {
      case_revision: caseRecord.case_revision,
      derived_tree: t075.derived_identity,
      synthetic_head: t075.synthetic_head,
      environment: "exact declared toolchain and OS",
      cache_class: cacheClass,
    },
    minimum_valid_observations: 2,
    semantic_projection: [
      "status", "exit_code", "clean_success", "oracle_test_ids_observed", "source_stability",
      "reported_source_stability", "selection", "tasks", "exercise", "findings", "completeness",
    ],
    volatile_fields_excluded: ["duration_ms", "timestamps", "run_ids", "raw_output_hashes"],
  });
}

function selectionReference(caseRecord, t075, comparator, command) {
  const oracleTestIds = [...caseRecord.oracle.specification.regression_test_ids].map((value) => value.trim()).sort();
  return withBaselineId({
    ...commonBaseline(caseRecord, t075, "selection_recall", comparator),
    command,
    cache_class: "cold",
    reference: "frozen T075 project-native full-suite oracle membership on the same measured source state",
    frozen_oracle_test_ids: oracleTestIds,
    denominator: { kind: "frozen_oracle_test_ids", count: oracleTestIds.length },
    numerator: "exact frozen oracle test IDs observed in the comparator runner evidence",
    selected_test_count_is_recall: false,
  });
}

function falsePassReference(caseRecord, t075, comparator, command) {
  const selectionCase = caseRecord.case_class === "selection";
  return withBaselineId({
    ...commonBaseline(caseRecord, t075, "false_pass", comparator),
    command,
    cache_class: "cold",
    reference: selectionCase
      ? "frozen T075 oracle-test membership; material omission means at least one frozen oracle test is not observed"
      : "frozen T075 independent gap oracle; material omission means at least one independently NOT_EXERCISED reviewed line",
    clean_success_semantics: comparator === "ascout"
      ? "process exit 0 AND receipt summary exit 0 AND receipt completeness complete"
      : "exact comparator process exit 0",
  });
}

function gapReference(caseRecord, t075, metric) {
  const classifications = t075.evidence.observations[0]?.gap_coverage?.classifications ?? [];
  const resolved = classifications.filter((item) => item.classification !== "UNRESOLVED");
  return withBaselineId({
    ...commonBaseline(caseRecord, t075, metric, "ascout"),
    cache_class: "cold",
    reference: "frozen T075 independently interpreted project-native full-run coverage oracle",
    independent_oracle_artifact_sha256: t075.evidence.observations[0]?.gap_coverage?.artifact_sha256 ?? null,
    denominator: {
      kind: "independently_resolved_reviewed_changed_executable_lines",
      count: resolved.length,
      excluded_independent_unresolved_count: classifications.length - resolved.length,
    },
  });
}

function driftReference(caseRecord, t075) {
  return withBaselineId({
    ...commonBaseline(caseRecord, t075, "drift_detection", "ascout"),
    reference: "independent Git status/staged/unstaged source digest excluding only canonical benchmark runtime namespaces",
    compared_to: "Ascout receipt stability",
    classes: ["stable", "tree_drifted"],
  });
}

function flakeReference(caseRecord, t075) {
  return withBaselineId({
    ...commonBaseline(caseRecord, t075, "flake_classification_behavior", "ascout"),
    reference: "Ascout receipt raw bounded failing-test observation counts evaluated against the canonical T076 flake rules",
    rules: {
      fewer_than_two_valid_observations: { determinism_class: "unknown", reproduced: "unknown" },
      contradictory_pass_fail_observations: { determinism_class: "nondeterministic", reproduced: false },
      repeated_consistent_failures: { determinism_class: "deterministic", reproduced: true },
    },
    unavailable_when_no_evaluable_finding_domain: true,
  });
}

function buildBaselines(caseRecord, t075, commands) {
  const baselines = [];
  const commandsByComparator = new Map();
  if (caseRecord.case_class === "selection") {
    commandsByComparator.set("full", commands.full);
    commandsByComparator.set("plain", commands.plain);
    commandsByComparator.set("related", commands.related);
  } else {
    if (commands.reference !== null) commandsByComparator.set("plain", commands.reference);
    commandsByComparator.set("native_coverage", commands.nativeCoverage);
  }
  commandsByComparator.set("ascout", "node <ascout-root>/dist/cli.js check --format json");

  for (const [comparator, command] of commandsByComparator) {
    for (const cacheClass of ["cold", "warm"]) {
      baselines.push(timingBaseline(caseRecord, t075, comparator, cacheClass, command));
      baselines.push(determinismBaseline(caseRecord, t075, comparator, cacheClass, command));
    }
  }

  if (caseRecord.case_class === "selection") {
    for (const comparator of ["full", "plain", "related", "ascout"]) {
      const command = commandsByComparator.get(comparator);
      baselines.push(selectionReference(caseRecord, t075, comparator, command));
      baselines.push(falsePassReference(caseRecord, t075, comparator, command));
    }
  } else {
    baselines.push(falsePassReference(caseRecord, t075, "ascout", commandsByComparator.get("ascout")));
    baselines.push(gapReference(caseRecord, t075, "gap_classification_accuracy"));
    baselines.push(gapReference(caseRecord, t075, "unresolved_rate"));
  }
  baselines.push(driftReference(caseRecord, t075));
  baselines.push(flakeReference(caseRecord, t075));
  return baselines;
}

export function gitBlobSha1(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return createHash("sha1").update(Buffer.from(`blob ${buffer.length}\0`, "utf8")).update(buffer).digest("hex");
}

function requireExact(value, expected, label) {
  if (value !== expected) fail("binding_integrity", `${label} mismatch: expected ${String(expected)}, observed ${String(value)}`);
}

export function validateControllerIdentity(caseRecord, t075, actual) {
  const expected = t075?.evidence?.toolchain;
  requireExact(actual.os, t075?.evidence?.platform?.os, "controller OS");
  requireExact(actual.arch, t075?.evidence?.platform?.arch, "controller architecture");
  requireExact(actual.node, expected?.node, "controller Node");
  requireExact(actual.package_manager, expected?.package_manager, "controller package manager");
  requireExact(actual.package_manager_version, expected?.package_manager_version, "controller package manager version");
  requireExact(caseRecord.runtime.node_version.replace(/^v/u, ""), expected?.node, "manifest Node");
  requireExact(caseRecord.runtime.package_manager, expected?.package_manager, "manifest package manager");
  requireExact(caseRecord.runtime.package_manager_version, expected?.package_manager_version, "manifest package manager version");
  return true;
}

async function observeControllerIdentity(caseRecord, root, cwd) {
  const env = await runtimeEnvironment(root);
  const pm = caseRecord.runtime.package_manager;
  const result = await runProcess({ file: pm, argv: ["--version"], cwd, env, timeoutMs: 60_000 });
  requireExited(result, `${pm} --version`);
  if (result.exitCode !== 0) fail("toolchain", `${pm} --version failed`);
  return {
    os: process.platform,
    arch: process.arch,
    node: process.version.replace(/^v/u, ""),
    package_manager: pm,
    package_manager_version: result.stdout.toString("utf8").trim(),
  };
}

export function validateT111ManifestCompatibility({ historicalManifestBytes, historicalManifest, currentManifest, currentCase, frozen }) {
  if (!historicalManifestBytes) fail("binding_integrity", "T111 compatibility requires historical manifest bytes");
  requireExact(gitBlobSha1(historicalManifestBytes), frozen.historical_manifest_blob, "historical T111 manifest Git blob");
  requireExact(historicalManifest?.manifest_revision, frozen.replay_manifest_revision, "historical T111 manifest revision");
  requireExact(currentManifest?.manifest_revision, frozen.current_manifest_revision, "current T111 manifest revision");
  const historicalCase = historicalManifest?.cases?.find((item) => item.case_id === frozen.case_id);
  if (!historicalCase) fail("binding_integrity", "historical T111 manifest is missing the frozen Jotai case");
  requireExact(historicalCase.case_revision, frozen.case_revision, "historical T111 case revision");
  requireExact(currentCase?.case_revision, frozen.case_revision, "current T111 case revision");
  if (canonicalJson(historicalCase) !== canonicalJson(currentCase)) {
    fail("binding_integrity", "historical/current T111 Jotai case records are not canonically identical");
  }
  return true;
}

export function validateQualifiedReplayContract({ replayBytes, replay, caseRecord, manifest, repetitions, provenance, historicalManifestBytes = null, historicalManifest = null }) {
  const frozen = T113_QUALIFIED_REPLAY_INPUTS[caseRecord.case_id];
  if (!frozen) fail("binding_integrity", `qualified replay input is not authorized for case ${caseRecord.case_id}`);
  requireExact(caseRecord.case_revision, frozen.case_revision, "selected case revision");
  requireExact(sha256Bytes(replayBytes), frozen.replay_sha256, "qualified replay file SHA-256");
  requireExact(replay?.evidence?.manifest_revision, frozen.replay_manifest_revision, "qualified replay manifest revision");
  requireExact(manifest?.manifest_revision, frozen.current_manifest_revision, "current manifest revision");
  requireExact(replay?.status, "BENCHMARK_ACTIVE", "qualified replay status");
  requireExact(replay?.lifecycle_state, "BENCHMARK_ACTIVE", "qualified replay lifecycle");
  requireExact(replay?.case_id, frozen.case_id, "qualified replay case id");
  requireExact(replay?.case_revision, frozen.case_revision, "qualified replay case revision");
  requireExact(replay?.t075_run_id, frozen.t075_run_id, "qualified replay T075 run id");
  requireExact(replay?.derived_identity, frozen.derived_identity, "qualified replay derived identity");
  requireExact(replay?.synthetic_head, frozen.synthetic_head, "qualified replay synthetic HEAD");
  requireExact(replay?.evidence_sha256, frozen.evidence_sha256, "qualified replay evidence SHA-256");
  const recomputedEvidence = sha256Bytes(Buffer.from(canonicalJson(replay?.evidence), "utf8"));
  requireExact(recomputedEvidence, frozen.evidence_sha256, "recomputed qualified replay evidence SHA-256");
  requireExact(replay?.evidence?.determinism, "deterministic", "qualified replay determinism");
  requireExact(replay?.evidence?.determinism_scope, "oracle_only", "qualified replay determinism scope");
  if (!Array.isArray(replay?.evidence?.observations)) fail("binding_integrity", "qualified replay observations are unavailable");
  requireExact(replay.valid_observation_count, frozen.valid_observations, "qualified replay valid observation count");
  requireExact(replay.evidence.valid_observation_count, frozen.valid_observations, "qualified replay evidence observation count");
  requireExact(replay.evidence.observations.length, frozen.valid_observations, "qualified replay observation array count");
  requireExact(repetitions, frozen.valid_observations, "requested T076 repetition count");
  requireExact(replay?.evidence?.platform?.os, frozen.platform.os, "qualified replay OS");
  requireExact(replay?.evidence?.platform?.arch, frozen.platform.arch, "qualified replay architecture");
  requireExact(replay?.evidence?.toolchain?.node, frozen.toolchain.node, "qualified replay Node");
  requireExact(replay?.evidence?.toolchain?.package_manager, frozen.toolchain.package_manager, "qualified replay package manager");
  requireExact(replay?.evidence?.toolchain?.package_manager_version, frozen.toolchain.package_manager_version, "qualified replay package manager version");
  requireExact(replay?.evidence?.observation_key?.case_revision, frozen.case_revision, "qualified replay observation-key case revision");
  requireExact(replay?.evidence?.observation_key?.derived_tree, frozen.derived_identity, "qualified replay observation-key derived tree");
  requireExact(replay?.evidence?.observation_key?.synthetic_head, frozen.synthetic_head, "qualified replay observation-key synthetic HEAD");
  requireExact(replay?.evidence?.observation_key?.node, frozen.toolchain.node, "qualified replay observation-key Node");
  requireExact(replay?.evidence?.observation_key?.package_manager, `${frozen.toolchain.package_manager}@${frozen.toolchain.package_manager_version}`, "qualified replay observation-key package manager");
  requireExact(provenance.source_commit, frozen.source_commit, "qualified replay source commit");
  requireExact(provenance.workflow_run_id, frozen.workflow_run_id, "qualified replay workflow run id");
  requireExact(provenance.workflow_run_attempt, frozen.workflow_run_attempt, "qualified replay workflow run attempt");
  requireExact(provenance.artifact_id, frozen.artifact_id, "qualified replay artifact id");
  validateControllerIdentity(caseRecord, replay, frozen.platform.os === "linux" ? {
    os: frozen.platform.os,
    arch: frozen.platform.arch,
    node: caseRecord.runtime.node_version.replace(/^v/u, ""),
    package_manager: caseRecord.runtime.package_manager,
    package_manager_version: caseRecord.runtime.package_manager_version,
  } : frozen);
  if (replay.evidence.manifest_revision === manifest.manifest_revision) {
    if (historicalManifestBytes !== null || historicalManifest !== null) fail("binding_integrity", "historical manifest input is not authorized when replay/current manifest revisions already match");
  } else {
    requireExact(frozen.case_id, "jotai-splitatom-identical-write", "historical manifest compatibility case");
    requireExact(replay.evidence.manifest_revision, frozen.replay_manifest_revision, "qualified replay historical manifest revision");
    validateT111ManifestCompatibility({ historicalManifestBytes, historicalManifest, currentManifest: manifest, currentCase: caseRecord, frozen });
  }
  return frozen;
}

async function loadQualifiedReplay(caseRecord, manifest, options) {
  const replayBytes = await readFile(options.t075Input);
  let replay;
  try { replay = JSON.parse(replayBytes.toString("utf8")); } catch { fail("binding_integrity", "qualified T075 input is not valid JSON"); }
  let historicalManifestBytes = null;
  let historicalManifest = null;
  if (options.t075HistoricalManifest !== null) {
    historicalManifestBytes = await readFile(options.t075HistoricalManifest);
    try { historicalManifest = JSON.parse(historicalManifestBytes.toString("utf8")); } catch { fail("binding_integrity", "historical T111 manifest is not valid JSON"); }
  }
  validateQualifiedReplayContract({
    replayBytes,
    replay,
    caseRecord,
    manifest,
    repetitions: options.repetitions,
    provenance: {
      source_commit: options.t075SourceCommit,
      workflow_run_id: options.t075WorkflowRunId,
      workflow_run_attempt: options.t075WorkflowRunAttempt,
      artifact_id: options.t075ArtifactId,
    },
    historicalManifestBytes,
    historicalManifest,
  });
  return replay;
}

async function verifyActualControllerIdentity(caseRecord, t075, root, cwd) {
  const actual = await observeControllerIdentity(caseRecord, root, cwd);
  validateControllerIdentity(caseRecord, t075, actual);
  return actual;
}

async function runT075(caseRecord, options, metricsRoot) {
  const runScript = resolve(options.ascoutRoot, "benchmarks/run.mjs");
  const env = { ...process.env, TMPDIR: metricsRoot };
  const result = await runProcess({
    file: process.execPath,
    argv: [runScript, "--case", caseRecord.case_id, "--manifest", options.manifest, "--ascout-root", options.ascoutRoot, "--run-id", `${options.runId}-t075`, "--repetitions", String(options.repetitions), "--keep-temp"],
    cwd: options.ascoutRoot,
    env,
    timeoutMs: T075_TIMEOUT_MS,
  });
  requireExited(result, "T075 prerequisite replay");
  if (result.exitCode !== 0) fail("t075", `T075 prerequisite replay failed: ${result.stderr.toString("utf8").slice(-4000)}`);
  let parsed;
  try { parsed = JSON.parse(result.stdout.toString("utf8")); } catch { fail("t075", "T075 prerequisite replay did not produce parseable JSON"); }
  if (parsed.status !== "BENCHMARK_ACTIVE" || parsed.lifecycle_state !== "BENCHMARK_ACTIVE") fail("t075", `T075 prerequisite lifecycle is ${parsed.status}/${parsed.lifecycle_state}`);
  if (parsed.evidence?.determinism !== "deterministic" || parsed.evidence?.determinism_scope !== "oracle_only") fail("t075", "T075 prerequisite oracle determinism is unavailable");
  const match = /(?:^|\n)T075_TEMP_ROOT=([^\r\n]+)/u.exec(result.stderr.toString("utf8"));
  if (!match) fail("t075", "T075 prerequisite did not disclose its kept temporary root");
  const controllerRoot = resolve(match[1]);
  assertPathInside(metricsRoot, controllerRoot);
  return { result: parsed, controllerRoot, materialization: null };
}

async function runQualifiedMaterialization(caseRecord, manifest, options, metricsRoot, t075) {
  await verifyActualControllerIdentity(caseRecord, t075, metricsRoot, options.ascoutRoot);
  const runScript = resolve(options.ascoutRoot, "benchmarks/run.mjs");
  const env = { ...process.env, TMPDIR: metricsRoot };
  const result = await runProcess({
    file: process.execPath,
    argv: [
      runScript,
      "--case", caseRecord.case_id,
      "--manifest", options.manifest,
      "--ascout-root", options.ascoutRoot,
      "--run-id", `${options.runId}-materialize`,
      "--repetitions", String(options.repetitions),
      "--materialize-qualified",
      "--expected-derived-identity", t075.derived_identity,
      "--expected-synthetic-head", t075.synthetic_head,
      "--keep-temp",
    ],
    cwd: options.ascoutRoot,
    env,
    timeoutMs: T075_TIMEOUT_MS,
  });
  requireExited(result, "qualified replay materialization");
  if (result.exitCode !== 0) fail("t075", `qualified replay materialization failed: ${result.stderr.toString("utf8").slice(-4000)}`);
  let parsed;
  try { parsed = JSON.parse(result.stdout.toString("utf8")); } catch { fail("t075", "qualified replay materialization did not produce parseable JSON"); }
  const match = /(?:^|\n)T075_MATERIALIZATION_ROOT=([^\r\n]+)/u.exec(result.stderr.toString("utf8"));
  if (!match) fail("t075", "qualified replay materialization did not disclose its bounded root");
  const controllerRoot = resolve(match[1]);
  assertPathInside(metricsRoot, controllerRoot);
  requireExact(parsed?.status, "QUALIFIED_REPLAY_MATERIALIZATION_READY", "materialization status");
  requireExact(parsed?.case_id, caseRecord.case_id, "materialization case id");
  requireExact(parsed?.case_revision, caseRecord.case_revision, "materialization case revision");
  requireExact(parsed?.manifest_revision, manifest.manifest_revision, "materialization manifest revision");
  requireExact(parsed?.platform?.os, t075.evidence.platform.os, "materialization OS");
  requireExact(parsed?.platform?.arch, t075.evidence.platform.arch, "materialization architecture");
  requireExact(parsed?.toolchain?.node, t075.evidence.toolchain.node, "materialization Node");
  requireExact(parsed?.toolchain?.package_manager, t075.evidence.toolchain.package_manager, "materialization package manager");
  requireExact(parsed?.toolchain?.package_manager_version, t075.evidence.toolchain.package_manager_version, "materialization package manager version");
  requireExact(parsed?.expected_derived_identity, t075.derived_identity, "materialization expected derived identity");
  requireExact(parsed?.expected_synthetic_head, t075.synthetic_head, "materialization expected synthetic HEAD");
  requireExact(parsed?.boundary?.oracle_replay_executed, false, "materialization oracle boundary");
  requireExact(parsed?.boundary?.comparator_execution_performed, false, "materialization comparator boundary");
  if (canonicalJson(parsed?.boundary?.measured_paths) !== canonicalJson([...caseRecord.paths.production].sort())) fail("binding_integrity", "materialization measured path declaration mismatch");
  if (!Array.isArray(parsed?.observations) || parsed.observations.length !== options.repetitions) fail("binding_integrity", "materialization observation count mismatch");
  for (let index = 0; index < parsed.observations.length; index += 1) {
    const observation = parsed.observations[index];
    requireExact(observation.ordinal, index + 1, "materialization observation ordinal");
    requireExact(observation.derived_identity, t075.derived_identity, "materialization derived identity");
    requireExact(observation.synthetic_head, t075.synthetic_head, "materialization synthetic HEAD");
    const expectedRepo = resolve(controllerRoot, `observation-${index + 1}`, "measured");
    requireExact(resolve(observation.measured_repo), expectedRepo, "materialization measured repo path");
    assertPathInside(controllerRoot, expectedRepo);
    await stat(resolve(expectedRepo, ".git"));
  }
  return { result: t075, controllerRoot, materialization: parsed };
}

async function collectSelectionObservation(caseRecord, repo, root, ascoutRoot, commands) {
  const full = await externalComparator(caseRecord, repo, root, commands.full, "project-native full suite", "full", true);
  const plain = await externalComparator(caseRecord, repo, root, commands.plain, "plain project test", "configured", false);
  const related = await externalComparator(caseRecord, repo, root, commands.related, "runner-native related selector", "native_related", true);
  const ascout = await ascoutComparator(caseRecord, repo, root, ascoutRoot);
  return { comparators: { full, plain, related, ascout } };
}

async function collectGapObservation(caseRecord, repo, root, ascoutRoot, commands) {
  const comparators = {};
  if (commands.reference !== null) comparators.plain = await externalComparator(caseRecord, repo, root, commands.reference, "project-native test reference", "configured", false);
  comparators.native_coverage = await externalComparator(caseRecord, repo, root, commands.nativeCoverage, "project-native coverage reference", "full", false);
  comparators.ascout = await ascoutComparator(caseRecord, repo, root, ascoutRoot);
  return { comparators };
}

async function cleanupMetricNxDirs() {
  const paths = [...METRIC_NX_DIRS];
  METRIC_NX_DIRS.clear();
  await Promise.all(paths.map((path) => rm(path, { recursive: true, force: true })));
}

async function executeCaseMetrics(caseRecord, manifest, options) {
  if (process.platform !== "linux") fail("platform", "T076 executable benchmark metrics currently inherit T075 Linux replay authority; T079 owns cross-platform hardening");
  const metricsRoot = await mkdtemp(join(tmpdir(), `ascout-t076-${caseRecord.case_id}-`));
  try {
    let t075Run;
    if (options.t075Input !== null) {
      if (caseRecord.case_class !== "selection") fail("binding_integrity", "qualified replay input is authorized only for T113 selection cases");
      const t075 = await loadQualifiedReplay(caseRecord, manifest, options);
      t075Run = await runQualifiedMaterialization(caseRecord, manifest, options, metricsRoot, t075);
    } else {
      t075Run = await runT075(caseRecord, options, metricsRoot);
    }
    const t075 = t075Run.result;
    if (t075.case_revision !== caseRecord.case_revision) fail("binding_integrity", "T075 prerequisite case revision does not match T076 input");
    if (options.t075Input === null && t075.evidence.manifest_revision !== manifest.manifest_revision) fail("binding_integrity", "T075 prerequisite manifest revision does not match T076 input");
    if (!Array.isArray(t075.evidence?.observations) || t075.evidence.observations.length !== options.repetitions) fail("t075", "T075 prerequisite observation count mismatch");
    const commands = caseRecord.case_class === "selection" ? extractSelectionCommands(caseRecord) : extractGapCommands(caseRecord);
    const baselines = buildBaselines(caseRecord, t075, commands);
    const observations = [];
    for (let index = 0; index < options.repetitions; index += 1) {
      const observationRoot = resolve(t075Run.controllerRoot, `observation-${index + 1}`);
      const repo = resolve(observationRoot, "measured");
      assertPathInside(t075Run.controllerRoot, observationRoot);
      assertPathInside(observationRoot, repo);
      await stat(resolve(repo, ".git"));
      if (options.t075Input !== null) {
        await verifyActualControllerIdentity(caseRecord, t075, observationRoot, options.ascoutRoot);
        const expectedSourceState = t075Run.materialization?.observations?.[index]?.source_state_sha256;
        const actualSourceState = await sourceStateDigest(repo, await runtimeEnvironment(observationRoot));
        requireExact(actualSourceState, expectedSourceState, "materialized source-state identity before comparator collection");
        await assertMeasuredPaths(caseRecord, repo, await runtimeEnvironment(observationRoot));
      }
      const observation = caseRecord.case_class === "selection"
        ? await collectSelectionObservation(caseRecord, repo, observationRoot, options.ascoutRoot, commands)
        : await collectGapObservation(caseRecord, repo, observationRoot, options.ascoutRoot, commands);
      observations.push({ ordinal: index + 1, ...observation });
    }
    const gapOracle = caseRecord.case_class === "gap" ? t075.evidence.observations[0].gap_coverage?.classifications ?? [] : null;
    const metrics = computeCaseMetrics({
      case_id: caseRecord.case_id,
      case_revision: caseRecord.case_revision,
      case_class: caseRecord.case_class,
      oracle_test_ids: caseRecord.oracle.specification.regression_test_ids,
      gap_oracle: gapOracle,
      baselines,
      observations,
    });
    const result = {
      schema_version: 1,
      task: "T076",
      status: "BENCHMARK_METRICS_READY",
      case_id: caseRecord.case_id,
      case_revision: caseRecord.case_revision,
      manifest_revision: manifest.manifest_revision,
      t076_run_id: options.runId,
      t075_run_id: t075.t075_run_id,
      t075_evidence_sha256: t075.evidence_sha256,
      t075_oracle_determinism: t075.evidence.determinism,
      baselines,
      observations,
      metrics,
    };
    if (options.output) {
      await mkdir(dirname(options.output), { recursive: true });
      await writeFile(options.output, canonicalJson(result));
    }
    process.stdout.write(canonicalJson(result));
  } finally {
    await cleanupMetricNxDirs();
    await rm(metricsRoot, { recursive: true, force: true });
  }
}

async function aggregateInputs(options) {
  const results = [];
  for (const path of options.aggregateInputs) results.push(JSON.parse((await readFile(path)).toString("utf8")));
  const aggregate = aggregateBenchmarkMetrics(results);
  if (options.output) {
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, canonicalJson(aggregate));
  }
  process.stdout.write(canonicalJson(aggregate));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.aggregateInputs.length > 0) {
    await aggregateInputs(options);
    return;
  }
  const manifest = JSON.parse((await readFile(options.manifest)).toString("utf8"));
  const caseRecord = manifest.cases.find((item) => item.case_id === options.caseId);
  if (!caseRecord) fail("usage", `case not found: ${options.caseId}`);
  validateReplayCase(caseRecord);
  await stat(resolve(options.ascoutRoot, "dist/cli.js"));
  await executeCaseMetrics(caseRecord, manifest, options);
}

const directEntry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (directEntry === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error?.code ?? "error"}: ${error?.stack ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
