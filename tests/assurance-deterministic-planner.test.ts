import { describe, expect, it } from "vitest";

import { canonicalAssuranceSha256V1 } from "../src/assurance/contracts/canonical-serialization.js";
import { createAssuranceIntentV1 } from "../src/assurance/contracts/intent.js";
import { createAssurancePolicySnapshotV1 } from "../src/assurance/contracts/policy.js";
import { createAssuranceTargetV1 } from "../src/assurance/contracts/target.js";
import { createEngineDescriptorV1 } from "../src/assurance/contracts/engine-descriptor.js";
import { createEngineQualificationV1 } from "../src/assurance/contracts/engine-qualification.js";
import { createEngineAvailabilitySnapshotV1 } from "../src/assurance/kernel/availability.js";
import { createEngineQualificationSetV1 } from "../src/assurance/kernel/qualification.js";
import {
  assertDeterministicPlanContextV1,
  deterministicPlanDigestV1,
  evaluateDeterministicPlanV1,
  type DeterministicPlannerRequestV1,
} from "../src/assurance/kernel/planner.js";
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
    target_id: "target:ua-p02-t06",
    source_start_identity: source(),
    base_revision: "d".repeat(40),
    change_set_identity: "changeset:ua-p02-t06",
    worktree_generation: "generation:6",
    policy_snapshot_id: "policy:t06",
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P02-T06",
      acceptance_id: "acceptance:planner",
    },
    environment_identity: null,
    graph_index_generation: null,
    build_artifact_identity: null,
  });
  const intent = createAssuranceIntentV1({
    intent_id: "intent:ua-p02-t06",
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
    surface_provenance: {
      surface_kind: "CI",
      surface_request_id: "request:t06",
    },
  });
  const policy = createAssurancePolicySnapshotV1({
    policy_id: "policy:t06",
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
          benchmark_id: "benchmark:t06",
          corpus_id: "corpus:t06",
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

function availabilityFor(
  registry: ReturnType<typeof createEngineRegistryV1>,
  entries: readonly EngineRegistryEntryV1[],
) {
  return createEngineAvailabilitySnapshotV1(
    registry,
    entries.map((entry) => ({
      identity: {
        engine_id: entry.descriptor.engine_id,
        implementation_identity: entry.descriptor.implementation_identity,
        configuration_identity: entry.configuration_identity,
      },
      state: "AVAILABLE" as const,
      reason_code: "LOCAL_IMPLEMENTATION_PRESENT",
    })),
  );
}

function plannerRequest(
  overrides: Partial<DeterministicPlannerRequestV1> = {},
): DeterministicPlannerRequestV1 {
  const { intent, policy } = intentAndPolicy();
  return {
    plan_id: "plan:ua-p02-t06",
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
      benchmark_id: "benchmark:t06",
      corpus_id: "corpus:t06",
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
    ...overrides,
  };
}

describe("UA-P02-T06 Deterministic planner", () => {
  it("selects exact available, qualified, within-ceiling engines", () => {
    const first = registryEntry("engine:a");
    const second = registryEntry("engine:z");
    const registry = createEngineRegistryV1([first, second]);
    const snapshot = availabilityFor(registry, [first, second]);
    const set = qualificationSetFor([first, second]);

    const plan = evaluateDeterministicPlanV1(
      registry,
      snapshot,
      set,
      plannerRequest(),
    );

    expect(plan.selected_engine_identities).toEqual([
      "engine:a",
      "engine:z",
    ]);
    expect(plan.required_effect_classes).toEqual(["E0_READ_ONLY_ANALYSIS"]);
    expect(plan.omitted_checks).toEqual([]);
  });

  it("produces identical plans and digests for identical canonical inputs", () => {
    const first = registryEntry("engine:a");
    const second = registryEntry("engine:z");
    const leftRegistry = createEngineRegistryV1([first, second]);
    const rightRegistry = createEngineRegistryV1([second, first]);
    const leftSnapshot = availabilityFor(leftRegistry, [second, first]);
    const rightSnapshot = availabilityFor(rightRegistry, [first, second]);
    const leftSet = createEngineQualificationSetV1(
      [...qualificationSetFor([first, second]).qualifications].reverse(),
    );
    const rightSet = qualificationSetFor([first, second]);

    const left = evaluateDeterministicPlanV1(
      leftRegistry,
      leftSnapshot,
      leftSet,
      plannerRequest(),
    );
    const right = evaluateDeterministicPlanV1(
      rightRegistry,
      rightSnapshot,
      rightSet,
      plannerRequest(),
    );

    expect(left).toEqual(right);
    expect(deterministicPlanDigestV1(left)).toBe(
      deterministicPlanDigestV1(right),
    );
    expect(canonicalAssuranceSha256V1(left)).toBe(
      canonicalAssuranceSha256V1(right),
    );
  });

  it("excludes unavailable engines without promoting them", () => {
    const first = registryEntry("engine:a");
    const second = registryEntry("engine:z");
    const registry = createEngineRegistryV1([first, second]);
    const snapshot = availabilityFor(registry, [first]);
    const set = qualificationSetFor([first, second]);

    const plan = evaluateDeterministicPlanV1(
      registry,
      snapshot,
      set,
      plannerRequest(),
    );

    expect(plan.selected_engine_identities).toEqual(["engine:a"]);
  });

  it("excludes unqualified engines without promoting them", () => {
    const first = registryEntry("engine:a");
    const second = registryEntry("engine:z");
    const registry = createEngineRegistryV1([first, second]);
    const snapshot = availabilityFor(registry, [first, second]);
    const set = qualificationSetFor([first]);

    const plan = evaluateDeterministicPlanV1(
      registry,
      snapshot,
      set,
      plannerRequest(),
    );

    expect(plan.selected_engine_identities).toEqual(["engine:a"]);
  });

  it("excludes engines whose effects exceed the ceiling", () => {
    const first = registryEntry("engine:a");
    const second = registryEntry("engine:z");
    const registry = createEngineRegistryV1([first, second]);
    const snapshot = availabilityFor(registry, [first, second]);
    const set = qualificationSetFor([first, second]);

    const plan = evaluateDeterministicPlanV1(
      registry,
      snapshot,
      set,
      plannerRequest({ required_effect_classes: [] }),
    );

    expect(plan.selected_engine_identities).toEqual([
      "engine:a",
      "engine:z",
    ]);
    expect(plan.required_effect_classes).toEqual([]);
  });

  it("fails closed when planner effects exceed intent, policy, or phase ceilings", () => {
    const first = registryEntry("engine:a");
    const registry = createEngineRegistryV1([first]);
    const snapshot = availabilityFor(registry, [first]);
    const set = qualificationSetFor([first]);

    expect(() =>
      evaluateDeterministicPlanV1(
        registry,
        snapshot,
        set,
        plannerRequest({
          required_effect_classes: ["E1_LOCAL_DETERMINISTIC_PROCESS"],
        }),
      ),
    ).toThrow("exceeds intent ceiling");
  });

  it("rejects mismatched intent, policy, and planner bindings", () => {
    const first = registryEntry("engine:a");
    const registry = createEngineRegistryV1([first]);
    const snapshot = availabilityFor(registry, [first]);
    const set = qualificationSetFor([first]);
    const base = plannerRequest();

    expect(() =>
      evaluateDeterministicPlanV1(registry, snapshot, set, {
        ...base,
        execution_authority: true,
      } as unknown as DeterministicPlannerRequestV1),
    ).toThrow("deterministic planner request contains missing or unknown fields");

    expect(() =>
      evaluateDeterministicPlanV1(registry, snapshot, set, {
        ...base,
        planner_configuration_sha256: "not-a-digest",
      }),
    ).toThrow("planner_configuration_sha256");
  });

  it("binds plans to exact planner identity and context", () => {
    const first = registryEntry("engine:a");
    const registry = createEngineRegistryV1([first]);
    const snapshot = availabilityFor(registry, [first]);
    const set = qualificationSetFor([first]);
    const base = plannerRequest();
    const plan = evaluateDeterministicPlanV1(registry, snapshot, set, base);

    expect(() =>
      assertDeterministicPlanContextV1(registry, snapshot, set, base, plan),
    ).not.toThrow();

    expect(() =>
      assertDeterministicPlanContextV1(
        registry,
        snapshot,
        set,
        { ...base, as_of_epoch_ms: 2_500 },
        plan,
      ),
    ).toThrow("deterministic plan context mismatch");
  });

  it("returns deeply frozen effect-free plans", () => {
    const first = registryEntry("engine:a");
    const registry = createEngineRegistryV1([first]);
    const snapshot = availabilityFor(registry, [first]);
    const set = qualificationSetFor([first]);

    const plan = evaluateDeterministicPlanV1(
      registry,
      snapshot,
      set,
      plannerRequest(),
    );

    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.selected_engine_identities)).toBe(true);
    expect("execution_authority" in plan).toBe(false);
    expect("network_authority" in plan).toBe(false);
  });
});
