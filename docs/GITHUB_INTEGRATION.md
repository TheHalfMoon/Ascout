# Ascout GitHub integration (in development)

**Status:** the collector (`ascout pr-evidence`), the publisher (`ascout pr-publish`), and two workflows
are on `main`, and this repository runs them on its own pull requests. **None of it is in a release
yet:** v0.2.0 doesn't include these commands.

## Design

Ascout runs entirely on the customer's own runners. Ascout operates no service.

1. **Collect, unprivileged.** On `pull_request`, with a read-only `GITHUB_TOKEN` and no secrets, a job
   checks out the PR head and runs `ascout pr-evidence`. That runs review (without a model),
   security (Gitleaks, if configured), and the standard test profile, which runs `check` and so the
   repository's own tools (T0 trusted-local). It uploads the `ascout.pr-evidence/v1` bundle as an
   artifact.
2. **Publish, privileged, never runs PR code.** On `workflow_run`, with `checks: write` and
   `pull-requests: write`, a job downloads the bundle and treats it as untrusted:
   - it validates the bundle strictly;
   - it binds the check to the PR head taken from the trusted event, refuses a bundle that names
     another commit, and re-reads the PR head before posting, so a push in between is reported as
     drift rather than as a result;
   - it posts one **Ascout verification** Check Run with located findings as annotations;
   - it updates a single summary comment in place, matched by marker **and** bot author.

## Installing it in a repository

Copy two workflow files from this repository into `.github/workflows/` in yours:

- `ascout-pr-collect.yml` runs on `pull_request` with `contents: read` only. It checks out the PR
  head, soft-resets to the merge base so review sees exactly the PR's changes, and runs
  `ascout pr-evidence --pr-head <sha>`. Ascout verifies that the working tree holds exactly that
  commit before naming it. The job uploads the bundle.
- `ascout-pr-publish.yml` runs on `workflow_run` after collection, from your default branch. It
  downloads the bundle and runs `ascout pr-publish`, which posts the **Ascout verification** Check
  Run and one summary comment.

This repository builds Ascout from source in both jobs. A consuming repository would install the
released tarball instead, once a release includes these commands. Runner minutes are yours, and
Ascout runs no service.

## Check Run results

| Overall state | Conclusion | Passes branch protection? |
|---|---|---|
| Complete (exit 0) | `success` | Yes |
| Findings, error, or source changed (exit 1, 2, 3) | `failure` | No |
| Incomplete: required work did not run (exit 4) | `action_required` | No. `neutral` is never used, because branch protection treats it as passing. |
| Evidence from a fork PR that claims success | `action_required` | No |

## Security model and known limits

- **Fork PRs can forge evidence.** The collect job runs PR code, which on a fork is the
  attacker's, including their workflow files. So evidence from a fork can report problems, but it
  can never produce `success`; it is capped at `action_required`. Same-repository PRs come from
  people with write access.
- **The check name is not exclusive (known limit).** Any workflow job, including one added in a
  fork PR, can create a check run named "Ascout verification" through the same GitHub Actions app.
  A ruleset that requires the check by name can't tell them apart. Hard gating needs the check to
  come from a dedicated GitHub App, which is planned and not built. Until then, treat the check as
  a strong signal for same-repository PRs, not as a tamper-proof gate.
- **Honest collection can't be green today.** Review without a model and Gitleaks on a clean scan
  both exit 4, because neither can prove coverage. A per-repository policy deciding which checks
  are required is planned, so that teams can gate on the checks they choose.
- AI review, where configured, is advisory and never makes the check pass.
