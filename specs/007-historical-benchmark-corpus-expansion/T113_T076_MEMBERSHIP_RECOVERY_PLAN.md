# T113 T076 Membership-Proof Recovery Plan

**Status:** `PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`  
**Planning ledger:** Issue #217  
**Publication ledger:** Issue #208  
**Canonical planning base:** `f1ab8e36e6710287523cd4c029f55ca2bf57347d`  
**Canonical planning-base tree:** `821db43ba09624e05b8d29f1ab9541f786481354`

## Purpose

Define the smallest evidence-preserving recovery after the first and only authorized T113 metrics execution attempt failed inside T076 project-native full-suite membership instrumentation.

This file is planning only. It grants no benchmark-code, test, workflow, execution-ref, result, product, selector, schema, dependency, runtime, donor, oracle, manifest, replay, or historical-result authority.

Implementation may begin only after this exact final planning head is independently reviewed, canonically merged, post-merge verified, Issue #217 is durably closed, and a separate implementation-authorization artifact becomes canonical and effective.

## Canonical authority chain

Read this plan with, in precedence order:

1. `.specify/memory/constitution.md`;
2. `CONTRIBUTING.md`;
3. canonical Spec 007 specification/plan/tasks/implementation authority;
4. `T113_METRICS_RECOVERY_PLAN.md`;
5. `T113_METRICS_RECOVERY_IMPLEMENTATION_AUTHORIZATION.md`;
6. Issue #208;
7. Issue #217;
8. immutable workflow run `34130848099`, attempt `1`, job `101770327800`.

Live repository/GitHub truth overrides stale status text in historical artifacts.

## Immutable trigger evidence

R007-05 and R007-06 were canonically qualified before execution. The mandatory T113 preflight passed, then the exact single-use ref was created once:

- ref: `run/spec007-t113-metrics-r1`;
- source/workflow SHA: `f1ab8e36e6710287523cd4c029f55ca2bf57347d`;
- source tree: `821db43ba09624e05b8d29f1ab9541f786481354`;
- run: `34130848099`;
- attempt: `1`;
- job: `101770327800`;
- conclusion: `failure`.

The run succeeded through exact ref/source admission, checkout/architecture/toolchain guards, Ascout install/build, frozen T091/T111/T112 acquisition and digest verification, historical T111 manifest/Jotai compatibility proof, frozen T078/T091/T095 blob checks, qualified replay admission, and R007-05 materialization prerequisites.

It then failed in the first Jotai T076 comparator collection with:

`oracle_membership: Error: membership audit did not produce a runner JSON report`

The stack binds the failure to `benchmarks/metrics.mjs` during the `project-native full suite` membership audit, before Jotai plain/related/Ascout completion, before Immer, before T077, before aggregate construction, and before candidate-artifact upload.

Therefore:

`T113 = RETURN_TO_PLANNING / T076_FULL_SUITE_MEMBERSHIP_PROOF_GAP`

The `r1` ref/run are immutable failure evidence. They MUST NOT be moved, force-updated, deleted/recreated, reused, or rerun for qualification.

## What remains qualified

The failure does not invalidate:

- T111 or T112 qualification;
- the frozen T091 six-case aggregate inputs;
- R007-05 qualified replay validation/materialization;
- the exact T111 revision-12-to-13 compatibility proof;
- T076 metric formulas;
- T077 assertion formulas;
- selector/product behavior;
- donor/oracle identities;
- frozen T078/T091/T095 publication bytes.

No part of the failed T113 run may be reclassified as successful publication evidence.

## Evidence-backed failure model

### Proven T075 behavior

Qualified Jotai T111 run `33991920845` used `jotai-splitatom-identical-write@1`, Linux x64, Node `24.15.0`, and Yarn Classic `1.22.22`. Both T075 observations produced valid project-native full-suite runner JSON membership evidence.

Canonical `benchmarks/run.mjs` clears its known ignored membership-runtime cache paths immediately before membership-proof execution, then runs the existing reporter-only proof and preserves fail-closed membership/source-state rules.

### Observed T076 behavior

Canonical `benchmarks/metrics.mjs` already defines the same four managed runner-cache paths in `MANAGED_RUNNER_CACHE_PATHS` and already uses `clearIgnoredPath(...)` / `clearColdCaches(...)` for cold timing preparation. Its `membershipAudit(...)`, however, restores tracked measured source and then executes membership instrumentation without clearing those managed ignored runner caches after the preceding warm comparator run.

The T113 failure therefore proves a lifecycle-preparation divergence between the successful T075 proof path and the failing T076 proof path.

### Causation remains unproven

The evidence does **not** prove that this divergence caused the missing report, does not identify a particular cache path as causal, and does not justify a fallback or retry.

The recovery is allowed to test the narrow parity hypothesis. If deterministic focused evidence cannot prove a two-path repair, implementation MUST stop and return to planning.

## Invariants

The recovery MUST preserve:

1. project-native full-suite membership as **required structured-report evidence**;
2. no synthetic report, assertion execution, membership, hit, miss, or availability fact;
3. the exact reviewed comparator command and restricted-command parsing;
4. existing `membershipProofCommand(...)`, membership proxy/preload, runner-kind selection, reporter/output contract, and oracle-id matching;
5. existing cold/warm timing observations and cache-class meaning;
6. fail-closed missing/malformed/invalid required membership evidence;
7. R007-05 source/replay/materialization/runtime/lockfile/anti-leakage identity gates;
8. all metric and assertion formulas/output meaning;
9. product/selector/receipt/schema/CLI behavior;
10. immutable T111/T112 replay evidence;
11. immutable T078/T091/T095 result bytes.

## Ponytail / YAGNI reduction

Rejected alternatives:

- **Required-membership no-report fallback:** would weaken evidence truth.
- **Reuse T075 membership evidence in T076:** would cross observation boundaries instead of observing current comparator execution.
- **Rerun `r1`:** consumed single-use authority cannot be replayed to green.
- **Shared instrumentation/framework refactor:** no evidence justifies changing `run.mjs`, `harness-lib.mjs`, adding a framework, dependency, adapter, or generalized runner abstraction.
- **Comparator-command rewrite:** would change the measured contract to obtain evidence.

Preferred direction: test whether preparing the already-defined T076 managed runner caches immediately before membership instrumentation restores valid required-report behavior, without changing any other comparator or evidence semantics.

## R007-07 — T076 required-membership proof parity

R007-07 remains implementation-ineligible until a separate implementation authorization becomes canonical/effective.

### Prospective exact tracked mutation surface

Exactly:

- `benchmarks/metrics.mjs`;
- `tests/benchmark-metrics.test.ts`.

No other tracked path is planned.

### Required behavior

R007-07 MUST:

1. reuse the existing `MANAGED_RUNNER_CACHE_PATHS` set in `benchmarks/metrics.mjs` exactly as currently defined:
   - `.nx/cache`;
   - `.nx/workspace-data`;
   - `.cache`;
   - `node_modules/.cache`;
2. reuse the existing ignored-path validation/removal logic rather than creating a new cache taxonomy or shared framework;
3. prepare those paths after cold/warm timed comparator collection and immediately before T076 membership-proof instrumentation;
4. keep cold/warm timing measurements and cache-class semantics unchanged;
5. keep tracked-source restoration and measured-path validation unchanged;
6. execute the existing membership proof exactly once with the same command, expected exit code, runner kind, environment sanitation, and output-path contract;
7. keep at least one valid external JSON report mandatory for required full-suite membership;
8. keep report size limits, JSON structure checks, assertion matching, and observed oracle-id calculation unchanged;
9. keep missing, empty, oversized, malformed, structurally invalid, and exit-mismatched proof evidence fail-closed;
10. add no retry, fallback, inferred equivalence, synthesized report, new persisted field, or publication exception;
11. change no qualified replay/materialization semantics or metric/assertion formula.

If this requires `benchmarks/run.mjs`, `benchmarks/harness-lib.mjs`, comparator-command changes, membership-policy changes, metric/assertion changes, product/selector/schema changes, dependencies, donor/oracle changes, or generalized architecture, R007-07 is `NO_GO / RETURN_TO_PLANNING` and MUST NOT widen itself.

### Focused regression evidence

Tests MUST deterministically prove at least:

1. the T076 membership audit prepares exactly the existing managed ignored runner-cache paths immediately before proof execution;
2. cleanup remains path-contained and rejects a managed path if donor Git does not classify it as ignored;
3. a local fixture representing stale ignored runner-cache state can exercise the repaired proof path without donor-network or GitHub-artifact access;
4. the positive case yields genuine structured runner JSON and required oracle membership only from the actual report;
5. no-report remains a hard failure;
6. malformed JSON remains rejected;
7. a report lacking `testResults` remains rejected;
8. instrumentation exit-code mismatch remains rejected;
9. existing valid structured-report/oracle-id matching behavior is unchanged;
10. existing qualified replay/materialization and aggregate/metric tests remain green.

Tests MAY use temporary local fixtures and an internal benchmark-module export if needed for deterministic testability, but MUST NOT create a new public product API or persisted contract.

If deterministic focused tests cannot establish the repair within the exact two-path scope, stop and return to planning; do not use a successor T113 workflow run as the diagnostic test.

### R007-07 qualification

Before merge require:

- exact two-path purity;
- focused positive/adversarial regression evidence;
- applicable typecheck/test/build;
- exact-head Self Verification;
- original-attempt exact-head six-lane Project CI success;
- fresh independent substantive exact-head correctness/security/governance review;
- reconciliation of every material finding on the current head;
- zero unresolved material review threads;
- current ruleset/observable protection verification;
- unchanged expected canonical `main` and exact PR head immediately before merge;
- guarded merge with `expected_head_sha`;
- post-merge ordered-parent/tree/signature/PR/main/path proof;
- durable `R007-07 = CLOSED_CANONICAL / QUALIFIED`.

Any head mutation invalidates prior CI/review qualification.

## R007-08 — successor single-use T113 execution binding

R007-08 is blocked until R007-07 is durably qualified and separate authority explicitly names the successor ref.

### Prospective exact tracked mutation surface

Exactly:

- `.github/workflows/spec-007-t113-metrics.yml`.

### Exact successor candidate

`run/spec007-t113-metrics-r2`

This plan does not authorize that ref. A separate effective implementation authorization must name it before workflow mutation or ref creation.

The consumed `run/spec007-t113-metrics-r1` must remain untouched.

### Required executor preservation

A future R007-08 amendment may admit only exact `r2` while preserving current R007-06 controls:

- GitHub `create` event only;
- branch ref type only;
- run attempt `1` only;
- exact event/workflow/source SHA equality and checkout guard;
- least privileges;
- Ubuntu 24.04 / Linux x64;
- Node `24.15.0`, Yarn Classic `1.22.22`;
- exact immutable T091/T111/T112 identities/digests;
- exact historical T111 compatibility proof;
- frozen T078/T091/T095 blob checks;
- no new T075 replay;
- unchanged T077/aggregate/candidate construction;
- bounded artifact retention;
- no direct repository write;
- no wildcard, arbitrary input, generalized executor, or rerun-to-green path.

### Mandatory fresh preflight

Immediately before creating `r2`, prove from live truth:

1. exact current `main` and R007-07/R007-08 canonical merge identities;
2. T091 run/artifact availability and archive digest;
3. T111/T112 run/artifact availability and replay/evidence digests;
4. historical T111 manifest blob and historical/current Jotai canonical equality;
5. frozen T078/T091/T095 blobs;
6. current manifest/case identities;
7. absence of `run/spec007-t113-metrics-r2`;
8. absence of any prior T113 executor create-run for `r2`;
9. unchanged existence/identity of consumed `r1`;
10. exact workflow source/toolchain constraints.

Any failed gate returns to planning before ref creation.

Create `r2` exactly once from exact then-canonical `main`. Only its first create-event run at attempt `1` can qualify. Failure is final for that binding; no rerun/move/recreation/substitution.

## T113-R3 publication

Eligible only after a genuine successful `r2` attempt-1 run produces a valid bounded candidate artifact.

Prospective publication mutation remains exactly:

- `benchmarks/results/t113-historical-corpus-expansion.json`.

Publication must validate exact source/run/artifact/machinery identities, publish the complete eight-case facts, preserve `hit | miss | unavailable` and availability counts, keep `no_pre_data_recall_threshold = true`, keep absolute assertions, and preserve T078/T091/T095 blobs exactly.

Then require exact one-path purity, focused validation, Self Verification, six-lane Project CI, fresh independent exact-head review, zero material threads, guarded merge, and post-merge proof before durable:

`T113 = CLOSED_CANONICAL / QUALIFIED`

## T114 reconciliation

T114 remains blocked until T113 closes canonically. It is ledger/governance only by default and must record the failed `r1`, any R007-07/R007-08 recovery identities, successful `r2` evidence if achieved, final eight-case facts, historical-result immutability, absolute assertions, runtime/candidate friction, and explicit confirmation that selector/product behavior was not changed in response to benchmark results.

Close `SPEC_007 = CLOSED_CANONICAL / GO` only on genuine acceptance proof; otherwise use `NO_GO / RETURN_TO_PLANNING`.

## Exact-head planning audit checklist

A fresh independent reviewer MUST verify:

1. `r1`/run `34130848099` remains immutable failure evidence.
2. The plan distinguishes observed T075/T076 lifecycle divergence from unproven causation.
3. Missing required full-suite membership can never become success, unavailable-by-convenience, observed-false fallback, or synthetic evidence.
4. Cache preparation occurs only after timed cold/warm collection.
5. R007-07 reuses the existing four-path T076 managed-cache set and existing ignored-path validation.
6. Membership proxy/preload, command argv, runner kind, reporter semantics, and oracle-id matching remain unchanged.
7. R007-07 is exactly two tracked paths and returns to planning if insufficient.
8. Focused tests cover positive local proof plus path/ignore, no-report, malformed-report, missing-`testResults`, exit-mismatch, and unchanged structured-report behavior.
9. T075, T111/T112, R007-05 identity semantics, donor/oracle identities, metrics/assertions, product/selector, and historical results remain unchanged.
10. Successor execution is isolated to separately authorized exact `run/spec007-t113-metrics-r2`, create-event attempt 1 only.
11. Publication remains one additive path after genuine successful evidence.
12. No new framework/dependency/service/plugin/generalized workflow surface is introduced.
13. This planning artifact grants zero implementation/ref/publication authority.

Any `NO` answer is a material planning finding.

## Planning qualification and closeout

PR qualification requires:

1. exact one-path planning purity;
2. exact final head/tree verification;
3. applicable exact-head repository checks;
4. exact-head Self Verification;
5. original-attempt exact-head Project CI six-lane success;
6. fresh independent substantive exact-head planning/correctness/security/governance review;
7. reconciliation of every material finding;
8. zero unresolved material review threads;
9. current ruleset/observable protection verification;
10. unchanged expected canonical `main` and exact PR head before merge;
11. guarded merge with `expected_head_sha`;
12. post-merge ordered-parent/tree/signature/PR/main/path verification;
13. durable Issue #217 planning closeout.

Any head mutation invalidates earlier CI/review qualification.

After planning closeout, create a separate implementation-authorization artifact. Do not mutate R007-07 from planning authority.

## Hard prohibitions

- no rerun/move/delete/recreate/reuse of `r1` or run `34130848099`;
- no required-membership fallback or synthetic runner evidence;
- no comparator-command rewrite to obtain a report;
- no metric/assertion weakening or post-data acceptance threshold;
- no selector/product/schema/receipt/CLI mutation;
- no T111/T112 replay rerun/rewrite;
- no donor/oracle/runtime substitution;
- no historical-result rewrite;
- no generalized framework or arbitrary workflow input;
- no force-push/rebase/destructive history rewrite;
- no stale CI/review reuse after head mutation;
- no fabricated CI, review, authority, evidence, mergeability, qualification, readiness, or completion.

## Current disposition

`T113_T076_MEMBERSHIP_RECOVERY_PLAN = PENDING_EXACT_HEAD_QUALIFICATION`
