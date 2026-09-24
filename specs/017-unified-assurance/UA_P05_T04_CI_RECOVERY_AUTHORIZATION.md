# UA-P05-T04 CI Recovery Authorization — T064 Fixture I/O

**Status:** `PROPOSED / FOUNDER_AUTHORIZED / AWAITING_CANONICAL_ADMISSION`
**Ledger:** Issue #549
**Authorization base:** `d4f3bf8f5e173dbc36e77bddd511df3d025dda79`
**Scope:** single prospective test-fixture repair only

## 1. Purpose

This artifact is the only authority that may mutate
`tests/flake-run-check.integration.test.ts` (plus already-existing
`tests/helpers/**` reuse where strictly necessary) to repair the preserved
UA-P05-T04 qualification failure. It grants no other mutation authority.

```text
RECOVERY_AUTHORITY = BOUNDED / FIXTURE_ONLY
PRODUCT_SOURCE_MUTATION = NO
UA_P05_T04_IMPLEMENTATION_CHANGE = NO
```

## 2. Preserved failure record

```text
CANONICAL_MAIN = d4f3bf8f5e173dbc36e77bddd511df3d025dda79
T04_PR = 548 OPEN / UNMERGED
T04_EXACT_HEAD = 6cfe7179c3b38ed67e64af9ae698e52213d787e6
SELF_VERIFICATION_RUN = 36023823493 / SUCCESS (attempt 1, exact T04 head)
PROJECT_CI_RUN = 36023823518 / FAILURE (attempt 1, exact T04 head)
FAILED_JOB = 107715125861
FAILED_LANE = windows-2025 / node-24
FAILED_TEST = tests/flake-run-check.integration.test.ts
FAILED_CASE = T064 runCheck reproduction and flake normalization /
  jest: converts contradictory exact observations into FLAKY
FAILURE_MODE = Test timed out in 60000ms (original 60-second timeout)
SUITE_OUTCOME = 205 files passed / 1 failed;
  1864 tests passed / 1 failed / 34 skipped
T04_FOCUSED_ON_FAILED_LANE = tests/assurance-test-browser-evidence.test.ts
  10 tests passed in 9ms
ORIGINAL_FAILURE = PRESERVED PERMANENTLY as run 36023823518
RERUN_TO_GREEN = NO
```

## 3. Diagnosis

The T064 `initializeFixture` performs a recursive full copy of
`node_modules` (measured 6267 files / 93.5 MB) per fixture, 8 fixtures per
file run, inside per-test budgets of 60 s (flaky cases) and 120 s (others).
`tests/post-run-widening-jest-run-check.integration.test.ts` (T054 recovery)
already replaced the identical pattern with bounded discovery contracts,
citing the same Windows I/O cost.

Source-traced discovery/planner reads (no guessing):

```text
jest planning reads:
  node_modules/.bin/jest(.cmd) executable probe
  node_modules/jest/package.json name + version
vitest planning reads:
  node_modules/.bin/vitest(.cmd) executable probe
  node_modules/vitest/package.json name + version
  node_modules/@vitest/coverage-v8/package.json OR
  node_modules/@vitest/coverage-istanbul/package.json
```

All three package contracts exist in the canonical tree. Nothing else in
the copied tree is read by discovery or planning.

## 4. Bounded repair scope

Allowed mutation:

```text
tests/flake-run-check.integration.test.ts = REPAIR_ALLOWED
tests/helpers/** = REUSE_ONLY (already-existing helpers, no new helpers
  unless strictly necessary)
```

Hard exclusions:

```text
PRODUCT_SOURCE = NO (no src/** changes of any kind)
RECEIPT_SEMANTICS = NO
CHECK_SEMANTICS = NO
WORKFLOW = NO
PACKAGE_AND_LOCKFILE = NO
GLOBAL_TIMEOUT_WIDENING = NO
LANE_REMOVAL = NO
TEST_SKIP = NO
WEAKER_ASSERTION = NO
T064_EXPECTED_SEMANTICS = UNCHANGED
T04_IMPLEMENTATION_CHANGE = NO
```

Preferred repair: replace the recursive whole-tree fixture copy with the
minimum bounded local runner contracts above, reusing the existing
`writeNodeCommandShim` helper. Keep the 60-second flaky-case timeout
unchanged. A timeout increase is not the preferred repair.

## 5. Repair acceptance

The repair PR must prove:

```text
no_recursive_full_node_modules_copy = true
jest_flaky = FLAKY with 3 runs / 2 failures
stable_repeat = FAIL with 3 runs / 3 failures and reproduced = true
rerun_error_behavior = unchanged
malformed_rerun_behavior = unchanged
vitest_behavior = unchanged
jest_behavior = unchanged
receipt_semantic_validation = passes
production_source_changed = false
flaky_60s_budget = unchanged
```

## 6. Qualification discipline

This authorization artifact admits via its own PR with exact-head
Self Verification attempt-1 success, Project CI attempt-1 6/6 success,
Alibaba Open Code Review evidence (or honest NOT_RUN), Jev evidence, zero
material findings, zero unresolved threads, guarded normal merge, and
post-merge Project CI attempt-1 6/6 success. The later repair PR follows
the same discipline. Run 36023823518 stays preserved forever as negative
evidence.
