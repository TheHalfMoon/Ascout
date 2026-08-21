# 001 — Cross-Artifact Analysis

**Date:** 2026-08-21  
**Scope:** Constitution → Master Plan v1 → spec/clarifications → research → plan → data model → config/receipt contracts → quickstart → tasks → requirements checklist → YAGNI gates.  
**Method:** Spec Kit-style consistency/coverage analysis plus Ponytail/YAGNI and trust-boundary review.  
**Result:** `PASS_AFTER_REPAIR`  
**Implementation authorization:** **NO** — independent final plan audit is still required.

## 1. Executive Result

The initial planning set was directionally coherent but was **not** ready to merge unchanged. Cross-artifact analysis found material contract, security, YAGNI, and product-honesty defects. The most important was a direct contradiction of the wedge: earlier exit/quickstart semantics could describe a run as clean while material changed executable lines remained unexercised/unresolved.

All analyze findings were repaired before this report was finalized. A subsequent pre-final-audit hygiene pass also tightened local-path privacy, exact upstream provenance, strict receipt selection shape, and task atomicity. No product implementation exists in the branch.

## 2. Analyze Findings and Reconciliation

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| A1 | MAJOR | Config v1 allowed arbitrary task names + user-defined prerequisites, effectively a workflow/task-runner DSL. | Fixed task overrides only: `typecheck`, `lint`, `test`, `pytestBasic`; no user prerequisite/workflow graph. | RESOLVED |
| A2 | MAJOR | Receipt schema required non-empty argv/tool identity for non-executed tasks, encouraging fabricated executor data. | Non-executed tasks may carry empty argv/null tool identity; attempted process tasks require real resolved execution identity by invariant. | RESOLVED |
| A3 | MAJOR | Source `stability` conflated drift with verification completeness/execution error. | Stability is `stable | tree_drifted | unknown`; completeness is separate `complete | materially_incomplete | unknown_due_to_error`. | RESOLVED |
| A4 | MAJOR | “Relevant untracked files” was undefined and could silently omit source state. | M1 source identity includes all non-gitignored untracked files except `.ascout/`; no hidden relevance heuristic. | RESOLVED |
| A5 | MAJOR | Unstaged executable-bit/type changes could disappear if only file bytes were hashed. | Tree digest includes current unstaged type/mode plus content/symlink/deletion state. | RESOLVED |
| A6 | MAJOR / SECURITY | Persisted Git origin could expose credentials/userinfo/token-bearing URL material. | Raw origin is never persisted/rendered; unsafe material is stripped or replaced by a one-way ID. | RESOLVED |
| A7 | MAJOR / SECURITY | Redaction covered captured output but not persisted command argv. | Persisted/rendered argv is exact-value redacted; raw argv is transient launch input only. | RESOLVED |
| A8 | BLOCKER / PRODUCT HONESTY | Earlier semantics permitted exit `0` with changed executable `NOT_EXERCISED`/`UNRESOLVED` lines. | Remaining material exercise gap after permitted widening => `materially_incomplete`, stable exit `4`, never `0`. Constitution/spec/plan/model/tasks/quickstart lock this. | RESOLVED |
| A9 | MAJOR | One failing observation with unavailable retry was `reproduced=false`, confusing insufficient evidence with disproven reproduction. | One/inconclusive observation => unknown; repeated consistent failures => true; contradictory valid observations => flaky / false stable-failure reproduction. | RESOLVED |
| A10 | MINOR / CONTRACT | Nullable fingerprint version plus `const: 1` made optional fingerprint semantics schema-inconsistent. | Explicit `1 | null`; fingerprint SHA-256 or null. | RESOLVED |
| A11 | MAJOR / CONTRACT | Receipt v1 left `task_type`, selection scope, and selection passes structurally open despite claiming a stable fixed M1 contract. | Fixed task types plus explicit repository/package scope and bounded selection-pass schema (max two passes). | RESOLVED |

## 3. Pre-Final-Audit Hygiene Corrections

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| H1 | MAJOR / PRIVACY | A local-only repo identity “derived from canonical path” could be implemented by persisting the raw absolute path, leaking workstation usernames/directories into shared receipts. | Constitution now requires a **one-way identifier** derived from canonical local path, `portable=false`; raw absolute path is forbidden in receipts/artifacts. T012/T017 explicitly test/implement this. | RESOLVED |
| H2 | MINOR / PROVENANCE | Spec Kit provenance recorded only short release SHA `5dce710`. | Pinned full upstream v0.16.0 commit `5dce710ce099067c7d3f2ef47a37b9a1c300b327`, independently resolved from upstream. | RESOLVED |
| H3 | MINOR / TASK QUALITY | Final release task combined dependency-license review, npm ownership, and clean-checkout qualification into one oversized task. | Split into atomic T083 license/provenance, T084 package identity, T085 clean-checkout qualification. | RESOLVED |

## 4. Constitution Compliance Re-check

| Constitutional rule | Repaired evidence | Result |
|---|---|---|
| Evidence before claims | Current-run evidence refs; no confidence ladder; reproduction states distinguish unknown/observed/reproduced | PASS |
| No green by omission | Task omissions visible; valid deselection separately disclosed; material exercise gaps force exit `4` | PASS |
| Source-bound truth | Secret-safe remote/local identity; HEAD/index/worktree/all-nonignored-untracked digest; start/end drift; no evidence transfer | PASS |
| Trusted local / explicit authority | Own trusted repo only; provenance; changed-command warning; no implicit installs; no config workflow DSL | PASS |
| Native capability first | Git/Vitest/Jest/LCOV; no semantic impact graph | PASS |
| Conservative affected verification | Declared widen triggers + one bounded post-run widening pass; unresolved unsafe scope is incomplete | PASS |
| Minimal core | No DB/daemon/server/Rust/plugin SDK/LLM/cloud; one planned runtime dependency | PASS |
| Bounded/read-only/private | timeout/tree-kill/lock/retention; tracked/nonignored drift; origin/output/argv/path privacy rules | PASS |
| Provenance/licensing | Apache-2.0; full Spec Kit v0.16.0 upstream commit; exact dependency/donor review gates | PASS |
| Benchmark-gated growth | Real-history selection/gap corpora; false-PASS/gap/timing metrics; zero binding-leak absolute gates | PASS |

No constitutional exception is accepted.

## 5. Requirement Coverage / Traceability

Every functional requirement in repaired `spec.md` has a plan mechanism and implementation/validation task or an explicit architectural absence that is reviewable/testable.

### Source, trust, task honesty — FR-001…FR-014

- Plan: Trust Boundary; Source Identity; Task Result Contract; Config; Process Control.
- Primary tasks: T008–T040.
- Critical tests: T008–T015, T026–T030.

### Affected selection / exercise gaps — FR-015…FR-023

- Plan: Conservative Widening; Selection Accounting; Coverage and Changed-Code Exercise; Completeness.
- Primary tasks: T041–T061.
- Critical gate: T046 proves remaining material exercise gaps cannot return exit `0`.

### Test-change / flake / bounded execution / privacy — FR-024…FR-030

- Plan: Flake/Reproduction; Process Control; Run Lock/Retention; Redaction; Test-Change Facts.
- Primary tasks: T013–T023, T055–T067.

### Local-core / output contract — FR-031…FR-034

- Plan: Technical Constraints; Receipt Contract; output surfaces.
- Primary tasks: T007, T024–T025, T037–T040, T063–T067, T080–T082.

### Fixed config / authority / source-identity privacy — FR-035…FR-039

- Plan: Config Contract; Source Identity; Finding semantics.
- Primary tasks: T008, T010, T012, T016–T018, T035, T056/T061.

**Coverage result:** no orphan functional requirement identified.

## 6. Task-to-Scope Sanity

Tasks T001–T067 implement/test M1 product behavior; T068–T075 establish benchmark evidence; T076–T085 perform cross-platform/release/governance hardening.

No task requires DB/daemon/server, semantic dependency graph, generic plugin SDK, AI reasoning, untrusted execution, browser/security/adversarial suites, recursive widening, arbitrary config workflow graph, or a second planned product runtime dependency.

Any implementation discovery requiring one is a stop condition and returns to planning.

## 7. Semantics Matrix After Repair

Source stability, task outcomes, selection disclosure, and completeness are orthogonal:

- task `ERROR` does not itself imply source drift;
- `tree_drifted` does not erase task observations;
- valid affected deselection is disclosed selection, not a task omission;
- applicable task `NOT_RUN`/`BLOCKED` makes verification incomplete;
- material `NOT_EXERCISED`/`UNRESOLVED` changed executable lines make verification incomplete;
- repository finding/flake is an executed result and maps to exit `1` absent higher-precedence integrity/drift state.

Exit precedence:

```text
2 integrity/internal/config/task-execution error
> 3 tree drift
> 1 repository finding or flake
> 4 stable materially incomplete/gapped
> 0 stable complete no finding/flake/error
```

## 8. Machine Contract Re-check

### Config v1

Strict top-level keys; fixed semantic tasks; no executable config; no arbitrary prerequisites/workflow DSL; disablement reason required; argv-array overrides only.

### Receipt v1

Strict top-level domains; fixed task types; honest empty/null unresolved command/tool fields; separate stability/completeness; strict repository/package SelectionScope and bounded SelectionPass schema; fixed seven-key status-count object; optional fingerprint is schema-correct; persisted argv redaction is representable.

**Contract disposition:** no known schema/design contradiction remains.

## 9. Benchmark Validity Re-check

Selection corpus measures selected-scope detection against full-suite ground truth; gap corpus measures changed executable exercise against independent full-run coverage. Baselines include full suite/plain project test/native related selection. Metrics include false-PASS, selection recall, gap accuracy, unresolved mapping, and cold/warm time. Binding leakage/integrity violations have absolute acceptable count zero. No pre-corpus 98% threshold is fabricated.

## 10. Residual Implementation / Release Gates — Not Planning Blockers

1. exact `cross-spawn` version/dependency-chain license/provenance;
2. exact benchmark repositories/commits and licensing/execution terms;
3. npm package ownership or scoped fallback;
4. Windows process-tree termination mechanics/constants proven on native Windows CI;
5. real Vitest/Jest version variance and benchmark-discovered selector misses;
6. measured performance/time-to-signal.

Each has an explicit task/release gate.

## 11. Analyze Gate Verdict

`PASS_AFTER_REPAIR`

- open BLOCKER findings: **0**
- open MAJOR findings: **0**
- unresolved constitutional violations: **0**
- orphan functional requirements: **0**
- product implementation files on planning branch: **0**

Proceed to an independent final plan audit on the repaired exact head. Do not authorize implementation merely from this analysis.
