import { describe, expect, it } from "vitest";

import {
  assessFreshnessV1,
  requiresRevalidationV1,
  validateEvidenceCurrencyV1,
} from "../src/assurance/workflow/freshness-engine.js";

const HEAD = "a".repeat(40);
const NEXT_HEAD = "b".repeat(40);

describe("UA-P04-T02 exact-head freshness engine", () => {
  it("treats matching head as current without revalidation", () => {
    const assessment = assessFreshnessV1("subject:1", HEAD, HEAD);
    expect(assessment.state).toBe("CURRENT");
    expect(assessment.changed).toBe(false);
    expect(assessment.requires_revalidation).toBe(false);
    expect(assessment.reasons).toEqual([]);
  });

  it("stales review evidence on changed head", () => {
    const assessment = assessFreshnessV1("subject:1", NEXT_HEAD, HEAD);
    expect(assessment.state).toBe("STALE");
    expect(assessment.changed).toBe(true);
    expect(assessment.requires_revalidation).toBe(true);
    expect(assessment.reasons).toHaveLength(1);
  });

  it("returns unknown for malformed identity or head", () => {
    expect(assessFreshnessV1("", HEAD, HEAD).state).toBe("UNKNOWN");
    expect(assessFreshnessV1("subject:1", "bad", HEAD).state).toBe("UNKNOWN");
    expect(assessFreshnessV1("subject:1", HEAD, "bad").state).toBe("UNKNOWN");
    const malformed = assessFreshnessV1("", "bad", "worse");
    expect(malformed.requires_revalidation).toBe(true);
    expect(malformed.changed).toBe(false);
  });

  it("binds evidence currency to the expected head", () => {
    const current = validateEvidenceCurrencyV1(
      { evidence_id: "evidence:1", bound_head: HEAD },
      HEAD,
    );
    expect(current.state).toBe("CURRENT");
    expect(current.usable_as_current).toBe(true);
    const stale = validateEvidenceCurrencyV1(
      { evidence_id: "evidence:1", bound_head: NEXT_HEAD },
      HEAD,
    );
    expect(stale.state).toBe("STALE");
    expect(stale.usable_as_current).toBe(false);
    const empty = validateEvidenceCurrencyV1(
      { evidence_id: "", bound_head: HEAD },
      HEAD,
    );
    expect(empty.state).toBe("UNKNOWN");
    expect(empty.usable_as_current).toBe(false);
  });

  it("requires revalidation for stale and unknown only", () => {
    expect(requiresRevalidationV1("CURRENT")).toBe(false);
    expect(requiresRevalidationV1("STALE")).toBe(true);
    expect(requiresRevalidationV1("UNKNOWN")).toBe(true);
  });

  it("keeps assessments deterministic", () => {
    expect(assessFreshnessV1("subject:1", NEXT_HEAD, HEAD)).toEqual(
      assessFreshnessV1("subject:1", NEXT_HEAD, HEAD),
    );
  });
});
