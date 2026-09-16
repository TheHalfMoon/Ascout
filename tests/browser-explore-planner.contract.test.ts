import { describe, expect, it } from "vitest";
import { createAgenticAuthorization } from "../src/browser/agentic-authorization.js";
import {
  createPlannerInputs,
  exploreProposalFromJson,
  exploreProposalToJson,
  planExploration,
} from "../src/browser/explore-planner.js";

const SOURCE = "tree@sha";

function authorization() {
  return createAgenticAuthorization({
    authorization_id: "auth-1",
    benchmark_need: "explorer signal needed",
    budget: { max_proposals: 3, max_tool_calls: 10 },
    deterministic_fallback: "static journey list",
    model_policy: "model: pinned test model v1, proposal-only",
    privacy_policy: "trusted-local scope only",
    prompt_allowlist: ["explore-prompt-v1"],
    provider_policy: "provider: local-only",
    source_identity: SOURCE,
    tool_allowlist: ["read-dom"],
  });
}

function inputs() {
  return createPlannerInputs({
    browser_state_refs: ["state-1"],
    diff_refs: ["diff-1"],
    journey_refs: ["journey-1"],
    requirement_refs: ["req-1"],
  });
}

function candidate(candidate_id: string, cited_inputs: string[] = ["req-1", "diff-1", "journey-1", "state-1"]) {
  return {
    candidate_id,
    cited_inputs,
    kind: "missing-journey" as const,
    rationale: "checkout flow has no journey covering duplicate submit",
    uncertainty: "unknown whether duplicate submit is reachable in this build",
  };
}

describe("spec016 p016-13 explore planner", () => {
  it("emits structured proposals citing every input class", () => {
    const proposal = planExploration({
      authorization: authorization(),
      candidates: [candidate("c1")],
      inputs: inputs(),
      proposal_id: "prop-1",
      source_identity: SOURCE,
      tool_calls_used: 2,
    });
    expect(proposal.uncovered_input_classes).toEqual([]);
    expect(proposal.candidates).toHaveLength(1);
    expect(proposal.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("declares uncited or missing input classes as uncertainty", () => {
    const partial = planExploration({
      authorization: authorization(),
      candidates: [candidate("c1", ["req-1"])],
      inputs: inputs(),
      proposal_id: "prop-2",
      source_identity: SOURCE,
      tool_calls_used: 1,
    });
    expect(partial.uncovered_input_classes).toContain("diff:uncited");
    const empty = planExploration({
      authorization: authorization(),
      candidates: [],
      inputs: createPlannerInputs({ requirement_refs: ["req-1"] }),
      proposal_id: "prop-3",
      source_identity: SOURCE,
      tool_calls_used: 0,
    });
    expect(empty.uncovered_input_classes).toContain("diff:no-inputs");
  });

  it("rejects unknown citations, duplicates, and budget overruns", () => {
    const auth = authorization();
    expect(() =>
      planExploration({
        authorization: auth,
        candidates: [candidate("c1", ["ghost-ref"])],
        inputs: inputs(),
        proposal_id: "p",
        source_identity: SOURCE,
        tool_calls_used: 0,
      }),
    ).toThrow(/unknown input/);
    expect(() =>
      planExploration({
        authorization: auth,
        candidates: [candidate("c1"), candidate("c1")],
        inputs: inputs(),
        proposal_id: "p",
        source_identity: SOURCE,
        tool_calls_used: 0,
      }),
    ).toThrow(/duplicate/);
    expect(() =>
      planExploration({
        authorization: auth,
        candidates: [candidate("c1")],
        inputs: inputs(),
        proposal_id: "p",
        source_identity: SOURCE,
        tool_calls_used: 11,
      }),
    ).toThrow(/budget exhausted/);
  });

  it("rejects cross-tree planner input", () => {
    expect(() =>
      planExploration({
        authorization: authorization(),
        candidates: [],
        inputs: inputs(),
        proposal_id: "p",
        source_identity: "other@sha",
        tool_calls_used: 0,
      }),
    ).toThrow(/cross-tree/);
  });

  it("round-trips with digest integrity", () => {
    const auth = authorization();
    const proposal = planExploration({
      authorization: auth,
      candidates: [candidate("c1")],
      inputs: inputs(),
      proposal_id: "prop-4",
      source_identity: SOURCE,
      tool_calls_used: 1,
    });
    const parsed = exploreProposalFromJson(exploreProposalToJson(proposal), auth);
    expect(parsed.digest).toBe(proposal.digest);
    expect({ ...parsed }).toEqual({ ...proposal });
  });
});
