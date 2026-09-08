# Specification 009 — Receipt Adversarial Corpus

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`  
**Planning ledger:** Issue #252  
**Canonical planning base:** `fb6bb2ec152e41da05901509b0b62d1eb3636648`

## Purpose

Create a bounded, deterministic adversarial corpus that challenges Ascout receipt contract integrity without adding product breadth or weakening any existing receipt rule.

This specification is a trust-verification workstream. It is not a feature that changes receipt semantics. Its implementation, if separately authorized, must exercise the exact current receipt JSON Schema and semantic validator and produce durable evidence about whether deliberately invalid receipts are rejected at the correct boundary.

## Frozen planning contract

The exact corpus registry is `CASE_REGISTRY.md`, version `SPEC009-CASE-REGISTRY-V1`:

- `2` valid controls;
- `44` invalid cases;
- `8` schema-boundary invalid cases;
- `36` semantic-boundary invalid cases;
- `46` total declared executions.

The exact planned T115 tracked implementation surface is one file only:

- `tests/receipt-adversarial-corpus.contract.test.ts`

Any registry mutation or second tracked implementation path requires a separately reviewed Spec 009 planning amendment that becomes canonical before implementation continues.

## User value

A developer or reviewer should be able to trust that Ascout's receipt validators reject the exact frozen classes of internally contradictory, cross-run, source-mismatched, path-invalid, authority-invalid, and no-green-by-omission inputs instead of accepting them as valid receipt truth.

## Functional requirements

### FR-001 — Canonical valid controls

The corpus MUST implement both deterministic known-good Receipt v1 controls frozen in `CASE_REGISTRY.md`:

1. `control-valid-line-receipt`;
2. `control-valid-branch-receipt`.

Both controls MUST pass the exact current JSON Schema validator and exact current semantic validator before invalid cases are evaluated.

The controls MUST use only repository-owned test data and MUST NOT require a real repository checkout, network, external service, donor source, model, secret, or clock-dependent data.

### FR-002 — Exact mutation registry

Every adversarial case MUST correspond exactly to one frozen entry in `CASE_REGISTRY.md` with its stable case ID, minimum mutation, declared expected rejection layer, and required semantic issue code(s) where applicable.

No implementation-time case addition, removal, rename, merge, split, skip, reclassification, required-code weakening, random mutation generator, unconstrained fuzz loop, or opaque generated case is allowed.

### FR-003 — Minimum-fault principle

Each adversarial case MUST preserve the minimum material contract fault defined by `CASE_REGISTRY.md`.

For semantic cases, implementation MAY perform only the minimum additional bookkeeping explicitly permitted by the registry to keep the candidate schema-valid and isolate the named semantic invariant. Such bookkeeping MUST NOT remove the named fault, change its expected layer, or substitute another expected issue code.

The runner MUST preserve the original valid controls and create an isolated fresh candidate per case.

### FR-004 — Schema-boundary honesty

A case declared `schema` MUST fail the exact current `validateReceiptJsonSchema` boundary. It MUST NOT be counted as semantic rejection merely because later code would also fail.

A schema-declared case that passes schema validation is a corpus failure.

### FR-005 — Semantic-boundary honesty

A case declared `semantic` MUST first pass the exact current JSON Schema and then fail the exact current `validateReceiptSemantics` boundary.

The observed semantic issue-code set MUST contain every code frozen for that case in `CASE_REGISTRY.md`. Additional issue codes MAY be observed only when they are deterministic consequences of the same minimum mutation; they MUST NOT hide absence of a required code.

### FR-006 — Exact valid-control accounting

Both frozen controls MUST execute and pass both validators. A rejected or omitted control is a corpus failure.

The corpus MUST NOT substitute another valid control without a separately canonical planning amendment.

### FR-007 — Exact adversarial domains

The exact individual cases are defined in `CASE_REGISTRY.md`. Collectively they cover:

1. schema-boundary shape/path/admission/exercise constraints;
2. evidence/reference integrity;
3. artifact/task binding;
4. source/comparison identity and changed-scope semantics;
5. command-surface authority facts;
6. task status/execution observations and timing;
7. selection/exercise consistency;
8. summary/completeness/exit consistency;
9. branch-evidence identity/order/summary consistency.

No additional domain or case is implementation-authorized by this requirement.

Privacy scope remains limited to deterministic contract rules. Arbitrary secret-looking-string rejection is not part of the frozen registry and MUST NOT be invented.

### FR-008 — No green by omission

The corpus runner MUST fail if:

- an invalid frozen case is accepted;
- a semantic case is rejected only at schema when semantic reachability is required;
- any required semantic issue code is absent;
- either valid control is rejected or omitted;
- a declared case is not executed exactly once;
- a duplicate case ID exists;
- expectation metadata is incomplete;
- an undeclared case contributes to qualification counts;
- exact frozen accounting differs from `2 + 44 = 46`, with `8` schema and `36` semantic invalid cases.

A partial corpus execution is not a pass.

### FR-009 — Deterministic exact result accounting

The runner MUST expose deterministic accounting sufficient to prove:

- registry version = `SPEC009-CASE-REGISTRY-V1`;
- valid-control count = `2`;
- invalid-case count = `44`;
- schema-case count = `8`;
- semantic-case count = `36`;
- total declared execution count = `46`;
- total executed count = `46` for GO;
- every invalid case was rejected at its frozen layer;
- every semantic required issue code was observed;
- accepted invalid case IDs = `[]` for GO;
- skipped/unexecuted case IDs = `[]` for GO;
- undeclared qualification case IDs = `[]` for GO.

Case ordering MUST be stable.

### FR-010 — Product gap and planning-truth handling

If an invalid frozen case is accepted, implementation MUST NOT repair `src/**`, schema, validator, exit semantics, or the corpus expectation inside T115.

The failed corpus evidence MUST be preserved and product repair must return to a separately reviewed recovery planning/authorization chain.

If exact evidence proves a frozen expected layer or required issue code factually wrong, T115 MUST also stop and return to a separately reviewed Spec 009 planning amendment. Implementation observation is not authority to rewrite registry truth.

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

The frozen registry MUST remain readable as explicit named cases. Reviewers must be able to identify the minimum fault, expected layer, and required semantic issue codes without executing a generator.

### NFR-003 — Stable identities

Case IDs, expected layers, and required semantic code sets are frozen planning-contract data. Any change is material and requires a separately reviewed canonical planning amendment.

### NFR-004 — Exact minimal implementation

T115 MUST use exactly one new tracked implementation path:

- `tests/receipt-adversarial-corpus.contract.test.ts`

No second helper, fixture, product-facing adversarial API, plugin interface, generalized mutation engine, benchmark service, or new CLI command is authorized. If one file is later proven materially unreviewable, T115 stops and returns to planning before any second path is added.

## Acceptance criteria

`SPEC_009 = GO` only if the implementation authorized after planning proves all of the following on exact final heads and canonical merges:

1. registry version is exactly `SPEC009-CASE-REGISTRY-V1`;
2. both frozen valid controls execute and pass schema + semantic validation;
3. all 44 invalid cases execute exactly once;
4. all 8 schema cases fail schema validation;
5. all 36 semantic cases pass schema first and fail semantic validation;
6. every semantic case includes every frozen required issue code;
7. total declared/executed count is exactly `46` for GO;
8. accepted invalid, skipped/unexecuted, and undeclared qualification case ID sets are all empty for GO;
9. T115 changes exactly one tracked test path and no product/schema/validator/dependency/workflow/historical-result path;
10. exact-head Project CI succeeds on all required lanes on the original qualifying attempt for the final implementation head;
11. fresh independent substantive exact-head review reports no unresolved material finding;
12. guarded merge and post-merge parent/tree/signature/PR/main proof succeed;
13. any discovered accepted-invalid gap or factually wrong frozen expectation is handled honestly as `NO_GO / RETURN_TO_PLANNING`, not patched opportunistically.

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
