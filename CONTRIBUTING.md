# Contributing to Ascout

Thank you for helping improve Ascout. Contributions must preserve the repository's evidence-first, fail-closed design and its canonical specification workflow.

## Scope and trust model

Ascout v0.x is built for a developer's own trusted local Git repository. It is not an untrusted-repository sandbox. Repository commands and project-local tooling execute with the developer's process authority, and Ascout does not install repository dependencies implicitly.

Changes must not weaken command admission, source binding, path integrity, evidence honesty, process cleanup, privacy/redaction, package boundaries, or the no-green-by-omission rule merely to make a workflow pass.

## Canonical specification workflow

The repository's founding workflow is pinned by `.specify/PROVENANCE.md` to `github/spec-kit` v0.16.0, release commit `5dce710ce099067c7d3f2ef47a37b9a1c300b327`. The Spec Kit CLI itself is not vendored into Ascout.

Material product work follows this order:

1. constitution compliance
2. feature specification
3. material clarification
4. Ponytail/YAGNI reduction
5. technical plan
6. second Ponytail plan reduction
7. implementation tasks
8. requirements-quality checklist
9. cross-artifact analysis
10. independent final plan audit
11. fresh exact-HEAD cross-artifact consistency and branch-purity review
12. explicit implementation authorization

A stale audit is not authorization. If material facts or files change after an audit, reconcile the affected claims and review the new exact head before implementation or merge consideration.

### Ponytail/YAGNI is a reduction gate

Ponytail/YAGNI is a complexity gate, not an architecture generator. Use it to remove unjustified abstractions, services, dependencies, extension points, configuration, and speculative future work. Do not use it to invent a second architecture or expand scope.

## Task and branch discipline

Use one canonical task per task-scoped branch and pull request. A branch may contain multiple forward-only commits needed to complete that one task, but it must not absorb unrelated cleanup or a later canonical task.

Before mutating a task:

- re-read live canonical `main` and the relevant constitution/spec/plan/tasks/contracts;
- verify that all task dependencies are canonically closed;
- branch from the exact current canonical base;
- keep the changed-file set bounded to the authorized task.

Do not mutate a future task before the preceding task is canonically merged and closed. Read-only preparation is allowed, but preparation is not implementation authority and must be revalidated when the task becomes eligible.

Do not force-push, rebase, or destructively rewrite shared task history. Repair findings with forward commits so review and qualification evidence remain auditable.

## Exact-head qualification and review

Claims belong to an exact commit. Before requesting merge or claiming a task complete:

- verify the exact branch head and compare against its canonical base;
- run the task-specific qualification required by the task/plan;
- run applicable project CI on the exact head;
- distinguish product/task failures from unrelated known infrastructure or historical debt rather than suppressing either;
- inspect submitted reviews and unresolved inline threads;
- reconcile every material finding on the new exact head after the last mutation;
- verify branch purity and that no unrelated path entered the task.

Do not claim `PASS`, `MERGED`, `CLOSED_CANONICAL`, release readiness, or equivalent stronger evidence without the exact evidence supporting that state.

After merge, verify canonical `main`, the merge commit and ordered parents, tree identity, GitHub verification/signature state when available, pull-request merged/closed state, and the repository-native task closeout before beginning the next canonical task.

## Implementation boundaries

### Dependencies and architecture

M1 has a deliberately small runtime surface. Do not add a second product runtime dependency or a new service, database, daemon, model, semantic graph, plugin framework, or equivalent architecture expansion without returning to planning and obtaining explicit canonical authority.

Prefer Git, Node, and project-native tool capabilities before custom machinery.

### Repository command execution

Do not add arbitrary `shell: true` command construction or silently broaden the executable command surface.

If a change touches an effective command/configuration authority that Ascout would execute or load, ordinary execution must remain fail-closed according to the canonical changed-command-surface contract. The explicit `--allow-changed-command-surface` admission is human, per invocation, not persistent, and must not be injected automatically by agents, hooks, tests, or integrations.

Do not make Ascout implicitly install repository dependencies.

### Evidence, privacy, and paths

Persist only canonical repository/run-relative paths allowed by the receipt contract. Invalid raw spellings must be rejected before lossy normalization rather than repaired into valid-looking evidence.

Do not weaken source-start/source-end identity, evidence/artifact reference integrity, completeness semantics, redaction flags, truncation facts, or exit-code precedence.

Raw credentials, credential-bearing repository origins, raw absolute local paths, and raw secret-bearing argv must remain outside persisted receipt truth. Secret redaction is best-effort; do not claim universal secret detection.

### Tests

Add the smallest tests that prove the authorized behavior and prevent the observed regression. Prefer deterministic contract/integration evidence over implementation-coupled assertions.

Do not skip or weaken a failing supported-platform case merely to obtain green CI. If a platform exposes a genuine defect, fix it within the authorized task or record the separate blocker/debt according to canonical task ownership.

## Third-party code, licensing, and provenance

Do not copy donor/component code into Ascout merely because it is publicly accessible. Before third-party implementation material enters the repository:

- identify the exact upstream project/version/commit or artifact;
- verify its applicable license and redistribution obligations;
- record required provenance and notices;
- ensure the license is compatible with the intended use;
- avoid copying code when a native capability or independently written implementation is sufficient.

Dependency and provenance records must reflect the exact candidate being shipped, not a stale earlier lockfile.

## Pull requests

Keep pull requests reviewable and factual. Include, as applicable:

- canonical task and base SHA;
- exact current head SHA;
- changed-file scope;
- user-visible or contract behavior changed;
- explicit non-goals;
- exact qualification/CI evidence;
- known residual debt or blockers that are not caused by the PR;
- review reconciliation state;
- any security, provenance, packaging, or compatibility implications.

Do not describe queued or unexecuted checks as passing, and do not hide unavailable evidence behind aggregate language.

## Security reports

Do not disclose an undisclosed vulnerability in a public contribution. Follow `SECURITY.md` and use GitHub-supported private reporting channels when available.

## Documentation-only changes

Documentation is still canonical product communication. Reconcile it against live behavior and authority; do not document capabilities, guarantees, support levels, publication state, ownership, security properties, or release readiness the repository cannot prove.
