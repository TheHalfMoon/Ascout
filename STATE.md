Last updated: 2026-11-11 Asia/Riyadh · Branch: main

## Where Ascout stands

Ascout v0.2.0 is released on GitHub: https://github.com/TheHalfMoon/Ascout/releases/tag/v0.2.0 (published 2026-11-10, tag `v0.2.0` at `0741873`, tarball SHA-256 `43bd9c2e52389500ae5bc38b3595ff47e2a916794bef2e383dabfb2632b2bc63`, with a verified GitHub build-provenance attestation). It is not on npm. `v0.1.0` (2026-09-12) is superseded.

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
| E9 distribution | Released v0.2.0 on GitHub only (#712, run 42874746620). The tarball is bit-identical on Linux x64, macOS arm64 and Windows x64 with Node 22 and 24, and qualified on each. A build-provenance attestation (SLSA v1) is verified. The founder waived both human reviews; neither was performed. |

### Capability ledger (2026-11-11)

| Capability | State |
| --- | --- |
| CLI `init`, `doctor`, `check`, `review`, `test`, `security`, `mcp` | **Shipping** in v0.2.0 (GitHub Release only, not npm). |
| GitHub PR integration: `ascout pr-evidence`, `ascout pr-publish`, collect and publish workflows (#716–#718) | **On `main`, not in a release.** It runs on this repository's own PRs. It is customer-run on the customer's runners, and Ascout operates no service. PR code runs only in the read-only collect job, and the privileged publish job runs default-branch code only. |
| Per-repository team policy, `.github/ascout-policy.json` (#719) | **On `main`, not in a release.** It is read only from the default branch, and an invalid policy fails closed. A finding, error or source change in any check always fails. |
| Ascout identity guard on every CLI and MCP output, including no internal `UA-P` labels (#715, #720) | **On `main`, not in a release.** |
| Tamper-proof check name through a dedicated GitHub App | **Proposed, not built.** Today a PR's own workflow can create a check run with the same name. |
| Bring-your-own-AI provider interface (customer-supplied model; Ascout pays for no inference and sends no code without explicit opt-in) | **Partly on `main`, not in a release.** Design: `specs/017-unified-assurance/E10_BYOAI_PROVIDER_DESIGN.md`.<br>- **E10a (#723), done:** the provider interface, plus fixes for gaps found in E6. The config location comes from the OS account, proxies are ignored, untracked and secret-named files are never sent, and the model's reply is redacted.<br>- **E10b (#724), done:** local servers that speak the OpenAI-compatible API, loopback only.<br>- **Not built:** E10c (remote providers), E10d (delegated review) and E10f (AI review in PRs). Each waits for a founder decision. |
| Wider MCP tools | **Proposed, not built.** Anything that runs repository code would need explicit permission, and arbitrary command execution is out of scope. |
| Paid Teams, Business and Enterprise offerings | **Proposed, not built.** There is no billing, no payment processor, no contracts and no commercial terms, and none may start without separate founder approval. The core stays free under Apache-2.0, with no account, telemetry or cloud requirement.<br>Competitor research (CodeRabbit, cubic, Greptile) as input to that design: `docs/COMPETITOR_RESEARCH_2026-11-11.md`.<br>Design proposal (nothing priced, approved or built): `docs/PAID_OFFERING_DESIGN.md`. |
| T1 isolated execution | **Blocked** on FD-4 (see E7). |

### Security review (2026-11-08)

A whole-project security review found no critical issues. All high and medium findings and most low findings are fixed (PRs #667–#696); one is documented as a known limit (README, "Limits of the source fingerprint"). Two items remain: statement-level coverage, which needs a receipt version change, and repository settings (a `main` ruleset and Dependabot alerts), which are the owner's to change.

### Open decisions for the founder

- FD-4 for E7 containment.
- FD-8 for the historical plan PR #651, and ratification of #653.
- Repository settings: private vulnerability reporting and a `main` ruleset (PRs, linear history, the 13 required checks, no force push or deletion) are on as of 2026-11-10. Dependabot alerts are still off.
- Human R1 of the reconciled adoption packet (#653), and optionally of the E8 packets (#703, #707–#709), which merged on the founder's go-ahead without a line-level R1.
- Disposition of the older open planning PRs (#577–#635).
- Paid offering (`docs/PAID_OFFERING_DESIGN.md`): the principles, what stays free, where C1 belongs, the pricing model, the licensing boundary, names, and maintenance ownership. A payment processor is a separate, later decision.
- BYOAI (E10 design): whether to allow remote egress (E10c), delegated review (E10d), and AI review in PRs (E10f), and whether to rename `authorized_by_founder` to `operator_authorized`.
- GitHub integration: whether to set the repository variable `ASCOUT_PR_TRUSTED_ACTORS`. It is empty, so no PR evidence can turn the Ascout check green. A related choice is whether to add a team policy for this repository; without one, every check is required, and review and security report incomplete (exit 4) here.

`ROADMAP.md` is the closed record of the REA engineering maintenance run (spec 018) and is kept as history.
