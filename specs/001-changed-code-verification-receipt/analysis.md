# 001 — Cross-Artifact Analysis

**Date:** 2026-08-21  
**Scope:** Constitution → Master Plan v1 → spec/clarifications → research → plan → data model → config/receipt contracts → quickstart → tasks → requirements checklist → YAGNI gates.  
**Method:** Spec Kit-style consistency/coverage analysis plus Ponytail/YAGNI and trust-boundary review.  
**Result:** `PASS_AFTER_REPAIR`  
**Implementation authorization:** **NO** — this artifact closes the analyze gate only; independent final plan audit is still required.

## 1. Executive Result

The initial planning set was directionally coherent but was **not** ready to merge unchanged. Cross-artifact analysis found 11 material issues, including one direct product-honesty failure: the earlier quickstart/exit contract could return a clean result while material changed executable lines remained unexercised/unresolved. The analysis also found an accidental configuration workflow DSL, credential-bearing repository-identity risk, persisted-argv secret risk, under-specified untracked source identity, and schema contracts that could force fabricated or unstable machine fields.

All 11 findings were repaired on the planning branch before this report was written. The repaired artifacts are mutually consistent on the M1 wedge, trust boundary, source identity, selection/widening, task/result semantics, exercise gaps, reproduction semantics, privacy, and exit codes.

No product source/test/benchmark implementation exists in this planning branch.

## 2. Findings and Reconciliation

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| A1 | MAJOR | Config v1 allowed arbitrary task names + user-defined `prerequisites[]`, effectively a workflow/task-runner DSL despite M1 explicitly rejecting one. | Config v1 now allows only fixed `typecheck`, `lint`, `test`, `pytestBasic` overrides; no arbitrary tasks/prerequisite graph/workflow expressions/hooks. Internal ordering remains product logic. | RESOLVED |
| A2 | MAJOR | Receipt task schema required non-empty argv/tool identity even for `NOT_RUN`/`BLOCKED`/`NOT_APPLICABLE`, encouraging fabricated executor data. | Non-executed tasks may have empty argv/null tool identity; attempted process tasks require resolved execution identity by model invariant. | RESOLVED |
| A3 | MAJOR | `stability=incomplete_due_to_error` conflated source-tree stability with verification completeness/execution failure. | Source stability is now `stable | tree_drifted | unknown`; completeness is separate: `complete | materially_incomplete | unknown_due_to_error`. | RESOLVED |
| A4 | MAJOR | “Relevant untracked files” was undefined and could silently omit source state from the trust digest. | M1 includes all non-gitignored untracked files except `.ascout/`; no hidden relevance heuristic. Nonignored tool output outside `.ascout/` conservatively causes drift. | RESOLVED |
| A5 | MAJOR | Unstaged tracked executable-bit/type changes could be lost if tree identity only hashed file bytes. | `tree_digest_v1` includes current unstaged worktree type/mode plus content/symlink/deletion state; golden tests are tasked. | RESOLVED |
| A6 | MAJOR / SECURITY | Persisting normalized “origin URL” without an explicit sanitization contract could leak Git credentials/userinfo/tokens. | Raw origin is never persisted/rendered. Credential/userinfo/query/fragment material is removed; unsafe-to-normalize forms use a one-way identifier. | RESOLVED |
| A7 | MAJOR / SECURITY | Evidence redaction covered output but not persisted command argv, where tokens/passwords may be passed as arguments. | Persisted/rendered argv uses the same exact-value secret redaction policy; raw argv is transient launch input only; schema records redaction state. | RESOLVED |
| A8 | BLOCKER / PRODUCT HONESTY | Earlier exit/quickstart semantics permitted exit `0` with `NOT_EXERCISED`/`UNRESOLVED` changed executable lines. This contradicted the core wedge and “no green by omission.” | Any remaining material changed executable exercise gap after permitted widening makes the stable run `materially_incomplete` and exit `4`. Constitution/spec/plan/data model/tasks/quickstart/checklist now lock this rule. | RESOLVED |
| A9 | MAJOR | One failing observation with unavailable retry was labeled `reproduced=false`, confusing “not reproduced” with “not enough evidence.” | One observation or inconclusive rerun → `unknown`; consistent repeated failures → true; contradictory observations → `FLAKY` and false for a stable-failure reproduction claim. | RESOLVED |
| A10 | MINOR / CONTRACT | Receipt schema combined nullable `fingerprint_version` with `const: 1`, effectively making null invalid despite the data model calling fingerprints optional. | `fingerprint_version` explicitly accepts `1 | null`; fingerprint accepts SHA-256 or null. | RESOLVED |
| A11 | MAJOR / CONTRACT | Versioned receipt schema left `selection.initial_scope`, `passes[]`, and `task_type` structurally open, undermining a stable machine contract and reintroducing implicit extensibility. | Receipt v1 now has fixed task types, explicit repository/package scope, and explicit bounded selection-pass shape with at most two passes. | RESOLVED |

## 3. Constitution Compliance Re-check

| Constitutional rule | Repaired evidence | Result |
|---|---|---|
| Evidence before claims | Current-run evidence refs; no confidence ladder; reproduction states distinguish unknown from observed/reproduced | PASS |
| No green by omission | Task omissions visible; valid deselection separately disclosed; remaining exercise gaps force exit `4` | PASS |
| Source-bound truth | Secret-safe repo identity; HEAD/index/worktree/all-nonignored-untracked digest; start/end drift; no evidence transfer | PASS |
| Trusted local / explicit authority | Own trusted repo only; provenance; changed-command warning; no implicit installs; no config workflow DSL | PASS |
| Native capability first | Git/Vitest/Jest/LCOV; no semantic impact graph | PASS |
| Conservative affected verification | Declared widen triggers + one bounded post-run widening pass; unsafe unresolved scope is incomplete | PASS |
| Minimal core | No DB/daemon/server/Rust/plugin SDK/LLM/cloud; one planned runtime dependency | PASS |
| Bounded/read-only/private | timeout/tree-kill/lock/retention; tracked/nonignored drift; output+argv redaction | PASS |
| Provenance/licensing | Apache-2.0 project license; Spec Kit v0.16.0 provenance; exact dependency/donor review gates | PASS |
| Benchmark-gated growth | Real-history selection/gap corpora; false-PASS/gap/timing metrics; zero binding-leak absolute gates | PASS |

No constitutional exception or Complexity Tracking violation is accepted by the repaired plan.

## 4. Requirement Coverage / Traceability

Every functional requirement in repaired `spec.md` has a plan mechanism and an implementation/validation task or an explicit architectural absence that is itself testable/reviewable.

### Source, trust, task honesty — FR-001…FR-014

- Plan: Trust Boundary; Source Identity; Task Result Contract; Config Contract; Process Control.
- Primary tasks: T008–T040.
- Critical tests: T008–T015, T026–T030.

### Affected selection / exercise gaps — FR-015…FR-023

- Plan: Conservative Widening; Selection Accounting; Coverage and Changed-Code Exercise; Completeness.
- Primary tasks: T041–T053 plus T054 selection accounting.
- Critical gate: T046 proves remaining exercise gaps cannot return exit `0`.

### Test-change / flake / bounded execution / privacy — FR-024…FR-030

- Plan: Flake/Reproduction; Process Control; Run Lock/Retention; Redaction; Test-Change Facts.
- Primary tasks: T013–T023, T055–T067.

### Local-core / output contract — FR-031…FR-034

- Plan: Technical Context/Constraints; Receipt Contract; output surfaces.
- Primary tasks: T007, T024–T025, T037–T040, T063–T067, T080–T082.
- No network/cloud/AI subsystem is introduced by the plan.

### Fixed configuration / causation / secret-safe identity — FR-035…FR-039

- Plan: Config Contract; Source Identity; Finding semantics.
- Primary tasks: T008, T010, T012, T016–T018, T035, T056/T061.
- `introduced_by_change` remains unknown absent future comparative proof.

**Coverage result:** no orphan functional requirement found; no implementation task requires an out-of-scope product subsystem.

## 5. Task-to-Requirement Sanity

Tasks T001–T067 implement/test the feature contract; T068–T075 establish benchmark evidence; T076–T083 are release-hardening/governance work.

No task requires:

- a DB/daemon/server;
- a semantic dependency graph;
- a generic plugin SDK;
- AI reasoning;
- untrusted-repository execution;
- browser/security/adversarial suites;
- recursive widening;
- arbitrary config-defined tasks/workflows;
- a second planned product runtime dependency.

Any implementation discovery that requires one of those is a stop condition and must return to planning.

## 6. Semantics Matrix After Repair

### Task state vs source stability vs completeness

These dimensions are orthogonal:

- task `ERROR` does not itself mean source drift;
- source `tree_drifted` does not erase task observations;
- valid affected deselection is disclosed selection scope, not a task omission;
- `NOT_RUN`/`BLOCKED` applicable tasks make verification incomplete;
- remaining `NOT_EXERCISED`/`UNRESOLVED` changed executable lines make verification incomplete;
- repository finding/flake is an executed result and maps to exit `1` unless a higher-precedence integrity/drift condition exists.

### Exit precedence

```text
2 internal/usage/config/task-execution integrity error
> 3 tree drift
> 1 repository finding or flake
> 4 stable but materially incomplete/gapped
> 0 stable, complete, no finding/flake/error
```

This rule is now consistent across spec, plan, data model, quickstart, receipt schema, tasks, and checklist.

## 7. Machine Contract Re-check

### Config v1

- strict top-level keys;
- fixed task categories only;
- no executable config;
- no arbitrary prerequisites/workflow DSL;
- disablement requires visible reason;
- command overrides are argv arrays.

### Receipt v1

- strict top-level receipt domains;
- fixed task types;
- non-executed task identity can remain honestly unresolved;
- explicit source stability and completeness;
- strict selection scope/pass schema, max two passes;
- task status counts fixed to the seven constitutional statuses;
- fingerprint optionality is schema-correct;
- secret-redaction state is representable.

**Contract disposition:** no known schema/design contradiction remains.

## 8. Benchmark Validity Re-check

The benchmark measures Ascout's claims rather than donor scanners:

- selection corpus asks whether Ascout/native selected scope catches failures the full suite catches;
- gap corpus asks whether Ascout correctly reports changed-code exercise against independent full-run coverage ground truth;
- baselines include full suite, plain project test, and native related selection;
- headline risk metrics include false-PASS and unresolved mapping;
- binding leakage/integrity violations have absolute acceptable count zero;
- no pre-corpus 98% selection threshold is fabricated.

Residual benchmark repository selection is an implementation/release evidence task, not an architecture blocker.

## 9. Residual Risks / Gates — Not Planning Blockers

These remain intentionally unresolved until implementation/release evidence exists:

1. exact `cross-spawn` version and dependency-chain license/provenance;
2. exact benchmark repositories/commits and their redistribution/execution terms;
3. unscoped npm package-name ownership or scoped fallback;
4. exact Windows process-tree termination constants/mechanics, which must be proven on native Windows CI;
5. actual Vitest/Jest version variance in user repositories and any benchmark-discovered selector blind spots;
6. actual performance/time-to-signal numbers.

Each has a concrete implementation/release task and none requires speculative architecture today.

## 10. Analyze Gate Verdict

`PASS_AFTER_REPAIR`

- BLOCKER findings open: **0**
- MAJOR findings open: **0**
- unresolved constitutional violations: **0**
- orphan functional requirements identified: **0**
- product implementation present on planning branch: **0**

Proceed to an **independent final plan audit on the repaired exact head**. Do not authorize implementation merely from this analysis.
