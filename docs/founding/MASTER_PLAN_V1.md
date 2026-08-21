# Ascout Master Plan v1

**Status:** Founding candidate; no product implementation authorized  
**Repository:** `TheHalfMoon/Ascout`  
**Identity:** **Ascout — Verify everything AI ships.**  
**Required subheadline:** **Know exactly what passed, failed, and was never checked.**

This is the reconciled founding input produced after Master Plan v0, an independent Claude adversarial review, an independent GLM 5.3 reconciliation, and final founder-side reconciliation. It seeds Spec Kit; it is not an implementation authorization.

## 1. Product thesis

Ascout is the local verification receipt for AI-built software. After an AI coding change it determines what changed, what verification actually ran, what passed or failed, what did not run and why, what changed code no executed test exercised, whether tests themselves changed, and which exact source state the evidence belongs to.

The product is not the number of scanners Ascout can invoke. The product is an honest source-bound verification receipt.

## 2. M1 product wedge

The smallest daily-use reason to install Ascout is:

> **Ascout tells you which parts of the change your verification actually exercised — and which parts nothing checked.**

The core receipt must make absence of verification visible rather than green.

## 3. Founding decisions

### FD-ASCOUT-001 — Trust boundary
v0.x operates only on the developer's own trusted local repository. Arbitrary third-party repositories and untrusted PR branches are out of scope pending a separately authorized sandbox/admission design.

### FD-ASCOUT-002 — M1 wedge
M1 is an evidence-bound changed-code verification receipt showing changed code, executed verification, non-executed verification with reasons, exercised and unexercised changed code, factual test changes, and source identity.

### FD-ASCOUT-003 — Local core
The core path requires no account, SaaS backend, repository upload, cloud service, or model/API key. Optional hosted integrations may exist later. Ascout does not claim subprocesses/tests are offline unless network behavior is actually controlled and verified.

### FD-ASCOUT-004 — Evidence identity
Evidence is run-bound and never transfers across source trees. Versioned weak finding fingerprints may assist matching but are not evidence.

### FD-ASCOUT-005 — Result honesty
M1 statuses are `PASS`, `FAIL`, `FLAKY`, `BLOCKED`, `ERROR`, `NOT_APPLICABLE`, and `NOT_RUN(reason_code, reason_text)`. M1 has no universal proof ladder. `in_changed_lines` is locational; `introduced_by_change` is causal and remains `unknown` without comparative proof.

## 4. Constitutional product rules

- Evidence before claims.
- No green by omission.
- Exact source/run binding and stale-evidence rejection.
- Local-first without false offline claims.
- Native capability before invention.
- Conservative widening when affected scope is uncertain.
- Minimal core; no speculative infrastructure.
- No implicit dependency installation.
- Command provenance and command-surface warnings.
- Read-only product source by default; tracked mutation remains visible as drift.
- Bounded execution, explicit `ERROR`/`BLOCKED`, and no concurrent-run queue in M1.
- Evidence privacy, `.ascout/` ignored by default, output redaction.
- Component/data/license provenance.
- Benchmark-gated expansion.

## 5. M1 supported scope

First-class:

- local trusted Git repositories;
- JavaScript/TypeScript;
- npm, pnpm, yarn;
- single-package repositories and basic npm/pnpm/yarn workspaces;
- TypeScript;
- Vitest or Jest where configured.

Python is basic only in M1: configured pytest execution and honest task outcome. No first-class Python affected selection, testmon model, or Python coverage-to-diff contract.

Explicitly outside M1:

- untrusted repository execution;
- deep monorepo/Nx/Turbo/Bazel semantics;
- CI/SARIF as a first-class surface;
- Playwright/browser orchestration;
- security-suite orchestration;
- mutation/property/fuzz/DAST/load testing;
- accessibility/performance verification;
- semantic repository/feature graph;
- AI reasoning/test generation/automatic fixing;
- daemon/server/control plane;
- Rust/SQLite/graph DB/public plugin SDK requirements.

## 6. M1 command surface

Only three primary commands:

```text
ascout init
ascout doctor
ascout check
```

Breadth should prefer flags (`--scope=all`, `--base`, `--only`, output formats) over new verbs when the underlying semantics are the same.

## 7. Configuration

Ascout needs a deliberately small escape hatch for discovery errors: enabled/disabled tasks, required reason for suppression, task command overrides, prerequisites, budgets/timeouts, workspace scope, and narrowly justified widening rules. M1 does not create an orchestration DSL.

## 8. Task/result model

Every executable task records identity, type, command provenance/source, command, tool/version, timing, status, reason code, exit code, and relevant cache state.

`PASS` means it ran successfully. `ERROR` says nothing reliable about repository correctness. `BLOCKED` identifies prerequisite failure. `NOT_RUN` always carries a machine reason code and human reason text.

## 9. Source identity

Preferred repository identity is normalized Git origin. Without a remote, use a clearly labeled local-only identity derived from the canonical local repository path; never claim cross-machine portability.

Record HEAD plus detached/shallow flags. Tree identity covers tracked index/worktree state plus untracked non-gitignored source inputs. Exclude only documented verification artifacts/caches that are not source-of-truth inputs. Tracked snapshots/generated files are not excluded merely because a tool might rewrite them.

Hash at run start and end. A difference yields `TREE_DRIFTED` and the receipt cannot be represented as stable evidence without qualification.

## 10. Evidence and finding identity

A run is uniquely bound to repository identity, HEAD, start tree identity, configuration identity, and run uniqueness. Evidence IDs are run-bound `(run_id, task_id, sequence)`.

A weak `fingerprint_v1` may hash task/rule identity, relative path, and normalized message. It excludes line numbers and has no structural hashing in M1. It may fail across moves/tool-message changes and is never a cross-tree proof key.

## 11. Finding semantics

M1 uses fields rather than a confidence ladder: producer, rule/task, message, location, severity, `in_changed_lines`, observations, reproducibility, determinism class, `introduced_by_change`, fingerprint, and evidence references.

`introduced_by_change` defaults to `unknown` in M1 unless actual comparative evidence supports causation.

## 12. Affected verification

Default interactive comparison is worktree + staged + relevant untracked files versus HEAD. Native selector capabilities are preferred (Vitest/Jest related/changed semantics). No proprietary dependency graph is required in M1.

Conservative widening triggers include dependency/lockfile/package-manager changes, compiler/path aliases, test-runner configuration, workspace configuration, relevant non-source inputs, and production changes with no usable execution relationship after selected verification.

Every receipt records selection mode, selected/deselected counts, and widening triggers. Deselected is never passed.

## 13. Changed-code exercise coverage

Intersect changed executable source lines with coverage from the tests that actually ran. Report changed, exercised changed, unexercised changed, and changed files with zero relevant execution. Coverage is proof of observed execution only, never proof of correctness. Source-map/coverage uncertainty stays visible.

## 14. Test-change facts

Report factual signals such as test files changed/deleted, detectable test skip/disable changes, and tracked snapshot changes. Assertion-like counts may be shown only when reliable and must not be labeled semantic weakening merely from syntax.

## 15. Flakiness

A single failing observation is not automatically called reproduced. Targeted reruns may be used when cheap/supported. Store `{runs, failures}`. `FLAKY` requires contradictory observations. Retries are bounded and failures do not cause blanket reruns of successful tasks.

## 16. Execution/degradation

M1 includes per-task timeouts, an optional overall budget, explicit artifact retention/cleanup, refusal of concurrent Ascout runs, distinct internal/task `ERROR`, and downstream `BLOCKED` semantics. Claims fail closed even when the process can continue.

## 17. Reporting

M1 surfaces:

- short terminal verification receipt;
- stable versioned JSON;
- token-bounded agent format.

The implementation plan must define distinct exit semantics for clean verification, repository findings, Ascout/internal error, and unstable/drifted evidence. SARIF is not M1.

## 18. Agent integration

Start with explicit agent instructions/skills. Automatic host-level hooks are opt-in because automation must not silently expand repository-command authority. The CLI remains the verification source of truth.

## 19. Donor policy

- TestSprite: design reference, no source import in founding phase.
- IntelliJ Community: open-source design reference/selective component reuse only after component audit; do not conflate with proprietary JetBrains products.
- Qodana/commercial reviewers: design reference or optional future user-configured integration.
- CodeQL: optional license-gated user-configured integration only; never an automatic default for arbitrary repositories.
- Vitest/Jest: native selection/execution capabilities.
- pytest: basic M1 execution; advanced selection later.
- tree-sitter/ast-grep: benchmark-gated future code intelligence.
- SCIP/Kythe: future architecture references.
- Playwright/Stryker/Schemathesis/RESTler/security scanners: later candidates, never present-shaping assumptions.

Every actual adoption requires fresh exact-version/component license and provenance review.

## 20. Project license

Founding candidate: **Apache License 2.0**, independently of TestSprite reuse. Final adoption occurs in the founding PR after normal provenance/license review.

## 21. Benchmark

The benchmark measures Ascout's claims rather than donor-tool detection quality.

Part A uses a small real-history JS/TS corpus built from bug-fix + regression-test commits and compares full suite, plain project test command, native related selection, and Ascout. Measure selection recall, false-PASS rate, and cold/warm time-to-signal.

Part B constructs real changed-production-code candidates while withholding accompanying regression-test changes and measures changed-line exercise-gap accuracy, coverage resolution loss, and false claims of exercise.

Absolute M1 gates:

```text
cross-tree evidence leakage = 0
binding-integrity violations = 0
```

Do not invent a pre-data 98% threshold. Publish misses and use M1 evidence to set M2 hardening thresholds.

## 22. Roadmap

M0: canonical constitution/spec/trust/evidence/config/benchmark/donor policy and technical plan.  
M1: changed-code verification receipt.  
M2 candidates: first-class Python affected verification, stronger monorepo delegation, distribution binaries if needed, richer run delta, untrusted-repository research, benchmark-driven targeted parsing.  
M3 candidates: Playwright/browser behavior, API/OpenAPI, CI/SARIF decision, selected security integrations.  
Long-term optional: mutation, property testing, fuzzing, stateful API testing, richer code intelligence, accessibility, performance, optional AI reasoning.

Roadmap items confer no present architectural requirements.

## 23. M1 exit condition

A developer runs `ascout check` after an AI coding change and receives a fast source-bound receipt that identifies source state and changed scope, accounts for every applicable verification task and selected/deselected tests, exposes exercised/unexercised changed lines, reports factual test changes, distinguishes failure/flake/block/error/non-run, detects source drift, emits terminal/JSON/agent output, and passes the binding-integrity gates.

M1 does not need to prove universal correctness. It must prove what it actually verified.

## 24. Non-negotiable public truth

> **Ascout — Verify everything AI ships.**  
> **Know exactly what passed, failed, and was never checked.**

The headline is the mission. The receipt is the technical contract.

Never report full verification when material work did not run; deselected as passed; `ERROR` as repository `FAIL`; old evidence for a new tree; changed-line location as causation; network isolation not enforced; or untrusted-repository safety not implemented.

## 25. Spec Kit handoff

Canonical sequence:

```text
Master Plan v1
  → constitution
  → specify
  → clarify
  → Ponytail/YAGNI reduction
  → plan
  → Ponytail plan reduction
  → tasks
  → checklist
  → analyze
  → independent final plan audit
  → explicit implementation authorization
```

Ponytail is a complexity gate, not an architecture generator. Spec Kit artifacts become canonical only after cross-artifact analysis passes.
