# Ascout V2 — Main-Rooted Adoption Plan

> **Reconciled 2026-11-09:** E0–E6 are now implemented on main. See [CURRENT_STATE_RECONCILIATION_2026-11-09.md](CURRENT_STATE_RECONCILIATION_2026-11-09.md), which governs current-state statements. The text below is kept as the historical proposal at `ecada2b`.

**Status:** FOUNDER REVIEW CANDIDATE; **not ratified**, not a release, and no implementation authorisation. **Source baseline:** `main@ecada2bc53a5ff4dd34f777b91c0ac0a3f0b8430` (2026-10-27). Check a fresh canonical `main` SHA before any new code PR. **Ascout remains local-first, privacy-first and no required cloud/paid runtime.**

This directory is a **docs-only proposal branched directly from canonical main**, with no historical V2 source, test, package, workflow or vendor files imported. It is the safe alternative to merging the outdated code tree carried under old [#578](https://github.com/TheHalfMoon/Ascout/pull/578) → [#597](https://github.com/TheHalfMoon/Ascout/pull/597) → [#651](https://github.com/TheHalfMoon/Ascout/pull/651). **Do not merge those stacks wholesale into main**: review found their source history does not contain current main and may remove current modules. Preserve them as immutable research/proposal references, not current implementation.

## Read order and authoritative boundaries

1. [IMPLEMENTATION_FREEZE.md](IMPLEMENTATION_FREEZE.md) — present CLI baseline, phased execution, exact first-slice file boundaries, acceptance, rollback and GO/NO-GO.
2. [ENGINE_PROFILE_AND_INGESTION.md](ENGINE_PROFILE_AND_INGESTION.md) — proposed typed runner/engine profile, Gitleaks adapter and critical-field mapping, no false-green policy.
3. [FIRST_SPRINT_TEST_MATRIX.md](FIRST_SPRINT_TEST_MATRIX.md) — exact synthetic E0 setup, A07 exit grid, broker budgets, native-admission and rollback rules.
4. [REVIEW_AND_RATIFICATION.md](REVIEW_AND_RATIFICATION.md) — Pulse Goldfish advisory review, explicit FD-1 through FD-8 recommendations, founder and R1 review gates, links and evidence.
5. [PULSE_REVIEW_LEDGER.md](PULSE_REVIEW_LEDGER.md) — second-round Goldfish findings, fixes and exact remaining blockers.
6. Historical detailed research (read-only, no implied authority): [V2 Revision 10 docs, exact commit](https://github.com/TheHalfMoon/Ascout/tree/4949f0202fa715e698a16a5bd11e191462452fdc/docs/strategy/ascout-v2) and [first-round OpenCode Pulse review](https://github.com/TheHalfMoon/Ascout/blob/4cce1e4460b33eff8388dac6559e7022d5cb2af5/docs/strategy/ascout-v2/26_PULSE_GOLDFISH_FIRST_ROUND_2026-11-06.md). When they disagree, current main and the explicit new review record take precedence **for proposed code planning**; none supersede ratified constitutional governance.

## Product and trust invariant

**Ascout is one local TypeScript claim authority.** Scanner, model, coding agent, Playwright, MCP tool, CI runner and native companion can emit only source-bound **observations**, not unqualified PASS/VERIFIED. Existing `ascout check` and receipt v1.0 must remain byte compatible. No required account, hosted backend, model API, default telemetry or paid inference. Unknown, blocked, partially executed or stale checks must be visible as NOT_RUN/INCOMPLETE/BLOCKED/STALE, never PASS. Untrusted code execution remains refused until platform-specific **filesystem and network** isolation has been proved, not inferred from a process timeout.

## Readiness boundary

**GO for authoring and reviewing docs/E0 observational evidence only** on disposable clones. **NO-GO for automatic V0–V8 implementation or release** until [REVIEW_AND_RATIFICATION.md](REVIEW_AND_RATIFICATION.md) gates close. Later capability packets require exact source pin, file allowlist, tests and rollback before being labeled build-ready. `macos-14` is retired; separate [#652](https://github.com/TheHalfMoon/Ascout/pull/652) proposes `macos-15`, and is not part of this document change.
