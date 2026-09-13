/**
 * Spec 015 first-wedge slice 2: unit-test gap detection.
 *
 * Maps test obligations to known existing tests and execution facts, and
 * reports every obligation that lacks meaningful verification. A green
 * existing suite proves nothing about an obligation it never exercised:
 * linked-but-unexecuted tests, unresolved conflicts, and advisory-only
 * oracles are all reported as gaps, never as coverage.
 */

import {
  conflictBlocksRelease,
  deriveObligationStatus,
  oracleMayGateRelease,
} from "./obligation.js";
import type {
  RequirementConflict,
  TestObligation,
} from "./obligation.js";

export interface ExistingTest {
  readonly id: string;
  readonly file: string;
  readonly name: string;
  readonly provenance: string;
}

export type ObligationGapReason =
  | "no-covering-test"
  | "covering-test-unexecuted"
  | "blocked-by-conflict"
  | "obligation-unresolved"
  | "oracle-advisory-only";

export interface ObligationGap {
  readonly obligation_id: string;
  readonly reason: ObligationGapReason;
  readonly covering_test_ids: readonly string[];
}

function requireTest(test: ExistingTest): void {
  if (test.id.length === 0) {
    throw new TypeError("existing test id must be non-empty");
  }
  if (test.file.length === 0) {
    throw new TypeError("existing test file must be non-empty");
  }
  if (test.name.length === 0) {
    throw new TypeError("existing test name must be non-empty");
  }
  if (test.provenance.length === 0) {
    throw new TypeError("existing test provenance must be non-empty");
  }
}

/**
 * Finds obligations without meaningful verification. Inputs are explicit:
 * the obligation set, the known existing tests keyed by the obligation ids
 * they cover, the set of executed test ids, and linked conflicts.
 * Deterministic: output is sorted by obligation id.
 */
export function detectGaps(input: {
  readonly obligations: readonly TestObligation[];
  readonly coveringTestsByObligationId: Readonly<
    Record<string, readonly ExistingTest[]>
  >;
  readonly executedTestIds: ReadonlySet<string>;
  readonly conflictsById: Readonly<Record<string, RequirementConflict>>;
}): readonly ObligationGap[] {
  const gaps: ObligationGap[] = [];
  const ordered = [...input.obligations].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );

  for (const obligation of ordered) {
    const covering = input.coveringTestsByObligationId[obligation.id] ?? [];
    for (const test of covering) requireTest(test);
    const coveringIds = covering.map((test) => test.id);

    let blocked = false;
    let dangling = false;
    for (const conflictId of obligation.conflict_ids) {
      const conflict = input.conflictsById[conflictId];
      if (conflict === undefined) {
        dangling = true;
        break;
      }
      if (conflictBlocksRelease(conflict)) {
        blocked = true;
        break;
      }
    }
    if (dangling) {
      gaps.push({
        covering_test_ids: coveringIds,
        obligation_id: obligation.id,
        reason: "obligation-unresolved",
      });
      continue;
    }
    if (blocked) {
      gaps.push({
        covering_test_ids: coveringIds,
        obligation_id: obligation.id,
        reason: "blocked-by-conflict",
      });
      continue;
    }

    if (covering.length === 0) {
      gaps.push({
        covering_test_ids: [],
        obligation_id: obligation.id,
        reason: "no-covering-test",
      });
      continue;
    }

    const executed = covering.some((test) =>
      input.executedTestIds.has(test.id),
    );
    if (!executed) {
      gaps.push({
        covering_test_ids: coveringIds,
        obligation_id: obligation.id,
        reason: "covering-test-unexecuted",
      });
      continue;
    }

    if (!oracleMayGateRelease(obligation.oracle)) {
      gaps.push({
        covering_test_ids: coveringIds,
        obligation_id: obligation.id,
        reason: "oracle-advisory-only",
      });
      continue;
    }

    if (deriveObligationStatus(obligation, input.conflictsById) !== "covered") {
      gaps.push({
        covering_test_ids: coveringIds,
        obligation_id: obligation.id,
        reason: "no-covering-test",
      });
    }
  }

  return gaps;
}

/** Obligations with no gap are the only ones that may count as verified. */
export function verifiedObligationIds(input: {
  readonly obligations: readonly TestObligation[];
  readonly coveringTestsByObligationId: Readonly<
    Record<string, readonly ExistingTest[]>
  >;
  readonly executedTestIds: ReadonlySet<string>;
  readonly conflictsById: Readonly<Record<string, RequirementConflict>>;
}): readonly string[] {
  const gapped = new Set(
    detectGaps(input).map((gap) => gap.obligation_id),
  );
  return [...input.obligations]
    .map((obligation) => obligation.id)
    .filter((id) => !gapped.has(id))
    .sort();
}
