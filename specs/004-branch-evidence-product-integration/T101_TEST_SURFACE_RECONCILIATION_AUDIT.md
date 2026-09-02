# T101 Test-Surface Reconciliation Audit

**Spec:** 004 — Branch-Evidence Product Integration  
**Status:** `AUDIT_PENDING_MERGE`  
**Date:** 2026-09-02  
**Canonical base:** `c97fe8a31038860cc6ddd85c4d57aad3198030c6`  
**Canonical base tree:** `ecce5381de5f2b3938c21737ef2a28db14caab3b`  
**Ledger:** Issue #124  
**Authority document:** `T101_TEST_SURFACE_RECONCILIATION.md`

## Audit question

Does the proposed amendment resolve the canonical T101 proof-surface timing inconsistency without widening Spec 004 product scope, advancing downstream task authority, or weakening any existing gate?

## Evidence checked

The audit checked the canonical post-repair state and the following controlling facts:

1. Spec 004 requires strict order `T101 -> T102 -> T103`.
2. Fresh T101 may not begin until the preserved test/fixture timing inconsistency is reconciled prospectively.
3. Original T101 product mutation is limited to `src/coverage/lcov.ts`.
4. Original T101 acceptance already requires direct branch-parser semantics.
5. The pre-T101 T093 contract exercises the benchmark-only normalizer, not `src/coverage/lcov.ts`.
6. `tests/t101-lcov-branch-parser.contract.test.ts` and `tests/fixtures/lcov/branch-cases.json` are already named in the canonical Spec 004 package but are currently assigned to T103 mutation timing.
7. Historical PR #114 created those paths during T101 without prospective authority; the canonical forward repair removed them and explicitly forbids repeating that silent interpretation.
8. The preserved T102 test-surface inconsistency must not be reconciled until valid T101 canonical closeout.
9. T103 authority must not be re-established until valid T102 canonical closeout.

## Scope comparison

### Product requirements

**Before amendment:** T101 implements branch observation parsing in `src/coverage/lcov.ts` and proves repository-safe mapping, exact BRDA parsing, taken semantics, deterministic identity/order, aggregation, unresolved semantics, fail-closed behavior, and unchanged line parsing.

**After amendment:** identical.

**Result:** `NO_PRODUCT_REQUIREMENT_CHANGE`.

### Product mutation surface

**Before amendment:** `src/coverage/lcov.ts`.

**After amendment:** `src/coverage/lcov.ts`.

**Result:** `NO_PRODUCT_SURFACE_WIDENING`.

### Proof mutation surface

**Before amendment:** the named T101 contract file and deterministic fixture are assigned too late under T103.

**After amendment:** those two already-planned proof paths become explicit T101 mutation surfaces solely for the existing T101 acceptance boundary.

**Result:** `TIMING_INCONSISTENCY_RECONCILED_PROSPECTIVELY`.

### T102/T103 authority

The amendment grants no T102 test mutation, no T103 product/schema/check authority, and no downstream implementation permission.

**Result:** `DOWNSTREAM_AUTHORITY_NOT_ADVANCED`.

## YAGNI / boundary audit

The amendment adds no:

- function coverage;
- AST/CFG analysis;
- branch threshold;
- new benchmark corpus;
- runtime dependency;
- CLI option;
- receipt field or schema version;
- runner or retry mechanism;
- workflow mutation;
- release/publication/tag behavior.

It only places direct proof beside the task whose already-authorized behavior it verifies.

**Result:** `YAGNI_PASS`.

## Evidence-discipline audit

The amendment is prospective and explicitly rejects:

- historical T101 rehabilitation;
- retroactive authority;
- retroactive CI/review qualification;
- reuse of the invalid historical dependency chain as canonical closeout evidence.

Historical implementation artifacts may later be used only as implementation references after fresh authority is canonical; fresh task execution must independently satisfy current exact-head CI/review/merge/verification gates.

**Result:** `EVIDENCE_DISCIPLINE_PASS`.

## Compatibility audit

Because this authority PR itself is governance/documentation-only, it changes no runtime or receipt behavior. The eventual T101 proof boundary continues to require unchanged existing line parsing and preserves all original compatibility requirements.

**Result:** `COMPATIBILITY_SCOPE_UNCHANGED`.

## Qualification audit

The authority amendment remains ineffective until one exact head satisfies:

- governance-only branch purity;
- six-lane Project CI;
- fresh independent exact-head review;
- reconciliation of all material findings;
- zero unresolved material threads;
- guarded expected-head merge;
- ordered-parent/tree/signature/PR/main post-merge verification;
- Issue #124 canonical closeout.

Any head mutation invalidates stale CI/review evidence.

**Result:** `GATES_PRESERVED`.

## Final audit decision

`GO` for the bounded prospective T101 test-surface authority amendment only.

`NO_GO` for T101 implementation until this amendment is canonically merged and verified.

`NO_GO` for T102 test-surface reconciliation until fresh T101 is `CLOSED_CANONICAL`.

`NO_GO` for T103 authority restoration or implementation until fresh T102 is `CLOSED_CANONICAL`.
