# Specification 009 — Plan Ponytail / YAGNI Review

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Review target

Technical plan for a deterministic Receipt v1 adversarial corpus.

## Findings

### P1 — Remove planned result-publication task

The initial planning candidate considered T115–T117 with a separate publication step. A repository result artifact is unnecessary because the corpus is a deterministic contract suite already qualified by exact-head CI and review.

**Disposition:** remove publication task. Final task order is `T115 -> T116`.

### P2 — Keep implementation one-path by default

A separate mutation helper module would create an abstraction with one consumer.

**Disposition:** authorize one test path by default. A second helper path requires a new planning amendment, not implementation-time convenience.

### P3 — Do not enumerate every field permutation

The purpose is to challenge invariant classes, not generate a Cartesian matrix of equivalent malformed states.

**Disposition:** use representative cases for shared validators and explicit cases for high-risk cross-field invariants.

### P4 — Preserve schema/semantic layering

A corpus that only asserts `some validator failed` would hide boundary regressions.

**Disposition:** semantic cases must pass schema first and expose required semantic issue codes.

### P5 — No snapshot-only assertions

Snapshots can pass while a required code disappears or a case moves to the wrong layer.

**Disposition:** explicit structured assertions are mandatory.

### P6 — No privacy overclaim

The roadmap mentions secret-bearing output, but current constitutional redaction is best-effort rather than a universal secret recognizer.

**Disposition:** only include privacy cases that map to deterministic current contract rules. Record non-deterministic secret detection as out of scope.

### P7 — Separate measurement from repair

Fixing a discovered validator gap inside T115 would erase the original measurement boundary and widen authorized scope.

**Disposition:** T115 is test-only. Accepted invalid case => fail and return to separate product-repair planning.

## Final reduced architecture

- one new Vitest contract file;
- existing schema and semantic validator exports only;
- one valid fixture factory;
- explicit stable case registry;
- two validator-layer expectation modes;
- no dependencies/workflows/product changes/result files;
- T115 implementation + T116 reconciliation only.

`PLAN_YAGNI_RESULT = PASS / NO_FURTHER_REDUCTION_WITHOUT_LOSING_EVIDENCE`
