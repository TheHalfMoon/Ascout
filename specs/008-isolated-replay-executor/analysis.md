# Specification 008 — Cross-Artifact Analysis

## Status

`CROSS_ARTIFACT_ANALYSIS = PASS`

## Authority consistency

- Issue #171 is return-to-planning only and grants no implementation authority.
- Spec 008 planning does not claim authority to create a workflow.
- `tasks.md` requires a separate implementation authorization before any workflow mutation.
- Spec 007 T111/T112 ordering remains unchanged.

## Scope consistency

`spec.md`, `clarifications.md`, both Ponytail reviews, `plan.md`, and `tasks.md` all converge on exactly one potential future repository path:

- `.github/workflows/spec-007-isolated-replay.yml`

No artifact authorizes changes to product, benchmark harness, manifest, current results, dependencies, Project CI, Self Verification, or release surfaces.

## Trigger/input consistency

All artifacts require:

- manual dispatch only;
- exact Ascout SHA;
- closed Jotai/Immer case enum;
- repetitions restricted to 2 or 3;
- no arbitrary repository/command/runtime/package-manager input.

No conflicting dynamic-input surface was found.

## Runtime consistency

All artifacts bind Linux/Ubuntu 24.04, Node `24.15.0`, and Yarn Classic `1.22.22`. The plan explicitly marks Yarn activation as implementation-time proof, not an assumed capability.

## Evidence consistency

All artifacts preserve the unchanged canonical harness as the benchmark authority and forbid synthetic success, test weakening, alternate oracle, rerun-until-green, or new network-isolation claims.

## Security consistency

All artifacts require least privilege, no secrets, nonpersistent checkout credentials, bounded execution, and no untrusted PR trigger. No artifact requires repository write permission from the replay workflow.

## Complexity consistency

Both Ponytail reviews and the technical plan reject wrappers, reusable workflow abstraction, generalized matrices, caches, custom actions, containers, services, and product integration.

## Dependency-order consistency

The only valid order is:

`Spec 008 planning closeout -> Spec 008 implementation authorization -> workflow implementation closeout -> T111 -> T112 -> T113 -> T114`

No artifact pre-authorizes a successor.

## Open review gates

The following are intentionally not self-certified:

1. independent final plan audit on the exact planning head;
2. fresh exact-head cross-artifact/branch-purity review before planning merge.

These must be supplied by independent repository review evidence.