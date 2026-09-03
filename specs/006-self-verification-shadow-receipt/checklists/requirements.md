# Spec 006 Requirements Quality Checklist

**Status:** PLANNING REVIEW

## Problem / scope

- [x] Measured gap comes from live canonical repository truth.
- [x] M1.2-A ordering is preserved.
- [x] Scope is self-verification shadow receipt only.
- [x] Selector shadow, corpus expansion, adversarial receipt mutation, and M2 are excluded.
- [x] Product-core mutation is prohibited.

## Git identity / reconstruction

- [x] Exact event base-tip SHA `B` is required as provenance.
- [x] Exact PR head SHA `H` is required.
- [x] Exact head tree `HT = H^{tree}` is required.
- [x] Unique merge base `M = merge-base(B,H)` is required.
- [x] Event base tip `B` is explicitly **not** assumed to be subject HEAD.
- [x] Missing or multiple merge-base results fail closed.
- [x] Exact head-built verifier is distinguished from subject source identity.
- [x] `run.ascout_version` is not treated as exact verifier revision.
- [x] Post-reconstruction `HEAD == M` is required.
- [x] Post-reconstruction `git write-tree == HT` is required.
- [x] Unstaged tracked drift is prohibited.
- [x] Unrelated nonignored untracked files are prohibited.
- [x] Added/deleted/renamed/content-change representation is explicitly testable.
- [x] Advanced-base case `B != M` is an explicit focused proof.

## Trust / admission

- [x] No automatic `--allow-changed-command-surface`.
- [x] No persisted trust grant.
- [x] Valid incomplete/refused receipt remains visible.
- [x] Workflow green is capture-integrity status, not clean receipt truth.

## Receipt integrity

- [x] Exact stdout receipt bytes are retained without rewriting.
- [x] Current head-built JSON Schema validation is required.
- [x] Current head-built semantic validation is required.
- [x] Process exit equals `receipt.summary.exit_code`.
- [x] Receipt source start HEAD must equal `M`.
- [x] Exact receipt SHA-256 is recorded.
- [x] Receipt schema/version is unchanged.
- [x] No synthetic receipt when none is emitted.

## Envelope / privacy

- [x] Envelope is separate from receipt truth.
- [x] `SHADOW_NON_GATING` is explicit.
- [x] Envelope binds verifier H/HT, event B, subject M, target H/HT, receipt exit/digest/filename.
- [x] Raw repository locator, absolute path, actor/user, host/home, environment dump, credentials/secrets are absent.

## Workflow safety

- [x] Separate workflow; current Project CI unchanged.
- [x] Pull-request trigger only.
- [x] `contents: read` only.
- [x] One Ubuntu 24.04 / Node 24 observation lane.
- [x] Exact-head guard.
- [x] Explicit install/build.
- [x] Enough history to resolve B/H and merge base.
- [x] Bounded artifact retention; missing artifact fails upload.
- [x] No repository/PR write permission or secrets.

## Supply chain

- [x] Official `actions/upload-artifact` identified.
- [x] MIT license identified.
- [x] Planning-reviewed `v7.0.1` exact commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`.
- [x] Full-SHA pinning mandatory.
- [x] Implementation-time reverification mandatory.
- [x] Only explicit receipt/envelope files may be uploaded.

## Failure semantics

- [x] Valid exits `0/1/3/4` are observational capture success.
- [x] Exit `2` without valid receipt is harness failure.
- [x] Missing/multiple merge base is harness failure.
- [x] Identity/reconstruction/schema/semantic/digest/artifact failure is visible failure.
- [x] No failure path becomes fabricated PASS.

## Qualification / governance

- [x] Task order T107 → T108 → T109.
- [x] T107/T108 exact-head six-lane Project CI.
- [x] T108 live self-verification artifact on exact final head.
- [x] Fresh independent exact-head substantive review.
- [x] Zero unresolved material threads.
- [x] Guarded expected-head merge.
- [x] Ordered parents/tree/signature/PR/main post-merge proof.
- [x] Planning merge does not authorize implementation.
- [x] Separate durable implementation authorization required.
- [x] No publication/release/tag authorized.

## Result

`PASS_AFTER_MERGE_BASE_RECONCILIATION`

The requirements are testable, bounded, source-bound, privacy-aware, and no longer conflate GitHub event base tip with the PR-change merge base.