# Specification 008 — Implementation Authorization

## Status

`SPEC_008_IMPLEMENTATION_AUTHORIZATION = PROPOSED / NOT_EFFECTIVE`

This artifact is the repository authorization candidate for Issue #173. It grants no implementation authority until it is independently qualified, guarded-merged, post-merge verified, and Issue #173 is closed `CLOSED_CANONICAL / EFFECTIVE`.

## Canonical predecessor

Specification 008 planning is canonically closed at:

- planning merge: `12aac441546a64668ab7fa0489beb33f91f387ce`
- planning merge tree: `bd2aaa45701c0cb976e04f73292f71e8d0566e2e`
- planning PR: #172
- final planning head: `d37d32b996ce9f25fd4e07b880ff08e8cfc7a42e`
- final planning Project CI: `33975105428`, six of six required lanes successful
- final planning Self Verification: `33975105444`, successful
- final independent exact-head review: CodeRabbit comment `5552858476`, no material planning, security, consistency, or branch-purity finding
- unresolved material review threads: `0`

Issue #171 remains the Spec 007 return-to-planning frontier until this authorization and the implementation it controls become canonical.

## Authorized tracked implementation surface

After this authorization becomes effective, exactly one tracked repository path is authorized:

- `.github/workflows/spec-007-isolated-replay.yml`

No other tracked path is authorized by Specification 008 implementation.

## Authorized one-shot task-run refs

Only after the workflow implementation itself reaches durable canonical closeout, and only when the corresponding Spec 007 task is dependency-order eligible, one future creation of each exact branch is authorized:

- `run/spec007-t111-jotai`
- `run/spec007-t112-immer`

Each branch MUST be created exactly once from exact then-canonical `main`.

The following are forbidden:

- repointing either ref;
- force-updating either ref;
- reusing either ref for another attempt;
- deleting and recreating either ref;
- creating either ref before its predecessor gate closes;
- initiating or accepting a GitHub native rerun as qualification evidence.

Only `github.run_attempt == '1'` may execute replay work or qualify a task.

## Required workflow trigger and admission

The workflow MUST:

1. trigger only on the GitHub `create` event;
2. admit replay work only when `github.run_attempt == '1'`;
3. require `github.ref_type == 'branch'`;
4. admit only the exact branch names `run/spec007-t111-jotai` and `run/spec007-t112-immer`;
5. map those branch names internally and immutably to:
   - `run/spec007-t111-jotai` -> `jotai-splitatom-identical-write`;
   - `run/spec007-t112-immer` -> `immer-draftmap-iterator-compatibility`;
6. expose no workflow inputs and accept no arbitrary repository, command, manifest, runtime, package-manager, SHA, or argument input;
7. ensure any run attempt greater than 1 performs no checkout, install, build, donor acquisition, oracle, comparator, or benchmark harness execution and is categorically nonqualifying.

## Exact source binding

For an admitted first-attempt create-event run, the workflow MUST:

- bind checkout to the exact event/source commit SHA associated with the newly created task branch;
- use checkout with `persist-credentials: false`;
- verify `git rev-parse HEAD` equals the exact expected event/source SHA before install/build/replay;
- verify the checked-out tracked source is clean before replay setup;
- never infer canonicality from branch name alone.

Task closeout must independently prove that the run branch was created from exact canonical `main` at its task frontier.

## Runtime and package-manager binding

The workflow MUST:

- run on Ubuntu 24.04 only;
- use Node exactly `24.15.0` and verify the observed runtime;
- activate Yarn Classic exactly `1.22.22` through the planned deterministic route and verify `yarn --version` equals `1.22.22`;
- fail closed if exact Yarn activation is unsupported or yields another version;
- never substitute another Node version, Yarn version, package manager, polyfill, source rewrite, compatibility shim, or alternate oracle to obtain qualification.

## Permissions and secret boundary

The workflow MUST:

- use `permissions: contents: read` only;
- require no repository or environment secrets;
- persist no checkout credentials;
- use no `pull_request_target`, untrusted PR execution, arbitrary task runner, generalized command input, or dynamic repository input;
- avoid automatic issue mutation or any write credential requirement.

## Ascout setup and canonical harness execution

The workflow MUST:

1. install Ascout's exact npm lockfile using `npm ci --ignore-scripts --no-audit --no-fund`;
2. build exact Ascout source using the existing build command;
3. invoke the unchanged canonical `benchmarks/run.mjs` directly;
4. use canonical `benchmarks/manifest.json`;
5. use only the fixed case mapped from the task-run branch;
6. execute exactly `2` repetitions;
7. use a run ID deterministically bound to immutable GitHub run identity including run ID and attempt;
8. write replay output only to bounded runner-temporary/artifact space, not a tracked benchmark result path;
9. leave `benchmarks/run.mjs` and `benchmarks/harness-lib.mjs` unchanged.

The canonical harness remains the sole authority for donor acquisition, exact-object verification, byte-digest checks, frozen dependency reconstruction, production-fix reconstruction, regression-test anti-leakage, independent oracle execution, comparator membership, source stability, determinism, integrity gates, evidence serialization, and `BENCHMARK_ACTIVE` conclusions.

The workflow MUST NOT synthesize, translate, or manufacture benchmark lifecycle success.

## Network and hermeticity boundary

GitHub-runner network may remain available for public donor Git acquisition and frozen dependency reconstruction because the existing canonical harness records that network availability and does not claim packet-level isolation.

This authorization MUST NOT weaken the measured-oracle boundary. Qualification may not require credentials, mutable hosted services, or undeclared external state. Any such observed requirement is a replay qualification failure.

## Bounds, artifacts, and failure behavior

The workflow MUST:

- use a finite job-level timeout;
- use bounded artifact retention;
- retain exact harness JSON output when produced;
- preserve normal GitHub run/job identity and logs;
- attempt artifact upload on failure when output exists without masking the replay failure;
- keep non-zero harness exits, setup failures, cancellations, timeouts, and artifact failures visible and nonqualifying;
- forbid rerun-until-green behavior.

A failed first attempt is durable evidence. The task must return to planning or separately authorized repair; the task-run branch may not be moved, recreated, or rerun for qualification.

## Explicitly unauthorized surfaces

This authorization does not permit changes to:

- `src/**`;
- receipt, schema, CLI, selector, command-admission, or product behavior;
- `benchmarks/run.mjs`;
- `benchmarks/harness-lib.mjs`;
- `benchmarks/manifest.json`;
- historical T078/T091/T095 result bytes;
- any existing benchmark result during workflow implementation;
- package or dependency files;
- Project CI or Self Verification workflows;
- release, tag, or npm publication;
- donor source or regression oracle;
- generalized benchmark frameworks, reusable workflow frameworks, daemon/services, caches as evidence authority, or cloud control planes.

## Workflow implementation qualification gate

The future one-file workflow implementation may become canonical only after all of the following are proven on its unchanged exact final head:

1. repository diff is exactly `.github/workflows/spec-007-isolated-replay.yml`;
2. semantic inspection proves all trigger, run-attempt, ref-type, exact branch allowlist, fixed mapping, source binding, runtime, Yarn, permission, no-secret, harness, repetition, timeout, artifact, and fail-closed properties above;
3. exact-head Self Verification succeeds where applicable;
4. exact-head Project CI succeeds in all six required lanes;
5. fresh independent substantive exact-head semantic/security review reports no material finding;
6. unresolved material review threads equal zero;
7. final implementation head and expected canonical `main` remain unchanged immediately before merge;
8. merge uses an expected-head guard;
9. post-merge verification proves ordered parents, merge tree, GitHub signature, PR merged/closed state, canonical `main`, and exact expected workflow content;
10. workflow implementation is durably closed canonically before either task-run ref is created.

## T111 / T112 execution ordering

After workflow implementation closeout:

- T111 may be reopened/recreated first;
- verify `run/spec007-t111-jotai` does not exist;
- create it once from exact canonical `main`;
- reconcile only the first create-event run with `run_attempt == 1`;
- close T111 qualified only on genuine unchanged-harness `BENCHMARK_ACTIVE` evidence satisfying all Spec 007 gates;
- T112 remains blocked until T111 is durably qualified;
- before T112 replay, exact pinned Node Iterator behavior required by the Immer oracle must be proven without polyfill, shim, source rewrite, test weakening, alternate runtime, or alternate oracle;
- then verify `run/spec007-t112-immer` does not exist, create it once from exact canonical main, and reconcile only first-attempt evidence.

## T113 / T114 consequence

This authorization does not change Spec 007 successor order:

`T111 -> T112 -> T113 -> T114`

T113 remains authorized only after both replay tasks genuinely qualify and may mutate exactly `benchmarks/results/t113-historical-corpus-expansion.json` under existing Spec 007 authority. Historical T078/T091/T095 bytes remain immutable.

T114 remains ledger/governance reconciliation only after T113 closes canonically.

## Authorization qualification

This artifact itself must receive:

- exact one-path authorization-artifact purity;
- exact-head Project CI six-lane success;
- exact-head Self Verification success where applicable;
- fresh independent substantive exact-head review of authority, trust, scope, GitHub event/rerun semantics, source binding, runtime/toolchain, hermeticity, evidence integrity, and future implementation gates;
- zero unresolved material review threads;
- unchanged expected main/head before merge;
- guarded expected-head merge;
- post-merge ordered-parent/tree/GitHub-signature/PR/main verification.

Only after that proof may Issue #173 close as:

`SPEC_008_IMPLEMENTATION_AUTHORIZATION = CLOSED_CANONICAL / EFFECTIVE`

Until that closeout, `.github/workflows/spec-007-isolated-replay.yml` and both task-run branches remain unauthorized.