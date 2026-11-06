# 25 — Founder Decisions and First-PR Scope Freeze

**As-of date:** 2026-11-06. **STATUS: Proposed adoption packet, no founder decisions or implementation authority recorded.**

This is a decision aid for the ratification path in [19](19_PLANNING_GOVERNANCE_AND_REVIEW_PATH.md), not a substitute for constitutional review. It complements [22](22_EGM_EXECUTION_HANDOFF_2026-11-06.md), [23](23_IMPLEMENTATION_CONTRACTS_AND_FIRST_SPRINT_2026-11-06.md), the task registry [12](12_TASK_REGISTRY.md), and the evidence/program [13](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md). Current code truth is `main@ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430`; this plan is stacked on #597 / #651.

## 0. Single entrypoint, version and terminology crosswalk

**Read order for adoption:** [this document](25_FOUNDER_DECISION_AND_FIRST_PR_FREEZE_2026-11-06.md) → [22](22_EGM_EXECUTION_HANDOFF_2026-11-06.md) → [23](23_IMPLEMENTATION_CONTRACTS_AND_FIRST_SPRINT_2026-11-06.md) → [09](09_ASSURANCE_EVIDENCE_CONTRACTS.md) → [13](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md). [00](00_EXECUTIVE_DECISION.md) and [11](11_IMPLEMENTATION_MASTER_PLAN.md) record older revision-2 research and phases; use the prominent historical/currentness note where those conflict. None is canonical without founder and independent R1 ratification.

| Stream | Current status and what it means |
|---|---|
| Canonical implementation | `main@ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430` from [#650](https://github.com/TheHalfMoon/Ascout/pull/650), **not** any older local dirty checkout or the unmerged plan branch. Re-fetch live `main` at implementation start. |
| Root plan | [#578](https://github.com/TheHalfMoon/Ascout/pull/578) oversized, unmerged; U1–U6 are **review units**, not approved plan releases. |
| Revision chain | [#579–#588](https://github.com/TheHalfMoon/Ascout/pull/588) incremental historical corrections; [#597](https://github.com/TheHalfMoon/Ascout/pull/597) revision 10; [#651](https://github.com/TheHalfMoon/Ascout/pull/651) this EGM implementation handoff. All are **proposals**. |
| Proposed governance | [#585](https://github.com/TheHalfMoon/Ascout/pull/585) policy, [#605](https://github.com/TheHalfMoon/Ascout/pull/605) FD scopes, [#607](https://github.com/TheHalfMoon/Ascout/pull/607) acceptance ID grammar. Local PASS with proposed verifier is evidence of **its parser**, not adopted policy. |
| Adoption blocker research | [#599](https://github.com/TheHalfMoon/Ascout/pull/599), [#600](https://github.com/TheHalfMoon/Ascout/pull/600), [#604](https://github.com/TheHalfMoon/Ascout/pull/604) show root reslice cycles/invalid staged ID mode. No implicit exception for #578. |
| Infrastructure | [#652](https://github.com/TheHalfMoon/Ascout/pull/652) `macos-14` → `macos-15` is a separate **Draft** CI fix, not the same as plan adoption. |

**Terms:** `REA-E00` = still-open reproducible engineering/qualification release gate; `UA-P06` = canonical earlier security phase, whose code/invariants survive V2; `ADV/SEC/PROTO/DUR/ASR` = acceptance IDs defined in [13](13_BENCHMARK_AND_ACCEPTANCE_PROGRAM.md); `B-CLM-1` = zero false-PASS claim benchmark; `T0` = bounded trusted-local process without complete isolation; `T1-FS` = filesystem-only confinement, never network confinement; full `T1` = per-platform proved filesystem **and** network controls; `TRUSTED_LOCAL` = capped, explicitly labeled trust-mode outcome, not security confinement; `REFUTED` = independently qualified contrary claim evidence proposed in A07; `completeness` = coverage of requested capabilities, independent of exit code and findings.

**Current direction resolution:** original [19](19_PLANNING_GOVERNANCE_AND_REVIEW_PATH.md) recommends FD-8 Option A. [22](22_EGM_EXECUTION_HANDOFF_2026-11-06.md) says choose a qualified path. This document retains **Option A as a recommendation**, explicitly conditioned on founder-signed unit reviews and a narrowly scoped exception; it does not claim Option B is solved. No contradiction is silently ratified.

## 1. Technical direction proposed for founder disposition

Each decision below remains **NEEDS-FOUNDER** until the founder writes a decision scoped to a fixed revision/PR. User requests to improve or finish planning are not automatic approval of the following choices.

| Gate | Concrete proposed choice | Explicit exclusions or caveats |
|---|---|---|
| FD-1 | Adopt Amendment A07 as written in [09](09_ASSURANCE_EVIDENCE_CONTRACTS.md), with truthful exit 0/1/2/3/4, `REFUTED` only from independently qualified contradictions, and a backwards-compatibility fixture matrix before merging. | `test --plan` and `review --delegate` are *non-assurance* operations allowed to exit 0 on successful rendering, never to claim verification. |
| FD-2 | Authorize narrowly scoped Sentrdel CLI and cross-platform signed/attested release work in its own repo. Gitleaks is the first independent security-engine vertical slice in Ascout and must **not** depend on Sentrdel work. | Do not treat existing Sentrdel stub as an execution engine. Cross-repository changes need their own PRs and test evidence. |
| FD-3 | **Defer all files with unverified exact-file rights** (including the optional Golam containment alternative). Admit only proven licensed/permissioned pinned bytes and complete nested notices per source before any port. | Repository ownership or a verbal permission claim alone does not establish third-party subcomponent rights. No license bypass. |
| FD-4 | Permit an explicitly labeled, per-invocation **human-only trusted-local** path on owner-controlled code; remain T0 and cap claims at `TRUSTED_LOCAL`. Block untrusted code until host-specific filesystem **and** network confinement probes pass. | No agent or MCP tool can set the human override; a Windows Job Object, process tree, or timeout cannot assert T1. |
| FD-5 | Defer UA-P07/P08/P10/P11/P12 based on re-entry criteria in [11](11_IMPLEMENTATION_MASTER_PLAN.md), retaining original decisions, history and issues; prioritize V0–V5 executable slices. | Do not delete or silently supersede earlier canonical scopes; explicit mapping and authorized change record are needed. |
| FD-6 | Require evidence-based release: zero false PASS, exact-head L3 on **every platform claimed**, rights/egress/no secret leaks, signed/attested artifact identity, independent review and installation smoke tests. | Do not release by schedule or waive missing macOS/Windows native execution based on Linux CI alone. |
| FD-7 | Admit a bounded planning verifier and Diffcipline policy only after verifying exact tests, policy source SHA and failure fixtures. Proposed `verify-planning-docs` #607 passes the **current proposed corpus**, but remains an unmerged experimental policy. | No retroactive approval of #585/#605/#607, and no treating a local run of the proposed verifier as canonical CI. |
| FD-8 | **Recommendation A (scoped exception)** for oversize root #578, retaining its visible default Diffcipline FAIL while a founder-signed exception identifies exact `#578` SHA and six independently reviewed units U1–U6. If this exception is declined, choose a fully mechanical B reslice with dependency-safe staging—not link stubs that bypass source identity. | Do not merge #578 with a global relaxed limit or claim #599/#604 proved a safe reslice. The founder must choose; review U1–U6 first. |

**Ratification record format (to be entered by founder, not model):** `FD-N | selected option | scope PR/commit | reviewer/decision timestamp | approval authority | any conditions`. Absence or silence means **PENDING**. The signed decision must identify how it changes constitutional scope, if at all. R1 founder or named human review of each U1–U6 and stacked corrections is mandatory; separate-model reviews are advisory.

## 2. Zero-decision first executable *preparation* packet E0

**Purpose:** Reproduce the current CLI truth table and freeze the baseline for future E1/E2 patches. **No production source modifications, donor imports, publication, secrets, network calls in the target under test, or untrusted code execution.** Only a disposable private clone and synthetic fixtures are permitted.

**File allowlist for E0:** `docs/strategy/ascout-v2/25_FOUNDER_DECISION_AND_FIRST_PR_FREEZE_2026-11-06.md` (this proposal) and a future separate verification-only branch rooted at current `main`. E0 may create a **new evidence-only report** in the private qualification destination named by its separate PR, not modify `src/**`, `tests/**`, any signed historical artifact, or `main`. Existing evidence and test sources are read-only.

**Code paths to inspect at exact new HEAD:** `src/cli.ts`, `src/assurance/review/review-command.ts`, `src/assurance/test/test-plan-command.ts`, `src/assurance/security/security-command.ts`, `src/receipt/model.ts`, `src/process.ts`; existing `tests/cli.smoke.test.ts`, `tests/assurance-test-cli-test-plan.test.ts`, `tests/assurance-security-t14.test.ts`, `tests/process-control.test.ts`, `tests/check-receipt-end-to-end.contract.test.ts`.

**Machine baseline:**
1. Capture `git rev-parse HEAD`, `node --version`, `npm --version`, `git status --porcelain`; use a disposable clone of canonical `main` (not an active dirty workspace); record full hash and operating system. Never run a destructive benchmark/self verifier against the working repository.
2. Install `npm ci --ignore-scripts --no-audit --no-fund`, then run `npm run typecheck`, `npx --no-install vitest run tests/cli.smoke.test.ts tests/assurance-test-cli-test-plan.test.ts tests/assurance-security-t14.test.ts tests/process-control.test.ts tests/check-receipt-end-to-end.contract.test.ts`, and `npm run build`.
3. Invoke `node dist/cli.js doctor`, `check --format json`, `review --format json`, `test --profile standard --format json`, `security --format json` on a synthetic clean repo and a synthetic changed repo. Record stdout/stderr, exit code, request scope, execution/omission counts, source-start/end binding and any unexplained differences from the contract in [09](09_ASSURANCE_EVIDENCE_CONTRACTS.md). Never print synthetic secrets to shared CI or commit raw artifacts containing credentials.
4. Validate that the current `test` command returns a plan and `security` returns NOT_RUN without scanner execution. These are **baseline observations**, not desired outcomes; acceptance is an honest mismatch ledger, not a green claim.
5. Independently inspect exact-head CI for the selected source and mark each OS/Node cell PASS/FAIL/CANCELLED/NOT_RUN. Current #652 uses supported `macos-15`, but it remains a separate Draft PR until its gates pass.

**E0 exit:** an immutable, reproducible record covering all commands and the six demanded negative cases (empty input, required missing engine, failed engine, changed source, malformed output, and policy refusal); every cell labeled by *actual* execution versus design-only expectation. If the host cannot reproduce a case without privileged/missing engine, mark **NOT_RUN** instead of synthesizing evidence. No E1 or E2 code patch claims until this ledger is captured.

## 3. Implementation PR ordering after approval

- **PR A — Git process protection (V0-T08 / E1):** a security-first patch rooted at new `main`, with hostile `core.fsmonitor`, `diff.external`, `GIT_CONFIG_*`, filter, hook, and descendant probes. Root/untrusted execution remains blocked until passing; no new run authority is granted.
- **PR B — provenance/notices/identity (E3):** complete Playwright and any shipped OCR notices, exact binary/release pins, no dependency upgrades beyond scoped need.
- **PR C — approved A07 truthful exit semantics (E2):** only after FD-1. All non-assurance and required-NOT_RUN cases must be tested in shell and JSON modes. Existing `check` receipt v1.0 golden remains byte-identical.
- **PR D — typed bounded execution broker (E4):** design from [09](09_ASSURANCE_EVIDENCE_CONTRACTS.md), rooted at current `src/process.ts`; native process-tree, output/timeout, allowlisted environment, fixed absolute executable and manifest digest verified. T0 does not mean sandbox.
- **PR E — pinned first Gitleaks executable (E5):** first true real-engine L2 slice with synthetic controls, sanitized observations and no false green; fuller modes still missing/blocked until independently qualified.
- **PR F — qualified executable review/test (E6):** first actual OCR delegation or pinned model endpoint and `STANDARD` adapter, after A07 and broker, with independence status and omissions.
- **PR G — real containment, MCP and distribution (E7–E9):** gated by FD-4, host-specific native probes, rights, privacy, release authority and all claimed-platform L3.

**Every production PR must freeze exact create/modify/delete paths and a versioned interface/negative-test matrix before code.** A directory glob in V2 is a *planning pointer*, not permission to edit all files. If the full future packet would force an engineer to choose an unrecorded interface or dependency, it is not ready to implement yet. This avoids conflating the first E0/B stages with complete V2 readiness.

## 4. Closure conditions

- [ ] **EGM fresh-context** comprehension, design critic, codebase-details and implementation-readiness reports from Pulse (or genuinely independent equivalent) are source-bound and include an explicit disposition for each blocker.
- [ ] The final plan has zero unresolved blocker/major design gaps within the first executable PRs, and remaining future phases are marked DEFINED/BLOCKED with owners and re-entry gates, not GO.
- [ ] R1 founder/human review of root #578 units plus stacked plan additions and chosen FD record is saved, then the policy/CI/ratification checks run on the exact adopted head.
- [ ] FD-7 policy and FD-8 root admission are resolved; current #607 experimental PASS is recorded as mechanical evidence **only**.
- [ ] Canonical `main` and currently supported runners are reconciled before implementing a source-pinned PR.

**Present verdict:** TECHNICAL PREPARATION PACKET PROPOSED. Founder ratification, human review and full product-release authorization remain NOT DONE until supported by source-bound evidence.
