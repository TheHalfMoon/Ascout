import { CHECK_IDS, evaluateRequiredChecksV1, type CheckId, type PolicyEvaluationV1, type PrEvidenceV1 } from "./pr-evidence.js";

/**
 * Team policy for the GitHub integration: which checks a pull request must complete.
 *
 * The publisher reads the policy from its own default-branch checkout, never from the pull request,
 * so a PR can't relax its own requirements. Rules:
 * - A finding, error, or source change in any check always fails: those are real problems.
 * - Only the checks the policy lists as required must be complete.
 * - With no policy file, every check is required.
 */
export const POLICY_SCHEMA_VERSION = 1 as const;
export const DEFAULT_POLICY_PATH = ".github/ascout-policy.json";
export const POLICY_MAX_BYTES = 16 * 1024;

export interface PrPolicyV1 {
  readonly version: typeof POLICY_SCHEMA_VERSION;
  readonly required_checks: readonly CheckId[];
  /** Where the policy came from, for the report. */
  readonly source: "default" | "file";
}

export const DEFAULT_PR_POLICY: PrPolicyV1 = Object.freeze({ version: 1, required_checks: Object.freeze([...CHECK_IDS]), source: "default" });

export type PolicyParseResultV1 = { readonly ok: true; readonly policy: PrPolicyV1 } | { readonly ok: false; readonly reason: string };

/** Parses a policy file. Anything unexpected is refused, so a typo can't silently weaken the gate. */
export function parsePrPolicyV1(text: string): PolicyParseResultV1 {
  if (text.length > POLICY_MAX_BYTES) return { ok: false, reason: "policy file is too large" };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, reason: "policy file is not JSON" };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { ok: false, reason: "policy is not an object" };
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.join(",") !== "required_checks,version") return { ok: false, reason: "policy must have exactly: version, required_checks" };
  if (record.version !== POLICY_SCHEMA_VERSION) return { ok: false, reason: "unsupported policy version" };
  const required = record.required_checks;
  if (!Array.isArray(required) || required.length === 0) return { ok: false, reason: "required_checks must list at least one check" };
  const seen = new Set<string>();
  for (const id of required) {
    if (!CHECK_IDS.includes(id as CheckId)) return { ok: false, reason: `unknown check in required_checks: ${String(id).slice(0, 40)}` };
    if (seen.has(id as string)) return { ok: false, reason: `duplicate check in required_checks: ${String(id)}` };
    seen.add(id as string);
  }
  return { ok: true, policy: { version: 1, required_checks: [...CHECK_IDS].filter((id) => seen.has(id)), source: "file" } };
}

/** Evaluates evidence against a policy. A pass needs every required check complete and no check failing. */
export function evaluatePolicyV1(evidence: PrEvidenceV1, policy: PrPolicyV1): PolicyEvaluationV1 {
  return evaluateRequiredChecksV1(evidence, policy.required_checks);
}
