import { describe, expect, it } from "vitest";

import {
  assertEngineImplementationIdentityV1,
  createEngineDescriptorV1,
  parseEngineDescriptorV1,
  type EngineDescriptorInputV1,
} from "../src/assurance/contracts/engine-descriptor.js";

const A = "a".repeat(64);
const B = "b".repeat(64);

function input(): EngineDescriptorInputV1 {
  return {
    engine_id: "engine:ascout-native",
    engine_kind: "INTERNAL",
    implementation_identity: {
      implementation_id: "implementation:ascout-native",
      source_identity: "source:ascout-main",
      version: "0.1.0",
      artifact_sha256: A,
    },
    capabilities: [
      "capability:test",
      "capability:review",
      "capability:test",
    ],
    supported_inputs: ["input:assurance-target", "input:source-tree"],
    supported_outputs: ["output:evidence", "output:finding"],
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
      trusted_configuration_sources: [
        "config:canonical-policy",
        "config:ascout-owned",
      ],
      advisory_configuration_sources: ["config:repository-advisory"],
    },
    license_provenance_state: {
      license_identity: "Apache-2.0",
      provenance_ref: "provenance:ascout-owned",
      admission_state: "ADMITTED",
    },
    qualification_evidence_refs: [
      "evidence:qualification-1",
      "evidence:qualification-1",
    ],
    known_limitations: [
      "No external network execution is described by this engine descriptor.",
    ],
    authority_ceiling: "E1_LOCAL_DETERMINISTIC_PROCESS",
  };
}

describe("UA-P01-T05 EngineDescriptor", () => {
  it("constructs a canonical exact-identity descriptor", () => {
    const descriptor = createEngineDescriptorV1(input());

    expect(descriptor.schema_version).toBe(1);
    expect(descriptor.engine_kind).toBe("INTERNAL");
    expect(descriptor.capabilities).toEqual([
      "capability:review",
      "capability:test",
    ]);
    expect(descriptor.effect_classes).toEqual([
      "E0_READ_ONLY_ANALYSIS",
      "E1_LOCAL_DETERMINISTIC_PROCESS",
    ]);
    expect(descriptor.qualification_evidence_refs).toEqual([
      "evidence:qualification-1",
    ]);
  });

  it("round-trips a strict persisted descriptor", () => {
    const descriptor = createEngineDescriptorV1(input());
    expect(parseEngineDescriptorV1(structuredClone(descriptor))).toEqual(
      descriptor,
    );
  });

  it("rejects unknown engine kinds", () => {
    const descriptor = createEngineDescriptorV1(input());
    expect(() =>
      parseEngineDescriptorV1({
        ...descriptor,
        engine_kind: "PLUGIN",
      }),
    ).toThrow("engine_kind is invalid or unsupported");
  });

  it("requires an exact implementation identity", () => {
    const descriptor = createEngineDescriptorV1(input());

    expect(() =>
      parseEngineDescriptorV1({
        ...descriptor,
        implementation_identity: {
          ...descriptor.implementation_identity,
          artifact_sha256: "not-a-digest",
        },
      }),
    ).toThrow("implementation_identity.artifact_sha256 must be lowercase sha256");
  });

  it("rejects raw repository paths and URL material in implementation identity", () => {
    expect(() =>
      createEngineDescriptorV1({
        ...input(),
        implementation_identity: {
          ...input().implementation_identity,
          source_identity: "/Users/alice/private/repo",
        },
      }),
    ).toThrow("implementation_identity.source_identity");

    expect(() =>
      createEngineDescriptorV1({
        ...input(),
        implementation_identity: {
          ...input().implementation_identity,
          source_identity: "https://example.com/private/repo",
        },
      }),
    ).toThrow("implementation_identity.source_identity");
  });

  it("requires canonical persisted capability/input/output lists", () => {
    const descriptor = createEngineDescriptorV1(input());

    expect(() =>
      parseEngineDescriptorV1({
        ...descriptor,
        capabilities: ["capability:test", "capability:review"],
      }),
    ).toThrow("capabilities must be unique and canonically sorted");

    expect(() =>
      parseEngineDescriptorV1({
        ...descriptor,
        supported_inputs: [
          "input:source-tree",
          "input:assurance-target",
        ],
      }),
    ).toThrow("supported_inputs must be unique and canonically sorted");
  });

  it("requires at least one declared effect class", () => {
    expect(() =>
      createEngineDescriptorV1({
        ...input(),
        effect_classes: [],
      }),
    ).toThrow("effect_classes must contain at least one effect class");
  });

  it("rejects an authority ceiling above the highest declared effect", () => {
    expect(() =>
      createEngineDescriptorV1({
        ...input(),
        effect_classes: ["E0_READ_ONLY_ANALYSIS"],
        authority_ceiling: "E2_LOCAL_WRITE_ARTIFACT_ONLY",
      }),
    ).toThrow(
      "authority_ceiling exceeds the highest declared engine effect class",
    );
  });

  it("allows a ceiling below the highest technical effect capability", () => {
    const descriptor = createEngineDescriptorV1({
      ...input(),
      effect_classes: [
        "E0_READ_ONLY_ANALYSIS",
        "E3_ISOLATED_LOCAL_EXECUTION",
      ],
      authority_ceiling: "E1_LOCAL_DETERMINISTIC_PROCESS",
    });

    expect(descriptor.authority_ceiling).toBe(
      "E1_LOCAL_DETERMINISTIC_PROCESS",
    );
    expect(descriptor.effect_classes).toContain(
      "E3_ISOLATED_LOCAL_EXECUTION",
    );
  });

  it("keeps process/network/provider/sandbox requirements as data only", () => {
    const descriptor = createEngineDescriptorV1({
      ...input(),
      requirements: {
        process_required: true,
        network_required: true,
        provider_requirements: [
          "provider:external-model",
          "provider:external-model",
        ],
        sandbox_required: true,
      },
    });

    expect(descriptor.requirements.provider_requirements).toEqual([
      "provider:external-model",
    ]);
    expect("process_authority" in descriptor).toBe(false);
    expect("network_authority" in descriptor).toBe(false);
    expect("credential_authority" in descriptor).toBe(false);
  });

  it("requires trusted and advisory configuration sources to be disjoint", () => {
    expect(() =>
      createEngineDescriptorV1({
        ...input(),
        configuration_trust_boundary: {
          trusted_configuration_sources: ["config:same"],
          advisory_configuration_sources: ["config:same"],
        },
      }),
    ).toThrow(
      "configuration trust boundary contains overlapping source: config:same",
    );
  });

  it("keeps admission state bounded without inventing a closed enum", () => {
    const descriptor = createEngineDescriptorV1({
      ...input(),
      license_provenance_state: {
        ...input().license_provenance_state,
        admission_state: "OWNER_REVIEWED",
      },
    });
    expect(descriptor.license_provenance_state.admission_state).toBe(
      "OWNER_REVIEWED",
    );

    expect(() =>
      createEngineDescriptorV1({
        ...input(),
        license_provenance_state: {
          ...input().license_provenance_state,
          admission_state: "owner reviewed",
        },
      }),
    ).toThrow(
      "license_provenance_state.admission_state must be an uppercase bounded state identifier",
    );
  });

  it("does not treat qualification evidence refs as qualification state", () => {
    const descriptor = createEngineDescriptorV1(input());

    expect(descriptor.qualification_evidence_refs).toEqual([
      "evidence:qualification-1",
    ]);
    expect("qualified" in descriptor).toBe(false);
    expect("qualification_result" in descriptor).toBe(false);
  });

  it("rejects unknown authority-like fields", () => {
    const descriptor = createEngineDescriptorV1(input());
    expect(() =>
      parseEngineDescriptorV1({
        ...descriptor,
        execution_authority: true,
      }),
    ).toThrow("engine descriptor contains missing or unknown fields");
  });

  it("rejects mismatched implementation identity before capability reuse", () => {
    const descriptor = createEngineDescriptorV1(input());

    expect(() =>
      assertEngineImplementationIdentityV1(descriptor, {
        ...descriptor.implementation_identity,
        artifact_sha256: B,
      }),
    ).toThrow(
      "engine implementation identity mismatch; capability truth is inapplicable",
    );

    expect(() =>
      assertEngineImplementationIdentityV1(
        descriptor,
        descriptor.implementation_identity,
      ),
    ).not.toThrow();
  });

  it("rejects malformed or noncanonical known limitations", () => {
    expect(() =>
      createEngineDescriptorV1({
        ...input(),
        known_limitations: [""],
      }),
    ).toThrow("known_limitations[0]");

    const descriptor = createEngineDescriptorV1({
      ...input(),
      known_limitations: ["z limitation", "a limitation"],
    });
    expect(() =>
      parseEngineDescriptorV1({
        ...descriptor,
        known_limitations: ["z limitation", "a limitation"],
      }),
    ).toThrow("known_limitations must be unique and canonically sorted");
  });
});
