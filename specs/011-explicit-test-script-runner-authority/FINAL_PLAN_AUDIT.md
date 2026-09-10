# Specification 011 Final Plan Audit — Explicit Test-Script Runner Authority

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Audit purpose

Determine whether the Spec 011 planning package is sufficiently complete, bounded, internally consistent, and evidence-backed to enter exact-head planning qualification.

## Audited artifacts

1. `GAP_EVIDENCE.md`
2. `spec.md`
3. `clarifications.md`
4. `ponytail-review.md`
5. `plan.md`
6. `plan-ponytail-review.md`
7. `tasks.md`
8. `SUPPLY_CHAIN_REVIEW.md`
9. `checklists/requirements.md`
10. `analysis.md`
11. this audit
12. final `HEAD_CROSS_ARTIFACT_REVIEW.md` after all content is frozen

## F1 — Evidence-backed need

**PASS.** The live T118 artifact binding plus reverified root `scripts.test == "vitest run"` with dual-declared runners proves a stable unavailable path that a strict allowlist can resolve without weakening fail-closed behavior.

## F2 — Minimality

**PASS.** The package adds only a pure root-only exact-string resolver, narrow ambiguous-only integration, planner consumption without duplicated parsing, and one focused contract file. No product-core or generic framework work is planned.

## F3 — Authority separation

**PASS.** Issue #277 is planning-only. Every artifact requires a separate durable implementation authorization after canonical planning merge.

## F4 — Trust boundary

**PASS.** Trusted-local scope, no implicit install, per-invocation changed-surface admission, no persistent trust, and no new workflow, permission, secret, or fork execution are preserved.

## F5 — Evidence integrity

**PASS.** Deterministic pure evaluation over already-collected discovery inputs preserves source binding, exact path integrity, and evidence honesty. Remaining ambiguous outcomes retain reasons and incompleteness semantics.

## F6 — Command authority

**PASS.** Root-only frozen allowlist (`"vitest run"` and `"jest"`), ambiguous-only application constrained to root-manifest declarations, single/absent/unsupported preservation without mapping non-ambiguous states to ambiguous, byte-identical existing-outcome retention including nested-declaration provenance preservation, and unchanged admission are enforced consistently.

## F7 — Runner semantics

**PASS.** Vitest plans on resolved vitest, Jest plans on resolved jest, existing `runner_not_*` paths and all downstream scope/config/runtime/coverage/run-id gates remain unchanged.

## F8 — Non-gating/no-threshold semantics

**PASS.** No threshold, recall claim, speedup claim, causal claim, receipt change, selector change, or merge-authority change exists. Resolution only allows existing verification to observe.

## F9 — Privacy and boundedness

**PASS.** Only existing `sourcePaths` and resolved runner value are exposed. Raw script text beyond exact matches, absolute paths, credentials, tokens, environment, actor/host identity, repository URL, and raw stdout/stderr are prohibited.

## F10 — Supply chain

**PASS.** No new dependency/action/service/donor. Existing TypeScript, Vitest/Jest, and exact-SHA actions must be reverified at implementation time.

## F11 — Exact implementation scope

**PASS.** Planned files are frozen as:

```text
T120:
  src/discovery.ts
  src/tools/vitest.ts
  src/tools/jest.ts
  tests/t120-explicit-script-authority.contract.test.ts

T121:
  ledger/governance only by default
```

## F12 — Qualification completeness

**PASS.** Focused tests, full Project CI, Self Verification, independent substantive exact-head review, zero unresolved material threads, guarded merge, post-merge proof, and return-to-planning conditions are explicitly required.

## F13 — Failure/return-to-planning behavior

**PASS.** The package forbids ad hoc allowlist widening, argument tolerance, executor support, and ambiguous reinterpretation after implementation evidence. Any broader authority requires a separately reviewed planning amendment.

## F14 — Historical evidence preservation

**PASS.** T078/T091 and Spec 007 evidence remain immutable.

## F15 — No hidden timeout or budget expansion

**PASS.** Discovery evaluation is synchronous in-memory work. No job timeout, reference timeout, retention, benchmark replay, or live-observation gate change is planned.

```text
FINAL_PLAN_AUDIT = PASS
PLANNING_CONTENT_FROZEN = PENDING_HEAD_REVIEW
IMPLEMENTATION_AUTHORITY = NO
```
