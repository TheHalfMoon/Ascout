import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  STRYKER_OUTPUT_LIMITS,
  translateStrykerOutputV1,
} from "../src/assurance/test/stryker-output.js";

const identity = { source_identity: "tree:e03", head_sha: "a".repeat(40), attempt_id: "attempt:1" };
const hash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
function report(statuses = ["Killed"], path = "src.js"): Record<string, unknown> {
  return {
    schemaVersion: "1.0", framework: { name: "StrykerJS", version: "10.0.0" },
    files: { [path]: { mutants: statuses.map((status, id) => ({ id: String(id), status })) } },
  };
}
function translate(value: unknown, changes: Record<string, unknown> = {}) {
  const bytes = Buffer.from(JSON.stringify(value));
  return translateStrykerOutputV1({
    bytes, expected: { ...identity, report_sha256: hash(bytes) }, observed: identity,
    complete: true, process_exit_code: 0, ...changes,
  });
}

describe("bounded Stryker output translation", () => {
  it("retains five killed mutants as a blocked untrusted observation through the existing adapter", () => {
    const output = translate(report(Array(5).fill("Killed")));
    expect(output.observation).toMatchObject({ attempted_count: 5, killed_count: 5, survived_count: 0,
      canonical_status: "UNTRUSTED_OBSERVATION", authority: "NONE_UNTRUSTED", source_status: "PASS" });
    expect(output.observation.blocking_reasons).toContain("external-runner:limitation:stryker:untrusted-report");
    expect(output.mutants.map((m) => m.mutant_id)).toEqual(["src.js#0", "src.js#1", "src.js#2", "src.js#3", "src.js#4"]);
    expect(output).not.toHaveProperty("verdict");
    expect(Object.isFrozen(output.mutants[0])).toBe(true);
    expect(Object.isFrozen(output.status_counts)).toBe(true);
  });

  it("preserves four survivors despite process exit zero", () => {
    const output = translate(report(["Killed", "Survived", "Survived", "Survived", "Survived"]));
    expect(output.observation.source_status).toBe("FAIL");
    expect(output.observation.survived_mutants).toEqual(["src.js#1", "src.js#2", "src.js#3", "src.js#4"]);
  });

  it("retains every non-killed status without treating timeout or no coverage as killed", () => {
    const statuses = ["Killed", "Survived", "Timeout", "NoCoverage", "CompileError", "RuntimeError", "Ignored", "Pending"];
    const output = translate(report(statuses));
    expect(output.generated_count).toBe(8);
    expect(output.observation).toMatchObject({ attempted_count: 6, killed_count: 1, survived_count: 1, source_status: "ERROR" });
    expect(output.mutants.map((m) => m.status)).toEqual(statuses);
    for (const status of statuses) expect(output.status_counts[status as keyof typeof output.status_counts]).toBe(1);
  });

  it.each(["Timeout", "NoCoverage", "Ignored", "Pending"])("keeps %s incomplete", (status) => {
    expect(translate(report([status])).observation.source_status).not.toBe("PASS");
  });

  it("does not pass incomplete, empty, or failed processes", () => {
    expect(translate(report(), { complete: false }).observation.source_status).not.toBe("PASS");
    expect(translate(report([])).observation.source_status).not.toBe("PASS");
    expect(translate(report(), { process_exit_code: 1 }).observation.source_status).toBe("ERROR");
    expect(() => translate(report(), { complete: "true" })).toThrow();
    expect(() => translate(report(), { process_exit_code: 0.5 })).toThrow();
  });

  it("binds original bytes and rejects source, head, attempt, and digest mismatch", () => {
    const bytes = Buffer.from(JSON.stringify(report(), null, 2));
    const output = translate(report(), { bytes, expected: { ...identity, report_sha256: hash(bytes) } });
    expect(output.observation.result_digest).toBe(hash(bytes));
    expect(output.attempt_id).toBe(identity.attempt_id);
    for (const field of ["source_identity", "head_sha", "attempt_id"]) {
      expect(() => translate(report(), { observed: { ...identity, [field]: "foreign" } })).toThrow("binding");
    }
    expect(() => translate(report(), { expected: { ...identity, report_sha256: "b".repeat(64) } })).toThrow("digest");
  });

  it.each(["../src.js", "./src.js", "a/../src.js", "a//src.js", "/src.js", "C:/src.js", "a\\src.js", "a/", "a\u0000.js", "a%2fsrc.js", "a*.js", "a|b.js", "aux.js", "a/COM1"])("rejects raw unsafe path %j before any normalization", (path) => {
    expect(() => translate(report(["Killed"], path))).toThrow("path");
  });

  it("rejects unsupported schema, producer version, unknown statuses, missing fields, duplicates and malformed counts", () => {
    for (const value of [
      { ...report(), schemaVersion: "2.0" },
      { ...report(), framework: { name: "StrykerJS", version: "11.0.0" } },
      report(["Unknown"]), { ...report(), files: [] },
      { ...report(), files: { "src.js": { mutants: [{ id: "0", status: "Killed" }, { id: "0", status: "Survived" }] } } },
      { ...report(), files: { "src.js": { mutants: [{ id: "", status: "Killed" }] } } },
      { ...report(), files: { "src.js": { mutants: [{ id: "0", status: "Killed", testsCompleted: -1 }] } } },
    ]) expect(() => translate(value)).toThrow();
  });

  it("rejects invalid UTF-8, truncated JSON and bounded resource overflows", () => {
    for (const bytes of [Buffer.from([0xff]), Buffer.from('{"files":'), Buffer.alloc(STRYKER_OUTPUT_LIMITS.bytes + 1)]) {
      expect(() => translate(report(), { bytes, expected: { ...identity, report_sha256: hash(bytes) } })).toThrow();
    }
    expect(() => translate(report(["Killed"], "a".repeat(301)))).toThrow();
    const tooManyFiles = Object.fromEntries(Array.from({ length: STRYKER_OUTPUT_LIMITS.files + 1 }, (_, i) => [`f${i}`, { mutants: [] }]));
    expect(() => translate({ ...report(), files: tooManyFiles })).toThrow();
    expect(() => translate(report(Array(STRYKER_OUTPUT_LIMITS.mutants + 1).fill("Killed")))).toThrow();
    expect(() => translate({ ...report(), files: { "x.js": { mutants: [{ id: "a".repeat(129), status: "Killed" }] } } })).toThrow();
  });

  it("rejects duplicate JSON keys, escaped duplicate keys, deep input and cross-file duplicate IDs", () => {
    for (const text of ['{"files":{},"files":{}}', '{"files":{},"\\u0066iles":{}}', '['.repeat(129) + ']'.repeat(129)]) {
      const bytes = Buffer.from(text);
      expect(() => translate(report(), { bytes, expected: { ...identity, report_sha256: hash(bytes) } })).toThrow();
    }
    expect(() => translate({ ...report(), files: { "a.js": { mutants: [{ id: "0", status: "Killed" }] }, "b.js": { mutants: [{ id: "0", status: "Killed" }] } } })).toThrow("duplicate");
  });

  it("preserves bounded status reasons, rejecting oversized or malformed reasons without truncation", () => {
    const withReason = (statusReason: unknown) => ({ ...report(), files: { "src.js": { mutants: [{ id: "0", status: "RuntimeError", statusReason }] } } });
    expect(translate(withReason("runner failed\nline two")).mutants[0]?.status_reason).toBe("runner failed\nline two");
    expect(translate(withReason("x".repeat(4096))).mutants[0]?.status_reason?.length).toBe(4096);
    for (const reason of ["x".repeat(4097), "bad\u0000reason", 1, null]) expect(() => translate(withReason(reason))).toThrow("statusReason");
  });

  it("orders inventory deterministically without mutating caller objects", () => {
    const first = report(["Survived"]);
    const second = { ...first, files: { "z.js": { mutants: [{ id: "z", status: "Killed" }] }, "a.js": { mutants: [{ id: "a", status: "Survived" }] } } };
    const before = structuredClone(second);
    expect(translate(second).mutants.map((m) => m.mutant_id)).toEqual(["a.js#a", "z.js#z"]);
    expect(translate(second)).toEqual(translate(second));
    expect(second).toEqual(before);
  });
});
