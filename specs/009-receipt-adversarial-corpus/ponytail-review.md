# Specification 009 — Ponytail / YAGNI Review

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Reduction question

What is the smallest repository change that can prove whether the existing Receipt v1 contract rejects a bounded set of known high-risk invalid states without changing product behavior?

Answer: exactly one deterministic Vitest contract file implementing the exact frozen `SPEC009-CASE-REGISTRY-V1` controls and cases.

## Rejected complexity

### R1 — General mutation framework

Rejected. A reusable mutation DSL or framework would invent abstraction before multiple consumers exist.

### R2 — Property-based testing dependency

Rejected. No evidence currently requires `fast-check` or equivalent. The target cases are frozen contract invariants and can be enumerated directly.

### R3 — Fuzzing engine

Rejected. Unbounded/random input discovery conflicts with the bounded evidence target and would add toolchain/dependency complexity.

### R4 — New CLI command

Rejected. `ascout adversarial`, `ascout verify-receipt-corpus`, or similar product surface is unnecessary. This is repository verification, not a user feature.

### R5 — New workflow

Rejected. Existing Project CI already runs Vitest on the supported OS/Node matrix. A new workflow adds no evidence authority.

### R6 — Persistent benchmark-result JSON

Rejected. Deterministic focused assertions plus exact-head CI/review/merge evidence are sufficient. A result file would create a new publication lifecycle with no demonstrated incremental authority.

### R7 — Fixture directory or second tracked helper

Rejected. T115 is exactly one tracked implementation path:

- `tests/receipt-adversarial-corpus.contract.test.ts`

Both deterministic controls, the registry representation, and mutation runner remain in that file. If this exact one-file boundary later proves materially unreviewable, T115 stops and returns to planning before any second path is added.

### R8 — Product refactor for testability

Rejected. The corpus must test existing validators. Refactoring validation code inside the same unit would mix measurement and repair.

### R9 — Universal secret detector

Rejected. The Constitution explicitly treats redaction as best-effort. The corpus must not invent a stronger privacy guarantee than current deterministic contract semantics.

### R10 — Cross-version receipt compatibility matrix

Rejected. Spec 009 targets current Receipt v1 only. Future schema versions require their own compatibility planning.

### R11 — Selector or benchmark recovery work

Rejected. Spec 009 is independent of Spec 007 and does not modify selector behavior.

## Final minimal retained design

The preliminary design choices in earlier revisions of this review are superseded by the exact frozen planning contract below. There is no remaining approximate count, optional control, or conditional helper authority.

1. registry version exactly `SPEC009-CASE-REGISTRY-V1`;
2. exactly `2` mandatory valid controls;
3. exactly `44` invalid cases;
4. exactly `8` schema-boundary invalid cases;
5. exactly `36` semantic-boundary invalid cases;
6. exactly `46` total declared executions;
7. every invalid case has a frozen ID, exact candidate-construction mutation, expected layer, and required semantic code(s) where applicable;
8. exactly one tracked T115 implementation path: `tests/receipt-adversarial-corpus.contract.test.ts`;
9. ordinary Vitest execution in existing Project CI;
10. zero new dependency/workflow/product/schema/result path;
11. accepted invalid case => fail and return to separate recovery planning;
12. factually wrong frozen candidate/layer/code => stop and return to planning, never rewrite inside T115.

## Complexity conclusion

`YAGNI_RESULT = PASS / EXACT_SINGLE_TEST_SURFACE / FROZEN_REGISTRY`

No second helper/fixture path and no implementation-time corpus-design discretion are authorized.
