# Feature Specification: Changed-Code Verification Receipt

**Feature Branch**: `planning/000-ascout-foundation`  
**Feature ID**: `001-changed-code-verification-receipt`  
**Created**: 2026-08-21  
**Status**: Draft — planning only; implementation not authorized  
**Input**: Founding requirement: after an AI coding change, provide a source-bound receipt showing what verification actually exercised, what failed, and what was not verified.

## User Scenarios & Testing

### User Story 1 — Know whether the agent's change was actually checked (Priority: P1)

A developer has an AI coding agent make local changes in a repository. Before accepting the agent's claim that the work is done, the developer runs one Ascout check and receives a concise receipt that identifies the changed scope, verification that ran, outcomes, omissions, and exact source state observed.

**Why this priority**: Without an honest source-bound receipt, Ascout is only another task runner.

**Independent Test**: On a supported local repository with an uncommitted change and configured verification tasks, run Ascout once and verify that the receipt is source-bound, accounts for every applicable task, and never treats unexecuted work as passed.

**Acceptance Scenarios**:

1. **Given** a trusted local repository with changed code and available verification tasks, **When** the developer runs a check, **Then** the receipt identifies source state, changed scope, tasks that ran, outcomes, and tasks that did not run with reasons.
2. **Given** an applicable task whose tool or configuration cannot be resolved, **When** the check completes, **Then** the task is visibly `NOT_RUN` with an actionable reason and no fabricated executable/tool identity.
3. **Given** an internal prerequisite task that fails, **When** dependent verification cannot validly execute, **Then** downstream work is `BLOCKED` rather than passed, failed, or omitted.
4. **Given** Ascout itself cannot execute or interpret a task reliably, **When** the check completes, **Then** the task/run exposes `ERROR` semantics distinct from repository findings.
5. **Given** a configured remote origin containing credentials or URL userinfo, **When** source identity is persisted or rendered, **Then** the raw credential-bearing origin is never written to the receipt.

---

### User Story 2 — See which changed code no executed test exercised (Priority: P1)

A developer wants to know whether the tests that actually ran touched the changed executable code, not merely whether selected tests passed. The receipt distinguishes changed executable lines that were observed executing from lines that were not observed or could not be mapped reliably.

**Why this priority**: This is Ascout's initial differentiator over simply running the project's existing test command.

**Independent Test**: Use a supported repository change containing exercised, unexercised, and unmappable changed executable lines. Verify each state and verify that unresolved/unexercised material gaps prevent a clean success result.

**Acceptance Scenarios**:

1. **Given** changed executable lines reached by an executed test, **When** usable coverage evidence exists, **Then** those lines are `EXERCISED`.
2. **Given** changed executable lines not reached by any executed test after the allowed widening policy, **When** the check finishes, **Then** they are `NOT_EXERCISED` and the run cannot return clean exit `0`.
3. **Given** coverage/source mapping cannot reliably resolve changed executable lines, **When** the receipt is produced, **Then** those lines are `UNRESOLVED` and the run cannot return clean exit `0`.
4. **Given** narrowed verification produces no usable execution relationship for changed production code, **When** Ascout can safely widen, **Then** it performs at most one declared widening pass and records the trigger; otherwise the unresolved gap remains visible.
5. **Given** all selected tests pass but changed executable lines remain unexercised or unresolved, **When** the run is summarized, **Then** it is stable-but-incomplete rather than green.

---

### User Story 3 — Trust selection, drift, failure, and flake semantics (Priority: P1)

A developer needs to know which tests were deliberately selected, which were deselected, whether the source tree changed while verification ran, and whether a failing test reproduced consistently.

**Why this priority**: Fast affected verification is unsafe if scope, drift, or nondeterminism is hidden.

**Independent Test**: Exercise narrowed selection, a widening trigger, source mutation during execution, one failing test with no retry capability, and a known flaky test. Verify all states without false certainty.

**Acceptance Scenarios**:

1. **Given** an affected selection executes a subset of available tests, **When** the receipt is produced, **Then** selected/deselected counts are shown when knowable; otherwise the count is explicitly unknown with a limitation.
2. **Given** a declared uncertainty trigger, **When** narrowed selection is unsafe, **Then** Ascout widens and records the trigger.
3. **Given** the source state changes between start and end, **When** the receipt is finalized, **Then** stability is `tree_drifted` and the run is not represented as stable evidence.
4. **Given** a failing test with only one valid observation because safe targeted retry is unavailable, **When** the receipt is produced, **Then** `reproduced=unknown` rather than false certainty.
5. **Given** a failing test can be safely rerun and observations contradict, **When** the bounded retry policy completes, **Then** the task is `FLAKY` with raw observation counts.
6. **Given** tests were deselected by a valid disclosed affected-selection strategy, **When** completeness is computed, **Then** deselection is selection accounting rather than a fabricated task-level `NOT_RUN`; unsafe selection must widen or become incomplete instead.

---

### User Story 4 — Notice verification-asset changes and consume the receipt from an agent (Priority: P2)

A developer wants Ascout to call attention to factual test/snapshot changes and wants a coding agent to consume the same run truth without an unbounded wall of logs.

**Why this priority**: AI coding changes can alter verification assets; agents need compact machine-consumable evidence without creating a second truth source.

**Independent Test**: Use a change that modifies/deletes test or snapshot material and request human/JSON/agent output. Verify factual changes are visible, formats agree on material semantics, and agent output is bounded.

**Acceptance Scenarios**:

1. **Given** test files or tracked snapshots are changed/deleted, **When** a receipt is produced, **Then** those factual changes are reported.
2. **Given** no reliable semantic weakening detector exists, **When** test files change, **Then** Ascout does not infer that tests were weakened merely from syntax counts.
3. **Given** agent-oriented output, **When** the check completes, **Then** the agent receives a bounded summary preserving source identity, task states, exercise gaps, material test-change facts, and actionable current-run finding identifiers.
4. **Given** an executable command contains a value matching a recognized secret-bearing environment value, **When** command provenance is persisted/rendered, **Then** the stored/rendered argv is redacted while the raw argv exists only transiently for launch.

## Edge Cases

- Repository has no Git remote: use a clearly local-only repository identity; do not imply cross-machine portability.
- Remote origin contains credentials/userinfo/query/fragment: raw origin is never persisted.
- Repository is detached or shallow: state is explicit; unsupported comparison modes fail with guidance.
- All non-gitignored untracked files (except `.ascout/`) participate in M1 source identity; line-level exercise applicability is decided separately.
- There are no changed executable lines: exercise coverage is `NOT_APPLICABLE` rather than passed.
- No tests exist or no supported test runner is configured: this remains a visible task/gap state.
- A tool writes `.ascout/` artifacts: those Ascout-owned artifacts do not create source drift.
- A tool writes any other non-gitignored untracked file during verification: conservative M1 behavior is source drift.
- A verification tool modifies a tracked source/config/snapshot file: the mutation remains visible as source drift.
- An unstaged executable-bit/type change with identical file bytes still changes source identity.
- A command/config file changed in the same diff: Ascout warns before executing repo-derived commands from that surface.
- Required project dependencies are missing: Ascout never installs them implicitly.
- A task times out: it is an execution error or blocks dependent work, never a repository failure by inference.
- A second Ascout run starts while one is active: M1 refuses it rather than queueing.
- Persisted output/argv contains recognized secret-bearing environment values: values are redacted before persistence/rendering.
- Coverage/source mapping is ambiguous: affected lines are `UNRESOLVED`, not exercised.
- A weak finding fingerprint matches across runs: old evidence is never reused as current evidence.

## Clarifications

### Session 2026-08-21

- Q: Is v0.x expected to execute arbitrary third-party or untrusted PR repositories?  
  A: No. v0.x is limited to the developer's own trusted local repository.
- Q: Does local-first mean Ascout guarantees child processes/tests have no network access?  
  A: No. Core Ascout requires no account/upload/SaaS/cloud/model key; child-process network isolation is not claimed.
- Q: Does a finding inside changed lines prove the change introduced it?  
  A: No. Location and causation are separate; causal attribution remains unknown without comparative proof.
- Q: Does M1 require a universal confidence/proof ladder?  
  A: No. M1 records observations and evidence fields directly.
- Q: Is CI/SARIF part of this feature?  
  A: No. The initial user surface is the local developer/agent loop.
- Q: Must Ascout generate/fix tests or code in this feature?  
  A: No. M1 verifies and reports; it does not auto-fix product code.
- Q: Are arbitrary user-defined tasks/prerequisite graphs part of config v1?  
  A: No. Config v1 only overrides fixed M1 semantic task categories; task ordering is internal product logic, not a workflow DSL.
- Q: Can a run return exit `0` while changed executable lines remain `NOT_EXERCISED` or `UNRESOLVED`?  
  A: No. Such lines are material verification gaps and produce stable-but-incomplete semantics.

No unresolved product-level clarification remains. Technical choices are deferred to the implementation plan.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide one local `check` workflow that produces a verification receipt for the current changed source state.
- **FR-002**: Every normal/partial receipt MUST identify the repository and source state it observed without persisting credential-bearing raw remote URLs.
- **FR-003**: Default changed scope MUST account for staged, unstaged, and all non-gitignored untracked files except `.ascout/`, relative to HEAD.
- **FR-004**: The system MUST detect whether source state changed during verification and MUST expose `stable`, `tree_drifted`, or `unknown` stability honestly.
- **FR-005**: Evidence from one run MUST NOT be presented as evidence for another source state/run.
- **FR-006**: Weak versioned finding fingerprints MAY match apparent findings across runs but MUST NOT transfer evidence.
- **FR-007**: Every executable task MUST record command provenance and its repository/config source when one exists.
- **FR-008**: The system MUST warn before executing repository-authored commands when the current change modifies their command/config source.
- **FR-009**: The system MUST NOT install project dependencies implicitly.
- **FR-010**: Known applicable task categories that do not execute MUST remain visible with machine/human reasons; unresolved commands/tools MUST NOT be fabricated to satisfy output shape.
- **FR-011**: Task semantics MUST distinguish `PASS`, `FAIL`, `FLAKY`, `BLOCKED`, `ERROR`, `NOT_APPLICABLE`, and `NOT_RUN`.
- **FR-012**: `ERROR` MUST NOT be represented as repository/test `FAIL`.
- **FR-013**: Failed internal prerequisites MUST cause dependent tasks that cannot validly execute to become `BLOCKED`.
- **FR-014**: `PASS` MUST only describe executed successful work.
- **FR-015**: The system MUST prefer conservative affected test selection when justified and MUST disclose selection mode plus selected/deselected counts when knowable.
- **FR-016**: Unknown selection counts MUST be explicit through null/unknown accounting plus a limitation; they MUST NOT be guessed.
- **FR-017**: Declared uncertainty conditions MUST widen test scope rather than silently preserve unsafe narrowing.
- **FR-018**: Deselected tests MUST never be represented as passed; valid deselection is SelectionAccount data, not task-level `NOT_RUN`.
- **FR-019**: When usable execution coverage is available, the system MUST intersect it with changed executable source lines.
- **FR-020**: Exercise state MUST distinguish `EXERCISED`, `NOT_EXERCISED`, and `UNRESOLVED`.
- **FR-021**: Coverage/source-resolution uncertainty MUST remain `UNRESOLVED` and MUST NOT become optimistic exercise.
- **FR-022**: Exercise coverage MUST NOT be described as correctness proof.
- **FR-023**: Any remaining `NOT_EXERCISED` or `UNRESOLVED` changed executable line after permitted widening MUST prevent clean exit `0` and make verification materially incomplete.
- **FR-024**: The system MUST report factual test-file and tracked-snapshot changes detectable from Git state without inferring semantic weakening.
- **FR-025**: A failing test with fewer than two valid observations MUST have reproduction state `unknown`; contradictory valid observations MUST be flaky.
- **FR-026**: Every executable task MUST have bounded execution; timeout/termination/internal execution failures MUST be honest errors.
- **FR-027**: M1 MUST refuse competing concurrent checks instead of queueing them.
- **FR-028**: Verification artifacts MUST live outside tracked product source by default; tracked or non-gitignored source mutations during verification MUST remain detectable as drift.
- **FR-029**: Persisted task output and persisted/rendered argv MUST redact recognized secret-bearing environment values before storage/rendering.
- **FR-030**: Artifact retention/output capture MUST be bounded and documented.
- **FR-031**: The core path MUST require no Ascout account, repository upload, SaaS backend, cloud service, or model/API key.
- **FR-032**: Ascout MUST NOT claim child-process/test network isolation unless it is actually enforced and verified.
- **FR-033**: Human, versioned JSON, and bounded agent representations MUST derive from the same run truth.
- **FR-034**: Agent output MUST preserve identity, task states, exercise gaps, material test-change facts, and actionable current-run finding references within a documented budget.
- **FR-035**: Config v1 MUST be tracked, non-executable JSON and MUST only override fixed M1 task categories (`typecheck`, `lint`, `test`, `pytestBasic`), task enable/disable reason, command argv, timeouts/budget, and redaction names; it MUST NOT define arbitrary task names, prerequisite graphs, or a workflow DSL.
- **FR-036**: Internal task prerequisites MAY order fixed product tasks but MUST NOT be user-defined orchestration in M1.
- **FR-037**: Persisted repository identity MUST strip credential/userinfo/query/fragment material or fall back to a non-reversible identifier; raw credential-bearing origin text MUST NOT be written to receipts.
- **FR-038**: Source digest v1 MUST include current worktree type/mode for unstaged tracked paths so mode/type changes cannot disappear when bytes are unchanged.
- **FR-039**: The feature MUST remain usable without AI reasoning; future AI hypotheses MUST remain distinguishable from execution evidence.

### Key Entities

- **Run**: One source-bound verification attempt.
- **Source State**: Secret-safe repository identity, HEAD metadata, source-tree identity, and drift state.
- **Verification Task**: One fixed semantic M1 task with provenance and honest execution/non-execution state.
- **Evidence**: Current-run observation/artifact only.
- **Finding**: Current-run issue with optional weak matching fingerprint.
- **Selection Account**: Native/full selection, explicit counts/unknowns, limitations, and widening.
- **Exercise Gap**: Changed executable line that is not observed executing or cannot be resolved.
- **Test-Change Fact**: Factual Git-derived verification-asset change.
- **Receipt**: Human or machine rendering of the same run truth.

## Success Criteria

- **SC-001**: 100% of receipts identify the source/run to which evidence belongs without persisting credential-bearing raw origin URLs.
- **SC-002**: Founding benchmark records zero cross-tree evidence leakage and zero source-binding integrity violations.
- **SC-003**: 100% of known applicable task categories appear as executed outcomes or visible non-execution/block/error states.
- **SC-004**: Benchmark gap reporting never claims `EXERCISED` where full-run ground truth shows no execution; uncertainty remains separate.
- **SC-005**: Every affected-mode benchmark run exposes selection mode, widening triggers, and selected/deselected accounting or explicit unknown limitations.
- **SC-006**: Every deliberate tracked or included-untracked source mutation benchmark is detected as drift.
- **SC-007**: Known-flaky cases with contradictory bounded observations are distinguishable from stable failures; single observations remain reproduction-unknown.
- **SC-008**: Human receipt communicates changed scope, task outcomes, omissions, and exercise gaps without raw-log inspection.
- **SC-009**: Human/JSON/agent formats preserve the same source identity and material semantics.
- **SC-010**: Agent output remains within its documented byte budget.
- **SC-011**: M1 publishes selection recall, false-PASS, gap accuracy, unresolved mapping, and cold/warm time-to-signal against declared baselines without inventing a pre-data threshold.
- **SC-012**: No benchmark or integration case containing a remaining material exercise gap returns clean exit `0`.

## Assumptions

- v0.x runs only in the developer's own trusted local repository.
- Project dependencies are installed explicitly by the developer.
- JS/TS is first-class with npm/pnpm/yarn and Vitest/Jest; configured pytest is basic pass/fail/error only.
- Git/test-runner/coverage native capabilities are preferred before custom graph/index infrastructure.
- CI as a user surface, untrusted sandboxing, browser/security/adversarial suites, performance/accessibility, semantic graphs, and AI reasoning are outside this feature.
