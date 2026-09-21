import { describe, expect, it } from "vitest";

import { canonicalAssuranceSha256V1 } from "../src/assurance/contracts/canonical-serialization.js";
import {
  createEngineDescriptorV1,
  type EngineDescriptorInputV1,
  type EngineKind,
} from "../src/assurance/contracts/engine-descriptor.js";
import type { EngineConfigurationIdentityV1 } from "../src/assurance/contracts/engine-qualification.js";
import {
  createEngineRegistryV1,
  findEngineRegistryEntryV1,
  type EngineRegistryEntryV1,
} from "../src/assurance/kernel/registry.js";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const D = "d".repeat(64);
const E = "e".repeat(64);
const F = "f".repeat(64);

function descriptorInput(
  engineId: string,
  kind: EngineKind,
  implementationId: string,
  version: string,
  artifactSha256: string,
): EngineDescriptorInputV1 {
  return {
    engine_id: engineId,
    engine_kind: kind,
    implementation_identity: {
      implementation_id: implementationId,
      source_identity: "source:canonical",
      version,
      artifact_sha256: artifactSha256,
    },
    capabilities: ["capability:review", "capability:test"],
    supported_inputs: ["input:assurance-target"],
    supported_outputs: ["output:evidence"],
    effect_classes: ["E0_READ_ONLY_ANALYSIS"],
    requirements: {
      process_required: false,
      network_required: false,
      provider_requirements: [],
      sandbox_required: false,
    },
    configuration_trust_boundary: {
      trusted_configuration_sources: ["config:canonical"],
      advisory_configuration_sources: [],
    },
    license_provenance_state: {
      license_identity: "license:apache-2.0",
      provenance_ref: "provenance:canonical",
      admission_state: "ADMITTED",
    },
    qualification_evidence_refs: [],
    known_limitations: [],
    authority_ceiling: "E0_READ_ONLY_ANALYSIS",
  };
}

function configuration(
  configurationId: string,
  configurationSha256: string,
): EngineConfigurationIdentityV1 {
  return {
    configuration_id: configurationId,
    configuration_sha256: configurationSha256,
  };
}

function entry(
  engineId: string,
  kind: EngineKind,
  implementationId: string,
  version: string,
  artifactSha256: string,
  configurationId: string,
  configurationSha256: string,
): EngineRegistryEntryV1 {
  return {
    descriptor: createEngineDescriptorV1(
      descriptorInput(
        engineId,
        kind,
        implementationId,
        version,
        artifactSha256,
      ),
    ),
    configuration_identity: configuration(
      configurationId,
      configurationSha256,
    ),
  };
}

function identityFor(registryEntry: EngineRegistryEntryV1) {
  return {
    engine_id: registryEntry.descriptor.engine_id,
    implementation_identity: registryEntry.descriptor.implementation_identity,
    configuration_identity: registryEntry.configuration_identity,
  };
}

describe("UA-P02-T01 Engine Registry", () => {
  it("registers internal and external descriptors by exact identity", () => {
    const internal = entry(
      "engine:ascout-native",
      "INTERNAL",
      "implementation:ascout-native",
      "0.1.0",
      A,
      "configuration:native",
      B,
    );
    const external = entry(
      "engine:review-external",
      "EXTERNAL",
      "implementation:review-external",
      "1.0.0",
      C,
      "configuration:review",
      D,
    );

    const registry = createEngineRegistryV1([external, internal]);

    expect(registry.schema_version).toBe(1);
    expect(registry.entries).toHaveLength(2);
    expect(
      findEngineRegistryEntryV1(registry, identityFor(internal)),
    ).toEqual(internal);
    expect(
      findEngineRegistryEntryV1(registry, identityFor(external)),
    ).toEqual(external);
  });

  it("canonicalizes registry ordering independently of insertion order", () => {
    const first = entry(
      "engine:z",
      "EXTERNAL",
      "implementation:z",
      "1.0.0",
      A,
      "configuration:z",
      B,
    );
    const second = entry(
      "engine:a",
      "INTERNAL",
      "implementation:a",
      "1.0.0",
      C,
      "configuration:a",
      D,
    );

    const left = createEngineRegistryV1([first, second]);
    const right = createEngineRegistryV1([second, first]);

    expect(left).toEqual(right);
    expect(canonicalAssuranceSha256V1(left)).toBe(
      canonicalAssuranceSha256V1(right),
    );
  });

  it("allows the same engine id when exact implementation identity differs", () => {
    const v1 = entry(
      "engine:review",
      "EXTERNAL",
      "implementation:review",
      "1.0.0",
      A,
      "configuration:default",
      B,
    );
    const v2 = entry(
      "engine:review",
      "EXTERNAL",
      "implementation:review",
      "2.0.0",
      C,
      "configuration:default",
      B,
    );

    const registry = createEngineRegistryV1([v1, v2]);

    expect(registry.entries).toHaveLength(2);
    expect(findEngineRegistryEntryV1(registry, identityFor(v1))).toEqual(v1);
    expect(findEngineRegistryEntryV1(registry, identityFor(v2))).toEqual(v2);
  });

  it("allows the same engine and implementation under distinct exact configurations", () => {
    const standard = entry(
      "engine:review",
      "EXTERNAL",
      "implementation:review",
      "1.0.0",
      A,
      "configuration:standard",
      B,
    );
    const strict = entry(
      "engine:review",
      "EXTERNAL",
      "implementation:review",
      "1.0.0",
      A,
      "configuration:strict",
      C,
    );

    const registry = createEngineRegistryV1([standard, strict]);

    expect(registry.entries).toHaveLength(2);
    expect(
      findEngineRegistryEntryV1(registry, identityFor(standard)),
    ).toEqual(standard);
    expect(findEngineRegistryEntryV1(registry, identityFor(strict))).toEqual(
      strict,
    );
  });

  it("rejects an exact duplicate identity even when descriptor metadata differs", () => {
    const original = entry(
      "engine:review",
      "EXTERNAL",
      "implementation:review",
      "1.0.0",
      A,
      "configuration:default",
      B,
    );
    const conflicting: EngineRegistryEntryV1 = {
      descriptor: createEngineDescriptorV1({
        ...descriptorInput(
          "engine:review",
          "EXTERNAL",
          "implementation:review",
          "1.0.0",
          A,
        ),
        capabilities: ["capability:security"],
      }),
      configuration_identity: configuration("configuration:default", B),
    };

    expect(() =>
      createEngineRegistryV1([original, conflicting]),
    ).toThrow("ambiguous duplicate exact identity");
  });

  it("rejects an identical entry repeated twice instead of silently deduplicating", () => {
    const repeated = entry(
      "engine:native",
      "INTERNAL",
      "implementation:native",
      "0.1.0",
      A,
      "configuration:native",
      B,
    );

    expect(() => createEngineRegistryV1([repeated, repeated])).toThrow(
      "ambiguous duplicate exact identity",
    );
  });

  it("requires the complete exact identity for lookup", () => {
    const registered = entry(
      "engine:review",
      "EXTERNAL",
      "implementation:review",
      "1.0.0",
      A,
      "configuration:default",
      B,
    );
    const registry = createEngineRegistryV1([registered]);

    expect(
      findEngineRegistryEntryV1(registry, {
        ...identityFor(registered),
        implementation_identity: {
          ...registered.descriptor.implementation_identity,
          artifact_sha256: C,
        },
      }),
    ).toBeUndefined();

    expect(
      findEngineRegistryEntryV1(registry, {
        ...identityFor(registered),
        configuration_identity: configuration("configuration:default", D),
      }),
    ).toBeUndefined();
  });

  it("validates descriptor and configuration identity at the registry boundary", () => {
    const valid = entry(
      "engine:native",
      "INTERNAL",
      "implementation:native",
      "0.1.0",
      A,
      "configuration:native",
      B,
    );

    expect(() =>
      createEngineRegistryV1([
        {
          ...valid,
          configuration_identity: {
            configuration_id: "configuration:native",
            configuration_sha256: "not-a-digest",
          },
        } as EngineRegistryEntryV1,
      ]),
    ).toThrow("configuration_identity.configuration_sha256");

    expect(() =>
      createEngineRegistryV1([
        {
          descriptor: {
            ...valid.descriptor,
            execution_authority: true,
          },
          configuration_identity: valid.configuration_identity,
        } as unknown as EngineRegistryEntryV1,
      ]),
    ).toThrow("engine descriptor contains missing or unknown fields");
  });

  it("rejects unknown fields in configuration and lookup identity", () => {
    const registered = entry(
      "engine:native",
      "INTERNAL",
      "implementation:native",
      "0.1.0",
      A,
      "configuration:native",
      B,
    );

    expect(() =>
      createEngineRegistryV1([
        {
          descriptor: registered.descriptor,
          configuration_identity: {
            ...registered.configuration_identity,
            availability: "AVAILABLE",
          },
        } as unknown as EngineRegistryEntryV1,
      ]),
    ).toThrow("configuration_identity contains missing or unknown fields");

    const registry = createEngineRegistryV1([registered]);
    expect(() =>
      findEngineRegistryEntryV1(registry, {
        ...identityFor(registered),
        qualified: true,
      } as unknown as ReturnType<typeof identityFor>),
    ).toThrow("engine registry identity contains missing or unknown fields");
  });

  it("keeps availability, qualification, and execution state out of T01", () => {
    const registered = entry(
      "engine:native",
      "INTERNAL",
      "implementation:native",
      "0.1.0",
      E,
      "configuration:native",
      F,
    );
    const registry = createEngineRegistryV1([registered]);
    const stored = registry.entries[0];

    expect(stored).toBeDefined();
    expect("availability" in (stored ?? {})).toBe(false);
    expect("qualified" in (stored ?? {})).toBe(false);
    expect("execution_authority" in (stored ?? {})).toBe(false);
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(stored ?? {})).toBe(true);
    expect(Object.isFrozen(stored?.descriptor ?? {})).toBe(true);
  });
});
