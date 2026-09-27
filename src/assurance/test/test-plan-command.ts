import {
  projectTestProfilePlanFieldsV1,
  type TestProfile,
  type TestProfilePlanProjectionV1,
} from "./profile-policy.js";

export const TEST_PLAN_COMMAND_SCHEMA_VERSION = 1 as const;

export const TEST_PLAN_DEFAULT_PROFILE: TestProfile = "STANDARD";

export function buildTestPlanV1(profile: string): TestProfilePlanProjectionV1 {
  return projectTestProfilePlanFieldsV1(profile);
}

export function renderTestPlanJsonV1(plan: TestProfilePlanProjectionV1): string {
  return JSON.stringify(plan, null, 2) + "\n";
}

export function renderTestPlanTerminalV1(plan: TestProfilePlanProjectionV1): string {
  const lines: string[] = [];
  lines.push("=== Ascout Test Plan (plan only, no execution) ===");
  lines.push(`profile: ${plan.profile}`);
  lines.push(`scope: ${plan.scope}`);
  lines.push(`strategy: ${plan.adapter_strategy}`);
  lines.push("budgets:");
  lines.push(`  max_wall_time_ms: ${String(plan.budgets.max_wall_time_ms)}`);
  lines.push(`  max_concurrency: ${String(plan.budgets.max_concurrency)}`);
  lines.push(`  max_engine_runs: ${String(plan.budgets.max_engine_runs)}`);
  lines.push(`  max_artifact_bytes: ${String(plan.budgets.max_artifact_bytes)}`);
  lines.push(`  max_network_requests: ${String(plan.budgets.max_network_requests)}`);
  lines.push(`  max_network_egress_bytes: ${String(plan.budgets.max_network_egress_bytes)}`);
  lines.push(`  max_model_tokens: ${String(plan.budgets.max_model_tokens)}`);
  lines.push(`  max_cost_microunits: ${String(plan.budgets.max_cost_microunits)}`);
  lines.push("predicted effects:");
  for (const effect of plan.predicted_effect_classes) {
    lines.push(`  ${effect}`);
  }
  return lines.join("\n");
}
