---
description: "Implementation tasks for Ascout changed-code verification receipt"
---

# Tasks: Changed-Code Verification Receipt

**Input**: canonical feature artifacts under `specs/001-changed-code-verification-receipt/`.

**Status**: Planning only. This file does not authorize implementation.

**Tests**: Required. Trust semantics, source binding, no-green-by-omission, exercise gaps, cross-platform process behavior, redaction, and contracts are not optional.

## Phase 1 — Repository Setup

- [ ] T001 Create `package.json` with `ascout` bin, Node `>=22`, ESM, build/typecheck/test scripts, and no product runtime dependency beyond the reviewed `cross-spawn` pin.
- [ ] T002 Create strict TypeScript 6 configuration in `tsconfig.json` for Node >=22.
- [ ] T003 [P] Add development-only TypeScript/test tooling and lockfile; record exact-version licenses/provenance in `THIRD_PARTY_NOTICES.md`.
- [ ] T004 [P] Add provenance policy in `docs/legal/CODE_PROVENANCE.md`; preserve Apache-2.0 `LICENSE`.
- [ ] T005 Update `.gitignore` for `.ascout/`, dependencies, build output, and local coverage without ignoring tracked snapshots/configuration.
- [ ] T006 Add inert `src/cli.ts` command parsing for `init`, `doctor`, `check` using `node:util.parseArgs`; no repository task execution yet.
- [ ] T007 Add `tests/integration/cli-help.test.ts` proving the compiled CLI starts without network/account/project config.

**Checkpoint**: inert single-package CLI foundation only.

## Phase 2 — Trust and Evidence Primitives

### Tests first

- [ ] T008 [P] Add `tests/contract/config-v1.test.ts` covering fixed task keys only (`typecheck`, `lint`, `test`, `pytestBasic`), arbitrary-key rejection, disable reason, argv-array override, timeout/budget/redaction bounds, and absence of user-defined prerequisites/workflow edges.
- [ ] T009 [P] Add `tests/contract/receipt-v1.test.ts` covering seven task statuses, non-executed task records with empty argv/null tool identity, strict fixed task types/selection-pass schema, source stability states, completeness states, and exit precedence `2 > 3 > 1 > 4 > 0`.
- [ ] T010 [P] Add `tests/unit/tree-digest.test.ts` golden vectors for clean/staged/unstaged/deletion/symlink/executable-bit/type changes, all non-gitignored untracked files, `.ascout/` exclusion, and tracked snapshot mutation.
- [ ] T011 [P] Add `tests/unit/git-diff.test.ts` for add/modify/delete/rename/type-change/binary/untracked whole-file line semantics.
- [ ] T012 [P] Add `tests/unit/repository-identity.test.ts` covering HTTPS credentials, SSH/scp userinfo, query/fragment removal, safe fallback hash, and local-only identity as a one-way canonical-path-derived ID; raw credential-bearing origins and raw absolute local paths MUST never appear in persisted/rendered identity.
- [ ] T013 [P] Add `tests/integration/process-control.test.ts` for argv preservation, no shell-string launch, capture caps, timeout, child-tree cleanup, and Windows-native cases.
- [ ] T014 [P] Add `tests/integration/run-lock.test.ts` for live-owner refusal and verified dead-owner recovery.
- [ ] T015 [P] Add `tests/unit/redact.test.ts` covering secret-bearing env values in stdout/stderr **and persisted/rendered argv**, user redaction names, empty/short-value protection, and truncation metadata.

### Implementation

- [ ] T016 Implement strict config parsing/validation and config digest in `src/config.ts`; fixed M1 task keys only, no prerequisite/workflow DSL.
- [ ] T017 Implement secret-safe repository identity plus HEAD/detached/shallow discovery in `src/git.ts`; remote identity strips unsafe material and local-only identity persists a one-way hash of canonical path, never the raw absolute path.
- [ ] T018 Implement canonical `tree_digest_v1` in `src/git.ts`, including index state, current unstaged type/mode/content, all non-gitignored untracked files except `.ascout/`, and length-prefixed framing.
- [ ] T019 Implement zero-context tracked diff + all non-gitignored untracked changed-file scope in `src/git.ts`; do not fabricate line semantics for binary/deleted-only inputs.
- [ ] T020 Implement cross-platform argv launch/capture/timeout/process-tree termination in `src/process.ts` with reviewed `cross-spawn` and no arbitrary `shell: true`.
- [ ] T021 Implement atomic `.ascout/run.lock` in `src/lock.ts`; refuse live concurrent runs, recover only verified dead-owner stale lock.
- [ ] T022 Implement redaction/truncation in `src/redact.ts`; raw secret-bearing argv may be used transiently for launch but MUST NOT be persisted/rendered.
- [ ] T023 Implement run directory lifecycle and bounded retention in the smallest appropriate module; keep 20 completed runs by default and never delete active run.
- [ ] T024 Implement single internal receipt model/exit decision in `src/receipt/model.ts`, including run-bound Evidence IDs, weak fingerprints, strict fixed task/selection contract, separate stability/completeness, and no fabricated fields for non-executed tasks.
- [ ] T025 Implement JSON renderer in `src/receipt/json.ts`; contract tests validate `receipt-v1.schema.json`.

**Checkpoint**: source/evidence primitives exist; no verification task is yet claimed successful.

## Phase 3 — US1 Source-Bound Verification Receipt

### Tests first

- [ ] T026 [P] [US1] Add `tests/integration/discovery.test.ts` fixtures for packageManager/lockfile evidence, ambiguity, single package, basic workspaces, and supported runner discovery.
- [ ] T027 [P] [US1] Add `tests/integration/command-provenance.test.ts` proving executed tasks record authority/source and changed command-surface warning appears before launch.
- [ ] T028 [P] [US1] Add `tests/integration/missing-tool.test.ts` proving `NOT_RUN(tool_missing/config_missing)` can be represented without invented argv/tool identity and no install command executes.
- [ ] T029 [P] [US1] Add `tests/integration/task-status.test.ts` distinguishing `FAIL`, `ERROR`, `BLOCKED`, `NOT_APPLICABLE`, `NOT_RUN`; valid affected deselection MUST NOT be modeled as task `NOT_RUN`.
- [ ] T030 [US1] Add end-to-end `tests/integration/check-receipt.test.ts` asserting secret-safe source identity, comparison scope, config digest, task matrix, artifacts, stability, completeness, and no clean exit when verification is materially incomplete.

### Implementation

- [ ] T031 [US1] Implement package-manager/project/tool discovery in `src/discovery.ts`; fixed semantic task categories only; conflicting signals fail closed.
- [ ] T032 [US1] Implement TypeScript task in `src/tools/typescript.ts`, preferring fixed-task override then project script then unambiguous local `tsc`.
- [ ] T033 [US1] Implement ESLint task in `src/tools/eslint.ts`; disclose changed-file vs project-script scope.
- [ ] T034 [US1] Implement basic pytest task in `src/tools/pytest.ts`; pass/fail/error only, no Python environment/affected/coverage system.
- [ ] T035 [US1] Implement internal prerequisite ordering/status propagation in `src/check.ts`; fixed task categories are independent by default and `BLOCKED` is used only for an actual validity dependency, never merely because typecheck/lint failed first.
- [ ] T036 [US1] Implement command-surface classification/warning in `src/discovery.ts` for Ascout/package/compiler/lint/test config sources.
- [ ] T037 [US1] Implement terminal receipt in `src/receipt/terminal.ts` with source identity, task matrix, omissions, stability, and completeness.
- [ ] T038 [US1] Wire `ascout check` in `src/cli.ts`; until exercise verification exists, changed executable code without resolved exercise proof MUST remain incomplete rather than return clean success.
- [ ] T039 [US1] Implement `ascout doctor` to report discovery/provenance/missing tools/selection/coverage/unsupported traits without executing verification.
- [ ] T040 [US1] Implement `ascout init` to create minimal fixed-task config and ensure `.ascout/` ignore entry only on explicit invocation; no installs/hooks.

**Checkpoint**: source-bound task receipt exists; exercise gaps may still keep it incomplete.

## Phase 4 — US2 Changed-Code Exercise Gaps

### Tests first

- [ ] T041 [P] [US2] Add `tests/unit/lcov.test.ts` for line records, repeated records, zero/nonzero counts, malformed input, path normalization, executable-line universe, and unresolved mapping.
- [ ] T042 [P] [US2] Add Vitest fixture/integration tests under `tests/fixtures/vitest-related/` and `tests/integration/vitest.test.ts` for native related selection, config widening, JSON results, and LCOV directed into `.ascout/`.
- [ ] T043 [P] [US2] Add Jest fixture/integration tests under `tests/fixtures/jest-related/` and `tests/integration/jest.test.ts` for `--findRelatedTests`, JSON results, LCOV, and widening.
- [ ] T044 [P] [US2] Add `tests/unit/exercise.test.ts` for `EXERCISED`, `NOT_EXERCISED`, `UNRESOLVED`, changed ranges, and non-line exclusions.
- [ ] T045 [US2] Add `tests/integration/widening.test.ts` proving at most one post-run widening pass and an unresolved gap if the wider pass still cannot establish relation.
- [ ] T046 [US2] Add `tests/integration/exercise-exit.test.ts` proving any remaining `NOT_EXERCISED`/`UNRESOLVED` changed executable line yields stable exit `4`, never `0`, even when selected tests pass.

### Implementation

- [ ] T047 [US2] Implement strict line-only LCOV normalization in `src/coverage/lcov.ts`; malformed/unmappable input becomes explicit error/unresolved state.
- [ ] T048 [US2] Implement concrete Vitest integration in `src/tools/vitest.ts` using project-local native related/changed behavior, non-watch execution, machine results, and LCOV in run directory.
- [ ] T049 [US2] Implement concrete Jest integration in `src/tools/jest.ts` using project-local `--findRelatedTests`, machine results, and LCOV in run directory.
- [ ] T050 [US2] Implement pre-run widening rules in `src/check.ts` for dependency/package-manager/compiler/path/test/workspace/non-source relation-risk surfaces.
- [ ] T051 [US2] Implement one bounded post-run widening pass; no recursive impact engine.
- [ ] T052 [US2] Implement changed executable-line exercise intersection in `src/check.ts`; preserve unresolved mapping and treat remaining exercise gaps as materially incomplete.
- [ ] T053 [US2] Extend terminal/JSON receipts with exercise counts/ranges, widening facts, and completeness/exit `4` for remaining gaps.

**Checkpoint**: Ascout's core wedge is independently demonstrable without a green result over unverified changed executable lines.

## Phase 5 — US3 Selection, Drift, Flake Honesty

### Tests first

- [ ] T054 [P] [US3] Add `tests/unit/selection.test.ts` for full/native modes, known/null counts, explicit limitations, strict scope/pass contract, and valid deselection accounting without task-level `NOT_RUN`.
- [ ] T055 [P] [US3] Add `tests/integration/drift.test.ts` for tracked mutation, included-untracked mutation, `.ascout/` artifact exclusion, and exit `3` when no higher-precedence integrity error exists.
- [ ] T056 [P] [US3] Add `tests/integration/flaky.test.ts` for one failure → `reproduced=unknown`, repeated failures → true, contradictory observations → `FLAKY`/false stable-failure reproduction, and rerun-error → unknown.
- [ ] T057 [US3] Add `tests/integration/exit-precedence.test.ts` covering simultaneous finding/gap/drift/internal-error conditions.

### Implementation

- [ ] T058 [US3] Finalize SelectionAccount in `src/check.ts` with strict repository/package scopes, count/null limitations, widening triggers, and at most two passes.
- [ ] T059 [US3] Add end-source rehash and stability finalization in `src/check.ts`; source stability remains orthogonal to task completeness.
- [ ] T060 [US3] Implement exact failing-test extraction/targeted rerun helpers inside concrete Vitest/Jest modules; at most two extra observations, no whole-suite retry just to label reproduction.
- [ ] T061 [US3] Normalize observation/reproduction/flake semantics in `src/receipt/model.ts`; keep `introduced_by_change=unknown` absent future comparative proof.

**Checkpoint**: selection/drift/reproduction semantics are independently testable and source-bound.

## Phase 6 — US4 Test-Change Facts and Agent Receipt

### Tests first

- [ ] T062 [P] [US4] Add `tests/unit/test-changes.test.ts` for changed/deleted test/snapshot paths; no semantic weakening inference.
- [ ] T063 [P] [US4] Add `tests/unit/agent-receipt.test.ts` proving <=16 KiB UTF-8 default and preservation of identity/status/gap/completeness when detail is omitted.
- [ ] T064 [US4] Add `tests/contract/receipt-consistency.test.ts` proving terminal/JSON/agent derive from one receipt model.

### Implementation

- [ ] T065 [US4] Implement factual test/snapshot diff facts in `src/check.ts` using Git/discovered conventions only.
- [ ] T066 [US4] Implement bounded agent renderer in `src/receipt/agent.ts`, prioritizing errors/findings/exercise gaps and explicit omitted-detail totals.
- [ ] T067 [US4] Wire `--format json|agent` in `src/cli.ts` with one internal receipt truth.

**Checkpoint**: all M1 user stories are independently demonstrable.

## Phase 7 — Founding Benchmark and Integrity Gates

- [ ] T068 Create `benchmarks/README.md` defining corpus acquisition/licensing/reproducibility and separation from product tests.
- [ ] T069 Create `benchmarks/manifest.json` with exact upstream repo/commit/case construction/license/ground truth; no silent vendoring.
- [ ] T070 [P] Add 5–6 reviewed JS/TS selection cases using historical fix + regression-test ground truth.
- [ ] T071 [P] Add 3–4 reviewed gap cases using production-code change with regression-test change withheld and independent full-run coverage ground truth.
- [ ] T072 Implement benchmark harness under `benchmarks/harness/` with isolated candidate evidence.
- [ ] T073 Add metrics: selection recall, false-PASS, cold/warm time, gap accuracy, unresolved rate, drift, deterministic receipt comparison, flake classification.
- [ ] T074 Add absolute assertions: cross-tree evidence leakage = 0; binding-integrity violations = 0.
- [ ] T075 Publish every selector miss; do not encode an invented pre-data recall threshold.

## Phase 8 — Cross-Platform Release Hardening

- [ ] T076 Add development CI `.github/workflows/ci.yml` for Windows/macOS/Linux and Node 22/24; this is project CI, not an Ascout CI/SARIF product surface.
- [ ] T077 Add native Windows command-shim/process-tree timeout cases; release blocked if only POSIX cleanup is proven.
- [ ] T078 Add deterministic receipt/golden serialization checks across OS path normalization.
- [ ] T079 Add npm package-content test excluding `.ascout/`, unintended fixtures/logs/secrets.
- [ ] T080 Add `SECURITY.md` documenting trusted-local scope, repo-command risk, local-first vs offline, and artifact sensitivity.
- [ ] T081 Add `CONTRIBUTING.md` documenting constitution/Spec Kit/Ponytail/provenance/test gates.
- [ ] T082 Update `README.md` with locked identity, exact M1 claims, installation once package identity resolves, and visible non-claims.
- [ ] T083 Perform exact-version license/provenance review for every runtime/dev dependency and update `THIRD_PARTY_NOTICES.md`; unresolved license/use restrictions block release.
- [ ] T084 Verify npm package-name ownership/availability or choose a scoped package fallback without changing the `ascout` binary command.
- [ ] T085 Run the feature quickstart and all contract/integration/benchmark gates from a clean checkout; record release-candidate evidence without publishing a package.

## Execution Order

```text
T001–T007 setup
  → T008–T025 trust/evidence foundation
  → T026–T040 US1
  → T041–T053 US2
  → T054–T061 US3
  → T062–T067 US4
  → T068–T075 benchmark
  → T076–T085 release hardening
```

Pure parser/contract tests may run in parallel where paths do not conflict. Concrete Vitest/Jest work may run in parallel after the foundation is stable. Corpus curation may begin before harness completion but cannot define product architecture.

## Smallest Vertical Slice

1. Package/inert CLI.
2. Source identity/config/process/receipt primitives.
3. One real source-bound typecheck/test receipt.
4. One Vitest related + LCOV exercise-gap path.
5. Stable gap exit `4` + drift semantics.
6. Validate before adding Jest/basic pytest/agent format.

## Stop Conditions

Implementation MUST stop and return to planning if it requires:

- a second product runtime dependency beyond reviewed `cross-spawn`;
- database/daemon;
- generic plugin SDK;
- semantic dependency graph/index;
- arbitrary config task names or user-defined prerequisite/workflow graph;
- automatic untrusted-repository execution;
- shell-string repo command execution;
- recursive widening beyond one second pass;
- an exit/report rule that can hide a material task or exercise gap behind success.
