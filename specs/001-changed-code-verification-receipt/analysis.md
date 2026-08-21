# 001 — Cross-Artifact Analysis

**Date:** 2026-08-22  
**Scope:** Constitution → canonical Master Plan v1 → spec/clarifications → research → plan → data model → config/receipt contracts → quickstart → tasks → checklist → YAGNI → Qodo + CodeRabbit review reconciliation.  
**Result:** `PASS_AFTER_REPAIR`  
**Implementation authorization:** **NO** — fresh exact-HEAD external review and branch-purity verification remain mandatory.

## 1. Executive Result

Ascout's founding planning set has been repeatedly challenged rather than accepted at face value. Internal analysis, independent adversarial audit, Qodo, and CodeRabbit exposed defects in execution authority, no-green semantics, source/evidence identity, receipt integrity, persisted-path privacy and canonical serialization, executable regression coverage, path-validation ordering, benchmark truthfulness, exact-head governance, and canonical-document authority.

Every accepted finding through CodeRabbit CR15 is repaired in the current planning set.

No product implementation is authorized or present.

## 2. Internal / Pre-PR Findings

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| A1 | MAJOR / YAGNI | Config behaved like a user workflow/task DSL. | Fixed M1 task overrides only: `typecheck`, `lint`, `test`, `pytestBasic`; no user graph. | RESOLVED |
| A2 | MAJOR / CONTRACT | Non-executed tasks could be forced to fabricate executor identity. | Empty argv/null tool identity permitted when safe resolution never occurred. | RESOLVED |
| A3 | MAJOR / CONTRACT | Source stability and verification completeness were conflated. | Separate `stable`, `tree_drifted`, or `unknown` from completeness. | RESOLVED |
| A4 | MAJOR / BINDING | Untracked source identity scope was ambiguous. | All non-gitignored untracked files except `.ascout/` are source-bound. | RESOLVED |
| A5 | MAJOR / BINDING | Worktree mode/type changes could disappear. | Tree identity includes current type/mode/content/deletion state. | RESOLVED |
| A6 | MAJOR / PRIVACY | Raw Git origin could expose sensitive location material. | Opaque hashed remote identity; raw origin never persists. | RESOLVED |
| A7 | MAJOR / PRIVACY | Persisted argv could expose secrets. | Persisted/rendered argv is redacted; raw argv is transient. | RESOLVED |
| A8 | BLOCKER / PRODUCT HONESTY | Material changed executable gaps could coexist with exit `0`. | Remaining `NOT_EXERCISED`/`UNRESOLVED` ⇒ incomplete, stable exit `4`. | RESOLVED |
| A9 | MAJOR / EVIDENCE | One failure observation was overclaimed as reproduction state. | One observation ⇒ `unknown`; repeated consistent failure may be true; contradiction ⇒ flaky. | RESOLVED |
| A10 | MINOR / CONTRACT | Weak fingerprint schema was internally inconsistent. | Version `1` or null; digest constrained or null. | RESOLVED |
| A11 | MAJOR / CONTRACT | Receipt task/selection shapes were too open. | Fixed task types/scopes and at most two selection passes. | RESOLVED |
| H1 | MAJOR / PRIVACY | Local-only identity could leak workstation path. | `local:<sha256(canonical-real-path)>`, `portable=false`; raw path forbidden. | RESOLVED |
| H2 | MINOR / PROVENANCE | Spec Kit provenance used an incomplete pin. | Full v0.16.0 commit recorded. | RESOLVED |
| H3 | MINOR / TASK QUALITY | Release qualification was bundled. | License/provenance/package/clean-checkout gates remain atomic. | RESOLVED |
| H4 | BLOCKER / EXECUTION AUTHORITY | Changed command/config surface was warn-then-execute. | Default refusal as `NOT_RUN(command_surface_changed)`; explicit per-run human override only. | RESOLVED |

## 3. Qodo Reconciliation

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| Q1 | HIGH | `NOT_RUN`/`BLOCKED`/`ERROR` could lack reasons. | Non-empty machine + human reasons required. | RESOLVED |
| Q2 | HIGH | Rename could omit old path. | `renamed` requires `previous_path`; non-renames do not fabricate it. | RESOLVED |
| Q3 | MEDIUM | Exercise state/count/reason combinations were underconstrained. | `EXERCISED >0`, `NOT_EXERCISED=0`, `UNRESOLVED=null + reason`. | RESOLVED |
| Q4 | LOW | `pytestBasic` / `pytest_basic` mismatch. | `pytestBasic` is canonical everywhere. | RESOLVED |

Later Qodo repetitions of Q1–Q4 were checked against exact linked SHAs and contradicted the live repaired schema. They are stale/cached repetitions, not new findings. A fresh final-head Qodo pass remains required after the renewed audit.

## 4. CodeRabbit Reconciliation

| ID | Severity | Finding | Resolution | Status |
|---|---|---|---|---|
| CR1 | MAJOR / GOVERNANCE | Final audit could be stale before authorization. | Fresh exact-HEAD consistency + branch purity is mandatory after material mutation and before merge/implementation. | RESOLVED |
| CR2 | MAJOR / SECURITY | Master Plan still had weaker changed-command wording. | Canonical plan matches default-refusal semantics. | RESOLVED |
| CR3 | MINOR | Markdown analysis table was malformed by literal separators. | Table structure repaired. | RESOLVED |
| CR4 | MAJOR / EVIDENCE | `evidence_ids` had no root evidence collection. | Receipt requires current-run `evidence[]`; references resolve semantically. | RESOLVED |
| CR5 | MAJOR / PRIVACY | Repository ID schema accepted raw location strings. | `remote:<sha256>` / `local:<sha256>` discriminator with portability flags. | RESOLVED |
| CR6 | MAJOR / AUTHORITY | Changed command surface could still be `normal` admission. | Changed surface requires refused or explicit override + authority paths. | RESOLVED |
| CR7 | MAJOR / DATA INTEGRITY | JSON Schema alone could accept cross-field contradictions. | One pure semantic receipt validator runs before emission and any future internal acceptance. | RESOLVED |
| CR8 | MINOR / BENCHMARK | Benchmark did not explicitly test gap→exit mapping. | Stable material gap returning exit `0` has acceptable count zero. | RESOLVED |
| CR9 | MINOR / AUTHORITY | `pytestBasic` absent from admission test matrix. | Effective pytest config participates in the same admission mechanism. | RESOLVED |
| CR10 | MAJOR / PRIVACY | Persisted path fields accepted absolute/traversal/host-native forms. | Shared canonical relative path contract + semantic namespace containment; POSIX/drive/UNC/URI/backslash/traversal forms rejected. | RESOLVED |
| CR11 | MINOR / PLAN | Opening plan summary omitted `pytestBasic`. | Summary explicitly names all four fixed task categories. | RESOLVED |
| CR12 | BLOCKER / GOVERNANCE | Two live `Master Plan v1` files both looked authoritative and differed materially. | `docs/founding/ASCOUT_MASTER_PLAN_V1.md` is now an explicit `SUPERSEDED / NON-AUTHORITATIVE` tombstone. The sole canonical plan is `docs/founding/MASTER_PLAN_V1.md`; the old path MUST NOT be used for implementation authorization, Spec Kit derivation, requirement interpretation, task planning, review, or release decisions. | RESOLVED |
| CR13 | MAJOR / DATA INTEGRITY | The shared path regex still accepted noncanonical serialized forms such as `src//file.ts` and `src/`. | `canonicalRelativePath` requires non-empty slash-delimited segments with no trailing separator while preserving prior absolute/drive/URI/backslash/dot-segment exclusions. CHK088 locks the contract regression. | RESOLVED |
| CR14 | MAJOR / TESTABILITY | CR13's exact regression forms were locked in checklist prose but not explicitly required by implementation-test tasks. | T009, T033, and T081 explicitly require duplicate-separator and trailing-separator regression cases, including `src//file.ts` and `src/`. CHK089 locks task-plan executability. | RESOLVED |
| CR15 | MAJOR / DATA INTEGRITY | Planning prose allowed lossy normalization before validation, which could collapse `src//file.ts` to `src/file.ts`, strip `src/`, or resolve traversal before the validator saw the forbidden original spelling. | `plan.md`, `data-model.md`, `spec.md`, T009/T025/T033/T081 now require fail-closed validation of the original receipt candidate spelling before any lossy normalization/collapse/resolution; invalid spellings are rejected and never repaired. CHK090 locks the ordering invariant. | RESOLVED |

CR12 is governance-only. CR13 strengthens the existing path predicate. CR14 strengthens existing test tasks. CR15 fixes ordering inside the same path-validation invariant. None adds an architecture subsystem, runtime capability, dependency, or task ID.

## 5. Canonical Planning Authority

There is exactly one live normative Master Plan v1:

```text
docs/founding/MASTER_PLAN_V1.md
```

Legacy path:

```text
docs/founding/ASCOUT_MASTER_PLAN_V1.md
```

is a tombstone only. It contains no alternate normative requirements and explicitly prohibits use for implementation authorization or Spec Kit derivation.

Historical text remains available through Git history, not as a second live specification.

## 6. Constitution / Product Truth Re-check

| Rule | Result |
|---|---|
| Evidence before claims; current-run evidence refs resolve | PASS |
| No green by omission or changed-code exercise gap | PASS |
| Exact source binding + drift + no evidence reuse | PASS |
| Changed command/config authority defaults to refusal | PASS |
| Opaque remote/local repository identity | PASS |
| Canonical relative persisted paths only, with unique slash-segment serialization | PASS |
| Invalid receipt path spellings are rejected before lossy normalization and never repaired | PASS |
| CR13 exact path regressions are executable test requirements | PASS |
| Native capability before custom infrastructure | PASS |
| Bounded widening and execution | PASS |
| Minimal core; no DB/daemon/graph/plugin/AI/path subsystem | PASS |
| Benchmark absolute integrity gates | PASS |
| Fresh exact-head governance | PASS |
| Single canonical Master Plan authority | PASS |

No constitutional exception is accepted.

## 7. Requirement / Task Traceability

- Source/evidence/task/admission/privacy invariants: T008–T043.
- Persisted path containment and canonical serialization (FR-042 / SC-015): T009, T025, T026, T033, T081.
- CR13/CR14/CR15 executable regressions: T009 contract/semantic negatives, T025 validator ordering, T033 end-to-end rejection, and T081 cross-platform golden checks explicitly prove raw invalid spellings — including duplicate/trailing separators and concrete `src//file.ts` / `src/` cases — are rejected before lossy normalization and never repaired.
- Affected selection/exercise: T044–T056.
- Drift/flake: T057–T064.
- Test facts/agent receipt: T065–T070.
- Benchmark integrity: T071–T078, especially T077.
- Cross-platform/release/governance: T079–T088.

Task range remains exactly **T001–T088**. No new task ID is added for CR12–CR15 because the repairs strengthen existing governance, contract, validator-ordering, and test invariants.

## 8. Machine Contract Re-check

Receipt v1 has:

- fixed task IDs;
- explicit omission/error reasons;
- strict rename and exercise invariants;
- admission invariants;
- opaque repository IDs;
- root `evidence[]`;
- canonical persisted path schema with one serialized slash-separated representation per accepted segment sequence;
- original-spelling fail-closed rejection before any lossy normalization or path repair;
- separate stability/completeness;
- one pure semantic validator for referential/cross-field/path containment/exit consistency.

The implementation plan requires exact regression tests for duplicate/trailing separators and verifies the validator cannot normalize those failures away.

No known machine-contract or testability contradiction remains.

## 9. Benchmark Gates

```text
cross-tree evidence leakage = 0
binding-integrity violations = 0
stable material exercise gap returning exit 0 = 0
```

No invented pre-data recall threshold is frozen.

## 10. Requirements Gate

Current checklist:

```text
90 / 90 PASS
```

CHK087 locks the single canonical Master Plan authority. CHK088 locks canonical path serialization. CHK089 locks explicit implementation-test coverage for the exact CR13 regression forms. CHK090 locks raw-form rejection before lossy normalization/repair.

## 11. Analyze Verdict

`PASS_AFTER_REPAIR`

- open internal BLOCKER findings: **0**
- open internal MAJOR findings: **0**
- accepted Qodo findings unrepaired: **0**
- accepted CodeRabbit findings CR1–CR15 unrepaired: **0**
- requirements/contract/governance checks: **90/90 PASS**
- unresolved constitutional violations: **0**
- orphan product requirements: **0**
- product implementation files: **0**

Proceed only to renewed exact-head branch-purity verification, renewed final plan audit, and fresh external exact-HEAD review. This analysis does not authorize implementation or merge.