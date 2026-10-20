import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  normalizeReviewBatchV1,
  normalizeReviewBatchWithAccountingV1,
} from "../src/assurance/review/finding-normalization.js";
import type { DiagnosticBatchInputV1 } from "../src/assurance/review/diagnostic-accounting.js";
import { validateObservationLocationV1 } from "../src/assurance/review/location-validator.js";
import type { RawReviewObservationV1 } from "../src/assurance/review/raw-observation.js";

const binding = Object.freeze({
  engine_id: "engine:e01",
  binary_name: "review-engine",
  observed_version: "1.0.0",
  profile_id: "profile:e01",
  capsule_id: "capsule:e01",
  head_sha: "a".repeat(40),
});
const context = Object.freeze({
  expected_head_sha: binding.head_sha,
  known_files: Object.freeze(["src/a.ts"]),
  file_line_counts: Object.freeze({ "src/a.ts": 10 }),
});

function observation(id: string, overrides: Partial<RawReviewObservationV1> = {}): RawReviewObservationV1 {
  return Object.freeze({
    schema_version: 1,
    authority: "NONE_UNTRUSTED",
    observation_id: id,
    producer_class: "RULE",
    severity_hint: "major",
    category_hint: "correctness",
    body: "Independent deterministic diagnostic fixture.",
    location_hint: Object.freeze({ path: "src/a.ts", start_line: 2, end_line: 2 }),
    rule_id: "rule:e01",
    confidence: null,
    execution_binding: binding,
    ...overrides,
  });
}

// Original, independently authored inventory: never derive IDs from retained output.
const originals = Object.freeze([
  observation("diag:retained"),
  observation("diag:suppressed"),
  observation("diag:locationless", { location_hint: null }),
  observation("diag:diff-excluded"),
  observation("diag:invalid-path", {
    location_hint: Object.freeze({ path: "src/../a.ts", start_line: 2, end_line: 2 }),
  }),
  observation("diag:invalid-body", { body: "" }),
  observation("diag:missing"),
  observation("diag:unknown-location", {
    location_hint: Object.freeze({ path: "src/unknown.ts", start_line: 2, end_line: 2 }),
  }),
]);

function entry(source: RawReviewObservationV1) {
  return { observation: source, validation: validateObservationLocationV1(source, context) };
}

function fixture(): DiagnosticBatchInputV1 {
  return {
    execution_binding: binding,
    observations: originals,
    entries: [entry(originals[0]!), entry(originals[2]!), entry(originals[7]!)],
    exclusions: [
      { observation_id: "diag:suppressed", execution_binding: binding, kind: "PRODUCER_SUPPRESSION", reason: "Accepted producer suppression: rule:e01." },
      { observation_id: "diag:diff-excluded", execution_binding: binding, kind: "DIFF_EXCLUSION", reason: "Location outside the selected diff." },
    ],
    location_context: context,
    coverage: {
      target_id: "target:e01",
      head_sha: binding.head_sha,
      groups: [{ group_id: "group:e01", files: ["src/a.ts", "src/unreviewed.ts"] }],
      reviewed_files: ["src/a.ts"],
    },
  };
}

describe("REA-E01 original diagnostic loss accounting", () => {
  it("pins the original eight-input fixture bytes independently of output", () => {
    expect(originals).toHaveLength(8);
    expect(createHash("sha256").update(JSON.stringify(originals), "utf8").digest("hex"))
      .toBe("b263eca813c783238e59a96fc468000f34f379460f41b95ccdde7ba2b22fde29");
  });

  it("accounts every original once and returns retained records with separate file coverage", () => {
    const input = fixture();
    const result = normalizeReviewBatchWithAccountingV1(input);
    expect(result.records).toEqual(normalizeReviewBatchV1(input.entries));
    expect(result.records.map((record) => record.location_state)).toEqual([
      "VALID", "NO_LOCATION", "HALLUCINATED_PATH",
    ]);
    expect(result.accounting.entries.map(({ observation_id, state }) => [observation_id, state])).toEqual([
      ["diag:retained", "RETAINED"],
      ["diag:suppressed", "PRODUCER_SUPPRESSION"],
      ["diag:locationless", "RETAINED"],
      ["diag:diff-excluded", "DIFF_EXCLUSION"],
      ["diag:invalid-path", "REJECTED_INPUT"],
      ["diag:invalid-body", "REJECTED_INPUT"],
      ["diag:missing", "MISSING_OUTPUT"],
      ["diag:unknown-location", "RETAINED"],
    ]);
    expect(result.accounting.execution_binding).toEqual(binding);
    expect(result.accounting.complete).toBe(false);
    expect(result.accounting.entries.filter((item) => item.state !== "RETAINED")
      .every((item) => item.reasons.length > 0)).toBe(true);
    expect(result.coverage.complete).toBe(false);
    expect(result.coverage.unreviewed_files).toEqual(["src/unreviewed.ts"]);
    expect(JSON.stringify(result)).not.toMatch(/"(?:status|outcome)":"PASS"/u);
    expect(Object.isFrozen(result.accounting.entries)).toBe(true);
    expect(Object.isFrozen(result.accounting.execution_binding)).toBe(true);
  });

  it("complete accounting preserves exclusions, rejected inputs and location uncertainty without granting coverage", () => {
    const input = fixture();
    const result = normalizeReviewBatchWithAccountingV1({
      ...input, entries: [...input.entries, entry(originals[6]!)],
    });
    expect(result.accounting.complete).toBe(true);
    expect(result.accounting.entries).toHaveLength(8);
    expect(result.accounting.entries.filter((item) => item.state === "REJECTED_INPUT")).toHaveLength(2);
    expect(result.records.filter((record) => !record.promotable)).toHaveLength(2);
    expect(result.coverage.complete).toBe(false);
  });

  it("an empty diagnostic inventory does not fill missing file coverage", () => {
    const result = normalizeReviewBatchWithAccountingV1({
      ...fixture(), observations: [], entries: [], exclusions: [],
    });
    expect(result.records).toEqual([]);
    expect(result.accounting.entries).toEqual([]);
    expect(result.coverage.complete).toBe(false);
  });

  it.each(["src/../a.ts", "./src/a.ts", "src\\a.ts", "/src/a.ts", "C:/src/a.ts"])(
    "rejects original unsafe spelling %s without repairing it",
    (path) => {
      const source = observation("diag:unsafe", { location_hint: { path, start_line: 2, end_line: 2 } });
      const result = normalizeReviewBatchWithAccountingV1({
        ...fixture(), observations: [source], entries: [entry(source)], exclusions: [],
      });
      expect(result.records).toEqual([]);
      expect(result.accounting.entries[0]).toMatchObject({
        observation_id: "diag:unsafe", state: "REJECTED_INPUT", reasons: ["location path invalid"],
      });
      expect(source.location_hint?.path).toBe(path);
    },
  );

  it("rejects silently repaired output even when its original input was invalid", () => {
    const input = fixture();
    expect(() => normalizeReviewBatchWithAccountingV1({
      ...input, entries: [...input.entries, entry(observation("diag:invalid-path"))],
    })).toThrow(/original/u);
  });

  it.each([42, null, undefined, ["src/a.ts"]])("rejects non-string raw path %j without coercion", (path) => {
    const source = observation("diag:nonstring-path", {
      location_hint: { path: path as never, start_line: 2, end_line: 2 },
    });
    const result = normalizeReviewBatchWithAccountingV1({
      ...fixture(), observations: [source], entries: [entry(source)], exclusions: [],
    });
    expect(result.records).toEqual([]);
    expect(result.accounting.entries[0]?.state).toBe("REJECTED_INPUT");
  });

  it.each(["observations", "entries", "exclusions"] as const)("fails closed on duplicate %s", (key) => {
    const input = fixture();
    expect(() => normalizeReviewBatchWithAccountingV1({ ...input, [key]: [...input[key], input[key][0]!] })).toThrow(/duplicate/u);
  });

  it("fails closed when an exclusion and output both claim the same input", () => {
    const input = fixture();
    expect(() => normalizeReviewBatchWithAccountingV1({
      ...input, entries: [...input.entries, entry(originals[1]!)],
    })).toThrow(/duplicate/u);
  });

  it.each(["output", "exclusion"])("rejects foreign %s IDs", (kind) => {
    const input = fixture();
    expect(() => normalizeReviewBatchWithAccountingV1(kind === "output" ? {
      ...input, entries: [...input.entries, entry(observation("diag:foreign"))],
    } : {
      ...input, exclusions: [...input.exclusions, { ...input.exclusions[0]!, observation_id: "diag:foreign" }],
    })).toThrow(/undeclared/u);
  });

  it.each(Object.keys(binding) as (keyof typeof binding)[])("rejects changed output execution field %s", (key) => {
    const input = fixture();
    const changed = observation("diag:retained", { execution_binding: { ...binding, [key]: "b".repeat(40) } });
    expect(() => normalizeReviewBatchWithAccountingV1({ ...input, entries: [entry(changed)] })).toThrow(/binding|original/u);
  });

  it("rejects stale locationless originals and stale exclusions", () => {
    const input = fixture();
    expect(() => normalizeReviewBatchWithAccountingV1({
      ...input, observations: [observation("diag:locationless", { location_hint: null, execution_binding: { ...binding, head_sha: "b".repeat(40) } })], entries: [], exclusions: [],
    })).toThrow(/binding/u);
    expect(() => normalizeReviewBatchWithAccountingV1({
      ...input, exclusions: [{ ...input.exclusions[0]!, execution_binding: { ...binding, capsule_id: "capsule:stale" } }],
    })).toThrow(/binding/u);
  });

  it("rejects altered same-ID payload and cross-wired or invented location validation", () => {
    const input = fixture();
    expect(() => normalizeReviewBatchWithAccountingV1({
      ...input, entries: [entry(observation("diag:retained", { body: "Changed producer output." }))],
    })).toThrow(/original/u);
    for (const validation of [
      { ...input.entries[0]!.validation, observation_id: "diag:foreign" },
      { ...input.entries[2]!.validation, state: "VALID" as const, reasons: [] },
    ]) {
      const source = validation.observation_id === "diag:foreign" ? originals[0]! : originals[7]!;
      expect(() => normalizeReviewBatchWithAccountingV1({ ...input, entries: [{ observation: source, validation }] })).toThrow(/validation/u);
    }
  });

  it("rejects missing exclusion reasons, unsupported exclusions and suppression of rejected input", () => {
    const input = fixture();
    for (const exclusion of [
      { ...input.exclusions[0]!, reason: " " },
      { ...input.exclusions[0]!, kind: "CLEAN" as never },
      { ...input.exclusions[0]!, observation_id: "diag:invalid-path" },
    ]) {
      expect(() => normalizeReviewBatchWithAccountingV1({ ...input, exclusions: [exclusion] })).toThrow(TypeError);
    }
  });

  it("rejects a mismatched coverage/location head, invalid identity and invalid original ID", () => {
    const input = fixture();
    for (const changed of [
      { ...input, coverage: { ...input.coverage, head_sha: "b".repeat(40) } },
      { ...input, location_context: { ...context, expected_head_sha: "b".repeat(40) } },
      { ...input, execution_binding: { ...binding, capsule_id: "" } },
      { ...input, observations: [observation("../unsafe-id")], entries: [], exclusions: [] },
    ]) {
      expect(() => normalizeReviewBatchWithAccountingV1(changed)).toThrow(TypeError);
    }
  });
});
