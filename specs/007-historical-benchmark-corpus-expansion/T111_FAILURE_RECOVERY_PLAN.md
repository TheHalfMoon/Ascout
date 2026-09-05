# Spec 007 T111 Failure Recovery Plan

**Status:** `PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`  
**Planning ledger:** Issue #171  
**Trigger:** T111 first-attempt run `33984116443` / job `101354420297`  
**Canonical planning base:** `a0222ba38926ca208789868dad6781252ac9d80b`

## 1. Purpose

Define the smallest prospective amendment that can resolve the exact T111 Jotai replay failure without weakening oracle membership, selector semantics, benchmark integrity, historical truth, or single-use execution binding.

This document grants no implementation or replay authority.

## 2. Exact observed failure

The canonical Spec 008 executor successfully bound and checked out exact source `a0222ba38926ca208789868dad6781252ac9d80b`, verified source tree `67bfdae1e22d2bbf6276a9d0f3bbf70edbf8593e`, installed/built Ascout, verified Node `v24.15.0` and Yarn Classic `1.22.22`, and entered unchanged `benchmarks/run.mjs` for case `jotai-splitatom-identical-write`.

The first attempt then failed while proving membership for the **runner-native related comparator**, whose policy is `observed`.

The reporter-only proof emitted:

`No test files found, exiting with code 0`

No external JSON report was produced, so the current harness failed with:

`oracle_membership: runner-native related selector membership proof did not produce an external JSON report (exit 0)`

The harness exited `2`, wrote no replay JSON, and the workflow correctly concluded `failure`.

The failed run is final evidence. It MUST NOT be rerun, and `run/spec007-t111-jotai` MUST NOT be moved, deleted/recreated, force-updated, or reused.

## 3. Why this is a compatibility gap, not product authority

Spec 007 FR-007-005 requires existing benchmark-engine reuse unless exact implementation evidence proves that a narrowly scoped benchmark-only compatibility change is necessary.

The Spec 007 YAGNI review explicitly requires implementation to stop and seek a bounded authority amendment when isolated replay proves that an existing benchmark-only script cannot represent or execute an otherwise-qualified case because of a narrow defect.

The observed failure satisfies that planning trigger. It does not authorize selector changes, donor changes, oracle changes, schema changes, or generalized benchmark infrastructure.

## 4. Semantic distinction that MUST be preserved

The current harness has three membership policies:

- `required` — membership must be structurally proven or execution fails closed;
- `observed` — membership is a factual comparator observation and may be `true` or `false`;
- `none` — membership is intentionally not measured.

The amendment MUST NOT alter `required` semantics. Pre-fix oracle, fixed oracle, and project-native full-suite membership remain structured-JSON-only and fail closed if the reviewed regression assertion cannot be proven.

The compatibility gap exists only when an `observed` runner-native selector successfully selects **zero tests** and therefore produces no structured assertion report.

## 5. Proposed bounded compatibility rule

A no-report outcome MAY become `membership=false` only for policy `observed`, and only when all of the following are true:

1. the reporter-only proof process exits normally;
2. its exit code exactly matches the already-observed comparator exit code;
3. that exit code is `0`;
4. stdout/stderr capture is bounded and non-truncated;
5. no external JSON membership report exists;
6. the output matches an exact, reviewed runner-native no-tests signature for the bound runner kind;
7. the output contains no independent setup/config/module/resolve failure signature;
8. source-state identity remains stable across both the exact comparator execution and membership-proof execution;
9. the evidence records the real process/output digests and an explicit no-tests evidence kind;
10. no synthetic JSON report or synthetic executed assertion is created.

The resulting value is factual comparator membership `false`. It is NOT oracle success, NOT `unavailable`, NOT a hit, and NOT permission to weaken any required membership gate.

## 6. Fail-closed boundaries

The fallback MUST NOT apply when any of the following holds:

- membership policy is `required` or `none`;
- process outcome is not a normal exit;
- exit code differs from the exact comparator execution;
- exit code is nonzero;
- output is truncated;
- a JSON report exists but is malformed, oversized, ambiguous, or lacks `testResults`;
- output indicates command-not-found, module-not-found, config-load failure, resolve failure, or another setup failure;
- source state drifts;
- runner kind is unsupported;
- the no-tests signature is absent or ambiguous.

Those cases retain the current fail-closed behavior.

## 7. Implementation units after separate authorization

### R007-01 — observed-membership compatibility

Prospective tracked-code surface only:

- `benchmarks/harness-lib.mjs`
- `benchmarks/run.mjs`
- `tests/benchmark-membership-proof.test.ts`

Required behavior:

- introduce a small pure helper that recognizes a trusted no-tests observation only under the explicit `observed` policy contract;
- keep structured JSON proof unchanged for all successful report-producing paths;
- keep `required` policy strict;
- return explicit evidence metadata for a valid observed no-tests result;
- add focused positive and adversarial negative tests.

No manifest, product, dependency, result, receipt/schema/CLI, donor, oracle, or workflow change belongs in R007-01.

### R007-02 — single-use T111 recovery binding

Only after R007-01 is canonically merged and closed.

Prospective tracked surface only:

- `.github/workflows/spec-007-isolated-replay.yml`

The workflow amendment may add exactly one new branch admission:

- `run/spec007-t111-jotai-r2` -> `jotai-splitatom-identical-write`

All existing source-binding, first-attempt, permissions, Node/Yarn, timeout, no-secret, direct-harness, artifact-retention, and no-rerun controls remain unchanged.

The old `run/spec007-t111-jotai` binding remains historical evidence and MUST NOT be reused.

No generalized input, workflow dispatch, arbitrary case selection, reusable task runner, or mutable branch pattern is authorized.

## 8. Recovery replay after both implementation units are canonical

Only after R007-01 and R007-02 are separately qualified, reviewed, merged, and durably closed may a recovery T111 ledger become execution-eligible.

Execution requirements:

1. reverify canonical `main` and exact merged workflow/code identities;
2. prove `run/spec007-t111-jotai-r2` does not exist;
3. create that exact ref once from the exact canonical merged source;
4. preserve the first create-event workflow attempt as the only qualifying attempt;
5. do not rerun a failed attempt;
6. preserve the original failed run `33984116443` as immutable historical evidence;
7. if recovery replay fails any required gate, record `NO_GO / RETURN_TO_PLANNING` again;
8. only a fully qualified recovery replay may establish `T111 = CLOSED_CANONICAL / QUALIFIED` and unblock T112.

## 9. T112/T113/T114 dependency preservation

- T112 remains blocked until T111 is durably qualified through an authorized recovery replay.
- The existing T112 branch `run/spec007-t112-immer` MUST NOT be created early.
- T112 retains its exact Node `v24.15.0` / Iterator capability gate and no-polyfill/no-shim rule.
- T113 remains blocked until both T111 and T112 qualify.
- T114 remains blocked until T113 closes canonically.

## 10. Required tests for R007-01

Focused tests MUST prove at minimum:

1. `observed + exit 0 + exact Vitest no-tests + no report` => `membership=false` with explicit no-tests evidence;
2. the same no-report evidence under `required` => failure;
3. nonzero no-tests output => failure;
4. changed proof exit code => failure;
5. truncated output => failure;
6. config/module/resolve error text cannot be accepted as no-tests evidence;
7. malformed/oversized/ambiguous JSON remains fail-closed;
8. report-producing observed membership retains existing structured proof behavior;
9. report-producing required membership retains existing strict behavior;
10. existing membership-proof and benchmark-harness tests remain green.

Full Project CI and any required security/static checks MUST qualify the exact implementation head before merge.

## 11. Review requirements

The planning amendment itself requires substantive independent exact-head review before it may become canonical.

Any later R007-01 implementation requires independent semantic/security review of:

- policy separation (`required` versus `observed`);
- false-negative/false-positive no-tests classification risk;
- source-stability preservation;
- output-truncation behavior;
- absence of synthetic evidence;
- regression coverage.

Any later R007-02 workflow amendment requires independent security review of:

- exact branch allowlist;
- exact source/workflow SHA binding;
- first-attempt-only enforcement;
- no arbitrary inputs;
- least permissions/no secrets;
- no rerun-to-green route.

## 12. Explicit non-authority

This plan does NOT authorize:

- implementation of R007-01 or R007-02;
- creation of `run/spec007-t111-jotai-r2`;
- creation of the T112 ref;
- any rerun of run `33984116443`;
- moving or recreating the old T111 ref;
- product/selector mutation;
- donor/oracle/runtime substitution;
- manifest case replacement;
- result publication;
- historical-result rewrite;
- generalized benchmark infrastructure.

## 13. Planning exit criteria

This planning amendment may be considered canonical only when:

1. its PR is exact-head reviewed substantively with no unresolved material finding;
2. required repository checks for the planning-only change pass on that exact head;
3. scope contains only the bounded planning artifacts;
4. guarded merge and post-merge identity verification complete;
5. a separate implementation-authorization ledger/artifact is then created and reviewed before any R007-01 code mutation.

Until then:

`SPEC_007_T111_RECOVERY = PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`
