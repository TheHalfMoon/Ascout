# PR #653: human R1 reviewer package

**Purpose:** everything an independent human reviewer needs to perform R1 on
[PR #653](https://github.com/TheHalfMoon/Ascout/pull/653). It is not a review, holds no outcome, and
names no reviewer. AI and model reviews of #653 exist and are listed below; they are **advisory and
never satisfy R1** (FD-8, 2026-11-13). #653 stays a draft and unmerged until a genuine human R1 is
recorded.

Prepared 2026-11-16 against `main` at `7574469`.

## 1. Exactly what is under review

- **PR:** #653, "docs(plan): main-rooted V2 implementation adoption packet (Pulse EGM review)".
- **Head commit:** `753aeb134d913a12ce45a9f8d8d6a4d32cee8dbf`. Branch `plan/ascout-v2-main-ready-20261106`, into `main`.
- **Diff:** documentation only. Eight Markdown files, 369 added lines, 0 deleted, with no source, test,
  workflow, dependency, or vendored change:

| File | Lines |
|---|---|
| `docs/strategy/README.md` | +4 |
| `docs/strategy/ascout-v2-adoption/README.md` | +24 |
| `docs/strategy/ascout-v2-adoption/IMPLEMENTATION_FREEZE.md` | +55 |
| `docs/strategy/ascout-v2-adoption/ENGINE_PROFILE_AND_INGESTION.md` | +86 |
| `docs/strategy/ascout-v2-adoption/FIRST_SPRINT_TEST_MATRIX.md` | +63 |
| `docs/strategy/ascout-v2-adoption/REVIEW_AND_RATIFICATION.md` | +60 |
| `docs/strategy/ascout-v2-adoption/PULSE_REVIEW_LEDGER.md` | +30 |
| `docs/strategy/ascout-v2-adoption/CURRENT_STATE_RECONCILIATION_2026-11-09.md` | +47 |

## 2. Scope and architecture

The packet proposes how the "V2" plan should be adopted from current `main`, instead of merging the
historical V2 branch. It covers:
- the phase order E0–E9 and the file scope, tests and rollback for each phase;
- a proposed `EngineProfileV1` and ingestion envelope;
- a first-sprint test matrix;
- the founder-decision table (FD-1 to FD-8) and the ratification gates.

It authorizes no code execution or release. Approving it approves a **planning document**, not any
implementation.

## 3. Historical-branch divergence risk (why this packet exists)

- The historical V2 PR chain (#578 → #597 → #651) does not descend from canonical `main`. Merging it
  could delete current security CLI code, the durable harness, tests, notices and workflows.
- FD-8 (2026-11-13) decided: main-rooted, never merge #651 or the V2 stack. Those PRs are closed with
  explanations; their branches are kept.
- #653 is rooted at an older `main` and merges cleanly today with no conflicts. It touches no files that
  changed on `main` since.
- **The reviewer must confirm** that #653 imports no code or tree from the historical branch. Check:
  `git diff $(git merge-base origin/main <head>) <head> --stat` shows only the eight files above.

## 4. Staleness: material for the review

#653's merge base is `d6f7982`. It is **66 commits behind `main`**. Its current-state text dates from
2026-11-09, and several statements no longer match `main`:

| #653 says | `main` now (see `STATE.md`) |
|---|---|
| E7 containment "Still BLOCKED"; "FD-4 has no recorded disposition" | FD-4 decided 2026-11-13: research and implementation, not certification. Research runners on Linux, macOS and Windows with native CI evidence (#764, #766, #768, #770). Still T0; no T1 claim |
| E8 MCP and E2E "Still BLOCKED" | E8 shipped (`ascout mcp`, read-only tools); E11a shipped; E11b deferred |
| E9 distribution "Still BLOCKED"; "the only release is v0.1.0" | v0.2.0, v0.3.0 and v0.3.1 published as GitHub releases with attestations; nothing on npm |
| The FD table "NEEDS FOUNDER" for every row | FD-1 (A07), FD-4 and FD-8 decided; E10c, E10d and E10f approved; delegated decisions recorded 2026-11-16 |
| "six commands" | The CLI now also has `mcp`, `pr-evidence`, `pr-publish`, `pr-ai-review` and `pr-ai-publish` |

The reviewer decides whether these require a refresh commit on #653 before approval. That refresh
would be a reconciliation note, not new scope.

## 5. Questions R1 must answer

1. **Safety:** does the packet avoid any path that merges, cherry-picks or reintroduces the historical
   V2 tree?
2. **Truthfulness:** does any statement claim a PASS, a release, a T1 containment level, or founder
   ratification that the evidence doesn't support? Pay particular attention to the staleness table
   above.
3. **Authority:** does the packet correctly mark itself non-authoritative relative to the constitution,
   Spec Kit specs and `STATE.md`? Does approving it avoid implying approval of code execution?
4. **Consistency:** are the phase gates, rollback steps and test matrix consistent with what `main`
   actually shipped, or clearly labeled as historical?
5. **Disposition:** merge as is, merge after a reconciliation refresh, or close as superseded by
   `STATE.md` and the shipped specs?

## 6. Test and CI evidence

- **Exact-head CI on `753aeb1`:** all required checks pass. That covers `project` and `gitleaks` on
  Linux, macOS and Windows with Node 22 and 24, plus `self-verify`. The change is docs only.
- **Merge check today:** `git merge-tree origin/main <head>` merges cleanly, with no conflicts.
- **Advisory AI reviews**, recorded in the PR body and `PULSE_REVIEW_LEDGER.md`: OpenCode Pulse
  fresh-context reviews (Implementation Readiness, Design Critic, Codebase Details) gave verdicts of
  REVISE, then revisions. **These are not R1.**

## 7. Approval and rejection criteria

- **Approve:** there is no historical-tree import; no unsupported claims (stale ones are refreshed or
  explicitly marked historical); authority is correctly scoped; and the document is consistent with
  the constitution.
- **Approve with conditions:** the reviewer lists exact edits, such as refreshing the reconciliation
  note against current `main`. Merge happens only after those edits are made and CI passes on the new
  head.
- **Reject or close:** any historical-tree import, any false PASS, release or T1 claim that can't be
  corrected by editing, or a finding that the packet is wholly superseded.

## 8. Sign-off template (filled in by the human reviewer only)

```text
Ascout PR #653 — human R1 review
Reviewer (full name / GitHub handle):
Independence statement (not the author; no AI substitution):
Reviewed head SHA:
Date (UTC):
Scope reviewed (files / checks run):
Decision: APPROVE | APPROVE WITH CONDITIONS | REJECT/CLOSE
Conditions or findings (exact file:line and required change):
Signature / attestation (e.g. signed GitHub review on the PR):
```

Record the outcome as a GitHub review on #653 by the reviewer's own account, or as a signed comment, and
link it from `STATE.md`. Do not merge #653 on any other basis.
