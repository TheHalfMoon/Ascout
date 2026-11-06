import {
  projectTestProfilePlanFieldsV1,
  type TestProfile,
  type TestProfilePlanProjectionV1,
} from "./profile-policy.js";

export const TEST_PLAN_COMMAND_SCHEMA_VERSION = 1 as const;

export const TEST_PLAN_DEFAULT_PROFILE: TestProfile = "STANDARD";

export const TEST_NOT_RUN_EXIT_CODE = 4 as const;
export const TEST_PLAN_ONLY_EXIT_CODE = 0 as const;

export type TestCommandReportV1 = TestProfilePlanProjectionV1 &
  Readonly<{
    kind: "test";
    schema_version: typeof TEST_PLAN_COMMAND_SCHEMA_VERSION;
    executed_count: 0;
    reason_text: string;
  }> &
  (
    | Readonly<{ outcome: "NOT_RUN"; reason_code: "ENGINE_NOT_EXECUTED"; exit_code: typeof TEST_NOT_RUN_EXIT_CODE }>
    | Readonly<{ outcome: "NON_ASSURANCE_PLAN"; reason_code: "PLAN_ONLY"; exit_code: typeof TEST_PLAN_ONLY_EXIT_CODE }>
  );

export function buildTestPlanV1(profile: string): TestProfilePlanProjectionV1 {
  return projectTestProfilePlanFieldsV1(profile);
}

export function buildTestCommandReportV1(profile: string, planOnly: boolean): TestCommandReportV1 {
  const plan = buildTestPlanV1(profile);
  const shared = {
    ...plan,
    kind: "test",
    schema_version: TEST_PLAN_COMMAND_SCHEMA_VERSION,
    executed_count: 0,
  } as const;
  if (planOnly) {
    return Object.freeze({
      ...shared,
      outcome: "NON_ASSURANCE_PLAN",
      reason_code: "PLAN_ONLY",
      reason_text: `This renders the ${plan.profile} plan only. No test ran, and this is not a test result.`,
      exit_code: TEST_PLAN_ONLY_EXIT_CODE,
    });
  }
  return Object.freeze({
    ...shared,
    outcome: "NOT_RUN",
    reason_code: "ENGINE_NOT_EXECUTED",
    reason_text: `No test engine is executed by this command, so the verification required by the ${plan.profile} profile did not run.`,
    exit_code: TEST_NOT_RUN_EXIT_CODE,
  });
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

export function renderTestCommandTerminalV1(report: TestCommandReportV1): string {
  const [planHeader, ...planBody] = renderTestPlanTerminalV1(report).split("\n");
  return [
    report.outcome === "NOT_RUN" ? "=== Ascout Test (NOT_RUN) ===" : planHeader,
    `outcome: ${report.outcome} (${report.reason_code})`,
    report.reason_text,
    `executed: ${report.executed_count}`,
    `exit code: ${report.exit_code}`,
    ...planBody,
  ].join("\n");
}
