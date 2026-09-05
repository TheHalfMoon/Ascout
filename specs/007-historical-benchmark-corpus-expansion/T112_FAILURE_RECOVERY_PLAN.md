# T112 Failure Recovery Plan

**Status:** PLANNING_ONLY / IMPLEMENTATION_NOT_AUTHORIZED  
**Planning ledger:** Issue #195  
**Execution-route ledger:** Issue #171  
**Canonical planning base:** `2955969c16a456c44da8dd4c1e31f8ad3fa6f9a4`

## Trigger

The first and only qualifying T112 attempt is immutable failure evidence:

- ref: `run/spec007-t112-immer`
- workflow run: `33993150910`
- job: `101378857705`
- event: `create`
- `run_attempt=1`
- source/workflow SHA: `2955969c16a456c44da8dd4c1e31f8ad3fa6f9a4`
- source tree: `6d05a6c7329ecd826e5b07bd2e271fddccb1fb1a`
- conclusion: `failure`
- replay artifact: none

The run passed exact ref/source binding, Node `24.15.0`, Yarn Classic `1.22.22`, controller install/build, and clean-source guards. The unchanged canonical harness then failed before donor acquisition/reconstruction/oracle execution:

`invalid_case: selection case immer-draftmap-iterator-compatibility must contain exactly one explicit full-suite/reference command label`

The run MUST NOT be rerun. The ref MUST NOT be moved, deleted/recreated, updated, or reused.

## Root cause

The canonical `immer-draftmap-iterator-compatibility` case currently records the frozen reviewed reference command as:

- label: `project-native source-suite/reference command`
- command: `yarn test:src`

`benchmarks/harness-lib.mjs` intentionally recognizes one exact selection reference grammar:

- label: `project-native full-suite/reference command`

The command value is not the defect. The canonical manifest label is incompatible with the already-canonical command extractor.

The generic `tests/benchmark-harness.test.ts` fixture uses the recognized grammar and does not verify command extraction against every real selection case in `benchmarks/manifest.json`, which allowed the mismatch to pass T110 qualification.

## Recovery design

The recovery remains a data/contract correction, not a parser expansion.

### R007-03 — Immer command-label contract correction

Prospective tracked mutation surface, only after a separate implementation authorization becomes canonical:

- `benchmarks/manifest.json`
- `tests/benchmark-harness.test.ts`

Required behavior:

1. preserve `benchmarks/harness-lib.mjs` unchanged;
2. update only the Immer case command label from `project-native source-suite/reference command` to `project-native full-suite/reference command`;
3. preserve exact command `yarn test:src`;
4. preserve targeted command `yarn test:src __tests__/map-set.js`;
5. preserve plain comparator `yarn test`;
6. preserve related selector `yarn vitest related src/plugins/mapset.ts --run`;
7. preserve repository, base/fix/oracle Git objects, changed paths, reconstruction recipe, lockfile, Node/Yarn identities, license evidence, regression ids, historical basis, runtime-capability requirement, and every other candidate semantic field;
8. change `case_revision` from `1` to `2` because this correction changes the executable interpretation of the case contract and revision 1 must remain attributable to the failed first attempt;
9. change `manifest_revision` from `12` to `13` so the corrected case identity is bound to a distinct manifest revision;
10. keep lifecycle state `CASE_REVIEWED` and `oracle.observation = null` until a new authorized replay qualifies;
11. add focused test coverage that loads the actual manifest and proves `extractSelectionCommands` succeeds for every selection case, including exact expected Immer revision-2 commands;
12. do not alter historical result files.

The focused test must fail against the current canonical revision-1 manifest and pass only after the prospective manifest correction.

No parser relaxation, regex alternative, generalized label aliasing, product change, selector change, schema change, donor change, oracle change, polyfill, compatibility shim, or result mutation is planned.

### R007-04 — single-use T112 recovery execution binding

This unit is blocked until R007-03 is canonically qualified and closed.

Prospective tracked mutation surface, only after separate explicit authority:

- `.github/workflows/spec-007-isolated-replay.yml`

Required behavior:

- add exactly one new branch admission:
  - `run/spec007-t112-immer-r2` -> `immer-draftmap-iterator-compatibility`
- preserve create-event-only triggering;
- preserve `github.run_attempt == '1'` qualification;
- preserve `github.sha == github.workflow_sha` and exact event-source checkout guards;
- preserve least permissions, exact Node `24.15.0`, Yarn `1.22.22`, bounded timeout, unchanged canonical harness invocation, two repetitions, and artifact retention;
- add no wildcard, workflow dispatch, arbitrary input, generalized executor, or other case binding.

The original `run/spec007-t112-immer` remains immutable historical failure evidence.

## Recovery replay

Only after R007-03 and R007-04 are both canonically closed may `run/spec007-t112-immer-r2` be proven absent and created exactly once from exact then-canonical main.

Only its first `create`-event run with `run_attempt=1` may qualify.

The recovery replay must independently re-prove the exact runtime/toolchain/source/candidate gates and genuinely produce `BENCHMARK_ACTIVE` evidence with at least two valid deterministic observations.

Any failure is final for that recovery attempt and returns the route to planning. No rerun-to-green is allowed.

## Dependency ordering

`T111 qualified -> T112 first-attempt NO_GO -> planning amendment -> implementation authorization -> R007-03 -> R007-04 -> T112-R2 -> T113 -> T114`

T113 remains blocked until T112-R2 is durably `CLOSED_CANONICAL / QUALIFIED`.

## Planning-only boundary

This file authorizes no implementation. No manifest, test, harness, workflow, task-run ref, result, product, selector, donor, runtime, or oracle mutation may occur from this planning artifact alone.