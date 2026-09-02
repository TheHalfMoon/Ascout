# T102 Test-Surface Reconciliation

**Spec:** 004 — Branch-Evidence Product Integration  
**Status:** `AUTHORITY_AMENDMENT_PENDING_MERGE`  
**Date:** 2026-09-02  
**Canonical base:** `2fc01d330b24cff4b73bdd0bdb9312250af3e930`  
**Canonical base tree:** `4af264e4e5ee942d656e350948be9f7c0aa8a8cd`  
**Ledger:** Issue #128

## 1. Purpose

This document is a prospective, governance-only clarification of the T102 proof-surface mutation timing. It does not backdate authority, revive historical T102 closeout evidence, authorize T103, or change any existing T102 product requirement.

Fresh T101 is now `CLOSED_CANONICAL` in Issue #126 / PR #127. Canonical Spec 004 T102 acceptance requires direct proof of branch/line interaction, changed-range filtering, deterministic branch result ordering, and line-only backward compatibility. The planned proof file `tests/t102-branch-exercise.contract.test.ts` is named in the canonical Spec 004 plan and tasks, but the task-specific mutation timing enumerates that file under T103 rather than T102.

Fresh T102 therefore cannot honestly qualify its original acceptance boundary unless the planned T102 proof file is prospectively available to T102.

## 2. Existing canonical T102 product surfaces

The original implementation authorization already permits T102 product mutation in:

- `src/exercise.ts` — accept normalized branch observations, build additive branch records/counts, intersect with changed ranges, and preserve line records exactly;
- `src/check.ts` — wire normalized branch observations from the LCOV parser to the exercise builder.

This reconciliation does not widen those product requirements.

## 3. Newly explicit T102 proof surface

After this authority amendment is itself canonically merged and post-merge verified, fresh T102 may additionally mutate:

- `tests/t102-branch-exercise.contract.test.ts`

That proof file may cover only the original T102 acceptance boundary:

- branch-only gap shape while the corresponding line remains line-exercised;
- fully exercised branch control;
- unknown branch remains unresolved;
- branch observations outside changed new-line ranges are excluded from changed-branch results;
- deterministic branch-record ordering by `(path, line, block_id, branch_id)`;
- exact preservation of pre-existing line records, counts, and `changed_files_with_zero_exercised_lines`;
- line-only backward compatibility when branch observations are absent;
- explicit projection from normalized `BRANCH_EXERCISED`, `BRANCH_NOT_EXERCISED`, and `BRANCH_UNRESOLVED` observations to the internal branch-record state domain used by the T102 builder.

This proof surface may not implement T103 receipt/model/schema behavior.

## 4. Explicit exclusion of historical unplanned surface

The historical path:

- `tests/t102-branch-exercise-builder.contract.test.ts`

is not named by the canonical Spec 004 planning package as the planned T102 proof surface. It is an implementation-history reference only and is not authorized by this amendment.

## 5. Retained T102 boundaries

Fresh T102 remains limited to its existing task boundary:

- line records remain derived exclusively from normalized LCOV `DA:` line evidence;
- branch evidence is an additive parallel dimension and must not overwrite or mutate line-level state/counts;
- no receipt model or JSON Schema mutation;
- no T103 completeness/receipt publication mutation;
- no package/dependency change;
- no historical benchmark-result mutation;
- no CLI, renderer, selection, admission, run, publication, release, or tag mutation;
- no function coverage, AST/CFG analysis, branch thresholds, or new runtime dependency.

Any invalid branch-normalization handling in `src/check.ts` may only be changed in T102 if live canonical authority clearly places that behavior inside the existing T102 wiring boundary; otherwise it remains for a later prospective authority reconciliation.

## 6. Qualification gates

This amendment is ineffective until all of the following hold on one exact head:

1. changed paths are governance/documentation-only and limited to this reconciliation plus its audit;
2. exact-head Project CI is green in all six required OS/Node lanes;
3. a fresh independent exact-head review is completed;
4. every material review finding is reconciled;
5. zero unresolved material review threads remain;
6. the head remains unchanged after final qualification/review;
7. guarded merge uses the expected exact head SHA;
8. post-merge verification proves ordered parents, merge tree, GitHub verification/signature, PR merged state, canonical `main`, and no intervening main movement;
9. Issue #128 records `T102_TEST_SURFACE_RECONCILIATION = CLOSED_CANONICAL`.

Fresh T102 implementation must not begin before this amendment closes canonically.
