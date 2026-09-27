import { describe, expect, it } from "vitest";
import {
  PROPERTY_FUZZ_ADAPTER_SCHEMA_VERSION,
  normalizeExternalPropertyFuzzOutputV1,
  type ExternalPropertyFuzzOutputV1,
} from "../src/assurance/test/property-fuzz-adapter.js";

function makeInput(
  overrides: Partial<ExternalPropertyFuzzOutputV1> = {},
): ExternalPropertyFuzzOutputV1 {
  return {
    schema_version: PROPERTY_FUZZ_ADAPTER_SCHEMA_VERSION,
    adapter_id: "property-runner",
    kind: "property",
    source_identity: "tree:t06",
    head_sha: "a".repeat(40),
    status: "PASS",
    property_ref: "properties/no-double-spend.md",
    seed_ref: null,
    observed_case_count: 256,
    result_digest: "b".repeat(64),
    counterexamples: [],
    effect_requirements: ["effect:ledger-append"],
    limitations: [],
    ...overrides,
  };
}

describe("external property and fuzz observation adapter", () => {
  it("normalizes a runner result as an untrusted observation only", () => {
    const input = makeInput();
    const output = normalizeExternalPropertyFuzzOutputV1(input);

    expect(output).toMatchObject({
      scope: "TEST",
      strategy: "OBSERVATION_ONLY",
      authority: "NONE_UNTRUSTED",
      canonical_status: "UNTRUSTED_OBSERVATION",
      source_status: "PASS",
      observed_case_count: 256,
      effect_requirements: ["effect:ledger-append"],
    });
    expect(output).not.toHaveProperty("pass");
    expect(output).not.toHaveProperty("verdict");
    expect(output.blocking_reasons).toEqual([]);
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.plan_visible_fields)).toBe(true);
    expect(Object.isFrozen(output.counterexamples)).toBe(true);
    expect(Object.isFrozen(output.effect_requirements)).toBe(true);
    expect(Object.isFrozen(output.limitations)).toBe(true);
  });

  it("preserves failure, counterexamples, and limitations without promotion", () => {
    const output = normalizeExternalPropertyFuzzOutputV1(
      makeInput({
        kind: "fuzz",
        seed_ref: "seeds/corpus.v1",
        status: "FAIL",
        observed_case_count: 0,
        counterexamples: ["zeta-input", "alpha-input"],
        limitations: ["time-boxed"],
      }),
    );

    expect(output.source_status).toBe("FAIL");
    expect(output.counterexamples).toEqual(["alpha-input", "zeta-input"]);
    expect(output.blocking_reasons).toEqual([
      "external-runner:counterexample:alpha-input",
      "external-runner:counterexample:zeta-input",
      "external-runner:fail",
      "external-runner:limitation:time-boxed",
      "external-runner:no-cases",
    ]);
  });

  it("ignores caller attempts to self-attest authority or verdict", () => {
    const output = normalizeExternalPropertyFuzzOutputV1({
      ...makeInput(),
      authority: "PASS",
      verdict: "PASS",
    } as unknown as ExternalPropertyFuzzOutputV1);

    expect(output.authority).toBe("NONE_UNTRUSTED");
    expect(output).not.toHaveProperty("verdict");
  });

  it("requires seed and counterexample evidence where the contract demands it", () => {
    expect(() =>
      normalizeExternalPropertyFuzzOutputV1(
        makeInput({ kind: "fuzz", seed_ref: null }),
      ),
    ).toThrow("fuzz output requires seed_ref");
    expect(
      normalizeExternalPropertyFuzzOutputV1(
        makeInput({ kind: "fuzz", seed_ref: "seeds/corpus.v1" }),
      ).seed_ref,
    ).toBe("seeds/corpus.v1");
    expect(() =>
      normalizeExternalPropertyFuzzOutputV1(
        makeInput({ status: "FAIL", counterexamples: [] }),
      ),
    ).toThrow("requires explicit counterexamples");
  });

  it("rejects malformed identities, digests, counts, and entries", () => {
    expect(() =>
      normalizeExternalPropertyFuzzOutputV1(
        makeInput({ head_sha: "A".repeat(40) }),
      ),
    ).toThrow("head_sha");
    expect(() =>
      normalizeExternalPropertyFuzzOutputV1(
        makeInput({ result_digest: "not-a-digest" }),
      ),
    ).toThrow("result_digest");
    expect(() =>
      normalizeExternalPropertyFuzzOutputV1(
        makeInput({ observed_case_count: -1 }),
      ),
    ).toThrow("observed_case_count");
    expect(() =>
      normalizeExternalPropertyFuzzOutputV1(
        makeInput({ counterexamples: ["same", "same"] }),
      ),
    ).toThrow("unique");
    expect(() =>
      normalizeExternalPropertyFuzzOutputV1(
        makeInput({ effect_requirements: ["same", "same"] }),
      ),
    ).toThrow("unique");
    expect(() =>
      normalizeExternalPropertyFuzzOutputV1(
        makeInput({ kind: "unsupported" as "property" }),
      ),
    ).toThrow("kind");
    expect(() =>
      normalizeExternalPropertyFuzzOutputV1(
        makeInput({ status: "CLEAN" as "PASS" }),
      ),
    ).toThrow("status");
  });

  it("is deterministic and does not mutate external input", () => {
    const input = makeInput({
      counterexamples: ["z", "a"],
      effect_requirements: ["y", "b"],
      limitations: ["m", "c"],
    });
    const before = structuredClone(input);
    const first = normalizeExternalPropertyFuzzOutputV1(input);
    const second = normalizeExternalPropertyFuzzOutputV1(input);

    expect(first).toEqual(second);
    expect(input).toEqual(before);
    expect(() => (first.counterexamples as string[]).push("new")).toThrow();
  });
});
