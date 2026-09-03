# Spec 006 Plan Ponytail / YAGNI Review

**Status:** PASS_WITH_REDUCTIONS_AFTER_F1_F2_F3_F4_F5_F6_RECONCILIATION / PLANNING_ONLY

## Review target

Technical plan for M1.2-A shadow self-verification after source identity, test-order, trusted-execution, receipt/source-binding, YAGNI-consistency, and exit-classification reconciliation.

## Reductions retained

### R1 — Native merge-base + soft reset

Keep `M = unique merge-base(B,H)`, ephemeral `git reset --soft M`, and exact `git write-tree == H^{tree}` proof. Reject patch replay, second clone, custom tree reconstruction, product PR-range mode, or treating B as subject HEAD.

### R2 — Same-repository eligibility only

Keep one same-repository predicate before checkout/install/build/execution. Fork/external PRs skip. Reject `pull_request_target`, secrets, elevated permissions, fork-code workaround, or ad hoc sandboxing.

### R3 — Reuse canonical composeSourceState for F4/F5

Do **not** invent a harness tree-digest/source-state algorithm. After reconstruction and immediately before verifier launch, reuse exact H-built exported `composeSourceState(repositoryRoot)` as expected snapshot S.

Compare only `head_sha`, `tree_digest_version`, `tree_digest`, `tracked_index_entry_count`, `unstaged_changed_count`, and `included_untracked_count` between `receipt.source.start` and S.

Do not add S to receipt/envelope schema, add a source-state service, or generalize the composer.

### R4 — Keep exit classification exhaustive but minimal

After current receipt validation, process/receipt exit equality, and source binding:

- retain exits `0/1/3/4` as `SHADOW_NON_GATING` evidence;
- reject exit `2` as harness-integrity failure even when the receipt is otherwise fully valid/source-bound;
- reject it before receipt digest, envelope, or artifact upload.

Do not invent a new shadow status, new exit code, receipt field, or policy subsystem for this case. One focused T107 proof is sufficient to establish the boundary.

### R5 — One observational lane

One Ubuntu 24.04 / Node 24 self-verification lane. Six-lane Project CI remains cross-platform qualification.

### R6 — Two implementation tasks, one closeout task

- T107: harness + focused contracts;
- T108: workflow + live artifact qualification;
- T109: ledger-only observation reconciliation.

No generalized subsystem split.

### R7 — No product core

All `src/**` mutations remain prohibited. If current CLI/composer/receipt/validators cannot satisfy the design, return to planning.

### R8 — No generalized CI SDK or second evaluator

`benchmarks/self-verify.mjs` is single-purpose repository qualification code. No plugin/API/workflow framework, second validator, or second source-state evaluator.

### R9 — No second receipt format

Envelope remains tiny external qualification metadata binding verifier H/HT, B, M, target H/HT, and allowed receipt exit/digest. S is in-memory integrity evidence only. Exit-2 receipts never reach envelope creation.

### R10 — No verdict aggregation/gating or auto-admission

One artifact per eligible run, shadow non-gating, no history DB/dashboard/threshold, and no changed-command bypass.

### R11 — Native artifact transport and bounded retention

Use official GitHub artifact capability with exact-SHA pin and bounded retention. No custom storage or committed generated receipt.

## Complexity risks checked

- advanced base branch → unique M;
- criss-cross/multiple merge base → fail closed;
- tests-before-build → lazy production imports + test-only current-source injection;
- fork code → same-repository eligibility;
- pre-launch state vs receipt state → canonical H-built S + six-field equality;
- valid receipt with exit 2 → explicit fail-before-artifact rule, no new abstraction;
- exact tree identity → native Git proof;
- verifier/subject dual identity → external envelope;
- capture vs receipt verdict → explicitly separate.

## Final verdict

`PASS_AFTER_F1_F2_F3_F4_F5_F6_RECONCILIATION`

This remains the minimum useful trusted M1.2-A experiment before broader benchmark, untrusted-execution, or gating decisions.