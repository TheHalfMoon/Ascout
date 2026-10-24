import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, rm, rmdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AscoutDurableHarness } from "../src/assurance/workflow/durable-harness-store.js";
import type { DurableHarnessBindingV1, DurableHarnessCallV1 } from "../src/assurance/workflow/durable-harness.js";
import { canonicalAssuranceJsonV1, canonicalAssuranceSha256V1 } from "../src/assurance/contracts/canonical-serialization.js";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const binding: DurableHarnessBindingV1 = {
  repository_identity: { repository_id: "remote:" + hash("repository"), repository_id_kind: "remote", portable: true },
  run_identity: hash("run"), subject_head: "a".repeat(40),
  source_tree_sha256: hash("tree"), configuration_sha256: hash("config"), policy_identity: hash("policy"),
};
const call: DurableHarnessCallV1 = {
  call_identity: hash("call"), attempt_identity: hash("attempt"),
  tool_name: "read_ci", input_sha256: hash("input"), replay: "safe",
};
const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "ascout-durable-"));
  roots.push(root);
  return root;
}
const stateDirectory = (root: string) => join(root, ".ascout", "durable-harness");
const snapshot = (root: string) => join(stateDirectory(root), binding.run_identity + ".json");
const outcome = (state: "SUCCEEDED" | "FAILED") => ({
  call_identity: call.call_identity, attempt_identity: call.attempt_identity,
  state, evidence_sha256: hash(state),
});
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

describe("Ascout Durable Harness: bounded local recovery observations", () => {
  it("creates ignored state even when the repository has no root ignore rule", async () => {
    const root = await fixture();
    execFileSync("git", ["init", "-q"], { cwd: root });
    const store = await AscoutDurableHarness.create(root, binding);
    await store.begin(call);
    expect(execFileSync("git", ["check-ignore", ".ascout/durable-harness/" + binding.run_identity + ".json"], { cwd: root, encoding: "utf8" })).toContain(".json");
    expect(execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })).toBe("");
    expect((await store.recover()).calls[0]).toMatchObject({ disposition: "REVALIDATION_REQUIRED", execute: false });
  });

  it("distinguishes an explicitly created empty journal from missing state", async () => {
    const root = await fixture();
    await expect(AscoutDurableHarness.open(root, binding)).rejects.toThrow();
    const store = await AscoutDurableHarness.create(root, binding);
    expect((await store.recover()).calls).toEqual([]);
    await expect(AscoutDurableHarness.create(root, binding)).rejects.toThrow();
  });

  it.each(["SUCCEEDED", "FAILED"] as const)("retains a terminal %s result across reopening without effect execution", async (state) => {
    const root = await fixture();
    const store = await AscoutDurableHarness.create(root, binding);
    await store.begin(call);
    await store.complete(outcome(state));
    const reopened = await AscoutDurableHarness.open(root, binding);
    expect((await reopened.recover()).calls[0]).toMatchObject({
      disposition: state === "SUCCEEDED" ? "RECORDED_SUCCESS" : "RECORDED_FAILURE",
      evidence_sha256: hash(state), execute: false,
    });
    await expect(reopened.complete(outcome(state))).rejects.toThrow();
    const before = await readFile(snapshot(root), "utf8");
    await reopened.begin(call);
    expect(await readFile(snapshot(root), "utf8")).toBe(before);
  });

  it("retains the original failure when a caller records a distinct later attempt", async () => {
    const root = await fixture();
    const store = await AscoutDurableHarness.create(root, binding);
    await store.begin(call); await store.complete(outcome("FAILED"));
    const next = { ...call, call_identity: hash("next-call"), attempt_identity: hash("next-attempt") };
    await store.begin(next);
    await store.complete({ ...outcome("SUCCEEDED"), call_identity: next.call_identity, attempt_identity: next.attempt_identity });
    expect((await store.recover()).calls.map((c) => c.disposition)).toEqual(["RECORDED_FAILURE", "RECORDED_SUCCESS"]);
  });

  it("never authorizes replay of an unfinished side effect", async () => {
    const root = await fixture();
    const store = await AscoutDurableHarness.create(root, binding);
    await store.begin({ ...call, replay: "never" });
    expect((await store.recover()).calls[0]).toMatchObject({ disposition: "RECONCILIATION_REQUIRED", evidence_sha256: null, execute: false });
  });

  it.each(["subject_head", "source_tree_sha256", "configuration_sha256", "policy_identity", "repository_identity"] as const)("requires revalidation for changed %s with no evidence promoted", async (field) => {
    const root = await fixture();
    const store = await AscoutDurableHarness.create(root, binding);
    await store.begin(call); await store.complete(outcome("SUCCEEDED"));
    const changed = { ...binding, [field]: field === "repository_identity"
      ? { ...binding.repository_identity, repository_id: "remote:" + hash("other-repository") }
      : field === "subject_head" ? "b".repeat(40) : hash("other") };
    const reopened = await AscoutDurableHarness.open(root, changed);
    expect(await reopened.recover()).toMatchObject({ binding_current: false, calls: [{ disposition: "REVALIDATION_REQUIRED", evidence_sha256: null, execute: false }] });
    await expect(reopened.begin({ ...call, call_identity: hash("new") })).rejects.toThrow();
  });

  it("rejects altered memo keys, foreign attempts, missing results and unbounded raw input", async () => {
    const root = await fixture();
    const store = await AscoutDurableHarness.create(root, binding);
    await store.begin(call);
    for (const changed of [{ input_sha256: hash("other") }, { tool_name: "write_ci" }, { replay: "never" }, { attempt_identity: hash("other") }]) {
      await expect(store.begin({ ...call, ...changed } as DurableHarnessCallV1)).rejects.toThrow();
    }
    await expect(store.complete({ ...outcome("SUCCEEDED"), attempt_identity: hash("foreign") })).rejects.toThrow();
    await expect(store.complete({ ...outcome("SUCCEEDED"), evidence_sha256: "" })).rejects.toThrow();
    await expect(store.begin({ ...call, arguments: "secret raw arguments" } as DurableHarnessCallV1)).rejects.toThrow();
    await expect(store.begin({ ...call, tool_name: "x".repeat(129) })).rejects.toThrow();
    expect(await readFile(snapshot(root), "utf8")).not.toContain("secret raw arguments");
  });

  it.each([
    { repository_id: "https://user:password@example.invalid/repo", repository_id_kind: "remote", portable: true },
    { repository_id: "remote:" + hash("r"), repository_id_kind: "remote", portable: false },
    { repository_id: "local:" + hash("r"), repository_id_kind: "local_only", portable: true },
  ])("rejects invalid repository identity %# before persistence", async (repository_identity) => {
    const root = await fixture();
    await expect(AscoutDurableHarness.create(root, { ...binding, repository_identity } as DurableHarnessBindingV1)).rejects.toThrow();
    await expect(lstat(join(root, ".ascout"))).rejects.toThrow();
  });

  it("supports privacy-safe local identity and never persists the repository path", async () => {
    const root = await fixture();
    await AscoutDurableHarness.create(root, { ...binding, repository_identity: { repository_id: "local:" + hash(root), repository_id_kind: "local_only", portable: false } });
    const bytes = await readFile(snapshot(root), "utf8");
    expect(bytes).not.toContain(root);
    expect(bytes).not.toContain("arguments");
  });

  it.each(["{", '{"schema_version":1}', " ".repeat(1024 * 1024 + 1)])("fails closed on corrupt, truncated or oversized snapshots %#", async (data) => {
    const root = await fixture();
    await AscoutDurableHarness.create(root, binding);
    await writeFile(snapshot(root), data);
    await expect(AscoutDurableHarness.open(root, binding)).rejects.toThrow();
  });

  it("detects checksum changes and duplicate call identities", async () => {
    const root = await fixture();
    const store = await AscoutDurableHarness.create(root, binding);
    await store.begin(call);
    const data = JSON.parse(await readFile(snapshot(root), "utf8"));
    data.payload.calls[0].input_sha256 = hash("tampered");
    await writeFile(snapshot(root), JSON.stringify(data));
    await expect(AscoutDurableHarness.open(root, binding)).rejects.toThrow();
    data.payload.calls.push(data.payload.calls[0]);
    data.sha256 = canonicalAssuranceSha256V1(data.payload);
    await writeFile(snapshot(root), canonicalAssuranceJsonV1(data) + "\n");
    await expect(AscoutDurableHarness.open(root, binding)).rejects.toThrow();
  });

  it("refuses call257 while preserving the valid bounded journal", async () => {
    const root = await fixture();
    const store = await AscoutDurableHarness.create(root, binding);
    await store.begin(call);
    const data = JSON.parse(await readFile(snapshot(root), "utf8"));
    data.payload.calls = Array.from({ length: 256 }, (_, n) => ({ ...data.payload.calls[0], call_identity: hash("call" + n), attempt_identity: hash("attempt" + n) }));
    data.sha256 = canonicalAssuranceSha256V1(data.payload);
    const original = canonicalAssuranceJsonV1(data) + "\n";
    await writeFile(snapshot(root), original);
    const reopened = await AscoutDurableHarness.open(root, binding);
    await expect(reopened.begin(call)).rejects.toThrow();
    expect(await readFile(snapshot(root), "utf8")).toBe(original);
  });

  it("bounds calls and refuses a concurrent or abandoned lock without stealing it", async () => {
    const root = await fixture();
    const store = await AscoutDurableHarness.create(root, binding);
    const lock = join(stateDirectory(root), binding.run_identity + ".lock");
    await mkdir(lock);
    await expect(store.begin(call)).rejects.toThrow();
    await expect(store.recover()).rejects.toThrow();
    expect((await lstat(lock)).isDirectory()).toBe(true);
    await rmdir(lock);
    const results = await Promise.allSettled([store.begin(call), store.begin({ ...call, call_identity: hash("race"), attempt_identity: hash("race-attempt") })]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await store.recover()).calls).toHaveLength(1);
  });

  it("rejects symlink-managed directories, symlink snapshots and conflicting ignore content", async () => {
    const root = await fixture();
    const outside = await fixture();
    await symlink(outside, join(root, ".ascout"), process.platform === "win32" ? "junction" : "dir");
    await expect(AscoutDurableHarness.create(root, binding)).rejects.toThrow();
    const other = await fixture();
    await AscoutDurableHarness.create(other, binding);
    await writeFile(join(stateDirectory(other), ".gitignore"), "!*.json\n");
    await expect(AscoutDurableHarness.open(other, binding)).rejects.toThrow();
    await writeFile(join(stateDirectory(other), ".gitignore"), "*\n");
    await rm(snapshot(other));
    const target = join(outside, "foreign.json"); await writeFile(target, "do not touch");
    // Directory links work without elevated symlink permission on Windows.
    await symlink(outside, snapshot(other), process.platform === "win32" ? "junction" : "dir");
    await expect(AscoutDurableHarness.open(other, binding)).rejects.toThrow();
    expect(await readFile(target, "utf8")).toBe("do not touch");
  });
});
