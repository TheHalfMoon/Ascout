import { describe, expect, it } from "vitest";

import {
  correlateReviewRecordsV1,
  correlationKeyForRecordV1,
  type CorrelationResultV1,
} from "../src/assurance/review/dedup-correlation.js";
import { normalizeReviewFindingV1 } from "../src/assurance/review/finding-normalization.js";
import type { LocationValidationV1 } from "../src/assurance/review/location-validator.js";
import type { RawReviewObservationV1 } from "../src/assurance/review/raw-observation.js";

function observation(
  id: string,
  overrides: Partial<RawReviewObservationV1> = {},
): RawReviewObservationV1 {
  return {
    schema_version: 1,
    authority: "NONE_UNTRUSTED",
    observation_id: id,
    producer_class: "MODEL",
    severity_hint: "major",
    category_hint: "correctness",
    body: "Unchecked return value.",
    location_hint: { path: "src/b.ts", start_line: 3, end_line: 5 },
    rule_id: null,
    confidence: 0.7,
    execution_binding: {
      engine_id: "engine:review-opencode-review",
      binary_name: "open-code-review",
      observed_version: "1.2.3",
      profile_id: "profile:t09",
      capsule_id: "capsule:t09",
      head_sha: "e".repeat(40),
    },
    ...overrides,
  };
}

function validation(id: string): LocationValidationV1 {
  return {
    schema_version: 1,
    observation_id: id,
    state: "VALID",
    reasons: [],
  };
}

function record(id: string, overrides: Partial<RawReviewObservationV1> = {}) {
  const source = observation(id, overrides);
  return normalizeReviewFindingV1(source, validation(id));
}

describe("UA-P03-T09 dedup and correlation", () => {
  it("groups same-location same-category duplicates with explicit rationale", () => {
    const first = record("observation:dup-1");
    const second = record("observation:dup-2", {
      severity_hint: "minor",
      confidence: 0.2,
    });
    const result = correlateReviewRecordsV1([first, second]);
    expect(result.record_count).toBe(2);
    expect(result.cluster_count).toBe(1);
    const cluster = result.clusters[0];
    expect(cluster.member_count).toBe(2);
    expect(cluster.member_record_ids).toEqual([
      "observation:dup-1",
      "observation:dup-2",
    ]);
    expect(cluster.rationale).toMatch(/grouped 2 independent records/u);
    expect(cluster.members).toEqual([first, second]);
  });

  it("keeps cross-producer duplicates as independent evidence", () => {
    const model = record("observation:model-1");
    const rule = record("observation:rule-1", {
      producer_class: "RULE",
      rule_id: "rule:no-unchecked-return",
    });
    expect(correlationKeyForRecordV1(model)).toBe(
      correlationKeyForRecordV1(rule),
    );
    const result = correlateReviewRecordsV1([model, rule]);
    expect(result.cluster_count).toBe(1);
    const cluster = result.clusters[0];
    expect(cluster.member_count).toBe(2);
    expect(cluster.members[0].provenance.producer_class).toBe("MODEL");
    expect(cluster.members[1].provenance.producer_class).toBe("RULE");
    expect(cluster.members[1].provenance.rule_id).toBe(
      "rule:no-unchecked-return",
    );
  });

  it("separates distinct locations and categories into singleton clusters", () => {
    const result = correlateReviewRecordsV1([
      record("observation:a"),
      record("observation:b", {
        location_hint: { path: "src/c.ts", start_line: 1, end_line: 1 },
      }),
      record("observation:c", { category_hint: "style" }),
    ]);
    expect(result.record_count).toBe(3);
    expect(result.cluster_count).toBe(3);
    for (const cluster of result.clusters) {
      expect(cluster.member_count).toBe(1);
      expect(cluster.rationale).toMatch(/^singleton/u);
    }
    const totalMembers = result.clusters.reduce(
      (sum, cluster) => sum + cluster.member_count,
      0,
    );
    expect(totalMembers).toBe(result.record_count);
  });

  it("preserves every input record verbatim across clusters", () => {
    const inputs = [
      record("observation:k-1"),
      record("observation:k-2"),
      record("observation:k-3", { category_hint: "security" }),
    ];
    const result: CorrelationResultV1 = correlateReviewRecordsV1(inputs);
    const flattened = result.clusters.flatMap((cluster) => [
      ...cluster.members,
    ]);
    expect(flattened).toHaveLength(inputs.length);
    for (const source of inputs) {
      expect(flattened).toContainEqual(source);
    }
  });

  it("orders clusters canonically regardless of input order", () => {
    const first = correlateReviewRecordsV1([
      record("observation:z-1"),
      record("observation:a-1", { category_hint: "style" }),
    ]);
    const second = correlateReviewRecordsV1([
      record("observation:a-1", { category_hint: "style" }),
      record("observation:z-1"),
    ]);
    expect(first).toEqual(second);
  });

  it("fails closed on duplicate record ids instead of double-counting", () => {
    const one = record("observation:same");
    expect(() => correlateReviewRecordsV1([one, one])).toThrow(
      /duplicate record id/u,
    );
    expect(() =>
      correlateReviewRecordsV1([
        { ...one, record_id: "bad id!" },
      ]),
    ).toThrow(TypeError);
  });
});
