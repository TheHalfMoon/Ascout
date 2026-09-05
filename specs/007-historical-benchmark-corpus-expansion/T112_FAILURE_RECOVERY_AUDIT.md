# T112 Failure Recovery Audit

**Status:** PLANNING_REVIEW_REQUIRED / IMPLEMENTATION_NOT_AUTHORIZED  
**Planning ledger:** Issue #195  
**Plan:** `T112_FAILURE_RECOVERY_PLAN.md`

## Exact-head review target

Independent review must evaluate the exact final planning head and answer every question below before this planning amendment can merge.

## Failure-evidence integrity

1. Is run `33993150910` correctly preserved as the only qualifying first T112 attempt?
2. Does the plan prohibit rerunning that run or moving/recreating/reusing `run/spec007-t112-immer`?
3. Does the plan avoid claiming donor replay/oracle evidence that never occurred?
4. Does it preserve the fact that no replay JSON/artifact was produced?

## Root-cause correctness

5. Does the live canonical Immer record use `project-native source-suite/reference command` for exact command `yarn test:src`?
6. Does the live canonical `extractSelectionCommands` grammar require `project-native full-suite/reference command`?
7. Is the observed failure therefore a manifest-label / executable-contract mismatch rather than a Node/Yarn/donor/oracle failure?
8. Does the plan correctly avoid widening the parser when a narrower manifest correction suffices?

## Revision integrity

9. Is bumping Immer `case_revision` from 1 to 2 appropriate because the correction changes executable contract interpretation while preserving the failed revision-1 evidence trail?
10. Is bumping `manifest_revision` from 12 to 13 appropriate to bind the successor manifest to the corrected case contract?
11. Are all candidate Git objects, paths, command values, runtime identities, oracle ids, reconstruction data, license evidence, and lifecycle semantics otherwise preserved?

## Test sufficiency

12. Is a real-manifest extraction regression test necessary to prevent the generic fixture from masking future command-label drift?
13. Should that focused test validate all selection cases rather than only Immer so every canonical selection command contract is executable by the current extractor?
14. Does the proposed test avoid donor execution and remain deterministic/local?

## Recovery-executor scope

15. Is a later exact branch `run/spec007-t112-immer-r2` necessary because the original T112 branch/run are immutable?
16. Is the proposed workflow amendment limited to one exact additional branch mapping with all existing source-binding, first-attempt, least-permission, toolchain, timeout, and no-input controls preserved?
17. Is it correctly dependency-blocked until the manifest/test correction is canonical?

## YAGNI and authority

18. Is the proposed implementation surface minimal: manifest + focused test, then a separate one-path workflow admission?
19. Does the plan avoid product/selector/schema/historical-result/generalized-framework changes?
20. Does the plan explicitly require a separate implementation authorization before any mutation?
21. Does it keep T113 blocked until a genuine T112 recovery reaches `BENCHMARK_ACTIVE`?

## Required review disposition

A qualifying review must be substantive, independent, exact-head, and explicitly state either:

- `No material findings`; or
- precise material findings that must be reconciled prospectively before merge.

This audit file does not self-claim independence, qualification, implementation authority, or recovery eligibility.