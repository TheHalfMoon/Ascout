# Candidate Admission Decision — Wedge Slice 7

Seventh Spec 015 implementation slice under P015-03 authorization
(effective after PR #331 merge `1299346`, Issue #330 closeout; predecessors:
PR #332 merge `9145812`, PR #333 merge `e4e6fb0`, PR #334 merge `930d03e`,
PR #335 merge `fec143a`, PR #336 merge `21bf216`, PR #337 merge `c678221`).

## What this slice adds

`src/quality/admission.ts`: one explicit promotion decision composing
the earlier gates for a single proposal:

- `admitted` only when the proposal is still proposed, a
  deterministic-pass stability report binds to the same candidate and
  source tree, a proven discrimination report binds to the same
  candidate and source tree, and a human records admission with an
  accountable identity and reason;
- `held` otherwise, enumerating every failed gate in fixed order
  (`proposal-rejected`, `stability-not-deterministic-pass`,
  `discrimination-unproven`, `human-admission-missing`);
- conflicting positive evidence identities throw instead of deciding;
  malformed human admissions throw; absent evidence holds rather than
  throwing;
- deterministic JSON round-trip with strict validation, matching the
  Slice 1 serialization discipline.

There is no merge capability here by design: admission records a
decision and never moves code, so automatic promotion without explicit
human admission is unrepresentable.

## What this slice does not do

No worktree execution, no evidence collection, no failure
reproduction, no defect reporting, no regression recording, no
residual-risk rendering, no benchmark corpus, no donor code, no
dependency change, no CLI surface change.

## Evidence

`tests/quality-admission.contract.test.ts` proves full-gate admission,
rejected-proposal hold, stability and discrimination holds, missing and
malformed human admission handling, cross-evidence contamination
rejection, fixed-order multi-gate enumeration, and deterministic JSON
round-trip integrity.
