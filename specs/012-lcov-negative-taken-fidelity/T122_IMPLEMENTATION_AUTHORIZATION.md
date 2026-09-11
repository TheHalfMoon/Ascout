# Specification 012 — T122 Implementation Authorization

## Status

`SPEC_012_T122_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE`

`T122_IMPLEMENTATION_AUTHORIZED = NO`

This artifact is the repository successor-authorization candidate for Issue #284. It grants no T122 implementation authority until it is independently qualified, guarded-merged, post-merge verified, and Issue #284 closes `CLOSED_CANONICAL / EFFECTIVE`.

## Canonical predecessor

Spec 012 planning is durably closed canonical:

- planning ledger: Issue #282, closed `completed` with `SPEC_012_PLANNING = CLOSED_CANONICAL / GO`;
- planning PR: #283, merged/closed;
- planning merge: `02aa251338ea87946701b8b4e9abcf818f6c3195`;
- ordered merge parents: `f1d8df1c67cb6ac607a7b89346af36ffb55684ad` + `178cfdf604c6f16ecc4751b840189dc4a4e4b4d1`;
- merge tree = reviewed-head tree `94b5c8b99f0a9bf3bf6e3e22286b1a0d83776579`;
- this authorization base: `02aa251338ea87946701b8b4e9abcf818f6c3195`.

The authoritative T122 contract remains the canonically merged Spec 012 `spec.md`, `plan.md`, `tasks.md`, and supporting planning artifacts.

## Authority activation boundary

Until this artifact is independently qualified, guarded-merged, post-merge verified, becomes canonical, and Issue #284 closes `SPEC_012_T122_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`:

- T122 repository mutation is forbidden;
- T123 remains blocked;
- no other repository surface follows from this candidate.

After this artifact is independently qualified, guarded-merged, post-merge verified, becomes canonical, and Issue #284 closes `SPEC_012_T122_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`, only the bounded T122 authority below becomes effective.

## T122 authorized tracked surface

Exactly two tracked repository paths are authorized for T122 (amended to four paths
by Amendment 01, Issue #286; the amended surface below is effective once this
amendment chain closes `CLOSED_CANONICAL / EFFECTIVE`):

- `src/coverage/lcov.ts`;
- `tests/t122-lcov-negative-taken.contract.test.ts` (new);
- `tests/fixtures/lcov/branch-cases.json` (reconcile the superseded `-1` expectation only);
- `tests/t101-lcov-branch-parser.contract.test.ts` (remove `-1` from the invalid set and pin negative-unknown; all other invalid shapes stay).

No fifth path — including line-coverage behavior beyond the pinned negative-`DA` case, downstream planner/receipt/validator/exit/CLI behavior, `benchmarks/**`, workflows, schemas, discovery/planners/selectors, config surface, package metadata, lockfiles, benchmark results, Spec 007, or release/tag/publication material — is authorized as T122 implementation surface.

## Frozen behavior delta

T122 may make only the bounded normalization change required by canonical Spec 012:

1. accept exact `"-"` and `^-\d+$` branch-taken tokens as unknown (`null`) in
   `normalizeLcovBranchCoverage` only;
2. keep `REASON_INVALID_TAKEN` for every other non-unsigned taken shape;
3. keep all other branch reasons, `addBranchObservation`, line normalization, reason
   constants, and helper signatures unchanged;
4. surface negative observations through the existing unknown shape (taken `null`,
   `BRANCH_UNRESOLVED`, reason `LCOV branch taken count is unknown`);
5. cover the plan.md section 4 taxonomy in the new focused contract file.

## Hard prohibitions

No line-coverage change, no downstream change, no unknown-set widening, no zero-mapping,
no clamping, no absolute-value repair, no retry/re-run logic, no config knob, no new
persisted field, no T120/T121 absorption. On any material mismatch:
`NO_GO / RETURN_TO_PLANNING`.

## Qualification gate

Before T122 may merge, the T122 branch must prove on its exact head:

- reverified canonical base;
- branch purity (exactly the two authorized paths);
- focused contract tests pass;
- full `npm test`, `npm run typecheck`, `npm run build` pass as applicable;
- exact-head Self Verification success;
- original-attempt six-lane Project CI success;
- fresh independent substantive exact-head review with no material unresolved findings and zero unresolved material threads;
- live rulesets/protection revalidation;
- unchanged base immediately before guarded expected-head normal merge;
- post-merge ordered-parent/tree/signature/PR/main proof with merge tree equal to the reviewed-head tree.

```text
SPEC_012_T122_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
T122_IMPLEMENTATION_AUTHORIZED = NO
T123 = BLOCKED_BY_T122
```
