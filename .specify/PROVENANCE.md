# Spec Kit Provenance

Ascout's founding specification workflow is pinned to **GitHub Spec Kit v0.16.0**.

Upstream: `github/spec-kit`  
Tag: `v0.16.0`  
Release commit: `5dce710ce099067c7d3f2ef47a37b9a1c300b327`  
Pinned on: `2026-08-21`

## Verification

The full release commit above was independently resolved from the upstream repository and corresponds to the `chore: bump version to 0.16.0` release commit dated 2026-08-05.

## Bootstrap note

The canonical Ascout artifacts in this branch follow the v0.16.0 Spec Kit constitution/spec/plan/tasks/checklist workflow and inspected template semantics.

The Spec Kit CLI itself was not vendored into Ascout. The repository-founding shell environment could not resolve GitHub/PyPI, so claiming that `specify init` executed would be false. Instead, upstream v0.16.0 templates and Claude integration behavior were inspected directly from the pinned GitHub tag/commit, and only project-specific artifacts Ascout needs are committed here.

This is intentional YAGNI: Ascout does not vendor Spec Kit implementation internals. A normal developer checkout may install the pinned CLI and use the generated workflow against these artifacts.

## Canonical workflow

1. constitution
2. specify
3. clarify
4. Ponytail/YAGNI reduction
5. plan
6. Ponytail plan reduction
7. tasks
8. checklist
9. analyze
10. independent final plan audit
11. fresh exact-HEAD cross-artifact + branch-purity review
12. explicit implementation authorization

A stale audit is never authorization. Any material mutation after the audited head requires reconciliation of affected claims and a new exact-HEAD review before implementation or merge consideration.

`implement` is not authorized by this founding branch.
