# Ascout GitHub integration (in development)

**Status:** part one, the evidence collector and the publish-side logic, is on `main`. The
publisher and the installable workflows come in part two. **Nothing here is released yet.**

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
