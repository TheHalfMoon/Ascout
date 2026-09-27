# UA-P05-T09 CLI Surface Test Authorization R2 — One Missed Usage-Text Pin

**Status:** `PROPOSED / AWAITING_CANONICAL_ADMISSION`
**Ledger:** Issue #559 (same conflict; extended inventory)
**Authorization base:** `d5083d56e2cf5430d9a2f7eef0cdc494bde1aa53`
**Scope:** one additional frozen sentinel test file only

## 1. Purpose

This artifact extends the effective UA-P05-T09 sentinel admission (PR
#560, merge `d5083d56e2cf5430d9a2f7eef0cdc494bde1aa53`) by exactly one
further frozen sentinel test file. It grants no product source mutation
authority and no other test mutation authority.

```text
RECOVERY_AUTHORITY = BOUNDED / SENTINEL_ADMISSION_ONLY
PRODUCT_SOURCE_MUTATION = NO
UA_P05_T09_IMPLEMENTATION_CHANGE = NO
```

## 2. Preserved evidence and diagnosis

During T09 implementation, the full local suite (`npm test`,
211 files) produced exactly one failure outside the four admitted files:

```text
FAILED_FILE = tests/assurance-check-compatibility.test.ts
FAILED_CASE = UA-P01-T17 existing ascout check compatibility /
  freezes the existing check CLI surface without adding an assurance verb
FAILURE_MODE = EXPECTED_USAGE exact four-command text mismatch:
  received usage gains exactly the authorized test line
SUITE_OUTCOME = 210 files passed / 1 failed;
  1898 tests passed / 1 failed / 34 skipped
```

Cause: the R1 inventory searched for the `test` command token in
sentinel assertions and missed this usage-text-only pin, which names no
`test` token yet asserts the exact four-command usage string. The
failure is the same mechanical class as R1 (pre-T09 surface freeze vs
the mandated additive command), not a semantic regression: every
check-rendering, exit-code, receipt, and admission assertion in the file
passes unchanged.

No rerun-to-green was performed. The T09 implementation branch holds no
commits; its worktree changes were parked in a local-only stash pending
this amendment. No history was rewritten.

## 3. Bounded admission scope

Allowed mutation (exactly this one tracked path, minimal diff only):

```text
tests/assurance-check-compatibility.test.ts = ADMISSION_ALLOWED
```

Permitted edit within that file:

```text
EXPECTED_USAGE gains exactly the same one line admitted under R1:
  "  ascout test [--profile quick|standard|deep|release] [--format json|terminal]"
check invocation shapes unchanged
assure refusal unchanged
receipt, exit-code, rendering, and admission assertions unchanged
```

Hard exclusions (inherited from R1, restated):

```text
PRODUCT_SOURCE = NO (no src/** changes of any kind)
CHECK_SEMANTIC_CHANGE = NO
REVIEW_SEMANTIC_CHANGE = NO
RECEIPT_SEMANTIC_CHANGE = NO
NEW_COMMAND_BEYOND_TEST = NO
WEAKER_ASSERTION = NO (remaining pins stay exact)
TEST_SKIP = NO
LANE_REMOVAL = NO
TIMEOUT_WIDENING = NO
PACKAGE_AND_LOCKFILE = NO
WORKFLOW = NO
ANY_OTHER_TEST_FILE = NO
```

## 4. Admission acceptance

The later T09 admission PR must prove, in addition to the R1
acceptance list:

```text
sentinel_files_changed = the four R1 files plus this one file only
compatibility_pins_intact = task-status vocabulary, receipt-exit
  vocabulary, exit-code propagation, JSON rendering, agent rendering,
  explicit admission (all unchanged)
```

The T09 implementation PR keeps its full qualification discipline under
the phase authorization.

## 5. Qualification discipline

This authorization artifact admits via its own PR with exact-head Self
Verification attempt-1 success, Project CI attempt-1 6/6 success,
Alibaba Open Code Review evidence (or honest NOT_RUN with provider
credential reason), Jev evidence bound to the exact head, zero material
findings, zero unresolved threads, guarded normal merge with the exact
expected head, verified merge tree, parents, and main, and post-merge
Project CI attempt-1 6/6 success. Only then is the extended admission
effective and the parked T09 work authorized to resume.

Refs #559
