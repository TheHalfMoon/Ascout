# Specification 011 Cross-Artifact Analysis — Explicit Test-Script Runner Authority

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Scope

This analysis checks `GAP_EVIDENCE.md`, `spec.md`, `clarifications.md`, `ponytail-review.md`, `plan.md`, `plan-ponytail-review.md`, `tasks.md`, `SUPPLY_CHAIN_REVIEW.md`, and `checklists/requirements.md` for authority, scope, semantics, dependency, bounded-execution, and YAGNI consistency.

## A1 — Authority chain

Finding: **PASS**.

Issue #277 grants planning authority only. Every planning artifact preserves `IMPLEMENTATION_NOT_AUTHORIZED`. No file claims planning merge alone can authorize T120.

## A2 — Roadmap and frontier selection

Finding: **PASS**.

Explicit script authority is treated as the bounded M1.2 evidence-fidelity candidate directly measured by the first live T118 observation, while Spec 007 remains terminal and research issues remain non-authoritative. The roadmap is explicitly not treated as direct implementation authority.

## A3 — Measured gap

Finding: **PASS**.

The package binds the planning need to canonical evidence:

- T118 live artifact `10086362094` with `js_test_runner_ambiguous`, `NOT_RUN`, and `UNAVAILABLE_ASCOUT_TASK_STATE`;
- reverified root `scripts.test == "vitest run"` with both `vitest@4.1.10` and `jest@30.4.2` declared;
- reproduced discovery `ambiguous` with `candidates ["jest","vitest"]` and `sourcePaths ["package.json"]`;
- existing selector-shadow frozen `vitest run` contract that is satisfied while the bound test task remains incomparable.

No artifact claims a currently known unrepaired selector defect or a universal runner failure.

## A4 — Product boundary

Finding: **PASS**.

All artifacts agree there is no Receipt v1, selector, widening, coverage, exercise, CLI, config, package, dependency, historical-result, benchmark-result, release, or Project CI mutation. The only product-logic change is the narrow discovery resolver plus planner consumption.

## A5 — Execution trust boundary

Finding: **PASS**.

All artifacts preserve trusted-local scope, no implicit install, per-invocation changed-surface admission, no persistent trust, and no new workflow, permission, secret, or fork execution.

## A6 — Source identity and determinism

Finding: **PASS**.

Explicit authority is a pure deterministic function of the already-collected discovery file map. No new file read, process, network, clock, randomness, or environment dependency is introduced. Canonical-path validation and privacy-safe persistence are preserved.

## A7 — Command authority

Finding: **PASS**.

Root-only exact-string authority with a frozen two-entry allowlist is consistent across gap, spec, clarifications, plan, reductions, tasks, and checklist. Ambiguous-only application constrained to root-manifest declarations, single/absent/unsupported preservation, byte-identical existing-outcome retention including nested-declaration ambiguous preservation, and unchanged `classifyCommandSurfaces` admission are stated identically everywhere. No auto-admission, alternate-command inference, shell, or implicit install is allowed.

## A8 — Failure and unavailable semantics

Finding: **PASS**.

Every relevant artifact states that non-allowlisted scripts preserve the existing discovery outcome without inferring a runner, that remaining `NOT_RUN` tasks retain reasons and incompleteness exit behavior, and that nested-declaration ambiguous outcomes preserve declaration provenance. Unavailable shadow comparisons remain unavailable; no new pass claim is created.

## A9 — Non-gating and threshold semantics

Finding: **PASS**.

No recall threshold, speedup claim, universal recall claim, causal claim, or merge-gate change exists. A newly resolved runner only allows existing verification to observe and report; it does not itself assert success.

## A10 — Privacy

Finding: **PASS**.

Artifacts allow only the existing `sourcePaths: ["package.json"]` and resolved runner value. Raw script text beyond exact matches, absolute paths, credentials, tokens, environment, actor/host identity, repository URL, and raw stdout/stderr are prohibited.

## A11 — YAGNI

Finding: **PASS**.

The final implementation surfaces are exactly:

```text
T120:
  src/discovery.ts
  src/tools/vitest.ts
  src/tools/jest.ts
  tests/t120-explicit-script-authority.contract.test.ts
T121:
  ledger/governance only
```

No shell parser, executor support, argument grammar, nested-script authority, lockfile/binary/config inference, new config/CLI/plugin, database, service, dashboard, generic adapter, new dependency, or new action is justified.

## A12 — Supply chain

Finding: **PASS**.

No new dependency/action/service/donor is planned. Existing TypeScript, Vitest/Jest, and exact-SHA actions must be reverified at implementation time.

## A13 — Task dependency order

Finding: **PASS**.

`T120 -> T121` is consistent everywhere. T121 cannot begin before T120 canonical closeout.

## A14 — Qualification

Finding: **PASS**.

Focused contracts, full repository tests/typecheck/build, exact-head Self Verification, original-attempt six-lane Project CI, fresh independent substantive exact-head review, zero unresolved material threads, branch purity, live rules/protection revalidation, guarded expected-head merge, and post-merge ordered-parent/tree/signature/PR/main proof are required consistently.

## A15 — Failure/return-to-planning behavior

Finding: **PASS**.

The package forbids post-evidence allowlist widening, argument tolerance, executor support, and ambiguous reinterpretation. Any unsafe or insufficient allowlist discovered during implementation returns to planning through a separately reviewed amendment.

## A16 — Historical evidence preservation

Finding: **PASS**.

T078/T091 and Spec 007 evidence remain immutable. New discovery logic is current-run only and never rewrites historical bytes.

## Overall

`CROSS_ARTIFACT_ANALYSIS = PASS`

`IMPLEMENTATION_AUTHORITY = NO`
