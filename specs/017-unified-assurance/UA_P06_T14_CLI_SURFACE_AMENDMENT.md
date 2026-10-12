# UA-P06-T14 CLI Surface Amendment

**Status:** `PROPOSED / NOT_EFFECTIVE / FOUNDER_APPROVAL_REQUIRED`
**Ledger:** Issue #602
**Amends:** `UA_P06_IMPLEMENTATION_AUTHORIZATION.md` section 7 (positive mutation surface), for UA-P06-T14 only
**Canonical base at proposal creation:** `489db3081aff2833050848a29a1441f8ce4b2827`
**Prepared by:** a Claude coding agent. This document is a proposal; it is not a founder decision, and Claude may not authorize, approve, or make it effective.

## 1. Purpose

UA-P06-T14 must add exactly one additive `ascout security` command (sections
5 and 10). Section 7 limits T14 to `src/assurance/security/**`,
`tests/assurance-security-*.test.ts`, and `src/cli.ts`. Canonical sentinels
outside that surface assert the pre-T14 CLI, so the mandated command cannot
land without breaking them, and section 7 requires the task to stop and return
to an authorization amendment. This document proposes the narrowest addition.

```text
AMENDMENT_APPROVED = NO
AMENDMENT_EFFECTIVE = NO
T14_IMPLEMENTATION_AUTHORIZED = NO
```

## 2. Conflicting canonical sentinels (main `489db30`)

| Path | Assertion that T14 necessarily changes |
|---|---|
| `tests/assurance-check-compatibility.test.ts` | `usageText()` equals `EXPECTED_USAGE`, which lists exactly init/doctor/check/review/test |
| `tests/assurance-phase-qualification.test.ts` | `parseCliArgs(["security"])` throws `CliUsageError` |
| `tests/assurance-phase-recovery-qualification.test.ts` | `parseCliArgs(["security"])` throws `CliUsageError` |
| `tests/assurance-review-p03-t15.test.ts` | `parseCliArgs(["security"])` throws `CliUsageError` |
| `tests/assurance-test-cli-test-plan.test.ts` | `["security"]` is in the invalid-argv list |
| `README.md` | the documented command list (would otherwise misstate the shipped CLI) |

These sentinels were correct before T14: section 10 states
`ascout security = unsupported` **until** T14.

## 3. Proposed additional mutation surface (T14 only)

Exactly these edits, and nothing else:

1. `tests/assurance-check-compatibility.test.ts`: add the single
   `ascout security` usage line to `EXPECTED_USAGE`, in the position T14
   emits it. All other lines and assertions unchanged.
2. The three phase/review sentinel tests: remove only `"security"` from the
   refused-command list; `"cyber"` and `"assure"` stay refused.
3. `tests/assurance-test-cli-test-plan.test.ts`: remove only `["security"]`
   from the invalid-argv list; add no other change.
4. `README.md`: add the `ascout security` usage line and one sentence stating
   what it does and does not do (section 4), next to the existing review/test
   semantics paragraph.

No other test may be weakened. Every removed assertion must be replaced by a
stronger positive assertion in `tests/assurance-security-t14.test.ts`.

## 4. Required T14 command semantics (decision points)

At the pin, UA-P06 executes no Sentrdel binary (sections 9 and 13), so the
command has no engine to run. Proposed semantics:

```text
ascout security [--format json|terminal]
```

- Local and read-only; no network; no writes outside stdout/stderr.
- Reports `NOT_RUN` with reason `ENGINE_NOT_EXECUTED_IN_UA_P06` and the
  explicit unsupported scope; never PASS, CLEAN, or a verdict.
- **Decision point A — exit code.** Recommended: exit `1` for `NOT_RUN` (a
  missing engine is never success; hard-zero `missing_engine_converted_to_pass
  = 0`). Alternative: exit `0` with `NOT_RUN`, as `ascout review` does today,
  which README already flags as a misleading exit status.
- **Decision point B — inputs.** Recommended: no arguments beyond `--format`
  in T14 (importing SARIF or evaluation files through the CLI would add a
  read surface not reviewed here).
- `ascout check`, `review`, and `test` parse, render, exit, receipt, and
  JSON semantics stay byte-identical (section 10).

## 5. Required T14 evidence

Positive tests in `tests/assurance-security-t14.test.ts` for parse, usage,
JSON/terminal output, exit code, no network, and no file writes; exact
before/after proof that check/review/test outputs are unchanged; E2E of the
built CLI on a fixture repository; OCR delegation review (labeled per the
review-model amendment #619 once effective); Jev; exact-head six-lane CI.

## 6. Admission gate

This amendment becomes effective only after: explicit founder authorization
of this amendment and approval of its exact head; one-file diff; exact-head
Self Verification and six-lane Project CI attempt 1 success; an exact-head
review record with zero unresolved material findings; zero unresolved
threads; unchanged main; guarded normal merge; verified merge result;
post-merge Project CI attempt 1 success; and an effectiveness record on
Issue #602. Until then `T14_IMPLEMENTATION_AUTHORIZED = NO`.

## 7. Explicit non-expansion

- No new command other than `security`; `cyber` and `assure` stay refused.
- No change to check/review/test semantics, config schema, dependencies,
  lockfile, or workflows.
- No Constitution change.
- No authority for T15 or T16 beyond what the authorization already grants.
