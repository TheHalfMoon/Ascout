import { describe, expect, it } from "vitest";
import {
  agentProposalFromJson,
  agenticAuthorizationDigest,
  agenticAuthorizationFromJson,
  agenticAuthorizationToJson,
  createAgentProposal,
  createAgenticAuthorization,
  evaluateProposalAdmission,
} from "../src/browser/agentic-authorization.js";

const SOURCE = "tree@sha";

function authorization() {
  return createAgenticAuthorization({
    authorization_id: "auth-1",
    benchmark_need: "explorer signal needed after deterministic benchmark passes",
    budget: { max_proposals: 3, max_tool_calls: 10 },
    deterministic_fallback: "deterministic locator policy and static journey list",
    model_policy: "model: pinned test model v1, proposal-only",
    privacy_policy: "no credentials or PII leave the trusted-local scope",
    prompt_allowlist: ["explore-prompt-v1"],
    provider_policy: "provider: local-only, no cloud control plane",
    source_identity: SOURCE,
    tool_allowlist: ["read-dom", "read-a11y"],
  });
}

function proposal(overrides: Record<string, unknown> = {}) {
  return createAgentProposal({
    authorization_id: "auth-1",
    input_refs: ["req-1", "diff-sha"],
    payload_digest: "abc123",
    prompt_id: "explore-prompt-v1",
    proposal_id: "prop-1",
    source_identity: SOURCE,
    tool_call_count: 2,
    tools_used: ["read-dom"],
    ...overrides,
  });
}

describe("spec016 p016-12 agentic proposal authorization", () => {
  it("admits a conforming proposal and accounts budget", () => {
    const admission = evaluateProposalAdmission(authorization(), proposal(), {
      proposals_used: 0,
      tool_calls_used: 0,
    });
    expect(admission.admitted).toBe(true);
    expect(admission.remaining_proposals).toBe(2);
    expect(admission.remaining_tool_calls).toBe(8);
  });

  it("rejects uncited, non-allowlisted, and cross-tree proposals", () => {
    const auth = authorization();
    expect(() =>
      createAgentProposal({
        authorization_id: "auth-1",
        input_refs: [],
        payload_digest: "x",
        prompt_id: "explore-prompt-v1",
        proposal_id: "p",
        source_identity: SOURCE,
        tool_call_count: 0,
        tools_used: [],
      }),
    ).toThrow();
    expect(
      evaluateProposalAdmission(auth, proposal({ prompt_id: "rogue-prompt" }), {
        proposals_used: 0,
        tool_calls_used: 0,
      }).admitted,
    ).toBe(false);
    expect(
      evaluateProposalAdmission(auth, proposal({ tools_used: ["exec-shell"] }), {
        proposals_used: 0,
        tool_calls_used: 0,
      }).blocking_reasons,
    ).toContain("tool-not-allowlisted:exec-shell");
    expect(
      evaluateProposalAdmission(auth, proposal({ source_identity: "other@sha" }), {
        proposals_used: 0,
        tool_calls_used: 0,
      }).blocking_reasons,
    ).toContain("cross-tree-proposal");
  });

  it("makes budget exhaustion visible and blocking", () => {
    const auth = authorization();
    const exhausted = evaluateProposalAdmission(auth, proposal(), {
      proposals_used: 3,
      tool_calls_used: 0,
    });
    expect(exhausted.admitted).toBe(false);
    expect(exhausted.blocking_reasons).toContain("proposal-budget-exhausted");
    const overTool = evaluateProposalAdmission(auth, proposal({ tool_call_count: 11 }), {
      proposals_used: 0,
      tool_calls_used: 0,
    });
    expect(overTool.blocking_reasons).toContain("tool-call-budget-exceeded");
  });

  it("requires complete authorization fields and fails closed", () => {
    expect(
      () =>
        authorization() &&
        createAgenticAuthorization({
          ...authorization(),
          authorization_id: "",
        }),
    ).toThrow();
    expect(() =>
      createAgenticAuthorization({ ...authorization(), prompt_allowlist: [] }),
    ).toThrow();
  });

  it("round-trips authorization and proposal with stable digest", () => {
    const auth = authorization();
    const parsed = agenticAuthorizationFromJson(agenticAuthorizationToJson(auth));
    expect(agenticAuthorizationDigest(parsed)).toBe(agenticAuthorizationDigest(auth));
    expect(agentProposalFromJson(JSON.stringify(proposal()))).toEqual(proposal());
  });
});
