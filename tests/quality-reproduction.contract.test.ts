import { describe, expect, it } from "vitest";
import {
  createFailureSignature,
  createMinimizationClaim,
  evaluateReproduction,
  isFailureReproduced,
  reproductionReportFromJson,
  reproductionReportToJson,
} from "../src/quality/reproduction.js";
import { createStabilityObservation } from "../src/quality/stability.js";
import { evaluateStability } from "../src/quality/stability.js";

const TEST = "test:checkout-total";
const SOURCE = "tree:cc2031a000000000000000000000000000000000";
const ENV = "env:node22-linux";

function signature(failureClass: string | null = "assertion") {
  return createFailureSignature({
    failure_class: failureClass,
    source_id: SOURCE,
    test_id: TEST,
  });
}

function failingStability() {
  return evaluateStability({
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
}

function claim(
  reproducerId: string,
  original: number,
  minimized: number,
  reproduces = true,
  preserved = true,
) {
  return createMinimizationClaim({
    minimized_bytes: minimized,
    original_bytes: original,
    reproducer_id: reproducerId,
    reproduces,
    signature_preserved: preserved,
    source_id: SOURCE,
  });
}

describe("spec015 wedge1 reproduction evidence", () => {
  it("reports classless capture without reruns as unresolved", () => {
    const report = evaluateReproduction({
      minimizations: [],
      signature: signature(null),
      stability: null,
    });
    expect(report.status).toBe("unresolved");
    expect(report.reproducer_ids).toEqual([]);
    expect(report.minimization_ratio).toBeNull();
    expect(isFailureReproduced(report)).toBe(false);
  });

  it("reports classified capture without reruns as observed, never reproduced", () => {
    const report = evaluateReproduction({
      minimizations: [],
      signature: signature(),
      stability: null,
    });
    expect(report.status).toBe("observed");
    expect(isFailureReproduced(report)).toBe(false);
  });

  it("reports bounded repeated equivalent failures as reproduced", () => {
    const report = evaluateReproduction({
      minimizations: [],
      signature: signature(),
      stability: failingStability(),
    });
    expect(report.status).toBe("reproduced");
    expect(isFailureReproduced(report)).toBe(true);
  });

  it("keeps passing and flaky stability at observed", () => {
    const passing = evaluateStability({
      max_runs: 5,
      observations: [0, 1].map((run_index) =>
        createStabilityObservation({
          candidate_id: "candidate-w1",
          duration_ms: 11,
          environment_id: ENV,
          failure_class: null,
          outcome: "pass",
          run_index,
          source_id: SOURCE,
          test_id: TEST,
        }),
      ),
      required_runs: 2,
    });
    expect(
      evaluateReproduction({
        minimizations: [],
        signature: signature(),
        stability: passing,
      }).status,
    ).toBe("observed");
  });

  it("reports strictly smaller signature-preserving reproducers as minimized", () => {
    const report = evaluateReproduction({
      minimizations: [claim("repro-1", 1200, 180)],
      signature: signature(),
      stability: failingStability(),
    });
    expect(report.status).toBe("minimized");
    expect(report.reproducer_ids).toEqual(["repro-1"]);
    expect(report.minimization_ratio).toBeCloseTo(0.15, 10);
    expect(isFailureReproduced(report)).toBe(true);
  });

  it("keeps non-shrinking valid claims at reproduced", () => {
    const report = evaluateReproduction({
      minimizations: [claim("repro-2", 400, 400)],
      signature: signature(),
      stability: failingStability(),
    });
    expect(report.status).toBe("reproduced");
    expect(report.reproducer_ids).toEqual(["repro-2"]);
    expect(report.minimization_ratio).toBe(1);
  });

  it("ignores reproducers that fail to reproduce or lose the signature", () => {
    const report = evaluateReproduction({
      minimizations: [
        claim("repro-3", 1200, 100, false, true),
        claim("repro-4", 1200, 100, true, false),
      ],
      signature: signature(),
      stability: failingStability(),
    });
    expect(report.status).toBe("reproduced");
    expect(report.reproducer_ids).toEqual([]);
    expect(report.minimization_ratio).toBeNull();
  });

  it("throws on cross-tree minimization and mismatched stability", () => {
    expect(() =>
      evaluateReproduction({
        minimizations: [
          createMinimizationClaim({
            minimized_bytes: 100,
            original_bytes: 1200,
            reproducer_id: "repro-x",
            reproduces: true,
            signature_preserved: true,
            source_id: "tree:other000000000000000000000000000000000",
          }),
        ],
        signature: signature(),
        stability: failingStability(),
      }),
    ).toThrow(TypeError);
    const otherStability = evaluateStability({
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
          test_id: "test:other",
        }),
      ),
      required_runs: 2,
    });
    expect(() =>
      evaluateReproduction({
        minimizations: [],
        signature: signature(),
        stability: otherStability,
      }),
    ).toThrow(TypeError);
  });

  it("fails closed on malformed signatures and claims", () => {
    expect(() =>
      createFailureSignature({
        failure_class: "",
        source_id: SOURCE,
        test_id: TEST,
      }),
    ).toThrow(TypeError);
    expect(() =>
      createMinimizationClaim({
        minimized_bytes: 0,
        original_bytes: 1200,
        reproducer_id: "repro-y",
        reproduces: true,
        signature_preserved: true,
        source_id: SOURCE,
      }),
    ).toThrow(TypeError);
    expect(() =>
      createMinimizationClaim({
        minimized_bytes: 1300,
        original_bytes: 1200,
        reproducer_id: "repro-z",
        reproduces: true,
        signature_preserved: true,
        source_id: SOURCE,
      }),
    ).toThrow(TypeError);
  });

  it("round-trips minimized and unresolved reports through deterministic JSON", () => {
    const minimized = evaluateReproduction({
      minimizations: [claim("repro-1", 1200, 180)],
      signature: signature(),
      stability: failingStability(),
    });
    const first = reproductionReportToJson(minimized);
    expect(
      reproductionReportToJson(reproductionReportFromJson(first)),
    ).toBe(first);
    const unresolved = evaluateReproduction({
      minimizations: [],
      signature: signature(null),
      stability: null,
    });
    expect(
      reproductionReportFromJson(
        reproductionReportToJson(unresolved),
      ),
    ).toEqual(unresolved);
    const reproducedSameSize = evaluateReproduction({
      minimizations: [claim("repro-2", 400, 400)],
      signature: signature(),
      stability: failingStability(),
    });
    expect(
      reproductionReportFromJson(
        reproductionReportToJson(reproducedSameSize),
      ),
    ).toEqual(reproducedSameSize);
    expect(() => reproductionReportFromJson("not json")).toThrow(TypeError);
    const tampered = {
      ...(JSON.parse(first) as Record<string, unknown>),
      status: "explained-by-magic",
    };
    expect(() => reproductionReportFromJson(JSON.stringify(tampered))).toThrow(
      TypeError,
    );
  });
});
