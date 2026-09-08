# Specification 010 HEAD Cross-Artifact Review

**Status:** `FOUNDER_SIDE_READY_FOR_EXTERNAL_EXACT_HEAD_REVIEW`

## Scope reviewed

All twelve planning artifacts under `specs/010-selector-shadow-verification/` after gap analysis, clarification, text-normalization reconciliation, YAGNI reduction, technical planning, task decomposition, supply-chain review, checklist, cross-artifact analysis, and final audit.

This file is the final planning-content mutation before exact-head qualification. Any later repository-content mutation invalidates this review and requires a fresh HEAD review.

Immediately before this refresh:

- canonical `main` remained `ec78d0225f66390ad45804fb122b6d51c4f6980f`;
- canonical tree remained `7d2eaf375aa0f65ef9dd4661ec434d9254c78f00`;
- open pull requests remained `0`;
- the planning branch was `ahead 13 / behind 0` from that exact base;
- the merge base was exactly the canonical base;
- the repository delta was exactly twelve added files under `specs/010-selector-shadow-verification/` and no other path;
- repository rulesets were `[]`;
- observable `main` protection remained disabled/off.

The clarification-only normalization after the prior draft HEAD review changed no requirement, task, authority, or implementation surface; this refreshed file supersedes that stale review.

## Frozen planning invariants

1. Issue #261 grants planning authority only; implementation remains unauthorized until a separate durable post-merge authorization exists.
2. Spec 010 is M1.2 selector-shadow measurement only.
3. Historical T078 proves one real selector miss; T091 proves the bounded repair and zero current misses in its six-case replay but not universal recall.
4. Three of six Ascout comparator outcomes in T091 remained unavailable; no artifact claims a known current unrepaired selector defect.
5. Spec 007 remains `NO_GO / TERMINAL_UNDER_CURRENT_SPEC` and is not reopened.
6. Task order is exactly `T117 -> T118 -> T119`.
7. T117 candidate paths are exactly `benchmarks/selector-shadow.mjs` and `tests/t117-selector-shadow.contract.test.ts`.
8. T118 candidate path is exactly `.github/workflows/self-verify.yml`.
9. T119 is ledger/governance only by default.
10. No `src/**`, Receipt v1/schema/validator, selector/widening, CLI, package/dependency, Project CI, benchmark-result, release/tag/publication mutation.
11. Same-repository Spec 006 trust boundary is reused; fork/external execution remains excluded before PR code execution.
12. No `pull_request_target`, secrets, elevated permissions, new workflow, new action, or new dependency.
13. Exact Spec 006 receipt bytes are SHA-256 bound to the exact existing qualification envelope before use.
14. Current subject must prove `HEAD == M`, `git write-tree == HT`, no unstaged tracked changes, and no nonignored untracked files before and after reference execution.
15. Exactly one comparable test task is required; admission must be normal, command surface unchanged, status PASS/FAIL/FLAKY.
16. BLOCKED/ERROR/NOT_RUN/NOT_APPLICABLE/refused/ambiguous states remain unavailable and do not trigger reference execution.
17. Root test contract is frozen to exact `scripts.test == "vitest run"`; existing local Vitest only; no implicit install or alternate command.
18. One bounded no-retry full-suite structured JSON reference only.
19. Full-suite failure identity is exact `(repository-relative path, fullName)`.
20. Ascout failure identity is exact `(finding.path, finding.rule_or_test_id)` scoped to the exact test task.
21. Matching is exact tuple equality only; no fuzzy/suffix/message/location inference.
22. Every exact unmatched full-suite failed identity is published as a selector miss.
23. Missing/incomparable evidence is `UNAVAILABLE`, never `NO_MISS_OBSERVED`.
24. No recall threshold, universal-recall claim, causal claim, or speedup claim.
25. Observed selector misses are successful non-gating measurements and do not alter receipt exit, selector policy, merge eligibility, branch protection, or Project CI.
26. Exactly one separate deterministic `SELECTOR_SHADOW_NON_GATING` observation artifact is planned.
27. Artifact excludes raw stdout/stderr, absolute paths, user/actor/host/HOME/environment, credentials/tokens, and repository URL.
28. Existing pinned upload action/retention/permissions are reused only after implementation-time revalidation.
29. T117 focused contract coverage includes digest/source/task/command/report/path/identity/privacy/unavailable/non-gating boundaries.
30. T118 cannot close from static workflow review; one exact-final-head live artifact is mandatory.
31. An unplanned live failure returns to planning; no post-observation fallback or authority widening.
32. Each material unit requires exact-head Self Verification, original-attempt six-lane Project CI, fresh independent substantive review, zero unresolved material threads, live rules/protection revalidation, guarded expected-head normal merge, and post-merge proof.
33. No force-push, rebase, destructive history rewrite, consumed-attempt reinterpretation, or fabricated evidence.

## Founder-side findings

`MATERIAL_FINDINGS = 0`

No unresolved contradiction exists among scope, task order, authority, evidence integrity, source binding, command authority, comparison semantics, privacy, supply-chain, or qualification requirements.

## Required external qualification

The exact branch head produced by this file must prove:

- canonical-base ancestry and no unrelated path changes;
- exactly twelve planning files under `specs/010-selector-shadow-verification/` and no other repository delta;
- Self Verification exact-head success if applicable to the planning PR;
- original-attempt six-lane Project CI success;
- fresh independent substantive exact-head review;
- zero unresolved material review threads;
- unchanged head after final review;
- live rulesets/observable branch protection immediately before merge;
- unchanged canonical base immediately before guarded merge;
- expected-head normal merge;
- post-merge ordered parents, tree, GitHub signature, PR state, and canonical main proof.

```text
FOUNDER_SIDE_CROSS_ARTIFACT_REVIEW = PASS
PLANNING_CONTENT_FROZEN = YES
INDEPENDENT_EXACT_HEAD_REVIEW = REQUIRED
IMPLEMENTATION_AUTHORIZATION = NOT_EFFECTIVE
```
