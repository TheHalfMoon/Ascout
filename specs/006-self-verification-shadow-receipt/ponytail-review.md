# Spec 006 Ponytail / YAGNI Review

**Status:** PASS_WITH_REDUCTIONS / PLANNING_ONLY

## Question

What is the smallest implementation that measures the M1.2-A self-verification gap without turning Ascout into a CI platform, adding product-core features, or prematurely enforcing its own verdict?

## Candidate ideas rejected as unnecessary

### 1. Add `ascout check --base <sha>`

**Rejected.** The current product contract is working-tree-vs-HEAD. An ephemeral CI reconstruction can represent the PR change without adding a new product mode, CLI flag, comparison model, receipt field, or source-selection policy.

### 2. Add verifier Git SHA to receipt v1

**Rejected.** Spec 006 only needs CI qualification binding. A separate envelope can bind exact verifier head to receipt bytes without changing product receipt semantics or compatibility.

### 3. Make self-verification a required PR gate immediately

**Rejected.** No measured shadow corpus exists yet. Gating before observing false-positive/incomplete/error behavior would violate benchmark-gated growth.

### 4. Auto-pass changed-command-surface admission in CI

**Rejected / prohibited.** Human admission is explicitly per-invocation and must not be automated by workflows or agents.

### 5. Add a daemon/service/history database

**Rejected.** GitHub Actions artifacts are enough for the first bounded observation slice.

### 6. Add a custom artifact service

**Rejected.** GitHub's existing artifact action is the native CI capability and is sufficient when pinned and least-privilege.

### 7. Modify existing six-lane Project CI

**Rejected by default.** A separate workflow isolates observational self-verification from the canonical code qualification matrix and avoids accidental coupling.

### 8. Run self-verification on six OS/Node lanes

**Rejected for the shadow workflow itself.** Project CI already qualifies code on six lanes. The first M1.2-A question is whether one exact PR-base/head self-receipt can be produced and retained, not another redundant 6x matrix. Use one declared environment initially; environment identity in the receipt makes that context visible.

### 9. Add selector shadow mode now

**Rejected.** Separate M1.2-C workstream with different metrics and execution costs.

### 10. Expand historical benchmark corpus now

**Rejected.** Separate M1.2-B workstream; Spec 006 must first create the self-observation path.

### 11. Add adversarial receipt mutation now

**Rejected.** Separate M1.2-D workstream. Existing validators are used, not redesigned.

### 12. Persist indefinite artifacts

**Rejected.** Initial shadow evidence uses bounded retention. Long-term release evidence retention requires its own measured need/policy.

## Minimal retained design

Spec 006 keeps only:

- one new repository-local self-verification harness;
- focused tests for identity reconstruction/envelope/exit classification;
- one separate GitHub Actions self-verification workflow;
- one pinned official upload-artifact action;
- bounded retention;
- no `src/**` product mutation;
- no receipt/schema/CLI change;
- no automatic trust admission;
- no verdict gating.

## Complexity verdict

`PASS`

The remaining design is the minimum useful experiment that produces durable, inspectable Ascout-on-Ascout evidence while preserving all current trust boundaries.