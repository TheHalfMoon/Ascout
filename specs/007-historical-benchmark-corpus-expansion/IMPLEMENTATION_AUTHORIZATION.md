# Implementation Authorization: Spec 007 Historical Benchmark Corpus Expansion

**Spec:** 007  
**Status:** AUTHORIZATION_PENDING_MERGE  
**Canonical base:** `b755e8765589ebe5c8a4ee6cb9cc9381e4e4fd45`  
**Authorization ledger:** #157  
**Date:** 2026-09-04

## Authority chain

This authorization binds, in order:

1. `.specify/memory/constitution.md`
2. `docs/founding/MASTER_PLAN_V1.md`
3. `docs/strategy/POST_M1_VERIFICATION_ROADMAP.md`
4. `specs/007-historical-benchmark-corpus-expansion/GAP_EVIDENCE.md`
5. `specs/007-historical-benchmark-corpus-expansion/spec.md`
6. `specs/007-historical-benchmark-corpus-expansion/clarifications.md`
7. `specs/007-historical-benchmark-corpus-expansion/ponytail-review.md`
8. `specs/007-historical-benchmark-corpus-expansion/plan.md`
9. `specs/007-historical-benchmark-corpus-expansion/plan-ponytail-review.md`
10. `specs/007-historical-benchmark-corpus-expansion/tasks.md`
11. `specs/007-historical-benchmark-corpus-expansion/checklists/requirements.md`
12. `specs/007-historical-benchmark-corpus-expansion/CANDIDATE_REVIEW.md`
13. `specs/007-historical-benchmark-corpus-expansion/analysis.md`
14. `specs/007-historical-benchmark-corpus-expansion/FINAL_PLAN_AUDIT.md`
15. Issue #155 canonical planning closeout
16. Issue #157 implementation-authorization ledger

## Canonical planning merge binding

- **Planning merge SHA:** `b755e8765589ebe5c8a4ee6cb9cc9381e4e4fd45`
- **Planning merge tree:** `5cd1ae8f2f2c1dbb6b29ec5f79fa7fa33f7106c5`
- **Planning merge parent 1:** `4900f246e19c25c399074672b626fa8df4b5312f`
- **Planning merge parent 2:** `7cc14cda35556cfbc73cb9403996dd9644ef3e8f`
- **Planning merge signature:** GitHub-verified PGP signature present (`verified=true`, `reason=valid`)
- **Planning PR:** #156 (`MERGED`)
- **Planning Project CI:** run `33877818737`, attempt 2, exact-head six-lane success
- **Planning Self Verification:** run `33877818765`, exact-head success
- **Planning independent review:** CodeRabbit issue comment `5541086338`, exact head `7cc14cda35556cfbc73cb9403996dd9644ef3e8f`, no material findings
- **Planning review threads:** zero unresolved threads at merge gate
- **Planning ledger:** Issue #155, `SPEC_007_PLANNING = CLOSED_CANONICAL`

The first Project CI attempt contained one Windows/Node 24 timeout in a pre-existing regression test. The planning branch was not mutated. The same exact-head job was rerun and attempt 2 completed successfully across all six required lanes. Both attempts remain part of the evidence record.

This authorization becomes effective only when this file itself is merged into canonical `main`, the authorization PR is exact-head qualified and independently reviewed, and the resulting merge identity is post-merge verified. It does not backdate implementation authority.

## Authorized task sequence

`T110 -> T111 -> T112 -> T113 -> T114`, executed strictly in canonical order.

- T110 may begin only after this authorization is `CLOSED_CANONICAL / EFFECTIVE`.
- T111 may begin only after `T110 = CLOSED_CANONICAL`.
- T112 may begin only after `T111 = CLOSED_CANONICAL / QUALIFIED`.
- T113 may begin only after both T111 and T112 are canonically qualified.
- T114 may begin only after `T113 = CLOSED_CANONICAL`.

If either candidate fails qualification under the frozen contract, the current two-case plan is `NO_GO / RETURN_TO_PLANNING`. Authority MUST NOT be silently widened to replace a candidate, patch product behavior, weaken integrity gates, or add generalized benchmark infrastructure.

## Exact candidate bindings

### Jotai identical split-item write regression

- repository: `pmndrs/jotai`
- base commit: `0e501cb343b2cbeaf5daaa9877e7aae9c6a95bd8`
- fix commit: `e306723228cf1316da7126f7badf7392fea175e2`
- production path: `src/vanilla/utils/splitAtom.ts`
- oracle test: `tests/react/vanilla-utils/splitAtom.test.tsx`
- planning-observed runner: Vitest/jsdom
- planning-observed lockfile family: Yarn v1
- planning-observed license: MIT

Implementation MUST reverify exact base/fix parentage, trees, changed-file scope, package/lock/config identities, exact license bytes and file-level suitability, package-manager/runtime provenance, and every current manifest field before activation.

### Immer DraftMap iterator compatibility regression

- repository: `immerjs/immer`
- base commit: `89acf94dc4e9a2b0e368347aef9926002980c6ae`
- fix commit: `858d0365aa292a1f2028ccac3dfa8fccfbfa75c4`
- production path: `src/plugins/mapset.ts`
- oracle test: `__tests__/map-set.js`
- planning-observed runner: Vitest/Node
- planning-observed lockfile family: Yarn v1
- planning-observed license: MIT

Implementation MUST reverify the same identity/license/runtime facts and additionally prove before replay that the exact pinned Node runtime exposes the Iterator semantics required by the regression oracle. No benchmark-only polyfill, source rewrite, or test weakening is authorized.

## Binding benchmark rules

1. The existing benchmark case schema and lifecycle are reused unchanged.
2. New manifest records begin as `CASE_REVIEWED` with `oracle.observation = null`.
3. Production-fix reconstruction MUST withhold the regression-test delta from the measured subject tree.
4. The measured oracle MUST be hermetic: no live network, credentials, mutable hosted services, or undeclared local state.
5. Existing reconstruction, isolated execution, membership capture, metrics, and assertions are reused unless a separately canonicalized authority amendment proves a narrowly scoped benchmark-only compatibility change is required.
6. No generalized benchmark framework refactor is authorized.
7. Comparator results are factual `hit | miss | unavailable` observations. `unavailable` MUST NOT be fabricated, converted, or omitted from availability accounting.
8. No universal recall threshold or score target may be introduced after seeing outcomes.
9. Historical benchmark publications remain immutable, including at minimum:
   - `benchmarks/results/t078-selector-misses.json`
   - `benchmarks/results/t091-m2-selection-replay.json`
   - `benchmarks/results/t095-branch-exercise-qualification.json`
10. Existing absolute integrity gates remain unchanged:
    - cross-tree evidence leakage = 0;
    - binding-integrity violations = 0;
    - stable material exercise gap returning exit 0 = 0.

## T110 — Freeze expanded selection manifest

### Authorized repository mutation surface

Exactly:

- `benchmarks/README.md`
- `benchmarks/manifest.json`

No other repository path is authorized under T110 without a prospective canonical authority amendment.

### Required T110 behavior

T110 MUST:

1. reverify canonical main and this effective authorization;
2. reverify both candidate public Git identities, direct parentage, trees, changed-file scope, package/lock/config identities, and licenses immediately before mutation;
3. record exact byte SHA-256 values required by the current manifest schema rather than substituting Git object IDs;
4. select and bind exact package-manager executable versions and exact Node runtimes with provenance;
5. increment manifest revision;
6. change selection `maximum_cases` from 6 to 8 while keeping `minimum_cases` at 5;
7. keep gap bounds at 3–4;
8. add exactly the Jotai and Immer selection case records in `CASE_REVIEWED` state with no oracle observation;
9. preserve every existing case identity and semantic field unless a separate exact correction is prospectively authorized;
10. add a README successor note that founding publications used the historical 5–6 selection contract while Spec 007 introduces the additive successor 5–8 contract;
11. preserve all historical result bytes;
12. perform no donor installation, build, test, or replay.

### T110 qualification

T110 requires:

- exact two-path purity;
- recorded pre-mutation historical result blob identities and unchanged post-mutation identities;
- focused manifest/harness validation under the current repository tests;
- full exact-head Project CI across Ubuntu 24.04, macOS 14, Windows 2025 x Node 22/24;
- fresh independent substantive exact-head review;
- reconciliation of every material finding;
- zero unresolved material review threads;
- unchanged final head after qualification/review;
- guarded merge with expected head SHA;
- post-merge ordered-parent/tree/GitHub-signature/PR/main verification;
- durable `T110 = CLOSED_CANONICAL` before T111 execution.

## T111 — Jotai isolated qualification replay

### Repository mutation

None by default.

T111 may execute donor code only through the canonical isolated benchmark execution path after T110 is canonically closed.

### Required evidence

T111 MUST establish from exact execution evidence:

- exact canonical T110 manifest and Ascout verifier identity;
- exact clone/object availability for the bound Jotai base/fix/oracle objects;
- production-fix reconstruction with regression-test anti-leakage;
- immutable/frozen dependency installation under the exact authorized package-manager/runtime route;
- no secrets, live network, hosted service, or undeclared mutable-state requirement;
- at least two bounded repetitions;
- independent oracle execution;
- comparator membership classification;
- deterministic repeated observations under the existing harness rules;
- successful replay evidence reaching `BENCHMARK_ACTIVE` observation without weakening any gate.

If any condition fails, record exact failure and return to planning. T111 authorizes no product, selector, harness, workflow, schema, manifest, or result mutation to force qualification.

Close durably as `T111 = CLOSED_CANONICAL / QUALIFIED` before T112.

## T112 — Immer isolated qualification replay

### Repository mutation

None by default.

T112 inherits every T111 integrity/hermeticity/repetition requirement and additionally MUST prove before replay that the exact pinned Node runtime supports the Iterator behavior required by the selected regression oracle.

No polyfill, source rewrite, benchmark-only compatibility shim, test weakening, or alternate oracle is authorized.

Close durably as `T112 = CLOSED_CANONICAL / QUALIFIED` before T113.

## T113 — Publish expanded-corpus metrics

### Authorized repository mutation surface

Exactly:

- `benchmarks/results/t113-historical-corpus-expansion.json`

### Required T113 behavior

T113 MUST:

1. use canonical Ascout and T110 manifest identities;
2. use only qualified T111/T112 replay evidence;
3. run the current metrics/assertion machinery over the complete eight-case selection corpus;
4. preserve exact `hit | miss | unavailable` outcomes and explicit availability counts;
5. add no universal recall threshold or acceptance percentage;
6. bind exact verifier commit/tree, manifest revision, active case identities, execution provenance, timing/provenance fields required by the current format, and absolute integrity assertions;
7. publish one additive result only;
8. prove historical T078/T091/T095 blob identities remain unchanged before and after publication.

### T113 qualification

T113 requires exact one-path purity, focused result validation/assertions, exact-head Project CI 6/6, fresh independent substantive exact-head review, zero unresolved material threads, guarded expected-head merge, ordered-parent/tree/signature/PR/main post-merge proof, and durable `T113 = CLOSED_CANONICAL` before T114.

## T114 — Reconcile expanded-corpus observation

T114 is ledger/governance reconciliation only by default. No code, workflow, product, manifest, historical-result, or new benchmark-result mutation is authorized.

T114 MUST record:

- exact T110 and T113 merge identities;
- exact T111/T112 replay identities and outcomes;
- final eight-case Ascout/full/plain/related availability/hit/miss facts;
- measured runtime/candidate friction or rejection facts;
- historical-result immutability proof;
- absolute integrity assertion status;
- explicit confirmation that no selector/product behavior was changed in response to benchmark results.

If all Spec 007 acceptance criteria are proven:

`T114 = CLOSED_CANONICAL`

`SPEC_007 = CLOSED_CANONICAL / GO`

Otherwise:

`SPEC_007 = NO_GO / RETURN_TO_PLANNING`

## Qualification and merge discipline

Every repository-mutating unit independently requires:

1. branch from exact canonical `main` after predecessor closeout;
2. exact authorized-path purity;
3. historical benchmark-result immutability where applicable;
4. focused proof plus full repository typecheck/test/build as applicable;
5. exact-head Project CI success across all six required lanes;
6. fresh independent substantive review of the exact final head;
7. reconciliation of every material finding;
8. zero unresolved material review threads;
9. unchanged final head after qualification/review;
10. guarded merge with expected head SHA;
11. post-merge verification of ordered parents, tree, GitHub signature, PR state, canonical `main`, and absence of intervening main movement;
12. durable canonical task closeout before successor work.

Any head mutation invalidates prior exact-head CI/review evidence.

## Hard prohibitions

1. No `src/**` product mutation under Spec 007.
2. No receipt schema/model/version or CLI mutation.
3. No selector algorithm or command-admission behavior mutation.
4. No current Project CI or self-verification workflow/harness mutation.
5. No new product/runtime dependency.
6. No live-network measured oracle.
7. No generalized benchmark framework refactor.
8. No hidden, synthetic, or fabricated comparator result.
9. No rewrite of historical benchmark result files.
10. No recall/score target invented after observing results.
11. No selector shadow, adversarial receipt corpus, mutation/property/fuzz/counterfactual, or M2 implementation work.
12. No release, Git tag, GitHub Release, or npm publication.
13. No force-push, rebase of shared history, or destructive history rewrite.
14. No fabricated evidence, CI, review, replay result, runtime capability, authority, qualification, or completion claim.
15. No task starts before its predecessor and exact authorization/closeout gates are canonical.

## Founder standing approval

The founder's standing approval for ordinary authorized repository work is recorded prospectively. It applies only to the exact T110 -> T111 -> T112 -> T113 -> T114 sequence, candidate identities, repository mutation surfaces, evidence requirements, qualification rules, and prohibitions above.

It becomes effective only when this authorization file itself is merged into canonical `main` and the authorization merge identity is post-merge verified.

## Authorization closeout criteria

This implementation authorization is `CLOSED_CANONICAL / EFFECTIVE` only when:

1. this file is the only repository change in the authorization PR;
2. the authorization PR is based on exact canonical planning merge `b755e8765589ebe5c8a4ee6cb9cc9381e4e4fd45` with `behind_by=0` and that merge as unique merge base;
3. exact-head Project CI succeeds across all six required lanes;
4. a fresh independent substantive exact-head review finds no unresolved material correctness, governance, evidence-integrity, security/hermeticity, portability/runtime, scope, or cross-artifact issue;
5. unresolved material review threads are zero;
6. guarded expected-head merge succeeds without intervening main movement;
7. post-merge ordered parents, merged tree, GitHub signature, PR merged state, and canonical main identity are verified;
8. Issue #157 records `SPEC_007_IMPLEMENTATION_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`.

Until all eight conditions are satisfied, T110 remains unauthorized.