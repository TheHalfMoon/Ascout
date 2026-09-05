# Specification 008 — Clarifications

## Status

`CLARIFICATIONS = CLOSED_FOR_PLANNING`

## Q1 — Why is a repository workflow needed?

The current authorized conversation executor cannot provide the frozen Node/Yarn/network route, and existing Project CI/Self Verification do not invoke donor replay. A repository-hosted GitHub Actions workflow is the smallest available route that can provide an auditable Linux runtime while keeping execution attached to exact repository identity.

## Q2 — Why not modify Project CI?

Project CI is product qualification infrastructure and already has a six-lane contract. Adding donor replay there would couple external acquisition and long-running benchmark execution to ordinary product qualification, expand blast radius, and violate the Spec 007 recovery requirement to prefer a benchmark-only route.

## Q3 — Why not use `workflow_dispatch` only?

The connected GitHub authority available to this project exposes exact branch/ref creation but no workflow-dispatch operation. A dispatch-only design would therefore preserve the execution blocker even after implementation. GitHub's documented `create` event is directly tied to creation of a branch/tag ref through GitHub, including the Git references API, so a closed task-run branch is the smallest execution control that can be exercised by the current authorized surface.

## Q4 — Why exactly two run branches?

The frozen plan has exactly two ordered qualification tasks. `run/spec007-t111-jotai` maps only to Jotai and may be created only after the workflow implementation is canonical and T111 is eligible. `run/spec007-t112-immer` maps only to Immer and may be created only after T111 is durably qualified. No wildcard run branch or arbitrary case input is required.

## Q5 — Can a run branch be moved or reused?

No. Qualification authority is one newly created ref pointing to the exact then-canonical `main` SHA. Repointing, force-updating, deleting/recreating for another attempt, or reusing the same task ref to obtain green is outside the plan. A failed first authorized replay remains evidence and returns to planning under the existing Spec 007 rules.

## Q6 — What about GitHub's native re-run button/API?

It is also forbidden as qualification authority. GitHub re-runs preserve the original event SHA/ref and increment `github.run_attempt`, so ref immutability alone is insufficient. The workflow must admit replay work only when `github.run_attempt == '1'`. Every later attempt must skip before checkout/install/build/donor acquisition/harness execution. The task ledger must record the attempt and reject any attempt other than `1`, even if a later re-run reports success.

## Q7 — How is exact source binding preserved?

Before creating a run ref, the task ledger must record and reverify canonical `main`. The ref is created from that exact SHA. The workflow uses the `create` event's source SHA, checks out that exact commit with credentials disabled, and proves `git rev-parse HEAD` and the clean tree before install/build/replay. If event/ref/source identity does not match the task ledger, the run is nonqualifying and must fail closed.

## Q8 — Does GitHub-hosted runner network violate hermeticity?

Not by itself. The current canonical harness explicitly states that network is available for public acquisition and dependency reconstruction and that network isolation is not claimed. The frozen requirement is that the measured oracle must not require credentials, mutable hosted services, or undeclared external state. The workflow must preserve, not exaggerate, that boundary.

## Q9 — How is Yarn 1.22.22 provided?

Use the smallest deterministic mechanism available on the pinned Node runner and verify the executable reports exactly `1.22.22` before replay. The implementation plan prefers Corepack activation of `yarn@1.22.22` if supported by exact Node `24.15.0`; if that exact route is not supported during implementation qualification, the implementation must fail and return to planning rather than silently selecting another Yarn version.

## Q10 — Why install/build Ascout before replay?

`benchmarks/run.mjs` invokes `dist/cli.js`. The workflow must build the exact checked-out Ascout source after exact lockfile installation so the harness compares using the exact source under qualification.

## Q11 — Are donor dependencies cached?

No benchmark-evidence cache is needed. The canonical harness already uses fresh observation roots. Avoiding a new cross-run donor cache keeps the executor simpler and prevents cache provenance from becoming another evidence authority surface.

## Q12 — What is retained?

Only bounded replay output/artifacts and normal GitHub Actions logs for the configured retention period. No raw secrets are expected or authorized. The workflow does not create tracked result files. Run ID and run attempt remain visible in GitHub evidence.

## Q13 — Does Spec 008 reopen candidate selection?

No. Jotai and Immer identities remain frozen by Spec 007. Spec 008 changes only the execution route needed to evaluate them.

## Q14 — Does planning authorize the workflow or run refs?

No. Canonical planning closure only establishes the design. A separate explicit implementation authorization must name the exact one-file workflow mutation, the exact task-run ref creation authority, and the attempt-1-only admission rule before any execution.