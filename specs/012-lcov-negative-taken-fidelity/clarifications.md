# Specification 012 Clarifications — LCOV Negative Branch-Taken Fidelity

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## C1 — Why unknown instead of zero?

A negative taken count is a tool-reporting artifact, not an observation of zero executions.
Mapping it to `0` (`BRANCH_NOT_EXERCISED`) would manufacture a claim the tool never made.
Mapping it to `null` (`BRANCH_UNRESOLVED` with reason) preserves evidence honesty, exactly
as the existing `"-"` token is handled.

## C2 — Why not clamp or take the absolute value?

Clamping (`max(0, n)`) and absolute value both invent execution facts. Unknown is the only
representation that neither fails the evidence closed nor fabricates a count.

## C3 — Does this weaken fail-closed behavior?

No. The fail-closed boundary moves only for the narrow signed-negative shape, which
measured tool output proves is a real unknown. Every other malformed shape keeps its
current unresolved reason, and genuinely corrupt evidence still invalidates the set.

## C4 — What about negative `DA` line counts?

Unchanged and still invalid. No measured tool output produces negative line execution
counts, and planning must not generalize beyond measured evidence.

## C5 — What about `+4` or `1.5` taken counts?

Still invalid (`REASON_INVALID_TAKEN`). Only ASCII-minus-prefixed unsigned decimals join
`"-"` as unknown. The allowlist is exact, not a numeric parser.

## C6 — Does the aggregation order matter?

No. Unknown poisons the aggregate regardless of whether the unknown occurrence comes
first or last, per the existing rule. Numeric repeats aggregate identically to before.

## C7 — Does this change any receipt exit?

Only by unblocking: evidence sets that previously stopped at `vitest_evidence_invalid` /
`jest_evidence_invalid` (exit 2) now reach the existing downstream machinery and receive
whatever exit that machinery derives (pass/fail/incomplete per existing rules). No exit
precedence rule changes.

## C8 — Does this repair T120?

It unblocks T120 qualification: with valid branch evidence, the T120 staged-run scenario
reaches the existing downstream derivation instead of exit 2. T120 itself is unchanged;
after this repair merges, T120 requalifies on a new exact head per the CI rule.

## C9 — What stops implementation?

Planning merge alone does not authorize T122. A separate implementation authorization must
bind the exact canonical planning merge and exact file/task boundaries.

## C10 — What if the fix reveals a further evidence defect?

Stop and return to planning. Do not widen the unknown set, touch line coverage, or adjust
downstream machinery inside the repair task. Any broader change needs a separately
reviewed planning amendment.
