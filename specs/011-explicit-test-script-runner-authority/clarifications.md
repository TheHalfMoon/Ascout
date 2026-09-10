# Specification 011 Clarifications — Explicit Test-Script Runner Authority

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`

## C1 — Is this a selector repair?

No. Spec 011 changes only how discovery resolves an ambiguous Vitest/Jest coexistence when an explicit allowlisted root test command exists. It does not change selection, widening, coverage, exercise, finding, or selector-miss semantics.

## C2 — Why is planning justified after Spec 010 closed GO?

Because the first live T118 observation proved a stable unavailable path on Ascout itself: the shadow full-suite contract is satisfied while the bound Ascout test task is `NOT_RUN(js_test_runner_ambiguous)`. The explicit root command `vitest run` already exists as stronger authority evidence, but current discovery ignores it. That is a bounded evidence-fidelity gap discovered through canonical measurement, not a reinterpretation of Spec 010 success.

## C3 — Why only the root test script?

Only the repository root `package.json` `scripts.test` is the existing canonical single-package test entry point already referenced by the selector-shadow frozen contract. Nested workspace scripts have separate ownership and package scope under Spec 002. Consulting them for global runner authority would expand scope and risk misattribution. Spec 011 stays root-only.

## C4 — Why only two exact strings?

Exact equality is the simplest defensible authority signal. It requires no shell parsing, no argument grammar, no executor knowledge, and no fuzzy recognition. `vitest run` is the measured Ascout case and the existing shadow contract. `jest` is the symmetric bare direct invocation for the only other runner in the current discovery vocabulary. Every other shape remains fail-closed until separately measured and reviewed.

## C5 — Why not trim whitespace or ignore quotes?

Trimming or quote-stripping would silently repair a non-canonical command into a valid-looking authority. Explicit authority must be recognizable without repair. ` vitest run`, `vitest run `, `"vitest run"`, and `'vitest run'` therefore confer no authority.

## C6 — What about `vitest run --coverage` or `jest --ci`?

Fail closed under Spec 011. Additional flags change the effective command surface and would require separate argument-safety review. The allowlist contains no parameterized entries. A flagged script preserves the existing ambiguous outcome rather than resolving to a runner.

## C7 — What about `npx vitest run` or `yarn jest`?

Fail closed. Package-manager executors, `npx`, `npm exec`, `yarn dlx`, `pnpm dlx`, `node`, `bun`, and `deno` wrappers are indirect execution. They require executor-resolution and network/install reasoning that Spec 011 explicitly excludes. No indirect script confers authority.

## C8 — What about an absolute path or `./node_modules/.bin/vitest run`?

Fail closed. Path-based invocation requires filesystem and executable-identity reasoning beyond exact-string authority. Only the two bare direct commands are allowlisted.

## C9 — What if only one runner is declared but the script names the other?

No change. Explicit authority applies only to the ambiguous `{jest, vitest}` coexistence. A single declared runner keeps its current resolved outcome. A contradictory script does not override, repair, or invalidate that outcome under Spec 011. If that contradiction matters, it remains visible through the existing changed-surface and planner checks, not through silent runner substitution.

## C10 — What if no runner is declared?

No change. Explicit authority does not create a runner. `absent(js_test_runner_not_discovered)` is preserved even when an allowlisted script string exists. Declaration coexistence remains necessary; the script only selects among co-declared candidates.

## C11 — Does explicit authority bypass changed-surface admission?

No. Runner resolution and execution admission are separate. If root `package.json` is in the changed surface for the test task, the task is still refused by default as `NOT_RUN(command_surface_changed)` and requires explicit per-invocation human admission. The allowlist never auto-admits.

## C12 — Does this change the selector-shadow reference command?

No. The shadow harness keeps its frozen exact `vitest run` contract, local-runtime check, no-shell, no-install, and 10-minute timeout behavior. Spec 011 may make Ascout's own bound test task comparable in a future observation, but it does not authorize a second shadow runner or a broader shadow command.

## C13 — Is `NO_MISS_OBSERVED` affected?

No. Unavailable remains unavailable with its reason. A newly comparable test task only allows future observations to reach a comparable disposition through the existing exact-identity comparison. No threshold, recall claim, or causal claim is added.

## C14 — What are the exact implementation surfaces planned?

T120 candidate:

- `src/discovery.ts` — pure explicit script-authority resolver plus narrow ambiguous-only integration;
- `src/tools/vitest.ts` — consume post-authority resolution without duplicating script parsing;
- `src/tools/jest.ts` — consume post-authority resolution without duplicating script parsing;
- `tests/t120-explicit-script-authority.contract.test.ts` — new focused deterministic contracts.

T121 is ledger/governance reconciliation only by default.

No other tracked file is planned.

## C15 — What stops implementation?

Planning merge alone does not authorize T120. A separate implementation authorization must bind the exact canonical planning merge and exact file/task boundaries.

## C16 — What if focused proof discovers the allowlist is unsafe or insufficient?

Stop and return to planning. Do not widen the allowlist, add argument tolerance, add executor support, or reinterpret ambiguous outcomes after seeing implementation evidence. Any broader authority requires a separately reviewed planning amendment.

## C17 — Does Spec 011 reopen Spec 007?

No. Spec 007 remains `NO_GO / TERMINAL_UNDER_CURRENT_SPEC`. No donor execution, T113 successor ref, result synthesis, or recovery reinterpretation is authorized.

## C18 — Does Spec 011 rewrite T078/T091 history?

No. Historical benchmark results are immutable gap evidence. New discovery behavior is current-run logic only and never rewrites historical result bytes.
