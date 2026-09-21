import {
  canonicalAssuranceSha256V1,
} from "../contracts/canonical-serialization.js";
import {
  ASSURANCE_EFFECT_CLASSES,
  parseAssuranceIntentV1,
  type AssuranceEffectClass,
  type AssuranceIntentV1,
  type AssuranceScope,
} from "../contracts/intent.js";
import {
  parseAssurancePolicySnapshotV1,
  type AssurancePolicySnapshotV1,
} from "../contracts/policy.js";
import {
  evaluateEngineAuthorityCeilingV1,
  type EngineAuthorityReasonCodeV1,
} from "./authority.js";
import type {
  EngineRegistryIdentityV1,
  EngineRegistryV1,
} from "./registry.js";

export const ENGINE_EFFECT_AUTHORITY_SCHEMA_VERSION = 1 as const;

export const ENGINE_EFFECT_AUTHORITY_RESULTS = [
  "WITHIN_CEILING",
  "DENIED",
] as const;

export type EngineEffectAuthorityResultV1 =
  (typeof ENGINE_EFFECT_AUTHORITY_RESULTS)[number];

export const ENGINE_EFFECT_AUTHORITY_BOUNDARIES = [
  "INTENT",
  "POLICY",
  "DESCRIPTOR",
  "PHASE",
] as const;

export type EngineEffectAuthorityBoundaryV1 =
  (typeof ENGINE_EFFECT_AUTHORITY_BOUNDARIES)[number];

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;

export interface EnginePhaseAuthorityV1 {
  readonly phase_id: string;
  readonly authority_source_id: string;
  readonly authority_source_sha256: string;
  readonly maximum_effect_class: AssuranceEffectClass;
}

export interface EngineEffectAuthorityRequestV1 {
  readonly identity: EngineRegistryIdentityV1;
  readonly required_effect_classes: readonly AssuranceEffectClass[];
  readonly intent: AssuranceIntentV1;
  readonly policy: AssurancePolicySnapshotV1;
  readonly phase_authority: EnginePhaseAuthorityV1;
}

export interface EngineEffectAuthorityDecisionV1 {
  readonly schema_version: 1;
  readonly registry_sha256: string;
  readonly intent_sha256: string;
  readonly policy_digest: string;
  readonly phase_authority_sha256: string;
  readonly identity: EngineRegistryIdentityV1;
  readonly intent_id: string;
  readonly policy_id: string;
  readonly policy_version: string;
  readonly phase_id: string;
  readonly phase_authority_source_id: string;
  readonly phase_authority_source_sha256: string;
  readonly scope: AssuranceScope;
  readonly required_effect_classes: readonly AssuranceEffectClass[];
  readonly intent_effect_ceiling: AssuranceEffectClass;
  readonly policy_effect_ceiling: AssuranceEffectClass;
  readonly descriptor_effect_ceiling: AssuranceEffectClass;
  readonly phase_effect_ceiling: AssuranceEffectClass;
  readonly descriptor_reason_code: EngineAuthorityReasonCodeV1;
  readonly result: EngineEffectAuthorityResultV1;
  readonly violated_boundaries: readonly EngineEffectAuthorityBoundaryV1[];
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

function requireEffectClass(
  value: unknown,
  field: string,
): AssuranceEffectClass {
  if (
    typeof value !== "string" ||
    !ASSURANCE_EFFECT_CLASSES.includes(value as AssuranceEffectClass)
  ) {
    throw new TypeError(field + " is invalid or unsupported");
  }
  return value as AssuranceEffectClass;
}

function normalizeRequiredEffects(
  value: unknown,
): readonly AssuranceEffectClass[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > ASSURANCE_EFFECT_CLASSES.length
  ) {
    throw new TypeError(
      "required_effect_classes must contain between 1 and " +
        ASSURANCE_EFFECT_CLASSES.length +
        " effects",
    );
  }

  const seen = new Set<AssuranceEffectClass>();
  for (const entry of value) {
    seen.add(
      requireEffectClass(entry, "required_effect_classes"),
    );
  }

  return ASSURANCE_EFFECT_CLASSES.filter((effect) => seen.has(effect));
}

function parsePhaseAuthority(value: unknown): EnginePhaseAuthorityV1 {
  const record = requireRecord(value, "phase_authority");
  requireExactKeys(
    record,
    [
      "phase_id",
      "authority_source_id",
      "authority_source_sha256",
      "maximum_effect_class",
    ],
    "phase_authority",
  );

  return {
    phase_id: requireOpaqueId(record.phase_id, "phase_authority.phase_id"),
    authority_source_id: requireOpaqueId(
      record.authority_source_id,
      "phase_authority.authority_source_id",
    ),
    authority_source_sha256: requireSha256(
      record.authority_source_sha256,
      "phase_authority.authority_source_sha256",
    ),
    maximum_effect_class: requireEffectClass(
      record.maximum_effect_class,
      "phase_authority.maximum_effect_class",
    ),
  };
}

function effectIndex(effect: AssuranceEffectClass): number {
  return ASSURANCE_EFFECT_CLASSES.indexOf(effect);
}

function exceeds(
  required: readonly AssuranceEffectClass[],
  ceiling: AssuranceEffectClass,
): boolean {
  const ceilingIndex = effectIndex(ceiling);
  return required.some((effect) => effectIndex(effect) > ceilingIndex);
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

export function evaluateEngineEffectAuthorityV1(
  registry: EngineRegistryV1,
  request: EngineEffectAuthorityRequestV1,
): EngineEffectAuthorityDecisionV1 {
  const record = requireRecord(request, "engine effect authority request");
  requireExactKeys(
    record,
    [
      "identity",
      "required_effect_classes",
      "intent",
      "policy",
      "phase_authority",
    ],
    "engine effect authority request",
  );

  const requiredEffects = normalizeRequiredEffects(
    record.required_effect_classes,
  );
  const intent = parseAssuranceIntentV1(record.intent);
  const policy = parseAssurancePolicySnapshotV1(record.policy);
  const phaseAuthority = parsePhaseAuthority(record.phase_authority);

  if (intent.target.policy_snapshot_id !== policy.policy_id) {
    throw new TypeError(
      "intent target policy_snapshot_id does not match policy snapshot",
    );
  }

  const policyCeiling = policy.effect_ceilings.find(
    (entry) => entry.scope === intent.scope,
  );
  if (policyCeiling === undefined) {
    throw new TypeError("policy effect ceiling missing for intent scope");
  }

  const descriptorDecision = evaluateEngineAuthorityCeilingV1(registry, {
    identity: record.identity as EngineRegistryIdentityV1,
    capabilities: [],
    effect_classes: requiredEffects,
  });

  const violatedBoundaries: EngineEffectAuthorityBoundaryV1[] = [];
  if (exceeds(requiredEffects, intent.maximum_effect_class)) {
    violatedBoundaries.push("INTENT");
  }
  if (exceeds(requiredEffects, policyCeiling.maximum_effect_class)) {
    violatedBoundaries.push("POLICY");
  }
  if (descriptorDecision.result !== "WITHIN_CEILING") {
    violatedBoundaries.push("DESCRIPTOR");
  }
  if (exceeds(requiredEffects, phaseAuthority.maximum_effect_class)) {
    violatedBoundaries.push("PHASE");
  }

  return deepFreeze({
    schema_version: ENGINE_EFFECT_AUTHORITY_SCHEMA_VERSION,
    registry_sha256: descriptorDecision.registry_sha256,
    intent_sha256: canonicalAssuranceSha256V1(intent),
    policy_digest: policy.policy_digest,
    phase_authority_sha256: canonicalAssuranceSha256V1(phaseAuthority),
    identity: descriptorDecision.identity,
    intent_id: intent.intent_id,
    policy_id: policy.policy_id,
    policy_version: policy.policy_version,
    phase_id: phaseAuthority.phase_id,
    phase_authority_source_id: phaseAuthority.authority_source_id,
    phase_authority_source_sha256: phaseAuthority.authority_source_sha256,
    scope: intent.scope,
    required_effect_classes: requiredEffects,
    intent_effect_ceiling: intent.maximum_effect_class,
    policy_effect_ceiling: policyCeiling.maximum_effect_class,
    descriptor_effect_ceiling: descriptorDecision.descriptor_authority_ceiling,
    phase_effect_ceiling: phaseAuthority.maximum_effect_class,
    descriptor_reason_code: descriptorDecision.reason_code,
    result:
      violatedBoundaries.length === 0 ? "WITHIN_CEILING" : "DENIED",
    violated_boundaries: violatedBoundaries,
  });
}

export function assertEngineEffectAuthorityDecisionContextV1(
  registry: EngineRegistryV1,
  request: EngineEffectAuthorityRequestV1,
  decision: EngineEffectAuthorityDecisionV1,
): void {
  const expected = evaluateEngineEffectAuthorityV1(registry, request);
  if (
    canonicalAssuranceSha256V1(expected) !==
    canonicalAssuranceSha256V1(decision)
  ) {
    throw new TypeError(
      "engine effect authority decision context mismatch",
    );
  }
}
