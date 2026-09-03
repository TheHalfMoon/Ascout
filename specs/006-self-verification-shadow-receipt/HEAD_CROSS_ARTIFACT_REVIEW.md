# Spec 006 HEAD Cross-Artifact Review

**Status:** FOUNDER_SIDE_READY_FOR_EXTERNAL_EXACT_HEAD_REVIEW_AFTER_F1_F2_F3_RECONCILIATION

## Scope reviewed

All 12 planning files under `specs/006-self-verification-shadow-receipt/` after final reconciliation of source identity, Project CI test/build ordering, and trusted-execution scope.

This file is intended to be the **last planning-content mutation** before exact-head qualification. Any later repository-content mutation invalidates this founder-side final-head record and requires a fresh cross-artifact sweep.

## Required invariants

1. M1.2-A self-verification shadow receipt only; planning does not authorize implementation.
2. Task order T107 → T108 → T109.
3. T107 paths exactly `benchmarks/self-verify.mjs` + `tests/t107-self-verification-harness.contract.test.ts`.
4. T108 path exactly `.github/workflows/self-verify.yml`; T109 ledger-only by default.
5. No `src/**`, receipt/schema/CLI/package/runtime dependency/current Project CI/historical benchmark-result/release/tag/publication mutation.
6. Self-verification execution is same-repository PR only; eligibility is checked before checkout/install/build/execution of H.
7. Fork/external PR => skipped execution, no receipt claim; `pull_request_target`, secrets, elevated permissions, or fork-code workaround prohibited.
8. B = event base-tip provenance; H = eligible same-repository PR head; HT = H tree; M = unique merge base(B,H).
9. Missing/multiple M fails closed; subject reconstruction uses `git reset --soft M` and proves HEAD=M, write-tree=HT, no contamination.
10. Exact verifier is H-built before reset; no rebuild from M.
11. Project CI tests before build: harness has no top-level dist validator import; production lazy-loads exact H-built dist validators; focused tests may inject same current source validators internally; T108 live run proves built-dist path.
12. No automatic changed-command admission.
13. Exact receipt bytes pass current schema + semantic validators; process exit equals receipt.summary.exit_code; receipt source HEAD=M.
14. Valid exits 0/1/3/4 remain SHADOW_NON_GATING observations; invalid/no receipt fails capture.
15. Envelope binds H/HT, B, M, target H/HT, receipt exit/digest/filename and is privacy-safe.
16. One Ubuntu 24.04 / Node 24 shadow lane does not replace six-lane Project CI.
17. Artifact retention 30 days; official upload-artifact full-SHA pinned after implementation-time revalidation; contents: read only.
18. No gating promotion, selector/corpus/adversarial work, M2, untrusted sandbox, release/tag/publication.
19. `GAP_EVIDENCE.md`, both YAGNI reviews, spec, clarifications, plan, tasks, checklist, analysis, final audit, and this record all agree that Spec 006 does **not** execute fork/external PR head code.

## Material findings reconciled

- F1: event base tip was incorrectly assumed to be subject HEAD → unique merge base M.
- F2: focused tests could implicitly depend on dist although tests run before build → lazy production loading + test-only internal validator injection.
- F3: generic pull_request execution could run untrusted fork code → same-repository eligibility before checkout; forks skipped; no `pull_request_target` or authority escalation.

Every CI/review result from a head before this final reconciliation is stale for planning merge qualification.

## Qualification rule

This founder-side review does not satisfy the independent review gate. The exact branch head produced by this file must be reverified for:

- canonical-base ancestry and no intervening main movement;
- exactly 12 planning-only changed files;
- six-lane Project CI success on that exact head;
- fresh independent substantive review of that exact head;
- zero unresolved material findings/threads;
- unchanged head after qualification;
- guarded expected-head merge and post-merge identity proof.

`FOUNDER_SIDE_CROSS_ARTIFACT_REVIEW = PASS_AFTER_F1_F2_F3_RECONCILIATION`

`INDEPENDENT_EXACT_HEAD_REVIEW = REQUIRED`

`IMPLEMENTATION_AUTHORIZATION = NOT_EFFECTIVE`