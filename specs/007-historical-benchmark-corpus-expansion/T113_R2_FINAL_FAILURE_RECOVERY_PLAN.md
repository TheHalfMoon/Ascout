# T113 r2 Final-Failure Recovery Plan

**Status:** `PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`  
**Planning ledger:** Issue #230  
**Publication ledger:** Issue #208  
**Canonical planning base:** `e5fd9e2333b9df320f17d862b378ab1c2ac80dae`  
**Canonical planning-base tree:** `21ca5805a7426dd32e020dfef43df24f73e617d4`

## Purpose

Define the smallest evidence-preserving recovery after both immutable single-use T113 executions (`r1` and `r2`) failed in T076 project-native full-suite membership proof with the same fail-closed missing-runner-JSON disposition.

This artifact is planning only. It grants no implementation authority, no execution authority, no successor execution ref, no publication authority, and no permission to mutate benchmark/product semantics.

## Immutable trigger evidence

### r1

- ref: `run/spec007-t113-metrics-r1`
- source/workflow SHA: `f1ab8e36e6710287523cd4c029f55ca2bf57347d`
- source tree: `821db43ba09624e05b8d29f1ab9541f786481354`
- run: `34130848099`
- attempt: `1`
- job: `101770327800`
- conclusion: `failure`
- exact failure: `oracle_membership: Error: membership audit did not produce a runner JSON report`
- candidate artifact: none

### r2

- ref: `run/spec007-t113-metrics-r2`
- source/workflow SHA: `e5fd9e2333b9df320f17d862b378ab1c2ac80dae`
- source tree: `21ca5805a7426dd32e020dfef43df24f73e617d4`
- run: `34158105972`
- attempt: `1`
- job: `101854028688`
- conclusion: `failure`
- exact failure: `oracle_membership: Error: membership audit did not produce a runner JSON report`
- candidate artifact: none

Both refs/runs are immutable final failure evidence and MUST NOT be rerun, moved, deleted/recreated, reused, substituted, or reclassified.

## Diagnosis

The prior recovery hypothesis was falsified. R007-07 restored T076 managed-cache cleanup parity, but `r2` reproduced the exact `r1` failure. Therefore managed ignored runner-cache cleanup is not sufficient to explain or repair the observed failure.

Current canonical code exposes a narrower and better-supported defect boundary:

1. `benchmarks/run.mjs` and `benchmarks/metrics.mjs` use the same reporter-only `membershipProofCommand(...)` instrumentation contract.
2. Qualified T075 Jotai execution produced genuine runner JSON membership reports for the same reviewed project-native command family.
3. T076 `membershipAudit(...)` fails when its report collector observes no proof files.
4. On that failure, T076 discards the proof process stdout/stderr from its error disposition; canonical `run.mjs` instead includes bounded proof output when required membership produces no report.
5. Existing `tests/benchmark-metrics.test.ts` R007-07 fixtures validate a directly invoked fake project-local runner (`./node_modules/.bin/vitest`) rather than reproducing the real package-manager/script process chain used by Jotai (`yarn test:ci --run`). The test therefore proves direct-runner instrumentation, not package-script propagation to the actual Vitest process.

The exact upstream process-chain reason that no report is produced is not recoverable from immutable `r1`/`r2` logs because T076 did not retain bounded proof-process diagnostics. Claiming a specific Node/Yarn/Vitest propagation root cause would therefore exceed the available evidence.

Accordingly the next bounded unit is **diagnostic-contract and real-chain regression hardening**, not a semantic membership repair and not another execution retry.

## Classification

`BOUNDED_IMPLEMENTATION_DEFECT / DIAGNOSTIC_AND_TEST_COVERAGE_GAP`

This classification does not authorize weakening structured-report membership. Required membership remains fail-closed and must still require genuine external runner JSON.

If focused local evidence proves that the existing instrumentation cannot produce a report through the exact package-script chain without changing membership policy, comparator command, donor behavior, or runner semantics, the unit must return to planning instead of widening.

## Invariants

Any future implementation MUST preserve:

1. required project-native full-suite membership as structured external runner evidence;
2. existing reviewed comparator commands exactly;
3. `membershipProofCommand(...)`, proxy/preload authority boundaries, reporter/output ownership, and restricted-command admission unless a later planning amendment explicitly proves a narrower required change;
4. missing/empty/malformed/oversized/structurally-invalid membership evidence as hard failure;
5. exact expected exit-code matching and oracle-id matching;
6. T075/T091/T111/T112 qualified evidence and identities;
7. frozen T078/T091/T095 result bytes;
8. T076/T077 metric and assertion formulas;
9. `no_pre_data_recall_threshold = true`;
10. product, selector, receipt, schema, CLI, dependency, donor, oracle, and publication semantics;
11. immutable `r1` and `r2` failure evidence.

## R007-09 — T076 membership diagnostic and real-chain regression hardening

R007-09 is implementation-ineligible until a separate implementation authorization is independently reviewed, canonically merged, and effective.

### Prospective exact tracked mutation surface

Exactly:

- `benchmarks/metrics.mjs`;
- `tests/benchmark-metrics.test.ts`.

No other tracked path is planned.

### Required behavior

A future authorized R007-09 implementation MUST:

1. preserve T076 fail-closed behavior when no runner JSON report exists;
2. on no-report failure, include only bounded, deterministic proof-process diagnostic material sufficient to distinguish proxy/preload/runner/report-production failure classes, without converting output text into membership evidence;
3. preserve report-file collection and validation as the sole positive membership evidence path;
4. add a local regression fixture that invokes membership through a package-manager/script chain representative of the frozen Jotai contract rather than only a direct fake runner binary;
5. prove that instrumentation reaches the actual local Vitest process and produces a genuine external JSON report in the positive fixture;
6. prove that a package-script chain which reaches a runner but emits no report still fails closed;
7. preserve direct-runner fixture coverage as a lower-level unit check where useful;
8. introduce no retry, fallback, synthetic report, inferred membership, output-text parser for success, comparator rewrite, or alternate runner;
9. keep cache preparation, cold/warm timing semantics, source-state validation, replay/materialization validation, metric formulas, and aggregate semantics unchanged.

### Focused regression evidence

Before R007-09 can qualify, tests MUST prove at least:

- real package-script-chain positive report production;
- exact regression-test-id membership from the produced report;
- no-report remains hard failure;
- bounded diagnostics are present on no-report failure and do not themselves satisfy membership;
- malformed JSON remains rejected;
- missing `testResults` remains rejected;
- report/command exit mismatch remains rejected;
- reporter/output authority conflict remains rejected;
- managed ignored cache-path protections remain unchanged;
- existing T076 metric, R007-05 materialization, T077 aggregate/assertion, and benchmark membership tests remain green.

The focused fixture MUST be local and deterministic. It MUST NOT depend on donor network access, GitHub artifacts, mutable hosted state, credentials, or a successor T113 execution.

## Stop conditions

R007-09 is `NO_GO / RETURN_TO_PLANNING` if focused evidence shows that repair requires any of:

- `benchmarks/run.mjs`;
- `benchmarks/harness-lib.mjs`;
- `benchmarks/membership-proxy.mjs`;
- `benchmarks/membership-preload.cjs`;
- comparator-command mutation;
- membership-policy weakening or reinterpretation;
- dependency/runtime changes;
- donor/oracle/manifest changes;
- schema/product/selector/receipt/CLI changes;
- generalized instrumentation architecture.

No widening is implicit.

## Qualification gate for a future R007-09 implementation

Require all of:

- exact two-path purity;
- focused deterministic positive/adversarial tests;
- applicable typecheck/test/build;
- exact-head Self Verification success;
- original-attempt exact-head six-lane Project CI success;
- fresh independent substantive exact-head correctness/security/governance review;
- every material finding reconciled on the current head;
- zero unresolved material threads;
- current ruleset/observable protection verification;
- unchanged canonical main and exact head immediately before merge;
- guarded normal merge with exact expected head SHA;
- post-merge ordered-parent/tree/signature/path proof;
- durable `R007-09 = CLOSED_CANONICAL / QUALIFIED`.

Any head mutation invalidates prior exact-head CI/review evidence.

## Successor execution

No successor ref is authorized by this plan.

Only after R007-09 is genuinely qualified may a separate planning/authorization unit decide whether another single-use execution is justified. Any future ref must be new, never previously created, prospectively named by effective authority, created exactly once from exact then-canonical main after a fresh read-only preflight, and limited to first `create`-event attempt `1`.

`r1` and `r2` remain permanently consumed.

## T113 / T114 disposition

Until a separately authorized future execution succeeds and produces a fully validated bounded candidate artifact:

`T113 = NO_GO / RETURN_TO_PLANNING`

`T114 = BLOCKED_BY_T113`

No T113 result publication is authorized.

## Planning exit criteria

This artifact can close Issue #230 only after its exact final head receives fresh independent substantive planning/governance review, all material findings are reconciled, the PR remains planning-only and path-pure, canonical main/head remain unchanged at merge time, guarded normal merge succeeds, and post-merge proof is complete.

On successful canonicalization, the next-unit disposition is:

`T113_RECOVERY_PLANNING = CLOSED_CANONICAL / IMPLEMENTATION_AUTHORIZATION_REQUIRED`

This does not itself authorize R007-09 implementation.