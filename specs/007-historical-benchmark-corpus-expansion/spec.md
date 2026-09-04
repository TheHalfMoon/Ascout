# Specification 007 — Historical Benchmark Corpus Expansion

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED
**Canonical planning base:** `4900f246e19c25c399074672b626fa8df4b5312f`
**Roadmap slice:** M1.2-B Historical Benchmark Corpus

## Purpose

Expand Ascout's frozen historical selection benchmark by exactly two independently reviewed, replayable JavaScript/TypeScript regression cases without changing product behavior, selector semantics, receipt semantics, or existing historical publications.

The feature is benchmark truth, not benchmark score improvement.

## User value

Ascout maintainers need a broader measurement set before making later selector-shadow or M2 decisions. The corpus must expose how Ascout behaves across more repository/runtime/config shapes while preserving unavailable outcomes and historical truth.

## In scope

1. Admit exactly two planning-approved selection cases after implementation-time provenance/license/runtime re-verification:
   - Jotai identical split-item write regression;
   - Immer DraftMap iterator compatibility regression.
2. Increase the selection-corpus contract upper bound from 6 to 8 while keeping the minimum at 5.
3. Preserve the current case schema and lifecycle semantics.
4. Reuse the existing benchmark harness, metrics, and assertion machinery wherever it already supports the cases.
5. Perform repeated isolated replay before either new case becomes `BENCHMARK_ACTIVE`.
6. Publish one new additive result artifact for the expanded cohort and full current selection set.
7. Record every comparator outcome as `hit`, `miss`, or `unavailable`; do not fabricate unavailable evidence.
8. Keep all pre-Spec-007 result files byte-identical.

## Explicitly out of scope

- `src/**` product mutation;
- receipt/schema/version mutation;
- CLI mutation;
- selector algorithm/config-discovery behavior mutation;
- command-admission mutation;
- current Project CI mutation;
- self-verification workflow/harness mutation;
- automatic selector widening or recall policy;
- selector shadow mode;
- adversarial receipt corpus;
- mutation/property/fuzz/counterfactual evidence;
- new runtime/product dependency;
- untrusted/fork execution;
- network-dependent benchmark oracles;
- release, tag, npm publication, or GitHub Release.

## Functional requirements

### FR-007-001 — Bounded corpus contract

The selection corpus MAY contain up to 8 cases and MUST contain at least 5. Spec 007 adds exactly two cases. It MUST NOT alter the gap-corpus 3–4 bound.

### FR-007-002 — Exact candidate identity

Each new case MUST bind exact upstream repository, base commit/tree, fix commit/tree, oracle delta, production/test paths, lockfile identity, runtime identity, and license evidence before activation.

### FR-007-003 — Regression-test anti-leakage

The reconstructed benchmark subject MUST represent production-fix source state while withholding the regression-test change from the subject tree used for selection measurement. The oracle remains independently known and must not leak into the measured changed source state.

### FR-007-004 — Hermetic measured oracle

A new case MUST NOT require live network, credentials, mutable hosted services, or undeclared local state for the measured oracle. If an external dependency is discovered, the case fails closed and remains non-active.

### FR-007-005 — Existing engine reuse

The current benchmark case schema, Git reconstruction, isolated execution, membership capture, metrics, and assertions MUST be reused unless exact implementation evidence proves a narrowly scoped benchmark-only compatibility change is necessary.

No generalized benchmark framework refactor is authorized.

### FR-007-006 — Lifecycle gate

A planning-approved case begins implementation as non-active. It may become `BENCHMARK_ACTIVE` only after all exact provenance/license/runtime fields are complete and repeated isolated replay establishes the required oracle behavior under the current harness.

### FR-007-007 — Outcome honesty

Every comparator outcome MUST be recorded as observed. `unavailable` is valid factual evidence and MUST NOT be converted to miss/hit or omitted from denominators that explicitly count availability.

### FR-007-008 — No score target

Spec 007 MUST NOT introduce a universal selector recall threshold or require the two new cases to improve Ascout's aggregate score. A discovered miss is publishable evidence, not a reason to mutate product behavior inside this spec.

### FR-007-009 — Historical immutability

At minimum these canonical result files MUST remain byte-identical:

- `benchmarks/results/t078-selector-misses.json`
- `benchmarks/results/t091-m2-selection-replay.json`
- `benchmarks/results/t095-branch-exercise-qualification.json`

No historical result may be rewritten to incorporate Spec 007.

### FR-007-010 — Additive publication

Spec 007 MUST publish a new result file with a new task identity. It MUST bind the exact Ascout verifier commit/tree, manifest revision, active case identities, comparator outcomes, availability accounting, absolute integrity assertions, and execution provenance required by the existing benchmark contract.

### FR-007-011 — Absolute integrity gates

The existing absolute integrity gates remain unchanged:

- cross-tree evidence leakage = 0;
- binding-integrity violations = 0;
- stable material exercise gap returning exit 0 = 0.

Spec 007 MUST NOT weaken these gates to admit a new case.

### FR-007-012 — No donor execution during planning

Planning may inspect public Git objects/files/license metadata only. Donor install/build/test execution begins only after a separate canonical implementation authorization.

## Candidate-specific requirements

### Jotai

The implementation authorization, if granted, must bind:

- base `0e501cb343b2cbeaf5daaa9877e7aae9c6a95bd8`;
- fix `e306723228cf1316da7126f7badf7392fea175e2`;
- production `src/vanilla/utils/splitAtom.ts`;
- oracle test `tests/react/vanilla-utils/splitAtom.test.tsx`;
- unchanged `package.json` and `yarn.lock` identities already observed in planning;
- Vitest/jsdom configuration identity;
- MIT license identity.

### Immer

The implementation authorization, if granted, must bind:

- base `89acf94dc4e9a2b0e368347aef9926002980c6ae`;
- fix `858d0365aa292a1f2028ccac3dfa8fccfbfa75c4`;
- production `src/plugins/mapset.ts`;
- oracle test `__tests__/map-set.js`;
- unchanged `package.json` and `yarn.lock` identities already observed in planning;
- Vitest/Node configuration identity;
- MIT license identity;
- implementation-time proof that the chosen pinned Node runtime supports the measured ES2025 iterator behavior needed by the oracle.

## Acceptance criteria

Spec 007 implementation is `GO` only if:

1. planning and separate implementation authorization are canonically closed first;
2. exactly the authorized benchmark-only paths change;
3. both cases pass exact provenance/license/runtime qualification;
4. both cases complete repeated isolated replay and reach qualified `BENCHMARK_ACTIVE` observations under the frozen rules;
5. both activated cases prove oracle anti-leakage and hermeticity;
6. existing result files remain byte-identical;
7. one additive expanded-corpus result covering the full eight-case selection set is produced from exact live execution;
8. all observed misses/unavailable outcomes are preserved honestly;
9. existing absolute integrity gates remain satisfied;
10. exact-head Project CI and independent substantive review gates pass for every code/manifest publication unit requiring them;
11. guarded merges and post-merge identity verification complete;
12. closeout records the measured result without promoting selector shadow, M2, or product changes.

If either candidate cannot satisfy the existing benchmark trust contract without broad new infrastructure, reject that candidate and return to planning. That outcome is `NO_GO` for the current two-case Spec 007 plan until a separately reviewed planning amendment replaces or removes the failed candidate; implementation authority must not be broadened silently.