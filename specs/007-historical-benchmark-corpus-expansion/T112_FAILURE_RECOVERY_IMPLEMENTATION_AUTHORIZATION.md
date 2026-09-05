# Spec 007 T112 Failure Recovery Implementation Authorization

**Status:** `AUTHORIZATION_PENDING_MERGE`  
**Authorization ledger:** Issue #197  
**Original authorization creation base:** `510ee754205f509d40940d04f9f559d5ada28a73`  
**Canonical planning merge:** `510ee754205f509d40940d04f9f559d5ada28a73`

## Purpose

Prospectively authorize the smallest dependency-ordered recovery sequence required to repair the genuine first-attempt T112 manifest command-label contract failure without rewriting that failure, widening the benchmark parser, weakening replay integrity, changing donor/oracle/runtime semantics, or unblocking T113 early.

This file is not effective merely because it exists on a branch. It becomes effective only after this exact authorization head is independently qualified, guarded-merged into canonical `main`, post-merge verified, and Issue #197 is durably closed as:

`SPEC_007_T112_RECOVERY_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`

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
9. Issue #194 T112 first-attempt failure closeout;
10. Issue #195 recovery-planning closeout;
11. PR #196 canonical planning amendment;
12. Issue #197 implementation-authorization ledger.

Live canonical repository truth overrides stale summaries or handoffs.

## Canonical prerequisite binding

The T112 recovery planning amendment is canonical at:

- merge SHA: `510ee754205f509d40940d04f9f559d5ada28a73`;
- merge tree: `c8b1872ee50d57f8403d4720f056f8e09c8ddc32`;
- ordered parent 1: `2955969c16a456c44da8dd4c1e31f8ad3fa6f9a4`;
- ordered parent 2: `6286b7e609fa8cdb54bd0c575fe39176667837b1`;
- GitHub signature: `verified=true`, `reason=valid`;
- PR #196: `MERGED / CLOSED`;
- exact-head Self Verification: run `33993457731`, success;
- exact-head Project CI: run `33993457797`, all six lanes success, original `run_attempt=1`;
- fresh exact-head independent review: CodeRabbit comment `5554944267`, `No material findings`;
- unresolved review threads: `0`;
- Issue #195: `CLOSED / COMPLETED`.

The first T112 execution remains immutable failure evidence:

- branch: `run/spec007-t112-immer`;
- workflow run: `33993150910`;
- job: `101378857705`;
- event: `create`;
- `run_attempt=1`;
- source/workflow SHA: `2955969c16a456c44da8dd4c1e31f8ad3fa6f9a4`;
- source tree: `6d05a6c7329ecd826e5b07bd2e271fddccb1fb1a`;
- result: `failure`;
- durable disposition: `T112 = NO_GO / RETURN_TO_PLANNING`;
- exact harness failure: `invalid_case: selection case immer-draftmap-iterator-compatibility must contain exactly one explicit full-suite/reference command label`;
- replay JSON/artifact: none.

The run passed source binding, exact Node `24.15.0`, Yarn Classic `1.22.22`, controller install/build, and clean-source gates before failing during canonical case validation. It did not reach donor acquisition, reconstruction, oracle, comparator, scoring, or benchmark activation.

Nothing in this authorization reclassifies, retries, deletes, moves, recreates, updates, or erases that evidence.

## Exact authorized sequence

After this authorization becomes effective, the only authorized recovery sequence is:

`R007-03 -> R007-04 -> T112-R2`

The successor order remains:

`T112-R2 -> T113 -> T114`

No successor may begin before its predecessor is durably canonically closed in the required state.

## R007-03 — Immer command-label contract correction

### Exact repository mutation surface

Exactly:

- `benchmarks/manifest.json`;
- `tests/benchmark-harness.test.ts`.

No other tracked path is authorized under R007-03.

In particular, `benchmarks/harness-lib.mjs` is not authorized to change.

### Required manifest behavior

R007-03 may change only the canonical executable-contract identity needed to make the already-reviewed Immer case representable by the existing canonical extractor.

For case `immer-draftmap-iterator-compatibility`:

1. change exactly the procedure label:
   - from `project-native source-suite/reference command`;
   - to `project-native full-suite/reference command`;
2. preserve the exact full reference command bytes: `yarn test:src`;
3. preserve the exact targeted command: `yarn test:src __tests__/map-set.js`;
4. preserve the exact plain comparator: `yarn test`;
5. preserve the exact runner-native related selector: `yarn vitest related src/plugins/mapset.ts --run`;
6. change `case_revision` from `1` to `2` so revision 1 remains attributable to the immutable failed first T112 attempt;
7. change manifest `manifest_revision` from `12` to `13` so the successor manifest binds the corrected executable case contract to a distinct canonical manifest revision;
8. preserve lifecycle state `CASE_REVIEWED`;
9. preserve `oracle.observation = null` until a future authorized replay produces genuine observation evidence;
10. preserve every upstream repository, base/fix/oracle commit and tree, required parent, production/regression path, regression id, runtime identity, package-manager identity, lockfile identity, license evidence, reconstruction recipe, ancillary review, historical basis, selector contract, expected behavior, and other candidate field unchanged in meaning.

No historical result file may be mutated under R007-03.

### Required focused test behavior

`tests/benchmark-harness.test.ts` may add only deterministic local regression coverage necessary to prove the real canonical manifest command contracts remain consumable by the existing extractor.

At minimum the test must:

1. load the real repository `benchmarks/manifest.json` without donor execution or live-network dependency;
2. select every `case_class === "selection"` record;
3. call the existing canonical `extractSelectionCommands` for every real selection case and fail if any current contract cannot be extracted;
4. assert the corrected Immer revision-2 commands exactly:
   - targeted: `yarn test:src __tests__/map-set.js`;
   - full: `yarn test:src`;
   - plain: `yarn test`;
   - related: `yarn vitest related src/plugins/mapset.ts --run`;
5. prove the canonical manifest revision is `13` and the corrected Immer case revision is `2` if needed to bind the test to the intended successor identity;
6. remain local, deterministic, bounded, and repository-only.

The test must not execute donor code, acquire a donor repository, run project-native donor commands, or synthesize replay evidence.

### R007-03 fail-closed boundaries

The following are not authorized as substitutes for the exact correction:

- parser regex widening;
- accepting `source-suite/reference` as a second alias;
- fuzzy or case-insensitive command-label matching;
- command substitution;
- command rewriting;
- changing targeted/plain/related commands;
- weakening selection-case validation;
- changing case class, oracle requirements, membership policy, reconstruction, runtime, or selector semantics;
- changing historical result bytes;
- marking the case `BENCHMARK_ACTIVE` before replay.

If the exact two-path implementation proves insufficient, stop and return to planning rather than widening scope.

### R007-03 qualification and closeout

Before merge R007-03 requires:

- exact two-path purity;
- focused real-manifest extraction regression evidence;
- applicable repository typecheck/test/build;
- exact-head Self Verification;
- exact-head Project CI success across all six required lanes on the original attempt;
- fresh independent substantive exact-head semantic/security/governance review;
- reconciliation of every material finding with forward-only commits;
- zero unresolved material review threads;
- current ruleset / observable branch-protection verification;
- unchanged exact head and canonical base immediately before merge;
- guarded merge with exact expected head SHA using canonical merge-commit method;
- post-merge verification of merge SHA, ordered parents, tree, GitHub verification/signature state, PR state, canonical `main`, exact changed paths, manifest revision, Immer case revision, and preserved command identities;
- durable `R007-03 = CLOSED_CANONICAL / QUALIFIED` before R007-04 begins.

## R007-04 — Single-use T112 recovery binding

R007-04 becomes eligible only after R007-03 is durably canonically closed.

### Exact repository mutation surface

Exactly:

- `.github/workflows/spec-007-isolated-replay.yml`.

No other tracked path is authorized under R007-04.

### Required workflow change

Add exactly one new recovery branch mapping:

`run/spec007-t112-immer-r2` -> `immer-draftmap-iterator-compatibility`

The existing original `run/spec007-t112-immer` mapping may remain in the static allowlist as historical configuration but the original ref/run must never be moved, recreated, reused, or rerun for qualification.

The implementation must preserve every existing executor control in meaning, including:

- GitHub `create` event only;
- exact branch allowlist;
- `github.run_attempt == '1'` qualification boundary;
- exact event-source/workflow revision binding, including `github.sha == github.workflow_sha`;
- exact event-source checkout and post-checkout HEAD equality guards;
- read-only/least permissions and no controller secret injection;
- Ubuntu 24.04;
- exact Node `24.15.0` verification;
- Yarn Classic `1.22.22` activation and verification;
- exact Ascout lockfile install/build and clean source checks;
- direct unchanged canonical `benchmarks/run.mjs` invocation;
- exactly two repetitions;
- bounded timeout;
- bounded artifact retention;
- later rerun attempts performing no qualifying replay work.

No wildcard branch, `workflow_dispatch`, arbitrary repository/case/command/runtime/package-manager/SHA/argument input, generalized executor, additional candidate, or early T113 path is authorized.

### R007-04 qualification and closeout

R007-04 independently requires exact one-path purity, exact-head Self Verification, Project CI six-lane success where applicable, fresh independent substantive exact-head workflow/security review, zero unresolved material review threads, current ruleset/protection verification, guarded expected-head merge, full post-merge identity verification, and durable:

`R007-04 = CLOSED_CANONICAL / QUALIFIED`

before any T112-R2 ref may be created.

## T112-R2 — Single recovery replay

T112-R2 has no repository mutation by default. It becomes eligible only after R007-03 and R007-04 are both durably canonically closed.

Before recovery ref creation, reverify live canonical truth:

- exact canonical `main`;
- exact merged manifest revision `13`;
- exact Immer case revision `2` and preserved case identities;
- exact merged R007-04 workflow identity;
- current Spec 007 authority/task state;
- original `run/spec007-t112-immer` still points to its immutable first-attempt source and has not been recreated;
- original run `33993150910` remains attempt 1 failure;
- `run/spec007-t112-immer-r2` does not exist;
- exact pinned Node `24.15.0` runtime still satisfies the required Iterator behavior without polyfill/shim/source rewrite/runtime substitution.

Then create exactly once:

`run/spec007-t112-immer-r2`

from the exact then-canonical revision containing both R007-03 and R007-04.

The first `create`-event workflow run with `run_attempt=1` is the only qualifying recovery attempt. Do not rerun a failed/cancelled attempt merely to obtain green status. Do not move, delete/recreate, update, or reuse the recovery ref.

The replay must still satisfy every frozen Immer candidate identity, anti-leakage reconstruction requirement, immutable dependency installation, exact runtime/package-manager route, upstream-authored oracle membership and pre-fix/fixed semantics, comparator evidence, source-state stability, deterministic observation, at least two valid bounded repetitions, evidence integrity, and every existing absolute benchmark gate.

Only genuine replay evidence may establish:

`T112 = CLOSED_CANONICAL / QUALIFIED`

Any failure records exact evidence and returns to planning again.

## T113 / T114 preservation

- T113 remains blocked until T111 and T112 are both durably qualified.
- T113 may mutate only the additive `benchmarks/results/t113-historical-corpus-expansion.json` result already authorized by Spec 007.
- T113 must preserve the exact bytes of historical T078/T091/T095 result files.
- T114 remains blocked until T113 is canonically closed and is governance/ledger reconciliation only by default.
- No product or selector behavior change may be inferred or implemented merely because benchmark observations become available.

## Universal execution discipline

For every repository-mutating recovery unit:

1. branch from exact canonical `main` only after predecessor closeout;
2. keep exact authorized-path purity;
3. use forward-only repairs only; no force-push, rebase, or destructive shared-history rewrite;
4. never reuse CI/review evidence after a changed head;
5. never rerun a failed exact-head CI merely to obtain green status; preserve the failure and follow prospective repair governance;
6. require fresh exact-head CI and independent substantive review;
7. reconcile all material findings before merge consideration;
8. guard merges with exact expected head SHA;
9. post-merge verify ordered parents, tree, GitHub verification/signature state, PR state, canonical `main`, and exact changed artifacts;
10. durably close the unit before successor execution.

## Hard prohibitions

This authorization does not permit:

- mutation outside the exact R007-03/R007-04 surfaces;
- mutation of `benchmarks/harness-lib.mjs`;
- parser widening or command-label aliasing;
- product or selector behavior changes;
- receipt/schema/CLI changes;
- dependency additions;
- donor or oracle replacement;
- runtime substitution;
- polyfill or compatibility shim;
- synthetic oracle/comparator/replay evidence;
- historical-result rewrites;
- generalized benchmark or replay infrastructure;
- moving, recreating, reusing, deleting, updating, or rerunning the original T112 ref/run;
- early T113 execution;
- release, Git tag, GitHub Release, or npm publication;
- fabricated CI, review, evidence, authority, runtime capability, hashes, signatures, mergeability, qualification, or completion.

## Authorization qualification

This authorization PR itself must:

1. contain exactly this one added governance artifact;
2. contain in its ancestry the forward-only reconciliation merge `d3cf0e026658bea40a2203816063c38a2dc3d58a`, whose ordered parents are the original authorization head `e1bcd0c35a0a55bf1ff61beaec63ddccabba8d62` and current canonical `main` `0cb0ed949ac1523fdd5e26f0db60b9eaa0e9e8b0`, and receive completely fresh exact-head qualification after that forward merge and this governance-only correction;
3. receive Self Verification success on its exact final head;
4. receive Project CI six-lane success on its exact final head, original attempt;
5. receive a fresh independent substantive exact-head governance/security review with no material findings;
6. have zero unresolved material review threads;
7. remain unchanged after final qualification/review;
8. reverify current rulesets / observable branch protection and unchanged canonical base immediately before merge;
9. use guarded expected-head merge with the repository canonical merge-commit method;
10. receive post-merge verification of SHA, ordered parents, tree, GitHub signature state, PR state, canonical `main`, and exact authorization artifact identity;
11. close Issue #197 durably as `SPEC_007_T112_RECOVERY_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`.

Until every criterion is satisfied:

`SPEC_007_T112_RECOVERY_AUTHORIZATION = PENDING / NOT_EFFECTIVE`
