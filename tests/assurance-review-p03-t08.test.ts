import { describe, expect, it } from "vitest";

import {
  normalizeReviewBatchV1,
  normalizeReviewFindingV1,
  type NormalizedReviewRecordV1,
} from "../src/assurance/review/finding-normalization.js";
import type { LocationValidationV1 } from "../src/assurance/review/location-validator.js";
import type { RawReviewObservationV1 } from "../src/assurance/review/raw-observation.js";

function observation(
  overrides: Partial<RawReviewObservationV1> = {},
): RawReviewObservationV1 {
  return {
    schema_version: 1,
    authority: "NONE_UNTRUSTED",
    observation_id: "observation:t08",
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
      profile_id: "profile:t08",
      capsule_id: "capsule:t08",
      head_sha: "e".repeat(40),
    },
    ...overrides,
  };
}

function validation(
  overrides: Partial<LocationValidationV1> = {},
): LocationValidationV1 {
  return {
    schema_version: 1,
    observation_id: "observation:t08",
    state: "VALID",
    reasons: [],
    ...overrides,
  };
}

describe("UA-P03-T08 finding normalization", () => {
  it("normalizes a valid observation 1:1 with verbatim preservation", () => {
    const source = observation();
    const record = normalizeReviewFindingV1(source, validation());
    expect(record.record_id).toBe("observation:t08");
    expect(record.observation).toEqual(source);
    expect(record.location_state).toBe("VALID");
    expect(record.location_reasons).toEqual([]);
    expect(record.promotable).toBe(true);
    expect(record.provenance).toEqual({
      producer_class: "MODEL",
      rule_id: null,
      engine_id: "engine:review-opencode-review",
      binary_name: "open-code-review",
      observed_version: "1.2.3",
      profile_id: "profile:t08",
      capsule_id: "capsule:t08",
      head_sha: "e".repeat(40),
    });
  });

  it("preserves rule producer provenance including rule id", () => {
    const source = observation({
      observation_id: "observation:t08-rule",
      producer_class: "RULE",
      rule_id: "rule:no-unchecked-return",
    });
    const record = normalizeReviewFindingV1(
      source,
      validation({
        observation_id: "observation:t08-rule",
        state: "VALID",
        reasons: [],
      }),
    );
    expect(record.provenance.producer_class).toBe("RULE");
    expect(record.provenance.rule_id).toBe("rule:no-unchecked-return");
    expect(record.observation).toEqual(source);
    expect(record.promotable).toBe(true);
  });

  it("never suppresses non-promotable states: every valid input yields a record", () => {
    const states = [
      "NO_LOCATION",
      "STALE_HEAD",
      "HALLUCINATED_PATH",
      "LINE_OUT_OF_RANGE",
      "LINES_UNVERIFIED",
    ] as const;
    const records: NormalizedReviewRecordV1[] = states.map((state, index) =>
      normalizeReviewFindingV1(
        observation({ observation_id: "observation:t08-" + index }),
        validation({
          observation_id: "observation:t08-" + index,
          state,
          reasons: ["reason for " + state],
        }),
      ),
    );
    expect(records).toHaveLength(states.length);
    for (const [index, record] of records.entries()) {
      expect(record.record_id).toBe("observation:t08-" + index);
      expect(record.promotable).toBe(false);
      expect(record.location_reasons).toEqual([
        "reason for " + states[index],
      ]);
    }
  });

  it("normalizes batches without dropping any valid observation", () => {
    const entries = [0, 1, 2, 3].map((index) => ({
      observation: observation({ observation_id: "observation:batch-" + index }),
      validation: validation({
        observation_id: "observation:batch-" + index,
        state: index % 2 === 0 ? ("VALID" as const) : ("STALE_HEAD" as const),
        reasons: index % 2 === 0 ? [] : ["stale"],
      }),
    }));
    const records = normalizeReviewBatchV1(entries);
    expect(records).toHaveLength(entries.length);
    expect(records.map((record) => record.record_id)).toEqual(
      entries.map((entry) => entry.observation.observation_id),
    );
    expect(records.filter((record) => record.promotable)).toHaveLength(2);
  });

  it("fails closed on shape-invalid observations instead of dropping", () => {
    const bad = observation({ authority: "TRUSTED" as never });
    expect(() => normalizeReviewFindingV1(bad, validation())).toThrow(
      TypeError,
    );
  });

  it("fails closed on cross-wired location validation instead of dropping", () => {
    expect(() =>
      normalizeReviewFindingV1(
        observation(),
        validation({ observation_id: "observation:other" }),
      ),
    ).toThrow(/different observation/u);
    expect(() =>
      normalizeReviewFindingV1(
        observation(),
        validation({ state: "CLEAN" as never }),
      ),
    ).toThrow(TypeError);
  });
});
