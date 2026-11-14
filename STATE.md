Last updated: 2026-11-14 Asia/Riyadh · Branch: main

## Where Ascout stands

Ascout v0.3.1 is released on GitHub: https://github.com/TheHalfMoon/Ascout/releases/tag/v0.3.1 (published 2026-11-14, tag `v0.3.1` at `32e080a`, tarball SHA-256 `67b6273bd8c0dc5296aa7279f5e71cf31140c9aeb8e88ce1d2694a3f540cfea1`, with a verified GitHub build-provenance attestation from run 43547266200). It is not on npm. `v0.3.0` (2026-11-13), `v0.2.0` (2026-11-10) and `v0.1.0` (2026-09-12) are superseded.

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
| E7 containment | T0 stated, T1 blocked. Every `ascout test` report carries a T0 trusted-local record (no filesystem or network isolation), and no profile predicts isolated execution any more (#702). T1 is blocked on FD-4, the private host spec, native proof, and human security review. |
| E8 optional MCP and end-to-end | Done. `ascout mcp` is a stdio MCP server with no socket and no options, offering four read-only tools (review without a model, security, doctor, test plan); E11a added two more, six in v0.3.0. It does not expose `check`, `test`, `init`, or the local model. Every result carries the CLI's JSON report unchanged and an `assurance` field, where a plan is never COMPLETE. Packets: design #703, command functions #707, server and M-1..M-15 plus E2E-1 #708, real Gitleaks over MCP on 3 OSes #709. The founder authorized proceeding on 2026-11-10; no line-level human R1 is recorded. |
| E9 distribution | Released v0.3.1 on GitHub only (2026-11-14, run 43547266200, on the founder's explicit authorization of the exact digest), after v0.3.0 (2026-11-13, run 43338782772) and v0.2.0 (#712, run 42874746620). None is on npm. The tarball is bit-identical on Linux x64, macOS arm64 and Windows x64 with Node 22 and 24, and qualified on each. A build-provenance attestation (SLSA v1) is verified. The founder waived human review of each release; none was performed. |

### Capability ledger (2026-11-11)

| Capability | State |
| --- | --- |
| CLI `init`, `doctor`, `check`, `review`, `test`, `security`, `mcp` | **Shipping** in v0.3.0 (GitHub Release only, not npm). |
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
| C1 App gate | App-pinned check-source forgery rejection proven live in test repo; v0.3.0 ships App mode | Proof PR #2 `BLOCKED` with forged GitHub Actions success, PR #1 `CLEAN` with App success; ruleset 27227819, publish runs 43495937215 and 43496649056; linked C1c live proof note | Alternative no-Commit-statuses permission comparison and human R1 remain untested; no new release authorized | App for this proof repo now registered and installed; production App choice remains founder-owned | Keep pinned test rule and perform optional permissions experiment separately |
| E10 BYOAI | E10a–E10d and E10f released in v0.3.1 | #723, #724; #753 (delegated review: offline export and ingest, never human review); #755 (remote review: off by default, per-run host confirmation, payload Gitleaks scan, operator-paid); #759 (AI review in PRs: one advisory comment, never a check; key environment limited to the default branch) | None | No | — |
| E11 MCP | E11a shipping; E11b deferred | #730 | E11b (code execution through MCP) deferred by the founder on 2026-11-13; read-only MCP tools stay | No | None |
| E7 containment | T0 stated and proven natively; T1-ENV built; **no T1 claim** | #756: capability probes in CI on Linux, macOS and Windows show all four capabilities ALLOWED under T0, and a probe report can't fake a denial. #762: `check --clean-env [--pass-env NAME]` stops tasks inheriting the caller's environment (the probe shows that one DENIED, inheritance only); tasks can still read Ascout's own environment through the OS and credential files, so the tier stays T0. `FD4_T1_ISOLATION_RESEARCH.md` | Per-host T1-FS and T1-NET designs (private spec), native DENIED evidence, independent human security review | Human security review before any T1 claim | T1-FS on Linux |
| FD-8 / historical PRs | Main-rooted; superseded PRs closed | Founder decision 2026-11-13. Closed with explanations, branches kept: #577–#588, #597, #599, #600, #603–#605, #607, #614, #635, #651 | #653 stays a draft until a genuine human R1; AI review never satisfies R1 | Yes: human R1 of #653 | — |
| Salvaged #614 perf | Done | #746: 20 stat-dirty files start 2 `hash-object` processes instead of 40; fail-closed guards exercised | None | No | — |
| CLI reliability | Done | #743 (SHA-256 `--pr-head`, checked in a real SHA-256 repository), #744 (`--help`, `--version`, truthful `init`) | None | No | — |
| Install footprint | Done | #745 (`playwright` dev-only; receipt can't be COMPLETE for a `package.json` change, so merged on the 14 checks and local release qualification) | None | No | — |
| Release qualification | Done | #745: `publish-cli.js` runs from a bare extracted tarball with no `node_modules`; Windows drive-letter defect found by review and fixed before merge | None | No | — |
| Docs vs behaviour | Done | #742 (v0.3.0 status everywhere, `pr-evidence`/`pr-publish` section, POSIX-only config check) | None | No | — |
| Dependencies | Production: 0 advisories; Dependabot alerts on | #752 overrides `minimatch` under Jest's `glob` (alert #3 fixed). The development-only `deepmerge` alert (#1) has no fixed version (4.3.1 is the latest) and is documented | No upstream `deepmerge` fix | No | Revisit when one exists |
| `ASCOUT_PR_TRUSTED_ACTORS` | Set to `TheHalfMoon` only (2026-11-13) | Repository variable | None | No | — |
| Package scope | Audited; nothing removed | `PACKAGE_SCOPE_AUDIT_2026-11-14.md`: 98 modules no entry point reaches, all used by tests, one a documented deep import; none proven unused | Shipping only reachable modules would break deep imports | Yes, if that trade is wanted | — |
| Release | **v0.3.1 published** (2026-11-14) | https://github.com/TheHalfMoon/Ascout/releases/tag/v0.3.1: tag at `32e080a`; SHA-256 `67b6273bd8c0dc5296aa7279f5e71cf31140c9aeb8e88ce1d2694a3f540cfea1`; qualified by run [43545268017](https://github.com/TheHalfMoon/Ascout/actions/runs/43545268017), attested by run [43547266200](https://github.com/TheHalfMoon/Ascout/actions/runs/43547266200) (same digest on all six lanes), public download checked and the attestation verified | Further releases | Yes, each one | — |

### Open decisions for the founder

- **v0.3.0 is published (2026-11-13), on the founder's explicit authorization.**
  - The release-candidate run [43338782772](https://github.com/TheHalfMoon/Ascout/actions/runs/43338782772), on `main` at `d85b640` with `attest: true`, built and qualified the tarball on Linux x64, macOS arm64 and Windows x64 with Node 22 and 24. The digest was identical on all six lanes, and equal to the earlier dry run at `81d5c3d`; only docs changed between the two.
  - The `release-attest` deployment was approved through the founder's account on that instruction, after the digest was checked. The attestation verifies against the published download.
  - The release notes disclose one known limitation: in a Jest repository, a change only outside the test graph makes `check` exit 2. The fix is on `main` (#738), not in a release.
  - No human reviewed the release; the release notes say so.

- FD-4 was decided on 2026-11-13: research and implementation, not certification. Any T1 claim needs native evidence and an independent human security review.
- FD-8 was decided on 2026-11-13: main-rooted; #651 and the superseded PRs are closed. #653 still needs a genuine human R1.
- Repository settings: private vulnerability reporting and a `main` ruleset (PRs, linear history, the 13 required checks, no force push or deletion) are on as of 2026-11-10. Dependabot alerts are on as of 2026-11-13.
- Human R1 of the reconciled adoption packet (#653), and optionally of the E8 packets (#703, #707–#709), which merged on the founder's go-ahead without a line-level R1.
- MCP (E11b) is deferred (2026-11-13); running repository code stays CLI-only.
- C1 GitHub App gate: the dedicated test App was registered and installed, three `ascout-publish` environment secrets were confirmed by name, and the pinned-source forgery rejection was proven on 2026-11-13. The optional comparison without Commit statuses permission and the decision to register an App for Ascout itself remain open. Evidence: `specs/017-unified-assurance/C1C_LIVE_APP_GATE_PROOF_2026-11-13.md`.
- Paid offering (`docs/PAID_OFFERING_DESIGN.md`): the principles, what stays free, the pricing model, the licensing boundary, names, and maintenance ownership. Decision 3 is made: C1 is free core. A payment processor is a separate, later decision.
- BYOAI: E10c, E10d and E10f were approved on 2026-11-13 with conditions (off by default, operator-paid, advisory only). Still open: whether to rename `authorized_by_founder` to `operator_authorized`.
- GitHub integration: `ASCOUT_PR_TRUSTED_ACTORS` is set to `TheHalfMoon`. Still open: whether to add a team policy for this repository; without one, every check is required, and review and security report incomplete (exit 4) here.
- Package scope: whether to ship only the modules the entry points reach (see the audit). That would break any undocumented deep import.
- **v0.3.1 is published (2026-11-14), on the founder's explicit authorization of that exact candidate.** The attested run [43547266200](https://github.com/TheHalfMoon/Ascout/actions/runs/43547266200), on `main` at `32e080a`, reproduced the qualified digest `67b6273bd8c0dc5296aa7279f5e71cf31140c9aeb8e88ce1d2694a3f540cfea1` on all six lanes before the `release-attest` deployment was approved. The attestation verifies against the published download. No npm publication. No human reviewed the release, and the release notes say so.

`ROADMAP.md` is the closed record of the REA engineering maintenance run (spec 018) and is kept as history.
