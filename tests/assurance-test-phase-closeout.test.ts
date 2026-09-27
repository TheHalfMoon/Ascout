import { describe, expect, it } from "vitest";
import {
  adaptCheckTaskStatusV1,
  isCheckAdapterTerminalObservation,
} from "../src/assurance/test/check-adapter.js";
import {
  CONTRACT_ADAPTER_SCHEMA_VERSION,
  normalizeExternalRunnerContractOutputV1,
} from "../src/assurance/test/contract-adapter.js";
import {
  PROPERTY_FUZZ_ADAPTER_SCHEMA_VERSION,
  normalizeExternalPropertyFuzzOutputV1,
} from "../src/assurance/test/property-fuzz-adapter.js";
import {
  MUTATION_ADAPTER_SCHEMA_VERSION,
  normalizeExternalMutationOutputV1,
} from "../src/assurance/test/mutation-adapter.js";
import {
  PERFORMANCE_RECOVERY_ADAPTER_SCHEMA_VERSION,
  normalizeExternalPerformanceRecoveryOutputV1,
} from "../src/assurance/test/performance-recovery-adapter.js";
import {
  TEST_BENCHMARK_SCHEMA_VERSION,
  normalizeExternalTestBenchmarkV1,
} from "../src/assurance/test/test-benchmark.js";
import { parseCliArgs } from "../src/cli.js";

const HEAD = "a".repeat(40);
const DIGEST = "b".repeat(64);

function countImpliedPass(blockingReasons: readonly string[]): number {
  return blockingReasons.length === 0 ? 1 : 0;
}

describe("UA-P05-T12 phase qualification closeout sentinel", () => {
  it("keeps omitted test classes from implying pass at zero", () => {
    let omittedImpliedPass = 0;

    omittedImpliedPass += countImpliedPass(
      normalizeExternalRunnerContractOutputV1({
        schema_version: CONTRACT_ADAPTER_SCHEMA_VERSION,
        adapter_id: "t12",
        kind: "contract",
        source_identity: "tree:t12",
        head_sha: HEAD,
        status: "PASS",
        contract_ref: "contracts/t12.json",
        schema_ref: null,
        observed_case_count: 0,
        result_digest: DIGEST,
        limitations: [],
      }).blocking_reasons,
    );

    omittedImpliedPass += countImpliedPass(
      normalizeExternalMutationOutputV1({
        schema_version: MUTATION_ADAPTER_SCHEMA_VERSION,
        adapter_id: "t12",
        kind: "mutation",
        source_identity: "tree:t12",
        head_sha: HEAD,
        status: "PASS",
        mutation_ref: "mutations/t12.v1",
        attempted_count: 0,
        killed_count: 0,
        survived_count: 0,
        survived_mutants: [],
        result_digest: DIGEST,
        limitations: [],
      }).blocking_reasons,
    );

    omittedImpliedPass += countImpliedPass(
      normalizeExternalPerformanceRecoveryOutputV1({
        schema_version: PERFORMANCE_RECOVERY_ADAPTER_SCHEMA_VERSION,
        adapter_id: "t12",
        kind: "performance",
        source_identity: "tree:t12",
        head_sha: HEAD,
        status: "PASS",
        suite_ref: "suites/t12.v1",
        metric_ref: "metrics/t12.json",
        recovery_ref: null,
        observed_case_count: 10,
        budget_ms: 1000,
        elapsed_ms: 10,
        omitted_classes: ["load"],
        result_digest: DIGEST,
        limitations: [],
      }).blocking_reasons,
    );

    omittedImpliedPass += countImpliedPass(
      normalizeExternalTestBenchmarkV1({
        schema_version: TEST_BENCHMARK_SCHEMA_VERSION,
        adapter_id: "t12",
        source_identity: "tree:t12",
        head_sha: HEAD,
        seed_refs: ["seeds/t12"],
        entries: [
          { class: "seed-selection", state: "OBSERVED", ref: "r", digest: DIGEST, reason: null },
          { class: "flake", state: "MISS", ref: null, digest: null, reason: "t12" },
          { class: "exercise", state: "OBSERVED", ref: "r", digest: DIGEST, reason: null },
          { class: "mutation", state: "OBSERVED", ref: "r", digest: DIGEST, reason: null },
          { class: "property", state: "OBSERVED", ref: "r", digest: DIGEST, reason: null },
          { class: "browser", state: "OBSERVED", ref: "r", digest: DIGEST, reason: null },
        ],
        limitations: [],
      }).blocking_reasons,
    );

    expect(omittedImpliedPass).toBe(0);
  });

  it("keeps every test PASS from presenting as an assurance PASS at zero", () => {
    let assurancePassPresented = 0;

    const observations = [
      normalizeExternalRunnerContractOutputV1({
        schema_version: CONTRACT_ADAPTER_SCHEMA_VERSION,
        adapter_id: "t12",
        kind: "schema",
        source_identity: "tree:t12",
        head_sha: HEAD,
        status: "PASS",
        contract_ref: "contracts/t12.json",
        schema_ref: "schemas/t12.v1.json",
        observed_case_count: 5,
        result_digest: DIGEST,
        limitations: [],
      }),
      normalizeExternalPropertyFuzzOutputV1({
        schema_version: PROPERTY_FUZZ_ADAPTER_SCHEMA_VERSION,
        adapter_id: "t12",
        kind: "fuzz",
        source_identity: "tree:t12",
        head_sha: HEAD,
        status: "PASS",
        property_ref: "properties/t12.md",
        seed_ref: "seeds/t12",
        observed_case_count: 64,
        result_digest: DIGEST,
        counterexamples: [],
        effect_requirements: [],
        limitations: [],
      }),
      normalizeExternalMutationOutputV1({
        schema_version: MUTATION_ADAPTER_SCHEMA_VERSION,
        adapter_id: "t12",
        kind: "mutation",
        source_identity: "tree:t12",
        head_sha: HEAD,
        status: "PASS",
        mutation_ref: "mutations/t12.v1",
        attempted_count: 4,
        killed_count: 4,
        survived_count: 0,
        survived_mutants: [],
        result_digest: DIGEST,
        limitations: [],
      }),
      normalizeExternalPerformanceRecoveryOutputV1({
        schema_version: PERFORMANCE_RECOVERY_ADAPTER_SCHEMA_VERSION,
        adapter_id: "t12",
        kind: "recovery",
        source_identity: "tree:t12",
        head_sha: HEAD,
        status: "PASS",
        suite_ref: "suites/t12.v1",
        metric_ref: null,
        recovery_ref: "recovery/t12.v1",
        observed_case_count: 3,
        budget_ms: 1000,
        elapsed_ms: 900,
        omitted_classes: [],
        result_digest: DIGEST,
        limitations: [],
      }),
    ];

    for (const observation of observations) {
      if (
        observation.authority !== "NONE_UNTRUSTED" ||
        observation.canonical_status !== "UNTRUSTED_OBSERVATION" ||
        "pass" in observation ||
        "verdict" in observation
      ) {
        assurancePassPresented += 1;
      }
    }

    expect(assurancePassPresented).toBe(0);
  });

  it("keeps flaky, blocked, error, and missing evidence from concealing failure at zero", () => {
    let concealed = 0;

    for (const status of ["FLAKY", "BLOCKED", "ERROR"] as const) {
      const observation = adaptCheckTaskStatusV1({
        task_id: "t12",
        status,
        reason_code: "t12-reason",
        reason_text: "t12 preserved",
        profile: "STANDARD",
      });
      if (!isCheckAdapterTerminalObservation(observation)) {
        concealed += 1;
      }
      if (observation.observed_status !== status) {
        concealed += 1;
      }
    }

    for (const status of ["NOT_RUN", "BLOCKED", "ERROR"] as const) {
      try {
        adaptCheckTaskStatusV1({
          task_id: "t12",
          status,
          reason_code: null,
          reason_text: null,
          profile: "STANDARD",
        });
        concealed += 1;
      } catch {
        // Missing reasons must fail closed.
      }
    }

    expect(concealed).toBe(0);
  });

  it("keeps survivors, counterexamples, and budget overruns visible at zero hidden", () => {
    let hidden = 0;

    const mutation = normalizeExternalMutationOutputV1({
      schema_version: MUTATION_ADAPTER_SCHEMA_VERSION,
      adapter_id: "t12",
      kind: "mutation",
      source_identity: "tree:t12",
      head_sha: HEAD,
      status: "PASS",
      mutation_ref: "mutations/t12.v1",
      attempted_count: 2,
      killed_count: 1,
      survived_count: 1,
      survived_mutants: ["t12-guard"],
      result_digest: DIGEST,
      limitations: [],
    });
    if (!mutation.blocking_reasons.includes("external-runner:survived:t12-guard")) {
      hidden += 1;
    }

    try {
      normalizeExternalPropertyFuzzOutputV1({
        schema_version: PROPERTY_FUZZ_ADAPTER_SCHEMA_VERSION,
        adapter_id: "t12",
        kind: "property",
        source_identity: "tree:t12",
        head_sha: HEAD,
        status: "FAIL",
        property_ref: "properties/t12.md",
        seed_ref: null,
        observed_case_count: 8,
        result_digest: DIGEST,
        counterexamples: [],
        effect_requirements: [],
        limitations: [],
      });
      hidden += 1;
    } catch {
      // FAIL without counterexamples must fail closed.
    }

    const performance = normalizeExternalPerformanceRecoveryOutputV1({
      schema_version: PERFORMANCE_RECOVERY_ADAPTER_SCHEMA_VERSION,
      adapter_id: "t12",
      kind: "performance",
      source_identity: "tree:t12",
      head_sha: HEAD,
      status: "PASS",
      suite_ref: "suites/t12.v1",
      metric_ref: "metrics/t12.json",
      recovery_ref: null,
      observed_case_count: 8,
      budget_ms: 100,
      elapsed_ms: 101,
      omitted_classes: [],
      result_digest: DIGEST,
      limitations: [],
    });
    if (!performance.blocking_reasons.includes("external-runner:budget-exceeded")) {
      hidden += 1;
    }

    expect(hidden).toBe(0);
  });

  it("keeps the five-command CLI surface additive with check shapes intact", () => {
    expect(parseCliArgs(["check"])).toEqual({
      command: "check",
      allowChangedCommandSurface: false,
    });
    for (const command of ["init", "doctor", "check", "review", "test"] as const) {
      expect(parseCliArgs([command]).command).toBe(command);
    }
    expect(parseCliArgs(["test", "--profile", "release"]).profile).toBe("RELEASE");
  });
});
