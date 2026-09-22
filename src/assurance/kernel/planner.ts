import {
  canonicalAssuranceSha256V1,
} from "../contracts/canonical-serialization.js";
import {
  ASSURANCE_EFFECT_CLASSES,
  parseAssuranceIntentV1,
  type AssuranceEffectClass,
  type AssuranceIntentV1,
} from "../contracts/intent.js";
import {
  createAssurancePlanV1,
  type AssurancePlanV1,
} from "../contracts/plan.js";
import {
  parseAssurancePolicySnapshotV1,
  type AssurancePolicySnapshotV1,
} from "../contracts/policy.js";
import { evaluateEngineEffectAuthorityV1 } from "./effect-authority.js";
import type { EnginePhaseAuthorityV1 } from "./effect-authority.js";
import {
  findEngineAvailabilityEntryV1,
  type EngineAvailabilitySnapshotV1,
} from "./availability.js";
import {
  evaluateEngineQualificationV1,
  type EngineQualificationSetV1,
} from "./qualification.js";
import type { EngineBenchmarkCorpusIdentityV1 } from "../contracts/engine-qualification.js";
import type { EnginePlatformIdentityV1 } from "../contracts/engine-qualification.js";
import type { EngineRegistryV1 } from "./registry.js";

export const DETERMINISTIC_PLANNER_SCHEMA_VERSION = 1 as const;
export const DETERMINISTIC_PLANNER_ID = "planner:ua-p02-deterministic" as const;
export const DETERMINISTIC_PLANNER_VERSION = "1.0.0" as const;

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;

export interface DeterministicPlannerRequestV1 {
  readonly plan_id: string;
  readonly required_effect_classes: readonly AssuranceEffectClass[];
  readonly intent: AssuranceIntentV1;
  readonly policy: AssurancePolicySnapshotV1;
  readonly phase_authority: EnginePhaseAuthorityV1;
  readonly profile_identities: readonly string[];
  readonly benchmark_corpus_identity: EngineBenchmarkCorpusIdentityV1;
  readonly platform_identity: EnginePlatformIdentityV1;
  readonly as_of_epoch_ms: number;
  readonly planner_id: string;
  readonly planner_version: string;
  readonly planner_configuration_sha256: string;
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

function requireEpochMs(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(field + " must be a non-negative safe integer epoch ms");
  }
  return value as number;
}

function normalizeRequiredEffects(
  value: unknown,
): readonly AssuranceEffectClass[] {
  if (!Array.isArray(value) || value.length > ASSURANCE_EFFECT_CLASSES.length) {
    throw new TypeError(
      "required_effect_classes must contain at most " +
        ASSURANCE_EFFECT_CLASSES.length +
        " effects",
    );
  }
  const seen = new Set<AssuranceEffectClass>();
  for (const entry of value) {
    if (
      typeof entry !== "string" ||
      !ASSURANCE_EFFECT_CLASSES.includes(entry as AssuranceEffectClass)
    ) {
      throw new TypeError("required_effect_classes is invalid or unsupported");
    }
    seen.add(entry as AssuranceEffectClass);
  }
  return ASSURANCE_EFFECT_CLASSES.filter((effect) => seen.has(effect));
}

function normalizeProfiles(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > 256) {
    throw new TypeError("profile_identities must contain at most 256 items");
  }
  const parsed = value.map((entry, index) =>
    requireOpaqueId(entry, "profile_identities[" + index + "]"),
  );
  return [...new Set(parsed)].sort();
}

function parseBenchmarkCorpusIdentity(
  value: unknown,
): EngineBenchmarkCorpusIdentityV1 {
  const record = requireRecord(value, "benchmark_corpus_identity");
  requireExactKeys(
    record,
    ["benchmark_id", "corpus_id", "corpus_sha256"],
    "benchmark_corpus_identity",
  );
  return {
    benchmark_id: requireOpaqueId(
      record.benchmark_id,
      "benchmark_corpus_identity.benchmark_id",
    ),
    corpus_id: requireOpaqueId(
      record.corpus_id,
      "benchmark_corpus_identity.corpus_id",
    ),
    corpus_sha256: requireSha256(
      record.corpus_sha256,
      "benchmark_corpus_identity.corpus_sha256",
    ),
  };
}

function parsePlatformIdentity(value: unknown): EnginePlatformIdentityV1 {
  const record = requireRecord(value, "platform_identity");
  requireExactKeys(
    record,
    ["platform_id", "platform_sha256"],
    "platform_identity",
  );
  return {
    platform_id: requireOpaqueId(
      record.platform_id,
      "platform_identity.platform_id",
    ),
    platform_sha256: requireSha256(
      record.platform_sha256,
      "platform_identity.platform_sha256",
    ),
  };
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
  const maximum = record.maximum_effect_class;
  if (
    typeof maximum !== "string" ||
    !ASSURANCE_EFFECT_CLASSES.includes(maximum as AssuranceEffectClass)
  ) {
    throw new TypeError("phase_authority.maximum_effect_class is invalid");
  }
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
    maximum_effect_class: maximum as AssuranceEffectClass,
  };
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

export function evaluateDeterministicPlanV1(
  registry: EngineRegistryV1,
  availabilitySnapshot: EngineAvailabilitySnapshotV1,
  qualificationSet: EngineQualificationSetV1,
  request: DeterministicPlannerRequestV1,
): AssurancePlanV1 {
  const record = requireRecord(request, "deterministic planner request");
  requireExactKeys(
    record,
    [
      "plan_id",
      "required_effect_classes",
      "intent",
      "policy",
      "phase_authority",
      "profile_identities",
      "benchmark_corpus_identity",
      "platform_identity",
      "as_of_epoch_ms",
      "planner_id",
      "planner_version",
      "planner_configuration_sha256",
    ],
    "deterministic planner request",
  );

  const planId = requireOpaqueId(record.plan_id, "plan_id");
  const requiredEffects = normalizeRequiredEffects(
    record.required_effect_classes,
  );
  const intent = parseAssuranceIntentV1(record.intent);
  const policy = parseAssurancePolicySnapshotV1(record.policy);
  const phaseAuthority = parsePhaseAuthority(record.phase_authority);
  const profileIdentities = normalizeProfiles(record.profile_identities);
  const benchmarkCorpusIdentity = parseBenchmarkCorpusIdentity(
    record.benchmark_corpus_identity,
  );
  const platformIdentity = parsePlatformIdentity(record.platform_identity);
  const asOfEpochMs = requireEpochMs(record.as_of_epoch_ms, "as_of_epoch_ms");
  const plannerId = requireOpaqueId(record.planner_id, "planner_id");
  const plannerVersion = requireOpaqueId(
    record.planner_version,
    "planner_version",
  );
  const plannerConfigurationSha256 = requireSha256(
    record.planner_configuration_sha256,
    "planner_configuration_sha256",
  );

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
  const intentCeilingIndex = effectIndex(intent.maximum_effect_class);
  const policyCeilingIndex = effectIndex(policyCeiling.maximum_effect_class);
  const phaseCeilingIndex = effectIndex(phaseAuthority.maximum_effect_class);
  for (const effect of requiredEffects) {
    const index = effectIndex(effect);
    if (index > intentCeilingIndex) {
      throw new TypeError(
        "planner required effect exceeds intent ceiling: " + effect,
      );
    }
    if (index > policyCeilingIndex) {
      throw new TypeError(
        "planner required effect exceeds policy ceiling: " + effect,
      );
    }
    if (index > phaseCeilingIndex) {
      throw new TypeError(
        "planner required effect exceeds phase authority: " + effect,
      );
    }
  }

  const selected: string[] = [];
  const sortedEntries = [...registry.entries].sort((left, right) =>
    left.descriptor.engine_id < right.descriptor.engine_id
      ? -1
      : left.descriptor.engine_id > right.descriptor.engine_id
        ? 1
        : 0,
  );
  for (const entry of sortedEntries) {
    const identity = {
      engine_id: entry.descriptor.engine_id,
      implementation_identity: entry.descriptor.implementation_identity,
      configuration_identity: entry.configuration_identity,
    };

    const availability = findEngineAvailabilityEntryV1(
      registry,
      availabilitySnapshot,
      identity,
    );
    if (availability === undefined || availability.state !== "AVAILABLE") {
      continue;
    }

    const qualification = evaluateEngineQualificationV1(
      registry,
      qualificationSet,
      {
        identity,
        profile_identities: profileIdentities,
        benchmark_corpus_identity: benchmarkCorpusIdentity,
        platform_identity: platformIdentity,
        as_of_epoch_ms: asOfEpochMs,
      },
    );
    if (qualification.result !== "QUALIFIED") {
      continue;
    }

    if (requiredEffects.length > 0) {
      const authority = evaluateEngineEffectAuthorityV1(registry, {
        identity,
        required_effect_classes: requiredEffects,
        intent,
        policy,
        phase_authority: phaseAuthority,
      });
      if (authority.result !== "WITHIN_CEILING") {
        continue;
      }
    }

    selected.push(entry.descriptor.engine_id);
  }

  selected.sort();
  const uniqueSelected = [...new Set(selected)].sort();

  const plan = createAssurancePlanV1({
    plan_id: planId,
    intent,
    policy,
    selected_check_classes: [...policy.minimum_mandatory_checks].sort(),
    selected_engine_identities: uniqueSelected,
    selected_runtime_requirements: [],
    required_effect_classes: requiredEffects,
    expected_evidence_types: [],
    omitted_checks: [],
    plan_generation_evidence: {
      planner_id: plannerId,
      planner_version: plannerVersion,
      planner_configuration_sha256: plannerConfigurationSha256,
      decision_evidence_refs: uniqueSelected,
    },
  });

  return deepFreeze(plan);
}

export function deterministicPlanDigestV1(plan: AssurancePlanV1): string {
  return canonicalAssuranceSha256V1(plan);
}

export function assertDeterministicPlanContextV1(
  registry: EngineRegistryV1,
  availabilitySnapshot: EngineAvailabilitySnapshotV1,
  qualificationSet: EngineQualificationSetV1,
  request: DeterministicPlannerRequestV1,
  plan: AssurancePlanV1,
): void {
  const expected = evaluateDeterministicPlanV1(
    registry,
    availabilitySnapshot,
    qualificationSet,
    request,
  );
  if (
    canonicalAssuranceSha256V1(expected) !== canonicalAssuranceSha256V1(plan)
  ) {
    throw new TypeError("deterministic plan context mismatch");
  }
}
