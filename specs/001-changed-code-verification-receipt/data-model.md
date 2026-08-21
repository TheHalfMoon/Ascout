# 001 — Data Model

**Status:** Design contract; implementation not authorized.

The model is run-centric: no persistent domain DB, no global finding identity, no user-defined workflow graph.

## 1. Run

One `ascout check` invocation against one observed source state.

Core concepts:

- `run_id`, `schema_version`, `ascout_version`, timing;
- `source_start`, `source_end`;
- `config_digest`;
- comparison/selection;
- task results;
- exercise/test-change/findings/evidence/artifacts;
- `stability: stable | tree_drifted | unknown`;
- derived summary/completeness/exit.

Invariants: evidence belongs only to this run; no cross-run evidence reuse; `stable` requires valid equal start/end digests; `tree_drifted` requires valid unequal digests; `unknown` means integrity failure prevented valid comparison.

## 2. SourceState

Fields include repository ID/kind/portable, HEAD, detached/shallow, digest version/value, index/unstaged/included-untracked counts.

### Repository identity

M1 persists only opaque schema-enforceable identifiers:

- remote: `repository_id = remote:<sha256(normalized-credential-free-remote-identity)>`; `repository_id_kind=remote`; `portable=true`;
- local-only: `repository_id = local:<sha256(canonical-real-repository-path)>`; `repository_id_kind=local_only`; `portable=false`.

Raw remote origins, credentials/userinfo/query/fragment material, and raw absolute local paths are never persisted/rendered.

### Tree identity

Includes HEAD, index entries, unstaged current type/mode/content state, and all non-gitignored untracked files except `.ascout/`. Tracked files are never ignored merely because tools may rewrite them.

## 3. ComparisonScope / ChangedFile

M1 comparison:

```text
working_tree_vs_head
includes_staged=true
includes_unstaged=true
includes_untracked_nonignored=true
```

ChangedFile records path/previous path, kind, line semantics/ranges, and factual test/snapshot/command-surface classification.

Rename identity is strict: `change_kind=renamed` requires `previous_path`; non-rename change kinds do not carry `previous_path`.

### Persisted path invariant

Every persisted path-bearing field uses one canonical slash-separated **relative** form in its declared namespace:

- repository paths are relative to the repository root, including changed/current/previous paths, package scope, task source path, changed authority paths, exercise paths, test-change paths, and finding paths;
- `artifact.relative_run_path` is relative to the current `.ascout/runs/<run-id>/` directory.

Host/tool paths may be resolved transiently into a repository-relative or run-relative **receipt candidate**. The candidate's **original spelling is validated before any lossy normalization, separator collapse, trailing-separator removal, or dot-segment resolution**. A machine receipt is invalid if that original candidate is POSIX-absolute, Windows drive-absolute, UNC, URI-absolute, contains a backslash, contains `.` / `..` segments, contains an empty segment such as `src//file.ts`, or has a trailing separator such as `src/`. Validation MUST reject rather than repair, collapse, or rewrite those spellings. Only after raw-form rejection passes may non-lossy comparison/namespace-containment logic operate on the already-canonical candidate. Raw host absolute paths may exist transiently while resolving tools/files but are never written to the receipt or run artifacts.

## 4. VerificationTaskDefinition

Fixed semantic task types:

```text
typecheck
lint
test
pytestBasic
```

The same canonical identifiers are used in config v1 and receipt v1. Config cannot add task types or dependency edges.

Definition fields include task id/type/scope, `authorized_by`, source path, argv when resolved, tool info, timeout, internal prerequisite IDs, selection descriptor.

Task categories are independent by default; internal prerequisites exist only when actual validity requires them.

## 5. CommandSurfaceAdmission

Each task result records:

- `command_surface_changed: boolean`;
- `changed_authority_paths[]`;
- `execution_admission`:
  - `normal`;
  - `refused_changed_surface`;
  - `explicit_changed_surface_override`.

### Invariants

1. `command_surface_changed=false` ⇒ `execution_admission=normal`, no changed authority paths.
2. `command_surface_changed=true` ⇒ admission is either `refused_changed_surface` or `explicit_changed_surface_override`, with at least one changed authority path.
3. `refused_changed_surface` ⇒ status `NOT_RUN`, reason code `command_surface_changed`, task process did not launch.
4. `explicit_changed_surface_override` ⇒ a human supplied the per-invocation admission; changed authority paths are recorded.
5. The admission is never persisted as a future trust grant and cannot be auto-supplied by an agent integration.

Effective command surfaces include repository/config files actually used to determine/load the task command or executable configuration, including effective pytest configuration when `pytestBasic` is applicable.

## 6. VerificationTaskResult

Fields include stable task identity/provenance, redacted persisted argv + redaction flag, nullable tool identity, admission fields, seven-state status, reasons, process exit/timing, observations/cache, selected/deselected counts where meaningful, evidence/artifact refs, truncation.

Status invariants:

- `PASS`: executed successfully.
- `FAIL`: executed repository/test finding.
- `FLAKY`: contradictory test observations.
- `BLOCKED`: actual internal prerequisite prevented valid execution.
- `ERROR`: Ascout/task execution failure; repository correctness not inferred.
- `NOT_APPLICABLE`: semantic task category does not apply.
- `NOT_RUN`: applicable known work did not execute, including missing tool/config, budget, explicit disablement, or changed-command admission refusal.

`NOT_RUN`, `BLOCKED`, and `ERROR` require non-empty `reason_code` and `reason_text`. Non-executed tasks do not fabricate argv/tool identity. Valid test deselection is SelectionAccount data, not task `NOT_RUN`.

## 7. Evidence

Receipt v1 contains a root current-run `evidence[]` collection.

Logical Evidence ID:

```text
(run_id, task_id, sequence)
```

Each evidence entry records:

- `evidence_id`;
- `run_id`;
- `task_id`;
- positive integer `sequence`;
- kind (`process_result | test_result | coverage | admission | warning | other`);
- SHA-256 digest;
- optional `artifact_id`;
- redaction/truncation flags.

### Semantic reference invariants

Before a receipt is emitted or otherwise accepted as valid:

1. evidence IDs are unique;
2. each evidence entry `run_id` equals receipt `run.run_id`;
3. each evidence entry `task_id` resolves to one receipt task;
4. every task/finding `evidence_id` resolves to exactly one evidence entry;
5. every non-null evidence `artifact_id` resolves to one receipt artifact;
6. task/finding evidence references may not cross task/run boundaries contrary to their declared linkage;
7. artifact IDs and evidence IDs used for references are unique.

JSON Schema constrains entry shape; an Ascout-owned pure semantic validator enforces these cross-object relations.

## 8. Finding

Current-run issue fields: producer/task/rule/test, message/location, normalized severity where safe, `in_changed_lines`, `introduced_by_change`, determinism, observations/reproduction, optional weak fingerprint, current-run evidence refs.

`introduced_by_change` defaults `unknown` in M1.

Reproduction:

- one valid failing observation → unknown;
- repeated consistent failures → true;
- contradictory observations → flaky / stable-failure reproduction false;
- rerun unavailable/error before valid second observation → unknown;
- compiler/lint findings may use `not_applicable` for reproduction experiment.

Weak fingerprint v1 hashes version + task/rule identity + relative path + normalized message using length-prefix framing. No line/tree/structural identity and no evidence transfer.

## 9. SelectionAccount

Strict fields:

- mode: `full | native_related | native_changed | configured | no_test_task`;
- initial scope: repository or package;
- selected/deselected/total counts as integer or null;
- widening boolean/triggers;
- at most two SelectionPass records;
- limitations.

SelectionPass has ordinal 1–2, mode, scope, trigger, and counts. Unknown counts require limitation; never guessed.

## 10. Exercise

For changed executable/instrumentable lines:

- `EXERCISED`: resolved execution count is an integer > 0;
- `NOT_EXERCISED`: resolved execution count is exactly 0;
- `UNRESOLVED`: execution count is null and a non-empty reason explains why source/executable mapping could not be established reliably.

Coverage is execution evidence, not correctness. Any material `NOT_EXERCISED`/`UNRESOLVED` line remaining after permitted widening prevents exit `0`.

## 11. TestChangeFact

First-slice Git facts only:

```text
test_file_changed
test_file_deleted
snapshot_changed
snapshot_deleted
```

No semantic `weakened` inference.

## 12. ArtifactRef / Privacy

Artifacts live under current `.ascout/runs/<run-id>/`. Artifact IDs are unique within a receipt. `relative_run_path` is canonical and relative to that run directory; it cannot escape the run directory or encode an absolute/URI path. Persisted outputs and argv are redacted before storage; raw secret-bearing argv, raw credential-bearing remote, and raw absolute local repo path are not artifacts.

## 13. Semantic Receipt Validation

JSON Schema validates field-level shapes. One Ascout-owned pure semantic validator additionally verifies before emission:

- every persisted path candidate is checked in its original receipt spelling before any lossy normalization; invalid absolute/drive/UNC/URI/backslash/dot-segment/duplicate-separator/trailing-separator forms are rejected, never repaired, and namespace containment is checked only after raw-form rejection passes;
- evidence/task/artifact reference integrity and uniqueness;
- source start/end and `stability` consistency;
- task status/reason/admission invariants;
- exercise summary/record consistency;
- aggregate task counts/finding count;
- completeness rules;
- exit precedence and summary exit code.

Any internal/future receipt acceptance path MUST reuse the same semantic validator rather than inventing a second interpretation.

This is a pure validation function, not a service, persistence layer, or workflow engine.

## 14. Completeness

- `complete`: at least one material applicable task executed; every applicable task executed or legitimately N/A; no applicable NOT_RUN/BLOCKED; selection safe; no remaining material exercise gap.
- `materially_incomplete`: applicable omission/block/admission refusal, nothing material executed, unsafe selection, or remaining exercise gap.
- `unknown_due_to_error`: integrity/internal error prevents reliable completeness determination.

Finding/flake is an executed outcome and does not itself mean incomplete.

## 15. Exit Decision

```text
2 integrity/internal/config/task-execution error
> 3 tree drift
> 1 repository finding or flake
> 4 stable materially incomplete/gapped
> 0 stable complete no finding/flake/error
```

A changed-command task refused by default is an applicable `NOT_RUN` and therefore prevents exit `0`. Explicit per-run admission may permit that task to execute, but the receipt still records that override.