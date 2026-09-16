/**
 * Spec 016 P016-13: explore/planner agent.
 *
 * The planner reads requirements, diff facts, journey evidence, and
 * browser state, and emits structured proposals for missing journeys
 * or tests. Output is proposal data only: this module has no code
 * path that mutates canonical tests, grants PASS, or merges anything.
 *
 * Authority rules enforced here:
 *
 * - every proposal cites at least one input from each consumed input
 *   class that is non-empty (requirements, diff, journey evidence,
 *   browser state); uncited classes are declared as uncertainty, never
 *   silently ignored;
 * - every proposed candidate carries an uncertainty note and a
 *   rationale citing its inputs;
 * - budget accounting is explicit: candidates beyond max_candidates
 *   throw, and consumed tool calls past the authorization budget throw;
 * - proposals bind one authorization and one source; cross-tree input
 *   is rejected, never merged;
 * - deterministic serialization with sha256 digest and strict
 *   revalidating JSON parse.
 */

import { createHash } from "node:crypto";
import type { AgenticAuthorization } from "./agentic-authorization.js";

export interface PlannerInputs {
  readonly requirement_refs: readonly string[];
  readonly diff_refs: readonly string[];
  readonly journey_refs: readonly string[];
  readonly browser_state_refs: readonly string[];
}

export interface ProposedCandidate {
  readonly candidate_id: string;
  readonly kind: "missing-journey" | "missing-test";
  readonly rationale: string;
  readonly cited_inputs: readonly string[];
  readonly uncertainty: string;
}

export interface ExploreProposal {
  readonly proposal_id: string;
  readonly authorization_id: string;
  readonly source_identity: string;
  readonly inputs: PlannerInputs;
  readonly candidates: readonly ProposedCandidate[];
  readonly uncovered_input_classes: readonly string[];
  readonly tool_calls_used: number;
  readonly digest: string;
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

function readRecordArray(entry: Record<string, unknown>, field: string): Record<string, unknown>[] {
  const value = entry[field];
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new TypeError(`${field}[${index}] must be an object`);
    }
    return item;
  });
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

export const MAX_PLANNER_CANDIDATES = 25;

export function createPlannerInputs(input: {
  requirement_refs?: readonly string[];
  diff_refs?: readonly string[];
  journey_refs?: readonly string[];
  browser_state_refs?: readonly string[];
}): PlannerInputs {
  const readRefs = (refs: readonly string[] | undefined, field: string): string[] => {
    const list = [...(refs ?? [])];
    for (const ref of list) {
      requireId(ref, field);
    }
    return [...list].sort(compareText);
  };
  return {
    browser_state_refs: readRefs(input.browser_state_refs, "browser_state_ref"),
    diff_refs: readRefs(input.diff_refs, "diff_ref"),
    journey_refs: readRefs(input.journey_refs, "journey_ref"),
    requirement_refs: readRefs(input.requirement_refs, "requirement_ref"),
  };
}

export function createProposedCandidate(input: {
  candidate_id: string;
  kind: "missing-journey" | "missing-test";
  rationale: string;
  cited_inputs: readonly string[];
  uncertainty: string;
}): ProposedCandidate {
  const candidate_id = requireId(input.candidate_id, "candidate_id");
  if (input.kind !== "missing-journey" && input.kind !== "missing-test") {
    throw new TypeError("candidate kind must be missing-journey or missing-test");
  }
  const rationale = requireId(input.rationale, "rationale");
  const uncertainty = requireId(input.uncertainty, "uncertainty");
  if (input.cited_inputs.length === 0) {
    throw new TypeError("candidates must cite at least one input");
  }
  const cited_inputs = [...input.cited_inputs];
  for (const ref of cited_inputs) {
    requireId(ref, "cited_input");
  }
  return {
    candidate_id,
    cited_inputs: [...cited_inputs].sort(compareText),
    kind: input.kind,
    rationale,
    uncertainty,
  };
}

/**
 * Pure proposal builder. Returns proposal data bound to the given
 * authorization; it cannot write canonical tests, admit tests, or
 * confer verdicts — no such dependency is imported and no such output
 * exists on the returned record.
 */
export function planExploration(input: {
  proposal_id: string;
  authorization: AgenticAuthorization;
  source_identity: string;
  inputs: PlannerInputs;
  candidates: readonly ProposedCandidate[];
  tool_calls_used: number;
}): ExploreProposal {
  const proposal_id = requireId(input.proposal_id, "proposal_id");
  const source_identity = requireId(input.source_identity, "source_identity");
  if (source_identity !== input.authorization.source_identity) {
    throw new TypeError("cross-tree planner input rejected");
  }
  if (!Number.isInteger(input.tool_calls_used) || input.tool_calls_used < 0) {
    throw new TypeError("tool_calls_used must be a non-negative integer");
  }
  if (input.tool_calls_used > input.authorization.budget.max_tool_calls) {
    throw new TypeError("planner tool-call budget exhausted");
  }
  if (input.candidates.length > MAX_PLANNER_CANDIDATES) {
    throw new TypeError(`planner candidate budget exhausted: max ${MAX_PLANNER_CANDIDATES}`);
  }
  const knownInputs = new Set<string>([
    ...input.inputs.requirement_refs,
    ...input.inputs.diff_refs,
    ...input.inputs.journey_refs,
    ...input.inputs.browser_state_refs,
  ]);
  const seenCandidates = new Set<string>();
  const candidates = input.candidates.map((raw) => {
    const candidate = createProposedCandidate({
      candidate_id: raw.candidate_id,
      cited_inputs: [...raw.cited_inputs],
      kind: raw.kind,
      rationale: raw.rationale,
      uncertainty: raw.uncertainty,
    });
    if (seenCandidates.has(candidate.candidate_id)) {
      throw new TypeError(`duplicate candidate: ${candidate.candidate_id}`);
    }
    seenCandidates.add(candidate.candidate_id);
    for (const cited of candidate.cited_inputs) {
      if (!knownInputs.has(cited)) {
        throw new TypeError(`candidate ${candidate.candidate_id} cites unknown input ${cited}`);
      }
    }
    return candidate;
  });
  candidates.sort((a, b) => compareText(a.candidate_id, b.candidate_id));
  const citedAll = new Set<string>();
  for (const candidate of candidates) {
    for (const cited of candidate.cited_inputs) {
      citedAll.add(cited);
    }
  }
  const uncovered_input_classes: string[] = [];
  const classes: Array<[string, readonly string[]]> = [
    ["requirements", input.inputs.requirement_refs],
    ["diff", input.inputs.diff_refs],
    ["journey-evidence", input.inputs.journey_refs],
    ["browser-state", input.inputs.browser_state_refs],
  ];
  for (const [className, refs] of classes) {
    if (refs.length === 0) {
      uncovered_input_classes.push(`${className}:no-inputs`);
    } else if (!refs.some((ref) => citedAll.has(ref))) {
      uncovered_input_classes.push(`${className}:uncited`);
    }
  }
  uncovered_input_classes.sort(compareText);
  const body = {
    authorization_id: input.authorization.authorization_id,
    candidates,
    inputs: input.inputs,
    proposal_id,
    source_identity,
    tool_calls_used: input.tool_calls_used,
    uncovered_input_classes,
  };
  const digest = createHash("sha256").update(JSON.stringify(canonicalize(body))).digest("hex");
  return { ...body, digest };
}

export function exploreProposalToJson(proposal: ExploreProposal): string {
  return JSON.stringify(canonicalize(proposal));
}

function parseCandidate(entry: Record<string, unknown>): ProposedCandidate {
  const kind = readString(entry, "kind");
  if (kind !== "missing-journey" && kind !== "missing-test") {
    throw new TypeError("candidate kind must be missing-journey or missing-test");
  }
  return createProposedCandidate({
    candidate_id: readString(entry, "candidate_id"),
    cited_inputs: readStringArray(entry, "cited_inputs"),
    kind,
    rationale: readString(entry, "rationale"),
    uncertainty: readString(entry, "uncertainty"),
  });
}

/**
 * Strict proposal parsing with full revalidation: unknown citations,
 * duplicate candidates, and budget violations cannot parse.
 */
export function exploreProposalFromJson(
  raw: string,
  authorization: AgenticAuthorization,
): ExploreProposal {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("explore proposal JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("explore proposal JSON must be an object");
  }
  const inputsEntry = readRecord(parsed, "inputs");
  const rebuilt = planExploration({
    authorization,
    candidates: readRecordArray(parsed, "candidates").map(parseCandidate),
    inputs: createPlannerInputs({
      browser_state_refs: readStringArray(inputsEntry, "browser_state_refs"),
      diff_refs: readStringArray(inputsEntry, "diff_refs"),
      journey_refs: readStringArray(inputsEntry, "journey_refs"),
      requirement_refs: readStringArray(inputsEntry, "requirement_refs"),
    }),
    proposal_id: readString(parsed, "proposal_id"),
    source_identity: readString(parsed, "source_identity"),
    tool_calls_used: readNonNegativeNumber(parsed, "tool_calls_used"),
  });
  if (rebuilt.digest !== readString(parsed, "digest")) {
    throw new TypeError("explore proposal digest mismatch");
  }
  return rebuilt;
}
