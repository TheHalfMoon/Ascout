# UA-P00-T11 T061 Windows CI Stability Recovery Authorization

**Status:** PROPOSED / NOT EFFECTIVE  
**Ledger:** Issue #382  
**Canonical base:** `f6a04ca06bfd9363cf4f84d0571c8df332dcb7a3`  
**Date:** 2026-09-20

## 1. Authority state

```text
UA_P00_T11_T061_WINDOWS_CI_STABILITY_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE
T061_WINDOWS_STABILITY_REPAIR_AUTHORIZED = NO
UA_P01_T06 = OPEN / NOT_CANONICAL
```

This artifact grants no implementation authority merely by existing, being
reviewed, or receiving PR-head CI success.

Implementation authority becomes effective only after this exact artifact is
qualified, guarded-merged, post-merge verified, push-triggered Project CI
succeeds on attempt 1, and Issue #382 closes
`CLOSED_CANONICAL / EFFECTIVE`.

## 2. Canonical base health

```text
MAIN = f6a04ca06bfd9363cf4f84d0571c8df332dcb7a3
MAIN_POST_MERGE_PROJECT_CI = 35486160021
RUN_NUMBER = 695
RUN_ATTEMPT = 1
CONCLUSION = SUCCESS
REQUIRED_LANES = 6/6 SUCCESS
```

## 3. Trigger evidence

UA-P01-T06 candidate PR #381 failed original-attempt exact-head qualification:

```text
PR = 381
HEAD = 1d2ee7a5df1508c7fc4ea79570d78f39e1d407ac
BASE = f6a04ca06bfd9363cf4f84d0571c8df332dcb7a3
SELF_VERIFICATION = 35486721022 / SUCCESS
PROJECT_CI = 35486721016
RUN_NUMBER = 696
RUN_ATTEMPT = 1
CONCLUSION = FAILURE
FAILED_LANE = windows-2025 / node-22
FAILED_TEST = tests/selection-account-run-check.integration.test.ts
FAILED_CASE = T061 runCheck SelectionAccount finalization
TEST_LOCAL_TIMEOUT = 60000ms
MEASURED_CASE_DURATION = 70924ms
OTHER_REQUIRED_LANES = 5/5 SUCCESS
T06_FOCUSED_TESTS = 115/115 PASS
```

PR #381 is closed unmerged. The failure is durable evidence and MUST NOT be
rerun, relabeled, or reused as a passing T06 qualification.

## 4. Control evidence

The same T061 case passed on immediately preceding canonical Windows/Node22
runs:

```text
RUN_694_PR_HEAD = 21815ms / PASS
RUN_695_POST_MERGE_MAIN = 28011ms / PASS
RUN_696_T06_CANDIDATE = 70924ms / TIMEOUT
```

The run-696 failure exceeded only the test-local wall-clock deadline. No T061
assertion reported a semantic mismatch before timeout.

## 5. T061 characterization

Canonical `tests/selection-account-run-check.integration.test.ts`:

- creates a temporary repository;
- recursively copies installed `node_modules`;
- constructs the existing native Vitest command shim;
- runs the existing `runCheck` flow;
- validates the resulting receipt semantics;
- proves one bounded full pass closes SelectionAccount counts without guessing;
- removes the temporary fixture in `finally`;
- currently uses an explicit test-local `60000ms` deadline.

Filesystem-heavy recursive materialization makes the exact wall-clock duration
sensitive to Windows runner I/O contention while preserving the same bounded
test semantics.

## 6. Prospective repair decision

After this authorization becomes effective, exactly one implementation PR may
mutate:

```text
tests/selection-account-run-check.integration.test.ts
```

The only authorized delta is the final test-local timeout expression:

```ts
process.platform === "win32" ? 120_000 : 60_000
```

Resulting deadlines:

```text
WINDOWS_TEST_LOCAL_TIMEOUT_MS = 120000
NON_WINDOWS_TEST_LOCAL_TIMEOUT_MS = 60000
```

This is a platform-bounded test-harness stability repair. It does not modify
the T061 fixture, assertions, product source, SelectionAccount semantics,
`runCheck` behavior, task semantics, or receipt semantics.

## 7. Explicit exclusions

This authorization does NOT permit:

- product source mutation;
- T061 fixture setup/cleanup changes;
- T061 expected-value or semantic assertion changes;
- test skipping;
- retry loops;
- GitHub rerun-to-green qualification;
- global Vitest timeout changes;
- workflow `--testTimeout` changes;
- Windows worker-count changes;
- workflow job-timeout changes;
- matrix reduction;
- dependency or lockfile changes;
- UA-P01-T06 merge or reuse of PR #381;
- T07 or later implementation.

## 8. Failure discipline

```text
RERUN_TO_GREEN = FORBIDDEN
RUN_696_FAILURE = DURABLE_EVIDENCE
EMPTY_COMMIT_REQUALIFICATION = FORBIDDEN
UNRELATED_FORWARD_COMMIT_REQUALIFICATION = FORBIDDEN
ASSERTION_WEAKENING = FORBIDDEN
TEST_SKIPPING = FORBIDDEN
```

A later candidate exists only when a materially justified prospective change
has been made under valid authority.

## 9. Authorization PR purity

This authorization PR itself may change exactly:

```text
specs/017-unified-assurance/UA_P00_T11_T061_WINDOWS_CI_STABILITY_AUTHORIZATION.md
```

It MUST NOT modify T061 or any workflow.

## 10. Authorization activation gate

Before this artifact may become effective, its exact final head MUST prove:

1. canonical base remains
   `f6a04ca06bfd9363cf4f84d0571c8df332dcb7a3`;
2. changed tracked path count is exactly one;
3. changed path is exactly this artifact;
4. PR #381 remains closed/unmerged failure evidence;
5. Issue #380 remains OPEN / NOT_CANONICAL;
6. Self Verification succeeds;
7. original-attempt Project CI succeeds across all six required lanes;
8. exact-head review has zero unresolved material findings;
9. unresolved review-thread count is zero;
10. canonical main and exact head remain unchanged before merge;
11. guarded normal merge uses the expected exact head;
12. ordered parent/tree/signature/path identity is verified;
13. push-triggered post-merge Project CI succeeds on attempt 1;
14. only then Issue #382 closes
    `CLOSED_CANONICAL / EFFECTIVE`.

## 11. Recovery implementation qualification

After Issue #382 becomes effective, the one-file repair PR MUST prove:

- changed path exactly
  `tests/selection-account-run-check.integration.test.ts`;
- the only semantic diff is the platform-bounded test-local timeout;
- Windows timeout is exactly `120000ms`;
- non-Windows timeout remains exactly `60000ms`;
- fixture logic is unchanged;
- assertions are unchanged;
- no retries or reruns are used;
- focused T061 execution passes where locally runnable;
- typecheck and build pass;
- Self Verification succeeds where applicable;
- original-attempt six-lane Project CI succeeds;
- exact-head review has zero unresolved material findings;
- guarded expected-head normal merge;
- post-merge push Project CI succeeds.

## 12. Downstream boundary

Successful repair does not itself complete UA-P01-T06.

After the repair closes canonically:

```text
T061_WINDOWS_STABILITY_REPAIR = CLOSED_CANONICAL / COMPLETE
UA_P01_T06 = OPEN / NOT_CANONICAL
```

A fresh T06 candidate must be created from then-current canonical main and
qualified from scratch. PR #381 remains permanently closed/unmerged evidence.
