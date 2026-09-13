import { describe, expect, it } from "vitest";
import {
  attachCandidateEvidence,
  candidateProposalFromJson,
  candidateProposalToJson,
  createCandidateProposal,
  rejectCandidateProposal,
} from "../src/quality/candidate.js";
import { detectGaps, verifiedObligationIds } from "../src/quality/gap.js";
import {
  attachEvidence,
  createOracle,
  createTestObligation,
} from "../src/quality/obligation.js";

const SOURCE = "tree:930d03e000000000000000000000000000000000";

function gatingOracle() {
  return createOracle({
    calibrated: true,
    class: "deterministic-assertion",
    description: "independent assertion",
    id: "oracle-c1",
    independence: "independent",
    provenance: "reviewed against the PRD",
  });
}

function proposal(overrides?: Record<string, unknown>) {
  return createCandidateProposal({
    body: "it('covers the obligation', () => { expect(total(100)).toBe(115); });",
    generated_by: "template:obligation-scaffold-v1",
    id: "candidate-1",
    obligation_id: "obligation-9",
    oracle: gatingOracle(),
    source_id: SOURCE,
    test_file: "tests/quality/candidate-checkout.test.ts",
    test_name: "covers the obligation",
    ...overrides,
  } as Parameters<typeof createCandidateProposal>[0]);
}

describe("spec015 wedge1 candidate proposal", () => {
  it("creates proposals bound to an obligation and source tree", () => {
    const candidate = proposal();
    expect(candidate.status).toBe("proposed");
    expect(candidate.evidence_ids).toEqual([]);
    expect(candidate.rejection_reason).toBeNull();
    expect(candidate.obligation_id).toBe("obligation-9");
    expect(candidate.source_id).toBe(SOURCE);
    expect(candidate.generated_by).toBe("template:obligation-scaffold-v1");
  });

  it("refuses test files that escape repo-relative spelling", () => {
    for (const testFile of [
      "",
      "/abs/path.test.ts",
      "C:/win/path.test.ts",
      "tests/../escape.test.ts",
      "..",
      ".",
      "./relative.test.ts",
      "tests\\win.test.ts",
      "tests//double.test.ts",
    ]) {
      expect(() => proposal({ test_file: testFile })).toThrow(TypeError);
    }
  });

  it("accepts nested repo-relative test paths", () => {
    expect(
      proposal({ test_file: "tests/quality/nested/candidate.test.ts" })
        .test_file,
    ).toBe("tests/quality/nested/candidate.test.ts");
  });

  it("rejects empty proposal content and provenance", () => {
    expect(() => proposal({ body: "" })).toThrow(TypeError);
    expect(() => proposal({ test_name: "" })).toThrow(TypeError);
    expect(() => proposal({ generated_by: "" })).toThrow(TypeError);
    expect(() => proposal({ id: "" })).toThrow(TypeError);
    expect(() => proposal({ obligation_id: "" })).toThrow(TypeError);
    expect(() => proposal({ source_id: "" })).toThrow(TypeError);
  });

  it("records advisory-oracle proposals without granting gate authority", () => {
    const advisory = proposal({
      oracle: createOracle({
        calibrated: true,
        class: "model-advisory",
        description: "unreviewed model suggestion",
        id: "oracle-c2",
        independence: "unknown",
        provenance: "model output",
      }),
    });
    expect(advisory.status).toBe("proposed");
  });

  it("rejects forward-only with an accountable reason", () => {
    const rejected = rejectCandidateProposal(proposal(), "kills no mutant");
    expect(rejected.status).toBe("rejected");
    expect(rejected.rejection_reason).toBe("kills no mutant");
    expect(() => rejectCandidateProposal(proposal(), "")).toThrow(TypeError);
    expect(() => rejectCandidateProposal(rejected, "again")).toThrow(
      TypeError,
    );
  });

  it("attaches evaluation evidence without changing proposal identity", () => {
    const withEvidence = attachCandidateEvidence(proposal(), [
      "evidence-stability-1",
    ]);
    expect(withEvidence.evidence_ids).toEqual(["evidence-stability-1"]);
    expect(withEvidence.id).toBe("candidate-1");
    expect(withEvidence.status).toBe("proposed");
  });

  it("never lets a bare proposal close a unit-test gap", () => {
    const obligation = attachEvidence(
      createTestObligation({
        behavior: "checkout total includes tax",
        id: "obligation-9",
        oracle: gatingOracle(),
      }),
      ["evidence-obligation-9"],
    );
    const args = {
      conflictsById: {},
      coveringTestsByObligationId: {},
      executedTestIds: new Set<string>(),
      obligations: [obligation],
    };
    expect(candidateProposalFromJson(candidateProposalToJson(proposal())).id).toBe(
      "candidate-1",
    );
    expect(detectGaps(args)).toEqual([
      {
        covering_test_ids: [],
        obligation_id: "obligation-9",
        reason: "no-covering-test",
      },
    ]);
    expect(verifiedObligationIds(args)).toEqual([]);
  });

  it("round-trips proposed and rejected candidates through deterministic JSON", () => {
    const first = candidateProposalToJson(
      attachCandidateEvidence(proposal(), ["evidence-1"]),
    );
    expect(candidateProposalToJson(candidateProposalFromJson(first))).toBe(
      first,
    );
    const rejected = candidateProposalToJson(
      rejectCandidateProposal(proposal(), "flaky under reruns"),
    );
    expect(candidateProposalToJson(candidateProposalFromJson(rejected))).toBe(
      rejected,
    );
    expect(candidateProposalFromJson(rejected).status).toBe("rejected");
  });

  it("rejects malformed candidate JSON without manufacturing content", () => {
    expect(() => candidateProposalFromJson("not json")).toThrow(TypeError);
    expect(() => candidateProposalFromJson("[]")).toThrow(TypeError);
    const tampered = {
      ...(JSON.parse(
        candidateProposalToJson(proposal()),
      ) as Record<string, unknown>),
      status: "admitted-by-magic",
    };
    expect(() => candidateProposalFromJson(JSON.stringify(tampered))).toThrow(
      TypeError,
    );
    const reasoned = {
      ...(JSON.parse(
        candidateProposalToJson(proposal()),
      ) as Record<string, unknown>),
      rejection_reason: "unasked-for reason",
    };
    expect(() => candidateProposalFromJson(JSON.stringify(reasoned))).toThrow(
      TypeError,
    );
  });
});
