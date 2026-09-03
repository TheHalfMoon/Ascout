# Spec 006 Plan Ponytail / YAGNI Review

**Status:** PASS_WITH_REDUCTIONS / PLANNING_ONLY

## Review target

Technical plan for M1.2-A shadow self-verification.

## Reductions retained

### R1 — Soft reset instead of diff replay machinery

Keep `git reset --soft B` + exact tree proof. Reject patch generation/application, second clone, custom Git tree reconstruction, or PR-range parsing.

### R2 — One observational lane

Keep one Ubuntu 24.04 / Node 24 self-verification lane. Six-lane Project CI remains the cross-platform code qualification surface. Do not duplicate it.

### R3 — Two implementation tasks, one closeout task

- T107: harness + focused contracts;
- T108: workflow + live artifact qualification;
- T109: ledger-only observation reconciliation.

Do not split envelope, validation, Git reconstruction, or artifact upload into independent abstractions prematurely.

### R4 — No product core

All `src/**` mutations remain prohibited. If the harness cannot work with current CLI/receipt/validators, return to planning rather than adding a product feature under this spec.

### R5 — No generalized CI SDK

`benchmarks/self-verify.mjs` is a single-purpose repository harness. No reusable workflow framework, action package, plugin interface, or generic Git-state library.

### R6 — No second receipt format

The envelope is qualification metadata only and deliberately tiny. Do not call it a receipt, expose it through Ascout CLI, or add it to receipt schema.

### R7 — No shadow verdict aggregation

Spec 006 retains one artifact per run. No history database, trend dashboard, pass-rate computation, or policy threshold.

### R8 — No auto-admission

No command-surface bypass under any circumstance. Valid exit 4 is useful shadow evidence.

### R9 — No custom artifact transport

Use official GitHub artifact capability with exact-SHA pin and bounded retention.

### R10 — No long-lived result commit

Do not commit a generated self-verification receipt into the repository in Spec 006. The first phase measures via immutable workflow-run artifacts; later evidence-retention promotion requires data.

## Complexity risks checked

- exact Git identity: solved with native Git object/tree proof;
- verifier/subject dual identity: solved with external envelope, not receipt mutation;
- non-gating semantics: explicit separation between capture integrity and receipt verdict;
- supply chain: one official MIT action, exact commit pin;
- privacy: no raw repository or machine locator in envelope;
- workflow coupling: separate workflow leaves Project CI unchanged.

## Final verdict

`PASS`

The plan is bounded to the minimum M1.2-A observation needed before any broader benchmark or gating decision.