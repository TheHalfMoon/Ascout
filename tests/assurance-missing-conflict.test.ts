import { describe, expect, it } from "vitest";

import {
  assertContradictionRecordResolvesV1,
  assertOmissionRecordResolvesV1,
  createContradictionRecordV1,
  createOmissionRecordV1,
  parseContradictionRecordV1,
  parseOmissionRecordV1,
} from "../src/assurance/contracts/missing-conflict.js";
import { createAssuranceTargetV1 } from "../src/assurance/contracts/target.js";
import type { SourceStateV1 } from "../src/receipt/model.js";

const A = "a".repeat(64);
const D = "d".repeat(64);
const HEAD = "b".repeat(40);
const BASE = "c".repeat(40);

function source(): SourceStateV1 {
  return {
    repository_id: "remote:" + A,
    repository_id_kind: "remote",
    portable: true,
    head_sha: HEAD,
    detached: false,
    shallow: false,
    tree_digest_version: 1,
    tree_digest: D,
    tracked_index_entry_count: 14,
    unstaged_changed_count: 0,
    included_untracked_count: 0,
  };
}

function target(targetId = "target:ua-p01-t11") {
  return createAssuranceTargetV1({
    target_id: targetId,
    source_start_identity: source(),
    base_revision: BASE,
    change_set_identity: "changeset:ua-p01-t11",
    worktree_generation: "generation:11",
    policy_snapshot_id: "policy:canonical-v1",
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P01-T11",
      acceptance_id: "acceptance:missing-conflict-v1",
    },
    environment_identity: null,
    graph_index_generation: null,
    build_artifact_identity: null,
  });
}

function omissionInput() {
  return {
    omission_id: "omission:security-network",
    target_id: "target:ua-p01-t11",
    check_class: "check:dynamic-security",
    reason_code: "EFFECT_UNAVAILABLE",
    reason_text:
      "The required network effect was not authorized for this assurance run.",
    claim_impact:
      "Dynamic endpoint behavior remains unobserved and cannot support a readiness claim.",
    required_qualification: null,
    required_effect: "E4_AUTHORIZED_NETWORK",
    evidence_refs: ["evidence:policy", "evidence:plan", "evidence:policy"],
  } as const;
}

function contradictionInput() {
  return {
    contradiction_id: "contradiction:review-security-1",
    target_id: "target:ua-p01-t11",
    left_claim_ref: "claim:review-clean",
    right_claim_ref: "claim:security-finding",
    left_evidence_refs: ["evidence:review-b", "evidence:review-a"],
    right_evidence_refs: ["evidence:security-b", "evidence:security-a"],
    producer_identities: ["producer:security", "producer:review"],
    reconciliation_status: "UNRESOLVED",
    required_next_evidence: ["evidence:reproduction", "evidence:reverify"],
  } as const;
}

describe("UA-P01-T11 OmissionRecord", () => {
  it("constructs explicit missing-evidence data without a green signal", () => {
    const omission = createOmissionRecordV1(omissionInput());

    expect(omission.schema_version).toBe(1);
    expect(omission.reason_code).toBe("EFFECT_UNAVAILABLE");
    expect(omission.required_effect).toBe("E4_AUTHORIZED_NETWORK");
    expect(omission.evidence_refs).toEqual([
      "evidence:plan",
      "evidence:policy",
    ]);
    expect("pass" in omission).toBe(false);
    expect("ready" in omission).toBe(false);
    expect("claim_authority" in omission).toBe(false);
  });

  it("round-trips strict persisted omission data", () => {
    const omission = createOmissionRecordV1(omissionInput());
    expect(parseOmissionRecordV1(structuredClone(omission))).toEqual(
      omission,
    );
  });

  it("requires an explicit unavailable qualification or effect", () => {
    expect(() =>
      createOmissionRecordV1({
        ...omissionInput(),
        required_qualification: null,
        required_effect: null,
      }),
    ).toThrow(
      "omission must identify an unavailable required qualification or effect",
    );
  });

  it("accepts an explicit unavailable qualification without an effect", () => {
    const omission = createOmissionRecordV1({
      ...omissionInput(),
      required_qualification: "qualification:engine-release",
      required_effect: null,
    });

    expect(omission.required_qualification).toBe(
      "qualification:engine-release",
    );
    expect(omission.required_effect).toBeNull();
  });

  it("requires bounded single-line reason and claim impact text", () => {
    expect(() =>
      createOmissionRecordV1({
        ...omissionInput(),
        reason_text: "line one\nline two",
      }),
    ).toThrow(
      "reason_text must be bounded non-empty single-line text",
    );

    expect(() =>
      createOmissionRecordV1({
        ...omissionInput(),
        claim_impact: "",
      }),
    ).toThrow(
      "claim_impact must be bounded non-empty single-line text",
    );
  });

  it("resolves exact target and evidence lineage", () => {
    const omission = createOmissionRecordV1(omissionInput());

    expect(() =>
      assertOmissionRecordResolvesV1(
        omission,
        target(),
        new Set(["evidence:plan", "evidence:policy"]),
      ),
    ).not.toThrow();
  });

  it("rejects cross-target omission records", () => {
    const omission = createOmissionRecordV1(omissionInput());

    expect(() =>
      assertOmissionRecordResolvesV1(
        omission,
        target("target:other"),
        new Set(["evidence:plan", "evidence:policy"]),
      ),
    ).toThrow("omission target_id does not match AssuranceTarget");
  });

  it("rejects dangling omission evidence refs", () => {
    const omission = createOmissionRecordV1(omissionInput());

    expect(() =>
      assertOmissionRecordResolvesV1(
        omission,
        target(),
        new Set(["evidence:policy"]),
      ),
    ).toThrow(
      "omission evidence ref does not resolve: evidence:plan",
    );
  });

  it("rejects non-canonical persisted omission evidence refs", () => {
    const omission = createOmissionRecordV1(omissionInput());

    expect(() =>
      parseOmissionRecordV1({
        ...omission,
        evidence_refs: ["evidence:policy", "evidence:plan"],
      }),
    ).toThrow("evidence_refs must be unique and canonically sorted");

    expect(() =>
      parseOmissionRecordV1({
        ...omission,
        evidence_refs: ["evidence:plan", "evidence:plan"],
      }),
    ).toThrow("evidence_refs must be unique and canonically sorted");
  });

  it("rejects unknown authority-like fields", () => {
    const omission = createOmissionRecordV1(omissionInput());

    expect(() =>
      parseOmissionRecordV1({
        ...omission,
        terminal_claim_authority: true,
      }),
    ).toThrow("omission record contains missing or unknown fields");
  });
});

describe("UA-P01-T11 ContradictionRecord", () => {
  it("preserves both conflicting sides and their lineage", () => {
    const contradiction = createContradictionRecordV1(
      contradictionInput(),
    );

    expect(contradiction.left_claim_ref).toBe("claim:review-clean");
    expect(contradiction.right_claim_ref).toBe(
      "claim:security-finding",
    );
    expect(contradiction.left_evidence_refs).toEqual([
      "evidence:review-a",
      "evidence:review-b",
    ]);
    expect(contradiction.right_evidence_refs).toEqual([
      "evidence:security-a",
      "evidence:security-b",
    ]);
    expect(contradiction.producer_identities).toEqual([
      "producer:review",
      "producer:security",
    ]);
    expect("preferred_side" in contradiction).toBe(false);
    expect("terminal_claim_authority" in contradiction).toBe(false);
  });

  it("round-trips strict persisted contradiction data", () => {
    const contradiction = createContradictionRecordV1(
      contradictionInput(),
    );
    expect(
      parseContradictionRecordV1(structuredClone(contradiction)),
    ).toEqual(contradiction);
  });

  it("requires evidence lineage on both contradiction sides", () => {
    expect(() =>
      createContradictionRecordV1({
        ...contradictionInput(),
        left_evidence_refs: [],
      }),
    ).toThrow(
      "left_evidence_refs must contain between 1 and 256 items",
    );

    expect(() =>
      createContradictionRecordV1({
        ...contradictionInput(),
        right_evidence_refs: [],
      }),
    ).toThrow(
      "right_evidence_refs must contain between 1 and 256 items",
    );
  });

  it("requires explicit producer lineage and next evidence", () => {
    expect(() =>
      createContradictionRecordV1({
        ...contradictionInput(),
        producer_identities: [],
      }),
    ).toThrow(
      "producer_identities must contain between 1 and 256 items",
    );

    expect(() =>
      createContradictionRecordV1({
        ...contradictionInput(),
        required_next_evidence: [],
      }),
    ).toThrow(
      "required_next_evidence must contain between 1 and 256 items",
    );
  });

  it("resolves both sides against explicit target and evidence sets", () => {
    const contradiction = createContradictionRecordV1(
      contradictionInput(),
    );

    expect(() =>
      assertContradictionRecordResolvesV1(
        contradiction,
        target(),
        new Set([
          "evidence:review-a",
          "evidence:review-b",
          "evidence:security-a",
          "evidence:security-b",
        ]),
      ),
    ).not.toThrow();
  });

  it("rejects cross-target contradiction records", () => {
    const contradiction = createContradictionRecordV1(
      contradictionInput(),
    );

    expect(() =>
      assertContradictionRecordResolvesV1(
        contradiction,
        target("target:other"),
        new Set([
          "evidence:review-a",
          "evidence:review-b",
          "evidence:security-a",
          "evidence:security-b",
        ]),
      ),
    ).toThrow(
      "contradiction target_id does not match AssuranceTarget",
    );
  });

  it("rejects dangling evidence from either contradiction side", () => {
    const contradiction = createContradictionRecordV1(
      contradictionInput(),
    );

    expect(() =>
      assertContradictionRecordResolvesV1(
        contradiction,
        target(),
        new Set([
          "evidence:review-a",
          "evidence:review-b",
          "evidence:security-a",
        ]),
      ),
    ).toThrow(
      "contradiction evidence ref does not resolve: evidence:security-b",
    );
  });

  it("rejects non-canonical persisted contradiction lists", () => {
    const contradiction = createContradictionRecordV1(
      contradictionInput(),
    );

    expect(() =>
      parseContradictionRecordV1({
        ...contradiction,
        producer_identities: [
          "producer:security",
          "producer:review",
        ],
      }),
    ).toThrow(
      "producer_identities must be unique and canonically sorted",
    );

    expect(() =>
      parseContradictionRecordV1({
        ...contradiction,
        required_next_evidence: [
          "evidence:reverify",
          "evidence:reproduction",
        ],
      }),
    ).toThrow(
      "required_next_evidence must be unique and canonically sorted",
    );
  });

  it("rejects malformed reconciliation state", () => {
    expect(() =>
      createContradictionRecordV1({
        ...contradictionInput(),
        reconciliation_status: "unresolved",
      }),
    ).toThrow(
      "reconciliation_status must be an uppercase bounded state identifier",
    );
  });

  it("rejects unknown authority or silent-resolution fields", () => {
    const contradiction = createContradictionRecordV1(
      contradictionInput(),
    );

    expect(() =>
      parseContradictionRecordV1({
        ...contradiction,
        reconciliation_mutation_authority: true,
      }),
    ).toThrow(
      "contradiction record contains missing or unknown fields",
    );

    expect(() =>
      parseContradictionRecordV1({
        ...contradiction,
        preferred_side: "LEFT",
      }),
    ).toThrow(
      "contradiction record contains missing or unknown fields",
    );
  });
});
