---
description: "Implementation tasks for Ascout changed-code verification receipt"
---

# Tasks: Changed-Code Verification Receipt

**Input**: `spec.md`, `research.md`, `plan.md`, `data-model.md`, contracts and quickstart under `specs/001-changed-code-verification-receipt/`

**Status**: Planning artifact only. Completing this file does not authorize implementation; implementation starts only after the founding PR is independently reviewed and explicitly authorized.

**Tests**: Required. Trust semantics, source binding, no-green-by-omission, cross-platform process behavior, and contracts are not optional.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: may be implemented in parallel because paths/behavior do not conflict.
- **[US#]**: maps to a user story in `spec.md`.
- Every task names concrete paths; introducing new top-level architecture requires a plan amendment.

## Phase 1: Repository Setup

**Purpose**: Create only the package/tooling foundation needed for one TypeScript CLI.

- [ ] T001 Create the npm CLI manifest in `package.json` with `ascout` bin entry, Node `>=22`, ESM package mode, and scripts for build/typecheck/test; do not add product runtime dependencies other than the reviewed `cross-spawn` pin.
- [ ] T002 Create strict TypeScript 6 compiler configuration in `tsconfig.json` targeting the Node >=22 runtime contract.
- [ ] T003 [P] Add development-only TypeScript/Node test dependencies and lockfile; document exact dependency licenses/provenance in `THIRD_PARTY_NOTICES.md`.
- [ ] T004 [P] Add Apache-2.0 project `LICENSE` and initial provenance policy in `docs/legal/CODE_PROVENANCE.md`.
- [ ] T005 Update root `.gitignore` so `.ascout/`, local coverage, build output, and dependency folders are ignored without ignoring tracked source snapshots/configuration.
- [ ] T006 Add minimal `src/cli.ts` executable entry that can parse `init`, `doctor`, and `check` command names with Node `util.parseArgs`; it MUST return usage/config errors without executing repository tasks yet.
- [ ] T007 Add root development smoke test in `tests/integration/cli-help.test.ts` proving the compiled CLI starts on the supported Node contract without network/account/configuration.

**Checkpoint**: Package builds and the inert CLI starts; no verification command execution exists yet.

---

## Phase 2: Foundational Trust and Evidence Primitives

**Purpose**: Implement source binding, config, process control, locking, redaction, and receipt contracts before any user story can claim verification.

### Tests first

- [ ] T008 [P] Add config contract tests in `tests/contract/config-v1.test.ts` covering version, unknown keys, disabled-task reason requirement, argv-array commands, timeout bounds, and no executable JS config.
- [ ] T009 [P] Add receipt contract/exit-precedence tests in `tests/contract/receipt-v1.test.ts` covering all seven task statuses and exit precedence `2 > 3 > 1 > 4 > 0`.
- [ ] T010 [P] Add golden tree-digest vectors in `tests/unit/tree-digest.test.ts` covering clean, staged, unstaged, deletion, symlink, relevant untracked, local-only repo identity, and tracked snapshot mutation.
- [ ] T011 [P] Add Git zero-context diff parser tests in `tests/unit/git-diff.test.ts` covering add/modify/delete/rename, changed new-line ranges, binary files, and untracked whole-file semantics.
- [ ] T012 [P] Add process-control tests in `tests/integration/process-control.test.ts` for argv preservation, stdout/stderr caps, timeout, child-tree cleanup, and non-shell launch; include Windows-specific cases behind platform conditions.
- [ ] T013 [P] Add run-lock tests in `tests/integration/run-lock.test.ts` for live owner refusal and dead-owner stale-lock recovery.
- [ ] T014 [P] Add redaction tests in `tests/unit/redact.test.ts` for recognized secret-bearing env names, user-specified names, short/empty value protection, and truncation metadata.

### Implementation

- [ ] T015 Implement strict tracked JSON config parsing/validation and effective config digest in `src/config.ts`, conforming to `contracts/ascout-config-v1.schema.json` and rejecting unknown v1 top-level keys.
- [ ] T016 Implement repository/origin/HEAD/detached/shallow discovery in `src/git.ts` without mutating the worktree or index.
- [ ] T017 Implement canonical `tree_digest_v1` serializer in `src/git.ts` using length-prefixed fields and SHA-256; include tracked index entries, unstaged tracked content state, and relevant untracked content while excluding only documented untracked non-source artifacts.
- [ ] T018 Implement zero-context tracked diff parsing plus relevant untracked-file changed scope in `src/git.ts`; do not fabricate line semantics for binary/deleted-only files.
- [ ] T019 Implement cross-platform argv process launch, bounded capture, timeout, and process-tree termination in `src/process.ts` using reviewed `cross-spawn` launch behavior and no arbitrary `shell: true`.
- [ ] T020 Implement atomic `.ascout/run.lock` acquisition/stale-owner handling in `src/lock.ts`; concurrent live runs MUST be refused rather than queued.
- [ ] T021 Implement persisted-output redaction and truncation utilities in `src/redact.ts`; redaction MUST occur before stored raw output and agent output.
- [ ] T022 Implement run/artifact directory lifecycle and default 20-completed-run retention in `src/check.ts` or the smallest adjacent module proven necessary; never delete the active run.
- [ ] T023 Implement the single internal receipt model and deterministic exit decision in `src/receipt/model.ts`, including run-bound Evidence IDs and weak `fingerprint_v1` framing.
- [ ] T024 Implement versioned JSON receipt serialization in `src/receipt/json.ts` and validate emitted examples against `contracts/receipt-v1.schema.json` in `tests/contract/receipt-v1.test.ts`.

**Checkpoint**: Source/evidence primitives exist and are testable, but no repository verification task is yet presented as successful.

---

## Phase 3: User Story 1 — Source-Bound Verification Receipt (Priority: P1)

**Goal**: `ascout check` can discover concrete local tasks, execute them honestly, and emit a source-bound receipt with no green by omission.

**Independent Test**: A trusted fixture repository with typecheck/lint/test commands produces a stable receipt; missing/precondition/error cases remain visible and source-bound.

### Tests first

- [ ] T025 [P] [US1] Add package-manager/discovery fixtures and tests in `tests/integration/discovery.test.ts` for `packageManager`, unambiguous npm/pnpm/yarn lockfiles, conflicting signals, single package, and basic workspace ownership.
- [ ] T026 [P] [US1] Add command-provenance tests in `tests/integration/command-provenance.test.ts` proving each executed task records `user_config | repo_config | discovery` plus source path and that changed command-surface files are warned before task launch.
- [ ] T027 [P] [US1] Add missing-tool/no-implicit-install tests in `tests/integration/missing-tool.test.ts` proving applicable work becomes `NOT_RUN(tool_missing)` and no package-manager install command executes.
- [ ] T028 [P] [US1] Add prerequisite/error/blocking tests in `tests/integration/task-status.test.ts` distinguishing repository `FAIL`, execution `ERROR`, downstream `BLOCKED`, non-applicability, and materially incomplete exit `4`.
- [ ] T029 [US1] Add end-to-end receipt fixture in `tests/integration/check-receipt.test.ts` asserting source identity, comparison scope, config digest, task matrix, artifacts, stability, and clean exit semantics from one real temporary Git repository.

### Implementation

- [ ] T030 [US1] Implement package-manager/project/tool discovery in `src/discovery.ts` using explicit config first, root `packageManager` second, unambiguous lockfiles third; conflicting signals fail closed.
- [ ] T031 [US1] Implement concrete TypeScript task planning/execution in `src/tools/typescript.ts`, preferring explicit override/project typecheck script and only using direct project-local `tsc` when invocation is unambiguous.
- [ ] T032 [US1] Implement concrete ESLint task planning/execution in `src/tools/eslint.ts`, preferring explicit override and otherwise project-local config; disclose whether changed-file or project-script scope ran.
- [ ] T033 [US1] Implement basic configured pytest task in `src/tools/pytest.ts` with pass/fail/error only; do not add Python environment selection, affected selection, testmon, or Python exercise coverage.
- [ ] T034 [US1] Implement task prerequisite ordering and status propagation in `src/check.ts` with explicit `NOT_RUN`, `BLOCKED`, and `ERROR` reasons.
- [ ] T035 [US1] Implement command-surface classification in `src/discovery.ts` for effective package scripts, Ascout config, TypeScript/lint/test configuration and issue the pre-execution warning without claiming untrusted-repository safety.
- [ ] T036 [US1] Implement concise terminal receipt in `src/receipt/terminal.ts` showing source identity, task matrix, visible omissions, and stability before raw detail.
- [ ] T037 [US1] Wire `ascout check` in `src/cli.ts` to the source-bound run flow; exit `0` MUST be impossible if no material applicable verification executed or applicable work remains materially incomplete.
- [ ] T038 [US1] Implement `ascout doctor` in `src/cli.ts`/`src/discovery.ts` to report discovery, command sources, missing tools/config, selection/coverage capability, and unsupported M1 characteristics without executing verification tasks.
- [ ] T039 [US1] Implement `ascout init` in `src/cli.ts`/`src/config.ts` to create minimal tracked config and `.ascout/` ignore entry only on explicit invocation; never install project packages or host hooks implicitly.

**Checkpoint**: User Story 1 is independently demonstrable: Ascout produces an honest local task receipt bound to one source state.

---

## Phase 4: User Story 2 — Changed-Code Exercise Gaps (Priority: P1)

**Goal**: The receipt distinguishes changed executable lines that selected/executed tests touched from changed lines they did not touch or could not map.

**Independent Test**: Fixtures containing both exercised and unexercised changed lines produce correct `EXERCISED`, `NOT_EXERCISED`, and `UNRESOLVED` records without calling coverage correctness.

### Tests first

- [ ] T040 [P] [US2] Add strict LCOV parser golden tests in `tests/unit/lcov.test.ts` covering multiple files, repeated line records, zero/nonzero counts, malformed records, path normalization, and unresolved source mapping.
- [ ] T041 [P] [US2] Add Vitest fixture repository and affected-selection integration tests under `tests/fixtures/vitest-related/` and `tests/integration/vitest.test.ts`, including static related selection, config/package widening, JSON result capture, and LCOV output to an Ascout-owned path.
- [ ] T042 [P] [US2] Add Jest fixture repository and related-selection integration tests under `tests/fixtures/jest-related/` and `tests/integration/jest.test.ts`, including `--findRelatedTests`, JSON result capture, LCOV, and full-scope widening.
- [ ] T043 [P] [US2] Add exercise-intersection tests in `tests/unit/exercise.test.ts` for changed ranges, zero/nonzero counts, deleted/binary exclusions, untracked files, and mapping uncertainty.
- [ ] T044 [US2] Add post-run widening integration test in `tests/integration/widening.test.ts` proving at most one package/workspace widening pass occurs when narrowed verification produces no usable relationship for changed production code.

### Implementation

- [ ] T045 [US2] Implement strict line-only LCOV normalization in `src/coverage/lcov.ts`; malformed/unmappable data becomes explicit error/unresolved state rather than optimistic coverage.
- [ ] T046 [US2] Implement concrete Vitest integration in `src/tools/vitest.ts` using project-local native related/changed behavior, forced non-watch execution, machine-readable test results, and LCOV in the run directory.
- [ ] T047 [US2] Implement concrete Jest integration in `src/tools/jest.ts` using project-local `--findRelatedTests`, machine-readable test results, and LCOV in the run directory.
- [ ] T048 [US2] Implement pre-run conservative widening evaluation in `src/check.ts` for lockfile/dependency/package-manager/compiler/path-alias/test-runner/workspace/relevant non-source changes.
- [ ] T049 [US2] Implement the single bounded post-run widening pass in `src/check.ts`; never recurse into a custom impact engine.
- [ ] T050 [US2] Implement changed-line exercise intersection and summaries in `src/check.ts` using normalized LCOV; preserve `UNRESOLVED` separately and never label coverage as correctness.
- [ ] T051 [US2] Extend terminal/JSON receipts in `src/receipt/terminal.ts` and `src/receipt/json.ts` with changed/exercised/not-exercised/unresolved counts, path/range gaps, and widening facts.

**Checkpoint**: User Story 2 independently demonstrates Ascout's wedge over merely running tests.

---

## Phase 5: User Story 3 — Selection, Drift, and Flake Honesty (Priority: P1)

**Goal**: Fast selection remains auditable, source drift invalidates stable claims, and contradictory test observations are reported as flaky.

**Independent Test**: A fixture run exposes selected/deselected accounting, widening triggers, forced mid-run source drift, and a known flaky test with bounded targeted reruns.

### Tests first

- [ ] T052 [P] [US3] Add selection-account tests in `tests/unit/selection.test.ts` covering known/unknown selected counts, deselected counts, full/native modes, one widening pass, and limitations without a fabricated numeric confidence score.
- [ ] T053 [P] [US3] Add mid-run tracked-source mutation test in `tests/integration/drift.test.ts` proving start/end digest mismatch yields `TREE_DRIFTED`, unstable receipt, and exit `3` even when tasks otherwise pass.
- [ ] T054 [P] [US3] Add flaky-test fixture and targeted-rerun tests in `tests/integration/flaky.test.ts` covering one observation, reproducible repeated failure, contradictory observations, and unsupported exact-rerun fallback.
- [ ] T055 [US3] Add combined precedence test in `tests/integration/exit-precedence.test.ts` covering simultaneous findings/incomplete/drift/internal-error conditions.

### Implementation

- [ ] T056 [US3] Finalize selection accounting in `src/check.ts` so runner mode, selected/deselected/unknown totals, limitations, and widening triggers are carried into the receipt.
- [ ] T057 [US3] Add end-of-run source rehash and stability finalization in `src/check.ts`; never rewrite old evidence to match the end tree.
- [ ] T058 [US3] Implement runner-specific exact failing-test extraction/targeted rerun helpers inside `src/tools/vitest.ts` and `src/tools/jest.ts`; cap at two extra observations and do not rerun a whole suite merely to obtain a reproduction label.
- [ ] T059 [US3] Normalize flaky/reproduction observations in `src/receipt/model.ts` while keeping `introduced_by_change=unknown` unless future comparative evidence exists.

**Checkpoint**: User Story 3 proves the trust semantics that make affected verification safe to consume.

---

## Phase 6: User Story 4 — Test-Change Facts and Agent Receipt (Priority: P2)

**Goal**: Surface factual verification-asset changes and provide the same run truth in a bounded agent representation.

**Independent Test**: A diff with changed/deleted test/snapshot files appears in both human and machine receipts; agent output remains within budget and preserves material status/identity even when findings exceed the detail limit.

### Tests first

- [ ] T060 [P] [US4] Add factual test/snapshot classification tests in `tests/unit/test-changes.test.ts` for changed/deleted common Vitest/Jest test paths and tracked snapshots; do not add semantic weakening expectations.
- [ ] T061 [P] [US4] Add bounded agent-output tests in `tests/unit/agent-receipt.test.ts` proving <=16 KiB UTF-8 default, identity/status/gap preservation, priority ordering, and explicit omitted-detail counts.
- [ ] T062 [US4] Add cross-format consistency contract test in `tests/contract/receipt-consistency.test.ts` proving terminal summary, JSON, and agent output derive from one receipt model rather than recomputing conflicting truth.

### Implementation

- [ ] T063 [US4] Implement factual test/snapshot diff facts in `src/check.ts` using discovered/common test conventions and Git diff only; do not infer semantic weakening.
- [ ] T064 [US4] Implement bounded agent renderer in `src/receipt/agent.ts`, ranking `ERROR`/`FAIL`/`FLAKY`/exercise gaps first and preserving totals for omitted detail.
- [ ] T065 [US4] Wire `--format json` and `--format agent` in `src/cli.ts` while keeping one internal receipt source of truth.

**Checkpoint**: All four user stories are independently demonstrable.

---

## Phase 7: Founding Benchmark and Integrity Gates

**Purpose**: Validate Ascout's product claims against baselines before declaring M1 trustworthy.

- [ ] T066 Create `benchmarks/README.md` defining corpus acquisition, licensing/provenance rules, reproducibility, and the distinction between product tests and benchmark evidence.
- [ ] T067 Create `benchmarks/manifest.json` schema/content with exact upstream repository, commit, case construction, license, expected full-suite outcome, and local cache/path metadata; no benchmark repo is silently vendored.
- [ ] T068 [P] Add 5–6 reviewed JS/TS selection cases to `benchmarks/manifest.json` using real historical fix + regression-test history; each case MUST have objective full-suite ground truth.
- [ ] T069 [P] Add 3–4 reviewed gap cases to `benchmarks/manifest.json` using real production-code change with withheld regression-test change and independently established full-run coverage ground truth.
- [ ] T070 Implement benchmark harness under `benchmarks/harness/` to run full-suite/native-selector/Ascout comparisons without sharing current-run evidence across candidates.
- [ ] T071 Add benchmark metrics for selection recall, false-PASS, cold/warm time-to-signal, gap-detection accuracy, unresolved mapping rate, drift detection, deterministic receipt comparison, and flaky classification.
- [ ] T072 Add explicit benchmark assertions that cross-tree evidence leakage = 0 and binding-integrity violations = 0; these are absolute M1 release gates.
- [ ] T073 Publish every selector miss in a machine-readable benchmark report; do not encode an invented 98% threshold before corpus evidence exists.

**Checkpoint**: Benchmark measures Ascout's contribution and integrity, not merely Vitest/Jest quality.

---

## Phase 8: Cross-Platform Release Hardening

**Purpose**: Make the first local CLI releasable without expanding product scope.

- [ ] T074 Add GitHub Actions development CI under `.github/workflows/ci.yml` for Windows, macOS, Linux and supported Node LTS lines; this is project CI, not an M1 Ascout CI/SARIF user surface.
- [ ] T075 Add Windows-native process-tree termination and command-shim cases to CI; M1 release is blocked if timeout cleanup is only proven on POSIX.
- [ ] T076 Add deterministic receipt/golden serialization checks across OS path normalization boundaries.
- [ ] T077 Add package-content test ensuring npm publication contains only required runtime/dist/docs/license files and excludes `.ascout/`, fixtures not intended for package, local logs, and secrets.
- [ ] T078 Add `SECURITY.md` documenting trusted-local-repository scope, repo-command execution risk, local-first vs offline distinction, evidence artifact sensitivity, and responsible disclosure.
- [ ] T079 Add `CONTRIBUTING.md` documenting Spec Kit workflow, constitution gate, Ponytail/YAGNI expectations, no donor-code import without provenance, and test requirements.
- [ ] T080 Update `README.md` with the locked headline/subheadline, exact M1 truth claims, install/use once package identity is resolved, and a visible "what Ascout does not claim" section.
- [ ] T081 Perform exact-version license/provenance review for every runtime/dev dependency and update `THIRD_PARTY_NOTICES.md`; fail the release gate on unresolved license/use restrictions.
- [ ] T082 Verify npm package-name ownership/availability or choose a scoped package fallback without changing the `ascout` binary command.
- [ ] T083 Run the feature quickstart and all contract/integration/benchmark gates from a clean checkout; record release-candidate evidence without publishing a package yet.

---

## Dependencies & Execution Order

### Phase dependencies

- Phase 1 setup precedes all source implementation.
- Phase 2 trust/evidence primitives block all user-story implementation.
- US1 is the first runnable product slice.
- US2 and US3 depend on US1's run/task/receipt foundation; their pure parser fixtures can be developed in parallel after Phase 2.
- US4 depends on the receipt model but can proceed once US1 has stabilized it.
- Benchmark harness begins only after US2/US3 behavior exists; corpus review can start in parallel earlier.
- Release hardening follows all desired M1 user stories and integrity gates.

### Critical trust path

```text
T008–T024
  → T025–T039 (US1)
  → T040–T051 (exercise gap)
  → T052–T059 (selection/drift/flake)
  → T060–T065 (agent/test facts)
  → T066–T073 (benchmark)
  → T074–T083 (release hardening)
```

### Parallel opportunities

- Pure contract/parser/redaction tests in Phase 2 can run in parallel.
- Vitest and Jest fixtures/integrations can be implemented in parallel because they use separate concrete files.
- Selection corpus curation and gap corpus curation can run in parallel after the benchmark contract is fixed.
- Documentation/security/contribution work in release hardening can run in parallel with package-content testing.

## Implementation Strategy

### Smallest vertical slice

1. Setup.
2. Source identity/config/process/receipt primitives.
3. One real JS/TS fixture with source-bound typecheck/test receipt.
4. One Vitest affected-selection + LCOV exercise-gap path.
5. Drift + incomplete exit semantics.
6. Validate independently before adding Jest/basic pytest/agent output.

This ordering proves the wedge early without creating an architecture for every future tool.

### Stop conditions

Implementation MUST stop and return to plan review if any of the following becomes necessary:

- a second product runtime dependency beyond reviewed `cross-spawn`;
- a database/background daemon;
- a generic plugin SDK;
- a semantic dependency graph/index;
- automatic untrusted-repository execution;
- shell-string execution for repo commands;
- recursive widening beyond the single bounded second pass;
- an exit/report behavior that can hide materially unexecuted verification behind success.

Those are plan changes, not ordinary implementation details.
