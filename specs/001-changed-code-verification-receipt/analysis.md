# 001 — Cross-Artifact Analysis

**Date:** 2026-08-21  
**Scope:** Constitution → Master Plan v1 → spec/clarifications → research → plan → data model → config/receipt contracts → quickstart → tasks → requirements checklist → YAGNI gates → exact-head external PR review.  
**Method:** Spec Kit-style consistency/coverage analysis plus Ponytail/YAGNI, privacy, authority, no-green-by-omission, machine-contract integrity, and external-review reconciliation.  
**Result:** `PASS_AFTER_REPAIR`  
**Implementation authorization:** **NO** — fresh exact-head external review and branch-purity review remain merge/authorization gates.

## 1. Executive Result

The founding planning set was not accepted at face value. Internal analysis, independent audit, Qodo exact-head review, and CodeRabbit exact-head review found material defects in product honesty, machine contracts, privacy, YAGNI, execution authority, evidence integrity, and governance freshness.

Every accepted finding has been repaired before implementation.

The highest-severity repairs are:

1. changed executable code remaining `NOT_EXERCISED` or `UNRESOLVED` can never return clean exit `0`;
2. a repository command/config surface changed by the current AI edit is **not executed by default**;
3. receipt v1 machine-enforces omission reasons, rename identity, exercise state/count/reason semantics, admission invariants, and privacy-safe repository identifiers;
4. receipt v1 now contains resolvable current-run `evidence[]`, with one semantic validator enforcing reference and cross-field integrity before emission; and
5. a stale plan audit cannot authorize implementation or merge — a fresh exact-HEAD consistency and branch-purity review is constitutional.

No product implementation exists on this branch.

## 2. Analyze Findings and Reconciliation

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| A1 | MAJOR / YAGNI | Config v1 allowed arbitrary task names and user-defined prerequisites, effectively a workflow DSL. | Config can override only fixed semantic tasks: `typecheck`, `lint`, `test`, `pytestBasic`; no user dependency/workflow graph. | RESOLVED |
| A2 | MAJOR / CONTRACT | Receipt required executor argv/tool identity even for tasks that never ran. | Non-executed tasks may carry empty argv/null tool identity; attempted execution requires real resolved identity. | RESOLVED |
| A3 | MAJOR / CONTRACT | Source stability and verification completeness were conflated. | Stability uses `stable`, `tree_drifted`, or `unknown`; completeness is a separate field. | RESOLVED |
| A4 | MAJOR / BINDING | “Relevant untracked files” was undefined and could omit source state. | All non-gitignored untracked files except `.ascout/` participate in M1 source identity. | RESOLVED |
| A5 | MAJOR / BINDING | Unstaged mode/type changes could disappear if only bytes were hashed. | Tree digest includes current type/mode plus content/symlink/deletion state. | RESOLVED |
| A6 | MAJOR / SECURITY | Persisted Git origin could expose credentials/userinfo/query material. | Raw origin is never persisted; persisted remote identity is an opaque hash-derived identifier. | RESOLVED |
| A7 | MAJOR / SECURITY | Persisted argv could expose secret values even when output was redacted. | Persisted/rendered argv uses exact-value redaction; raw argv is transient launch input only. | RESOLVED |
| A8 | BLOCKER / PRODUCT HONESTY | Earlier semantics allowed exit `0` with material changed executable exercise gaps. | Remaining `NOT_EXERCISED`/`UNRESOLVED` changed executable lines after permitted widening produce `materially_incomplete`, stable exit `4`. | RESOLVED |
| A9 | MAJOR / EVIDENCE | One failing observation was treated as `reproduced=false`. | One/inconclusive observation becomes `unknown`; repeated consistent failures may be true; contradictory valid observations are flaky. | RESOLVED |
| A10 | MINOR / CONTRACT | Optional fingerprint schema was internally inconsistent. | Fingerprint version accepts integer `1` or null; fingerprint is constrained or null. | RESOLVED |
| A11 | MAJOR / CONTRACT | Receipt task/selection shapes were too open for a versioned v1 contract. | Fixed task types, explicit scope, explicit bounded SelectionPass, maximum two passes. | RESOLVED |

## 3. Pre-Final-Audit Corrections

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| H1 | MAJOR / PRIVACY | Raw absolute local repo path could leak through local-only identity. | `local:<sha256(canonical-real-path)>`, `portable=false`; raw absolute path forbidden in persisted/rendered evidence. | RESOLVED |
| H2 | MINOR / PROVENANCE | Spec Kit provenance used only a short SHA. | Full v0.16.0 commit pinned: `5dce710ce099067c7d3f2ef47a37b9a1c300b327`. | RESOLVED |
| H3 | MINOR / TASK QUALITY | Release qualification was bundled into an oversized task. | License/provenance, package identity, and clean-checkout qualification are atomic tasks. | RESOLVED |
| H4 | BLOCKER / EXECUTION AUTHORITY | “Warn then execute” remained unsafe when the AI changed the exact package/test/compiler/lint configuration Ascout was about to execute/load. | Default refusal: affected task is `NOT_RUN(command_surface_changed)`. Explicit `--allow-changed-command-surface` is per invocation only, receipt-visible, not persisted, and never auto-added by agents/hooks. | RESOLVED |

## 4. Qodo Exact-Head Review Reconciliation

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| Q1 | HIGH / CORRECTNESS | Receipt v1 allowed `NOT_RUN`, `BLOCKED`, or `ERROR` with null reason fields. | Schema/data model/plan/tasks require non-empty `reason_code` and `reason_text` for all three statuses. | RESOLVED |
| Q2 | HIGH / CORRECTNESS | `change_kind=renamed` did not require `previous_path`. | Receipt v1 requires `previous_path` for rename and forbids it for non-rename change kinds. | RESOLVED |
| Q3 | MEDIUM / CORRECTNESS | `UNRESOLVED` exercise records could omit explanation and state/count combinations were underconstrained. | `UNRESOLVED` requires null count + non-empty reason; `EXERCISED` requires count > 0; `NOT_EXERCISED` requires count 0. | RESOLVED |
| Q4 | LOW / MAINTAINABILITY | Fixed pytest task identifier differed between config and receipt. | `pytestBasic` is the one canonical v1 identifier across config, receipt, model, plan, spec-facing docs, and tests. | RESOLVED |

Qodo automatically marked all four review threads resolved after the repairs were visible.

## 5. CodeRabbit Exact-Head Review Reconciliation

CodeRabbit reviewed the same planning PR independently. Nine material observations/confirmations were reconciled. One was a formatting defect, several were machine-contract/security defects, and one confirmed an admission repair that had already landed independently.

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| CR1 | MAJOR / GOVERNANCE | Workflow could move from final audit to implementation authorization without a fresh exact-HEAD review. | Constitution, Spec Kit provenance, and Master Plan now require fresh exact-HEAD cross-artifact consistency + branch-purity review before authorization/merge consideration. | RESOLVED |
| CR2 | MAJOR / SECURITY | Master Plan still described changed command surfaces as warning-only despite stricter spec/constitution. | Master Plan now requires default `NOT_RUN(command_surface_changed)` and explicit receipt-visible per-run human admission. | RESOLVED |
| CR3 | MINOR / DOCUMENT INTEGRITY | Literal pipe characters inside analysis-table code spans broke Markdown table column counts. | Table cells were rewritten to avoid literal pipe separators; the analysis table now renders structurally. | RESOLVED |
| CR4 | MAJOR / EVIDENCE INTEGRITY | Task/finding `evidence_ids` referenced no root evidence collection. | Receipt v1 now requires root current-run `evidence[]`; model/spec/plan/tasks require unique/resolvable run/task/artifact links. | RESOLVED |
| CR5 | MAJOR / PRIVACY | Receipt schema accepted arbitrary repository ID strings, including credential-bearing URLs or raw paths. | Source-state schema now discriminates `remote:<sha256>` with `portable=true` and `local:<sha256>` with `portable=false`. | RESOLVED |
| CR6 | MAJOR / AUTHORIZATION | A changed command surface could previously be represented with normal admission. | Receipt v1 requires changed surfaces to use refused or explicit-override admission and at least one authority path. This had already been repaired independently and CodeRabbit confirmed it. | RESOLVED |
| CR7 | MAJOR / DATA INTEGRITY | JSON Schema field checks alone could permit inconsistent stability, task state, completeness, evidence references, and exit code. | One Ascout-owned pure semantic receipt validator is required before emission and reused by any internal/future acceptance path. | RESOLVED |
| CR8 | MINOR / BENCHMARK | Benchmark plan measured gap accuracy but lacked an explicit assertion that stable material gaps map to exit `4`. | Plan + T077 now assert stable material exercise gaps returning exit `0` must equal zero. | RESOLVED |
| CR9 | MINOR / AUTHORIZATION | `pytestBasic` was executable but absent from command-admission integration coverage. | T028 and plan/spec now include effective pytest configuration in the admission matrix. | RESOLVED |

No CodeRabbit finding justified a new service, DB, trust store, workflow engine, schema-generation subsystem, or task range.

## 6. Constitution Compliance Re-check

| Rule | Repaired evidence | Result |
|---|---|---|
| Evidence before claims | Root current-run evidence collection; all exposed evidence refs must resolve; weak fingerprints never substitute for evidence | PASS |
| No green by omission | Task omissions require reasons; admission refusals and exercise gaps cannot become clean success | PASS |
| Source-bound truth | Opaque hashed repo ID; HEAD/index/worktree/all-nonignored-untracked digest; start/end drift; rename fidelity | PASS |
| Explicit authority | Own trusted repo boundary; changed effective command surface defaults to refusal; per-run human override only; pytest included | PASS |
| Native capability first | Git/Vitest/Jest/LCOV; no semantic impact graph | PASS |
| Conservative affected verification | Native selection plus finite widening; unresolved material gap is incomplete | PASS |
| Minimal core | No DB/daemon/server/Rust/plugin SDK/LLM/cloud; one planned runtime dependency; semantic validator is a pure function | PASS |
| Bounded/read-only/private | timeout/tree-kill/lock/retention; hashed repo identity; output/argv privacy | PASS |
| Provenance/licensing | Apache-2.0; full Spec Kit provenance; exact dependency review release gate | PASS |
| Benchmark-gated growth | Real-history corpus; false-PASS/gap/timing metrics; zero binding leak and zero gap-to-green absolute gates | PASS |
| Fresh-head governance | Final audit is followed by exact-HEAD consistency and branch-purity review before authorization | PASS |

No constitutional exception is accepted.

## 7. Requirement / Task Traceability

- **Source binding, privacy, task honesty, admission, receipt/evidence invariants — FR-001…FR-014 and FR-039…FR-041:** T008–T043, especially T009/T012/T018/T020/T025/T026/T028/T033/T038.
- **Affected selection and exercise gaps — FR-015…FR-023:** T044–T056; T047 locks state/count/reason semantics and T049 is the explicit no-green gap gate.
- **Selection/drift/flake — US3:** T057–T064.
- **Test facts and bounded agent output — US4:** T065–T070.
- **Benchmark integrity:** T071–T078, with T077 enforcing zero gap-to-green cases.
- **Cross-platform/release/governance hardening:** T079–T088.

No orphan functional requirement is known. No task requires an out-of-scope architecture subsystem.

## 8. Semantics Matrix

Source stability, verification completeness, task outcome, selection disclosure, command admission, evidence integrity, and receipt explanation are orthogonal.

- `ERROR` does not imply tree drift, but requires non-empty reason code/text.
- `tree_drifted` does not erase task observations.
- valid affected deselection is disclosed selection, not task `NOT_RUN`.
- applicable `NOT_RUN`/`BLOCKED` work makes verification incomplete and carries explicit reason code/text.
- `refused_changed_surface` makes the affected task `NOT_RUN(command_surface_changed)` and the stable run incomplete.
- material `NOT_EXERCISED`/`UNRESOLVED` changed executable lines make verification incomplete; unresolved records explain mapping uncertainty.
- task/finding evidence references must resolve to current-run evidence entries linked to valid tasks/artifacts.
- repository finding/flake maps to exit `1` absent a higher-precedence integrity/drift condition.

Exit precedence remains:

```text
2 integrity/config/internal/task-execution error
> 3 tree drift
> 1 repository finding or flake
> 4 stable materially incomplete/gapped/admission-refused
> 0 stable complete no finding/flake/error
```

## 9. Command-Admission Contract

For each executable task Ascout identifies the **effective authority files actually used** to derive or load its command/configuration. If any of those paths changed in the current comparison:

- normal execution is refused before launch/load;
- task status is `NOT_RUN` with reason `command_surface_changed`;
- changed authority paths are recorded;
- `execution_admission=refused_changed_surface`;
- a developer may explicitly use `ascout check --allow-changed-command-surface` after review;
- that override is valid only for that invocation and recorded as `explicit_changed_surface_override`;
- the override is not config, remembered trust, or automatic agent-hook behavior.

Receipt v1 enforces that `command_surface_changed=true` requires at least one changed authority path and cannot use normal admission. The admission integration matrix includes `pytestBasic` and effective pytest config sources.

## 10. Machine Contract Re-check

### Config v1

Fixed semantic task overrides only; strict top-level keys; canonical identifiers `typecheck`, `lint`, `test`, `pytestBasic`; no executable config, user task graph, persistent admission, or trust grant.

### Receipt v1

Strict fixed task/selection shapes; same canonical task identifiers as config; opaque hashed repository IDs; honest null/empty unresolved executor fields; explicit reasons for `NOT_RUN`/`BLOCKED`/`ERROR`; strict rename previous-path identity; strict exercise count/reason semantics; separate stability/completeness; admission state and authority paths; root `evidence[]`; redacted persisted argv; weak optional fingerprint.

### Semantic validator

One pure Ascout-owned validator must reject:

- duplicate/dangling/cross-run/cross-task evidence references;
- unresolved artifact references;
- source stability inconsistent with start/end state;
- task reason/admission inconsistencies;
- exercise records inconsistent with exercise summaries;
- aggregate task/finding counts inconsistent with records;
- completeness/exit code inconsistent with underlying state.

JSON Schema remains field-shape validation; the semantic validator handles cross-object relations that JSON Schema draft 2020-12 cannot express cleanly.

No known machine-contract contradiction remains after Qodo + CodeRabbit reconciliation.

## 11. Benchmark Validity

Selection corpus compares Ascout/native selection to objective full-suite ground truth. Gap corpus measures changed executable exercise against independent full-run coverage. Metrics include false-PASS, selection recall, gap accuracy, unresolved mapping, drift, determinism, flake, and cold/warm time.

Absolute gates:

```text
cross-tree evidence leakage = 0
binding-integrity violations = 0
stable material exercise gap returning exit 0 = 0
```

No pre-data recall threshold is fabricated.

## 12. Residual Implementation / Release Gates — Not Planning Blockers

1. exact `cross-spawn` version and transitive license/provenance;
2. exact benchmark repositories/commits and execution/license terms;
3. npm package ownership or scoped fallback;
4. Windows process-tree termination proof on native Windows CI;
5. real Vitest/Jest/pytest version variance and benchmark-discovered selector misses;
6. measured time-to-signal/performance.

Each has an explicit task/release gate.

## 13. Analyze Gate Verdict

`PASS_AFTER_REPAIR`

- open internal BLOCKER findings: **0**
- open internal MAJOR findings: **0**
- accepted Qodo findings unrepaired: **0**
- accepted CodeRabbit findings unrepaired in the current artifacts: **0**
- unresolved constitutional violations: **0**
- orphan functional requirements: **0**
- product implementation files on planning branch: **0**

Proceed to the repaired-head 84/84 checklist, Ponytail/YAGNI re-check, renewed final audit, and a fresh exact-HEAD external review. This analysis does not authorize implementation or merge.