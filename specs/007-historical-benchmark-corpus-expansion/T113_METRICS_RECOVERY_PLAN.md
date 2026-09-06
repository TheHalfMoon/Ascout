# T113 Metrics Recovery Plan

**Status:** PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED  
**Planning ledger:** Issue #209  
**Publication ledger:** Issue #208  
**Canonical planning base:** `256461e455b38e18a4ca06209184e0ddef274057`

## Trigger

T113 reached a publication-route stop condition before any T113 repository mutation:

`T113 = RETURN_TO_PLANNING / METRICS_PREREQUISITE_INPUT_GAP`

Canonical facts at discovery:

- canonical `main`: `256461e455b38e18a4ca06209184e0ddef274057`;
- canonical tree: `4d04b9e6aaff86de864f7e2b8eb6200893e80aac`;
- T111 qualified replay: run `33991920845`, attempt `1`, `BENCHMARK_ACTIVE`;
- T112 qualified recovery replay: run `34036997231`, attempt `1`, `BENCHMARK_ACTIVE`;
- authorized T113 publication path: `benchmarks/results/t113-historical-corpus-expansion.json` only;
- no T113 result file had been created.

This stop condition does not invalidate either qualified candidate replay. It concerns only the route from qualified replay evidence into the current T076/T077 metrics/assertion machinery.

## Exact root cause

Current `benchmarks/metrics.mjs` has two executable modes.

### Aggregate mode

Aggregate mode accepts only completed `T076 / BENCHMARK_METRICS_READY` case results.

### Case mode

Case mode always executes `runT075(...)` internally. That helper invokes `benchmarks/run.mjs` to create a new T075 prerequisite replay before T076 metric collection. The live T075 subprocess also supplies a kept controller root containing `observation-N/measured` worktrees that T076 later reuses for comparator collection.

The qualified T111/T112 artifacts contain immutable replay JSON evidence, not those ephemeral controller roots or measured worktrees. Therefore a replay-file option by itself is insufficient: T076 also needs a bounded way to reconstruct measured worktrees without executing a new oracle replay.

T113 authority simultaneously requires:

1. use only qualified T111/T112 replay evidence;
2. run the current metrics/assertion machinery over the complete eight-case selection corpus;
3. preserve exact factual comparator outcomes and evidence integrity;
4. avoid synthetic or fabricated T076/T077 evidence.

Therefore the current executable contract cannot satisfy T113 honestly without a prospective benchmark-script authority amendment.

Manually constructing T076/T077 records from replay JSON is prohibited because it would manufacture metric/assertion evidence that the current machinery did not execute. Silently invoking new T075 qualification replays is also not an acceptable substitute for the immutable qualified T111/T112 replay prerequisites.

## Recovery design

The recovery is a qualified-prerequisite materialization and execution-route repair only. It is not a metric-formula change, selector change, product change, oracle change, replay rewrite, schema change, or generalized benchmark refactor.

### R007-05 — qualified replay prerequisite and measured-worktree materialization

Prospective tracked mutation surface, only after a separate implementation authorization becomes canonical:

- `benchmarks/run.mjs`
- `benchmarks/metrics.mjs`
- `tests/benchmark-harness.test.ts`
- `tests/benchmark-metrics.test.ts`

The need to include `benchmarks/run.mjs` is explicit and narrow: current T076 depends on the measured worktrees produced by T075, and only `run.mjs` already owns the frozen acquisition/reconstruction primitives that created the qualified derived identities. Duplicating those primitives in `metrics.mjs` or a workflow would create a second reconstruction implementation and is rejected by this plan.

#### Qualified replay validation

Required behavior:

1. add one explicit local-file prerequisite contract for T076 case mode, named `--t075-input <path>`;
2. preserve existing internal-T075 case mode for existing callers;
3. reject ambiguous invocation when explicit T075 input and incompatible/aggregate modes are combined;
4. read supplied replay JSON locally only; do not add artifact/network retrieval to either benchmark script;
5. require both `status === "BENCHMARK_ACTIVE"` and `lifecycle_state === "BENCHMARK_ACTIVE"`;
6. require exact case id and case revision equality with the selected current manifest record;
7. require exact current manifest revision equality;
8. require `evidence.determinism === "deterministic"`;
9. require `evidence.determinism_scope === "oracle_only"`;
10. require `valid_observation_count === evidence.observations.length`, at least two observations, and exact equality with the requested T076 repetition count;
11. require a valid canonical `evidence_sha256` and independently recompute it as SHA-256 over the repository's existing `canonicalJson(evidence)` bytes before acceptance;
12. require exact qualified replay identity fields needed by reconstruction, including `derived_identity` and `synthetic_head`;
13. reject malformed JSON, missing lifecycle evidence, wrong case/revision/manifest, wrong hash, nondeterministic evidence, wrong determinism scope, observation-count mismatch, missing derived identity, or missing synthetic head fail-closed.

#### Bounded materialization contract

For explicit qualified replay input only, `benchmarks/run.mjs` may gain one materialization-only mode consumed by `benchmarks/metrics.mjs`. The mode MUST reuse the existing frozen acquisition and selection-reconstruction primitives already used by T075 and MUST NOT execute the pre-fix oracle, fixed oracle, full comparator, plain comparator, related comparator, or Ascout comparator.

For each requested observation ordinal, materialization MUST:

1. acquire the exact manifest-bound upstream repository through the existing bounded mirror-clone route;
2. re-run existing Git identity, required-parent, changed-path, pinned-license-byte, and lockfile-byte verification;
3. use the existing `materializeSelection(..., "measured", true)` reconstruction path rather than a duplicate reconstruction algorithm;
4. preserve the frozen regression-test anti-leakage rule: only reviewed production-fix bytes are restored into measured state and regression-test delta remains excluded from the measured worktree;
5. preserve the existing exact dependency-install route, lockfile verification, hook/submodule controls, sanitized environment, and clean-source checks;
6. require the reconstructed derived tree to equal the qualified replay `derived_identity` exactly;
7. require the reconstructed synthetic commit to equal the qualified replay `synthetic_head` exactly;
8. require the measured worktree path set to equal the reviewed production path set exactly;
9. independently recompute source-state identity before handing the worktree to T076 and require stable state through comparator collection using the existing T076 source-stability checks;
10. bind materialization provenance to case id/revision, manifest revision, qualified replay evidence SHA-256, upstream/base/fix/oracle identities, derived identity, synthetic head, exact Node/package-manager/lockfile identity, observation ordinal, and measured worktree path;
11. return only bounded local materialization metadata/root information needed by `metrics.mjs`;
12. clean up materialized roots after T076 completes unless the existing bounded diagnostic retention behavior is explicitly used by the single-use executor.

The materialization mode is not a replay and MUST NOT produce or modify a `BENCHMARK_ACTIVE` qualification result. It reconstructs source state already bound by the immutable qualified replay so the current T076 comparator machinery can execute honestly.

If implementation proves that the existing `run.mjs` reconstruction primitives cannot support this mode without changing donor/oracle semantics, `benchmarks/harness-lib.mjs`, metric formulas, receipt/schema behavior, or generalized framework architecture, R007-05 MUST fail closed and return to planning rather than widen itself.

#### T076 preservation

After replay validation and measured-worktree materialization, preserve existing:

- `buildBaselines(...)` semantics;
- comparator commands and membership policy;
- comparator collection;
- Ascout execution;
- source-state stability checks;
- `computeCaseMetrics(...)` call;
- timing/provenance shape;
- T076 output shape and task/status semantics;
- every metric formula in `benchmarks/metrics-lib.mjs` unchanged.

Focused positive and adversarial tests MUST cover:

- exact qualified replay acceptance;
- hash/lifecycle/case/revision/manifest/determinism/count rejection;
- reconstructed derived-tree mismatch rejection;
- synthetic-head mismatch rejection;
- measured-path or anti-leakage mismatch rejection;
- ambiguous mode rejection;
- preservation of existing internal-T075 behavior.

R007-05 MUST NOT modify `benchmarks/harness-lib.mjs`, `benchmarks/metrics-lib.mjs`, `benchmarks/assertions-lib.mjs`, product code, selector code, receipt/schema/CLI code, dependencies, manifest, candidate definitions, historical results, or qualified replay artifacts.

The explicit replay input is prerequisite evidence only. It MUST NOT be reclassified, rewritten, weakened, or converted into synthetic comparator outcomes.

### R007-06 — single-use T113 metrics executor

R007-06 is blocked until R007-05 is canonically qualified and closed.

Prospective tracked mutation surface, only after a separate implementation authorization becomes canonical:

- `.github/workflows/spec-007-t113-metrics.yml`

#### Mandatory read-only preflight before ref creation

Before `run/spec007-t113-metrics-r1` is created, perform a fresh read-only preflight and record it in the R007-06/T113 execution ledger. The preflight MUST prove all exact inputs remain available and immutable.

At minimum:

1. T091 source run `33428011206` exists with the expected completed/qualified disposition;
2. T091 aggregate-input artifact `9773332273` is still downloadable/readable;
3. the T091 archive digest is exactly `sha256:e544d8d9bb00552c65a54f601ad3f57a78ddfa030edcfb87af3549748de13665`;
4. T111 run `33991920845` and artifact `9976936986` remain available with their previously qualified identities;
5. T112 run `34036997231` and artifact `9990519748` remain available with their previously qualified identities;
6. T111/T112 replay JSON SHA-256 and canonical evidence SHA-256 values match the qualified closeout records;
7. historical T078/T091/T095 repository blob identities still match their frozen values;
8. `run/spec007-t113-metrics-r1` is absent.

If any required artifact is unavailable, unreadable, expired, or digest-mismatched, fail closed **before creating the execution ref** and return to planning. Do not substitute a regenerated historical archive, a new T111/T112 replay, or an inferred equivalent.

#### Required executor behavior

1. GitHub `create` event only;
2. exact static admission for `run/spec007-t113-metrics-r1` only;
3. `github.event.ref_type == 'branch'` only;
4. `github.run_attempt == 1` only;
5. `github.sha == github.workflow_sha` and exact checked-out HEAD equality guards;
6. least privileges only: repository contents read and Actions artifact read where GitHub requires it;
7. Ubuntu 24.04;
8. exact current Ascout controller Node/npm toolchain and lockfile install/build;
9. no controller secrets forwarded to donor execution;
10. download inputs by exact immutable run/artifact identity only:
   - T091 aggregate-input artifact from run `33428011206`, artifact `9773332273`, expected archive digest `sha256:e544d8d9bb00552c65a54f601ad3f57a78ddfa030edcfb87af3549748de13665`;
   - T111 replay artifact from run `33991920845`, artifact `9976936986`;
   - T112 replay artifact from run `34036997231`, artifact `9990519748`;
11. verify T091 archive digest plus expected T111/T112 replay JSON SHA-256 and canonical evidence SHA-256 values again inside the job before use;
12. run T076 metric collection for Jotai using the qualified T111 replay as `--t075-input`, with measured source materialized through the bounded R007-05 route;
13. run T076 metric collection for Immer using the qualified T112 replay as `--t075-input`, with measured source materialized through the bounded R007-05 route;
14. never invoke a new T075 oracle replay for those two cases;
15. run unchanged current T077 case assertions over each new T076 result;
16. aggregate the six frozen historical T091 T076 case inputs plus the two new T076 case results through current `benchmarks/metrics.mjs` aggregate mode;
17. aggregate the corresponding six frozen historical T091 T077 case inputs plus the two new T077 case results through current `benchmarks/assertions.mjs` aggregate mode;
18. require aggregate absolute assertion status `ABSOLUTE_ASSERTIONS_SATISFIED`;
19. preserve exact `hit | miss | unavailable` facts and explicit availability counts;
20. preserve `no_pre_data_recall_threshold = true` and introduce no post-data universal acceptance percentage;
21. bind exact source commit/tree, manifest revision, all eight case identities, T091/T111/T112 run and artifact provenance, metrics/assertion machinery identities, materialization identities, and historical result blob identities;
22. produce one bounded T113 candidate artifact for later repository publication;
23. upload that candidate artifact with bounded retention;
24. do not commit directly from the workflow;
25. no `workflow_dispatch`, wildcard ref, arbitrary case/repository/run/artifact/command/runtime input, reusable generalized executor, rerun-to-green, or second execution ref under this plan.

### T113-R2 — additive publication

T113-R2 is blocked until:

1. R007-05 is canonically qualified and closed;
2. R007-06 is canonically qualified and closed;
3. the mandatory read-only artifact-integrity preflight above passes immediately before execution-ref creation;
4. `run/spec007-t113-metrics-r1` is proven absent and then created exactly once from exact then-canonical `main`;
5. its first create-event `run_attempt=1` succeeds and produces a genuine candidate artifact;
6. the candidate artifact proves satisfied absolute assertions and honest complete eight-case accounting.

Then and only then T113-R2 may mutate exactly:

- `benchmarks/results/t113-historical-corpus-expansion.json`

Publication requirements:

- additive file only;
- preserve historical T078/T091/T095 blob IDs exactly;
- embed/bind exact generated aggregate metrics/assertions and execution provenance without inventing unavailable evidence;
- exact-head focused validation and full applicable repository checks;
- exact-head Self Verification;
- exact-head six-lane Project CI;
- fresh independent substantive exact-head review;
- zero unresolved material threads;
- guarded expected-head merge;
- post-merge ordered-parent/tree/signature/PR/main/path verification;
- durable closeout as `T113 = CLOSED_CANONICAL / QUALIFIED` before T114.

## Dependency ordering

`T111 qualified -> T112 qualified -> T113 stop condition -> T113 recovery planning -> implementation authorization -> R007-05 -> R007-06 -> read-only artifact preflight -> single-use T113 metrics run -> T113-R2 publication -> T114`

## Historical immutability

The following published result blobs remain immutable throughout the recovery:

- `benchmarks/results/t078-selector-misses.json` -> `06894f909426d5920fb8dc707b9707e86a70da31`;
- `benchmarks/results/t091-m2-selection-replay.json` -> `05cb6e47b0dff2a25d91d9eb2864909bdeb7f309`;
- `benchmarks/results/t095-branch-exercise-qualification.json` -> `e4b58d9c0ca21899b702e409a954a71ac20566b4`.

The qualified T111/T112 replay refs/runs/artifacts also remain immutable and MUST NOT be rerun, moved, recreated, rewritten, or reclassified.

## Hard prohibitions

- no synthetic T076/T077 evidence;
- no replay artifact rewriting or qualification reclassification;
- no T111 or T112 replay rerun;
- no product or selector mutation;
- no receipt/schema/CLI mutation;
- no metric-formula or assertion-rule change;
- no donor/oracle/candidate identity change;
- no product/runtime dependency addition;
- no historical result rewrite or historical artifact regeneration as a substitute for missing evidence;
- no duplicate reconstruction algorithm outside the existing `run.mjs` primitives;
- no generalized benchmark framework;
- no arbitrary workflow input surface;
- no wildcard execution ref;
- no force-push, rebase, or destructive shared-history rewrite;
- no stale CI/review reuse after head mutation;
- no fabricated evidence, review, CI, authority, qualification, mergeability, or completion.

## Planning-only boundary

This file authorizes no implementation. No benchmark script, test, workflow, execution ref, result, product, selector, schema, dependency, runtime, donor, oracle, manifest, or historical result may be mutated from this planning artifact alone.

A separate explicit implementation authorization must become canonical before R007-05 begins.