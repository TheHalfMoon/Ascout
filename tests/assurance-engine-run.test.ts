import { describe, expect, it } from "vitest";

import {
  assertEngineRunBindingsV1,
  createEngineRunV1,
  parseEngineRunV1,
} from "../src/assurance/contracts/engine-run.js";
import { createEngineDescriptorV1 } from "../src/assurance/contracts/engine-descriptor.js";
import { createEngineQualificationV1 } from "../src/assurance/contracts/engine-qualification.js";
import { createAssuranceIntentV1 } from "../src/assurance/contracts/intent.js";
import { createAssurancePlanV1 } from "../src/assurance/contracts/plan.js";
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
    tracked_index_entry_count: 14,
    unstaged_changed_count: 1,
    included_untracked_count: 0,
  };
}

function target() {
  return createAssuranceTargetV1({
    target_id: "target:ua-p01-t07",
    source_start_identity: source(),
    base_revision: BASE,
    change_set_identity: "changeset:ua-p01-t07",
    worktree_generation: "generation:7",
    policy_snapshot_id: "policy:canonical-v1",
    acceptance_identity: {
      spec_id: "spec:017",
      task_id: "UA-P01-T07",
      acceptance_id: "acceptance:engine-run-v1",
    },
    environment_identity: null,
    graph_index_generation: null,
    build_artifact_identity: null,
  });
}

function intent() {
  return createAssuranceIntentV1({
    intent_id: "intent:ua-p01-t07",
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
      surface_request_id: "request:t07",
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

function plan() {
  return createAssurancePlanV1({
    plan_id: "plan:ua-p01-t07",
    intent: intent(),
    policy: policy(),
    selected_check_classes: [
      "check:test",
      "check:typecheck",
      "security:minimum",
    ],
    selected_engine_identities: [
      "engine:ascout-native",
      "engine:review-candidate",
    ],
    selected_runtime_requirements: ["runtime:node22", "runtime:node24"],
    required_effect_classes: [
      "E0_READ_ONLY_ANALYSIS",
      "E1_LOCAL_DETERMINISTIC_PROCESS",
    ],
    expected_evidence_types: ["evidence:coverage", "evidence:test-result"],
    omitted_checks: [
      {
        check_class: "check:optional-lint",
        reason: "No matching language files in the bound target.",
      },
    ],
    plan_generation_evidence: {
      planner_id: "planner:ascout-v1",
      planner_version: "0.1.0",
      planner_configuration_sha256: E,
      decision_evidence_refs: ["evidence:policy", "evidence:target"],
    },
  });
}

function descriptor(version = "0.1.0") {
  return createEngineDescriptorV1({
    engine_id: "engine:ascout-native",
    engine_kind: "INTERNAL",
    implementation_identity: {
      implementation_id: "implementation:ascout-native",
      source_identity: "source:ascout-main",
      version,
      artifact_sha256: A,
    },
    capabilities: ["capability:review", "capability:test"],
    supported_inputs: ["input:assurance-target", "input:source-tree"],
    supported_outputs: ["output:evidence", "output:finding"],
    effect_classes: [
      "E0_READ_ONLY_ANALYSIS",
      "E1_LOCAL_DETERMINISTIC_PROCESS",
    ],
    requirements: {
      process_required: true,
      network_required: false,
      provider_requirements: [],
      sandbox_required: false,
    },
    configuration_trust_boundary: {
      trusted_configuration_sources: ["config:canonical-policy"],
      advisory_configuration_sources: ["config:repository-advisory"],
    },
    license_provenance_state: {
      license_identity: "license:apache-2.0",
      provenance_ref: "provenance:ascout-owned",
      admission_state: "ADMITTED",
    },
    qualification_evidence_refs: ["evidence:qualification-history"],
    known_limitations: ["No external network execution is described."],
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

function qualification(version = "0.1.0") {
  return createEngineQualificationV1({
    qualification_id: "qualification:ascout-native-v1",
    engine_id: "engine:ascout-native",
    implementation_identity: descriptor(version).implementation_identity,
    configuration_identity: configuration(),
    profile_identities: ["profile:release", "profile:standard"],
    benchmark_corpus_identity: {
      benchmark_id: "benchmark:engine-v1",
      corpus_id: "corpus:owned-v1",
      corpus_sha256: D,
    },
    platform_identity: platform(),
    evidence_refs: [
      {
        evidence_ref: "evidence:qualification-a",
        provider_self_description: false,
      },
    ],
    result: "QUALIFIED",
    qualified_at_epoch_ms: 1_000,
    expires_at_epoch_ms: 10_000,
  });
}

function runInput() {
  return {
    run_id: "run:ua-p01-t07:1",
    plan_id: "plan:ua-p01-t07",
    target_id: "target:ua-p01-t07",
    engine_id: "engine:ascout-native",
    qualification_id: "qualification:ascout-native-v1",
    configuration_identity: configuration(),
    command_identity: {
      command_id: "command:ascout-check-v1",
      command_sha256: E,
    },
    runtime_identity: {
      runtime_id: "runtime:node24-linux-x64",
      runtime_sha256: F,
      platform_identity: platform(),
    },
    started_at_epoch_ms: 2_000,
    ended_at_epoch_ms: 2_500,
    exit_class: "EXIT_ZERO",
    result_class: "PASS",
    input_context_manifest: {
      manifest_id: "manifest:ua-p01-t07",
      input_refs: ["input:target", "input:plan", "input:target"],
      context_refs: ["context:policy", "context:qualification"],
    },
    output_artifact_refs: ["artifact:z", "artifact:stdout", "artifact:a"],
    retained_stream_artifact_refs: {
      stdout_artifact_ref: "artifact:stdout",
      stderr_artifact_ref: null,
    },
    finding_refs: ["finding:b", "finding:a"],
    coverage_refs: ["coverage:b", "coverage:a"],
    coverage_limitations: [
      "Generated files were outside the selected coverage scope.",
      "No remote runtime coverage was requested.",
    ],
    omissions: [
      "Optional telemetry was not requested.",
      "No remote provider context was available.",
    ],
    limitations: [
      "This record does not grant retry authority.",
      "This record does not grant execution authority.",
    ],
    retry_recovery_lineage: {
      attempt_number: 1,
      retry_of_run_id: null,
      recovery_of_run_id: null,
    },
  } as const;
}

describe("UA-P01-T07 EngineRun", () => {
  it("constructs canonical immutable run occurrence data", () => {
    const run = createEngineRunV1(runInput());

    expect(run.schema_version).toBe(1);
    expect(run.input_context_manifest.input_refs).toEqual([
      "input:plan",
      "input:target",
    ]);
    expect(run.command_identity).toEqual({
      command_id: "command:ascout-check-v1",
      command_sha256: E,
    });
    expect(run.output_artifact_refs).toEqual([
      "artifact:a",
      "artifact:stdout",
      "artifact:z",
    ]);
    expect(run.retained_stream_artifact_refs).toEqual({
      stdout_artifact_ref: "artifact:stdout",
      stderr_artifact_ref: null,
    });
    expect(run.finding_refs).toEqual(["finding:a", "finding:b"]);
    expect(run.coverage_refs).toEqual(["coverage:a", "coverage:b"]);
    expect(run.coverage_limitations).toEqual([
      "Generated files were outside the selected coverage scope.",
      "No remote runtime coverage was requested.",
    ]);
    expect(run.omissions).toEqual([
      "No remote provider context was available.",
      "Optional telemetry was not requested.",
    ]);
    expect(run.limitations).toEqual([
      "This record does not grant execution authority.",
      "This record does not grant retry authority.",
    ]);
  });

  it("round-trips strict persisted data and binds exact predecessors", () => {
    const run = createEngineRunV1(runInput());

    expect(parseEngineRunV1(structuredClone(run))).toEqual(run);
    expect(() =>
      assertEngineRunBindingsV1(
        run,
        plan(),
        target(),
        descriptor(),
        qualification(),
      ),
    ).not.toThrow();
  });

  it("rejects end time before start time", () => {
    expect(() =>
      createEngineRunV1({
        ...runInput(),
        ended_at_epoch_ms: 1_999,
      }),
    ).toThrow(
      "ended_at_epoch_ms must be greater than or equal to started_at_epoch_ms",
    );
  });

  it("allows an explicit zero-duration occurrence", () => {
    const run = createEngineRunV1({
      ...runInput(),
      ended_at_epoch_ms: runInput().started_at_epoch_ms,
    });
    expect(run.ended_at_epoch_ms).toBe(run.started_at_epoch_ms);
  });

  it("rejects malformed exit and result classes", () => {
    expect(() =>
      createEngineRunV1({
        ...runInput(),
        exit_class: "exit zero",
      }),
    ).toThrow("exit_class must be an uppercase bounded state identifier");

    expect(() =>
      createEngineRunV1({
        ...runInput(),
        result_class: "pass",
      }),
    ).toThrow("result_class must be an uppercase bounded state identifier");
  });

  it("rejects wrong plan identity", () => {
    const run = createEngineRunV1({
      ...runInput(),
      plan_id: "plan:other",
    });

    expect(() =>
      assertEngineRunBindingsV1(
        run,
        plan(),
        target(),
        descriptor(),
        qualification(),
      ),
    ).toThrow("engine run plan_id does not match AssurancePlan");
  });

  it("rejects wrong target identity", () => {
    const run = createEngineRunV1({
      ...runInput(),
      target_id: "target:other",
    });

    expect(() =>
      assertEngineRunBindingsV1(
        run,
        plan(),
        target(),
        descriptor(),
        qualification(),
      ),
    ).toThrow("engine run target_id does not match AssuranceTarget");
  });

  it("rejects wrong engine identity", () => {
    const run = createEngineRunV1({
      ...runInput(),
      engine_id: "engine:other",
    });

    expect(() =>
      assertEngineRunBindingsV1(
        run,
        plan(),
        target(),
        descriptor(),
        qualification(),
      ),
    ).toThrow("engine run engine_id does not match EngineDescriptor");
  });

  it("rejects wrong qualification identity", () => {
    const run = createEngineRunV1({
      ...runInput(),
      qualification_id: "qualification:other",
    });

    expect(() =>
      assertEngineRunBindingsV1(
        run,
        plan(),
        target(),
        descriptor(),
        qualification(),
      ),
    ).toThrow(
      "engine run qualification_id does not match EngineQualification",
    );
  });

  it("rejects configuration drift from the qualification", () => {
    const run = createEngineRunV1({
      ...runInput(),
      configuration_identity: {
        configuration_id: "configuration:release-v2",
        configuration_sha256: E,
      },
    });

    expect(() =>
      assertEngineRunBindingsV1(
        run,
        plan(),
        target(),
        descriptor(),
        qualification(),
      ),
    ).toThrow(
      "engine run configuration identity does not match EngineQualification",
    );
  });

  it("rejects platform drift from the qualification", () => {
    const run = createEngineRunV1({
      ...runInput(),
      runtime_identity: {
        ...runInput().runtime_identity,
        platform_identity: {
          platform_id: "platform:windows-x64-node24",
          platform_sha256: E,
        },
      },
    });

    expect(() =>
      assertEngineRunBindingsV1(
        run,
        plan(),
        target(),
        descriptor(),
        qualification(),
      ),
    ).toThrow(
      "engine run platform identity does not match EngineQualification",
    );
  });

  it("rejects qualification implementation drift from the descriptor", () => {
    const run = createEngineRunV1(runInput());

    expect(() =>
      assertEngineRunBindingsV1(
        run,
        plan(),
        target(),
        descriptor(),
        qualification("0.2.0"),
      ),
    ).toThrow(
      "EngineQualification implementation identity does not match EngineDescriptor",
    );
  });

  it("requires first attempt to have no retry or recovery parent", () => {
    expect(() =>
      createEngineRunV1({
        ...runInput(),
        retry_recovery_lineage: {
          attempt_number: 1,
          retry_of_run_id: "run:previous",
          recovery_of_run_id: null,
        },
      }),
    ).toThrow(
      "first engine run attempt cannot declare retry or recovery lineage",
    );
  });

  it("requires later attempts to identify exactly one predecessor relation", () => {
    expect(() =>
      createEngineRunV1({
        ...runInput(),
        run_id: "run:ua-p01-t07:2",
        retry_recovery_lineage: {
          attempt_number: 2,
          retry_of_run_id: null,
          recovery_of_run_id: null,
        },
      }),
    ).toThrow(
      "later engine run attempt must declare exactly one retry or recovery predecessor",
    );

    expect(() =>
      createEngineRunV1({
        ...runInput(),
        run_id: "run:ua-p01-t07:2",
        retry_recovery_lineage: {
          attempt_number: 2,
          retry_of_run_id: "run:previous",
          recovery_of_run_id: "run:failed",
        },
      }),
    ).toThrow(
      "later engine run attempt must declare exactly one retry or recovery predecessor",
    );
  });

  it("accepts explicit retry and recovery lineage as data only", () => {
    const retry = createEngineRunV1({
      ...runInput(),
      run_id: "run:ua-p01-t07:2",
      retry_recovery_lineage: {
        attempt_number: 2,
        retry_of_run_id: "run:ua-p01-t07:1",
        recovery_of_run_id: null,
      },
    });
    const recovery = createEngineRunV1({
      ...runInput(),
      run_id: "run:ua-p01-t07:3",
      retry_recovery_lineage: {
        attempt_number: 3,
        retry_of_run_id: null,
        recovery_of_run_id: "run:ua-p01-t07:2",
      },
    });

    expect(retry.retry_recovery_lineage.retry_of_run_id).toBe(
      "run:ua-p01-t07:1",
    );
    expect(recovery.retry_recovery_lineage.recovery_of_run_id).toBe(
      "run:ua-p01-t07:2",
    );
    expect("retry_authority" in retry).toBe(false);
    expect("recovery_authority" in recovery).toBe(false);
  });

  it("requires persisted refs and manifest refs to remain canonical", () => {
    const run = createEngineRunV1(runInput());

    expect(() =>
      parseEngineRunV1({
        ...run,
        finding_refs: ["finding:b", "finding:a"],
      }),
    ).toThrow("finding_refs must be unique and canonically sorted");

    expect(() =>
      parseEngineRunV1({
        ...run,
        input_context_manifest: {
          ...run.input_context_manifest,
          input_refs: ["input:target", "input:plan"],
        },
      }),
    ).toThrow(
      "input_context_manifest.input_refs must be unique and canonically sorted",
    );
  });

  it("requires persisted omissions and limitations to remain canonical", () => {
    const run = createEngineRunV1(runInput());

    expect(() =>
      parseEngineRunV1({
        ...run,
        omissions: [...run.omissions].reverse(),
      }),
    ).toThrow("omissions must be unique and canonically sorted");

    expect(() =>
      parseEngineRunV1({
        ...run,
        limitations: [...run.limitations].reverse(),
      }),
    ).toThrow("limitations must be unique and canonically sorted");
  });

  it("rejects multiline or empty run-local explanatory text", () => {
    expect(() =>
      createEngineRunV1({
        ...runInput(),
        omissions: [""],
      }),
    ).toThrow("omissions[0] must be bounded non-empty single-line text");

    expect(() =>
      createEngineRunV1({
        ...runInput(),
        limitations: ["line one\nline two"],
      }),
    ).toThrow("limitations[0] must be bounded non-empty single-line text");
  });

  it("rejects raw path material in persisted runtime and artifact identities", () => {
    expect(() =>
      createEngineRunV1({
        ...runInput(),
        runtime_identity: {
          ...runInput().runtime_identity,
          runtime_id: "C:\\private\\runtime",
        },
      }),
    ).toThrow("runtime_identity.runtime_id");

    expect(() =>
      createEngineRunV1({
        ...runInput(),
        output_artifact_refs: ["/private/artifact"],
      }),
    ).toThrow("output_artifact_refs[0]");
  });

  it("requires exact bounded command identity without executing it", () => {
    expect(() =>
      createEngineRunV1({
        ...runInput(),
        command_identity: {
          command_id: "/private/bin/ascout",
          command_sha256: E,
        },
      }),
    ).toThrow("command_identity.command_id");

    expect(() =>
      createEngineRunV1({
        ...runInput(),
        command_identity: {
          command_id: "command:ascout-check-v1",
          command_sha256: "not-a-digest",
        },
      }),
    ).toThrow("command_identity.command_sha256 must be lowercase sha256");
  });

  it("requires retained stdout/stderr refs to resolve in output artifacts", () => {
    expect(() =>
      createEngineRunV1({
        ...runInput(),
        retained_stream_artifact_refs: {
          stdout_artifact_ref: "artifact:missing",
          stderr_artifact_ref: null,
        },
      }),
    ).toThrow(
      "retained_stream_artifact_refs.stdout_artifact_ref must resolve in output_artifact_refs",
    );

    expect(() =>
      createEngineRunV1({
        ...runInput(),
        retained_stream_artifact_refs: {
          stdout_artifact_ref: null,
          stderr_artifact_ref: "artifact:missing",
        },
      }),
    ).toThrow(
      "retained_stream_artifact_refs.stderr_artifact_ref must resolve in output_artifact_refs",
    );
  });

  it("keeps coverage limitations explicit, bounded, and canonical", () => {
    const run = createEngineRunV1(runInput());

    expect(() =>
      parseEngineRunV1({
        ...run,
        coverage_limitations: [...run.coverage_limitations].reverse(),
      }),
    ).toThrow("coverage_limitations must be unique and canonically sorted");

    expect(() =>
      createEngineRunV1({
        ...runInput(),
        coverage_limitations: ["line one\nline two"],
      }),
    ).toThrow(
      "coverage_limitations[0] must be bounded non-empty single-line text",
    );
  });

  it("rejects malformed runtime and platform digests", () => {
    expect(() =>
      createEngineRunV1({
        ...runInput(),
        runtime_identity: {
          ...runInput().runtime_identity,
          runtime_sha256: "not-a-digest",
        },
      }),
    ).toThrow("runtime_identity.runtime_sha256 must be lowercase sha256");

    expect(() =>
      createEngineRunV1({
        ...runInput(),
        runtime_identity: {
          ...runInput().runtime_identity,
          platform_identity: {
            ...runInput().runtime_identity.platform_identity,
            platform_sha256: "not-a-digest",
          },
        },
      }),
    ).toThrow(
      "runtime_identity.platform_identity.platform_sha256 must be lowercase sha256",
    );
  });

  it("rejects unknown authority-like fields", () => {
    const run = createEngineRunV1(runInput());

    expect(() =>
      parseEngineRunV1({
        ...run,
        execution_authority: true,
      }),
    ).toThrow("engine run contains missing or unknown fields");

    expect("execution_authority" in run).toBe(false);
    expect("network_authority" in run).toBe(false);
    expect("provider_authority" in run).toBe(false);
    expect("credential_authority" in run).toBe(false);
    expect("retry_authority" in run).toBe(false);
    expect("command_authority" in run).toBe(false);
    expect("artifact_read_authority" in run).toBe(false);
  });

  it("uses only explicit caller-supplied timing data", () => {
    const run = createEngineRunV1({
      ...runInput(),
      started_at_epoch_ms: 0,
      ended_at_epoch_ms: 0,
    });

    expect(run.started_at_epoch_ms).toBe(0);
    expect(run.ended_at_epoch_ms).toBe(0);
  });
});
