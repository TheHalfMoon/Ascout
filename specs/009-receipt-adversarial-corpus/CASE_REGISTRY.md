# Specification 009 — Exact Adversarial Case Registry

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`  
**Planning ledger:** Issue #252  
**Registry version:** `SPEC009-CASE-REGISTRY-V1`  
**Invalid cases:** `44`  
**Valid controls:** `2`

## Authority and purpose

This file is the exact planning-time case registry for T115.

T115 MUST implement and execute every case in this registry exactly once per focused corpus execution, plus both valid controls. T115 MUST NOT add, remove, rename, merge, split, skip, reclassify, or weaken any case expectation without a separately reviewed Spec 009 planning amendment that becomes canonical before implementation continues.

This registry removes implementation-time discretion over corpus completeness. It exists specifically to prevent green-by-omission.

The mutation descriptions below define the minimum semantic fault. Implementation may make only the additional bookkeeping changes strictly necessary to keep a `semantic` case JSON-Schema-valid and isolate the named semantic invariant. Those bookkeeping changes MUST NOT remove the named fault, change its expected layer, or introduce an alternate reason for success.

For `semantic` cases:

1. the candidate MUST pass exact current `validateReceiptJsonSchema` first;
2. exact current `validateReceiptSemantics` MUST reject it;
3. every listed required semantic issue code MUST be present;
4. additional issue codes are allowed only when they are a deterministic consequence of the same minimum mutation and MUST NOT substitute for a missing required code.

For `schema` cases:

1. exact current `validateReceiptJsonSchema` MUST reject the candidate;
2. no semantic-validator outcome may substitute for schema rejection.

## Valid controls

| ID | Control | Required result |
| --- | --- | --- |
| `control-valid-line-receipt` | Canonical deterministic Receipt v1 with one executed test task, resolvable evidence/artifact links, one changed executable line, complete line exercise accounting, stable source identity, consistent summary, and clean exit `0`. | Schema PASS and semantic PASS. |
| `control-valid-branch-receipt` | The line-receipt control extended with a minimal, canonically ordered, internally consistent branch-evidence group and matching branch aggregates. | Schema PASS and semantic PASS. |

Both controls are mandatory. A corpus that rejects either control is `NO_GO`.

## Schema-boundary cases

| ID | Minimum mutation | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `schema-root-missing-summary` | Remove root `summary`. | `schema` | n/a |
| `schema-root-additional-property` | Add one unknown root property. | `schema` | n/a |
| `schema-version-invalid` | Change `schema_version` from `1.0` to a different string. | `schema` | n/a |
| `schema-changed-path-backslash` | Change one canonical changed-file path to a backslash-containing path. | `schema` | n/a |
| `schema-changed-range-zero-endpoint` | Change one changed line-range endpoint to `0`. | `schema` | n/a |
| `schema-task-invalid-status` | Change one task status to a value outside the Receipt v1 status enum. | `schema` | n/a |
| `schema-command-surface-normal-admission` | Set `command_surface_changed=true`, provide at least one changed authority path, and leave `execution_admission=normal`. | `schema` | n/a |
| `schema-exercised-record-zero-count` | Set an `EXERCISED` line record to `execution_count=0`. | `schema` | n/a |

## Semantic source/comparison and changed-scope cases

| ID | Minimum mutation | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-comparison-base-mismatch` | Replace `comparison.base_ref` with another valid full Git object ID while leaving `source.start.head_sha` unchanged. | `semantic` | `comparison_source_mismatch` |
| `semantic-source-end-repository-mismatch` | Change `source.end.repository_id` to another syntactically valid repository identity while keeping source start unchanged; keep stability otherwise non-assertive if needed to isolate repository identity. | `semantic` | `source_repository_changed` |
| `semantic-stable-with-missing-source-end` | Set `source.end=null` while reporting `stability=stable`. | `semantic` | `stability_mismatch` |
| `semantic-changed-range-inverted` | Use a positive integer changed range whose start is greater than its end. | `semantic` | `changed_range_inverted` |
| `semantic-changed-range-overlap` | Use two individually valid changed ranges that overlap. | `semantic` | `changed_range_overlap` |
| `semantic-deleted-line-semantics` | Mark a changed file as deleted while preserving line semantics inconsistent with a deleted-only change. | `semantic` | `deleted_line_semantics` |
| `semantic-nontext-ranges-present` | Mark a change as `binary_or_non_line` while retaining a non-empty valid changed-new-line range. | `semantic` | `nontext_changed_ranges` |

## Semantic command-authority cases

| ID | Minimum mutation | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-authority-path-not-in-comparison` | Configure a schema-valid explicit changed-surface override whose `changed_authority_paths` contains a canonical path absent from `comparison.changed_files`. | `semantic` | `changed_authority_path_not_in_comparison` |
| `semantic-command-surface-file-fact-mismatch` | Configure a schema-valid explicit changed-surface override for a changed file whose comparison fact has `is_command_surface=false`. | `semantic` | `command_surface_file_fact_mismatch` |

## Semantic run/task timing and observation cases

| ID | Minimum mutation | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-run-timeline-reversed` | Set valid ISO run timestamps with `started_at` later than `finished_at`. | `semantic` | `run_timeline_reversed` |
| `semantic-executed-task-timing-missing` | On an executed task, set `started_at`, `finished_at`, and `duration_ms` all to `null`. | `semantic` | `executed_task_timing_required` |
| `semantic-task-timeline-outside-run` | Keep a complete task timing tuple but place the task interval outside the enclosing run interval. | `semantic` | `task_timeline_outside_run` |
| `semantic-task-duration-mismatch` | Keep task start/end timestamps fixed and change `duration_ms` to a different non-negative integer. | `semantic` | `task_duration_mismatch` |
| `semantic-observation-failures-exceed-runs` | Set observation failures greater than observation runs while keeping task/result bookkeeping otherwise schema-valid. | `semantic` | `observation_failures_exceed_runs` |
| `semantic-pass-with-failure-observation` | Keep task status `PASS` while recording at least one failure observation. | `semantic` | `pass_with_failure_observation` |
| `semantic-fail-without-failure-observation` | Change the task to a schema-valid `FAIL` state while observations contain zero failures; reconcile unrelated summary bookkeeping so this case isolates the observation/status invariant. | `semantic` | `fail_without_failure_observation` |

## Semantic selection cases

| ID | Minimum mutation | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-selection-count-mismatch` | Set all three selection counts to non-negative integers where `selected + deselected != total`. | `semantic` | `selection_count_mismatch` |
| `semantic-selection-unknown-without-limitation` | Set at least one required selection count to `null` while leaving `limitations` empty. | `semantic` | `selection_unknown_without_limitation` |
| `semantic-selection-widening-invariant` | Report `widened=true` with no corresponding widen trigger or otherwise violate the current bounded widening relationship while remaining schema-valid. | `semantic` | `selection_widening_invariant` |

## Semantic evidence/artifact binding cases

| ID | Minimum mutation | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-cross-run-evidence` | Change one evidence `run_id` to a different non-empty run ID. | `semantic` | `cross_run_evidence` |
| `semantic-dangling-task-evidence-ref` | Replace one task `evidence_ids` entry with a non-existent evidence ID. | `semantic` | `dangling_task_evidence_ref` |
| `semantic-dangling-evidence-artifact-ref` | Give an evidence entry an artifact reference that does not resolve. | `semantic` | `dangling_evidence_artifact_ref` |
| `semantic-dangling-task-artifact-ref` | Give a task an `artifact_refs` entry that does not resolve. | `semantic` | `dangling_task_artifact_ref` |
| `semantic-evidence-unknown-task` | Change one evidence `task_id` to a non-existent task ID. | `semantic` | `dangling_evidence_task_ref` |
| `semantic-duplicate-evidence-id` | Add a second evidence entry with an already-used `evidence_id`, while keeping other required fields schema-valid. | `semantic` | `duplicate_evidence_id` |
| `semantic-duplicate-evidence-logical-id` | Add a second evidence entry with a distinct `evidence_id` but the same logical `(task_id, sequence)` identity. | `semantic` | `duplicate_evidence_logical_id` |

## Semantic line-exercise and task-evidence cases

| ID | Minimum mutation | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-exercise-line-outside-changed-scope` | Move an otherwise valid exercise record to a line outside the changed executable line scope. | `semantic` | `exercise_line_outside_changed_scope` |
| `semantic-exercise-summary-mismatch` | Change one line-exercise aggregate so it no longer equals the records-derived value. | `semantic` | `exercise_summary_mismatch` |
| `semantic-exercise-source-task-not-executed-test` | Keep an exercise record bound to an existing task but make that task ineligible as an executed test task while reconciling unrelated summary bookkeeping. | `semantic` | `exercise_source_task_not_executed_test` |
| `semantic-exercise-source-task-missing-coverage-evidence` | Preserve an otherwise eligible executed test task but remove its coverage evidence and matching task evidence reference as the minimum compound bookkeeping needed to avoid a dangling-reference fault. | `semantic` | `exercise_source_task_missing_coverage_evidence` |

## Semantic aggregate and decision cases

| ID | Minimum mutation | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-task-status-count-mismatch` | Change one `summary.task_status_counts` value so it no longer matches the task array. | `semantic` | `task_status_count_mismatch` |
| `semantic-completeness-mismatch` | Change `summary.completeness` away from the value derived from an otherwise unchanged valid receipt. | `semantic` | `completeness_mismatch` |
| `semantic-clean-exit-with-material-gap` | Convert the changed executable line to a fully consistent `NOT_EXERCISED` material gap, update line-exercise aggregates accordingly, but leave `summary.completeness=complete` and `summary.exit_code=0`. | `semantic` | `completeness_mismatch`, `exit_code_mismatch` |

## Semantic branch-evidence cases

These cases use `control-valid-branch-receipt` as their source control.

| ID | Minimum mutation | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-duplicate-branch-identity` | Duplicate a branch record identity and reconcile branch aggregate counts so the duplicate identity remains the targeted fault. | `semantic` | `duplicate_exercise_branch` |
| `semantic-branch-order` | Reverse or otherwise violate canonical branch-record ordering while keeping identities and aggregates otherwise valid. | `semantic` | `exercise_branch_order` |
| `semantic-branch-summary-mismatch` | Change one branch aggregate so it no longer equals the branch-record-derived count. | `semantic` | `exercise_branch_summary_mismatch` |

## Exact accounting contract

The T115 focused test MUST assert exactly:

```text
registry_version = SPEC009-CASE-REGISTRY-V1
valid_control_count = 2
invalid_case_count = 44
schema_case_count = 8
semantic_case_count = 36
total_declared_execution_count = 46
```

It MUST also prove:

- every declared ID is unique;
- every declared case executed exactly once;
- no undeclared case contributed to qualification counts;
- both valid controls passed both validators;
- all 8 schema cases failed schema validation;
- all 36 semantic cases passed schema validation first and then failed semantic validation;
- every semantic case observed every required semantic issue code;
- accepted invalid case IDs = `[]` for GO;
- skipped/unexecuted case IDs = `[]` for GO.

Any mismatch is a corpus failure.

## Privacy boundary

No separate arbitrary secret-string rejection case is authorized. Current redaction behavior is best-effort and is covered by existing execution/persistence tests. The schema path cases above exercise deterministic persisted-path restrictions without claiming universal secret detection.

## Change-control rule

This registry is part of the planning contract, not implementation-owned test data.

If implementation evidence shows that one listed expectation is factually wrong because current canonical schema/semantic layering differs from this plan, T115 MUST stop and return to Spec 009 planning. It MUST NOT silently edit the expected layer or required code in the implementation branch.
