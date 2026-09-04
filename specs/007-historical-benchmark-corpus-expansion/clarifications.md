# Spec 007 Clarifications

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

## Q1 — Is Spec 007 a selector repair?

No.

A new case may produce `hit`, `miss`, or `unavailable`. All are valid measurement outcomes. Spec 007 cannot modify product/selector behavior to improve the result.

## Q2 — Why exactly two cases?

Two cases add two previously absent upstream repositories and two distinct test environments while keeping execution/review cost bounded. More cases are not justified before these two demonstrate replay value. Fewer than two would not establish cross-repository expansion beyond a single anecdote.

The authorized planning cohort is fixed to Jotai and Immer. Additional candidates require a future planning amendment.

## Q3 — Does raising `maximum_cases` from 6 to 8 reinterpret the founding benchmark?

No.

The founding 5–6 contract remains historical truth for the founding publication. Spec 007 creates an additive successor revision. Historical result files and their manifest/result bindings remain immutable.

## Q4 — What happens if a candidate cannot replay under the current harness?

Fail closed.

A candidate does not become `BENCHMARK_ACTIVE` merely because its metadata is attractive. If isolated execution proves incompatible, non-hermetic, ambiguous, or dependent on substantial new infrastructure, record rejection and return to planning. Do not build a generic adapter framework under Spec 007.

## Q5 — May benchmark-only scripts change?

Only if exact replay evidence proves an existing benchmark-only compatibility defect that blocks an otherwise-qualified candidate and the change is separately bounded by implementation authorization.

The default plan is reuse without modification. No speculative harness refactor is authorized.

## Q6 — How is regression-test leakage prevented?

The existing benchmark reconstruction model remains authoritative: the subject source state must contain the production fix while withholding the regression-test delta used as oracle truth. Exact Git identities and reconstructed tree/digest evidence must prove this before membership results are accepted.

## Q7 — Are networked tests allowed if they are reliable today?

No for measured oracle membership in this spec.

Spec 007 treats live network/service dependence as an admission failure. The rejected ofetch candidate demonstrates this boundary.

## Q8 — What runtime should the two candidates use?

Runtime must be pinned during implementation from exact candidate constraints plus current benchmark-runner support. Planning does not fabricate an executable runtime result.

For Immer, implementation must specifically prove that the pinned runtime provides the Iterator behavior required by the selected regression oracle. If not, Immer is rejected or planning is amended; no polyfill may be silently introduced solely to make the oracle pass.

## Q9 — Does `unavailable` count as failure?

No. It is a factual availability outcome.

Metrics must separately disclose available and unavailable observations. Spec 007 adds no recall threshold and no policy that treats unavailable as hit or miss.

## Q10 — Can the first expanded run overwrite T078 or T091?

No.

The expanded result must use a new filename/task identity. T078, T091, and T095 are explicitly immutable.

## Q11 — Does the first expanded result authorize selector shadow mode?

No.

Selector shadow remains the next roadmap candidate and requires its own planning and implementation authority. Spec 007 closeout may provide evidence for that planning only.

## Q12 — What constitutes completion?

Completion is not a better score. Completion is:

- two exact cases either honestly activated after repeated replay or explicitly rejected under the frozen rules;
- no weakened trust rule;
- historical publications unchanged;
- additive result published if the cohort qualifies;
- all outcomes and availability disclosed;
- existing integrity gates preserved;
- canonical closeout with no unauthorized product mutation.
