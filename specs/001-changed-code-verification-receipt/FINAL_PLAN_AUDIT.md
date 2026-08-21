# 001 — Independent Final Plan Audit

**Date:** 2026-08-21  
**Audit target exact head:** `5ce3c6b9b0fc4bbb14e2a1111a27de5caf9bb3a1`  
**Branch:** `planning/000-ascout-foundation`  
**Verdict:** `PASS_READY_FOR_FRESH_EXACT_HEAD_PR_REVIEW`  
**Implementation authorization:** **NO**  
**Merge authorization:** **NO — fresh external exact-HEAD review remains required**

This audit supersedes all earlier Ascout founding-plan audit verdicts for merge-readiness purposes.

The audit target contains the reconciled planning set after internal analysis, Qodo review, CodeRabbit findings CR1–CR13, path/privacy hardening, and canonical Master Plan authority repair. It contains no product implementation.

Writing this audit creates a governance-only successor commit. That successor still requires fresh exact-HEAD review by every code-review integration actually connected to this PR plus final branch-purity verification. Any later material mutation to constitution/spec/canonical plan/data model/contracts/tasks invalidates affected audit claims.

## 1. External Review Reconciliation

### Qodo Q1–Q4

All valid findings are resolved:

- omission/error statuses require non-empty reasons;
- rename requires `previous_path`;
- exercise state/count/reason semantics are strict;
- `pytestBasic` is canonical across config/receipt/model/plan.

Later stale repetitions were checked against exact linked SHAs and contradicted the repaired schema. Qodo's latest exact-head pass before this audit reported zero bugs, zero rule violations, and zero skill insights. A fresh post-audit exact-head Qodo result remains required.

### CodeRabbit CR1–CR12

All accepted findings are resolved:

- fresh exact-head governance;
- changed-command default refusal consistency;
- Markdown integrity;
- root current-run `evidence[]` and referential integrity;
- opaque repository identity;
- changed-surface admission constraints;
- one pure semantic receipt validator;
- gap-to-exit benchmark assertion;
- `pytestBasic` command-admission coverage;
- canonical relative persisted paths;
- plan opening scope includes `pytestBasic`;
- one canonical Master Plan v1, with the old path reduced to a non-authoritative tombstone.

### CodeRabbit CR13 — noncanonical persisted path serialization

**Severity:** MAJOR / DATA INTEGRITY  
**Verdict:** VALID  
**Disposition:** RESOLVED

CodeRabbit verified that the prior shared `canonicalRelativePath` rule still accepted:

```text
src//file.ts
src/
```

Those values are relative and non-traversing but not canonical because they contain an empty path segment or trailing separator, allowing more than one serialized representation of the same logical path.

The shared path predicate now requires one or more non-empty slash-delimited segments and continues to reject:

- POSIX absolute paths;
- Windows drive and UNC forms;
- URI-absolute forms;
- backslashes;
- `.` / `..` segments;
- duplicate separators;
- trailing separators.

CHK088 locks these serialization cases. Existing T009/T025/T026/T033/T081 already own path-contract, semantic validation, end-to-end, and cross-platform negative cases; no task or subsystem was added.

**Result:** `PASS`

## 2. Product Honesty Audit

Clean exit `0` requires:

- stable source state;
- valid receipt schema + semantic validation;
- no higher-precedence integrity/config/task-execution error;
- at least one material applicable task executed;
- no repository finding/flake;
- no applicable `NOT_RUN`/`BLOCKED`;
- no changed-command admission refusal;
- safe selection/widening;
- no remaining material `NOT_EXERCISED`/`UNRESOLVED` changed executable line;
- current-run evidence references resolve;
- persisted path invariants are valid and canonical.

Material exercise gaps never become green; stable incomplete state maps to exit `4` absent higher precedence.

**Result:** `PASS`

## 3. Execution Authority Audit

v0.x remains limited to the developer's own trusted local repository.

Within that boundary:

- no implicit dependency installation;
- task command provenance is recorded;
- changed effective command/config authority is refused before launch/load by default;
- `NOT_RUN(command_surface_changed)` carries explicit reasons and authority paths;
- `--allow-changed-command-surface` is explicit, human-supplied, per invocation, receipt-visible, and never persisted or auto-added by agents/hooks;
- `pytestBasic` uses the same authority gate;
- no trust DB, sandbox manager, policy language, or autonomous approval system is introduced.

**Result:** `PASS_WITH_EXPLICIT_TRUSTED_LOCAL_SCOPE`

## 4. Source / Evidence / Privacy Audit

Required properties remain explicit:

- remote ID: `remote:<sha256(normalized-credential-free-remote)>`, `portable=true`;
- local-only ID: `local:<sha256(canonical-real-path)>`, `portable=false`;
- raw remote/local location material is never persisted;
- HEAD/index/worktree/all non-gitignored untracked source state is bound except `.ascout/`;
- worktree type/mode changes are represented;
- start/end drift is explicit;
- rename preserves old/new path identity;
- root current-run `evidence[]` exists;
- evidence/task/artifact references are unique/resolvable;
- evidence never transfers across runs/trees;
- weak fingerprints are matching aids only;
- `in_changed_lines` remains locational rather than causal.

Absolute future implementation benchmark gates remain:

```text
cross-tree evidence leakage = 0
binding-integrity violations = 0
```

**Result:** `PASS`

## 5. Persisted Path Audit

Receipt path-bearing fields use canonical slash-separated relative forms in their declared namespace:

- repository fields are repository-root-relative;
- `artifact.relative_run_path` is current-run-directory-relative.

Schema + semantic validation reject absolute/host-native/escaping forms and noncanonical alternate serialization, including duplicate or trailing separators.

No virtual filesystem, path registry, mount abstraction, or path-policy subsystem was introduced.

**Result:** `PASS`

## 6. Machine Contract Audit

### Config v1

- versioned non-executable JSON;
- fixed task IDs only: `typecheck`, `lint`, `test`, `pytestBasic`;
- no arbitrary workflow/prerequisite graph;
- no persistent trust/admission state.

### Receipt v1

- same fixed task IDs as config;
- strict task/status/selection shapes;
- explicit reasons for `NOT_RUN`/`BLOCKED`/`ERROR`;
- strict rename and exercise invariants;
- strict admission invariants;
- opaque repository IDs;
- root current-run evidence collection;
- canonical unique relative persisted-path serialization;
- separate stability/completeness;
- redacted persisted argv;
- one pure semantic validator for cross-object, path-containment, aggregate, completeness, and exit-code consistency.

**Result:** `PASS`

## 7. Benchmark / Cross-Platform Audit

Benchmark claims remain bounded to measurable properties:

```text
cross-tree evidence leakage = 0
binding-integrity violations = 0
stable material exercise gap returning exit 0 = 0
```

No arbitrary pre-data recall threshold is frozen.

Cross-platform plan remains honest:

- `cross-spawn` handles launch normalization only;
- Ascout owns timeout/capture/process-tree cleanup;
- persisted paths use one canonical cross-OS form;
- native Windows process-tree behavior remains a release-blocking evidence gate;
- development CI is planned for Windows/macOS/Linux on Node 22/24.

**Result:** `PASS_AS_PLANNING_CONTRACT`

## 8. Ponytail / YAGNI Audit

The final repairs do not introduce:

- DB/evidence service;
- daemon/server;
- validator service;
- VFS/path-policy subsystem;
- schema-generation layer;
- task-name mapping layer;
- workflow engine;
- persistent trust state;
- public plugin SDK;
- semantic graph;
- recursive widening;
- required AI;
- sandbox.

CR12 reduces normative surface from two live plans to one. CR13 tightens one existing schema predicate.

**Result:** `PASS`

## 9. Task / Requirements Audit

Task range remains exactly:

```text
T001–T088
```

No implementation task was added for CR12 or CR13 because both are covered planning/contract invariants rather than new runtime capabilities.

Requirements/checklist gate:

```text
88 / 88 PASS
```

- CHK087 locks sole canonical Master Plan authority and tombstone semantics.
- CHK088 locks rejection of duplicate path separators and trailing separators.

**Result:** `PASS`

## 10. Planning-Branch Purity at Audit Target

Exact comparison of `main` to audit target `5ce3c6b9b0fc4bbb14e2a1111a27de5caf9bb3a1`:

- base main SHA: `6735fe500c8408081a9950ac33abc69c3f272ce3`;
- ahead by 95 commits;
- behind by 0;
- 19 changed files;
- paths remain only `.specify/`, `docs/founding/`, `specs/001-changed-code-verification-receipt/`, and `LICENSE`;
- the nineteenth path is the legacy Master Plan tombstone;
- no `src/`;
- no `tests/`;
- no `benchmarks/`;
- no package manifest/lockfile;
- no workflow;
- no product implementation.

**Result:** `PASS`

## 11. Review Integration Inventory

Connected review surfaces proven on this PR/current lineage:

1. **CodeRabbit** — commit status/review/comment integration.
2. **Qodo Code Review** — PR review/comment integration.

No GitHub Actions workflow runs exist on the audit target lineage, and no additional code-review bot is evidenced in the PR discussion/review history at this audit.

The post-audit successor must receive clean current-head evidence from both CodeRabbit and Qodo before merge consideration.

## 12. Residual Implementation / Release Gates

Not planning blockers:

1. exact `cross-spawn` version/transitive provenance;
2. exact benchmark repositories/commits/licenses/execution terms;
3. npm package identity/ownership or scoped fallback;
4. native Windows process-tree proof;
5. real Vitest/Jest/pytest version variance and selector/config misses;
6. measured time-to-signal.

## 13. Final Verdict

`PASS_READY_FOR_FRESH_EXACT_HEAD_PR_REVIEW`

At audit target `5ce3c6b9b0fc4bbb14e2a1111a27de5caf9bb3a1`:

- open internal BLOCKER findings: **0**
- open internal MAJOR findings: **0**
- accepted Qodo findings unrepaired: **0**
- accepted CodeRabbit findings CR1–CR13 unrepaired: **0**
- requirements/contract/governance checks: **88/88 PASS**
- constitutional violations: **0**
- known false-green paths: **0**
- known silent changed-command execution paths: **0**
- known unresolved evidence-reference contract paths: **0**
- known accepted noncanonical/escaping persisted path forms: **0**
- live authoritative Master Plan documents: **1**
- product implementation files: **0**

### Authorization boundary

This verdict authorizes only:

- keeping PR #1 Ready for Review;
- consuming **fresh external exact-HEAD review evidence** from CodeRabbit and Qodo on the post-audit PR head;
- final merge consideration only after those reviews are clean and head/purity/threads/mergeability are reverified.

It does **not** authorize:

- merging before all connected review gates are clean on the same head;
- starting T001;
- writing product implementation;
- publishing a package.

Any material mutation after the audited target requires affected-claim reconciliation and another exact-HEAD review before merge or implementation authorization.