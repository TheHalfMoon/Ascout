# Specification 008 — Clarifications

## Status

`CLARIFICATIONS = CLOSED_FOR_PLANNING`

## Q1 — Why is a repository workflow needed?

The current authorized conversation executor cannot provide the frozen Node/Yarn/network route, and existing Project CI/Self Verification do not invoke donor replay. A repository-hosted GitHub Actions workflow is the smallest available route that can provide an auditable Linux runtime while keeping execution attached to exact repository identity.

## Q2 — Why not modify Project CI?

Project CI is product qualification infrastructure and already has a six-lane contract. Adding donor replay there would couple external acquisition and long-running benchmark execution to ordinary product qualification, expand blast radius, and violate the Spec 007 recovery requirement to prefer a benchmark-only route.

## Q3 — Why `workflow_dispatch`?

T111/T112 are governance-gated qualification acts, not tests that should run on every push or PR. Manual dispatch keeps execution explicit and avoids silently running third-party donor code on untrusted or unrelated source changes.

## Q4 — May the workflow accept arbitrary commands or repositories?

No. The case selector is a closed enum for the exact Jotai and Immer cases already frozen in canonical `benchmarks/manifest.json`. Repository URL, commands, runtime, package manager, manifest path, and harness path are not configurable inputs.

## Q5 — How is exact source binding preserved?

The caller supplies the exact intended canonical Ascout SHA. Checkout uses that SHA, credentials are not persisted, and a guard must prove `git rev-parse HEAD` equals the supplied value before install/build/replay. A run against a noncanonical SHA may be useful as failed/nonqualifying evidence but cannot qualify T111/T112.

## Q6 — Does GitHub-hosted runner network violate hermeticity?

Not by itself. The current canonical harness explicitly states that network is available for public acquisition and dependency reconstruction and that network isolation is not claimed. The frozen requirement is that the measured oracle must not require credentials, mutable hosted services, or undeclared external state. The workflow must preserve, not exaggerate, that boundary.

## Q7 — How is Yarn 1.22.22 provided?

Use the smallest deterministic mechanism available on the pinned Node runner and verify the executable reports exactly `1.22.22` before replay. The implementation plan prefers Corepack activation of `yarn@1.22.22` if supported by exact Node `24.15.0`; if that exact route is not supported during implementation qualification, the implementation must fail and return to planning rather than silently selecting another Yarn version.

## Q8 — Why install/build Ascout before replay?

`benchmarks/run.mjs` invokes `dist/cli.js`. The workflow must build the exact checked-out Ascout source after exact lockfile installation so the harness compares using the exact source under qualification.

## Q9 — Are donor dependencies cached?

No benchmark-evidence cache is needed. The canonical harness already uses fresh observation roots. Avoiding a new cross-run donor cache keeps the executor simpler and prevents cache provenance from becoming another evidence authority surface.

## Q10 — What is retained?

Only bounded replay output/artifacts and normal GitHub Actions logs for the configured retention period. No raw secrets are expected or authorized. The workflow does not create tracked result files.

## Q11 — Does Spec 008 reopen candidate selection?

No. Jotai and Immer identities remain frozen by Spec 007. Spec 008 changes only the execution route needed to evaluate them.

## Q12 — Does planning authorize the workflow file?

No. Canonical planning closure only establishes the design. A separate explicit implementation authorization must name the exact one-file workflow mutation before it is created.