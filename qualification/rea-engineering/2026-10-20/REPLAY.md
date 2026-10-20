# Reproducing qualification

Use the developer's own trusted Ascout checkout, exact recorded commit, Git and Node 22/24. Explicitly install the existing lock with `npm ci --ignore-scripts --no-audit --no-fund`. The pinned Chromium runtime is required for real browser tests. No model/provider key, cloud service or new product dependency is needed.

The canonical complete Windows command is `npm test -- --maxWorkers=1`. Typecheck is `npm run typecheck`; build is `npm run build`. Keep individual test/process deadlines and platform conditionals unchanged. A direct Vitest invocation is insufficient for the packaging test because it omits `npm_execpath`; its observed failure is preserved in the evidence rather than waived.

`scripts/qualify_native.py` is an optional Python capture helper. Give an explicit trusted checkout with `--cwd`, an outer capture budget, then `--` and the complete command. It records source head/tree/status/diff before and after, raw streams, hashes, outcome and unchanged-source state. Its live resource sampler is disabled. Timeout cleanup uses the investigation's existing psutil environment; Python/psutil are not Ascout runtime requirements. Missing/failing/interrupted capture is not qualification success.

Example after selecting the exact recorded source and existing npm CLI:

```text
python scripts/qualify_native.py native-full --cwd <trusted-checkout> --timeout 3600 -- node <npm-cli.js> test -- --maxWorkers=1 --reporter=verbose
```

The full suite must finish with its actual summary; wrapper exit 0 only means capture completed. Inspect the native `exit`, state, source identity and every applicable result. Prior runs at 300/900 seconds, the interrupted source-drifted run and the completed direct-Vitest failure retain their original meanings.

For the four-way Git timing diagnostic, `trace_git.cjs` records only Git command categories/duration/status, and `rca_sampler_probe.py` compares no sampling, 20ms, 100ms and no sampling on one existing test. Instrumentation is diagnostic, not a product or release gate. Its semantic filter selects one test intentionally and is not a complete-suite claim. Adapt the local scratch path explicitly; do not confuse its source-relative workspace with an installed product feature.

`evidence.zip/MANIFEST.json` gives original and sanitized member hashes. `evidence-lock.json` identifies the published ZIP. Absolute host paths are replaced in derivatives; raw originals remain local. Changed derived bytes are not authentic originals and cannot be used as canonical receipts or signed attestations. Pending live runs are excluded from a snapshot and listed explicitly in the lock. Later snapshots retain earlier failure records and add completed evidence.

Phase manifests identify exact implementation commits, source/fixture hashes, RED and GREEN checks. Review records identify the actual local method and provider lineage. Public registry/advisory/signature requests are recorded separately from offline functionality. Hosted CI, canonical admission and independent-provider gates remain explicit whenever unavailable.
