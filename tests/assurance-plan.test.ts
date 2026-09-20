import { describe, expect, it } from "vitest";

import {
  assertAssurancePlanBindingsV1,
  createAssurancePlanV1,
  parseAssurancePlanV1,
} from "../src/assurance/contracts/plan.js";
import { createAssuranceIntentV1 } from "../src/assurance/contracts/intent.js";
import {
  createAssurancePolicySnapshotV1,
  type AssurancePolicySnapshotInputV1,
} from "../src/assurance/contracts/policy.js";
import { createAssuranceTargetV1 } from "../src/assurance/contracts/target.js";
import type { SourceStateV1 } from "../src/receipt/model.js";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const D = "d".repeat(64);
const E = "e".repeat(64);
const HEAD = "b".repeat(40);
const BASE = "c".repeat(40);

function source(treeDigest = D): SourceStateV1 {
  return {
    repository_id: "remote:" + A,
    repository_id_kind: "remote",
    portable: true,
    head_sha: HEAD,
    detached: false,
    shallow: false,
    tree_digest_version: 1,
    tree_digest: treeDigest,
    tracked_index_entry_count: 14,
    unstaged_changed_count: 1,
    included_untracked_count: 0,
  };
}

function target(policySnapshotId = "policy:canonical-v1") {
  return createAssuranceTargetV1({
    target_id: "target:ua-p01-t04",
    source_start_identity: source(),
    base_revision: BASE,
    change_set_identity: "changeset:working-tree-v1",
    worktree_generation: "generation:9",
    policy_snapshot_id: policySnapshotId,
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P01-T04",
      acceptance_id: "acceptance:assurance-plan-v1",
    },
    environment_identity: null,
    graph_index_generation: null,
    build_artifact_identity: null,
  });
}

function intent(
  maximumEffectClass = "E3_ISOLATED_LOCAL_EXECUTION" as const,
  policySnapshotId = "policy:canonical-v1",
) {
  return createAssuranceIntentV1({
    intent_id: "intent:ua-p01-t04",
    requested_claim: "RELEASE_READY",
    profile: "RELEASE",
    scope: "ASSURE",
    include: ["path:src/**"],
    exclude: ["path:docs/**"],
    maximum_effect_class: maximumEffectClass,
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
    target: target(policySnapshotId),
    surface_provenance: {
      surface_kind: "CI",
      surface_request_id: "request:t04",
    },
  });
}

function policyInput(
  assureCeiling = "E2_LOCAL_WRITE_ARTIFACT_ONLY" as const,
): AssurancePolicySnapshotInputV1 {
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
      { scope: "ASSURE", maximum_effect_class: assureCeiling },
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

function policy(
  assureCeiling = "E2_LOCAL_WRITE_ARTIFACT_ONLY" as const,
) {
  return createAssurancePolicySnapshotV1(policyInput(assureCeiling));
}

function generationEvidence() {
  return {
    planner_id: "planner:ascout-v1",
    planner_version: "0.1.0",
    planner_configuration_sha256: E,
    decision_evidence_refs: [
      "evidence:policy",
      "evidence:target",
      "evidence:policy",
    ],
  };
}

function planInput() {
  return {
    plan_id: "plan:ua-p01-t04",
    intent: intent(),
    policy: policy(),
    selected_check_classes: [
      "security:minimum",
      "check:typecheck",
      "check:test",
      "check:typecheck",
    ],
    selected_engine_identities: [
      "engine:ascout-native",
      "engine:review-candidate",
      "engine:ascout-native",
    ],
    selected_runtime_requirements: ["runtime:node24", "runtime:node22"],
    required_effect_classes: [
      "E1_LOCAL_DETERMINISTIC_PROCESS",
      "E0_READ_ONLY_ANALYSIS",
      "E1_LOCAL_DETERMINISTIC_PROCESS",
    ],
    expected_evidence_types: [
      "evidence:test-result",
      "evidence:coverage",
      "evidence:test-result",
    ],
    omitted_checks: [
      {
        check_class: "check:optional-lint",
        reason: "No matching language files in the bound target.",
      },
    ],
    plan_generation_evidence: generationEvidence(),
  } as const;
}
describe("UA-P01-T04 AssurancePlan", () => {
  it("constructs a canonical inspectable plan from exact intent and policy", () => {
    const plan = createAssurancePlanV1(planInput());

    expect(plan.schema_version).toBe(1);
    expect(plan.intent_id).toBe("intent:ua-p01-t04");
    expect(plan.target_id).toBe("target:ua-p01-t04");
    expect(plan.policy_id).toBe("policy:canonical-v1");
    expect(plan.requested_claim).toBe("RELEASE_READY");
    expect(plan.selected_check_classes).toEqual([
      "check:test",
      "check:typecheck",
      "security:minimum",
    ]);
    expect(plan.selected_engine_identities).toEqual([
      "engine:ascout-native",
      "engine:review-candidate",
    ]);
    expect(plan.selected_runtime_requirements).toEqual([
      "runtime:node22",
      "runtime:node24",
    ]);
    expect(plan.required_effect_classes).toEqual([
      "E0_READ_ONLY_ANALYSIS",
      "E1_LOCAL_DETERMINISTIC_PROCESS",
    ]);
    expect(plan.expected_evidence_types).toEqual([
      "evidence:coverage",
      "evidence:test-result",
    ]);
    expect(plan.plan_generation_evidence.decision_evidence_refs).toEqual([
      "evidence:policy",
      "evidence:target",
    ]);
  });

  it("round-trips strict persisted plan and exact bindings", () => {
    const plan = createAssurancePlanV1(planInput());
    expect(parseAssurancePlanV1(structuredClone(plan))).toEqual(plan);
    expect(() =>
      assertAssurancePlanBindingsV1(plan, intent(), policy()),
    ).not.toThrow();
  });

  it("requires every policy minimum mandatory check to be selected", () => {
    expect(() =>
      createAssurancePlanV1({
        ...planInput(),
        selected_check_classes: ["check:test", "security:minimum"],
      }),
    ).toThrow("plan must select every minimum mandatory check: check:typecheck");
  });

  it("rejects selected and omitted check overlap", () => {
    expect(() =>
      createAssurancePlanV1({
        ...planInput(),
        omitted_checks: [
          {
            check_class: "check:test",
            reason: "Attempted omission.",
          },
        ],
      }),
    ).toThrow("selected and omitted checks overlap: check:test");
  });

  it("requires non-empty bounded omission reasons", () => {
    expect(() =>
      createAssurancePlanV1({
        ...planInput(),
        omitted_checks: [{ check_class: "check:optional", reason: "" }],
      }),
    ).toThrow("omitted_check.reason");

    expect(() =>
      createAssurancePlanV1({
        ...planInput(),
        omitted_checks: [
          {
            check_class: "check:optional",
            reason: "line one\nline two",
          },
        ],
      }),
    ).toThrow("omitted_check.reason");
  });

  it("rejects an effect above the policy ceiling", () => {
    expect(() =>
      createAssurancePlanV1({
        ...planInput(),
        required_effect_classes: ["E3_ISOLATED_LOCAL_EXECUTION"],
      }),
    ).toThrow(
      "required effect exceeds policy ceiling: E3_ISOLATED_LOCAL_EXECUTION",
    );
  });

  it("rejects an effect above the intent maximum", () => {
    expect(() =>
      createAssurancePlanV1({
        ...planInput(),
        intent: intent("E1_LOCAL_DETERMINISTIC_PROCESS"),
        policy: policy("E3_ISOLATED_LOCAL_EXECUTION"),
        required_effect_classes: ["E2_LOCAL_WRITE_ARTIFACT_ONLY"],
      }),
    ).toThrow(
      "required effect exceeds intent maximum: E2_LOCAL_WRITE_ARTIFACT_ONLY",
    );
  });

  it("rejects intent target bound to a different policy id", () => {
    const badIntent = intent(
      "E3_ISOLATED_LOCAL_EXECUTION",
      "policy:other",
    );

    expect(() =>
      createAssurancePlanV1({
        ...planInput(),
        intent: badIntent,
      }),
    ).toThrow(
      "intent target policy_snapshot_id does not match policy snapshot",
    );
  });

  it("does not treat selected engines or runtimes as qualification or authority", () => {
    const plan = createAssurancePlanV1(planInput());

    expect(plan.selected_engine_identities).toContain("engine:review-candidate");
    expect(plan.selected_runtime_requirements).toContain("runtime:node24");
    expect("engine_qualification" in plan).toBe(false);
    expect("execution_authority" in plan).toBe(false);
    expect("network_authority" in plan).toBe(false);
    expect("write_authority" in plan).toBe(false);
  });

  it("rejects authority-like unknown fields", () => {
    const plan = createAssurancePlanV1(planInput());
    expect(() =>
      parseAssurancePlanV1({
        ...plan,
        execution_authority: true,
      }),
    ).toThrow("assurance plan contains missing or unknown fields");
  });
  it("rejects budget widening or change against the intent binding", () => {
    const plan = createAssurancePlanV1(planInput());
    const widened = {
      ...plan,
      budget_envelope: {
        ...plan.budget_envelope,
        max_network_requests: 10,
      },
    };

    expect(() =>
      assertAssurancePlanBindingsV1(widened, intent(), policy()),
    ).toThrow("plan budget_envelope widens or changes AssuranceIntent");
  });

  it("rejects qualification or independence weakening", () => {
    const plan = createAssurancePlanV1(planInput());
    const weakened = {
      ...plan,
      qualification_requirements: {
        ...plan.qualification_requirements,
        engine_qualification_requirements: {
          ...plan.qualification_requirements.engine_qualification_requirements,
          require_exact_configuration_identity: false,
        },
      },
    };

    expect(() =>
      assertAssurancePlanBindingsV1(weakened, intent(), policy()),
    ).toThrow(
      "plan qualification_requirements weaken or change policy",
    );
  });

  it("rejects freshness weakening", () => {
    const plan = createAssurancePlanV1(planInput());
    const weakened = {
      ...plan,
      staleness_policy: {
        ...plan.staleness_policy,
        invalidate_on_source_drift: false,
      },
    };

    expect(() =>
      assertAssurancePlanBindingsV1(weakened, intent(), policy()),
    ).toThrow("plan staleness_policy weakens or changes policy");
  });

  it("rejects wrong upstream identities and policy digest", () => {
    const plan = createAssurancePlanV1(planInput());

    expect(() =>
      assertAssurancePlanBindingsV1(
        { ...plan, intent_id: "intent:other" },
        intent(),
        policy(),
      ),
    ).toThrow("plan intent_id does not match AssuranceIntent");

    expect(() =>
      assertAssurancePlanBindingsV1(
        { ...plan, target_id: "target:other" },
        intent(),
        policy(),
      ),
    ).toThrow("plan target_id does not match AssuranceIntent target");

    expect(() =>
      assertAssurancePlanBindingsV1(
        { ...plan, policy_digest: "f".repeat(64) },
        intent(),
        policy(),
      ),
    ).toThrow(
      "plan policy_digest does not match AssurancePolicySnapshot",
    );
  });

  it("rejects requested claim drift from the intent", () => {
    const plan = createAssurancePlanV1(planInput());

    expect(() =>
      assertAssurancePlanBindingsV1(
        { ...plan, requested_claim: "CHANGE_VERIFIED" },
        intent(),
        policy(),
      ),
    ).toThrow("plan requested_claim does not match AssuranceIntent");
  });

  it("rejects malformed or noncanonical required effects", () => {
    const plan = createAssurancePlanV1(planInput());

    expect(() =>
      parseAssurancePlanV1({
        ...plan,
        required_effect_classes: [
          "E1_LOCAL_DETERMINISTIC_PROCESS",
          "E0_READ_ONLY_ANALYSIS",
        ],
      }),
    ).toThrow(
      "required_effect_classes must be unique and canonically ordered",
    );

    expect(() =>
      parseAssurancePlanV1({
        ...plan,
        required_effect_classes: ["E8_UNBOUNDED"],
      }),
    ).toThrow("required_effect_classes contains invalid effect class");
  });

  it("rejects noncanonical persisted selections and omissions", () => {
    const plan = createAssurancePlanV1(planInput());

    expect(() =>
      parseAssurancePlanV1({
        ...plan,
        selected_engine_identities: [
          "engine:review-candidate",
          "engine:ascout-native",
        ],
      }),
    ).toThrow(
      "selected_engine_identities must be unique and canonically sorted",
    );

    expect(() =>
      parseAssurancePlanV1({
        ...plan,
        omitted_checks: [
          {
            check_class: "check:z",
            reason: "Not selected.",
          },
          {
            check_class: "check:a",
            reason: "Not selected.",
          },
        ],
      }),
    ).toThrow("omitted_checks must be unique and canonically sorted");
  });

  it("rejects malformed plan generation evidence", () => {
    const plan = createAssurancePlanV1(planInput());

    expect(() =>
      parseAssurancePlanV1({
        ...plan,
        plan_generation_evidence: {
          ...plan.plan_generation_evidence,
          planner_configuration_sha256: "not-a-digest",
        },
      }),
    ).toThrow(
      "plan_generation_evidence.planner_configuration_sha256 must be lowercase sha256",
    );
  });

  it("requires persisted requested claims to preserve T02 semantics", () => {
    const plan = createAssurancePlanV1(planInput());
    expect(() =>
      parseAssurancePlanV1({
        ...plan,
        requested_claim: "release ready",
      }),
    ).toThrow(
      "requested_claim must be an uppercase bounded claim identifier",
    );
  });

  it("rejects raw path material in engine/runtime/evidence identity lists", () => {
    expect(() =>
      createAssurancePlanV1({
        ...planInput(),
        selected_engine_identities: ["/private/engine"],
      }),
    ).toThrow("selected_engine_identities[0]");

    expect(() =>
      createAssurancePlanV1({
        ...planInput(),
        selected_runtime_requirements: ["C:\\private\\runtime"],
      }),
    ).toThrow("selected_runtime_requirements[0]");
  });

  it("keeps policy effects and selected checks visible without granting them", () => {
    const plan = createAssurancePlanV1({
      ...planInput(),
      required_effect_classes: ["E2_LOCAL_WRITE_ARTIFACT_ONLY"],
    });

    expect(plan.required_effect_classes).toEqual([
      "E2_LOCAL_WRITE_ARTIFACT_ONLY",
    ]);
    expect("effect_authority" in plan).toBe(false);
    expect("run_command" in plan).toBe(false);
    expect("credential_ref" in plan).toBe(false);
  });
});
