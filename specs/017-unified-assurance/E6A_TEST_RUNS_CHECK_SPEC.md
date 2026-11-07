# E6 Part One: `ascout test` Runs `check`

**Status:** packet specification under Amendment A07. It changes the A07 acceptance-grid rows
for `test` inside a repository, under the founder's standing approval of 2026-11-07 rather than a
separate ratification. The review half of E6 is not here: it needs an LLM provider, which is
not authorized.

## What changes

`ascout test` used to report NOT_RUN with exit 4 for every profile, running nothing. Now:

| Profile | Runs | Also requires, never run | Exit |
|---|---|---|---|
| `quick` | nothing | quick-tests | 4, `NOT_RUN`, `ENGINE_NOT_QUALIFIED` |
| `standard` (default) | `check` | nothing | `check`'s exit |
| `deep` | `check` | mutation, property-fuzz, browser | the combined exit below |
| `release` | `check` | as `deep`, plus contract and performance-recovery | the combined exit below |

`check` runs exactly as `ascout check` would, over the same repository root with its own
admission rules and run lock. `test` passes no admission override, so a changed command surface
is blocked as in `check` without `--allow-changed-command-surface`. `--plan` is unchanged and
runs nothing.

**Why `quick` runs nothing:** `check` is the only test engine, and its budget is not the quick
profile's. Running it under the quick label would claim a budget it doesn't keep.

## Exits

Precedence follows A07: 2, then 3, then 1, then 4, then 0.

| `check` exit | `standard` | `deep`, `release` |
|---|---|---|
| 0, complete | 0 `COMPLETE` | 4 `INCOMPLETE`, `REQUIRED_ENGINE_NOT_RUN` |
| 1, failure or flaky | 1 `FINDINGS` | 1 `FINDINGS` |
| 2, error | 2, stdout empty | 2, stdout empty |
| 3, source drift | 3 `SOURCE_DRIFT` | 3 `SOURCE_DRIFT` |
| 4, incomplete | 4 `INCOMPLETE`, `CHECK_INCOMPLETE` | 4 `INCOMPLETE`, `CHECK_INCOMPLETE` |

Outside a Git work tree, or without a working directory, `test` exits 4 with `NO_REPOSITORY`,
as the A07 row requires. From a repository subdirectory, or in a repository Ascout refuses, it
exits 2, as `check` does.

**Findings on exits 2 and 3:** on exit 3 the report keeps `check`'s per-task statuses and states
that they describe a tree that no longer exists. On exit 2 nothing is reported. The `check`
receipt stays in the run directory, and `ascout check` shows it.

## Report

Non-plan output is a v2 report: the profile's plan fields, `outcome`, `reason_code`,
`reason_text`, `exit_code`, `executed_count` (tasks that passed, failed, or were flaky), a
`check` summary (`run_id`, exit, completeness, finding count, status counts, per-task status,
and start source), and `not_run` with each required engine that did not run. Terminal output
shows the same, with the plan and `check`'s own summary.

## Side effects

Inside a repository, `test` now does what `check` does: it runs the repository's admitted
verification commands and writes a run directory under `.ascout/`. Before this packet it read
nothing.

## Scope

| File | Change |
|---|---|
| `src/assurance/test/test-run-command.ts` | New: profile requirements, exit mapping, report |
| `src/cli.ts` | Modified: `test` runs `check` for the profiles above |
| `tests/assurance-test-run-command.test.ts` | New: every exit row, and the CLI with `check` replaced |
| `tests/assurance-test-cli-test-plan.test.ts` | Modified: runs outside a repository, where nothing runs |
| `tests/a07-cli-exit-native.test.ts` | Modified: expects `check`'s result inside a repository; copies the receipt schema the compiled copy now needs |
| `README.md` | Modified: command semantics |

The adoption plan listed `test-plan-command.ts` and `tests/assurance-test-check-adapter.test.ts`
as modified, and an OCR runner as new. The plan command is unchanged because the new behavior
lives in its own module. The check adapter maps single task statuses and isn't needed. The OCR
runner belongs to the review half.

## Known limits

- **No real passing or failing project in tests.** Exits 0 and 1 are proved with `check`
  replaced in-process. The compiled-CLI tests reach only `check`'s incomplete result on an empty
  repository. `check`'s own suites cover its passing and failing receipts.
- **The deep and release requirements are names only.** Mutation, property-fuzz, browser,
  contract, and performance-recovery engines exist as adapters, but none is run by this command.
- **The profile budgets aren't enforced.** `check` keeps its own time limits, not the budget the
  plan shows.

## Rollback

Revert this packet's commit. `test` then reports NOT_RUN with exit 4 again and runs nothing.
