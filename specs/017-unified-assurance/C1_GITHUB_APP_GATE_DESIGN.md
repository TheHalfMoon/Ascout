# C1 Design: a customer-registered GitHub App for the Ascout check

**Status:** design, revision 2, for review. It authorizes no implementation.

- Implementation waits for **founder decision 3** in `docs/PAID_OFFERING_DESIGN.md`: does C1 live
  in the free core or in a separate paid package? The design is the same either way; only where the
  code lives changes.
- Registering an App for this repository is an account action the founder takes.
- Model reviews of this document are advisory and are not human R1.

## The problem

Today the publish job (`ascout-pr-publish.yml`) posts the **Ascout verification** check with the
workflow's `GITHUB_TOKEN`. GitHub attributes that check to the GitHub Actions app, and every workflow
in the repository uses that same app. So:

- A same-repository PR can add a workflow, or edit one, that requests `checks: write`. It can then
  post its own **Ascout verification** check, with a success conclusion, on its head commit.
- If branch protection requires **Ascout verification** from *any source*, that forged check
  satisfies it.
- Fork PRs can't do this, because GitHub gives fork `pull_request` runs a read-only token. Any
  contributor with push access can.

`docs/GITHUB_INTEGRATION.md` already lists this as a known limit: "the check name is not exclusive".
The trust rules (the allowlist and the "(untrusted)" name) protect what *Ascout* publishes. They
can't stop someone else from publishing under Ascout's name.

## The fix, in one sentence

The customer registers their own GitHub App, and a hardened default-branch job posts the check as
that App. The branch ruleset then requires **Ascout verification** *from that App*, so a check with
the same name from any other source fails the rule.

GitHub supports this: once an app is chosen as the expected source of a required check, "If the
status is set by any other person or integration, merging won't be allowed" (GitHub docs, "Available
rules for rulesets").

## Non-goals

- **No Ascout-run service.** No webhook receiver, no hosted App, no key held by Ascout. Each
  organization registers and owns its App.
- **No change to the check's conclusion.** The App posts the same conclusion the publisher computes
  today. Only the summary text gains a line about the pin.
- **No new trust for PR code.** The collect job still runs PR code with a read-only token and no
  secrets.
- **Not a defense against admins of the gated repository.** Anyone who can edit its rulesets, its
  environments, or its default branch can already change the gate.
- **No merge queue in v1.** The publish job runs for `pull_request` only, so a required pinned check
  would never appear on `merge_group` commits, and a queue would stall. Merge queue is unsupported
  until a `merge_group` path is designed.

## Requirements and limits

- **GitHub plan.** On private repositories, environment secrets and deployment-branch rules need
  GitHub Pro, Team, or Enterprise. Rulesets on private repositories may have similar limits
  (unverified). On a free plan with a private repository, C1 isn't available, and the docs must say
  so before C1 is described anywhere as usable.
- **GitHub Enterprise Server.** Untested. The rule endpoints and expected-source behavior must be
  verified per version before it's supported.

## Design

### 1. One App per trust boundary

The customer creates a GitHub App in their organization. The private key is the whole security of
C1: anyone who holds it can mint tokens for every installation of that App and post the pinned check
on any of them. So:

- **Use one App per repository, or per group of repositories with the same admins.** Never install
  one App across repositories whose admins differ. An admin of a minor repository who could read the
  key could otherwise forge the check on the most sensitive one.
- **Settings.** Ascout documents these, with an optional App manifest to paste:

| Setting | Value | Why |
|---|---|---|
| Repository permission: Checks | Read and write | To post the check run |
| Repository permission: Pull requests | Read and write | To find the PR, and to read and write its summary comment (the issue-comment endpoints accept Pull requests permission) |
| Repository permission: Commit statuses | Read and write, **if** proof shows GitHub requires it | GitHub's docs say an expected-source app "must have the statuses:write permission"; this is tested in C1c |
| Repository permission: Metadata | Read | Required by GitHub; also enough to read branch rules |
| Every other permission | None | Least privilege |
| Webhook | **Off** | Nothing to receive. As a result, the check's "Re-run" button does nothing; re-run the workflow instead. |
| Where it can be installed | Only on this account | Not a public App |

### 2. Where the key lives

- **Environment, not repository secrets.** The key is stored as a secret in a GitHub environment, for
  example `ascout-publish`. It is never a repository-level or organization-level secret, because
  those reach same-repository `pull_request` runs.
- **Branch rule: "Selected branches and tags", allowing exactly the default branch's name.** Never
  "Protected branches only": GitHub's docs say that with no protection rules, "all branches can
  deploy", and a wildcard protection rule would make an attacker's branch count as protected.
- **Only one workflow file may name the environment:** `.github/workflows/ascout-pr-publish.yml`.
  Since December 2025, GitHub evaluates environment rules for `pull_request_target` runs against the
  default branch, and default-branch `workflow_run`, `schedule`, and `issue_comment` runs also match.
  So any trusted default-branch workflow that names the environment would receive the key. A CI lint
  (in the C1b packet) fails if any other workflow file names `ascout-publish`.
- **`pull_request` runs are evaluated against `refs/pull/N/merge`,** which doesn't match the default
  branch. A PR's *new* `workflow_run` workflow doesn't run: only the default-branch file does.
- **To be proven, not assumed.** C1 ships only if C1c shows that none of these can read the key:
  - a same-repository PR workflow naming the environment, on `pull_request`;
  - a `push` to a non-default branch;
  - a `workflow_dispatch` on a non-default branch.
- **Optional required reviewers.** The default is none, because publish runs on every PR. Required
  reviewers on private repositories also need a paid GitHub plan.

### 3. A key-bearing job that installs nothing

Today's publish job runs `npm ci` and `npm run build`, which execute third-party dependency code. In
a job that holds the key, that code could read the key from another step's process environment. So
C1 splits the work:

- **The key-bearing job installs nothing and builds nothing.** It runs a dependency-free entry point,
  `dist/github/publish-cli.js`, from a pinned Ascout build whose SHA-256 is checked before it runs,
  for example a released tarball with its build-provenance attestation. The publish path
  (`src/github/publish.ts`, `policy.ts`, `pr-evidence.ts`) imports only Node built-ins today. A test
  (C1a) fails if that entry point's import graph ever reaches anything but `node:` modules.
- **The job uses no third-party actions.** It runs `actions/checkout`, a SHA-pinned GitHub action,
  for the policy file only, and the artifact download that today's job already uses.
- **The evidence bundle is still untrusted input,** validated exactly as today. It is downloaded data,
  never executed.
- **Re-running an old publish run uses that run's pinned build,** which may be an older version.
  Customers should update the pin, and the setup guide says so.

### 4. Minting the token

App mode turns on when both `ASCOUT_APP_CLIENT_ID` and `ASCOUT_APP_PRIVATE_KEY` are set. They are
set only in the environment-bound job.

1. **Sign a JWT** (RS256) with `node:crypto`:
   - `iss` is the App's client ID, which GitHub prefers;
   - `iat` is backdated 60 seconds;
   - `exp` is at most 10 minutes later.
2. **Find the installation:** `GET /repos/{owner}/{repo}/installation`. **Check that the response's
   `app_id` is this App** (configured as `ASCOUT_APP_ID`); otherwise refuse.
3. **Create an installation token:**
   `POST /app/installations/{id}/access_tokens` with
   `repositories: [<this repo>]` and only the permissions in section 1. The token lasts at most an
   hour and reaches only this repository.
4. **Mask before use.** Emit `::add-mask::` for the JWT and the installation token as soon as they
   exist; GitHub masks only the stored secret itself. Never log request headers, even with
   `ACTIONS_STEP_DEBUG` on. The key, JWT, and token join the run's redaction set, and every error
   names the step that failed, never a value.
5. **Publish exactly as today, with that token.** The bot login used to find Ascout's summary comment
   becomes `<app-slug>[bot]`.

### 5. Reporting whether the pin is in place

In App mode, the publisher reads the default branch's effective **ruleset** rules with
`GET /repos/{owner}/{repo}/rules/branches/{branch}`, which needs only Metadata read. The summary then
says one of:

- **"Pinned in a ruleset to this App"**, when a rule requires **Ascout verification** from this App's
  ID. It always adds: bypass actors and classic branch protection were not checked.
- **"Not pinned in any ruleset"**: a check of the same name from another source may satisfy branch
  protection. A pin made through classic branch protection's "expected source" doesn't show up here,
  so the wording never says "unprotected".
- **"Pin status unknown"**, when the rules can't be read.

This is a warning, never a failure, and never a false "pinned".

### 6. Without an App

With neither variable set, nothing changes: the current publish job with `GITHUB_TOKEN`. Setting only
one of the two is a configuration error: refuse with exit 2 and post nothing.

## Threats and how C1 answers them

| Threat | Today | With C1 |
|---|---|---|
| Same-repository PR adds a workflow that posts a passing **Ascout verification** check | Satisfies an any-source required check | It comes from GitHub Actions, not the App, so it **fails** the pinned rule |
| Fork PR posts a fake check | Not possible (fork token is read-only) | Same |
| Any write user posts a *failing* commit status named **Ascout verification** | Can block a merge | Same. GitHub requires both a check and a status of the same name to pass. This is a denial of service, not a bypass, and is documented. |
| PR changes `ascout-pr-publish.yml` | No effect: the default-branch file runs | Same |
| PR adds its own `workflow_run` or `pull_request_target` workflow | Not applicable | It doesn't run until merged. Once merged, the lint stops any file but the publish workflow from naming the environment. |
| PR forges the evidence bundle | Published as "(untrusted)" and capped | Same; C1 doesn't change trust in evidence |
| PR workflow tries to read the App key | Not applicable | Refused by the exact-branch environment rule (**must be proven**) |
| A compromised npm dependency | Runs in the publish job with a check-writing token | It never runs in the key-bearing job, which installs nothing |
| A maintainer's PR runs malicious code during collect | A known limit: collect has no secrets | Same: the key never enters collect |
| An admin of *another* repository reads a shared App key | Not applicable | Avoided by one App per trust boundary; documented as a hard setup rule |
| Debug logging exposes the JWT or token | Not applicable | Masked as soon as they're minted; headers never logged |
| Someone with admin rights on *this* repository changes the ruleset or environment | Out of scope | Out of scope |
| The App key leaks some other way | Not applicable | Whoever holds it can post the pinned check. The customer revokes and rotates the key; the docs give the steps. |

## Proof required before C1 ships

1. **Unit tests (C1a):**
   - the JWT has the right claims and an RS256 signature that verifies against the public key;
   - it expires within 10 minutes;
   - an installation whose `app_id` doesn't match is refused;
   - the token request is scoped to one repository and the listed permissions;
   - the key, JWT, and token never appear in any output, including on error paths and in debug
     output;
   - setting only one variable exits 2 with no network call;
   - with no App, the behavior is byte-for-byte today's;
   - the pin report never claims "pinned" falsely;
   - the publish entry point imports only `node:` modules.
2. **Fake GitHub API tests,** like `tests/github-publish.test.ts`: the whole publish runs with an
   installation token, and the bot login is the App's.
3. **Workflow lint (C1b):** only `ascout-pr-publish.yml` names the environment, and the key-bearing
   job has no `npm` step and no third-party action.
4. **Live end-to-end on a test repository (C1c):**
   - with the ruleset pinned to the App, a same-repository PR that posts its own **Ascout
     verification** success through GitHub Actions **cannot merge**;
   - the App can be selected as the expected source, with and without Commit statuses permission;
   - a same-repository PR workflow naming the environment can't read the key on `pull_request`, on
     `push` to its own branch, or on `workflow_dispatch` from its branch, and the logs show the job
     refused;
   - "Protected branches only" is shown to be unsafe with no protection rules.
5. **An independent security review** of the key handling, the job split, and the environment setup.

## Customer setup (what the docs will say)

1. Create one App for this repository, or for this trust boundary, with the settings above. Install
   it only there.
2. Create the environment `ascout-publish` with "Selected branches and tags", allowing exactly the
   default branch. Add `ASCOUT_APP_ID`, `ASCOUT_APP_CLIENT_ID`, and `ASCOUT_APP_PRIVATE_KEY` as
   environment secrets.
3. Use the hardened publish workflow from C1b: a key-bearing job that installs nothing and runs a
   pinned, digest-checked Ascout build.
4. In the default branch's ruleset, require **Ascout verification** with the App as its source.
5. Open a test PR, and confirm the summary says "Pinned in a ruleset to this App".
6. Check the requirements above: a paid plan for private repositories, and no merge queue.

## Packets

| Packet | Content | Gate |
|---|---|---|
| C1a | App mode: dependency-free publish entry point, JWT, installation token, masking, pin report; unit and fake-API tests | Founder decision 3; standard engineering loop |
| C1b | Hardened publish workflow (job split, environment, lint) and the customer setup guide | With C1a |
| C1c | Live proof on a test repository, and this repository's own App | The founder registers the App; the results are recorded before C1 is described as available |

## Open decisions for the founder

1. Decision 3 from the paid-offering design: does C1 live in the free core or in a paid package?
2. Whether to register an App for this repository and pin its check, after C1c's proof.
3. Whether to require environment reviewers for the publish job, given that it runs on every PR.

## Review record

- **Revision 1:** independent AI review (subagent). It confirmed the core mechanism against GitHub's
  docs. It found no critical issues, 2 high, 6 medium, 4 low, and 4 nits. Revision 2 addresses all of
  them:
  - **High:**
    - one App key shared across repositories with different admins;
    - the key sitting in the same job as `npm ci` and the build.
  - **Medium:**
    - "Protected branches only" lets every branch in when no protection rules exist;
    - Commit statuses permission may be needed for the expected source;
    - `pull_request_target` and other default-branch triggers can reach the environment;
    - the pin check can't see classic protection or bypasses;
    - plan limits on private repositories;
    - merge queue.
  - **Low:**
    - the JWT should use the client ID;
    - the installation check was circular;
    - runtime tokens weren't masked;
    - a same-named failing status can block a merge.
  - **Nits:** the Re-run button, re-runs of old code, and an over-broad "exactly the same" claim.

No human has reviewed this design. It is not human R1.
