import { describe, expect, it } from "vitest";
import {
  createJourney,
  createJourneyEdge,
  evaluateJourneyCoverage,
  journeyDigest,
  journeyFromJson,
  journeyToJson,
} from "../src/browser/journey.js";

function baseJourney(overrides: Record<string, unknown> = {}) {
  return createJourney({
    edges: [
      createJourneyEdge({
        edge_id: "e1",
        from_node: "n1",
        kind: "observed",
        run_id: "run-1",
        source_identity: "tree@sha",
        to_node: "n2",
      }),
    ],
    journey_id: "j1",
    nodes: [
      { label: "Start", node_id: "n1", obligation_refs: ["obl-1"] },
      { label: "Checkout", node_id: "n2", obligation_refs: [] },
    ],
    obligation_refs: ["obl-1"],
    oracle_refs: ["oracle-1"],
    session_id: "sess-1",
    source_identity: "tree@sha",
    ...overrides,
  });
}

describe("spec016 p016-10 journey evidence model", () => {
  it("evaluates coverage PASS only with obligation and oracle evidence", () => {
    const coverage = evaluateJourneyCoverage(baseJourney());
    expect(coverage.verdict).toBe("pass");
    expect(coverage.blocking_reasons).toEqual([]);
  });

  it("blocks PASS without obligation or oracle evidence", () => {
    expect(evaluateJourneyCoverage(baseJourney({ obligation_refs: [] })).verdict).toBe("blocked");
    expect(evaluateJourneyCoverage(baseJourney({ oracle_refs: [] })).verdict).toBe("blocked");
  });

  it("requires reasons on inferred edges and run ids on observed edges", () => {
    expect(() =>
      createJourneyEdge({
        edge_id: "e",
        from_node: "n1",
        kind: "inferred",
        reason: null,
        source_identity: "tree@sha",
        to_node: "n2",
      }),
    ).toThrow();
    expect(() =>
      createJourneyEdge({
        edge_id: "e",
        from_node: "n1",
        kind: "observed",
        run_id: null,
        source_identity: "tree@sha",
        to_node: "n2",
      }),
    ).toThrow();
  });

  it("rejects cross-tree edges and dangling endpoints", () => {
    expect(() =>
      baseJourney({
        edges: [
          createJourneyEdge({
            edge_id: "e1",
            from_node: "n1",
            kind: "observed",
            run_id: "run-1",
            source_identity: "other@sha",
            to_node: "n2",
          }),
        ],
      }),
    ).toThrow(/cross-tree/);
    expect(() =>
      baseJourney({
        edges: [
          createJourneyEdge({
            edge_id: "e1",
            from_node: "n1",
            kind: "observed",
            run_id: "run-1",
            source_identity: "tree@sha",
            to_node: "missing",
          }),
        ],
      }),
    ).toThrow(/dangling/);
  });

  it("round-trips deterministically with stable digest", () => {
    const journey = baseJourney();
    const parsed = journeyFromJson(journeyToJson(journey));
    expect(journeyDigest(parsed)).toBe(journeyDigest(journey));
    expect(parsed).toEqual(journey);
  });

  it("rejects duplicate nodes and empty journeys", () => {
    expect(() =>
      createJourney({
        edges: [],
        journey_id: "j",
        nodes: [],
        session_id: "s",
        source_identity: "tree@sha",
      }),
    ).toThrow();
    expect(() =>
      createJourney({
        edges: [],
        journey_id: "j",
        nodes: [
          { label: "A", node_id: "n", obligation_refs: [] },
          { label: "B", node_id: "n", obligation_refs: [] },
        ],
        session_id: "s",
        source_identity: "tree@sha",
      }),
    ).toThrow(/duplicate/);
  });
});
