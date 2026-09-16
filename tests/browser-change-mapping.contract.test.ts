import { describe, expect, it } from "vitest";
import {
  changeSelectionFromJson,
  changeSelectionToJson,
  createJourneyCandidate,
  selectJourneysForChanges,
} from "../src/browser/change-mapping.js";

const SOURCE = "tree@sha";

function candidate(journey_id: string, extra: Record<string, unknown> = {}) {
  return createJourneyCandidate({
    journey_id,
    obligation_refs: [],
    source_identity: SOURCE,
    tracked_paths: [],
    ...extra,
  });
}

describe("spec016 p016-11 change-to-journey mapping", () => {
  it("selects direct-path and obligation-ref matches", () => {
    const selection = selectJourneysForChanges({
      candidates: [
        candidate("j1", { tracked_paths: ["src/browser/evidence.ts"] }),
        candidate("j2", { obligation_refs: ["obl-9"] }),
      ],
      changed_obligation_refs: ["obl-9"],
      changed_paths: ["src/browser/evidence.ts"],
      selection_id: "sel-1",
      source_identity: SOURCE,
    });
    expect(selection.selected_journey_ids).toEqual(["j1", "j2"]);
    expect(selection.mappings.map((mapping) => mapping.kind)).toEqual(["direct-path", "obligation-ref"]);
  });

  it("never silently deselects: unproven relations stay selected as unknown", () => {
    const selection = selectJourneysForChanges({
      candidates: [candidate("j1", { tracked_paths: ["src/other.ts"] })],
      changed_paths: ["src/browser/journey.ts"],
      selection_id: "sel-2",
      source_identity: SOURCE,
    });
    expect(selection.selected_journey_ids).toEqual(["j1"]);
    expect(selection.mappings[0]?.kind).toBe("unknown");
  });

  it("marks source-context mismatches as unknown and selected", () => {
    const selection = selectJourneysForChanges({
      candidates: [candidate("j1", { source_identity: "other@sha", tracked_paths: ["src/a.ts"] })],
      changed_paths: ["src/a.ts"],
      selection_id: "sel-3",
      source_identity: SOURCE,
    });
    expect(selection.mappings[0]).toMatchObject({ kind: "unknown", selected: true });
  });

  it("keeps inferred mappings visibly inferred with a reason", () => {
    const selection = selectJourneysForChanges({
      candidates: [candidate("j1", { tracked_paths: ["src/other.ts"] })],
      changed_paths: ["src/browser/journey.ts"],
      inferred: { j1: "shared checkout flow" },
      selection_id: "sel-4",
      source_identity: SOURCE,
    });
    expect(selection.mappings[0]).toMatchObject({ kind: "inferred", selected: true });
  });

  it("rejects empty and duplicate change sets", () => {
    expect(() =>
      selectJourneysForChanges({
        candidates: [candidate("j1")],
        changed_paths: [],
        selection_id: "sel",
        source_identity: SOURCE,
      }),
    ).toThrow();
    expect(() =>
      selectJourneysForChanges({
        candidates: [candidate("j1")],
        changed_paths: ["src/a.ts", "src/a.ts"],
        selection_id: "sel",
        source_identity: SOURCE,
      }),
    ).toThrow(/duplicate/);
  });

  it("round-trips selections with digest stability", () => {
    const selection = selectJourneysForChanges({
      candidates: [candidate("j1", { tracked_paths: ["src/a.ts"] })],
      changed_paths: ["src/a.ts"],
      selection_id: "sel-5",
      source_identity: SOURCE,
    });
    const parsed = changeSelectionFromJson(changeSelectionToJson(selection));
    expect(parsed.digest).toBe(selection.digest);
    expect(parsed.selected_journey_ids).toEqual(selection.selected_journey_ids);
  });
});
