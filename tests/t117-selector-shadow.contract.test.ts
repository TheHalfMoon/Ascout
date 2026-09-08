import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { link as fsLink, lstat, mkdtemp, mkdir, readFile, realpath, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

let shadow: any;

beforeAll(async () => {
  const moduleUrl = new URL("../benchmarks/selector-shadow.mjs", import.meta.url).href;
  shadow = await import(/* @vite-ignore */ moduleUrl);
});

const B = "a".repeat(40);
const M = "b".repeat(40);
const H = "c".repeat(40);
const HT = "d".repeat(40);

function receipt(overrides: Record<string, unknown> = {}): any {
  return {
    summary: { exit_code: 0 },
    selection: {
      mode: "native_related",
      selected_test_count: 1,
      deselected_test_count: 0,
      total_test_count: 1,
      widened: false,
      widen_triggers: [],
    },
    tasks: [{
      task_id: "task-test",
      task_type: "test",
      execution_admission: "normal",
      command_surface_changed: false,
      status: "PASS",
      duration_ms: 25,
      selected_test_count: 1,
      deselected_test_count: 0,
    }],
    findings: [],
    ...overrides,
  };
}

function boundBytes(value: any = receipt()): { receiptBytes: Buffer; envelopeBytes: Buffer } {
  const receiptBytes = Buffer.from(JSON.stringify(value), "utf8");
  const digest = createHash("sha256").update(receiptBytes).digest("hex");
  const envelope = {
    schema_version: 1,
    classification: "SHADOW_NON_GATING",
    verifier_head_sha: H,
    verifier_head_tree_sha: HT,
    event_base_tip_sha: B,
    subject_merge_base_sha: M,
    subject_target_head_sha: H,
    subject_target_tree_sha: HT,
    receipt_exit_code: value.summary.exit_code,
    receipt_sha256: digest,
    receipt_file: "self-verification-receipt.json",
  };
  return { receiptBytes, envelopeBytes: Buffer.from(JSON.stringify(envelope), "utf8") };
}

async function evidenceFiles(value: any = receipt()): Promise<{
  root: string;
  receiptPath: string;
  envelopePath: string;
  outputPath: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "ascout-t117-"));
  const evidence = await mkdtemp(join(tmpdir(), "ascout-t117-evidence-"));
  const { receiptBytes, envelopeBytes } = boundBytes(value);
  const receiptPath = join(evidence, "self-verification-receipt.json");
  const envelopePath = join(evidence, "self-verification-envelope.json");
  const outputPath = join(evidence, "selector-shadow-observation.json");
  await writeFile(receiptPath, receiptBytes);
  await writeFile(envelopePath, envelopeBytes);
  return { root, receiptPath, envelopePath, outputPath };
}

function stableState() {
  return {
    headSha: M,
    treeSha: HT,
    targetHeadTreeSha: HT,
    unstagedClean: true,
    nonignoredUntrackedClean: true,
  };
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readPidEventually(path: string): Promise<number> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const value = Number.parseInt((await readFile(path, "utf8")).trim(), 10);
      if (Number.isSafeInteger(value) && value > 0) return value;
    } catch {}
    await sleep(25);
  }
  throw new Error("child PID was not published in time");
}

async function waitForProcessExit(pid: number): Promise<boolean> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (!processExists(pid)) return true;
    await sleep(25);
  }
  return !processExists(pid);
}

describe("T117 selector-shadow comparator contract", () => {
  it("binds exact receipt bytes to the Spec 006 envelope digest and source identities", () => {
    const { receiptBytes, envelopeBytes } = boundBytes();
    const bound = shadow.validateBoundEvidence(receiptBytes, envelopeBytes);
    expect(bound.receiptDigest).toBe(createHash("sha256").update(receiptBytes).digest("hex"));
    expect(bound.identities).toMatchObject({
      eventBaseSha: B,
      mergeBaseSha: M,
      targetHeadSha: H,
      targetTreeSha: HT,
      verifierHeadSha: H,
      verifierHeadTreeSha: HT,
    });
  });

  it("rejects inconsistent Spec 006 verifier and target H/HT aliases", () => {
    const { receiptBytes, envelopeBytes } = boundBytes();
    for (const [field, value] of [
      ["verifier_head_sha", "e".repeat(40)],
      ["verifier_head_tree_sha", "f".repeat(40)],
    ]) {
      const envelope = JSON.parse(envelopeBytes.toString("utf8"));
      envelope[field] = value;
      expect(() => shadow.validateBoundEvidence(receiptBytes, Buffer.from(JSON.stringify(envelope)))).toThrowError(
        expect.objectContaining({ code: "envelope_identity_mismatch" }),
      );
    }
  });

  it("rejects receipt replacement instead of comparing unbound bytes", () => {
    const { receiptBytes, envelopeBytes } = boundBytes();
    const replacement = Buffer.from(receiptBytes);
    replacement[replacement.length - 1] = replacement[replacement.length - 1] === 0x7d ? 0x20 : 0x7d;
    expect(() => shadow.validateBoundEvidence(replacement, envelopeBytes)).toThrowError(
      expect.objectContaining({ code: "receipt_digest_mismatch" }),
    );
  });

  it("requires current Spec 006 envelope classification and exact receipt exit binding", () => {
    const { receiptBytes, envelopeBytes } = boundBytes();
    const badClass = JSON.parse(envelopeBytes.toString("utf8"));
    badClass.classification = "OTHER";
    expect(() => shadow.validateBoundEvidence(receiptBytes, Buffer.from(JSON.stringify(badClass)))).toThrowError(
      expect.objectContaining({ code: "envelope_contract_invalid" }),
    );

    const badExit = JSON.parse(envelopeBytes.toString("utf8"));
    badExit.receipt_exit_code = 4;
    expect(() => shadow.validateBoundEvidence(receiptBytes, Buffer.from(JSON.stringify(badExit)))).toThrowError(
      expect.objectContaining({ code: "receipt_exit_mismatch" }),
    );
  });

  it("rejects mutually bound Spec 006 receipt exits outside the retained shadow set", () => {
    for (const exitCode of [2, 5]) {
      const value = receipt();
      value.summary.exit_code = exitCode;
      const { receiptBytes, envelopeBytes } = boundBytes(value);
      expect(() => shadow.validateBoundEvidence(receiptBytes, envelopeBytes)).toThrowError(
        expect.objectContaining({ code: "receipt_exit_invalid" }),
      );
    }
  });

  it.each([0, 1, 3, 4])("accepts retained Spec 006 shadow receipt exit %i", (exitCode) => {
    const value = receipt();
    value.summary.exit_code = exitCode;
    const { receiptBytes, envelopeBytes } = boundBytes(value);
    expect(shadow.validateBoundEvidence(receiptBytes, envelopeBytes).receipt.summary.exit_code).toBe(exitCode);
  });

  it.each(["PASS", "FAIL", "FLAKY"])("accepts %s as a comparable normal-admission test task", (status) => {
    const value = receipt();
    value.tasks[0].status = status;
    expect(shadow.classifyAscoutTestTask(value)).toMatchObject({ available: true, reasonCode: null });
  });

  it.each(["BLOCKED", "ERROR", "NOT_RUN", "NOT_APPLICABLE"])("keeps %s explicitly unavailable", (status) => {
    const value = receipt();
    value.tasks[0].status = status;
    expect(shadow.classifyAscoutTestTask(value)).toMatchObject({
      available: false,
      reasonCode: "UNAVAILABLE_ASCOUT_TASK_STATE",
    });
  });

  it("keeps refused or changed command authority unavailable without inventing admission", () => {
    const refused = receipt();
    refused.tasks[0].execution_admission = "refused_changed_surface";
    expect(shadow.classifyAscoutTestTask(refused)).toMatchObject({
      available: false,
      reasonCode: "UNAVAILABLE_ASCOUT_ADMISSION",
    });

    const changed = receipt();
    changed.tasks[0].command_surface_changed = true;
    expect(shadow.classifyAscoutTestTask(changed)).toMatchObject({
      available: false,
      reasonCode: "UNAVAILABLE_ASCOUT_ADMISSION",
    });
  });

  it("requires exactly one unambiguous bound test task", () => {
    expect(() => shadow.classifyAscoutTestTask(receipt({ tasks: [] }))).toThrowError(
      expect.objectContaining({ code: "test_task_ambiguous" }),
    );
    const duplicate = receipt();
    duplicate.tasks.push({ ...duplicate.tasks[0], task_id: "task-test-2" });
    expect(() => shadow.classifyAscoutTestTask(duplicate)).toThrowError(
      expect.objectContaining({ code: "test_task_ambiguous" }),
    );
  });

  it("keeps no_test_task selection explicitly unavailable", () => {
    const value = receipt();
    value.selection.mode = "no_test_task";
    expect(shadow.classifyAscoutTestTask(value)).toMatchObject({
      available: false,
      reasonCode: "UNAVAILABLE_ASCOUT_SELECTION",
    });
  });

  it("extracts only exact receipt path plus rule_or_test_id identities for the bound task", () => {
    const value = receipt({
      findings: [
        { task_id: "task-test", path: "tests/a.test.ts", rule_or_test_id: "suite exact failure" },
        { task_id: "typecheck", path: "src/a.ts", rule_or_test_id: "TS1234" },
        { task_id: "task-test", path: "tests/a.test.ts", rule_or_test_id: "suite exact failure" },
      ],
    });
    expect(shadow.extractAscoutFailureIdentities(value, value.tasks[0])).toEqual([
      { path: "tests/a.test.ts", test_id: "suite exact failure" },
    ]);
  });

  it("does not guess malformed Ascout finding identities", () => {
    const value = receipt({
      findings: [{ task_id: "task-test", path: "../escape.test.ts", rule_or_test_id: "failure" }],
    });
    expect(() => shadow.extractAscoutFailureIdentities(value, value.tasks[0])).toThrowError(
      expect.objectContaining({ code: "UNAVAILABLE_ASCOUT_FINDINGS" }),
    );
  });

  it("matches exact path plus test ID only and reports unmatched full-suite identities as misses", () => {
    const result = shadow.compareFailureIdentities(
      [
        { path: "tests/a.test.ts", test_id: "same name" },
        { path: "tests/b.test.ts", test_id: "same name" },
        { path: "tests/a.test.ts", test_id: "same name" },
      ],
      [{ path: "tests/a.test.ts", test_id: "same name" }],
    );
    expect(result.matched).toEqual([{ path: "tests/a.test.ts", test_id: "same name" }]);
    expect(result.selector_misses).toEqual([{ path: "tests/b.test.ts", test_id: "same name" }]);
    expect(result.disposition).toBe("SELECTOR_MISSES_OBSERVED");
  });

  it("distinguishes no failures from fully captured failures", () => {
    expect(shadow.compareFailureIdentities([], []).disposition).toBe("NO_FULL_SUITE_FAILURES");
    expect(shadow.compareFailureIdentities(
      [{ path: "tests/a.test.ts", test_id: "failure" }],
      [{ path: "tests/a.test.ts", test_id: "failure" }],
    ).disposition).toBe("FULL_SUITE_FAILURES_CAPTURED");
  });

  it("parses exact failed Vitest assertion identities and sorts/deduplicates deterministically", async () => {
    const report = JSON.stringify({
      testResults: [
        {
          name: "tests/b.test.ts",
          status: "failed",
          assertionResults: [
            { status: "failed", fullName: "z failure" },
            { status: "passed", fullName: "pass" },
          ],
        },
        {
          name: "tests/a.test.ts",
          status: "failed",
          assertionResults: [
            { status: "failed", fullName: "a failure" },
            { status: "failed", fullName: "a failure" },
          ],
        },
      ],
    });
    const parsed = await shadow.parseVitestFailureReport(report, async (name: string) => name);
    expect(parsed).toEqual([
      { path: "tests/a.test.ts", test_id: "a failure" },
      { path: "tests/b.test.ts", test_id: "z failure" },
    ]);
  });

  it("rejects malformed or ambiguous failed Vitest identities instead of inferring from output", async () => {
    await expect(shadow.parseVitestFailureReport("not-json", async (name: string) => name)).rejects.toMatchObject({
      code: "UNAVAILABLE_FULL_SUITE_REPORT",
    });
    await expect(shadow.parseVitestFailureReport(JSON.stringify({
      testResults: [{ name: "tests/a.test.ts", status: "failed", assertionResults: [{ status: "failed", fullName: "" }] }],
    }), async (name: string) => name)).rejects.toMatchObject({ code: "UNAVAILABLE_FULL_SUITE_REPORT" });
  });

  it("rejects every structurally incomplete Vitest suite and assertion record", async () => {
    const invalidReports = [
      { testResults: [null] },
      { testResults: [{ name: "tests/a.test.ts", status: "passed" }] },
      { testResults: [{ name: "tests/a.test.ts", status: "passed", assertionResults: {} }] },
      { testResults: [{ name: "tests/a.test.ts", status: "passed", assertionResults: [{ status: "passed" }] }] },
      { testResults: [{ name: "", status: "passed", assertionResults: [] }] },
    ];
    for (const report of invalidReports) {
      await expect(shadow.parseVitestFailureReport(JSON.stringify(report), async (name: string) => name)).rejects.toMatchObject({
        code: "UNAVAILABLE_FULL_SUITE_REPORT",
      });
    }
  });

  it("normalizes only repository-contained reported paths and rejects outside paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "ascout-t117-path-root-"));
    const outside = await mkdtemp(join(tmpdir(), "ascout-t117-path-outside-"));
    await mkdir(join(root, "tests"), { recursive: true });
    await writeFile(join(root, "tests", "a.test.ts"), "export {};\n");
    await writeFile(join(outside, "outside.test.ts"), "export {};\n");

    await expect(shadow.normalizeReportedPath(root, join(root, "tests", "a.test.ts"))).resolves.toBe("tests/a.test.ts");
    await expect(shadow.normalizeReportedPath(root, join(outside, "outside.test.ts"))).rejects.toMatchObject({
      code: "UNAVAILABLE_FULL_SUITE_REPORT",
    });
  });

  it("freezes the root test command contract to exactly vitest run", () => {
    expect(shadow.validateRootPackageContract({ scripts: { test: "vitest run" } })).toBe(true);
    expect(() => shadow.validateRootPackageContract({ scripts: { test: "vitest --run" } })).toThrowError(
      expect.objectContaining({ code: "UNAVAILABLE_FULL_SUITE_CONTRACT" }),
    );
    expect(() => shadow.validateRootPackageContract({ scripts: {} })).toThrowError(
      expect.objectContaining({ code: "UNAVAILABLE_FULL_SUITE_CONTRACT" }),
    );
  });

  it("binds execution to the declared Vitest package bin instead of an arbitrary .bin launcher", async () => {
    const root = await mkdtemp(join(tmpdir(), "ascout-t117-vitest-runtime-"));
    const binDir = join(root, "node_modules", ".bin");
    const vitestDir = join(root, "node_modules", "vitest");
    await mkdir(binDir, { recursive: true });
    await mkdir(vitestDir, { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "vitest run" } }));
    const launcherPath = join(binDir, process.platform === "win32" ? "vitest.cmd" : "vitest");
    await writeFile(launcherPath, "arbitrary launcher that must never become the reference executable\n");
    await writeFile(join(vitestDir, "package.json"), JSON.stringify({
      name: "vitest",
      version: "4.1.10",
      bin: { vitest: "vitest.mjs" },
    }));
    await writeFile(join(vitestDir, "vitest.mjs"), "export {};\n");

    const runtime = await shadow.resolveLocalVitestRuntime(root);
    const vitestEntrypoint = await realpath(join(vitestDir, "vitest.mjs"));
    expect(runtime.vitestEntrypointPath).toBe(vitestEntrypoint);
    expect(runtime.version).toBe("4.1.10");
    if (process.platform === "win32") {
      expect(runtime.executablePath).toBe(process.execPath);
      expect(runtime.executableArgsPrefix).toEqual([vitestEntrypoint]);
    } else {
      expect(runtime.executablePath).toBe(vitestEntrypoint);
      expect(runtime.executableArgsPrefix).toEqual([]);
    }
    expect(runtime.executablePath).not.toBe(await realpath(launcherPath));
  });

  it("rejects a Vitest manifest whose declared bin escapes the installed Vitest package", async () => {
    const root = await mkdtemp(join(tmpdir(), "ascout-t117-vitest-escape-"));
    const binDir = join(root, "node_modules", ".bin");
    const vitestDir = join(root, "node_modules", "vitest");
    const otherDir = join(root, "node_modules", "other-package");
    await mkdir(binDir, { recursive: true });
    await mkdir(vitestDir, { recursive: true });
    await mkdir(otherDir, { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "vitest run" } }));
    await writeFile(join(binDir, process.platform === "win32" ? "vitest.cmd" : "vitest"), "launcher\n");
    await writeFile(join(otherDir, "runner.mjs"), "export {};\n");
    await writeFile(join(vitestDir, "package.json"), JSON.stringify({
      name: "vitest",
      version: "4.1.10",
      bin: { vitest: "../other-package/runner.mjs" },
    }));

    await expect(shadow.resolveLocalVitestRuntime(root)).rejects.toMatchObject({
      code: "UNAVAILABLE_FULL_SUITE_CONTRACT",
    });
  });

  it("launches the bound runtime prefix before the frozen Vitest reference arguments", async () => {
    const root = await mkdtemp(join(tmpdir(), "ascout-t117-vitest-argv-"));
    const reportPath = join(root, "report.json");
    const entrypointPath = join(root, "entrypoint.mjs");
    await writeFile(entrypointPath, [
      'import { writeFileSync } from "node:fs";',
      'const outputArg = process.argv.find((value) => value.startsWith("--outputFile="));',
      'if (!outputArg) process.exit(9);',
      'writeFileSync(outputArg.slice("--outputFile=".length), JSON.stringify({ argv: process.argv.slice(2) }));',
    ].join("\n"));

    const execution = await shadow.executeVitestReference({
      executablePath: process.execPath,
      executableArgsPrefix: [entrypointPath],
      repositoryRoot: root,
    }, reportPath, shadow.REFERENCE_TIMEOUT_MS);
    expect(execution).toMatchObject({ outcome: "completed", exitCode: 0, cleanupComplete: true });
    expect(JSON.parse(await readFile(reportPath, "utf8"))).toEqual({
      argv: ["run", "--reporter=json", `--outputFile=${reportPath}`],
    });
  });

  it("uses native Windows tree termination and proves descendants do not survive cleanup", async () => {
    if (process.platform !== "win32") return;
    const controlRoot = await mkdtemp(join(tmpdir(), "ascout-t117-win-tree-"));
    const pidPath = join(controlRoot, "child.pid");
    const childProgram = "setInterval(() => {}, 1000);";
    const parentProgram = [
      'const { spawn } = require("node:child_process");',
      'const { writeFileSync } = require("node:fs");',
      `const child = spawn(process.execPath, ["-e", ${JSON.stringify(childProgram)}], { stdio: "ignore", windowsHide: true });`,
      "writeFileSync(process.argv[1], String(child.pid));",
      "setInterval(() => {}, 1000);",
    ].join("\n");
    const parent = spawn(process.execPath, ["-e", parentProgram, pidPath], {
      stdio: "ignore",
      windowsHide: true,
    });
    const parentPid = parent.pid ?? -1;
    expect(parentPid).toBeGreaterThan(0);
    let childPid = -1;
    try {
      childPid = await readPidEventually(pidPath);
      expect(processExists(parentPid)).toBe(true);
      expect(processExists(childPid)).toBe(true);
      expect(shadow.terminateWindowsProcessTree(parentPid)).toBe(true);
      expect(await waitForProcessExit(parentPid)).toBe(true);
      expect(await waitForProcessExit(childPid)).toBe(true);
    } finally {
      if (processExists(parentPid)) {
        try { process.kill(parentPid); } catch {}
      }
      if (childPid > 0 && processExists(childPid)) {
        try { process.kill(childPid); } catch {}
      }
      await rm(controlRoot, { recursive: true, force: true });
    }
  });

  it("uses exactly one 10-minute full-suite reference and preserves selector misses as successful non-gating evidence", async () => {
    const files = await evidenceFiles(receipt({
      findings: [{ task_id: "task-test", path: "tests/a.test.ts", rule_or_test_id: "captured" }],
    }));
    let referenceCalls = 0;
    let observedTimeout: number | null = null;
    let published: any = null;
    const observation = await shadow.runSelectorShadow(files, {
      captureSourceState: async () => stableState(),
      resolveRuntime: async () => ({ executablePath: "/trusted/vitest", version: "4.1.10", repositoryRoot: files.root }),
      executeReference: async (_runtime: any, reportPath: string, timeoutMs: number) => {
        referenceCalls += 1;
        observedTimeout = timeoutMs;
        await writeFile(reportPath, JSON.stringify({
          testResults: [{
            name: "tests/a.test.ts",
            status: "failed",
            assertionResults: [
              { status: "failed", fullName: "captured" },
              { status: "failed", fullName: "missed" },
            ],
          }],
        }));
        return { outcome: "completed", exitCode: 1, signal: null, durationMs: 40 };
      },
      normalizePath: async (name: string) => name,
      publish: async (value: any) => { published = value; },
    });
    expect(referenceCalls).toBe(1);
    expect(observedTimeout).toBe(10 * 60 * 1000);
    expect(observation.classification).toBe("SELECTOR_SHADOW_NON_GATING");
    expect(observation.comparison).toMatchObject({
      available: true,
      disposition: "SELECTOR_MISSES_OBSERVED",
      selector_misses: [{ path: "tests/a.test.ts", test_id: "missed" }],
    });
    expect(published).toEqual(observation);
  });

  it("publishes captured and zero-failure dispositions without thresholds", async () => {
    for (const scenario of [
      {
        findings: [{ task_id: "task-test", path: "tests/a.test.ts", rule_or_test_id: "failure" }],
        exitCode: 1,
        assertions: [{ status: "failed", fullName: "failure" }],
        disposition: "FULL_SUITE_FAILURES_CAPTURED",
      },
      {
        findings: [],
        exitCode: 0,
        assertions: [{ status: "passed", fullName: "pass" }],
        disposition: "NO_FULL_SUITE_FAILURES",
      },
    ]) {
      const files = await evidenceFiles(receipt({ findings: scenario.findings }));
      const observation = await shadow.runSelectorShadow(files, {
        captureSourceState: async () => stableState(),
        resolveRuntime: async () => ({ executablePath: "/trusted/vitest", version: "4.1.10", repositoryRoot: files.root }),
        executeReference: async (_runtime: any, reportPath: string) => {
          await writeFile(reportPath, JSON.stringify({
            testResults: [{ name: "tests/a.test.ts", status: scenario.exitCode === 0 ? "passed" : "failed", assertionResults: scenario.assertions }],
          }));
          return { outcome: "completed", exitCode: scenario.exitCode, signal: null, durationMs: 10 };
        },
        normalizePath: async (name: string) => name,
        publish: async () => {},
      });
      expect(observation.comparison.disposition).toBe(scenario.disposition);
      expect(observation.comparison.available).toBe(true);
    }
  });

  it("does not launch the reference for blocked, refused, or non-comparable test tasks", async () => {
    for (const mutate of [
      (value: any) => { value.tasks[0].status = "BLOCKED"; },
      (value: any) => { value.tasks[0].execution_admission = "refused_changed_surface"; },
      (value: any) => { value.selection.mode = "no_test_task"; },
    ]) {
      const value = receipt();
      mutate(value);
      const files = await evidenceFiles(value);
      let referenceCalls = 0;
      const observation = await shadow.runSelectorShadow(files, {
        captureSourceState: async () => stableState(),
        resolveRuntime: async () => ({ executablePath: "/trusted/vitest", version: "4.1.10", repositoryRoot: files.root }),
        executeReference: async () => { referenceCalls += 1; throw new Error("must not run"); },
        publish: async () => {},
      });
      expect(referenceCalls).toBe(0);
      expect(observation.comparison.disposition).toBe("UNAVAILABLE");
    }
  });

  it("keeps command-contract unavailability explicit without fallback execution", async () => {
    const files = await evidenceFiles();
    let referenceCalls = 0;
    const observation = await shadow.runSelectorShadow(files, {
      captureSourceState: async () => stableState(),
      resolveRuntime: async () => { throw new shadow.SelectorShadowUnavailableError("UNAVAILABLE_FULL_SUITE_CONTRACT"); },
      executeReference: async () => { referenceCalls += 1; throw new Error("must not run"); },
      publish: async () => {},
    });
    expect(referenceCalls).toBe(0);
    expect(observation.comparison).toMatchObject({
      available: false,
      disposition: "UNAVAILABLE",
      reason_code: "UNAVAILABLE_FULL_SUITE_CONTRACT",
    });
  });

  it("keeps timeout, spawn, missing report, malformed report, and untrustworthy nonzero exits unavailable without retry", async () => {
    const scenarios = [
      { result: { outcome: "timed_out", exitCode: null, signal: "SIGKILL", durationMs: 600000 }, write: null, code: "UNAVAILABLE_FULL_SUITE_EXECUTION" },
      { result: { outcome: "spawn_error", exitCode: null, signal: null, durationMs: 1 }, write: null, code: "UNAVAILABLE_FULL_SUITE_EXECUTION" },
      { result: { outcome: "completed", exitCode: 1, signal: null, durationMs: 1 }, write: null, code: "UNAVAILABLE_FULL_SUITE_EXECUTION" },
      { result: { outcome: "completed", exitCode: 1, signal: null, durationMs: 1 }, write: "{", code: "UNAVAILABLE_FULL_SUITE_REPORT" },
      { result: { outcome: "completed", exitCode: 1, signal: null, durationMs: 1 }, write: JSON.stringify({ testResults: [] }), code: "UNAVAILABLE_FULL_SUITE_REPORT" },
      { result: { outcome: "completed", exitCode: 0, signal: null, durationMs: 1 }, write: JSON.stringify({ testResults: [null] }), code: "UNAVAILABLE_FULL_SUITE_REPORT" },
      { result: { outcome: "completed", exitCode: 0, signal: null, durationMs: 1 }, write: JSON.stringify({ testResults: [{ name: "tests/a.test.ts", status: "passed" }] }), code: "UNAVAILABLE_FULL_SUITE_REPORT" },
    ];
    for (const scenario of scenarios) {
      const files = await evidenceFiles();
      let calls = 0;
      const observation = await shadow.runSelectorShadow(files, {
        captureSourceState: async () => stableState(),
        resolveRuntime: async () => ({ executablePath: "/trusted/vitest", version: "4.1.10", repositoryRoot: files.root }),
        executeReference: async (_runtime: any, reportPath: string) => {
          calls += 1;
          if (scenario.write !== null) await writeFile(reportPath, scenario.write);
          return scenario.result;
        },
        normalizePath: async (name: string) => name,
        publish: async () => {},
      });
      expect(calls).toBe(1);
      expect(observation.comparison.reason_code).toBe(scenario.code);
      expect(observation.comparison.available).toBe(false);
    }
  });

  it("fails integrity before publication when the reconstructed subject does not match M/HT", async () => {
    const files = await evidenceFiles();
    let published = false;
    await expect(shadow.runSelectorShadow(files, {
      captureSourceState: async () => ({ ...stableState(), headSha: H }),
      publish: async () => { published = true; },
    })).rejects.toMatchObject({ code: "source_binding_mismatch" });
    expect(published).toBe(false);
  });

  it("fails integrity when the declared HT is not the actual H tree", async () => {
    const files = await evidenceFiles();
    let published = false;
    await expect(shadow.runSelectorShadow(files, {
      captureSourceState: async () => ({ ...stableState(), targetHeadTreeSha: "e".repeat(40) }),
      publish: async () => { published = true; },
    })).rejects.toMatchObject({ code: "source_binding_mismatch" });
    expect(published).toBe(false);
  });

  it("turns post-reference source drift into explicit unavailable evidence", async () => {
    const files = await evidenceFiles();
    let sourceCalls = 0;
    const observation = await shadow.runSelectorShadow(files, {
      captureSourceState: async () => {
        sourceCalls += 1;
        return sourceCalls === 1 ? stableState() : { ...stableState(), unstagedClean: false };
      },
      resolveRuntime: async () => ({ executablePath: "/trusted/vitest", version: "4.1.10", repositoryRoot: files.root }),
      executeReference: async (_runtime: any, reportPath: string) => {
        await writeFile(reportPath, JSON.stringify({ testResults: [] }));
        return { outcome: "completed", exitCode: 0, signal: null, durationMs: 5 };
      },
      normalizePath: async (name: string) => name,
      publish: async () => {},
    });
    expect(sourceCalls).toBe(2);
    expect(observation.comparison).toMatchObject({
      available: false,
      reason_code: "UNAVAILABLE_SOURCE_DRIFT",
    });
  });

  it("keeps the published observation bounded and excludes raw output, absolute paths, environment, and credentials", async () => {
    const files = await evidenceFiles();
    let published: any;
    await shadow.runSelectorShadow(files, {
      captureSourceState: async () => stableState(),
      resolveRuntime: async () => ({ executablePath: "/secret/absolute/vitest", version: "4.1.10", repositoryRoot: files.root }),
      executeReference: async (_runtime: any, reportPath: string) => {
        await writeFile(reportPath, JSON.stringify({ testResults: [] }));
        return { outcome: "completed", exitCode: 0, signal: null, durationMs: 5, stdout: "TOKEN=secret", stderr: "/home/user" };
      },
      normalizePath: async (name: string) => name,
      publish: async (value: any) => { published = value; },
    });
    const text = JSON.stringify(published);
    expect(text).not.toContain("TOKEN=secret");
    expect(text).not.toContain("/secret/absolute/vitest");
    expect(text).not.toContain("/home/user");
    expect(text).not.toContain(files.root);
  });

  it("publishes atomically only to a new absolute file outside repository source identity", async () => {
    const repo = await mkdtemp(join(tmpdir(), "ascout-t117-publish-repo-"));
    const outside = await mkdtemp(join(tmpdir(), "ascout-t117-publish-outside-"));
    const output = join(outside, "selector-shadow-observation.json");
    const observation = { schema_version: 1, classification: "SELECTOR_SHADOW_NON_GATING" };
    await shadow.publishObservationAtomically(repo, output, observation);
    expect(JSON.parse(await readFile(output, "utf8"))).toEqual(observation);
    await expect(shadow.publishObservationAtomically(repo, output, observation)).rejects.toMatchObject({ code: "output_exists" });
    await expect(shadow.publishObservationAtomically(repo, join(repo, "inside.json"), observation)).rejects.toMatchObject({
      code: "output_inside_repository",
    });
  });

  it("fails closed on a final-path publication race without overwriting the competing file", async () => {
    const repo = await mkdtemp(join(tmpdir(), "ascout-t117-race-repo-"));
    const outside = await mkdtemp(join(tmpdir(), "ascout-t117-race-outside-"));
    const output = join(outside, "selector-shadow-observation.json");
    const observation = { schema_version: 1, classification: "SELECTOR_SHADOW_NON_GATING" };
    let raceCreated = false;
    await expect(shadow.publishObservationAtomically(repo, output, observation, {
      lstat,
      realpath,
      rm,
      unlink,
      writeFile,
      link: async (source: string, target: string) => {
        if (!raceCreated) {
          raceCreated = true;
          await writeFile(target, "competing-evidence\n", { flag: "wx", mode: 0o600 });
        }
        return fsLink(source, target);
      },
    })).rejects.toMatchObject({ code: "output_exists" });
    expect(await readFile(output, "utf8")).toBe("competing-evidence\n");
  });

  it("requires exact absolute CLI evidence paths and rejects extra or duplicate arguments", () => {
    const receiptPath = resolve(tmpdir(), "receipt.json");
    const envelopePath = resolve(tmpdir(), "envelope.json");
    const outputPath = resolve(tmpdir(), "observation.json");
    expect(shadow.parseCliArguments([
      "--receipt", receiptPath,
      "--envelope", envelopePath,
      "--output", outputPath,
    ])).toEqual({ receiptPath, envelopePath, outputPath });
    expect(() => shadow.parseCliArguments(["--receipt", receiptPath])).toThrowError(
      expect.objectContaining({ code: "cli_invalid" }),
    );
    expect(() => shadow.parseCliArguments([
      "--receipt", receiptPath,
      "--receipt", receiptPath,
      "--output", outputPath,
    ])).toThrowError(expect.objectContaining({ code: "cli_invalid" }));
  });

  it("freezes the reference timeout constant at exactly ten minutes", () => {
    expect(shadow.REFERENCE_TIMEOUT_MS).toBe(600_000);
  });
});
