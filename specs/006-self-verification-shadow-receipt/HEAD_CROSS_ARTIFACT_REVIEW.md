# Spec 006 HEAD Cross-Artifact Review

**Status:** FOUNDER_SIDE_READY_FOR_EXTERNAL_EXACT_HEAD_REVIEW_AFTER_F1_F2_F3_F4_F5_RECONCILIATION

## Scope reviewed

All 12 planning files under `specs/006-self-verification-shadow-receipt/` after reconciliation of source identity, test/build ordering, trusted-execution scope, independent receipt/source binding, and stale-YAGNI cross-artifact consistency.

This file is the intended **last planning-content mutation** before exact-head qualification. Any later repository-content mutation invalidates this record.

## Required invariants

1. M1.2-A self-verification shadow receipt only; planning does not authorize implementation.
2. T107 → T108 → T109 only.
3. T107 paths exactly `benchmarks/self-verify.mjs` + `tests/t107-self-verification-harness.contract.test.ts`; T108 exactly `.github/workflows/self-verify.yml`; T109 ledger-only by default.
4. No `src/**`, receipt/schema/CLI/package/runtime dependency/current Project CI/historical benchmark-result/release/tag/publication mutation.
5. Same-repository PR execution only; eligibility before checkout/install/build/execution. Fork/external PRs skip with no receipt claim. No `pull_request_target`, secrets, elevated permissions, or fork-code workaround.
6. B = event base provenance; H = eligible PR head; HT = H tree; M = unique merge base(B,H). Missing/multiple M fails closed.
7. Reconstruction uses `git reset --soft M`, then proves HEAD=M, write-tree=HT, no tracked/untracked contamination.
8. Exact verifier is H-built before reset and never rebuilt from M.
9. Tests-before-build: no top-level dist imports. Production lazily loads exact H-built composer/validators; focused tests may inject same current source functions internally; T108 proves real built-dist path.
10. After reconstruction and immediately before verifier launch, exact H-built canonical `composeSourceState(repositoryRoot)` captures expected SourceStateV1 snapshot S. Harness MUST NOT reimplement source/tree digest semantics.
11. Exact receipt bytes pass current H-built JSON Schema + semantic validators; process exit equals receipt.summary.exit_code.
12. Before digest/envelope/upload, `receipt.source.start` equals S exactly for `head_sha`, `tree_digest_version`, `tree_digest`, `tracked_index_entry_count`, `unstaged_changed_count`, and `included_untracked_count`.
13. Any one-field mismatch is capture failure; T107 focused proof covers every field independently.
14. S remains in-memory integrity evidence; no receipt/envelope field is added.
15. No automatic changed-command admission.
16. Only source-bound valid exits 0/1/3/4 are `SHADOW_NON_GATING`; invalid/no/mismatched receipt fails capture.
17. Envelope binds H/HT, B, M, target H/HT, receipt exit/digest/filename and remains privacy-safe.
18. One Ubuntu 24.04 / Node 24 shadow lane does not replace six-lane Project CI.
19. Artifact retention 30 days; official upload-artifact full-SHA pinned after implementation-time revalidation; `contents: read` only.
20. Both `ponytail-review.md` and `plan-ponytail-review.md` explicitly preserve F4's canonical composer reuse and reject duplicate source-state/digest machinery.
21. No gating promotion, selector/corpus/adversarial work, M2, untrusted sandbox, release/tag/publication.

## Material findings reconciled

- F1: event base tip incorrectly assumed subject HEAD → unique merge base M.
- F2: focused tests could depend on dist although tests run before build → lazy production loading + test-only current-source injection.
- F3: generic pull_request execution could run untrusted fork code → same-repository eligibility before checkout; forks skipped.
- F4: receipt was not independently bound to reconstructed source state → exact H-built canonical pre-launch SourceStateV1 S + six-field receipt.source.start equality gate.
- F5: first Ponytail/YAGNI review was stale after F4 → reconciled to the same canonical composer reuse, six-field binding, and no-duplicate-algorithm boundary.

Every CI/review result from a head before this final reconciliation is stale for planning merge qualification.

## Qualification rule

The exact branch head produced by this file must receive:

- canonical-base ancestry/no-intervening-main proof;
- exactly 12 planning-only changed files;
- fresh six-lane Project CI success;
- fresh independent substantive review of this exact head covering F1–F5;
- zero unresolved material findings/threads;
- unchanged head;
- guarded expected-head merge;
- post-merge ordered parents/tree/GitHub signature/PR/main proof.

`FOUNDER_SIDE_CROSS_ARTIFACT_REVIEW = PASS_AFTER_F1_F2_F3_F4_F5_RECONCILIATION`

`INDEPENDENT_EXACT_HEAD_REVIEW = REQUIRED`

`IMPLEMENTATION_AUTHORIZATION = NOT_EFFECTIVE`