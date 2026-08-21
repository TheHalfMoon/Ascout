# Spec Kit Provenance

Ascout's founding specification workflow is pinned to **GitHub Spec Kit v0.16.0**.

Upstream: `github/spec-kit`
Tag: `v0.16.0`
Release commit: `5dce710`
Pinned on: `2026-08-21`

## Bootstrap note

The canonical Ascout artifacts in this branch follow the v0.16.0 Spec Kit constitution/spec/plan/tasks/checklist workflow and template semantics.

The Spec Kit CLI itself was not vendored into Ascout. The execution environment used for repository founding could not resolve `github.com`/PyPI from its shell, so claiming that `specify init` executed would be false. Instead, the upstream v0.16.0 templates and Claude integration behavior were inspected directly from the pinned GitHub tag, and only the project-specific artifacts that Ascout needs are committed here.

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
11. explicit implementation authorization

`implement` is not authorized by this founding branch.
