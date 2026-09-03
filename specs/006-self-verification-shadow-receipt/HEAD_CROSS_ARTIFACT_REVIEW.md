# Spec 006 HEAD Cross-Artifact Review

**Status:** FOUNDER_SIDE_READY_FOR_EXTERNAL_EXACT_HEAD_REVIEW_AFTER_MERGE_BASE_RECONCILIATION

## Scope reviewed

All planning artifacts under `specs/006-self-verification-shadow-receipt/` after reconciliation of the event-base-tip ambiguity.

## Required cross-artifact invariants

1. milestone slice is M1.2-A self-verification shadow receipt only;
2. planning does not authorize implementation;
3. task order is T107 → T108 → T109;
4. T107 candidate paths are exactly `benchmarks/self-verify.mjs` and `tests/t107-self-verification-harness.contract.test.ts`;
5. T108 candidate path is exactly `.github/workflows/self-verify.yml`;
6. T109 is ledger-only by default;
7. no `src/**`, receipt/schema/CLI/package/runtime dependency/current Project CI/historical benchmark-result mutation;
8. `B` means exact GitHub event base-tip SHA and is provenance only;
9. `H` means exact PR head SHA and `HT = H^{tree}`;
10. `M` means the **unique** merge base of exact `B` and `H`;
11. missing/multiple merge-base results fail closed;
12. source reconstruction uses ephemeral `git reset --soft M`, not event base tip B;
13. before observation prove `HEAD == M`, `git write-tree == HT`, no unstaged tracked divergence, no unrelated nonignored untracked material;
14. exact verifier is built from H before reconstruction and is not rebuilt from M;
15. envelope binds verifier H/HT, event B, subject M, target H/HT, receipt exit/digest/filename;
16. no automatic changed-command-surface admission;
17. valid receipt exits `0/1/3/4` are observational shadow capture and never rewritten as clean;
18. exit `2` without valid receipt and identity/validation/digest/artifact failures fail capture;
19. exact retained receipt bytes must pass current head-built schema + semantic validators and process/receipt exit consistency;
20. envelope remains outside receipt v1 and privacy-safe;
21. one Ubuntu 24.04 / Node 24 shadow lane does not replace six-lane Project CI;
22. artifact retention is 30 days;
23. official `actions/upload-artifact` is full-SHA pinned only after implementation-time reverification;
24. no verdict gating, selector shadow, corpus expansion, adversarial receipt mutation, M2 capability, release, tag, or publication.

## Founder-side reconciliation result

The previously material assumption `subject HEAD == event base tip` has been removed from the controlling specification, clarifications, technical plan, task list, requirements checklist, cross-artifact analysis, YAGNI plan review, and final audit.

Any earlier qualification evidence for head `3a62c736452b5eb69f8e949f32736cf0a76276ed`, including successful Project CI run 255 or any review conclusion, is stale and MUST NOT qualify the reconciled head.

This file does not satisfy the independent review gate. After it becomes the final branch mutation, live GitHub truth, path purity, Project CI, and a fresh independent substantive review must all be reverified on the resulting exact head.

`FOUNDER_SIDE_CROSS_ARTIFACT_REVIEW = PASS_AFTER_MERGE_BASE_RECONCILIATION`

`INDEPENDENT_EXACT_HEAD_REVIEW = REQUIRED`

`IMPLEMENTATION_AUTHORIZATION = NOT_EFFECTIVE`