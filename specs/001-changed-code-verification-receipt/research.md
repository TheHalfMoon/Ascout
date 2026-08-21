# 001 — Phase 0 Research

**Date:** 2026-08-21  
**Scope:** Only technical questions necessary to plan M1. No implementation is authorized.

## R1 — Runtime baseline

**Decision:** Target Node.js `>=22`; develop/test against current supported LTS lines Node 22 and Node 24. Use Node 24 as the primary development/reference environment.

**Evidence:** As of 2026-08-21, Node 22 and Node 24 are both LTS; Node 20 is EOL and Node 26 is Current, not yet LTS.

Primary source: https://nodejs.org/en/about/previous-releases

**Why:** Supporting the two current LTS lines avoids an unnecessary Node-24-only adoption wall while excluding EOL Node 20. Required CLI primitives such as `util.parseArgs` are stable on both supported lines.

## R2 — TypeScript baseline

**Decision:** Use TypeScript 6.x for Ascout source and typechecking; keep runtime JavaScript compatible with the Node >=22 contract.

**Evidence:** TypeScript 6.0 was released in August 2026 and remains API-compatible with TypeScript 5.9 while preparing for the future native compiler transition.

Primary source: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html

**Why:** It is the current stable language toolchain at project founding. The plan does not depend on TypeScript 7 preview/native behavior.

## R3 — CLI parsing

**Decision:** Use Node's stable `node:util.parseArgs` for the M1 command surface. Do not add Commander/yargs/cac solely for three commands.

Primary source: https://nodejs.org/api/util.html

**Why:** `init`, `doctor`, and `check` plus a small flag set do not justify a runtime CLI framework. This is a direct Ponytail/YAGNI application.

## R4 — Cross-platform child-process launch

**Decision:** Use `cross-spawn` as the single planned runtime dependency for command launch, subject to exact-version license/provenance verification at implementation time. Keep timeout/process-tree termination in a small Ascout-owned platform wrapper.

**Evidence:** Node documents that Windows `.bat`/`.cmd` files require terminal handling and warns about shell-based invocation. `cross-spawn` exists specifically to normalize Windows command shims/PATHEXT/shebang behavior and is MIT-licensed.

Primary sources:
- https://nodejs.org/api/child_process.html
- https://www.npmjs.com/package/cross-spawn

**Why:** Reimplementing Windows command-shim escaping is security-sensitive and not Ascout's product wedge. Ascout must still own bounded termination semantics and MUST avoid arbitrary `shell: true` execution.

## R5 — Vitest affected selection

**Decision:** Reuse Vitest native related/changed behavior; do not construct an M1 semantic dependency graph.

**Evidence:** Current Vitest supports `vitest related <files>` and `--changed`; documentation explicitly notes that static relationship analysis does not cover arbitrary dynamic import paths. Vitest also has native full-suite rerun triggers for configuration/package changes.

Primary sources:
- https://vitest.dev/guide/cli
- https://vitest.dev/config/changed

**Consequence:** Ascout's widen triggers are mandatory. Native selection is an optimization, not a proof that nothing else can be affected.

## R6 — Jest affected selection

**Decision:** Reuse `jest --findRelatedTests <files>` for supported Jest projects.

**Evidence:** Jest documents `--findRelatedTests` as finding and running tests related to supplied source files and permits coverage collection in the same run.

Primary source: https://jestjs.io/docs/cli

## R7 — Coverage interchange

**Decision:** Normalize M1 changed-line execution from **LCOV line coverage** written into an Ascout-owned run directory. Do not introduce a coverage database or bind M1 to one test runner's in-memory API.

**Evidence:** Vitest supports configurable coverage reporters and report directories, including LCOV. Jest coverage reporters include LCOV and can direct coverage to a chosen directory.

Primary sources:
- https://vitest.dev/config/coverage
- https://vitest.dev/guide/cli
- https://jestjs.io/docs/configuration

**Why:** LCOV provides a small line-oriented interchange (`source file` + `line,count`) sufficient for the M1 claim: whether a changed executable line was observed executing. Branch/function semantics are deliberately out of scope.

**Caveat:** Coverage/source-map resolution loss is a first-class uncertainty state and benchmark metric. A missing/ambiguous mapping is not silently classified as covered.

## R8 — Test result interchange

**Decision:** Prefer runner JSON output for current-run test identities/outcomes where available; preserve raw stdout/stderr as bounded artifacts. Do not require JUnit as a mandatory intermediate format in M1.

**Evidence:** Vitest provides a JSON reporter; Jest provides JSON output. Both can coexist with coverage output.

**Why:** JSON avoids lossy scraping of human terminal text. Ascout still treats runner output as an external contract and fails closed when it cannot parse it.

## R9 — Configuration format

**Decision:** Use a tracked root `ascout.config.json` with a version field. `.ascout/` is reserved for ignored run artifacts and locks.

**Why:** JSON is parseable with the Node standard library, avoids executing JavaScript/TypeScript configuration as Ascout code, avoids adding a YAML/TOML parser, and cleanly separates tracked policy from ignored evidence artifacts.

M1 config remains small: task enable/disable + reason, command overrides, prerequisites, task/global budgets, workspace scope, and explicit repository-specific widening overrides. No workflow DSL.

## R10 — Repository/source identity

**Decision:** Use Git CLI as the source of repository truth. A run records origin/local-only repo identity, HEAD, detached/shallow flags, a canonical start tree digest, config digest, and an end tree digest.

**Tree-digest design:**

- committed unchanged content is anchored by HEAD;
- staged/index state is represented canonically from Git index entries;
- unstaged changed tracked files are represented by sorted relative path + file-state/content digest;
- relevant untracked non-ignored files are represented by sorted relative path + content digest;
- documented Ascout/tool output paths that are untracked non-source artifacts may be excluded;
- tracked files are never excluded merely because a test tool may rewrite them.

**Why:** This avoids hashing every clean tracked file while still binding the complete changed state. Exact serialization is an implementation contract to be locked by tests before release.

## R11 — Changed-line calculation

**Decision:** Use Git's unified diff with zero context for tracked changes; treat relevant untracked text source files as wholly changed. Binary/non-line-oriented inputs are accounted for as changed files but are not given fabricated line-coverage semantics.

**Why:** Git is already the canonical changed-state engine and avoids introducing a custom diff library.

## R12 — Workspace scope

**Decision:** M1 is first-class for single-package repositories and **basic** npm/pnpm/yarn workspaces only. It does not build a workspace dependency graph.

Basic workspace behavior means:

- locate the owning package for changed paths;
- run package-local applicable verification;
- widen to package/workspace scope when root dependency/config changes make narrower scope unsafe;
- treat Nx/Turbo/Bazel specialized affected semantics as M2+ delegation candidates.

## R13 — Process timeout and tree termination

**Decision:** Launch each task through one process-control module and terminate the spawned process tree on timeout. On POSIX use a dedicated process group; on Windows use platform-native process-tree termination rather than assuming killing the parent PID kills descendants.

**Why:** Node documents platform differences around Windows command execution. A verification CLI cannot leave child dev/test processes running after it reports a timeout.

Exact grace periods and termination escalation are implementation constants covered by OS-matrix tests, not product configuration in the first slice.

## R14 — Development tests and CI

**Decision:** Ascout's own repository uses deterministic unit/contract/integration tests and a GitHub Actions development CI matrix for Linux, macOS, and Windows on supported Node LTS lines. This does **not** make CI/SARIF an M1 user-facing Ascout product surface.

Use real temporary Git repositories in integration tests for Git/source-binding behavior. Runner integrations use small fixture repositories and fake/stub executables where a real runner is not necessary for the behavior under test.

## R15 — Runtime dependency budget

**Decision:** Planned M1 runtime dependency budget is one justified dependency (`cross-spawn`). Any additional runtime dependency requires a plan delta explaining why Node/platform/project-native capability is insufficient.

Development dependencies (TypeScript/types/test tooling) do not count as product runtime dependencies but still require exact-version provenance review.

## R16 — Distribution

**Decision:** M1 distribution target is the npm ecosystem with a `ascout` binary entry. Self-contained platform binaries are deferred until adoption evidence shows Node/npm installation is material friction.

The unscoped npm package name `ascout` was not treated as available merely from search absence; package publication/name ownership is a release gate, not an implementation-plan assumption. A scoped fallback can be chosen later without changing the CLI command.

## R17 — Founding Spec Kit provenance

**Decision:** Ascout pins GitHub Spec Kit v0.16.0 for the founding workflow. Spec Kit implementation internals are not vendored.

Upstream: https://github.com/github/spec-kit/releases/tag/v0.16.0

**Why:** The founding environment could inspect the pinned GitHub tag but could not resolve GitHub/PyPI from its shell, so claiming `specify init` executed would be false. Project-specific artifacts follow the pinned template/workflow semantics directly; provenance is recorded in `.specify/PROVENANCE.md`.
