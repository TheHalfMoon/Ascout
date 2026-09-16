/**
 * Spec 016 P016-10: journey evidence model.
 *
 * Minimal deterministic journey structures linking browser observations
 * to obligations. No graph database: journeys are flat node/edge records
 * with stable IDs, explicit observed-vs-inferred edges, per-link
 * run/source/provenance, deterministic serialization/digest, and a
 * coverage verdict that cannot become PASS without obligation and
 * oracle evidence.
 *
 * Authority rules enforced here:
 *
 * - one journey binds one session and one source; cross-tree links throw;
 * - node IDs and edge IDs are stable, unique, and non-empty;
 * - edge endpoints must reference declared nodes;
 * - inferred edges must carry a reason; observed edges must carry a run id;
 * - every material link carries run/source/provenance;
 * - journey coverage PASS requires at least one obligation ref and at
 *   least one oracle ref; otherwise the verdict is blocked/failed, never PASS;
 * - serialization is canonical (sorted keys, sorted arrays) with sha256 digest;
 * - strict JSON parsing revalidates all factories, so malformed or
 *   dangling records fail closed.
 */

import { createHash } from "node:crypto";

export type JourneyEdgeKind = "observed" | "inferred";

export interface JourneyNode {
  readonly node_id: string;
  readonly label: string;
  readonly obligation_refs: readonly string[];
}

export interface JourneyEdge {
  readonly edge_id: string;
  readonly from_node: string;
  readonly kind: JourneyEdgeKind;
  readonly reason: string | null;
  readonly run_id: string | null;
  readonly source_identity: string;
  readonly to_node: string;
}

export interface Journey {
  readonly journey_id: string;
  readonly session_id: string;
  readonly source_identity: string;
  readonly nodes: readonly JourneyNode[];
  readonly edges: readonly JourneyEdge[];
  readonly obligation_refs: readonly string[];
  readonly oracle_refs: readonly string[];
}

export type JourneyCoverageVerdict = "pass" | "blocked" | "failed";

export interface JourneyCoverage {
  readonly journey_id: string;
  readonly verdict: JourneyCoverageVerdict;
  readonly blocking_reasons: readonly string[];
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

export function createJourneyNode(input: {
  node_id: string;
  label: string;
  obligation_refs?: readonly string[];
}): JourneyNode {
  const node_id = requireId(input.node_id, "node_id");
  const label = requireId(input.label, "label");
  const obligation_refs = [...(input.obligation_refs ?? [])];
  for (const ref of obligation_refs) {
    requireId(ref, "obligation_ref");
  }
  return {
    label,
    node_id,
    obligation_refs: [...obligation_refs].sort(compareText),
  };
}

export function createJourneyEdge(input: {
  edge_id: string;
  from_node: string;
  to_node: string;
  kind: JourneyEdgeKind;
  run_id?: string | null;
  reason?: string | null;
  source_identity: string;
}): JourneyEdge {
  const edge_id = requireId(input.edge_id, "edge_id");
  const from_node = requireId(input.from_node, "from_node");
  const to_node = requireId(input.to_node, "to_node");
  const source_identity = requireId(input.source_identity, "source_identity");
  if (input.kind !== "observed" && input.kind !== "inferred") {
    throw new TypeError("edge kind must be observed or inferred");
  }
  if (input.kind === "observed") {
    if (input.run_id === null || input.run_id === undefined || input.run_id.trim().length === 0) {
      throw new TypeError("observed edges must carry a run id");
    }
    return {
      edge_id,
      from_node,
      kind: "observed",
      reason: null,
      run_id: input.run_id,
      source_identity,
      to_node,
    };
  }
  if (input.reason === null || input.reason === undefined || input.reason.trim().length === 0) {
    throw new TypeError("inferred edges must carry a reason");
  }
  return {
    edge_id,
    from_node,
    kind: "inferred",
    reason: input.reason,
    run_id: null,
    source_identity,
    to_node,
  };
}

export function createJourney(input: {
  journey_id: string;
  session_id: string;
  source_identity: string;
  nodes: readonly JourneyNode[];
  edges: readonly JourneyEdge[];
  obligation_refs?: readonly string[];
  oracle_refs?: readonly string[];
}): Journey {
  const journey_id = requireId(input.journey_id, "journey_id");
  const session_id = requireId(input.session_id, "session_id");
  const source_identity = requireId(input.source_identity, "source_identity");
  if (input.nodes.length === 0) {
    throw new TypeError("journey must declare at least one node");
  }
  const nodeIds = new Set<string>();
  const nodes = input.nodes.map((node) => {
    const created = createJourneyNode({
      label: node.label,
      node_id: node.node_id,
      obligation_refs: [...node.obligation_refs],
    });
    if (nodeIds.has(created.node_id)) {
      throw new TypeError(`duplicate journey node: ${created.node_id}`);
    }
    nodeIds.add(created.node_id);
    return created;
  });
  const edgeIds = new Set<string>();
  const edges = input.edges.map((edge) => {
    const created = createJourneyEdge({
      edge_id: edge.edge_id,
      from_node: edge.from_node,
      kind: edge.kind,
      reason: edge.reason,
      run_id: edge.run_id,
      source_identity: edge.source_identity,
      to_node: edge.to_node,
    });
    if (edgeIds.has(created.edge_id)) {
      throw new TypeError(`duplicate journey edge: ${created.edge_id}`);
    }
    edgeIds.add(created.edge_id);
    if (created.source_identity !== source_identity) {
      throw new TypeError(
        `cross-tree journey edge rejected: ${created.edge_id} binds ${created.source_identity}`,
      );
    }
    if (!nodeIds.has(created.from_node) || !nodeIds.has(created.to_node)) {
      throw new TypeError(`dangling journey edge endpoints: ${created.edge_id}`);
    }
    return created;
  });
  const obligation_refs = [...(input.obligation_refs ?? [])];
  for (const ref of obligation_refs) {
    requireId(ref, "obligation_ref");
  }
  const oracle_refs = [...(input.oracle_refs ?? [])];
  for (const ref of oracle_refs) {
    requireId(ref, "oracle_ref");
  }
  return {
    edges: [...edges].sort((a, b) => compareText(a.edge_id, b.edge_id)),
    journey_id,
    nodes: [...nodes].sort((a, b) => compareText(a.node_id, b.node_id)),
    obligation_refs: [...obligation_refs].sort(compareText),
    oracle_refs: [...oracle_refs].sort(compareText),
    session_id,
    source_identity,
  };
}

export function journeyToJson(journey: Journey): string {
  return JSON.stringify(canonicalize(journey));
}

export function journeyDigest(journey: Journey): string {
  return createHash("sha256").update(journeyToJson(journey)).digest("hex");
}

function parseJourneyNode(entry: Record<string, unknown>): JourneyNode {
  return createJourneyNode({
    label: readString(entry, "label"),
    node_id: readString(entry, "node_id"),
    obligation_refs: readStringArray(entry, "obligation_refs"),
  });
}

function parseJourneyEdge(entry: Record<string, unknown>): JourneyEdge {
  const kind = readString(entry, "kind");
  if (kind !== "observed" && kind !== "inferred") {
    throw new TypeError("edge kind must be observed or inferred");
  }
  return createJourneyEdge({
    edge_id: readString(entry, "edge_id"),
    from_node: readString(entry, "from_node"),
    kind,
    reason: readNullableString(entry, "reason"),
    run_id: readNullableString(entry, "run_id"),
    source_identity: readString(entry, "source_identity"),
    to_node: readString(entry, "to_node"),
  });
}

/**
 * Strict journey parsing with full revalidation: factories rerun so a
 * serialized journey that violates binding, uniqueness, or endpoint
 * integrity cannot parse.
 */
export function journeyFromJson(raw: string): Journey {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("journey JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("journey JSON must be an object");
  }
  return createJourney({
    edges: readRecordArray(parsed, "edges").map(parseJourneyEdge),
    journey_id: readString(parsed, "journey_id"),
    nodes: readRecordArray(parsed, "nodes").map(parseJourneyNode),
    obligation_refs: readStringArray(parsed, "obligation_refs"),
    oracle_refs: readStringArray(parsed, "oracle_refs"),
    session_id: readString(parsed, "session_id"),
    source_identity: readString(parsed, "source_identity"),
  });
}

export function evaluateJourneyCoverage(journey: Journey): JourneyCoverage {
  const blocking_reasons: string[] = [];
  if (journey.obligation_refs.length === 0) {
    blocking_reasons.push("missing-obligation-evidence");
  }
  if (journey.oracle_refs.length === 0) {
    blocking_reasons.push("missing-oracle-evidence");
  }
  if (journey.edges.length === 0) {
    blocking_reasons.push("no-observed-or-inferred-traversal");
  }
  const verdict: JourneyCoverageVerdict =
    blocking_reasons.length === 0 ? "pass" : blocking_reasons.includes("missing-obligation-evidence") || blocking_reasons.includes("missing-oracle-evidence") ? "blocked" : "failed";
  return {
    blocking_reasons,
    digest: journeyDigest(journey),
    journey_id: journey.journey_id,
    verdict,
  };
}
