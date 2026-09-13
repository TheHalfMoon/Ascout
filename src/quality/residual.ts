/**
 * Spec 015 first-wedge slice 10: residual-risk and release-decision
 * rendering.
 *
 * Closes the evidence chain by enumerating everything that remains
 * unverified instead of hiding it behind a score. Gaps, unresolved
 * conflicts, advisory-only oracles, unstable or unavailable
 * verification, missing discrimination, unadmitted candidates, and
 * unexplained failures each become an explicit residual item; any item
 * blocks release. The release decision is enumeration only: blocked
 * with the blocking item ids, or ready when nothing remains. No
 * numeric score exists anywhere here, so no score can override a
 * deterministic failure.
 */

import type { AdmissionDecision } from "./admission.js";
import type { DefectReport } from "./defect.js";
import type { DiscriminationReport } from "./discrimination.js";
import type { ObligationGap } from "./gap.js";
import { conflictBlocksRelease } from "./obligation.js";
import type { RequirementConflict } from "./obligation.js";
import type { StabilityReport } from "./stability.js";

export type ResidualCategory =
  | "unresolved-conflict"
  | "untested-obligation"
  | "advisory-only-oracle"
  | "unstable-verification"
  | "unavailable-execution"
  | "environmental-uncertainty"
  | "missing-discrimination"
  | "unadmitted-candidate"
  | "unexplained-failure";

export interface ResidualItem {
  readonly category: ResidualCategory;
  readonly id: string;
  readonly detail: string;
}

export interface ResidualRiskReport {
  readonly source_id: string;
  readonly items: readonly ResidualItem[];
  readonly blocks_release: boolean;
}

export type ReleaseDecisionValue = "blocked" | "ready";

export interface ReleaseDecision {
  readonly decision: ReleaseDecisionValue;
  readonly source_id: string;
  readonly blockers: readonly string[];
}

const CATEGORIES: readonly ResidualCategory[] = [
  "unresolved-conflict",
  "untested-obligation",
  "advisory-only-oracle",
  "unstable-verification",
  "unavailable-execution",
  "environmental-uncertainty",
  "missing-discrimination",
  "unadmitted-candidate",
  "unexplained-failure",
];

function categoryRank(category: ResidualCategory): number {
  const rank = CATEGORIES.indexOf(category);
  if (rank < 0) {
    throw new TypeError(`unknown residual category: ${category}`);
  }
  return rank;
}

function requireNonEmptyText(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(`${field} must be non-empty`);
  }
}

function createItem(
  category: ResidualCategory,
  id: string,
  detail: string,
): ResidualItem {
  categoryRank(category);
  requireNonEmptyText(id, "residual id");
  requireNonEmptyText(detail, "residual detail");
  return { category, detail, id };
}

/**
 * Renders residual risk for one exact source tree from wedge evidence.
 * Every input record must belong to the same source tree; a record
 * bound elsewhere throws instead of leaking across trees. Output order
 * is fixed (category rank, then id) so digests stay deterministic.
 */
export function renderResidualRisk(input: {
  readonly source_id: string;
  readonly conflicts: readonly RequirementConflict[];
  readonly gaps: readonly ObligationGap[];
  readonly stability: readonly StabilityReport[];
  readonly discrimination: readonly DiscriminationReport[];
  readonly admission: readonly AdmissionDecision[];
  readonly defects: readonly DefectReport[];
}): ResidualRiskReport {
  requireNonEmptyText(input.source_id, "source_id");
  const items: ResidualItem[] = [];

  for (const conflict of input.conflicts) {
    if (conflictBlocksRelease(conflict)) {
      items.push(
        createItem(
          "unresolved-conflict",
          conflict.id,
          `conflict ${conflict.id} is unresolved`,
        ),
      );
    }
  }

  for (const gap of input.gaps) {
    if (gap.reason === "blocked-by-conflict") {
      items.push(
        createItem(
          "unresolved-conflict",
          gap.obligation_id,
          `obligation ${gap.obligation_id} is blocked by conflict`,
        ),
      );
    } else if (gap.reason === "obligation-unresolved") {
      items.push(
        createItem(
          "unresolved-conflict",
          gap.obligation_id,
          `obligation ${gap.obligation_id} links an unknown conflict`,
        ),
      );
    } else if (gap.reason === "oracle-advisory-only") {
      items.push(
        createItem(
          "advisory-only-oracle",
          gap.obligation_id,
          `obligation ${gap.obligation_id} has advisory-only oracle coverage`,
        ),
      );
    } else {
      items.push(
        createItem(
          "untested-obligation",
          gap.obligation_id,
          `obligation ${gap.obligation_id} has gap ${gap.reason}`,
        ),
      );
    }
  }

  const checkBound = (
    record: { source_id: string | null },
    what: string,
  ): void => {
    if (record.source_id !== null && record.source_id !== input.source_id) {
      throw new TypeError(`${what} binds to another source tree`);
    }
  };

  for (const report of input.stability) {
    checkBound(report, "stability report");
    const id =
      report.candidate_id ?? report.test_id ?? "unknown-verification";
    if (
      report.verdict === "flaky" ||
      report.verdict === "insufficient-evidence"
    ) {
      items.push(
        createItem(
          "unstable-verification",
          id,
          `verification ${id} is ${report.verdict}`,
        ),
      );
    } else if (
      report.verdict === "unavailable" ||
      report.verdict === "not-run"
    ) {
      items.push(
        createItem(
          "unavailable-execution",
          id,
          `verification ${id} is ${report.verdict}`,
        ),
      );
    } else if (report.verdict === "environment-sensitive") {
      items.push(
        createItem(
          "environmental-uncertainty",
          id,
          `verification ${id} diverges across environments`,
        ),
      );
    }
  }

  for (const report of input.discrimination) {
    checkBound(report, "discrimination report");
    if (report.verdict !== "proven") {
      items.push(
        createItem(
          "missing-discrimination",
          report.candidate_id ?? "unknown-candidate",
          `candidate ${report.candidate_id ?? "unknown"} is ${report.verdict}`,
        ),
      );
    }
  }

  for (const decision of input.admission) {
    if (decision.source_id !== input.source_id) {
      throw new TypeError("admission decision binds to another source tree");
    }
    if (decision.verdict !== "admitted") {
      items.push(
        createItem(
          "unadmitted-candidate",
          decision.candidate_id,
          `candidate ${decision.candidate_id} is held: ${decision.reasons.join(",")}`,
        ),
      );
    }
  }

  for (const defect of input.defects) {
    if (defect.signature.source_id !== input.source_id) {
      throw new TypeError("defect binds to another source tree");
    }
    if (
      defect.reproduction.status === "observed" ||
      defect.reproduction.status === "unresolved"
    ) {
      items.push(
        createItem(
          "unexplained-failure",
          defect.id,
          `defect ${defect.id} is ${defect.reproduction.status}`,
        ),
      );
    }
  }

  items.sort(
    (left, right) =>
      categoryRank(left.category) - categoryRank(right.category) ||
      (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
  );
  return {
    blocks_release: items.length > 0,
    items,
    source_id: input.source_id,
  };
}

/**
 * Enumerates the release decision: blocked with the blocking item ids
 * in report order, or ready when nothing remains. There is no score,
 * no override, and no acknowledgment path past a deterministic block.
 */
export function decideRelease(report: ResidualRiskReport): ReleaseDecision {
  if (report.blocks_release !== report.items.length > 0) {
    throw new TypeError("residual report consistency violated");
  }
  if (!report.blocks_release) {
    return { blockers: [], decision: "ready", source_id: report.source_id };
  }
  return {
    blockers: report.items.map((item) => item.id),
    decision: "blocked",
    source_id: report.source_id,
  };
}

/** Deterministic serialization of the release enumeration. */
export function releaseDecisionToJson(decision: ReleaseDecision): string {
  if (decision.decision !== "blocked" && decision.decision !== "ready") {
    throw new TypeError(`unknown release decision: ${decision.decision}`);
  }
  requireNonEmptyText(decision.source_id, "source_id");
  if (decision.decision === "ready" && decision.blockers.length !== 0) {
    throw new TypeError("a ready decision carries no blockers");
  }
  if (decision.decision === "blocked" && decision.blockers.length === 0) {
    throw new TypeError("a blocked decision names its blockers");
  }
  for (const blocker of decision.blockers) {
    requireNonEmptyText(blocker, "blocker");
  }
  return JSON.stringify({
    blockers: [...decision.blockers],
    decision: decision.decision,
    source_id: decision.source_id,
  });
}

export function releaseDecisionFromJson(raw: string): ReleaseDecision {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("release JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("release JSON must be an object");
  }
  const decisionRaw = parsed.decision;
  if (decisionRaw !== "blocked" && decisionRaw !== "ready") {
    throw new TypeError(`unknown release decision: ${String(decisionRaw)}`);
  }
  const blockersRaw = parsed.blockers;
  if (!Array.isArray(blockersRaw)) {
    throw new TypeError("release blockers must be an array");
  }
  const blockers: string[] = [];
  for (const entry of blockersRaw) {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new TypeError("release blockers must be non-empty strings");
    }
    blockers.push(entry);
  }
  const decision: ReleaseDecision = {
    blockers,
    decision: decisionRaw,
    source_id: readString(parsed, "source_id"),
  };
  releaseDecisionToJson(decision);
  return decision;
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

function readBoolean(record: Record<string, unknown>, field: string): boolean {
  const value = record[field];
  if (typeof value !== "boolean") {
    throw new TypeError(`${field} must be a boolean`);
  }
  return value;
}

/** Deterministic serialization with fixed key order for stable digests. */
export function residualRiskToJson(report: ResidualRiskReport): string {
  requireNonEmptyText(report.source_id, "source_id");
  const items = [...report.items].sort(
    (left, right) =>
      categoryRank(left.category) - categoryRank(right.category) ||
      (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
  );
  for (const item of items) {
    categoryRank(item.category);
    requireNonEmptyText(item.id, "residual id");
    requireNonEmptyText(item.detail, "residual detail");
  }
  if (report.blocks_release !== items.length > 0) {
    throw new TypeError("residual report consistency violated");
  }
  return JSON.stringify({
    blocks_release: items.length > 0,
    items: items.map((item) => ({
      category: item.category,
      detail: item.detail,
      id: item.id,
    })),
    source_id: report.source_id,
  });
}

export function residualRiskFromJson(raw: string): ResidualRiskReport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("residual JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("residual JSON must be an object");
  }
  const itemsRaw = parsed.items;
  if (!Array.isArray(itemsRaw)) {
    throw new TypeError("residual items must be an array");
  }
  const items: ResidualItem[] = [];
  for (const entry of itemsRaw) {
    if (!isRecord(entry)) {
      throw new TypeError("residual item must be an object");
    }
    const category = readString(entry, "category");
    if (!CATEGORIES.includes(category as ResidualCategory)) {
      throw new TypeError(`unknown residual category: ${category}`);
    }
    items.push(
      createItem(
        category as ResidualCategory,
        readString(entry, "id"),
        readString(entry, "detail"),
      ),
    );
  }
  const report: ResidualRiskReport = {
    blocks_release: readBoolean(parsed, "blocks_release"),
    items,
    source_id: readString(parsed, "source_id"),
  };
  residualRiskToJson(report);
  return {
    blocks_release: report.blocks_release,
    items: [...report.items].sort(
      (left, right) =>
        categoryRank(left.category) - categoryRank(right.category) ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    ),
    source_id: report.source_id,
  };
}
