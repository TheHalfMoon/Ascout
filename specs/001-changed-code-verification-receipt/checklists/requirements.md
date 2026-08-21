# Requirements Quality Checklist: Changed-Code Verification Receipt

**Purpose**: Verify that M1 requirements are complete, testable, honest about trust boundaries, and free of speculative architecture before implementation authorization.  
**Created**: 2026-08-21  
**Feature**: `specs/001-changed-code-verification-receipt/spec.md`

This checklist reviews the **requirements**, not product implementation.

## Product Wedge and Scope

- [x] CHK001 Primary user problem is testable: show what changed verification exercised and what remains unchecked.
- [x] CHK002 M1 first-class ecosystem is explicit: trusted local Git, JS/TS, npm/pnpm/yarn, Vitest/Jest, basic pytest only.
- [x] CHK003 Untrusted repos/PR branches are explicitly out of v0.x scope.
- [x] CHK004 CI/SARIF user surface, browser/security/adversarial/non-functional suites, AI, fixing, graph/DB/daemon/plugin SDK are out of M1.
- [x] CHK005 Long-term optionality does not impose M1 interfaces.

## Trust and Authority

- [x] CHK006 No implicit dependency installation.
- [x] CHK007 Every executed task has command provenance/source semantics.
- [x] CHK008 Changed command surfaces warn before execution.
- [x] CHK009 Automation cannot silently add authority.
- [x] CHK010 Local-first is distinct from child-process network isolation.
- [x] CHK011 Config v1 is fixed-task override only; arbitrary task names/prerequisite graphs/workflow DSL are rejected.

## No Green by Omission

- [x] CHK012 Seven task statuses separate repository findings from Ascout errors.
- [x] CHK013 `PASS` requires executed successful work.
- [x] CHK014 Applicable task non-execution remains visible with reason.
- [x] CHK015 Valid affected deselection is SelectionAccount data and is never represented as passed.
- [x] CHK016 Remaining material `NOT_EXERCISED`/`UNRESOLVED` changed executable lines prevent clean exit `0`.
- [x] CHK017 Exit semantics prevent materially incomplete verification from green success.

## Source and Evidence Integrity

- [x] CHK018 Remote/local repository identity semantics are explicit.
- [x] CHK019 Raw credential-bearing origin URLs are never persisted/rendered.
- [x] CHK020 Tree identity covers HEAD/index/current unstaged mode+content and all non-gitignored untracked files except `.ascout/`.
- [x] CHK021 There is no heuristic hidden untracked-source omission list.
- [x] CHK022 Tracked files cannot be excluded merely because tools may rewrite them.
- [x] CHK023 Start/end drift yields `stable | tree_drifted | unknown` without conflating task error with source stability.
- [x] CHK024 Evidence is run-bound; cross-tree reuse is prohibited.
- [x] CHK025 Weak finding fingerprints are matching aids only.
- [x] CHK026 `in_changed_lines` and causal `introduced_by_change` remain separate.

## Task Contract

- [x] CHK027 Non-executed tasks are not forced to fabricate argv/tool identity.
- [x] CHK028 Persisted/rendered argv is redacted; raw secret-bearing argv is transient launch input only.
- [x] CHK029 Internal task ordering is product logic, not user-configured workflow graph.
- [x] CHK030 Task status/reason semantics are machine- and human-readable.

## Affected Selection and Exercise Coverage

- [x] CHK031 Native Vitest/Jest selection is preferred to a custom dependency graph.
- [x] CHK032 Selector blind spots are handled by finite conservative widening.
- [x] CHK033 Widening is bounded to at most one post-run second pass.
- [x] CHK034 Selection counts may be null only with explicit limitation; counts are never guessed.
- [x] CHK035 Exercise coverage has `EXERCISED | NOT_EXERCISED | UNRESOLVED`.
- [x] CHK036 Coverage is observed execution, not correctness proof.
- [x] CHK037 Coverage/source-map uncertainty cannot become optimistic exercise.

## Flake, Error, and Bounded Execution

- [x] CHK038 One failing test observation yields reproduction `unknown`, not true/false certainty.
- [x] CHK039 Repeated consistent failures may be reproduced; contradictory valid observations are flaky.
- [x] CHK040 Retry policy is targeted/bounded; successful tasks are not blindly repeated.
- [x] CHK041 Every executable task has timeout/process-tree cleanup semantics.
- [x] CHK042 Concurrent runs are refused, not queued.
- [x] CHK043 Artifact retention/output capture are bounded.

## Evidence Privacy

- [x] CHK044 `.ascout/` is ignored runtime evidence, not tracked product source.
- [x] CHK045 Recognized/user-specified secret env values are redacted from persisted output and argv.
- [x] CHK046 Redaction is described as best-effort, not universal secret detection.
- [x] CHK047 Raw logs are bounded artifacts and not embedded unbounded in receipts.

## Contracts and Output

- [x] CHK048 Config and receipt schemas are versioned JSON contracts.
- [x] CHK049 Receipt uses one truth model for terminal/JSON/agent formats.
- [x] CHK050 Agent output has explicit byte budget and preserves material semantics.
- [x] CHK051 Source stability and verification completeness are orthogonal fields.
- [x] CHK052 Exit codes distinguish clean, finding/flake, integrity error, drift, and incomplete/gapped verification.
- [x] CHK053 Receipt schema permits honest empty/null unresolved command/tool fields for non-executed tasks.
- [x] CHK054 Fingerprint schema correctly permits null or v1 and constrains persisted fingerprint digest shape.

## Test-Change Facts

- [x] CHK055 M1 reports factual test/snapshot changes without semantic weakening claims.
- [x] CHK056 AST/assertion weakening analysis is deferred unless later evidence justifies it.

## Benchmark and Success Criteria

- [x] CHK057 Benchmark uses reviewed real historical ground truth and explicit baselines.
- [x] CHK058 Metrics cover selection recall, false-PASS, gap accuracy, unresolved rate, timing, drift, determinism, flake.
- [x] CHK059 Cross-tree evidence leakage and binding-integrity violations have absolute acceptable count zero.
- [x] CHK060 No arbitrary pre-data 98% threshold is frozen.
- [x] CHK061 Benchmark explicitly verifies no remaining material exercise gap can return clean exit `0`.

## Ponytail / YAGNI

- [x] CHK062 Node/Git/runner-native capability precedes custom infrastructure.
- [x] CHK063 Planned runtime dependency budget remains one reviewed dependency.
- [x] CHK064 No DB/semantic graph/daemon/cloud/Rust/public plugin SDK/arbitrary config workflow exists in M1.
- [x] CHK065 Project structure remains an upper bound and stop conditions return material complexity to planning.

## Result

**65/65 requirement-quality checks PASS after cross-artifact repair.**

This means the requirements are ready for final cross-artifact analysis. It does not authorize implementation or merge by itself.
