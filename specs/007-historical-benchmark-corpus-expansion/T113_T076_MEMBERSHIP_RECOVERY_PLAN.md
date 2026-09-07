# T113 T076 Membership-Proof Recovery Plan

**Status:** `PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`  
**Planning ledger:** Issue #217  
**Publication ledger:** Issue #208  
**Canonical planning base:** `f1ab8e36e6710287523cd4c029f55ca2bf57347d`  
**Canonical planning-base tree:** `821db43ba09624e05b8d29f1ab9541f786481354`

## Purpose

Define the smallest evidence-preserving recovery after the first and only authorized T113 metrics execution attempt failed inside T076 project-native full-suite membership instrumentation.

This plan authorizes no implementation. It does not authorize mutation of benchmark code, tests, workflows, execution refs, results, product code, selector code, manifests, dependencies, runtime/toolchain, donor source, oracle definitions, qualified replay artifacts, or historical results.

Implementation may begin only after this exact final planning head is independently reviewed, canonically merged, post-merge verified, the planning ledger is durably closed, and a separate implementation-authorization artifact becomes canonical and effective.

## Canonical authority chain

This plan is subordinate to and must be read with:

1. `.specify/memory/constitution.md`;
2. `CONTRIBUTING.md`;
3. `specs/007-historical-benchmark-corpus-expansion/IMPLEMENTATION_AUTHORIZATION.md`;
4. `specs/007-historical-benchmark-corpus-expansion/spec.md`;
5. `specs/007-historical-benchmark-corpus-expansion/plan.md`;
6. `specs/007-historical-benchmark-corpus-expansion/tasks.md`;
7. `specs/007-historical-benchmark-corpus-expansion/T113_METRICS_RECOVERY_PLAN.md`;
8. `specs/007-historical-benchmark-corpus-expansion/T113_METRICS_RECOVERY_IMPLEMENTATION_AUTHORIZATION.md`;
9. Issue #208;
10. Issue #217;
11. immutable workflow run `34130848099`, attempt `1`, job `101770327800`.

Live repository/GitHub truth overrides stale status text in historical planning/authorization artifacts.

## Trigger and immutable failure evidence

R007-05 and R007-06 were already canonically qualified before execution. The mandatory T113 preflight then passed and the exact single-use execution ref was created once:

- ref: `run/spec007-t113-metrics-r1`;
- source/workflow SHA: `f1ab8e36e6710287523cd4c029f55ca2bf57347d`;
- source tree: `821db43ba09624e05b8d29f1ab9541f786481354`;
- run: `34130848099`;
- run attempt: `1`;
- job: `101770327800`;
- conclusion: `failure`.

The run succeeded through:

- single-use create-event admission;
- exact source/workflow/checkout binding;
- clean-source and architecture guards;
- Ubuntu 24.04 / Linux x64;
- Node `24.15.0` and Yarn Classic `1.22.22`;
- exact Ascout dependency install/build;
- T091/T111/T112 immutable run/artifact retrieval;
- T091 archive digest verification;
- T111/T112 replay JSON and canonical evidence digest verification;
- historical T111 manifest blob verification;
- historical/current Jotai case canonical equality;
- frozen T078/T091/T095 result-blob checks;
- qualified replay input admission;
- R007-05 measured-worktree reconstruction prerequisites.

It then failed in the first Jotai T076 comparator collection with:

`oracle_membership: Error: membership audit did not produce a runner JSON report`

The stack binds the failure to `benchmarks/metrics.mjs` during `project-native full suite` membership audit, before Jotai plain/related/Ascout comparator completion, before Immer execution, before T077, before aggregate construction, and before candidate artifact upload.

Therefore:

`T113 = RETURN_TO_PLANNING / T076_FULL_SUITE_MEMBERSHIP_PROOF_GAP`

The failed ref/run remain immutable evidence and MUST NOT be moved, force-updated, deleted/recreated, reused, or rerun for qualification.

## What the failure does not invalidate

This failure does not invalidate:

- T111 qualification;
- T112 qualification;
- the frozen T091 six-case aggregate-input artifact;
- R007-05 qualified replay validation/materialization semantics;
- the T111 revision-12-to-13 exact compatibility proof;
- the frozen T078/T091/T095 publication bytes;
- T076 metric formulas;
- T077 assertion formulas;
- selector/product behavior;
- donor or oracle identities.

No evidence permits reclassifying the failed T113 run as success or partial publication evidence.

## Evidence-backed failure model

### T075 reference behavior

The qualified Jotai T111 replay run `33991920845` used the same case identity and the same qualified platform/toolchain class:

- `jotai-splitatom-identical-write@1`;
- Linux x64;
- Node `24.15.0`;
- Yarn Classic `1.22.22`.

Both T075 observations successfully proved project-native full-suite oracle membership with runner JSON assertion reports.

Canonical `benchmarks/run.mjs` performs explicit membership-proof lifecycle preparation. In particular, before proof execution it clears the repository's known ignored membership-runtime cache paths and then executes the existing reporter-only proof with source-state reconciliation.

### T076 observed divergence

Canonical `benchmarks/metrics.mjs` contains a separate `membershipAudit(...)` implementation. It restores measured tracked source and invokes `membershipProofCommand(...)`, but does not perform the same ignored membership-runtime cache preparation before the proof. Its report collector requires at least one valid runner JSON report and fails closed when none exists.

The T113 run executed fresh cold/warm comparator commands immediately before this proof. A difference in ignored runner/runtime cache state therefore exists between the proven T075 membership-proof lifecycle and the failing T076 membership-proof lifecycle.

### What is proven vs. what is only a hypothesis

Proven:

1. T075 full-suite required membership produced valid runner JSON for this exact qualified Jotai case/environment class.
2. T076 full-suite required membership did not produce a runner JSON report in run `34130848099`.
3. T075 clears known ignored membership-runtime cache paths before membership proof.
4. T076 currently does not perform that preparation before membership proof.
5. The T076 failure occurred after comparator execution and before later comparator/case stages.

Not yet proven:

- that stale ignored membership-runtime cache state is the sole cause;
- which exact cache path, if any, suppresses the report;
- that any fallback or retry would be safe or necessary.

The implementation unit must prove the smallest repair with deterministic focused evidence. If the two-path repair cannot be proven, it fails closed and returns to planning.

## Requirements and invariants

The recovery MUST preserve all of the following:

1. **Required membership remains required.** Project-native full-suite membership is not allowed to become `observed`, optional, inferred, or unavailable-by-convenience.
2. **No synthetic report.** No JSON report, assertion execution, oracle membership, hit, miss, or availability fact may be manufactured.
3. **No command rewrite.** The reviewed comparator command under proof remains byte/argv equivalent under the existing restricted-command contract.
4. **No reporter semantic change.** Existing `membershipProofCommand(...)`, membership proxy/preload behavior, runner-kind selection, output-file convention, and `observedOracleTestIds(...)` semantics remain unchanged.
5. **No timing rewrite.** Existing cold/warm comparator timing observations are collected exactly as today. Cache preparation for membership proof must happen only after those timed observations and must not retroactively redefine their cache classes.
6. **Fail closed.** If required membership still produces no valid external JSON report after authorized preparation, T076 fails; it does not classify the comparator as successful without membership.
7. **Source binding remains intact.** Tracked measured source, qualified derived/synthetic identities, runtime/toolchain equality, lockfile identity, anti-leakage, and source-state checks remain unchanged.
8. **No metric/assertion changes.** `benchmarks/metrics-lib.mjs`, `benchmarks/assertions-lib.mjs`, metric formulas, aggregate formulas, absolute assertions, and publication semantics remain unchanged.
9. **No product/selector change.** `src/**`, receipt/schema/CLI behavior, selector logic, and command admission remain unchanged.
10. **No replay rewrite.** T111/T112 evidence remains immutable and no replay is rerun.
11. **No historical rewrite.** T078/T091/T095 blobs remain byte-identical.

## Ponytail / YAGNI reduction

### Rejected: add a no-report fallback for required membership

Rejected because it would weaken the evidence contract and could convert a proof failure into apparent comparator evidence.

### Rejected: reuse the T075 full-suite membership result from the qualified replay

Rejected because T113 requires fresh T076 comparator observations over the materialized measured worktree. Reusing historical T075 membership would cross observation boundaries and could conceal current execution failure.

### Rejected: rerun T113 `r1`

Rejected because the single-use execution authority is consumed. A rerun or ref recreation would erase the meaning of attempt-1 qualification.

### Rejected: refactor membership instrumentation into a new framework

Rejected as unnecessary architecture expansion. No plugin, adapter layer, generalized runner interface, or new dependency is justified.

### Rejected: modify `benchmarks/run.mjs` or `benchmarks/harness-lib.mjs` preemptively

Rejected because canonical T075 already demonstrates the required membership behavior. The observed defect is in the T076 lifecycle divergence. Shared-code refactoring would widen a narrowly evidenced recovery and risk changing already-qualified T075 behavior.

### Preferred minimal recovery

Prospectively change only T076 membership-proof preparation in `benchmarks/metrics.mjs` and add focused regression coverage in `tests/benchmark-metrics.test.ts`.

## R007-07 — T076 required-membership proof parity

R007-07 is implementation-ineligible until a separate implementation-authorization artifact becomes canonical and effective.

### Prospective exact tracked mutation surface

Exactly:

- `benchmarks/metrics.mjs`;
- `tests/benchmark-metrics.test.ts`.

No other tracked path is planned for R007-07.

### Required implementation behavior

R007-07 MUST:

1. define the same bounded known ignored membership-runtime cache path set already used by canonical T075:
   - `.nx/cache`;
   - `.nx/workspace-data`;
   - `.cache`;
   - `node_modules/.cache`;
2. before T076 membership-proof instrumentation, remove only those ignored runtime-cache paths using path containment checks and bounded recursive removal;
3. perform that preparation after cold/warm timed comparator collection so timing/cache-class semantics are unchanged;
4. preserve `restoreMeasuredSource(...)` and all tracked-source restoration behavior;
5. execute the same existing `membershipProofCommand(...)` once, with the same command, expected exit code, runner kind, environment sanitation, and output path contract;
6. preserve exact required membership semantics: at least one valid JSON report is still mandatory for full-suite required membership;
7. preserve report size/capture limits, JSON validation, assertion matching, and observed oracle-test-id calculation;
8. preserve failure on missing, empty, oversized, malformed, or structurally invalid report evidence;
9. preserve failure when instrumentation changes comparator exit behavior;
10. preserve source-state restoration/cleanup behavior and all R007-05 materialization identity gates;
11. avoid adding retries. The membership proof remains one bounded instrumentation execution per audit;
12. avoid changing `membershipProofCommand(...)`, proxy/preload code, runner identification, metric calculation, comparator commands, or membership policy assignment;
13. produce no new persisted schema/field and no publication-time exception.

### Focused regression evidence

Tests MUST prove at least:

1. the T076 membership audit prepares exactly the known ignored membership-runtime cache paths before proof execution;
2. preparation cannot escape the measured repository/root boundary;
3. a deterministic stale-cache fixture that suppresses/redirects reporter instrumentation before cleanup produces a valid required membership report after the authorized cleanup path;
4. required membership with no report and no recognized valid report still fails closed;
5. malformed JSON remains rejected;
6. a report missing `testResults` remains rejected;
7. instrumentation exit-code mismatch remains rejected;
8. valid structured-report behavior and oracle-id matching remain unchanged;
9. existing qualified-replay input/materialization tests remain green;
10. existing aggregate/metric tests remain green.

Tests SHOULD use temporary local fixtures and process-local deterministic behavior. They MUST NOT require donor-network access or a live GitHub artifact.

If a deterministic regression cannot prove the repair within the two planned paths, implementation MUST stop and return to planning rather than widening scope or relying on the T113 executor as a test harness.

### R007-07 qualification

Before merge require:

- exact two-path purity;
- focused regression tests for the observed defect and adversarial fail-closed cases;
- applicable repository typecheck/test/build;
- exact-head Self Verification;
- original-attempt exact-head Project CI six-lane success;
- fresh independent substantive exact-head correctness/security/governance review;
- reconciliation of every material finding on the current head;
- zero unresolved material review threads;
- current ruleset / observable branch-protection verification;
- unchanged expected canonical `main` and exact PR head immediately before merge;
- guarded merge using `expected_head_sha`;
- post-merge ordered-parent/tree/signature/PR/main/path verification;
- durable `R007-07 = CLOSED_CANONICAL / QUALIFIED` before any successor executor implementation or ref creation.

Any R007-07 head mutation invalidates earlier CI/review qualification.

## R007-08 — successor single-use T113 metrics execution binding

R007-08 is blocked until R007-07 is durably closed as qualified and a separate authorization explicitly names the successor ref.

### Prospective exact tracked mutation surface

Exactly:

- `.github/workflows/spec-007-t113-metrics.yml`.

### Successor-ref rule

The consumed ref `run/spec007-t113-metrics-r1` MUST remain untouched forever.

The planning candidate for the successor is exactly:

`run/spec007-t113-metrics-r2`

No wildcard/prefix family is authorized by this plan. The exact successor ref must be separately named in implementation authorization before workflow mutation or ref creation.

### Required workflow amendment

The existing single-use executor may be amended only to admit the exact successor ref while preserving all current R007-06 controls:

- GitHub `create` event only;
- branch ref type only;
- run attempt `1` only;
- exact event/workflow/source SHA equality;
- exact checkout and architecture guards;
- least privileges;
- Ubuntu 24.04 / Linux x64;
- Node `24.15.0` and Yarn Classic `1.22.22`;
- exact T091/T111/T112 immutable inputs and digests;
- exact historical T111 manifest compatibility proof;
- frozen T078/T091/T095 blob proof;
- exact R007-07 canonical source;
- no new T075 replay;
- unchanged T077/aggregate/publication-candidate logic;
- bounded artifact retention;
- no direct repository write;
- no rerun-to-green.

The old `r1` mapping may remain only as immutable historical no-op/fail-closed admission behavior if required by workflow structure; it MUST NOT permit a second qualifying execution. Prefer the simplest static branch equality that admits only `r2` after this recovery if that can be achieved without misrepresenting the historical run.

### Mandatory fresh preflight

Immediately before creating `run/spec007-t113-metrics-r2`, re-prove from live GitHub/repository truth:

1. canonical `main` and exact R007-07/R007-08 merge identities;
2. T091 run/artifact availability and approved archive digest;
3. T111/T112 run/artifact availability and replay/evidence digests;
4. historical T111 manifest commit/blob and Jotai historical/current canonical equality;
5. frozen T078/T091/T095 result blobs;
6. current manifest revision/case identities;
7. absence of `run/spec007-t113-metrics-r2`;
8. absence of any prior T113 executor create-run for `r2`;
9. no movement/deletion/recreation of `r1`;
10. exact current workflow source and toolchain constraints.

Any failed gate returns to planning before ref creation.

### Single-use execution semantics

Create `run/spec007-t113-metrics-r2` exactly once from exact then-canonical `main`.

Only its first `create`-event run with `run_attempt == 1` may qualify. Failure is final evidence for that binding. Do not rerun, move, recreate, or substitute the ref.

## T113-R3 — publication

T113-R3 becomes eligible only if the R007-08 `r2` run genuinely completes successfully and uploads a valid bounded candidate artifact.

Prospective tracked mutation surface remains exactly:

- `benchmarks/results/t113-historical-corpus-expansion.json`.

Publication MUST:

- validate exact run/source/artifact/machinery identities;
- publish the complete eight-case result only;
- preserve factual `hit | miss | unavailable` outcomes;
- publish comparator availability counts;
- preserve `no_pre_data_recall_threshold = true`;
- preserve absolute integrity assertions;
- preserve T078/T091/T095 blobs exactly;
- introduce no selector/product/harness/schema/dependency/runtime/workflow/release mutation in the publication PR.

Qualification remains exact one-path purity, focused validation, Self Verification, six-lane Project CI, fresh independent substantive exact-head review, zero material threads, guarded merge, and post-merge verification before durable:

`T113 = CLOSED_CANONICAL / QUALIFIED`

## T114 — reconciliation

T114 remains blocked until T113 closes canonically.

If T113 succeeds, T114 is governance/ledger reconciliation only by default. It must record:

- T110 and T113 merge identities;
- T111/T112 replay identities/outcomes;
- failed `r1` T113 execution identity and cause;
- R007-07/R007-08 recovery identities;
- successful `r2` execution identity, if any;
- final eight-case Ascout/full/plain/related availability/hit/miss facts;
- runtime/candidate friction;
- frozen historical result immutability;
- absolute integrity assertion status;
- explicit confirmation that selector/product behavior was not changed in response to benchmark results.

Close `SPEC_007 = CLOSED_CANONICAL / GO` only if all canonical acceptance is genuinely proven. Otherwise use the existing `NO_GO / RETURN_TO_PLANNING` disposition.

## Planning audit checklist

A fresh independent reviewer of the exact final planning head MUST verify all of the following.

### A1 — immutable failure

Does the plan preserve run `34130848099` / ref `run/spec007-t113-metrics-r1` as final immutable failure evidence?

Expected: **YES**.

### A2 — failure characterization

Does the plan accurately distinguish proven T075/T076 lifecycle differences from the still-unproven claim that cache state is the sole root cause?

Expected: **YES**.

### A3 — required-mode integrity

Can any planned behavior convert missing required full-suite membership evidence into success, unavailable, observed false, or synthetic evidence?

Expected: **NO**.

### A4 — timing integrity

Does cache preparation occur only after cold/warm timed comparator collection so existing timing/cache-class meaning is preserved?

Expected: **YES**.

### A5 — bounded cache scope

Is planned cleanup limited exactly to the already-established ignored membership-runtime cache paths and constrained to repository/root containment?

Expected: **YES**.

### A6 — no instrumentation rewrite

Are `membershipProofCommand`, proxy/preload behavior, command argv, runner kind, and oracle-id matching preserved?

Expected: **YES**.

### A7 — two-path implementation bound

Is R007-07 limited to `benchmarks/metrics.mjs` and `tests/benchmark-metrics.test.ts`, with explicit return-to-planning if that scope is insufficient?

Expected: **YES**.

### A8 — focused test sufficiency

Do planned tests cover positive stale-cache recovery plus no-report, malformed report, missing `testResults`, exit mismatch, path containment, and unchanged structured-report behavior?

Expected: **YES**.

### A9 — no T075/replay weakening

Are T075, T111/T112 replay evidence, R007-05 materialization identity, donor/oracle identity, and historical results unchanged?

Expected: **YES**.

### A10 — successor binding isolation

Is successor execution isolated to a separately authorized exact `run/spec007-t113-metrics-r2` create-event attempt-1 binding with no rerun/reuse/wildcard path?

Expected: **YES**.

### A11 — publication isolation

Does T113 publication remain one additive result path after genuine executor evidence only?

Expected: **YES**.

### A12 — no generalized architecture

Does the plan avoid a new framework, dependency, service, plugin/adapter layer, generalized runner abstraction, or arbitrary workflow input?

Expected: **YES**.

### A13 — governance separation

Does this planning artifact itself grant zero implementation/ref/publication authority and require a separate canonical implementation authorization?

Expected: **YES**.

## Planning qualification and closeout

This planning amendment may merge only after:

1. exact one-path planning purity;
2. exact final head/tree verification;
3. applicable exact-head repository checks;
4. exact-head Self Verification;
5. original-attempt exact-head Project CI six-lane success;
6. fresh independent substantive exact-head planning/correctness/security/governance review;
7. reconciliation of every material finding;
8. zero unresolved material review threads;
9. current ruleset / observable branch-protection verification;
10. unchanged expected canonical `main` and exact PR head immediately before merge;
11. guarded merge with `expected_head_sha`;
12. post-merge ordered-parent/tree/signature/PR/main/path verification;
13. durable Issue #217 planning closeout.

Any head mutation invalidates earlier CI/review qualification.

After closeout, create a separate implementation-authorization artifact. Do not mutate R007-07 code from planning authority.

## Hard prohibitions

Across this recovery:

- no rerun of `34130848099`;
- no move/delete/recreate/reuse of `run/spec007-t113-metrics-r1`;
- no required-membership fallback or synthetic runner evidence;
- no comparator-command rewrite to obtain a report;
- no post-data metric/acceptance threshold invention;
- no selector/product/schema/receipt/CLI mutation;
- no T111/T112 replay rerun/rewrite;
- no donor/oracle/runtime substitution;
- no historical result rewrite;
- no force-push/rebase/destructive history rewrite;
- no stale CI/review reuse after head mutation;
- no fabricated CI, review, authority, evidence, mergeability, qualification, readiness, or completion.

## Current disposition

`T113_T076_MEMBERSHIP_RECOVERY_PLAN = PENDING_EXACT_HEAD_QUALIFICATION`
