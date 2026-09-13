import { describe, expect, it } from "vitest";
import {
  attachEvidence,
  conflictBlocksRelease,
  createOracle,
  createRequirementConflict,
  createRequirementSource,
  createTestObligation,
  deriveObligationStatus,
  isCircularOracle,
  obligationFromJson,
  obligationToJson,
  oracleMayGateRelease,
  resolveRequirementConflict,
} from "../src/quality/obligation.js";

function independentOracle() {
  return createOracle({
    calibrated: true,
    class: "deterministic-assertion",
    description: "asserts exact rendered total",
    id: "oracle-1",
    independence: "independent",
    provenance: "hand-written assertion reviewed against the PRD",
  });
}

describe("spec015 wedge1 obligation model", () => {
  it("starts every conflict unresolved so code never wins silently", () => {
    const conflict = createRequirementConflict({
      id: "conflict-1",
      party_ids: ["prd-billing", "code-billing"],
      summary: "PRD requires tax-inclusive totals; code renders tax-exclusive",
    });
    expect(conflict.resolution).toBe("unresolved");
    expect(conflict.resolved_by).toBeNull();
    expect(conflictBlocksRelease(conflict)).toBe(true);
  });

  it("rejects conflicts with fewer than two distinct parties", () => {
    expect(() =>
      createRequirementConflict({
        id: "conflict-2",
        party_ids: ["code-only"],
        summary: "single party",
      }),
    ).toThrow(TypeError);
    expect(() =>
      createRequirementConflict({
        id: "conflict-3",
        party_ids: ["code-a", "code-a"],
        summary: "duplicate party",
      }),
    ).toThrow(TypeError);
  });

  it("records explicit resolutions with an accountable resolver", () => {
    const conflict = createRequirementConflict({
      id: "conflict-4",
      party_ids: ["test-checkout", "code-checkout"],
      summary: "test expects retry; code fails fast",
    });
    const resolved = resolveRequirementConflict(
      conflict,
      "human-review",
      "maintainer:ali",
    );
    expect(resolved.resolution).toBe("human-review");
    expect(resolved.resolved_by).toBe("maintainer:ali");
    expect(conflictBlocksRelease(resolved)).toBe(false);
  });

  it("rejects empty resolvers and unknown resolution values", () => {
    const conflict = createRequirementConflict({
      id: "conflict-5",
      party_ids: ["prd-a", "code-a"],
      summary: "disagreement",
    });
    expect(() =>
      resolveRequirementConflict(conflict, "human-review", ""),
    ).toThrow(TypeError);
    expect(() =>
      resolveRequirementConflict(
        conflict,
        "code-wins" as never,
        "maintainer:ali",
      ),
    ).toThrow(TypeError);
  });

  it("lets only proven independent calibrated oracles gate release", () => {
    expect(oracleMayGateRelease(independentOracle())).toBe(true);
    expect(
      oracleMayGateRelease(
        createOracle({
          calibrated: false,
          class: "deterministic-assertion",
          description: "uncalibrated",
          id: "oracle-2",
          independence: "independent",
          provenance: "unreviewed draft",
        }),
      ),
    ).toBe(false);
    expect(
      oracleMayGateRelease(
        createOracle({
          calibrated: true,
          class: "differential",
          description: "derived from implementation output",
          id: "oracle-3",
          independence: "derived",
          provenance: "generated from current code",
        }),
      ),
    ).toBe(false);
    expect(
      oracleMayGateRelease(
        createOracle({
          calibrated: true,
          class: "model-advisory",
          description: "model suggestion",
          id: "oracle-4",
          independence: "unknown",
          provenance: "model output without review",
        }),
      ),
    ).toBe(false);
  });

  it("fails circular oracles closed even when marked calibrated", () => {
    const circular = createOracle({
      calibrated: true,
      class: "structural-contract",
      description: "contract generated from the code under test",
      id: "oracle-5",
      independence: "circular",
      provenance: "self-attested by the subject under test",
    });
    expect(isCircularOracle(circular)).toBe(true);
    expect(oracleMayGateRelease(circular)).toBe(false);
    expect(isCircularOracle(independentOracle())).toBe(false);
  });

  it("never reports covered without bound evidence", () => {
    const obligation = createTestObligation({
      behavior: "checkout total includes tax",
      id: "obligation-1",
      oracle: independentOracle(),
    });
    expect(obligation.status).toBe("open");
    expect(deriveObligationStatus(obligation, {})).toBe("open");
  });

  it("reports covered only when evidence is bound and no conflict blocks", () => {
    const withEvidence = attachEvidence(
      createTestObligation({
        behavior: "checkout total includes tax",
        id: "obligation-2",
        oracle: independentOracle(),
      }),
      ["evidence-1"],
    );
    expect(deriveObligationStatus(withEvidence, {})).toBe("covered");
  });

  it("forces blocked-by-conflict while a linked conflict is unresolved", () => {
    const conflict = createRequirementConflict({
      id: "conflict-6",
      party_ids: ["prd-x", "code-x"],
      summary: "open disagreement",
    });
    const obligation = attachEvidence(
      createTestObligation({
        behavior: "disputed behavior",
        conflict_ids: ["conflict-6"],
        id: "obligation-3",
        oracle: independentOracle(),
      }),
      ["evidence-9"],
    );
    expect(
      deriveObligationStatus(obligation, { "conflict-6": conflict }),
    ).toBe("blocked-by-conflict");
    const resolved = resolveRequirementConflict(
      conflict,
      "requirement-wins",
      "maintainer:ali",
    );
    expect(
      deriveObligationStatus(obligation, { "conflict-6": resolved }),
    ).toBe("covered");
  });

  it("marks obligations with unknown linked conflicts unresolved", () => {
    const obligation = createTestObligation({
      behavior: "behavior with dangling conflict link",
      conflict_ids: ["conflict-missing"],
      id: "obligation-4",
      oracle: independentOracle(),
    });
    expect(deriveObligationStatus(obligation, {})).toBe("unresolved");
  });

  it("round-trips obligations through deterministic JSON", () => {
    const obligation = attachEvidence(
      createTestObligation({
        behavior: "refund path emits a receipt",
        id: "obligation-5",
        oracle: independentOracle(),
        requirement_ids: ["req-7"],
        risk_ids: ["risk-3"],
      }),
      ["evidence-2"],
    );
    const covered = {
      ...obligation,
      status: deriveObligationStatus(obligation, {}),
    };
    const first = obligationToJson(covered);
    const second = obligationToJson(obligationFromJson(first));
    expect(second).toBe(first);
    expect(obligationFromJson(first)).toEqual(covered);
  });

  it("rejects malformed obligation JSON without manufacturing content", () => {
    expect(() => obligationFromJson("not json")).toThrow(TypeError);
    expect(() => obligationFromJson("[]")).toThrow(TypeError);
    expect(() =>
      obligationFromJson(JSON.stringify({ id: "x" })),
    ).toThrow(TypeError);
    const valid = obligationToJson({
      ...createTestObligation({
        behavior: "b",
        id: "obligation-6",
        oracle: independentOracle(),
      }),
      status: "open" as const,
    });
    const tampered = JSON.parse(valid) as Record<string, unknown>;
    tampered.status = "covered-by-magic";
    expect(() => obligationFromJson(JSON.stringify(tampered))).toThrow(
      TypeError,
    );
  });

  it("creates requirement sources only with known kinds and provenance", () => {
    const source = createRequirementSource({
      description: "billing PRD section 4",
      id: "prd-billing",
      kind: "prd",
      provenance: "repo:docs/prd/billing.md@9f53c4d",
    });
    expect(source.kind).toBe("prd");
    expect(() =>
      createRequirementSource({
        description: "x",
        id: "bad",
        kind: "rumor" as never,
        provenance: "nowhere",
      }),
    ).toThrow(TypeError);
    expect(() =>
      createRequirementSource({
        description: "x",
        id: "bad-2",
        kind: "code",
        provenance: "",
      }),
    ).toThrow(TypeError);
  });
});
