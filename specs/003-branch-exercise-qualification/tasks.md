# Tasks: Branch Exercise Evidence Qualification

**Spec:** 003  
**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED  
**Canonical order:** T093 → T094 → T095 → T096

## T093 — Benchmark-only LCOV branch normalization

Implement the smallest benchmark/test-only branch normalizer and deterministic fixtures.

Required scope:

- `benchmarks/branch-coverage-lib.mjs`
- `benchmarks/fixtures/branch-exercise/cases.json`
- `tests/t093-branch-coverage-normalizer.contract.test.ts`

Acceptance:

- repository-safe `SF:` mapping;
- exact `BRDA` four-field parsing;
- numeric taken / unknown `-` semantics;
- deterministic tuple identity and ordering;
- repeated numeric aggregation with safe overflow handling;
- any unknown observation for an identity remains unresolved;
- malformed/incomplete/path-unsafe input fails closed;
- no `src/`, receipt, package, dependency, historical result, publication, release, or tag change;
- exact-head six-lane Project CI and review reconciliation before merge.

## T094 — Line-vs-branch qualification evaluator

Build the benchmark-only evaluator that demonstrates or rejects branch-only evidence depth.

Required scope:

- `benchmarks/branch-exercise-qualification.mjs`
- fixture expectations needed for line-vs-branch comparison
- `tests/t094-branch-exercise-qualification.contract.test.ts`

Acceptance:

- branch-only-gap control is identified only when the declared changed line is line-exercised and at least one changed branch is not exercised;
- fully-exercised control yields no branch gap;
- unknown branch remains unresolved;
- branches outside changed ranges do not count as changed-branch gaps;
- deterministic semantic result ordering/serialization;
- no product surface change;
- exact-head six-lane Project CI and review reconciliation before merge.

## T095 — Execute and record canonical qualification

From canonical T094 `main`, execute the complete Spec 003 fixture set and record a new immutable result:

`benchmarks/results/t095-branch-exercise-qualification.json`

Required result bindings:

- exact canonical source/head;
- fixture manifest/blob digest;
- evaluator implementation/blob digest;
- per-case outcomes;
- branch-only-gap count;
- fully-exercised false-gap count;
- unresolved handling;
- malformed/containment outcomes;
- deterministic serialization proof;
- product-surface immutability assertions;
- promotion decision `GO | NO_GO`.

Historical T078/T091 publications must not be overwritten.

Exact-head focused qualification, six-lane Project CI, and review reconciliation are required before merge.

## T096 — Final Spec 003 closeout

From canonical T095 `main`:

- rerun focused Spec 003 contracts/result validation;
- run full Project CI Ubuntu/macOS/Windows × Node 22/24;
- verify `src/`, receipt-v1, package/dependency, and historical benchmark surfaces are unchanged;
- update architecture/strategy status only as required to record the final `GO | NO_GO` decision and its limits;
- guarded merge and post-merge parent/tree/signature/main verification;
- close the Spec 003 implementation/evidence ledger.

If `GO`, only future planning is eligible. Product branch evidence remains unauthorized until a separate Spec Kit chain and explicit authorization are canonically complete.

## Execution discipline

For every task:

1. re-read canonical `main`, Constitution, Master Plan, Spec 003 authority chain, benchmark policy/result, current PR/review/Actions state;
2. branch from exact canonical `main`;
3. mutate only the current task;
4. qualify exact head;
5. reconcile review/findings on exact head;
6. guarded merge with expected head SHA;
7. verify ordered merge parents/tree/signature/main;
8. record task closeout;
9. begin the next task only after the prior task is closed canonically.

No force-push, rebase, destructive history rewrite, skipped failing gate, product mutation, hidden Windows failure, historical overwrite, publication, release, or future-task mutation before prior canonical closeout.

## Authorization gate

T093 must not begin until this planning chain is canonically merged and a durable implementation-authorization record explicitly binds that planning merge and T093–T096.
