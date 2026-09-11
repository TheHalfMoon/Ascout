# Spec 012 Ponytail / YAGNI Review — Specification Reduction

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Proposed and rejected

1. **Generic numeric taken parser (accept `+4`, `1.5`, hex, whitespace).**
   Rejected. No measured tool output needs it. The exact two-shape unknown set
   (`"-"`, `^-\d+$`) is the smallest rule covering the measured record.

2. **Negative `DA` line-count tolerance.**
   Rejected. Unmeasured generalization. Line coverage is explicitly untouched.

3. **New receipt field marking repaired records.**
   Rejected. The existing `LcovBranchPoint` unknown shape already carries taken `null`
   plus reason. No new persisted surface is required.

4. **Config knob for strict vs lenient branch parsing.**
   Rejected. Configuration surface expansion for a single deterministic rule. One frozen
   behavior, no options.

5. **Clamping negatives to zero.**
   Rejected. Fabricates an exercised/not-exercised fact. Unknown preserves honesty.

6. **Retrying or re-running coverage on invalid evidence.**
   Rejected. Execution expansion. The rule is a pure function over already-collected text.

## Retained

- One narrow recognition rule for signed-negative taken tokens, mapped to the existing
  unknown representation.
- Unchanged malformed boundary, aggregation, line coverage, downstream machinery, and
  persisted surfaces.

```text
PONYTAIL_SPEC_REDUCTION = PASS
SPEC_SURFACE_FROZEN = YES
```
