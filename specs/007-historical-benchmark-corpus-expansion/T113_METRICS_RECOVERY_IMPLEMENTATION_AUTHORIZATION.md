# T113 Metrics Recovery Implementation Authorization

**Spec:** 007  
**Status:** AUTHORIZATION_PENDING_MERGE  
**Authorization ledger:** Issue #211  
**T113 publication ledger:** Issue #208  
**Canonical recovery-planning ledger:** Issue #209 (`CLOSED / COMPLETED`)  
**Canonical authorization base:** `edd87619d493fb9ab9931b6310b11999ebebebcf`  
**Canonical authorization-base tree:** `084d04788860a3d7c2ccfabbd15ee5b8deddb4ee`

## Purpose

This artifact prospectively authorizes only the bounded recovery required to convert the already-qualified T111/T112 replay evidence into honest T076/T077 evidence and then publish the T113 eight-case result.

It is an authority amendment to the existing Spec 007 implementation authorization. It does not replace the original candidate, corpus, metric, assertion, product, selector, schema, or historical-publication authority.

This file becomes effective only after its exact final head is independently qualified, guarded-merged, post-merge verified, and Issue #211 is durably closed as:

`T113_RECOVERY_IMPLEMENTATION_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`

Before that closeout it authorizes no implementation.

## Canonical authority chain

This authorization is subordinate to, and must be read with:

1. `.specify/memory/constitution.md`
2. `CONTRIBUTING.md`
3. `specs/007-historical-benchmark-corpus-expansion/IMPLEMENTATION_AUTHORIZATION.md`
4. `specs/007-historical-benchmark-corpus-expansion/spec.md`
5. `specs/007-historical-benchmark-corpus-expansion/plan.md`
6. `specs/007-historical-benchmark-corpus-expansion/tasks.md`
7. `specs/007-historical-benchmark-corpus-expansion/T113_METRICS_RECOVERY_PLAN.md`
8. Issue #208
9. Issue #209 canonical closeout
10. Issue #211

The narrower recovery plan and this authorization govern only the observed T113 recovery gap. They MUST NOT be interpreted as broadening unrelated Spec 007 authority.

## Canonical planning binding

The recovery plan was canonically qualified and merged as:

- planning PR: #210
- planning final head: `477cbec1c8b6c3eb6b6c7c904fbe37341dc65ca9`
- planning merge: `edd87619d493fb9ab9931b6310b11999ebebebcf`
- planning merge tree: `084d04788860a3d7c2ccfabbd15ee5b8deddb4ee`
- ordered parents:
  1. `256461e455b38e18a4ca06209184e0ddef274057`
  2. `477cbec1c8b6c3eb6b6c7c904fbe37341dc65ca9`
- merge verification: GitHub `verified=true`, `reason=valid`
- exact-head Self Verification: run `34040658540`, SUCCESS
- exact-head Project CI: run `34040658547`, original attempt, six required lanes SUCCESS
- independent exact-head review: no remaining material findings
- review threads: no unresolved material threads
- planning ledger: Issue #209, `CLOSED / COMPLETED`

Any implementation that diverges from the canonical recovery plan requires a new prospective planning/authority amendment before mutation.

## Authorized dependency order

Exactly:

`R007-05 -> R007-06 -> mandatory read-only preflight -> single-use T113 metrics execution -> T113-R2 publication -> T114`

No unit may start before its predecessor is durably canonically qualified/closed where this artifact requires closeout.

## Frozen evidence identities

### T091 historical six-case aggregate inputs

- source run: `33428011206`
- artifact id: `9773332273`
- approved archive digest: `sha256:e544d8d9bb00552c65a54f601ad3f57a78ddfa030edcfb87af3549748de13665`

### T111 qualified replay

- case: `jotai-splitatom-identical-write@1`
- source commit: `2955969c16a456c44da8dd4c1e31f8ad3fa6f9a4`
- source manifest revision: `12`
- source manifest Git blob: `ec4e9edde7bcf635063e23ee612cbad20712de6d`
- run: `33991920845`, attempt `1`
- artifact id: `9976936986`
- replay JSON SHA-256: `337cb9ca7680d5b5e33e5bf518268983df19af149c6f64812af4eef4a21f4c44`
- canonical evidence SHA-256: `a688937286b974788b0477b305c5fd1c315c8b580cbd17cf3f9b85d067616d5d`
- qualified derived identity: `00eabc7a7635b2f1f1d1d9e98a4ff5ae946c4175`
- qualified synthetic head: `a34238a0a43ac87745acd38a5d7bb4dadbcd08fc`
- platform: Linux x64
- toolchain: Node `24.15.0`, Yarn Classic `1.22.22`
- status/lifecycle: `BENCHMARK_ACTIVE`
- valid observations: `2`

### T112 qualified replay

- case: `immer-draftmap-iterator-compatibility@2`
- source commit: `256461e455b38e18a4ca06209184e0ddef274057`
- source/current manifest revision at qualification: `13`
- run: `34036997231`, attempt `1`
- artifact id: `9990519748`
- replay JSON SHA-256: `2bb89f50cef7cf38f5e3b1fe53d191c03cd78f3a3a294770d323746a095d433d`
- canonical evidence SHA-256: `9d8195c6cfef34f2a004e6c7152536ba7a023f0865b0ed0a3173e0b7e127ce7f`
- qualified derived identity: `557cb04b07c04ec09eff6bb3ee7f3280781f3c8b`
- qualified synthetic head: `22c8c3bec56034d0d8f7ad277e60ba2580a3b6a7`
- platform: Linux x64
- toolchain: Node `24.15.0`, Yarn Classic `1.22.22`
- status/lifecycle: `BENCHMARK_ACTIVE`
- valid observations: `2`

### Frozen published result blobs

These remain immutable throughout recovery:

- `benchmarks/results/t078-selector-misses.json` -> `06894f909426d5920fb8dc707b9707e86a70da31`
- `benchmarks/results/t091-m2-selection-replay.json` -> `05cb6e47b0dff2a25d91d9eb2864909bdeb7f309`
- `benchmarks/results/t095-branch-exercise-qualification.json` -> `e4b58d9c0ca21899b702e409a954a71ac20566b4`

## R007-05 — qualified replay input and measured-worktree materialization

R007-05 is the first authorized implementation unit after this authorization is effective.

### Exact tracked mutation surface

Exactly:

- `benchmarks/run.mjs`
- `benchmarks/metrics.mjs`
- `tests/benchmark-harness.test.ts`
- `tests/benchmark-metrics.test.ts`

No other tracked path is authorized under R007-05.

### Required behavior

R007-05 MUST:

1. add one explicit local qualified-replay prerequisite option to T076 case mode, `--t075-input <path>`;
2. preserve existing internal-T075 case mode for existing callers;
3. reject explicit input combined with incompatible/aggregate modes;
4. read replay JSON locally only; `run.mjs` and `metrics.mjs` gain no GitHub/network artifact retrieval;
5. require `status === "BENCHMARK_ACTIVE"` and `lifecycle_state === "BENCHMARK_ACTIVE"`;
6. require exact case id/revision, deterministic oracle evidence, expected observation count, and independently verified canonical `evidence_sha256`;
7. require exact `derived_identity` and `synthetic_head` bindings;
8. require exact current manifest revision equality by default;
9. permit only the exact T111 manifest-revision compatibility proof below;
10. reuse existing `run.mjs` frozen acquisition and selection reconstruction primitives to materialize measured worktrees without executing a new T075 oracle/comparator replay;
11. preserve regression-test anti-leakage, Git/parent/tree/license/lockfile verification, sanitized environment, frozen dependency installation, measured path-set validation, and source-state stability;
12. preserve existing `buildBaselines(...)`, comparator commands/membership semantics, comparator collection, Ascout execution, `computeCaseMetrics(...)`, timing/provenance meaning, T076 output meaning, and all current metric formulas;
13. fail closed on every unsupported, ambiguous, or mismatched condition;
14. add focused positive and adversarial tests for every new admission/rejection path.

### Exact T111 manifest-revision compatibility proof

General historical-manifest tolerance is forbidden.

The only accepted manifest mismatch is the exact frozen T111 tuple above with replay manifest revision `12` and then-current manifest revision exactly `13`.

Before accepting it, R007-05 MUST:

1. read `benchmarks/manifest.json` from exact source commit `2955969c16a456c44da8dd4c1e31f8ad3fa6f9a4`;
2. require its Git blob to equal `ec4e9edde7bcf635063e23ee612cbad20712de6d` and its manifest revision to equal `12`;
3. require then-current manifest revision to equal exactly `13`;
4. select exactly `jotai-splitatom-identical-write@1` from both manifests;
5. canonicalize the complete selected case objects using the repository's existing canonical JSON primitive;
6. require complete canonical equality;
7. require every frozen T111 source/run/artifact/replay/evidence/case/derived/synthetic identity above exactly;
8. reject every other revision mismatch, case, source, run, artifact, hash, identity, later manifest revision, or one-field case change.

Failure returns T113 recovery to planning. No alias, fuzzy match, field ignore-list, migration, inferred equivalence, revision range, or generalized compatibility layer is authorized.

### Runtime/platform/dependency equality

Before materialization and again immediately before T076 comparator collection, R007-05 MUST prove the actual controller environment equals the accepted replay evidence for OS, architecture, Node, package-manager name, and package-manager version.

For T111/T112 that controller evidence is Linux x64 + Node `24.15.0` + Yarn Classic `1.22.22`.

Separately, donor source reconstruction MUST remain bound to the accepted manifest case's own runtime and lockfile identities through the existing verification/install path. Exact working lockfile bytes must match before and after install.

Controller replay toolchain equality and donor case runtime/lockfile verification are independent mandatory gates. Neither may be substituted for the other.

### Materialization-only boundary

The new bounded materialization route in `benchmarks/run.mjs` MUST reuse existing frozen acquisition/reconstruction primitives and MUST NOT execute:

- the pre-fix oracle;
- the fixed oracle;
- project-native full comparator;
- plain comparator;
- related comparator;
- Ascout comparator.

It MUST NOT emit, mutate, or reclassify a `BENCHMARK_ACTIVE` replay. Its sole purpose is to recreate a measured source state whose derived tree, synthetic head, anti-leakage state, runtime/dependency identity, measured path set, and source-state stability are proven equal to the accepted qualified replay contract so T076 can collect fresh comparator observations honestly.

If implementation requires `benchmarks/harness-lib.mjs`, `benchmarks/metrics-lib.mjs`, `benchmarks/assertions-lib.mjs`, metric formula changes, oracle/comparator semantic changes, product/selector/schema behavior changes, dependencies, manifest changes, or generalized benchmark architecture, R007-05 is `NO_GO / RETURN_TO_PLANNING` and MUST NOT widen itself.

### R007-05 qualification and closeout

Require:

- exact four-path purity;
- focused positive/adversarial tests;
- full applicable repository typecheck/test/build;
- exact-head Self Verification;
- original-attempt exact-head Project CI six-lane success;
- fresh independent substantive exact-head correctness/security/governance review;
- reconciliation of every material finding, with any head mutation invalidating prior CI/review evidence;
- zero unresolved material review threads;
- current ruleset/protection verification;
- unchanged expected main and exact PR head before merge;
- guarded merge with `expected_head_sha`;
- post-merge ordered-parent/tree/signature/PR/main/path verification;
- durable `R007-05 = CLOSED_CANONICAL / QUALIFIED` before R007-06.

## R007-06 — single-use T113 metrics executor

R007-06 may begin only after R007-05 is durably closed as qualified.

### Exact tracked mutation surface

Exactly:

- `.github/workflows/spec-007-t113-metrics.yml`

No other tracked path is authorized under R007-06.

### Required workflow behavior

The workflow MUST:

1. use GitHub `create` event only;
2. admit exactly branch `run/spec007-t113-metrics-r1`;
3. require `github.event.ref_type == 'branch'`;
4. require `github.run_attempt == 1`;
5. require `github.sha == github.workflow_sha` and exact checked-out HEAD equality;
6. use least privileges only: repository contents read and Actions artifact read where required;
7. run Ubuntu 24.04 / Linux x64 with an explicit architecture guard;
8. activate and verify Node `24.15.0` and Yarn Classic `1.22.22` before candidate materialization/metrics;
9. install/build exact checked-out Ascout from the current lockfile without source mutation;
10. forward no controller secrets into donor execution;
11. consume only the exact frozen T091/T111/T112 run/artifact identities above;
12. verify the T091 approved archive digest and the T111/T112 replay/evidence hashes before use;
13. use the bounded R007-05 input/materialization route for Jotai and Immer;
14. execute no new T075 oracle replay for either candidate;
15. run unchanged T077 case assertions for the two new T076 results;
16. aggregate exactly the six T091 historical T076/T077 case inputs plus the two new T076/T077 case results using current aggregate modes;
17. require aggregate absolute assertion status `ABSOLUTE_ASSERTIONS_SATISFIED`;
18. preserve exact `hit | miss | unavailable` facts and explicit availability counts;
19. preserve `no_pre_data_recall_threshold = true` and introduce no post-data universal acceptance threshold;
20. bind exact source/tree/manifest/case/runtime/materialization/T091/T111/T112/machinery/historical-result identities;
21. create one bounded T113 candidate artifact for later publication;
22. upload that artifact with bounded retention;
23. never commit directly from the workflow.

The workflow MUST NOT expose `workflow_dispatch`, wildcard refs, arbitrary repository/case/run/artifact/command/runtime inputs, a generalized reusable executor, a second execution ref, or a rerun-to-green path.

### R007-06 qualification and closeout

Before merge require exact one-path purity, focused workflow/security validation, exact-head Self Verification, original-attempt exact-head six-lane Project CI, fresh independent substantive exact-head workflow/security/governance review, zero unresolved material threads, current ruleset/protection verification, unchanged expected main/head, guarded expected-head merge, post-merge identity/path verification, and durable:

`R007-06 = CLOSED_CANONICAL / QUALIFIED`

The workflow merge itself MUST NOT create `run/spec007-t113-metrics-r1`.

## Mandatory read-only preflight before execution-ref creation

Only after R007-06 closeout, immediately before the execution ref is created, a read-only preflight MUST prove:

1. then-current canonical main and tree;
2. T091 run `33428011206` exists with expected successful/qualified disposition;
3. T091 artifact `9773332273` remains downloadable/readable;
4. downloaded T091 archive SHA-256 equals exactly `e544d8d9bb00552c65a54f601ad3f57a78ddfa030edcfb87af3549748de13665`;
5. T111 run/artifact/replay/evidence identities remain available and exact;
6. T112 run/artifact/replay/evidence identities remain available and exact;
7. historical T111 source manifest commit/blob/revision remain readable and exact;
8. historical/current Jotai case canonical JSON equality still passes and then-current manifest is exactly revision `13`;
9. frozen T078/T091/T095 repository blobs remain exact;
10. `run/spec007-t113-metrics-r1` does not exist;
11. no prior create-event workflow run exists for that execution ref.

If any gate fails, do not create the ref. Record exact evidence and return to planning. Regenerating historical artifacts, rerunning T111/T112, creating a substitute ref, or inferring equivalence is forbidden.

## Single-use T113 metrics execution

If and only if the preflight passes, create exactly once:

`run/spec007-t113-metrics-r1`

from exact then-canonical `main`.

The ref is immutable after creation: do not move, delete, or recreate it.

Only the first create-event workflow run with `run_attempt == 1` can qualify. Do not rerun a failed or inconclusive attempt to obtain green evidence.

If the single-use run fails any required gate, preserve the failure evidence and return to planning.

If it succeeds, inspect/download the produced candidate artifact and prove complete eight-case accounting, exact T076/T077 aggregate machinery output, satisfied absolute assertions, runtime/materialization provenance, and historical-blob immutability before publication begins.

## T113-R2 — additive publication

T113-R2 may begin only after a genuine qualifying single-use metrics run.

### Exact tracked mutation surface

Exactly one new path:

- `benchmarks/results/t113-historical-corpus-expansion.json`

No existing result file may be modified.

### Required publication behavior

The result MUST:

1. be generated from and bound to the genuine candidate artifact rather than manually invented metrics/assertions;
2. bind exact canonical source commit/tree and manifest revision;
3. bind all eight case identities;
4. bind T091/T111/T112 run/artifact/hash provenance;
5. bind the exact T111 compatibility proof and controller/donor runtime proofs;
6. bind exact metric/assertion/materialization machinery identities;
7. preserve exact comparator `hit | miss | unavailable` outcomes and explicit availability counts;
8. record `no_pre_data_recall_threshold = true`;
9. require existing absolute integrity assertions satisfied;
10. prove frozen T078/T091/T095 blob identities unchanged;
11. introduce no selector/product change, no post-data threshold, and no rewritten historical evidence.

### T113-R2 qualification and closeout

Require exact one-path additive purity, focused deterministic result validation, full applicable repository checks, exact-head Self Verification, original-attempt exact-head six-lane Project CI, fresh independent substantive exact-head correctness/governance review, reconciliation of every material finding, zero unresolved material threads, ruleset/protection verification, unchanged expected main/head, guarded expected-head merge, and post-merge ordered-parent/tree/signature/PR/main/path verification.

Only genuine satisfied evidence permits durable closeout:

`T113 = CLOSED_CANONICAL / QUALIFIED`

Only then may T114 begin.

## Hard prohibitions

Across the complete recovery:

- no `src/**` mutation;
- no selector or command-admission mutation;
- no receipt/schema/CLI mutation;
- no new product/runtime dependency;
- no metric formula or absolute-assertion rule change;
- no oracle/comparator command semantic change;
- no T111/T112 replay rerun, rewrite, relocation, recreation, or reclassification;
- no generalized manifest compatibility; only the exact fixed T111 revision-12-to-13 proof is authorized;
- no runtime/platform/toolchain substitution or replay metadata rewriting;
- no donor runtime/lockfile weakening;
- no historical result rewrite or historical artifact regeneration;
- no synthetic T076/T077/comparator/assertion evidence;
- no generalized benchmark framework or duplicate reconstruction implementation;
- no arbitrary/wildcard workflow input or execution ref;
- no workflow rerun-to-green for the single-use metrics event;
- no direct workflow publication to repository source;
- no release/tag/npm publication;
- no force-push, shared-history rebase, or destructive ref rewrite;
- no stale exact-head CI/review reuse after mutation;
- no fabricated evidence, runtime capability, authority, qualification, mergeability, or completion.

## Authorization closeout

This authorization itself is effective only when:

1. this file is the only changed tracked path in its PR;
2. the PR is based on exact canonical main `edd87619d493fb9ab9931b6310b11999ebebebcf` unless live main movement is separately reconciled before merge;
3. exact-head applicable repository checks succeed;
4. exact-head Self Verification succeeds;
5. exact-head Project CI succeeds across all six required lanes on the original qualifying attempt;
6. fresh independent substantive exact-head review finds no unreconciled material issue;
7. zero unresolved material review threads remain;
8. current rulesets/protection and mergeability are reverified;
9. expected canonical main and exact final PR head remain unchanged immediately before merge;
10. merge uses expected-head protection;
11. post-merge ordered parents, tree, GitHub signature, PR state, canonical main, and exact one-path mutation are verified;
12. Issue #211 records the evidence and closes as `T113_RECOVERY_IMPLEMENTATION_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`.

Only after all twelve gates pass may R007-05 begin.