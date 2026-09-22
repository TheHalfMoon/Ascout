import { describe, expect, it } from "vitest";

import { createAssuranceIntentV1 } from "../src/assurance/contracts/intent.js";
import { createAssurancePolicySnapshotV1 } from "../src/assurance/contracts/policy.js";
import { createAssuranceTargetV1 } from "../src/assurance/contracts/target.js";
import { createEngineDescriptorV1 } from "../src/assurance/contracts/engine-descriptor.js";
import { createEngineQualificationV1 } from "../src/assurance/contracts/engine-qualification.js";
import { createEngineAvailabilitySnapshotV1 } from "../src/assurance/kernel/availability.js";
import { createEngineQualificationSetV1 } from "../src/assurance/kernel/qualification.js";
import { evaluatePlanWithOmissionsV1 } from "../src/assurance/kernel/omissions.js";
import type { DeterministicPlannerRequestV1 } from "../src/assurance/kernel/planner.js";
import {
  createEngineRegistryV1,
  type EngineRegistryEntryV1,
} from "../src/assurance/kernel/registry.js";
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

function registryEntry(engineId: string): EngineRegistryEntryV1 {
  return {
    descriptor: createEngineDescriptorV1({
      engine_id: engineId,
      engine_kind: "INTERNAL",
      implementation_identity: {
        implementation_id: "implementation:" + engineId,
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
      configuration_id: "configuration:" + engineId,
      configuration_sha256: B,
    },
  };
}

function intentAndPolicy() {
  const target = createAssuranceTargetV1({
    target_id: "target:ua-p02-t07",
    source_start_identity: source(),
    base_revision: "d".repeat(40),
    change_set_identity: "changeset:ua-p02-t07",
    worktree_generation: "generation:7",
    policy_snapshot_id: "policy:t07",
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P02-T07",
      acceptance_id: "acceptance:omissions",
    },
    environment_identity: null,
    graph_index_generation: null,
    build_artifact_identity: null,
  });
  const intent = createAssuranceIntentV1({
    intent_id: "intent:ua-p02-t07",
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
    surface_provenance: { surface_kind: "CI", surface_request_id: "request:t07" },
  });
  const policy = createAssurancePolicySnapshotV1({
    policy_id: "policy:t07",
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

function qualificationSetFor(entries: readonly EngineRegistryEntryV1[]) {
  return createEngineQualificationSetV1(
    entries.map((entry) =>
      createEngineQualificationV1({
        qualification_id: "qualification:" + entry.descriptor.engine_id,
        engine_id: entry.descriptor.engine_id,
        implementation_identity: entry.descriptor.implementation_identity,
        configuration_identity: entry.configuration_identity,
        profile_identities: ["profile:standard"],
        benchmark_corpus_identity: {
          benchmark_id: "benchmark:t07",
          corpus_id: "corpus:t07",
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
}

function plannerRequest(): DeterministicPlannerRequestV1 {
  const { intent, policy } = intentAndPolicy();
  return {
    plan_id: "plan:ua-p02-t07",
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
      benchmark_id: "benchmark:t07",
      corpus_id: "corpus:t07",
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
}

describe("UA-P02-T07 Omission planner", () => {
  it("records no omissions when every engine is available and qualified", () => {
    const first = registryEntry("engine:a");
    const registry = createEngineRegistryV1([first]);
    const snapshot = createEngineAvailabilitySnapshotV1(registry, [
      {
        identity: {
          engine_id: first.descriptor.engine_id,
          implementation_identity: first.descriptor.implementation_identity,
          configuration_identity: first.configuration_identity,
        },
        state: "AVAILABLE",
        reason_code: "LOCAL_IMPLEMENTATION_PRESENT",
      },
    ]);
    const set = qualificationSetFor([first]);

    const plan = evaluatePlanWithOmissionsV1(
      registry,
      snapshot,
      set,
      plannerRequest(),
    );

    expect(plan.selected_engine_identities).toEqual(["engine:a"]);
    expect(plan.omitted_checks).toEqual([]);
  });

  it("records unavailable engines as explicit omissions without hiding them", () => {
    const first = registryEntry("engine:a");
    const second = registryEntry("engine:z");
    const registry = createEngineRegistryV1([first, second]);
    const snapshot = createEngineAvailabilitySnapshotV1(registry, [
      {
        identity: {
          engine_id: first.descriptor.engine_id,
          implementation_identity: first.descriptor.implementation_identity,
          configuration_identity: first.configuration_identity,
        },
        state: "AVAILABLE",
        reason_code: "LOCAL_IMPLEMENTATION_PRESENT",
      },
    ]);
    const set = qualificationSetFor([first, second]);

    const plan = evaluatePlanWithOmissionsV1(
      registry,
      snapshot,
      set,
      plannerRequest(),
    );

    expect(plan.selected_engine_identities).toEqual(["engine:a"]);
    expect(plan.omitted_checks).toEqual([
      { check_class: "engine:z", reason: "REQUIRED_ENGINE_UNAVAILABLE" },
    ]);
  });

  it("records unqualified engines as explicit omissions", () => {
    const first = registryEntry("engine:a");
    const second = registryEntry("engine:z");
    const registry = createEngineRegistryV1([first, second]);
    const snapshot = createEngineAvailabilitySnapshotV1(
      registry,
      [first, second].map((entry) => ({
        identity: {
          engine_id: entry.descriptor.engine_id,
          implementation_identity: entry.descriptor.implementation_identity,
          configuration_identity: entry.configuration_identity,
        },
        state: "AVAILABLE" as const,
        reason_code: "LOCAL_IMPLEMENTATION_PRESENT",
      })),
    );
    const set = qualificationSetFor([first]);

    const plan = evaluatePlanWithOmissionsV1(
      registry,
      snapshot,
      set,
      plannerRequest(),
    );

    expect(plan.selected_engine_identities).toEqual(["engine:a"]);
    expect(plan.omitted_checks).toEqual([
      { check_class: "engine:z", reason: "REQUIRED_ENGINE_NOT_QUALIFIED" },
    ]);
  });

  it("keeps selected and omitted disjoint and deterministic", () => {
    const first = registryEntry("engine:a");
    const second = registryEntry("engine:z");
    const leftRegistry = createEngineRegistryV1([first, second]);
    const rightRegistry = createEngineRegistryV1([second, first]);
    const snapshot = createEngineAvailabilitySnapshotV1(leftRegistry, []);
    const set = qualificationSetFor([first, second]);

    const left = evaluatePlanWithOmissionsV1(
      leftRegistry,
      snapshot,
      set,
      plannerRequest(),
    );
    const rightSnapshot = createEngineAvailabilitySnapshotV1(
      rightRegistry,
      [],
    );
    const right = evaluatePlanWithOmissionsV1(
      rightRegistry,
      rightSnapshot,
      set,
      plannerRequest(),
    );

    expect(left).toEqual(right);
    expect(left.selected_engine_identities).toEqual([]);
    expect(left.omitted_checks.map((entry) => entry.check_class)).toEqual([
      "engine:a",
      "engine:z",
    ]);
    const overlap = left.selected_engine_identities.filter((id) =>
      left.omitted_checks.some((entry) => entry.check_class === id),
    );
    expect(overlap).toEqual([]);
  });

  it("returns deeply frozen effect-free omission evidence", () => {
    const first = registryEntry("engine:a");
    const registry = createEngineRegistryV1([first]);
    const snapshot = createEngineAvailabilitySnapshotV1(registry, []);
    const set = qualificationSetFor([first]);

    const plan = evaluatePlanWithOmissionsV1(
      registry,
      snapshot,
      set,
      plannerRequest(),
    );

    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.omitted_checks)).toBe(true);
    expect("execution_authority" in plan).toBe(false);
    expect("network_authority" in plan).toBe(false);
  });
});
