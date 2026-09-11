# Specification 012 Gap Evidence — LCOV Negative Branch-Taken Fidelity

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #282
**Canonical base:** `f1d8df1c67cb6ac607a7b89346af36ffb55684ad`

## Measured signal

T120 self-verify (run `34539521811`, exact head `e78eae713088d813d902c9ea6f44dc2231cca950`) fails in
`Capture exact-head self-verification` with:

```text
self-verify: exit_2_integrity_failure
```

## Proven mechanism

A faithful staged-diff reproduction of the harness subject (HEAD = merge base `f1d8df1`,
index/tree = head `e78eae7`, exact lockfile install, exact-head build, `check --format json`)
produces receipt exit `2` with `completeness: unknown_due_to_error`:

- `typecheck`: `PASS`;
- `test`: `ERROR(vitest_evidence_invalid)` —
  `Vitest did not produce bounded, parseable machine-result and LCOV evidence inside the current Ascout run.`

Evidence-step isolation against the produced run artifacts shows:

- machine-result JSON: parses, `testResults` array present;
- `normalizeLcovLineCoverage`: `resolved`;
- `normalizeLcovBranchCoverage`: `unresolved` with reason `LCOV branch taken count is invalid`.

## Offending record

The produced `lcov.info` contains:

```text
BRDA:1628,166,1,-4
```

emitted by vitest/v8 branch coverage for the compound short-circuit condition at
`src/check.ts` lines 1628-1633. The taken count is negative (`-4`).

`normalizeLcovBranchCoverage` (`src/coverage/lcov.ts` line 332) accepts only exact `"-"`
(unknown) or `^\d+$` (nonnegative). Any other shape, including a signed negative integer,
returns `REASON_INVALID_TAKEN`, which invalidates the entire evidence set for the task.

## Properties

- The record is deterministic vitest/v8 tool output for fixed source, not a transient failure.
- The defect is platform-independent (no path handling is involved in the taken-count rule).
- The defect is pre-existing: it was unreachable on Ascout itself only because discovery
  reported `ambiguous(js_test_runner_ambiguous)` and never executed the runner.
  T120 makes it reachable by resolving the runner from the explicit root test script.
- The defect is reachable for any repository whose tool-produced LCOV contains a negative
  taken count: one record destroys the whole evidence set.

## Planning input, not implementation authority

This evidence justifies planning a bounded repair. It does not authorize implementation.
The repair direction (negative taken maps to unknown, consistent with existing `-`
handling; malformed records stay fail-closed) must be proven through the full planning
sequence before any implementation mutation.
