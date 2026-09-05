# Specification 008 — Technical Plan

## Status

`PLAN = READY_FOR_REVIEW / NOT_IMPLEMENTATION_AUTHORIZED`

## Architecture

Add one future workflow, `.github/workflows/spec-007-isolated-replay.yml`, only after separate implementation authorization. The workflow is an execution envelope around the existing canonical benchmark harness; it contains no benchmark semantics of its own.

The workflow is triggered by GitHub's `create` event. Replay work is admitted only for exactly two task-run branches:

- `run/spec007-t111-jotai`
- `run/spec007-t112-immer`

GitHub documents the `create` event as running when a repository Git branch or tag ref is created, including through the Git references API. This matches the connected repository authority available to the project and avoids an unusable dispatch-only design.

## Execution-ref contract

A run branch is governance-controlled execution input, not an arbitrary source branch.

Before creation, the active task ledger MUST:

1. reverify canonical `main` and record its exact SHA;
2. prove the predecessor closeout makes the task eligible;
3. prove the corresponding run branch does not already exist;
4. authorize one creation of that exact branch from that exact canonical `main` SHA.

After creation:

- the branch MUST NOT be repointed, force-updated, reused, or recreated for another attempt;
- the workflow event/ref/SHA must be reconciled to the ledger before any qualification claim;
- a failed authorized run remains failure evidence and returns to planning.

## Trigger admission

Use `on: create` only. The replay job must have an exact fail-closed `if` guard requiring:

- `github.event.ref_type == 'branch'`; and
- `github.event.ref` equals one of the two exact run branch names.

All other branch/tag creations produce no replay work. No wildcard run namespace is authorized.

A first workflow step must independently map the exact branch name to the exact frozen case ID and fail for any other value, even though the job-level guard already narrows admission.

## Permissions

Set top-level `permissions: contents: read`. Checkout must use `persist-credentials: false`. No secrets or write token is required by replay execution or artifact upload.

## Runner

- `ubuntu-24.04`;
- job timeout: 30 minutes unless implementation-time evidence proves the existing harness's bounded clone/install/replay maxima cannot fit, in which case return to planning rather than silently expanding;
- Node setup exact version `24.15.0`.

## Source guard

1. Treat `github.sha` as the exact event source commit.
2. Checkout exactly `github.sha`.
3. Prove `git rev-parse --verify HEAD^{commit}` equals `github.sha`.
4. Prove worktree/index clean before Ascout installation/build.
5. Record `HEAD^{tree}` in logs.
6. Record the created ref name and mapped case ID.

The governance ledger independently verifies that the branch was created from the expected canonical `main` SHA. A source mismatch cannot qualify.

## Toolchain

1. `actions/setup-node` with exact `24.15.0`.
2. Verify `node --version` equals `v24.15.0`.
3. Activate Yarn Classic `1.22.22` through the minimal Node-supported route, preferably Corepack.
4. Verify `yarn --version` equals `1.22.22`.
5. Any mismatch fails before donor acquisition.

Action versions must be pinned to reviewed commit SHAs during implementation, following the repository's self-verification precedent rather than floating tags where practical.

## Ascout preparation

- install Ascout dependencies from the repository's exact npm lockfile with `npm ci --ignore-scripts --no-audit --no-fund`;
- run the existing build command;
- do not mutate `package.json`, package lock, benchmark manifest, or harness;
- verify tracked source remains clean after preparation.

## Replay mapping and command

Map:

- `run/spec007-t111-jotai` → `jotai-splitatom-identical-write`
- `run/spec007-t112-immer` → `immer-draftmap-iterator-compatibility`

Repetitions are fixed at `2`.

Invoke directly with no generated free-form command:

`node benchmarks/run.mjs --case <mapped-case> --ascout-root . --run-id <derived-run-id> --repetitions 2 --output <runner-temp-path>`

The run ID is deterministic from GitHub run identity plus mapped case, for example `spec008-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-${case_id}`. This is evidence identity only and does not change harness semantics.

The manifest path remains its default canonical `benchmarks/manifest.json`.

## Failure behavior

- ref admission mismatch: no replay job;
- branch-to-case mapping mismatch: fail;
- source guard mismatch: fail;
- toolchain mismatch: fail;
- Ascout install/build failure: fail;
- donor acquisition/frozen install failure: fail;
- oracle/reconstruction/membership/determinism/integrity failure: fail;
- no retry/rerun logic inside the workflow;
- no authorized ref repoint/recreation to obtain green;
- a failed GitHub run remains evidence and is not converted to qualification by a later run.

## Artifact handling

Use a runner-temp output path outside the repository. Upload the replay JSON when present with a bounded retention period of 30 days, matching existing self-verification evidence retention. Artifact name must include mapped case and exact event SHA or unambiguous run identity.

The replay step may fail normally. A subsequent artifact-upload step may use `if: always()` so a result file produced before failure is retained. The original failed replay outcome MUST remain the job outcome; the workflow must not synthesize a success-shaped result or mask the failing exit status.

If the harness exits before writing JSON, the failed job/log remains the truthful evidence.

## Network and hermeticity

Do not add network-isolation claims. Public network is available to the harness for donor clone and dependency reconstruction, as already recorded by canonical harness evidence. The executor adds no credentials. Qualification requires the donor oracle itself to complete without credentialed/mutable hosted dependencies. Any contradiction is a case failure.

## Validation before implementation merge

The future workflow implementation must receive:

- exact one-path diff review;
- YAML/trigger/ref-admission/permission inspection;
- proof no product/harness/manifest/result path changed;
- exact-head Project CI and Self Verification where GitHub triggers them for the workflow PR;
- fresh independent substantive security/semantic review;
- zero unresolved material review threads;
- guarded expected-head merge and post-merge proof;
- durable implementation closeout before any run branch creation.

## Execution after implementation closeout

1. Reopen/recreate T111 ledger against then-canonical main.
2. Verify `run/spec007-t111-jotai` does not exist and create it once from exact canonical main.
3. Reconcile its single replay run; never move/recreate the ref after failure.
4. If genuinely qualified, close T111 `CLOSED_CANONICAL / QUALIFIED`.
5. Only then open T112 and first prove exact Node Iterator semantics required by the Immer oracle.
6. Verify `run/spec007-t112-immer` does not exist and create it once from then-canonical main.
7. Reconcile the single Immer replay run; if genuinely qualified, close T112.
8. If T112 qualifies, proceed to T113 publication under existing Spec 007 authority.
9. Complete T114 ledger/governance reconciliation and determine successor authority.