# Task021-T01: reduce redundant Git HEAD metadata processes

Status: CLOSED_CANONICAL for the focused HEAD-query repair, PR643/mainaf5de7d1c56030d8842fc85c334cb8933d63fc08; actual final-head and postmerge six-lane native suites PASS. Complete local control remains FAIL with one browser-disposal deadline. Base main92433f7039393d6a08b8f993bc50da8470de2b5c. The current user instruction, "fix that, and keep working", directs repair of the remaining timing and dependency blockers, subject to effective repository gates. This task addresses the bounded HEAD-query repair under REA-E00; E00 remains BLOCKED and dependency remediation remains a separate task. Closing observations are in qualification/git-head-query/2026-10-24-closeout; this status is not an E00 or release PASS.

## Constitution compliance and intent

Use native Git queries through the existing bounded runner. Preserve source identity, error classification, detached/shallow state, full object IDs, drift detection, receipt truth and command admission. No cache, cross-run identity reuse, new dependency, timeout/skip adjustment, security-phase expansion or UA-P07. Completed Spec018/020 evidence remains historical and intact.

## Observed problem

At clean main92433f7, the unchanged four-file control exits1:39passed, two Git tree-digest deadline failures and nine existing platform skips. Complete-state collection exceeds its original15s deadline; stale-stat collection exceeds its original5s deadline. CLI doctor, drift, large-file and T107 cases pass in this sample; the earlier six failures remain recorded. C: has about5.5GB free, so the observed extra free space is not sufficient to resolve all failures. No claim isolates disk, memory or a single historical cause.

Historical source-bound diagnostic traces show repeated read-only Git launches dominate successful complete-state controls. Current readGitHeadState performs four separate processes for inside-worktree, commit identity, detached state and shallow state. An existing Ascout commitbb7ff354db2bcee9274785b1e69a1cc61ad474ed in draftPR614 contains a bounded two-process fast path with unchanged sequential fallback. This is a candidate, not qualified main behavior.

## Requirements and acceptance

1. Read valid HEAD metadata with one fixed native rev-parse query for inside/shallow/full commit ID and one unchanged symbolic-ref query for detached state. Accept only exact lowercase40/64-hex IDs, exact boolean fields and exact newline/record shape.
2. Any failed, unsupported or malformed batch must use the existing sequential classification path. Preserve nonrepository, unborn HEAD, invalid identity, runner failure, broken ref, detached-state error and shallow-state error behavior. Do not turn unknown metadata into success.
3. Retain existing runner authority, shell:false, timeout, buffer, Windows hiding and source-start/end semantics. Do not adopt PR589's process hardening or PR614's hash/filter batching here.
4. Preserve all existing semantic assertions. Add meaningful fast-path/process-budget and malformed/failure fallback cases; existing native deadline tests remain byte-identical. Demonstrate the new budget assertions fail on old source before implementation.
5. Record an actual Git subprocess-count/latency comparison via the existing injected-runner seam, with identical controlled fixture/output and separately bound baseline/candidate source. This diagnostic is not a substitute for uninstrumented native tests.
6. Run strict typecheck/build, identity/digest/drift/CLI/T107 controls and the complete unchanged canonical suite locally; preserve every result. Applicable exact-head six-lane Project CI, Self capture, fresh correctness/security review, live threads and guarded merge/postmerge proof remain required.
7. Do not claim E00 resolved or release readiness before an actually passing final complete local control and qualified integrated main. If another failure remains, diagnose it prospectively rather than weaken, skip or relabel it.

## Clarification and bounded coordination

The latest user direction authorizes a prospective main-based repair. Source ownership is coordinated by explicitly selecting only the HEAD-query subset of existing PR614 as the candidate, preserving that draft and PR589 unchanged. No unlanded security/hashing code is treated as canonical or required. This task independently tests/adapts the small existing Ascout change against current main and documents its original commit. It does not merge or close either draft, take their broader scope, or imply their gates passed. A fresh gate-applicability/plan audit must confirm this scoped interpretation before code edits.

## First reduction

Two queries plus existing sequential fallback; no general batching framework, memoization, persistent cache, executor rewrite, Git installation/configuration change, environment cleanup, deadline increase or new test runner. No dependency upgrade in this PR.

## Hard stops

No edits to command/config authority, policy, workflows, package/lock, tree-digest algorithm/filter execution, security adapters or unrelated branches. An independently required gate is never replaced by D1 or a shared-provider claim. No paid service, release/deployment or UA-P07 authority is inferred.
