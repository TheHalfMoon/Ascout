# 001 — Data Model

**Status:** Design contract; implementation not authorized.

The model is deliberately run-centric. There is no persistent domain database, no global finding identity, and no user-defined workflow graph.

## 1. Run

Represents one invocation of `ascout check` against one observed source state.

Required concepts:

- `run_id`: unique current-run identifier.
- `schema_version`: receipt contract version.
- `started_at`, `finished_at`.
- `ascout_version`.
- `source_start`: SourceState.
- `source_end`: SourceState or null only when an integrity error prevents the end identity from being computed.
- `config_digest`.
- `comparison`: ComparisonScope.
- `selection`: SelectionAccount.
- `tasks[]`: VerificationTaskResult.
- `exercise`: ExerciseSummary.
- `test_changes`: TestChangeSummary.
- `findings[]`: Finding.
- `artifacts[]`: ArtifactRef.
- `stability`: `stable | tree_drifted | unknown`.
- `summary`: derived aggregate counts and completeness.

### Invariants

1. Every evidence reference belongs to this `run_id`.
2. A run never imports evidence from another run.
3. `stability=stable` only when the canonical start and end tree digests were both computed and match.
4. `stability=tree_drifted` only when both digests were computed and differ.
5. `stability=unknown` is reserved for an integrity error that prevents a valid start/end comparison; task errors by themselves do not make a stable tree unstable.
6. Summary values are derivable from underlying fields and never override them.

## 2. SourceState

Represents the source identity observed at a point in the run.

Fields:

- `repository_id`.
- `repository_id_kind`: `remote | local_only`.
- `portable`: boolean.
- `head_sha`: string or null where an integrity error prevents resolution.
- `detached`: boolean.
- `shallow`: boolean.
- `tree_digest_version`: `1`.
- `tree_digest`.
- `tracked_index_entry_count`.
- `unstaged_changed_count`.
- `included_untracked_count`.

### Repository identity safety

A persisted remote repository identity MUST NOT contain Git credentials, URL userinfo, query parameters, or fragments. Raw configured origin URLs are never written to receipts. Normalization strips credential-bearing/userinfo material before deriving the stable host/path identity. If a remote cannot be normalized safely, Ascout persists a one-way identifier rather than the raw remote string.

A `local_only` identity is derived from the canonical local repository path and MUST set `portable=false`.

### Tree identity scope

M1 includes all non-gitignored untracked files in source identity and changed-scope accounting, except `.ascout/` itself. There is no heuristic "relevant untracked" omission list in v1. Project/tool outputs that are not ignored and are written during verification therefore cause source drift, which is the conservative behavior.

Tracked files are never excluded merely because a tool might rewrite them.

For an unstaged tracked path, the digest input includes current file type/mode plus file bytes or symlink target; an executable-bit/type change must not disappear merely because content bytes are unchanged.

## 3. ComparisonScope

Describes what "changed" means for M1.

- `kind`: `working_tree_vs_head`.
- `base_ref`: HEAD SHA.
- `includes_staged`: true.
- `includes_unstaged`: true.
- `includes_untracked_nonignored`: true.
- `changed_files[]`: ChangedFile.

M1 does not implement committed-range `--base`; a later schema revision may add that comparison kind without changing current semantics.

## 4. ChangedFile

Fields:

- `path`.
- `previous_path`: optional rename source.
- `change_kind`: `added | modified | deleted | renamed | type_changed | untracked`.
- `line_semantics`: `text | binary_or_non_line | deleted_only`.
- `changed_new_line_ranges[]` when meaningful.
- `is_test_file`: factual classifier.
- `is_snapshot`: factual classifier.
- `is_command_surface`: factual classifier.

No semantic risk score is required in M1.

## 5. VerificationTaskDefinition

A planned semantic M1 verification task.

M1 task categories are fixed by the product, not invented by config:

- `typecheck`.
- `lint`.
- `test` (resolved to concrete Vitest or Jest behavior when supported).
- `pytest_basic`.

Fields:

- `task_id`.
- `task_type`.
- `scope`.
- `authorized_by`: `user_config | repo_config | discovery`.
- `source_path`: repo-relative provenance source when one exists.
- `argv[]`: planned executable and arguments; MAY be empty until a runnable command is resolved.
- `tool_name`: MAY be null before resolution.
- `tool_version`: MAY be null before execution.
- `timeout_ms`.
- `prerequisite_task_ids[]`: **internal planner ordering only**; M1 config cannot define an arbitrary dependency graph.
- optional selection descriptor for test tasks.

Persisted/rendered argv is redacted before storage. Raw secret-bearing argv exists only transiently for process launch.

## 6. VerificationTaskResult

Execution outcome for one planned task/pass.

Fields:

- stable task identity/provenance fields.
- redacted `argv[]` plus `argv_redacted`.
- `status`:
  - `PASS`
  - `FAIL`
  - `FLAKY`
  - `BLOCKED`
  - `ERROR`
  - `NOT_APPLICABLE`
  - `NOT_RUN`
- `reason_code`.
- `reason_text`.
- process `exit_code` or null.
- timing/duration.
- `observations: {runs, failures}`.
- `cache_state`.
- selected/deselected counts when known for an executed test task.
- current-run evidence/artifact references.
- truncation metadata.

### Status invariants

- `PASS`: task executed and completed successfully.
- `FAIL`: executed task produced a repository/test finding; not an Ascout execution failure.
- `FLAKY`: contradictory pass/fail test observations; requires at least two observations and `0 < failures < runs`.
- `BLOCKED`: task did not execute because an internal prerequisite prevented valid execution.
- `ERROR`: Ascout/task execution failed such that repository correctness cannot be inferred.
- `NOT_APPLICABLE`: semantic task category does not apply to current repository/scope.
- `NOT_RUN`: known applicable task category did not execute (for example missing tool, missing config, explicit disablement, or budget exhaustion).

For `PASS | FAIL | FLAKY | ERROR` caused by an attempted process launch, runnable argv/tool identity MUST have been resolved. `BLOCKED | NOT_APPLICABLE | NOT_RUN` MUST NOT fabricate argv or tool identity merely to satisfy a schema.

**Deselected tests are not task-level `NOT_RUN` results.** They are accounted for inside SelectionAccount for an executed test task. A valid native affected selection can therefore be complete while still disclosing deselected tests.

## 7. EvidenceRef / Evidence ID

Evidence ID logical form:

```text
(run_id, task_id, sequence)
```

Fields may include:

- `evidence_id`.
- `task_id`.
- `kind`: `process_result | test_result | coverage | diff | warning | other`.
- artifact reference.
- SHA-256 digest where bytes are persisted.
- redaction/truncation flags.

Evidence is current-run only.

## 8. Finding

A normalized current-run issue.

Fields:

- `finding_id`: current-run identifier.
- `task_id`.
- `producer`.
- optional rule/test id.
- message/location.
- normalized severity where supplied without invention.
- `in_changed_lines`: boolean or null.
- `introduced_by_change`: `true | false | unknown`; M1 defaults to `unknown` absent comparative proof.
- `determinism_class`: `deterministic | nondeterministic | unknown`.
- `observations: {runs, failures}`.
- `reproduced`: `true | false | not_applicable | unknown`.
- optional `fingerprint_v1`.
- current-run evidence references.

### Reproduction semantics

- One failing test observation: `reproduced=unknown`.
- Two or more consistent failing targeted observations: `reproduced=true`.
- Contradictory pass/fail observations: task/finding is flaky; `reproduced=false` for a stable failure claim.
- Rerun unavailable or rerun itself errors before a valid second observation: `reproduced=unknown`.
- Deterministic compiler/lint findings that are not modeled through retry semantics MAY use `not_applicable` rather than pretending a reproduction experiment occurred.

### Fingerprint v1

Logical input:

```text
version + task/rule identity + repo-relative path + normalized message
```

All components use unambiguous length-prefix framing before SHA-256. It excludes line number/tree digest/structural hashing, may change on rename/tool-message changes, is never a global merge key, and never transfers evidence.

## 9. SelectionAccount

Explains why a test scope ran.

Fields:

- `mode`: `full | native_related | native_changed | configured | no_test_task`.
- initial scope.
- selected/deselected/total test counts where the runner can establish them, otherwise null plus a limitation explaining that exact accounting is unavailable.
- `widened`.
- finite `widen_triggers[]`.
- at most initial pass + one widening pass.
- `limitations[]`.

No numeric confidence score is required.

Deselection under a valid declared selection strategy is disclosure, not task non-execution. If the selection itself cannot be justified safely, widening or an incomplete result is required instead.

## 10. ExerciseRecord / ExerciseSummary

Exercise state is defined only for changed executable lines whose mapping can be established by the coverage provider.

Fields:

- `path`.
- `line`.
- `state`: `EXERCISED | NOT_EXERCISED | UNRESOLVED`.
- `execution_count` or null.
- source task ids.
- optional unresolved reason.

Summary fields:

- changed executable line count.
- exercised count.
- not-exercised count.
- unresolved count.
- changed file count with zero exercised lines.

### Invariants

- `EXERCISED` requires resolved execution count > 0.
- `NOT_EXERCISED` requires resolved execution count = 0.
- Missing/ambiguous source mapping is `UNRESOLVED`.
- Exercise state is not correctness state.
- A changed executable line that remains `NOT_EXERCISED` or `UNRESOLVED` after the allowed widening pass is a **material verification gap** and prevents exit `0`.

## 11. TestChangeFact / TestChangeSummary

First-slice kinds:

- `test_file_changed`.
- `test_file_deleted`.
- `snapshot_changed`.
- `snapshot_deleted`.

Each fact records path, optional previous path, and `source=git_diff`. Future reliable detectors require a schema revision; M1 does not infer `weakened`.

## 12. ArtifactRef

Fields:

- `artifact_id`.
- optional `task_id`.
- `relative_run_path`.
- kind.
- SHA-256.
- byte length.
- redacted/truncated flags.

Artifact paths are inside the current run directory.

## 13. Receipt Summary and Completeness

Summary includes task status counts, finding count, stability, exercise counts, selection/test-change counts where available, completeness, and derived exit code.

`completeness` is one of:

- `complete`: every applicable planned task category executed to an outcome or was legitimately `NOT_APPLICABLE`, and no changed executable line remains `NOT_EXERCISED` or `UNRESOLVED` after the permitted widening policy.
- `materially_incomplete`: at least one applicable task is `NOT_RUN`/`BLOCKED`, nothing material executed, or a changed executable line remains `NOT_EXERCISED`/`UNRESOLVED`.
- `unknown_due_to_error`: an integrity/internal error prevents completeness from being established reliably.

A repository finding/flake does not by itself make verification incomplete; it is an executed outcome and is represented by exit `1` unless a higher-precedence condition exists.

## 14. Exit Decision

Derived from the run:

1. `2` — usage/config/internal/task-execution integrity error prevents a trustworthy normal result.
2. `3` — source tree drifted (when no higher-precedence integrity error applies).
3. `1` — repository/test finding or flaky outcome.
4. `4` — stable but materially incomplete/gapped verification.
5. `0` — stable, materially complete, at least one material verification task executed, and no finding/flake/error.

This means an affected run may legitimately deselect tests and still return `0` only when selection/widening policy is satisfied **and** every changed executable line has resolved exercised coverage. Any remaining exercise gap is exit `4`, never green.

Tests lock these semantics and precedence.
