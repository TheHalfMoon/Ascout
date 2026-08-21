# 001 — Phase 0 Research

**Date:** 2026-08-21  
**Scope:** Technical decisions necessary to plan M1 only. No implementation is authorized.

## R1 — Runtime baseline

**Decision:** Node.js `>=22`; develop/test on Node 22 and Node 24 LTS, with Node 24 as primary reference.

**Evidence:** Node's release schedule on 2026-08-21 lists v22 and v24 as LTS, v20 EOL, and v26 Current.

Primary source: https://nodejs.org/en/about/previous-releases

## R2 — TypeScript baseline

**Decision:** TypeScript 6.x for Ascout source/typechecking; emitted runtime remains compatible with Node >=22.

**Evidence:** TypeScript 6.0 is the current transition release and documents API compatibility with 5.9 while preparing for TypeScript 7.

Primary source: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html

## R3 — CLI parsing

**Decision:** Use stable `node:util.parseArgs`; do not add Commander/yargs/cac for three commands.

Primary source: https://nodejs.org/api/util.html

## R4 — Cross-platform child-process launch

**Decision:** Plan one runtime dependency, `cross-spawn`, subject to exact-version license/provenance review at implementation. Keep timeout/process-tree termination in Ascout-owned code.

**Why:** Windows command shims/PATHEXT/shebang behavior is security-sensitive plumbing outside Ascout's wedge. Arbitrary `shell: true` execution remains prohibited.

Primary sources:
- https://nodejs.org/api/child_process.html
- https://www.npmjs.com/package/cross-spawn

## R5 — Vitest affected selection

**Decision:** Reuse Vitest native `related`/`--changed`; do not build an M1 semantic dependency graph.

**Evidence:** Current Vitest documents related/changed operation, Git-backed changed detection, coverage support, and full-suite force-rerun triggers for selected configuration changes. Static relationship analysis has blind spots, so Ascout still requires widening.

Primary sources:
- https://vitest.dev/guide/cli
- https://vitest.dev/config/changed
- https://vitest.dev/config/coverage

## R6 — Jest affected selection

**Decision:** Reuse project-local `jest --findRelatedTests <files>` for supported Jest repositories.

**Evidence:** Jest documents related-test selection and use with coverage; current configuration supports LCOV output.

Primary sources:
- https://jestjs.io/docs/cli
- https://jestjs.io/docs/30.0/configuration

## R7 — Coverage interchange

**Decision:** Normalize only line-level LCOV written into an Ascout-owned run directory. No coverage database or runner in-memory API contract.

**Why:** M1 only needs to establish observed changed-line execution. Branch/function semantics are out of scope. Missing/ambiguous source mapping is `UNRESOLVED` and is a material verification gap after permitted widening.

## R8 — Test result interchange

**Decision:** Prefer runner JSON output for current-run test identities/outcomes; retain raw stdout/stderr only as bounded/redacted artifacts. JUnit is not mandatory in M1.

## R9 — Configuration format and boundary

**Decision:** Tracked root `ascout.config.json`, versioned and non-executable. `.ascout/` is ignored runtime state.

Config v1 only overrides fixed semantic task categories:

- `typecheck`;
- `lint`;
- `test`;
- `pytestBasic`.

Allowed override fields are enable/disable with reason, argv command override, task timeout, global timeout/budget, and extra redaction env names.

**Rejected:** arbitrary task names, user-defined prerequisites, custom workflow edges, workspace orchestration DSL, executable JS/TS config, YAML/TOML parser dependencies.

Internal ordering among fixed product tasks remains product logic, not user-authored workflow.

## R10 — Repository/source identity

**Decision:** Git CLI is canonical source-state input; persisted repository identity is always opaque and schema-enforceable.

A run records repository ID, HEAD, detached/shallow flags, start tree digest, config digest, and end tree digest.

### Remote identity safety

Raw origin text is never persisted. Normalize the remote only long enough to remove credentials/userinfo/query/fragment and canonicalize the credential-free identity, then persist:

```text
remote:<sha256(normalized-credential-free-remote-identity)>
portable=true
```

This avoids schema-level ambiguity about whether a supposedly sanitized URL is actually safe.

### Local identity safety

Without a remote, persist:

```text
local:<sha256(canonical-real-repository-path)>
portable=false
```

The raw absolute path is never persisted/rendered.

### Tree digest

- HEAD anchors committed clean content.
- Canonical index entries represent staged state.
- Unstaged tracked state includes current worktree file type/mode plus content/symlink digest or deletion marker.
- **All non-gitignored untracked files except `.ascout/`** are included; there is no heuristic "relevant untracked" omission list.
- Tracked files are never excluded because a verification tool may rewrite them.

This is deliberately conservative: a tool writing a non-gitignored untracked file outside `.ascout/` causes drift.

## R11 — Changed-line calculation

**Decision:** Git zero-context unified diff for tracked changes; non-gitignored untracked text files are wholly changed. Binary/non-line inputs are file-level only. Rename events preserve both old and new path in the machine receipt.

## R12 — Workspace scope

**Decision:** single-package + basic npm/pnpm/yarn workspaces. No workspace dependency graph and no config-driven arbitrary workspace orchestration.

Basic behavior may locate owning package and widen to package/whole-basic-workspace scope when root changes cannot be safely narrowed. Nx/Turbo/Bazel specialization is later delegation territory.

## R13 — Process timeout and tree termination

**Decision:** one process-control module owns launch/capture/timeout/tree termination.

- POSIX: dedicated process group.
- Windows: platform-native process-tree termination; parent kill alone is not assumed sufficient.

Exact grace periods are tested implementation constants.

## R14 — Development tests and CI

**Decision:** deterministic unit/contract/integration tests plus GitHub Actions development CI on Linux/macOS/Windows and supported Node LTS lines. This does not make CI/SARIF an M1 Ascout user surface.

Temporary real Git repositories are required for source-binding/drift tests.

## R15 — Runtime dependency budget

**Decision:** planned M1 product runtime budget is one dependency (`cross-spawn`). Additional runtime dependency requires a plan delta showing why Node/platform/project-native capability is insufficient.

Development dependencies still require exact-version provenance/license review.

## R16 — Distribution

**Decision:** npm package with `ascout` bin for M1. Native self-contained binaries deferred until adoption evidence shows Node/npm friction is material.

Unscoped npm package-name availability is a release gate, not assumed from search absence; a scoped package can still expose the `ascout` binary.

## R17 — Completeness / no-green semantics

**Decision:** clean exit `0` requires stable, materially complete verification and no finding/flake/error.

Material incompleteness includes:

- applicable fixed task `NOT_RUN`/`BLOCKED`;
- nothing material executed;
- unsafe selection that cannot be widened safely;
- remaining changed executable `NOT_EXERCISED` or `UNRESOLVED` lines after the one permitted widening pass.

Valid affected deselection is selection accounting, not task-level `NOT_RUN`, and does not by itself make a run incomplete.

## R18 — Reproduction semantics

**Decision:** one failing test observation means `reproduced=unknown`. Consistent repeated targeted failures may be true; contradictory observations are flaky and disprove a stable-failure reproduction claim. Rerun-unavailable or rerun-error before a valid second observation remains unknown.

## R19 — Persisted command secrecy

**Decision:** process launch may use raw argv transiently, but persisted/rendered argv is redacted using the same recognized/user-specified exact-value redaction policy as captured output. Raw secret-bearing argv is not written to receipt artifacts.

## R20 — Founding Spec Kit provenance

**Decision:** pin GitHub Spec Kit v0.16.0 for the founding workflow; do not vendor its implementation internals.

Upstream: https://github.com/github/spec-kit/releases/tag/v0.16.0

The founding shell could not resolve GitHub/PyPI, so claiming `specify init` executed would be false. Project-specific artifacts follow inspected v0.16.0 workflow/template semantics and `.specify/PROVENANCE.md` records that fact.

## R21 — Receipt validation boundary

**Decision:** JSON Schema validates field-level structure, while one Ascout-owned pure semantic validator verifies cross-object and cross-field invariants before receipt emission.

It verifies at least:

- unique/resolvable evidence/task/artifact references;
- evidence run/task linkage;
- source start/end vs stability;
- task status/reason/admission invariants;
- exercise record/summary consistency;
- aggregate counts;
- completeness and exit-code precedence.

Any internal/future receipt acceptance path reuses the same validator. No validator service, DB, code-generation system, or second receipt interpretation is introduced.

**Why:** JSON Schema draft 2020-12 cannot generally enforce referential equality between arbitrary array objects and root values. A small pure semantic validator is the minimal honest boundary.
