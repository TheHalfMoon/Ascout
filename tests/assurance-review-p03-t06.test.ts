import { describe, expect, it } from "vitest";

import {
  isPromotableLocationV1,
  validateObservationLocationV1,
  type LocationValidationContextV1,
} from "../src/assurance/review/location-validator.js";
import type { RawReviewObservationV1 } from "../src/assurance/review/raw-observation.js";

function observation(
  overrides: Partial<RawReviewObservationV1> = {},
): RawReviewObservationV1 {
  return {
    schema_version: 1,
    authority: "NONE_UNTRUSTED",
    observation_id: "observation:t06",
    producer_class: "MODEL",
    severity_hint: "minor",
    category_hint: "style",
    body: "Trailing whitespace.",
    location_hint: { path: "src/a.ts", start_line: 10, end_line: 12 },
    rule_id: null,
    confidence: 0.4,
    execution_binding: {
      engine_id: "engine:review-opencode-review",
      binary_name: "open-code-review",
      observed_version: "1.2.3",
      profile_id: "profile:t06",
      capsule_id: "capsule:t06",
      head_sha: "e".repeat(40),
    },
    ...overrides,
  };
}

function context(
  overrides: Partial<LocationValidationContextV1> = {},
): LocationValidationContextV1 {
  return {
    expected_head_sha: "e".repeat(40),
    known_files: ["src/a.ts", "src/b.ts"],
    file_line_counts: { "src/a.ts": 100, "src/b.ts": 20 },
    ...overrides,
  };
}

describe("UA-P03-T06 location validator", () => {
  it("promotes only fully verified locations", () => {
    const validation = validateObservationLocationV1(
      observation(),
      context(),
    );
    expect(validation.state).toBe("VALID");
    expect(validation.reasons).toEqual([]);
    expect(isPromotableLocationV1(validation)).toBe(true);
  });

  it("maps missing locations explicitly", () => {
    const validation = validateObservationLocationV1(
      observation({ location_hint: null }),
      context(),
    );
    expect(validation.state).toBe("NO_LOCATION");
    expect(isPromotableLocationV1(validation)).toBe(false);
  });

  it("checks stale head before path", () => {
    const stale = validateObservationLocationV1(
      observation({
        execution_binding: {
          engine_id: "engine:review-opencode-review",
          binary_name: "open-code-review",
          observed_version: "1.2.3",
          profile_id: "profile:t06",
          capsule_id: "capsule:t06",
          head_sha: "f".repeat(40),
        },
        location_hint: { path: "src/ghost.ts", start_line: 1, end_line: 1 },
      }),
      context(),
    );
    expect(stale.state).toBe("STALE_HEAD");
    expect(isPromotableLocationV1(stale)).toBe(false);
  });

  it("rejects hallucinated paths and out-of-range lines", () => {
    const hallucinated = validateObservationLocationV1(
      observation({
        location_hint: { path: "src/ghost.ts", start_line: 1, end_line: 1 },
      }),
      context(),
    );
    expect(hallucinated.state).toBe("HALLUCINATED_PATH");

    const outOfRange = validateObservationLocationV1(
      observation({
        location_hint: { path: "src/b.ts", start_line: 21, end_line: 25 },
      }),
      context(),
    );
    expect(outOfRange.state).toBe("LINE_OUT_OF_RANGE");
    expect(isPromotableLocationV1(outOfRange)).toBe(false);
  });

  it("marks unverifiable lines without promoting", () => {
    const unverified = validateObservationLocationV1(
      observation(),
      context({ file_line_counts: null }),
    );
    expect(unverified.state).toBe("LINES_UNVERIFIED");
    expect(isPromotableLocationV1(unverified)).toBe(false);

    const fileScope = validateObservationLocationV1(
      observation({
        location_hint: { path: "src/a.ts", start_line: null, end_line: null },
      }),
      context({ file_line_counts: null }),
    );
    expect(fileScope.state).toBe("VALID");
  });
});
