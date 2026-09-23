import { describe, expect, it } from "vitest";

import {
  OPENCODE_REVIEW_LICENSE_IDENTITY,
  OPENCODE_REVIEW_PINNED_SHA,
  OPENCODE_REVIEW_PINNED_TREE,
  OPENCODE_REVIEW_REPOSITORY,
  assertOpenCodeReviewPinV1,
  createOpenCodeReviewPinV1,
  decideLzG01V1,
  lzG01AdmitsProviderEnginesV1,
} from "../src/assurance/review/opencode-review-pin.js";

describe("UA-P03-T01 OpenCodeReview re-pin", () => {
  it("freezes the exact live-verified upstream pin", () => {
    expect(OPENCODE_REVIEW_REPOSITORY).toBe(
      "https://github.com/alibaba/open-code-review",
    );
    expect(OPENCODE_REVIEW_PINNED_SHA).toBe(
      "5f8e5ab328e1449ba4d5f14d2a7542117543d753",
    );
    expect(OPENCODE_REVIEW_PINNED_TREE).toBe(
      "727a2a6d34a26a274ad31a503171435f99f3a171",
    );
    expect(OPENCODE_REVIEW_LICENSE_IDENTITY).toBe("license:apache-2.0");
  });

  it("accepts only the exact pin with a clean adapter delta", () => {
    const check = assertOpenCodeReviewPinV1(createOpenCodeReviewPinV1());
    expect(check).toEqual({ ok: true, reasons: [] });
  });

  it("rejects drift in every pin dimension", () => {
    const base = createOpenCodeReviewPinV1();
    expect(
      assertOpenCodeReviewPinV1({ ...base, commit_sha: "0".repeat(40) }).reasons,
    ).toContain("commit sha mismatch");
    expect(
      assertOpenCodeReviewPinV1({ ...base, tree_sha: "0".repeat(40) }).reasons,
    ).toContain("tree sha mismatch");
    expect(
      assertOpenCodeReviewPinV1({ ...base, license_identity: "license:mit" })
        .reasons,
    ).toContain("license identity mismatch");
    expect(
      assertOpenCodeReviewPinV1({
        ...base,
        adapter_dependency_delta: "ADDS_RUNTIME_DEPENDENCY",
      }).reasons,
    ).toContain("adapter dependency delta not clean");
    expect(
      assertOpenCodeReviewPinV1({ ...base, use_type: "VENDORED_COPY" }).reasons,
    ).toContain("use type mismatch");
  });

  it("records absence of an upstream NOTICE file explicitly", () => {
    expect(createOpenCodeReviewPinV1().notice_state).toBe(
      "ABSENT_UPSTREAM_AT_PIN",
    );
  });
});

describe("UA-P03-T01 LZ-G01 compatibility decision", () => {
  it("resolves outcome A with all ten supplementary dimensions", () => {
    const decision = decideLzG01V1();
    expect(decision.outcome).toBe("COMPATIBLE_WITH_SUPPLEMENTAL_METADATA");
    expect(decision.supplementary_dimensions).toHaveLength(10);
    expect(decision.rationale.length).toBeGreaterThan(0);
    expect(lzG01AdmitsProviderEnginesV1(decision)).toBe(true);
  });

  it("stops provider-dependent admission under outcomes B and C", () => {
    expect(
      lzG01AdmitsProviderEnginesV1({
        outcome: "CONTRACT_AMENDMENT_REQUIRED",
        rationale: ["amendment first"],
        supplementary_dimensions: [],
      }),
    ).toBe(false);
    expect(
      lzG01AdmitsProviderEnginesV1({
        outcome: "DEFERRED",
        rationale: ["deferred"],
        supplementary_dimensions: [],
      }),
    ).toBe(false);
  });
});
