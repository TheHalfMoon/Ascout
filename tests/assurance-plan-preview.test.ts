import { describe, expect, it } from "vitest";

import { canonicalAssuranceSha256V1 } from "../src/assurance/contracts/canonical-serialization.js";
import { createAssuranceIntentV1 } from "../src/assurance/contracts/intent.js";
import { createAssurancePolicySnapshotV1 } from "../src/assurance/contracts/policy.js";
import { createAssuranceTargetV1 } from "../src/assurance/contracts/target.js";
import { createEngineDescriptorV1 } from "../src/assurance/contracts/engine-descriptor.js";
import { createEngineQualificationV1 } from "../src/assurance/contracts/engine-qualification.js";
import { createEngineAvailabilitySnapshotV1 } from "../src/assurance/kernel/availability.js";
import { createEngineQualificationSetV1 } from "../src/assurance/kernel/qualification.js";
import { evaluatePlanWithOmissionsV1 } from "../src/assurance/kernel/omissions.js";
import {
  planPreviewDigestV1,
  renderPlanPreviewJsonV1,
  renderPlanPreviewTerminalV1,
} from "../src/assurance/output/preview.js";
import { createEngineRegistryV1 } from "../src/assurance/kernel/registry.js";
import type { SourceStateV1 } from "../src/receipt/model.js";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const D = "d".repeat(64);
const E = "e".repeat(64);
const F = "f".repeat(64);

function source(): SourceStateV1 {
  return {
    repository_id: "remote:" + A,
    repository_id_kind: "remote",
    portable: true,
    head_sha: "b".repeat(40),
    detached: false,
    shallow: false,
    tree_digest_version: 1,
    tree_digest: C,
    tracked_index_entry_count: 12,
    unstaged_changed_count: 0,
    included_untracked_count: 0,
  };
}

function buildPlan() {
  const entry = {
    descriptor: createEngineDescriptorV1({
      engine_id: "engine:t08",
      engine_kind: "INTERNAL",
      implementation_identity: {
        implementation_id: "implementation:t08",
        source_identity: "source:ascout",
        version: "1.0.0",
        artifact_sha256: D,
      },
      capabilities: ["capability:review"],
      supported_inputs: ["input:assurance-target"],
      supported_outputs: ["output:evidence"],
      effect_classes: ["E0_READ_ONLY_ANALYSIS"],
      requirements: {
        process_required: false,
        network_required: false,
        provider_requirements: [],
        sandbox_required: false,
      },
      configuration_trust_boundary: {
        trusted_configuration_sources: ["config:canonical"],
        advisory_configuration_sources: [],
      },
      license_provenance_state: {
        license_identity: "license:apache-2.0",
        provenance_ref: "provenance:ascout",
        admission_state: "ADMITTED",
      },
      qualification_evidence_refs: [],
      known_limitations: [],
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
    }),
    configuration_identity: {
      configuration_id: "configuration:t08",
      configuration_sha256: B,
    },
  };
  const registry = createEngineRegistryV1([entry]);
  const target = createAssuranceTargetV1({
    target_id: "target:ua-p02-t08",
    source_start_identity: source(),
    base_revision: "d".repeat(40),
    change_set_identity: "changeset:ua-p02-t08",
    worktree_generation: "generation:8",
    policy_snapshot_id: "policy:t08",
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P02-T08",
      acceptance_id: "acceptance:preview",
    },
    environment_identity: null,
    graph_index_generation: null,
    build_artifact_identity: null,
  });
  const intent = createAssuranceIntentV1({
    intent_id: "intent:ua-p02-t08",
    requested_claim: "ASSURANCE_PLANNED",
    profile: "STANDARD",
    scope: "ASSURE",
    include: [],
    exclude: [],
    maximum_effect_class: "E0_READ_ONLY_ANALYSIS",
    budget: {
      max_wall_time_ms: 300_000,
      max_concurrency: 2,
      max_engine_runs: 8,
      max_artifact_bytes: 1_000_000,
      max_network_requests: 0,
      max_network_egress_bytes: 0,
      max_model_tokens: 0,
      max_cost_microunits: 0,
    },
    target,
    surface_provenance: { surface_kind: "CI", surface_request_id: "request:t08" },
  });
  const policy = createAssurancePolicySnapshotV1({
    policy_id: "policy:t08",
    policy_version: "2026.09.22",
    trusted_policy_sources: [
      {
        source_id: "canonical:constitution",
        source_kind: "CANONICAL_REPOSITORY",
        content_sha256: A,
      },
    ],
    repository_advisory_policy_sources: [],
    minimum_mandatory_checks: [],
    effect_ceilings: [
      { scope: "REVIEW", maximum_effect_class: "E0_READ_ONLY_ANALYSIS" },
      { scope: "TEST", maximum_effect_class: "E0_READ_ONLY_ANALYSIS" },
      { scope: "SECURITY", maximum_effect_class: "E0_READ_ONLY_ANALYSIS" },
      { scope: "CYBER", maximum_effect_class: "E0_READ_ONLY_ANALYSIS" },
      { scope: "ASSURE", maximum_effect_class: "E0_READ_ONLY_ANALYSIS" },
      { scope: "REALITY", maximum_effect_class: "E0_READ_ONLY_ANALYSIS" },
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
      allow_risk_acceptance: false,
      require_reason: true,
      require_expiry: true,
      require_actor_identity: true,
    },
    data_egress_rules: {
      source_egress: "DENY",
      artifact_egress: "DENY",
      credential_material_egress: "DENY",
    },
  });
  const snapshot = createEngineAvailabilitySnapshotV1(registry, [
    {
      identity: {
        engine_id: entry.descriptor.engine_id,
        implementation_identity: entry.descriptor.implementation_identity,
        configuration_identity: entry.configuration_identity,
      },
      state: "AVAILABLE",
      reason_code: "LOCAL_IMPLEMENTATION_PRESENT",
    },
  ]);
  const set = createEngineQualificationSetV1([
    createEngineQualificationV1({
      qualification_id: "qualification:t08",
      engine_id: entry.descriptor.engine_id,
      implementation_identity: entry.descriptor.implementation_identity,
      configuration_identity: entry.configuration_identity,
      profile_identities: ["profile:standard"],
      benchmark_corpus_identity: {
        benchmark_id: "benchmark:t08",
        corpus_id: "corpus:t08",
        corpus_sha256: C,
      },
      platform_identity: {
        platform_id: "platform:linux-x64-node24",
        platform_sha256: E,
      },
      evidence_refs: [
        { evidence_ref: "evidence:t08", provider_self_description: false },
      ],
      result: "QUALIFIED",
      qualified_at_epoch_ms: 1_000,
      expires_at_epoch_ms: 2_000,
    }),
  ]);
  const plan = evaluatePlanWithOmissionsV1(
    registry,
    snapshot,
    set,
    {
      plan_id: "plan:ua-p02-t08",
      required_effect_classes: ["E0_READ_ONLY_ANALYSIS"],
      intent,
      policy,
      phase_authority: {
        phase_id: "phase:ua-p02",
        authority_source_id: "authority:ua-p02",
        authority_source_sha256: F,
        maximum_effect_class: "E0_READ_ONLY_ANALYSIS",
      },
      profile_identities: ["profile:standard"],
      benchmark_corpus_identity: {
        benchmark_id: "benchmark:t08",
        corpus_id: "corpus:t08",
        corpus_sha256: C,
      },
      platform_identity: {
        platform_id: "platform:linux-x64-node24",
        platform_sha256: E,
      },
      as_of_epoch_ms: 1_500,
      planner_id: "planner:ua-p02-deterministic",
      planner_version: "1.0.0",
      planner_configuration_sha256: A,
    },
  );
  return plan;
}

describe("UA-P02-T08 Plan preview terminal and JSON", () => {
  it("renders deterministic JSON and terminal previews", () => {
    const plan = buildPlan();

    const firstJson = renderPlanPreviewJsonV1(plan);
    const secondJson = renderPlanPreviewJsonV1(structuredClone(plan));
    expect(firstJson).toBe(secondJson);

    const firstTerminal = renderPlanPreviewTerminalV1(plan);
    const secondTerminal = renderPlanPreviewTerminalV1(structuredClone(plan));
    expect(firstTerminal).toBe(secondTerminal);

    expect(planPreviewDigestV1(plan)).toBe(planPreviewDigestV1(secondJson ? plan : plan));
    expect(firstTerminal).toContain("plan_id: plan:ua-p02-t08");
    expect(firstTerminal).toContain("selected_engine_identities: engine:t08");
    expect(firstTerminal).toContain("execution: NOT_TRIGGERED_BY_PREVIEW");
  });

  it("binds previews to exact plan content", () => {
    const plan = buildPlan();
    const digest = canonicalAssuranceSha256V1(plan);

    expect(renderPlanPreviewJsonV1(plan)).toContain(digest);
    expect(renderPlanPreviewTerminalV1(plan)).toContain(digest);
    expect(renderPlanPreviewJsonV1(plan)).toContain("policy:t08");
  });

  it("rejects malformed plans instead of rendering authority", () => {
    const plan = buildPlan();

    expect(() =>
      renderPlanPreviewJsonV1({ ...plan, execution_authority: true }),
    ).toThrow("contains missing or unknown fields");
    expect(() =>
      renderPlanPreviewTerminalV1({ ...plan, plan_id: "/bad" }),
    ).toThrow("plan_id");
  });

  it("never triggers engine execution", () => {
    const plan = buildPlan();
    const before = canonicalAssuranceSha256V1(plan);

    renderPlanPreviewJsonV1(plan);
    renderPlanPreviewTerminalV1(plan);
    planPreviewDigestV1(plan);

    expect(canonicalAssuranceSha256V1(plan)).toBe(before);
    expect("execution_authority" in plan).toBe(false);
    expect(renderPlanPreviewTerminalV1(plan)).not.toContain("EXECUTED");
  });
});
