# Feature Specification: Changed-Code Verification Receipt

**Feature Branch**: `planning/000-ascout-foundation`  
**Feature ID**: `001-changed-code-verification-receipt`  
**Created**: 2026-08-21  
**Status**: Draft — planning only; implementation not authorized  
**Input**: Founding requirement: after an AI coding change, provide a source-bound receipt showing what verification actually exercised, what failed, and what was not verified.

## User Scenarios & Testing

### User Story 1 — Know whether the agent's change was actually checked (Priority: P1)

A developer has an AI coding agent make local changes in a repository. Before accepting the agent's claim that the work is done, the developer runs one Ascout check and receives a concise receipt that identifies the changed scope, the verification that ran, its outcomes, what did not run, and the exact source state observed.

**Why this priority**: This is the core product promise. Without an honest source-bound receipt, Ascout is only another task runner.

**Independent Test**: On a supported local repository with an uncommitted change and configured verification tasks, run Ascout once and verify that the receipt is bound to the observed source state, accounts for every applicable task, and never treats an unexecuted task as passed.

**Acceptance Scenarios**:

1. **Given** a trusted local repository with changed code and available verification tasks, **When** the developer runs a check, **Then** the receipt identifies the source state, changed scope, tasks that ran, their outcomes, and tasks that did not run with reasons.
2. **Given** an applicable task that cannot run because its tool is missing, **When** the check completes, **Then** the task is visibly reported as not run with an actionable reason and is not represented as passed.
3. **Given** a prerequisite task that fails, **When** downstream verification depends on it, **Then** the downstream task is reported as blocked rather than passed, failed, or silently omitted.
4. **Given** Ascout itself cannot execute or interpret a task reliably, **When** the check completes, **Then** the task is reported as an execution error distinct from a repository finding.

---

### User Story 2 — See which changed code no executed test exercised (Priority: P1)

A developer wants to know whether the tests that actually ran touched the changed executable code, not merely whether selected tests passed. The receipt distinguishes changed lines that were observed executing from changed lines that no executed test exercised.

**Why this priority**: This is Ascout's initial differentiator over simply running the project's existing test command.

**Independent Test**: Use a supported repository change containing both a changed executable path covered by an executed test and a changed executable path not covered by any executed test. Verify that the receipt reports each accurately and does not describe execution coverage as proof of correctness.

**Acceptance Scenarios**:

1. **Given** changed executable lines reached by an executed test, **When** the check finishes with usable coverage evidence, **Then** those changed lines are reported as exercised.
2. **Given** changed executable lines not reached by any executed test, **When** the check finishes, **Then** those changed lines are reported as not exercised even if every selected test passed.
3. **Given** coverage/source mapping cannot reliably resolve part of the changed code, **When** the receipt is produced, **Then** the uncertainty is surfaced rather than classified optimistically as exercised.
4. **Given** the selected verification yields no usable execution relationship for changed production code, **When** Ascout can safely widen verification, **Then** it widens scope and records that decision; otherwise the unresolved gap remains visible.

---

### User Story 3 — Trust selection, drift, failure, and flake semantics (Priority: P1)

A developer needs to know not only that some tests passed, but which tests were deliberately selected, which were deselected, whether the source tree changed while verification ran, and whether a failure was stable or showed nondeterminism.

**Why this priority**: The product loses trust if a fast affected run silently skips relevant work, if a run is bound to a tree that changed mid-run, or if a flaky failure is presented as deterministic.

**Independent Test**: Exercise a run with a narrowed test selection, a widening trigger, a source-tree mutation during execution, and a known flaky test case. Verify that selection accounting, widening, drift, and observation counts are represented without false certainty.

**Acceptance Scenarios**:

1. **Given** an affected selection chooses a subset of available tests, **When** the receipt is produced, **Then** selected and deselected counts and the selection mode are visible.
2. **Given** a change that makes affected selection uncertain under a declared widening rule, **When** Ascout plans verification, **Then** it widens scope and records the trigger.
3. **Given** the source state changes between the beginning and end of a run, **When** the receipt is finalized, **Then** the run is visibly marked drifted and is not represented as stable evidence for an unchanged tree.
4. **Given** a failing test can be rerun cheaply and produces contradictory observations, **When** the bounded retry policy completes, **Then** the task is reported as flaky with observation counts rather than as a stable failure.

---

### User Story 4 — Notice verification changes and consume the receipt from an agent (Priority: P2)

A developer wants Ascout to call attention to factual changes in the tests themselves and wants a coding agent to consume the same verification truth without receiving an unbounded wall of logs.

**Why this priority**: AI coding changes can alter tests as well as production code; agents also need compact machine-consumable verification without creating a separate truth source.

**Independent Test**: Use a change that modifies/deletes/disables detectable test material and request both human and agent-oriented output. Verify the same underlying run truth is presented, factual test-change signals are visible, and the agent representation is bounded.

**Acceptance Scenarios**:

1. **Given** test files are changed or deleted, **When** a receipt is produced, **Then** those factual changes are explicitly reported.
2. **Given** a supported detector can reliably identify a test being skipped/disabled or a tracked snapshot changing, **When** the receipt is produced, **Then** that fact is reported without labeling the test semantically weakened unless evidence supports that stronger claim.
3. **Given** an agent-oriented output mode, **When** the check completes, **Then** the agent receives a bounded summary containing source identity, task states, verification gaps, key factual test changes, and actionable finding identifiers from the same run evidence.

### Edge Cases

- Repository has no Git remote: the receipt must use a clearly local-only repository identity and must not imply cross-machine portability.
- Repository is detached or shallow: the state is explicit; unsupported base comparisons fail with guidance rather than silently changing semantics.
- Repository contains relevant untracked files: they are included in the default changed scope when they are source inputs.
- There are no changed executable lines: exercise coverage is not applicable rather than passed.
- No tests exist or no supported test runner is configured: this remains a visible non-run/gap state.
- A tool writes ignored coverage/cache output: those artifacts do not create false source drift when they are documented non-source outputs.
- A verification tool modifies a tracked source/config/snapshot file: the mutation remains visible as source drift.
- A command/config file changed in the same diff: Ascout warns before executing repository-authored commands derived from the changed command surface.
- Required dependencies are missing: Ascout does not install them implicitly.
- A task times out: it is an execution error or causes dependent work to become blocked, never a repository failure by inference.
- A second Ascout run starts while one is active: M1 refuses concurrent execution rather than queueing competing runs.
- Captured task output contains a value matching a recognized secret-bearing environment variable: the persisted representation redacts that value.
- Coverage exists but source-map resolution is ambiguous: the affected portion is reported as uncertain, not optimistically exercised.
- A finding remains at the same relative path/message across runs: a weak fingerprint may match it, but old evidence is never reused as current evidence.

## Clarifications

### Session 2026-08-21

- Q: Is v0.x expected to execute arbitrary third-party or untrusted PR repositories?  
  A: No. v0.x is explicitly limited to the developer's own trusted local repository.
- Q: Does local-first mean Ascout guarantees child processes/tests have no network access?  
  A: No. Core Ascout requires no account, upload, SaaS backend, cloud service, or model key; network isolation is not claimed unless later enforced and verified.
- Q: Does a finding inside changed lines prove the change introduced it?  
  A: No. Location and causation are separate; causal attribution remains unknown without comparative proof.
- Q: Does M1 require a universal confidence/proof ladder?  
  A: No. M1 records observations and evidence fields directly.
- Q: Is CI/SARIF part of this feature?  
  A: No. The initial user surface is the local developer/agent loop.
- Q: Must Ascout generate/fix tests or code in this feature?  
  A: No. M1 verifies and reports; it does not silently modify product source or auto-fix code.

No unresolved product-level clarification remains. Technical choices are deferred to the implementation plan.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide a single local check workflow that produces a verification receipt for the current changed source state.
- **FR-002**: Every completed or partially completed check MUST identify the repository and source state it observed.
- **FR-003**: The default interactive changed scope MUST account for working-tree changes, staged changes, and relevant untracked source inputs relative to the current committed state.
- **FR-004**: The system MUST detect whether the observed source state changed during verification and MUST visibly mark a drifted run.
- **FR-005**: Evidence produced by one run MUST NOT be presented as evidence for a different source state or run.
- **FR-006**: The system MAY expose versioned weak finding fingerprints for run-to-run matching, but MUST NOT treat such fingerprints as proof that old evidence remains valid.
- **FR-007**: Every executable verification task MUST record command provenance and the repository/config source from which the command was derived.
- **FR-008**: The system MUST warn before executing repository-authored commands when the current change modifies the command/config surface from which those commands are derived.
- **FR-009**: The system MUST NOT install project dependencies implicitly as part of verification.
- **FR-010**: An applicable task that does not execute MUST remain visible with a machine-readable reason and human-readable explanation.
- **FR-011**: Task result semantics MUST distinguish successful execution, repository/test failure, flaky outcome, upstream blocking, Ascout/task-execution error, non-applicability, and non-execution.
- **FR-012**: An execution/internal error MUST NOT be represented as a repository/test failure.
- **FR-013**: An upstream task failure MUST cause dependent work to be reported as blocked when that work cannot validly execute.
- **FR-014**: A passed result MUST only be used for a task that actually ran and completed successfully.
- **FR-015**: The system MUST prefer an affected verification scope when it can do so conservatively and MUST account for selected and deselected tests.
- **FR-016**: The system MUST expose the selection mode and any widening trigger used for the run.
- **FR-017**: When a declared uncertainty condition makes narrowed selection unsafe, the system MUST widen verification scope rather than silently preserve the narrower scope.
- **FR-018**: Deselected tests MUST NOT be represented as passed.
- **FR-019**: When usable execution coverage is available, the system MUST intersect that evidence with changed executable source lines.
- **FR-020**: The receipt MUST distinguish changed executable lines observed executing from changed executable lines not observed executing.
- **FR-021**: Coverage or source-resolution uncertainty MUST be surfaced explicitly and MUST NOT be silently counted as exercised.
- **FR-022**: Exercise coverage MUST NOT be described as proof that changed behavior is correct.
- **FR-023**: The system MUST report factual changes to test files and tracked snapshots where detectable from the changed source state.
- **FR-024**: The system MAY report reliable skip/disable/assertion-like syntactic changes, but MUST NOT label semantic weakening solely from syntactic counts.
- **FR-025**: For failing test/task outcomes where a targeted retry is supported and bounded, the system MUST preserve raw observation counts and distinguish contradictory observations as flaky.
- **FR-026**: Every executable task MUST have a bounded execution policy; timeout/internal execution failure MUST be represented honestly.
- **FR-027**: M1 MUST refuse competing concurrent Ascout checks instead of silently executing them against shared state.
- **FR-028**: Verification artifacts MUST be stored outside tracked product source by default, and tracked source mutations occurring during verification MUST remain detectable as drift.
- **FR-029**: Persisted task output MUST redact values of recognized secret-bearing environment variables.
- **FR-030**: The system MUST document what run artifacts it retains and MUST provide bounded retention/cleanup behavior.
- **FR-031**: The core verification path MUST require no Ascout account, repository upload, SaaS backend, cloud service, or model/API key.
- **FR-032**: The system MUST NOT claim network isolation/offline execution of child processes or tests unless such isolation is actually enforced and verified.
- **FR-033**: The feature MUST expose a concise human receipt and versioned machine-readable representation derived from the same run truth.
- **FR-034**: The feature MUST expose a bounded agent-oriented representation that preserves identity, task states, verification gaps, material test-change facts, and actionable finding references.
- **FR-035**: The system MUST support explicit configuration sufficient to correct discovery, disable work with a visible reason, define prerequisites, and bound task execution without becoming a general workflow language.
- **FR-036**: The feature MUST remain usable without AI reasoning; any future AI hypothesis MUST be distinguishable from execution evidence.

### Key Entities

- **Run**: One verification attempt bound to a repository/source/configuration state and containing task/evidence references plus stability state.
- **Source State**: Repository identity, committed state when available, observed changed-tree identity, and drift metadata.
- **Verification Task**: One applicable check with provenance, execution state, outcome, and reason when not executed.
- **Evidence**: Run-bound observation/artifact supporting a task outcome; never transferable as proof to another run.
- **Finding**: Normalized issue produced from current-run evidence, optionally carrying a weak versioned fingerprint for matching.
- **Selection Account**: How affected verification was selected or widened, including selected/deselected totals and triggers.
- **Exercise Gap**: Changed executable source that was not observed executing in the tests that actually ran, or whose coverage relationship is unresolved.
- **Test-Change Fact**: Factual change to verification assets such as test files, detected skip/disable state, or tracked snapshots; not an inference of semantic weakening.
- **Receipt**: Human or machine representation of the same run-bound verification truth.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of emitted receipts identify the source state/run to which their evidence belongs.
- **SC-002**: The founding benchmark records **zero cross-tree evidence leakage** and **zero source-binding integrity violations**.
- **SC-003**: 100% of applicable tasks known to the run appear either as an executed outcome or a visible non-execution/block/error state; no applicable task disappears silently.
- **SC-004**: In benchmark cases with known full-run coverage ground truth, the changed-line exercise-gap report does not claim exercise where the ground truth shows none; mapping uncertainty is counted separately rather than hidden.
- **SC-005**: For every affected-mode benchmark run, the receipt exposes selected/deselected accounting and any widening trigger, enabling an independent reviewer to reconstruct what was intentionally skipped.
- **SC-006**: A deliberate source mutation during verification is detected and causes the receipt to be marked unstable/drifted in every benchmark case designed for that condition.
- **SC-007**: Known-flaky benchmark cases with contradictory bounded observations are distinguishable from stable failures.
- **SC-008**: The human receipt communicates changed scope, task outcomes, non-run work, and exercise gaps without requiring inspection of raw logs.
- **SC-009**: The machine and agent representations preserve the same source identity and material result semantics as the human receipt.
- **SC-010**: The agent-oriented representation is bounded by a documented output budget and cannot grow without limit with raw task output.
- **SC-011**: M1 benchmark results publish selection recall, false-PASS rate, and cold/warm time-to-signal against declared baselines; no pre-data selection threshold is fabricated.

## Assumptions

- The developer intentionally runs Ascout only in their own trusted local repository for v0.x.
- Project dependencies required by the repository are installed by the developer, not by Ascout implicitly.
- The M1 first-class repository ecosystem is JavaScript/TypeScript with common package managers and Vitest/Jest where configured; basic configured pytest execution may be exposed without first-class Python affected/coverage semantics.
- Native Git/test-runner/coverage capabilities are preferred before any custom dependency graph.
- CI, untrusted-repository sandboxing, browser orchestration, security suites, mutation/property/fuzzing, performance/accessibility, semantic feature graphs, and AI reasoning are outside this feature.
