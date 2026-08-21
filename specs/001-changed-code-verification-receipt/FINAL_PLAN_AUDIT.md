# 001 — Independent Final Plan Audit

**Date:** 2026-08-21  
**Audit target exact head:** `e15785545c0075081eeaf2691a41648e76031dfe`  
**Branch:** `planning/000-ascout-foundation`  
**Verdict:** `PASS_READY_FOR_FRESH_EXACT_HEAD_PR_REVIEW`  
**Implementation authorization:** **NO**  
**Merge authorization:** **NO — fresh external exact-HEAD review remains required**

This audit supersedes all earlier Ascout founding-plan audit verdicts for merge-readiness purposes.

The target contains the fully reconciled planning set after internal analysis, Qodo review, CodeRabbit findings CR1–CR12, path/privacy hardening, and canonical Master Plan authority repair. It contains no product implementation.

Writing this audit creates a governance-only successor commit. That successor still requires fresh exact-HEAD external review and branch-purity verification. Any later material mutation to constitution/spec/canonical plan/data model/contracts/tasks invalidates affected audit claims.

## 1. External Review Reconciliation

### Qodo Q1–Q4

All valid and resolved:

- omission/error statuses require non-empty reasons;
- rename requires `previous_path`;
- exercise state/count/reason semantics are strict;
- `pytestBasic` is canonical across config/receipt/model/plan.

Later repeated Qodo text was checked against exact linked SHAs and contradicted the already-repaired live schema, so it is not treated as new evidence.

### CodeRabbit CR1–CR11

All valid accepted findings are resolved:

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
- plan opening summary includes `pytestBasic`.

### CodeRabbit CR12 — conflicting Master Plan authority

**Severity:** BLOCKER / GOVERNANCE  
**Verdict:** VALID  
**Disposition:** RESOLVED

At the reviewed state, both:

```text
docs/founding/ASCOUT_MASTER_PLAN_V1.md
docs/founding/MASTER_PLAN_V1.md
```

looked like live normative “Master Plan v1” documents and differed materially. That created a credible path for an implementer to reuse superseded command-admission/configuration semantics.

Final authority model:

```text
docs/founding/MASTER_PLAN_V1.md
```

is the sole canonical Master Plan v1.

The legacy path:

```text
docs/founding/ASCOUT_MASTER_PLAN_V1.md
```

is now a short explicit tombstone marked:

```text
SUPERSEDED / NON-AUTHORITATIVE
```

It contains no alternate normative requirements and explicitly states it MUST NOT be used for implementation authorization, Spec Kit derivation, requirement interpretation, task planning, code review, or release decisions. Historical content remains available through Git history.

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
- persisted path invariants are valid.

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

Required properties are explicit and reconciled:

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
- `in_changed_lines` is locational, not causal.

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

Schema + semantic validation reject absolute POSIX, Windows drive, UNC, URI-absolute, backslash-canonicalization, `.` / `..` traversal, and namespace-escaping forms after normalization.

No virtual filesystem/path-policy subsystem was added.

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
- canonical relative persisted-path schema;
- separate stability/completeness;
- redacted persisted argv;
- one pure semantic validator for cross-object, path-containment, aggregate, completeness, and exit-code consistency.

**Result:** `PASS`

## 7. Benchmark / Cross-Platform Audit

Benchmark measures Ascout's own claims, including:

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
- VFS/path policy subsystem;
- schema-generation layer;
- task-name mapping layer;
- workflow engine;
- persistent trust state;
- public plugin SDK;
- semantic graph;
- recursive widening;
- required AI;
- sandbox.

CR12 reduces live normative surface from two plans to one.

**Result:** `PASS`

## 9. Task / Requirements Audit

Task range remains exactly:

```text
T001–T088
```

No implementation task was added for CR12 because canonical-document authority is a governance invariant, not runtime functionality.

Requirements/checklist gate:

```text
87 / 87 PASS
```

CHK087 locks the sole canonical Master Plan and tombstone semantics.

**Result:** `PASS`

## 10. Planning-Branch Purity at Audit Target

Exact comparison of `main` to audit target `e15785545c0075081eeaf2691a41648e76031dfe`:

- base main SHA: `6735fe500c8408081a9950ac33abc69c3f272ce3`;
- ahead by 91 commits;
- behind by 0;
- 19 changed files;
- paths remain only `.specify/`, `docs/founding/`, `specs/001-changed-code-verification-receipt/`, and `LICENSE`;
- the nineteenth file is the legacy Master Plan tombstone;
- no `src/`;
- no `tests/`;
- no `benchmarks/`;
- no package manifest/lockfile;
- no workflow;
- no product implementation.

**Result:** `PASS`

## 11. Residual Implementation / Release Gates

Not planning blockers:

1. exact `cross-spawn` version/transitive provenance;
2. exact benchmark repositories/commits/licenses/execution terms;
3. npm package identity/ownership or scoped fallback;
4. native Windows process-tree proof;
5. real Vitest/Jest/pytest version variance and selector/config misses;
6. measured time-to-signal.

## 12. Final Verdict

`PASS_READY_FOR_FRESH_EXACT_HEAD_PR_REVIEW`

At audit target `e15785545c0075081eeaf2691a41648e76031dfe`:

- open internal BLOCKER findings: **0**
- open internal MAJOR findings: **0**
- accepted Qodo findings unrepaired: **0**
- accepted CodeRabbit findings CR1–CR12 unrepaired: **0**
- requirements/contract/governance checks: **87/87 PASS**
- constitutional violations: **0**
- known false-green paths: **0**
- known silent changed-command execution paths: **0**
- known unresolved evidence-reference contract paths: **0**
- known accepted raw/escaping persisted path forms: **0**
- live authoritative Master Plan documents: **1**
- product implementation files: **0**

### Authorization boundary

This verdict authorizes only:

- keeping PR #1 Ready for Review;
- consuming a **fresh external exact-HEAD review** of the post-audit PR head;
- final merge consideration only after that review is clean and head/purity are reverified.

It does **not** authorize:

- merging before fresh repaired-head review completes;
- starting T001;
- writing product implementation;
- publishing a package.

Any material mutation after the audited target requires affected-claim reconciliation and another exact-HEAD review before merge or implementation authorization.