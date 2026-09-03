# Spec 006 Final Plan Audit

**Status:** PASS_AFTER_MERGE_BASE_RECONCILIATION / PLANNING_ONLY
**Canonical base:** `c8126773a63be744b121fbabc5e427600f671ae8`

## Audit question

Does Spec 006 define the smallest constitutionally valid route to begin M1.2 Ascout-on-Ascout observation without product-core changes, trust bypasses, premature gating, or broader roadmap work?

## Evidence basis

At planning start: Spec 005 was `CLOSED_CANONICAL / GO`; `main` was verified merge `c8126773…`; Project CI qualified typecheck/test/build but did not run `ascout check` against Ascout's own PR change or retain a self-receipt; M1.2 follows M1.1 and self-verification is its first workstream.

## Scope audit

T107 only:
- `benchmarks/self-verify.mjs`
- `tests/t107-self-verification-harness.contract.test.ts`

T108 only:
- `.github/workflows/self-verify.yml`

T109: ledger reconciliation only by default.

No `src/**`, receipt schema/model, CLI, package/runtime dependency, existing Project CI, historical benchmark-result, release/tag/publication mutation.

**Verdict:** PASS.

## Identity audit

A founder-side feasibility audit rejected the earlier assumption that GitHub event base tip can always be the subject HEAD.

Final identity model:

- `B` = exact event base-tip SHA, provenance only;
- `H` = exact PR head SHA;
- `M` = unique merge base of `B` and `H`;
- `HT` = exact `H^{tree}`;
- verifier = exact build from `H` before reconstruction;
- subject = `HEAD == M` with index/worktree exactly `HT`.

Native proof:

- exact-H checkout and clean tree;
- compute all merge-base candidates and require exactly one `M`;
- ephemeral `git reset --soft M`;
- prove `HEAD == M`;
- prove `git write-tree == HT`;
- prove no unstaged tracked divergence/unrelated nonignored untracked material.

This correctly represents committed PR change `M -> H` even when base branch has advanced so `B != M`.

**Verdict:** PASS_AFTER_REPAIR.

## Trust audit

No automatic changed-command-surface admission. A valid refusal/incomplete receipt remains shadow truth.

**Verdict:** PASS.

## Result honesty audit

Receipt verdict and capture integrity are distinct. Valid exits `0/1/3/4` are retained without rewriting. Workflow green means capture integrity only. Exit `2` without valid receipt, missing/invalid output, Git identity, validator, digest, or artifact failure fails capture.

**Verdict:** PASS.

## Validation audit

Exact receipt bytes pass current head-built JSON Schema + semantic validation; process exit equals `receipt.summary.exit_code`; receipt source start HEAD equals `M`; exact bytes are SHA-256 bound in the envelope. No second evaluator or receipt shape.

**Verdict:** PASS.

## Privacy audit

Envelope allowlist contains only schema/classification, verifier H/HT, event B, subject M, target H/HT, receipt exit/digest/filename. Raw repository/path/user/host/env/secret material is forbidden. Artifact retention is bounded.

**Verdict:** PASS.

## Supply-chain audit

Planning-reviewed new action: official `actions/upload-artifact`, MIT, `v7.0.1`, exact commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`, full-SHA pin after implementation-time reverification, `contents: read` only.

**Verdict:** PASS_FOR_PLANNING.

## YAGNI audit

Rejected: product `--base`/PR-range mode, verifier receipt field, immediate gating, auto-admission, duplicate six-lane shadow matrix, DB/dashboard/history layer, custom artifact service, selector shadow, corpus expansion, adversarial receipt mutation, M2 capabilities.

**Verdict:** PASS.

## Testability audit

T107 explicitly proves:

- `B == M` simple case;
- advanced base `B != M` case;
- missing/multiple merge-base failure;
- exact soft-reset/tree identity;
- additions/deletions/renames/content changes;
- contamination failures;
- receipt/exit/validator/digest/privacy/admission semantics.

T108 additionally requires a live exact-head workflow artifact. Focused fake-verifier tests alone cannot close T108.

**Verdict:** PASS.

## Governance audit

Before T107:

1. final reconciled planning head receives fresh six-lane Project CI;
2. fresh independent substantive exact-head planning review completes;
3. findings/threads are reconciled;
4. planning PR guarded-merges with expected head;
5. post-merge identity is verified;
6. separate durable implementation authorization binds exact planning merge, T107–T109 surfaces, supply-chain decision, acceptance, prohibitions.

All evidence from pre-reconciliation head `3a62c736…`, including successful CI run 255, is stale for planning merge qualification.

**Verdict:** PASS.

## Open material findings

The event-base-tip subject ambiguity was material and has been reconciled across the affected planning artifacts. No other founder-side material finding is known at this audit point.

This audit is not the required independent final exact-head review.

## Final disposition

`FINAL_PLAN_AUDIT = PASS_AFTER_MERGE_BASE_RECONCILIATION`

`IMPLEMENTATION_AUTHORIZATION = NOT_EFFECTIVE`

Spec 006 is ready only after the remaining cross-artifact status record is updated and the new final branch head is independently requalified.