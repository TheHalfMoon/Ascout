import { describe, expect, it } from "vitest";

import {
  REVIEW_SCOPE_KINDS,
  assertReviewProfileV1,
  createReviewProfileV1,
} from "../src/assurance/review/review-profile.js";

describe("UA-P03-T02 review profile scopes", () => {
  it("accepts all five normalized scope kinds", () => {
    expect(REVIEW_SCOPE_KINDS).toEqual([
      "diff",
      "pr",
      "workspace",
      "spec",
      "correctness",
    ]);
    for (const scope_kind of REVIEW_SCOPE_KINDS) {
      const check = assertReviewProfileV1(
        createReviewProfileV1({
          profile_id: "profile:t02-" + scope_kind,
          scope_kind,
          scope_ref: "scope:t02-" + scope_kind,
          target_id: "target:t02",
        }),
      );
      expect(check).toEqual({ ok: true, reasons: [] });
    }
  });

  it("fails closed on defaults", () => {
    const profile = createReviewProfileV1({
      profile_id: "profile:t02-defaults",
      scope_kind: "diff",
      scope_ref: "scope:t02-defaults",
      target_id: "target:t02",
    });
    expect(profile.metadata.execution_location).toBe("LOCAL_ONLY");
    expect(profile.metadata.operator_cost_class).toBe("ZERO");
    expect(profile.metadata.network_policy).toBe("DENY_ALL");
    expect(profile.metadata.egress_class).toBe("NONE");
    expect(profile.metadata.provider_identity).toBeNull();
  });

  it("rejects malformed scope and metadata", () => {
    const base = createReviewProfileV1({
      profile_id: "profile:t02-malformed",
      scope_kind: "diff",
      scope_ref: "scope:t02-malformed",
      target_id: "target:t02",
    });
    expect(
      assertReviewProfileV1({ ...base, scope_kind: "vibes" } as never).reasons,
    ).toContain("scope kind invalid");
    expect(
      assertReviewProfileV1({ ...base, scope_ref: "" }).reasons,
    ).toContain("scope ref invalid");
    expect(
      assertReviewProfileV1({ ...base, target_id: "../escape" }).reasons,
    ).toContain("target id invalid");
    expect(
      assertReviewProfileV1({
        ...base,
        metadata: { ...base.metadata, operator_cost_class: "METERED" },
      } as never).reasons,
    ).toContain("operator cost must be ZERO");
  });

  it("rejects contradictory network and egress bindings", () => {
    const base = createReviewProfileV1({
      profile_id: "profile:t02-net",
      scope_kind: "pr",
      scope_ref: "scope:t02-net",
      target_id: "target:t02",
    });
    expect(
      assertReviewProfileV1({
        ...base,
        metadata: {
          ...base.metadata,
          network_policy: "DENY_ALL",
          egress_class: "USER_OWNED_TARGETS",
        },
      }).reasons,
    ).toContain("deny-all network with non-none egress");
    expect(
      assertReviewProfileV1({
        ...base,
        metadata: {
          ...base.metadata,
          network_policy: "LOCALHOST_ONLY",
          egress_class: "PROVIDER_SPECIFIC",
          provider_identity: "provider:t02",
        },
      }).reasons,
    ).toContain("localhost-only network with non-loopback egress");
  });

  it("requires explicit funded identity for external providers", () => {
    const base = createReviewProfileV1({
      profile_id: "profile:t02-provider",
      scope_kind: "workspace",
      scope_ref: "scope:t02-provider",
      target_id: "target:t02",
    });
    const missing = assertReviewProfileV1({
      ...base,
      metadata: {
        ...base.metadata,
        execution_location: "EXTERNAL_PROVIDER",
        network_policy: "PROVIDER_SPECIFIC",
        egress_class: "PROVIDER_SPECIFIC",
      },
    });
    expect(missing.reasons).toContain(
      "external provider without explicit funded identity",
    );
    const unfunded = assertReviewProfileV1({
      ...base,
      metadata: {
        ...base.metadata,
        execution_location: "EXTERNAL_PROVIDER",
        network_policy: "PROVIDER_SPECIFIC",
        egress_class: "PROVIDER_SPECIFIC",
        provider_identity: "provider:t02",
        user_cost_class: "ZERO",
      },
    });
    expect(unfunded.reasons).toContain(
      "external provider without explicit funded identity",
    );
    const funded = assertReviewProfileV1({
      ...base,
      metadata: {
        ...base.metadata,
        execution_location: "EXTERNAL_PROVIDER",
        network_policy: "PROVIDER_SPECIFIC",
        egress_class: "PROVIDER_SPECIFIC",
        provider_identity: "provider:t02",
        user_cost_class: "USER_FUNDED_EXPLICIT",
      },
    });
    expect(funded).toEqual({ ok: true, reasons: [] });
  });

  it("allows explicit user-owned egress under local execution", () => {
    const base = createReviewProfileV1({
      profile_id: "profile:t02-user-owned",
      scope_kind: "diff",
      scope_ref: "scope:t02-user-owned",
      target_id: "target:t02",
    });
    const check = assertReviewProfileV1({
      ...base,
      metadata: {
        ...base.metadata,
        network_policy: "ALLOWLIST",
        egress_class: "USER_OWNED_TARGETS",
      },
    });
    expect(check).toEqual({ ok: true, reasons: [] });
  });
});
