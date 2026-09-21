import {
  ASSURANCE_EFFECT_CLASSES,
  type AssuranceEffectClass,
} from "../contracts/intent.js";
import {
  findEngineRegistryEntryV1,
  type EngineRegistryIdentityV1,
  type EngineRegistryV1,
} from "./registry.js";

export const ENGINE_AUTHORITY_CHECK_SCHEMA_VERSION = 1 as const;

export const ENGINE_AUTHORITY_RESULTS = ["WITHIN_CEILING", "DENIED"] as const;

export type EngineAuthorityResultV1 =
  (typeof ENGINE_AUTHORITY_RESULTS)[number];

export const ENGINE_AUTHORITY_REASON_CODES = [
  "DESCRIPTOR_AUTHORITY_SATISFIED",
  "CAPABILITY_NOT_DECLARED",
  "EFFECT_NOT_DECLARED",
  "EFFECT_EXCEEDS_DESCRIPTOR_AUTHORITY_CEILING",
] as const;

export type EngineAuthorityReasonCodeV1 =
  (typeof ENGINE_AUTHORITY_REASON_CODES)[number];

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const MAX_REQUESTED_CAPABILITIES = 256;

export interface EngineAuthorityRequestV1 {
  readonly identity: EngineRegistryIdentityV1;
  readonly capabilities: readonly string[];
  readonly effect_classes: readonly AssuranceEffectClass[];
}

export interface EngineAuthorityDecisionV1 {
  readonly schema_version: 1;
  readonly identity: EngineRegistryIdentityV1;
  readonly capabilities: readonly string[];
  readonly effect_classes: readonly AssuranceEffectClass[];
  readonly descriptor_authority_ceiling: AssuranceEffectClass;
  readonly result: EngineAuthorityResultV1;
  readonly reason_code: EngineAuthorityReasonCodeV1;
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

function requireCapability(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be a bounded opaque identifier");
  }
  return value;
}

function normalizeCapabilities(value: unknown): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length > MAX_REQUESTED_CAPABILITIES
  ) {
    throw new TypeError(
      "capabilities must contain at most " +
        MAX_REQUESTED_CAPABILITIES +
        " items",
    );
  }

  const parsed = value.map((entry, index) =>
    requireCapability(entry, "capabilities[" + index + "]"),
  );
  return [...new Set(parsed)].sort();
}

function normalizeEffects(value: unknown): readonly AssuranceEffectClass[] {
  if (
    !Array.isArray(value) ||
    value.length > ASSURANCE_EFFECT_CLASSES.length
  ) {
    throw new TypeError(
      "effect_classes must contain at most " +
        ASSURANCE_EFFECT_CLASSES.length +
        " items",
    );
  }

  const seen = new Set<AssuranceEffectClass>();
  for (const entry of value) {
    if (
      typeof entry !== "string" ||
      !ASSURANCE_EFFECT_CLASSES.includes(entry as AssuranceEffectClass)
    ) {
      throw new TypeError("effect_classes contains invalid effect class");
    }
    seen.add(entry as AssuranceEffectClass);
  }

  return ASSURANCE_EFFECT_CLASSES.filter((effect) => seen.has(effect));
}

function effectIndex(effect: AssuranceEffectClass): number {
  return ASSURANCE_EFFECT_CLASSES.indexOf(effect);
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

export function evaluateEngineAuthorityCeilingV1(
  registry: EngineRegistryV1,
  request: EngineAuthorityRequestV1,
): EngineAuthorityDecisionV1 {
  const record = requireRecord(request, "engine authority request");
  requireExactKeys(
    record,
    ["identity", "capabilities", "effect_classes"],
    "engine authority request",
  );

  const registered = findEngineRegistryEntryV1(
    registry,
    record.identity as EngineRegistryIdentityV1,
  );
  if (registered === undefined) {
    throw new TypeError("engine authority request identity is not registered");
  }

  const capabilities = normalizeCapabilities(record.capabilities);
  const effectClasses = normalizeEffects(record.effect_classes);
  const descriptor = registered.descriptor;

  const identity: EngineRegistryIdentityV1 = {
    engine_id: descriptor.engine_id,
    implementation_identity: descriptor.implementation_identity,
    configuration_identity: registered.configuration_identity,
  };

  const undeclaredCapability = capabilities.find(
    (capability) => !descriptor.capabilities.includes(capability),
  );
  if (undeclaredCapability !== undefined) {
    return deepFreeze({
      schema_version: ENGINE_AUTHORITY_CHECK_SCHEMA_VERSION,
      identity,
      capabilities,
      effect_classes: effectClasses,
      descriptor_authority_ceiling: descriptor.authority_ceiling,
      result: "DENIED",
      reason_code: "CAPABILITY_NOT_DECLARED",
    });
  }

  const undeclaredEffect = effectClasses.find(
    (effect) => !descriptor.effect_classes.includes(effect),
  );
  if (undeclaredEffect !== undefined) {
    return deepFreeze({
      schema_version: ENGINE_AUTHORITY_CHECK_SCHEMA_VERSION,
      identity,
      capabilities,
      effect_classes: effectClasses,
      descriptor_authority_ceiling: descriptor.authority_ceiling,
      result: "DENIED",
      reason_code: "EFFECT_NOT_DECLARED",
    });
  }

  const exceedsCeiling = effectClasses.some(
    (effect) =>
      effectIndex(effect) > effectIndex(descriptor.authority_ceiling),
  );
  if (exceedsCeiling) {
    return deepFreeze({
      schema_version: ENGINE_AUTHORITY_CHECK_SCHEMA_VERSION,
      identity,
      capabilities,
      effect_classes: effectClasses,
      descriptor_authority_ceiling: descriptor.authority_ceiling,
      result: "DENIED",
      reason_code: "EFFECT_EXCEEDS_DESCRIPTOR_AUTHORITY_CEILING",
    });
  }

  return deepFreeze({
    schema_version: ENGINE_AUTHORITY_CHECK_SCHEMA_VERSION,
    identity,
    capabilities,
    effect_classes: effectClasses,
    descriptor_authority_ceiling: descriptor.authority_ceiling,
    result: "WITHIN_CEILING",
    reason_code: "DESCRIPTOR_AUTHORITY_SATISFIED",
  });
}
