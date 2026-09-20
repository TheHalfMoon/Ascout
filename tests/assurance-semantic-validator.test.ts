import { describe, expect, it } from "vitest";

import { createClaimAssessmentV1 } from "../src/assurance/contracts/claim-assessment.js";
import { createEngineDescriptorV1 } from "../src/assurance/contracts/engine-descriptor.js";
import { createEngineQualificationV1 } from "../src/assurance/contracts/engine-qualification.js";
import { createEngineRunV1 } from "../src/assurance/contracts/engine-run.js";
import { createEvidenceRefV1 } from "../src/assurance/contracts/evidence-ref.js";
import {
  createFindingLifecycleEventV1,
  createFindingV1,
} from "../src/assurance/contracts/finding.js";
import { createAssuranceIntentV1 } from "../src/assurance/contracts/intent.js";
import { createAssurancePlanV1 } from "../src/assurance/contracts/plan.js";
import {
  createAssurancePolicySnapshotV1,
  type AssurancePolicySnapshotInputV1,
} from "../src/assurance/contracts/policy.js";
import { validateAssuranceSemanticGraphV1 } from "../src/assurance/contracts/semantic-validator.js";
import { createAssuranceTargetV1 } from "../src/assurance/contracts/target.js";
import type { SourceStateV1 } from "../src/receipt/model.js";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const D = "d".repeat(64);
const E = "e".repeat(64);
const F = "f".repeat(64);
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
    tracked_index_entry_count: 24,
    unstaged_changed_count: 0,
    included_untracked_count: 0,
  };
}

function target(targetId = "target:ua-p01-t14") {
  return createAssuranceTargetV1({
    target_id: targetId,
    source_start_identity: source(),
    base_revision: BASE,
    change_set_identity: "changeset:ua-p01-t14",
    worktree_generation: "generation:14",
    policy_snapshot_id: "policy:canonical-v1",
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P01-T14",
      acceptance_id: "acceptance:semantic-validator-v1",
    },
    environment_identity: null,
    graph_index_generation: null,
    build_artifact_identity: null,
  });
}

function intent() {
  return createAssuranceIntentV1({
    intent_id: "intent:ua-p01-t14",
    requested_claim: "RELEASE_READY",
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
      surface_request_id: "request:t14",
    },
  });
}

function policyInput(): AssurancePolicySnapshotInputV1 {
  return {
    policy_id: "policy:canonical-v1",
    policy_version: "2026.09.20",
    trusted_policy_sources: [
      {
        source_id: "canonical:constitution",
        source_kind: "CANONICAL_REPOSITORY",
        content_sha256: A,
      },
      {
        source_id: "trusted:owner",
        source_kind: "TRUSTED_USER",
        content_sha256: B,
      },
    ],
    repository_advisory_policy_sources: [
      {
        source_id: "repository:ascout-config",
        source_kind: "REPOSITORY_ADVISORY",
        content_sha256: C,
      },
    ],
    minimum_mandatory_checks: ["check:test", "check:typecheck"],
    effect_ceilings: [
      { scope: "REVIEW", maximum_effect_class: "E0_READ_ONLY_ANALYSIS" },
      { scope: "TEST", maximum_effect_class: "E1_LOCAL_DETERMINISTIC_PROCESS" },
      { scope: "SECURITY", maximum_effect_class: "E1_LOCAL_DETERMINISTIC_PROCESS" },
      { scope: "CYBER", maximum_effect_class: "E3_ISOLATED_LOCAL_EXECUTION" },
      { scope: "ASSURE", maximum_effect_class: "E2_LOCAL_WRITE_ARTIFACT_ONLY" },
      { scope: "REALITY", maximum_effect_class: "E3_ISOLATED_LOCAL_EXECUTION" },
    ],
    engine_qualification_requirements: {
      require_exact_implementation_identity: true,
      require_exact_configuration_identity: true,
      require_platform_identity: true,
      minimum_qualification_refs: 1,
    },
    independence_requirements: {
      minimum_independent_engines: 1,
      acceptance_critical_requires_independence: true,
    },
    freshness_rules: {
      require_exact_target_match: true,
      invalidate_on_source_drift: true,
      invalidate_on_policy_drift: true,
      invalidate_on_engine_identity_drift: true,
      max_evidence_age_ms: 86_400_000,
    },
    risk_acceptance_rules: {
      allow_risk_acceptance: true,
      require_reason: true,
      require_expiry: true,
      require_actor_identity: true,
    },
    data_egress_rules: {
      source_egress: "DENY",
      artifact_egress: "EXPLICIT_POLICY_ONLY",
      credential_material_egress: "DENY",
    },
  };
}

function policy() {
  return createAssurancePolicySnapshotV1(policyInput());
}

function plan(selectedEngines: readonly string[] = ["engine:ascout-native"]) {
  return createAssurancePlanV1({
    plan_id: "plan:ua-p01-t14",
    intent: intent(),
    policy: policy(),
    selected_check_classes: ["check:test", "check:typecheck"],
    selected_engine_identities: selectedEngines,
    selected_runtime_requirements: ["runtime:node24"],
    required_effect_classes: ["E1_LOCAL_DETERMINISTIC_PROCESS"],
    expected_evidence_types: ["evidence:test-result"],
    omitted_checks: [],
    plan_generation_evidence: {
      planner_id: "planner:ascout-v1",
      planner_version: "0.1.0",
      planner_configuration_sha256: E,
      decision_evidence_refs: ["evidence:policy", "evidence:target"],
    },
  });
}

function descriptor() {
  return createEngineDescriptorV1({
    engine_id: "engine:ascout-native",
    engine_kind: "INTERNAL",
    implementation_identity: {
      implementation_id: "implementation:ascout-native",
      source_identity: "source:ascout-main",
      version: "0.1.0",
      artifact_sha256: A,
    },
    capabilities: ["capability:test"],
    supported_inputs: ["input:assurance-target"],
    supported_outputs: ["output:evidence", "output:finding"],
    effect_classes: ["E1_LOCAL_DETERMINISTIC_PROCESS"],
    requirements: {
      process_required: true,
      network_required: false,
      provider_requirements: [],
      sandbox_required: false,
    },
    configuration_trust_boundary: {
      trusted_configuration_sources: ["config:canonical-policy"],
      advisory_configuration_sources: [],
    },
    license_provenance_state: {
      license_identity: "license:apache-2.0",
      provenance_ref: "provenance:ascout-owned",
      admission_state: "ADMITTED",
    },
    qualification_evidence_refs: ["evidence:qualification-history"],
    known_limitations: ["No network capability is represented."],
    authority_ceiling: "E1_LOCAL_DETERMINISTIC_PROCESS",
  });
}

function configuration() {
  return {
    configuration_id: "configuration:release-v1",
    configuration_sha256: B,
  };
}

function platform() {
  return {
    platform_id: "platform:linux-x64-node24",
    platform_sha256: C,
  };
}

function qualification() {
  return createEngineQualificationV1({
    qualification_id: "qualification:ascout-native-v1",
    engine_id: "engine:ascout-native",
    implementation_identity: descriptor().implementation_identity,
    configuration_identity: configuration(),
    profile_identities: ["profile:release"],
    benchmark_corpus_identity: {
      benchmark_id: "benchmark:engine-v1",
      corpus_id: "corpus:owned-v1",
      corpus_sha256: D,
    },
    platform_identity: platform(),
    evidence_refs: [
      {
        evidence_ref: "evidence:qualification-history",
        provider_self_description: false,
      },
    ],
    result: "QUALIFIED",
    qualified_at_epoch_ms: 1_000,
    expires_at_epoch_ms: 10_000,
  });
}

function runInput(runId = "run:ua-p01-t14:1") {
  return {
    run_id: runId,
    plan_id: "plan:ua-p01-t14",
    target_id: "target:ua-p01-t14",
    engine_id: "engine:ascout-native",
    qualification_id: "qualification:ascout-native-v1",
    configuration_identity: configuration(),
    command_identity: {
      command_id: "command:assurance-test-v1",
      command_sha256: E,
    },
    runtime_identity: {
      runtime_id: "runtime:node24-linux-x64",
      runtime_sha256: F,
      platform_identity: platform(),
    },
    started_at_epoch_ms: 2_000,
    ended_at_epoch_ms: 2_100,
    exit_class: "EXIT_ZERO",
    result_class: "PASS",
    input_context_manifest: {
      manifest_id: "manifest:ua-p01-t14",
      input_refs: ["input:plan", "input:target"],
      context_refs: ["context:policy", "context:qualification"],
    },
    output_artifact_refs: ["artifact:test-result"],
    retained_stream_artifact_refs: {
      stdout_artifact_ref: null,
      stderr_artifact_ref: null,
    },
    finding_refs: ["finding:ua-p01-t14"],
    coverage_refs: [],
    coverage_limitations: [],
    omissions: [],
    limitations: ["No external effects are represented by this run."],
    retry_recovery_lineage: {
      attempt_number: 1,
      retry_of_run_id: null,
      recovery_of_run_id: null,
    },
  } as const;
}

function run() {
  return createEngineRunV1(runInput());
}

function evidenceInput(
  evidenceId = "evidence:ua-p01-t14:primary",
  expiresAt: number | null = 5_000,
) {
  return {
    evidence_id: evidenceId,
    producer: {
      producer_id: "producer:ascout-native",
      producer_kind: "ENGINE",
    },
    run_id: "run:ua-p01-t14:1",
    target_id: "target:ua-p01-t14",
    kind: "TEST_RESULT",
    content_artifact_identity: {
      identity_kind: "ARTIFACT" as const,
      identity_id: "artifact:test-result",
    },
    digest_sha256: A,
    trust_class: "QUALIFIED_ENGINE",
    data_classification: "INTERNAL",
    freshness: {
      observed_at_epoch_ms: 2_200,
      expires_at_epoch_ms: expiresAt,
    },
    redaction_state: "NOT_REDACTED",
    retention: {
      retention_class: "LOCAL_DEFAULT",
      retain_until_epoch_ms: 10_000,
    },
    lineage: {
      parent_evidence_refs: [] as string[],
      derivation_ref: null,
    },
  };
}

function evidence(
  evidenceId = "evidence:ua-p01-t14:primary",
  expiresAt: number | null = 5_000,
) {
  return createEvidenceRefV1(evidenceInput(evidenceId, expiresAt));
}

function finding() {
  return createFindingV1({
    finding_id: "finding:ua-p01-t14",
    kind: "CORRECTNESS",
    severity: "HIGH",
    confidence_class: "HIGH",
    validation_state: "VALIDATED",
    rule_check_identity: "check:ua-p01-t14",
    primary_location: {
      path: "src/example.ts",
      line: 17,
      column: 4,
      symbol_id: "symbol:example",
    },
    related_locations: [],
    subject_identities: ["subject:semantic-validator"],
    reachability_state: "REACHABLE",
    producer_observations: [
      {
        observation_id: "observation:ua-p01-t14",
        producer_id: "producer:ascout-native",
        run_id: "run:ua-p01-t14:1",
        target_id: "target:ua-p01-t14",
        observation_state: "CONCERN",
        evidence_refs: ["evidence:ua-p01-t14:primary"],
        observed_at_epoch_ms: 2_300,
      },
    ],
    reproduction_proof_refs: ["evidence:ua-p01-t14:primary"],
    first_seen_target_id: "target:ua-p01-t14",
    last_verified_target_id: "target:ua-p01-t14",
    status: "OPEN",
    suppression_risk_acceptance: null,
  });
}

function lifecycleEvents() {
  const values = [
    [1, null, "CANDIDATE", 2_300],
    [2, "CANDIDATE", "VALIDATED", 2_400],
    [3, "VALIDATED", "OPEN", 2_500],
  ] as const;

  return values.map(([sequence, previous, next, occurredAt]) =>
    createFindingLifecycleEventV1({
      lifecycle_event_id: "lifecycle:ua-p01-t14:" + sequence,
      finding_id: "finding:ua-p01-t14",
      sequence_number: sequence,
      previous_state: previous,
      new_state: next,
      actor: {
        actor_id: "actor:maintainer",
        actor_kind: "HUMAN",
        provenance_ref: "provenance:review",
      },
      target_id: "target:ua-p01-t14",
      reason: "Explicit lifecycle transition " + sequence + ".",
      evidence_refs: ["evidence:ua-p01-t14:primary"],
      occurred_at_epoch_ms: occurredAt,
      risk_acceptance_expiry_epoch_ms: null,
      review_at_epoch_ms: null,
    }),
  );
}

function supportedAssessment() {
  return createClaimAssessmentV1({
    claim_assessment_id: "assessment:ua-p01-t14",
    target_id: "target:ua-p01-t14",
    intent_id: "intent:ua-p01-t14",
    requested_claim: "RELEASE_READY",
    state: "SUPPORTED",
    coverage_claim_refs: [],
    omission_refs: [],
    contradiction_refs: [],
    supporting_evidence_refs: ["evidence:ua-p01-t14:primary"],
    contradicting_evidence_refs: [],
    missing_evidence_refs: [],
    stale_evidence_refs: [],
    refused_evidence_refs: [],
    unknown_evidence_refs: [],
    reason_codes: ["ALL_MANDATORY_EVIDENCE_SUPPORTED"],
    limitations: [],
    assessed_at_epoch_ms: 3_000,
  });
}

function graph() {
  return {
    target: target(),
    intent: intent(),
    policy: policy(),
    plan: plan(),
    engine_descriptors: [descriptor()],
    engine_qualifications: [qualification()],
    engine_runs: [run()],
    evidence_refs: [evidence()],
    findings: [finding()],
    finding_lifecycle_events: lifecycleEvents(),
    coverage_claims: [],
    omission_records: [],
    contradiction_records: [],
    claim_assessment: supportedAssessment(),
    mandatory_evidence_ids: ["evidence:ua-p01-t14:primary"],
  };
}

describe("UA-P01-T14 semantic graph validator", () => {
  it("accepts a fully resolved single-target semantic graph", () => {
    expect(() => validateAssuranceSemanticGraphV1(graph())).not.toThrow();
  });

  it("rejects unknown semantic graph fields", () => {
    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        execution_authority: true,
      }),
    ).toThrow("semantic graph contains missing or unknown fields");
  });

  it("rejects duplicate indexed semantic identities", () => {
    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        engine_descriptors: [descriptor(), descriptor()],
      }),
    ).toThrow(
      "engine_descriptors contains duplicate identity: engine:ascout-native",
    );

    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        evidence_refs: [evidence(), evidence()],
      }),
    ).toThrow(
      "evidence_refs contains duplicate identity: evidence:ua-p01-t14:primary",
    );
  });

  it("rejects a plan-selected engine without a descriptor", () => {
    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        plan: plan(["engine:missing"]),
      }),
    ).toThrow(
      "plan.selected_engine_identities contains dangling ref: engine:missing",
    );
  });

  it("rejects a cross-target EngineRun", () => {
    const wrongRun = createEngineRunV1({
      ...runInput(),
      target_id: "target:other",
    });

    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        engine_runs: [wrongRun],
      }),
    ).toThrow("engine run target_id does not match AssuranceTarget");
  });

  it("rejects a run with a dangling qualification", () => {
    const wrongRun = createEngineRunV1({
      ...runInput(),
      qualification_id: "qualification:missing",
    });

    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        engine_runs: [wrongRun],
      }),
    ).toThrow(
      "engine_runs.qualification_id contains dangling ref: qualification:missing",
    );
  });

  it("rejects a dangling retry or recovery parent", () => {
    const retry = createEngineRunV1({
      ...runInput("run:ua-p01-t14:2"),
      started_at_epoch_ms: 2_200,
      ended_at_epoch_ms: 2_300,
      finding_refs: [],
      retry_recovery_lineage: {
        attempt_number: 2,
        retry_of_run_id: "run:missing",
        recovery_of_run_id: null,
      },
    });

    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        engine_runs: [run(), retry],
      }),
    ).toThrow(
      "engine run retry/recovery lineage contains dangling ref: run:missing",
    );
  });

  it("rejects retry lineage that does not temporally follow its parent", () => {
    const retry = createEngineRunV1({
      ...runInput("run:ua-p01-t14:2"),
      started_at_epoch_ms: 2_050,
      ended_at_epoch_ms: 2_300,
      finding_refs: [],
      retry_recovery_lineage: {
        attempt_number: 2,
        retry_of_run_id: "run:ua-p01-t14:1",
        recovery_of_run_id: null,
      },
    });

    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        engine_runs: [run(), retry],
      }),
    ).toThrow("engine run lineage parent must finish before child");
  });

  it("rejects dangling evidence lineage", () => {
    const child = createEvidenceRefV1({
      ...evidenceInput(),
      lineage: {
        parent_evidence_refs: ["evidence:missing"],
        derivation_ref: "derivation:child",
      },
    });

    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        evidence_refs: [child],
      }),
    ).toThrow(
      "evidence lineage contains dangling parent evidence ref: evidence:missing",
    );
  });

  it("rejects cyclic evidence lineage", () => {
    const first = createEvidenceRefV1({
      ...evidenceInput("evidence:cycle:a"),
      lineage: {
        parent_evidence_refs: ["evidence:cycle:b"],
        derivation_ref: "derivation:cycle-a",
      },
    });
    const second = createEvidenceRefV1({
      ...evidenceInput("evidence:cycle:b"),
      lineage: {
        parent_evidence_refs: ["evidence:cycle:a"],
        derivation_ref: "derivation:cycle-b",
      },
    });

    const assessment = createClaimAssessmentV1({
      ...supportedAssessment(),
      supporting_evidence_refs: ["evidence:cycle:a"],
    });

    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        evidence_refs: [first, second],
        claim_assessment: assessment,
        mandatory_evidence_ids: ["evidence:cycle:a"],
      }),
    ).toThrow("evidence lineage contains a cycle");
  });

  it("rejects a Finding without its explicit lifecycle", () => {
    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        finding_lifecycle_events: [],
      }),
    ).toThrow("finding lifecycle must contain between 1 and");
  });

  it("rejects an invalid Finding lifecycle relationship", () => {
    const events = lifecycleEvents();
    const invalid = [
      events[0],
      {
        ...events[1],
        previous_state: "OPEN",
      },
      events[2],
    ];

    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        finding_lifecycle_events: invalid,
      }),
    ).toThrow("finding lifecycle previous_state chain is not exact");
  });

  it("rejects a dangling run finding ref", () => {
    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        findings: [],
        finding_lifecycle_events: [],
      }),
    ).toThrow(
      "engine run finding_refs contains dangling ref: finding:ua-p01-t14",
    );
  });

  it("rejects dangling ClaimAssessment coverage refs", () => {
    const assessment = createClaimAssessmentV1({
      ...supportedAssessment(),
      coverage_claim_refs: ["coverage:missing"],
    });

    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        claim_assessment: assessment,
      }),
    ).toThrow(
      "coverage_claim_refs contains dangling ref: coverage:missing",
    );
  });

  it("rejects stale evidence silently classified as supporting", () => {
    const stale = evidence("evidence:ua-p01-t14:primary", 2_500);

    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        evidence_refs: [stale],
      }),
    ).toThrow(
      "supporting_evidence_refs contains stale evidence that must be classified explicitly",
    );
  });

  it("accepts expired evidence only when the claim classifies it explicitly as stale", () => {
    const stale = evidence("evidence:ua-p01-t14:primary", 2_500);
    const assessment = createClaimAssessmentV1({
      ...supportedAssessment(),
      state: "STALE",
      supporting_evidence_refs: [],
      stale_evidence_refs: ["evidence:ua-p01-t14:primary"],
      reason_codes: ["EVIDENCE_STALE"],
    });

    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        evidence_refs: [stale],
        claim_assessment: assessment,
      }),
    ).not.toThrow();
  });

  it("rejects current evidence incorrectly classified as stale", () => {
    const assessment = createClaimAssessmentV1({
      ...supportedAssessment(),
      state: "STALE",
      supporting_evidence_refs: [],
      stale_evidence_refs: ["evidence:ua-p01-t14:primary"],
      reason_codes: ["EVIDENCE_STALE"],
    });

    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        claim_assessment: assessment,
      }),
    ).toThrow(
      "stale_evidence_refs contains evidence that is current",
    );
  });

  it("rejects evidence that is not yet observable at assessment time", () => {
    const future = createEvidenceRefV1({
      ...evidenceInput(),
      freshness: {
        observed_at_epoch_ms: 3_500,
        expires_at_epoch_ms: 5_000,
      },
    });

    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        evidence_refs: [future],
      }),
    ).toThrow(
      "claim assessment references evidence not yet observable",
    );
  });

  it("rejects one evidence identity appearing in multiple claim classes", () => {
    const assessment = createClaimAssessmentV1({
      ...supportedAssessment(),
      state: "INCOMPLETE",
      unknown_evidence_refs: ["evidence:ua-p01-t14:primary"],
      reason_codes: ["EVIDENCE_CLASS_CONFLICT"],
    });

    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        claim_assessment: assessment,
      }),
    ).toThrow(
      "claim evidence identity appears in multiple classes",
    );
  });

  it("rejects a dangling mandatory evidence identity", () => {
    expect(() =>
      validateAssuranceSemanticGraphV1({
        ...graph(),
        mandatory_evidence_ids: ["evidence:missing"],
      }),
    ).toThrow(
      "SUPPORTED claim assessment is missing mandatory supporting evidence: evidence:missing",
    );
  });

  it("does not add serialization, execution, network, or publication authority", () => {
    const value = graph();
    expect("canonical_bytes" in value).toBe(false);
    expect("digest" in value).toBe(false);
    expect("execution_authority" in value).toBe(false);
    expect("network_authority" in value).toBe(false);
    expect("publication_authority" in value).toBe(false);
  });
});
