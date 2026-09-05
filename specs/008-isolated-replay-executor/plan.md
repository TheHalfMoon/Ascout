# Specification 008 — Technical Plan

## Status

`PLAN = READY_FOR_REVIEW / NOT_IMPLEMENTATION_AUTHORIZED`

## Architecture

Add one future workflow, `.github/workflows/spec-007-isolated-replay.yml`, only after separate implementation authorization. The workflow is an execution envelope around the existing canonical benchmark harness; it contains no benchmark semantics of its own.

## Trigger and inputs

Use `workflow_dispatch` only.

Inputs:

- `case_id` — required choice: `jotai-splitatom-identical-write` or `immer-draftmap-iterator-compatibility`;
- `ascout_sha` — required exact 40-character SHA; validated before use;
- `repetitions` — choice `2` or `3`, default `2`.

No other dynamic inputs.

## Permissions

Set top-level `permissions: contents: read`. Checkout must use `persist-credentials: false`. No secrets or write token is required by replay execution or artifact upload.

## Runner

- `ubuntu-24.04`;
- job timeout: 30 minutes unless implementation-time evidence proves the existing harness's bounded clone/install/replay maxima cannot fit, in which case return to planning rather than silently expanding;
- Node setup exact version `24.15.0`.

## Source guard

1. Validate input SHA format.
2. Checkout `ascout_sha` with full history only if required by existing Ascout build/self-identity behavior; otherwise minimal fetch is preferred.
3. Prove `git rev-parse --verify HEAD^{commit}` equals `ascout_sha`.
4. Prove worktree/index clean before Ascout installation/build.
5. Record `HEAD^{tree}` in logs.

The governance ledger must separately verify that the supplied SHA is canonical `main` before a run is accepted as T111/T112 qualification evidence.

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

## Replay command

Invoke directly with no shell-generated free-form command:

`node benchmarks/run.mjs --case <closed-enum-case> --ascout-root . --run-id <derived-run-id> --repetitions <2|3> --output <runner-temp-path>`

The run ID is deterministic from GitHub run identity plus case, for example `spec008-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-${case_id}`. This is evidence identity only and does not change harness semantics.

The manifest path remains its default canonical `benchmarks/manifest.json`.

## Failure behavior

- toolchain mismatch: fail;
- checkout/source guard mismatch: fail;
- Ascout install/build failure: fail;
- donor acquisition/frozen install failure: fail;
- oracle/reconstruction/membership/determinism/integrity failure: fail;
- no retry/rerun logic inside the workflow;
- a failed GitHub run remains evidence and is not converted to qualification by a later rerun.

## Artifact handling

Use a runner-temp output path outside the repository. Upload the replay JSON when present with a bounded retention period (30 days is sufficient and matches existing self-verification evidence retention). Artifact name must include case and exact Ascout SHA or unambiguous run identity.

If the harness exits before writing JSON, the failed job/log remains the truthful evidence; the workflow must not synthesize a success-shaped JSON result.

## Network and hermeticity

Do not add network-isolation claims. Public network is available to the harness for donor clone and dependency reconstruction, as already recorded by canonical harness evidence. The executor adds no credentials. Qualification requires the donor oracle itself to complete without credentialed/mutable hosted dependencies. Any contradiction is a case failure.

## Validation before implementation merge

The future workflow implementation must receive:

- exact one-path diff review;
- YAML/trigger/input/permission inspection;
- proof no product/harness/manifest/result path changed;
- exact-head Project CI and Self Verification if GitHub triggers them for the workflow PR;
- fresh independent substantive security/semantic review;
- zero unresolved material review threads;
- guarded expected-head merge and post-merge proof.

## Execution after implementation closeout

1. Reopen/recreate T111 ledger against then-canonical main.
2. Dispatch Jotai once with repetitions=2; never rerun a failed attempt to manufacture green.
3. If genuinely qualified, close T111 `CLOSED_CANONICAL / QUALIFIED`.
4. Only then open T112; first prove exact Node Iterator semantics required by the Immer oracle, then dispatch Immer once under the same workflow.
5. If T112 qualifies, proceed to T113 publication under existing Spec 007 authority.
6. Complete T114 ledger/governance reconciliation and determine successor authority.