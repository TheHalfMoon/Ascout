import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { link, lstat, mkdtemp, readFile, realpath, rm, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep, win32 as pathWin32 } from "node:path";
import { pathToFileURL } from "node:url";

export const REFERENCE_TIMEOUT_MS = 10 * 60 * 1000;
const REFERENCE_CLEANUP_TIMEOUT_MS = 30 * 1000;
const WINDOWS_TREE_KILL_TIMEOUT_MS = 5 * 1000;

const FULL_GIT_OBJECT_ID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const CANONICAL_REPOSITORY_PATH =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?!.+\/[.]{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u;
const COMPARABLE_STATUSES = new Set(["PASS", "FAIL", "FLAKY"]);
const UNAVAILABLE_STATUSES = new Set(["BLOCKED", "ERROR", "NOT_RUN", "NOT_APPLICABLE"]);
const REASON_TEXT = Object.freeze({
  UNAVAILABLE_ASCOUT_TASK_STATE: "The bound Ascout test task is not comparable for selector-shadow measurement.",
  UNAVAILABLE_ASCOUT_ADMISSION: "The bound Ascout test task did not run under normal unchanged command authority.",
  UNAVAILABLE_ASCOUT_SELECTION: "The bound receipt selection state is not comparable for selector-shadow measurement.",
  UNAVAILABLE_ASCOUT_FINDINGS: "The bound Ascout test findings cannot be mapped to complete exact failure identities.",
  UNAVAILABLE_FULL_SUITE_CONTRACT: "The exact local Vitest full-suite command contract is unavailable.",
  UNAVAILABLE_FULL_SUITE_EXECUTION: "The bounded full-suite reference did not complete with a usable structured report.",
  UNAVAILABLE_FULL_SUITE_REPORT: "The full-suite structured report cannot establish trustworthy exact failed-test identities.",
  UNAVAILABLE_SOURCE_DRIFT: "Repository source identity changed during the full-suite reference observation.",
});

export class SelectorShadowIntegrityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SelectorShadowIntegrityError";
    this.code = code;
  }
}

export class SelectorShadowUnavailableError extends Error {
  constructor(code) {
    super(REASON_TEXT[code] ?? "Selector-shadow comparison is unavailable.");
    this.name = "SelectorShadowUnavailableError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new SelectorShadowIntegrityError(code, message);
}

function unavailable(code) {
  throw new SelectorShadowUnavailableError(code);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isInside(parent, candidate) {
  const rel = relative(parent, candidate);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function requireFullObjectId(value, label) {
  if (typeof value !== "string" || !FULL_GIT_OBJECT_ID.test(value)) {
    fail("invalid_identity", `${label} must be a full lowercase Git object ID`);
  }
  return value;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function safeIntegerOrNull(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function identityKey(identity) {
  return `${identity.path}\u0000${identity.test_id}`;
}

export function sortDeduplicateIdentities(values) {
  const byKey = new Map();
  for (const value of values) {
    if (!isRecord(value) || typeof value.path !== "string" || typeof value.test_id !== "string") {
      fail("identity_invalid", "selector-shadow failure identity is malformed");
    }
    byKey.set(identityKey(value), Object.freeze({ path: value.path, test_id: value.test_id }));
  }
  return Object.freeze([...byKey.values()].sort((left, right) =>
    compareStrings(left.path, right.path) || compareStrings(left.test_id, right.test_id)
  ));
}

export function validateBoundEvidence(receiptBytes, envelopeBytes) {
  if (!Buffer.isBuffer(receiptBytes) || receiptBytes.length === 0) {
    fail("receipt_missing", "selector-shadow receipt input is empty");
  }
  if (!Buffer.isBuffer(envelopeBytes) || envelopeBytes.length === 0) {
    fail("envelope_missing", "selector-shadow envelope input is empty");
  }

  let envelope;
  try { envelope = JSON.parse(envelopeBytes.toString("utf8")); }
  catch { fail("envelope_json_invalid", "selector-shadow envelope is not valid JSON"); }

  if (!isRecord(envelope) || envelope.schema_version !== 1 || envelope.classification !== "SHADOW_NON_GATING") {
    fail("envelope_contract_invalid", "selector-shadow envelope schema/classification is invalid");
  }
  if (envelope.receipt_file !== "self-verification-receipt.json") {
    fail("envelope_contract_invalid", "selector-shadow envelope receipt file identity is invalid");
  }
  if (typeof envelope.receipt_sha256 !== "string" || !SHA256.test(envelope.receipt_sha256)) {
    fail("receipt_digest_invalid", "selector-shadow envelope receipt digest is invalid");
  }

  const receiptDigest = sha256(receiptBytes);
  if (receiptDigest !== envelope.receipt_sha256) {
    fail("receipt_digest_mismatch", "selector-shadow receipt bytes do not match the bound envelope digest");
  }

  let receipt;
  try { receipt = JSON.parse(receiptBytes.toString("utf8")); }
  catch { fail("receipt_json_invalid", "selector-shadow receipt is not valid JSON"); }

  const identities = Object.freeze({
    eventBaseSha: requireFullObjectId(envelope.event_base_tip_sha, "event base tip"),
    mergeBaseSha: requireFullObjectId(envelope.subject_merge_base_sha, "subject merge base"),
    targetHeadSha: requireFullObjectId(envelope.subject_target_head_sha, "subject target head"),
    targetTreeSha: requireFullObjectId(envelope.subject_target_tree_sha, "subject target tree"),
    verifierHeadSha: requireFullObjectId(envelope.verifier_head_sha, "verifier head"),
    verifierHeadTreeSha: requireFullObjectId(envelope.verifier_head_tree_sha, "verifier head tree"),
  });
  if (
    identities.targetHeadSha !== identities.verifierHeadSha ||
    identities.targetTreeSha !== identities.verifierHeadTreeSha
  ) {
    fail("envelope_identity_mismatch", "selector-shadow envelope target and verifier H/HT identities are inconsistent");
  }

  if (!isRecord(receipt) || !isRecord(receipt.summary) || !Number.isSafeInteger(receipt.summary.exit_code)) {
    fail("receipt_contract_invalid", "selector-shadow bound receipt summary is invalid");
  }
  if (!Number.isSafeInteger(envelope.receipt_exit_code) || envelope.receipt_exit_code !== receipt.summary.exit_code) {
    fail("receipt_exit_mismatch", "selector-shadow receipt exit does not match the bound envelope");
  }

  return Object.freeze({ envelope, receipt, identities, receiptDigest });
}

export function classifyAscoutTestTask(receipt) {
  if (!isRecord(receipt) || !Array.isArray(receipt.tasks) || !isRecord(receipt.selection)) {
    fail("receipt_task_contract_invalid", "selector-shadow receipt task/selection structure is invalid");
  }
  const testTasks = receipt.tasks.filter((task) => isRecord(task) && task.task_type === "test");
  if (testTasks.length !== 1) {
    fail("test_task_ambiguous", "selector-shadow requires exactly one bound Ascout test task");
  }
  const task = testTasks[0];
  if (typeof task.task_id !== "string" || task.task_id.length === 0 || task.task_id.includes("\0")) {
    fail("test_task_identity_invalid", "selector-shadow Ascout test task identity is invalid");
  }
  if (receipt.selection.mode === "no_test_task") {
    return Object.freeze({ available: false, reasonCode: "UNAVAILABLE_ASCOUT_SELECTION", task });
  }
  if (task.execution_admission !== "normal" || task.command_surface_changed !== false) {
    return Object.freeze({ available: false, reasonCode: "UNAVAILABLE_ASCOUT_ADMISSION", task });
  }
  if (UNAVAILABLE_STATUSES.has(task.status)) {
    return Object.freeze({ available: false, reasonCode: "UNAVAILABLE_ASCOUT_TASK_STATE", task });
  }
  if (!COMPARABLE_STATUSES.has(task.status)) {
    fail("test_task_status_invalid", "selector-shadow Ascout test task status is not interpretable");
  }
  return Object.freeze({ available: true, reasonCode: null, task });
}

export function extractAscoutFailureIdentities(receipt, task) {
  if (!Array.isArray(receipt.findings)) {
    fail("receipt_findings_invalid", "selector-shadow receipt findings structure is invalid");
  }
  const identities = [];
  for (const finding of receipt.findings) {
    if (!isRecord(finding) || finding.task_id !== task.task_id) continue;
    if (
      typeof finding.path !== "string" || !CANONICAL_REPOSITORY_PATH.test(finding.path) || finding.path.includes("\0") ||
      typeof finding.rule_or_test_id !== "string" || finding.rule_or_test_id.length === 0 || finding.rule_or_test_id.includes("\0")
    ) {
      unavailable("UNAVAILABLE_ASCOUT_FINDINGS");
    }
    identities.push({ path: finding.path, test_id: finding.rule_or_test_id });
  }
  return sortDeduplicateIdentities(identities);
}

export function compareFailureIdentities(fullSuiteFailed, ascoutFailed) {
  const full = sortDeduplicateIdentities(fullSuiteFailed);
  const ascout = sortDeduplicateIdentities(ascoutFailed);
  const ascoutKeys = new Set(ascout.map(identityKey));
  const matched = full.filter((identity) => ascoutKeys.has(identityKey(identity)));
  const misses = full.filter((identity) => !ascoutKeys.has(identityKey(identity)));
  const disposition = full.length === 0
    ? "NO_FULL_SUITE_FAILURES"
    : misses.length === 0
      ? "FULL_SUITE_FAILURES_CAPTURED"
      : "SELECTOR_MISSES_OBSERVED";
  return Object.freeze({
    full_suite_failed: full,
    ascout_failed: ascout,
    matched: Object.freeze(matched),
    selector_misses: Object.freeze(misses),
    disposition,
  });
}

export function validateRootPackageContract(packageValue) {
  if (!isRecord(packageValue) || !isRecord(packageValue.scripts) || packageValue.scripts.test !== "vitest run") {
    unavailable("UNAVAILABLE_FULL_SUITE_CONTRACT");
  }
  return true;
}

export async function normalizeReportedPath(repositoryRoot, machineName, fsOps = { realpath }) {
  if (typeof machineName !== "string" || machineName.length === 0 || machineName.includes("\0")) {
    unavailable("UNAVAILABLE_FULL_SUITE_REPORT");
  }
  const rootReal = await fsOps.realpath(resolve(repositoryRoot));
  const candidate = isAbsolute(machineName) ? machineName : resolve(rootReal, machineName);
  let candidateReal;
  try { candidateReal = await fsOps.realpath(candidate); }
  catch { unavailable("UNAVAILABLE_FULL_SUITE_REPORT"); }
  if (!isInside(rootReal, candidateReal)) unavailable("UNAVAILABLE_FULL_SUITE_REPORT");
  const repositoryPath = relative(rootReal, candidateReal).split(sep).join("/");
  if (!CANONICAL_REPOSITORY_PATH.test(repositoryPath)) unavailable("UNAVAILABLE_FULL_SUITE_REPORT");
  return repositoryPath;
}

export async function parseVitestFailureReport(reportText, normalizePath) {
  let report;
  try { report = JSON.parse(String(reportText)); }
  catch { unavailable("UNAVAILABLE_FULL_SUITE_REPORT"); }
  if (!isRecord(report) || !Array.isArray(report.testResults)) unavailable("UNAVAILABLE_FULL_SUITE_REPORT");

  const failures = [];
  for (const suite of report.testResults) {
    if (
      !isRecord(suite) ||
      typeof suite.name !== "string" || suite.name.length === 0 || suite.name.includes("\0") ||
      typeof suite.status !== "string" || suite.status.length === 0 || suite.status.includes("\0") ||
      !Array.isArray(suite.assertionResults)
    ) {
      unavailable("UNAVAILABLE_FULL_SUITE_REPORT");
    }
    const path = await normalizePath(suite.name);
    for (const assertion of suite.assertionResults) {
      if (
        !isRecord(assertion) ||
        typeof assertion.status !== "string" || assertion.status.length === 0 || assertion.status.includes("\0") ||
        typeof assertion.fullName !== "string" || assertion.fullName.length === 0 || assertion.fullName.includes("\0")
      ) {
        unavailable("UNAVAILABLE_FULL_SUITE_REPORT");
      }
      if (assertion.status === "failed") failures.push({ path, test_id: assertion.fullName });
    }
  }
  return sortDeduplicateIdentities(failures);
}

function runGit(repositoryRoot, args) {
  const result = spawnSync("git", ["-C", repositoryRoot, ...args], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status === null || result.signal !== null) {
    fail("git_execution_failed", `git ${args[0] ?? "command"} did not complete reliably`);
  }
  return result;
}

export async function captureReconstructedSourceState(repositoryRoot, identities = null) {
  const head = runGit(repositoryRoot, ["rev-parse", "--verify", "HEAD^{commit}"]);
  const tree = runGit(repositoryRoot, ["write-tree"]);
  const unstaged = runGit(repositoryRoot, ["diff", "--quiet", "--"]);
  const status = runGit(repositoryRoot, ["status", "--porcelain=v1", "--untracked-files=all", "--ignored=no"]);
  if (head.status !== 0 || tree.status !== 0 || ![0, 1].includes(unstaged.status) || status.status !== 0) {
    fail("git_execution_failed", "selector-shadow source identity Git observation failed");
  }

  let targetHeadTreeSha = null;
  if (identities !== null) {
    if (!isRecord(identities) || typeof identities.targetHeadSha !== "string") {
      fail("target_head_identity_invalid", "selector-shadow target head identity is unavailable for tree verification");
    }
    const targetTree = runGit(repositoryRoot, ["rev-parse", "--verify", `${identities.targetHeadSha}^{tree}`]);
    if (targetTree.status !== 0) {
      fail("target_head_tree_unresolvable", "selector-shadow target head tree cannot be resolved from Git");
    }
    targetHeadTreeSha = requireFullObjectId(targetTree.stdout.trim(), "resolved target head tree");
  }

  const untracked = status.stdout.split(/\r?\n/u).filter((line) => line.startsWith("?? "));
  return Object.freeze({
    headSha: head.stdout.trim(),
    treeSha: tree.stdout.trim(),
    targetHeadTreeSha,
    unstagedClean: unstaged.status === 0,
    nonignoredUntrackedClean: untracked.length === 0,
  });
}

function requireInitialSourceState(state, identities) {
  if (
    state.headSha !== identities.mergeBaseSha ||
    state.treeSha !== identities.targetTreeSha ||
    state.targetHeadTreeSha !== identities.targetTreeSha ||
    state.unstagedClean !== true ||
    state.nonignoredUntrackedClean !== true
  ) {
    fail("source_binding_mismatch", "selector-shadow subject does not match the bound reconstructed source identity");
  }
}

function postSourceStateStable(state, identities) {
  return state.headSha === identities.mergeBaseSha &&
    state.treeSha === identities.targetTreeSha &&
    state.targetHeadTreeSha === identities.targetTreeSha &&
    state.unstagedClean === true &&
    state.nonignoredUntrackedClean === true;
}

export async function resolveLocalVitestRuntime(repositoryRoot, fsOps = { readFile, realpath, stat }) {
  let packageValue;
  try { packageValue = JSON.parse((await fsOps.readFile(resolve(repositoryRoot, "package.json"), "utf8")).toString()); }
  catch { unavailable("UNAVAILABLE_FULL_SUITE_CONTRACT"); }
  validateRootPackageContract(packageValue);

  let rootReal;
  let nodeModulesReal;
  try {
    rootReal = await fsOps.realpath(resolve(repositoryRoot));
    nodeModulesReal = await fsOps.realpath(resolve(rootReal, "node_modules"));
  } catch { unavailable("UNAVAILABLE_FULL_SUITE_CONTRACT"); }

  const executableCandidates = process.platform === "win32"
    ? ["node_modules/.bin/vitest.cmd", "node_modules/.bin/vitest.exe"]
    : ["node_modules/.bin/vitest", "node_modules/.bin/vitest.exe"];

  let executablePath = null;
  for (const relativePath of executableCandidates) {
    try {
      const candidateReal = await fsOps.realpath(resolve(rootReal, relativePath));
      const candidateStats = await fsOps.stat(candidateReal);
      if (candidateStats.isFile() && isInside(nodeModulesReal, candidateReal)) {
        executablePath = candidateReal;
        break;
      }
    } catch {}
  }
  if (executablePath === null) unavailable("UNAVAILABLE_FULL_SUITE_CONTRACT");

  let vitestManifest;
  try {
    const manifestReal = await fsOps.realpath(resolve(rootReal, "node_modules/vitest/package.json"));
    if (!isInside(nodeModulesReal, manifestReal)) unavailable("UNAVAILABLE_FULL_SUITE_CONTRACT");
    vitestManifest = JSON.parse((await fsOps.readFile(manifestReal, "utf8")).toString());
  } catch (error) {
    if (error instanceof SelectorShadowUnavailableError) throw error;
    unavailable("UNAVAILABLE_FULL_SUITE_CONTRACT");
  }
  if (!isRecord(vitestManifest) || vitestManifest.name !== "vitest" || typeof vitestManifest.version !== "string" || vitestManifest.version.length === 0) {
    unavailable("UNAVAILABLE_FULL_SUITE_CONTRACT");
  }

  return Object.freeze({ executablePath, version: vitestManifest.version, repositoryRoot: rootReal });
}

function windowsTaskkillPath(environment = process.env) {
  const systemRoot = environment.SystemRoot;
  if (
    typeof systemRoot !== "string" ||
    systemRoot.length === 0 ||
    systemRoot.includes("\0") ||
    !pathWin32.isAbsolute(systemRoot) ||
    systemRoot.startsWith("\\\\")
  ) {
    return null;
  }
  return pathWin32.join(systemRoot, "System32", "taskkill.exe");
}

export function terminateWindowsProcessTree(rootPid, adapters = {}) {
  if (!Number.isSafeInteger(rootPid) || rootPid <= 0) return false;
  const taskkillPath = windowsTaskkillPath(adapters.environment ?? process.env);
  if (taskkillPath === null) return false;
  const spawnSyncFn = adapters.spawnSyncFn ?? spawnSync;
  const result = spawnSyncFn(taskkillPath, ["/PID", String(rootPid), "/T", "/F"], {
    shell: false,
    windowsHide: true,
    stdio: "ignore",
    timeout: WINDOWS_TREE_KILL_TIMEOUT_MS,
  });
  return (
    (result.error === undefined || result.error === null) &&
    result.signal == null &&
    (result.status === 0 || result.status === 128)
  );
}

function terminatePosixProcessGroup(rootPid) {
  if (!Number.isSafeInteger(rootPid) || rootPid <= 0) return false;
  try {
    process.kill(-rootPid, "SIGKILL");
    return true;
  } catch (error) {
    return error?.code === "ESRCH";
  }
}

export async function executeVitestReference(runtime, reportPath, timeoutMs = REFERENCE_TIMEOUT_MS) {
  if (timeoutMs !== REFERENCE_TIMEOUT_MS) {
    fail("reference_timeout_invalid", "selector-shadow reference timeout must remain exactly 10 minutes");
  }
  const started = Date.now();
  return await new Promise((resolvePromise) => {
    let settled = false;
    let timedOut = false;
    let cleanupConfirmed = false;
    let timer = null;
    let cleanupTimer = null;
    let child;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (cleanupTimer) clearTimeout(cleanupTimer);
      resolvePromise(Object.freeze({ ...value, durationMs: Math.max(0, Date.now() - started) }));
    };

    try {
      child = spawn(runtime.executablePath, ["run", "--reporter=json", `--outputFile=${reportPath}`], {
        cwd: runtime.repositoryRoot,
        shell: false,
        windowsHide: true,
        detached: process.platform !== "win32",
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      finish({ outcome: "spawn_error", exitCode: null, signal: null, cleanupComplete: true });
      return;
    }

    child.once("error", () => {
      if (timedOut && !cleanupConfirmed) return;
      finish(timedOut
        ? { outcome: "timed_out", exitCode: null, signal: "SIGKILL", cleanupComplete: true }
        : { outcome: "spawn_error", exitCode: null, signal: null, cleanupComplete: true });
    });
    child.once("close", (exitCode, signal) => {
      if (timedOut && !cleanupConfirmed) return;
      finish(timedOut
        ? { outcome: "timed_out", exitCode: null, signal: "SIGKILL", cleanupComplete: true }
        : { outcome: "completed", exitCode, signal, cleanupComplete: true });
    });

    timer = setTimeout(() => {
      if (settled) return;
      timedOut = true;
      const rootPid = child.pid;
      const cleaned = process.platform === "win32"
        ? terminateWindowsProcessTree(rootPid)
        : terminatePosixProcessGroup(rootPid);
      if (!cleaned) {
        finish({ outcome: "cleanup_error", exitCode: null, signal: null, cleanupComplete: false });
        return;
      }
      cleanupConfirmed = true;
      cleanupTimer = setTimeout(() => {
        finish({ outcome: "cleanup_error", exitCode: null, signal: null, cleanupComplete: false });
      }, REFERENCE_CLEANUP_TIMEOUT_MS);
    }, REFERENCE_TIMEOUT_MS);
  });
}

function ascoutTaskObservation(receipt, task) {
  const selection = receipt.selection;
  return Object.freeze({
    task_id: task.task_id,
    status: COMPARABLE_STATUSES.has(task.status) ? task.status : null,
    duration_ms: safeIntegerOrNull(task.duration_ms),
    selection_mode: typeof selection.mode === "string" ? selection.mode : null,
    selected_test_count: safeIntegerOrNull(task.selected_test_count),
    deselected_test_count: safeIntegerOrNull(task.deselected_test_count),
    total_test_count: safeIntegerOrNull(selection.total_test_count),
    widened: typeof selection.widened === "boolean" ? selection.widened : false,
    widen_triggers: Array.isArray(selection.widen_triggers)
      ? Object.freeze(selection.widen_triggers.filter((value) => typeof value === "string"))
      : Object.freeze([]),
  });
}

function observationSource(bound) {
  return Object.freeze({
    event_base_tip_sha: bound.identities.eventBaseSha,
    subject_merge_base_sha: bound.identities.mergeBaseSha,
    subject_target_head_sha: bound.identities.targetHeadSha,
    subject_target_tree_sha: bound.identities.targetTreeSha,
    receipt_sha256: bound.receiptDigest,
  });
}

function unavailableObservation(bound, taskObservation, reasonCode, runtimeVersion = null, durationMs = null) {
  return Object.freeze({
    schema_version: 1,
    classification: "SELECTOR_SHADOW_NON_GATING",
    source: observationSource(bound),
    ascout_test_task: taskObservation,
    full_suite: Object.freeze({
      runner: "vitest",
      runner_version: runtimeVersion,
      duration_ms: safeIntegerOrNull(durationMs),
      failed_test_count: null,
    }),
    comparison: Object.freeze({
      available: false,
      disposition: "UNAVAILABLE",
      reason_code: reasonCode,
      reason_text: REASON_TEXT[reasonCode] ?? "Selector-shadow comparison is unavailable.",
      full_suite_failed: Object.freeze([]),
      ascout_failed: Object.freeze([]),
      matched: Object.freeze([]),
      selector_misses: Object.freeze([]),
    }),
  });
}

function comparableObservation(bound, taskObservation, runtimeVersion, durationMs, comparison) {
  return Object.freeze({
    schema_version: 1,
    classification: "SELECTOR_SHADOW_NON_GATING",
    source: observationSource(bound),
    ascout_test_task: taskObservation,
    full_suite: Object.freeze({
      runner: "vitest",
      runner_version: runtimeVersion,
      duration_ms: safeIntegerOrNull(durationMs) ?? 0,
      failed_test_count: comparison.full_suite_failed.length,
    }),
    comparison: Object.freeze({
      available: true,
      disposition: comparison.disposition,
      reason_code: null,
      reason_text: null,
      full_suite_failed: comparison.full_suite_failed,
      ascout_failed: comparison.ascout_failed,
      matched: comparison.matched,
      selector_misses: comparison.selector_misses,
    }),
  });
}

export async function preparePrivateReportArea(repositoryRoot, fsOps = { lstat, mkdtemp, realpath, rm }) {
  const repositoryReal = await fsOps.realpath(resolve(repositoryRoot));
  const tempParentReal = await fsOps.realpath(tmpdir());
  const created = await fsOps.mkdtemp(join(tempParentReal, "ascout-selector-shadow-"));
  const root = await fsOps.realpath(created);
  const rootStats = await fsOps.lstat(root);
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink() || isInside(repositoryReal, root)) {
    try { await fsOps.rm(root, { recursive: true, force: true }); } catch {}
    fail("reference_output_invalid", "selector-shadow private report directory is unsafe");
  }
  return Object.freeze({ root, reportPath: join(root, "vitest-results.json") });
}

export async function publishObservationAtomically(
  repositoryRoot,
  outputPath,
  observation,
  fsOps = { link, lstat, realpath, rm, unlink, writeFile },
) {
  if (!isAbsolute(outputPath)) fail("output_path_invalid", "selector-shadow output path must be absolute");
  const repositoryReal = await fsOps.realpath(resolve(repositoryRoot));
  const parentReal = await fsOps.realpath(dirname(resolve(outputPath)));
  if (isInside(repositoryReal, parentReal)) {
    fail("output_inside_repository", "selector-shadow output must be outside repository source identity");
  }
  const target = join(parentReal, basename(outputPath));
  try {
    await fsOps.lstat(target);
    fail("output_exists", "selector-shadow output target must not already exist");
  } catch (error) {
    if (error instanceof SelectorShadowIntegrityError) throw error;
    if (error?.code !== "ENOENT") fail("output_unavailable", "selector-shadow output target cannot be inspected safely");
  }

  const stage = join(parentReal, `.selector-shadow-${process.pid}-${randomBytes(8).toString("hex")}.tmp`);
  const bytes = Buffer.from(`${JSON.stringify(observation, null, 2)}\n`, "utf8");
  let staged = false;
  try {
    await fsOps.writeFile(stage, bytes, { flag: "wx", mode: 0o600 });
    staged = true;
    const parentAfter = await fsOps.realpath(parentReal);
    if (parentAfter !== parentReal || isInside(repositoryReal, parentAfter)) {
      fail("output_parent_changed", "selector-shadow output parent changed before publication");
    }
    try {
      await fsOps.link(stage, target);
    } catch (error) {
      if (error?.code === "EEXIST") {
        fail("output_exists", "selector-shadow output target appeared before publication");
      }
      fail("output_unavailable", "selector-shadow output could not be published with exclusive final-path ownership");
    }
    await fsOps.unlink(stage);
    staged = false;
  } finally {
    if (staged) {
      try { await fsOps.rm(stage, { force: true }); } catch {}
    }
  }
}

export async function runSelectorShadow(input, adapters = {}) {
  const repositoryRoot = resolve(input.repositoryRoot ?? process.cwd());
  const fsOps = adapters.fsOps ?? { link, lstat, mkdtemp, readFile, realpath, rm, stat, unlink, writeFile };
  const captureSourceState = adapters.captureSourceState ?? captureReconstructedSourceState;
  const resolveRuntime = adapters.resolveRuntime ?? ((root) => resolveLocalVitestRuntime(root, fsOps));
  const executeReference = adapters.executeReference ?? executeVitestReference;
  const normalizePath = adapters.normalizePath ?? ((machineName) => normalizeReportedPath(repositoryRoot, machineName, fsOps));
  const prepareReportArea = adapters.prepareReportArea ?? ((root) => preparePrivateReportArea(root, fsOps));
  const publish = adapters.publish ?? ((observation) => publishObservationAtomically(repositoryRoot, input.outputPath, observation, fsOps));

  const [receiptBytes, envelopeBytes] = await Promise.all([
    fsOps.readFile(input.receiptPath),
    fsOps.readFile(input.envelopePath),
  ]);
  const bound = validateBoundEvidence(Buffer.from(receiptBytes), Buffer.from(envelopeBytes));
  requireInitialSourceState(await captureSourceState(repositoryRoot, bound.identities), bound.identities);

  const taskClassification = classifyAscoutTestTask(bound.receipt);
  const taskObservation = ascoutTaskObservation(bound.receipt, taskClassification.task);
  if (!taskClassification.available) {
    const observation = unavailableObservation(bound, taskObservation, taskClassification.reasonCode);
    await publish(observation);
    return observation;
  }

  let ascoutFailed;
  try { ascoutFailed = extractAscoutFailureIdentities(bound.receipt, taskClassification.task); }
  catch (error) {
    if (!(error instanceof SelectorShadowUnavailableError)) throw error;
    const observation = unavailableObservation(bound, taskObservation, error.code);
    await publish(observation);
    return observation;
  }

  let runtime;
  try { runtime = await resolveRuntime(repositoryRoot); }
  catch (error) {
    if (!(error instanceof SelectorShadowUnavailableError)) throw error;
    const observation = unavailableObservation(bound, taskObservation, error.code);
    await publish(observation);
    return observation;
  }

  const reportArea = await prepareReportArea(repositoryRoot);
  try {
    const execution = await executeReference(runtime, reportArea.reportPath, REFERENCE_TIMEOUT_MS);
    const finalState = await captureSourceState(repositoryRoot, bound.identities);
    if (!postSourceStateStable(finalState, bound.identities)) {
      const observation = unavailableObservation(
        bound,
        taskObservation,
        "UNAVAILABLE_SOURCE_DRIFT",
        runtime.version,
        execution.durationMs,
      );
      await publish(observation);
      return observation;
    }

    if (execution.outcome !== "completed" || !Number.isInteger(execution.exitCode)) {
      const observation = unavailableObservation(
        bound,
        taskObservation,
        "UNAVAILABLE_FULL_SUITE_EXECUTION",
        runtime.version,
        execution.durationMs,
      );
      await publish(observation);
      return observation;
    }

    let reportText;
    try { reportText = await fsOps.readFile(reportArea.reportPath, "utf8"); }
    catch {
      const observation = unavailableObservation(
        bound,
        taskObservation,
        "UNAVAILABLE_FULL_SUITE_EXECUTION",
        runtime.version,
        execution.durationMs,
      );
      await publish(observation);
      return observation;
    }

    let fullSuiteFailed;
    try { fullSuiteFailed = await parseVitestFailureReport(reportText, normalizePath); }
    catch (error) {
      if (!(error instanceof SelectorShadowUnavailableError)) throw error;
      const observation = unavailableObservation(bound, taskObservation, error.code, runtime.version, execution.durationMs);
      await publish(observation);
      return observation;
    }

    if ((execution.exitCode !== 0 && fullSuiteFailed.length === 0) || (execution.exitCode === 0 && fullSuiteFailed.length > 0)) {
      const observation = unavailableObservation(
        bound,
        taskObservation,
        "UNAVAILABLE_FULL_SUITE_REPORT",
        runtime.version,
        execution.durationMs,
      );
      await publish(observation);
      return observation;
    }

    const comparison = compareFailureIdentities(fullSuiteFailed, ascoutFailed);
    const observation = comparableObservation(bound, taskObservation, runtime.version, execution.durationMs, comparison);
    await publish(observation);
    return observation;
  } finally {
    try { await fsOps.rm(reportArea.root, { recursive: true, force: true }); }
    catch { fail("reference_cleanup_failed", "selector-shadow private report directory could not be removed cleanly"); }
  }
}

export function parseCliArguments(argv) {
  const values = { receiptPath: null, envelopePath: null, outputPath: null };
  const mapping = new Map([
    ["--receipt", "receiptPath"],
    ["--envelope", "envelopePath"],
    ["--output", "outputPath"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const key = mapping.get(argv[index]);
    if (!key || index + 1 >= argv.length || values[key] !== null) {
      fail("cli_invalid", "selector-shadow CLI arguments are invalid");
    }
    values[key] = argv[index + 1];
    index += 1;
  }
  if (Object.values(values).some((value) => typeof value !== "string") || argv.length !== 6) {
    fail("cli_invalid", "selector-shadow requires exactly --receipt, --envelope, and --output");
  }
  for (const value of Object.values(values)) {
    if (!isAbsolute(value)) fail("cli_invalid", "selector-shadow evidence paths must be absolute");
  }
  return Object.freeze(values);
}

async function main() {
  const args = parseCliArguments(process.argv.slice(2));
  await runSelectorShadow({ repositoryRoot: process.cwd(), ...args });
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    if (error instanceof SelectorShadowIntegrityError) {
      process.stderr.write(`selector_shadow_integrity_failure:${error.code}\n`);
      process.exitCode = 2;
      return;
    }
    process.stderr.write("selector_shadow_integrity_failure:unexpected\n");
    process.exitCode = 2;
  });
}
