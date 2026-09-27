import { describe, expect, it } from "vitest";
import {
  MUTATION_ADAPTER_SCHEMA_VERSION,
  normalizeExternalMutationOutputV1,
  type ExternalMutationOutputV1,
} from "../src/assurance/test/mutation-adapter.js";

function makeInput(
  overrides: Partial<ExternalMutationOutputV1> = {},
): ExternalMutationOutputV1 {
  return {
    schema_version: MUTATION_ADAPTER_SCHEMA_VERSION,
    adapter_id: "mutation-runner",
    kind: "mutation",
    source_identity: "tree:t07",
    head_sha: "a".repeat(40),
    status: "PASS",
    mutation_ref: "mutations/auth-guard.v1",
    attempted_count: 12,
    killed_count: 12,
    survived_count: 0,
    survived_mutants: [],
    result_digest: "b".repeat(64),
    limitations: [],
    ...overrides,
  };
}

describe("external mutation observation adapter", () => {
  it("normalizes a runner result as an untrusted observation only", () => {
    const input = makeInput();
    const output = normalizeExternalMutationOutputV1(input);

    expect(output).toMatchObject({
      scope: "TEST",
      strategy: "OBSERVATION_ONLY",
      authority: "NONE_UNTRUSTED",
      canonical_status: "UNTRUSTED_OBSERVATION",
      source_status: "PASS",
      attempted_count: 12,
      killed_count: 12,
      survived_count: 0,
    });
    expect(output).not.toHaveProperty("pass");
    expect(output).not.toHaveProperty("verdict");
    expect(output.blocking_reasons).toEqual([]);
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.plan_visible_fields)).toBe(true);
    expect(Object.isFrozen(output.survived_mutants)).toBe(true);
    expect(Object.isFrozen(output.limitations)).toBe(true);
  });

  it("preserves survived mutants and limitations without promotion", () => {
    const output = normalizeExternalMutationOutputV1(
      makeInput({
        status: "FAIL",
        attempted_count: 3,
        killed_count: 1,
        survived_count: 2,
        survived_mutants: ["zeta-guard", "alpha-guard"],
        limitations: ["time-boxed"],
      }),
    );

    expect(output.source_status).toBe("FAIL");
    expect(output.survived_mutants).toEqual(["alpha-guard", "zeta-guard"]);
    expect(output.blocking_reasons).toEqual([
      "external-runner:fail",
      "external-runner:limitation:time-boxed",
      "external-runner:survived-mutants",
      "external-runner:survived:alpha-guard",
      "external-runner:survived:zeta-guard",
    ]);
  });

  it("ignores caller attempts to self-attest authority or verdict", () => {
    const output = normalizeExternalMutationOutputV1({
      ...makeInput(),
      authority: "PASS",
      verdict: "PASS",
    } as unknown as ExternalMutationOutputV1);

    expect(output.authority).toBe("NONE_UNTRUSTED");
    expect(output).not.toHaveProperty("verdict");
  });

  it("requires coherent attempted, killed, and survived accounting", () => {
    expect(() =>
      normalizeExternalMutationOutputV1(
        makeInput({ killed_count: 9, survived_count: 4 }),
      ),
    ).toThrow("incoherent");
    expect(() =>
      normalizeExternalMutationOutputV1(
        makeInput({
          attempted_count: 2,
          killed_count: 1,
          survived_count: 1,
          survived_mutants: [],
        }),
      ),
    ).toThrow("explicitly listed");
    expect(() =>
      normalizeExternalMutationOutputV1(
        makeInput({
          attempted_count: 2,
          killed_count: 0,
          survived_count: 1,
          survived_mutants: ["one", "two"],
        }),
      ),
    ).toThrow("explicitly listed");
  });

  it("rejects malformed identities, digests, counts, and entries", () => {
    expect(() =>
      normalizeExternalMutationOutputV1(
        makeInput({ head_sha: "A".repeat(40) }),
      ),
    ).toThrow("head_sha");
    expect(() =>
      normalizeExternalMutationOutputV1(
        makeInput({ result_digest: "not-a-digest" }),
      ),
    ).toThrow("result_digest");
    expect(() =>
      normalizeExternalMutationOutputV1(
        makeInput({ attempted_count: -1 }),
      ),
    ).toThrow("attempted_count");
    expect(() =>
      normalizeExternalMutationOutputV1(
        makeInput({ survived_mutants: ["same", "same"] }),
      ),
    ).toThrow("unique");
    expect(() =>
      normalizeExternalMutationOutputV1(
        makeInput({ kind: "unsupported" as "mutation" }),
      ),
    ).toThrow("kind");
    expect(() =>
      normalizeExternalMutationOutputV1(
        makeInput({ status: "CLEAN" as "PASS" }),
      ),
    ).toThrow("status");
  });

  it("is deterministic and does not mutate external input", () => {
    const input = makeInput({
      attempted_count: 2,
      killed_count: 0,
      survived_count: 2,
      survived_mutants: ["z", "a"],
      limitations: ["m", "c"],
    });
    const before = structuredClone(input);
    const first = normalizeExternalMutationOutputV1(input);
    const second = normalizeExternalMutationOutputV1(input);

    expect(first).toEqual(second);
    expect(input).toEqual(before);
    expect(() => (first.survived_mutants as string[]).push("new")).toThrow();
  });
});
