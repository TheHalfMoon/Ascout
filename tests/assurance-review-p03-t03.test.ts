import { describe, expect, it } from "vitest";

import {
  MAX_CAPSULE_BYTES,
  MAX_CAPSULE_SECTIONS,
  assertReviewContextCapsuleV1,
  createReviewContextCapsuleV1,
  type ContextSectionV1,
} from "../src/assurance/review/context-capsule.js";

function section(overrides: Partial<ContextSectionV1> = {}): ContextSectionV1 {
  return {
    kind: "source",
    ref: "source:t03-file",
    digest_sha256: "a".repeat(64),
    byte_size: 1024,
    truncated: false,
    truncated_from_bytes: null,
    ...overrides,
  };
}

function capsule(sections: readonly ContextSectionV1[] = [section()]) {
  return createReviewContextCapsuleV1({
    capsule_id: "capsule:t03",
    profile_id: "profile:t03",
    target_id: "target:t03",
    sections,
    provenance: {
      source_identity: "source:t03",
      collector_identity: "collector:t03",
      head_sha: "b".repeat(40),
    },
  });
}

describe("UA-P03-T03 context capsule", () => {
  it("accepts a bounded capsule with exact provenance", () => {
    const check = assertReviewContextCapsuleV1(capsule());
    expect(check).toEqual({ ok: true, reasons: [] });
    expect(capsule().total_bytes).toBe(1024);
  });

  it("requires explicit truncation facts", () => {
    const silent = capsule([
      section({ truncated: true, truncated_from_bytes: null }),
    ]);
    expect(assertReviewContextCapsuleV1(silent).reasons).toContain(
      "truncation without explicit source size",
    );
    const explicit = capsule([
      section({
        truncated: true,
        truncated_from_bytes: 4096,
        byte_size: 1024,
      }),
    ]);
    expect(assertReviewContextCapsuleV1(explicit)).toEqual({
      ok: true,
      reasons: [],
    });
  });

  it("refuses unbounded and oversize context", () => {
    const unbounded = capsule([section({ byte_size: -1 })]);
    expect(assertReviewContextCapsuleV1(unbounded).reasons).toContain(
      "section byte size unbounded",
    );
    const big = capsule([
      section({ byte_size: MAX_CAPSULE_BYTES + 1 }),
    ]);
    expect(assertReviewContextCapsuleV1(big).reasons).toContain(
      "capsule oversize",
    );
    const many = capsule(
      Array.from({ length: MAX_CAPSULE_SECTIONS + 1 }, (_, index) =>
        section({ ref: "source:t03-" + index, byte_size: 1 }),
      ),
    );
    expect(assertReviewContextCapsuleV1(many).reasons).toContain(
      "too many sections",
    );
  });

  it("rejects unknown kinds, bad digests, and missing provenance", () => {
    const kind = capsule([section({ kind: "chat" } as never)]);
    expect(assertReviewContextCapsuleV1(kind).reasons).toContain(
      "section kind invalid",
    );
    const digest = capsule([section({ digest_sha256: "xyz" })]);
    expect(assertReviewContextCapsuleV1(digest).reasons).toContain(
      "section digest invalid",
    );
    const provenance = {
      ...capsule(),
      provenance: {
        source_identity: "",
        collector_identity: "collector:t03",
        head_sha: "not-a-sha",
      },
    };
    const reasons = assertReviewContextCapsuleV1(provenance).reasons;
    expect(reasons).toContain("source identity invalid");
    expect(reasons).toContain("head sha invalid");
  });

  it("detects byte accounting mismatch", () => {
    const mismatch = { ...capsule(), total_bytes: 1 };
    expect(assertReviewContextCapsuleV1(mismatch).reasons).toContain(
      "total bytes mismatch",
    );
  });
});
