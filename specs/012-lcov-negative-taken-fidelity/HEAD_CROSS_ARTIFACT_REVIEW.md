# Specification 012 HEAD Cross-Artifact Review

**Status:** `FOUNDER_SIDE_READY_FOR_FRESH_EXTERNAL_EXACT_HEAD_REVIEW`

## Scope reviewed

All eleven planning artifacts under `specs/012-lcov-negative-taken-fidelity/` committed
before this file. This file is the final planning-content mutation before fresh
exact-head qualification. Any later repository-content mutation invalidates this review
and requires another fresh HEAD review and qualification cycle.

Immediately before this review:

- canonical `main` remained `f1d8df1c67cb6ac607a7b89346af36ffb55684ad`;
- the planning branch was `ahead 11 / behind 0` from the exact canonical base;
- the merge base was exactly the canonical base `f1d8df1c67cb6ac607a7b89346af36ffb55684ad`;
- the repository delta remained exactly eleven planning files under
  `specs/012-lcov-negative-taken-fidelity/` and no implementation path;
- repository rulesets were `[]`;
- observable `main` protection remained disabled/off.

All prior-head CI/review evidence, if any, is stale for merge qualification after content
mutations and MUST NOT be reused as exact-head qualification evidence.

## Frozen planning invariants

1. Issue #282 grants planning authority only; implementation remains unauthorized until
   a separate durable post-merge authorization exists.
2. The measured gap is exactly one signed-negative `BRDA` taken record invalidating an
   otherwise valid evidence set (exit 2).
3. The frozen rule maps exact `"-"` and `^-\d+$` to unknown; all other non-unsigned
   taken shapes stay `REASON_INVALID_TAKEN`.
4. Aggregation, line coverage, reason constants, and helper signatures are unchanged.
5. Unknown observations stay `BRANCH_UNRESOLVED` with reason; nothing is presented as
   exercised.
6. Task order is exactly `T122 -> T123`, with T123 ledger-only by default.
7. T122 candidate paths are exactly `src/coverage/lcov.ts` and
   `tests/t122-lcov-negative-taken.contract.test.ts`.
8. No benchmark, workflow, receipt/schema/validator, discovery/planner/selector, CLI,
   config, package-metadata, lockfile, benchmark-result, Spec 007, or release mutation.
9. No new dependency, action, service, database, telemetry, plugin, parser, executor,
   config knob, or persisted field.
10. No threshold, recall, causal, speedup, or merge-gate claim.
11. Historical evidence remains immutable; T120/T121 are not absorbed.
12. Each material unit requires exact-head Self Verification, original-attempt six-lane
    Project CI, fresh independent substantive review, zero unresolved material threads,
    live rules/protection revalidation, guarded expected-head normal merge, and
    post-merge proof.
13. No force-push, rebase, destructive history rewrite, consumed-attempt
    reinterpretation, or fabricated evidence.
14. The twelve new files under `specs/012-lcov-negative-taken-fidelity/` are the
    authorized planning output under Issue #282; existing canonical specs `001`
    through `011` remain unchanged as proven by the base-to-head diff.

## Founder-side findings

`PRIOR_EXTERNAL_MATERIAL_FINDINGS = 0`

`CURRENT_FOUNDER_SIDE_MATERIAL_FINDINGS = 0`

No unresolved founder-side contradiction remains among scope, task order, authority,
evidence integrity, source binding, command authority, determinism, privacy,
supply-chain, or qualification requirements.

## Required fresh external qualification

The exact branch head produced by this file must receive a completely fresh
qualification cycle. Prior-head success is historical evidence only.

Required:

- canonical-base ancestry and no unrelated path changes;
- exactly twelve planning files under `specs/012-lcov-negative-taken-fidelity/` and no
  other repository delta;
- fresh exact-head Self Verification success;
- fresh original-attempt six-lane Project CI success;
- fresh independent substantive exact-head review covering the complete current range;
- zero unresolved material review threads;
- unchanged head after final review;
- live rulesets/observable branch protection immediately before merge;
- unchanged canonical base immediately before guarded merge;
- expected-head normal merge;
- post-merge ordered parents, tree, GitHub signature, PR state, and canonical main proof.

```text
FOUNDER_SIDE_CROSS_ARTIFACT_REVIEW = PASS
PLANNING_CONTENT_FROZEN = YES
FRESH_INDEPENDENT_EXACT_HEAD_REVIEW = REQUIRED
IMPLEMENTATION_AUTHORITY = NOT_EFFECTIVE
```
