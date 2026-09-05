# Spec 007 T111 Failure Recovery Audit Gate

**Status:** `AUDIT_GATE / PLANNING_ONLY`  
**Planning ledger:** Issue #171  
**Companion plan:** `T111_FAILURE_RECOVERY_PLAN.md`  
**Trigger evidence:** workflow run `33984116443`, job `101354420297`  
**Canonical planning base:** `a0222ba38926ca208789868dad6781252ac9d80b`

## Purpose

Define the exact-head independent review gate for the proposed T111 observed-membership recovery plan.

This audit file records questions and acceptance criteria only. It does **not** claim that an independent review has occurred, does not pre-authorize implementation, and does not authorize any replay ref.

## Exact observed failure to audit against

The first and only qualifying-attempt candidate for the original T111 binding failed inside the unchanged canonical replay harness after successful source/runtime/controller setup.

The runner-native related comparator produced a successful no-tests result:

`No test files found, exiting with code 0`

The membership proof produced no external JSON report, and the harness failed closed with:

`oracle_membership: runner-native related selector membership proof did not produce an external JSON report (exit 0)`

The original run `33984116443` remains immutable failure evidence and MUST NOT be rerun for qualification.

## Scope audit

The planning PR is acceptable only if its net tracked scope is limited to bounded Spec 007 planning artifacts describing this recovery.

It MUST NOT change:

- `src/**`;
- benchmark code;
- benchmark tests;
- benchmark manifest;
- benchmark results;
- workflow code;
- dependencies/lockfiles;
- donor source or oracle identity;
- receipt/schema/CLI surfaces;
- release surfaces.

## Exact-head audit questions

An independent reviewer MUST answer all of the following against the exact final planning head.

### A1 — Failure characterization

Does the plan accurately preserve the first-attempt T111 failure as a real failure rather than retroactively reclassifying or erasing it?

Expected: **YES**.

### A2 — Policy separation

Is the proposed compatibility behavior strictly limited to membership policy `observed`, while `required` membership remains structured-report-only and fail-closed?

Expected: **YES**.

### A3 — No synthetic evidence

Does the plan prohibit synthesizing a JSON report, executed assertion, oracle pass, hit, or unavailable outcome when the runner genuinely selected zero tests?

Expected: **YES**.

### A4 — Exact no-tests recognition

Does the plan require an exact reviewed runner-native no-tests condition with normal exit, matching exit behavior, bounded non-truncated output, no report, and no conflicting setup/config/module/resolve failure evidence?

Expected: **YES**.

### A5 — Required-mode isolation

Can any proposed fallback be reached by pre-fix oracle, fixed oracle, project-native full-suite membership, or another `required` membership call?

Expected: **NO**.

### A6 — Source stability

Does the plan preserve independent source-state stability checks across both comparator and membership-proof execution and fail closed on drift?

Expected: **YES**.

### A7 — Evidence honesty

Does a valid observed no-tests result remain exactly `membership=false`, with real process/output digests and a distinct evidence kind, rather than becoming a score-manufacturing success?

Expected: **YES**.

### A8 — Bounded code surface

Is prospective R007-01 limited to:

- `benchmarks/harness-lib.mjs`;
- `benchmarks/run.mjs`;
- `tests/benchmark-membership-proof.test.ts`;

with no product, manifest, result, dependency, donor, oracle, runtime, or workflow change in that unit?

Expected: **YES**.

### A9 — Bounded execution-binding surface

Is prospective R007-02 isolated from R007-01 and limited to:

- `.github/workflows/spec-007-isolated-replay.yml`;

adding only one exact recovery branch mapping:

`run/spec007-t111-jotai-r2` -> `jotai-splitatom-identical-write`

while preserving all existing security/runtime/source-binding controls?

Expected: **YES**.

### A10 — Single-use history preservation

Does the plan forbid moving, deleting/recreating, force-updating, reusing, or rerunning the old `run/spec007-t111-jotai` / `33984116443` evidence and require a new separately authorized single-use recovery binding?

Expected: **YES**.

### A11 — Dependency ordering

Does T112 remain blocked until a future authorized T111 recovery replay genuinely reaches durable qualification, with T113 and T114 remaining transitively blocked?

Expected: **YES**.

### A12 — No generalized executor/framework

Does the plan avoid an arbitrary runner, wildcard branch admission, workflow input surface, plugin/adapter SDK, generalized benchmark framework, daemon, cloud service, or selector/product change?

Expected: **YES**.

### A13 — Test sufficiency

Do the prospective R007-01 tests cover the positive observed-only no-tests case and adversarial negatives for required mode, nonzero/changed exit, truncation, setup/config/module failures, malformed reports, and unchanged structured-report behavior?

Expected: **YES**.

### A14 — Separate implementation authority

Does the planning PR remain non-authorizing and require a later, separately reviewed, canonically merged implementation-authorization artifact before any R007-01 code mutation?

Expected: **YES**.

## Audit rejection conditions

Any of the following is a material finding:

- the fallback can affect `required` membership;
- no-tests output can be confused with setup/config/module failure;
- the proposal synthesizes evidence rather than recording an observed false membership;
- the original failed run can be rerun/reused;
- R007-01 and R007-02 are conflated into one uncontrolled mutation unit;
- workflow admission becomes pattern-based or input-driven;
- product/selector/manifest/donor/oracle/runtime semantics are changed to obtain a pass;
- T112 can start before T111 qualification;
- implementation authority is implied by the planning documents themselves.

## Required exact-head evidence

Before the planning amendment can merge, record and reverify:

1. exact PR head SHA and tree;
2. exact changed-path list;
3. exact content blobs for both planning artifacts;
4. required repository checks on that exact head, original attempt where canonical governance requires it;
5. fresh independent substantive review of that exact head;
6. zero unresolved material review threads;
7. current ruleset/observable branch-protection state;
8. unchanged expected `main` immediately before merge;
9. unchanged PR head and mergeability;
10. guarded merge and post-merge commit/tree/signature verification.

Any changed planning head invalidates earlier CI/review qualification for merge purposes.

## Audit result

`SPEC_007_T111_RECOVERY_AUDIT = PENDING_INDEPENDENT_REVIEW`

No implementation or replay authority exists from this file.