import { canonicalAssuranceSha256V1 } from "../../contracts/canonical-serialization.js";
import {
  createEngineDescriptorV1,
  type EngineDescriptorV1,
} from "../../contracts/engine-descriptor.js";

export const MOBILE_ARTEMIS_ENGINE_ID = "engine:mobile-artemis" as const;
export const MOBILE_ARTEMIS_IMPLEMENTATION_ID =
  "implementation:mobile-artemis" as const;
export const MOBILE_ARTEMIS_SOURCE_IDENTITY = "source:mobile-artemis" as const;
export const MOBILE_ARTEMIS_VERSION = "1.0.0" as const;
export const MOBILE_ARTEMIS_CONFIGURATION_ID =
  "configuration:mobile-artemis" as const;
export const MOBILE_ARTEMIS_DONOR_SHA =
  "371aa6df56880643da57b30da936e9812fb0ec66" as const;
export const MOBILE_ARTEMIS_PROVENANCE_REF =
  "provenance:artemis-a0-371aa6df56880643da57b30da936e9812fb0ec66" as const;

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function createMobileArtemisDescriptorV1(): EngineDescriptorV1 {
  return deepFreeze(
    createEngineDescriptorV1({
      engine_id: MOBILE_ARTEMIS_ENGINE_ID,
      engine_kind: "EXTERNAL",
      implementation_identity: {
        implementation_id: MOBILE_ARTEMIS_IMPLEMENTATION_ID,
        source_identity: MOBILE_ARTEMIS_SOURCE_IDENTITY,
        version: MOBILE_ARTEMIS_VERSION,
        artifact_sha256:
          "0000000000000000000000000000000000000000000000000000000000000000",
      },
      capabilities: ["capability:mobile-contract"],
      supported_inputs: ["input:mobile-request"],
      supported_outputs: ["output:mobile-evidence"],
      effect_classes: ["E0_READ_ONLY_ANALYSIS"],
      requirements: {
        process_required: false,
        network_required: false,
        provider_requirements: [],
        sandbox_required: false,
      },
      configuration_trust_boundary: {
        trusted_configuration_sources: ["config:mobile-artemis-v1"],
        advisory_configuration_sources: [],
      },
      license_provenance_state: {
        license_identity: "license:apache-2.0",
        provenance_ref: MOBILE_ARTEMIS_PROVENANCE_REF,
        admission_state: "ADMITTED",
      },
      qualification_evidence_refs: ["evidence:artemis-a0-intake"],
      known_limitations: [
        "A1 freezes contracts only. No device execution, sidecar, ADB, network, or provider authority is granted.",
      ],
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
    }),
  );
}

export function mobileArtemisDescriptorDigestV1(
  descriptor: EngineDescriptorV1,
): string {
  return canonicalAssuranceSha256V1(descriptor);
}
