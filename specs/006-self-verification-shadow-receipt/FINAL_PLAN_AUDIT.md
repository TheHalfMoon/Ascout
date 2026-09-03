# Spec 006 Final Plan Audit

**Status:** PASS_AFTER_F1_F2_F3_F4_F5_F6_RECONCILIATION / PLANNING_ONLY
**Canonical base:** `c8126773a63be744b121fbabc5e427600f671ae8`

## Audit question

Does Spec 006 define the smallest constitutionally valid M1.2-A observation path without product-core changes, trust bypass, untrusted PR execution, unbound evidence, ambiguous exit classification, premature gating, or broader roadmap work?

## Scope

T107 only:
- `benchmarks/self-verify.mjs`
- `tests/t107-self-verification-harness.contract.test.ts`

T108 only:
- `.github/workflows/self-verify.yml`

T109: ledger-only by default.

No `src/**`, receipt/schema, CLI, package/runtime dependency, current Project CI, historical benchmark-result, release/tag/publication mutation.

**Verdict:** PASS.

## F1 — Event base tip vs subject HEAD

Final model: B is event-base provenance; H PR head; unique M=merge-base(B,H); HT=H tree; subject HEAD=M with exact HT index/worktree. Missing/multiple M fails closed.

**Verdict:** RECONCILED.

## F2 — Project CI tests before build

No top-level dist import; production lazily loads exact H-built code after build; focused Vitest may inject same current source functions into internal adapters; T108 proves production built-dist path.

**Verdict:** RECONCILED.

## F3 — Untrusted fork PR execution

T108 executes only same-repository PR heads. Eligibility is evaluated before checkout. Fork/external PRs skip with no receipt claim. `pull_request_target`, secrets, elevated permissions, and fork-code workarounds are prohibited.

**Verdict:** RECONCILED.

## F4 — Receipt not independently bound to reconstructed source state

Pre-launch Git reconstruction proof plus receipt-internal semantic validation did not by themselves prove that the retained receipt described the same exact index/worktree state.

Final rule:

- after reconstruction proof and immediately before verifier launch, call exact H-built canonical `composeSourceState(repositoryRoot)` and retain expected SourceStateV1 snapshot S;
- after exact receipt parse + current schema + semantic validation + process/receipt exit equality, compare `receipt.source.start` with S for exactly:
  - `head_sha`;
  - `tree_digest_version`;
  - `tree_digest`;
  - `tracked_index_entry_count`;
  - `unstaged_changed_count`;
  - `included_untracked_count`;
- any mismatch fails capture before digest/envelope/upload;
- reuse canonical composer; no duplicate digest/source-state algorithm, second evaluator, or receipt/schema/envelope field.

Focused T107 proof must reject mismatch independently for every one of the six fields. T108 live proof must use the real exact-H built composer.

**Verdict:** RECONCILED.

## F5 — YAGNI review consistency after F4

The original YAGNI record predated F4. Both YAGNI artifacts now explicitly preserve canonical `composeSourceState` reuse, exact six-field source binding, and the prohibition on duplicate source-state/digest machinery.

**Verdict:** RECONCILED.

## F6 — Otherwise-valid exit-2 receipt ambiguity

A valid receipt and process may theoretically agree on exit `2`. The earlier plan did not state whether such a receipt was successful shadow evidence or harness failure.

Final rule:

1. exact receipt bytes are parsed and current-schema + semantic validation succeeds;
2. process exit equals `receipt.summary.exit_code`;
3. all six `receipt.source.start` fields equal pre-launch S;
4. if the agreed exit is `2`, the harness still fails;
5. that failure occurs before receipt SHA-256, envelope emission, or artifact upload;
6. only exits `0`, `1`, `3`, and `4` may become retained `SHADOW_NON_GATING` evidence.

T107 focused proof must use an otherwise-valid, current-schema-valid, semantically-valid, process-consistent, source-bound exit-2 receipt and prove rejection before any digest/envelope/upload step.

This introduces no new exit, product behavior, receipt field, evaluator, or shadow classification.

**Verdict:** RECONCILED.

## Evidence / result honesty

Eligible execution proves exact H/HT/M reconstruction, captures independent canonical S, runs exact H-built verifier, validates exact receipt bytes with current validators, proves process/receipt exit equality and six-field source equality, then enforces the allowed-exit set. Only after all gates pass are exact receipt bytes hashed and the external B/M/H/HT envelope emitted.

Only a source-bound valid exit `0/1/3/4` is successful shadow capture. Workflow green means capture integrity only. Exit `2` and invalid/missing/mismatched evidence cannot become durable shadow receipt truth.

**Verdict:** PASS.

## Privacy / supply chain

Envelope contains only allowlisted Git identities + receipt exit/digest/filename/classification. S stays in-memory and does not widen schema. Exit-2 receipts never reach envelope creation. No raw repo/path/user/host/env/secret material.

Planned new action: official `actions/upload-artifact`, MIT, `v7.0.1`, exact planning-reviewed commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`, full-SHA pin after implementation-time reverification, `contents: read` only, 30-day retention.

**Verdict:** PASS_FOR_PLANNING.

## YAGNI

Rejected product PR-range mode, receipt verifier/source fields, duplicate source-state algorithm, second evaluator, new exit/shadow category for exit 2, fork sandbox shortcut, `pull_request_target`, immediate gating, auto-admission, duplicate six-lane shadow matrix, history DB/dashboard, custom artifact service, selector/corpus/adversarial/M2 expansion.

**Verdict:** PASS.

## Qualification / governance

A new final reconciled planning head must independently receive Project CI 6/6, fresh substantive external review, zero material findings/threads, unchanged path-pure head, guarded expected-head merge, and post-merge parent/tree/signature/PR/main proof.

Every earlier planning head and its CI/review evidence is stale after F6 reconciliation.

After planning merge, a separate durable implementation authorization is mandatory before T107.

## Final disposition

`FINAL_PLAN_AUDIT = PASS_AFTER_F1_F2_F3_F4_F5_F6_RECONCILIATION`

`IMPLEMENTATION_AUTHORIZATION = NOT_EFFECTIVE`

This founder-side audit is not the required independent exact-head review.