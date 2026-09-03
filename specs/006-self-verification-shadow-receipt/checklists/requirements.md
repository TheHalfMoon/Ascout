# Spec 006 Requirements Quality Checklist

**Status:** PLANNING REVIEW

## Scope
- [x] Measured gap from live canonical repository truth.
- [x] M1.2-A ordering preserved.
- [x] Self-verification shadow receipt only.
- [x] No selector/corpus/adversarial/M2 expansion.
- [x] No product-core mutation.

## Trusted execution boundary
- [x] Self-verification execution applies only to same-repository PR heads.
- [x] Same-repository eligibility is evaluated before checkout/install/build/execution of PR head code.
- [x] Fork/external PR self-verification job is skipped and produces no receipt claim.
- [x] `pull_request_target` is prohibited.
- [x] No secrets/elevated token/write permission for PR-head execution.
- [x] Untrusted-repository execution remains future separately authorized sandbox work.

## Git identity
- [x] B = event base tip provenance.
- [x] H = exact eligible PR head.
- [x] HT = H tree.
- [x] M = unique merge base(B,H).
- [x] B is not assumed subject HEAD.
- [x] Missing/multiple merge base fails closed.
- [x] Exact H-built verifier is distinct from M-based subject.
- [x] HEAD=M and write-tree=HT after reconstruction.
- [x] No tracked/untracked contamination.
- [x] B!=M advanced-base case explicitly tested.

## Validator/test-order boundary
- [x] T107 tests do not require pre-existing dist.
- [x] Harness has no top-level dist validator import.
- [x] Production path lazily loads exact H-built validators.
- [x] Focused tests may inject the same current source validators only into internal adapter.
- [x] T108 live workflow proves production built-dist path.

## Authority / receipt honesty
- [x] No automatic changed-command admission or persisted trust grant.
- [x] Exact stdout receipt bytes retained.
- [x] Current schema + semantic validation.
- [x] Process exit equals receipt.summary.exit_code.
- [x] Receipt source HEAD=M.
- [x] Valid exits 0/1/3/4 remain shadow truth.
- [x] No synthetic receipt.

## Envelope / privacy
- [x] External to receipt v1.
- [x] SHADOW_NON_GATING explicit.
- [x] B/M/H/HT + receipt exit/digest/filename bound.
- [x] No raw repo/path/user/host/home/env/credentials/secrets.

## Workflow / supply chain
- [x] Separate workflow; current Project CI unchanged.
- [x] pull_request trigger + same-repo job condition.
- [x] contents: read only.
- [x] Ubuntu 24.04 / Node 24 observation lane.
- [x] Exact H guard and sufficient history.
- [x] Explicit install/build.
- [x] 30-day bounded artifact retention.
- [x] Official actions/upload-artifact, MIT, planning-reviewed exact commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`.
- [x] Full-SHA pin + implementation-time reverification.

## Governance
- [x] T107 → T108 → T109.
- [x] T107/T108 exact-head Project CI 6/6.
- [x] T108 live eligible same-repo self-verification artifact.
- [x] Fresh independent exact-head substantive review.
- [x] Zero unresolved material threads.
- [x] Guarded expected-head merge + post-merge identity proof.
- [x] Separate durable implementation authorization after planning merge.
- [x] No release/tag/publication.

## Result

`PASS_AFTER_MERGE_BASE_AND_TRUST_SCOPE_RECONCILIATION`