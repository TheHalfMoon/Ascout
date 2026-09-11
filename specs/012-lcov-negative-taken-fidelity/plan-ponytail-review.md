# Spec 012 Ponytail / YAGNI Review — Plan Reduction

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Proposed and rejected

1. **End-to-end staged-run regression test inside T122.**
   Rejected. A full harness-scenario test belongs to qualification evidence (exact-head
   Self Verification on the T122 head exercises the real pipeline), not to the focused
   contract file. The contract file stays pure unit-level over LCOV strings.

2. **Refactoring the normalizer (shared token parser, table-driven reasons).**
   Rejected. Refactor churn around a one-rule change. Minimal local predicate only.

3. **Extending the contract file to line-coverage property tests.**
   Rejected. Line coverage is explicitly unchanged; pinning one negative-`DA` case is
   sufficient.

4. **Adding a benchmark corpus entry for negative taken counts.**
   Rejected. Benchmark-result mutation is prohibited in this chain. Focused contracts
   plus Self Verification are the proof.

5. **Pre-emptive handling of other v8 artifacts (e.g., negative `DA`, huge counts).**
   Rejected. Unmeasured speculation. Only the measured `BRDA` negative shape is covered.

## Retained

- Two-path T122 surface, unit-level contract file, standard qualification gates.

```text
PONYTAIL_PLAN_REDUCTION = PASS
PLAN_SURFACE_FROZEN = YES
```
