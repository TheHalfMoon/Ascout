import { describe, expect, it } from "vitest";
import {
  admissionDecisionFromJson,
  admissionDecisionToJson,
  decideAdmission,
  isAdmitted,
} from "../src/quality/admission.js";
import type { HumanAdmission } from "../src/quality/admission.js";
import { createCandidateProposal } from "../src/quality/candidate.js";
import { createDiscriminationEvidence } from "../src/quality/discrimination.js";
import { evaluateDiscrimination } from "../src/quality/discrimination.js";
import { createOracle } from "../src/quality/obligation.js";
import { createStabilityObservation } from "../src/quality/stability.js";
import { evaluateStability } from "../src/quality/stability.js";

const CANDIDATE = "candidate-w1";
const OBLIGATION = "obligation-9";
const SOURCE = "tree:c678221000000000000000000000000000000000";
const ENV = "env:node22-linux";

function proposal(status: "proposed" | "rejected" = "proposed") {
  const created = createCandidateProposal({
    body: "it('covers the obligation', () => { expect(1).toBe(1); });",
    generated_by: "template:obligation-scaffold-v1",
    id: CANDIDATE,
    obligation_id: OBLIGATION,
    oracle: createOracle({
      calibrated: true,
      class: "deterministic-assertion",
      description: "independent assertion",
      id: "oracle-a1",
      independence: "independent",
      provenance: "reviewed against the PRD",
    }),
    source_id: SOURCE,
    test_file: "tests/candidate-checkout.test.ts",
    test_name: "covers the obligation",
  });
  return status === "proposed"
    ? created
    : { ...created, rejection_reason: "kills no mutant", status };
}

function passingStability() {
  return evaluateStability({
    max_runs: 5,
    observations: [0, 1, 2].map((run_index) =>
      createStabilityObservation({
        candidate_id: CANDIDATE,
        duration_ms: 11,
        environment_id: ENV,
        failure_class: null,
        outcome: "pass",
        run_index,
        source_id: SOURCE,
        test_id: "test:checkout-total",
      }),
    ),
    required_runs: 2,
  });
}

function provenDiscrimination() {
  return evaluateDiscrimination({
    evidence: [
      createDiscriminationEvidence({
        candidate_id: CANDIDATE,
        detail: null,
        detected: true,
        kind: "mutant-killed",
        source_id: SOURCE,
        target_id: "mutant-1",
      }),
    ],
  });
}

function admission(): HumanAdmission {
  return { admitted_by: "maintainer:ali", reason: "gates pass; reviewed" };
}

describe("spec015 wedge1 admission decision", () => {
  it("admits only with all gates passing and human admission", () => {
    const decision = decideAdmission({
      admission: admission(),
      discrimination: provenDiscrimination(),
      proposal: proposal(),
      stability: passingStability(),
    });
    expect(decision.verdict).toBe("admitted");
    expect(decision.candidate_id).toBe(CANDIDATE);
    expect(decision.source_id).toBe(SOURCE);
    expect(decision.admitted_by).toBe("maintainer:ali");
    expect(decision.reasons).toEqual([
      "stability-deterministic-pass",
      "discrimination-proven",
      "human-admitted",
    ]);
    expect(isAdmitted(decision)).toBe(true);
  });

  it("holds rejected proposals even when every gate passes", () => {
    const decision = decideAdmission({
      admission: admission(),
      discrimination: provenDiscrimination(),
      proposal: proposal("rejected"),
      stability: passingStability(),
    });
    expect(decision.verdict).toBe("held");
    expect(decision.reasons).toEqual(["proposal-rejected"]);
    expect(decision.admitted_by).toBeNull();
    expect(isAdmitted(decision)).toBe(false);
  });

  it("holds flaky, failing, and unevaluated stability evidence", () => {
    const flaky = evaluateStability({
      max_runs: 5,
      observations: [
        createStabilityObservation({
          candidate_id: CANDIDATE,
          duration_ms: 11,
          environment_id: ENV,
          failure_class: null,
          outcome: "pass",
          run_index: 0,
          source_id: SOURCE,
          test_id: "test:checkout-total",
        }),
        createStabilityObservation({
          candidate_id: CANDIDATE,
          duration_ms: 12,
          environment_id: ENV,
          failure_class: "assertion",
          outcome: "fail",
          run_index: 1,
          source_id: SOURCE,
          test_id: "test:checkout-total",
        }),
      ],
      required_runs: 2,
    });
    expect(
      decideAdmission({
        admission: admission(),
        discrimination: provenDiscrimination(),
        proposal: proposal(),
        stability: flaky,
      }).reasons,
    ).toEqual(["stability-not-deterministic-pass"]);
    expect(
      decideAdmission({
        admission: admission(),
        discrimination: provenDiscrimination(),
        proposal: proposal(),
        stability: evaluateStability({
          max_runs: 5,
          observations: [],
          required_runs: 2,
        }),
      }).verdict,
    ).toBe("held");
  });

  it("holds unproven and unevaluated discrimination evidence", () => {
    const unproven = evaluateDiscrimination({
      evidence: [
        createDiscriminationEvidence({
          candidate_id: CANDIDATE,
          detail: null,
          detected: false,
          kind: "mutant-killed",
          source_id: SOURCE,
          target_id: "mutant-1",
        }),
      ],
    });
    expect(
      decideAdmission({
        admission: admission(),
        discrimination: unproven,
        proposal: proposal(),
        stability: passingStability(),
      }).reasons,
    ).toEqual(["discrimination-unproven"]);
    expect(
      decideAdmission({
        admission: admission(),
        discrimination: evaluateDiscrimination({ evidence: [] }),
        proposal: proposal(),
        stability: passingStability(),
      }).verdict,
    ).toBe("held");
  });

  it("holds without human admission and rejects malformed admission", () => {
    expect(
      decideAdmission({
        admission: null,
        discrimination: provenDiscrimination(),
        proposal: proposal(),
        stability: passingStability(),
      }).reasons,
    ).toEqual(["human-admission-missing"]);
    expect(() =>
      decideAdmission({
        admission: { admitted_by: "", reason: "x" },
        discrimination: provenDiscrimination(),
        proposal: proposal(),
        stability: passingStability(),
      }),
    ).toThrow(TypeError);
    expect(() =>
      decideAdmission({
        admission: { admitted_by: "maintainer:ali", reason: "" },
        discrimination: provenDiscrimination(),
        proposal: proposal(),
        stability: passingStability(),
      }),
    ).toThrow(TypeError);
  });

  it("throws on evidence bound to another candidate or source", () => {
    const otherStability = evaluateStability({
      max_runs: 5,
      observations: [0, 1].map((run_index) =>
        createStabilityObservation({
          candidate_id: "candidate-other",
          duration_ms: 11,
          environment_id: ENV,
          failure_class: null,
          outcome: "pass",
          run_index,
          source_id: SOURCE,
          test_id: "test:checkout-total",
        }),
      ),
      required_runs: 2,
    });
    expect(() =>
      decideAdmission({
        admission: admission(),
        discrimination: provenDiscrimination(),
        proposal: proposal(),
        stability: otherStability,
      }),
    ).toThrow(TypeError);
    const otherSource = evaluateDiscrimination({
      evidence: [
        createDiscriminationEvidence({
          candidate_id: CANDIDATE,
          detail: null,
          detected: true,
          kind: "mutant-killed",
          source_id: "tree:other000000000000000000000000000000000",
          target_id: "mutant-1",
        }),
      ],
    });
    expect(() =>
      decideAdmission({
        admission: admission(),
        discrimination: otherSource,
        proposal: proposal(),
        stability: passingStability(),
      }),
    ).toThrow(TypeError);
  });

  it("enumerates every failed gate in fixed order", () => {
    const decision = decideAdmission({
      admission: null,
      discrimination: evaluateDiscrimination({ evidence: [] }),
      proposal: proposal("rejected"),
      stability: evaluateStability({
        max_runs: 5,
        observations: [],
        required_runs: 2,
      }),
    });
    expect(decision.verdict).toBe("held");
    expect(decision.reasons).toEqual([
      "proposal-rejected",
      "stability-not-deterministic-pass",
      "discrimination-unproven",
      "human-admission-missing",
    ]);
  });

  it("round-trips admitted and held decisions through deterministic JSON", () => {
    const admitted = decideAdmission({
      admission: admission(),
      discrimination: provenDiscrimination(),
      proposal: proposal(),
      stability: passingStability(),
    });
    const first = admissionDecisionToJson(admitted);
    expect(admissionDecisionToJson(admissionDecisionFromJson(first))).toBe(
      first,
    );
    const held = decideAdmission({
      admission: null,
      discrimination: provenDiscrimination(),
      proposal: proposal(),
      stability: passingStability(),
    });
    expect(admissionDecisionFromJson(admissionDecisionToJson(held))).toEqual(
      held,
    );
    expect(() => admissionDecisionFromJson("not json")).toThrow(TypeError);
    const tampered = {
      ...(JSON.parse(first) as Record<string, unknown>),
      verdict: "admitted-by-magic",
    };
    expect(() => admissionDecisionFromJson(JSON.stringify(tampered))).toThrow(
      TypeError,
    );
  });
});
