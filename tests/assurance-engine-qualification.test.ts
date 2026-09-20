import { describe, expect, it } from "vitest";

import {
  assertEngineQualificationAppliesV1,
  createEngineQualificationV1,
  parseEngineQualificationV1,
} from "../src/assurance/contracts/engine-qualification.js";
import { createEngineDescriptorV1 } from "../src/assurance/contracts/engine-descriptor.js";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const D = "d".repeat(64);
const E = "e".repeat(64);

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
    capabilities: ["capability:test", "capability:review"],
    supported_inputs: ["input:source"],
    supported_outputs: ["output:evidence"],
    effect_classes: [
      "E1_LOCAL_DETERMINISTIC_PROCESS",
      "E0_READ_ONLY_ANALYSIS",
    ],
    requirements: {
      process_required: true,
      network_required: false,
      provider_requirements: [],
      sandbox_required: false,
    },
    configuration_trust_boundary: {
      trusted_configuration_sources: ["config:canonical"],
      advisory_configuration_sources: ["config:repository"],
    },
    license_provenance_state: {
      license_identity: "license:apache-2.0",
      provenance_ref: "provenance:ascout-native",
      admission_state: "ADMITTED",
    },
    qualification_evidence_refs: ["evidence:descriptor-history"],
    known_limitations: ["No active network execution."],
    authority_ceiling: "E1_LOCAL_DETERMINISTIC_PROCESS",
  });
}

function configuration() {
  return {
    configuration_id: "configuration:release-v1",
    configuration_sha256: B,
  };
}

function benchmarkCorpus() {
  return {
    benchmark_id: "benchmark:engine-v1",
    corpus_id: "corpus:owned-v1",
    corpus_sha256: C,
  };
}

function platform() {
  return {
    platform_id: "platform:linux-x64-node24",
    platform_sha256: D,
  };
}

function evidenceRefs() {
  return [
    {
      evidence_ref: "evidence:qualification-b",
      provider_self_description: false as const,
    },
    {
      evidence_ref: "evidence:qualification-a",
      provider_self_description: false as const,
    },
  ];
}

function qualificationInput() {
  return {
    qualification_id: "qualification:ascout-native-v1",
    engine_id: "engine:ascout-native",
    implementation_identity: descriptor().implementation_identity,
    configuration_identity: configuration(),
    profile_identities: ["profile:standard", "profile:release"],
    benchmark_corpus_identity: benchmarkCorpus(),
    platform_identity: platform(),
    evidence_refs: evidenceRefs(),
    result: "QUALIFIED",
    qualified_at_epoch_ms: 1_000,
    expires_at_epoch_ms: 2_000,
  };
}

function applicationContext() {
  return {
    descriptor: descriptor(),
    configuration_identity: configuration(),
    profile_identities: ["profile:release", "profile:standard"],
    benchmark_corpus_identity: benchmarkCorpus(),
    platform_identity: platform(),
    as_of_epoch_ms: 1_500,
  };
}
describe("UA-P01-T06 EngineQualification", () => {
  it("constructs canonical exact qualification data", () => {
    const qualification = createEngineQualificationV1(qualificationInput());

    expect(qualification.schema_version).toBe(1);
    expect(qualification.profile_identities).toEqual([
      "profile:release",
      "profile:standard",
    ]);
    expect(qualification.evidence_refs.map((entry) => entry.evidence_ref)).toEqual([
      "evidence:qualification-a",
      "evidence:qualification-b",
    ]);
    expect(qualification.invalidation_rules).toEqual({
      invalidate_on_implementation_drift: true,
      invalidate_on_configuration_drift: true,
      invalidate_on_profile_drift: true,
      invalidate_on_benchmark_corpus_drift: true,
      invalidate_on_platform_drift: true,
    });
  });

  it("round-trips strict persisted qualification and applies to exact context", () => {
    const qualification = createEngineQualificationV1(qualificationInput());

    expect(parseEngineQualificationV1(structuredClone(qualification))).toEqual(
      qualification,
    );
    expect(() =>
      assertEngineQualificationAppliesV1(qualification, applicationContext()),
    ).not.toThrow();
  });

  it("accepts diagnostic result states structurally but only QUALIFIED applies", () => {
    const record = createEngineQualificationV1({
      ...qualificationInput(),
      result: "NOT_QUALIFIED",
      evidence_refs: [],
    });

    expect(record.result).toBe("NOT_QUALIFIED");
    expect(() =>
      assertEngineQualificationAppliesV1(record, applicationContext()),
    ).toThrow("engine qualification result is not QUALIFIED");
  });

  it("rejects malformed result identifiers", () => {
    expect(() =>
      createEngineQualificationV1({
        ...qualificationInput(),
        result: "qualified",
      }),
    ).toThrow("result must be an uppercase bounded state identifier");
  });

  it("requires profiles and evidence for QUALIFIED", () => {
    expect(() =>
      createEngineQualificationV1({
        ...qualificationInput(),
        profile_identities: [],
      }),
    ).toThrow("QUALIFIED result requires at least one profile identity");

    expect(() =>
      createEngineQualificationV1({
        ...qualificationInput(),
        evidence_refs: [],
      }),
    ).toThrow("QUALIFIED result requires qualification evidence");
  });

  it("rejects provider self-description as qualification evidence", () => {
    expect(() =>
      createEngineQualificationV1({
        ...qualificationInput(),
        evidence_refs: [
          {
            evidence_ref: "evidence:provider-about-page",
            provider_self_description: true as false,
          },
        ],
      }),
    ).toThrow("provider self-description cannot be qualification evidence");
  });

  it("rejects invalid expiry ordering", () => {
    expect(() =>
      createEngineQualificationV1({
        ...qualificationInput(),
        expires_at_epoch_ms: 1_000,
      }),
    ).toThrow(
      "expires_at_epoch_ms must be greater than qualified_at_epoch_ms",
    );
  });

  it("rejects application before qualification time and at expiry", () => {
    const qualification = createEngineQualificationV1(qualificationInput());

    expect(() =>
      assertEngineQualificationAppliesV1(qualification, {
        ...applicationContext(),
        as_of_epoch_ms: 999,
      }),
    ).toThrow("engine qualification is not yet applicable");

    expect(() =>
      assertEngineQualificationAppliesV1(qualification, {
        ...applicationContext(),
        as_of_epoch_ms: 2_000,
      }),
    ).toThrow("engine qualification is expired");
  });

  it("allows an explicit non-expiring qualification record", () => {
    const qualification = createEngineQualificationV1({
      ...qualificationInput(),
      expires_at_epoch_ms: null,
    });

    expect(() =>
      assertEngineQualificationAppliesV1(qualification, {
        ...applicationContext(),
        as_of_epoch_ms: 9_999_999,
      }),
    ).not.toThrow();
  });
  it("invalidates on engine id mismatch", () => {
    const qualification = createEngineQualificationV1({
      ...qualificationInput(),
      engine_id: "engine:other",
    });

    expect(() =>
      assertEngineQualificationAppliesV1(qualification, applicationContext()),
    ).toThrow("qualification engine_id does not match descriptor");
  });

  it("invalidates on implementation identity drift", () => {
    const qualification = createEngineQualificationV1(qualificationInput());

    expect(() =>
      assertEngineQualificationAppliesV1(qualification, {
        ...applicationContext(),
        descriptor: descriptor("0.2.0"),
      }),
    ).toThrow("qualification implementation identity mismatch");
  });

  it("invalidates on configuration drift", () => {
    const qualification = createEngineQualificationV1(qualificationInput());

    expect(() =>
      assertEngineQualificationAppliesV1(qualification, {
        ...applicationContext(),
        configuration_identity: {
          configuration_id: "configuration:release-v2",
          configuration_sha256: E,
        },
      }),
    ).toThrow("qualification configuration identity mismatch");
  });

  it("invalidates on profile drift", () => {
    const qualification = createEngineQualificationV1(qualificationInput());

    expect(() =>
      assertEngineQualificationAppliesV1(qualification, {
        ...applicationContext(),
        profile_identities: ["profile:release"],
      }),
    ).toThrow("qualification profile identity mismatch");
  });

  it("invalidates on benchmark/corpus drift", () => {
    const qualification = createEngineQualificationV1(qualificationInput());

    expect(() =>
      assertEngineQualificationAppliesV1(qualification, {
        ...applicationContext(),
        benchmark_corpus_identity: {
          ...benchmarkCorpus(),
          corpus_sha256: E,
        },
      }),
    ).toThrow("qualification benchmark/corpus identity mismatch");
  });

  it("invalidates on platform drift", () => {
    const qualification = createEngineQualificationV1(qualificationInput());

    expect(() =>
      assertEngineQualificationAppliesV1(qualification, {
        ...applicationContext(),
        platform_identity: {
          platform_id: "platform:windows-x64-node24",
          platform_sha256: E,
        },
      }),
    ).toThrow("qualification platform identity mismatch");
  });

  it("rejects weakened invalidation rules in persisted records", () => {
    const qualification = createEngineQualificationV1(qualificationInput());

    expect(() =>
      parseEngineQualificationV1({
        ...qualification,
        invalidation_rules: {
          ...qualification.invalidation_rules,
          invalidate_on_configuration_drift: false,
        },
      }),
    ).toThrow(
      "invalidation_rules.invalidate_on_configuration_drift must equal true",
    );
  });

  it("rejects noncanonical profile and evidence ordering", () => {
    const qualification = createEngineQualificationV1(qualificationInput());

    expect(() =>
      parseEngineQualificationV1({
        ...qualification,
        profile_identities: ["profile:standard", "profile:release"],
      }),
    ).toThrow("profile_identities must be unique and canonically sorted");

    expect(() =>
      parseEngineQualificationV1({
        ...qualification,
        evidence_refs: [...qualification.evidence_refs].reverse(),
      }),
    ).toThrow("evidence_refs must be unique and canonically sorted");
  });
  it("rejects duplicate qualification evidence refs", () => {
    expect(() =>
      createEngineQualificationV1({
        ...qualificationInput(),
        evidence_refs: [
          {
            evidence_ref: "evidence:duplicate",
            provider_self_description: false,
          },
          {
            evidence_ref: "evidence:duplicate",
            provider_self_description: false,
          },
        ],
      }),
    ).toThrow("evidence_refs contains duplicate evidence_ref");
  });

  it("rejects unknown authority-like fields", () => {
    const qualification = createEngineQualificationV1(qualificationInput());

    expect(() =>
      parseEngineQualificationV1({
        ...qualification,
        execution_authority: true,
      }),
    ).toThrow("engine qualification contains missing or unknown fields");

    expect("network_authority" in qualification).toBe(false);
    expect("provider_authority" in qualification).toBe(false);
    expect("credential_authority" in qualification).toBe(false);
  });

  it("rejects raw path material in exact identities", () => {
    expect(() =>
      createEngineQualificationV1({
        ...qualificationInput(),
        configuration_identity: {
          configuration_id: "/private/config",
          configuration_sha256: B,
        },
      }),
    ).toThrow("configuration_identity.configuration_id");
  });

  it("rejects malformed digests instead of repairing identity", () => {
    expect(() =>
      createEngineQualificationV1({
        ...qualificationInput(),
        platform_identity: {
          platform_id: "platform:linux-x64-node24",
          platform_sha256: "not-a-digest",
        },
      }),
    ).toThrow("platform_identity.platform_sha256 must be lowercase sha256");
  });

  it("does not read a hidden wall clock for applicability", () => {
    const qualification = createEngineQualificationV1(qualificationInput());

    expect(() =>
      assertEngineQualificationAppliesV1(qualification, {
        ...applicationContext(),
        as_of_epoch_ms: Number.NaN,
      }),
    ).toThrow("as_of_epoch_ms must be a non-negative safe integer epoch ms");
  });
});
