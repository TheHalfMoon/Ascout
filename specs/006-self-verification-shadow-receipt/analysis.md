# Spec 006 Cross-Artifact Analysis

**Status:** PASS_AFTER_MERGE_BASE_AND_TRUST_SCOPE_RECONCILIATION / PLANNING_ONLY
**Canonical planning base:** `c8126773a63be744b121fbabc5e427600f671ae8`

## 1. Roadmap / proportionality

M1.2 follows completed M1.1 slices; self-verification is the first M1.2 workstream. The measured gap is absence of an Ascout-on-Ascout receipt path. Proposed response remains only T107 harness/tests, T108 standalone workflow, T109 ledger closeout. No M2/product-core work.

**Result:** CONSISTENT / PROPORTIONATE.

## 2. Trusted execution boundary

The Constitution permits trusted local/repository scope and explicitly defers arbitrary third-party/untrusted PR execution.

Therefore T108 applies only to same-repository PR heads. Eligibility must be evaluated at job level before checkout/install/build/execution of H. Fork/external PRs skip the self-verification execution job and produce no receipt claim.

`pull_request_target`, repository secrets, elevated token permissions, or any workaround that executes fork code are prohibited.

**Result:** ALIGNED WITH TRUST BOUNDARY.

## 3. Source identity

Final model:

- B = event base-tip SHA, provenance only;
- H = eligible same-repository PR head;
- M = unique merge base(B,H);
- HT = H tree.

Event base tip is not assumed subject HEAD. Missing/multiple M fails closed. Subject reconstruction uses ephemeral `git reset --soft M`, then proves HEAD=M, write-tree=HT, no unstaged tracked divergence, no unrelated nonignored untracked material.

**Result:** ALIGNED WITH SOURCE-BOUND TRUTH.

## 4. Verifier / test-order identity

Verifier is exact build from H before reconstruction. `run.ascout_version` is not commit identity.

Because Project CI runs tests before build, T107 harness cannot top-level import dist validators. Production path lazily loads exact H-built dist validators. Focused Vitest may inject the same current source validators into an internal adapter; T108 live workflow proves real built-dist behavior.

**Result:** FEASIBLE WITHOUT PRODUCT OR CI ORDER CHANGE.

## 5. Result honesty / authority

No auto changed-command admission. Valid receipt exits 0/1/3/4 remain exact shadow truth. Workflow green means capture integrity only. Missing/invalid receipt never becomes PASS.

**Result:** ALIGNED WITH EVIDENCE / NO-GREEN-BY-OMISSION.

## 6. Validation / envelope / privacy

Exact receipt bytes pass current head-built schema + semantic validation; process exit equals receipt.summary.exit_code; receipt source start HEAD=M; exact bytes are SHA-256 bound.

Envelope is external qualification metadata binding verifier H/HT, event B, subject M, target H/HT, receipt exit/digest/filename, with SHADOW_NON_GATING classification. Raw repo/path/user/host/env/secret data is forbidden.

**Result:** CONSISTENT.

## 7. Surfaces

T107 only:
- `benchmarks/self-verify.mjs`
- `tests/t107-self-verification-harness.contract.test.ts`

T108 only:
- `.github/workflows/self-verify.yml`

T109: ledger-only by default.

No `src/**`, package/runtime dependency, receipt/schema, current Project CI, historical benchmark-result, release/tag/publication mutation.

**Result:** CONSISTENT.

## 8. Workflow / supply chain

T108 is a separate `pull_request` workflow with same-repo job condition, `contents: read` only, Ubuntu 24.04 / Node 24, no secrets, no write capability, no `pull_request_target`.

Only new planned executable action is official `actions/upload-artifact`, MIT, planning-reviewed exact commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`; full-SHA pin + implementation-time reverification mandatory.

**Result:** CONSISTENT.

## 9. Required adversarial proof

T107: B==M, B!=M advanced base, missing/multiple M, additions/deletions/renames, contamination, valid/nonvalid receipt outcomes, digest/privacy/no-admission, test-before-build validator adapter.

T108: same-repo eligible run produces live artifact; workflow structure proves fork/external PR execution is excluded before checkout; built-dist validators are actually used.

**Result:** TESTABLE.

## 10. Qualification

T107/T108 each require exact predecessor main, path purity, Project CI 6/6 exact head, fresh independent substantive review, zero material threads, guarded expected-head merge, post-merge parents/tree/signature/PR/main verification. T108 additionally requires live exact-head same-repo shadow artifact.

## Conclusion

`CROSS_ARTIFACT_ANALYSIS = PASS_AFTER_MERGE_BASE_AND_TRUST_SCOPE_RECONCILIATION`

Material findings resolved so far:
1. event base tip is not necessarily subject HEAD;
2. T107 tests cannot assume pre-existing dist;
3. untrusted fork PR code must not execute under Spec 006.

Planning still does not authorize implementation. All earlier-head CI/review is stale after these reconciliations.