# Spec 015 Benchmark Design — Planning Only

**Status:** `PLANNING_ONLY`
**Base:** `55688b5bca22f2e9979b71739bb6802c652bda9d`

Benchmark must measure Ascout claims, not merely donor-tool detection. It preserves unavailable evidence, publishes misses, and enforces absolute gates: cross-tree leakage zero, source-binding violations zero, stable run with material `NOT_EXERCISED` or `UNRESOLVED` mapping to incomplete exit, never clean zero, false PASS zero, secret leakage zero, privilege escalation zero, memory PASS zero.

Partitions: public development, eval, hidden holdout, post-cutoff, synthetic, adversarial. Contaminated evidence disclosed and excluded from gating.

Families: bug discovery, test generation with discrimination proof, debugging with minimization and localization and proof, integrity (leakage, binding, gap mapping), cost and budget visibility, evolution brittleness. Later security, performance, accessibility, AI-system, runtime tracks only with separate justification.

Corpora require qualification for license, redistribution, and contamination control. Competitor comparison only where permitted; otherwise `COMPARISON_UNAVAILABLE`.

No benchmark execution or corpus import is authorized here. Design only.

```text
BENCHMARK_DESIGN = FROZEN_AS_PLANNING_INPUT / EXECUTION_NOT_AUTHORIZED
```
