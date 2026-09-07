# R007-09 Implementation Authorization

**Spec:** 007  
**Status:** `AUTHORIZATION_PENDING_MERGE`  
**Authorization ledger:** Issue #234  
**Recovery planning ledger:** Issue #230 (`CLOSED_CANONICAL / IMPLEMENTATION_AUTHORIZATION_REQUIRED`)  
**T113 publication ledger:** Issue #208  
**Canonical authorization base:** `137d6cf04802c5a596327cd19511dd7ce8328e3f`  
**Canonical authorization-base tree:** `479f7beba838e176eca7bd3d6750f8315e0a82d1`

## Purpose

Prospectively authorize only R007-09, the bounded T113 reporter-diagnostic recovery implementation defined by the canonical post-r2 recovery plan.

This artifact becomes effective only after its exact final head is independently qualified, guarded-merged, post-merge verified, and Issue #234 is durably closed as:

`R007-09_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`

Before that closeout, it authorizes no implementation mutation, no successor execution ref, no workflow mutation, no T113 execution, no T113 publication, and no T114 work.

## Canonical authority chain

Read this authorization with, in precedence order:

1. `.specify/memory/constitution.md`;
2. `CONTRIBUTING.md`;
3. canonical Spec 007 specification, plan, tasks, and implementation authority;
4. `specs/007-historical-benchmark-corpus-expansion/T113_METRICS_RECOVERY_PLAN.md`;
5. `specs/007-historical-benchmark-corpus-expansion/T113_METRICS_RECOVERY_IMPLEMENTATION_AUTHORIZATION.md`;
6. `specs/007-historical-benchmark-corpus-expansion/T113_T076_MEMBERSHIP_RECOVERY_PLAN.md`;
7. `specs/007-historical-benchmark-corpus-expansion/T113_R2_REPORTER_DIAGNOSTIC_RECOVERY_PLAN.md`;
8. Issue #208;
9. Issue #230 canonical planning closeout;
10. Issue #234;
11. immutable failed T113 r1 run `34130848099`, attempt `1`, job `101770327800`;
12. immutable failed T113 r2 run `34158105972`, attempt `1`, job `101854028688`.

Live repository/GitHub truth overrides stale status text in historical artifacts.

The canonical security source study at `docs/strategy/SECURITY_VERIFICATION_SOURCE_STUDY.md` is expressly `RESEARCH_ONLY / NON_AUTHORITATIVE / IMPLEMENTATION_NOT_AUTHORIZED`. Its canonical capture does not widen R007-09 and grants no code, data, dependency, scanner, SARIF, model/provider, or security-integration authority.

## Canonical predecessor planning

The post-r2 reporter-diagnostic recovery plan is canonically qualified and merged as:

- planning ledger: Issue #230 — `T113_RECOVERY_PLANNING = CLOSED_CANONICAL / IMPLEMENTATION_AUTHORIZATION_REQUIRED`;
- planning PR: #232 — MERGED;
- exact qualified/reviewed planning head: `7af5ae217ee5710ba4c01d93b7c0e54d3d26caec`;
- planning head tree: `13695524c38d6ddc995986429d54d92299ec5305`;
- canonical planning merge: `f1d6866b54d06322a1a606a0aba4676b37e54c8d`;
- planning artifact: `specs/007-historical-benchmark-corpus-expansion/T113_R2_REPORTER_DIAGNOSTIC_RECOVERY_PLAN.md`;
- Self Verification run `34159996681`: SUCCESS;
- Project CI run `34159996669`: original-attempt SUCCESS across the required six-lane matrix;
- fresh independent exact-head CodeRabbit review run `8a73dae9-ac43-41c1-adbf-12683946ec28`: no actionable comments, merge risk Minimal;
- unresolved material review threads: zero;
- GitHub merge verification: `verified=true`, `reason=valid`.

The current authorization base additionally contains only the independent research-only security source-study merge from PR #233. That research merge changes no R007-09 implementation authority or dependency ordering.

## Immutable failed execution evidence

### Consumed r1

- ref: `run/spec007-t113-metrics-r1`;
- source/workflow SHA: `f1ab8e36e6710287523cd4c029f55ca2bf57347d`;
- run: `34130848099`;
- attempt: `1`;
- job: `101770327800`;
- conclusion: `failure`;
- exact failure: `oracle_membership: Error: membership audit did not produce a runner JSON report`;
- candidate artifact: none.

### Consumed r2

- ref: `run/spec007-t113-metrics-r2`;
- source/workflow SHA: `e5fd9e2333b9df320f17d862b378ab1c2ac80dae`;
- run: `34158105972`;
- attempt: `1`;
- job: `101854028688`;
- conclusion: `failure`;
- exact failure: `oracle_membership: Error: membership audit did not produce a runner JSON report`;
- T077 execution: skipped after T076 failure;
- candidate construction/upload: skipped;
- candidate artifact: none.

Both refs and runs are immutable final failure evidence. They MUST NOT be rerun, moved, force-updated, deleted/recreated, reused, substituted, or reclassified.

## Read-only causal evidence entering authorization

Issue #234 records the following bounded conclusions from canonical code and immutable execution evidence:

`ROOT_CAUSE = UNPROVEN`

`DIAGNOSTIC_PARITY_NEED = PROVEN`

`EXACT_WRAPPER_LIFECYCLE_TEST_GAP = PROVEN`

`CACHE_EXPANSION_JUSTIFIED = NO`

`PROXY_PRELOAD_MUTATION_JUSTIFIED = NO`

`MATERIALIZATION_MUTATION_JUSTIFIED = NO`

`SUCCESSOR_EXECUTION_AUTHORIZED = NO`

Specifically:

1. the existing R007-07 regression fixture exercised a direct synthetic `./node_modules/.bin/vitest` command and did not reproduce the complete package-manager wrapper plus cold/warm/restoration/proof topology;
2. qualified T111 evidence proves the real reviewed `yarn test:ci --run` command can produce genuine required runner JSON under the frozen Linux x64 / Node `24.15.0` / Yarn Classic `1.22.22` environment, so Yarn/Vitest capability is not disproven;
3. T075 and T076 share `membershipProofCommand(...)` and the existing proxy/preload instrumentation primitives;
4. r1 and r2 reached T076 report collection after a normally exited proof whose exit code equaled the comparator exit code;
5. T075 exposes bounded proof output on missing-report failure, while T076 currently discards the already-captured proof stdout/stderr before emitting a generic no-report error;
6. qualified materialization retains measured repositories and dependency reconstruction under `--keep-temp`; no evidence supports changing materialization cleanup;
7. R007-07 already prepared the canonical four managed runner-cache paths before T076 proof and r2 still failed; no additional cache path is justified;
8. residual state after the complete cold/warm/restoration/proof topology remains only a hypothesis class until a deterministic local fixture reproduces it.

No authorization in this artifact may convert an unproven hypothesis into a claimed cause.

## Authorized unit after this artifact becomes effective

Exactly:

`R007-09 — T113 reporter-diagnostic recovery`

No later recovery, workflow, execution, publication, T114, or security-research unit becomes authorized by implication.

## Exact tracked implementation mutation surface

Exactly these two tracked paths:

- `benchmarks/metrics.mjs`;
- `tests/benchmark-metrics.test.ts`.

No third tracked path is authorized.

If deterministic evidence shows that a valid repair requires any other tracked path, R007-09 MUST stop as:

`R007-09 = NO_GO / RETURN_TO_PLANNING`

It MUST NOT widen itself.

## Authorized objective A — T076 missing-report diagnostic parity

R007-09 MAY change `benchmarks/metrics.mjs` only enough to preserve bounded diagnostics from the already-captured membership-proof process when required structured report collection fails.

The diagnostic path MUST preserve all of these properties:

1. missing required structured runner JSON remains a hard failure;
2. stdout/stderr MUST NOT become membership evidence;
3. textual test-name parsing MUST NOT become membership evidence;
4. no fallback may synthesize runner JSON;
5. bounded output may appear only in the failure diagnostic path;
6. successful structured-report paths remain semantically unchanged;
7. proof process normal-exit requirements remain unchanged;
8. proof/comparator exit-code equality remains unchanged;
9. report path, size, JSON parsing, `testResults`, reviewed-path, and reviewed-test-ID validation remain fail-closed;
10. diagnostic output must be length-bounded;
11. output truncation remains an error under the existing capture-cap rules;
12. diagnostics must not be persisted into benchmark result truth as membership evidence;
13. diagnostics must not weaken controller-secret isolation or donor-environment sanitization.

A reasonable target is parity with the existing bounded T075 missing-report diagnostic behavior, without making T076 depend on T075 code or changing T075 semantics.

## Authorized objective B — exact wrapper/process-boundary lifecycle regression

R007-09 MUST add deterministic focused regression coverage in `tests/benchmark-metrics.test.ts` that models the production topology missing from R007-07.

The reviewed production command shape to represent is:

`yarn test:ci --run`

with a fixture package script semantically equivalent to:

`test:ci = vitest`

The fixture must cover the relevant T076 lifecycle as one causal sequence:

1. measured source begins in the expected state;
2. cold comparator execution occurs;
3. warm comparator execution occurs;
4. measured source is restored;
5. canonical managed runner-cache preparation occurs;
6. required membership-proof instrumentation is applied;
7. the package-manager/script boundary dispatches to a project-local Vitest-shaped child;
8. the structured report is produced or intentionally withheld by the deterministic fixture mode;
9. proof exit behavior is compared with the observed comparator exit code;
10. structured report collection either succeeds under the existing membership rules or fails closed with bounded diagnostics;
11. successful report collection still proves only structured reviewed-test membership.

The fixture MUST be local, deterministic, bounded, and network-free.

## Fixture portability constraint

Canonical Project CI installs Ascout through `npm ci --ignore-scripts --no-audit --no-fund` and does not establish Yarn as an explicit test-suite dependency across the required six-lane matrix.

R007-09 is not authorized to mutate CI, package metadata, lockfiles, or dependencies and MUST NOT create a hidden ambient-Yarn requirement.

Therefore the fixture MUST preserve the reviewed command shape/process boundary without depending on an undeclared runner-global Yarn installation.

If necessary, the authorized test file MAY construct a bounded test-only launcher named `yarn` on the fixture PATH that performs only the reviewed package-script dispatch necessary to model:

`parent process -> yarn-shaped launcher -> package script -> project-local Vitest-shaped child`

Such a launcher:

- is test machinery only;
- MUST be created wholly by the authorized test file in a bounded temporary fixture;
- MUST NOT be represented as evidence about Yarn Classic implementation semantics;
- MUST NOT perform network access or dependency installation;
- MUST NOT escape the temporary fixture;
- MUST preserve argument forwarding needed to model `yarn test:ci --run`;
- MUST permit the existing proxy/preload membership instrumentation boundary to be exercised realistically enough to answer the causal question.

Actual Yarn Classic capability remains grounded only in the already-qualified T111 evidence and immutable r1/r2 execution context.

## Causal gate before any behavioral repair

Diagnostic parity is independently justified and may be implemented even if the exact wrapper/lifecycle fixture does not reproduce the missing-report condition.

Any additional runtime behavioral repair in `benchmarks/metrics.mjs` is authorized ONLY if focused deterministic evidence satisfies all of the following:

1. reproduces a missing-runner-report condition under the authorized wrapper/process-boundary lifecycle;
2. demonstrates the condition after the cold/warm/restoration/proof sequence rather than only in an artificial direct-runner shortcut;
3. attributes the reproduced cause to logic or state lifecycle inside the exact authorized `benchmarks/metrics.mjs` surface;
4. demonstrates that the proposed repair removes that cause without changing the external membership evidence contract;
5. includes a regression that fails before the repair and passes after it;
6. preserves success and negative/fail-closed cases.

If those conditions are not met, no behavioral repair is authorized beyond diagnostic parity.

The terminal implementation disposition must then be:

`R007-09 = NO_GO / RETURN_TO_PLANNING`

A local non-reproduction MUST NOT be used as justification for a speculative remote successor execution.

## Required negative tests

Within the authorized test file, R007-09 MUST preserve or add focused coverage proving as applicable that:

- expected exit code plus no JSON still fails;
- diagnostic output is bounded;
- diagnostic output cannot satisfy membership;
- invalid JSON fails;
- missing `testResults` fails;
- wrong reviewed path/test identity does not prove membership;
- proof exit-code drift fails;
- successful structured JSON remains accepted under unchanged semantics;
- cold/warm lifecycle fixture does not rely on network/install/global Yarn;
- any deterministic reproduced cause cannot be bypassed by retry/fallback behavior.

Tests may be adapted to existing helpers and fixture style but may not broaden runtime authority.

## Membership semantics that MUST remain unchanged

R007-09 MUST preserve:

1. required project-native full-suite membership is structured-report-only;
2. runner JSON is external machine evidence, not inferred console text;
3. proof process must exit normally;
4. proof exit code must equal the observed comparator exit code;
5. reporter/output authority remains controlled by the existing membership instrumentation;
6. report path and size handling remains bounded;
7. parsed reports require `testResults`;
8. membership requires reviewed regression paths and reviewed regression IDs;
9. no synthetic membership evidence;
10. no stdout/stderr-derived membership truth;
11. no generalized fallback reporter;
12. no retry-to-green path;
13. no policy weakening from `required` to `observed`, `none`, or another state.

## Frozen evidence and formulas that MUST remain unchanged

R007-09 MUST NOT invalidate, regenerate as a substitute, rewrite, or reinterpret:

- T091 aggregate input run `33428011206` and its qualified artifact identity;
- T111 Jotai qualified replay run `33991920845` and artifact `9976936986`;
- T112 Immer qualified replay run `34036997231` and artifact `9990519748`;
- T111 historical revision-12/current revision-13 Jotai compatibility proof;
- frozen `benchmarks/results/t078-selector-misses.json`;
- frozen `benchmarks/results/t091-m2-selection-replay.json`;
- frozen `benchmarks/results/t095-branch-exercise-qualification.json`;
- T076 metric formulas;
- T077 assertion formulas;
- comparator definitions;
- selector/product behavior;
- manifest case semantics;
- `no_pre_data_recall_threshold = true`.

## Explicitly unauthorized tracked surfaces

R007-09 MUST NOT mutate:

- `.github/workflows/**`;
- `benchmarks/harness-lib.mjs`;
- `benchmarks/membership-proxy.mjs`;
- `benchmarks/membership-preload.cjs`;
- `benchmarks/run.mjs`;
- `benchmarks/metrics-lib.mjs`;
- `benchmarks/assertions.mjs`;
- `benchmarks/manifest.json`;
- any `benchmarks/results/**` path;
- package metadata or lockfiles;
- application/product source;
- selector logic;
- receipt/schema/CLI code;
- documentation other than this authorization artifact during authorization qualification;
- security-source-study code/data/dependencies.

If a correct fix requires one of these paths, stop and return to planning.

## Explicit non-grants

This authorization does NOT authorize:

- a successor T113 execution ref;
- the name `r3` or any other successor ref name;
- any Git ref creation for T113 execution;
- any workflow amendment;
- any rerun of r1 or r2;
- ref movement/deletion/recreation;
- T113 result publication;
- T114 mutation;
- a remote execution as a diagnostic experiment;
- new cache-path guesses;
- broader cache deletion;
- proxy/preload redesign;
- materialization redesign;
- dependency installation or package changes;
- metric/assertion/comparator weakening;
- membership-policy weakening;
- product/selector/schema/receipt/CLI change;
- source/dataset/code/rule import from AICGSecEval, AI-Infra-Guard, or Magika;
- security scanner/SARIF/Magika/model/provider integration;
- cloud/API credential use;
- force-push/rebase/destructive history rewrite.

## Implementation method constraints

After this authorization becomes effective, implementation MUST:

1. create a separate implementation branch from exact then-current canonical `main`;
2. mutate only the exact two authorized tracked paths;
3. begin with deterministic diagnostic/test work rather than a speculative runtime repair;
4. preserve fail-closed membership truth;
5. record the focused causal result in Issue #234 or the implementation ledger before claiming a behavioral cause;
6. make no successor execution-ref mutation;
7. use forward-only repairs;
8. treat every implementation-head mutation as invalidating stale exact-head CI/review evidence.

## Focused implementation qualification

Before repository-wide qualification, the future implementation must run the strongest applicable focused checks, including:

- deterministic tests covering the new diagnostic failure path;
- deterministic exact wrapper/process-boundary lifecycle tests;
- existing benchmark-metrics focused tests;
- TypeScript/type or syntax validation applicable to the repository;
- build validation applicable to the repository.

A claimed behavioral repair requires a pre/post regression that establishes the bounded causal result. Merely obtaining green repository CI is not causal evidence.

## Repository-wide implementation qualification

A future R007-09 implementation may merge only after its exact final head satisfies:

1. exact two-path mutation purity;
2. focused deterministic causal/diagnostic tests pass;
3. exact final head/tree verification;
4. exact-head Self Verification SUCCESS;
5. original-attempt exact-head Project CI SUCCESS across all six required OS/Node lanes;
6. fresh independent substantive exact-head benchmark/correctness/security/governance review;
7. every material finding reconciled;
8. zero unresolved material review threads;
9. current repository ruleset and observable branch-protection truth recorded;
10. canonical `main` still equals the PR base immediately before merge;
11. PR remains open, non-draft, and mergeable;
12. guarded normal merge using exact expected head SHA;
13. post-merge verification of canonical main, ordered parents, merge tree/path delta, GitHub signature, and PR state;
14. durable R007-09 closeout.

Allowed closeout markers are only:

`R007-09 = CLOSED_CANONICAL / QUALIFIED`

or

`R007-09 = NO_GO / RETURN_TO_PLANNING`

A `QUALIFIED` closeout means only that the bounded diagnostic/causal implementation is qualified. It grants no execution authority.

## Authorization artifact qualification and effectivity

This authorization artifact itself becomes effective only after:

1. exact one-path additive authorization-artifact purity;
2. exact branch ancestry from canonical base `137d6cf04802c5a596327cd19511dd7ce8328e3f` unless live main changes before qualification, in which case the authorization candidate must be reconciled forward-only to current main before merge;
3. exact final authorization head/tree verification;
4. exact-head Self Verification SUCCESS;
5. original-attempt exact-head Project CI SUCCESS across all six required OS/Node lanes;
6. fresh independent substantive exact-head authorization/correctness/security/governance review;
7. reconciliation of every material finding;
8. zero unresolved material review threads;
9. current ruleset/observable protection verification;
10. canonical `main` equals the authorization PR base immediately before guarded merge;
11. authorization PR is open, non-draft, and mergeable;
12. guarded normal merge with exact expected head SHA;
13. post-merge verification of canonical main, ordered parents, tree/path delta, GitHub verification, and PR state;
14. durable Issue #234 closeout exactly as:

`R007-09_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`

Any authorization-head mutation invalidates all stale exact-head CI/review qualification.

## Dependency order after authorization effectivity

The only authorized next sequence is:

`R007-09 implementation -> focused deterministic causal disposition -> exact-head repository qualification -> guarded implementation merge -> post-merge closeout`

Only if R007-09 closes as `CLOSED_CANONICAL / QUALIFIED` may planning begin for a separate prospective successor execution authorization.

That future authorization, if justified, must separately:

- choose one never-before-created exact successor ref;
- bind the exact then-canonical workflow/source contract;
- qualify/merge/close before ref creation;
- require a new mandatory fresh read-only preflight;
- permit creation of the exact ref once only;
- accept only its first `create`-event run attempt `1`;
- classify failure as final with no rerun/ref recreation/substitute execution.

No successor ref name or execution is authorized by this artifact.

## Hard prohibitions

- no implementation before this authorization is effective;
- no mutation outside `benchmarks/metrics.mjs` and `tests/benchmark-metrics.test.ts` during R007-09;
- no r1/r2 rerun, movement, deletion, recreation, reuse, substitution, or reclassification;
- no new T113 execution ref;
- no workflow mutation;
- no T113 publication;
- no T114 work;
- no security-source implementation;
- no donor/dependency/runtime substitution;
- no cache or reporter speculation without deterministic evidence;
- no evidence weakening;
- no metric/assertion/membership-policy weakening;
- no stale CI/review reuse after any head mutation;
- no force-push/rebase/destructive history rewrite;
- no fabricated CI, review, runtime evidence, artifact evidence, hashes, authority, eligibility, qualification, mergeability, readiness, closure, or completion.
