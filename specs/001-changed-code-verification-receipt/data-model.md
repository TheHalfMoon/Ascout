# 001 — Data Model

**Status:** Design contract; implementation not authorized.

The model is deliberately run-centric. There is no persistent domain database and no global finding identity.

## 1. Run

Represents one invocation of `ascout check` (or a future whole-scope mode) against one observed source state.

Required fields/concepts:

- `run_id`: unique current-run identifier.
- `schema_version`: receipt contract version.
- `started_at`, `finished_at`.
- `ascout_version`.
- `source_start`: SourceState.
- `source_end`: SourceState summary/digest used for drift comparison.
- `config_digest`.
- `comparison`: ComparisonScope.
- `selection`: SelectionAccount.
- `tasks[]`: VerificationTaskResult.
- `exercise`: ExerciseSummary.
- `test_changes`: TestChangeSummary.
- `findings[]`: Finding.
- `artifacts[]`: ArtifactRef.
- `stability`: `stable | tree_drifted | incomplete_due_to_error`.
- `summary`: aggregate counts only; aggregate values never override underlying task truth.

### Invariants

1. Every Evidence ID referenced by this run begins with/belongs to this `run_id`.
2. A run never imports evidence records from another run.
3. `stability=stable` only if the canonical start/end tree digests match and no integrity error prevents comparison.
4. Summary counts are derivable from underlying arrays; they are not independent truth.

## 2. SourceState

Represents the source identity observed at a point in the run.

Fields:

- `repository_id`.
- `repository_id_kind`: `remote | local_only`.
- `portable`: boolean.
- `head_sha`: string or null where unsupported/error prevents resolution.
- `detached`: boolean.
- `shallow`: boolean.
- `tree_digest_version`: `1`.
- `tree_digest`.
- `tracked_index_entry_count`.
- `unstaged_changed_count`.
- `relevant_untracked_count`.

### Invariants

- A `local_only` repository identity has `portable=false`.
- The digest framing/version is explicit.
- Tracked-file changes cannot be excluded through artifact-ignore policy.

## 3. ComparisonScope

Describes what "changed" means for the run.

M1 values:

- `kind`: `working_tree_vs_head`.
- `base_ref`: HEAD SHA.
- `includes_staged`: true.
- `includes_unstaged`: true.
- `includes_relevant_untracked`: true.
- `changed_files[]`: ChangedFile.

The type is intentionally extensible for a future explicit committed `--base` mode, but M1 does not require that implementation.

## 4. ChangedFile

Fields:

- `path`.
- `previous_path`: optional rename source.
- `change_kind`: `added | modified | deleted | renamed | type_changed | untracked`.
- `line_semantics`: `text | binary_or_non_line | deleted_only`.
- `changed_new_line_ranges[]`: pairs of inclusive start/end lines for executable/new-file lines when meaningful.
- `is_test_file`: boolean/factual classifier.
- `is_snapshot`: boolean/factual classifier.
- `is_command_surface`: boolean.

No semantic "risk" score is required in M1.

## 5. VerificationTaskDefinition

Planned task before execution.

Fields:

- `task_id`.
- `task_type`: concrete M1 values such as `typecheck | lint | vitest | jest | pytest_basic`.
- `scope`: repository/package/path descriptor.
- `authorized_by`: `user_config | repo_config | discovery`.
- `source_path`: repo-relative command/config provenance.
- `argv[]`: executable plus arguments; never a shell command string.
- `tool_name`.
- `tool_version`: null until resolvable.
- `timeout_ms`.
- `prerequisite_task_ids[]`.
- `selection_mode`: optional runner selection descriptor.

## 6. VerificationTaskResult

Execution outcome for one planned task/pass.

Fields:

- all stable task-definition identity fields required for audit;
- `status`: one of:
  - `PASS`
  - `FAIL`
  - `FLAKY`
  - `BLOCKED`
  - `ERROR`
  - `NOT_APPLICABLE`
  - `NOT_RUN`
- `reason_code`: required when status needs explanation.
- `reason_text`: required for `NOT_RUN`/`BLOCKED` and useful for `ERROR`.
- `exit_code`: process exit code or null.
- `started_at`, `finished_at`, `duration_ms`.
- `observations`: `{runs, failures}` where meaningful.
- `cache_state`: `cold | warm | reused | unknown | not_applicable`.
- `selected_test_count`, `deselected_test_count`: optional where runner can establish them.
- `evidence_ids[]`.
- `artifact_refs[]`.
- `output_truncated`: boolean.

### Status invariants

- `PASS`: task executed and completed successfully; `runs >= 1` where observations apply.
- `FAIL`: repository/test finding observed; not an Ascout execution failure.
- `FLAKY`: contradictory pass/fail observations; `runs >= 2` and `0 < failures < runs`.
- `BLOCKED`: task did not execute because a prerequisite prevented valid execution.
- `ERROR`: Ascout/task execution failed such that repository correctness cannot be inferred.
- `NOT_APPLICABLE`: task does not apply to current scope.
- `NOT_RUN`: applicable/known work did not execute for a reason such as missing tool, config, budget, explicit disablement, or deselection accounting.

## 7. EvidenceRef / Evidence ID

M1 stores evidence primarily as bounded artifacts rather than embedding raw logs in the receipt.

Evidence ID logical form:

```text
(run_id, task_id, sequence)
```

Fields:

- `evidence_id`.
- `task_id`.
- `kind`: `process_result | test_result | coverage | diff | warning | other`.
- `artifact_ref`: optional.
- `digest`: SHA-256 where artifact bytes are persisted.
- `redacted`: boolean.
- `truncated`: boolean.

Evidence is current-run only.

## 8. Finding

A normalized current-run issue.

Fields:

- `finding_id`: current-run identifier.
- `task_id`.
- `producer`.
- `rule_or_test_id`: optional.
- `message`.
- `path`: optional repo-relative path.
- `line_start`, `line_end`: optional.
- `severity`: `info | low | medium | high | critical | unknown` when producer severity can be normalized without invention.
- `in_changed_lines`: boolean or null when location cannot be resolved.
- `introduced_by_change`: `true | false | unknown`; M1 defaults to `unknown` absent comparative proof.
- `determinism_class`: `deterministic | nondeterministic | unknown`.
- `observations`: `{runs, failures}` when applicable.
- `reproduced`: `true | false | not_applicable | unknown`.
- `fingerprint_version`: optional `1`.
- `fingerprint`: optional weak fingerprint.
- `evidence_ids[]`.

### Fingerprint v1

Logical input:

```text
version + task/rule identity + repo-relative path + normalized message
```

All components use unambiguous length-prefix framing before SHA-256.

Properties:

- excludes line number;
- excludes tree digest;
- no structural context hash;
- may remain stable if path/task/message remain stable;
- may change on rename/tool-message change;
- never a global merge key;
- never transfers evidence.

## 9. SelectionAccount

Explains why a test scope ran.

Fields:

- `mode`: `full | native_related | native_changed | configured | no_test_task`.
- `initial_scope`.
- `selected_test_count`: optional/unknown when runner cannot provide exact count.
- `deselected_test_count`: optional/unknown.
- `total_test_count`: optional/unknown.
- `widened`: boolean.
- `widen_triggers[]`: finite reason codes.
- `passes[]`: at most initial pass + one post-run widening pass in M1.
- `limitations[]`.

No numeric "confidence score" is required in M1.

## 10. ExerciseRecord / ExerciseSummary

`ExerciseRecord` is defined only for changed executable lines for which line semantics are meaningful.

Fields:

- `path`.
- `line`.
- `state`: `EXERCISED | NOT_EXERCISED | UNRESOLVED`.
- `execution_count`: integer or null.
- `source_task_ids[]`.
- `reason`: optional unresolved reason.

Summary fields:

- changed executable line count.
- exercised count.
- not-exercised count.
- unresolved count.
- changed file count with zero exercised lines.

### Invariants

- `EXERCISED` requires a resolved line with execution count > 0.
- `NOT_EXERCISED` requires a resolved line with execution count = 0.
- Missing/ambiguous source mapping is `UNRESOLVED`, never optimistic exercise.
- Exercise state is not correctness state.

## 11. TestChangeFact / TestChangeSummary

Fields:

- `kind`: `test_file_changed | test_file_deleted | snapshot_changed | snapshot_deleted` for the first implementation slice.
- `path`.
- `previous_path`: optional.
- `source`: `git_diff`.

Future reliable detectors may add skip/disable/assertion facts under a schema revision. M1 does not infer `weakened`.

## 12. ArtifactRef

Fields:

- `artifact_id`.
- `task_id`: optional.
- `relative_run_path`.
- `kind`.
- `sha256`.
- `byte_length`.
- `redacted`: boolean.
- `truncated`: boolean.

Artifact paths are always inside the current run directory for M1.

## 13. Receipt Summary

Derived counts/highlights for humans/agents:

- task status counts;
- changed file/line counts;
- exercise counts;
- selected/deselected counts where known;
- test-change fact counts;
- finding counts;
- stability;
- completeness state.

The summary MUST be mechanically derivable from detailed run fields to prevent contradictory truth surfaces.

## 14. Exit Decision

Derived from the run rather than stored as independent truth.

Precedence:

1. `2` — Ascout/config/internal/task execution integrity error prevents normal trustworthy receipt.
2. `3` — source drifted.
3. `1` — repository/test finding or flake.
4. `4` — stable but materially incomplete applicable verification.
5. `0` — stable, materially complete for planned/applicable M1 tasks, no finding/flake/error.

Tests lock this precedence.
