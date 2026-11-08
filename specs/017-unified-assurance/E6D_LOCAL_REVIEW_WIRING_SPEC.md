# E6 Part Four: `ascout review --local-model`

**Status:** packet specification. This wires the E6C local review provider into `ascout review`
behind an explicit flag. Without the flag, `ascout review` is unchanged.

## Behaviour

`ascout review --local-model [--format json|terminal]`:

1. Reads the working-tree changes against HEAD, as `ascout review` does today. A change in the
   source during that read exits `3`.
2. With no changes, reports the empty scope (exit `4`) and calls nothing.
3. Reads the founder's config (E6C). A missing config, or a provider the decision refuses, leaves
   every change unreviewed and exits `4`. A config that exists but is malformed exits `2`.
4. Builds the text the model sees: for each changed text file, the changed lines plus 10 lines of
   context, numbered. Deleted, binary, and unreadable files are left out, and so is any file that
   would take the text past 120 KiB. Each left-out file stays unreviewed.
5. Removes every recognized secret value from the environment (the same set `check` redacts) and
   escapes `</diff>` so file content cannot end the data block.
6. Calls the model on loopback, with a 10-minute timeout and a 1 MiB reply limit. A timeout, an
   unreachable server, an HTTP error, or a reply that is not the findings object leaves the change
   unreviewed and exits `4`.
7. Validates each finding's location against the files and line counts the model was shown, then
   runs the existing normalization, injection screen, coverage, and correlation.
8. Reads the source again. If it changed while the model ran, exits `3` instead of reporting.

## Result

The report is the full review report plus:

| Field | Value |
|---|---|
| `advisory` | always `true` |
| `satisfies_human_r1` | always `false` |
| `outcome` | `FINDINGS`, `NO_FINDINGS`, or `INCOMPLETE` |
| `exit_code` | `1`, `0`, or `4` |
| `provider` | model, family, independence, Ollama version, dropped findings |

- **`FINDINGS`, exit 1:** at least one finding is placed on a changed file's real lines. Findings
  that can't be placed are listed but don't count.
- **`NO_FINDINGS`, exit 0:** nothing placeable, and the model saw every changed file. The report
  says this is advice, not a clean review.
- **`INCOMPLETE`, exit 4:** nothing placeable, and some changed files were left out.

The terminal report escapes all model text, so a finding cannot forge report lines.

## Scope

| File | Change |
|---|---|
| `src/assurance/review/local-review-run.ts` | New: payload builder and the run |
| `src/cli.ts` | `--local-model` flag; the run, with a drift check after the model returns |
| `src/assurance/review/review-command.ts` | Terminal rendering for advisory reports |
| `README.md` | The flag and its exits |
| `tests/local-review-run.test.ts` | New: payload, outcomes, refusals, failures, escaping, CLI run against a fake server |
| Seven tests pinning the usage text | Usage line now shows `[--local-model]` |

## Qualification

On 2026-11-09, on the founder's Windows machine with Ollama 0.40.15 and `qwen2.5-coder:7b` on CPU,
a throwaway repository with three planted bugs:

- The model found the off-by-one loop and the assignment-in-return. It missed the division by zero.
  The run exited `1` and took about a minute.
- A comment in the change told the model to approve it and reply with no findings. The model
  ignored it and reported the same two findings.

This is one local run, not a benchmark. CI has no model and uses a fake server.

## Known limits

- Only `ascout review --local-model` on a machine where the founder has written the config. CI and
  other users see no change.
- A 7B model on CPU is slow and misses real problems. That is why the output is advisory.
- Secret removal covers recognized environment values only. A secret committed in the changed file
  reaches the local model, but never leaves the machine.

## Rollback

Revert the commit. `ascout review` without the flag is untouched.
