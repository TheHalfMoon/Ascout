# Spec 006 Plan Ponytail / YAGNI Review

**Status:** PASS_WITH_REDUCTIONS_AFTER_F1_F2_F3_F4_RECONCILIATION / PLANNING_ONLY

## Review target

Technical plan for M1.2-A shadow self-verification after source identity, test-order, trusted-execution, and receipt/source-binding reconciliation.

## Reductions retained

### R1 — Native merge-base + soft reset

Keep `M = unique merge-base(B,H)`, ephemeral `git reset --soft M`, and exact `git write-tree == H^{tree}` proof. Reject patch replay, second clone, custom tree reconstruction, product PR-range mode, or treating B as subject HEAD.

### R2 — Same-repository eligibility only

Keep one same-repository predicate before checkout/install/build/execution. Fork/external PRs skip. Reject `pull_request_target`, secrets, elevated permissions, fork-code workaround, or ad hoc sandboxing.

### R3 — Reuse canonical composeSourceState for F4

Do **not** invent a harness tree-digest/source-state algorithm. After reconstruction and immediately before verifier launch, reuse exact H-built exported `composeSourceState(repositoryRoot)` as expected snapshot S.

Compare only the six fields required to bind `receipt.source.start` to S:

- `head_sha`;
- `tree_digest_version`;
- `tree_digest`;
- `tracked_index_entry_count`;
- `unstaged_changed_count`;
- `included_untracked_count`.

Do not add S to receipt/envelope schema, add a source-state service, or generalize the composer.

### R4 — One observational lane

One Ubuntu 24.04 / Node 24 self-verification lane. Six-lane Project CI remains cross-platform qualification.

### R5 — Two implementation tasks, one closeout task

- T107: harness + focused contracts;
- T108: workflow + live artifact qualification;
- T109: ledger-only observation reconciliation.

No generalized subsystem split.

### R6 — No product core

All `src/**` mutations remain prohibited. If current CLI/composer/receipt/validators cannot satisfy the design, return to planning.

### R7 — No generalized CI SDK or second evaluator

`benchmarks/self-verify.mjs` is single-purpose repository qualification code. No plugin/API/workflow framework, second validator, or second source-state evaluator.

### R8 — No second receipt format

Envelope remains tiny external qualification metadata binding verifier H/HT, B, M, target H/HT, and receipt exit/digest. S is in-memory integrity evidence only.

### R9 — No verdict aggregation/gating or auto-admission

One artifact per eligible run, shadow non-gating, no history DB/dashboard/threshold, and no changed-command bypass.

### R10 — Native artifact transport and bounded retention

Use official GitHub artifact capability with exact-SHA pin and bounded retention. No custom storage or committed generated receipt.

## Complexity risks checked

- advanced base branch → unique M;
- criss-cross/multiple merge base → fail closed;
- tests-before-build → lazy production imports + test-only current-source injection;
- fork code → same-repository eligibility;
- pre-launch state vs receipt state → canonical H-built S + six-field equality;
- exact tree identity → native Git proof;
- verifier/subject dual identity → external envelope;
- capture vs receipt verdict → explicitly separate.

## Final verdict

`PASS_AFTER_F1_F2_F3_F4_RECONCILIATION`

This remains the minimum useful trusted M1.2-A experiment before broader benchmark, untrusted-execution, or gating decisions.