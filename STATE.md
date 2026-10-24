Last updated: 2026-10-24 · Branch: ps/ascout-durable-harness

## Current state

Spec018 coordination PR637 is merged as main89e5f01d7b77a92099961dff21e28052e5fa8dcc, with six actual complete native postmerge CI lanes passing. Its closing evidence is remotely verified at evidence/spec018-postmerge-20261024 commit6b3055cc6c36bc9e06ee3e6bc81a36b73e8ed7c0. Completed research and four focused engineering features are preserved; no REA restart.

User-requested Spec020 Task020-T01 implements Ascout Durable Harness: bounded private local call metadata, atomic journal writes and conservative recovery observations using existing workflow contracts. Upstream Apache-2.0 license, notice and pinned provenance are preserved. No automatic effects/retries, model runtime, new dependency, cloud requirement or release authority. PR642 code headf8c0825f936bcac836c77098296888e8c2b1ac10 has 27 new passing cases, 60 focused passing cases, successful typecheck/build and six actual complete hosted suites passing. Fresh separate-context correctness/security reviews resolved the stale never-replay precedence finding. Same-provider lineage is explicit.

Complete local f8 suite remains native1: 2,371 passed, six deadline failures, 34 existing platform skips across 243 files in1,083.29seconds. All27 new cases passed. Failures are in unchanged CLI, Git, drift and T107 tests; unchanged bytes do not prove environmental causation. Production audit reports zero advisories; development audit retains five package entries/two high/three moderate/eight distinct advisories. Whole-product release readiness remains BLOCKED. Final documentation/evidence head, integrated review, guarded merge and resulting main CI remain pending until actual evidence records them.

## Next steps

Finish PR642 public evidence verification, final exact-head reviews/checks, eligible guarded merge and actual postmerge native controls. Preserve local failures and upstream attribution. Resolve E00 timing qualification through a separately coordinated repair on the owning Git/runtime workstream or controlled resource qualification. Development dependency repair requires its prospective bounded audit/qualification; E05 remains deferred. Preserve scope around existing PR589/614 and effective gates. Do not repeat suites blindly, weaken deadlines, restart REA or authorize UA-P07.

## Limitations

Historical failures remain failures. Repeated Git-call latency dominates successful bounded traces, but original failed-stage causation remains unknown. Self Verification green proves valid non-gating capture; actual inner packaging FAIL receipts remain materially incomplete. D1 is advisory only. Alibaba OCR ran local preview/rules without a provider/model verdict; Graft static analysis predates the small f8 correction. Durability native child-process controls ran; no new browser feature makes TesterArmy applicable to Task020. Trusted local journal corruption detection is not authentication or hostile-filesystem protection. No extra founder/provider approval requirement was established for this bounded workflow task by the fresh governance audit. E05 deferred, development advisories explicit. UA-P07 unauthorized. No release-readiness claim.
