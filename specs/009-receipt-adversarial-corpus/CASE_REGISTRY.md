# Specification 009 — Exact Adversarial Case Registry

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED`  
**Planning ledger:** Issue #252  
**Registry version:** `SPEC009-CASE-REGISTRY-V1`  
**Invalid cases:** `44`  
**Valid controls:** `2`

## Authority and purpose

This file is the exact planning-time case registry for T115.

T115 MUST implement and execute every case in this registry exactly once per focused corpus execution, plus both valid controls. T115 MUST NOT add, remove, rename, merge, split, skip, reclassify, or weaken any case expectation without a separately reviewed Spec 009 planning amendment that becomes canonical before implementation continues.

This registry removes implementation-time discretion over corpus completeness and candidate construction. It exists specifically to prevent green-by-omission and test-to-green mutation.

## Exact candidate-construction rule

For every invalid case, the source control and every permitted field mutation are fixed below.

- Unless a row explicitly says `branch control`, its source is `control-valid-line-receipt`.
- Start each case from a fresh deep copy of its named source control.
- Apply exactly the assignments/additions/removals written in that row.
- Leave every field not named in that row unchanged from the source control.
- No additional bookkeeping, normalization, compensation, alternative mutation, fallback mutation, or implementation-selected equivalent is permitted.
- If the exact listed assignments cannot reach the declared validator boundary on the then-canonical implementation base, T115 stops and returns to Spec 009 planning. Implementation MUST NOT substitute another candidate.

For `semantic` cases:

1. the exact candidate MUST pass exact current `validateReceiptJsonSchema` first;
2. exact current `validateReceiptSemantics` MUST reject it;
3. every listed required semantic issue code MUST be present;
4. deterministic additional semantic issue codes do not invalidate the case, but they MUST NOT substitute for a missing required code.

For `schema` cases:

1. exact current `validateReceiptJsonSchema` MUST reject the candidate;
2. no semantic-validator outcome may substitute for schema rejection.

## Control anchors

Both controls are deterministic test-owned Receipt v1 objects. Their complete objects must satisfy both exact validators. The following identity/state anchors are frozen because registry mutations reference them:

### `control-valid-line-receipt`

- `run.run_id = "run-1"`
- `run.started_at = "2026-01-01T00:00:00.000Z"`
- `run.finished_at = "2026-01-01T00:00:03.000Z"`
- `source.start.head_sha = comparison.base_ref = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"`
- `source.start.repository_id = source.end.repository_id = "remote:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"`
- `source.start.repository_id_kind = source.end.repository_id_kind = "remote"`
- `source.start.portable = source.end.portable = true`
- `source.start.tree_digest = source.end.tree_digest`
- `stability = "stable"`
- exactly one changed file at `comparison.changed_files[0]`:
  - `path = "src/example.ts"`
  - `change_kind = "modified"`
  - `line_semantics = "text"`
  - `changed_new_line_ranges = [[10, 10]]`
  - `is_command_surface = false`
- `changed_code.changed_file_count = 1`
- `changed_code.changed_text_line_count = 1`
- selection root counts are `selected=1`, `deselected=0`, `total=1`, with `widened=false`, `widen_triggers=[]`, `limitations=[]`, and exactly one ordinal-1 pass whose counts are also `1/0/1`
- exactly one task at `tasks[0]`:
  - `task_id = "task-test"`
  - `task_type = "test"`
  - `command_surface_changed = false`
  - `changed_authority_paths = []`
  - `execution_admission = "normal"`
  - `status = "PASS"`
  - `started_at = "2026-01-01T00:00:01.000Z"`
  - `finished_at = "2026-01-01T00:00:02.000Z"`
  - `duration_ms = 1000`
  - `observations = { runs: 1, failures: 0 }`
  - `evidence_ids = ["e-test", "e-coverage"]`
  - `artifact_refs = []`
- exactly two evidence records:
  - `evidence[0]`: `evidence_id="e-test"`, `run_id="run-1"`, `task_id="task-test"`, `sequence=1`, `kind="test_result"`, `artifact_id=null`
  - `evidence[1]`: `evidence_id="e-coverage"`, `run_id="run-1"`, `task_id="task-test"`, `sequence=2`, `kind="coverage"`, `artifact_id=null`
- `artifacts = []`
- exactly one line exercise record at `exercise.records[0]`: `path="src/example.ts"`, `line=10`, `state="EXERCISED"`, `execution_count=1`, `source_task_ids=["task-test"]`
- line exercise aggregates: `changed_executable_lines=1`, `exercised_lines=1`, `not_exercised_lines=0`, `unresolved_lines=0`, `changed_files_with_zero_exercised_lines=0`
- `findings = []`
- summary task counts have `PASS=1` and every other status `0`; `finding_count=0`; `completeness="complete"`; `exit_code=0`

Other Receipt v1 required fields not named above must use deterministic literals and remain identical across every control construction; they are not case-selection inputs.

### `control-valid-branch-receipt`

Start from the line control and add exactly two canonically ordered EXERCISED branch records:

1. `{ path:"src/example.ts", line:10, block_id:"block-1", branch_id:"branch-1", taken:1, state:"EXERCISED" }`
2. `{ path:"src/example.ts", line:10, block_id:"block-1", branch_id:"branch-2", taken:1, state:"EXERCISED" }`

Branch aggregates are exactly:

- `exercised_branches=2`
- `not_exercised_branches=0`
- `unresolved_branches=0`
- `changed_files_with_zero_exercised_branches=0`

Both controls are mandatory. A corpus that rejects either control is `NO_GO`.

## Fixed mutation constants

- alternate full Git object ID: `bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`
- alternate repository ID: `remote:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`
- missing authority path: `config/missing.json`
- missing evidence ID: `evidence-missing`
- missing artifact ID: `artifact-missing`
- missing task ID: `task-missing`
- alternate run ID: `run-other`

## Schema-boundary cases

| ID | Exact mutation from line control | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `schema-root-missing-summary` | Remove root `summary`; change nothing else. | `schema` | n/a |
| `schema-root-additional-property` | Add root `unexpected=true`; change nothing else. | `schema` | n/a |
| `schema-version-invalid` | Set `schema_version="2.0"`; change nothing else. | `schema` | n/a |
| `schema-changed-path-backslash` | Set `comparison.changed_files[0].path="src\\example.ts"`; change nothing else. | `schema` | n/a |
| `schema-changed-range-zero-endpoint` | Replace `comparison.changed_files[0].changed_new_line_ranges` with `[[0, 10]]`; change nothing else. | `schema` | n/a |
| `schema-task-invalid-status` | Set `tasks[0].status="UNKNOWN"`; change nothing else. | `schema` | n/a |
| `schema-command-surface-normal-admission` | Set `tasks[0].command_surface_changed=true`; set `tasks[0].changed_authority_paths=["src/example.ts"]`; leave `tasks[0].execution_admission="normal"`; change nothing else. | `schema` | n/a |
| `schema-exercised-record-zero-count` | Set `exercise.records[0].execution_count=0`; change nothing else. | `schema` | n/a |

## Semantic source/comparison and changed-scope cases

| ID | Exact mutation from line control | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-comparison-base-mismatch` | Set `comparison.base_ref="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"`; change nothing else. | `semantic` | `comparison_source_mismatch` |
| `semantic-source-end-repository-mismatch` | Set `source.end.repository_id="remote:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"`; set `stability="unknown"`; set `summary.exit_code=2`; change nothing else. | `semantic` | `source_repository_changed` |
| `semantic-stable-with-missing-source-end` | Set `source.end=null`; leave `stability="stable"`; change nothing else. | `semantic` | `stability_mismatch` |
| `semantic-changed-range-inverted` | Replace `comparison.changed_files[0].changed_new_line_ranges` with `[[11, 10]]`; change nothing else. | `semantic` | `changed_range_inverted` |
| `semantic-changed-range-overlap` | Replace `comparison.changed_files[0].changed_new_line_ranges` with `[[10, 11], [11, 12]]`; change nothing else. | `semantic` | `changed_range_overlap` |
| `semantic-deleted-line-semantics` | Set `comparison.changed_files[0].change_kind="deleted"`; leave `line_semantics="text"` and `changed_new_line_ranges=[[10,10]]`; change nothing else. | `semantic` | `deleted_line_semantics` |
| `semantic-nontext-ranges-present` | Set `comparison.changed_files[0].line_semantics="binary_or_non_line"`; set `changed_code.changed_text_line_count=0`; leave `changed_new_line_ranges=[[10,10]]`; change nothing else. | `semantic` | `nontext_changed_ranges` |

## Semantic command-authority cases

| ID | Exact mutation from line control | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-authority-path-not-in-comparison` | Set `tasks[0].command_surface_changed=true`; set `tasks[0].changed_authority_paths=["config/missing.json"]`; set `tasks[0].execution_admission="explicit_changed_surface_override"`; change nothing else. | `semantic` | `changed_authority_path_not_in_comparison` |
| `semantic-command-surface-file-fact-mismatch` | Set `tasks[0].command_surface_changed=true`; set `tasks[0].changed_authority_paths=["src/example.ts"]`; set `tasks[0].execution_admission="explicit_changed_surface_override"`; leave `comparison.changed_files[0].is_command_surface=false`; change nothing else. | `semantic` | `command_surface_file_fact_mismatch` |

## Semantic run/task timing and observation cases

| ID | Exact mutation from line control | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-run-timeline-reversed` | Set `run.finished_at="2025-12-31T23:59:59.000Z"`; change nothing else. | `semantic` | `run_timeline_reversed`, `task_timeline_outside_run` |
| `semantic-executed-task-timing-missing` | Set `tasks[0].started_at=null`, `tasks[0].finished_at=null`, and `tasks[0].duration_ms=null`; change nothing else. | `semantic` | `executed_task_timing_required` |
| `semantic-task-timeline-outside-run` | Set `tasks[0].started_at="2025-12-31T23:59:59.000Z"`; leave `tasks[0].finished_at="2026-01-01T00:00:02.000Z"`; set `tasks[0].duration_ms=3000`; change nothing else. | `semantic` | `task_timeline_outside_run` |
| `semantic-task-duration-mismatch` | Set `tasks[0].duration_ms=1001`; change nothing else. | `semantic` | `task_duration_mismatch` |
| `semantic-observation-failures-exceed-runs` | Set `tasks[0].status="FAIL"`; set `tasks[0].observations={runs:1,failures:2}`; set summary counts `PASS=0` and `FAIL=1`; set `summary.exit_code=1`; change nothing else. | `semantic` | `observation_failures_exceed_runs` |
| `semantic-pass-with-failure-observation` | Set `tasks[0].observations.failures=1`; change nothing else. | `semantic` | `pass_with_failure_observation` |
| `semantic-fail-without-failure-observation` | Set `tasks[0].status="FAIL"`; leave observations `{runs:1,failures:0}`; set summary counts `PASS=0` and `FAIL=1`; set `summary.exit_code=1`; change nothing else. | `semantic` | `fail_without_failure_observation` |

## Semantic selection cases

| ID | Exact mutation from line control | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-selection-count-mismatch` | Set root `selection.selected_test_count=2`, `deselected_test_count=0`, `total_test_count=1`; leave the ordinal-1 pass counts `1/0/1`; change nothing else. | `semantic` | `selection_count_mismatch` |
| `semantic-selection-unknown-without-limitation` | Set root `selection.selected_test_count=null`; leave `selection.limitations=[]`; change nothing else. | `semantic` | `selection_unknown_without_limitation` |
| `semantic-selection-widening-invariant` | Set `selection.widened=true`; leave `selection.widen_triggers=[]` and the existing single pass unchanged; change nothing else. | `semantic` | `selection_widening_invariant` |

## Semantic evidence/artifact binding cases

| ID | Exact mutation from line control | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-cross-run-evidence` | Set `evidence[0].run_id="run-other"`; replace `tasks[0].evidence_ids` with `["e-coverage"]`; change nothing else. | `semantic` | `cross_run_evidence` |
| `semantic-dangling-task-evidence-ref` | Replace `tasks[0].evidence_ids` with `["evidence-missing", "e-coverage"]`; change nothing else. | `semantic` | `dangling_task_evidence_ref` |
| `semantic-dangling-evidence-artifact-ref` | Set `evidence[0].artifact_id="artifact-missing"`; change nothing else. | `semantic` | `dangling_evidence_artifact_ref` |
| `semantic-dangling-task-artifact-ref` | Replace `tasks[0].artifact_refs` with `["artifact-missing"]`; change nothing else. | `semantic` | `dangling_task_artifact_ref` |
| `semantic-evidence-unknown-task` | Set `evidence[0].task_id="task-missing"`; replace `tasks[0].evidence_ids` with `["e-coverage"]`; change nothing else. | `semantic` | `dangling_evidence_task_ref` |
| `semantic-duplicate-evidence-id` | Append an exact copy of `evidence[0]`, then set only the appended record's `sequence=3`; keep its `evidence_id="e-test"`; change nothing else. | `semantic` | `duplicate_evidence_id` |
| `semantic-duplicate-evidence-logical-id` | Append an exact copy of `evidence[0]`, then set only the appended record's `evidence_id="e-test-duplicate"`; keep `task_id="task-test"` and `sequence=1`; change nothing else. | `semantic` | `duplicate_evidence_logical_id` |

## Semantic line-exercise and task-evidence cases

| ID | Exact mutation from line control | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-exercise-line-outside-changed-scope` | Set `exercise.records[0].line=11`; change nothing else. | `semantic` | `exercise_line_outside_changed_scope` |
| `semantic-exercise-summary-mismatch` | Set `exercise.exercised_lines=0`; change nothing else. | `semantic` | `exercise_summary_mismatch` |
| `semantic-exercise-source-task-not-executed-test` | Set `tasks[0].task_type="lint"`; change nothing else. | `semantic` | `exercise_source_task_not_executed_test` |
| `semantic-exercise-source-task-missing-coverage-evidence` | Remove the `e-coverage` record from `evidence`; replace `tasks[0].evidence_ids` with `["e-test"]`; change nothing else. | `semantic` | `exercise_source_task_missing_coverage_evidence` |

## Semantic aggregate and decision cases

| ID | Exact mutation from line control | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-task-status-count-mismatch` | Set `summary.task_status_counts.PASS=0`; change nothing else. | `semantic` | `task_status_count_mismatch` |
| `semantic-completeness-mismatch` | Set `summary.completeness="materially_incomplete"`; change nothing else. | `semantic` | `completeness_mismatch` |
| `semantic-clean-exit-with-material-gap` | Set `exercise.records[0].state="NOT_EXERCISED"`; set its `execution_count=0`; set `exercise.exercised_lines=0`; set `exercise.not_exercised_lines=1`; set `exercise.changed_files_with_zero_exercised_lines=1`; leave `summary.completeness="complete"` and `summary.exit_code=0`; change nothing else. | `semantic` | `completeness_mismatch`, `exit_code_mismatch` |

## Semantic branch-evidence cases

These cases use `control-valid-branch-receipt` as their source control.

| ID | Exact mutation from branch control | Expected layer | Required semantic codes |
| --- | --- | --- | --- |
| `semantic-duplicate-branch-identity` | Append an exact copy of `exercise.branch_records[0]`; set `exercise.exercised_branches=3`; change nothing else. | `semantic` | `duplicate_exercise_branch` |
| `semantic-branch-order` | Swap only `exercise.branch_records[0]` and `exercise.branch_records[1]`; change nothing else. | `semantic` | `exercise_branch_order` |
| `semantic-branch-summary-mismatch` | Set `exercise.exercised_branches=1`; change nothing else. | `semantic` | `exercise_branch_summary_mismatch` |

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

If implementation evidence shows that one listed expectation or exact candidate construction is factually wrong because current canonical schema/semantic behavior differs from this plan, T115 MUST stop and return to Spec 009 planning. It MUST NOT silently edit the mutation, expected layer, or required code in the implementation branch.
