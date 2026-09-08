# Specification 009 — Technical Plan

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

Planning ledger: Issue #252  
Canonical planning base: `fb6bb2ec152e41da05901509b0b62d1eb3636648`

## 1. Design summary

Implement a single deterministic Vitest contract suite that constructs the exact Receipt v1 controls, applies the exact candidate assignments frozen in `CASE_REGISTRY.md`, and checks the exact current receipt JSON Schema and semantic validator boundaries.

No product code, schema, workflow, dependency, historical result, or CLI surface is planned.

Exact tracked implementation surface:

- `tests/receipt-adversarial-corpus.contract.test.ts`

## 2. Existing canonical surfaces to exercise

The implementation must import and exercise the current repository exports rather than creating alternate validators:

- `validateReceiptJsonSchema` from `src/receipt/json.ts`;
- `validateReceiptSemantics` from `src/receipt/model.ts`;
- Receipt v1 TypeScript types from the current receipt model where useful.

The JSON Schema remains the canonical file already loaded by `src/receipt/json.ts`:

- `specs/001-changed-code-verification-receipt/contracts/receipt-v1.schema.json`

No copy of the schema is permitted in the corpus.

## 3. Fixture architecture

Within the one authorized test file, define deterministic test-owned factory logic that returns fresh Receipt v1 controls matching exactly the complete JSON values frozen in `CASE_REGISTRY.md`.

Requirements:

- every field and value of `control-valid-line-receipt` is exactly the registry-frozen value;
- no required or optional control field used by the corpus is implementation-selected;
- no alternate deterministic literal, normalization, substitution, or equivalent baseline is permitted;
- `control-valid-branch-receipt` is exactly the complete frozen line control plus the five exact branch-group properties frozen in the registry;
- every pre-existing line-control field remains unchanged in the branch control;
- no absolute paths, credentials, network identity, or real secret values beyond the exact repository-owned literals already frozen in the registry.

Both controls frozen in `CASE_REGISTRY.md` are mandatory:

1. `control-valid-line-receipt`;
2. `control-valid-branch-receipt`.

Both controls MUST pass both exact validators unchanged before any invalid case executes. If either exact frozen control is rejected on the then-canonical implementation base, T115 stops and returns to planning; implementation MUST NOT repair, replace, or reinterpret the control.

## 4. Mutation case type

The test may use a local test-only shape equivalent to:

```ts
type AdversarialCase = {
  id: string;
  sourceControl: "line" | "branch";
  expectedLayer: "schema" | "semantic";
  requiredSemanticCodes?: readonly string[];
  mutate(candidate: Record<string, unknown>): void;
};
```

This shape is not a product API and MUST remain local to the one authorized test file.

Case IDs, source controls, exact candidate assignments, expected layers, and required semantic issue codes are frozen by `CASE_REGISTRY.md`. Implementation may not invent, omit, rename, merge, split, skip, reclassify, or substitute cases or candidate constructions.

## 5. Runner algorithm

For each focused corpus execution:

1. construct fresh exact line and branch controls from the complete registry-frozen JSON values;
2. prove both schema valid;
3. prove both semantic valid;
4. verify registry version, exact case counts, unique IDs, and complete expectation metadata;
5. for every frozen case in stable declared order:
   - deep-copy exactly the source control declared for that case;
   - apply exactly the assignments/additions/removals frozen in its registry row;
   - change no unlisted field;
   - run exact schema validation;
   - if expected layer is `schema`, require schema invalid;
   - if expected layer is `semantic`, require schema valid, then run semantic validation and require invalid;
   - require every declared semantic issue code to be observed;
6. require exact accounting:
   - `valid_control_count = 2`;
   - `invalid_case_count = 44`;
   - `schema_case_count = 8`;
   - `semantic_case_count = 36`;
   - `total_declared_execution_count = 46`;
7. fail if any declared case is unexecuted, any undeclared case contributes to qualification counts, any baseline control differs from its complete frozen value, or any candidate differs from its frozen construction.

No retries, no alternative baselines, no alternative candidates, no normalization-to-pass, and no mutation of expected outcomes based on observed results.

## 6. Frozen case domains

The exact individual cases and candidate constructions are defined only in `CASE_REGISTRY.md`. This section is a domain map and grants no implementation discretion.

### 6.1 Evidence/reference integrity

Frozen cases cover duplicate/logically duplicate evidence, dangling task/evidence/artifact references, cross-run evidence, and unresolved ownership.

### 6.2 Source/comparison integrity

Frozen cases cover comparison/source binding, source repository identity, stability/source-end consistency, and changed-scope invariants.

### 6.3 Paths and changed ranges

Frozen schema/semantic cases cover canonical changed-file path rejection and positive/inverted/overlapping/non-text/deleted range semantics.

### 6.4 Command authority/admission

Frozen cases prove changed authority paths resolve into comparison facts and that matched authority files are reported as command surfaces. Schema-bound admission contradictions are also frozen in the registry.

### 6.5 Timeline and observations

Frozen cases cover run/task timing, duration, observation cardinality, PASS/failure and FAIL/no-failure contradictions.

### 6.6 Selection and exercise

Frozen cases cover selection count/accounting/widening rules, line exercise scope/summary/source-task validity, coverage-evidence ownership, and branch identity/order/summary integrity.

### 6.7 Summary/exit

Frozen cases cover task-status aggregate mismatch, completeness mismatch, and clean-exit-with-material-gap contradiction.

## 7. Privacy scope

Do not create a case asserting that arbitrary secret-looking text is rejected. The exact registry authorizes no such case. Redaction coverage remains in existing execution/persistence tests.

The schema path case exercises deterministic persisted-path restrictions without claiming universal secret detection.

## 8. Qualification strategy

### Focused

Run the one new contract file through the existing Vitest command used by the repository.

The focused result must prove:

- registry version is exactly `SPEC009-CASE-REGISTRY-V1`;
- both exact frozen valid controls pass unchanged;
- baseline-control deviations are `[]`;
- all 44 invalid cases execute exactly once using their exact frozen candidate constructions;
- all 8 schema cases fail schema validation;
- all 36 semantic cases pass schema first and fail semantic validation;
- all required semantic codes are present;
- accepted invalid case IDs are `[]` for GO;
- skipped/unexecuted case IDs are `[]` for GO;
- no undeclared case contributes to qualification counts.

### Full repository

Use existing Project CI on exact final head. No new CI workflow is authorized.

### Review

Require fresh independent substantive exact-head review covering:

- complete baseline-control fidelity;
- registry completeness and exact accounting;
- exact candidate construction;
- contract-layer classification;
- required issue-code correctness;
- no hidden product change;
- no YAGNI violation;
- no Spec 007 scope leakage.

Any mutation after review invalidates review freshness.

## 9. Failure handling

If the corpus finds an accepted invalid case, an exact candidate cannot reach its frozen boundary, a frozen expectation is factually wrong, or an exact frozen valid control is rejected:

1. keep the failing case/control and observed evidence unchanged;
2. do not change product/schema/validator, baseline control, candidate construction, or registry expectation in T115;
3. record exact case/control ID and observed validator outputs in the durable task ledger;
4. classify T115 `NO_GO / PRODUCT_GAP_DISCOVERED` when an invalid case is accepted, otherwise the exact applicable planning-reconciliation failure;
5. return to a separately reviewed Spec 009 planning/recovery unit;
6. after any canonical amendment/repair, rerun the canonically authorized candidate under new exact-head qualification.

This preserves the distinction between measurement, planning truth, and repair.

## 10. No publication artifact

The plan does not create a new `benchmarks/results/**` artifact. The corpus is executable repository contract evidence. Exact commit, focused test, CI run, review, merge evidence, and durable ledger are sufficient for canonical closeout.

## 11. Planned task order

`T115 -> T116`

- T115: implement and qualify the exact one-path, exact-registry adversarial corpus contract.
- T116: ledger/governance reconciliation and next-frontier decision after T115 closes canonically.

A separate result-publication task is removed by YAGNI review.

## 12. Authorization boundary

This plan grants no implementation authority. After planning merges canonically, create a separate authorization artifact that binds the exact planning merge, `SPEC009-CASE-REGISTRY-V1`, both complete frozen controls, the exact candidate-construction registry, the exact one-path T115 implementation surface, and T116 ledger-only closeout.

## 13. Registry change control

`CASE_REGISTRY.md` is part of the planning contract.

Any complete-control field/value change, candidate-assignment change, addition, deletion, rename, merge, split, skip, expected-layer change, or required semantic-code change is a material planning mutation. It requires a separately reviewed Spec 009 planning amendment that becomes canonical before T115 continues.

Implementation-time observation is never authority to edit the registry merely to obtain green.
