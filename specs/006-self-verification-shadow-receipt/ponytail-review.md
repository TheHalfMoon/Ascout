# Spec 006 Ponytail / YAGNI Review

**Status:** PASS_WITH_REDUCTIONS_AFTER_F1_F2_F3_F4_F5_F6_RECONCILIATION / PLANNING_ONLY

## Question

What is the smallest implementation that measures M1.2-A self-verification without adding product-core features, untrusted PR execution, duplicate evidence algorithms, ambiguous exit policy, or premature policy?

## Candidate ideas rejected

### 1. Add `ascout check --base <sha>` or PR-range mode

**Rejected.** Existing `working_tree_vs_head` semantics plus external Git proof are sufficient: event base B, PR head H, unique merge base M, target tree HT, ephemeral `git reset --soft M`, HEAD=M, write-tree=HT.

### 2. Treat event base B as subject HEAD

**Rejected.** Base can advance independently. B remains provenance; unique M is subject HEAD. Missing/multiple merge bases fail closed.

### 3. Execute fork/external PR code

**Rejected / prohibited.** Spec 006 is trusted-repository only. Same-repository eligibility occurs before checkout/install/build/execution. Fork/external PRs skip and produce no receipt claim. No `pull_request_target`, secrets, elevated permissions, or fork-code workaround.

### 4. Add verifier/source revision fields to receipt v1

**Rejected.** External qualification metadata and existing receipt source-state fields are sufficient; no receipt compatibility change is justified.

### 5. Reimplement source-state/tree-digest logic in the harness

**Rejected after F4 review.** Production T107 must lazily reuse exact H-built canonical `composeSourceState(repositoryRoot)` after reconstruction and immediately before verifier launch to capture expected SourceStateV1 snapshot S.

The harness compares only the six fields needed to bind `receipt.source.start` to S: `head_sha`, `tree_digest_version`, `tree_digest`, `tracked_index_entry_count`, `unstaged_changed_count`, and `included_untracked_count`.

Any mismatch fails capture. No second composer/evaluator, generalized source-state library, new digest algorithm, or receipt/envelope field is justified.

### 6. Create a new shadow state for exit 2

**Rejected after F6 review.** The minimum coherent rule is not a new category, receipt field, or policy layer. Exit `2` already represents execution/config/integrity failure semantics and therefore remains harness failure even if stdout accidentally contains an otherwise-valid/source-bound receipt.

The harness rejects exit `2` after current receipt validation and source binding but before receipt SHA-256, envelope emission, or artifact upload. Only exits `0/1/3/4` are retained as `SHADOW_NON_GATING` evidence.

### 7. Make self-verification a required gate now

**Rejected.** No measured shadow corpus exists. Observe before policy promotion.

### 8. Auto-pass changed-command admission

**Rejected / prohibited.** Human admission must not be automated.

### 9. Add daemon/history DB/custom artifact service

**Rejected.** One repository harness plus bounded GitHub Actions artifacts is sufficient.

### 10. Modify or duplicate six-lane Project CI

**Rejected.** Project CI remains independent qualification. One Ubuntu 24.04 / Node 24 shadow lane answers the first observation question.

### 11. Generalize reconstruction / CI framework

**Rejected.** No patch replay framework, second clone abstraction, workflow SDK, or generic Git-state subsystem.

### 12. Add selector shadow, historical corpus, adversarial mutation, or M2 now

**Rejected.** Separate future workstreams require separate measured evidence and authority.

### 13. Persist indefinite artifacts or commit receipts

**Rejected.** Initial evidence remains bounded workflow artifacts.

## Minimal retained design

- T107 single-purpose harness + focused tests;
- T108 one same-repository-only shadow workflow;
- T109 ledger reconciliation;
- native B/H/M/HT Git identity proof;
- exact H-built verifier;
- exact H-built canonical composeSourceState snapshot S + six-field receipt-source equality;
- current validators only;
- explicit allowed retained exits `0/1/3/4` and fail-closed exit `2` before digest/envelope/upload;
- privacy-safe external envelope;
- pinned official artifact action + bounded retention;
- no fork execution, product core, receipt/schema/CLI change, auto-admission, second evaluator/composer, new exit category, or verdict gating.

## Complexity verdict

`PASS_AFTER_F1_F2_F3_F4_F5_F6_RECONCILIATION`

The retained design is the minimum useful trusted-repository experiment that binds retained receipt truth to exact source state and preserves existing exit semantics without widening the product contract.