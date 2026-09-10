# Spec 012 Technical Plan — LCOV Negative Branch-Taken Fidelity

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #282
**Canonical base:** `f1d8df1c67cb6ac607a7b89346af36ffb55684ad`

## 1. Objective

Change one taken-token rule in `normalizeLcovBranchCoverage` so signed-negative integers
are unknown (like `"-"`) instead of evidence-invalid, without changing any other
normalization, validation, planner, receipt, or execution behavior.

## 2. Planned implementation surfaces

### T122 — Normalizer rule plus contracts

Exactly:

- `src/coverage/lcov.ts` — accept `^-\d+$` taken tokens as unknown in the branch
  normalizer only;
- `tests/t122-lcov-negative-taken.contract.test.ts` — new focused deterministic contracts.

### T123 — Reconciliation

Ledger/governance only by default. No tracked repository mutation is planned.

No `benchmarks/**`, workflow, receipt/schema/validator, discovery/planner/selector,
CLI, config surface, package metadata, lockfile/dependency, benchmark-result, Spec 007,
or release/tag/publication mutation.

## 3. Exact rule change

In `normalizeLcovBranchCoverage`, replace:

```text
const taken = fields[3] === "-" ? null : parseNonnegativeSafeInteger(fields[3]);
if (fields[3] !== "-" && taken === null) return unresolvedBranch(REASON_INVALID_TAKEN);
```

with logic accepting `fields[3] === "-"` or `/^-\d+$/u.test(fields[3])` as unknown
(`taken = null`), keeping `parseNonnegativeSafeInteger` for the remaining shapes and
`REASON_INVALID_TAKEN` for everything else that fails to parse. No helper-signature
change is required; a minimal local predicate keeps the diff reviewable.

`addBranchObservation`, `normalizeLcovLineCoverage`, and all reason constants are
unchanged. The negative observation flows through the existing unknown-poisoning
aggregation and surfaces as taken `null`, state `BRANCH_UNRESOLVED`, reason
`LCOV branch taken count is unknown`.

## 4. Fail-closed taxonomy

Focused contracts must cover, at minimum:

1. exact `"-"` stays unknown (existing behavior, pinned);
2. `"-0"`, `"-1"`, `"-4"` are unknown with reason `LCOV branch taken count is unknown`;
3. the measured record shape `BRDA:1628,166,1,-4` normalizes inside a realistic record;
4. `"+4"`, `"1.5"`, `"NaN"`, `"Infinity"`, `"0x10"`, `""`, `" 4"`, `"4 "`, `"--4"`,
   `"- 4"` remain `REASON_INVALID_TAKEN`;
5. wrong field counts, empty block/branch ids, zero/negative line numbers keep
   `REASON_MALFORMED_BRANCH`;
6. unknown poisons numeric repeats regardless of order;
7. numeric-only repeats aggregate identically to before;
8. line coverage rejects negative `DA` counts (untouched rule, pinned);
9. a full realistic LCOV excerpt containing one negative record resolves with all other
   observations byte-identical to the pre-change resolution of the same excerpt minus
   the negative record.

## 5. Determinism and testability

The rule is unit-testable from in-memory LCOV strings via the existing exported
`normalizeLcovBranchCoverage` / `normalizeLcovLineCoverage` entry points, without
touching the filesystem, launching processes, or reading environment. Identical input
text always produces identical outcomes.

## 6. Privacy and paths

No path-handling change. No new persisted field. Raw LCOV text handling is unchanged.

## 7. No other behavior change

Implementation must prove through existing plus focused tests that line normalization,
machine-result validation, planner gating, receipt building/validation, exit-code
derivation, and the full repository suite behave identically except for evidence sets
containing negative taken counts reaching downstream instead of stopping invalid.

Full repository `npm test`, `npm run typecheck`, and `npm run build` must pass as
applicable on the exact implementation head.

## 8. Qualification and merge gates

T122 requires the standard exact-head gates: reverified canonical base, one-task branch
purity (exactly the two authorized paths), focused proof, full tests/typecheck/build,
exact-head Self Verification success, original-attempt six-lane Project CI success,
fresh independent substantive exact-head review with zero unresolved material threads,
live rules/protection revalidation, unchanged base immediately before guarded
expected-head normal merge, and post-merge ordered-parent/tree/signature/PR/main proof.

On any material mismatch: `NO_GO / RETURN_TO_PLANNING`.

## 9. Budget

No new execution timeout, job timeout, or retention change. Normalization is synchronous
in-memory work. No benchmark replay beyond the standard Self Verification receipt on the
exact head.
