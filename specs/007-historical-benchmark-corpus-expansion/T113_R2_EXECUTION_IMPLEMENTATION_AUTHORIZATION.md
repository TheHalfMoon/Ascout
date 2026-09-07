# T113 R2 Execution Implementation Authorization

**Spec:** 007  
**Status:** `AUTHORIZATION_PENDING_MERGE`  
**Authorization ledger:** Issue #226  
**Recovery planning ledger:** Issue #217 (`CLOSED / COMPLETED`)  
**R007-07 implementation ledger:** Issue #224 (`CLOSED_CANONICAL / QUALIFIED`)  
**T113 publication ledger:** Issue #208  
**Canonical authorization base:** `ce88cd146a1fec9131febe072170958a24599c33`  
**Canonical authorization-base tree:** `1d027812ab961ca06e0007d9af89f55d61ac9bcc`

## Purpose

Prospectively authorize only R007-08, the bounded successor single-use T113 execution-binding amendment defined by the canonical T076 membership-recovery plan.

This artifact becomes effective only after its exact final head is independently qualified, guarded-merged, post-merge verified, and Issue #226 is durably closed as:

`R007-08_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`

Before that closeout it authorizes no workflow mutation, execution-ref creation, T113 execution, result publication, or T114 work.

## Canonical authority chain

Read this authorization with, in precedence order:

1. `.specify/memory/constitution.md`;
2. `CONTRIBUTING.md`;
3. canonical Spec 007 specification, plan, tasks, and implementation authority;
4. `specs/007-historical-benchmark-corpus-expansion/T113_METRICS_RECOVERY_PLAN.md`;
5. `specs/007-historical-benchmark-corpus-expansion/T113_METRICS_RECOVERY_IMPLEMENTATION_AUTHORIZATION.md`;
6. `specs/007-historical-benchmark-corpus-expansion/T113_T076_MEMBERSHIP_RECOVERY_PLAN.md`;
7. Issue #208;
8. Issue #217 canonical planning closeout;
9. Issue #224 canonical R007-07 closeout;
10. Issue #226;
11. immutable failed T113 run `34130848099`, attempt `1`, job `101770327800`.

Live repository/GitHub truth overrides stale status text in historical artifacts.

## Canonical R007-07 prerequisite

The bounded T076 required-membership proof-parity repair is canonically qualified and merged as:

- implementation ledger: Issue #224 — `R007-07 = CLOSED_CANONICAL / QUALIFIED`;
- implementation PR: #225 — MERGED;
- exact qualified implementation head: `c976c3e4c52e9a9a15d95e36890887f8164d865c`;
- canonical merge / authorization base: `ce88cd146a1fec9131febe072170958a24599c33`;
- canonical merge tree: `1d027812ab961ca06e0007d9af89f55d61ac9bcc`;
- ordered parents:
  1. `c0e54673d52c492d03307d300285d7f7e5db9a08`;
  2. `c976c3e4c52e9a9a15d95e36890887f8164d865c`;
- GitHub merge verification: `verified=true`, `reason=valid`;
- exact-head Self Verification: run `34148265989`, SUCCESS;
- original-attempt exact-head Project CI: run `34148266044`, all six required lanes SUCCESS without rerun;
- fresh independent exact-head CodeRabbit review: run `665457d6-691b-4de9-914b-2ef064ea59cd`, no actionable comments;
- unresolved material review threads: zero.

R007-07 changed exactly `benchmarks/metrics.mjs` and `tests/benchmark-metrics.test.ts`. It changed no workflow or execution ref and did not create a T113 candidate artifact.

## Immutable failed execution evidence

The consumed first T113 execution remains final failure evidence:

- ref: `run/spec007-t113-metrics-r1`;
- source/workflow SHA: `f1ab8e36e6710287523cd4c029f55ca2bf57347d`;
- source tree: `821db43ba09624e05b8d29f1ab9541f786481354`;
- run: `34130848099`;
- attempt: `1`;
- job: `101770327800`;
- conclusion: `failure`;
- failure: `oracle_membership: Error: membership audit did not produce a runner JSON report`;
- no T113 candidate artifact produced.

The `r1` ref/run MUST NOT be rerun, moved, force-updated, deleted/recreated, reused, or reclassified as successful evidence.

## Authorized unit after this artifact becomes effective

Exactly:

`R007-08 — successor single-use T113 execution binding`

No later unit becomes authorized by implication.

## Exact tracked mutation surface for R007-08

Exactly:

- `.github/workflows/spec-007-t113-metrics.yml`.

No second tracked path is authorized. If implementation requires any other tracked path, R007-08 is `NO_GO / RETURN_TO_PLANNING`.

## Exact successor binding

The only successor execution-ref candidate authorized for the future R007-08 implementation is:

`run/spec007-t113-metrics-r2`

R007-08 MAY amend only the existing static admission/binding points that currently require `run/spec007-t113-metrics-r1` so they require exact `run/spec007-t113-metrics-r2` instead.

The implementation MUST NOT create `r2`. The workflow amendment must be canonically qualified, merged, post-merge verified, and durably closed before the mandatory fresh preflight. Only after that preflight passes every gate may `r2` be created exactly once from exact then-canonical `main`.

## Required executor preservation

R007-08 MUST preserve the existing R007-06 executor contract unchanged except for the exact static successor-ref binding:

1. GitHub `create` event only;
2. branch ref type only;
3. run attempt `1` only;
4. exact event/workflow/source SHA equality via `github.sha == github.workflow_sha`;
5. exact checked-out HEAD guard against both source and workflow SHA;
6. least privileges: `contents: read` and `actions: read` only;
7. Ubuntu `24.04`, Linux `x64` architecture guard;
8. exact Node `24.15.0`;
9. exact Yarn Classic `1.22.22`;
10. exact Ascout lockfile install/build with source-stability checks;
11. exact frozen T091 run `33428011206`, artifact `9773332273`, and archive SHA-256 `e544d8d9bb00552c65a54f601ad3f57a78ddfa030edcfb87af3549748de13665`;
12. exact frozen T111 run `33991920845`, artifact `9976936986`, replay/evidence identity checks;
13. exact frozen T112 run `34036997231`, artifact `9990519748`, replay/evidence identity checks;
14. exact historical T111 manifest acquisition from commit `2955969c16a456c44da8dd4c1e31f8ad3fa6f9a4` and blob `ec4e9edde7bcf635063e23ee612cbad20712de6d`;
15. exact historical/current Jotai canonical equality proof;
16. frozen T078/T091/T095 result-blob checks;
17. R007-05 qualified replay admission/materialization route only, with no new T075 oracle replay;
18. T076 execution only for Jotai and Immer under the existing workflow contract;
19. unchanged T077 assertions for both new T076 results;
20. aggregation of exactly the six frozen T091 case inputs plus the two new case inputs;
21. unchanged aggregate metrics/assertion semantics and requirement for `ABSOLUTE_ASSERTIONS_SATISFIED`;
22. factual comparator availability accounting and `no_pre_data_recall_threshold = true`;
23. one bounded candidate artifact for later publication only;
24. bounded artifact retention;
25. no direct repository publication from the workflow.

No metric, assertion, comparator, membership, replay/materialization, donor, oracle, product, selector, receipt, schema, CLI, manifest, dependency, runtime, or historical-result semantic may change under R007-08.

## Mandatory fresh preflight after R007-08 closeout

The implementation closeout MUST NOT itself create or execute `r2`.

Immediately before `r2` creation, a separate read-only preflight MUST prove from live truth:

1. exact current canonical `main`;
2. exact R007-07 and R007-08 canonical merge identities;
3. T091 run/artifact availability and archive digest;
4. T111/T112 run/artifact availability and replay/evidence digests;
5. historical T111 manifest blob and historical/current Jotai canonical equality;
6. frozen T078/T091/T095 blobs;
7. current manifest/case identities;
8. absence of `run/spec007-t113-metrics-r2`;
9. absence of any prior T113 executor create-run for `r2`;
10. unchanged existence/identity of consumed `r1`;
11. exact workflow source/toolchain constraints.

Any failed preflight gate returns to planning before ref creation.

If all gates pass, create `run/spec007-t113-metrics-r2` exactly once from exact then-canonical `main`. Only its first create-event run at attempt `1` can qualify. Failure is final for that binding; no rerun, ref movement, deletion/recreation, or substitute execution is authorized.

## Explicitly unauthorized under R007-08

The following are not authorized:

- any tracked path other than `.github/workflows/spec-007-t113-metrics.yml`;
- creation or mutation of `run/spec007-t113-metrics-r2` during implementation;
- any mutation of `run/spec007-t113-metrics-r1`;
- `workflow_dispatch`;
- wildcard refs;
- arbitrary workflow inputs;
- generalized or reusable executor abstractions;
- retries or rerun-to-green behavior;
- direct repository writes/publication from the workflow;
- T111/T112 rerun or rewrite;
- T078/T091/T095 rewrite;
- benchmark-code or test changes;
- manifest or dependency changes;
- metric/assertion/comparator/membership-policy changes;
- product/selector/schema/receipt/CLI changes;
- donor/oracle/runtime substitution;
- T113 result publication;
- T114 reconciliation;
- force-push/rebase/destructive history rewrite.

## Dependency order after this authorization

Only after this authorization is canonically effective:

`R007-08 implementation -> R007-08 qualified closeout -> mandatory fresh read-only preflight -> exact r2 creation once -> r2 attempt-1 disposition -> conditional T113-R3 publication -> T114`

T113-R3 remains separately conditional on a genuine successful `r2` attempt-1 run producing a valid bounded candidate artifact.

## R007-08 implementation qualification and closeout

Before a future R007-08 workflow implementation may merge, require:

- exact one-path workflow purity;
- focused workflow/security validation;
- exact final head/tree verification;
- exact-head Self Verification;
- original-attempt exact-head Project CI six-lane success;
- fresh independent substantive exact-head workflow/security/governance review;
- reconciliation of every material finding, with any head mutation invalidating prior CI/review evidence;
- zero unresolved material review threads;
- current ruleset/observable protection verification;
- unchanged expected canonical `main` and exact PR head immediately before guarded merge;
- guarded merge with `expected_head_sha`;
- post-merge ordered-parent/tree/signature/PR/main/path verification;
- durable `R007-08 = CLOSED_CANONICAL / QUALIFIED` before mandatory preflight or `r2` creation.

## Authorization qualification and effectivity

This authorization artifact itself may become effective only after:

1. exact one-path additive authorization-artifact purity;
2. exact final authorization head/tree verification;
3. applicable exact-head repository checks;
4. exact-head Self Verification;
5. original-attempt exact-head Project CI six-lane success;
6. fresh independent substantive exact-head authorization/workflow-security/governance review;
7. reconciliation of every material finding;
8. zero unresolved material review threads;
9. current ruleset/observable protection verification;
10. unchanged expected canonical `main` and exact authorization PR head immediately before guarded merge;
11. guarded merge with `expected_head_sha`;
12. post-merge ordered-parent/tree/signature/PR/main/path verification;
13. durable Issue #226 closeout as `R007-08_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`.

Any authorization-head mutation invalidates prior CI/review qualification.

## Hard prohibitions

- no workflow implementation before this authorization is effective;
- no `r2` creation before R007-08 implementation closeout plus a passing fresh preflight;
- no rerun/move/delete/recreate/reuse of `r1` or run `34130848099`;
- no mutation beyond the exact authorized workflow path during R007-08;
- no execution-ref wildcard or arbitrary input;
- no evidence weakening or fabricated execution facts;
- no metric/assertion weakening;
- no selector/product/schema/receipt/CLI mutation;
- no donor/oracle/runtime substitution;
- no replay or historical-result rewrite;
- no generalized workflow framework;
- no stale CI/review reuse after head mutation;
- no fabricated CI, review, authority, evidence, qualification, mergeability, readiness, or completion.
