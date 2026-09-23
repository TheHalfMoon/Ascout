import { describe, expect, it } from "vitest";

import {
  evaluateReviewIndependenceV1,
  isIndependentReviewV1,
  type ReviewLineageV1,
} from "../src/assurance/review/independence-policy.js";

const AUTHOR: ReviewLineageV1 = {
  model_family: "qwen3",
  provider_identity: "provider:local-ollama",
  context_digest: "a".repeat(64),
};

function lineage(overrides: Partial<ReviewLineageV1>): ReviewLineageV1 {
  return { ...AUTHOR, ...overrides };
}

describe("UA-P03-T12 independent-review policy", () => {
  it("refuses independence for identical lineage (self-review)", () => {
    const evaluation = evaluateReviewIndependenceV1(AUTHOR, lineage({}));
    expect(evaluation.verdict).toBe("SELF_REVIEW");
    expect(evaluation.differing_dimensions).toEqual([]);
    expect(evaluation.matching_dimensions).toEqual([
      "model_family",
      "provider_identity",
      "context_digest",
    ]);
    expect(evaluation.reasons.join("; ")).toMatch(/self-review/u);
    expect(isIndependentReviewV1(evaluation)).toBe(false);
  });

  it("grants independence on model-family difference", () => {
    const evaluation = evaluateReviewIndependenceV1(
      AUTHOR,
      lineage({ model_family: "gpt-5" }),
    );
    expect(evaluation.verdict).toBe("INDEPENDENT");
    expect(evaluation.differing_dimensions).toContain("model_family");
    expect(isIndependentReviewV1(evaluation)).toBe(true);
  });

  it("grants independence on provider difference", () => {
    const evaluation = evaluateReviewIndependenceV1(
      AUTHOR,
      lineage({ provider_identity: "provider:external-funded" }),
    );
    expect(evaluation.verdict).toBe("INDEPENDENT");
    expect(evaluation.differing_dimensions).toContain("provider_identity");
  });

  it("grants independence on context difference", () => {
    const evaluation = evaluateReviewIndependenceV1(
      AUTHOR,
      lineage({ context_digest: "b".repeat(64) }),
    );
    expect(evaluation.verdict).toBe("INDEPENDENT");
    expect(evaluation.differing_dimensions).toContain("context_digest");
  });

  it("treats deterministic-rule lineage as independent of model lineage", () => {
    const evaluation = evaluateReviewIndependenceV1(
      AUTHOR,
      lineage({
        model_family: "RULE_DETERMINISTIC",
        provider_identity: null,
      }),
    );
    expect(evaluation.verdict).toBe("INDEPENDENT");
    expect(evaluation.differing_dimensions).toContain("model_family");
    expect(evaluation.differing_dimensions).toContain("provider_identity");
  });

  it("fails closed on malformed lineage instead of guessing", () => {
    expect(() =>
      evaluateReviewIndependenceV1(
        AUTHOR,
        lineage({ context_digest: "not-a-digest" }),
      ),
    ).toThrow(/context digest invalid/u);
    expect(() =>
      evaluateReviewIndependenceV1(
        lineage({ model_family: "" }),
        AUTHOR,
      ),
    ).toThrow(/model family invalid/u);
    expect(() =>
      evaluateReviewIndependenceV1(
        AUTHOR,
        lineage({ provider_identity: "bad id!" }),
      ),
    ).toThrow(/provider identity invalid/u);
  });
});
