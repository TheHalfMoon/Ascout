# Spec 007 Plan Ponytail / YAGNI Review

**Status:** PLANNING / IMPLEMENTATION_NOT_AUTHORIZED

## Review target

The technical plan proposes T110–T114. This review removes any implementation step not required to measure the two-case corpus expansion honestly.

## T110 — Keep, two paths only

Keep:

- `benchmarks/README.md`
- `benchmarks/manifest.json`

Reject speculative changes to:

- `benchmarks/run.mjs`
- `benchmarks/harness-lib.mjs`
- `benchmarks/metrics.mjs`
- `benchmarks/metrics-lib.mjs`
- `benchmarks/assertions*.mjs`
- tests
- `src/**`

If T110 data cannot validate under current code, stop and return to planning rather than expanding T110.

## T111/T112 — Keep as evidence-only replay units

No repository mutation by default. Their purpose is to execute already-canonical benchmark machinery against exact new case definitions and decide whether each candidate qualifies.

Do not create per-case result files in the repository unless a later authority amendment proves they are necessary. Durable issue-ledger evidence plus immutable workflow/run/output identities is sufficient for qualification if the existing tooling does not require repository publication.

## T113 — Keep one additive result path

Default path:

`benchmarks/results/t113-historical-corpus-expansion.json`

Do not rewrite T078/T091/T095. Do not add a second summary, CSV, database, dashboard, trend file, or release artifact.

## T114 — Ledger only

No repository closeout commit is needed by default. Use a durable issue ledger unless canonical governance at that time explicitly requires a repository artifact.

## Case count

Keep exactly two new selection cases. Do not add a gap case. The existing gap corpus and absolute integrity assertions already answer the integrity questions relevant to this slice.

## Metrics semantics

Keep current outcome vocabulary and availability accounting. No new percentage, confidence score, ranking, acceptance threshold, or composite score.

## Runtime

Do not add Docker/container orchestration merely because replay is isolated. Reuse the current bounded temporary clone/worktree model unless current benchmark authority already requires another route.

## Final reduced implementation surface

Expected repository mutation across the entire spec:

1. T110:
   - `benchmarks/README.md`
   - `benchmarks/manifest.json`
2. T113:
   - `benchmarks/results/t113-historical-corpus-expansion.json`

Everything else is evidence/ledger by default.

## Result

`PLAN_YAGNI_007 = PASS`

The plan remains a two-case evidence expansion with three expected repository paths total across dependency-ordered units, not a benchmark-platform project.
