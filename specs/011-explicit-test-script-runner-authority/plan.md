# Spec 011 Technical Plan — Explicit Test-Script Runner Authority

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`
**Planning ledger:** Issue #277
**Canonical base:** `1483c481c0ad6ab4a8b4dd15cdf9120afe86e967`

## 1. Objective

Add one bounded deterministic discovery rule that resolves an ambiguous Vitest/Jest coexistence from an explicit allowlisted root test command, without changing any other discovery, planner, admission, receipt, selector, or execution behavior.

After T120, Ascout on itself (root `scripts.test == "vitest run"` with both runners declared) must plan a Vitest test task instead of stopping at `NOT_RUN(js_test_runner_ambiguous)`, while every non-allowlisted script shape preserves byte-identical ambiguous behavior.

## 2. Planned implementation surfaces

### T120 — Authority plus planner integration plus contracts

Exactly:

- `src/discovery.ts` — new pure explicit script-authority resolver plus narrow ambiguous-only integration;
- `src/tools/vitest.ts` — consume post-authority resolution without duplicating script parsing;
- `src/tools/jest.ts` — consume post-authority resolution without duplicating script parsing;
- `tests/t120-explicit-script-authority.contract.test.ts` — new focused deterministic contracts.

### T121 — Reconciliation

Ledger/governance only by default. No tracked repository mutation is planned.

No `benchmarks/**`, workflow, receipt, schema, selector, package metadata, lockfile, benchmark-result, Spec 007, release, tag, or publication mutation.

## 3. Discovery input contract

Inputs are already-collected discovery values; no new file read is authorized:

- `allManifests`: in-scope manifests already filtered by workspace scope;
- `root`: manifest with `path == "package.json"` when present;
- `scopedManifests`: manifests in `workspace.packageJsonPaths`;
- existing `discoverRunner(scopedManifests)` ambiguous result with `candidates`, `reasonCode`, `reasonText`, `sourcePaths`.

The resolver reads only `root.value.scripts.test` when `root` exists and is in scope. If `root` is absent, out of scope, invalid, or its `scripts.test` is not a string, authority is absent.

## 4. Explicit authority function

New pure function conceptually named `explicitTestScriptAuthority`:

```text
input: root manifest value or null
output: "vitest" | "jest" | null
```

Rules:

1. if input is null or not a record, return null;
2. read `scripts.test`; if typeof value !== "string", return null;
3. if value === "vitest run", return "vitest";
4. if value === "jest", return "jest";
5. otherwise return null.

No trimming, no case folding, no quote handling, no substring search, no regex, no shell tokenization, no environment read, no I/O. The function is total and deterministic.

## 5. Ambiguous-only integration

In the runner-resolution path (conceptually inside `discoverProjectFromFiles` after workspace scoping):

1. compute the existing `discoverRunner(scopedManifests)` outcome;
2. if outcome state is not `ambiguous`, return it unchanged;
3. if ambiguous candidates are not exactly `{jest, vitest}` (sorted comparison), return it unchanged;
4. if ambiguous `sourcePaths` are not exactly `["package.json"]`, return the ambiguous outcome unchanged byte-for-byte, so nested runner declarations never resolve from a root script and no declaration provenance is discarded;
5. compute explicit authority from the in-scope root manifest;
6. if authority is null, return the ambiguous outcome unchanged byte-for-byte;
7. if authority names a runner not in the ambiguous candidate set, return the ambiguous outcome unchanged;
8. otherwise return `{ state: "resolved", value: authority, sourcePaths: ["package.json"] }` with explicit provenance indicating script authority.

The resolved `sourcePaths` remains `["package.json"]` because resolution is constrained to the measured shape where both declarations and the script live in the root manifest. No new path is introduced and no nested declaration path is discarded.

Implementation must preserve the exact existing ambiguous `reasonCode`, `reasonText`, `candidates`, and `sourcePaths` values on every non-resolving path. Tests must assert byte-level preservation, not merely state preservation.

## 6. Planner integration

`planVitestTask` and `planJestTask` already branch on `discovery.jsTestRunner` state:

- `absent` -> `not_applicable`;
- `ambiguous`/`unsupported` -> `not_run` with discovery reason;
- resolved non-matching runner -> `not_applicable(runner_not_*)`;
- resolved matching runner -> proceed to scope/config/runtime checks.

No planner logic change is required beyond consuming the post-authority `discovery.jsTestRunner` value already passed in `input.discovery`. Implementation must not duplicate script parsing inside either planner. If either planner currently re-derives runner state instead of consuming `input.discovery.jsTestRunner`, it must be aligned to consume the single discovery outcome.

All downstream planner gates remain unchanged, including:

- Ascout config `enabled=false` and arbitrary `command` handling;
- changed-path validation;
- scope-root selection;
- config-ambiguity refusal;
- local executable plus coverage-provider (Vitest) or local Jest resolution;
- run-id safety;
- artifact path construction.

## 7. Changed-surface interaction

`classifyCommandSurfaces` and `baseAuthorityPaths` are unchanged. For the test task the authority set already includes:

- `packageScriptAuthority.test` owners (root `package.json` on Ascout);
- runner declaration paths;
- resolved runner config paths.

Explicit resolution does not add or remove authority paths. A diff touching root `package.json` therefore still yields `command_surface_changed=true` with the changed path shown, and execution still requires explicit per-invocation admission recorded in the receipt.

## 8. Fail-closed taxonomy

Focused contracts must cover at minimum these root `scripts.test` shapes, each preserving ambiguous behavior with both runners declared:

1. missing `scripts` object;
2. missing `test` key;
3. non-string `test` (number, boolean, null, object, array);
4. empty string;
5. whitespace-only string;
6. whitespace-padded allowlist (`" vitest run"`, `"vitest run "`, `" jest"`);
7. case variant (`"VITEST RUN"`, `"Jest"`);
8. quoted allowlist (`"\"vitest run\""`, `"'vitest run'"`);
9. composite chaining (`"vitest run && jest"`, `"vitest run; jest"`, `"vitest run || jest"`, `"vitest run | jest"`);
10. substitution or expansion (`"$(vitest run)"`, `` "`vitest run`" ``, `"$npm_package_scripts_test"`, `"vitest $ARGS"`);
11. redirection or glob (`"vitest run > out.txt"`, `"vitest run *"`);
12. indirect executor (`"npx vitest run"`, `"npm run vitest run"`, `"yarn vitest run"`, `"pnpm vitest run"`, `"node ./node_modules/.bin/vitest run"`, `"npx jest"`, `"yarn jest"`);
13. path invocation (`"./node_modules/.bin/vitest run"`, `"/usr/bin/jest"`, `"../bin/jest"`);
14. flagged allowlist (`"vitest run --coverage"`, `"vitest --run"`, `"jest --ci"`, `"jest --json"`);
15. unsupported runner (`"mocha"`, `"ava"`, `"tap"`, `"playwright test"`);
16. unsafe characters (NUL, newline, `../` traversal outside canonical spelling where applicable through JSON string values that would not be exact allowlist matches).

Positive contracts must cover:

- `"vitest run"` with both runners declared in the root manifest resolves to `vitest`;
- `"jest"` with both runners declared in the root manifest resolves to `jest`;
- `"vitest run"` with nested runner declarations (ambiguous `sourcePaths` beyond `["package.json"]`) preserves ambiguous without discarding declaration provenance;
- single vitest declaration with either script preserves resolved vitest;
- single jest declaration with either script preserves resolved jest;
- no declared runner with allowlisted script preserves absent;
- nested-only declarations without root in scope are unaffected per existing workspace scoping.

## 9. Determinism and testability

The resolver and integration must be unit-testable from in-memory `DiscoveryFileMap` inputs via the existing `discoverProjectFromFiles` entry point, without touching the filesystem, launching processes, or reading environment.

Ordering guarantees:

- ambiguous candidates remain sorted;
- resolved outcomes expose deterministic `value` and `sourcePaths`;
- no timestamp, random, or map-iteration nondeterminism may affect the outcome.

## 10. Privacy and paths

No new persisted path or string beyond the existing `sourcePaths: ["package.json"]` and resolved runner value. Raw script text beyond the two allowlisted exact matches is never persisted as authority; non-matching scripts leave no new evidence field. All path handling reuses existing canonical-path validation.

## 11. No other behavior change

Implementation must prove through existing plus focused tests that:

- TypeScript, ESLint, pytestBasic, package-manager, and workspace discovery are unchanged;
- Vitest/Jest scope, config, runtime, coverage, and artifact contracts are unchanged except for reaching those checks in newly resolved cases;
- receipt model, validator, exit-code precedence, terminal rendering, agent output, drift detection, selection accounting, exercise reporting, redaction, run lock, and process control are unchanged.

## 12. Focused proof scope

The new contract file must cover all material cases in section 8 plus planner-level assertions that:

- a newly resolved Vitest input proceeds past runner gating to scope/config/runtime checks (and reaches `planned` when a minimal valid local fixture is supplied, or a precise downstream reason otherwise);
- a newly resolved Jest input behaves symmetrically;
- unresolved ambiguous inputs still surface `js_test_runner_ambiguous` to both planners;
- changed-surface admission still refuses when root `package.json` is changed, even for newly resolved runners.

Full repository `npm test`, `npm run typecheck`, and `npm run build` must pass as applicable on the exact implementation head.

## 13. Qualification and merge gates

T120 requires the standard exact-head gates: reverified canonical base, one-task branch purity (exactly the four authorized paths), focused proof, full tests/typecheck/build, exact-head Self Verification success, original-attempt six-lane Project CI success, fresh independent substantive exact-head review with zero unresolved material threads, live rules/protection revalidation, unchanged base immediately before guarded expected-head normal merge, and post-merge ordered-parent/tree/signature/PR/main proof.

On any material mismatch: `NO_GO / RETURN_TO_PLANNING`.

## 14. Budget

No new execution timeout, job timeout, or retention change is planned. Discovery evaluation is synchronous in-memory work with no process or network budget. No benchmark replay or live observation artifact is required for T120 beyond the standard Self Verification receipt on the exact head.
