# Specification 009 — Receipt Adversarial Corpus

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`  
**Planning ledger:** Issue #252  
**Canonical planning base:** `fb6bb2ec152e41da05901509b0b62d1eb3636648`

## Purpose

Create a bounded, deterministic adversarial corpus that challenges Ascout receipt contract integrity without adding product breadth or weakening any existing receipt rule.

This specification is a trust-verification workstream. It is not a feature that changes receipt semantics. Its implementation, if separately authorized, must exercise the exact current receipt JSON Schema and semantic validator and produce durable evidence about whether deliberately invalid receipts are rejected at the correct boundary.

## User value

A developer or reviewer should be able to trust that Ascout's receipt validators reject known classes of internally contradictory, cross-run, source-mismatched, path-invalid, authority-invalid, and no-green-by-omission inputs instead of accepting them as valid receipt truth.

## Functional requirements

### FR-001 — Canonical valid control

The corpus MUST begin from one deterministic known-good Receipt v1 control that passes both the exact current JSON Schema validator and exact current semantic validator.

The control MUST use only repository-owned test data and MUST NOT require a real repository checkout, network, external service, donor source, model, secret, or clock-dependent data.

### FR-002 — Explicit mutation registry

Every adversarial case MUST have a stable case ID, one declared mutation function or fixture delta, a short contract rationale, and one declared expected rejection layer:

- `schema`; or
- `semantic`.

Semantic-layer cases MUST additionally declare one or more exact expected semantic issue codes.

No random mutation generator, unconstrained fuzz loop, or opaque generated case is allowed.

### FR-003 — One-fault principle

Each adversarial case SHOULD introduce one material contract fault relative to the valid control unless a compound state is necessary to reach one indivisible semantic contradiction. Compound cases MUST document why the condition cannot be represented faithfully as a single-field mutation.

The runner MUST preserve the original valid control and create an isolated candidate per case.

### FR-004 — Schema-boundary honesty

A case declared `schema` MUST fail the exact current `validateReceiptJsonSchema` boundary. It MUST NOT be counted as semantic rejection merely because later code would also fail.

A schema-declared case that passes schema validation is a corpus failure.

### FR-005 — Semantic-boundary honesty

A case declared `semantic` MUST first pass the exact current JSON Schema and then fail the exact current `validateReceiptSemantics` boundary.

The observed semantic issue-code set MUST contain the case's required issue codes. Additional issue codes MAY be observed when the mutation necessarily violates another invariant, but the corpus MUST NOT hide absence of the required code behind aggregate failure.

### FR-006 — Valid controls

The corpus MUST include at least:

1. the untouched canonical valid receipt;
2. a structurally distinct valid control exercising one optional receipt surface used by the adversarial cases, such as branch evidence or an allowed non-clean exit state, if that can be represented without expanding scope.

Every valid control MUST pass both validators. The corpus MUST fail if a valid control is rejected.

### FR-007 — Required adversarial domains

The corpus MUST cover, where deterministic current-contract representation exists:

1. evidence/reference integrity;
2. artifact/task binding;
3. source/comparison identity;
4. canonical paths and changed ranges;
5. command-surface authority/admission;
6. task status/reason/execution observations;
7. execution timeline consistency;
8. selection/exercise consistency;
9. summary/completeness/exit consistency;
10. privacy-sensitive persisted-value rules that are already deterministic contract invariants.

If a roadmap example cannot be deterministically classified by the current contract, the corpus MUST record it as an explicit limitation rather than inventing a detector.

### FR-008 — No green by omission

The corpus runner MUST fail if:

- an invalid authorized case is accepted;
- a semantic case is rejected only at schema when semantic reachability is required;
- a required semantic issue code is absent;
- a valid control is rejected;
- a case is not executed;
- a duplicate case ID or missing expectation prevents complete accounting.

A partial corpus execution is not a pass.

### FR-009 — Deterministic result accounting

The runner MUST emit or expose deterministic case accounting sufficient to prove:

- total declared cases;
- total executed cases;
- valid controls passed;
- invalid cases rejected at expected layer;
- required semantic issue codes observed;
- accepted invalid case IDs, if any;
- skipped/unexecuted case IDs, if any.

Case ordering MUST be stable.

### FR-010 — Product gap handling

If an invalid authorized case is accepted, implementation MUST NOT repair `src/**`, schema, validator, exit semantics, or the corpus expectation inside the same corpus task unless a later separately canonical recovery unit explicitly authorizes that repair.

The failed corpus evidence MUST be preserved and the corresponding product repair must return to planning.

### FR-011 — No dependency or execution expansion

The corpus MUST add no runtime or development dependency and require no new workflow, service, network access, donor checkout, browser, container runtime, model, database, or arbitrary command execution.

Use the existing Vitest/TypeScript and receipt validation surfaces already present in the repository.

### FR-012 — Historical and Spec 007 isolation

Implementation MUST NOT mutate or reinterpret:

- `benchmarks/results/t078-selector-misses.json`;
- `benchmarks/results/t091-m2-selection-replay.json`;
- `benchmarks/results/t095-branch-exercise-qualification.json`;
- any T113 r1/r2 evidence or refs;
- the Spec 007 isolated replay workflow.

Spec 009 grants no authority for T113/T114 continuation.

## Non-functional requirements

### NFR-001 — Boundedness

The focused corpus run MUST be deterministic and bounded by the ordinary test runner. It MUST NOT contain adaptive retry-until-green behavior.

### NFR-002 — Reviewability

The mutation registry MUST be readable as explicit named cases. Reviewers must be able to identify what field/state changes and why the candidate is invalid without executing a generator.

### NFR-003 — Stable identities

Case IDs and expectation categories MUST be stable under refactoring. Renaming a case or changing its expected layer/code is a material contract change requiring review.

### NFR-004 — Minimal implementation

Prefer one focused contract-test surface and, only if needed for reuse/readability, one small test helper or fixture surface. Do not create a product-facing adversarial API, plugin interface, generalized mutation engine, benchmark service, or new CLI command.

## Acceptance criteria

`SPEC_009 = GO` only if the implementation authorized after planning proves all of the following on exact final heads and canonical merges:

1. the corpus is complete against the final authorized case registry;
2. all valid controls pass schema and semantic validation;
3. every invalid case is rejected at its declared layer;
4. every semantic case includes its required issue code(s);
5. no case is skipped or omitted;
6. no product/schema/validator/dependency/workflow/historical-result mutation occurs in the corpus implementation task;
7. exact-head Project CI succeeds on all required lanes;
8. fresh independent substantive exact-head review reports no unresolved material finding;
9. guarded merge and post-merge parent/tree/signature/PR/main proof succeed;
10. any discovered accepted-invalid gap is handled honestly as `NO_GO / RETURN_TO_PLANNING`, not patched opportunistically.

## Out of scope

- changing receipt v1 semantics;
- adding new receipt fields;
- automatic security scanning;
- universal secret detection;
- fuzzing/property-testing framework adoption;
- corpus generation from LLMs;
- mutation of application/product source;
- selector behavior changes;
- Spec 007 recovery;
- release/tag/npm publication;
- hosted corpus execution or telemetry.
