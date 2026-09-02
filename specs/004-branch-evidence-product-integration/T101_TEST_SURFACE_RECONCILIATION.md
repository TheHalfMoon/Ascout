# T101 Test-Surface Authority Reconciliation

**Spec:** 004 — Branch-Evidence Product Integration  
**Status:** `AUTHORITY_AMENDMENT_PENDING_MERGE`  
**Date:** 2026-09-02  
**Canonical base:** `c97fe8a31038860cc6ddd85c4d57aad3198030c6`  
**Canonical base tree:** `ecce5381de5f2b3938c21737ef2a28db14caab3b`  
**Ledger:** Issue #124

## 1. Purpose

This document prospectively reconciles one timing inconsistency in the already-canonical Spec 004 T101 authority. It does not backdate authority, rehabilitate historical T101, widen product scope, or authorize T102/T103 work.

The canonical T101 authorization requires direct product-parser acceptance for repository-safe `SF:` mapping, exact `BRDA:` parsing, numeric/unknown taken semantics, deterministic tuple identity and ordering, safe repeated aggregation, sticky unknown observations, fail-closed malformed/incomplete/path-unsafe input, and unchanged line parsing. The same canonical planning package places the named T101 parser contract file and deterministic branch fixture under T103 mutation scope instead of T101.

The forward repair merged by PR #123 explicitly requires this inconsistency to be reconciled prospectively before fresh T101 begins if it remains in canonical `main`. It remains present at the canonical base above.

## 2. Binding canonical evidence

This amendment binds to the exact canonical state after Issue #122 / PR #123 closeout and to the existing Spec 004 authority chain, including:

- `.specify/memory/constitution.md`;
- `docs/founding/MASTER_PLAN_V1.md`;
- `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`;
- `docs/architecture/M4_BRANCH_EVIDENCE_PRODUCT_INTEGRATION_REVIEW_2026-09-01.md`;
- `specs/004-branch-evidence-product-integration/spec.md`;
- `specs/004-branch-evidence-product-integration/plan.md`;
- `specs/004-branch-evidence-product-integration/tasks.md`;
- `specs/004-branch-evidence-product-integration/IMPLEMENTATION_AUTHORIZATION.md`;
- `docs/archive/S004_T101_PREMERGE_GATE_RECONCILIATION_2026-09-02.md`;
- Issue #122 closeout marker `T101_GATE_RECONCILIATION = CLOSED_CANONICAL`;
- Issue #124 as the durable authority-reconciliation ledger.

The required task sequence remains exactly `T101 -> T102 -> T103`.

## 3. Why a prospective amendment is required

### 3.1 T101 acceptance requires direct product proof

T101 product mutation is limited to `src/coverage/lcov.ts`, but its acceptance criteria require direct behavior that cannot be truthfully established by the pre-T101 benchmark-only branch-normalizer tests. Those existing T093 tests import `benchmarks/branch-coverage-lib.mjs`; they do not exercise `src/coverage/lcov.ts`.

### 3.2 The named proof surfaces are assigned too late

Canonical `tasks.md` and `IMPLEMENTATION_AUTHORIZATION.md` place these already-planned paths under T103:

- `tests/t101-lcov-branch-parser.contract.test.ts`;
- `tests/fixtures/lcov/branch-cases.json`.

Historical PR #114 created those paths during T101 without a prospective amendment. That historical mutation is not authority. The forward repair removed those paths and requires a fresh prospective clarification before they may be recreated.

### 3.3 This is a timing correction, not a requirement expansion

The path names, parser-contract purpose, deterministic fixture role, and T101 acceptance semantics already exist in the canonical Spec 004 package. This amendment changes only **when** those two proof surfaces may first be mutated: during fresh T101, where the behavior they prove is implemented and qualified.

## 4. Prospective T101 authorized mutation surface

Only after this authority amendment is canonically merged and post-merge verified, fresh T101 may mutate exactly these surfaces:

1. `src/coverage/lcov.ts` — unchanged original T101 product surface;
2. `tests/t101-lcov-branch-parser.contract.test.ts` — newly explicit T101 direct contract-test surface;
3. `tests/fixtures/lcov/branch-cases.json` — newly explicit T101 deterministic fixture surface used only by the parser contracts.

No other product, test, fixture, schema, benchmark, package, workflow, release, publication, or tag surface is authorized by this amendment.

## 5. T101 proof boundary

The two newly explicit proof surfaces may cover only the original T101 acceptance boundary:

- repository-safe `SF:` mapping for branch records;
- exact `BRDA:` four-field parsing (`line,block,branch,taken`);
- non-negative safe-integer `taken` values and unknown `-` semantics;
- deterministic identity `(canonical_path, line, block_id, branch_id)`;
- deterministic ordering by that tuple;
- repeated numeric aggregation by safe addition;
- unknown observation for an identity remains unresolved;
- safe-integer overflow fails closed;
- malformed/incomplete/path-unsafe branch evidence fails closed with stable reasons;
- Windows source mapping yields canonical repository-relative paths;
- LCOV input with no usable branch records does not invent branch evidence;
- existing line parsing behavior remains unchanged when branch records are present.

The fixture may contain only deterministic inputs and expected outcomes needed to prove these requirements. It is not a new benchmark corpus and must not change any historical benchmark result.

## 6. Effect on the original T103 enumeration

This amendment narrowly supersedes only the **initial mutation timing** of:

- `tests/t101-lcov-branch-parser.contract.test.ts`;
- `tests/fixtures/lcov/branch-cases.json`.

Their initial creation and T101 acceptance proof are now prospective T101 authority after this amendment closes canonically.

This document does **not** decide what later T103 mutation, if any, is permitted on those inherited paths. T103 authority must be re-established prospectively only after a valid T102 canonical closeout, as required by the forward repair. No historical T103 authority is revived by this amendment.

## 7. T102 boundary remains closed

This amendment grants no T102 test-surface authority. The preserved T102 inconsistency involving:

- `tests/t102-branch-exercise-builder.contract.test.ts`;
- `tests/t102-branch-exercise.contract.test.ts`

must be reconsidered only after fresh T101 is `CLOSED_CANONICAL`. If it remains, it requires its own prospective reconciliation before T102 implementation begins.

## 8. Hard prohibitions retained

This amendment does not authorize:

- any product mutation in this authority-reconciliation PR;
- any T102 or T103 implementation;
- receipt model or receipt schema mutation;
- function coverage, AST/CFG analysis, branch thresholds, or new runtime dependencies;
- CLI/terminal/agent output changes;
- package or lockfile changes;
- benchmark fixture/result replacement outside the T101 contract fixture named above;
- historical benchmark-result mutation;
- npm publication, GitHub Release creation, or Git tag creation;
- force-push, rebase, reset, or destructive history rewrite;
- retroactive qualification, review, authority, or closeout claims.

All original Spec 004 compatibility, evidence, CI, review, and hard-prohibition requirements remain in force.

## 9. Qualification gates for this amendment

This document is not effective merely because it exists on a branch. Before fresh T101 may begin, this governance-only authority amendment must satisfy all of the following on one exact head:

1. branch starts from exact canonical `main` `c97fe8a31038860cc6ddd85c4d57aad3198030c6`;
2. changed paths are governance/documentation only;
3. no product/test/fixture/package/dependency/schema/benchmark-result/release/tag mutation;
4. exact-head Project CI is green across Ubuntu 24.04, macOS 14, and Windows 2025 × Node 22/24;
5. fresh exact-head independent review is completed;
6. every material finding is reconciled;
7. zero unresolved material review threads remain;
8. the qualified/reviewed head remains unchanged;
9. guarded merge binds to the exact expected head SHA;
10. post-merge verification proves ordered parents, merge tree, GitHub verification/signature, PR merged state, canonical `main`, and no intervening main movement.

Only after those checks may Issue #124 record:

`T101_TEST_SURFACE_RECONCILIATION = CLOSED_CANONICAL`

## 10. Effect after canonical closeout

After this amendment closes canonically:

1. reread exact canonical `main`;
2. create a fresh T101 implementation branch from that exact canonical state;
3. mutate only the three T101 surfaces enumerated in Section 4;
4. prove the original T101 acceptance criteria without widening product scope;
5. qualify the exact T101 head in all six Project CI lanes;
6. obtain fresh exact-head independent review and reconcile all material findings;
7. guarded-merge with expected-head protection;
8. verify ordered parents/tree/signature/PR/main;
9. record `T101 = CLOSED_CANONICAL` only after post-merge verification;
10. only then reconsider the preserved T102 test-surface inconsistency.
