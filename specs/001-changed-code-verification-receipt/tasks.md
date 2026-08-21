---
description: "Implementation tasks for Ascout changed-code verification receipt"
---

# Tasks: Changed-Code Verification Receipt

**Status**: Planning only. No implementation authorization.

## Phase 1 — Repository Setup

- [ ] T001 Create `package.json` with `ascout` bin, Node >=22, ESM, build/typecheck/test scripts, and only reviewed `cross-spawn` as planned product runtime dependency.
- [ ] T002 Create strict TypeScript 6 `tsconfig.json` for Node >=22.
- [ ] T003 [P] Add dev-only TypeScript/test tooling + lockfile; record exact licenses/provenance in `THIRD_PARTY_NOTICES.md`.
- [ ] T004 [P] Add `docs/legal/CODE_PROVENANCE.md`; preserve Apache-2.0 `LICENSE`.
- [ ] T005 Add `.gitignore` entries for `.ascout/`, dependencies/build/local coverage without hiding tracked snapshots/config.
- [ ] T006 Add inert `src/cli.ts` parsing for `init`, `doctor`, `check` and `--allow-changed-command-surface`; no task execution yet.
- [ ] T007 Add CLI smoke test proving startup requires no network/account/project config and agent integration does not implicitly set admission override.

## Phase 2 — Trust and Evidence Primitives

### Tests first

- [ ] T008 [P] Config v1 contract test: canonical fixed task keys exactly `typecheck`, `lint`, `test`, `pytestBasic`; arbitrary-key/prerequisite/workflow rejection, disable reason, argv override, timeout/budget/redaction; no persistent admission/trust setting.
- [ ] T009 [P] Receipt v1 contract test: config/receipt task identifier parity; fixed task/status/selection shapes; rename requires `previous_path`; `NOT_RUN`/`BLOCKED`/`ERROR` require non-empty reason code/text; exercise state/count/reason invariants; source stability/completeness; admission conditional invariants; exit precedence.
- [ ] T010 [P] Tree-digest golden tests: clean/staged/unstaged/deletion/symlink/mode/type, all nonignored untracked, `.ascout/` exclusion, tracked snapshot mutation.
- [ ] T011 [P] Git diff tests: add/modify/delete/rename/type/binary/untracked line semantics, including rename old/new path fidelity.
- [ ] T012 [P] Repository identity tests: HTTPS credentials, SSH/scp userinfo, query/fragment, fallback hash, local-only one-way canonical-path ID; raw origin/path never persisted.
- [ ] T013 [P] Process-control tests: argv preservation, no shell-string launch, capture caps, timeout/tree cleanup, Windows-native cases.
- [ ] T014 [P] Run-lock tests: live-owner refusal, verified dead-owner recovery.
- [ ] T015 [P] Redaction tests: secret env values in output and persisted argv, configured names, short-value protection, truncation.
- [ ] T016 [P] Command-admission unit tests: effective authority-path intersection, unchanged normal state, changed default refusal, explicit per-run override, no remembered admission.

### Implementation

- [ ] T017 Implement strict fixed-task config parsing/digest in `src/config.ts`; no workflow/prerequisite/admission grant in config.
- [ ] T018 Implement secret-safe remote identity + one-way local identity + HEAD/detached/shallow in `src/git.ts`.
- [ ] T019 Implement canonical `tree_digest_v1` in `src/git.ts` with index + unstaged type/mode/content + all nonignored untracked except `.ascout/`.
- [ ] T020 Implement zero-context tracked diff + nonignored untracked changed-file scope in `src/git.ts`.
- [ ] T021 Implement `cross-spawn` argv launch/capture/timeout/process-tree control in `src/process.ts`; no arbitrary `shell:true`.
- [ ] T022 Implement atomic `.ascout/run.lock` in `src/lock.ts`.
- [ ] T023 Implement output/argv redaction/truncation in `src/redact.ts`; raw secret argv transient only.
- [ ] T024 Implement run directory lifecycle + bounded retention (20 completed by default, active never removed).
- [ ] T025 Implement receipt model/exit decision in `src/receipt/model.ts`: run-bound evidence, weak fingerprints, admission state, strict task/selection/rename/exercise/reason invariants, separate stability/completeness.
- [ ] T026 Implement JSON renderer and validate emitted receipts against receipt v1.

## Phase 3 — US1 Source-Bound Receipt + Admission

### Tests first

- [ ] T027 [P] Discovery fixtures for packageManager/lockfile ambiguity, single/basic workspace, supported runner discovery.
- [ ] T028 [P] Command-provenance/admission integration test proving effective changed package/Ascout/TypeScript/ESLint/Vitest/Jest authority paths cause `NOT_RUN(command_surface_changed)` before process launch.
- [ ] T029 [P] Explicit admission test proving `--allow-changed-command-surface` permits only that invocation, receipt records override + paths, and next ordinary invocation refuses again.
- [ ] T030 [P] Agent-integration test proving generated instructions/hooks never append the admission override automatically.
- [ ] T031 [P] Missing-tool/config test proving honest `NOT_RUN` with non-empty reason code/text, without invented argv/tool, and no install execution.
- [ ] T032 [P] Task-status test distinguishing FAIL/ERROR/BLOCKED/N/A/NOT_RUN, requiring reasons for ERROR/BLOCKED/NOT_RUN, and preserving valid deselection accounting.
- [ ] T033 End-to-end check receipt test: secret-safe source, admission, comparison, config digest, tasks, artifacts, stability/completeness; incomplete cannot green.

### Implementation

- [ ] T034 Implement package-manager/project/tool discovery in `src/discovery.ts`; fixed semantic tasks only, ambiguity fails closed.
- [ ] T035 Implement TypeScript task in `src/tools/typescript.ts` using override → script → unambiguous local `tsc`.
- [ ] T036 Implement ESLint task in `src/tools/eslint.ts`; disclose changed-file vs broader project scope.
- [ ] T037 Implement basic pytest task in `src/tools/pytest.ts`; no Python affected/environment/coverage architecture.
- [ ] T038 Implement effective command-surface classification and changed-path intersection in `src/discovery.ts` for package scripts, Ascout overrides, and loaded compiler/lint/test configs.
- [ ] T039 Implement per-run admission decision in `src/check.ts`: default refuse affected task; explicit CLI override only; fixed tasks independent by default; BLOCKED only for genuine validity dependency.
- [ ] T040 Implement terminal receipt including source, task matrix, admission refusals/overrides, omissions, stability/completeness.
- [ ] T041 Wire `ascout check` + `--allow-changed-command-surface`; never persist the flag as trust and never green over admission-refused work or unresolved exercise proof.
- [ ] T042 Implement `ascout doctor` without verification execution; show command authority/config sources and changed surfaces.
- [ ] T043 Implement `ascout init`: minimal fixed-task config + `.ascout/` ignore only; no installs/hooks/admission grant.

## Phase 4 — US2 Changed-Code Exercise Gaps

### Tests first

- [ ] T044 [P] LCOV tests for zero/nonzero/repeated/malformed/path/executable/unresolved semantics.
- [ ] T045 [P] Vitest fixture/integration: native related selection, config widening, JSON results, LCOV in `.ascout/`.
- [ ] T046 [P] Jest fixture/integration: `--findRelatedTests`, JSON results, LCOV, widening.
- [ ] T047 [P] Exercise tests: `EXERCISED` count > 0, `NOT_EXERCISED` count = 0, `UNRESOLVED` count = null + non-empty reason, changed ranges, non-line exclusions.
- [ ] T048 Widening integration test: at most one post-run pass, unresolved gap if wider pass still insufficient.
- [ ] T049 Exercise-exit test: remaining material gap => stable exit 4, never 0, even when selected tests pass.

### Implementation

- [ ] T050 Implement strict line-only LCOV normalization in `src/coverage/lcov.ts`.
- [ ] T051 Implement concrete Vitest integration: project-local native selection, non-watch, machine result, LCOV.
- [ ] T052 Implement concrete Jest integration: project-local related selection, machine result, LCOV.
- [ ] T053 Implement pre-run conservative widening triggers.
- [ ] T054 Implement one bounded post-run widening pass; no recursion.
- [ ] T055 Implement changed executable exercise intersection with strict state/count/reason semantics; remaining gaps materially incomplete.
- [ ] T056 Extend terminal/JSON with exercise/widening/completeness exit 4.

## Phase 5 — US3 Selection, Drift, Flake

### Tests first

- [ ] T057 [P] Selection tests: strict scopes/passes, known/null counts + limitations, valid deselection not task NOT_RUN.
- [ ] T058 [P] Drift tests: tracked/included-untracked mutation, `.ascout/` exclusion, exit 3 precedence.
- [ ] T059 [P] Flake tests: one failure unknown, repeated true, contradictory flaky/false stable reproduction, rerun-error unknown.
- [ ] T060 Exit-precedence tests for simultaneous finding/gap/drift/internal error.

### Implementation

- [ ] T061 Finalize strict SelectionAccount in `src/check.ts`, max two passes.
- [ ] T062 Add end-source rehash/stability finalization; source stability orthogonal to task completeness.
- [ ] T063 Add exact failing-test targeted rerun helpers in Vitest/Jest modules; max two extra observations.
- [ ] T064 Normalize reproduction/flake semantics; `introduced_by_change=unknown` absent comparative proof.

## Phase 6 — US4 Test Facts + Agent Receipt

### Tests first

- [ ] T065 [P] Test/snapshot changed/deleted factual classification tests; no semantic weakening inference.
- [ ] T066 [P] Agent receipt <=16 KiB tests preserving identity/status/admission/gaps/completeness + omitted totals.
- [ ] T067 Cross-format consistency contract: terminal/JSON/agent derive from one model.

### Implementation

- [ ] T068 Implement factual test/snapshot diff facts.
- [ ] T069 Implement bounded agent renderer prioritizing errors/findings/admission refusals/exercise gaps.
- [ ] T070 Wire `--format json|agent` with one truth source.

## Phase 7 — Founding Benchmark

- [ ] T071 Define benchmark corpus acquisition/licensing/reproducibility in `benchmarks/README.md`.
- [ ] T072 Create exact-upstream/commit/case/license/ground-truth `benchmarks/manifest.json`.
- [ ] T073 [P] Add 5–6 reviewed historical selection cases.
- [ ] T074 [P] Add 3–4 reviewed historical gap cases with regression-test change withheld.
- [ ] T075 Implement isolated benchmark harness.
- [ ] T076 Add selection recall, false-PASS, cold/warm time, gap accuracy, unresolved rate, drift/determinism/flake metrics.
- [ ] T077 Add absolute assertions: cross-tree evidence leakage=0; binding-integrity violations=0.
- [ ] T078 Publish every selector miss; no invented pre-data recall threshold.

## Phase 8 — Cross-Platform Release Hardening

- [ ] T079 Add project CI Windows/macOS/Linux, Node 22/24; not an Ascout CI/SARIF user surface.
- [ ] T080 Add native Windows command-shim/process-tree timeout cases; release blocked without Windows proof.
- [ ] T081 Add deterministic receipt/golden checks across OS path normalization.
- [ ] T082 Add npm package-content test excluding `.ascout/`, unintended fixtures/logs/secrets.
- [ ] T083 Add `SECURITY.md` documenting trusted-local scope, command admission, repo-command risk, local-first vs offline, artifact sensitivity.
- [ ] T084 Add `CONTRIBUTING.md` for constitution/Spec Kit/Ponytail/provenance/test gates.
- [ ] T085 Update `README.md` with locked identity, M1 claims/non-claims, changed-command admission workflow, install once package identity resolves.
- [ ] T086 Perform exact-version dependency license/provenance review + `THIRD_PARTY_NOTICES.md`.
- [ ] T087 Verify npm package ownership or choose scoped fallback preserving `ascout` binary.
- [ ] T088 Run quickstart + all contract/integration/benchmark gates from clean checkout; record release-candidate evidence without publishing.

## Execution Order

```text
T001–T007 setup
→ T008–T026 trust/evidence
→ T027–T043 US1/admission
→ T044–T056 US2
→ T057–T064 US3
→ T065–T070 US4
→ T071–T078 benchmark
→ T079–T088 release hardening
```

## Smallest Vertical Slice

1. Inert CLI.
2. Source/config/process/receipt/admission primitives.
3. One source-bound task receipt with changed-command default refusal.
4. One Vitest related + LCOV exercise-gap path.
5. Gap exit 4 + drift semantics.
6. Validate before Jest/basic pytest/agent expansion.

## Stop Conditions

Return to planning if implementation requires a second product runtime dependency, DB/daemon, generic plugin SDK, semantic graph, arbitrary config workflow, automatic untrusted execution, shell-string commands, recursive widening, persistent changed-surface trust grant, automatic agent admission escalation, or an exit/report rule hiding task/exercise/admission gaps behind success.
