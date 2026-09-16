/**
 * Spec 016 P016-11: change-to-journey mapping.
 *
 * Maps exact changed source facts to potentially affected browser
 * journeys conservatively. Uncertainty widens selection: unknown
 * relations never silently deselect relevant journeys, inferred
 * mappings stay visibly inferred, and selection accounting is explicit.
 *
 * Authority rules enforced here:
 *
 * - changed paths must be non-empty and unique; empty change sets throw;
 * - every journey candidate binds the same source context or is marked
 *   unknown-relation (which forces selection, never deselection);
 * - mapping kinds are closed: `direct-path`, `obligation-ref`,
 *   `inferred`, `unknown`;
 * - inferred mappings must carry a reason; unknown mappings force
 *   selection with a visible accounting entry;
 * - selection output is deterministic (sorted) with sha256 digest;
 * - strict JSON parsing revalidates all factories.
 */

import { createHash } from "node:crypto";

export type ChangeMappingKind =
  | "direct-path"
  | "obligation-ref"
  | "inferred"
  | "unknown";

export interface JourneyCandidate {
  readonly journey_id: string;
  readonly source_identity: string;
  readonly tracked_paths: readonly string[];
  readonly obligation_refs: readonly string[];
}

export interface ChangeMapping {
  readonly journey_id: string;
  readonly kind: ChangeMappingKind;
  readonly reason: string | null;
  readonly selected: boolean;
}

export interface ChangeSelection {
  readonly selection_id: string;
  readonly source_identity: string;
  readonly changed_paths: readonly string[];
  readonly mappings: readonly ChangeMapping[];
  readonly selected_journey_ids: readonly string[];
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

function readNullableString(entry: Record<string, unknown>, field: string): string | null {
  const value = entry[field];
  if (value === null) return null;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string or null`);
  }
  return value;
}

function readBoolean(entry: Record<string, unknown>, field: string): boolean {
  const value = entry[field];
  if (typeof value !== "boolean") {
    throw new TypeError(`${field} must be a boolean`);
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

function digestOf(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

export function createJourneyCandidate(input: {
  journey_id: string;
  source_identity: string;
  tracked_paths?: readonly string[];
  obligation_refs?: readonly string[];
}): JourneyCandidate {
  const journey_id = requireId(input.journey_id, "journey_id");
  const source_identity = requireId(input.source_identity, "source_identity");
  const tracked_paths = [...(input.tracked_paths ?? [])];
  for (const path of tracked_paths) {
    requireId(path, "tracked_path");
  }
  const obligation_refs = [...(input.obligation_refs ?? [])];
  for (const ref of obligation_refs) {
    requireId(ref, "obligation_ref");
  }
  return {
    journey_id,
    obligation_refs: [...obligation_refs].sort(compareText),
    source_identity,
    tracked_paths: [...tracked_paths].sort(compareText),
  };
}

function createMapping(input: {
  journey_id: string;
  kind: ChangeMappingKind;
  reason?: string | null;
  selected: boolean;
}): ChangeMapping {
  const journey_id = requireId(input.journey_id, "journey_id");
  if (
    input.kind !== "direct-path" &&
    input.kind !== "obligation-ref" &&
    input.kind !== "inferred" &&
    input.kind !== "unknown"
  ) {
    throw new TypeError("mapping kind must be a closed vocabulary value");
  }
  if (input.kind === "inferred") {
    if (input.reason === null || input.reason === undefined || input.reason.trim().length === 0) {
      throw new TypeError("inferred mappings must carry a reason");
    }
    return { journey_id, kind: input.kind, reason: input.reason, selected: input.selected };
  }
  if (input.kind === "unknown" && input.selected !== true) {
    throw new TypeError("unknown relations must force selection, never deselection");
  }
  return { journey_id, kind: input.kind, reason: input.reason ?? null, selected: input.selected };
}

/**
 * Conservative selection: a journey is selected when any changed path
 * matches a tracked path, any changed obligation token matches, an
 * inferred reason applies, or — failing all of those — as `unknown`
 * (selected, visibly accounted). Deselection requires an explicit
 * non-unknown mapping with no match.
 */
export function selectJourneysForChanges(input: {
  selection_id: string;
  source_identity: string;
  changed_paths: readonly string[];
  changed_obligation_refs?: readonly string[];
  candidates: readonly JourneyCandidate[];
  inferred?: Readonly<Record<string, string>>;
}): ChangeSelection {
  const selection_id = requireId(input.selection_id, "selection_id");
  const source_identity = requireId(input.source_identity, "source_identity");
  if (input.changed_paths.length === 0) {
    throw new TypeError("changed_paths must contain at least one path");
  }
  const seenPaths = new Set<string>();
  const changed_paths = input.changed_paths.map((path) => {
    const cleaned = requireId(path, "changed_path");
    if (seenPaths.has(cleaned)) {
      throw new TypeError(`duplicate changed path: ${cleaned}`);
    }
    seenPaths.add(cleaned);
    return cleaned;
  });
  const changedObligations = new Set<string>();
  for (const ref of input.changed_obligation_refs ?? []) {
    changedObligations.add(requireId(ref, "changed_obligation_ref"));
  }
  const inferred = input.inferred ?? {};
  const seenJourneys = new Set<string>();
  const mappings: ChangeMapping[] = [];
  for (const raw of input.candidates) {
    const candidate = createJourneyCandidate({
      journey_id: raw.journey_id,
      obligation_refs: [...raw.obligation_refs],
      source_identity: raw.source_identity,
      tracked_paths: [...raw.tracked_paths],
    });
    if (seenJourneys.has(candidate.journey_id)) {
      throw new TypeError(`duplicate journey candidate: ${candidate.journey_id}`);
    }
    seenJourneys.add(candidate.journey_id);
    if (candidate.source_identity !== source_identity) {
      mappings.push(
        createMapping({ journey_id: candidate.journey_id, kind: "unknown", reason: "source-context-mismatch", selected: true }),
      );
      continue;
    }
    const directHit = candidate.tracked_paths.some((tracked) => seenPaths.has(tracked));
    if (directHit) {
      mappings.push(createMapping({ journey_id: candidate.journey_id, kind: "direct-path", selected: true }));
      continue;
    }
    const obligationHit = candidate.obligation_refs.some((ref) => changedObligations.has(ref));
    if (obligationHit) {
      mappings.push(createMapping({ journey_id: candidate.journey_id, kind: "obligation-ref", selected: true }));
      continue;
    }
    const reason = (inferred as Record<string, string>)[candidate.journey_id];
    if (typeof reason === "string" && reason.trim().length > 0) {
      mappings.push(
        createMapping({ journey_id: candidate.journey_id, kind: "inferred", reason, selected: true }),
      );
      continue;
    }
    if (candidate.tracked_paths.length === 0 && candidate.obligation_refs.length === 0) {
      mappings.push(
        createMapping({ journey_id: candidate.journey_id, kind: "unknown", reason: "no-binding-facts", selected: true }),
      );
      continue;
    }
    mappings.push(createMapping({ journey_id: candidate.journey_id, kind: "unknown", reason: "no-proven-relation", selected: true }));
  }
  mappings.sort((a, b) => compareText(a.journey_id, b.journey_id));
  const selected_journey_ids = mappings.filter((mapping) => mapping.selected).map((mapping) => mapping.journey_id);
  const digest = digestOf({
    changed_paths: [...changed_paths].sort(compareText),
    mappings,
    selected_journey_ids,
    selection_id,
    source_identity,
  });
  return {
    changed_paths: [...changed_paths].sort(compareText),
    digest,
    mappings,
    selected_journey_ids,
    selection_id,
    source_identity,
  };
}

function parseCandidate(entry: Record<string, unknown>): JourneyCandidate {
  return createJourneyCandidate({
    journey_id: readString(entry, "journey_id"),
    obligation_refs: readStringArray(entry, "obligation_refs"),
    source_identity: readString(entry, "source_identity"),
    tracked_paths: readStringArray(entry, "tracked_paths"),
  });
}

function parseMapping(entry: Record<string, unknown>): ChangeMapping {
  const kind = readString(entry, "kind");
  if (kind !== "direct-path" && kind !== "obligation-ref" && kind !== "inferred" && kind !== "unknown") {
    throw new TypeError("mapping kind must be a closed vocabulary value");
  }
  return createMapping({
    journey_id: readString(entry, "journey_id"),
    kind,
    reason: readNullableString(entry, "reason"),
    selected: readBoolean(entry, "selected"),
  });
}

/**
 * Strict selection parsing with full revalidation: duplicate journeys,
 * unknown-relation deselection, and reasonless inferred mappings cannot parse.
 */
export function changeSelectionFromJson(raw: string): ChangeSelection {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("change selection JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("change selection JSON must be an object");
  }
  const selection_id = readString(parsed, "selection_id");
  const source_identity = readString(parsed, "source_identity");
  const changed_paths = readStringArray(parsed, "changed_paths");
  const mappings = readRecordArray(parsed, "mappings").map(parseMapping);
  const selected_journey_ids = readStringArray(parsed, "selected_journey_ids");
  const expectedSelected = mappings.filter((mapping) => mapping.selected).map((mapping) => mapping.journey_id);
  if (JSON.stringify([...selected_journey_ids].sort(compareText)) !== JSON.stringify(expectedSelected)) {
    throw new TypeError("selected journey ids must match selected mappings");
  }
  const seen = new Set<string>();
  for (const mapping of mappings) {
    if (seen.has(mapping.journey_id)) {
      throw new TypeError(`duplicate journey mapping: ${mapping.journey_id}`);
    }
    seen.add(mapping.journey_id);
  }
  void parseCandidate;
  return {
    changed_paths: [...changed_paths].sort(compareText),
    digest: readString(parsed, "digest"),
    mappings: [...mappings].sort((a, b) => compareText(a.journey_id, b.journey_id)),
    selected_journey_ids: [...selected_journey_ids].sort(compareText),
    selection_id,
    source_identity,
  };
}

export function changeSelectionToJson(selection: ChangeSelection): string {
  return JSON.stringify(canonicalize(selection));
}
