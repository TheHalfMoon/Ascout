# 001 — Cross-Artifact Analysis

**Date:** 2026-08-21  
**Scope:** Constitution → Master Plan v1 → spec/clarifications → research → plan → data model → config/receipt contracts → quickstart → tasks → requirements checklist → YAGNI gates.  
**Method:** Spec Kit-style consistency/coverage analysis plus Ponytail/YAGNI, privacy, authority, and no-green-by-omission review.  
**Result:** `PASS_AFTER_REPAIR`  
**Implementation authorization:** **NO** — final independent plan audit remains the last planning gate.

## 1. Executive Result

The founding planning set was not accepted at face value. Analysis and the subsequent independent audit attempt found material defects in product honesty, machine contracts, privacy, YAGNI, and execution authority. Every material finding was repaired before implementation.

The two highest-severity repairs were:

1. changed executable code remaining `NOT_EXERCISED` or `UNRESOLVED` can never return clean exit `0`; and
2. a repository command/config surface changed by the current AI edit is **not executed by default**. The affected task becomes `NOT_RUN(command_surface_changed)` and the stable run is materially incomplete unless the developer explicitly admits that changed authority for that invocation.

No product implementation exists on this branch.

## 2. Analyze Findings and Reconciliation

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| A1 | MAJOR / YAGNI | Config v1 allowed arbitrary task names and user-defined prerequisites, effectively a workflow DSL. | Config can override only fixed semantic tasks: `typecheck`, `lint`, `test`, `pytestBasic`; no user dependency/workflow graph. | RESOLVED |
| A2 | MAJOR / CONTRACT | Receipt required executor argv/tool identity even for tasks that never ran. | Non-executed tasks may carry empty argv/null tool identity; attempted execution requires real resolved identity. | RESOLVED |
| A3 | MAJOR / CONTRACT | Source stability and verification completeness were conflated. | Stability is `stable | tree_drifted | unknown`; completeness is separate. | RESOLVED |
| A4 | MAJOR / BINDING | “Relevant untracked files” was undefined and could omit source state. | All non-gitignored untracked files except `.ascout/` participate in M1 source identity. | RESOLVED |
| A5 | MAJOR / BINDING | Unstaged mode/type changes could disappear if only bytes were hashed. | Tree digest includes current type/mode plus content/symlink/deletion state. | RESOLVED |
| A6 | MAJOR / SECURITY | Persisted Git origin could expose credentials/userinfo/query material. | Raw origin is never persisted; unsafe material is stripped or represented by a one-way identifier. | RESOLVED |
| A7 | MAJOR / SECURITY | Persisted argv could expose secret values even when output was redacted. | Persisted/rendered argv uses exact-value redaction; raw argv is transient launch input only. | RESOLVED |
| A8 | BLOCKER / PRODUCT HONESTY | Earlier semantics allowed exit `0` with material changed executable exercise gaps. | Remaining `NOT_EXERCISED`/`UNRESOLVED` changed executable lines after permitted widening => `materially_incomplete`, stable exit `4`. | RESOLVED |
| A9 | MAJOR / EVIDENCE | One failing observation was treated as `reproduced=false`. | One/inconclusive observation => `unknown`; repeated consistent failures => true; contradictory valid observations => flaky. | RESOLVED |
| A10 | MINOR / CONTRACT | Optional fingerprint schema was internally inconsistent. | Fingerprint version is explicitly `1 | null`; fingerprint is constrained or null. | RESOLVED |
| A11 | MAJOR / CONTRACT | Receipt task/selection shapes were too open for a versioned v1 contract. | Fixed task types, explicit scope, explicit bounded SelectionPass, max two passes. | RESOLVED |

## 3. Pre-Final-Audit Corrections

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| H1 | MAJOR / PRIVACY | Raw absolute local repo path could leak through local-only identity. | `local:<sha256(canonical-real-path)>`, `portable=false`; raw absolute path forbidden in persisted/rendered evidence. | RESOLVED |
| H2 | MINOR / PROVENANCE | Spec Kit provenance used only a short SHA. | Full v0.16.0 commit pinned: `5dce710ce099067c7d3f2ef47a37b9a1c300b327`. | RESOLVED |
| H3 | MINOR / TASK QUALITY | Release qualification was bundled into an oversized task. | License/provenance, package identity, and clean-checkout qualification are atomic tasks. | RESOLVED |
| H4 | BLOCKER / EXECUTION AUTHORITY | “Warn then execute” remained unsafe when the AI changed the exact package/test/compiler/lint configuration Ascout was about to execute/load. | Default refusal: affected task is `NOT_RUN(command_surface_changed)`. Explicit `--allow-changed-command-surface` is per invocation only, is recorded in the receipt, is not persisted in config, and must never be auto-added by agent instructions/hooks. | RESOLVED |

## 4. Constitution Compliance Re-check

| Rule | Repaired evidence | Result |
|---|---|---|
| Evidence before claims | Current-run evidence only; reproduction uncertainty explicit | PASS |
| No green by omission | Task omissions, admission refusals, and exercise gaps cannot become clean success | PASS |
| Source-bound truth | Secret-safe identity; HEAD/index/worktree/all-nonignored-untracked digest; start/end drift | PASS |
| Explicit authority | Own trusted repo boundary; command provenance; changed effective command surface defaults to refusal; per-run human override only | PASS |
| Native capability first | Git/Vitest/Jest/LCOV; no semantic impact graph | PASS |
| Conservative affected verification | Native selection plus finite widening; unresolved material gap is incomplete | PASS |
| Minimal core | No DB/daemon/server/Rust/plugin SDK/LLM/cloud; one planned runtime dependency | PASS |
| Bounded/read-only/private | timeout/tree-kill/lock/retention; origin/path/output/argv privacy rules | PASS |
| Provenance/licensing | Apache-2.0; full Spec Kit provenance; exact dependency review release gate | PASS |
| Benchmark-gated growth | Real-history corpus; false-PASS/gap/timing metrics; zero binding-leak absolute gates | PASS |

No constitutional exception is accepted.

## 5. Requirement / Task Traceability

- **Source binding, privacy, task honesty, admission — FR-001…FR-014 plus authority/privacy clarifications:** T008–T043, especially T012, T016, T018–T025, T028–T030, T038–T043.
- **Affected selection and exercise gaps — FR-015…FR-023:** T044–T056; T049 is the explicit no-green exercise-gap gate.
- **Selection/drift/flake — US3:** T057–T064.
- **Test facts and bounded agent output — US4:** T065–T070.
- **Benchmark integrity:** T071–T078.
- **Cross-platform/release/governance hardening:** T079–T088.

No orphan functional requirement is known. No task requires an out-of-scope architecture subsystem.

## 6. Semantics Matrix

Source stability, verification completeness, task outcome, selection disclosure, and command admission are orthogonal.

- `ERROR` does not imply tree drift.
- `tree_drifted` does not erase task observations.
- valid affected deselection is disclosed selection, not task `NOT_RUN`.
- applicable `NOT_RUN`/`BLOCKED` work makes verification incomplete.
- `refused_changed_surface` makes the affected task `NOT_RUN(command_surface_changed)` and the stable run incomplete.
- material `NOT_EXERCISED`/`UNRESOLVED` changed executable lines make verification incomplete.
- repository finding/flake maps to exit `1` absent a higher-precedence integrity/drift condition.

Exit precedence remains:

```text
2 integrity/config/internal/task-execution error
> 3 tree drift
> 1 repository finding or flake
> 4 stable materially incomplete/gapped/admission-refused
> 0 stable complete no finding/flake/error
```

## 7. Command-Admission Contract

For each executable task Ascout identifies the **effective authority files actually used** to derive or load its command/configuration. If any of those paths changed in the current comparison:

- normal execution is refused before launch/load;
- task status is `NOT_RUN` with reason `command_surface_changed`;
- changed authority paths are recorded;
- `execution_admission=refused_changed_surface`;
- a developer may explicitly run `ascout check --allow-changed-command-surface` after reviewing the change;
- that override is valid only for that invocation and is recorded as `explicit_changed_surface_override`;
- the override is not a config field, remembered trust record, or automatic agent hook behavior.

This is intentionally smaller than sandboxing/trust databases while closing the v0.x authority gap.

## 8. Machine Contract Re-check

### Config v1

Fixed semantic task overrides only; strict top-level keys; no executable config, user task graph, persistent admission, or trust grant.

### Receipt v1

Strict fixed task/selection shapes; honest null/empty unresolved executor fields; separate stability/completeness; admission state and changed-authority paths; redacted persisted argv; weak optional fingerprint.

No known schema/design contradiction remains.

## 9. Benchmark Validity

Selection corpus compares Ascout/native selection to objective full-suite ground truth. Gap corpus measures changed executable exercise against independent full-run coverage. Metrics include false-PASS, selection recall, gap accuracy, unresolved mapping, drift, determinism, flake, and cold/warm time. Cross-tree evidence leakage and binding-integrity violations have acceptable count **zero**. No pre-data recall threshold is fabricated.

## 10. Residual Implementation / Release Gates — Not Planning Blockers

1. exact `cross-spawn` version and transitive license/provenance;
2. exact benchmark repositories/commits and execution/license terms;
3. npm package ownership or scoped fallback;
4. Windows process-tree termination proof on native Windows CI;
5. real Vitest/Jest version variance and benchmark-discovered selector misses;
6. measured time-to-signal/performance.

Each has an explicit task/release gate.

## 11. Analyze Gate Verdict

`PASS_AFTER_REPAIR`

- open BLOCKER findings: **0**
- open MAJOR findings: **0**
- unresolved constitutional violations: **0**
- orphan functional requirements: **0**
- product implementation files on planning branch: **0**

Proceed to the independent final plan audit on the repaired planning set. This analysis does not authorize implementation.