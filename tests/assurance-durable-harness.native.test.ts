import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { AscoutDurableHarness } from "../src/assurance/workflow/durable-harness-store.js";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const binding = {
  repository_identity: { repository_id: "remote:" + hash("native-repository"), repository_id_kind: "remote" as const, portable: true },
  run_identity: hash("native-run"), subject_head: "a".repeat(40), source_tree_sha256: hash("tree"), configuration_sha256: hash("config"), policy_identity: hash("policy"),
};
const call = { call_identity: hash("native-call"), attempt_identity: hash("native-attempt"), tool_name: "observe", input_sha256: hash("input"), replay: "never" as const };
const roots: string[] = [];
let compiled: string;
let moduleUrl: string;
beforeAll(() => {
  compiled = mkdtempSync(join(tmpdir(), "ascout-durable-code-"));
  writeFileSync(join(compiled, "package.json"), '{"type":"module"}');
  // Isolated copies of actual source; never rebuild shared dist/ inside a test.
  for (const name of ["workflow/durable-harness", "workflow/durable-harness-store", "workflow/stage-attempt-model", "workflow/freshness-engine", "workflow/kodac-capability-characterization", "workflow/idempotency-reconciliation", "contracts/canonical-serialization"]) {
    const source = readFileSync(resolve("src/assurance", name + ".ts"), "utf8");
    const target = join(compiled, name + ".js"); mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true } }).outputText);
  }
  moduleUrl = pathToFileURL(join(compiled, "workflow/durable-harness-store.js")).href;
});
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
afterAll(() => { if (compiled) rmSync(compiled, { recursive: true, force: true }); });
function fixture() { const root = mkdtempSync(join(tmpdir(), "ascout-durable-native-")); roots.push(root); return root; }
function child(root: string, body: string, preamble = "") {
  const script = `${preamble}\nconst {AscoutDurableHarness} = await import(${JSON.stringify(moduleUrl)}); const root=${JSON.stringify(root)}, binding=${JSON.stringify(binding)}, call=${JSON.stringify(call)}; ${body}`;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], { cwd: root, encoding: "utf8", timeout: 10_000 });
  expect(result.error).toBeUndefined();
  return result;
}

describe("Ascout Durable Harness: real cross-process interruption", () => {
  it("restores a committed result in a new process without repeating any work", () => {
    const root = fixture();
    const first = child(root, 'const s=await AscoutDurableHarness.create(root,binding); await s.begin(call); await s.complete({call_identity:call.call_identity,attempt_identity:call.attempt_identity,state:"SUCCEEDED",evidence_sha256:"e".repeat(64)});');
    expect(first.status, first.stderr).toBe(0);
    const second = child(root, 'const s=await AscoutDurableHarness.open(root,binding); console.log(JSON.stringify(await s.recover()));');
    expect(second.status, second.stderr).toBe(0);
    expect(JSON.parse(second.stdout).calls).toMatchObject([{ disposition: "RECORDED_SUCCESS", execute: false, evidence_sha256: "e".repeat(64) }]);
  });

  it("retains an intent when its process exits before the outcome", async () => {
    const root = fixture();
    const result = child(root, "const s=await AscoutDurableHarness.create(root,binding); await s.begin(call); process.exit(72);");
    expect(result.status, result.stderr).toBe(72);
    const reopened = await AscoutDurableHarness.open(root, binding);
    expect((await reopened.recover()).calls).toMatchObject([{ disposition: "RECONCILIATION_REQUIRED", execute: false, evidence_sha256: null }]);
  });

  it("blocks recovery after a real process exit before atomic replacement, retaining the prior snapshot", async () => {
    const root = fixture();
    await AscoutDurableHarness.create(root, binding);
    const directory = join(root, ".ascout", "durable-harness");
    const filename = join(directory, binding.run_identity + ".json");
    const original = readFileSync(filename, "utf8");
    // Patch only this child's native rename, after the real temporary-file flush.
    const result = child(root, "const s=await AscoutDurableHarness.open(root,binding); await s.begin(call);", 'import fs from "node:fs/promises"; import {syncBuiltinESMExports} from "node:module"; fs.rename=async()=>{process.exit(73);}; syncBuiltinESMExports();');
    expect(result.status, result.stderr).toBe(73);
    expect(readFileSync(filename, "utf8")).toBe(original);
    const reopened = await AscoutDurableHarness.open(root, binding);
    await expect(reopened.recover()).rejects.toThrow();
    expect(readdirSync(directory)).toContain(binding.run_identity + ".lock");
    expect(readdirSync(directory).some((name) => name.endsWith(".tmp"))).toBe(true);
    // The child is proven stopped. Explicit operator repair of owned fixture only.
    rmdirSync(join(directory, binding.run_identity + ".lock"));
    for (const name of readdirSync(directory)) if (name.startsWith(binding.run_identity + ".") && name.endsWith(".tmp")) unlinkSync(join(directory, name));
    expect((await reopened.recover()).calls).toEqual([]);
    expect(readFileSync(filename, "utf8")).toBe(original);
  });
});
