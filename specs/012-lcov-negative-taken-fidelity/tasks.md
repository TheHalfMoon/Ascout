# Specification 012 Tasks — LCOV Negative Branch-Taken Fidelity

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #282

## Dependency order

```text
T122 -> T123
```

No successor starts before its predecessor is durably closed canonical. This chain does
not unblock, absorb, or reorder T120/T121; after T122 merges, T120 requalifies on a new
exact head under its existing authorization.

---

## T122 — Negative-taken rule plus contracts

**State:** `PLANNED / IMPLEMENTATION_NOT_AUTHORIZED`

### Authorized candidate paths after separate implementation authorization

Exactly (amended by Amendment 01, Issue #286):

- `src/coverage/lcov.ts`
- `tests/t122-lcov-negative-taken.contract.test.ts` (new)
- `tests/fixtures/lcov/branch-cases.json` (reconcile the superseded `-1` expectation only)
- `tests/t101-lcov-branch-parser.contract.test.ts` (remove `-1` from the invalid set and pin negative-unknown; all other invalid shapes stay)

### Required behavior

Implement the repository-internal rule defined by `spec.md` and `plan.md`:

1. accept exact `"-"` and `^-\d+$` taken tokens as unknown (`null`) in
   `normalizeLcovBranchCoverage` only;
2. keep `REASON_INVALID_TAKEN` for every other non-unsigned taken shape;
3. keep all other branch reasons, line normalization, aggregation, reason constants,
   and helper signatures unchanged;
4. surface negative observations through the existing unknown shape (taken `null`,
   `BRANCH_UNRESOLVED`, reason `LCOV branch taken count is unknown`);
5. cover the plan.md section 4 taxonomy in the new focused contract file.

### Hard prohibitions

No line-coverage change, no downstream (planner/receipt/validator/exit/CLI) change, no
`benchmarks/**`, workflow, receipt schema/model/validator, discovery/planner/selector,
config surface, package metadata, lockfile/dependency, benchmark-result, Spec 007,
release/tag/publication mutation. No new dependency, action, service, database,
telemetry, plugin framework, parser, executor, config knob, or persisted field.

### Qualification gate

Before T122 may merge:

- exact current canonical base reverified;
- branch contains only the two authorized paths;
- focused tests pass;
- full repository `npm test`, `npm run typecheck`, and `npm run build` pass as applicable;
- exact-head Self Verification succeeds for the PR head as governed;
- Project CI original attempt succeeds in all six required OS/Node lanes;
- fresh independent substantive exact-head review has no material unresolved findings;
- unresolved material review threads = `0`;
- live rulesets/protection reverified;
- canonical base unchanged before guarded merge;
- expected-head normal merge only;
- post-merge ordered parents/tree/signature/PR/main proof recorded;
- T122 issue closed `completed` with exact evidence.

On any material mismatch: `NO_GO / RETURN_TO_PLANNING`.

---

## T123 — Reconciliation and closeout

**State:** `BLOCKED_BY_T122`

Ledger/governance only by default. No tracked repository mutation is authorized merely by
reaching T123.

Reverify live canonical truth and record:

- T122 base, head, tree, PR, CI, review, merge, signature, and closeout issue;
- proof that negative taken counts normalize to unknown while malformed shapes stay
  fail-closed and line coverage is unchanged;
- proof that the T120 staged-run evidence shape now validates;
- all Spec 012 acceptance criteria;
- next-frontier decision (T120 requalification) from then-live repository governance.

If all acceptance criteria are proven:

```text
T123 = CLOSED_CANONICAL
SPEC_012 = CLOSED_CANONICAL / GO
```

Otherwise:

```text
SPEC_012 = NO_GO / RETURN_TO_PLANNING
```

## Global task rules

- no force-push/rebase/history rewrite;
- no rerun-to-green substitution where original-attempt evidence is required;
- no fabricated/missing evidence promotion;
- no unknown-set widening after observing implementation evidence without a separately
  reviewed planning amendment;
- no T120/T121 work absorbed into this chain;
- every later material unit requires its own prospective authorization.
