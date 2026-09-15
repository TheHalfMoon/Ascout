import { describe, expect, it } from "vitest";
import { decideAdmission } from "../src/quality/admission.js";
import { createCandidateProposal } from "../src/quality/candidate.js";
import { createDefectReport } from "../src/quality/defect.js";
import {
  createDiscriminationEvidence,
  evaluateDiscrimination,
} from "../src/quality/discrimination.js";
import { detectGaps } from "../src/quality/gap.js";
import {
  attachEvidence,
  createOracle,
  createRequirementConflict,
  createTestObligation,
} from "../src/quality/obligation.js";
import {
  createFailureSignature,
  evaluateReproduction,
} from "../src/quality/reproduction.js";
import {
  decideRelease,
  releaseDecisionFromJson,
  releaseDecisionToJson,
  renderResidualRisk,
  residualRiskFromJson,
  residualRiskToJson,
} from "../src/quality/residual.js";
import { createStabilityObservation } from "../src/quality/stability.js";
import { evaluateStability } from "../src/quality/stability.js";

const SOURCE = "tree:506bd09000000000000000000000000000000000";
const ENV = "env:node22-linux";

function gatingOracle(id: string) {
  return createOracle({
    calibrated: true,
    class: "deterministic-assertion",
    description: "independent assertion",
    id,
    independence: "independent",
    provenance: "reviewed against the PRD",
  });
}

function coveredObligation(id: string) {
  return attachEvidence(
    createTestObligation({
      behavior: `behavior ${id}`,
      id,
      oracle: gatingOracle(`oracle-${id}`),
    }),
    [`evidence-${id}`],
  );
}

function passingStability(candidate: string) {
  return evaluateStability({
    max_runs: 5,
    observations: [0, 1].map((run_index) =>
      createStabilityObservation({
        candidate_id: candidate,
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

describe("spec015 wedge1 residual risk", () => {
  it("renders ready when nothing remains unverified", () => {
    const report = renderResidualRisk({
      admission: [],
      conflicts: [],
      defects: [],
      discrimination: [],
      gaps: [],
      source_id: SOURCE,
      stability: [],
    });
    expect(report.items).toEqual([]);
    expect(report.blocks_release).toBe(false);
    const decision = decideRelease(report);
    expect(decision.decision).toBe("ready");
    expect(decision.blockers).toEqual([]);
  });

  it("enumerates gaps by category without hiding them", () => {
    const conflict = createRequirementConflict({
      id: "c1",
      party_ids: ["prd-a", "code-a"],
      summary: "open disagreement",
    });
    const blocked = {
      ...coveredObligation("o1"),
      conflict_ids: ["c1"],
    };
    const gaps = detectGaps({
      conflictsById: { c1: conflict },
      coveringTestsByObligationId: {},
      executedTestIds: new Set<string>(),
      obligations: [blocked, coveredObligation("o2")],
    });
    const report = renderResidualRisk({
      admission: [],
      conflicts: [conflict],
      defects: [],
      discrimination: [],
      gaps,
      source_id: SOURCE,
      stability: [],
    });
    expect(report.blocks_release).toBe(true);
    expect(report.items.map((item) => item.category)).toEqual([
      "unresolved-conflict",
      "unresolved-conflict",
      "untested-obligation",
    ]);
    const decision = decideRelease(report);
    expect(decision.decision).toBe("blocked");
    expect(decision.blockers).toEqual(
      report.items.map((item) => item.id),
    );
  });

  it("surfaces flaky verification and missing discrimination", () => {
    const stability = evaluateStability({
      max_runs: 5,
      observations: [
        createStabilityObservation({
          candidate_id: "candidate-w1",
          duration_ms: 11,
          environment_id: ENV,
          failure_class: null,
          outcome: "pass",
          run_index: 0,
          source_id: SOURCE,
          test_id: "test:checkout-total",
        }),
        createStabilityObservation({
          candidate_id: "candidate-w1",
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
    const report = renderResidualRisk({
      admission: [],
      conflicts: [],
      defects: [],
      discrimination: [
        evaluateDiscrimination({
          evidence: [
            createDiscriminationEvidence({
              candidate_id: "candidate-w1",
              detail: null,
              detected: false,
              kind: "mutant-killed",
              source_id: SOURCE,
              target_id: "mutant-1",
            }),
          ],
        }),
      ],
      gaps: [],
      source_id: SOURCE,
      stability: [stability],
    });
    expect(report.items.map((item) => item.category)).toEqual([
      "unstable-verification",
      "missing-discrimination",
    ]);
    expect(decideRelease(report).decision).toBe("blocked");
  });

  it("surfaces held candidates and unexplained failures", () => {
    const proposal = createCandidateProposal({
      body: "it('x', () => { expect(1).toBe(1); });",
      generated_by: "template:v1",
      id: "candidate-w2",
      obligation_id: "o9",
      oracle: gatingOracle("oracle-w2"),
      source_id: SOURCE,
      test_file: "tests/w2.test.ts",
      test_name: "x",
    });
    const held = decideAdmission({
      admission: null,
      discrimination: evaluateDiscrimination({ evidence: [] }),
      proposal,
      stability: passingStability("candidate-w2"),
    });
    const defect = createDefectReport({
      id: "defect-9",
      reported_by: "maintainer:ali",
      reproduction: evaluateReproduction({
        minimizations: [],
        signature: createFailureSignature({
          failure_class: "assertion",
          source_id: SOURCE,
          test_id: "test:checkout-total",
        }),
        stability: null,
      }),
      signature: createFailureSignature({
        failure_class: "assertion",
        source_id: SOURCE,
        test_id: "test:checkout-total",
      }),
    });
    const report = renderResidualRisk({
      admission: [held],
      conflicts: [],
      defects: [defect],
      discrimination: [],
      gaps: [],
      source_id: SOURCE,
      stability: [],
    });
    expect(report.items.map((item) => item.category)).toEqual([
      "unadmitted-candidate",
      "unexplained-failure",
    ]);
  });

  it("throws on records bound to another source tree", () => {
    const other = evaluateStability({
      max_runs: 5,
      observations: [0, 1].map((run_index) =>
        createStabilityObservation({
          candidate_id: "candidate-w3",
          duration_ms: 11,
          environment_id: ENV,
          failure_class: null,
          outcome: "pass",
          run_index,
          source_id: "tree:other000000000000000000000000000000000",
          test_id: "test:checkout-total",
        }),
      ),
      required_runs: 2,
    });
    expect(() =>
      renderResidualRisk({
        admission: [],
        conflicts: [],
        defects: [],
        discrimination: [],
        gaps: [],
        source_id: SOURCE,
        stability: [other],
      }),
    ).toThrow(TypeError);
  });

  it("round-trips residual and release decisions through deterministic JSON", () => {
    const report = renderResidualRisk({
      admission: [],
      conflicts: [
        createRequirementConflict({
          id: "c9",
          party_ids: ["prd-a", "code-a"],
          summary: "open",
        }),
      ],
      defects: [],
      discrimination: [],
      gaps: [],
      source_id: SOURCE,
      stability: [],
    });
    const first = residualRiskToJson(report);
    expect(residualRiskToJson(residualRiskFromJson(first))).toBe(first);
    const blocked = decideRelease(report);
    expect(
      releaseDecisionFromJson(releaseDecisionToJson(blocked)),
    ).toEqual(blocked);
    const ready = decideRelease(
      renderResidualRisk({
        admission: [],
        conflicts: [],
        defects: [],
        discrimination: [],
        gaps: [],
        source_id: SOURCE,
        stability: [],
      }),
    );
    expect(
      releaseDecisionFromJson(releaseDecisionToJson(ready)),
    ).toEqual(ready);
    expect(() => residualRiskFromJson("not json")).toThrow(TypeError);
    expect(() => releaseDecisionFromJson("[]")).toThrow(TypeError);
  });
});
