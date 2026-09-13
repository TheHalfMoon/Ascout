# Defect Report and Regression Obligation — Wedge Slice 9

Ninth Spec 015 implementation slice under P015-03 authorization
(effective after PR #331 merge `1299346`, Issue #330 closeout; predecessors:
PR #332 merge `9145812`, PR #333 merge `e4e6fb0`, PR #334 merge `930d03e`,
PR #335 merge `fec143a`, PR #336 merge `21bf216`, PR #337 merge `c678221`,
PR #338 merge `cc2031a`, PR #339 merge `e1f102a`).

## What this slice adds

`src/quality/defect.ts`: accountable defect records plus the standing
obligations that guard them after repair:

- `DefectReport` nodes binding a defect id to its failure signature,
  the Slice 8 reproduction classification for the same test and
  source, affected obligation ids, and an accountable reporter;
- reproduction binding is enforced: evidence for another test or
  source throws, and an observed-only failure stays observed inside
  the defect instead of being upgraded;
- `recordRegressionObligation` opens exactly one standing
  `TestObligation` with defect and regression-risk provenance.
  Recording is forward-only and never marks anything covered: the new
  obligation starts open and later verification must cover it;
- deterministic JSON round-trip with strict validation, reusing the
  Slice 1 and Slice 8 validators for nested structures.

## What this slice does not do

No repair synthesis, no repair verification, no worktree execution, no
residual-risk rendering, no release decision, no benchmark corpus, no
donor code, no dependency change, no CLI surface change.

## Evidence

`tests/quality-defect.contract.test.ts` proves defect binding,
cross-evidence rejection, forward-only single regression recording
with defect provenance and open status, observed-honesty preservation,
and deterministic JSON round-trip integrity.
