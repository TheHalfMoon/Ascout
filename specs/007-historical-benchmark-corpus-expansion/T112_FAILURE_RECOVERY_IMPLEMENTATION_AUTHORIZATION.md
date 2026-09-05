# Spec 007 T112 Failure Recovery Implementation Authorization

**Status:** `AUTHORIZATION_PENDING_MERGE`  
**Authorization ledger:** Issue #200  
**Canonical base:** `510ee754205f509d40940d04f9f559d5ada28a73`  
**Canonical planning merge:** `510ee754205f509d40940d04f9f559d5ada28a73`

## Purpose

Prospectively authorize only the smallest dependency-ordered recovery sequence already designed by the canonical T112 failure-recovery plan after the immutable first T112 attempt failed before donor execution because the real Immer manifest command label did not match the canonical harness extractor grammar.

This artifact does not become effective merely by existing on a branch. It becomes effective only after this exact authorization candidate is independently qualified, guarded-merged into canonical `main`, post-merge verified, and Issue #200 is durably closed as `SPEC_007_T112_RECOVERY_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`.

## Authority chain

This authorization binds, in order:

1. `.specify/memory/constitution.md`;
2. `CONTRIBUTING.md`;
3. the effective Spec 007 implementation authorization;
4. `specs/007-historical-benchmark-corpus-expansion/spec.md`;
5. `specs/007-historical-benchmark-corpus-expansion/plan.md`;
6. `specs/007-historical-benchmark-corpus-expansion/tasks.md`;
7. `specs/007-historical-benchmark-corpus-expansion/T112_FAILURE_RECOVERY_PLAN.md`;
8. `specs/007-historical-benchmark-corpus-expansion/T112_FAILURE_RECOVERY_AUDIT.md`;
9. Issue #195 planning ledger;
10. PR #196 canonical T112 recovery-planning amendment;
11. Issue #200 recovery implementation-authorization ledger.

Live canonical repository truth overrides stale summaries, cached state, prior hashes, and handoffs.

## Canonical prerequisite binding

The T112 recovery planning amendment is canonical at merge `510ee754205f509d40940d04f9f559d5ada28a73`, with ordered parents `2955969c16a456c44da8dd4c1e31f8ad3fa6f9a4` then `6286b7e609fa8cdb54bd0c575fe39176667837b1`, and GitHub verification `verified=true`, `reason=valid`.

The original T112 execution remains immutable failure evidence:

- branch: `run/spec007-t112-immer`;
- workflow run: `33993150910`;
- job: `101378857705`;
- event: `create`;
- `run_attempt=1`;
- source/workflow SHA: `2955969c16a456c44da8dd4c1e31f8ad3fa6f9a4`;
- conclusion: `failure`;
- replay artifact: none;
- durable disposition: `T112 = NO_GO / RETURN_TO_PLANNING`.

Nothing in this authorization reclassifies, retries, deletes, moves, recreates, reuses, or erases that evidence.

## Exact authorized sequence

After this authorization becomes `CLOSED_CANONICAL / EFFECTIVE`, the only authorized sequence is:

`R007-03 -> R007-04 -> T112-R2`

The existing successor order remains:

`T112-R2 -> T113 -> T114`

Each unit must be canonically closed before its successor becomes eligible.

## R007-03 — Immer command-label contract correction

### Exact repository mutation surface

Exactly:

- `benchmarks/manifest.json`;
- `tests/benchmark-harness.test.ts`.

No other tracked path is authorized under R007-03.

### Required semantic behavior

R007-03 must:

1. preserve `benchmarks/harness-lib.mjs` byte-for-byte;
2. change only the Immer selection-case reference label from `project-native source-suite/reference command` to `project-native full-suite/reference command`;
3. preserve reference command `yarn test:src`;
4. preserve targeted command `yarn test:src __tests__/map-set.js`;
5. preserve plain comparator `yarn test`;
6. preserve related selector `yarn vitest related src/plugins/mapset.ts --run`;
7. preserve repository, base/fix/oracle Git objects, changed paths, reconstruction recipe, lockfile, Node/Yarn identities, license evidence, regression ids, historical basis, runtime-capability requirement, and every other candidate semantic field;
8. advance Immer `case_revision` from `1` to `2`;
9. advance `manifest_revision` from `12` to `13`;
10. keep lifecycle state `CASE_REVIEWED` and `oracle.observation = null` until a new authorized replay qualifies;
11. add focused coverage that loads the actual manifest and proves `extractSelectionCommands` succeeds for every selection case, including exact Immer revision-2 commands;
12. preserve historical result files unchanged.

The focused regression must fail against the canonical revision-1 mismatch and pass only after the exact manifest correction.

### Hard boundaries

No parser relaxation, regex alias, generalized label compatibility, selector change, schema change, product mutation, donor/oracle substitution, polyfill, compatibility shim, dependency change, result rewrite, workflow mutation, generalized benchmark infrastructure, release, or publication is authorized.

### Qualification and closeout

Before guarded merge, R007-03 requires exact two-path purity, focused/adversarial tests, applicable repository typecheck/test/build, exact-head Self Verification, exact-head Project CI across all required lanes, fresh independent substantive semantic/security review on the final head, reconciliation of every material finding by forward-only commits, zero unresolved material review threads, current ruleset/observable branch-protection verification, unchanged final head and canonical base, guarded expected-head merge using the repository's canonical merge-commit method, post-merge identity/path/signature verification, and durable `R007-03 = CLOSED_CANONICAL`.

## R007-04 — single-use T112 recovery binding

R007-04 is ineligible until R007-03 is durably `CLOSED_CANONICAL`.

### Exact repository mutation surface

Exactly:

- `.github/workflows/spec-007-isolated-replay.yml`.

### Required workflow change

Add exactly one new branch admission:

`run/spec007-t112-immer-r2` -> `immer-draftmap-iterator-compatibility`

Preserve create-event-only triggering, exact allowlisting, `github.run_attempt == '1'`, exact event-source/workflow revision and checkout guards, least permissions, no controller secrets in donor execution, Node `24.15.0`, Yarn Classic `1.22.22`, bounded timeout, unchanged canonical harness invocation, two repetitions, artifact retention, and non-qualifying behavior for later rerun attempts.

No wildcard, workflow dispatch, arbitrary input, arbitrary case/repository/command/runtime/package-manager/SHA selection, generalized executor, or early T113 route is authorized.

R007-04 independently requires exact one-path scope, fresh exact-head qualification and substantive workflow/security review, zero unresolved material threads, guarded expected-head merge, full post-merge verification, and durable `R007-04 = CLOSED_CANONICAL`.

## T112-R2 — single recovery replay

T112-R2 has no repository mutation by default and is ineligible until R007-03 and R007-04 are both canonically closed.

Immediately before ref creation, reverify canonical `main`, exact merged R007-03 manifest/test identities, exact merged R007-04 workflow identity, current Spec 007 authority, the immutable original T112 ref/run, and absence of `run/spec007-t112-immer-r2`.

Then create exactly once from exact canonical main:

`run/spec007-t112-immer-r2`

Only the first create-event workflow attempt with `run_attempt=1` may qualify. A failed recovery attempt is final for that ref and returns the route to planning; it must not be rerun merely to obtain green status.

The replay must independently re-prove all frozen source/runtime/candidate/oracle gates and genuinely produce `BENCHMARK_ACTIVE` evidence with at least two valid deterministic observations. Only a genuine qualifying replay may establish `T112 = CLOSED_CANONICAL / QUALIFIED`.

## T113 / T114 preservation

T113 remains blocked until T112-R2 is durably qualified. T113 may publish only the already-authorized additive Spec 007 result artifact while preserving historical result bytes. T114 remains blocked until T113 is canonically closed and remains governance/ledger reconciliation only by default.

## Universal execution discipline

For every repository-mutating recovery unit:

1. branch from exact canonical `main` only after predecessor closeout;
2. keep exact authorized-path purity;
3. use forward-only repair only; no force-push, rebase, or destructive rewrite;
4. never reuse CI/review evidence after head changes;
5. preserve failed exact-head qualification as evidence and follow prospective repair governance instead of rerunning-to-green;
6. require fresh exact-head CI and independent substantive review;
7. guard merge with exact expected head SHA;
8. post-merge verify ordered parents, tree, GitHub verification/signature state, PR state, canonical `main`, and changed paths;
9. durably close the current unit before successor execution.

## Authorization qualification

This authorization PR itself must:

1. contain exactly this one added governance artifact;
2. be based on exact canonical `main` `510ee754205f509d40940d04f9f559d5ada28a73`;
3. receive Self Verification success on its exact final head;
4. receive Project CI success across all required lanes on its exact final head;
5. receive a fresh independent substantive exact-head governance/security review with no material findings;
6. have zero unresolved material review threads;
7. remain unchanged after final qualification/review;
8. reverify current rulesets / observable branch protection and unchanged canonical base immediately before merge;
9. use guarded expected-head merge with the repository's canonical merge-commit method;
10. receive post-merge verification of SHA, ordered parents, tree, GitHub verification state, PR state, canonical `main`, and exact artifact bytes;
11. close Issue #200 durably as `SPEC_007_T112_RECOVERY_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`.

Until all criteria are satisfied:

`SPEC_007_T112_RECOVERY_AUTHORIZATION = PENDING / NOT_EFFECTIVE`
