# 001 — Cross-Artifact Analysis

**Date:** 2026-08-21  
**Scope:** Constitution → Master Plan v1 → spec/clarifications → research → plan → data model → config/receipt contracts → quickstart → tasks → requirements checklist → YAGNI gates → two exact-head CodeRabbit review rounds + Qodo review.  
**Method:** Spec Kit-style consistency/coverage analysis plus Ponytail/YAGNI, privacy, authority, no-green-by-omission, machine-contract integrity, path containment, and external-review reconciliation.  
**Result:** `PASS_AFTER_REPAIR`  
**Implementation authorization:** **NO** — a fresh exact-head external review and final branch-purity review remain merge/authorization gates.

## 1. Executive Result

The founding planning set was not accepted at face value. Internal analysis, independent audits, Qodo review, and two CodeRabbit exact-head review rounds found material defects in product honesty, machine contracts, privacy, YAGNI, execution authority, evidence integrity, path persistence, and governance freshness.

Every accepted finding is repaired in the current planning artifacts before implementation.

The highest-severity repairs are:

1. changed executable code remaining `NOT_EXERCISED` or `UNRESOLVED` can never return clean exit `0`;
2. a repository command/config surface changed by the current AI edit is **not executed by default**;
3. receipt v1 machine-enforces omission reasons, rename identity, exercise state/count/reason semantics, admission invariants, and privacy-safe repository identifiers;
4. receipt v1 contains resolvable current-run `evidence[]`, with one pure semantic validator enforcing reference and cross-field integrity before emission;
5. every persisted path-bearing receipt field uses a canonical relative form in its repository/run namespace, rejecting absolute/drive/UNC/URI/backslash/traversal forms; and
6. a stale plan audit cannot authorize implementation or merge — a fresh exact-HEAD consistency and branch-purity review is constitutional.

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

## 3. Pre-PR Independent Corrections

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| H1 | MAJOR / PRIVACY | Raw absolute local repo path could leak through local-only identity. | `local:<sha256(canonical-real-path)>`, `portable=false`; raw absolute path forbidden in persisted/rendered evidence. | RESOLVED |
| H2 | MINOR / PROVENANCE | Spec Kit provenance used only a short SHA. | Full v0.16.0 commit pinned: `5dce710ce099067c7d3f2ef47a37b9a1c300b327`. | RESOLVED |
| H3 | MINOR / TASK QUALITY | Release qualification was bundled into an oversized task. | License/provenance, package identity, and clean-checkout qualification are atomic tasks. | RESOLVED |
| H4 | BLOCKER / EXECUTION AUTHORITY | “Warn then execute” remained unsafe when the AI changed the exact package/test/compiler/lint configuration Ascout was about to execute/load. | Default refusal: affected task is `NOT_RUN(command_surface_changed)`. Explicit `--allow-changed-command-surface` is per invocation only, receipt-visible, not persisted, and never auto-added by agents/hooks. | RESOLVED |

## 4. Qodo Review Reconciliation

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| Q1 | HIGH / CORRECTNESS | Receipt v1 allowed `NOT_RUN`, `BLOCKED`, or `ERROR` with null reason fields. | Schema/data model/plan/tasks require non-empty `reason_code` and `reason_text` for all three statuses. | RESOLVED |
| Q2 | HIGH / CORRECTNESS | `change_kind=renamed` did not require `previous_path`. | Receipt v1 requires `previous_path` for rename and forbids it for non-rename change kinds. | RESOLVED |
| Q3 | MEDIUM / CORRECTNESS | `UNRESOLVED` exercise records could omit explanation and state/count combinations were underconstrained. | `UNRESOLVED` requires null count + non-empty reason; `EXERCISED` requires count > 0; `NOT_EXERCISED` requires count 0. | RESOLVED |
| Q4 | LOW / MAINTAINABILITY | Fixed pytest task identifier differed between config and receipt. | `pytestBasic` is the one canonical v1 identifier across config, receipt, model, plan, spec-facing docs, and tests. | RESOLVED |

Qodo later repeated these same four findings while linking to a newer SHA. Direct inspection of that exact SHA showed the repaired constraints were already present, so those repetitions were stale/cached findings rather than new contract defects.

## 5. CodeRabbit Review Round 1 Reconciliation

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| CR1 | MAJOR / GOVERNANCE | Workflow could move from final audit to implementation authorization without a fresh exact-HEAD review. | Constitution, Spec Kit provenance, and Master Plan require fresh exact-HEAD cross-artifact consistency + branch-purity review before authorization/merge consideration. | RESOLVED |
| CR2 | MAJOR / SECURITY | Master Plan still described changed command surfaces as warning-only despite stricter spec/constitution. | Master Plan requires default `NOT_RUN(command_surface_changed)` and explicit receipt-visible per-run human admission. | RESOLVED |
| CR3 | MINOR / DOCUMENT INTEGRITY | Literal pipe characters inside analysis-table code spans broke Markdown table column counts. | Table cells were rewritten to avoid literal separators. | RESOLVED |
| CR4 | MAJOR / EVIDENCE INTEGRITY | Task/finding `evidence_ids` referenced no root evidence collection. | Receipt v1 requires root current-run `evidence[]`; model/spec/plan/tasks require unique/resolvable run/task/artifact links. | RESOLVED |
| CR5 | MAJOR / PRIVACY | Receipt schema accepted arbitrary repository ID strings, including credential-bearing URLs or raw paths. | Source-state schema discriminates `remote:<sha256>` with `portable=true` and `local:<sha256>` with `portable=false`. | RESOLVED |
| CR6 | MAJOR / AUTHORIZATION | A changed command surface could be represented with normal admission. | Receipt v1 requires changed surfaces to use refused or explicit-override admission and at least one authority path. | RESOLVED |
| CR7 | MAJOR / DATA INTEGRITY | JSON Schema field checks alone could permit inconsistent stability, task state, completeness, evidence references, and exit code. | One Ascout-owned pure semantic receipt validator is required before emission and reused by any internal/future acceptance path. | RESOLVED |
| CR8 | MINOR / BENCHMARK | Benchmark plan lacked an explicit assertion that stable material gaps map to exit `4`. | Plan + T077 assert stable material exercise gaps returning exit `0` must equal zero. | RESOLVED |
| CR9 | MINOR / AUTHORIZATION | `pytestBasic` was executable but absent from command-admission integration coverage. | T028 and plan/spec include effective pytest configuration in the admission matrix. | RESOLVED |

## 6. CodeRabbit Review Round 2 Reconciliation

The second fresh CodeRabbit review was explicitly anchored to exact head `15f590efcff6814ea5c203f96e3513c9ba0d2a08` and reported exactly two new actionable findings.

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| CR10 | MAJOR / SECURITY & PRIVACY | Persisted path fields accepted host absolute, Windows drive/UNC, URI-absolute, and traversal forms, permitting workstation/location leakage and namespace escape. | Added one shared `canonicalRelativePath` schema contract plus the existing pure semantic validator. Repository fields are repo-root-relative; `artifact.relative_run_path` is run-directory-relative. POSIX absolute, Windows drive/UNC, URI-absolute, backslash-canonicalization violations, and `.`/`..` traversal are rejected after normalization. FR-042/SC-015 and T009/T025/T026/T033/T081 lock the behavior. | RESOLVED |
| CR11 | MINOR / PLAN CONSISTENCY | Opening plan summary named fixed `typecheck`/`lint`/`test` categories but omitted canonical executable `pytestBasic`. | Opening summary now explicitly names all four fixed categories: `typecheck`, `lint`, `test`, `pytestBasic`. | RESOLVED |

The path repair is deliberately a predicate over existing receipt fields. It does not add a virtual filesystem, path registry, mount abstraction, path-policy service, dependency, or task range.

## 7. Constitution Compliance Re-check

| Rule | Repaired evidence | Result |
|---|---|---|
| Evidence before claims | Root current-run evidence collection; all exposed evidence refs resolve; weak fingerprints never substitute for evidence | PASS |
| No green by omission | Task omissions require reasons; admission refusals and exercise gaps cannot become clean success | PASS |
| Source-bound truth | Opaque hashed repo ID; HEAD/index/worktree/all-nonignored-untracked digest; start/end drift; rename fidelity | PASS |
| Explicit authority | Own trusted repo boundary; changed effective command surface defaults to refusal; per-run human override only; pytest included | PASS |
| Persisted path privacy/integrity | Repository/run path fields are canonical relative; absolute/drive/UNC/URI/backslash/traversal forms fail validation | PASS |
| Native capability first | Git/Vitest/Jest/LCOV; no semantic impact graph | PASS |
| Conservative affected verification | Native selection plus finite widening; unresolved material gap is incomplete | PASS |
| Minimal core | No DB/daemon/server/Rust/plugin SDK/LLM/cloud/path subsystem; one planned runtime dependency; semantic validator is a pure function | PASS |
| Bounded/read-only/private | timeout/tree-kill/lock/retention; hashed repo identity; relative persisted paths; output/argv privacy | PASS |
| Provenance/licensing | Apache-2.0; full Spec Kit provenance; exact dependency review release gate | PASS |
| Benchmark-gated growth | Real-history corpus; false-PASS/gap/timing metrics; zero binding leak and zero gap-to-green absolute gates | PASS |
| Fresh-head governance | Final audit is followed by exact-HEAD consistency and branch-purity review before authorization | PASS |

No constitutional exception is accepted.

## 8. Requirement / Task Traceability

- **Source binding, privacy, task honesty, admission, receipt/evidence invariants — FR-001…FR-014 and FR-039…FR-041:** T008–T043, especially T009/T012/T018/T020/T025/T026/T028/T033/T038.
- **Persisted path containment — FR-042 / SC-015:** T009 contract/negative cases; T025 pure path invariant; T026 validation before emission; T033 end-to-end rejection; T081 cross-OS normalization/golden cases.
- **Affected selection and exercise gaps — FR-015…FR-023:** T044–T056; T047 locks state/count/reason semantics and T049 is the explicit no-green gap gate.
- **Selection/drift/flake — US3:** T057–T064.
- **Test facts and bounded agent output — US4:** T065–T070.
- **Benchmark integrity:** T071–T078, with T077 enforcing zero gap-to-green cases.
- **Cross-platform/release/governance hardening:** T079–T088.

No orphan functional requirement is known. Task range remains exactly **T001–T088**. No task requires an out-of-scope architecture subsystem.

## 9. Semantics Matrix

Source stability, verification completeness, task outcome, selection disclosure, command admission, evidence integrity, path canonicality, and receipt explanation are orthogonal.

- `ERROR` does not imply tree drift, but requires non-empty reason code/text.
- `tree_drifted` does not erase task observations.
- valid affected deselection is disclosed selection, not task `NOT_RUN`.
- applicable `NOT_RUN`/`BLOCKED` work makes verification incomplete and carries explicit reason code/text.
- `refused_changed_surface` makes the affected task `NOT_RUN(command_surface_changed)` and the stable run incomplete.
- material `NOT_EXERCISED`/`UNRESOLVED` changed executable lines make verification incomplete; unresolved records explain mapping uncertainty.
- task/finding evidence references must resolve to current-run evidence entries linked to valid tasks/artifacts.
- invalid/noncanonical persisted paths invalidate the receipt; they are not silently rewritten into misleading safe-looking paths.
- repository finding/flake maps to exit `1` absent a higher-precedence integrity/drift condition.

Exit precedence remains:

```text
2 integrity/config/internal/task-execution error
> 3 tree drift
> 1 repository finding or flake
> 4 stable materially incomplete/gapped/admission-refused
> 0 stable complete no finding/flake/error
```

## 10. Command-Admission Contract

For each executable task Ascout identifies the **effective authority files actually used** to derive or load its command/configuration. If any of those paths changed in the current comparison:

- normal execution is refused before launch/load;
- task status is `NOT_RUN` with reason `command_surface_changed`;
- changed authority paths are canonical repository-relative paths;
- `execution_admission=refused_changed_surface`;
- a developer may explicitly use `ascout check --allow-changed-command-surface` after review;
- that override is valid only for that invocation and recorded as `explicit_changed_surface_override`;
- the override is not config, remembered trust, or automatic agent-hook behavior.

Receipt v1 enforces that `command_surface_changed=true` requires at least one changed authority path and cannot use normal admission. The admission integration matrix includes `pytestBasic` and effective pytest config sources.

## 11. Machine Contract Re-check

### Config v1

Fixed semantic task overrides only; strict top-level keys; canonical identifiers `typecheck`, `lint`, `test`, `pytestBasic`; no executable config, user task graph, persistent admission, or trust grant.

### Receipt v1

Strict fixed task/selection shapes; same canonical task identifiers as config; opaque hashed repository IDs; honest null/empty unresolved executor fields; explicit reasons for `NOT_RUN`/`BLOCKED`/`ERROR`; strict rename previous-path identity; strict exercise count/reason semantics; separate stability/completeness; admission state and authority paths; root `evidence[]`; redacted persisted argv; weak optional fingerprint.

`$defs.canonicalRelativePath` is reused by changed/previous paths, package scope, task source path, changed authority paths, exercise path, test-change paths, finding path, and artifact relative path. The schema rejects obvious invalid forms; the semantic validator additionally enforces normalization and namespace containment.

### Semantic validator

One pure Ascout-owned validator must reject:

- noncanonical or escaping persisted paths after normalization;
- duplicate/dangling/cross-run/cross-task evidence references;
- unresolved artifact references;
- source stability inconsistent with start/end state;
- task reason/admission inconsistencies;
- exercise records inconsistent with exercise summaries;
- aggregate task/finding counts inconsistent with records;
- completeness/exit code inconsistent with underlying state.

JSON Schema remains field-shape validation; the semantic validator handles cross-object/namespace relations that JSON Schema draft 2020-12 cannot express cleanly.

No known machine-contract contradiction remains after Qodo + both CodeRabbit reconciliation rounds.

## 12. Benchmark Validity

Selection corpus compares Ascout/native selection to objective full-suite ground truth. Gap corpus measures changed executable exercise against independent full-run coverage. Metrics include false-PASS, selection recall, gap accuracy, unresolved mapping, drift, determinism, flake, and cold/warm time.

Absolute gates:

```text
cross-tree evidence leakage = 0
binding-integrity violations = 0
stable material exercise gap returning exit 0 = 0
```

No pre-data recall threshold is fabricated.

## 13. Residual Implementation / Release Gates — Not Planning Blockers

1. exact `cross-spawn` version and transitive license/provenance;
2. exact benchmark repositories/commits and execution/license terms;
3. npm package ownership or scoped fallback;
4. Windows process-tree termination proof on native Windows CI;
5. real Vitest/Jest/pytest version variance and benchmark-discovered selector misses;
6. measured time-to-signal/performance.

Each has an explicit task/release gate.

## 14. Analyze Gate Verdict

`PASS_AFTER_REPAIR`

- open internal BLOCKER findings: **0**
- open internal MAJOR findings: **0**
- accepted Qodo findings unrepaired: **0**
- accepted CodeRabbit round-1 findings unrepaired: **0**
- accepted CodeRabbit round-2 findings unrepaired: **0**
- requirements/contract/governance checks: **86/86 PASS**
- unresolved constitutional violations: **0**
- orphan functional requirements: **0**
- product implementation files on planning branch: **0**

Proceed to exact repaired-head branch-purity verification, renewed final audit, and then a fresh exact-HEAD external review. This analysis does not authorize implementation or merge.