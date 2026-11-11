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

## Team policy

A repository can choose which checks a pull request must complete, in
`.github/ascout-policy.json` on its default branch:

```json
{ "version": 1, "required_checks": ["test"] }
```

- **Only the publisher reads the policy,** from its own default-branch checkout. It never reads it
  from the pull request, so a PR cannot relax its own requirements.
- **A finding, an error, or a source change in any check always fails,** required or not. The policy
  only decides which checks must *complete*.
- **No file means every check is required.**
- **An invalid policy fails closed:** the publisher refuses to publish, the publish job fails
  (exit 2), and no check run appears. All of these count as invalid:
  - unknown keys, unknown or duplicate check names, an empty list, or an unknown version;
  - a symbolic link or anything else that is not a regular file;
  - a file over 16 KiB.

  A leading byte-order mark is accepted.
- **The publisher reads the policy relative to its working directory,** so run `ascout pr-publish`
  from the root of the default-branch checkout, as `ascout-pr-publish.yml` does. With a
  `working-directory` setting or a `path:` checkout it finds no file and requires every check. That
  is the stricter result, and the summary names the default policy.
- **The trust rules below still apply.** A policy pass from untrusted evidence is still capped at
  `action_required`.
- The check run and the summary comment mark each check as required or not, and both say the same
  thing, including when untrusted evidence is capped.

## Check Run results

| Policy verdict | Conclusion | Passes branch protection? |
|---|---|---|
| Every required check complete (exit 0), and no check failing | `success` | Yes |
| Any check with findings, an error, or source changed (exit 1, 2, 3) | `failure` | No |
| A required check incomplete: required work did not run (exit 4) | `action_required` | No. `neutral` is never used, because branch protection treats it as passing. |
| Untrusted evidence that would pass: a fork, an author or actor not on the allowlist, a bot, or another base | `action_required`, under "Ascout verification (untrusted)" | No |

## Security model and known limits

**Collection runs pull request code**: the repository's tests, and in this repository the Ascout
build itself. So any PR, fork or not, can forge its own evidence. The publisher therefore decides
trust itself, from the trusted event:

- **A pass needs all of these:**
  - a same-repository PR;
  - targeting the protected base (the default branch);
  - whose author **and** triggering actor are on the maintainer allowlist (the repository variable
    `ASCOUT_PR_TRUSTED_ACTORS`, comma-separated);
  - neither of whom is a bot.

  The allowlist is **empty by default, so no PR evidence turns the required check green until a
  maintainer opts in.**
- **Everything else is published as "Ascout verification (untrusted)",** a separate check name, so
  it can never overwrite or satisfy the required check. It is capped at `action_required` when it
  claims a pass, and it can still report failures.
- **Trusting a maintainer means trusting their PR's code and dependencies.** A malicious dependency
  in a maintainer's PR runs during collection like any other code. Dependabot and other bots are
  never trusted.
- **The check name is not exclusive.** A job a PR adds to its own workflow can create a check run
  with the same name through the GitHub Actions app. Hard, tamper-proof gating needs a dedicated
  GitHub App, which is designed (`specs/017-unified-assurance/C1_GITHUB_APP_GATE_DESIGN.md`) and not
  built.
- **Several open PRs from one branch are ambiguous**, so the publisher annotates none of them.
- **Honest collection can't be green under the default policy.** Review without a model and
  Gitleaks on a clean scan both exit 4. A repository that wants a pass on tests alone has to say so in
  its team policy. The summary always shows which checks did not run.
- AI review, where configured, is advisory and never makes the check pass.
