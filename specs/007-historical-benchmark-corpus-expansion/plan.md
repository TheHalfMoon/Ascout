# Spec 007 Technical Plan — Historical Benchmark Corpus Expansion

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED
**Canonical planning base:** `4900f246e19c25c399074672b626fa8df4b5312f`

## Strategy

Reuse the founding benchmark machinery as-is. Spec 007 adds two case records, qualifies them through the existing `CASE_REVIEWED -> replay -> BENCHMARK_ACTIVE observation` flow, then creates one additive metrics publication.

No product code changes are planned.

## Existing mechanics reused

The canonical benchmark runner already:

- accepts one manifest case by ID;
- requires the input case lifecycle to be `CASE_REVIEWED` with no pre-existing oracle observation;
- performs bounded isolated reconstruction/execution;
- supports 2–3 repetitions;
- returns `BENCHMARK_ACTIVE` replay evidence only after the runner's integrity/oracle checks pass.

The current metrics pipeline consumes replay evidence rather than requiring the manifest record itself to be rewritten to `BENCHMARK_ACTIVE`. Therefore Spec 007 does not need a new lifecycle state or schema.

## Planned implementation sequence

### T110 — Freeze expanded selection manifest

Purpose: add the two exact reviewed case definitions without executing donor code.

Default authorized paths:

- `benchmarks/README.md`
- `benchmarks/manifest.json`

Required changes:

- manifest revision increment;
- selection `maximum_cases: 8` while minimum remains 5;
- exact Jotai case record in `CASE_REVIEWED` state;
- exact Immer case record in `CASE_REVIEWED` state;
- exact implementation-time SHA-256/materialization for lockfiles, licenses, relevant patches/harness artifacts, and any other fields required by current schema;
- exact runtime/package-manager provenance;
- explicit no-network/no-secret oracle limitations;
- README successor note distinguishing founding 5–6 history from Spec 007 additive 5–8 policy.

No donor execution is part of T110.

Qualification: exact-head Project CI, independent substantive review, zero material threads, guarded merge, post-merge identity proof, `T110 = CLOSED_CANONICAL`.

### T111 — Qualify Jotai case by isolated replay

Predecessor: canonically merged T110.

Repository mutation: none by default.

Execute the canonical benchmark runner against the exact Jotai case with at least two repetitions and exact T110 manifest/verifier identity.

Required evidence:

- clone/base/fix/oracle identities match manifest;
- production-fix reconstruction excludes regression-test delta;
- frozen install succeeds under the pinned runtime/package manager;
- oracle test is independently executable and membership can be classified;
- repeated observations are deterministic under the existing rules;
- no live network/secrets/services are required;
- replay result reaches `BENCHMARK_ACTIVE` observation.

If any integrity or hermeticity condition fails, record rejection and return to planning; do not patch product or harness under T111.

Close durably as `T111 = CLOSED_CANONICAL / QUALIFIED` before T112.

### T112 — Qualify Immer case by isolated replay

Predecessor: T111 closed.

Repository mutation: none by default.

Same replay requirements as T111 plus explicit proof that the pinned runtime supports the Iterator behavior needed by the selected regression oracle without adding a benchmark-only polyfill.

Close durably as `T112 = CLOSED_CANONICAL / QUALIFIED` before publication.

### T113 — Publish expanded-corpus metrics

Predecessors: T111 and T112 qualified.

Default authorized path:

- `benchmarks/results/t113-historical-corpus-expansion.json`

Use canonical metrics/assertion machinery over the full current selection case set, including the two qualified replay outputs.

Required publication facts:

- additive result only;
- exact verifier commit/tree and manifest revision;
- all eight selection case identities;
- comparator `hit | miss | unavailable` accounting;
- no invented unavailable data;
- no universal recall threshold;
- historical T078/T091/T095 bytes unchanged;
- absolute integrity assertions unchanged and satisfied;
- bounded timing/provenance according to current metrics format.

Qualification: exact-head Project CI, fresh independent substantive review, zero material threads, guarded merge, post-merge identity verification.

### T114 — Ledger reconciliation and Spec 007 closeout

Ledger/governance only by default.

Record:

- exact T110 and T113 merge identities;
- T111/T112 replay identities/results;
- final eight-case availability/hit/miss facts;
- any candidate friction/rejections;
- historical-result immutability proof;
- absolute integrity status.

If acceptance is proven: `T114 = CLOSED_CANONICAL`, `SPEC_007 = CLOSED_CANONICAL / GO`.
Otherwise: `NO_GO` and return to planning.

## Candidate runtime planning

### Jotai

Observed planning metadata:

- Yarn v1 lockfile;
- Vitest 0.33.0;
- jsdom environment;
- Node engine `>=12.20.0`.

Implementation must select one exact Node version supported by both current benchmark infrastructure and this frozen candidate, and record why.

### Immer

Observed planning metadata:

- Yarn v1 lockfile;
- Vitest 3.2.6;
- Node environment;
- test includes `__tests__`.

Implementation must select one exact Node version that exposes the required Iterator behavior and prove it before accepting the oracle.

## Historical immutability method

Before T110 mutation, record exact blobs for historical result files. At T113 premerge and postmerge, re-fetch them and require identical blob IDs. This is stronger than relying on a textual claim.

## Branch and merge discipline

Every repository-mutating unit:

1. starts from exact canonical predecessor `main` after prior closeout;
2. changes only authorized paths;
3. proves `behind_by=0` and unique predecessor merge base;
4. runs exact-head Project CI across the required six lanes;
5. receives fresh independent substantive exact-head review;
6. reconciles all material findings and threads;
7. guards merge with expected head SHA;
8. verifies ordered parents/tree/GitHub signature/PR/main after merge;
9. records durable closeout before successor work.

Any head mutation invalidates earlier exact-head CI/review evidence.

## Stop conditions

Return to planning instead of broadening authority if:

- either candidate requires live network, secret, hosted service, or undeclared mutable state;
- exact license/provenance cannot be proven;
- regression-test anti-leakage cannot be reconstructed;
- current benchmark runner requires a generalized architecture change;
- current metrics cannot honestly represent an observed outcome without schema/product changes;
- absolute integrity gates fail.
