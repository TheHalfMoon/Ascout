import { describe, expect, it } from "vitest";
import {
  PERFORMANCE_RECOVERY_ADAPTER_SCHEMA_VERSION,
  normalizeExternalPerformanceRecoveryOutputV1,
  type ExternalPerformanceRecoveryOutputV1,
} from "../src/assurance/test/performance-recovery-adapter.js";

function makeInput(
  overrides: Partial<ExternalPerformanceRecoveryOutputV1> = {},
): ExternalPerformanceRecoveryOutputV1 {
  return {
    schema_version: PERFORMANCE_RECOVERY_ADAPTER_SCHEMA_VERSION,
    adapter_id: "performance-runner",
    kind: "performance",
    source_identity: "tree:t08",
    head_sha: "a".repeat(40),
    status: "PASS",
    suite_ref: "suites/checkout-latency.v1",
    metric_ref: "metrics/p95-latency.json",
    recovery_ref: null,
    observed_case_count: 50,
    budget_ms: 5000,
    elapsed_ms: 1200,
    omitted_classes: [],
    result_digest: "b".repeat(64),
    limitations: [],
    ...overrides,
  };
}

describe("external performance and recovery observation adapter", () => {
  it("normalizes a runner result as an untrusted observation only", () => {
    const input = makeInput();
    const output = normalizeExternalPerformanceRecoveryOutputV1(input);

    expect(output).toMatchObject({
      scope: "TEST",
      strategy: "OBSERVATION_ONLY",
      authority: "NONE_UNTRUSTED",
      canonical_status: "UNTRUSTED_OBSERVATION",
      source_status: "PASS",
      observed_case_count: 50,
      budget_ms: 5000,
      elapsed_ms: 1200,
    });
    expect(output).not.toHaveProperty("pass");
    expect(output).not.toHaveProperty("verdict");
    expect(output.blocking_reasons).toEqual([]);
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.plan_visible_fields)).toBe(true);
    expect(Object.isFrozen(output.omitted_classes)).toBe(true);
    expect(Object.isFrozen(output.limitations)).toBe(true);
  });

  it("blocks generic PASS from omitted classes and exceeded budgets", () => {
    const output = normalizeExternalPerformanceRecoveryOutputV1(
      makeInput({
        status: "PASS",
        elapsed_ms: 9000,
        omitted_classes: ["load", "accessibility"],
        limitations: ["single-run"],
      }),
    );

    expect(output.source_status).toBe("PASS");
    expect(output.canonical_status).toBe("UNTRUSTED_OBSERVATION");
    expect(output.blocking_reasons).toEqual([
      "external-runner:budget-exceeded",
      "external-runner:limitation:single-run",
      "external-runner:omitted:accessibility",
      "external-runner:omitted:load",
    ]);
  });

  it("ignores caller attempts to self-attest authority or verdict", () => {
    const output = normalizeExternalPerformanceRecoveryOutputV1({
      ...makeInput(),
      authority: "PASS",
      verdict: "PASS",
    } as unknown as ExternalPerformanceRecoveryOutputV1);

    expect(output.authority).toBe("NONE_UNTRUSTED");
    expect(output).not.toHaveProperty("verdict");
  });

  it("requires the reference each kind is measured against", () => {
    expect(() =>
      normalizeExternalPerformanceRecoveryOutputV1(
        makeInput({ kind: "performance", metric_ref: null }),
      ),
    ).toThrow("performance output requires metric_ref");
    expect(() =>
      normalizeExternalPerformanceRecoveryOutputV1(
        makeInput({
          kind: "recovery",
          metric_ref: null,
          recovery_ref: null,
        }),
      ),
    ).toThrow("recovery output requires recovery_ref");
    expect(
      normalizeExternalPerformanceRecoveryOutputV1(
        makeInput({
          kind: "recovery",
          metric_ref: null,
          recovery_ref: "recovery/db-failover.v1",
        }),
      ).recovery_ref,
    ).toBe("recovery/db-failover.v1");
  });

  it("rejects malformed identities, digests, counts, and entries", () => {
    expect(() =>
      normalizeExternalPerformanceRecoveryOutputV1(
        makeInput({ head_sha: "A".repeat(40) }),
      ),
    ).toThrow("head_sha");
    expect(() =>
      normalizeExternalPerformanceRecoveryOutputV1(
        makeInput({ result_digest: "not-a-digest" }),
      ),
    ).toThrow("result_digest");
    expect(() =>
      normalizeExternalPerformanceRecoveryOutputV1(
        makeInput({ budget_ms: -1 }),
      ),
    ).toThrow("budget_ms");
    expect(() =>
      normalizeExternalPerformanceRecoveryOutputV1(
        makeInput({ elapsed_ms: 1.5 }),
      ),
    ).toThrow("elapsed_ms");
    expect(() =>
      normalizeExternalPerformanceRecoveryOutputV1(
        makeInput({ omitted_classes: ["same", "same"] }),
      ),
    ).toThrow("unique");
    expect(() =>
      normalizeExternalPerformanceRecoveryOutputV1(
        makeInput({ kind: "unsupported" as "performance" }),
      ),
    ).toThrow("kind");
    expect(() =>
      normalizeExternalPerformanceRecoveryOutputV1(
        makeInput({ status: "CLEAN" as "PASS" }),
      ),
    ).toThrow("status");
  });

  it("is deterministic and does not mutate external input", () => {
    const input = makeInput({
      omitted_classes: ["z", "a"],
      limitations: ["m", "c"],
    });
    const before = structuredClone(input);
    const first = normalizeExternalPerformanceRecoveryOutputV1(input);
    const second = normalizeExternalPerformanceRecoveryOutputV1(input);

    expect(first).toEqual(second);
    expect(input).toEqual(before);
    expect(() => (first.omitted_classes as string[]).push("new")).toThrow();
  });
});
