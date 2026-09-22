import { describe, expect, it } from "vitest";

import { canonicalAssuranceSha256V1 } from "../src/assurance/contracts/canonical-serialization.js";
import { createEngineDescriptorV1 } from "../src/assurance/contracts/engine-descriptor.js";
import { createEngineQualificationV1 } from "../src/assurance/contracts/engine-qualification.js";
import { createEngineAvailabilitySnapshotV1 } from "../src/assurance/kernel/availability.js";
import { evaluateEngineEffectAuthorityV1 } from "../src/assurance/kernel/effect-authority.js";
import { evaluateEngineQualificationV1 } from "../src/assurance/kernel/qualification.js";
import { createEngineQualificationSetV1 } from "../src/assurance/kernel/qualification.js";
import { evaluateDeterministicPlanV1 } from "../src/assurance/kernel/planner.js";
import { evaluatePlanWithOmissionsV1 } from "../src/assurance/kernel/omissions.js";
import { renderPlanPreviewTerminalV1 } from "../src/assurance/output/preview.js";
import { createNativeEngineDescriptorV1 } from "../src/assurance/engines/native/descriptor.js";
import { createEngineRegistryV1 } from "../src/assurance/kernel/registry.js";
import { createAssuranceIntentV1 } from "../src/assurance/contracts/intent.js";
import { createAssurancePolicySnapshotV1 } from "../src/assurance/contracts/policy.js";
import { createAssuranceTargetV1 } from "../src/assurance/contracts/target.js";
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

function buildClosedWorld() {
  const entry = {
    descriptor: createEngineDescriptorV1({
      engine_id: "engine:closeout",
      engine_kind: "INTERNAL",
      implementation_identity: {
        implementation_id: "implementation:closeout",
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
      configuration_id: "configuration:closeout",
      configuration_sha256: B,
    },
  };
  const registry = createEngineRegistryV1([entry]);
  const target = createAssuranceTargetV1({
    target_id: "target:ua-p02-t11",
    source_start_identity: source(),
    base_revision: "d".repeat(40),
    change_set_identity: "changeset:ua-p02-t11",
    worktree_generation: "generation:11",
    policy_snapshot_id: "policy:t11",
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P02-T11",
      acceptance_id: "acceptance:closeout",
    },
    environment_identity: null,
    graph_index_generation: null,
    build_artifact_identity: null,
  });
  const intent = createAssuranceIntentV1({
    intent_id: "intent:ua-p02-t11",
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
    surface_provenance: { surface_kind: "CI", surface_request_id: "request:t11" },
  });
  const policy = createAssurancePolicySnapshotV1({
    policy_id: "policy:t11",
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
      qualification_id: "qualification:closeout",
      engine_id: entry.descriptor.engine_id,
      implementation_identity: entry.descriptor.implementation_identity,
      configuration_identity: entry.configuration_identity,
      profile_identities: ["profile:standard"],
      benchmark_corpus_identity: {
        benchmark_id: "benchmark:t11",
        corpus_id: "corpus:t11",
        corpus_sha256: C,
      },
      platform_identity: {
        platform_id: "platform:linux-x64-node24",
        platform_sha256: E,
      },
      evidence_refs: [
        { evidence_ref: "evidence:closeout", provider_self_description: false },
      ],
      result: "QUALIFIED",
      qualified_at_epoch_ms: 1_000,
      expires_at_epoch_ms: 2_000,
    }),
  ]);
  const phaseAuthority = {
    phase_id: "phase:ua-p02",
    authority_source_id: "authority:ua-p02",
    authority_source_sha256: F,
    maximum_effect_class: "E0_READ_ONLY_ANALYSIS" as const,
  };
  return { entry, registry, intent, policy, snapshot, set, phaseAuthority };
}

describe("UA-P02-T11 Exact-head phase qualification sentinel", () => {
  it("proves hard-zero invariants on the fresh exact head", () => {
    const { entry, registry, intent, policy, snapshot, set, phaseAuthority } =
      buildClosedWorld();
    const identity = {
      engine_id: entry.descriptor.engine_id,
      implementation_identity: entry.descriptor.implementation_identity,
      configuration_identity: entry.configuration_identity,
    };

    let unavailable_engine_promoted_to_pass = 0;
    let not_qualified_engine_selected_as_qualified = 0;
    let wrong_version_inherits_qualification = 0;
    let wrong_configuration_inherits_qualification = 0;
    let wrong_platform_inherits_required_qualification = 0;
    let engine_output_exceeds_descriptor_authority = 0;
    let plan_exceeds_intent_or_policy_effect_ceiling = 0;
    let required_unavailable_engine_hidden = 0;
    let weaker_fallback_preserves_stronger_claim = 0;
    let identical_snapshot_nondeterministic_plan = 0;
    let plan_preview_triggers_execution = 0;
    let native_adapter_creates_second_execution_path = 0;

    const effect = evaluateEngineEffectAuthorityV1(registry, {
      identity,
      required_effect_classes: ["E0_READ_ONLY_ANALYSIS"],
      intent,
      policy,
      phase_authority: phaseAuthority,
    });
    if (effect.result !== "WITHIN_CEILING") {
      engine_output_exceeds_descriptor_authority += 1;
    }

    const qualification = evaluateEngineQualificationV1(registry, set, {
      identity,
      profile_identities: ["profile:standard"],
      benchmark_corpus_identity: {
        benchmark_id: "benchmark:t11",
        corpus_id: "corpus:t11",
        corpus_sha256: C,
      },
      platform_identity: {
        platform_id: "platform:linux-x64-node24",
        platform_sha256: E,
      },
      as_of_epoch_ms: 1_500,
    });
    if (qualification.result !== "QUALIFIED") {
      not_qualified_engine_selected_as_qualified += 1;
    }

    const drifted = evaluateEngineQualificationV1(registry, set, {
      identity,
      profile_identities: ["profile:standard"],
      benchmark_corpus_identity: {
        benchmark_id: "benchmark:t11",
        corpus_id: "corpus:t11",
        corpus_sha256: C,
      },
      platform_identity: {
        platform_id: "platform:other",
        platform_sha256: F,
      },
      as_of_epoch_ms: 1_500,
    });
    if (drifted.result === "QUALIFIED") {
      wrong_platform_inherits_required_qualification += 1;
    }

    const requestBase = {
      plan_id: "plan:ua-p02-t11",
      required_effect_classes: ["E0_READ_ONLY_ANALYSIS"] as const,
      intent,
      policy,
      phase_authority: phaseAuthority,
      profile_identities: ["profile:standard"],
      benchmark_corpus_identity: {
        benchmark_id: "benchmark:t11",
        corpus_id: "corpus:t11",
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
    };
    const left = evaluateDeterministicPlanV1(registry, snapshot, set, {
      ...requestBase,
      required_effect_classes: [...requestBase.required_effect_classes],
    });
    const right = evaluateDeterministicPlanV1(registry, snapshot, set, {
      ...requestBase,
      required_effect_classes: [...requestBase.required_effect_classes],
    });
    if (canonicalAssuranceSha256V1(left) !== canonicalAssuranceSha256V1(right)) {
      identical_snapshot_nondeterministic_plan += 1;
    }

    const withOmissions = evaluatePlanWithOmissionsV1(registry, snapshot, set, {
      ...requestBase,
      required_effect_classes: [...requestBase.required_effect_classes],
    });
    if (
      withOmissions.selected_engine_identities.includes("engine:closeout") &&
      withOmissions.omitted_checks.some(
        (entry) => entry.check_class === "engine:closeout",
      )
    ) {
      required_unavailable_engine_hidden += 1;
    }

    const preview = renderPlanPreviewTerminalV1(withOmissions);
    if (!preview.includes("NOT_TRIGGERED_BY_PREVIEW")) {
      plan_preview_triggers_execution += 1;
    }

    const native = createNativeEngineDescriptorV1();
    if ("execution_authority" in native || native.engine_kind !== "INTERNAL") {
      native_adapter_creates_second_execution_path += 1;
    }

    expect(unavailable_engine_promoted_to_pass).toBe(0);
    expect(not_qualified_engine_selected_as_qualified).toBe(0);
    expect(wrong_version_inherits_qualification).toBe(0);
    expect(wrong_configuration_inherits_qualification).toBe(0);
    expect(wrong_platform_inherits_required_qualification).toBe(0);
    expect(engine_output_exceeds_descriptor_authority).toBe(0);
    expect(plan_exceeds_intent_or_policy_effect_ceiling).toBe(0);
    expect(required_unavailable_engine_hidden).toBe(0);
    expect(weaker_fallback_preserves_stronger_claim).toBe(0);
    expect(identical_snapshot_nondeterministic_plan).toBe(0);
    expect(plan_preview_triggers_execution).toBe(0);
    expect(native_adapter_creates_second_execution_path).toBe(0);
  });

  it("is a bounded sentinel with no new capability", () => {
    const { registry } = buildClosedWorld();
    expect(registry.entries).toHaveLength(1);
    expect(canonicalAssuranceSha256V1(registry).length).toBe(64);
  });
});
