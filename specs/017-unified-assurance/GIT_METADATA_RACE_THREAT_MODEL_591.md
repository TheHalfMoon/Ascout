# Git metadata race: threat model and characterization (issue #591)

**Scope:** acceptance items 1 and 3 of [#591](https://github.com/TheHalfMoon/Ascout/issues/591). Item 2
(an execution boundary that can't invoke repository-selected helpers, or a verified containment tier)
depends on FD-4 T1 and stays open. Ascout remains **trusted-local (T0)**, and this document authorizes
no analysis of untrusted repositories.

Exploit payloads are not kept here. The tests use synthetic markers only.

## Threat model

- **Asset:** the operator's machine, which Git helpers would run on, and the truthfulness of the
  receipt, so that a stale digest is never reported as COMPLETE.
- **Repository-selected helpers.** Git runs commands chosen by repository metadata: filter drivers
  through `.gitattributes` and configuration, `core.fsmonitor`, `diff.external`, hooks, and textconv.
  E1 (#659) hardens Ascout's own Git calls against these: fsmonitor off, no hooks path, no external
  diff, no inherited `GIT_*`, a trusted Git, and refusal of filter attributes before hashing.
- **The race.** Checking attributes and hashing are separate operations. A concurrent writer can
  change `.gitattributes`, `.git/config` or `core.attributesFile` between them. Under T0, the writer
  can be the repository's own task code, which runs as the operator during `check`.
- **Out of scope here:**
  - code a task runs itself, which is T0 by definition (the task can already run anything);
  - kernel and filesystem races below Git.

## What was observed (characterized, not guaranteed)

`tests/git-race-591.integration.test.ts` makes the change during the run, from the repository's own
task. It runs on Linux, macOS and Windows in CI. Three cases are covered:
1. a new `.gitattributes` with a filter, plus a filter driver in the repository config;
2. an attributes file redirected through `core.attributesFile`;
3. an existing `.gitattributes` edited to add a filter.

**Observed in these three cases, and required by the tests:**
- the repository-selected driver did not run (its marker file was never created);
- the run was not COMPLETE. In each case, Ascout's end-of-run observation refused to read a
  repository with a filter attribute; the CLI reports that as exit 2. In the redirected-attributes
  case, drift can't explain it.

A positive control shows that plain `git add` does run the planted driver, so "never created" is a
meaningful assertion. A control case, the same task without the change, is not refused.

These results cover the three cases tested. They are not a general guarantee. The check-then-use
window itself is unchanged, and #591 stays open.

## What stays open

- **Item 2:** removing the check-then-use window entirely. One way is to read Git objects through an
  interface that cannot invoke helpers. Another is running Git inside a verified containment tier.
  That needs FD-4 T1, with a human security review before any claim.
- **Further characterization worth adding:** concurrent changes to textconv or `diff.external`
  configuration, and attribute changes inside submodules (submodules are refused today). Each would
  follow the same "no helper runs, never COMPLETE" rule.
