# Spec 016 Requirements Quality Checklist

**Status:** `PLANNING_ONLY`

## Product clarity

- [x] Product objective distinguishes Ascout verification authority from browser execution engines.
- [x] First implementation wedge is bounded separately from full browser/agentic roadmap.
- [x] Browser protocol reimplementation is rejected by default.
- [x] Playwright is selected as first execution substrate, not as canonical Ascout truth.
- [x] Momentic is treated as design/donor input, not the canonical product model.

## Evidence integrity

- [x] Browser evidence binds to exact source state.
- [x] Browser/environment/executor identity is required.
- [x] Failed attempts survive retries/recovery.
- [x] Semantic recovery cannot silently become clean PASS.
- [x] Cache cannot transfer PASS authority.
- [x] Model-only judgment cannot silently become deterministic proof.
- [x] Cross-tree leakage remains zero-tolerance.
- [x] Hidden applicable NOT_RUN remains zero-tolerance.

## Intent / oracle semantics

- [x] `IntentTest` is structured and deterministic.
- [x] Intent references obligations/requirements/risks.
- [x] Natural language remains data, not proof.
- [x] Oracle classes remain explicit.
- [x] Generated/healed tests reuse Spec 015 stability/discrimination/admission.

## Recovery semantics

- [x] Resolver recovery defined.
- [x] Execution recovery defined.
- [x] Semantic recovery defined.
- [x] Recovery budgets bounded.
- [x] Assertion weakening requires revalidation.
- [x] Persistent healing creates a new revision/digest.

## Browser execution

- [x] Fresh BrowserContext default specified.
- [x] Explicit origin/trusted-local scope specified.
- [x] Locator ordering specified.
- [x] Network/console/page-error evidence specified.
- [x] Screenshots/traces treated as sensitive artifacts.
- [x] Playwright public API usage precedes source reuse/forking.

## Journey model

- [x] Requirement/obligation/source/journey/execution/defect relationship defined.
- [x] Observed/declarative/inferred truth classes remain distinct.
- [x] Graph database rejected until benchmark need.
- [x] Selection uncertainty widens rather than silently deselecting.

## Security / privacy

- [x] No raw credential persistence.
- [x] Storage/auth state treated as sensitive.
- [x] No arbitrary third-party browsing by default.
- [x] No shell interpolation from intent text.
- [x] Artifact retention bounded.
- [x] Redaction limitations must be disclosed honestly.

## Provenance / licensing

- [x] Playwright exact research pin recorded.
- [x] Apache-2.0 observed.
- [x] Playwright NOTICE/Puppeteer derivation recorded.
- [x] Dependency/adaptation preferred over wholesale copy.
- [x] Momentic founder permission attestation recorded.
- [x] Momentic source import blocked until permission artifact + exact snapshot + nested provenance.

## Benchmark

- [x] Owned synthetic fixtures first.
- [x] Defect/drift taxonomy specified.
- [x] Comparative baselines defined conditionally on permitted access.
- [x] False PASS and semantic-heal safety are primary metrics.
- [x] Absolute integrity gates cannot be overridden by aggregate score.
- [x] Agentic expansion depends on deterministic baseline evidence.

## Governance

- [x] Spec 015 execution is not modified by this planning package.
- [x] Spec 016 implementation explicitly remains unauthorized.
- [x] Separate implementation authorization required.
- [x] Planning package defines dependency-ordered tasks.
- [x] No routine external-human-review gate is introduced by this plan.
- [x] Exact-head maintainer verification and zero unresolved material threads remain required.

## Open items before canonical planning merge

- [x] Reconcile planning branch to live `main` after active Spec 015 PR #341 and any successor first-wedge closeout changes. — Done 2026-09-15: forward merge `d2f310045915582f7ca91e41e62371f8995f30e4` of final main `d3e79aa59149b13f7f2ae85f6295ea7da9a52bfa` (PR #341 merged, wedge `CLOSED_CANONICAL / COMPLETE`, Issue #318 closed).
- [x] Reverify exact current Playwright source/package candidate at planning qualification time. — Done 2026-09-15: pin `d1ead3ecca23182f2d06d761c28e3d4edafb6595` resolves upstream (2026-09-11), Apache-2.0; implementation must still pin the actual package version.
- [x] Confirm no new canonical Spec 014/015 decision conflicts with Spec 016 boundary. — Done 2026-09-15: zero Spec 014 paths on reconciled main; Spec 015 delta is the additive residual slice only, satisfying predecessor preconditions.
- [x] Run exact-head cross-artifact consistency review. — Done 2026-09-15: post-reconciliation review at `f79e0502a0bea6836346b037f0f06b631870f8ca`, PASS, 0 findings; PR-head review still required at qualification.
- [x] Run final planning audit as a distinct pass/session; no external person required unless later governance says otherwise. — Done 2026-09-15: post-reconciliation audit at `f79e0502a0bea6836346b037f0f06b631870f8ca`, `READY_FOR_PLANNING_PR`, 0 findings.
- [ ] Qualify planning-only PR with repository-required CI and maintainer verification.

```text
REQUIREMENTS_CHECKLIST = READY_WITH_PRE_MERGE_OPEN_ITEMS
IMPLEMENTATION_AUTHORITY = NO
```