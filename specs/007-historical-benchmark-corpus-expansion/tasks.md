# Specification 007 Tasks — Historical Benchmark Corpus Expansion

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED
**Canonical order:** T110 → T111 → T112 → T113 → T114

No task in this file is implementation-authorized by planning alone. A separate durable implementation authorization must bind the exact canonical planning merge before T110 begins.

## T110 — Freeze expanded selection manifest

### Default authorized repository paths

Exactly:

- `benchmarks/README.md`
- `benchmarks/manifest.json`

### Required work

1. Reverify canonical main and the implementation authorization.
2. Reverify exact Jotai and Immer public Git identities, base/fix parentage, changed-file scope, lockfile/package/config identities, and licenses immediately before mutation.
3. Complete all current manifest-schema fields, including exact byte SHA-256 values and runtime/package-manager provenance.
4. Increment manifest revision.
5. Change selection maximum from 6 to 8; keep minimum 5 and gap bounds 3–4 unchanged.
6. Add exactly the two approved selection case records in `CASE_REVIEWED` state with `oracle.observation = null`.
7. Add a README successor note that the founding publication used the historical 5–6 contract while Spec 007 authorizes an additive 5–8 successor contract.
8. Preserve all historical results and every existing case identity/semantic field unless an exact correction is separately authorized.

### Qualification

- exact two-path purity;
- historical result blob immutability;
- focused manifest/harness validation;
- full Project CI 6/6;
- fresh independent substantive exact-head review;
- zero material findings/threads;
- guarded expected-head merge;
- ordered-parent/tree/signature/PR/main post-merge proof;
- durable `T110 = CLOSED_CANONICAL` before donor execution.

## T111 — Jotai isolated qualification replay

### Repository mutation

None by default.

### Exact candidate binding

- repo: `pmndrs/jotai`
- base: `0e501cb343b2cbeaf5daaa9877e7aae9c6a95bd8`
- fix: `e306723228cf1316da7126f7badf7392fea175e2`
- production path: `src/vanilla/utils/splitAtom.ts`
- oracle test: `tests/react/vanilla-utils/splitAtom.test.tsx`

### Required evidence

- exact canonical T110 manifest and Ascout verifier identity;
- exact clone/object availability;
- correct production-fix reconstruction with regression-test anti-leakage;
- immutable/frozen dependency installation under the exact authorized runtime/package-manager route;
- no secrets/live network/hosted-service requirement;
- at least two bounded repetitions;
- independent oracle execution and comparator membership classification;
- deterministic observations under current harness rules;
- result reaches `BENCHMARK_ACTIVE` observation without weakening any gate.

If qualification fails, record exact failure and return to planning. Do not modify product/selector/harness to force qualification.

Close `T111 = CLOSED_CANONICAL / QUALIFIED` before T112.

## T112 — Immer isolated qualification replay

### Repository mutation

None by default.

### Exact candidate binding

- repo: `immerjs/immer`
- base: `89acf94dc4e9a2b0e368347aef9926002980c6ae`
- fix: `858d0365aa292a1f2028ccac3dfa8fccfbfa75c4`
- production path: `src/plugins/mapset.ts`
- oracle test: `__tests__/map-set.js`

### Additional runtime gate

Before replay, prove that the exact pinned Node runtime used for the case supports the Iterator semantics required by the regression oracle. No polyfill or source rewrite may be introduced merely to satisfy the benchmark.

### Required evidence

Same as T111, including two or more bounded deterministic repetitions and `BENCHMARK_ACTIVE` replay observation.

Close `T112 = CLOSED_CANONICAL / QUALIFIED` before T113.

## T113 — Publish expanded-corpus metrics

### Default authorized repository path

Exactly:

- `benchmarks/results/t113-historical-corpus-expansion.json`

### Required work

1. Use canonical Ascout and manifest identities after T110.
2. Use qualified T111/T112 replay evidence.
3. Run current metrics/assertion machinery over the complete eight-case selection corpus.
4. Preserve exact `hit | miss | unavailable` outcomes.
5. Publish availability counts explicitly.
6. Keep `no_pre_data_recall_threshold = true` and add no new acceptance percentage.
7. Require existing absolute integrity assertions to remain satisfied.
8. Bind exact run/verifier/manifest/case provenance in the new result.
9. Prove T078/T091/T095 blobs unchanged before and after publication.

### Qualification

- exact one-path purity;
- focused result validation/assertions;
- Project CI 6/6;
- fresh independent substantive exact-head review;
- zero material findings/threads;
- guarded expected-head merge;
- ordered-parent/tree/signature/PR/main post-merge proof;
- durable `T113 = CLOSED_CANONICAL` before closeout.

## T114 — Reconcile expanded-corpus observation

Ledger/governance only by default.

Record:

- exact T110/T113 merge identities;
- exact T111/T112 replay identities and outcomes;
- final eight-case Ascout/full/plain/related availability/hit/miss facts;
- any measured runtime/candidate friction;
- historical result immutability proof;
- absolute integrity assertions;
- explicit statement that no selector/product behavior was changed in response to benchmark results.

If all acceptance is proven:

`T114 = CLOSED_CANONICAL`

`SPEC_007 = CLOSED_CANONICAL / GO`

Otherwise:

`SPEC_007 = NO_GO / RETURN_TO_PLANNING`

## Hard prohibitions

Across T110–T114:

- no `src/**` mutation;
- no receipt/schema/CLI mutation;
- no Project CI/self-verification mutation;
- no selector or command-admission behavior mutation;
- no new product/runtime dependency;
- no live-network measured oracle;
- no hidden or synthetic comparator result;
- no rewrite of historical benchmark results;
- no recall threshold invented after seeing outcomes;
- no selector shadow/adversarial corpus/M2 work;
- no release/tag/npm publication;
- no force-push/rebase/destructive history rewrite;
- no fabricated CI/review/replay/evidence/qualification/completion.
