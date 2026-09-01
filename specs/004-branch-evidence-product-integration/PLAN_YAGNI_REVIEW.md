# Plan YAGNI Review: Branch-Evidence Product Integration

**Spec:** 004  
**Date:** 2026-09-01  
**Status:** PLANNING  

## PY-001 — Separate branch normalization module outside `src/`

**Verdict:** REJECT.  
**Reason:** Spec 003 used a benchmark-only module because product integration was not yet authorized. Spec 004 explicitly authorizes product integration. The parser belongs in `src/coverage/lcov.ts` as an extension of the existing line parser. A separate module would duplicate path-normalization logic and violate minimal core.

## PY-002 — New `BranchCoverageService` class with dependency injection

**Verdict:** REJECT.  
**Reason:** The existing functional style in `lcov.ts` and `exercise.ts` is sufficient. A service class adds abstraction without measured product need.

## PY-003 — Receipt builder pattern for branch fields

**Verdict:** REJECT.  
**Reason:** `buildReceipt` in `receipt/build.ts` is already generic over `ExerciseV1`. Adding optional branch fields to `ExerciseV1` is sufficient. No builder pattern change is needed.

## PY-004 — CLI flag `--branch-coverage` to enable/disable branch parsing

**Verdict:** REJECT.  
**Reason:** Branch evidence is derived from existing LCOV output. No user configuration is needed. A CLI flag would expand the surface without solving a measured problem.

## PY-005 — Branch coverage percentage in terminal summary

**Verdict:** REJECT unless explicitly planned.  
**Reason:** The default plan preserves existing terminal summary. Any display change must be explicitly authorized.

## PY-006 — Branch coverage artifact file in `.ascout/runs/`

**Verdict:** REJECT.  
**Reason:** Branch evidence belongs in the receipt, not as a separate artifact file. A separate file would duplicate evidence and complicate consumer parsing.

## PY-007 — Branch coverage validation as a separate `validateBranchExercise` function

**Verdict:** REJECT.  
**Reason:** `validateExercise` can validate branch records inline when present. A separate function adds unnecessary surface.

## PY-008 — Support for multiple coverage formats beyond LCOV

**Verdictict:** REJECT.  
**Reason:** Spec 004 is narrowly scoped to LCOV `BRDA:` records. Multiple-format support is out of scope.

## PY-009 — Branch evidence in `ChangedCodeV1` or `ComparisonV1`

**Verdict:** REJECT.  
**Reason:** Branch evidence belongs in `ExerciseV1`, not in source-change metadata. Changing `ChangedCodeV1` or `ComparisonV1` would violate the architecture decision to keep branch evidence as a separate internal dimension.

## PY-010 — Automatic branch-coverage "support" badge or claim in product output

**Verdict:** REJECT.  
**Reason:** Spec 003 qualification proved only that branch evidence can reveal gaps. Product branch-coverage support as a standalone claim is not authorized and would overclaim measured evidence.

## PY-011 — Safe integer overflow handling library

**Verdict:** REJECT.  
**Reason:** Node.js `Number.isSafeInteger` is sufficient. No external library is needed.

## PY-012 — Separate `BranchObservation` type exported from `lcov.ts`

**Verdict:** ACCEPT if internal.  
**Reason:** `BranchRecordV1` is the receipt-facing type. Internal branch observation types during parsing can remain unexported or minimally exported. Exporting a separate public type is acceptable only if it is needed by `exercise.ts` or tests.

## PY-013 — Deterministic branch record sorting by `(path, line, block_id, branch_id)`

**Verdict:** ACCEPT.  
**Reason:** Deterministic serialization is a constitutional requirement. Sorting by path, line, block, branch is the smallest stable ordering.

## PY-014 — Backward-compatible optional fields in `ExerciseV1`

**Verdict:** ACCEPT.  
**Reason:** Additive optional fields preserve backward compatibility and are the smallest schema change that satisfies the measured gap.
