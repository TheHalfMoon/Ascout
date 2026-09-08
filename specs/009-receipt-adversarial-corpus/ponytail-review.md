# Specification 009 — Ponytail / YAGNI Review

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Reduction question

What is the smallest repository change that can prove whether the existing Receipt v1 contract rejects a bounded set of known high-risk invalid states without changing product behavior?

Answer: one deterministic Vitest contract file built from an explicit valid fixture plus a table of named mutations and expectations.

## Rejected complexity

### R1 — General mutation framework

Rejected. A reusable mutation DSL or framework would invent abstraction before multiple consumers exist.

### R2 — Property-based testing dependency

Rejected. No evidence currently requires `fast-check` or equivalent. The target cases are known contract invariants and can be enumerated directly.

### R3 — Fuzzing engine

Rejected. Unbounded/random input discovery conflicts with the bounded evidence target and would add toolchain/dependency complexity.

### R4 — New CLI command

Rejected. `ascout adversarial`, `ascout verify-receipt-corpus`, or similar product surface is unnecessary. This is repository verification, not a user feature.

### R5 — New workflow

Rejected. Existing Project CI already runs Vitest on the supported OS/Node matrix. A new workflow adds no evidence authority.

### R6 — Persistent benchmark-result JSON

Rejected by default. Deterministic test assertions plus exact-head CI provide sufficient qualification evidence. A result file would create a new publication lifecycle with little incremental value.

### R7 — Large fixture directory

Rejected. Prefer an in-test fixture factory and explicit mutation registry. External JSON fixtures are justified only if inline representation becomes materially unreadable.

### R8 — Product refactor for testability

Rejected. The corpus must test existing validators. Refactoring validation code inside the same unit would mix measurement and repair.

### R9 — Universal secret detector

Rejected. The Constitution explicitly treats redaction as best-effort. The corpus must not invent a stronger privacy guarantee than current deterministic contract semantics.

### R10 — Cross-version receipt compatibility matrix

Rejected. Spec 009 targets current Receipt v1 only. Future schema versions require their own compatibility planning.

### R11 — Selector or benchmark recovery work

Rejected. Spec 009 is independent of Spec 007 and does not modify selector behavior.

## Minimal retained design

1. one valid Receipt v1 factory/control;
2. one explicit registry of approximately 25–45 stable adversarial cases;
3. per case: ID, expected layer, mutation, required semantic code(s) when applicable;
4. at least two valid controls if the second control can cover an optional semantic surface without extra architecture;
5. ordinary Vitest execution in existing Project CI;
6. zero new dependency/workflow/product/schema/result path;
7. accepted invalid case => fail and return to separate recovery planning.

## Complexity conclusion

`YAGNI_RESULT = PASS / SINGLE_TEST_SURFACE_PREFERRED`

The plan should authorize exactly `tests/receipt-adversarial-corpus.contract.test.ts` unless final cross-artifact review demonstrates a concrete readability or reuse reason for one additional test-only helper.
