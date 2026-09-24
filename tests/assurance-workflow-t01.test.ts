import { describe, expect, it } from "vitest";

import {
  buildKodacSourcePinV1,
  KODAC_LICENSE,
  KODAC_PINNED_REVISION,
  KODAC_PINNED_TREE,
  KODAC_PLANNING_REVISION,
  KODAC_REPOSITORY,
  validateKodacSourcePinV1,
} from "../src/assurance/workflow/kodac-source-pin.js";
import {
  evaluateWorkflowFreshnessV1,
  generationImpliesPublicationV1,
  isCompleteTransitionBindingV1,
  isDoneGateSatisfiedV1,
  isPublicationEffectV1,
  isSelfReviewV1,
  isSideEffectRetryV1,
  KODAC_CHARACTERIZATION_SCHEMA_VERSION,
  KODAC_INTEGRATION_MODE,
  KODAC_RETRY_CLASSES,
  KODAC_SELECTED_SCHEMA_IDS,
} from "../src/assurance/workflow/kodac-capability-characterization.js";
import {
  buildKodacCharacterizationFixturesV1,
  digestKodacFixturesV1,
  KODAC_FIXTURE_SCHEMA_VERSION,
} from "../src/assurance/workflow/kodac-characterization-fixtures.js";

describe("UA-P04-T01 Kodac capability characterization", () => {
  it("pins the exact live Kodac revision and tree", () => {
    expect(KODAC_REPOSITORY).toBe("TheHalfMoon/Kodac");
    expect(KODAC_PINNED_REVISION).toBe(
      "406b335277f2df1e3dedf24cdb45847dff919d44",
    );
    expect(KODAC_PINNED_TREE).toBe(
      "0213c3ffc952336b92ab0fc03f62937396619133",
    );
    expect(KODAC_PLANNING_REVISION).toBe(KODAC_PINNED_REVISION);
  });

  it("records Apache-2.0 license with absent root notice", () => {
    const pin = buildKodacSourcePinV1();
    expect(pin.license).toBe(KODAC_LICENSE);
    expect(pin.root_notice).toBeNull();
    expect(pin.package_notices).toContain(
      "packages/kodac-runtime/THIRD_PARTY_NOTICES.md",
    );
    expect(validateKodacSourcePinV1(pin).valid).toBe(true);
  });

  it("classifies freshness as unchanged with pattern-only integration", () => {
    const pin = buildKodacSourcePinV1();
    expect(pin.freshness).toBe("UNCHANGED");
    expect(pin.integration_mode).toBe("PATTERN_ONLY");
    expect(pin.npm_dependency_implication).toBe("NONE");
    expect(pin.status).toBe("CHARACTERIZED");
    expect(KODAC_INTEGRATION_MODE).toBe("PATTERN_ONLY");
  });

  it("freezes the closed retry-class vocabulary", () => {
    expect(KODAC_RETRY_CLASSES).toEqual([
      "INITIAL",
      "SAFE_REPLAY",
      "IDEMPOTENT_REREAD",
      "NEW_INTELLIGENCE_ATTEMPT",
      "SIDE_EFFECT_RETRY",
    ]);
    expect(isSideEffectRetryV1("SIDE_EFFECT_RETRY")).toBe(true);
    expect(isSideEffectRetryV1("INITIAL")).toBe(false);
    expect(isSideEffectRetryV1("SAFE_REPLAY")).toBe(false);
  });

  it("selects the smallest donor surface without wholesale import", () => {
    expect(KODAC_SELECTED_SCHEMA_IDS).toHaveLength(8);
    expect(KODAC_SELECTED_SCHEMA_IDS).toContain(
      "o2-durable-workflow-evidence-kernel",
    );
    expect(KODAC_SELECTED_SCHEMA_IDS).toContain(
      "p9-r1-freshness-dependency-invalidation",
    );
    expect(KODAC_SELECTED_SCHEMA_IDS).toContain(
      "o4f-safe-github-publication-admission",
    );
    expect(KODAC_CHARACTERIZATION_SCHEMA_VERSION).toBe(1);
  });

  it("stales review evidence on changed head", () => {
    const fixtures = buildKodacCharacterizationFixturesV1();
    expect(
      evaluateWorkflowFreshnessV1(
        fixtures.current_head,
        fixtures.current_head,
      ),
    ).toBe("CURRENT");
    expect(
      evaluateWorkflowFreshnessV1(
        fixtures.stale_head,
        fixtures.current_head,
      ),
    ).toBe("STALE");
    expect(evaluateWorkflowFreshnessV1("not-a-sha", fixtures.current_head)).toBe(
      "UNKNOWN",
    );
  });

  it("keeps generation separate from publication effect", () => {
    expect(generationImpliesPublicationV1()).toBe(false);
    expect(isPublicationEffectV1("EFFECT")).toBe(true);
    expect(isPublicationEffectV1("GENERATION")).toBe(false);
    expect(isPublicationEffectV1("INTENT")).toBe(false);
    expect(isPublicationEffectV1("RECEIPT")).toBe(false);
  });

  it("enforces reviewer-role separation", () => {
    const fixtures = buildKodacCharacterizationFixturesV1();
    expect(
      isSelfReviewV1(
        fixtures.independent_first,
        fixtures.independent_second,
      ),
    ).toBe(false);
    expect(
      isSelfReviewV1(
        fixtures.self_review_pair[0],
        fixtures.self_review_pair[1],
      ),
    ).toBe(true);
  });

  it("gates completion on proof", () => {
    const fixtures = buildKodacCharacterizationFixturesV1();
    expect(isDoneGateSatisfiedV1(fixtures.done_gate_satisfied)).toBe(true);
    expect(isDoneGateSatisfiedV1(fixtures.done_gate_missing)).toBe(false);
  });

  it("freezes transitions with complete identity binding", () => {
    const fixtures = buildKodacCharacterizationFixturesV1();
    expect(isCompleteTransitionBindingV1(fixtures.transition)).toBe(true);
    expect(isCompleteTransitionBindingV1(fixtures.retry_transition)).toBe(
      true,
    );
    expect(
      isCompleteTransitionBindingV1({
        ...fixtures.transition,
        attempt_identity: "short",
      }),
    ).toBe(false);
  });

  it("freezes fixtures deterministically", () => {
    const first = buildKodacCharacterizationFixturesV1();
    const second = buildKodacCharacterizationFixturesV1();
    expect(first).toEqual(second);
    expect(digestKodacFixturesV1(first)).toBe(digestKodacFixturesV1(second));
    expect(KODAC_FIXTURE_SCHEMA_VERSION).toBe(1);
    expect(first.source_pin.revision).toBe(KODAC_PINNED_REVISION);
  });
});
