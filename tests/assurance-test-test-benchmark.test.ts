import { describe, expect, it } from "vitest";
import {
  TEST_BENCHMARK_SCHEMA_VERSION,
  normalizeExternalTestBenchmarkV1,
  type ExternalTestBenchmarkInputV1,
  type TestBenchmarkClassEntryV1,
} from "../src/assurance/test/test-benchmark.js";

function observedEntry(
  missClass: TestBenchmarkClassEntryV1["class"],
): TestBenchmarkClassEntryV1 {
  return {
    class: missClass,
    state: "OBSERVED",
    ref: "refs/" + missClass,
    digest: "c".repeat(64),
    reason: null,
  };
}

function makeInput(
  overrides: Partial<ExternalTestBenchmarkInputV1> = {},
): ExternalTestBenchmarkInputV1 {
  return {
    schema_version: TEST_BENCHMARK_SCHEMA_VERSION,
    adapter_id: "benchmark-runner",
    source_identity: "tree:t10",
    head_sha: "a".repeat(40),
    seed_refs: ["seeds/corpus.v1"],
    entries: [
      observedEntry("seed-selection"),
      observedEntry("flake"),
      observedEntry("exercise"),
      observedEntry("mutation"),
      observedEntry("property"),
      observedEntry("browser"),
    ],
    limitations: [],
    ...overrides,
  };
}

describe("external test benchmark observation adapter", () => {
  it("normalizes a benchmark result as an untrusted observation only", () => {
    const input = makeInput();
    const output = normalizeExternalTestBenchmarkV1(input);

    expect(output).toMatchObject({
      scope: "TEST",
      strategy: "OBSERVATION_ONLY",
      authority: "NONE_UNTRUSTED",
      canonical_status: "UNTRUSTED_OBSERVATION",
      seed_refs: ["seeds/corpus.v1"],
    });
    expect(output).not.toHaveProperty("pass");
    expect(output).not.toHaveProperty("verdict");
    expect(output.entries.map((entry) => entry.class)).toEqual([
      "browser",
      "exercise",
      "flake",
      "mutation",
      "property",
      "seed-selection",
    ]);
    expect(output.blocking_reasons).toEqual([]);
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.plan_visible_fields)).toBe(true);
    expect(Object.isFrozen(output.seed_refs)).toBe(true);
    expect(Object.isFrozen(output.entries)).toBe(true);
  });

  it("preserves misses and limitations without promotion", () => {
    const output = normalizeExternalTestBenchmarkV1(
      makeInput({
        entries: [
          observedEntry("seed-selection"),
          {
            class: "flake",
            state: "MISS",
            ref: null,
            digest: null,
            reason: "no-flake-corpus",
          },
          observedEntry("exercise"),
          observedEntry("mutation"),
          {
            class: "property",
            state: "MISS",
            ref: null,
            digest: null,
            reason: "zeta-gap",
          },
          observedEntry("browser"),
        ],
        limitations: ["single-seed"],
      }),
    );

    expect(output.canonical_status).toBe("UNTRUSTED_OBSERVATION");
    expect(output.blocking_reasons).toEqual([
      "benchmark-miss:flake:no-flake-corpus",
      "benchmark-miss:property:zeta-gap",
      "benchmark:limitation:single-seed",
    ]);
  });

  it("ignores caller attempts to self-attest authority or verdict", () => {
    const output = normalizeExternalTestBenchmarkV1({
      ...makeInput(),
      authority: "PASS",
      verdict: "PASS",
    } as unknown as ExternalTestBenchmarkInputV1);

    expect(output.authority).toBe("NONE_UNTRUSTED");
    expect(output).not.toHaveProperty("verdict");
  });

  it("requires exact miss-class coverage with coherent entry evidence", () => {
    expect(() =>
      normalizeExternalTestBenchmarkV1(makeInput({ seed_refs: [] })),
    ).toThrow("explicit seed selection");
    expect(() =>
      normalizeExternalTestBenchmarkV1(
        makeInput({ entries: makeInput().entries.slice(1) }),
      ),
    ).toThrow("exactly once");
    expect(() =>
      normalizeExternalTestBenchmarkV1(
        makeInput({
          entries: [
            ...makeInput().entries,
            observedEntry("flake"),
          ],
        }),
      ),
    ).toThrow("exactly once");
    expect(() =>
      normalizeExternalTestBenchmarkV1(
        makeInput({
          entries: makeInput().entries.map((entry) =>
            entry.class === "flake"
              ? { ...entry, digest: "not-a-digest" }
              : entry,
          ),
        }),
      ),
    ).toThrow("digest");
    expect(() =>
      normalizeExternalTestBenchmarkV1(
        makeInput({
          entries: makeInput().entries.map((entry) =>
            entry.class === "flake"
              ? { ...entry, state: "MISS", ref: null, digest: null, reason: null }
              : entry,
          ),
        }),
      ),
    ).toThrow("require a reason");
    expect(() =>
      normalizeExternalTestBenchmarkV1(
        makeInput({
          entries: makeInput().entries.map((entry) =>
            entry.class === "flake"
              ? { ...entry, reason: "unexpected" }
              : entry,
          ),
        }),
      ),
    ).toThrow("no reason");
  });

  it("rejects malformed identities, digests, and entries", () => {
    expect(() =>
      normalizeExternalTestBenchmarkV1(
        makeInput({ head_sha: "A".repeat(40) }),
      ),
    ).toThrow("head_sha");
    expect(() =>
      normalizeExternalTestBenchmarkV1(
        makeInput({ seed_refs: ["same", "same"] }),
      ),
    ).toThrow("unique");
    expect(() =>
      normalizeExternalTestBenchmarkV1(
        makeInput({
          entries: makeInput().entries.map((entry) =>
            entry.class === "flake"
              ? { ...entry, class: "unsupported" }
              : entry,
          ) as TestBenchmarkClassEntryV1[],
        }),
      ),
    ).toThrow("unsupported");
  });

  it("is deterministic and does not mutate external input", () => {
    const input = makeInput({
      seed_refs: ["z-seed", "a-seed"],
      limitations: ["m", "c"],
    });
    const before = structuredClone(input);
    const first = normalizeExternalTestBenchmarkV1(input);
    const second = normalizeExternalTestBenchmarkV1(input);

    expect(first).toEqual(second);
    expect(input).toEqual(before);
    expect(() => (first.seed_refs as string[]).push("new")).toThrow();
  });
});
