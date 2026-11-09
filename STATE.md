Last updated: 2026-11-10 Asia/Riyadh · Branch: main

## Where Ascout stands

Ascout is a private, unpublished package (`private: true`); no npm release, GitHub release, or tag has been made.

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
| E8 optional MCP and end-to-end | Design proposed in #703 (revision 2, after an advisory design-critic review): stdio-only, four read-only tools, no repository-code execution. Implementation waits for human R1 of the design. |
| E9 distribution | Preparation only. CI installs the packed tarball offline, runs it through npm's shim, and uninstalls it on all three OSes (#704). A signing and provenance plan is written. No release; blocked on FD-6 and release authority. |

### Security review (2026-11-08)

A whole-project security review found no critical issues. All high and medium findings and most low findings are fixed (PRs #667–#696); one is documented as a known limit (README, "Limits of the source fingerprint"). Two items remain: statement-level coverage, which needs a receipt version change, and repository settings (a `main` ruleset and Dependabot alerts), which are the owner's to change.

### Open decisions for the founder

- FD-4 for E7 containment.
- FD-6 and release authority for E9.
- FD-8 for the historical plan PR #651, and ratification of #653.
- Repository settings: see `docs/governance/REPOSITORY_SETTINGS_CHECKLIST.md` (#705). `main` is unprotected, Dependabot alerts are off, and private vulnerability reporting is off even though `SECURITY.md` relies on it.
- Human R1 of the E8 design (#703) and of the reconciled adoption packet (#653).
- Disposition of the older open planning PRs (#577–#635).

`ROADMAP.md` is the closed record of the REA engineering maintenance run (spec 018) and is kept as history.
