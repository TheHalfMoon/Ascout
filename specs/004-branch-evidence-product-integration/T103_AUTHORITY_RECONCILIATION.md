# T103 Authority-Surface Reconciliation

**Spec:** 004 — Branch-Evidence Product Integration  
**Status:** `AUTHORITY_AMENDMENT_PENDING_MERGE`  
**Date:** 2026-09-01  
**Reconciled:** 2026-09-02  
**Canonical base:** `a01cd87c77a2ed9e500cedbbc31beca64722bfea`  
**Canonical base tree:** `0b40d9b21cf89f9bd2d6a2163dadfabae8636ed3`  
**Ledger:** Issue #118

## 1. Purpose

This document is a prospective, forward-only clarification of the T103 authorized mutation surface and branch-integration boundary. It does not backdate authority, change T101/T102 history, or authorize any implementation before this document itself is canonically merged and verified.

The original Spec 004 planning chain already requires an additive receipt-v1 branch schema extension, branch-evidence publication, backward-compatible absence semantics, and fail-closed malformed/path-unsafe branch evidence. The task-specific T103 surface list omitted two concrete files required to implement that already-planned behavior safely:

1. the strict receipt-v1 JSON Schema file; and
2. the `src/check.ts` integration boundary that T102 intentionally kept receipt-line-only and that currently collapses unavailable and invalid branch normalization into the same empty observation list.

This reconciliation resolves only those concrete implementation-surface inconsistencies. It does not add product requirements.

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

T103 is the task that makes optional branch evidence receipt-visible. Because the canonical T102 reconciliation intentionally preserved that projection boundary, T103 requires a minimal `src/check.ts` projection mutation after the T103 receipt model and schema contract exist.

The original overall Spec 004 plan includes `src/check.ts` as a product integration point, but the T103 task-specific surface list did not explicitly carry that file forward for the projection transition.

### 3.3 Branch absence and invalid branch evidence are currently collapsed

Canonical `executeVitestTask` and `executeJestTask` normalize branch coverage independently from line coverage. At the current canonical base, both paths convert every non-resolved branch-normalization result to an empty branch observation list.

That behavior loses a required trust distinction:

- a report with no usable branch records is legitimate branch-data absence and must preserve line-only backward compatibility; but
- malformed, incomplete, path-unsafe, invalid-taken, or otherwise invalid branch coverage must fail closed or remain explicitly unresolved.

If T103 merely publishes the existing branch aggregates, both states can appear as zero branch counts. That would allow invalid branch evidence to become indistinguishable from a clean zero-gap branch surface and would violate No Green by Omission plus the already-canonical T103 malformed/path-unsafe acceptance criterion.

T103 therefore needs narrowly bounded authority in `src/check.ts` to preserve this distinction while integrating already-authorized branch evidence.

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

Newly explicit T103 authority is limited to the smallest branch-evidence integration mutation necessary to preserve the already-planned trust semantics and expose resolved branch evidence after the T103 model/schema contract exists.

Authorized behavior:

- preserve resolved branch observations from `normalizeLcovBranchCoverage` and pass them to the existing branch exercise builder;
- distinguish genuine branch-data absence (`no usable branch coverage records`) from invalid branch normalization;
- represent genuine branch-data absence as branch evidence unavailable for receipt projection, leaving all five optional branch receipt fields absent;
- route any other unresolved branch-normalization result through the existing runner evidence-invalid fail-closed path, or an equivalently narrow existing incomplete/error path, so malformed/path-unsafe branch evidence can never become zero branch evidence or clean success;
- expose the five optional branch fields only when resolved branch evidence is available from the already-computed `fullExercise` value;
- preserve all existing line fields and line records exactly;
- make no change to command execution, changed-command-surface admission, task selection, widening policy, test invocation, evidence/artifact capture format, findings, source binding, drift, or command provenance beyond the fail-closed handling required for invalid branch evidence.

No other `src/check.ts` behavior change is authorized by this amendment. No new reason-code taxonomy, runner, command, retry loop, or evidence format is required.

### 4.4 Focused T103 tests and existing planned fixtures

Existing T103 test authority remains in force, including:

- `tests/t103-branch-receipt-validation.contract.test.ts`;
- `tests/t102-branch-exercise.contract.test.ts` when a T103 compatibility assertion genuinely requires extension;
- `tests/t101-lcov-branch-parser.contract.test.ts` only where the original authorization already permits T103 cross-contract proof;
- `tests/fixtures/lcov/branch-cases.json`.

Existing receipt-v1 and run-check contract tests may be extended only when required to prove:

- additive schema acceptance for new optional branch fields;
- legacy receipt validity when branch fields are absent;
- resolved branch evidence is published;
- genuine no-branch-data input leaves optional branch fields absent; and
- malformed/path-unsafe branch evidence fails closed rather than becoming zero branch evidence.

No unrelated test rewrite is authorized.

## 5. Required T103 semantics

This reconciliation does not change the original T103 requirements. T103 must still prove:

1. branch-only gaps are visible while the corresponding line record remains `EXERCISED` when LCOV line evidence says so;
2. fully exercised branch controls create zero false branch gaps;
3. unknown branch observations remain `UNRESOLVED`;
4. malformed/path-unsafe branch evidence fails closed and cannot be represented as a clean zero-branch result;
5. genuine absence of branch coverage leaves the optional branch receipt surface absent and preserves line-only behavior;
6. branches outside changed ranges do not become changed-branch gaps;
7. branch records serialize deterministically by `(path, line, block_id, branch_id)`;
8. optional branch summary counts equal the branch records when the branch surface is present;
9. branch `NOT_EXERCISED` or `UNRESOLVED` is additive material incompleteness;
10. the existing exit-code precedence yields exit `4` for otherwise-stable materially incomplete resolved branch evidence;
11. invalid branch evidence cannot yield clean success and follows the existing fail-closed error/incompleteness precedence;
12. receipts without branch fields remain valid and preserve prior line-only behavior;
13. historical benchmark result files remain byte-for-byte unchanged.

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

After the gates above close successfully, this document supplements and narrowly supersedes only the **T103 file-surface enumeration and `src/check.ts` branch-integration boundary** in the original `IMPLEMENTATION_AUTHORIZATION.md`.

All original T103 requirements, compatibility guarantees, benchmark gates, CI/review requirements, and hard prohibitions remain in force except where this document makes the omitted concrete mutation surfaces and fail-closed integration distinction explicit.

T103 implementation remains unauthorized until this authority reconciliation is itself canonically merged and verified.
