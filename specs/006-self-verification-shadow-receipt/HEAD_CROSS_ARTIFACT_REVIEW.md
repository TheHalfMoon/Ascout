# Spec 006 HEAD Cross-Artifact Review

**Status:** FOUNDER_SIDE_READY_FOR_EXTERNAL_EXACT_HEAD_REVIEW_AFTER_F1_F2_F3_F4_RECONCILIATION

## Scope reviewed

All 12 planning files under `specs/006-self-verification-shadow-receipt/` after reconciliation of source identity, Project CI test/build ordering, trusted-execution scope, and independent receipt/source-state binding.

This file is the intended **last planning-content mutation** before exact-head qualification. Any later repository-content mutation invalidates this record and requires a new sweep.

## Required invariants

1. M1.2-A self-verification shadow receipt only; planning does not authorize implementation.
2. Task order T107 → T108 → T109.
3. T107 paths exactly `benchmarks/self-verify.mjs` + `tests/t107-self-verification-harness.contract.test.ts`.
4. T108 path exactly `.github/workflows/self-verify.yml`; T109 ledger-only by default.
5. No `src/**`, receipt/schema/CLI/package/runtime dependency/current Project CI/historical benchmark-result/release/tag/publication mutation.
6. Execution is same-repository PR only; eligibility before checkout/install/build/execution. Fork/external PRs skip with no receipt claim. No `pull_request_target`, secrets, elevated permissions, or fork-code workaround.
7. B = event base provenance; H = eligible PR head; HT = H tree; M = unique merge base(B,H). Missing/multiple M fails closed.
8. Reconstruction uses `git reset --soft M`, then proves HEAD=M, write-tree=HT, no tracked/untracked contamination.
9. Exact verifier is H-built before reset and never rebuilt from M.
10. Tests-before-build boundary: no top-level dist imports. Production lazily loads exact H-built composer/validators; focused tests may inject same current source functions internally; T108 proves real built-dist path.
11. After reconstruction and immediately before verifier launch, production calls exact H-built canonical `dist/check.js::composeSourceState(repositoryRoot)` once and retains expected SourceStateV1 snapshot S.
12. Harness MUST NOT reimplement source-state/tree-digest semantics or add a second evaluator.
13. Exact receipt bytes pass current H-built JSON Schema + semantic validators and process exit equals receipt.summary.exit_code.
14. Before digest/envelope/upload, `receipt.source.start` must equal S exactly for:
    - `head_sha`;
    - `tree_digest_version`;
    - `tree_digest`;
    - `tracked_index_entry_count`;
    - `unstaged_changed_count`;
    - `included_untracked_count`.
15. Any one-field mismatch is capture failure; focused T107 proof must cover every field independently.
16. S remains in-memory capture-integrity evidence; no receipt/envelope schema field is added.
17. No automatic changed-command admission.
18. Only source-bound valid exits 0/1/3/4 remain `SHADOW_NON_GATING` observations; invalid/no/mismatched receipt fails capture.
19. Envelope binds H/HT, B, M, target H/HT, receipt exit/digest/filename and remains privacy-safe.
20. One Ubuntu 24.04 / Node 24 shadow lane does not replace six-lane Project CI.
21. Artifact retention 30 days; official upload-artifact full-SHA pinned after implementation-time revalidation; `contents: read` only.
22. No gating promotion, selector/corpus/adversarial work, M2, untrusted sandbox, release/tag/publication.

## Material findings reconciled

- F1: event base tip incorrectly assumed subject HEAD → unique merge base M.
- F2: focused tests could depend on dist although tests run before build → lazy production loading + test-only current-source injection.
- F3: generic pull_request execution could run untrusted fork code → same-repository eligibility before checkout; forks skipped.
- F4: schema-valid receipt was not independently bound to the reconstructed index/worktree source state → exact H-built canonical pre-launch SourceStateV1 snapshot S + six-field receipt.source.start equality gate.

Every CI/review result from a head before this final F4 reconciliation is stale for planning merge qualification.

## Qualification rule

This founder-side review does not satisfy the independent review gate. The exact branch head produced by this file must be reverified for:

- canonical-base ancestry and no intervening main movement;
- exactly 12 planning-only changed files;
- six-lane Project CI success on that exact head;
- fresh independent substantive review of that exact head, explicitly including F4;
- zero unresolved material findings/threads;
- unchanged head after qualification;
- guarded expected-head merge and post-merge identity proof.

`FOUNDER_SIDE_CROSS_ARTIFACT_REVIEW = PASS_AFTER_F1_F2_F3_F4_RECONCILIATION`

`INDEPENDENT_EXACT_HEAD_REVIEW = REQUIRED`

`IMPLEMENTATION_AUTHORIZATION = NOT_EFFECTIVE`