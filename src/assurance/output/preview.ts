import {
  canonicalAssuranceJsonV1,
  canonicalAssuranceSha256V1,
} from "../contracts/canonical-serialization.js";
import {
  parseAssurancePlanV1,
  type AssurancePlanV1,
} from "../contracts/plan.js";

export const PLAN_PREVIEW_SCHEMA_VERSION = 1 as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requirePlan(value: unknown): AssurancePlanV1 {
  if (!isRecord(value)) {
    throw new TypeError("assurance plan preview input must be an object");
  }
  return parseAssurancePlanV1(value);
}

function previewObject(plan: AssurancePlanV1): Record<string, unknown> {
  return {
    schema_version: PLAN_PREVIEW_SCHEMA_VERSION,
    plan_id: plan.plan_id,
    intent_id: plan.intent_id,
    target_id: plan.target_id,
    policy_id: plan.policy_id,
    policy_digest: plan.policy_digest,
    requested_claim: plan.requested_claim,
    scope_effect_summary: {
      required_effect_classes: [...plan.required_effect_classes],
    },
    selected_check_classes: [...plan.selected_check_classes],
    selected_engine_identities: [...plan.selected_engine_identities],
    omitted_checks: plan.omitted_checks.map((entry) => ({
      check_class: entry.check_class,
      reason: entry.reason,
    })),
    budget_envelope: { ...plan.budget_envelope },
    plan_digest: canonicalAssuranceSha256V1(plan),
  };
}

export function renderPlanPreviewJsonV1(plan: unknown): string {
  const parsed = requirePlan(plan);
  return canonicalAssuranceJsonV1(previewObject(parsed));
}

export function renderPlanPreviewTerminalV1(plan: unknown): string {
  const parsed = requirePlan(plan);
  const lines: string[] = [];
  lines.push("Ascout assurance plan preview v1");
  lines.push("plan_id: " + parsed.plan_id);
  lines.push("intent_id: " + parsed.intent_id);
  lines.push("target_id: " + parsed.target_id);
  lines.push("policy_id: " + parsed.policy_id);
  lines.push("policy_digest: " + parsed.policy_digest);
  lines.push("requested_claim: " + parsed.requested_claim);
  lines.push(
    "required_effect_classes: " +
      (parsed.required_effect_classes.length === 0
        ? "(none)"
        : [...parsed.required_effect_classes].join(", ")),
  );
  lines.push(
    "selected_check_classes: " +
      (parsed.selected_check_classes.length === 0
        ? "(none)"
        : [...parsed.selected_check_classes].join(", ")),
  );
  lines.push(
    "selected_engine_identities: " +
      (parsed.selected_engine_identities.length === 0
        ? "(none)"
        : [...parsed.selected_engine_identities].join(", ")),
  );
  if (parsed.omitted_checks.length === 0) {
    lines.push("omitted_checks: (none)");
  } else {
    lines.push("omitted_checks:");
    for (const omitted of parsed.omitted_checks) {
      lines.push("  - " + omitted.check_class + ": " + omitted.reason);
    }
  }
  lines.push("plan_digest: " + canonicalAssuranceSha256V1(parsed));
  lines.push("execution: NOT_TRIGGERED_BY_PREVIEW");
  return lines.join("\n") + "\n";
}

export function planPreviewDigestV1(plan: unknown): string {
  const parsed = requirePlan(plan);
  return canonicalAssuranceSha256V1(previewObject(parsed));
}
