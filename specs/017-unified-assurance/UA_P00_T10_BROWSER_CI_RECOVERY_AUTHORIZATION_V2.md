# UA-P00-T10 Browser CI Stability Recovery Authorization V2

**Status:** PROPOSED / NOT EFFECTIVE  
**Ledger:** Issue #366  
**Canonical base:** `cb33f4ecbed02c514d574baeaab6dc57322c4997`  
**Canonical base tree:** `20665c78b9ec49e7bf8d2a7c5eb8bf9facdff213`  
**Date:** 2026-09-19

## 1. Authority state

```text
UA_P00_T10_BROWSER_CI_RECOVERY_AUTHORIZATION_V2 = PROPOSED / NOT_EFFECTIVE
BROWSER_CI_RECOVERY_IMPLEMENTATION_AUTHORIZED = NO
UA_P01_IMPLEMENTATION_AUTHORIZED = NO
```

This artifact grants no implementation authority merely by existing, being
reviewed, or receiving PR-head CI success.

Implementation authority becomes effective only after this exact artifact is
qualified, guarded-merged, post-merge verified, push-triggered Project CI
succeeds on attempt 1, and Issue #366 closes
`CLOSED_CANONICAL / EFFECTIVE`.

## 2. Predecessor authority truth

The v1 authorization artifact from PR #363 merged canonically as:

```text
MERGE = d179f7998c824c8dc18a6686a2e01e2d5ef413af
TREE = 6ab9eb5d4104673e2ae224239ce9182ecf2b2c64
```

Its mandatory post-merge Project CI run failed:

```text
RUN = 35436345191
RUN_NUMBER = 675
RUN_ATTEMPT = 1
CONCLUSION = FAILURE
FAILED_LANE = windows-2025 / node-22
FAILED_TEST = tests/run.test.ts :: T024 retention bound
FAILURE = Test timed out in 15000ms
```

Therefore v1 remains canonical history but is permanently NOT_EFFECTIVE.

```text
UA_P00_T10_BROWSER_CI_RECOVERY_AUTHORIZATION_V1 = CANONICAL_BUT_NOT_EFFECTIVE
V1_ACTIVATION = FAILED
RETROACTIVE_ACTIVATION = FORBIDDEN
RERUN_TO_GREEN = FORBIDDEN
```

Issue #362 is closed as superseded / not planned.

## 3. Canonical stability repair predecessor

The unrelated T024 Windows deadline failure exposed by the v1 activation gate
was repaired prospectively under Issue #364 / PR #365.

```text
REPAIR_HEAD = 0e6578aa529df8515e58ed6d58b16d52613bfdfa
REPAIR_MERGE = cb33f4ecbed02c514d574baeaab6dc57322c4997
REPAIR_TREE = 20665c78b9ec49e7bf8d2a7c5eb8bf9facdff213
PR_HEAD_SELF_VERIFICATION = 35437238761 / SUCCESS
PR_HEAD_PROJECT_CI = 35437238762 / attempt 1 / SUCCESS / 6 of 6 lanes
POST_MERGE_PROJECT_CI = 35437862314 / attempt 1 / SUCCESS / 6 of 6 lanes
```

Issue #364 is closed `CLOSED_CANONICAL`.

No v1 authorization evidence is upgraded by this repair.

## 4. Original browser-CI trigger

UA-P01 authorization candidate PR #361 was closed unmerged after original-
attempt exact-head Project CI failure:

```text
PR = 361
HEAD = 6ae6331563093f25a7842c461f125d8e638d21ea
BASE = 741b2f761e27de929789d88c1287f2c01b8bb9c0
PROJECT_CI_RUN = 35434630121
RUN_ATTEMPT = 1
CONCLUSION = FAILURE
FAILED_LANE = macos-14 / node-22
FAILED_SUITE = tests/browser-benchmark.integration.test.ts
FAILURE = beforeAll hook timed out in 600000ms
```

Five other lanes succeeded. The failed candidate was documentation-only and
did not mutate the browser code, tests, workflow, dependencies, or lockfile.

No benchmark assertion failed before the hook deadline.

## 5. Canonical characterization

Canonical browser integration still has two suites that can encounter a
missing Chromium installation concurrently:

- `tests/browser-playwright.integration.test.ts` calls the canonical
  `ensureChromiumInstalled()` path immediately;
- `tests/browser-benchmark.integration.test.ts` polls for a launchable
  Chromium for up to 300000 ms and may then provision itself;
- each suite has a 600000 ms `beforeAll` ceiling.

Merged PR #353 already records prior cross-suite Chromium-provisioning races.

The smallest prospective recovery remains deterministic CI serialization of
the already-required pinned Chromium acquisition before Vitest workers start.

## 6. Recovery decision

After this v2 authorization becomes effective, exactly one implementation PR
may add one Chromium provisioning step to Project CI before project typecheck
and test execution.

This is CI orchestration only.

It does not change:

- browser product semantics;
- browser adapter semantics;
- benchmark oracles;
- test assertions;
- test timeouts;
- recovery semantics;
- evidence semantics;
- runtime authority;
- dependency versions.

## 7. Exact implementation mutation surface

The future recovery implementation may mutate exactly:

```text
.github/workflows/ci.yml
```

No other tracked path is authorized.

If a defensible repair requires any additional tracked path, stop and return
to a new planning/authorization decision.

## 8. Required implementation behavior

The implementation MUST add one explicit Chromium provisioning step after:

```text
npm ci --ignore-scripts --no-audit --no-fund
```

and before project typecheck/test execution.

The step MUST:

1. load the already-installed `playwright/package.json`;
2. require exact `version === "1.63.0"`;
3. resolve the already-installed `playwright/cli.js`;
4. invoke that CLI via `process.execPath`;
5. use only these fixed argv tuples:
   - Linux: `["install", "--with-deps", "chromium"]`;
   - macOS/Windows: `["install", "chromium"]`;
6. inherit child process output;
7. fail the matrix job when version validation or provisioning fails;
8. run exactly once per matrix job before Vitest can start.

The implementation MUST NOT use:

- `npx`;
- implicit package installation;
- alternate package managers;
- shell-generated arbitrary arguments;
- workflow user input;
- hidden fallback installers.

## 9. Preserved Project CI contract

The implementation MUST preserve:

```text
JOB_TIMEOUT_MINUTES = 30
MATRIX_OS = ubuntu-24.04, macos-14, windows-2025
MATRIX_NODE = 22, 24
FAIL_FAST = false
EXACT_SOURCE_GUARD = REQUIRED
NPM_CI_IGNORE_SCRIPTS = REQUIRED
TYPECHECK = REQUIRED
FULL_TEST_SUITE = REQUIRED
BUILD = REQUIRED
WINDOWS_BOUNDED_WORKERS = REQUIRED
```

No required lane may be removed, skipped, converted to advisory, or replaced.

## 10. Explicit exclusions

This authorization does not authorize mutation of:

```text
src/**
tests/**
benchmarks/**
package.json
package-lock.json
.specify/memory/constitution.md
specs/001-016/**
docs/brand/**
```

It does not authorize:

- browser semantic changes;
- browser adapter changes;
- benchmark fixture/oracle/expectation changes;
- test disabling or selective omission;
- any timeout increase;
- retry loops;
- GitHub rerun qualification;
- dependency upgrades;
- Playwright version changes;
- lockfile mutation;
- workflow matrix reduction;
- donor code import;
- provider/model execution;
- UA-P01 implementation.

## 11. Failure discipline

```text
RERUN_TO_GREEN = FORBIDDEN
FAILED_ORIGINAL_ATTEMPT = DURABLE_EVIDENCE
TIMEOUT_WIDENING_AFTER_FAILURE = FORBIDDEN
TEST_EXPECTATION_WEAKENING = FORBIDDEN
MATRIX_REDUCTION = FORBIDDEN
```

If the future workflow repair exact-head original attempt fails a required
lane, preserve the failure and return to planning.

A genuinely justified new forward commit creates a new exact candidate only
when the repair remains within this authorization.

## 12. Authorization PR purity

This v2 authorization PR itself may change exactly:

```text
specs/017-unified-assurance/UA_P00_T10_BROWSER_CI_RECOVERY_AUTHORIZATION_V2.md
```

It MUST NOT mutate the workflow it proposes to authorize.

## 13. Authorization candidate qualification

Before this artifact may merge, its exact final head MUST prove:

1. base remains canonical
   `cb33f4ecbed02c514d574baeaab6dc57322c4997`;
2. changed tracked path count is exactly one;
3. the changed path is exactly this v2 artifact;
4. PR #361 remains closed/unmerged failure evidence;
5. v1 Issue #362 remains closed superseded and NOT_EFFECTIVE;
6. T024 repair Issue #364 remains CLOSED_CANONICAL;
7. Issue #360 remains open and UA-P01 remains NOT_EFFECTIVE;
8. Self Verification succeeds;
9. original-attempt Project CI succeeds across all six required lanes;
10. exact-head review finds zero unresolved material findings;
11. unresolved review thread count is zero;
12. canonical main and exact head remain unchanged before merge;
13. guarded normal merge uses the expected exact head;
14. post-merge parent/tree/signature/path identity is verified;
15. push-triggered post-merge Project CI succeeds on attempt 1;
16. only then Issue #366 closes
    `CLOSED_CANONICAL / EFFECTIVE`.

## 14. Recovery implementation qualification

After Issue #366 becomes effective, the one workflow repair PR MUST prove on
its original exact-head attempt:

- changed path is exactly `.github/workflows/ci.yml`;
- no product/test/dependency/lockfile mutation;
- exact Playwright `1.63.0` version guard remains visible;
- fixed argv are platform-bounded exactly as authorized;
- no timeout widening;
- no retries/reruns;
- Self Verification succeeds where applicable;
- Project CI succeeds on all six required lanes;
- browser benchmark executes rather than being skipped;
- exact-head review has zero unresolved material findings;
- unresolved review threads equal zero;
- guarded expected-head normal merge;
- canonical post-merge identity proof;
- push-triggered post-merge Project CI succeeds.

## 15. Downstream authority boundary

Successful browser-CI recovery completion does not itself authorize UA-P01.

After the workflow repair is canonical and post-merge verified:

```text
BROWSER_CI_RECOVERY = CLOSED_CANONICAL / COMPLETE
UA_P01_IMPLEMENTATION_AUTHORIZED = NO
```

Issue #360 then requires a fresh UA-P01 authorization artifact from the new
canonical main and a full new original-attempt qualification sequence.

## 16. Canonical decision

```text
RECOVERY_SCOPE = WORKFLOW_ONLY
PRODUCT_SEMANTICS_CHANGE = NO
TEST_SEMANTICS_CHANGE = NO
TIMEOUT_INCREASE = NO
DEPENDENCY_CHANGE = NO
PLAYWRIGHT_VERSION_CHANGE = NO
RERUN_QUALIFICATION = NO
UA_P01_AUTHORITY_GRANTED = NO
```
