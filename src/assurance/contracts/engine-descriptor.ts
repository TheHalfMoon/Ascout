import { isDeepStrictEqual } from "node:util";

import {
  ASSURANCE_EFFECT_CLASSES,
  type AssuranceEffectClass,
} from "./intent.js";

export const ENGINE_DESCRIPTOR_SCHEMA_VERSION = 1 as const;

export const ENGINE_KINDS = ["INTERNAL", "EXTERNAL"] as const;

export type EngineKind = (typeof ENGINE_KINDS)[number];

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const STATE_ID = /^[A-Z][A-Z0-9_]{0,63}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const MAX_LIST_ITEMS = 256;
const MAX_LIMITATION_LENGTH = 512;

export interface EngineImplementationIdentityV1 {
  readonly implementation_id: string;
  readonly source_identity: string;
  readonly version: string;
  readonly artifact_sha256: string;
}

export interface EngineRequirementsV1 {
  readonly process_required: boolean;
  readonly network_required: boolean;
  readonly provider_requirements: readonly string[];
  readonly sandbox_required: boolean;
}

export interface EngineConfigurationTrustBoundaryV1 {
  readonly trusted_configuration_sources: readonly string[];
  readonly advisory_configuration_sources: readonly string[];
}

export interface EngineLicenseProvenanceStateV1 {
  readonly license_identity: string;
  readonly provenance_ref: string;
  readonly admission_state: string;
}

export interface EngineDescriptorV1 {
  readonly schema_version: 1;
  readonly engine_id: string;
  readonly engine_kind: EngineKind;
  readonly implementation_identity: EngineImplementationIdentityV1;
  readonly capabilities: readonly string[];
  readonly supported_inputs: readonly string[];
  readonly supported_outputs: readonly string[];
  readonly effect_classes: readonly AssuranceEffectClass[];
  readonly requirements: EngineRequirementsV1;
  readonly configuration_trust_boundary: EngineConfigurationTrustBoundaryV1;
  readonly license_provenance_state: EngineLicenseProvenanceStateV1;
  readonly qualification_evidence_refs: readonly string[];
  readonly known_limitations: readonly string[];
  readonly authority_ceiling: AssuranceEffectClass;
}

export type EngineDescriptorInputV1 = Omit<EngineDescriptorV1, "schema_version">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(field + " must be an object");
  return value;
}

function requireExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  field: string,
): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (!isDeepStrictEqual(actual, wanted)) {
    throw new TypeError(field + " contains missing or unknown fields");
  }
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new TypeError(field + " must be boolean");
  }
  return value;
}

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be a bounded opaque identifier");
  }
  return value;
}

function requireStateId(value: unknown, field: string): string {
  if (typeof value !== "string" || !STATE_ID.test(value)) {
    throw new TypeError(field + " must be an uppercase bounded state identifier");
  }
  return value;
}

function requireSha256(value: unknown, field: string): string {
  if (typeof value !== "string" || !SHA256_HEX.test(value)) {
    throw new TypeError(field + " must be lowercase sha256");
  }
  return value;
}

function normalizeOpaqueIds(
  values: readonly string[],
  field: string,
): readonly string[] {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = values.map((value, index) =>
    requireOpaqueId(value, field + "[" + index + "]"),
  );
  return [...new Set(parsed)].sort();
}

function parseCanonicalOpaqueIds(
  value: unknown,
  field: string,
): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = value.map((entry, index) =>
    requireOpaqueId(entry, field + "[" + index + "]"),
  );
  const canonical = [...new Set(parsed)].sort();
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError(field + " must be unique and canonically sorted");
  }
  return parsed;
}

function normalizeEffects(
  values: readonly AssuranceEffectClass[],
): readonly AssuranceEffectClass[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError("effect_classes must contain at least one effect class");
  }
  if (values.length > ASSURANCE_EFFECT_CLASSES.length) {
    throw new TypeError("effect_classes contains too many effect classes");
  }
  const seen = new Set<AssuranceEffectClass>();
  for (const value of values) {
    if (!ASSURANCE_EFFECT_CLASSES.includes(value)) {
      throw new TypeError("effect_classes contains invalid effect class");
    }
    seen.add(value);
  }
  return ASSURANCE_EFFECT_CLASSES.filter((effect) => seen.has(effect));
}

function parseCanonicalEffects(value: unknown): readonly AssuranceEffectClass[] {
  if (!Array.isArray(value)) {
    throw new TypeError("effect_classes must be an array");
  }
  const parsed = value.map((entry) => {
    if (
      typeof entry !== "string" ||
      !ASSURANCE_EFFECT_CLASSES.includes(entry as AssuranceEffectClass)
    ) {
      throw new TypeError("effect_classes contains invalid effect class");
    }
    return entry as AssuranceEffectClass;
  });
  const canonical = normalizeEffects(parsed);
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError("effect_classes must be unique and canonically ordered");
  }
  return parsed;
}

function parseImplementationIdentity(
  value: unknown,
): EngineImplementationIdentityV1 {
  const record = requireRecord(value, "implementation_identity");
  requireExactKeys(
    record,
    ["implementation_id", "source_identity", "version", "artifact_sha256"],
    "implementation_identity",
  );
  return {
    implementation_id: requireOpaqueId(
      record.implementation_id,
      "implementation_identity.implementation_id",
    ),
    source_identity: requireOpaqueId(
      record.source_identity,
      "implementation_identity.source_identity",
    ),
    version: requireOpaqueId(record.version, "implementation_identity.version"),
    artifact_sha256: requireSha256(
      record.artifact_sha256,
      "implementation_identity.artifact_sha256",
    ),
  };
}

function parseRequirements(value: unknown): EngineRequirementsV1 {
  const record = requireRecord(value, "requirements");
  requireExactKeys(
    record,
    [
      "process_required",
      "network_required",
      "provider_requirements",
      "sandbox_required",
    ],
    "requirements",
  );
  return {
    process_required: requireBoolean(
      record.process_required,
      "requirements.process_required",
    ),
    network_required: requireBoolean(
      record.network_required,
      "requirements.network_required",
    ),
    provider_requirements: parseCanonicalOpaqueIds(
      record.provider_requirements,
      "requirements.provider_requirements",
    ),
    sandbox_required: requireBoolean(
      record.sandbox_required,
      "requirements.sandbox_required",
    ),
  };
}

function parseConfigurationTrustBoundary(
  value: unknown,
): EngineConfigurationTrustBoundaryV1 {
  const record = requireRecord(value, "configuration_trust_boundary");
  requireExactKeys(
    record,
    [
      "trusted_configuration_sources",
      "advisory_configuration_sources",
    ],
    "configuration_trust_boundary",
  );
  const trusted = parseCanonicalOpaqueIds(
    record.trusted_configuration_sources,
    "configuration_trust_boundary.trusted_configuration_sources",
  );
  const advisory = parseCanonicalOpaqueIds(
    record.advisory_configuration_sources,
    "configuration_trust_boundary.advisory_configuration_sources",
  );
  const trustedSet = new Set(trusted);
  const overlap = advisory.find((entry) => trustedSet.has(entry));
  if (overlap !== undefined) {
    throw new TypeError(
      "configuration trust boundary contains overlapping source: " + overlap,
    );
  }
  return {
    trusted_configuration_sources: trusted,
    advisory_configuration_sources: advisory,
  };
}

function parseLicenseProvenanceState(
  value: unknown,
): EngineLicenseProvenanceStateV1 {
  const record = requireRecord(value, "license_provenance_state");
  requireExactKeys(
    record,
    ["license_identity", "provenance_ref", "admission_state"],
    "license_provenance_state",
  );
  return {
    license_identity: requireOpaqueId(
      record.license_identity,
      "license_provenance_state.license_identity",
    ),
    provenance_ref: requireOpaqueId(
      record.provenance_ref,
      "license_provenance_state.provenance_ref",
    ),
    admission_state: requireStateId(
      record.admission_state,
      "license_provenance_state.admission_state",
    ),
  };
}

function requireLimitation(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > MAX_LIMITATION_LENGTH ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    throw new TypeError(field + " must be bounded non-empty single-line text");
  }
  return value;
}

function normalizeLimitations(values: readonly string[]): readonly string[] {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS) {
    throw new TypeError(
      "known_limitations must contain at most " + MAX_LIST_ITEMS + " items",
    );
  }
  const parsed = values.map((value, index) =>
    requireLimitation(value, "known_limitations[" + index + "]"),
  );
  return [...new Set(parsed)].sort();
}

function parseCanonicalLimitations(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    throw new TypeError(
      "known_limitations must contain at most " + MAX_LIST_ITEMS + " items",
    );
  }
  const parsed = value.map((entry, index) =>
    requireLimitation(entry, "known_limitations[" + index + "]"),
  );
  const canonical = [...new Set(parsed)].sort();
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError("known_limitations must be unique and canonically sorted");
  }
  return parsed;
}

function effectIndex(effect: AssuranceEffectClass): number {
  return ASSURANCE_EFFECT_CLASSES.indexOf(effect);
}

function requireAuthorityCeiling(
  authorityCeiling: AssuranceEffectClass,
  effects: readonly AssuranceEffectClass[],
): void {
  const highestDeclared = Math.max(...effects.map(effectIndex));
  if (effectIndex(authorityCeiling) > highestDeclared) {
    throw new TypeError(
      "authority_ceiling exceeds the highest declared engine effect class",
    );
  }
}

export function parseEngineDescriptorV1(value: unknown): EngineDescriptorV1 {
  const record = requireRecord(value, "engine descriptor");
  requireExactKeys(
    record,
    [
      "schema_version",
      "engine_id",
      "engine_kind",
      "implementation_identity",
      "capabilities",
      "supported_inputs",
      "supported_outputs",
      "effect_classes",
      "requirements",
      "configuration_trust_boundary",
      "license_provenance_state",
      "qualification_evidence_refs",
      "known_limitations",
      "authority_ceiling",
    ],
    "engine descriptor",
  );

  if (record.schema_version !== ENGINE_DESCRIPTOR_SCHEMA_VERSION) {
    throw new TypeError("engine descriptor schema_version must equal 1");
  }
  if (
    typeof record.engine_kind !== "string" ||
    !ENGINE_KINDS.includes(record.engine_kind as EngineKind)
  ) {
    throw new TypeError("engine_kind is invalid or unsupported");
  }
  if (
    typeof record.authority_ceiling !== "string" ||
    !ASSURANCE_EFFECT_CLASSES.includes(
      record.authority_ceiling as AssuranceEffectClass,
    )
  ) {
    throw new TypeError("authority_ceiling is invalid or unsupported");
  }

  const effects = parseCanonicalEffects(record.effect_classes);
  const authorityCeiling = record.authority_ceiling as AssuranceEffectClass;
  requireAuthorityCeiling(authorityCeiling, effects);

  return {
    schema_version: ENGINE_DESCRIPTOR_SCHEMA_VERSION,
    engine_id: requireOpaqueId(record.engine_id, "engine_id"),
    engine_kind: record.engine_kind as EngineKind,
    implementation_identity: parseImplementationIdentity(
      record.implementation_identity,
    ),
    capabilities: parseCanonicalOpaqueIds(record.capabilities, "capabilities"),
    supported_inputs: parseCanonicalOpaqueIds(
      record.supported_inputs,
      "supported_inputs",
    ),
    supported_outputs: parseCanonicalOpaqueIds(
      record.supported_outputs,
      "supported_outputs",
    ),
    effect_classes: effects,
    requirements: parseRequirements(record.requirements),
    configuration_trust_boundary: parseConfigurationTrustBoundary(
      record.configuration_trust_boundary,
    ),
    license_provenance_state: parseLicenseProvenanceState(
      record.license_provenance_state,
    ),
    qualification_evidence_refs: parseCanonicalOpaqueIds(
      record.qualification_evidence_refs,
      "qualification_evidence_refs",
    ),
    known_limitations: parseCanonicalLimitations(record.known_limitations),
    authority_ceiling: authorityCeiling,
  };
}

export function createEngineDescriptorV1(
  input: EngineDescriptorInputV1,
): EngineDescriptorV1 {
  return parseEngineDescriptorV1({
    schema_version: ENGINE_DESCRIPTOR_SCHEMA_VERSION,
    engine_id: input.engine_id,
    engine_kind: input.engine_kind,
    implementation_identity: input.implementation_identity,
    capabilities: normalizeOpaqueIds(input.capabilities, "capabilities"),
    supported_inputs: normalizeOpaqueIds(
      input.supported_inputs,
      "supported_inputs",
    ),
    supported_outputs: normalizeOpaqueIds(
      input.supported_outputs,
      "supported_outputs",
    ),
    effect_classes: normalizeEffects(input.effect_classes),
    requirements: {
      process_required: input.requirements.process_required,
      network_required: input.requirements.network_required,
      provider_requirements: normalizeOpaqueIds(
        input.requirements.provider_requirements,
        "requirements.provider_requirements",
      ),
      sandbox_required: input.requirements.sandbox_required,
    },
    configuration_trust_boundary: {
      trusted_configuration_sources: normalizeOpaqueIds(
        input.configuration_trust_boundary.trusted_configuration_sources,
        "configuration_trust_boundary.trusted_configuration_sources",
      ),
      advisory_configuration_sources: normalizeOpaqueIds(
        input.configuration_trust_boundary.advisory_configuration_sources,
        "configuration_trust_boundary.advisory_configuration_sources",
      ),
    },
    license_provenance_state: input.license_provenance_state,
    qualification_evidence_refs: normalizeOpaqueIds(
      input.qualification_evidence_refs,
      "qualification_evidence_refs",
    ),
    known_limitations: normalizeLimitations(input.known_limitations),
    authority_ceiling: input.authority_ceiling,
  });
}

export function assertEngineImplementationIdentityV1(
  descriptor: unknown,
  implementationIdentity: unknown,
): void {
  const parsed = parseEngineDescriptorV1(descriptor);
  const identity = parseImplementationIdentity(implementationIdentity);
  if (!isDeepStrictEqual(parsed.implementation_identity, identity)) {
    throw new TypeError(
      "engine implementation identity mismatch; capability truth is inapplicable",
    );
  }
}
