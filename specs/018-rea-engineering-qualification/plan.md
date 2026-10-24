# Technical plan

## Baseline and coordination

Original control base is `ea93553a`. Each close verifies live main and forward-merges it before final qualification. Preserve the dirty original checkout. Do not integrate unlanded #589 Git execution hardening, #614 Git hashing performance or #633 security dedup code as canonical facts. Source changes to their claimed surfaces require a separately coordinated decision; read-only comparative diagnosis is allowed.

The implementation tasks are independent compatibility repairs against already merged native/review/test/browser spines. They do not depend on each other's unmerged code. Execute builders sequentially after the baseline control, with a fresh context per task, and review source-bound deltas. One task/branch/PR; no broad production branch.

## REA-E00: full-suite diagnosis

Capture the existing failure logs and fresh complete serial run. Keep individual timeouts and platform conditionals unchanged. Inspect the first failures, deterministic reproduction, resource contention, command/environment differences, cleanup and fixture ownership. Fix only a proven defect within a prospective bounded task; preserve every prior result. A host limitation or unlanded overlapping repair is an explicit blocker, not a reason to weaken contracts.

## REA-E01: diagnostic loss accounting

Add accounting at the current review normalization/coverage seam. Bind the declared input inventory, normalized records and explicit excluded observations to the same execution/source identity. Count each input once; reject duplicates/foreign output and unsafe raw paths before normalization; represent unaccounted outputs and location uncertainty explicitly. Reuse existing normalized records and validators; do not create canonical Findings or scan completeness. Keep existing batch-return API intact; an additive accounting-return API may compose it. Product callers must be able to observe omitted, rejected and unaccounted diagnostics rather than silently filtering them.

Allowed paths: `src/assurance/review/coverage-accounting.ts`, `src/assurance/review/finding-normalization.ts`, a narrowly required `src/assurance/review/diagnostic-accounting.ts`, focused `tests/review-diagnostic-accounting*.test.ts`, task documentation/evidence. Existing kernel/contracts/security/CLI frozen for this task.

## REA-E02: conservative selection

Use `decidePreRunWidening` and existing full planner paths. Treat unknown non-source relation-bearing changes conservatively, including text/data inputs that the native related selector cannot prove. Recognized source, test/config, renames/deletions and binary cases retain current semantics. Never infer graph completeness from a missing edge. Preserve existing full pytest; no testmon/Nx installation or narrowing. Use the current risk-path carriers and trigger vocabulary when sufficient.

Allowed paths: `src/selection.ts`, minimally necessary `src/check.ts` only if existing planner composition requires it, focused selection contract/integration tests, task documentation/evidence. No command/config schema expansion.

## REA-E03: Stryker output translation

Add one bounded JSON producer translator beside `mutation-adapter.ts`. Pass normalized aggregate output through `normalizeExternalMutationOutputV1`; retain a deterministic status inventory for statuses not expressible as killed/survived. Validate counts, per-file/ID uniqueness, schema/version, original path spelling and supplied source/attempt binding. Hash original report bytes. Unknown/malformed/truncated/empty/error reports cannot become a quality PASS. Use the research's real strong/weak reports plus adversarial fixtures; do not copy donor code or add dependencies.

Allowed paths: `src/assurance/test/stryker-output.ts`, minimally necessary additive changes to `mutation-adapter.ts` only after documenting compatibility, `tests/assurance-test-stryker-output.test.ts`, task documentation/evidence. No new process runner or CLI.

## REA-E04: deterministic browser assertions

Prefer an additive typed DOM assertion request in the existing executor/runtime for exact literal target text, visibility and/or input value only where actually needed. One supported minimal subset is sufficient; avoid speculative kinds. All operations have a shared request deadline, session/source binding and current locator policy. Keep original free-text calls deferred. Missing, ambiguous or invalid targets, broken state, timeout, wrong session and disposal must not pass. Use real pinned Chromium and an owned loopback fixture; no model/provider/network target.

Allowed paths: `src/browser/executor.ts`, `src/browser/playwright-adapter.ts`, focused browser contract/integration tests and `docs/browser-playwright-adapter.md`, task documentation/evidence. No new framework, dependency or navigation authority.

## Qualification and publication

Tests first, then minimal implementation, strict typecheck/build and focused tests. Full suite runs after each phase as required, with a final integrated candidate control after forward merges into the run branch if integration is legitimate. Existing failures remain independently tracked. Official OCR delegation preview/rules, local D1 advisory triage, Graft navigation and applicable E2E execution are recorded truthfully. PStack review uses fresh-context local judges per founder direction, with security review for external JSON/paths and browser trust boundaries. Preserve provider-independence limitations. No mandatory gate is silently satisfied by advisory tools.

Before any merge-ready claim require effective scope/authorization, fresh exact-head reviews, applicable six-lane CI and material findings reconciled. Public hosted CI now executes; retain the original pre-execution billing failures. Queued/running jobs remain pending. No account limitation permits bypassing CI or incurring charges. Self Verification follows its canonical Spec006 capture contract; green capture is not a clean inner receipt.
