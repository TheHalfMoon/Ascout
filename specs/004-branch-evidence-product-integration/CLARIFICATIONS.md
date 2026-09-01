# Clarifications: Branch-Evidence Product Integration

**Spec:** 004  
**Date:** 2026-09-01  
**Status:** PLANNING  

## C-001 — Does branch evidence change the existing line exercise contract?

**Answer:** No. Line exercise records, counts, and semantics remain unchanged. Branch evidence is added as an additive parallel dimension. When no branch records are present, the receipt is identical to the current behavior.

## C-002 — Does receipt schema version bump to "2.0"?

**Answer:** No. The extension is additive and optional within receipt v1. Old parsers ignore unknown optional fields. The core contract is preserved. Schema version remains `"1.0"`.

## C-003 — What happens when branch data is partially unavailable?

**Answer:** Branches with `taken = -` become `BRANCH_UNRESOLVED` with reason `"LCOV branch taken is unknown"`. Unknown branch data is never collapsed into `EXERCISED` or `NOT_EXERCISED`. Partial unavailability counts toward material incompleteness.

## C-004 — What happens when branch data is malformed?

**Answer:** Malformed `BRDA:` records, incomplete source records, or path-unsafe source paths cause the branch parser to fail closed with a machine-stable reason. No fabricated branch evidence is injected. The run records the failure and marks affected changed sources as unresolved.

## C-005 — Does branch evidence affect exit code precedence?

**Answer:** No new exit-code branch is required. Branch gaps are additive to existing line gaps. If any material gap exists (line or branch), completeness is `materially_incomplete` and the existing path returns exit code `4`.

## C-006 — Can line-only repositories continue working exactly as before?

**Answer:** Yes. Repositories producing LCOV without `BRDA:` records return an empty branch observation set. The exercise builder produces identical line records. Completeness and exit code are derived solely from line evidence. No behavioral change occurs.

## C-007 — Does this authorization include function coverage?

**Answer:** No. Function coverage is explicitly out of scope. Spec 004 authorizes only branch-evidence integration from LCOV `BRDA:` records.

## C-008 — Does this authorization include AST/CFG analysis?

**Answer:** No. AST/CFG reconstruction is unnecessary for LCOV branch evidence and is explicitly rejected by YAGNI.

## C-009 — Does this authorization include CLI/terminal output changes?

**Answer:** Not by default. CLI/terminal/agent output changes are out of scope unless a separate planning artifact explicitly authorizes a minimal additive display change. The default plan preserves existing terminal summary and JSON output.

## C-010 — Does this authorization include new runtime dependencies?

**Answer:** No. The implementation uses only Node.js standard library and existing project code.

## C-011 — Does this authorization include npm publication or release creation?

**Answer:** No. Publication, release, and tag creation are hard prohibitions.

## C-012 — What is the exact authorized file surface?

**Answer:**
- Authorized for mutation: `src/coverage/lcov.ts`, `src/exercise.ts`, `src/receipt/model.ts`, `src/check.ts`, `tests/`.
- Explicitly prohibited from mutation: `src/cli.ts`, `src/run.ts`, `src/selection.ts`, `src/receipt/json.ts`, `src/receipt/agent.ts`, `package.json`, `package-lock.json`, historical benchmark results.

## C-013 — What is the exact authorization boundary for receipt fields?

**Answer:**
- Authorized: additive optional `branch_records`, `exercised_branches`, `not_exercised_branches`, `unresolved_branches`, `changed_files_with_zero_exercised_branches` in `ExerciseV1`; additive `BranchRecordV1` type.
- Prohibited: any change to receipt core fields (`schema_version`, `run`, `source`, `comparison`, `selection`, `tasks`, `changed_code`, `test_changes`, `findings`, `evidence`, `artifacts`, `stability`, `summary`).

## C-014 — How should branch evidence interact with existing changed-line semantics?

**Answer:** Branch evidence is additive and independent. A line can be `EXERCISED` while branches on that line are `NOT_EXERCISED` or `UNRESOLVED`. Branch gaps do not override or suppress line-level completeness; they add to it.

## C-015 — What is the exact promotion gate for Spec 004?

**Answer:** Spec 004 closes `GO` only when:
1. Branch-only gap is detected in product code.
2. Fully exercised branches produce zero false gaps.
3. Unknown/malformed/path-unsafe data fails closed or remains unresolved.
4. Completeness derivation includes branch gaps.
5. Exit code 4 is produced for materially incomplete branch evidence.
6. Existing changed-line exercise tests pass unchanged.
7. Six-lane Project CI is green on the exact closeout head.
8. Product-surface immutability is verified for unauthorized surfaces.
9. Historical benchmark results are unchanged.
