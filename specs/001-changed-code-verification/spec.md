# Feature Specification: Changed-Code Verification Receipt

**Feature Branch**: `spec/000-ascout-foundation`

**Created**: 2026-08-21

**Status**: Draft

**Input**: User description: "Build Ascout's first local verification experience so a developer or coding agent can run one command after an AI-generated code change and receive an honest, source-bound receipt showing what changed, what verification ran, what passed or failed, what did not run and why, which changed code was exercised by tests, which changed code was not exercised, and whether tests themselves changed."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Verify an AI Coding Change (Priority: P1)

A developer finishes an AI-assisted coding change and asks Ascout to verify the current local
change. The developer receives one receipt that identifies the source state, summarizes the
changed scope, lists every verification activity that actually ran, and distinguishes successful
verification from failures, unavailable work, blocked work, and Ascout execution errors.

**Why this priority**: This is Ascout's core daily-use promise. Without a trustworthy one-command
receipt, the product is only another task runner.

**Independent Test**: Can be tested with a trusted local repository containing a known change and a
mix of passing, failing, unavailable, and blocked verification activities. A successful slice
produces a source-bound receipt without requiring any later roadmap capability.

**Acceptance Scenarios**:

1. **Given** a trusted local repository with changed code and available verification activities,
   **When** the developer requests verification, **Then** the receipt identifies the compared
   source state, the changed scope, each activity that ran, and its truthful outcome.
2. **Given** a verification activity cannot run, **When** verification completes, **Then** the
   receipt shows that activity as not run or blocked with an explicit reason rather than as passed.
3. **Given** Ascout itself cannot execute or interpret a verification activity reliably, **When**
   the run completes, **Then** the receipt reports an execution error that is distinct from a
   repository or test failure.
4. **Given** the source tree changes while verification is in progress, **When** the run finishes,
   **Then** the receipt is marked unstable/drifted and MUST NOT be presented as stable evidence for
   the original tree.

---

### User Story 2 - See What Nothing Verified (Priority: P1)

A developer wants to know whether the tests that actually ran exercised the changed executable
code. The receipt identifies changed executable lines observed during test execution and highlights
changed executable lines for which the run produced no reliable execution evidence.

**Why this priority**: This is the initial product differentiator. Existing pass/fail output cannot
tell the developer which parts of an AI-generated change escaped the verification that ran.

**Independent Test**: Can be tested with a change containing both test-exercised and deliberately
unexercised executable lines. The receipt must classify those lines correctly without claiming that
execution coverage proves correctness.

**Acceptance Scenarios**:

1. **Given** changed executable lines that are exercised by tests in the current run, **When** the
   receipt is produced, **Then** those lines are counted and identifiable as exercised.
2. **Given** changed executable lines that no executed test exercises, **When** the receipt is
   produced, **Then** those lines are counted and identifiable as not exercised.
3. **Given** execution evidence cannot be mapped confidently to some changed lines, **When** the
   receipt is produced, **Then** the uncertainty is reported explicitly rather than silently
   classifying the lines as exercised or verified.
4. **Given** tests are deliberately not selected for the run, **When** the receipt is produced,
   **Then** the deselected test count remains visible and is not represented as passed verification.

---

### User Story 3 - Notice Verification Changes (Priority: P2)

A developer reviewing an AI-generated change wants to know whether the change also modified the
verification surface itself. Ascout reports factual changes to tests and related verification
artifacts so the developer can inspect them before trusting a green result.

**Why this priority**: AI coding agents can change product code and tests in the same turn. A passing
suite is less informative when the verification was also modified, skipped, deleted, or replaced.

**Independent Test**: Can be tested using repository changes that add, modify, delete, disable, and
leave untouched test artifacts. The receipt reports only facts it can support and does not infer
semantic weakening from a simple syntactic count.

**Acceptance Scenarios**:

1. **Given** test files changed in the current source diff, **When** verification runs, **Then** the
   receipt reports which test files changed.
2. **Given** a detectable test was disabled, skipped, or deleted, **When** verification runs, **Then**
   the receipt reports that fact separately from test pass/fail results.
3. **Given** the system can only observe a syntactic assertion-count change, **When** the receipt is
   produced, **Then** it MAY report the factual count change but MUST NOT label the test as
   semantically weakened without stronger evidence.

---

### User Story 4 - Understand Verification Readiness (Priority: P2)

Before relying on a verification run, a developer can inspect what Ascout understands about the
repository: available verification capabilities, missing prerequisites, command sources, unsupported
conditions, and current scope limitations.

**Why this priority**: The receipt is trustworthy only if users can see the limits of the environment
before interpreting the result.

**Independent Test**: Can be tested on repositories with complete tooling, missing prerequisites,
unsupported layouts, and altered command surfaces. The readiness view must explain each case without
installing anything implicitly.

**Acceptance Scenarios**:

1. **Given** required verification prerequisites are present, **When** the developer inspects
   readiness, **Then** Ascout reports the available capabilities and where their commands came from.
2. **Given** a prerequisite is missing, **When** readiness is inspected, **Then** Ascout explains the
   missing capability and does not install it automatically.
3. **Given** the current change modifies a command source that Ascout would execute, **When**
   verification is requested, **Then** Ascout surfaces that command-surface change before execution.
4. **Given** a repository characteristic is outside M1 support, **When** readiness is inspected,
   **Then** the unsupported condition is explicit rather than silently ignored.

---

### User Story 5 - Feed a Bounded Receipt Back to an Agent (Priority: P3)

A coding agent can consume a compact machine-readable verification result after making a change,
without receiving an unbounded log dump or ambiguous success signal.

**Why this priority**: Ascout is intended to sit immediately after AI coding. Agent consumption
matters, but it is secondary to producing truthful evidence for a human developer.

**Independent Test**: Can be tested by requesting the agent-oriented output from runs with a pass,
a repository finding, a verification gap, and an Ascout execution error. Each result must remain
bounded, unambiguous, and linked to the same source-bound evidence as the human receipt.

**Acceptance Scenarios**:

1. **Given** a completed verification run, **When** an agent-oriented result is requested, **Then**
   the output contains the run identity, important task outcomes, verification gaps, and actionable
   finding identifiers within a bounded response.
2. **Given** Ascout encounters an internal/task execution error, **When** the agent-oriented result
   is produced, **Then** the agent can distinguish that error from a defect in the repository.
3. **Given** material work did not run, **When** the agent-oriented result is produced, **Then** the
   missing verification remains visible and cannot be interpreted as a full pass.

### Edge Cases

- The repository has no changed files.
- The repository contains staged, unstaged, and relevant untracked files at the same time.
- The repository has no remote identity or is on detached/shallow history.
- A test selector chooses zero tests for changed production code.
- The selected test run produces no usable execution evidence for changed production code.
- A project-wide configuration or dependency change makes narrow selection unsafe.
- A prerequisite activity fails and blocks later activities.
- A task exceeds its time budget.
- Two Ascout verification runs are requested concurrently.
- A failing test passes on a bounded retry, or repeated observations disagree.
- A verification tool modifies tracked files while the run is executing.
- The developer edits code while verification is still executing.
- Captured tool output contains values matching secret-bearing environment values.
- A verification activity is intentionally disabled by repository configuration.
- Source-to-execution mapping is partial or ambiguous.
- Tests change in the same diff as production code.
- The repository is not the developer's own trusted local repository.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Ascout MUST verify only the developer's own trusted local repository in v0.x and MUST
  state that arbitrary untrusted repositories and third-party PR branches are outside current scope.
- **FR-002**: Ascout MUST provide a one-command changed-code verification flow that produces one
  evidence-bound receipt for the current comparison scope.
- **FR-003**: The receipt MUST identify the repository/source state observed by the run and MUST
  distinguish stable source state from source drift during verification.
- **FR-004**: The default interactive comparison MUST include relevant staged, unstaged, and
  non-ignored untracked changes relative to the current committed state.
- **FR-005**: The receipt MUST enumerate each verification activity considered for the run and MUST
  distinguish `PASS`, `FAIL`, `FLAKY`, `BLOCKED`, `ERROR`, `NOT_APPLICABLE`, and reason-coded
  `NOT_RUN` outcomes.
- **FR-006**: `PASS` MUST be used only for a verification activity that actually ran and completed
  successfully.
- **FR-007**: Any verification activity that did not run MUST remain visible with an explicit reason;
  deselection MUST NOT be represented as success.
- **FR-008**: Repository/test findings MUST be distinguishable from Ascout or verification-execution
  errors.
- **FR-009**: When one verification activity prevents a dependent activity from running, the dependent
  activity MUST be reported as blocked rather than failed or passed.
- **FR-010**: Ascout MUST report the number of selected and deliberately deselected tests whenever
  changed-code test selection is used.
- **FR-011**: Ascout MUST widen verification when the current change or available evidence makes a
  narrowly selected run insufficiently trustworthy.
- **FR-012**: The receipt MUST disclose when and why verification scope widened.
- **FR-013**: Ascout MUST identify changed executable source lines for the current comparison scope.
- **FR-014**: Ascout MUST identify changed executable lines for which tests executed in the current
  run produced reliable execution evidence.
- **FR-015**: Ascout MUST identify changed executable lines for which the current run produced no
  reliable execution evidence.
- **FR-016**: Ascout MUST report ambiguity or loss in source-to-execution mapping rather than silently
  classifying uncertain lines as exercised.
- **FR-017**: Ascout MUST state that observed execution does not prove correctness.
- **FR-018**: Ascout MUST report factual changes to recognized test artifacts in the current diff.
- **FR-019**: Where reliably detectable, Ascout MUST report deleted, disabled, or skipped tests as
  factual verification-surface changes.
- **FR-020**: Ascout MUST NOT infer that a test was semantically weakened solely from assertion-count
  or similar shallow syntactic changes.
- **FR-021**: Every executed verification activity MUST expose its command provenance and relevant
  command source.
- **FR-022**: If the current change modifies the command surface Ascout intends to execute, Ascout
  MUST surface that fact before executing the changed command surface.
- **FR-023**: Ascout MUST NOT install missing project dependencies or verification tools implicitly.
- **FR-024**: Missing prerequisites MUST produce an explicit non-run/readiness result with actionable
  guidance.
- **FR-025**: Every verification activity MUST have bounded execution time.
- **FR-026**: M1 MUST refuse a concurrent Ascout run instead of silently executing overlapping runs.
- **FR-027**: A single failing observation MUST NOT be labeled reproduced unless the run obtains the
  additional observations required by the active reproduction policy.
- **FR-028**: Contradictory bounded pass/fail observations MUST be representable as flakiness.
- **FR-029**: Ascout MUST preserve raw observation counts for repeated failing/flaky activities.
- **FR-030**: Evidence from one run MUST NOT be presented as evidence for a later source tree.
- **FR-031**: Cross-run finding identifiers MAY support weak matching but MUST NOT be represented as
  globally stable identity or transferred proof.
- **FR-032**: `in_changed_lines` MUST remain a locational fact and MUST NOT be used as proof that a
  finding was introduced by the change.
- **FR-033**: Causal attribution to the current change MUST remain unknown unless comparative evidence
  actually establishes causation.
- **FR-034**: Ascout MUST provide a readiness view that reports discovered verification capabilities,
  missing prerequisites, command sources, and unsupported project conditions.
- **FR-035**: Ascout MUST provide a concise human receipt and a versioned machine-readable receipt for
  the same run.
- **FR-036**: Ascout MUST provide an agent-oriented result that is bounded in size and preserves the
  same truth semantics as the human/machine receipts.
- **FR-037**: Output capture MUST treat evidence as potentially sensitive and MUST redact recognized
  secret-bearing environment values from stored output.
- **FR-038**: Ascout-owned run artifacts MUST be kept outside normal source tracking by default and
  their retention behavior MUST be explicit.
- **FR-039**: The core verification flow MUST require no Ascout account, repository upload, SaaS
  control plane, or model/API key.
- **FR-040**: Ascout MUST NOT claim that repository code or child verification processes were offline
  unless their network behavior was actually controlled and verified.
- **FR-041**: Ascout MUST NOT silently modify product source as part of its own verification workflow.
- **FR-042**: If a verification tool modifies tracked source or tracked verification artifacts during
  a run, that mutation MUST be visible through source-drift semantics.
- **FR-043**: M1 MUST remain useful without AI reasoning, generated tests, a cloud backend, a semantic
  code graph, or a public plugin ecosystem.

### Key Entities

- **Verification Run**: One source-bound request to assess a local change; includes source identity,
  comparison scope, run state, and references to all task evidence.
- **Verification Task**: One verification activity considered by a run; includes provenance,
  execution state, outcome, and reason when not run.
- **Evidence**: Immutable run-bound observation produced by a verification task; never transferred as
  proof to another source tree.
- **Finding**: A normalized issue or condition supported by current-run evidence; may carry a weak
  cross-run fingerprint without inheriting old evidence.
- **Changed Scope**: The source changes against which the receipt is interpreted, including changed
  executable lines and recognized verification artifacts.
- **Exercise Gap**: Changed executable source for which the current run produced no reliable test
  execution evidence.
- **Verification-Surface Change**: A factual change to tests or related verification artifacts that
  may affect how a green result should be interpreted.
- **Receipt**: Human- or machine-consumable representation of the same run truth, including what ran,
  what did not, changed-code exercise evidence, gaps, and source stability.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In controlled identity tests, 100% of receipts are bound to the source state observed
  by their run and cross-tree evidence leakage is zero.
- **SC-002**: In controlled drift tests, 100% of source changes occurring during verification are
  surfaced as drifted/unstable rather than silently reported as stable evidence.
- **SC-003**: In acceptance fixtures, 100% of verification activities that do not run remain visible
  with an explicit reason and none are reported as passed.
- **SC-004**: In acceptance fixtures, repository/test failures and Ascout/task execution errors are
  distinguishable in both human and machine-readable receipts in every tested case.
- **SC-005**: In the verification-gap benchmark, Ascout reports changed executable lines not exercised
  by the tests that ran, and publishes any source-to-execution mapping loss rather than hiding it.
- **SC-006**: In the selection benchmark, Ascout publishes selection recall, false-pass rate, selected
  versus deselected test counts, and cold/warm time-to-signal against the declared baselines, with
  every benchmark miss documented.
- **SC-007**: M1 introduces no cross-tree evidence reuse and no binding-integrity violation in the
  benchmark corpus.
- **SC-008**: A user can determine from a single completed receipt what changed, what ran, what did
  not run, what failed, what was blocked, and what changed code lacked test execution evidence
  without opening raw tool logs.
- **SC-009**: A user can inspect readiness before relying on a run and identify missing prerequisites,
  unsupported conditions, and command provenance without Ascout installing anything implicitly.
- **SC-010**: Agent-oriented output remains bounded and preserves all safety-critical distinctions
  required to avoid interpreting an Ascout error or non-run activity as a successful verification.
- **SC-011**: M1's core workflow can be completed without an Ascout account, repository upload,
  required hosted service, or model/API key.

## Assumptions

- The user invokes Ascout only inside their own trusted local repository during v0.x.
- The repository already contains the dependencies and verification tooling the user wants Ascout to
  invoke; Ascout reports missing prerequisites rather than installing them.
- The first release intentionally covers a narrow set of repository/tooling patterns; unsupported
  ecosystems are reported honestly and expanded later from evidence rather than hidden behind a
  universal abstraction.
- Existing test execution and coverage information can demonstrate observed execution but cannot
  by itself prove behavioral correctness.
- Narrow changed-code selection is an optimization, not a right; Ascout may run broader verification
  when confidence in selection is insufficient.
- Automatic host-level agent hooks are optional future/opt-in behavior. The initial agent workflow
  can use explicit agent instructions that invoke the same CLI truth source.
- CI, untrusted-repository sandboxing, browser orchestration, security suites, mutation/property/fuzz
  testing, performance/accessibility auditing, semantic feature graphs, and AI reasoning are outside
  this feature's acceptance boundary.
