# Discrimination Proof — Wedge Slice 6

Sixth Spec 015 implementation slice under P015-03 authorization
(effective after PR #331 merge `1299346`, Issue #330 closeout; predecessors:
PR #332 merge `9145812`, PR #333 merge `e4e6fb0`, PR #334 merge `930d03e`,
PR #335 merge `fec143a`, PR #336 merge `21bf216`).

## What this slice adds

`src/quality/discrimination.ts`: deterministic evaluation of candidate
usefulness evidence for one exact candidate on one exact source tree:

- seven canonical evidence kinds: `mutant-killed`,
  `controlled-revert-detected`, `known-defect-detected`,
  `withheld-detected`, `property-violated`, `differential-mismatch`,
  and `independent-oracle`;
- `proven`: at least one clean positive pair (same kind and target
  detected with no miss on that pair);
- `unproven`: evidence exists but no clean positive pair;
- `not-run`: zero evidence — never proven;
- contradicted pairs (same kind and target both detected and missed)
  poison that pair instead of counting as proof; counts stay visible;
- mixed candidate or source identities, unknown kinds, and malformed
  records fail closed;
- deterministic JSON round-trip with strict validation, matching the
  Slice 1 serialization discipline.

A merely passing candidate without positive detection stays a
proposal. Stability of the candidate itself remains the Slice 3 gate;
usefulness is this gate. Admission composes both in a later slice.

## What this slice does not do

No mutant generation, no revert/property/differential execution, no
worktree execution, no admission decision, no auto-merge, no benchmark
corpus, no donor code, no dependency change, no CLI surface change.
Evidence collection stays caller-supplied input bound to isolated
execution in later slices.

## Evidence

`tests/quality-discrimination.contract.test.ts` proves each verdict,
all seven canonical kinds, pair-contradiction poisoning, cross-identity
rejection, malformed-input failure, and deterministic JSON round-trip
integrity.
