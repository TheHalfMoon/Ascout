# 26 — Pulse / Google EGM Fresh-Context First Review

**Recorded 2026-11-06. Source:** Ascout proposal `plan/ascout-v2-egm-final-20261106@4949f0202fa715e698a16a5bd11e191462452fdc`, compared read-only to canonical `main@ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430`. The Google EGM persona and standard files were read from `google/elephant-goldfish-model@6a8001ea31ccf72430ba0603a467ec6df9f69dd7` (Apache-2.0). OpenCode CLI ran model `opencode/pulse-alpha-free`, `--agent plan`, fresh sessions with no `--continue`, read-only prompts. **This was an EGM-inspired fresh-session review, not an installed native EGM subagent orchestration run.** Model reviews are advisory and cannot replace founder R1.

| Fresh reviewer context | Actual result | Status |
|---|---|---|
| Comprehension | Completed with process exit 0; identifies stale [00](00_EXECUTIVE_DECISION.md), ambiguous revision/adoption chain, missing glossary, phase ordering mismatch and FD8 ambiguity; verdict **REVISE**. | COMPLETED |
| Codebase details | Completed with process exit 0; verified canonical source via `git show origin/main:...` and found seven substantive code/document mismatches; verdict **REVISE**. | COMPLETED |
| Implementation readiness | Completed with process exit 0; six blockers, eleven major and six nits; strongest blocker is unrelated historical plan branch/code tree versus canonical main; verdict **REVISE**. | COMPLETED |
| Design critic | Started, read EGM persona, project docs and partial source; reached a network WebFetch and did not return a final report. An initial stale local checkout `ca6b6f5` was mistakenly inspected rather than current `main`, so missing-file claims from it must **not** be adopted. | INCOMPLETE / NOT COUNTED |

## Shared blocking findings, independent of individual reviewer prose

| ID | Severity | Evidence-bound finding | Correct resolution |
|---|---|---|---|
| PG-01 | BLOCKER | **Historical plan branch is not a descendant of canonical main**. Carrying it directly risks deleting security CLI, durable harness, tests, notices, CI/Playwright and numerous source files. Neither an apparently mergeable stacked PR nor a text-only review proves safe preservation of main. | **Do not merge #578/#597/#651 as a code snapshot into main.** Produce a clean, bounded **docs-only** adoption packet rooted at canonical current `main`; refer to old V2 documents by immutable commit URL. Preserve original proposal as audit record. |
| PG-02 | BLOCKER | [00](00_EXECUTIVE_DECISION.md) and [11](11_IMPLEMENTATION_MASTER_PLAN.md) describe an obsolete Sentrdel-only V1 and pre-`security` CLI. | Mark historical and explicitly point to current, Gitleaks-first, single-claim-authority candidate plan. [00](00_EXECUTIVE_DECISION.md) now has a currentness banner; final adopted plan must not depend on stale text. |
| PG-03 | BLOCKER | Planned `security` NOT_RUN exit **1→4** is a breaking CLI contract, not an additive new command; `review` empty/changed currently NOT_RUN/exit 0; `test` plan/exit 0. | Freeze baseline truth table and migration/negative tests for all current commands; FD-1/A07 required for change, not merely for `review`/`test`. |
| PG-04 | BLOCKER | New E4/E5 adapter files, Engine Profile schema, native exit/coverage mappings and per-packet Create/Modify/Delete lists are not frozen. | First bounded source PR must name exact files, wire schemas and test cases. Unspecified future phases are DEFINED/BLOCKED, never a coding GO. |
| PG-05 | BLOCKER | Security G30 hostile Git-config execution fix V0-T08 still cites only a private path without precise acceptance scope; no proven T1 on Windows/macOS. | A separate qualified/private G30 implementation spec and hostile no-marker fixtures precede any untrusted execution. No source repository code execution merely to test the plan. |
| PG-06 | MAJOR | Live-scanner Gitleaks 8.30.1 is a **historical Windows research pin**, with no complete macOS/Linux artifact digests, rights and provenances; OCR pin/document versions also disagree. | Keep executable slice **UNAVAILABLE/BLOCKED** until exact per-platform checksums and native CLI help/golden outputs are admitted. Do not invent checksum strings or current release status. |
| PG-07 | MAJOR | No `real-engines.yml` spec/CI on historical branch; first scanner test fixture paths and secret-generation lifecycle are vague. | Explicit new workflow/test paths, test-time-only synthetic secrets in isolated temp, redaction in logs/artifacts; CI absence NOT_RUN. |
| PG-08 | MAJOR | E0 claims failed-engine and drift fixtures across commands that have never launched engines. | Baseline only observable cases; label N/A/NOT_RUN for impossible test dimensions, and reserve simulated missing/tampered engine cases for subsequent broker adapter PR. |
| PG-09 | MAJOR | Full future V1–V8 plans have zero-decision-rule gaps even though some early E0–E3 tasks are concrete. | Distinguish ready *preparatory packet* from gated feature work; freeze exact API/format mapping and source-level acceptance for each subsequent PR before code. |
| PG-10 | BLOCKER | Founder FD-1…FD-8, R1 human review and proposed FD-7/FD-8 governance exceptions remain unauthorised. | A signed, scoped founder ratification plus independent human review is required. Pulse review is **advisory only**. |

## Disposition and review outcome

- **No model PASS or implementation GO.** Review result = **REVISE** on the old stacked branch.
- The [25](25_FOUNDER_DECISION_AND_FIRST_PR_FREEZE_2026-11-06.md) decision sheet and [00](00_EXECUTIVE_DECISION.md) currentness notice help founder review, but **do not fix the lineage problem**.
- Prepare a **separate docs-only PR based directly on fresh canonical `main`**. The existing, older stacked branch remains a read-only research/decision source until explicit founder disposition. Do not cherry-pick deleted production code, tests or workflow histories.
- A fresh targeted Goldfish design/implementation pass must review the new main-rooted packet at its exact HEAD; retain every unreviewed, omitted or unavailable area as NOT_RUN. No evidence of release readiness, independent human R1 or third-party scanner execution is claimed.
