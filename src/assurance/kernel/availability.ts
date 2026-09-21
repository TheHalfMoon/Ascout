import { canonicalAssuranceJsonV1 } from "../contracts/canonical-serialization.js";
import {
  findEngineRegistryEntryV1,
  type EngineRegistryEntryV1,
  type EngineRegistryIdentityV1,
  type EngineRegistryV1,
} from "./registry.js";

export const ENGINE_AVAILABILITY_SCHEMA_VERSION = 1 as const;

export const ENGINE_AVAILABILITY_STATES = [
  "AVAILABLE",
  "UNAVAILABLE",
  "NOT_QUALIFIED",
] as const;

export type EngineAvailabilityStateV1 =
  (typeof ENGINE_AVAILABILITY_STATES)[number];

const STATE_ID = /^[A-Z][A-Z0-9_]{0,63}$/u;
const MAX_AVAILABILITY_OBSERVATIONS = 512;

export interface EngineAvailabilityObservationInputV1 {
  readonly identity: EngineRegistryIdentityV1;
  readonly state: EngineAvailabilityStateV1;
  readonly reason_code: string;
}

export interface EngineAvailabilityEntryV1 {
  readonly identity: EngineRegistryIdentityV1;
  readonly state: EngineAvailabilityStateV1;
  readonly reason_code: string;
}

export interface EngineAvailabilitySnapshotV1 {
  readonly schema_version: 1;
  readonly entries: readonly EngineAvailabilityEntryV1[];
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

function requireState(value: unknown): EngineAvailabilityStateV1 {
  if (
    typeof value !== "string" ||
    !ENGINE_AVAILABILITY_STATES.includes(value as EngineAvailabilityStateV1)
  ) {
    throw new TypeError("availability state is invalid or unsupported");
  }
  return value as EngineAvailabilityStateV1;
}

function requireReasonCode(value: unknown): string {
  if (typeof value !== "string" || !STATE_ID.test(value)) {
    throw new TypeError(
      "availability reason_code must be an uppercase bounded state identifier",
    );
  }
  return value;
}

function identityFromRegistryEntry(
  entry: EngineRegistryEntryV1,
): EngineRegistryIdentityV1 {
  return {
    engine_id: entry.descriptor.engine_id,
    implementation_identity: entry.descriptor.implementation_identity,
    configuration_identity: entry.configuration_identity,
  };
}

function identityKey(identity: EngineRegistryIdentityV1): string {
  return canonicalAssuranceJsonV1(identity);
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

function parseObservation(
  registry: EngineRegistryV1,
  value: unknown,
): EngineAvailabilityEntryV1 {
  const record = requireRecord(value, "availability observation");
  requireExactKeys(
    record,
    ["identity", "state", "reason_code"],
    "availability observation",
  );

  const identity = record.identity as EngineRegistryIdentityV1;
  const registered = findEngineRegistryEntryV1(registry, identity);
  if (registered === undefined) {
    throw new TypeError(
      "availability observation identity is not registered",
    );
  }

  return {
    identity: identityFromRegistryEntry(registered),
    state: requireState(record.state),
    reason_code: requireReasonCode(record.reason_code),
  };
}

export function createEngineAvailabilitySnapshotV1(
  registry: EngineRegistryV1,
  observations: readonly EngineAvailabilityObservationInputV1[],
): EngineAvailabilitySnapshotV1 {
  if (
    !Array.isArray(observations) ||
    observations.length > MAX_AVAILABILITY_OBSERVATIONS
  ) {
    throw new TypeError(
      "availability observations must contain at most " +
        MAX_AVAILABILITY_OBSERVATIONS +
        " items",
    );
  }

  const observed = new Map<string, EngineAvailabilityEntryV1>();
  for (const observation of observations) {
    const parsed = parseObservation(registry, observation);
    const key = identityKey(parsed.identity);
    if (observed.has(key)) {
      throw new TypeError(
        "availability observations contain duplicate exact identity",
      );
    }
    observed.set(key, parsed);
  }

  const entries = registry.entries.map((registryEntry) => {
    const identity = identityFromRegistryEntry(registryEntry);
    const observedEntry = observed.get(identityKey(identity));
    if (observedEntry !== undefined) {
      return observedEntry;
    }
    return {
      identity,
      state: "UNAVAILABLE" as const,
      reason_code: "NO_AVAILABILITY_OBSERVATION",
    };
  });

  return deepFreeze({
    schema_version: ENGINE_AVAILABILITY_SCHEMA_VERSION,
    entries,
  });
}

export function findEngineAvailabilityEntryV1(
  registry: EngineRegistryV1,
  snapshot: EngineAvailabilitySnapshotV1,
  identity: EngineRegistryIdentityV1,
): EngineAvailabilityEntryV1 | undefined {
  const registered = findEngineRegistryEntryV1(registry, identity);
  if (registered === undefined) {
    return undefined;
  }

  const wanted = identityKey(identityFromRegistryEntry(registered));
  return snapshot.entries.find((entry) => identityKey(entry.identity) === wanted);
}
