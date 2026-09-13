import { describe, expect, it } from "vitest";
import { detectGaps, verifiedObligationIds } from "../src/quality/gap.js";
import type { ExistingTest } from "../src/quality/gap.js";
import {
  attachEvidence,
  createOracle,
  createRequirementConflict,
  createTestObligation,
  resolveRequirementConflict,
} from "../src/quality/obligation.js";
import type { TestObligation } from "../src/quality/obligation.js";

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

function advisoryOracle(id: string) {
  return createOracle({
    calibrated: true,
    class: "model-advisory",
    description: "unreviewed model suggestion",
    id,
    independence: "unknown",
    provenance: "model output",
  });
}

function obligation(
  id: string,
  oracleId: string,
  advisory = false,
): TestObligation {
  return attachEvidence(
    createTestObligation({
      behavior: `behavior ${id}`,
      id,
      oracle: advisory ? advisoryOracle(oracleId) : gatingOracle(oracleId),
    }),
    [`evidence-${id}`],
  );
}

function existingTest(id: string): ExistingTest {
  return {
    file: "tests/example.test.ts",
    id,
    name: `covers ${id}`,
    provenance: "declared mapping",
  };
}

describe("spec015 wedge1 gap detection", () => {
  it("reports obligations with no covering test as gaps", () => {
    const gaps = detectGaps({
      conflictsById: {},
      coveringTestsByObligationId: {},
      executedTestIds: new Set(),
      obligations: [obligation("o1", "oracle-1")],
    });
    expect(gaps).toEqual([
      { covering_test_ids: [], obligation_id: "o1", reason: "no-covering-test" },
    ]);
    expect(
      verifiedObligationIds({
        conflictsById: {},
        coveringTestsByObligationId: {},
        executedTestIds: new Set(),
        obligations: [obligation("o1", "oracle-1")],
      }),
    ).toEqual([]);
  });

  it("reports linked-but-unexecuted tests as gaps, never as coverage", () => {
    const gaps = detectGaps({
      conflictsById: {},
      coveringTestsByObligationId: { o2: [existingTest("t1")] },
      executedTestIds: new Set(),
      obligations: [obligation("o2", "oracle-2")],
    });
    expect(gaps).toEqual([
      {
        covering_test_ids: ["t1"],
        obligation_id: "o2",
        reason: "covering-test-unexecuted",
      },
    ]);
  });

  it("counts executed gating-oracle obligations as verified", () => {
    const args = {
      conflictsById: {},
      coveringTestsByObligationId: { o3: [existingTest("t2")] },
      executedTestIds: new Set(["t2"]),
      obligations: [obligation("o3", "oracle-3")],
    };
    expect(detectGaps(args)).toEqual([]);
    expect(verifiedObligationIds(args)).toEqual(["o3"]);
  });

  it("flags executed advisory-oracle obligations as advisory-only gaps", () => {
    const gaps = detectGaps({
      conflictsById: {},
      coveringTestsByObligationId: { o4: [existingTest("t3")] },
      executedTestIds: new Set(["t3"]),
      obligations: [obligation("o4", "oracle-4", true)],
    });
    expect(gaps).toEqual([
      {
        covering_test_ids: ["t3"],
        obligation_id: "o4",
        reason: "oracle-advisory-only",
      },
    ]);
    expect(
      verifiedObligationIds({
        conflictsById: {},
        coveringTestsByObligationId: { o4: [existingTest("t3")] },
        executedTestIds: new Set(["t3"]),
        obligations: [obligation("o4", "oracle-4", true)],
      }),
    ).toEqual([]);
  });

  it("blocks obligations with unresolved linked conflicts first", () => {
    const conflict = createRequirementConflict({
      id: "c1",
      party_ids: ["prd-a", "code-a"],
      summary: "open disagreement",
    });
    const withConflict = {
      ...obligation("o5", "oracle-5"),
      conflict_ids: ["c1"],
    };
    const args = {
      conflictsById: { c1: conflict },
      coveringTestsByObligationId: { o5: [existingTest("t4")] },
      executedTestIds: new Set(["t4"]),
      obligations: [withConflict],
    };
    expect(detectGaps(args)).toEqual([
      {
        covering_test_ids: ["t4"],
        obligation_id: "o5",
        reason: "blocked-by-conflict",
      },
    ]);
    const resolved = resolveRequirementConflict(
      conflict,
      "requirement-wins",
      "maintainer:ali",
    );
    expect(
      detectGaps({ ...args, conflictsById: { c1: resolved } }),
    ).toEqual([]);
  });

  it("marks obligations with dangling conflict links unresolved", () => {
    const withDangling = {
      ...obligation("o6", "oracle-6"),
      conflict_ids: ["c-missing"],
    };
    expect(
      detectGaps({
        conflictsById: {},
        coveringTestsByObligationId: {},
        executedTestIds: new Set(),
        obligations: [withDangling],
      }),
    ).toEqual([
      {
        covering_test_ids: [],
        obligation_id: "o6",
        reason: "obligation-unresolved",
      },
    ]);
  });

  it("emits gaps in deterministic obligation-id order", () => {
    const first = detectGaps({
      conflictsById: {},
      coveringTestsByObligationId: {},
      executedTestIds: new Set(),
      obligations: [obligation("o-b", "oracle-b"), obligation("o-a", "oracle-a")],
    });
    expect(first.map((gap) => gap.obligation_id)).toEqual(["o-a", "o-b"]);
    expect(JSON.stringify(first)).toBe(
      JSON.stringify(
        detectGaps({
          conflictsById: {},
          coveringTestsByObligationId: {},
          executedTestIds: new Set(),
          obligations: [
            obligation("o-a", "oracle-a"),
            obligation("o-b", "oracle-b"),
          ],
        }),
      ),
    );
  });

  it("rejects malformed existing-test records instead of skipping them", () => {
    expect(() =>
      detectGaps({
        conflictsById: {},
        coveringTestsByObligationId: {
          o7: [{ file: "f", id: "", name: "n", provenance: "p" }],
        },
        executedTestIds: new Set(),
        obligations: [obligation("o7", "oracle-7")],
      }),
    ).toThrow(TypeError);
  });
});
