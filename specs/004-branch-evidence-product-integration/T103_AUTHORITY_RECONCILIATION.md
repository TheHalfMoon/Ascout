# T103 Authority-Surface Reconciliation

**Spec:** 004 — Branch-Evidence Product Integration  
**Status:** `AUTHORITY_AMENDMENT_PENDING_MERGE`  
**Date:** 2026-09-01  
**Canonical base:** `a01cd87c77a2ed9e500cedbbc31beca64722bfea`  
**Canonical base tree:** `0b40d9b21cf89f9bd2d6a2163dadfabae8636ed3`  
**Ledger:** Issue #118

## 1. Purpose

This document is a prospective, forward-only clarification of the T103 authorized mutation surface. It does not backdate authority, change T101/T102 history, or authorize any implementation before this document itself is canonically merged and verified.

The original Spec 004 planning chain already requires an additive receipt-v1 branch schema extension and branch-evidence publication, but the task-specific T103 surface list omitted two concrete files required to implement that already-planned behavior safely:

1. the strict receipt-v1 JSON Schema file; and
2. the minimal `src/check.ts` receipt projection that T102 intentionally kept line-only.

This reconciliation resolves only that file-surface inconsistency. It does not add product requirements.

## 2. Canonical evidence binding

This amendment binds to:

- `.specify/memory/constitution.md`;
- `docs/founding/MASTER_PLAN_V1.md`;
- `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`;
- `docs/architecture/M4_BRANCH_EVIDENCE_PRODUCT_INTEGRATION_REVIEW_2026-09-01.md`;
- the complete canonical `specs/004-branch-evidence-product-integration/` planning package;
- `specs/004-branch-evidence-product-integration/IMPLEMENTATION_AUTHORIZATION.md`;
- T101 canonical closeout at `9eb1a90b6816353cbf203e55f04c98cb4c34096c`;
- T102 canonical merge at `70394f1df69d74a282f1950ffc36a383f268685b`;
- T102 forward-only reconciliation merge at `a01cd87c77a2ed9e500cedbbc31beca64722bfea`;
- Issue #116 closeout marker `T102_RECONCILIATION = CLOSED_CANONICAL`;
- Issue #118 as the durable reconciliation ledger.

## 3. Why reconciliation is required

### 3.1 Strict schema reality

The canonical receipt-v1 JSON Schema uses `additionalProperties: false` for `exercise`. The existing schema therefore rejects the five optional branch fields planned by Spec 004 unless the schema itself is additively widened.

The canonical planning package already states all of the following:

- receipt schema version remains `"1.0"`;
- `BranchRecordV1` is additive and optional within receipt v1;
- branch fields are optional and backward compatible;
- `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json` must not change in a non-additive way;
- Spec 004 closeout must verify that the receipt-v1 schema did not change in a non-additive way.

Therefore an additive schema-file mutation is required by the already-approved design, but the T103 task-specific surface list failed to name the file explicitly.

### 3.2 T102/T103 projection boundary

T102 correctly preserves receipt v1 by computing branch evidence internally while `src/check.ts` projects the result to the legacy line-only `ExerciseV1` shape.

T103 is the task that makes optional branch evidence receipt-visible. Because the canonical T102 reconciliation intentionally preserved that projection boundary, T103 requires a minimal `src/check.ts` projection-only mutation after the T103 receipt model and schema contract exist.

The original overall Spec 004 plan includes `src/check.ts` as a product integration point, but the T103 task-specific surface list did not explicitly carry that file forward for the projection transition.

## 4. Prospective T103 authorized mutation surface

Once this document is canonically merged and post-merge verified, T103 is authorized to mutate **only** the following surfaces for the purposes stated here.

### 4.1 `src/receipt/model.ts`

Existing T103 authority remains unchanged:

- add receipt-facing `BranchRecordV1`;
- extend `ExerciseV1` with optional:
  - `branch_records`;
  - `exercised_branches`;
  - `not_exercised_branches`;
  - `unresolved_branches`;
  - `changed_files_with_zero_exercised_branches`;
- extend `exerciseHasMaterialGap` additively for branch gaps;
- extend `validateExercise` and related model-level validation for optional branch records/counts;
- preserve validity of receipts where all branch fields are absent.

### 4.2 `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json`

Newly explicit T103 authority is limited to an **additive-only** receipt-v1 schema extension that:

- keeps receipt schema version `"1.0"`;
- adds an optional branch-record definition consistent with `BranchRecordV1`;
- adds only the five planned optional branch properties under `exercise`;
- does not add any branch property to the existing `required` list;
- preserves `additionalProperties: false`;
- does not rename, remove, weaken, or change the meaning of any pre-existing receipt-v1 property;
- does not alter unrelated schema definitions.

No receipt v2 is authorized.

### 4.3 `src/check.ts`

Newly explicit T103 authority is limited to the smallest receipt-projection mutation necessary to expose branch fields already computed by the canonical T102 branch exercise builder after the T103 model/schema contract exists.

Authorized behavior:

- replace or extend the T102 line-only projection so the receipt receives the five optional branch fields from the already-computed `fullExercise` value;
- preserve all existing line fields and records exactly;
- make no change to execution admission, task selection, widening, test execution, evidence generation, artifact generation, findings, source binding, or command provenance.

No other `src/check.ts` behavior change is authorized by this amendment.

### 4.4 Focused T103 tests and existing planned fixtures

Existing T103 test authority remains in force, including:

- `tests/t103-branch-receipt-validation.contract.test.ts`;
- `tests/t102-branch-exercise.contract.test.ts` when a T103 compatibility assertion genuinely requires extension;
- `tests/t101-lcov-branch-parser.contract.test.ts` only where the original authorization already permits T103 cross-contract proof;
- `tests/fixtures/lcov/branch-cases.json`.

Existing receipt-v1 contract tests may be extended only if required to prove that the additive schema accepts new optional branch fields while preserving legacy receipt validity. No unrelated test rewrite is authorized.

## 5. Required T103 semantics

This reconciliation does not change the original T103 requirements. T103 must still prove:

1. branch-only gaps are visible while the corresponding line record remains `EXERCISED` when LCOV line evidence says so;
2. fully exercised branch controls create zero false branch gaps;
3. unknown branch observations remain `UNRESOLVED`;
4. malformed/path-unsafe evidence fails closed at the established parser boundary;
5. branches outside changed ranges do not become changed-branch gaps;
6. branch records serialize deterministically by `(path, line, block_id, branch_id)`;
7. optional branch summary counts equal the branch records;
8. branch `NOT_EXERCISED` or `UNRESOLVED` is additive material incompleteness;
9. the existing exit-code precedence yields exit `4` for otherwise-stable materially incomplete branch evidence;
10. receipts without branch fields remain valid and preserve prior line-only behavior;
11. historical benchmark result files remain byte-for-byte unchanged.

## 6. Hard prohibitions retained

This amendment does **not** authorize changes to:

- `src/cli.ts`;
- `src/run.ts`;
- `src/selection.ts`;
- `src/receipt/json.ts`;
- `src/receipt/agent.ts`;
- `src/receipt/build.ts`;
- `package.json`;
- `package-lock.json`;
- historical benchmark result files;
- publication configuration;
- release metadata;
- Git tags.

It also does not authorize:

- receipt v2;
- function coverage;
- AST/CFG analysis;
- branch thresholds;
- new runtime dependencies;
- CLI branch-control flags;
- browser/API/security integration;
- plugin architecture;
- agent/RAG/memory expansion;
- force-push, rebase, or destructive history rewrite.

## 7. Qualification gates for this authority amendment

This document is not effective merely because it exists on a branch.

Before T103 implementation may begin, the authority-reconciliation PR must receive:

1. branch-purity verification showing documentation/governance-only mutation;
2. exact-head six-lane Project CI across Ubuntu 24.04, macOS 14, and Windows 2025 × Node 22/24;
3. fresh exact-head review reconciliation;
4. zero unresolved material review threads;
5. guarded merge using the exact expected head SHA;
6. post-merge verification of ordered parents, merge tree, GitHub signature/verification, PR state, and canonical main;
7. durable ledger closeout recording `T103_AUTHORITY_RECONCILIATION = CLOSED_CANONICAL`.

Any head mutation invalidates stale exact-head qualification and review evidence.

## 8. Effect after canonical merge

After the gates above close successfully, this document supplements and narrowly supersedes only the **T103 file-surface enumeration** in the original `IMPLEMENTATION_AUTHORIZATION.md`.

All original T103 requirements, compatibility guarantees, benchmark gates, CI/review requirements, and hard prohibitions remain in force except where this document makes the two omitted mutation surfaces explicit.

T103 implementation remains unauthorized until this authority reconciliation is itself canonically merged and verified.
