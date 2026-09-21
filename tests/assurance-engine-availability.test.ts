import { describe, expect, it } from "vitest";

import { canonicalAssuranceSha256V1 } from "../src/assurance/contracts/canonical-serialization.js";
import {
  createEngineDescriptorV1,
  type EngineDescriptorInputV1,
} from "../src/assurance/contracts/engine-descriptor.js";
import {
  createEngineAvailabilitySnapshotV1,
  findEngineAvailabilityEntryV1,
  type EngineAvailabilityObservationInputV1,
} from "../src/assurance/kernel/availability.js";
import {
  createEngineRegistryV1,
  type EngineRegistryEntryV1,
} from "../src/assurance/kernel/registry.js";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const D = "d".repeat(64);

function descriptorInput(
  engineId: string,
  implementationId: string,
  artifactSha256: string,
): EngineDescriptorInputV1 {
  return {
    engine_id: engineId,
    engine_kind: "INTERNAL",
    implementation_identity: {
      implementation_id: implementationId,
      source_identity: "source:canonical",
      version: "1.0.0",
      artifact_sha256: artifactSha256,
    },
    capabilities: ["capability:test"],
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

function registryEntry(
  engineId: string,
  implementationId: string,
  artifactSha256: string,
  configurationId: string,
  configurationSha256: string,
): EngineRegistryEntryV1 {
  return {
    descriptor: createEngineDescriptorV1(
      descriptorInput(engineId, implementationId, artifactSha256),
    ),
    configuration_identity: {
      configuration_id: configurationId,
      configuration_sha256: configurationSha256,
    },
  };
}

function identityFor(entry: EngineRegistryEntryV1) {
  return {
    engine_id: entry.descriptor.engine_id,
    implementation_identity: entry.descriptor.implementation_identity,
    configuration_identity: entry.configuration_identity,
  };
}

function observation(
  entry: EngineRegistryEntryV1,
  state: EngineAvailabilityObservationInputV1["state"],
  reasonCode: string,
): EngineAvailabilityObservationInputV1 {
  return {
    identity: identityFor(entry),
    state,
    reason_code: reasonCode,
  };
}

describe("UA-P02-T02 Availability model", () => {
  it("defaults missing observations to explicit UNAVAILABLE", () => {
    const engine = registryEntry(
      "engine:native",
      "implementation:native",
      A,
      "configuration:native",
      B,
    );
    const registry = createEngineRegistryV1([engine]);

    const snapshot = createEngineAvailabilitySnapshotV1(registry, []);

    expect(snapshot.entries).toEqual([
      {
        identity: identityFor(engine),
        state: "UNAVAILABLE",
        reason_code: "NO_AVAILABILITY_OBSERVATION",
      },
    ]);
  });

  it("represents explicit AVAILABLE without implying qualification", () => {
    const engine = registryEntry(
      "engine:native",
      "implementation:native",
      A,
      "configuration:native",
      B,
    );
    const registry = createEngineRegistryV1([engine]);

    const snapshot = createEngineAvailabilitySnapshotV1(registry, [
      observation(engine, "AVAILABLE", "LOCAL_IMPLEMENTATION_PRESENT"),
    ]);
    const available = snapshot.entries[0];

    expect(available?.state).toBe("AVAILABLE");
    expect(available?.reason_code).toBe("LOCAL_IMPLEMENTATION_PRESENT");
    expect("qualified" in (available ?? {})).toBe(false);
    expect("qualification_id" in (available ?? {})).toBe(false);
  });

  it("represents explicit UNAVAILABLE with a bounded reason", () => {
    const engine = registryEntry(
      "engine:external",
      "implementation:external",
      A,
      "configuration:external",
      B,
    );
    const registry = createEngineRegistryV1([engine]);

    const snapshot = createEngineAvailabilitySnapshotV1(registry, [
      observation(engine, "UNAVAILABLE", "LOCAL_IMPLEMENTATION_ABSENT"),
    ]);

    expect(snapshot.entries[0]?.state).toBe("UNAVAILABLE");
    expect(snapshot.entries[0]?.reason_code).toBe(
      "LOCAL_IMPLEMENTATION_ABSENT",
    );
  });

  it("represents NOT_QUALIFIED without performing qualification lookup", () => {
    const engine = registryEntry(
      "engine:review",
      "implementation:review",
      A,
      "configuration:review",
      B,
    );
    const registry = createEngineRegistryV1([engine]);

    const snapshot = createEngineAvailabilitySnapshotV1(registry, [
      observation(engine, "NOT_QUALIFIED", "QUALIFICATION_NOT_PROVEN"),
    ]);

    expect(snapshot.entries[0]?.state).toBe("NOT_QUALIFIED");
    expect(snapshot.entries[0]?.reason_code).toBe(
      "QUALIFICATION_NOT_PROVEN",
    );
    expect("qualification" in (snapshot.entries[0] ?? {})).toBe(false);
  });

  it("preserves exact registry identity for each outcome", () => {
    const first = registryEntry(
      "engine:review",
      "implementation:review",
      A,
      "configuration:standard",
      B,
    );
    const second = registryEntry(
      "engine:review",
      "implementation:review",
      A,
      "configuration:strict",
      C,
    );
    const registry = createEngineRegistryV1([second, first]);

    const snapshot = createEngineAvailabilitySnapshotV1(registry, [
      observation(second, "AVAILABLE", "LOCAL_IMPLEMENTATION_PRESENT"),
      observation(first, "UNAVAILABLE", "CONFIGURATION_NOT_PRESENT"),
    ]);

    expect(
      findEngineAvailabilityEntryV1(registry, snapshot, identityFor(first))
        ?.state,
    ).toBe("UNAVAILABLE");
    expect(
      findEngineAvailabilityEntryV1(registry, snapshot, identityFor(second))
        ?.state,
    ).toBe("AVAILABLE");
  });

  it("rejects observations for unregistered exact identities", () => {
    const registered = registryEntry(
      "engine:native",
      "implementation:native",
      A,
      "configuration:native",
      B,
    );
    const other = registryEntry(
      "engine:other",
      "implementation:other",
      C,
      "configuration:other",
      D,
    );
    const registry = createEngineRegistryV1([registered]);

    expect(() =>
      createEngineAvailabilitySnapshotV1(registry, [
        observation(other, "AVAILABLE", "LOCAL_IMPLEMENTATION_PRESENT"),
      ]),
    ).toThrow("availability observation identity is not registered");
  });

  it("rejects duplicate observations for the same exact identity", () => {
    const engine = registryEntry(
      "engine:native",
      "implementation:native",
      A,
      "configuration:native",
      B,
    );
    const registry = createEngineRegistryV1([engine]);

    expect(() =>
      createEngineAvailabilitySnapshotV1(registry, [
        observation(engine, "AVAILABLE", "LOCAL_IMPLEMENTATION_PRESENT"),
        observation(engine, "UNAVAILABLE", "LOCAL_IMPLEMENTATION_ABSENT"),
      ]),
    ).toThrow("duplicate exact identity");
  });

  it("rejects unsupported states and malformed reason codes", () => {
    const engine = registryEntry(
      "engine:native",
      "implementation:native",
      A,
      "configuration:native",
      B,
    );
    const registry = createEngineRegistryV1([engine]);

    expect(() =>
      createEngineAvailabilitySnapshotV1(registry, [
        {
          ...observation(engine, "AVAILABLE", "LOCAL_IMPLEMENTATION_PRESENT"),
          state: "UNKNOWN",
        } as unknown as EngineAvailabilityObservationInputV1,
      ]),
    ).toThrow("availability state is invalid or unsupported");

    expect(() =>
      createEngineAvailabilitySnapshotV1(registry, [
        observation(engine, "UNAVAILABLE", "not bounded"),
      ]),
    ).toThrow("uppercase bounded state identifier");
  });

  it("rejects unknown authority or qualification-like fields", () => {
    const engine = registryEntry(
      "engine:native",
      "implementation:native",
      A,
      "configuration:native",
      B,
    );
    const registry = createEngineRegistryV1([engine]);

    expect(() =>
      createEngineAvailabilitySnapshotV1(registry, [
        {
          ...observation(engine, "AVAILABLE", "LOCAL_IMPLEMENTATION_PRESENT"),
          execution_authority: true,
        } as unknown as EngineAvailabilityObservationInputV1,
      ]),
    ).toThrow("availability observation contains missing or unknown fields");

    expect(() =>
      createEngineAvailabilitySnapshotV1(registry, [
        {
          ...observation(engine, "AVAILABLE", "LOCAL_IMPLEMENTATION_PRESENT"),
          qualified: true,
        } as unknown as EngineAvailabilityObservationInputV1,
      ]),
    ).toThrow("availability observation contains missing or unknown fields");
  });

  it("is deterministic regardless of observation insertion order", () => {
    const first = registryEntry(
      "engine:a",
      "implementation:a",
      A,
      "configuration:a",
      B,
    );
    const second = registryEntry(
      "engine:z",
      "implementation:z",
      C,
      "configuration:z",
      D,
    );
    const registry = createEngineRegistryV1([second, first]);

    const left = createEngineAvailabilitySnapshotV1(registry, [
      observation(second, "AVAILABLE", "LOCAL_IMPLEMENTATION_PRESENT"),
      observation(first, "UNAVAILABLE", "LOCAL_IMPLEMENTATION_ABSENT"),
    ]);
    const right = createEngineAvailabilitySnapshotV1(registry, [
      observation(first, "UNAVAILABLE", "LOCAL_IMPLEMENTATION_ABSENT"),
      observation(second, "AVAILABLE", "LOCAL_IMPLEMENTATION_PRESENT"),
    ]);

    expect(left).toEqual(right);
    expect(canonicalAssuranceSha256V1(left)).toBe(
      canonicalAssuranceSha256V1(right),
    );
  });

  it("rejects availability lookup against a different registry snapshot", () => {
    const first = registryEntry(
      "engine:first",
      "implementation:first",
      A,
      "configuration:first",
      B,
    );
    const second = registryEntry(
      "engine:second",
      "implementation:second",
      C,
      "configuration:second",
      D,
    );
    const firstRegistry = createEngineRegistryV1([first]);
    const secondRegistry = createEngineRegistryV1([first, second]);
    const snapshot = createEngineAvailabilitySnapshotV1(firstRegistry, [
      observation(first, "AVAILABLE", "LOCAL_IMPLEMENTATION_PRESENT"),
    ]);

    expect(() =>
      findEngineAvailabilityEntryV1(
        secondRegistry,
        snapshot,
        identityFor(first),
      ),
    ).toThrow("availability snapshot registry identity mismatch");
  });

  it("returns no availability for a valid but unregistered identity", () => {
    const registered = registryEntry(
      "engine:native",
      "implementation:native",
      A,
      "configuration:native",
      B,
    );
    const other = registryEntry(
      "engine:other",
      "implementation:other",
      C,
      "configuration:other",
      D,
    );
    const registry = createEngineRegistryV1([registered]);
    const snapshot = createEngineAvailabilitySnapshotV1(registry, []);

    expect(
      findEngineAvailabilityEntryV1(registry, snapshot, identityFor(other)),
    ).toBeUndefined();
  });

  it("keeps the snapshot deeply frozen and effect-free", () => {
    const engine = registryEntry(
      "engine:native",
      "implementation:native",
      A,
      "configuration:native",
      B,
    );
    const registry = createEngineRegistryV1([engine]);
    const snapshot = createEngineAvailabilitySnapshotV1(registry, [
      observation(engine, "AVAILABLE", "LOCAL_IMPLEMENTATION_PRESENT"),
    ]);

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.entries)).toBe(true);
    expect(Object.isFrozen(snapshot.entries[0] ?? {})).toBe(true);
    expect("process_authority" in snapshot).toBe(false);
    expect("network_authority" in snapshot).toBe(false);
    expect("execution_authority" in snapshot).toBe(false);
  });
});
