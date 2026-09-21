import { canonicalAssuranceJsonV1 } from "../contracts/canonical-serialization.js";
import {
  parseEngineDescriptorV1,
  type EngineDescriptorV1,
  type EngineImplementationIdentityV1,
} from "../contracts/engine-descriptor.js";
import type { EngineConfigurationIdentityV1 } from "../contracts/engine-qualification.js";

export const ENGINE_REGISTRY_SCHEMA_VERSION = 1 as const;

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const MAX_REGISTRY_ENTRIES = 512;

export interface EngineRegistryIdentityV1 {
  readonly engine_id: string;
  readonly implementation_identity: EngineImplementationIdentityV1;
  readonly configuration_identity: EngineConfigurationIdentityV1;
}

export interface EngineRegistryEntryV1 {
  readonly descriptor: EngineDescriptorV1;
  readonly configuration_identity: EngineConfigurationIdentityV1;
}

export interface EngineRegistryV1 {
  readonly schema_version: 1;
  readonly entries: readonly EngineRegistryEntryV1[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError(field + " must be an object");
  }
  return value;
}

function requireExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  field: string,
): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new TypeError(field + " contains missing or unknown fields");
  }
}

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be a bounded opaque identifier");
  }
  return value;
}

function requireSha256(value: unknown, field: string): string {
  if (typeof value !== "string" || !SHA256_HEX.test(value)) {
    throw new TypeError(field + " must be lowercase sha256");
  }
  return value;
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
    version: requireOpaqueId(
      record.version,
      "implementation_identity.version",
    ),
    artifact_sha256: requireSha256(
      record.artifact_sha256,
      "implementation_identity.artifact_sha256",
    ),
  };
}

function parseConfigurationIdentity(
  value: unknown,
): EngineConfigurationIdentityV1 {
  const record = requireRecord(value, "configuration_identity");
  requireExactKeys(
    record,
    ["configuration_id", "configuration_sha256"],
    "configuration_identity",
  );
  return {
    configuration_id: requireOpaqueId(
      record.configuration_id,
      "configuration_identity.configuration_id",
    ),
    configuration_sha256: requireSha256(
      record.configuration_sha256,
      "configuration_identity.configuration_sha256",
    ),
  };
}

function parseRegistryIdentity(value: unknown): EngineRegistryIdentityV1 {
  const record = requireRecord(value, "engine registry identity");
  requireExactKeys(
    record,
    ["engine_id", "implementation_identity", "configuration_identity"],
    "engine registry identity",
  );
  return {
    engine_id: requireOpaqueId(record.engine_id, "engine_id"),
    implementation_identity: parseImplementationIdentity(
      record.implementation_identity,
    ),
    configuration_identity: parseConfigurationIdentity(
      record.configuration_identity,
    ),
  };
}

function parseRegistryEntry(value: unknown): EngineRegistryEntryV1 {
  const record = requireRecord(value, "engine registry entry");
  requireExactKeys(
    record,
    ["descriptor", "configuration_identity"],
    "engine registry entry",
  );
  return {
    descriptor: parseEngineDescriptorV1(record.descriptor),
    configuration_identity: parseConfigurationIdentity(
      record.configuration_identity,
    ),
  };
}

function identityFromEntry(entry: EngineRegistryEntryV1): EngineRegistryIdentityV1 {
  return {
    engine_id: entry.descriptor.engine_id,
    implementation_identity: entry.descriptor.implementation_identity,
    configuration_identity: entry.configuration_identity,
  };
}

function identityKey(identity: EngineRegistryIdentityV1): string {
  return canonicalAssuranceJsonV1([
    identity.engine_id,
    identity.implementation_identity.implementation_id,
    identity.implementation_identity.source_identity,
    identity.implementation_identity.version,
    identity.implementation_identity.artifact_sha256,
    identity.configuration_identity.configuration_id,
    identity.configuration_identity.configuration_sha256,
  ]);
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

export function createEngineRegistryV1(
  entries: readonly EngineRegistryEntryV1[],
): EngineRegistryV1 {
  if (!Array.isArray(entries) || entries.length > MAX_REGISTRY_ENTRIES) {
    throw new TypeError(
      "engine registry must contain at most " +
        MAX_REGISTRY_ENTRIES +
        " entries",
    );
  }

  const parsed = entries.map((entry) => parseRegistryEntry(entry));
  const seen = new Set<string>();

  for (const entry of parsed) {
    const key = identityKey(identityFromEntry(entry));
    if (seen.has(key)) {
      throw new TypeError(
        "engine registry contains ambiguous duplicate exact identity",
      );
    }
    seen.add(key);
  }

  parsed.sort((left, right) =>
    identityKey(identityFromEntry(left)).localeCompare(
      identityKey(identityFromEntry(right)),
    ),
  );

  return deepFreeze({
    schema_version: ENGINE_REGISTRY_SCHEMA_VERSION,
    entries: parsed,
  });
}

export function findEngineRegistryEntryV1(
  registry: EngineRegistryV1,
  identity: EngineRegistryIdentityV1,
): EngineRegistryEntryV1 | undefined {
  const parsedIdentity = parseRegistryIdentity(identity);
  const wanted = identityKey(parsedIdentity);

  return registry.entries.find(
    (entry) => identityKey(identityFromEntry(entry)) === wanted,
  );
}
