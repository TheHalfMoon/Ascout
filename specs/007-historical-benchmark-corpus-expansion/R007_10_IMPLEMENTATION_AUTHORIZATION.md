# R007-10 Implementation Authorization

**Spec:** 007  
**Status:** `AUTHORIZATION_PENDING_MERGE`  
**Authorization ledger:** Issue #240  
**Canonical planning ledger:** Issue #238 (`R007-10_PLANNING = CLOSED_CANONICAL / IMPLEMENTATION_AUTHORIZATION_REQUIRED`)  
**T113 publication ledger:** Issue #208  
**Canonical authorization base:** `f352f038cb19c266ca05e83c85d37bc153204ef5`  
**Canonical authorization-base tree:** `02731e23ac8fc3788919187955d32c24ff0b6791`

## Purpose

Prospectively authorize only the bounded R007-10 qualification correction defined by the canonical planning artifact:

`specs/007-historical-benchmark-corpus-expansion/R007_10_QUALIFICATION_CORRECTION_PLAN.md`

This artifact becomes effective only after its exact final head is independently qualified, guarded-merged, post-merge verified, and Issue #240 is durably closed as:

`R007-10_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`

Before that closeout, it authorizes no implementation mutation.

## Canonical authority chain

Read this authorization with, in precedence order:

1. `.specify/memory/constitution.md`;
2. `CONTRIBUTING.md`;
3. canonical Spec 007 specification, plan, tasks, and implementation authority;
4. `specs/007-historical-benchmark-corpus-expansion/T113_R2_REPORTER_DIAGNOSTIC_RECOVERY_PLAN.md`;
5. `specs/007-historical-benchmark-corpus-expansion/R007_09_IMPLEMENTATION_AUTHORIZATION.md`;
6. `specs/007-historical-benchmark-corpus-expansion/R007_10_QUALIFICATION_CORRECTION_PLAN.md`;
7. Issue #208;
8. Issue #234 including the post-merge R007-09 qualification correction;
9. Issue #238 canonical planning closeout;
10. Issue #240;
11. immutable failed T113 r1 run `34130848099`, attempt `1`;
12. immutable failed T113 r2 run `34158105972`, attempt `1`.

Live repository and GitHub truth override stale status text in historical artifacts.

## Canonical predecessor planning

R007-10 planning is canonical and qualified as:

- planning issue: #238 — `R007-10_PLANNING = CLOSED_CANONICAL / IMPLEMENTATION_AUTHORIZATION_REQUIRED`;
- planning PR: #239 — MERGED;
- exact qualified/reviewed planning head: `7e97b327770b814430da6b0b1568900596a3ecae`;
- planning merge/current authorization base: `f352f038cb19c266ca05e83c85d37bc153204ef5`;
- planning merge tree: `02731e23ac8fc3788919187955d32c24ff0b6791`;
- planning merge signature: GitHub `verified=true`, `reason=valid`;
- planning Self Verification run `34170820225`: SUCCESS;
- planning Project CI run `34170820377`: original-attempt SUCCESS across all six required OS/Node lanes;
- independent exact-head CodeRabbit review run `84d2a53b-762e-4a05-b2cf-936ad4a8e899`: no actionable comments;
- unresolved material planning review threads: zero.

## Immutable evidence and current truth

The consumed T113 executions remain immutable final failure evidence:

### r1

- ref: `run/spec007-t113-metrics-r1`;
- run: `34130848099`;
- attempt: `1`;
- conclusion: `failure`;
- exact failure: `oracle_membership: Error: membership audit did not produce a runner JSON report`;
- candidate artifact: none.

### r2

- ref: `run/spec007-t113-metrics-r2`;
- run: `34158105972`;
- attempt: `1`;
- conclusion: `failure`;
- exact failure: `oracle_membership: Error: membership audit did not produce a runner JSON report`;
- T077 execution: skipped after T076 failure;
- candidate artifact: none.

Both refs and runs MUST NOT be rerun, moved, force-updated, deleted/recreated, reused, substituted, or reclassified.

Current durable causal truth remains:

`ROOT_CAUSE = UNPROVEN`

`R007-09 = NO_GO / RETURN_TO_PLANNING`

`R007-09_IMPLEMENTATION_MERGED = YES`

`R007-09_IMPLEMENTATION_QUALIFICATION = INCOMPLETE / EXACT_WRAPPER_MALFORMED_REPORT_TEST_GAP`

`T113 = NO_GO / RETURN_TO_PLANNING`

`T114 = BLOCKED_BY_T113`

## Authorized unit after this artifact becomes effective

Exactly:

`R007-10 — exact-wrapper malformed-report qualification correction`

No later recovery, workflow, execution, publication, T114, or security-research unit becomes authorized by implication.

## Exact tracked implementation mutation surface

Exactly one tracked path:

- `tests/benchmark-metrics.test.ts`

No second tracked path is authorized.

If a correct implementation requires any other tracked path, R007-10 MUST stop as:

`R007-10 = NO_GO / RETURN_TO_PLANNING`

and MUST NOT widen itself.

## Exact authorized implementation

R007-10 MUST add one deterministic regression within the existing:

`R007-09 exact T076 wrapper lifecycle`

test group.

The regression MUST:

1. construct the existing `createR00709WrapperFixture()` fixture;
2. use the existing test-only export boundary rather than adding a production export;
3. call `timedCommandPair(...)` with exact command shape `yarn test:ci --run`;
4. complete the ordinary cold and warm comparator path before selecting the negative proof mode;
5. set the existing fixture mode to `malformed` only after timed comparator collection;
6. call `membershipAudit(...)` through the same package-script/process-boundary proof lifecycle;
7. require the malformed external JSON to be rejected by the existing report parser;
8. assert a hard failure and never convert malformed bytes into membership truth;
9. assert the lifecycle log remains exactly `comparator:cold`, `comparator:warm`, `proof`;
10. clean up the fixture in `finally` using the existing bounded cleanup.

The implementation SHOULD use the narrowest stable rejection assertion supported by the existing test style. It MUST NOT modify production error classification merely to make the test assertion convenient.

## Required preservation

R007-10 MUST preserve all existing R007-09 wrapper tests and all pre-existing benchmark-metrics negative coverage, including as applicable:

- valid structured report acceptance;
- intentional no-report hard failure with bounded diagnostics;
- wrong reviewed path/test identity rejection;
- direct-local-bin malformed JSON rejection;
- missing `testResults` rejection;
- proof exit-code mismatch rejection;
- report-size/capture/truncation fail-closed behavior.

## Membership semantics that MUST remain unchanged

R007-10 MUST preserve:

1. structured runner JSON as the only required membership truth;
2. no stdout/stderr-derived membership;
3. no textual test-name inference;
4. no synthetic runner JSON;
5. proof normal-exit requirement;
6. proof/comparator exit-code equality;
7. report path/size/parse handling fail-closed;
8. `testResults` requirement;
9. reviewed path and reviewed test-ID requirements;
10. no generalized fallback reporter;
11. no retry-to-green path;
12. no membership-policy weakening.

## Wrapper fixture invariants

The existing fixture remains test machinery only.

R007-10 MUST preserve:

- exact command shape `yarn test:ci --run`;
- package-script boundary equivalent to `test:ci = vitest`;
- project-local executable dispatch;
- process/environment inheritance relevant to the existing regression;
- bounded temporary-fixture scope;
- network-free operation;
- installation-free operation;
- no hidden global-Yarn requirement;
- no claim that the test-only launcher proves Yarn Classic implementation semantics.

Actual Yarn Classic capability remains grounded only in previously qualified evidence.

## Frozen evidence and formulas that MUST remain unchanged

R007-10 MUST NOT invalidate, regenerate as a substitute, rewrite, or reinterpret:

- T091 aggregate input run `33428011206` and qualified artifact identity;
- T111 qualified replay run `33991920845` and artifact `9976936986`;
- T112 qualified replay run `34036997231` and artifact `9990519748`;
- frozen `benchmarks/results/t078-selector-misses.json`;
- frozen `benchmarks/results/t091-m2-selection-replay.json`;
- frozen `benchmarks/results/t095-branch-exercise-qualification.json`;
- T076 metric formulas;
- T077 assertion formulas;
- comparator definitions;
- selector/product behavior;
- manifest case semantics;
- `no_pre_data_recall_threshold = true`;
- r1/r2 immutable failure evidence.

## Explicitly unauthorized tracked surfaces

R007-10 MUST NOT mutate:

- `benchmarks/metrics.mjs`;
- `benchmarks/harness-lib.mjs`;
- `benchmarks/membership-proxy.mjs`;
- `benchmarks/membership-preload.cjs`;
- `benchmarks/run.mjs`;
- `benchmarks/metrics-lib.mjs`;
- `benchmarks/assertions.mjs` or assertion libraries;
- `benchmarks/manifest.json`;
- any `benchmarks/results/**` path;
- `.github/workflows/**`;
- package metadata or lockfiles;
- application/product source;
- selector logic;
- receipt/schema/CLI code;
- donor/oracle/runtime/replay definitions;
- security-source-study implementation.

If correct implementation requires one of these paths, stop and return to planning.

## Explicit non-grants

This authorization does NOT authorize:

- implementation before this authorization becomes effective;
- any successor T113 execution ref;
- the name `r3` or any other successor-ref name;
- any T113 Git ref creation;
- any workflow amendment;
- any rerun of r1 or r2;
- ref movement/deletion/recreation;
- any T113 execution or remote diagnostic experiment;
- T113 publication;
- T114 mutation;
- production/runtime repair;
- cache expansion;
- proxy/preload/materialization mutation;
- dependency installation or package changes;
- metric/assertion/comparator change;
- membership-policy weakening;
- product/selector/schema/receipt/CLI change;
- source/dataset/code/rule import from external donor repositories;
- security scanner/SARIF/model/provider integration;
- cloud/API credential use;
- force-push/rebase/destructive history rewrite.

## Implementation branch requirements

After this authorization becomes effective, implementation MUST:

1. reverify exact canonical `main` and the effective authorization closeout;
2. create a separate implementation branch from exact then-current canonical `main`;
3. mutate exactly `tests/benchmark-metrics.test.ts` only;
4. add only the missing malformed-wrapper lifecycle qualification regression;
5. preserve the existing fixture and production semantics;
6. make no production/runtime mutation;
7. stop rather than widen if any other path becomes necessary.

## Focused implementation qualification

On the exact final implementation head, require at minimum:

1. the new malformed-wrapper lifecycle regression passes on Linux;
2. existing valid/no-report/wrong-identity R007-09 wrapper regressions remain green;
3. existing direct-bin malformed/missing-`testResults`/exit-mismatch fail-closed regressions remain green;
4. all benchmark-metrics tests remain green;
5. applicable typecheck succeeds;
6. applicable build succeeds.

Passing this test-only correction does not establish the historical T113 production root cause.

## Repository-wide implementation qualification

Before any R007-10 implementation merge require:

1. exact one-path `tests/benchmark-metrics.test.ts` purity;
2. focused qualification above;
3. exact final head/tree verification;
4. exact-head Self Verification SUCCESS;
5. original-attempt exact-head Project CI SUCCESS across all six required OS/Node lanes;
6. fresh independent substantive exact-head correctness/security/portability/governance review;
7. reconciliation of every material finding;
8. zero unresolved material review threads;
9. current ruleset and observable branch-protection truth recorded;
10. canonical `main` still equals the implementation PR base immediately before merge;
11. PR open, non-draft, and mergeable;
12. guarded normal merge using exact expected head SHA;
13. post-merge canonical main, ordered parents, tree/path delta, signature, and PR-state verification;
14. durable R007-10 closeout.

Any implementation-head mutation invalidates stale exact-head CI/review evidence.

## Allowed R007-10 implementation closeout

Only:

`R007-10 = CLOSED_CANONICAL / QUALIFIED`

or

`R007-10 = NO_GO / RETURN_TO_PLANNING`

A qualified R007-10 closeout means only that the missing canonical exact-wrapper malformed-report qualification requirement has been restored prospectively.

It does NOT prove `ROOT_CAUSE`, authorize a T113 successor execution, authorize T113 publication, or unblock T114.

## Authorization qualification

Before this authorization artifact becomes effective require:

1. exact one-path additive authorization-artifact purity;
2. exact branch ancestry from authorization base `f352f038cb19c266ca05e83c85d37bc153204ef5` unless live main changes, in which case reconcile forward-only before merge;
3. exact final authorization head/tree verification;
4. exact-head Self Verification SUCCESS;
5. original-attempt exact-head Project CI SUCCESS across all six required OS/Node lanes;
6. fresh independent substantive exact-head authorization/correctness/security/governance review;
7. reconciliation of every material finding;
8. zero unresolved material review threads;
9. current ruleset/observable protection verification;
10. canonical `main` equals the authorization PR base immediately before guarded merge;
11. authorization PR open, non-draft, and mergeable;
12. guarded normal merge using exact expected head SHA;
13. post-merge canonical main, ordered parents, tree/path delta, signature, and PR-state verification;
14. durable Issue #240 closeout as:

`R007-10_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`

No implementation may begin before that closeout is recorded.

## Dependency order after authorization

Once this authorization is canonical and effective, the only newly dependency-ready mutation is the one-path R007-10 test correction described above.

Even then:

- `ROOT_CAUSE = UNPROVEN` remains true;
- `T113 = NO_GO / RETURN_TO_PLANNING` remains true;
- no successor T113 execution is authorized;
- T114 remains blocked.
