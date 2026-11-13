# Historical open PRs: proposed dispositions (2026-11-13)

**Status:** a record and a proposal. Nothing here closes, merges, or changes any PR. Closing #577–#635
is listed in `STATE.md` as a founder decision, and #651 must never be merged into `main`.

**Method:** each PR's title, body, changed files, and diff were read. `main` at `deb34cd` was checked
for its files and identifiers, and for later merged PRs that carried its content. Every PR except
#635 and #653 branches from `ca6b6f5` or older (2026-09-30), so none of them applies to today's `main`
as is. These were AI-prepared findings; no human has reviewed them.

| PR | What it is | On `main`? | Proposed disposition | Founder decision |
| --- | --- | --- | --- | --- |
| #359 | Brand identity and UI direction freeze (draft) | Partly. The identity policy is `docs/BRAND_IDENTITY.md` (#714, #715). Visual tokens, mark, and prototype are not on `main`. UA-P04 and UA-P05 say #359 must not be merged or repurposed. | Keep open, or close with the branch as the archive. | Brand freeze; older-PR disposition |
| #577 | Graft agent-context wiring | No (no root `AGENTS.md`). | Close candidate; re-propose if wanted. | Older-PR disposition |
| #578, #579–#584, #586–#588, #597 | V2 master plan and its revisions 1–10 (stacked) | The documents are not on `main`. The adopted ideas landed through the E-plan specs: A07 exits, the execution broker (E4), T0/T1 tiers (E7A), Gitleaks (E5), and BYOAI (E10). Sentrdel, OCR, and Kodac convergence were not adopted. | Close candidates; the branches keep the content. | FD-8; older-PR disposition |
| #585 | Planning-document verifier and `.diffcipline.toml` | No. | Keep open. Its own body says it needs founder approval as proposed FD-7, and it matters only if the V2 documents are admitted. | Proposed FD-7 |
| #599, #600, #603, #604 | FD-8 reslice, link-cycle, staging, and replay audits (stacked drafts) | No. | Keep only while FD-8 option B (reslicing #578) is live; otherwise close. | FD-8 |
| #605, #607 | Governance verifier fixes (stacked on #585) | No. The verifier they change is not on `main`, so neither can land alone. | Follow #585. | Proposed FD-7 |
| #614 | Batch `git hash-object` and HEAD identity queries (draft) | Half. The HEAD half landed as `e855b16` through #643. The hash-object half did not: `main` still runs one `git hash-object` per modified file when it fingerprints the tree. Its base PR #589 was closed unmerged. | **Salvage the hash-object batch** as a fresh change on `main` (a cherry-pick conflicts), keeping its fail-closed checks and its CRLF test. | None: engineering |
| #635 | UA-P07 deep security audit authorization | No. Largely overtaken by E10 (BYOAI) and A07. | Close candidate; the branch keeps the content. | Its D1–D4; older-PR disposition |
| #651 | EGM handoff and V2-to-`main` reconciliation (draft) | No. Its own body says #653 supersedes it. | Keep open as the historical record. **Never merge into `main`.** | FD-8 |
| #653 | `main`-rooted V2 adoption packet | No. Most of its E1–E9 has since shipped, so parts are now stale against v0.3.0. | Keep open. | Human R1 ratification |

## What can happen without a founder decision

Only the #614 hash-object batch. Everything else is planning, governance policy, or brand
direction, and waits on FD-8, the proposed FD-7, #653's ratification, or the recorded decision on the
older PRs.
