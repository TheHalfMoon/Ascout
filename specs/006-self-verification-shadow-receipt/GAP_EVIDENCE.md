# Spec 006 Gap Evidence — Self-Verification Shadow Receipt

**Status:** MEASURED_GAP / PLANNING_ONLY
**Canonical base:** `c8126773a63be744b121fbabc5e427600f671ae8`
**Date:** 2026-09-03

## Observed repository truth

Canonical `main` at planning start is `c8126773a63be744b121fbabc5e427600f671ae8`, the verified T106 merge that closed Spec 005.

The repository has exactly one GitHub Actions workflow at this base:

- `.github/workflows/ci.yml`
- Git blob: `e94eca5c4daacd83e0e0e77354316a33f5241914`

That workflow runs exact-head checkout, exact-source guard, `npm ci`, `npm run typecheck`, `npm test`, and `npm run build` on Ubuntu 24.04, macOS 14, and Windows 2025 with Node 22/24.

It does **not**:

- run the built Ascout CLI against Ascout's own pull-request change;
- reconstruct the pull request as a working-tree-vs-base source state for `ascout check`;
- capture a machine receipt from Ascout verifying Ascout;
- bind such a receipt to the exact verifier head and pull-request base/head identities in an external qualification envelope;
- upload a self-verification receipt artifact for later inspection;
- measure how often self-verification is clean, incomplete, repository-failing, drifted, or internally unable to emit a receipt.

Repository search for `Ascout-on-Ascout`, `self-verification`, and equivalent current workflow behavior finds the strategic M1.2 roadmap text, but no implemented self-verification workflow or retained self-verification artifact surface.

## Why this gap is material

The canonical Post-M1 Verification Roadmap orders the next milestone after M1.1 as:

`M1.2 — Ascout-on-Ascout + Benchmark Truth`

Its first workstream is self-verification: run Ascout against its own changes and retain receipt artifacts for release qualification.

Spec 004 and Spec 005 completed the measured M1.1 branch/environment evidence-depth slices. The next ordered measured gap is therefore not another evidence type; it is the absence of an Ascout-on-Ascout observation path.

Without a self-verification shadow path, Ascout can claim that its unit/integration/build suite is green while still lacking direct evidence about what **Ascout itself** reports when presented with the same pull-request change.

## Narrow candidate response

Canonicalize only M1.2-A first: a **non-gating shadow self-verification receipt** for Ascout pull requests.

The candidate must:

1. build the exact pull-request head Ascout executable;
2. reconstruct the pull-request change as a trusted local `working_tree_vs_head` source state whose Git HEAD is the exact PR base SHA and whose working tree represents the exact PR head content;
3. run the exact built head Ascout executable against that reconstructed subject state;
4. never auto-supply changed-command-surface admission;
5. retain valid receipt output for normal receipt-producing exit codes without converting the receipt verdict into a merge gate during the shadow phase;
6. emit a separate privacy-safe qualification envelope binding verifier head SHA, subject base SHA, subject target head SHA, receipt exit code, and receipt digest;
7. upload the receipt/envelope as bounded-retention CI artifacts;
8. fail the self-verification job only on harness/integrity failure, not merely because the shadow receipt truth is non-clean;
9. introduce no product-core behavior change, receipt schema change, package runtime dependency, new CLI flag, release/tag/publication, selector redesign, mutation testing, or M2 capability.

## Explicit non-goals

This gap evidence does not justify:

- making self-verification a required merge gate yet;
- automatic `--allow-changed-command-surface` admission;
- selector shadow mode;
- historical benchmark expansion;
- receipt mutation/adversarial corpus;
- mutation/property/fuzz testing;
- untrusted-repository execution;
- hosted services or account requirements;
- receipt v2 or new receipt fields;
- product-core process or planner changes.

Those remain separate measured/planned decisions.

## Promotion rule

This document is evidence for planning only. It does not authorize implementation.

Any implementation requires the full Constitution development workflow: specification, clarifications, YAGNI review, technical plan, second YAGNI review, tasks, requirements checklist, cross-artifact analysis, independent plan audit, fresh exact-head planning review, canonical planning merge, and separate durable implementation authorization.