# Ascout Strategy and Research Index

**Status:** `NON-AUTHORITATIVE / RESEARCH AND POST-M1 PLANNING INPUT`

This directory stores strategic product research, gap reviews, and future-roadmap candidates that must remain separate from the currently authorized Spec Kit execution plan.

## Authority rule

Live GitHub/repository truth determines the **current factual state**: exact heads, merged commits, open PRs, review threads, checks, and branch relationships. It does not displace repository governance.

For product-work governance and implementation decisions, the authority order is:

1. `.specify/memory/constitution.md`;
2. `docs/founding/MASTER_PLAN_V1.md`;
3. `specs/001-changed-code-verification-receipt/spec.md`;
4. `specs/001-changed-code-verification-receipt/plan.md`;
5. `specs/001-changed-code-verification-receipt/tasks.md`;
6. relevant contracts, acceptance criteria, and fresh exact-head review/evidence required by those artifacts.

The Constitution governs all product work. A stale handoff, strategy note, review, plan, task list, or implementation snapshot cannot override constitutional constraints. Planning artifacts do not independently authorize implementation.

Nothing in `docs/strategy/` independently authorizes implementation, dependency admission, task reordering, or expansion of M1 scope. Future capabilities described here require their own reconciliation, Spec Kit canonicalization, constitutional compliance, and explicit implementation authorization.

## Canonical sequencing clarification

The milestone labels and trust gates in `POST_M1_VERIFICATION_ROADMAP.md` are strategic groupings, **not a replacement task order**. Where the roadmap groups an obligation under `P0`, the canonical Spec Kit task ordering still controls when that obligation may be implemented or qualified.

In particular:

- LCOV normalization remains scheduled by the canonical M1 plan at **T050 / Phase 4** and must not be pulled into T041–T043 closeout;
- project cross-platform CI remains scheduled at **T079 / Phase 8** and must not be pulled forward merely because the strategic P0 section names exact-head/cross-platform evidence as an eventual trust obligation;
- current US1 closeout must use the gates actually required by the active canonical tasks/runbook; later M1 gates remain later M1 work.

If any roadmap wording appears to conflict with the Constitution, canonical Master Plan, or canonical Spec Kit ordering, those canonical artifacts win and the roadmap wording must be reconciled before implementation.

## Documents

- [`ASCOUT_MAJOR_REVIEW_2026-08-26.md`](./ASCOUT_MAJOR_REVIEW_2026-08-26.md) — major repository/product review, current gaps, target product architecture, competitive synthesis, and strategic principles.
- [`POST_M1_VERIFICATION_ROADMAP.md`](./POST_M1_VERIFICATION_ROADMAP.md) — staged P0 → M5 roadmap for evolving Ascout into an evidence-bound verification authority without bloating M1.
- [`RESEARCH_LEDGER_2026-08-26.md`](./RESEARCH_LEDGER_2026-08-26.md) — source ledger and reusable lessons from testing, browser automation, mutation, generative testing, API testing, infrastructure testing, performance, accessibility, provenance, CI, and agent-native workflows.

## Product direction in one sentence

> **Ascout should become the evidence-bound verification authority for software changes: it determines what changed, what evidence actually challenged that change, what passed, what failed, what remains unverified, and whether a resulting claim is safe to use.**

This direction extends the founding identity — **Verify everything AI ships** — while preserving the constitutional rules of evidence before claims, no green by omission, source-bound truth, native capability first, conservative verification, and minimal trusted core.
