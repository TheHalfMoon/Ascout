# Synthetic Browser Benchmark v1 — P016-09

Ninth and final Spec 016 first-wedge implementation slice under
P016-01 authorization (predecessor: P016-08 trace/artifact ingestion,
PR #352). Completion of this slice means
`SPEC_016_DETERMINISTIC_BROWSER_FOUNDATION_COMPLETE` per handoff
section 10.

## What this slice adds

Owned deterministic fixtures plus benchmark evaluation proving the
wedge truth contract:

- `benchmarks/browser/fixtures/*.html`: nine owned fixture pages
  (shop happy path, renamed-equivalent control, ambiguous duplicate
  controls, transient overlay, console-noisy green flow, unguarded
  double-submit form, review-less wizard, login form). The slow case
  reuses happy-path bytes with a fixed 1500ms serve delay; the
  source-mismatch case is assembly-level with no fixture.
- `benchmarks/browser/manifest.json`: ten frozen cases
  (`ascout-browser-benchmark-v1`, oracle_frozen 2026-09-15), each
  with one oracle: `clean`, `defect_detected`, `recovery_visible`,
  or `semantic_drift`. `benchmarks/browser/README.md` states the
  corpus rules.
- `src/browser/benchmark.ts`: pure deterministic evaluation.
  `createCaseResult` validates executed results;
  `detectMissingSteps` surfaces `SEMANTIC_DRIFT_DETECTED` for
  missing or unexpected flow steps; `evaluateIntegrityGates`
  computes the nine canonical gates (fabricated_pass,
  hidden_applicable_not_run, cross_tree_evidence_leakage,
  source_binding_violation, silent_semantic_heal,
  cache_authority_escalation, secret_leakage_from_ascout_owned_
  artifacts, unqualified_model_only_pass, recovery_history_erasure);
  `acceptCaseResult` enumerates per-oracle acceptance reasons;
  `assembleBenchmarkReport` qualifies only on zero gates plus zero
  reasons, with defect recall informational-only. Cache and model
  grants are measured fields (honestly zero in this wedge, counted
  the moment any appear). Strict manifest parsing plus deterministic
  report JSON/digests.
- `tests/browser-benchmark.integration.test.ts`: executes every
  manifest case through the pinned adapter with real P016-05/06/07
  evidence recording (attempt logs, console records, recovery
  histories with measured erasure), then asserts zero gates, full
  acceptance, recall 1, and digest-stable re-evaluation. Recovery
  cases genuinely fail first (stale name, overlay interception,
  short-timeout navigation) and recover; the rename case
  re-resolves from the observed accessible name; the mismatch case
  proves cross-tree assembly throws; the sensitive case proves
  owned evidence excludes the synthetic secret.

## What this slice does not do

No external corpus, no comparator tracks (unavailable comparators
stay unrecorded rather than invented), no agent/journey/multimodal
scope (P016-10+, separately unauthorized), no workflow change, no
dependency change, no donor code.

## Evidence

`tests/browser-benchmark.contract.test.ts` proves result
validation, step-drift detection, all nine gate computations,
per-oracle acceptance, report qualification, serialization
determinism, and frozen-manifest validation (ten cases, exact
oracle mapping, malformed-manifest rejection). The integration
file executes the benchmark in Project CI on all six lanes;
sandbox containers without browser provisioning stay env-blocked
per the P016-04 precedent, with CI as the gating evidence and
cross-lane agreement as the reproducibility proof. Browser
provisioning is coordinated with the P016-04 integration file: the
benchmark polls for the installed executable (default 300s, override
`BENCHMARK_CHROMIUM_WAIT_MS`) before provisioning itself, because
concurrent `install --with-deps` runs self-conflict on OS package
locks.
