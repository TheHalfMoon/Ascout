# Spec 003 Implementation Authorization

**Spec:** 003 — Branch Exercise Evidence Qualification  
**Authorization date:** 2026-09-01  
**Authorization state:** `FOUNDER_AUTHORIZED / EFFECTIVE_ONLY_WHEN_CANONICAL`  
**Authorized tasks:** `T093 → T094 → T095 → T096` only  
**Authorized scope:** benchmark/qualification-only

## Purpose

This ledger records the prospective implementation authorization required by repository governance before any Spec 003 implementation mutation begins.

The founder's standing authorization for ordinary repository work is recorded here only after the complete Spec 003 planning package became canonical. This record does not backdate or fabricate implementation authority. It becomes effective only when this file itself is merged into canonical `main` and the merge identity is verified.

Until that canonical merge is complete:

`T093_IMPLEMENTATION_AUTHORIZED = false`

After this ledger is canonically merged and verified:

`T093_IMPLEMENTATION_AUTHORIZED = true`

subject to every boundary and dependency gate in this record and the canonical Spec 003 authority chain.

## Canonical planning identity

The authorization binds exactly this completed planning unit:

- planning PR: `#102` — `docs(spec): define branch exercise qualification`
- original planning baseline: `92f57989085999aeb4f617f7ec8389afa7caece2`
- audited planning-content head: `4574fdba655ee8d5f9271dcd66d8f6476fa5f94e`
- exact merged planning PR head: `2d8c3a5d41cbb87ee23e79a0b084f75162006b72`
- exact merged planning PR tree: `ab76a58667d680caa0b6984cb53fc69eecbc8ae0`
- canonical planning merge: `10ddc6a3fb13f0163bce483eb46ae9d1180ffea7`
- canonical planning merge tree: `ab76a58667d680caa0b6984cb53fc69eecbc8ae0`
- canonical planning merge first parent: `b60208d40c790e08b17ab9d65ac3906f3a256dc0`
- canonical planning merge second parent: `2d8c3a5d41cbb87ee23e79a0b084f75162006b72`
- canonical planning merge GitHub verification: `verified=true`

Any material replacement or supersession of this planning authority requires fresh reconciliation before implementation continues.

## Bound authority chain

This authorization is subordinate to and binds the complete canonical Spec 003 planning chain:

1. `docs/architecture/M3_BRANCH_EXERCISE_QUALIFICATION_REVIEW_2026-09-01.md`
2. `specs/003-branch-exercise-qualification/spec.md`
3. `specs/003-branch-exercise-qualification/CLARIFICATIONS.md`
4. `specs/003-branch-exercise-qualification/YAGNI_REVIEW.md`
5. `specs/003-branch-exercise-qualification/plan.md`
6. `specs/003-branch-exercise-qualification/PLAN_YAGNI_REVIEW.md`
7. `specs/003-branch-exercise-qualification/tasks.md`
8. `specs/003-branch-exercise-qualification/checklists/requirements.md`
9. `specs/003-branch-exercise-qualification/analysis.md`
10. `specs/003-branch-exercise-qualification/FINAL_PLAN_AUDIT.md`

The following canonical governance remains controlling context and overrides this ledger on conflict:

- `.specify/memory/constitution.md`
- `docs/founding/MASTER_PLAN_V1.md`
- `docs/founding/M1_GOVERNANCE_RECONCILIATION_2026-08-31.md`
- `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`
- `docs/strategy/RESEARCH_LEDGER_2026-08-26.md`
- `benchmarks/README.md`
- `benchmarks/manifest.json`

## Authorized task sequence

Implementation authority is limited to the canonical dependency order below.

### T093 — Benchmark-only LCOV branch normalization

Authorized only after this ledger is canonical.

Required implementation scope:

- `benchmarks/branch-coverage-lib.mjs`
- `benchmarks/fixtures/branch-exercise/cases.json`
- `tests/t093-branch-coverage-normalizer.contract.test.ts`

T093 must close canonically before T094 begins.

### T094 — Line-vs-branch qualification evaluator

Authorized only after T093 is `CLOSED_CANONICAL`.

Required implementation scope:

- `benchmarks/branch-exercise-qualification.mjs`
- fixture expectations required for line-vs-branch comparison
- `tests/t094-branch-exercise-qualification.contract.test.ts`

T094 must close canonically before T095 begins.

### T095 — Execute and record canonical qualification

Authorized only after T094 is `CLOSED_CANONICAL`.

Required result:

- `benchmarks/results/t095-branch-exercise-qualification.json`

The result must bind exact canonical source, fixture and evaluator digests, per-case outcomes, branch-only-gap count, fully-exercised false-gap count, unresolved handling, malformed/containment outcomes, deterministic serialization evidence, product-surface immutability assertions, and the promotion decision `GO | NO_GO`.

T095 must not overwrite historical T078 or T091 evidence and must close canonically before T096 begins.

### T096 — Final Spec 003 closeout

Authorized only after T095 is `CLOSED_CANONICAL`.

T096 may update architecture/strategy status only as required to record the final `GO | NO_GO` decision, exact evidence bindings, and Spec 003 closeout. It must close the Spec 003 implementation/evidence ledger without widening product authority.

## Hard boundaries

This authorization does **not** authorize any of the following:

- mutation of `src/` product code;
- receipt-v1 schema or receipt model changes;
- CLI or agent output changes;
- completeness or task-status semantic changes;
- exit-code changes;
- runtime dependency additions or package/lockfile mutation;
- function coverage;
- AST or control-flow graph construction;
- browser, API, or security-scanner expansion;
- agent, memory, retrieval, or RAG expansion;
- untrusted sandbox execution;
- reinterpretation of unavailable or ambiguous branch evidence as exercised or missed;
- overwrite of historical benchmark evidence;
- npm publication;
- GitHub Release creation;
- release tag creation;
- product branch-coverage integration.

Receipt v1 and existing product semantics remain unchanged throughout Spec 003 qualification.

## Decision authority

Spec 003 must honestly terminate in exactly one qualification decision:

- `GO`, or
- `NO_GO`.

A `GO` requires the canonical promotion gates defined by `spec.md` and `plan.md`, including measured branch-only evidence depth, zero false gaps in fully-exercised controls, correct unresolved handling, fail-closed malformed/containment behavior, deterministic output, exact-head six-lane CI, and product-surface immutability.

A `NO_GO` is a valid completion when measured usefulness or reliability is insufficient.

`GO` authorizes only planning of a separate future product-integration Spec Kit package. It does **not** authorize product integration.

## Execution discipline

For every authorized task T093–T096:

1. re-read live canonical `main` and the governing authority chain;
2. branch from exact canonical `main` only after the prior dependency is `CLOSED_CANONICAL`;
3. mutate only the current authorized task scope;
4. qualify the exact branch head;
5. preserve branch purity and evidence honesty;
6. reconcile every material review finding on the exact head;
7. require Project CI across Ubuntu 24.04, macOS 14, and Windows 2025 with Node 22 and Node 24 where required by the canonical task;
8. merge only through normal guarded history with the expected-head SHA;
9. verify ordered merge parents, merge tree identity, GitHub signature/verification, PR state, and canonical `main`;
10. record the task's canonical closeout;
11. begin the next task only after the prior task is `CLOSED_CANONICAL`.

No force-push, rebase, destructive history rewrite, skipped failing gate, hidden Windows failure, benchmark-result fabrication, historical overwrite, or future-task mutation is authorized.

## Effectiveness gate

This ledger is prospective authorization, not implementation evidence.

It becomes implementation authority only when all of the following are true:

- this exact file is merged into canonical `main` through a guarded normal merge;
- the authorization PR head passes the required exact-head repository CI and branch-purity review;
- all material review findings are reconciled;
- the authorization merge parents/tree/signature and resulting `main` are verified;
- the canonical file still binds planning merge `10ddc6a3fb13f0163bce483eb46ae9d1180ffea7` and planning tree `ab76a58667d680caa0b6984cb53fc69eecbc8ae0` without material alteration.

Only then may T093 branch from that exact canonical authorization merge.

`PRODUCT_BRANCH_INTEGRATION_AUTHORIZED = false`
