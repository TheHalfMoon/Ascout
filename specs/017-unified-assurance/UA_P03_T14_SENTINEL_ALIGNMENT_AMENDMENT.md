# UA-P03-T14 Sentinel Alignment Amendment

**Status:** `PROPOSED / NOT_EFFECTIVE / FOUNDER_APPROVAL_REQUIRED`
**Ledger:** Issue #520
**Trigger:** UA-P03-T14 PR #519 exact head `adc678828a066fe418134367c005f9b16c204467`
**Canonical base at proposal creation:** `f54ee3a110406fcd3543a9e5a5ce2e01faac2ad1`

## 1. Purpose

This document proposes the narrowest authorization amendment needed to let the
already-mandated UA-P03-T14 read-only review command coexist with the frozen
UA-P01-T17/T18 CLI surface sentinels without weakening check compatibility.

This document is proposal-only.

```text
AMENDMENT_APPROVED = NO
AMENDMENT_EFFECTIVE = NO
T14_SUCCESSOR_IMPLEMENTATION_AUTHORIZED = NO
```

Founder/maintainer approval and canonical admission are required before any
source/test mutation described here becomes lawful.

## 2. Preserved failure evidence

PR #519 at exact head:

```text
adc678828a066fe418134367c005f9b16c204467
```

produced:

```text
Self Verification = SUCCESS (attempt 1)
Project CI = FAILURE (attempt 1, 3 of 6 lanes: ubuntu-24.04/node-22,
  ubuntu-24.04/node-24, macos-14/node-24)
```

The failure occurred in the Ascout root Vitest test step, in exactly three
frozen pre-T14 sentinel pins:

```text
tests/assurance-check-compatibility.test.ts
  -> UA-P01-T17 EXPECTED_USAGE equality (pre-T14 3-command text)
tests/assurance-phase-qualification.test.ts
  -> UA-P01-T18 EXPECTED_USAGE equality + review-rejection list
tests/assurance-phase-recovery-qualification.test.ts
  -> UA-P01-T18-R2 EXPECTED_USAGE equality + review-rejection list
```

All other assertions in those files passed on the failed head: check parse
outputs, receipt exit codes, task vocabularies, and contract registries are
preserved by the T14 content. Typecheck passed. The six T14 focused tests
passed. Existing CLI suites (30/30 locally) passed.

The failure is preserved as negative evidence (Issue #518).

PR #519 MUST NOT be merged, rewritten, rebased, force-pushed, or converted
into a qualified success by rerunning the same unmodified head.

## 3. Root cause

Authorization `UA_P03_IMPLEMENTATION_AUTHORIZATION` section 10 mandates:

```text
T14 adds exactly one read-only `review` command with terminal and JSON output.
```

A parseable review command necessarily changes `usageText()` and makes
`parseCliArgs(["review"])` succeed.

The UA-P01-T17/T18 sentinels pin the pre-T14 surface verbatim: `usageText()`
equality against the 3-command text, and `review` inside the must-throw
command lists. That pinning encodes the "until UA-P03-T14" surface of section
10, not a permanent ban on the mandated command.

The problem is stale test pins versus a mandated product delta.

It is not evidence that:

- the T14 review command is wrong;
- `ascout check` semantics regressed;
- frozen UA-P01 contracts changed;
- Project CI should be weakened;
- failing lanes should be skipped;
- sentinel tests should be deleted.

## 4. Existing authorization boundary

The effective UA-P03 authorization permits T14 exactly:

```text
src/assurance/review/**
src/assurance/engines/review/**
tests/assurance-review-*.test.ts
src/cli.ts (UA-P03-T14 only, single read-only review command)
```

The three sentinel test files are outside that surface:

```text
tests/assurance-check-compatibility.test.ts
tests/assurance-phase-qualification.test.ts
tests/assurance-phase-recovery-qualification.test.ts
```

Therefore no sentinel alignment is currently authorized.

## 5. Proposed additional mutation surface

If and only if this amendment becomes canonically effective, add exactly:

```text
tests/assurance-check-compatibility.test.ts
tests/assurance-phase-qualification.test.ts
tests/assurance-phase-recovery-qualification.test.ts
```

to the allowed UA-P03-T14 successor mutation surface, restricted to section 6.

No other test, source, workflow, config, or dependency path is added by this
amendment.

In particular, this amendment does NOT authorize:

```text
check parse-output changes
receipt exit-code changes
task vocabulary changes
contract registry changes
assure-command admission
any new CLI command beyond the single T14 review command
any write or publication authority
test skipping
assertion weakening beyond the section-6 pins
global timeout changes
workflow changes
dependency or lockfile changes
UA-P04 or later implementation
```

## 6. Required alignment semantics

The permitted sentinel diff is exactly:

1. In each of the three files, `EXPECTED_USAGE` gains exactly one line:

```text
  ascout review [--format json|terminal]
```

matching `usageText()` produced by the T14 `src/cli.ts` change byte for byte.

2. In `tests/assurance-phase-qualification.test.ts` and
   `tests/assurance-phase-recovery-qualification.test.ts`, the must-throw
   command list loses `"review"` only, becoming:

```text
["test", "security", "cyber", "assure"]
```

3. Everything else in the three files stays byte-identical in meaning:
   check parse expectations, receipt exit codes, task vocabularies, contract
   registries, the `assure` rejection, and the `not.toContain("ascout assure")`
   guard.

An implementation is permitted only if it proves all of the following:

1. The only test diffs are the section-6 pins.
2. `ascout check` parse/render/exit behavior is unchanged.
3. No previously passing assertion is deleted or weakened.
4. The T14 review command remains read-only with no write/publication path.
5. The fresh T14 successor qualifies from scratch under section 16 of the
   UA-P03 authorization.

## 7. Why alignment is correct

The sentinels exist to freeze `ascout check` compatibility, not to ban the
review command the authorization mandates in section 10. Aligning the stale
pins preserves every check-compatibility assertion while recording the
authorized surface change explicitly, in the open, with exact-head proof.

Deleting the sentinels, weakening their check assertions, or skipping their
lanes would destroy the compatibility evidence. This amendment does none of
that.

## 8. Required successor test evidence

A fresh UA-P03-T14 successor may be created only after this amendment is
effective.

The successor must prove (authorization section 16):

```text
exact canonical base and predecessor
one-task scope and authorized-path purity (now including the section-6 pins)
focused tests for the task acceptance contract
exact-head Self Verification attempt 1 success
exact-head Project CI attempt 1 success across all six required lanes
fresh maintainer exact-head review with zero material findings
unresolved material review threads = 0
main/base/head/scope unchanged immediately before merge
guarded normal merge with exact expected head
merge tree, ordered parents, signature, and main verified
post-merge Project CI attempt 1 success across all six required lanes
only then close the task CLOSED_CANONICAL
```

## 9. PR #519 disposition

PR #519 remains:

```text
CLOSED / DISQUALIFIED / MUST_NOT_MERGE
```

It is historical negative evidence demonstrating the need for this amendment.

The successor must use a new branch and PR from a fresh canonical base after
amendment effectiveness.

PR #519 must not be repurposed as the successor.

## 10. Amendment admission gate

This amendment becomes effective only after all of the following:

1. explicit founder/maintainer approval is recorded for the amendment itself;
2. this amendment PR is exact-head qualified (single-file diff proof);
3. Self Verification succeeds on the exact amendment head (attempt 1);
4. Project CI succeeds across all six required lanes on the exact head
   (attempt 1);
5. exact-head review passes with zero unresolved material findings;
6. unresolved review-thread count is zero;
7. canonical main remains the expected base immediately before merge;
8. guarded normal merge binds the exact approved amendment head;
9. merge tree, ordered parents, verified signature, and canonical main proof;
10. push-triggered post-merge Project CI succeeds on attempt 1;
11. Issue #520 is closed as `CLOSED_CANONICAL / EFFECTIVE`.

Only then:

```text
AMENDMENT_APPROVED = YES
AMENDMENT_EFFECTIVE = YES
T14_SENTINEL_ALIGNMENT_AUTHORIZED = YES
T14_SUCCESSOR_IMPLEMENTATION_AUTHORIZED = YES
```

Until then:

```text
AMENDMENT_APPROVED = NO
AMENDMENT_EFFECTIVE = NO
T14_SENTINEL_ALIGNMENT_AUTHORIZED = NO
T14_SUCCESSOR_IMPLEMENTATION_AUTHORIZED = NO
PR_519_MERGE_AUTHORIZED = NO
```

## 11. Explicit non-expansion

This amendment does not authorize UA-P03-T15 or any later phase ahead of T14
closure.

It does not authorize a general test-editing policy for future tasks.

A future task that needs test paths outside its positive surface must seek its
own bounded amendment; it must not silently assume this one.

This amendment is intentionally narrow: three sentinel files, two pin kinds,
one blocked T14 successor, one preserved failure.

Refs #481
Refs #518
Refs #519
Refs #520
