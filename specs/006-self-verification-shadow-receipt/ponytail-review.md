# Spec 006 Ponytail / YAGNI Review

**Status:** PASS_WITH_REDUCTIONS_AFTER_F1_F2_F3_F4_RECONCILIATION / PLANNING_ONLY

## Question

What is the smallest implementation that measures M1.2-A self-verification without adding product-core features, untrusted PR execution, duplicate evidence algorithms, or premature policy?

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

**Rejected after F4 review.** The repository already exports canonical `composeSourceState(repositoryRoot)`. Production T107 must lazily reuse the exact H-built function after reconstruction and immediately before verifier launch to capture expected SourceStateV1 snapshot S.

The harness then compares only the six fields needed to bind `receipt.source.start` to S:

- `head_sha`;
- `tree_digest_version`;
- `tree_digest`;
- `tracked_index_entry_count`;
- `unstaged_changed_count`;
- `included_untracked_count`.

Any mismatch fails capture. No second composer/evaluator, generalized source-state library, new digest algorithm, or receipt/envelope field is justified.

### 6. Make self-verification a required gate now

**Rejected.** No measured shadow corpus exists. Observe before policy promotion.

### 7. Auto-pass changed-command admission

**Rejected / prohibited.** Human admission must not be automated.

### 8. Add daemon/history DB/custom artifact service

**Rejected.** One repository harness plus bounded GitHub Actions artifacts is sufficient.

### 9. Modify or duplicate six-lane Project CI

**Rejected.** Project CI remains independent qualification. One Ubuntu 24.04 / Node 24 shadow lane answers the first observation question.

### 10. Generalize reconstruction / CI framework

**Rejected.** No patch replay framework, second clone abstraction, workflow SDK, or generic Git-state subsystem.

### 11. Add selector shadow, historical corpus, adversarial mutation, or M2 now

**Rejected.** Separate future workstreams require separate measured evidence and authority.

### 12. Persist indefinite artifacts or commit receipts

**Rejected.** Initial evidence remains bounded workflow artifacts.

## Minimal retained design

- T107 single-purpose harness + focused tests;
- T108 one same-repository-only shadow workflow;
- T109 ledger reconciliation;
- native B/H/M/HT Git identity proof;
- exact H-built verifier;
- exact H-built canonical composeSourceState snapshot S + six-field receipt-source equality;
- current validators only;
- privacy-safe external envelope;
- pinned official artifact action + bounded retention;
- no fork execution, product core, receipt/schema/CLI change, auto-admission, second evaluator/composer, or verdict gating.

## Complexity verdict

`PASS_AFTER_F1_F2_F3_F4_RECONCILIATION`

The retained design is the minimum useful trusted-repository experiment that binds retained receipt truth to exact source state without widening the product contract.