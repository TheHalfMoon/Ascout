import { describe, expect, it } from "vitest";

import {
  MAX_OBSERVATION_BODY_CHARS,
  assertRawReviewObservationV1,
  type RawReviewObservationV1,
} from "../src/assurance/review/raw-observation.js";

function observation(
  overrides: Partial<RawReviewObservationV1> = {},
): RawReviewObservationV1 {
  return {
    schema_version: 1,
    authority: "NONE_UNTRUSTED",
    observation_id: "observation:t05",
    producer_class: "MODEL",
    severity_hint: "major",
    category_hint: "null-deref",
    body: "Possible null dereference.",
    location_hint: { path: "src/a.ts", start_line: 10, end_line: 12 },
    rule_id: null,
    confidence: 0.7,
    execution_binding: {
      engine_id: "engine:review-opencode-review",
      binary_name: "open-code-review",
      observed_version: "1.2.3",
      profile_id: "profile:t05",
      capsule_id: "capsule:t05",
      head_sha: "d".repeat(40),
    },
    ...overrides,
  };
}

describe("UA-P03-T05 raw observation isolation", () => {
  it("accepts well-formed model and rule observations", () => {
    expect(assertRawReviewObservationV1(observation())).toEqual({
      ok: true,
      reasons: [],
    });
    const rule = observation({
      observation_id: "observation:t05-rule",
      producer_class: "RULE",
      severity_hint: "critical",
      rule_id: "rule:npe-check",
      confidence: null,
      location_hint: null,
    });
    expect(assertRawReviewObservationV1(rule)).toEqual({
      ok: true,
      reasons: [],
    });
  });

  it("never grants authority", () => {
    const elevated = observation({ authority: "FINDING" } as never);
    expect(assertRawReviewObservationV1(elevated).reasons).toContain(
      "authority must be NONE_UNTRUSTED",
    );
  });

  it("rejects oversize bodies and malformed locations", () => {
    const big = observation({ body: "x".repeat(MAX_OBSERVATION_BODY_CHARS + 1) });
    expect(assertRawReviewObservationV1(big).reasons).toContain(
      "body out of bounds",
    );
    const traversal = observation({
      location_hint: { path: "../escape.ts", start_line: 1, end_line: 1 },
    });
    expect(assertRawReviewObservationV1(traversal).reasons).toContain(
      "location path invalid",
    );
    const inverted = observation({
      location_hint: { path: "src/a.ts", start_line: 12, end_line: 10 },
    });
    expect(assertRawReviewObservationV1(inverted).reasons).toContain(
      "line range inverted",
    );
  });

  it("rejects unknown producer classes and dangling rule claims", () => {
    const unknown = observation({ producer_class: "ORACLE" } as never);
    expect(assertRawReviewObservationV1(unknown).reasons).toContain(
      "producer class invalid",
    );
    const dangling = observation({ producer_class: "RULE", rule_id: null });
    expect(assertRawReviewObservationV1(dangling).reasons).toContain(
      "rule observation without rule id",
    );
    const confidence = observation({ confidence: 1.5 });
    expect(assertRawReviewObservationV1(confidence).reasons).toContain(
      "confidence out of range",
    );
  });

  it("requires complete execution binding", () => {
    const binding = observation({
      execution_binding: {
        engine_id: "",
        binary_name: "open-code-review",
        observed_version: "1.2.3",
        profile_id: "profile:t05",
        capsule_id: "capsule:t05",
        head_sha: "zzz",
      },
    });
    const reasons = assertRawReviewObservationV1(binding).reasons;
    expect(reasons).toContain("engine id invalid");
    expect(reasons).toContain("head sha invalid");
  });
});
