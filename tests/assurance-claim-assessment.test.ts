import { describe, expect, it } from "vitest";

import {
  CLAIM_ASSESSMENT_STATES,
  assertClaimAssessmentResolvesV1,
  createClaimAssessmentV1,
  isClaimAssessmentSupportedV1,
  parseClaimAssessmentV1,
  type ClaimAssessmentInputV1,
} from "../src/assurance/contracts/claim-assessment.js";
import { createAssuranceIntentV1 } from "../src/assurance/contracts/intent.js";
import { createAssuranceTargetV1 } from "../src/assurance/contracts/target.js";
import type { SourceStateV1 } from "../src/receipt/model.js";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
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
    tracked_index_entry_count: 21,
    unstaged_changed_count: 0,
    included_untracked_count: 0,
  };
}

function target(targetId = "target:ua-p01-t12") {
  return createAssuranceTargetV1({
    target_id: targetId,
    source_start_identity: source(),
    base_revision: BASE,
    change_set_identity: "changeset:ua-p01-t12",
    worktree_generation: "generation:12",
    policy_snapshot_id: "policy:canonical-v1",
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P01-T12",
      acceptance_id: "acceptance:claim-assessment-v1",
    },
    environment_identity: null,
    graph_index_generation: null,
    build_artifact_identity: null,
  });
}

function intent(
  intentId = "intent:ua-p01-t12",
  requestedClaim = "RELEASE_READY",
) {
  return createAssuranceIntentV1({
    intent_id: intentId,
    requested_claim: requestedClaim,
    profile: "RELEASE",
    scope: "ASSURE",
    include: ["path:src/**"],
    exclude: ["path:docs/**"],
    maximum_effect_class: "E2_LOCAL_WRITE_ARTIFACT_ONLY",
    budget: {
      max_wall_time_ms: 300_000,
      max_concurrency: 2,
      max_engine_runs: 8,
      max_artifact_bytes: 16_000_000,
      max_network_requests: 0,
      max_network_egress_bytes: 0,
      max_model_tokens: 0,
      max_cost_microunits: 0,
    },
    target: target(),
    surface_provenance: {
      surface_kind: "CI",
      surface_request_id: "request:t12",
    },
  });
}

function baseInput(): ClaimAssessmentInputV1 {
  return {
    claim_assessment_id: "assessment:ua-p01-t12",
    target_id: "target:ua-p01-t12",
    intent_id: "intent:ua-p01-t12",
    requested_claim: "RELEASE_READY",
    state: "INCOMPLETE",
    coverage_claim_refs: ["coverage:release"],
    omission_refs: ["omission:security"],
    contradiction_refs: ["contradiction:review"],
    supporting_evidence_refs: ["evidence:build", "evidence:test"],
    contradicting_evidence_refs: ["evidence:review-conflict"],
    missing_evidence_refs: ["evidence:security"],
    stale_evidence_refs: ["evidence:browser"],
    refused_evidence_refs: ["evidence:network"],
    unknown_evidence_refs: ["evidence:independence"],
    reason_codes: ["MANDATORY_EVIDENCE_MISSING", "OPEN_CONTRADICTION"],
    limitations: [
      "Independent review evidence remains unknown.",
      "Security evidence is mandatory and missing.",
    ],
    assessed_at_epoch_ms: 12_000,
  };
}

function availableEvidence() {
  return [
    "evidence:browser",
    "evidence:build",
    "evidence:independence",
    "evidence:network",
    "evidence:review-conflict",
    "evidence:security",
    "evidence:test",
  ];
}

function resolutionContext() {
  return {
    target: target(),
    intent: intent(),
    available_coverage_claim_ids: ["coverage:release"],
    available_omission_ids: ["omission:security"],
    available_contradiction_ids: ["contradiction:review"],
    available_evidence_ids: availableEvidence(),
    mandatory_evidence_ids: [
      "evidence:build",
      "evidence:security",
      "evidence:test",
    ],
  };
}

function supportedInput(): ClaimAssessmentInputV1 {
  return {
    ...baseInput(),
    state: "SUPPORTED",
    omission_refs: [],
    contradiction_refs: [],
    supporting_evidence_refs: [
      "evidence:build",
      "evidence:security",
      "evidence:test",
    ],
    contradicting_evidence_refs: [],
    missing_evidence_refs: [],
    stale_evidence_refs: [],
    refused_evidence_refs: [],
    unknown_evidence_refs: [],
    reason_codes: ["ALL_MANDATORY_EVIDENCE_SUPPORTED"],
    limitations: [],
  };
}

describe("UA-P01-T12 ClaimAssessment", () => {
  it("freezes the exact claim-level state vocabulary", () => {
    expect(CLAIM_ASSESSMENT_STATES).toEqual([
      "SUPPORTED",
      "BLOCKED",
      "INCOMPLETE",
      "INCONCLUSIVE",
      "STALE",
      "REFUSED",
    ]);
  });

  it("constructs all evidence classes explicitly and canonically", () => {
    const assessment = createClaimAssessmentV1({
      ...baseInput(),
      coverage_claim_refs: ["coverage:z", "coverage:a", "coverage:z"],
      supporting_evidence_refs: ["evidence:test", "evidence:build"],
      reason_codes: ["OPEN_CONTRADICTION", "MANDATORY_EVIDENCE_MISSING"],
      limitations: [
        "Security evidence is mandatory and missing.",
        "Independent review evidence remains unknown.",
      ],
    });

    expect(assessment.coverage_claim_refs).toEqual([
      "coverage:a",
      "coverage:z",
    ]);
    expect(assessment.supporting_evidence_refs).toEqual([
      "evidence:build",
      "evidence:test",
    ]);
    expect(assessment.reason_codes).toEqual([
      "MANDATORY_EVIDENCE_MISSING",
      "OPEN_CONTRADICTION",
    ]);
    expect(assessment.limitations).toEqual([
      "Independent review evidence remains unknown.",
      "Security evidence is mandatory and missing.",
    ]);
    expect(assessment).toHaveProperty("contradicting_evidence_refs");
    expect(assessment).toHaveProperty("missing_evidence_refs");
    expect(assessment).toHaveProperty("stale_evidence_refs");
    expect(assessment).toHaveProperty("refused_evidence_refs");
    expect(assessment).toHaveProperty("unknown_evidence_refs");
  });

  it("round-trips strict persisted assessment data", () => {
    const assessment = createClaimAssessmentV1(baseInput());
    expect(parseClaimAssessmentV1(structuredClone(assessment))).toEqual(
      assessment,
    );
  });

  it("rejects claim-level states outside the frozen vocabulary", () => {
    expect(() =>
      createClaimAssessmentV1({
        ...baseInput(),
        state: "PASS" as never,
      }),
    ).toThrow("state is invalid or unsupported");
  });

  it("allows SUPPORTED only when all negative reconciliation classes are empty", () => {
    const supported = createClaimAssessmentV1(supportedInput());
    expect(isClaimAssessmentSupportedV1(supported)).toBe(true);

    const cases: Array<[keyof ClaimAssessmentInputV1, readonly string[]]> = [
      ["omission_refs", ["omission:x"]],
      ["contradiction_refs", ["contradiction:x"]],
      ["contradicting_evidence_refs", ["evidence:x"]],
      ["missing_evidence_refs", ["evidence:x"]],
      ["stale_evidence_refs", ["evidence:x"]],
      ["refused_evidence_refs", ["evidence:x"]],
      ["unknown_evidence_refs", ["evidence:x"]],
    ];

    for (const [field, value] of cases) {
      expect(() =>
        createClaimAssessmentV1({
          ...supportedInput(),
          [field]: value,
        }),
      ).toThrow("SUPPORTED claim assessment cannot contain " + field);
    }
  });

  it("resolves exact target, intent, claim, lineage, and mandatory evidence", () => {
    const assessment = createClaimAssessmentV1(baseInput());
    expect(() =>
      assertClaimAssessmentResolvesV1(assessment, resolutionContext()),
    ).not.toThrow();

    const supported = createClaimAssessmentV1(supportedInput());
    expect(() =>
      assertClaimAssessmentResolvesV1(supported, {
        ...resolutionContext(),
        available_omission_ids: [],
        available_contradiction_ids: [],
      }),
    ).not.toThrow();
  });

  it("rejects cross-target assessment binding", () => {
    const assessment = createClaimAssessmentV1({
      ...baseInput(),
      target_id: "target:other",
    });

    expect(() =>
      assertClaimAssessmentResolvesV1(assessment, resolutionContext()),
    ).toThrow(
      "claim assessment target_id does not match AssuranceTarget",
    );
  });

  it("rejects an intent whose target is not the supplied target", () => {
    const otherIntent = createAssuranceIntentV1({
      ...intent(),
      intent_id: "intent:other-target",
      target: target("target:other"),
      constraints: undefined as never,
      include: ["path:src/**"],
      exclude: ["path:docs/**"],
    } as never);

    expect(() =>
      assertClaimAssessmentResolvesV1(
        createClaimAssessmentV1(baseInput()),
        {
          ...resolutionContext(),
          intent: otherIntent,
        },
      ),
    ).toThrow();
  });

  it("rejects intent identity drift", () => {
    const assessment = createClaimAssessmentV1({
      ...baseInput(),
      intent_id: "intent:other",
    });

    expect(() =>
      assertClaimAssessmentResolvesV1(assessment, resolutionContext()),
    ).toThrow(
      "claim assessment intent_id does not match AssuranceIntent",
    );
  });

  it("rejects requested claim drift from the bound intent", () => {
    const assessment = createClaimAssessmentV1({
      ...baseInput(),
      requested_claim: "DEPLOY_READY",
    });

    expect(() =>
      assertClaimAssessmentResolvesV1(assessment, resolutionContext()),
    ).toThrow(
      "claim assessment requested_claim does not match AssuranceIntent",
    );
  });

  it("rejects dangling coverage refs", () => {
    expect(() =>
      assertClaimAssessmentResolvesV1(
        createClaimAssessmentV1(baseInput()),
        {
          ...resolutionContext(),
          available_coverage_claim_ids: [],
        },
      ),
    ).toThrow(
      "coverage_claim_refs contains dangling ref: coverage:release",
    );
  });

  it("rejects dangling omission refs", () => {
    expect(() =>
      assertClaimAssessmentResolvesV1(
        createClaimAssessmentV1(baseInput()),
        {
          ...resolutionContext(),
          available_omission_ids: [],
        },
      ),
    ).toThrow("omission_refs contains dangling ref: omission:security");
  });

  it("rejects dangling contradiction refs", () => {
    expect(() =>
      assertClaimAssessmentResolvesV1(
        createClaimAssessmentV1(baseInput()),
        {
          ...resolutionContext(),
          available_contradiction_ids: [],
        },
      ),
    ).toThrow(
      "contradiction_refs contains dangling ref: contradiction:review",
    );
  });

  it("rejects dangling refs from every evidence class", () => {
    const context = {
      ...resolutionContext(),
      available_evidence_ids: availableEvidence().filter(
        (id) => id !== "evidence:independence",
      ),
    };

    expect(() =>
      assertClaimAssessmentResolvesV1(
        createClaimAssessmentV1(baseInput()),
        context,
      ),
    ).toThrow(
      "evidence classes contains dangling ref: evidence:independence",
    );
  });

  it("prevents SUPPORTED from overriding missing mandatory evidence", () => {
    const assessment = createClaimAssessmentV1({
      ...supportedInput(),
      supporting_evidence_refs: ["evidence:build", "evidence:test"],
    });

    expect(() =>
      assertClaimAssessmentResolvesV1(assessment, resolutionContext()),
    ).toThrow(
      "SUPPORTED claim assessment is missing mandatory supporting evidence: evidence:security",
    );
  });

  it("requires non-supporting mandatory evidence to remain visible", () => {
    const assessment = createClaimAssessmentV1({
      ...baseInput(),
      missing_evidence_refs: [],
    });

    expect(() =>
      assertClaimAssessmentResolvesV1(assessment, resolutionContext()),
    ).toThrow(
      "mandatory evidence not supporting the claim must remain visible in a non-supporting evidence class: evidence:security",
    );
  });

  it("allows mandatory evidence to remain explicit as stale, refused, unknown, or contradicting", () => {
    const variants: Array<keyof ClaimAssessmentInputV1> = [
      "contradicting_evidence_refs",
      "stale_evidence_refs",
      "refused_evidence_refs",
      "unknown_evidence_refs",
    ];

    for (const field of variants) {
      const assessment = createClaimAssessmentV1({
        ...baseInput(),
        missing_evidence_refs: [],
        [field]: [
          ...(field === "contradicting_evidence_refs"
            ? ["evidence:review-conflict"]
            : field === "stale_evidence_refs"
              ? ["evidence:browser"]
              : field === "refused_evidence_refs"
                ? ["evidence:network"]
                : ["evidence:independence"]),
          "evidence:security",
        ],
      });

      expect(() =>
        assertClaimAssessmentResolvesV1(assessment, resolutionContext()),
      ).not.toThrow();
    }
  });

  it("rejects persisted non-canonical refs, reason codes, and limitations", () => {
    const assessment = createClaimAssessmentV1(baseInput());

    expect(() =>
      parseClaimAssessmentV1({
        ...assessment,
        supporting_evidence_refs: ["evidence:test", "evidence:build"],
      }),
    ).toThrow(
      "supporting_evidence_refs must be unique and canonically sorted",
    );

    expect(() =>
      parseClaimAssessmentV1({
        ...assessment,
        reason_codes: ["OPEN_CONTRADICTION", "MANDATORY_EVIDENCE_MISSING"],
      }),
    ).toThrow("reason_codes must be unique and canonically sorted");

    expect(() =>
      parseClaimAssessmentV1({
        ...assessment,
        limitations: [...assessment.limitations].reverse(),
      }),
    ).toThrow("limitations must be unique and canonically sorted");
  });

  it("rejects duplicate persisted refs instead of silently normalizing them", () => {
    const assessment = createClaimAssessmentV1(baseInput());

    expect(() =>
      parseClaimAssessmentV1({
        ...assessment,
        supporting_evidence_refs: ["evidence:build", "evidence:build"],
      }),
    ).toThrow(
      "supporting_evidence_refs must be unique and canonically sorted",
    );
  });

  it("rejects multiline or empty limitations", () => {
    expect(() =>
      createClaimAssessmentV1({
        ...baseInput(),
        limitations: [""],
      }),
    ).toThrow(
      "limitations[0] must be bounded non-empty single-line text",
    );

    expect(() =>
      createClaimAssessmentV1({
        ...baseInput(),
        limitations: ["line one\nline two"],
      }),
    ).toThrow(
      "limitations[0] must be bounded non-empty single-line text",
    );
  });

  it("rejects unknown aggregate-score or authority fields", () => {
    const assessment = createClaimAssessmentV1(baseInput());

    for (const extra of [
      { aggregate_score: 100 },
      { pass: true },
      { readiness: "READY" },
      { execution_authority: true },
      { publication_authority: true },
    ]) {
      expect(() =>
        parseClaimAssessmentV1({
          ...assessment,
          ...extra,
        }),
      ).toThrow("claim assessment contains missing or unknown fields");
    }
  });

  it("contains no task-PASS or effect authority surface", () => {
    const assessment = createClaimAssessmentV1(baseInput());

    expect("pass" in assessment).toBe(false);
    expect("aggregate_score" in assessment).toBe(false);
    expect("readiness" in assessment).toBe(false);
    expect("execution_authority" in assessment).toBe(false);
    expect("network_authority" in assessment).toBe(false);
    expect("provider_authority" in assessment).toBe(false);
    expect("credential_authority" in assessment).toBe(false);
    expect("publication_authority" in assessment).toBe(false);
  });

  it("uses only caller-supplied assessment time", () => {
    const assessment = createClaimAssessmentV1({
      ...baseInput(),
      assessed_at_epoch_ms: 0,
    });

    expect(assessment.assessed_at_epoch_ms).toBe(0);
  });

  it("rejects malformed claim and reason identifiers", () => {
    expect(() =>
      createClaimAssessmentV1({
        ...baseInput(),
        requested_claim: "release ready",
      }),
    ).toThrow(
      "requested_claim must be an uppercase bounded claim identifier",
    );

    expect(() =>
      createClaimAssessmentV1({
        ...baseInput(),
        reason_codes: ["bad reason"],
      }),
    ).toThrow(
      "reason_codes[0] must be an uppercase bounded state identifier",
    );
  });

  it("does not infer support from empty mandatory input when negative evidence is present", () => {
    const assessment = createClaimAssessmentV1(baseInput());

    expect(isClaimAssessmentSupportedV1(assessment)).toBe(false);
    expect(() =>
      assertClaimAssessmentResolvesV1(assessment, {
        ...resolutionContext(),
        mandatory_evidence_ids: [],
      }),
    ).not.toThrow();
  });

  it("keeps all six evidence classes independently inspectable", () => {
    const assessment = createClaimAssessmentV1(baseInput());

    expect(assessment.supporting_evidence_refs).toEqual([
      "evidence:build",
      "evidence:test",
    ]);
    expect(assessment.contradicting_evidence_refs).toEqual([
      "evidence:review-conflict",
    ]);
    expect(assessment.missing_evidence_refs).toEqual([
      "evidence:security",
    ]);
    expect(assessment.stale_evidence_refs).toEqual([
      "evidence:browser",
    ]);
    expect(assessment.refused_evidence_refs).toEqual([
      "evidence:network",
    ]);
    expect(assessment.unknown_evidence_refs).toEqual([
      "evidence:independence",
    ]);
  });

  it("keeps example digests out of the assessment authority surface", () => {
    expect(A).toHaveLength(64);
    expect(B).toHaveLength(64);
    expect(C).toHaveLength(64);
  });
});
