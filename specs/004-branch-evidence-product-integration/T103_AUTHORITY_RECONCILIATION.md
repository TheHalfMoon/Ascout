# T103 Authority Reconciliation

**Spec:** 004 — Branch-Evidence Product Integration  
**Status:** `AUTHORITY_AMENDMENT_PENDING_MERGE`  
**Date:** 2026-09-02  
**Canonical base:** `87b735e3dff013ef2b22e23ea036123a7c59f0a8`  
**Canonical base tree:** `3f15c342ef4d2cff09d296c876efc6a859775583`  
**Ledger:** Issue #132

## 1. Purpose

This document is a prospective, governance-only amendment for fresh Spec 004 T103 after T102 became `CLOSED_CANONICAL` in Issue #130 / PR #131. It does not backdate authority, alter T101/T102 history, begin T103 implementation, or widen Spec 004 beyond branch-evidence receipt integration already required by the canonical planning package.

Fresh T102 intentionally kept receipt v1 line-only while producing the internal full branch exercise result. Live T103 acceptance now requires publication, semantic validation, JSON Schema validation, completeness/exit integration, genuine no-BRDA compatibility, and fail-closed invalid branch normalization. The original T103 surface list omits several files necessary to prove those existing requirements.

## 2. Existing T103 product and proof surfaces retained

The original implementation authorization remains effective for:

- `src/receipt/model.ts` — add `BranchRecordV1`, extend `ExerciseV1` with the optional branch group, validate branch semantics, and include branch gaps in material incompleteness;
- `tests/t103-branch-receipt-validation.contract.test.ts` — focused semantic and schema contract proof;
- `tests/fixtures/lcov/branch-cases.json` — deterministic branch fixtures only where required by T103 proof;
- `tests/t101-lcov-branch-parser.contract.test.ts` only when a fresh T103 assertion genuinely belongs there and does not mutate predecessor behavior;
- `tests/t102-branch-exercise.contract.test.ts` only when a fresh T103 assertion genuinely belongs there and does not mutate predecessor behavior.

Receipt `schema_version` remains exactly `"1.0"`.

## 3. Newly explicit T103 product surfaces

Only after this authority amendment itself is canonically merged and post-merge verified, fresh T103 may additionally mutate:

- `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json` — additive receipt-v1 JSON Schema support for the optional five-field branch group, with no schema-version change and no unsupported custom-validator keywords;
- `src/check.ts` — distinguish genuine branch-data absence from invalid branch normalization, route invalid/path-unsafe/incomplete/invalid-taken branch evidence through the existing Vitest/Jest evidence-error fail-closed path, and publish the resolved T102 full branch exercise into receipt v1 without altering line fields;
- `tests/vitest-check.integration.test.ts` — Vitest integration proof for resolved branch publication, genuine no-BRDA absence, branch-only material incompleteness/exit 4, and invalid branch fail-closed behavior where Vitest-specific execution is required;
- `tests/jest-check.integration.test.ts` — Jest integration proof for the same runner-boundary behavior where Jest-specific execution is required.

No other product or integration-test surface is added by this reconciliation.

## 4. Required T103 receipt contract

The five branch fields form one optional all-or-none receipt-v1 group:

1. `branch_records`
2. `exercised_branches`
3. `not_exercised_branches`
4. `unresolved_branches`
5. `changed_files_with_zero_exercised_branches`

All five absent is valid legacy behavior. If any one is present, all five must be present. Every partial-presence combination must be rejected semantically and by JSON Schema.

The repository custom receipt schema validator does not support `dependentRequired`. JSON Schema all-or-none enforcement must use only constructs already supported by the validator, including `allOf` + `if` + `then` + `required`. No unsupported schema keyword is authorized.

## 5. Branch record semantics

`BranchRecordV1` must preserve deterministic tuple identity and ordering by `(path, line, block_id, branch_id)` and enforce:

- `line` is a positive safe integer in `1..9007199254740991`;
- `taken` is `null` or a non-negative safe integer in `0..9007199254740991`;
- `block_id` and `branch_id` are nonempty strings;
- state is exactly `EXERCISED`, `NOT_EXERCISED`, or `UNRESOLVED`;
- `EXERCISED` requires numeric `taken > 0` and no unresolved reason;
- `NOT_EXERCISED` requires numeric `taken === 0` and no unresolved reason;
- `UNRESOLVED` requires `taken === null` and a nonempty reason;
- tuple identities are unique;
- branch record paths/lines are contained by eligible changed new-line ranges in `comparison.changed_files`;
- branch records are deterministically ordered;
- branch summary counts exactly match validated records.

`changed_files_with_zero_exercised_branches` must be derived against the full eligible changed-range path set from `comparison.changed_files`, including eligible changed-range files that have no branch tuple at all. It must not count only paths represented in `branch_records`.

## 6. Material-gap robustness

`exerciseHasMaterialGap` must treat branch not-exercised or unresolved aggregate counts as material whenever those aggregate properties are observably present, even if malformed partial input omits `branch_records`. Semantic validation must still reject every partial branch group. This prevents malformed partial aggregate presence from silently suppressing incompleteness before validation failure is surfaced.

When a valid full branch group is present, `not_exercised_branches > 0` or `unresolved_branches > 0` is additive material incompleteness and must preserve the existing exit-precedence policy, producing exit code 4 when no higher-precedence condition applies.

## 7. Runner publication and fail-closed rules

Fresh T103 must preserve these three distinct outcomes through both Vitest and Jest execution paths:

### Genuine no-BRDA

A valid LCOV document with no `BRDA:` records is genuine branch-data absence. All five branch receipt fields remain absent. Existing line-only receipt, completeness, and exit behavior remains identical.

### Resolved branch evidence

Resolved normalized branch evidence publishes all five branch fields from the T102 full exercise. No line record, line summary count, or line zero-exercised-file count may be changed by branch publication.

### Invalid branch normalization

Malformed, incomplete, path-unsafe, invalid-taken, or otherwise invalid branch normalization must use the existing Vitest/Jest evidence-error fail-closed path. It must never be coerced into an empty branch array and must never become clean zero branch evidence.

## 8. Required focused proof

Fresh T103 qualification must include direct focused proof of:

- all-or-none partial-presence matrix at both semantic and JSON Schema layers;
- valid legacy all-five-absent receipt;
- positive-safe-integer `line` lower/upper bounds and rejection outside bounds;
- nullable/non-negative-safe-integer `taken` bounds and rejection outside bounds;
- state/taken/reason consistency;
- nonempty block/branch identifiers;
- tuple uniqueness;
- changed-range containment;
- deterministic ordering;
- summary consistency;
- changed-range file with no branch tuple contributing to `changed_files_with_zero_exercised_branches`;
- resolved branch-only gap reaching material incompleteness and exit code 4 when no higher-precedence condition applies;
- genuine LCOV no-BRDA preserving complete line-only receipt behavior with all branch fields absent;
- invalid/path-unsafe/incomplete/invalid-taken branch normalization reaching the existing evidence-error fail-closed path for both Vitest and Jest.

## 9. Retained hard boundaries

This amendment does not authorize:

- any receipt schema version change;
- `src/cli.ts`, `src/run.ts`, `src/selection.ts`, `src/receipt/json.ts`, `src/receipt/agent.ts`, or `src/receipt/build.ts` mutation;
- package or dependency mutation;
- workflow mutation;
- historical benchmark-result mutation;
- function coverage, AST/CFG analysis, thresholds, or new runtime dependency;
- npm publication, GitHub Release creation, tag creation, or any other publication action;
- force-push, rebase, or destructive history rewriting.

The historical benchmark blobs `benchmarks/results/t078-selector-misses.json`, `benchmarks/results/t091-m2-selection-replay.json`, and `benchmarks/results/t095-branch-exercise-qualification.json` remain immutable.

## 10. Qualification gates for this authority amendment

This authority amendment is ineffective until one exact head satisfies all of the following:

1. changed paths are governance/documentation-only and exactly this reconciliation plus `T103_AUTHORITY_RECONCILIATION_AUDIT.md`;
2. historical benchmark-result blobs are unchanged;
3. exact-head Project CI is green in all six required OS/Node lanes;
4. a fresh genuinely independent exact-head review is complete;
5. every material review finding is reconciled;
6. zero unresolved material review threads remain;
7. the final head remains unchanged after qualification/review;
8. guarded merge uses the expected exact head SHA;
9. post-merge verification proves ordered parents, merge tree, GitHub verification/signature, PR merged state, canonical `main`, and no intervening main movement;
10. Issue #132 records `T103_AUTHORITY_RECONCILIATION = CLOSED_CANONICAL`.

Fresh T103 implementation must not begin before this amendment closes canonically.
