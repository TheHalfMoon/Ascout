# 001 — Independent Final Plan Audit

**Date:** 2026-08-21  
**Audit target exact head:** `b678cc65ba5c18f5d4120109c3d8a9ca001ff3ff`  
**Branch:** `planning/000-ascout-foundation`  
**Verdict:** `PASS_READY_FOR_FRESH_EXACT_HEAD_PR_REVIEW`  
**Implementation authorization:** **NO**  
**Merge authorization:** **NO — fresh external review of the repaired head is still required**

This is a fresh adversarial audit after Qodo's first exact-head review and the resulting contract repairs. It supersedes the earlier pre-PR audit verdict for merge-readiness purposes.

The audited target contains no product implementation. This audit record is intended as a governance-only mutation after the audited target; any later material mutation to constitution/spec/plan/data model/contracts/tasks requires another affected-claim reconciliation.

## 1. Review History Consumed

The audit consumes three layers of evidence:

1. internal cross-artifact analysis and Ponytail/YAGNI reduction;
2. independent pre-PR audit, which found the changed-command admission blocker; and
3. Qodo's exact-head PR review, which found four additional receipt/config contract defects.

No external finding is treated as accepted merely because a bot emitted it; each finding was independently checked against the constitution/product contract before repair.

## 2. Qodo Finding Reconciliation

### Q1 — Omission/error reason fields were nullable

**Severity:** HIGH / CORRECTNESS  
**Verdict:** VALID  
**Disposition:** RESOLVED

Problem: receipt v1 allowed `NOT_RUN`, `BLOCKED`, or `ERROR` with null `reason_code`/`reason_text`, conflicting with the constitutional requirement that non-executed/error states remain explainable.

Final contract:

- `NOT_RUN`, `BLOCKED`, and `ERROR` require non-empty `reason_code` and `reason_text`;
- admission-refused `NOT_RUN` additionally fixes `reason_code=command_surface_changed`;
- implementation tasks explicitly test these invariants.

### Q2 — Rename could omit previous path

**Severity:** HIGH / CORRECTNESS  
**Verdict:** VALID  
**Disposition:** RESOLVED

Final contract:

- `change_kind=renamed` requires `previous_path`;
- non-rename change kinds do not carry `previous_path`;
- data model, plan, schema, and regression tasks agree.

### Q3 — Exercise state/count/reason semantics were underconstrained

**Severity:** MEDIUM / CORRECTNESS  
**Verdict:** VALID  
**Disposition:** RESOLVED

Final machine contract:

- `EXERCISED` ⇒ integer `execution_count > 0`;
- `NOT_EXERCISED` ⇒ `execution_count = 0`;
- `UNRESOLVED` ⇒ `execution_count = null` + non-empty explanatory `reason`.

This makes mapping uncertainty explicit rather than merely relying on prose.

### Q4 — pytest task identifier mismatch

**Severity:** LOW / MAINTAINABILITY  
**Verdict:** VALID  
**Disposition:** RESOLVED

Canonical fixed task identifiers are now identical across config v1, receipt v1, data model, plan, and tests:

```text
typecheck
lint
test
pytestBasic
```

No config↔receipt translation layer is introduced.

## 3. Additional Reconciliation Hardening

While repairing Qodo findings, the contract was checked for adjacent invalid states. Two were closed without expanding architecture:

1. `command_surface_changed=true` can no longer use `execution_admission=normal`;
2. every changed command surface requires at least one `changed_authority_path`.

These are direct consequences of the already-authorized admission model, not new product scope.

## 4. False-Green Audit

Clean exit `0` still requires all of the following:

- source stability is `stable`;
- no higher-precedence integrity/config/task-execution error;
- at least one material applicable verification task actually executed;
- no repository finding or flaky result;
- no applicable task remains `NOT_RUN` or `BLOCKED`;
- every omission/error status is explicit and explainable;
- no changed-command admission refusal remains;
- affected selection is valid or widened according to finite policy;
- no material changed executable `NOT_EXERCISED`/`UNRESOLVED` line remains.

### Result

`PASS`

No reviewed schema state allows an opaque omission or unresolved coverage state to become green.

## 5. Trust / Execution-Authority Audit

v0.x remains explicitly limited to the developer's own trusted local repository.

Within that boundary:

- no implicit dependency installation;
- task provenance is recorded;
- changed effective command/config authority is refused before launch/load by default;
- explicit admission is per invocation only;
- changed-surface admission is receipt-visible;
- agent instructions/hooks cannot silently add admission;
- `command_surface_changed=true` cannot be represented as normal admission;
- no persistent trust DB/sandbox/policy engine exists.

### Result

`PASS_WITH_EXPLICIT_SCOPE_BOUNDARY`

## 6. Source / Evidence Integrity Audit

Required properties remain explicit:

- secret-safe remote identity;
- one-way local-only path-derived identity;
- HEAD/index/worktree/all non-gitignored untracked source binding except `.ascout/`;
- current type/mode changes represented;
- rename old/new path fidelity;
- start/end drift;
- run-bound evidence;
- weak fingerprints never transfer evidence;
- locational `in_changed_lines` remains separate from causal attribution.

### Result

`PASS`

Absolute future implementation benchmark gates remain:

```text
cross-tree evidence leakage = 0
binding-integrity violations = 0
```

## 7. Machine Contract Audit

### Config v1

- versioned non-executable JSON;
- fixed task identifiers only;
- canonical `pytestBasic` identifier;
- no arbitrary task/prerequisite/workflow graph;
- no persistent trust/admission state.

### Receipt v1

- same canonical fixed task identifiers as config;
- strict task/status/selection shapes;
- `NOT_RUN`/`BLOCKED`/`ERROR` require explicit reasons;
- rename requires previous path;
- exercise state/count/reason invariants enforced;
- changed-command admission invariants enforced;
- stability and completeness remain separate;
- non-executed tasks need not fabricate argv/tool identity;
- persisted argv/privacy semantics preserved.

### Result

`PASS_AFTER_QODO_REPAIR`

No known machine-contract contradiction remains.

## 8. Windows / Cross-Platform Audit

The plan still avoids pretending POSIX process semantics apply to Windows:

- `cross-spawn` only for executable/shim launch normalization;
- Ascout owns timeout/capture/process-tree termination;
- native Windows cases are release-blocking evidence;
- project CI planned for Windows/macOS/Linux on Node 22/24.

### Result

`PASS_AS_PLANNING_CONTRACT`

Native evidence remains a release gate, not a current claim.

## 9. Benchmark Audit

The benchmark measures Ascout-specific claims:

- selection recall / false-PASS vs full-suite ground truth;
- native selector vs Ascout vs plain/full baselines;
- changed-code exercise-gap accuracy vs independent full-run coverage;
- unresolved mapping rate;
- cold/warm time-to-signal;
- drift/determinism/flake;
- zero evidence leakage/binding violations.

### Result

`PASS`

No invented pre-data threshold is introduced.

## 10. Ponytail / YAGNI Audit

Qodo repairs did **not** justify or introduce:

- schema-generation infrastructure;
- shared generated type packages;
- a task-name mapping layer;
- workflow engine;
- DB/trust state;
- daemon/server;
- plugin SDK;
- semantic graph;
- recursive widening;
- AI subsystem;
- sandbox.

The repair used stricter existing JSON Schema constraints plus matching prose/tasks.

### Result

`PASS`

## 11. Task Plan Audit

Task range remains **T001–T088**.

Existing tasks were strengthened rather than multiplied unnecessarily:

- T008: canonical config task keys;
- T009: receipt contract parity + reason/rename/exercise/admission invariants;
- T011: rename old/new fidelity;
- T031/T032: non-run/error reason contract;
- T047/T055: exercise state/count/reason contract.

### Result

`PASS`

## 12. Requirements Gate

Repaired checklist result:

```text
76 / 76 PASS
```

The four added review-regression checks cover exactly Q1–Q4.

### Result

`PASS`

## 13. Planning-Branch Purity at Audit Target

Exact comparison of `main` to audited head `b678cc65ba5c18f5d4120109c3d8a9ca001ff3ff`:

- ahead by 56 commits;
- behind by 0;
- 18 changed files;
- only `.specify/`, `docs/founding/`, `specs/001-changed-code-verification-receipt/`, and `LICENSE`;
- no `src/`;
- no `tests/`;
- no `benchmarks/`;
- no package manifest;
- no workflow;
- no product implementation.

### Result

`PASS`

## 14. Residual Gates That Do Not Block Planning Review

Still implementation/release evidence:

1. exact `cross-spawn` version/transitive provenance;
2. exact benchmark repositories/commits/licensing;
3. npm package identity/ownership or scoped fallback;
4. native Windows process-tree behavior;
5. real Vitest/Jest version variance and selector misses;
6. measured time-to-signal.

None requires speculative architecture today.

## 15. Final Verdict

`PASS_READY_FOR_FRESH_EXACT_HEAD_PR_REVIEW`

At audited target head `b678cc65ba5c18f5d4120109c3d8a9ca001ff3ff`:

- open internal BLOCKER findings: **0**
- open internal MAJOR findings: **0**
- accepted Qodo findings unrepaired: **0**
- constitutional violations: **0**
- known false-green contract paths: **0**
- known silent changed-command execution paths: **0**
- known config↔receipt task-name mappings: **0**
- known opaque `UNRESOLVED` machine states: **0**
- product implementation files: **0**

### Authorization boundary

This verdict authorizes only:

- keeping PR #1 Ready for Review;
- resolving review threads whose fixes are independently verified;
- triggering/consuming a **fresh external exact-head review** of the repaired PR;
- final merge consideration only after that review is clean and the head/purity gate is reverified.

It does **not** authorize:

- merging before the fresh repaired-head review completes;
- starting T001;
- writing product implementation;
- publishing a package.

Any material mutation to constitution/spec/plan/data model/contracts/tasks after the audited target requires reconciliation of affected audit claims before merge.