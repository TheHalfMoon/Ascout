Last updated: 2026-11-27 Asia/Riyadh · Branch: main

## Master Execution Program (2026-11-27, Amendment A10)

On 2026-11-27, the founder authorized autonomous implementation across all 13 Ascout capability domains under Amendment A10 (`docs/governance/A10_MASTER_EXECUTION_DIRECTIVE_2026-11-27.md`, Constitution v1.6.0). Obsolete M1/M2/UA-P06 implementation freezes and historical frontier-exhaustion records (#296, #628, #634) are superseded by this directive while preserving all security, evidence, fail-closed, A07, exact-head CI, and A09 independent-review gates.

### Live Execution Registry

| Unit | Scope | Status |
| --- | --- | --- |
| PR #791 | macOS `sandbox-exec` task sandbox (unwired research) | **Merged** (`fed9134`, 13/13 CI, 5 A09 reviews) |
| PR #792 | Windows AppContainer task sandbox (unwired research) | **In progress** (fixing loopback `ECONNRESET` in test server) |
| PR 0 | Amendment A10 & governance simplification | **In progress** (this PR) |
| PR 1 | Core hardening & Git #591 race elimination | **Queued** |
| PR 2 | Unified `CheckTaskSandboxV1` lifecycle + Linux/macOS wiring + `test --sandbox` | **Queued** |
| PR 3 | Windows AppContainer pipe/realpath & A09 wiring | **Queued** |
| PR 4 | Ascout Evidence (CAS `.ascout/objects/sha256/`, integrity verify, diff, export) | **Queued** |
| PR 5 | Ascout Review (deterministic review engine, scoped ranges, remove donor leak) | **Queued** |
| PR 6 | Ascout Security (deterministic deep security audit + clean SARIF, remove donor leak) | **Queued** |
| PR 7 | Ascout Test (profiles, budgets, diff-scoped mutation, property/fuzz, contract) | **Queued** |
| PR 8a/8b | Ascout Browser (real Chromium journeys/assertions) & Ascout Runtime (process/HTTP) | **Queued** |
| PR 9 | Ascout Verify (agent claim verification) & Ascout Release (readiness verdict) | **Queued** |
| PR 10 | Ascout Connect (`serve` authenticated API + read-only MCP) & Ascout Studio UI | **Queued** |
| PR 11 | Ascout Benchmark (reproducible offline evaluation) & final qualification | **Queued** |

## Where Ascout stands (v0.3.2 baseline)

Ascout v0.3.2 is released on GitHub: https://github.com/TheHalfMoon/Ascout/releases/tag/v0.3.2 (published 2026-11-16, tag `v0.3.2` at `c6a75e7`, SHA-256 `f73676ea1bc460c062a025291f416056b2e6f2e09139cfdf922fa3f636620af6`). It is not on npm. `v0.3.1`, `v0.3.0`, `v0.2.0` and `v0.1.0` are superseded.

### Adoption plan (execution-first V0–V9)

| Packet | State |
| --- | --- |
| E1 Git command security | Done. Hostile repository Git configuration can't execute (`tests/git-config-hostile.test.ts`). |
| E2 truthful exits (A07) | Done. Exits 0 complete, 1 findings, 2 error, 3 source drift, 4 incomplete. |
| E3 notices | Done. The Gitleaks notice merged in #697. |
| E4 bounded execution broker | Done (`runQualifiedEngineV1`): pinned digests, empty environment, caps, source binding, owned process-tree teardown. |
| E5 Gitleaks | Done. `ascout security` runs Gitleaks 8.30.1 on Linux x64, macOS arm64, and Windows x64, qualified on real binaries in CI. |
| E6 test | Done. `ascout test` runs `check`; deep and release profiles report the engines that don't run yet. |
| E6 review | Advisory, opt-in. The founder authorized a local model on 2026-11-09. `ascout review --local-model` sends the changed lines only to Ollama on loopback (`qwen2.5-coder:7b` locally), never to a hosted service (#699, #700). Output is advisory and never human R1. Without the flag, or without the founder's config, review stays not run (exit 4). CI has no model and tests against a fake server. |
| E7 containment | **Linux: `check --sandbox` is T1, internally qualified under A09** (#789, merged `b1d5cc4`; five independent AI reviews, the last on the merged tree, and native Linux CI; not externally certified or human-audited). Runs without `--sandbox`, and macOS and Windows, stay T0; their task sandboxes are in progress (#791, #792). Every `ascout test` report carries a T0 trusted-local record (no filesystem or network isolation), and no profile predicts isolated execution (#702). FD-4 was decided on 2026-11-13 (research and implementation, not certification): capability probes (#756), `check --clean-env` (#762), a Linux bubblewrap filesystem sandbox research runner (#764), its network-isolation option (#766), a macOS sandbox-exec research runner (#768), and a Windows AppContainer research runner driven from PowerShell, with no native binary (#770). A T1 claim needs native evidence and an independent review under A09 of the final commit. |
| E8 optional MCP and end-to-end | Done. `ascout mcp` is a stdio MCP server with no socket and no options, offering four read-only tools (review without a model, security, doctor, test plan); E11a added two more, six in v0.3.0. It does not expose `check`, `test`, `init`, or the local model. Every result carries the CLI's JSON report unchanged and an `assurance` field, where a plan is never COMPLETE. Packets: design #703, command functions #707, server and M-1..M-15 plus E2E-1 #708, real Gitleaks over MCP on 3 OSes #709. The founder authorized proceeding on 2026-11-10; no line-level human R1 is recorded. |
| E9 distribution | Released v0.3.1 on GitHub only (2026-11-14, run 43547266200, on the founder's explicit authorization of the exact digest), after v0.3.0 (2026-11-13, run 43338782772) and v0.2.0 (#712, run 42874746620). None is on npm. The tarball is bit-identical on Linux x64, macOS arm64 and Windows x64 with Node 22 and 24, and qualified on each. A build-provenance attestation (SLSA v1) is verified. The founder waived human review of each release; none was performed. |

### Capability ledger (2026-11-11)

| Capability | State |
| --- | --- |
| CLI `init`, `doctor`, `check`, `review`, `test`, `security`, `mcp` | **Shipping** since v0.3.0; current release v0.3.1 (GitHub Release only, not npm). |
| GitHub PR integration: `ascout pr-evidence`, `ascout pr-publish`, collect and publish workflows (#716–#718) | **Shipping** in v0.3.0. It runs on this repository's own PRs. It is customer-run on the customer's runners, and Ascout operates no service. PR code runs only in the read-only collect job, and the privileged publish job runs default-branch code only. |
| Per-repository team policy, `.github/ascout-policy.json` (#719) | **Shipping** in v0.3.0. It is read only from the default branch, and an invalid policy fails closed. A finding, error or source change in any check always fails. |
| Ascout identity guard on every CLI and MCP output, including no internal `UA-P` labels (#715, #720) | **Shipping** in v0.3.0. |
| Tamper-proof check name through a dedicated GitHub App | **C1 is in the free Apache-2.0 core; v0.3.0 ships App mode. Live dedicated-App authentication and App-pinned check-source forgery rejection were proven in a test repository (2026-11-13).**<br>- **C1a (#728):** App mode in `pr-publish` and the dependency-free entry point `dist/github/publish-cli.js`.<br>- **C1b:** the hardened workflow template, lint, and GitHub integration guide.<br>- **C1c:** genuine App check passed on proof PR #1; a same-named forged GitHub Actions check on PR #2 changed from `CLEAN` to `BLOCKED` after ruleset 27227819 pinned the expected source to App ID 5749241; re-publish run 43496649056 confirmed the pin. The alternative with Commit statuses permission removed was not tested. See `specs/017-unified-assurance/C1C_LIVE_APP_GATE_PROOF_2026-11-13.md`. No human R1. |
| Bring-your-own-AI provider interface (customer-supplied model; Ascout pays for no inference and sends no code without explicit opt-in) | **Shipping in v0.3.1** (E10a–E10d and E10f). Design: `specs/017-unified-assurance/E10_BYOAI_PROVIDER_DESIGN.md`.<br>- **E10a (#723), done:** the provider interface, plus fixes for gaps found in E6. The config location comes from the OS account, proxies are ignored, untracked and secret-named files are never sent, and the model's reply is redacted.<br>- **E10b (#724), done:** local servers that speak the OpenAI-compatible API, loopback only.<br>- **E10c (#755), done:** remote providers, off by default; per-run host confirmation, a payload Gitleaks scan, a pinned public address, operator-paid.<br>- **E10d (#753), done:** delegated review, offline export and ingest; never human review.<br>- **E10f (#759), done:** AI review in PRs, one advisory comment and never a check. |
| Wider MCP tools | **Partly shipping since v0.3.0** (E11a). Design: `specs/017-unified-assurance/E11_SAFE_MCP_EXPANSION_DESIGN.md`.<br>- **E11a, done:** two read-only tools, `ascout_policy` and `ascout_last_check`. Both have assurance `NONE` and run no repository code.<br>- **E11b, not built:** a run tool that would ask for confirmation through MCP elicitation, which is host-mediated consent rather than proof that a person approved. Deferred by the founder on 2026-11-13. |
| Paid Teams, Business and Enterprise offerings | **Proposed, not built.** There is no billing, no payment processor, no contracts and no commercial terms, and none may start without separate founder approval. The core stays free under Apache-2.0, with no account, telemetry or cloud requirement.<br>Competitor research (CodeRabbit, cubic, Greptile) as input to that design: `docs/COMPETITOR_RESEARCH_2026-11-11.md`.<br>Design proposal (nothing priced, approved or built): `docs/PAID_OFFERING_DESIGN.md`. |
| T1 isolated execution | **Blocked** on FD-4 (see E7). |

### Security review (2026-11-08)

A whole-project security review found no critical issues. All high and medium findings and most low findings are fixed (PRs #667–#696); one is documented as a known limit (README, "Limits of the source fingerprint"). Two items remain: statement-level coverage, which needs a receipt version change, and repository settings (a `main` ruleset and Dependabot alerts), which are the owner's to change.

### Community-first program (directive of 2026-11-10): status 2026-11-12

Everything in the directive that needed no founder decision is merged into `main` after exact-head CI. It shipped in v0.3.0 (2026-11-13).

- **Done:**
  - #714 merged;
  - the branding audit and the identity guard (#715, #720);
  - the customer-run GitHub PR integration (#716–#718);
  - team policy (#719);
  - BYOAI design (#722), E10a local-review hardening (#723), and E10b OpenAI-compatible local providers (#724);
  - competitor research (#725);
  - the paid-offering design proposal (#726);
  - the C1 GitHub App gate: design (#727), App mode (#728), and the hardened template, lint, and guide (#729);
  - safe MCP expansion: design and two read-only tools (#730).
- **How each one was checked:**
  - positive and negative tests, and deliberate breaks;
  - an independent AI review, which is advisory and never human R1;
  - 14/14 exact-head CI;
  - for code, Ascout's own PR check reporting every changed line and branch exercised.
- **Waiting on the founder:** see below. v0.3.1 was published on GitHub on the founder's explicit authorization of 2026-11-14. No npm publication, billing, or hosted service was created.

### Completion ledger (2026-11-14)

Evidence is exact-head CI (14 required checks on Linux, macOS, and Windows with Node 22 and 24) plus Ascout's own changed-code receipt, which must be COMPLETE with every changed line and branch exercised, for every code PR, unless noted. No human read any of these heads; AI review is not human R1.

| Item | State | Evidence | Remaining blocker | Founder needed? | Next action |
| --- | --- | --- | --- | --- | --- |
| C1 App gate | App-pinned check-source forgery rejection proven live in test repo; v0.3.0 ships App mode | Proof PR #2 `BLOCKED` with forged GitHub Actions success, PR #1 `CLEAN` with App success; ruleset 27227819, publish runs 43495937215 and 43496649056; linked C1c live proof note | An independent review of the C1 design under A09 has not been done. The optional no-Commit-statuses comparison was not run (delegated decision, 2026-11-16) | App for this proof repo registered and installed; no App for Ascout itself for now (delegated decision, 2026-11-16; founder may reverse) | Keep the pinned test rule |
| E10 BYOAI | E10a–E10d and E10f released in v0.3.1 | #723, #724; #753 (delegated review: offline export and ingest, never human review); #755 (remote review: off by default, per-run host confirmation, payload Gitleaks scan, operator-paid); #759 (AI review in PRs: one advisory comment, never a check; key environment limited to the default branch) | None | No | — |
| E11 MCP | E11a shipping; E11b deferred | #730 | E11b (code execution through MCP) deferred by the founder on 2026-11-13; read-only MCP tools stay | No | None |
| E7 containment | T0 stated and proven natively; T1-ENV built; T1-FS and T1-NET research runners built and natively evidenced on Linux, macOS and Windows; **Linux `check --sandbox` internally qualified under A09 (#789)**; macOS and Windows task sandboxes in progress (#791, #792) | #756: capability probes on all three OSes show all four capabilities ALLOWED under T0, and a report can't fake a denial. #762: `check --clean-env` (inheritance only). #764 and #766 (Linux bubblewrap), #768 (macOS sandbox-exec), #770 (Windows AppContainer via PowerShell): with network isolation and an allowlisted environment, CI requires all four native probes DENIED on each OS. Known gaps per OS (Linux path sockets in bound paths; macOS readable system files; signals to other processes are denied since 2026-11-16; Windows app-container-readable system objects) are documented. Only Linux `check --sandbox` uses a runner (#789); macOS and Windows are not wired yet. Technique-level probes and evidence are in private host specs. `FD4_T1_ISOLATION_RESEARCH.md` | Completing T1 engineering and an independent review under A09 (2026-11-16) on the final commit; wiring the macOS and Windows runners into `check` | No: A09 independent review (2026-11-16) | Complete T1 engineering, then an A09 review of the final commit |
| FD-8 / historical PRs | Main-rooted; superseded PRs closed | Founder decision 2026-11-13. Closed with explanations, branches kept: #577–#588, #597, #599, #600, #603–#605, #607, #614, #635, #651 | #653 closed as superseded on 2026-11-16 (founder decision, after a founder-delegated ChatGPT review; not human R1); branch `plan/ascout-v2-main-ready-20261106` kept | No | — |
| Salvaged #614 perf | Done | #746: 20 stat-dirty files start 2 `hash-object` processes instead of 40; fail-closed guards exercised | None | No | — |
| CLI reliability | Done | #743 (SHA-256 `--pr-head`, checked in a real SHA-256 repository), #744 (`--help`, `--version`, truthful `init`) | None | No | — |
| Install footprint | Done | #745 (`playwright` dev-only; receipt can't be COMPLETE for a `package.json` change, so merged on the 14 checks and local release qualification) | None | No | — |
| Release qualification | Done | #745: `publish-cli.js` runs from a bare extracted tarball with no `node_modules`; Windows drive-letter defect found by review and fixed before merge | None | No | — |
| Docs vs behaviour | Done | #742 (v0.3.0 status everywhere, `pr-evidence`/`pr-publish` section, POSIX-only config check) | None | No | — |
| Dependencies | Production: 0 advisories; Dependabot alerts on | #752 overrides `minimatch` under Jest's `glob` (alert #3 fixed). The development-only `deepmerge` alert (#1) has no fixed version (4.3.1 is the latest) and is documented | No upstream `deepmerge` fix | No | Revisit when one exists |
| `ASCOUT_PR_TRUSTED_ACTORS` | Set to `TheHalfMoon` only (2026-11-13) | Repository variable | None | No | — |
| Package scope | Audited; nothing removed | `PACKAGE_SCOPE_AUDIT_2026-11-14.md`: 98 modules no entry point reaches, all used by tests, one a documented deep import; none proven unused | Shipping only reachable modules would break deep imports | Yes, if that trade is wanted | — |
| Release | **v0.3.1 published** (2026-11-14) | https://github.com/TheHalfMoon/Ascout/releases/tag/v0.3.1: tag at `32e080a`; SHA-256 `67b6273bd8c0dc5296aa7279f5e71cf31140c9aeb8e88ce1d2694a3f540cfea1`; qualified by run [43545268017](https://github.com/TheHalfMoon/Ascout/actions/runs/43545268017), attested by run [43547266200](https://github.com/TheHalfMoon/Ascout/actions/runs/43547266200) (same digest on all six lanes), public download checked and the attestation verified | Further releases | Yes, each one | — |

### Engineering after v0.3.1 (2026-11-16)

These changes shipped in **v0.3.2** (2026-11-16). Evidence is the same as above: exact-head CI on all 14 required checks, and, for code, Ascout's own receipt (COMPLETE, every changed line and branch exercised). Each PR also had an independent AI review, which is advisory and never human R1. No human read any of these heads.

| PR | Change | Merge commit |
| --- | --- | --- |
| #772 | State: records the delegated decisions of 2026-11-16 as the agent's reversible choices | `5aac45d` |
| #773 | Human R1 reviewer package for #653 (questions, criteria, staleness sources, blank sign-off) | `5d629f1` |
| #774 | The browser adapter imports from an installed package without Playwright, and says the browser engine is missing only when a browser is driven | `7e8da26` |
| #776 | README and GitHub integration guide: v0.3.1 current, full CLI usage, C1c proof stated exactly | `d2bbc0d` |
| #779 | Design note: statement-level coverage and the receipt version (design only; needs an A07 amendment) | `dc20bb3` |
| #780 | Tests: `check` under Git attribute and config changes made during the run (#591); positive control; #591 stays open | `1c58606` |
| #775 | PR publish workflow and templates skip a cancelled collect run instead of failing on a missing artifact | `035541c` |
| #777 | `--clean-env [--pass-env NAME]...` on `test` and `pr-evidence`, as on `check` (inheritance only; tier stays T0) | `c61a7ee` |
| #778 | `ascout mcp` supports protocol 2025-11-25; tool arguments are a readable tool error there, a protocol error in earlier versions | `a1c75e5` |

**v0.3.2 is published (2026-11-16), on the founder's explicit authorization of this exact candidate.** https://github.com/TheHalfMoon/Ascout/releases/tag/v0.3.2: tag at `c6a75e7`; SHA-256 `f73676ea1bc460c062a025291f416056b2e6f2e09139cfdf922fa3f636620af6`. Qualified by run [43816250367](https://github.com/TheHalfMoon/Ascout/actions/runs/43816250367) (attest off, at `e18fa95`). Attested by run [43819307720](https://github.com/TheHalfMoon/Ascout/actions/runs/43819307720) at `c6a75e7` (docs-only change; the same digest on all six lanes) before `release-attest` was approved. The public download and its attestation were verified. Not on npm. No human reviewed the release, and the release notes say so.

The draft Amendment A08 for statement-level evidence (#784, `c6a75e7`) is recorded as a proposal. It is not ratified.

**Review policy changed (2026-11-16).** Amendment A09 (constitution 1.5.0, adopted under the founder's written decision of 2026-11-16; record: `docs/governance/A09_INDEPENDENT_REVIEW_POLICY_RATIFICATION_2026-11-16.md`) removes mandatory human R1 and human security sign-off. An independent review under A09 now meets those gates. Such a review inspects the exact commit, its boundaries, tests and evidence, and is labeled truthfully; AI reviews are never presented as human. #653 was closed as superseded the same day.

**Still reserved to the founder:**

- ratifying A08 before statement-level coverage can change receipts (#779 recommends Option A);
- any further release;
- admitting untrusted repositories (Principle IV), even after a T1 tier qualifies.

**Can proceed without the founder:** smaller CI and reliability fixes, docs accuracy, and native evidence for the research runners, all without enabling them in `check`. Issue #591 stays open: #780 characterizes three cases, but the check-then-use window is unchanged.

### Open decisions for the founder

- **Delegated decisions (2026-11-16).** The founder said, "choose the best for me, do not wait for my decision". Under that delegation, the engineering agent (not the founder) chose the most conservative, reversible option for each open item. The founder may reverse any of them:
  - **Package scope:** keep shipping every module. This follows the founder's directive of 2026-11-13 ("Package scope: preserve compatibility"), and no module is proven unused (`PACKAGE_SCOPE_AUDIT_2026-11-14.md`). Revisit only with a deprecation note in a release.
  - **C1c comparison** (without the Commit statuses permission): not run. It is optional. The pinned-App forgery rejection is already proven live. Running it would mean changing the founder's App settings for no added protection.
  - **A GitHub App for Ascout itself:** not now. It is an account and identity step for the founder, and the test App already proves C1.
  - **Team policy for this repository:** none. Every check stays required, so Ascout's own PR check stays truthful (review and security report incomplete here, exit 4) instead of being relaxed to go green.
  - **Renaming `authorized_by_founder`:** not in version 1. The local-review config keeps it so existing configs keep working; the remote-review config (version 2) already uses `operator_authorized`.
  - **#359 (brand and UI freeze, a draft):** left open. Its own text parks it until substantial implementation is complete, and nothing supersedes it.
  - **Windows T1 mechanism:** PowerShell `Add-Type`, so no native binary ships (#770).
  - **Paid offering:** no changes. No payment processor, pricing, or licensing step is taken without the founder.
  - **Superseded the same day by A09:** the founder removed mandatory human R1 and human security review. #653 closed as superseded; T1 work proceeds under A09 independent review.

- **v0.3.0 is published (2026-11-13), on the founder's explicit authorization.**
  - The release-candidate run [43338782772](https://github.com/TheHalfMoon/Ascout/actions/runs/43338782772), on `main` at `d85b640` with `attest: true`, built and qualified the tarball on Linux x64, macOS arm64 and Windows x64 with Node 22 and 24. The digest was identical on all six lanes, and equal to the earlier dry run at `81d5c3d`; only docs changed between the two.
  - The `release-attest` deployment was approved through the founder's account on that instruction, after the digest was checked. The attestation verifies against the published download.
  - The release notes disclose one known limitation: in a Jest repository, a change only outside the test graph makes `check` exit 2. The fix (#738) shipped in v0.3.1.
  - No human reviewed the release; the release notes say so.

- FD-4 was decided on 2026-11-13: research and implementation, not certification. Research runners now exist for Linux, macOS and Windows, with native CI evidence (#764, #766, #768, #770). Any T1 claim needs native evidence and an independent review under A09 (2026-11-16) on the final commit. Linux `check --sandbox` met that bar (#789).
- FD-8 was decided on 2026-11-13: main-rooted; #651 and the superseded PRs are closed. #653 was closed as superseded on 2026-11-16.
- Repository settings: private vulnerability reporting and a `main` ruleset (PRs, linear history, the 13 required checks, no force push or deletion) are on as of 2026-11-10. Dependabot alerts are on as of 2026-11-13.
- MCP (E11b) is deferred (2026-11-13); running repository code stays CLI-only.
- C1 GitHub App gate: the dedicated test App was registered and installed, three `ascout-publish` environment secrets were confirmed by name, and the pinned-source forgery rejection was proven on 2026-11-13. The optional permission comparison and an App for Ascout itself were decided against on 2026-11-16 (see the delegated decisions). Evidence: `specs/017-unified-assurance/C1C_LIVE_APP_GATE_PROOF_2026-11-13.md`.
- Paid offering (`docs/PAID_OFFERING_DESIGN.md`): the principles, what stays free, the pricing model, the licensing boundary, names, and maintenance ownership. Decision 3 is made: C1 is free core. A payment processor is a separate, later decision.
- BYOAI: E10c, E10d and E10f were approved on 2026-11-13 with conditions (off by default, operator-paid, advisory only), and are shipped in v0.3.1.
- GitHub integration: `ASCOUT_PR_TRUSTED_ACTORS` is set to `TheHalfMoon`. No team policy (delegated decision, 2026-11-16): every check is required, and review and security report incomplete (exit 4) here.
- Package scope: every module keeps shipping (delegated decision, 2026-11-16).
- **v0.3.1 is published (2026-11-14), on the founder's explicit authorization of that exact candidate.** The attested run [43547266200](https://github.com/TheHalfMoon/Ascout/actions/runs/43547266200), on `main` at `32e080a`, reproduced the qualified digest `67b6273bd8c0dc5296aa7279f5e71cf31140c9aeb8e88ce1d2694a3f540cfea1` on all six lanes before the `release-attest` deployment was approved. The attestation verifies against the published download. No npm publication. No human reviewed the release, and the release notes say so.

`ROADMAP.md` is the closed record of the REA engineering maintenance run (spec 018) and is kept as history.
