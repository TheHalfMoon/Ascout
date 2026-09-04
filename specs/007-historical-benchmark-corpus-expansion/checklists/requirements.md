# Spec 007 Requirements-Quality Checklist

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

## Problem / roadmap fit

- [x] Spec 006 is canonically closed `GO` before Spec 007 planning begins.
- [x] M1.2 roadmap ordering places historical corpus expansion after self-verification and before selector shadow/adversarial work.
- [x] The measured gap is stated without claiming selector failure: current Ascout membership evidence is observable in 3/6 frozen selection cases and unavailable in 3/6.
- [x] Historical T078 and post-Spec-002 T091 evidence are treated as immutable factual inputs.

## Scope

- [x] Exactly two new selection candidates are planned.
- [x] No gap-corpus case is added.
- [x] Selection minimum remains 5.
- [x] Selection maximum changes only from 6 to 8 in the successor corpus contract.
- [x] Gap bounds remain 3–4.
- [x] No selector/product/receipt/CLI/Project-CI/self-verification behavior change is in scope.
- [x] No new product/runtime dependency is in scope.
- [x] No selector shadow, adversarial receipt, mutation, property, fuzz, counterfactual, or M2 capability is in scope.

## Candidate provenance

- [x] Jotai exact base/fix commits and trees are identified.
- [x] Jotai fix is a direct one-parent production+regression-test change.
- [x] Jotai package/lock/test-config identities are stable across base/fix.
- [x] Jotai MIT license identity is stable across base/fix.
- [x] Jotai regression delta has no observed live-network/secret/service dependency.
- [x] Immer exact base/fix commits and trees are identified.
- [x] Immer fix is a direct one-parent production+regression-test change.
- [x] Immer root package/lock/test-config identities are stable across base/fix.
- [x] Immer MIT license identity is stable across base/fix.
- [x] Immer regression delta has no observed live-network/secret/service dependency.
- [x] Immer ES2025 Iterator runtime dependency is explicitly deferred to implementation-time proof.
- [x] ofetch live-network candidate rejection is recorded rather than hidden.

## Evidence honesty

- [x] Planning does not claim donor install/build/test execution.
- [x] Planning does not claim oracle pass/fail behavior.
- [x] Planning does not claim Ascout/full/plain/related membership outcomes for new candidates.
- [x] Planning does not claim repeated-run determinism.
- [x] Planning does not claim `BENCHMARK_ACTIVE` status for either new candidate.
- [x] `hit | miss | unavailable` remains the exact observed comparator vocabulary.
- [x] No universal selector recall threshold is introduced.
- [x] A miss or unavailable result is publishable evidence and cannot trigger product mutation inside Spec 007.

## Trust / hermeticity

- [x] Regression-test anti-leakage remains mandatory.
- [x] Measured oracles requiring live network, credentials, hosted services, or undeclared mutable state fail closed.
- [x] No polyfill or test weakening may be introduced solely to admit Immer.
- [x] Existing benchmark reconstruction/runner/metrics/assertion machinery is reused by default.
- [x] A generalized benchmark adapter framework is explicitly rejected.

## Historical immutability

- [x] T078 must remain byte-identical.
- [x] T091 must remain byte-identical.
- [x] T095 must remain byte-identical.
- [x] Spec 007 publication is additive under a new result filename/task identity.
- [x] Existing absolute integrity gates remain unchanged.

## Task ordering

- [x] T110 freezes manifest/policy before donor execution.
- [x] T111 qualifies Jotai only after T110 closes canonically.
- [x] T112 qualifies Immer only after T111 closes canonically.
- [x] T113 publishes expanded metrics only after both candidates qualify.
- [x] T114 reconciles closeout only after T113 closes canonically.
- [x] T111/T112 are repository-mutation-free by default.
- [x] T114 is ledger-only by default.

## Repository mutation bounds

- [x] T110 default paths are exactly `benchmarks/README.md` and `benchmarks/manifest.json`.
- [x] T113 default path is exactly `benchmarks/results/t113-historical-corpus-expansion.json`.
- [x] No benchmark script/test path is pre-authorized for mutation.
- [x] Any proven need to change a benchmark script requires an authority amendment before mutation.

## Qualification / governance

- [x] Planning itself is explicitly non-authoritative for implementation.
- [x] A separate durable implementation authorization is required after the canonical planning merge.
- [x] Every repository-mutating implementation unit requires exact-head six-lane Project CI.
- [x] Every repository-mutating implementation unit requires fresh independent substantive exact-head review.
- [x] Material findings and threads must be reconciled before merge.
- [x] Guarded expected-head merge and post-merge ordered-parent/tree/signature/PR/main verification are required.
- [x] Any head mutation invalidates prior exact-head CI/review evidence.
- [x] No force-push/rebase/destructive shared-history rewrite is allowed.
- [x] No fabricated evidence/authority/qualification/completion is allowed.

## Planning quality result

`REQUIREMENTS_CHECKLIST_007 = PASS`

This checklist is a planning-quality result only. It does not authorize T110 or any donor execution.
