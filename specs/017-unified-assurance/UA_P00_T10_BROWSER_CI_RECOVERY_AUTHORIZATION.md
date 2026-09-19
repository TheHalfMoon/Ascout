# UA-P00-T10 Browser CI Stability Recovery Authorization

**Status:** PROPOSED / NOT EFFECTIVE  
**Ledger:** Issue #362  
**Canonical base:** `741b2f761e27de929789d88c1287f2c01b8bb9c0`  
**Canonical base tree:** `0a2d2b2261b93d0d23860327e048ae8ddb25b537`  
**Date:** 2026-09-19

## 1. Authority state

```text
UA_P00_T10_BROWSER_CI_RECOVERY_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
BROWSER_CI_RECOVERY_IMPLEMENTATION_AUTHORIZED = NO
UA_P01_IMPLEMENTATION_AUTHORIZED = NO
```

This artifact grants no implementation authority by its presence, review, or
PR-head CI success.

Implementation authority becomes effective only after this exact artifact is
qualified, guarded-merged, post-merge verified, post-merge Project CI
succeeds, and Issue #362 closes `CLOSED_CANONICAL / EFFECTIVE`.

## 2. Triggering immutable failure evidence

UA-P01 authorization candidate PR #361 is closed unmerged and remains
immutable unqualified evidence.

```text
PR = 361
HEAD = 6ae6331563093f25a7842c461f125d8e638d21ea
BASE = 741b2f761e27de929789d88c1287f2c01b8bb9c0
PROJECT_CI_RUN = 35434630121
PROJECT_CI_RUN_NUMBER = 673
RUN_ATTEMPT = 1
CONCLUSION = FAILURE

ubuntu-24.04 / node-22 = SUCCESS
ubuntu-24.04 / node-24 = SUCCESS
macos-14 / node-24 = SUCCESS
macos-14 / node-22 = FAILURE
windows-2025 / node-22 = SUCCESS
windows-2025 / node-24 = SUCCESS
```

Failed lane:

```text
JOB = 105875104644
STEP = Test
FAILED_SUITE = tests/browser-benchmark.integration.test.ts
FAILURE = beforeAll hook timed out in 600000ms
TEST_FILES = 130 passed / 1 failed / 1 skipped
TESTS = 1165 passed / 38 skipped
```

No benchmark assertion failed. The failed candidate changed only the UA-P01
authorization document and did not mutate the failing browser source, test,
workflow, dependency, or lockfile.

The failed run MUST NOT be replaced by rerun-to-green evidence.

## 3. Canonical characterization

Canonical browser integration currently allows two Vitest suites to encounter
a missing Chromium installation concurrently.

`tests/browser-playwright.integration.test.ts` calls
`ensureChromiumInstalled()` immediately in its `beforeAll`.

`tests/browser-benchmark.integration.test.ts` tries to avoid the competing
provisioner by polling for a launchable Chromium for up to 300000 ms, then
may fall back to provisioning. Its full `beforeAll` hook ceiling is
600000 ms.

The canonical Playwright adapter pins exactly `playwright@1.63.0` and its
existing provisioning contract already uses fixed argv:

```text
Linux:   node <playwright-cli> install --with-deps chromium
others:  node <playwright-cli> install chromium
```

Merged PR #353 already records prior cross-suite provisioning races and the
wait/probe mitigation. The new failure proves the remaining coordination
strategy is not sufficiently stable for an original-attempt six-lane gate.

## 4. Recovery decision

The recovery SHALL move the already-required Chromium acquisition out of
parallel test-suite setup and into one deterministic CI step before Vitest
starts.

This is CI orchestration only. It does not change browser product semantics,
test assertions, benchmark oracles, recovery semantics, evidence semantics,
or runtime authority.

## 5. Exact implementation mutation surface

After Issue #362 becomes effective, one recovery implementation PR may mutate
exactly:

```text
.github/workflows/ci.yml
```

No other tracked path is authorized.

If a correct repair requires any other tracked path, stop and return to a new
planning/authorization decision.

## 6. Required implementation behavior

The implementation MUST add one explicit Chromium provisioning step after
`npm ci --ignore-scripts --no-audit --no-fund` and before project
typecheck/test execution.

The step MUST:

1. load the already-installed `playwright/package.json`;
2. require `version === "1.63.0"`;
3. resolve the already-installed `playwright/cli.js`;
4. invoke that CLI with `process.execPath`;
5. use only these fixed argument tuples:
   - Linux: `["install", "--with-deps", "chromium"]`
   - macOS/Windows: `["install", "chromium"]`;
6. inherit process output so acquisition failures remain visible;
7. fail the job if version validation or provisioning fails;
8. run once per matrix job before Vitest workers can race.

The implementation MUST NOT use `npx`, implicit package installation,
alternate package managers, shell-generated dynamic arguments, or arbitrary
workflow inputs.

## 7. Preserved CI contract

The recovery MUST preserve:

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

## 8. Explicit exclusions

This recovery does not authorize mutation of:

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
- timeout increases;
- retry loops;
- GitHub rerun qualification;
- dependency or Playwright upgrades;
- lockfile mutation;
- workflow matrix reduction;
- hidden fallback installers;
- donor code import;
- provider/model execution;
- UA-P01 implementation.

## 9. Failure discipline

```text
RERUN_TO_GREEN = FORBIDDEN
FAILED_ORIGINAL_ATTEMPT = DURABLE_EVIDENCE
TIMEOUT_WIDENING_AFTER_FAILURE = FORBIDDEN
TEST_EXPECTATION_WEAKENING = FORBIDDEN
MATRIX_REDUCTION = FORBIDDEN
```

If the recovery implementation exact-head original attempt fails any required
lane, preserve the failure and return to planning. A later GitHub rerun of the
same exact head cannot qualify it.

A genuinely new forward commit creates a new exact candidate and requires a
fresh full qualification sequence, but only when the commit is a justified
repair within this authorization.

## 10. Authorization PR purity

This authorization PR itself may change exactly:

```text
specs/017-unified-assurance/UA_P00_T10_BROWSER_CI_RECOVERY_AUTHORIZATION.md
```

It MUST NOT change the workflow it proposes to authorize.

## 11. Authorization candidate qualification

Before this artifact may merge, its exact final head MUST prove:

1. base remains canonical `741b2f761e27de929789d88c1287f2c01b8bb9c0`
   or any advancement is reconciled explicitly;
2. changed tracked path count is exactly one;
3. changed path is exactly this authorization artifact;
4. PR #361 remains closed/unmerged immutable failure evidence;
5. Issue #360 remains open and UA-P01 authority remains NOT_EFFECTIVE;
6. Project CI succeeds on the exact authorization head;
7. Self Verification succeeds where applicable;
8. exact-head review finds zero unresolved material correctness/security/
   governance findings;
9. unresolved review threads equal zero;
10. maintainer exact-head verification is recorded;
11. guarded merge uses the unchanged expected head;
12. canonical main/ordered parents/tree/signature are verified after merge;
13. push-triggered post-merge Project CI succeeds;
14. only then Issue #362 closes
    `CLOSED_CANONICAL / EFFECTIVE`.

## 12. Recovery implementation qualification

After effectiveness, the one workflow repair PR MUST prove on its original
exact-head attempt:

- changed path is exactly `.github/workflows/ci.yml`;
- no dependency/lockfile/product/test mutation;
- exact Playwright `1.63.0` validation remains visible;
- fixed argv are platform-bounded exactly as authorized;
- no timeout widening;
- no retry/rerun logic;
- Self Verification SUCCESS where applicable;
- Project CI SUCCESS on all six lanes;
- browser benchmark executes normally rather than being skipped;
- exact-head review has zero unresolved material findings;
- guarded expected-head merge;
- canonical post-merge identity proof;
- push-triggered post-merge Project CI SUCCESS.

## 13. Downstream authority boundary

Successful recovery completion does not itself authorize UA-P01.

After the recovery is canonically complete:

```text
BROWSER_CI_RECOVERY = CLOSED_CANONICAL / COMPLETE
UA_P01_IMPLEMENTATION_AUTHORIZED = NO
```

A fresh UA-P01 authorization candidate must then be created from the new
canonical main and complete its own original-attempt exact-head qualification,
guarded merge, post-merge verification, and Issue #360 activation.

## 14. Canonical decision

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
