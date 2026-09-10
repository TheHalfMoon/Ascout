# Specification 011 Requirements Quality Checklist

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## Scope and authority

- [x] Founder planning authority is recorded in Issue #277.
- [x] Planning authority is explicitly separated from implementation authority.
- [x] Canonical planning base and tree are recorded.
- [x] Spec 011 does not reopen Spec 007.
- [x] Historical T078/T091 evidence is treated as immutable input only.
- [x] Roadmap ordering is used as planning input, not direct implementation authority.
- [x] Live T118 `js_test_runner_ambiguous` signal is treated as planning signal only until this chain closes.

## Problem and evidence

- [x] Live Ascout root `scripts.test == "vitest run"` with both runners declared is documented.
- [x] Live discovery `ambiguous(js_test_runner_ambiguous)` reproduction is documented.
- [x] Live T118 `UNAVAILABLE_ASCOUT_TASK_STATE` / `NOT_RUN` artifact binding is documented.
- [x] No unsupported universal runner-defect claim is made.
- [x] Existing ambiguous fail-closed behavior is characterized as correct where no explicit authority applies.

## Explicit authority contract

- [x] Root-only `package.json` `scripts.test` source is frozen.
- [x] Strict exact-string allowlist is frozen to exactly `"vitest run"` and `"jest"`.
- [x] No trimming, case folding, quote stripping, substring, regex, or shell interpretation.
- [x] Ambiguous-only application to exactly `{jest, vitest}` is frozen.
- [x] Single, absent, and unsupported preservation is required.
- [x] Byte-identical ambiguous preservation on non-resolving paths is required.
- [x] Exhaustive fail-closed taxonomy for missing, non-string, empty, padded, composite, indirect, unsupported, unsafe, and contradictory shapes is defined.

## Trust boundary

- [x] Trusted local repository scope is preserved.
- [x] No implicit install is added.
- [x] Changed-surface per-invocation admission is unchanged.
- [x] No persistent or agent-injected admission is added.
- [x] Source binding, exact path integrity, determinism, privacy, and no-green-by-omission are preserved.
- [x] No new config, CLI, trust grant, or override surface is added.

## Planner and downstream preservation

- [x] Vitest/Jest planners consume the single post-authority value without duplicated parsing.
- [x] Existing scope, config-ambiguity, runtime, coverage, run-id, and artifact gates are preserved.
- [x] Receipt, selector, widening, coverage, exercise, finding, exit-code, drift, redaction, lock, and process semantics are unchanged.
- [x] Selector-shadow frozen `vitest run` contract and timeouts are unchanged.

## YAGNI and supply chain

- [x] No shell parser, executor support, argument grammar, or nested-script authority.
- [x] No lockfile/binary/config inference for runner identity.
- [x] No new public CLI/config/plugin/API.
- [x] No new dependency/action/workflow/service/database/dashboard.
- [x] No donor execution or historical replay.
- [x] No new license/use decision beyond implementation-time revalidation of existing components.

## Tasking and qualification

- [x] Exact order is `T120 -> T121`.
- [x] T120 candidate paths are exactly four files.
- [x] T121 is ledger-only by default.
- [x] Exact-head focused proof is defined.
- [x] Six-lane Project CI and Self Verification requirements are defined.
- [x] Fresh independent exact-head review is required.
- [x] Zero unresolved material threads is required.
- [x] Guarded expected-head merge and post-merge identity proof are required.
- [x] Stop/return-to-planning conditions include allowlist insufficiency or unsafety discovered during implementation.

`REQUIREMENTS_QUALITY = PASS`

`IMPLEMENTATION_AUTHORITY = NO`
