# Spec 010 Ponytail / YAGNI Review

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Purpose

Reduce the selector-shadow candidate to the smallest evidence-producing slice consistent with the Constitution, current measured gap, and Issue #261 planning authority.

## Candidate expansions reviewed and rejected

### 1. Change selector behavior while adding shadow measurement

**Rejected.** Measurement must not self-certify a repair. Spec 010 observes current behavior only. Any future selector repair requires its own measured miss and separate planning/authority.

### 2. Add a generic selector-shadow product feature or CLI flag

**Rejected.** The first bounded need is Ascout-on-Ascout CI observation. No public CLI, config, receipt field, plugin adapter, or project-generic API is justified.

### 3. Create a new GitHub Actions workflow

**Rejected.** The existing same-repository `self-verify.yml` already provides the correct trust/identity boundary. Reuse it and add one post-capture observation step plus one artifact path.

### 4. Reuse Project CI status through GitHub APIs

**Rejected.** Cross-workflow API coupling, token scope, run correlation, and status-only semantics add complexity while providing weaker source/test identity. Execute one local structured full-suite reference inside the existing trusted lane instead.

### 5. Store full stdout/stderr

**Rejected.** Selector comparison needs structured failed test identity, not raw logs. Project CI already provides diagnostics. Persist only bounded normalized observation fields.

### 6. Add a database/trend service/dashboard

**Rejected.** Per-PR bounded artifacts are sufficient to establish the first periodic measurement surface. Trend aggregation is future work only if retained observations demonstrate need.

### 7. Add a recall threshold

**Rejected.** Historical evidence explicitly forbids invented pre-data thresholds. Publish every exact miss. `NO_MISS_OBSERVED` is not a universal recall claim.

### 8. Add fuzzy test matching

**Rejected.** Exact `(repository-relative path, test id)` equality is the simplest defensible identity. Fuzzy/path-suffix/message matching would manufacture equivalence.

### 9. Compare only exit codes

**Rejected.** A nonzero full-suite exit is not sufficient proof of a failing test identity. Require valid structured Vitest JSON and failed assertion identities.

### 10. Reuse Spec 007 donor benchmark machinery

**Rejected.** Spec 007 is terminal under its current specification. Selector shadow must not reopen donor execution, consumed refs, membership workflows, or historical result publication.

### 11. Add new dependencies or actions

**Rejected.** Current repository already has Vitest. Existing `actions/upload-artifact` is already pinned and reviewed. No new dependency/action is required.

### 12. Modify `benchmarks/self-verify.mjs`

**Rejected unless later proven necessary.** A separate `benchmarks/selector-shadow.mjs` keeps Spec 006 receipt-capture logic immutable and consumes its published receipt/envelope as inputs.

### 13. Run the reference when Ascout refused command authority

**Rejected.** Shadow measurement cannot bypass the product's explicit authority boundary. Admission-refused/incomparable test tasks become unavailable observations.

### 14. Compare durations as a claimed speedup

**Rejected.** Record raw durations only. Ascout test-task duration can include instrumentation/reproduction behavior that is not semantically identical to the plain full-suite run.

### 15. Generalize beyond current root Vitest contract

**Rejected.** T117/T118 freeze current Ascout `scripts.test == "vitest run"` and current local Vitest. A changed command shape stops shadow comparison and returns to planning rather than growing an adapter layer.

## Minimal retained design

```text
validated Spec 006 receipt + envelope
  -> verify receipt digest + current M/HT subject
  -> require exactly one comparable normal-admission test task
  -> require current Ascout root test contract == "vitest run"
  -> run local Vitest full suite with native JSON reporter, bounded
  -> parse exact failed (relative path, fullName) identities
  -> extract exact Ascout failed (path, rule_or_test_id) identities
  -> exact set difference
  -> post-run source stability proof
  -> write one separate bounded SELECTOR_SHADOW_NON_GATING artifact
```

## Retained implementation surfaces

T117:

- `benchmarks/selector-shadow.mjs`
- `tests/t117-selector-shadow.contract.test.ts`

T118:

- `.github/workflows/self-verify.yml`

T119:

- ledger/governance only by default.

## Complexity verdict

`PONYTAIL_YAGNI = PASS`

No additional abstraction is justified before the bounded same-repository shadow observation is implemented and measured.

`IMPLEMENTATION_AUTHORITY = NO`