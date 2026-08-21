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
- exercise/test-change/findings/artifacts;
- `stability: stable | tree_drifted | unknown`;
- derived summary/completeness/exit.

Invariants: evidence belongs only to this run; no cross-run evidence reuse; `stable` requires valid equal start/end digests; `tree_drifted` requires valid unequal digests; `unknown` means integrity failure prevented valid comparison.

## 2. SourceState

Fields include repository ID/kind/portable, HEAD, detached/shallow, digest version/value, index/unstaged/included-untracked counts.

### Repository identity

- Remote: raw origin is never persisted. Strip credentials/userinfo/query/fragment; if safe normalization is not possible, use an opaque one-way ID.
- Local-only: `repository_id = local:<sha256(canonical-real-repository-path)>`; `portable=false`. Raw absolute path is never persisted/rendered.

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

## 4. VerificationTaskDefinition

Fixed semantic task types:

```text
typecheck
lint
test
pytest_basic
```

Config cannot add task types or dependency edges.

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
2. `refused_changed_surface` ⇒ command surface changed, status `NOT_RUN`, reason `command_surface_changed`, task process did not launch.
3. `explicit_changed_surface_override` ⇒ command surface changed and a human supplied the per-invocation admission; changed authority paths are recorded.
4. The admission is never persisted as a future trust grant and cannot be auto-supplied by an agent integration.

Effective command surfaces include the repository/config files actually used to determine/load the task command or executable configuration, not every changed config file in the repository.

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

Non-executed tasks do not fabricate argv/tool identity. Valid test deselection is SelectionAccount data, not task `NOT_RUN`.

## 7. Evidence

Logical Evidence ID:

```text
(run_id, task_id, sequence)
```

Evidence/artifacts are current-run only and may record digest, redaction, truncation.

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

- `EXERCISED`: resolved count > 0;
- `NOT_EXERCISED`: resolved count = 0;
- `UNRESOLVED`: source/executable mapping cannot be established reliably.

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

Artifacts live under current `.ascout/runs/<run-id>/`. Persisted outputs and argv are redacted before storage; raw secret-bearing argv, raw credential-bearing remote, and raw absolute local repo path are not artifacts.

## 13. Completeness

- `complete`: at least one material applicable task executed; every applicable task executed or legitimately N/A; no applicable NOT_RUN/BLOCKED; selection safe; no remaining material exercise gap.
- `materially_incomplete`: applicable omission/block/admission refusal, nothing material executed, unsafe selection, or remaining exercise gap.
- `unknown_due_to_error`: integrity/internal error prevents reliable completeness determination.

Finding/flake is an executed outcome and does not itself mean incomplete.

## 14. Exit Decision

```text
2 integrity/internal/config/task-execution error
> 3 tree drift
> 1 repository finding or flake
> 4 stable materially incomplete/gapped
> 0 stable complete no finding/flake/error
```

A changed-command task refused by default is an applicable `NOT_RUN` and therefore prevents exit `0`. Explicit per-run admission may permit that task to execute, but the receipt still records that override.
