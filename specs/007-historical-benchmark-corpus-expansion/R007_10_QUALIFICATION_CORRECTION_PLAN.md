# R007-10 Qualification-Correction Plan

**Spec:** 007  
**Status:** `PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED`  
**Planning ledger:** Issue #238  
**T113 publication ledger:** Issue #208  
**Canonical planning base:** `5d6b0733e197f3bcd5b40ef3a1e3089e455fb014`  
**Canonical planning-base tree:** `e6d7948f3c5ebfb3f8b08fb4a4fb5785a5c90f96`

## Purpose

Define the smallest forward-only correction for the post-merge R007-09 qualification gap discovered by re-reading the complete canonical authority chain after PR #237 merged.

This artifact is planning only. It grants no code, test, workflow, execution-ref, result, publication, product, selector, schema, receipt, dependency, package, runtime, donor, oracle, replay, manifest, historical-result, release, or security-integration authority.

Implementation may begin only after this exact planning artifact is independently qualified, guarded-merged, post-merge verified, Issue #238 is durably closed as:

`R007-10_PLANNING = CLOSED_CANONICAL / IMPLEMENTATION_AUTHORIZATION_REQUIRED`

and a separate R007-10 implementation-authorization artifact becomes canonical and effective.

## Canonical authority chain

Read this plan with, in precedence order:

1. `.specify/memory/constitution.md`;
2. `CONTRIBUTING.md`;
3. canonical Spec 007 specification, plan, tasks, and implementation authority;
4. `specs/007-historical-benchmark-corpus-expansion/T113_R2_REPORTER_DIAGNOSTIC_RECOVERY_PLAN.md`;
5. `specs/007-historical-benchmark-corpus-expansion/R007_09_IMPLEMENTATION_AUTHORIZATION.md`;
6. Issue #208;
7. Issue #234 including its post-merge governance correction;
8. Issue #238;
9. canonical PR #237 merge and exact current repository state.

Live repository and GitHub truth override stale status text in historical artifacts.

## Canonical trigger

R007-09 implementation merged through PR #237:

- implementation base: `229c9dfeef3bb644702ba24f559e52dfd104eb21`;
- implementation head: `79c5dbd4e96df14ced29859b5fc6a08ea329eb23`;
- reviewed head tree: `e6d7948f3c5ebfb3f8b08fb4a4fb5785a5c90f96`;
- merge/current planning base: `5d6b0733e197f3bcd5b40ef3a1e3089e455fb014`;
- merge tree: `e6d7948f3c5ebfb3f8b08fb4a4fb5785a5c90f96`;
- merge signature: GitHub verified/valid.

The merged implementation added bounded T076 missing-report diagnostics and an exact-wrapper fixture for `yarn test:ci --run` with a test-only package-script dispatcher.

Focused exact-head evidence proved:

- valid wrapper lifecycle: PASS;
- intentional no-report wrapper lifecycle: hard fail-closed with bounded diagnostics;
- wrong reviewed path/test identity: does not become membership truth;
- historical missing-report cause: not reproduced locally;
- behavioral repair: not justified.

Therefore the causal disposition remains:

`R007-09 = NO_GO / RETURN_TO_PLANNING`

`ROOT_CAUSE = UNPROVEN`

## Post-merge qualification-contract gap

The canonical post-r2 recovery plan explicitly requires:

> The fixture MUST also deterministically exercise no-report and malformed-report modes through the same `yarn test:ci --run` wrapper lifecycle and prove that both remain hard failures.

Canonical `tests/benchmark-metrics.test.ts` already contains:

- the exact R007-09 wrapper fixture;
- a fixture `malformed` mode that writes invalid external JSON;
- an older R007-07 direct-local-bin malformed-report test proving parser fail-closed behavior.

However, the R007-09 exact-wrapper test group does not invoke the fixture's `malformed` mode. Therefore the merged code lacks one explicit lifecycle regression required by the canonical plan.

This is a **qualification/test-coverage defect**, not evidence of a runtime defect, membership-policy defect, metric defect, selector defect, donor defect, or production root cause.

CodeRabbit initially identified this gap before PR #237 merged. Its later withdrawal interpreted only the narrower authorization negative-test wording and did not reconcile the stricter incorporated planning requirement. The post-merge canonical re-read therefore supersedes that interpretation.

## Classification

`R007-09_IMPLEMENTATION_MERGED = YES`

`R007-09_IMPLEMENTATION_QUALIFICATION = INCOMPLETE / EXACT_WRAPPER_MALFORMED_REPORT_TEST_GAP`

`R007-10 = PLANNING_ONLY / QUALIFICATION_CORRECTION`

`T113 = NO_GO / RETURN_TO_PLANNING`

`T114 = BLOCKED_BY_T113`

R007-10 is not a continuation of R007-09 runtime diagnosis and must not reopen behavioral repair authority.

## R007-10 prospective implementation

### Exact prospective tracked mutation surface

Exactly one tracked path:

- `tests/benchmark-metrics.test.ts`

No production or runtime path is planned.

If a correct correction requires any other tracked path, R007-10 MUST stop as:

`R007-10 = NO_GO / RETURN_TO_PLANNING`

and must not widen itself.

### Exact correction

A future separately authorized R007-10 implementation should add one deterministic regression in the existing:

`R007-09 exact T076 wrapper lifecycle`

test group.

The regression must:

1. construct the existing canonical `createR00709WrapperFixture()` fixture without changing its production-equivalence boundary;
2. execute `timedCommandPair(...)` with exact command shape `yarn test:ci --run`, proving the ordinary cold and warm comparator path completes first;
3. set the existing fixture mode to `malformed` only after timed comparator collection;
4. execute `membershipAudit(...)` through the same package-script/process-boundary proof path;
5. require the proof process to exit normally with the expected comparator exit code;
6. prove the produced external report bytes are malformed JSON and are rejected by the existing `collectProofReports(...)` parser;
7. assert a hard failure rather than converting malformed output into membership truth;
8. assert the lifecycle log is exactly `comparator:cold`, `comparator:warm`, `proof`;
9. clean up the fixture in `finally` using the existing bounded cleanup;
10. leave all existing positive/no-report/wrong-identity/direct-bin tests unchanged unless a minimal test-only refactor is necessary to avoid duplication and preserves their semantics exactly.

### Expected failure surface

The intended assertion is on rejection from invalid JSON parsing. No new error-classification policy or normalized production error is required by this plan.

R007-10 must not change `benchmarks/metrics.mjs` merely to make the malformed error more convenient to assert. Existing hard failure is sufficient.

## Invariants

R007-10 MUST preserve:

1. structured runner JSON as the only required membership truth;
2. no stdout/stderr-derived membership;
3. no textual test-name inference;
4. no synthetic runner JSON;
5. proof normal-exit requirement;
6. proof/comparator exit-code equality;
7. report size/capture/truncation fail-closed rules;
8. reviewed path and reviewed test-ID membership rules;
9. R007-09 bounded missing-report diagnostic behavior;
10. exact wrapper command shape `yarn test:ci --run`;
11. the test-only launcher as package-script/process-boundary machinery only, not Yarn Classic semantic evidence;
12. network-free and installation-free fixture execution;
13. T091/T111/T112 qualified evidence identities;
14. frozen T078/T091/T095 result bytes;
15. T076 metric formulas and T077 assertion formulas;
16. product/selector/schema/receipt/CLI behavior;
17. `no_pre_data_recall_threshold = true`;
18. immutable T113 r1/r2 failure evidence;
19. current R007-09 causal conclusion `ROOT_CAUSE = UNPROVEN`.

## Explicitly unauthorized surfaces

R007-10 prospective implementation MUST NOT mutate:

- `benchmarks/metrics.mjs`;
- `benchmarks/harness-lib.mjs`;
- `benchmarks/membership-proxy.mjs`;
- `benchmarks/membership-preload.cjs`;
- `benchmarks/run.mjs`;
- `benchmarks/metrics-lib.mjs`;
- `benchmarks/assertions.mjs` or assertion libraries;
- `benchmarks/manifest.json`;
- `benchmarks/results/**`;
- `.github/workflows/**`;
- package metadata or lockfiles;
- application/product source;
- selector logic;
- receipt/schema/CLI code;
- donor/oracle/runtime/replay definitions;
- security-source-study implementation.

## Explicit non-grants

This plan does NOT authorize:

- implementation before separate authorization;
- any successor T113 execution ref or successor-ref name;
- any T113 execution or remote diagnostic experiment;
- any rerun, movement, deletion/recreation, reuse, substitution, or reclassification of r1/r2;
- T113 publication;
- T114 work;
- workflow mutation;
- production/runtime repair;
- cache expansion;
- proxy/preload/materialization mutation;
- membership-policy weakening;
- retry or fallback;
- dependency/package/toolchain mutation;
- metric/assertion/comparator mutation;
- security-source implementation;
- force-push, rebase, or destructive history rewrite.

## Focused implementation qualification

A future R007-10 implementation must, on its exact final head, prove at minimum:

1. the new malformed-wrapper lifecycle regression passes on Linux;
2. the existing valid/no-report/wrong-identity R007-09 wrapper tests remain green;
3. the older direct-bin malformed/missing-`testResults`/exit-mismatch fail-closed tests remain green;
4. all existing benchmark-metrics tests remain green;
5. applicable typecheck succeeds;
6. applicable build succeeds.

Because the planned mutation is test-only, no production causal inference may be drawn merely from those tests passing.

## Repository-wide qualification

Before a future implementation merge require:

1. exact one-path `tests/benchmark-metrics.test.ts` purity;
2. focused tests above;
3. exact final head/tree verification;
4. exact-head Self Verification SUCCESS;
5. original-attempt exact-head Project CI SUCCESS across all six required OS/Node lanes;
6. fresh independent substantive exact-head correctness/security/portability/governance review;
7. every material finding reconciled;
8. zero unresolved material review threads;
9. current ruleset and observable branch-protection truth recorded;
10. canonical `main` still equals the PR base immediately before merge;
11. PR open, non-draft, and mergeable;
12. guarded normal merge using exact expected head SHA;
13. post-merge canonical main, ordered parents, tree/path delta, signature, and PR-state verification;
14. durable R007-10 closeout.

Any head mutation invalidates stale exact-head CI/review evidence.

## R007-10 closeout

Allowed implementation dispositions are only:

`R007-10 = CLOSED_CANONICAL / QUALIFIED`

or

`R007-10 = NO_GO / RETURN_TO_PLANNING`

A qualified R007-10 closeout means only that the missing canonical lifecycle test requirement has been restored prospectively. It does not reclassify the historical R007-09 closeout, does not prove the T113 production root cause, and grants no successor execution authority.

## Dependency order after R007-10

Even if R007-10 later qualifies:

- `ROOT_CAUSE = UNPROVEN` remains true;
- `T113 = NO_GO / RETURN_TO_PLANNING` remains true;
- no successor execution authorization follows;
- T114 remains blocked.

Any further T113 recovery would require a new separately reviewed planning unit grounded in new deterministic evidence or a truthful terminal decision under the current specification.

## Planning qualification

Before this planning artifact becomes canonical require:

1. exact one-path additive planning-artifact purity;
2. exact branch ancestry from planning base `5d6b0733e197f3bcd5b40ef3a1e3089e455fb014` unless live main changes, in which case reconcile forward-only before merge;
3. exact final planning head/tree verification;
4. exact-head Self Verification SUCCESS;
5. original-attempt exact-head Project CI SUCCESS across all six required OS/Node lanes;
6. fresh independent substantive exact-head planning/correctness/security/governance review;
7. reconciliation of every material finding;
8. zero unresolved material review threads;
9. current ruleset/observable protection verification;
10. canonical `main` equals the planning PR base immediately before guarded merge;
11. planning PR open, non-draft, and mergeable;
12. guarded normal merge using exact expected head SHA;
13. post-merge canonical main, ordered parents, tree/path delta, signature, and PR-state verification;
14. durable Issue #238 closeout as:

`R007-10_PLANNING = CLOSED_CANONICAL / IMPLEMENTATION_AUTHORIZATION_REQUIRED`

No implementation authority is granted by the planning merge itself.
