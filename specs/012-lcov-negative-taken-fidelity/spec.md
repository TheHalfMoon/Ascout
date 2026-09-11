# Specification 012 — LCOV Negative Branch-Taken Fidelity

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #282
**Canonical base:** `f1d8df1c67cb6ac607a7b89346af36ffb55684ad`
**Milestone:** M1.2 — Evidence fidelity hardening (bounded)

## Problem

`normalizeLcovBranchCoverage` treats every branch-taken token that is neither exact `"-"`
nor an unsigned decimal as evidence-invalid. Vitest/v8 branch coverage deterministically
emits negative taken counts (observed: `BRDA:1628,166,1,-4` for a compound short-circuit
condition). One such record invalidates the entire machine-result plus LCOV evidence set:
the test task becomes `ERROR(vitest_evidence_invalid)` (or the Jest symmetrically), the
receipt becomes `unknown_due_to_error`, and the run exits 2. A single unknown branch
observation thereby destroys all other valid evidence.

## Trust scope

Spec 012 inherits all existing trust boundaries: trusted local repository only, no implicit
dependency installation, no changed-command-surface auto-admission, source-bound truth,
exact path integrity, privacy-safe evidence, deterministic evidence, no required
cloud/model/account/network acquisition, and no-green-by-omission.

## Identity model

For one LCOV `BRDA` record with fields `(line, block_id, branch_id, taken)`:

- `taken` is *known* when it is an unsigned decimal (`0`, `7`);
- `taken` is *unknown* when the tool explicitly reports unknown (`-`) or a signed negative
  integer (`-4`);
- the record is *malformed* for every other shape (wrong field count, empty ids, bad line,
  non-numeric tokens such as `1.5`, `NaN`, `+4`, `0x10`, whitespace-padded counts).

Spec 012 changes only the middle category: signed negative integers join exact `"-"` as
unknown instead of invalidating the evidence set.

## Acceptance stories

### 1. Negative taken no longer destroys valid evidence

For LCOV input identical to the measured T120 staged-run evidence except for the fix, branch
normalization must resolve with one `BRANCH_UNRESOLVED` observation (taken `null`, reason
`LCOV branch taken count is unknown`) at the negative record identity, while every other
line and branch observation is unchanged.

### 2. Malformed records still fail closed

Wrong field counts, empty block/branch ids, non-positive line numbers, non-numeric taken
tokens other than signed negatives, unmappable source paths, incomplete records, and
records without line data keep their current unresolved reasons. No malformed shape becomes
resolved or unknown-by-repair.

### 3. Aggregation preserves unknown poisoning

A repeated branch identity where any occurrence is unknown (negative or `-`) remains
unresolved, per the existing `addBranchObservation` rule that unknown poisons the
aggregate. Numeric-only repeats still aggregate by summation with the existing
safe-integer guard.

### 4. No downstream behavior change except unblocking valid evidence

Line normalization, machine-result validation, planner gating, scope/config/runtime checks,
changed-surface admission, receipt model/validator, exit-code precedence, selection
accounting, exercise reporting, redaction, and run control are unchanged. The fix only
allows evidence sets containing negative taken counts to reach the existing downstream
machinery instead of stopping at `vitest_evidence_invalid` / `jest_evidence_invalid`.

## Functional Requirements

### FR-012-001 — Negative-taken recognition

In `normalizeLcovBranchCoverage`, accept a taken token as unknown when it is exact `"-"`
or matches `^-\d+$` (ASCII minus followed by one or more ASCII digits). Map it to taken
`null` exactly as `"-"` is mapped today.

### FR-012-002 — Malformed boundary preserved

Every taken token outside `{exact "-", ^-\d+$, ^\d+$}` (including `+4`, `1.5`, `NaN`,
`Infinity`, `0x10`, empty, whitespace-padded, or embedded-sign shapes) keeps returning
`REASON_INVALID_TAKEN`. All other existing reasons (`REASON_MALFORMED_BRANCH`,
`REASON_SOURCE_UNMAPPABLE`, `REASON_INCOMPLETE_RECORD`, `REASON_NO_BRANCH_DATA`,
`REASON_MALFORMED_SOURCE`) are unchanged.

### FR-012-003 — Aggregation unchanged

`addBranchObservation` is unchanged: unknown (including negative-sourced) poisons a
repeated identity to unresolved; numeric-only repeats aggregate with the existing guard.

### FR-012-004 — Line coverage untouched

`normalizeLcovLineCoverage` is unchanged, including its unsigned-decimal execution-count
rule. A negative `DA` execution count remains invalid.

### FR-012-005 — No new persisted surface

No new receipt field, evidence kind, artifact kind, config knob, or command flag. The
negative observation surfaces through the existing `LcovBranchPoint` shape with taken
`null`, state `BRANCH_UNRESOLVED`, and reason `LCOV branch taken count is unknown`.

### FR-012-006 — Determinism and purity

The changed rule is synchronous, total, and deterministic over its string inputs, with no
I/O, process launch, network, clock, randomness, or environment read. Identical LCOV text
always produces identical normalization outcomes.

### FR-012-007 — Privacy and path integrity

Path handling is unchanged. No new path, string, secret, environment, or identity
material is persisted.

### FR-012-008 — No product-core expansion

No change to discovery, planners, selectors, widening, reruns, receipts, validators,
exit-code precedence, CLI surface, package metadata, dependencies, workflows, benchmark
results, Spec 007 disposition, or release/publication state.

## Constitution compliance

- Evidence before claims: the repair is proven by focused contracts plus the previously
  failing staged-run evidence becoming valid, not by assertion.
- No green by omission: unknown branch observations stay `BRANCH_UNRESOLVED` with a
  reason; they are never presented as exercised.
- Source-bound truth, trusted-local scope, explicit authority, path integrity, privacy,
  determinism, and bounded execution are preserved per the requirements above.
