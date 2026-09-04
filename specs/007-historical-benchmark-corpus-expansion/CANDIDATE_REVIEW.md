# Spec 007 Candidate Provenance / License / Replay-Suitability Review

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED
**Review mode:** public Git object/file/license inspection only; no donor installation/build/test execution

## Review rules

A planning candidate may be retained only when public repository evidence establishes:

- exact one-parent base→fix identity;
- a production change and a regression-test change with a reviewable relationship;
- stable package/lock/config authority across base/fix, or an explicitly reviewed reason otherwise;
- a permissive/use-compatible repository license at both identities;
- no measured-oracle requirement for secrets, live network, or mutable hosted services visible in the regression delta;
- a runner/runtime shape that is within Ascout's benchmark research domain;
- no planning-time claim that installation, test execution, oracle failure/pass, membership, or determinism actually occurred.

Planning eligibility is not benchmark qualification.

---

## Candidate A — Jotai identical split-item write

### Exact Git identity

Repository: `pmndrs/jotai`

Base:

- commit: `0e501cb343b2cbeaf5daaa9877e7aae9c6a95bd8`
- tree: `33d450bd864953d773ddc7e12641558e00dee003`
- GitHub commit verification: `verified=true`, `reason=valid`

Fix:

- commit: `e306723228cf1316da7126f7badf7392fea175e2`
- tree: `7c082a27c35f6cb9ecc8b21a582a3fe001aa2f4b`
- sole parent: `0e501cb343b2cbeaf5daaa9877e7aae9c6a95bd8`
- GitHub commit verification: `verified=true`, `reason=valid`
- message: `fix(utils): Do not set a splitted atom when not actually modified (#2088)`

Changed paths in the fix commit are exactly:

- `src/vanilla/utils/splitAtom.ts`
- `tests/react/vanilla-utils/splitAtom.test.tsx`

The production delta avoids writing a replacement array when the selected item is `Object.is`-identical to the existing value. The new regression test explicitly checks that setting item 2 to the identical value leaves the collection reference unchanged.

Planning assessment: production fix and regression oracle are directly related and suitable for anti-leakage reconstruction review.

### Package / lock / runner authority

Base/fix `package.json` blob:

`f818f3db851d27b8674b1b259dc0d3895f85042a`

Observed scripts include:

- `test = vitest --ui --coverage`
- `test:ci = vitest`

Observed Node engine:

`>=12.20.0`

Base/fix lockfile:

- path: `yarn.lock`
- Git blob: `c537e43bbcd43a06f1f006c9a8c1205860349a74`
- format: Yarn lockfile v1

Base/fix Vitest configuration:

- path: `vitest.config.ts`
- Git blob: `4b83beef6d7ce11b24d78c37f9f1d9655ef16ff5`
- environment: `jsdom`
- test root: `tests`

These identities are unchanged across the direct base→fix transition.

### License

Base/fix LICENSE:

- SPDX interpretation: MIT
- Git blob: `7eaa45c5ed3c2adf24b4a1ffad2b9498b23c269f`
- same blob at both identities

Planning license disposition: `LICENSE_METADATA_CLEARED_FOR_BENCHMARK_REVIEW`.

This does not authorize code import into Ascout and does not replace implementation-time exact file-level/use review required by the benchmark manifest.

### External-state review

No live network, credential, hosted service, database, browser service, or other external mutable dependency is introduced by the regression-test delta itself. The test uses the repository's React/Vitest/jsdom stack.

Planning hermeticity disposition: `NO_EXTERNAL_ORACLE_DEPENDENCY_OBSERVED_IN_DELTA`.

### Deferred evidence

Not claimed during planning:

- exact lockfile/LICENSE SHA-256 bytes required by the Ascout case schema;
- exact package-manager executable version selected for replay;
- exact Node runtime selected for replay;
- frozen install success;
- base/fix/oracle reconstructed digests;
- oracle pass/fail behavior under the selected runtime;
- Ascout/full/plain/related membership result;
- repeated-run determinism;
- `BENCHMARK_ACTIVE` qualification.

Those remain T110/T111 implementation-time gates after separate authorization.

### Planning decision

`JOTAI_007 = PLANNING_ELIGIBLE`

---

## Candidate B — Immer DraftMap iterator compatibility

### Exact Git identity

Repository: `immerjs/immer`

Base:

- commit: `89acf94dc4e9a2b0e368347aef9926002980c6ae`
- tree: `37588093965bb84ab61b9feb2838f8deaebb7311`
- GitHub commit verification: `verified=true`, `reason=valid`

Fix:

- commit: `858d0365aa292a1f2028ccac3dfa8fccfbfa75c4`
- tree: `6cfcfc62532f283f4dbe9f8c5643efef75acc714`
- sole parent: `89acf94dc4e9a2b0e368347aef9926002980c6ae`
- GitHub commit verification: `verified=true`, `reason=valid`
- message: `fix: improve DraftMap.{entries,values}() compatibility#1228 (#1228)`

Changed paths in the fix commit are exactly:

- `src/plugins/mapset.ts`
- `__tests__/map-set.js`

The production delta makes DraftMap iterators self-iterable and uses `Iterator.from` when the runtime supplies the ES2025 Iterator global. The regression delta checks both self-iterability and an ES2025 iterator-helper use.

Planning assessment: production fix and regression oracle are directly related and suitable for anti-leakage reconstruction review.

### Package / lock / runner authority

Base/fix `package.json` blob:

`5eef16ebf240a50415610ce73fd752cf7956bd0b`

Observed scripts include:

- `test:src = vitest run`
- `test = vitest run && yarn test:build && yarn test:flow`

Observed dev runner:

- Vitest `^3.2.6`

Base/fix root lockfile:

- path: `yarn.lock`
- Git blob: `a4078cbffdc1640c0a8021ffad517dae69a03381`
- format: Yarn lockfile v1

Base/fix Vitest configuration:

- path: `vitest.config.ts`
- Git blob: `93381dae04d8b24d97f5d78dbc16802fcbe2539a`
- environment: `node`
- include: `**/__tests__/**/*.[jt]s?(x)`

These root test authorities are unchanged across the direct base→fix transition. The base commit itself changes only `website/yarn.lock`; the selected fix's direct parent relationship is still exact and the root benchmark lockfile/package/config identities remain stable.

### License

Base/fix LICENSE:

- SPDX interpretation: MIT
- Git blob: `c01411588adb07c56b6bb0cbf50aa112589df1eb`
- same blob at both identities

Planning license disposition: `LICENSE_METADATA_CLEARED_FOR_BENCHMARK_REVIEW`.

### External-state review

The selected regression delta operates on in-process Map/iterator behavior. No live network, credential, hosted service, database, or other external mutable oracle dependency is introduced by the selected test delta.

Planning hermeticity disposition: `NO_EXTERNAL_ORACLE_DEPENDENCY_OBSERVED_IN_DELTA`.

### Material runtime caveat

The regression includes ES2025 Iterator-helper behavior. Planning has not executed the case and therefore MUST NOT claim a particular Node version passes it.

T110/T112 must select and bind an exact current benchmark-supported Node runtime, then prove that the runtime exposes the required Iterator semantics before the case may qualify. No polyfill, source rewrite, or test weakening may be added solely to make the benchmark pass.

### Deferred evidence

Not claimed during planning:

- exact byte SHA-256 values required by the manifest;
- exact package-manager and Node runtime selected;
- frozen install success;
- Iterator runtime capability result;
- reconstructed subject/oracle digests;
- oracle pass/fail behavior;
- membership outcomes;
- repeated-run determinism;
- `BENCHMARK_ACTIVE` qualification.

### Planning decision

`IMMER_007 = PLANNING_ELIGIBLE_WITH_RUNTIME_GATE`

---

## Rejected candidate — ofetch live-network oracle

Repository: `unjs/ofetch`

Reviewed fix:

`80aa991210135ce0731de605f82b3bf3c6186112`

The direct fix is otherwise attractive: it changes `src/fetch.ts` and `test/index.test.ts`, and the regression asserts cleanup of default fetch options. However, the new regression test performs an actual fetch against:

`https://jsonplaceholder.typicode.com/todos/1`

The test spies on `globalThis.fetch` but does not replace it with a hermetic implementation for that request.

Planning decision:

`OFETCH_007 = REJECTED_LIVE_NETWORK_ORACLE`

No attempt will be made under Spec 007 to add network capture, replay infrastructure, egress policy, or mocks solely to admit this case.

---

## Cohort decision

The planning cohort is frozen to exactly:

1. Jotai
2. Immer

No additional candidate is authorized without a planning amendment and repeat cross-artifact review.

## Overall review result

`CANDIDATE_REVIEW_007 = PASS_FOR_PLANNING`

This result means only that both selected candidates are sufficiently specified to plan a future bounded isolated replay. It is not runtime qualification, benchmark activation, or implementation authorization.
