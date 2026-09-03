import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
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

async function git(repositoryRoot, args, allowedExitCodes = [0]) {
  const result = await runProcess("git", ["-C", repositoryRoot, ...args], { cwd: repositoryRoot });
  if (result.outcome !== "exited" || result.stdoutTruncated || result.stderrTruncated) {
    fail("git_execution_failed", `git ${args[0] ?? "command"} did not complete reliably`);
  }
  if (!allowedExitCodes.includes(result.exitCode)) {
    fail("git_execution_failed", `git ${args[0] ?? "command"} failed with exit ${String(result.exitCode)}`);
  }
  return result;
}

async function gitText(repositoryRoot, args) {
  return (await git(repositoryRoot, args)).stdout.toString("utf8").trim();
}

async function requireGitObject(repositoryRoot, sha, kind = "commit") {
  const result = await git(repositoryRoot, ["cat-file", "-e", `${sha}^{${kind}}`], [0, 1, 128]);
  if (result.exitCode !== 0) fail("git_identity_unavailable", `required Git ${kind} object is unavailable`);
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

async function requireNoNonignoredUntracked(repositoryRoot) {
  const status = await gitText(repositoryRoot, ["status", "--porcelain=v1", "--untracked-files=all", "--ignored=no"]);
  const untracked = status.split(/\r?\n/u).filter((line) => line.startsWith("?? "));
  if (untracked.length > 0) fail("untracked_contamination", "unrelated nonignored untracked material exists in the subject repository");
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
  const paths = [
    "dist/cli.js",
    "dist/check.js",
    "dist/receipt/json.js",
    "dist/receipt/model.js",
  ];
  for (const path of paths) {
    try {
      await access(resolve(repositoryRoot, path));
    } catch {
      fail("head_build_unavailable", "exact head-built self-verification runtime is unavailable");
    }
  }
}

async function collectJavaScriptFiles(root, relativeRoot = "") {
  const directory = resolve(root, relativeRoot);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const childRelative = relativeRoot === "" ? entry.name : `${relativeRoot}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...await collectJavaScriptFiles(root, childRelative));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(childRelative);
    }
  }
  return files;
}

export async function verifyRuntimeProvenance(repositoryRoot) {
  const root = resolve(repositoryRoot);
  await requireBuildArtifacts(root);

  const compilerEntry = resolve(root, "node_modules/typescript/bin/tsc");
  try {
    await access(compilerEntry);
  } catch {
    fail("runtime_provenance_unavailable", "exact lockfile-installed TypeScript compiler is unavailable");
  }

  const proofRoot = await mkdtemp(join(tmpdir(), "ascout-self-verify-runtime-"));
  try {
    const compilation = await runProcess(
      process.execPath,
      [compilerEntry, "-p", resolve(root, "tsconfig.json"), "--outDir", proofRoot],
      { cwd: root },
    );
    if (
      compilation.outcome !== "exited" ||
      compilation.exitCode !== 0 ||
      compilation.stdoutTruncated ||
      compilation.stderrTruncated
    ) {
      fail("runtime_provenance_compile_failed", "isolated exact-head runtime provenance compilation failed");
    }

    const actualRoot = resolve(root, "dist");
    const [actualFiles, proofFiles] = await Promise.all([
      collectJavaScriptFiles(actualRoot),
      collectJavaScriptFiles(proofRoot),
    ]);
    if (actualFiles.length === 0 || actualFiles.join("\n") !== proofFiles.join("\n")) {
      fail("runtime_provenance_mismatch", "runtime JavaScript file set does not match isolated exact-head compilation");
    }

    for (const path of actualFiles) {
      const [actualBytes, proofBytes] = await Promise.all([
        readFile(resolve(actualRoot, path)),
        readFile(resolve(proofRoot, path)),
      ]);
      if (!actualBytes.equals(proofBytes)) {
        fail("runtime_provenance_mismatch", `runtime artifact does not match isolated exact-head compilation (${path})`);
      }
    }
  } finally {
    await rm(proofRoot, { recursive: true, force: true });
  }
}

export async function reconstructSelfVerificationSubject({
  repositoryRoot,
  eventBaseSha,
  headSha,
  requireHeadBuild = true,
}) {
  const root = resolve(repositoryRoot);
  const B = fullObjectId(eventBaseSha, "event base tip");
  const H = fullObjectId(headSha, "head");

  await requireGitObject(root, H, "commit");
  const HT = fullObjectId(await gitText(root, ["rev-parse", "--verify", `${H}^{tree}`]), "head tree");
  await requireCleanHeadState(root, H, HT);

  if (requireHeadBuild) await verifyRuntimeProvenance(root);

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

async function loadCanonicalRuntime(repositoryRoot) {
  const root = resolve(repositoryRoot);
  const checkModule = await import(pathToFileURL(resolve(root, "dist/check.js")).href);
  const jsonModule = await import(pathToFileURL(resolve(root, "dist/receipt/json.js")).href);
  const modelModule = await import(pathToFileURL(resolve(root, "dist/receipt/model.js")).href);

  if (typeof checkModule.composeSourceState !== "function") fail("canonical_runtime_unavailable", "canonical composeSourceState export is unavailable");
  if (typeof jsonModule.validateReceiptJsonSchema !== "function") fail("canonical_runtime_unavailable", "canonical JSON Schema validator export is unavailable");
  if (typeof modelModule.validateReceiptSemantics !== "function") fail("canonical_runtime_unavailable", "canonical semantic validator export is unavailable");

  return {
    composeSourceState: checkModule.composeSourceState,
    validateReceiptJsonSchema: jsonModule.validateReceiptJsonSchema,
    validateReceiptSemantics: modelModule.validateReceiptSemantics,
    runVerifier: async ({ repositoryRoot: cwd, argv }) => await runProcess(process.execPath, argv, { cwd }),
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
  try {
    receipt = JSON.parse(receiptBytes.toString("utf8"));
  } catch {
    fail("receipt_json_invalid", "self-verification stdout is not one valid JSON receipt");
  }

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

async function prepareOutputDirectory(repositoryRoot, outputDir) {
  const root = resolve(repositoryRoot);
  const output = resolve(outputDir);
  if (isInside(root, output)) fail("output_inside_repository", "self-verification evidence output must be outside repository source identity");

  await mkdir(output, { recursive: true });
  const [realRoot, realOutput] = await Promise.all([realpath(root), realpath(output)]);
  if (isInside(realRoot, realOutput)) fail("output_inside_repository", "self-verification evidence output resolves inside repository source identity");
  return realOutput;
}

export async function runSelfVerification({
  repositoryRoot = process.cwd(),
  eventBaseSha,
  headSha,
  outputDir,
  testRuntime = null,
}) {
  const root = resolve(repositoryRoot);
  const output = await prepareOutputDirectory(root, outputDir);

  const identities = await reconstructSelfVerificationSubject({
    repositoryRoot: root,
    eventBaseSha,
    headSha,
    requireHeadBuild: testRuntime === null,
  });

  const runtime = testRuntime ?? await loadCanonicalRuntime(root);
  if (
    typeof runtime.composeSourceState !== "function" ||
    typeof runtime.validateReceiptJsonSchema !== "function" ||
    typeof runtime.validateReceiptSemantics !== "function" ||
    typeof runtime.runVerifier !== "function"
  ) {
    fail("test_runtime_invalid", "self-verification runtime adapter is incomplete");
  }

  const expectedSourceState = runtime.composeSourceState(root);
  if (expectedSourceState?.head_sha !== identities.mergeBaseSha) {
    fail("canonical_source_head_mismatch", "canonical pre-launch source snapshot does not report the reconstructed merge-base HEAD");
  }

  const verifierArgv = [resolve(root, "dist/cli.js"), "check", "--format", "json"];
  if (verifierArgv.includes("--allow-changed-command-surface")) {
    fail("automatic_admission_forbidden", "changed-command-surface admission is forbidden in self-verification automation");
  }

  const execution = await runtime.runVerifier({ repositoryRoot: root, argv: verifierArgv });
  if (execution?.outcome !== "exited") fail("verifier_execution_failed", "self-verification verifier did not exit normally");
  if (execution.stdoutTruncated || execution.stderrTruncated) fail("verifier_output_truncated", "self-verification verifier output exceeded the bounded capture limit");

  const receiptBytes = Buffer.isBuffer(execution.stdout) ? execution.stdout : Buffer.from(execution.stdout ?? "");
  const validated = validateReceiptCapture({
    receiptBytes,
    processExitCode: execution.exitCode,
    expectedSourceState,
    validators: runtime,
  });

  const receiptSha256 = sha256(receiptBytes);
  const envelope = buildQualificationEnvelope({
    identities,
    receiptExit: validated.receiptExit,
    receiptSha256,
  });

  const receiptPath = resolve(output, RECEIPT_FILE);
  const envelopePath = resolve(output, ENVELOPE_FILE);
  await writeFile(receiptPath, receiptBytes, { flag: "wx" });

  const retainedBytes = await readFile(receiptPath);
  if (sha256(retainedBytes) !== receiptSha256) fail("receipt_digest_mismatch", "retained receipt bytes do not match the qualified receipt digest");

  await writeFile(envelopePath, `${JSON.stringify(envelope, null, 2)}\n`, { encoding: "utf8", flag: "wx" });

  return Object.freeze({
    identities,
    expectedSourceState,
    receiptExit: validated.receiptExit,
    receiptSha256,
    receiptPath,
    envelopePath,
    envelope,
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
  if (!eventBaseSha || !headSha || !outputDir) {
    fail("usage", "--event-base-sha, --head-sha, and --output-dir are required");
  }
  return { eventBaseSha, headSha, outputDir };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await runSelfVerification({
    repositoryRoot: process.cwd(),
    eventBaseSha: args.eventBaseSha,
    headSha: args.headSha,
    outputDir: args.outputDir,
  });
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    const code = error instanceof SelfVerificationIntegrityError ? error.code : "unexpected_failure";
    process.stderr.write(`self-verify: ${code}\n`);
    process.exitCode = 1;
  });
}