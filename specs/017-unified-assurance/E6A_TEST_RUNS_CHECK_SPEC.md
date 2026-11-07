# E6 Part One: `ascout test` Runs `check`

**Status:** packet specification under Amendment A07, adopted under the founder's standing
approval of 2026-11-07 rather than a separate ratification. It changes three things A07 fixed for
`test`:

- **Grid rows inside a repository:** `standard`, `deep`, and `release` now run `check`.
- **Section 5.3 reason codes, everywhere:** `test` without `--plan` no longer reports
  `ENGINE_NOT_EXECUTED`. Outside a repository it reports `NO_REPOSITORY`, and `quick` reports
  `ENGINE_NOT_QUALIFIED`.
- **Report shape:** every non-plan report is `schema_version` 2, with new `check`, `not_run`,
  and `effects_enforced` fields. A caller matching the old report breaks.

The review half of E6 is not here: it needs an LLM provider, which is not authorized.

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
| 0, complete, with a test task that passed | 0 `COMPLETE` | 4 `INCOMPLETE`, `REQUIRED_ENGINE_NOT_RUN` |
| 0, complete, but no test task ran | 4 `INCOMPLETE`, `NO_TEST_EXECUTED` | 4 `INCOMPLETE`, `REQUIRED_ENGINE_NOT_RUN` |
| 1, failure or flaky | 1 `FINDINGS` | 1 `FINDINGS` |
| 2, error | 2, stdout empty | 2, stdout empty |
| 3, source drift | 3 `SOURCE_DRIFT` | 3 `SOURCE_DRIFT` |
| 4, incomplete | 4 `INCOMPLETE`, `CHECK_INCOMPLETE` | 4 `INCOMPLETE`, `CHECK_INCOMPLETE` |

**Why exit 0 needs a test:** `check` can complete when only typecheck or lint applies, for
example in a TypeScript project with no test runner. A test command that ran no test must not
pass, so exit 0 also requires a `test` or `pytestBasic` task with status PASS.

For profiles that run `check`: outside a Git work tree, or without a working directory, `test`
exits 4 with `NO_REPOSITORY`, as the A07 row requires. "Outside" means no `.git` in the working
directory or any parent. Inside one, a Git failure, a repository subdirectory, or a repository
Ascout refuses exits 2, as `check` does. `quick` reports `ENGINE_NOT_QUALIFIED` everywhere.

**Findings on exits 2 and 3:** on exit 3 the report keeps `check`'s per-task statuses and states
that they describe a tree that no longer exists. On exit 2 nothing is reported on stdout.
When `check` produced a receipt, stderr names its path, `.ascout/runs/<run_id>/receipt.json`.

## Report

Non-plan output is a v2 report: the profile's plan fields, `outcome`, `reason_code`,
`reason_text`, `exit_code`, `executed_count` (tasks that passed, failed, or were flaky), a
`check` summary (`run_id`, exit, completeness, finding count, status counts, per-task status,
and start source), `not_run` with each required engine that did not run, and
`effects_enforced: false`. The plan's effect classes and budgets are predictions: `check` runs
repository commands with the user's permissions, with no isolation and no network limit.
Terminal output shows the same, with the plan and `check`'s own summary.

## Side effects

Inside a repository, `test` now does what `check` does: it runs the repository's admitted
verification commands and writes a run directory under `.ascout/`. Before this packet it read
nothing.

## Scope

| File | Change |
|---|---|
| `src/assurance/test/test-run-command.ts` | New: profile requirements, exit mapping, report |
| `src/cli.ts` | Modified: `test` runs `check` for the profiles above |
| `src/assurance/repository-presence.ts` | New: tells "no repository" from a Git failure inside one |
| `src/assurance/security/security-gitleaks.ts` | Modified: uses the same test, so a Git failure there also exits 2 |
| `tests/assurance-test-run-command.test.ts` | New: every exit row, and the CLI with `check` replaced |
| `tests/assurance-test-cli-test-plan.test.ts` | Modified: runs outside a repository, where nothing runs |
| `tests/a07-cli-exit-native.test.ts` | Modified: expects `check`'s result inside a repository; copies the receipt schema the compiled copy now needs |
| `README.md` | Modified: command semantics |

The adoption plan listed `test-plan-command.ts` and `tests/assurance-test-check-adapter.test.ts`
as modified, and an OCR runner as new. The plan command is unchanged because the new behavior
lives in its own module. The check adapter maps single task statuses and isn't needed. The OCR
runner belongs to the review half.

## Known limits

- **An installed package can't write receipts yet.** The receipt code loads its schema from
  `specs/`, which the package doesn't ship. That already breaks `ascout check` from an installed
  package. With this packet it breaks `ascout test` there too. The package is private and
  unpublished. The fix is separate.

- **No real passing or failing project in tests.** Exits 0 and 1 are proved with `check`
  replaced in-process. The compiled-CLI tests reach only `check`'s incomplete result on an empty
  repository. `check`'s own suites cover its passing and failing receipts.
- **The deep and release requirements are names only.** Mutation, property-fuzz, browser,
  contract, and performance-recovery engines exist as adapters, but none is run by this command.
- **The profile budgets aren't enforced.** `check` keeps its own time limits, not the budget the
  plan shows.

## Rollback

Revert this packet's commit. `test` then reports NOT_RUN with exit 4 again and runs nothing.
