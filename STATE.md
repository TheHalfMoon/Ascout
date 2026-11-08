Last updated: 2026-11-09 Asia/Riyadh · Branch: main

## Where Ascout stands

Ascout is a private, unpublished package (`private: true`); no npm release, GitHub release, or tag has been made.

### Adoption plan (execution-first V0–V9)

| Packet | State |
| --- | --- |
| E1 Git command security | Done. Hostile repository Git configuration can't execute (`tests/git-config-hostile.test.ts`). |
| E2 truthful exits (A07) | Done. Exits 0 complete, 1 findings, 2 error, 3 source drift, 4 incomplete. |
| E3 notices | Done once the Gitleaks notice (#697) merges. |
| E4 bounded execution broker | Done (`runQualifiedEngineV1`): pinned digests, empty environment, caps, source binding, owned process-tree teardown. |
| E5 Gitleaks | Done. `ascout security` runs Gitleaks 8.30.1 on Linux x64, macOS arm64, and Windows x64, qualified on real binaries in CI. |
| E6 test | Done. `ascout test` runs `check`; deep and release profiles report the engines that don't run yet. |
| E6 review | Not run. A review provider must be authorized first; no paid or hosted inference is authorized, and no qualified local provider exists. The provider decision gate is merged and fails closed. |
| E7 containment | Blocked on founder decision FD-4 and native proof. A private host-specific spec is prepared. Ascout claims no T1 containment. |
| E8 optional MCP and end-to-end | Blocked until core real-engine claims are qualified and a reviewed protocol spec exists. |
| E9 distribution | Blocked on founder decision FD-6 and release authority. |

### Security review (2026-11-08)

A whole-project security review found no critical issues. All high and medium findings and most low findings are fixed (PRs #667–#696); one is documented as a known limit (README, "Limits of the source fingerprint"). Two items remain: statement-level coverage, which needs a receipt version change, and repository settings (a `main` ruleset and Dependabot alerts), which are the owner's to change.

### Open decisions for the founder

- Authorize a review provider for E6, or keep review not run.
- FD-4 for E7 containment.
- FD-6 and release authority for E9.
- FD-8 for the historical plan PR #651, and ratification of #653.
- Repository settings: a `main` ruleset and Dependabot alerts.
- Disposition of the older open planning PRs (#577–#635).

`ROADMAP.md` is the closed record of the REA engineering maintenance run (spec 018) and is kept as history.
