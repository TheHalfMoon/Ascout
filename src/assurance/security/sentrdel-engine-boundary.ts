import {
  createEngineDescriptorV1,
  type EngineDescriptorV1,
} from "../contracts/engine-descriptor.js";
import { SENTRDEL_PIN_REF } from "./sentrdel-source-pin.js";

export const SENTRDEL_ENGINE_ID = "engine:sentrdel" as const;
export const SENTRDEL_IMPLEMENTATION_ID =
  "implementation:sentrdel-external" as const;
export const SENTRDEL_SOURCE_IDENTITY = "source:sentrdel" as const;
export const SENTRDEL_ENGINE_VERSION = "0.0.0" as const;
export const SENTRDEL_CONFIGURATION_ID = "configuration:sentrdel-pin-v1" as const;

export const SENTRDEL_ENGINE_KIND = "EXTERNAL" as const;

export const SENTRDEL_CAPABILITIES = [
  "capability:security-observation",
] as const;

export const SENTRDEL_SUPPORTED_INPUTS = ["input:source"] as const;

export const SENTRDEL_SUPPORTED_OUTPUTS = [
  "output:security-observation",
] as const;

export const SENTRDEL_TRUSTED_CONFIGURATION_SOURCES = [
  "config:sentrdel-pin-v1",
] as const;

export const SENTRDEL_QUALIFICATION_EVIDENCE_REFS = [
  "evidence:sentrdel-t01-pin",
] as const;

export const SENTRDEL_KNOWN_LIMITATIONS = [
  "Absence, version mismatch, or denial yields NOT_RUN or INCOMPLETE, never PASS.",
  "No binary digest is pinned in T01; execution is not admitted.",
  "SARIF is interchange only and never canonical truth.",
  "Security observations are inputs to findings and never findings themselves.",
  "Sentrdel remains an optional external engine behind the adapter boundary.",
  "T01 characterizes the pin only and adapts no donor code.",
] as const;

export const SENTRDEL_SELECTED_CAPABILITY_REFS = [
  "crates/sentrdel-schema/src/evidence.rs",
  "crates/sentrdel-schema/src/finding.rs",
  "crates/sentrdel-schema/src/coverage.rs",
  "crates/sentrdel-schema/src/asel.rs",
  "crates/sentrdel-engine/src/adapter.rs",
  "crates/sentrdel-engine/src/boundary.rs",
  "crates/sentrdel-engine/src/runner.rs",
  "crates/sentrdel-policy/src/kernel.rs",
  "crates/sentrdel-review/src/coverage.rs",
  "crates/sentrdel-store/src/redaction.rs",
  "schemas/v1/evidence.schema.json",
  "schemas/v1/finding.schema.json",
  "schemas/v1/coverage.schema.json",
] as const;

export const SENTRDEL_CONFIGURATION_SURFACES = [
  "schemas/v1/engine-manifest.schema.json",
  "schemas/v1/security-pack-manifest.schema.json",
  "schemas/v1/policy-decision.schema.json",
  "schemas/v1/project-profile.schema.json",
] as const;

export const SENTRDEL_OUTPUT_SURFACES = [
  "schemas/v1/evidence.schema.json",
  "schemas/v1/finding.schema.json",
  "schemas/v1/coverage.schema.json",
  "schemas/v1/asel-event.schema.json",
] as const;

export const SENTRDEL_UNSUPPORTED_SCOPE = [
  "credentialed live posture and runtime verification",
  "dynamic exploit proof and production probing",
  "remote MCP enforcement",
  "sandboxed verification and runtime enforcement",
  "universal framework and language coverage",
] as const;

export const SENTRDEL_ABSENCE_STATUSES = ["NOT_RUN", "INCOMPLETE"] as const;

export type SentrdelAbsenceStatusV1 =
  (typeof SENTRDEL_ABSENCE_STATUSES)[number];

export interface SentrdelAbsenceV1 {
  readonly status: SentrdelAbsenceStatusV1;
  readonly reason_code: string;
  readonly reason_text: string;
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function createSentrdelEngineDescriptorV1(): EngineDescriptorV1 {
  return deepFreeze(
    createEngineDescriptorV1({
      engine_id: SENTRDEL_ENGINE_ID,
      engine_kind: SENTRDEL_ENGINE_KIND,
      implementation_identity: {
        implementation_id: SENTRDEL_IMPLEMENTATION_ID,
        source_identity: SENTRDEL_SOURCE_IDENTITY,
        version: SENTRDEL_ENGINE_VERSION,
        artifact_sha256:
          "0000000000000000000000000000000000000000000000000000000000000000",
      },
      capabilities: [...SENTRDEL_CAPABILITIES],
      supported_inputs: [...SENTRDEL_SUPPORTED_INPUTS],
      supported_outputs: [...SENTRDEL_SUPPORTED_OUTPUTS],
      effect_classes: ["E0_READ_ONLY_ANALYSIS"],
      requirements: {
        process_required: false,
        network_required: false,
        provider_requirements: [],
        sandbox_required: false,
      },
      configuration_trust_boundary: {
        trusted_configuration_sources: [
          ...SENTRDEL_TRUSTED_CONFIGURATION_SOURCES,
        ],
        advisory_configuration_sources: [],
      },
      license_provenance_state: {
        license_identity: "license:apache-2.0",
        provenance_ref: SENTRDEL_PIN_REF,
        admission_state: "CHARACTERIZED",
      },
      qualification_evidence_refs: [...SENTRDEL_QUALIFICATION_EVIDENCE_REFS],
      known_limitations: [...SENTRDEL_KNOWN_LIMITATIONS],
      authority_ceiling: "E0_READ_ONLY_ANALYSIS",
    }),
  );
}

export function isSentrdelExternalOptionalEngineV1(): boolean {
  return SENTRDEL_ENGINE_KIND === "EXTERNAL";
}

export function requiresRustToolchainForCoreV1(): boolean {
  return false;
}

export function requiresNetworkForCoreV1(): boolean {
  return false;
}

export function requiresProviderForCoreV1(): boolean {
  return false;
}

export function requiresDaemonForCoreV1(): boolean {
  return false;
}

export function securityObservationIsFindingV1(): boolean {
  return false;
}

export function securityPassIsSupportedClaimV1(): boolean {
  return false;
}

export function sarifImportIsCanonicalTruthV1(): boolean {
  return false;
}

export function resolveSentrdelAbsenceV1(
  reason_code: string,
  reason_text: string,
): SentrdelAbsenceV1 {
  const code = reason_code.trim();
  const text = reason_text.trim();
  if (code.length === 0 || text.length === 0) {
    return Object.freeze({
      status: "NOT_RUN" as const,
      reason_code: "sentrdel_unavailable",
      reason_text: "Sentrdel engine is unavailable and no security ran.",
    });
  }
  return Object.freeze({
    status: "NOT_RUN" as const,
    reason_code: code,
    reason_text: text,
  });
}

export interface SentrdelBoundaryCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

export function assertSentrdelEngineBoundaryV1(
  descriptor: EngineDescriptorV1,
): SentrdelBoundaryCheckV1 {
  const reasons: string[] = [];
  if (descriptor.engine_id !== SENTRDEL_ENGINE_ID) {
    reasons.push("engine id must be engine:sentrdel");
  }
  if (descriptor.engine_kind !== "EXTERNAL") {
    reasons.push("Sentrdel must remain an EXTERNAL engine");
  }
  if (descriptor.requirements.network_required !== false) {
    reasons.push("T01 must not introduce a core network requirement");
  }
  if (descriptor.requirements.provider_requirements.length !== 0) {
    reasons.push("T01 must not introduce a core provider requirement");
  }
  if (descriptor.requirements.sandbox_required !== false) {
    reasons.push("T01 must not introduce a core sandbox requirement");
  }
  if (
    descriptor.license_provenance_state.license_identity !==
    "license:apache-2.0"
  ) {
    reasons.push("license identity must be license:apache-2.0");
  }
  if (descriptor.license_provenance_state.provenance_ref !== SENTRDEL_PIN_REF) {
    reasons.push("provenance ref must bind the exact Sentrdel pin");
  }
  if (descriptor.license_provenance_state.admission_state !== "CHARACTERIZED") {
    reasons.push("admission state must be CHARACTERIZED in T01");
  }
  if (descriptor.authority_ceiling !== "E0_READ_ONLY_ANALYSIS") {
    reasons.push("authority ceiling must remain E0_READ_ONLY_ANALYSIS");
  }
  if (securityObservationIsFindingV1()) {
    reasons.push("security observation must not equal finding");
  }
  if (securityPassIsSupportedClaimV1()) {
    reasons.push("security pass must not equal supported claim");
  }
  if (sarifImportIsCanonicalTruthV1()) {
    reasons.push("SARIF import must not equal canonical truth");
  }
  if (!isSentrdelExternalOptionalEngineV1()) {
    reasons.push("Sentrdel must remain an optional external engine");
  }
  if (requiresRustToolchainForCoreV1()) {
    reasons.push("core must not require a Rust toolchain");
  }
  if (requiresNetworkForCoreV1()) {
    reasons.push("core must not require network");
  }
  if (requiresProviderForCoreV1()) {
    reasons.push("core must not require a provider");
  }
  if (requiresDaemonForCoreV1()) {
    reasons.push("core must not require a daemon");
  }
  return { ok: reasons.length === 0, reasons: Object.freeze(reasons) };
}
