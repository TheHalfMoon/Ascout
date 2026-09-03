# Spec 006 Cross-Artifact Analysis

**Status:** PASS_AFTER_F1_F2_F3_F4_RECONCILIATION / PLANNING_ONLY
**Canonical planning base:** `c8126773a63be744b121fbabc5e427600f671ae8`

## 1. Roadmap / proportionality

M1.2 follows completed M1.1 slices; self-verification is the first M1.2 workstream. Scope remains only T107 harness/tests, T108 standalone workflow, T109 ledger closeout. No M2/product-core work.

**Result:** CONSISTENT / PROPORTIONATE.

## 2. Trusted execution boundary — F3

T108 applies only to same-repository PR heads. Eligibility is evaluated before checkout/install/build/execution. Fork/external PRs skip with no receipt claim. `pull_request_target`, repository secrets, elevated permissions, or fork-code workarounds are prohibited.

**Result:** ALIGNED WITH TRUST BOUNDARY.

## 3. Source identity — F1

- B = event base-tip provenance;
- H = eligible same-repository PR head;
- M = unique merge base(B,H);
- HT = H tree.

Missing/multiple M fails closed. Reconstruction uses `git reset --soft M`, then proves HEAD=M, write-tree=HT, no tracked/untracked contamination.

**Result:** ALIGNED WITH SOURCE-BOUND TRUTH.

## 4. Built-code / test-order identity — F2

Verifier is exact H build. Because Project CI tests before build, T107 cannot top-level import dist. Production lazily loads exact H-built composer/validators; focused Vitest may inject same current source functions into internal adapters. T108 proves real built-dist behavior.

**Result:** FEASIBLE WITHOUT PRODUCT OR CI ORDER CHANGE.

## 5. Independent receipt/source binding — F4

Pre-execution Git proof alone does not bind a later schema-valid receipt to that exact state, because semantic validation is receipt-internal.

The reconciled plan therefore requires:

1. after reconstruction proof and immediately before verifier launch, invoke exact H-built canonical `composeSourceState(repositoryRoot)` and retain expected SourceStateV1 snapshot S;
2. parse exact receipt bytes and run exact H-built current JSON Schema + semantic validation;
3. require process exit equals receipt.summary.exit_code;
4. require exact equality between `receipt.source.start` and S for:
   - `head_sha`;
   - `tree_digest_version`;
   - `tree_digest`;
   - `tracked_index_entry_count`;
   - `unstaged_changed_count`;
   - `included_untracked_count`;
5. fail capture on any mismatch before receipt digest, envelope emission, or upload.

The harness reuses canonical `composeSourceState`; it does not implement a second source-state/digest algorithm. No receipt/schema/envelope field is added.

**Result:** F4 RECONCILED / EVIDENCE BOUND.

## 6. Result honesty / authority

No automatic changed-command admission. Only a schema-valid, semantically valid, process-exit-consistent, source-bound receipt may become successful capture. Valid exits 0/1/3/4 remain exact shadow truth; workflow green means capture integrity only.

**Result:** ALIGNED WITH NO-GREEN-BY-OMISSION.

## 7. Envelope / privacy

Envelope remains external qualification metadata binding H/HT, B, M, target H/HT, receipt exit/digest/filename, `SHADOW_NON_GATING`. S remains in-memory integrity evidence and is not a new schema surface. Raw repo/path/user/host/env/secret data is forbidden.

**Result:** CONSISTENT.

## 8. Surfaces

T107 only:
- `benchmarks/self-verify.mjs`
- `tests/t107-self-verification-harness.contract.test.ts`

T108 only:
- `.github/workflows/self-verify.yml`

T109: ledger-only by default.

No `src/**`, package/runtime dependency, receipt/schema, current Project CI, historical benchmark-result, release/tag/publication mutation.

**Result:** CONSISTENT.

## 9. Supply chain

Only new planned executable action is official `actions/upload-artifact`, MIT, planning-reviewed exact commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`; full-SHA pin + implementation-time reverification mandatory. Workflow permissions remain `contents: read` only.

**Result:** CONSISTENT.

## 10. Required proof

T107 must prove merge-base cases, exact reconstruction, test-before-build adapters, canonical S capture, equality success, **each of the six independent source-field mismatch failures**, valid/nonvalid receipt outcomes, digest/privacy/no-admission.

T108 must prove same-repo eligible live artifact, exclusion of fork execution before checkout, actual exact-H built `composeSourceState` + validators, six-field source binding, and bounded artifact retention.

**Result:** TESTABLE.

## 11. Qualification

T107/T108 each require exact predecessor main, path purity, exact-head Project CI 6/6, fresh independent substantive review, zero material threads, guarded expected-head merge, and post-merge parents/tree/signature/PR/main verification. T108 additionally requires live exact-head source-bound artifact.

## Conclusion

`CROSS_ARTIFACT_ANALYSIS = PASS_AFTER_F1_F2_F3_F4_RECONCILIATION`

Material findings reconciled:
1. event base tip is not necessarily subject HEAD;
2. T107 tests cannot assume pre-existing dist;
3. untrusted fork PR code must not execute;
4. receipt source start must be independently bound to canonical pre-launch SourceStateV1.

Planning still does not authorize implementation. All earlier-head CI/review is stale after F4 reconciliation.