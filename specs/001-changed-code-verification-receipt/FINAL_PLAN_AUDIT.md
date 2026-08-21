# 001 — Independent Final Plan Audit

**Date:** 2026-08-21  
**Audit target exact head:** `3cdcdd7b938606f5c4a9c907421ba9f7d69564d0`  
**Branch:** `planning/000-ascout-foundation`  
**Verdict:** `PASS_READY_FOR_FRESH_EXACT_HEAD_PR_REVIEW`  
**Implementation authorization:** **NO**  
**Merge authorization:** **NO — a fresh external review of the post-audit PR head is required**

This is the renewed adversarial final audit after internal analysis, the independent changed-command admission audit, Qodo review, and **two CodeRabbit exact-head review rounds** with all accepted findings reconciled.

It supersedes all earlier final-audit verdicts for merge-readiness purposes.

The audit target contains no product implementation. Writing this audit creates a governance-only successor commit; that successor still requires fresh exact-HEAD external review and branch-purity verification. Any later **material** mutation to constitution/spec/plan/data model/contracts/tasks invalidates affected audit claims and requires reconciliation before merge or implementation authorization.

## 1. Review History Consumed

This audit consumes five evidence layers:

1. internal cross-artifact analysis + Ponytail/YAGNI reduction;
2. independent pre-PR adversarial audit, which found the changed-command warning-only blocker;
3. Qodo review, which found four machine-contract defects;
4. CodeRabbit round 1, which found governance freshness, evidence-reference, repository-ID privacy, semantic-validation, benchmark, pytest-admission, and document-integrity defects/confirmations; and
5. CodeRabbit round 2, explicitly anchored to `15f590efcff6814ea5c203f96e3513c9ba0d2a08`, which found persisted-path privacy/containment and a `pytestBasic` scope-summary inconsistency.

External findings are not accepted merely because a bot emitted them. Each finding was checked against the live exact source and product contract. Repeated stale Qodo findings were rejected only after direct inspection of the exact SHA proved the relevant repaired constraints were already present.

## 2. Internal High-Severity Repairs Revalidated

### False-green exercise gap

A stable run with material changed executable lines remaining `NOT_EXERCISED` or `UNRESOLVED` after permitted widening cannot return exit `0`; absent higher precedence it is `materially_incomplete`, exit `4`.

**Result:** `PASS`

### Changed command/config execution authority

If the current diff changes an effective authority/config file the task would execute/load:

- ordinary check refuses the affected task before launch/load;
- task is `NOT_RUN(command_surface_changed)` with non-empty reason text/code;
- at least one changed authority path is recorded;
- admission is `refused_changed_surface`;
- a human may use `--allow-changed-command-surface` only for that invocation;
- explicit override is receipt-visible and never persisted/auto-added by agent integration.

The same generic mechanism covers `pytestBasic` effective configuration.

**Result:** `PASS_WITH_EXPLICIT_TRUSTED_LOCAL_SCOPE`

## 3. Qodo Reconciliation Revalidated

- **Q1 — reasons:** `NOT_RUN`, `BLOCKED`, and `ERROR` require non-empty `reason_code` and `reason_text`.
- **Q2 — rename:** `change_kind=renamed` requires `previous_path`; non-renames do not fabricate it.
- **Q3 — exercise:** `EXERCISED` count > 0; `NOT_EXERCISED` count = 0; `UNRESOLVED` count = null + non-empty reason.
- **Q4 — task IDs:** `typecheck`, `lint`, `test`, `pytestBasic` are canonical across config/receipt/model/plan.

The later repeated Qodo text pointing at a newer SHA was directly checked against that exact file and contradicted the live schema; those repetitions were treated as stale/cached evidence, not new defects.

**Result:** `PASS`

## 4. CodeRabbit Round 1 Reconciliation Revalidated

- **CR1 — governance:** fresh exact-HEAD cross-artifact + branch-purity review is mandatory after final audit/material mutation.
- **CR2 — command admission:** Master Plan matches default-refusal semantics.
- **CR3 — Markdown integrity:** malformed analysis table repaired.
- **CR4 — evidence:** receipt has root current-run `evidence[]` with resolvable references.
- **CR5 — repository identity:** schema enforces `remote:<sha256>` / `local:<sha256>` with portability discriminator.
- **CR6 — admission:** changed command surface cannot be `normal` admission.
- **CR7 — semantic receipt validation:** one pure validator closes cross-object/cross-field invariants before emission and future internal acceptance.
- **CR8 — benchmark:** stable material exercise gap returning exit `0` has absolute acceptable count zero.
- **CR9 — pytest admission:** `pytestBasic` effective config is covered by command-admission integration.

**Result:** `PASS`

## 5. CodeRabbit Round 2 Reconciliation Revalidated

### CR10 — persisted path privacy / containment

**Severity:** MAJOR / SECURITY & PRIVACY  
**Verdict:** VALID  
**Disposition:** RESOLVED

Problem: existing path-bearing receipt fields could accept workstation absolute paths or namespace-escaping forms even though repository identity itself had been hardened.

Final contract:

- repository-bearing persisted fields are slash-separated and relative to repository root;
- `artifact.relative_run_path` is relative to the current `.ascout/runs/<run-id>/` directory;
- schema defines/reuses `canonicalRelativePath` and nullable variant;
- schema rejects obvious POSIX absolute, Windows drive, URI-scheme, `.`/`..` segment, and backslash-canonicalization violations;
- UNC/backslash forms fail the shared schema rule;
- the pure semantic receipt validator additionally enforces normalization and declared-namespace containment;
- invalid escaping paths are rejected, not silently rewritten into misleading safe-looking paths;
- raw host absolute paths may exist transiently for tool resolution but are never persisted/rendered.

Traceability:

- **FR-042 / SC-015**;
- T009 negative contract cases;
- T025 pure receipt path invariant;
- T026 validation before emission;
- T033 end-to-end rejection;
- T081 cross-platform/golden path normalization.

No VFS, mount abstraction, path registry, sandbox, path-policy service, dependency, or new task range was introduced.

**Result:** `PASS`

### CR11 — plan opening scope omitted `pytestBasic`

**Severity:** MINOR / PLAN CONSISTENCY  
**Verdict:** VALID  
**Disposition:** RESOLVED

The opening Summary now names exactly all four fixed categories:

```text
typecheck
lint
test
pytestBasic
```

No behavioral expansion was introduced; the summary now matches the already-canonical config/receipt/task contract.

**Result:** `PASS`

## 6. False-Green Audit

Clean exit `0` requires:

- source stability `stable`;
- receipt schema + semantic validation success;
- no higher-precedence integrity/config/task-execution error;
- at least one material applicable task executed;
- no repository finding/flake;
- no applicable `NOT_RUN`/`BLOCKED`;
- no changed-command admission refusal;
- safe affected selection/widening;
- no remaining material changed executable exercise gap;
- current-run evidence references resolve;
- persisted path invariants are valid.

Invalid receipt paths are integrity errors, not evidence that may be silently accepted or greened.

**Result:** `PASS`

## 7. Evidence / Source-Binding Audit

Required properties:

- opaque privacy-safe repository ID;
- HEAD/index/worktree/all non-gitignored untracked source binding except `.ascout/`;
- mode/type changes represented;
- rename old/new path fidelity;
- start/end drift;
- root current-run evidence collection;
- evidence IDs unique/resolvable;
- evidence run/task/artifact linkage validated;
- no evidence transfer across runs/trees;
- weak fingerprints never substitute for evidence;
- locational `in_changed_lines` remains distinct from causal attribution.

Absolute future implementation benchmark gates:

```text
cross-tree evidence leakage = 0
binding-integrity violations = 0
```

**Result:** `PASS`

## 8. Persisted Path / Privacy Audit

The final model separates opaque repository identity from path-bearing receipt fields.

Persisted repository paths include changed/current/previous paths, package scope, task source path, changed authority paths, exercise paths, test-change paths, and finding paths. These must be canonical repository-relative paths. Artifact paths are canonical run-relative paths.

Rejected after normalization/validation:

```text
/etc/passwd
C:/Users/name/file
C:\Users\name\file
\\server\share\file
file:///tmp/file
https://host/path
../secret
a/../secret
./src/file
src\file
```

Accepted representative forms include:

```text
src/file.ts
packages/app
raw/task/output.txt
```

The shared schema predicate was independently exercised against representative POSIX, Windows, UNC, URI, traversal, backslash, and valid-relative cases and behaved as intended. The semantic validator remains authoritative for full canonicality and namespace containment beyond the coarse JSON Schema predicate.

**Result:** `PASS`

## 9. Machine Contract Audit

### Config v1

- versioned non-executable JSON;
- fixed task identifiers only;
- canonical `pytestBasic`;
- no arbitrary task/prerequisite/workflow graph;
- no persistent trust/admission state.

### Receipt v1

- same fixed task identifiers as config;
- strict task/status/selection shapes;
- explicit omission/error reasons;
- strict rename identity;
- strict exercise state/count/reason semantics;
- strict admission invariants;
- privacy-safe repository ID discriminator;
- root current-run evidence collection;
- shared canonical relative path schema across persisted path-bearing fields;
- separate stability/completeness;
- non-executed tasks need not fabricate argv/tool identity;
- redacted persisted argv.

### Semantic validator

One shared pure validator closes referential, cross-field, normalization, and namespace-containment constraints that JSON Schema draft 2020-12 does not express cleanly.

It rejects:

- noncanonical/escaping persisted paths;
- dangling/duplicate/cross-run/cross-task evidence references;
- unresolved artifact references;
- source stability mismatch;
- task reason/admission inconsistency;
- exercise record/aggregate inconsistency;
- aggregate task/finding mismatch;
- completeness/exit mismatch.

**Result:** `PASS_AFTER_QODO_AND_TWO_CODERABBIT_ROUNDS`

## 10. Windows / Cross-Platform Audit

The plan does not pretend POSIX process/path semantics apply to Windows:

- `cross-spawn` only for executable/shim launch normalization;
- Ascout owns timeout/capture/process-tree termination;
- persisted paths normalize to one slash-separated relative form rather than leaking host-native absolute syntax;
- T081 covers deterministic path/receipt normalization across OS boundaries;
- native Windows process-tree cases remain release-blocking evidence;
- development CI planned for Windows/macOS/Linux, Node 22/24.

Native proof remains a release gate, not a current claim.

**Result:** `PASS_AS_PLANNING_CONTRACT`

## 11. Benchmark Audit

Selection corpus measures Ascout/native selection vs objective full-suite ground truth. Gap corpus measures changed-code exercise against independent full-run coverage.

Metrics/gates include:

- selection recall;
- false-PASS;
- gap accuracy;
- unresolved mapping;
- cold/warm time;
- drift/determinism/flake;
- cross-tree evidence leakage = 0;
- binding-integrity violations = 0;
- stable material exercise gap returning exit 0 = 0.

No arbitrary pre-data recall threshold is frozen.

**Result:** `PASS`

## 12. Ponytail / YAGNI Audit

The review repairs did **not** introduce:

- database/evidence service;
- validator service;
- path/VFS policy subsystem;
- schema-generation subsystem;
- shared generated type package;
- task-name mapping layer;
- workflow engine;
- persistent trust state;
- daemon/server;
- plugin SDK;
- semantic graph;
- recursive widening;
- AI subsystem;
- sandbox.

Root `evidence[]`, opaque IDs, exact-head governance, one pure semantic validator, and one shared persisted-path predicate are direct truth/privacy contract requirements, not speculative architecture.

**Result:** `PASS`

## 13. Task Plan Audit

Task range remains **T001–T088**.

Existing tasks were strengthened instead of multiplied:

- T009: schema + semantic invariants, evidence refs, privacy-safe IDs, persisted path rejection;
- T012/T018: repository ID privacy contract;
- T020: rename old/new path fidelity;
- T025/T026: one receipt model + semantic validator + path containment before emission/acceptance;
- T028/T037/T038: pytestBasic admission/config coverage;
- T033: E2E evidence/path rejection and no-green behavior;
- T047/T055: exercise state/count/reason integrity;
- T077: gap-to-exit absolute benchmark gate;
- T081: cross-OS canonical persisted path goldens;
- T088: clean-checkout semantic-validation qualification.

**Result:** `PASS`

## 14. Requirements Gate

Current repaired checklist:

```text
86 / 86 PASS
```

- CHK073–CHK076: Qodo regressions.
- CHK077–CHK084: CodeRabbit round-1 regressions/governance checks.
- CHK085: canonical persisted path contract.
- CHK086: plan opening scope includes `pytestBasic`.

**Result:** `PASS`

## 15. Planning-Branch Purity at Audit Target

Exact comparison of `main` to audited target `3cdcdd7b938606f5c4a9c907421ba9f7d69564d0`:

- base main SHA: `6735fe500c8408081a9950ac33abc69c3f272ce3`;
- ahead by 83 commits;
- behind by 0;
- 18 changed files;
- changed paths only under `.specify/`, `docs/founding/`, `specs/001-changed-code-verification-receipt/`, plus `LICENSE`;
- no `src/`;
- no `tests/`;
- no `benchmarks/`;
- no package manifest;
- no workflow;
- no product implementation.

**Result:** `PASS`

## 16. Residual Implementation / Release Gates — Not Planning Blockers

1. exact `cross-spawn` version/transitive provenance;
2. exact benchmark repositories/commits/licensing/execution terms;
3. npm package identity/ownership or scoped fallback;
4. native Windows process-tree behavior;
5. real Vitest/Jest/pytest version variance and selector/config misses;
6. measured time-to-signal.

None requires speculative architecture today.

## 17. Final Verdict

`PASS_READY_FOR_FRESH_EXACT_HEAD_PR_REVIEW`

At audited target `3cdcdd7b938606f5c4a9c907421ba9f7d69564d0`:

- open internal BLOCKER findings: **0**
- open internal MAJOR findings: **0**
- accepted Qodo findings unrepaired: **0**
- accepted CodeRabbit round-1 findings unrepaired: **0**
- accepted CodeRabbit round-2 findings unrepaired: **0**
- requirements/contract/governance checks: **86/86 PASS**
- constitutional violations: **0**
- known false-green contract paths: **0**
- known silent changed-command execution paths: **0**
- known dangling-evidence contract paths accepted as valid: **0**
- known raw repository-location identity forms accepted by intended contract: **0**
- known absolute/traversal persisted receipt-path forms accepted by intended contract: **0**
- product implementation files: **0**

### Authorization boundary

This verdict authorizes only:

- keeping PR #1 Ready for Review;
- resolving review threads whose fixes are independently verified;
- consuming a **fresh external exact-head review** of the post-audit PR head;
- final merge consideration only after that review is clean and head/purity are reverified.

It does **not** authorize:

- merge before fresh repaired-head review completes;
- starting T001;
- writing product implementation;
- publishing a package.

Any material mutation to constitution/spec/plan/data model/contracts/tasks after the audited target requires reconciliation of affected audit claims and a new exact-HEAD review before merge or implementation authorization.