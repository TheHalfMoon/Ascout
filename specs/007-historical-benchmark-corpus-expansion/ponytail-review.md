# Spec 007 Ponytail / YAGNI Review

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

## Review question

What is the smallest change that can answer whether two new historical cases improve benchmark breadth without weakening Ascout's evidence rules?

## Keep

1. Exactly two pre-reviewed selection candidates: Jotai and Immer.
2. Existing manifest schema and case lifecycle.
3. Existing Git reconstruction and regression-test anti-leakage model.
4. Existing isolated benchmark execution machinery.
5. Existing comparator vocabulary: `hit | miss | unavailable`.
6. Existing absolute integrity gates.
7. One successor manifest revision and one additive expanded-corpus result.
8. Historical publication immutability.

## Remove / reject

### Generic adapter framework

Rejected. Two Vitest-based JavaScript/TypeScript cases do not justify a plugin/adapter SDK.

### New selector behavior

Rejected. Benchmark observations must not cause implementation changes inside the same measurement spec.

### Automatic corpus discovery

Rejected. Candidate selection remains deliberate and reviewable.

### Database/history service

Rejected. One additive canonical result file is sufficient.

### Dashboard or trend system

Rejected. Trend aggregation belongs to later roadmap work if evidence justifies it.

### Live-network oracle support

Rejected. Network dependence weakens reproducibility and is unnecessary for the selected cohort.

### New benchmark result schema

Rejected unless the current additive result structure cannot represent the existing comparator/outcome fields. Planning evidence currently shows no need.

### New runtime dependency

Rejected. Donor dependencies live only inside isolated benchmark cases; Ascout product dependencies remain unchanged.

### Manifest schema v2

Rejected. Raising the selection maximum and adding cases can remain manifest schema v1 if current validation accepts the successor revision.

### Replay of unrelated gap corpus

Rejected by default. Spec 007 measures selection-corpus expansion. Existing absolute assertions still run as required by the benchmark harness, but no new gap case is added.

## Candidate count decision

Exactly two cases.

- Jotai adds a new repository with Vitest/jsdom and React state semantics.
- Immer adds a new repository with Vitest/Node and iterator/map semantics.

A third case adds execution and review cost without a distinct planning need. One case would be too anecdotal for a corpus-expansion slice.

## Default implementation surfaces

The minimal expected implementation is:

- `benchmarks/README.md` — successor corpus-policy note and 5–8 selection bound;
- `benchmarks/manifest.json` — revision bump, maximum 8, exact two new case definitions/lifecycle updates;
- one new `benchmarks/results/*.json` additive expanded-corpus publication after qualification.

No existing benchmark script is expected to change.

If implementation-time isolated replay proves that an existing benchmark-only script cannot represent or execute an otherwise-qualified case because of a narrow defect, implementation must stop and seek a bounded authority amendment before changing that script.

## Result

`YAGNI_007 = PASS`

Spec 007 remains a corpus/data/evidence expansion, not an architecture expansion.
