import { describe, expect, it } from "vitest";
import {
  CONTRACT_ADAPTER_SCHEMA_VERSION,
  normalizeExternalRunnerContractOutputV1,
  type ExternalRunnerContractOutputV1,
} from "../src/assurance/test/contract-adapter.js";

function makeInput(
  overrides: Partial<ExternalRunnerContractOutputV1> = {},
): ExternalRunnerContractOutputV1 {
  return {
    schema_version: CONTRACT_ADAPTER_SCHEMA_VERSION,
    adapter_id: "contract-runner",
    kind: "contract",
    source_identity: "tree:t05",
    head_sha: "a".repeat(40),
    status: "PASS",
    contract_ref: "contracts/login.json",
    schema_ref: null,
    observed_case_count: 4,
    result_digest: "b".repeat(64),
    limitations: [],
    ...overrides,
  };
}

describe("external contract and schema observation adapter", () => {
  it("normalizes a runner result as an untrusted observation only", () => {
    const input = makeInput();
    const output = normalizeExternalRunnerContractOutputV1(input);

    expect(output).toMatchObject({
      scope: "TEST",
      strategy: "OBSERVATION_ONLY",
      authority: "NONE_UNTRUSTED",
      canonical_status: "UNTRUSTED_OBSERVATION",
      source_status: "PASS",
      observed_case_count: 4,
    });
    expect(output).not.toHaveProperty("pass");
    expect(output).not.toHaveProperty("verdict");
    expect(output.blocking_reasons).toEqual([]);
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.plan_visible_fields)).toBe(true);
    expect(Object.isFrozen(output.limitations)).toBe(true);
  });

  it("preserves failure, omission, and limitation reasons without promotion", () => {
    const output = normalizeExternalRunnerContractOutputV1(
      makeInput({
        status: "FAIL",
        observed_case_count: 0,
        limitations: ["zeta", "alpha"],
      }),
    );

    expect(output.source_status).toBe("FAIL");
    expect(output.blocking_reasons).toEqual([
      "external-runner:fail",
      "external-runner:limitation:alpha",
      "external-runner:limitation:zeta",
      "external-runner:no-cases",
    ]);
  });

  it("ignores caller attempts to self-attest authority or verdict", () => {
    const output = normalizeExternalRunnerContractOutputV1({
      ...makeInput(),
      authority: "PASS",
      verdict: "PASS",
    } as unknown as ExternalRunnerContractOutputV1);

    expect(output.authority).toBe("NONE_UNTRUSTED");
    expect(output).not.toHaveProperty("verdict");
  });

  it("requires an explicit schema reference for schema outputs", () => {
    expect(() =>
      normalizeExternalRunnerContractOutputV1(
        makeInput({ kind: "schema", schema_ref: null }),
      ),
    ).toThrow("schema output requires schema_ref");
    expect(
      normalizeExternalRunnerContractOutputV1(
        makeInput({ kind: "schema", schema_ref: "schemas/login.v1.json" }),
      ).schema_ref,
    ).toBe("schemas/login.v1.json");
  });

  it("rejects malformed identities, digests, counts, and limitations", () => {
    expect(() =>
      normalizeExternalRunnerContractOutputV1(
        makeInput({ head_sha: "A".repeat(40) }),
      ),
    ).toThrow("head_sha");
    expect(() =>
      normalizeExternalRunnerContractOutputV1(
        makeInput({ result_digest: "not-a-digest" }),
      ),
    ).toThrow("result_digest");
    expect(() =>
      normalizeExternalRunnerContractOutputV1(
        makeInput({ observed_case_count: -1 }),
      ),
    ).toThrow("observed_case_count");
    expect(() =>
      normalizeExternalRunnerContractOutputV1(
        makeInput({ limitations: ["same", "same"] }),
      ),
    ).toThrow("unique");
    expect(() =>
      normalizeExternalRunnerContractOutputV1(
        makeInput({ kind: "unsupported" as "contract" }),
      ),
    ).toThrow("kind");
    expect(() =>
      normalizeExternalRunnerContractOutputV1(
        makeInput({ status: "CLEAN" as "PASS" }),
      ),
    ).toThrow("status");
  });

  it("is deterministic and does not mutate external input", () => {
    const input = makeInput({ limitations: ["z", "a"] });
    const before = structuredClone(input);
    const first = normalizeExternalRunnerContractOutputV1(input);
    const second = normalizeExternalRunnerContractOutputV1(input);

    expect(first).toEqual(second);
    expect(input).toEqual(before);
    expect(() => (first.limitations as string[]).push("new")).toThrow();
  });
});
