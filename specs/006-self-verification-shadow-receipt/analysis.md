# Spec 006 Cross-Artifact Analysis

**Status:** PASS / PLANNING_ONLY

## Inputs reviewed

- `.specify/memory/constitution.md`
- `docs/founding/MASTER_PLAN_V1.md`
- `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`
- `specs/006-self-verification-shadow-receipt/GAP_EVIDENCE.md`
- `specs/006-self-verification-shadow-receipt/spec.md`
- `specs/006-self-verification-shadow-receipt/clarifications.md`
- `specs/006-self-verification-shadow-receipt/ponytail-review.md`
- `specs/006-self-verification-shadow-receipt/plan.md`
- `specs/006-self-verification-shadow-receipt/plan-ponytail-review.md`
- `specs/006-self-verification-shadow-receipt/tasks.md`
- `specs/006-self-verification-shadow-receipt/checklists/requirements.md`

Canonical planning base: `c8126773a63be744b121fbabc5e427600f671ae8`.

## 1. Roadmap ordering

Spec 004 and Spec 005 completed bounded M1.1 evidence-depth slices. The Post-M1 roadmap orders M1.2 next and explicitly names Ascout-on-Ascout self-verification as workstream A.

Spec 006 does not pull M2 or later work forward.

**Result:** CONSISTENT.

## 2. Measured gap vs proposed scope

Measured gap: canonical Project CI does not execute Ascout against its own PR source state and retains no self-verification receipt artifact.

Proposed scope: add exactly a repository-local harness + focused tests, then a separate shadow workflow and ledger reconciliation.

No product-core changes are required to measure this gap.

**Result:** PROPORTIONATE.

## 3. Constitution — Evidence Before Claims

Spec 006 retains actual receipt bytes and validates them with the exact head-built current validators. An external envelope binds those bytes to exact verifier/subject Git identities.

No workflow status is presented as receipt PASS.

**Result:** ALIGNED.

## 4. Constitution — No Green by Omission

Valid receipt exit `1`, `3`, or `4` remains visible and is retained. Shadow job success means evidence capture integrity only, not repository cleanliness.

No missing/invalid receipt can become a synthetic clean result.

**Result:** ALIGNED.

## 5. Constitution — Source-Bound Truth

The subject source model is exact and native:

- initial verifier checkout `HEAD == H`;
- target tree `HT = H^{tree}`;
- CI-ephemeral `git reset --soft B`;
- reconstructed subject `HEAD == B`;
- reconstructed index tree `git write-tree == HT`;
- no unstaged tracked divergence or unrelated nonignored untracked material.

This is stronger than diff-text replay and does not require a new receipt comparison mode.

**Result:** ALIGNED.

## 6. Constitution — Explicit Authority

Spec 006 explicitly prohibits automatic changed-command-surface admission. A refusal/incomplete receipt is a useful shadow observation.

**Result:** ALIGNED.

## 7. Constitution — Native Capability Before Invention

Uses native Git object/tree semantics, existing Ascout validators, GitHub Actions, and official artifact storage. No service/database/plugin/PR-range product subsystem is introduced.

**Result:** ALIGNED.

## 8. Constitution — Bounded / private execution

- one shadow environment only;
- existing bounded Ascout execution plus bounded CI job;
- output written outside subject repository source identity;
- 30-day artifact retention;
- envelope contains no repository locator, absolute path, host/user identity, environment dump, or secrets;
- no network-isolation claim.

**Result:** ALIGNED.

## 9. Supply-chain consistency

New planned action is only `actions/upload-artifact`.

Planning evidence:

- official repository: `actions/upload-artifact`;
- license: MIT;
- reviewed release: `v7.0.1`;
- reviewed exact commit: `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`;
- action runtime: Node 24;
- supports explicit path, missing-file failure, and bounded retention.

Plan/tasks/checklist all require implementation-time reverification and full-SHA pinning.

**Result:** CONSISTENT.

## 10. Artifact semantics consistency

All artifacts agree that:

- receipt v1 is unchanged;
- envelope is not a receipt;
- envelope binds verifier head/tree + subject base/head/tree + receipt exit/digest;
- exact receipt bytes are not rewritten;
- valid non-clean receipt remains shadow evidence;
- invalid/no receipt is harness failure.

**Result:** CONSISTENT.

## 11. Implementation surface consistency

All implementation-bearing artifacts agree on:

T107:
- `benchmarks/self-verify.mjs`
- `tests/t107-self-verification-harness.contract.test.ts`

T108:
- `.github/workflows/self-verify.yml`

T109:
- ledger/governance reconciliation only by default.

No `src/**`, package/dependency manifest, receipt/schema, current Project CI, historical benchmark-result, release/tag/publication mutation.

**Result:** CONSISTENT.

## 12. Task-order consistency

All artifacts agree:

`T107 → T108 → T109`

T108 cannot begin before T107 canonical closeout. T109 cannot close until T108 merge and exact live artifact evidence exist.

**Result:** CONSISTENT.

## 13. Qualification consistency

T107/T108 each require:

- exact predecessor main;
- exact path purity;
- historical result immutability;
- focused/full local proof as applicable;
- Project CI 6/6 on exact head;
- fresh independent substantive exact-head review;
- zero unresolved material findings/threads;
- unchanged qualified head;
- guarded expected-head merge;
- post-merge identity verification;
- durable closeout.

T108 additionally requires its new live self-verification workflow to produce the expected artifact on the exact final head.

**Result:** CONSISTENT.

## 14. Potential contradictions checked

### Shadow workflow green vs receipt non-clean

Not a contradiction. Job status is capture-integrity status; receipt verdict remains separately recorded factual data. Wording consistently prohibits describing job green as receipt clean.

### Verifier head H vs subject HEAD B

Not a contradiction. They are intentionally different identities with different roles and are explicitly bound in the external envelope.

### Build artifacts after soft reset

Not a source-bound contradiction because canonical `.gitignore` already excludes `dist/` and `node_modules/`; plan also requires no unrelated nonignored files.

### One shadow OS vs six-lane qualification

Not a contradiction. Project CI remains six-lane product qualification; self-verification is one initial observational environment with environment identity visible in receipt.

## 15. Open questions

No material unresolved planning question remains.

Implementation-time checks still required, not assumed:

- exact T107 feasibility on temporary Git fixtures;
- current action commit/license/ref still unchanged/acceptable;
- exact T108 live workflow artifact properties;
- whether the first real self-receipt is clean, incomplete, finding-bearing, or drifted.

These are evidence gates, not planning ambiguities.

## Conclusion

`CROSS_ARTIFACT_ANALYSIS = PASS`

Spec 006 is internally consistent, constitutionally bounded, and ready for independent final plan audit. Planning artifacts still do **not** authorize implementation.