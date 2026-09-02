# Spec 004 T101 Pre-Merge Gate Reconciliation

**Status:** `FORWARD_REPAIR_CANDIDATE`  
**Date:** 2026-09-02  
**Ledger:** Issue #122  
**Repair base:** `ff34ce8ffaafd8a4b6fb9f27890b164cd58fd9e1`  
**Repair base tree:** `87eaac894daac38155e760fecd532461abe03a24`  
**Exact pre-T101 canonical state:** `df6fc9f88e1c270ebbba59e1d5530738b0189ea6`  
**Exact pre-T101 tree:** `5915f6ea2a0346fcf9351b95a6f5f5f27189c54e`

## 1. Purpose

This document records and repairs a newly verified Spec 004 governance defect. The repair is strictly forward-only. It does not rewrite published Git history, backdate authority, retroactively qualify a merge, or fabricate task closeout evidence.

The controlling Spec 004 authorization requires the implementation sequence `T101 -> T102 -> T103`, with each task receiving exact-head six-lane Project CI, fresh exact-head independent review and reconciliation, zero unresolved material findings, and guarded expected-head merge before the task can be recorded `CLOSED_CANONICAL` and the next task may begin.

## 2. Binding live evidence

### 2.1 T101 historical merge

T101 was implemented through PR #114:

- base: `df6fc9f88e1c270ebbba59e1d5530738b0189ea6`;
- exact head: `748086c6764d8241f433ad9f5d6dce326804ea8d`;
- merge: `9eb1a90b6816353cbf203e55f04c98cb4c34096c`;
- Project CI run: `33515561988`;
- original Windows 2025 / Node 22 job: `99881583525`.

PR #114 merged at `2026-09-01T13:54:35Z`.

The original Windows 2025 / Node 22 job completed at `2026-09-01T13:57:15Z` with conclusion `failure`; its bounded Windows test step failed. Therefore PR #114 merged before exact-head six-lane qualification was complete, and the completed run was not six-lane green.

PR #114 also has no GitHub review submission and no review thread establishing the required fresh exact-head independent review.

These are pre-merge gate defects. They cannot be repaired retroactively by reclassifying the historical merge.

### 2.2 Diagnostic same-head rerun

A same-head rerun of the failed Windows 2025 / Node 22 job was triggered on 2026-09-02 against exact T101 head `748086c6764d8241f433ad9f5d6dce326804ea8d`.

That rerun is diagnostic evidence only. Whether it succeeds or fails, it does not retroactively satisfy a qualification gate that was required before PR #114 merged.

### 2.3 Downstream dependency consequence

T102 implementation PR #115, T102 reconciliation PR #117, and T103 authority reconciliation PR #119 all occur downstream of the historical T101 closeout claim. Because T101 was not truthfully eligible for `CLOSED_CANONICAL` at that point, the required task-order dependency was not satisfied before those downstream units began.

PR #121, the current T103 implementation PR, remains unmerged and must not be merged from this invalid dependency lineage.

PR #121 also received a material exact-head independent-review finding: optional receipt-facing branch evidence can be represented as a partial field set such that aggregate branch-gap fields may exist without `branch_records`, while semantic material-gap detection ignores those counters when `branch_records` is absent. That finding must be preserved and repaired when T103 is re-executed from a valid dependency chain; it must not be lost merely because PR #121 is superseded.

## 3. Controlling reconciliation rule

The existing canonical Spec 004 governance reconciliation already establishes the applicable rule for a nonconforming task sequence:

- no retroactive authorization fabrication;
- no retroactive task closeout fabrication;
- no combined or out-of-order task merge substituted for sequential closure;
- no hidden failed Windows CI;
- repair only through ordinary forward history;
- qualify the repair exact head;
- obtain fresh independent review;
- guarded-merge with expected-head protection;
- verify ordered parents, tree, signature, and canonical `main`;
- then re-execute `T101 -> T102 -> T103` in canonical order.

This reconciliation applies that already-canonical rule to the newly verified T101 pre-merge gate defect.

## 4. Forward-only repair scope

The repair commit restores only the Spec 004 product/implementation state introduced after exact pre-T101 canonical state `df6fc9f88e1c270ebbba59e1d5530738b0189ea6` while preserving all published commit history.

### 4.1 Restore exact pre-T101 blobs

The following files are restored to their exact blobs from tree `5915f6ea2a0346fcf9351b95a6f5f5f27189c54e`:

- `src/check.ts` -> `126447354b749ab188c91cdeb7421f89667a3a11`;
- `src/coverage/lcov.ts` -> `cba9fab0313bd236cc011a5db0a64934fdc2525d`;
- `src/exercise.ts` -> `98927af0b323f44e216a34c00ca95b217d6ee566`.

### 4.2 Remove downstream task-only additions from the active tree

The following files are removed prospectively because they were introduced by the invalidated T101/T102/T103 dependency chain and will be recreated only by their correctly ordered task executions:

- `tests/fixtures/lcov/branch-cases.json`;
- `tests/t101-lcov-branch-parser.contract.test.ts`;
- `tests/t102-branch-exercise-builder.contract.test.ts`;
- `tests/t102-branch-exercise.contract.test.ts`;
- `specs/004-branch-evidence-product-integration/T103_AUTHORITY_RECONCILIATION.md`;
- `specs/004-branch-evidence-product-integration/T103_AUTHORITY_RECONCILIATION_AUDIT.md`.

The historical commits and review/evidence records that introduced these paths remain permanently reachable in Git history.

### 4.3 Preserved surfaces

This reconciliation must not mutate:

- `package.json` or `package-lock.json`;
- receipt-v1 schema or receipt model;
- historical benchmark result files, including:
  - `benchmarks/results/t078-selector-misses.json`;
  - `benchmarks/results/t091-m2-selection-replay.json`;
  - `benchmarks/results/t095-branch-exercise-qualification.json`;
- release metadata;
- npm publication state;
- GitHub Releases;
- Git tags;
- unrelated repository surfaces.

## 5. Qualification requirements for this repair

This reconciliation is not canonical merely because its commit exists. One exact repair head must satisfy all of the following before merge:

1. branch starts from exact canonical `main` `ff34ce8ffaafd8a4b6fb9f27890b164cd58fd9e1`;
2. changed-path set is limited to the nine state-restoration paths plus this reconciliation document;
3. restored product blobs exactly equal the pre-T101 canonical blobs listed above;
4. the three historical benchmark-result blobs remain unchanged;
5. no package, dependency, receipt schema/model, release, publication, or tag mutation;
6. exact-head Project CI is green in all six required OS/Node lanes;
7. fresh exact-head independent review is completed;
8. every material review finding is reconciled;
9. zero unresolved material review threads remain;
10. repair head remains unchanged after qualification and review;
11. guarded merge binds to the expected exact repair head SHA.

Immediately after merge, verify:

- PR merged state;
- exact merge commit SHA;
- ordered parent 1 equals the pre-merge canonical `main`;
- ordered parent 2 equals the qualified repair head;
- merge tree;
- GitHub commit verification/signature;
- canonical `main` equals the merge commit;
- no unexpected intervening `main` movement.

Only then may Issue #122 record:

`T101_GATE_RECONCILIATION = CLOSED_CANONICAL`

## 6. Required task re-execution after repair

After this repair is canonically merged and verified:

1. reread Spec 004 governance from the new `main`;
2. create a fresh T101 task branch from that exact canonical `main`;
3. implement only T101-authorized surfaces;
4. exact-head qualify T101 in all six Project CI lanes;
5. obtain fresh exact-head independent review and reconcile all material findings;
6. guarded-merge T101 with expected-head protection and complete ordered-parent/tree/signature/main verification;
7. record `T101 = CLOSED_CANONICAL` only after those checks;
8. begin T102 only after the T101 canonical closeout;
9. preserve the already-discovered T102 requirement that changed-line receipt records remain derived exclusively from line (`DA`) evidence while branch exercise remains separate;
10. qualify, review, guarded-merge, verify, and close T102 canonically;
11. prospectively re-establish any T103 authority-surface amendment still required from the valid post-T102 canonical `main`;
12. execute T103 only after its authority chain is valid;
13. include a fix for the preserved PR #121 partial-branch-field semantic defect;
14. qualify, independently review, guarded-merge, verify, and close T103 canonically;
15. perform a separate Spec 004 closeout only after every task and reconciliation gate is supported by exact live evidence.

## 7. Hard boundaries

- No force-push, rebase, reset, or destructive history rewrite.
- No retroactive task qualification, authority, review, or closeout fabrication.
- No suppression or reclassification of the original failed T101 Windows CI job.
- No downstream task implementation before its predecessor is canonically closed.
- No historical benchmark-result mutation.
- No dependency mutation.
- No receipt schema/model mutation in this reconciliation.
- No npm publication, GitHub Release, or Git tag.

## 8. Current decision

`NO_GO` for merging PR #121 or closing T103/Spec 004 from the current lineage.

`GO` only for this bounded forward-only reconciliation and, after its own canonical closeout, fresh ordered re-execution of Spec 004 tasks under the existing authorization chain.