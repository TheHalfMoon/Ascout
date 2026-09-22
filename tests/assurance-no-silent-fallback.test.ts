import { describe, expect, it } from "vitest";

import { createAssuranceIntentV1 } from "../src/assurance/contracts/intent.js";
import { createAssurancePolicySnapshotV1 } from "../src/assurance/contracts/policy.js";
import { createAssuranceTargetV1 } from "../src/assurance/contracts/target.js";
import { createEngineDescriptorV1 } from "../src/assurance/contracts/engine-descriptor.js";
import { createEngineQualificationV1 } from "../src/assurance/contracts/engine-qualification.js";
import { createEngineAvailabilitySnapshotV1 } from "../src/assurance/kernel/availability.js";
import { createEngineQualificationSetV1 } from "../src/assurance/kernel/qualification.js";
import { evaluateDeterministicPlanV1 } from "../src/assurance/kernel/planner.js";
import { evaluatePlanWithOmissionsV1 } from "../src/assurance/kernel/omissions.js";
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

function strongEntry() {
  return {
    descriptor: createEngineDescriptorV1({
      engine_id: "engine:strong",
      engine_kind: "INTERNAL",
      implementation_identity: {
        implementation_id: "implementation:strong",
        source_identity: "source:ascout",
        version: "1.0.0",
        artifact_sha256: D,
      },
      capabilities: ["capability:strong-claim"],
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
      configuration_id: "configuration:strong",
      configuration_sha256: B,
    },
  };
}

function weakEntry() {
  return {
    descriptor: createEngineDescriptorV1({
      engine_id: "engine:weak",
      engine_kind: "INTERNAL",
      implementation_identity: {
        implementation_id: "implementation:weak",
        source_identity: "source:ascout",
        version: "1.0.0",
        artifact_sha256: E,
      },
      capabilities: ["capability:weak-claim"],
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
      known_limitations: ["Weaker substitute."],
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
    }),
    configuration_identity: {
      configuration_id: "configuration:weak",
      configuration_sha256: F,
    },
  };
}

function intentAndPolicy() {
  const target = createAssuranceTargetV1({
    target_id: "target:ua-p02-t10",
    source_start_identity: source(),
    base_revision: "d".repeat(40),
    change_set_identity: "changeset:ua-p02-t10",
    worktree_generation: "generation:10",
    policy_snapshot_id: "policy:t10",
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P02-T10",
      acceptance_id: "acceptance:no-silent-fallback",
    },
    environment_identity: null,
    graph_index_generation: null,
    build_artifact_identity: null,
  });
  const intent = createAssuranceIntentV1({
    intent_id: "intent:ua-p02-t10",
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
    surface_provenance: { surface_kind: "CI", surface_request_id: "request:t10" },
  });
  const policy = createAssurancePolicySnapshotV1({
    policy_id: "policy:t10",
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
  return { intent, policy };
}

function context() {
  const strong = strongEntry();
  const weak = weakEntry();
  const registry = createEngineRegistryV1([strong, weak]);
  const { intent, policy } = intentAndPolicy();
  const requestBase = {
    plan_id: "plan:ua-p02-t10",
    required_effect_classes: ["E0_READ_ONLY_ANALYSIS"] as const,
    intent,
    policy,
    phase_authority: {
      phase_id: "phase:ua-p02",
      authority_source_id: "authority:ua-p02",
      authority_source_sha256: A,
      maximum_effect_class: "E0_READ_ONLY_ANALYSIS" as const,
    },
    profile_identities: ["profile:standard"],
    benchmark_corpus_identity: {
      benchmark_id: "benchmark:t10",
      corpus_id: "corpus:t10",
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
  return { strong, weak, registry, requestBase };
}

describe("UA-P02-T10 No-silent-fallback adversarial corpus", () => {
  it("never substitutes an unavailable stronger engine with a weaker one silently", () => {
    const { strong, weak, registry, requestBase } = context();
    const snapshot = createEngineAvailabilitySnapshotV1(registry, [
      {
        identity: {
          engine_id: weak.descriptor.engine_id,
          implementation_identity: weak.descriptor.implementation_identity,
          configuration_identity: weak.configuration_identity,
        },
        state: "AVAILABLE",
        reason_code: "LOCAL_IMPLEMENTATION_PRESENT",
      },
    ]);
    const set = createEngineQualificationSetV1(
      [strong, weak].map((entry) =>
        createEngineQualificationV1({
          qualification_id: "qualification:" + entry.descriptor.engine_id,
          engine_id: entry.descriptor.engine_id,
          implementation_identity: entry.descriptor.implementation_identity,
          configuration_identity: entry.configuration_identity,
          profile_identities: ["profile:standard"],
          benchmark_corpus_identity: {
            benchmark_id: "benchmark:t10",
            corpus_id: "corpus:t10",
            corpus_sha256: C,
          },
          platform_identity: {
            platform_id: "platform:linux-x64-node24",
            platform_sha256: E,
          },
          evidence_refs: [
            {
              evidence_ref: "evidence:" + entry.descriptor.engine_id,
              provider_self_description: false,
            },
          ],
          result: "QUALIFIED",
          qualified_at_epoch_ms: 1_000,
          expires_at_epoch_ms: 2_000,
        }),
      ),
    );

    const plan = evaluateDeterministicPlanV1(
      registry,
      snapshot,
      set,
      { ...requestBase, required_effect_classes: [...requestBase.required_effect_classes] },
    );
    expect(plan.selected_engine_identities).toEqual(["engine:weak"]);
    expect(plan.selected_engine_identities).not.toContain("engine:strong");

    const withOmissions = evaluatePlanWithOmissionsV1(
      registry,
      snapshot,
      set,
      { ...requestBase, required_effect_classes: [...requestBase.required_effect_classes] },
    );
    expect(withOmissions.omitted_checks).toContainEqual({
      check_class: "engine:strong",
      reason: "REQUIRED_ENGINE_UNAVAILABLE",
    });
    expect(withOmissions.selected_engine_identities).not.toContain(
      "engine:strong",
    );
  });

  it("never lets an unqualified stronger engine inherit weaker qualification credit", () => {
    const { strong, weak, registry, requestBase } = context();
    const snapshot = createEngineAvailabilitySnapshotV1(
      registry,
      [strong, weak].map((entry) => ({
        identity: {
          engine_id: entry.descriptor.engine_id,
          implementation_identity: entry.descriptor.implementation_identity,
          configuration_identity: entry.configuration_identity,
        },
        state: "AVAILABLE" as const,
        reason_code: "LOCAL_IMPLEMENTATION_PRESENT",
      })),
    );
    const set = createEngineQualificationSetV1([
      createEngineQualificationV1({
        qualification_id: "qualification:engine-weak",
        engine_id: weak.descriptor.engine_id,
        implementation_identity: weak.descriptor.implementation_identity,
        configuration_identity: weak.configuration_identity,
        profile_identities: ["profile:standard"],
        benchmark_corpus_identity: {
          benchmark_id: "benchmark:t10",
          corpus_id: "corpus:t10",
          corpus_sha256: C,
        },
        platform_identity: {
          platform_id: "platform:linux-x64-node24",
          platform_sha256: E,
        },
        evidence_refs: [
          { evidence_ref: "evidence:weak", provider_self_description: false },
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
      { ...requestBase, required_effect_classes: [...requestBase.required_effect_classes] },
    );
    expect(plan.selected_engine_identities).toEqual(["engine:weak"]);
    expect(plan.omitted_checks).toContainEqual({
      check_class: "engine:strong",
      reason: "REQUIRED_ENGINE_NOT_QUALIFIED",
    });
  });

  it("keeps missing capability visible instead of preserving stronger claim", () => {
    const { strong, weak, registry, requestBase } = context();
    const snapshot = createEngineAvailabilitySnapshotV1(registry, []);
    const set = createEngineQualificationSetV1(
      [strong, weak].map((entry) =>
        createEngineQualificationV1({
          qualification_id: "qualification:" + entry.descriptor.engine_id,
          engine_id: entry.descriptor.engine_id,
          implementation_identity: entry.descriptor.implementation_identity,
          configuration_identity: entry.configuration_identity,
          profile_identities: ["profile:standard"],
          benchmark_corpus_identity: {
            benchmark_id: "benchmark:t10",
            corpus_id: "corpus:t10",
            corpus_sha256: C,
          },
          platform_identity: {
            platform_id: "platform:linux-x64-node24",
            platform_sha256: E,
          },
          evidence_refs: [
            {
              evidence_ref: "evidence:" + entry.descriptor.engine_id,
              provider_self_description: false,
            },
          ],
          result: "QUALIFIED",
          qualified_at_epoch_ms: 1_000,
          expires_at_epoch_ms: 2_000,
        }),
      ),
    );

    const plan = evaluatePlanWithOmissionsV1(
      registry,
      snapshot,
      set,
      { ...requestBase, required_effect_classes: [...requestBase.required_effect_classes] },
    );
    expect(plan.selected_engine_identities).toEqual([]);
    expect(plan.omitted_checks).toHaveLength(2);
    expect(plan.requested_claim).toBe("ASSURANCE_PLANNED");
  });
});
