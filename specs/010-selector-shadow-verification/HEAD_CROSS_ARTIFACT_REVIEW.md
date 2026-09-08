# Specification 010 HEAD Cross-Artifact Review

**Status:** `FOUNDER_SIDE_READY_FOR_FRESH_EXTERNAL_EXACT_HEAD_REVIEW`

## Scope reviewed

All twelve planning artifacts under `specs/010-selector-shadow-verification/` after remediation of the first external exact-head review finding concerning the T118 end-to-end timeout budget.

This file is the final planning-content mutation before fresh exact-head qualification. Any later repository-content mutation invalidates this review and requires another fresh HEAD review and qualification cycle.

Immediately before this refresh:

- canonical `main` remained `ec78d0225f66390ad45804fb122b6d51c4f6980f`;
- canonical tree remained `7d2eaf375aa0f65ef9dd4661ec434d9254c78f00`;
- PR #262 was the only open pull request;
- PR #263 remained closed unmerged as a duplicate governance surface;
- the planning branch was `ahead 20 / behind 0` from the exact canonical base;
- the merge base was exactly the canonical base;
- the repository delta remained exactly twelve planning files under `specs/010-selector-shadow-verification/` and no implementation path;
- repository rulesets were `[]`;
- observable `main` protection remained disabled/off.

All CI/review evidence produced for prior planning head `c8de77e052e2e76b3e86d7f7b24f1d5262e3fb5f` is stale for merge qualification after the remediation commits and MUST NOT be reused as exact-head qualification evidence.

## External review finding remediation

First exact-head CodeRabbit review on `c8de77e052e2e76b3e86d7f7b24f1d5262e3fb5f` identified one material issue: the plan bounded the reference process but did not prove the complete existing 30-minute `self-verify` job could finish setup, Spec 006 verification, selector-shadow reference execution, cleanup, and artifact upload.

The finding is resolved prospectively in planning as:

```text
T118 self-verify job timeout = 60 minutes
checkout/setup/install/build/artifact publication reserve = 20 minutes
existing Spec 006 self-verification allowance = 20 minutes
T117 full-suite reference timeout = 10 minutes
contingency/orderly-cleanup reserve = 10 minutes
TOTAL = 60 minutes
```

Neither timeout may be increased after observing live T118 evidence. Budget insufficiency requires `NO_GO / RETURN_TO_PLANNING`.

The remediation is aligned in `spec.md`, `plan.md`, `tasks.md`, `checklists/requirements.md`, `analysis.md`, and `FINAL_PLAN_AUDIT.md`.

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
18. One bounded no-retry full-suite structured JSON reference only, with exact 10-minute timeout.
19. T118 must set the existing self-verification job timeout exactly to 60 minutes before selector-shadow integration becomes canonical.
20. The frozen 60-minute end-to-end budget reserves 20/20/10/10 minutes for setup+publication / Spec 006 / T117 reference / contingency+cleanup respectively.
21. Neither the 60-minute job timeout nor the 10-minute reference timeout may be widened after live evidence.
22. Full-suite failure identity is exact `(repository-relative path, fullName)`.
23. Ascout failure identity is exact `(finding.path, finding.rule_or_test_id)` scoped to the exact test task.
24. Matching is exact tuple equality only; no fuzzy/suffix/message/location inference.
25. Every exact unmatched full-suite failed identity is published as a selector miss.
26. Missing/incomparable evidence is `UNAVAILABLE`, never `NO_MISS_OBSERVED`.
27. No recall threshold, universal-recall claim, causal claim, or speedup claim.
28. Observed selector misses are successful non-gating measurements and do not alter receipt exit, selector policy, merge eligibility, branch protection, or Project CI.
29. Exactly one separate deterministic `SELECTOR_SHADOW_NON_GATING` observation artifact is planned.
30. Artifact excludes raw stdout/stderr, absolute paths, user/actor/host/HOME/environment, credentials/tokens, and repository URL.
31. Existing pinned upload action/retention/permissions are reused only after implementation-time revalidation.
32. T117 focused contract coverage includes digest/source/task/command/timeout/report/path/identity/privacy/unavailable/non-gating boundaries.
33. T118 cannot close from static workflow review; one exact-final-head live artifact published within the frozen 60-minute budget is mandatory.
34. An unplanned live failure or timeout-budget insufficiency returns to planning; no post-observation fallback, retry-to-green, timeout widening, or authority expansion.
35. Each material unit requires exact-head Self Verification, original-attempt six-lane Project CI, fresh independent substantive review, zero unresolved material threads, live rules/protection revalidation, guarded expected-head normal merge, and post-merge proof.
36. No force-push, rebase, destructive history rewrite, consumed-attempt reinterpretation, or fabricated evidence.

## Founder-side findings

`PRIOR_EXTERNAL_MATERIAL_FINDINGS = 1`

`PRIOR_EXTERNAL_FINDING_REMEDIATED = YES`

`CURRENT_FOUNDER_SIDE_MATERIAL_FINDINGS = 0`

No unresolved founder-side contradiction remains among scope, task order, authority, evidence integrity, source binding, command authority, end-to-end timeout budget, comparison semantics, privacy, supply-chain, or qualification requirements.

## Required fresh external qualification

The exact branch head produced by this file must receive a completely fresh qualification cycle. Prior-head success is historical evidence only.

Required:

- canonical-base ancestry and no unrelated path changes;
- exactly twelve planning files under `specs/010-selector-shadow-verification/` and no other repository delta;
- fresh exact-head Self Verification success;
- fresh original-attempt six-lane Project CI success;
- fresh independent substantive exact-head review covering the complete current range and the timeout remediation;
- zero unresolved material review threads;
- unchanged head after final review;
- live rulesets/observable branch protection immediately before merge;
- unchanged canonical base immediately before guarded merge;
- expected-head normal merge;
- post-merge ordered parents, tree, GitHub signature, PR state, and canonical main proof.

```text
FOUNDER_SIDE_CROSS_ARTIFACT_REVIEW = PASS_AFTER_TIMEOUT_REMEDIATION
PLANNING_CONTENT_FROZEN = YES
FRESH_INDEPENDENT_EXACT_HEAD_REVIEW = REQUIRED
IMPLEMENTATION_AUTHORIZATION = NOT_EFFECTIVE
```
