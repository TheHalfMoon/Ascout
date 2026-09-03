# Spec 006 Cross-Artifact Analysis

**Status:** PASS_AFTER_MERGE_BASE_RECONCILIATION / PLANNING_ONLY
**Canonical planning base:** `c8126773a63be744b121fbabc5e427600f671ae8`

## Inputs

Constitution, Master Plan, Post-M1 roadmap, GAP_EVIDENCE, spec, clarifications, both YAGNI reviews, plan, tasks, requirements checklist, supply-chain review, final audit, and HEAD review.

## 1. Roadmap ordering

Spec 004/005 completed bounded M1.1 evidence-depth work. M1.2 is next; its first workstream is Ascout-on-Ascout self-verification. No M2 work is pulled forward.

**Result:** CONSISTENT.

## 2. Measured gap / proportional scope

Project CI does not execute Ascout against its own PR change or retain a self-receipt. Proposed response is only a repository harness + focused tests, then one standalone shadow workflow and ledger reconciliation. No product-core feature is needed.

**Result:** PROPORTIONATE.

## 3. Correct source identity

All authoritative Spec 006 artifacts now use:

- `B` = exact GitHub event base-tip SHA, provenance only;
- `H` = exact PR head SHA;
- `M` = unique merge base of `B` and `H`;
- `HT` = exact `H^{tree}`.

The prior assumption that event base tip `B` could always be subject HEAD was rejected because the base branch can advance independently after divergence.

Subject reconstruction is now:

- initial exact-H checkout and tree proof;
- compute and require exactly one `M`;
- ephemeral `git reset --soft M`;
- prove `HEAD == M`;
- prove `git write-tree == HT`;
- prove no unstaged tracked divergence/unrelated nonignored untracked material.

This represents exact committed PR change `M -> H` without importing unrelated base-branch advancement.

**Result:** ALIGNED WITH SOURCE-BOUND TRUTH.

## 4. Verifier identity

The verifier is exact build from `H` before reconstruction. `run.ascout_version` is not used as commit identity. Envelope externally binds verifier `H/HT`.

**Result:** CONSISTENT.

## 5. Result honesty

Valid receipt exits `0/1/3/4` remain exact product truth and are retained. Shadow job green means capture integrity only. No invalid/missing receipt becomes PASS.

**Result:** ALIGNED WITH NO-GREEN-BY-OMISSION.

## 6. Trust authority

No automatic changed-command-surface admission is allowed. Valid refusal/incomplete receipt is useful shadow evidence.

**Result:** ALIGNED.

## 7. Validation / evidence binding

Exact receipt bytes must pass current head-built JSON Schema + semantic validation; process exit must equal `receipt.summary.exit_code`; receipt source start HEAD must equal `M`; exact bytes are SHA-256 bound in the envelope.

**Result:** CONSISTENT.

## 8. Envelope consistency

Envelope is qualification metadata, not receipt truth. All relevant artifacts bind:

- verifier `H/HT`;
- event base tip `B`;
- subject merge base `M`;
- target `H/HT`;
- receipt exit/digest/filename;
- `SHADOW_NON_GATING` classification.

Raw repo/path/user/host/env/secret data is forbidden.

**Result:** CONSISTENT.

## 9. Implementation surfaces

T107 only:
- `benchmarks/self-verify.mjs`
- `tests/t107-self-verification-harness.contract.test.ts`

T108 only:
- `.github/workflows/self-verify.yml`

T109: ledger-only by default.

No `src/**`, package/runtime dependency, receipt/schema, current Project CI, historical benchmark-result, release/tag/publication mutation.

**Result:** CONSISTENT.

## 10. Supply chain

Only new planned executable workflow dependency is official `actions/upload-artifact`, MIT, planning-reviewed `v7.0.1` exact commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`. Full-SHA pin and implementation-time reverification are mandatory. Workflow permissions remain `contents: read` only.

**Result:** CONSISTENT.

## 11. Qualification

T107/T108 each require exact predecessor main, exact path purity, focused/full proof, Project CI 6/6 on exact head, fresh independent substantive review, zero material threads, guarded expected-head merge, and post-merge ordered parent/tree/signature/PR/main verification.

T108 additionally requires a live self-verification workflow artifact on its exact final head and reconciliation of exact B/M/H/HT and receipt digest/validation evidence.

**Result:** CONSISTENT.

## 12. Adversarial cases explicitly required

- simple `B == M`;
- advanced base tip `B != M`;
- missing base;
- multiple merge-base ambiguity;
- additions/deletions/renames/content changes;
- tracked/untracked contamination;
- receipt/exit mismatch;
- malformed/schema-invalid/semantic-invalid/no-receipt outcomes;
- no auto-admission.

**Result:** TESTABLE.

## 13. Remaining implementation-time evidence, not planning ambiguity

- T107 temporary-Git fixture feasibility;
- exact action SHA/license revalidation;
- live T108 artifact behavior;
- first real shadow receipt verdict/friction.

## Conclusion

`CROSS_ARTIFACT_ANALYSIS = PASS_AFTER_MERGE_BASE_RECONCILIATION`

The previously material event-base-tip ambiguity is resolved. Planning still does **not** authorize implementation and requires a fresh exact-head independent review after all reconciled artifacts reach a stable head.