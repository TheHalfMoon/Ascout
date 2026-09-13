import { describe, expect, it } from "vitest";
import {
  createDefectReport,
  defectReportFromJson,
  defectReportToJson,
  recordRegressionObligation,
} from "../src/quality/defect.js";
import {
  createOracle,
  deriveObligationStatus,
} from "../src/quality/obligation.js";
import {
  createFailureSignature,
  evaluateReproduction,
} from "../src/quality/reproduction.js";
import { createStabilityObservation } from "../src/quality/stability.js";
import { evaluateStability } from "../src/quality/stability.js";

const TEST = "test:checkout-total";
const SOURCE = "tree:e1f102a000000000000000000000000000000000";
const ENV = "env:node22-linux";

function reproducedReport() {
  const stability = evaluateStability({
    max_runs: 5,
    observations: [0, 1].map((run_index) =>
      createStabilityObservation({
        candidate_id: "candidate-w1",
        duration_ms: 31,
        environment_id: ENV,
        failure_class: "assertion",
        outcome: "fail",
        run_index,
        source_id: SOURCE,
        test_id: TEST,
      }),
    ),
    required_runs: 2,
  });
  return evaluateReproduction({
    minimizations: [],
    signature: createFailureSignature({
      failure_class: "assertion",
      source_id: SOURCE,
      test_id: TEST,
    }),
    stability,
  });
}

function defect() {
  return createDefectReport({
    id: "defect-1",
    obligation_ids: ["obligation-9"],
    reported_by: "maintainer:ali",
    reproduction: reproducedReport(),
    signature: createFailureSignature({
      failure_class: "assertion",
      source_id: SOURCE,
      test_id: TEST,
    }),
  });
}

function gatingOracle() {
  return createOracle({
    calibrated: true,
    class: "deterministic-assertion",
    description: "independent assertion",
    id: "oracle-r1",
    independence: "independent",
    provenance: "reviewed against the PRD",
  });
}

describe("spec015 wedge1 defect and regression", () => {
  it("records defects bound to their reproduction evidence", () => {
    const report = defect();
    expect(report.status).toBe("open");
    expect(report.reproduction.status).toBe("reproduced");
    expect(report.regression_obligation_id).toBeNull();
    expect(report.obligation_ids).toEqual(["obligation-9"]);
  });

  it("refuses reproduction bound to another test or source", () => {
    const other = evaluateReproduction({
      minimizations: [],
      signature: createFailureSignature({
        failure_class: "assertion",
        source_id: SOURCE,
        test_id: "test:other",
      }),
      stability: null,
    });
    expect(() =>
      createDefectReport({
        id: "defect-2",
        reported_by: "maintainer:ali",
        reproduction: other,
        signature: createFailureSignature({
          failure_class: "assertion",
          source_id: SOURCE,
          test_id: TEST,
        }),
      }),
    ).toThrow(TypeError);
  });

  it("records exactly one regression obligation with defect provenance", () => {
    const { defect: recorded, obligation } = recordRegressionObligation(
      defect(),
      {
        behavior: "checkout total includes tax after repair",
        id: "obligation-regression-1",
        oracle: gatingOracle(),
      },
    );
    expect(recorded.status).toBe("regression-recorded");
    expect(recorded.regression_obligation_id).toBe("obligation-regression-1");
    expect(obligation.requirement_ids).toEqual(["defect:defect-1"]);
    expect(obligation.risk_ids).toEqual(["risk:regression"]);
    expect(deriveObligationStatus(obligation, {})).toBe("open");
    expect(() =>
      recordRegressionObligation(recorded, {
        behavior: "again",
        id: "obligation-regression-2",
        oracle: gatingOracle(),
      }),
    ).toThrow(TypeError);
  });

  it("keeps observed-only failures honestly observed in the defect", () => {
    const observed = evaluateReproduction({
      minimizations: [],
      signature: createFailureSignature({
        failure_class: "assertion",
        source_id: SOURCE,
        test_id: TEST,
      }),
      stability: null,
    });
    const report = createDefectReport({
      id: "defect-3",
      reported_by: "maintainer:ali",
      reproduction: observed,
      signature: createFailureSignature({
        failure_class: "assertion",
        source_id: SOURCE,
        test_id: TEST,
      }),
    });
    expect(report.reproduction.status).toBe("observed");
  });

  it("round-trips open and recorded defects through deterministic JSON", () => {
    const first = defectReportToJson(defect());
    expect(defectReportToJson(defectReportFromJson(first))).toBe(first);
    const { defect: recorded } = recordRegressionObligation(defect(), {
      behavior: "checkout total includes tax after repair",
      id: "obligation-regression-1",
      oracle: gatingOracle(),
    });
    const second = defectReportToJson(recorded);
    expect(defectReportToJson(defectReportFromJson(second))).toBe(second);
    expect(defectReportFromJson(second).status).toBe("regression-recorded");
    expect(() => defectReportFromJson("not json")).toThrow(TypeError);
    const tampered = {
      ...(JSON.parse(first) as Record<string, unknown>),
      status: "fixed-by-magic",
    };
    expect(() => defectReportFromJson(JSON.stringify(tampered))).toThrow(
      TypeError,
    );
    const smuggled = {
      ...(JSON.parse(first) as Record<string, unknown>),
      regression_obligation_id: "obligation-smuggled",
    };
    expect(() => defectReportFromJson(JSON.stringify(smuggled))).toThrow(
      TypeError,
    );
  });
});
