# Tasks: Branch-Evidence Product Integration

**Spec:** 004  
**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED  
**Canonical order:** T101 → T102 → T103

## T101 — Extend LCOV parser for branch observations

Extend `src/coverage/lcov.ts` to optionally parse `BRDA:` records and return branch observations alongside existing line points.

Required scope:

- `src/coverage/lcov.ts` — add `LcovBranchPoint` interface, `normalizeLcovBranchCoverage` function, and optional branch return from `normalizeLcovLineCoverage` or a new combined function.
- Branch observation types: `path`, `line`, `block_id`, `branch_id`, `taken`, `state`, `reason?`.
- Parser rules: `SF:` mapping, `BRDA:` four-field parsing, numeric taken / unknown `-` semantics, deterministic tuple identity, safe aggregation, fail-closed malformed/containment behavior.
- No `src/` behavior change for existing line parsing.
- No receipt, package, dependency, historical result, publication, release, or tag change.
- Exact-head six-lane Project CI and review reconciliation before merge.

Acceptance:

- repository-safe `SF:` mapping for branch records;
- exact `BRDA` four-field parsing;
- numeric taken / unknown `-` semantics;
- deterministic tuple identity and ordering;
- repeated numeric aggregation with safe overflow handling;
- any unknown observation for an identity remains unresolved;
- malformed/incomplete/path-unsafe input fails closed;
- existing line parsing behavior is unchanged;
- exact-head six-lane Project CI and review reconciliation before merge.

## T102 — Extend exercise builder for branch records

Extend `src/exercise.ts` to accept branch observations and build branch records and branch summary counts while preserving existing line records exactly.

Required scope:

- `src/exercise.ts` — add branch observation parameter to `buildChangedLineExercise`; build `branch_records`, `exercised_branches`, `not_exercised_branches`, `unresolved_branches`, `changed_files_with_zero_exercised_branches`.
- Branch records are sorted deterministically by path, line, block_id, branch_id.
- Line records, counts, and `changed_files_with_zero_exercised_lines` are preserved exactly.
- `src/check.ts` — wire branch observations from LCOV parser to exercise builder.
- No receipt, package, dependency, historical result, publication, release, or tag change.
- Exact-head six-lane Project CI and review reconciliation before merge.

Acceptance:

- branch-only gap is identified only when the declared changed line is line-exercised and at least one changed branch is not exercised;
- fully-exercised control yields no branch gap;
- unknown branch remains unresolved;
- branches outside changed ranges do not count as changed-branch gaps;
- deterministic semantic result ordering/serialization;
- existing line exercise tests pass unchanged;
- backward compatibility: line-only fixtures produce identical line records, completeness, and exit code;
- exact-head six-lane Project CI and review reconciliation before merge.

## T103 — Update receipt model and validation

Update `src/receipt/model.ts` to add `BranchRecordV1`, extend `ExerciseV1` with optional branch fields, update `exerciseHasMaterialGap`, and update `validateExercise` for branch records.

Required scope:

- `src/receipt/model.ts` — add `BranchRecordV1`; extend `ExerciseV1` with optional `branch_records`, `exercised_branches`, `not_exercised_branches`, `unresolved_branches`, `changed_files_with_zero_exercised_branches`; update `exerciseHasMaterialGap`; update `validateExercise` for branch records.
- `tests/t101-lcov-branch-parser.contract.test.ts` — parser/path/aggregation/fail-closed contracts.
- `tests/t102-branch-exercise.contract.test.ts` — branch-line interaction, completeness, exit code, backward compatibility contracts.
- `tests/t103-branch-receipt-validation.contract.test.ts` — receipt validation contracts for optional branch fields.
- `tests/fixtures/lcov/branch-cases.json` — deterministic branch fixtures with declared changed ranges and expected outcomes.
- No `src/cli.ts`, `src/run.ts`, `src/selection.ts`, `src/receipt/json.ts`, `src/receipt/agent.ts` change.
- No receipt schema version change.
- No package, dependency, historical result, publication, release, or tag change.
- Exact-head six-lane Project CI and review reconciliation before merge.

Acceptance:

- branch-only gap is detected when line is `EXERCISED` and branch is `NOT_EXERCISED`;
- fully-exercised branches produce zero false branch gaps;
- unknown/malformed/path-unsafe branch data fails closed or remains unresolved;
- branch evidence is additive and does not alter line-level behavior when absent;
- completeness derivation includes branch gaps;
- exit code 4 is produced for materially incomplete branch evidence;
- deterministic serialization of branch records;
- `validateExercise` accepts receipts with optional `branch_records` and does not fail when absent;
- existing changed-line exercise tests pass unchanged;
- exact-head six-lane Project CI and review reconciliation before merge.

## Execution discipline

For every task T101–T103:

1. re-read canonical `main`, Constitution, Master Plan, Spec 004 authority chain, benchmark policy/result, current PR/review/Actions state;
2. branch from exact canonical `main`;
3. mutate only the current task;
4. qualify exact head;
5. reconcile review/findings on exact head;
6. guarded merge with expected head SHA;
7. verify ordered merge parents/tree/signature/main;
8. record task closeout;
9. begin the next task only after the prior task is closed canonically.

No force-push, rebase, destructive history rewrite, skipped failing gate, product mutation outside authorized surfaces, hidden Windows failure, historical overwrite, publication, release, or future-task mutation before prior canonical closeout.

## Authorization gate

T101 must not begin until the Spec 004 planning chain is canonically merged and a durable implementation-authorization record explicitly binds that planning merge and T101–T103.
