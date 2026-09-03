# Spec 006 Final Plan Audit

**Status:** PASS_AFTER_MERGE_BASE_TEST_ORDER_AND_TRUST_SCOPE_RECONCILIATION / PLANNING_ONLY
**Canonical base:** `c8126773a63be744b121fbabc5e427600f671ae8`

## Audit question

Does Spec 006 define the smallest constitutionally valid M1.2-A observation path without product-core changes, trust bypass, untrusted PR execution, premature gating, or broader roadmap work?

## Scope

T107 only:
- `benchmarks/self-verify.mjs`
- `tests/t107-self-verification-harness.contract.test.ts`

T108 only:
- `.github/workflows/self-verify.yml`

T109: ledger-only by default.

No `src/**`, receipt/schema, CLI, package/runtime dependency, current Project CI, historical benchmark-result, release/tag/publication mutation.

**Verdict:** PASS.

## Finding F1 — Event base tip vs subject HEAD

Rejected assumption: GitHub event base tip can always be subject HEAD.

Final model: B event base provenance, H PR head, unique M=merge-base(B,H), HT=H tree; subject HEAD=M with exact HT index/worktree. Missing/multiple M fails closed.

**Verdict:** RECONCILED.

## Finding F2 — Project CI tests before build

Project CI runs `npm test` before `npm run build`; focused T107 tests cannot assume dist exists.

Final rule: no top-level dist validator import; production path lazily loads exact H-built validators after build; focused Vitest may inject same current source validators into internal adapter; T108 live workflow proves production built-dist path.

**Verdict:** RECONCILED.

## Finding F3 — Untrusted fork PR execution

A generic pull_request execution job would checkout/build/run fork PR code, violating the Constitution's trusted-repository boundary.

Final rule: T108 executes self-verification only for same-repository PR heads. Eligibility is evaluated at job level before checkout. Fork/external PRs skip execution and produce no receipt claim. `pull_request_target`, secrets, elevated permissions, and any fork-code workaround are prohibited.

**Verdict:** RECONCILED.

## Identity / evidence

Eligible execution proves exact H, HT, unique M, soft reset to M, HEAD=M, write-tree=HT, no contamination; exact H-built verifier produces exact receipt bytes; current schema + semantic validators accept; process exit equals receipt.summary.exit_code; receipt source HEAD=M; exact bytes are SHA-256 bound in external B/M/H/HT envelope.

**Verdict:** PASS.

## Result honesty / trust

No automatic changed-command admission. Valid exits 0/1/3/4 remain factual SHADOW_NON_GATING observations. Workflow green means capture integrity only. Invalid/missing receipt cannot become green receipt truth.

**Verdict:** PASS.

## Privacy / supply chain

Envelope contains only allowlisted Git object IDs + receipt exit/digest/filename/classification. No raw repo/path/user/host/env/secret material.

Planned new action: official actions/upload-artifact, MIT, v7.0.1 exact planning-reviewed commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`, full-SHA pin after implementation-time reverification, `contents: read` only, 30-day retention.

**Verdict:** PASS_FOR_PLANNING.

## YAGNI

Rejected product PR-range mode, receipt verifier field, fork sandbox shortcut, pull_request_target, immediate gating, auto-admission, duplicate six-lane shadow matrix, history DB/dashboard, custom artifact service, selector/corpus/adversarial/M2 expansion.

**Verdict:** PASS.

## Qualification / governance

Final reconciled planning head must independently receive Project CI 6/6, fresh substantive external review, zero material findings/threads, unchanged path-pure head, guarded expected-head merge, and post-merge parent/tree/signature/PR/main proof.

Every earlier planning head and its CI/review evidence is stale after F1–F3 reconciliation.

After planning merge, a separate durable implementation authorization is mandatory before T107.

## Final disposition

`FINAL_PLAN_AUDIT = PASS_AFTER_F1_F2_F3_RECONCILIATION`

`IMPLEMENTATION_AUTHORIZATION = NOT_EFFECTIVE`

This founder-side audit is not the required independent exact-head review.