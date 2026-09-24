import { describe, expect, it } from "vitest";

import {
  enforceRoleSeparationV1,
  isAcceptanceEnforceableV1,
} from "../src/assurance/workflow/reviewer-role-separation.js";
import type { ReviewerLineageV1 } from "../src/assurance/workflow/kodac-capability-characterization.js";

const PRODUCER: ReviewerLineageV1 = {
  model: "producer-model",
  provider: "producer-provider",
  context: "producer-context",
};

const REVIEWER: ReviewerLineageV1 = {
  model: "reviewer-model",
  provider: "reviewer-provider",
  context: "reviewer-context",
};

const ACCEPTANCE: ReviewerLineageV1 = {
  model: "acceptance-model",
  provider: "acceptance-provider",
  context: "acceptance-context",
};

describe("UA-P04-T05 reviewer-role separation", () => {
  it("refuses self-review", () => {
    const assessment = enforceRoleSeparationV1(
      PRODUCER,
      PRODUCER,
      null,
      false,
    );
    expect(assessment.satisfied).toBe(false);
  });

  it("accepts independent review for non-critical work", () => {
    const assessment = enforceRoleSeparationV1(
      PRODUCER,
      REVIEWER,
      null,
      false,
    );
    expect(assessment.satisfied).toBe(true);
  });

  it("requires an acceptance reviewer for critical work", () => {
    const assessment = enforceRoleSeparationV1(
      PRODUCER,
      REVIEWER,
      null,
      true,
    );
    expect(assessment.satisfied).toBe(false);
  });

  it("enforces acceptance independence from producer and reviewer", () => {
    expect(
      enforceRoleSeparationV1(PRODUCER, REVIEWER, PRODUCER, true).satisfied,
    ).toBe(false);
    expect(
      enforceRoleSeparationV1(PRODUCER, REVIEWER, REVIEWER, true).satisfied,
    ).toBe(false);
    expect(
      enforceRoleSeparationV1(PRODUCER, REVIEWER, ACCEPTANCE, true).satisfied,
    ).toBe(true);
  });

  it("distinguishes partial lineage overlap from independence", () => {
    const sameModel: ReviewerLineageV1 = {
      model: "producer-model",
      provider: "other-provider",
      context: "other-context",
    };
    expect(enforceRoleSeparationV1(PRODUCER, sameModel, null, false).satisfied).toBe(
      true,
    );
  });

  it("evaluates assignment lists", () => {
    expect(
      isAcceptanceEnforceableV1(
        [
          { role: "PRODUCER", lineage: PRODUCER },
          { role: "REVIEWER", lineage: REVIEWER },
          { role: "ACCEPTANCE_REVIEWER", lineage: ACCEPTANCE },
        ],
        true,
      ),
    ).toBe(true);
    expect(
      isAcceptanceEnforceableV1(
        [
          { role: "PRODUCER", lineage: PRODUCER },
          { role: "REVIEWER", lineage: REVIEWER },
        ],
        true,
      ),
    ).toBe(false);
    expect(
      isAcceptanceEnforceableV1(
        [{ role: "PRODUCER", lineage: PRODUCER }],
        false,
      ),
    ).toBe(false);
  });

  it("keeps assessments deterministic", () => {
    expect(enforceRoleSeparationV1(PRODUCER, REVIEWER, ACCEPTANCE, true)).toEqual(
      enforceRoleSeparationV1(PRODUCER, REVIEWER, ACCEPTANCE, true),
    );
  });
});
