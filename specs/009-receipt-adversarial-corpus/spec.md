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

The registry also freezes both complete valid-control JSON values, the source control for every invalid case, exact permitted field assignments/additions/removals, expected rejection layer, and required semantic issue codes. No control field or baseline literal used by the corpus is implementation-selected.

The exact planned T115 tracked implementation surface is one file only:

- `tests/receipt-adversarial-corpus.contract.test.ts`

Any complete-control field/value change, registry mutation, or second tracked implementation path requires a separately reviewed Spec 009 planning amendment that becomes canonical before implementation continues.

## User value

A developer or reviewer should be able to trust that Ascout's receipt validators reject the exact frozen classes of internally contradictory, cross-run, source-mismatched, path-invalid, authority-invalid, and no-green-by-omission inputs instead of accepting them as valid receipt truth.

## Functional requirements

### FR-001 — Canonical valid controls

The corpus MUST implement both deterministic known-good Receipt v1 controls exactly as the complete JSON values frozen in `CASE_REGISTRY.md`:

1. `control-valid-line-receipt`;
2. `control-valid-branch-receipt`.

No required or optional control field used by the corpus may be selected, normalized, substituted, or otherwise changed at implementation time. The branch control is exactly the complete frozen line control plus the five exact branch-group properties frozen in the registry.

Both controls MUST pass the exact current JSON Schema validator and exact current semantic validator unchanged before invalid cases are evaluated. A rejected frozen control requires stop-and-return-to-planning; implementation MUST NOT repair or replace it.

The controls MUST use only repository-owned test data and MUST NOT require a real repository checkout, network, external service, donor source, model, secret, or clock-dependent data.

### FR-002 — Exact mutation registry

Every adversarial case MUST correspond exactly to one frozen entry in `CASE_REGISTRY.md` with its stable case ID, source control, exact permitted assignments/additions/removals, declared expected rejection layer, and required semantic issue code(s) where applicable.

No implementation-time case addition, removal, rename, merge, split, skip, reclassification, required-code weakening, alternate candidate, fallback mutation, random mutation generator, unconstrained fuzz loop, or opaque generated case is allowed.

### FR-003 — Exact candidate-construction principle

Each adversarial candidate MUST be constructed exactly as `CASE_REGISTRY.md` specifies:

1. deep-copy the exact frozen source control named for that case;
2. apply exactly the listed assignments/additions/removals;
3. leave every unlisted field unchanged from that exact frozen source control.

No extra bookkeeping, normalization, compensation, implementation-selected equivalent, alternate baseline, or alternate mutation is authorized. If either frozen control is rejected, or if the exact listed candidate cannot reach the declared validator boundary on the then-canonical implementation base, T115 stops and returns to planning.

The runner MUST preserve the original exact valid controls and create an isolated fresh candidate per case.

### FR-004 — Schema-boundary honesty

A case declared `schema` MUST fail the exact current `validateReceiptJsonSchema` boundary. It MUST NOT be counted as semantic rejection merely because later code would also fail.

A schema-declared case that passes schema validation is a corpus failure.

### FR-005 — Semantic-boundary honesty

A case declared `semantic` MUST first pass the exact current JSON Schema and then fail the exact current `validateReceiptSemantics` boundary.

The observed semantic issue-code set MUST contain every code frozen for that case in `CASE_REGISTRY.md`. Deterministic additional issue codes MAY be observed, but they MUST NOT hide absence of a required code or authorize a different candidate construction.

### FR-006 — Exact valid-control accounting

Both exact frozen controls MUST execute and pass both validators unchanged. A rejected, omitted, or baseline-divergent control is a corpus failure and returns T115 to planning.

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
- either exact frozen valid control is rejected, omitted, or differs from its registry-frozen JSON value;
- a declared case is not executed exactly once;
- a duplicate case ID exists;
- expectation metadata is incomplete;
- an undeclared case contributes to qualification counts;
- candidate construction differs from the frozen per-case assignments;
- exact frozen accounting differs from `2 + 44 = 46`, with `8` schema and `36` semantic invalid cases.

A partial, substituted, or baseline-divergent corpus execution is not a pass.

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
- undeclared qualification case IDs = `[]` for GO;
- baseline-control deviations = `[]` for GO.

Case ordering MUST be stable.

### FR-010 — Product gap and planning-truth handling

If an invalid frozen case is accepted, implementation MUST NOT repair `src/**`, schema, validator, exit semantics, baseline controls, candidate construction, or the corpus expectation inside T115.

The failed corpus evidence MUST be preserved and product repair must return to a separately reviewed recovery planning/authorization chain.

If exact evidence proves a frozen control, candidate construction, expected layer, or required issue code factually wrong, T115 MUST also stop and return to a separately reviewed Spec 009 planning amendment. Implementation observation is not authority to rewrite registry truth.

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

The frozen registry MUST remain readable as explicit named cases. Reviewers must be able to identify the exact source control, exact candidate assignments, expected layer, and required semantic issue codes without executing a generator.

### NFR-003 — Stable identities, controls, and candidates

Complete valid-control field/value sets, case IDs, source controls, exact candidate assignments, expected layers, and required semantic code sets are frozen planning-contract data. Any change is material and requires a separately reviewed canonical planning amendment.

### NFR-004 — Exact minimal implementation

T115 MUST use exactly one new tracked implementation path:

- `tests/receipt-adversarial-corpus.contract.test.ts`

No second helper, fixture, product-facing adversarial API, plugin interface, generalized mutation engine, benchmark service, or new CLI command is authorized. If one file is later proven materially unreviewable, T115 stops and returns to planning before any second path is added.

## Acceptance criteria

`SPEC_009 = GO` only if the implementation authorized after planning proves all of the following on exact final heads and canonical merges:

1. registry version is exactly `SPEC009-CASE-REGISTRY-V1`;
2. both exact frozen valid controls execute and pass schema + semantic validation unchanged, with baseline-control deviations `[]`;
3. all 44 invalid cases execute exactly once using exactly their frozen candidate assignments;
4. all 8 schema cases fail schema validation;
5. all 36 semantic cases pass schema first and fail semantic validation;
6. every semantic case includes every frozen required issue code;
7. total declared/executed count is exactly `46` for GO;
8. accepted invalid, skipped/unexecuted, undeclared qualification, and baseline-control-deviation sets are all empty for GO;
9. T115 changes exactly one tracked test path and no product/schema/validator/dependency/workflow/historical-result path;
10. exact-head Project CI succeeds on all required lanes on the original qualifying attempt for the final implementation head;
11. fresh independent substantive exact-head review reports no unresolved material finding;
12. guarded merge and post-merge parent/tree/signature/PR/main proof succeed;
13. any discovered accepted-invalid gap, rejected frozen control, or factually wrong frozen candidate/layer/code is handled honestly as `NO_GO / RETURN_TO_PLANNING` or the exact applicable product-gap disposition, not patched opportunistically.

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
