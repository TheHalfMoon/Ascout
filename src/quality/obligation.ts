/**
 * Spec 015 first-wedge foundation: conflict-aware intent, test obligations,
 * and oracle classification as deterministic serializable data plus
 * fail-closed predicates.
 *
 * This module proposes structure only. It executes nothing, reads no
 * repository state, and manufactures no PASS: an obligation without bound
 * evidence stays open, an unresolved requirement conflict blocks release
 * for affected obligations, and only a proven independent calibrated oracle
 * may gate release. All else is advisory.
 */

export type RequirementSourceKind =
  | "prd"
  | "test"
  | "code"
  | "config"
  | "runtime"
  | "human";

export interface RequirementSource {
  readonly id: string;
  readonly kind: RequirementSourceKind;
  readonly provenance: string;
  readonly description: string;
}

export type ConflictResolution =
  | "requirement-wins"
  | "test-wins"
  | "human-review"
  | "unresolved";

export interface RequirementConflict {
  readonly id: string;
  readonly party_ids: readonly string[];
  readonly summary: string;
  readonly resolution: ConflictResolution;
  readonly resolved_by: string | null;
}

export type OracleClass =
  | "deterministic-assertion"
  | "structural-contract"
  | "property"
  | "differential"
  | "controlled-revert"
  | "mutation-discrimination"
  | "withheld-behavior"
  | "statistical"
  | "model-advisory"
  | "human-review";

export type OracleIndependence =
  | "independent"
  | "derived"
  | "circular"
  | "unknown";

export interface Oracle {
  readonly id: string;
  readonly class: OracleClass;
  readonly independence: OracleIndependence;
  readonly calibrated: boolean;
  readonly provenance: string;
  readonly description: string;
}

export type ObligationStatus =
  | "open"
  | "covered"
  | "unresolved"
  | "blocked-by-conflict";

export interface TestObligation {
  readonly id: string;
  readonly behavior: string;
  readonly requirement_ids: readonly string[];
  readonly risk_ids: readonly string[];
  readonly oracle: Oracle;
  readonly status: ObligationStatus;
  readonly evidence_ids: readonly string[];
  readonly conflict_ids: readonly string[];
}

const SOURCE_KINDS: readonly RequirementSourceKind[] = [
  "prd",
  "test",
  "code",
  "config",
  "runtime",
  "human",
];

const RESOLUTIONS: readonly ConflictResolution[] = [
  "requirement-wins",
  "test-wins",
  "human-review",
  "unresolved",
];

const ORACLE_CLASSES: readonly OracleClass[] = [
  "deterministic-assertion",
  "structural-contract",
  "property",
  "differential",
  "controlled-revert",
  "mutation-discrimination",
  "withheld-behavior",
  "statistical",
  "model-advisory",
  "human-review",
];

const INDEPENDENCE: readonly OracleIndependence[] = [
  "independent",
  "derived",
  "circular",
  "unknown",
];

const OBLIGATION_STATUSES: readonly ObligationStatus[] = [
  "open",
  "covered",
  "unresolved",
  "blocked-by-conflict",
];

function requireNonEmptyId(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(`${field} must be non-empty`);
  }
}

function requireNonEmptyText(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(`${field} must be non-empty`);
  }
}

function requireStringArray(
  value: readonly string[],
  field: string,
): void {
  for (const entry of value) {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new TypeError(`${field} must contain only non-empty strings`);
    }
  }
}

export function createRequirementSource(input: {
  readonly id: string;
  readonly kind: RequirementSourceKind;
  readonly provenance: string;
  readonly description: string;
}): RequirementSource {
  requireNonEmptyId(input.id, "source id");
  if (!SOURCE_KINDS.includes(input.kind)) {
    throw new TypeError(`unknown requirement source kind: ${input.kind}`);
  }
  requireNonEmptyText(input.provenance, "source provenance");
  requireNonEmptyText(input.description, "source description");
  return {
    id: input.id,
    kind: input.kind,
    provenance: input.provenance,
    description: input.description,
  };
}

/**
 * Records a contradiction between requirement sources. Code is one party
 * among others: there is deliberately no silent "code wins" outcome.
 * A conflict starts unresolved and blocks release for affected
 * obligations until an explicit resolution is recorded.
 */
export function createRequirementConflict(input: {
  readonly id: string;
  readonly party_ids: readonly string[];
  readonly summary: string;
}): RequirementConflict {
  requireNonEmptyId(input.id, "conflict id");
  requireStringArray(input.party_ids, "conflict party_ids");
  if (input.party_ids.length < 2) {
    throw new TypeError("a conflict requires at least two distinct parties");
  }
  if (new Set(input.party_ids).size !== input.party_ids.length) {
    throw new TypeError("conflict parties must be distinct");
  }
  requireNonEmptyText(input.summary, "conflict summary");
  return {
    id: input.id,
    party_ids: [...input.party_ids],
    summary: input.summary,
    resolution: "unresolved",
    resolved_by: null,
  };
}

export function resolveRequirementConflict(
  conflict: RequirementConflict,
  resolution: ConflictResolution,
  resolvedBy: string,
): RequirementConflict {
  if (!RESOLUTIONS.includes(resolution)) {
    throw new TypeError(`unknown conflict resolution: ${resolution}`);
  }
  if (resolution === "unresolved") {
    throw new TypeError("reopening a conflict requires explicit unresolved state");
  }
  requireNonEmptyText(resolvedBy, "resolved_by");
  return {
    ...conflict,
    resolution,
    resolved_by: resolvedBy,
  };
}

/** An unresolved conflict blocks release PASS for every affected obligation. */
export function conflictBlocksRelease(conflict: RequirementConflict): boolean {
  return conflict.resolution === "unresolved";
}

export function createOracle(input: {
  readonly id: string;
  readonly class: OracleClass;
  readonly independence: OracleIndependence;
  readonly calibrated: boolean;
  readonly provenance: string;
  readonly description: string;
}): Oracle {
  requireNonEmptyId(input.id, "oracle id");
  if (!ORACLE_CLASSES.includes(input.class)) {
    throw new TypeError(`unknown oracle class: ${input.class}`);
  }
  if (!INDEPENDENCE.includes(input.independence)) {
    throw new TypeError(`unknown oracle independence: ${input.independence}`);
  }
  requireNonEmptyText(input.provenance, "oracle provenance");
  requireNonEmptyText(input.description, "oracle description");
  return {
    id: input.id,
    class: input.class,
    independence: input.independence,
    calibrated: input.calibrated,
    provenance: input.provenance,
    description: input.description,
  };
}

/** Circular oracles fail closed: they never gate release. */
export function isCircularOracle(oracle: Oracle): boolean {
  return oracle.independence === "circular";
}

/**
 * Only a proven independent calibrated oracle may gate release.
 * Derived, unknown, uncalibrated, and circular oracles stay advisory.
 */
export function oracleMayGateRelease(oracle: Oracle): boolean {
  if (isCircularOracle(oracle)) return false;
  return oracle.independence === "independent" && oracle.calibrated;
}

export function createTestObligation(input: {
  readonly id: string;
  readonly behavior: string;
  readonly requirement_ids?: readonly string[];
  readonly risk_ids?: readonly string[];
  readonly oracle: Oracle;
  readonly evidence_ids?: readonly string[];
  readonly conflict_ids?: readonly string[];
}): TestObligation {
  requireNonEmptyId(input.id, "obligation id");
  requireNonEmptyText(input.behavior, "obligation behavior");
  const requirementIds = input.requirement_ids ?? [];
  const riskIds = input.risk_ids ?? [];
  const evidenceIds = input.evidence_ids ?? [];
  const conflictIds = input.conflict_ids ?? [];
  requireStringArray(requirementIds, "obligation requirement_ids");
  requireStringArray(riskIds, "obligation risk_ids");
  requireStringArray(evidenceIds, "obligation evidence_ids");
  requireStringArray(conflictIds, "obligation conflict_ids");
  return {
    id: input.id,
    behavior: input.behavior,
    requirement_ids: [...requirementIds],
    risk_ids: [...riskIds],
    oracle: input.oracle,
    status: "open",
    evidence_ids: [...evidenceIds],
    conflict_ids: [...conflictIds],
  };
}

/**
 * Derives the honest obligation status from bound evidence and linked
 * conflicts. No green by omission: missing evidence can never yield
 * "covered", and an unresolved linked conflict forces
 * "blocked-by-conflict" regardless of evidence.
 */
export function deriveObligationStatus(
  obligation: TestObligation,
  conflictsById: Readonly<Record<string, RequirementConflict>>,
): ObligationStatus {
  for (const conflictId of obligation.conflict_ids) {
    const conflict = conflictsById[conflictId];
    if (conflict === undefined) return "unresolved";
    if (conflictBlocksRelease(conflict)) return "blocked-by-conflict";
  }
  if (obligation.evidence_ids.length === 0) return "open";
  return "covered";
}

export function attachEvidence(
  obligation: TestObligation,
  evidenceIds: readonly string[],
): TestObligation {
  requireStringArray(evidenceIds, "attached evidence_ids");
  return {
    ...obligation,
    evidence_ids: [...obligation.evidence_ids, ...evidenceIds],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string") {
    throw new TypeError(`${field} must be a string`);
  }
  return value;
}

function readStringArray(record: Record<string, unknown>, field: string): string[] {
  const value = record[field];
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      throw new TypeError(`${field} must contain only strings`);
    }
    result.push(entry);
  }
  return result;
}

/** Deterministic serialization with fixed key order for stable digests. */
export function obligationToJson(obligation: TestObligation): string {
  if (!OBLIGATION_STATUSES.includes(obligation.status)) {
    throw new TypeError(`unknown obligation status: ${obligation.status}`);
  }
  return JSON.stringify({
    behavior: obligation.behavior,
    conflict_ids: [...obligation.conflict_ids],
    evidence_ids: [...obligation.evidence_ids],
    id: obligation.id,
    oracle: {
      calibrated: obligation.oracle.calibrated,
      class: obligation.oracle.class,
      description: obligation.oracle.description,
      id: obligation.oracle.id,
      independence: obligation.oracle.independence,
      provenance: obligation.oracle.provenance,
    },
    requirement_ids: [...obligation.requirement_ids],
    risk_ids: [...obligation.risk_ids],
    status: obligation.status,
  });
}

export function obligationFromJson(raw: string): TestObligation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("obligation JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("obligation JSON must be an object");
  }
  const oracleRaw = parsed.oracle;
  if (!isRecord(oracleRaw)) {
    throw new TypeError("obligation.oracle must be an object");
  }
  const oracleClass = readString(oracleRaw, "class");
  const independence = readString(oracleRaw, "independence");
  if (typeof oracleRaw.calibrated !== "boolean") {
    throw new TypeError("obligation.oracle.calibrated must be a boolean");
  }
  const oracle = createOracle({
    calibrated: oracleRaw.calibrated,
    class: oracleClass as OracleClass,
    description: readString(oracleRaw, "description"),
    id: readString(oracleRaw, "id"),
    independence: independence as OracleIndependence,
    provenance: readString(oracleRaw, "provenance"),
  });
  const status = readString(parsed, "status");
  if (
    status !== "open" &&
    status !== "covered" &&
    status !== "unresolved" &&
    status !== "blocked-by-conflict"
  ) {
    throw new TypeError(`unknown obligation status: ${status}`);
  }
  const obligation = createTestObligation({
    behavior: readString(parsed, "behavior"),
    conflict_ids: readStringArray(parsed, "conflict_ids"),
    evidence_ids: readStringArray(parsed, "evidence_ids"),
    id: readString(parsed, "id"),
    oracle,
    requirement_ids: readStringArray(parsed, "requirement_ids"),
    risk_ids: readStringArray(parsed, "risk_ids"),
  });
  return { ...obligation, status };
}
