# Specification 011 HEAD Cross-Artifact Review

**Status:** `FOUNDER_SIDE_READY_FOR_FRESH_EXTERNAL_EXACT_HEAD_REVIEW`

## Scope reviewed

All eleven planning artifacts under `specs/011-explicit-test-script-runner-authority/` committed before this file. This file is the final planning-content mutation before fresh exact-head qualification. Any later repository-content mutation invalidates this review and requires another fresh HEAD review and qualification cycle.

Immediately before this review:

- canonical `main` remained `1483c481c0ad6ab4a8b4dd15cdf9120afe86e967`;
- canonical tree remained `93d956791e7bae1c4e8985b9345442f138197be2`;
- open pull requests at review time were `0` before this planning PR is opened;
- the planning branch was `ahead 11 / behind 0` from the exact canonical base;
- the merge base was exactly the canonical base `1483c481c0ad6ab4a8b4dd15cdf9120afe86e967`;
- the repository delta remained exactly eleven planning files under `specs/011-explicit-test-script-runner-authority/` and no implementation path;
- repository rulesets were `[]`;
- observable `main` protection remained disabled/off.

All prior-head CI/review evidence, if any, is stale for merge qualification after content mutations and MUST NOT be reused as exact-head qualification evidence.

## Frozen planning invariants

1. Issue #277 grants planning authority only; implementation remains unauthorized until a separate durable post-merge authorization exists.
2. Spec 011 is M1.2 bounded evidence-fidelity hardening only.
3. The live T118 artifact proved `js_test_runner_ambiguous` with `NOT_RUN` and `UNAVAILABLE_ASCOUT_TASK_STATE` on Ascout itself; that signal is planning input, not implementation authority.
4. Ascout root `scripts.test` is exactly `vitest run` with both `vitest` and `jest` declared; discovery currently reports ambiguous with candidates `["jest","vitest"]`.
5. Explicit authority source is root-only `package.json` `scripts.test`.
6. The frozen allowlist is exactly `"vitest run" -> vitest` and `"jest" -> jest`, with exact string equality and no repair, parsing, or shell interpretation.
7. Authority applies only to ambiguous `{jest, vitest}` coexistence with ambiguous `sourcePaths` exactly `["package.json"]`, meaning both declarations are in the root manifest; single, absent, and unsupported states are unchanged and never map to ambiguous.
8. Non-resolving scripts preserve the existing discovery outcome byte-for-byte with identical reason code, text, candidates, and source paths; nested-declaration ambiguous outcomes preserve declaration provenance and never resolve from a root script.
9. Missing, non-string, empty, padded, composite, indirect, unsupported, unsafe, and contradictory shapes all remain fail-closed.
10. Vitest and Jest planners consume the single post-authority discovery value without duplicated script parsing; all downstream scope, config, runtime, coverage, run-id, and artifact gates are unchanged.
11. Changed-surface admission is unchanged; explicit resolution never auto-admits.
12. No-green-by-omission is preserved for remaining ambiguous outcomes.
13. Evaluation is synchronous, total, deterministic, and free of I/O, processes, network, clock, randomness, and environment reads.
14. Only existing `sourcePaths: ["package.json"]` and the resolved runner value are exposed; no new persisted script text, absolute path, credential, token, environment, actor/host identity, repository URL, or raw stdout/stderr.
15. Task order is exactly `T120 -> T121`.
16. T120 candidate paths are exactly `src/discovery.ts`, `src/tools/vitest.ts`, `src/tools/jest.ts`, and `tests/t120-explicit-script-authority.contract.test.ts`.
17. T121 is ledger/governance only by default.
18. No `benchmarks/**`, workflow, receipt/schema/validator, selector/widening, CLI, config surface, package metadata, lockfile/dependency, benchmark-result, Spec 007, release/tag/publication mutation.
19. No new dependency, action, service, database, telemetry, plugin framework, generic script runner, shell parser, executor support, argument grammar, nested-script authority, persistent trust, or auto-admission.
20. No threshold, recall claim, speedup claim, causal claim, or merge-gate change.
21. Historical T078/T091 and Spec 007 evidence remain immutable.
22. Discovery evaluation requires no new timeout, retry, or budget; no benchmark replay or separate live-observation gate beyond standard Self Verification is required for T120.
23. Each material unit requires exact-head Self Verification, original-attempt six-lane Project CI, fresh independent substantive review, zero unresolved material threads, live rules/protection revalidation, guarded expected-head normal merge, and post-merge proof.
24. No force-push, rebase, destructive history rewrite, consumed-attempt reinterpretation, or fabricated evidence.

## Founder-side findings

`PRIOR_EXTERNAL_MATERIAL_FINDINGS = 0`

`CURRENT_FOUNDER_SIDE_MATERIAL_FINDINGS = 0`

No unresolved founder-side contradiction remains among scope, task order, authority, evidence integrity, source binding, command authority, determinism, privacy, supply-chain, or qualification requirements.

## Required fresh external qualification

The exact branch head produced by this file must receive a completely fresh qualification cycle. Prior-head success is historical evidence only.

Required:

- canonical-base ancestry and no unrelated path changes;
- exactly twelve planning files under `specs/011-explicit-test-script-runner-authority/` and no other repository delta;
- fresh exact-head Self Verification success;
- fresh original-attempt six-lane Project CI success;
- fresh independent substantive exact-head review covering the complete current range;
- zero unresolved material review threads;
- unchanged head after final review;
- live rulesets/observable branch protection immediately before merge;
- unchanged canonical base immediately before guarded merge;
- expected-head normal merge;
- post-merge ordered parents, tree, GitHub signature, PR state, and canonical main proof.

```text
FOUNDER_SIDE_CROSS_ARTIFACT_REVIEW = PASS
PLANNING_CONTENT_FROZEN = YES
FRESH_INDEPENDENT_EXACT_HEAD_REVIEW = REQUIRED
IMPLEMENTATION_AUTHORITY = NOT_EFFECTIVE
```
