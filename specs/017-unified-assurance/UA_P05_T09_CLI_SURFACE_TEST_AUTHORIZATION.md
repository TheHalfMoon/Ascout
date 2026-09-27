# UA-P05-T09 CLI Surface Test Authorization — Frozen Sentinel Admission

**Status:** `PROPOSED / AWAITING_CANONICAL_ADMISSION`
**Ledger:** Issue #559
**Authorization base:** `9cfa3653bbb8e09d6506fe8aaada0e72a8d26b57`
**Scope:** four frozen sentinel test files only, to admit the already-authorized T09 additive command

## 1. Purpose

This artifact is the only authority that may mutate the four frozen
sentinel test files listed in section 4 so that the already-authorized
UA-P05-T09 additive `ascout test` command can land. It grants no product
source mutation authority and no other test mutation authority.

```text
RECOVERY_AUTHORITY = BOUNDED / SENTINEL_ADMISSION_ONLY
PRODUCT_SOURCE_MUTATION = NO
UA_P05_T09_IMPLEMENTATION_CHANGE = NO
```

## 2. Governance conflict record

The effective UA-P05 Implementation Authorization mandates in section 10:

```text
T09 adds exactly one additive `test` command.
```

The T09 positive mutation surface (section 7) is:

```text
src/assurance/test/**
tests/assurance-test-*.test.ts
src/cli.ts (UA-P05-T09 only, additive test command)
```

Four frozen sentinel tests outside that surface pin the pre-T09 boundary:

```text
tests/assurance-phase-qualification.test.ts =
  EXPECTED_USAGE exact four-command text;
  ["test", "security", "cyber", "assure"] all throw CliUsageError
tests/assurance-phase-recovery-qualification.test.ts =
  same four-command pin
tests/assurance-phase-p04-qualification.test.ts =
  parseCliArgs(["test"]) throws CliUsageError
tests/assurance-review-p03-t15.test.ts =
  exact four-command usage text;
  ["test", "security", "cyber", "assure"] all throw CliUsageError
```

Per section 7 ("If a task requires any tracked path outside this
positive surface, implementation stops and returns to authorization
amendment"), T09 implementation stopped before any source mutation and
returns here. No T09 implementation branch exists. No `ascout test`
capability exists.

## 3. Diagnosis

The conflict is mechanical, not semantic: the sentinels correctly froze
the pre-T09 surface, and the phase authorization correctly requires T09
to extend it by exactly one command. Neither artifact is wrong; a
bounded admission bridge is required. No check, review, receipt,
admission, or discovery semantic is implicated.

## 4. Bounded admission scope

Allowed mutation (exactly these four tracked paths, minimal diffs only):

```text
tests/assurance-phase-qualification.test.ts = ADMISSION_ALLOWED
tests/assurance-phase-recovery-qualification.test.ts = ADMISSION_ALLOWED
tests/assurance-phase-p04-qualification.test.ts = ADMISSION_ALLOWED
tests/assurance-review-p03-t15.test.ts = ADMISSION_ALLOWED
```

Permitted edits within those files:

```text
usage expectation gains exactly one line:
  "  ascout test [--profile quick|standard|deep|release] [--format json|terminal]"
"test" removed from the unknown-command loops;
  "security", "cyber", "assure" remain unknown and throwing
parseCliArgs(["test"]) expectation becomes the additive invocation shape;
  check/review invocation shapes unchanged
`ascout check` parse, render, exit, receipt, admission, terminal, JSON,
  and agent assertions unchanged
publish/workflow refusal assertions unchanged
```

Hard exclusions:

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

## 5. Admission acceptance

The later T09 admission PR must prove:

```text
sentinel_files_changed = exactly the four listed above
usage_text_lines_added = 1 (test only)
unknown_commands_remaining = security, cyber, assure (all throwing)
check_invocation_shape = unchanged
review_invocation_shape = unchanged
publish_workflow_refusals = unchanged
ascout_test_supported = true (parse only; plan output, no runner execution)
production_source_changed = false
```

The T09 implementation PR that follows keeps its own full qualification
discipline under the phase authorization (focused tests, exact-head Self
Verification attempt-1 success, exact-head Project CI attempt-1 6/6
success, maintainer review, Alibaba Open Code Review evidence, Jev
evidence, zero unresolved threads, guarded normal merge, post-merge
Project CI attempt-1 6/6 success).

## 6. Qualification discipline

This authorization artifact admits via its own PR with exact-head Self
Verification attempt-1 success, Project CI attempt-1 6/6 success,
Alibaba Open Code Review evidence (or honest NOT_RUN with provider
credential reason), Jev evidence bound to the exact head, zero material
findings, zero unresolved threads, guarded normal merge with the exact
expected head, verified merge tree, parents, and main, and post-merge
Project CI attempt-1 6/6 success. Only then is the sentinel admission
effective and the T09 implementation branch authorized to start.

Refs #559
