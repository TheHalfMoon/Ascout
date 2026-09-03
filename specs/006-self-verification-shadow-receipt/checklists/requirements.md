# Spec 006 Requirements Quality Checklist

**Status:** PLANNING REVIEW

## Problem / scope clarity

- [x] Measured gap is stated from live canonical repository truth.
- [x] M1.2-A ordering is cited from the canonical roadmap candidate.
- [x] Spec 006 is limited to self-verification shadow receipts.
- [x] Selector shadow, historical corpus expansion, adversarial receipt mutation, and M2 capabilities are explicitly excluded.
- [x] Product-core mutation is explicitly prohibited.

## Source / verifier identity

- [x] Exact PR base SHA is required.
- [x] Exact PR head SHA is required.
- [x] Exact PR head tree SHA is required.
- [x] Exact head-built verifier is distinguished from subject repository source identity.
- [x] `run.ascout_version` is not misrepresented as an exact verifier revision.
- [x] Post-reconstruction `HEAD == base` is required.
- [x] Post-reconstruction `git write-tree == head tree` is required.
- [x] Unstaged tracked drift after reconstruction is prohibited.
- [x] Unrelated nonignored untracked files are prohibited.
- [x] Added/deleted/renamed file representation is explicitly testable.

## Trust / admission

- [x] No automatic `--allow-changed-command-surface` is permitted.
- [x] No persisted trust grant is permitted.
- [x] Valid incomplete/refused receipt remains visible.
- [x] Shadow workflow success is not defined as clean repository verification.

## Receipt integrity

- [x] Exact stdout receipt bytes are retained without rewriting.
- [x] Current JSON Schema validation is required.
- [x] Current semantic validation is required.
- [x] Process exit must equal receipt summary exit.
- [x] Exact receipt SHA-256 is recorded.
- [x] No receipt schema/version change is authorized.
- [x] No synthetic receipt is permitted when execution does not produce one.

## Envelope integrity / privacy

- [x] Envelope is separate from receipt truth.
- [x] Envelope schema/version and `SHADOW_NON_GATING` classification are explicit.
- [x] Verifier head/tree, subject base/head/tree, receipt exit, receipt digest, and filename are bound.
- [x] Raw repository locator is absent.
- [x] Absolute paths are absent.
- [x] User/host/home/environment dumps are absent.
- [x] Credentials/secrets are absent.

## Workflow safety

- [x] Separate workflow is preferred over modifying Project CI.
- [x] Trigger is bounded to pull requests.
- [x] Workflow permissions are `contents: read` only.
- [x] One Ubuntu 24.04 / Node 24 shadow lane is sufficient for first observation.
- [x] Exact-head guard is required.
- [x] Install is explicit; no implicit install is attributed to Ascout.
- [x] Artifact retention is bounded.
- [x] Missing artifacts fail upload.
- [x] No PR/repository write permission is justified.
- [x] No secret injection is needed.

## Supply chain / licensing

- [x] New artifact action repository is identified.
- [x] License is identified as MIT.
- [x] Current reviewed release is identified as `v7.0.1`.
- [x] Current reviewed exact commit is `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`.
- [x] Full-SHA pinning is mandatory before implementation.
- [x] Reverification immediately before implementation is mandatory.
- [x] Only explicitly generated files may be uploaded.

## Failure semantics

- [x] Valid receipt exits `0/1/3/4` are observational capture success.
- [x] Exit `2` / no valid receipt is harness failure.
- [x] Identity/reconstruction failure is harness failure.
- [x] Schema/semantic failure is harness failure.
- [x] Digest/envelope mismatch is harness failure.
- [x] Artifact upload failure is visible failure.
- [x] No failure path is converted to fabricated PASS.

## Qualification / governance

- [x] Canonical task order is T107 → T108 → T109.
- [x] T107 and T108 each require exact-head six-lane Project CI.
- [x] T108 additionally requires a live self-verification workflow artifact on its exact final head.
- [x] Fresh independent exact-head review is required for each implementation task.
- [x] Zero unresolved material review threads is required.
- [x] Guarded expected-head merge is required.
- [x] Ordered parents/tree/signature/PR/main post-merge verification is required.
- [x] Planning merge does not authorize implementation.
- [x] Separate durable implementation authorization is required.
- [x] No publication/release/tag is authorized.

## Result

`PASS`

The requirements are specific, testable, bounded, source-bound, privacy-aware, and do not rely on speculative future architecture.