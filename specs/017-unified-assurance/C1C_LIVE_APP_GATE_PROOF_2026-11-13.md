# C1c: live GitHub App check-source pin proof (2026-11-13)

**Scope:** A live experiment in the public, disposable test repository [TheHalfMoon/ascout-c1c-proof](https://github.com/TheHalfMoon/ascout-c1c-proof). This document records observed GitHub API states, not a formal security certification or human R1. No PR was merged as part of the experiment.

## Setup

- GitHub App: [ascout-c1c-proof-gate](https://github.com/apps/ascout-c1c-proof-gate), App ID `5749241`, installed only on `TheHalfMoon/ascout-c1c-proof`.
- Permissions: Checks, Commit statuses, and Pull requests **read/write**; Metadata **read**. No webhook or hosted service.
- The `ascout-publish` environment allows only `main`; three environment secret **names** were verified: `ASCOUT_APP_ID`, `ASCOUT_APP_CLIENT_ID`, `ASCOUT_APP_PRIVATE_KEY`. Secret values were not retrieved or recorded.
- The unprivileged Collect workflow reads a PR and produces an evidence artifact. The privileged Publish workflow executes pinned Ascout v0.3.0 from the default branch and uses the GitHub App. The release tarball SHA-256 is checked.

## Observations

1. **Live publish before the pin:** Re-running [PR #1](https://github.com/TheHalfMoon/ascout-c1c-proof/pull/1) Collect (head `934311fd2970650fa0b687cef5e5ea5cd5034eff`) triggered the [Publish run 43495937215](https://github.com/TheHalfMoon/ascout-c1c-proof/actions/runs/43495937215), which completed successfully. The `Ascout verification` check run `132129023073` was published by GitHub App **`ascout-c1c-proof-gate`, App ID `5749241`**, not GitHub Actions (App ID `15368`).
2. **Unpinned forged success:** On [adversarial PR #2](https://github.com/TheHalfMoon/ascout-c1c-proof/pull/2), head `164c94e40656472173f4a25176da10df83a8c676`, a PR workflow published its own passing `Ascout verification` check, check run `131720311506`, from **GitHub Actions, App ID `15368`**. Before any ruleset was configured, GitHub returned `mergeStateStatus=CLEAN` and `mergeable=MERGEABLE`.
3. **Pin enforced on `main`:** Created and read back [repository ruleset `27227819`](https://github.com/TheHalfMoon/ascout-c1c-proof/rules/27227819), `enforcement=active`, `ref_name.include=["refs/heads/main"]`, requiring status context **`Ascout verification`** from **`integration_id=5749241`**. The repository's effective branch rules API returned the same pinned context and integration ID.
4. **Forged success no longer satisfies the gate:** With the ruleset active, unchanged adversarial PR #2 returned `mergeStateStatus=BLOCKED` (while Git still considered it `mergeable=MERGEABLE`); its passing same-named check remained attributed solely to GitHub Actions `15368`. No merge was attempted.
5. **Real App check satisfies the gate:** The unchanged legitimate PR #1 returned `mergeStateStatus=CLEAN` with a successful `Ascout verification` check attributed to GitHub App `5749241`. Re-running Collect after pinning triggered [Publish run 43496649056](https://github.com/TheHalfMoon/ascout-c1c-proof/actions/runs/43496649056), which completed successfully. The resulting check summary stated: **"Gate: pinned in a ruleset to this GitHub App"**, and explicitly cautioned that bypass actors and classic branch protection were not checked.
6. **Prior environment-security probes:** [PR #3](https://github.com/TheHalfMoon/ascout-c1c-proof/pull/3) and runs [43374002166](https://github.com/TheHalfMoon/ascout-c1c-proof/actions/runs/43374002166), [43373989496](https://github.com/TheHalfMoon/ascout-c1c-proof/actions/runs/43373989496), and [43374270142](https://github.com/TheHalfMoon/ascout-c1c-proof/actions/runs/43374270142) had already shown that `pull_request`, nondefault-branch `push`, and nondefault-branch `workflow_dispatch` jobs could not enter the exact-branch `ascout-publish` environment. Earlier [43373989472](https://github.com/TheHalfMoon/ascout-c1c-proof/actions/runs/43373989472) demonstrated the separate hazard of a `Protected branches only` environment without protection rules.

## Conclusion and limits

**Proven in this live test:** dedicated-App authentication and publication work with the configured permissions; an active repository ruleset pinned to that App rejects a successfully forged same-named GitHub Actions check, while allowing the genuine App check. This is the central C1c check-source attribution claim.

**Not claimed:** an actual merge API rejection attempt; testing the App-source selection with **Commit statuses permission removed** (the required-with-and-without comparison remains open); a human R1; bypass resistance to repository administrators, classic branch protection, or a compromised App private key; support for merge queues, GitHub Enterprise Server, or all private-repository plans. Customer applications remain customer-owned and individually configured. Ascout production repository App installation is a separate founder decision.

C1c's live **pinned-source/forged-check gate** is qualified by the above evidence. Do not interpret this note as authority to publish another release or to remove the stated limitations.
