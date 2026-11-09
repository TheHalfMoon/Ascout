# Repository Settings Checklist (for the owner)

**Observed:** 2026-11-09, through the GitHub API on `TheHalfMoon/Ascout`. These are owner settings.
No PR can change them, and no agent changed them. Each row gives the current value, the
recommended value, and where to set it. The `gh` commands need an owner token. Run them only if you
choose to.

## 1. Vulnerability reporting

| Setting | Now | Recommended | Where |
|---|---|---|---|
| Private vulnerability reporting | **Off** | **On** | Settings → Code security → Private vulnerability reporting |

`SECURITY.md` tells reporters to use GitHub's private vulnerability reporting "when it is
available". Today it is not available, so a reporter has no private channel. Turning it on makes
`SECURITY.md` accurate.

```bash
gh api -X PUT repos/TheHalfMoon/Ascout/private-vulnerability-reporting
```

## 2. Dependabot

| Setting | Now | Recommended | Where |
|---|---|---|---|
| Dependabot alerts | **Off** (the API returns 404) | **On** | Settings → Code security → Dependabot alerts |
| Dependabot security updates (automatic PRs) | Off | Your choice. Their PRs still need the 13 checks and R1 | Same page |
| `.github/dependabot.yml` (version updates) | Absent | Optional; it does **not** turn alerts on | A file in the repository |

```bash
gh api -X PUT repos/TheHalfMoon/Ascout/vulnerability-alerts
```

## 3. A ruleset for `main`

Now: `main` is **not protected**, and the repository has **0 rulesets**. Create one ruleset
(Settings → Rules → Rulesets → New branch ruleset) that targets the default branch:

| Rule | Value |
|---|---|
| Enforcement | Active |
| Bypass list | Empty. Add only yourself, for emergencies, if you want |
| Restrict deletions | On |
| Block force pushes | On |
| Require linear history | On, which matches squash merges |
| Require a pull request before merging | On |
| Required approvals | **0** while you are the only maintainer: GitHub doesn't let an author approve their own PR. Raise it to 1 when a second reviewer exists. Human R1 stays a governance rule, recorded in the PR either way. |
| Dismiss stale approvals on new commits | On |
| Require conversation resolution | On |
| Require status checks to pass | On, with "require branches to be up to date" on |
| Required checks (exactly these 13) | `project / ubuntu-24.04 / node-22`, `project / ubuntu-24.04 / node-24`, `project / macos-15 / node-22`, `project / macos-15 / node-24`, `project / windows-2025 / node-22`, `project / windows-2025 / node-24`, `gitleaks / ubuntu-24.04 / node-22`, `gitleaks / ubuntu-24.04 / node-24`, `gitleaks / macos-15 / node-22`, `gitleaks / macos-15 / node-24`, `gitleaks / windows-2025 / node-22`, `gitleaks / windows-2025 / node-24`, `self-verify` |

**One caveat on required checks.** A docs-only PR still triggers all 13, so requiring them blocks
nothing. If a workflow ever gains path filters, a required check that never runs would block
merging. Keep the required list in step with the workflows.

## 4. Merge settings

| Setting | Now | Recommended |
|---|---|---|
| Allow squash merging | On | On (the only method used) |
| Allow merge commits | On | Off |
| Allow rebase merging | On | Off |
| Automatically delete head branches | Off | On |
| Allow auto-merge | Off | Off, unless you want it |

## 5. Secret scanning (already good)

| Setting | Now | Recommended |
|---|---|---|
| Secret scanning | On | Keep |
| Push protection | On | Keep |
| Non-provider patterns | Off | Optional |
| Validity checks | Off | Optional |

## 6. Actions

| Setting | Now | Recommended |
|---|---|---|
| Default `GITHUB_TOKEN` permissions | Read | Keep |
| Actions can approve PRs | No | Keep |
| Allowed actions | All | "Allow owner-created and selected actions": `actions/checkout`, `actions/setup-node`, `actions/upload-artifact` (the workflows already pin all three by SHA) |
| Require actions pinned to a full SHA | Off | On. Every current `uses:` is already SHA-pinned. |

## Not settings, but related

- **npm `private: true`** only blocks npm publication. The GitHub repository itself is public.
- **Releases and tags.** None exist. Creating one stays behind FD-6.
