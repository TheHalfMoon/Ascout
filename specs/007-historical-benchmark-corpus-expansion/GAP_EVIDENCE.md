# Spec 007 Gap Evidence — Historical Benchmark Corpus Expansion

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED
**Canonical planning base:** `4900f246e19c25c399074672b626fa8df4b5312f`
**Predecessor:** Spec 006 `CLOSED_CANONICAL / GO`

## Ordered roadmap position

The post-M1 research roadmap orders M1.2 work as:

1. self-verification;
2. historical benchmark corpus expansion;
3. selector shadow mode;
4. adversarial receipt corpus.

Spec 006 canonically closed the self-verification workstream. This planning package investigates only the next ordered historical-corpus workstream. It does not authorize selector shadow, adversarial receipt work, M2 mutation/counterfactual work, or product-core mutation.

## Current measured selection-corpus state

The founding benchmark manifest is revision 11 and constrains the selection corpus to 5–6 cases. Six selection cases are currently published:

- `react-hook-form-value-as-date@2`
- `tanstack-streamed-query-reducer@1`
- `trpc-streaming-onerror-cause@2`
- `zod-jitless-allows-eval@1`
- `zod-scientific-exponents@1`
- `zustand-persist-latest-state@1`

The historical T078 publication must remain immutable.

The post-Spec-002 T091 replay records the current selector state over those same six cases:

| Comparator | Hit | Miss | Unavailable |
| --- | ---: | ---: | ---: |
| Ascout | 3 | 0 | 3 |
| Full suite | 6 | 0 | 0 |
| Runner-native related | 6 | 0 | 0 |
| Plain project test | 0 | 0 | 6 |

Thus current Ascout oracle-membership evidence is observable for only 3/6 frozen selection cases. The remaining 3/6 are honestly unavailable. This is not evidence that selector logic is wrong; it is evidence that the founding corpus is a small, structurally concentrated measurement set with limited Ascout-comparator observability.

## Why expansion is justified

The founding corpus intentionally capped selection cases at six before data existed. That cap was a YAGNI bound, not a claim that six cases are permanently sufficient.

A bounded expansion is now justified because:

1. Spec 002 materially changed one selection-config behavior and T091 showed the benchmark can distinguish repaired behavior from historical publication without rewriting history;
2. only half of the current selection cases expose an Ascout membership outcome;
3. the six cases come from five repositories, with Zod represented twice and several cases sharing npm/pnpm plus conventional unit-runner shapes;
4. the next roadmap workstream explicitly calls for careful historical-corpus expansion before selector shadow mode;
5. expanding by two independently reviewed cases can add repository/runtime/config diversity without creating benchmark infrastructure for its own sake.

## Planning cohort

Two new selection candidates are frozen for planning review only. Neither is benchmark-active and neither has been executed by Ascout under Spec 007 planning.

### Candidate A — Jotai identical split-item write

Repository: `pmndrs/jotai`

- base commit: `0e501cb343b2cbeaf5daaa9877e7aae9c6a95bd8`
- base tree: `33d450bd864953d773ddc7e12641558e00dee003`
- fix commit: `e306723228cf1316da7126f7badf7392fea175e2`
- fix tree: `7c082a27c35f6cb9ecc8b21a582a3fe001aa2f4b`
- fix commit verification: GitHub `verified=true`, `reason=valid`
- production path: `src/vanilla/utils/splitAtom.ts`
- regression test path: `tests/react/vanilla-utils/splitAtom.test.tsx`
- regression intent: setting a split item to an identical value must not replace the collection reference
- package manifest blob, base/fix: `f818f3db851d27b8674b1b259dc0d3895f85042a`
- lockfile: `yarn.lock`, blob `c537e43bbcd43a06f1f006c9a8c1205860349a74`, unchanged base/fix
- runner: Vitest; `test:ci = vitest`
- Vitest config blob: `4b83beef6d7ce11b24d78c37f9f1d9655ef16ff5`; jsdom environment, tests rooted under `tests`
- repository license: MIT; LICENSE blob `7eaa45c5ed3c2adf24b4a1ffad2b9498b23c269f`, unchanged base/fix
- external service/network requirement observed in the regression delta: none

Planning disposition: `PLANNING_ELIGIBLE`, subject to implementation-time exact-byte digest completion and isolated replay.

### Candidate B — Immer DraftMap iterator compatibility

Repository: `immerjs/immer`

- base commit: `89acf94dc4e9a2b0e368347aef9926002980c6ae`
- fix commit: `858d0365aa292a1f2028ccac3dfa8fccfbfa75c4`
- fix tree: `6cfcfc62532f283f4dbe9f8c5643efef75acc714`
- fix commit verification: GitHub `verified=true`, `reason=valid`
- production path: `src/plugins/mapset.ts`
- regression test path: `__tests__/map-set.js`
- regression intent: DraftMap `values()`/`entries()` iterators are self-iterable and compatible with ES2025 iterator helpers when available
- package manifest blob, base/fix: `5eef16ebf240a50415610ce73fd752cf7956bd0b`
- lockfile: `yarn.lock`, blob `a4078cbffdc1640c0a8021ffad517dae69a03381`, unchanged base/fix
- runner: Vitest; `test:src = vitest run`
- Vitest config blob: `93381dae04d8b24d97f5d78dbc16802fcbe2539a`; Node environment, `__tests__` include pattern
- repository license: MIT; LICENSE blob `c01411588adb07c56b6bb0cbf50aa112589df1eb`, unchanged base/fix
- external service/network requirement observed in the regression delta: none

Planning disposition: `PLANNING_ELIGIBLE`, subject to implementation-time exact-byte digest completion, runtime compatibility proof, and isolated replay.

## Rejected candidate evidence

`unjs/ofetch` fix `80aa991210135ce0731de605f82b3bf3c6186112` was examined and rejected for this cohort. Although it has a clean production-plus-regression-test delta, its new test invokes `https://jsonplaceholder.typicode.com/todos/1` through the real `globalThis.fetch` implementation. A measured benchmark oracle must not depend on live network state by default.

Disposition: `REJECTED_LIVE_NETWORK_ORACLE`.

This rejection is evidence that corpus expansion remains fail-closed rather than maximizing case count.

## Measured gap statement

`GAP_007_001 = FOUNDING_SELECTION_CORPUS_STRUCTURALLY_BOUNDED_AND_PARTIALLY_OBSERVABLE`

The gap is not "Ascout must hit 100%". The gap is that the current six-case corpus is too small and concentrated to support the next stage of benchmark truth without carefully adding independent, replayable historical cases.

## Hard evidence boundaries

Spec 007 planning MUST preserve:

- all historical result files byte-for-byte;
- no product or selector behavior change to improve benchmark outcomes;
- no donor execution before separate implementation authorization;
- no network-dependent oracle admission;
- no synthetic pass/fail evidence;
- no pre-data recall threshold;
- unavailable comparator outcomes remain unavailable;
- exact base/fix/oracle provenance and license review before activation;
- benchmark-active status only after repeated isolated replay proves the case.
