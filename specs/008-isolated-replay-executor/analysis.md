# Specification 008 — Cross-Artifact Analysis

## Status

`CROSS_ARTIFACT_ANALYSIS = PASS`

## Authority consistency

- Issue #171 is return-to-planning only and grants no implementation authority.
- Spec 008 planning does not claim authority to create a workflow or execution refs.
- `tasks.md` requires a separate implementation authorization before any workflow mutation or task-run ref creation.
- Spec 007 T111/T112 ordering remains unchanged.

## Scope consistency

`spec.md`, `clarifications.md`, both Ponytail reviews, `plan.md`, and `tasks.md` all converge on exactly one potential future tracked repository path:

- `.github/workflows/spec-007-isolated-replay.yml`

They also converge on exactly two future task-run refs:

- `run/spec007-t111-jotai`
- `run/spec007-t112-immer`

No artifact authorizes changes to product, benchmark harness, manifest, current results, dependencies, Project CI, Self Verification, or release surfaces.

## Trigger/control consistency

All artifacts require:

- GitHub `create` event only;
- branch ref type only;
- exact two-branch allowlist;
- fixed branch-to-case mapping;
- exact event/source SHA checkout and guard;
- newly created one-shot task refs from canonical main;
- no ref repoint/reuse/recreation to obtain another attempt;
- exactly two repetitions;
- no arbitrary repository/command/runtime/package-manager/SHA input.

No conflicting dynamic-input surface was found.

## Runtime consistency

All artifacts bind Linux/Ubuntu 24.04, Node `24.15.0`, and Yarn Classic `1.22.22`. The plan explicitly marks Yarn activation as implementation-time proof, not an assumed capability.

## Evidence consistency

All artifacts preserve the unchanged canonical harness as the benchmark authority and forbid synthetic success, test weakening, alternate oracle, rerun-until-green, run-ref recreation, or new network-isolation claims.

## Security consistency

All artifacts require least privilege, no secrets, nonpersistent checkout credentials, bounded execution, exact ref admission, and no untrusted PR trigger. No artifact requires repository write permission from the replay workflow.

## Operational consistency

The amendment resolves the previously identified control-surface mismatch: the connected GitHub authority can create exact branch refs but exposes no workflow-dispatch operation. Official GitHub Actions semantics state that the `create` event runs on Git branch/tag reference creation, including through Git-reference APIs. The design therefore remains executable without issue-text parsing, arbitrary command inputs, or product changes.

## Complexity consistency

Both Ponytail reviews and the technical plan reject wrappers, reusable workflow abstraction, generalized matrices, caches, custom actions, containers, services, wildcard execution refs, and product integration.

## Dependency-order consistency

The only valid order is:

`Spec 008 planning closeout -> Spec 008 implementation authorization -> workflow implementation closeout -> T111 run-ref creation/replay -> T112 run-ref creation/replay -> T113 -> T114`

No artifact pre-authorizes a successor.

## Open review gates

The following are intentionally not self-certified for the amended head:

1. independent final plan audit on the final exact planning head;
2. fresh exact-head cross-artifact consistency and branch-purity review before planning merge.

Any review evidence from the pre-amendment planning head is stale and MUST NOT qualify the amended head.