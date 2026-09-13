import { describe, expect, it } from "vitest";
import {
  createDiscriminationEvidence,
  discriminationReportFromJson,
  discriminationReportToJson,
  evaluateDiscrimination,
  isDiscriminationProven,
} from "../src/quality/discrimination.js";
import type {
  DiscriminationEvidence,
  DiscriminationKind,
} from "../src/quality/discrimination.js";

const CANDIDATE = "candidate-w1";
const SOURCE = "tree:21bf216000000000000000000000000000000000";

function evidence(
  kind: DiscriminationKind,
  target: string,
  detected: boolean,
): DiscriminationEvidence {
  return createDiscriminationEvidence({
    candidate_id: CANDIDATE,
    detail: null,
    detected,
    kind,
    source_id: SOURCE,
    target_id: target,
  });
}

const ALL_KINDS: readonly DiscriminationKind[] = [
  "mutant-killed",
  "controlled-revert-detected",
  "known-defect-detected",
  "withheld-detected",
  "property-violated",
  "differential-mismatch",
  "independent-oracle",
];

describe("spec015 wedge1 discrimination proof", () => {
  it("reports empty evidence as not-run, never proven", () => {
    const report = evaluateDiscrimination({ evidence: [] });
    expect(report.verdict).toBe("not-run");
    expect(report.trials).toBe(0);
    expect(isDiscriminationProven(report)).toBe(false);
  });

  it("proves usefulness on a single mutant kill", () => {
    const report = evaluateDiscrimination({
      evidence: [evidence("mutant-killed", "mutant-1", true)],
    });
    expect(report.verdict).toBe("proven");
    expect(report.trials).toBe(1);
    expect(report.detections).toBe(1);
    expect(report.contradicted_pairs).toBe(0);
    expect(report.proven_kinds).toEqual(["mutant-killed"]);
    expect(isDiscriminationProven(report)).toBe(true);
  });

  it("accepts every canonical discrimination kind", () => {
    for (const kind of ALL_KINDS) {
      const report = evaluateDiscrimination({
        evidence: [evidence(kind, "target-1", true)],
      });
      expect(report.verdict).toBe("proven");
      expect(report.proven_kinds).toEqual([kind]);
    }
  });

  it("leaves detection-free evidence unproven while keeping the repertoire", () => {
    const report = evaluateDiscrimination({
      evidence: [
        evidence("mutant-killed", "mutant-1", false),
        evidence("property-violated", "prop-total", false),
      ],
    });
    expect(report.verdict).toBe("unproven");
    expect(report.tried_kinds).toEqual(["mutant-killed", "property-violated"]);
    expect(report.proven_kinds).toEqual([]);
    expect(isDiscriminationProven(report)).toBe(false);
  });

  it("proves only the kinds with clean positive pairs", () => {
    const report = evaluateDiscrimination({
      evidence: [
        evidence("mutant-killed", "mutant-1", false),
        evidence("controlled-revert-detected", "revert-a", true),
      ],
    });
    expect(report.verdict).toBe("proven");
    expect(report.proven_kinds).toEqual(["controlled-revert-detected"]);
  });

  it("poisons contradicted pairs instead of counting them as proof", () => {
    const report = evaluateDiscrimination({
      evidence: [
        evidence("mutant-killed", "mutant-1", true),
        evidence("mutant-killed", "mutant-1", false),
      ],
    });
    expect(report.verdict).toBe("unproven");
    expect(report.contradicted_pairs).toBe(1);
    expect(report.proven_kinds).toEqual([]);
  });

  it("keeps clean pairs proven alongside contradicted ones", () => {
    const report = evaluateDiscrimination({
      evidence: [
        evidence("mutant-killed", "mutant-1", true),
        evidence("mutant-killed", "mutant-1", false),
        evidence("withheld-detected", "withheld-7", true),
      ],
    });
    expect(report.verdict).toBe("proven");
    expect(report.contradicted_pairs).toBe(1);
    expect(report.proven_kinds).toEqual(["withheld-detected"]);
  });

  it("rejects evidence spanning candidates or sources", () => {
    expect(() =>
      evaluateDiscrimination({
        evidence: [
          evidence("mutant-killed", "mutant-1", true),
          createDiscriminationEvidence({
            candidate_id: "candidate-other",
            detail: null,
            detected: true,
            kind: "mutant-killed",
            source_id: SOURCE,
            target_id: "mutant-2",
          }),
        ],
      }),
    ).toThrow(TypeError);
    expect(() =>
      evaluateDiscrimination({
        evidence: [
          evidence("mutant-killed", "mutant-1", true),
          createDiscriminationEvidence({
            candidate_id: CANDIDATE,
            detail: null,
            detected: true,
            kind: "mutant-killed",
            source_id: "tree:other000000000000000000000000000000000",
            target_id: "mutant-2",
          }),
        ],
      }),
    ).toThrow(TypeError);
  });

  it("fails closed on malformed evidence", () => {
    expect(() =>
      createDiscriminationEvidence({
        candidate_id: "",
        detail: null,
        detected: true,
        kind: "mutant-killed",
        source_id: SOURCE,
        target_id: "mutant-1",
      }),
    ).toThrow(TypeError);
    expect(() =>
      createDiscriminationEvidence({
        candidate_id: CANDIDATE,
        detail: null,
        detected: true,
        kind: "mutant-killed",
        source_id: SOURCE,
        target_id: "",
      }),
    ).toThrow(TypeError);
    expect(() =>
      createDiscriminationEvidence({
        candidate_id: CANDIDATE,
        detail: "",
        detected: true,
        kind: "mutant-killed",
        source_id: SOURCE,
        target_id: "mutant-1",
      }),
    ).toThrow(TypeError);
    expect(() =>
      createDiscriminationEvidence({
        candidate_id: CANDIDATE,
        detail: null,
        detected: true,
        kind: "oracle-magic" as never,
        source_id: SOURCE,
        target_id: "mutant-1",
      }),
    ).toThrow(TypeError);
  });

  it("round-trips reports through deterministic JSON", () => {
    const report = evaluateDiscrimination({
      evidence: [
        evidence("mutant-killed", "mutant-1", true),
        evidence("property-violated", "prop-total", false),
      ],
    });
    const first = discriminationReportToJson(report);
    expect(
      discriminationReportToJson(discriminationReportFromJson(first)),
    ).toBe(first);
    expect(discriminationReportFromJson(first)).toEqual(report);
    expect(() => discriminationReportFromJson("not json")).toThrow(TypeError);
    const tampered = {
      ...(JSON.parse(first) as Record<string, unknown>),
      verdict: "proven-by-magic",
    };
    expect(() => discriminationReportFromJson(JSON.stringify(tampered))).toThrow(
      TypeError,
    );
  });
});
