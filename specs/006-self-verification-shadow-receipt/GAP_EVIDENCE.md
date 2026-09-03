# Spec 006 Gap Evidence — Self-Verification Shadow Receipt

**Status:** MEASURED_GAP / PLANNING_ONLY
**Canonical base:** `c8126773a63be744b121fbabc5e427600f671ae8`
**Date:** 2026-09-03

## Observed repository truth

Canonical `main` at planning start is `c8126773a63be744b121fbabc5e427600f671ae8`, the verified T106 merge that closed Spec 005.

The repository has one GitHub Actions workflow at this base: `.github/workflows/ci.yml`, blob `e94eca5c4daacd83e0e0e77354316a33f5241914`. It guards the exact source and runs install, typecheck, tests, and build on Ubuntu 24.04, macOS 14, and Windows 2025 with Node 22/24.

It does **not** run the built Ascout CLI against Ascout's own pull-request change, retain a machine receipt, or bind a retained receipt to exact verifier/subject Git identities in a qualification artifact.

The Post-M1 roadmap orders M1.2 after M1.1 and names Ascout-on-Ascout self-verification as its first workstream. Spec 004 and Spec 005 completed bounded M1.1 evidence-depth slices. The next measured gap is therefore absence of Ascout-on-Ascout observation, not absence of another product evidence type.

## Trusted observation boundary

The measured gap is bounded to **same-repository Ascout pull requests**. The Constitution does not yet authorize arbitrary third-party/fork PR execution. Therefore Spec 006 may observe only PR heads whose head repository is the canonical Ascout repository.

Fork/external PRs are not evidence gaps that this spec is authorized to solve. Their self-verification execution job must be skipped before checkout/install/build/execution, must produce no self-verification receipt claim, and must not be re-enabled with `pull_request_target`, secrets, elevated permissions, or another fork-code workaround.

## Correct PR-change identity model

For one eligible same-repository pull request, a GitHub event exposes a base branch tip and a head commit, but the event base tip can advance independently after the pull request diverges. Therefore the event base tip is **provenance**, not automatically the source HEAD against which the PR change must be reconstructed.

Define:

- `B` = exact event base-tip SHA;
- `H` = exact same-repository pull-request head SHA;
- `M` = unique merge base of `B` and `H` computed from the fetched Git graph;
- `HT` = exact tree SHA `H^{tree}`.

The subject observed by Ascout must be `HEAD == M` with the exact `HT` tree preserved in the index and working tree. This represents the committed pull-request change `M -> H` without charging the pull request for unrelated commits that may have landed on the base branch after divergence.

If the harness cannot resolve exactly one merge base, prove all required commits/trees, or preserve `HT` exactly, it must fail closed rather than approximate the change.

## Narrow candidate response

Canonicalize only M1.2-A first: a **non-gating shadow self-verification receipt** for eligible same-repository Ascout pull requests.

The candidate must:

1. prove same-repository eligibility before executing PR-head code;
2. build the exact `H` Ascout executable;
3. compute and prove `M = merge-base(B,H)`;
4. reconstruct the subject as `HEAD == M` with `git write-tree == HT` and no unrelated nonignored material;
5. run the exact head-built verifier against that subject;
6. never auto-supply changed-command-surface admission;
7. retain valid receipt output without converting its verdict into a merge gate;
8. emit a separate privacy-safe envelope binding `B`, `M`, `H`, `HT`, receipt exit code, and receipt digest;
9. upload receipt/envelope as bounded-retention CI artifacts;
10. fail on harness/identity/validation/artifact integrity failure;
11. introduce no product-core, receipt-schema, package-runtime, CLI, release/tag/publication, selector, mutation, or M2 capability change.

## Explicit non-goals

No fork/untrusted-repository execution, sandboxing, `pull_request_target`, required merge gate, auto-admission, selector shadow, historical corpus expansion, adversarial receipt mutation, M2 mutation/property/fuzz/counterfactual work, hosted core requirement, receipt v2, or product planner/process change.

## Promotion rule

This is planning evidence only. Implementation still requires the full Constitution workflow, canonical planning merge, and a separate durable implementation authorization.