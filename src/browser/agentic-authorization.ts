/**
 * Spec 016 P016-12: agentic proposal authorization.
 *
 * Bounded authorization gate that must exist before any model-based
 * browser agent work. Agents are proposal-only: they may cite inputs
 * and suggest journeys/tests, but they hold no PASS authority, no
 * merge authority, and no canonical mutation rights.
 *
 * Authority rules enforced here:
 *
 * - an authorization names the exact model/provider policy, prompt and
 *   tool allowlists, privacy/data-handling policy, deterministic
 *   fallback, budget envelope, and benchmark need; any missing field
 *   fails closed;
 * - proposals must cite at least one input ref and use only allowlisted
 *   tools; anything else is rejected, never healed;
 * - budget exhaustion is visible: remaining budget is computed data and
 *   proposals past exhaustion throw;
 * - authorization can never confer PASS, merge, or canonical-test
 *   mutation rights — the denial is structural, not a flag;
 * - one authorization binds one source context; cross-tree proposals throw;
 * - deterministic serialization with sha256 digest and strict
 *   revalidating JSON parse.
 */

import { createHash } from "node:crypto";

export interface AgentBudget {
  readonly max_proposals: number;
  readonly max_tool_calls: number;
}

export interface AgenticAuthorization {
  readonly authorization_id: string;
  readonly source_identity: string;
  readonly model_policy: string;
  readonly provider_policy: string;
  readonly privacy_policy: string;
  readonly prompt_allowlist: readonly string[];
  readonly tool_allowlist: readonly string[];
  readonly deterministic_fallback: string;
  readonly benchmark_need: string;
  readonly budget: AgentBudget;
}

export interface AgentProposal {
  readonly proposal_id: string;
  readonly authorization_id: string;
  readonly source_identity: string;
  readonly input_refs: readonly string[];
  readonly tools_used: readonly string[];
  readonly prompt_id: string;
  readonly tool_call_count: number;
  readonly payload_digest: string;
}

export interface ProposalAdmission {
  readonly proposal_id: string;
  readonly admitted: boolean;
  readonly blocking_reasons: readonly string[];
  readonly remaining_proposals: number;
  readonly remaining_tool_calls: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireId(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value;
}

function readString(entry: Record<string, unknown>, field: string): string {
  const value = entry[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value;
}

function readNumber(entry: Record<string, unknown>, field: string): number {
  const value = entry[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive integer`);
  }
  return value;
}

function readNonNegativeNumber(entry: Record<string, unknown>, field: string): number {
  const value = entry[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative integer`);
  }
  return value;
}

function readStringArray(entry: Record<string, unknown>, field: string): string[] {
  const value = entry[field];
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  return value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new TypeError(`${field}[${index}] must be a non-empty string`);
    }
    return item;
  });
}

function readRecord(entry: Record<string, unknown>, field: string): Record<string, unknown> {
  const value = entry[field];
  if (!isRecord(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  return value;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort(compareText)) {
      out[key] = canonicalize(value[key]);
    }
    return out;
  }
  return value;
}

export function createAgentBudget(input: { max_proposals: number; max_tool_calls: number }): AgentBudget {
  if (!Number.isInteger(input.max_proposals) || input.max_proposals <= 0) {
    throw new TypeError("max_proposals must be a positive integer");
  }
  if (!Number.isInteger(input.max_tool_calls) || input.max_tool_calls <= 0) {
    throw new TypeError("max_tool_calls must be a positive integer");
  }
  return { max_proposals: input.max_proposals, max_tool_calls: input.max_tool_calls };
}

export function createAgenticAuthorization(input: {
  authorization_id: string;
  source_identity: string;
  model_policy: string;
  provider_policy: string;
  privacy_policy: string;
  prompt_allowlist: readonly string[];
  tool_allowlist: readonly string[];
  deterministic_fallback: string;
  benchmark_need: string;
  budget: AgentBudget;
}): AgenticAuthorization {
  const authorization_id = requireId(input.authorization_id, "authorization_id");
  const source_identity = requireId(input.source_identity, "source_identity");
  const model_policy = requireId(input.model_policy, "model_policy");
  const provider_policy = requireId(input.provider_policy, "provider_policy");
  const privacy_policy = requireId(input.privacy_policy, "privacy_policy");
  const deterministic_fallback = requireId(input.deterministic_fallback, "deterministic_fallback");
  const benchmark_need = requireId(input.benchmark_need, "benchmark_need");
  if (input.prompt_allowlist.length === 0) {
    throw new TypeError("prompt_allowlist must contain at least one prompt");
  }
  if (input.tool_allowlist.length === 0) {
    throw new TypeError("tool_allowlist must contain at least one tool");
  }
  const prompt_allowlist = [...input.prompt_allowlist];
  for (const prompt of prompt_allowlist) {
    requireId(prompt, "prompt_id");
  }
  const tool_allowlist = [...input.tool_allowlist];
  for (const tool of tool_allowlist) {
    requireId(tool, "tool_id");
  }
  const budget = createAgentBudget(input.budget);
  return {
    authorization_id,
    benchmark_need,
    budget,
    deterministic_fallback,
    model_policy,
    privacy_policy,
    prompt_allowlist: [...prompt_allowlist].sort(compareText),
    provider_policy,
    source_identity,
    tool_allowlist: [...tool_allowlist].sort(compareText),
  };
}

export function createAgentProposal(input: {
  proposal_id: string;
  authorization_id: string;
  source_identity: string;
  input_refs: readonly string[];
  tools_used: readonly string[];
  prompt_id: string;
  tool_call_count: number;
  payload_digest: string;
}): AgentProposal {
  const proposal_id = requireId(input.proposal_id, "proposal_id");
  const authorization_id = requireId(input.authorization_id, "authorization_id");
  const source_identity = requireId(input.source_identity, "source_identity");
  const prompt_id = requireId(input.prompt_id, "prompt_id");
  const payload_digest = requireId(input.payload_digest, "payload_digest");
  if (input.input_refs.length === 0) {
    throw new TypeError("proposals must cite at least one input ref");
  }
  const input_refs = [...input.input_refs];
  for (const ref of input_refs) {
    requireId(ref, "input_ref");
  }
  const tools_used = [...input.tools_used];
  for (const tool of tools_used) {
    requireId(tool, "tool_id");
  }
  if (!Number.isInteger(input.tool_call_count) || input.tool_call_count < 0) {
    throw new TypeError("tool_call_count must be a non-negative integer");
  }
  return {
    authorization_id,
    input_refs: [...input_refs].sort(compareText),
    payload_digest,
    prompt_id,
    proposal_id,
    source_identity,
    tool_call_count: input.tool_call_count,
    tools_used: [...tools_used].sort(compareText),
  };
}

/**
 * Admission decision. A proposal is admitted only when it binds the
 * authorization's source, cites inputs, uses allowlisted prompts/tools,
 * and fits the remaining budget. Admission confers no PASS, merge, or
 * mutation rights — those denials are structural: this function has no
 * code path that can grant them.
 */
export function evaluateProposalAdmission(
  authorization: AgenticAuthorization,
  proposal: AgentProposal,
  consumed: { proposals_used: number; tool_calls_used: number },
): ProposalAdmission {
  const blocking_reasons: string[] = [];
  if (proposal.authorization_id !== authorization.authorization_id) {
    blocking_reasons.push("authorization-mismatch");
  }
  if (proposal.source_identity !== authorization.source_identity) {
    blocking_reasons.push("cross-tree-proposal");
  }
  if (!authorization.prompt_allowlist.includes(proposal.prompt_id)) {
    blocking_reasons.push("prompt-not-allowlisted");
  }
  for (const tool of proposal.tools_used) {
    if (!authorization.tool_allowlist.includes(tool)) {
      blocking_reasons.push(`tool-not-allowlisted:${tool}`);
    }
  }
  const remaining_proposals = authorization.budget.max_proposals - consumed.proposals_used;
  const remaining_tool_calls = authorization.budget.max_tool_calls - consumed.tool_calls_used;
  if (remaining_proposals <= 0) {
    blocking_reasons.push("proposal-budget-exhausted");
  }
  if (proposal.tool_call_count > Math.max(remaining_tool_calls, 0)) {
    blocking_reasons.push("tool-call-budget-exceeded");
  }
  return {
    admitted: blocking_reasons.length === 0,
    blocking_reasons,
    proposal_id: proposal.proposal_id,
    remaining_proposals: Math.max(remaining_proposals - 1, 0),
    remaining_tool_calls: Math.max(remaining_tool_calls - proposal.tool_call_count, 0),
  };
}

export function agenticAuthorizationDigest(authorization: AgenticAuthorization): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(authorization))).digest("hex");
}

export function agenticAuthorizationToJson(authorization: AgenticAuthorization): string {
  return JSON.stringify(canonicalize(authorization));
}

/**
 * Strict authorization parsing with full revalidation: every factory
 * reruns, so a serialized authorization with missing policy, empty
 * allowlists, or invalid budget cannot parse.
 */
export function agenticAuthorizationFromJson(raw: string): AgenticAuthorization {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("agentic authorization JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("agentic authorization JSON must be an object");
  }
  const budgetEntry = readRecord(parsed, "budget");
  return createAgenticAuthorization({
    authorization_id: readString(parsed, "authorization_id"),
    benchmark_need: readString(parsed, "benchmark_need"),
    budget: createAgentBudget({
      max_proposals: readNumber(budgetEntry, "max_proposals"),
      max_tool_calls: readNumber(budgetEntry, "max_tool_calls"),
    }),
    deterministic_fallback: readString(parsed, "deterministic_fallback"),
    model_policy: readString(parsed, "model_policy"),
    privacy_policy: readString(parsed, "privacy_policy"),
    prompt_allowlist: readStringArray(parsed, "prompt_allowlist"),
    provider_policy: readString(parsed, "provider_policy"),
    source_identity: readString(parsed, "source_identity"),
    tool_allowlist: readStringArray(parsed, "tool_allowlist"),
  });
}

export function agentProposalFromJson(raw: string): AgentProposal {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("agent proposal JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("agent proposal JSON must be an object");
  }
  return createAgentProposal({
    authorization_id: readString(parsed, "authorization_id"),
    input_refs: readStringArray(parsed, "input_refs"),
    payload_digest: readString(parsed, "payload_digest"),
    prompt_id: readString(parsed, "prompt_id"),
    proposal_id: readString(parsed, "proposal_id"),
    source_identity: readString(parsed, "source_identity"),
    tool_call_count: readNonNegativeNumber(parsed, "tool_call_count"),
    tools_used: readStringArray(parsed, "tools_used"),
  });
}
