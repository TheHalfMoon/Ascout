# Residual Risk and Release Decision — Wedge Slice 10

Tenth Spec 015 implementation slice under P015-03 authorization
(effective after PR #331 merge `1299346`, Issue #330 closeout; predecessors:
PR #332 merge `9145812`, PR #333 merge `e4e6fb0`, PR #334 merge `930d03e`,
PR #335 merge `fec143a`, PR #336 merge `21bf216`, PR #337 merge `c678221`,
PR #338 merge `cc2031a`, PR #339 merge `e1f102a`, PR #340 merge `506bd09`).

## What this slice adds

`src/quality/residual.ts`: enumeration-only residual-risk rendering
and release decisions for one exact source tree:

- `renderResidualRisk` composes wedge evidence — unresolved
  conflicts, unit-test gaps by category, non-deterministic or
  unavailable stability, missing discrimination, held admission
  decisions, and unexplained defects — into explicit residual items
  in fixed deterministic order. Records bound to another source tree
  throw instead of leaking across trees;
- any residual item blocks release. There is no numeric score
  anywhere, so no score can override a deterministic failure;
- `decideRelease` enumerates `blocked` with the blocking item ids in
  report order, or `ready` when nothing remains. There is no override
  and no acknowledgment path past a block;
- deterministic JSON round-trip with strict validation for both the
  residual report and the release enumeration.

## What this slice does not do

No evidence collection, no re-evaluation of gates, no scoring model,
no release publication, no benchmark corpus, no donor code, no
dependency change, no CLI surface change.

## Evidence

`tests/quality-residual.contract.test.ts` proves the ready path, gap
enumeration by category, flaky and missing-discrimination surfacing,
held-candidate and unexplained-failure surfacing, cross-tree
rejection, and deterministic JSON round-trip integrity.
