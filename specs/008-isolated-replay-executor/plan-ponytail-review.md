# Specification 008 — Plan Ponytail Review

## Decision

`PASS`

The amended technical plan remains bounded to the observed execution blocker and the actually available GitHub control surface.

## Reductions confirmed

- no new script or wrapper around `benchmarks/run.mjs`;
- no changes to Project CI or Self Verification;
- no manual-dispatch dependency that cannot be exercised by the connected authority;
- no matrix or configurable case/runtime/repository/command input;
- exactly two fixed task-run branch names;
- fixed two repetitions;
- no cache authority;
- no issue-writing token in the workflow;
- no scheduled, PR-triggered, main-push, or wildcard-branch replay;
- no generalized artifact schema;
- no product/release coupling.

## Remaining implementation risk

The only implementation-time uncertainty that may require return to planning is exact Yarn Classic `1.22.22` activation under Node `24.15.0` on `ubuntu-24.04`. The implementation must verify rather than assume this route. It may not silently substitute another Yarn version or broaden the workflow.

## Execution-control risk disposition

Using GitHub's `create` event means unrelated branch/tag creation may create a workflow event, but replay work is admitted only by an exact job-level branch/ref-type allowlist and an independent branch-to-case mapping step. No wildcard execution ref is authorized. This is smaller and less dynamic than parsing issue text or accepting free-form workflow inputs.

## Verdict

The one-file workflow plus two one-shot exact run refs is the simplest design currently capable of satisfying the missing execution requirement through the connected repository authority. No architecture expansion is justified.