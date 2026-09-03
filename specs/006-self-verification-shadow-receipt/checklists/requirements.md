# Spec 006 Requirements Quality Checklist

**Status:** PLANNING REVIEW

## Scope
- [x] Measured gap from live canonical repository truth.
- [x] M1.2-A ordering preserved.
- [x] Self-verification shadow receipt only.
- [x] No selector/corpus/adversarial/M2 expansion.
- [x] No product-core mutation.

## Trusted execution boundary
- [x] Same-repository PR heads only.
- [x] Eligibility before checkout/install/build/execution.
- [x] Fork/external PR skipped with no receipt claim.
- [x] No `pull_request_target`, secrets, elevated token/write permission, or untrusted-code workaround.

## Git identity
- [x] B = event base provenance.
- [x] H = exact eligible PR head; HT = H tree.
- [x] M = unique merge base(B,H); B is not assumed subject HEAD.
- [x] Missing/multiple merge base fails closed.
- [x] Exact H-built verifier distinct from M-based subject.
- [x] Reconstruction proves HEAD=M and write-tree=HT.
- [x] No tracked/untracked contamination.
- [x] B!=M advanced-base case tested.

## Canonical source-state binding
- [x] Exact H-built canonical `composeSourceState(repositoryRoot)` is reused; no duplicate digest/source-state implementation.
- [x] Expected snapshot S is captured after reconstruction and immediately before verifier launch.
- [x] Receipt parse + current schema + semantic validation occurs before source comparison.
- [x] `receipt.source.start.head_sha == S.head_sha`.
- [x] `tree_digest_version` equals S.
- [x] `tree_digest` equals S.
- [x] `tracked_index_entry_count` equals S.
- [x] `unstaged_changed_count` equals S.
- [x] `included_untracked_count` equals S.
- [x] Any mismatch fails capture before digest/envelope/upload.
- [x] S is not added to receipt or envelope schema.

## Validator/test-order boundary
- [x] T107 tests do not require pre-existing dist.
- [x] Harness has no top-level dist import.
- [x] Production lazily loads exact H-built composer + validators.
- [x] Focused tests may inject same current source functions only into internal adapters.
- [x] T108 live workflow proves production built-dist path.

## Authority / receipt honesty
- [x] No automatic changed-command admission or persisted trust grant.
- [x] Exact stdout receipt bytes retained without rewriting.
- [x] Current schema + semantic validation.
- [x] Process exit equals receipt.summary.exit_code.
- [x] Valid source-bound exits 0/1/3/4 remain shadow truth.
- [x] Exit 2 is always harness-integrity failure, even when an otherwise-valid/source-bound/process-consistent receipt exists.
- [x] Exit-2 rejection occurs before receipt digest, envelope emission, or artifact upload.
- [x] T107 includes focused proof rejecting an otherwise-valid/source-bound exit-2 receipt.
- [x] No synthetic receipt.

## Envelope / privacy
- [x] Envelope external to receipt v1 and `SHADOW_NON_GATING` explicit.
- [x] B/M/H/HT + receipt exit/digest/filename bound.
- [x] No exit-2 receipt is permitted to reach envelope generation.
- [x] No raw repo/path/user/host/home/env/credentials/secrets.

## Workflow / supply chain
- [x] Separate workflow; current Project CI unchanged.
- [x] `pull_request` trigger + same-repo job condition.
- [x] `contents: read` only.
- [x] Ubuntu 24.04 / Node 24 observation lane.
- [x] Exact H guard, sufficient history, explicit install/build.
- [x] 30-day bounded artifact retention.
- [x] Official `actions/upload-artifact`, MIT, planning-reviewed exact commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`.
- [x] Full-SHA pin + implementation-time reverification.

## Governance
- [x] T107 → T108 → T109.
- [x] T107/T108 exact-head Project CI 6/6.
- [x] T108 live eligible same-repo source-bound artifact with exit restricted to 0/1/3/4.
- [x] Fresh independent exact-head substantive review.
- [x] Zero unresolved material threads.
- [x] Guarded expected-head merge + post-merge identity proof.
- [x] Separate durable implementation authorization after planning merge.
- [x] No release/tag/publication.

## Result

`PASS_AFTER_F1_F2_F3_F4_F5_F6_RECONCILIATION`