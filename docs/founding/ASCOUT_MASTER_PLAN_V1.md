# Ascout Master Plan v1

**Status:** FOUNDING CANDIDATE / READY FOR SPEC-KIT CANONICALIZATION  
**Repository:** `TheHalfMoon/Ascout`  
**Product:** Ascout  
**Identity:** **Ascout — Verify everything AI ships.**  
**Required subheadline:** **Know exactly what passed, failed, and was never checked.**

No product implementation is authorized by this document.

This document is the reconciled founding plan produced after:
- Master Plan v0;
- independent Claude adversarial review;
- independent GLM 5.3 reconciliation;
- final founder-side reconciliation.

It exists to seed GitHub Spec Kit. It is not itself the implementation plan.

---

## 1. Product thesis

AI coding systems can produce software faster than developers can confidently verify it.

Existing tools solve pieces of the problem:

- test runners execute known tests;
- compilers, linters, and static analyzers check defined properties;
- coverage tools show execution;
- affected-test systems reduce test scope;
- AI reviewers hypothesize defects;
- CI runs workflows after code leaves the local agent loop.

Ascout's job is narrower and more specific:

> **Ascout is the local verification receipt for AI-built software.**

After an AI coding change, Ascout determines:

- what changed;
- what verification actually ran;
- what passed;
- what failed;
- what was blocked or not run;
- what changed code no executed test exercised;
- whether tests themselves changed;
- and exactly which source state the evidence belongs to.

The product is not the number of scanners Ascout can invoke.

The product is an honest, source-bound verification receipt.

---

## 2. M1 product wedge

The smallest reason a developer should install Ascout after every AI coding session is:

> **Ascout tells you which parts of the change your verification actually exercised — and which parts nothing checked.**

M1 must make this daily loop materially better than manually running tests.

The core M1 output is evidence-backed changed-code verification coverage:

```text
CHANGED              14 files / 312 lines
EXERCISED             9 files / 204 changed lines
NOT EXERCISED         5 files / 108 changed lines

TESTS CHANGED         2 files
TESTS DELETED         0
TESTS DISABLED        1

TYPECHECK              PASS
LINT                   PASS
UNIT                   PASS
DESELECTED TESTS       340
TREE                    STABLE
```

The report must never convert absence of verification into a green claim.

---

## 3. Founding decisions

### FD-ASCOUT-001 — Trust boundary

Ascout v0.x operates only on the developer's **own trusted local repository**.

Out of scope for v0.x:

- arbitrary third-party repositories;
- untrusted pull-request branches;
- downloaded repositories whose command surface the user has not chosen to trust.

Supporting untrusted repositories requires a future separately authorized sandbox/admission design.

### FD-ASCOUT-002 — Product wedge

M1 is an **evidence-bound changed-code verification receipt**.

It must show:

- changed code;
- verification that ran;
- verification that did not run and why;
- changed code exercised by tests;
- changed code not exercised by tests;
- factual test-file changes;
- source identity for the evidence.

### FD-ASCOUT-003 — Local core

The core verification path requires:

- no Ascout account;
- no SaaS backend;
- no repository upload;
- no required cloud service;
- no model/API key.

Ascout may support optional hosted integrations later.

Ascout does **not** claim that child processes, tests, or external tools are offline unless network behavior is actually controlled and verified.

### FD-ASCOUT-004 — Evidence identity

Evidence is run-bound.

Evidence from one source tree never proves anything about another source tree.

Finding fingerprints are weak, versioned matching identifiers only; they are not evidence and are not guaranteed global identities.

### FD-ASCOUT-005 — Result honesty

M1 task statuses are:

- `PASS`
- `FAIL`
- `FLAKY`
- `BLOCKED`
- `ERROR`
- `NOT_APPLICABLE`
- `NOT_RUN(reason_code, reason_text)`

M1 has no universal proof ladder.

Location and causation are separate:

```text
in_changed_lines != introduced_by_change
```

`introduced_by_change` remains `unknown` unless actual comparative evidence supports causal attribution.

---

## 4. Constitutional principles

### P1 — Evidence before claims

Every material result must identify its producing task and evidence.

AI-generated hypotheses, if introduced in the future, are not evidence by themselves.

### P2 — No green by omission

Deselected, unavailable, disabled, budget-limited, blocked, or otherwise unexecuted verification must remain visible.

`PASS` means the task ran successfully.

It never means "nothing ran."

### P3 — Source-bound truth

Every run binds its evidence to the exact source state it observed.

Stale evidence must never silently become current evidence.

### P4 — Local-first without false offline claims

Ascout core requires no account, upload, SaaS control plane, or cloud model.

Ascout must distinguish this property from network behavior of executed repository code and third-party tools.

### P5 — Native capability first

Before implementing Ascout-specific logic, use proven native capabilities when available.

Examples:

- Git diff;
- Vitest changed/related testing;
- Jest related testing;
- native coverage formats;
- TypeScript project behavior;
- project/package-manager workspace metadata;
- tool-native incremental caches.

### P6 — Conservative affected verification

Reducing runtime is secondary to avoiding false confidence.

When scope cannot be narrowed safely, Ascout widens verification.

The skipped test count and selection mode are visible evidence, not hidden implementation details.

### P7 — Minimal core

M1 has:

- no daemon;
- no server;
- no graph database;
- no SQLite requirement;
- no Rust requirement;
- no public plugin SDK;
- no local LLM requirement;
- no cloud control plane.

New subsystems require demonstrated need.

### P8 — No implicit installation

Ascout never installs dependencies as a hidden part of verification.

Missing dependencies produce an honest `NOT_RUN` result with actionable guidance.

### P9 — Repository command provenance

Every executed task records where its command came from:

```text
authorized_by:
  user_config | repo_config | discovery
```

and records the relevant source path.

If the current change modifies the command surface Ascout intends to execute, Ascout warns before execution.

### P10 — Read-only product source by default

Ascout does not silently rewrite the user's source code.

Verification artifacts belong in Ascout-owned or tool-owned ignored paths.

If a verification tool modifies tracked source files, snapshots, or configuration, source drift must remain visible.

### P11 — Bounded execution

Every task has a timeout.

The overall check may have a configured budget.

A timeout is `ERROR(timeout)` or causes downstream work to become `BLOCKED`; it is never reported as a repository failure.

Concurrent Ascout runs are refused in M1 rather than queued.

### P12 — Evidence privacy

Stored output must be treated as potentially sensitive.

M1 must:

- ignore `.ascout/` from Git by default;
- redact values of recognized secret-bearing environment variables from captured output;
- document what artifacts are stored.

### P13 — License and provenance integrity

Code, rule sets, vulnerability databases, advisory data, and executable tools have separate licensing concerns.

Process isolation does not automatically solve:

- use restrictions;
- AGPL network-service obligations;
- data redistribution obligations;
- third-party nested licenses.

No donor code enters Ascout without exact provenance and component-level license review.

### P14 — Benchmark-driven expansion

Architecture expands when observed benchmark misses or operational limitations justify it.

Roadmap optionality does not justify abstractions in M1.

---

## 5. Scope

### M1 supported repository model

Primary first-class scope:

- local trusted Git repository;
- JavaScript/TypeScript;
- npm, pnpm, or yarn;
- single-package repositories;
- basic npm/pnpm/yarn workspaces;
- TypeScript;
- Vitest or Jest where configured.

Python M1 support is **basic only**:

- generic configured pytest execution;
- pass/fail/error reporting;
- no first-class affected selection;
- no testmon dependency model;
- no Python coverage-to-diff contract.

### Explicitly out of M1

- arbitrary untrusted repositories;
- Nx/Turborepo/Bazel-specific affected engines;
- deep monorepo semantics;
- CI as a first-class product surface;
- SARIF;
- Playwright/browser orchestration;
- security scanner suite;
- mutation testing;
- property testing;
- fuzzing;
- DAST;
- load testing;
- accessibility;
- performance;
- universal feature graph;
- semantic repository index;
- AI reasoning;
- code generation;
- automatic fixing.

---

## 6. M1 command surface

Only three primary commands:

```text
ascout init
ascout doctor
ascout check
```

### `ascout init`

Creates the minimum project-local Ascout configuration and ignored artifact structure.

It may install agent instructions.

Host-level automatic hooks that execute repository commands require explicit opt-in.

### `ascout doctor`

Explains what Ascout discovered and, equally important, what it cannot currently verify.

It reports:

- repository state;
- supported ecosystem;
- discovered tools;
- missing tools;
- configuration;
- command sources;
- coverage capability;
- selection capability;
- unsupported project characteristics.

### `ascout check`

Runs the evidence-bound verification receipt.

Future breadth uses flags rather than new verbs when possible:

```text
ascout check --scope=all
ascout check --base <ref>
ascout check --only <fingerprint>
ascout check --format json
ascout check --format agent
```

Flags may enter after the underlying semantics exist; this document does not require all flags on the first vertical slice.

---

## 7. Configuration

Ascout must have a small explicit configuration surface because discovery will not always be correct.

Configuration may specify:

- enabled verification tasks;
- disabled tasks with required reason;
- task commands or overrides;
- prerequisites;
- task budgets/timeouts;
- workspace scope;
- repository-specific widening rules where necessary.

Configuration must not become a workflow language in M1.

No arbitrary orchestration DSL.

---

## 8. Task and result model

### Verification task

A task is one concrete verification operation.

Examples:

- TypeScript compilation;
- lint;
- Vitest related test execution;
- Jest related test execution;
- basic pytest execution.

Each task records at least:

```text
task_id
task_type
authorized_by
source_path
command
tool
tool_version
start_time
end_time
status
reason_code
exit_code
cache_state
```

### Task statuses

`PASS`
: ran and completed without findings.

`FAIL`
: ran and produced repository/test findings.

`FLAKY`
: repeated observations produced inconsistent pass/fail outcomes.

`BLOCKED`
: not run because a required upstream task failed.

`ERROR`
: Ascout or the task execution failed in a way that says nothing reliable about repository correctness.

`NOT_APPLICABLE`
: task does not apply to the current scope.

`NOT_RUN`
: did not run; required reason code and reason text.

Initial reason codes may include:

```text
tool_missing
config_missing
budget_exceeded
disabled_by_config
deselected
no_tests
unsupported
```

Do not multiply top-level statuses when a reason code is sufficient.

---

## 9. Source identity

M1 source identity is a trust primitive.

### Repository identity

Preferred:

- normalized Git origin URL.

If no remote exists:

- a clearly labeled local-only repository identity derived from the canonical local repository path.

It must not be presented as portable identity across machines.

### HEAD

Record:

- commit SHA when available;
- detached-head flag;
- shallow-repository flag.

### Tree identity

Compute a digest over the source state Ascout intends to verify.

It includes:

- tracked index state;
- tracked working-tree state;
- untracked non-gitignored files.

It excludes only documented verification artifacts/caches that are not source-of-truth inputs.

Important:

- `.ascout/` may be excluded;
- untracked generated coverage/test-output directories may be excluded;
- **tracked snapshots or tracked generated files are not excluded merely because a tool may rewrite them.**

Any tracked-file mutation during verification must be visible as drift.

### Start/end drift

Compute the tree digest before and after verification.

If they differ:

```text
TREE_DRIFTED
```

The run must not be represented as stable evidence for either the original or final tree without qualification.

---

## 10. Evidence and finding identity

### Run identity

Run identity is unique and bound to:

- repository identity;
- HEAD;
- start tree digest;
- configuration digest;
- run time/nonce.

### Evidence ID

Evidence IDs are run-bound:

```text
(run_id, task_id, sequence)
```

Evidence never transfers between runs.

### Finding fingerprint

M1 may use a weak versioned fingerprint:

```text
fingerprint_v1 =
hash(task_identity, relative_path, normalized_message)
```

Properties:

- line numbers excluded;
- no structural hashing;
- may remain stable across edits that preserve path/task/message;
- not guaranteed across file moves;
- not guaranteed across tool message changes;
- never treated as proof of sameness.

A fingerprint can help compare runs.

It cannot carry old evidence into the new run.

---

## 11. Finding semantics

M1 has no universal confidence ladder.

Finding fields may include:

```text
tool
rule_or_task
message
path
line/range
severity
in_changed_lines
observations { runs, failures }
reproduced
determinism_class
introduced_by_change
fingerprint_version
fingerprint
evidence_ids
```

### Causation rule

`in_changed_lines: true` means only that the finding is located within changed source.

It does **not** mean the change caused the finding.

M1 default:

```text
introduced_by_change = unknown
```

Causal attribution requires future comparative evidence.

---

## 12. Changed-code verification

Default interactive behavior:

```text
worktree + staged + relevant untracked files
vs
HEAD
```

`--base <ref>` may later select a committed comparison range.

Every run prints the resolved comparison scope.

### Native selection

Use ecosystem-native selectors where appropriate:

- Vitest changed/related capabilities;
- Jest related-test selection.

No proprietary code graph is required in M1.

### Widening

Ascout must widen conservatively when selection confidence is reduced.

Initial widening triggers should cover at least:

- lockfile changes;
- dependency-field changes;
- package-manager configuration changes;
- TypeScript/compiler/path-alias configuration changes;
- test-runner configuration changes;
- relevant non-source data/config files;
- workspace-level configuration changes;
- changed production code for which the selected run yields no usable execution/coverage relationship.

Widening behavior must be testable.

### Selection accounting

The receipt records:

- selection mode;
- selected test count;
- deselected test count;
- widening triggers;
- full-scope fallback if used.

Deselected tests are not silently equivalent to passed tests.

---

## 13. Changed-code exercise coverage

This is the primary M1 differentiator.

Ascout intersects:

- changed executable source lines;
- execution coverage produced by the tests that actually ran.

The receipt shows:

- changed lines;
- exercised changed lines;
- unexercised changed lines;
- changed files with zero relevant execution.

Ascout must not claim that coverage proves correctness.

It proves only observed execution.

Coverage/source-map uncertainty must be reported rather than hidden.

---

## 14. Test-change facts

AI agents can weaken verification by editing tests.

M1 reports factual test-change signals.

Examples:

- test files changed;
- test files deleted;
- tests skipped/disabled where detectable;
- snapshots changed;
- assertion-like calls added/removed only if the detector can make the claim reliably.

Do not label a test "weakened" merely from syntactic assertion counts.

The product reports facts; semantic weakening inference is deferred.

---

## 15. Flakiness

A single failing observation is not automatically called "reproduced."

For tasks where targeted reruns are cheap and supported, Ascout may rerun the failing test/task to distinguish stable failure from observed nondeterminism.

Store:

```text
observations:
  runs
  failures
```

`FLAKY` requires contradictory observations.

Retry policy must remain bounded.

Do not multiply runtime blindly across every successful task.

---

## 16. Execution and degradation

M1 must handle its own failure honestly.

Required:

- per-task timeout;
- optional overall check budget;
- refusal of concurrent Ascout runs;
- cleanup/retention policy for run artifacts;
- `ERROR` distinct from repository `FAIL`;
- downstream `BLOCKED` when prerequisites fail.

Ascout must fail closed with respect to claims, not necessarily with respect to process exit.

---

## 17. Reporting

Required M1 surfaces:

### Human terminal receipt

Short, high-signal summary.

### Stable JSON

Versioned machine-readable schema.

### Agent format

Token-bounded, ranked, prose-minimal output for coding agents.

It should expose:

- identity;
- task states;
- verification gaps;
- changed-test facts;
- actionable finding fingerprints.

### Exit codes

The implementation plan must define distinct exit codes for at least:

- verification passed with no findings;
- repository/test findings exist;
- Ascout execution/internal error;
- unstable/drifted result where the caller must not treat the receipt as stable.

Exact numeric codes are deferred to Spec Kit technical planning.

SARIF is not M1.

---

## 18. Agent integration

The desired loop is:

```text
agent changes code
      ↓
ascout check
      ↓
receipt
      ↓
agent fixes
      ↓
ascout check
```

M1 agent integration should begin with explicit instructions/skills.

Automatic host-level hooks are opt-in because automation must not silently expand command authority.

The CLI remains the verification source of truth.

---

## 19. Donor policy

### TestSprite

Classification:

**DESIGN REFERENCE — NO SOURCE IMPORT IN FOUNDING PHASE**

Rationale:

- Ascout's product contract is different;
- TestSprite's public CLI is shaped around a cloud service;
- the small reusable CLI utilities are cheaper to own cleanly;
- avoiding source import keeps Ascout provenance simple.

Apache-2.0 legality is not the reason for rejecting source reuse.

### IntelliJ Platform

Classification:

**OPEN-SOURCE DESIGN REFERENCE / SELECTIVE COMPONENT REUSE ONLY AFTER COMPONENT-LEVEL AUDIT**

Do not treat IntelliJ Community as equivalent to proprietary JetBrains products.

Its semantic code-intelligence concepts remain important future references.

### Qodana and proprietary review products

Classification:

**DESIGN REFERENCE / OPTIONAL USER-CONFIGURED INTEGRATION LATER**

No proprietary implementation reconstruction.

### CodeQL

Classification:

**OPTIONAL LICENSE-GATED USER-CONFIGURED INTEGRATION ONLY**

Never auto-discover or auto-run CodeQL for arbitrary repositories.

Use is subject to current applicable GitHub licensing/entitlements.

### Other donors

Initial principles:

- Vitest/Jest → native execution/selection dependency.
- pytest → basic M1 execution; advanced selection later.
- tree-sitter/ast-grep → benchmark-gated future code intelligence.
- SCIP/Kythe → future architecture references.
- Playwright → later behavioral verification.
- Stryker → later mutation integration.
- Schemathesis/RESTler → later API/property/stateful verification.
- Trivy/Syft/Grype/Gitleaks → later security integrations.
- Semgrep/Opengrep → later, license/rule-source gated.
- ClusterFuzzLite → future fuzz/CI reference.
- DeepSeek Harness → design reference for agent/plugin/event architecture after exact-version provenance verification.

Every actual adoption requires fresh exact-version license verification.

---

## 20. Project license

Candidate canonical project license:

**Apache License 2.0**

This choice stands independently of TestSprite.

Reasons:

- suitable for developer infrastructure;
- explicit patent grant;
- permissive ecosystem compatibility.

Final adoption occurs during repository founding with a normal license/provenance review.

---

## 21. Benchmark

The benchmark must measure Ascout's contribution, not merely donor tools.

Keep it small.

### Part A — Selection corpus

Use a small set of real JS/TS repositories with real historical bug-fix + regression-test commits.

Construct cases where the full suite catches the regression.

Compare:

- full suite;
- plain project test command;
- native changed/related selection;
- Ascout selection.

Measure:

- selection recall relative to full suite;
- false-PASS rate;
- time-to-signal cold;
- time-to-signal warm.

### Part B — Verification-gap corpus

Construct a changed-code candidate from a real historical bug-fix commit while withholding the accompanying regression-test change.

This yields a real production-code diff for which the existing pre-change test suite may not exercise the changed behavior.

Measure:

- changed-line exercise-gap accuracy;
- source-map/coverage resolution loss;
- false claims of exercise.

### Integrity metrics

Absolute M1 gates:

```text
cross-tree evidence leakage = 0
binding-integrity violations = 0
```

Also measure:

- deterministic repeated receipts;
- drift detection;
- flaky classification on a small known-flaky corpus.

### No invented pre-data threshold

Do not freeze a 98% or other selection threshold before collecting corpus evidence.

Publish misses.

Use M1 evidence to set future M2 selection-hardening thresholds.

---

## 22. Roadmap

Roadmap categories do not authorize present architecture.

### M0 — Canonical specification

- constitution;
- product specification;
- trust model;
- source/evidence semantics;
- configuration contract;
- benchmark contract;
- donor/license policy;
- M1 technical plan.

### M1 — Changed-code verification receipt

Deliver the smallest daily-use product described in this document.

### M2 — Selection hardening and ecosystem expansion

Candidate work:

- first-class Python affected verification;
- stronger monorepo support;
- Nx/Turbo delegation;
- binary packaging if npm/Node distribution proves adoption friction;
- richer finding/run delta;
- trust/sandbox research for untrusted repositories;
- benchmark-driven targeted parsing when native selectors miss important relationships.

### M3 — Behavioral and broader verification

Candidates:

- Playwright/browser behavior;
- API/OpenAPI verification;
- CI/SARIF decision;
- selected security integrations.

### Long-term optional

Only after evidence supports them:

- mutation testing;
- property-based testing;
- fuzzing;
- stateful API testing;
- richer code-intelligence graph;
- accessibility;
- performance;
- optional AI reasoning.

No long-term item may distort M1 abstractions before it has a demonstrated use.

---

## 23. M1 exit condition

M1 is complete only when a developer can run:

```text
ascout check
```

after an AI coding change and receive a fast, source-bound receipt that:

1. identifies the exact source state;
2. shows the changed scope;
3. reports exactly which verification tasks ran;
4. reports what did not run and why;
5. reports selected and deselected test accounting;
6. shows which changed executable lines were exercised;
7. shows which changed executable lines were not exercised;
8. reports factual test-change signals;
9. distinguishes repository failures, flakes, blocked work, and Ascout errors;
10. detects source drift during the run;
11. emits stable terminal, JSON, and bounded-agent output;
12. passes the binding-integrity gates in the benchmark.

M1 does not need to prove universal correctness.

It must prove what it actually verified.

---

## 24. Non-negotiable public truth

The public identity is:

> # **Ascout — Verify everything AI ships.**
> ### **Know exactly what passed, failed, and was never checked.**

The headline is the mission.

The receipt is the technical contract.

Ascout must never report:

- "fully verified" when material work was not run;
- deselected tests as passed;
- `ERROR` as repository `FAIL`;
- old evidence as evidence for a new tree;
- changed-line location as causal attribution;
- network isolation it did not enforce;
- dangerous/untrusted-repository support it does not yet provide.

Trust is the product.

---

## 25. Spec Kit handoff

This document is the final founding input, not the final implementation plan.

The canonical development workflow is:

```text
Master Plan v1
      ↓
/speckit.constitution
      ↓
/speckit.specify
      ↓
/speckit.clarify
      ↓
Ponytail / YAGNI review
      ↓
/speckit.plan
      ↓
Ponytail plan-reduction review
      ↓
/speckit.tasks
      ↓
/speckit.checklist
      ↓
/speckit.analyze
      ↓
independent final plan audit
      ↓
implementation authorization
```

Ponytail is a complexity gate, not an architecture generator.

Spec Kit artifacts become canonical only after cross-artifact analysis passes.

**END ASCOUT MASTER PLAN v1**
