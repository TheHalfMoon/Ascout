# Implementation Plan: Branch-Evidence Product Integration

**Spec:** 004  
**Status:** PLANNING  
**Canonical base:** `ae620e7a2bd152f3e6ea2a89d393483c038c5840`

## Technical Context

The current product line normalizer lives in `src/coverage/lcov.ts` and intentionally consumes only `DA:` line records. Spec 004 must extend this parser to optionally emit branch observations without changing existing line behavior. The exercise builder in `src/exercise.ts` must accept branch observations and build additive branch records and counts. The receipt model in `src/receipt/model.ts` must add `BranchRecordV1` and optional branch fields to `ExerciseV1`. Completeness and exit-code derivation must include branch gaps as additive material incompleteness.

Existing tooling is sufficient: Node.js standard library, Vitest, current Project CI matrix, and GitHub repository evidence. No new package is required.

## Proposed files

- `src/coverage/lcov.ts` — extend LCOV parser to optionally parse `BRDA:` records and return branch observations alongside line points.
- `src/exercise.ts` — accept branch observations; build branch records and branch summary counts; preserve line records exactly.
- `src/receipt/model.ts` — add `BranchRecordV1`; extend `ExerciseV1` with optional branch fields; update `exerciseHasMaterialGap` and `validateExercise`.
- `src/check.ts` — wire branch observations from LCOV parser to exercise builder.
- `tests/t101-lcov-branch-parser.contract.test.ts` — parser/path/aggregation/fail-closed contracts for branch parsing.
- `tests/t102-branch-exercise.contract.test.ts` — branch-line interaction, completeness, exit code, backward compatibility contracts.
- `tests/t103-branch-receipt-validation.contract.test.ts` — receipt validation contracts for optional branch fields.
- `tests/fixtures/lcov/branch-cases.json` — deterministic branch fixtures with declared changed ranges and expected outcomes.

T101–T103 may update architecture/strategy status only to record the completed integration and exact evidence bindings.

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

### Branch record in receipt

```ts
export interface BranchRecordV1 {
  readonly path: string;
  readonly line: number;
  readonly block_id: string;
  readonly branch_id: string;
  readonly taken: number | null;
  readonly state: "EXERCISED" | "NOT_EXERCISED" | "UNRESOLVED";
  readonly reason?: string;
}
```

### Extended ExerciseV1

```ts
export interface ExerciseV1 {
  readonly changed_executable_lines: number;
  readonly exercised_lines: number;
  readonly not_exercised_lines: number;
  readonly unresolved_lines: number;
  readonly changed_files_with_zero_exercised_lines: number;
  readonly records: readonly ExerciseRecordV1[];
  readonly branch_records?: readonly BranchRecordV1[];
  readonly exercised_branches?: number;
  readonly not_exercised_branches?: number;
  readonly unresolved_branches?: number;
  readonly changed_files_with_zero_exercised_branches?: number;
}
```

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

## Exercise Builder Rules

1. Intersect branch observations with changed new-line ranges.
2. Build branch records for each intersected branch observation.
3. Compute branch summary counts: `exercised_branches`, `not_exercised_branches`, `unresolved_branches`.
4. Compute `changed_files_with_zero_exercised_branches` as the count of changed files with no `BRANCH_EXERCISED` branch records.
5. Preserve existing line records, counts, and `changed_files_with_zero_exercised_lines` exactly.
6. Sort branch records deterministically by path, line, block_id, branch_id.

## Completeness and Exit Code Rules

1. `exerciseHasMaterialGap` returns true if any of the following is true:
   - `not_exercised_lines > 0`
   - `unresolved_lines > 0`
   - `branch_records` is defined and (`not_exercised_branches > 0` or `unresolved_branches > 0`)
2. `decideReceiptExitCode` continues to return exit code `4` when completeness is `materially_incomplete`. No new exit-code branch is required.
3. Branch gaps are additive; they do not override or suppress line-level completeness.

## Validation Rules

1. `validateExercise` must validate branch records when present:
   - each `BranchRecordV1.path` must be a canonical repository-relative path;
   - `line` must be a positive integer;
   - `block_id` and `branch_id` must be non-empty strings;
   - `taken` must be a non-negative integer or `null`;
   - `state` must match `taken` (`>0` → `EXERCISED`, `=0` → `NOT_EXERCISED`, `null` → `UNRESOLVED`);
   - `UNRESOLVED` records must have a non-empty `reason`;
   - duplicate branch identities are prohibited;
   - branch records must intersect changed new-line ranges.
2. `validateExercise` must not fail when `branch_records` is absent.
3. Summary counts (`exercised_branches`, `not_exercised_branches`, `unresolved_branches`, `changed_files_with_zero_exercised_branches`) must match actual branch records.

## Product Immutability Gate

Spec 004 closeout must verify against the canonical planning base that:

- no unauthorized `src/` file changed;
- `specs/001.../contracts/receipt-v1.schema.json` did not change in a non-additive way;
- `src/receipt/model.ts` changes are limited to additive `BranchRecordV1` and optional `ExerciseV1` branch fields;
- `package.json` and `package-lock.json` did not change;
- historical `benchmarks/results/t078-selector-misses.json`, `t091-m2-selection-replay.json`, and `t095-branch-exercise-qualification.json` were not overwritten.

## Test Strategy

Focused tests prove parser semantics, exercise semantics, receipt validation, and backward compatibility. Project CI then proves repository-wide compatibility on Ubuntu 24.04, macOS 14, Windows Server 2025 with Node 22 and 24.

### T101 — LCOV branch parser contracts

Proves:
- repository-safe `SF:` mapping for branch records;
- exact `BRDA` four-field parsing;
- numeric taken / unknown `-` semantics;
- deterministic tuple identity and ordering;
- repeated numeric aggregation with safe overflow handling;
- any unknown observation for an identity remains unresolved;
- malformed/incomplete/path-unsafe input fails closed;
- no `src/` product behavior change.

### T102 — Branch exercise contracts

Proves:
- branch-only gap is identified only when the declared changed line is line-exercised and at least one changed branch is not exercised;
- fully-exercised control yields no branch gap;
- unknown branch remains unresolved;
- branches outside changed ranges do not count as changed-branch gaps;
- deterministic semantic result ordering/serialization;
- backward compatibility: line-only fixtures produce identical line records, completeness, and exit code;
- completeness derivation includes branch gaps;
- exit code 4 is produced for materially incomplete branch evidence.

### T103 — Branch receipt validation contracts

Proves:
- `validateExercise` accepts receipts with optional `branch_records`;
- `validateExercise` rejects malformed branch records;
- `validateExercise` does not fail when `branch_records` is absent;
- summary counts match actual branch records;
- duplicate branch identities are rejected;
- branch records outside changed ranges are rejected.

## Trust / Security / License

No new executable authority, dependency, network access, secret use, untrusted source execution, or donor code is introduced. LCOV input is treated as data and repository path containment remains fail-closed.

## Rollback / Failure

If integration cannot be made deterministic or honest without changing product/schema semantics, close `NO_GO` and return to planning. Do not widen Spec 004.
