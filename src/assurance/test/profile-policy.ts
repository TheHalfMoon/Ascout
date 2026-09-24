import {
  ASSURANCE_EFFECT_CLASSES,
  type AssuranceEffectClass,
  type AssuranceIntentBudgetV1,
} from "../contracts/intent.js";

export const TEST_PROFILE_POLICY_SCHEMA_VERSION = 1 as const;

export const TEST_PROFILES = [
  "QUICK",
  "STANDARD",
  "DEEP",
  "RELEASE",
] as const;

export type TestProfile = (typeof TEST_PROFILES)[number];

export const TEST_ADAPTER_STRATEGY = "adapter-first" as const;

export interface TestProfilePolicyV1 {
  readonly schema_version: 1;
  readonly profile: TestProfile;
  readonly scope: "TEST";
  readonly adapter_strategy: typeof TEST_ADAPTER_STRATEGY;
  readonly budgets: AssuranceIntentBudgetV1;
  readonly predicted_effect_classes: readonly AssuranceEffectClass[];
  readonly plan_visible_fields: readonly string[];
}

export interface TestProfilePlanProjectionV1 {
  readonly profile: TestProfile;
  readonly scope: "TEST";
  readonly adapter_strategy: typeof TEST_ADAPTER_STRATEGY;
  readonly budgets: AssuranceIntentBudgetV1;
  readonly predicted_effect_classes: readonly AssuranceEffectClass[];
}

const PLAN_VISIBLE_FIELDS: readonly string[] = [
  "adapter_strategy",
  "budgets",
  "predicted_effect_classes",
  "profile",
  "scope",
] as const;

function effectIndex(effect: AssuranceEffectClass): number {
  const index = ASSURANCE_EFFECT_CLASSES.indexOf(effect);
  if (index < 0) {
    throw new TypeError("Unknown effect class: " + effect);
  }
  return index;
}

function canonicalEffects(
  effects: readonly AssuranceEffectClass[],
): readonly AssuranceEffectClass[] {
  const unique = [...new Set(effects)];
  for (const effect of unique) {
    effectIndex(effect);
  }
  unique.sort((a, b) => effectIndex(a) - effectIndex(b));
  return unique;
}

function freezeBudget(budget: AssuranceIntentBudgetV1): AssuranceIntentBudgetV1 {
  return {
    max_wall_time_ms: budget.max_wall_time_ms,
    max_concurrency: budget.max_concurrency,
    max_engine_runs: budget.max_engine_runs,
    max_artifact_bytes: budget.max_artifact_bytes,
    max_network_requests: budget.max_network_requests,
    max_network_egress_bytes: budget.max_network_egress_bytes,
    max_model_tokens: budget.max_model_tokens,
    max_cost_microunits: budget.max_cost_microunits,
  };
}

const QUICK_POLICY: TestProfilePolicyV1 = {
  schema_version: 1,
  profile: "QUICK",
  scope: "TEST",
  adapter_strategy: TEST_ADAPTER_STRATEGY,
  budgets: {
    max_wall_time_ms: 60000,
    max_concurrency: 4,
    max_engine_runs: 10,
    max_artifact_bytes: 10485760,
    max_network_requests: 0,
    max_network_egress_bytes: 0,
    max_model_tokens: 0,
    max_cost_microunits: 0,
  },
  predicted_effect_classes: canonicalEffects([
    "E0_READ_ONLY_ANALYSIS",
    "E1_LOCAL_DETERMINISTIC_PROCESS",
    "E2_LOCAL_WRITE_ARTIFACT_ONLY",
    "E3_ISOLATED_LOCAL_EXECUTION",
  ]),
  plan_visible_fields: PLAN_VISIBLE_FIELDS,
};

const STANDARD_POLICY: TestProfilePolicyV1 = {
  schema_version: 1,
  profile: "STANDARD",
  scope: "TEST",
  adapter_strategy: TEST_ADAPTER_STRATEGY,
  budgets: {
    max_wall_time_ms: 300000,
    max_concurrency: 8,
    max_engine_runs: 50,
    max_artifact_bytes: 52428800,
    max_network_requests: 0,
    max_network_egress_bytes: 0,
    max_model_tokens: 0,
    max_cost_microunits: 0,
  },
  predicted_effect_classes: canonicalEffects([
    "E0_READ_ONLY_ANALYSIS",
    "E1_LOCAL_DETERMINISTIC_PROCESS",
    "E2_LOCAL_WRITE_ARTIFACT_ONLY",
    "E3_ISOLATED_LOCAL_EXECUTION",
  ]),
  plan_visible_fields: PLAN_VISIBLE_FIELDS,
};

const DEEP_POLICY: TestProfilePolicyV1 = {
  schema_version: 1,
  profile: "DEEP",
  scope: "TEST",
  adapter_strategy: TEST_ADAPTER_STRATEGY,
  budgets: {
    max_wall_time_ms: 600000,
    max_concurrency: 8,
    max_engine_runs: 200,
    max_artifact_bytes: 209715200,
    max_network_requests: 0,
    max_network_egress_bytes: 0,
    max_model_tokens: 0,
    max_cost_microunits: 0,
  },
  predicted_effect_classes: canonicalEffects([
    "E0_READ_ONLY_ANALYSIS",
    "E1_LOCAL_DETERMINISTIC_PROCESS",
    "E2_LOCAL_WRITE_ARTIFACT_ONLY",
    "E3_ISOLATED_LOCAL_EXECUTION",
    "E4_BROWSER_OR_APP_INTERACTION",
  ]),
  plan_visible_fields: PLAN_VISIBLE_FIELDS,
};

const RELEASE_POLICY: TestProfilePolicyV1 = {
  schema_version: 1,
  profile: "RELEASE",
  scope: "TEST",
  adapter_strategy: TEST_ADAPTER_STRATEGY,
  budgets: {
    max_wall_time_ms: 1200000,
    max_concurrency: 8,
    max_engine_runs: 500,
    max_artifact_bytes: 524288000,
    max_network_requests: 0,
    max_network_egress_bytes: 0,
    max_model_tokens: 0,
    max_cost_microunits: 0,
  },
  predicted_effect_classes: canonicalEffects([
    "E0_READ_ONLY_ANALYSIS",
    "E1_LOCAL_DETERMINISTIC_PROCESS",
    "E2_LOCAL_WRITE_ARTIFACT_ONLY",
    "E3_ISOLATED_LOCAL_EXECUTION",
    "E4_BROWSER_OR_APP_INTERACTION",
  ]),
  plan_visible_fields: PLAN_VISIBLE_FIELDS,
};

const POLICIES: Record<TestProfile, TestProfilePolicyV1> = {
  QUICK: QUICK_POLICY,
  STANDARD: STANDARD_POLICY,
  DEEP: DEEP_POLICY,
  RELEASE: RELEASE_POLICY,
};

function isTestProfile(value: unknown): value is TestProfile {
  return (
    value === "QUICK" ||
    value === "STANDARD" ||
    value === "DEEP" ||
    value === "RELEASE"
  );
}

export function listTestProfilePoliciesV1(): readonly TestProfilePolicyV1[] {
  return [POLICIES.QUICK, POLICIES.STANDARD, POLICIES.DEEP, POLICIES.RELEASE];
}

export function getTestProfilePolicyV1(profile: string): TestProfilePolicyV1 {
  if (!isTestProfile(profile)) {
    throw new TypeError("Unknown test profile: " + String(profile));
  }
  return POLICIES[profile];
}

export function resolveTestProfileBudgetV1(
  profile: string,
): AssuranceIntentBudgetV1 {
  return freezeBudget(getTestProfilePolicyV1(profile).budgets);
}

export function predictTestProfileEffectsV1(
  profile: string,
): readonly AssuranceEffectClass[] {
  return getTestProfilePolicyV1(profile).predicted_effect_classes;
}

export function projectTestProfilePlanFieldsV1(
  profile: string,
): TestProfilePlanProjectionV1 {
  const policy = getTestProfilePolicyV1(profile);
  return {
    profile: policy.profile,
    scope: policy.scope,
    adapter_strategy: policy.adapter_strategy,
    budgets: freezeBudget(policy.budgets),
    predicted_effect_classes: policy.predicted_effect_classes,
  };
}
