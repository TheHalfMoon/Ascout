# Ascout Synthetic Browser Benchmark v1 (P016-09)

Owned deterministic fixtures proving the Spec 016 first-wedge truth
contract. Ten seeded cases, each with a frozen oracle in
`manifest.json` (oracle_frozen 2026-09-15; oracles were fixed before
any benchmark execution and must not change after seeing output).

## Corpus rules

1. Every case is Ascout-owned bytes under `benchmarks/browser/`;
   no external corpus, no donor code, no network beyond the
   test-local fixture server.
2. Fixtures are minimal HTML with deterministic behavior (fixed
   overlay timing, fixed serve delays, no randomness).
3. Each case declares one oracle: `clean`, `defect_detected`,
   `recovery_visible`, or `semantic_drift`.
4. The benchmark never invents results: verdicts derive from
   executed adapter actions plus the P016-05/06/07/08 evidence
   modules, evaluated by `src/browser/benchmark.ts`.
5. Qualifying requires all nine canonical integrity gates at zero
   plus per-case acceptance (visible attempts, visible recovery,
   drift marker where applicable).

## Execution

`tests/browser-benchmark.integration.test.ts` serves these fixtures
over test-local HTTP and executes every manifest case through the
pinned Playwright adapter. It runs in Project CI (all six lanes);
sandbox containers without browser provisioning stay env-blocked
per the P016-04 precedent, with CI as the gating evidence.
The benchmark waits for a genuinely launchable browser via probe
launches (default 300s, override `BENCHMARK_CHROMIUM_WAIT_MS`)
before provisioning itself, because concurrent `install --with-deps`
runs self-conflict on OS package locks and a mid-install directory
can hold the main executable while the headless-shell binary is
still missing.
Cross-lane agreement on identical assertions is the reproducibility
proof; evaluation determinism (same evidence, same digest) is
proven by `tests/browser-benchmark.contract.test.ts`.
