# Spec 006 Plan Ponytail / YAGNI Review

**Status:** PASS_WITH_REDUCTIONS / PLANNING_ONLY

## Review target

Technical plan for M1.2-A shadow self-verification after merge-base reconciliation.

## Reductions retained

### R1 — Native merge-base + soft reset, not diff replay machinery

Keep Git-native `M = unique merge-base(B,H)` followed by ephemeral `git reset --soft M` and exact `git write-tree == H^{tree}` proof. Reject patch generation/application, second clone, custom Git tree reconstruction, PR-range product mode, or treating event base tip `B` as subject HEAD by default.

### R2 — One observational lane

One Ubuntu 24.04 / Node 24 self-verification lane. Six-lane Project CI remains cross-platform product qualification.

### R3 — Two implementation tasks, one closeout task

- T107: harness + focused contracts;
- T108: workflow + live artifact qualification;
- T109: ledger-only observation reconciliation.

Do not split merge-base logic, envelope, validators, or artifact transport into generalized subsystems.

### R4 — No product core

All `src/**` mutations remain prohibited. If current CLI/receipt/validators cannot support the harness, return to planning rather than add product behavior under this spec.

### R5 — No generalized CI SDK

`benchmarks/self-verify.mjs` is single-purpose repository qualification code, not a workflow framework/plugin/API.

### R6 — No second receipt format

Envelope is tiny external qualification metadata only. It binds verifier H/HT, event base B, subject merge base M, target H/HT, and receipt exit/digest. It is never exposed as an Ascout receipt.

### R7 — No verdict aggregation/gating

One artifact per run, shadow non-gating. No history DB, dashboard, trend threshold, or required merge policy.

### R8 — No auto-admission

Never bypass changed-command authority. Valid incomplete exit 4 can be useful shadow evidence.

### R9 — Native artifact transport

Use official GitHub artifact capability with exact-SHA pin and bounded retention. No custom storage service.

### R10 — No committed generated receipt

Retain workflow-run artifacts only. Long-lived repository result commits require later evidence/policy.

## Complexity risks checked

- advanced base branch: resolved by preserving B as provenance and using unique M as subject HEAD;
- criss-cross/multiple merge base: fail closed rather than choose heuristically;
- exact tree identity: native `git write-tree == HT`;
- verifier/subject dual identity: external envelope;
- capture vs receipt verdict: explicitly separate;
- supply chain/privacy/workflow coupling: bounded as planned.

## Final verdict

`PASS_AFTER_MERGE_BASE_RECONCILIATION`

This remains the minimum useful M1.2-A experiment before broader benchmark or gating decisions.