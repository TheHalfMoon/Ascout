import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, promises as fsPromises, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  SelfVerificationIntegrityError,
  buildQualificationEnvelope,
  prepareExactHeadRuntime,
  reconstructSelfVerificationSubject,
  releaseExactHeadRuntime,
  requireUniqueMergeBaseOutput,
  runSelfVerification,
  validateReceiptCapture,
  verifyExactHeadRuntimeManifest,
} from "../benchmarks/self-verify.mjs";
import { composeSourceState } from "../src/check.js";
import { validateReceiptJsonSchema } from "../src/receipt/json.js";
import {
  decideReceiptExitCode,
  deriveReceiptCompleteness,
  validateReceiptSemantics,
  type ReceiptExitCode,
  type ReceiptV1,
  type SourceStateV1,
  type TaskResultV1,
} from "../src/receipt/model.js";

const temporaryPaths: string[] = [];
const EVIDENCE_FILES = ["self-verification-receipt.json", "self-verification-envelope.json"] as const;
const RECEIPT_SCHEMA_PATH = join("specs", "001-changed-code-verification-receipt", "contracts", "receipt-v1.schema.json");

function temporaryDirectory(prefix: string): string {
  const path = mkdtempSync(join(tmpdir(), prefix));
  temporaryPaths.push(path);
  return path;
}

function temporaryOutputPath(prefix: string): string {
  return join(temporaryDirectory(prefix), "evidence");
}

function git(root: string, args: readonly string[]): string {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function initializeRepository(): string {
  const root = temporaryDirectory("ascout-t107-repo-");
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Ascout T107"]);
  git(root, ["config", "user.email", "t107@example.invalid"]);
  writeFileSync(join(root, ".gitignore"), "dist/\nnode_modules/\ncoverage/\n.ascout/\n", "utf8");
  return root;
}

function commitAll(root: string, message: string): string {
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", message]);
  return git(root, ["rev-parse", "HEAD"]);
}

interface SimpleRepository {
  readonly root: string;
  readonly base: string;
  readonly head: string;
  readonly headTree: string;
}

function createSimpleRepository(): SimpleRepository {
  const root = initializeRepository();
  writeFileSync(join(root, "tracked.txt"), "base\n", "utf8");
  const base = commitAll(root, "base");
  writeFileSync(join(root, "tracked.txt"), "head\n", "utf8");
  const head = commitAll(root, "head");
  return { root, base, head, headTree: git(root, ["rev-parse", `${head}^{tree}`]) };
}

function writeRuntimeFile(root: string, relativePath: string, content: string): void {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function createBuildableFixture({ contaminateTracked = false, createRuntimeSymlink = false } = {}): SimpleRepository {
  const root = initializeRepository();
  writeFileSync(join(root, "tracked.txt"), "base\n", "utf8");
  const base = commitAll(root, "base");
  writeFileSync(join(root, "tracked.txt"), "head\n", "utf8");
  writeFileSync(join(root, "package.json"), JSON.stringify({
    name: "ascout-t107-runtime-fixture",
    version: "1.0.0",
    private: true,
    type: "module",
    scripts: { build: "node build.mjs" },
  }, null, 2) + "\n", "utf8");
  writeFileSync(join(root, "package-lock.json"), JSON.stringify({
    name: "ascout-t107-runtime-fixture",
    version: "1.0.0",
    lockfileVersion: 3,
    requires: true,
    packages: { "": { name: "ascout-t107-runtime-fixture", version: "1.0.0" } },
  }, null, 2) + "\n", "utf8");
  writeRuntimeFile(root, RECEIPT_SCHEMA_PATH, "{\"fixture\":true}\n");
  writeFileSync(join(root, "build.mjs"), [
    'import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";',
    'import { dirname, join } from "node:path";',
    'const files = {',
    '  "cli.js": "export const fixtureCli = 1;\\n",',
    '  "check.js": "export const fixtureCheck = 1;\\n",',
    '  "receipt/json.js": "export const fixtureJson = 1;\\n",',
    '  "receipt/model.js": "export const fixtureModel = 1;\\n",',
    '  "nested/runtime.js": "export const fixtureNested = 1;\\n",',
    '};',
    'for (const [name, value] of Object.entries(files)) {',
    '  const target = join(process.cwd(), "dist", name);',
    '  mkdirSync(dirname(target), { recursive: true });',
    '  writeFileSync(target, value, "utf8");',
    '}',
    ...(createRuntimeSymlink ? [
      'mkdirSync(join(process.cwd(), "node_modules", "linked-runtime"), { recursive: true });',
      'writeFileSync(join(process.cwd(), "node_modules", "linked-runtime", "target.js"), "export const linked = 1;\\n", "utf8");',
      'symlinkSync(join("linked-runtime", "target.js"), join(process.cwd(), "node_modules", "linked-target.js"));',
    ] : []),
    ...(contaminateTracked ? ['writeFileSync(join(process.cwd(), "tracked.txt"), "contaminated\\n", "utf8");'] : []),
  ].join("\n") + "\n", "utf8");
  const head = commitAll(root, "head with exact build contract");
  return { root, base, head, headTree: git(root, ["rev-parse", `${head}^{tree}`]) };
}

function baselineTask(): TaskResultV1 {
  return {
    task_id: "lint-t107",
    task_type: "lint",
    authorized_by: "discovery",
    source_path: null,
    argv: ["eslint", "tracked.txt"],
    argv_redacted: false,
    tool_name: "eslint",
    tool_version: "1.0.0",
    command_surface_changed: false,
    changed_authority_paths: [],
    execution_admission: "normal",
    status: "PASS",
    reason_code: null,
    reason_text: null,
    exit_code: 0,
    started_at: "2026-09-03T17:00:00.000Z",
    finished_at: "2026-09-03T17:00:01.000Z",
    duration_ms: 1000,
    observations: { runs: 1, failures: 0 },
    cache_state: "cold",
    evidence_ids: [],
    artifact_refs: [],
    output_truncated: false,
  };
}

function taskForExit(exitCode: ReceiptExitCode): TaskResultV1 {
  const task = baselineTask();
  if (exitCode === 0 || exitCode === 3) return task;
  if (exitCode === 1) return { ...task, status: "FAIL", exit_code: 1, observations: { runs: 1, failures: 1 } };
  if (exitCode === 2) {
    return {
      ...task,
      status: "ERROR",
      reason_code: "execution_error",
      reason_text: "The fixture intentionally models an internal execution error.",
      exit_code: 2,
      observations: { runs: 0, failures: 0 },
    };
  }
  return {
    ...task,
    argv: [],
    tool_name: null,
    tool_version: null,
    status: "BLOCKED",
    reason_code: "prerequisite_blocked",
    reason_text: "The fixture intentionally models material incompleteness.",
    exit_code: null,
    started_at: null,
    finished_at: null,
    duration_ms: null,
    observations: { runs: 0, failures: 0 },
    cache_state: "not_applicable",
  };
}

function synchronizeSummary(receipt: ReceiptV1): void {
  const counts = { PASS: 0, FAIL: 0, FLAKY: 0, BLOCKED: 0, ERROR: 0, NOT_APPLICABLE: 0, NOT_RUN: 0 };
  for (const task of receipt.tasks) counts[task.status] += 1;
  (receipt.summary as unknown as { task_status_counts: typeof counts }).task_status_counts = counts;
  (receipt.summary as unknown as { completeness: ReceiptV1["summary"]["completeness"] }).completeness = deriveReceiptCompleteness(receipt);
  (receipt.summary as unknown as { exit_code: ReceiptExitCode }).exit_code = decideReceiptExitCode(receipt);
}

function validReceipt(source: SourceStateV1, desiredExit: ReceiptExitCode): ReceiptV1 {
  const task = taskForExit(desiredExit);
  const endSource: SourceStateV1 = desiredExit === 3 ? { ...source, tree_digest: "f".repeat(64) } : { ...source };
  const receipt: ReceiptV1 = {
    schema_version: "1.0",
    run: {
      run_id: "run-t107",
      ascout_version: "0.0.0",
      started_at: "2026-09-03T17:00:00.000Z",
      finished_at: "2026-09-03T17:00:01.000Z",
      config_digest: "d".repeat(64),
    },
    source: { start: { ...source }, end: endSource },
    comparison: {
      kind: "working_tree_vs_head",
      base_ref: source.head_sha,
      includes_staged: true,
      includes_unstaged: true,
      includes_untracked_nonignored: true,
      changed_files: [{
        path: "tracked.txt",
        change_kind: "modified",
        line_semantics: "text",
        changed_new_line_ranges: [[1, 1]],
        is_test_file: false,
        is_snapshot: false,
        is_command_surface: false,
      }],
    },
    selection: {
      mode: "no_test_task",
      initial_scope: { kind: "repository", path: null },
      selected_test_count: null,
      deselected_test_count: null,
      total_test_count: null,
      widened: false,
      widen_triggers: [],
      passes: [],
      limitations: ["T107 receipt fixture has no test task"],
    },
    tasks: [task],
    changed_code: { changed_file_count: 1, changed_text_line_count: 1 },
    exercise: {
      changed_executable_lines: 0,
      exercised_lines: 0,
      not_exercised_lines: 0,
      unresolved_lines: 0,
      changed_files_with_zero_exercised_lines: 0,
      records: [],
    },
    test_changes: [],
    findings: [],
    evidence: [],
    artifacts: [],
    stability: desiredExit === 3 ? "tree_drifted" : "stable",
    summary: {
      task_status_counts: { PASS: 0, FAIL: 0, FLAKY: 0, BLOCKED: 0, ERROR: 0, NOT_APPLICABLE: 0, NOT_RUN: 0 },
      finding_count: 0,
      completeness: "complete",
      exit_code: 0,
    },
  };
  synchronizeSummary(receipt);
  expect(receipt.summary.exit_code).toBe(desiredExit);
  return receipt;
}

function validators() {
  return { validateReceiptJsonSchema, validateReceiptSemantics };
}

function runtimeFor(exitCode: ReceiptExitCode, mutate?: (receipt: ReceiptV1) => void, argvSink?: string[][]) {
  return {
    composeSourceState,
    validateReceiptJsonSchema,
    validateReceiptSemantics,
    runVerifier: async ({ repositoryRoot, argv }: { repositoryRoot: string; argv: string[] }) => {
      argvSink?.push([...argv]);
      const receipt = validReceipt(composeSourceState(repositoryRoot), exitCode);
      mutate?.(receipt);
      return {
        outcome: "exited",
        exitCode,
        signal: null,
        error: null,
        stdout: Buffer.from(JSON.stringify(receipt), "utf8"),
        stderr: Buffer.alloc(0),
        stdoutTruncated: false,
        stderrTruncated: false,
      };
    },
  };
}

function runtimeWithExecution(execution: Record<string, unknown>) {
  return {
    composeSourceState,
    validateReceiptJsonSchema,
    validateReceiptSemantics,
    runVerifier: async () => ({
      outcome: "exited",
      exitCode: 0,
      signal: null,
      error: null,
      stdout: Buffer.alloc(0),
      stderr: Buffer.alloc(0),
      stdoutTruncated: false,
      stderrTruncated: false,
      ...execution,
    }),
  };
}

async function capture(simple: SimpleRepository, exitCode: ReceiptExitCode, mutate?: (receipt: ReceiptV1) => void, argvSink?: string[][]) {
  git(simple.root, ["reset", "--hard", simple.head]);
  git(simple.root, ["clean", "-fd"]);
  const outputDir = temporaryOutputPath("ascout-t107-output-");
  return await runSelfVerification({
    repositoryRoot: simple.root,
    eventBaseSha: simple.base,
    headSha: simple.head,
    outputDir,
    testRuntime: runtimeFor(exitCode, mutate, argvSink),
  });
}

function expectIntegrityCode(error: unknown, code: string): boolean {
  expect(error).toBeInstanceOf(SelfVerificationIntegrityError);
  expect((error as SelfVerificationIntegrityError).code).toBe(code);
  return true;
}

function expectNoEvidence(outputDir: string): void {
  for (const file of EVIDENCE_FILES) expect(existsSync(join(outputDir, file))).toBe(false);
}

afterEach(() => {
  while (temporaryPaths.length > 0) {
    const path = temporaryPaths.pop();
    if (path) rmSync(path, { recursive: true, force: true });
  }
});

describe("T107 exact-tree self-verification harness", () => {
  it("requires exact H and reconstructs B == M", async () => {
    const simple = createSimpleRepository();
    const result = await reconstructSelfVerificationSubject({ repositoryRoot: simple.root, eventBaseSha: simple.base, headSha: simple.head });
    expect(result).toEqual({ eventBaseSha: simple.base, headSha: simple.head, mergeBaseSha: simple.base, headTreeSha: simple.headTree });
    expect(git(simple.root, ["rev-parse", "HEAD"])).toBe(simple.base);
    expect(git(simple.root, ["write-tree"])).toBe(simple.headTree);
  });

  it("rejects wrong H, unavailable B, and absent or multiple merge bases", async () => {
    const simple = createSimpleRepository();
    await expect(reconstructSelfVerificationSubject({ repositoryRoot: simple.root, eventBaseSha: simple.base, headSha: simple.base }))
      .rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "head_mismatch"));
    git(simple.root, ["reset", "--hard", simple.head]);
    await expect(reconstructSelfVerificationSubject({ repositoryRoot: simple.root, eventBaseSha: "f".repeat(40), headSha: simple.head }))
      .rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "git_identity_unavailable"));
    expect(() => requireUniqueMergeBaseOutput("")).toThrowError(SelfVerificationIntegrityError);
    expect(() => requireUniqueMergeBaseOutput(`${"a".repeat(40)}\n${"b".repeat(40)}\n`)).toThrowError(SelfVerificationIntegrityError);
    expect(requireUniqueMergeBaseOutput(`${"c".repeat(40)}\n`)).toBe("c".repeat(40));
  });

  it("uses unique M when event base E advanced independently", async () => {
    const root = initializeRepository();
    writeFileSync(join(root, "tracked.txt"), "merge-base\n", "utf8");
    const mergeBase = commitAll(root, "merge base");
    git(root, ["branch", "feature", mergeBase]);
    git(root, ["checkout", "-q", "feature"]);
    writeFileSync(join(root, "tracked.txt"), "feature\n", "utf8");
    const head = commitAll(root, "feature head");
    const headTree = git(root, ["rev-parse", `${head}^{tree}`]);
    git(root, ["checkout", "-q", "master"]);
    writeFileSync(join(root, "base-only.txt"), "advanced base\n", "utf8");
    const eventBase = commitAll(root, "advanced base");
    git(root, ["checkout", "-q", "--detach", head]);
    const result = await reconstructSelfVerificationSubject({ repositoryRoot: root, eventBaseSha: eventBase, headSha: head });
    expect(eventBase).not.toBe(mergeBase);
    expect(result.mergeBaseSha).toBe(mergeBase);
    expect(git(root, ["rev-parse", "HEAD"])).toBe(mergeBase);
    expect(git(root, ["write-tree"])).toBe(headTree);
  });

  it("preserves added, deleted, renamed, and modified tracked content as exact H tree", async () => {
    const root = initializeRepository();
    writeFileSync(join(root, "modified.txt"), "base\n", "utf8");
    writeFileSync(join(root, "deleted.txt"), "delete me\n", "utf8");
    writeFileSync(join(root, "rename-old.txt"), "rename me\n", "utf8");
    const base = commitAll(root, "base shapes");
    writeFileSync(join(root, "modified.txt"), "head\n", "utf8");
    rmSync(join(root, "deleted.txt"));
    renameSync(join(root, "rename-old.txt"), join(root, "rename-new.txt"));
    writeFileSync(join(root, "added.txt"), "new\n", "utf8");
    const head = commitAll(root, "head shapes");
    const headTree = git(root, ["rev-parse", `${head}^{tree}`]);
    await reconstructSelfVerificationSubject({ repositoryRoot: root, eventBaseSha: base, headSha: head });
    expect(git(root, ["write-tree"])).toBe(headTree);
    const staged = git(root, ["diff", "--cached", "--name-status", "--find-renames", base]);
    for (const path of ["added.txt", "deleted.txt", "modified.txt", "rename-new.txt"]) expect(staged).toContain(path);
  });

  it("fails closed for tracked/untracked contamination while allowing canonical ignored paths", async () => {
    const tracked = createSimpleRepository();
    writeFileSync(join(tracked.root, "tracked.txt"), "drift\n", "utf8");
    await expect(reconstructSelfVerificationSubject({ repositoryRoot: tracked.root, eventBaseSha: tracked.base, headSha: tracked.head }))
      .rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "tracked_contamination"));

    const untracked = createSimpleRepository();
    writeFileSync(join(untracked.root, "rogue.txt"), "rogue\n", "utf8");
    await expect(reconstructSelfVerificationSubject({ repositoryRoot: untracked.root, eventBaseSha: untracked.base, headSha: untracked.head }))
      .rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "untracked_contamination"));

    const ignored = createSimpleRepository();
    for (const path of [join("dist", "ignored.js"), join("node_modules", "fixture", "ignored.js"), join(".ascout", "ignored.txt")]) {
      writeRuntimeFile(ignored.root, path, "ignored\n");
    }
    await expect(reconstructSelfVerificationSubject({ repositoryRoot: ignored.root, eventBaseSha: ignored.base, headSha: ignored.head }))
      .resolves.toMatchObject({ mergeBaseSha: ignored.base });
  });

  it("provisions a private exact-H runtime from a clean exact-lockfile install and ignores subject dist/node_modules", async () => {
    const fixture = createBuildableFixture();
    writeRuntimeFile(fixture.root, join("node_modules", "typescript", "bin", "tsc"), "throw new Error('subject compiler must not run');\n");
    writeRuntimeFile(fixture.root, join("dist", "check.js"), "export const poisoned = true;\n");

    const prepared = await prepareExactHeadRuntime(fixture.root, fixture.head, { requireExistingHeadBuild: false });
    try {
      expect(prepared.repositoryRoot).not.toBe(fixture.root);
      expect(prepared.headSha).toBe(fixture.head);
      expect(prepared.headTreeSha).toBe(fixture.headTree);
      expect(readFileSync(join(prepared.runtimeRoot, "check.js"), "utf8")).toBe("export const fixtureCheck = 1;\n");
      writeRuntimeFile(fixture.root, join("dist", "check.js"), "export const changedAgain = true;\n");
      expect(readFileSync(join(prepared.runtimeRoot, "check.js"), "utf8")).toBe("export const fixtureCheck = 1;\n");
    } finally {
      await releaseExactHeadRuntime(fixture.root, prepared);
    }
  });

  it("binds schema and installed dependency-tree assets against post-build tampering", async () => {
    const fixture = createBuildableFixture();
    const prepared = await prepareExactHeadRuntime(fixture.root, fixture.head, { requireExistingHeadBuild: false });
    try {
      await expect(verifyExactHeadRuntimeManifest(prepared)).resolves.toBeUndefined();
      const schemaPath = join(prepared.repositoryRoot, RECEIPT_SCHEMA_PATH);
      const schemaBytes = readFileSync(schemaPath, "utf8");
      writeFileSync(schemaPath, "{\"tampered\":true}\n", "utf8");
      await expect(verifyExactHeadRuntimeManifest(prepared))
        .rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "runtime_provenance_mismatch"));

      writeFileSync(schemaPath, schemaBytes, "utf8");
      await expect(verifyExactHeadRuntimeManifest(prepared)).resolves.toBeUndefined();
      writeRuntimeFile(prepared.repositoryRoot, join("node_modules", "injected", "runtime.js"), "export const tampered = true;\n");
      await expect(verifyExactHeadRuntimeManifest(prepared))
        .rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "runtime_provenance_mismatch"));
    } finally {
      await releaseExactHeadRuntime(fixture.root, prepared);
    }
  });

  it.skipIf(process.platform === "win32")("binds resolved bytes behind private runtime symlinks", async () => {
    const fixture = createBuildableFixture({ createRuntimeSymlink: true });
    const prepared = await prepareExactHeadRuntime(fixture.root, fixture.head, { requireExistingHeadBuild: false });
    try {
      await expect(verifyExactHeadRuntimeManifest(prepared)).resolves.toBeUndefined();
      writeFileSync(join(prepared.repositoryRoot, "node_modules", "linked-runtime", "target.js"), "export const linked = 2;\n", "utf8");
      await expect(verifyExactHeadRuntimeManifest(prepared))
        .rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "runtime_provenance_mismatch"));
    } finally {
      await releaseExactHeadRuntime(fixture.root, prepared);
    }
  });

  it("rejects an isolated exact-H build that contaminates tracked source", async () => {
    const fixture = createBuildableFixture({ contaminateTracked: true });
    await expect(prepareExactHeadRuntime(fixture.root, fixture.head, { requireExistingHeadBuild: false }))
      .rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "tracked_contamination"));
  });

  it.each([0, 1, 3, 4] as const)("retains valid source-bound exit %s as SHADOW_NON_GATING evidence", async (exitCode) => {
    const result = await capture(createSimpleRepository(), exitCode);
    expect(result.receiptExit).toBe(exitCode);
    expect(result.envelope.classification).toBe("SHADOW_NON_GATING");
    expect(result.envelope.receipt_exit_code).toBe(exitCode);
    expect(existsSync(result.receiptPath)).toBe(true);
    expect(existsSync(result.envelopePath)).toBe(true);
  });

  it("rejects otherwise-valid source-bound exit 2 before digest/envelope/output", async () => {
    const simple = createSimpleRepository();
    const outputDir = temporaryOutputPath("ascout-t107-exit2-");
    await expect(runSelfVerification({ repositoryRoot: simple.root, eventBaseSha: simple.base, headSha: simple.head, outputDir, testRuntime: runtimeFor(2) }))
      .rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "exit_2_integrity_failure"));
    expectNoEvidence(outputDir);
    expect(existsSync(outputDir)).toBe(false);
  });

  it("rejects process mismatch, malformed JSON, schema invalidity, semantic invalidity, and missing receipt", () => {
    const source = {
      repository_id: `local:${"a".repeat(64)}`,
      repository_id_kind: "local_only" as const,
      portable: false,
      head_sha: "b".repeat(40),
      detached: true,
      shallow: false,
      tree_digest_version: 1 as const,
      tree_digest: "c".repeat(64),
      tracked_index_entry_count: 1,
      unstaged_changed_count: 0,
      included_untracked_count: 0,
    } satisfies SourceStateV1;
    const receipt = validReceipt(source, 0);
    const bytes = Buffer.from(JSON.stringify(receipt));

    expect(() => validateReceiptCapture({ receiptBytes: bytes, processExitCode: 1, expectedSourceState: source, validators: validators() })).toThrowError(/process exit/u);
    expect(() => validateReceiptCapture({ receiptBytes: Buffer.from("not json"), processExitCode: 0, expectedSourceState: source, validators: validators() })).toThrowError(/valid JSON/u);

    const schemaInvalid = structuredClone(receipt) as unknown as Record<string, unknown>;
    schemaInvalid.schema_version = "9.0";
    expect(() => validateReceiptCapture({ receiptBytes: Buffer.from(JSON.stringify(schemaInvalid)), processExitCode: 0, expectedSourceState: source, validators: validators() })).toThrowError(/JSON Schema/u);

    const semanticInvalid = structuredClone(receipt);
    (semanticInvalid.summary as unknown as { finding_count: number }).finding_count = 1;
    expect(validateReceiptJsonSchema(semanticInvalid).valid).toBe(true);
    expect(validateReceiptSemantics(semanticInvalid).valid).toBe(false);
    expect(() => validateReceiptCapture({ receiptBytes: Buffer.from(JSON.stringify(semanticInvalid)), processExitCode: 0, expectedSourceState: source, validators: validators() })).toThrowError(/semantic validator/u);
    expect(() => validateReceiptCapture({ receiptBytes: Buffer.alloc(0), processExitCode: 2, expectedSourceState: source, validators: validators() })).toThrowError(/no receipt bytes/u);
  });

  it("rejects each of the six canonical source-binding fields independently", () => {
    const source = {
      repository_id: `local:${"a".repeat(64)}`,
      repository_id_kind: "local_only" as const,
      portable: false,
      head_sha: "b".repeat(40),
      detached: true,
      shallow: false,
      tree_digest_version: 1 as const,
      tree_digest: "c".repeat(64),
      tracked_index_entry_count: 3,
      unstaged_changed_count: 0,
      included_untracked_count: 0,
    } satisfies SourceStateV1;
    const passThroughValidators = {
      validateReceiptJsonSchema: () => ({ valid: true, issues: [] }),
      validateReceiptSemantics: () => ({ valid: true, issues: [] }),
    };
    const mutations: Record<string, (candidate: Record<string, unknown>) => void> = {
      head_sha: (candidate) => { candidate.head_sha = "d".repeat(40); },
      tree_digest_version: (candidate) => { candidate.tree_digest_version = 2; },
      tree_digest: (candidate) => { candidate.tree_digest = "e".repeat(64); },
      tracked_index_entry_count: (candidate) => { candidate.tracked_index_entry_count = 4; },
      unstaged_changed_count: (candidate) => { candidate.unstaged_changed_count = 1; },
      included_untracked_count: (candidate) => { candidate.included_untracked_count = 1; },
    };
    for (const [field, mutate] of Object.entries(mutations)) {
      const receipt = validReceipt(source, 0);
      mutate(receipt.source.start as unknown as Record<string, unknown>);
      expect(() => validateReceiptCapture({ receiptBytes: Buffer.from(JSON.stringify(receipt)), processExitCode: 0, expectedSourceState: source, validators: passThroughValidators }), field)
        .toThrowError(new RegExp(field, "u"));
    }
  });

  it("hashes exact retained bytes, keeps envelope allowlisted, and never adds command admission", async () => {
    const simple = createSimpleRepository();
    const argv: string[][] = [];
    const result = await capture(simple, 0, undefined, argv);
    const bytes = readFileSync(result.receiptPath);
    const crypto = await import("node:crypto");
    expect(result.receiptSha256).toBe(crypto.createHash("sha256").update(bytes).digest("hex"));
    expect(Object.keys(result.envelope)).toEqual([
      "schema_version",
      "classification",
      "verifier_head_sha",
      "verifier_head_tree_sha",
      "event_base_tip_sha",
      "subject_merge_base_sha",
      "subject_target_head_sha",
      "subject_target_tree_sha",
      "receipt_exit_code",
      "receipt_sha256",
      "receipt_file",
    ]);
    expect(JSON.stringify(result.envelope)).not.toMatch(/repository_url|absolute|actor|hostname|home|token|secret|stderr|stdout/ui);
    expect(argv).toHaveLength(1);
    expect(argv[0]).toContain("check");
    expect(argv[0]).toContain("--format");
    expect(argv[0]).toContain("json");
    expect(argv[0]).not.toContain("--allow-changed-command-surface");
  });

  it("keeps focused tests independent of pre-existing dist but production fails closed when the supplied head build is missing", async () => {
    const focused = createSimpleRepository();
    expect(existsSync(join(focused.root, "dist"))).toBe(false);
    await expect(capture(focused, 0)).resolves.toMatchObject({ receiptExit: 0 });
    expect(existsSync(join(focused.root, "dist"))).toBe(false);

    const production = createSimpleRepository();
    const outputDir = temporaryOutputPath("ascout-t107-production-missing-");
    await expect(runSelfVerification({ repositoryRoot: production.root, eventBaseSha: production.base, headSha: production.head, outputDir }))
      .rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "head_build_unavailable"));
    expectNoEvidence(outputDir);
    expect(existsSync(outputDir)).toBe(false);
  });

  it.each([
    ["timed_out", { outcome: "timed_out", exitCode: null, signal: null, error: null }, "verifier_execution_failed"],
    ["spawn error", { outcome: "error", exitCode: null, signal: null, error: new Error("fixture") }, "verifier_execution_failed"],
    ["stdout truncated", { outcome: "exited", exitCode: 0, stdoutTruncated: true }, "verifier_output_truncated"],
    ["stderr truncated", { outcome: "exited", exitCode: 0, stderrTruncated: true }, "verifier_output_truncated"],
  ] as const)("fails closed for %s without writing evidence", async (_label, execution, expectedCode) => {
    const simple = createSimpleRepository();
    const outputDir = temporaryOutputPath("ascout-t107-execution-failure-");
    await expect(runSelfVerification({
      repositoryRoot: simple.root,
      eventBaseSha: simple.base,
      headSha: simple.head,
      outputDir,
      testRuntime: runtimeWithExecution(execution as unknown as Record<string, unknown>),
    })).rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, expectedCode));
    expectNoEvidence(outputDir);
    expect(existsSync(outputDir)).toBe(false);
  });

  it.skipIf(process.platform === "win32")("rejects output-path replacement with a repository symlink without repository evidence", async () => {
    const simple = createSimpleRepository();
    const outputDir = temporaryOutputPath("ascout-t107-output-race-");
    const repositoryTarget = join(simple.root, "evidence-target");
    mkdirSync(repositoryTarget);
    const baseRuntime = runtimeFor(0);
    const replacingRuntime = {
      ...baseRuntime,
      runVerifier: async (args: { repositoryRoot: string; argv: string[] }) => {
        const result = await baseRuntime.runVerifier(args);
        symlinkSync(repositoryTarget, outputDir, "dir");
        return result;
      },
    };

    await expect(runSelfVerification({
      repositoryRoot: simple.root,
      eventBaseSha: simple.base,
      headSha: simple.head,
      outputDir,
      testRuntime: replacingRuntime,
    })).rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "evidence_output_exists"));
    expectNoEvidence(repositoryTarget);
  });

  it.skipIf(process.platform === "win32")("rejects output parent replacement before bound publication without repository evidence", async () => {
    const simple = createSimpleRepository();
    const outputDir = temporaryOutputPath("ascout-t107-parent-race-");
    const outputParent = dirname(outputDir);
    const displacedParent = `${outputParent}-displaced`;
    const repositoryTarget = join(simple.root, "parent-target");
    mkdirSync(repositoryTarget);
    temporaryPaths.push(displacedParent);
    let replaced = false;

    await expect(runSelfVerification({
      repositoryRoot: simple.root,
      eventBaseSha: simple.base,
      headSha: simple.head,
      outputDir,
      testRuntime: runtimeFor(0),
      testEvidenceIo: {
        beforeBoundParentPublish: async () => {
          renameSync(outputParent, displacedParent);
          symlinkSync(repositoryTarget, outputParent, "dir");
          replaced = true;
        },
      },
    })).rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "evidence_output_changed"));
    expect(replaced).toBe(true);
    expectNoEvidence(repositoryTarget);
    expectNoEvidence(join(displacedParent, "evidence"));
    expectNoEvidence(outputDir);
  });

  it.skipIf(process.platform === "win32")("keeps evidence out of repository when private staging is replaced after validation", async () => {
    const simple = createSimpleRepository();
    const outputDir = temporaryOutputPath("ascout-t107-stage-race-");
    const repositoryTarget = join(simple.root, "stage-target");
    mkdirSync(repositoryTarget);
    let replaced = false;

    await expect(runSelfVerification({
      repositoryRoot: simple.root,
      eventBaseSha: simple.base,
      headSha: simple.head,
      outputDir,
      testRuntime: runtimeFor(0),
      testEvidenceIo: {
        open: async (...args: Parameters<typeof fsPromises.open>) => {
          const handle = await fsPromises.open(...args);
          if (String(args[0]).endsWith(EVIDENCE_FILES[0])) {
            return {
              writeFile: async (...writeArgs: Parameters<typeof handle.writeFile>) => {
                if (!replaced) {
                  const stageDir = dirname(String(args[0]));
                  const stageRoot = dirname(stageDir);
                  renameSync(stageDir, join(stageRoot, "displaced-bundle"));
                  symlinkSync(repositoryTarget, stageDir, "dir");
                  replaced = true;
                }
                return await handle.writeFile(...writeArgs);
              },
              sync: handle.sync.bind(handle),
              read: handle.read.bind(handle),
              close: handle.close.bind(handle),
            } as unknown as typeof handle;
          }
          return handle;
        },
      },
    })).rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "evidence_output_changed"));
    expect(replaced).toBe(true);
    expectNoEvidence(repositoryTarget);
    expectNoEvidence(outputDir);
    expect(existsSync(outputDir)).toBe(false);
  });

  it.skipIf(process.platform === "win32")("rejects final output replacement after published identity validation", async () => {
    const simple = createSimpleRepository();
    const outputDir = temporaryOutputPath("ascout-t107-published-race-");
    const repositoryTarget = join(simple.root, "published-target");
    mkdirSync(repositoryTarget);
    const displaced = join(dirname(outputDir), "displaced-published-bundle");
    let finalIdentityChecks = 0;
    let replaced = false;

    await expect(runSelfVerification({
      repositoryRoot: simple.root,
      eventBaseSha: simple.base,
      headSha: simple.head,
      outputDir,
      testRuntime: runtimeFor(0),
      testEvidenceIo: {
        lstat: async (...args: Parameters<typeof fsPromises.lstat>) => {
          const stats = await fsPromises.lstat(...args);
          if (String(args[0]) === outputDir) {
            finalIdentityChecks += 1;
            if (finalIdentityChecks === 2 && !replaced) {
              renameSync(outputDir, displaced);
              symlinkSync(repositoryTarget, outputDir, "dir");
              replaced = true;
            }
          }
          return stats;
        },
      },
    })).rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "evidence_output_changed"));
    expect(replaced).toBe(true);
    expectNoEvidence(repositoryTarget);
    expectNoEvidence(outputDir);
    expect(existsSync(outputDir)).toBe(false);
  });

  it.skipIf(process.platform === "win32")("rolls back output replacement after bound COMMIT checks before parent confirmation", async () => {
    const simple = createSimpleRepository();
    const outputDir = temporaryOutputPath("ascout-t107-post-commit-race-");
    const repositoryTarget = join(simple.root, "post-commit-target");
    const displaced = join(dirname(outputDir), "displaced-post-commit-bundle");
    mkdirSync(repositoryTarget);
    let replaced = false;

    await expect(runSelfVerification({
      repositoryRoot: simple.root,
      eventBaseSha: simple.base,
      headSha: simple.head,
      outputDir,
      testRuntime: runtimeFor(0),
      testEvidenceIo: {
        afterBoundParentCommit: async () => {
          renameSync(outputDir, displaced);
          symlinkSync(repositoryTarget, outputDir, "dir");
          replaced = true;
        },
      },
    })).rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "evidence_output_changed"));
    expect(replaced).toBe(true);
    expectNoEvidence(repositoryTarget);
    expectNoEvidence(outputDir);
    expect(existsSync(outputDir)).toBe(false);
  });

  it.skipIf(process.platform === "win32")("rolls back final pathname replacement after child CONFIRM checks before rollback release", async () => {
    const simple = createSimpleRepository();
    const outputDir = temporaryOutputPath("ascout-t107-post-confirm-race-");
    const repositoryTarget = join(simple.root, "post-confirm-target");
    const displaced = join(dirname(outputDir), "displaced-post-confirm-bundle");
    mkdirSync(repositoryTarget);
    let replaced = false;
    let returnedReceiptPath: string | null = null;

    const attempt = runSelfVerification({
      repositoryRoot: simple.root,
      eventBaseSha: simple.base,
      headSha: simple.head,
      outputDir,
      testRuntime: runtimeFor(0),
      testEvidenceIo: {
        afterBoundParentConfirm: async () => {
          renameSync(outputDir, displaced);
          symlinkSync(repositoryTarget, outputDir, "dir");
          replaced = true;
        },
      },
    }).then((result) => {
      returnedReceiptPath = result.receiptPath;
      return result;
    });

    await expect(attempt).rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "evidence_output_changed"));
    expect(replaced).toBe(true);
    expect(returnedReceiptPath).toBeNull();
    expectNoEvidence(repositoryTarget);
    expectNoEvidence(outputDir);
    expect(existsSync(outputDir)).toBe(false);
  });

  it("removes all published evidence when retained receipt handle read-back mismatches", async () => {
    const simple = createSimpleRepository();
    const outputDir = temporaryOutputPath("ascout-t107-readback-mismatch-");
    let receiptReadPasses = 0;
    await expect(runSelfVerification({
      repositoryRoot: simple.root,
      eventBaseSha: simple.base,
      headSha: simple.head,
      outputDir,
      testRuntime: runtimeFor(0),
      testEvidenceIo: {
        open: async (...args: Parameters<typeof fsPromises.open>) => {
          const handle = await fsPromises.open(...args);
          if (String(args[0]).endsWith(EVIDENCE_FILES[0])) {
            return {
              writeFile: handle.writeFile.bind(handle),
              sync: handle.sync.bind(handle),
              stat: handle.stat.bind(handle),
              read: async (...readArgs: Parameters<typeof handle.read>) => {
                const result = await handle.read(...readArgs);
                const position = readArgs[3];
                if (position === 0) {
                  receiptReadPasses += 1;
                  if (receiptReadPasses >= 2 && result.bytesRead > 0 && Buffer.isBuffer(readArgs[0])) {
                    readArgs[0][0] = readArgs[0][0] ^ 0xff;
                  }
                }
                return result;
              },
              close: handle.close.bind(handle),
            } as unknown as typeof handle;
          }
          return handle;
        },
      },
    })).rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "receipt_digest_mismatch"));
    expect(receiptReadPasses).toBeGreaterThanOrEqual(2);
    expectNoEvidence(outputDir);
    expect(existsSync(outputDir)).toBe(false);
  });

  it("removes all staged evidence when envelope staging fails", async () => {
    const simple = createSimpleRepository();
    const outputDir = temporaryOutputPath("ascout-t107-envelope-failure-");
    await expect(runSelfVerification({
      repositoryRoot: simple.root,
      eventBaseSha: simple.base,
      headSha: simple.head,
      outputDir,
      testRuntime: runtimeFor(0),
      testEvidenceIo: {
        open: async (...args: Parameters<typeof fsPromises.open>) => {
          const handle = await fsPromises.open(...args);
          if (String(args[0]).endsWith(EVIDENCE_FILES[1])) {
            return {
              writeFile: async () => { throw new Error("fixture envelope write failure"); },
              sync: handle.sync.bind(handle),
              close: handle.close.bind(handle),
            } as unknown as typeof handle;
          }
          return handle;
        },
      },
    })).rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "evidence_output_failed"));
    expectNoEvidence(outputDir);
    expect(existsSync(outputDir)).toBe(false);
  });

  it("rejects evidence output inside repository source identity", async () => {
    const simple = createSimpleRepository();
    await expect(runSelfVerification({
      repositoryRoot: simple.root,
      eventBaseSha: simple.base,
      headSha: simple.head,
      outputDir: join(simple.root, "evidence"),
      testRuntime: runtimeFor(0),
    })).rejects.toSatisfy((error: unknown) => expectIntegrityCode(error, "output_inside_repository"));
  });

  it("buildQualificationEnvelope rejects malformed receipt digests", () => {
    expect(() => buildQualificationEnvelope({
      identities: { eventBaseSha: "a".repeat(40), headSha: "b".repeat(40), mergeBaseSha: "a".repeat(40), headTreeSha: "c".repeat(40) },
      receiptExit: 0,
      receiptSha256: "not-a-digest",
    })).toThrowError(/SHA-256/u);
  });
});
