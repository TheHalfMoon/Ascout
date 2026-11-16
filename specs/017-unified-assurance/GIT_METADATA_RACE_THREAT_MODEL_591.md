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

## What Ascout guarantees (characterized)

`tests/git-race-591.integration.test.ts` makes the change during the run, from the repository's own
task. It runs on Linux, macOS and Windows in CI. Three cases are covered:
1. a new `.gitattributes` with a filter, plus a filter driver in the repository config;
2. an attributes file redirected through `core.attributesFile`;
3. an existing `.gitattributes` edited to add a filter.

**Observed and required in every case:**
- the repository-selected driver never runs: its marker file is never created;
- the run is never COMPLETE with exit 0. Ascout's end-of-run observation refuses to read a repository
  with a filter attribute, which the CLI reports as exit 2, or reports drift (exit 3).

A control case, the same task without the change, runs normally, so the cases test the change itself.

## What stays open

- **Item 2:** removing the check-then-use window entirely. One way is to read Git objects through an
  interface that cannot invoke helpers. Another is running Git inside a verified containment tier.
  That needs FD-4 T1, with a human security review before any claim.
- **Further characterization worth adding:** concurrent changes to textconv or `diff.external`
  configuration, and attribute changes inside submodules (submodules are refused today). Each would
  follow the same "no helper runs, never COMPLETE" rule.
