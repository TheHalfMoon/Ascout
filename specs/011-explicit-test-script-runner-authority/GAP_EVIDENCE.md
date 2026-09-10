# Specification 011 Gap Evidence — Explicit Test-Script Runner Authority

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #277
**Canonical planning base:** `1483c481c0ad6ab4a8b4dd15cdf9120afe86e967`
**Canonical planning-base tree:** `93d956791e7bae1c4e8985b9345442f138197be2`
**Roadmap position:** M1.2 — Evidence fidelity hardening (bounded)

## 1. Live repository state

At planning start, reverified live truth is:

- canonical `main` is `1483c481c0ad6ab4a8b4dd15cdf9120afe86e967`;
- canonical tree is `93d956791e7bae1c4e8985b9345442f138197be2`;
- open pull requests are `0`;
- canonical `specs/` contains exactly `001` through `010`;
- Spec 010 is `CLOSED_CANONICAL / GO` per Issue #276 closeout;
- repository rulesets are `[]`;
- observable `main` protection is disabled/off.

The Founder prospectively authorized the next canonical planning chain in Issue #277. That authority is planning-only and does not authorize implementation.

## 2. Measured planning signal

The first live T118 selector-shadow observation provides the bounded measured signal for this specification. Issue #276 closeout records exact live artifact identity from Self Verification run `34305108844` / #137:

- artifact id `10086362094`;
- artifact name `self-verification-e83ca564645b8103abad27a5c2c51e32cb88168c`;
- artifact digest `sha256:b7e4eeced9985ea15e3e728986a87d7ab1919f040ce3400b0f2bbddf57f2906b`;
- bound receipt exit code `4`;
- comparison `available=false`;
- comparison disposition `UNAVAILABLE`;
- reason code `UNAVAILABLE_ASCOUT_TASK_STATE`;
- bound Ascout test task status `NOT_RUN`;
- receipt reason code `js_test_runner_ambiguous` because both Vitest and Jest are declared in the discovered project scope.

Spec 010 closeout explicitly records this as a measured planning signal only, not implementation authority.

## 3. Live reproduction on canonical base

Reverified against exact canonical base `1483c481c0ad6ab4a8b4dd15cdf9120afe86e967`:

- root `package.json` `scripts.test` is exactly `vitest run`;
- root `package.json` declares both `vitest@4.1.10` and `jest@30.4.2` in `devDependencies`;
- `src/discovery.ts` `discoverRunner` returns `ambiguous` with `candidates ["jest","vitest"]`, `reasonCode js_test_runner_ambiguous`, `sourcePaths ["package.json"]` when both runners are declared in scope;
- `src/tools/vitest.ts` `planVitestTask` returns `not_run` with the discovery `reasonCode`/`reasonText` when runner state is `ambiguous` or `unsupported`;
- `src/tools/jest.ts` `planJestTask` mirrors the same fail-closed `not_run` path for `ambiguous`/`unsupported`;
- `benchmarks/selector-shadow.mjs` `validateRootPackageContract` requires root `scripts.test` to equal exactly `vitest run`, and otherwise emits `UNAVAILABLE_FULL_SUITE_CONTRACT` without running an alternate command.

Therefore on Ascout itself both conditions hold simultaneously:

1. the selector-shadow full-suite command contract is satisfied (`scripts.test` is exactly `vitest run` with an installed local Vitest runtime);
2. the bound Ascout test task is incomparable (`NOT_RUN(js_test_runner_ambiguous)`), so the shadow comparison correctly stops before reference execution with `UNAVAILABLE_ASCOUT_TASK_STATE`.

No post-observation retry, fallback command, timeout widening, or rerun-to-green occurred. The unavailable outcome is planned fail-closed behavior, not a defect in Spec 010.

## 4. Current measurement gap

Current discovery runner resolution considers only declared dependency coexistence. It does not consult the explicit root test command even when that command is a safely recognizable direct runner invocation.

Consequences on the canonical base:

- Ascout on itself cannot produce a comparable affected-selection test task despite having an unambiguous explicit root test command;
- the first live selector-shadow observation is therefore unavailable for selector-miss publication on the repository that owns the shadow harness;
- future Ascout users with the same dual-declared shape (for example a repository that keeps both runners during migration while its root test script selects exactly one) will receive the same unavailable test task even though stronger runner-authority evidence exists in their explicit command.

This is a narrow evidence-fidelity gap, not a universal runner-detection failure. Existing ambiguous-runner fail-closed behavior is correct where no trustworthy explicit authority resolves the ambiguity and must be preserved.

## 5. Narrow evidence-backed candidate

The smallest candidate is a bounded explicit test-script authority rule layered on existing discovery without changing command admission, source binding, evidence honesty, or no-green-by-omission:

1. read only the repository root `package.json` `scripts.test` value;
2. accept only an exact strict allowlist of safely recognizable direct runner commands (exact string equality, no trimming, no parsing, no shell, no argument inference);
3. apply that authority only to resolve a currently `ambiguous` Vitest/Jest coexistence into exactly one of its declared candidates;
4. never change `absent`, `unsupported`, or already-`resolved` runner states;
5. never infer an alternate command when the script is missing, empty, composite, indirect, unsupported, or unsafe;
6. never bypass the existing per-invocation changed-command-surface admission contract;
7. preserve `NOT_RUN(js_test_runner_ambiguous)` exactly where no allowlisted explicit authority applies.

The intended principle to evaluate is:

> An explicit, safely recognizable root test command may provide stronger runner-authority evidence than mere coexistence of multiple declared test frameworks, while ambiguous, composite, indirect, unsupported, or unsafe scripts must remain fail-closed.

## 6. Why this is smaller than generic script execution

This candidate does NOT add:

- arbitrary package-script execution;
- shell command parsing or reconstruction;
- package-manager executor inference (`npx`, `npm exec`, `yarn dlx`, `pnpm dlx`);
- nested `scripts.test` ownership or workspace script fan-out;
- new runner support beyond the existing Vitest/Jest discovery vocabulary;
- new configuration surface, CLI flag, receipt field, or trust grant;
- new dependency, action, service, database, telemetry, plugin framework, or generic adapter;
- any change to Spec 007 terminal disposition, consumed Spec 007 attempts, historical benchmark results, or release state.

It reuses the existing trusted local discovery boundary, the existing Vitest/Jest planners, and the existing selector-shadow exact `vitest run` contract.

## 7. Decision

Measured evidence supports planning a bounded explicit test-script authority contract because:

- a live same-repository observation proved the ambiguous-runner unavailable path on Ascout itself;
- the explicit root command on that same repository is exactly `vitest run`, a direct runner invocation with no composition or indirection;
- current discovery ignores that stronger authority signal;
- a strict-allowlist rule can resolve exactly this class without weakening fail-closed behavior elsewhere;
- no continuous comparable Ascout test task currently exists for this repository shape.

`GAP_EVIDENCE = SUFFICIENT_FOR_PLANNING`

`IMPLEMENTATION_AUTHORITY = NO`
