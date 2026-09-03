# Spec 006 Ponytail / YAGNI Review

**Status:** PASS_WITH_REDUCTIONS_AFTER_MERGE_BASE_RECONCILIATION / PLANNING_ONLY

## Question

What is the smallest implementation that measures M1.2-A self-verification without adding product-core features or premature policy?

## Candidate ideas rejected

### 1. Add `ascout check --base <sha>` or PR-range mode

**Rejected.** Existing `working_tree_vs_head` semantics are sufficient. The repository harness can compute exact Git identities externally: event base tip `B`, PR head `H`, unique merge base `M`, and target tree `HT = H^{tree}`; then use ephemeral `git reset --soft M` and prove `HEAD == M` plus `git write-tree == HT`.

### 2. Treat GitHub event base tip B as subject HEAD

**Rejected after feasibility audit.** The target branch can advance independently, so `B` may contain commits absent from `H`. `B` remains provenance; the unique merge base `M` is the subject HEAD. Missing/multiple merge-base results fail closed.

### 3. Add verifier Git SHA to receipt v1

**Rejected.** An external qualification envelope binds exact verifier `H/HT`, event `B`, subject `M`, and receipt bytes without receipt compatibility changes.

### 4. Make self-verification a required PR gate immediately

**Rejected.** No measured shadow corpus exists. Spec 006 observes before policy promotion.

### 5. Auto-pass changed-command-surface admission

**Rejected / prohibited.** Human admission is per invocation and must not be automated.

### 6. Add daemon/service/history DB or custom artifact service

**Rejected.** One repository harness plus bounded GitHub Actions artifacts is sufficient.

### 7. Modify existing six-lane Project CI or duplicate self-verification across six lanes

**Rejected.** Project CI remains independent cross-platform qualification. One Ubuntu 24.04 / Node 24 shadow lane answers the first observation question.

### 8. Generalize Git reconstruction

**Rejected.** No patch replay framework, second clone abstraction, custom tree engine, or workflow SDK. Use native merge-base, soft reset, and exact tree proof only.

### 9. Add selector shadow, historical corpus expansion, adversarial receipt mutation, or M2 capabilities now

**Rejected.** Separate future workstreams with separate measured evidence and authority.

### 10. Persist indefinite artifacts or commit generated receipts

**Rejected.** Initial evidence is bounded workflow-run artifact storage; retention/promotion policy comes later if justified.

## Minimal retained design

- T107 single-purpose harness + focused tests;
- T108 one separate shadow workflow;
- T109 ledger reconciliation;
- exact `B/H/M/HT` identity binding;
- exact head-built verifier;
- current validators only;
- privacy-safe envelope;
- pinned official artifact action;
- bounded retention;
- no `src/**`, receipt/schema/CLI, auto-admission, or verdict gating.

## Complexity verdict

`PASS_AFTER_MERGE_BASE_RECONCILIATION`

The retained design is the minimum useful experiment that produces inspectable Ascout-on-Ascout evidence without widening the product contract.