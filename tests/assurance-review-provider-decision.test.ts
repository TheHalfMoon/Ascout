import { describe, expect, it } from "vitest";

import {
  currentReviewProviderPolicyV1,
  decideReviewProviderV1,
  type ReviewProviderCandidateV1,
} from "../src/assurance/review/review-provider-decision.js";

const POLICY = currentReviewProviderPolicyV1("claude-opus");

function candidate(overrides: Partial<ReviewProviderCandidateV1> = {}, metadata: Partial<ReviewProviderCandidateV1["metadata"]> = {}): ReviewProviderCandidateV1 {
  return {
    provider_identity: "provider:local-model",
    model_family: "local-coder",
    authorized_by_founder: true,
    ...overrides,
    metadata: {
      execution_location: "LOCAL_ONLY",
      user_cost_class: "ZERO",
      egress_class: "LOOPBACK_ONLY",
      network_policy: "LOCALHOST_ONLY",
      credential_required: false,
      hardware_class: "CPU_ONLY",
      artifact_sensitivity: "INTERNAL",
      offline_capable: true,
      isolation_required: false,
      ...metadata,
    },
  };
}

describe("decideReviewProviderV1", () => {
  it("reports NOT_RUN when no provider is configured", () => {
    expect(decideReviewProviderV1(null, POLICY)).toMatchObject({
      state: "NOT_RUN",
      reason_codes: ["NO_PROVIDER_CONFIGURED"],
      satisfies_human_r1: false,
    });
  });

  it("allows an authorized, free, local provider of another model family as advisory only", () => {
    const result = decideReviewProviderV1(candidate(), POLICY);
    expect(result).toMatchObject({ state: "RUNNABLE_ADVISORY", independence: "INDEPENDENT_MODEL", satisfies_human_r1: false });
    expect(result.reason_codes).toEqual(["ADVISORY_ONLY"]);
  });

  it("never treats a provider of the author's own model family as independent", () => {
    const result = decideReviewProviderV1(candidate({ model_family: "claude-opus" }), POLICY);
    expect(result).toMatchObject({ state: "RUNNABLE_ADVISORY", independence: "SAME_MODEL_FAMILY" });
    expect(result.reason_codes).toEqual(["ADVISORY_SAME_MODEL_FAMILY"]);
  });

  it("blocks a provider the founder has not authorized", () => {
    expect(decideReviewProviderV1(candidate({ authorized_by_founder: false }), POLICY)).toMatchObject({
      state: "BLOCKED",
      reason_codes: ["PROVIDER_NOT_AUTHORIZED"],
    });
  });

  it("blocks a hosted, paid provider and names every reason", () => {
    const hosted = candidate({}, {
      execution_location: "EXTERNAL_PROVIDER",
      user_cost_class: "USER_FUNDED_EXPLICIT",
      egress_class: "PROVIDER_SPECIFIC",
      network_policy: "PROVIDER_SPECIFIC",
      credential_required: true,
    });
    expect(decideReviewProviderV1(hosted, POLICY)).toMatchObject({
      state: "BLOCKED",
      reason_codes: ["PAID_PROVIDER_NOT_AUTHORIZED", "SOURCE_EGRESS_NOT_AUTHORIZED", "CREDENTIAL_REQUIRED"],
    });
  });

  it("blocks a free provider that still sends source off this machine", () => {
    const remote = candidate({}, { execution_location: "USER_REMOTE", egress_class: "USER_OWNED_TARGETS", network_policy: "USER_OWNED_NETWORK_TARGETS" });
    expect(decideReviewProviderV1(remote, POLICY).reason_codes).toEqual(["SOURCE_EGRESS_NOT_AUTHORIZED"]);
  });

  it("blocks a provider whose description contradicts itself", () => {
    const contradictory = candidate({}, { network_policy: "DENY_ALL", egress_class: "LOOPBACK_ONLY" });
    expect(decideReviewProviderV1(contradictory, POLICY)).toMatchObject({
      state: "BLOCKED",
      reason_codes: ["INVALID_PROVIDER_DESCRIPTION"],
      provider_identity: null,
    });
  });

  it.each(["", "has space", "x".repeat(65)])("blocks an unusable model family %j", (family) => {
    expect(decideReviewProviderV1(candidate({ model_family: family }), POLICY).reason_codes).toEqual(["INVALID_PROVIDER_DESCRIPTION"]);
  });

  it("treats anything but a literal true as no authorization", () => {
    const loose = candidate({ authorized_by_founder: "yes" as unknown as boolean });
    expect(decideReviewProviderV1(loose, POLICY).reason_codes).toContain("PROVIDER_NOT_AUTHORIZED");
  });

  it("never claims human R1, in any state", () => {
    for (const input of [null, candidate(), candidate({ authorized_by_founder: false }), candidate({ model_family: "claude-opus" })]) {
      expect(decideReviewProviderV1(input, POLICY).satisfies_human_r1).toBe(false);
    }
  });
});
