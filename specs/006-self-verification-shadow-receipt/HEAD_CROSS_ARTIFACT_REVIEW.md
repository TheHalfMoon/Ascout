# Spec 006 HEAD Cross-Artifact Review

**Status:** FOUNDER_SIDE_READY_FOR_EXTERNAL_EXACT_HEAD_REVIEW

## Scope reviewed

All Spec 006 planning artifacts on branch `plan/006-self-verification-shadow-receipt` after final plan audit:

- `GAP_EVIDENCE.md`
- `spec.md`
- `clarifications.md`
- `ponytail-review.md`
- `plan.md`
- `plan-ponytail-review.md`
- `tasks.md`
- `checklists/requirements.md`
- `SUPPLY_CHAIN_REVIEW.md`
- `analysis.md`
- `FINAL_PLAN_AUDIT.md`
- this review record

## Cross-artifact invariants

All artifacts must agree on the following before planning merge:

1. milestone slice is M1.2-A self-verification shadow receipt only;
2. implementation is not authorized by planning;
3. T107 → T108 → T109 is the only task order;
4. T107 candidate paths are exactly `benchmarks/self-verify.mjs` and `tests/t107-self-verification-harness.contract.test.ts`;
5. T108 candidate path is exactly `.github/workflows/self-verify.yml`;
6. T109 is ledger-only by default;
7. no `src/**`, receipt/schema/CLI/package/runtime dependency/current Project CI/historical benchmark-result mutation;
8. exact verifier head/tree and subject base/head/tree are distinct and externally bound;
9. source reconstruction uses CI-ephemeral `git reset --soft BASE`, then proves `HEAD == BASE` and `git write-tree == HEAD_TREE`;
10. no automatic changed-command-surface admission;
11. valid receipt exits `0/1/3/4` are observational shadow capture, never rewritten as clean;
12. exit `2`/no valid receipt and identity/validation/artifact failures fail capture;
13. current head-built schema + semantic validators must accept the retained real receipt;
14. envelope remains outside receipt v1 and privacy-safe;
15. self-verification is one Ubuntu 24.04 / Node 24 observation lane, not replacement for six-lane Project CI;
16. artifact retention is bounded to 30 days;
17. new artifact action is official GitHub `actions/upload-artifact`, MIT, full-SHA pinned only after implementation-time revalidation;
18. no verdict gating, selector shadow, historical corpus expansion, adversarial receipt mutation, M2 capability, release, tag, or publication.

## Founder-side result

No material cross-artifact contradiction is known after the soft-reset/tree-identity reconciliation and supply-chain review.

This file does **not** satisfy the independent exact-head planning review gate by itself. After this file is committed, live GitHub truth must be re-read and the final branch head/path purity must be qualified by Project CI and a fresh independent substantive review before guarded planning merge.

`FOUNDER_SIDE_CROSS_ARTIFACT_REVIEW = PASS`

`INDEPENDENT_EXACT_HEAD_REVIEW = REQUIRED`

`IMPLEMENTATION_AUTHORIZATION = NOT_EFFECTIVE`