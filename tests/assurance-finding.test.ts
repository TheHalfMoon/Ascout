import { describe, expect, it } from "vitest";

import {
  FINDING_STATUSES,
  appendFindingProducerObservationV1,
  assertFindingLifecycleV1,
  assertFindingResolvesV1,
  createFindingLifecycleEventV1,
  createFindingV1,
  parseFindingLifecycleEventV1,
  parseFindingV1,
} from "../src/assurance/contracts/finding.js";

function observation(
  observationId = "observation:review:1",
  observationState = "CONCERN",
) {
  return {
    observation_id: observationId,
    producer_id: "producer:review-engine",
    run_id: "run:review:1",
    target_id: "target:ua-p01-t09",
    observation_state: observationState,
    evidence_refs: ["evidence:proof:b", "evidence:proof:a"],
    observed_at_epoch_ms: 1_000,
  } as const;
}

function location(path = "src/example.ts", line = 17) {
  return {
    path,
    line,
    column: 4,
    symbol_id: "symbol:example",
  } as const;
}

function findingInput(status: FindingStatusV1 = "OPEN") {
  return {
    finding_id: "finding:ua-p01-t09",
    kind: "CORRECTNESS",
    severity: "HIGH",
    confidence_class: "HIGH",
    validation_state: "VALIDATED",
    rule_check_identity: "check:ua-p01-t09",
    primary_location: location(),
    related_locations: [
      location("src/z.ts", 3),
      location("src/a.ts", 9),
      location("src/z.ts", 3),
    ],
    subject_identities: ["resource:z", "symbol:a", "resource:z"],
    reachability_state: "REACHABLE",
    producer_observations: [
      observation("observation:z"),
      observation("observation:a"),
    ],
    reproduction_proof_refs: ["evidence:proof:b", "evidence:proof:a"],
    first_seen_target_id: "target:ua-p01-t09",
    last_verified_target_id: "target:ua-p01-t09",
    status,
    suppression_risk_acceptance: null,
  } as const;
}

function event(
  sequenceNumber: number,
  previousState:
    | null
    | "CANDIDATE"
    | "REQUIRES_MORE_EVIDENCE"
    | "VALIDATED"
    | "OPEN"
    | "REJECTED_FALSE_POSITIVE"
    | "REPAIRED_PENDING_REVERIFY"
    | "VERIFIED_FIXED"
    | "ACCEPTED_RISK"
    | "SUPERSEDED",
  newState:
    | "CANDIDATE"
    | "REQUIRES_MORE_EVIDENCE"
    | "VALIDATED"
    | "OPEN"
    | "REJECTED_FALSE_POSITIVE"
    | "REPAIRED_PENDING_REVERIFY"
    | "VERIFIED_FIXED"
    | "ACCEPTED_RISK"
    | "SUPERSEDED",
  occurredAt: number,
) {
  return createFindingLifecycleEventV1({
    lifecycle_event_id: "event:" + sequenceNumber,
    finding_id: "finding:ua-p01-t09",
    sequence_number: sequenceNumber,
    previous_state: previousState,
    new_state: newState,
    actor: {
      actor_id: "actor:maintainer",
      actor_kind: "HUMAN",
      provenance_ref: "provenance:review",
    },
    target_id: "target:ua-p01-t09",
    reason: "Explicit lifecycle transition " + sequenceNumber + ".",
    evidence_refs: ["evidence:proof:a"],
    occurred_at_epoch_ms: occurredAt,
    risk_acceptance_expiry_epoch_ms: null,
    review_at_epoch_ms: null,
  });
}

const resolutionContext = {
  available_target_ids: ["target:ua-p01-t09"],
  available_run_ids: ["run:review:1"],
  available_evidence_ids: ["evidence:proof:a", "evidence:proof:b"],
} as const;

const lifecycleContext = {
  available_target_ids: ["target:ua-p01-t09"],
  available_evidence_ids: ["evidence:proof:a", "evidence:proof:b"],
} as const;

describe("UA-P01-T09 Finding and lifecycle", () => {
  it("freezes the canonical Finding status vocabulary", () => {
    expect(FINDING_STATUSES).toEqual([
      "CANDIDATE",
      "REQUIRES_MORE_EVIDENCE",
      "VALIDATED",
      "OPEN",
      "REJECTED_FALSE_POSITIVE",
      "REPAIRED_PENDING_REVERIFY",
      "VERIFIED_FIXED",
      "ACCEPTED_RISK",
      "SUPERSEDED",
    ]);
    expect(FINDING_STATUSES).not.toContain("DELETED");
    expect(FINDING_STATUSES).not.toContain("CLEAN");
  });

  it("constructs a canonical Finding with attributable producer observations", () => {
    const finding = createFindingV1(findingInput());

    expect(finding.schema_version).toBe(1);
    expect(finding.related_locations.map((entry) => entry.path)).toEqual([
      "src/a.ts",
      "src/z.ts",
    ]);
    expect(finding.subject_identities).toEqual(["resource:z", "symbol:a"]);
    expect(
      finding.producer_observations.map((entry) => entry.observation_id),
    ).toEqual(["observation:a", "observation:z"]);
    expect(finding.reproduction_proof_refs).toEqual([
      "evidence:proof:a",
      "evidence:proof:b",
    ]);
    expect(finding.producer_observations[0]).toMatchObject({
      producer_id: "producer:review-engine",
      run_id: "run:review:1",
      target_id: "target:ua-p01-t09",
    });
  });

  it("round-trips strict persisted Finding data", () => {
    const finding = createFindingV1(findingInput());
    expect(parseFindingV1(structuredClone(finding))).toEqual(finding);
  });

  it("keeps a validated finding present when a later producer reports CLEAN", () => {
    const validated = createFindingV1({
      ...findingInput("VALIDATED"),
      producer_observations: [observation("observation:initial", "CONCERN")],
    });

    const withCleanObservation = appendFindingProducerObservationV1(
      validated,
      observation("observation:later-clean", "CLEAN"),
    );

    expect(withCleanObservation.status).toBe("VALIDATED");
    expect(withCleanObservation.finding_id).toBe(validated.finding_id);
    expect(withCleanObservation.producer_observations).toHaveLength(2);
    expect(
      withCleanObservation.producer_observations.some(
        (entry) => entry.observation_state === "CLEAN",
      ),
    ).toBe(true);
  });

  it("rejects duplicate producer observation identities", () => {
    const finding = createFindingV1({
      ...findingInput("VALIDATED"),
      producer_observations: [observation("observation:one")],
    });

    expect(() =>
      appendFindingProducerObservationV1(
        finding,
        observation("observation:one", "CLEAN"),
      ),
    ).toThrow("producer observation_id already exists");
  });

  it("resolves finding target, run, evidence, and producer lineage", () => {
    const finding = createFindingV1(findingInput());
    expect(() => assertFindingResolvesV1(finding, resolutionContext)).not.toThrow();
  });

  it("rejects dangling first-seen or last-verified target lineage", () => {
    const finding = createFindingV1({
      ...findingInput(),
      last_verified_target_id: "target:missing",
    });

    expect(() => assertFindingResolvesV1(finding, resolutionContext)).toThrow(
      "finding target lineage contains dangling identity target:missing",
    );
  });

  it("rejects dangling producer run and evidence lineage", () => {
    const missingRun = createFindingV1({
      ...findingInput(),
      producer_observations: [
        {
          ...observation("observation:missing-run"),
          run_id: "run:missing",
        },
      ],
    });

    expect(() =>
      assertFindingResolvesV1(missingRun, resolutionContext),
    ).toThrow("producer observation run contains dangling identity run:missing");

    const missingEvidence = createFindingV1({
      ...findingInput(),
      producer_observations: [
        {
          ...observation("observation:missing-evidence"),
          evidence_refs: ["evidence:missing"],
        },
      ],
    });

    expect(() =>
      assertFindingResolvesV1(missingEvidence, resolutionContext),
    ).toThrow(
      "producer observation evidence_refs contains dangling identity evidence:missing",
    );
  });

  it("rejects dangling reproduction proof refs", () => {
    const finding = createFindingV1({
      ...findingInput(),
      reproduction_proof_refs: ["evidence:missing"],
    });

    expect(() => assertFindingResolvesV1(finding, resolutionContext)).toThrow(
      "reproduction_proof_refs contains dangling identity evidence:missing",
    );
  });

  it("rejects raw absolute or URI-like location paths", () => {
    expect(() =>
      createFindingV1({
        ...findingInput(),
        primary_location: location("C:/private/repo/file.ts"),
      }),
    ).toThrow("primary_location.path must be a safe repository-relative path");

    expect(() =>
      createFindingV1({
        ...findingInput(),
        primary_location: location("/private/repo/file.ts"),
      }),
    ).toThrow("primary_location.path must be a safe repository-relative path");

    expect(() =>
      createFindingV1({
        ...findingInput(),
        primary_location: location("https://user:secret@example.test/file.ts"),
      }),
    ).toThrow("primary_location.path must be a safe repository-relative path");
  });

  it("rejects non-canonical persisted locations, identities, and observations", () => {
    const finding = createFindingV1(findingInput());

    expect(() =>
      parseFindingV1({
        ...finding,
        related_locations: [...finding.related_locations].reverse(),
      }),
    ).toThrow("related_locations must be unique and canonically sorted");

    expect(() =>
      parseFindingV1({
        ...finding,
        subject_identities: [...finding.subject_identities].reverse(),
      }),
    ).toThrow("subject_identities must be unique and canonically sorted");

    expect(() =>
      parseFindingV1({
        ...finding,
        producer_observations: [...finding.producer_observations].reverse(),
      }),
    ).toThrow(
      "producer_observations must have unique canonically sorted observation_id values",
    );
  });

  it("requires explicit risk-acceptance metadata for ACCEPTED_RISK", () => {
    expect(() =>
      createFindingV1({
        ...findingInput("ACCEPTED_RISK"),
        suppression_risk_acceptance: null,
      }),
    ).toThrow(
      "ACCEPTED_RISK requires explicit risk acceptance metadata with expiry and review time",
    );

    const accepted = createFindingV1({
      ...findingInput("ACCEPTED_RISK"),
      suppression_risk_acceptance: {
        disposition_kind: "RISK_ACCEPTANCE",
        actor_id: "actor:risk-owner",
        provenance_ref: "provenance:risk-acceptance",
        reason: "Explicit bounded risk acceptance.",
        expires_at_epoch_ms: 10_000,
        review_at_epoch_ms: 8_000,
        evidence_refs: ["evidence:proof:a"],
      },
    });
    expect(accepted.status).toBe("ACCEPTED_RISK");
  });

  it("rejects risk-acceptance metadata on a non-accepted status", () => {
    expect(() =>
      createFindingV1({
        ...findingInput("OPEN"),
        suppression_risk_acceptance: {
          disposition_kind: "RISK_ACCEPTANCE",
          actor_id: "actor:risk-owner",
          provenance_ref: "provenance:risk-acceptance",
          reason: "Should not attach to OPEN.",
          expires_at_epoch_ms: 10_000,
          review_at_epoch_ms: 8_000,
          evidence_refs: ["evidence:proof:a"],
        },
      }),
    ).toThrow("RISK_ACCEPTANCE metadata requires finding status ACCEPTED_RISK");
  });

  it("constructs strict explicit lifecycle events", () => {
    const lifecycleEvent = event(1, null, "CANDIDATE", 1_000);
    expect(lifecycleEvent.schema_version).toBe(1);
    expect(parseFindingLifecycleEventV1(structuredClone(lifecycleEvent))).toEqual(
      lifecycleEvent,
    );
  });

  it("validates a contiguous append-only lifecycle ending at Finding status", () => {
    const finding = createFindingV1(findingInput("OPEN"));
    const events = [
      event(1, null, "CANDIDATE", 1_000),
      event(2, "CANDIDATE", "VALIDATED", 2_000),
      event(3, "VALIDATED", "OPEN", 3_000),
    ];

    expect(() =>
      assertFindingLifecycleV1(finding, events, lifecycleContext),
    ).not.toThrow();
  });

  it("rejects a lifecycle without an explicit initial event", () => {
    const finding = createFindingV1(findingInput("OPEN"));
    expect(() =>
      assertFindingLifecycleV1(finding, [], lifecycleContext),
    ).toThrow("finding lifecycle must contain between 1 and");
  });

  it("rejects non-contiguous lifecycle sequence numbers", () => {
    const finding = createFindingV1(findingInput("OPEN"));
    const events = [
      event(1, null, "CANDIDATE", 1_000),
      {
        ...event(2, "CANDIDATE", "OPEN", 2_000),
        sequence_number: 3,
      },
    ];

    expect(() =>
      assertFindingLifecycleV1(finding, events, lifecycleContext),
    ).toThrow("finding lifecycle sequence numbers must be contiguous from 1");
  });

  it("rejects an inexact previous-state chain", () => {
    const finding = createFindingV1(findingInput("OPEN"));
    const events = [
      event(1, null, "CANDIDATE", 1_000),
      event(2, "VALIDATED", "OPEN", 2_000),
    ];

    expect(() =>
      assertFindingLifecycleV1(finding, events, lifecycleContext),
    ).toThrow("finding lifecycle previous_state chain is not exact");
  });

  it("rejects lifecycle timestamps that move backward", () => {
    const finding = createFindingV1(findingInput("OPEN"));
    const events = [
      event(1, null, "CANDIDATE", 2_000),
      event(2, "CANDIDATE", "OPEN", 1_999),
    ];

    expect(() =>
      assertFindingLifecycleV1(finding, events, lifecycleContext),
    ).toThrow("finding lifecycle timestamps must be non-decreasing");
  });

  it("rejects duplicate lifecycle event identities", () => {
    const finding = createFindingV1(findingInput("OPEN"));
    const first = event(1, null, "CANDIDATE", 1_000);
    const second = {
      ...event(2, "CANDIDATE", "OPEN", 2_000),
      lifecycle_event_id: first.lifecycle_event_id,
    };

    expect(() =>
      assertFindingLifecycleV1(
        finding,
        [first, second],
        lifecycleContext,
      ),
    ).toThrow("finding lifecycle event ids must be unique");
  });

  it("rejects a lifecycle bound to another finding", () => {
    const finding = createFindingV1(findingInput("CANDIDATE"));
    const wrong = {
      ...event(1, null, "CANDIDATE", 1_000),
      finding_id: "finding:other",
    };

    expect(() =>
      assertFindingLifecycleV1(finding, [wrong], lifecycleContext),
    ).toThrow("finding lifecycle event finding_id does not match Finding");
  });

  it("rejects a lifecycle whose final state differs from persisted Finding", () => {
    const finding = createFindingV1(findingInput("OPEN"));
    const events = [event(1, null, "VALIDATED", 1_000)];

    expect(() =>
      assertFindingLifecycleV1(finding, events, lifecycleContext),
    ).toThrow("finding lifecycle final new_state must equal Finding status");
  });

  it("rejects dangling lifecycle targets and evidence", () => {
    const finding = createFindingV1(findingInput("CANDIDATE"));

    expect(() =>
      assertFindingLifecycleV1(
        finding,
        [
          {
            ...event(1, null, "CANDIDATE", 1_000),
            target_id: "target:missing",
          },
        ],
        lifecycleContext,
      ),
    ).toThrow("finding lifecycle target contains dangling identity target:missing");

    expect(() =>
      assertFindingLifecycleV1(
        finding,
        [
          {
            ...event(1, null, "CANDIDATE", 1_000),
            evidence_refs: ["evidence:missing"],
          },
        ],
        lifecycleContext,
      ),
    ).toThrow(
      "finding lifecycle evidence_refs contains dangling identity evidence:missing",
    );
  });

  it("requires risk acceptance lifecycle timing and matches Finding metadata", () => {
    const finding = createFindingV1({
      ...findingInput("ACCEPTED_RISK"),
      suppression_risk_acceptance: {
        disposition_kind: "RISK_ACCEPTANCE",
        actor_id: "actor:risk-owner",
        provenance_ref: "provenance:risk-acceptance",
        reason: "Explicit bounded risk acceptance.",
        expires_at_epoch_ms: 10_000,
        review_at_epoch_ms: 8_000,
        evidence_refs: ["evidence:proof:a"],
      },
    });

    const accepted = createFindingLifecycleEventV1({
      lifecycle_event_id: "event:risk",
      finding_id: finding.finding_id,
      sequence_number: 1,
      previous_state: null,
      new_state: "ACCEPTED_RISK",
      actor: {
        actor_id: "actor:risk-owner",
        actor_kind: "HUMAN",
        provenance_ref: "provenance:risk-acceptance",
      },
      target_id: "target:ua-p01-t09",
      reason: "Risk accepted with explicit review and expiry.",
      evidence_refs: ["evidence:proof:a"],
      occurred_at_epoch_ms: 5_000,
      risk_acceptance_expiry_epoch_ms: 10_000,
      review_at_epoch_ms: 8_000,
    });

    expect(() =>
      assertFindingLifecycleV1(finding, [accepted], lifecycleContext),
    ).not.toThrow();

    expect(() =>
      assertFindingLifecycleV1(
        finding,
        [
          {
            ...accepted,
            review_at_epoch_ms: 7_000,
          },
        ],
        lifecycleContext,
      ),
    ).toThrow(
      "ACCEPTED_RISK lifecycle timing must match Finding risk acceptance metadata",
    );
  });

  it("rejects risk-acceptance timing on non-accepted lifecycle states", () => {
    expect(() =>
      createFindingLifecycleEventV1({
        ...event(1, null, "CANDIDATE", 1_000),
        risk_acceptance_expiry_epoch_ms: 10_000,
      }),
    ).toThrow(
      "risk acceptance timing is allowed only for ACCEPTED_RISK lifecycle events",
    );
  });

  it("rejects unknown authority-like Finding fields", () => {
    const finding = createFindingV1(findingInput());

    expect(() =>
      parseFindingV1({
        ...finding,
        terminal_claim_authority: true,
      }),
    ).toThrow("finding contains missing or unknown fields");

    expect("execution_authority" in finding).toBe(false);
    expect("network_authority" in finding).toBe(false);
    expect("publication_authority" in finding).toBe(false);
  });

  it("rejects unknown lifecycle mutation-authority fields", () => {
    const lifecycleEvent = event(1, null, "CANDIDATE", 1_000);

    expect(() =>
      parseFindingLifecycleEventV1({
        ...lifecycleEvent,
        mutation_authority: true,
      }),
    ).toThrow("finding lifecycle event contains missing or unknown fields");
  });
});
