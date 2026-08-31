# Implementation Plan: Branch Exercise Evidence Qualification

**Spec:** 003  
**Status:** PLANNING  
**Canonical base:** `92f57989085999aeb4f617f7ec8389afa7caece2`

## Technical Context

The current product line normalizer lives in `src/coverage/lcov.ts` and intentionally consumes only `DA:` line records. Spec 003 must not modify that product path. Qualification code belongs under `benchmarks/` and is exercised by ordinary repository tests.

Existing tooling is sufficient: Node.js standard library, Vitest, current Project CI matrix, and GitHub repository evidence. No new package is required.

## Proposed files

- `benchmarks/branch-coverage-lib.mjs` — benchmark-only parser/normalizer for `SF:` + `BRDA:` records.
- `benchmarks/fixtures/branch-exercise/cases.json` — deterministic qualification cases with declared changed ranges and expected outcomes.
- `benchmarks/branch-exercise-qualification.mjs` — evaluator and deterministic result construction.
- `benchmarks/results/t095-branch-exercise-qualification.json` — canonical executed qualification result created only in T095.
- `tests/t093-branch-coverage-normalizer.contract.test.ts` — parser/path/aggregation/fail-closed contracts.
- `tests/t094-branch-exercise-qualification.contract.test.ts` — line-vs-branch qualification semantics and deterministic serialization contracts.

T096 may update architecture/strategy status only to record the completed `GO | NO_GO` decision and exact evidence bindings.

## Data Model

### Normalized branch observation

```text
path: canonical repository-relative path
line: positive safe integer
block_id: non-empty opaque token
branch_id: non-empty opaque token
taken: non-negative safe integer | null
state: BRANCH_EXERCISED | BRANCH_NOT_EXERCISED | BRANCH_UNRESOLVED
reason?: string
```

### Case declaration

```text
case_id
purpose
repository_root
changed_line_ranges by path
lcov input
expected line conclusion
expected normalized branch observations or expected fail-closed outcome
```

### Qualification result

The result is deterministic JSON with:

- schema version for the benchmark result itself;
- task `T095`;
- canonical source/base binding;
- fixture manifest digest;
- per-case line conclusion;
- per-case branch observations;
- aggregate branch-only-gap count;
- false-gap count for fully-exercised controls;
- unresolved count;
- malformed/containment gate outcomes;
- deterministic-serialization gate;
- product-surface immutability assertions;
- promotion decision `GO | NO_GO`.

No timestamp is required in the canonical result because it would weaken byte determinism without improving source binding.

## Parser Rules

1. `SF:` begins one source record and must map inside the declared repository root.
2. `BRDA:` is valid only inside an open source record.
3. Parse `line,block,branch,taken` as exactly four fields.
4. `line` is a positive safe integer.
5. `block` and `branch` are non-empty opaque tokens without comma/newline semantics.
6. `taken` is either `-` or a non-negative safe integer.
7. Repeated numeric identities aggregate by safe addition.
8. If an identity receives any unknown `-` observation, its final state is unresolved.
9. Incomplete/malformed records fail closed with a machine-stable reason.
10. Records outside declared changed ranges may be normalized but do not count as changed-branch qualification observations.

## Qualification Algorithm

For each fixture:

1. normalize its LCOV branch records;
2. derive the current line-level conclusion from the fixture's explicit `DA:` observations using a small benchmark-only line reader or explicit fixture expectation;
3. intersect branch observations with declared changed ranges;
4. classify branch states;
5. record whether the case demonstrates a branch-only gap;
6. compare actual vs expected case contract.

Aggregate promotion gates without inventing percentage thresholds.

## Product Immutability Gate

T095/T096 closeout must verify against the canonical planning base or implementation base that:

- no `src/` file changed;
- `specs/001.../contracts/receipt-v1.schema.json` did not change;
- `src/receipt/model.ts` did not change;
- `package.json` and `package-lock.json` did not change;
- historical `benchmarks/results/t078-selector-misses.json` and `t091-m2-selection-replay.json` were not overwritten.

## Test Strategy

Focused tests prove parser semantics and evaluator semantics. Project CI then proves repository-wide compatibility on Ubuntu 24.04, macOS 14, Windows Server 2025 with Node 22 and 24.

## Trust / Security / License

No new executable authority, dependency, network access, secret use, untrusted source execution, or donor code is introduced. LCOV input is treated as data and repository path containment remains fail-closed.

## Rollback / Failure

If qualification cannot be made deterministic or honest without changing product/schema semantics, close `NO_GO` and return to planning. Do not widen Spec 003.
