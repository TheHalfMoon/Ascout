# Stability Gate Evaluation — Wedge Slice 3

Third Spec 015 implementation slice under P015-03 authorization
(effective after PR #331 merge `1299346`, Issue #330 closeout; predecessors:
PR #332 merge `9145812`, PR #333 merge `e4e6fb0`).

## What this slice adds

`src/quality/stability.ts`: deterministic bounded-rerun stability
classification for one exact candidate on one exact source tree:

- `deterministic-pass`: repeated PASS under the same relevant environment
  once the required bounded evidence is present;
- `deterministic-fail`: repeated equivalent FAIL (identical failure class)
  under the same relevant environment;
- `flaky`: contradictory PASS/FAIL under one environment, or divergent
  failure classes where equivalence was required;
- `environment-sensitive`: internally consistent but diverging outcomes
  across materially different environment fingerprints — never relabeled
  as generic flaky;
- `unavailable`: attempted execution produced no valid observation;
- `not-run`: applicable work with zero observations — never PASS;
- `insufficient-evidence`: valid observations exist but fewer than the
  required bound — never upgraded to deterministic stability.

Cross-source, cross-candidate, or cross-test mixing throws instead of
producing a verdict. Gapped or unordered run indexes, unknown outcomes,
pass observations carrying a failure class, and observations beyond
`max_runs` all fail closed. Unavailable observations stay visible in the
report counts but never count as stability evidence. A failure followed
by a pass stays flaky: reruns characterize stability, they do not erase
history and never manufacture PASS by repetition.

Reports serialize deterministically (`stabilityReportToJson`) with strict
validation on parse, matching the Slice 1 serialization discipline.

## What this slice does not do

No execution, no worktree management, no candidate generation, no
discrimination proof, no benchmark corpus, no donor code, no dependency
change, no CLI surface change. Observation collection stays
caller-supplied input; later slices bind observations to isolated
worktree execution evidence.

## Evidence

`tests/quality-stability.contract.test.ts` proves each verdict above,
cross-tree rejection, unavailable and not-run handling, insufficient
evidence, malformed-input failure, deterministic JSON round-trip, and
the absence of rerun-to-green behavior.
