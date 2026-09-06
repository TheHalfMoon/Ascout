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

Case mode always executes `runT075(...)` internally. That helper invokes `benchmarks/run.mjs` to create a new T075 prerequisite replay before T076 metric collection.

There is no current mode that accepts an already-qualified `BENCHMARK_ACTIVE` replay JSON as the T075 prerequisite for T076 metric collection.

T113 authority simultaneously requires:

1. use only qualified T111/T112 replay evidence;
2. run the current metrics/assertion machinery over the complete eight-case selection corpus;
3. preserve exact factual comparator outcomes and evidence integrity;
4. avoid synthetic or fabricated T076/T077 evidence.

Therefore the current executable contract cannot satisfy T113 honestly without a prospective benchmark-script authority amendment.

Manually constructing T076/T077 records from replay JSON is prohibited because it would manufacture metric/assertion evidence that the current machinery did not execute. Silently invoking new T075 qualification replays is also not an acceptable substitute for the immutable qualified T111/T112 replay prerequisites.

## Recovery design

The recovery is a prerequisite-input and execution-route repair only. It is not a metric-formula change, selector change, product change, oracle change, replay rewrite, schema change, or generalized benchmark refactor.

### R007-05 — qualified replay prerequisite input

Prospective tracked mutation surface, only after a separate implementation authorization becomes canonical:

- `benchmarks/metrics.mjs`
- `tests/benchmark-metrics.test.ts`

Required behavior:

1. add one explicit local-file T075 prerequisite option for T076 case mode, named `--t075-input <path>`;
2. preserve existing internal-T075 case mode for existing callers;
3. reject ambiguous invocation when explicit T075 input and any incompatible mode are combined;
4. read the supplied replay JSON locally only; do not add network retrieval to `metrics.mjs`;
5. require both `status === "BENCHMARK_ACTIVE"` and `lifecycle_state === "BENCHMARK_ACTIVE"`;
6. require exact case id and case revision equality with the selected current manifest record;
7. require exact current manifest revision equality;
8. require `evidence.determinism === "deterministic"`;
9. require `evidence.determinism_scope === "oracle_only"`;
10. require at least two replay observations and require the count expected by the current case invocation;
11. require a valid canonical `evidence_sha256` and independently recompute it using the repository's existing recursive-key-sort plus canonical JSON SHA-256 convention before acceptance;
12. reject malformed JSON, missing lifecycle evidence, wrong case/revision/manifest, wrong hash, nondeterministic evidence, wrong determinism scope, and insufficient/mismatched observation counts fail-closed;
13. after prerequisite acceptance, preserve existing `buildBaselines(...)`, donor reconstruction, comparator collection, Ascout execution, source-state checks, `computeCaseMetrics(...)`, timing/provenance shape, and output shape unchanged in meaning;
14. preserve every current metric formula in `benchmarks/metrics-lib.mjs` unchanged;
15. add focused positive and adversarial tests in the existing `tests/benchmark-metrics.test.ts` path;
16. do not modify `benchmarks/run.mjs`, `benchmarks/harness-lib.mjs`, `benchmarks/metrics-lib.mjs`, `benchmarks/assertions-lib.mjs`, product code, selector code, receipt/schema/CLI code, dependencies, manifest, candidate definitions, historical results, or qualified replay artifacts.

The explicit replay input is prerequisite evidence only. It MUST NOT be reclassified, rewritten, weakened, or converted into synthetic comparator outcomes.

### R007-06 — single-use T113 metrics executor

R007-06 is blocked until R007-05 is canonically qualified and closed.

Prospective tracked mutation surface, only after a separate implementation authorization becomes canonical:

- `.github/workflows/spec-007-t113-metrics.yml`

Required executor behavior:

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
   - T091 aggregate-input artifact from run `33428011206`, artifact `9773332273`;
   - T111 replay artifact from run `33991920845`, artifact `9976936986`;
   - T112 replay artifact from run `34036997231`, artifact `9990519748`;
11. verify expected replay JSON SHA-256 and canonical evidence SHA-256 values before use;
12. run T076 metric collection for Jotai using the qualified T111 replay as `--t075-input`;
13. run T076 metric collection for Immer using the qualified T112 replay as `--t075-input`;
14. never invoke a new T075 prerequisite replay for those two cases;
15. run unchanged current T077 case assertions over each new T076 result;
16. aggregate the six frozen historical T091 T076 case inputs plus the two new T076 case results through current `benchmarks/metrics.mjs` aggregate mode;
17. aggregate the corresponding six frozen historical T077 case inputs plus the two new T077 case results through current `benchmarks/assertions.mjs` aggregate mode;
18. require aggregate absolute assertion status `ABSOLUTE_ASSERTIONS_SATISFIED`;
19. preserve exact `hit | miss | unavailable` facts and explicit availability counts;
20. preserve `no_pre_data_recall_threshold = true` and introduce no post-data universal acceptance percentage;
21. bind exact source commit/tree, manifest revision, all eight case identities, T091/T111/T112 run and artifact provenance, metrics/assertion machinery identities, and historical result blob identities;
22. produce one bounded T113 candidate artifact for later repository publication;
23. upload that candidate artifact with bounded retention;
24. do not commit directly from the workflow;
25. no `workflow_dispatch`, wildcard ref, arbitrary case/repository/run/artifact/command/runtime input, reusable generalized executor, rerun-to-green, or second execution ref under this plan.

### T113-R2 — additive publication

T113-R2 is blocked until:

1. R007-05 is canonically qualified and closed;
2. R007-06 is canonically qualified and closed;
3. `run/spec007-t113-metrics-r1` is proven absent and then created exactly once from exact then-canonical `main`;
4. its first create-event `run_attempt=1` succeeds and produces a genuine candidate artifact;
5. the candidate artifact proves satisfied absolute assertions and honest complete eight-case accounting.

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

`T111 qualified -> T112 qualified -> T113 stop condition -> T113 recovery planning -> implementation authorization -> R007-05 -> R007-06 -> single-use T113 metrics run -> T113-R2 publication -> T114`

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
- no historical result rewrite;
- no generalized benchmark framework;
- no arbitrary workflow input surface;
- no wildcard execution ref;
- no force-push, rebase, or destructive shared-history rewrite;
- no stale CI/review reuse after head mutation;
- no fabricated evidence, review, CI, authority, qualification, mergeability, or completion.

## Planning-only boundary

This file authorizes no implementation. No benchmark script, test, workflow, execution ref, result, product, selector, schema, dependency, runtime, donor, oracle, manifest, or historical result may be mutated from this planning artifact alone.

A separate explicit implementation authorization must become canonical before R007-05 begins.