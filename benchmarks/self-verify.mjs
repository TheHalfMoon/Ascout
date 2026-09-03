import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, lstat, mkdir, mkdtemp, open, readFile, readdir, readlink, realpath, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const FULL_GIT_OBJECT_ID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const ALLOWED_RECEIPT_EXITS = new Set([0, 1, 3, 4]);
const SOURCE_BINDING_FIELDS = [
  "head_sha",
  "tree_digest_version",
  "tree_digest",
  "tracked_index_entry_count",
  "unstaged_changed_count",
  "included_untracked_count",
];
const RECEIPT_FILE = "self-verification-receipt.json";
const ENVELOPE_FILE = "self-verification-envelope.json";
const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;
const CAPTURE_LIMIT_BYTES = 32 * 1024 * 1024;
const BOUND_PARENT_PUBLISH_TIMEOUT_MS = 30 * 1000;
const RECEIPT_SCHEMA_PATH = "specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json";
const REQUIRED_RUNTIME_FILES = [
  "cli.js",
  "check.js",
  "receipt/json.js",
  "receipt/model.js",
];
const REQUIRED_RUNTIME_ROOT_FILES = ["package.json", "package-lock.json", RECEIPT_SCHEMA_PATH];
const DEFAULT_EVIDENCE_IO = Object.freeze({ lstat, mkdir, mkdtemp, open, readFile, readdir, realpath, rename, rm, writeFile });
const BOUND_PARENT_PUBLISHER_SOURCE = [
  'const { lstat, realpath, rename, rm } = require("node:fs/promises");',
  'const { createInterface } = require("node:readline");',
  'const [stagePath, finalName, canonicalParent, parentDev, parentIno, stageDev, stageIno] = process.argv.slice(1);',
  'let published = false;',
  'async function requireDirectory(path, expectedDev, expectedIno) {',
  '  const stats = await lstat(path, { bigint: true });',
  '  if (!stats.isDirectory() || stats.isSymbolicLink() || String(stats.dev) !== expectedDev || String(stats.ino) !== expectedIno) throw new Error("directory_identity_mismatch");',
  '}',
  'async function requireParent() {',
  '  await requireDirectory(".", parentDev, parentIno);',
  '  if (await realpath(".") !== canonicalParent) throw new Error("parent_path_mismatch");',
  '  await requireDirectory(".", parentDev, parentIno);',
  '}',
  'async function requireTargetAbsent() {',
  '  try { await lstat(finalName); }',
  '  catch (error) { if (error && error.code === "ENOENT") return; throw error; }',
  '  throw new Error("target_exists");',
  '}',
  'async function rollback() {',
  '  if (!published) return;',
  '  await rm(finalName, { recursive: true, force: true });',
  '  published = false;',
  '}',
  'const commandLines = createInterface({ input: process.stdin, crlfDelay: Infinity })[Symbol.asyncIterator]();',
  'async function readCommand() {',
  '  const next = await commandLines.next();',
  '  return next.done ? "ROLLBACK" : String(next.value).trim();',
  '}',
  '(async () => {',
  '  try {',
  '    await requireParent();',
  '    await requireDirectory(stagePath, stageDev, stageIno);',
  '    await requireTargetAbsent();',
  '    await requireParent();',
  '    await rename(stagePath, finalName);',
  '    published = true;',
  '    await requireDirectory(finalName, stageDev, stageIno);',
  '    await requireParent();',
  '    process.stdout.write("READY\\n");',
  '    const command = await readCommand();',
  '    if (command !== "COMMIT") {',
  '      await rollback();',
  '      process.stdout.write("ROLLED_BACK\\n");',
  '      return;',
  '    }',
  '    await requireDirectory(finalName, stageDev, stageIno);',
  '    await requireParent();',
  '    process.stdout.write("COMMIT_READY\\n");',
  '    const confirmation = await readCommand();',
  '    if (confirmation !== "CONFIRM") {',
  '      await rollback();',
  '      process.stdout.write("ROLLED_BACK\\n");',
  '      return;',
  '    }',
  '    await requireDirectory(finalName, stageDev, stageIno);',
  '    await requireParent();',
  '    published = false;',
  '    process.stdout.write("COMMITTED\\n");',
  '  } catch {',
  '    let rolledBack = false;',
  '    try { await rollback(); rolledBack = true; } catch {}',
  '    if (rolledBack) process.stdout.write("ROLLED_BACK\\n");',
  '    process.stderr.write("bound_parent_publication_failed\\n");',
  '    process.exitCode = 1;',
  '  }',
  '})().catch(() => { process.stderr.write("bound_parent_publication_failed\\n"); process.exitCode = 1; });',
].join("\n");

export class SelfVerificationIntegrityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SelfVerificationIntegrityError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new SelfVerificationIntegrityError(code, message);
}

function fullObjectId(value, label) {
  if (typeof value !== "string" || !FULL_GIT_OBJECT_ID.test(value)) {
    fail("invalid_identity", `${label} must be a full lowercase Git object ID`);
  }
  return value;
}

function isInside(parent, candidate) {
  const rel = relative(parent, candidate);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function appendCapture(state, chunk) {
  state.observed += chunk.length;
  const remaining = CAPTURE_LIMIT_BYTES - state.captured;
  if (remaining <= 0) {
    state.truncated = true;
    return;
  }
  const kept = chunk.subarray(0, Math.min(remaining, chunk.length));
  state.chunks.push(Buffer.from(kept));
  state.captured += kept.length;
  if (kept.length !== chunk.length) state.truncated = true;
}

async function runProcess(file, args, { cwd, timeoutMs = DEFAULT_TIMEOUT_MS, env = process.env } = {}) {
  return await new Promise((resolvePromise) => {
    const stdout = { chunks: [], captured: 0, observed: 0, truncated: false };
    const stderr = { chunks: [], captured: 0, observed: 0, truncated: false };
    let settled = false;

    const child = spawn(file, args, {
      cwd,
      env,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout?.on("data", (chunk) => appendCapture(stdout, chunk));
    child.stderr?.on("data", (chunk) => appendCapture(stderr, chunk));

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({
        ...result,
        stdout: Buffer.concat(stdout.chunks, stdout.captured),
        stderr: Buffer.concat(stderr.chunks, stderr.captured),
        stdoutTruncated: stdout.truncated,
        stderrTruncated: stderr.truncated,
      });
    };

    const timer = setTimeout(() => {
      if (settled) return;
      try { child.kill("SIGKILL"); } catch {}
      finish({ outcome: "timed_out", exitCode: null, signal: null, error: null });
    }, timeoutMs);

    child.once("error", (error) => finish({ outcome: "error", exitCode: null, signal: null, error }));
    child.once("close", (exitCode, signal) => finish({ outcome: "exited", exitCode, signal, error: null }));
  });
}

async function requireReliableProcess(result, code, label, allowedExitCodes = [0]) {
  if (result.outcome !== "exited" || result.stdoutTruncated || result.stderrTruncated) {
    fail(code, `${label} did not complete reliably`);
  }
  if (!allowedExitCodes.includes(result.exitCode)) {
    fail(code, `${label} failed with exit ${String(result.exitCode)}`);
  }
  return result;
}

async function git(repositoryRoot, args, allowedExitCodes = [0]) {
  const result = await runProcess("git", ["-C", repositoryRoot, ...args], { cwd: repositoryRoot });
  return await requireReliableProcess(result, "git_execution_failed", `git ${args[0] ?? "command"}`, allowedExitCodes);
}

async function gitText(repositoryRoot, args) {
  return (await git(repositoryRoot, args)).stdout.toString("utf8").trim();
}

async function requireGitObject(repositoryRoot, sha, kind = "commit") {
  const result = await git(repositoryRoot, ["cat-file", "-e", `${sha}^{${kind}}`], [0, 1, 128]);
  if (result.exitCode !== 0) fail("git_identity_unavailable", `required Git ${kind} object is unavailable`);
}

async function requireNoNonignoredUntracked(repositoryRoot) {
  const status = await gitText(repositoryRoot, ["status", "--porcelain=v1", "--untracked-files=all", "--ignored=no"]);
  const untracked = status.split(/\r?\n/u).filter((line) => line.startsWith("?? "));
  if (untracked.length > 0) fail("untracked_contamination", "unrelated nonignored untracked material exists in the subject repository");
}

async function requireCleanHeadState(repositoryRoot, headSha, targetTreeSha) {
  const currentHead = await gitText(repositoryRoot, ["rev-parse", "--verify", "HEAD^{commit}"]);
  if (currentHead !== headSha) fail("head_mismatch", "repository HEAD does not equal the declared exact head");

  const indexTree = await gitText(repositoryRoot, ["write-tree"]);
  if (indexTree !== targetTreeSha) fail("index_tree_mismatch", "index tree does not equal the declared head tree");

  const staged = await git(repositoryRoot, ["diff", "--quiet", "--cached", "HEAD", "--"], [0, 1]);
  if (staged.exitCode !== 0) fail("tracked_contamination", "staged tracked changes exist before reconstruction");

  const unstaged = await git(repositoryRoot, ["diff", "--quiet", "--"], [0, 1]);
  if (unstaged.exitCode !== 0) fail("tracked_contamination", "unstaged tracked changes exist before reconstruction");

  await requireNoNonignoredUntracked(repositoryRoot);
}

async function requireNoUnstagedTracked(repositoryRoot) {
  const result = await git(repositoryRoot, ["diff", "--quiet", "--"], [0, 1]);
  if (result.exitCode !== 0) fail("tracked_contamination", "unstaged tracked divergence exists after reconstruction");
}

export function requireUniqueMergeBaseOutput(stdout) {
  const candidates = String(stdout).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  if (candidates.length !== 1) fail("merge_base_not_unique", "exactly one Git merge base is required");
  return fullObjectId(candidates[0], "merge base");
}

async function requireBuildArtifacts(repositoryRoot) {
  for (const path of REQUIRED_RUNTIME_FILES) {
    try {
      await access(resolve(repositoryRoot, "dist", path));
    } catch {
      fail("head_build_unavailable", "exact head-built self-verification runtime is unavailable");
    }
  }
}

function codeUnitCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assetDigest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function requiredFileAsset(worktreeRoot, relativePath) {
  try {
    const bytes = await readFile(resolve(worktreeRoot, relativePath));
    return `file\0${relativePath}\0${assetDigest(bytes)}`;
  } catch {
    fail("runtime_provenance_unavailable", `required runtime asset is unavailable: ${relativePath}`);
  }
}

async function collectRuntimeTreeAssets(worktreeRoot, relativeRoot, canonicalRoot) {
  const directory = resolve(worktreeRoot, relativeRoot);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    fail("runtime_provenance_unavailable", `runtime asset tree cannot be read: ${relativeRoot}`);
  }

  const assets = [];
  for (const entry of entries.sort((left, right) => codeUnitCompare(left.name, right.name))) {
    const childRelative = `${relativeRoot}/${entry.name}`;
    if (entry.isDirectory()) {
      assets.push(...await collectRuntimeTreeAssets(worktreeRoot, childRelative, canonicalRoot));
    } else if (entry.isFile()) {
      assets.push(await requiredFileAsset(worktreeRoot, childRelative));
    } else if (entry.isSymbolicLink()) {
      let target;
      try { target = await readlink(resolve(worktreeRoot, childRelative)); }
      catch { fail("runtime_provenance_unavailable", `runtime symlink cannot be read: ${childRelative}`); }

      let resolvedTarget;
      try { resolvedTarget = await realpath(resolve(worktreeRoot, childRelative)); }
      catch { fail("runtime_provenance_unavailable", `runtime symlink target cannot be resolved: ${childRelative}`); }
      if (!isInside(canonicalRoot, resolvedTarget)) {
        fail("runtime_provenance_unavailable", `runtime symlink resolves outside the private exact-head worktree: ${childRelative}`);
      }

      let targetBytes;
      try { targetBytes = await readFile(resolvedTarget); }
      catch { fail("runtime_provenance_unavailable", `runtime symlink target must be a readable file: ${childRelative}`); }
      const resolvedRelative = relative(canonicalRoot, resolvedTarget).split(sep).join("/");
      assets.push(`symlink\0${childRelative}\0${assetDigest(Buffer.from(target, "utf8"))}\0${resolvedRelative}\0${assetDigest(targetBytes)}`);
    } else {
      fail("runtime_provenance_unavailable", `unsupported runtime asset type: ${childRelative}`);
    }
  }
  return assets;
}

async function runtimeManifest(worktreeRoot) {
  const canonicalRoot = await realpath(worktreeRoot);
  const assets = [];
  for (const relativePath of REQUIRED_RUNTIME_ROOT_FILES) {
    assets.push(await requiredFileAsset(worktreeRoot, relativePath));
  }
  const distAssets = await collectRuntimeTreeAssets(worktreeRoot, "dist", canonicalRoot);
  if (distAssets.length === 0) fail("runtime_provenance_unavailable", "verified runtime contains no dist assets");
  assets.push(...distAssets);
  assets.push(...await collectRuntimeTreeAssets(worktreeRoot, "node_modules", canonicalRoot));
  assets.sort(codeUnitCompare);
  return Object.freeze({
    assets: Object.freeze([...assets]),
    digest: createHash("sha256").update(assets.join("\n")).digest("hex"),
  });
}

async function requireRuntimeManifest(prepared) {
  const actual = await runtimeManifest(prepared.repositoryRoot);
  if (actual.digest !== prepared.manifest.digest || actual.assets.join("\n") !== prepared.manifest.assets.join("\n")) {
    fail("runtime_provenance_mismatch", "verified exact-head runtime assets changed after qualification");
  }
}

export async function verifyExactHeadRuntimeManifest(prepared) {
  await requireRuntimeManifest(prepared);
}

function npmInvocation(args) {
  if (process.platform !== "win32") return { file: "npm", args };
  const npmCliPath = resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  return { file: process.execPath, args: [npmCliPath, ...args] };
}

export async function prepareExactHeadRuntime(repositoryRoot, headSha, { requireExistingHeadBuild = true } = {}) {
  const root = resolve(repositoryRoot);
  const H = fullObjectId(headSha, "head");
  await requireGitObject(root, H, "commit");
  const HT = fullObjectId(await gitText(root, ["rev-parse", "--verify", `${H}^{tree}`]), "head tree");
  await requireCleanHeadState(root, H, HT);
  if (requireExistingHeadBuild) await requireBuildArtifacts(root);

  const worktreeRoot = await mkdtemp(join(tmpdir(), "ascout-self-verify-head-"));
  let registered = false;
  try {
    await rm(worktreeRoot, { recursive: true, force: true });
    await git(root, ["worktree", "add", "--detach", worktreeRoot, H]);
    registered = true;
    await requireCleanHeadState(worktreeRoot, H, HT);

    const installCommand = npmInvocation(["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--offline"]);
    const install = await runProcess(installCommand.file, installCommand.args, { cwd: worktreeRoot });
    await requireReliableProcess(install, "runtime_provenance_install_failed", "isolated exact-lockfile npm ci");

    const buildCommand = npmInvocation(["run", "build"]);
    const build = await runProcess(buildCommand.file, buildCommand.args, { cwd: worktreeRoot });
    await requireReliableProcess(build, "runtime_provenance_compile_failed", "isolated exact-head build");

    await requireCleanHeadState(worktreeRoot, H, HT);
    await requireBuildArtifacts(worktreeRoot);

    const runtimeRoot = resolve(worktreeRoot, "dist");
    const manifest = await runtimeManifest(worktreeRoot);
    return Object.freeze({ repositoryRoot: worktreeRoot, runtimeRoot, headSha: H, headTreeSha: HT, manifest });
  } catch (error) {
    if (registered) {
      try { await git(root, ["worktree", "remove", "--force", worktreeRoot]); } catch {}
    }
    await rm(worktreeRoot, { recursive: true, force: true });
    throw error;
  }
}

export async function releaseExactHeadRuntime(repositoryRoot, prepared) {
  const root = resolve(repositoryRoot);
  try {
    await git(root, ["worktree", "remove", "--force", prepared.repositoryRoot]);
  } catch {
    fail("runtime_cleanup_failed", "verified exact-head runtime worktree could not be removed cleanly");
  }
  await rm(prepared.repositoryRoot, { recursive: true, force: true });
}

export async function reconstructSelfVerificationSubject({ repositoryRoot, eventBaseSha, headSha }) {
  const root = resolve(repositoryRoot);
  const B = fullObjectId(eventBaseSha, "event base tip");
  const H = fullObjectId(headSha, "head");

  await requireGitObject(root, H, "commit");
  const HT = fullObjectId(await gitText(root, ["rev-parse", "--verify", `${H}^{tree}`]), "head tree");
  await requireCleanHeadState(root, H, HT);

  await requireGitObject(root, B, "commit");
  const mergeBases = (await git(root, ["merge-base", "--all", B, H], [0, 1])).stdout.toString("utf8");
  const M = requireUniqueMergeBaseOutput(mergeBases);
  await requireGitObject(root, M, "commit");

  await git(root, ["reset", "--soft", M]);

  const reconstructedHead = await gitText(root, ["rev-parse", "--verify", "HEAD^{commit}"]);
  if (reconstructedHead !== M) fail("reconstruction_head_mismatch", "reconstructed subject HEAD does not equal the unique merge base");

  const reconstructedTree = await gitText(root, ["write-tree"]);
  if (reconstructedTree !== HT) fail("reconstruction_tree_mismatch", "reconstructed subject index tree does not equal the exact target head tree");

  await requireNoUnstagedTracked(root);
  await requireNoNonignoredUntracked(root);

  return Object.freeze({ eventBaseSha: B, headSha: H, mergeBaseSha: M, headTreeSha: HT });
}

async function loadCanonicalRuntime(prepared, subjectRoot) {
  await requireRuntimeManifest(prepared);
  const checkModule = await import(pathToFileURL(resolve(prepared.runtimeRoot, "check.js")).href);
  const jsonModule = await import(pathToFileURL(resolve(prepared.runtimeRoot, "receipt/json.js")).href);
  const modelModule = await import(pathToFileURL(resolve(prepared.runtimeRoot, "receipt/model.js")).href);

  if (typeof checkModule.composeSourceState !== "function") fail("canonical_runtime_unavailable", "canonical composeSourceState export is unavailable");
  if (typeof jsonModule.validateReceiptJsonSchema !== "function") fail("canonical_runtime_unavailable", "canonical JSON Schema validator export is unavailable");
  if (typeof modelModule.validateReceiptSemantics !== "function") fail("canonical_runtime_unavailable", "canonical semantic validator export is unavailable");

  return {
    composeSourceState: checkModule.composeSourceState,
    validateReceiptJsonSchema: jsonModule.validateReceiptJsonSchema,
    validateReceiptSemantics: modelModule.validateReceiptSemantics,
    runVerifier: async ({ argv }) => {
      await requireRuntimeManifest(prepared);
      return await runProcess(process.execPath, argv, { cwd: subjectRoot });
    },
  };
}

function sourceBindingMismatch(receiptSource, expectedSource) {
  for (const field of SOURCE_BINDING_FIELDS) {
    if (receiptSource?.[field] !== expectedSource?.[field]) return field;
  }
  return null;
}

export function validateReceiptCapture({ receiptBytes, processExitCode, expectedSourceState, validators }) {
  if (!Buffer.isBuffer(receiptBytes) || receiptBytes.length === 0) fail("receipt_missing", "self-verification emitted no receipt bytes");
  if (!Number.isInteger(processExitCode)) fail("process_exit_invalid", "self-verification process exit is unavailable");

  let receipt;
  try { receipt = JSON.parse(receiptBytes.toString("utf8")); }
  catch { fail("receipt_json_invalid", "self-verification stdout is not one valid JSON receipt"); }

  const schema = validators.validateReceiptJsonSchema(receipt);
  if (!schema?.valid) fail("receipt_schema_invalid", "self-verification receipt failed the current JSON Schema validator");

  const semantic = validators.validateReceiptSemantics(receipt);
  if (!semantic?.valid) fail("receipt_semantic_invalid", "self-verification receipt failed the current semantic validator");

  const receiptExit = receipt?.summary?.exit_code;
  if (!Number.isInteger(receiptExit) || processExitCode !== receiptExit) {
    fail("receipt_exit_mismatch", "process exit does not equal receipt summary exit");
  }

  const mismatchedField = sourceBindingMismatch(receipt?.source?.start, expectedSourceState);
  if (mismatchedField !== null) {
    fail("receipt_source_mismatch", `receipt source start does not match the canonical pre-launch source snapshot (${mismatchedField})`);
  }

  if (receiptExit === 2) fail("exit_2_integrity_failure", "exit 2 is always self-verification harness-integrity failure");
  if (!ALLOWED_RECEIPT_EXITS.has(receiptExit)) fail("receipt_exit_not_retainable", "receipt exit is not retainable shadow evidence");
  return Object.freeze({ receipt, receiptExit });
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function buildQualificationEnvelope({ identities, receiptExit, receiptSha256 }) {
  if (!SHA256.test(receiptSha256)) fail("receipt_digest_invalid", "receipt SHA-256 is invalid");
  return Object.freeze({
    schema_version: 1,
    classification: "SHADOW_NON_GATING",
    verifier_head_sha: identities.headSha,
    verifier_head_tree_sha: identities.headTreeSha,
    event_base_tip_sha: identities.eventBaseSha,
    subject_merge_base_sha: identities.mergeBaseSha,
    subject_target_head_sha: identities.headSha,
    subject_target_tree_sha: identities.headTreeSha,
    receipt_exit_code: receiptExit,
    receipt_sha256: receiptSha256,
    receipt_file: RECEIPT_FILE,
  });
}

function mergeEvidenceIo(testEvidenceIo) {
  return Object.freeze({ ...DEFAULT_EVIDENCE_IO, ...(testEvidenceIo ?? {}) });
}

async function requireAbsentOutputTarget(path, evidenceIo) {
  try {
    await evidenceIo.lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    fail("evidence_output_unavailable", "self-verification evidence output target cannot be inspected safely");
  }
  fail("evidence_output_exists", "self-verification evidence output target must not already exist");
}

async function prepareOutputTarget(repositoryRoot, outputDir, evidenceIo) {
  const repositoryReal = await evidenceIo.realpath(resolve(repositoryRoot));
  const requested = resolve(outputDir);
  const requestedParent = dirname(requested);
  const finalName = basename(requested);
  if (!finalName || requested === requestedParent) fail("evidence_output_invalid", "self-verification evidence output must name a new child directory");

  let canonicalParent;
  try { canonicalParent = await evidenceIo.realpath(requestedParent); }
  catch { fail("evidence_output_unavailable", "self-verification evidence output parent must already exist"); }
  if (isInside(repositoryReal, canonicalParent)) {
    fail("output_inside_repository", "self-verification evidence output parent must be outside repository source identity");
  }
  const parentIdentity = await captureDirectoryIdentity(
    canonicalParent,
    evidenceIo,
    "evidence_output_unavailable",
    "self-verification evidence output parent identity cannot be bound safely",
  );

  const finalDir = join(canonicalParent, finalName);
  await requireAbsentOutputTarget(finalDir, evidenceIo);
  return Object.freeze({ repositoryReal, canonicalParent, parentIdentity, finalName, finalDir });
}

async function cleanupEvidencePath(path, evidenceIo) {
  if (!path) return;
  try { await evidenceIo.rm(path, { recursive: true, force: true }); }
  catch { fail("evidence_cleanup_failed", "self-verification evidence staging could not be removed cleanly"); }
}

async function requirePrivateStageIdentity(stageReal, stageRootReal, repositoryReal, evidenceIo) {
  let current;
  try { current = await evidenceIo.realpath(stageReal); }
  catch { fail("evidence_output_changed", "private evidence staging changed during publication"); }
  if (current !== stageReal || !isInside(stageRootReal, current) || isInside(repositoryReal, current)) {
    fail("evidence_output_changed", "private evidence staging changed during publication");
  }
}

function sameFilesystemIdentity(expected, actual) {
  return expected?.dev === actual?.dev && expected?.ino === actual?.ino;
}

async function captureDirectoryIdentity(path, evidenceIo, code, message) {
  let identity;
  try { identity = await evidenceIo.lstat(path, { bigint: true }); }
  catch { fail(code, message); }
  if (!identity.isDirectory() || identity.isSymbolicLink()) fail(code, message);
  return identity;
}

async function requireDirectoryIdentity(path, expectedIdentity, evidenceIo, code, message) {
  const actual = await captureDirectoryIdentity(path, evidenceIo, code, message);
  if (!sameFilesystemIdentity(expectedIdentity, actual)) fail(code, message);
  return actual;
}

async function captureFileIdentity(path, evidenceIo, code, message) {
  let identity;
  try { identity = await evidenceIo.lstat(path, { bigint: true }); }
  catch { fail(code, message); }
  if (!identity.isFile() || identity.isSymbolicLink()) fail(code, message);
  return identity;
}

async function requireFileIdentity(path, expectedIdentity, evidenceIo, code, message) {
  const actual = await captureFileIdentity(path, evidenceIo, code, message);
  if (!sameFilesystemIdentity(expectedIdentity, actual)) fail(code, message);
  return actual;
}

async function requireHandleIdentity(handle, expectedIdentity, code, message) {
  let actual;
  try { actual = await handle.stat({ bigint: true }); }
  catch { fail(code, message); }
  if (!actual.isFile() || !sameFilesystemIdentity(expectedIdentity, actual)) fail(code, message);
  return actual;
}

async function requireOutputParentIdentity(outputTarget, evidenceIo, message) {
  await requireDirectoryIdentity(
    outputTarget.canonicalParent,
    outputTarget.parentIdentity,
    evidenceIo,
    "evidence_output_changed",
    message,
  );
  let parentReal;
  try { parentReal = await evidenceIo.realpath(outputTarget.canonicalParent); }
  catch { fail("evidence_output_changed", message); }
  if (parentReal !== outputTarget.canonicalParent || isInside(outputTarget.repositoryReal, parentReal)) {
    fail("evidence_output_changed", message);
  }
  await requireDirectoryIdentity(
    outputTarget.canonicalParent,
    outputTarget.parentIdentity,
    evidenceIo,
    "evidence_output_changed",
    message,
  );
  return parentReal;
}

function publicationClosePromise(child) {
  let spawnError = null;
  child.once("error", (error) => { spawnError = error; });
  return new Promise((resolvePromise) => {
    child.once("close", (exitCode, signal) => resolvePromise({ exitCode, signal, spawnError }));
  });
}

async function waitForPublicationMarker(child, closePromise, stdoutState, marker) {
  return await new Promise((resolvePromise) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout?.off("data", onData);
      resolvePromise(value);
    };
    const onData = () => {
      if (stdoutState.value.includes(marker)) finish({ kind: "marker" });
    };
    const timer = setTimeout(() => finish({ kind: "timeout" }), BOUND_PARENT_PUBLISH_TIMEOUT_MS);
    child.stdout?.on("data", onData);
    onData();
    closePromise.then((status) => finish({ kind: "closed", status }));
  });
}

async function waitForPublicationClose(child, closePromise) {
  return await new Promise((resolvePromise) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise(value);
    };
    const timer = setTimeout(() => finish(null), BOUND_PARENT_PUBLISH_TIMEOUT_MS);
    closePromise.then(finish);
  }).then(async (status) => {
    if (status !== null) return status;
    try { child.kill("SIGKILL"); } catch {}
    try { await closePromise; } catch {}
    return null;
  });
}

async function beginBoundParentPublication(stageReal, stageIdentity, outputTarget, evidenceIo) {
  const publicationMessage = "self-verification evidence output parent changed during atomic publication";
  await requireOutputParentIdentity(outputTarget, evidenceIo, publicationMessage);
  if (typeof evidenceIo.beforeBoundParentPublish === "function") {
    await evidenceIo.beforeBoundParentPublish(outputTarget);
  }

  let child;
  try {
    child = spawn(process.execPath, [
      "--input-type=commonjs",
      "-e",
      BOUND_PARENT_PUBLISHER_SOURCE,
      "--",
      stageReal,
      outputTarget.finalName,
      outputTarget.canonicalParent,
      String(outputTarget.parentIdentity.dev),
      String(outputTarget.parentIdentity.ino),
      String(stageIdentity.dev),
      String(stageIdentity.ino),
    ], {
      cwd: outputTarget.canonicalParent,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    fail("evidence_output_changed", publicationMessage);
  }

  const stdoutState = { value: "" };
  const stderrState = { value: "" };
  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk) => {
    if (stdoutState.value.length < 8192) stdoutState.value += String(chunk).slice(0, 8192 - stdoutState.value.length);
  });
  child.stderr?.on("data", (chunk) => {
    if (stderrState.value.length < 8192) stderrState.value += String(chunk).slice(0, 8192 - stderrState.value.length);
  });

  const closePromise = publicationClosePromise(child);
  const ready = await waitForPublicationMarker(child, closePromise, stdoutState, "READY\n");
  if (ready.kind !== "marker") {
    try { child.kill("SIGKILL"); } catch {}
    try { await closePromise; } catch {}
    fail("evidence_output_changed", publicationMessage);
  }

  let state = "ready";

  const commit = async () => {
    if (state !== "ready") fail("evidence_cleanup_failed", "bound evidence publication commit state is invalid");
    try { child.stdin?.write("COMMIT\n"); }
    catch { state = "failed"; fail("evidence_cleanup_failed", "bound evidence publication could not enter commit verification safely"); }
    const commitReady = await waitForPublicationMarker(child, closePromise, stdoutState, "COMMIT_READY\n");
    if (commitReady.kind === "marker") {
      state = "commit_ready";
      return;
    }
    try { child.kill("SIGKILL"); } catch {}
    try { await closePromise; } catch {}
    state = "failed";
    fail("evidence_cleanup_failed", "bound evidence publication commit verification did not complete safely");
  };

  const confirm = async () => {
    if (state !== "commit_ready") fail("evidence_cleanup_failed", "bound evidence publication confirmation state is invalid");
    try { child.stdin?.end("CONFIRM\n"); }
    catch { state = "failed"; fail("evidence_cleanup_failed", "bound evidence publication could not be confirmed safely"); }
    const status = await waitForPublicationClose(child, closePromise);
    const rolledBack = stdoutState.value.includes("ROLLED_BACK\n");
    const committed = stdoutState.value.includes("COMMITTED\n");
    if (status?.exitCode === 0 && committed && !rolledBack) {
      state = "committed";
      return;
    }
    if (rolledBack) state = "rolled_back";
    else state = "failed";
    fail(
      state === "failed" ? "evidence_cleanup_failed" : "evidence_output_changed",
      state === "failed"
        ? "bound evidence publication could not be confirmed safely"
        : "self-verification evidence output changed before publication confirmation",
    );
  };

  const rollback = async () => {
    if (state === "rolled_back") return;
    if (state === "committed" || state === "failed") {
      fail("evidence_cleanup_failed", "bound evidence publication cannot be rolled back safely");
    }
    try { child.stdin?.end("ROLLBACK\n"); }
    catch { state = "failed"; fail("evidence_cleanup_failed", "bound evidence publication rollback command could not be sent safely"); }
    const status = await waitForPublicationClose(child, closePromise);
    const rolledBack = stdoutState.value.includes("ROLLED_BACK\n");
    if (status?.exitCode === 0 && rolledBack) {
      state = "rolled_back";
      return;
    }
    state = "failed";
    fail("evidence_cleanup_failed", "bound evidence publication could not be rolled back safely");
  };

  return Object.freeze({ commit, confirm, rollback });
}

async function requirePublishedEvidenceIdentity(outputTarget, expectedIdentity, evidenceIo) {
  const message = "published evidence identity changed after atomic publication";
  await requireOutputParentIdentity(outputTarget, evidenceIo, message);
  await requireDirectoryIdentity(outputTarget.finalDir, expectedIdentity, evidenceIo, "evidence_output_changed", message);
  let publishedReal;
  try { publishedReal = await evidenceIo.realpath(outputTarget.finalDir); }
  catch { fail("evidence_output_changed", message); }
  if (
    publishedReal !== outputTarget.finalDir ||
    isInside(outputTarget.repositoryReal, publishedReal) ||
    !isInside(outputTarget.canonicalParent, publishedReal)
  ) fail("evidence_output_changed", message);
  await requireDirectoryIdentity(outputTarget.finalDir, expectedIdentity, evidenceIo, "evidence_output_changed", message);
  await requireOutputParentIdentity(outputTarget, evidenceIo, message);
  return publishedReal;
}

async function openPublishedFile(path, evidenceIo) {
  try { return await evidenceIo.open(path, "r"); }
  catch { fail("evidence_output_changed", "published evidence file identity changed after atomic publication"); }
}

async function readExactHandle(handle, expectedLength, code, message) {
  const bytes = Buffer.alloc(expectedLength);
  let offset = 0;
  while (offset < expectedLength) {
    const result = await handle.read(bytes, offset, expectedLength - offset, offset);
    if (result.bytesRead === 0) break;
    offset += result.bytesRead;
  }
  const extra = Buffer.alloc(1);
  const tail = await handle.read(extra, 0, 1, expectedLength);
  if (offset !== expectedLength || tail.bytesRead !== 0) fail(code, message);
  return bytes;
}

async function readExactReceiptHandle(handle, expectedLength) {
  return await readExactHandle(
    handle,
    expectedLength,
    "receipt_digest_mismatch",
    "receipt byte length does not match qualified receipt bytes",
  );
}

async function publishQualifiedEvidence({ outputTarget, receiptBytes, receiptSha256, envelope }, evidenceIo) {
  let stageRoot = null;
  let stageRootReal = null;
  let stageReal = null;
  let stageIdentity = null;
  let receiptHandle = null;
  let envelopeHandle = null;
  let publicationSession = null;
  let published = false;
  try {
    await requireOutputParentIdentity(
      outputTarget,
      evidenceIo,
      "self-verification evidence output parent changed after qualification",
    );

    stageRoot = await evidenceIo.mkdtemp(join(tmpdir(), "ascout-self-verify-evidence-"));
    stageRootReal = await evidenceIo.realpath(stageRoot);
    if (isInside(outputTarget.repositoryReal, stageRootReal)) {
      fail("evidence_output_changed", "private evidence staging root resolved inside repository source identity");
    }

    const stageDir = join(stageRootReal, "bundle");
    await evidenceIo.mkdir(stageDir, { mode: 0o700 });
    stageReal = await evidenceIo.realpath(stageDir);
    if (stageReal !== stageDir || !isInside(stageRootReal, stageReal) || isInside(outputTarget.repositoryReal, stageReal)) {
      fail("evidence_output_changed", "private evidence staging resolved outside the harness-owned staging root");
    }
    stageIdentity = await captureDirectoryIdentity(
      stageReal,
      evidenceIo,
      "evidence_output_changed",
      "private evidence staging identity could not be bound",
    );

    const stagedReceiptPath = join(stageReal, RECEIPT_FILE);
    const stagedEnvelopePath = join(stageReal, ENVELOPE_FILE);
    const envelopeBytes = Buffer.from(`${JSON.stringify(envelope, null, 2)}\n`, "utf8");
    const envelopeSha256 = sha256(envelopeBytes);
    receiptHandle = await evidenceIo.open(stagedReceiptPath, "wx+", 0o600);
    envelopeHandle = await evidenceIo.open(stagedEnvelopePath, "wx+", 0o600);
    await requirePrivateStageIdentity(stageReal, stageRootReal, outputTarget.repositoryReal, evidenceIo);
    await requireDirectoryIdentity(stageReal, stageIdentity, evidenceIo, "evidence_output_changed", "private evidence staging identity changed during publication");

    await receiptHandle.writeFile(receiptBytes);
    await receiptHandle.sync();
    await requirePrivateStageIdentity(stageReal, stageRootReal, outputTarget.repositoryReal, evidenceIo);
    await requireDirectoryIdentity(stageReal, stageIdentity, evidenceIo, "evidence_output_changed", "private evidence staging identity changed during publication");
    const retainedBytes = await readExactReceiptHandle(receiptHandle, receiptBytes.length);
    if (sha256(retainedBytes) !== receiptSha256) {
      fail("receipt_digest_mismatch", "staged receipt bytes do not match the qualified receipt digest");
    }

    await envelopeHandle.writeFile(envelopeBytes);
    await envelopeHandle.sync();
    await requirePrivateStageIdentity(stageReal, stageRootReal, outputTarget.repositoryReal, evidenceIo);
    await requireDirectoryIdentity(stageReal, stageIdentity, evidenceIo, "evidence_output_changed", "private evidence staging identity changed during publication");

    const stagedNames = (await evidenceIo.readdir(stageReal)).sort(codeUnitCompare);
    if (stagedNames.length !== 2 || stagedNames[0] !== ENVELOPE_FILE || stagedNames[1] !== RECEIPT_FILE) {
      fail("evidence_output_unexpected", "private evidence staging contains unexpected material");
    }
    await requirePrivateStageIdentity(stageReal, stageRootReal, outputTarget.repositoryReal, evidenceIo);
    await requireDirectoryIdentity(stageReal, stageIdentity, evidenceIo, "evidence_output_changed", "private evidence staging identity changed before publication");

    const receiptIdentity = await captureFileIdentity(
      stagedReceiptPath,
      evidenceIo,
      "evidence_output_changed",
      "private receipt identity could not be bound before publication",
    );
    const envelopeIdentity = await captureFileIdentity(
      stagedEnvelopePath,
      evidenceIo,
      "evidence_output_changed",
      "private envelope identity could not be bound before publication",
    );
    await requireHandleIdentity(receiptHandle, receiptIdentity, "evidence_output_changed", "private receipt identity changed before publication");
    await requireHandleIdentity(envelopeHandle, envelopeIdentity, "evidence_output_changed", "private envelope identity changed before publication");

    await receiptHandle.close();
    receiptHandle = null;
    await envelopeHandle.close();
    envelopeHandle = null;

    await requirePrivateStageIdentity(stageReal, stageRootReal, outputTarget.repositoryReal, evidenceIo);
    await requireDirectoryIdentity(stageReal, stageIdentity, evidenceIo, "evidence_output_changed", "private evidence staging identity changed before publication");
    await requireFileIdentity(stagedReceiptPath, receiptIdentity, evidenceIo, "evidence_output_changed", "private receipt identity changed before publication");
    await requireFileIdentity(stagedEnvelopePath, envelopeIdentity, evidenceIo, "evidence_output_changed", "private envelope identity changed before publication");

    await requireOutputParentIdentity(
      outputTarget,
      evidenceIo,
      "self-verification evidence output parent changed before publication",
    );
    await requireAbsentOutputTarget(outputTarget.finalDir, evidenceIo);
    await requireDirectoryIdentity(stageReal, stageIdentity, evidenceIo, "evidence_output_changed", "private evidence staging identity changed before publication");
    await requireFileIdentity(stagedReceiptPath, receiptIdentity, evidenceIo, "evidence_output_changed", "private receipt identity changed before publication");
    await requireFileIdentity(stagedEnvelopePath, envelopeIdentity, evidenceIo, "evidence_output_changed", "private envelope identity changed before publication");

    publicationSession = await beginBoundParentPublication(stageReal, stageIdentity, outputTarget, evidenceIo);
    stageReal = null;
    published = true;

    let publishedReal = await requirePublishedEvidenceIdentity(outputTarget, stageIdentity, evidenceIo);
    const publishedReceiptPath = join(publishedReal, RECEIPT_FILE);
    receiptHandle = await openPublishedFile(publishedReceiptPath, evidenceIo);
    await requireHandleIdentity(receiptHandle, receiptIdentity, "evidence_output_changed", "published receipt identity changed after atomic publication");
    const publishedReceipt = await readExactReceiptHandle(receiptHandle, receiptBytes.length);
    if (sha256(publishedReceipt) !== receiptSha256) {
      fail("receipt_digest_mismatch", "published receipt bytes do not match the qualified receipt digest");
    }
    await requireHandleIdentity(receiptHandle, receiptIdentity, "evidence_output_changed", "published receipt identity changed while validating bytes");
    await receiptHandle.close();
    receiptHandle = null;
    publishedReal = await requirePublishedEvidenceIdentity(outputTarget, stageIdentity, evidenceIo);
    await requireFileIdentity(publishedReceiptPath, receiptIdentity, evidenceIo, "evidence_output_changed", "published receipt identity changed after validation");

    const publishedEnvelopePath = join(publishedReal, ENVELOPE_FILE);
    envelopeHandle = await openPublishedFile(publishedEnvelopePath, evidenceIo);
    await requireHandleIdentity(envelopeHandle, envelopeIdentity, "evidence_output_changed", "published envelope identity changed after atomic publication");
    const publishedEnvelope = await readExactHandle(
      envelopeHandle,
      envelopeBytes.length,
      "evidence_output_unexpected",
      "published envelope byte length changed after atomic publication",
    );
    if (sha256(publishedEnvelope) !== envelopeSha256) {
      fail("evidence_output_unexpected", "published envelope bytes changed after atomic publication");
    }
    await requireHandleIdentity(envelopeHandle, envelopeIdentity, "evidence_output_changed", "published envelope identity changed while validating bytes");
    await envelopeHandle.close();
    envelopeHandle = null;
    publishedReal = await requirePublishedEvidenceIdentity(outputTarget, stageIdentity, evidenceIo);
    await requireFileIdentity(publishedEnvelopePath, envelopeIdentity, evidenceIo, "evidence_output_changed", "published envelope identity changed after validation");

    await cleanupEvidencePath(stageRootReal, evidenceIo);
    stageRoot = null;
    stageRootReal = null;

    const finalReal = await requirePublishedEvidenceIdentity(outputTarget, stageIdentity, evidenceIo);
    await requireFileIdentity(join(finalReal, RECEIPT_FILE), receiptIdentity, evidenceIo, "evidence_output_changed", "published receipt identity changed before return");
    await requireFileIdentity(join(finalReal, ENVELOPE_FILE), envelopeIdentity, evidenceIo, "evidence_output_changed", "published envelope identity changed before return");
    if (finalReal !== publishedReal) fail("evidence_output_changed", "published evidence canonical path changed before return");
    await requireOutputParentIdentity(outputTarget, evidenceIo, "self-verification evidence output parent changed before publication commit");

    await publicationSession.commit();
    if (typeof evidenceIo.afterBoundParentCommit === "function") {
      await evidenceIo.afterBoundParentCommit(outputTarget);
    }

    const postCommitReal = await requirePublishedEvidenceIdentity(outputTarget, stageIdentity, evidenceIo);
    await requireFileIdentity(join(postCommitReal, RECEIPT_FILE), receiptIdentity, evidenceIo, "evidence_output_changed", "published receipt identity changed after publication commit checks");
    await requireFileIdentity(join(postCommitReal, ENVELOPE_FILE), envelopeIdentity, evidenceIo, "evidence_output_changed", "published envelope identity changed after publication commit checks");
    if (postCommitReal !== finalReal) fail("evidence_output_changed", "published evidence canonical path changed after publication commit checks");

    await publicationSession.confirm();
    publicationSession = null;
    published = false;

    return Object.freeze({
      receiptPath: join(postCommitReal, RECEIPT_FILE),
      envelopePath: join(postCommitReal, ENVELOPE_FILE),
    });
  } catch (error) {
    try { if (receiptHandle !== null) await receiptHandle.close(); } catch {}
    try { if (envelopeHandle !== null) await envelopeHandle.close(); } catch {}
    if (publicationSession !== null) {
      try {
        await publicationSession.rollback();
        published = false;
      } catch {
        fail("evidence_cleanup_failed", "bound evidence publication could not be rolled back safely");
      }
    }
    if (published) await cleanupEvidencePath(outputTarget.finalDir, evidenceIo);
    await cleanupEvidencePath(stageRootReal ?? stageRoot, evidenceIo);
    if (error instanceof SelfVerificationIntegrityError) throw error;
    fail("evidence_output_failed", "self-verification evidence could not be published atomically");
  }
}

function validateRuntimeAdapter(runtime) {
  if (
    typeof runtime.composeSourceState !== "function" ||
    typeof runtime.validateReceiptJsonSchema !== "function" ||
    typeof runtime.validateReceiptSemantics !== "function" ||
    typeof runtime.runVerifier !== "function"
  ) fail("test_runtime_invalid", "self-verification runtime adapter is incomplete");
}

export async function runSelfVerification({
  repositoryRoot = process.cwd(),
  eventBaseSha,
  headSha,
  outputDir,
  testRuntime = null,
  testEvidenceIo = null,
}) {
  const root = resolve(repositoryRoot);
  const evidenceIo = mergeEvidenceIo(testEvidenceIo);
  const outputTarget = await prepareOutputTarget(root, outputDir, evidenceIo);
  let prepared = null;
  let qualified = null;

  try {
    if (testRuntime === null) prepared = await prepareExactHeadRuntime(root, headSha, { requireExistingHeadBuild: true });

    const identities = await reconstructSelfVerificationSubject({ repositoryRoot: root, eventBaseSha, headSha });
    const runtime = testRuntime ?? await loadCanonicalRuntime(prepared, root);
    validateRuntimeAdapter(runtime);

    const expectedSourceState = runtime.composeSourceState(root);
    if (expectedSourceState?.head_sha !== identities.mergeBaseSha) {
      fail("canonical_source_head_mismatch", "canonical pre-launch source snapshot does not report the reconstructed merge-base HEAD");
    }

    const verifierEntry = testRuntime === null
      ? resolve(prepared.runtimeRoot, "cli.js")
      : resolve(root, "dist/cli.js");
    const verifierArgv = [verifierEntry, "check", "--format", "json"];
    if (verifierArgv.includes("--allow-changed-command-surface")) {
      fail("automatic_admission_forbidden", "changed-command-surface admission is forbidden in self-verification automation");
    }

    const execution = await runtime.runVerifier({ repositoryRoot: root, argv: verifierArgv });
    if (execution?.outcome !== "exited") fail("verifier_execution_failed", "self-verification verifier did not exit normally");
    if (execution.stdoutTruncated || execution.stderrTruncated) fail("verifier_output_truncated", "self-verification verifier output exceeded the bounded capture limit");

    const receiptBytes = Buffer.isBuffer(execution.stdout) ? execution.stdout : Buffer.from(execution.stdout ?? "");
    const validated = validateReceiptCapture({ receiptBytes, processExitCode: execution.exitCode, expectedSourceState, validators: runtime });

    if (prepared !== null) await requireRuntimeManifest(prepared);

    const receiptSha256 = sha256(receiptBytes);
    const envelope = buildQualificationEnvelope({ identities, receiptExit: validated.receiptExit, receiptSha256 });
    qualified = { identities, expectedSourceState, receiptExit: validated.receiptExit, receiptSha256, receiptBytes, envelope };
  } finally {
    if (prepared !== null) await releaseExactHeadRuntime(root, prepared);
  }

  if (qualified === null) fail("unexpected_failure", "self-verification qualification did not produce an in-memory result");

  const published = await publishQualifiedEvidence({
    outputTarget,
    receiptBytes: qualified.receiptBytes,
    receiptSha256: qualified.receiptSha256,
    envelope: qualified.envelope,
  }, evidenceIo);

  return Object.freeze({
    identities: qualified.identities,
    expectedSourceState: qualified.expectedSourceState,
    receiptExit: qualified.receiptExit,
    receiptSha256: qualified.receiptSha256,
    receiptPath: published.receiptPath,
    envelopePath: published.envelopePath,
    envelope: qualified.envelope,
  });
}

function parseArgs(argv) {
  let eventBaseSha = null;
  let headSha = null;
  let outputDir = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      const value = argv[index];
      if (!value) fail("usage", `${arg} requires a value`);
      return value;
    };
    if (arg === "--event-base-sha") eventBaseSha = next();
    else if (arg === "--head-sha") headSha = next();
    else if (arg === "--output-dir") outputDir = next();
    else fail("usage", `unknown argument: ${arg}`);
  }
  if (!eventBaseSha || !headSha || !outputDir) fail("usage", "--event-base-sha, --head-sha, and --output-dir are required");
  return { eventBaseSha, headSha, outputDir };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await runSelfVerification({ repositoryRoot: process.cwd(), eventBaseSha: args.eventBaseSha, headSha: args.headSha, outputDir: args.outputDir });
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    const code = error instanceof SelfVerificationIntegrityError ? error.code : "unexpected_failure";
    process.stderr.write(`self-verify: ${code}\n`);
    process.exitCode = 1;
  });
}
