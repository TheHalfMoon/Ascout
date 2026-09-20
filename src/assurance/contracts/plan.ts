import { isDeepStrictEqual } from "node:util";

import {
  ASSURANCE_EFFECT_CLASSES,
  parseAssuranceIntentV1,
  type AssuranceEffectClass,
  type AssuranceIntentBudgetV1,
  type AssuranceIntentV1,
} from "./intent.js";
import {
  parseAssurancePolicySnapshotV1,
  type AssuranceEngineQualificationPolicyV1,
  type AssuranceFreshnessPolicyV1,
  type AssuranceIndependencePolicyV1,
  type AssurancePolicySnapshotV1,
} from "./policy.js";

export const ASSURANCE_PLAN_SCHEMA_VERSION = 1 as const;

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const CLAIM_ID = /^[A-Z][A-Z0-9_]{0,63}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const MAX_LIST_ITEMS = 256;
const MAX_REASON_LENGTH = 512;

export interface AssurancePlanQualificationRequirementsV1 {
  readonly engine_qualification_requirements:
    AssuranceEngineQualificationPolicyV1;
  readonly independence_requirements: AssuranceIndependencePolicyV1;
}

export interface AssuranceOmittedCheckV1 {
  readonly check_class: string;
  readonly reason: string;
}

export interface AssurancePlanGenerationEvidenceV1 {
  readonly planner_id: string;
  readonly planner_version: string;
  readonly planner_configuration_sha256: string;
  readonly decision_evidence_refs: readonly string[];
}

export interface AssurancePlanV1 {
  readonly schema_version: 1;
  readonly plan_id: string;
  readonly intent_id: string;
  readonly target_id: string;
  readonly policy_id: string;
  readonly policy_digest: string;
  readonly requested_claim: string;
  readonly selected_check_classes: readonly string[];
  readonly selected_engine_identities: readonly string[];
  readonly selected_runtime_requirements: readonly string[];
  readonly required_effect_classes: readonly AssuranceEffectClass[];
  readonly qualification_requirements: AssurancePlanQualificationRequirementsV1;
  readonly budget_envelope: AssuranceIntentBudgetV1;
  readonly expected_evidence_types: readonly string[];
  readonly omitted_checks: readonly AssuranceOmittedCheckV1[];
  readonly staleness_policy: AssuranceFreshnessPolicyV1;
  readonly plan_generation_evidence: AssurancePlanGenerationEvidenceV1;
}

export interface AssurancePlanInputV1 {
  readonly plan_id: string;
  readonly intent: AssuranceIntentV1;
  readonly policy: AssurancePolicySnapshotV1;
  readonly selected_check_classes: readonly string[];
  readonly selected_engine_identities: readonly string[];
  readonly selected_runtime_requirements: readonly string[];
  readonly required_effect_classes: readonly AssuranceEffectClass[];
  readonly expected_evidence_types: readonly string[];
  readonly omitted_checks: readonly AssuranceOmittedCheckV1[];
  readonly plan_generation_evidence: AssurancePlanGenerationEvidenceV1;
}

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
  if (typeof value !== "boolean") throw new TypeError(field + " must be boolean");
  return value;
}

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be a bounded opaque identifier");
  }
  return value;
}

function requireClaimId(value: unknown): string {
  if (typeof value !== "string" || !CLAIM_ID.test(value)) {
    throw new TypeError("requested_claim must be an uppercase bounded claim identifier");
  }
  return value;
}

function requireSha256(value: unknown, field: string): string {
  if (typeof value !== "string" || !SHA256_HEX.test(value)) {
    throw new TypeError(field + " must be lowercase sha256");
  }
  return value;
}

function requireSafeInteger(
  value: unknown,
  field: string,
  minimum: number,
): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new TypeError(field + " must be a safe integer >= " + minimum);
  }
  return value as number;
}

function requireNullableSafeInteger(
  value: unknown,
  field: string,
  minimum: number,
): number | null {
  return value === null ? null : requireSafeInteger(value, field, minimum);
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
  if (!Array.isArray(values) || values.length > ASSURANCE_EFFECT_CLASSES.length) {
    throw new TypeError("required_effect_classes contains too many effects");
  }
  const seen = new Set<AssuranceEffectClass>();
  for (const value of values) {
    if (!ASSURANCE_EFFECT_CLASSES.includes(value)) {
      throw new TypeError("required_effect_classes contains invalid effect class");
    }
    seen.add(value);
  }
  return ASSURANCE_EFFECT_CLASSES.filter((effect) => seen.has(effect));
}

function parseCanonicalEffects(value: unknown): readonly AssuranceEffectClass[] {
  if (!Array.isArray(value)) {
    throw new TypeError("required_effect_classes must be an array");
  }
  const parsed = value.map((entry) => {
    if (
      typeof entry !== "string" ||
      !ASSURANCE_EFFECT_CLASSES.includes(entry as AssuranceEffectClass)
    ) {
      throw new TypeError("required_effect_classes contains invalid effect class");
    }
    return entry as AssuranceEffectClass;
  });
  const canonical = normalizeEffects(parsed);
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError(
      "required_effect_classes must be unique and canonically ordered",
    );
  }
  return parsed;
}

function requireReason(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > MAX_REASON_LENGTH ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    throw new TypeError(field + " must be bounded non-empty single-line text");
  }
  return value;
}

function parseOmittedCheck(value: unknown): AssuranceOmittedCheckV1 {
  const record = requireRecord(value, "omitted_check");
  requireExactKeys(record, ["check_class", "reason"], "omitted_check");
  return {
    check_class: requireOpaqueId(record.check_class, "omitted_check.check_class"),
    reason: requireReason(record.reason, "omitted_check.reason"),
  };
}

function normalizeOmittedChecks(
  values: readonly AssuranceOmittedCheckV1[],
): readonly AssuranceOmittedCheckV1[] {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS) {
    throw new TypeError(
      "omitted_checks must contain at most " + MAX_LIST_ITEMS + " items",
    );
  }
  const parsed = values.map(parseOmittedCheck);
  const sorted = [...parsed].sort((left, right) =>
    left.check_class < right.check_class
      ? -1
      : left.check_class > right.check_class
        ? 1
        : 0,
  );
  const ids = sorted.map((entry) => entry.check_class);
  if (new Set(ids).size !== ids.length) {
    throw new TypeError("omitted_checks contains duplicate check_class");
  }
  return sorted;
}

function parseCanonicalOmittedChecks(
  value: unknown,
): readonly AssuranceOmittedCheckV1[] {
  if (!Array.isArray(value)) {
    throw new TypeError("omitted_checks must be an array");
  }
  const parsed = value.map(parseOmittedCheck);
  const canonical = normalizeOmittedChecks(parsed);
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError("omitted_checks must be unique and canonically sorted");
  }
  return parsed;
}

function parseBudget(value: unknown): AssuranceIntentBudgetV1 {
  const record = requireRecord(value, "budget_envelope");
  requireExactKeys(record, [
    "max_wall_time_ms",
    "max_concurrency",
    "max_engine_runs",
    "max_artifact_bytes",
    "max_network_requests",
    "max_network_egress_bytes",
    "max_model_tokens",
    "max_cost_microunits",
  ], "budget_envelope");
  return {
    max_wall_time_ms: requireNullableSafeInteger(
      record.max_wall_time_ms,
      "budget_envelope.max_wall_time_ms",
      1,
    ),
    max_concurrency: requireSafeInteger(
      record.max_concurrency,
      "budget_envelope.max_concurrency",
      1,
    ),
    max_engine_runs: requireSafeInteger(
      record.max_engine_runs,
      "budget_envelope.max_engine_runs",
      1,
    ),
    max_artifact_bytes: requireNullableSafeInteger(
      record.max_artifact_bytes,
      "budget_envelope.max_artifact_bytes",
      0,
    ),
    max_network_requests: requireNullableSafeInteger(
      record.max_network_requests,
      "budget_envelope.max_network_requests",
      0,
    ),
    max_network_egress_bytes: requireNullableSafeInteger(
      record.max_network_egress_bytes,
      "budget_envelope.max_network_egress_bytes",
      0,
    ),
    max_model_tokens: requireNullableSafeInteger(
      record.max_model_tokens,
      "budget_envelope.max_model_tokens",
      0,
    ),
    max_cost_microunits: requireNullableSafeInteger(
      record.max_cost_microunits,
      "budget_envelope.max_cost_microunits",
      0,
    ),
  };
}
function parseQualificationRequirements(
  value: unknown,
): AssurancePlanQualificationRequirementsV1 {
  const record = requireRecord(value, "qualification_requirements");
  requireExactKeys(
    record,
    ["engine_qualification_requirements", "independence_requirements"],
    "qualification_requirements",
  );

  const qualification = requireRecord(
    record.engine_qualification_requirements,
    "qualification_requirements.engine_qualification_requirements",
  );
  requireExactKeys(qualification, [
    "require_exact_implementation_identity",
    "require_exact_configuration_identity",
    "require_platform_identity",
    "minimum_qualification_refs",
  ], "qualification_requirements.engine_qualification_requirements");

  const independence = requireRecord(
    record.independence_requirements,
    "qualification_requirements.independence_requirements",
  );
  requireExactKeys(independence, [
    "minimum_independent_engines",
    "acceptance_critical_requires_independence",
  ], "qualification_requirements.independence_requirements");

  return {
    engine_qualification_requirements: {
      require_exact_implementation_identity: requireBoolean(
        qualification.require_exact_implementation_identity,
        "qualification_requirements.engine_qualification_requirements.require_exact_implementation_identity",
      ),
      require_exact_configuration_identity: requireBoolean(
        qualification.require_exact_configuration_identity,
        "qualification_requirements.engine_qualification_requirements.require_exact_configuration_identity",
      ),
      require_platform_identity: requireBoolean(
        qualification.require_platform_identity,
        "qualification_requirements.engine_qualification_requirements.require_platform_identity",
      ),
      minimum_qualification_refs: requireSafeInteger(
        qualification.minimum_qualification_refs,
        "qualification_requirements.engine_qualification_requirements.minimum_qualification_refs",
        0,
      ),
    },
    independence_requirements: {
      minimum_independent_engines: requireSafeInteger(
        independence.minimum_independent_engines,
        "qualification_requirements.independence_requirements.minimum_independent_engines",
        0,
      ),
      acceptance_critical_requires_independence: requireBoolean(
        independence.acceptance_critical_requires_independence,
        "qualification_requirements.independence_requirements.acceptance_critical_requires_independence",
      ),
    },
  };
}

function parseStalenessPolicy(value: unknown): AssuranceFreshnessPolicyV1 {
  const record = requireRecord(value, "staleness_policy");
  requireExactKeys(record, [
    "require_exact_target_match",
    "invalidate_on_source_drift",
    "invalidate_on_policy_drift",
    "invalidate_on_engine_identity_drift",
    "max_evidence_age_ms",
  ], "staleness_policy");
  return {
    require_exact_target_match: requireBoolean(
      record.require_exact_target_match,
      "staleness_policy.require_exact_target_match",
    ),
    invalidate_on_source_drift: requireBoolean(
      record.invalidate_on_source_drift,
      "staleness_policy.invalidate_on_source_drift",
    ),
    invalidate_on_policy_drift: requireBoolean(
      record.invalidate_on_policy_drift,
      "staleness_policy.invalidate_on_policy_drift",
    ),
    invalidate_on_engine_identity_drift: requireBoolean(
      record.invalidate_on_engine_identity_drift,
      "staleness_policy.invalidate_on_engine_identity_drift",
    ),
    max_evidence_age_ms: requireNullableSafeInteger(
      record.max_evidence_age_ms,
      "staleness_policy.max_evidence_age_ms",
      1,
    ),
  };
}

function parseGenerationEvidence(
  value: unknown,
): AssurancePlanGenerationEvidenceV1 {
  const record = requireRecord(value, "plan_generation_evidence");
  requireExactKeys(record, [
    "planner_id",
    "planner_version",
    "planner_configuration_sha256",
    "decision_evidence_refs",
  ], "plan_generation_evidence");
  return {
    planner_id: requireOpaqueId(
      record.planner_id,
      "plan_generation_evidence.planner_id",
    ),
    planner_version: requireOpaqueId(
      record.planner_version,
      "plan_generation_evidence.planner_version",
    ),
    planner_configuration_sha256: requireSha256(
      record.planner_configuration_sha256,
      "plan_generation_evidence.planner_configuration_sha256",
    ),
    decision_evidence_refs: parseCanonicalOpaqueIds(
      record.decision_evidence_refs,
      "plan_generation_evidence.decision_evidence_refs",
    ),
  };
}

function effectIndex(effect: AssuranceEffectClass): number {
  return ASSURANCE_EFFECT_CLASSES.indexOf(effect);
}

function requireMonotonicSelections(
  plan: AssurancePlanV1,
  intent: AssuranceIntentV1,
  policy: AssurancePolicySnapshotV1,
): void {
  if (intent.target.policy_snapshot_id !== policy.policy_id) {
    throw new TypeError(
      "intent target policy_snapshot_id does not match policy snapshot",
    );
  }

  const selected = new Set(plan.selected_check_classes);
  for (const required of policy.minimum_mandatory_checks) {
    if (!selected.has(required)) {
      throw new TypeError(
        "plan must select every minimum mandatory check: " + required,
      );
    }
  }

  const omitted = new Set(plan.omitted_checks.map((entry) => entry.check_class));
  const overlap = plan.selected_check_classes.find((check) => omitted.has(check));
  if (overlap !== undefined) {
    throw new TypeError("selected and omitted checks overlap: " + overlap);
  }

  const policyCeiling = policy.effect_ceilings.find(
    (entry) => entry.scope === intent.scope,
  );
  if (policyCeiling === undefined) {
    throw new TypeError("policy effect ceiling missing for intent scope");
  }
  const intentCeilingIndex = effectIndex(intent.maximum_effect_class);
  const policyCeilingIndex = effectIndex(policyCeiling.maximum_effect_class);
  for (const effect of plan.required_effect_classes) {
    const index = effectIndex(effect);
    if (index > intentCeilingIndex) {
      throw new TypeError("required effect exceeds intent maximum: " + effect);
    }
    if (index > policyCeilingIndex) {
      throw new TypeError("required effect exceeds policy ceiling: " + effect);
    }
  }
}
function requireExactBindings(
  plan: AssurancePlanV1,
  intent: AssuranceIntentV1,
  policy: AssurancePolicySnapshotV1,
): void {
  if (plan.intent_id !== intent.intent_id) {
    throw new TypeError("plan intent_id does not match AssuranceIntent");
  }
  if (plan.target_id !== intent.target.target_id) {
    throw new TypeError("plan target_id does not match AssuranceIntent target");
  }
  if (plan.policy_id !== policy.policy_id) {
    throw new TypeError("plan policy_id does not match AssurancePolicySnapshot");
  }
  if (plan.policy_digest !== policy.policy_digest) {
    throw new TypeError(
      "plan policy_digest does not match AssurancePolicySnapshot",
    );
  }
  if (plan.requested_claim !== intent.requested_claim) {
    throw new TypeError("plan requested_claim does not match AssuranceIntent");
  }
  if (!isDeepStrictEqual(plan.budget_envelope, intent.budget)) {
    throw new TypeError("plan budget_envelope widens or changes AssuranceIntent");
  }

  const expectedQualification: AssurancePlanQualificationRequirementsV1 = {
    engine_qualification_requirements:
      policy.engine_qualification_requirements,
    independence_requirements: policy.independence_requirements,
  };
  if (
    !isDeepStrictEqual(plan.qualification_requirements, expectedQualification)
  ) {
    throw new TypeError(
      "plan qualification_requirements weaken or change policy",
    );
  }
  if (!isDeepStrictEqual(plan.staleness_policy, policy.freshness_rules)) {
    throw new TypeError("plan staleness_policy weakens or changes policy");
  }

  requireMonotonicSelections(plan, intent, policy);
}

export function parseAssurancePlanV1(value: unknown): AssurancePlanV1 {
  const record = requireRecord(value, "assurance plan");
  requireExactKeys(record, [
    "schema_version",
    "plan_id",
    "intent_id",
    "target_id",
    "policy_id",
    "policy_digest",
    "requested_claim",
    "selected_check_classes",
    "selected_engine_identities",
    "selected_runtime_requirements",
    "required_effect_classes",
    "qualification_requirements",
    "budget_envelope",
    "expected_evidence_types",
    "omitted_checks",
    "staleness_policy",
    "plan_generation_evidence",
  ], "assurance plan");

  if (record.schema_version !== ASSURANCE_PLAN_SCHEMA_VERSION) {
    throw new TypeError("assurance plan schema_version must equal 1");
  }

  return {
    schema_version: ASSURANCE_PLAN_SCHEMA_VERSION,
    plan_id: requireOpaqueId(record.plan_id, "plan_id"),
    intent_id: requireOpaqueId(record.intent_id, "intent_id"),
    target_id: requireOpaqueId(record.target_id, "target_id"),
    policy_id: requireOpaqueId(record.policy_id, "policy_id"),
    policy_digest: requireSha256(record.policy_digest, "policy_digest"),
    requested_claim: requireClaimId(record.requested_claim),
    selected_check_classes: parseCanonicalOpaqueIds(
      record.selected_check_classes,
      "selected_check_classes",
    ),
    selected_engine_identities: parseCanonicalOpaqueIds(
      record.selected_engine_identities,
      "selected_engine_identities",
    ),
    selected_runtime_requirements: parseCanonicalOpaqueIds(
      record.selected_runtime_requirements,
      "selected_runtime_requirements",
    ),
    required_effect_classes: parseCanonicalEffects(
      record.required_effect_classes,
    ),
    qualification_requirements: parseQualificationRequirements(
      record.qualification_requirements,
    ),
    budget_envelope: parseBudget(record.budget_envelope),
    expected_evidence_types: parseCanonicalOpaqueIds(
      record.expected_evidence_types,
      "expected_evidence_types",
    ),
    omitted_checks: parseCanonicalOmittedChecks(record.omitted_checks),
    staleness_policy: parseStalenessPolicy(record.staleness_policy),
    plan_generation_evidence: parseGenerationEvidence(
      record.plan_generation_evidence,
    ),
  };
}

export function createAssurancePlanV1(
  input: AssurancePlanInputV1,
): AssurancePlanV1 {
  const intent = parseAssuranceIntentV1(input.intent);
  const policy = parseAssurancePolicySnapshotV1(input.policy);

  const qualification: AssurancePlanQualificationRequirementsV1 = {
    engine_qualification_requirements: {
      ...policy.engine_qualification_requirements,
    },
    independence_requirements: { ...policy.independence_requirements },
  };

  const plan = parseAssurancePlanV1({
    schema_version: ASSURANCE_PLAN_SCHEMA_VERSION,
    plan_id: input.plan_id,
    intent_id: intent.intent_id,
    target_id: intent.target.target_id,
    policy_id: policy.policy_id,
    policy_digest: policy.policy_digest,
    requested_claim: intent.requested_claim,
    selected_check_classes: normalizeOpaqueIds(
      input.selected_check_classes,
      "selected_check_classes",
    ),
    selected_engine_identities: normalizeOpaqueIds(
      input.selected_engine_identities,
      "selected_engine_identities",
    ),
    selected_runtime_requirements: normalizeOpaqueIds(
      input.selected_runtime_requirements,
      "selected_runtime_requirements",
    ),
    required_effect_classes: normalizeEffects(input.required_effect_classes),
    qualification_requirements: qualification,
    budget_envelope: { ...intent.budget },
    expected_evidence_types: normalizeOpaqueIds(
      input.expected_evidence_types,
      "expected_evidence_types",
    ),
    omitted_checks: normalizeOmittedChecks(input.omitted_checks),
    staleness_policy: { ...policy.freshness_rules },
    plan_generation_evidence: {
      planner_id: requireOpaqueId(
        input.plan_generation_evidence.planner_id,
        "plan_generation_evidence.planner_id",
      ),
      planner_version: requireOpaqueId(
        input.plan_generation_evidence.planner_version,
        "plan_generation_evidence.planner_version",
      ),
      planner_configuration_sha256: requireSha256(
        input.plan_generation_evidence.planner_configuration_sha256,
        "plan_generation_evidence.planner_configuration_sha256",
      ),
      decision_evidence_refs: normalizeOpaqueIds(
        input.plan_generation_evidence.decision_evidence_refs,
        "plan_generation_evidence.decision_evidence_refs",
      ),
    },
  });

  requireExactBindings(plan, intent, policy);
  return plan;
}

export function assertAssurancePlanBindingsV1(
  plan: unknown,
  intent: unknown,
  policy: unknown,
): void {
  const parsedPlan = parseAssurancePlanV1(plan);
  const parsedIntent = parseAssuranceIntentV1(intent);
  const parsedPolicy = parseAssurancePolicySnapshotV1(policy);
  requireExactBindings(parsedPlan, parsedIntent, parsedPolicy);
}
