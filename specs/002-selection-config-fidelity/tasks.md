# Tasks: Selection Configuration Fidelity

**Spec:** 002  
**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED  
**Canonical order:** T089 → T090 → T091 → T092

## T089 — Nested runner-config fidelity

Implement the smallest single-package nested-config fallback and its contract coverage.

Required scope:

- `src/discovery.ts`
- `src/tools/jest.ts`
- `src/tools/vitest.ts`
- focused discovery/Jest/Vitest contract tests

Acceptance:

- root-level Jest/Vitest behavior unchanged;
- exactly one nested recognized config is available only as single-package fallback when no root config resolves;
- multiple nested configs fail closed;
- basic-workspace behavior remains root-only;
- selected nested config is passed through existing `--config` argv;
- no shell parser/package-script execution/new dependency/receipt change;
- exact-head six-lane Project CI and review reconciliation before merge.

## T090 — Command authority and admission proof

Prove the selected nested config participates in the existing command-surface authority contract and repair only if the proof exposes a gap.

Required scope:

- command-surface contract tests;
- ordinary-vs-admitted check integration coverage;
- product mutation only if existing propagation is incomplete.

Acceptance:

- unchanged selected nested config allows normal planning;
- changed selected nested config causes `NOT_RUN(command_surface_changed)` before runner launch;
- receipt records the authority path and admission truth under existing schema;
- explicit per-invocation admission permits execution only for that invocation;
- the next ordinary invocation refuses again;
- irrelevant nested config is not promoted to authority when an existing root config is effective;
- exact-head six-lane Project CI and review reconciliation before merge.

## T091 — Benchmark replay and M2 evidence

Replay the frozen founding selection benchmark against the canonical T090 state and publish new M2 evidence without overwriting historical T078 publication.

Required evidence:

1. focused `react-hook-form-value-as-date@2` replay during qualification;
2. full current selection-case set replay before closeout;
3. Ascout comparator executes the frozen React Hook Form oracle test;
4. T077 absolute assertions remain zero;
5. unavailable outcomes remain unavailable;
6. no new hidden selector miss or false-PASS;
7. exact candidate/run/artifact/digest bindings are recorded in a new M2 result under `benchmarks/results/`.

If benchmark replay reveals a genuine Spec 002 defect, repair forward-only within T091 only when the fix remains inside the authorized single-package config-fidelity scope. Any need for a parser, dependency graph, workspace ownership, or new runtime dependency returns to planning.

Exact-head qualification/review is required before merge.

## T092 — Final M2 release-hardening closeout

From canonical T091 `main`:

- run full Project CI Ubuntu/macOS/Windows × Node 22/24;
- run focused Spec 002 contracts and benchmark-result validation;
- verify no historical benchmark evidence was overwritten;
- verify package identity/dependency/receipt schema unchanged;
- update README/Master Plan status only as required to state the implemented M2 capability and its limits;
- record exact post-merge M2 closeout evidence;
- do not publish npm, create a GitHub Release, or create a release tag.

M2 is `CLOSED_CANONICAL` only after guarded merge and post-merge parent/tree/signature/main verification.

## Execution discipline

For every task:

1. re-read canonical `main`, Constitution, Master Plan v1, Spec 002 authority chain, benchmark policy/result, current PR/review/Actions state;
2. branch from exact canonical `main`;
3. mutate only the current task;
4. qualify exact head;
5. reconcile review/findings on exact head;
6. guarded merge with expected head SHA;
7. verify ordered merge parents/tree/signature/main;
8. record task closeout;
9. re-read canonical truth before beginning the next task.

No force-push, rebase, destructive history rewrite, skipped failing gate, hidden Windows failure, publication, release, or future-task mutation before prior canonical closeout.

## Stop conditions

Return to planning if any task requires:

- arbitrary package-script parsing or execution;
- a second product runtime dependency;
- basic-workspace nested-config ownership;
- a dependency/import graph;
- receipt schema/version changes;
- new status/exit semantics;
- persistent admission/trust;
- untrusted repository execution.

## Authorization gate

T089 must not begin until the planning chain is canonically merged and a durable implementation-authorization record explicitly binds that canonical planning commit and T089–T092.
