import { describe, expect, it } from "vitest";

import { ASSURANCE_SCOPES } from "../src/assurance/contracts/intent.js";
import {
  createAssuranceIntentV1,
  type AssuranceEffectClass,
  type AssuranceScope,
} from "../src/assurance/contracts/intent.js";
import { createAssurancePolicySnapshotV1 } from "../src/assurance/contracts/policy.js";
import { createAssuranceTargetV1 } from "../src/assurance/contracts/target.js";
import { createEngineDescriptorV1 } from "../src/assurance/contracts/engine-descriptor.js";
import {
  assertEngineEffectAuthorityDecisionContextV1,
  evaluateEngineEffectAuthorityV1,
  type EngineEffectAuthorityRequestV1,
  type EnginePhaseAuthorityV1,
} from "../src/assurance/kernel/effect-authority.js";
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

function target(policyId = "policy:t04") {
  return createAssuranceTargetV1({
    target_id: "target:ua-p02-t04",
    source_start_identity: source(),
    base_revision: "d".repeat(40),
    change_set_identity: "changeset:ua-p02-t04",
    worktree_generation: "generation:4",
    policy_snapshot_id: policyId,
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P02-T04",
      acceptance_id: "acceptance:effect-authority",
    },
    environment_identity: null,
    graph_index_generation: null,
    build_artifact_identity: null,
  });
}

function intent(
  maximumEffectClass: AssuranceEffectClass = "E3_ISOLATED_LOCAL_EXECUTION",
  scope: AssuranceScope = "ASSURE",
  policyId = "policy:t04",
) {
  return createAssuranceIntentV1({
    intent_id: "intent:ua-p02-t04",
    requested_claim: "ASSURANCE_PLANNED",
    profile: "STANDARD",
    scope,
    include: [],
    exclude: [],
    maximum_effect_class: maximumEffectClass,
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
    target: target(policyId),
    surface_provenance: {
      surface_kind: "CI",
      surface_request_id: "request:t04",
    },
  });
}

function policy(
  maximumEffectClass: AssuranceEffectClass = "E3_ISOLATED_LOCAL_EXECUTION",
  scope: AssuranceScope = "ASSURE",
  policyId = "policy:t04",
) {
  return createAssurancePolicySnapshotV1({
    policy_id: policyId,
    policy_version: "2026.09.21",
    trusted_policy_sources: [
      {
        source_id: "canonical:constitution",
        source_kind: "CANONICAL_REPOSITORY",
        content_sha256: A,
      },
    ],
    repository_advisory_policy_sources: [],
    minimum_mandatory_checks: [],
    effect_ceilings: ASSURANCE_SCOPES.map((candidateScope) => ({
      scope: candidateScope,
      maximum_effect_class:
        candidateScope === scope
          ? maximumEffectClass
          : "E7_ACTIVE_SECURITY_VALIDATION",
    })),
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
}

function registryEntry(
  effectClasses: readonly AssuranceEffectClass[] = [
    "E0_READ_ONLY_ANALYSIS",
    "E1_LOCAL_DETERMINISTIC_PROCESS",
    "E2_LOCAL_WRITE_ARTIFACT_ONLY",
    "E3_ISOLATED_LOCAL_EXECUTION",
  ],
  authorityCeiling: AssuranceEffectClass = "E3_ISOLATED_LOCAL_EXECUTION",
): EngineRegistryEntryV1 {
  return {
    descriptor: createEngineDescriptorV1({
      engine_id: "engine:t04",
      engine_kind: "INTERNAL",
      implementation_identity: {
        implementation_id: "implementation:t04",
        source_identity: "source:ascout",
        version: "1.0.0",
        artifact_sha256: D,
      },
      capabilities: ["capability:review"],
      supported_inputs: ["input:assurance-target"],
      supported_outputs: ["output:evidence"],
      effect_classes: effectClasses,
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
      authority_ceiling: authorityCeiling,
    }),
    configuration_identity: {
      configuration_id: "configuration:t04",
      configuration_sha256: B,
    },
  };
}

function identityFor(entry: EngineRegistryEntryV1) {
  return {
    engine_id: entry.descriptor.engine_id,
    implementation_identity: entry.descriptor.implementation_identity,
    configuration_identity: entry.configuration_identity,
  };
}

function phaseAuthority(
  maximumEffectClass: AssuranceEffectClass = "E3_ISOLATED_LOCAL_EXECUTION",
  sourceSha = E,
): EnginePhaseAuthorityV1 {
  return {
    phase_id: "phase:ua-p02",
    authority_source_id: "authority:ua-p02",
    authority_source_sha256: sourceSha,
    maximum_effect_class: maximumEffectClass,
  };
}

function request(
  entry: EngineRegistryEntryV1,
  requiredEffectClasses: readonly AssuranceEffectClass[],
  options: {
    readonly intentMaximum?: AssuranceEffectClass;
    readonly policyMaximum?: AssuranceEffectClass;
    readonly phaseMaximum?: AssuranceEffectClass;
    readonly scope?: AssuranceScope;
    readonly policyId?: string;
    readonly phaseSourceSha?: string;
  } = {},
): EngineEffectAuthorityRequestV1 {
  const scope = options.scope ?? "ASSURE";
  const policyId = options.policyId ?? "policy:t04";
  return {
    identity: identityFor(entry),
    required_effect_classes: requiredEffectClasses,
    intent: intent(
      options.intentMaximum ?? "E3_ISOLATED_LOCAL_EXECUTION",
      scope,
      policyId,
    ),
    policy: policy(
      options.policyMaximum ?? "E3_ISOLATED_LOCAL_EXECUTION",
      scope,
      policyId,
    ),
    phase_authority: phaseAuthority(
      options.phaseMaximum ?? "E3_ISOLATED_LOCAL_EXECUTION",
      options.phaseSourceSha ?? E,
    ),
  };
}

describe("UA-P02-T04 Effect-class evaluator", () => {
  it("allows required effects only when every authority boundary permits them", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineEffectAuthorityV1(
      registry,
      request(engine, [
        "E1_LOCAL_DETERMINISTIC_PROCESS",
        "E0_READ_ONLY_ANALYSIS",
      ]),
    );

    expect(decision.result).toBe("WITHIN_CEILING");
    expect(decision.violated_boundaries).toEqual([]);
    expect(decision.required_effect_classes).toEqual([
      "E0_READ_ONLY_ANALYSIS",
      "E1_LOCAL_DETERMINISTIC_PROCESS",
    ]);
    expect(decision.descriptor_reason_code).toBe(
      "DESCRIPTOR_AUTHORITY_SATISFIED",
    );
  });

  it("fails closed when required effects exceed the intent ceiling", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineEffectAuthorityV1(
      registry,
      request(engine, ["E2_LOCAL_WRITE_ARTIFACT_ONLY"], {
        intentMaximum: "E1_LOCAL_DETERMINISTIC_PROCESS",
      }),
    );

    expect(decision.result).toBe("DENIED");
    expect(decision.violated_boundaries).toEqual(["INTENT"]);
  });

  it("fails closed when required effects exceed the scope-specific policy ceiling", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineEffectAuthorityV1(
      registry,
      request(engine, ["E2_LOCAL_WRITE_ARTIFACT_ONLY"], {
        policyMaximum: "E1_LOCAL_DETERMINISTIC_PROCESS",
      }),
    );

    expect(decision.result).toBe("DENIED");
    expect(decision.violated_boundaries).toEqual(["POLICY"]);
  });

  it("fails closed when a declared technical effect exceeds descriptor authority", () => {
    const engine = registryEntry(
      [
        "E0_READ_ONLY_ANALYSIS",
        "E1_LOCAL_DETERMINISTIC_PROCESS",
        "E3_ISOLATED_LOCAL_EXECUTION",
      ],
      "E1_LOCAL_DETERMINISTIC_PROCESS",
    );
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineEffectAuthorityV1(
      registry,
      request(engine, ["E3_ISOLATED_LOCAL_EXECUTION"]),
    );

    expect(decision.result).toBe("DENIED");
    expect(decision.violated_boundaries).toEqual(["DESCRIPTOR"]);
    expect(decision.descriptor_reason_code).toBe(
      "EFFECT_EXCEEDS_DESCRIPTOR_AUTHORITY_CEILING",
    );
  });

  it("fails closed when the descriptor does not declare the required effect", () => {
    const engine = registryEntry(
      ["E0_READ_ONLY_ANALYSIS", "E2_LOCAL_WRITE_ARTIFACT_ONLY"],
      "E2_LOCAL_WRITE_ARTIFACT_ONLY",
    );
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineEffectAuthorityV1(
      registry,
      request(engine, ["E1_LOCAL_DETERMINISTIC_PROCESS"]),
    );

    expect(decision.result).toBe("DENIED");
    expect(decision.violated_boundaries).toEqual(["DESCRIPTOR"]);
    expect(decision.descriptor_reason_code).toBe("EFFECT_NOT_DECLARED");
  });

  it("fails closed when required effects exceed explicit phase authority", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineEffectAuthorityV1(
      registry,
      request(engine, ["E2_LOCAL_WRITE_ARTIFACT_ONLY"], {
        phaseMaximum: "E1_LOCAL_DETERMINISTIC_PROCESS",
      }),
    );

    expect(decision.result).toBe("DENIED");
    expect(decision.violated_boundaries).toEqual(["PHASE"]);
  });

  it("reports every violated boundary in canonical order", () => {
    const engine = registryEntry(
      [
        "E0_READ_ONLY_ANALYSIS",
        "E1_LOCAL_DETERMINISTIC_PROCESS",
        "E2_LOCAL_WRITE_ARTIFACT_ONLY",
        "E3_ISOLATED_LOCAL_EXECUTION",
      ],
      "E1_LOCAL_DETERMINISTIC_PROCESS",
    );
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineEffectAuthorityV1(
      registry,
      request(engine, ["E3_ISOLATED_LOCAL_EXECUTION"], {
        intentMaximum: "E1_LOCAL_DETERMINISTIC_PROCESS",
        policyMaximum: "E2_LOCAL_WRITE_ARTIFACT_ONLY",
        phaseMaximum: "E0_READ_ONLY_ANALYSIS",
      }),
    );

    expect(decision.result).toBe("DENIED");
    expect(decision.violated_boundaries).toEqual([
      "INTENT",
      "POLICY",
      "DESCRIPTOR",
      "PHASE",
    ]);
  });

  it("uses the policy ceiling for the exact intent scope", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineEffectAuthorityV1(
      registry,
      request(engine, ["E1_LOCAL_DETERMINISTIC_PROCESS"], {
        scope: "REVIEW",
        intentMaximum: "E3_ISOLATED_LOCAL_EXECUTION",
        policyMaximum: "E0_READ_ONLY_ANALYSIS",
        phaseMaximum: "E3_ISOLATED_LOCAL_EXECUTION",
      }),
    );

    expect(decision.scope).toBe("REVIEW");
    expect(decision.policy_effect_ceiling).toBe("E0_READ_ONLY_ANALYSIS");
    expect(decision.violated_boundaries).toEqual(["POLICY"]);
  });

  it("canonicalizes duplicate and reordered required effects deterministically", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);

    const left = evaluateEngineEffectAuthorityV1(
      registry,
      request(engine, [
        "E1_LOCAL_DETERMINISTIC_PROCESS",
        "E0_READ_ONLY_ANALYSIS",
        "E1_LOCAL_DETERMINISTIC_PROCESS",
      ]),
    );
    const right = evaluateEngineEffectAuthorityV1(
      registry,
      request(engine, [
        "E0_READ_ONLY_ANALYSIS",
        "E1_LOCAL_DETERMINISTIC_PROCESS",
      ]),
    );

    expect(left).toEqual(right);
  });

  it("rejects empty, malformed, and authority-like request fields", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);
    const base = request(engine, ["E0_READ_ONLY_ANALYSIS"]);

    expect(() =>
      evaluateEngineEffectAuthorityV1(registry, {
        ...base,
        required_effect_classes: [],
      }),
    ).toThrow("required_effect_classes must contain between 1 and");

    expect(() =>
      evaluateEngineEffectAuthorityV1(registry, {
        ...base,
        required_effect_classes: ["E99_UNKNOWN"],
      } as unknown as EngineEffectAuthorityRequestV1),
    ).toThrow("required_effect_classes is invalid or unsupported");

    expect(() =>
      evaluateEngineEffectAuthorityV1(registry, {
        ...base,
        execution_authority: true,
      } as unknown as EngineEffectAuthorityRequestV1),
    ).toThrow("engine effect authority request contains missing or unknown fields");

    expect(() =>
      evaluateEngineEffectAuthorityV1(registry, {
        ...base,
        phase_authority: {
          ...base.phase_authority,
          authority_source_sha256: "not-a-digest",
        },
      }),
    ).toThrow("phase_authority.authority_source_sha256");
  });

  it("rejects policy snapshots that do not match the intent target binding", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);
    const base = request(engine, ["E0_READ_ONLY_ANALYSIS"]);

    expect(() =>
      evaluateEngineEffectAuthorityV1(registry, {
        ...base,
        intent: intent(
          "E3_ISOLATED_LOCAL_EXECUTION",
          "ASSURE",
          "policy:other",
        ),
      }),
    ).toThrow(
      "intent target policy_snapshot_id does not match policy snapshot",
    );
  });

  it("binds decisions to registry, intent, policy, and phase context", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);
    const baseRequest = request(engine, ["E0_READ_ONLY_ANALYSIS"]);
    const decision = evaluateEngineEffectAuthorityV1(registry, baseRequest);

    expect(() =>
      assertEngineEffectAuthorityDecisionContextV1(
        registry,
        baseRequest,
        decision,
      ),
    ).not.toThrow();

    const changedRegistry = createEngineRegistryV1([
      registryEntry(
        [
          "E0_READ_ONLY_ANALYSIS",
          "E1_LOCAL_DETERMINISTIC_PROCESS",
          "E2_LOCAL_WRITE_ARTIFACT_ONLY",
          "E3_ISOLATED_LOCAL_EXECUTION",
        ],
        "E0_READ_ONLY_ANALYSIS",
      ),
    ]);
    expect(() =>
      assertEngineEffectAuthorityDecisionContextV1(
        changedRegistry,
        baseRequest,
        decision,
      ),
    ).toThrow("engine effect authority decision context mismatch");

    expect(() =>
      assertEngineEffectAuthorityDecisionContextV1(
        registry,
        {
          ...baseRequest,
          intent: intent("E2_LOCAL_WRITE_ARTIFACT_ONLY"),
        },
        decision,
      ),
    ).toThrow("engine effect authority decision context mismatch");

    expect(() =>
      assertEngineEffectAuthorityDecisionContextV1(
        registry,
        {
          ...baseRequest,
          policy: policy("E2_LOCAL_WRITE_ARTIFACT_ONLY"),
        },
        decision,
      ),
    ).toThrow("engine effect authority decision context mismatch");

    expect(() =>
      assertEngineEffectAuthorityDecisionContextV1(
        registry,
        {
          ...baseRequest,
          phase_authority: phaseAuthority(
            "E3_ISOLATED_LOCAL_EXECUTION",
            F,
          ),
        },
        decision,
      ),
    ).toThrow("engine effect authority decision context mismatch");
  });

  it("requires exact registered identity before evaluating effect authority", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);
    const base = request(engine, ["E0_READ_ONLY_ANALYSIS"]);

    expect(() =>
      evaluateEngineEffectAuthorityV1(registry, {
        ...base,
        identity: {
          ...base.identity,
          configuration_identity: {
            ...base.identity.configuration_identity,
            configuration_sha256: F,
          },
        },
      }),
    ).toThrow("engine authority request identity is not registered");
  });

  it("returns deeply frozen effect-free evidence rather than an execution grant", () => {
    const engine = registryEntry();
    const registry = createEngineRegistryV1([engine]);

    const decision = evaluateEngineEffectAuthorityV1(
      registry,
      request(engine, ["E0_READ_ONLY_ANALYSIS"]),
    );

    expect(Object.isFrozen(decision)).toBe(true);
    expect(Object.isFrozen(decision.identity)).toBe(true);
    expect(Object.isFrozen(decision.identity.implementation_identity)).toBe(true);
    expect(Object.isFrozen(decision.required_effect_classes)).toBe(true);
    expect(Object.isFrozen(decision.violated_boundaries)).toBe(true);

    expect("execution_authority" in decision).toBe(false);
    expect("network_authority" in decision).toBe(false);
    expect("process_authority" in decision).toBe(false);
    expect("credential_authority" in decision).toBe(false);
    expect("intent" in decision).toBe(false);
    expect("policy" in decision).toBe(false);
    expect("phase_authority" in decision).toBe(false);
  });
});
