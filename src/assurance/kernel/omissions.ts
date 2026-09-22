import {
  canonicalAssuranceSha256V1,
} from "../contracts/canonical-serialization.js";
import {
  createAssurancePlanV1,
  type AssuranceOmittedCheckV1,
  type AssurancePlanV1,
} from "../contracts/plan.js";
import { findEngineAvailabilityEntryV1 } from "./availability.js";
import type { EngineAvailabilitySnapshotV1 } from "./availability.js";
import { evaluateEngineEffectAuthorityV1 } from "./effect-authority.js";
import { evaluateEngineQualificationV1 } from "./qualification.js";
import type { EngineQualificationSetV1 } from "./qualification.js";
import type { DeterministicPlannerRequestV1 } from "./planner.js";
import { evaluateDeterministicPlanV1 } from "./planner.js";
import type { EngineRegistryV1 } from "./registry.js";

export const OMISSION_PLANNER_SCHEMA_VERSION = 1 as const;

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be a bounded opaque identifier");
  }
  return value;
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

function omissionReasonFor(
  registry: EngineRegistryV1,
  availabilitySnapshot: EngineAvailabilitySnapshotV1,
  qualificationSet: EngineQualificationSetV1,
  request: DeterministicPlannerRequestV1,
  engineId: string,
): string | null {
  const entry = registry.entries.find(
    (candidate) => candidate.descriptor.engine_id === engineId,
  );
  if (entry === undefined) {
    return null;
  }
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
  if (availability === undefined || availability.state === "UNAVAILABLE") {
    return "REQUIRED_ENGINE_UNAVAILABLE";
  }
  if (availability.state === "NOT_QUALIFIED") {
    return "REQUIRED_ENGINE_NOT_QUALIFIED";
  }

  const qualification = evaluateEngineQualificationV1(
    registry,
    qualificationSet,
    {
      identity,
      profile_identities: [...request.profile_identities].sort(),
      benchmark_corpus_identity: request.benchmark_corpus_identity,
      platform_identity: request.platform_identity,
      as_of_epoch_ms: request.as_of_epoch_ms,
    },
  );
  if (qualification.result !== "QUALIFIED") {
    return "REQUIRED_ENGINE_NOT_QUALIFIED";
  }

  if (request.required_effect_classes.length > 0) {
    const authority = evaluateEngineEffectAuthorityV1(registry, {
      identity,
      required_effect_classes: request.required_effect_classes,
      intent: request.intent,
      policy: request.policy,
      phase_authority: request.phase_authority,
    });
    if (authority.result !== "WITHIN_CEILING") {
      return "REQUIRED_ENGINE_EFFECT_EXCEEDS_CEILING";
    }
  }

  return null;
}

export function evaluatePlanWithOmissionsV1(
  registry: EngineRegistryV1,
  availabilitySnapshot: EngineAvailabilitySnapshotV1,
  qualificationSet: EngineQualificationSetV1,
  request: DeterministicPlannerRequestV1,
): AssurancePlanV1 {
  const base = evaluateDeterministicPlanV1(
    registry,
    availabilitySnapshot,
    qualificationSet,
    request,
  );
  const selected = new Set(base.selected_engine_identities);

  const omissions: AssuranceOmittedCheckV1[] = [];
  const sortedIds = registry.entries
    .map((entry) => entry.descriptor.engine_id)
    .sort();
  for (const engineId of sortedIds) {
    if (selected.has(engineId)) {
      continue;
    }
    const reason = omissionReasonFor(
      registry,
      availabilitySnapshot,
      qualificationSet,
      request,
      engineId,
    );
    if (reason === null) {
      continue;
    }
    requireOpaqueId(engineId, "omitted check_class");
    omissions.push({ check_class: engineId, reason });
  }

  omissions.sort((left, right) =>
    left.check_class < right.check_class
      ? -1
      : left.check_class > right.check_class
        ? 1
        : 0,
  );

  const seen = new Set(omissions.map((entry) => entry.check_class));
  if (seen.size !== omissions.length) {
    throw new TypeError("omitted_checks contains duplicate check_class");
  }
  for (const omitted of omissions) {
    if (selected.has(omitted.check_class)) {
      throw new TypeError(
        "selected and omitted checks overlap: " + omitted.check_class,
      );
    }
  }

  const plan = createAssurancePlanV1({
    plan_id: base.plan_id,
    intent: request.intent,
    policy: request.policy,
    selected_check_classes: [...base.selected_check_classes].sort(),
    selected_engine_identities: [...base.selected_engine_identities].sort(),
    selected_runtime_requirements: [...base.selected_runtime_requirements].sort(),
    required_effect_classes: [...base.required_effect_classes],
    expected_evidence_types: [...base.expected_evidence_types].sort(),
    omitted_checks: omissions,
    plan_generation_evidence: { ...base.plan_generation_evidence },
  });

  return deepFreeze(plan);
}

export function omissionPlanDigestV1(plan: AssurancePlanV1): string {
  return canonicalAssuranceSha256V1(plan);
}
