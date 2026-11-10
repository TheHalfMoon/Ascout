# Current-State Reconciliation — 2026-11-09

**Status:** reconciliation note on the PR #653 proposal. It is **not** founder ratification, **not** human R1,
and **not** an FD decision. The other files in this directory are kept unchanged, as the historical record of
the proposal at `main@ecada2b` (2026-10-27). Where they describe E1–E6 as future or blocked, this note gives
the state of `main@af67e10` (2026-11-09), and this note governs planning statements about implementation.
History is not rewritten.

## Packet state on `main@af67e10540d694f481d414be8387cc3489d59812`

| Packet | Proposal said (2026-11-06) | Actual on main | Evidence |
|---|---|---|---|
| E0 observe | GO for read-only observation | Done: baseline evidence recorded | #654 |
| E1 Git command security | BLOCKED on private spec | Done: hostile Git configuration cannot execute | #659; `tests/git-config-hostile.test.ts` |
| E2 truthful exits (A07) | BLOCKED on FD-1 | Done. The founder ratified Amendment A07, and it was applied as constitution v1.4.0. Exits are 0 complete, 1 findings, 2 error, 3 drift, 4 incomplete. | #656, #657 (A07), #658 (implementation) |
| E3 notices | Pending | Done for Gitleaks. The OpenCode Review pin is unchanged and still UNAVAILABLE by default. | #697; `tests/third-party-notices.test.ts` |
| E4 bounded broker | BLOCKED on schema review | Done: `runQualifiedEngineV1`, with pinned digests, empty environment, output and time caps, source binding, and owned process-tree teardown | #660; `specs/017-unified-assurance/E4_EXECUTION_BROKER_SPEC.md` |
| E5 Gitleaks | BLOCKED on pin manifest | Done: Gitleaks 8.30.1 is digest-pinned on linux-x64, darwin-arm64, and win-x64, and qualified on real binaries in the Real Engines CI | #661, #662; E5 and E5B specs |
| E6 test | BLOCKED on FD-1 | Done: `ascout test` runs `check` on the same source; deep and release report the missing engines (exit 4) | #663, #665, #685, #690; E6A spec |
| E6 review | BLOCKED, OCR delegate | Done as **advisory, opt-in** review. `ascout review --local-model` is loopback-only Ollama (founder-authorized local model, 2026-11-09) and never human R1. The default path is still NOT_RUN (exit 4). The OCR path was not adopted. | #666 (fail-closed provider decision), #699, #700; E6B–E6D specs |
| E7 containment | BLOCKED FD-4 and native proof | **Still BLOCKED.** Process-tree teardown and Job Objects are T0 lifetime control, not filesystem and network isolation. No T1 is claimed. | FD-4 has no recorded disposition |
| E8 MCP and E2E | BLOCKED | **Still BLOCKED.** A design may be proposed; implementation needs its reviewed protocol spec. | — |
| E9 distribution | BLOCKED FD-6 | **Still BLOCKED.** `private: true`; no new release. The only release is GitHub release `v0.1.0` (2026-09-12), with nothing on npm. *Corrected 2026-11-10.* | FD-6 has no recorded disposition |

A security review on 2026-11-08 fixed every high and medium finding (#667–#696), on top of the packets above.

## Superseded statements in this directory

These statements in the older files were true at `ecada2b` and are no longer current:

- `IMPLEMENTATION_FREEZE.md` §1: `review`, `test` and `security` exit 0/0/1 without running anything. Since A07 (#658) they exit 4 when nothing ran.
- `IMPLEMENTATION_FREEZE.md` §4: the rows for E1, E2, E4, E5 and E6 as BLOCKED. Each was implemented from a fresh main, under its own spec and PR. Their file lists were not followed literally. For example, E6 test reused `check` instead of an OCR runner. The merged PRs are the record.
- `REVIEW_AND_RATIFICATION.md` §2, FD-1: now disposed by the A07 ratification (#656/#657). FD-2 through FD-8 still have no recorded disposition here.
- `REVIEW_AND_RATIFICATION.md` §3, CI: macOS 15 (#652) is merged, and every PR now runs 13 checks.
- `README.md`: the source baseline `ecada2b` is historical, and new work starts from the current main.

## Still true and kept

- **Do not merge the historical #578–#651 stack into main.** Its tree predates the security fixes and the merged E1–E6 work. Keep it as reference only (FD-8 is still pending).
- Untrusted-code execution stays refused until platform-specific filesystem **and** network isolation is proved natively (FD-4).
- Model reviewers are advisory, and that includes local Ollama and OpenCode. Human R1 is still required wherever the governance requires it.

## Repository configuration, observed separately

On 2026-11-09 the GitHub API reports: repository **public**; `main` **not protected** (`protected: false`); **0 rulesets**.
npm `private: true` only blocks npm publication. A Dependabot YAML file does not turn on Dependabot alerts.
These are owner settings, and a PR cannot change them.
