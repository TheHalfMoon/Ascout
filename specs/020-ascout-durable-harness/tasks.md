# Task020-T01: local durable call journal

Depends on canonically merged A04 workflow/idempotency/freshness models and main89e5f01, plus exact plan audit and consistency review. The subsequent user request supplies task-specific implementation direction, without waiving canonical gates.

1. Pin upstream provenance/license and document the bounded integration/rename.
2. Write and run RED contract and cross-process criteria tests.
3. Implement bounded local persistence and recovery decisions through existing models.
4. Run focused/relevant tests, strict typecheck/build and a complete native suite; retain actual results and unresolved prior debt.
5. Fresh correctness/product/parsimony plus separate security review; forward-fix required findings, qualify exact final head, publish focused PR and durable evidence.

Status: IMPLEMENTED_REVIEWED atf8c0825. Initial audit6f012fb gaps were forward-fixed; final plan auditabf8a72 and fresh consistency41ef2e5 passed before source edits. New27cases and focused6files/60tests pass; strict typecheck/build exit0; all six actual hosted native suites and valid Self capture pass on f8. Fresh correctness/security finding about stale unfinished-never reconciliation was reproduced RED at9c4a02a and forward-fixed/reviewed atf8. Full local control exited1 after1083.29seconds:243files,2,371passed/6legacy deadline failures/34existing skips. All27newcases pass; the four failing legacy test files are unchanged frombase89e5. No causal environment proof, failure suppression or readiness claim. Final documentation/evidence-head review/checks, live threads, guarded merge and post-merge controls remain separately required; see qualification/durable-harness/2026-10-24/README.md.
