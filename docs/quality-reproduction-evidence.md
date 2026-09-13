# Failure Reproduction Evidence — Wedge Slice 8

Eighth Spec 015 implementation slice under P015-03 authorization
(effective after PR #331 merge `1299346`, Issue #330 closeout; predecessors:
PR #332 merge `9145812`, PR #333 merge `e4e6fb0`, PR #334 merge `930d03e`,
PR #335 merge `fec143a`, PR #336 merge `21bf216`, PR #337 merge `c678221`,
PR #338 merge `cc2031a`).

## What this slice adds

`src/quality/reproduction.ts`: deterministic classification of failure
reproduction and minimization for one failure signature:

- `unresolved`: classless capture with no bounded rerun evidence;
- `observed`: classified capture with no bounded repeat proof — never
  presented as reproduced;
- `reproduced`: bounded repeated equivalent failures on the same test
  and source tree (the Slice 3 deterministic-fail gate);
- `minimized`: reproduced plus a strictly smaller reproducer that still
  fails with the signature preserved; the smallest size ratio is kept;
- reproducers that stop failing or lose the signature count for
  nothing but stay out of the reproducer list; non-shrinking valid
  claims keep `reproduced` without claiming minimization;
- cross-tree minimization claims and mismatched stability bindings
  throw; malformed signatures and claims throw;
- deterministic JSON round-trip with strict validation, matching the
  Slice 1 serialization discipline.

Failure-class equivalence across the signature-to-rerun boundary is
caller-attested and documented in the module: reproduction trusts a
deterministic-fail on the same test and source, whose own gate already
required a uniform failure class within the reruns.

## What this slice does not do

No failure capture execution, no worktree execution, no automated
minimizer, no fault localization, no root-cause proof, no defect
reporting, no benchmark corpus, no donor code, no dependency change,
no CLI surface change.

## Evidence

`tests/quality-reproduction.contract.test.ts` proves each status, the
observed-never-reproduced rule, strict-shrinking minimization, ignored
non-reproducers, cross-tree rejection, malformed-input failure, and
deterministic JSON round-trip integrity.
