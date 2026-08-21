# Requirements Quality Checklist: Changed-Code Verification Receipt

**Purpose**: Verify that the M1 specification and plan are complete, testable, honest about trust boundaries, and free of speculative architecture before implementation authorization.  
**Created**: 2026-08-21  
**Feature**: `specs/001-changed-code-verification-receipt/spec.md`

This checklist reviews the **requirements themselves**, not whether product code has been implemented.

## Product Wedge and Scope

- [x] CHK001 The primary user problem is stated in one testable sentence: identify what changed verification actually exercised and what nothing checked.
- [x] CHK002 M1 first-class ecosystem scope is explicit (trusted local Git repository; JS/TS; common package managers; Vitest/Jest; basic pytest only).
- [x] CHK003 Untrusted repositories/PR branches are explicitly out of v0.x scope rather than implied safe.
- [x] CHK004 CI/SARIF, browser, security suite, adversarial/non-functional suites, AI reasoning, code fixing, semantic graph, DB/daemon/plugin SDK are explicitly outside M1.
- [x] CHK005 Long-term optional capabilities do not impose present M1 interfaces or storage abstractions.

## Trust and Authority

- [x] CHK006 Requirements forbid implicit dependency installation.
- [x] CHK007 Every executable task has command provenance and source-path requirements.
- [x] CHK008 Changed command-surface behavior is specified before execution.
- [x] CHK009 Agent/host automation cannot silently add execution authority.
- [x] CHK010 Local-first claims are explicitly distinguished from network isolation of child processes/tests.

## No Green by Omission

- [x] CHK011 The seven task statuses are unambiguous and separate repository findings from Ascout execution errors.
- [x] CHK012 `PASS` is only valid for executed successful work.
- [x] CHK013 Non-executed applicable work carries a reason and remains visible.
- [x] CHK014 Deselected tests are separately accounted for and never represented as passed.
- [x] CHK015 Exit semantics prevent materially incomplete verification from returning the clean success code.

## Source and Evidence Integrity

- [x] CHK016 Repository identity semantics cover both remote and clearly local-only repositories.
- [x] CHK017 Start source identity includes committed/index/worktree/relevant-untracked state and a versioned digest contract.
- [x] CHK018 Tracked files cannot be excluded merely because verification tools may rewrite them.
- [x] CHK019 Start/end source drift is mandatory and changes receipt stability/exit semantics.
- [x] CHK020 Evidence IDs are run-bound and old evidence cannot become evidence for a new run/tree.
- [x] CHK021 Finding fingerprints are explicitly weak/versioned matching aids rather than global identity or evidence.
- [x] CHK022 `in_changed_lines` and `introduced_by_change` are semantically separate; M1 causation defaults unknown.

## Affected Selection and Exercise Coverage

- [x] CHK023 Native Vitest/Jest selection is preferred to a custom M1 dependency graph.
- [x] CHK024 Static/native selector blind spots are addressed by explicit conservative widening rather than hidden confidence.
- [x] CHK025 Widening is bounded to prevent the plan from becoming a recursive impact-analysis engine.
- [x] CHK026 Selection mode, selected/deselected counts where knowable, limitations, and widening triggers are part of the receipt.
- [x] CHK027 Exercise coverage has three honest states: exercised, not exercised, unresolved.
- [x] CHK028 Coverage is explicitly described as observed execution, not correctness proof.
- [x] CHK029 Coverage/source-map uncertainty cannot silently become exercised.

## Flake, Error, and Bounded Execution

- [x] CHK030 A single failing observation is not automatically called reproduced.
- [x] CHK031 Flaky status requires contradictory observations.
- [x] CHK032 Retry policy is targeted and bounded; successful tasks are not blindly repeated.
- [x] CHK033 Every executable task has timeout semantics and child-process cleanup requirements.
- [x] CHK034 Concurrent Ascout checks are refused rather than queued in M1.
- [x] CHK035 Artifact retention and output capture are bounded.

## Evidence Privacy

- [x] CHK036 `.ascout/` is an ignored artifact area, not tracked product source/config.
- [x] CHK037 Recognized secret-bearing environment values are redacted before persistence/agent rendering.
- [x] CHK038 Redaction is accurately described as best-effort rather than a universal secret detector.
- [x] CHK039 Raw logs are bounded artifacts and are not embedded unbounded in the machine receipt.

## Contracts and Output

- [x] CHK040 Config has a versioned, tracked, non-executable JSON contract and no workflow DSL.
- [x] CHK041 Receipt has one versioned truth model feeding terminal, JSON, and agent representations.
- [x] CHK042 Agent output has an explicit bounded output budget and preserves identity/status/gap semantics when detail is omitted.
- [x] CHK043 Exit codes distinguish clean, finding/flake, Ascout error, drift, and materially incomplete verification.
- [x] CHK044 Machine schemas exist for config v1 and receipt v1.

## Test-Change Facts

- [x] CHK045 M1 requires factual test/snapshot change reporting without claiming semantic weakening from syntactic counts.
- [x] CHK046 Skip/disable/assertion analysis is not required until a reliable detector exists without speculative AST infrastructure.

## Benchmark and Success Criteria

- [x] CHK047 Benchmark construction uses real historical ground truth and compares Ascout to explicit baselines.
- [x] CHK048 Selection recall, false-PASS, cold/warm time, gap accuracy, unresolved mapping, drift, determinism, and flake classification are defined.
- [x] CHK049 Cross-tree evidence leakage and binding-integrity violations have an absolute acceptable count of zero.
- [x] CHK050 No arbitrary 98% selection threshold is frozen before corpus evidence exists.
- [x] CHK051 Success criteria are measurable without requiring future AI/security/browser capabilities.

## Ponytail / YAGNI

- [x] CHK052 Node/Git/test-runner built-ins are used before custom infrastructure.
- [x] CHK053 Planned product runtime dependency budget is one justified dependency; additional runtime dependencies require plan review.
- [x] CHK054 No generic adapter/plugin interface is promised before concrete integrations prove common behavior.
- [x] CHK055 No persistent DB, semantic graph, daemon, cloud control plane, or Rust rewrite is present in M1.
- [x] CHK056 Project structure is an upper bound and may be collapsed when implementation remains trivial.

## Planning Workflow

- [x] CHK057 Constitution, specification, clarifications, YAGNI review, research, plan, data model, contracts, quickstart, and tasks all exist before implementation.
- [x] CHK058 Tasks are organized by independently testable user stories with trust-critical tests preceding implementation work.
- [x] CHK059 Stop conditions return material architecture changes to planning instead of silently widening scope.
- [x] CHK060 No artifact in this branch authorizes product implementation before cross-artifact analysis and independent final plan review.

## Result

**60/60 requirement-quality checks PASS.**

Passing this checklist means the requirements are sufficiently specified for cross-artifact analysis. It does not mean the product is implemented or that the founding PR should merge without independent review.
