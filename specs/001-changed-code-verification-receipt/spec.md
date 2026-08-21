# Feature Specification: Changed-Code Verification Receipt

**Feature Branch**: `planning/000-ascout-foundation`  
**Feature ID**: `001-changed-code-verification-receipt`  
**Created**: 2026-08-21  
**Status**: Draft — planning only; implementation not authorized  
**Input**: Founding requirement: after an AI coding change, provide a source-bound receipt showing what verification actually exercised, what failed, and what was not verified.

## User Scenarios & Testing

### User Story 1 — Know whether the agent's change was actually checked (Priority: P1)

A developer has an AI coding agent make local changes in a repository. Before accepting the agent's claim that the work is done, the developer runs one Ascout check and receives a concise receipt that identifies changed scope, verification that ran, outcomes, omissions, admission decisions, resolvable current-run evidence, and exact source state observed.

**Why this priority**: Without an honest source-bound receipt and a defensible command-execution boundary, Ascout is only another task runner that may execute whatever the agent just rewrote.

**Independent Test**: On a supported local repository with uncommitted changes and configured verification tasks, verify source binding, complete task accounting, evidence-reference integrity, canonical relative persisted paths, and refusal of repo-derived tasks whose effective command surface changed until the human explicitly admits that surface for this invocation.

**Acceptance Scenarios**:

1. **Given** a trusted local repository with changed code and unchanged effective command surfaces, **When** the developer runs a check, **Then** the receipt identifies source state, changed scope, tasks that ran, outcomes, and tasks that did not run with reasons.
2. **Given** an applicable task whose tool/configuration cannot be resolved, **When** the check completes, **Then** the task is visibly `NOT_RUN` with non-empty reason code/text and no fabricated executable/tool identity.
3. **Given** an internal prerequisite that genuinely prevents valid downstream execution, **When** the prerequisite fails, **Then** dependent work is `BLOCKED` with explicit reason code/text rather than silently omitted.
4. **Given** Ascout cannot execute or interpret a task reliably, **When** the check completes, **Then** `ERROR` is distinct from repository failure and carries explicit reason code/text.
5. **Given** a repository with a remote, **When** source identity is persisted/rendered, **Then** receipt identity uses `remote:<sha256>` derived from normalized credential-free remote identity and no raw origin/credentials/userinfo/query/fragment is written.
6. **Given** a repository without a remote, **When** source identity is persisted/rendered, **Then** receipt identity uses `local:<sha256>` derived from canonical real path, `portable=false`, and the raw absolute path is never written.
7. **Given** the current diff changes an effective command/config source a task would load or execute, **When** the developer runs ordinary `ascout check`, **Then** that task is refused as `NOT_RUN(command_surface_changed)`, changed authority paths are named, and the run cannot return clean success because of that omitted applicable task.
8. **Given** the same changed command surface, **When** the human explicitly supplies the per-invocation changed-surface admission, **Then** the task may execute and the receipt records that explicit admission and the changed authority paths.
9. **Given** an agent instruction/hook invokes Ascout, **When** command surface changed, **Then** the integration MUST NOT silently add the admission override on the user's behalf.
10. **Given** a task or finding exposes an `evidence_id`, **When** the receipt is emitted, **Then** the ID resolves to exactly one current-run evidence entry linked to the receipt run and a task in that receipt.
11. **Given** a changed file classified as a rename, **When** the receipt is emitted, **Then** both current `path` and `previous_path` are present.
12. **Given** any receipt path candidate is spelled as an absolute POSIX path, Windows drive/UNC path, URI-absolute value, contains a backslash, `.`/`..` segment, duplicate separator such as `src//file.ts`, or trailing separator such as `src/`, **When** receipt validation runs, **Then** the original candidate spelling is rejected before any lossy normalization/collapse/resolution and MUST NOT be repaired into a valid-looking path.

---

### User Story 2 — See which changed code no executed test exercised (Priority: P1)

A developer wants to know whether the tests that actually ran touched the changed executable code, not merely whether selected tests passed. The receipt distinguishes changed executable lines observed executing from lines not observed or not reliably mapped.

**Why this priority**: This is Ascout's initial differentiator over simply running the project's existing test command.

**Independent Test**: Use a supported change containing exercised, unexercised, and unmappable changed executable lines. Verify each state and that unresolved/unexercised material gaps prevent clean success.

**Acceptance Scenarios**:

1. Changed executable lines reached by executed tests are `EXERCISED` only with integer execution count > 0.
2. Lines not reached after permitted widening are `NOT_EXERCISED` with count 0 and prevent exit `0`.
3. Unreliable coverage/source mapping yields `UNRESOLVED` with null count + non-empty reason and prevents exit `0`.
4. Narrowed verification with no usable relationship may perform at most one declared widening pass; unresolved gaps remain visible.
5. All selected tests passing while material exercise gaps remain yields stable-but-incomplete semantics, not green.

---

### User Story 3 — Trust selection, drift, failure, and flake semantics (Priority: P1)

A developer needs to know which tests were deliberately selected/deselected, whether source changed while verification ran, and whether a failing test reproduced consistently.

**Independent Test**: Exercise narrowed selection, widening, mid-run source mutation, one failure without safe retry, and known flaky behavior.

**Acceptance Scenarios**:

1. Selected/deselected counts are shown when knowable; otherwise null/unknown is explicit with a limitation.
2. Declared uncertainty trigger causes widening when narrowing is unsafe.
3. Start/end source mismatch yields `tree_drifted` and no stable claim.
4. One failing observation without a safe second observation yields `reproduced=unknown`.
5. Contradictory valid observations yield `FLAKY` with raw counts.
6. Valid affected deselection is selection accounting, not task-level `NOT_RUN`; unsafe selection widens or becomes incomplete.

---

### User Story 4 — Notice verification-asset changes and consume the receipt from an agent (Priority: P2)

A developer wants factual test/snapshot changes and a bounded agent-readable representation of the same run truth.

**Acceptance Scenarios**:

1. Changed/deleted test files or tracked snapshots are reported factually.
2. No semantic weakening is inferred merely from syntactic counts.
3. Agent output preserves source identity, task states, exercise gaps, material test changes, current-run finding/evidence references, and changed-command admission state within its budget.
4. Persisted/rendered command argv redacts recognized secret-bearing environment values; raw argv is transient launch input only.

## Edge Cases

- No Git remote: persisted identity is `local:<sha256(canonical-real-path)>`, `portable=false`; raw absolute path is not persisted.
- Remote origin has credentials/userinfo/query/fragment: persisted identity is `remote:<sha256(normalized-credential-free-remote)>`; raw origin is never persisted.
- Any persisted repository path must be slash-separated and repository-relative; `artifact.relative_run_path` must be relative to the current run directory. Validation rejects the original candidate spelling before any lossy normalization: absolute POSIX, Windows drive/UNC, URI-absolute, backslash, `.`/`..` segments, duplicate separators such as `src//file.ts`, and trailing separators such as `src/` are invalid and are never repaired into canonical output.
- Detached/shallow repo: state explicit; unsupported comparison mode fails with guidance.
- All non-gitignored untracked files except `.ascout/` participate in source identity.
- No changed executable lines: exercise coverage is not applicable.
- No supported tests/config: visible non-run/gap state.
- `.ascout/` artifacts do not create source drift; other nonignored untracked files written during verification do.
- Tracked source/config/snapshot mutation creates drift.
- Executable-bit/type change with identical bytes still changes source identity.
- Rename requires both old and new path in the machine receipt.
- Changed `package.json` scripts, Ascout command override, or effective compiler/lint/Vitest/Jest/pytest config refuses affected task by default until explicit per-run admission.
- Missing dependencies are never installed implicitly.
- Task timeout is execution error/blocking, not repository failure by inference.
- Concurrent run is refused, not queued.
- Persisted output/argv redacts recognized secret-bearing env values.
- Ambiguous coverage remains `UNRESOLVED` with a reason.
- Weak fingerprint match never reuses old evidence.
- Dangling, duplicate, cross-run, cross-task, or unresolved evidence references invalidate the machine receipt before emission.

## Clarifications

### Session 2026-08-21

- Q: Arbitrary third-party/untrusted PR repos in v0.x?  
  A: No; developer's own trusted local repository only.
- Q: Does local-first mean child-process network isolation?  
  A: No; no required account/upload/SaaS/cloud/model, but no unproven network-isolation claim.
- Q: Does changed-line location prove causation?  
  A: No; `introduced_by_change` remains unknown without comparative proof.
- Q: Universal proof ladder?  
  A: No; direct evidence/observation fields only.
- Q: CI/SARIF or auto-fixing in M1?  
  A: No.
- Q: Arbitrary user-defined tasks/prerequisite graphs in config v1?  
  A: No; fixed semantic task categories only; internal ordering is product logic.
- Q: Can exit `0` coexist with material changed executable exercise gaps?  
  A: No.
- Q: Is a warning enough when the AI changed a command surface?  
  A: No. Affected task execution is refused by default and requires explicit human per-invocation admission. The admission cannot be persisted as a trust grant or silently supplied by agents/hooks.
- Q: Are JSON Schema field checks alone sufficient for a valid receipt?  
  A: No. M1 also requires semantic receipt validation for run/evidence/task/artifact references and cross-field stability/completeness/exit invariants before emission.
- Q: May receipt paths preserve arbitrary host-native absolute, traversal, duplicate-separator, or trailing-separator forms?  
  A: No. Persisted paths use one canonical slash-separated relative spelling in their repository/run namespace. The original receipt candidate is rejected before any lossy normalization if it is absolute, drive/UNC, URI-absolute, contains backslashes, `.`/`..` segments, duplicate separators, or a trailing separator; validation never repairs those spellings into canonical output.

No unresolved product-level clarification remains.

## Requirements

### Functional Requirements

- **FR-001**: Provide one local `check` workflow producing a receipt for current changed source state.
- **FR-002**: Every normal/partial receipt MUST identify repository/source state using only schema-enforceable privacy-safe IDs: remote as `remote:<sha256(normalized-credential-free-remote)>` with `portable=true`, local-only as `local:<sha256(canonical-real-path)>` with `portable=false`; raw origin credentials/location material and raw absolute local paths MUST NOT be persisted.
- **FR-003**: Default changed scope MUST account for staged, unstaged, and all non-gitignored untracked files except `.ascout/`, relative to HEAD.
- **FR-004**: Detect source change during verification and expose `stable | tree_drifted | unknown` honestly.
- **FR-005**: Evidence from one run MUST NOT become evidence for another source state/run.
- **FR-006**: Weak versioned fingerprints MAY match apparent findings across runs but MUST NOT transfer evidence.
- **FR-007**: Every executed task MUST record command provenance and effective authority/config source paths when known.
- **FR-008**: If current diff changes an effective command/config source a task would execute/load, ordinary check MUST refuse that task as `NOT_RUN(command_surface_changed)` and disclose changed authority paths. Execution MAY occur only after explicit human per-invocation admission, which MUST be recorded and MUST NOT be persisted/silently supplied by agent automation.
- **FR-009**: Project dependencies MUST NOT be installed implicitly.
- **FR-010**: Known applicable task categories that do not execute MUST remain visible with non-empty machine/human reasons; unresolved command/tool identity MUST NOT be fabricated. `BLOCKED` and `ERROR` also require explicit non-empty reasons.
- **FR-011**: Task semantics MUST distinguish `PASS`, `FAIL`, `FLAKY`, `BLOCKED`, `ERROR`, `NOT_APPLICABLE`, `NOT_RUN`.
- **FR-012**: `ERROR` MUST NOT be represented as repository/test `FAIL`.
- **FR-013**: Genuine failed internal prerequisites MUST cause dependent tasks that cannot validly execute to become `BLOCKED`; fixed task categories are otherwise independent by default.
- **FR-014**: `PASS` MUST only describe executed successful work.
- **FR-015**: Prefer conservative affected test selection when justified and disclose selection mode/counts when knowable.
- **FR-016**: Unknown selection counts MUST be explicit with a limitation; never guessed.
- **FR-017**: Declared uncertainty MUST widen scope rather than silently preserve unsafe narrowing.
- **FR-018**: Deselected tests MUST never be represented as passed; valid deselection is SelectionAccount data, not task `NOT_RUN`.
- **FR-019**: Usable execution coverage MUST be intersected with changed executable source lines.
- **FR-020**: Exercise state MUST distinguish and enforce: `EXERCISED` with integer count > 0; `NOT_EXERCISED` with count 0; `UNRESOLVED` with null count + non-empty reason.
- **FR-021**: Coverage/source uncertainty MUST remain `UNRESOLVED` and explain why mapping failed.
- **FR-022**: Exercise coverage MUST NOT be described as correctness proof.
- **FR-023**: Remaining material `NOT_EXERCISED`/`UNRESOLVED` changed executable lines after permitted widening MUST prevent exit `0`.
- **FR-024**: Report factual test-file/tracked-snapshot changes without inferring semantic weakening.
- **FR-025**: Failing test with fewer than two valid observations MUST have reproduction `unknown`; contradictory valid observations MUST be flaky.
- **FR-026**: Every executable task MUST have bounded execution; timeout/termination/internal failure MUST be honest error.
- **FR-027**: M1 MUST refuse concurrent checks instead of queueing them.
- **FR-028**: Verification artifacts MUST live outside tracked source by default; tracked or included nonignored mutations MUST remain detectable as drift.
- **FR-029**: Persisted task output and persisted/rendered argv MUST redact recognized secret-bearing environment values.
- **FR-030**: Artifact retention/output capture MUST be bounded/documented.
- **FR-031**: Core path MUST require no account, repository upload, SaaS backend, cloud service, or model/API key.
- **FR-032**: Do not claim child-process/test network isolation unless enforced/verified.
- **FR-033**: Human, versioned JSON, and bounded agent representations MUST derive from the same run truth.
- **FR-034**: Agent output MUST preserve identity, task states, exercise gaps, material test changes, admission state, and current-run finding/evidence references within documented budget.
- **FR-035**: Config v1 MUST be tracked non-executable JSON and only override fixed M1 task categories (`typecheck`, `lint`, `test`, `pytestBasic`), enable/disable reason, argv command, timeout/budget, and redaction names; no arbitrary task/prerequisite/workflow graph.
- **FR-036**: Internal prerequisites MAY order fixed product tasks only when actual validity requires it; they are not user-authored orchestration and typecheck/lint failure does not automatically block independent tests.
- **FR-037**: Source digest MUST include current worktree type/mode for unstaged tracked paths.
- **FR-038**: Feature MUST remain usable without AI reasoning; future AI hypotheses remain distinguishable from execution evidence.
- **FR-039**: Receipt v1 MUST contain a root current-run `evidence[]` collection; every task/finding evidence reference MUST resolve to exactly one evidence entry whose run/task linkage is valid, and any referenced artifact MUST resolve.
- **FR-040**: Before machine receipt emission, one Ascout-owned semantic validator MUST verify reference integrity plus cross-field source stability, task/admission, exercise, completeness, and exit-code invariants in addition to JSON Schema validation.
- **FR-041**: `change_kind=renamed` MUST include `previous_path`; non-rename changes MUST NOT fabricate a previous path.
- **FR-042**: Every persisted path-bearing receipt field MUST use exactly one canonical slash-separated relative spelling in its declared namespace (repository-relative for repository paths; current-run-relative for `artifact.relative_run_path`). Validation MUST inspect and reject the original receipt candidate before any lossy normalization, separator collapse, trailing-separator removal, or dot-segment resolution. POSIX absolute, Windows drive/UNC, URI-absolute, backslash, `.`/`..` segments, duplicate separators, and trailing separators MUST be rejected, never repaired into a canonical-looking path; namespace containment is checked only after raw-form rejection succeeds.

### Key Entities

- **Run**: One source-bound verification attempt.
- **Source State**: Privacy-safe repository ID, HEAD metadata, source-tree identity, drift state.
- **Verification Task**: One fixed semantic M1 task with provenance, changed-command admission state, and honest execution/non-execution state.
- **Evidence**: Current-run, digest-addressed observation linked to the receipt run/task and optionally an artifact.
- **Finding**: Current-run issue with optional weak fingerprint and resolvable evidence refs.
- **Selection Account**: Native/full selection, explicit counts/unknowns, limitations, widening.
- **Exercise Gap**: Changed executable line not observed executing or not reliably resolved.
- **Test-Change Fact**: Factual Git-derived verification-asset change.
- **Receipt**: Human/machine representation of same run truth with privacy-safe IDs and canonical relative persisted paths.

## Success Criteria

- **SC-001**: 100% of receipts use only `remote:<sha256>` or `local:<sha256>` repository IDs with correct portability flag; no raw credential-bearing origin or absolute local path is persisted.
- **SC-002**: Founding benchmark records zero cross-tree evidence leakage and zero source-binding integrity violations.
- **SC-003**: 100% of known applicable task categories appear as executed outcomes or visible non-execution/block/error states with required reasons.
- **SC-004**: Benchmark gap reporting never claims `EXERCISED` where full-run ground truth shows no execution.
- **SC-005**: Every affected-mode benchmark run exposes selection mode/widening and counts or explicit unknown limitations.
- **SC-006**: Deliberate tracked/included-untracked source mutation is detected as drift.
- **SC-007**: Known-flaky cases are distinguishable; single observations remain reproduction-unknown.
- **SC-008**: Human receipt communicates changed scope, task outcomes, admissions/omissions, and exercise gaps without raw logs.
- **SC-009**: Human/JSON/agent formats preserve same source identity/material semantics.
- **SC-010**: Agent output remains within documented byte budget.
- **SC-011**: M1 publishes selection recall, false-PASS, gap accuracy, unresolved mapping, cold/warm time against declared baselines without fabricated pre-data threshold.
- **SC-012**: No case with remaining material exercise gap returns exit `0`, including the benchmark gap corpus.
- **SC-013**: Every changed-command-surface test case, including configured/discovered pytest authority, is refused by default; execution only occurs when explicit per-run admission is supplied and recorded.
- **SC-014**: Machine receipt emission rejects dangling, duplicate, cross-run, cross-task, or unresolved evidence/artifact references and rejects cross-field summary/exit inconsistencies.
- **SC-015**: Machine receipt emission rejects every persisted noncanonical path spelling before lossy normalization can erase it, including absolute, drive/UNC, URI-absolute, backslash, traversal, duplicate-separator, and trailing-separator forms; valid repository/run paths are already canonical and relative before containment checks.

## Assumptions

- v0.x runs only in developer's own trusted local repository.
- Project dependencies are installed explicitly by developer.
- JS/TS first-class with npm/pnpm/yarn and Vitest/Jest; configured pytest is basic only.
- Git/runner/coverage native capabilities precede custom graph/index infrastructure.
- CI user surface, untrusted sandboxing, browser/security/adversarial suites, performance/accessibility, semantic graphs, and AI reasoning are outside this feature.