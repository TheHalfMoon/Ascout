# Spec 010 Plan Ponytail Review

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Purpose

Review the technical plan after clarification and remove any architecture not required to measure selector misses safely.

## Retained reductions

### P1 — Keep the comparator repository-internal

`benchmarks/selector-shadow.mjs` remains an internal qualification harness. No public CLI, config, plugin, package export, or Receipt v1 field.

### P2 — Reuse Spec 006 identity instead of rebuilding it

Consume the exact receipt/envelope produced immediately before selector-shadow execution and re-check receipt SHA-256 plus current M/HT state. Do not create a second source-state or tree-digest implementation.

### P3 — Freeze one current command

Require root `scripts.test == "vitest run"` and the existing local Vitest installation. A changed contract is unavailable evidence, not permission to generalize command discovery.

### P4 — One reference execution only

One bounded full-suite invocation, no retries, no adaptive loop, no historical replay, no alternate runner.

### P5 — Exact test identity only

Use exact `(repository-relative path, fullName/rule_or_test_id)` equality. No fuzzy mapping, alias table, message matching, fingerprints, or source-location inference.

### P6 — Keep unavailable distinct from no miss

Any source, task, command, runtime, report, or identity incomparability produces `UNAVAILABLE`. It must never serialize as a selector pass.

### P7 — Keep selector misses non-gating

A trustworthy miss is successful measurement. It does not alter receipt exit, workflow merge authority, selector policy, or branch protection.

### P8 — Reuse existing upload action and retention

No new action or permission. Add exactly one bounded path to the current Spec 006 artifact upload after implementation-time revalidation.

## Rejected plan expansions

- generic runner adapters;
- Project CI API correlation;
- background/trend aggregation;
- database/service/dashboard;
- selector repair or automatic widening;
- new dependency/action/workflow;
- untrusted/fork execution;
- stdout/stderr persistence;
- recall threshold or speedup claim;
- Spec 007 reopening;
- test retries or flake reclassification.

## Final planned surfaces

```text
T117:
  benchmarks/selector-shadow.mjs
  tests/t117-selector-shadow.contract.test.ts

T118:
  .github/workflows/self-verify.yml

T119:
  ledger/governance only by default
```

`PLAN_PONYTAIL = PASS`

`IMPLEMENTATION_AUTHORITY = NO`
