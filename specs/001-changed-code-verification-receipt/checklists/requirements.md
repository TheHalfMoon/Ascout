# Requirements Quality Checklist: Changed-Code Verification Receipt

**Purpose**: Verify that M1 requirements are complete, testable, honest about trust boundaries, and free of speculative architecture before implementation authorization.  
**Created**: 2026-08-21  
**Feature**: `specs/001-changed-code-verification-receipt/spec.md`

This checklist reviews the **requirements and machine contracts**, not product implementation.

## Product Wedge and Scope

- [x] CHK001 Primary user problem is testable: show what changed verification exercised and what remains unchecked.
- [x] CHK002 M1 first-class ecosystem is explicit: trusted local Git, JS/TS, npm/pnpm/yarn, Vitest/Jest, basic pytest only.
- [x] CHK003 Untrusted repos/PR branches are explicitly out of v0.x scope.
- [x] CHK004 CI/SARIF user surface, browser/security/adversarial/non-functional suites, AI, fixing, graph/DB/daemon/plugin SDK are out of M1.
- [x] CHK005 Long-term optionality does not impose M1 interfaces.

## Trust and Authority

- [x] CHK006 No implicit dependency installation.
- [x] CHK007 Every executed task has command provenance/source semantics.
- [x] CHK008 Changed **effective** command/config authority surfaces cause default refusal before launch/load, not warning-then-execute.
- [x] CHK009 Automation cannot silently add authority or append the changed-surface admission override.
- [x] CHK010 Local-first is distinct from child-process network isolation.
- [x] CHK011 Config v1 is fixed-task override only; arbitrary task names/prerequisite graphs/workflow DSL are rejected.
- [x] CHK012 `--allow-changed-command-surface` is explicit, per invocation, receipt-visible, and never persisted as a future trust grant.
- [x] CHK013 Admission refusal is represented as `NOT_RUN(command_surface_changed)` and materially incomplete rather than passed.
- [x] CHK014 Only authority/config files actually used to derive/load a task participate in that task's command-surface admission decision.

## No Green by Omission

- [x] CHK015 Seven task statuses separate repository findings from Ascout errors.
- [x] CHK016 `PASS` requires executed successful work.
- [x] CHK017 Applicable task non-execution remains visible with reason.
- [x] CHK018 Valid affected deselection is SelectionAccount data and is never represented as passed.
- [x] CHK019 Remaining material `NOT_EXERCISED`/`UNRESOLVED` changed executable lines prevent clean exit `0`.
- [x] CHK020 Changed-command admission refusal prevents clean exit `0`.
- [x] CHK021 Exit semantics prevent materially incomplete verification from green success.

## Source and Evidence Integrity

- [x] CHK022 Remote/local repository identity semantics are explicit.
- [x] CHK023 Raw credential-bearing origin URLs are never persisted/rendered.
- [x] CHK024 Local-only identity is one-way path-derived and never persists/renders the absolute workstation path.
- [x] CHK025 Tree identity covers HEAD/index/current unstaged mode+content and all non-gitignored untracked files except `.ascout/`.
- [x] CHK026 There is no heuristic hidden untracked-source omission list.
- [x] CHK027 Tracked files cannot be excluded merely because tools may rewrite them.
- [x] CHK028 Start/end drift yields `stable`, `tree_drifted`, or `unknown` without conflating task error with source stability.
- [x] CHK029 Evidence is run-bound; cross-tree reuse is prohibited.
- [x] CHK030 Weak finding fingerprints are matching aids only.
- [x] CHK031 `in_changed_lines` and causal `introduced_by_change` remain separate.

## Task Contract

- [x] CHK032 Non-executed tasks are not forced to fabricate argv/tool identity.
- [x] CHK033 Persisted/rendered argv is redacted; raw secret-bearing argv is transient launch input only.
- [x] CHK034 Internal task ordering is product logic, not user-configured workflow graph.
- [x] CHK035 Task status/reason/admission semantics are machine- and human-readable.

## Affected Selection and Exercise Coverage

- [x] CHK036 Native Vitest/Jest selection is preferred to a custom dependency graph.
- [x] CHK037 Selector blind spots are handled by finite conservative widening.
- [x] CHK038 Widening is bounded to at most one post-run second pass.
- [x] CHK039 Selection counts may be null only with explicit limitation; counts are never guessed.
- [x] CHK040 Exercise coverage has `EXERCISED`, `NOT_EXERCISED`, and `UNRESOLVED` states.
- [x] CHK041 Coverage is observed execution, not correctness proof.
- [x] CHK042 Coverage/source-map uncertainty cannot become optimistic exercise.

## Flake, Error, and Bounded Execution

- [x] CHK043 One failing test observation yields reproduction `unknown`, not true/false certainty.
- [x] CHK044 Repeated consistent failures may be reproduced; contradictory valid observations are flaky.
- [x] CHK045 Retry policy is targeted/bounded; successful tasks are not blindly repeated.
- [x] CHK046 Every executable task has timeout/process-tree cleanup semantics.
- [x] CHK047 Concurrent runs are refused, not queued.
- [x] CHK048 Artifact retention/output capture are bounded.

## Evidence Privacy

- [x] CHK049 `.ascout/` is ignored runtime evidence, not tracked product source.
- [x] CHK050 Recognized/user-specified secret env values are redacted from persisted output and argv.
- [x] CHK051 Redaction is described as best-effort, not universal secret detection.
- [x] CHK052 Raw logs are bounded artifacts and not embedded unbounded in receipts.

## Contracts and Output

- [x] CHK053 Config and receipt schemas are versioned JSON contracts.
- [x] CHK054 Receipt uses one truth model for terminal/JSON/agent formats.
- [x] CHK055 Agent output has explicit byte budget and preserves material semantics.
- [x] CHK056 Source stability and verification completeness are orthogonal fields.
- [x] CHK057 Exit codes distinguish clean, finding/flake, integrity error, drift, and incomplete/gapped verification.
- [x] CHK058 Receipt schema permits honest empty/null unresolved command/tool fields for non-executed tasks.
- [x] CHK059 Receipt schema records changed command-surface/admission state without turning admission into persistent trust.
- [x] CHK060 Fingerprint schema correctly permits null or v1 and constrains persisted fingerprint digest shape.

## Test-Change Facts

- [x] CHK061 M1 reports factual test/snapshot changes without semantic weakening claims.
- [x] CHK062 AST/assertion weakening analysis is deferred unless later evidence justifies it.

## Benchmark and Success Criteria

- [x] CHK063 Benchmark uses reviewed real historical ground truth and explicit baselines.
- [x] CHK064 Metrics cover selection recall, false-PASS, gap accuracy, unresolved rate, timing, drift, determinism, flake.
- [x] CHK065 Cross-tree evidence leakage and binding-integrity violations have absolute acceptable count zero.
- [x] CHK066 No arbitrary pre-data 98% threshold is frozen.
- [x] CHK067 Benchmark explicitly verifies no remaining material exercise gap can return clean exit `0`.

## Ponytail / YAGNI

- [x] CHK068 Node/Git/runner-native capability precedes custom infrastructure.
- [x] CHK069 Planned runtime dependency budget remains one reviewed dependency.
- [x] CHK070 No DB/semantic graph/daemon/cloud/Rust/public plugin SDK/arbitrary config workflow or persistent trust database exists in M1.
- [x] CHK071 Changed-command admission is implemented as a per-run CLI gate rather than a sandbox/trust subsystem.
- [x] CHK072 Project structure remains an upper bound and stop conditions return material complexity to planning.

## Qodo Review Regression Checks

- [x] CHK073 `NOT_RUN`, `BLOCKED`, and `ERROR` require non-empty `reason_code` and `reason_text` in receipt v1; omission/error states cannot be machine-opaque.
- [x] CHK074 `change_kind=renamed` requires `previous_path`, while non-rename change kinds do not carry it, preserving old/new path fidelity.
- [x] CHK075 Exercise state/count semantics are machine-enforced: `EXERCISED` count > 0; `NOT_EXERCISED` count = 0; `UNRESOLVED` count = null with a non-empty reason.
- [x] CHK076 Config v1 and receipt v1 use the same canonical fixed-task identifiers: `typecheck`, `lint`, `test`, `pytestBasic`; no hidden mapping layer is required.

## CodeRabbit Review Regression Checks

- [x] CHK077 Canonical workflow requires a fresh exact-HEAD cross-artifact consistency and branch-purity review after final audit and after any material post-audit mutation, before implementation authorization or merge consideration.
- [x] CHK078 Master Plan, constitution, spec, plan, quickstart, and tasks agree that changed effective command/config authority is refused by default; there is no surviving warning-then-execute rule.
- [x] CHK079 Governance Markdown tables render with consistent column counts; literal separator characters are not left unescaped inside table cells.
- [x] CHK080 Receipt v1 contains required root current-run `evidence[]`, and plan/tasks require unique/resolvable run/task/artifact reference integrity rather than free-floating `evidence_ids`.
- [x] CHK081 Receipt source-state schema enforces privacy-safe repository IDs: `remote:<sha256>` with `portable=true` and `local:<sha256>` with `portable=false`; arbitrary raw URL/path strings are invalid.
- [x] CHK082 One Ascout-owned pure semantic receipt validator is required before emission and reused by any internal/future receipt acceptance path to enforce evidence references, stability, task/admission, exercise, aggregate completeness, and exit-code invariants beyond JSON Schema field checks.
- [x] CHK083 Benchmark/task plan explicitly asserts stable runs with remaining material `NOT_EXERCISED`/`UNRESOLVED` gaps never return exit `0`; absent higher precedence they map to exit `4`.
- [x] CHK084 Command-admission integration coverage includes the executable `pytestBasic` task and effective pytest configuration sources when used.
- [x] CHK085 Every persisted path-bearing receipt field uses a canonical relative path in its namespace; validation rejects POSIX absolute, Windows drive/UNC, URI-absolute, backslash, and `.`/`..` traversal spellings rather than persisting or repairing them.
- [x] CHK086 The implementation plan opening summary explicitly includes all four fixed executable task categories, including `pytestBasic`; no scope-bearing summary silently drops the Python basic task.
- [x] CHK087 `docs/founding/MASTER_PLAN_V1.md` is the sole canonical Master Plan v1; legacy `docs/founding/ASCOUT_MASTER_PLAN_V1.md` is an explicit `SUPERSEDED / NON-AUTHORITATIVE` tombstone and MUST NOT be used for implementation authorization, Spec Kit derivation, requirement interpretation, task planning, review, or release decisions.
- [x] CHK088 Canonical persisted paths contain no empty path segments and no trailing separator; forms such as `src//file.ts` and `src/` are rejected rather than serialized as alternate representations of the same logical path.
- [x] CHK089 The implementation test plan makes CR13 executable: T009 contract/semantic tests, T033 end-to-end validation, and T081 cross-platform golden tests explicitly require duplicate-separator and trailing-separator regressions, including `src//file.ts` and `src/`.
- [x] CHK090 Path validation is fail-closed on the **original receipt candidate spelling before any lossy normalization/collapse/resolution**; `plan.md`, `data-model.md`, `spec.md`, and T009/T025/T033/T081 agree that invalid spellings are rejected and never repaired into valid-looking paths.
- [x] CHK091 `source.start.head_sha` and `comparison.base_ref` use full Git object IDs (40-hex SHA-1 or 64-hex SHA-256) and semantic receipt validation requires exact equality for M1 `working_tree_vs_head`; unborn, malformed/abbreviated/symbolic, or mismatched comparison identity fails closed.
- [x] CHK092 Every changed new-line range satisfies positive integer `start <= end`; the semantic validator and T009/T011/T020/T025/T033 explicitly reject an inverted range such as `[10, 1]` before changed-line, coverage, or exercise arithmetic.

## Result

**92/92 requirement, contract, governance, and review-regression checks PASS after internal analysis, independent admission audit, Qodo review, and CodeRabbit reconciliation through CR17.**

This means the repaired planning set is internally ready for renewed analysis/final audit and a fresh exact-head external review. It does not authorize implementation or merge by itself.