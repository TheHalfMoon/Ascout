import { createEngineDescriptorV1 } from "../../contracts/engine-descriptor.js";
import type { EngineDescriptorV1 } from "../../contracts/engine-descriptor.js";
import type { EngineConfigurationIdentityV1 } from "../../contracts/engine-qualification.js";

export const NATIVE_ENGINE_ID = "engine:ascout-native" as const;
export const NATIVE_IMPLEMENTATION_ID = "implementation:ascout-native" as const;
export const NATIVE_SOURCE_IDENTITY = "source:ascout" as const;
export const NATIVE_VERSION = "1.0.0" as const;
export const NATIVE_CONFIGURATION_ID = "configuration:ascout-native" as const;

const NATIVE_ARTIFACT_SHA256 =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const NATIVE_CONFIGURATION_SHA256 =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function createNativeEngineDescriptorV1(): EngineDescriptorV1 {
  return deepFreeze(
    createEngineDescriptorV1({
      engine_id: NATIVE_ENGINE_ID,
      engine_kind: "INTERNAL",
      implementation_identity: {
        implementation_id: NATIVE_IMPLEMENTATION_ID,
        source_identity: NATIVE_SOURCE_IDENTITY,
        version: NATIVE_VERSION,
        artifact_sha256: NATIVE_ARTIFACT_SHA256,
      },
      capabilities: ["capability:check"],
      supported_inputs: ["input:source"],
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
        provenance_ref: "provenance:ascout-native",
        admission_state: "ADMITTED",
      },
      qualification_evidence_refs: [],
      known_limitations: ["Native adapter is a read-only projection."],
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
    }),
  );
}

export function nativeEngineConfigurationIdentityV1(): EngineConfigurationIdentityV1 {
  return deepFreeze({
    configuration_id: NATIVE_CONFIGURATION_ID,
    configuration_sha256: NATIVE_CONFIGURATION_SHA256,
  });
}

export function nativeEngineRegistryEntryV1(): {
  readonly descriptor: EngineDescriptorV1;
  readonly configuration_identity: EngineConfigurationIdentityV1;
} {
  return deepFreeze({
    descriptor: createNativeEngineDescriptorV1(),
    configuration_identity: nativeEngineConfigurationIdentityV1(),
  });
}
