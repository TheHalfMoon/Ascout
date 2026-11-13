Last updated: 2026-11-13 Asia/Riyadh · Branch: main

## Where Ascout stands

Ascout v0.3.0 is released on GitHub: https://github.com/TheHalfMoon/Ascout/releases/tag/v0.3.0 (published 2026-11-13, tag `v0.3.0` at `d85b640`, tarball SHA-256 `571f33acebc601d4ddf54cc139de789532f0fab88f57dbfeef053cc3e311708d`, with a verified GitHub build-provenance attestation from run 43338782772). It is not on npm. `v0.2.0` (2026-11-10) and `v0.1.0` (2026-09-12) are superseded.

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
| E8 optional MCP and end-to-end | Done. `ascout mcp` is a stdio MCP server with no socket and no options, offering four read-only tools (review without a model, security, doctor, test plan). It does not expose `check`, `test`, `init`, or the local model. Every result carries the CLI's JSON report unchanged and an `assurance` field, where a plan is never COMPLETE. Packets: design #703, command functions #707, server and M-1..M-15 plus E2E-1 #708, real Gitleaks over MCP on 3 OSes #709. The founder authorized proceeding on 2026-11-10; no line-level human R1 is recorded. |
| E9 distribution | Released v0.3.0 on GitHub only (2026-11-13, run 43338782772, on the founder's explicit authorization), after v0.2.0 (#712, run 42874746620). Neither is on npm. The tarball is bit-identical on Linux x64, macOS arm64 and Windows x64 with Node 22 and 24, and qualified on each. A build-provenance attestation (SLSA v1) is verified. The founder waived both human reviews; neither was performed. |

### Capability ledger (2026-11-11)

| Capability | State |
| --- | --- |
| CLI `init`, `doctor`, `check`, `review`, `test`, `security`, `mcp` | **Shipping** in v0.3.0 (GitHub Release only, not npm). |
| GitHub PR integration: `ascout pr-evidence`, `ascout pr-publish`, collect and publish workflows (#716–#718) | **Shipping** in v0.3.0. It runs on this repository's own PRs. It is customer-run on the customer's runners, and Ascout operates no service. PR code runs only in the read-only collect job, and the privileged publish job runs default-branch code only. |
| Per-repository team policy, `.github/ascout-policy.json` (#719) | **Shipping** in v0.3.0. It is read only from the default branch, and an invalid policy fails closed. A finding, error or source change in any check always fails. |
| Ascout identity guard on every CLI and MCP output, including no internal `UA-P` labels (#715, #720) | **Shipping** in v0.3.0. |
| Tamper-proof check name through a dedicated GitHub App | **C1, free core (founder decision 2026-11-12). Shipping in v0.3.0, not proven live.**<br>- **C1a (#728):** App mode in `pr-publish` and the dependency-free entry point `dist/github/publish-cli.js`.<br>- **C1b:** the hardened App-mode workflow template (`docs/examples/ascout-pr-publish-app.yml`), its lint, and the setup guide in `docs/GITHUB_INTEGRATION.md`.<br>- **C1c, not done:** live proof on a test repository whose App the founder registers. v0.3.0 contains `publish-cli.js`, so the template can now be pinned to that release. |
| Bring-your-own-AI provider interface (customer-supplied model; Ascout pays for no inference and sends no code without explicit opt-in) | **Partly shipping in v0.3.0** (E10a and E10b). Design: `specs/017-unified-assurance/E10_BYOAI_PROVIDER_DESIGN.md`.<br>- **E10a (#723), done:** the provider interface, plus fixes for gaps found in E6. The config location comes from the OS account, proxies are ignored, untracked and secret-named files are never sent, and the model's reply is redacted.<br>- **E10b (#724), done:** local servers that speak the OpenAI-compatible API, loopback only.<br>- **Not built:** E10c (remote providers), E10d (delegated review) and E10f (AI review in PRs). Each waits for a founder decision. |
| Wider MCP tools | **Partly shipping in v0.3.0** (E11a). Design: `specs/017-unified-assurance/E11_SAFE_MCP_EXPANSION_DESIGN.md`.<br>- **E11a, done:** two read-only tools, `ascout_policy` and `ascout_last_check`. Both have assurance `NONE` and run no repository code.<br>- **E11b, not built:** a run tool that would ask for confirmation through MCP elicitation, which is host-mediated consent rather than proof that a person approved. It waits for a founder decision and FD-4. |
| Paid Teams, Business and Enterprise offerings | **Proposed, not built.** There is no billing, no payment processor, no contracts and no commercial terms, and none may start without separate founder approval. The core stays free under Apache-2.0, with no account, telemetry or cloud requirement.<br>Competitor research (CodeRabbit, cubic, Greptile) as input to that design: `docs/COMPETITOR_RESEARCH_2026-11-11.md`.<br>Design proposal (nothing priced, approved or built): `docs/PAID_OFFERING_DESIGN.md`. |
| T1 isolated execution | **Blocked** on FD-4 (see E7). |

### Security review (2026-11-08)

A whole-project security review found no critical issues. All high and medium findings and most low findings are fixed (PRs #667–#696); one is documented as a known limit (README, "Limits of the source fingerprint"). Two items remain: statement-level coverage, which needs a receipt version change, and repository settings (a `main` ruleset and Dependabot alerts), which are the owner's to change.

### Community-first program (directive of 2026-11-10): status 2026-11-12

Everything in the directive that needed no founder decision is merged into `main` after exact-head CI. None of it is in a release yet.

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
- **Waiting on the founder:** see below. v0.3.0 was published on GitHub on the founder's explicit authorization of 2026-11-13. No npm publication, billing, or hosted service was created.

### Open decisions for the founder

- **v0.3.0 is published (2026-11-13), on the founder's explicit authorization.**
  - The release-candidate run [43338782772](https://github.com/TheHalfMoon/Ascout/actions/runs/43338782772), on `main` at `d85b640` with `attest: true`, built and qualified the tarball on Linux x64, macOS arm64 and Windows x64 with Node 22 and 24. The digest was identical on all six lanes, and equal to the earlier dry run at `81d5c3d`; only docs changed between the two.
  - The `release-attest` deployment was approved through the founder's account on that instruction, after the digest was checked. The attestation verifies against the published download.
  - The release notes disclose one known limitation: in a Jest repository, a change only outside the test graph makes `check` exit 2. The fix is not in v0.3.0.
  - No human reviewed the release; the release notes say so.

- FD-4 for E7 containment.
- FD-8 for the historical plan PR #651, and ratification of #653.
- Repository settings: private vulnerability reporting and a `main` ruleset (PRs, linear history, the 13 required checks, no force push or deletion) are on as of 2026-11-10. Dependabot alerts are still off.
- Human R1 of the reconciled adoption packet (#653), and optionally of the E8 packets (#703, #707–#709), which merged on the founder's go-ahead without a line-level R1.
- Disposition of the older open planning PRs (#577–#635).
- MCP (E11b): whether host-mediated consent through MCP elicitation counts as "a person, per invocation" for running repository code under FD-4. If not, running code stays CLI-only until T1.
- C1 GitHub App gate: to finish C1c, register a test GitHub App and repository for the live proof, following the guide in `docs/GITHUB_INTEGRATION.md`. App mode must not be described as available until then.
- Paid offering (`docs/PAID_OFFERING_DESIGN.md`): the principles, what stays free, the pricing model, the licensing boundary, names, and maintenance ownership. Decision 3 is made: C1 is free core. A payment processor is a separate, later decision.
- BYOAI (E10 design): whether to allow remote egress (E10c), delegated review (E10d), and AI review in PRs (E10f), and whether to rename `authorized_by_founder` to `operator_authorized`.
- GitHub integration: whether to set the repository variable `ASCOUT_PR_TRUSTED_ACTORS`. It is empty, so no PR evidence can turn the Ascout check green. A related choice is whether to add a team policy for this repository; without one, every check is required, and review and security report incomplete (exit 4) here.

`ROADMAP.md` is the closed record of the REA engineering maintenance run (spec 018) and is kept as history.
